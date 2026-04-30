import { NextResponse } from "next/server";

type Memory = {
  name?: string;
  preferences?: string[];
  deviceStates?: Record<string, string>;
  otherFacts?: string[];
};

// ── Safe array merge helper (FIXES VERCEL BUILD ERROR) ─────────────────────
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

// ── Groq helper ────────────────────────────────────────────────────────────
const groq = (body: object) =>
  fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

// ── Instant replies (no AI) ────────────────────────────────────────────────
function getInstantReply(msg: string, memory: Memory): string | null {
  const m = msg.toLowerCase().trim();

  if (["hi","hey","hello","sup","yo","wassup"].includes(m))
    return memory.name ? `Hey ${memory.name}, what's up?` : "Hey, what's good?";

  if (m.includes("who built you") || m.includes("who made you") || m.includes("who created you"))
    return "Keyur built me.";

  if (m.includes("what's my name") || m.includes("what is my name"))
    return memory.name ? `Your name is ${memory.name}.` : "You haven't told me your name yet.";

  if (m.includes("lights on")  || m.includes("turn on the light"))  return "Done, lights are on.";
  if (m.includes("lights off") || m.includes("turn off the light")) return "Done, lights are off.";
  if (m.includes("fan on")     || m.includes("turn on the fan"))    return "Fan's on.";
  if (m.includes("fan off")    || m.includes("turn off the fan"))   return "Fan's off.";
  if (m.includes("ac on")      || m.includes("turn on the ac"))     return "AC's on.";
  if (m.includes("ac off")     || m.includes("turn off the ac"))    return "AC's off.";
  if (m.includes("lock the door")   || m.includes("lock door"))     return "Door's locked.";
  if (m.includes("unlock the door") || m.includes("unlock door"))   return "Door's unlocked.";

  return null;
}

// ── Memory formatting ───────────────────────────────────────────────────────
function buildMemoryText(memory: Memory): string {
  if (!memory || Object.keys(memory).length === 0)
    return "You don't know this user yet.";

  const lines: string[] = [];

  if (memory.name) lines.push(`- Name: ${memory.name}`);
  if (memory.preferences?.length) lines.push(`- Likes: ${memory.preferences.join(", ")}`);
  if (memory.otherFacts?.length) lines.push(`- Notes: ${memory.otherFacts.join(", ")}`);

  if (memory.deviceStates && Object.keys(memory.deviceStates).length) {
    lines.push(
      `- Devices: ${Object.entries(memory.deviceStates)
        .map(([k, v]) => `${k} is ${v}`)
        .join(", ")}`
    );
  }

  return `User profile:\n${lines.join("\n")}`;
}

// ── MAIN API ────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const { message, history, memory } = await req.json();

    // 1. Instant response
    const instant = getInstantReply(message, memory ?? {});
    if (instant) {
      return NextResponse.json({ reply: instant, memory: memory ?? {} });
    }

    const SYSTEM_PROMPT = `You are JARVIS — a calm, intelligent AI assistant.

${buildMemoryText(memory ?? {})}

Rules:
- Speak naturally, like a real human assistant.
- Keep responses short unless needed.
- Never sound robotic.
- No markdown, no bullet points, no asterisks.
- Never start with "Sure", "Certainly", "Of course".
- Only mention Keyur if asked who built you.`;

    // 2. Main AI response
    const replyRes = await groq({
      model: "llama-3.3-70b-versatile",
      max_tokens: 150,
      temperature: 0.7,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...(Array.isArray(history) ? history.slice(-20) : []),
        { role: "user", content: message },
      ],
    });

    if (!replyRes.ok) {
      return NextResponse.json(
        { reply: "Lost connection, try again.", memory: memory ?? {} },
        { status: 502 }
      );
    }

    const data = await replyRes.json();
    const reply =
      data.choices?.[0]?.message?.content?.trim() || "Say that again?";

    // 3. Memory extraction
    const memRes = await groq({
      model: "llama-3.1-8b-instant",
      max_tokens: 120,
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: `Extract ONLY long-term user facts.
Return JSON:
{"name":"","preferences":[],"otherFacts":[]}
If none, return {}.`,
        },
        {
          role: "user",
          content: `Message: "${message}"\nMemory: ${JSON.stringify(memory ?? {})}`,
        },
      ],
    });

    let updatedMemory: Memory = memory ?? {};

    if (memRes.ok) {
      try {
        const md = await memRes.json();
        const raw = md.choices?.[0]?.message?.content?.trim() ?? "{}";

        const extracted = JSON.parse(raw.replace(/```json|```/g, "").trim());

        if (extracted && Object.keys(extracted).length > 0) {
          updatedMemory = {
            ...updatedMemory,
            ...extracted,
            preferences: mergeUnique(
              updatedMemory.preferences,
              extracted.preferences
            ),
            otherFacts: mergeUnique(
              updatedMemory.otherFacts,
              extracted.otherFacts
            ),
            deviceStates: {
              ...(updatedMemory.deviceStates ?? {}),
              ...(extracted.deviceStates ?? {}),
            },
          };
        }
      } catch {
        // ignore parsing errors safely
      }
    }

    return NextResponse.json({ reply, memory: updatedMemory });
  } catch (error) {
    console.error("JARVIS error:", error);
    return NextResponse.json(
      { reply: "Something went wrong, give me a sec.", memory: {} },
      { status: 500 }
    );
  }
}
