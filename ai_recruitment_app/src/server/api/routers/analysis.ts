import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, candidateProcedure } from "../trpc";
import { candidateProfile, repoAnalysis } from "~/server/db/schema";
import { generateJson, LlmError } from "~/server/llm/anthropic";

/**
 * Fetch data from GitHub API
 */
async function fetchGitHubAPI(endpoint: string): Promise<any> {
  const token = process.env.GITHUB_TOKEN;
  const headers: HeadersInit = {
    // v3 compatible JSON. Using the newer vendor media type also enables some fields
    // (e.g. topics on repo) depending on GitHub API behavior.
    Accept: "application/vnd.github+json",
  };
  if (token) {
    headers.Authorization = `token ${token}`;
  }

  const url = `https://api.github.com/${endpoint}`;

  try {
    const response = await fetch(url, { headers });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);

      if (response.status === 404) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Repository not found: ${endpoint}. Please check the repository name and ensure it's a public repository.`,
        });
      }
      if (response.status === 403) {
        const rateLimitRemaining = response.headers.get(
          "x-ratelimit-remaining",
        );
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `GitHub API rate limit exceeded. Remaining: ${rateLimitRemaining ?? "unknown"}. Please set GITHUB_TOKEN for higher limits.`,
        });
      }
      if (response.status === 401) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message:
            "GitHub API authentication failed. Please check your GITHUB_TOKEN if set.",
        });
      }

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `GitHub API error (${response.status}): ${errorText.substring(0, 200)}`,
      });
    }

    return response.json();
  } catch (error) {
    // Handle network errors, timeouts, etc.
    if (error instanceof TRPCError) {
      throw error;
    }

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Failed to fetch from GitHub API: ${error instanceof Error ? error.message : String(error)}`,
      cause: error,
    });
  }
}

function decodeBase64Text(content: unknown): string | null {
  if (typeof content !== "string") return null;
  const normalized = content.replace(/\n/g, "");
  try {
    return Buffer.from(normalized, "base64").toString("utf-8");
  } catch {
    return null;
  }
}

function inferDomainTags(input: {
  readmeText?: string | null;
  repoData?: any;
}): string[] {
  const tags = new Set<string>();
  const readme = (input.readmeText ?? "").toLowerCase();

  // Include GitHub repo topics if present.
  const topics: unknown = input.repoData?.topics;
  if (Array.isArray(topics)) {
    for (const t of topics) {
      if (typeof t === "string" && t.trim()) tags.add(t.trim().toLowerCase());
    }
  }

  const addIf = (tag: string, patterns: Array<string | RegExp>) => {
    for (const p of patterns) {
      if (typeof p === "string" ? readme.includes(p) : p.test(readme)) {
        tags.add(tag);
        return;
      }
    }
  };

  // Business / domain inference (heuristic, best-effort)
  addIf("ecommerce", ["e-commerce", "ecommerce", "shopping cart", "checkout"]);
  addIf("fintech", ["fintech", "payment", "payments", "wallet", "billing"]);
  addIf("ai", [
    "machine learning",
    "deep learning",
    "llm",
    "rag",
    "embedding",
    /\bai\b/,
  ]);
  addIf("devtools", [
    "cli",
    "developer tool",
    "dx",
    "plugin",
    "sdk",
    "framework",
  ]);
  addIf("infra", [
    "kubernetes",
    "k8s",
    "terraform",
    "helm",
    "observability",
    "prometheus",
  ]);
  addIf("data", [
    "etl",
    "pipeline",
    "warehouse",
    "analytics",
    "bigquery",
    "snowflake",
  ]);
  addIf("mobile", ["android", "ios", "react native", "flutter"]);
  addIf("web", ["web app", "frontend", "backend", "full stack", "full-stack"]);
  addIf("security", [
    "oauth",
    "jwt",
    "auth",
    "authentication",
    "authorization",
  ]);

  return Array.from(tags).slice(0, 8);
}

/**
 * Extract frameworks from package.json dependencies
 */
function detectFrameworksFromPackageJson(packageJson: any): string[] {
  const frameworks: string[] = [];
  const allDeps = {
    ...(packageJson.dependencies || {}),
    ...(packageJson.devDependencies || {}),
  };
  const depNames = Object.keys(allDeps).map((name) => name.toLowerCase());

  // Frontend frameworks
  if (
    depNames.some(
      (dep) =>
        dep === "react" ||
        dep === "react-dom" ||
        dep.startsWith("@types/react"),
    )
  ) {
    frameworks.push("React");
  }
  if (
    depNames.some(
      (dep) => dep === "vue" || dep === "vue3" || dep.startsWith("@vue/"),
    )
  ) {
    frameworks.push("Vue");
  }
  if (
    depNames.some(
      (dep) =>
        dep === "@angular/core" ||
        dep === "angular" ||
        dep.startsWith("@angular/"),
    )
  ) {
    frameworks.push("Angular");
  }
  if (depNames.includes("svelte")) {
    frameworks.push("Svelte");
  }
  if (depNames.includes("next")) {
    frameworks.push("Next.js");
  }
  if (depNames.some((dep) => dep === "nuxt" || dep === "nuxt3")) {
    frameworks.push("Nuxt");
  }
  if (depNames.includes("remix")) {
    frameworks.push("Remix");
  }
  if (depNames.includes("gatsby")) {
    frameworks.push("Gatsby");
  }

  // UI Libraries & Component Libraries
  if (depNames.some((dep) => dep === "tailwindcss" || dep === "tailwind")) {
    frameworks.push("Tailwind CSS");
  }
  if (
    depNames.some(
      (dep) =>
        dep === "@mui/material" ||
        dep === "material-ui" ||
        dep.startsWith("@mui/"),
    )
  ) {
    frameworks.push("Material-UI");
  }
  // shadcn/ui detection: it's not a package, but if user has Radix + Tailwind, likely using shadcn
  if (depNames.some((dep) => dep.startsWith("@radix-ui/"))) {
    frameworks.push("Radix UI");
    // If has both Radix UI and Tailwind, likely using shadcn/ui
    if (depNames.some((dep) => dep === "tailwindcss" || dep === "tailwind")) {
      frameworks.push("shadcn/ui");
    }
  }
  if (
    depNames.some(
      (dep) =>
        dep === "chakra-ui" ||
        dep === "@chakra-ui/react" ||
        dep.startsWith("@chakra-ui/"),
    )
  ) {
    frameworks.push("Chakra UI");
  }
  if (depNames.some((dep) => dep === "antd" || dep === "ant-design")) {
    frameworks.push("Ant Design");
  }
  if (
    depNames.some((dep) => dep === "bootstrap" || dep === "react-bootstrap")
  ) {
    frameworks.push("Bootstrap");
  }

  // Backend frameworks
  if (depNames.includes("express")) {
    frameworks.push("Express");
  }
  if (depNames.includes("koa")) {
    frameworks.push("Koa");
  }
  if (depNames.includes("fastify")) {
    frameworks.push("Fastify");
  }
  if (
    depNames.some((dep) => dep.includes("nestjs") || dep.startsWith("@nestjs/"))
  ) {
    frameworks.push("NestJS");
  }
  if (depNames.some((dep) => dep === "hapi" || dep.startsWith("@hapi/"))) {
    frameworks.push("Hapi");
  }

  // Database & ORMs
  if (
    depNames.some((dep) => dep === "drizzle-orm" || dep.startsWith("drizzle"))
  ) {
    frameworks.push("Drizzle ORM");
  }
  if (depNames.includes("prisma")) {
    frameworks.push("Prisma");
  }
  if (depNames.some((dep) => dep === "typeorm" || dep === "@typeorm/core")) {
    frameworks.push("TypeORM");
  }
  if (depNames.includes("mongoose")) {
    frameworks.push("Mongoose");
  }

  // State Management
  if (
    depNames.some(
      (dep) =>
        dep === "redux" ||
        dep === "@reduxjs/toolkit" ||
        dep.startsWith("redux"),
    )
  ) {
    frameworks.push("Redux");
  }
  if (depNames.includes("zustand")) {
    frameworks.push("Zustand");
  }
  if (depNames.includes("jotai")) {
    frameworks.push("Jotai");
  }

  // Full-stack frameworks
  if (depNames.includes("sveltekit")) {
    frameworks.push("SvelteKit");
  }

  return frameworks;
}

/**
 * Extract tech stack from GitHub data
 */
function extractTechStack(
  languages: Record<string, number>,
  contents: any[],
  packageJson?: any,
) {
  // Calculate language percentages
  const totalBytes = Object.values(languages).reduce(
    (sum: number, bytes: number) => sum + bytes,
    0,
  );
  const languageList = Object.entries(languages).map(([language, bytes]) => ({
    language,
    percentage: totalBytes > 0 ? (bytes / totalBytes) * 100 : 0,
  }));

  const fileNames = contents.map((file: any) => file.name?.toLowerCase() || "");
  const frameworks: string[] = [];
  const tooling: string[] = [];

  // Framework detection from package.json (if available)
  if (packageJson) {
    const detectedFrameworks = detectFrameworksFromPackageJson(packageJson);
    frameworks.push(...detectedFrameworks);
  }

  // Fallback: Basic framework detection from file names if no frameworks detected from package.json
  if (frameworks.length === 0) {
    if (fileNames.includes("package.json")) {
      frameworks.push("Node.js");
    }
    if (
      fileNames.includes("requirements.txt") ||
      fileNames.includes("setup.py")
    ) {
      frameworks.push("Python");
    }
    if (fileNames.includes("go.mod")) {
      frameworks.push("Go");
    }
    if (fileNames.includes("cargo.toml")) {
      frameworks.push("Rust");
    }
    if (fileNames.includes("pom.xml") || fileNames.includes("build.gradle")) {
      frameworks.push("Java/Maven");
    }
  }

  // Tooling detection
  if (fileNames.includes("dockerfile")) {
    tooling.push("Docker");
  }
  if (
    fileNames.includes("docker-compose.yml") ||
    fileNames.includes("docker-compose.yaml")
  ) {
    tooling.push("Docker Compose");
  }
  if (fileNames.includes("webpack.config.js")) {
    tooling.push("Webpack");
  }
  if (
    fileNames.includes("vite.config.js") ||
    fileNames.includes("vite.config.ts")
  ) {
    tooling.push("Vite");
  }

  return { languages: languageList, frameworks, tooling };
}

/**
 * Detect code quality signals
 */
function detectSignals(contents: any[]): {
  hasCI: boolean;
  hasDockerfile: boolean;
  testFrameworks: string[];
} {
  const fileNames = contents.map((file: any) => file.name?.toLowerCase() || "");
  const paths = contents.map((file: any) => file.path?.toLowerCase() || "");

  const hasCI = paths.some(
    (path) =>
      path.includes(".github/workflows") ||
      path.includes(".gitlab-ci.yml") ||
      path.includes("circleci") ||
      path.includes("travis.yml"),
  );

  const hasDockerfile = fileNames.some(
    (name) => name === "dockerfile" || name.startsWith("dockerfile."),
  );

  const testFrameworks: string[] = [];
  if (fileNames.some((name) => name.includes("jest"))) {
    testFrameworks.push("Jest");
  }
  if (fileNames.some((name) => name.includes("vitest"))) {
    testFrameworks.push("Vitest");
  }
  if (fileNames.some((name) => name.includes("mocha"))) {
    testFrameworks.push("Mocha");
  }
  if (fileNames.some((name) => name.includes("cypress"))) {
    testFrameworks.push("Cypress");
  }
  if (fileNames.some((name) => name.includes("playwright"))) {
    testFrameworks.push("Playwright");
  }

  return { hasCI, hasDockerfile, testFrameworks };
}

function truncateString(input: string, maxChars: number) {
  if (input.length <= maxChars) {
    return input;
  }
  return `${input.slice(0, Math.max(0, maxChars - 20))}\n...<truncated>...`;
}

export const analysisRouter = createTRPCRouter({
  /**
   * Analyze a public GitHub repo (stub version)
   * Input: repoFullName = "owner/repo"
   */
  runPublic: candidateProcedure
    .input(
      z.object({
        repoFullName: z
          .string()
          .regex(/^[^/]+\/[^/]+$/, "repoFullName must be owner/repo"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // 1. Ensure candidate profile exists
      const profile = await ctx.db.query.candidateProfile.findFirst({
        where: eq(candidateProfile.userId, userId),
      });

      if (!profile) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Please set your GitHub profile first",
        });
      }

      // 2. Fetch real GitHub data
      let repoData: any;
      let languages: Record<string, number> = {};
      let contents: any[] = [];

      try {
        [repoData, languages, contents] = await Promise.all([
          fetchGitHubAPI(`repos/${input.repoFullName}`),
          fetchGitHubAPI(`repos/${input.repoFullName}/languages`).catch(
            (err) => {
              console.warn(
                `Failed to fetch languages for ${input.repoFullName}:`,
                err,
              );
              return {};
            },
          ),
          fetchGitHubAPI(`repos/${input.repoFullName}/contents`).catch(
            (err) => {
              console.warn(
                `Failed to fetch contents for ${input.repoFullName}:`,
                err,
              );
              return [];
            },
          ),
        ]);
      } catch (error) {
        // If the main repo fetch fails, rethrow the error
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to analyze repository: ${error instanceof Error ? error.message : String(error)}`,
          cause: error,
        });
      }

      // Ensure contents is an array
      const contentsArray = Array.isArray(contents) ? contents : [];

      // Check if repo is private
      if (repoData.private) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only public repositories can be analyzed",
        });
      }

      // Try to read package.json
      let packageJson: any | undefined;
      const packageJsonFile = contentsArray.find(
        (file: any) => file.name?.toLowerCase() === "package.json",
      );
      if (packageJsonFile && packageJsonFile.url) {
        try {
          const packageJsonData = await fetchGitHubAPI(
            `repos/${input.repoFullName}/contents/package.json`,
          );
          // Decode base64 content (remove newlines first)
          if (
            packageJsonData.content &&
            packageJsonData.encoding === "base64"
          ) {
            const base64Content = packageJsonData.content.replace(/\n/g, "");
            const decodedContent = Buffer.from(
              base64Content,
              "base64",
            ).toString("utf-8");
            packageJson = JSON.parse(decodedContent);
          }
        } catch (error) {
          // If package.json can't be read, continue without it
          console.warn(
            "Failed to read package.json:",
            error instanceof Error ? error.message : error,
          );
        }
      }

      // Try to read README (best-effort)
      let readmeText: string | null = null;
      try {
        const readmeData = await fetchGitHubAPI(
          `repos/${input.repoFullName}/readme`,
        );
        if (readmeData?.encoding === "base64" && readmeData?.content) {
          readmeText = decodeBase64Text(readmeData.content);
        }
      } catch {
        readmeText = null;
      }
      const readmeExcerpt =
        typeof readmeText === "string" && readmeText.trim()
          ? readmeText.slice(0, 4000)
          : null;
      const domainTags = inferDomainTags({ readmeText, repoData });

      // 3. Extract tech stack and signals (Claude-assisted; fallback to deterministic).
      const deterministicTechStack = extractTechStack(
        languages,
        contentsArray,
        packageJson,
      );
      const deterministicSignals = detectSignals(contentsArray);

      const depNames =
        packageJson && (packageJson.dependencies || packageJson.devDependencies)
          ? Object.keys({
              ...(packageJson.dependencies || {}),
              ...(packageJson.devDependencies || {}),
            })
          : [];
      const filePaths = contentsArray
        .map((f: any) => (typeof f?.path === "string" ? f.path : f?.name))
        .filter((p: any) => typeof p === "string") as string[];

      const llmSchema = z.object({
        frameworks: z.array(z.string()).default([]),
        tooling: z.array(z.string()).default([]),
        testFrameworks: z.array(z.string()).default([]),
        hasCI: z.boolean(),
        hasDockerfile: z.boolean(),
        confidence: z.number().int().min(0).max(100).default(75),
      });

      let techStack = deterministicTechStack;
      let signals = deterministicSignals;
      let rationale: { confidence: number; source: string } = {
        confidence: 85,
        source: "GitHub API",
      };

      try {
        const llm = await generateJson({
          system:
            "You are an expert software engineer. Infer the repo tech stack and quality signals from metadata. Prefer specific well-known names. Keep lists short and avoid duplicates.",
          prompt: truncateString(
            [
              `Repo: ${input.repoFullName}`,
              `Repo description: ${typeof repoData?.description === "string" ? repoData.description : ""}`,
              `Top-level paths (sample):`,
              filePaths.slice(0, 200).join("\n"),
              "",
              `Dependencies (sample):`,
              depNames.slice(0, 160).join("\n"),
              "",
              `Deterministic signals (for reference):`,
              JSON.stringify(deterministicSignals),
              "",
              `Return JSON with keys: frameworks[], tooling[], testFrameworks[], hasCI, hasDockerfile, confidence (0-100).`,
            ].join("\n"),
            18_000,
          ),
          schema: llmSchema,
          temperature: 0,
          maxTokens: 800,
          timeoutMs: 20_000,
        });

        techStack = {
          ...deterministicTechStack,
          frameworks: Array.from(new Set(llm.frameworks)).slice(0, 30),
          tooling: Array.from(new Set(llm.tooling)).slice(0, 30),
        };
        signals = {
          hasCI: llm.hasCI,
          hasDockerfile: llm.hasDockerfile,
          testFrameworks: Array.from(new Set(llm.testFrameworks)).slice(0, 20),
        };
        rationale = {
          confidence: llm.confidence,
          source: "GitHub API + Claude",
        };
      } catch (e) {
        // Best-effort only: fall back to deterministic extraction.
        if (e instanceof LlmError) {
          rationale = {
            confidence: 70,
            source: "GitHub API (LLM unavailable)",
          };
        }
      }

      // 4. Insert repo analysis
      const [row] = await ctx.db
        .insert(repoAnalysis)
        .values({
          candidateUserId: userId,
          repoFullName: input.repoFullName,
          techStack,
          signals,
          rationale,
          readmeExcerpt,
          domainTags,
        })
        .returning({ id: repoAnalysis.id });

      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create repo analysis",
        });
      }

      // 5. Update last analyzed timestamp
      await ctx.db
        .update(candidateProfile)
        .set({ lastAnalyzedAt: new Date() })
        .where(eq(candidateProfile.userId, userId));

      return {
        analysisId: row.id,
        techStack,
        signals,
        domainTags,
        debug: {
          packageJsonFound: !!packageJson,
          detectedDependencies: packageJson
            ? Object.keys(packageJson.dependencies || {}).slice(0, 10)
            : [],
          contentsCount: contentsArray.length,
          readmeFound: Boolean(readmeExcerpt),
        },
      };
    }),
});
