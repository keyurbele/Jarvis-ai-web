import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    
    // Clean, direct response. No filler.
    const aiResponse = `Acknowledged. You said ${message}. System is ready.`;

    return NextResponse.json({ reply: aiResponse });
  } catch (error) {
    return NextResponse.json({ reply: "Neural link error." }, { status: 500 });
  }
}
