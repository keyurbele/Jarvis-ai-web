"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { SignInButton, UserButton, SignedOut, SignedIn, useUser } from "@clerk/nextjs";
import { LucideCpu, LucideMic, LucideMicOff, LucidePower, LucideTerminal, LucideBrain, LucideX } from "lucide-react";

type JarvisState = "IDLE" | "LISTENING" | "THINKING" | "SPEAKING";

export default function JarvisOS() {
  const { user } = useUser();
  const [isActive, setIsActive] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [state, setState] = useState<JarvisState>("IDLE");
  const [response, setResponse] = useState("");
  const [memory, setMemory] = useState<any>({});
  const [log, setLog] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  
  // NEW VIEW STATE
  const [view, setView] = useState<"STANDARD" | "DASHBOARD_AURA">("STANDARD");

  const recognitionRef = useRef<any>(null);
  const historyRef = useRef<any[]>([]);
  const stateRef = useRef<JarvisState>("IDLE");
  const micOnRef = useRef(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { micOnRef.current = micOn; }, [micOn]);

  const speak = useCallback((text: string) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.pitch = 0.75; u.rate = 0.85; u.volume = 1.0; 
    const voices = window.speechSynthesis.getVoices();
    const bestVoice = voices.find(v => v.name.includes("Google UK English Male")) || voices.find(v => v.name.includes("David"));
    if (bestVoice) u.voice = bestVoice;

    u.onstart = () => setState("SPEAKING");
    u.onend = () => {
      if (micOnRef.current) {
        setState("LISTENING");
        setTimeout(() => { try { recognitionRef.current?.start(); } catch {} }, 400);
      } else { setState("IDLE"); }
    };
    window.speechSynthesis.speak(u);
  }, []);

  const askJarvis = useCallback(async (input: string) => {
    if (!input.trim()) return;
    setState("THICKING");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, history: historyRef.current, memory }),
      });
      const data = await res.json();
      setResponse(data.reply);
      setLog(prev => [`USER: ${input.toUpperCase()}`, `JARVIS: ${data.reply}`, ...prev].slice(0, 5));
      speak(data.reply);
    } catch { setState("IDLE"); }
  }, [memory, speak]);

  const setupRecognition = useCallback(() => {
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) return null;
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e: any) => {
      const result = e.results[e.results.length - 1];
      if (result.isFinal) askJarvis(result[0].transcript.trim());
    };
    return r;
  }, [askJarvis]);

  const toggleMic = () => {
    if (micOnRef.current) {
      setMicOn(false);
      setState("IDLE");
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
      
      {/* 1. THE MAGNIFICENT FULL SCREEN ORB (DASHBOARD MODE) */}
      <div className={`fixed inset-0 z-[100] bg-[#020617] flex items-center justify-center transition-all duration-1000 ease-in-out ${view === "DASHBOARD_AURA" ? "opacity-100 pointer-events-auto scale-100" : "opacity-0 pointer-events-none scale-110"}`}>
        <button onClick={() => setView("STANDARD")} className="absolute top-10 right-10 p-4 rounded-full bg-white/5 border border-white/10 hover:border-cyan-500/50 transition-all group">
          <LucideX className="text-slate-500 group-hover:text-cyan-400" size={24} />
        </button>

        <div className="relative w-[600px] h-[600px] flex items-center justify-center">
          {/* Hyper-reactive Rings */}
          <div className="absolute inset-0 rounded-full border border-cyan-500/10 animate-[spin_40s_linear_infinite]" />
          <div className="absolute inset-10 rounded-full border-[0.5px] border-cyan-400/20 animate-[spin_25s_linear_infinite_reverse]" />
          <div className="absolute inset-20 rounded-full border-2 border-dashed border-cyan-500/5 animate-[spin_60s_linear_infinite]" />
          
          {/* The Core */}
          <div className={`w-[400px] h-[400px] rounded-full flex items-center justify-center transition-all duration-1000 ${state === 'LISTENING' ? 'bg-cyan-500/10 shadow-[0_0_150px_rgba(34,211,238,0.2)]' : 'bg-transparent'}`}>
            <LucideMic size={120} className={`transition-all duration-700 ${state === 'LISTENING' ? 'text-cyan-400' : 'text-slate-900'}`} />
          </div>
          
          {/* Floating Text Aura */}
          <div className="absolute -bottom-20 text-center w-full">
             <p className="text-cyan-400/40 uppercase tracking-[1em] text-[10px] animate-pulse">Neural Link Active</p>
          </div>
        </div>
      </div>

      {/* 2. THE STANDARD OS INTERFACE */}
      <div className={`transition-all duration-1000 ${view === "DASHBOARD_AURA" ? "blur-2xl scale-95 opacity-0" : "blur-0 scale-100 opacity-100"}`}>
        <nav className="border-b border-white/5 bg-[#020617]/80 backdrop-blur-md px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <LucideCpu size={18} className="text-cyan-400" />
            <span className="font-bold tracking-tighter text-lg uppercase italic">Jarvis<span className="text-cyan-400 font-light">OS</span></span>
          </div>
          <SignedIn><UserButton /></SignedIn>
        </nav>

        {!isActive ? (
          <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
            <button onClick={() => { setIsActive(true); speak("Welcome back, Keyur."); }} className="px-12 py-5 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-cyan-400 font-bold uppercase tracking-widest hover:bg-cyan-500/20 transition-all">Initialize</button>
          </div>
        ) : (
          <div className="grid grid-cols-12 h-[calc(100vh-4rem)]">
            <aside className="col-span-3 border-r border-white/5 p-8 space-y-10">
              <section>
                <p className="text-[9px] text-slate-600 uppercase tracking-[0.3em] mb-6">Navigation</p>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-cyan-500/10 border border-cyan-400/30 text-cyan-400 text-xs font-semibold cursor-pointer">
                    <LucideMic size={16} /> Voice Core
                  </div>
                  {/* DASHBOARD TRIGGER */}
                  <div onClick={() => setView("DASHBOARD_AURA")} className="flex items-center gap-3 p-3 text-slate-500 hover:text-slate-300 transition-colors text-xs cursor-pointer group">
                    <LucideTerminal size={16} className="group-hover:text-cyan-400" /> Dashboard
                  </div>
                </div>
              </section>
            </aside>

            <main className="col-span-6 flex flex-col items-center justify-center p-12">
              <div className="relative w-80 h-80 flex items-center justify-center mb-12">
                <div className="absolute inset-0 rounded-full border border-cyan-500/5 animate-[spin_20s_linear_infinite]" />
                <div className={`w-48 h-48 rounded-full flex items-center justify-center transition-all duration-700 ${state === 'LISTENING' ? 'bg-cyan-500/10' : 'bg-transparent'}`}>
                  <LucideMic size={48} className={state === 'LISTENING' ? 'text-cyan-400' : 'text-slate-800'} />
                </div>
              </div>
              <div className="w-full max-w-lg p-6 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
                <p className="text-sm italic text-slate-300 font-light">{response || "Awaiting command..."}</p>
              </div>
              
              <div className="mt-12 flex gap-8">
                <button onClick={toggleMic} className={`w-14 h-14 rounded-full border flex items-center justify-center transition-all ${micOn ? 'bg-cyan-500 border-cyan-400' : 'bg-white/5 border-white/10'}`}>
                  <LucideMic size={20} className={micOn ? 'text-[#020617]' : 'text-slate-500'} />
                </button>
                <button onClick={() => window.location.reload()} className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <LucidePower size={20} className="text-red-500" />
                </button>
              </div>
            </main>

            <aside className="col-span-3 border-l border-white/5 p-8">
               <p className="text-[9px] text-slate-600 uppercase tracking-[0.3em] mb-6">System Log</p>
               <div className="space-y-4">
                 {log.map((l, i) => (
                   <div key={i} className="text-[9px] border-l border-cyan-500/20 pl-3 py-1">
                     <p className="text-slate-400 italic line-clamp-2">{l}</p>
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
