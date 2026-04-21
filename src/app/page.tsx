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

// ... (Keep all your existing logic/functions at the top)

  return (
    <main className="h-screen w-full bg-[#050a10] flex flex-col items-center justify-center text-white overflow-hidden font-mono relative">
      
      {/* 📺 TECH OVERLAY: Scanlines */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%]" />

      {/* 💠 HUD CORNERS */}
      <div className="absolute top-10 left-10 w-20 h-20 border-t-2 border-l-2 border-cyan-500/30 ml-4 mt-4" />
      <div className="absolute top-10 right-10 w-20 h-20 border-t-2 border-r-2 border-cyan-500/30 mr-4 mt-4" />
      <div className="absolute bottom-10 left-10 w-20 h-20 border-b-2 border-l-2 border-cyan-500/30 ml-4 mb-4" />
      <div className="absolute bottom-10 right-10 w-20 h-20 border-b-2 border-r-2 border-cyan-500/30 mr-4 mb-4" />

      {/* 🧿 THE ADVANCED ORB */}
      <div className="relative flex items-center justify-center">
        {/* Outer Rotating Ring */}
        <div 
          className="absolute w-[320px] h-[320px] border border-cyan-500/10 rounded-full animate-[spin_10s_linear_infinite]" 
          style={{ borderTopColor: `rgb(${rgb})` }}
        />
        
        {/* Middle Reactive Ring */}
        <div
          style={{
            transform: `scale(${orbScale})`,
            boxShadow: `0 0 ${glow}px rgba(${rgb}, 0.4), inset 0 0 30px rgba(${rgb}, 0.2)`,
            borderColor: `rgba(${rgb}, 0.6)`,
          }}
          className="w-64 h-64 rounded-full border-2 transition-all duration-75 flex items-center justify-center relative bg-black/40 backdrop-blur-sm"
        >
          {/* Inner Pulsing Core */}
          <div 
            className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center"
            style={{ boxShadow: `0 0 ${glow / 2}px rgba(${rgb}, 0.8)` }}
          >
            <div className="w-8 h-8 rounded-full bg-cyan-400 opacity-20 animate-ping" />
          </div>
        </div>
      </div>

      {/* 📟 STATUS INTERFACE */}
      <div className="mt-20 flex flex-col items-center z-10">
        <div className="px-6 py-2 bg-cyan-500/5 border border-cyan-500/20 rounded-t-lg backdrop-blur-md">
          <p className="text-[10px] tracking-[0.5em] text-cyan-400 uppercase font-bold">
            System Identity: MARK-85
          </p>
        </div>
        
        <div className="w-[500px] p-8 bg-black/60 border border-cyan-500/20 rounded-lg backdrop-blur-xl shadow-2xl relative overflow-hidden group">
          {/* Subtle scanning light effect */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-cyan-500/20 animate-[scan_3s_ease-in-out_infinite]" />
          
          <div className="flex justify-between items-center mb-4 border-b border-cyan-500/10 pb-2">
            <span className="text-[9px] text-cyan-700 tracking-tighter">ESTABLISHED LINK: STARK_SECURE_77</span>
            <span className={`text-[9px] px-2 py-0.5 rounded ${state === 'IDLE' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
               {state}
            </span>
          </div>

          <p className="text-xl text-cyan-100 min-h-[60px] italic leading-relaxed text-center drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
            {status}
          </p>
        </div>
      </div>

      {/* ⚡ INITIALIZE BUTTON */}
      {state === "IDLE" && (
        <button
          onClick={startSystem}
          className="mt-12 group relative px-12 py-4 overflow-hidden"
        >
          <div className="absolute inset-0 bg-cyan-500/10 group-hover:bg-cyan-500/20 transition-all" />
          <div className="absolute bottom-0 left-0 w-full h-[1px] bg-cyan-500/40 group-hover:h-full transition-all duration-300" />
          <span className="relative text-xs tracking-[0.5em] text-cyan-400 font-bold group-hover:text-black transition-colors">
            INITIALIZE NEURAL LINK
          </span>
        </button>
      )}
    </main>
  );
}
