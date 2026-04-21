import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message, memory } = await req.json();

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { 
            role: "system", 
            content: `You are a professional AI assistant. User Profile Data:\n${memory}\nAlways refer to the user as "Sir". Be brief and witty.` 
          },
          { role: "user", content: message }
        ],
      }),
    });

    const data = await response.json();
    return NextResponse.json({ reply: data.choices[0].message.content });
  } catch (error) {
    return NextResponse.json({ reply: "Connection to neural core lost, Sir." }, { status: 500 });
  }
}
