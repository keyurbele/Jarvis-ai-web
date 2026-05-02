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
  
  // --- FULL SMART HOME STATE ---
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

  // --- BRAIN: SMART DEVICE ROUTER (UNTOUCHED) ---
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

  // --- ORB ENGINE: STABILIZED ---
  useEffect(() => {
    if (!canvasRef.current || !isActive) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    const particles = Array.from({ length: 1100 }, () => ({
      theta: Math.random() * Math.PI * 2,
      phi: Math.acos((Math.random() * 2) - 1),
      colorType: Math.random()
    }));

    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      let rotSpeed = 0.012;
      let turbulence = 0.15;
      
      if (stateRef.current === "THINKING") { rotSpeed = 0.08; turbulence = 0.6; }
      if (stateRef.current === "SPEAKING") { rotSpeed = 0.035; turbulence = 0.3; }
      if (stateRef.current === "LISTENING") { rotSpeed = 0.02; turbulence = 0.45; }
      
      frame += rotSpeed;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const baseRadius = stateRef.current === "LISTENING" ? 145 : 130;

      particles.forEach((p, i) => {
        const time = frame + i * 0.003;
        const wobble = 1 + Math.sin(time * 2.8 + p.phi * 4) * turbulence;
        const r = baseRadius * wobble;
        const x = centerX + r * Math.sin(p.phi) * Math.cos(p.theta + frame);
        const y = centerY + r * Math.cos(p.phi);
        const depth = (Math.sin(p.theta + frame) + 1) / 2;

        let rgb = "34, 211, 238";
        if (p.colorType > 0.4) rgb = "168, 85, 247";
        if (p.colorType > 0.8) rgb = "249, 115, 22";

        ctx.beginPath();
        ctx.arc(x, y, 0.8 + depth * 2.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb}, ${0.15 + depth * 0.75})`;
        if (i % 25 === 0) { ctx.shadowBlur = 15; ctx.shadowColor = `rgb(${rgb})`; }
        else { ctx.shadowBlur = 0; }
        ctx.fill();
      });
      requestAnimationFrame(animate);
    }
    const animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [isActive, mounted]); // Removed activeTab dependency so Orb stays alive during transitions

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
      
      {/* 1. TOP NAV BAR */}
      <nav className="h-14 px-8 flex items-center justify-between bg-[#010409] border-b border-white/[0.03] z-50">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border border-cyan-500/40 rounded flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-[0_0_8px_cyan]" />
          </div>
          <span className="text-[11px] font-bold tracking-[0.3em] text-white uppercase italic">Jarvis<span className="text-cyan-500 font-light">OS</span></span>
        </div>

        <div className="flex gap-10 text-[9px] tracking-[0.4em] uppercase font-black">
          {['Core', 'Dashboard', 'Memory', 'Settings'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab === 'Core' ? 'VOICE' : tab.toUpperCase() as ActiveTab)}
              className={`${(activeTab === tab.toUpperCase() || (tab==='Core' && activeTab==='VOICE')) ? 'text-cyan-400 border-b border-cyan-400' : 'hover:text-white'} pb-1 transition-all`}>
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <SignedIn><UserButton afterSignOutUrl="/" /></SignedIn>
        </div>
      </nav>

      {!isActive ? (
        <div className="flex-1 flex items-center justify-center">
          <button onClick={() => { setIsActive(true); speak("System initialized."); addLog("OS Boot sequence complete."); }} 
            className="px-12 py-4 border border-cyan-500/30 text-cyan-400 text-[10px] tracking-[0.6em] uppercase hover:bg-cyan-500/5 transition-all">
            Initialize OS
          </button>
        </div>
      ) : (
        <div className="flex-1 relative flex overflow-hidden bg-[#010409]">
          
          {/* LEFT PANEL - Sliding Transition */}
          <aside className={`w-[300px] p-6 border-r border-white/[0.02] flex flex-col gap-8 bg-[#010409] z-20 transition-all duration-700 ease-in-out ${activeTab === 'DASHBOARD' ? '-translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}>
            <section>
              <p className="text-[8px] text-slate-600 uppercase tracking-[0.4em] mb-4">Navigation</p>
              <div className="space-y-2">
                {[{ id: "VOICE", label: "Voice Core", icon: "◎" }, { id: "DASHBOARD", label: "Dashboard", icon: "⊞" }, { id: "MEMORY", label: "Memory", icon: "≡" }].map((item) => (
                  <button key={item.id} onClick={() => setActiveTab(item.id as ActiveTab)} className={`w-full flex items-center gap-3 p-3 rounded-md text-[9px] tracking-widest transition-all ${activeTab === item.id ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-500'}`}>
                    {item.label.toUpperCase()}
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
                    <div className={`w-2 h-2 rounded-full ${val ? 'bg-cyan-400' : 'bg-slate-800'}`} />
                  </div>
                ))}
              </div>
            </section>
          </aside>

          {/* MAIN VIEWPORT - THE ORB (ALWAYS CENTERED) */}
          <main className="flex-1 relative flex flex-col items-center justify-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#0d1425_0%,_#010409_80%)]" />
            
            <div className="relative z-10 flex flex-col items-center justify-center w-full h-full">
                
                {/* Dashboard Stats Overlay */}
                <div className={`absolute inset-0 grid grid-cols-2 grid-rows-2 p-20 gap-x-[400px] gap-y-20 transition-all duration-1000 ${activeTab === 'DASHBOARD' ? 'opacity-100 scale-100' : 'opacity-0 scale-110 pointer-events-none'}`}>
                    {[
                      {l: 'Neural Load', v: '12%'}, {l: 'Sync Latency', v: '24ms'},
                      {l: 'Power Cells', v: '98%'}, {l: 'Active Buffers', v: '1,024'}
                    ].map((s, i) => (
                      <div key={i} className="flex flex-col items-center justify-center p-8 border border-cyan-500/10 bg-cyan-500/[0.02] rounded-3xl backdrop-blur-md">
                        <span className="text-[8px] text-slate-500 uppercase tracking-[0.3em] mb-2">{s.l}</span>
                        <span className="text-4xl font-extralight text-cyan-400">{s.v}</span>
                      </div>
                    ))}
                </div>

                {/* THE ORB */}
                <div className="relative w-[500px] h-[500px] flex items-center justify-center">
                    <canvas ref={canvasRef} width={600} height={600} className="relative z-10 w-full h-full" />
                </div>

                {/* Voice Response (Hidden in Dashboard) */}
                <div className={`absolute bottom-32 w-full max-w-xl px-6 transition-all duration-500 ${activeTab === 'VOICE' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
                    <div className="p-6 rounded-2xl bg-[#0d1117]/80 border border-white/[0.05] backdrop-blur-xl text-center">
                        <p className="text-[12px] text-slate-200 font-light italic leading-relaxed">{response}</p>
                    </div>
                </div>
            </div>

            {/* SHARED CONTROLS */}
            <div className="absolute bottom-10 flex gap-12 z-30 transition-opacity duration-500">
              <button onClick={toggleMic} className={`w-14 h-14 rounded-full border flex items-center justify-center transition-all ${micOn ? 'border-cyan-400 bg-cyan-500/10' : 'border-white/10 bg-white/5'}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={micOn ? '#22d3ee' : '#475569'} strokeWidth="1.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 19v4M8 23h8"/></svg>
              </button>
            </div>
          </main>

          {/* RIGHT PANEL - Sliding Transition */}
          <aside className={`w-[300px] p-6 border-l border-white/[0.02] flex flex-col gap-10 bg-[#010409] z-20 transition-all duration-700 ease-in-out ${activeTab === 'DASHBOARD' ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}>
            <section className="flex-1 flex flex-col min-h-0">
              <p className="text-[8px] text-slate-600 uppercase tracking-[0.4em] mb-4">Activity Stream</p>
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {log.map((l, i) => (
                  <div key={i} className="text-[9px] border-l border-cyan-500/30 pl-3 py-1 animate-in slide-in-from-left duration-300">
                    <p className="text-slate-500 text-[7px] mb-1">{l.time}</p>
                    <p className="text-slate-300 italic">{l.msg}</p>
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
