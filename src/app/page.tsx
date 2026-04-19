"use client";
import { useState } from "react";

export default function Home() {
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState("Jarvis Idle");

  const askJarvis = async () => {
    setActive(true);
    setStatus("Thinking...");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Hello Jarvis!" }), 
      });

      const data = await res.json();
      setStatus(data.reply); // This displays the AI's answer!
    } catch (error) {
      setStatus("Error: Cannot reach brain.");
    } finally {
      setActive(false);
    }
  };

  return (
    <main className="h-screen w-full bg-black flex flex-col items-center justify-center text-white p-4 text-center">
      {/* THE ORB */}
      <div 
        className={`w-40 h-40 rounded-full transition-all duration-500 mb-10 ${
          active ? "bg-blue-500 shadow-[0_0_80px_#3b82f6] scale-110" : "bg-gray-600"
        }`} 
      />
      
      {/* JARVIS STATUS/REPLY */}
      <p className="text-xl font-mono text-blue-400 mb-10 max-w-lg">
        {status}
      </p>

      {/* THE TRIGGER */}
      <button 
        onClick={askJarvis}
        className="px-10 py-4 bg-white text-black rounded-full font-bold hover:bg-blue-300 transition-all active:scale-95"
      >
        ASK JARVIS
      </button>
    </main>
  );
}
