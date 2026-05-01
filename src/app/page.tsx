"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { SignInButton, UserButton, SignedOut, SignedIn, useUser } from "@clerk/nextjs";

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
  const [devices, setDevices] = useState({ Lights: true, Fan: true, Door: false, AC: false, Speaker: true });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recognitionRef = useRef<any>(null);
  const historyRef = useRef<any[]>([]);
  const stateRef = useRef<JarvisState>("IDLE");
  const micOnRef = useRef(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { micOnRef.current = micOn; }, [micOn]);

  // STICKING TO YOUR BRAIN: Original Memory Keys
  useEffect(() => {
    if (user?.id) {
      const saved = localStorage.getItem(`jarvis_mem_${user.id}`);
      if (saved) setMemory(JSON.parse(saved));
    }
  }, [user?.id]);

  // --- THE "SUPER ORB" PARTICLE GRID (MATCHING IMAGE 2) ---
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    const particles: { theta: number; phi: number; colorType: number }[] = [];
    for (let i = 0; i < 800; i++) {
      particles.push({
        theta: Math.random() * Math.PI * 2,
        phi: Math.acos((Math.random() * 2) - 1),
        colorType: Math.random()
      });
    }

    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame += (stateRef.current === "THINKING" ? 0.07 : 0.012);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const baseRadius = stateRef.current === "LISTENING" ? 145 : 130;

      particles.forEach((p, i) => {
        const time = frame + i * 0.005;
        // Wavy grid distortion from your image
        const wobble = 1 + Math.sin(time * 2.5 + p.phi * 4) * 0.15;
        const r = baseRadius * wobble;

        const x = centerX + r * Math.sin(p.phi) * Math.cos(p.theta + frame);
        const y = centerY + r * Math.cos(p.phi);
        const depth = (Math.sin(p.theta + frame) + 1) / 2;

        let rgb = "249, 115, 22"; // Orange
        if (p.colorType > 0.4) rgb = "168, 85, 247"; // Purple
        if (p.colorType > 0.8) rgb = "34, 211, 238"; // Cyan

        ctx.beginPath();
        ctx.arc(x, y, 1.2 + depth * 1.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb}, ${0.15 + depth * 0.8})`;
        if (i % 25 === 0) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = `rgb(${rgb})`;
        } else { ctx.shadowBlur = 0; }
        ctx.fill();
      });
      requestAnimationFrame(animate);
    }
    const animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [mounted]);

  // STICKING TO YOUR BRAIN: Original Voice Pitch & Rate
  const speak = useCallback((text: string) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.pitch = 0.75; u.rate = 0.80;
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

  const toggleMic = () => {
    if (micOnRef.current) {
      setMicOn(false); setState("IDLE");
      window.speechSynthesis.cancel();
      try { recognitionRef.current?.stop(); } catch {}
    } else {
      const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      if (!recognitionRef.current) {
        recognitionRef.current = new SR();
        recognitionRef.current.continuous = true;
        recognitionRef.current.onresult = (e: any) => {
          const res = e.results[e.results.length - 1];
          if (res.isFinal) askJarvis(res[0].transcript);
        };
      }
      setMicOn(true); setState("LISTENING");
      try { recognitionRef.current?.start(); } catch {}
    }
  };

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-[#010409] text-[#7d8590] font-sans flex flex-col overflow-hidden">
      
      {/* HEADER NAV (AS SEEN IN IMAGE 1) */}
      <nav className="h-14 px-8 flex items-center justify-between bg-[#010409]">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border border-cyan-500/50 flex items-center justify-center">
            <div className="w-1 h-1 bg-cyan-400 rounded-full shadow-[0_0_5px_cyan]" />
          </div>
          <span className="text-[10px] font-bold tracking-[0.3em] text-white uppercase italic">Jarvis<span className="text-cyan-500 font-light">OS</span></span>
        </div>
        
        <div className="flex gap-10 text-[9px] tracking-[0.4em] uppercase font-black">
          <span className="text-cyan-400 border-b border-cyan-400 pb-1 cursor-pointer">Core</span>
          <span className="hover:text-white cursor-pointer transition-colors">Home</span>
          <span className="hover:text-white cursor-pointer transition-colors">Memory</span>
          <span className="hover:text-white cursor-pointer transition-colors">Logs</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/5 border border-cyan-500/10">
            <div className="w-1 h-1 bg-cyan-400 rounded-full animate-pulse" />
            <span className="text-[8px] text-cyan-400 font-bold uppercase tracking-tighter">Neural Active</span>
          </div>
          <SignedIn><UserButton /></SignedIn>
        </div>
      </nav>

      {/* DASHBOARD LAYOUT (EXACT REPLICA OF IMAGE 1) */}
      {!isActive ? (
        <div className="flex-1 flex items-center justify-center bg-[radial-gradient(circle_at_center,_#0a1120_0%,_#010409_100%)]">
          <button onClick={() => { setIsActive(true); speak("System initialized."); }} className="px-10 py-3 border border-cyan-500/30 text-cyan-400 text-[10px] tracking-[0.5em] uppercase hover:bg-cyan-500/5 transition-all">Initialize</button>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-[280px_1fr_280px] bg-[#010409]">
          
          {/* LEFT SIDEBAR */}
          <aside className="p-6 border-r border-white/[0.02] flex flex-col gap-10">
            <section>
              <p className="text-[8px] text-slate-600 uppercase tracking-[0.4em] mb-4">Navigation</p>
              <div className="space-y-2">
                {['Voice Core', 'Dashboard', 'Memory', 'Settings'].map((item, i) => (
                  <div key={item} className={`flex items-center gap-3 p-3 rounded-md text-[9px] tracking-widest cursor-pointer transition-all ${i===0 ? 'bg-[#0d1117] border border-cyan-500/20 text-cyan-400 shadow-lg' : 'hover:bg-white/[0.02] text-slate-500'}`}>
                    <div className={`w-1 h-1 rounded-full ${i===0 ? 'bg-cyan-400' : 'bg-slate-800'}`} />
                    {item.toUpperCase()}
                  </div>
                ))}
              </div>
            </section>

            <section>
              <p className="text-[8px] text-slate-600 uppercase tracking-[0.4em] mb-4">Smart Home</p>
              <div className="space-y-2">
                {Object.entries(devices).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between p-3 rounded-md bg-[#0d1117] border border-white/[0.03]">
                    <span className="text-[9px] uppercase tracking-widest text-slate-400">{key}</span>
                    <div className={`w-8 h-4 rounded-full relative cursor-pointer transition-all ${val ? 'bg-cyan-600' : 'bg-slate-800'}`} onClick={() => setDevices(d => ({...d, [key]: !val}))}>
                      <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${val ? 'left-4.5' : 'left-0.5'}`} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </aside>

          {/* MAIN CENTER (ORB DISPLAY) */}
          <main className="relative flex flex-col items-center justify-center bg-[radial-gradient(circle_at_center,_#0d1425_0%,_#010409_70%)]">
            <div className="absolute top-10 flex flex-col items-center gap-1">
               <div className="px-4 py-1 rounded-full border border-cyan-500/20 bg-cyan-950/20 text-cyan-400 text-[9px] tracking-[0.3em] uppercase font-bold">
                 {state} <span className="opacity-30 ml-2">282MS</span>
               </div>
            </div>

            {/* The Visual Guide Rings */}
            <div className="relative w-[450px] h-[450px] flex items-center justify-center">
              <div className="absolute inset-0 border border-white/[0.03] rounded-full" />
              <div className="absolute inset-10 border border-white/[0.01] rounded-full" />
              <canvas ref={canvasRef} width={500} height={500} className="relative z-10" />
            </div>

            {/* Waveform Bar */}
            <div className="mt-8 flex gap-1 h-8 items-center">
              {[...Array(11)].map((_, i) => (
                <div key={i} className={`w-0.5 bg-cyan-500/50 rounded-full transition-all duration-150 ${state==='LISTENING'?'animate-pulse':'h-1'}`} style={{height: state==='LISTENING' ? `${5 + Math.random()*20}px` : '4px'}} />
              ))}
            </div>

            {/* Floating Prompt Box (From Image 1) */}
            <div className="mt-8 w-full max-w-lg px-6">
              <div className="p-5 rounded-xl bg-[#0d1117] border border-white/[0.03] text-center shadow-2xl">
                <p className="text-[11px] text-slate-300 font-light italic leading-relaxed tracking-wide">
                  {response || "Hello, welcome here"}
                </p>
              </div>
            </div>

            {/* Control Pod */}
            <div className="mt-10 flex gap-12">
              <button onClick={toggleMic} className={`w-14 h-14 rounded-full border flex items-center justify-center transition-all ${micOn ? 'border-cyan-400 bg-cyan-500/10 shadow-[0_0_20px_rgba(6,182,212,0.2)]' : 'border-white/10 bg-white/5 hover:border-white/20'}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={micOn ? '#22d3ee' : '#475569'} strokeWidth="1.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 19v4M8 23h8"/></svg>
              </button>
              <button onClick={() => setIsActive(false)} className="w-14 h-14 rounded-full border border-red-500/20 bg-red-500/5 flex items-center justify-center hover:bg-red-500/10 transition-all">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5"><path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10"/></svg>
              </button>
            </div>
          </main>

          {/* RIGHT SIDEBAR */}
          <aside className="p-6 border-l border-white/[0.02] flex flex-col gap-10">
            <section>
              <p className="text-[8px] text-slate-600 uppercase tracking-[0.4em] mb-4">System</p>
              <div className="grid grid-cols-2 gap-2">
                {[{v:'24°', l:'TEMP'}, {v:'5', l:'ACTIVE'}, {v:'98%', l:'UPTIME'}, {v:'70B', l:'MODEL'}].map(s => (
                  <div key={s.l} className="p-3 bg-[#0d1117] border border-white/[0.03] rounded-md">
                    <p className="text-cyan-400 font-bold text-[10px]">{s.v}</p>
                    <p className="text-[7px] text-slate-600 mt-1 tracking-widest uppercase">{s.l}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <p className="text-[8px] text-slate-600 uppercase tracking-[0.4em] mb-4">Memory</p>
              <div className="flex flex-wrap gap-1.5">
                {['Keyur', 'likes coding', 'prefers cold', 'night owl'].map(tag => (
                  <span key={tag} className="px-2 py-1 bg-cyan-500/5 border border-cyan-500/10 rounded text-[8px] text-cyan-400/70 tracking-tighter">• {tag}</span>
                ))}
              </div>
            </section>

            <section className="flex-1">
              <p className="text-[8px] text-slate-600 uppercase tracking-[0.4em] mb-4">Log</p>
              <div className="space-y-4">
                {log.map((l, i) => (
                  <div key={i} className="text-[9px] border-l border-cyan-500/30 pl-3">
                    <p className="text-slate-500">10:44:12</p>
                    <p className="text-slate-400 italic leading-relaxed">{l}</p>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </main>
  );
}
