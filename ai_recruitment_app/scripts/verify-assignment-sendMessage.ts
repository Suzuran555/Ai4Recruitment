import "dotenv/config";

import { eq } from "drizzle-orm";

import { createCaller } from "~/server/api/root";
import { db } from "~/server/db";
import { candidateAssignment } from "~/server/db/schema";

async function main() {
  const id = Number(process.env.CANDIDATE_ASSIGNMENT_ID ?? "1");
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Invalid CANDIDATE_ASSIGNMENT_ID");
  }

  const ca = await db.query.candidateAssignment.findFirst({
    where: eq(candidateAssignment.id, id),
    columns: { id: true, candidateUserId: true },
  });
  if (!ca) {
    throw new Error(`candidate_assignment not found: id=${id}`);
  }

  const caller = createCaller({
    db,
    headers: new Headers(),
    session: {
      user: { id: ca.candidateUserId, role: "candidate" as const },
    } as any,
  });

  const res = await caller.assignment.sendMessage({
    candidateAssignmentId: ca.id,
    message: "测试一下：如果上游 5xx，也不应该 500 了。",
  });

  console.log(JSON.stringify(res.aiMessage, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
