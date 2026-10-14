import React, { useState, useEffect, useRef } from "react";
import { Course, CourseDemoExam } from "../../types/courseTypes";
import { Question } from "../../types";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Clock,
  Award,
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Zap,
  ArrowRight,
  RotateCcw,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  FileCheck,
  Percent,
  TrendingUp,
  ShieldAlert,
  Flame,
  Bookmark,
  Share2
} from "lucide-react";
import { playSound } from "../../audio";
import { getCourseDemoExam } from "../../lib/courseDemoUtils";

export interface FreeDemoExamModalProps {
  course: Course;
  demoExam?: CourseDemoExam;
  language?: "bn" | "en";
  theme?: "light" | "dark";
  onClose: () => void;
  onEnrollNow: (course: Course) => void;
}

export default function FreeDemoExamModal({
  course,
  demoExam,
  language = "bn",
  theme = "dark",
  onClose,
  onEnrollNow
}: FreeDemoExamModalProps) {
  const isBn = language === "bn";
  const activeExam: CourseDemoExam = demoExam || getCourseDemoExam(course);
  const questions: Question[] = activeExam.questions || [];

  const [examState, setExamState] = useState<"intro" | "taking" | "result">("intro");
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [flagged, setFlagged] = useState<Record<number, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(activeExam.durationMinutes * 60);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [showCheatAlert, setShowCheatAlert] = useState(false);
  const [selectedReviewFilter, setSelectedReviewFilter] = useState<"all" | "correct" | "wrong" | "skipped">("all");

  const timerRef = useRef<any>(null);

  // Tab switch detection for realistic medical exam feel
  useEffect(() => {
    if (examState !== "taking") return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitches((prev) => {
          const count = prev + 1;
          setShowCheatAlert(true);
          playSound("wrong");
          return count;
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [examState]);

  // Countdown Timer
  useEffect(() => {
    if (examState === "taking") {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleSubmitExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [examState]);

  const handleStartExam = () => {
    playSound("battle");
    setTimeLeft(activeExam.durationMinutes * 60);
    setAnswers({});
    setFlagged({});
    setCurrentQIndex(0);
    setTabSwitches(0);
    setExamState("taking");
  };

  const handleSelectOption = (qIdx: number, optIdx: number) => {
    playSound("click");
    setAnswers((prev) => {
      if (prev[qIdx] === optIdx) {
        const next = { ...prev };
        delete next[qIdx];
        return next;
      }
      return { ...prev, [qIdx]: optIdx };
    });
  };

  const handleToggleFlag = (qIdx: number) => {
    playSound("click");
    setFlagged((prev) => ({ ...prev, [qIdx]: !prev[qIdx] }));
  };

  const handleSubmitExam = () => {
    playSound("levelup");
    setExamState("result");
  };

  // Calculate Result Metrics
  const totalQ = questions.length;
  let correctCount = 0;
  let wrongCount = 0;
  let skippedCount = 0;

  questions.forEach((q, idx) => {
    const userAns = answers[idx];
    if (userAns === undefined) {
      skippedCount++;
    } else if (userAns === q.correctAnswerIndex) {
      correctCount++;
    } else {
      wrongCount++;
    }
  });

  const negativeMark = activeExam.negativeMarking ?? 0.25;
  const score = Math.max(0, +(correctCount - wrongCount * negativeMark).toFixed(2));
  const accuracy = totalQ > 0 ? Math.round((correctCount / (correctCount + wrongCount || 1)) * 100) : 0;
  const isPassed = score >= activeExam.passMarks;

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-[#101014] border-2 border-amber-500/40 w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] text-white font-sans relative"
      >
        {/* Top Header */}
        <div className="bg-[#16161c] px-5 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-black uppercase text-amber-400 tracking-wider bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                  {isBn ? "১০০% ফ্রি ডেমো টেস্ট" : "100% Free Demo CBT"}
                </span>
                <span className="text-[10px] font-mono text-gray-400">
                  {course.title}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-white line-clamp-1">
                {activeExam.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {examState === "taking" && (
              <div
                className={`px-3 py-1.5 rounded-xl font-mono text-xs font-black flex items-center gap-1.5 border ${
                  timeLeft < 120
                    ? "bg-red-950/80 border-red-500 text-red-400 animate-pulse"
                    : "bg-black/60 border-white/15 text-amber-300"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{formatTimer(timeLeft)}</span>
              </div>
            )}

            <button
              onClick={() => {
                playSound("click");
                onClose();
              }}
              className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Cheat / Tab switch alert overlay */}
        <AnimatePresence>
          {showCheatAlert && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-red-600/90 text-white px-4 py-2 text-xs font-mono font-bold flex items-center justify-between shrink-0"
            >
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-300" />
                <span>
                  {isBn
                    ? `সতর্কতা! আপনি পরীক্ষার উইন্ডো থেকে বের হয়েছিলেন (${tabSwitches} বার)। রিয়েল এক্সামে এটি সংরক্ষিত হয়।`
                    : `Warning: Window switch detected (${tabSwitches}x). Logged for exam integrity.`}
                </span>
              </div>
              <button
                onClick={() => setShowCheatAlert(false)}
                className="text-[10px] uppercase font-bold underline cursor-pointer"
              >
                {isBn ? "ঠিক আছে" : "Dismiss"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal Body */}
        <div className="p-5 sm:p-7 overflow-y-auto flex-1 space-y-6">
          {/* SCREEN 1: INTRO SCREEN */}
          {examState === "intro" && (
            <div className="space-y-6 max-w-2xl mx-auto py-2 text-center">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-amber-500/30 to-red-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-950/40">
                <FileCheck className="w-10 h-10 text-amber-400" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-black text-white font-display">
                  {activeExam.title}
                </h2>
                <p className="text-xs sm:text-sm text-gray-300 leading-relaxed font-sans">
                  {activeExam.description}
                </p>
              </div>

              {/* Exam Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left font-mono">
                <div className="bg-white/5 border border-white/10 p-3 rounded-2xl">
                  <span className="text-[10px] text-gray-400 block uppercase font-bold">মোট প্রশ্ন</span>
                  <span className="text-base font-black text-amber-400">{totalQ} টি MCQ</span>
                </div>
                <div className="bg-white/5 border border-white/10 p-3 rounded-2xl">
                  <span className="text-[10px] text-gray-400 block uppercase font-bold">সময়সীমা</span>
                  <span className="text-base font-black text-cyan-400">{activeExam.durationMinutes} মিনিট</span>
                </div>
                <div className="bg-white/5 border border-white/10 p-3 rounded-2xl">
                  <span className="text-[10px] text-gray-400 block uppercase font-bold">পাস মার্কস</span>
                  <span className="text-base font-black text-emerald-400">{activeExam.passMarks} নম্বর</span>
                </div>
                <div className="bg-white/5 border border-white/10 p-3 rounded-2xl">
                  <span className="text-[10px] text-gray-400 block uppercase font-bold">নেগেটিভ মার্ক</span>
                  <span className="text-base font-black text-red-400">-{activeExam.negativeMarking ?? 0.25} / ভুল</span>
                </div>
              </div>

              {/* Rules / Instructions */}
              <div className="bg-black/40 border border-white/10 p-4 rounded-2xl text-left space-y-2.5">
                <h4 className="text-xs font-mono font-bold text-amber-400 uppercase flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {isBn ? "পরীক্ষার নির্দেশনা ও নিয়মাবলী" : "Exam Guidelines"}
                </h4>
                <ul className="text-xs text-gray-300 space-y-1.5 list-disc list-inside">
                  {activeExam.instructions?.map((inst, i) => (
                    <li key={i}>{inst}</li>
                  )) || (
                    <>
                      <li>প্রতিটি প্রশ্নের মান ১.০০ এবং ভুল উত্তরের জন্য ০.২৫ নম্বর কাটা যাবে।</li>
                      <li>প্রশ্ন প্যালেটের সাহায্যে যেকোনো প্রশ্নে সরাসরি যাওয়া যাবে।</li>
                      <li>পরীক্ষা শেষ হলে সাবমিট বাটনে ক্লিক করুন।</li>
                    </>
                  )}
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleStartExam}
                  className="flex-1 py-3.5 bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-white text-sm font-mono font-extrabold uppercase tracking-wider rounded-2xl transition shadow-xl shadow-amber-950/60 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Zap className="w-4 h-4 fill-white" />
                  <span>{isBn ? "🚀 ফ্রি ডেমো পরীক্ষা শুরু করুন" : "🚀 Start Free Demo Exam"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onEnrollNow(course)}
                  className="py-3.5 px-5 bg-white/10 hover:bg-white/15 border border-white/15 text-gray-200 text-xs font-mono font-bold uppercase rounded-2xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>{isBn ? "কোর্সে ভর্তি হন" : "Enroll Directly"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 2: TAKING EXAM */}
          {examState === "taking" && (
            <div className="space-y-6">
              {/* Question Navigator Grid */}
              <div className="bg-black/50 p-3 rounded-2xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-gray-400">
                    {isBn ? "প্রশ্ন নেভিগেটর" : "Question Navigator"}:{" "}
                    <strong className="text-white">{Object.keys(answers).length} / {totalQ} Answered</strong>
                  </span>
                  <span className="text-amber-400 font-bold">
                    Q {currentQIndex + 1} of {totalQ}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                  {questions.map((_, idx) => {
                    const isAnswered = answers[idx] !== undefined;
                    const isFlagged = flagged[idx];
                    const isCurrent = currentQIndex === idx;

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCurrentQIndex(idx)}
                        className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition flex items-center justify-center cursor-pointer relative ${
                          isCurrent
                            ? "ring-2 ring-amber-400 bg-amber-500 text-black font-black"
                            : isAnswered
                            ? "bg-emerald-600/80 text-white border border-emerald-400/50"
                            : isFlagged
                            ? "bg-amber-600/70 text-white border border-amber-400/50"
                            : "bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5"
                        }`}
                      >
                        {idx + 1}
                        {isFlagged && (
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 absolute top-0.5 right-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Question Card */}
              {questions[currentQIndex] && (
                <div className="bg-[#15151c] p-5 sm:p-6 rounded-3xl border border-white/10 space-y-5">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-400 text-xs font-mono font-bold border border-amber-500/30">
                        Q{currentQIndex + 1}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">
                        {questions[currentQIndex].subject} • {questions[currentQIndex].chapter || "General"}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleFlag(currentQIndex)}
                      className={`text-xs font-mono flex items-center gap-1 px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                        flagged[currentQIndex]
                          ? "bg-amber-500/20 border-amber-500/50 text-amber-400"
                          : "border-white/10 text-gray-400 hover:text-white"
                      }`}
                    >
                      <Bookmark className="w-3 h-3" />
                      <span>{flagged[currentQIndex] ? "Flagged" : "Flag for Review"}</span>
                    </button>
                  </div>

                  {/* Question Text */}
                  <h3 className="text-base sm:text-lg font-bold text-white leading-relaxed">
                    {questions[currentQIndex].questionText}
                  </h3>

                  {/* 4 Options */}
                  <div className="grid gap-2.5">
                    {questions[currentQIndex].options.map((opt, optIdx) => {
                      const isSelected = answers[currentQIndex] === optIdx;
                      const optLabel = ["(ক)", "(খ)", "(গ)", "(ঘ)"][optIdx] || `(${optIdx + 1})`;

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => handleSelectOption(currentQIndex, optIdx)}
                          className={`w-full p-3.5 rounded-2xl border text-left transition flex items-center gap-3 cursor-pointer ${
                            isSelected
                              ? "bg-gradient-to-r from-amber-950/60 to-red-950/40 border-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                              : "bg-black/40 hover:bg-white/5 border-white/10 text-gray-200"
                          }`}
                        >
                          <span
                            className={`w-7 h-7 rounded-xl font-mono text-xs font-bold flex items-center justify-center shrink-0 ${
                              isSelected
                                ? "bg-amber-500 text-black font-black"
                                : "bg-white/10 text-gray-400"
                            }`}
                          >
                            {optLabel}
                          </span>
                          <span className="text-sm font-medium flex-1">{opt}</span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Bottom Pagination & Submit */}
              <div className="flex items-center justify-between gap-3 pt-2 font-mono text-xs">
                <button
                  type="button"
                  disabled={currentQIndex === 0}
                  onClick={() => {
                    playSound("click");
                    setCurrentQIndex((prev) => Math.max(0, prev - 1));
                  }}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none rounded-xl text-gray-300 border border-white/10 flex items-center gap-1.5 cursor-pointer font-bold"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>{isBn ? "পূর্ববর্তী" : "Previous"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSubmitExam}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-950/60 flex items-center gap-1.5 cursor-pointer"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>{isBn ? "পরীক্ষা সাবমিট করুন" : "Submit Exam"}</span>
                </button>

                <button
                  type="button"
                  disabled={currentQIndex === totalQ - 1}
                  onClick={() => {
                    playSound("click");
                    setCurrentQIndex((prev) => Math.min(totalQ - 1, prev + 1));
                  }}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none rounded-xl text-gray-300 border border-white/10 flex items-center gap-1.5 cursor-pointer font-bold"
                >
                  <span>{isBn ? "পরবর্তী" : "Next"}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 3: RESULT & PERFORMANCE REVIEW */}
          {examState === "result" && (
            <div className="space-y-7">
              {/* Scorecard Hero */}
              <div className="bg-gradient-to-br from-[#1c130d] via-[#16141a] to-[#0d0d12] p-6 rounded-3xl border-2 border-amber-500/40 text-center space-y-4 shadow-2xl relative overflow-hidden">
                <div className="flex items-center justify-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-mono font-black uppercase border ${
                      isPassed
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                        : "bg-red-500/20 text-red-400 border-red-500/40"
                    }`}
                  >
                    {isPassed ? (isBn ? "🎉 উত্তীর্ণ (PASSED)" : "PASSED") : (isBn ? "উন্নতি প্রয়োজন (NEEDS PRACTICE)" : "NEEDS PRACTICE")}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-mono text-gray-400 uppercase tracking-widest block mb-1">
                    আপনার মোট অর্জিত নম্বর
                  </span>
                  <div className="text-4xl sm:text-5xl font-black text-amber-400 font-display">
                    {score} <span className="text-xl text-gray-400">/ {totalQ}</span>
                  </div>
                </div>

                {/* 4 Stats Chips */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs max-w-xl mx-auto pt-2">
                  <div className="bg-black/50 border border-emerald-500/30 p-2.5 rounded-xl">
                    <span className="text-gray-400 block text-[10px]">সঠিক উত্তর</span>
                    <span className="text-emerald-400 font-bold text-sm">+{correctCount} (+{correctCount * 1} marks)</span>
                  </div>
                  <div className="bg-black/50 border border-red-500/30 p-2.5 rounded-xl">
                    <span className="text-gray-400 block text-[10px]">ভুল উত্তর</span>
                    <span className="text-red-400 font-bold text-sm">-{wrongCount} (-{(wrongCount * negativeMark).toFixed(2)})</span>
                  </div>
                  <div className="bg-black/50 border border-gray-700 p-2.5 rounded-xl">
                    <span className="text-gray-400 block text-[10px]">ছেড়ে দেওয়া</span>
                    <span className="text-gray-300 font-bold text-sm">{skippedCount} টি</span>
                  </div>
                  <div className="bg-black/50 border border-amber-500/30 p-2.5 rounded-xl">
                    <span className="text-gray-400 block text-[10px]">সঠিকতার হার</span>
                    <span className="text-amber-400 font-bold text-sm">{accuracy}% Accuracy</span>
                  </div>
                </div>

                {/* Simulated National Merit Rank */}
                <div className="bg-amber-950/40 border border-amber-500/30 p-3 rounded-2xl max-w-md mx-auto flex items-center justify-center gap-2 text-xs text-amber-300 font-mono">
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                  <span>
                    {isBn
                      ? `মেডিকেল মেধা র‍্যাংক প্রিভিউ: আপনি শীর্ষ ${Math.max(1, 100 - accuracy)}% প্রার্থীর সমকক্ষ!`
                      : `National Rank Preview: Top ${Math.max(1, 100 - accuracy)}% percentile!`}
                  </span>
                </div>
              </div>

              {/* CTA: Enroll Now To Unlock Full Exam Bank */}
              <div className="bg-gradient-to-r from-red-950/80 via-[#181115] to-amber-950/60 border border-red-500/40 p-5 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <span className="text-[10px] font-mono font-black text-amber-400 uppercase bg-red-950 px-2 py-0.5 rounded border border-red-500/30">
                    FULL COURSE ACCESS
                  </span>
                  <h4 className="text-base font-extrabold text-white">
                    {isBn ? "পুরো কোর্সের ৬০+ মেগা মডেল টেস্ট ও ডেইলি এক্সাম আনলক করুন" : "Unlock 60+ Mega Exams in Full Course"}
                  </h4>
                  <p className="text-xs text-gray-300">
                    {course.title} এ ভর্তি হয়ে পান চ্যাপ্টার ফাইনাল, সাবজেক্ট ফাইনাল ও লাইভ লিডারবোর্ড।
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleStartExam}
                    className="flex-1 sm:flex-none px-4 py-3 bg-white/10 hover:bg-white/15 text-gray-200 text-xs font-mono font-bold rounded-xl border border-white/15 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{isBn ? "আবার দিন" : "Retake"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onEnrollNow(course)}
                    className="flex-1 sm:flex-none px-5 py-3 bg-gradient-to-r from-[#C1121F] to-red-600 hover:from-red-600 hover:to-red-500 text-white text-xs font-mono font-black uppercase rounded-xl transition shadow-lg shadow-red-950/80 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>{isBn ? "এনরোল করুন 🚀" : "Enroll Now 🚀"}</span>
                  </button>
                </div>
              </div>

              {/* Detailed Solutions and Explanations */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <h4 className="text-sm font-bold text-white font-mono uppercase flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-amber-400" />
                    {isBn ? "প্রশ্নের সমাধান ও টেক্সটবুক রেফারেন্স" : "Detailed Solutions & Explanations"}
                  </h4>

                  {/* Filter tabs */}
                  <div className="flex items-center gap-1 text-[11px] font-mono">
                    {(["all", "wrong", "correct", "skipped"] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setSelectedReviewFilter(f)}
                        className={`px-2.5 py-1 rounded-lg uppercase font-bold transition cursor-pointer ${
                          selectedReviewFilter === f
                            ? "bg-amber-500 text-black font-black"
                            : "bg-white/5 hover:bg-white/10 text-gray-400"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filtered Question Review Cards */}
                <div className="space-y-4">
                  {questions
                    .map((q, idx) => ({ q, idx, userAns: answers[idx] }))
                    .filter(({ q, idx, userAns }) => {
                      if (selectedReviewFilter === "correct") return userAns === q.correctAnswerIndex;
                      if (selectedReviewFilter === "wrong") return userAns !== undefined && userAns !== q.correctAnswerIndex;
                      if (selectedReviewFilter === "skipped") return userAns === undefined;
                      return true;
                    })
                    .map(({ q, idx, userAns }) => {
                      const isCorrect = userAns === q.correctAnswerIndex;
                      const isSkipped = userAns === undefined;

                      return (
                        <div
                          key={idx}
                          className={`p-4 sm:p-5 rounded-2xl border space-y-3 ${
                            isSkipped
                              ? "bg-black/30 border-white/10"
                              : isCorrect
                              ? "bg-emerald-950/20 border-emerald-500/30"
                              : "bg-red-950/20 border-red-500/30"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-bold text-gray-400">
                              প্রশ্ন {idx + 1} • {q.subject}
                            </span>
                            <span
                              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                                isSkipped
                                  ? "bg-gray-800 text-gray-300"
                                  : isCorrect
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : "bg-red-500/20 text-red-400"
                              }`}
                            >
                              {isSkipped ? "SKIPPED (০.০০)" : isCorrect ? "+১.০০ মার্কস" : `-${negativeMark} মার্কস`}
                            </span>
                          </div>

                          <h5 className="text-sm font-bold text-white">{q.questionText}</h5>

                          {/* Options grid with correct & chosen markers */}
                          <div className="grid sm:grid-cols-2 gap-2 text-xs">
                            {q.options.map((opt, optIdx) => {
                              const isThisCorrect = optIdx === q.correctAnswerIndex;
                              const isThisChosen = optIdx === userAns;

                              return (
                                <div
                                  key={optIdx}
                                  className={`p-2.5 rounded-xl border flex items-center justify-between ${
                                    isThisCorrect
                                      ? "bg-emerald-950/50 border-emerald-500/60 text-emerald-300 font-bold"
                                      : isThisChosen
                                      ? "bg-red-950/50 border-red-500/60 text-red-300"
                                      : "bg-black/30 border-white/5 text-gray-400"
                                  }`}
                                >
                                  <span>{opt}</span>
                                  {isThisCorrect && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                                  {isThisChosen && !isThisCorrect && <XCircle className="w-3.5 h-3.5 text-red-400" />}
                                </div>
                              );
                            })}
                          </div>

                          {/* Detailed Explanation */}
                          {q.explanation && (
                            <div className="bg-black/60 p-3 rounded-xl border border-white/10 text-xs text-gray-300 space-y-1">
                              <span className="text-[10px] font-mono text-amber-400 uppercase font-bold block">
                                💡 ব্যাখ্যা ও টেক্সটবুক রেফারেন্স:
                              </span>
                              <p className="leading-relaxed">{q.explanation}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
