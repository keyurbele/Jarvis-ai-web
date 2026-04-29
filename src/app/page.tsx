"use client";
import { useState, useRef, useEffect } from "react";
import { LucideBrain, LucideMic, LucideZap, LucideSettings, LucideGlobe, LucideCommand } from "lucide-react";

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

  // Sync ref with state for use inside event listeners
  useEffect(() => { stateRef.current = state; }, [state]);

  // Load memory from localStorage on mount
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

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    // Prefer a premium-sounding voice if available
    const voice = voices.find(v => v.name.includes("Google UK English Male")) || voices[0];
    if (voice) speech.voice = voice;
    
    speech.onstart = () => setState("SPEAKING");
    speech.onend = () => { 
      if (stateRef.current === "SPEAKING") setState("LISTENING"); 
    };
    window.speechSynthesis.speak(speech);
  };

  // ⚡ INSTANT COMMANDS LOGIC
  const handleInstantCommands = (transcript: string) => {
    const lower = transcript.toLowerCase().trim();

    if (lower.includes("open youtube")) {
      window.open("https://www.youtube.com", "_blank");
      speak("Opening YouTube, Sir.");
      return true;
    }
    if (lower.includes("open google")) {
      window.open("https://www.google.com", "_blank");
      speak("Opening Google, Sir.");
      return true;
    }
    if (lower.includes("open github")) {
      window.open("https://www.github.com", "_blank");
      speak("Opening your GitHub, Sir.");
      return true;
    }
    if (lower.includes("what time is it")) {
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      speak(`The current time is ${time}`);
      return true;
    }
    if (lower.includes("what day is it")) {
      const day = new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
      speak(`Today is ${day}`);
      return true;
    }
    if (lower.includes("search for")) {
      const query = lower.split("search for")[1];
      if (query) {
        window.open(`https://www.google.com/search?q=${encodeURIComponent(query.trim())}`, "_blank");
        speak(`Searching Google for ${query}`);
        return true;
      }
    }
    return false;
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

  const askJarvisAI = async (input: string) => {
    const lower = input.toLowerCase();
    
    // 1. Try Instant Commands First
    if (handleInstantCommands(input)) {
      setStatus(`COMMAND EXECUTED: ${input.toUpperCase()}`);
      return;
    }

    setState("THINKING");

    // 2. Local Hardware Commands
    if (lower.includes("open calculator")) {
      if (await runLocalCommand("open_calculator")) {
        setStatus("ACCESSING CALCULATOR UNIT");
        speak("Opening calculator, Sir.");
        return;
      }
    }
    if (lower.includes("open notepad")) {
      if (await runLocalCommand("open_notepad")) {
        setStatus("INITIALIZING NOTEPAD");
        speak("Notepad is ready, Sir.");
        return;
      }
    }

    // 3. Memory & AI API Call
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
      
      // Interrupt logic
      if ((stateRef.current === "SPEAKING" || stateRef.current === "THINKING") && 
          (transcript.includes("stop") || transcript.includes("wait") || transcript.includes("shut up"))) {
        window.speechSynthesis.cancel();
        setState("LISTENING");
        setStatus("LISTENING...");
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

  const activeColor = { 
    LISTENING: "34, 211, 238", // Cyan
    THINKING: "168, 85, 247",  // Purple
    SPEAKING: "255, 255, 255", // White
    IDLE: "50, 50, 50"         // Gray
  }[state];

  return (
    <main className="w-full bg-[#030303] text-white font-mono scroll-smooth selection:bg-cyan-500/30">
      
      {/* 🥇 HERO SECTION */}
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 relative overflow-hidden">
        <div className="absolute top-0 w-full h-[500px] bg-cyan-500/5 blur-[120px] rounded-full" />
        <h1 className="text-6xl md:text-8xl font-bold tracking-tighter z-10">
          JARVIS <span className="text-cyan-500">AI</span>
        </h1>
        <p className="mt-6 text-lg text-gray-400 max-w-xl z-10 font-sans">
          Advanced voice-controlled assistant with neural memory and instant system execution.
        </p>
        <div className="flex gap-4 z-10 mt-10">
          <a href="#demo" className="px-10 py-4 border border-cyan-500 text-cyan-400 hover:bg-cyan-500 hover:text-black transition-all font-bold tracking-widest">
            INITIALIZE
          </a>
        </div>
      </section>

      {/* 🧠 FEATURES SECTION */}
      <section className="py-24 px-6 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        {[
          { icon: <LucideBrain size={24}/>, title: "Neural Memory", desc: "Persistent identity tracking via LocalStorage." },
          { icon: <LucideMic size={24}/>, title: "Zero Latency", desc: "Instant commands bypass AI for split-second execution." },
          { icon: <LucideZap size={24}/>, title: "Web Integration", desc: "Direct bridge to Google, YouTube, and GitHub." },
          { icon: <LucideSettings size={24}/>, title: "System Link", desc: "Controls local applications like Notepad and Calculator." }
        ].map((f, i) => (
          <div key={i} className="p-6 border border-white/5 bg-white/[0.02] rounded-lg hover:border-cyan-500/30 transition-all group">
            <div className="text-cyan-500 mb-4 group-hover:scale-110 transition-transform">{f.icon}</div>
            <h3 className="font-bold text-white mb-2">{f.title}</h3>
            <p className="text-gray-500 text-sm font-sans leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* 🧬 LIVE DEMO (The Orb) */}
      <section id="demo" className="min-h-screen flex flex-col items-center justify-center bg-white/[0.01] relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-500/5 via-transparent to-transparent" />
        
        <div className="w-72 h-72 rounded-full border border-white/10 flex items-center justify-center transition-all duration-300 relative z-10"
             style={{ 
               boxShadow: `0 0 ${40 + volume * 120}px rgba(${activeColor}, 0.2)`, 
               borderColor: `rgba(${activeColor}, 0.4)` 
             }}>
          <div className="absolute inset-2 border border-dashed border-white/20 rounded-full animate-[spin_20s_linear_infinite]" />
          <div className="absolute inset-4 border border-cyan-500/10 rounded-full animate-[spin_10s_linear_infinite_reverse]" />
          <div className="w-24 h-24 rounded-full transition-all duration-75"
               style={{ 
                 backgroundColor: `rgba(${activeColor}, ${0.1 + volume})`, 
                 boxShadow: `0 0 ${20 + volume * 80}px rgba(${activeColor}, 0.6)` 
               }} />
        </div>

        <div className="mt-16 w-full max-w-2xl px-6 z-10">
          <div className="flex items-center justify-center gap-2 mb-4">
             <div className={`w-2 h-2 rounded-full animate-pulse ${state === 'IDLE' ? 'bg-gray-500' : 'bg-cyan-500'}`} />
             <div className="text-[10px] tracking-[0.4em] text-white/40 uppercase font-bold">Neural Feedback Stream</div>
          </div>
          <div className="bg-white/[0.02] border border-white/10 backdrop-blur-xl p-8 relative rounded-xl overflow-hidden">
            <div className={`absolute top-0 left-0 w-1 h-full transition-colors duration-500`} style={{ backgroundColor: `rgb(${activeColor})` }} />
            <p className="text-xl font-light text-white/90 min-h-[60px] italic uppercase tracking-tight leading-relaxed">
              {status}
            </p>
          </div>
        </div>

        {state === "IDLE" && (
          <button onClick={startSystem} className="mt-12 group flex items-center gap-4 border border-white/20 px-8 py-4 text-[10px] tracking-[0.5em] hover:bg-white hover:text-black transition-all rounded-full">
            <LucideZap size={14} className="group-hover:text-cyan-500" />
            WAKE SYSTEM
          </button>
        )}
      </section>

      {/* 🏁 FOOTER */}
      <footer className="py-12 text-center text-gray-600 text-xs border-t border-white/5 tracking-widest bg-black">
        SYSTEM DESIGNED BY KEYUR BELE • NEURAL INTERFACE v2.0 • 2026
      </footer>
    </main>
  );
}
