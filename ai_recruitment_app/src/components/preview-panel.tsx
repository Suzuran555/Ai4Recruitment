"use client"

import { ScrollArea } from "~/components/ui/scroll-area"
import { motion } from "framer-motion"
import { Chrome, RefreshCw, ExternalLink } from "lucide-react"
import { Button } from "~/components/ui/button"

export function PreviewPanel() {
  return (
    <div className="flex h-full flex-col bg-zinc-900">
      {/* Browser Header */}
      <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-800/50 px-4 py-2.5">
        <Chrome className="h-4 w-4 text-zinc-500" />
        <div className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5">
          <span className="font-mono text-xs text-zinc-500">localhost:3000</span>
        </div>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
          <RefreshCw className="h-3.5 w-3.5 text-zinc-500" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
          <ExternalLink className="h-3.5 w-3.5 text-zinc-500" />
        </Button>
      </div>

      {/* Preview Content */}
      <ScrollArea className="flex-1 bg-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="p-8"
        >
          {/* Mock App Preview */}
          <div className="mx-auto max-w-2xl space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-zinc-900">User Profile Editor</h1>
              <p className="text-zinc-600">Update your profile information</p>
            </div>

            <div className="space-y-4 rounded-lg border border-zinc-200 bg-zinc-50 p-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">Full Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">Email</label>
                <input
                  type="email"
                  placeholder="john@example.com"
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">Bio</label>
                <textarea
                  placeholder="Tell us about yourself..."
                  rows={4}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="flex gap-3">
                <button className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800">
                  Save Changes
                </button>
                <button className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
                  Cancel
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <p className="text-sm text-yellow-800">⚠️ Warning: Rapid consecutive saves may cause data inconsistency</p>
            </div>
          </div>
        </motion.div>
      </ScrollArea>
    </div>
  )
}
