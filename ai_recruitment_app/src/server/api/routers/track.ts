import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { candidateProcedure, createTRPCRouter } from "../trpc";
import {
  candidateTrackSelection,
  job,
  repoAnalysis,
} from "~/server/db/schema";
import {
  deriveRepoSkills,
  generateTrackOptions,
  recommendDefaultTrack,
  scoreJobForTrack,
  type TrackKey,
} from "~/server/scoring/track-engine";

const trackKeyEnum = z.enum(["specialist", "expansion", "pragmatist"]);

export const trackRouter = createTRPCRouter({
  getOptions: candidateProcedure
    .input(z.object({ analysisId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const analysis = await ctx.db.query.repoAnalysis.findFirst({
        where: and(
          eq(repoAnalysis.id, input.analysisId),
          eq(repoAnalysis.candidateUserId, ctx.session.user.id),
        ),
      });
      if (!analysis) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Analysis not found" });
      }

      const selection = await ctx.db.query.candidateTrackSelection.findFirst({
        where: and(
          eq(candidateTrackSelection.candidateUserId, ctx.session.user.id),
          eq(candidateTrackSelection.analysisId, input.analysisId),
        ),
      });

      const domainTags = (analysis.domainTags ?? []) as string[];
      const recommendedTrackKey = recommendDefaultTrack({
        techStack: analysis.techStack,
        signals: analysis.signals,
        domainTags,
      });

      // Precompute Top 3 per track so the UI can switch instantly (no network round-trip).
      const jobs = await ctx.db.query.job.findMany({
        where: eq(job.isPublished, true),
        with: { assignments: true },
      });
      const repoSkills = deriveRepoSkills(analysis.techStack);

      const computeTop3 = (trackKey: TrackKey) => {
        const scored = jobs.map((j) => {
          const assignment = Array.isArray(j.assignments)
            ? j.assignments[0] ?? null
            : null;
          return scoreJobForTrack({
            trackKey,
            job: {
              id: j.id,
              title: j.title,
              description: j.description,
              requiredStacks: j.requiredStacks,
            },
            assignment: assignment
              ? {
                  id: assignment.id,
                  repoTemplateUrl: assignment.repoTemplateUrl,
                  instructions: assignment.instructions,
                }
              : null,
            repoSkills,
            signals: analysis.signals,
            domainTags,
          });
        });
        return scored.sort((a, b) => b.score - a.score).slice(0, 3);
      };

      return {
        analysisId: analysis.id,
        repoFullName: analysis.repoFullName,
        domainTags,
        techStack: analysis.techStack,
        recommendedTrackKey,
        recommendationsByTrack: {
          specialist: computeTop3("specialist"),
          expansion: computeTop3("expansion"),
          pragmatist: computeTop3("pragmatist"),
        },
        options: generateTrackOptions({
          techStack: analysis.techStack,
          signals: analysis.signals,
          domainTags,
        }),
        selectedTrack: selection?.track ?? null,
      };
    }),

  select: candidateProcedure
    .input(z.object({ analysisId: z.number().int(), trackKey: trackKeyEnum }))
    .mutation(async ({ ctx, input }) => {
      const analysis = await ctx.db.query.repoAnalysis.findFirst({
        where: and(
          eq(repoAnalysis.id, input.analysisId),
          eq(repoAnalysis.candidateUserId, ctx.session.user.id),
        ),
      });
      if (!analysis) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Analysis not found" });
      }

      const trackKey = input.trackKey as TrackKey;

      await ctx.db
        .insert(candidateTrackSelection)
        .values({
          candidateUserId: ctx.session.user.id,
          analysisId: analysis.id,
          track: trackKey,
        })
        .onConflictDoUpdate({
          target: [
            candidateTrackSelection.candidateUserId,
            candidateTrackSelection.analysisId,
          ],
          set: { track: trackKey, updatedAt: new Date() },
        });

      return { ok: true, analysisId: analysis.id, selectedTrack: trackKey };
    }),

  selectAndRecommend: candidateProcedure
    .input(
      z.object({
        analysisId: z.number().int(),
        trackKey: trackKeyEnum,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const analysis = await ctx.db.query.repoAnalysis.findFirst({
        where: and(
          eq(repoAnalysis.id, input.analysisId),
          eq(repoAnalysis.candidateUserId, ctx.session.user.id),
        ),
      });
      if (!analysis) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Analysis not found" });
      }

      const trackKey = input.trackKey as TrackKey;

      // Persist selection (upsert by unique index)
      await ctx.db
        .insert(candidateTrackSelection)
        .values({
          candidateUserId: ctx.session.user.id,
          analysisId: analysis.id,
          track: trackKey,
        })
        .onConflictDoUpdate({
          target: [
            candidateTrackSelection.candidateUserId,
            candidateTrackSelection.analysisId,
          ],
          set: { track: trackKey, updatedAt: new Date() },
        });

      // Recommend published jobs + their assignment template (if any)
      const jobs = await ctx.db.query.job.findMany({
        where: eq(job.isPublished, true),
        with: { assignments: true },
      });

      const repoSkills = deriveRepoSkills(analysis.techStack);
      const domainTags = (analysis.domainTags ?? []) as string[];

      const scored = jobs.map((j) => {
        const assignment = Array.isArray(j.assignments) ? j.assignments[0] ?? null : null;
        return scoreJobForTrack({
          trackKey,
          job: {
            id: j.id,
            title: j.title,
            description: j.description,
            requiredStacks: j.requiredStacks,
          },
          assignment: assignment
            ? {
                id: assignment.id,
                repoTemplateUrl: assignment.repoTemplateUrl,
                instructions: assignment.instructions,
              }
            : null,
          repoSkills,
          signals: analysis.signals,
          domainTags,
        });
      });

      const top3 = scored
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      return {
        ok: true,
        analysisId: analysis.id,
        selectedTrack: trackKey,
        recommendations: top3,
      };
    }),
});


