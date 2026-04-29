"use client";
import { useState, useRef, useEffect } from "react";
import { 
  LucideBrain, LucideMic, LucideZap, LucideTerminal, 
  LucideCpu, LucideLoader2, LucideChevronRight, LucidePower 
} from "lucide-react";

type JarvisState = "IDLE" | "LISTENING" | "THINKING" | "SPEAKING";

export default function JarvisOS() {
  const [isSystemActive, setIsSystemActive] = useState(false);
  const [state, setState] = useState<JarvisState>("IDLE");
  const [status, setStatus] = useState("CORE_READY");
  const [response, setResponse] = useState("");
  const [log, setLog] = useState<{msg: string, time: string}[]>([]);

  const recognitionRef = useRef<any>(null);
  const stateRef = useRef<JarvisState>("IDLE");

  // Keep stateRef in sync for speech callbacks
  useEffect(() => { stateRef.current = state; }, [state]);

  const addToLog = (msg: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLog(prev => [{msg, time}, ...prev].slice(0, 5));
  };

  // --- 1. VOICE OUTPUT (THE MOUTH) ---
  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text);
    speech.rate = 0.9;
    speech.onstart = () => {
      setState("SPEAKING");
      addToLog("OUTPUT_STREAM: ACTIVE");
    };
    speech.onend = () => {
      if (stateRef.current === "SPEAKING") {
        setState("LISTENING");
        setStatus("AWAITING COMMAND...");
      }
    };
    window.speechSynthesis.speak(speech);
  };

  // --- 2. THE BRAIN (API CONNECTION) ---
  const askJarvisAI = async (input: string) => {
    setState("THINKING");
    setStatus("DECRYPTING...");
    addToLog(`INPUT: ${input.toUpperCase()}`);
    
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });
      const data = await res.json();
      setResponse(data.reply);
      speak(data.reply);
    } catch {
      setState("LISTENING");
      setStatus("LINK_FAILURE");
    }
  };

  // --- 3. START SYSTEM (THE EARS) ---
  const startSystem = () => {
    setIsSystemActive(true);
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      if (event.results[event.results.length - 1].isFinal && stateRef.current === "LISTENING") {
        setStatus(transcript.toUpperCase());
        askJarvisAI(transcript);
      }
    };

    recognition.onend = () => { 
      if (stateRef.current !== "IDLE") try { recognition.start(); } catch(e) {} 
    };

    recognition.start();
    setState("LISTENING");
    setStatus("NEURAL CORE ONLINE");
    addToLog("Neural link established.");
  };

  const activeColor = { LISTENING: "#22d3ee", THINKING: "#a855f7", SPEAKING: "#ffffff", IDLE: "#334155" }[state];

  // --- VIEW: LANDING ---
  if (!isSystemActive) {
    return (
      <main className="min-h-screen bg-[#020617] text-white flex items-center justify-center p-6 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(30,58,138,0.2)_0%,rgba(2,6,23,1)_100%)]" />
        <div className="relative z-10 max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold mb-8">
            <LucideZap size={14} /> v2.0 NEURAL INTERFACE
          </div>
          <h1 className="text-7xl font-extrabold mb-6 tracking-tighter">
            Build smarter. <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400">Ship faster.</span>
          </h1>
          <button 
            onClick={startSystem}
            className="px-10 py-5 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl font-bold flex items-center gap-3 mx-auto hover:scale-105 transition-all shadow-2xl shadow-blue-500/20 group"
          >
            Launch System <LucideChevronRight size={18} />
          </button>
        </div>
      </main>
    );
  }

  // --- VIEW: JARVIS ---
  return (
    <main className="min-h-screen bg-[#010101] text-white font-mono p-8 relative">
      <div className="max-w-7xl mx-auto grid grid-cols-12 gap-8 pt-10">
        
        {/* LOGS */}
        <div className="col-span-12 lg:col-span-3">
          <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 min-h-[400px] backdrop-blur-md">
            <div className="flex items-center gap-2 mb-8 text-gray-500 text-[10px] tracking-[0.3em] uppercase">
              <LucideTerminal size={14} /> System_Logs
            </div>
            <div className="space-y-6">
              {log.map((entry, i) => (
                <div key={i} className="border-l-2 border-cyan-500/30 pl-4">
                  <p className="text-[8px] text-gray-600 mb-1">{entry.time}</p>
                  <p className="text-[11px] text-gray-300">{entry.msg}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CENTER ORB */}
        <div className="col-span-12 lg:col-span-6 flex flex-col items-center">
          <div 
            className="relative w-80 h-80 rounded-full flex items-center justify-center transition-all duration-1000"
            style={{ 
              boxShadow: `0 0 100px ${activeColor}15`,
              border: `1px solid ${activeColor}30`,
              background: `radial-gradient(circle, ${activeColor}05 0%, transparent 70%)`
            }}
          >
            <div className="z-10 text-center">
              <div className="text-[10px] tracking-[0.8em] text-white/30 uppercase mb-4">{state}</div>
              {state === "THINKING" ? (
                <LucideLoader2 className="animate-spin text-purple-400" size={48} />
              ) : (
                <LucideMic style={{ color: activeColor }} size={48} />
              )}
            </div>
          </div>
          <div className="mt-20 text-center">
            <p className="text-2xl font-light tracking-wide italic">{status}</p>
            {response && (
              <div className="mt-8 p-6 bg-white/[0.03] border border-white/10 rounded-2xl max-w-md mx-auto">
                <p className="text-cyan-100/70 text-sm">"{response}"</p>
              </div>
            )}
          </div>
        </div>

        {/* SYSTEM STATS */}
        <div className="col-span-12 lg:col-span-3 space-y-6">
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
            <LucideCpu className="text-cyan-500 mb-4" size={20} />
            <h4 className="text-[10px] font-bold tracking-widest uppercase mb-2">Neural Link</h4>
            <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
               <div className="h-full bg-cyan-500 w-full animate-pulse" />
            </div>
          </div>
          <button onClick={() => window.location.reload()} className="w-full p-4 rounded-xl bg-red-500/5 border border-red-500/10 text-red-500 text-[10px] font-bold uppercase tracking-widest">
            <LucidePower className="inline mr-2" size={14} /> Shutdown
          </button>
        </div>

      </div>
    </main>
  );
}
