"use client";
import { useState } from "react";
import Link from "next/link";
import { 
  SignInButton, 
  UserButton, 
  SignedOut, 
  SignedIn 
} from "@clerk/nextjs";
import { 
  LucideBrain, LucideZap, LucideCpu, 
  LucideChevronRight, LucideShieldCheck, LucideGlobe
} from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#020617] text-[#F9FAFB] font-sans selection:bg-blue-500/30 overflow-x-hidden">
      
      {/* 🧭 NAV BAR */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 backdrop-blur-xl bg-[#020617]/50">
        <div className="max-w-7xl mx-auto px-6 h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-500 rounded-lg flex items-center justify-center">
              <LucideCpu size={18} className="text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">JARVIS</span>
          </div>
          
          <div className="flex items-center gap-4">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm font-medium transition-all">
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </div>
        </div>
      </nav>

      {/* 🚀 HERO SECTION */}
      <section className="relative pt-32 pb-20 px-6 min-h-screen flex items-center">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-blue-600/10 blur-[120px] rounded-full -z-10" />
        
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold mb-6">
              <LucideZap size={14} /> v2.0 NEURAL INTERFACE
            </div>
            <h1 className="text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6 text-white">
              Build smarter. <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">
                Ship faster.
              </span>
            </h1>
            <p className="text-lg text-slate-400 max-w-lg mb-10 leading-relaxed font-light">
              Experience the next generation of voice-controlled system automation. Professional, secure, and built for modern workflows.
            </p>
            
            <div className="flex flex-wrap gap-4">
              <Link href="/dashboard">
                <button className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl font-bold flex items-center gap-2 hover:scale-[1.02] transition-all shadow-xl shadow-blue-500/20 group">
                  Launch System <LucideChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
            </div>
          </div>

          {/* TERMINAL MOCKUP */}
          <div className="relative group hidden lg:block">
             <div className="absolute -inset-4 bg-gradient-to-r from-purple-500 to-blue-500 opacity-20 blur-2xl group-hover:opacity-30 transition-opacity" />
             <div className="relative bg-[#0F172A] border border-white/10 rounded-2xl p-4 shadow-2xl">
                <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-3">
                  <div className="w-2 h-2 rounded-full bg-red-500/50" />
                  <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                  <div className="w-2 h-2 rounded-full bg-green-500/50" />
                  <span className="ml-2 text-[9px] text-slate-500 font-mono tracking-widest uppercase">system_status.log</span>
                </div>
                <div className="h-64 bg-[#020617] rounded-lg p-4 font-mono text-xs space-y-2 overflow-hidden">
                  <p className="text-blue-400">{">"} INITIALIZING_NEURAL_CORE...</p>
                  <p className="text-purple-400">{">"} CONNECTION_ESTABLISHED: NODE_TX_04</p>
                  <p className="text-emerald-400">{">"} STATUS: OPTIMAL</p>
                  <p className="text-slate-600">{">"} Awaiting voice command...</p>
                  <div className="pt-4">
                    <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className="w-2/3 h-full bg-blue-500 animate-pulse" />
                    </div>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* ⚡ FEATURES GRID (Restored and Cleaned) */}
      <section className="py-24 px-6 max-w-7xl mx-auto border-t border-white/5">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Engineered for Excellence</h2>
          <p className="text-slate-500 font-light">High-performance system controller that responds in milliseconds.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: <LucideBrain />, title: "Neural Memory", desc: "Learns and adapts to your workflow preferences." },
            { icon: <LucideZap />, title: "Zero Latency", desc: "Instant command execution bypassing AI delays." },
            { icon: <LucideShieldCheck />, title: "Enterprise Security", desc: "End-to-end encryption for all interactions." }
          ].map((f, i) => (
            <div key={i} className="p-8 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-blue-500/30 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform">
                {f.icon}
              </div>
              <h3 className="text-xl font-bold mb-3">{f.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
