"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { Briefcase, LayoutDashboard, Settings } from "lucide-react";

import { authClient } from "~/server/better-auth/client";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { AddRoleForm } from "~/components/hr/add-role-form";
import type { InterviewerStyle } from "~/components/hr/add-role-form";
import { api } from "~/trpc/react";

type HRAddRolePageClientProps = {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
}

export default function HRAddRolePageClient({
  user,
}: HRAddRolePageClientProps) {
  const router = useRouter();

  const displayName = user.name ?? user.email ?? "Signed in";
  const fallback = user.name ? initials(user.name) : "HR";

  const createJob = api.job.create.useMutation();
  const upsertAssignment = api.assignment.upsertForJob.useMutation();

  const handleComplete = (data: {
    name: string;
    companyInfo?: string;
    companyCode?: File | null;
    companyCulture?: string;
    assignmentGithubLink?: string;
    interviewerStyle: InterviewerStyle;
    historicTranscript?: File | null;
    requiredStacks?: Record<string, number>;
  }) => {
    void (async () => {
      const descriptionParts = [
        data.companyInfo?.trim(),
        data.companyCulture?.trim(),
        data.assignmentGithubLink?.trim()
          ? `Assignment: ${data.assignmentGithubLink.trim()}`
          : null,
        `Interviewer style: ${data.interviewerStyle}`,
      ].filter(Boolean) as string[];

      // 使用表单中的 requiredStacks，如果没有则使用默认值
      const requiredStacks =
        data.requiredStacks && Object.keys(data.requiredStacks).length > 0
          ? data.requiredStacks
          : { General: 1 };

      const jobResult = await createJob.mutateAsync({
        title: data.name,
        description: descriptionParts.length
          ? descriptionParts.join("\n\n")
          : undefined,
        requiredStacks,
        matchThreshold: 50,
        isPublished: true,
      });

      // If assignmentGithubLink is provided, create assignment
      if (data.assignmentGithubLink?.trim()) {
        try {
          await upsertAssignment.mutateAsync({
            jobId: jobResult.id,
            repoTemplateUrl: data.assignmentGithubLink.trim(),
            instructions: `Assignment for ${data.name}`,
          });
        } catch (error) {
          console.error("Failed to create assignment:", error);
          // Continue anyway - assignment can be added later
        }
      }

      alert(`Role "${data.name}" published.`);
      router.push("/hr/roles");
    })();
  };

  const handleCancel = () => {
    router.push("/hr/roles");
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
          <h1 className="text-xl font-semibold text-zinc-100">Add New Role</h1>
        </header>

        <div className="max-w-4xl p-8">
          <AddRoleForm onComplete={handleComplete} onCancel={handleCancel} />
        </div>
      </main>
    </motion.div>
  );
}
