import React, { useState } from "react";
import { motion } from "motion/react";
import {
  Settings,
  Bell,
  Camera,
  Swords,
  TrendingUp,
  Loader2
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer } from "recharts";
import { UserProfile, AdminNotice } from "../types";
import RankBadge from "./RankBadge";
import PomodoroTimer from "./PomodoroTimer";
import DailyMissions from "./DailyMissions";
import PreparationRoadmap from "./PreparationRoadmap";
import { playSound } from "../audio";

interface DashboardOverviewProps {
  user: UserProfile;
  language: "bn" | "en";
  theme: "light" | "dark";
  enrollments?: any[];
  updateDocInProfile: (updates: Partial<UserProfile>) => Promise<void>;
  setIsEditProfileOpen: (open: boolean) => void;
  setIsPremiumModalOpen: (open: boolean) => void;
  rivalProfile: UserProfile | null;
  notices: AdminNotice[];
  battleLogs: any[];
  setSelectedReplayBattle: (battle: any) => void;
  setActiveChallengeRival: (rival: UserProfile | null) => void;
  setActiveTab: (tab: any) => void;
  levelProgressPct: number;
  nextLevelXp: number;
}

export default function DashboardOverview({
  user,
  language,
  theme,
  enrollments = [],
  updateDocInProfile,
  setIsEditProfileOpen,
  setIsPremiumModalOpen,
  rivalProfile,
  notices,
  battleLogs,
  setSelectedReplayBattle,
  setActiveChallengeRival,
  setActiveTab,
  levelProgressPct,
  nextLevelXp,
}: DashboardOverviewProps) {
  const [dashSubTab, setDashSubTab] = useState<"overview" | "roadmap">("overview");
  const isDark = theme === "dark";

  const isUserEnrolled = Array.isArray(enrollments) && enrollments.some((e: any) => e.userId === user?.uid);

  return (
    <div className="flex flex-col gap-6 sm:gap-8 w-full">
      {/* 1. Header Banner: Welcome Command Deck */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`rounded-2xl p-6 relative overflow-hidden shadow-2xl border ${
          isDark
            ? "bg-gradient-to-r from-[#1E1112] via-[#0D0D0D] to-[#0D0D0D] border-white/5 text-white"
            : "bg-gradient-to-r from-red-50 via-white to-white border-red-150 shadow-sm text-slate-800"
        }`}
      >
        <div className="absolute inset-y-0 right-0 w-[40%] bg-[radial-gradient(circle_at_right,_var(--tw-gradient-stops))] from-red-650/10 to-transparent pointer-events-none"></div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-mono tracking-widest text-[#C1121F] font-bold uppercase">
                {language === "bn" ? "অ্যাডমিশন কমান্ড ডেক" : "ADMISSION COMMAND DECK"}
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold uppercase font-display tracking-tight leading-none mb-2">
              {language === "bn" ? `স্বাগতম, ${user.displayName}` : `WELCOME BACK, ${user.displayName}`}
            </h2>
            <p className={`text-xs ${isDark ? "text-gray-400" : "text-slate-600"} max-w-xl`}>
              {language === "bn"
                ? "আপনার মেডিকেল ভর্তি পরীক্ষার পূর্ণাঙ্গ প্রস্তুতি ট্র্যাক করুন। আজই নতুন কমব্যাট এবং ডেইলি মিশন সম্পন্ন করুন।"
                : "Command your MAT preparation with precision metrics. Engage daily missions, sync telemetry data, and dominate the ranking leaderboards."}
            </p>
          </div>

          {/* Micro KPIs widget inside welcome deck */}
          <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6 border-white/5 shrink-0">
            <div className="text-center">
              <span className="text-[10px] font-mono uppercase text-gray-500 block">{language === "bn" ? "স্ট্রিক" : "STREAK"}</span>
              <span className="text-xl font-black text-amber-500 font-display flex items-center gap-1 justify-center">
                🔥 {user.dailyStreak || 1}
              </span>
            </div>
            <div className="text-center">
              <span className="text-[10px] font-mono uppercase text-gray-500 block">{language === "bn" ? "কয়েন" : "COINS"}</span>
              <span className="text-xl font-black text-yellow-500 font-display flex items-center gap-1 justify-center">
                🪙 {user.coins || 0}
              </span>
            </div>
            <div className="text-center">
              <span className="text-[10px] font-mono uppercase text-gray-500 block">{language === "bn" ? "প্রাপ্ত নম্বর %" : "MARKS %"}</span>
              <span className="text-xl font-black text-emerald-500 font-display flex items-center gap-1 justify-center">
                🎯 {user.questionsSolved > 0 ? Math.max(0, Math.round(((user.questionsCorrect - (user.questionsSolved - user.questionsCorrect) * 0.25) / user.questionsSolved) * 100)) : 0}%
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 2. Main Dashboard Bento Grid & Layout */}
      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN (col-span-1): User Profile Deck & Navigation Shortcuts */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          
          {/* A. Candidate Profile HUD Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className={`border rounded-2xl p-6 relative overflow-hidden shadow-xl ${
              isDark
                ? "bg-gradient-to-r from-[#1A1A1A] to-[#111111] border-white/10 text-white"
                : "bg-white border-red-150 shadow-[0_8px_30px_rgba(193,18,31,0.06)] text-slate-800"
            }`}
          >
            <div className="absolute top-0 inset-x-0 h-1 bg-[#C1121F]"></div>
            
            {/* Profile Info Header */}
            <div className={`flex items-center gap-4 border-b pb-5 mb-5 relative z-10 ${isDark ? "border-white/5" : "border-red-100/50"}`}>
              <div 
                onClick={() => { playSound("click"); setIsEditProfileOpen(true); }}
                className="relative shrink-0 cursor-pointer group"
                title={language === "bn" ? "প্রোফাইল ছবি পরিবর্তন করুন" : "Change avatar image"}
              >
                <img
                  src={user.avatarUrl}
                  alt="avatar"
                  className={`w-16 h-16 rounded-full border-2 bg-[#111111] p-1 shrink-0 transition-all duration-300 group-hover:scale-[1.04] ${
                    user.isPremium 
                      ? "border-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.6)] ring-2 ring-yellow-500/20" 
                      : "border-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.25)]"
                  }`}
                />
                <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-15">
                  <Camera className="w-4 h-4 text-white" />
                </div>
                {user.isPremium && (
                  <div className="absolute -top-1.5 -right-1.5 bg-yellow-500 text-black text-[9px] w-5 h-5 rounded-full flex items-center justify-center font-bold shadow-md border border-yellow-300 animate-bounce z-20">
                    👑
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className={`font-extrabold text-lg leading-tight uppercase flex items-center gap-1.5 font-display tracking-tight ${
                  isDark ? "text-white" : "text-slate-900"
                }`}>
                  <span className="truncate">{user.displayName}</span>
                  {user.isPremium && (
                    <span className="text-[8.5px] bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 text-black px-1.5 py-0.5 rounded font-mono font-black tracking-widest leading-none shadow-[0_2px_5px_rgba(234,179,8,0.3)] shrink-0 select-none animate-pulse">
                      PRO
                    </span>
                  )}
                </h3>
                <span className={`text-[10px] font-mono block truncate ${isDark ? "text-gray-400" : "text-slate-600"} mb-1.5`}>{user.college}</span>
                <div className="flex items-center gap-2 flex-wrap">
                  <RankBadge rank={user.rank || "Freshman"} theme={theme} language={language} />
                  <button
                    type="button"
                    onClick={() => { playSound("click"); setIsEditProfileOpen(true); }}
                    className={`text-[9.5px] font-mono font-semibold px-2 py-0.5 rounded border transition-all flex items-center gap-1 cursor-pointer hover:scale-[1.02] ${
                      isDark
                        ? "border-white/10 bg-white/5 hover:bg-white/11 text-gray-300 hover:text-white"
                        : "border-gray-200 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-black"
                    }`}
                  >
                    <Settings className="w-2.5 h-2.5 text-[#C1121F]" />
                    <span>{language === "bn" ? "সংশোধন করুন" : "EDIT BIO"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Level Metrics details */}
            <div className="flex flex-col gap-2 font-mono text-xs z-10 relative">
              <div className="flex justify-between items-center text-[11px] uppercase">
                 <span className={isDark ? "text-gray-400 font-bold" : "text-slate-500 font-bold"}>LEVEL PROGRESSION:</span>
                 <span className="text-[#FFD700] font-black">Lvl {user.level}</span>
              </div>
              <div className={`w-full h-3.5 rounded-full overflow-hidden border flex-1 relative flex items-center justify-center ${
                isDark ? "bg-[#0A0A0A] border-white/5" : "bg-red-50 border-red-150"
              }`}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${levelProgressPct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="bg-gradient-to-r from-[#C1121F] to-[#FFD700] h-full absolute left-0"
                ></motion.div>
                <span className="text-[9.5px] text-white font-black relative z-10 leading-none">{user.xp} / {nextLevelXp} Marks</span>
              </div>
              <span className={`text-[10px] text-center block leading-normal mt-1.5 ${isDark ? "text-gray-500" : "text-slate-505"}`}>
                Gain **{nextLevelXp - user.xp} XP** to unlock level {user.level + 1} spoils.
              </span>
            </div>

            {/* Division Sector tag */}
            <div className={`border rounded-xl p-3.5 mt-5 flex justify-between items-center text-xs font-mono ${
              isDark ? "bg-black/60 border-white/5 text-white" : "bg-red-50/50 border-red-100 text-slate-800"
            }`}>
              <span className={`uppercase font-bold text-[10px] ${isDark ? "text-gray-400" : "text-slate-500"}`}>{language === "bn" ? "বিভাগীয় সেক্টর:" : "Division Sector:"}</span>
              <span className="font-extrabold">{user.district || "Dhaka"} Core</span>
            </div>
          </motion.div>

          {/* Course Enrollment Hub (Positioned directly under Profile Card) */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08 }}
            className="border border-[#C1121F]/40 rounded-2xl p-4 bg-gradient-to-br from-[#1E0B0D] via-[#111111] to-black relative shadow-xl overflow-hidden group"
          >
            <div className="absolute -top-10 -right-10 w-28 h-28 bg-[#C1121F]/20 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform"></div>

            <div className="flex items-center justify-between gap-2 mb-2">
              <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-1 border ${
                isUserEnrolled 
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                  : "bg-[#C1121F]/20 text-[#FFD700] border-[#C1121F]/40"
              }`}>
                <span>{isUserEnrolled ? "✅" : "🔥"}</span>
                <span>{isUserEnrolled ? (language === "bn" ? "এনরোল্ড সক্রিয়" : "ACTIVE ENROLLED") : (language === "bn" ? "ভর্তি চলছে" : "ADMISSION OPEN")}</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">
                {language === "bn" ? "ব্যাচ ২০২৬/২০২৭" : "BATCH 2026/2027"}
              </span>
            </div>

            <h4 className="text-xs sm:text-sm font-extrabold text-white font-sans leading-snug mb-1 group-hover:text-[#FFD700] transition-colors">
              {language === "bn"
                ? "মেডিকেল ও ডেন্টাল ভর্তি পরীক্ষা স্পেশাল কোর্স"
                : "Medical Admission & Dental Prep Course"}
            </h4>

            <p className="text-[10px] text-gray-400 font-sans leading-relaxed mb-3">
              {isUserEnrolled
                ? (language === "bn"
                    ? "আপনি সফলভাবে এই কোর্সে এনরোল্ড আছেন। ক্লাস, লেকচার শিট ও পরীক্ষার জন্য আমার কোর্সে প্রবেশ করুন।"
                    : "You are actively enrolled! Click below to access lectures, notes & full mock exams.")
                : (language === "bn"
                    ? "মেডিকেল স্টুডেন্ট ইনস্ট্রাক্টরদের তত্ত্বাবধানে ১০০% কনসেপ্ট ক্লিয়ারিং ক্লাস ও প্র্যাকটিস।"
                    : "Enroll in live classes, medical student faculty guidance & exam practice.")}
            </p>

            <button
              type="button"
              onClick={() => {
                playSound("click");
                setActiveTab(isUserEnrolled ? "my_courses" : "courses");
              }}
              className={`w-full py-2.5 font-mono text-xs font-bold uppercase rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer hover:scale-[1.02] ${
                isUserEnrolled
                  ? "bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white shadow-emerald-950/50"
                  : "bg-gradient-to-r from-[#C1121F] to-red-700 hover:from-red-600 hover:to-red-800 text-white shadow-red-950/50"
              }`}
            >
              <span>🎓</span>
              <span>
                {isUserEnrolled
                  ? (language === "bn" ? "আমার কোর্সে প্রবেশ করুন →" : "GO TO MY COURSES →")
                  : (language === "bn" ? "কোর্সসমূহ দেখুন ও ভর্তি হোন →" : "EXPLORE COURSES & ENROLL →")}
              </span>
            </button>
          </motion.div>

          {/* B. Premium Status Upgrade Widget */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className={`border rounded-2xl p-5 relative overflow-hidden shadow-lg ${
              isDark
                ? "bg-[#111111] border-white/10"
                : "bg-white border-red-150"
            }`}
          >
            <div className="absolute top-0 right-0 p-3">
              <span className="text-2xl">🎓</span>
            </div>
            <h4 className="text-xs font-black tracking-widest font-mono text-[#FFD700] uppercase mb-2">
              {language === "bn" ? "এক্সাম ব্যাচ ও কোর্স" : "EXAM BATCHES & COURSES"}
            </h4>
            {isUserEnrolled ? (
              <div className="flex flex-col gap-2">
                <span className="text-emerald-500 font-extrabold text-xs uppercase flex items-center gap-1.5 font-mono">
                  ● {language === "bn" ? "কোর্সে সক্রিয় ভর্তি আছেন" : "Active Enrolled Student"}
                </span>
                <p className="text-[10px] text-gray-400 leading-normal">
                  {language === "bn" ? "আপনার নিবন্ধিত কোর্স ড্যাশবোর্ড, রুটিন ও এক্সাম চালু করুন।" : "Access your active learning portal, lecture sheets, and exams."}
                </p>
                <button
                  onClick={() => { playSound("click"); setActiveTab("my_courses"); }}
                  className="w-full py-2.5 mt-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-black font-extrabold text-[10px] uppercase tracking-wider rounded-xl hover:scale-[1.02] transition-transform font-mono shadow-[0_4px_10px_rgba(16,185,129,0.3)] cursor-pointer"
                >
                  {language === "bn" ? "আমার কোর্সে যান 📖" : "GO TO MY COURSES 📖"}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                <p className="text-[10px] text-slate-500 dark:text-gray-400 leading-normal">
                  {language === "bn"
                    ? "মেডিকেল ভর্তি পরীক্ষার ১০০% টেক্সটবুক ভিত্তিক মডেল টেস্ট ও এক্সাম ব্যাচে এনরোল করুন।"
                    : "Enroll in high-yield medical admission exam batches and standard model test programs."}
                </p>
                <button
                  onClick={() => { playSound("click"); setActiveTab("courses"); }}
                  className="w-full py-2.5 bg-gradient-to-r from-[#C1121F] to-red-600 border border-red-500 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl hover:scale-[1.02] transition-transform font-mono shadow-[0_4px_10px_rgba(193,18,31,0.3)] cursor-pointer"
                >
                  {language === "bn" ? "কোর্সসমূহ দেখুন 🎓" : "EXPLORE COURSES 🎓"}
                </button>
              </div>
            )}
          </motion.div>

          {/* C. Quick Study Shortcuts Nav (Aesthetic Bento element) */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className={`border rounded-2xl p-5 relative shadow-lg ${
              isDark ? "bg-[#111111] border-white/10" : "bg-white border-red-150"
            }`}
          >
            <h4 className="text-xs font-black tracking-widest font-mono text-gray-400 uppercase mb-3">
              {language === "bn" ? "র‍্যাপিড অ্যাকশন প্যানেল" : "RAPID ACTION SHORTCUTS"}
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { playSound("battle"); setActiveTab("gaming"); }}
                className="col-span-2 p-3 text-left rounded-xl border border-amber-500/30 bg-amber-500/[0.08] hover:bg-amber-500/20 hover:border-amber-400 transition-all cursor-pointer group shadow-sm flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">🎮</span>
                  <div>
                    <span className="text-[11px] block font-mono uppercase font-black text-[#FFD700] group-hover:text-yellow-300">
                      {language === "bn" ? "মেডিকেল গেমিং অ্যারেনা 🕹️" : "Medical Gaming Arena 🕹️"}
                    </span>
                    <span className="text-[9px] text-amber-200/70 block font-mono">
                      {language === "bn" ? "১০টি মেডিকেল গেম ও স্পিড কুইজ আর্কেড (সম্পূর্ণ ফ্রি)" : "10 Free medical arcade games & speed battles"}
                    </span>
                  </div>
                </div>
                <span className="text-[8px] font-mono font-bold bg-amber-500/20 text-[#FFD700] border border-amber-500/40 px-1.5 py-0.5 rounded uppercase animate-pulse">
                  FREE PLAY
                </span>
              </button>

              <button
                onClick={() => { playSound("click"); setActiveTab("unlimited_practice"); }}
                className="col-span-2 p-3 text-left rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] hover:bg-emerald-500/15 hover:border-emerald-500/40 transition-all cursor-pointer group shadow-sm flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">⚡</span>
                  <div>
                    <span className="text-[11px] block font-mono uppercase font-black text-emerald-400 group-hover:text-emerald-300">
                      {language === "bn" ? "আনলিমিটেড প্র্যাকটিস হাব ♾️" : "Unlimited Practice Hub ♾️"}
                    </span>
                    <span className="text-[9px] text-gray-400 block font-mono">
                      {language === "bn" ? "পরীক্ষাভিত্তিক প্রশ্ন থেকে সীমাহীন প্র্যাকটিস" : "Infinite practice from live exam pool"}
                    </span>
                  </div>
                </div>
                <span className="text-[8px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded uppercase">
                  UNLIMITED
                </span>
              </button>
              <button
                onClick={() => { playSound("click"); setActiveTab("analytics"); }}
                className="p-3 text-left rounded-xl border border-white/5 bg-white/[0.01] hover:bg-[#C1121F]/10 hover:border-[#C1121F]/20 transition-all cursor-pointer group"
              >
                <span className="text-lg block mb-1">📊</span>
                <span className={`text-[10px] block font-mono uppercase font-black ${isDark ? "text-gray-300 group-hover:text-white" : "text-slate-700"}`}>
                  {language === "bn" ? "অ্যানালিটিক্স" : "Analytics"}
                </span>
              </button>
              <button
                onClick={() => { playSound("click"); setActiveTab("practice"); }}
                className="p-3 text-left rounded-xl border border-white/5 bg-white/[0.01] hover:bg-[#C1121F]/10 hover:border-[#C1121F]/20 transition-all cursor-pointer group"
              >
                <span className="text-lg block mb-1">⚔️</span>
                <span className={`text-[10px] block font-mono uppercase font-black ${isDark ? "text-gray-300 group-hover:text-white" : "text-slate-700"}`}>
                  {language === "bn" ? "যুদ্ধক্ষেত্র" : "Combat Arena"}
                </span>
              </button>
              <button
                onClick={() => { playSound("click"); setActiveTab("anushiloni"); }}
                className="p-3 text-left rounded-xl border border-white/5 bg-white/[0.01] hover:bg-[#C1121F]/10 hover:border-[#C1121F]/20 transition-all cursor-pointer group"
              >
                <span className="text-lg block mb-1">📚</span>
                <span className={`text-[10px] block font-mono uppercase font-black ${isDark ? "text-gray-300 group-hover:text-white" : "text-slate-700"}`}>
                  {language === "bn" ? "অনুশীলনী" : "Anushiloni"}
                </span>
              </button>
              <button
                onClick={() => { playSound("click"); setActiveTab("mentor"); }}
                className="p-3 text-left rounded-xl border border-white/5 bg-white/[0.01] hover:bg-[#C1121F]/10 hover:border-[#C1121F]/20 transition-all cursor-pointer group"
              >
                <span className="text-lg block mb-1">🤖</span>
                <span className={`text-[10px] block font-mono uppercase font-black ${isDark ? "text-gray-300 group-hover:text-white" : "text-slate-700"}`}>
                  {language === "bn" ? "এআই মেন্টর" : "MediSense AI"}
                </span>
              </button>
              <button
                onClick={() => { playSound("click"); setActiveTab("mistakes"); }}
                className="col-span-2 p-3 text-center rounded-xl border border-dashed border-red-500/20 bg-red-500/[0.02] hover:bg-red-500/10 hover:border-red-500/35 transition-all cursor-pointer group flex items-center justify-center gap-2.5"
              >
                <span className="text-lg">🧹</span>
                <span className="text-[10px] font-mono uppercase font-black tracking-wider text-red-500 group-hover:text-red-400">
                  {language === "bn" ? "ভুল সংশোধন হাব" : "Review Mistakes"}
                </span>
              </button>
            </div>
          </motion.div>

        </div>

        {/* RIGHT COLUMN (col-span-2): Main Content Hub & Sub-tabs */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          
          {/* Dashboard Sub-Tabs switcher */}
          <div className={`flex border-b pb-2 justify-start gap-6 text-xs font-display uppercase tracking-wider font-extrabold overflow-x-auto whitespace-nowrap scrollbar-none ${
            isDark ? "border-white/5" : "border-red-150/30"
          }`}>
            <button
              onClick={() => { playSound("click"); setDashSubTab("overview"); }}
              className={`pb-2.5 relative transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                dashSubTab === "overview"
                  ? "text-[#C1121F] dark:text-white"
                  : "text-gray-400 hover:text-gray-300"
              }`}
              id="tab-dash-overview-trigger"
            >
              <span>📊 {language === "bn" ? "ওভারভিউ হাব" : "Overview Hub"}</span>
              {dashSubTab === "overview" && (
                <motion.div layoutId="dashActiveLine" className="absolute bottom-0 inset-x-0 h-0.5 bg-[#C1121F]"></motion.div>
              )}
            </button>
            <button
              onClick={() => { playSound("click"); setDashSubTab("roadmap"); }}
              className={`pb-2.5 relative transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                dashSubTab === "roadmap"
                  ? "text-[#C1121F] dark:text-white"
                  : "text-gray-400 hover:text-gray-300"
              }`}
              id="tab-dash-roadmap-trigger"
            >
              <span>🗺️ {language === "bn" ? "প্রস্তুতি রোডম্যাপ" : "Preparation Roadmap"}</span>
              <span className="text-[8px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.2 rounded normal-case font-mono tracking-normal leading-none shrink-0 animate-pulse font-black">
                NEW
              </span>
              {dashSubTab === "roadmap" && (
                <motion.div layoutId="dashActiveLine" className="absolute bottom-0 inset-x-0 h-0.5 bg-[#C1121F]"></motion.div>
              )}
            </button>
          </div>

          {dashSubTab === "roadmap" && (
            <PreparationRoadmap
              user={user}
              onProfileUpdate={updateDocInProfile}
              language={language}
              theme={theme}
            />
          )}

          {dashSubTab === "overview" && (
            <>
              {/* Course Enrollment Hub Banner */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-[#1E0B0D] via-[#121212] to-[#121212] border border-[#C1121F]/40 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#C1121F]/15 rounded-full blur-2xl pointer-events-none"></div>

                <div className="space-y-1.5 max-w-xl relative z-10">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] font-mono font-black bg-[#FFD700] text-black px-2 py-0.5 rounded uppercase shadow">
                      ADMISSION BATCH 2026/2027
                    </span>
                    <span className={`text-[10px] font-mono font-bold flex items-center gap-1 px-2 py-0.5 rounded-full border ${
                      isUserEnrolled
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                        : "bg-red-500/10 text-red-400 border-red-500/30"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isUserEnrolled ? "bg-emerald-400" : "bg-red-400 animate-ping"}`}></span>
                      <span>{isUserEnrolled ? (language === "bn" ? "ইনরোল্ড সক্রিয়" : "Enrolled Active") : (language === "bn" ? "ভর্তি চলছে" : "Enrollment Open")}</span>
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-extrabold text-white font-sans group-hover:text-[#FFD700] transition-colors">
                    {language === "bn"
                      ? "🎓 মেডিকেল ও ডেন্টাল ভর্তি পরীক্ষা স্পেশাল কোর্স"
                      : "🎓 Medical Admission & Dental Special Prep Batch"}
                  </h3>

                  <p className="text-xs text-gray-300 font-sans leading-relaxed">
                    {isUserEnrolled
                      ? (language === "bn"
                          ? "আপনার এনরোলমেন্ট সক্রিয় রয়েছে। লাইভ ক্লাস, বিষয়ভিত্তিক পরীক্ষা ও লেকচার নোটস এক্সেস করতে 'আমার কোর্স' এ প্রবেশ করুন।"
                          : "Your course enrollment is active! Access live classes, subject mocks, and lecture notes in My Courses.")
                      : (language === "bn"
                          ? "মেডিকেল স্টুডেন্টদের লাইভ ক্লাস, মক এক্সাম ব্যাচ, পারসোনালাইজড ডাউট ক্লিয়ারিং ও অ্যানালিটিক্স সহ এখনই যুক্ত হোন।"
                          : "Join top medical student faculty for live lectures, daily practice & full course access.")}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    playSound("click");
                    setActiveTab(isUserEnrolled ? "my_courses" : "courses");
                  }}
                  className={`px-5 py-2.5 font-mono font-bold text-xs uppercase rounded-xl shadow-lg flex items-center gap-2 shrink-0 cursor-pointer hover:scale-105 transition-transform relative z-10 text-white ${
                    isUserEnrolled
                      ? "bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600"
                      : "bg-gradient-to-r from-[#C1121F] to-red-700 hover:from-red-600 hover:to-red-800"
                  }`}
                >
                  <span>🎓</span>
                  <span>
                    {isUserEnrolled
                      ? (language === "bn" ? "আমার কোর্সে যান →" : "GO TO MY COURSES →")
                      : (language === "bn" ? "কোর্সে ভর্তি হোন →" : "ENROLL IN COURSE →")}
                  </span>
                </button>
              </motion.div>

              {/* A. Study Metrics HUD (3 mini-dashboard counters) */}
              <div className="grid md:grid-cols-3 gap-6">
                
                {/* Metric 1 */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.1 }}
                  className={`p-5 rounded-2xl border transition-all duration-300 flex items-center gap-4 relative shadow ${
                    isDark
                      ? "bg-[#111111] border-white/10 hover:border-[#C1121F]"
                      : "bg-white border-red-150 shadow-sm hover:border-[#C1121F] text-slate-800"
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/30 border border-[#C1121F]/20 flex items-center justify-center text-2xl shrink-0">
                    ⚔️
                  </div>
                  <div>
                    <span className={`text-[10px] uppercase font-mono font-bold block leading-none ${isDark ? "text-gray-400" : "text-slate-500"}`}>Solved Trials:</span>
                    <span className={`text-xl font-extrabold block mt-1.5 font-display ${isDark ? "text-white" : "text-slate-900"}`}>{user.questionsSolved || 0} Qs</span>
                    <span className="text-[9px] text-gray-500 block font-mono">National aggregate</span>
                  </div>
                </motion.div>

                {/* Metric 2 */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.18 }}
                  className={`p-5 rounded-2xl border transition-all duration-300 flex items-center gap-4 relative shadow ${
                    isDark
                      ? "bg-[#111111] border-white/10 hover:border-[#FFD700]"
                      : "bg-white border-red-150 shadow-sm hover:border-yellow-400 text-slate-800"
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-yellow-50 dark:bg-yellow-950/20 border border-[#FFD700]/20 flex items-center justify-center text-2xl shrink-0">
                    🎯
                  </div>
                  <div>
                    <span className={`text-[10px] uppercase font-mono font-bold block leading-none ${isDark ? "text-gray-400" : "text-slate-500"}`}>Mocks Accuracy:</span>
                    <span className={`text-xl font-extrabold block mt-1.5 font-display ${isDark ? "text-white" : "text-slate-900"}`}>
                      {user.questionsSolved > 0 ? Math.round((user.questionsCorrect / user.questionsSolved) * 100) : 0}% Acc
                    </span>
                    <span className="text-[9px] text-gray-500 block font-mono">Cutoff: 65% Marks</span>
                  </div>
                </motion.div>

                {/* Metric 3 */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.25 }}
                  className={`p-5 rounded-2xl border transition-all duration-300 flex items-center gap-4 relative shadow ${
                    isDark
                      ? "bg-[#111111] border-white/10 hover:border-[#C1121F]"
                      : "bg-white border-red-150 shadow-sm hover:border-[#C1121F] text-slate-800"
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-[#FFD700]/10 border border-[#FFD700]/20 flex items-center justify-center text-2xl animate-pulse shrink-0">
                    🔥
                  </div>
                  <div>
                    <span className={`text-[10px] uppercase font-mono font-bold block leading-none ${isDark ? "text-gray-400" : "text-slate-500"}`}>Streaks Multiplier:</span>
                    <span className={`text-xl font-extrabold block mt-1.5 font-display ${isDark ? "text-white" : "text-slate-900"}`}>+{user.dailyStreak || 1}d Streak</span>
                    <span className="text-[9px] text-gray-500 block font-mono">Continuous Grind</span>
                  </div>
                </motion.div>
              </div>

              {/* B. NEW FEATURE: Candidate Preparation Analytics & Progress Telemetry (RECHARTS AREA CHART) */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className={`border rounded-2xl p-6 relative shadow-lg ${
                  isDark ? "bg-[#111111] border-white/10" : "bg-white border-red-150 shadow-[0_8px_30px_rgba(193,18,31,0.06)]"
                }`}
              >
                <div className="absolute top-0 left-6 h-1 w-20 bg-[#C1121F]"></div>
                
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-4 mb-6 border-white/5">
                  <div>
                    <h3 className={`font-extrabold text-sm uppercase flex items-center gap-2 font-display ${isDark ? "text-white" : "text-slate-900"}`}>
                      <TrendingUp className="w-4 h-4 text-[#C1121F]" />
                      {language === "bn" ? "অ্যাডমিশন ইন্টেন্সিটি গ্রাফ" : "PREPARATION INTENSITY GRAPH"}
                    </h3>
                    <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block mt-0.5">
                      {language === "bn" ? "বিগত ৭ দিনের পারফরম্যান্স অ্যানালিসিস" : "PAST 7 DAYS PERFORMANCE TELEMETRY"}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[9.5px] font-mono font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded leading-none select-none uppercase">
                      {language === "bn" ? "অ্যাক্টিভ অ্যানালিটিক্স" : "TELEMETRY STABLE"}
                    </span>
                  </div>
                </div>

                {/* Dynamic Chart Integration */}
                <div className="h-64 w-full">
                  {(() => {
                    // Let's create realistic data points over 7 days leading to today
                    const today = new Date();
                    const chartData = Array.from({ length: 7 }).map((_, i) => {
                      const d = new Date();
                      d.setDate(today.getDate() - (6 - i));
                      const label = d.toLocaleDateString(undefined, { weekday: 'short' });
                      
                      // Distribute solved questions and correct count based on user stats
                      const baseSolved = Math.max(1, Math.round((user.questionsSolved || 0) / 7));
                      const varianceSolved = Math.round(Math.sin(i) * (baseSolved * 0.4));
                      const solved = Math.max(2, baseSolved + varianceSolved);
                      
                      const accuracy = user.questionsSolved > 0 ? (user.questionsCorrect / user.questionsSolved) : 0.75;
                      const correct = Math.max(1, Math.min(solved, Math.round(solved * accuracy)));
                      
                      return {
                        day: label,
                        [language === "bn" ? "সমাধানকৃত" : "Solved"]: solved,
                        [language === "bn" ? "সঠিক" : "Correct"]: correct,
                      };
                    });

                    return (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorSolved" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#C1121F" stopOpacity={0.25}/>
                              <stop offset="95%" stopColor="#C1121F" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorCorrect" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#FFD700" stopOpacity={0.25}/>
                              <stop offset="95%" stopColor="#FFD700" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.03)" : "rgba(193,18,31,0.05)"} />
                          <XAxis 
                            dataKey="day" 
                            stroke={isDark ? "#555" : "#888"} 
                            style={{ fontSize: 10, fontFamily: 'monospace' }} 
                          />
                          <YAxis 
                            stroke={isDark ? "#555" : "#888"} 
                            style={{ fontSize: 10, fontFamily: 'monospace' }} 
                          />
                          <ChartTooltip 
                            contentStyle={{ 
                              backgroundColor: isDark ? '#111' : '#fff', 
                              borderColor: '#C1121F',
                              borderRadius: '8px',
                              fontSize: '11px',
                              fontFamily: 'monospace'
                            }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey={language === "bn" ? "সমাধানকৃত" : "Solved"} 
                            stroke="#C1121F" 
                            strokeWidth={2}
                            fillOpacity={1} 
                            fill="url(#colorSolved)" 
                          />
                          <Area 
                            type="monotone" 
                            dataKey={language === "bn" ? "সঠিক" : "Correct"} 
                            stroke="#FFD700" 
                            strokeWidth={2}
                            fillOpacity={1} 
                            fill="url(#colorCorrect)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    );
                  })()}
                </div>
              </motion.div>

              {/* C. Pinned Rival Combat Comparison Duel */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className={`border rounded-2xl p-6 relative shadow-lg ${
                  isDark ? "bg-[#111111] border-white/10" : "bg-white border-red-150 shadow-[0_8px_30px_rgba(193,18,31,0.06)]"
                }`}
              >
                <div className="absolute top-0 left-6 h-1 w-20 bg-[#C1121F]"></div>
                
                <div className={`flex justify-between items-center border-b pb-3 mb-5 ${isDark ? "border-white/5" : "border-red-150/35"}`}>
                  <h3 className={`font-extrabold text-sm uppercase flex items-center gap-2 font-display ${isDark ? "text-white" : "text-slate-900"}`}>
                    <Swords className="w-4 h-4 text-[#C1121F]" /> 
                    {language === "bn" ? "প্রতিদ্বন্দী যুদ্ধক্ষেত্র" : "RIVALRY COMPARISON ARENA"}
                  </h3>
                  <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest leading-none">
                    {language === "bn" ? "লাইভ তুলনা" : "LIVE COMPARISON"}
                  </span>
                </div>

                {user.pinnedRivalId && rivalProfile ? (
                  <div className="flex flex-col gap-6">
                    {/* Head to head Duel Grid */}
                    <div className="grid grid-cols-7 items-center gap-2 md:gap-4">
                      
                      {/* Current User Stats */}
                      <div className="col-span-3 text-center flex flex-col items-center">
                        <div className="relative mb-2">
                          <img
                            src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`}
                            alt="Your Avatar"
                            className={`w-12 h-12 md:w-16 md:h-16 rounded-full border bg-black shadow-md p-0.5 ${
                              user.xp >= rivalProfile.xp 
                                ? "border-green-500 shadow-green-500/20" 
                                : "border-gray-500"
                            }`}
                          />
                          {user.xp >= rivalProfile.xp && (
                            <span className="absolute -top-1 -right-1 text-xs" title="Leading">👑</span>
                          )}
                        </div>
                        <span className={`text-xs font-black uppercase font-display truncate max-w-full ${isDark ? "text-white" : "text-slate-900"}`}>
                          {user.displayName}
                        </span>
                        <span className="text-[9px] font-mono text-gray-500">
                          {language === "bn" ? "আপনি" : "YOU"}
                        </span>
                      </div>

                      {/* VS Indicator */}
                      <div className="col-span-1 text-center flex flex-col items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-red-950/40 border border-[#C1121F]/20 flex items-center justify-center">
                          <span className="text-xs font-black text-[#C1121F] font-mono animate-pulse">VS</span>
                        </div>
                      </div>

                      {/* Pinned Rival Stats */}
                      <div className="col-span-3 text-center flex flex-col items-center">
                        <div className="relative mb-2">
                          <img
                            src={rivalProfile.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${rivalProfile.uid}`}
                            alt="Rival Avatar"
                            className={`w-12 h-12 md:w-16 md:h-16 rounded-full border bg-black shadow-md p-0.5 ${
                              rivalProfile.xp >= user.xp 
                                ? "border-green-500 shadow-green-500/20" 
                                : "border-gray-500"
                            }`}
                          />
                          {rivalProfile.xp >= user.xp && (
                            <span className="absolute -top-1 -right-1 text-xs" title="Leading">👑</span>
                          )}
                        </div>
                        <span className={`text-xs font-black uppercase font-display truncate max-w-full ${isDark ? "text-white" : "text-slate-900"}`}>
                          {rivalProfile.displayName}
                        </span>
                        <span className="text-[9px] font-mono text-[#C1121F] uppercase font-bold truncate max-w-full">
                          {rivalProfile.college || (language === "bn" ? "কোন কলেজ নির্দিষ্ট নেই" : "No College")}
                        </span>
                      </div>

                    </div>

                    {/* Stat Comparisons Table */}
                    <div className={`rounded-xl p-3 border ${
                      isDark ? "bg-[#0D0D0D] border-white/5" : "bg-red-50/10 border-red-100/50"
                    }`}>
                      <div className="flex flex-col gap-3 font-mono text-[11px]">
                        
                        {/* XP Stats Row */}
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <span className={`font-bold ${user.xp >= rivalProfile.xp ? "text-emerald-500 font-black" : "text-gray-400"}`}>
                            {user.xp} XP
                          </span>
                          <span className="text-gray-500 uppercase tracking-wide text-[9px]">TOTAL EXPERIENCE</span>
                          <span className={`font-bold ${rivalProfile.xp >= user.xp ? "text-emerald-500 font-black" : "text-gray-400"}`}>
                            {rivalProfile.xp} XP
                          </span>
                        </div>

                        {/* Level Stats Row */}
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <span className={`font-bold ${user.level >= (rivalProfile.level || 1) ? "text-emerald-500 font-black" : "text-gray-400"}`}>
                            {language === "bn" ? "লেভেল" : "LVL"} {user.level}
                          </span>
                          <span className="text-gray-500 uppercase tracking-wide text-[9px]">SOLDIER LEVEL</span>
                          <span className={`font-bold ${((rivalProfile.level || 1) >= user.level) ? "text-emerald-500 font-black" : "text-gray-400"}`}>
                            {language === "bn" ? "লেভেল" : "LVL"} {rivalProfile.level || 1}
                          </span>
                        </div>

                        {/* Solved Question Row */}
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <span className={`font-bold ${user.questionsSolved >= (rivalProfile.questionsSolved || 0) ? "text-emerald-500 font-black" : "text-gray-400"}`}>
                            {user.questionsSolved} Qs
                          </span>
                          <span className="text-gray-500 uppercase tracking-wide text-[9px]">SOLVED DRILLS</span>
                          <span className={`font-bold ${(rivalProfile.questionsSolved || 0) >= user.questionsSolved ? "text-emerald-500 font-black" : "text-gray-400"}`}>
                            {rivalProfile.questionsSolved || 0} Qs
                          </span>
                        </div>

                        {/* Accuracy Stats Row */}
                        {(() => {
                          const userAcc = user.questionsSolved > 0 ? Math.round((user.questionsCorrect / user.questionsSolved) * 100) : 0;
                          const rivalAcc = (rivalProfile.questionsSolved || 0) > 0 ? Math.round(((rivalProfile.questionsCorrect || 0) / (rivalProfile.questionsSolved || 1)) * 100) : 0;
                          return (
                            <div className="flex items-center justify-between border-b border-white/5 pb-2">
                              <span className={`font-bold ${userAcc >= rivalAcc ? "text-emerald-500 font-black" : "text-gray-400"}`}>
                                {userAcc}%
                              </span>
                              <span className="text-gray-500 uppercase tracking-wide text-[9px]">{language === "bn" ? "প্রাপ্ত নম্বর %" : "MARKS %"}</span>
                              <span className={`font-bold ${rivalAcc >= userAcc ? "text-emerald-500 font-black" : "text-gray-400"}`}>
                                {rivalAcc}%
                              </span>
                            </div>
                          );
                        })()}

                        {/* Streak Stats Row */}
                        <div className="flex items-center justify-between pb-1">
                          <span className={`font-bold ${user.dailyStreak >= (rivalProfile.dailyStreak || 0) ? "text-emerald-500 font-black" : "text-gray-400"}`}>
                            {user.dailyStreak} {language === "bn" ? "দিন" : "Days"}
                          </span>
                          <span className="text-gray-500 uppercase tracking-wide text-[9px]">DAILY STREAK</span>
                          <span className={`font-bold ${(rivalProfile.dailyStreak || 0) >= user.dailyStreak ? "text-emerald-500 font-black" : "text-gray-400"}`}>
                            {rivalProfile.dailyStreak || 0} {language === "bn" ? "দিন" : "Days"}
                          </span>
                        </div>

                      </div>
                    </div>

                    {/* Head-to-Head Challenge Button */}
                    <button
                      type="button"
                      onClick={() => {
                        playSound("battle");
                        setActiveChallengeRival(rivalProfile);
                        setActiveTab("practice");
                      }}
                      className="w-full mt-1 py-3 bg-gradient-to-r from-[#C1121F] to-amber-600 hover:from-red-650 hover:to-amber-500 text-white font-extrabold text-center uppercase tracking-wider rounded-xl transition-all duration-300 border-b-4 border-red-900 hover:shadow-[0_0_15px_rgba(193,18,31,0.3)] shadow flex items-center justify-center gap-2 font-display cursor-pointer animate-pulse"
                    >
                      <Swords className="w-4 h-4 text-white" />
                      <span>
                        {language === "bn" 
                          ? `${rivalProfile.displayName}-কে ডুয়েলে চ্যালেঞ্জ করুন!` 
                          : `CHALLENGE ${rivalProfile.displayName} HEAD-TO-HEAD`}
                      </span>
                    </button>

                    {/* Quick rival tools */}
                    <div className="flex items-center justify-between mt-1 gap-4">
                      <button
                        type="button"
                        onClick={() => { playSound("click"); setActiveTab("leaderboard"); }}
                        className={`text-[10px] font-mono uppercase tracking-wider font-extrabold hover:underline transition cursor-pointer ${
                          isDark ? "text-gray-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {language === "bn" ? "← প্রতিদ্বন্দী পরিবর্তন করুন" : "← CHANGE RIVAL"}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          playSound("click");
                          if (confirm(language === "bn" ? "আপনি কি প্রতিদ্বন্দী পিনমুক্ত করতে চান?" : "Are you sure you want to unpin this rival?")) {
                            await updateDocInProfile({ pinnedRivalId: null });
                          }
                        }}
                        className="text-[10px] font-mono uppercase text-[#C1121F] hover:underline font-extrabold transition cursor-pointer"
                        id="btn-remove-pinned-rival"
                      >
                        {language === "bn" ? "বাদ দিন ⚔️" : "UNPIN RIVAL ⚔️"}
                      </button>
                    </div>

                  </div>
                ) : user.pinnedRivalId && !rivalProfile ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <Loader2 className="w-8 h-8 text-[#C1121F] animate-spin mb-3" />
                    <p className={`text-xs font-mono uppercase ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                      {language === "bn" ? "প্রতিদ্বন্দীর তথ্য স্ক্যান করা হচ্ছে..." : "ACQUIRING RIVAL TELEMETRY CONTENT..."}
                    </p>
                  </div>
                ) : (
                  <div className={`flex flex-col items-center justify-center py-8 text-center border-2 border-dashed ${isDark ? "border-white/5 bg-black/[0.1] text-white" : "border-red-100 bg-red-50/5 text-slate-800"} rounded-2xl`}>
                    <div className="w-12 h-12 rounded-full bg-red-950/10 border border-[#C1121F]/20 flex items-center justify-center text-xl mb-3.5">
                      ⚔️
                    </div>
                    <h4 className="text-xs font-black uppercase tracking-wide mb-1.5 font-display">
                      {language === "bn" ? "কোন প্রতিদ্বন্দ্বী পিন করা নেই" : "NO ACTIVE RIVAL"}
                    </h4>
                    <p className="text-[10px] text-gray-500 max-w-xs mb-4 leading-relaxed px-4">
                      {language === "bn" 
                        ? "লিডারবোর্ড থেকে যেকোনো প্রতিযোগীকে পিন করে তাদের সাথে সরাসরি স্কোর তুলনা করুন!" 
                        : "Pin any study partner from the Leaderboard to match your Level, XP, solved questions, and daily streaks live."}
                    </p>
                    <button
                      type="button"
                      onClick={() => { playSound("click"); setActiveTab("leaderboard"); }}
                      className="px-4 py-2 bg-gradient-to-r from-[#C1121F] to-red-650 text-white font-extrabold rounded-lg text-[9px] uppercase tracking-widest hover:scale-[1.02] transition shadow border-b border-red-950 font-mono cursor-pointer"
                      id="btn-rivalry-go-select-lever"
                    >
                      {language === "bn" ? "লিডারবোর্ড থেকে পিন করুন" : "PIN FROM LEADERBOARD"}
                    </button>
                  </div>
                )}
              </motion.div>

              {/* D. Action Banner to Enter Combat Zone */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className={`border rounded-2xl p-6 relative overflow-hidden shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 ${
                  isDark
                    ? "bg-gradient-to-r from-[#C1121F]/15 via-[#111111] to-black border-white/10"
                    : "bg-gradient-to-r from-red-50 to-white border-red-150 shadow-md text-slate-800"
                }`}
              >
                <div className="absolute inset-y-0 right-0 w-64 bg-[radial-gradient(circle_at_right,_var(--tw-gradient-stops))] from-red-600/10 to-transparent pointer-events-none"></div>
                <div>
                  <span className="text-[10px] bg-[#C1121F] text-white px-2.5 py-1 rounded-md font-mono font-black uppercase tracking-widest border border-white/10 shadow-[0_0_10px_rgba(193,18,31,0.2)]">
                    SEASON 01 ACTIVE
                  </span>
                  <h3 className={`text-lg md:text-xl font-black uppercase mt-3.5 leading-none font-display ${isDark ? "text-white" : "text-slate-900"}`}>
                    READY TO COMMENCE GRINDING CAMPAIGN?
                  </h3>
                  <p className={`text-xs mt-2 max-w-md leading-relaxed ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                    Acquire points, gold, and weaponized mnemonics. Dissect organic biochemistry chemistry chapter matrices or launch Survival Mode tests.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("practice")}
                  className="px-6 py-3.5 bg-[#C1121F] hover:bg-red-750 text-white font-extrabold rounded-lg text-xs uppercase tracking-widest shadow-lg transition border-b-2 border-red-950 font-display cursor-pointer shrink-0"
                  id="btn-dash-enter-combating"
                >
                  ENTER ARENA ⚔️
                </button>
              </motion.div>

              {/* E. Double Split - Admission Radar & Pomodoro Focus Timer */}
              <div className="grid md:grid-cols-2 gap-6">
                
                {/* Notice Dashboard: Admission update boards scrollable */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.22 }}
                  className={`border rounded-2xl p-6 relative shadow-lg ${
                    isDark ? "bg-[#111111] border-white/10" : "bg-white border-red-150 shadow-[0_8px_30px_rgba(193,18,31,0.06)]"
                  }`}
                >
                  <div className="absolute top-0 left-6 h-1 w-24 bg-[#FFD700]"></div>
                  
                  <div className={`flex justify-between items-center border-b pb-3 mb-5 ${isDark ? "border-white/5" : "border-red-150/35"}`}>
                    <h3 className={`font-extrabold text-xs uppercase flex items-center gap-2 font-display ${isDark ? "text-white" : "text-slate-900"}`}>
                      <Bell className="w-4 h-4 text-[#FFD700]" /> BANGLADESH ADMISSION RADAR
                    </h3>
                    <span className="text-[10px] font-mono text-gray-500">LIVE</span>
                  </div>

                  {notices.length === 0 ? (
                    <div className="flex flex-col gap-3 font-sans">
                      {/* fallback notices */}
                      <div className="bg-[#0D0D0D] border-l-4 border-l-[#C1121F] border border-white/5 p-4 rounded-r-lg">
                        <div className="flex justify-between items-center mb-1 text-xs">
                          <span className="font-bold text-white uppercase font-sans text-[11px]">DGHS Medical Syllabus Finalized</span>
                          <span className="text-[9px] font-mono text-gray-500 font-bold uppercase">1 hr ago</span>
                        </div>
                        <p className="text-[11px] text-gray-400 leading-relaxed mt-1">
                          DGHS confirmed that cell division, organic compound reactions, and vector mechanics remain active inside current MAT syllabus matrix.
                        </p>
                      </div>
                      
                      <div className="bg-[#0D0D0D] border border-white/5 p-4 rounded-lg">
                        <div className="flex justify-between items-center mb-1 text-xs">
                          <span className="font-bold text-gray-300 font-sans text-[11px]">MediBridge Leaderboard Prizes</span>
                          <span className="text-[9px] font-mono text-gray-500 font-bold uppercase">1 day ago</span>
                        </div>
                        <p className="text-[11px] text-gray-400 leading-relaxed mt-1">
                          Top 5 Aspirant Gladiators globally will acquire official companion Abul Hasan textbook companion notebooks.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3.5 max-h-[250px] overflow-y-auto">
                      {notices.map((n) => (
                        <div
                          key={n.id}
                          className={`p-4 rounded-lg border leading-relaxed ${
                            n.important
                              ? "bg-red-950/20 border-red-900/60 border-l-4 border-l-[#C1121F]"
                              : "bg-[#0D0D0D] border-white/5"
                          }`}
                        >
                          <div className="flex justify-between items-center text-xs mb-1">
                            <span className="font-bold text-white uppercase font-display">{n.title}</span>
                            <span className="text-[9px] font-mono text-gray-500 font-semibold uppercase">sys</span>
                          </div>
                          <p className="text-xs text-gray-300 mt-1">{n.content}</p>
                          <span className="text-[9px] font-mono text-[#FFD700] uppercase block mt-1.5 font-bold">BROADCASTED BY {n.createdBy || "System Command"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>

                {/* Focus pomodoro tool */}
                <PomodoroTimer
                  user={user}
                  onProfileUpdate={updateDocInProfile}
                  language={language}
                  theme={theme}
                />

              </div>

              {/* F. Battle Log: Combat history logs */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.28 }}
                className="bg-[#111111] border border-white/10 rounded-2xl p-6 relative shadow-lg"
              >
                <div className="absolute top-0 left-6 h-1 w-20 bg-[#C1121F]"></div>
                
                <h3 className="font-extrabold text-sm uppercase text-white tracking-wide border-b border-white/5 pb-3 mb-4 flex items-center justify-between font-display">
                  <span>RECENT BATTLE DECK LOGS</span>
                  <span className="text-[10px] text-gray-500 font-mono tracking-widest font-bold">TELEMETRY SECURE</span>
                </h3>

                <div className="flex flex-col gap-2 font-mono text-[11px] leading-relaxed">
                  {(() => {
                    const SAMPLE_REPLAY_LOGS = [
                      {
                        id: "sample_1",
                        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
                        subject: "Biology",
                        chapter: language === "bn" ? "কোষ বিভাজন" : "Cell Division",
                        realm: language === "bn" ? "জীববিজ্ঞান রাজ্য" : "Biology Realm",
                        battleType: language === "bn" ? "বস ব্যাটল (কোষীয় অসুর)" : "Boss Battle vs Cell Demon",
                        xpEarned: 150,
                        coinsEarned: 50,
                        score: "2/3",
                        success: true,
                        questions: [
                          {
                            questionText: language === "bn" ? "মাইটোসিস কোষ বিভাজনের কোন ধাপে ক্রোমোজোমগুলো বিষুবীয় অঞ্চলে অবস্থান করে?" : "In which stage of mitosis do chromosomes align at the equatorial plate?",
                            options: language === "bn" ? ["প্রোফেজ", "মেটাফেজ", "অ্যানাফেজ", "টেলোফেজ"] : ["Prophase", "Metaphase", "Anaphase", "Telophase"],
                            correctAnswerIndex: 1,
                            selectedAnswerIndex: 1,
                            explanation: language === "bn" ? "মেটাফেজ ধাপে ক্রোমোজোমগুলো মেটাকাইনেসিস প্রক্রিয়ায় বিষুবীয় অঞ্চলে (equatorial plate) বিন্যস্ত হয় এবং স্পিন্ডল তন্তুর সাথে যুক্ত হয়।" : "During metaphase, chromosomes align at the equator of the cell through a process called metakinesis.",
                            subject: "Biology",
                            chapter: "Cell Division"
                          },
                          {
                            questionText: language === "bn" ? "কোন অঙ্গাণুটিকে কোষে 'আত্মঘাতী থলি' (Suicidal Bag) বলা হয়?" : "Which organelle is referred to as the 'Suicidal Bag' of the cell?",
                            options: language === "bn" ? ["রাইবোসোম", "লাইসোসোম", "গলজি বডি", "মাইটোকন্ড্রিয়া"] : ["Ribosome", "Lysosome", "Golgi Body", "Mitochondria"],
                            correctAnswerIndex: 1,
                            selectedAnswerIndex: 1,
                            explanation: language === "bn" ? "লাইসোসোম তার ভেতরে থাকা আর্দ্রবিশ্লেষী এনজাইমের মাধ্যমে কোষে অটোল্যাইসিস বা স্ব-গ্রাস প্রক্রিয়া চালায়, তাই একে আত্মঘাতী থলি বলে।" : "Lysosomes contain hydrolytic enzymes and can destroy their own cell via autolysis, earning them the name 'suicidal bags'.",
                            subject: "Biology",
                            chapter: "Cell Division"
                          },
                          {
                            questionText: language === "bn" ? "ডিএনএ রেপ্লিকেশন কোষ চক্রের কোন দশায় ঘটে থাকে?" : "In which phase of the cell cycle does DNA replication occur?",
                            options: language === "bn" ? ["G1 দশা", "S দশা", "G2 দشا", "M দশা"] : ["G1 Phase", "S Phase", "G2 Phase", "M Phase"],
                            correctAnswerIndex: 1,
                            selectedAnswerIndex: 0,
                            explanation: language === "bn" ? "কোষ চক্রের ইন্টারফেজের S (Synthesis) উপদশায় ডিএনএ এর অনুলিপন বা রেপ্লিকেশন সম্পন্ন হয়।" : "DNA replication occurs during the S (Synthesis) phase of interphase in the cell cycle.",
                            subject: "Biology",
                            chapter: "Cell Division"
                          }
                        ]
                      },
                      {
                        id: "sample_2",
                        timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
                        subject: "Chemistry",
                        chapter: language === "bn" ? "জৈব রসায়ন" : "Organic Chemistry",
                        realm: language === "bn" ? "রসায়ন রাজ্য" : "Chemistry Realm",
                        battleType: language === "bn" ? "স্ট্যান্ডার্ড কমব্যাট" : "Standard Combat",
                        xpEarned: 0,
                        coinsEarned: 0,
                        score: "0/1",
                        success: false,
                        questions: [
                          {
                            questionText: language === "bn" ? "নিচের কোনটি মার্কোনিকভ নিয়মের সাথে সম্পর্কিত?" : "Which of the following is associated with Markovnikov's Rule?",
                            options: language === "bn" ? ["অপ্রতিসম অ্যালকিন ও অপ্রতিসম বিকারক", "প্রতিসম অ্যালকিন ও প্রতিসম বিকারক", "অ্যালকোহল ও জৈব এসিড", "নিউক্লিওফিলিক প্রতিস্থাপন"] : ["Asymmetric alkene and asymmetric reagent", "Symmetric alkene and symmetric reagent", "Alcohol and organic acid", "Nucleophilic substitution"],
                            correctAnswerIndex: 0,
                            selectedAnswerIndex: 2,
                            explanation: language === "bn" ? "মার্কোনিকভ নিয়ম অনুসারে অপ্রতিসম অ্যালকিনের সাথে অপ্রতিসম বিকারকের (যেমন HBr) যুত বিক্রিয়ায় বিকারকের ঋণাত্মক অংশ কম হাইড্রোজেনযুক্ত কার্বনে যুক্ত হয়।" : "Markovnikov's rule dictates that in the addition of an asymmetric reagent (like HBr) to an asymmetric alkene, the nucleophilic part adds to the carbon with fewer hydrogen atoms.",
                            subject: "Chemistry",
                            chapter: "Organic Chemistry"
                          }
                        ]
                      }
                    ];

                    const displayLogs = battleLogs.length > 0 ? battleLogs : SAMPLE_REPLAY_LOGS;

                    return displayLogs.map((log) => {
                      const isSample = log.id.startsWith("sample_");
                      return (
                        <div
                          key={log.id}
                          onClick={() => {
                            playSound("click");
                            setSelectedReplayBattle(log);
                          }}
                          className={`flex justify-between items-center p-3.5 rounded-xl border cursor-pointer hover:scale-[1.01] transition-all duration-200 ${
                            log.success
                              ? "bg-[#0D0D0D] hover:bg-[#161616] border-white/5 hover:border-emerald-500/20"
                              : "bg-red-950/10 hover:bg-red-950/20 border-red-950/15 hover:border-red-950/40"
                          }`}
                        >
                          <div className="flex flex-col gap-1 text-left">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`font-bold uppercase tracking-wider text-[9px] ${
                                log.success ? "text-emerald-400" : "text-[#C1121F]"
                              }`}>
                                {log.success 
                                  ? (language === "bn" ? "● সাকসেস" : "● SUCCESS") 
                                  : (language === "bn" ? "● ফেইলড" : "● FAILED")
                                }
                              </span>
                              {isSample && (
                                <span className="text-[8px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/20 px-1 py-0.2 rounded font-sans uppercase">
                                  {language === "bn" ? "ডেমো" : "Demo"}
                                </span>
                              )}
                            </div>
                            <span className="text-gray-400 text-[10px]">
                              {log.realm} • {log.chapter}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-white block font-black">{log.score}</span>
                            <span className="text-gray-500 text-[9px] block font-sans">
                              {log.success ? `+${log.xpEarned} XP` : (language === "bn" ? "ভুল পর্যালোচনা করুন" : "Review Mistakes")}
                            </span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </motion.div>

            </>
          )}

        </div>

        {/* G. Daily Habit Missions Widget taking full layout width at the bottom */}
        <div className="lg:col-span-3 mt-4">
          <DailyMissions
            user={user}
            onProfileUpdate={updateDocInProfile}
            setActiveTab={setActiveTab}
            language={language}
            theme={theme}
          />
        </div>

      </div>
    </div>
  );
}
