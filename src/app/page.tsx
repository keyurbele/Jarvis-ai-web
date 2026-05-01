"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { SignInButton, UserButton, SignedOut, SignedIn, useUser } from "@clerk/nextjs";
import { LucideCpu, LucideMic, LucideMicOff, LucidePower, LucideTerminal, LucideBrain } from "lucide-react";

type JarvisState = "IDLE" | "LISTENING" | "THINKING" | "SPEAKING";

export default function JarvisOS() {
  const { user } = useUser();
  const [isActive, setIsActive] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [state, setState] = useState<JarvisState>("IDLE");
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [memory, setMemory] = useState<any>({});
  const [log, setLog] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  const recognitionRef = useRef<any>(null);
  const historyRef = useRef<any[]>([]);
  const stateRef = useRef<JarvisState>("IDLE");
  const micOnRef = useRef(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { micOnRef.current = micOn; }, [micOn]);

  useEffect(() => {
    if (user?.id) {
      const saved = localStorage.getItem(`jarvis_mem_${user.id}`);
      if (saved) setMemory(JSON.parse(saved));
    }
  }, [user?.id]);

  // --- 1. THE MOUTH (VOICE REMAINS UNCHANGED) ---
  const speak = useCallback((text: string) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.pitch = 0.75; 
    u.rate = 0.80;  
    u.volume = 1.0; 

    const voices = window.speechSynthesis.getVoices();
    const bestVoice = voices.find(v => v.name.includes("Google UK English Male")) || 
                      voices.find(v => v.name.includes("James")) ||
                      voices.find(v => v.name.includes("David"));
    
    if (bestVoice) u.voice = bestVoice;

    u.onstart = () => setState("SPEAKING");
    u.onend = () => {
      if (micOnRef.current) {
        setState("LISTENING");
        setTimeout(() => { try { recognitionRef.current?.start(); } catch {} }, 350);
      } else { setState("IDLE"); }
    };
    window.speechSynthesis.speak(u);
  }, []);

  // --- 2. THE BRAIN (LOGIC REMAINS UNCHANGED) ---
  const askJarvis = useCallback(async (input: string) => {
    if (!input.trim()) return;
    window.speechSynthesis.cancel();
    setState("THINKING");
    setTranscript(input);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, history: historyRef.current, memory }),
      });
      const data = await res.json();
      
      setResponse(data.reply);
      if (data.memory) {
        setMemory(data.memory);
        if (user?.id) localStorage.setItem(`jarvis_mem_${user.id}`, JSON.stringify(data.memory));
      }

      historyRef.current = [...historyRef.current, { role: "user", content: input }, { role: "assistant", content: data.reply }].slice(-10);
      setLog(prev => [`USER: ${input.toUpperCase()}`, `JARVIS: ${data.reply}`, ...prev].slice(0, 5));
      speak(data.reply);
    } catch { setState("IDLE"); }
  }, [memory, speak, user?.id]);

  // --- 3. THE EARS (INTERRUPT LOGIC UNCHANGED) ---
  const setupRecognition = useCallback(() => {
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) return null;
    const r = new SR();
    r.continuous = true;
    r.interimResults = true; 
    r.lang = "en-US";
    r.onresult = (e: any) => {
      const result = e.results[e.results.length - 1];
      const text = result[0].transcript.trim();
      if (text.length > 2 && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        setState("LISTENING");
      }
      if (result.isFinal) askJarvis(text);
    };
    r.onend = () => {
      if (micOnRef.current && stateRef.current !== "THINKING" && stateRef.current !== "SPEAKING") {
        try { r.start(); } catch {}
      }
    };
    return r;
  }, [askJarvis]);

  const toggleMic = () => {
    if (micOnRef.current) {
      setMicOn(false);
      setState("IDLE");
      window.speechSynthesis.cancel();
      try { recognitionRef.current?.stop(); } catch {}
    } else {
      if (!recognitionRef.current) recognitionRef.current = setupRecognition();
      setMicOn(true);
      setState("LISTENING");
      try { recognitionRef.current?.start(); } catch {}
    }
  };

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-[#020617] text-slate-300 font-sans selection:bg-cyan-500/30 overflow-hidden">
      {/* HEADER */}
      <nav className="border-b border-white/5 bg-[#020617]/80 backdrop-blur-md px-8 h-16 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-cyan-500/20 rounded flex items-center justify-center border border-cyan-400/30">
            <LucideCpu size={18} className="text-cyan-400" />
          </div>
          <span className="font-bold tracking-tighter text-lg uppercase italic">Jarvis<span className="text-cyan-400 font-light">OS</span></span>
        </div>
        <div className="flex gap-8 text-[10px] tracking-[0.2em] font-medium text-slate-500 uppercase">
          <span className="text-cyan-400 border-b border-cyan-400 pb-1 cursor-pointer">Core</span>
          <span className="hover:text-slate-300 cursor-pointer transition-colors">Home</span>
          <span className="hover:text-slate-300 cursor-pointer transition-colors">Memory</span>
          <span className="hover:text-slate-300 cursor-pointer transition-colors">Logs</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-cyan-950/30 px-3 py-1 rounded-full border border-cyan-500/20">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[9px] text-cyan-400 font-bold uppercase tracking-widest">Neural Active</span>
          </div>
          <SignedIn><UserButton /></SignedIn>
        </div>
      </nav>

      {/* DASHBOARD LAYOUT */}
      {!isActive ? (
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <button onClick={() => { setIsActive(true); speak("System initialized."); }} className="px-12 py-5 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-cyan-400 font-bold hover:bg-cyan-500/20 transition-all uppercase tracking-widest">Initialize System</button>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-0 h-[calc(100vh-4rem)]">
          {/* LEFT SIDEBAR */}
          <aside className="col-span-3 border-r border-white/5 p-8 space-y-10 bg-gradient-to-b from-transparent to-black/20">
            <section>
              <p className="text-[9px] text-slate-600 uppercase tracking-[0.3em] mb-6">Navigation</p>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-cyan-500/10 border border-cyan-400/30 text-cyan-400 text-xs font-semibold">
                  <LucideMic size={16} /> Voice Core
                </div>
                {['Dashboard', 'Memory', 'Settings'].map((item) => (
                  <div key={item} className="flex items-center gap-3 p-3 text-slate-500 hover:text-slate-300 transition-colors text-xs cursor-pointer">
                    <LucideTerminal size={16} /> {item}
                  </div>
                ))}
              </div>
            </section>
            <section>
              <p className="text-[9px] text-slate-600 uppercase tracking-[0.3em] mb-6">Smart Home</p>
              <div className="space-y-4">
                {[{ label: 'Living Rm', active: true }, { label: 'Bedroom Fan', active: true }, { label: 'Front Door', active: false }].map((device) => (
                  <div key={device.label} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/5">
                    <span className="text-[11px] font-medium">{device.label}</span>
                    <div className={`w-8 h-4 rounded-full p-1 ${device.active ? 'bg-cyan-500' : 'bg-slate-700'}`}>
                      <div className={`w-2 h-2 bg-white rounded-full ${device.active ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </aside>

          {/* CENTER INTERFACE */}
          <main className="col-span-6 flex flex-col items-center justify-center relative p-12">
            <div className="relative w-96 h-96 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-cyan-500/5 animate-[spin_20s_linear_infinite]" />
              <div className="absolute inset-4 rounded-full border border-cyan-500/10 animate-[spin_15s_linear_infinite_reverse]" />
              <div className={`w-64 h-64 rounded-full flex items-center justify-center transition-all duration-700 ${state === 'LISTENING' ? 'bg-cyan-500/10 shadow-[0_0_100px_rgba(34,211,238,0.1)]' : 'bg-transparent'}`}>
                <LucideMic size={48} className={state === 'LISTENING' ? 'text-cyan-400' : 'text-slate-800'} />
              </div>
            </div>
            <div className="w-full max-w-lg mt-8 p-6 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-xl text-center">
              <p className="text-sm italic text-slate-300 leading-relaxed font-light">{response || "Awaiting command..."}</p>
            </div>
            <div className="mt-12 flex gap-8">
              <button onClick={toggleMic} className="flex flex-col items-center gap-2">
                <div className={`w-14 h-14 rounded-full border flex items-center justify-center transition-all ${micOn ? 'bg-cyan-500 border-cyan-400' : 'bg-white/5 border-white/10'}`}>
                  <LucideMic size={20} className={micOn ? 'text-[#020617]' : 'text-slate-500'} />
                </div>
                <span className="text-[9px] uppercase tracking-widest text-slate-600">Mic {micOn ? 'On' : 'Off'}</span>
              </button>
              <button onClick={() => window.location.reload()} className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center"><LucidePower size={20} className="text-red-500" /></div>
                <span className="text-[9px] uppercase tracking-widest text-slate-600">Shutdown</span>
              </button>
            </div>
          </main>

          {/* RIGHT SIDEBAR */}
          <aside className="col-span-3 border-l border-white/5 p-8 space-y-10">
            <section className="grid grid-cols-2 gap-4">
              {[{ label: 'Temp', val: '24°' }, { label: 'Active', val: '3' }, { label: 'Uptime', val: '98%' }, { label: 'Model', val: '70B' }].map((stat) => (
                <div key={stat.label} className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-xl font-bold text-cyan-400 block">{stat.val}</span>
                  <span className="text-[8px] text-slate-600 uppercase tracking-widest">{stat.label}</span>
                </div>
              ))}
            </section>
            <section>
              <p className="text-[9px] text-slate-600 uppercase tracking-[0.3em] mb-6">Memory</p>
              <div className="flex flex-wrap gap-2">
                {['Keyur', 'Likes coding', 'Night owl'].map(tag => (
                  <span key={tag} className="px-3 py-1 rounded-full bg-cyan-500/5 border border-cyan-500/20 text-[9px] text-cyan-400 uppercase tracking-wider">• {tag}</span>
                ))}
              </div>
            </section>
            <section className="flex-1">
              <p className="text-[9px] text-slate-600 uppercase tracking-[0.3em] mb-6">System Log</p>
              <div className="space-y-4 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {log.map((l, i) => (
                  <div key={i} className="text-[9px] border-l border-cyan-500/20 pl-3 py-1">
                    <p className="text-slate-500 uppercase mb-1">{new Date().toLocaleTimeString()}</p>
                    <p className="text-slate-400 italic line-clamp-2">{l}</p>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
