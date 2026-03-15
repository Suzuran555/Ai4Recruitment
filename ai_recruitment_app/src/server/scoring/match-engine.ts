export type SkillEvidence = {
  confidence: number; // 0..1
  evidence: string[];
};

export type RepoSkillMap = Record<string, SkillEvidence>;

export type MatchBreakdownItem = {
  requirement: string;
  weight: number;
  match: number; // 0..1
  reason: string;
  evidence: string[];
};

function clamp01(n: number) {
  if (n < 0) {
    return 0;
  }
  if (n > 1) {
    return 1;
  }
  return n;
}

function normalizeWeights(requiredStacks: Record<string, number>) {
  const entries = Object.entries(requiredStacks).filter(([, w]) => Number.isFinite(w) && w > 0);
  const sum = entries.reduce((acc, [, w]) => acc + w, 0);
  if (sum <= 0) {
    return entries.map(([k]) => [k, 0] as const);
  }
  return entries.map(([k, w]) => [k, w / sum] as const);
}

function normalizeSkillKey(raw: string) {
  const s = raw.trim().toLowerCase();
  // minimal synonym map for hackathon
  if (s === "ci" || s === "cicd" || s === "ci/cd" || s === "ci-cd") {
    return "ci/cd";
  }
  if (s === "typescript" || s === "ts") {
    return "typescript";
  }
  if (s === "node" || s === "nodejs" || s === "node.js") {
    return "node.js";
  }
  if (s === "next" || s === "nextjs" || s === "next.js") {
    return "next.js";
  }
  if (s === "reactjs") {
    return "react";
  }
  return s;
}

export function computeDeterministicJobMatch(params: {
  requiredStacks: Record<string, number>;
  repoSkills: RepoSkillMap;
}) {
  const required = normalizeWeights(params.requiredStacks);
  const repoSkillsNormalized: RepoSkillMap = {};
  for (const [k, v] of Object.entries(params.repoSkills ?? {})) {
    repoSkillsNormalized[normalizeSkillKey(k)] = {
      confidence: clamp01(v.confidence),
      evidence: Array.isArray(v.evidence) ? v.evidence : [],
    };
  }

  const breakdown: MatchBreakdownItem[] = [];
  let weighted = 0;
  let decidable = 0;

  for (const [reqKeyRaw, w] of required) {
    const reqKey = normalizeSkillKey(reqKeyRaw);
    const hit = repoSkillsNormalized[reqKey];
    const match = clamp01(hit?.confidence ?? 0);
    if (hit) {
      decidable++;
    }

    breakdown.push({
      requirement: reqKeyRaw,
      weight: w,
      match,
      reason: hit
        ? `Detected ${reqKeyRaw} from repo signals`
        : `No evidence found for ${reqKeyRaw}`,
      evidence: hit?.evidence ?? [],
    });

    weighted += w * match;
  }

  const coverage = required.length === 0 ? 0 : decidable / required.length;
  // mild penalty when repo signals are incomplete
  const coverageFactor = 0.7 + 0.3 * coverage;
  const score = Math.round(100 * weighted * coverageFactor);

  return {
    score,
    coverage,
    breakdown,
  };
}


