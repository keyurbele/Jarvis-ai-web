import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { message, memory } = await req.json();

    // Cleanly format memory array into a string for the AI
    const formattedMemory = Array.isArray(memory) 
      ? memory.join(". ") 
      : (memory || "No previous context.");

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
              content: `You are Jarvis, a witty British AI. 
              User Context: ${formattedMemory}. 
              Be sophisticated, brief, and refer to the user as 'Sir'.`,
            },
            { role: "user", content: message },
          ],
        }),
      }
    );

    const data = await response.json();
    
    // Handle Groq API errors
    if (!data.choices || data.choices.length === 0) {
      return NextResponse.json({ reply: "My neural processors are lagging, Sir." }, { status: 500 });
    }

    const reply = data.choices[0].message.content;
    return NextResponse.json({ reply });

  } catch (error) {
    console.error("API ROUTE ERROR:", error);
    return NextResponse.json({ reply: "System error in the backend, Sir." }, { status: 500 });
  }
}
