"use client";
import { useState } from "react";

export default function Home() {
  const [active, setActive] = useState(false);
  const [text, setText] = useState("");

  const startListening = () => {
    const SpeechRecognition =
      (window as any).webkitSpeechRecognition ||
      (window as any).SpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech Recognition not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setText(transcript);
    };

    recognition.start();
  };

  const toggleJarvis = () => {
    setActive(!active);
    startListening();
  };

  return (
    <main className="h-screen w-full bg-black flex flex-col items-center justify-center text-white">

      {/* ORB */}
      <div
        className={`w-40 h-40 rounded-full transition-all duration-300
        ${active ? "bg-blue-500 shadow-[0_0_80px_#3b82f6]" : "bg-gray-600"}`}
      />

      {/* STATUS */}
      <p className="mt-6 text-gray-400">
        {active ? "Listening..." : "Idle"}
      </p>

      {/* TEXT OUTPUT */}
      {text && (
        <p className="mt-4 text-center max-w-md">
          "{text}"
        </p>
      )}

      {/* BUTTON */}
      <button
        onClick={toggleJarvis}
        className="mt-8 px-6 py-3 bg-gray-800 rounded-lg"
      >
        {active ? "Stop Jarvis" : "Start Jarvis"}
      </button>

    </main>
  );
}
