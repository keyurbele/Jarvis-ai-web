import { NextResponse } from "next/server";

export async function POST(req) { // Removed Type for pure JS if necessary
  try {
    const { message, memory } = await req.json();

    // ✅ FIX: Turn the Array into a clean, numbered list or string
    const formattedMemory = Array.isArray(memory) 
      ? memory.join(". ") 
      : (memory || "Nothing yet");

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
              Here is what you know about the user: ${formattedMemory}. 
              Keep your responses brief and sophisticated.`,
            },
            { role: "user", content: message },
          ],
        }),
      }
    );

    const data = await response.json();
    
    // Safety check for Groq's response structure
    if (!data.choices || data.choices.length === 0) {
        console.error("Groq API Error:", data);
        return NextResponse.json({ reply: "I'm having trouble connecting to my brain, Sir." });
    }

    const reply = data.choices[0].message.content;
    return NextResponse.json({ reply });

  } catch (error) {
    console.error("Route Error:", error);
    return NextResponse.json({ reply: "Server error, Sir." });
  }
}
