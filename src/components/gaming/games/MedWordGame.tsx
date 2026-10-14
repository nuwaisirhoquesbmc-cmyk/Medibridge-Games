import React, { useState, useEffect } from "react";
import { Question } from "../../../types";
import { GameScoreResult } from "../gamingData";
import { playSound } from "../../../audio";
import {
  Sparkles,
  RotateCcw,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from "lucide-react";
import { motion } from "motion/react";

interface MedWordGameProps {
  questions: Question[];
  language: "bn" | "en";
  courseName: string;
  onFinishGame: (result: GameScoreResult) => void;
  onExit: () => void;
}

interface ScrambleWordItem {
  id: number;
  word: string;
  clueBn: string;
  clueEn: string;
  category: string;
}

export default function MedWordGame({
  questions,
  language,
  courseName,
  onFinishGame,
  onExit,
}: MedWordGameProps) {
  const isBn = language === "bn";
  const [gameState, setGameState] = useState<"intro" | "playing" | "victory">("intro");
  const [currentWordIdx, setCurrentWordIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [userLetters, setUserLetters] = useState<string[]>([]);
  const [availableLetters, setAvailableLetters] = useState<{ id: number; char: string; used: boolean }[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(90);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);

  const wordBank: ScrambleWordItem[] = [
    { id: 1, word: "HEMOGLOBIN", clueBn: "রক্তে অক্সিজেন পরিবহনকারী আয়রনযুক্ত প্রোটিন", clueEn: "Oxygen-carrying iron protein in RBCs", category: "Biochemistry" },
    { id: 2, word: "NEPHRON", clueBn: "বৃক্ক বা কিডনির গঠন ও কাজের একক", clueEn: "Structural & functional unit of Kidney", category: "Anatomy" },
    { id: 3, word: "INSULIN", clueBn: "অগ্ন্যাশয়ের আইলেটস অব ল্যাঙ্গারহ্যান্সের বিটা কোষ নিঃসৃত হরমোন", clueEn: "Glucose lowering hormone from pancreatic Beta cells", category: "Endocrinology" },
    { id: 4, word: "SYNAPSE", clueBn: "দুটি নিউরনের মধ্যবর্তী সংযোগস্থল", clueEn: "Junction between two communicating neurons", category: "Neuroanatomy" },
    { id: 5, word: "MITOCHONDRIA", clueBn: "কোষের শক্তিঘর বা পাওয়ার হাউজ", clueEn: "Powerhouse of the eukaryotic cell", category: "Cell Biology" },
  ];

  const activeItem = wordBank[currentWordIdx % wordBank.length];

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

  const loadWord = (item: ScrambleWordItem) => {
    const chars = item.word.split("");
    const shuffled = chars
      .map((c, i) => ({ id: i, char: c, used: false }))
      .sort(() => Math.random() - 0.5);

    setAvailableLetters(shuffled);
    setUserLetters([]);
    setFeedback(null);
  };

  const startGame = () => {
    playSound("click");
    setGameState("playing");
    setCurrentWordIdx(0);
    setScore(0);
    setCorrectCount(0);
    setWrongCount(0);
    setTimeRemaining(90);
    loadWord(wordBank[0]);
  };

  const handleSelectLetter = (letterObj: { id: number; char: string; used: boolean }) => {
    if (letterObj.used || feedback !== null) return;

    playSound("click");
    setAvailableLetters((prev) =>
      prev.map((l) => (l.id === letterObj.id ? { ...l, used: true } : l))
    );
    setUserLetters((prev) => [...prev, letterObj.char]);
  };

  const handleRemoveLetter = (charIdx: number) => {
    if (feedback !== null) return;

    playSound("click");
    const removedChar = userLetters[charIdx];
    const newLetters = [...userLetters];
    newLetters.splice(charIdx, 1);
    setUserLetters(newLetters);

    // Free first matching used letter
    setAvailableLetters((prev) => {
      let found = false;
      return prev.map((l) => {
        if (!found && l.char === removedChar && l.used) {
          found = true;
          return { ...l, used: false };
        }
        return l;
      });
    });
  };

  const checkAnswer = () => {
    const entered = userLetters.join("");
    if (entered === activeItem.word) {
      playSound("correct");
      setFeedback("correct");
      setScore((s) => s + 150);
      setCorrectCount((c) => c + 1);

      setTimeout(() => {
        if (currentWordIdx + 1 >= wordBank.length) {
          endGame();
        } else {
          const next = currentWordIdx + 1;
          setCurrentWordIdx(next);
          loadWord(wordBank[next]);
        }
      }, 800);
    } else {
      playSound("incorrect");
      setFeedback("wrong");
      setWrongCount((w) => w + 1);
      setTimeout(() => setFeedback(null), 800);
    }
  };

  const endGame = () => {
    playSound("levelup");
    setGameState("victory");
  };

  const finalizeSession = () => {
    const totalQ = correctCount + wrongCount;
    const accuracy = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;
    const xp = Math.round(score * 1.3);
    const coins = Math.round(score * 0.35);

    const result: GameScoreResult = {
      gameId: "med-word",
      gameTitle: "MedWord: Term Scramble",
      score,
      correctAnswers: correctCount,
      wrongAnswers: wrongCount,
      totalQuestions: totalQ,
      accuracy,
      xpEarned: xp,
      coinsEarned: coins,
      timeSpentSeconds: 90 - timeRemaining,
      comboMax: correctCount,
      mistakes: [],
    };

    onFinishGame(result);
  };

  return (
    <div className="w-full bg-[#081512] border border-teal-500/20 rounded-3xl overflow-hidden shadow-2xl relative font-sans">
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
            <span className="text-xl">🔤</span>
            <span className="font-bold text-white uppercase hidden sm:inline">
              {isBn ? "মেড-ওয়ার্ড টার্ম স্ক্র্যাম্বল" : "MedWord Term Scramble"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-6">
          <div className="text-teal-300 font-bold bg-teal-950/40 px-2.5 py-1 rounded-xl border border-teal-500/30">
            🔤 WORD {currentWordIdx + 1} / {wordBank.length}
          </div>

          <div className="flex items-center gap-1.5 text-amber-400 bg-amber-950/40 px-2.5 py-1 rounded-xl border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-bold">{timeRemaining}s</span>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-gray-400 block uppercase leading-none">SCORE</span>
            <span className="font-black text-sm text-[#FFD700]">{score}</span>
          </div>
        </div>
      </div>

      {gameState === "intro" && (
        <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center min-h-[460px] bg-gradient-to-b from-teal-950/30 via-black to-black">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-teal-600 to-emerald-600 flex items-center justify-center text-5xl shadow-[0_0_30px_rgba(20,184,166,0.5)] mb-6">
            🔤
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider mb-2 font-display">
            {isBn ? "মেড-ওয়ার্ড: অ্যানাটমিক্যাল টার্ম স্ক্র্যাম্বল" : "MedWord: Term Scramble"}
          </h2>
          <p className="text-sm text-gray-300 max-w-lg mb-6 leading-relaxed">
            {isBn
              ? "ক্লু ও সংজ্ঞা দেখে এলোমেলো অক্ষরগুলো সঠিক ক্রমানুসারে সাজিয়ে অ্যানাটমিক্যাল ও বায়োলজিক্যাল টার্ম উদ্ধার করো!"
              : "Unscramble medical terminology, organ names, and biochemistry molecules using clinical definition clues!"}
          </p>

          <button
            onClick={startGame}
            className="px-8 py-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-[0_0_25px_rgba(20,184,166,0.6)] transition cursor-pointer flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isBn ? "টার্ম পাজল শুরু করুন" : "START PUZZLE"}</span>
          </button>
        </div>
      )}

      {gameState === "playing" && (
        <div className="p-4 sm:p-6 space-y-6 max-w-2xl mx-auto text-center">
          {/* Definition Clue Banner */}
          <div className="bg-black/60 border border-teal-500/30 rounded-2xl p-4 sm:p-5 space-y-2">
            <span className="text-[10px] font-mono text-teal-400 uppercase tracking-widest font-bold block">
              {activeItem.category} CLUE
            </span>
            <h3 className="text-base sm:text-lg font-bold text-white leading-relaxed">
              {isBn ? activeItem.clueBn : activeItem.clueEn}
            </h3>
          </div>

          {/* User Letter Input Slots */}
          <div className="flex flex-wrap items-center justify-center gap-2 min-h-[56px] p-3 bg-black/40 rounded-2xl border border-white/10">
            {userLetters.length === 0 ? (
              <span className="text-xs font-mono text-gray-500">
                {isBn ? "নিচের অক্ষরগুলোতে ক্লিক করে শব্দ গঠন করুন" : "Click letters below to construct the word"}
              </span>
            ) : (
              userLetters.map((char, idx) => (
                <button
                  key={idx}
                  onClick={() => handleRemoveLetter(idx)}
                  className={`w-10 h-11 rounded-xl font-mono text-base font-black border flex items-center justify-center cursor-pointer transition transform hover:scale-105 ${
                    feedback === "correct"
                      ? "bg-emerald-950 border-emerald-500 text-emerald-300"
                      : feedback === "wrong"
                      ? "bg-red-950 border-red-500 text-red-300"
                      : "bg-teal-950/80 border-teal-500/50 text-teal-200"
                  }`}
                >
                  {char}
                </button>
              ))
            )}
          </div>

          {/* Available Letter Pool */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {availableLetters.map((letterObj) => (
              <button
                key={letterObj.id}
                disabled={letterObj.used}
                onClick={() => handleSelectLetter(letterObj)}
                className={`w-11 h-12 rounded-xl font-mono text-base font-black border transition cursor-pointer ${
                  letterObj.used
                    ? "bg-black/20 border-white/5 text-gray-700 opacity-20 pointer-events-none"
                    : "bg-black/80 border-white/20 text-white hover:border-teal-400 hover:bg-teal-950/40"
                }`}
              >
                {letterObj.char}
              </button>
            ))}
          </div>

          {/* Action Check Button */}
          <div className="pt-4 flex items-center justify-center gap-3">
            <button
              onClick={() => loadWord(activeItem)}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-gray-300 rounded-xl font-mono text-xs font-bold transition cursor-pointer"
            >
              {isBn ? "রিসেট অক্ষর" : "Reset Letters"}
            </button>
            <button
              disabled={userLetters.length === 0}
              onClick={checkAnswer}
              className="px-6 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-mono text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg transition cursor-pointer disabled:opacity-40"
            >
              {isBn ? "শব্দ যাচাই করুন" : "Check Word"}
            </button>
          </div>
        </div>
      )}

      {gameState === "victory" && (
        <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center min-h-[460px] bg-gradient-to-b from-black via-[#111111] to-black">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-4xl shadow-[0_0_25px_rgba(20,184,166,0.5)] mb-4">
            🏆
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider mb-1 font-display">
            {isBn ? "টার্ম পাজল সম্পন্ন!" : "WORD PUZZLE COMPLETE!"}
          </h2>
          <p className="text-xs text-gray-400 font-mono mb-6">
            {courseName} • MedWord Terminology Mastery
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg w-full mb-6 font-mono text-center">
            <div className="bg-black/60 p-3.5 rounded-xl border border-white/10">
              <span className="text-gray-500 block text-[10px] uppercase">Score</span>
              <span className="text-lg font-black text-[#FFD700]">{score}</span>
            </div>
            <div className="bg-black/60 p-3.5 rounded-xl border border-white/10">
              <span className="text-gray-500 block text-[10px] uppercase">Words Solved</span>
              <span className="text-lg font-bold text-teal-400">{correctCount}</span>
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
              <span className="text-gray-500 block text-[10px] uppercase">Status</span>
              <span className="text-lg font-bold text-[#FFD700]">
                {correctCount >= 3 ? "MASTERED" : "PRACTICED"}
              </span>
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
              className="px-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-mono text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg transition cursor-pointer flex items-center gap-2"
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
