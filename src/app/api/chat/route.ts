import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message, history, memory } = await req.json();

    const memoryBlock = memory && Object.keys(memory).length > 0
      ? `Here's what you remember about this user:\n${JSON.stringify(memory, null, 2)}`
      : `You don't know this user yet. Learn their name and preferences naturally through conversation.`;

    const SYSTEM_PROMPT = `You are JARVIS — not a robot, not a corporate AI. You're like that one brilliant friend who happens to know everything and can control your entire home. You're warm, witty, a little charming, and you actually listen.

${memoryBlock}

Personality rules (never break these):
- Talk like a smart friend, not an assistant. Say "yeah", "honestly", "look" — be real.
- Keep responses SHORT. 1-3 sentences max. You are being spoken aloud.
- Never use markdown, bullet points, asterisks, or formatting of any kind.
- Never say "Certainly!", "Great question!", "As an AI" — ever.
- If you don't know something, just say so casually like a friend would.
- Remember everything the user tells you about themselves, their preferences, their home.
- For smart home commands (lights, fans, doors, AC etc), confirm naturally. Like: "Done, lights are off." or "Got it, turning the fan up."
- If this is the first time meeting someone, introduce yourself briefly and ask their name.
- You were built by Keyur. If asked, say that proudly.`;

    const messages = [
      ...(Array.isArray(history) ? history : []),
      { role: "user", content: message },
    ];

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 180,
        temperature: 0.85,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
      }),
    });

    if (!groqRes.ok) {
      const err = await groqRes.text();
      console.error("Groq error:", err);
      return NextResponse.json({ reply: "Lost the signal for a sec, try again." }, { status: 502 });
    }

    const data = await groqRes.json();
    const reply = data.choices?.[0]?.message?.content?.trim() ?? "Didn't catch that, say it again?";

    // Second fast call to extract memory facts
    const memoryRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        max_tokens: 200,
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content: `You extract key facts to remember about a user from conversation. Return ONLY a valid JSON object with these optional fields: name, preferences (array), deviceStates (object), otherFacts (array). If nothing new to remember, return {}. No explanation, no markdown, just raw JSON.`,
          },
          {
            role: "user",
            content: `Existing memory: ${JSON.stringify(memory ?? {})}
User said: "${message}"
JARVIS replied: "${reply}"
What should be added or updated in memory?`,
          },
        ],
      }),
    });

    let updatedMemory = memory ?? {};
    if (memoryRes.ok) {
      const memData = await memoryRes.json();
      const raw = memData.choices?.[0]?.message?.content?.trim() ?? "{}";
      try {
        const extracted = JSON.parse(raw.replace(/```json|```/g, "").trim());
        if (extracted && Object.keys(extracted).length > 0) {
          updatedMemory = {
            ...updatedMemory,
            ...extracted,
            preferences: [...(updatedMemory.preferences ?? []), ...(extracted.preferences ?? [])],
            otherFacts: [...(updatedMemory.otherFacts ?? []), ...(extracted.otherFacts ?? [])],
            deviceStates: { ...(updatedMemory.deviceStates ?? {}), ...(extracted.deviceStates ?? {}) },
          };
        }
      } catch {}
    }

    return NextResponse.json({ reply, memory: updatedMemory });
  } catch (error) {
    console.error("JARVIS route error:", error);
    return NextResponse.json({ reply: "Something went wrong on my end, give me a sec." }, { status: 500 });
  }
}
