export type CandidateRecommendationInput = {
  matchScore?: number;
  tags?: string[];
  skills?: Array<{ name: string; level: number }>;
};

export type EvaluationRecommendationInput = {
  evaluationData?: {
    overallScore?: number;
    technicalSkills?: Array<{ name: string; score: number }>;
  };
};

export type AssignmentRecommendationInput = {
  overallMatch?: number;
};

export type RecommendedRoleName =
  | "Junior Frontend Engineer"
  | "Senior Frontend Engineer"
  | "Junior Backend Engineer"
  | "Senior Backend Engineer"
  | "Junior DevOps Engineer"
  | "Senior DevOps Engineer";

export type RecommendedTrack = "frontend" | "backend" | "devops";
export type RecommendedSeniority = "junior" | "senior";

export interface RoleRecommendation {
  roleName: RecommendedRoleName;
  track: RecommendedTrack;
  seniority: RecommendedSeniority;
  overallScore: number;
  matchedTags: string[];
  conclusion: string;
  debug: {
    frontendScore: number;
    backendScore: number;
    devopsScore: number;
  };
}

const FRONTEND_KEYWORDS = [
  "react",
  "next",
  "css",
  "tailwind",
  "ui",
  "ux",
  "accessibility",
  "design systems",
  "frontend",
];

const BACKEND_KEYWORDS = [
  "node",
  "api",
  "database",
  "schema",
  "backend",
  "architecture",
  "distributed",
  "system design",
];

const DEVOPS_KEYWORDS = [
  "devops",
  "sre",
  "infrastructure",
  "infra",
  "iac",
  "terraform",
  "ansible",
  "helm",
  "kubernetes",
  "k8s",
  "docker",
  "container",
  "ci",
  "cd",
  "cicd",
  "github actions",
  "gitlab ci",
  "jenkins",
  "pipeline",
  "aws",
  "gcp",
  "azure",
  "cloud",
  "observability",
  "prometheus",
  "grafana",
  "logging",
  "monitoring",
];

function normalize(s: string) {
  return s.trim().toLowerCase();
}

