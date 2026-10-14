import React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertTriangle,
  Send,
  Clock,
  CheckCircle2,
  HelpCircle,
  Bookmark,
  ArrowRight,
  ShieldAlert,
  X,
  RotateCcw
} from "lucide-react";
import { playSound } from "../../audio";

interface LiveExamSubmitConfirmModalProps {
  isOpen: boolean;
  examTitle: string;
  totalQuestions: number;
  answeredCount: number;
  reviewedCount?: number;
  bookmarkedCount?: number;
  timeRemainingSeconds: number;
  unansweredIndices?: number[]; // 0-indexed question indices
  language: "bn" | "en";
  isDark?: boolean;
  onClose: () => void;
  onConfirmSubmit: () => void;
  onJumpToQuestion?: (questionIndex: number) => void;
}

export function LiveExamSubmitConfirmModal({
  isOpen,
  examTitle,
  totalQuestions,
  answeredCount,
  reviewedCount = 0,
  bookmarkedCount = 0,
  timeRemainingSeconds,
  unansweredIndices = [],
  language,
  isDark = false,
  onClose,
  onConfirmSubmit,
  onJumpToQuestion,
}: LiveExamSubmitConfirmModalProps) {
  if (!isOpen) return null;

  const isBn = language === "bn";
  const unattemptedCount = Math.max(0, totalQuestions - answeredCount);
  const attemptedPercentage = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  const formatTime = (secs: number) => {
    const m = Math.floor(Math.max(0, secs) / 60);
    const s = Math.max(0, secs) % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={`w-full max-w-lg rounded-3xl border shadow-2xl p-5 sm:p-7 space-y-5 font-sans relative overflow-hidden my-auto ${
            isDark
              ? "bg-[#141414] text-white border-white/15 shadow-black/80"
              : "bg-white text-slate-900 border-slate-200 shadow-xl"
          }`}
        >
          {/* Top Decorative Header Accent */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#C1121F] via-amber-500 to-emerald-500" />

          {/* Close button */}
          <button
            onClick={() => {
              playSound("click");
              onClose();
            }}
            className={`absolute top-4 right-4 p-1.5 rounded-full transition cursor-pointer ${
              isDark
                ? "bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white"
                : "bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900"
            }`}
            title={isBn ? "বন্ধ করুন" : "Close"}
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header Section */}
          <div className="text-center space-y-2 pt-1">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto shadow-sm ${
                unattemptedCount > 0
                  ? isDark
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                  : isDark
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
              }`}
            >
              {unattemptedCount > 0 ? (
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              ) : (
                <CheckCircle2 className="w-6 h-6" />
              )}
            </div>

            <div>
              <h3
                className={`text-lg sm:text-xl font-black font-display uppercase tracking-tight ${
                  isDark ? "text-white" : "text-slate-900"
                }`}
              >
                {isBn ? "লাইভ পরীক্ষা সাবমিট নিশ্চিতকরণ" : "CONFIRM LIVE EXAM SUBMISSION"}
              </h3>
              <p
                className={`text-xs font-mono truncate max-w-sm mx-auto mt-0.5 ${
                  isDark ? "text-gray-400" : "text-slate-500"
                }`}
              >
                {examTitle}
              </p>
            </div>
          </div>

          {/* Time Remaining Bar */}
          <div
            className={`flex items-center justify-between px-4 py-2.5 rounded-2xl border font-mono text-xs ${
              timeRemainingSeconds <= 120
                ? isDark
                  ? "bg-red-950/40 border-red-500/50 text-red-300"
                  : "bg-red-50 border-red-200 text-red-700"
                : isDark
                ? "bg-black/40 border-white/10 text-gray-300"
                : "bg-slate-50 border-slate-200 text-slate-700"
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className={`w-4 h-4 ${timeRemainingSeconds <= 120 ? "text-red-500 animate-spin" : "text-[#C1121F]"}`} />
              <span className="font-bold">{isBn ? "হাতে থাকা সময়:" : "Time Remaining:"}</span>
            </div>
            <span
              className={`font-black text-sm ${
                timeRemainingSeconds <= 120 ? "text-red-500 animate-pulse" : isDark ? "text-amber-400" : "text-slate-900"
              }`}
            >
              {formatTime(timeRemainingSeconds)}
            </span>
          </div>

          {/* Overview Stat Cards */}
          <div className="grid grid-cols-3 gap-2 font-mono text-center">
            {/* Attempted */}
            <div
              className={`p-3 rounded-2xl border transition-all ${
                isDark
                  ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-400"
                  : "bg-emerald-50 border-emerald-200 text-emerald-800"
              }`}
            >
              <div className="flex items-center justify-center gap-1 text-[10px] uppercase font-bold mb-0.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                <span>{isBn ? "উত্তরকৃত" : "Answered"}</span>
              </div>
              <div className="text-xl font-black">{answeredCount}</div>
              <div className="text-[9px] opacity-75 font-semibold mt-0.5">
                {attemptedPercentage}% {isBn ? "সম্পন্ন" : "done"}
              </div>
            </div>

            {/* Unattempted */}
            <div
              className={`p-3 rounded-2xl border transition-all ${
                unattemptedCount > 0
                  ? isDark
                    ? "bg-red-950/40 border-red-500/40 text-red-400 animate-pulse"
                    : "bg-red-50 border-red-200 text-red-700"
                  : isDark
                  ? "bg-black/40 border-white/10 text-gray-400"
                  : "bg-slate-50 border-slate-200 text-slate-600"
              }`}
            >
              <div className="flex items-center justify-center gap-1 text-[10px] uppercase font-bold mb-0.5">
                <HelpCircle className="w-3 h-3 text-red-500 shrink-0" />
                <span>{isBn ? "অনুত্তরিত (বাকি)" : "Unanswered"}</span>
              </div>
              <div className={`text-xl font-black ${unattemptedCount > 0 ? "text-red-500" : ""}`}>
                {unattemptedCount}
              </div>
              <div className="text-[9px] opacity-75 font-semibold mt-0.5">
                {totalQuestions > 0 ? Math.round((unattemptedCount / totalQuestions) * 100) : 0}% {isBn ? "বাকি" : "left"}
              </div>
            </div>

            {/* Review / Total */}
            <div
              className={`p-3 rounded-2xl border transition-all ${
                reviewedCount > 0
                  ? isDark
                    ? "bg-purple-950/40 border-purple-500/30 text-purple-300"
                    : "bg-purple-50 border-purple-200 text-purple-800"
                  : isDark
                  ? "bg-black/40 border-white/10 text-gray-300"
                  : "bg-slate-50 border-slate-200 text-slate-700"
              }`}
            >
              <div className="flex items-center justify-center gap-1 text-[10px] uppercase font-bold mb-0.5">
                <span>🟣</span>
                <span>{isBn ? "রিভিউ / মোট" : "Review / Total"}</span>
              </div>
              <div className="text-xl font-black">
                {reviewedCount > 0 ? `${reviewedCount} / ${totalQuestions}` : totalQuestions}
              </div>
              <div className="text-[9px] opacity-75 font-semibold mt-0.5">
                {bookmarkedCount > 0 ? `★ ${bookmarkedCount} ${isBn ? "বুকমার্কড" : "marked"}` : isBn ? "মোট প্রশ্ন" : "Total MCQs"}
              </div>
            </div>
          </div>

          {/* UNATTEMPTED QUESTIONS SPECIFIC WARNING & JUMP LIST */}
          {unattemptedCount > 0 && (
            <div
              className={`p-3.5 sm:p-4 rounded-2xl border space-y-2.5 ${
                isDark
                  ? "bg-amber-950/30 border-amber-500/40 text-amber-200"
                  : "bg-amber-50/90 border-amber-300 text-amber-900"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <p className="font-bold leading-snug">
                    {isBn
                      ? `সতর্কতা: আপনার এখনও ${unattemptedCount}টি প্রশ্ন উত্তর দেওয়া বাকি রয়েছে!`
                      : `Warning: You have ${unattemptedCount} unattempted question(s)!`}
                  </p>
                  <p className={`text-[11px] leading-relaxed ${isDark ? "text-amber-300/80" : "text-amber-800/90"}`}>
                    {isBn
                      ? "সাবমিট করার পর উত্তর পরিবর্তন করা যাবে না। যদি কোনো প্রশ্ন না পেরে এড়িয়ে যেতে চান, তবে নিশ্চিত হয়ে সাবমিট করুন।"
                      : "Once submitted, your answers are final. If you intentionally skipped questions to avoid negative marking (-0.25), you may proceed."}
                  </p>
                </div>
              </div>

              {/* Quick Jump Buttons to Unanswered Questions */}
              {unansweredIndices.length > 0 && onJumpToQuestion && (
                <div className="pt-1 border-t border-amber-500/20">
                  <div className="flex items-center justify-between text-[11px] font-mono font-bold mb-1.5">
                    <span>{isBn ? "অনুত্তরিত প্রশ্নে যান:" : "Jump to unanswered:"}</span>
                    <span className="text-[10px] opacity-80">
                      {isBn ? "ক্লিক করলে প্রশ্নটি ওপেন হবে" : "Click to view question"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                    {unansweredIndices.slice(0, 15).map((qIdx) => (
                      <button
                        key={qIdx}
                        onClick={() => {
                          playSound("click");
                          onClose();
                          onJumpToQuestion(qIdx);
                        }}
                        className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono font-bold transition cursor-pointer flex items-center gap-1 ${
                          isDark
                            ? "bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/40 text-amber-300 hover:text-white"
                            : "bg-white hover:bg-amber-100 border-amber-300 text-amber-900 shadow-xs"
                        }`}
                        title={isBn ? `প্রশ্ন #${qIdx + 1} এ যান` : `Jump to Question #${qIdx + 1}`}
                      >
                        <span>Q{qIdx + 1}</span>
                        <ArrowRight className="w-2.5 h-2.5" />
                      </button>
                    ))}
                    {unansweredIndices.length > 15 && (
                      <span className="text-[10px] font-mono self-center px-1 opacity-75">
                        +{unansweredIndices.length - 15} {isBn ? "আরও" : "more"}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Scoring Policy Note */}
          <div
            className={`flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-mono ${
              isDark ? "bg-white/5 text-gray-400" : "bg-slate-100 text-slate-600"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-[#C1121F]" />
              <span>{isBn ? "মেডিকেল ভর্তি মার্কিং নিয়ম:" : "MAT Marking Rule:"}</span>
            </div>
            <div className="flex items-center gap-2 font-bold">
              <span className="text-emerald-600 dark:text-emerald-400">+1.00</span>
              <span className="text-gray-400">/</span>
              <span className="text-red-500">-0.25</span>
              <span className="text-gray-400">/</span>
              <span>0.00 {isBn ? "বাকি" : "skip"}</span>
            </div>
          </div>

          {/* Dual Action CTA Buttons */}
          <div className="flex flex-col-reverse sm:flex-row gap-2.5 pt-1">
            <button
              onClick={() => {
                playSound("click");
                onClose();
              }}
              className={`flex-1 py-3 px-4 rounded-xl border text-xs font-mono font-bold transition cursor-pointer flex items-center justify-center gap-2 ${
                isDark
                  ? "bg-white/5 hover:bg-white/10 border-white/10 text-gray-300 hover:text-white"
                  : "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800"
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              <span>{isBn ? "← পরীক্ষা চালিয়ে যান" : "← Continue Exam"}</span>
            </button>

            <button
              onClick={() => {
                playSound("victory");
                onConfirmSubmit();
              }}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-[#C1121F] to-red-600 hover:from-red-600 hover:to-rose-600 text-white text-xs font-mono font-black uppercase tracking-wider rounded-xl transition shadow-lg shadow-red-600/30 cursor-pointer flex items-center justify-center gap-2 border border-red-500"
            >
              <Send className="w-4 h-4" />
              <span>{isBn ? "নিশ্চিত সাবমিট করুন ✓" : "CONFIRM SUBMISSION ✓"}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
