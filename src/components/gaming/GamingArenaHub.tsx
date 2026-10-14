import React, { useState, useEffect } from "react";
import { db } from "../../lib/backend";
import { doc, getDoc, getDocs, collection, query, limit } from "../../lib/supabaseDb";
import { Question, UserProfile } from "../../types";
import {
  MEDICAL_GAMES,
  GameMetadata,
  GameScoreResult,
  INITIAL_ACHIEVEMENTS,
  INITIAL_DAILY_MISSIONS,
  GameAchievement,
  DailyGamingMission,
} from "./gamingData";
import MedRunnerGame from "./games/MedRunnerGame";
import BioSliceGame from "./games/BioSliceGame";
import MedRaceGame from "./games/MedRaceGame";
import MedCricketGame from "./games/MedCricketGame";
import MedSoccerGame from "./games/MedSoccerGame";
import CellClashGame from "./games/CellClashGame";
import SpeedDrillGame from "./games/SpeedDrillGame";
import MedMemoryGame from "./games/MedMemoryGame";
import ClinicalERGame from "./games/ClinicalERGame";
import MedWordGame from "./games/MedWordGame";
import GamingLeaderboard from "./GamingLeaderboard";
import DailyGamingMissions from "./DailyGamingMissions";
import ExternalGamingWebModal, { ExternalWebGameConfig, DEFAULT_EXTERNAL_GAME } from "./ExternalGamingWebModal";
import { getOptimizedCache, setOptimizedCache } from "../../lib/quotaOptimizer";
import { playSound } from "../../audio";
import {
  Gamepad2,
  Trophy,
  Flame,
  Zap,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Star,
  Award,
  Crown,
  Globe,
  ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface GamingArenaHubProps {
  courseId: string;
  courseName: string;
  questions: Question[];
  userProfile?: UserProfile | null;
  language: "bn" | "en";
  onAddToMistakeBank?: (question: Question) => void;
  onUpdateUserStats?: (xpGained: number, coinsGained: number) => void;
}

export default function GamingArenaHub({
  courseId,
  courseName,
  questions,
  userProfile,
  language,
  onAddToMistakeBank,
  onUpdateUserStats,
}: GamingArenaHubProps) {
  const isBn = language === "bn";
  const [activeTab, setActiveTab] = useState<"games" | "leaderboard" | "missions">("games");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [recentResult, setRecentResult] = useState<GameScoreResult | null>(null);

  // External Web Game State
  const [showExternalWebModal, setShowExternalWebModal] = useState(false);
  const [externalWebConfig, setExternalWebConfig] = useState<ExternalWebGameConfig>(() => {
    try {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("mb_gaming_external_web");
        if (saved) return JSON.parse(saved);
      }
    } catch {}
    return DEFAULT_EXTERNAL_GAME;
  });

  // Local Arena State
  const [arenaXp, setArenaXp] = useState(userProfile?.xp || 2450);
  const [arenaCoins, setArenaCoins] = useState(userProfile?.goldCoins || userProfile?.coins || 680);
  const [arenaStreak, setArenaStreak] = useState(userProfile?.dailyStreak || 5);
  const [achievements, setAchievements] = useState<GameAchievement[]>(INITIAL_ACHIEVEMENTS);
  const [missions, setMissions] = useState<DailyGamingMission[]>(INITIAL_DAILY_MISSIONS);
  const [gamingSettings, setGamingSettings] = useState<any>(null);
  const [customGameQuestions, setCustomGameQuestions] = useState<Question[]>([]);

  // Load custom game questions set by admin (with aggressive multi-tier cache to minimize free db reads)
  useEffect(() => {
    // 1. Try cache first (0 reads!)
    const cachedQuestions = getOptimizedCache<Question[]>("gaming_arena_custom_questions");
    if (cachedQuestions && cachedQuestions.length > 0) {
      setCustomGameQuestions(cachedQuestions);
      return;
    }

    try {
      getDocs(query(collection(db, "game_questions"), limit(50)))
        .then((snap) => {
          const customList: Question[] = [];
          snap.forEach((docSnap) => {
            const d = docSnap.data();
            if (d.isActive !== false) {
              customList.push({
                id: docSnap.id,
                questionText: d.questionText || d.question || "",
                options: d.options || [],
                correctAnswerIndex: d.correctAnswerIndex ?? d.correctAnswer ?? 0,
                explanation: d.explanation || "",
                subject: d.subject || "Biology",
                chapter: d.chapter || "General",
                difficulty: (d.difficulty === "Easy" || d.difficulty === "Hard" ? d.difficulty : "Medium"),
              });
            }
          });
          setCustomGameQuestions(customList);
          // Cache for 15 minutes (saves 50 reads on subsequent views)
          setOptimizedCache("gaming_arena_custom_questions", customList, 15 * 60 * 1000);
        })
        .catch((err) => {
          console.warn("Could not fetch game_questions:", err);
        });
    } catch (e) {
      console.warn("game_questions error:", e);
    }
  }, []);

  // Effective questions passed into games (custom admin questions first, then standard questions)
  const effectiveQuestions = customGameQuestions.length > 0 
    ? [...customGameQuestions, ...questions] 
    : questions;

  // Load Gaming Arena Control settings with 15-minute quota cache
  useEffect(() => {
    // Try cache first (0 reads!)
    const cachedSettings = getOptimizedCache<any>("gaming_arena_settings");
    if (cachedSettings) {
      setGamingSettings(cachedSettings);
      if (cachedSettings.externalWebGame) {
        setExternalWebConfig(cachedSettings.externalWebGame);
      }
      return;
    }

    try {
      getDoc(doc(db, "settings", "gaming_arena"))
        .then((snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setGamingSettings(data);
            setOptimizedCache("gaming_arena_settings", data, 15 * 60 * 1000);
            if (data.externalWebGame) {
              setExternalWebConfig(data.externalWebGame);
              try {
                localStorage.setItem("mb_gaming_external_web", JSON.stringify(data.externalWebGame));
              } catch {}
            }
          }
        })
        .catch((err) => {
          console.warn("Could not fetch gaming arena settings:", err);
        });
    } catch (e) {
      console.warn("Gaming settings error:", e);
    }
  }, []);

  const handleSaveExternalWebConfig = (updated: ExternalWebGameConfig) => {
    setExternalWebConfig(updated);
    try {
      localStorage.setItem("mb_gaming_external_web", JSON.stringify(updated));
    } catch {}
    // Invalidate and re-cache
    setOptimizedCache("gaming_arena_settings", { ...(gamingSettings || {}), externalWebGame: updated }, 15 * 60 * 1000);
  };

  // Filter games
  const filteredGames = MEDICAL_GAMES.filter((g) => {
    const matchesCat = selectedCategory === "all" || g.category === selectedCategory;
    if (!searchQuery.trim()) return matchesCat;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (g.title || "").toLowerCase().includes(q) ||
      (g.titleBn || "").toLowerCase().includes(q) ||
      (g.description || "").toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  const handleLaunchGame = (gameId: string) => {
    playSound("click");
    setRecentResult(null);
    setActiveGameId(gameId);
  };

  const handleFinishGame = (result: GameScoreResult) => {
    const xpMult = (gamingSettings?.games?.[result.gameId]?.xpMultiplier || 1.0) * (gamingSettings?.globalXpMultiplier || 1.0);
    const coinMult = (gamingSettings?.globalCoinMultiplier || 1.0);
    const calculatedXp = Math.round(result.xpEarned * xpMult);
    const calculatedCoins = Math.round(result.coinsEarned * coinMult);

    const enrichedResult: GameScoreResult = {
      ...result,
      xpEarned: calculatedXp,
      coinsEarned: calculatedCoins,
    };

    setRecentResult(enrichedResult);
    setArenaXp((prev) => prev + calculatedXp);
    setArenaCoins((prev) => prev + calculatedCoins);

    if (onUpdateUserStats) {
      onUpdateUserStats(calculatedXp, calculatedCoins);
    }

    // Add wrong answers to mistake bank automatically
    if (onAddToMistakeBank && result.mistakes.length > 0) {
      result.mistakes.forEach((m) => onAddToMistakeBank(m.question));
    }

    // Update mission progress
    setMissions((prev) =>
      prev.map((m) => {
        if (m.targetGame === result.gameId || m.targetGame === "any") {
          return {
            ...m,
            currentCount: Math.min(m.targetCount, m.currentCount + 1),
          };
        }
        return m;
      })
    );

    setActiveGameId(null);
  };

  const handleClaimMission = (missionId: string) => {
    const targetMission = missions.find((m) => m.id === missionId);
    if (!targetMission || targetMission.completed) return;

    setArenaXp((x) => x + targetMission.rewardXp);
    setArenaCoins((c) => c + targetMission.rewardCoins);

    setMissions((prev) =>
      prev.map((m) => (m.id === missionId ? { ...m, completed: true } : m))
    );
  };

  const handleClaimAchievement = (achId: string) => {
    const targetAch = achievements.find((a) => a.id === achId);
    if (!targetAch || !targetAch.unlocked) return;

    setArenaXp((x) => x + targetAch.rewardXp);
    setArenaCoins((c) => c + targetAch.rewardCoins);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Active Game Modal Screen */}
      {activeGameId && (
        <div className="relative">
          {activeGameId === "med-runner" && (
            <MedRunnerGame
              questions={effectiveQuestions}
              language={language}
              courseName={courseName}
              onFinishGame={handleFinishGame}
              onExit={() => setActiveGameId(null)}
            />
          )}
          {activeGameId === "bio-slice" && (
            <BioSliceGame
              questions={effectiveQuestions}
              language={language}
              courseName={courseName}
              onFinishGame={handleFinishGame}
              onExit={() => setActiveGameId(null)}
            />
          )}
          {activeGameId === "med-race" && (
            <MedRaceGame
              questions={effectiveQuestions}
              language={language}
              courseName={courseName}
              onFinishGame={handleFinishGame}
              onExit={() => setActiveGameId(null)}
            />
          )}
          {activeGameId === "med-cricket" && (
            <MedCricketGame
              questions={effectiveQuestions}
              language={language}
              courseName={courseName}
              onFinishGame={handleFinishGame}
              onExit={() => setActiveGameId(null)}
            />
          )}
          {activeGameId === "med-soccer" && (
            <MedSoccerGame
              questions={effectiveQuestions}
              language={language}
              courseName={courseName}
              onFinishGame={handleFinishGame}
              onExit={() => setActiveGameId(null)}
            />
          )}
          {activeGameId === "cell-clash" && (
            <CellClashGame
              questions={effectiveQuestions}
              language={language}
              courseName={courseName}
              onFinishGame={handleFinishGame}
              onExit={() => setActiveGameId(null)}
            />
          )}
          {activeGameId === "speed-drill" && (
            <SpeedDrillGame
              questions={effectiveQuestions}
              language={language}
              courseName={courseName}
              onFinishGame={handleFinishGame}
              onExit={() => setActiveGameId(null)}
            />
          )}
          {activeGameId === "med-memory" && (
            <MedMemoryGame
              questions={effectiveQuestions}
              language={language}
              courseName={courseName}
              onFinishGame={handleFinishGame}
              onExit={() => setActiveGameId(null)}
            />
          )}
          {activeGameId === "clinical-er" && (
            <ClinicalERGame
              questions={effectiveQuestions}
              language={language}
              courseName={courseName}
              onFinishGame={handleFinishGame}
              onExit={() => setActiveGameId(null)}
            />
          )}
          {activeGameId === "med-word" && (
            <MedWordGame
              questions={effectiveQuestions}
              language={language}
              courseName={courseName}
              onFinishGame={handleFinishGame}
              onExit={() => setActiveGameId(null)}
            />
          )}
        </div>
      )}

      {/* Main Arena View when not in active game */}
      {!activeGameId && (
        <div className="space-y-6">
          {/* Arena Hero Banner with Live Gamer Profile */}
          <div className="relative rounded-3xl bg-gradient-to-r from-[#120D24] via-[#0A0E1A] to-[#0A1612] border border-[#FFD700]/30 p-6 sm:p-8 overflow-hidden shadow-2xl">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-[11px] font-mono font-black uppercase tracking-wider rounded-xl shadow-md flex items-center gap-1.5">
                    <Gamepad2 className="w-3.5 h-3.5" />
                    <span>{isBn ? "মেডিকেল গেমিং অ্যারেনা" : "MEDICAL GAMING ARENA"}</span>
                  </span>
                  <span className="text-xs font-mono text-gray-400 hidden sm:inline">
                    • {courseName}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white uppercase tracking-tight font-display">
                  {isBn ? "খেলো • শেখো • জয় করো" : "PLAY • LEARN • DOMINATE"}
                </h1>
                <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                  {isBn
                    ? "মেডিকেল ভর্তি পরীক্ষার সম্পূর্ণ সিলেবাস এখন গেমের ভেতর! ১০+ হাই-স্পিড গেমে অংশ নিয়ে র‍্যাংক বাড়াও, কয়েন আর্ন করো ও মিসটেক ব্যাংক শক্তিশালী করো।"
                    : "Gamified admission prep engineered for clinical mastery! Conquer 10+ medical arcade games, unlock achievements, and climb batch leaderboards."}
                </p>
              </div>

              {/* Live Gamer Stats Pill Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full lg:w-auto font-mono">
                <div className="bg-black/60 border border-[#FFD700]/40 p-3.5 rounded-2xl flex items-center gap-3 shadow-lg">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-xl shrink-0">
                    ⚡
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase block leading-none">ARENA XP</span>
                    <span className="text-base font-black text-[#FFD700]">+{arenaXp}</span>
                  </div>
                </div>

                <div className="bg-black/60 border border-amber-500/30 p-3.5 rounded-2xl flex items-center gap-3 shadow-lg">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-xl shrink-0">
                    🪙
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase block leading-none">MED COINS</span>
                    <span className="text-base font-black text-amber-300">{arenaCoins}</span>
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1 bg-black/60 border border-orange-500/30 p-3.5 rounded-2xl flex items-center gap-3 shadow-lg">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-xl shrink-0">
                    🔥
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase block leading-none">STREAK</span>
                    <span className="text-base font-black text-orange-400">{arenaStreak} Days</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 pt-6 mt-6 border-t border-white/10 overflow-x-auto">
              <button
                onClick={() => {
                  playSound("click");
                  setActiveTab("games");
                }}
                className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition cursor-pointer shrink-0 ${
                  activeTab === "games"
                    ? "bg-[#FFD700] text-black shadow-lg"
                    : "bg-black/40 text-gray-300 hover:text-white hover:bg-white/10"
                }`}
              >
                <Gamepad2 className="w-4 h-4" />
                <span>{isBn ? "সব গেম তালিকা (১০+)" : "Game Arcades (10+)"}</span>
              </button>

              <button
                onClick={() => {
                  playSound("click");
                  setActiveTab("leaderboard");
                }}
                className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition cursor-pointer shrink-0 ${
                  activeTab === "leaderboard"
                    ? "bg-[#FFD700] text-black shadow-lg"
                    : "bg-black/40 text-gray-300 hover:text-white hover:bg-white/10"
                }`}
              >
                <Trophy className="w-4 h-4" />
                <span>{isBn ? "ব্যাচ লিডারবোর্ড" : "Batch Leaderboard"}</span>
              </button>

              <button
                onClick={() => {
                  playSound("click");
                  setActiveTab("missions");
                }}
                className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition cursor-pointer shrink-0 ${
                  activeTab === "missions"
                    ? "bg-[#FFD700] text-black shadow-lg"
                    : "bg-black/40 text-gray-300 hover:text-white hover:bg-white/10"
                }`}
              >
                <Award className="w-4 h-4" />
                <span>{isBn ? "মিশন ও মেডেল" : "Missions & Medals"}</span>
              </button>

              <button
                onClick={() => {
                  playSound("click");
                  setShowExternalWebModal(true);
                }}
                className="px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition cursor-pointer shrink-0 bg-gradient-to-r from-purple-900/60 to-red-900/60 hover:from-purple-800 hover:to-red-800 border border-purple-500/40 text-purple-200 hover:text-white shadow-md ml-auto"
              >
                <Globe className="w-4 h-4 text-[#FFD700] animate-spin-slow" />
                <span>{isBn ? "🌐 আলাদা ওয়েব গেম" : "🌐 External Web Portal"}</span>
              </button>
            </div>
          </div>

          {/* Arena Master Maintenance Alert if disabled by Admin in Command Center */}
          {gamingSettings?.masterEnabled === false && (
            <div className="bg-red-950/80 border border-red-500/50 rounded-2xl p-6 text-center space-y-2 shadow-2xl">
              <div className="text-3xl">⚠️</div>
              <h3 className="text-lg font-bold text-red-300 uppercase font-mono">
                {isBn ? "গেমিং অ্যারেনা সাময়িক রক্ষণাবেক্ষণে রয়েছে" : "Gaming Arena Under Scheduled Maintenance"}
              </h3>
              <p className="text-xs text-gray-300 max-w-xl mx-auto">
                {isBn 
                  ? (gamingSettings?.maintenanceMessageBn || "গেমিং অ্যারেনায় বর্তমানে সার্ভার আপগ্রেড চলছে। খুব শীঘ্রই গেমগুলো পুনরায় চালু হবে!")
                  : (gamingSettings?.maintenanceMessageEn || "Gaming Arena is undergoing scheduled server optimization. Check back shortly!")}
              </p>
            </div>
          )}

          {/* Event Booster Banner if Active */}
          {gamingSettings?.masterEnabled !== false && (gamingSettings?.doubleXpEventActive || gamingSettings?.eventBannerTextBn) && (
            <div className="bg-gradient-to-r from-amber-950/90 via-orange-950/80 to-purple-950/90 border border-[#FFD700]/50 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xl shrink-0 animate-bounce">
                  🔥
                </div>
                <div>
                  <h4 className="text-xs font-black text-[#FFD700] uppercase font-mono tracking-wide flex items-center gap-2">
                    <span>{isBn ? "স্পেশাল এরেনা বুস্টার ইভেন্ট" : "ARENA BOOSTER EVENT LIVE"}</span>
                    {gamingSettings?.globalXpMultiplier > 1 && (
                      <span className="px-2 py-0.5 bg-amber-400 text-black text-[9px] font-black rounded-md">
                        {gamingSettings.globalXpMultiplier}x XP ACTIVE
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-gray-200 mt-0.5 font-sans">
                    {isBn ? (gamingSettings.eventBannerTextBn || "ডাবল XP ও বোনাস কয়েন ইভেন্ট চলছে!") : (gamingSettings.eventBannerTextEn || "Double XP & Bonus Coins active across all games!")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Recent Victory Popup Alert if just finished */}
          {recentResult && (
            <div className="bg-gradient-to-r from-emerald-950/80 to-black border border-emerald-500/50 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-2xl shrink-0">
                  🎉
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white font-mono">
                    {recentResult.gameTitle} {isBn ? "সফলভাবে সমাপ্ত!" : "Victory!"}
                  </h4>
                  <p className="text-xs text-gray-300 font-mono mt-0.5">
                    Score: {recentResult.score} • Accuracy: {recentResult.accuracy}% • +{recentResult.xpEarned} XP • 🪙 +{recentResult.coinsEarned} Coins
                  </p>
                </div>
              </div>

              {recentResult.mistakes.length > 0 && (
                <div className="flex items-center gap-2 text-xs font-mono text-amber-400 bg-amber-950/60 px-3 py-1.5 rounded-xl border border-amber-500/30">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{recentResult.mistakes.length} mistakes saved to Mistake Bank</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 1: GAMES GRID */}
          {activeTab === "games" && (
            <div className="space-y-6">
              {/* Featured External Gaming Web Card */}
              {externalWebConfig?.enabled !== false && (
                <div className="relative rounded-3xl bg-gradient-to-r from-[#170E28] via-[#0D1424] to-[#0A181C] border border-purple-500/40 p-5 sm:p-6 shadow-xl overflow-hidden group">
                  <div className="absolute top-0 right-0 w-80 h-40 bg-purple-600/15 rounded-full blur-2xl pointer-events-none" />
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
                    <div className="flex items-center gap-3.5">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 border border-purple-400/40 flex items-center justify-center text-3xl shadow-lg shrink-0 group-hover:scale-105 transition">
                        🌐
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-[#FFD700] bg-purple-950/80 px-2.5 py-0.5 rounded-full border border-purple-500/30">
                            {isBn ? "আলাদা ওয়েব গেম লিংক" : "EXTERNAL WEB PORTAL"}
                          </span>
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">
                            ● Live
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-white mt-1">
                          {isBn ? externalWebConfig.titleBn : externalWebConfig.titleEn}
                        </h3>
                        <p className="text-xs text-gray-300 max-w-xl line-clamp-2 mt-0.5">
                          {isBn ? externalWebConfig.descriptionBn : externalWebConfig.descriptionEn}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 w-full md:w-auto">
                      <button
                        onClick={() => {
                          playSound("click");
                          setShowExternalWebModal(true);
                        }}
                        className="flex-1 md:flex-none px-5 py-2.5 bg-gradient-to-r from-[#FFD700] to-amber-500 text-black font-mono font-bold text-xs uppercase rounded-xl hover:scale-105 transition flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{isBn ? "ওয়েব প্লেয়ারে খেলুন" : "Play Web Portal"}</span>
                      </button>
                      <button
                        onClick={() => {
                          playSound("click");
                          try {
                            window.open(externalWebConfig.url, "_blank", "noopener,noreferrer");
                          } catch {
                            window.location.href = externalWebConfig.url;
                          }
                        }}
                        className="px-3.5 py-2.5 bg-white/10 hover:bg-white/15 text-white font-mono text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                        title={isBn ? "নতুন ট্যাবে খুলুন" : "Open in new tab"}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{isBn ? "নতুন ট্যাব" : "New Tab"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Category Filter Pills & Search */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Categories */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  {[
                    { id: "all", label: isBn ? "সকল" : "All" },
                    { id: "action", label: isBn ? "অ্যাকশন ও স্প্রিন্ট" : "Action" },
                    { id: "racing", label: isBn ? "রেসিং" : "Racing" },
                    { id: "sports", label: isBn ? "স্পোর্টস" : "Sports" },
                    { id: "battle", label: isBn ? "বস রেইড" : "Boss Battle" },
                    { id: "puzzle", label: isBn ? "পাজল ও মেমোরি" : "Puzzle" },
                    { id: "clinical", label: isBn ? "ক্লিনিক্যাল সিম" : "Clinical" },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        playSound("click");
                        setSelectedCategory(cat.id);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition shrink-0 cursor-pointer ${
                        selectedCategory === cat.id
                          ? "bg-white text-black shadow-md"
                          : "bg-black/50 text-gray-400 hover:text-white border border-white/5"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Search box */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={isBn ? "গেম খুঁজুন..." : "Search games..."}
                    className="w-full bg-black/60 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>

              {/* Games Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {filteredGames.map((game) => {
                  const gameSetting = gamingSettings?.games?.[game.id];
                  const isGameEnabled = gameSetting?.enabled !== false && gamingSettings?.masterEnabled !== false;
                  const displayXpMult = (gameSetting?.xpMultiplier ?? game.xpMultiplier ?? 1.0) * (gamingSettings?.globalXpMultiplier || 1.0);
                  const displayCoins = (gameSetting?.coinReward ?? game.coinReward ?? 40) * (gamingSettings?.globalCoinMultiplier || 1.0);
                  const displayTitle = isBn ? (gameSetting?.titleBn || game.titleBn) : (gameSetting?.title || game.title);
                  const displaySubtitle = isBn ? (gameSetting?.subtitleBn || game.subtitleBn) : (gameSetting?.subtitle || game.subtitle);
                  const displayDesc = isBn ? (gameSetting?.descriptionBn || game.descriptionBn) : (gameSetting?.description || game.description);
                  const displayDifficulty = gameSetting?.difficulty || game.difficulty;
                  const displayCategory = gameSetting?.category || game.category;
                  const displayIcon = gameSetting?.icon || game.icon;
                  const customIconUrl = gameSetting?.customIconUrl;
                  const customBannerUrl = gameSetting?.customBannerUrl;
                  const badgeColor = gameSetting?.badgeColor || game.badgeColor || "from-amber-500 to-orange-700";
                  const isFeatured = gameSetting?.featured ?? game.featured;
                  const isPopular = gameSetting?.popular ?? game.popular;

                  return (
                    <div
                      key={game.id}
                      className={`group rounded-3xl bg-[#0A0E17] border transition-all duration-300 p-5 flex flex-col justify-between relative overflow-hidden shadow-lg ${
                        isGameEnabled 
                          ? "border-white/10 hover:border-amber-500/50 hover:shadow-[0_0_25px_rgba(245,158,11,0.2)] hover:-translate-y-1" 
                          : "border-red-500/20 opacity-70"
                      }`}
                    >
                      {/* Custom Backdrop Banner if provided */}
                      {customBannerUrl && (
                        <div
                          className="absolute inset-0 opacity-15 bg-cover bg-center pointer-events-none"
                          style={{ backgroundImage: `url(${customBannerUrl})` }}
                        />
                      )}

                      {/* Background Subtle Gradient Glow */}
                      <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl pointer-events-none opacity-20 group-hover:opacity-40 transition bg-gradient-to-br ${badgeColor}`} />

                      <div>
                        {/* Top Badges */}
                        <div className="flex items-center justify-between gap-2 mb-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-12 h-12 rounded-2xl bg-black/70 border border-white/10 flex items-center justify-center text-2xl shrink-0 overflow-hidden shadow-md group-hover:scale-110 transition transform">
                              {customIconUrl ? (
                                <img
                                  src={customIconUrl}
                                  alt={displayTitle}
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <span>{displayIcon}</span>
                              )}
                            </div>
                            <div>
                              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 block">
                                {displayCategory}
                              </span>
                              <span className="text-[11px] font-mono text-gray-400">
                                {displayDifficulty}
                              </span>
                            </div>
                          </div>

                          {!isGameEnabled ? (
                            <span className="px-2 py-0.5 rounded-md bg-red-950/80 border border-red-500/40 text-red-300 text-[10px] font-mono font-bold uppercase">
                              MAINTENANCE
                            </span>
                          ) : isFeatured ? (
                            <span className="px-2 py-0.5 rounded-md bg-rose-950/80 border border-rose-500/40 text-rose-300 text-[10px] font-mono font-bold uppercase">
                              FEATURED
                            </span>
                          ) : isPopular ? (
                            <span className="px-2 py-0.5 rounded-md bg-amber-950/80 border border-amber-500/40 text-amber-300 text-[10px] font-mono font-bold uppercase">
                              HOT
                            </span>
                          ) : null}
                        </div>

                        {/* Title & Subtitle */}
                        <h3 className="text-base font-bold text-white group-hover:text-[#FFD700] transition">
                          {displayTitle}
                        </h3>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">
                          {displaySubtitle}
                        </p>

                        {/* Description */}
                        <p className="text-xs text-gray-300 mt-2 leading-relaxed line-clamp-2">
                          {displayDesc}
                        </p>
                      </div>

                      {/* Bottom Action Footer */}
                      <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-[11px] font-mono">
                          <span className="text-emerald-400 font-bold">+{displayXpMult.toFixed(1)}x XP</span>
                          <span>•</span>
                          <span className="text-[#FFD700] font-bold">🪙 +{Math.round(displayCoins)}</span>
                        </div>

                        <button
                          onClick={() => isGameEnabled && handleLaunchGame(game.id)}
                          disabled={!isGameEnabled}
                          className={`px-4 py-2 font-mono text-xs font-black uppercase tracking-wider rounded-xl shadow-md flex items-center gap-1.5 transition ${
                            isGameEnabled 
                              ? "bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black cursor-pointer group-hover:scale-105" 
                              : "bg-gray-800 text-gray-500 cursor-not-allowed"
                          }`}
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>{isGameEnabled ? (isBn ? "খেলুন" : "Play") : (isBn ? "বন্ধ আছে" : "Disabled")}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: BATCH LEADERBOARD */}
          {activeTab === "leaderboard" && (
            <GamingLeaderboard
              courseId={courseId}
              courseName={courseName}
              currentUserId={userProfile?.uid}
              language={language}
            />
          )}

          {/* TAB 3: MISSIONS & MEDALS */}
          {activeTab === "missions" && (
            <DailyGamingMissions
              missions={missions}
              achievements={achievements}
              language={language}
              onClaimMission={handleClaimMission}
              onClaimAchievement={handleClaimAchievement}
            />
          )}
        </div>
      )}

      {/* External Gaming Web Modal Player & Configuration */}
      <ExternalGamingWebModal
        isOpen={showExternalWebModal}
        config={externalWebConfig}
        language={language}
        isAdmin={userProfile?.role === "admin" || userProfile?.role === "superadmin"}
        onClose={() => setShowExternalWebModal(false)}
        onSaveConfig={handleSaveExternalWebConfig}
      />
    </div>
  );
}
