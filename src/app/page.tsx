"use client";
import { useState } from "react";

export default function Home() {
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState("Ready for orders, Sir.");

  // 🗣️ JARVIS VOICE OUTPUT
  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text);

    speech.rate = 0.88; 
    speech.pitch = 0.9; 
    speech.volume = 1;

    const setVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const jarvisVoice = voices.find(v => 
        v.name.includes("Google UK English Male") || 
        v.name.includes("Microsoft James") || 
        v.name.includes("Arthur") || 
        v.name.includes("Daniel")
      );

      if (jarvisVoice) speech.voice = jarvisVoice;
      window.speechSynthesis.speak(speech);
    };

    if (window.speechSynthesis.getVoices().length !== 0) {
      setVoice();
    } else {
      window.speechSynthesis.onvoiceschanged = setVoice;
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
      setStatus("System error. Check your connection.");
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
      setStatus("I didn't catch that.");
      setActive(false);
    };

    recognition.start();
  };

  return (
    <main className="h-screen w-full bg-black flex flex-col items-center justify-center text-white p-4">
      
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
          <div className="absolute inset-0 rounded-full border-t-2 border-white animate-spin opacity-50" />
        )}
        
        {/* Inner core */}
        <div className={`w-12 h-12 rounded-full bg-white opacity-20 ${active ? "animate-ping" : "hidden"}`} />
      </div>
      
      {/* STATUS DISPLAY */}
      <p className="text-2xl font-mono text-blue-400 mb-10 text-center max-w-2xl min-h-[3rem]">
        {status}
      </p>

      {/* VOICE TRIGGER */}
      <button 
        onClick={startListening}
        className="px-12 py-5 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-500 transition-all active:scale-95 shadow-[0_0_20px_rgba(59,130,246,0.5)]"
      >
        TALK TO JARVIS
      </button>
    </main>
  );
}
