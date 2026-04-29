"use client";
import { useState, useRef, useEffect } from "react";
import { 
  SignInButton, 
  UserButton, 
  SignedOut, 
  SignedIn 
} from "@clerk/nextjs";
import { 
  LucideBrain, LucideMic, LucideZap, LucideTerminal, 
  LucideCpu, LucideLayers, LucidePower, LucideCheckCircle, 
  LucideChevronRight, LucideShieldCheck, LucideGlobe
} from "lucide-react";

type JarvisState = "IDLE" | "LISTENING" | "THINKING" | "SPEAKING";

export default function Home() {
  const [state, setState] = useState<JarvisState>("IDLE");
  const [status, setStatus] = useState("CORE_READY");
  const stateRef = useRef<JarvisState>("IDLE");

  useEffect(() => { stateRef.current = state; }, [state]);

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text);
    speech.onstart = () => setState("SPEAKING");
    speech.onend = () => { if (stateRef.current === "SPEAKING") setState("LISTENING"); };
    window.speechSynthesis.speak(speech);
  };

  const startSystem = () => {
    setState("LISTENING");
    setStatus("LISTENING_FOR_INPUT");
  };

  const activeColor = { 
    LISTENING: "#3B82F6", 
    THINKING: "#8B5CF6",  
    SPEAKING: "#F9FAFB",  
    IDLE: "#1F2A44"       
  }[state];

  return (
    <main className="min-h-screen bg-[#0B0F1A] text-[#F9FAFB] font-sans selection:bg-blue-500/30 overflow-x-hidden">
      
      {/* 🧭 PREMIUM NAVBAR */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 backdrop-blur-xl bg-[#0B0F1A]/50">
        <div className="max-w-7xl mx-auto px-6 h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-[#8B5CF6] to-[#3B82F6] rounded-lg flex items-center justify-center">
              <LucideCpu size={18} className="text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">JARVIS</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#9CA3AF]">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#demo" className="hover:text-white transition-colors">Interface</a>
            <a href="#" className="hover:text-white transition-colors">Docs</a>
          </div>

          <div className="flex items-center gap-4">
            {/* 🔐 CLERK AUTH BUTTONS */}
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-5 py-2.5 bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] rounded-full text-sm font-bold hover:brightness-110 transition-all shadow-lg shadow-blue-500/20">
                  Get Started
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
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
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
              Build smarter. <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6]">
                Ship faster.
              </span>
            </h1>
            <p className="text-lg text-[#9CA3AF] max-w-lg mb-10 leading-relaxed font-light">
              Experience the next generation of voice-controlled system automation. Professional, secure, and built for modern workflows.
            </p>
            <div className="flex flex-wrap gap-4">
              <button onClick={startSystem} className="px-8 py-4 bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] rounded-xl font-bold flex items-center gap-2 hover:scale-[1.02] transition-all shadow-xl shadow-purple-500/10">
                Launch System <LucideChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* HERO UI MOCKUP */}
          <div className="relative group">
             <div className="absolute -inset-4 bg-gradient-to-r from-purple-500 to-blue-500 opacity-20 blur-2xl group-hover:opacity-30 transition-opacity" />
             <div className="relative bg-[#141C2F] border border-white/10 rounded-2xl p-4 shadow-2xl overflow-hidden">
                <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-3">
                  <div className="w-3 h-3 rounded-full bg-red-500/50" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                  <div className="w-3 h-3 rounded-full bg-green-500/50" />
                  <div className="ml-4 text-[10px] text-gray-500 font-mono tracking-widest uppercase">Jarvis_Terminal.exe</div>
                </div>
                <div className="h-64 bg-[#0B0F1A] rounded-lg border border-white/5 p-4 font-mono text-xs text-blue-400 space-y-2">
                  <p>{">"} INITIALIZING_NEURAL_CORE...</p>
                  <p className="text-purple-400">{">"} CONNECTION_ESTABLISHED: SIENNA_NODE_TX</p>
                  <p className="text-green-400">{">"} STATUS: OPTIMAL</p>
                  <div className="w-1/2 h-1 bg-blue-500/20 rounded-full mt-4 overflow-hidden">
                    <div className="w-2/3 h-full bg-blue-500 animate-[pulse_2s_infinite]" />
                  </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* ⚡ FEATURES GRID */}
      <section id="features" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Engineered for Excellence</h2>
          <p className="text-[#9CA3AF] max-w-2xl mx-auto">High-performance system controller that responds to your voice in milliseconds.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: <LucideBrain />, title: "Neural Memory", desc: "Learns and adapts to your workflow preferences." },
            { icon: <LucideZap />, title: "Zero Latency", desc: "Instant command execution bypassing AI delays." },
            { icon: <LucideShieldCheck />, title: "Enterprise Security", desc: "End-to-end encryption for all interactions." }
          ].map((f, i) => (
            <div key={i} className="p-8 rounded-2xl bg-[#141C2F] border border-white/5 hover:border-blue-500/30 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform">
                {f.icon}
              </div>
              <h3 className="text-xl font-bold mb-3">{f.title}</h3>
              <p className="text-[#9CA3AF] text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 🧪 INTERACTIVE INTERFACE SECTION */}
      <section id="demo" className="py-24 px-6 bg-white/[0.01] border-y border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col items-center">
            <button 
              onClick={startSystem}
              className="relative w-64 h-64 rounded-full flex items-center justify-center transition-all duration-700 bg-[#141C2F] border border-white/10 group"
              style={{ boxShadow: `0 0 50px ${activeColor}30` }}
            >
              <div className="z-10 text-center">
                <div className="text-[10px] tracking-[0.5em] text-[#9CA3AF] uppercase mb-4">{state}</div>
                <LucideMic className={state !== 'IDLE' ? "text-blue-400" : "text-gray-600"} size={32} />
              </div>
              <div className="absolute inset-0 bg-blue-500/5 rounded-full animate-pulse" />
            </button>
        </div>
      </section>
    </main>
  );
}
