]"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { UserButton, useUser, useClerk } from "@clerk/nextjs";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

export default function JarvisOS() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [activeTab, setActiveTab] = useState("VOICE");
  const [isActive, setIsActive] = useState(false);
  const [response, setResponse] = useState("System Online.");
  const [jarvisName, setJarvisName] = useState("Jarvis");
  const [userHandle, setUserHandle] = useState("Sir");
  
  // Memory States
  const [memories, setMemories] = useState<any[]>([]);
  const [showHidden, setShowHidden] = useState(false);
  const [unlockPass, setUnlockPass] = useState("");
  const [nukeConfirm, setNukeConfirm] = useState("");

  // Load Profile and Memories
  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (data) {
          setJarvisName(data.jarvis_name);
          setUserHandle(data.user_handle);
        } else {
          await supabase.from("profiles").insert({ id: user.id, jarvis_name: "Jarvis", user_handle: "Sir" });
        }
      };
      const fetchMemories = async () => {
        const { data } = await supabase.from("memories").select("*").eq("user_id", user.id).eq("is_hidden", false);
        if (data) setMemories(data);
      };
      fetchProfile(); fetchMemories();
    }
  }, [user]);

  const updateProfile = async () => {
    await supabase.from("profiles").update({ jarvis_name: jarvisName, user_handle: userHandle }).eq("id", user?.id);
    alert("Profile Updated, Sir.");
  };

  const hideMemory = async (id: string) => {
    await supabase.from("memories").update({ is_hidden: true }).eq("id", id);
    setMemories(prev => prev.filter(m => m.id !== id));
  };

  const nukeMemory = async () => {
    if (nukeConfirm === "DELETE ALL") {
      await supabase.from("memories").delete().eq("user_id", user?.id);
      setMemories([]);
      setNukeConfirm("");
      alert("Memory wiped.");
    }
  };

  if (!isLoaded) return null;

  return (
    <main className="fixed inset-0 bg-[#010409] text-pink-500 font-sans flex flex-col overflow-hidden">
      {/* Navigation */}
      <nav className="h-20 px-10 flex items-center justify-between border-b border-pink-500/10 bg-black/40 backdrop-blur-xl z-50">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-pink-500 rounded-full shadow-[0_0_15px_#ff1493]" />
          <span className="text-xs font-bold tracking-[0.5em] uppercase">{jarvisName} OS</span>
        </div>
        <div className="flex gap-10 text-[10px] tracking-widest uppercase font-bold">
          {["Voice", "Archive", "Settings"].map(t => (
            <button key={t} onClick={() => setActiveTab(t.toUpperCase())} className={activeTab === t.toUpperCase() ? "text-white underline decoration-pink-500 underline-offset-8" : "hover:text-pink-300"}>{t}</button>
          ))}
        </div>
        <UserButton afterSignOutUrl="/" />
      </nav>

      <div className="flex-1 relative">
        {/* Tab 1: Voice (The Brain) */}
        {activeTab === "VOICE" && (
          <div className="h-full flex flex-col items-center justify-center space-y-10">
            <div className="w-64 h-64 rounded-full border border-pink-500/20 flex items-center justify-center animate-pulse">
               <div className="w-48 h-48 rounded-full border-2 border-pink-500 shadow-[0_0_50px_rgba(255,20,147,0.3)]" />
            </div>
            <p className="max-w-md text-center italic text-pink-200/70 text-sm px-10">{response}</p>
          </div>
        )}

        {/* Tab 2: Memory Archive (Swipe to Hide) */}
        {activeTab === "ARCHIVE" && (
          <div className="p-10 max-w-2xl mx-auto space-y-4 h-full overflow-y-auto">
            <h2 className="text-[10px] tracking-[0.4em] uppercase text-pink-500/50 mb-10 text-center">Neural Archive</h2>
            <AnimatePresence>
              {memories.map((m) => (
                <motion.div 
                  key={m.id}
                  drag="x"
                  dragConstraints={{ left: -100, right: 0 }}
                  onDragEnd={(_, info) => info.offset.x < -50 && hideMemory(m.id)}
                  className="p-6 bg-pink-500/5 border border-pink-500/10 rounded-2xl flex justify-between items-center group cursor-grab active:cursor-grabbing"
                >
                  <p className="text-sm text-pink-100">{m.content}</p>
                  <span className="text-[8px] text-pink-500/20 uppercase opacity-0 group-hover:opacity-100">Swipe Left to Hide</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Tab 3: Settings (The Photo Layout) */}
        {activeTab === "SETTINGS" && (
          <div className="h-full overflow-y-auto p-10 max-w-xl mx-auto">
            <div className="space-y-12">
              {/* Account Section */}
              <section>
                <p className="text-[10px] tracking-widest uppercase text-pink-500/40 mb-6">Account</p>
                <div className="space-y-1">
                  <div className="p-4 bg-white/5 rounded-t-2xl flex items-center justify-between border-b border-white/5">
                    <span className="text-sm">Profile</span>
                    <span className="text-xs text-white/40">{user?.primaryEmailAddress?.emailAddress}</span>
                  </div>
                  <div className="p-4 bg-white/5 flex flex-col gap-4 border-b border-white/5">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Designation</span>
                      <input value={jarvisName} onChange={(e)=>setJarvisName(e.target.value)} className="bg-transparent text-right outline-none text-white text-sm" />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">User Handle</span>
                      <input value={userHandle} onChange={(e)=>setUserHandle(e.target.value)} className="bg-transparent text-right outline-none text-white text-sm" />
                    </div>
                    <button onClick={updateProfile} className="w-full py-2 bg-pink-500 text-black text-[10px] font-bold uppercase rounded-lg">Sync Profile</button>
                  </div>
                  <div className="p-4 bg-white/5 flex justify-between border-b border-white/5 opacity-50"><span className="text-sm">Preferences</span><span className="text-xs">Locked</span></div>
                  <div className="p-4 bg-white/5 rounded-b-2xl flex justify-between opacity-50"><span className="text-sm">Notifications</span><span className="text-xs">Disabled</span></div>
                </div>
              </section>

              {/* Privacy Section */}
              <section>
                <p className="text-[10px] tracking-widest uppercase text-pink-500/40 mb-6">Privacy Settings</p>
                <div className="space-y-1">
                  <div className="p-6 bg-white/5 rounded-2xl space-y-6">
                    <div className="space-y-2">
                      <label className="text-[9px] uppercase tracking-widest text-pink-300">View Hidden Vault</label>
                      <input 
                        placeholder="Type 'yes' to reveal" 
                        value={unlockPass} 
                        onChange={(e)=>setUnlockPass(e.target.value)}
                        className="w-full bg-black/40 border border-pink-500/20 rounded p-3 text-sm outline-none focus:border-pink-500" 
                      />
                    </div>
                    {unlockPass.toLowerCase() === "yes" && (
                      <div className="p-4 bg-pink-500/10 rounded-xl border border-pink-500/30 animate-in fade-in">
                        <p className="text-[10px] mb-2 uppercase">Hidden Records Found</p>
                        <p className="text-xs italic">Hidden data is active in neural memory but excluded from core view.</p>
                      </div>
                    )}

                    <div className="pt-6 border-t border-white/5 space-y-4">
                       <label className="text-[9px] uppercase tracking-widest text-red-500">Danger Zone</label>
                       <input 
                        placeholder="Type 'DELETE ALL'" 
                        value={nukeConfirm} 
                        onChange={(e)=>setNukeConfirm(e.target.value)}
                        className="w-full bg-red-500/5 border border-red-500/20 rounded p-3 text-sm outline-none text-red-500" 
                      />
                       <button onClick={nukeMemory} className="w-full py-3 border border-red-500 text-red-500 text-[10px] font-bold uppercase hover:bg-red-500 hover:text-white transition-all">Nuke Memory Bank</button>
                    </div>
                  </div>
                </div>
              </section>

              <button onClick={() => signOut()} className="w-full py-4 text-white/40 text-[10px] tracking-[0.4em] uppercase hover:text-pink-500 transition-all">Terminate Session</button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
