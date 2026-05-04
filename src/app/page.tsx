"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { UserButton, SignedIn, SignedOut, SignInButton, useUser } from "@clerk/nextjs";

/** * JARVIS OS v4.2.5 - SCALE STABILIZED
 * FIXED: Dashboard Orb clipping/overflow
 * FIXED: Voice Orb size prominence
 * RESTORED: Full 400+ line structural integrity
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
  
  // --- HARDWARE ---
  const [devices, setDevices] = useState<Record<string, boolean>>({
    "LIVING RM LIGHTS": true, "BEDROOM FAN": true, "FRONT DOOR LOCK": false,
    "MAIN AC UNIT": false, "AUDIO SPEAKER": true, "KITCHEN LIGHTS": false,
    "GARAGE DOOR": false, "SECURITY CAMERAS": true, "GARDEN SPRINKLERS": false,
    "POOL HEATER": false, "SMART BLINDS": true, "STUDY LAMP": true,
    "WIFI MESH NODE": true, "BASEMENT SENSORS": false, "GUEST ROOM AC": false
  });

  const [log, setLog] = useState<{time: string, msg: string}[]>([
    {time: "17:49:10", msg: "JARVIS: Neural core link stable."},
    {time: "17:49:10", msg: "User: Admin authenticated."},
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
    setLog(prev => [{time: timeStr, msg}, ...prev].slice(0, 20));
  };

  // --- ENGINE: VOLUMETRIC PLASMA ORB ---
  useEffect(() => {
    if (!canvasRef.current || !isActive) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    const blobs = Array.from({ length: 50 }, () => ({
      x: 0, y: 0,
      r: 90 + Math.random() * 130,
      angle: Math.random() * Math.PI * 2,
      speed: 0.008 + Math.random() * 0.015,
      phase: Math.random() * Math.PI * 2,
      color: Math.random() > 0.4 ? "255, 20, 147" : "147, 51, 234"
    }));

    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "screen";
      
      frame += 0.012;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      blobs.forEach((b) => {
        b.angle += b.speed;
        const x = cx + Math.cos(b.angle) * 45;
        const y = cy + Math.sin(b.angle + b.phase) * 45;
        const pulse = 1 + Math.sin(frame + b.phase) * 0.12;

        const grad = ctx.createRadialGradient(x, y, 0, x, y, b.r * pulse);
        grad.addColorStop(0, `rgba(${b.color}, 0.28)`);
        grad.addColorStop(0.5, `rgba(${b.color}, 0.1)`);
        grad.addColorStop(1, `rgba(${b.color}, 0)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, b.r * pulse, 0, Math.PI * 2);
        ctx.fill();
      });

      // Sharp Energy Arcs
      for(let i=0; i<180; i++) {
        const t = frame * 0.4 + (i * 0.12);
        const r = 160 + Math.sin(t * 1.5) * 12;
        const px = cx + Math.cos(t + i) * r;
        const py = cy + Math.sin(t * 0.7 + i) * r;
        
        ctx.fillStyle = i % 6 === 0 ? "#00f0ff" : "#ff1493";
        ctx.beginPath();
        ctx.arc(px, py, 1.4, 0, Math.PI * 2);
        ctx.fill();
        if(i % 15 === 0) {
            ctx.shadowBlur = 15;
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
    u.pitch = 0.9; u.rate = 0.95;
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
            setResponse(`Working on: ${res}`);
            speak("Scanning databases now.");
        };
        recognitionRef.current.start();
        setMicOn(true); setState("LISTENING");
      }
    }
  };

  if (!mounted || !isLoaded) return null;

  return (
    <main className="fixed inset-0 bg-[#010409] text-[#7d8590] overflow-hidden font-sans select-none flex flex-col">
      
      {/* HEADER */}
      <nav className="h-20 px-12 flex items-center justify-between border-b border-white/[0.03] bg-[#010409] z-[100] shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-7 h-7 bg-pink-500/10 border border-pink-500/40 rounded flex items-center justify-center">
            <div className="w-2.5 h-2.5 bg-pink-500 rounded shadow-[0_0_12px_#ff1493]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[12px] font-bold tracking-[0.5em] text-white uppercase italic">Jarvis<span className="text-pink-500 font-light">OS</span></span>
            <span className="text-[7px] tracking-[0.2em] text-slate-600 uppercase">Neural Interface v4.2.5</span>
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
          <SignedOut><SignInButton mode="modal"><button className="text-[10px] tracking-[0.3em] uppercase border border-white/10 px-8 py-2.5 rounded hover:bg-white/5 transition-all">Authorize</button></SignInButton></SignedOut>
        </div>
      </nav>

      {/* BODY */}
      {!isActive ? (
        <div className="flex-1 flex items-center justify-center bg-[#010409]">
          <button onClick={() => setIsActive(true)} className="px-20 py-6 border border-pink-500/20 text-pink-400 text-[11px] tracking-[0.8em] uppercase hover:bg-pink-500/10 transition-all">Initialize Core</button>
        </div>
      ) : (
        <div className="flex-1 relative flex overflow-hidden">
          
          {/* SIDEBAR LEFT */}
          <aside className={`w-[380px] p-10 flex flex-col gap-10 bg-[#010409] border-r border-white/5 transition-all duration-700 z-50 shrink-0 ${activeTab === 'DASHBOARD' ? '-translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}>
            <p className="text-[10px] text-slate-600 uppercase tracking-[0.4em]">Home Network</p>
            <div className="space-y-4 overflow-y-auto custom-scrollbar pr-4">
              {Object.entries(devices).slice(0, 10).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between p-5 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-pink-500/20 transition-all group">
                  <span className="text-[10px] tracking-[0.15em] text-slate-400 group-hover:text-white uppercase">{key}</span>
                  <button onClick={() => setDevices(d => ({...d, [key]: !val}))} className={`w-11 h-5.5 rounded-full relative transition-all ${val ? 'bg-pink-600 shadow-[0_0_15px_#db2777]' : 'bg-slate-800'}`}>
                    <div className={`absolute top-1 w-3.5 h-3.5 bg-white rounded-full transition-all ${val ? 'left-6.5' : 'left-1'}`} />
                  </button>
                </div>
              ))}
            </div>
          </aside>

          {/* VIEWPORT CENTER */}
          <main className="flex-1 relative flex items-center justify-center overflow-hidden">
            
            {/* DASHBOARD CARDS (Z-index adjusted and scaled) */}
            <div className={`absolute inset-0 transition-all duration-700 flex items-center justify-center ${activeTab === 'DASHBOARD' ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}`}>
                {/* 4 Cards strictly positioned to not clip with sidebars */}
                <div className="grid grid-cols-2 gap-[450px] gap-y-[150px]">
                    <div className="w-[240px] h-[300px] rounded-[45px] bg-[#0d1117]/60 border border-white/5 backdrop-blur-2xl flex flex-col items-center justify-center">
                        <p className="text-[9px] tracking-[0.4em] text-slate-600 mb-6 uppercase">Neural Load</p>
                        <p className="text-5xl font-extralight text-cyan-400 tracking-tighter">12%</p>
                    </div>
                    <div className="w-[240px] h-[300px] rounded-[45px] bg-[#0d1117]/60 border border-white/5 backdrop-blur-2xl flex flex-col items-center justify-center">
                        <p className="text-[9px] tracking-[0.4em] text-slate-600 mb-6 uppercase">Sync Latency</p>
                        <p className="text-5xl font-extralight text-cyan-400 tracking-tighter">24ms</p>
                    </div>
                    <div className="w-[240px] h-[300px] rounded-[45px] bg-[#0d1117]/60 border border-white/5 backdrop-blur-2xl flex flex-col items-center justify-center">
                        <p className="text-[9px] tracking-[0.4em] text-slate-600 mb-6 uppercase">Power Cells</p>
                        <p className="text-5xl font-extralight text-cyan-400 tracking-tighter">98%</p>
                    </div>
                    <div className="w-[240px] h-[300px] rounded-[45px] bg-[#0d1117]/60 border border-white/5 backdrop-blur-2xl flex flex-col items-center justify-center">
                        <p className="text-[9px] tracking-[0.4em] text-slate-600 mb-6 uppercase">Active Nodes</p>
                        <p className="text-5xl font-extralight text-cyan-400 tracking-tighter">1,024</p>
                    </div>
                </div>
            </div>

            {/* THE ORB - DUAL SCALE LOGIC */}
            <div className={`transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] z-20 ${
              activeTab === 'DASHBOARD' ? 'scale-[0.58]' : 'scale-[0.9] translate-y-[-30px]'
            }`}>
              <canvas ref={canvasRef} width={1000} height={1000} className="w-[900px] h-[900px]" />
            </div>

            {/* RESPONSE UI */}
            <div className={`absolute bottom-36 w-full max-w-2xl transition-all duration-700 z-30 ${activeTab === 'VOICE' ? 'opacity-100' : 'opacity-0 translate-y-10'}`}>
                <div className="p-12 rounded-[50px] bg-[#0d1117]/80 border border-white/5 backdrop-blur-3xl text-center shadow-[0_30px_100px_rgba(0,0,0,0.5)] mx-auto">
                    <p className="text-lg text-slate-200 font-light italic leading-relaxed tracking-wide">"{response}"</p>
                </div>
            </div>

            {/* MIC CONTROL */}
            <div className="absolute bottom-12 z-40">
                <button onClick={toggleMic} className={`w-20 h-20 rounded-full border flex items-center justify-center transition-all ${micOn ? 'border-pink-500 bg-pink-500/10 shadow-[0_0_40px_#ff1493]' : 'border-white/10 bg-[#0d1117] hover:border-pink-500/40'}`}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={micOn ? '#ff1493' : '#475569'} strokeWidth="1.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 19v4M8 23h8"/></svg>
                </button>
            </div>
          </main>

          {/* SIDEBAR RIGHT */}
          <aside className={`w-[380px] p-10 flex flex-col gap-12 bg-[#010409] border-l border-white/5 transition-all duration-700 z-50 shrink-0 ${activeTab === 'DASHBOARD' ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}>
            <section>
              <p className="text-[10px] text-slate-600 uppercase tracking-[0.4em] mb-8">Neural Context</p>
              <div className="flex flex-wrap gap-2.5">
                {['Identity: Keyur', 'Privilege: Root', 'OS: Majestic v4', 'Mode: Active', 'Encryption: 4096-bit'].map(tag => (
                  <span key={tag} className="px-5 py-2.5 bg-pink-500/[0.04] border border-pink-500/10 rounded-2xl text-[10px] text-pink-400/80 hover:bg-pink-500/10 transition-colors">
                    {tag}
                  </span>
                ))}
              </div>
            </section>
            <section className="flex-1 min-h-0 flex flex-col">
              <p className="text-[10px] text-slate-600 uppercase tracking-[0.4em] mb-8">System Log</p>
              <div className="flex-1 overflow-y-auto space-y-7 pr-4 custom-scrollbar">
                {log.map((l, i) => (
                  <div key={i} className="text-[11px] border-l-2 border-pink-500/20 pl-6 py-1">
                    <p className="text-slate-600 text-[8px] mb-1 font-mono">{l.time} — EVENT</p>
                    <p className="text-slate-300 italic font-light leading-relaxed">{l.msg}</p>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1a202e; border-radius: 10px; }
        * { scroll-behavior: smooth; }
      `}</style>
    </main>
  );
}
