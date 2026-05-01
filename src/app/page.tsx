"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { SignInButton, UserButton, SignedOut, SignedIn, useUser } from "@clerk/nextjs";
import { 
  LucideCpu, 
  LucideMic, 
  LucideMicOff, 
  LucidePower, 
  LucideTerminal, 
  LucideBrain, 
  LucideX // Added this import
} from "lucide-react";

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
  
  // View state: STANDARD is the grid, AURA is the magnificent orb
  const [view, setView] = useState<"STANDARD" | "AURA">("STANDARD");

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

  const speak = useCallback((text: string) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.pitch = 0.75; u.rate = 0.80; u.volume = 1.0; 

    const voices = window.speechSynthesis.getVoices();
    const bestVoice = voices.find(v => v.name.includes("Google UK English Male")) || 
                      voices.find(v => v.name.includes("David"));
    
    if (bestVoice) u.voice = bestVoice;

    u.onstart = () => setState("SPEAKING");
    u.onend = () => {
      if (micOnRef.current) {
        setState("LISTENING");
        setTimeout(() => { try { recognitionRef.current?.start(); } catch {} }, 350);
      } else { setState("IDLE"); }
    };
    window.speechSynthesis.speak(u);
  }, []);

  const askJarvis = useCallback(async (input: string) => {
    if (!input.trim()) return;
    window.speechSynthesis.cancel();
    setState("THINKING"); // Fixed typo from THICKING
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
      setLog(prev => [`USER: ${input.toUpperCase()}`, `JARVIS: ${data.reply}`, ...prev].slice(0, 5));
      speak(data.reply);
    } catch { setState("IDLE"); }
  }, [memory, speak, user?.id]);

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
      if (text.length > 2 && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        setState("LISTENING");
      }
      if (result.isFinal) askJarvis(text);
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
    <main className="min-h-screen bg-[#020617] text-slate-300 font-sans overflow-hidden relative">
      
      {/* 1. THE MAGNIFICENT FULL SCREEN ORB (AURA MODE) */}
      <div className={`fixed inset-0 z-[100] bg-black flex items-center justify-center transition-all duration-1000 ease-in-out ${view === "AURA" ? "opacity-100 pointer-events-auto scale-100" : "opacity-0 pointer-events-none scale-125"}`}>
        <button 
          onClick={() => setView("STANDARD")} 
          className="absolute top-10 right-10 p-4 rounded-full bg-white/5 border border-white/10 hover:border-cyan-500/50 transition-all group"
        >
          <LucideX className="text-slate-500 group-hover:text-cyan-400" size={24} />
        </button>

        <div className="relative w-[600px] h-[600px] flex items-center justify-center">
          {/* Reactive Rings - Faster & More Complex in Aura Mode */}
          <div className="absolute inset-0 rounded-full border border-cyan-500/10 animate-[spin_30s_linear_infinite]" />
          <div className="absolute inset-10 rounded-full border-[0.5px] border-cyan-400/20 animate-[spin_20s_linear_infinite_reverse]" />
          <div className="absolute inset-20 rounded-full border-2 border-dashed border-cyan-500/5 animate-[spin_15s_linear_infinite]" />
          
          {/* The Magnificent Core */}
          <div className={`w-[450px] h-[450px] rounded-full flex items-center justify-center transition-all duration-1000 ${
            state === 'LISTENING' ? 'bg-cyan-500/5 shadow-[0_0_200px_rgba(34,211,238,0.15)] scale-105' : 'bg-transparent'
          }`}>
            <LucideMic 
              size={140} 
              className={`transition-all duration-700 ${
                state === 'LISTENING' ? 'text-cyan-400 drop-shadow-[0_0_30px_rgba(34,211,238,0.6)]' : 'text-slate-900'
              }`} 
            />
          </div>
          
          <div className="absolute -bottom-24 text-center w-full">
             <p className="text-cyan-400/30 uppercase tracking-[1.5em] text-[10px] animate-pulse">System Matrix Active</p>
          </div>
        </div>
      </div>

      {/* 2. THE STANDARD OS INTERFACE */}
      <div className={`transition-all duration-1000 ${view === "AURA" ? "blur-3xl scale-90 opacity-0" : "blur-0 scale-100 opacity-100"}`}>
        <nav className="border-b border-white/5 bg-[#020617]/80 backdrop-blur-md px-8 h-16 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-4">
            <LucideCpu size={18} className="text-cyan-400" />
            <span className="font-bold tracking-tighter text-lg uppercase italic">Jarvis<span className="text-cyan-400 font-light">OS</span></span>
          </div>
          <SignedIn><UserButton /></SignedIn>
        </nav>

        {!isActive ? (
          <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
            <button onClick={() => { setIsActive(true); speak("System initialized."); }} className="px-12 py-5 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-cyan-400 font-bold hover:bg-cyan-500/20 transition-all uppercase tracking-widest">Initialize System</button>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-0 h-[calc(100vh-4rem)]">
            {/* SIDEBAR */}
            <aside className="col-span-3 border-r border-white/5 p-8 space-y-10">
              <section>
                <p className="text-[9px] text-slate-600 uppercase tracking-[0.3em] mb-6">Navigation</p>
                <div className="space-y-4">
                  <div onClick={() => setView("STANDARD")} className="flex items-center gap-3 p-3 rounded-lg bg-cyan-500/10 border border-cyan-400/30 text-cyan-400 text-xs font-semibold cursor-pointer">
                    <LucideMic size={16} /> Voice Core
                  </div>
                  <div onClick={() => { setView("AURA"); speak("Dashboard expanded."); }} className="flex items-center gap-3 p-3 text-slate-500 hover:text-slate-300 transition-colors text-xs cursor-pointer group">
                    <LucideTerminal size={16} className="group-hover:text-cyan-400" /> Dashboard
                  </div>
                </div>
              </section>
            </aside>

            {/* CENTER */}
            <main className="col-span-6 flex flex-col items-center justify-center relative p-12">
              <div className="relative w-96 h-96 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border border-cyan-500/5 animate-[spin_20s_linear_infinite]" />
                <div className={`w-64 h-64 rounded-full flex items-center justify-center transition-all duration-700 ${state === 'LISTENING' ? 'bg-cyan-500/10' : 'bg-transparent'}`}>
                  <LucideMic size={48} className={state === 'LISTENING' ? 'text-cyan-400' : 'text-slate-800'} />
                </div>
              </div>
              <div className="w-full max-w-lg mt-8 p-6 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
                <p className="text-sm italic text-slate-300 font-light">{response || "Awaiting command..."}</p>
              </div>
              <div className="mt-12 flex gap-8">
                <button onClick={toggleMic} className={`w-14 h-14 rounded-full border flex items-center justify-center transition-all ${micOn ? 'bg-cyan-500 border-cyan-400' : 'bg-white/5 border-white/10'}`}>
                  <LucideMic size={20} className={micOn ? 'text-[#020617]' : 'text-slate-500'} />
                </button>
              </div>
            </main>

            {/* RIGHT SIDEBAR (Stats) */}
            <aside className="col-span-3 border-l border-white/5 p-8">
              <p className="text-[9px] text-slate-600 uppercase tracking-[0.3em] mb-6">System Log</p>
              <div className="space-y-4">
                {log.map((l, i) => (
                  <div key={i} className="text-[9px] border-l border-cyan-500/20 pl-3 py-1">
                    <p className="text-slate-400 italic">{l}</p>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
