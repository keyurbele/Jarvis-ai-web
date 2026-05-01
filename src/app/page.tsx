"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { SignInButton, UserButton, SignedOut, SignedIn, useUser } from "@clerk/nextjs";

type JarvisState = "IDLE" | "LISTENING" | "THINKING" | "SPEAKING";

export default function JarvisOS() {
  const { user } = useUser();
  const [isActive, setIsActive] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [state, setState] = useState<JarvisState>("IDLE");
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [memory, setMemory] = useState<any>({}); // Kept your memory logic
  const [log, setLog] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const [devices, setDevices] = useState({ lights: true, fan: true, door: false, ac: false, speaker: true });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recognitionRef = useRef<any>(null);
  const historyRef = useRef<any[]>([]);
  const stateRef = useRef<JarvisState>("IDLE");
  const micOnRef = useRef(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { micOnRef.current = micOn; }, [micOn]);

  // YOUR ORIGINAL MEMORY LOGIC
  useEffect(() => {
    if (user?.id) {
      const saved = localStorage.getItem(`jarvis_mem_${user.id}`);
      if (saved) setMemory(JSON.parse(saved));
    }
  }, [user?.id]);

  // --- THE "SUPER ORB" (MATCHING YOUR 2ND & 3RD IMAGE) ---
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    const particles: { theta: number; phi: number; colorType: number }[] = [];
    const numParticles = 700; 

    for (let i = 0; i < numParticles; i++) {
      particles.push({
        theta: Math.random() * Math.PI * 2,
        phi: Math.acos((Math.random() * 2) - 1),
        colorType: Math.random()
      });
    }

    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame += (stateRef.current === "THINKING" ? 0.05 : 0.015);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const baseRadius = stateRef.current === "LISTENING" ? 115 : 100;

      particles.forEach((p, i) => {
        const time = frame + i * 0.005;
        // The organic "wobble" from your 3rd image
        const wobble = 1 + Math.sin(time * 2 + p.phi * 4) * 0.12;
        const r = baseRadius * wobble;

        const x = centerX + r * Math.sin(p.phi) * Math.cos(p.theta + frame);
        const y = centerY + r * Math.cos(p.phi);
        const depth = (Math.sin(p.theta + frame) + 1) / 2;

        // VIBRANT PALETTE: Orange, Purple, Cyan
        let rgb = "249, 115, 22"; // Orange
        if (p.colorType > 0.4) rgb = "168, 85, 247"; // Purple
        if (p.colorType > 0.8) rgb = "34, 211, 238"; // Cyan

        ctx.beginPath();
        ctx.arc(x, y, 1 + depth * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb}, ${0.2 + depth * 0.7})`;
        if (i % 15 === 0) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = `rgb(${rgb})`;
        } else {
            ctx.shadowBlur = 0;
        }
        ctx.fill();
      });

      requestAnimationFrame(animate);
    }
    const animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [mounted]); // Only run on mount, uses stateRef for reaction

  // --- YOUR ORIGINAL VOICE SETTINGS (STRICT) ---
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

  // --- YOUR ORIGINAL API LOGIC ---
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
    <main className="min-h-screen bg-[#020617] text-[#94a3b8] font-mono flex flex-col overflow-hidden">
      
      {/* NAVBAR (TOP BAR) */}
      <nav className="h-16 border-b border-white/5 px-8 flex items-center justify-between bg-[#020617]">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border border-cyan-500 rounded-sm flex items-center justify-center">
            <div className="w-1 h-1 bg-cyan-400 rounded-full animate-pulse" />
          </div>
          <span className="font-bold tracking-widest text-white text-xs uppercase">Jarvis<span className="text-cyan-500 font-light">OS</span></span>
        </div>
        <div className="flex gap-8 text-[10px] tracking-[0.25em] uppercase font-bold">
          <span className="text-cyan-400 border-b-2 border-cyan-400 pb-1 cursor-pointer">Core</span>
          <span className="text-slate-600 hover:text-cyan-400 cursor-pointer">Home</span>
          <span className="text-slate-600 hover:text-cyan-400 cursor-pointer">Memory</span>
          <span className="text-slate-600 hover:text-cyan-400 cursor-pointer">Logs</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/5 flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
            <span className="text-[9px] text-cyan-400 tracking-tighter uppercase font-bold">Neural Active</span>
          </div>
          <SignedIn><UserButton /></SignedIn>
        </div>
      </nav>

      {/* THREE-COLUMN LAYOUT */}
      {!isActive ? (
        <div className="flex-1 flex items-center justify-center">
          <button onClick={() => { setIsActive(true); speak("System initialized."); }} className="px-10 py-3 border border-cyan-500/50 text-cyan-400 text-xs tracking-[.4em] uppercase hover:bg-cyan-500/10 transition-all">Initialize System</button>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-[250px_1fr_250px]">
          
          {/* LEFT: NAVIGATION & HOME */}
          <aside className="border-r border-white/5 p-6 bg-[#020617]">
            <p className="text-[9px] text-slate-600 uppercase tracking-[0.3em] mb-6">Navigation</p>
            <div className="space-y-2 mb-12">
              {['Voice Core', 'Dashboard', 'Memory', 'Settings'].map((item, i) => (
                <div key={item} className={`flex items-center gap-3 p-3 rounded text-[10px] cursor-pointer ${i===0 ? 'bg-cyan-500/5 border border-cyan-500/20 text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}>
                  <div className={`w-1 h-1 rounded-full ${i===0 ? 'bg-cyan-400 shadow-[0_0_5px_cyan]' : 'bg-slate-800'}`} />
                  {item.toUpperCase()}
                </div>
              ))}
            </div>

            <p className="text-[9px] text-slate-600 uppercase tracking-[0.3em] mb-6">Smart Home</p>
            <div className="space-y-3">
              {Object.entries(devices).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between p-3 rounded bg-white/[0.02] border border-white/[0.03]">
                  <span className="text-[9px] uppercase text-slate-400 tracking-wider capitalize">{key}</span>
                  <div className={`w-7 h-3.5 rounded-full relative cursor-pointer transition-colors ${val ? 'bg-cyan-600' : 'bg-slate-800'}`} onClick={() => setDevices(d => ({...d, [key]: !val}))}>
                    <div className={`absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full transition-all ${val ? 'left-4' : 'left-0.5'}`} />
                  </div>
                </div>
              ))}
            </div>
          </aside>

          {/* CENTER: THE ORB */}
          <main className="flex flex-col items-center justify-center p-12 bg-[radial-gradient(circle_at_center,_#0a192f_0%,_#020617_80%)]">
            <div className="mb-4 px-4 py-1 rounded-full border border-cyan-500/20 text-cyan-400 text-[10px] tracking-widest uppercase">
              {state} <span className="opacity-30 ml-2">282ms</span>
            </div>

            <div className="relative flex items-center justify-center">
              <div className="absolute w-[350px] h-[350px] border border-cyan-500/5 rounded-full animate-[spin_30s_linear_infinite]" />
              <div className="absolute w-[300px] h-[300px] border border-cyan-500/10 rounded-full animate-[spin_20s_linear_infinite_reverse]" />
              <canvas ref={canvasRef} width={400} height={400} className="relative z-10" />
            </div>

            <div className="mt-12 w-full max-w-lg">
              <div className="flex justify-center gap-1 h-8 items-center mb-6">
                 {[...Array(9)].map((_, i) => (
                   <div key={i} className="w-1 bg-cyan-400/40 rounded-full" style={{ height: state === 'LISTENING' ? `${10 + Math.random() * 20}px` : '4px' }} />
                 ))}
              </div>
              <div className="p-5 rounded-xl bg-[#0a1120] border border-cyan-900/40 text-center">
                <p className="text-xs text-slate-400 italic leading-relaxed tracking-wide">
                  {response || "Standing by, Keyur."}
                </p>
              </div>
            </div>

            <div className="mt-10 flex gap-10">
              <button onClick={toggleMic} className={`w-14 h-14 rounded-full border flex items-center justify-center transition-all ${micOn ? 'border-cyan-400 bg-cyan-400/10 shadow-[0_0_15px_rgba(34,211,238,0.2)]' : 'border-white/10 bg-white/5'}`}>
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={micOn ? '#22d3ee' : '#475569'} strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 19v4M8 23h8"/></svg>
              </button>
              <button onClick={() => setIsActive(false)} className="w-14 h-14 rounded-full border border-red-500/30 bg-red-500/5 flex items-center justify-center">
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10"/></svg>
              </button>
            </div>
          </main>

          {/* RIGHT: SYSTEM & LOGS */}
          <aside className="border-l border-white/5 p-6 bg-[#020617]">
            <p className="text-[9px] text-slate-600 uppercase tracking-[0.3em] mb-6">System</p>
            <div className="grid grid-cols-2 gap-2 mb-10">
              {[{v:'24°', l:'TEMP'}, {v:'3', l:'ACTIVE'}, {v:'98%', l:'UPTIME'}, {v:'70B', l:'MODEL'}].map(s => (
                <div key={s.l} className="p-3 bg-white/[0.02] border border-white/[0.03] rounded">
                  <p className="text-cyan-400 font-bold text-xs">{s.v}</p>
                  <p className="text-[7px] text-slate-600 mt-1 tracking-widest uppercase">{s.l}</p>
                </div>
              ))}
            </div>

            <p className="text-[9px] text-slate-600 uppercase tracking-[0.3em] mb-4">Memory</p>
            <div className="flex flex-wrap gap-1.5 mb-10">
              {['Keyur', 'likes coding', 'prefers cold', 'night owl'].map(tag => (
                <span key={tag} className="px-2 py-1 bg-cyan-500/5 border border-cyan-500/10 rounded text-[8px] text-cyan-400/70">• {tag}</span>
              ))}
            </div>

            <p className="text-[9px] text-slate-600 uppercase tracking-[0.3em] mb-4">Log</p>
            <div className="space-y-4">
              {log.map((l, i) => (
                <div key={i} className="text-[9px] border-l border-cyan-500/30 pl-3">
                  <p className="text-slate-500">10:44:12</p>
                  <p className="text-slate-400 italic line-clamp-2">{l}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </main>
  );
}
