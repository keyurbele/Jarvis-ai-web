import { NextResponse } from "next/server";

type Memory = {
  name?: string;
  preferences?: string[];
  deviceStates?: Record<string, string>;
  otherFacts?: string[];
};

// ── Groq helper ───────────────────────────────────────────────
const groq = (body: object) =>
  fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

// ── Instant commands (FAST PATH) ─────────────────────────────
function instantReply(msg: string, memory: Memory): string | null {
  const m = msg.toLowerCase().trim();

  if (["hi", "hey", "hello", "yo"].includes(m))
    return memory.name ? `Hey ${memory.name}.` : "Hey.";

  if (m.includes("who built you") || m.includes("who made you"))
    return "Keyur built me.";

  if (m.includes("what's my name"))
    return memory.name ? `You're ${memory.name}.` : "I don't know your name yet.";

  if (m.includes("lights on")) return "Lights are on.";
  if (m.includes("lights off")) return "Lights are off.";
  if (m.includes("fan on")) return "Fan is on.";
  if (m.includes("fan off")) return "Fan is off.";

  return null;
}

// ── Memory filter (IMPORTANT FIX) ─────────────────────────────
function getMemoryContext(memory: Memory, message: string) {
  if (!memory) return "";

  const msg = message.toLowerCase();

  const relevantPrefs =
    memory.preferences?.filter(p =>
      msg.includes(p.toLowerCase().split(" ")[0])
    ) || [];

  const lines: string[] = [];

  if (memory.name) lines.push(`Name: ${memory.name}`);
  if (relevantPrefs.length) lines.push(`Interests: ${relevantPrefs.join(", ")}`);
  if (memory.otherFacts?.length)
    lines.push(`Facts: ${memory.otherFacts.slice(-3).join(", ")}`);

  return lines.join("\n");
}

// ── Memory extractor ──────────────────────────────────────────
async function extractMemory(message: string, memory: Memory) {
  const res = await groq({
    model: "llama-3.1-8b-instant",
    max_tokens: 120,
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content:
          'Extract ONLY stable user info. Return JSON: {"name":"","preferences":[],"otherFacts":[]}. If nothing, return {}.',
      },
      {
        role: "user",
        content: `Message: ${message}\nMemory: ${JSON.stringify(memory)}`,
      },
    ],
  });

  if (!res.ok) return memory;

  try {
    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? "{}";
    const extracted = JSON.parse(raw.replace(/```json|```/g, ""));

    return {
      ...memory,
      ...extracted,
      preferences: [
        ...new Set([...(memory.preferences || []), ...(extracted.preferences || [])]),
      ],
      otherFacts: [
        ...new Set([...(memory.otherFacts || []), ...(extracted.otherFacts || [])]),
      ],
    };
  } catch {
    return memory;
  }
}

// ── MAIN ROUTE ────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const { message, history, memory } = await req.json();

    // 1. Instant response path
    const instant = instantReply(message, memory ?? {});
    if (instant) {
      return NextResponse.json({ reply: instant, memory: memory ?? {} });
    }

    const memoryContext = getMemoryContext(memory ?? {}, message);

    const recent = Array.isArray(history)
      ? history.slice(-8).map((m: any) => `${m.role}: ${m.content}`).join("\n")
      : "";

    // 2. Generate response (single call = faster + cleaner)
    const res = await groq({
      model: "llama-3.3-70b-versatile",
      max_tokens: 180,
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: `
You are JARVIS — a highly intelligent, calm AI assistant.

Rules:
- Speak naturally like a smart human.
- Keep responses short unless detail is needed.
- Never sound robotic.
- Never repeat yourself.
- No markdown, no bullets, no formatting.
- Avoid filler like "Sure", "Certainly", "As an AI".

${memoryContext ? `User memory:\n${memoryContext}` : "No user memory yet."}

Recent conversation:
${recent}
`,
        },
        { role: "user", content: message },
      ],
    });

    if (!res.ok) {
      return NextResponse.json(
        { reply: "Connection issue, try again.", memory },
        { status: 500 }
      );
    }

    const data = await res.json();
    const reply =
      data.choices?.[0]?.message?.content?.trim() || "Say that again?";

    // 3. Update memory (lightweight)
    const updatedMemory = await extractMemory(message, memory ?? {});

    return NextResponse.json({
      reply,
      memory: updatedMemory,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { reply: "Something broke, try again.", memory: {} },
      { status: 500 }
    );
  }
}
