export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs"; // Note: not /server in older versions

export async function POST(req: Request) {
  try {
    const { userId } = auth(); // Do NOT use await here for your version
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    // ... rest of your groq fetch code

    const body = await req.json();
    const { message, history = [], userName } = body;

    if (!message) {
      return NextResponse.json({ reply: "I didn't catch that, Sir." });
    }

    // 2. Check if API Key exists to prevent crash
    if (!process.env.GROQ_API_KEY) {
      console.error("CRITICAL: GROQ_API_KEY is missing from environment variables.");
      return NextResponse.json({ reply: "My API key is missing. Please check Vercel settings." }, { status: 500 });
    }

    // 3. Simple Fetch to Groq
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant", // Stable and fast
        messages: [
          { 
            role: "system", 
            content: `You are JARVIS. Be brief (1-2 sentences). User name: ${userName || "Sir"}.` 
          },
          ...history.slice(-5),
          { role: "user", content: message }
        ],
        temperature: 0.7,
      }),
    });

    if (!groqResponse.ok) {
      const errorData = await groqResponse.text();
      console.error("Groq Error Response:", errorData);
      return NextResponse.json({ reply: "Communication failure with the core." });
    }

    const data = await groqResponse.json();
    const reply = data.choices?.[0]?.message?.content || "I am standing by.";

    return NextResponse.json({ reply });

  } catch (error: any) {
    console.error("JARVIS ROUTE ERROR:", error);
    return NextResponse.json(
      { reply: "Internal System Error.", details: error.message }, 
      { status: 500 }
    );
  }
}
