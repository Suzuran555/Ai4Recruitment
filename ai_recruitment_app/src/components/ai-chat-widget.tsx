"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Bot, X, Send, Sparkles } from "lucide-react";

interface Message {
  role: "ai" | "user";
  content: string;
}

export function AIChatWidget() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      content:
        "Hello! I'm your AI interviewer. I'm here to help you prepare for technical interviews by asking relevant questions and providing feedback. How would you like to start?",
    },
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;

    setMessages((prev) => [...prev, { role: "user", content: input }]);
    setInput("");

    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content:
            "Great question! That's a solid approach. Let me ask you another one: Can you explain the difference between useEffect and useLayoutEffect, and when you'd choose one over the other?",
        },
      ]);
    }, 2000);
  };

  return (
    <>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed right-6 bottom-24 z-50 w-96"
          >
            <Card className="overflow-hidden border border-cyan-500/30 bg-zinc-900/95 shadow-2xl shadow-cyan-500/10 backdrop-blur-xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-800 bg-gradient-to-r from-zinc-900 to-zinc-800 p-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/10">
                    <Sparkles className="h-4 w-4 text-cyan-400" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">
                      AI Interviewer
                    </div>
                    <div className="text-xs text-zinc-500">
                      Ready to interview
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => setIsExpanded(false)}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-zinc-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Messages */}
              <div className="h-96 space-y-4 overflow-y-auto p-4">
                {messages.map((message, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <Card
                      className={`max-w-[80%] p-3 ${
                        message.role === "ai"
                          ? "border-cyan-500/20 bg-cyan-500/5 text-zinc-200"
                          : "border-zinc-700 bg-zinc-800 text-white"
                      }`}
                    >
                      {message.role === "ai" && (
                        <div className="mb-1 flex items-center gap-1 text-xs text-cyan-400">
                          <Bot className="h-3 w-3" />
                          <span>AI Reviewer</span>
                        </div>
                      )}
                      <p className="text-sm leading-relaxed">
                        {message.content}
                      </p>
                    </Card>
                  </motion.div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <Card className="border-cyan-500/20 bg-cyan-500/5 p-3">
                      <div className="flex items-center gap-2">
                        <Bot className="h-3 w-3 text-cyan-400" />
                        <div className="flex gap-1">
                          <motion.span
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{
                              duration: 1.5,
                              repeat: Number.POSITIVE_INFINITY,
                              delay: 0,
                            }}
                            className="h-2 w-2 rounded-full bg-cyan-400"
                          />
                          <motion.span
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{
                              duration: 1.5,
                              repeat: Number.POSITIVE_INFINITY,
                              delay: 0.2,
                            }}
                            className="h-2 w-2 rounded-full bg-cyan-400"
                          />
                          <motion.span
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{
                              duration: 1.5,
                              repeat: Number.POSITIVE_INFINITY,
                              delay: 0.4,
                            }}
                            className="h-2 w-2 rounded-full bg-cyan-400"
                          />
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                )}
              </div>

              {/* Input */}
              <div className="border-t border-zinc-800 p-4">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSend()}
                    placeholder="Type your answer or ask a question..."
                    className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
                  />
                  <Button
                    onClick={handleSend}
                    size="icon"
                    className="bg-cyan-500 text-zinc-950 hover:bg-cyan-400"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="fixed right-6 bottom-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/30 transition-all hover:shadow-xl hover:shadow-cyan-500/40"
      >
        <Bot className="h-6 w-6 text-white" />
        {!isExpanded && (
          <motion.span
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
            className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white"
          >
            1
          </motion.span>
        )}
      </motion.button>
    </>
  );
}
