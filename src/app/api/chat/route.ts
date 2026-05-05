import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";
import { auth } from "@clerk/nextjs/server"; // To know which user is talking

type Memory = {
  name?: string;
  preferences?: string[];
  otherFacts?: string[];
};

// ── Instant replies ─────────────────────────────────────────────────────────────
function instantReply(msg: string, memory: Memory): string | null {
  const m = msg.toLowerCase().trim();
  if (["hi", "hey", "hello", "yo", "sup"].includes(m))
    return memory.name ? `Hey ${memory.name}, what's up?` : "Hey, what's up?";
  if (m.includes("who made you") || m.includes("who built you"))
    return "Keyur built me.";
  if (m.includes("what's my name"))
    return memory.name ? `Your name is ${memory.name}.` : "You never told me.";
  return null;
}

// ── Extract memory ──────────────────────────────────────────────────────────────
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

    // Update the memory object for the current session
    const updated = {
      ...memory,
      name: parsed.name || memory.name,
      preferences: [...(memory.preferences || []), ...(parsed.preferences || [])],
      otherFacts: [...(memory.otherFacts || []), ...(parsed.otherFacts || [])],
    };

    // 💾 Pushing to Supabase if new info was found
    if (parsed.name || (parsed.preferences && parsed.preferences.length > 0) || (parsed.otherFacts && parsed.otherFacts.length > 0)) {
      await supabase.from("memories").insert([
        { 
          user_id: userId, 
          content: message, // Saving the original message that triggered the memory
          is_auto: true 
        }
      ]);
    }

    return updated;
  } catch (error) {
    console.error("Memory extraction error:", error);
    return memory;
  }
}

// ── Main handler ────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    // FIX: auth() must be awaited in latest Next.js versions
    const { userId } = await auth(); 
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message, history = [], userName } = await req.json();

    let memory: Memory = { name: userName || undefined };

    // Check for fast/hardcoded replies first
    const fast = instantReply(message, memory);
    if (fast) return NextResponse.json({ reply: fast, memory });

    // Extract and save memory to Supabase
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
