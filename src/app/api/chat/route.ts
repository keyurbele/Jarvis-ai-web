import { NextResponse } from "next/server";

type Memory = {
  name?: string;
  preferences?: string[];
  otherFacts?: string[];
};

const mergeUnique = (a: string[] = [], b: string[] = []) => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of [...(a || []), ...(b || [])]) {
    if (!seen.has(item)) {
      seen.add(item);
      result.push(item);
    }
  }
  return result;
};

const groqFetch = (body: object) =>
  fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

export async function POST(req: Request) {
  try {
    const { message, history, memory } = await req.json();

    // 1. Check for creator query
    const m = message.toLowerCase();
    if (m.includes("who built you") || m.includes("who made you") || m.includes("who created you")) {
      return NextResponse.json({ reply: "Keyur built me.", memory: memory ?? {} });
    }

    const memoryContext = memory?.name ? `User Name: ${memory.name}. Prefs: ${memory.preferences?.join(", ")}` : "User unknown.";

    const SYSTEM_PROMPT = `You are JARVIS, a professional AI system.
    Built by: Keyur (only mention if asked).
    Persona: Intelligent, concise, professional, NOT a Marvel character.
    Context: ${memoryContext}
    Rules: No markdown, no bolding, max 2 sentences.`;

    // 2. Get AI Response
    const replyRes = await groqFetch({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...(Array.isArray(history) ? history.slice(-5) : []),
        { role: "user", content: message },
      ],
    });

    const data = await replyRes.json();
    const reply = data.choices?.[0]?.message?.content || "Connection lost.";

    // 3. Simple Memory Extraction
    const memRes = await groqFetch({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: `Extract facts as JSON: {"name":"","preferences":[]}` },
        { role: "user", content: message },
      ],
    });

    let updatedMemory = memory ?? {};
    try {
      const memData = await memRes.json();
      const extracted = JSON.parse(memData.choices[0].message.content);
      if (extracted.name) updatedMemory.name = extracted.name;
      if (extracted.preferences) updatedMemory.preferences = mergeUnique(updatedMemory.preferences, extracted.preferences);
    } catch (e) {}

    return NextResponse.json({ reply, memory: updatedMemory });
  } catch (error) {
    return NextResponse.json({ reply: "System error." }, { status: 500 });
  }
}
