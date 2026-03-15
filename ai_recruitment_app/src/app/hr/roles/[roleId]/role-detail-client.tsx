"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Briefcase,
  LayoutDashboard,
  Loader2,
  Settings,
  Trash2,
} from "lucide-react";

import { authClient } from "~/server/better-auth/client";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { StatusSelector } from "~/components/hr/status-selector";
import { api } from "~/trpc/react";

type HRRoleDetailPageClientProps = {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  roleId: string;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
}

export default function HRRoleDetailPageClient({
  user,
  roleId,
}: HRRoleDetailPageClientProps) {
  const jobId = Number(roleId);
  const jobsQuery = api.job.listPublished.useQuery();
  const job = (jobsQuery.data ?? []).find((j) => j.id === jobId);
  const candidatesQuery = api.job.getCandidates.useQuery(
    { jobId },
    {
      enabled: !Number.isNaN(jobId) && !!job,
      // Keep status pills fresh while candidate is progressing.
      refetchInterval: 3000,
      refetchIntervalInBackground: true,
      refetchOnWindowFocus: true,
    },
  );
  const utils = api.useUtils();
  const deleteMatch = api.jobMatch.delete.useMutation({
    onSuccess: () => {
      void utils.job.getCandidates.invalidate({ jobId });
      void utils.job.getAllCandidates.invalidate();
    },
    onError: (e) => {
      alert(`Failed to delete candidate application: ${e.message}`);
    },
  });
  const updateStatus = api.jobMatch.setStatus.useMutation({
    onSuccess: () => {
      void utils.job.getCandidates.invalidate({ jobId });
      void utils.job.getAllCandidates.invalidate();
    },
    onError: (e) => {
      alert(`Failed to update status: ${e.message}`);
    },
  });

  const displayName = user.name ?? user.email ?? "Signed in";
  const fallback = user.name ? initials(user.name) : "HR";

  const candidates = candidatesQuery.data ?? [];

  const renderStatusPill = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            Ready to Review
          </span>
        );
      case "flagged":
        return (
          <span className="inline-flex items-center gap-2 rounded-full bg-red-500/15 px-3 py-1 text-xs font-medium text-red-300">
            <AlertTriangle className="h-3.5 w-3.5" />
            AI Flagged
          </span>
        );
      case "in_progress":
        return (
          <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-200">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            In Progress
          </span>
        );
      case "not_started":
        return (
          <span className="inline-flex items-center gap-2 rounded-full bg-zinc-700/40 px-3 py-1 text-xs font-medium text-zinc-200">
            Invite Sent
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-2 rounded-full bg-zinc-800/60 px-3 py-1 text-xs font-medium text-zinc-400">
            {status}
          </span>
        );
    }
  };

  if (Number.isNaN(jobId)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <Card className="border border-zinc-800 bg-zinc-900">
          <CardContent className="p-8">
            <p className="text-zinc-400">Invalid job id</p>
            <Link href="/hr/roles">
              <Button className="mt-4">Back to Active Jobs</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (jobsQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <Card className="border border-zinc-800 bg-zinc-900">
          <CardContent className="p-8">
            <p className="text-zinc-400">Loading job…</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <Card className="border border-zinc-800 bg-zinc-900">
          <CardContent className="p-8">
            <p className="text-zinc-400">Job not found</p>
            <Link href="/hr/roles">
              <Button className="mt-4">Back to Active Jobs</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="flex min-h-screen bg-zinc-950"
    >
      <aside className="fixed top-0 left-0 flex h-screen w-64 flex-col border-r border-zinc-800 bg-zinc-950 p-6">
        <div className="mb-8">
          <h2 className="font-mono text-2xl font-bold text-cyan-400">
            CodeSync
          </h2>
        </div>

        <nav className="flex-1 space-y-1">
          <Link
            href="/hr?tab=overview"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-200"
          >
            <LayoutDashboard className="h-4 w-4" />
            Overview
          </Link>
          <Link
            href="/hr/roles"
            className="flex w-full items-center gap-3 rounded-lg bg-zinc-800 px-3 py-2.5 text-sm font-medium text-zinc-100"
          >
            <Briefcase className="h-4 w-4" />
            Active Jobs
          </Link>
          <Link
            href="/hr?tab=settings"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-200"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </nav>

        <div className="mt-auto space-y-3 border-t border-zinc-800 pt-6">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 border border-zinc-700">
              <AvatarImage src={user.image ?? undefined} />
              <AvatarFallback className="bg-zinc-800 text-zinc-200">
                {fallback}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-200">
                {displayName}
              </p>
              <p className="truncate text-xs text-zinc-500">HR</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full border-zinc-800 bg-zinc-950 text-zinc-200 hover:bg-zinc-900"
            onClick={async () => {
              await authClient.signOut();
              window.location.assign("/");
            }}
          >
            Sign out
          </Button>
        </div>
      </aside>

      <main className="ml-64 flex-1 overflow-auto">
        <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/80 px-8 py-4 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <Link href="/hr/roles">
              <Button
                variant="ghost"
                size="sm"
                className="text-zinc-400 hover:text-zinc-200"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-zinc-100">
                {job.title}
              </h1>
              {job.description && (
                <p className="text-sm text-zinc-400">{job.description}</p>
              )}
            </div>
          </div>
        </header>

        <div className="p-8">
          <Card className="border border-zinc-800 bg-zinc-900">
            <CardHeader className="border-b border-zinc-800">
              <CardTitle className="text-base font-semibold text-zinc-100">
                Candidates
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                {candidatesQuery.isLoading ? (
                  <div className="px-6 py-8 text-sm text-zinc-400">
                    Loading candidates...
                  </div>
                ) : candidates.length === 0 ? (
                  <div className="px-6 py-8 text-sm text-zinc-400">
                    No candidates have matched with this job yet.
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="border-b border-zinc-800 bg-zinc-950/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase text-zinc-400">
                          Candidate
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase text-zinc-400">
                          GitHub
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase text-zinc-400">
                          Match Score
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase text-zinc-400">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase text-zinc-400">
                          Repository
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase text-zinc-400">
                          Matched
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium uppercase text-zinc-400">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {candidates.map((candidate) => (
                        <tr
                          key={candidate.matchId}
                          className="transition-colors hover:bg-zinc-900/50"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800">
                                <span className="text-sm font-medium text-zinc-300">
                                  {candidate.candidate.name
                                    ?.split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .toUpperCase()
                                    .slice(0, 2) ?? "?"}
                                </span>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-zinc-100">
                                  {candidate.candidate.name ?? "Unknown"}
                                </div>
                                {candidate.candidate.email && (
                                  <div className="text-xs text-zinc-500">
                                    {candidate.candidate.email}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {candidate.candidate.githubUrl ? (
                              <a
                                href={candidate.candidate.githubUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-cyan-400 hover:text-cyan-300"
                              >
                                {candidate.candidate.githubLogin ??
                                  candidate.candidate.githubUrl.replace(
                                    "https://github.com/",
                                    "",
                                  )}
                              </a>
                            ) : (
                              <span className="text-sm text-zinc-500">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-sm font-semibold ${
                                  candidate.score >= 80
                                    ? "text-emerald-400"
                                    : candidate.score >= 60
                                      ? "text-cyan-400"
                                      : "text-amber-400"
                                }`}
                              >
                                {candidate.score}%
                              </span>
                            </div>
                          </td>
                                <td className="px-6 py-4">
                                  <StatusSelector
                                    status={candidate.status ?? "completed"}
                                    onStatusChange={(status) => {
                                      updateStatus.mutate({
                                        matchId: candidate.matchId,
                                        status: status as "not_started" | "in_progress" | "completed" | "flagged" | "proceed" | "rejected" | "waitlisted" | "expired",
                                      });
                                    }}
                                    variant="dropdown"
                                  />
                                </td>
                          <td className="px-6 py-4">
                                  {candidate.repoFullName ? (
                                    <a
                                      href={`https://github.com/${candidate.repoFullName}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm text-zinc-400 hover:text-zinc-300"
                                    >
                                      {candidate.repoFullName}
                                    </a>
                                  ) : candidate.analysis?.repoFullName ? (
                              <a
                                href={`https://github.com/${candidate.analysis.repoFullName}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-zinc-400 hover:text-zinc-300"
                              >
                                {candidate.analysis.repoFullName}
                              </a>
                            ) : (
                              <span className="text-sm text-zinc-500">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs text-zinc-500">
                              {candidate.createdAt
                                ? (() => {
                                    const d = new Date(candidate.createdAt);
                                    const year = d.getFullYear();
                                    const month = String(d.getMonth() + 1).padStart(2, "0");
                                    const day = String(d.getDate()).padStart(2, "0");
                                    return `${year}/${month}/${day}`;
                                  })()
                                : "—"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-zinc-500 hover:bg-red-500/10 hover:text-red-400"
                              disabled={deleteMatch.isPending}
                              onClick={() => {
                                if (!job) return;
                                if (confirm(`Remove this candidate from "${job.title}"?`)) {
                                  deleteMatch.mutate({ matchId: candidate.matchId });
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </motion.div>
  );
}
