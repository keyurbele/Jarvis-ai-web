"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LucideBrain, LucideMic, LucideZap, LucideSettings, 
  LucideTerminal, LucideCpu, LucideLayers, LucidePower 
} from "lucide-react";

type JarvisState = "IDLE" | "LISTENING" | "THINKING" | "SPEAKING";

export default function Home() {
  const [state, setState] = useState<JarvisState>("IDLE");
  const [status, setStatus] = useState("SYSTEM READY");
  const [volume, setVolume] = useState(0);
  const [log, setLog] = useState<{msg: string, time: string}[]>([]);

  // Add to log helper
  const addToLog = (msg: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLog(prev => [{msg, time}, ...prev].slice(0, 5));
  };

  // ... (Keep your existing startAudio, speak, and startSystem logic here) ...

  const activeColor = { 
    LISTENING: "rgb(34, 211, 238)", // Cyan
    THINKING: "rgb(168, 85, 247)",  // Purple
    SPEAKING: "rgb(255, 255, 255)", // White
    IDLE: "rgb(100, 100, 100)"      // Gray
  }[state];

  return (
    <main className="min-h-screen bg-[#050505] text-white font-mono selection:bg-cyan-500/30 overflow-x-hidden">
      
      {/* 🌌 DYNAMIC BACKGROUND MESH */}
      <div className="fixed inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="absolute inset-0 bg-radial-at-t from-cyan-500/10 via-transparent to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        
        {/* 📟 HEADER / NAVBAR */}
        <nav className="flex justify-between items-center mb-16 border-b border-white/5 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/5 rounded-lg border border-white/10">
              <LucideCpu className="text-cyan-500" size={20} />
            </div>
            <span className="font-bold tracking-tighter text-xl italic">JARVIS <span className="text-cyan-500">2.0</span></span>
          </div>
          <div className="flex items-center gap-6 text-[10px] tracking-[0.3em] text-gray-500 uppercase">
            <span>Uptime: 99.9%</span>
            <span className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
              Sienna Node
            </span>
          </div>
        </nav>

        {/* 💠 GRID LAYOUT (The Real Website Look) */}
        <div className="grid grid-cols-12 gap-6">
          
          {/* LEFT COLUMN: STATUS & LOGS */}
          <div className="col-span-12 lg:col-span-3 flex flex-col gap-6">
            <div className="p-6 bg-white/[0.03] border border-white/10 rounded-2xl backdrop-blur-md">
              <h3 className="text-[10px] text-gray-500 mb-4 tracking-widest flex items-center gap-2">
                <LucideTerminal size={14} /> SYSTEM LOG
              </h3>
              <div className="space-y-4">
                {log.length === 0 ? <p className="text-[10px] text-gray-700">Waiting for data...</p> : 
                  log.map((entry, i) => (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key={i} className="border-l border-cyan-500/30 pl-3">
                      <p className="text-[9px] text-cyan-500/50">{entry.time}</p>
                      <p className="text-[11px] text-gray-400 truncate">{entry.msg}</p>
                    </motion.div>
                  ))
                }
              </div>
            </div>
            
            <div className="p-6 bg-white/[0.03] border border-white/10 rounded-2xl">
              <h3 className="text-[10px] text-gray-500 mb-4 tracking-widest">NEURAL CORE</h3>
              <div className="flex items-end gap-1 h-12">
                {[...Array(12)].map((_, i) => (
                  <motion.div 
                    key={i}
                    animate={{ height: volume > 0 ? (Math.random() * 100) + "%" : "10%" }}
                    className="flex-1 bg-cyan-500/50 rounded-t-sm"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* CENTER COLUMN: THE MAIN ORB */}
          <div className="col-span-12 lg:col-span-6 flex flex-col items-center justify-center py-12">
            <div className="relative group">
              {/* Outer Rings */}
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-10 border border-dashed border-white/10 rounded-full"
              />
              <motion.div 
                animate={{ rotate: -360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-6 border border-white/5 rounded-full"
              />

              {/* The Main Interaction Sphere */}
              <motion.div 
                onClick={state === "IDLE" ? startSystem : undefined}
                whileHover={{ scale: 1.05 }}
                className="w-64 h-64 rounded-full flex items-center justify-center cursor-pointer relative z-10"
                style={{ 
                   background: `radial-gradient(circle, ${activeColor}20 0%, transparent 70%)`,
                   border: `1px solid ${activeColor}40`,
                   boxShadow: `0 0 ${50 + volume * 100}px ${activeColor}20`
                }}
              >
                <div className="text-center">
                   <div className="text-[10px] tracking-[0.6em] text-white/40 mb-2">{state}</div>
                   <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                      <LucideMic className={state !== 'IDLE' ? "text-cyan-500" : "text-gray-600"} />
                   </div>
                </div>
              </motion.div>
            </div>

            <div className="mt-16 w-full max-w-lg text-center">
              <AnimatePresence mode="wait">
                <motion.p 
                  key={status}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-2xl font-light tracking-tight italic"
                >
                  "{status}"
                </motion.p>
              </AnimatePresence>
            </div>
          </div>

          {/* RIGHT COLUMN: MODULES */}
          <div className="col-span-12 lg:col-span-3 flex flex-col gap-6">
            <div className="p-6 bg-cyan-500/5 border border-cyan-500/20 rounded-2xl">
              <LucideLayers className="text-cyan-500 mb-4" />
              <h3 className="font-bold text-sm mb-2 uppercase">Vision Module</h3>
              <p className="text-[11px] text-gray-500 leading-relaxed font-sans">Active screen awareness is currently in sandbox mode. Waiting for permissions.</p>
            </div>
            
            <div className="p-6 bg-white/[0.03] border border-white/10 rounded-2xl group hover:border-cyan-500/50 transition-all">
              <LucidePower className="text-gray-600 group-hover:text-red-500 mb-4 transition-colors" />
              <h3 className="font-bold text-sm mb-2 uppercase">Shutdown</h3>
              <p className="text-[11px] text-gray-500 leading-relaxed font-sans">Disconnect neural bridge and put core into hibernation.</p>
            </div>
          </div>

        </div>

      </div>
    </main>
  );
}
