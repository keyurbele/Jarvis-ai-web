"use client";
import { useState, useRef, useEffect } from "react";
import { LucideMic, LucideLoader2, LucideBrain, LucideZap } from "lucide-react";

export default function Dashboard() {
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [response, setResponse] = useState("");
  const recognitionRef = useRef<any>(null);

  // --- RESTART MIC FUNCTION ---
  const restartMic = () => {
    if (!isListening) return;
    try {
      if (recognitionRef.current) recognitionRef.current.stop();
      setTimeout(() => {
        recognitionRef.current.start();
      }, 300);
    } catch (e) {
      console.log("Mic restart attempt...");
    }
  };

  // --- SPEAK FUNCTION ---
  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;

    utterance.onstart = () => {
      setIsThinking(true);
      if (recognitionRef.current) recognitionRef.current.abort(); // Kill mic while talking
    };

    utterance.onend = () => {
      setIsThinking(false);
      // This is the fix: Restart the whole listening cycle
      if (isListening) restartMic();
    };

    window.speechSynthesis.speak(utterance);
  };

  // --- API HANDLER ---
  const handleChat = async (transcript: string) => {
    if (!transcript) return;
    setIsThinking(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: transcript }),
      });
      const data = await res.json();
      setResponse(data.reply);
      speak(data.reply);
    } catch (e) {
      setIsThinking(false);
      restartMic();
    }
  };

  // --- TOGGLE SYSTEM ---
  const toggleSystem = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (isListening) {
      setIsListening(false);
      if (recognitionRef.current) recognitionRef.current.stop();
      window.speechSynthesis.cancel();
    } else {
      setIsListening(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        handleChat(transcript);
      };

      recognition.onend = () => {
        // If it stops naturally (silence), and we are still "active", restart it
        if (isListening && !isThinking && !window.speechSynthesis.speaking) {
          try { recognition.start(); } catch (e) {}
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    }
  };

  return (
    <main className="min-h-screen bg-[#020617] flex flex-col items-center justify-center relative overflow-hidden text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(15,23,42,1)_0%,rgba(2,6,23,1)_100%)]" />
      
      <div className="z-50 mb-8 flex gap-4">
        <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg font-mono text-[10px] text-cyan-400">
          SYSTEM: {isListening ? "ACTIVE" : "OFFLINE"}
        </div>
      </div>

      <div onClick={toggleSystem} className="relative w-64 h-64 cursor-pointer z-20 group">
        <div className={`absolute inset-0 rounded-full border border-cyan-500/20 transition-all duration-700 ${isListening ? 'animate-pulse shadow-[0_0_50px_rgba(34,211,238,0.2)]' : ''}`} />
        <div className={`absolute inset-[10%] rounded-full transition-all duration-700 ${isThinking ? 'bg-purple-500/40 blur-2xl animate-ping' : isListening ? 'bg-cyan-500/20 blur-xl' : 'bg-white/5'}`} />
        <div className="absolute inset-0 flex items-center justify-center">
          {isThinking ? <LucideLoader2 className="animate-spin text-purple-400" size={40} /> : <LucideMic className={isListening ? "text-cyan-400" : "text-white/20"} size={40} />}
        </div>
      </div>

      <div className="mt-12 max-w-lg text-center z-50">
        {response && (
          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
            <p className="text-lg font-light italic">"{response}"</p>
          </div>
        )}
      </div>
    </main>
  );
}
