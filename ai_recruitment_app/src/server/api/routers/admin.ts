import { TRPCError } from "@trpc/server";

import { createTRPCRouter, hrProcedure } from "../trpc";
import {
  assignment,
  candidateAssignment,
  candidateProfile,
  job,
  jobMatch,
  posts,
  repoAnalysis,
} from "~/server/db/schema";

export const adminRouter = createTRPCRouter({
  /**
   * DEV-ONLY: Clear business data (do not drop schema).
   * Equivalent to DELETE /clear (spec).
   *
   * Safety:
   * - Only HR role
   * - Only allowed when NODE_ENV !== "production"
   */
  clear: hrProcedure.mutation(async ({ ctx }) => {
    if (process.env.NODE_ENV === "production") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Not allowed in production" });
    }

    // Delete business tables only (keep auth tables user/session/account/verification).
    // Order matters due to FK constraints.
    await ctx.db.delete(candidateAssignment);
    await ctx.db.delete(assignment);
    await ctx.db.delete(jobMatch);
    await ctx.db.delete(repoAnalysis);
    await ctx.db.delete(candidateProfile);
    await ctx.db.delete(job);
    await ctx.db.delete(posts);

    return { ok: true };
  }),
});


