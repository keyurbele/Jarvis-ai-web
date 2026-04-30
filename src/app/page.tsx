"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { SignInButton, UserButton, SignedOut, SignedIn, useUser } from "@clerk/nextjs";
import { LucideCpu, LucideMic, LucideMicOff, LucidePower } from "lucide-react";

type JarvisState = "IDLE" | "LISTENING" | "THINKING" | "SPEAKING";

type HistoryEntry = { role: "user" | "assistant"; content: string };

type Memory = {
  name?: string;
  preferences?: string[];
  deviceStates?: Record<string, string>;
  otherFacts?: string[];
};

// ─────────────────────────────────────────────
// FIX 1: safer API wrapper
// ─────────────────────────────────────────────
const groq = async (body: object) => {
  return fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY}`,
    },
    body: JSON.stringify(body),
  });
};

// ─────────────────────────────────────────────
// FIX 2: stronger intent matching (prevents misses)
// ─────────────────────────────────────────────
function getInstantReply(msg: string, memory: Memory): string | null {
  const m = msg.toLowerCase().trim();

  if (["hi", "hey", "hello", "sup", "yo", "wassup"].includes(m))
    return memory.name ? `Hey ${memory.name}, what's up?` : "Hey, what's good?";

  if (m.includes("who built you") || m.includes("who made you") || m.includes("who created you"))
    return "Keyur built me.";

  if (m.includes("what's my name") || m.includes("what is my name"))
    return memory.name ? `Your name is ${memory.name}.` : "You haven't told me your name yet.";

  if (m.includes("light") && m.includes("on")) return "Done, lights are on.";
  if (m.includes("light") && m.includes("off")) return "Done, lights are off.";

  if (m.includes("fan") && m.includes("on")) return "Fan's on.";
  if (m.includes("fan") && m.includes("off")) return "Fan's off.";

  if (m.includes("ac") && m.includes("on")) return "AC's on.";
  if (m.includes("ac") && m.includes("off")) return "AC's off.";

  if (m.includes("lock")) return "Door's locked.";
  if (m.includes("unlock")) return "Door's unlocked.";

  return null;
}

// ─────────────────────────────────────────────
// FIX 3: memory safety (no crashes)
// ─────────────────────────────────────────────
function getRelevantMemory(memory: Memory, message: string): string {
  if (!memory) return "";

  const msg = message.toLowerCase();
  const lines: string[] = [];

  if (memory.name) lines.push(`Name: ${memory.name}`);

  const prefs =
    memory.preferences?.filter(p =>
      msg.split(" ").some(w => w.length > 3 && p.toLowerCase().includes(w))
    ) || [];

  if (prefs.length) lines.push(`Interests: ${prefs.join(", ")}`);

  if (memory.otherFacts?.length)
    lines.push(`Facts: ${memory.otherFacts.join(", ")}`);

  if (memory.deviceStates && Object.keys(memory.deviceStates).length)
    lines.push(
      `Devices: ${Object.entries(memory.deviceStates)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ")}`
    );

  return lines.join("\n");
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function JarvisOS() {
  const { user } = useUser();

  const [isActive, setIsActive] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [state, setState] = useState<JarvisState>("IDLE");
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [memory, setMemory] = useState<Memory>({});
  const [log, setLog] = useState<string[]>([]);

  const recognitionRef = useRef<any>(null);
  const historyRef = useRef<HistoryEntry[]>([]);
  const micOnRef = useRef(false);
  const stateRef = useRef<JarvisState>("IDLE");
  const speakingRef = useRef(false);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { micOnRef.current = micOn; }, [micOn]);

  // ─────────────────────────────────────────────
  // FIX 4: safe voice loading (prevents undefined crash)
  // ─────────────────────────────────────────────
  const speak = useCallback((text: string) => {
    window.speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.9;
    u.pitch = 0.8;

    u.onstart = () => {
      setState("SPEAKING");
      speakingRef.current = true;
      recognitionRef.current?.stop();
    };

    u.onend = () => {
      speakingRef.current = false;
      if (micOnRef.current) {
        setState("LISTENING");
        try { recognitionRef.current?.start(); } catch {}
      } else {
        setState("IDLE");
      }
    };

    window.speechSynthesis.speak(u);
  }, []);

  // ─────────────────────────────────────────────
  // FIX 5: robust API call handling
  // ─────────────────────────────────────────────
  const askJarvis = useCallback(async (input: string) => {
    setState("THINKING");
    setTranscript(input);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          history: historyRef.current.slice(-16),
          memory,
        }),
      });

      const data = await res.json();
      const reply = data.reply || "Say that again?";

      historyRef.current.push(
        { role: "user", content: input },
        { role: "assistant", content: reply }
      );

      setResponse(reply);
      setMemory(data.memory || {});
      setLog(prev => [`You: ${input}`, `JARVIS: ${reply}`, ...prev].slice(0, 8));

      speak(reply);
    } catch {
      setState("IDLE");
      setLog(prev => ["Connection error", ...prev]);
    }
  }, [memory, speak]);

  // ─────────────────────────────────────────────
  // FIX 6: speech recognition stability
  // ─────────────────────────────────────────────
  const setupRecognition = useCallback(() => {
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) return null;

    const r = new SR();
    r.continuous = true;
    r.interimResults = false;
    r.lang = "en-US";

    r.onresult = (e: any) => {
      if (stateRef.current !== "LISTENING") return;
      if (speakingRef.current) return;

      const text = e.results[e.results.length - 1][0].transcript.trim();
      if (text) askJarvis(text);
    };

    r.onend = () => {
      if (micOnRef.current && stateRef.current === "LISTENING") {
        try { r.start(); } catch {}
      }
    };

    return r;
  }, [askJarvis]);

  const toggleMic = useCallback(() => {
    if (!isActive) return;

    if (micOnRef.current) {
      setMicOn(false);
      recognitionRef.current?.stop();
      setState("IDLE");
    } else {
      if (!recognitionRef.current)
        recognitionRef.current = setupRecognition();

      setMicOn(true);
      setState("LISTENING");
      recognitionRef.current?.start();
    }
  }, [isActive, setupRecognition]);

  const launchSystem = useCallback(() => {
    setIsActive(true);
    setTimeout(() => speak("Hey, I'm JARVIS. Ready when you are."), 300);
  }, [speak]);

  const shutdown = useCallback(() => {
    window.speechSynthesis.cancel();
    recognitionRef.current?.stop();
    setMicOn(false);
    setIsActive(false);
    setState("IDLE");
    setLog([]);
  }, []);

  const color = "#22d3ee";

  return (
    <main className="min-h-screen bg-[#020917] text-white font-mono">
      
      {!isActive ? (
        <div className="flex items-center justify-center min-h-screen">
          <button onClick={launchSystem}>
            INITIALIZE SYSTEM
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-screen gap-10">

          <div className="text-center">
            <p>{state}</p>
            {transcript && <p>"{transcript}"</p>}
          </div>

          {response && <p>"{response}"</p>}

          <div className="flex gap-6">
            <button onClick={toggleMic}>
              {micOn ? <LucideMic /> : <LucideMicOff />}
            </button>

            <button onClick={shutdown}>
              <LucidePower />
            </button>
          </div>

          {log.map((l, i) => (
            <p key={i}>{l}</p>
          ))}
        </div>
      )}
    </main>
  );
}
