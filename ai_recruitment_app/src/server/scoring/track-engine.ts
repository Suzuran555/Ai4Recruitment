export type TrackKey = "specialist" | "expansion" | "pragmatist";

export type TrackOption = {
  trackKey: TrackKey;
  title: string;
  slogan: string;
  focusAreas: string[];
  rationale: string;
};

export function deriveRepoSkills(techStack: any): Record<string, number> {
  const skills: Record<string, number> = {};

  const languages = Array.isArray(techStack?.languages) ? techStack.languages : [];
  for (const item of languages.slice(0, 8)) {
    const name = typeof item?.language === "string" ? item.language : null;
    const pct = typeof item?.percentage === "number" ? item.percentage : 0;
    if (!name) continue;
    // Convert percent -> 0..1 weight-ish.
    skills[name] = Math.max(0, Math.min(1, pct / 100));
  }

  const frameworks = Array.isArray(techStack?.frameworks) ? techStack.frameworks : [];
  for (const f of frameworks.slice(0, 10)) {
    if (typeof f !== "string" || !f.trim()) continue;
    // Frameworks are presence signals; give a small stable weight.
    skills[f] = Math.max(skills[f] ?? 0, 0.15);
  }

  const tooling = Array.isArray(techStack?.tooling) ? techStack.tooling : [];
  for (const t of tooling.slice(0, 10)) {
    if (typeof t !== "string" || !t.trim()) continue;
    skills[t] = Math.max(skills[t] ?? 0, 0.08);
  }

  return skills;
}

export function generateTrackOptions(input: {
  techStack: any;
  signals?: any;
  domainTags?: string[] | null;
}): TrackOption[] {
  const frameworks = Array.isArray(input.techStack?.frameworks)
    ? (input.techStack.frameworks as string[])
    : [];
  const topFrameworks = frameworks.slice(0, 4).join(", ");
  const domains = (input.domainTags ?? []).slice(0, 3).join(", ");

  const hasTests =
    Array.isArray(input.signals?.testFrameworks) &&
    input.signals.testFrameworks.length > 0;
  const hasCI = Boolean(input.signals?.hasCI);

  const missingBits: string[] = [];
  if (!hasTests) missingBits.push("tests (TDD)");
  if (!hasCI) missingBits.push("CI/CD");
  if (!input.signals?.hasDockerfile) missingBits.push("containerization");

  return [
    {
      trackKey: "specialist",
      title: "Expert Mode · Deep Validation (The Specialist Track)",
      slogan: "Show us your mastery.",
      focusAreas: [
        "Extreme performance requirements (e.g., virtual list with 10,000 rows @ 60fps)",
        "Core principles assessment (restrict third-party libraries, hand-write state management/optimization)",
        "Architecture design (reusable component system + quality standards)",
      ],
      rationale: topFrameworks
        ? `Your repo's tech stack focuses on ${topFrameworks}, suitable for increasing complexity and deep validation on your strengths.`
        : "Your repo demonstrates a clear technical direction, suitable for increasing complexity and deep validation on your strengths.",
    },
    {
      trackKey: "expansion",
      title: "Full-Stack/Potential Mode · Breadth Completion (The Expansion Track)",
      slogan: "Step out of your comfort zone.",
      focusAreas: [
        "Enforced TDD: Write test cases first, then implement features",
        "Full-stack integration: Fill gaps in backend/BFF/data aggregation",
        "Engineering: GitHub Actions / CI/CD integration",
      ],
      rationale: missingBits.length
        ? `Your repo may be missing: ${missingBits.join(", ")}. This mode will fill the gaps with "fill-in-the-blank" exercises.`
        : "Your repo shows complete engineering signals. This mode will further expand full-stack vision and engineering capabilities.",
    },
    {
      trackKey: "pragmatist",
      title: "Practical Mode · Business Simulation (The Pragmatist Track)",
      slogan: "Solve a real-world problem.",
      focusAreas: [
        "Ambiguous requirements: Handle ambiguity and make trade-offs",
        "Bug Bash: Fix legacy bugs + incremental refactoring",
        "Business logic priority: Permissions/approval flows/state machines",
      ],
      rationale: domains
        ? `Based on README/domain signals, you lean toward: ${domains}. This mode will be closer to real business scenarios.`
        : "This mode de-emphasizes stack constraints and focuses more on solving real business problems and maintainability.",
    },
  ];
}

export function recommendDefaultTrack(input: {
  techStack: any;
  signals?: any;
  domainTags?: string[] | null;
}): TrackKey {
  const frameworks = Array.isArray(input.techStack?.frameworks)
    ? (input.techStack.frameworks as string[])
    : [];
  const hasStrongFrontend =
    frameworks.some((f) => /react|next\.js|tailwind/i.test(String(f))) ||
    frameworks.length >= 3;

  const missing: number =
    (Array.isArray(input.signals?.testFrameworks) &&
    input.signals.testFrameworks.length > 0
      ? 0
      : 1) +
    (input.signals?.hasCI ? 0 : 1) +
    (input.signals?.hasDockerfile ? 0 : 1);

  const domainCount = Array.isArray(input.domainTags) ? input.domainTags.length : 0;

  // Simple heuristic scoring:
  // - Specialist: strong, focused stack signals
  // - Expansion: missing engineering loops (tests/CI/Docker)
  // - Pragmatist: strong domain signals from README/topics
  const specialistScore = (hasStrongFrontend ? 2 : 0) + Math.min(frameworks.length, 3) * 0.25;
  const expansionScore = missing * 1.25;
  const pragmatistScore = Math.min(domainCount, 5) * 0.8;

  const max = Math.max(specialistScore, expansionScore, pragmatistScore);
  if (max === expansionScore) return "expansion";
  if (max === pragmatistScore) return "pragmatist";
  return "specialist";
}

