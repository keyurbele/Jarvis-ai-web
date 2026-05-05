import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase"; // The bridge we made
import { auth } from "@clerk/nextjs/server"; // To know which user is talking

type Memory = {
  name?: string;
  preferences?: string[];
  otherFacts?: string[];
};

// ── Instant replies (STAYS THE SAME) ─────────────────────────────────────────────
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

// ── Extract memory (STAYS THE SAME, but added DB save) ───────────────────────────
async function extractMemory(message: string, memory: Memory, userId: string) {
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

    const newMemory = {
      ...memory,
      ...parsed,
      preferences: [...(memory.preferences || []), ...(parsed.preferences || [])],
      otherFacts: [...(memory.otherFacts || []), ...(parsed.otherFacts || [])],
    };

    // 💾 Pushing to Supabase without breaking the flow
    if (parsed.name || (parsed.preferences?.length) || (parsed.otherFacts?.length)) {
      await supabase.from("memories").insert([
        { 
          user_id: userId, 
          content: JSON.stringify(parsed), // Saves the new facts
          is_auto: true 
        }
      ]);
    }

    return newMemory;
  } catch {
    return memory;
  }
}

// ── Main handler (STAYS THE SAME, just added Clerk/Supabase) ───────────────────
export async function POST(req: Request) {
  try {
    const { userId } = auth(); // Get current user
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { message, history = [], userName } = await req.json();

    let memory: Memory = { name: userName || undefined };

    const fast = instantReply(message, memory);
    if (fast) return NextResponse.json({ reply: fast, memory });

    const updatedMemory = await extractMemory(message, memory, userId);

    const SYSTEM_PROMPT = `
You are JARVIS.
Personality: Calm, intelligent, slightly witty, masculine tone.
Rules: Short meaningful responses, no markdown, no bullets.
Use user's name: ${updatedMemory.name || "Sir"}
`;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        max_tokens: 120,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...history.slice(-10),
          { role: "user", content: message }
        ],
      }),
    });

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || "Say that again?";

    return NextResponse.json({ reply, memory: updatedMemory });

  } catch (error) {
    console.error("JARVIS ERROR:", error);
    return NextResponse.json({ reply: "System lag detected." }, { status: 500 });
  }
}
