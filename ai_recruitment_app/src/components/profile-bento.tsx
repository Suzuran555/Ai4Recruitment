"use client"

import { motion } from "framer-motion"
import { Card } from "~/components/ui/card"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { Github, TrendingUp, Code2, Award, GitBranch, Star } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { TransitionLoader } from "~/components/transition-loader"

export function ProfileBento() {
  const [showTransition, setShowTransition] = useState(false)
  const router = useRouter()

  const handleStartChallenge = () => {
    setShowTransition(true)
    setTimeout(() => {
      router.push("/assessment")
    }, 4500)
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  }

  return (
    <>
      {showTransition && <TransitionLoader />}

      <motion.div variants={container} initial="hidden" animate="show" className="mx-auto max-w-7xl">
        {/* Header */}
        <motion.div variants={item} className="mb-8">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500">
              <Github className="h-10 w-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Linus Torvalds</h1>
              <p className="text-zinc-500">@torvalds</p>
            </div>
          </div>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Card 1: Match Score - Large */}
          <motion.div variants={item} className="md:col-span-2 lg:col-span-1 lg:row-span-2">
            <Card className="group relative h-full overflow-hidden border-2 border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-8 transition-all hover:border-cyan-400/50 hover:shadow-[0_0_30px_rgba(34,211,238,0.15)]">
              <div className="flex h-full flex-col items-center justify-center text-center">
                <Award className="mb-4 h-12 w-12 text-cyan-400" />
                <div className="mb-2 text-sm font-mono uppercase tracking-widest text-zinc-500">Match Score</div>
                <div className="relative mb-6">
                  {/* Circular Progress */}
                  <svg className="h-48 w-48" viewBox="0 0 200 200">
                    <circle cx="100" cy="100" r="85" fill="none" stroke="rgba(39, 39, 42, 1)" strokeWidth="12" />
                    <motion.circle
                      cx="100"
                      cy="100"
                      r="85"
                      fill="none"
                      stroke="url(#gradient)"
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeDasharray={534}
                      initial={{ strokeDashoffset: 534 }}
                      animate={{ strokeDashoffset: 534 - (534 * 85) / 100 }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#22d3ee" />
                        <stop offset="100%" stopColor="#3b82f6" />
                      </linearGradient>
                    </defs>
                    <text x="100" y="100" textAnchor="middle" dy="0.3em" className="fill-white text-5xl font-bold">
                      85%
                    </text>
                  </svg>
                </div>
                <p className="text-zinc-400">Excellent match for Senior Backend Role</p>
              </div>
            </Card>
          </motion.div>

          {/* Card 2: Tech Stack */}
          <motion.div variants={item} className="md:col-span-2 lg:col-span-2">
            <Card className="h-full border-2 border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-sm transition-all hover:border-zinc-700">
              <div className="mb-4 flex items-center gap-2">
                <Code2 className="h-5 w-5 text-cyan-400" />
                <h3 className="text-lg font-semibold text-white">Tech Stack</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className="border-amber-500/50 bg-amber-500/10 px-4 py-2 text-amber-400 hover:bg-amber-500/20">
                  <Star className="mr-1 h-3 w-3" />
                  React Expert
                </Badge>
                <Badge className="border-cyan-500/50 bg-cyan-500/10 px-4 py-2 text-cyan-400 hover:bg-cyan-500/20">
                  TypeScript
                </Badge>
                <Badge className="border-blue-500/50 bg-blue-500/10 px-4 py-2 text-blue-400 hover:bg-blue-500/20">
                  Node.js
                </Badge>
                <Badge className="border-green-500/50 bg-green-500/10 px-4 py-2 text-green-400 hover:bg-green-500/20">
                  Python
                </Badge>
                <Badge className="border-purple-500/50 bg-purple-500/10 px-4 py-2 text-purple-400 hover:bg-purple-500/20">
                  Go
                </Badge>
                <Badge className="border-zinc-600/50 bg-zinc-700/10 px-4 py-2 text-zinc-400 hover:bg-zinc-700/20">
                  Junior SQL
                </Badge>
                <Badge className="border-cyan-500/50 bg-cyan-500/10 px-4 py-2 text-cyan-400 hover:bg-cyan-500/20">
                  Docker
                </Badge>
                <Badge className="border-blue-500/50 bg-blue-500/10 px-4 py-2 text-blue-400 hover:bg-blue-500/20">
                  Kubernetes
                </Badge>
              </div>
            </Card>
          </motion.div>

          {/* Card 3: Code DNA */}
          <motion.div variants={item} className="md:col-span-1">
            <Card className="h-full border-2 border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-sm transition-all hover:border-zinc-700">
              <div className="mb-4 flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-cyan-400" />
                <h3 className="text-lg font-semibold text-white">Code DNA</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Code Quality</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-32 overflow-hidden rounded-full bg-zinc-800">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "90%" }}
                        transition={{ duration: 1, delay: 0.3 }}
                        className="h-full bg-gradient-to-r from-cyan-400 to-blue-500"
                      />
                    </div>
                    <span className="text-sm font-semibold text-white">90%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Consistency</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-32 overflow-hidden rounded-full bg-zinc-800">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "85%" }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className="h-full bg-gradient-to-r from-cyan-400 to-blue-500"
                      />
                    </div>
                    <span className="text-sm font-semibold text-white">85%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">Documentation</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-32 overflow-hidden rounded-full bg-zinc-800">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "75%" }}
                        transition={{ duration: 1, delay: 0.7 }}
                        className="h-full bg-gradient-to-r from-cyan-400 to-blue-500"
                      />
                    </div>
                    <span className="text-sm font-semibold text-white">75%</span>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Card 4: Activity */}
          <motion.div variants={item} className="md:col-span-1">
            <Card className="h-full border-2 border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-sm transition-all hover:border-zinc-700">
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-cyan-400" />
                <h3 className="text-lg font-semibold text-white">Activity</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="mb-1 text-3xl font-bold text-white">847</div>
                  <div className="text-sm text-zinc-500">Commits (90 days)</div>
                </div>
                <div>
                  <div className="mb-1 text-3xl font-bold text-white">23</div>
                  <div className="text-sm text-zinc-500">Active Repositories</div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Card 5: Code Analysis */}
          <motion.div variants={item} className="md:col-span-2 lg:col-span-3">
            <Card className="border-2 border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-sm transition-all hover:border-zinc-700">
              <div className="mb-4 flex items-center gap-2">
                <Code2 className="h-5 w-5 text-cyan-400" />
                <h3 className="text-lg font-semibold text-white">Code Analysis</h3>
              </div>
              <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 p-4 font-mono text-sm">
                <pre className="text-emerald-400">
                  <code>{`function analyzeCommitPattern(commits) {
  const patterns = commits.map(c => ({
    frequency: calculateFrequency(c),
    complexity: assessComplexity(c.diff),
    impact: measureImpact(c.changes)
  }));
  
  return {
    consistency: 0.92,
    quality: 0.88,
    collaboration: 0.85
  };
}`}</code>
                </pre>
              </div>
            </Card>
          </motion.div>
        </div>

        <motion.div variants={item} className="mt-8 flex justify-center">
          <Button
            onClick={handleStartChallenge}
            size="lg"
            className="group relative overflow-hidden bg-emerald-600 px-12 py-6 text-lg font-semibold text-white transition-all hover:bg-emerald-500 hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]"
          >
            <span className="relative z-10">Start Coding Challenge</span>
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-green-400/20"
              animate={{
                x: ["-100%", "100%"],
              }}
              transition={{
                duration: 2,
                repeat: Number.POSITIVE_INFINITY,
                ease: "linear",
              }}
            />
          </Button>
        </motion.div>
      </motion.div>
    </>
  )
}
