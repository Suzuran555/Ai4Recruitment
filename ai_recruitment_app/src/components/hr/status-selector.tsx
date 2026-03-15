"use client";

import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Circle,
  Hourglass,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

export type AssignmentStatus =
  | "pending"
  | "not_started"
  | "in_progress"
  | "completed"
  | "flagged"
  | "proceed"
  | "rejected"
  | "waitlisted"
  | "expired";

interface StatusSelectorProps {
  status: AssignmentStatus | string;
  onStatusChange: (status: AssignmentStatus) => void;
  variant?: "buttons" | "dropdown";
}

export function StatusSelector({
  status,
  onStatusChange,
  variant = "dropdown",
}: StatusSelectorProps) {
  if (variant === "buttons") {
    return (
      <div className="flex gap-1">
        <Button
          size="sm"
          variant={status === "proceed" ? "default" : "outline"}
          className={`h-7 text-xs ${
            status === "proceed"
              ? "bg-emerald-600 text-white hover:bg-emerald-500"
              : "border-zinc-800 text-zinc-400 hover:bg-zinc-900"
          }`}
          onClick={() => onStatusChange("proceed")}
        >
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Proceed
        </Button>
        <Button
          size="sm"
          variant={status === "rejected" ? "default" : "outline"}
          className={`h-7 text-xs ${
            status === "rejected"
              ? "bg-red-600 text-white hover:bg-red-500"
              : "border-zinc-800 text-zinc-400 hover:bg-zinc-900"
          }`}
          onClick={() => onStatusChange("rejected")}
        >
          <XCircle className="mr-1 h-3 w-3" />
          Reject
        </Button>
        <Button
          size="sm"
          variant={status === "pending" ? "default" : "outline"}
          className={`h-7 text-xs ${
            status === "pending"
              ? "bg-amber-600 text-white hover:bg-amber-500"
              : "border-zinc-800 text-zinc-400 hover:bg-zinc-900"
          }`}
          onClick={() => onStatusChange("pending")}
        >
          <Clock className="mr-1 h-3 w-3" />
          Pending
        </Button>
      </div>
    );
  }

  const getStatusLabel = (s: string) => {
    switch (s) {
      case "not_started":
        return "Not Started";
      case "in_progress":
        return "In Progress";
      case "completed":
        return "Completed";
      case "flagged":
        return "Flagged";
      case "proceed":
        return "Proceed";
      case "rejected":
        return "Rejected";
      case "waitlisted":
        return "Waitlisted";
      case "expired":
        return "Expired";
      default:
        return s;
    }
  };

  const getStatusIcon = (s: string) => {
    switch (s) {
      case "not_started":
        return <Circle className="h-3 w-3" />;
      case "in_progress":
        return <Loader2 className="h-3 w-3 animate-spin" />;
      case "completed":
        return <CheckCircle2 className="h-3 w-3" />;
      case "flagged":
        return <AlertTriangle className="h-3 w-3" />;
      case "proceed":
        return <CheckCircle2 className="h-3 w-3" />;
      case "rejected":
        return <XCircle className="h-3 w-3" />;
      case "waitlisted":
        return <Hourglass className="h-3 w-3" />;
      case "expired":
        return <Clock className="h-3 w-3" />;
      default:
        return <Circle className="h-3 w-3" />;
    }
  };

  return (
    <Select
      value={status}
      onValueChange={(value) => onStatusChange(value as AssignmentStatus)}
    >
      <SelectTrigger className="h-8 w-40 border-zinc-800 bg-zinc-950 text-xs text-zinc-100">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="border-zinc-800 bg-zinc-900">
        <SelectItem value="not_started">
          <div className="flex items-center gap-2">
            {getStatusIcon("not_started")}
            <span>Not Started</span>
          </div>
        </SelectItem>
        <SelectItem value="in_progress">
          <div className="flex items-center gap-2">
            {getStatusIcon("in_progress")}
            <span>In Progress</span>
          </div>
        </SelectItem>
        <SelectItem value="completed">
          <div className="flex items-center gap-2">
            {getStatusIcon("completed")}
            <span>Completed</span>
          </div>
        </SelectItem>
        <SelectItem value="flagged">
          <div className="flex items-center gap-2">
            {getStatusIcon("flagged")}
            <span>Flagged</span>
          </div>
        </SelectItem>
        <SelectItem value="proceed">
          <div className="flex items-center gap-2">
            {getStatusIcon("proceed")}
            <span>Proceed</span>
          </div>
        </SelectItem>
        <SelectItem value="rejected">
          <div className="flex items-center gap-2">
            {getStatusIcon("rejected")}
            <span>Rejected</span>
          </div>
        </SelectItem>
        <SelectItem value="waitlisted">
          <div className="flex items-center gap-2">
            {getStatusIcon("waitlisted")}
            <span>Waitlisted</span>
          </div>
        </SelectItem>
        <SelectItem value="expired">
          <div className="flex items-center gap-2">
            {getStatusIcon("expired")}
            <span>Expired</span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
