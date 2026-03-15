"use client";

import { motion } from "framer-motion";
import { Card } from "~/components/ui/card";
import { Code2, MessageSquare, Bug, Clock } from "lucide-react";

type EvaluationReport = {
  stats: { codeQuality: number; repos: number };
  evaluationData: { communicationScore: number; codeScore: number };
};

interface MetricsGridProps {
  evaluationReport?: EvaluationReport;
}

const colorClasses = {
  cyan: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
};

export function MetricsGrid({ evaluationReport }: MetricsGridProps) {
  const codeQuality = evaluationReport?.stats.codeQuality
    ? Math.round(evaluationReport.stats.codeQuality * 10)
    : 88;
  const communication =
    evaluationReport?.evaluationData.communicationScore || 85;
  const codeScore = evaluationReport?.evaluationData.codeScore || 88;

  const metrics = [
    {
      icon: Code2,
      label: "Code Quality",
      value: String(codeQuality),
      unit: "/100",
      color: "cyan",
      change: "+12%",
    },
    {
      icon: MessageSquare,
      label: "Communication",
      value: String(communication),
      unit: "/100",
      color: "emerald",
      change: "+8%",
    },
    {
      icon: Bug,
      label: "Code Score",
      value: String(codeScore),
      unit: "/100",
      color: "purple",
      change: "-40%",
    },
    {
      icon: Clock,
      label: "Repositories",
      value: String(evaluationReport?.stats.repos || 34),
      unit: "",
      color: "amber",
      change: "-15%",
    },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + index * 0.1 }}
          >
            <Card
              className={`border ${colorClasses[metric.color as keyof typeof colorClasses]} p-6`}
            >
              <div className="mb-4 flex items-center justify-between">
                <Icon
                  className={`h-6 w-6 ${metric.color === "cyan" ? "text-cyan-400" : metric.color === "emerald" ? "text-emerald-400" : metric.color === "purple" ? "text-purple-400" : "text-amber-400"}`}
                />
                <span
                  className={`text-xs font-semibold ${metric.change.startsWith("+") ? "text-emerald-400" : "text-amber-400"}`}
                >
                  {metric.change}
                </span>
              </div>
              <div className="mb-1">
                <span
                  className={`text-4xl font-bold ${metric.color === "cyan" ? "text-cyan-400" : metric.color === "emerald" ? "text-emerald-400" : metric.color === "purple" ? "text-purple-400" : "text-amber-400"}`}
                >
                  {metric.value}
                </span>
                <span className="ml-1 text-lg text-zinc-500">
                  {metric.unit}
                </span>
              </div>
              <p className="text-sm text-zinc-400">{metric.label}</p>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
