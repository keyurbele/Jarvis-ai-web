"use client";
import { useState } from "react";

export default function Home() {
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState("Ready for orders, Sir.");

  // 🗣️ JARVIS VOICE OUTPUT (Tuned for Free High Quality)
const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text);

    speech.rate = 0.85;
    speech.pitch = 0.8;
    speech.volume = 1;

    // Helper to find and set the voice
    const setVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const jarvisVoice = voices.find(v => 
        v.name.includes("Google UK English Male") || 
        v.name.includes("Microsoft James") || 
        v.name.includes("Arthur") ||
        v.name.includes("English United Kingdom")
      );
      if (jarvisVoice) speech.voice = jarvisVoice;
      window.speechSynthesis.speak(speech);
    };

    // If voices are already loaded, just speak. 
    // If not, wait for them to load first.
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
      speak(data.reply); // Jarvis speaks!
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
      {/* THE ANIMATED ORB */}
      <div 
        className={`w-48 h-48 rounded-full transition-all duration-500 mb-10 ${
          active ? "bg-blue-500 shadow-[0_0_100px_#3b82f6] scale-110" : "bg-gray-800 border-2 border-blue-900"
        }`} 
      />
      
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
