"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";

type JobCardModel = {
  id: number;
  title: string;
  description: string | null;
  matchThreshold: number;
  hr?: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
};

interface RoleCardProps {
  role: JobCardModel;
  candidateCount: number;
  currentUserId?: string; // 当前登录的 HR 用户 ID
  onRemove?: (roleId: number) => void;
}

function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  if (name) {
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
  }
  if (email) {
    return email[0]?.toUpperCase() ?? "HR";
  }
  return "HR";
}

export function RoleCard({ role, candidateCount, currentUserId, onRemove }: RoleCardProps) {
  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onRemove) return;
    if (confirm(`Are you sure you want to remove "${role.title}"?`)) {
      onRemove(role.id);
    }
  };

  const isOwnJob = currentUserId && role.hr?.id === currentUserId;
  const hrName = role.hr?.name ?? role.hr?.email ?? "Unknown HR";
  const hrInitials = getInitials(role.hr?.name, role.hr?.email);

  return (
    <Link href={`/hr/roles/${role.id}`}>
      <Card className="cursor-pointer border border-zinc-800 bg-zinc-900 transition-colors hover:bg-zinc-800/50">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-semibold text-zinc-100">
                {role.title}
              </CardTitle>
              {/* HR 信息 */}
              {role.hr && (
                <div className="mt-2 flex items-center gap-2">
                  <Avatar className="h-6 w-6 border border-zinc-700">
                    <AvatarImage src={role.hr.image ?? undefined} />
                    <AvatarFallback className="bg-zinc-800 text-xs text-zinc-200">
                      {hrInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-zinc-400">
                      {isOwnJob ? "You" : hrName}
                    </p>
                    {!isOwnJob && (
                      <p className="truncate font-mono text-xs text-zinc-500">
                        {role.hr.id.substring(0, 8)}...
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <Button
              size="icon"
              variant="ghost"
              disabled={!onRemove || !isOwnJob}
              className="h-8 w-8 text-zinc-500 hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed"
              onClick={handleRemove}
              title={!isOwnJob ? "You can only delete your own jobs" : "Delete job"}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {role.description && (
              <p className="line-clamp-2 text-sm text-zinc-400">
                {role.description}
              </p>
            )}
            <div className="flex items-center gap-4 text-xs text-zinc-500">
              <span>{candidateCount} candidates</span>
              <span>Threshold: {role.matchThreshold}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
