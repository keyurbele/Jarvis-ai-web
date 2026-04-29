"use client";
import { useState, useRef, useEffect } from "react";
import { 
  LucideBrain, LucideMic, LucideZap, LucideTerminal, 
  LucideCpu, LucideLoader2, LucideHome 
} from "lucide-react";
import Link from "next/link";

type JarvisState = "IDLE" | "LISTENING" | "THINKING" | "SPEAKING";

export default function Dashboard() {
  const [state, setState] = useState<JarvisState>("IDLE");
  const [status, setStatus] = useState("SYSTEM READY");
  const [response, setResponse] = useState("");
  const [log, setLog] = useState<{msg: string, time: string}[]>([]);

  const recognitionRef = useRef<any>(null);
  const stateRef = useRef<JarvisState>("IDLE");

  // Keep Ref in sync with State for the recognition callbacks
  useEffect(() => { 
    stateRef.current = state; 
  }, [state]);

  const addToLog = (msg: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLog(prev => [{msg, time}, ...prev].slice(0, 5));
  };

  // --- 1. VOICE OUTPUT (THE MOUTH) ---
  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text);
    
    // Set JARVIS tone
    speech.rate = 0.9;
    speech.pitch = 1.0;

    speech.onstart = () => {
      setState("SPEAKING");
      addToLog("OUTPUT_STREAM: ACTIVE");
    };

    speech.onend = () => {
      // Once done talking, go back to listening mode
      if (stateRef.current === "SPEAKING") {
        setState("LISTENING");
        setStatus("AWAITING COMMAND...");
      }
    };

    window.speechSynthesis.speak(speech);
  };

  // --- 2. INSTANT COMMANDS ---
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
    return false;
  };

  // --- 3. THE BRAIN (API CONNECTION) ---
  const askJarvisAI = async (input: string) => {
    if (handleInstantCommands(input)) return;

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
      
      const cleanReply = data.reply.replace(/SYSTEM_REPLY:|\[.*?\]/gi, "").trim();
      
      setResponse(cleanReply);
      speak(cleanReply);
    } catch (error) {
      setState("LISTENING");
      setStatus("LINK_FAILURE");
      addToLog("CRITICAL: API_ERROR");
    }
  };

  // --- 4. START SYSTEM ---
  const startSystem = () => {
    if (state !== "IDLE") return;
    
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      
      // Only process when the user stops speaking and the system is in Listening mode
      if (event.results[event.results.length - 1].isFinal && stateRef.current === "LISTENING") {
        setStatus(transcript.toUpperCase());
        askJarvisAI(transcript);
      }
    };

    // Auto-restart if it crashes or stops
    recognition.onend = () => { 
      if (stateRef.current !== "IDLE") {
        try { recognition.start(); } catch(e) {}
      }
    };

    recognition.start();
    setState("LISTENING");
    setStatus("NEURAL CORE ONLINE");
    addToLog("Neural link active.");
  };

  // Visual Colors based on State
  const activeColor = { 
    LISTENING: "rgba(34, 211, 238, 1)", // Cyan
    THINKING: "rgba(168, 85, 247, 1)",  // Purple
    SPEAKING: "rgba(255, 255, 255, 1)", // White
    IDLE: "rgba(59, 130, 246, 0.2)"     // Dim Blue
  }[state];

  return (
    <main className="min-h-screen bg-[#010101] text-white font-mono overflow-hidden relative">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(15,23,42,1)_0%,rgba(0,0,0,1)_100%)]" />

      <div className="max-w-7xl mx-auto px-6 py-10 relative z-10">
        <nav className="flex justify-between items-center mb-16 border-b border-white/5 pb-8">
          <div className="flex items-center gap-3">
            <LucideCpu className="text-cyan-500" size={24} />
            <span className="text-xl font-bold tracking-[0.2em]">JARVIS<span className="text-cyan-500 font-light ml-1">OS</span></span>
          </div>
          <Link href="/" className="text-[10px] tracking-widest text-gray-500 hover:text-white transition-colors">TERMINATE_SESSION</Link>
        </nav>

        <div className="grid grid-cols-12 gap-8 items-start">
          {/* LEFT: TELEMETRY LOGS */}
          <div className="col-span-12 lg:col-span-3 space-y-4">
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-md">
              <div className="flex items-center gap-2 mb-6 text-gray-500 text-[10px] tracking-widest uppercase">
                <LucideTerminal size={14} /> System_Logs
              </div>
              <div className="space-y-4">
                {log.map((entry, i) => (
                  <div key={i} className="border-l border-cyan-500/20 pl-4 animate-in slide-in-from-left duration-500">
                    <p className="text-[8px] text-gray-600">{entry.time}</p>
                    <p className="text-[11px] text-gray-300 truncate">{entry.msg}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CENTER: THE ORB */}
          <div className="col-span-12 lg:col-span-6 flex flex-col items-center justify-center py-10">
            <div 
              className="relative cursor-pointer group"
              onClick={state === "IDLE" ? startSystem : undefined}
            >
              {/* Spinning outer ring */}
              <div className={`absolute -inset-10 border border-white/5 rounded-full ${state !== "IDLE" ? "animate-[spin_20s_linear_infinite]" : ""}`} />
              
              {/* The Orb Shell */}
              <div 
                className="relative w-72 h-72 rounded-full flex items-center justify-center transition-all duration-700"
                style={{ 
                  boxShadow: `0 0 80px ${activeColor}20`,
                  border: `1px solid ${activeColor}40`,
                  background: `radial-gradient(circle, ${activeColor}10 0%, transparent 70%)`
                }}
              >
                {/* Plasma Core */}
                <div className={`absolute inset-4 rounded-full border border-white/5 transition-opacity duration-1000 ${state !== "IDLE" ? "opacity-100" : "opacity-10"}`}>
                   <div className="absolute inset-0 rounded-full border-t-2 border-cyan-500/30 blur-[2px] animate-[spin_3s_linear_infinite]" />
                   <div className="absolute inset-4 rounded-full border-l-2 border-purple-500/30 blur-[2px] animate-[spin_4s_linear_infinite_reverse]" />
                </div>

                <div className="z-20 text-center">
                  <div className={`text-[9px] tracking-[0.6em] uppercase mb-4 transition-colors duration-500`} style={{ color: activeColor }}>
                    {state}
                  </div>
                  {state === "THINKING" ? (
                    <LucideLoader2 className="animate-spin text-purple-400" size={40} />
                  ) : (
                    <LucideMic className={state !== 'IDLE' ? "text-white" : "text-gray-700"} size={40} />
                  )}
                </div>
              </div>
            </div>

            <div className="mt-16 text-center h-20 px-4">
              <p className="text-xl font-light tracking-wide text-white/90 italic max-w-lg mx-auto">
                {status}
              </p>
            </div>
          </div>

          {/* RIGHT: MODULES */}
          <div className="col-span-12 lg:col-span-3 space-y-6">
             <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-cyan-500/30 transition-colors">
               <LucideBrain className="text-cyan-500/50 mb-4" size={20} />
               <h4 className="text-[10px] font-bold tracking-widest uppercase mb-2">Neural_Core</h4>
               <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                 <div className={`h-full bg-cyan-500 transition-all duration-1000 ${state !== 'IDLE' ? 'w-full' : 'w-0'}`} />
               </div>
             </div>
             
             <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-purple-500/30 transition-colors">
               <LucideZap className="text-purple-500/50 mb-4" size={20} />
               <h4 className="text-[10px] font-bold tracking-widest uppercase mb-2">Sync_Latency</h4>
               <p className="text-[10px] text-gray-500 font-mono">0.0014 MS</p>
             </div>
          </div>
        </div>
      </div>
    </main>
  );
}
