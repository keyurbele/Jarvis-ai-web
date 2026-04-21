import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message, memory } = await req.json(); // Now receiving structured memory

    // Format memory into a "User Profile" for the AI
    const userProfile = memory.map((m: any) => `- ${m.type.toUpperCase()} (${m.key}): ${m.value}`).join("\n");

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
            content: `You are a sophisticated AI assistant. 
            USER PROFILE:
            ${userProfile || "No data yet."}
            
            Use this profile to personalize your responses. Be brief and professional.` 
          },
          { role: "user", content: message }
        ],
      }),
    });

    const data = await response.json();
    return NextResponse.json({ reply: data.choices[0].message.content });
  } catch (error) {
    return NextResponse.json({ error: "Neural core offline." }, { status: 500 });
  }
}
