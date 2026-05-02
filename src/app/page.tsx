"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { UserButton, SignedIn, SignedOut, SignInButton, useUser } from "@clerk/nextjs";

// --- SYSTEM TYPES ---
type JarvisState = "IDLE" | "LISTENING" | "THINKING" | "SPEAKING";
type ActiveTab = "VOICE" | "DASHBOARD" | "MEMORY" | "SETTINGS" | "LOGS";

export default function JarvisOS() {
  const { user, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState<ActiveTab>("VOICE");
  const [isActive, setIsActive] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [state, setState] = useState<JarvisState>("IDLE");
  const [response, setResponse] = useState("System Core Online. Awaiting User Authorization.");
  const [log, setLog] = useState<{time: string, msg: string, type: string}[]>([]);
  const [mounted, setMounted] = useState(false);
  
  // --- SYSTEM COHERENCE DATA ---
  const [telemetry, setTelemetry] = useState({
    latency: "0ms",
    intent: "None",
    confidence: "0%",
    temp: "32°C",
    uptime: "00:00:00"
  });

  const [devices, setDevices] = useState<Record<string, boolean>>({
    "Main Hall": true,
    "Lab Ventilation": true,
    "Security Uplink": false,
    "Primary Matrix": true,
    "Audio Dampers": false,
    "Thermal Control": true
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recognitionRef = useRef<any>(null);
  const stateRef = useRef<JarvisState>("IDLE");
  const micOnRef = useRef(false);

  // --- BRAIN: CONVERSATION HISTORY (UNTOUCHED) ---
  const historyRef = useRef<{role: string, content: string}[]>([]);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { micOnRef.current = micOn; }, [micOn]);

  // --- LOGGING ENGINE ---
  const addLog = (msg: string, type: string = "INFO") => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString();
    setLog(prev => [{time: timeStr, msg, type}, ...prev].slice(0, 25));
  };

  // --- BRAIN: HARDWARE COMMANDER (UNTOUCHED) ---
  const processHardwareRequest = (text: string) => {
    const lower = text.toLowerCase();
    const updated = { ...devices };
    let found = false;

    if (lower.includes("light") || lower.includes("hall")) {
      updated["Main Hall"] = lower.includes("on");
      found = true;
    }
    if (lower.includes("vent") || lower.includes("fan")) {
      updated["Lab Ventilation"] = lower.includes("on");
      found = true;
    }
    if (lower.includes("security") || lower.includes("lock")) {
      updated["Security Uplink"] = lower.includes("on") || lower.includes("lock");
      found = true;
    }

    if (found) {
      setDevices(updated);
      addLog("Hardware states synchronized with AI intent.", "SUCCESS");
      setTelemetry(prev => ({ ...prev, intent: "Hardware Control", confidence: "98%" }));
    } else {
      setTelemetry(prev => ({ ...prev, intent: "General Logic", confidence: "92%" }));
    }
  };

  // --- THE ORB: FINAL-FORM VISUALS ---
  useEffect(() => {
    if (!canvasRef.current || !isActive || activeTab !== "VOICE") return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    const particles = Array.from({ length: 1500 }, () => ({
      theta: Math.random() * Math.PI * 2,
      phi: Math.acos((Math.random() * 2) - 1),
      color: Math.random() > 0.5 ? "cyan" : "purple"
    }));

    function render() {
      if (!ctx || !canvas || activeTab !== "VOICE") return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Dynamic Physics
      let rotSpeed = 0.015;
      let turbulence = 0.1;
      let scale = 1;

      if (stateRef.current === "THINKING") { rotSpeed = 0.12; turbulence = 0.6; }
      if (stateRef.current === "SPEAKING") { 
        rotSpeed = 0.04; 
        turbulence = 0.25;
        scale = 1 + Math.sin(Date.now() * 0.01) * 0.08; // Audio Reactivity
      }
      if (stateRef.current === "LISTENING") { rotSpeed = 0.02; turbulence = 0.4; scale = 1.1; }
      
      frame += rotSpeed;
      const midX = canvas.width / 2;
      const midY = canvas.height / 2;
      const radius = 135 * scale;

      particles.forEach((p, i) => {
        const t = frame + i * 0.002;
        const noise = 1 + Math.sin(t * 3 + p.phi * 5) * turbulence;
        const r = radius * noise;

        const x = midX + r * Math.sin(p.phi) * Math.cos(p.theta + frame);
        const y = midY + r * Math.cos(p.phi);
        const z = (Math.sin(p.theta + frame) + 1) / 2;

        ctx.beginPath();
        ctx.arc(x, y, 0.5 + z * 3, 0, Math.PI * 2);
        ctx.fillStyle = p.color === "cyan" 
          ? `rgba(34, 211, 238, ${0.1 + z * 0.8})` 
          : `rgba(168, 85, 247, ${0.1 + z * 0.8})`;
        
        if (i % 40 === 0) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = p.color === "cyan" ? "#22d3ee" : "#a855f7";
        } else { ctx.shadowBlur = 0; }
        
        ctx.fill();
      });
      requestAnimationFrame(render);
    }
    const anim = requestAnimationFrame(render);
    return () => cancelAnimationFrame(anim);
  }, [activeTab, isActive]);

  // --- BRAIN: SPEECH & AI (UNTOUCHED) ---
  const speak = useCallback((text: string) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.pitch = 0.85; u.rate = 0.9;
    u.onstart = () => setState("SPEAKING");
    u.onend = () => {
      if (micOnRef.current) { setState("LISTENING"); try { recognitionRef.current?.start(); } catch {} }
      else setState("IDLE");
    };
    window.speechSynthesis.speak(u);
  }, []);

  const askJarvis = useCallback(async (input: string) => {
    if (!input.trim()) return;
    const start = Date.now();
    setState("THINKING");
    addLog(`Uplinking Request: ${input}`, "TRACE");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, history: historyRef.current, userName: user?.firstName || "Sir" }),
      });
      const data = await res.json();
      const delay = Date.now() - start;

      if (res.ok) {
        setResponse(data.reply);
        setTelemetry(prev => ({ ...prev, latency: `${delay}ms` }));
        addLog(`Intelligence response received in ${delay}ms`, "SUCCESS");
        processHardwareRequest(data.reply);
        historyRef.current = [...historyRef.current, { role: "user", content: input }, { role: "assistant", content: data.reply }].slice(-10);
        speak(data.reply);
      }
    } catch (e) {
      setState("IDLE");
      addLog("Neural link severed.", "ERROR");
    }
  }, [user, speak, devices]);

  const toggleMic = () => {
    if (micOnRef.current) {
      setMicOn(false); setState("IDLE");
      try { recognitionRef.current?.stop(); } catch {}
    } else {
      const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      if (!recognitionRef.current && SR) {
        recognitionRef.current = new SR();
        recognitionRef.current.continuous = true;
        recognitionRef.current.onresult = (e: any) => {
          const res = e.results[e.results.length - 1][0].transcript;
          recognitionRef.current?.stop();
          askJarvis(res);
        };
      }
      setMicOn(true); setState("LISTENING");
      try { recognitionRef.current?.start(); } catch {}
    }
  };

  if (!mounted || !isLoaded) return null;

  return (
    <main className="fixed inset-0 bg-[#010409] text-[#7d8590] flex flex-col font-sans overflow-hidden">
      
      {/* --- TOP HUD BAR --- */}
      <nav className="h-16 px-8 flex items-center justify-between border-b border-white/[0.03] bg-[#010409]/90 backdrop-blur-xl z-50">
        <div className="flex items-center gap-4">
          <div className="w-6 h-6 border border-cyan-500/40 rounded flex items-center justify-center relative">
            <div className={`w-2 h-2 rounded-full ${state === 'THINKING' ? 'bg-orange-500 animate-ping' : 'bg-cyan-400 shadow-[0_0_10px_cyan]'}`} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black tracking-[0.4em] text-white uppercase italic">Jarvis<span className="text-cyan-500 font-light">OS</span></span>
            <span className="text-[7px] text-cyan-500/60 uppercase tracking-[0.2em]">Neural-Interface v3.3</span>
          </div>
        </div>

        <div className="hidden lg:flex gap-12 text-[9px] tracking-[0.5em] uppercase font-bold">
          {['Core', 'Dashboard', 'Memory', 'Logs'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab === 'Core' ? 'VOICE' : tab.toUpperCase() as ActiveTab)}
              className={`${(activeTab === tab.toUpperCase() || (tab==='Core' && activeTab==='VOICE')) ? 'text-cyan-400 border-b-2 border-cyan-400 shadow-[0_10px_10px_-10px_cyan]' : 'text-slate-500 hover:text-white'} pb-1 transition-all`}>
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-8">
          <div className="text-right hidden sm:block">
            <p className="text-[7px] text-slate-500 uppercase tracking-widest">Uptime</p>
            <p className="text-[10px] text-cyan-400 font-mono">02:14:55:08</p>
          </div>
          <SignedIn><UserButton afterSignOutUrl="/" /></SignedIn>
        </div>
      </nav>

      {!isActive ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_center,_#0a1120_0%,_#010409_100%)]">
            <div className="mb-8 w-32 h-32 border border-cyan-500/10 rounded-full flex items-center justify-center animate-pulse">
                <div className="w-16 h-16 border border-cyan-500/20 rounded-full" />
            </div>
          <button onClick={() => { setIsActive(true); speak("System initialized."); addLog("Neural interface stabilized.", "SUCCESS"); }} 
            className="group relative px-16 py-5 border border-cyan-500/30 text-cyan-400 text-[11px] tracking-[0.8em] uppercase hover:bg-cyan-500/5 transition-all overflow-hidden">
            <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent" />
            Initiate Boot
          </button>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-[340px_1fr_340px] relative overflow-hidden bg-[#010409]">
          
          {/* --- LEFT PANEL: SYSTEM FLOW --- */}
          <aside className="p-8 border-r border-white/[0.02] flex flex-col gap-10 bg-[#010409]/60 backdrop-blur-md z-20">
            <section>
              <p className="text-[8px] text-slate-600 uppercase tracking-[0.5em] mb-6">Neural Pipeline</p>
              <div className="space-y-4">
                {[
                  { n: "01", t: "Audio Capture", s: state === 'LISTENING' },
                  { n: "02", t: "Semantic Analysis", s: state === 'THINKING' },
                  { n: "03", t: "Intent Routing", s: state === 'THINKING' },
                  { n: "04", t: "Speech Synthesis", s: state === 'SPEAKING' }
                ].map(p => (
                  <div key={p.n} className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-500 ${p.s ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.1)]' : 'bg-white/[0.01] border-white/5 opacity-30'}`}>
                    <span className="text-[10px] font-mono opacity-50">{p.n}</span>
                    <span className="text-[9px] uppercase tracking-[0.2em] font-bold">{p.t}</span>
                    {p.s && <div className="ml-auto w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />}
                  </div>
                ))}
              </div>
            </section>

            <section>
              <p className="text-[8px] text-slate-600 uppercase tracking-[0.5em] mb-6">Environmental Matrix</p>
              <div className="grid grid-cols-1 gap-2">
                {Object.entries(devices).map(([name, active]) => (
                  <div key={name} className="flex items-center justify-between p-4 rounded-xl bg-[#0d1117] border border-white/[0.02] hover:border-cyan-500/20 transition-all group">
                    <div className="flex flex-col">
                        <span className="text-[9px] uppercase tracking-widest text-slate-400 group-hover:text-cyan-400 transition-colors">{name}</span>
                        <span className="text-[7px] text-slate-600 uppercase mt-1">{active ? 'Status: Active' : 'Status: Standby'}</span>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${active ? 'bg-cyan-400 shadow-[0_0_8px_cyan]' : 'bg-slate-800'}`} />
                  </div>
                ))}
              </div>
            </section>
          </aside>

          {/* --- CENTER VIEWPORT: THE ORB --- */}
          <main className="relative flex flex-col items-center justify-center bg-[radial-gradient(circle_at_center,_#0d1425_0%,_#010409_85%)]">
            
            {activeTab === "VOICE" && (
                <div className="relative z-10 flex flex-col items-center justify-center w-full h-full">
                    <div className="absolute top-12 flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-1000">
                        <span className="text-[8px] text-slate-500 uppercase tracking-[0.6em] mb-2">Cognitive Intent</span>
                        <div className="px-6 py-2 rounded-full border border-cyan-500/20 bg-cyan-950/30 text-cyan-400 text-[11px] tracking-[0.4em] uppercase font-black shadow-2xl">
                            {telemetry.intent}
                        </div>
                    </div>

                    {/* THE MAIN ORB */}
                    <div className="w-[600px] h-[600px] flex items-center justify-center relative">
                        <div className="absolute inset-0 border border-cyan-500/5 rounded-full scale-110 animate-pulse" />
                        <div className="absolute inset-0 border border-purple-500/5 rounded-full scale-125" />
                        <canvas ref={canvasRef} width={700} height={700} className="relative z-10 w-full h-full drop-shadow-[0_0_30px_rgba(6,182,212,0.2)]" />
                    </div>

                    {/* DYNAMIC RESPONSE BOX */}
                    <div className="absolute bottom-40 w-full max-w-2xl px-10">
                        <div className="p-10 rounded-[30px] bg-[#0d1117]/80 border border-white/5 backdrop-blur-3xl shadow-[0_30px_100px_rgba(0,0,0,0.8)] text-center group">
                            <p className="text-[14px] text-slate-100 font-light italic leading-relaxed tracking-wide transition-all group-hover:text-white">
                                "{response}"
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* SHARED SYSTEM CONTROLS */}
            <div className="absolute bottom-12 flex gap-16 z-30">
              <button onClick={toggleMic} className={`w-20 h-20 rounded-full border-2 flex items-center justify-center transition-all duration-700 ${micOn ? 'border-cyan-400 bg-cyan-500/10 shadow-[0_0_50px_rgba(6,182,212,0.5)] scale-110' : 'border-white/10 bg-white/5 hover:border-cyan-500/40 hover:scale-105'}`}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={micOn ? '#22d3ee' : '#475569'} strokeWidth="1.5">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 19v4M8 23h8"/>
                </svg>
              </button>
              <button onClick={() => setIsActive(false)} className="w-20 h-20 rounded-full border border-red-500/20 bg-red-500/5 flex items-center justify-center hover:bg-red-500/30 hover:scale-105 transition-all">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5"><path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10"/></svg>
              </button>
            </div>
          </main>

          {/* --- RIGHT PANEL: TELEMETRY & DATA --- */}
          <aside className="p-8 border-l border-white/[0.02] flex flex-col gap-10 bg-[#010409]">
            <section>
              <p className="text-[8px] text-slate-600 uppercase tracking-[0.5em] mb-6">System Telemetry</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { v: telemetry.latency, l: "Latency", c: "text-cyan-400" },
                  { v: telemetry.confidence, l: "Confidence", c: "text-purple-400" },
                  { v: telemetry.temp, l: "Thermal", c: "text-orange-400" },
                  { v: "70B", l: "Parameters", c: "text-emerald-400" }
                ].map(s => (
                  <div key={s.l} className="p-5 bg-[#0d1117] border border-white/[0.03] rounded-2xl text-center group hover:border-white/10 transition-all">
                    <p className={`${s.c} font-black text-[12px] group-hover:scale-110 transition-transform`}>{s.v}</p>
                    <p className="text-[7px] text-slate-600 mt-2 tracking-widest uppercase">{s.l}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="flex-1 flex flex-col min-h-0">
              <p className="text-[8px] text-slate-600 uppercase tracking-[0.5em] mb-6">Neural Stream</p>
              <div className="flex-1 overflow-y-auto space-y-4 pr-3 custom-scrollbar">
                {log.map((l, i) => (
                  <div key={i} className={`text-[10px] border-l-2 pl-4 py-3 animate-in slide-in-from-right duration-500 ${
                    l.type === 'SUCCESS' ? 'border-emerald-500' : 
                    l.type === 'ERROR' ? 'border-red-500' : 
                    l.type === 'TRACE' ? 'border-purple-500' : 'border-cyan-500/40'
                  }`}>
                    <p className="text-slate-500 text-[7px] mb-1 font-mono">{l.time} // {l.type}</p>
                    <p className="text-slate-200 italic leading-snug">{l.msg}</p>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 2px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
      `}</style>
    </main>
  );
}
