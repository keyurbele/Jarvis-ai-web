"use client";
import { useState, useEffect, useRef } from "react";
import { LucideMic, LucideHome, LucideLoader2, LucideBrain, LucideZap, LucideShieldCheck } from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [response, setResponse] = useState("");
  const recognitionRef = useRef<any>(null);

  // --- BRAIN LOGIC ---
  const handleChat = async (transcript: string) => {
    setIsThinking(true);
    
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: transcript }),
      });
      
      const data = await res.json();
      
      // Clean up the reply: Remove "SYSTEM_REPLY:" if the API is sending it
      const cleanReply = data.reply.replace(/SYSTEM_REPLY:|Action for|logged and confirmed/gi, "").trim();
      setResponse(cleanReply);
      
      const utterance = new SpeechSynthesisUtterance(cleanReply);
      utterance.onend = () => {
        setIsThinking(false);
        // RE-START LISTENING automatically so he stays "On"
        if (isListening) startListening(); 
      };
      window.speechSynthesis.speak(utterance);
      
    } catch (error) {
      console.error("Jarvis Error:", error);
      setIsThinking(false);
    }
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (!recognitionRef.current) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false; // We handle the "staying on" logic in the utterance end
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        handleChat(transcript);
      };

      recognitionRef.current.onend = () => {
        // If we're not thinking or speaking, keep the mic warm
        if (isListening && !isThinking) recognitionRef.current.start();
      };
    }

    setIsListening(true);
    recognitionRef.current.start();
  };

  const stopSystem = () => {
    setIsListening(false);
    if (recognitionRef.current) recognitionRef.current.stop();
    window.speechSynthesis.cancel();
  };

  return (
    <main className="min-h-screen bg-[#050A18] flex flex-col items-center justify-center relative overflow-hidden text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(17,24,39,1)_0%,rgba(2,6,23,1)_100%)]" />

      {/* memory/stats bar */}
      <div className="absolute top-24 flex gap-8 z-50">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/5 border border-blue-500/20">
          <LucideBrain size={14} className="text-blue-400" />
          <span className="text-[10px] font-mono tracking-widest text-blue-400/70">MEMORY: ACTIVE</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/5 border border-purple-500/20">
          <LucideZap size={14} className="text-purple-400" />
          <span className="text-[10px] font-mono tracking-widest text-purple-400/70">LATENCY: 0.02ms</span>
        </div>
      </div>

      {/* THE ORB */}
      <div 
        onClick={isListening ? stopSystem : startListening}
        className="relative w-80 h-80 cursor-pointer z-30"
      >
        <div className={`absolute inset-0 rounded-full border border-white/20 z-40 transition-all duration-700
          ${isListening ? 'shadow-[0_0_100px_rgba(34,211,238,0.4)] border-cyan-400/40' : 'shadow-[0_0_40px_rgba(59,130,246,0.1)]'}`}>
          <div className="absolute top-[10%] left-[15%] w-1/3 h-1/4 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-sm" />
        </div>

        {/* Swirling Energy */}
        <div className={`absolute inset-4 rounded-full z-10 transition-opacity duration-1000 ${isListening || isThinking ? 'opacity-100' : 'opacity-20'}`}>
          <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-cyan-400/60 blur-[2px] animate-[spin_2s_linear_infinite]" />
          <div className="absolute inset-4 rounded-full border-[2px] border-transparent border-l-purple-500/50 blur-[3px] animate-[spin_3s_linear_infinite_reverse]" />
        </div>

        <div className={`absolute inset-[35%] rounded-full z-10 blur-2xl transition-all duration-700 
          ${isListening ? 'bg-cyan-400' : isThinking ? 'bg-purple-500 animate-pulse' : 'bg-blue-900/20'}`} 
        />
        
        <div className="absolute inset-[42%] rounded-full z-50 border border-white/10 bg-white/5 backdrop-blur-md flex items-center justify-center">
           {isThinking ? <LucideLoader2 className="animate-spin text-purple-400" size={32} /> : <LucideMic className={isListening ? "text-cyan-400" : "text-blue-900/40"} size={32} />}
        </div>
      </div>

      <div className="mt-16 text-center z-50 px-8">
        <p className="font-mono text-[10px] tracking-[0.5em] text-blue-500/50 uppercase mb-8">
          {isListening ? "NEURAL_LINK_ESTABLISHED" : "CORE_STANDBY"}
        </p>
        {response && (
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4">
            <p className="text-blue-100/90 font-light text-lg italic italic">"{response}"</p>
          </div>
        )}
      </div>
    </main>
  );
}
