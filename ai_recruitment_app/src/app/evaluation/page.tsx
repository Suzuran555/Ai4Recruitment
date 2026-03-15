import { SocialAuthCard } from "~/components/auth/social-auth-card";
import { getSession } from "~/server/better-auth/server";
import EvaluationClientPage from "./evaluation-client";
import { headers } from "next/headers";
import { createCaller } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";
import { buildEvaluationPageModel } from "~/lib/backend-view-models";

export default async function EvaluationPage() {
  const session = await getSession();
  if (!session?.user) {
    return <SocialAuthCard title="HR Login" callbackURL="/evaluation" />;
  }

  // Create tRPC caller with session headers
  const originalHeaders = await headers();
  const headersList = new Headers(originalHeaders);
  headersList.set("x-trpc-source", "rsc");
  const context = await createTRPCContext({ headers: headersList });
  const trpcCaller = createCaller(context);

  const [profile, matches] = await Promise.all([
    trpcCaller.candidate.me(),
    trpcCaller.match.listMine(),
  ]);

  const model = buildEvaluationPageModel({
    sessionUser: session.user,
    profile: profile ?? null,
    matches,
  });

  return <EvaluationClientPage model={model} />;
}
