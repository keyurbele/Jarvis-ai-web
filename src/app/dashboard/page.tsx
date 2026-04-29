"use client";
import { useState, useRef, useEffect } from "react";
import { LucideMic, LucideHome, LucideLoader2, LucideBrain, LucideZap, LucideShieldCheck } from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [response, setResponse] = useState("");
  const recognitionRef = useRef<any>(null);

  // 1. FORCED VOICE OUTPUT
  const speak = (text: string) => {
    if (!window.speechSynthesis) return;
    
    // Stop any current talking
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // JARVIS Voice Settings
    utterance.rate = 0.9; 
    utterance.pitch = 1;
    
    utterance.onstart = () => setIsThinking(true);
    utterance.onend = () => {
      setIsThinking(false);
      // Automatically keep listening if we are in "Active" mode
      if (isListening) startListening();
    };

    window.speechSynthesis.speak(utterance);
  };

  // 2. THE BRAIN: API CONNECTION
  const handleChat = async (transcript: string) => {
    setIsListening(false);
    setIsThinking(true);
    
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: transcript }),
      });
      
      const data = await res.json();
      
      // Filter out the technical logs your API is sending
      const cleanReply = data.reply
        .replace(/SYSTEM_REPLY:|Action for|logged and confirmed/gi, "")
        .trim();

      setResponse(cleanReply);
      speak(cleanReply);
      
    } catch (error) {
      console.error("Link Error:", error);
      setIsThinking(false);
    }
  };

  // 3. THE EARS: SPEECH RECOGNITION
  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (!recognitionRef.current) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        handleChat(transcript);
      };

      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => {
        if (isListening && !isThinking) recognitionRef.current.start();
      };
    }

    setIsListening(true);
    recognitionRef.current.start();
  };

  return (
    <main className="min-h-screen bg-[#020617] flex flex-col items-center justify-center relative overflow-hidden text-white selection:bg-cyan-500/30">
      {/* Deep Space Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(15,23,42,1)_0%,rgba(2,6,23,1)_100%)]" />
      
      {/* --- NEURAL MEMORY STATS --- */}
      <div className="absolute top-12 flex gap-6 z-50 animate-in fade-in duration-1000">
        <div className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-500/5 border border-blue-500/10 backdrop-blur-sm">
          <LucideBrain size={14} className="text-cyan-400" />
          <span className="text-[10px] font-mono tracking-[0.2em] text-cyan-400/80">NEURAL_MEMORY: READY</span>
        </div>
        <div className="flex items-center gap-2 px-5 py-2 rounded-xl bg-purple-500/5 border border-purple-500/10 backdrop-blur-sm">
          <LucideZap size={14} className="text-purple-400" />
          <span className="text-[10px] font-mono tracking-[0.2em] text-purple-400/80">LATENCY: 0.01MS</span>
        </div>
      </div>

      <nav className="absolute top-0 w-full p-8 flex justify-between z-50">
        <Link href="/" className="text-blue-500/30 hover:text-blue-400 transition-all font-mono text-[10px] tracking-widest">
          TERMINATE_LINK
        </Link>
      </nav>

      {/* --- THE PLASMA ORB --- */}
      <div 
        onClick={isListening ? () => setIsListening(false) : startListening}
        className="relative w-96 h-96 cursor-pointer group flex items-center justify-center"
      >
        {/* Glass Outer Shell */}
        <div className={`absolute inset-0 rounded-full border border-white/10 z-40 transition-all duration-1000
          ${isListening ? 'shadow-[0_0_120px_rgba(34,211,238,0.3)] border-cyan-400/30' : 'shadow-[0_0_60px_rgba(59,130,246,0.05)]'}`}>
          <div className="absolute top-[10%] left-[20%] w-1/4 h-[15%] bg-white/10 rounded-full blur-md rotate-[30deg]" />
        </div>

        {/* Energy Tendrils (Matches your image vibe) */}
        <div className={`absolute inset-8 rounded-full z-10 transition-opacity duration-700 ${isListening || isThinking ? 'opacity-100' : 'opacity-20'}`}>
          <div className="absolute inset-0 rounded-full border-[2px] border-transparent border-t-cyan-400/80 blur-[1px] animate-[spin_1.5s_linear_infinite]" />
          <div className="absolute inset-4 rounded-full border-[2px] border-transparent border-l-purple-500/60 blur-[2px] animate-[spin_2.5s_linear_infinite_reverse]" />
          <div className="absolute inset-8 rounded-full border-[1px] border-transparent border-b-blue-400/40 blur-[3px] animate-[spin_4s_linear_infinite]" />
        </div>

        {/* The Core Heart */}
        <div className={`absolute inset-[38%] rounded-full z-10 blur-3xl transition-all duration-700 
          ${isListening ? 'bg-cyan-400 shadow-[0_0_80px_#22d3ee]' : isThinking ? 'bg-purple-600 animate-pulse' : 'bg-blue-900/10'}`} 
        />
        
        <div className="absolute inset-[44%] rounded-full z-50 border border-white/20 bg-white/5 backdrop-blur-xl flex items-center justify-center shadow-inner">
           {isThinking ? (
             <LucideLoader2 className="animate-spin text-purple-400" size={32} strokeWidth={1} />
           ) : (
             <LucideMic className={isListening ? "text-cyan-400 drop-shadow-[0_0_8px_#22d3ee]" : "text-blue-900/40"} size={32} strokeWidth={1.5} />
           )}
        </div>
      </div>

      {/* --- DATA LOGS --- */}
      <div className="mt-12 text-center z-50 px-10 max-w-2xl">
        <div className={`mb-4 inline-block font-mono text-[9px] tracking-[0.8em] transition-all duration-500 ${isListening ? 'text-cyan-400' : 'text-blue-900'}`}>
          {isListening ? "LINK_ACTIVE" : isThinking ? "DECRYPTING_DATA" : "LINK_STANDBY"}
        </div>
        
        {response && (
          <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 backdrop-blur-2xl shadow-2xl animate-in zoom-in-95 duration-500">
            <p className="text-blue-50/90 font-light text-xl leading-relaxed italic tracking-wide">
              "{response}"
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
