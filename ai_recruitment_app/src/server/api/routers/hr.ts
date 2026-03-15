import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, hrProcedure } from "../trpc";
import { candidateAssignment, candidateProfile, job, jobMatch, repoAnalysis } from "~/server/db/schema";

async function assertJobOwnedByHr(
  ctx: { db: typeof import("~/server/db").db; session: { user: { id: string } } },
  jobId: number,
) {
  const existing = await ctx.db.query.job.findFirst({
    where: eq(job.id, jobId),
    columns: { id: true, hrUserId: true },
  });

  if (!existing) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
  }

  if (existing.hrUserId !== ctx.session.user.id) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Job is not owned by this HR" });
  }

  return existing;
}

export const hrRouter = createTRPCRouter({
  /**
   * HR-only: Create a job posting.
   *
   * NOTE: This replaces the old `job.create`. Frontend should call `api.hr.create`.
   */
  create: hrProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        requiredStacks: z
          .record(z.number().min(0))
          .refine((obj) => Object.keys(obj).length > 0, "requiredStacks cannot be empty"),
        matchThreshold: z.number().int().min(0).max(100).optional(),
        isPublished: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(job)
        .values({
          hrUserId: ctx.session.user.id,
          title: input.title,
          description: input.description,
          requiredStacks: input.requiredStacks,
          matchThreshold: input.matchThreshold ?? 50,
          isPublished: input.isPublished ?? false,
        })
        .returning({ id: job.id });

      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create job",
        });
      }

      return row;
    }),

  /**
   * HR-only: List jobs owned by current HR user (includes unpublished).
   */
  listMine: hrProcedure.query(async ({ ctx }) => {
    return ctx.db.query.job.findMany({
      where: eq(job.hrUserId, ctx.session.user.id),
      orderBy: [desc(job.createdAt)],
    });
  }),

  /**
   * HR-only: Get job by id (ownership enforced).
   */
  getById: hrProcedure
    .input(z.object({ jobId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      await assertJobOwnedByHr(ctx, input.jobId);
      const full = await ctx.db.query.job.findFirst({
        where: eq(job.id, input.jobId),
      });
      if (!full) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      }
      return full;
    }),

  /**
   * HR-only: Update job fields (ownership enforced).
   */
  update: hrProcedure
    .input(
      z.object({
        jobId: z.number().int().positive(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        requiredStacks: z.record(z.number().min(0)).optional(),
        matchThreshold: z.number().int().min(0).max(100).optional(),
        isPublished: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertJobOwnedByHr(ctx, input.jobId);

      const updateValues: Record<string, unknown> = {};
      if (input.title !== undefined) {
        updateValues.title = input.title;
      }
      if (input.description !== undefined) {
        updateValues.description = input.description;
      }
      if (input.requiredStacks !== undefined) {
        updateValues.requiredStacks = input.requiredStacks;
      }
      if (input.matchThreshold !== undefined) {
        updateValues.matchThreshold = input.matchThreshold;
      }
      if (input.isPublished !== undefined) {
        updateValues.isPublished = input.isPublished;
      }

      if (Object.keys(updateValues).length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No fields to update" });
      }

      await ctx.db.update(job).set(updateValues).where(eq(job.id, input.jobId));
      return { ok: true };
    }),

  /**
   * HR-only: Publish/unpublish (ownership enforced).
   */
  publish: hrProcedure
    .input(z.object({ jobId: z.number().int().positive(), isPublished: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await assertJobOwnedByHr(ctx, input.jobId);
      await ctx.db.update(job).set({ isPublished: input.isPublished }).where(eq(job.id, input.jobId));
      return { ok: true };
    }),

  /**
   * HR-only: Delete job (ownership enforced).
   */
  delete: hrProcedure
    .input(z.object({ jobId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await assertJobOwnedByHr(ctx, input.jobId);
      await ctx.db.delete(job).where(and(eq(job.id, input.jobId), eq(job.hrUserId, ctx.session.user.id)));
      return { ok: true };
    }),

  /**
   * HR-only: Get a candidate's performance in a specific job.
   * Equivalent to: GET /hr/job/:jobId/:candidateId
   *
   * Returns:
   * - candidate profile
   * - latest analysis + jobMatch for that analysis (if exists)
   * - candidate assignment progress (if claimed)
   */
  getCandidateForJob: hrProcedure
    .input(
      z.object({
        jobId: z.number().int().positive(),
        candidateUserId: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      await assertJobOwnedByHr(ctx, input.jobId);

      const profile = await ctx.db.query.candidateProfile.findFirst({
        where: eq(candidateProfile.userId, input.candidateUserId),
      });

      const latestAnalysis = await ctx.db.query.repoAnalysis.findFirst({
        where: eq(repoAnalysis.candidateUserId, input.candidateUserId),
        orderBy: (ra, { desc }) => [desc(ra.createdAt)],
      });

      const match =
        latestAnalysis
          ? await ctx.db.query.jobMatch.findFirst({
              where: and(
                eq(jobMatch.jobId, input.jobId),
                eq(jobMatch.candidateUserId, input.candidateUserId),
                eq(jobMatch.analysisId, latestAnalysis.id),
              ),
              with: {
                job: true,
                analysis: true,
              },
            })
          : null;

      const claimed = await ctx.db.query.candidateAssignment.findFirst({
        where: and(
          eq(candidateAssignment.jobId, input.jobId),
          eq(candidateAssignment.candidateUserId, input.candidateUserId),
        ),
        with: {
          assignment: true,
        },
      });

      return {
        candidateProfile: profile ?? null,
        latestAnalysis: latestAnalysis ?? null,
        jobMatch: match ?? null,
        candidateAssignment: claimed ?? null,
      };
    }),
});


