"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { UserButton, SignedIn, SignedOut, SignInButton, useUser } from "@clerk/nextjs";

// --- TYPES ---
type JarvisState = "IDLE" | "LISTENING" | "THINKING" | "SPEAKING";
type ActiveTab = "VOICE" | "DASHBOARD" | "MEMORY" | "SETTINGS" | "LOGS";

export default function JarvisOS() {
  const { user, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState<ActiveTab>("VOICE");
  const [isActive, setIsActive] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [state, setState] = useState<JarvisState>("IDLE");
  const [response, setResponse] = useState("System online. Awaiting your command.");
  const [log, setLog] = useState<{time: string, msg: string}[]>([]);
  const [mounted, setMounted] = useState(false);
  
  // Smart Home States
  const [devices, setDevices] = useState({
    "Living Rm": true,
    "Bedroom Fan": true,
    "Front Door": false,
    "AC Unit": false,
    "Speaker": true
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recognitionRef = useRef<any>(null);
  const stateRef = useRef<JarvisState>("IDLE");
  const micOnRef = useRef(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { micOnRef.current = micOn; }, [micOn]);

  // --- HELPER: ADD LOG ---
  const addLog = (msg: string) => {
    const now = new Date();
    const timeStr = now.getHours().toString().padStart(2, '0') + ":" + 
                    now.getMinutes().toString().padStart(2, '0') + ":" + 
                    now.getSeconds().toString().padStart(2, '0');
    setLog(prev => [{time: timeStr, msg}, ...prev].slice(0, 15));
  };

  // --- THE SUPER ORB ENGINE ---
  useEffect(() => {
    if (!canvasRef.current || activeTab !== "VOICE") return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    const particles = Array.from({ length: 850 }, () => ({
      theta: Math.random() * Math.PI * 2,
      phi: Math.acos((Math.random() * 2) - 1),
      colorType: Math.random()
    }));

    function animate() {
      if (!ctx || !canvas || activeTab !== "VOICE") return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Speed up rotation during thinking
      frame += (stateRef.current === "THINKING" ? 0.08 : 0.015);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const baseRadius = stateRef.current === "LISTENING" ? 140 : 125;

      particles.forEach((p, i) => {
        const time = frame + i * 0.005;
        const wobble = 1 + Math.sin(time * 2.5 + p.phi * 4) * 0.15;
        const r = baseRadius * wobble;

        const x = centerX + r * Math.sin(p.phi) * Math.cos(p.theta + frame);
        const y = centerY + r * Math.cos(p.phi);
        const depth = (Math.sin(p.theta + frame) + 1) / 2;

        let rgb = "249, 115, 22"; // Orange
        if (p.colorType > 0.4) rgb = "168, 85, 247"; // Purple
        if (p.colorType > 0.8) rgb = "34, 211, 238"; // Cyan

        ctx.beginPath();
        ctx.arc(x, y, 1.2 + depth * 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb}, ${0.1 + depth * 0.8})`;
        if (i % 20 === 0) {
            ctx.shadowBlur = 12;
            ctx.shadowColor = `rgb(${rgb})`;
        } else { ctx.shadowBlur = 0; }
        ctx.fill();
      });
      requestAnimationFrame(animate);
    }
    const animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [activeTab, mounted]);

  // --- BRAIN: VOICE CORE ---
  const speak = useCallback((text: string) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.pitch = 0.75; u.rate = 0.85; // Your specific Jarvis pitch
    u.onstart = () => setState("SPEAKING");
    u.onend = () => {
      if (micOnRef.current) {
        setState("LISTENING");
        try { recognitionRef.current?.start(); } catch {}
      } else setState("IDLE");
    };
    window.speechSynthesis.speak(u);
  }, []);

  const toggleMic = () => {
    if (micOnRef.current) {
      setMicOn(false); setState("IDLE");
      addLog("Microphone Disconnected.");
      try { recognitionRef.current?.stop(); } catch {}
    } else {
      const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      if (!recognitionRef.current) {
        recognitionRef.current = new SR();
        recognitionRef.current.continuous = true;
        recognitionRef.current.onresult = (e: any) => {
          const res = e.results[e.results.length - 1][0].transcript;
          addLog(`INPUT: ${res}`);
          setResponse(`Analyzing: "${res}"`);
          // Put your API fetch here
        };
      }
      setMicOn(true); setState("LISTENING");
      addLog("Listening for user input...");
      try { recognitionRef.current?.start(); } catch {}
    }
  };

  if (!mounted || !isLoaded) return null;

  return (
    <main className="min-h-screen bg-[#010409] text-[#7d8590] font-sans flex flex-col overflow-hidden">
      
      {/* 1. TOP NAV BAR (IMAGE MATCH) */}
      <nav className="h-14 px-8 flex items-center justify-between bg-[#010409] border-b border-white/[0.03]">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border border-cyan-500/40 rounded flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-[0_0_8px_cyan]" />
          </div>
          <span className="text-[11px] font-bold tracking-[0.3em] text-white uppercase italic">Jarvis<span className="text-cyan-500 font-light">OS</span></span>
        </div>

        <div className="flex gap-10 text-[9px] tracking-[0.4em] uppercase font-black">
          {['Core', 'Home', 'Memory', 'Logs'].map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab === 'Core' ? 'VOICE' : tab.toUpperCase() as ActiveTab)}
              className={`${(activeTab === tab.toUpperCase() || (tab==='Core' && activeTab==='VOICE')) ? 'text-cyan-400 border-b border-cyan-400' : 'hover:text-white'} pb-1 transition-all`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/5 border border-cyan-500/10">
            <div className="w-1 h-1 bg-cyan-400 rounded-full animate-pulse" />
            <span className="text-[8px] text-cyan-400 font-bold uppercase tracking-tighter">Neural Active</span>
          </div>
          <SignedIn><UserButton afterSignOutUrl="/" /></SignedIn>
          <SignedOut><SignInButton mode="modal"><button className="text-[9px] bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 rounded text-cyan-400 hover:bg-cyan-500/20">LOG IN</button></SignInButton></SignedOut>
        </div>
      </nav>

      {/* 2. DASHBOARD GRID */}
      {!isActive ? (
        <div className="flex-1 flex items-center justify-center bg-[radial-gradient(circle_at_center,_#0a1120_0%,_#010409_100%)]">
          <button onClick={() => { setIsActive(true); speak("System initialized."); addLog("OS Boot sequence complete."); }} className="px-12 py-4 border border-cyan-500/30 text-cyan-400 text-[10px] tracking-[0.6em] uppercase hover:bg-cyan-500/5 transition-all">Initialize OS</button>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-[280px_1fr_280px] bg-[#010409]">
          
          {/* LEFT PANEL: NAVIGATION & HOME */}
          <aside className="p-6 border-r border-white/[0.02] flex flex-col gap-10 bg-[#010409]">
            <section>
              <p className="text-[8px] text-slate-600 uppercase tracking-[0.4em] mb-4">Navigation</p>
              <div className="space-y-2">
                {[
                  { id: "VOICE", label: "Voice Core", icon: "◎" },
                  { id: "DASHBOARD", label: "Dashboard", icon: "⊞" },
                  { id: "MEMORY", label: "Memory", icon: "≡" },
                  { id: "SETTINGS", label: "Settings", icon: "⚙" }
                ].map((item) => (
                  <button key={item.id} onClick={() => setActiveTab(item.id as ActiveTab)}
                    className={`w-full flex items-center gap-3 p-3 rounded-md text-[9px] tracking-widest transition-all ${activeTab === item.id ? 'bg-[#0d1117] border border-cyan-500/20 text-cyan-400 shadow-lg' : 'hover:bg-white/[0.02] text-slate-500'}`}>
                    <span className="text-xs">{item.icon}</span> {item.label.toUpperCase()}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <p className="text-[8px] text-slate-600 uppercase tracking-[0.4em] mb-4">Smart Home</p>
              <div className="space-y-2">
                {Object.entries(devices).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between p-3 rounded-md bg-[#0d1117] border border-white/[0.03]">
                    <span className="text-[9px] uppercase tracking-widest text-slate-400">{key}</span>
                    <button onClick={() => { setDevices(d => ({...d, [key]: !val})); addLog(`Smart Home: ${key} ${!val ? 'Enabled' : 'Disabled'}`); }} className={`w-8 h-4 rounded-full relative transition-all ${val ? 'bg-cyan-600' : 'bg-slate-800'}`}>
                      <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${val ? 'left-4.5' : 'left-0.5'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </aside>

          {/* CENTER PANEL: THE VIEWPORT */}
          <main className="relative flex flex-col items-center justify-center bg-[radial-gradient(circle_at_center,_#0d1425_0%,_#010409_75%)]">
            
            {/* 1. THE ORB VIEW */}
            {activeTab === "VOICE" && (
              <>
                <div className="absolute top-10 flex flex-col items-center gap-1">
                  <div className="px-4 py-1 rounded-full border border-cyan-500/20 bg-cyan-950/20 text-cyan-400 text-[9px] tracking-[0.3em] uppercase font-bold">
                    {state} <span className="opacity-30 ml-2">282MS</span>
                  </div>
                </div>

                <div className="relative w-[450px] h-[450px] flex items-center justify-center">
                  <div className="absolute inset-0 border border-white/[0.03] rounded-full" />
                  <div className="absolute inset-10 border border-white/[0.01] rounded-full" />
                  <canvas ref={canvasRef} width={500} height={500} className="relative z-10" />
                </div>

                {/* Waveform Visualization */}
                <div className="mt-4 flex gap-1 h-6 items-center">
                  {[...Array(11)].map((_, i) => (
                    <div key={i} className={`w-0.5 bg-cyan-500/50 rounded-full transition-all duration-150 ${state==='LISTENING'?'animate-pulse':'h-1'}`} style={{height: state==='LISTENING' ? `${4 + Math.random()*16}px` : '3px'}} />
                  ))}
                </div>

                <div className="mt-8 w-full max-w-lg px-6">
                  <div className="p-5 rounded-xl bg-[#0d1117] border border-white/[0.03] text-center shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <p className="text-[11px] text-slate-300 font-light italic leading-relaxed tracking-wide relative z-10">
                      {response}
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* 2. THE DASHBOARD VIEW */}
            {activeTab === "DASHBOARD" && (
              <div className="w-full h-full p-12 grid grid-cols-2 grid-rows-2 gap-6 animate-in fade-in zoom-in duration-500">
                {[
                  {l: 'NEURAL CAPACITY', v: '78%', c: 'text-cyan-400'},
                  {l: 'MEMORY INDEX', v: '1.2 TB', c: 'text-purple-400'},
                  {l: 'API LATENCY', v: '24ms', c: 'text-emerald-400'},
                  {l: 'ACTIVE NODES', v: '14,204', c: 'text-orange-400'}
                ].map(box => (
                  <div key={box.l} className="bg-[#0d1117] border border-white/[0.03] rounded-2xl flex flex-col items-center justify-center p-6 hover:border-white/10 transition-all">
                    <span className="text-[8px] tracking-[0.4em] text-slate-500 mb-4 uppercase">{box.l}</span>
                    <span className={`text-4xl font-light ${box.c}`}>{box.v}</span>
                  </div>
                ))}
              </div>
            )}

            {/* 3. THE MEMORY VIEW */}
            {activeTab === "MEMORY" && (
              <div className="w-full h-full p-16 animate-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-white text-[10px] tracking-[0.5em] uppercase mb-10 border-b border-white/5 pb-4">Personal Knowledge Graph</h2>
                <div className="grid grid-cols-1 gap-4 overflow-y-auto max-h-[60vh] pr-4 custom-scrollbar">
                  {["System Preferences", "User Profile", "Recent Locations", "Scheduled Events", "Voice Print"].map(item => (
                    <div key={item} className="p-5 bg-[#0d1117] rounded-lg border border-white/[0.02] flex justify-between items-center hover:bg-cyan-500/5 cursor-pointer transition-all">
                      <span className="text-[10px] text-slate-400 tracking-widest uppercase">{item}</span>
                      <span className="text-cyan-400 text-[10px]">SYNCED</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SHARED CONTROLS (ALWAYS VISIBLE) */}
            <div className="absolute bottom-10 flex gap-12">
              <div className="flex flex-col items-center gap-2">
                <button onClick={toggleMic} className={`w-14 h-14 rounded-full border flex items-center justify-center transition-all ${micOn ? 'border-cyan-400 bg-cyan-500/10 shadow-[0_0_20px_rgba(6,182,212,0.3)]' : 'border-white/10 bg-white/5 hover:border-white/20'}`}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={micOn ? '#22d3ee' : '#475569'} strokeWidth="1.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 19v4M8 23h8"/></svg>
                </button>
                <span className="text-[8px] uppercase tracking-[0.3em] font-black text-cyan-400">{micOn ? 'Mic Active' : 'Mic Off'}</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <button onClick={() => setIsActive(false)} className="w-14 h-14 rounded-full border border-red-500/20 bg-red-500/5 flex items-center justify-center hover:bg-red-500/10 transition-all">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5"><path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10"/></svg>
                </button>
                <span className="text-[8px] uppercase tracking-[0.3em] font-black text-red-500">Shutdown</span>
              </div>
            </div>
          </main>

          {/* RIGHT PANEL: SYSTEM & LOGS */}
          <aside className="p-6 border-l border-white/[0.02] flex flex-col gap-10 bg-[#010409]">
            <section>
              <p className="text-[8px] text-slate-600 uppercase tracking-[0.4em] mb-4">System Stats</p>
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
              <p className="text-[8px] text-slate-600 uppercase tracking-[0.4em] mb-4">
                {user?.firstName ? `${user.firstName}'s Memory` : 'Accessing Memory...'}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {['Keyur', 'likes coding', 'prefers cold', 'night owl', 'lights off 11pm'].map(tag => (
                  <span key={tag} className="px-2 py-1 bg-cyan-500/5 border border-cyan-500/10 rounded text-[8px] text-cyan-400/70 tracking-tighter transition-colors hover:bg-cyan-500/10 hover:text-cyan-400 cursor-default">
                    • {tag}
                  </span>
                ))}
              </div>
            </section>

            <section className="flex-1 flex flex-col min-h-0">
              <p className="text-[8px] text-slate-600 uppercase tracking-[0.4em] mb-4">Live Activity Stream</p>
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {log.map((l, i) => (
                  <div key={i} className="text-[9px] border-l border-cyan-500/30 pl-3 py-1 animate-in slide-in-from-left duration-300">
                    <p className="text-slate-500 text-[7px] mb-1">{l.time}</p>
                    <p className="text-slate-300 italic leading-relaxed">{l.msg}</p>
                  </div>
                ))}
                {log.length === 0 && <p className="text-[8px] text-slate-800 italic uppercase tracking-widest">Awaiting system ping...</p>}
              </div>
            </section>
          </aside>
        </div>
      )}

      {/* GLOBAL STYLES FOR THE LOG SCROLLBAR */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
      `}</style>
    </main>
  );
}
