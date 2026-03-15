"use client";

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

interface MatchRateChartProps {
  communicationMatch: number;
  codeMatch: number;
  height?: number;
}

export function MatchRateChart({
  communicationMatch,
  codeMatch,
  height = 100,
}: MatchRateChartProps) {
  const data = [
    {
      name: "Communication",
      value: communicationMatch,
      fill: "#10b981", // emerald-500
    },
    {
      name: "Code",
      value: codeMatch,
      fill: "#06b6d4", // cyan-500
    },
  ];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical">
        <XAxis type="number" domain={[0, 100]} hide />
        <YAxis
          dataKey="name"
          type="category"
          width={80}
          tick={{ fill: "#71717a", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#18181b",
            border: "1px solid #27272a",
            borderRadius: "6px",
            color: "#f4f4f5",
          }}
          formatter={(value: number) => [`${value}%`, "Match Rate"]}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

