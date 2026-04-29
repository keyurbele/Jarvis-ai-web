"use client";
import { useState } from "react";
import { LucideMic, LucideHome } from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
  const [isListening, setIsListening] = useState(false);

  return (
    <main className="min-h-screen bg-[#050A18] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Atmosphere */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(17,24,39,1)_0%,rgba(2,6,23,1)_100%)]" />

      <nav className="absolute top-0 w-full p-8 flex justify-between items-center z-50">
        <Link href="/" className="text-blue-500/40 hover:text-blue-400 font-mono text-[10px] tracking-widest transition-all">
          EXIT_INTERFACE
        </Link>
      </nav>

      {/* --- THE NEURAL ORB CONTAINER --- */}
      <div 
        onClick={() => setIsListening(!isListening)}
        className="relative w-80 h-80 cursor-pointer group"
      >
        {/* 1. The Outer Glass Shell */}
        <div className="absolute inset-0 rounded-full border border-white/20 shadow-[0_0_80px_rgba(59,130,246,0.2)] backdrop-blur-[2px] z-20 overflow-hidden">
          {/* Glass Highlight (The Shine) */}
          <div className="absolute top-[10%] left-[15%] w-1/3 h-1/4 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-sm" />
        </div>

        {/* 2. The Plasma Swirls (The Energy Tendrils) */}
        <div className={`absolute inset-4 rounded-full z-10 transition-opacity duration-1000 ${isListening ? 'opacity-100' : 'opacity-40'}`}>
          {/* Cyan Tendril */}
          <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-cyan-400/60 blur-[2px] animate-[spin_3s_linear_infinite]" />
          {/* Purple Tendril */}
          <div className="absolute inset-2 rounded-full border-[2px] border-transparent border-l-purple-500/50 blur-[3px] animate-[spin_4s_linear_infinite_reverse]" />
          {/* Secondary Blue Swirl */}
          <div className="absolute inset-6 rounded-full border-[4px] border-transparent border-b-blue-400/40 blur-[4px] animate-[spin_2.5s_linear_infinite]" />
        </div>

        {/* 3. The Bright Central Core */}
        <div className={`absolute inset-[35%] rounded-full z-10 blur-xl transition-all duration-700 ${isListening ? 'bg-cyan-300 shadow-[0_0_100px_#22d3ee]' : 'bg-blue-600/30'}`} />
        <div className={`absolute inset-[42%] rounded-full z-30 border border-white/30 bg-white/10 backdrop-blur-md flex items-center justify-center transition-all ${isListening ? 'scale-110 shadow-[0_0_30px_rgba(255,255,255,0.8)]' : 'scale-100'}`}>
           <LucideMic size={24} className={isListening ? "text-cyan-400 animate-pulse" : "text-blue-900/50"} />
        </div>

        {/* 4. Internal Glow Shadow */}
        <div className="absolute inset-0 rounded-full shadow-[inset_0_0_100px_rgba(59,130,246,0.3)] z-10" />
      </div>

      {/* UI Status Text */}
      <div className="mt-16 text-center z-50">
        <p className={`font-mono text-xs tracking-[0.6em] transition-all duration-500 ${isListening ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'text-blue-900'}`}>
          {isListening ? "SYSTEM_ONLINE" : "STANDBY_MODE"}
        </p>
        {isListening && (
            <div className="mt-4 flex gap-1 justify-center">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="w-[2px] h-4 bg-cyan-500/50 animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
                ))}
            </div>
        )}
      </div>
    </main>
  );
}
