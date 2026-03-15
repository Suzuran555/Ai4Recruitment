"use client"

import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { TicketPanel } from "~/components/ticket-panel"
import { EditorPanel } from "~/components/editor-panel"
import { PreviewPanel } from "~/components/preview-panel"
import { ActionBar } from "~/components/action-bar"
import { GripVertical } from "lucide-react"

export function AssessmentLayout() {
  const [leftWidth, setLeftWidth] = useState(25)
  const [rightWidth, setRightWidth] = useState(30)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDraggingLeft, setIsDraggingLeft] = useState(false)
  const [isDraggingRight, setIsDraggingRight] = useState(false)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      const containerRect = containerRef.current.getBoundingClientRect()
      const containerWidth = containerRect.width

      if (isDraggingLeft) {
        const newWidth = ((e.clientX - containerRect.left) / containerWidth) * 100
        setLeftWidth(Math.max(15, Math.min(40, newWidth)))
      }

      if (isDraggingRight) {
        const newWidth = ((containerRect.right - e.clientX) / containerWidth) * 100
        setRightWidth(Math.max(20, Math.min(45, newWidth)))
      }
    }

    const handleMouseUp = () => {
      setIsDraggingLeft(false)
      setIsDraggingRight(false)
    }

    if (isDraggingLeft || isDraggingRight) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDraggingLeft, isDraggingRight])

  const middleWidth = 100 - leftWidth - rightWidth

  return (
    <div className="flex h-screen flex-col bg-zinc-950">
      {/* Removed onNewChallenge prop since challenge is auto-generated */}
      <ActionBar />

      <motion.div
        ref={containerRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-1 overflow-hidden"
      >
        {/* Left Panel - Ticket */}
        <div style={{ width: `${leftWidth}%` }} className="flex flex-col border-r border-zinc-800">
          <TicketPanel />
        </div>

        {/* Left Resizer */}
        <div
          onMouseDown={() => setIsDraggingLeft(true)}
          className="group relative flex w-1 cursor-col-resize items-center justify-center bg-zinc-900 hover:bg-cyan-500/20"
        >
          <GripVertical className="h-4 w-4 text-zinc-700 group-hover:text-cyan-500" />
        </div>

        {/* Middle Panel - Editor */}
        <div style={{ width: `${middleWidth}%` }} className="flex flex-col">
          <EditorPanel />
        </div>

        {/* Right Resizer */}
        <div
          onMouseDown={() => setIsDraggingRight(true)}
          className="group relative flex w-1 cursor-col-resize items-center justify-center bg-zinc-900 hover:bg-cyan-500/20"
        >
          <GripVertical className="h-4 w-4 text-zinc-700 group-hover:text-cyan-500" />
        </div>

        {/* Right Panel - Preview */}
        <div style={{ width: `${rightWidth}%` }} className="flex flex-col border-l border-zinc-800">
          <PreviewPanel />
        </div>
      </motion.div>
    </div>
  )
}
