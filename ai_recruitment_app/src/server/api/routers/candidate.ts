import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { candidateProcedure, createTRPCRouter } from "../trpc";
import { TRPCError } from "@trpc/server";
import {
  candidateAssignment,
  candidateProfile,
  jobMatch,
} from "~/server/db/schema";

export const candidateRouter = createTRPCRouter({
  // Create candidate's profile
  setGithub: candidateProcedure
    .input(
      z.object({
        githubUrl: z.string().url(),
        // github username
        githubLogin: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .insert(candidateProfile)
        .values({
          userId: ctx.session.user.id,
          githubLogin: input.githubLogin,
          githubUrl: input.githubUrl,
          lastAnalyzedAt: null,
        })
        .onConflictDoUpdate({
          target: candidateProfile.userId,
          set: {
            githubLogin: input.githubLogin,
            githubUrl: input.githubUrl,
          },
        });

      return { ok: true };
    }),

  /**
   * Candidate-only: Equivalent to POST /candidate/info (spec).
   *
   * - Upserts candidate_profile (github + optional preferences/resume)
   * - Returns a backend-friendly json structure:
   *   capability_stats + timeline + recommended_projects
   *
   * NOTE: This is a Phase-0 deterministic response. You can later replace fields with real AI outputs.
   */
  info: candidateProcedure
    .input(
      z.object({
        githubUrl: z.string().url(),
        githubLogin: z.string().min(1),
        preferredCulture: z.string().optional(),
        resume: z.unknown().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // #region agent log
      // Disabled: logging service not available
      // fetch(
      //   "http://127.0.0.1:7244/ingest/8ef8dc20-215a-4ec2-b756-742be3be6758",
      //   {
      //     method: "POST",
      //     headers: { "Content-Type": "application/json" },
      //     body: JSON.stringify({
      //       location: "src/server/api/routers/candidate.ts:info:entry",
      //       message: "candidate.info called",
      //       data: {
      //         userIdPresent: !!ctx.session?.user?.id,
      //         hasPreferredCulture: input.preferredCulture !== undefined,
      //         hasResume: input.resume !== undefined,
      //       },
      //       timestamp: Date.now(),
      //       sessionId: "debug-session",
      //       runId: "pre-fix",
      //       hypothesisId: "A",
      //     }),
      //   },
      // ).catch(() => {});
      // #endregion

      try {
        // #region agent log
        fetch(
          "http://127.0.0.1:7244/ingest/8ef8dc20-215a-4ec2-b756-742be3be6758",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              location:
                "src/server/api/routers/candidate.ts:info:before-upsert",
              message: "About to upsert candidate_profile",
              data: { setsPreferredCulture: true, setsResume: true },
              timestamp: Date.now(),
              sessionId: "debug-session",
              runId: "pre-fix",
              hypothesisId: "C",
            }),
          },
        ).catch(() => {});
        // #endregion

        await ctx.db
          .insert(candidateProfile)
          .values({
            userId: ctx.session.user.id,
            githubLogin: input.githubLogin,
            githubUrl: input.githubUrl,
            preferredCulture: input.preferredCulture,
            resume: input.resume,
            lastAnalyzedAt: null,
          })
          .onConflictDoUpdate({
            target: candidateProfile.userId,
            set: {
              githubLogin: input.githubLogin,
              githubUrl: input.githubUrl,
              preferredCulture: input.preferredCulture,
              resume: input.resume,
            },
          });

        // #region agent log
        fetch(
          "http://127.0.0.1:7244/ingest/8ef8dc20-215a-4ec2-b756-742be3be6758",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              location: "src/server/api/routers/candidate.ts:info:after-upsert",
              message: "Upsert candidate_profile succeeded",
              data: { ok: true },
              timestamp: Date.now(),
              sessionId: "debug-session",
              runId: "pre-fix",
              hypothesisId: "A",
            }),
          },
        ).catch(() => {});
        // #endregion
      } catch (err) {
        // #region agent log
        fetch(
          "http://127.0.0.1:7244/ingest/8ef8dc20-215a-4ec2-b756-742be3be6758",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              location: "src/server/api/routers/candidate.ts:info:upsert-error",
              message: "Upsert candidate_profile failed",
              data: {
                errorName: (err as any)?.name ?? null,
                errorMessage: String((err as any)?.message ?? "").slice(0, 240),
              },
              timestamp: Date.now(),
              sessionId: "debug-session",
              runId: "pre-fix",
              hypothesisId: "A",
            }),
          },
        ).catch(() => {});
        // #endregion
        throw err;
      }

      const now = new Date().toISOString();
      const myMatches = await ctx.db.query.jobMatch.findMany({
        where: eq(jobMatch.candidateUserId, ctx.session.user.id),
        with: { job: true },
        orderBy: (jm, { desc }) => [desc(jm.createdAt)],
      });

      // Deterministic placeholders:
      const testing =
        myMatches.length > 0
          ? Math.min(100, Math.max(40, myMatches[0]!.score))
          : 50;
      const codeQuality =
        myMatches.length > 0
          ? Math.min(100, Math.max(40, myMatches[0]!.score))
          : 50;

      return {
        capability_stats: {
          problem_solving: 50,
          testing,
          architecture: 50,
          debugging: 50,
          communication: 50,
          code_quality: codeQuality,
          ai_summary:
            "Phase 0：当前为规则/占位评分（以 Repo 匹配与基础信号为主），后续会接入更丰富的 AI 能力评估与挑战表现。",
        },
        timeline: [
          {
            id: `event_${Date.now()}`,
            title: "Candidate Info Submitted",
            description: "Saved GitHub profile & preferences.",
            timestamp: now,
            is_completed: true,
          },
        ],
        recommended_projects: myMatches.slice(0, 10).map((m) => ({
          project_id: `job_${m.jobId}`,
          project_title: m.job?.title ?? "Job",
          publisher_id: m.job?.hrUserId ?? "",
          publisher_name: "HR",
          match_rate: Math.max(0, Math.min(1, (m.score ?? 0) / 100)),
          tags: Object.keys(
            (m.job?.requiredStacks as Record<string, number>) ?? {},
          ).slice(0, 6),
        })),
      };
    }),

  /**
   * Candidate-only: Get current user's candidate profile.
   * Alias: `me` for convenience.
   */
  getProfile: candidateProcedure.query(async ({ ctx }) => {
    // #region agent log
    fetch("http://127.0.0.1:7244/ingest/8ef8dc20-215a-4ec2-b756-742be3be6758", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "src/server/api/routers/candidate.ts:getProfile:entry",
        message: "candidate.getProfile called",
        data: { userIdPresent: !!ctx.session?.user?.id },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "pre-fix",
        hypothesisId: "D",
      }),
    }).catch(() => {});
    // #endregion
    try {
      return await ctx.db.query.candidateProfile.findFirst({
        where: eq(candidateProfile.userId, ctx.session.user.id),
      });
    } catch (err) {
      // #region agent log
      fetch(
        "http://127.0.0.1:7244/ingest/8ef8dc20-215a-4ec2-b756-742be3be6758",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "src/server/api/routers/candidate.ts:getProfile:error",
            message: "candidate.getProfile failed",
            data: {
              errorName: (err as any)?.name ?? null,
              errorMessage: String((err as any)?.message ?? "").slice(0, 240),
            },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "pre-fix",
            hypothesisId: "D",
          }),
        },
      ).catch(() => {});
      // #endregion
      throw err;
    }
  }),

  me: candidateProcedure.query(async ({ ctx }) => {
    // #region agent log
    fetch("http://127.0.0.1:7244/ingest/8ef8dc20-215a-4ec2-b756-742be3be6758", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "src/server/api/routers/candidate.ts:me:entry",
        message: "candidate.me called",
        data: { userIdPresent: !!ctx.session?.user?.id },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "pre-fix",
        hypothesisId: "D",
      }),
    }).catch(() => {});
    // #endregion
    try {
      return await ctx.db.query.candidateProfile.findFirst({
        where: eq(candidateProfile.userId, ctx.session.user.id),
      });
    } catch (err) {
      // #region agent log
      fetch(
        "http://127.0.0.1:7244/ingest/8ef8dc20-215a-4ec2-b756-742be3be6758",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "src/server/api/routers/candidate.ts:me:error",
            message: "candidate.me failed",
            data: {
              errorName: (err as any)?.name ?? null,
              errorMessage: String((err as any)?.message ?? "").slice(0, 240),
            },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "pre-fix",
            hypothesisId: "D",
          }),
        },
      ).catch(() => {});
      // #endregion
      throw err;
    }
  }),

  /**
   * Candidate-only: List historically claimed/applied jobs.
   * Equivalent to GET /candidate/job
   */
  listJobs: candidateProcedure.query(async ({ ctx }) => {
    return ctx.db.query.candidateAssignment.findMany({
      where: eq(candidateAssignment.candidateUserId, ctx.session.user.id),
      with: {
        job: true,
        assignment: true,
      },
      orderBy: (ca, { desc }) => [desc(ca.createdAt)],
    });
  }),

  /**
   * Candidate-only: Get specific job details for this candidate.
   * Equivalent to GET /candidate/job/:jobId
   */
  getJob: candidateProcedure
    .input(z.object({ jobId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const ca = await ctx.db.query.candidateAssignment.findFirst({
        where: and(
          eq(candidateAssignment.jobId, input.jobId),
          eq(candidateAssignment.candidateUserId, ctx.session.user.id),
        ),
        with: {
          job: true,
          assignment: true,
        },
      });

      if (!ca) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Candidate assignment not found",
        });
      }

      const branchUrl =
        ca.repoUrl && ca.submissionBranch
          ? `${ca.repoUrl}/tree/${encodeURIComponent(ca.submissionBranch)}`
          : null;

      return {
        job: ca.job,
        assignment: ca.assignment,
        repoUrl: ca.repoUrl,
        submissionBranch: ca.submissionBranch,
        submissionBranchUrl: branchUrl,
        status: ca.status,
        decisionStatus: ca.decisionStatus,
        todo: ca.todo ?? [],
        messages: ca.messages ?? [],
        timeline: ca.timeline ?? [],
        capability_stats: ca.capabilityStats ?? null,
      };
    }),

  /**
   * Candidate-only: Update job progress.
   * Equivalent to PUT /candidate/job/:jobId
   *
   * Supports:
   * - append message
   * - mark todo complete by id
   */
  updateJobProgress: candidateProcedure
    .input(
      z.object({
        jobId: z.number().int().positive(),
        message: z.string().min(1).optional(),
        completeTodoId: z.string().min(1).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const ca = await ctx.db.query.candidateAssignment.findFirst({
        where: and(
          eq(candidateAssignment.jobId, input.jobId),
          eq(candidateAssignment.candidateUserId, ctx.session.user.id),
        ),
      });

      if (!ca) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Candidate assignment not found",
        });
      }

      const now = new Date().toISOString();
      const messages = Array.isArray(ca.messages)
        ? [...(ca.messages as any[])]
        : [];
      const todo = Array.isArray(ca.todo) ? [...(ca.todo as any[])] : [];
      const timeline = Array.isArray(ca.timeline)
        ? [...(ca.timeline as any[])]
        : [];

      if (input.message !== undefined) {
        messages.push({
          id: `msg_${Date.now()}`,
          role: "candidate",
          text: input.message,
          timestamp: now,
        });
        timeline.push({
          id: `event_${Date.now()}`,
          title: "Message sent",
          description: input.message.slice(0, 120),
          timestamp: now,
          is_completed: true,
        });
      }

      if (input.completeTodoId !== undefined) {
        for (const t of todo) {
          if (t && typeof t === "object" && t.id === input.completeTodoId) {
            t.is_completed = true;
          }
        }
        timeline.push({
          id: `event_${Date.now()}`,
          title: "Todo completed",
          description: input.completeTodoId,
          timestamp: now,
          is_completed: true,
        });
      }

      await ctx.db
        .update(candidateAssignment)
        .set({
          messages,
          todo,
          timeline,
        })
        .where(eq(candidateAssignment.id, ca.id));

      return { ok: true };
    }),

  /**
   * Candidate-only: Clear job progress (does not delete schema; keeps the claim record).
   * Equivalent to DELETE /candidate/job/:jobId (spec wording: delete progress)
   */
  clearJobProgress: candidateProcedure
    .input(z.object({ jobId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const ca = await ctx.db.query.candidateAssignment.findFirst({
        where: and(
          eq(candidateAssignment.jobId, input.jobId),
          eq(candidateAssignment.candidateUserId, ctx.session.user.id),
        ),
      });

      if (!ca) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Candidate assignment not found",
        });
      }

      await ctx.db
        .update(candidateAssignment)
        .set({
          todo: [],
          messages: [],
          timeline: [],
        })
        .where(eq(candidateAssignment.id, ca.id));

      return { ok: true };
    }),
});
