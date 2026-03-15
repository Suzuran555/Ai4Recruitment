import { getAnthropicClient, CLAUDE_MODEL, MAX_TOKENS } from "./client";
import {
  AI_PM_SYSTEM_PROMPT,
  buildConversationContext,
  EVALUATION_REPORT_PROMPT,
  extractJSON,
} from "./prompts";
import type {
  AIResponse,
  ChatMessage,
  EvaluationReport,
  TodoState,
} from "./types";

/**
 * Process candidate message and get AI-PM response
 */
export async function processAIChat(params: {
  messages: ChatMessage[];
  todoState: TodoState;
  candidateMessage: string;
  codeFiles?: Record<string, string>;
}): Promise<AIResponse> {
  const { messages, todoState, candidateMessage, codeFiles } = params;

  console.log("[processAIChat] Starting with:", {
    messageCount: messages.length,
    hasCodeFiles: !!codeFiles && Object.keys(codeFiles).length > 0,
    candidateMessageLength: candidateMessage.length,
  });

  let client;
  try {
    client = getAnthropicClient();
  } catch (error) {
    console.error("[processAIChat] Failed to get Anthropic client:", error);
    throw new Error("Claude API client initialization failed. Check CLAUDE_API_KEY.");
  }

  // Build conversation context
  const context = buildConversationContext({
    messages,
    todoState: {
      mainTask: todoState.mainTask,
      subtasks: todoState.subtasks.map((s) => ({
        title: s.title,
        status: s.status,
      })),
      completedCount: todoState.completedCount,
    },
    codeFiles,
  });

  console.log("[processAIChat] Context built, calling Claude API...");

  // Call Claude API
  let response;
  try {
    console.log("[processAIChat] Calling Claude API with model:", CLAUDE_MODEL);
    response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: MAX_TOKENS,
      system: AI_PM_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `${context}\n\n**Candidate's Latest Message:**\n${candidateMessage}\n\nRespond with JSON following the specified format.`,
        },
      ],
    });
    console.log("[processAIChat] Claude API response received");
  } catch (error: any) {
    console.error("[processAIChat] Claude API error:", error);
    console.error("[processAIChat] Error details:", {
      message: error?.message,
      status: error?.status,
      code: error?.code,
      type: error?.type,
    });
    
    // Provide more helpful error message
    if (error?.status === 401) {
      throw new Error(
        `Claude API authentication failed (401): Invalid API key. Please check your CLAUDE_API_KEY in .env file.`
      );
    }
    
    throw new Error(
      `Claude API call failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  // Extract text from response
  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    console.error("[processAIChat] No text content in response:", response.content);
    throw new Error("No text content in AI response");
  }

  console.log("[processAIChat] Parsing AI response...");
  console.log("[processAIChat] Raw response:", textContent.text.substring(0, 200));

  // Parse JSON response
  let aiResponse;
  try {
    aiResponse = extractJSON<AIResponse>(textContent.text);
    console.log("[processAIChat] Successfully parsed AI response");
  } catch (error) {
    console.error("[processAIChat] Failed to parse JSON:", error);
    console.error("[processAIChat] Raw text:", textContent.text);
    throw new Error("Failed to parse AI response as JSON");
  }

  return aiResponse;
}

/**
 * Generate final evaluation report
 */
export async function generateEvaluationReport(params: {
  messages: ChatMessage[];
  todoState: TodoState;
  finalCodeFiles?: Record<string, string>;
}): Promise<EvaluationReport> {
  const { messages, todoState, finalCodeFiles } = params;

  const client = getAnthropicClient();

  // Build comprehensive context
  let context = `**Assignment Summary:**
- Main Task: ${todoState.mainTask}
- Total Subtasks Generated: ${todoState.subtasks.length}
- Completed: ${todoState.completedCount}
- Skipped: ${todoState.subtasks.filter((s) => s.status === "skipped").length}

**Full Conversation History:**
`;

  for (const msg of messages) {
    context += `\n[${msg.sender.toUpperCase()}] (${msg.timestamp}):\n${msg.content}\n`;
  }

  if (finalCodeFiles && Object.keys(finalCodeFiles).length > 0) {
    context += "\n\n**Final Code Submission:**\n";
    for (const [filePath, content] of Object.entries(finalCodeFiles)) {
      context += `\n--- ${filePath} ---\n${content}\n`;
    }
  }

  // Call Claude API for evaluation
  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: MAX_TOKENS,
    system: EVALUATION_REPORT_PROMPT,
    messages: [
      {
        role: "user",
        content: `${context}\n\nGenerate the final evaluation report as JSON following the specified format.`,
      },
    ],
  });

  // Extract text from response
  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text content in AI response");
  }

  // Parse JSON response
  const report = extractJSON<Omit<EvaluationReport, "evaluatedAt">>(
    textContent.text
  );

  // Add timestamp
  return {
    ...report,
    evaluatedAt: new Date().toISOString(),
  };
}
