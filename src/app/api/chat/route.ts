import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // Destructure both the message and the memory we sent
    const { message, memory } = await req.json();

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
              Here is what you remember about the user: ${memory || "Nothing yet"}. 
              Use this info to be personal and helpful. Keep it brief.`,
            },
            { role: "user", content: message },
          ],
        }),
      }
    );

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content || "I'm offline.";

    return NextResponse.json({ reply });
  } catch (error) {
    return NextResponse.json({ reply: "Server error, Sir." });
  }
}
