"use client";
import { useState, useRef, useEffect } from "react";
import { LucideBrain, LucideMic, LucideZap, LucideSettings } from "lucide-react";

type JarvisState = "IDLE" | "LISTENING" | "THINKING" | "SPEAKING";

interface MemoryItem {
  type: "identity" | "preference" | "relationship" | "general";
  key: string;
  value: string;
}

export default function Home() {
  const [state, setState] = useState<JarvisState>("IDLE");
  const [status, setStatus] = useState("SYSTEM READY");
  const [volume, setVolume] = useState(0);
  const [memory, setMemory] = useState<MemoryItem[]>([]);

  const recognitionRef = useRef<any>(null);
  const animationRef = useRef<any>(null);
  const stateRef = useRef<JarvisState>("IDLE");

  useEffect(() => { stateRef.current = state; }, [state]);

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
    } catch (err) { console.error("Audio failed:", err); }
  };

  const classifyAndStore = (text: string) => {
    const lower = text.toLowerCase();
    let newItem: MemoryItem | null = null;
    if (lower.includes("my name is")) {
      newItem = { type: "identity", key: "name", value: text.split("is")[1].trim() };
    } else if (lower.includes("i like")) {
      newItem = { type: "preference", key: "likes", value: text.split("like")[1].trim() };
    } else if (lower.includes("my friend is")) {
      newItem = { type: "relationship", key: "friend", value: text.split("is")[1].trim() };
    }
    if (newItem) {
      const updated = [...memory.filter(m => m.key !== newItem!.key), newItem];
      setMemory(updated);
      localStorage.setItem("neural_memory", JSON.stringify(updated));
      return `Record updated, Sir.`;
    }
    return null;
  };

  const runLocalCommand = async (action: string) => {
    try {
      const res = await fetch("http://localhost:3001/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      return res.ok;
    } catch { return false; }
  };

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.name.includes("Google UK English Male")) || voices[0];
    if (voice) speech.voice = voice;
    speech.onstart = () => setState("SPEAKING");
    speech.onend = () => { if (stateRef.current === "SPEAKING") setState("LISTENING"); };
    window.speechSynthesis.speak(speech);
  };

  const askJarvisAI = async (input: string) => {
    setState("THINKING");
    const lower = input.toLowerCase();
    if (lower.includes("open calculator")) {
      if (await runLocalCommand("open_calculator")) {
        setStatus("Accessing calculator unit.");
        speak("Opening calculator, Sir.");
        return;
      }
    }
    if (lower.includes("open notepad")) {
      if (await runLocalCommand("open_notepad")) {
        setStatus("Initializing notepad.");
        speak("Notepad is ready, Sir.");
        return;
      }
    }
    const memoryFeedback = classifyAndStore(input);
    const memoryContext = memory.map(m => `${m.type}: ${m.value}`).join("\n");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, memory: memoryContext }),
      });
      const data = await res.json();
      setStatus(memoryFeedback ? `${memoryFeedback} ${data.reply}` : data.reply);
      speak(data.reply);
    } catch {
      setState("LISTENING");
      setStatus("NEURAL CORE ERROR");
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

  const activeColor = { LISTENING: "34, 211, 238", THINKING: "168, 85, 247", SPEAKING: "255, 255, 255", IDLE: "50, 50, 50" }[state];

  return (
    <main className="w-full bg-[#030303] text-white font-mono scroll-smooth selection:bg-cyan-500/30">
      
      {/* 🥇 HERO SECTION */}
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 relative overflow-hidden">
        <div className="absolute top-0 w-full h-[500px] bg-cyan-500/5 blur-[120px] rounded-full" />
        <h1 className="text-6xl md:text-8xl font-bold tracking-tighter z-10">
          JARVIS <span className="text-cyan-500">AI</span>
        </h1>
        <p className="mt-6 text-lg text-gray-400 max-w-xl z-10 font-sans">
          A real-time voice-controlled assistant with neural memory and system command capabilities.
        </p>
        <a href="#demo" className="mt-10 px-10 py-4 border border-cyan-500 text-cyan-400 hover:bg-cyan-500 hover:text-black transition-all font-bold tracking-widest z-10">
          INITIALIZE SYSTEM
        </a>
      </section>

      {/* 🧠 FEATURES SECTION */}
      <section className="py-24 px-6 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        {[
          { icon: <LucideBrain size={24}/>, title: "Memory", desc: "Learns and remembers your identity and preferences." },
          { icon: <LucideMic size={24}/>, title: "Voice", desc: "Hands-free interaction via advanced speech recognition." },
          { icon: <LucideZap size={24}/>, title: "Neural", desc: "High-speed processing for near-instant AI responses." },
          { icon: <LucideSettings size={24}/>, title: "Control", desc: "Bridge to local hardware for system-level execution." }
        ].map((f, i) => (
          <div key={i} className="p-6 border border-white/5 bg-white/[0.02] rounded-lg hover:border-cyan-500/30 transition-all">
            <div className="text-cyan-500 mb-4">{f.icon}</div>
            <h3 className="font-bold text-white mb-2">{f.title}</h3>
            <p className="text-gray-500 text-sm font-sans">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* 🧬 LIVE DEMO (The Original Orb) */}
      <section id="demo" className="min-h-screen flex flex-col items-center justify-center bg-white/[0.01]">
        <div className="w-72 h-72 rounded-full border border-white/10 flex items-center justify-center transition-all duration-300 relative"
             style={{ boxShadow: `0 0 ${40 + volume * 120}px rgba(${activeColor}, 0.2)`, borderColor: `rgba(${activeColor}, 0.4)` }}>
          <div className="absolute inset-2 border border-dashed border-white/20 rounded-full animate-[spin_15s_linear_infinite]" />
          <div className="w-24 h-24 rounded-full transition-all duration-75"
               style={{ backgroundColor: `rgba(${activeColor}, ${0.1 + volume})`, boxShadow: `0 0 ${20 + volume * 80}px rgba(${activeColor}, 0.6)` }} />
        </div>

        <div className="mt-16 w-full max-w-2xl px-6">
          <div className="text-[10px] tracking-[0.4em] text-center text-white/40 uppercase font-bold mb-4">Neural Feedback Stream</div>
          <div className="bg-white/[0.02] border border-white/10 backdrop-blur-md p-8 relative rounded-lg">
            <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500/50" />
            <p className="text-xl font-light text-white/90 min-h-[60px] italic uppercase tracking-tight">{status}</p>
          </div>
        </div>

        {state === "IDLE" && (
          <button onClick={startSystem} className="mt-12 border border-white/20 px-8 py-3 text-[10px] tracking-[0.5em] hover:bg-cyan-500 hover:text-black hover:border-cyan-500 transition-all">
            WAKE SYSTEM
          </button>
        )}
      </section>

      {/* 🏁 FOOTER */}
      <footer className="py-12 text-center text-gray-600 text-xs border-t border-white/5 tracking-widest">
        BUILT BY KEYUR BELE • AI SYSTEM PROJECT • 2026
      </footer>
    </main>
  );
}
