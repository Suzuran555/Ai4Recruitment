import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";

import { candidateProcedure, createTRPCRouter } from "../trpc";
import { job, jobMatch, repoAnalysis } from "~/server/db/schema";
import { computeDeterministicJobMatch } from "~/server/scoring/match-engine";
import { deriveRepoSkillEvidenceMap } from "~/server/scoring/track-engine";

export const matchRouter = createTRPCRouter({
  /**
   * Phase 0: Compute matches for a given analysisId.
   * - Verifies analysis belongs to current user
   * - Matches against ALL published jobs
   * - Uses deterministic stub scoring (replace later with matchEngine)
   * - Upserts into job_match to avoid duplicates
   */
  compute: candidateProcedure
    .input(z.object({ analysisId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // 1) Check analysis exists + belongs to this user
      const analysis = await ctx.db.query.repoAnalysis.findFirst({
        where: and(
          eq(repoAnalysis.id, input.analysisId),
          eq(repoAnalysis.candidateUserId, userId),
        ),
      });

      if (!analysis) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Analysis not found" });
      }

      // 2) Get all published jobs
      const jobs = await ctx.db.query.job.findMany({
        where: eq(job.isPublished, true),
      });

      // 3) Phase 0 scoring (stub)
      let upserted = 0;
      const repoFullName = analysis.repoFullName;

      for (const j of jobs) {
        // Convert { languages, frameworks, tooling } into the RepoSkillMap that match-engine expects.
        const repoSkills = deriveRepoSkillEvidenceMap(analysis.techStack);
        const result = computeDeterministicJobMatch({
          requiredStacks: (j.requiredStacks as Record<string, number>) ?? {},
          repoSkills,
        });
        const score = result.score;
        const rationale = {
          version: "match-rationale-v1",
          coverage: result.coverage,
          breakdown: result.breakdown,
          note: "Deterministic scoring (rule-based) + coverage factor",
        };

        // Upsert by (job, candidate, repoFullName):
        // - same repo re-apply updates the same row
        // - different repo creates a new row (multi-repo applications)
        await ctx.db
          .insert(jobMatch)
          .values({
            jobId: j.id,
            candidateUserId: userId,
            analysisId: analysis.id,
            repoFullName,
            status: "completed",
            score,
            rationale,
          })
          .onConflictDoUpdate({
            target: [jobMatch.jobId, jobMatch.candidateUserId, jobMatch.repoFullName],
            set: {
              analysisId: analysis.id,
              status: "completed",
              score,
              rationale,
              createdAt: new Date(),
            },
          });

        upserted++;
      }

      return { ok: true, jobCount: jobs.length, upserted };
    }),

  /**
   * Phase 0: List current user's matches (includes job + analysis via relations).
   */
  listMine: candidateProcedure.query(async ({ ctx }) => {
    return ctx.db.query.jobMatch.findMany({
      where: eq(jobMatch.candidateUserId, ctx.session.user.id),
      with: {
        job: true,
        analysis: true,
      },
      orderBy: [desc(jobMatch.createdAt)],
    });
  }),
});
