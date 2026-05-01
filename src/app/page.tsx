"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { SignInButton, UserButton, SignedOut, SignedIn, useUser } from "@clerk/nextjs";
import { 
  LucideCpu, 
  LucideMic, 
  LucideTerminal, 
  LucideX, 
  LucidePower 
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
  const [view, setView] = useState<"STANDARD" | "AURA">("STANDARD");
  
  // Smart Home States from the Claude version
  const [devices, setDevices] = useState({
    lights: true, fan: true, door: false, ac: false,
  });

  const recognitionRef = useRef<any>(null);
  const historyRef = useRef<any[]>([]);
  const stateRef = useRef<JarvisState>("IDLE");
  const micOnRef = useRef(false);

  // Plasma Orb Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const tickRef = useRef(0);
  const stateColorRef = useRef<JarvisState>("IDLE");

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { stateRef.current = state; stateColorRef.current = state; }, [state]);
  useEffect(() => { micOnRef.current = micOn; }, [micOn]);

  // YOUR ORIGINAL Storage Key
  useEffect(() => {
    if (user?.id) {
      const saved = localStorage.getItem(`jarvis_mem_${user.id}`);
      if (saved) setMemory(JSON.parse(saved));
    }
  }, [user?.id]);

  // PLASMA ORB ANIMATION ENGINE
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const isAura = view === "AURA";
    const W = isAura ? 500 : 200, H = isAura ? 500 : 200;
    const CX = W/2, CY = H/2, ROWS = 20, COLS = 30, R = isAura ? 180 : 75;

    const ORB_COLORS: Record<JarvisState, number[][]> = {
      IDLE:      [[30,58,95],[14,116,144],[6,182,212]],
      LISTENING: [[6,182,212],[168,85,247],[249,115,22]],
      THINKING:  [[168,85,247],[109,40,217],[239,68,68]],
      SPEAKING:  [[56,189,248],[255,255,255],[6,182,212]],
    };

    function draw() {
      ctx.clearRect(0, 0, W, H);
      const st = stateColorRef.current;
      tickRef.current += (st === "THINKING" ? 0.025 : 0.01);
      const tick = tickRef.current;
      
      for (let ri = 0; ri < ROWS; ri++) {
        const phi = Math.PI * ri / (ROWS - 1);
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);
        for (let ci = 0; ci < COLS; ci++) {
          const theta = 2 * Math.PI * ci / COLS + tick;
          const distort = 1 + Math.sin(phi*3 + tick) * 0.1;
          const x = CX + R * sinPhi * distort * Math.cos(theta);
          const y = CY + R * cosPhi * distort;
          const depth = (Math.cos(theta) * sinPhi + 1) * 0.5;
          const c = ORB_COLORS[st][0];
          ctx.beginPath();
          ctx.arc(x, y, 1 + depth * 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${0.2 + depth * 0.6})`;
          ctx.fill();
        }
      }
      animRef.current = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [view, mounted]);

  // YOUR ORIGINAL Voice Settings (0.75 pitch, 0.80 rate)
  const speak = useCallback((text: string) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.pitch = 0.75; 
    u.rate = 0.80; 
    u.volume = 1.0; 

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

  // YOUR ORIGINAL Ask Logic
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

  const toggleDevice = (key: keyof typeof devices) => setDevices(prev => ({ ...prev, [key]: !prev[key] }));

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-[#020617] text-slate-300 font-mono selection:bg-cyan-500/30 overflow-hidden relative">
      
      {/* AURA VIEW (FULL ORB) */}
      <div className={`fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center transition-all duration-1000 ${view === "AURA" ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none scale-110"}`}>
        <button onClick={() => setView("STANDARD")} className="absolute top-10 right-10 p-4 border border-white/10 rounded-full hover:bg-white/5 transition-all">
          <LucideX size={24} />
        </button>
        <canvas ref={view === "AURA" ? canvasRef : null} width={500} height={500} className="drop-shadow-[0_0_80px_rgba(34,211,238,0.2)]" />
        <div className="mt-12 text-center max-w-2xl px-6">
          <p className="text-cyan-400 text-[10px] tracking-[1.5em] uppercase mb-8 animate-pulse">Neural Matrix Active</p>
          <p className="text-lg text-slate-400 italic">"{response || "Standing by for command..."}"</p>
        </div>
      </div>

      {/* HEADER */}
      <nav className="h-16 border-b border-white/5 bg-[#020617]/80 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <LucideCpu size={20} className="text-cyan-400" />
          <span className="font-black tracking-tighter text-xl italic uppercase">Jarvis<span className="text-cyan-400 font-light">OS</span></span>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-[10px] flex gap-4 text-slate-500 uppercase tracking-widest">
            <span>Core: Online</span>
            <span>Uptime: 99.9%</span>
          </div>
          <SignedIn><UserButton /></SignedIn>
        </div>
      </nav>

      {!isActive ? (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)]">
          <button onClick={() => { setIsActive(true); speak("System initialized. Welcome back."); }} className="group relative px-12 py-4 overflow-hidden rounded-full border border-cyan-500/50 text-cyan-400 transition-all hover:shadow-[0_0_30px_rgba(34,211,238,0.3)]">
            <span className="relative z-10 font-bold tracking-[0.3em] text-sm">INITIALIZE SYSTEM</span>
            <div className="absolute inset-0 bg-cyan-500/10 translate-y-full group-hover:translate-y-0 transition-transform" />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-12 h-[calc(100vh-4rem)]">
          
          {/* LEFT SIDEBAR: SMART HOME */}
          <aside className="col-span-3 border-r border-white/5 p-8 bg-[#020617]/50">
            <p className="text-[9px] text-slate-600 uppercase tracking-[0.3em] mb-8">Home Interface</p>
            <div className="space-y-4">
              {Object.entries(devices).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400">{key}</span>
                  <button 
                    onClick={() => toggleDevice(key as any)}
                    className={`w-10 h-5 rounded-full transition-all relative ${val ? 'bg-cyan-500' : 'bg-slate-800'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${val ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-12 space-y-2">
               <div onClick={() => setView("STANDARD")} className="flex items-center gap-3 p-3 rounded-lg bg-cyan-500/10 text-cyan-400 text-[10px] cursor-pointer uppercase tracking-widest border border-cyan-400/20">
                 <LucideMic size={14} /> Voice Core
               </div>
               <div onClick={() => setView("AURA")} className="flex items-center gap-3 p-3 text-slate-500 hover:text-slate-300 text-[10px] cursor-pointer uppercase tracking-widest transition-all">
                 <LucideTerminal size={14} /> Aura View
               </div>
            </div>
          </aside>

          {/* CENTER: ORB & TRANSCRIPT */}
          <main className="col-span-6 flex flex-col items-center justify-center p-12 relative">
            <div className="relative mb-12">
               {/* Decorative Ring */}
               <div className="absolute inset-[-40px] rounded-full border border-cyan-500/5 animate-[spin_20s_linear_infinite]" />
               <canvas ref={view === "STANDARD" ? canvasRef : null} width={200} height={200} />
            </div>

            <div className="w-full max-w-md text-center space-y-6">
              <div className="min-h-[60px] flex items-center justify-center">
                <p className="text-sm text-slate-400 font-light italic leading-relaxed">
                  {response || (micOn ? "Listening..." : "Awaiting command...")}
                </p>
              </div>
              
              <button 
                onClick={toggleMic} 
                className={`group relative w-20 h-20 rounded-full flex items-center justify-center transition-all ${micOn ? 'bg-cyan-500 shadow-[0_0_40px_rgba(34,211,238,0.4)]' : 'bg-white/5 border border-white/10'}`}
              >
                <LucideMic size={28} className={micOn ? 'text-slate-900' : 'text-slate-500'} />
                {micOn && <div className="absolute inset-[-8px] rounded-full border border-cyan-500/30 animate-ping" />}
              </button>
            </div>
          </main>

          {/* RIGHT SIDEBAR: LOGS */}
          <aside className="col-span-3 border-l border-white/5 p-8 bg-[#020617]/50">
            <p className="text-[9px] text-slate-600 uppercase tracking-[0.3em] mb-8">Neural Stream</p>
            <div className="space-y-6">
              {log.map((l, i) => (
                <div key={i} className="text-[10px] border-l-2 border-cyan-500/20 pl-4 py-1">
                  <p className={`${l.startsWith('USER') ? 'text-slate-500' : 'text-cyan-400'} italic leading-relaxed`}>
                    {l}
                  </p>
                </div>
              ))}
              {log.length === 0 && <p className="text-[10px] text-slate-700 italic">No session data found...</p>}
            </div>
          </aside>
        </div>
      )}

      {/* Global CSS for the custom spin animation */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </main>
  );
}
