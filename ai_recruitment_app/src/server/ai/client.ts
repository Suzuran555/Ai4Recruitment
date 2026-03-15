import Anthropic from "@anthropic-ai/sdk";
import { env } from "~/env";

/**
 * Anthropic Claude API client singleton
 * Uses claude-sonnet-4.5 for AI-PM evaluation flow
 */
let anthropicClient: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    if (!env.CLAUDE_API_KEY) {
      throw new Error(
        "CLAUDE_API_KEY is not set. Please add it to your .env file."
      );
    }
    
    // Clean up API key: remove quotes and whitespace
    const apiKey = env.CLAUDE_API_KEY.trim().replace(/^["']|["']$/g, "");
    
    // Validate API key format
    if (!apiKey.startsWith("sk-ant-")) {
      console.error("[getAnthropicClient] Invalid API key format. Should start with 'sk-ant-'");
      console.error("[getAnthropicClient] API key prefix:", apiKey.substring(0, 20));
      throw new Error("Invalid CLAUDE_API_KEY format. Should start with 'sk-ant-'");
    }
    
    console.log("[getAnthropicClient] Initializing Anthropic client with API key:", apiKey.substring(0, 15) + "...");
    console.log("[getAnthropicClient] Using official Anthropic API: https://api.anthropic.com");

    anthropicClient = new Anthropic({
      apiKey: apiKey,
      baseURL: "https://api.anthropic.com",  // 强制使用官方 API
    });

    console.log("[getAnthropicClient] Client initialized successfully");
  }
  return anthropicClient;
}

/**
 * Model to use for AI-PM evaluation
 */
export const CLAUDE_MODEL = "claude-sonnet-4-5-20250929" as const;

/**
 * Maximum tokens for AI responses
 */
export const MAX_TOKENS = 4096;
