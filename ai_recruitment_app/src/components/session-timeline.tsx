"use client";

import { motion } from "framer-motion";
import { Card } from "~/components/ui/card";
import { CheckCircle2, Play, Code2, MessageSquare, Send } from "lucide-react";

type EvaluationReport = {
  stats: { contributions: number };
  sessionTimeline: Array<{
    icon: string;
    title: string;
    description: string;
    time: string;
    status: string;
  }>;
};

interface SessionTimelineProps {
  evaluationReport?: EvaluationReport;
}

const iconMap: Record<string, typeof Play> = {
  Play,
  Code2,
  MessageSquare,
  Send,
};

const defaultTimelineEvents = [
  {
    icon: Play,
    title: "Started Assessment",
    description: "Candidate began coding challenge",
    time: "10:00 AM",
    status: "completed",
  },
  {
    icon: Code2,
    title: "Fixed Race Condition",
    description: "Implemented useRef solution",
    time: "10:15 AM",
    status: "completed",
  },
  {
    icon: Code2,
    title: "Added Error Handling",
    description: "Try-catch with user feedback",
    time: "10:28 AM",
    status: "completed",
  },
  {
    icon: MessageSquare,
    title: "AI Code Review",
    description: "Engaged in technical discussion",
    time: "10:35 AM",
    status: "completed",
  },
  {
    icon: Send,
    title: "Submitted PR",
    description: "All tests passed successfully",
    time: "10:42 AM",
    status: "completed",
  },
];

export function SessionTimeline({ evaluationReport }: SessionTimelineProps) {
  const timelineEvents = evaluationReport?.sessionTimeline
    ? evaluationReport.sessionTimeline.map((event) => ({
        icon: iconMap[event.icon] || Play,
        title: event.title,
        description: event.description,
        time: event.time,
        status: event.status,
      }))
    : defaultTimelineEvents;
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.4 }}
    >
      <Card className="sticky top-6 border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-sm">
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-white">Session Timeline</h3>
          <p className="text-sm text-zinc-400">42 minutes total duration</p>
        </div>

        <div className="relative space-y-6">
          {/* Vertical Line */}
          <div className="absolute top-2 left-[15px] h-[calc(100%-40px)] w-px bg-linear-to-b from-cyan-500 via-emerald-500 to-zinc-800" />

          {timelineEvents.map((event, index) => {
            const Icon = event.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="relative flex gap-4"
              >
                {/* Icon Circle */}
                <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-cyan-500 bg-zinc-900">
                  <Icon className="h-4 w-4 text-cyan-400" />
                </div>

                {/* Content */}
                <div className="flex-1 pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-white">
                        {event.title}
                      </h4>
                      <p className="mt-1 text-sm text-zinc-400">
                        {event.description}
                      </p>
                    </div>
                    <CheckCircle2 className="ml-2 h-4 w-4 shrink-0 text-emerald-400" />
                  </div>
                  <div className="mt-2 text-xs text-zinc-600">{event.time}</div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-zinc-800 pt-6">
          <div>
            <div className="text-2xl font-bold text-cyan-400">
              {timelineEvents.length}
            </div>
            <div className="text-xs text-zinc-500">Key Actions</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-400">
              {evaluationReport?.stats.contributions || 42}
            </div>
            <div className="text-xs text-zinc-500">Contributions</div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
