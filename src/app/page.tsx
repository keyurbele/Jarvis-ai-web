"use client";
import { useState } from "react";

export default function Home() {
  const [active, setActive] = useState(false);

  return (
    <main className="h-screen w-full bg-black flex flex-col items-center justify-center text-white">

      {/* ORB */}
      <div
        className={`w-40 h-40 rounded-full transition-all duration-300
        ${active ? "bg-blue-500 shadow-[0_0_80px_#3b82f6]" : "bg-gray-600"}`}
      />

      {/* TEXT */}
      <p className="mt-6 text-gray-400">
        {active ? "Jarvis Active" : "Jarvis Idle"}
      </p>

      {/* BUTTON */}
      <button
        onClick={() => setActive(!active)}
        className="mt-8 px-6 py-3 bg-gray-800 rounded-lg"
      >
        Toggle Jarvis
      </button>

    </main>
  );
}
