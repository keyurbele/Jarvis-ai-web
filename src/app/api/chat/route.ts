import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json({ reply: "No input received." });
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          {
            role: "system",
            content:
              "You are Jarvis, a smart AI assistant. Keep replies short and confident.",
          },
          { role: "user", content: message },
        ],
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    return NextResponse.json({
      reply: data.choices?.[0]?.message?.content || "No response.",
    });

  } catch (error) {
    return NextResponse.json({
      reply: "Error: AI not responding.",
    });
  }
}
