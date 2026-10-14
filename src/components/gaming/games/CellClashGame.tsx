import React, { useState, useEffect } from "react";
import { Question } from "../../../types";
import { GameScoreResult } from "../gamingData";
import { playSound } from "../../../audio";
import {
  Shield,
  Zap,
  Sparkles,
  RotateCcw,
  ChevronRight,
  Clock,
  Heart,
  Skull,
  Swords,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { motion } from "motion/react";

interface CellClashGameProps {
  questions: Question[];
  language: "bn" | "en";
  courseName: string;
  onFinishGame: (result: GameScoreResult) => void;
  onExit: () => void;
}

export default function CellClashGame({
  questions,
  language,
  courseName,
  onFinishGame,
  onExit,
}: CellClashGameProps) {
  const isBn = language === "bn";
  const [gameState, setGameState] = useState<"intro" | "playing" | "victory" | "defeated">("intro");
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [bossHp, setBossHp] = useState(100);
  const [playerHp, setPlayerHp] = useState(100);
  const [bossPhase, setBossPhase] = useState<1 | 2 | 3>(1);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(120);
  const [attackAnimation, setAttackAnimation] = useState<"player" | "boss" | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [mistakes, setMistakes] = useState<{ question: Question; userChoice: number }[]>([]);

  const activeQuestion = questions[currentQIndex % questions.length] || questions[0];

  const bossNames = [
    { name: "Methicillin-Resistant Superbug (MRSA)", icon: "🦠", color: "from-rose-600 to-red-800" },
    { name: "Mutant Dengue Flavivirus (Phase 2)", icon: "🧬", color: "from-purple-600 to-indigo-800" },
    { name: "Apex Multi-Drug Resistant Mycobacteria", icon: "👾", color: "from-amber-600 to-red-900" },
  ];

  const currentBoss = bossNames[bossPhase - 1] || bossNames[0];

  useEffect(() => {
    if (gameState !== "playing") return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setGameState("defeated");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState]);

  const startGame = () => {
    playSound("click");
    setGameState("playing");
    setCurrentQIndex(0);
    setScore(0);
    setBossHp(100);
    setPlayerHp(100);
    setBossPhase(1);
    setCombo(0);
    setMaxCombo(0);
    setTimeRemaining(120);
    setCorrectCount(0);
    setWrongCount(0);
    setMistakes([]);
    setSelectedOption(null);
    setAttackAnimation(null);
  };

  const handleAnswer = (idx: number) => {
    if (selectedOption !== null || gameState !== "playing") return;

    setSelectedOption(idx);
    const isCorrect = idx === activeQuestion.correctAnswerIndex;

    if (isCorrect) {
      playSound("correct");
      setAttackAnimation("player");
      const newCombo = combo + 1;
      setCombo(newCombo);
      setMaxCombo((prev) => Math.max(prev, newCombo));

      const damage = 25 + newCombo * 5;
      setScore((prev) => prev + 150 + newCombo * 25);
      setCorrectCount((prev) => prev + 1);

      setBossHp((prev) => {
        const next = prev - damage;
        if (next <= 0) {
          if (bossPhase < 3) {
            setBossPhase((p) => (p + 1) as any);
            return 100;
          } else {
            setTimeout(() => {
              playSound("levelup");
              setGameState("victory");
            }, 600);
            return 0;
          }
        }
        return next;
      });
    } else {
      playSound("incorrect");
      setAttackAnimation("boss");
      setCombo(0);
      setWrongCount((prev) => prev + 1);
      setMistakes((prev) => [...prev, { question: activeQuestion, userChoice: idx }]);

      setPlayerHp((prev) => {
        const next = prev - 30;
        if (next <= 0) {
          setTimeout(() => setGameState("defeated"), 600);
          return 0;
        }
        return next;
      });
    }

    setTimeout(() => {
      setSelectedOption(null);
      setAttackAnimation(null);
      setCurrentQIndex((prev) => prev + 1);
    }, 800);
  };

  const finalizeSession = () => {
    const totalQ = correctCount + wrongCount;
    const accuracy = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;
    const xp = Math.round(score * 2.0);
    const coins = Math.round(score * 0.5);

    const result: GameScoreResult = {
      gameId: "cell-clash",
      gameTitle: "Cell Clash: Immune Boss Raid",
      score,
      correctAnswers: correctCount,
      wrongAnswers: wrongCount,
      totalQuestions: totalQ,
      accuracy,
      xpEarned: xp,
      coinsEarned: coins,
      timeSpentSeconds: 120 - timeRemaining,
      comboMax: maxCombo,
      mistakes,
    };

    onFinishGame(result);
  };

  return (
    <div className="w-full bg-[#120818] border border-purple-500/20 rounded-3xl overflow-hidden shadow-2xl relative font-sans">
      {/* Top HUD */}
      <div className="bg-black/80 border-b border-white/10 p-3 sm:p-4 flex items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-gray-300 rounded-lg transition text-[11px] font-bold"
          >
            ✕ {isBn ? "প্রস্থান" : "Exit"}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl">🛡️</span>
            <span className="font-bold text-white uppercase hidden sm:inline">
              {isBn ? "সেল ক্ল্যাশ: ইমিউন বস রেইড" : "Cell Clash: Immune Boss Raid"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-6">
          <div className="flex items-center gap-1.5 text-amber-400 bg-amber-950/40 px-2.5 py-1 rounded-xl border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-bold">{timeRemaining}s</span>
          </div>

          <div className="text-purple-300 font-bold bg-purple-950/40 px-2.5 py-1 rounded-xl border border-purple-500/30">
            PHASE {bossPhase} / 3
          </div>

          <div className="text-right">
            <span className="text-[10px] text-gray-400 block uppercase leading-none">SCORE</span>
            <span className="font-black text-sm text-[#FFD700]">{score}</span>
          </div>
        </div>
      </div>

      {gameState === "intro" && (
        <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center min-h-[460px] bg-gradient-to-b from-purple-950/30 via-black to-black">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-purple-600 to-violet-600 flex items-center justify-center text-5xl shadow-[0_0_30px_rgba(147,51,234,0.5)] mb-6">
            🛡️
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider mb-2 font-display">
            {isBn ? "সেল ক্ল্যাশ: ইমিউন বস রেইড" : "Cell Clash: Immune Boss Raid"}
          </h2>
          <p className="text-sm text-gray-300 max-w-lg mb-6 leading-relaxed">
            {isBn
              ? "ড্রাগ-রেজিস্ট্যান্ট সুপারবাগ ভাইরাস আক্রমণ করেছে! সঠিক মেডিকেল উত্তর দিয়ে ম্যাক্রোফেজ ও অ্যান্টিবডি ডিপ্লয় করে বস বধ করো।"
              : "Defend against Multi-Drug Resistant Superbug Bosses! Deploy Immune Army attacks with each correct medical answer."}
          </p>

          <button
            onClick={startGame}
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-[0_0_25px_rgba(147,51,234,0.6)] transition cursor-pointer flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isBn ? "বস রেইড শুরু করুন" : "COMMENCE RAID"}</span>
          </button>
        </div>
      )}

      {gameState === "playing" && (
        <div className="p-4 sm:p-6 space-y-6">
          {/* Battle Arena Header with Dual HP Gauges */}
          <div className="rounded-2xl bg-gradient-to-b from-purple-950/80 to-black border border-purple-500/30 p-4 space-y-4">
            {/* Boss HP Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-1.5 text-rose-400 font-bold">
                  <Skull className="w-4 h-4" />
                  <span>{currentBoss.name}</span>
                </div>
                <span className="text-rose-300 font-bold">{bossHp}% HP</span>
              </div>
              <div className="w-full bg-black/60 h-3.5 rounded-full overflow-hidden border border-rose-500/40">
                <motion.div
                  animate={{ width: `${bossHp}%` }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  className="h-full bg-gradient-to-r from-red-600 to-rose-500 shadow-[0_0_12px_rgba(225,29,72,0.8)]"
                />
              </div>
            </div>

            {/* Battle Stage Avatars */}
            <div className="flex items-center justify-between px-4 py-2 relative">
              {/* Player Avatar */}
              <motion.div
                animate={{
                  x: attackAnimation === "player" ? 60 : 0,
                  scale: attackAnimation === "player" ? 1.2 : 1,
                }}
                className="flex flex-col items-center gap-1"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-3xl shadow-[0_0_15px_rgba(6,182,212,0.6)] border border-white/20">
                  🛡️
                </div>
                <span className="text-[10px] font-mono text-cyan-300 font-bold">IMMUNE ARMY</span>
              </motion.div>

              {/* Clash VFX */}
              <div className="flex flex-col items-center">
                <Swords className="w-6 h-6 text-[#FFD700] animate-pulse" />
                {combo > 1 && (
                  <span className="text-[10px] font-mono text-[#FFD700] font-bold mt-1">
                    {combo}x OVERDRIVE!
                  </span>
                )}
              </div>

              {/* Boss Avatar */}
              <motion.div
                animate={{
                  x: attackAnimation === "boss" ? -60 : 0,
                  scale: attackAnimation === "boss" ? 1.2 : 1,
                }}
                className="flex flex-col items-center gap-1"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${currentBoss.color} flex items-center justify-center text-3xl shadow-[0_0_15px_rgba(225,29,72,0.6)] border border-white/20`}>
                  {currentBoss.icon}
                </div>
                <span className="text-[10px] font-mono text-rose-400 font-bold">BOSS</span>
              </motion.div>
            </div>

            {/* Player HP Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
                  <Heart className="w-4 h-4 text-cyan-400 fill-cyan-400" />
                  <span>CANDIDATE IMMUNE INTEGRITY</span>
                </div>
                <span className="text-cyan-300 font-bold">{playerHp}% HP</span>
              </div>
              <div className="w-full bg-black/60 h-2.5 rounded-full overflow-hidden border border-cyan-500/40">
                <motion.div
                  animate={{ width: `${playerHp}%` }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Question Box */}
          <div className="bg-black/60 border border-white/10 rounded-2xl p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3 font-mono text-xs">
              <span className="text-purple-400 font-bold uppercase">
                {activeQuestion.subject} • {activeQuestion.chapter || "Immunology"}
              </span>
              <span className="text-gray-400">Attack Spell #{currentQIndex + 1}</span>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-white leading-relaxed">
              {activeQuestion.questionText}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {activeQuestion.options.map((opt, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrect = idx === activeQuestion.correctAnswerIndex;
                let btnStyle = "bg-black/70 border-white/10 text-gray-200 hover:border-white/30";

                if (selectedOption !== null) {
                  if (isCorrect) {
                    btnStyle = "bg-emerald-950/80 border-emerald-500 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.4)]";
                  } else if (isSelected) {
                    btnStyle = "bg-red-950/80 border-red-500 text-red-200";
                  } else {
                    btnStyle = "bg-black/40 border-gray-850 text-gray-500 opacity-50";
                  }
                }

                return (
                  <button
                    key={idx}
                    disabled={selectedOption !== null}
                    onClick={() => handleAnswer(idx)}
                    className={`p-3.5 sm:p-4 rounded-xl border text-left font-sans text-xs sm:text-sm font-semibold transition flex items-center justify-between gap-3 cursor-pointer ${btnStyle}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-white/10 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span>{opt}</span>
                    </div>
                    {selectedOption !== null && isCorrect && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                    {selectedOption !== null && isSelected && !isCorrect && (
                      <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Victory / Defeat */}
      {(gameState === "victory" || gameState === "defeated") && (
        <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center min-h-[460px] bg-gradient-to-b from-black via-[#111111] to-black">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-purple-600 to-violet-500 flex items-center justify-center text-4xl shadow-[0_0_25px_rgba(147,51,234,0.5)] mb-4">
            {gameState === "victory" ? "👑" : "💀"}
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider mb-1 font-display">
            {gameState === "victory"
              ? (isBn ? "সুপারবাগ বস ধ্বংসপ্রাপ্ত!" : "IMMUNE BOSS ANNIHILATED!")
              : (isBn ? "ইমিউন ডিফেন্স পরাস্ত" : "IMMUNE DEFENSE OVERRUN")}
          </h2>
          <p className="text-xs text-gray-400 font-mono mb-6">
            {courseName} • Cell Clash Boss Raid
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg w-full mb-6 font-mono text-center">
            <div className="bg-black/60 p-3.5 rounded-xl border border-white/10">
              <span className="text-gray-500 block text-[10px] uppercase">Raid Score</span>
              <span className="text-lg font-black text-[#FFD700]">{score}</span>
            </div>
            <div className="bg-black/60 p-3.5 rounded-xl border border-white/10">
              <span className="text-gray-500 block text-[10px] uppercase">Phases Cleared</span>
              <span className="text-lg font-bold text-purple-400">{bossPhase} / 3</span>
            </div>
            <div className="bg-black/60 p-3.5 rounded-xl border border-white/10">
              <span className="text-gray-500 block text-[10px] uppercase">Accuracy</span>
              <span className="text-lg font-bold text-emerald-400">
                {correctCount + wrongCount > 0
                  ? Math.round((correctCount / (correctCount + wrongCount)) * 100)
                  : 0}
                %
              </span>
            </div>
            <div className="bg-black/60 p-3.5 rounded-xl border border-white/10">
              <span className="text-gray-500 block text-[10px] uppercase">Max Combo</span>
              <span className="text-lg font-bold text-orange-400">{maxCombo}x</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={startGame}
              className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isBn ? "আবার খেলুন" : "Play Again"}</span>
            </button>
            <button
              onClick={finalizeSession}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-mono text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg transition cursor-pointer flex items-center gap-2"
            >
              <span>{isBn ? "রিওয়ার্ড সংগ্রহ করুন" : "Claim Rewards"}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
