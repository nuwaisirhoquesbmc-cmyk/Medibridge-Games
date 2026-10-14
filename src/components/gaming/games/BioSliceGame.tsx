import React, { useState, useEffect, useRef } from "react";
import { Question } from "../../../types";
import { GameScoreResult } from "../gamingData";
import { playSound } from "../../../audio";
import {
  Flame,
  Heart,
  Clock,
  Sparkles,
  RotateCcw,
  ChevronRight,
  ShieldAlert,
  Zap,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface BioSliceGameProps {
  questions: Question[];
  language: "bn" | "en";
  courseName: string;
  onFinishGame: (result: GameScoreResult) => void;
  onExit: () => void;
}

interface FloatingTarget {
  id: number;
  optionIndex: number;
  label: string;
  isCorrect: boolean;
  x: number; // percentage 10-85
  y: number;
  vy: number; // velocity
  vx: number;
  color: string;
  icon: string;
  sliced: boolean;
}

export default function BioSliceGame({
  questions,
  language,
  courseName,
  onFinishGame,
  onExit,
}: BioSliceGameProps) {
  const isBn = language === "bn";
  const [gameState, setGameState] = useState<"intro" | "playing" | "gameover" | "victory">("intro");
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeRemaining, setTimeRemaining] = useState(75);
  const [targets, setTargets] = useState<FloatingTarget[]>([]);
  const [slicedEffects, setSlicedEffects] = useState<{ id: number; x: number; y: number; text: string; color: string }[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [mistakes, setMistakes] = useState<{ question: Question; userChoice: number }[]>([]);

  const activeQuestion = questions[currentQIndex % questions.length] || questions[0];

  // Spawn targets for current question
  const spawnTargetsForQuestion = (q: Question) => {
    const icons = ["🧬", "🔬", "💊", "🧫", "🩸", "🦠"];
    const colors = [
      "from-emerald-500 to-teal-700",
      "from-blue-500 to-indigo-700",
      "from-purple-500 to-violet-700",
      "from-rose-500 to-red-700",
    ];

    const newTargets: FloatingTarget[] = q.options.map((opt, idx) => {
      const isCorrect = idx === q.correctAnswerIndex;
      return {
        id: Date.now() + idx,
        optionIndex: idx,
        label: opt,
        isCorrect,
        x: 15 + idx * 22,
        y: 85, // start from bottom
        vy: -1.2 - Math.random() * 0.5,
        vx: (Math.random() - 0.5) * 0.4,
        color: colors[idx % colors.length],
        icon: icons[idx % icons.length],
        sliced: false,
      };
    });

    setTargets(newTargets);
  };

  // Timer loop
  useEffect(() => {
    if (gameState !== "playing") return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState]);

  // Floating animation loop
  useEffect(() => {
    if (gameState !== "playing") return;

    const frame = setInterval(() => {
      setTargets((prev) =>
        prev
          .map((t) => ({
            ...t,
            y: t.y + t.vy,
            x: Math.max(10, Math.min(85, t.x + t.vx)),
          }))
          .filter((t) => t.y > -15) // Keep until off-screen
      );
    }, 50);

    return () => clearInterval(frame);
  }, [gameState]);

  const startGame = () => {
    playSound("click");
    setGameState("playing");
    setCurrentQIndex(0);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setLives(3);
    setTimeRemaining(75);
    setCorrectCount(0);
    setWrongCount(0);
    setMistakes([]);
    spawnTargetsForQuestion(questions[0] || activeQuestion);
  };

  const handleSliceTarget = (target: FloatingTarget) => {
    if (target.sliced || gameState !== "playing") return;

    // Mark as sliced
    setTargets((prev) =>
      prev.map((t) => (t.id === target.id ? { ...t, sliced: true } : t))
    );

    // Create slice visual popup
    setSlicedEffects((prev) => [
      ...prev,
      {
        id: Date.now(),
        x: target.x,
        y: target.y,
        text: target.isCorrect ? "+150 SLICE!" : "WRONG! -1 LIFE",
        color: target.isCorrect ? "text-emerald-400" : "text-red-400",
      },
    ]);

    if (target.isCorrect) {
      playSound("correct");
      const newCombo = combo + 1;
      setCombo(newCombo);
      setMaxCombo((prev) => Math.max(prev, newCombo));
      setScore((prev) => prev + 150 + newCombo * 15);
      setCorrectCount((prev) => prev + 1);

      // Move to next question after successful slice
      setTimeout(() => {
        const nextIdx = currentQIndex + 1;
        setCurrentQIndex(nextIdx);
        spawnTargetsForQuestion(questions[nextIdx % questions.length] || activeQuestion);
      }, 500);
    } else {
      playSound("incorrect");
      setCombo(0);
      setWrongCount((prev) => prev + 1);
      setMistakes((prev) => [...prev, { question: activeQuestion, userChoice: target.optionIndex }]);
      setLives((prev) => {
        const remaining = prev - 1;
        if (remaining <= 0) {
          setTimeout(() => endGame(), 500);
        }
        return remaining;
      });
    }
  };

  const endGame = () => {
    playSound("levelup");
    setGameState("victory");
  };

  const finalizeSession = () => {
    const totalQ = correctCount + wrongCount;
    const accuracy = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;
    const xp = Math.round(score * 1.4);
    const coins = Math.round(score * 0.35);

    const result: GameScoreResult = {
      gameId: "bio-slice",
      gameTitle: "BioSlice: Cell Ninja",
      score,
      correctAnswers: correctCount,
      wrongAnswers: wrongCount,
      totalQuestions: totalQ,
      accuracy,
      xpEarned: xp,
      coinsEarned: coins,
      timeSpentSeconds: 75 - timeRemaining,
      comboMax: maxCombo,
      mistakes,
    };

    onFinishGame(result);
  };

  return (
    <div className="w-full bg-[#081018] border border-emerald-500/20 rounded-3xl overflow-hidden shadow-2xl relative font-sans select-none">
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
            <span className="text-xl">⚔️</span>
            <span className="font-bold text-white uppercase hidden sm:inline">
              {isBn ? "বায়ো-স্লাইস সেল নিনজা" : "BioSlice Cell Ninja"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-6">
          <div className="flex items-center gap-1.5 text-amber-400 bg-amber-950/40 px-2.5 py-1 rounded-xl border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-bold text-sm">{timeRemaining}s</span>
          </div>

          <div className="flex items-center gap-1">
            {[1, 2, 3].map((i) => (
              <Heart
                key={i}
                className={`w-4 h-4 ${
                  i <= lives ? "text-red-500 fill-red-500 animate-pulse" : "text-gray-700"
                }`}
              />
            ))}
          </div>

          <div className="text-right">
            <span className="text-[10px] text-gray-400 block uppercase leading-none">SCORE</span>
            <span className="font-black text-sm text-emerald-400">{score}</span>
          </div>
        </div>
      </div>

      {gameState === "intro" && (
        <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center min-h-[460px] bg-gradient-to-b from-emerald-950/30 via-black to-black">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-5xl shadow-[0_0_30px_rgba(16,185,129,0.5)] mb-6">
            ⚔️
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider mb-2 font-display">
            {isBn ? "বায়ো-স্লাইস: সেল নিনজা" : "BioSlice: Cell Ninja"}
          </h2>
          <p className="text-sm text-gray-300 max-w-lg mb-6 leading-relaxed">
            {isBn
              ? "স্ক্রিনে প্রশ্ন অনুযায়ী ভেসে ওঠা সঠিক বায়োলজিক্যাল অপশনটি স্লাইস বা ক্লিক করো! ভুল অপশনে ক্লিক করলে লাইফ হারাবে।"
              : "Slice or click the correct biological organelle matching the question! Slicing wrong options costs a life."}
          </p>

          <button
            onClick={startGame}
            className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-[0_0_25px_rgba(16,185,129,0.6)] transition cursor-pointer flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isBn ? "স্লাইস শুরু করুন" : "START SLICING"}</span>
          </button>
        </div>
      )}

      {gameState === "playing" && (
        <div className="p-4 sm:p-6 space-y-4 relative min-h-[500px]">
          {/* Question Banner at Top */}
          <div className="bg-black/70 border border-emerald-500/30 rounded-2xl p-4 shadow-lg backdrop-blur-md relative z-20">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2 mb-2 font-mono text-xs">
              <span className="text-emerald-400 font-bold uppercase">
                {activeQuestion.subject} • {activeQuestion.chapter || "Clinical"}
              </span>
              <span className="text-gray-400">Q#{currentQIndex + 1}</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white leading-snug">
              {activeQuestion.questionText}
            </h3>
          </div>

          {/* Slicing Arena Area */}
          <div className="relative w-full h-[360px] bg-black/40 rounded-2xl border border-white/5 overflow-hidden">
            {/* Combo Banner */}
            {combo > 1 && (
              <div className="absolute top-3 left-4 z-20 flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 border border-emerald-500/50 rounded-xl text-emerald-300 font-mono text-xs font-bold animate-bounce shadow-lg">
                <Flame className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                <span>{combo}x SLICE STREAK!</span>
              </div>
            )}

            {/* Sliced Visual Effects */}
            {slicedEffects.map((eff) => (
              <motion.div
                key={eff.id}
                initial={{ opacity: 1, scale: 1, y: 0 }}
                animate={{ opacity: 0, scale: 1.5, y: -40 }}
                transition={{ duration: 0.8 }}
                style={{ left: `${eff.x}%`, top: `${eff.y}%` }}
                className={`absolute z-30 font-black font-mono text-sm uppercase ${eff.color}`}
              >
                {eff.text}
              </motion.div>
            ))}

            {/* Floating Targets */}
            <AnimatePresence>
              {targets.map((target) => {
                if (target.sliced) return null;
                return (
                  <motion.div
                    key={target.id}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    style={{
                      left: `${target.x}%`,
                      top: `${target.y}%`,
                    }}
                    onClick={() => handleSliceTarget(target)}
                    className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10 group"
                  >
                    <div
                      className={`px-4 py-2.5 rounded-2xl bg-gradient-to-r ${target.color} border-2 border-white/30 shadow-[0_0_20px_rgba(0,0,0,0.8)] text-white text-xs sm:text-sm font-bold flex items-center gap-2 hover:scale-110 active:scale-90 transition transform`}
                    >
                      <span className="text-lg">{target.icon}</span>
                      <span className="max-w-[140px] truncate">{target.label}</span>
                      <span className="text-[10px] bg-black/40 px-1.5 py-0.5 rounded font-mono">
                        {String.fromCharCode(65 + target.optionIndex)}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Hint instruction at bottom */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[11px] font-mono text-gray-500 pointer-events-none">
              👆 {isBn ? "সঠিক উত্তরের ভেসে ওঠা ক্যাপসুলটিতে ক্লিক / ট্যাপ করো" : "Click / tap the floating capsule with the correct answer"}
            </div>
          </div>
        </div>
      )}

      {gameState === "victory" && (
        <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center min-h-[460px] bg-gradient-to-b from-black via-[#111111] to-black">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-4xl shadow-[0_0_25px_rgba(16,185,129,0.5)] mb-4">
            🏆
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider mb-1 font-display">
            {isBn ? "বায়ো-স্লাইস সম্পন্ন!" : "BIOSLICE COMPLETE!"}
          </h2>
          <p className="text-xs text-gray-400 font-mono mb-6">
            {courseName} • BioSlice Ninja Mode
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg w-full mb-6 font-mono text-center">
            <div className="bg-black/60 p-3.5 rounded-xl border border-white/10">
              <span className="text-gray-500 block text-[10px] uppercase">Score</span>
              <span className="text-lg font-black text-emerald-400">{score}</span>
            </div>
            <div className="bg-black/60 p-3.5 rounded-xl border border-white/10">
              <span className="text-gray-500 block text-[10px] uppercase">Sliced Correct</span>
              <span className="text-lg font-bold text-white">{correctCount}</span>
            </div>
            <div className="bg-black/60 p-3.5 rounded-xl border border-white/10">
              <span className="text-gray-500 block text-[10px] uppercase">Accuracy</span>
              <span className="text-lg font-bold text-cyan-400">
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
              className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-mono text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg transition cursor-pointer flex items-center gap-2"
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
