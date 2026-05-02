"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { UserButton, SignedIn, SignedOut, SignInButton, useUser } from "@clerk/nextjs";

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

  // --- BRAIN: VOICE CORE ---
  const speak = useCallback((text: string) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.pitch = 0.75; u.rate = 0.85; 
    u.onstart = () => setState("SPEAKING");
    u.onend = () => {
      if (micOnRef.current) {
        setState("LISTENING");
        try { recognitionRef.current?.start(); } catch {}
      } else setState("IDLE");
    };
    window.speechSynthesis.speak(u);
  }, []);

  // --- BRAIN: API UPLINK ---
  const askJarvis = useCallback(async (input: string) => {
    if (!input.trim()) return;
    setState("THINKING");
    addLog(`UPLINK: ${input.toUpperCase()}`);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: input, 
          history: historyRef.current, 
          memory: { user: user?.firstName || "Guest", preferences: "Cold, Night Owl" } 
        }),
      });

      const data = await res.json();
      
      if (res.ok) {
        setResponse(data.reply);
        addLog(`JARVIS: ${data.reply}`);
        historyRef.current = [
          ...historyRef.current, 
          { role: "user", content: input }, 
          { role: "assistant", content: data.reply }
        ].slice(-10);
        speak(data.reply);
      } else {
        throw new Error();
      }
    } catch (error) {
      setState("IDLE");
      setResponse("Neural link severed. Groq API unreachable.");
      addLog("SYSTEM ERROR: API TIMEOUT");
    }
  }, [user, speak]);

  const toggleMic = () => {
    if (micOnRef.current) {
      setMicOn(false); setState("IDLE");
      addLog("Microphone Disconnected.");
      try { recognitionRef.current?.stop(); } catch {}
    } else {
      const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      if (!recognitionRef.current && SR) {
        recognitionRef.current = new SR();
        recognitionRef.current.continuous = true;
        recognitionRef.current.onresult = (e: any) => {
          const res = e.results[e.results.length - 1][0].transcript;
          recognitionRef.current?.stop(); // Stop while thinking/speaking
          askJarvis(res);
        };
      }
      setMicOn(true); setState("LISTENING");
      addLog("Listening for user input...");
      try { recognitionRef.current?.start(); } catch {}
    }
  };

  // --- ORB ENGINE ---
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
        let rgb = "249, 115, 22"; if (p.colorType > 0.4) rgb = "168, 85, 247"; if (p.colorType > 0.8) rgb = "34, 211, 238";
        ctx.beginPath(); ctx.arc(x, y, 1.2 + depth * 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb}, ${0.1 + depth * 0.8})`;
        if (i % 20 === 0) { ctx.shadowBlur = 12; ctx.shadowColor = `rgb(${rgb})`; } else { ctx.shadowBlur = 0; }
        ctx.fill();
      });
      requestAnimationFrame(animate);
    }
    const animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [activeTab, mounted]);

  if (!mounted || !isLoaded) return null;

  return (
    <main className="min-h-screen bg-[#010409] text-[#7d8590] font-sans flex flex-col overflow-hidden">
      <nav className="h-14 px-8 flex items-center justify-between bg-[#010409] border-b border-white/[0.03]">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border border-cyan-500/40 rounded flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-[0_0_8px_cyan]" />
          </div>
          <span className="text-[11px] font-bold tracking-[0.3em] text-white uppercase italic">Jarvis<span className="text-cyan-500 font-light">OS</span></span>
        </div>
        <div className="flex gap-10 text-[9px] tracking-[0.4em] uppercase font-black">
          {['Core', 'Home', 'Memory', 'Logs'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab === 'Core' ? 'VOICE' : tab.toUpperCase() as ActiveTab)}
              className={`${(activeTab === tab.toUpperCase() || (tab==='Core' && activeTab==='VOICE')) ? 'text-cyan-400 border-b border-cyan-400' : 'hover:text-white'} pb-1 transition-all`}>
              {tab}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <SignedIn><UserButton afterSignOutUrl="/" /></SignedIn>
          <SignedOut><SignInButton mode="modal"><button className="text-[9px] bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 rounded text-cyan-400 uppercase">Login</button></SignInButton></SignedOut>
        </div>
      </nav>

      {!isActive ? (
        <div className="flex-1 flex items-center justify-center bg-[radial-gradient(circle_at_center,_#0a1120_0%,_#010409_100%)]">
          <button onClick={() => { setIsActive(true); speak("System initialized."); addLog("OS Boot sequence complete."); }} className="px-12 py-4 border border-cyan-500/30 text-cyan-400 text-[10px] tracking-[0.6em] uppercase hover:bg-cyan-500/5 transition-all">Initialize OS</button>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-[280px_1fr_280px] bg-[#010409]">
          <aside className="p-6 border-r border-white/[0.02] flex flex-col gap-10 bg-[#010409]">
            <section>
              <p className="text-[8px] text-slate-600 uppercase tracking-[0.4em] mb-4">Navigation</p>
              <div className="space-y-2">
                {[{ id: "VOICE", label: "Voice Core", icon: "◎" }, { id: "DASHBOARD", label: "Dashboard", icon: "⊞" }, { id: "MEMORY", label: "Memory", icon: "≡" }].map((item) => (
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

          <main className="relative flex flex-col items-center justify-center bg-[radial-gradient(circle_at_center,_#0d1425_0%,_#010409_75%)]">
            {activeTab === "VOICE" && (
              <>
                <div className="absolute top-10 flex flex-col items-center gap-1">
                  <div className="px-4 py-1 rounded-full border border-cyan-500/20 bg-cyan-950/20 text-cyan-400 text-[9px] tracking-[0.3em] uppercase font-bold">
                    {state} <span className="opacity-30 ml-2">282MS</span>
                  </div>
                </div>
                <div className="relative w-[450px] h-[450px] flex items-center justify-center">
                  <canvas ref={canvasRef} width={500} height={500} className="relative z-10" />
                </div>
                <div className="mt-8 w-full max-w-lg px-6">
                  <div className="p-5 rounded-xl bg-[#0d1117] border border-white/[0.03] text-center shadow-2xl relative overflow-hidden group">
                    <p className="text-[11px] text-slate-300 font-light italic leading-relaxed tracking-wide relative z-10">{response}</p>
                  </div>
                </div>
              </>
            )}
            <div className="absolute bottom-10 flex gap-12">
              <button onClick={toggleMic} className={`w-14 h-14 rounded-full border flex items-center justify-center transition-all ${micOn ? 'border-cyan-400 bg-cyan-500/10' : 'border-white/10 bg-white/5'}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={micOn ? '#22d3ee' : '#475569'} strokeWidth="1.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 19v4M8 23h8"/></svg>
              </button>
              <button onClick={() => setIsActive(false)} className="w-14 h-14 rounded-full border border-red-500/20 bg-red-500/5 flex items-center justify-center"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5"><path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10"/></svg></button>
            </div>
          </main>

          <aside className="p-6 border-l border-white/[0.02] flex flex-col gap-10 bg-[#010409]">
             <p className="text-[8px] text-slate-600 uppercase tracking-[0.4em] mb-4">Live Activity Stream</p>
             <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {log.map((l, i) => (
                  <div key={i} className="text-[9px] border-l border-cyan-500/30 pl-3 py-1">
                    <p className="text-slate-500 text-[7px] mb-1">{l.time}</p>
                    <p className="text-slate-300 italic leading-relaxed">{l.msg}</p>
                  </div>
                ))}
              </div>
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
