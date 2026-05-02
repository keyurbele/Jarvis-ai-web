"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { 
  UserButton, 
  SignedIn, 
  SignedOut, 
  SignInButton, 
  useUser 
} from "@clerk/nextjs";

// --- SYSTEM TYPES ---
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
  
  // --- FULL HARDWARE ARCHITECTURE (RESTORED) ---
  const [devices, setDevices] = useState<Record<string, boolean>>({
    "Living Rm Lights": true,
    "Bedroom Fan": true,
    "Front Door Lock": false,
    "Main AC Unit": false,
    "Audio Speaker": true,
    "Kitchen Lights": false,
    "Garage Door": false,
    "Security Cameras": true,
    "Garden Sprinklers": false,
    "Study Lamp": true,
    "Hallway Heat": false,
    "Balcony Lights": false,
    "Smart Blinds": true,
    "Pool Heater": false,
    "Basement Dehumidifier": false
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recognitionRef = useRef<any>(null);
  const stateRef = useRef<JarvisState>("IDLE");
  const micOnRef = useRef(false);
  const historyRef = useRef<{role: string, content: string}[]>([]);

  useEffect(() => { 
    setMounted(true); 
  }, []);

  useEffect(() => { 
    stateRef.current = state; 
  }, [state]);

  useEffect(() => { 
    micOnRef.current = micOn; 
  }, [micOn]);

  const addLog = (msg: string) => {
    const now = new Date();
    const timeStr = now.getHours().toString().padStart(2, '0') + ":" + 
                    now.getMinutes().toString().padStart(2, '0') + ":" + 
                    now.getSeconds().toString().padStart(2, '0');
    setLog(prev => [{time: timeStr, msg}, ...prev].slice(0, 25));
  };

  // --- HARDWARE COMMAND PROCESSOR ---
  const processDeviceCommand = (text: string) => {
    const lowerText = text.toLowerCase();
    const newDevices = { ...devices };
    let changed = false;

    if (lowerText.includes("light")) {
      newDevices["Living Rm Lights"] = lowerText.includes("on");
      newDevices["Kitchen Lights"] = lowerText.includes("on");
      changed = true;
    }
    if (lowerText.includes("fan")) {
      newDevices["Bedroom Fan"] = lowerText.includes("on");
      changed = true;
    }
    if (lowerText.includes("door") || lowerText.includes("lock")) {
      newDevices["Front Door Lock"] = lowerText.includes("unlock") || lowerText.includes("open");
      changed = true;
    }
    if (lowerText.includes("ac") || lowerText.includes("air conditioning")) {
      newDevices["Main AC Unit"] = lowerText.includes("on");
      changed = true;
    }

    if (changed) {
      setDevices(newDevices);
      addLog("Hardware protocol updated via Voice Interface.");
    }
  };

  // --- ENGINE: THE MAJESTIC ORB (PINK/PURPLE HIGH-DENSITY) ---
  useEffect(() => {
    if (!canvasRef.current || !isActive) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    // High-density particle system for "Magnificent" look
    const particles = Array.from({ length: 2400 }, () => ({
      theta: Math.random() * Math.PI * 2,
      phi: Math.acos((Math.random() * 2) - 1),
      speedMult: 0.4 + Math.random() * 1.3,
      size: 0.8 + Math.random() * 3.0,
      opacityMult: 0.2 + Math.random() * 0.8
    }));

    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      let rotSpeed = 0.007;
      let turbulence = 0.22;
      const baseRadius = 165; // Fixed radius to allow 0.5s CSS scaling
      
      if (stateRef.current === "THINKING") {
        rotSpeed = 0.085;
        turbulence = 0.85;
      } else if (stateRef.current === "SPEAKING") {
        rotSpeed = 0.038;
        turbulence = 0.45;
      } else if (stateRef.current === "LISTENING") {
        rotSpeed = 0.02;
        turbulence = 0.55;
      }
      
      frame += rotSpeed;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      particles.forEach((p, i) => {
        const pFrame = frame * p.speedMult;
        const wobble = 1 + Math.sin(pFrame * 2.2 + p.phi * 4.5) * turbulence;
        const r = baseRadius * wobble;
        
        const x = centerX + r * Math.sin(p.phi) * Math.cos(p.theta + frame);
        const y = centerY + r * Math.cos(p.phi);
        const depth = (Math.sin(p.theta + frame) + 1) / 2;

        // Color Palette from uploaded Majestic Orb
        let rgb = "255, 20, 147"; // Deep Pink
        if (i % 6 === 0) rgb = "147, 51, 234"; // Purple
        if (i % 18 === 0) rgb = "255, 255, 255"; // Flare White
        if (i % 30 === 0) rgb = "0, 240, 255"; // Cyan Accent

        ctx.beginPath();
        ctx.arc(x, y, (0.4 + depth * 4.0) * (p.size / 2), 0, Math.PI * 2);
        
        const alpha = (0.1 + depth * 0.8) * p.opacityMult;
        ctx.fillStyle = `rgba(${rgb}, ${alpha})`;
        
        if (i % 45 === 0) {
          ctx.shadowBlur = 22;
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
  }, [isActive, mounted]);

  const speak = useCallback((text: string) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.pitch = 0.88;
    u.rate = 0.92;
    u.onstart = () => setState("SPEAKING");
    u.onend = () => {
      if (micOnRef.current) {
        setState("LISTENING");
        try { recognitionRef.current?.start(); } catch (err) {}
      } else {
        setState("IDLE");
      }
    };
    window.speechSynthesis.speak(u);
  }, []);

  const askJarvis = useCallback(async (input: string) => {
    if (!input.trim()) return;
    setState("THINKING");
    addLog(`User: ${input}`);
    
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: input, 
          history: historyRef.current, 
          userName: user?.firstName || "Sir" 
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResponse(data.reply);
        addLog(`JARVIS: ${data.reply}`);
        processDeviceCommand(data.reply);
        historyRef.current = [
          ...historyRef.current, 
          { role: "user", content: input }, 
          { role: "assistant", content: data.reply }
        ].slice(-12);
        speak(data.reply);
      }
    } catch (error) {
      setState("IDLE");
      setResponse("Connection to neural core failed.");
      addLog("Error: API Link Interrupted.");
    }
  }, [user, speak, devices]);

  const toggleMic = () => {
    if (micOnRef.current) {
      setMicOn(false);
      setState("IDLE");
      try { recognitionRef.current?.stop(); } catch (err) {}
    } else {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      if (!recognitionRef.current && SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[event.results.length - 1][0].transcript;
          recognitionRef.current?.stop();
          askJarvis(transcript);
        };
      }
      setMicOn(true);
      setState("LISTENING");
      try { recognitionRef.current?.start(); } catch (err) {}
    }
  };

  if (!mounted || !isLoaded) return null;

  return (
    <main className="fixed inset-0 bg-[#010409] text-[#7d8590] flex flex-col overflow-hidden font-sans select-none">
      
      {/* --- DASHBOARD MODE ESCAPE --- */}
      <button 
        onClick={() => setActiveTab("VOICE")}
        className={`fixed top-10 left-1/2 -translate-x-1/2 z-[100] px-10 py-3 border border-pink-500/30 bg-black/60 backdrop-blur-2xl rounded-full text-[10px] tracking-[0.6em] uppercase text-pink-500 shadow-[0_0_30px_rgba(255,20,147,0.1)] transition-all duration-700 ${
          activeTab === 'DASHBOARD' ? 'opacity-100 scale-100' : 'opacity-0 scale-50 pointer-events-none'
        }`}
      >
        Exit Zen Mode
      </button>

      {/* --- HEADER NAVIGATION --- */}
      <nav className={`h-20 px-12 flex items-center justify-between border-b border-white/[0.03] bg-[#010409]/80 backdrop-blur-md z-50 transition-all duration-500 ${
        activeTab === 'DASHBOARD' ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'
      }`}>
        <div className="flex items-center gap-5">
          <div className="w-7 h-7 border border-pink-500/40 rounded-lg flex items-center justify-center">
            <div className="w-2.5 h-2.5 bg-pink-500 rounded-full shadow-[0_0_15px_#ff1493]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[12px] font-bold tracking-[0.5em] text-white uppercase italic leading-none">Jarvis<span className="text-pink-500 font-light">OS</span></span>
            <span className="text-[7px] tracking-[0.2em] text-slate-500 uppercase mt-1">Neural Interface v4.2.0</span>
          </div>
        </div>

        <div className="flex gap-14 text-[10px] tracking-[0.4em] uppercase font-black">
          {['Voice', 'Dashboard', 'Memory', 'Settings'].map(tabName => (
            <button 
              key={tabName} 
              onClick={() => setActiveTab(tabName.toUpperCase() as ActiveTab)}
              className={`relative pb-2 transition-all ${
                activeTab === tabName.toUpperCase() ? 'text-pink-500' : 'hover:text-white text-slate-500'
              }`}
            >
              {tabName}
              {activeTab === tabName.toUpperCase() && (
                <span className="absolute bottom-0 left-0 w-full h-[1px] bg-pink-500 shadow-[0_0_8px_#ff1493]" />
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-8">
          <SignedIn>
            <div className="flex items-center gap-4">
              <span className="text-[9px] tracking-widest text-slate-500 uppercase">Admin: {user?.firstName}</span>
              <UserButton afterSignOutUrl="/" />
            </div>
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="text-[10px] tracking-[0.3em] uppercase border border-pink-500/30 text-pink-400 px-6 py-2.5 rounded-md hover:bg-pink-500/10 hover:border-pink-500 transition-all">
                Authorize
              </button>
            </SignInButton>
          </SignedOut>
        </div>
      </nav>

      {!isActive ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_center,_#0a1120_0%,_#010409_100%)]">
          <div className="w-24 h-24 mb-12 border border-pink-500/20 rounded-full flex items-center justify-center animate-pulse">
            <div className="w-16 h-16 border border-pink-500/40 rounded-full flex items-center justify-center">
              <div className="w-8 h-8 bg-pink-500 rounded-full shadow-[0_0_30px_#ff1493]" />
            </div>
          </div>
          <button 
            onClick={() => { setIsActive(true); speak("System online. Neural core ready."); addLog("Interface Initialized."); }} 
            className="px-20 py-6 border border-pink-500/30 text-pink-400 text-[12px] tracking-[0.8em] uppercase hover:bg-pink-500/10 transition-all shadow-[0_0_60px_rgba(255,20,147,0.1)] active:scale-95"
          >
            Initialize Core
          </button>
        </div>
      ) : (
        <div className="flex-1 relative flex overflow-hidden">
          
          {/* --- LEFT: HARDWARE CONTROL PANEL --- */}
          <aside className={`w-[340px] p-10 border-r border-white/[0.02] flex flex-col gap-12 bg-[#010409] z-20 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${
            activeTab === 'DASHBOARD' ? '-translate-x-full opacity-0' : 'translate-x-0 opacity-100'
          }`}>
            <section>
              <div className="flex items-center justify-between mb-8">
                <p className="text-[9px] text-slate-600 uppercase tracking-[0.5em]">Home Network</p>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
              </div>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {Object.entries(devices).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between p-5 rounded-2xl bg-[#0d1117] border border-white/[0.05] hover:border-pink-500/20 transition-all group">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400 group-hover:text-slate-200">{key}</span>
                    <button 
                      onClick={() => {
                        const next = !val;
                        setDevices(prev => ({...prev, [key]: next}));
                        addLog(`Manual override: ${key} set to ${next ? 'ON' : 'OFF'}`);
                      }}
                      className={`w-12 h-6 rounded-full relative transition-all duration-300 ${val ? 'bg-pink-600' : 'bg-slate-800'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg transition-all duration-300 ${val ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </aside>

          {/* --- CENTER: THE MAJESTIC ORB VIEWPORT --- */}
          <main className="flex-1 relative flex flex-col items-center justify-center">
            {/* Background Atmosphere */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#0d1425_0%,_#010409_85%)] transition-opacity duration-1000" />
            
            {/* 0.5s FAST ORB SCALING */}
            <div className={`relative transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
              activeTab === 'DASHBOARD' ? 'scale-[1.85]' : 'scale-100'
            }`}>
              {/* Subtle Outer Rings (Hidden in Dashboard) */}
              <div className={`absolute inset-0 border border-white/[0.03] rounded-full -m-10 transition-opacity duration-700 ${activeTab === 'DASHBOARD' ? 'opacity-0' : 'opacity-100'}`} />
              <div className={`absolute inset-0 border border-pink-500/[0.02] rounded-full -m-20 transition-opacity duration-700 ${activeTab === 'DASHBOARD' ? 'opacity-0' : 'opacity-100'}`} />
              
              <canvas 
                ref={canvasRef} 
                width={1000} 
                height={1000} 
                className="w-[750px] h-[750px] relative z-10 filter drop-shadow-[0_0_50px_rgba(255,20,147,0.15)]" 
              />
            </div>
            
            {/* AI RESPONSE MODULE */}
            <div className={`absolute bottom-40 w-full max-w-2xl px-10 transition-all duration-700 ${
              activeTab === 'VOICE' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'
            }`}>
              <div className="p-10 rounded-[40px] bg-[#0d1117]/80 border border-white/[0.08] backdrop-blur-3xl shadow-[0_30px_100px_rgba(0,0,0,0.5)] text-center">
                <p className="text-[15px] text-slate-200 font-light italic leading-relaxed tracking-wide selection:bg-pink-500/30">
                  {response}
                </p>
              </div>
            </div>

            {/* MAIN MIC INTERFACE */}
            <div className={`absolute bottom-16 transition-all duration-700 ${
              activeTab === 'DASHBOARD' ? 'opacity-0 translate-y-24' : 'opacity-100 translate-y-0'
            }`}>
              <button 
                onClick={toggleMic} 
                className={`w-24 h-24 rounded-full border flex items-center justify-center transition-all duration-500 group ${
                  micOn 
                    ? 'border-pink-500 bg-pink-500/20 shadow-[0_0_60px_#ff1493]' 
                    : 'border-white/10 bg-white/5 hover:border-pink-500/40 hover:bg-pink-500/5'
                }`}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={micOn ? '#ff1493' : '#64748b'} strokeWidth="1.5" className="transition-colors group-hover:stroke-pink-400">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 19v4M8 23h8"/>
                </svg>
              </button>
            </div>
          </main>

          {/* --- RIGHT: NEURAL LOGS & MEMORY --- */}
          <aside className={`w-[340px] p-10 border-l border-white/[0.02] flex flex-col gap-14 bg-[#010409] z-20 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${
            activeTab === 'DASHBOARD' ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'
          }`}>
            <section>
              <p className="text-[9px] text-slate-600 uppercase tracking-[0.5em] mb-8">Neural Context</p>
              <div className="flex flex-wrap gap-2.5">
                {[
                  'Identity: Keyur', 
                  'Privilege: Root', 
                  'OS: Majestic v4', 
                  'Mode: Active', 
                  'Encryption: 4096-bit',
                  'Neural: Synced',
                  'Hardware: 15 Nodes'
                ].map(tag => (
                  <span key={tag} className="px-4 py-2 bg-pink-500/5 border border-pink-500/10 rounded-xl text-[9px] text-pink-400/70 hover:text-pink-400 transition-colors cursor-default">
                    {tag}
                  </span>
                ))}
              </div>
            </section>
            
            <section className="flex-1 min-h-0 flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <p className="text-[9px] text-slate-600 uppercase tracking-[0.5em]">System Log</p>
                <span className="text-[8px] text-slate-500 font-mono">LIVE FEED</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-5 pr-3 custom-scrollbar">
                {log.map((entry, index) => (
                  <div key={index} className="text-[11px] border-l-2 border-pink-500/30 pl-5 py-1 animate-in fade-in slide-in-from-left-2 duration-500">
                    <p className="text-slate-600 text-[8px] mb-1 font-mono uppercase">{entry.time} — SYSTEM_EVENT</p>
                    <p className="text-slate-300 italic font-light leading-relaxed">{entry.msg}</p>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #ff1493; }
        
        @keyframes orbit-pulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.05); opacity: 1; }
        }
      `}</style>
    </main>
  );
}
