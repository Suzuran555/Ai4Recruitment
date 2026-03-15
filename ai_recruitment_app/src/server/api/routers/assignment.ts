import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { candidateProcedure, createTRPCRouter, hrProcedure } from "../trpc";
import { assignment, candidateAssignment, job } from "~/server/db/schema";
import { processAIChat, generateEvaluationReport } from "~/server/ai/evaluator";
import { fetchMultipleFiles } from "~/server/github/raw-fetcher";
import type { ChatMessage, TodoState, Subtask } from "~/server/ai/types";

export const assignmentRouter = createTRPCRouter({
  /**
   * Get assignment template by jobId.
   * - HR: can view for owned jobs
   * - Candidate: can view only for published jobs
   */
  getByJob: candidateProcedure
    .input(z.object({ jobId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const j = await ctx.db.query.job.findFirst({
        where: eq(job.id, input.jobId),
      });
      if (!j) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      }
      if (!j.isPublished) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Job not published" });
      }
      const a = await ctx.db.query.assignment.findFirst({
        where: eq(assignment.jobId, input.jobId),
      });
      return a ?? null;
    }),

  /**
   * HR-only: upsert assignment for owned job.
   */
  upsertForJob: hrProcedure
    .input(
      z.object({
        jobId: z.number().int().positive(),
        repoTemplateUrl: z.string().url(),
        instructions: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const j = await ctx.db.query.job.findFirst({
        where: eq(job.id, input.jobId),
        columns: { id: true, hrUserId: true },
      });
      if (!j) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      }
      if (j.hrUserId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Job not owned by this HR" });
      }

      const existing = await ctx.db.query.assignment.findFirst({
        where: eq(assignment.jobId, input.jobId),
      });
      if (!existing) {
        const [row] = await ctx.db
          .insert(assignment)
          .values({
            jobId: input.jobId,
            repoTemplateUrl: input.repoTemplateUrl,
            instructions: input.instructions,
          })
          .returning({ id: assignment.id });
        return { ok: true, id: row?.id };
      }

      await ctx.db
        .update(assignment)
        .set({
          repoTemplateUrl: input.repoTemplateUrl,
          instructions: input.instructions,
        })
        .where(eq(assignment.id, existing.id));
      return { ok: true, id: existing.id };
    }),

  /**
   * Candidate-only: claim assignment for a job (creates candidate_assignment).
   */
  claim: candidateProcedure
    .input(
      z.object({
        jobId: z.number().int().positive(),
        repoUrl: z.string().url().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const j = await ctx.db.query.job.findFirst({
        where: eq(job.id, input.jobId),
      });
      if (!j) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      }
      if (!j.isPublished) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Job not published" });
      }

      const a = await ctx.db.query.assignment.findFirst({
        where: eq(assignment.jobId, input.jobId),
      });
      if (!a) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Assignment not found for this job" });
      }

      const existing = await ctx.db.query.candidateAssignment.findFirst({
        where: and(
          eq(candidateAssignment.assignmentId, a.id),
          eq(candidateAssignment.candidateUserId, ctx.session.user.id),
        ),
      });
      if (existing) {
        return { ok: true, candidateAssignmentId: existing.id };
      }

      const now = new Date().toISOString();
      const [row] = await ctx.db
        .insert(candidateAssignment)
        .values({
          assignmentId: a.id,
          jobId: input.jobId,
          candidateUserId: ctx.session.user.id,
          repoUrl: input.repoUrl ?? null,
          submissionBranch: "user-submission",
          status: "claimed",
          decisionStatus: "pending",
          todo: { mainTask: "", subtasks: [], completedCount: 0 },
          messages: [],
          timeline: [
            {
              id: `event_${Date.now()}`,
              title: "Assignment claimed",
              description: `Claimed assignment for job ${input.jobId}`,
              timestamp: now,
              is_completed: true,
            },
          ],
        })
        .returning({ id: candidateAssignment.id });

      if (!row) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to claim assignment" });
      }

      return { ok: true, candidateAssignmentId: row.id };
    }),

  /**
   * Get candidate assignment details (including chat, todo, stats)
   */
  getAssignment: candidateProcedure
    .input(z.object({ candidateAssignmentId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const ca = await ctx.db.query.candidateAssignment.findFirst({
        where: eq(candidateAssignment.id, input.candidateAssignmentId),
      });

      if (!ca) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Candidate assignment not found",
        });
      }

      // Verify ownership (hackathon mode: allow if logged in)
      if (ca.candidateUserId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not your assignment",
        });
      }

      return ca;
    }),

  /**
   * Send message in AI-PM chat
   */
  sendMessage: candidateProcedure
    .input(
      z.object({
        candidateAssignmentId: z.number().int().positive(),
        message: z.string().min(1).max(2000),
        filePaths: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      console.log("[sendMessage] Starting with input:", {
        assignmentId: input.candidateAssignmentId,
        messageLength: input.message.length,
        hasFilePaths: !!input.filePaths,
      });

      const ca = await ctx.db.query.candidateAssignment.findFirst({
        where: eq(candidateAssignment.id, input.candidateAssignmentId),
      });

      if (!ca) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Candidate assignment not found",
        });
      }

      if (ca.candidateUserId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not your assignment",
        });
      }

      if (ca.status === "completed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Evaluation already completed",
        });
      }

      const messages = (ca.messages ?? []) as ChatMessage[];
      const todoState = (ca.todo ?? {
        mainTask: "",
        subtasks: [],
        completedCount: 0,
      }) as TodoState;

      console.log("[sendMessage] Current state:", {
        messageCount: messages.length,
        todoMainTask: todoState.mainTask,
        subtaskCount: todoState.subtasks.length,
      });

      // Add candidate message
      const candidateMsg: ChatMessage = {
        id: `msg_${Date.now()}_candidate`,
        sender: "candidate",
        content: input.message,
        timestamp: new Date().toISOString(),
      };
      messages.push(candidateMsg);

      // Fetch code files if provided
      let codeFiles: Record<string, string> | undefined;
      if (input.filePaths && input.filePaths.length > 0 && ca.repoUrl) {
        console.log("[sendMessage] Fetching files:", input.filePaths);
        try {
          codeFiles = await fetchMultipleFiles(ca.repoUrl, input.filePaths);
          console.log("[sendMessage] Fetched files:", Object.keys(codeFiles));
        } catch (error) {
          console.error("[sendMessage] Failed to fetch files:", error);
          // Continue without files
        }
      }

      // Get AI response
      console.log("[sendMessage] Calling AI...");
      let aiResponse;
      try {
        aiResponse = await processAIChat({
          messages,
          todoState,
          candidateMessage: input.message,
          codeFiles,
        });
        console.log("[sendMessage] AI response:", {
          action: aiResponse.action,
          hasSubtasks: !!aiResponse.subtasks,
          subtaskCount: aiResponse.subtasks?.length,
          terminate: aiResponse.terminate,
        });
      } catch (error) {
        console.error("[sendMessage] AI processing error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to get AI response",
        });
      }

      // Add AI message
      const aiMsg: ChatMessage = {
        id: `msg_${Date.now()}_ai`,
        sender: "ai",
        content: aiResponse.message,
        timestamp: new Date().toISOString(),
        metadata: {
          action: aiResponse.action,
          subtasksGenerated: aiResponse.subtasks?.length,
          filesReviewed: input.filePaths,
        },
      };
      messages.push(aiMsg);

      // Update todo state based on AI response
      if (aiResponse.action === "issue_task" && !todoState.mainTask) {
        todoState.mainTask = aiResponse.message;
      }

      if (aiResponse.action === "generate_subtasks" && aiResponse.subtasks) {
        const newSubtasks: Subtask[] = aiResponse.subtasks.map((st, idx) => ({
          id: `subtask_${Date.now()}_${idx}`,
          title: st.title,
          description: st.description,
          status: "pending",
        }));
        todoState.subtasks.push(...newSubtasks);
      }

      // Update status to in_progress if this is first message
      const newStatus = messages.length <= 2 ? "in_progress" : ca.status;

      // Add timeline events
      const timeline = (ca.timeline ?? []) as any[];
      if (aiResponse.action === "issue_task") {
        timeline.push({
          id: `event_${Date.now()}`,
          title: "Main task issued",
          description: "AI-PM assigned the main task",
          timestamp: new Date().toISOString(),
          is_completed: true,
        });
      }
      if (aiResponse.action === "generate_subtasks") {
        timeline.push({
          id: `event_${Date.now()}`,
          title: `Generated ${aiResponse.subtasks?.length ?? 0} subtasks`,
          description: "AI-PM created new subtasks based on code review",
          timestamp: new Date().toISOString(),
          is_completed: true,
        });
      }

      // Update database
      console.log("[sendMessage] Updating database...");
      await ctx.db
        .update(candidateAssignment)
        .set({
          messages,
          todo: todoState,
          status: newStatus,
          timeline,
        })
        .where(eq(candidateAssignment.id, input.candidateAssignmentId));

      const result = {
        ok: true,
        aiMessage: aiMsg,
        shouldTerminate: aiResponse.terminate ?? false,
      };
      console.log("[sendMessage] Success! Returning:", result);
      return result;
    }),

  /**
   * Complete evaluation and generate final report
   */
  completeEvaluation: candidateProcedure
    .input(
      z.object({
        candidateAssignmentId: z.number().int().positive(),
        finalFilePaths: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ca = await ctx.db.query.candidateAssignment.findFirst({
        where: eq(candidateAssignment.id, input.candidateAssignmentId),
      });

      if (!ca) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Candidate assignment not found",
        });
      }

      if (ca.candidateUserId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not your assignment",
        });
      }

      if (ca.status === "completed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Evaluation already completed",
        });
      }

      const messages = (ca.messages ?? []) as ChatMessage[];
      const todoState = (ca.todo ?? {
        mainTask: "",
        subtasks: [],
        completedCount: 0,
      }) as TodoState;

      // Fetch final code files if provided
      let finalCodeFiles: Record<string, string> | undefined;
      if (input.finalFilePaths && input.finalFilePaths.length > 0 && ca.repoUrl) {
        try {
          finalCodeFiles = await fetchMultipleFiles(ca.repoUrl, input.finalFilePaths);
        } catch (error) {
          console.error("Failed to fetch final files:", error);
        }
      }

      // Generate evaluation report
      const report = await generateEvaluationReport({
        messages,
        todoState,
        finalCodeFiles,
      });

      // Map hiring decision to decision status
      let decisionStatus = ca.decisionStatus;
      if (report.hiringDecision === "pass") {
        decisionStatus = "proceed";
      } else if (report.hiringDecision === "fail") {
        decisionStatus = "reject";
      }
      // "conditional" keeps as "pending"

      // Add completion timeline event
      const timeline = (ca.timeline ?? []) as any[];
      timeline.push({
        id: `event_${Date.now()}`,
        title: "Evaluation completed",
        description: `Technical: ${report.technicalScore}/100, Communication: ${report.communicationScore}/100`,
        timestamp: new Date().toISOString(),
        is_completed: true,
      });

      // Update database
      await ctx.db
        .update(candidateAssignment)
        .set({
          status: "completed",
          decisionStatus,
          capabilityStats: report,
          timeline,
        })
        .where(eq(candidateAssignment.id, input.candidateAssignmentId));

      return {
        ok: true,
        report,
      };
    }),
});