export type JobRecommendation = {
  jobId: number;
  jobTitle: string;
  score: number;
  reason: string;
  assignment: { id: number; repoTemplateUrl: string; instructions: string | null } | null;
};

export function deriveRepoSkillEvidenceMap(techStack: any): import("./match-engine").RepoSkillMap {
  const out: import("./match-engine").RepoSkillMap = {};

  const languages = Array.isArray(techStack?.languages) ? techStack.languages : [];
  for (const item of languages.slice(0, 12)) {
    const name = typeof item?.language === "string" ? item.language : null;
    const pct = typeof item?.percentage === "number" ? item.percentage : 0;
    if (!name) continue;
    const confidence = Math.max(0, Math.min(1, pct / 100));
    out[name] = {
      confidence,
      evidence: [`Language share: ${pct.toFixed(0)}%`],
    };
  }

  const frameworks = Array.isArray(techStack?.frameworks) ? techStack.frameworks : [];
  for (const f of frameworks.slice(0, 20)) {
    if (typeof f !== "string" || !f.trim()) continue;
    out[f] = {
      confidence: Math.max(out[f]?.confidence ?? 0, 0.7),
      evidence: Array.from(
        new Set([...(out[f]?.evidence ?? []), "Detected framework/library"]),
      ),
    };
  }

  const tooling = Array.isArray(techStack?.tooling) ? techStack.tooling : [];
  for (const t of tooling.slice(0, 20)) {
    if (typeof t !== "string" || !t.trim()) continue;
    out[t] = {
      confidence: Math.max(out[t]?.confidence ?? 0, 0.5),
      evidence: Array.from(new Set([...(out[t]?.evidence ?? []), "Detected tooling"])),
    };
  }

  return out;
}

export function scoreJobForTrack(input: {
  trackKey: TrackKey;
  job: { id: number; title: string; description?: string | null; requiredStacks: any };
  assignment?: { id: number; repoTemplateUrl: string; instructions?: string | null } | null;
  repoSkills: Record<string, number>;
  signals?: any;
  domainTags?: string[] | null;
}): JobRecommendation {
  const required = (input.job.requiredStacks ?? {}) as Record<string, number>;
  const requiredKeys = Object.keys(required).map((k) => k.toLowerCase());

  // Base overlap score: sum of required weights that appear in repoSkills.
  let overlap = 0;
  let total = 0;
  for (const [k, w] of Object.entries(required)) {
    const weight = typeof w === "number" ? Math.max(0, w) : 0;
    total += weight;
    if (input.repoSkills[k] !== undefined) overlap += weight;
  }
  const base = total > 0 ? overlap / total : 0;

  let score = Math.round(base * 100);
  const reasons: string[] = [];
  reasons.push(`stack overlap ${(base * 100).toFixed(0)}%`);

  if (input.trackKey === "expansion") {
    const hasTests =
      Array.isArray(input.signals?.testFrameworks) &&
      input.signals.testFrameworks.length > 0;
    const hasCI = Boolean(input.signals?.hasCI);
    if (!hasTests && requiredKeys.some((k) => k.includes("test"))) {
      score += 10;
      reasons.push("补齐 tests");
    }
    if (!hasCI && (requiredKeys.includes("ci") || requiredKeys.includes("cicd"))) {
      score += 8;
      reasons.push("补齐 CI/CD");
    }
    if (!input.signals?.hasDockerfile && requiredKeys.some((k) => k.includes("docker"))) {
      score += 6;
      reasons.push("补齐 Docker");
    }
  }

  if (input.trackKey === "pragmatist") {
    const text =
      `${input.job.title}\n${input.job.description ?? ""}\n${input.assignment?.instructions ?? ""}`.toLowerCase();
    const domains = input.domainTags ?? [];
    const hit = domains.filter((d) => text.includes(d.toLowerCase()));
    if (hit.length) {
      score += 12;
      reasons.push(`domain: ${hit.slice(0, 2).join(", ")}`);
    }
  }

  if (input.trackKey === "specialist") {
    // Specialist prefers strong overlap; small bonus if overlap is already high.
    if (score >= 70) {
      score += 5;
      reasons.push("Deep validation preference (high overlap)");
    }
  }

  score = Math.max(0, Math.min(100, score));

  return {
    jobId: input.job.id,
    jobTitle: input.job.title,
    score,
    reason: reasons.join(" · "),
    assignment: input.assignment
      ? {
          id: input.assignment.id,
          repoTemplateUrl: input.assignment.repoTemplateUrl,
          instructions: input.assignment.instructions ?? null,
        }
      : null,
  };
}


