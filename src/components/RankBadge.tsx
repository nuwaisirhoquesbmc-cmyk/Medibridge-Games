import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Shield, Award, Trophy, Star } from "lucide-react";
import { playSound } from "../audio";

interface RankBadgeProps {
  rank: string;
  theme: "light" | "dark";
  language: "bn" | "en";
}

export default function RankBadge({ rank, theme, language }: RankBadgeProps) {
  const [triggerGlimmer, setTriggerGlimmer] = useState(0);
  const [showUpgradeAlert, setShowUpgradeAlert] = useState(false);
  const [prevRankLabel, setPrevRankLabel] = useState("");
  const isDark = theme === "dark";

  const prevRankRef = useRef(rank);

  useEffect(() => {
    // Trigger rank-up celebration only when the rank actually changes from a non-empty previous value
    if (prevRankRef.current && prevRankRef.current !== rank) {
      setPrevRankLabel(prevRankRef.current);
      setTriggerGlimmer(prev => prev + 1);
      setShowUpgradeAlert(true);
      playSound("levelup");

      // Auto dismiss upgrade banner after 4 seconds
      const timer = setTimeout(() => {
        setShowUpgradeAlert(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
    prevRankRef.current = rank;
  }, [rank]);

  const handleManualGlimmer = () => {
    playSound("click");
    setTriggerGlimmer(prev => prev + 1);
  };

  // Determine badge colors based on rank tier
  const getTierStyles = () => {
    const r = rank.toLowerCase();
    if (r.includes("elite") || r.includes("legend") || r.includes("immortal")) {
      return {
        bg: isDark ? "bg-gradient-to-r from-red-950/40 via-yellow-950/30 to-red-950/40" : "bg-gradient-to-r from-red-50 via-amber-50 to-red-50",
        border: "border-[#FFD700]",
        text: "text-[#FFD700] drop-shadow-[0_0_8px_rgba(255,215,0,0.4)]",
        icon: <Trophy className="w-3.5 h-3.5 text-[#FFD700]" />,
        shimmerColor: "via-[#FFD700]/70"
      };
    } else if (r.includes("scholar") || r.includes("advanc") || r.includes("aspirant")) {
      return {
        bg: isDark ? "bg-gradient-to-r from-amber-950/30 via-red-950/20 to-amber-950/30" : "bg-gradient-to-r from-amber-50 via-red-50 to-amber-50",
        border: "border-amber-500",
        text: "text-amber-500",
        icon: <Award className="w-3.5 h-3.5 text-amber-500" />,
        shimmerColor: "via-amber-400/60"
      };
    } else {
      // Default: Freshman / Learner
      return {
        bg: isDark ? "bg-yellow-950/15" : "bg-orange-50/60",
        border: "border-[#FFD700]/40",
        text: "text-[#FFD700]/90",
        icon: <Shield className="w-3.5 h-3.5 text-[#FFD700]/90" />,
        shimmerColor: "via-white/60"
      };
    }
  };

  const style = getTierStyles();

  return (
    <div className="relative inline-block" id="app-user-rank-widget">
      {/* Expanding Ripple Circles during Glimmer/Upgrade */}
      <AnimatePresence>
        {triggerGlimmer > 0 && (
          <div className="absolute inset-0 pointer-events-none -m-1">
            <motion.div
              key={`ripple-1-${triggerGlimmer}`}
              initial={{ scale: 0.9, opacity: 0.8 }}
              animate={{ scale: 1.4, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              className="absolute inset-0 rounded-full border-2 border-[#FFD700]/60"
            />
            <motion.div
              key={`ripple-2-${triggerGlimmer}`}
              initial={{ scale: 0.95, opacity: 0.6 }}
              animate={{ scale: 1.8, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: "easeOut", delay: 0.15 }}
              className="absolute inset-0 rounded-full border border-amber-500/40"
            />
          </div>
        )}
      </AnimatePresence>

      {/* Main Interactive Rank Badge */}
      <motion.button
        onClick={handleManualGlimmer}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={triggerGlimmer > 0 ? {
          scale: [1, 1.25, 0.95, 1.1, 1],
          y: [0, -4, 2, -1, 0]
        } : {}}
        transition={{ duration: 0.6, type: "spring", stiffness: 300, damping: 15 }}
        className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-mono font-black text-[10px] tracking-wider uppercase cursor-pointer overflow-hidden shadow-md select-none transition-all duration-300 ${style.bg} ${style.border}`}
        title={language === "bn" ? "র‌্যাঙ্ক রিভিউ (গ্লিমার টেস্ট করতে ক্লিক করুন)" : "Click to trigger Gold Glimmer!"}
      >
        {/* Glow backdrop shadow */}
        <span className="absolute inset-0 bg-yellow-500/5 opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />

        {/* Dynamic Rank Icon */}
        <span className="relative z-10 shrink-0">
          {style.icon}
        </span>

        {/* Rank String Label */}
        <span className={`relative z-10 font-sans tracking-widest ${style.text}`}>
          {rank || "Freshman"}
        </span>

        {/* Interactive Sparkles decorator */}
        <Sparkles className="w-3 h-3 text-[#FFD700] shrink-0 animate-pulse relative z-10" />

        {/* Moving White-Gold Glimmer sweep ribbon */}
        <AnimatePresence>
          <motion.div
            key={`shimmer-${triggerGlimmer}`}
            initial={{ left: "-150%" }}
            animate={{ left: "150%" }}
            transition={{ duration: 1.4, ease: "easeInOut" }}
            className={`absolute top-0 bottom-0 w-[60%] bg-gradient-to-r from-transparent ${style.shimmerColor} to-transparent transform -skew-x-[25deg] z-10 pointer-events-none`}
          />
        </AnimatePresence>

        {/* Star Burst Particles */}
        {triggerGlimmer > 0 && (
          <>
            <motion.div
              key={`star-1-${triggerGlimmer}`}
              initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
              animate={{ x: -25, y: -22, scale: [0, 1.1, 0.8, 0], opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute left-1/4 top-1/4 pointer-events-none"
            >
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            </motion.div>
            <motion.div
              key={`star-2-${triggerGlimmer}`}
              initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
              animate={{ x: 28, y: -18, scale: [0, 1, 0.7, 0], opacity: 0 }}
              transition={{ duration: 0.7, ease: "easeOut", delay: 0.05 }}
              className="absolute right-1/4 top-1/4 pointer-events-none"
            >
              <Star className="w-2.5 h-2.5 text-[#FFD700] fill-[#FFD700]" />
            </motion.div>
            <motion.div
              key={`star-3-${triggerGlimmer}`}
              initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
              animate={{ x: 5, y: 30, scale: [0, 1.2, 0.7, 0], opacity: 0 }}
              transition={{ duration: 0.9, ease: "easeOut", delay: 0.1 }}
              className="absolute left-1/2 bottom-0 pointer-events-none"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
            </motion.div>
          </>
        )}
      </motion.button>

      {/* Floating Sparkle / Upgrade Notification Banner */}
      <AnimatePresence>
        {showUpgradeAlert && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.9 }}
            animate={{ opacity: 1, y: -50, scale: 1 }}
            exit={{ opacity: 0, y: -70, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 350, damping: 20 }}
            className="absolute left-1/2 -translate-x-1/2 pointer-events-none bg-gradient-to-r from-red-650 via-amber-600 to-red-650 border border-[#FFD700]/70 text-white font-display text-[9.5px] uppercase font-black tracking-widest whitespace-nowrap px-4 py-2 rounded-xl shadow-[0_10px_30px_rgba(255,215,0,0.3)] z-50 flex items-center gap-2"
          >
            <Trophy className="w-3.5 h-3.5 text-yellow-300 animate-bounce" />
            <span>
              {language === "bn" 
                ? `র‌্যাঙ্ক আপগ্রেড: ${prevRankLabel || "Freshman"} ➔ ${rank}` 
                : `RANK UPGRADE: ${prevRankLabel || "Freshman"} ➔ ${rank}`}
            </span>
            <Sparkles className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300 animate-pulse" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
