"use client";
import { useState, useEffect } from "react";
import { LucideMic, LucidePower, LucideHome } from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
  const [isListening, setIsListening] = useState(false);

  return (
    <main className="min-h-screen bg-[#020617] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full" />

      {/* Top Navigation */}
      <nav className="absolute top-0 w-full p-6 flex justify-between items-center text-white/50">
        <Link href="/" className="hover:text-white transition-colors flex items-center gap-2 font-mono text-xs uppercase tracking-widest">
          <LucideHome size={16} /> Exit_Core
        </Link>
        <div className="font-mono text-[10px] uppercase tracking-[0.3em]">Neural_Link: Stable</div>
      </nav>

      {/* THE NEURAL ORB */}
      <div className="relative flex items-center justify-center group">
        {/* Outer Ring 1 */}
        <div className={`absolute w-[400px] h-[400px] border border-blue-500/10 rounded-full animate-[spin_10s_linear_infinite] ${isListening ? 'border-blue-400/40' : ''}`} />
        
        {/* Outer Ring 2 */}
        <div className={`absolute w-[350px] h-[350px] border border-purple-500/20 rounded-full animate-[spin_15s_linear_infinite_reverse] ${isListening ? 'border-purple-400/40' : ''}`} />

        {/* The Glow Core */}
        <div 
          className={`relative w-64 h-64 rounded-full flex items-center justify-center transition-all duration-1000 bg-black border border-white/10 shadow-2xl overflow-hidden cursor-pointer
          ${isListening ? 'scale-110 shadow-[0_0_100px_rgba(59,130,246,0.5)]' : 'shadow-[0_0_50px_rgba(59,130,246,0.1)]'}`}
          onClick={() => setIsListening(!isListening)}
        >
          {/* Internal Moving Gradient */}
          <div className={`absolute inset-0 opacity-30 bg-gradient-to-tr from-blue-600 via-purple-600 to-transparent animate-[pulse_3s_infinite]`} />
          
          {/* Glass Overlay */}
          <div className="absolute inset-0 backdrop-blur-[2px]" />

          <div className="z-10 flex flex-col items-center gap-4">
            <LucideMic className={isListening ? "text-blue-400 scale-125 transition-transform" : "text-gray-600"} size={48} />
            <span className="font-mono text-[10px] tracking-[0.4em] text-white/40 uppercase">
              {isListening ? "Listening..." : "Core_Idle"}
            </span>
          </div>
        </div>

        {/* Floating Particles (Simulated with CSS) */}
        <div className="absolute -top-10 left-1/2 w-1 h-1 bg-blue-400 rounded-full animate-ping" />
        <div className="absolute top-1/2 -left-10 w-1 h-1 bg-purple-400 rounded-full animate-ping [animation-delay:1s]" />
      </div>

      {/* Status Footer */}
      <div className="absolute bottom-12 flex flex-col items-center gap-2">
        <div className="flex gap-2">
           {[1, 2, 3, 4, 5].map((i) => (
             <div key={i} className={`w-1 h-8 rounded-full bg-blue-500/20 ${isListening ? 'animate-[bounce_1s_infinite]' : ''}`} style={{ animationDelay: `${i * 0.1}s` }} />
           ))}
        </div>
        <p className="text-[#475569] font-mono text-[10px] mt-4 uppercase tracking-widest">Biometric_Feed: Active</p>
      </div>
    </main>
  );
}
