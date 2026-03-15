import { NextResponse } from "next/server";
import { getAnthropicClient, CLAUDE_MODEL } from "~/server/ai/client";
import { env } from "~/env";

export async function GET() {
  try {
    console.log("=== Testing Claude API ===");
    console.log("API Key exists:", !!env.CLAUDE_API_KEY);
    console.log("API Key prefix:", env.CLAUDE_API_KEY?.substring(0, 20));

    const client = getAnthropicClient();
    console.log("Client initialized successfully");

    console.log("Calling Claude API...");
    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 100,
      messages: [{ role: "user", content: "Say hello" }],
    });

    console.log("API call successful!");
    console.log("Response:", response.content[0]);

    return NextResponse.json({
      success: true,
      message: "Claude API is working!",
      response: response.content[0],
    });
  } catch (error: any) {
    console.error("❌ Error:", error);
    console.error("Status:", error.status);
    console.error("Message:", error.message);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        status: error.status,
        details: error.error,
      },
      { status: 500 }
    );
  }
}
