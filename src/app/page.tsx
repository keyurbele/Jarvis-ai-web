"use client";
import { useState, useRef, useEffect } from "react";

type JarvisState = "IDLE" | "LISTENING" | "THINKING" | "SPEAKING";

export default function Home() {
  const [state, setState] = useState<JarvisState>("IDLE");
  const [status, setStatus] = useState("Ready for orders, Sir.");
  const [volume, setVolume] = useState(0);

  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<any>(null);
  const analyserRef = useRef<any>(null);
  const dataArrayRef = useRef<any>(null);
  const animationRef = useRef<any>(null);
  const stateRef = useRef<JarvisState>("IDLE");

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // 🧠 START AUDIO VISUALIZER
  const startAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContext();

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();

      analyser.fftSize = 256;

      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;

      const update = () => {
        analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }

        const avg = sum / dataArray.length;

        // normalize 0–100 → 0–1
        setVolume(avg / 100);

        animationRef.current = requestAnimationFrame(update);
      };

      update();
    } catch (err) {
      console.error("Mic error:", err);
    }
  };

  // 🗣️ VOICE
  const speak = (text: string) => {
    window.speechSynthesis.cancel();

    const speech = new SpeechSynthesisUtterance(text);

    speech.onstart = () => setState("SPEAKING");
    speech.onend = () => setState("LISTENING");

    speech.rate = 0.9;
    speech.pitch = 1;

    window.speechSynthesis.speak(speech);
  };

  // 🧠 AI CALL
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

  // 🎤 MIC (SPEECH RECOGNITION)
  const startListening = () => {
    const SpeechRecognition =
      (window as any).webkitSpeechRecognition ||
      (window as any).SpeechRecognition;

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const text =
        event.results[event.results.length - 1][0].transcript.toLowerCase();

      setStatus(`You: ${text}`);
      askJarvisAI(text);
    };

    recognition.onend = () => recognition.start();

    recognition.start();
    setState("LISTENING");
    setStatus("Listening, Sir...");
  };

  useEffect(() => {
    startAudio();
    return () => cancelAnimationFrame(animationRef.current);
  }, []);

  // 🧿 ORB STYLE (VOICE REACTIVE)
  const orbScale = 1 + volume * 0.8;
  const glow = volume * 80;

  const getColor = () => {
    switch (state) {
      case "LISTENING":
        return "34,197,94"; // green
      case "THINKING":
        return "251,191,36"; // yellow
      case "SPEAKING":
        return "34,211,238"; // cyan
      default:
        return "148,163,184"; // gray
    }
  };

  const rgb = getColor();

  return (
    <main className="h-screen w-full bg-black flex flex-col items-center justify-center text-white overflow-hidden">
      {/* 🧿 ORB */}
      <div
        style={{
          transform: `scale(${orbScale})`,
          boxShadow: `0 0 ${glow}px rgba(${rgb},0.6)`,
          borderColor: `rgba(${rgb},0.6)`,
        }}
        className="w-56 h-56 rounded-full border-2 transition-all duration-100 flex items-center justify-center"
      >
        <div
          className="w-24 h-24 rounded-full bg-white/10 animate-pulse"
          style={{
            boxShadow: `0 0 ${glow / 2}px rgba(${rgb},0.4)`,
          }}
        />
      </div>

      {/* STATUS */}
      <div className="mt-12 text-center">
        <p className="text-xs tracking-[0.4em] text-gray-500 mb-2">
          STATE: {state}
        </p>
        <p className="text-cyan-400 text-lg max-w-xl">{status}</p>
      </div>

      {/* BUTTON */}
      <button
        onClick={startListening}
        className="mt-10 px-8 py-3 border border-cyan-500 text-cyan-400 hover:bg-cyan-500/10 transition"
      >
        INITIALIZE JARVIS
      </button>
    </main>
  );
}
