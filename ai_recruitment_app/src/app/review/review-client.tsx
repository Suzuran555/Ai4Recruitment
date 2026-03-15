"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, GitPullRequest } from "lucide-react";
import { useRouter } from "next/navigation";

import { AIChatWidget } from "~/components/ai-chat-widget";
import { DiffViewer } from "~/components/diff-viewer";
import { ReviewSummary } from "~/components/review-summary";
import { Button } from "~/components/ui/button";

export default function ReviewClientPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="border-b border-zinc-800 bg-zinc-900 px-6 py-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => router.push("/assessment")}
              variant="ghost"
              size="sm"
              className="text-zinc-400 hover:text-white"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Editor
            </Button>
            <div className="h-6 w-px bg-zinc-800" />
            <div className="flex items-center gap-2">
              <GitPullRequest className="h-5 w-5 text-cyan-400" />
              <h1 className="text-lg font-semibold text-white">
                Pull Request #1337
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="font-mono text-xs tracking-wider text-cyan-400 uppercase">
              Code Review
            </div>
            <Button
              onClick={() => router.push("/evaluation")}
              size="sm"
              className="bg-emerald-600 text-white hover:bg-emerald-500"
            >
              View Final Report
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.div>

      <div className="container mx-auto max-w-7xl p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Review Summary Card */}
          <ReviewSummary />

          {/* Diff Viewer */}
          <DiffViewer />
        </motion.div>
      </div>

      {/* AI Chat Widget */}
      <AIChatWidget />
    </div>
  );
}
