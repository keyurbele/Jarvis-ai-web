"use client";
import { useState } from "react";
import { LucideMic, LucideHome, LucideLoader2 } from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [response, setResponse] = useState("");

  // --- BRAIN LOGIC: Talking to the API ---
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
      setResponse(data.reply);
      
      // VOICE OUT: Make Jarvis speak the reply
      const utterance = new SpeechSynthesisUtterance(data.reply);
      utterance.onend = () => setIsThinking(false);
      window.speechSynthesis.speak(utterance);
      
    } catch (error) {
      console.error("Jarvis Communication Error:", error);
      setIsThinking(false);
    }
  };

  // --- EAR LOGIC: Microphone Access (FIXED FOR TYPESCRIPT) ---
  const startListening = () => {
    // bypasses the Property 'SpeechRecognition' does not exist error
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert("Voice interface is not supported in this browser. Please try Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      setResponse(""); // Reset response for new interaction
    };
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      handleChat(transcript); 
    };

    recognition.onerror = (event: any) => {
      console.error("Mic Error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  return (
    <main className="min-h-screen bg-[#050A18] flex flex-col items-center justify-center relative overflow-hidden text-white font-sans">
      {/* Immersive Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(17,24,39,1)_0%,rgba(2,6,23,1)_100%)]" />

      {/* Nav */}
      <nav className="absolute top-0 w-full p-8 flex justify-between items-center z-50">
        <Link href="/" className="text-blue-500/40 hover:text-blue-400 font-mono text-[10px] tracking-widest transition-all">
          EXIT_INTERFACE
        </Link>
      </nav>

      {/* --- THE NEURAL ORB --- */}
      <div 
        onClick={!isListening && !isThinking ? startListening : undefined}
        className={`relative w-80 h-80 cursor-pointer group z-30 transition-transform duration-500 ${isListening ? 'scale-110' : 'scale-100'}`}
      >
        {/* Outer Glass Shell */}
        <div className={`absolute inset-0 rounded-full border border-white/20 z-40 overflow-hidden transition-all duration-700
          ${isListening ? 'shadow-[0_0_100px_rgba(34,211,238,0.4)]' : 'shadow-[0_0_50px_rgba(59,130,246,0.1)]'}`}>
          <div className="absolute top-[10%] left-[15%] w-1/3 h-1/4 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-sm" />
        </div>

        {/* Swirling Plasma (Energy Tendrils) */}
        <div className={`absolute inset-4 rounded-full z-10 transition-opacity duration-1000 ${isListening || isThinking ? 'opacity-100' : 'opacity-30'}`}>
          <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-cyan-400/60 blur-[2px] animate-[spin_2s_linear_infinite]" />
          <div className="absolute inset-4 rounded-full border-[2px] border-transparent border-l-purple-500/50 blur-[3px] animate-[spin_3s_linear_infinite_reverse]" />
          <div className="absolute inset-8 rounded-full border-[1px] border-transparent border-r-blue-400/40 blur-[1px] animate-[spin_1.5s_linear_infinite]" />
        </div>

        {/* Central Core */}
        <div className={`absolute inset-[35%] rounded-full z-10 blur-2xl transition-all duration-700 
          ${isListening ? 'bg-cyan-400 shadow-[0_0_60px_#22d3ee]' : isThinking ? 'bg-purple-500 animate-pulse shadow-[0_0_60px_#a855f7]' : 'bg-blue-600/20'}`} 
        />
        
        {/* Interaction Icon */}
        <div className="absolute inset-[42%] rounded-full z-50 border border-white/30 bg-white/5 backdrop-blur-md flex items-center justify-center">
           {isThinking ? (
             <LucideLoader2 className="text-purple-400 animate-spin" size={32} />
           ) : (
             <LucideMic className={isListening ? "text-cyan-400 animate-pulse" : "text-blue-900/40"} size={32} />
           )}
        </div>

        {/* Inner Shadow Depth */}
        <div className="absolute inset-0 rounded-full shadow-[inset_0_0_100px_rgba(59,130,246,0.2)] z-10" />
      </div>

      {/* --- RESPONSE & STATUS --- */}
      <div className="mt-16 text-center z-50 px-8 max-w-2xl">
        <p className={`font-mono text-xs tracking-[0.5em] mb-8 transition-colors duration-500 ${isListening ? 'text-cyan-400' : isThinking ? 'text-purple-400' : 'text-blue-900'}`}>
          {isListening ? "LISTENING_VOICE_FEED" : isThinking ? "NEURAL_PROCESSING" : "READY_FOR_INPUT"}
        </p>

        {response && (
          <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-lg animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <p className="text-blue-100 font-light text-lg leading-relaxed italic">
              "{response}"
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
