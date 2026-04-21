"use client";
import { useState, useRef, useEffect } from "react";

type JarvisState = "IDLE" | "LISTENING" | "THINKING" | "SPEAKING";

interface MemoryObject {
  type: "identity" | "preference" | "fact";
  key: string;
  value: string;
}

export default function Home() {
  const [state, setState] = useState<JarvisState>("IDLE");
  const [status, setStatus] = useState("SYSTEM READY");
  const [volume, setVolume] = useState(0);
  const [memory, setMemory] = useState<MemoryObject[]>([]);

  const recognitionRef = useRef<any>(null);
  const animationRef = useRef<any>(null);
  const stateRef = useRef<JarvisState>("IDLE");

  useEffect(() => { 
    stateRef.current = state; 
  }, [state]);

  // Load memory from local storage on boot
  useEffect(() => {
    const saved = localStorage.getItem("neural_memory");
    if (saved) setMemory(JSON.parse(saved));
  }, []);

  const startAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
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
    } catch (err) { console.error(err); }
  };

  const updateMemory = (text: string) => {
    let newEntry: MemoryObject | null = null;
    const lower = text.toLowerCase();

    if (lower.includes("my name is")) {
      newEntry = { type: "identity", key: "name", value: text.split("is")[1].trim() };
    } else if (lower.includes("i like") || lower.includes("my favorite")) {
      const parts = lower.split(/like|favorite/);
      newEntry = { type: "preference", key: "interest", value: parts[1].trim() };
    } else if (lower.includes("remember that")) {
      newEntry = { type: "fact", key: "info", value: text.replace("remember that", "").trim() };
    }

    if (newEntry) {
      setMemory(prev => {
        const filtered = prev.filter(m => !(m.type === newEntry?.type && m.key === newEntry?.key));
        const updated = [...filtered, newEntry];
        localStorage.setItem("neural_memory", JSON.stringify(updated));
        return updated;
      });
      return true;
    }
    return false;
  };

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    
    // Choose your voice here
    const preferredVoice = voices.find(v => v.name.includes("Google UK English Male")) || voices[0];
    if (preferredVoice) speech.voice = preferredVoice;

    speech.onstart = () => setState("SPEAKING");
    speech.onend = () => { if (stateRef.current === "SPEAKING") setState("LISTENING"); };
    window.speechSynthesis.speak(speech);
  };

  const askJarvisAI = async (input: string) => {
    setState("THINKING");
    updateMemory(input); // Try to learn from what was just said

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            message: input, 
            memory: memory // Pass the brain to the API
        }),
      });
      const data = await res.json();
      setStatus(data.reply);
      speak(data.reply);
    } catch {
      setState("LISTENING");
      setStatus("ERROR: CORE OFFLINE");
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
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
      if ((stateRef.current === "SPEAKING" || stateRef.current === "THINKING") && 
          (transcript.includes("stop") || transcript.includes("wait"))) {
        window.speechSynthesis.cancel();
        setState("LISTENING");
        setStatus("INTERRUPT RECEIVED");
        return;
      }
      if (event.results[event.results.length - 1].isFinal && stateRef.current === "LISTENING") {
        setStatus(transcript.toUpperCase());
        askJarvisAI(transcript);
      }
    };
    recognition.onend = () => { if (stateRef.current !== "IDLE") recognition.start(); };
    recognition.start();
    setState("LISTENING");
    setStatus("CORE ONLINE");
  };

  const colors = {
    LISTENING: "34, 211, 238",
    THINKING: "168, 85, 247",
    SPEAKING: "255, 255, 255",
    IDLE: "50, 50, 50"
  };
  const activeColor = colors[state] || colors.IDLE;

  return (
    <main className="h-screen w-full bg-[#030303] flex flex-col items-center justify-center overflow-hidden font-mono text-white">
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#1a1a1a_1px,transparent_1px)] [background-size:20px_20px]" />

      <div className="relative group">
        <div 
          className="w-72 h-72 rounded-full border border-white/10 flex items-center justify-center transition-all duration-300 relative"
          style={{ 
            boxShadow: `0 0 ${40 + volume * 120}px rgba(${activeColor}, 0.2)`,
            borderColor: `rgba(${activeColor}, 0.4)`
          }}
        >
          <div className="absolute inset-2 border border-dashed border-white/20 rounded-full animate-[spin_15s_linear_infinite]" />
          <div 
            className="w-24 h-24 rounded-full transition-all duration-75"
            style={{ 
              backgroundColor: `rgba(${activeColor}, ${0.1 + volume})`,
              boxShadow: `0 0 ${20 + volume * 80}px rgba(${activeColor}, 0.6)`
            }}
          />
        </div>
      </div>

      <div className="mt-16 w-full max-w-2xl px-6">
        <div className="flex items-center gap-4 mb-2">
          <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-white/20" />
          <span className="text-[10px] tracking-[0.4em] text-white/40 uppercase font-bold">
            Project Neural Core
          </span>
          <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-white/20" />
        </div>

        <div className="bg-white/[0.02] border border-white/10 backdrop-blur-md p-8 rounded-sm shadow-2xl relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500/50" />
          <div className="flex justify-between items-center mb-4 text-[9px] text-white/30 tracking-widest uppercase">
            <span>Uptime: {Math.floor(performance.now()/1000)}s</span>
            <span className={state !== 'IDLE' ? 'text-cyan-400' : 'text-white/20'}>{state}</span>
          </div>
          <p className="text-xl font-light text-white/90 min-h-[60px] leading-relaxed">
            {status}
          </p>
        </div>
      </div>

      {state === "IDLE" && (
        <button 
          onClick={startSystem}
          className="mt-12 border border-white/20 px-8 py-3 text-[10px] tracking-[0.5em] hover:bg-white hover:text-black transition-all"
        >
          WAKE SYSTEM
        </button>
      )}
    </main>
  );
}
