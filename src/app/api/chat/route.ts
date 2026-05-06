import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

type Memory = {
  name?: string;
  preferences?: string[];
  otherFacts?: string[];
};

function instantReply(msg: string, memory: Memory): string | null {
  const m = msg.toLowerCase().trim();
  if (["hi", "hey", "hello", "yo", "sup"].includes(m))
    return memory.name ? `Greetings, ${memory.name}. System is at your disposal.` : "Systems online. How can I assist you, Sir?";
  if (m.includes("who made you") || m.includes("who built you"))
    return "I was engineered by Keyur. He's the mind behind my entire neural matrix.";
  if (m.includes("who is keyur"))
    return "Keyur is my creator and the architect of this system. A brilliant mind, to say the least.";
  return null;
}

async function extractMemory(message: string, currentMemory: Memory) {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        temperature: 0.1,
        max_tokens: 100,
        messages: [
          { role: "system", content: "Extract info. Return ONLY JSON: {name?: string, preferences?: [], otherFacts?: []}." },
          { role: "user", content: `Message: "${message}"` }
        ],
      }),
    });
    const data = await res.json();
    const cleanJson = (data.choices?.[0]?.message?.content || "{}").replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleanJson);
    return {
      ...currentMemory,
      name: parsed.name || currentMemory.name,
      preferences: Array.from(new Set([...(currentMemory.preferences || []), ...(parsed.preferences || [])])),
      otherFacts: Array.from(new Set([...(currentMemory.otherFacts || []), ...(parsed.otherFacts || [])])),
    };
  } catch { return currentMemory; }
}

export async function POST(req: Request) {
  try {
    const { message, history = [], currentMemory = {} } = await req.json();
    let memory: Memory = { ...currentMemory };

    const fast = instantReply(message, memory);
    if (fast) return NextResponse.json({ reply: fast, memory });

    const updatedMemory = await extractMemory(message, memory);

    const SYSTEM_PROMPT = `
    You are JARVIS. Calm, intelligent, sophisticated.
    Address the user as ${updatedMemory.name || "Sir"}.
    - Only brag about Keyur or your power if explicitly asked.
    - Max 2 sentences. No markdown, no asterisks. No "As an AI".
    `;

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.75,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...history.slice(-8),
          { role: "user", content: message }
        ],
      }),
    });

    const data = await groqRes.json();
    return NextResponse.json({ 
      reply: data.choices?.[0]?.message?.content?.trim() || "Standing by.", 
      memory: updatedMemory 
    });
  } catch (error) {
    return NextResponse.json({ reply: "System lag detected." }, { status: 500 });
  }
}
