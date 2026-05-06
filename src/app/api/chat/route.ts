import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server"; 

export const dynamic = 'force-dynamic'; // Ensures Next.js doesn't cache the API

type Memory = {
  name?: string;
  preferences?: string[];
  otherFacts?: string[];
};

async function extractMemory(message: string, memory: Memory) {
  try {
    if (!process.env.GROQ_API_KEY) return memory;

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
            content: `Return ONLY JSON: {name?: string, preferences?: string[], otherFacts?: string[]}. If no info, return {}`
          },
          { role: "user", content: message }
        ]
      }),
    });

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim() || "{}");

    return {
      ...memory,
      name: parsed.name || memory.name,
      preferences: [...(memory.preferences || []), ...(parsed.preferences || [])],
      otherFacts: [...(memory.otherFacts || []), ...(parsed.otherFacts || [])],
    };
  } catch (e) {
    console.error("Memory Extraction Error:", e);
    return memory;
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth(); 
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { message, history = [], userName } = await req.json();

    if (!message) return NextResponse.json({ reply: "I didn't hear anything." });

    // 1. Memory Sync
    const updatedMemory = await extractMemory(message, { name: userName });

    // 2. Main AI Response
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { 
            role: "system", 
            content: `You are JARVIS. Be brief (1-2 sentences). User name: ${updatedMemory.name || "Sir"}.` 
          },
          ...history.slice(-5),
          { role: "user", content: message }
        ],
      }),
    });

    if (!res.ok) {
        const errorText = await res.text();
        console.error("Groq API Error:", errorText);
        return NextResponse.json({ reply: "I'm having trouble connecting to my brain right now." });
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || "I am standing by.";

    return NextResponse.json({ reply, memory: updatedMemory });

  } catch (error: any) {
    console.error("Route Error:", error);
    return NextResponse.json({ reply: "System error: " + (error.message || "Unknown") }, { status: 500 });
  }
}
