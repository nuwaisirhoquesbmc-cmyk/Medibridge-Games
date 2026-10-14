import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock, BookOpen, Award, Zap, Lightbulb } from "lucide-react";

interface BattleQuestionLog {
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  selectedAnswerIndex: number | null;
  explanation?: string;
  subject: string;
  chapter: string;
}

interface BattleLog {
  id: string;
  timestamp: string;
  subject: string;
  chapter: string;
  realm: string;
  battleType: string;
  xpEarned: number;
  coinsEarned: number;
  score: string;
  success: boolean;
  questions: BattleQuestionLog[];
}

interface BattleReplayModalProps {
  battle: BattleLog;
  onClose: () => void;
  language: "bn" | "en";
}

export default function BattleReplayModal({ battle, onClose, language }: BattleReplayModalProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const isBn = language === "bn";

  const totalQuestions = battle.questions.length;
  const currentQ = battle.questions[currentIdx];

  // Helper to format timestamps
  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(isBn ? "bn-BD" : "en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isBn ? "আজ" : "Today";
    }
  };

  const handleNext = () => {
    if (currentIdx < totalQuestions - 1) {
      setCurrentIdx((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx((prev) => prev - 1);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", duration: 0.4 }}
          className="bg-[#111111] border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden relative shadow-[0_0_50px_rgba(193,18,31,0.25)] flex flex-col my-8"
        >
          {/* Top aesthetic gradient beam */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#C1121F] via-[#FFD700] to-[#C1121F]"></div>

          {/* Header section */}
          <div className="p-5 md:p-6 border-b border-white/5 flex justify-between items-start gap-4">
            <div>
              <div className="flex flex-wrap gap-2 items-center mb-1.5">
                <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                  battle.success 
                    ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20" 
                    : "text-[#C1121F] bg-[#C1121F]/10 border border-[#C1121F]/20"
                }`}>
                  {battle.success 
                    ? (isBn ? "● সাকসেস মিশন" : "● SUCCESS CAMPAIGN") 
                    : (isBn ? "● ট্রায়াল শেষ" : "● TRIAL ELIMINATION")
                  }
                </span>
                <span className="text-[10px] text-gray-400 font-mono font-semibold">
                  {formatTime(battle.timestamp)}
                </span>
              </div>
              <h2 className="text-lg md:text-xl font-black text-white font-display tracking-tight uppercase leading-snug">
                {battle.battleType}
              </h2>
              <p className="text-xs text-gray-400 font-sans mt-0.5">
                {battle.realm} • {battle.chapter}
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-gray-400 hover:text-white rounded-lg transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Performance scorecard strip */}
          <div className="grid grid-cols-3 divide-x divide-white/5 bg-[#0A0A0A] border-b border-white/5 py-3 text-center text-xs font-mono font-bold">
            <div>
              <span className="block text-[8px] text-gray-500 uppercase tracking-widest">{isBn ? "ভর্তি স্কোর" : "FINAL SCORE"}</span>
              <span className={`text-base font-black ${battle.success ? "text-emerald-400" : "text-amber-500"}`}>{battle.score}</span>
            </div>
            <div>
              <span className="block text-[8px] text-gray-500 uppercase tracking-widest">{isBn ? "অর্জিত এক্সপি" : "XP REWARDS"}</span>
              <span className="text-base font-black text-[#FFD700]">+{battle.xpEarned} XP</span>
            </div>
            <div>
              <span className="block text-[8px] text-gray-500 uppercase tracking-widest">{isBn ? "গোল্ড স্পয়ল" : "GOLD SPOILS"}</span>
              <span className="text-base font-black text-white">+{battle.coinsEarned} Coins</span>
            </div>
          </div>

          {/* Quick interactive question navigation track */}
          <div className="bg-[#0D0D0D] p-3 border-b border-white/5 flex flex-wrap gap-1.5 justify-center">
            {battle.questions.map((q, idx) => {
              const isCorrect = q.selectedAnswerIndex === q.correctAnswerIndex;
              const isCurrent = idx === currentIdx;
              const isUnanswered = q.selectedAnswerIndex === null || q.selectedAnswerIndex === -1;

              let buttonStyle = "bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10";
              if (isCorrect) {
                buttonStyle = "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20";
              } else if (isUnanswered) {
                buttonStyle = "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20";
              } else {
                buttonStyle = "bg-[#C1121F]/10 border-[#C1121F]/30 text-[#C1121F] hover:bg-[#C1121F]/20";
              }

              return (
                <button
                  key={idx}
                  onClick={() => setCurrentIdx(idx)}
                  className={`w-8 h-8 rounded-lg border font-mono text-xs font-black transition cursor-pointer flex items-center justify-center relative ${buttonStyle} ${
                    isCurrent ? "ring-2 ring-[#FFD700] scale-105" : ""
                  }`}
                >
                  {idx + 1}
                  {isCurrent && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#FFD700] rounded-full"></span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Replay display workspace */}
          <div className="p-5 md:p-6 space-y-5 overflow-y-auto max-h-[380px] flex-1">
            {/* Question Text card */}
            <div className="bg-black/25 border border-white/5 p-4 rounded-xl relative overflow-hidden">
              <span className="absolute top-0 right-0 p-1.5 bg-white/[0.02] text-white/10 font-mono text-xs font-black uppercase">
                Q {currentIdx + 1}
              </span>
              <p className="text-sm font-bold text-white leading-relaxed font-sans pr-6">
                {currentQ.questionText}
              </p>
            </div>

            {/* Answer Options Grid */}
            <div className="space-y-2.5">
              {currentQ.options.map((opt, oIdx) => {
                const isCorrectOption = oIdx === currentQ.correctAnswerIndex;
                const isSelectedOption = oIdx === currentQ.selectedAnswerIndex;
                const isCorrectAnswered = currentQ.selectedAnswerIndex === currentQ.correctAnswerIndex;

                let optCardStyle = "bg-[#0A0A0A] border-white/5 text-gray-300";
                let badge = null;

                if (isCorrectOption) {
                  optCardStyle = "bg-emerald-950/15 border-emerald-500/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.06)]";
                  badge = (
                    <span className="ml-auto flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[9px] px-1.5 py-0.5 rounded font-black tracking-wide uppercase">
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                      {isBn ? "সঠিক উত্তর" : "CORRECT ANSWER"}
                    </span>
                  );
                } else if (isSelectedOption && !isCorrectAnswered) {
                  optCardStyle = "bg-red-950/10 border-[#C1121F]/40 text-red-300 shadow-[0_0_12px_rgba(193,18,31,0.06)]";
                  badge = (
                    <span className="ml-auto flex items-center gap-1 bg-[#C1121F]/10 border border-[#C1121F]/20 text-[#C1121F] font-mono text-[9px] px-1.5 py-0.5 rounded font-black tracking-wide uppercase">
                      <XCircle className="w-3 h-3 shrink-0" />
                      {isBn ? "আপনার উত্তর" : "YOUR ANSWER"}
                    </span>
                  );
                } else if (isSelectedOption && isCorrectAnswered) {
                  optCardStyle = "bg-emerald-950/15 border-emerald-500/40 text-emerald-300";
                  badge = (
                    <span className="ml-auto flex items-center gap-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-mono text-[9px] px-1.5 py-0.5 rounded font-black tracking-wide uppercase">
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                      {isBn ? "সঠিক ও আপনার উত্তর" : "MATCHED TARGET"}
                    </span>
                  );
                }

                return (
                  <div
                    key={oIdx}
                    className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all duration-300 text-xs md:text-sm font-sans ${optCardStyle}`}
                  >
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center font-mono font-black text-[10px] shrink-0 border ${
                      isCorrectOption 
                        ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                        : (isSelectedOption && !isCorrectAnswered)
                          ? "bg-[#C1121F]/20 border-[#C1121F] text-[#C1121F]"
                          : "bg-white/5 border-white/10 text-gray-500"
                    }`}>
                      {String.fromCharCode(65 + oIdx)}
                    </div>
                    <span className="font-semibold leading-relaxed">{opt}</span>
                    {badge}
                  </div>
                );
              })}
            </div>

            {/* Timeout warning indicator if applicable */}
            {(currentQ.selectedAnswerIndex === null || currentQ.selectedAnswerIndex === -1) && (
              <div className="bg-amber-950/10 border border-amber-500/20 text-amber-400 p-3 rounded-xl flex items-center gap-2 text-xs font-mono">
                <Clock className="w-4 h-4 animate-pulse shrink-0" />
                <span>
                  {isBn 
                    ? "⚠️ সময় সীমা শেষ হওয়ার কারণে এই প্রশ্নের কোনো উত্তর সিলেক্ট করা হয়নি।" 
                    : "⚠️ Time limit expired. No option was locked in for this testing variable."}
                </span>
              </div>
            )}

            {/* In-depth Medical Explanation Block */}
            <div className="bg-[#0A0A0A] border border-white/5 p-4 rounded-xl space-y-2.5 font-sans">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#FFD700] uppercase border-b border-white/5 pb-2">
                <Lightbulb className="w-3.5 h-3.5 text-yellow-500 animate-pulse" />
                {isBn ? "মেডিকেল টেক্সটবুক রেফারেন্স ব্যাখ্যা" : "CLINICAL REFERENCE EXPLANATION"}
              </div>
              <p className="text-gray-300 text-xs md:text-sm leading-relaxed whitespace-pre-wrap">
                {currentQ.explanation || (isBn ? "এই প্রশ্নটির জন্য কোনো অতিরিক্ত ব্যাখ্যা ডাটাবেজে সংযুক্ত করা হয়নি।" : "No detailed textbook explanation documented for this specific medical entry.")}
              </p>
            </div>
          </div>

          {/* Footer controls */}
          <div className="p-4 border-t border-white/5 bg-[#0A0A0A] flex justify-between items-center gap-4">
            <button
              onClick={handlePrev}
              disabled={currentIdx === 0}
              className="px-4 py-2.5 bg-white/5 hover:bg-white/10 disabled:opacity-40 border border-white/10 hover:border-white/20 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>{isBn ? "পূর্ববর্তী" : "PREVIOUS"}</span>
            </button>

            <span className="text-xs font-mono font-black text-gray-500">
              {currentIdx + 1} / {totalQuestions}
            </span>

            <button
              onClick={handleNext}
              disabled={currentIdx === totalQuestions - 1}
              className="px-4 py-2.5 bg-white/5 hover:bg-white/10 disabled:opacity-40 border border-white/10 hover:border-white/20 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>{isBn ? "পরবর্তী" : "NEXT"}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
