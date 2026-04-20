"use client";
import { useState, useEffect } from "react";

export default function Home() {
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState("Ready for orders, Sir.");
  const [jarvisIsSpeaking, setJarvisIsSpeaking] = useState(false);

  // 🗣️ JARVIS VOICE OUTPUT
  const speak = (text: string) => {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    
    const speech = new SpeechSynthesisUtterance(text);
    
    speech.onstart = () => setJarvisIsSpeaking(true);
    speech.onend = () => {
      setTimeout(() => setJarvisIsSpeaking(false), 600);
    };

    speech.rate = 0.88;
    speech.pitch = 0.9;

    const voices = window.speechSynthesis.getVoices();
    const jarvisVoice = voices.find((v) =>
      v.name.includes("Google UK English Male") ||
      v.name.includes("Microsoft James") ||
      v.name.includes("Arthur")
    );
    if (jarvisVoice) speech.voice = jarvisVoice;
    window.speechSynthesis.speak(speech);
  };

  // 🧠 AI BRAIN
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

  // 🎯 INTENT DETECTOR
  const handleInput = async (text: string) => {
    const lower = text.toLowerCase();
    const rawMemory = typeof window !== "undefined" ? localStorage.getItem("jarvis_memory") || "" : "";

    if (lower.includes("stop") || lower.includes("be quiet") || lower.includes("shut up")) {
      window.speechSynthesis.cancel();
      setJarvisIsSpeaking(false);
      setStatus("As you wish, Sir.");
      return;
    }

    if (lower.includes("remember") || lower.includes("note that") || lower.includes("my name is")) {
      const updatedMemory = rawMemory + ". " + text;
      localStorage.setItem("jarvis_memory", updatedMemory);
      setStatus("Saved to memory, Sir.");
      speak("I've made a note of that, Sir.");
      return;
    }

    askJarvisAI(text, rawMemory);
  };

  // 🎤 MICROPHONE INPUT
  const startListening = () => {
    if (typeof window === "undefined") return;

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) return alert("Use Chrome, Sir.");

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true; // ⚡ CRITICAL FOR INTERRUPTS

    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcriptChunk = event.results[i][0].transcript.toLowerCase();
        
        // 🔊 INTERRUPT CHECK (Checks even while you are mid-sentence)
        if (window.speechSynthesis.speaking || jarvisIsSpeaking) {
          const interruptWords = ["jarvis", "stop", "shut up", "wait", "listen"];
          if (interruptWords.some(word => transcriptChunk.includes(word))) {
            window.speechSynthesis.cancel();
            setJarvisIsSpeaking(false);
            setStatus("Listening, Sir...");
            return; 
          }
        }

        if (event.results[i].isFinal) {
          setStatus(`You: "${transcriptChunk}"`);
          handleInput(transcriptChunk);
        }
      }
    };

    recognition.onend = () => {
      // Auto-restart listening
      recognition.start();
    };

    recognition.start();
    setStatus("System Online, Sir.");
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
