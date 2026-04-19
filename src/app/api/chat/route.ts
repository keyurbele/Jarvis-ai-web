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
          // UPDATED MODEL: llama3-8b-8192 is decommissioned.
          // Using llama-3.3-70b-versatile for high quality or llama-3.1-8b-instant for speed.
          model: "llama-3.3-70b-versatile", 
          messages: [
            {
              role: "system",
              content: "You are Jarvis. You are highly intelligent, sophisticated, and slightly witty. Use contractions (I'm, don't, won't) to sound natural. Keep responses brief. Address the user as 'Sir' occasionally, but don't overdo it. You are a calm British assistant, not a search engine.",
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

    console.log("GROQ RESPONSE:", data);

    // If Groq returns an error, this will help you see it in the UI instead of a generic "No response"
    if (data.error) {
      return NextResponse.json({ reply: `Groq Error: ${data.error.message}` });
    }

    const reply =
      data?.choices?.[0]?.message?.content ||
      "I am connected, but I have no words.";

    return NextResponse.json({ reply });
  } catch (error) {
    console.log("ERROR:", error);

    return NextResponse.json({
      reply: "System failure. Jarvis is offline.",
    });
  }
}
