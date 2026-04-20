"use client";
import { useState, useRef, useEffect } from "react";

type JarvisState = "IDLE" | "LISTENING" | "THINKING" | "SPEAKING";

export default function Home() {
  const [state, setState] = useState<JarvisState>("IDLE");
  const [status, setStatus] = useState("Ready for orders, Sir.");
  
  // 💡 This Ref is the secret sauce: it lets the listener see the state change
  const stateRef = useRef<JarvisState>("IDLE");
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(true);

  // Sync the ref with the state
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const speak = (text: string) => {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    
    const speech = new SpeechSynthesisUtterance(text);
    speech.onstart = () => setState("SPEAKING");
    speech.onend = () => {
      setTimeout(() => setState("LISTENING"), 500);
    };

    speech.rate = 0.9;
    speech.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const jarvisVoice = voices.find(v => v.name.includes("Google UK English Male") || v.name.includes("Microsoft James"));
    if (jarvisVoice) speech.voice = jarvisVoice;
    
    window.speechSynthesis.speak(speech);
  };

  const saveMemory = (text: string) => {
    const memory = JSON.parse(localStorage.getItem("jarvis_memory") || "[]");
    const cleanedFact = text.replace(/remember|note that|my name is/gi, "").trim();
    if (cleanedFact) {
      memory.push(`[Fact]: ${cleanedFact}`);
      localStorage.setItem("jarvis_memory", JSON.stringify(memory.slice(-10)));
    }
  };

  const askJarvisAI = async (input: string) => {
    setState("THINKING");
    const memory = JSON.parse(localStorage.getItem("jarvis_memory") || "[]");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, memory: memory.slice(-5) }), 
      });
      const data = await res.json();
      if (data.reply) {
        setStatus(data.reply);
        speak(data.reply);
      }
    } catch {
      setStatus("Neural link failure, Sir.");
      setState("LISTENING");
    }
  };

  const handleInput = (text: string) => {
    const lower = text.toLowerCase();
    if (lower.includes("stop") || lower.includes("be quiet")) {
      window.speechSynthesis.cancel();
      setState("LISTENING");
      return;
    }
    if (lower.includes("remember") || lower.includes("my name is")) {
      saveMemory(text);
      setStatus("Fact indexed, Sir.");
      speak("I've added that to my database.");
      return;
    }
    askJarvisAI(text);
  };

  const startListening = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
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

        // 🔊 INTERRUPT CHECK (Using stateRef.current instead of state)
        if (stateRef.current === "SPEAKING" && result.isFinal && confidence > 0.6) {
          if (["jarvis", "stop", "wait", "shut up"].some(word => transcript.includes(word))) {
            window.speechSynthesis.cancel();
            setState("LISTENING");
            setStatus("Standing by...");
            return;
          }
        }

        // ✅ COMMAND CHECK
        if (result.isFinal && confidence > 0.7 && stateRef.current === "LISTENING") {
          setStatus(`"${transcript}"`);
          handleInput(transcript);
        }
      }
    };

    recognition.onend = () => { 
      if (isListeningRef.current) setTimeout(() => recognition.start(), 300); 
    };

    recognition.start();
    setState("LISTENING");
    setStatus("System Online.");
  };

  const getOrbStyle = () => {
    switch (state) {
      case "LISTENING": return "border-green-400 shadow-[0_0_50px_rgba(74,222,128,0.4)] bg-green-500/5";
      case "THINKING":  return "border-amber-400 shadow-[0_0_70px_rgba(251,191,36,0.5)] bg-amber-500/10 animate-pulse scale-105";
      case "SPEAKING":  return "border-cyan-400 shadow-[0_0_90px_rgba(34,211,238,0.6)] bg-cyan-500/10 animate-bounce";
      default:          return "border-cyan-900/30 bg-slate-900/50";
    }
  };

  return (
    <main className="h-screen w-full bg-black flex flex-col items-center justify-center text-white p-4 overflow-hidden font-mono">
      <div className={`w-56 h-56 rounded-full transition-all duration-700 border-2 relative flex items-center justify-center ${getOrbStyle()}`}>
        <div className={`w-32 h-32 rounded-full border border-white/5 transition-all duration-500 ${state !== "IDLE" ? "opacity-100" : "opacity-0"}`} />
        {state === "THINKING" && <div className="absolute inset-0 rounded-full border-t-2 border-amber-400 animate-spin" />}
      </div>

      <div className="mt-12 text-center h-24">
        <p className="text-[10px] tracking-[0.4em] text-cyan-900 uppercase font-bold mb-2">Neural State: {state}</p>
        <p className="text-xl text-cyan-400 max-w-xl italic drop-shadow-md">
          {status}
        </p>
      </div>

      <button onClick={startListening} className={`mt-10 px-8 py-3 border transition-all tracking-widest text-xs ${state === "IDLE" ? "border-cyan-500 text-cyan-500 hover:bg-cyan-500/10" : "border-transparent text-cyan-900 cursor-default"}`}>
        {state === "IDLE" ? "[ INITIALIZE SYSTEM ]" : "[ SYSTEM ONLINE ]"}
      </button>
    </main>
  );
}
