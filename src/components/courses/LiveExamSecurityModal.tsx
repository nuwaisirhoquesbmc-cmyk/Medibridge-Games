import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShieldCheck, ShieldAlert, AlertTriangle, AlertOctagon, RotateCcw, CheckCircle2, ArrowRight, EyeOff, Lock } from "lucide-react";
import { ExamViolationRecord } from "../../types/courseTypes";

interface TabSwitchWarningModalProps {
  isOpen: boolean;
  violationCount: number;
  maxAllowed: number;
  customMessage?: string;
  detectedType?: string;
  language: "bn" | "en";
  onReturnToExam: () => void;
}

export function TabSwitchWarningModal({
  isOpen,
  violationCount,
  maxAllowed,
  customMessage,
  detectedType = "TAB_SWITCH",
  language,
  onReturnToExam,
}: TabSwitchWarningModalProps) {
  if (!isOpen) return null;

  const isBn = language === "bn";
  const isLastWarning = violationCount === maxAllowed - 1;

  const getDetectedLabel = () => {
    switch (detectedType) {
      case "WINDOW_BLUR":
        return isBn ? "উইন্ডো ফোকাস হারানো (Window Blur)" : "Window Focus Lost";
      case "PAGE_HIDDEN":
        return isBn ? "ট্যাব মিনিমাইজ / লুকানো (Page Hidden)" : "Page Hidden / Minimized";
      case "APP_BACKGROUND":
        return isBn ? "অ্যাপ ব্যাকগ্রাউন্ড ট্রানজিশন" : "App Sent to Background";
      default:
        return isBn ? "ট্যাব পরিবর্তন (Tab Switch)" : "Tab Switch Detected";
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={`w-full max-w-lg rounded-2xl border p-6 sm:p-8 shadow-2xl text-center space-y-6 font-sans relative overflow-hidden ${
            isLastWarning
              ? "bg-[#180808] border-red-500/80 shadow-[0_0_50px_rgba(239,68,68,0.35)]"
              : "bg-[#141208] border-amber-500/60 shadow-[0_0_40px_rgba(245,158,11,0.25)]"
          }`}
        >
          {/* Top glowing accent bar */}
          <div
            className={`absolute top-0 left-0 right-0 h-1.5 ${
              isLastWarning
                ? "bg-gradient-to-r from-red-600 via-rose-500 to-red-600 animate-pulse"
                : "bg-gradient-to-r from-amber-500 via-[#FFD700] to-amber-500"
            }`}
          />

          {/* Icon Badge */}
          <div className="flex justify-center pt-2">
            <div
              className={`w-20 h-20 rounded-2xl flex items-center justify-center border transition-all ${
                isLastWarning
                  ? "bg-red-950/60 border-red-500 text-red-400 shadow-[0_0_25px_rgba(239,68,68,0.5)] animate-bounce"
                  : "bg-amber-950/60 border-amber-500/60 text-[#FFD700] shadow-[0_0_20px_rgba(245,158,11,0.3)]"
              }`}
            >
              {isLastWarning ? (
                <ShieldAlert className="w-10 h-10" />
              ) : (
                <AlertTriangle className="w-10 h-10" />
              )}
            </div>
          </div>

          {/* Header & Title */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 border border-white/10 font-mono text-[11px] font-bold text-gray-300 uppercase">
              <EyeOff className="w-3.5 h-3.5 text-amber-400" />
              <span>{getDetectedLabel()}</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white font-display uppercase tracking-tight">
              {violationCount === 1
                ? isBn
                  ? "⚠️ পরীক্ষার পেজ পরিবর্তন হয়েছে"
                  : "⚠️ EXAM TAB CHANGED"
                : isBn
                ? "⚠️ দ্বিতীয় সতর্কতা (SECOND WARNING)"
                : "⚠️ SECOND WARNING"}
            </h2>

            <div className="text-sm sm:text-base font-semibold text-gray-200 leading-relaxed max-w-md mx-auto">
              {violationCount === 1 ? (
                <>
                  <p className="text-[#FFD700] font-medium text-base">
                    {isBn ? "আপনি পরীক্ষার পেজ থেকে বের হয়েছেন।" : "You have left the active exam page."}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-400 mt-1">
                    {customMessage ||
                      (isBn
                        ? "পরীক্ষার সময় অন্য Tab বা Window ব্যবহার করা অনুমোদিত নয়।"
                        : "Using other tabs or windows during an active exam is not allowed.")}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-red-400 font-bold text-base animate-pulse">
                    {isBn
                      ? "আর ১ বার Exam Tab পরিবর্তন করলে আপনার পরীক্ষা স্বয়ংক্রিয়ভাবে Submit হয়ে যাবে।"
                      : "Switching tabs 1 more time will automatically submit your exam."}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-400 mt-1">
                    {isBn
                      ? "অনুগ্রহ করে এই পেজে থাকুন এবং মনোযোগ দিয়ে পরীক্ষা সম্পন্ন করুন।"
                      : "Please remain on this exam tab to avoid automatic submission."}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Violation Counter Badge */}
          <div className="bg-black/70 border border-white/10 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-gray-400 uppercase font-bold">
                {isBn ? "ট্যাব পরিবর্তন (Tab Switch):" : "Tab Switches:"}
              </span>
              <span
                className={`text-base font-black px-3 py-1 rounded-lg border font-mono ${
                  isLastWarning
                    ? "bg-red-950/80 border-red-500 text-red-300 animate-pulse"
                    : "bg-amber-950/80 border-amber-500/60 text-[#FFD700]"
                }`}
              >
                {violationCount} / {maxAllowed}
              </span>
            </div>

            {/* Visual violation step dots */}
            <div className="flex items-center gap-2 pt-1">
              {Array.from({ length: maxAllowed }).map((_, idx) => {
                const isTriggered = idx < violationCount;
                const isNextTerminal = idx === violationCount && isLastWarning;
                return (
                  <div
                    key={idx}
                    className={`h-2 flex-1 rounded-full transition-all ${
                      isTriggered
                        ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]"
                        : isNextTerminal
                        ? "bg-amber-500/50 border border-amber-500 animate-pulse"
                        : "bg-white/10"
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              onClick={onReturnToExam}
              className={`w-full py-3.5 px-6 font-black font-display text-sm uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2 ${
                isLastWarning
                  ? "bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)] border border-red-400"
                  : "bg-[#FFD700] hover:bg-yellow-400 text-black shadow-[0_0_20px_rgba(255,215,0,0.4)]"
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              <span>{isBn ? "পরীক্ষায় ফিরে যান (RETURN TO EXAM)" : "RETURN TO EXAM"}</span>
            </button>
          </div>

          {/* Fair play reminder */}
          <div className="text-[10px] font-mono text-gray-500 flex items-center justify-center gap-1.5 pt-1">
            <Lock className="w-3 h-3 text-gray-500" />
            <span>{isBn ? "মেডিব্রিজ লাইভ এক্সাম সিকিউর ফোকাস ট্র্যাকিং" : "MediBridge Live Exam Focus & Tab Monitoring"}</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

interface AutoSubmittedDueToViolationModalProps {
  isOpen: boolean;
  answeredCount: number;
  notAnsweredCount: number;
  totalQuestions: number;
  score?: number;
  correctCount?: number;
  wrongCount?: number;
  violationCount?: number;
  maxAllowed?: number;
  customMessage?: string;
  language: "bn" | "en";
  onViewResults: () => void;
}

export function AutoSubmittedDueToViolationModal({
  isOpen,
  answeredCount,
  notAnsweredCount,
  totalQuestions,
  score,
  correctCount,
  wrongCount,
  violationCount = 3,
  maxAllowed = 3,
  customMessage,
  language,
  onViewResults,
}: AutoSubmittedDueToViolationModalProps) {
  if (!isOpen) return null;

  const isBn = language === "bn";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-lg flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="w-full max-w-md bg-[#160606] border-2 border-red-500 rounded-3xl p-6 sm:p-8 shadow-[0_0_60px_rgba(239,68,68,0.45)] text-center space-y-5 font-sans relative overflow-hidden"
        >
          {/* Top glowing bar */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-600 via-rose-500 to-red-600 animate-pulse" />

          {/* Icon Badge */}
          <div className="flex justify-center pt-1">
            <div className="w-16 h-16 rounded-2xl bg-red-950/80 border-2 border-red-500 text-red-400 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.6)]">
              <AlertOctagon className="w-9 h-9 animate-pulse" />
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-1.5">
            <span className="px-3 py-1 rounded-full bg-red-950/80 border border-red-500/60 font-mono text-[10px] font-bold text-red-300 uppercase tracking-widest">
              TAB VIOLATION LIMIT REACHED
            </span>

            <h2 className="text-xl sm:text-2xl font-black text-white font-display uppercase tracking-tight">
              {isBn ? "🚨 পরীক্ষা স্বয়ংক্রিয়ভাবে জমা হয়েছে" : "🚨 EXAM AUTO-SUBMITTED"}
            </h2>

            <p className="text-xs text-gray-300 leading-relaxed font-medium">
              {customMessage ||
                (isBn
                  ? `${violationCount} বার Exam Tab পরিবর্তন করার কারণে আপনার পরীক্ষা স্বয়ংক্রিয়ভাবে Submit করা হয়েছে।`
                  : `Your exam was automatically submitted due to switching tabs ${violationCount} times.`)}
            </p>
          </div>

          {/* Saved Answers Breakdown */}
          <div className="bg-black/70 border border-white/10 rounded-2xl p-4 space-y-3 font-mono">
            <div className="text-xs font-bold text-gray-400 border-b border-white/10 pb-2 flex items-center justify-between uppercase">
              <span>{isBn ? "নম্বর ও মূল্যায়ন (উত্তর অনুযায়ী)" : "Evaluation (Attempted Only)"}</span>
              <span className="text-red-400 font-bold">
                {isBn ? `ট্যাব সুইচ: ${violationCount} / ${maxAllowed}` : `Tab Switches: ${violationCount} / ${maxAllowed}`}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-emerald-950/50 border border-emerald-500/30 rounded-xl">
                <span className="text-[9px] text-emerald-400 uppercase font-bold block">
                  {isBn ? "উত্তরকৃত" : "Answered"}
                </span>
                <span className="text-base font-black text-emerald-300">{answeredCount}</span>
              </div>

              <div className="p-2 bg-black/60 border border-white/10 rounded-xl">
                <span className="text-[9px] text-gray-400 uppercase font-bold block">
                  {isBn ? "অনুত্তরকৃত" : "Blank"}
                </span>
                <span className="text-base font-black text-gray-300">{notAnsweredCount}</span>
              </div>

              <div className="p-2 bg-black/60 border border-white/10 rounded-xl">
                <span className="text-[9px] text-gray-400 uppercase font-bold block">
                  {isBn ? "মোট প্রশ্ন" : "Total Qs"}
                </span>
                <span className="text-base font-black text-white">{totalQuestions}</span>
              </div>
            </div>

            {score !== undefined && (
              <div className="p-2.5 bg-gradient-to-r from-amber-950/40 via-black to-emerald-950/40 border border-amber-500/30 rounded-xl flex items-center justify-between px-3">
                <span className="text-[10px] text-gray-300 uppercase font-bold">
                  {isBn ? "উত্তর অনুযায়ী প্রাপ্ত স্কোর:" : "Calculated Score:"}
                </span>
                <span className="text-base font-black text-[#FFD700]">
                  {score} <span className="text-[10px] text-gray-400 font-normal">/ {totalQuestions}</span>
                </span>
              </div>
            )}

            <p className="text-[10px] text-emerald-400/90 pt-1 text-left flex items-start gap-1.5 leading-snug">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                {isBn
                  ? "যে কয়টি প্রশ্নের উত্তর দিয়েছেন সেগুলোর ভিত্তিতেই নম্বর হিসাব করা হয়েছে। অনুত্তরকৃত প্রশ্নে কোনো নম্বর কাটা হয়নি।"
                  : "Marks calculated strictly based on your attempted questions. Blank questions received 0 penalty."}
              </span>
            </p>
          </div>

          {/* Action Button */}
          <div className="pt-1">
            <button
              onClick={onViewResults}
              className="w-full py-3 px-6 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black font-display text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-[0_0_25px_rgba(239,68,68,0.5)] flex items-center justify-center gap-2 border border-red-400"
            >
              <span>{isBn ? "ফলাফল ও সমাধান দেখুন" : "VIEW SCORECARD & SOLUTIONS"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

interface LiveExamSecurityBadgeProps {
  violationCount: number;
  maxAllowed: number;
  isEnabled: boolean;
  language: "bn" | "en";
}

export function LiveExamSecurityBadge({
  violationCount,
  maxAllowed,
  isEnabled,
  language,
}: LiveExamSecurityBadgeProps) {
  const isBn = language === "bn";

  if (!isEnabled) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-900/60 border border-white/10 font-mono text-[10px] text-gray-400">
        <Lock className="w-3 h-3 text-gray-500" />
        <span>{isBn ? "মনিটরিং স্ট্যান্ডার্ড" : "Standard Mode"}</span>
      </div>
    );
  }

  if (violationCount === 0) {
    return (
      <div
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-500/40 font-mono text-[10px] font-bold text-emerald-400 transition"
        title={isBn ? "পরীক্ষার ট্যাব ও ফোকাস সিকিউর মনিটরিং সক্রিয়" : "Exam tab and focus monitoring active"}
      >
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>{isBn ? "🛡️ সিকিউর এক্সাম" : "🛡 Exam Secure"}</span>
      </div>
    );
  }

  const isTerminalWarning = violationCount >= maxAllowed - 1;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-mono text-[10px] font-black transition ${
        isTerminalWarning
          ? "bg-red-950/70 border-red-500 text-red-300 shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse"
          : "bg-amber-950/60 border-amber-500/60 text-[#FFD700] animate-pulse"
      }`}
      title={isBn ? `ট্যাব সতর্কতা: ${violationCount}/${maxAllowed}` : `Tab Violation: ${violationCount}/${maxAllowed}`}
    >
      <AlertTriangle className={`w-3.5 h-3.5 ${isTerminalWarning ? "text-red-400" : "text-[#FFD700]"}`} />
      <span>
        {isBn
          ? `⚠️ সতর্কতা ${violationCount}/${maxAllowed}`
          : `⚠️ Warning ${violationCount}/${maxAllowed}`}
      </span>
    </div>
  );
}
