"use client";

import { motion } from "framer-motion";
import { Card } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Github, CheckCircle2, TrendingUp } from "lucide-react";
import { recommendRoleFromEvaluation } from "~/lib/role-recommendation";

/**
 * Format date consistently for server and client to avoid hydration errors
 * Uses YYYY/MM/DD format which is consistent across locales
 */
function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

type Candidate = {
  name: string;
  githubUrl?: string;
};

type Role = {
  name: string;
};

type Assignment = {
  id: string;
  overallMatch: number;
  createdAt: Date | string;
};

type EvaluationReport = {
  evaluationData: {
    overallScore: number;
    technicalSkills: Array<{ name: string; score: number }>;
  };
};

interface EvaluationHeaderProps {
  candidate?: Candidate;
  role?: Role;
  assignment?: Assignment;
  evaluationReport?: EvaluationReport;
}

export function EvaluationHeader({
  candidate,
  role,
  assignment,
  evaluationReport,
}: EvaluationHeaderProps) {
  const candidateName = candidate?.name || "Linus Torvalds";
  const candidateGithub =
    candidate?.githubUrl?.replace("https://github.com/", "@") || "@torvalds";
  const roleName = role?.name || "Senior Backend Engineer Assessment";
  const overallScore =
    evaluationReport?.evaluationData.overallScore ||
    assignment?.overallMatch ||
    92;
  const sessionId = assignment?.id.slice(0, 8).toUpperCase() || "#A7X-92K4";
  const roleRecommendation = recommendRoleFromEvaluation(
    evaluationReport,
    assignment,
  );

  const getRecommendation = (score: number) => {
    if (score >= 85)
      return {
        text: "Strong Hire",
        colorClass: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
      };
    if (score >= 70)
      return {
        text: "Hire",
        colorClass: "border-cyan-500/50 bg-cyan-500/10 text-cyan-400",
      };
    return {
      text: "Review",
      colorClass: "border-amber-500/50 bg-amber-500/10 text-amber-400",
    };
  };

  const recommendation = getRecommendation(overallScore);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <Card className="border border-zinc-800 bg-linear-to-br from-zinc-900 via-zinc-900 to-emerald-950/20 p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-linear-to-br from-cyan-400 to-blue-500">
              <Github className="h-10 w-10 text-white" />
            </div>
            <div>
              <h1 className="mb-2 text-3xl font-bold text-white">
                {candidateName}
              </h1>
              <p className="text-zinc-400">
                {candidateGithub} · {roleName}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <span className="text-zinc-500">Recommended role:</span>
                <Badge className="border-purple-500/30 bg-purple-500/10 text-purple-200">
                  {roleRecommendation.roleName}
                </Badge>
                {roleRecommendation.matchedTags.slice(0, 3).map((tag) => (
                  <Badge
                    key={tag}
                    className="border-zinc-700 bg-zinc-900/40 text-zinc-300"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm text-zinc-500">
                <span>Session ID: {sessionId}</span>
                <span>·</span>
                <span>
                  Completed{" "}
                  {assignment?.createdAt
                    ? formatDate(assignment.createdAt)
                    : "2 hours ago"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start gap-3 md:items-end">
            <Badge
              className={`${recommendation.colorClass} px-4 py-2 text-lg font-semibold`}
            >
              <CheckCircle2 className="mr-2 h-5 w-5" />
              {recommendation.text}
            </Badge>
            <div className="flex items-center gap-2 text-emerald-400">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">
                {overallScore}% Overall Score
              </span>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
