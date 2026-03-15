import { z } from "zod";

import { TRPCError } from "@trpc/server";
import { eq, desc, inArray, and } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { job, jobMatch, candidateProfile } from "~/server/db/schema";

export const jobRouter = createTRPCRouter({

  create: protectedProcedure
    // Form of the input
    .input(z.object({
      title: z.string().min(1),

      // Optinally
      description: z.string().optional(),
      requiredStacks: z.record(z.number().min(0)).refine(
        (obj) => Object.keys(obj).length > 0,
        "requiredStacks cannot be empty",
      ),
      matchThreshold: z.number().int().min(0).max(100).optional(),

      // Published or not
      isPublished: z.boolean().optional(),
    }))
    // Operation on the system
    .mutation(async ({ ctx, input }) => {
      // (Hackathon) treat any logged-in creator as HR for now
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
        .returning();

      if (!row) {
        throw new TRPCError({ 
          code: "INTERNAL_SERVER_ERROR", 
          message: "Failed to create job" 
        });
      }

      // Return the created job with all fields
      return {
        id: row.id,
        title: row.title,
        description: row.description,
        requiredStacks: row.requiredStacks,
        matchThreshold: row.matchThreshold,
        isPublished: row.isPublished,
        hrUserId: row.hrUserId,
        createdAt: row.createdAt,
      };
    }),

  // List all published jobs (with HR user info to distinguish different HRs)
  listPublished: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.job.findMany({
      where: (job, { eq }) => eq(job.isPublished, true),
      with: {
        hr: {
          columns: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: [desc(job.createdAt)],
    });
  }),

  // Delete a job (only by the creator)
  delete: protectedProcedure
    .input(z.object({ jobId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      // First, verify the job exists and belongs to the current user
      const existingJob = await ctx.db.query.job.findFirst({
        where: eq(job.id, input.jobId),
      });

      if (!existingJob) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Job not found",
        });
      }

      // Verify ownership
      if (existingJob.hrUserId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only delete your own jobs",
        });
      }

      // Delete the job (cascade will handle related records)
      await ctx.db.delete(job).where(eq(job.id, input.jobId));

      return { success: true };
    }),

  // Get candidates for a specific job
  // Allow any HR to view candidates for published jobs (to support multi-HR collaboration)
  getCandidates: protectedProcedure
    .input(z.object({ jobId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      // Verify the job exists and is published
      const existingJob = await ctx.db.query.job.findFirst({
        where: eq(job.id, input.jobId),
      });

      if (!existingJob) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Job not found",
        });
      }

      // Allow viewing candidates for published jobs (any HR can view)
      // Only restrict access to unpublished jobs
      if (!existingJob.isPublished) {
        // For unpublished jobs, only the owner can view
        if (existingJob.hrUserId !== ctx.session.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only view candidates for published jobs or your own unpublished jobs",
          });
        }
      }

      // Get all matches for this job with candidate and analysis info
      const matches = await ctx.db.query.jobMatch.findMany({
        where: eq(jobMatch.jobId, input.jobId),
        with: {
          candidate: {
            columns: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          analysis: {
            columns: {
              id: true,
              repoFullName: true,
              techStack: true,
              createdAt: true,
            },
          },
        },
        orderBy: [desc(jobMatch.score), desc(jobMatch.createdAt)],
      });

      // Get candidate profiles for additional info
      const candidateIds = matches.map((m) => m.candidateUserId);
      const profiles = candidateIds.length > 0
        ? await ctx.db.query.candidateProfile.findMany({
            where: (profile, { inArray }) => inArray(profile.userId, candidateIds),
          })
        : [];

      const profileMap = new Map(profiles.map((p) => [p.userId, p]));

      // Combine match data with candidate profile
      return matches.map((match) => ({
        matchId: match.id,
        candidateId: match.candidateUserId,
        repoFullName: match.repoFullName,
        status: match.status,
        score: match.score,
        rationale: match.rationale,
        createdAt: match.createdAt,
        candidate: {
          id: match.candidate.id,
          name: match.candidate.name,
          email: match.candidate.email,
          image: match.candidate.image,
          githubLogin: profileMap.get(match.candidateUserId)?.githubLogin,
          githubUrl: profileMap.get(match.candidateUserId)?.githubUrl,
        },
        analysis: match.analysis
          ? {
              id: match.analysis.id,
              repoFullName: match.analysis.repoFullName,
              techStack: match.analysis.techStack,
              createdAt: match.analysis.createdAt,
            }
          : null,
      }));
    }),

  // Get all candidates across all jobs for HR dashboard
  getAllCandidates: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Get all jobs created by this HR user
    const hrJobs = await ctx.db.query.job.findMany({
      where: eq(job.hrUserId, userId),
      columns: { id: true, title: true },
    });

    const jobIds = hrJobs.map((j) => j.id);

    if (jobIds.length === 0) {
      return {
        candidates: [],
        stats: {
          totalCandidates: 0,
          pendingCount: 0,
          avgMatchRate: 0,
        },
      };
    }

    // Get all matches for HR's jobs
    // Use select with explicit columns to avoid auto-joining relations
    const matches = await ctx.db
      .select({
        id: jobMatch.id,
        jobId: jobMatch.jobId,
        candidateUserId: jobMatch.candidateUserId,
        analysisId: jobMatch.analysisId,
        repoFullName: jobMatch.repoFullName,
        status: jobMatch.status,
        score: jobMatch.score,
        rationale: jobMatch.rationale,
        createdAt: jobMatch.createdAt,
        updatedAt: jobMatch.updatedAt,
      })
      .from(jobMatch)
      .where(inArray(jobMatch.jobId, jobIds))
      .orderBy(desc(jobMatch.score), desc(jobMatch.createdAt));

    // Fetch related data separately
    const matchIds = matches.map((m) => m.id);
    const analysisIds = matches.map((m) => m.analysisId).filter((id): id is number => id !== null);
    const candidateUserIds = matches.map((m) => m.candidateUserId);

    // Get jobs
    const jobsMap = new Map(hrJobs.map((j) => [j.id, j]));
    
    // Get candidates (users)
    const candidateUsers = await ctx.db.query.user.findMany({
      where: (user, { inArray }) => inArray(user.id, candidateUserIds),
      columns: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });
    const candidatesMap = new Map(candidateUsers.map((c) => [c.id, c]));

    // Get analyses
    const analyses = analysisIds.length > 0
      ? await ctx.db.query.repoAnalysis.findMany({
          where: (analysis, { inArray }) => inArray(analysis.id, analysisIds),
          columns: {
            id: true,
            repoFullName: true,
            techStack: true,
            createdAt: true,
          },
        })
      : [];
    const analysesMap = new Map(analyses.map((a) => [a.id, a]));

    // Get candidate profiles
    const profiles = candidateUserIds.length > 0
      ? await ctx.db.query.candidateProfile.findMany({
          where: (profile, { inArray }) => inArray(profile.userId, candidateUserIds),
        })
      : [];

    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    // Build match rows with related entities
    const matchItems = matches.map((match) => {
      const job = jobsMap.get(match.jobId);
      const candidate = candidatesMap.get(match.candidateUserId);
      const analysis = match.analysisId ? analysesMap.get(match.analysisId) : null;
      const profile = profileMap.get(match.candidateUserId);

      return {
        matchId: match.id,
        candidateId: match.candidateUserId,
        jobId: match.jobId,
        jobTitle: job?.title ?? "Unknown Job",
        score: match.score,
        rationale: match.rationale,
        createdAt: match.createdAt,
        repoFullName: match.repoFullName,
        status: match.status,
        candidate: candidate
          ? {
              id: candidate.id,
              name: candidate.name,
              email: candidate.email,
              image: candidate.image,
              githubLogin: profile?.githubLogin,
              githubUrl: profile?.githubUrl,
            }
          : {
              id: match.candidateUserId,
              name: "Unknown",
              email: null,
              image: null,
              githubLogin: profile?.githubLogin,
              githubUrl: profile?.githubUrl,
            },
        analysis: analysis
          ? {
              id: analysis.id,
              repoFullName: analysis.repoFullName,
              techStack: analysis.techStack,
              createdAt: analysis.createdAt,
            }
          : null,
      };
    });

    // Group by candidate (so the same candidate matched to multiple jobs doesn't look like duplicates)
    type MatchItem = (typeof matchItems)[number];
    const groupsMap = new Map<
      string,
      {
        candidateId: string;
        candidate: MatchItem["candidate"];
        bestScore: number;
        lastMatchedAt: Date;
        matches: Array<{
          matchId: number;
          jobId: number;
          jobTitle: string;
          score: number;
          createdAt: Date;
          repoFullName: string | null;
          status: string;
        }>;
      }
    >();

    for (const m of matchItems) {
      const key = m.candidateId;
      const existing = groupsMap.get(key);

      const repoFullName = m.repoFullName ?? m.analysis?.repoFullName ?? null;
      const row = {
        matchId: m.matchId,
        jobId: m.jobId,
        jobTitle: m.jobTitle,
        score: m.score,
        createdAt: m.createdAt,
        repoFullName,
        status: m.status,
      };

      if (!existing) {
        groupsMap.set(key, {
          candidateId: m.candidateId,
          candidate: m.candidate,
          bestScore: m.score,
          lastMatchedAt: m.createdAt,
          matches: [row],
        });
        continue;
      }

      existing.matches.push(row);
      if (m.score > existing.bestScore) existing.bestScore = m.score;
      if (m.createdAt > existing.lastMatchedAt) existing.lastMatchedAt = m.createdAt;
    }

    const candidateGroups = Array.from(groupsMap.values())
      .map((g) => {
        const matchesSorted = [...g.matches].sort((a, b) => {
          // highest score first, then latest
          if (b.score !== a.score) return b.score - a.score;
          return b.createdAt.getTime() - a.createdAt.getTime();
        });
        const best = matchesSorted[0];
        const statusPriority: Record<
          string,
          number
        > = {
          completed: 0,
          flagged: 1,
          in_progress: 2,
          not_started: 3,
          waitlisted: 4,
          proceed: 5,
          rejected: 6,
          expired: 7,
        };

        const aggregateStatus =
          matchesSorted
            .map((m) => m.status)
            .sort((a, b) => (statusPriority[a] ?? 999) - (statusPriority[b] ?? 999))[0] ??
          "completed";

        return {
          candidateId: g.candidateId,
          candidate: g.candidate,
          bestScore: g.bestScore,
          lastMatchedAt: g.lastMatchedAt,
          jobCount: g.matches.length,
          status: aggregateStatus,
          bestJob: best
            ? {
                jobId: best.jobId,
                jobTitle: best.jobTitle,
                score: best.score,
                repoFullName: best.repoFullName,
                status: best.status,
              }
            : null,
          matches: matchesSorted,
        };
      })
      .sort((a, b) => {
        // Status priority first, then bestScore desc, then latest
        const statusPriority: Record<string, number> = {
          completed: 0,
          flagged: 1,
          in_progress: 2,
          not_started: 3,
          waitlisted: 4,
          proceed: 5,
          rejected: 6,
          expired: 7,
        };
        const as = statusPriority[a.status] ?? 999;
        const bs = statusPriority[b.status] ?? 999;
        if (as !== bs) return as - bs;
        if (b.bestScore !== a.bestScore) return b.bestScore - a.bestScore;
        return b.lastMatchedAt.getTime() - a.lastMatchedAt.getTime();
      });

    // Stats (based on unique candidates)
    const totalCandidates = candidateGroups.length;
    const pendingCount = candidateGroups.filter((c) => c.bestScore < 70).length;
    const avgMatchRate =
      totalCandidates > 0
        ? Math.round(
            candidateGroups.reduce((sum, c) => sum + c.bestScore, 0) /
              totalCandidates,
          )
        : 0;

    return {
      candidates: candidateGroups,
      stats: {
        totalCandidates,
        pendingCount,
        avgMatchRate,
      },
    };
  }),
});
