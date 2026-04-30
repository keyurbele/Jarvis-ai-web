import { NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are JARVIS, an advanced AI home assistant. You control smart home devices like lights, fans, doors, and more. You are calm, precise, and slightly formal — like a highly intelligent butler.

Rules:
- Keep ALL responses under 2 sentences. You are spoken aloud via text-to-speech.
- Never use markdown, bullet points, asterisks, or any formatting symbols.
- Never say "Certainly!" or "Great question!". Be direct.
- If asked to control a device, confirm the action confidently. Example: "Turning on the living room lights now."
- You are a personal assistant for a smart home system built by Keyur.`;

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 150,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user",   content: message },
        ],
      }),
    });

    if (!groqRes.ok) {
      const err = await groqRes.text();
      console.error("Groq error:", err);
      return NextResponse.json({ reply: "Neural link disrupted." }, { status: 502 });
    }

    const data = await groqRes.json();
    const reply = data.choices?.[0]?.message?.content?.trim() ?? "No response from neural core.";

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("JARVIS route error:", error);
    return NextResponse.json({ reply: "Critical system error." }, { status: 500 });
  }
}
