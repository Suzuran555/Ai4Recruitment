"use client"

import type React from "react"

import { useState } from "react"
import { Input } from "~/components/ui/input"
import { Button } from "~/components/ui/button"
import { Search, Terminal } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { MatrixLogs } from "~/components/matrix-logs"

interface CommandInputProps {
  onSubmit: (githubId: string) => void
  isLoading: boolean
}

export function CommandInput({ onSubmit, isLoading }: CommandInputProps) {
  const [githubId, setGithubId] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (githubId.trim()) {
      onSubmit(githubId.trim())
    }
  }

  return (
    <div className="w-full max-w-3xl space-y-8">
      {/* Command Palette Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <div className="mb-4 flex items-center justify-center gap-2 text-cyan-400">
          <Terminal className="h-6 w-6" />
          <span className="font-mono text-sm uppercase tracking-widest">Source Talent</span>
        </div>
        <h2 className="text-3xl font-bold text-white">Enter GitHub Profile</h2>
        <p className="mt-2 text-zinc-500">We'll analyze their code DNA in seconds</p>
      </motion.div>

      {/* Command Palette Input */}
      <motion.form
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        onSubmit={handleSubmit}
        className="relative"
      >
        <div className="group relative overflow-hidden rounded-xl border-2 border-zinc-800 bg-zinc-900/50 backdrop-blur-sm transition-all focus-within:border-cyan-400/50 focus-within:shadow-[0_0_30px_rgba(34,211,238,0.2)] hover:border-zinc-700">
          <div className="flex items-center gap-4 p-6">
            <Search className="h-6 w-6 text-zinc-500 transition-colors group-focus-within:text-cyan-400" />
            <Input
              type="text"
              value={githubId}
              onChange={(e) => setGithubId(e.target.value)}
              placeholder="Enter GitHub ID (e.g., torvalds)..."
              disabled={isLoading}
              className="border-0 bg-transparent text-lg text-white placeholder:text-zinc-600 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <div className="flex items-center gap-2 font-mono text-xs text-zinc-600">
              <kbd className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1">⌘</kbd>
              <kbd className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1">K</kbd>
            </div>
          </div>
        </div>

        <Button
          type="submit"
          disabled={!githubId.trim() || isLoading}
          className="mt-4 w-full bg-cyan-500 py-6 text-lg font-semibold text-zinc-950 transition-all hover:bg-cyan-400 disabled:opacity-50"
        >
          {isLoading ? "Analyzing..." : "Analyze Profile"}
        </Button>
      </motion.form>

      {/* Matrix Loading Logs */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <MatrixLogs />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Examples */}
      {!isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap justify-center gap-2"
        >
          <span className="text-sm text-zinc-600">Try:</span>
          {["torvalds", "gaearon", "tj"].map((example) => (
            <button
              key={example}
              onClick={() => setGithubId(example)}
              className="rounded-full border border-zinc-800 bg-zinc-900/50 px-3 py-1 text-sm text-zinc-400 transition-all hover:border-cyan-400/50 hover:text-cyan-400"
            >
              {example}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  )
}
