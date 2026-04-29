import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    const systemPrompt = `
      You are JARVIS, a professional utility AI. 
      Tone: Sophisticated, concise, and technical.
      No Marvel/Iron Man references. No cinematic fluff.
      Answer questions directly. If asked to perform a system task, confirm execution briefly.
    `;

    // Example response (Mocked for current testing)
    return NextResponse.json({ 
      reply: `SYSTEM_REPLY: Action for '${message}' logged and confirmed.` 
    });

  } catch (error) {
    return NextResponse.json({ error: "INTERNAL_CORE_ERROR" }, { status: 500 });
  }
}
