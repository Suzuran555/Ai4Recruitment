"use client"

import { useState, useEffect } from "react"
import { Button } from "~/components/ui/button"
import { Clock, Loader2 } from "lucide-react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"

export function ActionBar() {
  const [timeRemaining, setTimeRemaining] = useState(3600)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const handleSubmit = async () => {
    setIsSubmitting(true)
    await new Promise((resolve) => setTimeout(resolve, 2000))
    router.push("/review")
  }

  const minutes = Math.floor(timeRemaining / 60)
  const seconds = timeRemaining % 60

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-6 py-3"
    >
      <div className="flex items-center gap-4">
        <div className="font-mono text-xs uppercase tracking-wider text-cyan-400">CodeSync Assessment</div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-800/50 px-4 py-2">
          <Clock className={`h-4 w-4 ${timeRemaining < 300 ? "text-red-400" : "text-zinc-400"}`} />
          <span className={`font-mono text-sm font-semibold ${timeRemaining < 300 ? "text-red-400" : "text-white"}`}>
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </span>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          size="lg"
          className="group relative overflow-hidden bg-emerald-600 font-semibold text-white transition-all hover:bg-emerald-500 hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] disabled:opacity-70"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span>Submitting...</span>
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-green-400/20"
                animate={{
                  x: ["-100%", "100%"],
                }}
                transition={{
                  duration: 1,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "linear",
                }}
              />
            </>
          ) : (
            <span className="relative z-10">Submit PR</span>
          )}
        </Button>
      </div>
    </motion.div>
  )
}
