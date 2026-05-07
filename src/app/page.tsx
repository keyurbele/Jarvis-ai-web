"use client";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { UserButton, SignedIn, SignedOut, SignInButton, useUser } from "@clerk/nextjs";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

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
  
  const [dbMemories, setDbMemories] = useState<any[]>([]);
  const [jarvisName, setJarvisName] = useState("Jarvis");
  const [userHandle, setUserHandle] = useState("Sir");

  const [devices, setDevices] = useState<Record<string, boolean>>({
    "Living Rm Lights": true, "Bedroom Fan": true, "Front Door Lock": false,
    "Main AC Unit": false, "Audio Speaker": true, "Kitchen Lights": false, "Garage Door": false
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recognitionRef = useRef<any>(null);
  const stateRef = useRef<JarvisState>("IDLE");
  const micOnRef = useRef(false);
  const historyRef = useRef<{role: string, content: string}[]>([]);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { micOnRef.current = micOn; }, [micOn]);

  // Handle Tab-Specific Data Fetching & Settings Sync
  useEffect(() => {
    if (!user) return;

    const syncSystem = async () => {
      if (activeTab === "SETTINGS" || activeTab === "VOICE") {
        const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (data) {
          setJarvisName(data.jarvis_name || "Jarvis");
          setUserHandle(data.user_handle || "Sir");
        }
      }
      if (activeTab === "MEMORY") {
        fetchMemories();
      }
    };

    syncSystem();
  }, [activeTab, user]);

  const fetchMemories = async () => {
    const { data } = await supabase
      .from("memories")
      .select("*")
      .eq("user_id", user?.id)
      .eq("is_hidden", false)
      .order("created_at", { ascending: false });
    if (data) setDbMemories(data);
  };

  const hideMemory = async (id: string) => {
    await supabase.from("memories").update({ is_hidden: true }).eq("id", id);
    setDbMemories(prev => prev.filter(m => m.id !== id));
    addLog("SYSTEM: Neural record archived.");
  };

  const saveSettings = async () => {
    if (user) {
      const { error } = await supabase.from("profiles").upsert({ 
        id: user.id, 
        jarvis_name: jarvisName, 
        user_handle: userHandle,
        updated_at: new Date().toISOString()
      });
      if (!error) {
        addLog(`SYSTEM: Identity updated to ${jarvisName}.`);
        speak("Settings updated, " + userHandle);
        setActiveTab("VOICE");
      }
    }
  };

  const addLog = (msg: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour12: false });
    setLog(prev => [{time: timeStr, msg}, ...prev].slice(0, 20));
  };

  const particles = useMemo(() => {
    return Array.from({ length: 2200 }, () => ({
      theta: Math.random() * Math.PI * 2,
      phi: Math.acos((Math.random() * 2) - 1),
      speedMult: 0.6 + Math.random() * 1.0,
      size: 0.5 + Math.random() * 2.5
    }));
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !isActive) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let frame = 0;
    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const rotSpeed = 0.008; const turbulence = 0.15;
      const baseRadius = activeTab === "DASHBOARD" ? 240 : 135;
      frame += rotSpeed;
      const centerX = canvas.width / 2; const centerY = canvas.height / 2;
      particles.forEach((p, i) => {
        const pFrame = frame * p.speedMult;
        const wobble = 1 + Math.sin(pFrame * 2 + p.phi * 4) * turbulence;
        const r = baseRadius * wobble;
        const currentTheta = p.theta + frame;
        const x = centerX + r * Math.sin(p.phi) * Math.cos(currentTheta);
        const y = centerY + r * Math.cos(p.phi);
        const depth = (Math.sin(currentTheta) + 1) / 2;
        let rgb = "255, 20, 147"; if (i % 5 === 0) rgb = "168, 85, 247"; if (i % 15 === 0) rgb = "255, 255, 255";
        ctx.beginPath();
        ctx.arc(x, y, (0.4 + depth * 3.5) * (p.size/2), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb}, ${0.1 + depth * 0.8})`;
        if (i % 60 === 0) { ctx.shadowBlur = 15; ctx.shadowColor = `rgb(${rgb})`; } else { ctx.shadowBlur = 0; }
        ctx.fill();
      });
      requestAnimationFrame(animate);
    }
    const animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [isActive, mounted, activeTab, particles]);

  const speak = useCallback((text: string) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.pitch = 0.85; u.rate = 0.9;
    u.onstart = () => setState("SPEAKING"); u.onend = () => setState("IDLE");
    window.speechSynthesis.speak(u);
  }, []);

  const askJarvis = useCallback(async (input: string) => {
    if (!input.trim()) return;
    setState("THINKING");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            message: input, 
            history: historyRef.current, 
            userName: userHandle, 
            jarvisName: jarvisName 
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResponse(data.reply);
        addLog(`${jarvisName.toUpperCase()}: ${data.reply}`);
        historyRef.current = [...historyRef.current, { role: "user", content: input }, { role: "assistant", content: data.reply }].slice(-10);
        speak(data.reply);
      }
    } catch (e) { setState("IDLE"); }
  }, [userHandle, jarvisName, speak]);

  const toggleMic = () => {
    if (micOnRef.current) { 
      setMicOn(false); 
      setState("IDLE"); 
      try { recognitionRef.current?.stop(); } catch {} 
    }
    else {
      const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      if (SR) {
        if (!recognitionRef.current) {
          recognitionRef.current = new SR();
          recognitionRef.current.continuous = true;
          recognitionRef.current.interimResults = false;
        }
        
        recognitionRef.current.onresult = (e: any) => { 
          const transcript = e.results[e.results.length - 1][0].transcript;
          if (transcript.trim()) {
            addLog(`USER: ${transcript}`);
            askJarvis(transcript); 
          }
        };

        setMicOn(true); 
        setState("LISTENING");
        try { recognitionRef.current.start(); } catch {}
      }
    }
  };

  if (!mounted || !isLoaded) return null;

  return (
    <main className="fixed inset-0 bg-[#010409] text-[#7d8590] flex flex-col overflow-hidden font-sans">
      
      {/* Return Button */}
      <button onClick={() => setActiveTab("VOICE")} className={`fixed top-8 left-1/2 -translate-x-1/2 z-[100] px-8 py-2 border border-pink-500/30 bg-black/60 backdrop-blur-xl rounded-full text-[9px] tracking-[0.5em] uppercase text-pink-500 transition-all duration-700 ${activeTab !== 'VOICE' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        Return to Core
      </button>

      {/* Nav Bar */}
      <nav className={`h-16 px-10 flex items-center justify-between border-b border-white/[0.03] bg-[#010409] z-50 transition-all duration-700 ${activeTab === 'DASHBOARD' ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}>
        <div className="flex items-center gap-4">
          <div className="w-6 h-6 border border-pink-500/40 rounded flex items-center justify-center">
            <div className="w-2 h-2 bg-pink-500 rounded-full shadow-[0_0_10px_#ff1493]" />
          </div>
          <span className="text-xs font-bold tracking-[0.4em] text-white uppercase italic">{jarvisName}<span className="text-pink-500 font-light">OS</span></span>
        </div>
        <div className="flex gap-12 text-[10px] tracking-[0.3em] uppercase font-bold">
          {['Voice', 'Dashboard', 'Memory', 'Settings'].map(t => (
            <button key={t} onClick={() => setActiveTab(t.toUpperCase() as ActiveTab)} className={`${activeTab === t.toUpperCase() ? 'text-pink-500 border-b border-pink-500' : 'hover:text-white'} pb-1 transition-all`}>{t}</button>
          ))}
        </div>
        <div className="flex items-center gap-6">
          <SignedIn><UserButton afterSignOutUrl="/" /></SignedIn>
          <SignedOut><SignInButton mode="modal"><button className="text-[10px] tracking-widest uppercase border border-white/10 px-5 py-2 rounded hover:bg-white/5">Authorize</button></SignInButton></SignedOut>
        </div>
      </nav>

      {!isActive ? (
        <div className="flex-1 flex items-center justify-center bg-[radial-gradient(circle_at_center,_#0a1120_0%,_#010409_100%)]">
          <button onClick={() => { setIsActive(true); speak("System initialized."); }} className="px-16 py-5 border border-pink-500/30 text-pink-400 text-[11px] tracking-[0.7em] uppercase hover:bg-pink-500/10 transition-all shadow-[0_0_60px_rgba(255,20,147,0.1)]">Initialize Core</button>
        </div>
      ) : (
        <div className="flex-1 relative flex overflow-hidden">
          
          {/* TAB: VOICE & DASHBOARD */}
          <div className={`flex-1 flex transition-all duration-700 ${activeTab === 'MEMORY' || activeTab === 'SETTINGS' ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>
            <aside className={`w-[320px] p-8 border-r border-white/[0.02] flex flex-col gap-10 bg-[#010409] z-20 transition-all duration-700 ease-in-out ${activeTab === 'DASHBOARD' ? '-translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}>
                <p className="text-[9px] text-slate-600 uppercase tracking-[0.4em] mb-6">Hardware Network</p>
                <div className="space-y-3">
                {Object.entries(devices).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between p-4 rounded-xl bg-[#0d1117] border border-white/[0.04]">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400">{key}</span>
                    <div onClick={() => setDevices(prev => ({...prev, [key]: !val}))} className={`w-10 h-5 rounded-full relative cursor-pointer transition-all ${val ? 'bg-pink-600' : 'bg-slate-800'}`}>
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${val ? 'left-6' : 'left-1'}`} />
                    </div>
                    </div>
                ))}
                </div>
            </aside>

            <main className="flex-1 relative flex flex-col items-center justify-center">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#0d1425_0%,_#010409_85%)]" />
                <div className={`relative transition-all duration-1000 z-10 flex items-center justify-center ${activeTab === 'DASHBOARD' ? 'scale-125 translate-y-0' : 'scale-100 -translate-y-20'}`}>
                    <canvas ref={canvasRef} width={800} height={800} className="relative w-[600px] h-[600px] max-w-full max-h-full" />
                </div>
                <div className={`absolute bottom-40 w-full max-w-2xl px-8 transition-all duration-700 z-20 ${activeTab === 'VOICE' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
                    <div className="p-8 rounded-3xl bg-[#0d1117]/90 border border-white/[0.08] backdrop-blur-3xl shadow-2xl text-center">
                        <p className="text-[14px] text-slate-200 font-light italic leading-relaxed">{response}</p>
                    </div>
                </div>
                <div className={`absolute bottom-12 transition-all duration-700 z-30 ${activeTab === 'DASHBOARD' ? 'opacity-0 translate-y-20' : 'opacity-100 translate-y-0'}`}>
                <button onClick={toggleMic} className={`w-20 h-20 rounded-full border flex items-center justify-center transition-all ${micOn ? 'border-pink-500 bg-pink-500/10 shadow-[0_0_40px_#ff1493]' : 'border-white/10 bg-white/5 hover:border-white/20'}`}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={micOn ? '#ff1493' : '#475569'} strokeWidth="1.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 19v4M8 23h8"/></svg>
                </button>
                </div>
            </main>

            <aside className={`w-[320px] p-8 border-l border-white/[0.02] flex flex-col gap-12 bg-[#010409] z-20 transition-all duration-700 ease-in-out ${activeTab === 'DASHBOARD' ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}>
                <section>
                <p className="text-[9px] text-slate-600 uppercase tracking-[0.4em] mb-6">Neural Memory</p>
                <div className="flex flex-wrap gap-2">
                    {[`User: ${userHandle}`, 'Access: Admin', `UI: Majestic`, 'Node: Primary'].map(tag => (
                    <span key={tag} className="px-3 py-1.5 bg-pink-500/5 border border-pink-500/10 rounded-lg text-[9px] text-pink-400/80">{tag}</span>
                    ))}
                </div>
                </section>
                <section className="flex-1 min-h-0 flex flex-col">
                <p className="text-[9px] text-slate-600 uppercase tracking-[0.4em] mb-6">System Logs</p>
                <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                    {log.map((l, i) => (
                    <div key={i} className="text-[10px] border-l-2 border-pink-500/20 pl-4 py-1">
                        <p className="text-slate-500 text-[8px] mb-1 font-mono">{l.time}</p>
                        <p className="text-slate-300 italic">{l.msg}</p>
                    </div>
                    ))}
                </div>
                </section>
            </aside>
          </div>

          {/* TAB: MEMORY (Updated Logic) */}
          <AnimatePresence>
            {activeTab === "MEMORY" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#010409] z-[60] flex flex-col items-center p-20 overflow-y-auto custom-scrollbar">
                <h1 className="text-white text-xs tracking-[1em] uppercase mb-20 opacity-50">Memory Archive</h1>
                <div className="w-full max-w-xl space-y-4">
                  {dbMemories.map((m) => (
                    <motion.div 
                      key={m.id} 
                      drag="x" 
                      dragConstraints={{ left: -100, right: 0 }}
                      onDragEnd={(_, info) => info.offset.x < -50 && hideMemory(m.id)}
                      className="p-6 bg-[#0d1117] border border-white/[0.05] rounded-2xl cursor-grab active:cursor-grabbing flex justify-between items-center group"
                    >
                      <div className="flex flex-col gap-1">
                        <p className="text-sm text-slate-300 font-light">{m.content}</p>
                        <p className="text-[8px] text-slate-600 font-mono">{new Date(m.created_at).toLocaleString()}</p>
                      </div>
                      <span className="text-[8px] uppercase tracking-widest text-slate-600 group-hover:text-pink-500 transition-colors">Swipe to hide</span>
                    </motion.div>
                  ))}
                  {dbMemories.length === 0 && <p className="text-center text-[10px] tracking-widest uppercase opacity-20">No memories stored</p>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* TAB: SETTINGS (Updated Logic) */}
          <AnimatePresence>
            {activeTab === "SETTINGS" && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="absolute inset-0 bg-[#010409] z-[60] flex flex-col items-center justify-center p-20">
                    <div className="w-full max-w-md space-y-12">
                        <section>
                            <p className="text-[9px] text-pink-500 uppercase tracking-[0.5em] mb-8">System Identity</p>
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase tracking-widest text-slate-500">AI Designation</label>
                                    <input value={jarvisName} onChange={(e) => setJarvisName(e.target.value)} className="w-full bg-white/[0.02] border border-white/10 rounded-lg p-4 text-white text-sm outline-none focus:border-pink-500/50 transition-all" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase tracking-widest text-slate-500">User Handle</label>
                                    <input value={userHandle} onChange={(e) => setUserHandle(e.target.value)} className="w-full bg-white/[0.02] border border-white/10 rounded-lg p-4 text-white text-sm outline-none focus:border-pink-500/50 transition-all" />
                                </div>
                            </div>
                        </section>
                        <button onClick={saveSettings} className="w-full py-4 bg-pink-600 text-white text-[10px] tracking-[0.4em] uppercase rounded-lg hover:bg-pink-500 transition-all">Apply Configuration</button>
                    </div>
                </motion.div>
            )}
          </AnimatePresence>

        </div>
      )}
    </main>
  );
}
