import { postRouter } from "~/server/api/routers/post";
import { jobRouter } from "~/server/api/routers/job";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

import { candidateRouter } from "~/server/api/routers/candidate";
import { analysisRouter } from "~/server/api/routers/analysis";
import { matchRouter } from "~/server/api/routers/match";
import { jobMatchRouter } from "~/server/api/routers/jobMatch";
import { hrRouter } from "~/server/api/routers/hr";
import { githubRouter } from "~/server/api/routers/github";
import { trackRouter } from "~/server/api/routers/track";
import { assignmentRouter } from "~/server/api/routers/assignment";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  job: jobRouter,
  hr: hrRouter,
  candidate: candidateRouter,
  analysis: analysisRouter,
  match: matchRouter,
  jobMatch: jobMatchRouter,
  github: githubRouter,
  track: trackRouter,
  assignment: assignmentRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
