import Anthropic from "@anthropic-ai/sdk";

// 直接从环境变量读取
const apiKey = process.env.CLAUDE_API_KEY;

console.log("Testing Claude API key...");
console.log("API Key exists:", !!apiKey);
console.log("API Key prefix:", apiKey ? apiKey.substring(0, 20) + "..." : "N/A");

if (!apiKey) {
  console.error("❌ CLAUDE_API_KEY not found in environment!");
  process.exit(1);
}

try {
  const client = new Anthropic({ apiKey });

  console.log("\nCalling Claude API...");
  const response = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 100,
    messages: [{ role: "user", content: "Say hello in one word" }],
  });

  console.log("✅ Success!");
  console.log("Response:", response.content[0].text);
} catch (error) {
  console.error("❌ Error:", error.message);
  if (error.status) {
    console.error("Status:", error.status);
  }
  process.exit(1);
}
