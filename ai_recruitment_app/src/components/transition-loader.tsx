"use client"

import { motion } from "framer-motion"
import { useState, useEffect } from "react"

const loadingSteps = [
  "Connecting to GitHub API...",
  "Analyzing code patterns...",
  "Configuring development environment...",
  "Cloning code repository...",
  "Installing dependencies...",
  "Injecting business bugs...",
  "Preparing IDE workspace...",
]

export function TransitionLoader() {
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < loadingSteps.length - 1) {
          return prev + 1
        }
        return prev
      })
    }, 600)

    return () => clearInterval(interval)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950"
    >
      <div className="w-full max-w-2xl px-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-8 text-center"
        >
          <h2 className="mb-2 text-3xl font-bold text-white">Initializing Challenge</h2>
          <p className="text-zinc-500">Preparing your coding environment...</p>
        </motion.div>

        <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 font-mono text-sm backdrop-blur">
          {loadingSteps.map((step, index) => (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: -20 }}
              animate={{
                opacity: index <= currentStep ? 1 : 0.3,
                x: 0,
              }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-3"
            >
              {index < currentStep ? (
                <span className="text-emerald-400">✓</span>
              ) : index === currentStep ? (
                <motion.span
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
                  className="text-cyan-400"
                >
                  ▸
                </motion.span>
              ) : (
                <span className="text-zinc-700">○</span>
              )}
              <span className={index <= currentStep ? "text-emerald-400" : "text-zinc-600"}>{step}</span>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ duration: 4.5, ease: "linear" }}
          className="mt-6 h-1 rounded-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-blue-500"
        />
      </div>
    </motion.div>
  )
}
