import type { RepoSkillMap } from "./match-engine";

function hasKey(obj: Record<string, string> | undefined, key: string) {
  return !!obj && Object.prototype.hasOwnProperty.call(obj, key);
}

export function extractRepoSkillsFromPackageJson(params: {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  topLevelFiles?: string[];
  topLevelDirs?: string[];
  hasCI?: boolean;
  hasDockerfile?: boolean;
  hasTypeScript?: boolean;
}): RepoSkillMap {
  const deps = params.dependencies ?? {};
  const dev = params.devDependencies ?? {};
  const scripts = params.scripts ?? {};
  const files = new Set((params.topLevelFiles ?? []).map((s) => s.toLowerCase()));
  const dirs = new Set((params.topLevelDirs ?? []).map((s) => s.toLowerCase()));

  const skills: RepoSkillMap = {};

  // React / Next.js
  if (hasKey(deps, "react")) {
    skills.React = { confidence: 1, evidence: ["dependencies.react"] };
  } else if (hasKey(deps, "next")) {
    skills.React = { confidence: 0.8, evidence: ["dependencies.next"] };
  }
  if (hasKey(deps, "next")) {
    skills["Next.js"] = { confidence: 1, evidence: ["dependencies.next"] };
  }

  // Node.js / Backend frameworks
  if (hasKey(deps, "express") || hasKey(deps, "fastify") || hasKey(deps, "@nestjs/core")) {
    const ev: string[] = [];
    if (hasKey(deps, "express")) ev.push("dependencies.express");
    if (hasKey(deps, "fastify")) ev.push("dependencies.fastify");
    if (hasKey(deps, "@nestjs/core")) ev.push("dependencies.@nestjs/core");
    skills["Node.js"] = { confidence: 1, evidence: ev };
  } else if (Object.keys(deps).length > 0) {
    skills["Node.js"] = { confidence: 0.3, evidence: ["package.json"] };
  }

  // TypeScript
  if (params.hasTypeScript || hasKey(dev, "typescript") || files.has("tsconfig.json")) {
    const ev: string[] = [];
    if (params.hasTypeScript) ev.push("detectedFiles.hasTypeScript");
    if (hasKey(dev, "typescript")) ev.push("devDependencies.typescript");
    if (files.has("tsconfig.json")) ev.push("file:tsconfig.json");
    skills.TypeScript = { confidence: 1, evidence: ev };
  }

  // Testing
  if (hasKey(dev, "vitest") || hasKey(dev, "jest") || hasKey(dev, "mocha") || hasKey(dev, "cypress") || hasKey(dev, "@playwright/test")) {
    const ev: string[] = [];
    if (hasKey(dev, "vitest")) ev.push("devDependencies.vitest");
    if (hasKey(dev, "jest")) ev.push("devDependencies.jest");
    if (hasKey(dev, "mocha")) ev.push("devDependencies.mocha");
    if (hasKey(dev, "cypress")) ev.push("devDependencies.cypress");
    if (hasKey(dev, "@playwright/test")) ev.push("devDependencies.@playwright/test");
    skills.Testing = { confidence: 1, evidence: ev };
  } else if (hasKey(scripts, "test")) {
    skills.Testing = { confidence: 0.5, evidence: ["scripts.test"] };
  }

  // CI/CD
  if (params.hasCI || (dirs.has(".github") && (dirs.has(".github/workflows") || true))) {
    const ev: string[] = [];
    if (params.hasCI) ev.push("detectedFiles.hasCI");
    if (dirs.has(".github")) ev.push("dir:.github");
    skills["CI/CD"] = { confidence: 1, evidence: ev.length ? ev : ["repo:ci"] };
  }

  // Docker
  if (params.hasDockerfile || files.has("dockerfile")) {
    const ev: string[] = [];
    if (params.hasDockerfile) ev.push("detectedFiles.hasDockerfile");
    if (files.has("dockerfile")) ev.push("file:Dockerfile");
    skills.Docker = { confidence: 1, evidence: ev };
  }

  // Repo structure signals (weak)
  if (dirs.has("apps") || dirs.has("packages")) {
    skills.Monorepo = { confidence: 0.7, evidence: ["dir:apps|packages"] };
  }
  if (dirs.has("src")) {
    skills.Structure = { confidence: 0.6, evidence: ["dir:src"] };
  }

  return skills;
}


