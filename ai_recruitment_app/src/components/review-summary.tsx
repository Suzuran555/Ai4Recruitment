"use client"

import { Card } from "~/components/ui/card"
import { Badge } from "~/components/ui/badge"
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import { motion } from "framer-motion"

export function ReviewSummary() {
  return (
    <Card className="border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="mb-2 text-2xl font-bold text-white">Code Review Summary</h2>
          <p className="text-sm text-zinc-400">Automated analysis of your pull request</p>
        </div>
        <Badge variant="secondary" className="border-yellow-500/20 bg-yellow-500/10 text-yellow-400">
          In Review
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Tests Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-zinc-400">Test Results</span>
            <AlertCircle className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="mb-2 text-3xl font-bold text-red-400">4/5</div>
          <p className="text-xs text-zinc-500">One test case failed</p>
          <div className="mt-3 space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              <span className="text-zinc-400">Race condition fixed</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              <span className="text-zinc-400">Error handling added</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              <span className="text-zinc-400">Loading state improved</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              <span className="text-zinc-400">Button disabled correctly</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <XCircle className="h-3 w-3 text-red-400" />
              <span className="text-zinc-400">Edge case not covered</span>
            </div>
          </div>
        </motion.div>

        {/* Code Quality */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-zinc-400">Code Quality</span>
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="mb-2 text-3xl font-bold text-emerald-400">A+</div>
          <p className="text-xs text-zinc-500">Excellent code practices</p>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-400">Readability</span>
              <span className="text-white">95%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "95%" }}
                transition={{ duration: 1, delay: 0.5 }}
                className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400"
              />
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-zinc-400">Maintainability</span>
              <span className="text-white">88%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "88%" }}
                transition={{ duration: 1, delay: 0.7 }}
                className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400"
              />
            </div>
          </div>
        </motion.div>

        {/* Security */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-zinc-400">Security Scan</span>
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="mb-2 text-3xl font-bold text-emerald-400">Pass</div>
          <p className="text-xs text-zinc-500">No vulnerabilities found</p>
          <div className="mt-3 space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              <span className="text-zinc-400">No XSS vulnerabilities</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              <span className="text-zinc-400">No SQL injection risks</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              <span className="text-zinc-400">Dependencies up to date</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* AI Feedback */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-6 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4"
      >
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/10">
            <CheckCircle2 className="h-4 w-4 text-cyan-400" />
          </div>
          <span className="font-semibold text-cyan-400">AI Recommendation</span>
        </div>
        <p className="text-sm leading-relaxed text-zinc-300">
          Great job fixing the race condition! The use of{" "}
          <code className="rounded bg-zinc-800 px-1 py-0.5 font-mono text-xs text-cyan-400">useRef</code> to track save
          state is the correct approach. Consider adding a test case for rapid successive clicks to ensure the fix works
          as expected.
        </p>
      </motion.div>
    </Card>
  )
}
