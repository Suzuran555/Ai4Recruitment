import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import { env } from "~/env";
import { parseGithubOwner, parseGithubRepo } from "~/lib/github/parse";
import { account } from "~/server/db/schema";
import { generateText, LlmError } from "~/server/llm/anthropic";

type RateLimitInfo = {
  limit?: number;
  remaining?: number;
  resetEpochSeconds?: number;
};

const githubBase = "https://api.github.com";

const cache = new Map<
  string,
  { expiresAt: number; value: unknown; rateLimit: RateLimitInfo }
>();

function nowMs() {
  return Date.now();
}

function withQuery(
  url: string,
  query?: Record<string, string | number | boolean | undefined>,
) {
  if (!query) {
    return url;
  }
  const u = new URL(url);
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined) {
      continue;
    }
    u.searchParams.set(k, String(v));
  }
  return u.toString();
}

function extractRateLimit(headers: Headers): RateLimitInfo {
  const limit = Number(headers.get("x-ratelimit-limit") ?? "");
  const remaining = Number(headers.get("x-ratelimit-remaining") ?? "");
  const resetEpochSeconds = Number(headers.get("x-ratelimit-reset") ?? "");
  return {
    limit: Number.isFinite(limit) ? limit : undefined,
    remaining: Number.isFinite(remaining) ? remaining : undefined,
    resetEpochSeconds: Number.isFinite(resetEpochSeconds)
      ? resetEpochSeconds
      : undefined,
  };
}

function isRateLimited(status: number, headers: Headers) {
  if (status !== 403 && status !== 429) {
    return false;
  }
  const remaining = headers.get("x-ratelimit-remaining");
  return remaining === "0" || status === 429;
}

function truncateString(input: string, maxChars: number) {
  if (input.length <= maxChars) {
    return input;
  }
  return `${input.slice(0, Math.max(0, maxChars - 20))}\n...<truncated>...`;
}

async function fetchText(url: string, opts?: { timeoutMs?: number }) {
  const controller = new AbortController();
  const timeoutMs = opts?.timeoutMs ?? 5000;
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      return null;
    }
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function githubGetJson<T>(
  path: string,
  opts?: {
    cacheTtlMs?: number;
    query?: Record<string, any>;
    token?: string;
    cacheKeySuffix?: string;
  },
) {
  const ttlMs = opts?.cacheTtlMs ?? 60_000;
  const url = withQuery(`${githubBase}${path}`, opts?.query);
  // IMPORTANT: cache must vary by auth context to avoid leaking private data across users.
  // - anon: no token
  // - user:<id>: user GitHub OAuth token
  // - server: server-wide token
  const cacheKeySuffix = opts?.cacheKeySuffix ?? "anon";
  const key = `GET:${url}:auth=${cacheKeySuffix}`;
  const hit = cache.get(key);
  if (hit && hit.expiresAt > nowMs()) {
    return { data: hit.value as T, rateLimit: hit.rateLimit, cached: true };
  }

  let res: Response;
  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "ai_recruitment_app",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    if (opts?.token) {
      headers.Authorization = `Bearer ${opts.token}`;
    }
    res = await fetch(url, {
      method: "GET",
      headers,
    });
  } catch (e) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to reach GitHub API",
      cause: e,
    });
  }

  const rateLimit = extractRateLimit(res.headers);

  if (!res.ok) {
    if (isRateLimited(res.status, res.headers)) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: opts?.token
          ? "GitHub rate limit exceeded. Try again later."
          : "GitHub rate limit exceeded (unauthenticated). Try again later.",
      });
    }
    if (res.status === 404) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "GitHub resource not found",
      });
    }
    const body = await res.text().catch(() => "");
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `GitHub API error (${res.status})`,
      cause: body ? new Error(body.slice(0, 2000)) : undefined,
    });
  }

  const json = (await res.json()) as T;
  cache.set(key, { expiresAt: nowMs() + ttlMs, value: json, rateLimit });
  return { data: json, rateLimit, cached: false };
}

async function getGithubAuth(ctx: {
  db: typeof import("~/server/db").db;
  session: { user: { id: string } };
}) {
  // 1) Prefer the signed-in user's GitHub OAuth token if available.
  const githubAccount = await ctx.db.query.account.findFirst({
    where: and(
      eq(account.userId, ctx.session.user.id),
      eq(account.providerId, "github"),
    ),
    columns: { accessToken: true },
  });

  const userToken = githubAccount?.accessToken ?? undefined;
  if (userToken) {
    return { token: userToken, cacheKeySuffix: `user:${ctx.session.user.id}` };
  }

  // 2) Fallback: server-wide token (recommended for reliable rate limits).
  if (env.GITHUB_TOKEN) {
    return { token: env.GITHUB_TOKEN, cacheKeySuffix: "server" };
  }

  return { token: undefined, cacheKeySuffix: "anon" };
}

