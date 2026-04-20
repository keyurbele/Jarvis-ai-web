"use client";
import { useState, useRef, useEffect } from "react";

type JarvisState = "IDLE" | "LISTENING" | "THINKING" | "SPEAKING";

export default function Home() {
  const [state, setState] = useState<JarvisState>("IDLE");
  const [status, setStatus] = useState("Ready for orders, Sir.");
  const [volume, setVolume] = useState(0);

  const recognitionRef = useRef<any>(null);
  const animationRef = useRef<any>(null);
  const stateRef = useRef<JarvisState>("IDLE");

  // Keep stateRef in sync so listeners can read the current state
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const startAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const update = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        setVolume((sum / dataArray.length) / 100);
        animationRef.current = requestAnimationFrame(update);
      };
      update();
    } catch (err) {
      console.error("Mic error:", err);
    }
  };

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text);
    speech.onstart = () => setState("SPEAKING");
    speech.onend = () => {
      if (stateRef.current === "SPEAKING") setState("LISTENING");
    };
    speech.rate = 0.9;
    
    const voices = window.speechSynthesis.getVoices();
    const jarvisVoice = voices.find(v => v.name.includes("Google UK English Male"));
    if (jarvisVoice) speech.voice = jarvisVoice;
    
    window.speechSynthesis.speak(speech);
  };

  const askJarvisAI = async (input: string) => {
    setState("THINKING");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });
      const data = await res.json();
      setStatus(data.reply);
      speak(data.reply);
    } catch {
      setState("LISTENING");
      setStatus("Connection error, Sir.");
    }
  };

  const startSystem = () => {
    if (state !== "IDLE") return;
    startAudio(); 

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true; // MUST be true to catch "Stop" mid-sentence

    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
      const isFinal = event.results[event.results.length - 1].isFinal;

      // --- INTERRUPT LOGIC ---
      if (stateRef.current === "SPEAKING" || stateRef.current === "THINKING") {
        if (transcript.includes("stop") || transcript.includes("shutup") || transcript.includes("jarvis") || transcript.includes("wait")) {
          window.speechSynthesis.cancel();
          setState("LISTENING");
          setStatus("Standing by, Sir.");
          return;
        }
      }

      // --- NORMAL PROCESSING ---
      if (isFinal && stateRef.current === "LISTENING") {
        setStatus(`"${transcript}"`);
        askJarvisAI(transcript);
      }
    };

    recognition.onend = () => {
      if (stateRef.current !== "IDLE") recognition.start();
    };

    recognition.start();
    setState("LISTENING");
    setStatus("Neural link established.");
  };

  const orbScale = 1 + volume * 0.8;
  const glow = volume * 100;
  const getColor = () => {
    switch (state) {
      case "LISTENING": return "34,197,94";
      case "THINKING":  return "251,191,36";
      case "SPEAKING":  return "34,211,238";
      default:          return "148,163,184";
    }
  };

  const rgb = getColor();

  return (
    <main className="h-screen w-full bg-black flex flex-col items-center justify-center text-white overflow-hidden font-mono">
      <div
        style={{
          transform: `scale(${orbScale})`,
          boxShadow: `0 0 ${glow}px rgba(${rgb},0.6)`,
          borderColor: `rgba(${rgb},0.8)`,
        }}
        className="w-56 h-56 rounded-full border-2 transition-all duration-75 flex items-center justify-center"
      >
        <div className="w-24 h-24 rounded-full bg-white/10 animate-pulse" />
      </div>

      <div className="mt-16 text-center h-24 px-6">
        <p className="text-[10px] tracking-[0.4em] text-gray-500 mb-2 uppercase">Core State: {state}</p>
        <p className="text-cyan-400 text-lg max-w-xl italic">{status}</p>
      </div>

      {state === "IDLE" && (
        <button
          onClick={startSystem}
          className="mt-10 px-10 py-4 border border-cyan-500 text-cyan-400 hover:bg-cyan-500/10 transition-all text-xs tracking-[0.3em]"
        >
          INITIALIZE CORE
        </button>
      )}
    </main>
  );
}
