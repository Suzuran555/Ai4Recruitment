"use client"

import { motion } from "framer-motion"
import { Card } from "~/components/ui/card"
import { Quote, Sparkles } from "lucide-react"

export function GoldenMoment() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
      <Card className="relative overflow-hidden border border-zinc-800 bg-gradient-to-br from-zinc-900 to-amber-950/10 p-8">
        {/* Gold Left Border */}
        <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-amber-400 to-amber-600" />

        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
            <Sparkles className="h-6 w-6 text-amber-400" />
          </div>
          <div className="flex-1">
            <div className="mb-3 flex items-center gap-2">
              <Quote className="h-4 w-4 text-amber-400" />
              <h3 className="font-semibold text-amber-400">Golden Moment</h3>
            </div>
            <blockquote className="border-l-4 border-amber-500/30 pl-4 italic leading-relaxed text-zinc-300">
              "The candidate showed exceptional patience when explaining the async logic. They not only fixed the race
              condition but took time to document the edge cases and reasoning behind the implementation. This level of
              communication and thoroughness is exactly what we look for in senior engineers."
            </blockquote>
            <div className="mt-4 flex items-center gap-2 text-sm text-zinc-500">
              <span>— AI Code Reviewer</span>
              <span>·</span>
              <span>During Phase 3 Code Review</span>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
