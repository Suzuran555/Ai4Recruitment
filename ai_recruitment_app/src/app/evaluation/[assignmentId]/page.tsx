import { SocialAuthCard } from "~/components/auth/social-auth-card";
import { getSession } from "~/server/better-auth/server";
import EvaluationClientPage from "../evaluation-client";
import AIPMChat from "~/components/ai-pm-chat";
import { headers } from "next/headers";
import { createCaller } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";
import { buildEvaluationPageModel } from "~/lib/backend-view-models";
import { db } from "~/server/db";
import { candidateAssignment } from "~/server/db/schema";
import { eq } from "drizzle-orm";

export default async function EvaluationPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const session = await getSession();
  if (!session?.user) {
    return <SocialAuthCard title="Candidate Login" callbackURL="/evaluation" />;
  }

  const { assignmentId } = await params;
  const candidateAssignmentId = parseInt(assignmentId, 10);

  // Check if this is a candidate assignment ID
  if (!isNaN(candidateAssignmentId)) {
    // Fetch candidate assignment
    const assignment = await db.query.candidateAssignment.findFirst({
      where: eq(candidateAssignment.id, candidateAssignmentId),
    });

    if (assignment) {
      // If not completed, show chat interface
      if (assignment.status !== "completed") {
        return <AIPMChat candidateAssignmentId={candidateAssignmentId} repoUrl={assignment.repoUrl} />;
      }

      // If completed, show report (use existing evaluation page logic)
      // For now, show chat with completed state
      return <AIPMChat candidateAssignmentId={candidateAssignmentId} repoUrl={assignment.repoUrl} />;
    }
  }

  // Fallback to original evaluation page for HR view
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
    assignmentId,
  });

  return <EvaluationClientPage model={model} assignmentId={assignmentId} />;
}
