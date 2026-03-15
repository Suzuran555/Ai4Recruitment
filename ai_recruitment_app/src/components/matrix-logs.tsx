"use client"

import { motion } from "framer-motion"
import { Terminal } from "lucide-react"

const logs = [
  "Connecting to GitHub API...",
  "Fetching Repositories...",
  "Analyzing Commit History...",
  "Processing Code Patterns...",
  "Evaluating Tech Stack...",
  "Generating Skill Matrix...",
  "Calculating Match Score...",
  "Building Profile...",
]

export function MatrixLogs() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/90 p-6 font-mono">
      <div className="mb-4 flex items-center gap-2 text-emerald-400">
        <Terminal className="h-4 w-4" />
        <span className="text-sm">Analysis in progress...</span>
      </div>
      <div className="space-y-2">
        {logs.map((log, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.4, duration: 0.3 }}
            className="flex items-center gap-3"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.4 + 0.2 }}
              className="h-2 w-2 rounded-full bg-emerald-400"
            />
            <span className="text-sm text-emerald-400">{log}</span>
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ delay: index * 0.4 + 0.3, duration: 0.5, repeat: 2 }}
              className="text-emerald-400"
            >
              ✓
            </motion.span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
