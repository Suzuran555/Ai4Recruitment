import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, eq, sql } from "drizzle-orm";

import { createTRPCRouter, candidateProcedure, hrProcedure } from "../trpc";
import { job, jobMatch } from "~/server/db/schema";

const statusEnum = z.enum([
  "not_started",
  "in_progress",
  "completed",
  "flagged",
  "proceed",
  "rejected",
  "waitlisted",
  "expired",
]);

export const jobMatchRouter = createTRPCRouter({
  /**
   * Candidate starts an assessment for a given repo.
   * We create/update application rows (job_match) for ALL published jobs with status=in_progress.
   *
   * This is what makes status actually change in the DB when the candidate starts the flow.
   */
  initForRepo: candidateProcedure
    .input(z.object({ repoFullName: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      // #region agent log (hypothesis B: failing procedure path is initForRepo)
      fetch(
        "http://127.0.0.1:7244/ingest/8ef8dc20-215a-4ec2-b756-742be3be6758",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "B",
            location: "src/server/api/routers/jobMatch.ts:initForRepo:entry",
            message: "initForRepo called",
            data: { repoFullNameLen: input.repoFullName.length },
            timestamp: Date.now(),
          }),
        },
      ).catch(() => {});
      // #endregion

      const jobs = await ctx.db.query.job.findMany({
        where: eq(job.isPublished, true),
        columns: { id: true },
      });

      let upserted = 0;
      for (const j of jobs) {
        try {
          await ctx.db
            .insert(jobMatch)
            .values({
              jobId: j.id,
              candidateUserId: ctx.session.user.id,
              repoFullName: input.repoFullName,
              analysisId: null,
              score: 0,
              rationale: null,
              status: "in_progress",
            })
            .onConflictDoUpdate({
              target: [
                jobMatch.jobId,
                jobMatch.candidateUserId,
                jobMatch.repoFullName,
              ],
              set: {
                // Don't override final HR decisions if they already exist.
                status: sql`case
                  when ${jobMatch.status} in ('proceed','rejected','waitlisted') then ${jobMatch.status}
                  else 'in_progress'
                end`,
                createdAt: new Date(),
              },
            });
        } catch (e: any) {
          // #region agent log (hypothesis A: DB missing status column / migration not applied)
          fetch(
            "http://127.0.0.1:7244/ingest/8ef8dc20-215a-4ec2-b756-742be3be6758",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sessionId: "debug-session",
                runId: "run1",
                hypothesisId: "A",
                location:
                  "src/server/api/routers/jobMatch.ts:initForRepo:upsert:error",
                message: "jobMatch upsert failed",
                data: {
                  jobId: j.id,
                  errorMessage: String(e?.message ?? e ?? "unknown"),
                  errorCode: (e as any)?.code ?? null,
                },
                timestamp: Date.now(),
              }),
            },
          ).catch(() => {});
          // #endregion
          throw e;
        }
        upserted++;
      }

      return { ok: true, jobCount: jobs.length, upserted };
    }),

  /**
   * HR sets status on a specific application row.
   * Supports all application statuses.
   * Allow any HR to update status for published jobs (to support multi-HR collaboration).
   */
  setStatus: hrProcedure
    .input(
      z.object({
        matchId: z.number().int(),
        status: statusEnum,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const match = await ctx.db.query.jobMatch.findFirst({
        where: eq(jobMatch.id, input.matchId),
      });

      if (!match)
        throw new TRPCError({ code: "NOT_FOUND", message: "Match not found" });

      const owningJob = await ctx.db.query.job.findFirst({
        where: eq(job.id, match.jobId),
        columns: { hrUserId: true, isPublished: true },
      });
      if (!owningJob)
        throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      
      // Allow any HR to update status for published jobs
      // Only restrict access to unpublished jobs (owner only)
      if (!owningJob.isPublished) {
        if (owningJob.hrUserId !== ctx.session.user.id) {
          throw new TRPCError({ 
            code: "FORBIDDEN", 
            message: "You can only update status for published jobs or your own unpublished jobs" 
          });
        }
      }

      await ctx.db
        .update(jobMatch)
        .set({ status: input.status })
        .where(eq(jobMatch.id, input.matchId));

      return { ok: true };
    }),

  /**
   * HR deletes an application row (removes candidate from this job pipeline).
   *
   * Note: This does NOT delete the candidate user account; it only removes the
   * specific application (job_match) row.
   */
  delete: hrProcedure
    .input(z.object({ matchId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const match = await ctx.db.query.jobMatch.findFirst({
        where: eq(jobMatch.id, input.matchId),
      });
      if (!match)
        throw new TRPCError({ code: "NOT_FOUND", message: "Match not found" });

      await ctx.db.delete(jobMatch).where(eq(jobMatch.id, input.matchId));
      return { ok: true };
    }),

  /**
   * HR (MVP) marks an application as flagged.
   */
  markFlagged: hrProcedure
    .input(z.object({ matchId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const match = await ctx.db.query.jobMatch.findFirst({
        where: eq(jobMatch.id, input.matchId),
      });
      if (!match)
        throw new TRPCError({ code: "NOT_FOUND", message: "Match not found" });

      const owningJob = await ctx.db.query.job.findFirst({
        where: eq(job.id, match.jobId),
        columns: { hrUserId: true },
      });
      if (!owningJob)
        throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      if (owningJob.hrUserId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your job" });
      }

      await ctx.db
        .update(jobMatch)
        .set({ status: "flagged" })
        .where(eq(jobMatch.id, input.matchId));

      return { ok: true };
    }),

  /**
   * Candidate marks progress on a specific (job, repo) application row.
   * These are optional in current UI but enable the workflow model.
   */
  markProgress: candidateProcedure
    .input(
      z.object({
        jobId: z.number().int(),
        repoFullName: z.string().min(1),
        status: statusEnum,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const allowed = new Set([
        "not_started",
        "in_progress",
        "completed",
      ] as const);
      if (!allowed.has(input.status as any)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid candidate status",
        });
      }

      const [row] = await ctx.db
        .update(jobMatch)
        .set({ status: input.status })
        .where(
          and(
            eq(jobMatch.jobId, input.jobId),
            eq(jobMatch.candidateUserId, ctx.session.user.id),
            eq(jobMatch.repoFullName, input.repoFullName),
          ),
        )
        .returning({ id: jobMatch.id });

      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Application not found",
        });
      }

      return { ok: true };
    }),
});
