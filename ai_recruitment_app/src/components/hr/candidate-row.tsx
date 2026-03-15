"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { MatchRateBadge } from "./match-rate-badge";
import { StatusSelector, type AssignmentStatus } from "./status-selector";

type Candidate = {
  name: string;
  avatar?: string;
  githubUrl?: string;
};

type Role = {
  name: string;
};

type Assignment = {
  id: string;
  overallMatch: number;
  communicationMatch: number;
  codeMatch: number;
  status: AssignmentStatus;
  evaluationReportId?: string;
};

interface CandidateRowProps {
  assignment: Assignment;
  candidate: Candidate;
  role: Role;
  onStatusChange: (assignmentId: string, status: AssignmentStatus) => void;
}

export function CandidateRow({
  assignment,
  candidate,
  role,
  onStatusChange,
}: CandidateRowProps) {
  const initials = candidate.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <tr className="border-b border-zinc-800 transition-colors hover:bg-zinc-900">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 border border-zinc-800">
            <AvatarImage src={candidate.avatar || "/placeholder.svg"} />
            <AvatarFallback className="bg-zinc-800 text-xs text-zinc-200">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium text-zinc-200">{candidate.name}</div>
            <div className="font-mono text-xs text-zinc-500">
              {candidate.githubUrl?.replace("https://github.com/", "@") ||
                "No GitHub"}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <Badge
          variant="outline"
          className="border-zinc-800 bg-zinc-950 font-normal text-zinc-400"
        >
          {role.name}
        </Badge>
      </td>
      <td className="px-6 py-4">
        <MatchRateBadge
          overallMatch={assignment.overallMatch}
          communicationMatch={assignment.communicationMatch}
          codeMatch={assignment.codeMatch}
          showChart={true}
        />
      </td>
      <td className="px-6 py-4">
        <StatusSelector
          status={assignment.status}
          onStatusChange={(status) => onStatusChange(assignment.id, status)}
          variant="dropdown"
        />
      </td>
      <td className="px-6 py-4">
        {assignment.evaluationReportId ? (
          <Link href={`/evaluation/${assignment.id}`}>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            >
              View Report
            </Button>
          </Link>
        ) : (
          <span className="text-xs text-zinc-600">No report</span>
        )}
      </td>
    </tr>
  );
}
