"use client";
import { useState, useRef, useEffect } from "react";
import { 
  LucideBrain, LucideMic, LucideZap, LucideTerminal, 
  LucideCpu, LucideLayers, LucidePower, LucideSearch 
} from "lucide-react";

type JarvisState = "IDLE" | "LISTENING" | "THINKING" | "SPEAKING";

export default function Home() {
  const [state, setState] = useState<JarvisState>("IDLE");
  const [status, setStatus] = useState("SYSTEM READY");
  const [volume, setVolume] = useState(0);
  const [log, setLog] = useState<{msg: string, time: string}[]>([]);

  const recognitionRef = useRef<any>(null);
  const animationRef = useRef<any>(null);
  const stateRef = useRef<JarvisState>("IDLE");

  useEffect(() => { stateRef.current = state; }, [state]);

  const addToLog = (msg: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLog(prev => [{msg, time}, ...prev].slice(0, 5));
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

  const handleInstantCommands = (transcript: string) => {
    const lower = transcript.toLowerCase().trim();
    if (lower.includes("open youtube")) { 
      window.open("https://youtube.com", "_blank"); 
      speak("Navigating to YouTube."); 
      return true; 
    }
    if (lower.includes("search for")) {
      const query = lower.split("search for")[1];
      window.open(`https://google.com/search?q=${encodeURIComponent(query)}`, "_blank");
      speak(`Searching for ${query}`);
      return true;
    }
    if (lower.includes("what time is it")) {
      speak(`Current time is ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
      return true;
    }
    return false;
  };

  const askJarvisAI = async (input: string) => {
    if (handleInstantCommands(input)) {
      addToLog(`COMMAND_EXEC: ${input.toUpperCase()}`);
      return;
    }

    setState("THINKING");
    addToLog(`INPUT_STREAM: ${input}`);
    
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });
      const data = await res.json();
      setStatus(data.reply);
      speak(data.reply);
      addToLog("DATA_REPLY_RECEIVED");
    } catch {
      setState("LISTENING");
      setStatus("CONNECTION_ERROR");
    }
  };

  const startSystem = () => {
    if (state !== "IDLE") return;
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
      if (event.results[event.results.length - 1].isFinal && stateRef.current === "LISTENING") {
        setStatus(transcript.toUpperCase());
        askJarvisAI(transcript);
      }
    };

    recognition.onend = () => { if (stateRef.current !== "IDLE") recognition.start(); };
    recognition.start();
    setState("LISTENING");
    setStatus("CORE_ONLINE");
    addToLog("Neural link active.");
  };

  const activeColor = { LISTENING: "#22d3ee", THINKING: "#a855f7", SPEAKING: "#ffffff", IDLE: "#333333" }[state];

  return (
    <main className="min-h-screen bg-[#010101] text-white font-mono selection:bg-cyan-500/30">
      <style jsx>{`
        @keyframes orbit { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-orbit { animation: orbit 25s linear infinite; }
        .neural-pulse { animation: pulse 3s ease-in-out infinite; }
        @keyframes pulse { 0%, 100% { opacity: 0.1; } 50% { opacity: 0.3; } }
      `}</style>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* NAV */}
        <nav className="flex justify-between items-center mb-16 border-b border-white/5 pb-8">
          <div className="flex items-center gap-3">
            <LucideCpu className="text-cyan-500" size={24} />
            <span className="text-xl font-bold tracking-[0.2em]">JARVIS<span className="text-cyan-500 font-light ml-1">OS</span></span>
          </div>
          <div className="flex gap-6 text-[10px] tracking-widest text-gray-500 uppercase">
            <span>Mode: Professional</span>
            <span className="text-cyan-500">Live_Sync</span>
          </div>
        </nav>

        <div className="grid grid-cols-12 gap-6">
          {/* LOGS */}
          <div className="col-span-12 lg:col-span-3">
            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 min-h-[300px]">
              <div className="flex items-center gap-2 mb-6 text-gray-500 text-[10px] tracking-widest uppercase">
                <LucideTerminal size={14} /> Telemetry
              </div>
              <div className="space-y-4">
                {log.map((entry, i) => (
                  <div key={i} className="border-l border-cyan-500/20 pl-4">
                    <p className="text-[8px] text-gray-600">{entry.time}</p>
                    <p className="text-[11px] text-gray-300">{entry.msg}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ORB */}
          <div className="col-span-12 lg:col-span-6 flex flex-col items-center justify-center">
            <div className="relative">
              <div className="absolute -inset-12 border border-white/5 rounded-full animate-orbit" />
              <button 
                onClick={state === "IDLE" ? startSystem : undefined}
                className="relative w-64 h-64 rounded-full flex items-center justify-center transition-all duration-700"
                style={{ 
                  boxShadow: `0 0 60px ${activeColor}15`,
                  border: `1px solid ${activeColor}30`,
                  background: `radial-gradient(circle, ${activeColor}05 0%, transparent 70%)`
                }}
              >
                <div className="z-10 text-center">
                  <div className="text-[10px] tracking-[0.8em] text-white/20 uppercase mb-4">{state}</div>
                  <LucideMic className={state !== 'IDLE' ? "text-cyan-400" : "text-gray-600"} size={32} />
                </div>
              </button>
            </div>
            <div className="mt-16 text-center h-20">
              <p className="text-xl font-light tracking-wide text-white/80 italic">{status}</p>
            </div>
          </div>

          {/* MODULES */}
          <div className="col-span-12 lg:col-span-3 space-y-6">
            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5">
              <LucideBrain className="text-cyan-500/50 mb-4" size={20} />
              <h4 className="text-[11px] font-bold tracking-widest uppercase mb-2">Knowledge_Core</h4>
              <p className="text-[10px] text-gray-500">Processing via semantic analysis.</p>
            </div>
            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5">
              <LucideZap className="text-purple-500/50 mb-4" size={20} />
              <h4 className="text-[11px] font-bold tracking-widest uppercase mb-2">Fast_Path</h4>
              <p className="text-[10px] text-gray-500">Instant command bridge active.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
