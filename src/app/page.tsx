"use client";
import { useState, useEffect, useRef } from "react";
import { UserButton, useUser, useClerk } from "@clerk/nextjs";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

export default function JarvisOS() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  
  // UI & Brain States
  const [activeTab, setActiveTab] = useState("VOICE");
  const [response, setResponse] = useState("System online. Awaiting your command.");
  const [jarvisName, setJarvisName] = useState("Jarvis");
  const [userHandle, setUserHandle] = useState("Sir");
  
  // Sidebar Toggles (Visual only)
  const [hardware, setHardware] = useState([
    { name: "LIVING RM LIGHTS", active: true },
    { name: "BEDROOM FAN", active: true },
    { name: "FRONT DOOR LOCK", active: false },
    { name: "MAIN AC UNIT", active: false },
    { name: "AUDIO SPEAKER", active: true },
  ]);

  const [memories, setMemories] = useState<any[]>([]);
  const [unlockPass, setUnlockPass] = useState("");
  const [nukeConfirm, setNukeConfirm] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 1. Reactive Neural Sphere Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particles: any[] = [];
    const sphereRadius = 150;
    
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resize);
    resize();

    // Create a 3D-ish Sphere
    for (let i = 0; i < 400; i++) {
      const phi = Math.acos(-1 + (2 * i) / 400);
      const theta = Math.sqrt(400 * Math.PI) * phi;
      particles.push({
        phi, theta,
        size: Math.random() * 2 + 1,
        color: i % 5 === 0 ? "#ffffff" : "#ff1493",
      });
    }

    let rotation = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      rotation += 0.005;
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      particles.forEach((p) => {
        const x = sphereRadius * Math.sin(p.phi) * Math.cos(p.theta + rotation);
        const y = sphereRadius * Math.sin(p.phi) * Math.sin(p.theta + rotation);
        const z = sphereRadius * Math.cos(p.phi);

        const scale = (z + sphereRadius) / (2 * sphereRadius);
        const finalX = centerX + x;
        const finalY = centerY + y;

        ctx.globalAlpha = scale;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(finalX, finalY, p.size * scale, 0, Math.PI * 2);
        ctx.fill();
      });
      requestAnimationFrame(animate);
    };
    animate();
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    if (user) {
      const sync = async () => {
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (profile) {
          setJarvisName(profile.jarvis_name);
          setUserHandle(profile.user_handle);
        }
        const { data: mems } = await supabase.from("memories").select("*").eq("user_id", user.id).eq("is_hidden", false);
        if (mems) setMemories(mems);
      };
      sync();
    }
  }, [user]);

  if (!isLoaded) return null;

  return (
    <main className="fixed inset-0 bg-[#020205] text-pink-500 font-mono flex flex-col overflow-hidden">
      {/* Background Sphere */}
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none opacity-60" />
      
      {/* Top Navigation */}
      <nav className="h-16 px-8 flex items-center justify-between border-b border-pink-500/10 bg-black/40 backdrop-blur-md z-50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-pink-500 rounded-full shadow-[0_0_10px_#ff1493]" />
          <span className="text-[10px] font-bold tracking-[0.4em] uppercase text-white">{jarvisName} OS</span>
        </div>
        <div className="flex gap-8 text-[9px] tracking-widest uppercase font-bold">
          {["Voice", "Dashboard", "Archive", "Settings"].map(t => (
            <button key={t} onClick={() => setActiveTab(t.toUpperCase())} className={activeTab === t.toUpperCase() ? "text-pink-500 underline underline-offset-4" : "text-white/40 hover:text-white transition-colors"}>{t}</button>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <button className="text-[9px] border border-pink-500/30 px-3 py-1 rounded uppercase hover:bg-pink-500 hover:text-black transition-all">Authorize</button>
          <UserButton afterSignOutUrl="/" />
        </div>
      </nav>

      <div className="flex-1 flex relative">
        {/* LEFT SIDEBAR: Hardware Network */}
        <aside className="w-72 border-r border-pink-500/5 p-6 space-y-6 hidden lg:block z-20 bg-black/10">
          <p className="text-[9px] tracking-[0.3em] text-pink-500/40 uppercase mb-4">Hardware Network</p>
          {hardware.map((item, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
              <span className="text-[10px] text-white/70 font-bold">{item.name}</span>
              <div className={`w-8 h-4 rounded-full relative transition-colors ${item.active ? 'bg-pink-500' : 'bg-white/10'}`}>
                <div className={`absolute w-3 h-3 bg-white rounded-full top-0.5 transition-all ${item.active ? 'right-0.5' : 'left-0.5'}`} />
              </div>
            </div>
          ))}
        </aside>

        {/* CENTER: Main OS Interface */}
        <section className="flex-1 flex flex-col items-center justify-center relative">
          {activeTab === "VOICE" && (
            <div className="text-center z-30">
              <div className="bg-black/60 backdrop-blur-md border border-white/5 px-8 py-4 rounded-xl mb-10 shadow-2xl">
                <p className="text-sm italic text-pink-100 tracking-wide font-light">"{response}"</p>
              </div>
              <div className="w-14 h-14 rounded-full border border-pink-500 flex items-center justify-center hover:bg-pink-500/10 transition-all cursor-pointer">
                <div className="w-2 h-2 bg-pink-500 rounded-full animate-ping" />
              </div>
            </div>
          )}

          {/* OVERLAYS FOR ARCHIVE & SETTINGS */}
          <AnimatePresence>
            {activeTab === "ARCHIVE" && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-xl z-40 p-20 overflow-y-auto">
                <h2 className="text-xl font-bold uppercase tracking-[0.5em] mb-10 text-center">Neural Memory Bank</h2>
                <div className="max-w-2xl mx-auto space-y-4">
                  {memories.map(m => (
                    <motion.div drag="x" dragConstraints={{ left: -100, right: 0 }} onDragEnd={(_, info) => info.offset.x < -50 && supabase.from("memories").update({ is_hidden: true }).eq("id", m.id)} key={m.id} className="p-6 bg-white/5 border border-white/10 rounded-xl flex justify-between group">
                      <p className="text-sm text-pink-100">{m.content}</p>
                      <span className="text-[8px] text-pink-500 opacity-0 group-hover:opacity-100">Swipe Left to Hide</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === "SETTINGS" && (
              <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#0a0a0f]/95 backdrop-blur-2xl z-40 p-12 overflow-y-auto">
                <div className="max-w-xl mx-auto space-y-12">
                  <header><h2 className="text-sm font-black uppercase tracking-[0.6em]">System Configuration</h2></header>
                  <div className="space-y-4">
                    <p className="text-[9px] text-pink-500/40 uppercase">Profile Matrix</p>
                    <div className="bg-white/5 rounded-xl border border-white/5 p-6 space-y-4">
                      <div className="flex justify-between items-center"><span className="text-xs uppercase">Jarvis Name</span><input value={jarvisName} onChange={(e)=>setJarvisName(e.target.value)} className="bg-transparent text-right outline-none text-white border-b border-pink-500/20" /></div>
                      <div className="flex justify-between items-center"><span className="text-xs uppercase">User Handle</span><input value={userHandle} onChange={(e)=>setUserHandle(e.target.value)} className="bg-transparent text-right outline-none text-white border-b border-pink-500/20" /></div>
                      <button onClick={() => supabase.from("profiles").update({ jarvis_name: jarvisName, user_handle: userHandle }).eq("id", user?.id)} className="w-full py-2 bg-pink-500 text-black font-bold text-[10px] uppercase rounded">Commit Changes</button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <p className="text-[9px] text-red-500/60 uppercase">Data Purge</p>
                    <div className="bg-red-500/5 rounded-xl border border-red-500/10 p-6 space-y-4">
                      <input placeholder="Type 'DELETE ALL'" value={nukeConfirm} onChange={(e)=>setNukeConfirm(e.target.value)} className="w-full bg-black/40 border border-red-500/20 p-3 text-xs outline-none text-red-500" />
                      <button onClick={() => nukeConfirm === 'DELETE ALL' && supabase.from("memories").delete().eq("user_id", user?.id)} className="w-full py-2 border border-red-500 text-red-500 font-bold text-[10px] uppercase rounded">Nuke Memory</button>
                    </div>
                  </div>
                  <button onClick={() => signOut()} className="w-full text-pink-500/20 hover:text-red-500 text-[10px] uppercase tracking-widest pt-10 transition-colors">Terminate Session</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* RIGHT SIDEBAR: Neural Memory / Logs */}
        <aside className="w-80 border-l border-pink-500/5 p-6 space-y-10 hidden xl:block z-20 bg-black/10">
          <div className="space-y-4">
            <p className="text-[9px] tracking-[0.3em] text-pink-500/40 uppercase">Neural Memory</p>
            <div className="flex gap-2">
              <span className="text-[8px] bg-pink-500/10 border border-pink-500/20 px-2 py-1 rounded">User: {userHandle}</span>
              <span className="text-[8px] bg-white/5 border border-white/10 px-2 py-1 rounded">Access: ADMIN</span>
            </div>
          </div>
          <div className="space-y-4">
            <p className="text-[9px] tracking-[0.3em] text-pink-500/40 uppercase">System Logs</p>
            <div className="font-mono text-[9px] space-y-2 opacity-60">
              <p className="text-pink-300">[{new Date().toLocaleTimeString()}] USER: hey jarvis</p>
              <p className="text-white/40">[{new Date().toLocaleTimeString()}] CORE: processing_request...</p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
