"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { SignInButton, UserButton, SignedOut, SignedIn, useUser } from "@clerk/nextjs";
import { LucideCpu, LucideMic, LucideMicOff, LucidePower, LucideTerminal, LucideBrain, LucideZap, LucideChevronRight } from "lucide-react";

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
  const micOnRef = useRef(false);
  const stateRef = useRef<JarvisState>("IDLE");

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { micOnRef.current = micOn; }, [micOn]);

  // Memory Sync
  useEffect(() => {
    if (user?.id) {
      const saved = localStorage.getItem(`jarvis_v2_${user.id}`);
      if (saved) setMemory(JSON.parse(saved));
    }
  }, [user?.id]);

  const speak = useCallback((text: string) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95; u.pitch = 0.9;
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
        if (user?.id) localStorage.setItem(`jarvis_v2_${user.id}`, JSON.stringify(data.memory));
      }
      historyRef.current = [...historyRef.current, { role: "user", content: input }, { role: "assistant", content: data.reply }].slice(-10);
      setLog(prev => [`> ${input.toUpperCase()}`, ...prev].slice(0, 5));
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

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-[#020617] text-white font-mono selection:bg-cyan-500/30">
      {/* 🧭 NAVIGATION */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 backdrop-blur-xl bg-[#020617]/50">
        <div className="max-w-7xl mx-auto px-6 h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LucideCpu size={20} className="text-cyan-400" />
            <span className="font-bold text-xl tracking-tighter uppercase">JARVIS<span className="text-cyan-400 font-light ml-1">OS</span></span>
          </div>
          <div className="flex items-center gap-4">
            <SignedOut><SignInButton mode="modal"><button className="text-[10px] tracking-widest px-4 py-2 border border-white/10 rounded-full hover:bg-white/5 transition-all">SIGN_IN</button></SignInButton></SignedOut>
            <SignedIn><UserButton /></SignedIn>
          </div>
        </div>
      </nav>

      {!isActive ? (
        <div className="flex items-center justify-center min-h-screen relative px-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,211,238,0.05)_0%,transparent_70%)]" />
          <div className="text-center z-10">
            <h1 className="text-8xl font-black tracking-tighter mb-4">JARVIS</h1>
            <p className="text-gray-500 tracking-[0.4em] text-xs mb-12 uppercase">Universal Neural Interface</p>
            <button 
              onClick={() => { setIsActive(true); speak(memory.name ? `Welcome back ${memory.name}. System online.` : "System initialized. I am JARVIS."); }}
              className="px-12 py-5 bg-cyan-500/10 border border-cyan-400/30 rounded-2xl text-cyan-400 font-bold hover:bg-cyan-400/20 transition-all flex items-center gap-3 mx-auto"
            >
              INITIALIZE SYSTEM <LucideChevronRight size={18} />
            </button>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto grid grid-cols-12 gap-8 pt-32 px-6 h-screen">
          
          {/* LEFT: MEMORY */}
          <div className="col-span-12 lg:col-span-3">
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-md h-[400px]">
              <div className="flex items-center gap-2 mb-8 text-cyan-400/50 text-[10px] uppercase tracking-[0.2em]">
                <LucideBrain size={14} /> Neural_Profile
              </div>
              <div className="space-y-4 text-[11px] text-gray-400">
                <p><span className="text-gray-600 tracking-widest uppercase block mb-1">Subject:</span> {memory.name || "UNIDENTIFIED"}</p>
                {memory.preferences?.length > 0 && (
                  <div>
                    <span className="text-gray-600 tracking-widest uppercase block mb-1">Preferences:</span>
                    {memory.preferences.map((p:any, i:number) => <p key={i} className="text-cyan-400/80">• {p}</p>)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CENTER: ORB */}
          <div className="col-span-12 lg:col-span-6 flex flex-col items-center">
            <div className="relative flex items-center justify-center w-80 h-80">
              <div className={`absolute inset-0 rounded-full border border-cyan-500/10 transition-all duration-1000 ${state !== 'IDLE' ? 'scale-125 opacity-100' : 'scale-100 opacity-20'}`} />
              <div className="absolute inset-0 rounded-full border border-white/5 animate-[spin_15s_linear_infinite]" />
              
              <div 
                className="w-64 h-64 rounded-full flex items-center justify-center transition-all duration-700"
                style={{ 
                  boxShadow: state === 'LISTENING' ? '0 0 100px #22d3ee15' : 'none',
                  border: `1px solid ${state === 'LISTENING' ? '#22d3ee40' : '#ffffff10'}`,
                  background: `radial-gradient(circle, ${state === 'LISTENING' ? '#22d3ee08' : 'transparent'} 0%, transparent 70%)`
                }}
              >
                <LucideMic size={40} className={micOn ? 'text-cyan-400 animate-pulse' : 'text-gray-800'} />
              </div>
            </div>

            <div className="mt-12 text-center">
              <p className="text-[10px] tracking-[0.8em] text-cyan-400 mb-6 uppercase">{state}</p>
              <div className="h-24">
                <p className="text-lg font-light text-gray-200 italic max-w-lg mx-auto leading-relaxed">
                  {response ? `"${response}"` : "SYSTEM_READY"}
                </p>
              </div>
            </div>

            <div className="flex gap-6 mt-12">
              <button onClick={toggleMic} className={`w-16 h-16 rounded-full border flex items-center justify-center transition-all ${micOn ? 'bg-cyan-500/10 border-cyan-500 shadow-[0_0_20px_#22d3ee33]' : 'bg-white/5 border-white/10 hover:border-white/30'}`}>
                {micOn ? <LucideMic size={22} className="text-cyan-400" /> : <LucideMicOff size={22} className="text-gray-500" />}
              </button>
              <button onClick={() => window.location.reload()} className="w-16 h-16 rounded-full bg-red-500/5 border border-red-500/20 text-red-500/50 hover:text-red-500 hover:border-red-500/50 transition-all flex items-center justify-center">
                <LucidePower size={22} />
              </button>
            </div>
          </div>

          {/* RIGHT: LOGS */}
          <div className="col-span-12 lg:col-span-3 space-y-6">
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-md">
              <div className="flex items-center gap-2 mb-6 text-gray-600 text-[10px] uppercase tracking-widest">
                <LucideTerminal size={14} /> Telemetry_Feed
              </div>
              <div className="space-y-4">
                {log.map((l, i) => (
                  <p key={i} className="text-[9px] text-gray-500 font-mono border-l border-white/5 pl-3 truncate">{l}</p>
                ))}
              </div>
            </div>
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
               <LucideZap size={16} className="text-cyan-400/50 mb-3" />
               <p className="text-[10px] text-gray-500 tracking-widest uppercase">Sync_Latency</p>
               <p className="text-xs font-bold text-gray-400">0.0014 MS</p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
