import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const dynamic = 'force-dynamic'; 

export async function POST(req: Request) {
  try {
    // 1. Get Clerk Data safely
    const { userId } = auth(); 
    
    // In dev, we let it slide, in production, we enforce auth
    if (!userId && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { message, history = [], userName, jarvisName } = body;

    if (!message) {
      return NextResponse.json({ reply: "I didn't hear anything, Sir." });
    }

    // 2. Check for the Groq Key
    if (!process.env.GROQ_API_KEY) {
      console.error("Missing GROQ_API_KEY");
      return NextResponse.json({ reply: "My logic core is missing its API key." }, { status: 500 });
    }

    // 3. Talk to Groq with an improved System Prompt
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
            content: `You are ${jarvisName || 'JARVIS'}. You are a sophisticated AI assistant. 
                     Be brief, witty, and highly helpful. Always address the user as ${userName || 'Sir'}.` 
          },
          ...history.slice(-5), // Increased context slightly for better flow
          { role: "user", content: message }
        ],
        temperature: 0.7,
      }),
    });

    const data = await groqRes.json();
    
    if (!groqRes.ok) {
      throw new Error(data.error?.message || "Groq API Error");
    }

    const reply = data.choices?.[0]?.message?.content || "Standing by.";

    return NextResponse.json({ reply });

  } catch (error: any) {
    console.error("JARVIS ERROR:", error);
    return NextResponse.json({ reply: "Core crash: " + error.message }, { status: 500 });
  }
}
