"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  BarChart3,
  Bell,
  Briefcase,
  ChevronRight,
  Clock,
  LayoutDashboard,
  Settings,
  Sparkles,
  Users,
  Loader2,
  AlertTriangle,
} from "lucide-react";

import { authClient } from "~/server/better-auth/client";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { api } from "~/trpc/react";

type HRClientPageProps = {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
};

const sidebarItems = [
  { icon: LayoutDashboard, label: "Overview", href: "/hr?tab=overview" },
  { icon: Briefcase, label: "Active Jobs", href: "/hr/roles" },
  { icon: Settings, label: "Settings", href: "/hr?tab=settings" },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
}

export default function HRClientPage({ user }: HRClientPageProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "overview";

  const displayName = user.name ?? user.email ?? "Signed in";
  const fallback = user.name ? initials(user.name) : "HR";

  const jobsQuery = api.job.listPublished.useQuery();
  const jobs = jobsQuery.data ?? [];
  const allCandidatesQuery = api.job.getAllCandidates.useQuery(undefined, {
    // HR needs to see status transitions (in_progress -> completed) without manual refresh.
    // Polling is the simplest MVP; can be replaced by realtime later.
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

  const jobCount = jobs.length;
  const activeCandidatesCount = allCandidatesQuery.data?.stats?.totalCandidates ?? 0;
  const pendingReviewsCount = allCandidatesQuery.data?.stats?.pendingCount ?? 0;
  const avgMatchRate = allCandidatesQuery.data?.stats?.avgMatchRate ?? 0;

  const candidates = allCandidatesQuery.data?.candidates ?? [];
  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}/${month}/${day}`;
  };

  const renderStatusPill = (status: string) => {
    // Pill style (background + text) with a small icon/dot for urgency.
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
            AI Interviewing...
          </span>
        );
      case "not_started":
        return (
          <span className="inline-flex items-center gap-2 rounded-full bg-zinc-700/40 px-3 py-1 text-xs font-medium text-zinc-200">
            Invite Sent
          </span>
        );
      case "waitlisted":
        return (
          <span className="inline-flex items-center gap-2 rounded-full bg-purple-500/15 px-3 py-1 text-xs font-medium text-purple-200">
            Waitlisted
          </span>
        );
      case "proceed":
        return (
          <span className="inline-flex items-center gap-2 rounded-full bg-cyan-500/15 px-3 py-1 text-xs font-medium text-cyan-200">
            Proceed
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-2 rounded-full bg-zinc-700/40 px-3 py-1 text-xs font-medium text-zinc-300">
            Rejected
          </span>
        );
      case "expired":
        return (
          <span className="inline-flex items-center gap-2 rounded-full bg-zinc-800/60 px-3 py-1 text-xs font-medium text-zinc-500">
            Expired
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

  const [repoUrl, setRepoUrl] = useState("");
  const [submittedRepoUrl, setSubmittedRepoUrl] = useState<string | null>(null);
  const [pullsPage, setPullsPage] = useState(1);
  const [issuesPage, setIssuesPage] = useState(1);

  const parsedRepo = api.github.parseRepoUrl.useQuery(
    { repoUrl: submittedRepoUrl ?? "" },
    { enabled: Boolean(submittedRepoUrl) },
  );

  const owner = parsedRepo.data?.owner ?? "";
  const repo = parsedRepo.data?.repo ?? "";

  useEffect(() => {
    setPullsPage(1);
    setIssuesPage(1);
  }, [owner, repo]);

  const repoOverview = api.github.getRepoOverview.useQuery(
    { owner, repo },
    { enabled: Boolean(owner && repo) },
  );

  const pulls = api.github.listRepoPulls.useQuery(
    { owner, repo, page: pullsPage, perPage: 10 },
    { enabled: Boolean(owner && repo) },
  );
  const issues = api.github.listRepoIssues.useQuery(
    { owner, repo, page: issuesPage, perPage: 10 },
    { enabled: Boolean(owner && repo) },
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="flex min-h-screen bg-zinc-950"
    >
      <aside className="fixed top-0 left-0 flex h-screen w-64 flex-col border-r border-zinc-800 bg-zinc-950 p-6">
        {/* Logo */}
        <div className="mb-8">
          <h2 className="font-mono text-2xl font-bold text-cyan-400">
            CodeSync
          </h2>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = (() => {
              // Active Jobs should remain active for nested routes too.
              if (item.href.startsWith("/hr/roles")) {
                return pathname.startsWith("/hr/roles");
              }

              // Only highlight one item on the /hr page based on the selected tab.
              if (pathname !== "/hr") return false;
              if (item.label === "Settings") return tab === "settings";
              if (item.label === "Overview") return tab !== "settings";
              return false;
            })();
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "bg-zinc-800 font-medium text-zinc-100"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Profile at bottom */}
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <span>Dashboard</span>
              <ChevronRight className="h-4 w-4" />
              <span className="text-zinc-200">Overview</span>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="relative text-zinc-400 hover:text-zinc-200"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
            </Button>
          </div>
        </header>

        <div className="p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4"
          >
            <Card className="border border-zinc-800 bg-zinc-900">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-normal text-zinc-400">
                    Active Candidates
                  </CardTitle>
                  <Users className="h-4 w-4 text-zinc-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="font-mono text-3xl font-bold text-zinc-100">
                  {allCandidatesQuery.isLoading ? "…" : activeCandidatesCount}
                </div>
                <p className="mt-2 text-xs text-zinc-500">
                  {allCandidatesQuery.isLoading
                    ? "Loading..."
                    : `Across ${jobCount} job${jobCount !== 1 ? "s" : ""}`}
                </p>
              </CardContent>
            </Card>

            <Card className="border border-zinc-800 bg-zinc-900">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-normal text-zinc-400">
                    Pending AI Reviews
                  </CardTitle>
                  <AlertCircle className="h-4 w-4 text-zinc-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="font-mono text-3xl font-bold text-red-500">
                  {allCandidatesQuery.isLoading ? "…" : pendingReviewsCount}
                </div>
                <p className="mt-2 text-xs text-zinc-500">Requires attention</p>
              </CardContent>
            </Card>

            <Card className="border border-zinc-800 bg-zinc-900">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-normal text-zinc-400">
                    Avg Code Quality
                  </CardTitle>
                  <BarChart3 className="h-4 w-4 text-zinc-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="font-mono text-3xl font-bold text-emerald-500">
                  {allCandidatesQuery.isLoading ? "…" : `${avgMatchRate}%`}
                </div>
                <p className="mt-2 text-xs text-zinc-500">Avg match rate</p>
              </CardContent>
            </Card>

            <Card className="border border-zinc-800 bg-zinc-900">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-normal text-zinc-400">
                    Published Jobs
                  </CardTitle>
                  <Clock className="h-4 w-4 text-zinc-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="font-mono text-3xl font-bold text-zinc-100">
                  {jobsQuery.isLoading ? "…" : jobCount}
                </div>
                <p className="mt-2 text-xs text-zinc-500">This month</p>
              </CardContent>
            </Card>
          </motion.div>

          {tab === "overview" ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.18 }}
              className="mb-8"
            >
              <Card className="border border-zinc-800 bg-zinc-900">
                <CardHeader className="border-b border-zinc-800">
                  <CardTitle className="text-base font-semibold text-zinc-100">
                    Repo Explorer (GitHub)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                  <div className="flex flex-col gap-3 md:flex-row md:items-end">
                    <div className="flex-1">
                      <label className="mb-2 block text-sm font-medium text-zinc-400">
                        Paste a public GitHub repo URL
                      </label>
                      <Input
                        value={repoUrl}
                        onChange={(e) => setRepoUrl(e.target.value)}
                        placeholder="https://github.com/owner/repo"
                        className="h-10 border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-600"
                      />
                    </div>
                    <Button
                      className="h-10 bg-linear-to-r from-cyan-600 to-emerald-600 px-6 text-white hover:from-cyan-500 hover:to-emerald-500"
                      onClick={() => {
                        const v = repoUrl.trim();
                        setSubmittedRepoUrl(v ? v : null);
                      }}
                      disabled={!repoUrl.trim()}
                    >
                      Fetch
                    </Button>
                  </div>

                  {submittedRepoUrl ? (
                    parsedRepo.isLoading ? (
                      <div className="text-sm text-zinc-400">
                        Parsing repo URL…
                      </div>
                    ) : parsedRepo.error ? (
                      <div className="text-sm text-red-400">
                        Invalid repo URL: {parsedRepo.error.message}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-zinc-200">
                            <span className="font-mono">
                              {owner}/{repo}
                            </span>
                          </div>
                          <div className="text-xs text-zinc-500">
                            Rate limit:{" "}
                            <span className="font-mono">
                              {repoOverview.data?.rateLimit?.remaining ?? "?"}/
                              {repoOverview.data?.rateLimit?.limit ?? "?"}
                            </span>
                          </div>
                        </div>

                        {repoOverview.isLoading ? (
                          <div className="text-sm text-zinc-400">
                            Loading repo overview…
                          </div>
                        ) : repoOverview.error ? (
                          <div className="text-sm text-red-400">
                            Failed to load repo: {repoOverview.error.message}
                          </div>
                        ) : repoOverview.data ? (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                                <div className="text-xs text-zinc-500">
                                  Stars
                                </div>
                                <div className="font-mono text-2xl font-bold text-zinc-100">
                                  {repoOverview.data.repo?.stargazers_count ??
                                    0}
                                </div>
                              </div>
                              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                                <div className="text-xs text-zinc-500">
                                  Forks
                                </div>
                                <div className="font-mono text-2xl font-bold text-zinc-100">
                                  {repoOverview.data.repo?.forks_count ?? 0}
                                </div>
                              </div>
                              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                                <div className="text-xs text-zinc-500">
                                  Open issues
                                </div>
                                <div className="font-mono text-2xl font-bold text-zinc-100">
                                  {repoOverview.data.repo?.open_issues_count ??
                                    0}
                                </div>
                              </div>
                              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                                <div className="text-xs text-zinc-500">
                                  Default branch
                                </div>
                                <div className="font-mono text-lg font-semibold text-zinc-100">
                                  {repoOverview.data.repo?.default_branch ??
                                    "—"}
                                </div>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="text-sm font-medium text-zinc-300">
                                Languages
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {Object.keys(repoOverview.data.languages ?? {})
                                  .length ? (
                                  Object.keys(repoOverview.data.languages ?? {})
                                    .slice(0, 12)
                                    .map((lang) => (
                                      <Badge
                                        key={lang}
                                        variant="secondary"
                                        className="bg-zinc-800 text-zinc-200"
                                      >
                                        {lang}
                                      </Badge>
                                    ))
                                ) : (
                                  <span className="text-sm text-zinc-500">
                                    —
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                                <div className="mb-2 flex items-center justify-between">
                                  <div className="text-sm font-medium text-zinc-200">
                                    Pull requests
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-zinc-800 bg-zinc-950 text-zinc-200 hover:bg-zinc-900"
                                      disabled={
                                        pullsPage <= 1 || pulls.isLoading
                                      }
                                      onClick={() =>
                                        setPullsPage((p) => Math.max(1, p - 1))
                                      }
                                    >
                                      Prev
                                    </Button>
                                    <div className="text-xs text-zinc-500">
                                      <span className="font-mono">
                                        {pullsPage}
                                      </span>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-zinc-800 bg-zinc-950 text-zinc-200 hover:bg-zinc-900"
                                      disabled={pulls.isLoading}
                                      onClick={() => setPullsPage((p) => p + 1)}
                                    >
                                      Next
                                    </Button>
                                  </div>
                                </div>
                                {pulls.isLoading ? (
                                  <div className="text-sm text-zinc-500">
                                    Loading…
                                  </div>
                                ) : pulls.error ? (
                                  <div className="text-sm text-red-400">
                                    {pulls.error.message}
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    {(pulls.data?.items ?? [])
                                      .slice(0, 10)
                                      .map((pr: any) => (
                                        <a
                                          key={pr.id}
                                          href={pr.html_url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="block rounded-md border border-zinc-800 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
                                        >
                                          <div className="flex items-center justify-between gap-3">
                                            <div className="truncate">
                                              {pr.title}
                                            </div>
                                            <div className="text-xs text-zinc-500">
                                              #{pr.number}
                                            </div>
                                          </div>
                                        </a>
                                      ))}
                                    {!pulls.data?.items?.length ? (
                                      <div className="text-sm text-zinc-500">
                                        —
                                      </div>
                                    ) : null}
                                  </div>
                                )}
                              </div>

                              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                                <div className="mb-2 flex items-center justify-between">
                                  <div className="text-sm font-medium text-zinc-200">
                                    Issues
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-zinc-800 bg-zinc-950 text-zinc-200 hover:bg-zinc-900"
                                      disabled={
                                        issuesPage <= 1 || issues.isLoading
                                      }
                                      onClick={() =>
                                        setIssuesPage((p) => Math.max(1, p - 1))
                                      }
                                    >
                                      Prev
                                    </Button>
                                    <div className="text-xs text-zinc-500">
                                      <span className="font-mono">
                                        {issuesPage}
                                      </span>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-zinc-800 bg-zinc-950 text-zinc-200 hover:bg-zinc-900"
                                      disabled={issues.isLoading}
                                      onClick={() =>
                                        setIssuesPage((p) => p + 1)
                                      }
                                    >
                                      Next
                                    </Button>
                                  </div>
                                </div>
                                {issues.isLoading ? (
                                  <div className="text-sm text-zinc-500">
                                    Loading…
                                  </div>
                                ) : issues.error ? (
                                  <div className="text-sm text-red-400">
                                    {issues.error.message}
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    {(issues.data?.items ?? [])
                                      .slice(0, 10)
                                      .map((it: any) => (
                                        <a
                                          key={it.id}
                                          href={it.html_url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="block rounded-md border border-zinc-800 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
                                        >
                                          <div className="flex items-center justify-between gap-3">
                                            <div className="truncate">
                                              {it.title}
                                            </div>
                                            <div className="text-xs text-zinc-500">
                                              #{it.number}
                                            </div>
                                          </div>
                                        </a>
                                      ))}
                                    {!issues.data?.items?.length ? (
                                      <div className="text-sm text-zinc-500">
                                        —
                                      </div>
                                    ) : null}
                                  </div>
                                )}
                              </div>
                            </div>

                            {repoOverview.data.readme?.html_url ? (
                              <div className="text-sm">
                                <a
                                  className="text-cyan-400 hover:underline"
                                  href={repoOverview.data.readme.html_url}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  View README on GitHub
                                </a>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    )
                  ) : null}
                </CardContent>
              </Card>
            </motion.div>
          ) : null}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-8"
          >
            <Card className="relative overflow-hidden border border-zinc-800 bg-zinc-900">
              <div className="absolute inset-0 bg-linear-to-r from-cyan-500/10 via-purple-500/10 to-emerald-500/10" />
              <CardContent className="relative p-6">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-zinc-100">
                  <Sparkles className="h-5 w-5 text-cyan-400" />
                  Deploy New AI Assessment
                </h2>
                <div className="flex flex-col gap-4 md:flex-row md:items-end">
                  <div className="flex-1">
                    <label className="mb-2 block text-sm font-medium text-zinc-400">
                      Select Tech Stack
                    </label>
                    <Select>
                      <SelectTrigger className="h-10 border-zinc-800 bg-zinc-950 text-zinc-100">
                        <SelectValue placeholder="Choose technology" />
                      </SelectTrigger>
                      <SelectContent className="border-zinc-800 bg-zinc-900">
                        <SelectItem value="react">React</SelectItem>
                        <SelectItem value="node">Node</SelectItem>
                        <SelectItem value="python">Python</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <label className="mb-2 block text-sm font-medium text-zinc-400">
                      Job Role
                    </label>
                    <Input
                      placeholder="e.g., Senior Frontend"
                      className="h-10 border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-600"
                    />
                  </div>
                  <Button className="h-10 bg-linear-to-r from-cyan-600 to-emerald-600 px-6 text-white hover:from-cyan-500 hover:to-emerald-500">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Challenge
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="border border-zinc-800 bg-zinc-900">
              <CardHeader className="border-b border-zinc-800">
                <CardTitle className="text-base font-semibold text-zinc-100">
                  Candidate Pipeline
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  {allCandidatesQuery.isLoading ? (
                    <div className="px-6 py-8 text-sm text-zinc-400">
                      Loading candidates...
                    </div>
                  ) : candidates.length === 0 ? (
                    <div className="px-6 py-8 text-sm text-zinc-400">
                      No candidates have matched with your jobs yet. Candidates
                      will appear here after they analyze their repositories.
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className="border-b border-zinc-800 bg-zinc-950/50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase text-zinc-400">
                            Candidate
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase text-zinc-400">
                            Job
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase text-zinc-400">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase text-zinc-400">
                            Jobs Matched
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase text-zinc-400">
                            Match Score
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase text-zinc-400">
                            Repository
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase text-zinc-400">
                            Matched
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800">
                        {candidates.map((candidate) => (
                          <tr
                            key={candidate.candidateId}
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
                                  {candidate.candidate.githubUrl && (
                                    <a
                                      href={candidate.candidate.githubUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-cyan-400 hover:text-cyan-300"
                                    >
                                      {candidate.candidate.githubLogin ??
                                        candidate.candidate.githubUrl.replace(
                                          "https://github.com/",
                                          "",
                                        )}
                                    </a>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {candidate.bestJob ? (
                                <details className="group">
                                  <summary className="cursor-pointer list-none">
                                    <Link
                                      href={`/hr/roles/${candidate.bestJob.jobId}`}
                                      className="text-sm text-zinc-300 hover:text-zinc-100"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {candidate.bestJob.jobTitle}
                                    </Link>
                                    <span className="ml-2 text-xs text-zinc-500 group-open:hidden">
                                      (view all)
                                    </span>
                                  </summary>
                                  <div className="mt-2 space-y-1 text-xs text-zinc-400">
                                    {candidate.matches.slice(0, 8).map((m) => (
                                      <div key={m.matchId} className="flex items-center gap-2">
                                        <Link
                                          href={`/hr/roles/${m.jobId}`}
                                          className="text-cyan-400 hover:underline"
                                        >
                                          {m.jobTitle}
                                        </Link>
                                        <span className="text-zinc-600">·</span>
                                        <span>{m.score}%</span>
                                      </div>
                                    ))}
                                    {candidate.matches.length > 8 ? (
                                      <div className="text-zinc-500">
                                        +{candidate.matches.length - 8} more…
                                      </div>
                                    ) : null}
                                  </div>
                                </details>
                              ) : (
                                <span className="text-sm text-zinc-500">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {renderStatusPill(candidate.status)}
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-zinc-300">
                                {candidate.jobCount}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`text-sm font-semibold ${
                                  candidate.bestScore >= 80
                                    ? "text-emerald-400"
                                    : candidate.bestScore >= 60
                                      ? "text-cyan-400"
                                      : "text-amber-400"
                                }`}
                              >
                                {candidate.bestScore}%
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {candidate.bestJob?.repoFullName ? (
                                <a
                                  href={`https://github.com/${candidate.bestJob.repoFullName}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-zinc-400 hover:text-zinc-300"
                                >
                                  {candidate.bestJob.repoFullName}
                                </a>
                              ) : (
                                <span className="text-sm text-zinc-500">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-xs text-zinc-500">
                                {candidate.lastMatchedAt
                                  ? formatDate(candidate.lastMatchedAt)
                                  : "—"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </motion.div>
  );
}
