import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { UserProfile } from "../types";
import { playSound } from "../audio";
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  History,
  Clock,
  Coffee,
  Trophy,
  Trash2,
  Sliders,
  CheckCircle,
  TrendingUp
} from "lucide-react";

interface PomodoroTimerProps {
  user: UserProfile;
  onProfileUpdate: (updated: Partial<UserProfile>) => void;
  language?: "bn" | "en";
  theme?: "light" | "dark";
}

interface FocusSessionLog {
  id: string;
  type: "focus" | "shortBreak" | "longBreak";
  durationMinutes: number;
  timestamp: string;
  earnedCoins: number;
  earnedXp: number;
}

export default function PomodoroTimer({
  user,
  onProfileUpdate,
  language = "bn",
  theme = "light"
}: PomodoroTimerProps) {
  const isBn = language === "bn";
  const isDark = theme === "dark";

  // Predefined modes and durations (in seconds)
  const PRESETS = [
    { id: "focus_25", label: isBn ? "২৫ মি. স্টাডি" : "25m Study", type: "focus", seconds: 25 * 60 },
    { id: "focus_50", label: isBn ? "৫০ মি. গভীর ফোকাস" : "50m Deep Focus", type: "focus", seconds: 50 * 60 },
    { id: "break_5", label: isBn ? "৫ মি. ব্রেক" : "5m Break", type: "shortBreak", seconds: 5 * 60 },
    { id: "break_15", label: isBn ? "১৫ মি. ব্রেক" : "15m Break", type: "longBreak", seconds: 15 * 60 }
  ];

  const [mode, setMode] = useState<"focus" | "shortBreak" | "longBreak">("focus");
  const [totalDuration, setTotalDuration] = useState<number>(25 * 60);
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [customMinutes, setCustomMinutes] = useState<string>("25");
  const [showCustomConfig, setShowCustomConfig] = useState<boolean>(false);
  const [activePresetId, setActivePresetId] = useState<string>("focus_25");
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Focus Log History
  const [sessionLogs, setSessionLogs] = useState<FocusSessionLog[]>([]);
  const [congratulatoryReward, setCongratulatoryReward] = useState<{
    coins: number;
    xp: number;
    mode: string;
  } | null>(null);

  // Ref to track timer ticks
  const timerRef = useRef<any>(null);

  // Load logs from localStorage on mount
  useEffect(() => {
    const savedLogs = localStorage.getItem(`medibridge_focus_logs_${user.uid}`);
    if (savedLogs) {
      try {
        setSessionLogs(JSON.parse(savedLogs));
      } catch (err) {
        console.error("Failed to parse saved focus logs", err);
      }
    }
  }, [user.uid]);

  // Save logs to localStorage
  const saveLogs = (newLogs: FocusSessionLog[]) => {
    setSessionLogs(newLogs);
    localStorage.setItem(`medibridge_focus_logs_${user.uid}`, JSON.stringify(newLogs));
  };

  // Main tick timer logic
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsRunning(false);
            handleTimerCompilation();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning, timeLeft, mode, totalDuration]);

  // Triggered when focus countdown reaches 0:00
  const handleTimerCompilation = () => {
    if (soundEnabled) {
      playSound("victory");
    }

    const durationMinutes = Math.round(totalDuration / 60);
    
    // Reward calculation: 1 coin per minute of study, 2 XP per minute of study. Break gives smaller 2 coins flat.
    let coinsEarned = 0;
    let xpEarned = 0;

    if (mode === "focus") {
      coinsEarned = Math.max(5, durationMinutes * 1);
      xpEarned = Math.max(10, durationMinutes * 2);
      
      // Scale with character and Premium bonuses
      if (user.isPremium) {
        coinsEarned = Math.round(coinsEarned * 1.5);
        xpEarned = Math.round(xpEarned * 1.5);
      }
    } else {
      // Small check-in reward for completing breaks
      coinsEarned = 2;
      xpEarned = 5;
    }

    // Save history log
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newLog: FocusSessionLog = {
      id: Math.random().toString(36).substring(2, 9),
      type: mode,
      durationMinutes,
      timestamp: timeString,
      earnedCoins: coinsEarned,
      earnedXp: xpEarned
    };

    const updatedLogs = [newLog, ...sessionLogs];
    saveLogs(updatedLogs);

    // Update real user profile statistics and trigger Firestore syncing
    onProfileUpdate({
      coins: (user.coins || 0) + coinsEarned,
      xp: (user.xp || 0) + xpEarned
    });

    // Award alert display
    setCongratulatoryReward({
      coins: coinsEarned,
      xp: xpEarned,
      mode: mode
    });

    // Reset indicator to standard default
    setTimeLeft(totalDuration);
  };

  const selectPreset = (preset: typeof PRESETS[0]) => {
    playSound("click");
    setIsRunning(false);
    setMode(preset.type as any);
    setTotalDuration(preset.seconds);
    setTimeLeft(preset.seconds);
    setActivePresetId(preset.id);
    setShowCustomConfig(false);
  };

  const handleCustomApply = (e: React.FormEvent) => {
    e.preventDefault();
    playSound("click");
    const parsed = parseInt(customMinutes);
    if (isNaN(parsed) || parsed < 1 || parsed > 300) {
      alert("Please enter minutes between 1 and 300.");
      return;
    }

    setIsRunning(false);
    setMode("focus");
    const seconds = parsed * 60;
    setTotalDuration(seconds);
    setTimeLeft(seconds);
    setActivePresetId("custom");
    setShowCustomConfig(false);
  };

  const handleToggleTimer = () => {
    playSound("click");
    setIsRunning(!isRunning);
  };

  const handleResetTimer = () => {
    playSound("click");
    setIsRunning(false);
    setTimeLeft(totalDuration);
  };

  const handleDeleteHistory = () => {
    playSound("click");
    if (confirm(isBn ? "আপনি কি সম্পূর্ণ স্টাডি হিস্ট্রি ডিলিট করতে চান?" : "Are you sure you want to clear focus history?")) {
      saveLogs([]);
    }
  };

  // Formatting remaining display as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // SVGRing Progress calculation helper
  // radius = 80, circumference = 2 * PI * 80 ≈ 502.65
  const strokeRadius = 80;
  const strokeCircumference = 2 * Math.PI * strokeRadius;
  const strokeDashoffset = totalDuration > 0 
    ? strokeCircumference - (timeLeft / totalDuration) * strokeCircumference 
    : strokeCircumference;

  // Aggregate stats (focused durations today)
  const totalFocusedMinutes = sessionLogs
    .filter(log => log.type === "focus")
    .reduce((acc, curr) => acc + curr.durationMinutes, 0);

  // Stroke color styling dynamic mapping
  const activeColorClass = mode === "focus" 
    ? "#C1121F" 
    : mode === "shortBreak" 
    ? "#10B981" 
    : "#0EA5E9";

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`border rounded-2xl p-6 relative overflow-hidden shadow-xl ${
        isDark
          ? "bg-gradient-to-br from-[#121212] to-[#0d0d0d] border-white/10 text-white"
          : "bg-white border-red-100 shadow-[0_8px_30px_rgba(193,18,31,0.06)] text-slate-800"
      }`}
    >
      {/* Visual top bar theme coloring */}
      <div 
        className="absolute top-0 inset-x-0 h-1 transition-all duration-500"
        style={{ backgroundColor: activeColorClass }}
      />

      <div className="flex items-center justify-between border-b pb-4 mb-5 dark:border-white/5 border-slate-100">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-rose-500 animate-pulse" />
          <h3 className="font-extrabold text-sm uppercase tracking-wider font-display shrink-0">
            {isBn ? "মেডিব্রিজ স্টাডি পোমোডোরো" : "MEDIBRIDGE STUDY POMODORO"}
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => {
              playSound("click");
              setSoundEnabled(!soundEnabled);
            }}
            className={`cursor-pointer px-2 py-1 rounded transition-colors font-mono ${
              soundEnabled 
                ? "bg-rose-500/10 text-rose-500 font-extrabold" 
                : "bg-slate-205/10 text-slate-400"
            }`}
          >
            🔊 {soundEnabled ? (isBn ? "শব্দ কার্যকর" : "CHIME ON") : (isBn ? "মিউট" : "MUTED")}
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-12 gap-6 items-center">
        {/* LEFT COLUMN: The Interactive Circular Chrono Matrix */}
        <div className="md:col-span-6 flex flex-col items-center justify-center relative py-2">
          
          <div className="relative w-48 h-48 select-none flex items-center justify-center">
            
            {/* SVG Progress Circle Ring representation */}
            <svg viewBox="0 0 180 180" className="w-full h-full transform -rotate-90 drop-shadow-lg">
              {/* Dark/Transparent Background Track */}
              <circle
                cx="90"
                cy="90"
                r={strokeRadius}
                fill="transparent"
                stroke={isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(193, 18, 31, 0.05)"}
                strokeWidth="8"
              />
              {/* Dynamic Overlay Fill Circle */}
              <motion.circle
                cx="90"
                cy="90"
                r={strokeRadius}
                fill="transparent"
                stroke={activeColorClass}
                strokeWidth="10"
                strokeDasharray={strokeCircumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-300"
              />
            </svg>

            {/* Absolute Centered text and status alerts */}
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest font-mono">
                {mode === "focus" 
                  ? (isBn ? "পড়ার সময়" : "STUDY SESSION") 
                  : (isBn ? "বিরতি" : "BREAK")}
              </span>
              <span className="text-3xl font-black font-mono tracking-tighter mt-1 block select-all">
                {formatTime(timeLeft)}
              </span>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full mt-2 tracking-wide block uppercase ${
                isRunning 
                  ? "bg-emerald-500/10 text-emerald-500 animate-pulse" 
                  : "bg-amber-500/10 text-amber-500"
              }`}>
                {isRunning ? (isBn ? "কার্যকর রয়েছে" : "TICKING ACTIVE") : (isBn ? "বিরতিহীন" : "PAUSED")}
              </span>
            </div>
          </div>

          {/* CHRONOMETRIC PRIMARY TRIGGERS BUTTONS GROUP */}
          <div className="flex items-center gap-3 mt-4 w-full justify-center">
            <button
              onClick={handleToggleTimer}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 shadow-md cursor-pointer ${
                isRunning
                  ? "bg-amber-500 text-black hover:bg-amber-600 shadow-amber-500/15"
                  : "bg-gradient-to-r from-red-650 to-rose-600 text-white shadow-rose-500/25 border-b-2 border-red-950 hover:scale-102"
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>{isBn ? "থামুন" : "Pause"}</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>{isBn ? "শুরু করুন" : "Start"}</span>
                </>
              )}
            </button>

            <button
              onClick={handleResetTimer}
              className={`p-3 rounded-xl border transition-all cursor-pointer hover:scale-105 duration-200 ${
                isDark
                  ? "bg-[#181818] border-white/5 hover:border-white/10 text-gray-300"
                  : "bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700"
              }`}
              title="Reset timer progress"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

        {/* RIGHT COLUMN: Interactive Control Presets & Focus Stats */}
        <div className="md:col-span-6 space-y-4">
          
          {/* Quick presets list selector */}
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-extrabold text-gray-400 block tracking-wider font-mono">
              {isBn ? "⚡ সেশন টেমপ্লেট নির্বাচন" : "⚡ SELECT STUDY SESSION PRESET"}
            </span>

            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p) => {
                const isActive = activePresetId === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => selectPreset(p)}
                    className={`py-2 px-3 rounded-xl text-left border cursor-pointer transition-all duration-300 flex items-center justify-between font-mono text-xs ${
                      isActive
                        ? "bg-rose-500/10 border-rose-500 text-rose-500 font-extrabold shadow-sm"
                        : isDark
                        ? "bg-white/5 border-white/5 hover:bg-white/10 text-gray-300"
                        : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    <span className="truncate">{p.label}</span>
                    <span className="text-[9px] opacity-70">
                      {p.seconds / 60}m
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Configurable custom study range setter */}
          <div>
            <button
              onClick={() => {
                playSound("click");
                setShowCustomConfig(!showCustomConfig);
              }}
              className="text-xs text-rose-500 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
            >
              <Sliders className="w-3 h-3" />
              <span>{isBn ? "কাস্টম মিনিট নির্ধারণ করুন" : "Set Custom study focus period"}</span>
            </button>

            {showCustomConfig && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                onSubmit={handleCustomApply}
                className="flex items-center gap-2 mt-2 pt-2 border-t border-dashed border-gray-150/15"
              >
                <div className="relative flex-1">
                  <input
                    type="number"
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(e.target.value)}
                    min="1"
                    max="300"
                    className={`w-full text-xs font-mono px-3 py-2 rounded-lg border ${
                      isDark
                        ? "bg-black border-white/10 text-white"
                        : "bg-slate-50 border-slate-200 text-slate-800"
                    }`}
                    placeholder="Enter minutes (e.g. 45)"
                  />
                  <span className="absolute right-3 top-2 text-[9px] text-gray-500 font-mono">Min</span>
                </div>
                <button
                  type="submit"
                  className="px-3 py-2 bg-rose-500 text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-rose-600 transition-colors shrink-0"
                >
                  {isBn ? "সেট" : "Apply"}
                </button>
              </motion.form>
            )}
          </div>

          {/* Dynamic real-time focused progress feedback tracker */}
          <div className={`p-4 rounded-xl border flex items-center gap-3.5 ${
            isDark ? "bg-black/40 border-white/5" : "bg-red-50/30 border-red-100/60"
          }`}>
            <div className="p-2.5 bg-gradient-to-br from-yellow-500/10 to-amber-500/15 text-yellow-500 rounded-lg shrink-0">
              <TrendingUp className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] text-gray-400 font-bold block uppercase font-mono leading-none tracking-wide">
                {isBn ? "আজকের মোট অধ্যায়ন সময়" : "TODAY'S TOTAL STUDY RECORD"}
              </span>
              <span className="text-lg font-black block mt-1 font-display">
                {totalFocusedMinutes} {isBn ? "মিনিট" : "Minutes"}
              </span>
              <span className={`text-[9px] block ${isDark ? "text-gray-500" : "text-slate-500"} mt-0.5 font-mono`}>
                {totalFocusedMinutes >= 120 
                  ? (isBn ? "🔥 চমৎকার! মেডিকেল স্ট্যান্ডার্ন্ড অর্জন।" : "🔥 Excellent! Medical grade focus achieved.") 
                  : totalFocusedMinutes >= 45 
                  ? (isBn ? "👍 অসাধারণ গ্রিন্ড! এগিয়ে যান।" : "👍 Awesome grind! Keep going.") 
                  : (isBn ? "🏁 সেশন শুরু করুন ও পুরষ্কার জিতুন।" : "🏁 Start focusing to earn Gold Coins & XP.")}
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* POPUP: REWARDS DROPDOWN CELEBRATION MODAL */}
      <AnimatePresence>
        {congratulatoryReward && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`absolute inset-0 flex flex-col items-center justify-center text-center p-6 z-30 ${
              isDark ? "bg-black/95 text-white" : "bg-white/95 text-slate-800"
            }`}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-[#FFD700]/10 rounded-full blur-3xl"></div>
            
            <div className="z-10 flex flex-col items-center">
              <div className="w-14 h-14 bg-yellow-500/15 rounded-full flex items-center justify-center text-3xl animate-bounce mb-3 shadow-[0_0_20px_rgba(234,179,8,0.3)]">
                🏆
              </div>
              
              <h4 className="text-md font-black uppercase text-[#FFD700] tracking-wide font-display">
                {isBn ? "স্টাডি সেশন সমাপ্ত!" : "STUDY SESSION ACCOMPLISHED!"}
              </h4>
              <p className={`text-xs mt-1.5 max-w-xs leading-relaxed ${isDark ? "text-gray-400" : "text-slate-650"}`}>
                {congratulatoryReward.mode === "focus"
                  ? (isBn 
                    ? `দারুণ! আপনি সফলভাবে পোমোডোরো স্টাডি শেষ করে গ্ল্যাডিয়েটর লেভেল মার্কস এবং কয়েন অলংকৃত করেছেন!` 
                    : `Invaluable focusing! You mastered the high-intensity medical focus drill and claimed your spoils!`)
                  : (isBn 
                    ? "বিরতি সেশন সমাপ্ত! পুনরায় লড়াই শুরু করতে তৈরি হোন।" 
                    : "Break finished! Prepare to resume your MCQs campaign.")}
              </p>

              {/* Loot badges list */}
              <div className="flex gap-4 items-center justify-center mt-4">
                <div className="px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-500 text-xs font-black font-mono">
                  🪙 +{congratulatoryReward.coins} Coins
                </div>

                <div className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-500 text-xs font-black font-mono">
                  🔥 +{congratulatoryReward.xp} XP
                </div>
              </div>

              {/* Dismiss button */}
              <button
                onClick={() => {
                  playSound("click");
                  setCongratulatoryReward(null);
                }}
                className="mt-6 px-6 py-2 bg-rose-500 text-white font-extrabold uppercase tracking-wider text-[10px] rounded-xl cursor-pointer hover:bg-rose-600 shadow-md shadow-rose-550/20"
              >
                {isBn ? "ক্লেন করুন ও ফিরে যান" : "CLAIM REWARDS & DISMISS"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FOOTER COLLAPSED SUB-PANEL: COMPLETED SESSIONS HISTORY LOG */}
      <div className={`mt-5 pt-4 border-t ${isDark ? "border-white/5" : "border-slate-100"}`}>
        <div className="flex items-center justify-between mb-3 text-xs">
          <span className="font-extrabold text-gray-400 font-mono flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-rose-500" />
            <span>{isBn ? "📋 স্টাডি ফোকাস ইতিহাস" : "📋 FOCUS SESSION LOG"} ({sessionLogs.length})</span>
          </span>
          {sessionLogs.length > 0 && (
            <button
              onClick={handleDeleteHistory}
              className="text-[10px] text-gray-500 hover:text-red-500 flex items-center gap-1 font-mono cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>{isBn ? "ক্লিয়ার করুন" : "Clear list"}</span>
            </button>
          )}
        </div>

        {sessionLogs.length === 0 ? (
          <div className="text-center py-5 text-gray-400 border border-dashed border-gray-150/10 rounded-xl">
            <span className="text-2xl opacity-60">⏳</span>
            <p className="text-[10px] mt-1 font-sans">
              {isBn ? "কোনো সম্পূর্ণ ফোকাস সেশন এখনও নিবন্ধિત হয়নি।" : "No focus runs completed yet today."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
            {sessionLogs.map((log) => (
              <div
                key={log.id}
                className={`flex justify-between items-center p-2.5 rounded-xl border text-xs font-mono ${
                  isDark
                    ? "bg-[#0b0b0b] border-white/5 text-white"
                    : "bg-slate-50 border-slate-200 text-slate-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    {log.type === "focus" ? "🧠" : "☕"}
                  </span>
                  <div>
                    <span className="font-bold block text-[11px]">
                      {log.type === "focus" 
                        ? (isBn ? `স্টাডি সেশন: ${log.durationMinutes}মি.` : `Study Focus: ${log.durationMinutes}m`) 
                        : (isBn ? "রিকভারি বিরতি" : "Recovery Break")}
                    </span>
                    <span className="text-[9px] text-gray-450 block truncate">
                      Completed at {log.timestamp}
                    </span>
                  </div>
                </div>

                <div className="text-right flex items-center gap-1.5">
                  <span className="text-[9px] font-black px-1.5 py-0.5 bg-yellow-550/10 border border-yellow-500/20 rounded-md text-yellow-500">
                    🪙 +{log.earnedCoins}
                  </span>
                  <span className="text-[9px] font-black px-1.5 py-0.5 bg-rose-500/10 border border-rose-500/20 rounded-md text-rose-500">
                    🔥 +{log.earnedXp}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </motion.div>
  );
}
