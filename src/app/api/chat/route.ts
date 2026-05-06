export async function POST(req: Request) {
  try {
    // 1. MUST await auth() in Next.js 14/15
    const { userId } = await auth(); 
    
    // Fallback: If auth fails but you're in dev, let it pass
    if (!userId && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { message, history = [], userName } = body;

    if (!message) {
      return NextResponse.json({ reply: "I didn't hear anything, Sir." });
    }

    // 2. Check for the Groq Key
    if (!process.env.GROQ_API_KEY) {
      console.error("GROQ_API_KEY is missing!");
      return NextResponse.json({ reply: "API Key missing in Vercel settings." }, { status: 500 });
    }

    // 3. Talk to Groq
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: `You are JARVIS. Be brief and helpful. Address the user as ${userName || 'Sir'}.` },
          ...history.slice(-3), 
          { role: "user", content: message }
        ],
      }),
    });

    const data = await groqRes.json();
    
    // Log the data for debugging in Vercel
    if (!groqRes.ok) {
        console.error("Groq API Error:", data);
        return NextResponse.json({ reply: "Groq is having trouble, Sir." }, { status: 500 });
    }

    const reply = data.choices?.[0]?.message?.content || "Standing by.";

    return NextResponse.json({ reply });

  } catch (error: any) {
    console.error("CRASH:", error);
    return NextResponse.json({ reply: "Core crash: " + error.message }, { status: 500 });
  }
}
