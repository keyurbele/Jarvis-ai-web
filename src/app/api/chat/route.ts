import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();
    const { message, memory } = body;

    // 1. Check if the API key exists
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ reply: "Sir, the API key is missing from the server environment." }, { status: 500 });
    }

    // 2. Format memory safely
    const formattedMemory = Array.isArray(memory) ? memory.join(". ") : "No context.";

    // 3. Call Groq
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: `You are Jarvis, a witty British AI. Context: ${formattedMemory}. Keep it brief, Sir.`,
            },
            { role: "user", content: message },
          ],
        }),
      }
    );

    const data = await response.json();

    // 4. Handle Groq Errors (like invalid keys)
    if (data.error) {
      console.error("Groq Error:", data.error);
      return NextResponse.json({ reply: `Groq Error: ${data.error.message}` }, { status: 500 });
    }

    const reply = data.choices?.[0]?.message?.content || "I'm drawing a blank, Sir.";
    
    // 5. ALWAYS return JSON
    return NextResponse.json({ reply });

  } catch (error) {
    console.error("FETCH ERROR:", error);
    // This ensures even if it crashes, it returns JSON so the frontend doesn't show that "Unexpected Token" error
    return NextResponse.json({ reply: "Neural link timeout. Please try again, Sir." }, { status: 500 });
  }
}
