"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Briefcase, LayoutDashboard, Settings } from "lucide-react";

import { authClient } from "~/server/better-auth/client";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { RoleCard } from "~/components/hr/role-card";
import { api } from "~/trpc/react";

type HRRolesPageClientProps = {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
}

export default function HRRolesPageClient({ user }: HRRolesPageClientProps) {
  const router = useRouter();

  const displayName = user.name ?? user.email ?? "Signed in";
  const fallback = user.name ? initials(user.name) : "HR";

  const jobsQuery = api.job.listPublished.useQuery();
  const utils = api.useUtils();

  const deleteJob = api.job.delete.useMutation({
    onSuccess: () => {
      // Refresh the jobs list after deletion
      void utils.job.listPublished.invalidate();
    },
    onError: (error) => {
      alert(`Failed to delete job: ${error.message}`);
    },
  });

  const jobs = Array.isArray(jobsQuery.data) ? jobsQuery.data : [];

  const jobsSorted = useMemo(() => {
    if (!Array.isArray(jobs)) return [];
    return [...jobs].sort((a, b) => {
      const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bt - at;
    });
  }, [jobs]);

  const handleRemove = (jobId: number) => {
    deleteJob.mutate({ jobId });
  };

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
          <div className="flex w-full items-center gap-3 rounded-lg bg-zinc-800 px-3 py-2.5 text-sm font-medium text-zinc-100">
            <Briefcase className="h-4 w-4" />
            Active Jobs
          </div>
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
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-zinc-100">Active Jobs</h1>
            <Button
              onClick={() => router.push("/hr/roles/new")}
              className="bg-linear-to-r from-cyan-600 to-emerald-600 text-white hover:from-cyan-500 hover:to-emerald-500"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add New Role
            </Button>
          </div>
        </header>

        <div className="p-8">
          {jobsQuery.isLoading ? (
            <Card className="border border-zinc-800 bg-zinc-900">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="mb-4 text-zinc-400">Loading jobs…</p>
              </CardContent>
            </Card>
          ) : jobsSorted.length === 0 ? (
            <Card className="border border-zinc-800 bg-zinc-900">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Briefcase className="mb-4 h-12 w-12 text-zinc-600" />
                <p className="mb-4 text-zinc-400">No published jobs</p>
                <Button
                  onClick={() => router.push("/hr/roles/new")}
                  className="bg-linear-to-r from-cyan-600 to-emerald-600 text-white hover:from-cyan-500 hover:to-emerald-500"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Role
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {jobsSorted.map((job) => (
                <RoleCard
                  key={job.id}
                  role={{
                    id: job.id,
                    title: job.title,
                    description: job.description ?? null,
                    matchThreshold: job.matchThreshold,
                    hr: job.hr ? {
                      id: job.hr.id,
                      name: job.hr.name,
                      email: job.hr.email,
                      image: job.hr.image,
                    } : null,
                  }}
                  candidateCount={0}
                  currentUserId={user.id}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </motion.div>
  );
}
