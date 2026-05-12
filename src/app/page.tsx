"use client";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { UserButton, SignInButton, SignUpButton, useUser } from "@clerk/nextjs";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

type JarvisState = "IDLE" | "LISTENING" | "THINKING" | "SPEAKING";
type ActiveTab = "VOICE" | "DASHBOARD" | "MEMORY" | "SETTINGS";

export default function JarvisOS() {
  const { user, isLoaded, isSignedIn } = useUser();
  const [activeTab, setActiveTab] = useState<ActiveTab>("VOICE");
  const [isActive, setIsActive] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [state, setState] = useState<JarvisState>("IDLE");
  const [response, setResponse] = useState("System online. Awaiting your command.");
  const [log, setLog] = useState<{time: string, msg: string}[]>([]);
  const [mounted, setMounted] = useState(false);
  
  const [dbMemories, setDbMemories] = useState<any[]>([]);
  const [hiddenMemories, setHiddenMemories] = useState<any[]>([]);
  const [jarvisName, setJarvisName] = useState("Jarvis");
  const [userHandle, setUserHandle] = useState("Sir");
  const [showHidden, setShowHidden] = useState(false);
  const [unlockInput, setUnlockInput] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

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

  const refreshData = useCallback(async () => {
    if (!user) return;
    try {
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (prof) { setJarvisName(prof.jarvis_name || "Jarvis"); setUserHandle(prof.user_handle || "Sir"); }
      const { data: act } = await supabase.from("memories").select("*").eq("user_id", user.id).eq("is_hidden", false).order("created_at", { ascending: false });
      const { data: hid } = await supabase.from("memories").select("*").eq("user_id", user.id).eq("is_hidden", true).order("created_at", { ascending: false });
      if (act) setDbMemories(act);
      if (hid) setHiddenMemories(hid);
    } catch (err) { console.error("Sync Error:", err); }
  }, [user]);

  useEffect(() => { if (user) refreshData(); }, [user, activeTab, refreshData]);

  const addLog = (msg: string) => {
    const timeStr = new Date().toLocaleTimeString([], { hour12: false });
    setLog(prev => [{time: timeStr, msg}, ...prev].slice(0, 25));
  };

  const saveSettings = async () => {
    if (user) {
      await supabase.from("profiles").upsert({ id: user.id, jarvis_name: jarvisName, user_handle: userHandle });
      addLog("SYSTEM: Identity parameters synchronized.");
      setActiveTab("VOICE");
    }
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
        ctx.beginPath(); ctx.arc(x, y, (0.4 + depth * 3.5) * (p.size/2), 0, Math.PI * 2);
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
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.pitch = 0.85; u.rate = 0.95;
    u.onstart = () => setState("SPEAKING"); u.onend = () => setState("IDLE");
    window.speechSynthesis.speak(u);
  }, []);

  const askJarvis = useCallback(async (input: string) => {
    if (!input.trim()) return;
    setState("THINKING");
    addLog(`USER: ${input}`);

    if (user) {
      const personalMarkers = ["my", "name", "remember", "she", "he", "is", "gf"];
      if (personalMarkers.some(m => input.toLowerCase().includes(m))) {
        await supabase.from("memories").insert({ user_id: user.id, content: input, is_hidden: false });
        refreshData();
      }
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, history: historyRef.current, userName: userHandle, jarvisName: jarvisName }),
      });
      const data = await res.json();
      const botReply = data.reply || data.message || (typeof data === 'string' ? data : null);

      if (botReply) {
        setResponse(botReply);
        addLog(`${jarvisName.toUpperCase()}: ${botReply}`);
        historyRef.current = [...historyRef.current, { role: "user", content: input }, { role: "assistant", content: botReply }].slice(-12);
        speak(botReply);
      } else {
        setResponse("Neural signal empty.");
        setState("IDLE");
      }
    } catch (e) {
      setResponse("System offline.");
      setState("IDLE");
    }
  }, [user, userHandle, jarvisName, speak, refreshData]);

  const toggleMic = () => {
    if (micOnRef.current) { 
      setMicOn(false); setState("IDLE"); 
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
          if (transcript.trim()) askJarvis(transcript); 
        };
        setMicOn(true); setState("LISTENING");
        try { recognitionRef.current.start(); } catch {}
      }
    }
  };

  if (!mounted || !isLoaded) return null;

  return (
    <main className="fixed inset-0 bg-[#010409] text-[#7d8590] flex flex-col overflow-hidden font-sans select-none">
      
      {/* Tab Return Button */}
      <button onClick={() => setActiveTab("VOICE")} className={`fixed top-8 left-1/2 -translate-x-1/2 z-[100] px-10 py-2 border border-pink-500/30 bg-black/80 backdrop-blur-2xl rounded-full text-[9px] tracking-[0.6em] uppercase text-pink-500 transition-all duration-1000 ${activeTab !== 'VOICE' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>Return to Core</button>

      {/* FIXED NAVIGATION */}
      <nav className={`h-20 px-12 flex items-center justify-between border-b border-white/[0.03] bg-[#010409]/80 backdrop-blur-md z-50 transition-all duration-700 ${activeTab === 'DASHBOARD' ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}>
        <div className="flex items-center gap-5">
          <div className="w-8 h-8 border border-pink-500/40 rounded-lg flex items-center justify-center relative">
            <div className="w-3 h-3 bg-pink-500 rounded-full shadow-[0_0_15px_#ff1493] animate-pulse" />
          </div>
          <span className="text-[11px] font-black tracking-[0.5em] text-white uppercase italic">{jarvisName}<span className="text-pink-500 font-thin ml-1">OS</span></span>
        </div>

        {/* Buttons Group */}
        <div className="flex items-center gap-12">
          {/* Navigation Links */}
          <div className="flex gap-14 text-[10px] tracking-[0.4em] uppercase font-bold">
            {['Voice', 'Dashboard', 'Memory', 'Settings'].map(t => (
              <button 
                key={t} 
                onClick={() => {
                  if (!isSignedIn && (t === 'Memory' || t === 'Settings')) return;
                  setActiveTab(t.toUpperCase() as ActiveTab);
                }} 
                className={`${activeTab === t.toUpperCase() ? 'text-pink-500 border-b border-pink-500' : (!isSignedIn && (t === 'Memory' || t === 'Settings')) ? 'text-slate-800 cursor-not-allowed' : 'hover:text-white text-slate-500'} pb-1 transition-all`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* AUTH BUTTONS ARE BACK HERE */}
          <div className="flex items-center gap-6">
            {isSignedIn ? (
              <UserButton afterSignOutUrl="/" />
            ) : (
              <>
                <SignInButton mode="modal">
                  <button className="text-[10px] tracking-widest uppercase text-white hover:text-pink-500 transition-all">Login</button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="px-6 py-2 border border-pink-500/30 rounded-full text-[10px] tracking-widest uppercase text-pink-500 hover:bg-pink-500/10 transition-all">Sign Up</button>
                </SignUpButton>
              </>
            )}
          </div>
        </div>
      </nav>

      {!isActive ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_center,_#0a1120_0%,_#010409_100%)]">
            <button onClick={() => { setIsActive(true); speak("System initialized."); }} className="px-20 py-6 border border-pink-500/30 text-pink-400 text-[12px] tracking-[0.8em] uppercase hover:bg-pink-500/10 transition-all shadow-[0_0_100px_rgba(255,20,147,0.05)]">Initialize Core</button>
        </div>
      ) : (
        <div className="flex-1 relative flex overflow-hidden">
          <div className={`flex-1 flex transition-all duration-1000 ${activeTab === 'MEMORY' || activeTab === 'SETTINGS' ? 'opacity-0 scale-95 pointer-events-none translate-y-10' : 'opacity-100 scale-100 translate-y-0'}`}>
            
            <aside className={`w-[360px] p-10 border-r border-white/[0.02] flex flex-col gap-12 bg-[#010409] z-20 transition-all duration-1000 ${activeTab === 'DASHBOARD' ? '-translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}>
                <p className="text-[10px] text-pink-500/60 uppercase tracking-[0.5em] mb-10">Hardware Grid</p>
                <div className="space-y-4">
                {Object.entries(devices).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between p-5 rounded-2xl bg-[#0d1117] border border-white/[0.04] group hover:border-pink-500/20 transition-all">
                    <span className="text-[10px] uppercase tracking-widest text-slate-400 group-hover:text-slate-200">{key}</span>
                    <div onClick={() => setDevices(prev => ({...prev, [key]: !val}))} className={`w-12 h-6 rounded-full relative cursor-pointer transition-all duration-500 ${val ? 'bg-pink-600/40 border border-pink-500/50' : 'bg-slate-800 border border-white/5'}`}><div className={`absolute top-1 w-3.5 h-3.5 bg-white rounded-full transition-all duration-500 ${val ? 'left-7' : 'left-1'}`} /></div>
                    </div>
                ))}
                </div>
            </aside>

            <main className="flex-1 relative flex flex-col items-center justify-center">
                <div className={`relative transition-all duration-1000 z-10 ${activeTab === 'DASHBOARD' ? 'scale-110 translate-y-0' : 'scale-100 -translate-y-24'}`}>
                    <canvas ref={canvasRef} width={900} height={900} className="relative w-[700px] h-[700px]" />
                </div>
                <div className={`absolute bottom-48 w-full max-w-2xl px-10 transition-all duration-1000 z-20 ${activeTab === 'VOICE' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                    <div className="p-10 rounded-[40px] bg-[#0d1117]/80 border border-white/[0.08] backdrop-blur-3xl shadow-2xl text-center"><p className="text-[15px] text-slate-200 font-light italic leading-relaxed tracking-wide">"{response}"</p></div>
                </div>
                <div className={`absolute bottom-16 z-30 transition-all duration-1000 ${activeTab === 'DASHBOARD' ? 'opacity-0 translate-y-20' : 'opacity-100 translate-y-0'}`}>
                  <button onClick={toggleMic} className={`w-24 h-24 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${micOn ? 'border-pink-500 bg-pink-500/10 shadow-[0_0_60px_#ff1493]' : 'border-white/10 bg-white/5 hover:border-pink-500/40'}`}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={micOn ? '#ff1493' : '#475569'} strokeWidth="1.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 19v4M8 23h8"/></svg>
                  </button>
                </div>
            </main>

            <aside className={`w-[360px] p-10 border-l border-white/[0.02] flex flex-col gap-12 bg-[#010409] z-20 transition-all duration-1000 ${activeTab === 'DASHBOARD' ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}>
                <section>
                  <p className="text-[10px] text-pink-500/60 uppercase tracking-[0.5em] mb-10">Cognitive Status</p>
                  <div className="grid grid-cols-2 gap-3">{[`User: ${userHandle}`, 'Access: Admin', `UI: Majestic`, 'Auth: Clerk'].map(tag => (<span key={tag} className="px-4 py-2 bg-pink-500/5 border border-pink-500/10 rounded-xl text-[9px] text-pink-400/70 text-center tracking-widest">{tag}</span>))}</div>
                </section>
                <section className="flex-1 overflow-y-auto space-y-5 pr-4 custom-scrollbar">
                    {log.map((l, i) => (<div key={i} className="text-[11px] border-l-2 border-pink-500/30 pl-5 py-1 animate-in fade-in slide-in-from-left-2"><p className="text-slate-600 text-[8px] mb-1 font-mono uppercase">{l.time}</p><p className="text-slate-300 italic font-light leading-snug">{l.msg}</p></div>))}
                </section>
            </aside>
          </div>

          {/* TAB: MEMORY */}
          <AnimatePresence>
            {activeTab === "MEMORY" && (
              <motion.div initial={{ opacity: 0, scale: 1.1 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }} className="absolute inset-0 bg-[#010409] z-[60] flex flex-col items-center p-24 overflow-y-auto custom-scrollbar">
                <h1 className="text-white text-[11px] tracking-[1.5em] uppercase mb-24 opacity-40 font-black">Neural Archive Bank</h1>
                <div className="w-full max-w-2xl space-y-6">
                  {dbMemories.map((m) => (
                    <motion.div key={m.id} drag="x" dragConstraints={{ left: -100, right: 0 }} onDragEnd={async (_, info) => { if(info.offset.x < -60) { await supabase.from("memories").update({ is_hidden: true }).eq("id", m.id); refreshData(); }}} className="p-8 bg-[#0d1117] border border-white/[0.05] rounded-[32px] flex justify-between items-center group hover:border-pink-500/30 transition-colors">
                      <p className="text-slate-200 text-sm font-light tracking-wide">{m.content}</p>
                      <span className="text-[7px] uppercase tracking-[0.4em] text-pink-500 animate-pulse">Swipe Left</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* TAB: SETTINGS */}
          <AnimatePresence>
            {activeTab === "SETTINGS" && (
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }} className="absolute inset-0 bg-[#010409] z-[60] flex flex-col items-center p-24 overflow-y-auto">
                <div className="w-full max-w-3xl space-y-20 pb-32">
                  <section className="bg-[#0d1117] p-10 rounded-[40px] border border-white/[0.05] flex items-center justify-between">
                    <div className="flex items-center gap-8">
                      <img src={user?.imageUrl} className="w-20 h-20 rounded-3xl border-2 border-pink-500/20" alt="Admin" />
                      <div><h2 className="text-white text-xl font-light tracking-tight">{user?.fullName}</h2><p className="text-xs text-slate-500 font-mono mt-1">{user?.primaryEmailAddress?.emailAddress}</p></div>
                    </div>
                  </section>
                  {/* ... Rest of settings remains the same ... */}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(236, 72, 153, 0.1); border-radius: 10px; }
      `}</style>
    </main>
  );
}
