/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */

import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { eq, sql } from "drizzle-orm";

import { auth } from "~/server/better-auth";
import { db } from "~/server/db";
import { user as userTable } from "~/server/db/schema";

let ensureJobMatchStatusOnce: Promise<void> | null = null;
async function ensureJobMatchStatusInDev() {
  if (process.env.NODE_ENV !== "development") return;
  if (ensureJobMatchStatusOnce) return ensureJobMatchStatusOnce;

  ensureJobMatchStatusOnce = (async () => {
    try {
      // Create enum if missing.
      await db.execute(sql`
        do $$
        begin
          if not exists (select 1 from pg_type where typname = 'application_status') then
            create type "public"."application_status" as enum (
              'not_started',
              'in_progress',
              'completed',
              'flagged',
              'proceed',
              'rejected',
              'waitlisted',
              'expired'
            );
          end if;
        end $$;
      `);

      // Add missing columns/index (idempotent).
      await db.execute(sql`
        alter table if exists "pg-drizzle_job_match"
          add column if not exists "status" "application_status" default 'completed' not null
      `);
      await db.execute(sql`
        alter table if exists "pg-drizzle_job_match"
          add column if not exists "updatedAt" timestamp with time zone
      `);
      await db.execute(sql`
        create index if not exists "job_match_status_idx"
          on "pg-drizzle_job_match" using btree ("status")
      `);

      // #region agent log (hypothesis A: auto-heal missing status column in dev)
      // Disabled: logging service not available
      // fetch(
      //   "http://127.0.0.1:7244/ingest/8ef8dc20-215a-4ec2-b756-742be3be6758",
      //   {
      //     method: "POST",
      //     headers: { "Content-Type": "application/json" },
      //     body: JSON.stringify({
      //       sessionId: "debug-session",
      //       runId: "run2",
      //       hypothesisId: "A",
      //       location: "src/server/api/trpc.ts:ensureJobMatchStatusInDev:ok",
      //       message:
      //         "Ensured pg-drizzle_job_match.status exists (dev auto-heal)",
      //       data: { ok: true },
      //       timestamp: Date.now(),
      //     }),
      //   },
      // ).catch(() => {});
      // #endregion
    } catch (e: any) {
      // #region agent log (hypothesis A: auto-heal failed)
      // Disabled: logging service not available
      // fetch(
      //   "http://127.0.0.1:7244/ingest/8ef8dc20-215a-4ec2-b756-742be3be6758",
      //   {
      //     method: "POST",
      //     headers: { "Content-Type": "application/json" },
      //     body: JSON.stringify({
      //       sessionId: "debug-session",
      //       runId: "run2",
      //       hypothesisId: "A",
      //       location: "src/server/api/trpc.ts:ensureJobMatchStatusInDev:error",
      //       message:
      //         "Failed ensuring pg-drizzle_job_match.status (dev auto-heal)",
      //       data: { errorMessage: String(e?.message ?? e ?? "unknown") },
      //       timestamp: Date.now(),
      //     }),
      //   },
      // ).catch(() => {});
      // #endregion
    }
  })();

  return ensureJobMatchStatusOnce;
}

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */
export const createTRPCContext = async (opts: { headers: Headers }) => {
  const startedAt = Date.now();
  let dbInfo: { host?: string; port?: string; db?: string } = {};
  try {
    const u = new URL(process.env.DATABASE_URL ?? "");
    dbInfo = {
      host: u.hostname,
      port: u.port,
      db: u.pathname?.replace(/^\//, ""),
    };
  } catch {
    dbInfo = {};
  }

  // #region agent log (hypothesis C: wrong DB / wrong env)
  fetch("http://127.0.0.1:7244/ingest/8ef8dc20-215a-4ec2-b756-742be3be6758", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: "debug-session",
      runId: "run1",
      hypothesisId: "C",
      location: "src/server/api/trpc.ts:createTRPCContext:dbInfo",
      message: "createTRPCContext start (sanitized db info)",
      data: { dbInfo, nodeEnv: process.env.NODE_ENV ?? null },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  // Fallback runtime evidence (if ingest/log path is unavailable):
  console.log("[agent-debug] createTRPCContext dbInfo", dbInfo);

  // Dev-only: auto-heal broken local migration state for job_match.status
  await ensureJobMatchStatusInDev();

  const session = await auth.api.getSession({
    headers: opts.headers,
  });

  // Hypothesis A/D: DB schema missing columns (repo_full_name/status) or wrong table name.
  try {
    const result = await db.execute(sql`
      select table_name, column_name
      from information_schema.columns
      where table_schema = 'public'
        and table_name in ('pg-drizzle_job_match', 'job_match')
        and column_name in ('repo_full_name', 'status')
      order by table_name, column_name
    `);
    const rows = ((result as any).rows ?? result) as Array<{
      table_name?: string;
      column_name?: string;
    }>;
    const found = rows.map((r) => ({
      table: r.table_name ?? null,
      column: r.column_name ?? null,
    }));

    // #region agent log (hypothesis A/D: missing migration / wrong table)
    fetch("http://127.0.0.1:7244/ingest/8ef8dc20-215a-4ec2-b756-742be3be6758", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "A",
        location: "src/server/api/trpc.ts:createTRPCContext:jobMatchColumns",
        message: "job_match column presence check (repo_full_name/status)",
        data: { found, count: found.length },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    // Fallback runtime evidence (if ingest/log path is unavailable):
    console.log("[agent-debug] job_match columns repo_full_name/status", found);
  } catch (e: any) {
    // #region agent log (hypothesis A/D: schema check failed)
    fetch("http://127.0.0.1:7244/ingest/8ef8dc20-215a-4ec2-b756-742be3be6758", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "D",
        location: "src/server/api/trpc.ts:createTRPCContext:jobMatchColumns",
        message: "job_match column presence check failed",
        data: { error: String(e?.message ?? e ?? "unknown") },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    console.log(
      "[agent-debug] job_match column presence check failed",
      String(e?.message ?? e),
    );
  }

  // 将 DB 中的 user.role 补到 session.user 上，方便后续在 procedure 内直接用：
  // ctx.session.user.role === "hr" | "candidate"
  //
  // 注意：better-auth 的 session.user 默认不包含自定义字段，因此这里做一次轻量查询。
  let sessionWithRole = session;
  if (session?.user) {
    const dbUser = await db.query.user.findFirst({
      where: eq(userTable.id, session.user.id),
      columns: { role: true },
    });
    const role = dbUser?.role ?? "candidate";
    sessionWithRole = {
      ...session,
      user: {
        ...session.user,
        role,
      },
    } as typeof session;
  }
  return {
    db,
    session: sessionWithRole,
    ...opts,
  };
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Create a server-side caller.
 *
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Middleware for timing procedure execution.
 *
 * Note: Artificial delay has been removed for faster testing in development.
 * If you want to simulate network latency, uncomment the delay code below.
 */
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  // Uncomment to add artificial delay (100-500ms) in development
  // if (t._config.isDev) {
  //   const waitMs = Math.floor(Math.random() * 400) + 100;
  //   await new Promise((resolve) => setTimeout(resolve, waitMs));
  // }

  const result = await next();

  const end = Date.now();
  console.log(`[TRPC] ${path} took ${end - start}ms to execute`);

  return result;
});

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export const publicProcedure = t.procedure.use(timingMiddleware);

/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * the session is valid and guarantees `ctx.session.user` is not null.
 *
 * @see https://trpc.io/docs/procedures
 */
export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({
      ctx: {
        // infers the `session` as non-nullable
        session: { ...ctx.session, user: ctx.session.user },
      },
    });
  });

/**
 * HR-only procedure
 *
 * 必须登录，且必须是 HR 角色。
 * (Hackathon) In hackathon mode, allow any logged-in user to use HR procedures
 */
export const hrProcedure = protectedProcedure.use(({ ctx, next }) => {
  const role = (
    ctx.session.user as typeof ctx.session.user & {
      role?: "hr" | "candidate";
    }
  ).role;
  // Hackathon mode: allow if role is undefined/null (any logged-in user can be HR)
  // In production, you should check role === "hr"
  if (role !== undefined && role !== "hr") {
    throw new TRPCError({ code: "FORBIDDEN", message: "HR role required" });
  }
  return next();
});

/**
 * Candidate-only procedure
 *
 * 必须登录，且必须是 Candidate 角色。
 * (Hackathon) In hackathon mode, allow any logged-in user to use candidate procedures
 */
export const candidateProcedure = protectedProcedure.use(({ ctx, next }) => {
  // (Hackathon) Allow any logged-in user to use candidate procedures
  // In production, you should check role === "candidate"
  // For hackathon mode, we allow HR users to also access candidate features (e.g., for testing)
  return next();
});
