"use client";
import { useState } from "react";

export default function Home() {
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState("Ready for orders, Sir.");

  // 🗣️ JARVIS VOICE OUTPUT (Natural Human-like Tuning)
 // Inside your Home component in page.tsx

const askJarvis = async (input: string) => {
  setActive(true);
  setStatus("Thinking...");

  // 1. Get existing memories from the browser's disk
  const rawMemory = localStorage.getItem("jarvis_memory") || "";
  
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // We send the memory ALONG with the new message
      body: JSON.stringify({ message: input, memory: rawMemory }),
    });

    const data = await res.json();
    setStatus(data.reply);
    speak(data.reply);

    // 2. SECRET SAUCE: If you said "Remember...", save it locally!
    if (input.toLowerCase().includes("remember") || input.toLowerCase().includes("my name is")) {
      const updatedMemory = rawMemory + ". " + input;
      localStorage.setItem("jarvis_memory", updatedMemory);
      console.log("Memory Updated:", updatedMemory);
    }

  } catch (error) {
    setStatus("System error, Sir.");
  } finally {
    setActive(false);
  }
};

  // 🧠 AI REQUEST HANDLER
  const askJarvis = async (input: string) => {
    setActive(true);
    setStatus("Thinking...");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });

      const data = await res.json();
      setStatus(data.reply);
      speak(data.reply); 
    } catch (error) {
      setStatus("System error, Sir. I'm unable to connect.");
    } finally {
      setActive(false);
    }
  };

  // 🎤 MICROPHONE INPUT
  const startListening = () => {
    const SpeechRecognition =
      (window as any).webkitSpeechRecognition ||
      (window as any).SpeechRecognition;

    if (!SpeechRecognition) {
      alert("Please use Chrome for voice features.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    setStatus("Listening...");
    setActive(true);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setStatus(`You: "${transcript}"`);
      askJarvis(transcript);
    };

    recognition.onerror = () => {
      setStatus("I didn't catch that, Sir.");
      setActive(false);
    };

    recognition.start();
  };

  return (
    <main className="h-screen w-full bg-black flex flex-col items-center justify-center text-white p-4 overflow-hidden">
      
      {/* 🧿 THE HIGH-TECH ANIMATED ORB */}
      <div 
        className={`w-48 h-48 rounded-full transition-all duration-700 mb-10 border-4 relative flex items-center justify-center ${
          active 
          ? "bg-cyan-500 shadow-[0_0_80px_#22d3ee] scale-110 animate-pulse border-white/20" 
          : "bg-slate-900 shadow-[0_0_20px_#000] border-cyan-900/50"
        }`} 
      >
        {/* Spinning inner ring */}
        {active && (
          <div className="absolute inset-0 rounded-full border-t-2 border-white animate-spin opacity-40" />
        )}
        
        {/* Pulsing Core */}
        <div className={`w-16 h-16 rounded-full bg-white opacity-10 ${active ? "animate-ping" : "hidden"}`} />
      </div>
      
      {/* STATUS DISPLAY */}
      <div className="min-h-[4rem] flex items-center justify-center">
        <p className="text-2xl font-mono text-cyan-400 mb-10 text-center max-w-2xl tracking-tight">
          {status}
        </p>
      </div>

      {/* VOICE TRIGGER */}
      <button 
        onClick={startListening}
        className="px-12 py-5 bg-transparent border-2 border-cyan-500 text-cyan-400 rounded-full font-bold hover:bg-cyan-500 hover:text-black transition-all active:scale-95 shadow-[0_0_15px_rgba(34,211,238,0.3)]"
      >
        INITIALIZE COMMAND
      </button>
    </main>
  );
}
