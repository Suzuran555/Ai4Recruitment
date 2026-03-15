"use client"

import { Badge } from "~/components/ui/badge"
import { AlertCircle, Clock, User } from "lucide-react"
import { motion } from "framer-motion"

export function TicketPanel() {
  return (
    <div className="flex h-full flex-col bg-zinc-900">
      <div className="border-b border-zinc-800 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Badge variant="secondary" className="border-cyan-500/20 bg-cyan-500/10 text-cyan-400">
            TASK-1337
          </Badge>
          <Badge variant="secondary" className="border-orange-500/20 bg-orange-500/10 text-orange-400">
            High Priority
          </Badge>
        </div>
        <h2 className="text-xl font-semibold text-white">Fix the Race Condition</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 text-sm">
          <div className="flex flex-wrap gap-4 text-xs text-zinc-500">
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span>Assigned to: You</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Created: 2 hours ago</span>
            </div>
          </div>

          <div>
            <h3 className="mb-2 flex items-center gap-2 font-semibold text-white">
              <AlertCircle className="h-4 w-4 text-cyan-400" />
              Problem Description
            </h3>
            <div className="space-y-3 leading-relaxed text-zinc-400">
              <p>
                The user profile component is experiencing intermittent data corruption when multiple updates occur
                simultaneously. This happens when users rapidly click the "Save" button.
              </p>
              <p>
                The issue manifests as outdated data being displayed after successful save operations, and occasionally
                causes the UI to freeze temporarily.
              </p>
            </div>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-white">Steps to Reproduce</h3>
            <ol className="ml-5 list-decimal space-y-2 text-zinc-400">
              <li>Open the user profile editor</li>
              <li>Make multiple changes rapidly</li>
              <li>Click "Save" multiple times quickly</li>
              <li>Observe inconsistent state updates</li>
            </ol>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-white">Expected Behavior</h3>
            <div className="rounded-md border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-emerald-400">
              The component should handle concurrent updates gracefully, ensuring data consistency and preventing race
              conditions.
            </div>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-white">Technical Details</h3>
            <div className="space-y-2">
              <div className="flex items-start gap-2 rounded-md border border-zinc-800 bg-zinc-950 p-3">
                <span className="font-mono text-xs text-cyan-400">File:</span>
                <span className="font-mono text-xs text-zinc-400">App.tsx</span>
              </div>
              <div className="flex items-start gap-2 rounded-md border border-zinc-800 bg-zinc-950 p-3">
                <span className="font-mono text-xs text-cyan-400">Function:</span>
                <span className="font-mono text-xs text-zinc-400">handleSave()</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-white">Acceptance Criteria</h3>
            <ul className="ml-5 list-disc space-y-2 text-zinc-400">
              <li>Prevent multiple simultaneous save operations</li>
              <li>Display loading state during save</li>
              <li>Ensure data consistency across all updates</li>
              <li>Add proper error handling</li>
            </ul>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
