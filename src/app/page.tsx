"use client";
import { useState, useRef, useEffect } from "react";
import { 
  SignInButton, 
  UserButton, 
  SignedOut, 
  SignedIn 
} from "@clerk/nextjs"; //
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

  useEffect(() => { stateRef.current = state; }, [state]);

  const addToLog = (msg: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLog(prev => [{msg, time}, ...prev].slice(0, 5));
  };

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text);
    speech.rate = 0.9;
    speech.onstart = () => setState("SPEAKING");
    speech.onend = () => { if (stateRef.current === "SPEAKING") setState("LISTENING"); };
    window.speechSynthesis.speak(speech);
  };

  const askJarvisAI = async (input: string) => {
    setState("THINKING");
    setStatus("DECRYPTING...");
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

  const startSystem = () => {
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

    recognition.onend = () => { if (stateRef.current !== "IDLE") try { recognition.start(); } catch(e) {} };
    recognition.start();
    setIsSystemActive(true);
    setState("LISTENING");
    setStatus("NEURAL CORE ONLINE");
    addToLog("Neural link established.");
  };

  const activeColor = { LISTENING: "#22d3ee", THINKING: "#a855f7", SPEAKING: "#ffffff", IDLE: "#334155" }[state];

  return (
    <main className="min-h-screen bg-[#020617] text-white font-mono relative overflow-hidden">
      
      {/* 🧭 RESTORED NAV BAR */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 backdrop-blur-xl bg-[#020617]/50">
        <div className="max-w-7xl mx-auto px-6 h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LucideCpu size={18} className="text-blue-500" />
            <span className="font-bold text-xl tracking-tight">JARVIS<span className="text-blue-500 font-light">OS</span></span>
          </div>
          
          <div className="flex items-center gap-4">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm font-medium transition-all">
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </div>
        </div>
      </nav>

      {/* --- CONDITIONAL CONTENT --- */}
      {!isSystemActive ? (
        <div className="flex items-center justify-center min-h-screen pt-20">
          <div className="text-center z-10">
             <h1 className="text-6xl font-extrabold mb-8 tracking-tighter">Build smarter.</h1>
             <button 
               onClick={startSystem}
               className="px-10 py-5 bg-blue-600 rounded-2xl font-bold flex items-center gap-3 mx-auto hover:scale-105 transition-all shadow-2xl shadow-blue-600/20"
             >
               Launch System <LucideChevronRight />
             </button>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto grid grid-cols-12 gap-8 pt-32 px-6">
          {/* ORB UI LOGIC */}
          <div className="col-span-12 lg:col-span-3">
            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 min-h-[300px]">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-4">Telemetry</p>
              {log.map((l, i) => <p key={i} className="text-[11px] text-gray-400 mb-2">{l.msg}</p>)}
            </div>
          </div>

          <div className="col-span-12 lg:col-span-6 flex flex-col items-center">
            <div 
              className="w-64 h-64 rounded-full flex items-center justify-center transition-all duration-700"
              style={{ border: `1px solid ${activeColor}40`, boxShadow: `0 0 60px ${activeColor}15` }}
            >
              <LucideMic style={{ color: activeColor }} size={40} />
            </div>
            <p className="mt-10 text-xl font-light italic">{status}</p>
          </div>

          <div className="col-span-12 lg:col-span-3">
             <button onClick={() => window.location.reload()} className="w-full p-4 bg-red-500/10 text-red-500 rounded-xl text-xs font-bold uppercase tracking-widest">
               <LucidePower className="inline mr-2" size={14} /> Shutdown
             </button>
          </div>
        </div>
      )}
    </main>
  );
}
