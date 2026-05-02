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
  const [response, setResponse] = useState("System online. Awaiting your command.");
  const [log, setLog] = useState<{time: string, msg: string}[]>([]);
  const [mounted, setMounted] = useState(false);
  
  const [devices, setDevices] = useState<Record<string, boolean>>({
    "Living Rm": true, "Bedroom Fan": true, "Front Door": false,
    "AC Unit": false, "Speaker": true, "Kitchen Lights": false, "Garage Door": false
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recognitionRef = useRef<any>(null);
  const stateRef = useRef<JarvisState>("IDLE");
  const micOnRef = useRef(false);
  const historyRef = useRef<{role: string, content: string}[]>([]);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { micOnRef.current = micOn; }, [micOn]);

  const addLog = (msg: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour12: false });
    setLog(prev => [{time: timeStr, msg}, ...prev].slice(0, 15));
  };

  // --- ORB ENGINE ---
  useEffect(() => {
    if (!canvasRef.current || !isActive) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    const particles = Array.from({ length: 2000 }, () => ({
      theta: Math.random() * Math.PI * 2,
      phi: Math.acos((Math.random() * 2) - 1),
      speedMult: 0.4 + Math.random() * 1.2,
      size: 0.5 + Math.random() * 2.5
    }));

    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let rotSpeed = 0.008;
      let turbulence = 0.2;
      let baseRadius = activeTab === "DASHBOARD" ? 240 : 135; 
      
      if (stateRef.current === "THINKING") rotSpeed = 0.07;
      frame += rotSpeed;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      particles.forEach((p, i) => {
        const pFrame = frame * p.speedMult;
        const wobble = 1 + Math.sin(pFrame * 2 + p.phi * 4) * turbulence;
        const r = baseRadius * wobble;
        const x = centerX + r * Math.sin(p.phi) * Math.cos(p.theta + frame);
        const y = centerY + r * Math.cos(p.phi);
        const depth = (Math.sin(p.theta + frame) + 1) / 2;

        let rgb = "255, 0, 120"; // Hot Pink
        if (i % 4 === 0) rgb = "150, 0, 255"; 
        ctx.beginPath();
        ctx.arc(x, y, (0.5 + depth * 3) * (p.size/2), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb}, ${0.1 + depth * 0.85})`;
        ctx.fill();
      });
      requestAnimationFrame(animate);
    }
    const animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [isActive, mounted, activeTab]);

  const speak = useCallback((text: string) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.onstart = () => setState("SPEAKING");
    u.onend = () => setState("IDLE");
    window.speechSynthesis.speak(u);
  }, []);

  const toggleMic = () => { /* ... Mic Logic Same as previous ... */ };

  if (!mounted || !isLoaded) return null;

  return (
    <main className="fixed inset-0 bg-[#010409] text-[#7d8590] flex flex-col overflow-hidden font-sans">
      
      {/* GHOST EXIT BUTTON (Only shows in Dashboard) */}
      <button 
        onClick={() => setActiveTab("VOICE")}
        className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-2 border border-pink-500/20 bg-black/40 backdrop-blur-md rounded-full text-[10px] tracking-[0.4em] uppercase text-pink-500/60 hover:text-pink-400 hover:border-pink-500/50 transition-all duration-500 ${activeTab === 'DASHBOARD' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        Back to Core
      </button>

      {/* NAV BAR */}
      <nav className={`h-14 px-8 flex items-center justify-between border-b border-white/[0.03] z-50 transition-all duration-700 ${activeTab === 'DASHBOARD' ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}>
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border border-pink-500/40 rounded flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-pink-500 rounded-full shadow-[0_0_8px_#ff1493]" />
          </div>
          <span className="text-[11px] font-bold tracking-[0.3em] text-white uppercase italic">Jarvis<span className="text-pink-500 font-light">OS</span></span>
        </div>

        <div className="flex gap-10 text-[9px] tracking-[0.4em] uppercase font-black">
          {['Core', 'Dashboard', 'Memory', 'Settings'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab === 'Core' ? 'VOICE' : tab.toUpperCase() as ActiveTab)}
              className={`${(activeTab === tab.toUpperCase() || (tab==='Core' && activeTab==='VOICE')) ? 'text-pink-500 border-b border-pink-500' : 'hover:text-white'} pb-1 transition-all`}>
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <SignedIn><UserButton afterSignOutUrl="/" /></SignedIn>
          {/* RESTORED LOGIN BUTTON */}
          <SignedOut>
            <SignInButton mode="modal">
              <button className="text-[9px] tracking-widest uppercase border border-white/10 px-4 py-1.5 rounded hover:bg-white/5 transition-all">Login</button>
            </SignInButton>
          </SignedOut>
        </div>
      </nav>

      {!isActive ? (
        <div className="flex-1 flex items-center justify-center">
          <button onClick={() => { setIsActive(true); speak("System initialized."); }} 
            className="px-12 py-4 border border-pink-500/30 text-pink-400 text-[10px] tracking-[0.6em] uppercase hover:bg-pink-500/5 transition-all">
            Initialize OS
          </button>
        </div>
      ) : (
        <div className="flex-1 relative flex overflow-hidden">
          
          {/* LEFT PANEL */}
          <aside className={`w-[300px] p-6 border-r border-white/[0.02] flex flex-col gap-8 transition-all duration-700 ${activeTab === 'DASHBOARD' ? '-translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}>
             <p className="text-[8px] text-slate-600 uppercase tracking-[0.4em]">Home Control</p>
             {/* ... Device mapping logic ... */}
          </aside>

          {/* MAIN VIEWPORT */}
          <main className="flex-1 relative flex flex-col items-center justify-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#0d1425_0%,_#010409_80%)]" />
            <div className={`relative transition-all duration-1000 ${activeTab === 'DASHBOARD' ? 'scale-150' : 'scale-100'}`}>
                <canvas ref={canvasRef} width={900} height={900} className="relative z-10 w-[700px] h-[700px]" />
            </div>
          </main>

          {/* RIGHT PANEL */}
          <aside className={`w-[300px] p-6 border-l border-white/[0.02] transition-all duration-700 ${activeTab === 'DASHBOARD' ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}>
             <p className="text-[8px] text-slate-600 uppercase tracking-[0.4em]">Activity</p>
             {/* ... Log mapping logic ... */}
          </aside>
        </div>
      )}
    </main>
  );
}
