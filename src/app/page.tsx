"use client";
import { useState, useRef, useEffect } from "react";

type JarvisState = "IDLE" | "LISTENING" | "THINKING" | "SPEAKING";

export default function Home() {
  const [state, setState] = useState<JarvisState>("IDLE");
  const [status, setStatus] = useState("Ready for orders, Sir.");
  
  const stateRef = useRef<JarvisState>("IDLE");
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(true);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const speak = (text: string) => {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text);
    
    speech.onstart = () => setState("SPEAKING");
    speech.onend = () => {
      setTimeout(() => {
        if (stateRef.current === "SPEAKING") setState("LISTENING");
      }, 600);
    };

    speech.rate = 0.9;
    const voices = window.speechSynthesis.getVoices();
    const jarvisVoice = voices.find(v => v.name.includes("Google UK English Male")) || voices[0];
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

      if (!res.ok) throw new Error(data.error || "Server error");

      if (data.reply) {
        setStatus(data.reply);
        speak(data.reply);
      } else {
        throw new Error("Empty reply from server");
      }
    } catch (err: any) {
      console.error("AI Error:", err);
      setStatus(`Error: ${err.message}`);
      setState("LISTENING");
    }
  };

  const saveMemory = (text: string) => {
    try {
      const stored = localStorage.getItem("jarvis_memory");
      const memory = stored ? JSON.parse(stored) : [];
      const cleanedFact = text.replace(/remember|note that|my name is/gi, "").trim();
      
      if (cleanedFact) {
        memory.push(`[Fact]: ${cleanedFact}`);
        localStorage.setItem("jarvis_memory", JSON.stringify(memory.slice(-10)));
      }
    } catch (e) {
      localStorage.setItem("jarvis_memory", "[]");
    }
  };

  const handleInput = (text: string) => {
    const lower = text.toLowerCase();
    if (["stop", "shut up", "be quiet"].some(cmd => lower.includes(cmd))) {
      window.speechSynthesis.cancel();
      setState("LISTENING");
      setStatus("Standing by, Sir.");
      return;
    }
    if (lower.includes("remember") || lower.includes("my name is")) {
      saveMemory(text);
      setStatus("Information recorded.");
      speak("I've added that to my database, Sir.");
      return;
    }
    askJarvisAI(text);
  };

  const startListening = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) return alert("Please use Chrome, Sir.");

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        const transcript = result[0].transcript.toLowerCase();
        const confidence = result[0].confidence;

        if (stateRef.current === "SPEAKING" && result.isFinal && confidence > 0.6) {
          if (["jarvis", "stop", "wait"].some(w => transcript.includes(w))) {
            window.speechSynthesis.cancel();
            setState("LISTENING");
            return;
          }
        }

        if (result.isFinal && confidence > 0.7 && stateRef.current === "LISTENING") {
          setStatus(`"${transcript}"`);
          handleInput(transcript);
        }
      }
    };

    recognition.onend = () => { 
      if (isListeningRef.current) setTimeout(() => {
        try { recognition.start(); } catch(e) {}
      }, 300); 
    };

    recognition.start();
    setState("LISTENING");
    setStatus("Neural link established.");
  };

  const getOrbStyle = () => {
    switch (state) {
      case "LISTENING": return "border-green-500 shadow-[0_0_40px_rgba(34,197,94,0.4)] bg-green-500/5";
      case "THINKING":  return "border-amber-400 shadow-[0_0_60px_rgba(251,191,36,0.5)] bg-amber-500/10 animate-pulse scale-110";
      case "SPEAKING":  return "border-cyan-400 shadow-[0_0_80px_rgba(34,211,238,0.6)] bg-cyan-500/10 animate-bounce";
      default:          return "border-cyan-900/20 bg-slate-900/40";
    }
  };

  return (
    <main className="h-screen w-full bg-black flex flex-col items-center justify-center text-white font-mono p-4">
      <div className={`w-64 h-64 rounded-full transition-all duration-1000 border-2 relative flex items-center justify-center ${getOrbStyle()}`}>
        <div className="absolute inset-4 rounded-full border border-white/5" />
        <div className={`w-24 h-24 rounded-full border border-cyan-400/20 transition-all ${state !== "IDLE" ? "scale-100 opacity-100" : "scale-0 opacity-0"}`} />
        {state === "THINKING" && <div className="absolute inset-0 rounded-full border-t-2 border-amber-400 animate-spin" />}
      </div>

      <div className="mt-16 text-center h-32 px-6">
        <p className="text-[10px] tracking-[0.5em] text-cyan-900 uppercase font-bold mb-4">Core State: {state}</p>
        <p className="text-xl text-cyan-400 max-w-2xl italic leading-relaxed">
          {status}
        </p>
      </div>

      <button 
        onClick={startListening} 
        className={`mt-8 px-10 py-4 border transition-all text-xs tracking-[0.2em] ${state === "IDLE" ? "border-cyan-500 text-cyan-500 hover:bg-cyan-500/10" : "border-transparent text-cyan-900 cursor-default"}`}
      >
        {state === "IDLE" ? "INITIALIZE" : "ONLINE"}
      </button>
    </main>
  );
}
