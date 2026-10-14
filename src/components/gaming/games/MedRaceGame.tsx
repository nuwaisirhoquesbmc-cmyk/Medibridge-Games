import React, { useState, useEffect } from "react";
import { Question } from "../../../types";
import { GameScoreResult } from "../gamingData";
import { playSound } from "../../../audio";
import {
  Gauge,
  Flame,
  Clock,
  Sparkles,
  RotateCcw,
  ChevronRight,
  Trophy,
  Zap,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { motion } from "motion/react";

interface MedRaceGameProps {
  questions: Question[];
  language: "bn" | "en";
  courseName: string;
  onFinishGame: (result: GameScoreResult) => void;
  onExit: () => void;
}

export default function MedRaceGame({
  questions,
  language,
  courseName,
  onFinishGame,
  onExit,
}: MedRaceGameProps) {
  const isBn = language === "bn";
  const [gameState, setGameState] = useState<"intro" | "playing" | "victory">("intro");
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [speedKmh, setSpeedKmh] = useState(140);
  const [nitroActive, setNitroActive] = useState(false);
  const [carPositionPct, setCarPositionPct] = useState(30); // 0 to 100 on race track
  const [rivalPositionPct, setRivalPositionPct] = useState(25);
  const [lap, setLap] = useState(1);
  const [timeRemaining, setTimeRemaining] = useState(90);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [mistakes, setMistakes] = useState<{ question: Question; userChoice: number }[]>([]);

  const activeQuestion = questions[currentQIndex % questions.length] || questions[0];

  // Race loop
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

      // Progress cars
      setCarPositionPct((prev) => {
        const next = prev + speedKmh / 80;
        if (next >= 100) {
          setLap((l) => l + 1);
          return 0;
        }
        return next;
      });

      setRivalPositionPct((prev) => {
        const next = prev + 2.1;
        if (next >= 100) return 0;
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, speedKmh]);

  const startGame = () => {
    playSound("click");
    setGameState("playing");
    setCurrentQIndex(0);
    setScore(0);
    setSpeedKmh(140);
    setCarPositionPct(30);
    setRivalPositionPct(25);
    setLap(1);
    setCombo(0);
    setMaxCombo(0);
    setTimeRemaining(90);
    setCorrectCount(0);
    setWrongCount(0);
    setMistakes([]);
    setSelectedOption(null);
  };

  const handleAnswer = (idx: number) => {
    if (selectedOption !== null || gameState !== "playing") return;

    setSelectedOption(idx);
    const isCorrect = idx === activeQuestion.correctAnswerIndex;

    if (isCorrect) {
      playSound("correct");
      setNitroActive(true);
      const newCombo = combo + 1;
      setCombo(newCombo);
      setMaxCombo((prev) => Math.max(prev, newCombo));

      setScore((prev) => prev + 120 + newCombo * 20);
      setSpeedKmh((prev) => Math.min(320, prev + 35));
      setCorrectCount((prev) => prev + 1);
      setCarPositionPct((prev) => Math.min(100, prev + 12));

      setTimeout(() => setNitroActive(false), 1200);
    } else {
      playSound("incorrect");
      setCombo(0);
      setSpeedKmh((prev) => Math.max(80, prev - 30));
      setWrongCount((prev) => prev + 1);
      setMistakes((prev) => [...prev, { question: activeQuestion, userChoice: idx }]);
    }

    setTimeout(() => {
      setSelectedOption(null);
      setCurrentQIndex((prev) => prev + 1);
    }, 700);
  };

  const endGame = () => {
    playSound("levelup");
    setGameState("victory");
  };

  const finalizeSession = () => {
    const totalQ = correctCount + wrongCount;
    const accuracy = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;
    const xp = Math.round(score * 1.8);
    const coins = Math.round(score * 0.45);

    const result: GameScoreResult = {
      gameId: "med-race",
      gameTitle: "MedRace: Nitro Pharma Grand Prix",
      score,
      correctAnswers: correctCount,
      wrongAnswers: wrongCount,
      totalQuestions: totalQ,
      accuracy,
      xpEarned: xp,
      coinsEarned: coins,
      timeSpentSeconds: 90 - timeRemaining,
      comboMax: maxCombo,
      mistakes,
    };

    onFinishGame(result);
  };

  return (
    <div className="w-full bg-[#0D0B14] border border-amber-500/20 rounded-3xl overflow-hidden shadow-2xl relative font-sans">
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
            <span className="text-xl">🏎️</span>
            <span className="font-bold text-white uppercase hidden sm:inline">
              {isBn ? "মেড-রেস নাইট্রো গ্রাঁ প্রি" : "MedRace Nitro Grand Prix"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-6">
          <div className="flex items-center gap-1.5 text-amber-400 bg-amber-950/40 px-2.5 py-1 rounded-xl border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-bold text-sm">{timeRemaining}s</span>
          </div>

          <div className="flex items-center gap-1 text-orange-400 font-bold bg-orange-950/40 px-2.5 py-1 rounded-xl border border-orange-500/30">
            <Gauge className="w-3.5 h-3.5" />
            <span>{speedKmh} KM/H</span>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-gray-400 block uppercase leading-none">SCORE</span>
            <span className="font-black text-sm text-[#FFD700]">{score}</span>
          </div>
        </div>
      </div>

      {gameState === "intro" && (
        <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center min-h-[460px] bg-gradient-to-b from-amber-950/30 via-black to-black">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-5xl shadow-[0_0_30px_rgba(245,158,11,0.5)] mb-6">
            🏎️
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider mb-2 font-display">
            {isBn ? "মেড-রেস: নাইট্রো ফার্মা" : "MedRace: Nitro Pharma"}
          </h2>
          <p className="text-sm text-gray-300 max-w-lg mb-6 leading-relaxed">
            {isBn
              ? "তড়িৎ গতিতে ফার্মাকোলজি ও রসায়নের প্রশ্নের সঠিক উত্তর দিয়ে গাড়িতে নাইট্রো বুস্ট অন করো এবং প্রতিপক্ষ ডাক্তারকে পেছনে ফেলে ট্র্যাকে সবার আগে জয়ী হও!"
              : "Hit correct answers to inject Nitro Boost into your supercar and outpace rival medical aspirants on the high-speed circuit!"}
          </p>

          <button
            onClick={startGame}
            className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-[0_0_25px_rgba(245,158,11,0.6)] transition cursor-pointer flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isBn ? "রেস শুরু করুন" : "START RACING"}</span>
          </button>
        </div>
      )}

      {gameState === "playing" && (
        <div className="p-4 sm:p-6 space-y-6">
          {/* Race Track Canvas Header */}
          <div className="h-32 sm:h-36 rounded-2xl bg-gradient-to-b from-gray-900 to-black border border-amber-500/30 p-3 flex flex-col justify-between relative overflow-hidden">
            {/* Nitro Flame Overlay */}
            {nitroActive && (
              <div className="absolute inset-0 bg-gradient-to-r from-orange-600/30 via-amber-500/40 to-transparent animate-pulse pointer-events-none flex items-center justify-center">
                <span className="text-2xl font-black text-white font-mono uppercase tracking-widest drop-shadow-[0_0_15px_rgba(245,158,11,1)]">
                  ⚡ NITRO BOOST ACTIVATED! ⚡
                </span>
              </div>
            )}

            {/* Track Lanes */}
            <div className="space-y-3 relative z-10">
              {/* Your Car Lane */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-cyan-300 w-12 shrink-0">YOU (P1)</span>
                <div className="flex-1 bg-black/60 h-8 rounded-xl border border-white/10 relative overflow-hidden flex items-center px-2">
                  <motion.div
                    animate={{ left: `${carPositionPct}%` }}
                    transition={{ type: "spring", stiffness: 120, damping: 15 }}
                    className="absolute text-2xl -translate-x-1/2 flex items-center gap-1"
                  >
                    🏎️
                    {nitroActive && <span className="text-sm animate-pulse">🔥</span>}
                  </motion.div>
                </div>
              </div>

              {/* Rival Car Lane */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-rose-400 w-12 shrink-0">RIVAL</span>
                <div className="flex-1 bg-black/60 h-8 rounded-xl border border-white/10 relative overflow-hidden flex items-center px-2">
                  <motion.div
                    animate={{ left: `${rivalPositionPct}%` }}
                    transition={{ type: "spring", stiffness: 100, damping: 18 }}
                    className="absolute text-2xl -translate-x-1/2"
                  >
                    🚗
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Lap Counter */}
            <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 border-t border-white/10 pt-1.5">
              <span>CIRCUIT: DHAKA MEDICAL APEX</span>
              <span className="text-amber-400 font-bold">LAP {lap} / 3</span>
            </div>
          </div>

          {/* Question Box */}
          <div className="bg-black/60 border border-white/10 rounded-2xl p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3 font-mono text-xs">
              <span className="text-amber-400 font-bold uppercase">
                {activeQuestion.subject} • {activeQuestion.chapter || "Pharma"}
              </span>
              <span className="text-gray-400">MCQ #{currentQIndex + 1}</span>
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

      {gameState === "victory" && (
        <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center min-h-[460px] bg-gradient-to-b from-black via-[#111111] to-black">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-4xl shadow-[0_0_25px_rgba(245,158,11,0.5)] mb-4">
            🏁
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider mb-1 font-display">
            {isBn ? "গ্রাঁ প্রি সমাপ্ত!" : "GRAND PRIX COMPLETE!"}
          </h2>
          <p className="text-xs text-gray-400 font-mono mb-6">
            {courseName} • MedRace Nitro Circuit
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg w-full mb-6 font-mono text-center">
            <div className="bg-black/60 p-3.5 rounded-xl border border-white/10">
              <span className="text-gray-500 block text-[10px] uppercase">Score</span>
              <span className="text-lg font-black text-[#FFD700]">{score}</span>
            </div>
            <div className="bg-black/60 p-3.5 rounded-xl border border-white/10">
              <span className="text-gray-500 block text-[10px] uppercase">Top Speed</span>
              <span className="text-lg font-bold text-orange-400">{speedKmh} KM/H</span>
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
              <span className="text-gray-500 block text-[10px] uppercase">Laps Done</span>
              <span className="text-lg font-bold text-cyan-400">{lap}</span>
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
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-mono text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg transition cursor-pointer flex items-center gap-2"
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
