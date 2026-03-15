"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";

type TrackKey = "specialist" | "expansion" | "pragmatist";

export function TrackChallengeModal(props: {
  analysisId: number;
  repoFullName: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [activeTrack, setActiveTrack] = useState<TrackKey | null>(null);
  const [hasInitializedTrack, setHasInitializedTrack] = useState(false);

  const trackOptions = api.track.getOptions.useQuery(
    { analysisId: props.analysisId },
    { enabled: Boolean(props.analysisId) },
  );
  const persistTrack = api.track.select.useMutation();
  const claimAssignment = api.assignment.claim.useMutation();

  useEffect(() => {
    if (hasInitializedTrack) {
      return;
    }
    if (!trackOptions.data) {
      return;
    }
    const initial =
      (trackOptions.data.selectedTrack as TrackKey | null) ??
      (trackOptions.data.recommendedTrackKey as TrackKey | null) ??
      null;
    if (initial) {
      setActiveTrack(initial);
      setHasInitializedTrack(true);
    }
  }, [hasInitializedTrack, trackOptions.data]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-zinc-100">
              Choose your assessment track
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Pick a repo, then pick a track, then start an assignment.
              {props.repoFullName ? ` (${props.repoFullName})` : ""}
            </p>
            {Array.isArray(trackOptions.data?.domainTags) &&
            trackOptions.data.domainTags.length ? (
              <p className="mt-1 text-xs text-zinc-500">
                Domain signals: {trackOptions.data.domainTags.join(", ")}
              </p>
            ) : null}
          </div>
          <Button
            variant="ghost"
            className="text-zinc-300 hover:bg-zinc-900"
            onClick={props.onClose}
          >
            Close
          </Button>
        </div>

        {trackOptions.isLoading ? (
          <div className="py-10 text-center text-zinc-300">
            Loading track options…
          </div>
        ) : trackOptions.error ? (
          <div className="rounded-lg border border-red-900/40 bg-red-950/30 p-4 text-sm text-red-200">
            Failed to load track options: {trackOptions.error.message}
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
              <div className="text-sm font-semibold text-zinc-100">
                Repo tech stack (from analysis)
              </div>
              <div className="mt-2 grid gap-3 md:grid-cols-3">
                <div>
                  <div className="text-xs font-medium text-zinc-400">
                    Languages
                  </div>
                  <div className="mt-1 space-y-1 text-xs text-zinc-200">
                    {Array.isArray(trackOptions.data?.techStack?.languages) &&
                    trackOptions.data.techStack.languages.length ? (
                      trackOptions.data.techStack.languages
                        .slice(0, 8)
                        .map((l: any) => (
                          <div key={String(l?.language ?? "")}>
                            {String(l?.language ?? "Unknown")}
                            {typeof l?.percentage === "number"
                              ? ` (${l.percentage.toFixed(0)}%)`
                              : ""}
                          </div>
                        ))
                    ) : (
                      <div className="text-zinc-500">—</div>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-zinc-400">
                    Frameworks
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {Array.isArray(trackOptions.data?.techStack?.frameworks) &&
                    trackOptions.data.techStack.frameworks.length ? (
                      trackOptions.data.techStack.frameworks
                        .slice(0, 10)
                        .map((f: any) => (
                          <span
                            key={String(f)}
                            className="rounded-full border border-zinc-700 bg-zinc-950 px-2 py-0.5 text-xs text-zinc-200"
                          >
                            {String(f)}
                          </span>
                        ))
                    ) : (
                      <span className="text-xs text-zinc-500">—</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-zinc-400">
                    Tooling
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {Array.isArray(trackOptions.data?.techStack?.tooling) &&
                    trackOptions.data.techStack.tooling.length ? (
                      trackOptions.data.techStack.tooling
                        .slice(0, 10)
                        .map((t: any) => (
                          <span
                            key={String(t)}
                            className="rounded-full border border-zinc-700 bg-zinc-950 px-2 py-0.5 text-xs text-zinc-200"
                          >
                            {String(t)}
                          </span>
                        ))
                    ) : (
                      <span className="text-xs text-zinc-500">—</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
              <div className="text-sm font-semibold text-zinc-100">
                Top 3 recommended jobs / assignments for this Track
              </div>
              <p className="mt-1 text-xs text-zinc-400">
                Click a Track card below to switch this list instantly.
              </p>
              <div className="mt-3 space-y-2">
                {activeTrack &&
                trackOptions.data?.recommendationsByTrack?.[activeTrack]
                  ?.length ? (
                  trackOptions.data.recommendationsByTrack[activeTrack].map(
                    (r: any) => (
                      <div
                        key={String(r?.jobId ?? "")}
                        className="flex flex-col gap-1 rounded-lg border border-zinc-800 bg-zinc-950/40 p-3 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-zinc-100">
                            {String(r?.jobTitle ?? "Job")}
                          </div>
                          <div className="text-xs text-zinc-400">
                            Assignment:{" "}
                            {r?.assignment ? "available" : "missing"}
                          </div>
                          <div className="mt-0.5 text-xs text-zinc-500">
                            {String(r?.reason ?? "")}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-xs font-medium text-cyan-300">
                            {typeof r?.score === "number"
                              ? `${r.score}/100`
                              : "—"}
                          </div>
                        </div>
                      </div>
                    ),
                  )
                ) : (
                  <div className="text-xs text-zinc-500">
                    Select a Track to see recommendations.
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {trackOptions.data?.options?.map((opt: any) => (
                <div
                  key={opt.trackKey}
                  className={[
                    "flex cursor-pointer flex-col rounded-xl border p-4 transition-colors",
                    activeTrack === opt.trackKey
                      ? "border-cyan-500/60 bg-cyan-500/10"
                      : "border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900/50",
                  ].join(" ")}
                  onClick={() => setActiveTrack(opt.trackKey)}
                >
                  <div className="mb-2 text-base font-semibold text-zinc-100">
                    {opt.title}
                  </div>
                  <div className="mb-3 text-xs text-zinc-400">{opt.slogan}</div>
                  <ul className="mb-3 list-disc space-y-1 pl-4 text-xs text-zinc-300">
                    {opt.focusAreas.slice(0, 3).map((t: string) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                  <p className="mb-4 text-xs text-zinc-400">{opt.rationale}</p>
                  <div className="mt-auto flex items-center justify-between gap-2">
                    <div className="text-xs text-zinc-400">
                      {trackOptions.data?.recommendedTrackKey ===
                      opt.trackKey ? (
                        <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-cyan-300">
                          Recommended
                        </span>
                      ) : (
                        <span className="text-zinc-500"> </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {activeTrack === opt.trackKey ? "Selected" : ""}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-semibold text-zinc-100">
                Start from the current Track’s Top 3
              </h3>
              <p className="mt-1 text-xs text-zinc-400">
                Click a job below to start the online test (assignment).
              </p>
              <div className="mt-3 space-y-3">
                {activeTrack &&
                trackOptions.data?.recommendationsByTrack?.[activeTrack]
                  ?.length ? (
                  trackOptions.data.recommendationsByTrack[activeTrack].map(
                    (r: any) => (
                      <div
                        key={r.jobId}
                        className="flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-900/20 p-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-3">
                            <div className="text-sm font-semibold text-zinc-100">
                              {r.jobTitle}
                            </div>
                            <div className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-xs font-medium text-cyan-300">
                              {r.score}/100
                            </div>
                          </div>
                          <div className="mt-1 text-xs text-zinc-400">
                            {r.reason}
                          </div>
                          {r.assignment?.repoTemplateUrl ? (
                            <div className="mt-1 text-xs text-zinc-500">
                              Template: {r.assignment.repoTemplateUrl}
                            </div>
                          ) : (
                            <div className="mt-1 text-xs text-zinc-600">
                              No assignment template attached to this job yet.
                            </div>
                          )}
                        </div>

                        <div className="flex shrink-0 gap-2">
                          <Button
                            disabled={
                              !r.assignment ||
                              claimAssignment.isPending ||
                              !props.repoFullName ||
                              !activeTrack
                            }
                            onClick={async () => {
                              if (!props.repoFullName || !activeTrack) {
                                return;
                              }
                              await persistTrack.mutateAsync({
                                analysisId: props.analysisId,
                                trackKey: activeTrack,
                              });
                              const repoUrl = `https://github.com/${props.repoFullName}`;
                              const resp = await claimAssignment.mutateAsync({
                                jobId: r.jobId,
                                repoUrl,
                              });
                              router.push(
                                `/evaluation/${resp.candidateAssignmentId}`,
                              );
                            }}
                          >
                            Start
                          </Button>
                        </div>
                      </div>
                    ),
                  )
                ) : (
                  <div className="text-xs text-zinc-500">
                    Select a Track to see recommendations.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
