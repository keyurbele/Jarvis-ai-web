"use client";
import { useState } from "react";

export default function Home() {
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState("Ready for orders, Sir.");

  // 🗣️ JARVIS VOICE OUTPUT (Tuned for Free High Quality)
  const speak = (text: string) => {
    // 1. Stop any current talking
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // 2. JARVIS SETTINGS (Makes it sound less like a robot)
    utterance.rate = 0.9;  // Slightly slower = more professional
    utterance.pitch = 0.8; // Lower pitch = more masculine/smooth
    utterance.volume = 1;

    // 3. Try to find a "Premium" sounding voice on the user's system
    const voices = window.speechSynthesis.getVoices();
    // This looks for "Google UK English Male" or "Arthur" or "Microsoft James"
    const bestVoice = voices.find(v => 
      v.name.includes("UK English Male") || 
      v.name.includes("Google US English") || 
      v.name.includes("Male")
    );

    if (bestVoice) {
      utterance.voice = bestVoice;
    }

    window.speechSynthesis.speak(utterance);
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
