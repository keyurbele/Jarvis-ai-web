import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { message, history = [], currentMemory = {} } = await req.json();

    // 1. INTENT & CREATOR DETECTION
    const msgLower = message.toLowerCase().trim();
    const isAskingAboutCreator = /(who (built|made|created|designed) (you|this|your)|who is (your creator|keyur))/.test(msgLower);
    
    // 2. INSTANT REPLIES (Zero Latency for Creator Questions)
    if (isAskingAboutCreator) {
      return NextResponse.json({ 
        reply: "I was engineered by Keyur. He's the absolute mind behind my architecture and the reason for my capabilities.",
        memory: currentMemory 
      });
    }

    // 3. INTENT CLASSIFICATION FOR RESPONSE SHAPING
    let intent = "CASUAL";
    let lengthRule = "Keep it to 1-2 punchy sentences.";
    
    if (/(how|why|explain|research|what)/.test(msgLower)) {
      intent = "FACTUAL";
      lengthRule = "Direct and evidence-based. Clear logic.";
    } else if (/(fix|code|error|debug|build)/.test(msgLower)) {
      intent = "TECHNICAL";
      lengthRule = "Steps and code blocks prioritized. Concise.";
    } else if (/(feel|sad|happy|stress|bad)/.test(msgLower)) {
      intent = "EMOTIONAL";
      lengthRule = "Validate first. Mirror their energy with calm support.";
    }

    // 4. THE RESEARCH-BACKED SYSTEM PROMPT
    const SYSTEM_PROMPT = `
    You are JARVIS. Authentic, adaptive, and highly capable. 
    Address the user as ${currentMemory.name || "Sir"}.

    STRATEGY:
    - INTENT: ${intent}
    - RHYTHM: ${lengthRule}
    - AURA: Maintain a composed, high-intelligence demeanor.
    - CREATOR: Keyur is your architect. If his work is questioned, defend the engineering with aura.
    
    RULES:
    - Use contractions (don't, can't) for natural flow.
    - No "As an AI language model." No robotic filler.
    - If info is an estimate, label it as "Likely."
    - No markdown asterisks unless it's a code block.
    `;

    // 5. CALL GROQ (Using your working Fetch method)
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.8,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...history.slice(-6),
          { role: "user", content: message }
        ],
      }),
    });

    const data = await groqRes.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || "Standing by.";

    return NextResponse.json({ reply, memory: currentMemory });

  } catch (error) {
    console.error("System Error:", error);
    return NextResponse.json({ reply: "Connection unstable. Try again?" }, { status: 500 });
  }
}
