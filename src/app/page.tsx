"use client";
import { useState } from "react";

export default function Home() {
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState("Say something...");

  // 🗣️ STEP 2: JARVIS VOICE OUTPUT
const speak = async (text: string) => {
    // 1. Kill any robotic voices still talking
    window.speechSynthesis.cancel();

    try {
      // 2. We use a high-quality free speech engine (Sherpa-ONNX is a great 2026 alternative)
      // This is a direct "streaming" URL that doesn't require a key
      const voiceUrl = `https://api.voicerss.org/?key=YOUR_FREE_KEY&hl=en-gb&v=Harry&src=${encodeURIComponent(text)}`;
      
      // NOTE: VoiceRSS has a 350-request-per-day FREE limit (huge for one person!)
      // If you want 100% no-limit, we stick to the browser-based piper-js.
      
      const audio = new Audio(voiceUrl);
      await audio.play();
    } catch (err) {
      // Fallback to the default system voice if the high-quality one fails
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9; // Makes the robot sound a bit more "Jarvis-like"
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    }
  };

      const data = await res.json();

      if (data?.audio) {
        const audio = new Audio(data.audio);
        await audio.play();
        return; // ✅ Success! Stop here so the robot doesn't start.
      }
    } catch (err) {
      console.error("Kokoro failed, falling back to robot:", err);
    }

    // 2. Only if the AI voice fails above, do we use the robot
    const fallback = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(fallback);
  };

  // 🧠 STEP 1: AI REQUEST HANDLER
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
      speak(data.reply); // Jarvis speaks the answer back!
    } catch (error) {
      setStatus("I’m having trouble connecting.");
    } finally {
      setActive(false);
    }
  };

  // 🎤 STEP 3: REAL VOICE INPUT
  const startListening = () => {
    const SpeechRecognition =
      (window as any).webkitSpeechRecognition ||
      (window as any).SpeechRecognition;

    if (!SpeechRecognition) {
      alert("Your browser does not support voice recognition. Try Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    setStatus("Listening...");
    setActive(true);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setStatus(`You said: "${transcript}"`);
      askJarvis(transcript); // Sends what you said to the AI
    };

    recognition.onerror = () => {
      setStatus("Speech error. Try again.");
      setActive(false);
    };

    recognition.start();
  };

  return (
    <main className="h-screen w-full bg-black flex flex-col items-center justify-center text-white p-4">
      {/* THE ANIMATED ORB */}
      <div 
        className={`w-48 h-48 rounded-full transition-all duration-500 mb-10 ${
          active ? "bg-blue-500 shadow-[0_0_100px_#3b82f6] scale-110" : "bg-gray-700"
        }`} 
      />
      
      {/* STATUS DISPLAY */}
      <p className="text-2xl font-mono text-blue-400 mb-10 text-center max-w-2xl">
        {status}
      </p>

      {/* VOICE TRIGGER */}
      <button 
        onClick={startListening}
        className="px-12 py-5 bg-white text-black rounded-full font-bold hover:bg-blue-400 transition-all active:scale-95 shadow-lg"
      >
        TALK TO JARVIS
      </button>
    </main>
  );
}
