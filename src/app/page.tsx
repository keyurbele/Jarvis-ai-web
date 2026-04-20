"use client";
import { useState } from "react";

export default function Home() {
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState("Ready for orders, Sir.");
  const [jarvisIsSpeaking, setJarvisIsSpeaking] = useState(false);

  // 🗣️ JARVIS VOICE OUTPUT
  const speak = (text: string) => {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    
    const speech = new SpeechSynthesisUtterance(text);
    
    // 🔒 THE LOCK: Stop Jarvis from hearing himself
    speech.onstart = () => setJarvisIsSpeaking(true);
    speech.onend = () => {
      // Small delay after speaking to let room echoes die down
      setTimeout(() => setJarvisIsSpeaking(false), 600);
    };

    speech.rate = 0.88;
    speech.pitch = 0.9;

    const setVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const jarvisVoice = voices.find((v) =>
        v.name.includes("Google UK English Male") ||
        v.name.includes("Microsoft James") ||
        v.name.includes("Arthur")
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

  // 🧠 AI BRAIN (Groq)
  const askJarvisAI = async (input: string, memory: string) => {
    setActive(true);
    setStatus("Thinking...");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, memory: memory }),
      });

      const data = await res.json();
      setStatus(data.reply);
      speak(data.reply);
    } catch (error) {
      setStatus("System error, Sir.");
    } finally {
      setActive(false);
    }
  };

  // 🎯 INTENT DETECTOR (Decision Layer)
  const handleInput = async (text: string) => {
    const lower = text.toLowerCase();
    const rawMemory = typeof window !== "undefined" ? localStorage.getItem("jarvis_memory") || "" : "";

    // 1. COMMAND: STOP
    if (lower.includes("stop") || lower.includes("be quiet") || lower.includes("shut up")) {
      window.speechSynthesis.cancel();
      setJarvisIsSpeaking(false);
      setStatus("As you wish, Sir.");
      setActive(false);
      return;
    }

    // 2. COMMAND: MEMORY
    if (lower.includes("remember") || lower.includes("note that") || lower.includes("my name is")) {
      const updatedMemory = rawMemory + ". " + text;
      localStorage.setItem("jarvis_memory", updatedMemory);
      setStatus("Saved to memory, Sir.");
      speak("I've made a note of that, Sir.");
      return;
    }

    // 3. DEFAULT: SEND TO AI
    askJarvisAI(text, rawMemory);
  };

  // 🎤 MICROPHONE INPUT (Speaker & Loop Optimized)
  const startListening = () => {
    if (typeof window === "undefined") return;

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) return alert("Use Chrome, Sir.");

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
      const isFinal = event.results[event.results.length - 1].isFinal;

      // 🛡️ THE MASTER FILTER
      if (jarvisIsSpeaking) {
        // If we hear "Stop" or "Jarvis" even while he talks, interrupt him!
        if (transcript.includes("stop") || transcript.includes("jarvis") || transcript.includes("shut up")) {
          window.speechSynthesis.cancel();
          setJarvisIsSpeaking(false);
        }
        return; // Ignore everything else while he speaks
      }

      if (isFinal) {
        setStatus(`You: "${transcript}"`);
        handleInput(transcript); 
      }
    };

    recognition.onend = () => { 
      // Keep ears open unless we explicitly turned off the system
      if (active || status.includes("Ready")) recognition.start(); 
    };

    recognition.start();
  };

  return (
    <main className="h-screen w-full bg-black flex flex-col items-center justify-center text-white p-4 overflow-hidden">
      <div className={`w-48 h-48 rounded-full transition-all duration-700 mb-10 border-4 relative flex items-center justify-center ${
          active || jarvisIsSpeaking ? "bg-cyan-500 shadow-[0_0_80px_#22d3ee] scale-110 animate-pulse border-white/20" : "bg-slate-900 border-cyan-900/50"
        }`}>
        {(active || jarvisIsSpeaking) && <div className="absolute inset-0 rounded-full border-t-2 border-white animate-spin opacity-40" />}
        <div className={`w-16 h-16 rounded-full bg-white opacity-10 ${active || jarvisIsSpeaking ? "animate-ping" : "hidden"}`} />
      </div>

      <div className="min-h-[4rem] flex items-center justify-center">
        <p className="text-2xl font-mono text-cyan-400 mb-10 text-center max-w-2xl tracking-tight">
          {status}
        </p>
      </div>

      <button onClick={startListening} className="px-12 py-5 bg-transparent border-2 border-cyan-500 text-cyan-400 rounded-full font-bold hover:bg-cyan-500 hover:text-black transition-all shadow-[0_0_15px_rgba(34,211,238,0.3)]">
        INITIALIZE COMMAND
      </button>
    </main>
  );
}
