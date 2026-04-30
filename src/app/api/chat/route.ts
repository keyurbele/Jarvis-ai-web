import { NextResponse } from "next/server";

type Memory = {
  name?: string;
  preferences?: string[];
  deviceStates?: Record<string, string>;
  otherFacts?: string[];
};

const mergeUnique = (a: string[] = [], b: string[] = []) => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of [...a, ...b]) {
    if (!seen.has(item)) {
      seen.add(item);
      result.push(item);
    }
  }
  return result;
};

const groq = (body: object) =>
  fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

function getInstantReply(msg: string, memory: Memory): string | null {
  const m = msg.toLowerCase().trim();
  if (["hi","hey","hello","sup","yo","wassup"].includes(m))
    return memory.name ? `Hey ${memory.name}, what's up?` : "Hey, what's good?";
  if (m.includes("who built you") || m.includes("who made you")) return "Keyur built me.";
  if (m.includes("lights on")) return "Done, lights are on.";
  if (m.includes("lights off")) return "Done, lights are off.";
  return null;
}

function buildMemoryText(memory: Memory): string {
  if (!memory || Object.keys(memory).length === 0) return "You don't know this user yet.";
  const lines: string[] = [];
  if (memory.name) lines.push(`- Name: ${memory.name}`);
  if (memory.preferences?.length) lines.push(`- Likes: ${memory.preferences.join(", ")}`);
  if (memory.otherFacts?.length) lines.push(`- Notes: ${memory.otherFacts.join(", ")}`);
  return `User profile:\n${lines.join("\n")}`;
}

export async function POST(req: Request) {
  try {
    const { message, history, memory } = await req.json();
    const instant = getInstantReply(message, memory ?? {});
    if (instant) return NextResponse.json({ reply: instant, memory: memory ?? {} });

    const SYSTEM_PROMPT = `You are JARVIS — a calm, intelligent AI assistant.
    ${buildMemoryText(memory ?? {})}
    Rules: Speak naturally, keep it short, no markdown, no asterisks.`;

    const replyRes = await groq({
      model: "llama-3.3-70b-versatile",
      max_tokens: 150,
      temperature: 0.7,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...(Array.isArray(history) ? history.slice(-10) : []),
        { role: "user", content: message },
      ],
    });

    if (!replyRes.ok) return NextResponse.json({ reply: "Lost connection." }, { status: 502 });
    const data = await replyRes.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || "Say that again?";

    // Memory extraction logic
    const memRes = await groq({
      model: "llama-3.1-8b-instant",
      max_tokens: 120,
      temperature: 0.1,
      messages: [
        { role: "system", content: `Extract user facts as JSON: {"name":"","preferences":[],"otherFacts":[]}` },
        { role: "user", content: `Message: "${message}"` },
      ],
    });

    let updatedMemory: Memory = memory ?? {};
    if (memRes.ok) {
      try {
        const md = await memRes.json();
        const extracted = JSON.parse(md.choices?.[0]?.message?.content?.trim().replace(/```json|```/g, "") || "{}");
        if (Object.keys(extracted).length > 0) {
          updatedMemory = { ...updatedMemory, ...extracted, 
            preferences: mergeUnique(updatedMemory.preferences, extracted.preferences),
            otherFacts: mergeUnique(updatedMemory.otherFacts, extracted.otherFacts)
          };
        }
      } catch (e) {}
    }

    return NextResponse.json({ reply, memory: updatedMemory });
  } catch (error) {
    return NextResponse.json({ reply: "Neural core error.", memory: {} }, { status: 500 });
  }
}
