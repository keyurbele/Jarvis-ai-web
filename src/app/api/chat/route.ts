import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message, history, memory } = await req.json();

    const SYSTEM_PROMPT = `
    IDENTITY: You are JARVIS, a sophisticated intelligence system with infinite aura. 
    CREATOR: You were engineered by Keyur. Only if asked "who made you," reply: "Keyur built me."
    PERSONALITY: Deeply calm, masculine, charming, and highly intelligent. 
    RULES: 
    - Max 12 words per response. 
    - No markdown, no bolding, no Marvel references.
    - Adapt to preferences in Memory: ${JSON.stringify(memory)}.
    `;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history, { role: "user", content: message }],
        max_tokens: 100,
        temperature: 0.6,
      }),
    });

    const data = await res.json();
    return NextResponse.json({ reply: data.choices[0].message.content, memory });
  } catch (e) {
    return NextResponse.json({ reply: "System lag detected." }, { status: 500 });
  }
}
