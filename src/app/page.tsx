"use client";
import { useState, useRef, useEffect } from "react";

type JarvisState = "IDLE" | "LISTENING" | "THINKING" | "SPEAKING";

interface MemoryItem {
  type: "identity" | "preference" | "relationship" | "general";
  key: string;
  value: string;
}

export default function Home() {
  const [state, setState] = useState<JarvisState>("IDLE");
  const [status, setStatus] = useState("SYSTEM READY");
  const [volume, setVolume] = useState(0);
  const [memory, setMemory] = useState<MemoryItem[]>([]);

  const stateRef = useRef<JarvisState>("IDLE");
  const recognitionRef = useRef<any>(null);

  useEffect(() => { stateRef.current = state; }, [state]);

  // Load memory once on mount
  useEffect(() => {
    const saved = localStorage.getItem("jarvis_memory");
    if (saved) setMemory(JSON.parse(saved));
  }, []);

  // 🧠 THE SMART CLASSIFIER (Fixed for React)
  const classifyAndStore = (text: string) => {
    const lower = text.toLowerCase();
    let newItem: MemoryItem | null = null;

    if (lower.includes("my name is")) {
      newItem = { type: "identity", key: "name", value: text.split("is")[1].trim() };
    } else if (lower.includes("i like")) {
      newItem = { type: "preference", key: "likes", value: text.split("like")[1].trim() };
    } else if (lower.includes("my girlfriend is") || lower.includes("my friend is")) {
      newItem = { type: "relationship", key: "friend", value: text.split("is")[1].trim() };
    }

    if (newItem) {
      const updatedMemory = [...memory.filter(m => m.key !== newItem!.key), newItem];
      setMemory(updatedMemory);
      localStorage.setItem("jarvis_memory", JSON.stringify(updatedMemory));
      return `Noted, Sir. I have updated your ${newItem.type} records.`;
    }
    return null;
  };

  const askJarvisAI = async (input: string) => {
    setState("THINKING");
    
    // Check if we need to store a memory first
    const memoryFeedback = classifyAndStore(input);
    
    // Format the memory for the AI
    const memoryContext = memory.length > 0 
      ? memory.map(m => `${m.type.toUpperCase()}: ${m.key} = ${m.value}`).join("\n")
      : "No user data stored yet.";

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: input,
          memory: memoryContext // Send the structured string
        }),
      });
      const data = await res.json();
      
      // If we learned something, prepend it to the status
      setStatus(memoryFeedback ? `${memoryFeedback} ${data.reply}` : data.reply);
      speak(data.reply);
    } catch {
      setState("LISTENING");
      setStatus("CONNECTION ERROR: NEURAL CORE OFFLINE");
    }
  };

  // ... (Keep your startAudio, speak, and startSystem functions exactly as they were)
  // ... (Keep your Return UI exactly as it was)
