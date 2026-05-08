="use client";
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
  
  // Persistence & Identity States
  const [dbMemories, setDbMemories] = useState<any[]>([]);
  const [hiddenMemories, setHiddenMemories] = useState<any[]>([]);
  const [jarvisName, setJarvisName] = useState("Jarvis");
  const [userHandle, setUserHandle] = useState("Sir");
  const [showHidden, setShowHidden] = useState(false);
  const [unlockInput, setUnlockInput] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Hardware State
  const [devices, setDevices] = useState<Record<string, boolean>>({
    "Living Rm Lights": true, "Bedroom Fan": true, "Front Door Lock": false,
    "Main AC Unit": false, "Audio Speaker": true, "Kitchen Lights": false, "Garage Door": false
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recognitionRef = useRef<any>(null);
  const micOnRef = useRef(false);
  const historyRef = useRef<{role: string, content: string}[]>([]);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { micOnRef.current = micOn; }, [micOn]);

  // --- DATABASE SYNC ---
  const refreshData = useCallback(async () => {
    if (!user) return;
    try {
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (prof) { 
        setJarvisName(prof.jarvis_name || "Jarvis"); 
        setUserHandle(prof.user_handle || "Sir"); 
      }
      
      const { data: act } = await supabase.from("memories").select("*").eq("user_id", user.id).eq("is_hidden", false).order("created_at", { ascending: false });
      const { data: hid } = await supabase.from("memories").select("*").eq("user_id", user.id).eq("is_hidden", true).order("created_at", { ascending: false });
      
      if (act) setDbMemories(act);
      if (hid) setHiddenMemories(hid);
    } catch (err) {
      console.error("Data Sync Error:", err);
    }
  }, [user]);

  useEffect(() => { if (user) refreshData(); }, [user, activeTab, refreshData]);

  const addLog = (msg: string) => {
    const timeStr = new Date().toLocaleTimeString([], { hour12: false });
    setLog(prev => [{time: timeStr, msg}, ...prev].slice(0, 25));
  };

  const saveSettings = async () => {
    if (user) {
      await supabase.from("profiles").upsert({ id: user.id, jarvis_name: jarvisName, user_handle: userHandle });
      addLog("SYSTEM: Neural identity updated.");
      setActiveTab("VOICE");
    }
  };

  // --- THE MAJESTIC ORB ENGINE (2200 PARTICLES) ---
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
      
      const rotSpeed = 0.008; 
      const turbulence = 0.15;
      const baseRadius = activeTab === "DASHBOARD" ? 240 : 135;
      frame += rotSpeed;
      
      const centerX = canvas.width / 2; 
      const centerY = canvas.height / 2;

      particles.forEach((p, i) => {
        const pFrame = frame * p.speedMult;
        const wobble = 1 + Math.sin(pFrame * 2 + p.phi * 4) * turbulence;
        const r = baseRadius * wobble;
        
        const currentTheta = p.theta + frame;
        const x = centerX + r * Math.sin(p.phi) * Math.cos(currentTheta);
        const y = centerY + r * Math.cos(p.phi);
        
        const depth = (Math.sin(currentTheta) + 1) / 2;
        
        let rgb = "255, 20, 147"; // Pink
        if (i % 5 === 0) rgb = "168, 85, 247"; // Purple
        if (i % 15 === 0) rgb = "255, 255, 255"; // White spark
        
        ctx.beginPath();
        ctx.arc(x, y, (0.4 + depth * 3.5) * (p.size/2), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb}, ${0.1 + depth * 0.8})`;
        
        if (i % 60 === 0) {
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
  }, [isActive, mounted, activeTab, particles]);

  const speak = useCallback((text: string) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.pitch = 0.85; 
    u.rate = 0.95;
    u.onstart = () => setState("SPEAKING"); 
    u.onend = () => setState("IDLE");
    window.speechSynthesis.speak(u);
  }, []);

  // --- JARVIS AI CORE ---
  const askJarvis = useCallback(async (input: string) => {
    if (!input.trim() || !user) return;
    setState("THINKING");
    addLog(`USER: ${input}`);

    // Automatic Memory Logic: Detect facts (names, likes, locations)
    const personalMarkers = ["my", "name", "remember", "she", "he", "lives", "is", "gf", "girlfriend"];
    if (personalMarkers.some(m => input.toLowerCase().includes(m))) {
      await supabase.from("memories").insert({ 
        user_id: user.id, 
        content: input, 
        is_hidden: false 
      });
      refreshData();
      addLog("SYSTEM: Personal data archived to Neural Bank.");
    }

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
      
      if (data && data.reply) {
        setResponse(data.reply);
        addLog(`${jarvisName.toUpperCase()}: ${data.reply}`);
        historyRef.current = [...historyRef.current, { role: "user", content: input }, { role: "assistant", content: data.reply }].slice(-12);
        speak(data.reply);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (e) {
      console.error("Jarvis Reply Error:", e);
      setResponse("I'm having trouble connecting to my core processors. One moment.");
      setState("IDLE");
    }
  }, [user, userHandle, jarvisName, speak, refreshData]);

  const toggleMic = () => {
    if (micOnRef.current) { 
      setMicOn(false); 
      setState("IDLE"); 
      try { recognitionRef.current?.stop(); } catch {} 
    } else {
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
    <main className="fixed inset-0 bg-[#010409] text-[#7d8590] flex flex-col overflow-hidden font-sans select-none">
      
      {/* Return Button for sub-menus */}
      <button 
        onClick={() => setActiveTab("VOICE")} 
        className={`fixed top-8 left-1/2 -translate-x-1/2 z-[100] px-10 py-2 border border-pink-500/30 bg-black/80 backdrop-blur-2xl rounded-full text-[9px] tracking-[0.6em] uppercase text-pink-500 transition-all duration-1000 ${activeTab !== 'VOICE' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        Return to Core
      </button>

      {/* Primary Navigation */}
      <nav className={`h-20 px-12 flex items-center justify-between border-b border-white/[0.03] bg-[#010409]/80 backdrop-blur-md z-50 transition-all duration-700 ${activeTab === 'DASHBOARD' ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}>
        <div className="flex items-center gap-5">
          <div className="w-8 h-8 border border-pink-500/40 rounded-lg flex items-center justify-center relative">
            <div className="w-3 h-3 bg-pink-500 rounded-full shadow-[0_0_15px_#ff1493] animate-pulse" />
          </div>
          <span className="text-[11px] font-black tracking-[0.5em] text-white uppercase italic">
            {jarvisName}<span className="text-pink-500 font-thin ml-1">OS</span>
          </span>
        </div>

        <div className="flex gap-14 text-[10px] tracking-[0.4em] uppercase font-bold">
          {['Voice', 'Dashboard', 'Memory', 'Settings'].map(t => (
            <button 
              key={t} 
              onClick={() => setActiveTab(t.toUpperCase() as ActiveTab)} 
              className={`${activeTab === t.toUpperCase() ? 'text-pink-500 border-b border-pink-500' : 'hover:text-white text-slate-500'} pb-1 transition-all duration-300`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-8">
          <SignedIn><UserButton afterSignOutUrl="/" /></SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="text-[9px] tracking-[0.3em] uppercase border border-white/10 px-6 py-2 rounded-full hover:bg-white/5 transition-all">Authorize</button>
            </SignInButton>
          </SignedOut>
        </div>
      </nav>

      {!isActive ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_center,_#0a1120_0%,_#010409_100%)]">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-12"
          >
            <p className="text-[10px] tracking-[1.2em] uppercase text-slate-500">Neural Link Protocol</p>
            <button 
              onClick={() => { setIsActive(true); speak("System initialized. All nodes online."); }} 
              className="group relative px-20 py-6 border border-pink-500/30 text-pink-400 text-[12px] tracking-[0.8em] uppercase hover:bg-pink-500/10 transition-all shadow-[0_0_100px_rgba(255,20,147,0.05)]"
            >
              <span className="relative z-10">Initialize Core</span>
              <div className="absolute inset-0 bg-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </motion.div>
        </div>
      ) : (
        <div className="flex-1 relative flex overflow-hidden">
          
          {/* CORE VIEW (Voice + Dashboard Transition) */}
          <div className={`flex-1 flex transition-all duration-1000 ${activeTab === 'MEMORY' || activeTab === 'SETTINGS' ? 'opacity-0 scale-95 pointer-events-none translate-y-10' : 'opacity-100 scale-100 translate-y-0'}`}>
            
            {/* Left Sidebar: Hardware */}
            <aside className={`w-[360px] p-10 border-r border-white/[0.02] flex flex-col gap-12 bg-[#010409] z-20 transition-all duration-1000 ease-in-out ${activeTab === 'DASHBOARD' ? '-translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}>
                <div>
                  <p className="text-[10px] text-pink-500/60 uppercase tracking-[0.5em] mb-10">Hardware Grid</p>
                  <div className="space-y-4">
                    {Object.entries(devices).map(([key, val]) => (
                        <div key={key} className="flex items-center justify-between p-5 rounded-2xl bg-[#0d1117] border border-white/[0.04] group hover:border-pink-500/20 transition-all">
                          <span className="text-[10px] uppercase tracking-widest text-slate-400 group-hover:text-slate-200">{key}</span>
                          <div 
                            onClick={() => setDevices(prev => ({...prev, [key]: !val}))} 
                            className={`w-12 h-6 rounded-full relative cursor-pointer transition-all duration-500 ${val ? 'bg-pink-600/40 border border-pink-500/50' : 'bg-slate-800 border border-white/5'}`}
                          >
                            <div className={`absolute top-1 w-3.5 h-3.5 bg-white rounded-full shadow-lg transition-all duration-500 ${val ? 'left-7 bg-pink-200' : 'left-1'}`} />
                          </div>
                        </div>
                    ))}
                  </div>
                </div>
                <div className="flex-1 bg-[#0d1117]/30 rounded-3xl border border-dashed border-white/5 p-6 flex flex-col items-center justify-center text-center">
                   <div className="w-12 h-12 rounded-full border border-white/5 flex items-center justify-center mb-4">
                      <div className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-ping" />
                   </div>
                   <p className="text-[8px] uppercase tracking-[0.4em] text-slate-600 leading-loose">Real-time Telemetry<br/>Sync Active</p>
                </div>
            </aside>

            {/* Center Stage: The Orb */}
            <main className="flex-1 relative flex flex-col items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#0d1425_0%,_#010409_80%)]" />
                
                <div className={`relative transition-all duration-1000 z-10 flex items-center justify-center ${activeTab === 'DASHBOARD' ? 'scale-110 translate-y-0' : 'scale-100 -translate-y-24'}`}>
                    <canvas ref={canvasRef} width={900} height={900} className="relative w-[700px] h-[700px]" />
                </div>

                {/* Jarvis Speech Bubble */}
                <div className={`absolute bottom-48 w-full max-w-2xl px-10 transition-all duration-1000 z-20 ${activeTab === 'VOICE' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
                    <div className="p-10 rounded-[40px] bg-[#0d1117]/80 border border-white/[0.08] backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-center">
                        <p className="text-[15px] text-slate-200 font-light italic leading-relaxed tracking-wide">
                          "{response}"
                        </p>
                    </div>
                </div>

                {/* Mic Trigger */}
                <div className={`absolute bottom-16 transition-all duration-1000 z-30 ${activeTab === 'DASHBOARD' ? 'opacity-0 translate-y-20' : 'opacity-100 translate-y-0'}`}>
                  <button 
                    onClick={toggleMic} 
                    className={`w-24 h-24 rounded-full border-2 flex items-center justify-center transition-all duration-500 group ${micOn ? 'border-pink-500 bg-pink-500/10 shadow-[0_0_60px_#ff1493]' : 'border-white/10 bg-white/5 hover:border-pink-500/40'}`}
                  >
                    <div className={`absolute inset-0 rounded-full animate-ping bg-pink-500/20 ${micOn ? 'block' : 'hidden'}`} />
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={micOn ? '#ff1493' : '#475569'} strokeWidth="1.5" className="relative z-10 transition-colors group-hover:stroke-pink-500">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                      <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 19v4M8 23h8"/>
                    </svg>
                  </button>
                </div>
            </main>

            {/* Right Sidebar: Logs */}
            <aside className={`w-[360px] p-10 border-l border-white/[0.02] flex flex-col gap-12 bg-[#010409] z-20 transition-all duration-1000 ease-in-out ${activeTab === 'DASHBOARD' ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}>
                <section>
                  <p className="text-[10px] text-pink-500/60 uppercase tracking-[0.5em] mb-10">Cognitive Status</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[`User: ${userHandle}`, 'Access: Level 1', `UI: Majestic`, 'Auth: Clerk'].map(tag => (
                      <span key={tag} className="px-4 py-2 bg-pink-500/5 border border-pink-500/10 rounded-xl text-[9px] text-pink-400/70 text-center tracking-widest">{tag}</span>
                    ))}
                  </div>
                </section>
                
                <section className="flex-1 min-h-0 flex flex-col">
                  <p className="text-[10px] text-pink-500/60 uppercase tracking-[0.5em] mb-8">System Console</p>
                  <div className="flex-1 overflow-y-auto space-y-5 pr-4 custom-scrollbar">
                      {log.map((l, i) => (
                        <div key={i} className="text-[11px] border-l-2 border-pink-500/30 pl-5 py-1 animate-in fade-in slide-in-from-left-2">
                          <p className="text-slate-600 text-[8px] mb-1 font-mono tracking-tighter uppercase">{l.time}</p>
                          <p className="text-slate-300 italic font-light leading-snug">{l.msg}</p>
                        </div>
                      ))}
                  </div>
                </section>
            </aside>
          </div>

          {/* TAB: MEMORY (Majestic Integration) */}
          <AnimatePresence>
            {activeTab === "MEMORY" && (
              <motion.div 
                initial={{ opacity: 0, scale: 1.1 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 1.1 }} 
                className="absolute inset-0 bg-[#010409] z-[60] flex flex-col items-center p-24 overflow-y-auto custom-scrollbar"
              >
                <motion.h1 
                  initial={{ opacity: 0, y: -20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className="text-white text-[11px] tracking-[1.5em] uppercase mb-24 opacity-40 font-black"
                >
                  Neural Archive Bank
                </motion.h1>
                <div className="w-full max-w-2xl space-y-6">
                  {dbMemories.map((m) => (
                    <motion.div 
                      key={m.id} 
                      drag="x" 
                      dragConstraints={{ left: -100, right: 0 }} 
                      onDragEnd={async (_, info) => { 
                        if(info.offset.x < -60) { 
                          await supabase.from("memories").update({ is_hidden: true }).eq("id", m.id); 
                          refreshData(); 
                        } 
                      }} 
                      className="p-8 bg-[#0d1117] border border-white/[0.05] rounded-[32px] cursor-grab active:cursor-grabbing flex justify-between items-center group hover:border-pink-500/30 transition-colors"
                    >
                      <div className="space-y-2">
                        <p className="text-slate-200 text-sm font-light tracking-wide">{m.content}</p>
                        <p className="text-[8px] text-slate-600 uppercase tracking-widest">{new Date(m.created_at).toLocaleString()}</p>
                      </div>
                      <div className="flex flex-col items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[7px] uppercase tracking-widest text-pink-500 animate-pulse">Swipe Left</span>
                        <span className="text-[7px] uppercase tracking-widest text-slate-700">to Encrypt</span>
                      </div>
                    </motion.div>
                  ))}
                  {dbMemories.length === 0 && (
                    <p className="text-center text-slate-700 text-[10px] tracking-[0.5em] uppercase mt-20">No active neural traces found.</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* TAB: SETTINGS (Functional Identity) */}
          <AnimatePresence>
            {activeTab === "SETTINGS" && (
              <motion.div 
                initial={{ opacity: 0, y: 30 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: 30 }} 
                className="absolute inset-0 bg-[#010409] z-[60] flex flex-col items-center p-24 overflow-y-auto"
              >
                <div className="w-full max-w-3xl space-y-20 pb-32">
                  
                  {/* Clerk User Integration */}
                  <section className="bg-[#0d1117] p-10 rounded-[40px] border border-white/[0.05] flex items-center justify-between">
                    <div className="flex items-center gap-8">
                      <div className="relative">
                        <img src={user?.imageUrl} className="w-20 h-20 rounded-3xl border-2 border-pink-500/20" alt="Admin" />
                        <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-4 border-[#0d1117]" />
                      </div>
                      <div>
                        <h2 className="text-white text-xl font-light tracking-tight">{user?.fullName}</h2>
                        <p className="text-xs text-slate-500 font-mono mt-1">{user?.primaryEmailAddress?.emailAddress}</p>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[9px] text-slate-600 uppercase tracking-widest mb-1">Session Protocol</p>
                       <p className="text-[10px] text-pink-500 uppercase tracking-widest font-bold">Encrypted</p>
                    </div>
                  </section>

                  {/* Core Naming Preferences */}
                  <section className="space-y-8">
                    <p className="text-[10px] text-pink-500 uppercase tracking-[0.8em] font-black opacity-60">Identity Management</p>
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="text-[9px] uppercase tracking-widest text-slate-500 ml-2">Assign AI Identifier</label>
                        <input 
                          value={jarvisName} 
                          onChange={(e) => setJarvisName(e.target.value)} 
                          className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-5 text-white text-xs outline-none focus:border-pink-500/50 transition-all font-light tracking-widest" 
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[9px] uppercase tracking-widest text-slate-500 ml-2">User Salutation</label>
                        <input 
                          value={userHandle} 
                          onChange={(e) => setUserHandle(e.target.value)} 
                          className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-5 text-white text-xs outline-none focus:border-pink-500/50 transition-all font-light tracking-widest" 
                        />
                      </div>
                    </div>
                    <button 
                      onClick={saveSettings} 
                      className="w-full py-5 bg-pink-600/10 border border-pink-500/40 text-pink-500 text-[11px] tracking-[0.6em] uppercase rounded-2xl hover:bg-pink-600/20 transition-all"
                    >
                      Update Neural Parameters
                    </button>
                  </section>

                  {/* Locked Vault (The "YES" Protocol) */}
                  <section className="bg-[#0d1117] p-10 rounded-[40px] border border-white/[0.05] relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8">
                       <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    </div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-[0.6em] mb-6 font-bold">Encrypted Memory Vault</p>
                    {!showHidden ? (
                      <div className="space-y-4">
                        <p className="text-[9px] text-slate-600 uppercase tracking-widest">Verification required to view hidden traces</p>
                        <input 
                          type="text" 
                          placeholder="TYPE 'YES' TO DECRYPT" 
                          value={unlockInput} 
                          onChange={(e) => { if(e.target.value === "YES") setShowHidden(true); }} 
                          className="w-full bg-black/40 border border-white/5 rounded-xl p-4 text-[10px] text-white outline-none text-center tracking-[0.8em]" 
                        />
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-4">
                        {hiddenMemories.map(m => (
                          <div key={m.id} className="p-4 border-b border-white/5 text-xs text-slate-400 font-light flex justify-between items-center">
                            <span>{m.content}</span>
                            <button 
                              onClick={async () => { await supabase.from("memories").update({ is_hidden: false }).eq("id", m.id); refreshData(); }}
                              className="text-[8px] text-pink-500/50 uppercase tracking-tighter hover:text-pink-500 transition-colors"
                            >
                              Restore
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Nuclear Purge Option */}
                  <section className="bg-red-500/[0.02] p-10 rounded-[40px] border border-red-500/10">
                    <p className="text-[10px] text-red-500 uppercase tracking-[0.6em] mb-6 font-black">Neural Core Wipe</p>
                    {!isDeleting ? (
                      <button 
                        onClick={() => setIsDeleting(true)} 
                        className="text-[10px] text-red-400/60 underline tracking-[0.3em] uppercase hover:text-red-400 transition-colors"
                      >
                        Initiate full memory bank purge
                      </button>
                    ) : (
                      <div className="space-y-6">
                        <p className="text-xs text-red-500 font-light italic">Warning: This action is irreversible. All archived neural paths will be lost.</p>
                        <input 
                          value={deleteConfirm} 
                          onChange={(e) => setDeleteConfirm(e.target.value)} 
                          className="w-full bg-black border border-red-500/20 rounded-2xl p-5 text-white text-xs outline-none focus:border-red-500 transition-all font-mono" 
                          placeholder="TYPE 'CONFIRM DELETE'"
                        />
                        <div className="flex gap-4">
                           <button 
                            onClick={async () => { 
                              if(deleteConfirm === "CONFIRM DELETE") { 
                                await supabase.from("memories").delete().eq("user_id", user.id); 
                                refreshData(); setDeleteConfirm(""); setIsDeleting(false); 
                                addLog("SYSTEM: Neural bank wiped successfully.");
                              } 
                            }} 
                            className="flex-1 py-4 bg-red-600 text-white text-[10px] tracking-[0.4em] uppercase rounded-xl hover:bg-red-700 transition-all"
                          >
                            Execute Wipe
                          </button>
                          <button onClick={() => setIsDeleting(false)} className="px-8 py-4 border border-white/10 text-white text-[10px] tracking-widest uppercase rounded-xl hover:bg-white/5">Cancel</button>
                        </div>
                      </div>
                    )}
                  </section>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      )}

      {/* Global CSS for scrollbars */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(236, 72, 153, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(236, 72, 153, 0.3); }
      `}</style>
    </main>
  );
}
