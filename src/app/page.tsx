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
  const [mounted, setMounted] = useState(false);

  const recognitionRef = useRef<any>(null);
  const historyRef = useRef<any[]>([]);
  const stateRef = useRef<JarvisState>("IDLE");
  const micOnRef = useRef(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { micOnRef.current = micOn; }, [micOn]);

  useEffect(() => {
    if (user?.id) {
      const saved = localStorage.getItem(`jarvis_mem_${user.id}`);
      if (saved) setMemory(JSON.parse(saved));
    }
  }, [user?.id]);

  // --- 1. THE MOUTH (INFINITE AURA VOICE) ---
  const speak = useCallback((text: string) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    
    // THE GOLDEN RATIO: Deep, charming, masculine
    u.pitch = 0.45; 
    u.rate = 0.85;  
    u.volume = 1.0; 

    const voices = window.speechSynthesis.getVoices();
    const bestVoice = voices.find(v => v.name.includes("Google UK English Male")) || 
                      voices.find(v => v.name.includes("James")) ||
                      voices.find(v => v.name.includes("David"));
    
    if (bestVoice) u.voice = bestVoice;

    u.onstart = () => setState("SPEAKING");
    u.onend = () => {
      if (micOnRef.current) {
        setState("LISTENING");
        // Slight delay so he doesn't hear himself finish
        setTimeout(() => { try { recognitionRef.current?.start(); } catch {} }, 350);
      } else { 
        setState("IDLE"); 
      }
    };
    window.speechSynthesis.speak(u);
  }, []);

  // --- 2. THE BRAIN (GROQ API) ---
  const askJarvis = useCallback(async (input: string) => {
    if (!input.trim()) return;
    window.speechSynthesis.cancel();
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

      historyRef.current = [
        ...historyRef.current, 
        { role: "user", content: input }, 
        { role: "assistant", content: data.reply }
      ].slice(-10);

      setLog(prev => [`USER: ${input.toUpperCase()}`, `JARVIS: ${data.reply}`, ...prev].slice(0, 5));
      speak(data.reply);
    } catch {
      setState("IDLE");
    }
  }, [memory, speak, user?.id]);

  // --- 3. THE EARS ---
  const setupRecognition = useCallback(() => {
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) return null;

    const r = new SR();
    r.continuous = true;
    r.interimResults = true; 
    r.lang = "en-US";

    r.onresult = (e: any) => {
      const result = e.results[e.results.length - 1];
      const text = result[0].transcript.trim();

      // INTERRUPT: Stop speaking if user starts talking
      if (text.length > 2 && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        setState("LISTENING");
      }

      if (result.isFinal) {
        askJarvis(text);
      }
    };

    r.onend = () => {
      if (micOnRef.current && stateRef.current !== "THINKING" && stateRef.current !== "SPEAKING") {
        try { r.start(); } catch {}
      }
    };

    return r;
  }, [askJarvis]);

  const toggleMic = () => {
    if (micOnRef.current) {
      setMicOn(false);
      setState("IDLE");
      window.speechSynthesis.cancel();
      try { recognitionRef.current?.stop(); } catch {}
    } else {
      if (!recognitionRef.current) recognitionRef.current = setupRecognition();
      setMicOn(true);
      setState("LISTENING");
      try { recognitionRef.current?.start(); } catch {}
    }
  };

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-[#020917] text-white font-mono overflow-hidden selection:bg-cyan-500/30">
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 backdrop-blur-xl bg-[#020917]/60">
        <div className="max-w-7xl mx-auto px-6 h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LucideCpu size={20} className="text-cyan-400" />
            <span className="font-bold text-xl tracking-tighter uppercase">
              JARVIS<span className="text-cyan-400 font-light ml-1">OS</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="text-[10px] tracking-widest px-4 py-2 border border-white/10 rounded-full hover:bg-white/5 transition-all">SIGN_IN</button>
              </SignInButton>
            </SignedOut>
            <SignedIn><UserButton /></SignedIn>
          </div>
        </div>
      </nav>

      {!isActive ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-8xl font-black tracking-tighter mb-8 animate-pulse">JARVIS</h1>
            <button 
              onClick={() => { setIsActive(true); speak("System initialized. I am online."); }} 
              className="px-12 py-5 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-cyan-400 font-bold hover:bg-cyan-500/20 transition-all uppercase tracking-widest"
            >
              Initialize System
            </button>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto grid grid-cols-12 gap-8 pt-32 px-6 h-screen">
          <div className="col-span-3 space-y-6">
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-md">
              <div className="flex items-center gap-2 mb-4 text-cyan-400/50 text-[10px] uppercase tracking-widest">
                <LucideBrain size={14} /> Memory_Core
              </div>
              <div className="text-[11px] text-gray-400 space-y-2">
                <p><span className="text-gray-600">User:</span> {memory.name || "Unknown"}</p>
                {memory.preferences?.map((p: string, i: number) => <p key={i}>• {p}</p>)}
              </div>
            </div>
          </div>

          <div className="col-span-6 flex flex-col items-center">
            <div className={`relative w-80 h-80 rounded-full flex items-center justify-center transition-all duration-1000 ${state !== 'IDLE' ? 'scale-110' : 'scale-100'}`}
              style={{ 
                boxShadow: state === 'LISTENING' ? '0 0 80px #22d3ee22' : 'none', 
                border: `1px solid ${state === 'LISTENING' ? '#22d3ee40' : '#ffffff10'}` 
              }}>
              <div className="absolute inset-0 rounded-full border border-cyan-500/10 animate-[spin_10s_linear_infinite]" />
              <LucideMic size={48} className={state === 'LISTENING' ? 'text-cyan-400 animate-pulse' : 'text-gray-700'} />
            </div>
            
            <div className="mt-12 text-center h-32">
              <p className="text-[10px] tracking-[0.5em] text-cyan-400 mb-4 uppercase">{state}</p>
              <p className="text-lg italic text-gray-300 max-w-md mx-auto leading-relaxed">
                {response ? `"${response}"` : "Awaiting input..."}
              </p>
            </div>
            
            <div className="flex gap-6">
              <button onClick={toggleMic} className={`w-16 h-16 rounded-full border flex items-center justify-center transition-all ${micOn ? 'bg-cyan-500/20 border-cyan-500' : 'bg-white/5 border-white/10'}`}>
                {micOn ? <LucideMic size={24} className="text-cyan-400" /> : <LucideMicOff size={24} className="text-gray-600" />}
              </button>
              <button onClick={() => window.location.reload()} className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500/20 transition-all">
                <LucidePower size={24} />
              </button>
            </div>
          </div>

          <div className="col-span-3">
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-md">
              <div className="flex items-center gap-2 mb-4 text-gray-500 text-[10px] uppercase tracking-widest">
                <LucideTerminal size={14} /> System_Logs
              </div>
              <div className="space-y-3">
                {log.map((l, i) => <p key={i} className="text-[9px] text-gray-500 font-mono truncate border-l border-white/10 pl-2">{l}</p>)}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
