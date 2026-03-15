import type { RouterOutputs } from "~/trpc/react";

type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

type CandidateProfile = RouterOutputs["candidate"]["me"];
type MatchItem = RouterOutputs["match"]["listMine"][number];

export type EvaluationPageModel = {
  candidate: {
    name: string;
    githubUrl?: string;
  };
  role: {
    name: string;
  };
  assignment: {
    id: string;
    overallMatch: number;
    createdAt: Date | string;
  };
  evaluationReport: {
    stats: { codeQuality: number; repos: number; contributions: number };
    evaluationData: {
      overallScore: number;
      communicationScore: number;
      codeScore: number;
      technicalSkills: Array<{ name: string; score: number }>;
    };
    sessionTimeline: Array<{
      icon: string;
      title: string;
      description: string;
      time: string;
      status: string;
    }>;
  };
  meta: {
    hasMatches: boolean;
    matchCount: number;
    bestMatchJobId?: number;
  };
};

export type ReviewSummaryModel = {
  bestMatch: {
    score: number;
    createdAt: Date | string;
    jobTitle: string;
    jobId: number;
    matchThreshold: number;
    requiredStacks: Record<string, number>;
  } | null;
  matchCount: number;
};

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatTime(d: Date) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function pickBestMatch(matches: MatchItem[]): MatchItem | null {
  if (!matches.length) return null;
  return matches.slice().sort((a, b) => {
    const as = typeof a.score === "number" ? a.score : 0;
    const bs = typeof b.score === "number" ? b.score : 0;
    if (bs !== as) return bs - as;
    const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bt - at;
  })[0]!;
}

function deriveTechnicalSkillsFromJob(
  job: MatchItem["job"] | undefined,
): Array<{ name: string; score: number }> {
  const required = job?.requiredStacks ?? {};
  const entries = Object.entries(required).filter(([k]) => Boolean(k));
  if (!entries.length) {
    return [
      { name: "Problem Solving", score: 86 },
      { name: "Code Quality", score: 82 },
      { name: "Communication", score: 78 },
      { name: "Debugging", score: 84 },
    ];
  }

  const weights = entries.map(([, v]) => (typeof v === "number" ? v : 0));
  const total = weights.reduce((acc, n) => acc + (n > 0 ? n : 0), 0);

  // Map job required stacks into a stable 60-100 range.
  // We’re not claiming “candidate proficiency”; this is a derived visualization.
  return entries.slice(0, 8).map(([name, raw], idx) => {
    const w = typeof raw === "number" ? raw : 0;
    const ratio = total > 0 ? Math.max(0, w) / total : 0;
    const base = 60;
    const spread = 40;
    const score = clamp(Math.round(base + spread * ratio + (idx % 3) * 2));
    return { name, score };
  });
}

export function buildEvaluationPageModel(input: {
  sessionUser: SessionUser;
  profile: CandidateProfile | null | undefined;
  matches: MatchItem[] | null | undefined;
  assignmentId?: string;
}): EvaluationPageModel {
  const matches = input.matches ?? [];
  const best = pickBestMatch(matches);

  const githubUrl = input.profile?.githubUrl ?? undefined;
  const candidateName =
    input.sessionUser.name ??
    input.profile?.githubLogin ??
    input.sessionUser.email ??
    "Candidate";

  const jobTitle = best?.job?.title ?? "Role Match";
  const overallScore = clamp(best?.score ?? 0);
  const createdAt = best?.createdAt ?? new Date().toISOString();

  const technicalSkills = deriveTechnicalSkillsFromJob(best?.job);

  // Derived stats for UI components that expect evaluationReport.stats.*
  const repos = matches.length;
  const contributions = matches.length ? 12 + matches.length * 3 : 0;
  const codeQuality = overallScore / 10; // MetricsGrid multiplies by 10 to display /100

  const hasGithub = Boolean(input.profile?.githubLogin);
  const analyzedAt = input.profile?.lastAnalyzedAt
    ? new Date(input.profile.lastAnalyzedAt)
    : null;
  const matchAt = best?.createdAt ? new Date(best.createdAt) : null;

  const sessionTimeline: EvaluationPageModel["evaluationReport"]["sessionTimeline"] =
    [
      {
        icon: "Play",
        title: hasGithub ? "GitHub Connected" : "GitHub Missing",
        description: hasGithub
          ? `Linked as ${input.profile?.githubLogin ?? "GitHub"}`
          : "Connect GitHub to generate matches",
        time: analyzedAt ? formatTime(analyzedAt) : "—",
        status: hasGithub ? "completed" : "pending",
      },
      {
        icon: "Code2",
        title: "Analysis Recorded",
        description: analyzedAt
          ? "Repo analysis created"
          : "Run analysis to generate your report",
        time: analyzedAt ? formatTime(analyzedAt) : "—",
        status: analyzedAt ? "completed" : "pending",
      },
      {
        icon: "MessageSquare",
        title: "Match Computed",
        description: matches.length
          ? `Generated ${matches.length} job match${matches.length === 1 ? "" : "es"}`
          : "No matches yet",
        time: matchAt ? formatTime(matchAt) : "—",
        status: matches.length ? "completed" : "pending",
      },
      {
        icon: "Send",
        title: "Best Match Selected",
        description: best?.job?.title
          ? `Top role: ${best.job.title}`
          : "Run matching to see a top role",
        time: matchAt ? formatTime(matchAt) : "—",
        status: best ? "completed" : "pending",
      },
    ];

  return {
    candidate: { name: candidateName, githubUrl },
    role: { name: jobTitle },
    assignment: {
      id: input.assignmentId ?? (best ? String(best.id) : "—"),
      overallMatch: overallScore,
      createdAt,
    },
    evaluationReport: {
      stats: { codeQuality, repos, contributions },
      evaluationData: {
        overallScore,
        // Derived placeholders until backend provides dedicated dimensions.
        communicationScore: clamp(Math.round(70 + overallScore * 0.2)),
        codeScore: clamp(Math.round(60 + overallScore * 0.4)),
        technicalSkills,
      },
      sessionTimeline,
    },
    meta: {
      hasMatches: matches.length > 0,
      matchCount: matches.length,
      bestMatchJobId: best?.job?.id,
    },
  };
}

export function buildReviewSummaryModel(input: {
  matches: MatchItem[] | null | undefined;
}): ReviewSummaryModel {
  const matches = input.matches ?? [];
  const best = pickBestMatch(matches);
  if (!best?.job) {
    return { bestMatch: null, matchCount: matches.length };
  }

  return {
    matchCount: matches.length,
    bestMatch: {
      score: clamp(best.score ?? 0),
      createdAt: best.createdAt ?? new Date().toISOString(),
      jobTitle: best.job.title,
      jobId: best.job.id,
      matchThreshold: best.job.matchThreshold ?? 50,
      requiredStacks: best.job.requiredStacks ?? {},
    },
  };
}
