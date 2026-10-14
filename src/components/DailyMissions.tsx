import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { UserProfile } from "../types";
import { CheckCircle2, Circle, Coins, Flame, Gem, ShieldAlert, Sparkles, Swords, BrainCircuit, Play } from "lucide-react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

interface DailyMissionsProps {
  user: UserProfile;
  onProfileUpdate: (updated: Partial<UserProfile>) => void;
  setActiveTab: (tab: "dashboard" | "practice" | "social" | "leaderboard" | "mentor" | "admin") => void;
  language?: "bn" | "en";
  theme?: "light" | "dark";
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  rewardXp: number;
  rewardCoins: number;
  targetCount: number;
  currentCount: number;
  completed: boolean;
  claimed: boolean;
  icon: string;
}

export default function DailyMissions({ user, onProfileUpdate, setActiveTab, language = "bn" }: DailyMissionsProps) {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [showRewardModal, setShowRewardModal] = useState<{ xp: number; coins: number; title: string } | null>(null);
  const [showQuickDrill, setShowQuickDrill] = useState(false);
  const [drillAnswered, setDrillAnswered] = useState(false);
  const [drillCorrect, setDrillCorrect] = useState<boolean | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const isBn = language === "bn";

  // Quick Flash-Drill MCQ Sample
  const drillQuestion = {
    text: "নিচের কোন অঙ্গাণুটিকে কোষের 'পাওয়ার হাউস' (শক্তিঘর) বলা হয়? (Which cell organelle is known as the 'powerhouse of the cell'?)",
    options: ["রাইবোজোম (Ribosome)", "মাইটোকন্ড্রিয়া (Mitochondria)", "গলজি বস্তু (Golgi)", "লাইসোজোম (Lysosome)"],
    correctIndex: 1,
    explanation: "মাইটোকন্ড্রিয়া খাদ্য থেকে রাসায়নিক শক্তি রূপান্তরের মাধ্যমে এটিপি (ATP) তৈরি করে, তাই একে কোষের শক্তিঘর বলা হয়। (Mitochondria convert chemical energy from food into ATP, earning their reputation as cellular powerhouses.)",
  };

  const getTodayKey = () => {
    const today = new Date();
    return today.toISOString().split("T")[0]; // YYYY-MM-DD
  };

  // Load and sync daily missions on mount and when user profile stats update
  useEffect(() => {
    const todayStr = getTodayKey();
    const storageKey = `medibridge_missions_${user.uid}_${todayStr}`;
    const storedState = localStorage.getItem(storageKey);

    // Track dynamic counts from user's live profile
    // Biology MCQ count: We store standard daily bio MCQs solved in localStorage
    const bioSolvedKey = `medibridge_bio_solved_${user.uid}_${todayStr}`;
    const bioSolvedCount = Number(localStorage.getItem(bioSolvedKey) || "0");

    // Consult AI flag: stored in localStorage
    const consultAiKey = `medibridge_consult_ai_${user.uid}_${todayStr}`;
    const hasConsulted = localStorage.getItem(consultAiKey) === "true";

    let claimedMissions = { bio: false, login: false, mentor: false };
    if (storedState) {
      try {
        claimedMissions = JSON.parse(storedState);
      } catch (e) {
        console.error("Error parsing stored mission states", e);
      }
    }

    // Task 1: Solve 5 Biology MCQs (reward: 150 XP, 50 Coins)
    const bioCompleted = bioSolvedCount >= 5;
    
    // Task 2: Login 3 days in a row (reward: 200 XP, 100 Coins)
    const loginStreakCompleted = (user.dailyStreak || 1) >= 3;

    // Task 3: Use MediSense AI (reward: 100 XP, 30 Coins)
    const aiCompleted = hasConsulted;

    const currentMissionsList: Mission[] = [
      {
        id: "bio_mcqs",
        title: isBn ? "৫টি বায়োলজি এমসিকিউ সমাধান করুন" : "Solve 5 Biology MCQs",
        description: isBn 
          ? "কমব্যাট এরেনা বা ড্যাশবোর্ড কুইজে গিয়ে কোষীয় জিনতত্ত্ব বা উদ্ভিদবিদ্যার ৫টি এমসিকিউ সমাধান করুন।" 
          : "Practice cellular genetics or botany trials in the Combat Arena or take a dashboard quick drill.",
        rewardXp: 150,
        rewardCoins: 50,
        targetCount: 5,
        currentCount: Math.min(5, bioSolvedCount),
        completed: bioCompleted,
        claimed: !!claimedMissions.bio,
        icon: "🧬",
      },
      {
        id: "streak_login",
        title: isBn ? "লগইন স্ট্রিক বজায় রাখুন" : "Maintain Login Streak",
        description: isBn 
          ? "টানা ৩ দিন বা তার বেশি লগইন করার মাধ্যমে আপনার পড়ার স্ট্রিক ও শৃঙ্খলা বজায় রাখুন।" 
          : "Establish discipline with a consecutive login streak of 3 days or higher.",
        rewardXp: 200,
        rewardCoins: 100,
        targetCount: 3,
        currentCount: Math.min(3, user.dailyStreak || 1),
        completed: loginStreakCompleted,
        claimed: !!claimedMissions.login,
        icon: "🔥",
      },
      {
        id: "medisense_consult",
        title: isBn ? "মেডিসেন্স এআই পরামর্শ গ্রহণ" : "Consult MediSense AI",
        description: isBn 
          ? "কঠিন মেডিকেল পাঠ্যপুস্তক মনে রাখার কৌশল বা জটিল ট্রিগার পয়েন্ট বুঝতে এআই মেন্টরের সাহায্য নিন।" 
          : "Engage the tactical advisor to dissect hard textbooks or analyze molecular cellular biology.",
        rewardXp: 100,
        rewardCoins: 30,
        targetCount: 1,
        currentCount: hasConsulted ? 1 : 0,
        completed: aiCompleted,
        claimed: !!claimedMissions.mentor,
        icon: "🤖",
      },
    ];

    setMissions(currentMissionsList);
  }, [user.dailyStreak, user.questionsSolved, isBn]);

  // Consult AI Helper: auto-advances the mission state and takes the user to the Mentor tab
  const handleConsultAiMission = () => {
    const todayStr = getTodayKey();
    const consultAiKey = `medibridge_consult_ai_${user.uid}_${todayStr}`;
    localStorage.setItem(consultAiKey, "true");
    
    // Smooth transition
    setActiveTab("mentor");
  };

  // Submit Quick Drill answer
  const handleDrillSubmit = () => {
    if (selectedOption === null) return;
    
    const correct = selectedOption === drillQuestion.correctIndex;
    setDrillCorrect(correct);
    setDrillAnswered(true);

    if (correct) {
      const todayStr = getTodayKey();
      const bioSolvedKey = `medibridge_bio_solved_${user.uid}_${todayStr}`;
      const currentCount = Number(localStorage.getItem(bioSolvedKey) || "0");
      const newCount = currentCount + 1;
      localStorage.setItem(bioSolvedKey, String(newCount));

      // Trigger user profile updates dynamically
      const finalXp = user.xp + 30; // Extra direct fast reward for quick correct answer
      const nextLevel = Math.max(user.level, Math.floor(finalXp / 500) + 1);
      
      const updated = {
        xp: finalXp,
        level: nextLevel,
        questionsSolved: (user.questionsSolved || 0) + 1,
        questionsCorrect: (user.questionsCorrect || 0) + 1,
      };

      // update local & firestore
      updateProfileInFirebase(updated);
    }
  };

  // Sync update to firebase
  const updateProfileInFirebase = async (updates: Partial<UserProfile>) => {
    try {
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, updates as any, { merge: true });
      onProfileUpdate(updates);
    } catch (e) {
      console.error("Firestore update error in missions", e);
    }
  };

  // Claim Mission Reward
  const handleClaim = async (missionId: string) => {
    const targetMission = missions.find((m) => m.id === missionId);
    if (!targetMission || !targetMission.completed || targetMission.claimed) return;

    // Update claimed statuses in localStorage
    const todayStr = getTodayKey();
    const storageKey = `medibridge_missions_${user.uid}_${todayStr}`;
    const storedState = localStorage.getItem(storageKey);
    let claimedStates = { bio: false, login: false, mentor: false };
    
    if (storedState) {
      try { claimedStates = JSON.parse(storedState); } catch(e) {}
    }

    if (missionId === "bio_mcqs") claimedStates.bio = true;
    if (missionId === "streak_login") claimedStates.login = true;
    if (missionId === "medisense_consult") claimedStates.mentor = true;

    localStorage.setItem(storageKey, JSON.stringify(claimedStates));

    // Calculate updated coins/XP
    const addedXp = targetMission.rewardXp;
    const addedCoins = targetMission.rewardCoins;
    const finalXp = user.xp + addedXp;
    const finalCoins = (user.coins || 100) + addedCoins;
    const nextLevel = Math.max(user.level, Math.floor(finalXp / 500) + 1);

    const updates: Partial<UserProfile> = {
      xp: finalXp,
      coins: finalCoins,
      level: nextLevel,
    };

    if (nextLevel > user.level) {
      updates.rank = nextLevel >= 8 ? "Elite" : nextLevel >= 4 ? "Scholar" : "Freshman";
    }

    await updateProfileInFirebase(updates);
    setShowRewardModal({ xp: addedXp, coins: addedCoins, title: targetMission.title });

    // Refresh layout state immediately
    setMissions((prev) =>
      prev.map((m) => (m.id === missionId ? { ...m, claimed: true } : m))
    );
  };

  // Claim All completed, unclaimed missions at once
  const handleClaimAll = async () => {
    const claimable = missions.filter((m) => m.completed && !m.claimed);
    if (claimable.length === 0) return;

    // Update claimed statuses in localStorage
    const todayStr = getTodayKey();
    const storageKey = `medibridge_missions_${user.uid}_${todayStr}`;
    const storedState = localStorage.getItem(storageKey);
    let claimedStates = { bio: false, login: false, mentor: false };
    
    if (storedState) {
      try { claimedStates = JSON.parse(storedState); } catch (e) {}
    }

    let totalAddedXp = 0;
    let totalAddedCoins = 0;
    const claimedIds: string[] = [];

    claimable.forEach((m) => {
      totalAddedXp += m.rewardXp;
      totalAddedCoins += m.rewardCoins;
      claimedIds.push(m.id);

      if (m.id === "bio_mcqs") claimedStates.bio = true;
      if (m.id === "streak_login") claimedStates.login = true;
      if (m.id === "medisense_consult") claimedStates.mentor = true;
    });

    localStorage.setItem(storageKey, JSON.stringify(claimedStates));

    // Calculate updated coins/XP
    const finalXp = user.xp + totalAddedXp;
    const finalCoins = (user.coins || 100) + totalAddedCoins;
    const nextLevel = Math.max(user.level, Math.floor(finalXp / 500) + 1);

    const updates: Partial<UserProfile> = {
      xp: finalXp,
      coins: finalCoins,
      level: nextLevel,
    };

    if (nextLevel > user.level) {
      updates.rank = nextLevel >= 8 ? "Elite" : nextLevel >= 4 ? "Scholar" : "Freshman";
    }

    await updateProfileInFirebase(updates);

    const batchTitle = isBn 
      ? `একসাথে ${claimable.length}টি মিশন সফলভাবে সম্পন্ন! 🎉`
      : `Successfully claimed ${claimable.length} missions at once! 🎉`;

    setShowRewardModal({ xp: totalAddedXp, coins: totalAddedCoins, title: batchTitle });

    // Refresh layout state immediately
    setMissions((prev) =>
      prev.map((m) => (claimedIds.includes(m.id) ? { ...m, claimed: true } : m))
    );
  };

  const handleSimulateGrind = () => {
    // Manually increment solve counter to let users complete and test right away
    const todayStr = getTodayKey();
    const bioSolvedKey = `medibridge_bio_solved_${user.uid}_${todayStr}`;
    const currentCount = Number(localStorage.getItem(bioSolvedKey) || "0");
    const newCount = Math.min(5, currentCount + 1);
    localStorage.setItem(bioSolvedKey, String(newCount));

    // Also update overall stats for progress
    updateProfileInFirebase({
      questionsSolved: (user.questionsSolved || 0) + 1,
      questionsCorrect: (user.questionsCorrect || 0) + 1,
    });
  };

  const claimableMissions = missions.filter((m) => m.completed && !m.claimed);

  return (
    <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 relative overflow-hidden shadow-xl" id="hud-daily-missions">
      <div className="absolute top-0 left-6 h-1 w-24 bg-[#C1121F]"></div>
      
      {/* Header */}
      <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-5">
        <div>
          <h3 className="font-extrabold uppercase text-base text-white font-display flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#FFD700] animate-pulse" /> {isBn ? "দৈনিক মিশন কর্নার ⚔️" : "DAILY MISSIONS CORNER"}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">{isBn ? "পড়ার অভ্যাস উন্নত করুন, প্রতিদিনের লক্ষ্য পূরণ করুন এবং র্যাংক বাড়াতে মূল্যবান পুরষ্কার জিতুন।" : "Calibrate study habits, fulfill objectives, and earn precious core materials."}</p>
        </div>
        <span className="text-2xl filter drop-shadow-[0_0_8px_rgba(255,215,0,0.3)]">🛡️⚔️</span>
      </div>

      {/* Claim All Banner for Multiple Finished Missions */}
      {claimableMissions.length >= 2 && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 p-4 bg-gradient-to-r from-emerald-950/40 via-[#C1121F]/10 to-teal-950/40 border border-emerald-500/30 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center border border-emerald-500/35 text-emerald-400 text-xl font-bold">
              🎉
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white uppercase font-display flex items-center gap-2">
                <span>{isBn ? "একাধিক মিশন সম্পন্ন হয়েছে!" : "Multiple Missions Finished!"}</span>
                <span className="bg-emerald-500/10 text-emerald-400 font-bold font-mono px-2 py-0.5 rounded text-[10px] border border-emerald-500/20 animate-pulse">
                  {claimableMissions.length} READY
                </span>
              </h4>
              <p className="text-[10px] text-gray-400 mt-1 leading-normal">
                {isBn 
                  ? `আপনি একসাথে ${claimableMissions.length}টি লাইভ মিশনের সব লক্ষ্য সম্পন্ন করেছেন!` 
                  : `You finished all objectives for ${claimableMissions.length} active trials simultaneously!`
                }
              </p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleClaimAll}
            className="w-full md:w-auto px-5 py-2.5 text-[10px] font-display font-black uppercase tracking-wider rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)] border-b-2 border-emerald-700 cursor-pointer flex items-center justify-center gap-2 font-bold shrink-0 min-h-[44px]"
          >
            <Sparkles className="w-4 h-4 text-black animate-pulse" />
            <span>{isBn ? "একত্রে সব দাবি করুন" : "CLAIM ALL REWARDS"}</span>
          </motion.button>
        </motion.div>
      )}

      {/* Missions Grid */}
      <div className="flex flex-col gap-4">
        {missions.map((mission) => {
          const progressPct = Math.min(100, Math.round((mission.currentCount / mission.targetCount) * 100));
          return (
            <div
              key={mission.id}
              className={`p-4 sm:p-5 rounded-xl border relative transition-all duration-300 ${
                mission.claimed
                  ? "bg-black/20 border-white/5 opacity-60"
                  : mission.completed
                  ? "bg-emerald-950/10 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                  : "bg-black/35 border-white/10 hover:border-white/20"
              }`}
            >
              {/* Mission Row */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Visual Icon and details */}
                <div className="flex items-start gap-3 sm:gap-4 flex-1">
                  <div className="text-2xl mt-0.5 shrink-0 p-2.5 sm:p-3 bg-black/40 rounded-xl border border-white/5 select-none">{mission.icon}</div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-xs sm:text-sm uppercase text-white font-display flex flex-wrap items-center gap-1.5">
                      {mission.title}
                      {mission.completed && !mission.claimed && (
                        <span className="text-[9px] sm:text-[10px] bg-emerald-500/10 text-emerald-400 font-bold font-mono px-2 py-0.5 rounded border border-emerald-500/20">
                          {isBn ? "প্রস্তুত" : "READY"}
                        </span>
                      )}
                      {mission.claimed && (
                        <span className="text-[9px] sm:text-[10px] bg-white/5 text-gray-400 font-bold font-mono px-2 py-0.5 rounded border border-white/5">
                          {isBn ? "সংগৃহীত" : "CLAIMED"}
                        </span>
                      )}
                    </h4>
                    <p className="text-[10px] sm:text-xs text-gray-400 mt-1 leading-normal">
                      {mission.description}
                    </p>

                    {/* Rewards indicator */}
                    <div className="flex items-center gap-3 mt-2 sm:mt-2.5 font-mono text-[10px] sm:text-xs text-[#FFD700] font-black">
                      <div className="flex items-center gap-1">
                        <Gem className="w-3.5 h-3.5 text-[#FFD700]" />
                        <span>+{mission.rewardXp} XP</span>
                      </div>
                      <div className="flex items-center gap-1 text-[#FFD700]">
                        <Coins className="w-3.5 h-3.5" />
                        <span>+{mission.rewardCoins} {isBn ? "গোল্ড" : "Golds"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Claim Buttons / Progression Action CTA */}
                <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 border-t md:border-t-0 border-white/5 pt-3 md:pt-0 shrink-0">
                  <div className="text-left md:text-right">
                    <span className="text-[9px] sm:text-[10px] text-gray-400 font-mono block">{isBn ? "অগ্রগতি রেকর্ড" : "PROGRESSION"}</span>
                    <span className="text-xs sm:text-sm font-mono text-white font-black">
                      {mission.currentCount} / {mission.targetCount}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    {mission.claimed ? (
                      <button disabled className="px-3.5 py-1.5 text-[10px] font-mono font-bold uppercase rounded-lg bg-white/5 border border-white/5 text-gray-500 min-h-[44px] flex items-center justify-center animate-none">
                        {isBn ? "সংগৃহীত" : "SECURED"}
                      </button>
                    ) : mission.completed ? (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleClaim(mission.id)}
                        className="px-4 py-2 text-[10px] font-display font-black uppercase tracking-wider rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black shadow-[0_0_15px_rgba(16,185,129,0.3)] border-b-2 border-emerald-700 cursor-pointer min-h-[44px] flex items-center justify-center font-bold"
                      >
                        {isBn ? "পুরস্কার নিন 💎" : "CLAIM REWARD 💎"}
                      </motion.button>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        {mission.id === "bio_mcqs" ? (
                          <>
                            <button
                              onClick={() => setShowQuickDrill(true)}
                              className="px-2.5 py-1.5 text-[9px] font-mono font-bold uppercase rounded-lg bg-[#FFD700]/10 border border-[#FFD700]/20 text-[#FFD700] hover:bg-[#FFD700]/25 transition min-h-[44px] flex items-center justify-center cursor-pointer"
                              title={isBn ? "বায়োলজি কুইজ খেলুন" : "Open quick Biology micro drill"}
                            >
                              {isBn ? "কুইক ড্রিল" : "QUICK DRILL"}
                            </button>
                            <button
                              onClick={() => setActiveTab("practice")}
                              className="px-2.5 py-1.5 text-[9px] font-mono font-bold uppercase rounded-lg bg-[#C1121F]/10 border border-[#C1121F]/20 text-white hover:bg-[#C1121F]/25 transition flex items-center gap-1 min-h-[44px] cursor-pointer"
                            >
                              <Play className="w-2.5 h-2.5 fill-current" /> {isBn ? "এরেনা" : "ARENA"}
                            </button>
                          </>
                        ) : mission.id === "medisense_consult" ? (
                          <button
                            onClick={handleConsultAiMission}
                            className="px-2.5 py-1.5 text-[9px] font-mono font-bold uppercase rounded-lg bg-red-950/20 border border-[#C1121F]/30 text-[#C1121F] hover:bg-red-950/40 hover:text-[#FFD700] transition-all duration-300 min-h-[44px] flex items-center justify-center cursor-pointer"
                          >
                            {isBn ? "মেন্টর ডাকুন 🤖" : "LAUNCH ADVISOR 🤖"}
                          </button>
                        ) : (
                          <span className="text-[10px] text-gray-400 font-mono font-bold min-h-[44px] flex items-center justify-center">{isBn ? "লকড" : "LOCKED"}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress Slider Bar Segmented for Multiple Steps */}
              <div className="mt-4 pt-3 border-t border-white/5">
                <div className="flex justify-between items-center mb-2 text-[10px] font-mono">
                  <span className="text-gray-400 uppercase tracking-widest font-bold">{isBn ? "অভ্যাস সূচক" : "habits index"}</span>
                  <span className="text-white font-extrabold">{isBn ? `${progressPct}% সম্পন্ন` : `${progressPct}% completed`}</span>
                </div>

                {mission.targetCount > 1 ? (
                  /* STEPS SEGMENTED PROGRESS TRACKER BAR */
                  <div className="flex items-center gap-2">
                    {Array.from({ length: mission.targetCount }).map((_, stepIdx) => {
                      const isStepCompleted = mission.currentCount > stepIdx;
                      const isCurrentStep = mission.currentCount === stepIdx && !mission.completed;
                      
                      return (
                        <div key={stepIdx} className="flex-1 flex flex-col gap-1.5">
                          {/* Individual step segment segment */}
                          <div
                            className={`h-2.5 rounded-md relative overflow-hidden transition-all duration-500 border ${
                              mission.claimed
                                ? "bg-gray-800/40 border-white/5"
                                : isStepCompleted
                                ? "bg-gradient-to-r from-emerald-500 to-teal-400 border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                                : isCurrentStep
                                ? "bg-[#C1121F]/30 border-[#C1121F]/60 animate-pulse"
                                : "bg-black/50 border-white/5"
                            }`}
                          >
                            {/* Inner filler animation */}
                            {isStepCompleted && (
                              <motion.div
                                initial={{ x: "-100%" }}
                                animate={{ x: "0%" }}
                                transition={{ duration: 0.4, delay: stepIdx * 0.1 }}
                                className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-300 opacity-90"
                              />
                            )}
                          </div>
                          
                          {/* Step Number label */}
                          <span
                            className={`text-center font-mono text-[9px] font-black leading-none py-1 rounded transition-colors duration-300 ${
                              mission.claimed
                                ? "text-gray-600"
                                : isStepCompleted
                                ? "text-emerald-400"
                                : isCurrentStep
                                ? "text-[#FFD700] bg-[#FFD700]/5 border border-[#FFD700]/10"
                                : "text-gray-500"
                            }`}
                          >
                            {isBn ? `ধাপ ${stepIdx + 1}` : `STEP ${stepIdx + 1}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Standard single action indicator bar */
                  <div className="w-full bg-black/50 h-2.5 rounded-md overflow-hidden border border-white/5 relative">
                    <div
                      className={`h-full transition-all duration-500 rounded-md ${
                        mission.claimed
                          ? "bg-gray-700"
                          : mission.completed
                          ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                          : "bg-red-800/30 animate-pulse"
                      }`}
                      style={{ width: `${progressPct}%` }}
                    >
                      {mission.completed && (
                        <motion.div
                          initial={{ left: "-100%" }}
                          animate={{ left: "100%" }}
                          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                          className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* QUICK DRILL MODAL (Biology question) */}
      <AnimatePresence>
        {showQuickDrill && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#111111] border border-white/10 max-w-md w-full rounded-2xl p-6 relative shadow-2xl"
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-[#C1121F]"></div>
              
              <h3 className="font-extrabold uppercase text-sm text-white font-display flex items-center gap-2 mb-4">
                🧬 MID-RANGE BIOLOGY RAPID DRILL
              </h3>

              <p className="text-xs text-white leading-relaxed font-sans mb-5 font-medium bg-black/40 p-4 rounded-xl border border-white/5">
                {drillQuestion.text}
              </p>

              <div className="flex flex-col gap-2 mb-5">
                {drillQuestion.options.map((option, idx) => {
                  const isSelected = selectedOption === idx;
                  let optionClass = "bg-black/30 border-white/10 text-gray-300 hover:bg-white/5";
                  
                  if (isSelected) {
                    optionClass = "bg-[#C1121F]/15 border-[#C1121F] text-white";
                  }
                  if (drillAnswered) {
                    if (idx === drillQuestion.correctIndex) {
                      optionClass = "bg-emerald-500/10 border-emerald-500 text-emerald-400";
                    } else if (isSelected) {
                      optionClass = "bg-rose-500/10 border-rose-500 text-rose-400";
                    }
                  }

                  return (
                    <button
                      key={idx}
                      disabled={drillAnswered}
                      onClick={() => setSelectedOption(idx)}
                      className={`p-3 rounded-xl border text-left text-xs font-semibold transition flex justify-between items-center ${optionClass}`}
                    >
                      <span>{option}</span>
                      {drillAnswered && idx === drillQuestion.correctIndex && (
                        <span className="text-[9px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">CORRECT</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {drillAnswered ? (
                <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-[11px] leading-relaxed text-gray-300 mb-5 font-sans">
                  <span className="font-bold text-[#FFD700] block mb-1">💡 MEDISENSE EXPLANATION</span>
                  {drillQuestion.explanation}
                  {drillCorrect && (
                    <span className="block mt-2 font-mono text-[10px] text-emerald-400 font-bold">
                      🎉 +1 Bio MCQ Progress logged & +30 XP credited!
                    </span>
                  )}
                </div>
              ) : null}

              <div className="flex justify-end gap-2 text-xs font-mono font-bold">
                <button
                  onClick={() => {
                    setShowQuickDrill(false);
                    setDrillAnswered(false);
                    setDrillCorrect(null);
                    setSelectedOption(null);
                  }}
                  className="px-4 py-2 text-gray-500 hover:text-white transition uppercase font-display"
                >
                  {drillAnswered ? "CLOSE" : "ABORT"}
                </button>
                {!drillAnswered && (
                  <button
                    disabled={selectedOption === null}
                    onClick={handleDrillSubmit}
                    className="px-5 py-2.5 bg-[#C1121F] hover:bg-red-700 disabled:opacity-30 text-white rounded-xl uppercase font-display"
                  >
                    SUBMIT SIGNAL
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CLAIM REWARD FLASHER MODAL */}
      <AnimatePresence>
        {showRewardModal && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-lg z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0, rotate: -2 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-[#111111] border-2 border-[#FFD700] max-w-sm w-full rounded-3xl p-8 text-center relative shadow-[0_0_50px_rgba(255,215,0,0.2)]"
            >
              {/* Star sparkles */}
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-5xl animate-bounce">
                👑⭐
              </div>
              
              <h3 className="font-extrabold uppercase text-lg text-[#FFD700] font-display tracking-wide mb-2 mt-2">
                MISSION ACCOMPLISHED
              </h3>
              <p className="text-[11.5px] text-gray-400 mb-6 uppercase font-mono tracking-widest font-extrabold">
                {showRewardModal.title}
              </p>

              <div className="flex justify-center gap-6 mb-8 font-sans">
                <div className="bg-yellow-950/20 border border-[#FFD700]/30 p-4 rounded-2xl flex flex-col items-center justify-center w-24">
                  <span className="text-2xl mb-1">💎</span>
                  <span className="font-black text-sm text-white font-mono">+{showRewardModal.xp} XP</span>
                </div>
                <div className="bg-yellow-950/20 border border-[#FFD700]/30 p-4 rounded-2xl flex flex-col items-center justify-center w-24">
                  <span className="text-2xl mb-1">🪙</span>
                  <span className="font-black text-sm text-white font-mono">+{showRewardModal.coins} Golds</span>
                </div>
              </div>

              <p className="text-xs text-gray-400 leading-relaxed mb-6 font-medium">
                Rewards have been synchronized with your live secure MediBridge profile dossier. Keep grinding core chapters.
              </p>

              <button
                onClick={() => setShowRewardModal(null)}
                className="w-full py-3 bg-[#FFD700] text-black font-black uppercase text-xs tracking-wider rounded-xl hover:bg-yellow-500 shadow-lg shadow-[#FFD700]/10 transition duration-300 font-display"
              >
                DISMISS TRANSMISSION
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
