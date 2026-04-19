import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
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
                "You are Jarvis. You respond short, clear, confident.",
            },
            {
              role: "user",
              content: message,
            },
          ],
        }),
      }
    );

    const data = await response.json();

    console.log("GROQ RESPONSE:", data); // IMPORTANT DEBUG

    const reply =
      data?.choices?.[0]?.message?.content ||
      "I didn't get a response.";

    return NextResponse.json({ reply });
  } catch (error) {
    console.log("ERROR:", error);

    return NextResponse.json({
      reply: "Server error. Jarvis is offline.",
    });
  }
}
