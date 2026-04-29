"use client";
import { useState, useEffect } from "react";
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
      
      // VOICE OUT: Make Jarvis speak
      const utterance = new SpeechSynthesisUtterance(data.reply);
      utterance.onend = () => setIsThinking(false);
      window.speechSynthesis.speak(utterance);
      
    } catch (error) {
      console.error("Jarvis Error:", error);
      setIsThinking(false);
    }
  };

  // --- EAR LOGIC: Microphone Access ---
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Browser not supported");

    const recognition = new SpeechRecognition();
    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      handleChat(transcript); // Send what you said to the brain
    };

    recognition.onerror = () => setIsListening(false);
    recognition.start();
  };

  return (
    <main className="min-h-screen bg-[#050A18] flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(17,24,39,1)_0%,rgba(2,6,23,1)_100%)]" />

      {/* THE NEURAL ORB */}
      <div 
        onClick={!isListening && !isThinking ? startListening : undefined}
        className="relative w-80 h-80 cursor-pointer group z-30"
      >
        <div className={`absolute inset-0 rounded-full border border-white/20 transition-all duration-500 z-20 
          ${isListening ? 'shadow-[0_0_100px_rgba(34,211,238,0.4)] scale-110' : ''}`} 
        />

        {/* Plasma Tendrils */}
        <div className={`absolute inset-4 rounded-full z-10 transition-opacity duration-1000 ${isListening || isThinking ? 'opacity-100' : 'opacity-30'}`}>
          <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-cyan-400 blur-[2px] animate-[spin_2s_linear_infinite]" />
          <div className="absolute inset-4 rounded-full border-[2px] border-transparent border-l-purple-500 blur-[3px] animate-[spin_3s_linear_infinite_reverse]" />
        </div>

        {/* Inner Core */}
        <div className={`absolute inset-[35%] rounded-full z-10 blur-xl transition-all duration-700 
          ${isListening ? 'bg-cyan-400' : isThinking ? 'bg-purple-500 animate-pulse' : 'bg-blue-600/20'}`} 
        />
        
        <div className="absolute inset-[42%] rounded-full z-30 border border-white/30 bg-white/5 backdrop-blur-md flex items-center justify-center">
           {isThinking ? <LucideLoader2 className="text-purple-400 animate-spin" size={32} /> : <LucideMic className={isListening ? "text-cyan-400" : "text-blue-900/40"} size={32} />}
        </div>
      </div>

      {/* Status & Response */}
      <div className="mt-12 text-center z-50 px-6 max-w-lg">
        <p className="font-mono text-[10px] tracking-[0.5em] text-blue-500/50 uppercase mb-4">
          {isListening ? "Listening..." : isThinking ? "Processing..." : "Tap to Speak"}
        </p>
        {response && (
          <div className="p-4 rounded-lg bg-white/5 border border-white/10 backdrop-blur-md">
            <p className="text-blue-100 font-light italic">"{response}"</p>
          </div>
        )}
      </div>
    </main>
  );
}
