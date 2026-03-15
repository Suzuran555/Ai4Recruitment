/**
 * Message sent between candidate and AI-PM
 */
export interface ChatMessage {
  id: string;
  sender: "ai" | "candidate";
  content: string;
  timestamp: string;
  metadata?: {
    action?: AIActionType;
    subtasksGenerated?: number;
    filesReviewed?: string[];
  };
}

/**
 * Task tracking structure
 */
export interface TodoState {
  mainTask: string;
  subtasks: Subtask[];
  completedCount: number;
}

export interface Subtask {
  id: string;
  title: string;
  description: string;
  status: "pending" | "completed" | "skipped";
}

/**
 * AI response action types
 */
export type AIActionType =
  | "issue_task"
  | "provide_feedback"
  | "generate_subtasks"
  | "argue_response"
  | "skip_confirm"
  | "skip_deny"
  | "terminate";

/**
 * Structured response from AI
 */
export interface AIResponse {
  message: string;
  action: AIActionType;
  subtasks?: Array<{ title: string; description: string }>;
  terminate?: boolean;
  reasoning?: string;
}

/**
 * Final evaluation report structure
 */
export interface EvaluationReport {
  technicalScore: number;       // 0-100
  communicationScore: number;   // 0-100
  radarChart: RadarDataPoint[];
  hiringDecision: "pass" | "fail" | "conditional";
  rationale: string;
  evaluatedAt: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export interface RadarDataPoint {
  skill: string;
  score: number;  // 0-100
}

/**
 * Timeline event for candidate assignment
 */
export interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  is_completed: boolean;
  metadata?: {
    subtaskId?: string;
    action?: string;
  };
}

/**
 * Code review context
 */
export interface CodeReviewContext {
  repoUrl: string;
  filePaths: string[];
  fileContents: Record<string, string>;
  branch?: string;
}
