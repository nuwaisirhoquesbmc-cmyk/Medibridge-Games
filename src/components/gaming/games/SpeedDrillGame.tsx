import React, { useState, useEffect } from "react";
import { Question } from "../../../types";
import { GameScoreResult } from "../gamingData";
import { playSound } from "../../../audio";
import {
  Zap,
  Flame,
  Sparkles,
  RotateCcw,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { motion } from "motion/react";

interface SpeedDrillGameProps {
  questions: Question[];
  language: "bn" | "en";
  courseName: string;
  onFinishGame: (result: GameScoreResult) => void;
  onExit: () => void;
}

export default function SpeedDrillGame({
  questions,
  language,
  courseName,
  onFinishGame,
  onExit,
}: SpeedDrillGameProps) {
  const isBn = language === "bn";
  const [gameState, setGameState] = useState<"intro" | "playing" | "victory">("intro");
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(60); // 60s Blitz
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [mistakes, setMistakes] = useState<{ question: Question; userChoice: number }[]>([]);

  const activeQuestion = questions[currentQIndex % questions.length] || questions[0];

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

  const startGame = () => {
    playSound("click");
    setGameState("playing");
    setCurrentQIndex(0);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setTimeRemaining(60);
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
      const newCombo = combo + 1;
      setCombo(newCombo);
      setMaxCombo((prev) => Math.max(prev, newCombo));

      const points = 100 + newCombo * 20;
      setScore((prev) => prev + points);
      setCorrectCount((prev) => prev + 1);
    } else {
      playSound("incorrect");
      setCombo(0);
      setWrongCount((prev) => prev + 1);
      setMistakes((prev) => [...prev, { question: activeQuestion, userChoice: idx }]);
    }

    setTimeout(() => {
      setSelectedOption(null);
      setCurrentQIndex((prev) => prev + 1);
    }, 300); // Ultra fast transition for speed drill
  };

  const endGame = () => {
    playSound("levelup");
    setGameState("victory");
  };

  const finalizeSession = () => {
    const totalQ = correctCount + wrongCount;
    const accuracy = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;
    const xp = Math.round(score * 1.6);
    const coins = Math.round(score * 0.4);

    const result: GameScoreResult = {
      gameId: "speed-drill",
      gameTitle: "Speed Drill: 60s Blitz",
      score,
      correctAnswers: correctCount,
      wrongAnswers: wrongCount,
      totalQuestions: totalQ,
      accuracy,
      xpEarned: xp,
      coinsEarned: coins,
      timeSpentSeconds: 60 - timeRemaining,
      comboMax: maxCombo,
      mistakes,
    };

    onFinishGame(result);
  };

  return (
    <div className="w-full bg-[#120F08] border border-yellow-500/20 rounded-3xl overflow-hidden shadow-2xl relative font-sans">
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
            <span className="text-xl">⚡</span>
            <span className="font-bold text-white uppercase hidden sm:inline">
              {isBn ? "স্পিড ড্রিল ৬০ সেকেন্ড ব্লিৎজ" : "Speed Drill 60s Blitz"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-6">
          <div className="flex items-center gap-1.5 text-amber-400 bg-amber-950/40 px-3 py-1 rounded-xl border border-amber-500/30 text-sm font-black">
            <Clock className="w-4 h-4" />
            <span>{timeRemaining}s</span>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-gray-400 block uppercase leading-none">SCORE</span>
            <span className="font-black text-sm text-[#FFD700]">{score}</span>
          </div>
        </div>
      </div>

      {gameState === "intro" && (
        <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center min-h-[460px] bg-gradient-to-b from-amber-950/30 via-black to-black">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-yellow-500 to-amber-600 flex items-center justify-center text-5xl shadow-[0_0_30px_rgba(234,179,8,0.5)] mb-6">
            ⚡
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider mb-2 font-display">
            {isBn ? "স্পিড ড্রিল: ৬০ সেকেন্ড ব্লিৎজ" : "Speed Drill: 60s Blitz"}
          </h2>
          <p className="text-sm text-gray-300 max-w-lg mb-6 leading-relaxed">
            {isBn
              ? "ঘড়ির কাঁটার সাথে যুদ্ধ! ৬০ সেকেন্ডে যতগুলো সম্ভব দ্রুত সঠিক উত্তর দাও। একটানা কম্বো স্ট্রিকে পয়েন্ট ও এক্সপি মাল্টিপ্লাই হবে!"
              : "Race the 60-second timer! Answer rapid-fire admission MCQs with instant reflexes and build insane combo multipliers."}
          </p>

          <button
            onClick={startGame}
            className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black font-black text-sm uppercase tracking-widest rounded-2xl shadow-[0_0_25px_rgba(234,179,8,0.6)] transition cursor-pointer flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isBn ? "ব্লিৎজ শুরু করুন" : "START BLITZ"}</span>
          </button>
        </div>
      )}

      {gameState === "playing" && (
        <div className="p-4 sm:p-6 space-y-6">
          {/* Combo & Pace Banner */}
          <div className="flex items-center justify-between bg-black/60 border border-yellow-500/30 p-3 rounded-2xl">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-400 fill-orange-400" />
              <span className="font-mono text-xs font-bold text-yellow-300">
                {combo > 1 ? `${combo}x COMBO STREAK!` : "STREAK READY"}
              </span>
            </div>
            <span className="font-mono text-xs text-gray-400">
              Answered: {correctCount + wrongCount} Qs
            </span>
          </div>

          {/* Question Box */}
          <div className="bg-black/60 border border-white/10 rounded-2xl p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3 font-mono text-xs">
              <span className="text-yellow-400 font-bold uppercase">
                {activeQuestion.subject} • {activeQuestion.chapter || "Rapid Fire"}
              </span>
              <span className="text-gray-400">#{currentQIndex + 1}</span>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-white leading-relaxed">
              {activeQuestion.questionText}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {activeQuestion.options.map((opt, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrect = idx === activeQuestion.correctAnswerIndex;
                let btnStyle = "bg-black/70 border-white/10 text-gray-200 hover:border-yellow-500/40";

                if (selectedOption !== null) {
                  if (isCorrect) {
                    btnStyle = "bg-emerald-950/80 border-emerald-500 text-emerald-200";
                  } else if (isSelected) {
                    btnStyle = "bg-red-950/80 border-red-500 text-red-200";
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
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {gameState === "victory" && (
        <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center min-h-[460px] bg-gradient-to-b from-black via-[#111111] to-black">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-yellow-500 to-amber-400 flex items-center justify-center text-4xl shadow-[0_0_25px_rgba(234,179,8,0.5)] mb-4">
            ⚡
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider mb-1 font-display">
            {isBn ? "ব্লিৎজ সম্পন্ন!" : "BLITZ FINISHED!"}
          </h2>
          <p className="text-xs text-gray-400 font-mono mb-6">
            {courseName} • 60-Second Rapid Reflex Drill
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg w-full mb-6 font-mono text-center">
            <div className="bg-black/60 p-3.5 rounded-xl border border-white/10">
              <span className="text-gray-500 block text-[10px] uppercase">Final Score</span>
              <span className="text-lg font-black text-[#FFD700]">{score}</span>
            </div>
            <div className="bg-black/60 p-3.5 rounded-xl border border-white/10">
              <span className="text-gray-500 block text-[10px] uppercase">Solved</span>
              <span className="text-lg font-bold text-white">{correctCount} Qs</span>
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
              className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black font-mono text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg transition cursor-pointer flex items-center gap-2"
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