const paginationInput = z.object({
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(50).default(10),
});

export const githubRouter = createTRPCRouter({
  parseRepoUrl: protectedProcedure
    .input(z.object({ repoUrl: z.string().min(1) }))
    .query(({ input }) => {
      try {
        return parseGithubRepo(input.repoUrl);
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "Invalid GitHub repo URL",
        });
      }
    }),

  getRepoOverview: protectedProcedure
    .input(z.object({ owner: z.string().min(1), repo: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const { owner, repo } = input;
      const auth = await getGithubAuth(ctx);

      const repoRes = await githubGetJson<any>(`/repos/${owner}/${repo}`, auth);
      const languagesRes = await githubGetJson<Record<string, number>>(
        `/repos/${owner}/${repo}/languages`,
        auth,
      );
      const tagsRes = await githubGetJson<any[]>(
        `/repos/${owner}/${repo}/tags`,
        {
          ...auth,
          query: { per_page: 10, page: 1 },
        },
      );
      const releasesRes = await githubGetJson<any[]>(
        `/repos/${owner}/${repo}/releases`,
        {
          ...auth,
          query: { per_page: 5, page: 1 },
        },
      );
      const pullsRes = await githubGetJson<any[]>(
        `/repos/${owner}/${repo}/pulls`,
        {
          ...auth,
          query: { per_page: 5, page: 1, state: "all" },
        },
      );
      const issuesRes = await githubGetJson<any[]>(
        `/repos/${owner}/${repo}/issues`,
        {
          ...auth,
          query: { per_page: 5, page: 1, state: "all" },
        },
      );
      const commitsRes = await githubGetJson<any[]>(
        `/repos/${owner}/${repo}/commits`,
        {
          ...auth,
          query: { per_page: 5, page: 1 },
        },
      );
      const contributorsRes = await githubGetJson<any[]>(
        `/repos/${owner}/${repo}/contributors`,
        {
          ...auth,
          query: { per_page: 10, page: 1 },
        },
      );

      // Best-effort readme (don’t expose base64 to UI by default).
      let readme: any | null = null;
      try {
        const readmeRes = await githubGetJson<any>(
          `/repos/${owner}/${repo}/readme`,
          {
            ...auth,
            cacheTtlMs: 300_000,
          },
        );
        readme = readmeRes.data
          ? {
              name: readmeRes.data.name,
              html_url: readmeRes.data.html_url,
              download_url: readmeRes.data.download_url,
              size: readmeRes.data.size,
            }
          : null;

        // Claude-assisted README summary (best-effort, safe; does not change existing fields).
        if (readme?.download_url && typeof readme.download_url === "string") {
          const raw = await fetchText(readme.download_url, { timeoutMs: 5000 });
          if (raw) {
            try {
              const summary = await generateText({
                system:
                  "Summarize the README for an HR/recruiting dashboard. Keep it short, factual, and non-sensitive.",
                prompt: truncateString(
                  [
                    `Repo: ${owner}/${repo}`,
                    `Repo description: ${typeof repoRes.data?.description === "string" ? repoRes.data.description : ""}`,
                    "",
                    "README:",
                    raw,
                    "",
                    "Output: 3-5 bullet points + 1 sentence summary. No markdown headings.",
                  ].join("\n"),
                  12_000,
                ),
                temperature: 0.2,
                maxTokens: 350,
                timeoutMs: 12_000,
              });
              readme.summary = summary;
            } catch (e) {
              // Swallow LLM errors; GitHub overview should remain usable.
              if (e instanceof LlmError) {
                // noop
              }
            }
          }
        }
      } catch {
        readme = null;
      }

      // Combine rate-limit info; last call usually has latest headers.
      const rateLimit =
        contributorsRes.rateLimit ??
        commitsRes.rateLimit ??
        issuesRes.rateLimit ??
        pullsRes.rateLimit ??
        releasesRes.rateLimit ??
        tagsRes.rateLimit ??
        languagesRes.rateLimit ??
        repoRes.rateLimit;

      return {
        repo: repoRes.data,
        languages: languagesRes.data,
        tagsPreview: tagsRes.data,
        releasesPreview: releasesRes.data,
        pullsPreview: pullsRes.data,
        issuesPreview: issuesRes.data.filter((i) => !i.pull_request),
        commitsPreview: commitsRes.data,
        contributorsPreview: contributorsRes.data,
        readme,
        rateLimit,
      };
    }),

  listRepoPulls: protectedProcedure
    .input(
      z
        .object({ owner: z.string().min(1), repo: z.string().min(1) })
        .merge(paginationInput),
    )
    .query(async ({ ctx, input }) => {
      const auth = await getGithubAuth(ctx);
      const res = await githubGetJson<any[]>(
        `/repos/${input.owner}/${input.repo}/pulls`,
        {
          ...auth,
          query: { per_page: input.perPage, page: input.page, state: "all" },
        },
      );
      return {
        items: res.data,
        page: input.page,
        perPage: input.perPage,
        rateLimit: res.rateLimit,
      };
    }),

  listRepoIssues: protectedProcedure
    .input(
      z
        .object({ owner: z.string().min(1), repo: z.string().min(1) })
        .merge(paginationInput),
    )
    .query(async ({ ctx, input }) => {
      const auth = await getGithubAuth(ctx);
      const res = await githubGetJson<any[]>(
        `/repos/${input.owner}/${input.repo}/issues`,
        {
          ...auth,
          query: { per_page: input.perPage, page: input.page, state: "all" },
        },
      );
      return {
        items: res.data.filter((i) => !i.pull_request),
        page: input.page,
        perPage: input.perPage,
        rateLimit: res.rateLimit,
      };
    }),

  listRepoCommits: protectedProcedure
    .input(
      z
        .object({ owner: z.string().min(1), repo: z.string().min(1) })
        .merge(paginationInput),
    )
    .query(async ({ ctx, input }) => {
      const auth = await getGithubAuth(ctx);
      const res = await githubGetJson<any[]>(
        `/repos/${input.owner}/${input.repo}/commits`,
        {
          ...auth,
          query: { per_page: input.perPage, page: input.page },
        },
      );
      return {
        items: res.data,
        page: input.page,
        perPage: input.perPage,
        rateLimit: res.rateLimit,
      };
    }),

  listRepoReleases: protectedProcedure
    .input(
      z
        .object({ owner: z.string().min(1), repo: z.string().min(1) })
        .merge(paginationInput),
    )
    .query(async ({ ctx, input }) => {
      const auth = await getGithubAuth(ctx);
      const res = await githubGetJson<any[]>(
        `/repos/${input.owner}/${input.repo}/releases`,
        {
          ...auth,
          query: { per_page: input.perPage, page: input.page },
        },
      );
      return {
        items: res.data,
        page: input.page,
        perPage: input.perPage,
        rateLimit: res.rateLimit,
      };
    }),

  listRepoContributors: protectedProcedure
    .input(
      z
        .object({ owner: z.string().min(1), repo: z.string().min(1) })
        .merge(paginationInput),
    )
    .query(async ({ ctx, input }) => {
      const auth = await getGithubAuth(ctx);
      const res = await githubGetJson<any[]>(
        `/repos/${input.owner}/${input.repo}/contributors`,
        {
          ...auth,
          query: { per_page: input.perPage, page: input.page },
        },
      );
      return {
        items: res.data,
        page: input.page,
        perPage: input.perPage,
        rateLimit: res.rateLimit,
      };
    }),

  getUserOverview: protectedProcedure
    .input(z.object({ owner: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const owner = parseGithubOwner(input.owner);
      if (!owner) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid GitHub owner/login",
        });
      }
      const auth = await getGithubAuth(ctx);

      const userRes = await githubGetJson<any>(`/users/${owner}`, {
        ...auth,
        cacheTtlMs: 300_000,
      });
      const reposRes = await githubGetJson<any[]>(`/users/${owner}/repos`, {
        ...auth,
        query: { per_page: 10, page: 1, type: "owner", sort: "updated" },
        cacheTtlMs: 60_000,
      });

      // Optional: events are best-effort and can 404 for some users (or be empty).
      let eventsPreview: any[] = [];
      try {
        const eventsRes = await githubGetJson<any[]>(
          `/users/${owner}/events/public`,
          {
            ...auth,
            query: { per_page: 10, page: 1 },
            cacheTtlMs: 60_000,
          },
        );
        eventsPreview = eventsRes.data ?? [];
      } catch {
        eventsPreview = [];
      }

      return {
        user: userRes.data,
        reposPreview: reposRes.data,
        eventsPreview,
        rateLimit: reposRes.rateLimit ?? userRes.rateLimit,
      };
    }),

  listUserRepos: protectedProcedure
    .input(z.object({ owner: z.string().min(1) }).merge(paginationInput))
    .query(async ({ ctx, input }) => {
      const owner = parseGithubOwner(input.owner);
      if (!owner) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid GitHub owner/login",
        });
      }
      const auth = await getGithubAuth(ctx);
      const res = await githubGetJson<any[]>(`/users/${owner}/repos`, {
        ...auth,
        query: {
          per_page: input.perPage,
          page: input.page,
          type: "owner",
          sort: "updated",
        },
      });
      return {
        items: res.data,
        page: input.page,
        perPage: input.perPage,
        rateLimit: res.rateLimit,
      };
    }),
});
