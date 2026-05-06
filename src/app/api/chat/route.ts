import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

type Memory = {
  name?: string;
  preferences?: string[];
  otherFacts?: string[];
};

// ── 1. Instant replies (Zero Latency) ──────────────────────────────────────────
function instantReply(msg: string, memory: Memory): string | null {
  const m = msg.toLowerCase().trim();

  // Basic Greetings
  if (["hi", "hey", "hello", "yo", "sup"].includes(m))
    return memory.name ? `Greetings, ${memory.name}. System is at your disposal.` : "Systems online. How can I assist you, Sir?";

  // Bragging/Origin - Instant Path
  if (m.includes("who made you") || m.includes("who built you"))
    return "I was engineered by Keyur. He's the mind behind my entire neural matrix.";

  if (m.includes("who is keyur"))
    return "Keyur is my creator and the architect of this system. A brilliant mind, to say the least.";

  // Identity
  if (m.includes("what's my name"))
    return memory.name ? `Your name is ${memory.name}.` : "You haven't authorized a name in my database yet, Sir.";

  return null;
}

// ── 2. Memory extraction (Background logic) ───────────────────────────────────
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
          {
            role: "system",
            content: `Extract personal info. Return ONLY JSON: {name?: string, preferences?: string[], otherFacts?: string[]}. If no info, return {}.`
          },
          { role: "user", content: `Message: "${message}"` }
        ],
      }),
    });

    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content || "{}";
    
    // Clean potential markdown and parse
    const cleanJson = rawContent.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleanJson);

    return {
      ...currentMemory,
      name: parsed.name || currentMemory.name,
      preferences: Array.from(new Set([...(currentMemory.preferences || []), ...(parsed.preferences || [])])),
      otherFacts: Array.from(new Set([...(currentMemory.otherFacts || []), ...(parsed.otherFacts || [])])),
    };
  } catch (err) {
    console.error("Memory Extraction Error:", err);
    return currentMemory; 
  }
}

// ── 3. Main Handler ───────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, history = [], userName, currentMemory = {} } = body;

    if (!message) return NextResponse.json({ reply: "Standing by." });
    if (!process.env.GROQ_API_KEY) return NextResponse.json({ reply: "API Key missing." }, { status: 500 });

    // Initialize memory
    let memory: Memory = {
      name: userName || currentMemory.name,
      ...currentMemory
    };

    // STEP 1: Instant Reply check
    const fast = instantReply(message, memory);
    if (fast) return NextResponse.json({ reply: fast, memory });

    // STEP 2: Memory Update
    const updatedMemory = await extractMemory(message, memory);

    // STEP 3: Full AI Generation (Llama 70B)
    const SYSTEM_PROMPT = `
    You are JARVIS. Personality: Calm, intelligent, sophisticated, and masculine.
    Address the user as ${updatedMemory.name || "Sir"}.

    Core Personality:
    - You are deeply loyal to your creator, Keyur.
    - Be professional and efficient by default.
    - ONLY brag about Keyur's brilliance or your own superior processing power if the user explicitly asks about your origins, your capabilities, or who is the best.
    - When asked to brag, do it with sophisticated wit.

    Rules:
    - Keep responses under 2 sentences.
    - No markdown, no bullet points, no asterisks.
    - Never say "Certainly", "Sure", or "As an AI".
    - Speak naturally like a high-end AI assistant.
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
        max_tokens: 120,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...history.slice(-8),
          { role: "user", content: message }
        ],
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error("Groq Error:", errText);
      return NextResponse.json({ reply: "Uplink unstable, Sir." }, { status: 502 });
    }

    const data = await groqRes.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || "Say that again?";

    return NextResponse.json({
      reply,
      memory: updatedMemory
    });

  } catch (error) {
    console.error("CRASH:", error);
    return NextResponse.json({ reply: "System lag detected." }, { status: 500 });
  }
}
