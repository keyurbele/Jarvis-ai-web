"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { UserButton, SignedIn, SignedOut, SignInButton, useUser } from "@clerk/nextjs";

// --- TYPES ---
type JarvisState = "IDLE" | "LISTENING" | "THINKING" | "SPEAKING";
type ActiveTab = "VOICE" | "DASHBOARD" | "MEMORY" | "SETTINGS";

export default function JarvisOS() {
  const { user, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState<ActiveTab>("VOICE");
  const [isActive, setIsActive] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [state, setState] = useState<JarvisState>("IDLE");
  const [response, setResponse] = useState("Neural link established. Awaiting input.");
  const [log, setLog] = useState<{time: string, msg: string, type: 'INFO' | 'SUCCESS' | 'ERROR' | 'TRACE'}[]>([]);
  const [mounted, setMounted] = useState(false);
  
  // SYSTEM TELEMETRY (The "Coherence" Layer)
  const [telemetry, setTelemetry] = useState({
    latency: "0ms",
    intent: "None",
    confidence: "0%",
    commands: 0
  });

  const [devices, setDevices] = useState<Record<string, boolean>>({
    "Living Rm": true, "Bedroom Fan": true, "Front Door": false, "AC Unit": false, "Kitchen": false
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recognitionRef = useRef<any>(null);
  const stateRef = useRef<JarvisState>("IDLE");
  const micOnRef = useRef(false);
  
  // --- THE BRAIN (STRICTLY UNTOUCHED LOGIC) ---
  const historyRef = useRef<{role: string, content: string}[]>([]);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { micOnRef.current = micOn; }, [micOn]);

  const addLog = (msg: string, type: 'INFO' | 'SUCCESS' | 'ERROR' | 'TRACE' = 'INFO') => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds()}`;
    setLog(prev => [{time: timeStr, msg, type}, ...prev].slice(0, 20));
  };

  // --- BRAIN: HARDWARE ROUTER (UNTOUCHED) ---
  const processDeviceCommand = (text: string) => {
    const lowerText = text.toLowerCase();
    const newDevices = { ...devices };
    let changed = false;
    let detectedIntent = "General Inquiry";

    if (lowerText.includes("light") || lowerText.includes("fan") || lowerText.includes("door")) {
        detectedIntent = "Hardware Control";
        if (lowerText.includes("on") || lowerText.includes("open")) {
            if (lowerText.includes("light")) newDevices["Living Rm"] = true;
            if (lowerText.includes("fan")) newDevices["Bedroom Fan"] = true;
            if (lowerText.includes("door")) newDevices["Front Door"] = true;
            changed = true;
        }
        if (lowerText.includes("off") || lowerText.includes("close")) {
            if (lowerText.includes("light")) newDevices["Living Rm"] = false;
            if (lowerText.includes("fan")) newDevices["Bedroom Fan"] = false;
            if (lowerText.includes("door")) newDevices["Front Door"] = false;
            changed = true;
        }
    }

    if (changed) {
      setDevices(newDevices);
      addLog(`Hardware Sync: ${detectedIntent} success`, 'SUCCESS');
    }
    setTelemetry(prev => ({ ...prev, intent: detectedIntent, confidence: "94%" }));
  };

  // --- THE ORB: AUDIO REACTIVE & CONSTANT (FIXED) ---
  useEffect(() => {
    if (!canvasRef.current || !isActive || activeTab !== "VOICE") return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    const particles = Array.from({ length: 1400 }, () => ({
      theta: Math.random() * Math.PI * 2,
      phi: Math.acos((Math.random() * 2) - 1),
      colorType: Math.random()
    }));

    function animate() {
      if (!ctx || !canvas || activeTab !== "VOICE") return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      let speed = 0.012; 
      let turb = 0.12;
      let pulse = 1;

      // Reactivity based on State
      if (stateRef.current === "THINKING") { speed = 0.07; turb = 0.5; }
      if (stateRef.current === "SPEAKING") { 
        speed = 0.03; turb = 0.3; 
        pulse = 1 + Math.sin(Date.now() * 0.01) * 0.15; // Voice Waveform Pulse
      }
      if (stateRef.current === "LISTENING") { speed = 0.02; turb = 0.4; pulse = 1.1; }
      
      frame += speed;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const baseRadius = (stateRef.current === "LISTENING" ? 150 : 135) * pulse;

      particles.forEach((p, i) => {
        const time = frame + i * 0.002;
        const wobble = 1 + Math.sin(time * 3 + p.phi * 4) * turb;
        const r = baseRadius * wobble;
        const x = centerX + r * Math.sin(p.phi) * Math.cos(p.theta + frame);
        const y = centerY + r * Math.cos(p.phi);
        const depth = (Math.sin(p.theta + frame) + 1) / 2;

        let rgb = "34, 211, 238"; // Cyan
        if (p.colorType > 0.5) rgb = "168, 85, 247"; // Purple
        if (p.colorType > 0.8) rgb = "249, 115, 22"; // Orange

        ctx.beginPath();
        ctx.arc(x, y, 0.5 + depth * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb}, ${0.1 + depth * 0.8})`;
        if (i % 30 === 0) { ctx.shadowBlur = 10; ctx.shadowColor = `rgb(${rgb})`; }
        ctx.fill();
      });
      requestAnimationFrame(animate);
    }
    const animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [activeTab, isActive]);

  // --- BRAIN: API FETCH (UNTOUCHED) ---
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
    const startTime = Date.now();
    setState("THINKING");
    addLog(`Uplinking command: "${input}"`, 'TRACE');

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, history: historyRef.current, userName: user?.firstName || "Sir" }),
      });
      const data = await res.json();
      const latency = Date.now() - startTime;

      if (res.ok) {
        setResponse(data.reply);
        addLog(`Response acquired in ${latency}ms`, 'SUCCESS');
        setTelemetry(prev => ({ ...prev, latency: `${latency}ms`, commands: prev.commands + 1 }));
        processDeviceCommand(data.reply);
        historyRef.current = [...historyRef.current, { role: "user", content: input }, { role: "assistant", content: data.reply }].slice(-10);
        speak(data.reply);
      }
    } catch (e) {
      setState("IDLE");
      addLog("Neural link failed", 'ERROR');
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
    <main className="fixed inset-0 bg-[#010409] text-[#7d8590] flex flex-col overflow-hidden selection:bg-cyan-500/30">
      
      {/* 1. TOP NAV (COHERENT) */}
      <nav className="h-14 px-8 flex items-center justify-between border-b border-white/[0.03] z-50 bg-[#010409]/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border border-cyan-500/40 rounded flex items-center justify-center relative">
            <div className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${state === 'THINKING' ? 'bg-orange-500 shadow-[0_0_10px_orange]' : 'bg-cyan-400 shadow-[0_0_8px_cyan]'}`} />
          </div>
          <span className="text-[11px] font-black tracking-[0.4em] text-white uppercase italic">Jarvis<span className="text-cyan-500 font-light">OS</span></span>
        </div>

        <div className="flex gap-10 text-[9px] tracking-[0.4em] uppercase font-black">
          {['Core', 'Dashboard', 'Memory', 'Settings'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab === 'Core' ? 'VOICE' : tab.toUpperCase() as ActiveTab)}
              className={`${(activeTab === tab.toUpperCase() || (tab==='Core' && activeTab==='VOICE')) ? 'text-cyan-400 border-b border-cyan-400' : 'hover:text-white'} pb-1 transition-all`}>
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[7px] text-slate-500 tracking-widest uppercase">Latency</span>
            <span className="text-[9px] text-cyan-400 font-mono">{telemetry.latency}</span>
          </div>
          <SignedIn><UserButton afterSignOutUrl="/" /></SignedIn>
        </div>
      </nav>

      {!isActive ? (
        <div className="flex-1 flex items-center justify-center bg-[radial-gradient(circle_at_center,_#0a1120_0%,_#010409_100%)]">
          <button onClick={() => { setIsActive(true); speak("System initialized."); addLog("Neural OS Boot sequence complete.", 'SUCCESS'); }} 
            className="group relative px-12 py-4 border border-cyan-500/30 text-cyan-400 text-[10px] tracking-[0.6em] uppercase hover:bg-cyan-500/5 transition-all overflow-hidden">
            <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent" />
            Initialize System
          </button>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-[320px_1fr_320px] relative overflow-hidden bg-[#010409]">
          
          {/* LEFT PANEL: SMART HOME + PIPELINE */}
          <aside className="p-6 border-r border-white/[0.02] flex flex-col gap-8 bg-[#010409]/50 backdrop-blur-xl z-20 overflow-y-auto custom-scrollbar">
            <section>
              <p className="text-[8px] text-slate-600 uppercase tracking-[0.4em] mb-4">Command Pipeline</p>
              <div className="space-y-3">
                {[
                    { l: 'Signal Capture', active: state === 'LISTENING' },
                    { l: 'Neural Parsing', active: state === 'THINKING' },
                    { l: 'Intent Execution', active: state === 'SPEAKING' }
                ].map((p, i) => (
                    <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${p.active ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-white/[0.01] border-white/5 opacity-40'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${p.active ? 'bg-cyan-400 animate-pulse' : 'bg-slate-700'}`} />
                        <span className="text-[9px] uppercase tracking-widest">{p.l}</span>
                    </div>
                ))}
              </div>
            </section>

            <section>
              <p className="text-[8px] text-slate-600 uppercase tracking-[0.4em] mb-4">Smart Environment</p>
              <div className="space-y-2">
                {Object.entries(devices).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between p-3 rounded-xl bg-[#0d1117] border border-white/[0.03] group hover:border-cyan-500/20 transition-all">
                    <div className="flex flex-col">
                        <span className="text-[9px] uppercase tracking-widest text-slate-400">{key}</span>
                        <span className="text-[7px] text-slate-600 uppercase">Signal: 100%</span>
                    </div>
                    <button onClick={() => setDevices(d => ({...d, [key]: !val}))} className={`w-10 h-5 rounded-full relative transition-all ${val ? 'bg-cyan-600 shadow-[0_0_10px_rgba(6,182,212,0.4)]' : 'bg-slate-800'}`}>
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${val ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </aside>

          {/* CENTER VIEWPORT: THE ORB (LOCKED) */}
          <main className="relative flex flex-col items-center justify-center bg-[radial-gradient(circle_at_center,_#0d1425_0%,_#010409_85%)] overflow-hidden">
            
            {activeTab === "VOICE" && (
                <div className="relative z-10 flex flex-col items-center justify-center w-full h-full">
                    {/* Floating Intent Indicator */}
                    <div className="absolute top-12 flex flex-col items-center animate-in fade-in duration-700">
                        <span className="text-[7px] text-slate-500 uppercase tracking-[0.5em] mb-1">Current Intent</span>
                        <div className="px-5 py-1.5 rounded-full border border-cyan-500/20 bg-cyan-950/20 text-cyan-400 text-[10px] tracking-[0.3em] uppercase font-bold shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                            {telemetry.intent}
                        </div>
                    </div>

                    {/* THE ORB */}
                    <div className="w-[550px] h-[550px] flex items-center justify-center relative">
                        <div className="absolute inset-0 border border-cyan-500/5 rounded-full scale-125 animate-pulse" />
                        <canvas ref={canvasRef} width={650} height={650} className="relative z-10 w-full h-full" />
                    </div>

                    {/* AI Response Overlay */}
                    <div className="absolute bottom-36 w-full max-w-2xl px-6">
                        <div className="p-8 rounded-3xl bg-[#0d1117]/80 border border-white/[0.05] backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-center">
                            <p className="text-[13px] text-slate-200 font-light italic leading-relaxed tracking-wide drop-shadow-md">
                                "{response}"
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "DASHBOARD" && (
                <div className="relative z-10 w-full h-full p-12 grid grid-cols-2 gap-6 animate-in zoom-in duration-500">
                    {[
                        {l: 'Neural Confidence', v: telemetry.confidence, d: 'Intent Recognition'},
                        {l: 'Memory Cache', v: '1.4GB', d: 'Short-term Buffer'},
                        {l: 'Response Time', v: telemetry.latency, d: 'Last API Request'},
                        {l: 'Session Count', v: telemetry.commands, d: 'Total Directives'}
                    ].map(b => (
                        <div key={b.l} className="bg-[#0d1117] border border-white/[0.03] rounded-3xl p-8 flex flex-col items-start justify-center hover:bg-white/[0.02] transition-all group">
                            <span className="text-[9px] tracking-[0.4em] text-slate-500 mb-2 uppercase">{b.l}</span>
                            <span className="text-5xl font-extralight text-cyan-400 mb-2">{b.v}</span>
                            <span className="text-[8px] text-slate-600 uppercase tracking-widest">{b.d}</span>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === "MEMORY" && (
                <div className="relative z-10 w-full h-full p-16 animate-in slide-in-from-bottom-8 duration-700">
                    <h2 className="text-cyan-400 text-[10px] tracking-[0.8em] uppercase mb-12 flex items-center gap-4">
                        <span className="w-12 h-[1px] bg-cyan-500/30" /> Neural Memory Graph
                    </h2>
                    <div className="grid grid-cols-3 gap-6">
                        {['User Identity', 'Hardware Config', 'Behavioral Prefs', 'Voice Profile', 'Interaction Logs', 'Context Map'].map(node => (
                            <div key={node} className="p-6 bg-[#0d1117] border border-white/[0.03] rounded-2xl hover:border-cyan-400/30 transition-all cursor-pointer group">
                                <div className="w-2 h-2 rounded-full bg-cyan-400 mb-4 shadow-[0_0_10px_cyan] group-hover:animate-ping" />
                                <p className="text-[10px] text-slate-300 uppercase tracking-widest">{node}</p>
                                <p className="text-[8px] text-slate-600 mt-2">CONNECTED NODES: 12</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* SHARED CONTROLS */}
            <div className="absolute bottom-10 flex gap-12 z-30">
              <button onClick={toggleMic} className={`w-16 h-16 rounded-full border flex items-center justify-center transition-all duration-500 ${micOn ? 'border-cyan-400 bg-cyan-500/10 shadow-[0_0_40px_rgba(6,182,212,0.4)] scale-110' : 'border-white/10 bg-white/5 hover:border-white/30'}`}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={micOn ? '#22d3ee' : '#475569'} strokeWidth="1.5">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 19v4M8 23h8"/>
                </svg>
              </button>
              <button onClick={() => setIsActive(false)} className="w-16 h-16 rounded-full border border-red-500/20 bg-red-500/5 flex items-center justify-center hover:bg-red-500/30 transition-all">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5"><path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10"/></svg>
              </button>
            </div>
          </main>

          {/* RIGHT PANEL: TELEMETRY + LOGS */}
          <aside className="p-6 border-l border-white/[0.02] flex flex-col gap-8 bg-[#010409] z-20">
            <section>
              <p className="text-[8px] text-slate-600 uppercase tracking-[0.4em] mb-4">Neural Stats</p>
              <div className="grid grid-cols-2 gap-2">
                {[{v:'34°C', l:'CPU TEMP'}, {v:'1.8s', l:'THINKING'}, {v:'PRO', l:'ENGINE'}, {v:'LIVE', l:'SYNC'}].map(s => (
                  <div key={s.l} className="p-4 bg-[#0d1117] border border-white/[0.03] rounded-xl text-center hover:bg-white/5 transition-all">
                    <p className="text-cyan-400 font-black text-[11px]">{s.v}</p>
                    <p className="text-[7px] text-slate-600 mt-1 tracking-widest uppercase">{s.l}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="flex-1 flex flex-col min-h-0">
              <p className="text-[8px] text-slate-600 uppercase tracking-[0.4em] mb-4">Activity Stream</p>
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {log.map((l, i) => (
                  <div key={i} className={`text-[9px] border-l-2 pl-4 py-2 transition-all animate-in slide-in-from-right duration-500 ${
                    l.type === 'SUCCESS' ? 'border-emerald-500' : 
                    l.type === 'ERROR' ? 'border-red-500' : 
                    l.type === 'TRACE' ? 'border-purple-500' : 'border-cyan-500/30'
                  }`}>
                    <p className="text-slate-500 text-[7px] mb-1 font-mono tracking-tighter">{l.time} / {l.type}</p>
                    <p className="text-slate-200 italic leading-relaxed">{l.msg}</p>
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
