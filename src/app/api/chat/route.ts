import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server"; // Use /server for API routes

export const dynamic = 'force-dynamic'; 

export async function POST(req: Request) {
  try {
    // 1. Get Clerk Data
    const { userId } = auth(); 
    
    // Fallback: If auth fails but you're in dev, let it pass to test Groq
    if (!userId && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { message, history = [], userName } = body;

    if (!message) {
      return NextResponse.json({ reply: "I didn't hear anything, Sir." });
    }

    // 2. Check for the Groq Key
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ reply: "API Key missing in Vercel settings." }, { status: 500 });
    }

    // 3. Talk to Groq
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: "You are JARVIS. Be brief and helpful." },
          ...history.slice(-3), // Keep context short
          { role: "user", content: message }
        ],
      }),
    });

    const data = await groqRes.json();
    const reply = data.choices?.[0]?.message?.content || "Standing by.";

    return NextResponse.json({ reply });

  } catch (error: any) {
    console.error("CRASH:", error);
    return NextResponse.json({ reply: "Core crash: " + error.message }, { status: 500 });
  }
}
