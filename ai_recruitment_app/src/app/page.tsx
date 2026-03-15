"use client";

import { Button } from "~/components/ui/button";
import { AnimatedGrid } from "~/components/animated-grid";
import { CommandInput } from "~/components/command-input";
import { ProfileBento } from "~/components/profile-bento";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

export default function CodeSyncLanding() {
  const [view, setView] = useState<"hero" | "sourcing" | "result">("hero");
  const [isLoading, setIsLoading] = useState(false);

  const handleHiring = () => {
    window.location.href = "/hr";
  };

  const handleCandidate = () => {
    window.location.href = "/candidate";
  };

  const handleSubmit = (githubId: string) => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setView("result");
    }, 4000);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950">
      <AnimatedGrid />

      <div className="relative z-10">
        <AnimatePresence mode="wait">
          {/* Hero Section */}
          {view === "hero" && (
            <motion.div
              key="hero"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="container mx-auto flex min-h-screen flex-col items-center justify-center px-4"
            >
              {/* Logo/Brand */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="mb-4 text-center"
              >
                <div className="mb-2 font-mono text-sm tracking-widest text-cyan-400 uppercase">
                  CodeSync
                </div>
              </motion.div>

              {/* Main Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-6 max-w-4xl text-center text-5xl font-bold tracking-tight text-balance text-white md:text-6xl lg:text-7xl"
              >
                Don't Hire Resumes.{" "}
                <span className="bg-linear-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  Hire Code.
                </span>
              </motion.h1>

              {/* Subheadline */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mb-12 max-w-2xl text-center text-lg text-balance text-zinc-400 md:text-xl"
              >
                Decode developer DNA through AI-powered code analysis. Match
                talent with precision.
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col gap-4 sm:flex-row"
              >
                <Button
                  onClick={handleHiring}
                  size="lg"
                  className="bg-white px-8 py-6 text-lg font-semibold text-zinc-950 transition-all hover:scale-105 hover:bg-zinc-100"
                >
                  I'm Hiring
                </Button>
                <Button
                  onClick={handleCandidate}
                  size="lg"
                  variant="outline"
                  className="group relative overflow-hidden border-2 border-cyan-400/50 bg-transparent px-8 py-6 text-lg font-semibold text-cyan-400 transition-all hover:scale-105 hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(34,211,238,0.3)]"
                >
                  <span className="relative z-10">I'm a Candidate</span>
                  <div className="absolute inset-0 bg-cyan-400/10 opacity-0 transition-opacity group-hover:opacity-100" />
                </Button>
              </motion.div>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-3 md:gap-16"
              >
                <div className="text-center">
                  <div className="mb-2 bg-linear-to-r from-cyan-400 to-blue-500 bg-clip-text text-4xl font-bold text-transparent">
                    98%
                  </div>
                  <div className="text-sm text-zinc-500">Match Accuracy</div>
                </div>
                <div className="text-center">
                  <div className="mb-2 bg-linear-to-r from-cyan-400 to-blue-500 bg-clip-text text-4xl font-bold text-transparent">
                    2.5s
                  </div>
                  <div className="text-sm text-zinc-500">Analysis Time</div>
                </div>
                <div className="text-center">
                  <div className="mb-2 bg-linear-to-r from-cyan-400 to-blue-500 bg-clip-text text-4xl font-bold text-transparent">
                    50k+
                  </div>
                  <div className="text-sm text-zinc-500">
                    Developers Analyzed
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Sourcing View */}
          {view === "sourcing" && (
            <motion.div
              key="sourcing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="container mx-auto flex min-h-screen flex-col items-center justify-center px-4"
            >
              <CommandInput onSubmit={handleSubmit} isLoading={isLoading} />
            </motion.div>
          )}

          {/* Result View */}
          {view === "result" && (
            <motion.div
              key="result"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="container mx-auto min-h-screen px-4 py-12"
            >
              <div className="mb-8 flex items-center justify-between">
                <Button
                  onClick={() => setView("sourcing")}
                  variant="ghost"
                  className="text-zinc-400 hover:text-white"
                >
                  ← Back to Search
                </Button>
              </div>
              <ProfileBento />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
