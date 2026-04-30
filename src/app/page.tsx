"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { SignInButton, UserButton, SignedOut, SignedIn, useUser } from "@clerk/nextjs";
import { LucideCpu, LucideMic, LucideMicOff, LucidePower, LucideTerminal, LucideBrain } from "lucide-react";

type JarvisState = "IDLE" | "LISTENING" | "THINKING" | "SPEAKING";

export default function JarvisOS() {
  const { user } = useUser();
  const [isActive, setIsActive] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [state, setState] = useState<JarvisState>("IDLE");
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [memory, setMemory] = useState<any>({});
  const [log, setLog] = useState<string[]>([]);

  const recognitionRef = useRef<any>(null);
  const historyRef = useRef<any[]>([]);
  const stateRef = useRef<JarvisState>("IDLE");
  const micOnRef = useRef(false);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { micOnRef.current = micOn; }, [micOn]);

  // Persistent Memory Sync
  useEffect(() => {
    if (user?.id) {
      const saved = localStorage.getItem(`jarvis_mem_${user.id}`);
      if (saved) setMemory(JSON.parse(saved));
    }
  }, [user?.id]);

  const speak = useCallback((text: string) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.9; u.pitch = 0.8;
    u.onstart = () => {
      setState("SPEAKING");
      try { recognitionRef.current?.stop(); } catch {}
    };
    u.onend = () => {
      if (micOnRef.current) {
        setState("LISTENING");
        setTimeout(() => { try { recognitionRef.current?.start(); } catch {} }, 400);
      } else { setState("IDLE"); }
    };
    window.speechSynthesis.speak(u);
  }, []);

  const askJarvis = useCallback(async (input: string) => {
    setState("THINKING");
    setTranscript(input);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, history: historyRef.current, memory }),
      });
      const data = await res.json();
      setResponse(data.reply);
      if (data.memory) {
        setMemory(data.memory);
        if (user?.id) localStorage.setItem(`jarvis_mem_${user.id}`, JSON.stringify(data.memory));
      }
      historyRef.current = [...historyRef.current, { role: "user", content: input }, { role: "assistant", content: data.reply }].slice(-10);
      setLog(prev => [`User: ${input}`, `JARVIS: ${data.reply}`, ...prev].slice(0, 5));
      speak(data.reply);
    } catch { setState("IDLE"); }
  }, [memory, speak, user?.id]);

  const toggleMic = () => {
    if (micOnRef.current) {
      setMicOn(false);
      setState("IDLE");
      try { recognitionRef.current?.stop(); } catch {}
    } else {
      const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      if (!recognitionRef.current) {
        recognitionRef.current = new SR();
        recognitionRef.current.continuous = true;
        recognitionRef.current.onresult = (e: any) => {
          const text = e.results[e.results.length - 1][0].transcript;
          if (e.results[e.results.length - 1].isFinal && stateRef.current === "LISTENING") askJarvis(text);
        };
      }
      setMicOn(true);
      setState("LISTENING");
      recognitionRef.current.start();
    }
  };

  return (
    <main className="min-h-screen bg-[#020917] text-white font-mono overflow-hidden selection:bg-cyan-500/30">
      {/* 🧭 NAVIGATION BAR */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 backdrop-blur-xl bg-[#020917]/60">
        <div className="max-w-7xl mx-auto px-6 h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LucideCpu size={20} className="text-cyan-400" />
            <span className="font-bold text-xl tracking-tighter">JARVIS<span className="text-cyan-400 font-light">OS</span></span>
          </div>
          <div className="flex items-center gap-4">
            <SignedOut><SignInButton mode="modal"><button className="text-xs tracking-widest px-4 py-2 border border-white/10 rounded-full">SIGN IN</button></SignInButton></SignedOut>
            <SignedIn><UserButton /></SignedIn>
          </div>
        </div>
      </nav>

      {!isActive ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-8xl font-black tracking-tighter mb-8">JARVIS</h1>
            <button onClick={() => { setIsActive(true); speak("System initialized. How can I help you today?"); }} className="px-12 py-5 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-cyan-400 font-bold hover:bg-cyan-500/20 transition-all">INITIALIZE SYSTEM</button>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto grid grid-cols-12 gap-8 pt-32 px-6 h-screen">
          
          {/* LEFT: MEMORY PANEL */}
          <div className="col-span-3 space-y-6">
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-md">
              <div className="flex items-center gap-2 mb-4 text-cyan-400/50 text-[10px] uppercase tracking-widest">
                <LucideBrain size={14} /> Memory_Core
              </div>
              <div className="text-[11px] text-gray-400 space-y-2">
                {memory.name ? <p>User: {memory.name}</p> : <p>Identity: Unknown</p>}
                {memory.preferences?.map((p: string, i: number) => <p key={i}>• {p}</p>)}
              </div>
            </div>
          </div>

          {/* CENTER: ORB UI */}
          <div className="col-span-6 flex flex-col items-center">
            <div className={`relative w-80 h-80 rounded-full flex items-center justify-center transition-all duration-1000 ${state !== 'IDLE' ? 'scale-110' : 'scale-100'}`}
              style={{ boxShadow: state === 'LISTENING' ? '0 0 100px #22d3ee22' : 'none', border: `1px solid ${state === 'LISTENING' ? '#22d3ee40' : '#ffffff10'}` }}>
              <div className="absolute inset-0 rounded-full border border-cyan-500/10 animate-[spin_10s_linear_infinite]" />
              <LucideMic size={48} className={state === 'LISTENING' ? 'text-cyan-400' : 'text-gray-600'} />
            </div>
            <div className="mt-12 text-center">
              <p className="text-xs tracking-[0.5em] text-cyan-400 mb-4">{state}</p>
              <p className="text-lg italic text-gray-300 max-w-md">"{response || "Awaiting input..."}"</p>
            </div>
            
            {/* CONTROLS */}
            <div className="flex gap-4 mt-12">
              <button onClick={toggleMic} className={`p-6 rounded-full border transition-all ${micOn ? 'bg-cyan-500/20 border-cyan-500' : 'bg-white/5 border-white/10'}`}>
                {micOn ? <LucideMic size={24} className="text-cyan-400" /> : <LucideMicOff size={24} />}
              </button>
              <button onClick={() => window.location.reload()} className="p-6 rounded-full bg-red-500/10 border border-red-500/20 text-red-500"><LucidePower size={24} /></button>
            </div>
          </div>

          {/* RIGHT: LOG PANEL */}
          <div className="col-span-3">
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="flex items-center gap-2 mb-4 text-gray-500 text-[10px] uppercase tracking-widest">
                <LucideTerminal size={14} /> System_Logs
              </div>
              <div className="space-y-3">
                {log.map((l, i) => <p key={i} className="text-[10px] text-gray-500 font-mono truncate">{l}</p>)}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
