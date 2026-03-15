"use client";

import { motion } from "framer-motion";
import { Card } from "~/components/ui/card";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";

type EvaluationReport = {
  evaluationData: {
    technicalSkills: Array<{ name: string; score: number }>;
  };
};

interface RadarChartSectionProps {
  evaluationReport?: EvaluationReport;
}

export function RadarChartSection({
  evaluationReport,
}: RadarChartSectionProps) {
  const defaultData = [
    { subject: "Problem Solving", A: 92, fullMark: 100 },
    { subject: "Code Quality", A: 88, fullMark: 100 },
    { subject: "Communication", A: 85, fullMark: 100 },
    { subject: "Debugging", A: 95, fullMark: 100 },
    { subject: "Architecture", A: 78, fullMark: 100 },
    { subject: "Testing", A: 82, fullMark: 100 },
  ];

  const data = evaluationReport?.evaluationData.technicalSkills
    ? evaluationReport.evaluationData.technicalSkills.map((skill) => ({
        subject: skill.name,
        A: skill.score,
        fullMark: 100,
      }))
    : defaultData;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card className="relative overflow-hidden border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-sm">
        {/* Glowing Grid Background */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#27272a_1px,transparent_1px),linear-gradient(to_bottom,#27272a_1px,transparent_1px)] bg-size-[40px_40px]" />
          <div className="absolute inset-0 bg-linear-to-br from-cyan-500/10 via-transparent to-emerald-500/10" />
        </div>

        <div className="relative">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-white">
                Skill Assessment Radar
              </h3>
              <p className="text-sm text-zinc-400">
                Comprehensive evaluation across key competencies
              </p>
            </div>
          </div>

          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={data}>
                <PolarGrid stroke="#3f3f46" strokeWidth={1} />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: "#a1a1aa", fontSize: 12 }}
                  stroke="#3f3f46"
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fill: "#71717a", fontSize: 10 }}
                  stroke="#3f3f46"
                />
                <Radar
                  name="Score"
                  dataKey="A"
                  stroke="#22d3ee"
                  fill="#22d3ee"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
