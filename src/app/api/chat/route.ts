import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "../../../lib/supabase";

// ── Main handler ────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    // 1. MUST await auth in 2026 Next.js versions
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { message, history = [], userName, jarvisName } = await req.json();

    // 2. Initial Memory setup
    let memory = { name: userName || "Sir" };

    // 3. Brain Call (Combined for reliability)
    // We use the 8b model because it's faster and won't trigger rate limits as easily
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant", 
        temperature: 0.7,
        max_tokens: 150,
        messages: [
          { 
            role: "system", 
            content: `You are ${jarvisName || "JARVIS"}. Personality: Calm, witty, masculine. Rules: Short responses, no markdown. User is ${userName || "Sir"}. Keyur built you.` 
          },
          ...history.slice(-6), // Keep history lean
          { role: "user", content: message }
        ],
      }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      console.error("Groq Error:", errorData);
      return NextResponse.json({ reply: "My neural link is flickering. Try again, Sir." });
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || "I'm standing by.";

    // 4. Background Memory (Don't let this block the reply)
    // We fire and forget this so JARVIS replies instantly
    extractAndSaveMemory(message, userId).catch(err => console.error("Memory Silent Error:", err));

    return NextResponse.json({ reply, memory });

  } catch (error) {
    console.error("CRITICAL API ERROR:", error);
    return NextResponse.json({ reply: "Systems are offline. Check your API key configuration." }, { status: 500 });
  }
}

// Separate function to keep the main route fast
async function extractAndSaveMemory(message: string, userId: string) {
  // Only save if the message is long enough to be useful
  if (message.length < 5) return;
  
  try {
    await supabase.from("memories").insert([
      { user_id: userId, content: message, is_auto: true }
    ]);
  } catch (e) {
    console.error("Supabase Save Fail:", e);
  }
}
