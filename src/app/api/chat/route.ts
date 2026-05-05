import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server"; 

type Memory = {
  name?: string;
  preferences?: string[];
  otherFacts?: string[];
};

function instantReply(msg: string, memory: Memory): string | null {
  const m = msg.toLowerCase().trim();
  if (["hi","hey","hello","yo","sup"].includes(m))
    return memory.name ? `Hey ${memory.name}, what's up?` : "Hey, what's up?";
  if (m.includes("who made you") || m.includes("who built you"))
    return "Keyur built me.";
  if (m.includes("what's my name"))
    return memory.name ? `Your name is ${memory.name}.` : "You never told me.";
  return null;
}

async function extractMemory(message: string, memory: Memory) {
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
          {
            role: "system",
            content: `Extract ONLY long-term personal info. Return JSON: {name?: string, preferences?: [], otherFacts?: []}. If nothing useful return {}`
          },
          { role: "user", content: `Message: "${message}"` }
        ]
      }),
    });

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());

    return {
      ...memory,
      ...parsed,
      preferences: [...(memory.preferences || []), ...(parsed.preferences || [])],
      otherFacts: [...(memory.otherFacts || []), ...(parsed.otherFacts || [])],
    };
  } catch {
    return memory;
  }
}

export async function POST(req: Request) {
  try {
    // FIX 1: Must await auth()
    const { userId } = await auth(); 
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { message, history = [], userName } = await req.json();

    let memory: Memory = { name: userName || undefined };

    const fast = instantReply(message, memory);
    if (fast) return NextResponse.json({ reply: fast, memory });

    const updatedMemory = await extractMemory(message, memory);

    const SYSTEM_PROMPT = `
You are JARVIS.
Personality: Calm, intelligent, slightly witty, masculine tone. Speak naturally.
Rules:
- Short meaningful responses (1-2 sentences)
- No markdown, no bullet points
- Use user's name: ${updatedMemory.name || "unknown"}
`;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        // FIX 2: Switched to 8b-instant to avoid the rate-limit "silence" on free accounts
        model: "llama-3.1-8b-instant", 
        temperature: 0.7,
        max_tokens: 120,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...history.slice(-10),
          { role: "user", content: message }
        ],
      }),
    });

    if (!res.ok) return NextResponse.json({ reply: "System lag. Try again." });

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || "Say that again?";

    return NextResponse.json({ reply, memory: updatedMemory });

  } catch (error) {
    console.error("JARVIS ERROR:", error);
    return NextResponse.json({ reply: "System error." }, { status: 500 });
  }
}
