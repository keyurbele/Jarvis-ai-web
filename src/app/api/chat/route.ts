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
            content: `You are a sophisticated AI assistant named Jarvis. 
            USER PROFILE DATA:
            ${memory}
            
            Always refer to the user as "Sir". Be witty, professional, and use the profile data to be personal.` 
          },
          { role: "user", content: message }
        ],
      }),
    });
    // ... handle response
