"use client"

import { Card } from "~/components/ui/card"
import { Badge } from "~/components/ui/badge"
import { FileCode, Plus, Minus } from "lucide-react"
import { motion } from "framer-motion"

const originalCode = `import { useState, useEffect } from 'react'

export function UserProfile({ userId }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSave = async (data) => {
    setLoading(true)
    const response = await fetch(\`/api/users/\${userId}\`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
    const result = await response.json()
    setProfile(result)
    setLoading(false)
  }

  return (
    <div>
      <button onClick={() => handleSave(profile)}>
        Save Profile
      </button>
    </div>
  )
}`

const modifiedCode = `import { useState, useEffect, useRef } from 'react'

export function UserProfile({ userId }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)
  const saveInProgressRef = useRef(false)

  const handleSave = async (data) => {
    if (saveInProgressRef.current) {
      console.log('Save already in progress')
      return
    }

    saveInProgressRef.current = true
    setLoading(true)
    
    try {
      const response = await fetch(\`/api/users/\${userId}\`, {
        method: 'PUT',
        body: JSON.stringify(data)
      })
      const result = await response.json()
      setProfile(result)
    } catch (error) {
      console.error('Save failed:', error)
    } finally {
      setLoading(false)
      saveInProgressRef.current = false
    }
  }

  return (
    <div>
      <button 
        onClick={() => handleSave(profile)}
        disabled={loading}
      >
        {loading ? 'Saving...' : 'Save Profile'}
      </button>
    </div>
  )
}`

export function DiffViewer() {
  return (
    <Card className="overflow-hidden border border-zinc-800 bg-zinc-900/50 backdrop-blur">
      <div className="border-b border-zinc-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileCode className="h-5 w-5 text-cyan-400" />
            <span className="font-mono text-sm text-white">App.tsx</span>
            <Badge variant="secondary" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
              Modified
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1 text-emerald-400">
              <Plus className="h-3 w-3" />
              <span>+12</span>
            </div>
            <div className="flex items-center gap-1 text-red-400">
              <Minus className="h-3 w-3" />
              <span>-4</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2">
        {/* Original Code */}
        <div className="border-r border-zinc-800">
          <div className="border-b border-zinc-800 bg-zinc-900 px-4 py-2">
            <span className="font-mono text-xs text-zinc-500">Original</span>
          </div>
          <div className="bg-[#1e1e1e] p-4">
            <pre className="font-mono text-xs leading-relaxed">
              {originalCode.split("\n").map((line, i) => {
                const isRemoved = i === 1 || i === 7 || i === 12 || i === 17
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className={`flex ${isRemoved ? "bg-red-500/10" : ""}`}
                  >
                    <span className="mr-4 inline-block w-8 select-none text-right text-zinc-600">{i + 1}</span>
                    <span className={isRemoved ? "text-red-400" : "text-zinc-300"}>{line || " "}</span>
                  </motion.div>
                )
              })}
            </pre>
          </div>
        </div>

        {/* Modified Code */}
        <div>
          <div className="border-b border-zinc-800 bg-zinc-900 px-4 py-2">
            <span className="font-mono text-xs text-zinc-500">Modified</span>
          </div>
          <div className="bg-[#1e1e1e] p-4">
            <pre className="font-mono text-xs leading-relaxed">
              {modifiedCode.split("\n").map((line, i) => {
                const isAdded = [1, 4, 7, 8, 9, 10, 14, 15, 16, 17, 18, 19, 25, 26].includes(i)
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className={`flex ${isAdded ? "bg-emerald-500/10" : ""}`}
                  >
                    <span className="mr-4 inline-block w-8 select-none text-right text-zinc-600">{i + 1}</span>
                    <span className={isAdded ? "text-emerald-400" : "text-zinc-300"}>{line || " "}</span>
                  </motion.div>
                )
              })}
            </pre>
          </div>
        </div>
      </div>
    </Card>
  )
}
