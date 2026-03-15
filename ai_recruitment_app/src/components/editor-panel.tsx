"use client"

import { useState } from "react"
import { ScrollArea } from "~/components/ui/scroll-area"
import { motion } from "framer-motion"
import { FileCode, X } from "lucide-react"

const files = [
  { name: "App.tsx", active: true },
  { name: "utils.ts", active: false },
  { name: "types.ts", active: false },
]

const codeContent = `import { useState, useEffect } from 'react'
import { UserProfile } from './types'
import { saveProfile } from './utils'

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // TODO: Fix race condition here
  const handleSave = async (data: UserProfile) => {
    setIsSaving(true)
    try {
      const result = await saveProfile(data)
      setProfile(result)
    } catch (error) {
      console.error('Save failed:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="container">
      <h1>User Profile Editor</h1>
      {/* Profile form components */}
    </div>
  )
}`

export function EditorPanel() {
  const [activeFile, setActiveFile] = useState("App.tsx")

  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: "#1e1e1e" }}>
      {/* File Tabs */}
      <div className="flex border-b border-zinc-800 bg-[#252526]">
        {files.map((file, index) => (
          <motion.div
            key={file.name}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`group flex items-center gap-2 border-r border-zinc-800 px-4 py-2.5 transition-colors ${
              file.name === activeFile
                ? "bg-[#1e1e1e] text-white"
                : "text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300"
            }`}
            onClick={() => setActiveFile(file.name)}
          >
            <FileCode className="h-3.5 w-3.5" />
            <span className="text-sm font-mono">{file.name}</span>
            <button className="opacity-0 transition-opacity group-hover:opacity-100">
              <X className="h-3 w-3 hover:text-white" />
            </button>
          </motion.div>
        ))}
      </div>

      {/* Editor Content */}
      <ScrollArea className="flex-1">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="p-4">
          <pre className="font-mono text-sm leading-relaxed" style={{ fontFamily: "JetBrains Mono, monospace" }}>
            {codeContent.split("\n").map((line, i) => (
              <div key={i} className="flex">
                <span className="mr-6 inline-block w-8 select-none text-right text-zinc-600">{i + 1}</span>
                <code className="text-zinc-300">
                  {line.includes("TODO") ? (
                    <span className="text-yellow-500">{line}</span>
                  ) : line.includes("import") || line.includes("export") ? (
                    <span className="text-pink-400">{line}</span>
                  ) : line.includes("const") || line.includes("async") ? (
                    <span className="text-purple-400">{line}</span>
                  ) : line.includes("//") ? (
                    <span className="text-green-500">{line}</span>
                  ) : (
                    line
                  )}
                </code>
              </div>
            ))}
          </pre>
        </motion.div>
      </ScrollArea>

      {/* Status Bar */}
      <div className="flex items-center justify-between border-t border-zinc-800 bg-[#252526] px-4 py-1.5 text-xs">
        <div className="flex gap-4 text-zinc-500">
          <span>UTF-8</span>
          <span>TypeScript JSX</span>
          <span>Ln 12, Col 7</span>
        </div>
        <div className="text-zinc-500">Prettier</div>
      </div>
    </div>
  )
}
