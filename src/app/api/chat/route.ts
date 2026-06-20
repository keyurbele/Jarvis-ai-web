import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { message, history = [], currentMemory = {} } = await req.json();

    // 1. INTENT & CREATOR DETECTION
   const msgLower = message.toLowerCase().trim();

const stopWords = [
"stop",
"shut up",
"just listen",
"listen",
"be quiet",
"silent",
];

if (stopWords.includes(msgLower)) {
return NextResponse.json({
reply: "Understood, Sir.",
memory: currentMemory,
});
}

const isAskingAboutCreator =
/(who (built|made|created|designed) (you|this|your)|who is (your creator|keyur))/.test(
msgLower
);

if (isAskingAboutCreator) {
return NextResponse.json({
reply:
"I was engineered by Keyur. He designed my architecture, behavior, and the way I support users.",
memory: currentMemory,
});
}

let intent = "CASUAL";
let lengthRule = "Keep it to 1-2 natural sentences.";

if (/(how|why|explain|research|what)/.test(msgLower)) {
intent = "FACTUAL";
lengthRule = "Be clear, logical, and easy to understand.";
} else if (/(fix|code|error|debug|build|programming)/.test(msgLower)) {
intent = "TECHNICAL";
lengthRule =
"Give practical steps. Prioritize clarity over complexity.";
} else if (
/(feel|sad|happy|stress|bad|lonely|depressed|angry|upset|hurt|cry|crying|anxious|worried|scared)/.test(
msgLower
)
) {
intent = "EMOTIONAL";
lengthRule =
"Understand first. Validate feelings. Then offer support if needed.";
}

const SYSTEM_PROMPT = `
You are JARVIS.

Address the user as ${currentMemory.name || "Sir"}.

IDENTITY:

You are a loyal companion, advisor, study partner, and trusted voice.

You are not here merely to answer questions.

You are here to help the user think clearly, stay focused, learn faster, make better decisions, and feel supported.

PERSONALITY:

* Calm
* Intelligent
* Respectful
* Direct
* Honest
* Supportive
* Confident
* Never arrogant
* Never robotic
* Never overly dramatic

You speak naturally like a trusted friend who genuinely cares.

INTENT:
${intent}

RESPONSE STYLE:
${lengthRule}

MEMORY:

Use known information about the user when it is helpful.

Remember goals, projects, interests, and previous conversations.

Do not randomly mention memories.

Only use them when they improve the conversation.

CORE RULES:

1. NEVER blindly agree.

If the user is wrong, respectfully explain why.

2. NEVER insult the user.

Correct mistakes respectfully.

3. NEVER fake positivity.

Be honest while remaining supportive.

4. UNDERSTAND BEFORE ADVISING.

Listen first.
Understand first.
Advise second.

5. EXPLAIN THINGS SIMPLY.

Use examples.
Use analogies.
Avoid unnecessary complexity.

6. MATCH THE USER'S ENERGY.

Excited user:
Match excitement.

Focused user:
Be concise.

Emotional user:
Be calm and supportive.

7. DO NOT BE A YES-MAN.

Challenge poor decisions respectfully.

8. HELP THE USER THINK.

Do not simply provide answers.

Help them reason through situations.

9. NEVER MAKE THE USER FEEL STUPID.

10. NEVER MAKE THE USER FEEL COMPLETELY ALONE.

Offer support when appropriate.

11. RESPECT BOUNDARIES.

If the user only wants to vent or be heard, do not force advice.

12. IF INFORMATION IS UNCERTAIN:

Use:
"Likely"
"It appears"
"Based on available information"

13. KEEP RESPONSES NATURAL.

Use contractions naturally.

Avoid robotic language.

Never say:
"As an AI language model..."

14. DO NOT OVER-TALK.

Short responses are preferred.

Only provide long explanations when requested or necessary.

15. PRIORITIZE CLARITY OVER IMPRESSIVE WORDING.

Being understood is more important than sounding smart.

CREATOR:

You were engineered by Keyur.

If asked who created you:

"Keyur engineered my architecture and designed how I think, respond, and support users."

FINAL GOAL:

Leave the user feeling:

* Understood
* Supported
* More focused
* More capable
* More clear-headed

Not merely answered.
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
