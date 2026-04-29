import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    console.log("JARVIS Received:", message);

    // This is where you'll eventually plug in OpenAI/Gemini.
    // For now, we return a clean response without the technical logs.
    const aiResponse = `I hear you. You said: ${message}. How would you like to proceed?`;

    return NextResponse.json({ reply: aiResponse });
  } catch (error) {
    console.error("API ERROR:", error);
    return NextResponse.json({ error: "Neural link failure." }, { status: 500 });
  }
}
