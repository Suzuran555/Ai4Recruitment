"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";

interface MatchRateBadgeProps {
  overallMatch: number;
  communicationMatch: number;
  codeMatch: number;
  showChart?: boolean;
}

export function MatchRateBadge({
  overallMatch,
  communicationMatch,
  codeMatch,
  showChart = false,
}: MatchRateBadgeProps) {
  const [expanded, setExpanded] = useState(false);

  const getMatchColor = (score: number) => {
    if (score >= 80) return "bg-emerald-600 text-white";
    if (score >= 60) return "bg-amber-600 text-white";
    return "bg-red-600 text-white";
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Badge
          className={`font-mono text-base font-semibold px-3 py-1 ${getMatchColor(overallMatch)}`}
        >
          {overallMatch}%
        </Badge>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-zinc-400 hover:text-zinc-200 transition-colors"
          aria-label="Toggle breakdown"
        >
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      </div>

      {expanded && (
        <Card className="border border-zinc-800 bg-zinc-900 p-3">
          <CardContent className="p-0 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">Communication</span>
              <Badge
                className={`font-mono text-xs ${getMatchColor(communicationMatch)}`}
              >
                {communicationMatch}%
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">Code Ability</span>
              <Badge
                className={`font-mono text-xs ${getMatchColor(codeMatch)}`}
              >
                {codeMatch}%
              </Badge>
            </div>
            {showChart && (
              <div className="pt-2 border-t border-zinc-800">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <div className="text-xs text-zinc-500 mb-1">
                      Communication
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all"
                        style={{ width: `${communicationMatch}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-zinc-500 mb-1">Code</div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-500 transition-all"
                        style={{ width: `${codeMatch}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

