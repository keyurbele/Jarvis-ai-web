"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { UserButton, SignedIn, SignedOut, SignInButton, useUser } from "@clerk/nextjs";

type JarvisState = "IDLE" | "LISTENING" | "THINKING" | "SPEAKING";
type ActiveTab = "VOICE" | "DASHBOARD" | "MEMORY" | "SETTINGS";

export default function JarvisOS() {
  const { user, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState<ActiveTab>("VOICE");
  const [isActive, setIsActive] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [state, setState] = useState<JarvisState>("IDLE");
  const [response, setResponse] = useState("Good day to you, Sir, how may I assist you today?");
  const [log, setLog] = useState<{time: string, msg: string}[]>([
    {time: "17:49:10", msg: "JARVIS: Good day to you, Sir, how may I assist you today?"},
    {time: "17:49:10", msg: "User: Hi Jarvis"},
    {time: "17:49:09", msg: "Interface Initialized."}
  ]);
  const [mounted, setMounted] = useState(false);
  
  const [devices, setDevices] = useState<Record<string, boolean>>({
    "LIVING RM LIGHTS": true, "BEDROOM FAN": true, "FRONT DOOR LOCK": false,
    "MAIN AC UNIT": false, "AUDIO SPEAKER": true, "KITCHEN LIGHTS": false,
    "GARAGE DOOR": false, "SECURITY CAMERAS": true, "GARDEN SPRINKLERS": false
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recognitionRef = useRef<any>(null);
  const stateRef = useRef<JarvisState>("IDLE");
  const micOnRef = useRef(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { micOnRef.current = micOn; }, [micOn]);

  // --- ENGINE: THE MAJESTIC ORB ---
  useEffect(() => {
    if (!canvasRef.current || !isActive) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    const particles = Array.from({ length: 2500 }, () => ({
      theta: Math.random() * Math.PI * 2,
      phi: Math.acos((Math.random() * 2) - 1),
      speedMult: 0.3 + Math.random() * 1.2,
      size: 1.0 + Math.random() * 3.5
    }));

    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Removed fast spinning - maintained steady majestic rotation
      let rotSpeed = 0.006; 
      let turbulence = 0.25;
      const baseRadius = 155; 
      
      frame += rotSpeed;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      particles.forEach((p, i) => {
        const pFrame = frame * p.speedMult;
        const wobble = 1 + Math.sin(pFrame * 1.5 + p.phi * 4) * turbulence;
        const r = baseRadius * wobble;
        const x = centerX + r * Math.sin(p.phi) * Math.cos(p.theta + frame);
        const y = centerY + r * Math.cos(p.phi);
        const depth = (Math.sin(p.theta + frame) + 1) / 2;

        let rgb = "255, 20, 147"; // Hot Pink
        if (i % 7 === 0) rgb = "168, 85, 247"; // Purple
        if (i % 20 === 0) rgb = "100, 200, 255"; // Cyan Flare

        ctx.beginPath();
        ctx.arc(x, y, (0.6 + depth * 4.2) * (p.size/2), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb}, ${0.15 + depth * 0.8})`;
        if (i % 40 === 0) { ctx.shadowBlur = 20; ctx.shadowColor = `rgb(${rgb})`; }
        ctx.fill();
      });
      requestAnimationFrame(animate);
    }
    const animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [isActive, mounted]);

  const speak = useCallback((text: string) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.pitch = 0.85; u.onstart = () => setState("SPEAKING"); u.onend = () => setState("IDLE");
    window.speechSynthesis.speak(u);
  }, []);

  if (!mounted || !isLoaded) return null;

  return (
    <main className="fixed inset-0 bg-[#02050a] text-[#7d8590] flex flex-col overflow-hidden font-sans">
      
      {/* NAV BAR */}
      <nav className={`h-20 px-12 flex items-center justify-between border-b border-white/[0.03] z-50 transition-all duration-500 ${activeTab === 'DASHBOARD' ? 'bg-transparent border-none' : 'bg-[#02050a]'}`}>
        <div className="flex items-center gap-4">
          <div className="w-6 h-6 bg-pink-500/20 border border-pink-500/40 rounded flex items-center justify-center">
            <div className="w-2 h-2 bg-pink-500 rounded-sm shadow-[0_0_10px_#ff1493]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold tracking-[0.4em] text-white uppercase italic leading-none">Jarvis<span className="text-pink-500 font-light">OS</span></span>
            <span className="text-[7px] tracking-[0.2em] text-slate-600 uppercase mt-1">Neural Interface v4.2.0</span>
          </div>
        </div>

        <div className="flex gap-12 text-[10px] tracking-[0.4em] uppercase font-bold absolute left-1/2 -translate-x-1/2">
          {['Voice', 'Dashboard', 'Memory', 'Settings'].map(t => (
            <button key={t} onClick={() => setActiveTab(t.toUpperCase() as ActiveTab)} className={`${activeTab === t.toUpperCase() ? 'text-pink-500' : 'text-slate-500 hover:text-white'} transition-all relative pb-1`}>
              {t} {activeTab === t.toUpperCase() && <span className="absolute bottom-0 left-0 w-full h-[1px] bg-pink-500 shadow-[0_0_10px_#ff1493]" />}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-6">
          <SignedIn><UserButton afterSignOutUrl="/" /></SignedIn>
          <SignedOut><SignInButton mode="modal"><button className="text-[10px] tracking-[0.2em] uppercase border border-white/10 px-6 py-2 rounded-md hover:bg-white/5 transition-all">Authorize</button></SignInButton></SignedOut>
        </div>
      </nav>

      {!isActive ? (
        <div className="flex-1 flex items-center justify-center bg-[#02050a]">
          <button onClick={() => { setIsActive(true); speak("System initialized."); }} className="px-16 py-5 border border-pink-500/30 text-pink-400 text-[11px] tracking-[0.7em] uppercase hover:bg-pink-500/10 transition-all shadow-[0_0_40px_rgba(255,20,147,0.1)]">Initialize Core</button>
        </div>
      ) : (
        <div className="flex-1 relative flex overflow-hidden">
          
          {/* LEFT: HOME NETWORK */}
          <aside className={`w-[360px] p-10 flex flex-col gap-8 transition-all duration-500 ${activeTab === 'DASHBOARD' ? '-translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}>
            <p className="text-[9px] text-slate-600 uppercase tracking-[0.4em] mb-4">Home Network <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full ml-2 shadow-[0_0_8px_#10b981]" /></p>
            <div className="space-y-4">
              {Object.entries(devices).slice(0, 5).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between p-5 rounded-2xl bg-white/[0.02] border border-white/[0.03] shadow-inner">
                  <span className="text-[10px] tracking-[0.1em] text-slate-400 font-medium">{key}</span>
                  <button onClick={() => setDevices(d => ({...d, [key]: !val}))} className={`w-12 h-6 rounded-full relative transition-all ${val ? 'bg-pink-600 shadow-[0_0_15px_rgba(219,39,119,0.4)]' : 'bg-[#1a1f2e]'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md ${val ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
              ))}
            </div>
          </aside>

          {/* CENTER: THE VIEWPORT */}
          <main className="flex-1 relative flex items-center justify-center">
            {/* NEURAL STAT CARDS (DASHBOARD ONLY) */}
            <div className={`absolute inset-0 z-0 transition-all duration-700 pointer-events-none ${activeTab === 'DASHBOARD' ? 'opacity-100' : 'opacity-0'}`}>
               <div className="absolute top-20 left-20 w-56 h-72 rounded-[40px] bg-white/[0.01] border border-white/[0.03] flex flex-col items-center justify-center backdrop-blur-xl">
                  <p className="text-[8px] tracking-[0.3em] text-slate-600 mb-6 uppercase">Neural Load</p>
                  <p className="text-4xl font-light text-cyan-400 tracking-tighter">12%</p>
               </div>
               <div className="absolute top-20 right-20 w-56 h-72 rounded-[40px] bg-white/[0.01] border border-white/[0.03] flex flex-col items-center justify-center backdrop-blur-xl">
                  <p className="text-[8px] tracking-[0.3em] text-slate-600 mb-6 uppercase">Sync Latency</p>
                  <p className="text-4xl font-light text-cyan-400 tracking-tighter">24ms</p>
               </div>
               <div className="absolute bottom-20 left-20 w-56 h-72 rounded-[40px] bg-white/[0.01] border border-white/[0.03] flex flex-col items-center justify-center backdrop-blur-xl">
                  <p className="text-[8px] tracking-[0.3em] text-slate-600 mb-6 uppercase">Power Cells</p>
                  <p className="text-4xl font-light text-cyan-400 tracking-tighter">98%</p>
               </div>
               <div className="absolute bottom-20 right-20 w-56 h-72 rounded-[40px] bg-white/[0.01] border border-white/[0.03] flex flex-col items-center justify-center backdrop-blur-xl">
                  <p className="text-[8px] tracking-[0.3em] text-slate-600 mb-6 uppercase">Active Nodes</p>
                  <p className="text-4xl font-light text-cyan-400 tracking-tighter">1,024</p>
               </div>
            </div>

            {/* THE ORB - 0.5s TRANSITION */}
            <div className={`relative transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] z-10 ${activeTab === 'DASHBOARD' ? 'scale-[1.2]' : 'scale-100'}`}>
                <canvas ref={canvasRef} width={1000} height={1000} className="w-[700px] h-[700px] filter drop-shadow-[0_0_40px_rgba(255,20,147,0.2)]" />
            </div>

            {/* VOICE RESPONSE */}
            <div className={`absolute bottom-32 w-full max-w-2xl transition-all duration-500 ${activeTab === 'VOICE' ? 'opacity-100' : 'opacity-0 translate-y-10'}`}>
                <div className="p-12 rounded-[50px] bg-[#0d1117]/60 border border-white/[0.05] backdrop-blur-3xl text-center shadow-2xl">
                    <p className="text-lg text-slate-200 font-light italic tracking-wide">"{response}"</p>
                </div>
            </div>

            {/* MIC BUTTON */}
            <div className="absolute bottom-10 z-20">
              <button className={`w-20 h-20 rounded-full border flex items-center justify-center transition-all ${micOn ? 'border-pink-500 bg-pink-500/10 shadow-[0_0_40px_#ff1493]' : 'border-white/10 bg-white/5'}`}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={micOn ? '#ff1493' : '#475569'} strokeWidth="1.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 19v4M8 23h8"/></svg>
              </button>
            </div>
          </main>

          {/* RIGHT: CONTEXT & LOGS */}
          <aside className={`w-[360px] p-10 flex flex-col gap-14 transition-all duration-500 ${activeTab === 'DASHBOARD' ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}>
            <section>
              <p className="text-[9px] text-slate-600 uppercase tracking-[0.4em] mb-6">Neural Context</p>
              <div className="flex flex-wrap gap-2">
                {['Identity: Keyur', 'Privilege: Root', 'OS: Majestic v4', 'Mode: Active', 'Encryption: 4096-bit', 'Neural: Synced', 'Hardware: 15 Nodes'].map(tag => (
                  <span key={tag} className="px-4 py-2 bg-pink-500/5 border border-pink-500/10 rounded-xl text-[9px] text-pink-400/80">
                    {tag}
                  </span>
                ))}
              </div>
            </section>
            
            <section className="flex-1 min-h-0 flex flex-col">
              <p className="text-[9px] text-slate-600 uppercase tracking-[0.4em] mb-8">System Log <span className="text-[7px] ml-4 font-mono text-slate-500">LIVE FEED</span></p>
              <div className="flex-1 overflow-y-auto space-y-6 pr-4">
                {log.map((l, i) => (
                  <div key={i} className="text-[11px] border-l border-pink-500/20 pl-6 py-1">
                    <p className="text-slate-600 text-[8px] mb-1 font-mono">{l.time} — SYSTEM_EVENT</p>
                    <p className="text-slate-300 italic leading-relaxed">{l.msg}</p>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      )}
    </main>
  );
}
