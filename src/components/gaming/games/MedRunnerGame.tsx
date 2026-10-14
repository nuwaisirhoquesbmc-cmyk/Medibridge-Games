import React, { useState, useEffect, useRef } from "react";
import { Question } from "../../../types";
import { GameScoreResult } from "../gamingData";
import { playSound } from "../../../audio";
import {
  Zap,
  Heart,
  Trophy,
  ArrowRight,
  Flame,
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface MedRunnerGameProps {
  questions: Question[];
  language: "bn" | "en";
  courseName: string;
  onFinishGame: (result: GameScoreResult) => void;
  onExit: () => void;
}

export default function MedRunnerGame({
  questions,
  language,
  courseName,
  onFinishGame,
  onExit,
}: MedRunnerGameProps) {
  const isBn = language === "bn";
  const [gameState, setGameState] = useState<"intro" | "playing" | "gameover" | "victory">("intro");
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0); // in meters
  const [speed, setSpeed] = useState(60); // km/h
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(90); // 90 seconds sprint
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [isJumping, setIsJumping] = useState(false);
  const [soundMuted, setSoundMuted] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [mistakes, setMistakes] = useState<{ question: Question; userChoice: number }[]>([]);

  const activeQuestion = questions[currentQIndex % questions.length] || questions[0];

  // Game Loop: distance & timer
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

      setDistance((prev) => prev + Math.round(speed / 10));
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, speed]);

  const startGame = () => {
    if (!soundMuted) playSound("click");
    setGameState("playing");
    setCurrentQIndex(0);
    setScore(0);
    setDistance(0);
    setSpeed(60);
    setLives(3);
    setCombo(0);
    setMaxCombo(0);
    setTimeRemaining(90);
    setCorrectCount(0);
    setWrongCount(0);
    setMistakes([]);
    setSelectedOption(null);
    setFeedback(null);
  };

  const handleAnswer = (optionIdx: number) => {
    if (selectedOption !== null || gameState !== "playing") return;

    setSelectedOption(optionIdx);
    const isCorrect = optionIdx === activeQuestion.correctAnswerIndex;

    if (isCorrect) {
      if (!soundMuted) playSound("correct");
      setFeedback("correct");
      const newCombo = combo + 1;
      setCombo(newCombo);
      setMaxCombo((prev) => Math.max(prev, newCombo));
      
      const comboBonus = Math.min(newCombo * 10, 50);
      const points = 100 + comboBonus;
      setScore((prev) => prev + points);
      setSpeed((prev) => Math.min(prev + 5, 120));
      setCorrectCount((prev) => prev + 1);

      // Trigger jump animation
      setIsJumping(true);
      setTimeout(() => setIsJumping(false), 500);
    } else {
      if (!soundMuted) playSound("incorrect");
      setFeedback("wrong");
      setCombo(0);
      setSpeed((prev) => Math.max(prev - 15, 30));
      setLives((prev) => {
        const remaining = prev - 1;
        if (remaining <= 0) {
          setTimeout(() => endGame(), 600);
        }
        return remaining;
      });
      setWrongCount((prev) => prev + 1);
      setMistakes((prev) => [...prev, { question: activeQuestion, userChoice: optionIdx }]);
    }

    // Next question after brief feedback
    setTimeout(() => {
      setSelectedOption(null);
      setFeedback(null);
      setCurrentQIndex((prev) => prev + 1);
    }, 800);
  };

  const endGame = () => {
    if (!soundMuted) playSound("levelup");
    setGameState("victory");
  };

  const finalizeSession = () => {
    const totalQ = correctCount + wrongCount;
    const accuracy = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;
    const xp = Math.round(score * 1.5);
    const coins = Math.round(score * 0.4);

    const result: GameScoreResult = {
      gameId: "med-runner",
      gameTitle: "MedRunner: Bio Sprint",
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
    <div className="w-full bg-[#0A0E17] border border-red-500/20 rounded-3xl overflow-hidden shadow-2xl relative font-sans">
      {/* Top Game HUD Bar */}
      <div className="bg-black/80 border-b border-white/10 p-3 sm:p-4 flex items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-gray-300 rounded-lg transition text-[11px] font-bold"
          >
            ✕ {isBn ? "প্রস্থান" : "Exit"}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl">🏃‍♂️</span>
            <span className="font-bold text-white uppercase hidden sm:inline">
              {isBn ? "বায়ো স্প্রিন্ট রানার" : "Bio Sprint Runner"}
            </span>
          </div>
        </div>

        {/* Live Counters */}
        <div className="flex items-center gap-3 sm:gap-6">
          {/* Timer */}
          <div className="flex items-center gap-1.5 text-amber-400 bg-amber-950/40 px-2.5 py-1 rounded-xl border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-bold text-sm">{timeRemaining}s</span>
          </div>

          {/* Speed & Distance */}
          <div className="hidden sm:flex items-center gap-3 text-cyan-300">
            <span className="bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30">
              ⚡ {speed} km/h
            </span>
            <span className="bg-purple-950/40 px-2 py-0.5 rounded border border-purple-500/30">
              🚩 {distance} m
            </span>
          </div>

          {/* Lives */}
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

          {/* Score */}
          <div className="text-right">
            <span className="text-[10px] text-gray-400 block uppercase leading-none">SCORE</span>
            <span className="font-black text-sm text-[#FFD700]">{score}</span>
          </div>
        </div>
      </div>

      {/* Main Runner Stage / Canvas View */}
      {gameState === "intro" && (
        <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center min-h-[460px] bg-gradient-to-b from-red-950/30 via-black to-black">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center text-5xl shadow-[0_0_30px_rgba(225,29,72,0.5)] mb-6"
          >
            🏃‍♂️
          </motion.div>
          <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider mb-2 font-display">
            {isBn ? "মেড-রানার: বায়ো স্প্রিন্ট" : "MedRunner: Bio Sprint"}
          </h2>
          <p className="text-sm text-gray-300 max-w-lg mb-6 leading-relaxed">
            {isBn
              ? "ধমনীর ভেতরে স্প্রিন্ট করো! দ্রুত গতিতে সঠিক মেডিকেল এমসিকিউ সিলেক্ট করে কোলেস্টেরল প্লাক ও বাধা জাম্প করো। কম্বো স্ট্রিক বানিয়ে সর্বোচ্চ স্কোর করো!"
              : "Sprint through the arterial bloodstream! Jump obstacles and maintain top speed by selecting the correct medical MCQs. Build high combos for maximum rewards!"}
          </p>

          <div className="grid grid-cols-3 gap-3 max-w-md w-full mb-8 font-mono text-xs text-left bg-black/60 p-3.5 rounded-2xl border border-white/10">
            <div>
              <span className="text-gray-500 block text-[10px]">TIME</span>
              <span className="font-bold text-white">90 Seconds</span>
            </div>
            <div>
              <span className="text-gray-500 block text-[10px]">REWARD</span>
              <span className="font-bold text-emerald-400">+1.5x XP</span>
            </div>
            <div>
              <span className="text-gray-500 block text-[10px]">DIFFICULTY</span>
              <span className="font-bold text-[#FFD700]">All Levels</span>
            </div>
          </div>

          <button
            onClick={startGame}
            className="px-8 py-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-[0_0_25px_rgba(225,29,72,0.6)] transition cursor-pointer flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isBn ? "স্প্রিন্ট শুরু করুন" : "START SPRINT"}</span>
          </button>
        </div>
      )}

      {gameState === "playing" && (
        <div className="p-4 sm:p-6 space-y-6">
          {/* Animated Runner Track Graphic */}
          <div className="h-32 sm:h-40 rounded-2xl bg-gradient-to-r from-red-950/80 via-rose-900/40 to-red-950/80 border border-red-500/30 overflow-hidden relative flex flex-col justify-end p-4">
            {/* Background Moving Grid Lines */}
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:16px_16px] opacity-40 animate-pulse"></div>

            {/* Blood Cell Particles floating */}
            <div className="absolute top-3 left-10 text-xl opacity-60 animate-bounce">🩸</div>
            <div className="absolute top-6 right-20 text-lg opacity-40">💊</div>
            <div className="absolute top-2 right-1/3 text-sm opacity-50">🔬</div>

            {/* Combo Streak Indicator */}
            {combo > 1 && (
              <div className="absolute top-3 left-4 flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 border border-amber-500/50 rounded-xl text-amber-300 font-mono text-xs font-bold animate-bounce shadow-lg">
                <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
                <span>{combo}x COMBO STREAK! (+{combo * 10} pts)</span>
              </div>
            )}

            {/* Runner Avatar & Track Floor */}
            <div className="relative z-10 flex items-end justify-between border-b-2 border-red-500/60 pb-2">
              {/* Runner Character */}
              <motion.div
                animate={{
                  y: isJumping ? -45 : 0,
                  rotate: isJumping ? -10 : 0,
                }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className="flex items-center gap-2 pl-4 sm:pl-10"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-500 to-amber-500 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(239,68,68,0.7)] border border-white/20">
                  🏃‍♂️
                </div>
                {isJumping && (
                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40">
                    JUMP! +SPEED
                  </span>
                )}
              </motion.div>

              {/* Approaching Obstacle / Question Gate */}
              <div className="pr-4 sm:pr-10 flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-500/50 flex items-center justify-center text-xl shadow-[0_0_10px_rgba(168,85,247,0.4)]">
                  🧬
                </div>
                <span className="text-[10px] font-mono text-purple-300 uppercase font-bold hidden sm:inline">
                  MCQ Enzymatic Gate #{currentQIndex + 1}
                </span>
              </div>
            </div>
          </div>

          {/* Active Question Box */}
          <div className="bg-black/60 border border-white/10 rounded-2xl p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3 font-mono text-xs">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-lg bg-red-950 text-red-300 font-bold border border-red-800/50">
                  {activeQuestion.subject}
                </span>
                <span className="text-gray-400 truncate max-w-[200px]">
                  {activeQuestion.chapter || "General"}
                </span>
              </div>
              <span className="text-gray-500 text-[11px]">
                Question {currentQIndex + 1}
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-white leading-relaxed">
              {activeQuestion.questionText}
            </h3>

            {/* Options Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {activeQuestion.options.map((opt, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrect = idx === activeQuestion.correctAnswerIndex;
                let btnStyle = "bg-black/70 border-white/10 text-gray-200 hover:border-white/30 hover:bg-white/5";

                if (selectedOption !== null) {
                  if (isCorrect) {
                    btnStyle = "bg-emerald-950/80 border-emerald-500 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.4)]";
                  } else if (isSelected) {
                    btnStyle = "bg-red-950/80 border-red-500 text-red-200 shadow-[0_0_15px_rgba(239,68,68,0.4)]";
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

      {/* Victory / Game Over Screen */}
      {gameState === "victory" && (
        <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center min-h-[460px] bg-gradient-to-b from-black via-[#111111] to-black">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-4xl shadow-[0_0_25px_rgba(245,158,11,0.5)] mb-4">
            🏆
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider mb-1 font-display">
            {isBn ? "স্প্রিন্ট সম্পন্ন!" : "SPRINT COMPLETE!"}
          </h2>
          <p className="text-xs text-gray-400 font-mono mb-6">
            {courseName} • MedRunner Session
          </p>

          {/* Stats Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg w-full mb-6 font-mono text-center">
            <div className="bg-black/60 p-3.5 rounded-xl border border-white/10">
              <span className="text-gray-500 block text-[10px] uppercase">Score</span>
              <span className="text-lg font-black text-[#FFD700]">{score}</span>
            </div>
            <div className="bg-black/60 p-3.5 rounded-xl border border-white/10">
              <span className="text-gray-500 block text-[10px] uppercase">Distance</span>
              <span className="text-lg font-bold text-cyan-400">{distance} m</span>
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

          {/* Reward Badges */}
          <div className="flex items-center gap-3 mb-8 font-mono text-xs">
            <div className="px-4 py-2 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-300 font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>+{Math.round(score * 1.5)} XP Earned</span>
            </div>
            <div className="px-4 py-2 bg-amber-950/60 border border-amber-500/40 rounded-xl text-[#FFD700] font-bold flex items-center gap-1.5">
              <span>🪙 +{Math.round(score * 0.4)} Coins</span>
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
              className="px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-mono text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg transition cursor-pointer flex items-center gap-2"
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
