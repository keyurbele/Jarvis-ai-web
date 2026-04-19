"use client";
import { useState } from "react";

export default function Home() {
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState("Ready for orders, Sir.");

  // 🗣️ JARVIS VOICE OUTPUT
  const speak = (text: string) => {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text);
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

  // 🧠 AI REQUEST HANDLER
  const askJarvis = async (input: string) => {
    // 🛑 STOP COMMAND CHECK (Must be inside the function)
    if (input.toLowerCase() === "stop" || input.toLowerCase() === "be quiet" || input.toLowerCase() === "shut up") {
      window.speechSynthesis.cancel();
      setStatus("As you wish, Sir.");
      setActive(false);
      return; 
    }

    setActive(true);
    setStatus("Thinking...");

    const rawMemory = typeof window !== "undefined" ? localStorage.getItem("jarvis_memory") || "" : "";

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, memory: rawMemory }),
      });

      const data = await res.json();
      setStatus(data.reply);
      speak(data.reply);

      // Save memory locally
      if (typeof window !== "undefined" && (input.toLowerCase().includes("remember") || input.toLowerCase().includes("my name is"))) {
        const updatedMemory = rawMemory + ". " + input;
        localStorage.setItem("jarvis_memory", updatedMemory);
      }
    } catch (error) {
      setStatus("System error, Sir.");
    } finally {
      setActive(false);
    }
  };

  // 🎤 MICROPHONE INPUT
  const startListening = () => {
    if (typeof window !== "undefined") {
      window.speechSynthesis.cancel(); // Stop talking when I start listening
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) return alert("Use Chrome, Sir.");

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
      <div className={`w-48 h-48 rounded-full transition-all duration-700 mb-10 border-4 relative flex items-center justify-center ${
          active ? "bg-cyan-500 shadow-[0_0_80px_#22d3ee] scale-110 animate-pulse border-white/20" : "bg-slate-900 border-cyan-900/50"
        }`}>
        {active && <div className="absolute inset-0 rounded-full border-t-2 border-white animate-spin opacity-40" />}
        <div className={`w-16 h-16 rounded-full bg-white opacity-10 ${active ? "animate-ping" : "hidden"}`} />
      </div>

      <div className="min-h-[4rem] flex items-center justify-center">
        <p className="text-2xl font-mono text-cyan-400 mb-10 text-center max-w-2xl">
          {status}
        </p>
      </div>

      <button onClick={startListening} className="px-12 py-5 bg-transparent border-2 border-cyan-500 text-cyan-400 rounded-full font-bold hover:bg-cyan-500 hover:text-black transition-all shadow-[0_0_15px_rgba(34,211,238,0.3)]">
        INITIALIZE COMMAND
      </button>
    </main>
  );
}
