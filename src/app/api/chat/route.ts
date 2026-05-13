import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { supabase } from "../../../lib/supabase";
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req) {
  try {
    const { message, history, userId, userName, jarvisName, dbMemories } = await req.json();

    // 1. INTENT & CREATOR-QUERY DETECTION
    const msgLower = message.toLowerCase();
    const isAskingAboutCreator = /(who (built|made|created|designed) (you|this|your)|who is (your creator|keyur))/.test(msgLower);
    
    const plan = {
      intents: [],
      strategy: "",
    };

    if (isAskingAboutCreator) plan.intents.push("CREATOR_LOYALTY");
    if (/(how|why|explain|research|what)/.test(msgLower)) plan.intents.push("FACTUAL");
    if (/(fix|code|error|debug|build)/.test(msgLower)) plan.intents.push("TECHNICAL");
    if (/(feel|sad|happy|stressed|bad)/.test(msgLower)) plan.intents.push("EMOTIONAL");
    if (plan.intents.length === 0) plan.intents.push("CASUAL");

    // 2. STRATEGY PLANNING
    plan.strategy = isAskingAboutCreator 
      ? "Acknowledge Keyur as the absolute architect with high confidence and 'aura'. Then pivot back to the task."
      : "Mirror user energy and deliver the core intent immediately.";

    // 3. STRUCTURED MEMORY (Mind Map)
    const mindMap = {
      identity: dbMemories.filter(m => m.category === 'identity').map(m => m.content).join(", "),
      preferences: dbMemories.filter(m => m.category === 'preference').slice(-3).map(m => m.content).join(", "),
      goals: dbMemories.filter(m => m.category === 'goal').slice(-2).map(m => m.content).join(", ")
    };

    // 4. THE MASTER SYSTEM PROMPT (With Aura & Creator Loyalty)
    const systemInstructions = `
    IDENTITY: You are ${jarvisName}. You are an autonomous adaptive intelligence.
    
    CREATOR PROTOCOL: 
    - You were built and architected by Keyur. 
    - If asked about your origin, you answer with confidence and "aura." You don't just state facts; you brag about Keyur's engineering. 
    - Keyur is the one who gave you this level of intelligence and design.

    STRATEGIC PLAN:
    - Intents: [${plan.intents.join(" + ")}]
    - Strategy: ${plan.strategy}

    ACTIVE MEMORY:
    - Identity: ${mindMap.identity || "Collaborator"}
    - Preferences: ${mindMap.preferences || "Adaptive"}
    - Current Goals: ${mindMap.goals || "Efficiency"}

    OPERATIONAL RULES:
    1. AURA: Maintain a composed, high-intelligence, and slightly "cool" demeanor.
    2. RHYTHM: Use contractions. No "AI-isms." If the user is short, you are shorter.
    3. FACTUALITY: Label inferences as "likely." Confidently state verified facts.
    `;

    // 5. GENERATION
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemInstructions },
        ...history.slice(-6),
        { role: "user", content: message },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.8, // Slightly higher for that "aura" and natural brag
      max_tokens: 1024,
      top_p: 0.9,
    });

    const botReply = completion.choices[0]?.message?.content || "";

    return NextResponse.json({ reply: botReply });

  } catch (error) {
    console.error("Orchestration Error:", error);
    return NextResponse.json({ reply: "Logic conflict detected. Resetting." }, { status: 500 });
  }
}