function matchesAnyKeyword(normalized: string, keywords: string[]) {
  return keywords.some((kw) => normalized.includes(kw));
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function deriveOverallScore(
  evaluationReport?: EvaluationRecommendationInput,
  assignment?: AssignmentRecommendationInput,
): number {
  const score =
    evaluationReport?.evaluationData?.overallScore ??
    assignment?.overallMatch ??
    0;
  return clamp(score, 0, 100);
}

function deriveOverallScoreFromCandidate(
  candidate?: CandidateRecommendationInput,
): number {
  return clamp(candidate?.matchScore ?? 0, 0, 100);
}

function trackFromSignals(signals: Array<{ name: string; score: number }>): {
  track: RecommendedTrack;
  frontendScore: number;
  backendScore: number;
  devopsScore: number;
  frontendMatches: Array<{ name: string; score: number }>;
  backendMatches: Array<{ name: string; score: number }>;
  devopsMatches: Array<{ name: string; score: number }>;
} {
  let frontendScore = 0;
  let backendScore = 0;
  let devopsScore = 0;
  const frontendMatches: Array<{ name: string; score: number }> = [];
  const backendMatches: Array<{ name: string; score: number }> = [];
  const devopsMatches: Array<{ name: string; score: number }> = [];

  for (const s of signals) {
    const norm = normalize(s.name);
    const isFrontend = matchesAnyKeyword(norm, FRONTEND_KEYWORDS);
    const isBackend = matchesAnyKeyword(norm, BACKEND_KEYWORDS);
    const isDevOps = matchesAnyKeyword(norm, DEVOPS_KEYWORDS);

    if (isFrontend) {
      frontendScore += s.score;
      frontendMatches.push(s);
    }
    if (isBackend) {
      backendScore += s.score;
      backendMatches.push(s);
    }
    if (isDevOps) {
      devopsScore += s.score;
      devopsMatches.push(s);
    }
  }

  if (frontendScore === 0 && backendScore === 0 && devopsScore === 0) {
    const anyObviousFrontend = signals.some((s) => {
      const n = normalize(s.name);
      return n.includes("react") || n.includes("css") || n.includes("frontend");
    });
    const anyObviousDevOps = signals.some((s) => {
      const n = normalize(s.name);
      return (
        n.includes("docker") ||
        n.includes("kubernetes") ||
        n.includes("devops") ||
        n.includes("ci") ||
        n.includes("cd") ||
        n.includes("terraform")
      );
    });

    if (anyObviousDevOps) {
      devopsScore = 1;
    } else if (anyObviousFrontend) {
      frontendScore = 1;
    } else {
      backendScore = 1;
    }
  }

  const max = Math.max(frontendScore, backendScore, devopsScore);
  const track: RecommendedTrack =
    devopsScore === max
      ? "devops"
      : frontendScore >= backendScore
        ? "frontend"
        : "backend";

  return {
    track,
    frontendScore,
    backendScore,
    devopsScore,
    frontendMatches,
    backendMatches,
    devopsMatches,
  };
}

export function recommendRoleFromEvaluation(
  evaluationReport?: EvaluationRecommendationInput,
  assignment?: AssignmentRecommendationInput,
): RoleRecommendation {
  const overallScore = deriveOverallScore(evaluationReport, assignment);

  const technicalSkills =
    evaluationReport?.evaluationData?.technicalSkills?.map((s) => ({
      name: s.name,
      score: clamp(s.score, 0, 100),
    })) ?? [];

  const {
    track,
    frontendScore,
    backendScore,
    devopsScore,
    frontendMatches,
    backendMatches,
    devopsMatches,
  } = trackFromSignals(technicalSkills);

  const seniority: RecommendedSeniority =
    overallScore >= 85 ? "senior" : "junior";

  const roleName: RecommendedRoleName =
    track === "frontend"
      ? seniority === "senior"
        ? "Senior Frontend Engineer"
        : "Junior Frontend Engineer"
      : track === "devops"
        ? seniority === "senior"
          ? "Senior DevOps Engineer"
          : "Junior DevOps Engineer"
        : seniority === "senior"
          ? "Senior Backend Engineer"
          : "Junior Backend Engineer";

  const contributingSkills = (
    track === "frontend"
      ? frontendMatches
      : track === "devops"
        ? devopsMatches
        : backendMatches
  )
    .slice()
    .sort((a, b) => b.score - a.score);

  const matchedTags = Array.from(
    new Set(contributingSkills.map((s) => s.name).filter(Boolean)),
  ).slice(0, 6);

  const why =
    matchedTags.length > 0
      ? `${matchedTags.slice(0, 3).join(" + ")} signals`
      : "your technical skill signals";

  const conclusion = `Based on ${why} and an overall score of ${overallScore}%, the best fit is ${roleName}.`;

  return {
    roleName,
    track,
    seniority,
    overallScore,
    matchedTags,
    conclusion,
    debug: {
      frontendScore,
      backendScore,
      devopsScore,
    },
  };
}

export function recommendRoleFromCandidate(
  candidate?: CandidateRecommendationInput,
) {
  const overallScore = deriveOverallScoreFromCandidate(candidate);

  const skillSignals =
    candidate?.skills?.map((s) => ({
      name: s.name,
      score: clamp(s.level, 0, 100),
    })) ?? [];

  // If skills are sparse, let tags contribute a small amount too.
  const tagSignals =
    candidate?.tags?.map((t) => ({
      name: t,
      score: 15,
    })) ?? [];

  const signals = [...skillSignals, ...tagSignals];

  const {
    track,
    frontendScore,
    backendScore,
    devopsScore,
    frontendMatches,
    backendMatches,
    devopsMatches,
  } = trackFromSignals(signals);

  const seniority: RecommendedSeniority =
    overallScore >= 85 ? "senior" : "junior";

  const roleName: RecommendedRoleName =
    track === "frontend"
      ? seniority === "senior"
        ? "Senior Frontend Engineer"
        : "Junior Frontend Engineer"
      : track === "devops"
        ? seniority === "senior"
          ? "Senior DevOps Engineer"
          : "Junior DevOps Engineer"
        : seniority === "senior"
          ? "Senior Backend Engineer"
          : "Junior Backend Engineer";

  const contributing = (
    track === "frontend"
      ? frontendMatches
      : track === "devops"
        ? devopsMatches
        : backendMatches
  )
    .slice()
    .sort((a, b) => b.score - a.score);

  const matchedTags = Array.from(
    new Set(contributing.map((s) => s.name).filter(Boolean)),
  ).slice(0, 6);

  const why =
    matchedTags.length > 0
      ? `${matchedTags.slice(0, 3).join(" + ")} signals`
      : "your code skill signals";

  return {
    roleName,
    matchedTags,
    conclusion: `Based on ${why} and your match score of ${overallScore}%, your best-fit role is ${roleName}.`,
    debug: { track, frontendScore, backendScore, devopsScore },
  };
}
