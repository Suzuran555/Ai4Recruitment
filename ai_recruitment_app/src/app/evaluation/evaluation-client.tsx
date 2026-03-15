"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "~/components/ui/button";
import type { EvaluationPageModel } from "~/lib/backend-view-models";
import { EvaluationHeader } from "~/components/evaluation-header";
import { MetricsGrid } from "~/components/metrics-grid";
import { RadarChartSection } from "~/components/radar-chart-section";
import { SessionTimeline } from "~/components/session-timeline";
import { Card } from "~/components/ui/card";

interface EvaluationClientPageProps {
  assignmentId?: string;
  model: EvaluationPageModel;
}

export default function EvaluationClientPage({
  assignmentId,
  model,
}: EvaluationClientPageProps) {
  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header Bar */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="border-b border-zinc-800 bg-zinc-900 px-6 py-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="font-mono text-xs tracking-wider text-cyan-400 uppercase">
              Evaluation Report
            </div>
          </div>
          <Link href="/hr">
            <Button
              variant="ghost"
              size="sm"
              className="text-zinc-400 hover:text-white"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to HR
            </Button>
          </Link>
        </div>
      </motion.div>

      <div className="container mx-auto max-w-7xl p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {assignmentId ? (
            <div className="text-xs text-zinc-500">
              Requested assignment id:{" "}
              <span className="font-mono text-zinc-300">{assignmentId}</span>
            </div>
          ) : null}

          <EvaluationHeader
            candidate={model.candidate}
            role={model.role}
            assignment={model.assignment}
            evaluationReport={model.evaluationReport}
          />

          {!model.meta.hasMatches ? (
            <Card className="border border-zinc-800 bg-zinc-900 p-6 text-zinc-200">
              <div className="mb-2 text-lg font-semibold">
                No evaluation data yet
              </div>
              <p className="text-sm text-zinc-400">
                This report is derived from current backend data (
                <span className="font-mono">candidate.me</span> +{" "}
                <span className="font-mono">match.listMine</span>). Run the
                candidate analysis flow to generate matches, then come back to
                see your report.
              </p>
            </Card>
          ) : null}

          <MetricsGrid evaluationReport={model.evaluationReport} />

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <RadarChartSection evaluationReport={model.evaluationReport} />
            </div>
            <div className="lg:col-span-1">
              <SessionTimeline evaluationReport={model.evaluationReport} />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
