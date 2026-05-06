import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, history = [], memory = {}, userName = "Sir", jarvisName = "JARVIS" } = body;

    if (!message) {
      return NextResponse.json({ reply: "I didn't hear anything." });
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ reply: "API Key missing." }, { status: 500 });
    }

    const memoryBlock = memory && Object.keys(memory).length > 0
      ? `What you remember: ${JSON.stringify(memory)}`
      : "";

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 150,
        temperature: 0.75,
        messages: [
          {
            role: "system",
            content: `You are ${jarvisName}, a calm, intelligent AI assistant. You address the user as ${userName}.
${memoryBlock}

Rules:
- Keep responses under 2 sentences. You are spoken aloud.
- No markdown, no bullet points, no asterisks ever.
- Never say "Certainly!", "Sure!", "Of course!".
- Speak naturally like a smart friend.
- Only mention who built you if directly asked.`
          },
          ...history.slice(-10),
          { role: "user", content: message }
        ],
      }),
    });

    if (!groqRes.ok) {
      const err = await groqRes.text();
      console.error("Groq error:", err);
      return NextResponse.json({ reply: "Lost the signal, try again." }, { status: 502 });
    }

    const data = await groqRes.json();
    const reply = data.choices?.[0]?.message?.content?.trim();

    return NextResponse.json({
      reply: reply && reply.length > 3 ? reply : "Say that again?"
    });

  } catch (error: any) {
    console.error("CRASH:", error);
    return NextResponse.json({ reply: "Connection error." }, { status: 500 });
  }
}
