import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    console.log("JARVIS Received:", message); // Check your terminal for this!

    // Replace this logic with your actual AI SDK call (OpenAI, Anthropic, etc.)
    // For now, let's use a hardcoded response to test the "Voice"
    const aiResponse = `System online. I heard you say: ${message}. How can I assist?`;

    return NextResponse.json({ reply: aiResponse });
  } catch (error) {
    console.error("API ERROR:", error);
    return NextResponse.json({ error: "Failed to process" }, { status: 500 });
  }
}
