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
  const [response, setResponse] = useState("System online. Awaiting your command.");
  const [log, setLog] = useState<{time: string, msg: string}[]>([]);
  const [mounted, setMounted] = useState(false);
  
  // --- RESTORED: FULL BRAIN STATE ---
  const [devices, setDevices] = useState<Record<string, boolean>>({
    "Living Rm": true,
    "Bedroom Fan": true,
    "Front Door": false,
    "AC Unit": false,
    "Speaker": true,
    "Kitchen Lights": false,
    "Garage Door": false
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
    const timeStr = now.getHours().toString().padStart(2, '0') + ":" + 
                    now.getMinutes().toString().padStart(2, '0') + ":" + 
                    now.getSeconds().toString().padStart(2, '0');
    setLog(prev => [{time: timeStr, msg}, ...prev].slice(0, 15));
  };

  // --- BRAIN: DEVICE LOGIC ---
  const processDeviceCommand = (text: string) => {
    const lowerText = text.toLowerCase();
    const newDevices = { ...devices };
    let changed = false;

    if (lowerText.includes("light") || lowerText.includes("living rm")) {
      if (lowerText.includes("on")) { newDevices["Living Rm"] = true; changed = true; }
      if (lowerText.includes("off")) { newDevices["Living Rm"] = false; changed = true; }
    }
    if (lowerText.includes("fan")) {
      if (lowerText.includes("on")) { newDevices["Bedroom Fan"] = true; changed = true; }
      if (lowerText.includes("off")) { newDevices["Bedroom Fan"] = false; changed = true; }
    }
    if (lowerText.includes("door")) {
      if (lowerText.includes("open") || lowerText.includes("unlock")) { newDevices["Front Door"] = true; changed = true; }
      if (lowerText.includes("close") || lowerText.includes("lock")) { newDevices["Front Door"] = false; changed = true; }
    }

    if (changed) {
      setDevices(newDevices);
      addLog("Hardware override executed.");
    }
  };

  // --- ENGINE: THE MAJESTIC ORB (PINK/PURPLE PLASMA) ---
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
      
      if (stateRef.current === "THINKING") { rotSpeed = 0.07; turbulence = 0.65; }
      if (stateRef.current === "SPEAKING") { rotSpeed = 0.03; turbulence = 0.35; }
      if (stateRef.current === "LISTENING") { rotSpeed = 0.02; turbulence = 0.5; }
      
      frame += rotSpeed;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Inner Core Glow
      const coreGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, baseRadius);
      coreGrad.addColorStop(0, "rgba(255, 20, 147, 0.1)");
      coreGrad.addColorStop(1, "transparent");
      ctx.fillStyle = coreGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, i) => {
        const pFrame = frame * p.speedMult;
        const wobble = 1 + Math.sin(pFrame * 2 + p.phi * 4) * turbulence;
        const r = baseRadius * wobble;
        
        const x = centerX + r * Math.sin(p.phi) * Math.cos(p.theta + frame);
        const y = centerY + r * Math.cos(p.phi);
        const depth = (Math.sin(p.theta + frame) + 1) / 2;

        let rgb = "255, 0, 120"; // Hot Pink
        if (i % 4 === 0) rgb = "150, 0, 255"; // Deep Purple
        if (i % 12 === 0) rgb = "255, 255, 255"; // Pure Light

        ctx.beginPath();
        ctx.arc(x, y, (0.5 + depth * 3) * (p.size/2), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb}, ${0.1 + depth * 0.85})`;
        
        if (i % 50 === 0) {
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
  }, [isActive, mounted, activeTab]);

  const speak = useCallback((text: string) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.pitch = 0.8; u.rate = 0.85; 
    u.onstart = () => setState("SPEAKING");
    u.onend = () => {
      if (micOnRef.current) {
        setState("LISTENING");
        try { recognitionRef.current?.start(); } catch {}
      } else setState("IDLE");
    };
    window.speechSynthesis.speak(u);
  }, []);

  const askJarvis = useCallback(async (input: string) => {
    if (!input.trim()) return;
    setState("THINKING");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, history: historyRef.current, userName: user?.firstName || "Sir" }),
      });
      const data = await res.json();
      if (res.ok) {
        setResponse(data.reply);
        addLog(`JARVIS: ${data.reply}`);
        processDeviceCommand(data.reply);
        historyRef.current = [...historyRef.current, { role: "user", content: input }, { role: "assistant", content: data.reply }].slice(-10);
        speak(data.reply);
      }
    } catch (e) { setState("IDLE"); setResponse("Neural link Severed."); }
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
    <main className="fixed inset-0 bg-[#010409] text-[#7d8590] font-sans flex flex-col overflow-hidden">
      
      {/* 1. NAV BAR - VANISHES ON DASHBOARD */}
      <nav className={`h-14 px-8 flex items-center justify-between bg-[#010409] border-b border-white/[0.03] z-50 transition-all duration-700 ease-in-out ${activeTab === 'DASHBOARD' ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}>
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
        </div>
      </nav>

      {!isActive ? (
        <div className="flex-1 flex items-center justify-center bg-[radial-gradient(circle_at_center,_#0a1120_0%,_#010409_100%)]">
          <button onClick={() => { setIsActive(true); speak("System initialized."); addLog("OS Boot sequence complete."); }} 
            className="px-12 py-4 border border-pink-500/30 text-pink-400 text-[10px] tracking-[0.6em] uppercase hover:bg-pink-500/5 transition-all shadow-[0_0_50px_rgba(255,20,147,0.1)]">
            Initialize OS
          </button>
        </div>
      ) : (
        <div className="flex-1 relative flex overflow-hidden bg-[#010409]">
          
          {/* LEFT PANEL - VANISHES ON DASHBOARD */}
          <aside className={`w-[300px] p-6 border-r border-white/[0.02] flex flex-col gap-8 bg-[#010409] z-20 transition-all duration-700 ease-in-out ${activeTab === 'DASHBOARD' ? '-translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}>
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
                    className={`w-full flex items-center gap-3 p-3 rounded-md text-[9px] tracking-widest transition-all ${activeTab === item.id ? 'bg-pink-500/10 border border-pink-500/20 text-pink-500' : 'hover:bg-white/[0.02] text-slate-500'}`}>
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
                    <button onClick={() => setDevices(d => ({...d, [key]: !val}))} className={`w-8 h-4 rounded-full relative transition-all ${val ? 'bg-pink-600' : 'bg-slate-800'}`}>
                      <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${val ? 'left-4.5' : 'left-0.5'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </aside>

          {/* MAIN VIEWPORT - THE ORB (LOCKED CENTER) */}
          <main className="flex-1 relative flex flex-col items-center justify-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#0d1425_0%,_#010409_80%)]" />
            
            <div className="relative z-10 flex flex-col items-center justify-center w-full h-full">
                
                {/* THE ORB - Scaled up for Dashboard */}
                <div className={`relative transition-all duration-1000 ease-in-out ${activeTab === 'DASHBOARD' ? 'scale-150' : 'scale-100'}`}>
                    <div className={`absolute inset-0 border border-white/[0.02] rounded-full scale-125 transition-opacity duration-1000 ${activeTab === 'DASHBOARD' ? 'opacity-0' : 'opacity-100'}`} />
                    <canvas ref={canvasRef} width={900} height={900} className="relative z-10 w-[700px] h-[700px]" />
                </div>

                {/* AI RESPONSE - VANISHES ON DASHBOARD */}
                <div className={`absolute bottom-32 w-full max-w-xl px-6 transition-all duration-500 ease-in-out ${activeTab === 'VOICE' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
                    <div className="p-6 rounded-2xl bg-[#0d1117]/80 border border-white/[0.05] backdrop-blur-xl shadow-2xl text-center">
                        <p className="text-[12px] text-slate-200 font-light italic leading-relaxed tracking-wide">{response}</p>
                    </div>
                </div>
            </div>

            {/* CONTROLS - VANISH ON DASHBOARD */}
            <div className={`absolute bottom-10 flex gap-12 z-30 transition-all duration-700 ${activeTab === 'DASHBOARD' ? 'opacity-0 translate-y-20' : 'opacity-100 translate-y-0'}`}>
              <button onClick={toggleMic} className={`w-16 h-16 rounded-full border flex items-center justify-center transition-all ${micOn ? 'border-pink-500 bg-pink-500/10 shadow-[0_0_30px_#ff1493]' : 'border-white/10 bg-white/5 hover:border-white/20'}`}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={micOn ? '#ff1493' : '#475569'} strokeWidth="1.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 19v4M8 23h8"/></svg>
              </button>
              <button onClick={() => setIsActive(false)} className="w-16 h-16 rounded-full border border-red-500/20 bg-red-500/5 flex items-center justify-center hover:bg-red-500/20 transition-all">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5"><path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10"/></svg>
              </button>
            </div>
          </main>

          {/* RIGHT PANEL - VANISHES ON DASHBOARD */}
          <aside className={`w-[300px] p-6 border-l border-white/[0.02] flex flex-col gap-10 bg-[#010409] z-20 transition-all duration-700 ease-in-out ${activeTab === 'DASHBOARD' ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}>
            <section>
              <p className="text-[8px] text-slate-600 uppercase tracking-[0.4em] mb-4">Memory Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {['Keyur', 'Developer', 'Likes Pink', 'Jarvis Admin', 'System Owner'].map(tag => (
                  <span key={tag} className="px-2 py-1 bg-pink-500/5 border border-pink-500/10 rounded text-[8px] text-pink-400/70 hover:text-pink-400 transition-colors cursor-default">
                    • {tag}
                  </span>
                ))}
              </div>
            </section>

            <section className="flex-1 flex flex-col min-h-0">
              <p className="text-[8px] text-slate-600 uppercase tracking-[0.4em] mb-4">Activity Stream</p>
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {log.map((l, i) => (
                  <div key={i} className="text-[9px] border-l border-pink-500/30 pl-3 py-1">
                    <p className="text-slate-500 text-[7px] mb-1">{l.time}</p>
                    <p className="text-slate-300 italic leading-relaxed">{l.msg}</p>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
      `}</style>
    </main>
  );
}
