import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";

import { env } from "~/env";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a HTTP request (e.g. when you make requests from Client Components).
 */
const createContext = async (req: NextRequest) => {
  return createTRPCContext({
    headers: req.headers,
  });
};

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext(req),
    onError:
      env.NODE_ENV === "development"
        ? ({ path, error }) => {
            // #region agent log (hypothesis B: which procedure triggers it / what error)
            fetch(
              "http://127.0.0.1:7244/ingest/8ef8dc20-215a-4ec2-b756-742be3be6758",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  sessionId: "debug-session",
                  runId: "run1",
                  hypothesisId: "B",
                  location: "src/app/api/trpc/[trpc]/route.ts:onError",
                  message: "tRPC onError",
                  data: {
                    path: path ?? null,
                    referer: req.headers.get("referer") ?? null,
                    message: error?.message ?? null,
                    code: (error as any)?.code ?? null,
                    cause: String(
                      (error as any)?.cause?.message ??
                        (error as any)?.cause ??
                        "",
                    ),
                  },
                  timestamp: Date.now(),
                }),
              },
            ).catch(() => {});
            // #endregion
            console.error(
              `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
            );
          }
        : undefined,
  });

export { handler as GET, handler as POST };
