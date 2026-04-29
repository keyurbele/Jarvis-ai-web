"use client";
import { useState, useRef, useEffect } from "react";
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

  const stateRef = useRef<JarvisState>("IDLE");
  useEffect(() => { stateRef.current = state; }, [state]);

  const addToLog = (msg: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setLog(prev => [{msg, time}, ...prev].slice(0, 5));
  };

  const activeColor = { 
    LISTENING: "#22d3ee", // Cyan
    THINKING: "#a855f7",  // Purple
    SPEAKING: "#ffffff",  // White
    IDLE: "#333333"       // Gray
  }[state];

  // --- START SYSTEM LOGIC (Replace with your actual logic functions) ---
  const startSystem = () => {
    setState("LISTENING");
    setStatus("CORE ONLINE");
    addToLog("Neural bridge established.");
  };
  // --- END SYSTEM LOGIC ---

  return (
    <main className="min-h-screen bg-[#020202] text-white font-mono overflow-x-hidden selection:bg-cyan-500/30">
      
      {/* 🧬 PURE CSS ANIMATIONS */}
      <style jsx>{`
        @keyframes orbit { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse-slow { 0%, 100% { opacity: 0.2; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.1); } }
        .animate-orbit { animation: orbit 20s linear infinite; }
        .animate-orbit-reverse { animation: orbit 15s linear infinite reverse; }
        .neural-pulse { animation: pulse-slow 3s ease-in-out infinite; }
      `}</style>

      {/* 🌌 BACKGROUND LAYER */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#164e63_0%,transparent_70%)] opacity-20" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        
        {/* 📟 TOP NAV */}
        <nav className="flex justify-between items-center mb-12 border-b border-white/10 pb-6 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <LucideCpu className="text-cyan-500" size={24} />
            <span className="text-xl font-black tracking-tighter uppercase italic">Jarvis<span className="text-cyan-400 font-light">OS</span></span>
          </div>
          <div className="hidden md:flex gap-8 text-[10px] tracking-[0.4em] text-gray-500 uppercase">
            <span className="text-cyan-500/80 underline decoration-cyan-500/30 underline-offset-4">Status: Optimal</span>
            <span>Node: Sienna_TX</span>
          </div>
        </nav>

        {/* 💠 BENTO GRID LAYOUT */}
        <div className="grid grid-cols-12 gap-6">
          
          {/* LEFT: LOGS */}
          <div className="col-span-12 lg:col-span-3 space-y-6">
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-xl transition-all duration-500 hover:border-cyan-500/30">
              <div className="flex items-center gap-2 mb-6 text-gray-400">
                <LucideTerminal size={14} />
                <span className="text-[10px] tracking-widest uppercase font-bold">System_Log</span>
              </div>
              <div className="space-y-4">
                {log.map((entry, i) => (
                  <div key={i} className="border-l border-cyan-500/30 pl-3">
                    <p className="text-[9px] text-cyan-500/40">{entry.time}</p>
                    <p className="text-[11px] text-gray-300 font-sans">{entry.msg}</p>
                  </div>
                ))}
                {log.length === 0 && <p className="text-[10px] text-gray-600 italic">Waiting for connection...</p>}
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
              <span className="text-[10px] text-gray-500 tracking-widest uppercase font-bold">Neural_Load</span>
              <div className="mt-4 h-1 bg-gray-900 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500 transition-all duration-1000" style={{ width: state === 'IDLE' ? '2%' : '75%' }} />
              </div>
            </div>
          </div>

          {/* CENTER: THE ORB */}
          <div className="col-span-12 lg:col-span-6 flex flex-col items-center justify-center min-h-[450px]">
            <div className="relative">
              <div className="absolute -inset-16 border border-cyan-500/10 rounded-full animate-orbit" />
              <div className="absolute -inset-8 border border-white/5 rounded-full animate-orbit-reverse" />
              
              <button 
                onClick={state === "IDLE" ? startSystem : undefined}
                className="relative w-64 h-64 rounded-full flex items-center justify-center transition-all duration-700 group overflow-hidden"
                style={{ 
                  boxShadow: `0 0 ${40 + volume * 100}px ${activeColor}30`,
                  border: `1px solid ${activeColor}40`,
                  background: `radial-gradient(circle, ${activeColor}10 0%, transparent 80%)`
                }}
              >
                <div className="z-10 text-center">
                  <div className="text-[10px] tracking-[0.8em] text-white/30 uppercase mb-4">{state}</div>
                  <div className="w-12 h-12 mx-auto rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                    <LucideMic className={state !== 'IDLE' ? "text-cyan-400" : "text-gray-600"} size={20} />
                  </div>
                </div>
                <div className="absolute inset-0 neural-pulse rounded-full" style={{ backgroundColor: activeColor + '05' }} />
              </button>
            </div>

            <div className="mt-16 text-center max-w-md px-4">
              <p className="text-xl md:text-2xl font-light tracking-tight text-white/90 italic transition-all duration-500">
                {status}
              </p>
            </div>
          </div>

          {/* RIGHT: MODULES */}
          <div className="col-span-12 lg:col-span-3 space-y-6">
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 group hover:bg-cyan-500/[0.03] transition-all">
              <LucideLayers className="text-cyan-500/50 mb-4" size={20} />
              <h4 className="text-[11px] font-bold tracking-widest uppercase mb-2">Memory_Array</h4>
              <p className="text-[10px] text-gray-500 leading-relaxed">Neural patterns synced to local cloud.</p>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 group hover:bg-purple-500/[0.03] transition-all">
              <LucideZap className="text-purple-500/50 mb-4" size={20} />
              <h4 className="text-[11px] font-bold tracking-widest uppercase mb-2">Instant_Bridge</h4>
              <p className="text-[10px] text-gray-500 leading-relaxed">Direct hardware control active.</p>
            </div>

            <button className="w-full p-6 rounded-2xl border border-red-500/20 bg-red-500/5 flex items-center justify-between group hover:bg-red-500/10 transition-all">
              <span className="text-[10px] font-bold tracking-widest text-red-500/80 uppercase">Hibernation</span>
              <LucidePower size={16} className="text-red-500/50 group-hover:rotate-90 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      <footer className="mt-20 py-8 text-center border-t border-white/5">
        <p className="text-[9px] tracking-[0.8em] text-gray-700 uppercase italic">Keyur Bele // Neural Interface v2.0</p>
      </footer>
    </main>
  );
}
