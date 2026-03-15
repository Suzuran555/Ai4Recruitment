"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, CheckCircle, XCircle, Clock, Target, ListChecks, Wrench, Lightbulb } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Textarea } from "~/components/ui/textarea";
import { api } from "~/trpc/react";
import type { ChatMessage, TodoState } from "~/server/ai/types";

interface AIPMChatProps {
  candidateAssignmentId: number;
  repoUrl: string | null;
}

// AI Message Card Component with structured display
function AIMessageCard({ message }: { message: ChatMessage }) {
  const content = message.content;

  // Parse message sections
  const hasTaskHeader = content.includes("**Main Task:") || content.includes("**Task:");
  const hasFeatures = content.includes("features:") || content.includes("requirements:");
  const hasDeliverables = content.includes("deliverables") || content.includes("Let me know when");
  const hasTips = content.includes("Feel free") || content.includes("Good luck") || content.includes("questions");

  // If it's a simple message, just display normally
  if (!hasTaskHeader && !hasFeatures) {
    return (
      <div className="max-w-[85%] rounded-lg p-4 bg-zinc-800 text-zinc-100">
        <div className="text-xs opacity-60 mb-2">
          🤖 AI-PM • {new Date(message.timestamp).toLocaleTimeString()}
        </div>
        <div className="whitespace-pre-wrap leading-relaxed">
          {content}
        </div>
        {message.metadata?.subtasksGenerated && (
          <div className="text-xs mt-3 pt-2 border-t border-white/10 opacity-80">
            ✓ Generated {message.metadata.subtasksGenerated} new subtasks
          </div>
        )}
      </div>
    );
  }

  // Parse structured task
  const lines = content.split('\n');
  let taskTitle = "";
  let intro = "";
  const features: string[] = [];
  const deliverables: string[] = [];
  let tips = "";
  let currentSection = "intro";

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("**Main Task:") || trimmed.startsWith("**Task:")) {
      taskTitle = trimmed.replace(/\*\*/g, "").replace("Main Task:", "").replace("Task:", "").trim();
      currentSection = "intro";
    } else if (trimmed.toLowerCase().includes("features:") || trimmed.toLowerCase().includes("requirements:")) {
      currentSection = "features";
    } else if (trimmed.toLowerCase().includes("deliverables") || trimmed.toLowerCase().includes("let me know when")) {
      currentSection = "deliverables";
      if (trimmed.toLowerCase().includes("let me know when")) {
        deliverables.push(trimmed);
      }
    } else if (trimmed.toLowerCase().includes("feel free") || trimmed.toLowerCase().includes("good luck") || trimmed.toLowerCase().includes("questions if")) {
      currentSection = "tips";
      tips += trimmed + " ";
    } else if (trimmed.startsWith("-") || trimmed.startsWith("•")) {
      const item = trimmed.replace(/^[-•]\s*/, "");
      if (currentSection === "features") {
        features.push(item);
      } else if (currentSection === "deliverables") {
        deliverables.push(item);
      }
    } else if (trimmed && currentSection === "intro" && !taskTitle) {
      intro += trimmed + " ";
    } else if (trimmed && currentSection === "intro") {
      intro += trimmed + " ";
    }
  }

  return (
    <div className="max-w-[90%] space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <span>🤖 AI-PM</span>
        <span>•</span>
        <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
      </div>

      {/* Section 1: Task Title */}
      {taskTitle && (
        <Card className="border-2 border-cyan-600 bg-gradient-to-br from-cyan-900/30 to-zinc-900 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-1">
              <Target className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <div className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">
                Your Task
              </div>
              <div className="text-lg font-bold text-white">
                {taskTitle}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Section 2: Features/Requirements */}
      {features.length > 0 && (
        <Card className="border border-zinc-700 bg-zinc-800/50 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-1">
              <ListChecks className="h-5 w-5 text-green-400" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-2">
                Requirements
              </div>
              <ul className="space-y-1.5">
                {features.map((feature, idx) => (
                  <li key={idx} className="text-sm text-zinc-200 flex items-start gap-2">
                    <span className="text-green-400 mt-0.5">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Section 3: Technical Details */}
      {intro && (
        <Card className="border border-zinc-700 bg-zinc-800/50 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-1">
              <Wrench className="h-5 w-5 text-blue-400" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">
                Technical Notes
              </div>
              <div className="text-sm text-zinc-300 leading-relaxed">
                {intro.trim()}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Section 4: Tips & Next Steps */}
      <Card className="border border-zinc-700 bg-zinc-800/50 p-4">
        <div className="flex items-start gap-3">
          <div className="mt-1">
            <Lightbulb className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-semibold text-yellow-400 uppercase tracking-wider mb-2">
              Tips & Next Steps
            </div>
            {deliverables.length > 0 ? (
              <ul className="space-y-1.5 mb-2">
                {deliverables.map((item, idx) => (
                  <li key={idx} className="text-sm text-zinc-300">
                    • {item}
                  </li>
                ))}
              </ul>
            ) : null}
            {tips && (
              <div className="text-sm text-zinc-300 leading-relaxed">
                {tips.trim()}
              </div>
            )}
            {!tips && !deliverables.length && (
              <div className="text-sm text-zinc-300">
                Let me know when you're done, and share the file path(s) so I can review your code!
              </div>
            )}
          </div>
        </div>
      </Card>

      {message.metadata?.subtasksGenerated && (
        <div className="text-xs text-zinc-400 flex items-center gap-2">
          <CheckCircle className="h-3 w-3 text-green-400" />
          <span>Generated {message.metadata.subtasksGenerated} new subtasks</span>
        </div>
      )}
    </div>
  );
}

export default function AIPMChat({ candidateAssignmentId, repoUrl }: AIPMChatProps) {
  const [message, setMessage] = useState("");
  const [filePaths, setFilePaths] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [expandedSubtaskId, setExpandedSubtaskId] = useState<string | null>(null);
  const [subtaskFilePaths, setSubtaskFilePaths] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch assignment data
  const { data: assignment, refetch } = api.assignment.getAssignment.useQuery({
    candidateAssignmentId,
  });

  // Send message mutation
  const sendMessageMutation = api.assignment.sendMessage.useMutation({
    onSuccess: async (data) => {
      setMessage("");
      setFilePaths("");
      setError(null);
      await refetch();

      // Check if should terminate
      if (data.shouldTerminate) {
        // Auto-trigger completion
        completeEvaluationMutation.mutate({ candidateAssignmentId });
      }
    },
    onError: (error) => {
      setError(error.message || "Failed to send message. Please try again.");
    },
  });

  // Complete evaluation mutation
  const completeEvaluationMutation = api.assignment.completeEvaluation.useMutation({
    onSuccess: async () => {
      setError(null);
      await refetch();
    },
    onError: (error) => {
      setError(error.message || "Failed to complete evaluation. Please try again.");
    },
  });

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [assignment?.messages]);

  if (!assignment) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  const messages = (assignment.messages ?? []) as ChatMessage[];
  const todoState = (() => {
    const todo = assignment.todo;
    // Handle case where todo might be empty array or malformed
    if (!todo || Array.isArray(todo) || !("subtasks" in todo)) {
      return { mainTask: "", subtasks: [], completedCount: 0 };
    }
    // Ensure subtasks is always an array
    const subtasks = Array.isArray(todo.subtasks) ? todo.subtasks : [];
    return {
      mainTask: todo.mainTask ?? "",
      subtasks,
      completedCount: todo.completedCount ?? 0,
    } as TodoState;
  })();
  const isCompleted = assignment.status === "completed";

  const handleSend = () => {
    if (!message.trim() || sendMessageMutation.isPending) return;

    sendMessageMutation.mutate({
      candidateAssignmentId,
      message: message.trim(),
      filePaths: undefined,
    });
  };

  const handleComplete = () => {
    if (completeEvaluationMutation.isPending) return;

    const filePathArray = filePaths
      .split("\n")
      .map((p) => p.trim())
      .filter(Boolean);

    completeEvaluationMutation.mutate({
      candidateAssignmentId,
      finalFilePaths: filePathArray.length > 0 ? filePathArray : undefined,
    });
  };

  const handleSubtaskComplete = (subtask: { id: string; title: string }) => {
    const paths = subtaskFilePaths[subtask.id] || "";
    const filePathArray = paths
      .split("\n")
      .map((p) => p.trim())
      .filter(Boolean);

    const msg = `I completed "${subtask.title}". Please review my code.`;

    sendMessageMutation.mutate({
      candidateAssignmentId,
      message: msg,
      filePaths: filePathArray.length > 0 ? filePathArray : undefined,
    });

    // Reset state
    setExpandedSubtaskId(null);
    setSubtaskFilePaths((prev) => {
      const updated = { ...prev };
      delete updated[subtask.id];
      return updated;
    });
  };

  const handleSubtaskSkip = (subtask: { id: string; title: string }) => {
    const msg = `Can I skip the task: "${subtask.title}"? It's too difficult for me right now.`;

    sendMessageMutation.mutate({
      candidateAssignmentId,
      message: msg,
      filePaths: undefined,
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="border-b border-zinc-800 bg-zinc-900 px-6 py-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="font-mono text-xs tracking-wider text-cyan-400 uppercase">
              AI Product Manager Evaluation
            </div>
            <div className="text-sm text-zinc-400 mt-1">
              Status: <span className="text-white font-medium">{assignment.status}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-zinc-500">Progress</div>
            <div className="text-lg font-bold text-cyan-400">
              {todoState.completedCount} / 4 tasks
            </div>
          </div>
        </div>
      </motion.div>

      <div className="container mx-auto max-w-7xl p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Area */}
          <div className="lg:col-span-2">
            <Card className="border border-zinc-800 bg-zinc-900 h-[calc(100vh-200px)] flex flex-col">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-center h-full"
                  >
                    <div className="text-center max-w-md">
                      <div className="mb-4">
                        <div className="w-16 h-16 mx-auto bg-cyan-600/20 rounded-full flex items-center justify-center">
                          <Send className="h-8 w-8 text-cyan-400" />
                        </div>
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">
                        Welcome to AI-PM Evaluation!
                      </h3>
                      <p className="text-zinc-400 mb-4">
                        Send your first message to begin. The AI Product Manager will assign you a task and guide you through the evaluation.
                      </p>
                      <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 text-left">
                        <p className="text-sm text-zinc-300 mb-2">Try starting with:</p>
                        <ul className="text-sm text-zinc-400 space-y-1">
                          <li>• "I'm ready to start"</li>
                          <li>• "Hello, what's my first task?"</li>
                          <li>• "Let's begin the evaluation"</li>
                        </ul>
                      </div>
                    </div>
                  </motion.div>
                )}
                <AnimatePresence>
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.sender === "candidate" ? "justify-end" : "justify-start"}`}
                    >
                      {msg.sender === "ai" ? (
                        <AIMessageCard message={msg} />
                      ) : (
                        <div className="max-w-[80%] rounded-lg p-4 bg-cyan-600 text-white">
                          <div className="text-xs opacity-60 mb-2">
                            👤 You • {new Date(msg.timestamp).toLocaleTimeString()}
                          </div>
                          <div className="whitespace-pre-wrap leading-relaxed">
                            {msg.content}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              {!isCompleted && (
                <div className="border-t border-zinc-800 p-4 space-y-3">
                  {error && (
                    <div className="bg-red-900/20 border border-red-700 rounded-lg p-3 text-sm text-red-400">
                      ⚠️ {error}
                    </div>
                  )}

                  {!repoUrl && (
                    <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3 text-sm text-yellow-400">
                      ⚠️ No repository URL provided. You can still chat, but the AI won't be able to review your code.
                    </div>
                  )}

                  {repoUrl && (
                    <div className="text-xs text-zinc-500">
                      Repo: <span className="text-cyan-400 font-mono">{repoUrl}</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder={
                        messages.length === 0
                          ? "Type 'I'm ready to start' to begin..."
                          : "Type your message... (Shift+Enter for new line)"
                      }
                      className="bg-zinc-800 border-zinc-700 text-white"
                      rows={3}
                    />
                    <Button
                      onClick={handleSend}
                      disabled={!message.trim() || sendMessageMutation.isPending}
                      className="bg-cyan-600 hover:bg-cyan-700"
                    >
                      {sendMessageMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {sendMessageMutation.isPending && (
                    <div className="flex items-center gap-2 text-sm text-cyan-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>AI-PM is thinking...</span>
                    </div>
                  )}

                  {todoState.completedCount >= 4 && (
                    <Button
                      onClick={handleComplete}
                      disabled={completeEvaluationMutation.isPending}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {completeEvaluationMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating Report...
                        </>
                      ) : (
                        "Complete Evaluation"
                      )}
                    </Button>
                  )}
                </div>
              )}

              {isCompleted && (
                <div className="border-t border-zinc-800 p-4 bg-green-900/20">
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Evaluation Completed!</span>
                  </div>
                  <p className="text-sm text-zinc-400 mt-2">
                    Your evaluation report is ready. Scroll down to see your scores.
                  </p>
                </div>
              )}
            </Card>
          </div>

          {/* Sidebar: Tasks */}
          <div className="lg:col-span-1 space-y-4">
            {/* Main Task */}
            <Card className={`p-4 ${
              todoState.mainTask
                ? "border-2 border-cyan-600 bg-gradient-to-br from-cyan-900/30 to-zinc-900"
                : "border border-zinc-800 bg-zinc-900"
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-4 w-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-cyan-400">Main Task</h3>
              </div>
              {todoState.mainTask ? (
                <p className="text-sm text-zinc-200 leading-relaxed">{todoState.mainTask}</p>
              ) : (
                <p className="text-sm text-zinc-500 italic">Waiting for AI to assign task...</p>
              )}
            </Card>

            {/* Subtasks */}
            {todoState.subtasks.length > 0 && (
              <Card className="border border-zinc-800 bg-zinc-900 p-4">
                <h3 className="text-sm font-semibold text-cyan-400 mb-3">
                  Subtasks ({todoState.subtasks.filter((s) => s.status === "completed").length}/
                  {todoState.subtasks.length})
                </h3>
                <div className="space-y-3">
                  {todoState.subtasks.map((subtask) => (
                    <div
                      key={subtask.id}
                      className={`rounded border ${
                        subtask.status === "completed"
                          ? "border-green-700 bg-green-900/20"
                          : subtask.status === "skipped"
                            ? "border-yellow-700 bg-yellow-900/20"
                            : "border-zinc-700 bg-zinc-800/50"
                      }`}
                    >
                      <div className="p-3">
                        <div className="flex items-start gap-2">
                          {subtask.status === "completed" ? (
                            <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                          ) : subtask.status === "skipped" ? (
                            <XCircle className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                          ) : (
                            <Clock className="h-4 w-4 text-zinc-400 mt-0.5 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-zinc-200">{subtask.title}</div>
                            <div className="text-xs text-zinc-400 mt-1">{subtask.description}</div>
                          </div>
                        </div>

                        {/* Action buttons for pending tasks */}
                        {subtask.status === "pending" && !isCompleted && (
                          <div className="mt-3 space-y-2">
                            {expandedSubtaskId === subtask.id && repoUrl ? (
                              <div className="space-y-2">
                                <label className="text-xs text-zinc-400">
                                  File paths (optional, one per line):
                                </label>
                                <Textarea
                                  value={subtaskFilePaths[subtask.id] || ""}
                                  onChange={(e) =>
                                    setSubtaskFilePaths((prev) => ({
                                      ...prev,
                                      [subtask.id]: e.target.value,
                                    }))
                                  }
                                  placeholder="e.g., src/components/TodoList.tsx"
                                  className="bg-zinc-900 border-zinc-700 text-white text-xs h-16"
                                />
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleSubtaskComplete(subtask)}
                                    disabled={sendMessageMutation.isPending}
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    <CheckCircle className="mr-1 h-3 w-3" />
                                    Submit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setExpandedSubtaskId(null)}
                                    className="border-zinc-700 text-zinc-300"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    if (repoUrl) {
                                      setExpandedSubtaskId(subtask.id);
                                    } else {
                                      handleSubtaskComplete(subtask);
                                    }
                                  }}
                                  disabled={sendMessageMutation.isPending}
                                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                >
                                  <CheckCircle className="mr-1 h-3 w-3" />
                                  Complete
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleSubtaskSkip(subtask)}
                                  disabled={sendMessageMutation.isPending}
                                  className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                                >
                                  <XCircle className="mr-1 h-3 w-3" />
                                  Skip
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Tips */}
            <Card className="border border-zinc-800 bg-zinc-900 p-4">
              <h3 className="text-sm font-semibold text-cyan-400 mb-3">Tips</h3>
              <ul className="text-xs text-zinc-400 space-y-2">
                <li>• Click "Complete" to submit your work for AI review</li>
                <li>• Click "Skip" if a task is too difficult</li>
                <li>• You can argue with AI feedback in chat</li>
                <li>• Evaluation ends after 4 completed tasks</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
