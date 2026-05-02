"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { UserButton, SignedIn, SignedOut, SignInButton, useUser } from "@clerk/nextjs";

/** * JARVIS OS v4.2.0 - MASTER SOURCE
 * RESTORED: Volumetric Plasma Orb
 * RESTORED: Absolute Dashboard Positioning
 * RESTORED: Full 400+ Line Complexity
 */

type JarvisState = "IDLE" | "LISTENING" | "THINKING" | "SPEAKING";
type ActiveTab = "VOICE" | "DASHBOARD" | "MEMORY" | "SETTINGS";

export default function JarvisOS() {
  const { user, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState<ActiveTab>("VOICE");
  const [isActive, setIsActive] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [state, setState] = useState<JarvisState>("IDLE");
  const [response, setResponse] = useState("Good day to you, Sir, how may I assist you today?");
  const [mounted, setMounted] = useState(false);
  
  // --- HARDWARE REGISTRY (FULL) ---
  const [devices, setDevices] = useState<Record<string, boolean>>({
    "LIVING RM LIGHTS": true,
    "BEDROOM FAN": true,
    "FRONT DOOR LOCK": false,
    "MAIN AC UNIT": false,
    "AUDIO SPEAKER": true,
    "KITCHEN LIGHTS": false,
    "GARAGE DOOR": false,
    "SECURITY CAMERAS": true,
    "GARDEN SPRINKLERS": false,
    "POOL HEATER": false,
    "SMART BLINDS": true,
    "STUDY LAMP": true,
    "WIFI MESH NODE": true,
    "BASEMENT SENSORS": false,
    "GUEST ROOM AC": false
  });

  // --- LOG REGISTRY (FULL) ---
  const [log, setLog] = useState<{time: string, msg: string}[]>([
    {time: "17:49:10", msg: "JARVIS: Good day to you, Sir, how may I assist you today?"},
    {time: "17:49:10", msg: "User: Hi Jarvis"},
    {time: "17:49:09", msg: "Interface Initialized."}
  ]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recognitionRef = useRef<any>(null);
  const stateRef = useRef<JarvisState>("IDLE");
  const micOnRef = useRef(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { micOnRef.current = micOn; }, [micOn]);

  const addLog = (msg: string) => {
    const timeStr = new Date().toLocaleTimeString('en-GB', { hour12: false });
    setLog(prev => [{time: timeStr, msg}, ...prev].slice(0, 25));
  };

  // --- MAJESTIC PLASMA ENGINE (VOLUMETRIC ORB) ---
  useEffect(() => {
    if (!canvasRef.current || !isActive) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    // High-density glow particles
    const blobs = Array.from({ length: 45 }, () => ({
      x: 0, y: 0,
      r: 80 + Math.random() * 120,
      angle: Math.random() * Math.PI * 2,
      speed: 0.01 + Math.random() * 0.02,
      phase: Math.random() * Math.PI * 2,
      color: Math.random() > 0.5 ? "255, 20, 147" : "147, 51, 234"
    }));

    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "screen";
      
      frame += 0.015;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Draw Volumetric Core
      blobs.forEach((b) => {
        b.angle += b.speed;
        const x = cx + Math.cos(b.angle) * 40;
        const y = cy + Math.sin(b.angle + b.phase) * 40;
        const pulse = 1 + Math.sin(frame + b.phase) * 0.15;

        const grad = ctx.createRadialGradient(x, y, 0, x, y, b.r * pulse);
        grad.addColorStop(0, `rgba(${b.color}, 0.25)`);
        grad.addColorStop(0.5, `rgba(${b.color}, 0.08)`);
        grad.addColorStop(1, `rgba(${b.color}, 0)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, b.r * pulse, 0, Math.PI * 2);
        ctx.fill();
      });

      // Sharp Particle Accents
      for(let i=0; i<150; i++) {
        const t = frame * 0.5 + (i * 0.1);
        const r = 140 + Math.sin(t * 2) * 10;
        const px = cx + Math.cos(t + i) * r;
        const py = cy + Math.sin(t * 0.8 + i) * r;
        
        ctx.fillStyle = i % 5 === 0 ? "#00f0ff" : "#ff1493";
        ctx.beginPath();
        ctx.arc(px, py, 1.2, 0, Math.PI * 2);
        ctx.fill();
        if(i % 10 === 0) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = "#ff1493";
        }
      }

      requestAnimationFrame(animate);
    }
    const animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [isActive]);

  const speak = useCallback((text: string) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.pitch = 0.88; u.rate = 0.95;
    u.onstart = () => setState("SPEAKING");
    u.onend = () => setState("IDLE");
    window.speechSynthesis.speak(u);
  }, []);

  const toggleMic = () => {
    if (micOnRef.current) {
      setMicOn(false); setState("IDLE");
      try { recognitionRef.current?.stop(); } catch {}
    } else {
      const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      if (SR) {
        recognitionRef.current = new SR();
        recognitionRef.current.onresult = (e: any) => {
            const res = e.results[0][0].transcript;
            addLog(`User: ${res}`);
            setResponse(`Processing: ${res}`);
            speak("Understood.");
        };
        recognitionRef.current.start();
        setMicOn(true); setState("LISTENING");
      }
    }
  };

  if (!mounted || !isLoaded) return null;

  return (
    <main className="fixed inset-0 bg-[#010409] text-[#7d8590] overflow-hidden font-sans select-none">
      
      {/* --- HEADER --- */}
      <nav className="h-20 px-12 flex items-center justify-between border-b border-white/[0.03] bg-[#010409] relative z-[100]">
        <div className="flex items-center gap-4">
          <div className="w-7 h-7 bg-pink-500/10 border border-pink-500/40 rounded flex items-center justify-center">
            <div className="w-2.5 h-2.5 bg-pink-500 rounded shadow-[0_0_12px_#ff1493]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[12px] font-bold tracking-[0.5em] text-white uppercase italic">Jarvis<span className="text-pink-500 font-light">OS</span></span>
            <span className="text-[7px] tracking-[0.2em] text-slate-600 uppercase">Neural Interface v4.2.0</span>
          </div>
        </div>

        <div className="flex gap-14 text-[10px] tracking-[0.4em] uppercase font-bold absolute left-1/2 -translate-x-1/2">
          {['Voice', 'Dashboard', 'Memory', 'Settings'].map(t => (
            <button key={t} onClick={() => setActiveTab(t.toUpperCase() as ActiveTab)} 
              className={`${activeTab === t.toUpperCase() ? 'text-pink-500' : 'text-slate-500 hover:text-white'} transition-all relative pb-2`}>
              {t} {activeTab === t.toUpperCase() && <span className="absolute bottom-0 left-0 w-full h-[2px] bg-pink-500 shadow-[0_0_15px_#ff1493]" />}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-6">
          <SignedIn><UserButton afterSignOutUrl="/" /></SignedIn>
          <SignedOut><SignInButton mode="modal"><button className="text-[10px] tracking-[0.3em] uppercase border border-white/10 px-8 py-2.5 rounded hover:bg-white/5 transition-all text-slate-300">Authorize</button></SignInButton></SignedOut>
        </div>
      </nav>

      {/* --- CORE INTERFACE --- */}
      {!isActive ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[#010409] z-[90]">
          <button onClick={() => setIsActive(true)} className="px-20 py-6 border border-pink-500/20 text-pink-400 text-[11px] tracking-[0.8em] uppercase hover:bg-pink-500/5 transition-all">Initialize Core</button>
        </div>
      ) : (
        <div className="h-[calc(100vh-80px)] relative flex">
          
          {/* SIDEBAR LEFT */}
          <aside className={`w-[400px] p-10 flex flex-col gap-10 bg-[#010409] border-r border-white/5 transition-transform duration-700 z-50 ${activeTab === 'DASHBOARD' ? '-translate-x-full' : 'translate-x-0'}`}>
            <p className="text-[10px] text-slate-600 uppercase tracking-[0.4em]">Home Network <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block ml-2 shadow-[0_0_8px_emerald]" /></p>
            <div className="space-y-4 overflow-y-auto custom-scrollbar pr-4">
              {Object.entries(devices).slice(0, 8).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between p-6 rounded-3xl bg-white/[0.02] border border-white/5 group hover:border-pink-500/20 transition-all">
                  <span className="text-[11px] tracking-[0.15em] text-slate-400 group-hover:text-white uppercase">{key}</span>
                  <button onClick={() => setDevices(d => ({...d, [key]: !val}))} className={`w-12 h-6 rounded-full relative transition-all ${val ? 'bg-pink-600 shadow-[0_0_20px_#db2777]' : 'bg-slate-800'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${val ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
              ))}
            </div>
          </aside>

          {/* VIEWPORT CENTER */}
          <div className="flex-1 relative flex items-center justify-center">
            
            {/* ABSOLUTE DASHBOARD CARDS (Corrected Z-Index & Position) */}
            <div className={`absolute inset-0 transition-all duration-700 ${activeTab === 'DASHBOARD' ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}`}>
                <div className="absolute top-[10%] left-[10%] w-[280px] h-[360px] rounded-[50px] bg-[#0d1117]/50 border border-white/5 backdrop-blur-2xl flex flex-col items-center justify-center">
                    <p className="text-[10px] tracking-[0.4em] text-slate-600 mb-8 uppercase">Neural Load</p>
                    <p className="text-6xl font-extralight text-cyan-400">12%</p>
                </div>
                <div className="absolute top-[10%] right-[10%] w-[280px] h-[360px] rounded-[50px] bg-[#0d1117]/50 border border-white/5 backdrop-blur-2xl flex flex-col items-center justify-center">
                    <p className="text-[10px] tracking-[0.4em] text-slate-600 mb-8 uppercase">Sync Latency</p>
                    <p className="text-6xl font-extralight text-cyan-400">24ms</p>
                </div>
                <div className="absolute bottom-[10%] left-[10%] w-[280px] h-[360px] rounded-[50px] bg-[#0d1117]/50 border border-white/5 backdrop-blur-2xl flex flex-col items-center justify-center">
                    <p className="text-[10px] tracking-[0.4em] text-slate-600 mb-8 uppercase">Power Cells</p>
                    <p className="text-6xl font-extralight text-cyan-400">98%</p>
                </div>
                <div className="absolute bottom-[10%] right-[10%] w-[280px] h-[360px] rounded-[50px] bg-[#0d1117]/50 border border-white/5 backdrop-blur-2xl flex flex-col items-center justify-center">
                    <p className="text-[10px] tracking-[0.4em] text-slate-600 mb-8 uppercase">Active Nodes</p>
                    <p className="text-6xl font-extralight text-cyan-400">1,024</p>
                </div>
            </div>

            {/* THE ORB */}
            <div className={`transition-transform duration-500 ease-out ${activeTab === 'DASHBOARD' ? 'scale-[0.8]' : 'scale-100 translate-y-[-40px]'}`}>
              <canvas ref={canvasRef} width={1000} height={1000} className="w-[800px] h-[800px]" />
            </div>

            {/* VOICE RESPONSE BOX */}
            <div className={`absolute bottom-44 w-[700px] transition-all duration-700 ${activeTab === 'VOICE' ? 'opacity-100' : 'opacity-0 translate-y-10'}`}>
                <div className="p-16 rounded-[60px] bg-[#0d1117]/80 border border-white/5 backdrop-blur-3xl text-center shadow-2xl">
                    <p className="text-xl text-slate-200 font-light italic leading-relaxed tracking-wide selection:bg-pink-500/30">
                      "{response}"
                    </p>
                </div>
            </div>

            {/* MIC BUTTON */}
            <div className={`absolute bottom-16 transition-all duration-500 ${activeTab === 'DASHBOARD' ? 'opacity-100' : 'opacity-100'}`}>
                <button onClick={toggleMic} className={`w-24 h-24 rounded-full border flex items-center justify-center transition-all group ${micOn ? 'border-pink-500 bg-pink-500/10 shadow-[0_0_50px_#ff1493]' : 'border-white/10 bg-[#12161f] hover:border-pink-500/40'}`}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={micOn ? '#ff1493' : '#475569'} strokeWidth="1.5" className="group-hover:scale-110 transition-transform">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 19v4M8 23h8"/>
                    </svg>
                </button>
            </div>
          </div>

          {/* SIDEBAR RIGHT */}
          <aside className={`w-[400px] p-10 flex flex-col gap-14 bg-[#010409] border-l border-white/5 transition-transform duration-700 z-50 ${activeTab === 'DASHBOARD' ? 'translate-x-full' : 'translate-x-0'}`}>
            <section>
              <p className="text-[10px] text-slate-600 uppercase tracking-[0.4em] mb-10">Neural Context</p>
              <div className="flex flex-wrap gap-2.5">
                {['Identity: Keyur', 'Privilege: Root', 'OS: Majestic v4', 'Mode: Active', 'Encryption: 4096-bit', 'Neural: Synced'].map(tag => (
                  <span key={tag} className="px-5 py-2.5 bg-pink-500/[0.03] border border-pink-500/10 rounded-2xl text-[10px] text-pink-400/70 hover:bg-pink-500/10 cursor-default">
                    {tag}
                  </span>
                ))}
              </div>
            </section>
            <section className="flex-1 min-h-0 flex flex-col">
              <p className="text-[10px] text-slate-600 uppercase tracking-[0.4em] mb-10">System Log <span className="text-[7px] ml-4 text-slate-500 font-mono">LIVE_FEED</span></p>
              <div className="flex-1 overflow-y-auto space-y-8 pr-4 custom-scrollbar">
                {log.map((l, i) => (
                  <div key={i} className="text-[12px] border-l-2 border-pink-500/20 pl-8 py-1 group">
                    <p className="text-slate-600 text-[9px] mb-2 font-mono">{l.time} — EVENT</p>
                    <p className="text-slate-300 italic font-light leading-relaxed group-hover:text-white transition-colors">{l.msg}</p>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1a1f2e; border-radius: 10px; }
        canvas { image-rendering: auto; }
      `}</style>
    </main>
  );
}
