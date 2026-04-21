"use client";
import { useState, useRef, useEffect } from "react";

type JarvisState = "IDLE" | "LISTENING" | "THINKING" | "SPEAKING";

export default function Home() {
  const [state, setState] = useState<JarvisState>("IDLE");
  const [status, setStatus] = useState("SYSTEM STANDBY");
  const [volume, setVolume] = useState(0);

  const recognitionRef = useRef<any>(null);
  const animationRef = useRef<any>(null);
  const stateRef = useRef<JarvisState>("IDLE");

  useEffect(() => { stateRef.current = state; }, [state]);

  // Logic remains the same as previous stable version for brevity
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

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text);
    speech.onstart = () => setState("SPEAKING");
    speech.onend = () => { if (stateRef.current === "SPEAKING") setState("LISTENING"); };
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
      setStatus("CONNECTION ERROR: NEURAL CORE OFFLINE");
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
      if (stateRef.current === "SPEAKING" && transcript.includes("stop")) {
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
    setStatus("SYSTEM ONLINE: MARK-85 ACTIVE");
  };

  // Dynamic Colors based on State
  const colors = {
    LISTENING: "0, 255, 255", // Cyan
    THINKING: "255, 200, 0",  // Amber
    SPEAKING: "0, 150, 255",  // Deep Blue
    IDLE: "100, 100, 100"     // Dim Gray
  };
  const activeColor = colors[state] || colors.IDLE;

  return (
    <main className="h-screen w-full bg-[#020508] flex flex-col items-center justify-center overflow-hidden font-sans select-none">
      
      {/* 1. THE GRID BACKGROUND */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
        style={{ backgroundImage: `radial-gradient(circle at 2px 2px, rgba(${activeColor}, 0.5) 1px, transparent 0)`, backgroundSize: '40px 40px' }} 
      />

      {/* 2. THE MAIN ORB ASSEMBLY */}
      <div className="relative z-10 scale-75 md:scale-100">
        {/* Animated Outer Ring */}
        <div className="absolute -inset-20 border border-cyan-500/20 rounded-full animate-[spin_20s_linear_infinite]" />
        <div className="absolute -inset-16 border-t border-b border-cyan-400/40 rounded-full animate-[spin_10s_linear_infinite_reverse]" />
        
        {/* The Reactive Orb */}
        <div 
          className="relative w-64 h-64 rounded-full flex items-center justify-center transition-all duration-300 border-[3px]"
          style={{ 
            borderColor: `rgba(${activeColor}, 0.8)`,
            boxShadow: `0 0 ${20 + volume * 100}px rgba(${activeColor}, 0.4), inset 0 0 40px rgba(${activeColor}, 0.2)`
          }}
        >
          {/* Inner Core */}
          <div className="w-12 h-12 rounded-full bg-white/20 border border-white/40 shadow-[0_0_20px_white]" />
          
          {/* Audio Wave Visualizer (SVG) */}
          <svg className="absolute inset-0 w-full h-full rotate-[-90deg]">
             <circle 
              cx="128" cy="128" r="120" 
              fill="transparent" 
              stroke={`rgba(${activeColor}, 0.3)`} 
              strokeWidth="4" 
              strokeDasharray="10 5" 
            />
          </svg>
        </div>
      </div>

      {/* 3. THE HUD PANEL */}
      <div className="mt-24 w-full max-w-3xl relative">
        {/* Header Label */}
        <div className="flex justify-center mb-[-1px]">
          <div className="px-8 py-1 bg-cyan-900/40 border-t border-x border-cyan-500/50 rounded-t-xl backdrop-blur-md">
             <span className="text-[10px] tracking-[0.6em] text-cyan-400 font-bold">SYSTEM IDENTITY: MARK-85</span>
          </div>
        </div>

        {/* Main Box */}
        <div className="relative bg-black/60 border border-cyan-500/50 backdrop-blur-xl p-10 rounded-xl shadow-[0_0_30px_rgba(0,255,255,0.1)] overflow-hidden">
          {/* Scanning Line */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-cyan-400/50 animate-[scan_4s_linear_infinite]" />
          
          {/* Sub-Info */}
          <div className="flex justify-between items-center mb-6 opacity-60">
            <span className="text-[8px] tracking-widest text-cyan-300 uppercase">Established Link: Stark_Secure_77</span>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full animate-pulse ${state !== "IDLE" ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-[8px] tracking-widest text-cyan-300 uppercase font-bold">{state}</span>
            </div>
          </div>

          {/* Transcript/Status */}
          <div className="text-center">
            <p className="text-2xl font-light text-cyan-100 tracking-wide drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] uppercase italic">
              {status}
            </p>
          </div>
        </div>
      </div>

      {/* 4. THE POWER BUTTON */}
      {state === "IDLE" && (
        <button 
          onClick={startSystem}
          className="mt-12 px-16 py-4 bg-cyan-950/20 border border-cyan-500/50 hover:bg-cyan-500/20 hover:scale-105 active:scale-95 transition-all text-cyan-400 tracking-[0.8em] font-bold text-[10px]"
        >
          INITIALIZE NEURAL LINK
        </button>
      )}

      {/* CSS Animations (Injected via Style tag for ease of copy-paste) */}
      <style jsx>{`
        @keyframes scan {
          0% { top: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </main>
  );
}
