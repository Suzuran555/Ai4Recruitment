import Anthropic from "@anthropic-ai/sdk";
import { env } from "./src/env";

console.log("=== Testing Claude API Integration ===\n");

// Test 1: Check environment variable
console.log("1. Checking CLAUDE_API_KEY...");
console.log("   Exists:", !!env.CLAUDE_API_KEY);
console.log("   Length:", env.CLAUDE_API_KEY?.length || 0);
console.log("   Prefix:", env.CLAUDE_API_KEY?.substring(0, 20) || "N/A");

if (!env.CLAUDE_API_KEY) {
  console.error("❌ CLAUDE_API_KEY not found!");
  process.exit(1);
}

// Test 2: Initialize client
console.log("\n2. Initializing Anthropic client...");
const client = new Anthropic({
  apiKey: env.CLAUDE_API_KEY,
});
console.log("✅ Client initialized");

// Test 3: Call API
console.log("\n3. Calling Claude API...");
try {
  const response = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 100,
    messages: [{ role: "user", content: "Say hello in one word" }],
  });

  console.log("✅ API call successful!");
  const firstBlock = response.content.at(0);
  if (!firstBlock) {
    console.log("   Response: <empty>");
  } else if (firstBlock.type === "text") {
    console.log("   Response:", firstBlock.text);
  } else {
    console.log("   Response:", JSON.stringify(firstBlock));
  }
  console.log("\n🎉 All tests passed! The API key works correctly.");
} catch (error: any) {
  console.error("\n❌ API call failed!");
  console.error("   Error:", error.message);
  if (error.status) {
    console.error("   Status:", error.status);
  }
  if (error.error) {
    console.error("   Details:", JSON.stringify(error.error, null, 2));
  }
  process.exit(1);
}
