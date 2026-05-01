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
  LucideX 
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

  // --- PLASMA ORB REFS ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const tickRef = useRef(0);
  const stateColorRef = useRef<JarvisState>("IDLE");

  const recognitionRef = useRef<any>(null);
  const historyRef = useRef<any[]>([]);
  const stateRef = useRef<JarvisState>("IDLE");
  const micOnRef = useRef(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { stateRef.current = state; stateColorRef.current = state; }, [state]);
  useEffect(() => { micOnRef.current = micOn; }, [micOn]);

  useEffect(() => {
    if (user?.id) {
      const saved = localStorage.getItem(`jarvis_mem_${user.id}`);
      if (saved) setMemory(JSON.parse(saved));
    }
  }, [user?.id]);

  // --- PLASMA ORB EFFECT ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Scale size based on view
    const isAura = view === "AURA";
    const W = isAura ? 500 : 240, H = isAura ? 500 : 240;
    const CX = W/2, CY = H/2, ROWS = 22, COLS = 34, R = isAura ? 180 : 90;

    const ORB_COLORS: Record<JarvisState, number[][]> = {
      IDLE:      [[30,58,95],[14,116,144],[6,182,212],[30,58,95]],
      LISTENING: [[6,182,212],[168,85,247],[249,115,22],[6,182,212]],
      THINKING:  [[168,85,247],[109,40,217],[239,68,68],[168,85,247]],
      SPEAKING:  [[56,189,248],[255,255,255],[6,182,212],[56,189,248]],
    };
    const ORB_SPEED: Record<JarvisState, number> = {
      IDLE: 0.004, LISTENING: 0.014, THINKING: 0.028, SPEAKING: 0.018,
    };

    function lerp(a: number[], b: number[], t: number) {
      return [Math.round(a[0]+(b[0]-a[0])*t), Math.round(a[1]+(b[1]-a[1])*t), Math.round(a[2]+(b[2]-a[2])*t)];
    }

    function getColor(t: number, st: JarvisState) {
      const p = ORB_COLORS[st];
      t = ((t % 1) + 1) % 1;
      const seg = t * (p.length - 1);
      const i = Math.floor(seg);
      return lerp(p[i], p[Math.min(i+1, p.length-1)], seg-i);
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      const st = stateColorRef.current;
      tickRef.current += ORB_SPEED[st];
      const tick = tickRef.current;
      for (let ri = 0; ri < ROWS; ri++) {
        const phi = Math.PI * ri / (ROWS - 1);
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);
        const rowR = R * sinPhi;
        for (let ci = 0; ci < COLS; ci++) {
          const theta = 2 * Math.PI * ci / COLS + tick * (ri % 2 === 0 ? 1 : -1) * 0.3;
          const distort = 1 + Math.sin(phi*3 + tick*1.8) * 0.12 + Math.cos(theta*2 + tick*1.2) * 0.1;
          const x = CX + rowR * distort * Math.cos(theta);
          const y = CY + R * cosPhi * distort + Math.sin(tick + ci * 0.2) * 2;
          const depth = (Math.cos(theta) * sinPhi + 1) * 0.5;
          const [r, g, b] = getColor(((phi/Math.PI)+(ci/COLS)+tick*0.1)%1, st);
          ctx.beginPath();
          ctx.arc(x, y, 0.8 + depth * 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${r},${g},${b},${0.15 + depth * 0.75})`;
          ctx.fill();
        }
      }
      animRef.current = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [view]);

  const speak = useCallback((text: string) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.pitch = 0.75; u.rate = 0.80; u.volume = 1.0; 
    const voices = window.speechSynthesis.getVoices();
    const bestVoice = voices.find(v => v.name.includes("Google UK English Male")) || voices.find(v => v.name.includes("David"));
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

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-[#020617] text-slate-300 font-sans overflow-hidden relative">
      
      {/* 1. DASHBOARD AURA MODE */}
      <div className={`fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center transition-all duration-1000 ${view === "AURA" ? "opacity-100 scale-100" : "opacity-0 scale-125 pointer-events-none"}`}>
        <button onClick={() => setView("STANDARD")} className="absolute top-10 right-10 p-4 rounded-full bg-white/5 border border-white/10 hover:border-cyan-500/50 transition-all">
          <LucideX className="text-slate-500" size={24} />
        </button>
        <canvas ref={view === "AURA" ? canvasRef : null} width={500} height={500} className="drop-shadow-[0_0_100px_rgba(34,211,238,0.3)]" />
        <div className="mt-12 text-center">
           <p className="text-cyan-400 text-[10px] tracking-[1.5em] uppercase animate-pulse">Neural Link Active</p>
           <p className="text-slate-400 italic text-sm mt-8 max-w-xl px-6">{response}</p>
        </div>
      </div>

      {/* 2. STANDARD OS INTERFACE */}
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

            <main className="col-span-6 flex flex-col items-center justify-center p-12">
              <canvas ref={view === "STANDARD" ? canvasRef : null} width={240} height={240} className="mb-8" />
              <div className="w-full max-w-lg p-6 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
                <p className="text-sm italic text-slate-300 font-light">{response || "Awaiting command..."}</p>
              </div>
              <div className="mt-12 flex gap-8">
                <button onClick={toggleMic} className={`w-14 h-14 rounded-full border flex items-center justify-center transition-all ${micOn ? 'bg-cyan-500 border-cyan-400' : 'bg-white/5 border-white/10'}`}>
                  <LucideMic size={20} className={micOn ? 'text-[#020617]' : 'text-slate-500'} />
                </button>
              </div>
            </main>

            <aside className="col-span-3 border-l border-white/5 p-8">
              <p className="text-[9px] text-slate-600 uppercase tracking-[0.3em] mb-6">System Log</p>
              <div className="space-y-4 font-mono text-[9px]">
                {log.map((l, i) => (
                  <div key={i} className="text-slate-400 border-l border-cyan-500/20 pl-3 py-1 italic uppercase">{l}</div>
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
