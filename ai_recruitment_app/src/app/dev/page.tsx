"use client";

import { api } from "~/trpc/react";

export default function DevPage() {
  const createJob = api.job.create.useMutation();
  const listJobs = api.job.listPublished.useQuery();

  return (
    <div style={{ padding: 20 }}>
      <button
        onClick={() =>
          createJob.mutate({
            title: "Frontend Engineer",
            requiredStacks: { React: 0.6, TypeScript: 0.4 },
            isPublished: true,
          })
        }
      >
        Create Job
      </button>

      <pre>{JSON.stringify(listJobs.data, null, 2)}</pre>
    </div>
  );
}
