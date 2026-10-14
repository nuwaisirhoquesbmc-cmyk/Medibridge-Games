import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  X,
  Radio,
  Play,
  Square,
  Clock,
  Users,
  Award,
  AlertTriangle,
  Send,
  Plus,
  CheckCircle2,
  Trophy,
  ExternalLink,
  ShieldAlert
} from "lucide-react";
import { CourseExam, CourseExamAttempt } from "../../types/courseTypes";
import { playSound } from "../../audio";

interface LiveExamControlModalProps {
  isOpen: boolean;
  exam: CourseExam;
  onClose: () => void;
  onUpdateExam: (updated: CourseExam) => void;
  submissions?: CourseExamAttempt[];
  onBroadcastLiveNotice?: (title: string, message: string) => void;
  onBroadcastNotice?: (title: string, message: string) => void;
  language?: "bn" | "en";
  theme?: "light" | "dark";
}

export default function LiveExamControlModal({
  isOpen,
  exam,
  onClose,
  onUpdateExam,
  submissions = [],
  onBroadcastLiveNotice,
  onBroadcastNotice,
  language = "bn"
}: LiveExamControlModalProps) {
  const isBn = language === "bn";

  const isLiveNow = exam.status === "live_now" || exam.isLive === true;
  const isEnded = exam.status === "ended";

  // Real-time ticking timer for live exam
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [liveActionFeedback, setLiveActionFeedback] = useState("");

  useEffect(() => {
    if (!isLiveNow || !exam.startTime) return;

    const calculateElapsed = () => {
      const startMs = new Date(exam.startTime).getTime();
      const nowMs = Date.now();
      const diffSecs = Math.max(0, Math.floor((nowMs - startMs) / 1000));
      setElapsedSeconds(diffSecs);
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 1000);
    return () => clearInterval(interval);
  }, [isLiveNow, exam.startTime]);

  if (!isOpen || !exam) return null;

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const totalDurationSecs = (exam.durationMinutes || 30) * 60;
  const remainingSecs = Math.max(0, totalDurationSecs - elapsedSeconds);

  // Submissions for this exam
  const examSubmissions = submissions.filter((s) => s.examId === exam.id);
  const avgScore = examSubmissions.length > 0
    ? (examSubmissions.reduce((sum, s) => sum + (Number(s.score) || 0), 0) / examSubmissions.length).toFixed(1)
    : "0.0";
  const highestScore = examSubmissions.length > 0
    ? Math.max(...examSubmissions.map((s) => Number(s.score) || 0))
    : 0;

  // Sorted by score descending for leaderboard
  const sortedSubmissions = [...examSubmissions].sort((a, b) => (b.score || 0) - (a.score || 0));

  // Handlers
  const handleStartLive = () => {
    playSound("correct");
    const updated: CourseExam = {
      ...exam,
      status: "live_now",
      isLive: true,
      isPublished: true,
      startTime: new Date().toISOString()
    };
    onUpdateExam(updated);
    setLiveActionFeedback(isBn ? "🔴 লাইভ পরীক্ষা শুরু হয়েছে!" : "🔴 Live exam is now running!");
    setTimeout(() => setLiveActionFeedback(""), 4000);
  };

  const handleEndLive = (publishMeritImmediately = false) => {
    playSound("click");
    const updated: CourseExam = {
      ...exam,
      status: "ended",
      isLive: false,
      endTime: new Date().toISOString(),
      isPracticeExam: true, // Live exam ends and automatically becomes practice exam
      isMeritPublished: publishMeritImmediately ? true : exam.isMeritPublished,
      meritPublishedAt: publishMeritImmediately ? new Date().toISOString() : exam.meritPublishedAt
    };
    onUpdateExam(updated);
    setLiveActionFeedback(
      isBn
        ? publishMeritImmediately
          ? "🏆 লাইভ পরীক্ষা সমাপ্ত হয়েছে, মেধা তালিকা প্রকাশিত হয়েছে এবং পরীক্ষাটি অনুশীলনযোগ্য (Practice Exam) করা হয়েছে।"
          : "⏹️ লাইভ পরীক্ষা সমাপ্ত হয়েছে। এটি এখন প্র্যাকটিস এক্সাম হিসেবে সক্রিয়।"
        : "⏹️ Live exam ended. Converted to practice exam."
    );
    setTimeout(() => setLiveActionFeedback(""), 4500);
  };

  const handleToggleMeritPublish = () => {
    playSound("correct");
    const willPublish = !exam.isMeritPublished;
    const updated: CourseExam = {
      ...exam,
      isMeritPublished: willPublish,
      meritPublishedAt: willPublish ? new Date().toISOString() : undefined,
      isPracticeExam: true // Ensure practice is enabled
    };
    onUpdateExam(updated);

    const broadcastFn = onBroadcastLiveNotice || onBroadcastNotice;
    if (willPublish && broadcastFn) {
      broadcastFn(
        isBn ? `🏆 মেধা তালিকা প্রকাশ: ${exam.title}` : `🏆 Merit List Published: ${exam.title}`,
        isBn
          ? `অভিনন্দন! ${exam.title} এর অফিশিয়াল মেধা তালিকা (Merit List) প্রকাশ করা হয়েছে। সকল শিক্ষার্থী তাদের স্কোর ও পজিশন দেখতে পারবে। একই সাথে পরীক্ষাটি প্র্যাকটিস মোডেও উন্মুক্ত রয়েছে!`
          : `Official merit list for ${exam.title} is now live! Students can view their rankings. Practice mode is also enabled.`
      );
    }

    setLiveActionFeedback(
      willPublish
        ? (isBn ? "🏆 মেধা তালিকা সফলভাবে প্রকাশ করা হয়েছে ও নোটিশ পাঠানো হয়েছে!" : "🏆 Merit list published successfully!")
        : (isBn ? "🔒 মেধা তালিকা অপ্রকাশিত (Draft) করা হয়েছে।" : "🔒 Merit list unpublished.")
    );
    setTimeout(() => setLiveActionFeedback(""), 4500);
  };

  const handleTogglePracticeMode = () => {
    playSound("click");
    const willEnable = !(exam.isPracticeExam ?? true);
    const updated: CourseExam = {
      ...exam,
      isPracticeExam: willEnable
    };
    onUpdateExam(updated);
    setLiveActionFeedback(
      willEnable
        ? (isBn ? "🎯 অনুশীলন পরীক্ষা মোড সক্রিয় করা হয়েছে!" : "🎯 Practice exam mode enabled!")
        : (isBn ? "🔒 অনুশীলন পরীক্ষা মোড বন্ধ করা হয়েছে।" : "🔒 Practice exam mode disabled.")
    );
    setTimeout(() => setLiveActionFeedback(""), 4000);
  };

  const handleExtendTime = (extraMinutes: number) => {
    playSound("click");
    const newDuration = (exam.durationMinutes || 30) + extraMinutes;
    const updated: CourseExam = {
      ...exam,
      durationMinutes: newDuration
    };
    onUpdateExam(updated);
    setLiveActionFeedback(
      isBn
        ? `⏱️ পরীক্ষায় অতিরিক্ত ${extraMinutes} মিনিট সময় বৃদ্ধি করা হয়েছে!`
        : `⏱️ Added +${extraMinutes} minutes to exam duration!`
    );
    setTimeout(() => setLiveActionFeedback(""), 4000);
  };

  const handleSendUrgentAlert = () => {
    const broadcastFn = onBroadcastLiveNotice || onBroadcastNotice;
    if (!broadcastFn) return;
    playSound("correct");
    broadcastFn(
      isBn ? `🚨 লাইভ পরীক্ষা চলছে: ${exam.title}` : `🚨 Live Exam Ongoing: ${exam.title}`,
      isBn
        ? `শিক্ষার্থী বন্ধুরা, ${exam.title} পরীক্ষাটি লাইভ চলছে। এখনই অংশ নাও ও নির্ধারিত সময়ের মধ্যে খাতা জমা দাও!`
        : `Dear students, ${exam.title} is live right now. Take the exam and submit before time expires!`
    );
    setLiveActionFeedback(isBn ? "📢 শিক্ষার্থীদের কাছে লাইভ নোটিশ পাঠানো হয়েছে!" : "📢 Live notice broadcasted to batch!");
    setTimeout(() => setLiveActionFeedback(""), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#111111] border border-white/20 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-mono"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-black/50">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {isLiveNow ? (
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-red-600 text-white animate-pulse flex items-center gap-1.5 shadow-[0_0_15px_rgba(239,68,68,0.6)]">
                  <Radio className="w-3.5 h-3.5 animate-ping" />
                  <span>{isBn ? "🔴 লাইভ চলছে (LIVE NOW)" : "🔴 LIVE NOW"}</span>
                </span>
              ) : isEnded ? (
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-zinc-800 text-zinc-300 border border-zinc-700">
                  <span>{isBn ? "⏹️ সমাপ্ত (ENDED)" : "⏹️ EXAM ENDED"}</span>
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <span>{isBn ? "🟡 আসন্ন (UPCOMING)" : "🟡 UPCOMING"}</span>
                </span>
              )}

              <span className="text-xs text-gray-400 font-bold">
                {exam.subject} {exam.chapter ? `• ${exam.chapter}` : ""}
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-black text-white uppercase font-display tracking-wide">
              {exam.title}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition cursor-pointer self-start sm:self-auto"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Feedback Banner */}
        {liveActionFeedback && (
          <div className="bg-emerald-950/80 border-b border-emerald-500/40 px-5 py-2.5 flex items-center gap-2 text-xs font-bold text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{liveActionFeedback}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Live Clocks & Quick Controls Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Live Clock Card */}
            <div className="p-5 bg-black/60 border border-white/10 rounded-2xl flex flex-col justify-between">
              <div>
                <span className="text-xs text-gray-400 uppercase tracking-wider block font-sans">
                  {isLiveNow ? (isBn ? "অতিবাহিত সময় / বাকি সময়" : "Elapsed / Remaining") : (isBn ? "পরীক্ষার সময়কাল" : "Exam Duration")}
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-white tracking-wider">
                    {isLiveNow ? formatTimer(elapsedSeconds) : `${exam.durationMinutes}m`}
                  </span>
                  {isLiveNow && (
                    <span className="text-xs text-amber-400 font-bold">
                      / {formatTimer(remainingSecs)} বাকি
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-gray-400 font-sans mt-3">
                <span>{isBn ? "পাস মার্ক:" : "Pass Mark:"} <strong className="text-white">{exam.passMarks}</strong></span>
                <span>{isBn ? "মোট প্রশ্ন:" : "Questions:"} <strong className="text-white">{exam.questions?.length || exam.totalQuestions || 0}</strong></span>
              </div>
            </div>

            {/* Quick Live Toggle Button Card */}
            <div className="p-5 bg-black/60 border border-white/10 rounded-2xl flex flex-col justify-between space-y-3">
              <div>
                <span className="text-xs text-gray-400 uppercase tracking-wider block font-sans">
                  {isBn ? "লাইভ নিয়ন্ত্রণ অ্যাকশন" : "Live Control Action"}
                </span>
                <p className="text-[11px] text-gray-300 font-sans mt-1">
                  {isLiveNow
                    ? (isBn ? "পরীক্ষা বর্তমানে চালু আছে। শেষ করতে চাইলে নিচের বাটনে ক্লিক করুন।" : "Exam is live. Click to stop.")
                    : (isBn ? "পরীক্ষা শুরু করলে সকল শিক্ষার্থী তাৎক্ষণিকভাবে সিবিটি দিতে পারবে।" : "Click to initiate live exam for all students.")}
                </p>
              </div>

              {isLiveNow ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleEndLive(false)}
                    className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-red-300 hover:text-white border border-red-500/40 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5 fill-current text-red-400" />
                    <span>{isBn ? "⏹️ লাইভ সমাপ্ত করুন (অন-ডিমান্ড)" : "⏹️ End Live Exam"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEndLive(true)}
                    className="w-full py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-md"
                  >
                    <Trophy className="w-3.5 h-3.5 text-yellow-200" />
                    <span>{isBn ? "🏆 সমাপ্ত ও মেধা তালিকা প্রকাশ" : "End & Publish Merit"}</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleStartLive}
                  className="w-full py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-red-950/50"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>{isBn ? "🔴 এখনই লাইভ শুরু করুন" : "🔴 Start Live Now"}</span>
                </button>
              )}
            </div>

            {/* Time Extension & Alerts */}
            <div className="p-5 bg-black/60 border border-white/10 rounded-2xl flex flex-col justify-between space-y-3">
              <div>
                <span className="text-xs text-gray-400 uppercase tracking-wider block font-sans">
                  {isBn ? "সময় বৃদ্ধি ও নোটিশ" : "Extra Time & Notice"}
                </span>
                <div className="flex items-center gap-1.5 mt-2">
                  <button
                    type="button"
                    onClick={() => handleExtendTime(5)}
                    className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold text-amber-300 transition cursor-pointer text-center"
                  >
                    +5 min
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExtendTime(10)}
                    className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold text-amber-300 transition cursor-pointer text-center"
                  >
                    +10 min
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExtendTime(15)}
                    className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold text-amber-300 transition cursor-pointer text-center"
                  >
                    +15 min
                  </button>
                </div>
              </div>

              {onBroadcastLiveNotice && (
                <button
                  type="button"
                  onClick={handleSendUrgentAlert}
                  className="w-full py-2 bg-amber-500/20 hover:bg-amber-500/30 text-[#FFD700] border border-amber-500/40 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isBn ? "📢 লাইভ অ্যালার্ট পাঠান" : "📢 Send Alert to Students"}</span>
                </button>
              )}
            </div>
          </div>

          {/* DEDICATED MERIT LIST PUBLISHING & PRACTICE EXAM ROW */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Merit List Control */}
            <div className={`p-5 rounded-2xl border transition flex flex-col justify-between space-y-3 ${
              exam.isMeritPublished
                ? "bg-amber-950/30 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)]"
                : "bg-black/60 border-white/10"
            }`}>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 uppercase tracking-wider font-sans flex items-center gap-1.5">
                    <Trophy className={`w-4 h-4 ${exam.isMeritPublished ? "text-[#FFD700]" : "text-gray-500"}`} />
                    <span>{isBn ? "মেধা তালিকা প্রকাশ (Merit List)" : "Merit List Publishing"}</span>
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase font-mono ${
                    exam.isMeritPublished
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                  }`}>
                    {exam.isMeritPublished ? (isBn ? "প্রকাশিত (PUBLISHED)" : "PUBLISHED") : (isBn ? "অপ্রকাশিত (DRAFT)" : "UNPUBLISHED")}
                  </span>
                </div>
                <p className="text-[11px] text-gray-300 font-sans leading-relaxed">
                  {exam.isMeritPublished
                    ? (isBn ? "মেধা তালিকা শিক্ষার্থীদের নিকট উন্মুক্ত। শিক্ষার্থীরা তাদের মেধা ক্রম (Rank), সঠিক-ভুল ও পার্সেন্টাইল দেখতে পারছে।" : "Official merit rankings are visible to students.")
                    : (isBn ? "লাইভ পরীক্ষা শেষে মেধা তালিকা প্রকাশ করুন। প্রকাশ করলে শিক্ষার্থীরা লিডারবোর্ড ও পূর্ণাঙ্গ রেজাল্ট দেখতে পাবে।" : "Publish merit list post-exam for students to see rankings.")}
                </p>
                {exam.meritPublishedAt && (
                  <p className="text-[10px] text-amber-400/80 font-mono">
                    প্রকাশিত: {new Date(exam.meritPublishedAt).toLocaleString("bn-BD")}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={handleToggleMeritPublish}
                className={`w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-md ${
                  exam.isMeritPublished
                    ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700"
                    : "bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-extrabold shadow-amber-950/40"
                }`}
              >
                <Trophy className="w-4 h-4" />
                <span>
                  {exam.isMeritPublished
                    ? (isBn ? "মেধা তালিকা অপ্রকাশিত করুন (Unpublish)" : "Unpublish Merit List")
                    : (isBn ? "🏆 মেধা তালিকা প্রকাশ করুন (Publish Merit)" : "Publish Merit List")}
                </span>
              </button>
            </div>

            {/* Practice Exam Conversion & State */}
            <div className={`p-5 rounded-2xl border transition flex flex-col justify-between space-y-3 ${
              (exam.isPracticeExam ?? true)
                ? "bg-emerald-950/30 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                : "bg-black/60 border-white/10"
            }`}>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 uppercase tracking-wider font-sans flex items-center gap-1.5">
                    <CheckCircle2 className={`w-4 h-4 ${(exam.isPracticeExam ?? true) ? "text-emerald-400" : "text-gray-500"}`} />
                    <span>{isBn ? "অনুশীলন পরীক্ষা (Practice Mode)" : "Practice Mode"}</span>
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase font-mono ${
                    (exam.isPracticeExam ?? true)
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                  }`}>
                    {(exam.isPracticeExam ?? true) ? (isBn ? "সক্রিয় (ACTIVE)" : "ACTIVE") : (isBn ? "বন্ধ (OFF)" : "OFF")}
                  </span>
                </div>
                <p className="text-[11px] text-gray-300 font-sans leading-relaxed">
                  {isBn
                    ? "লাইভ পরীক্ষা সমাপ্ত হওয়ার পর পরীক্ষাটি স্বয়ংক্রিয়ভাবে শিক্ষার্থীদের জন্য অনুশীলনযোগ্য (Practice Exam) হয়ে যায়। শিক্ষার্থীরা যেকোনো সময় আনলিমিটেড প্র্যাকটিস করতে পারে।"
                    : "When live exam ends, students can take it as a self-paced practice exam with instant solution view."}
                </p>
              </div>

              <button
                type="button"
                onClick={handleTogglePracticeMode}
                className={`w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer border ${
                  (exam.isPracticeExam ?? true)
                    ? "bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border-emerald-500/40"
                    : "bg-white/10 hover:bg-white/20 text-white border-white/15"
                }`}
              >
                <span>
                  {(exam.isPracticeExam ?? true)
                    ? (isBn ? "✅ প্র্যাকটিস মোড চালু রয়েছে (অন/অফ সুইচ)" : "✅ Practice Mode Enabled")
                    : (isBn ? "🎯 প্র্যাকটিস মোড চালু করুন" : "Enable Practice Mode")}
                </span>
              </button>
            </div>
          </div>

          {/* Real-time Submissions & Leaderboard */}
          <div className="space-y-4 font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#FFD700]" />
                <h4 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
                  {isBn ? "লাইভ সাবমিশন ও র‍্যাংক তালিকা" : "Live Submissions & Leaderboard"} ({examSubmissions.length})
                </h4>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="text-gray-400">
                  {isBn ? "গড় স্কোর:" : "Avg:"} <strong className="text-white">{avgScore}</strong>
                </span>
                <span className="text-gray-400">
                  {isBn ? "সর্বোচ্চ স্কোর:" : "Top:"} <strong className="text-emerald-400">{highestScore}</strong>
                </span>
              </div>
            </div>

            {sortedSubmissions.length === 0 ? (
              <div className="p-8 text-center border border-white/10 rounded-2xl bg-black/40 space-y-2">
                <Users className="w-8 h-8 text-gray-500 mx-auto" />
                <p className="text-xs text-gray-400 font-bold font-mono">
                  {isBn
                    ? "এখনও কোনো শিক্ষার্থী সাবমিট করেনি। পরীক্ষা লাইভ থাকলে শিক্ষার্থীরা সিবিটি দেওয়া শুরু করবে।"
                    : "No submissions yet for this exam."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/40">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-black/80 text-gray-400 uppercase text-[10px] border-b border-white/10">
                    <tr>
                      <th className="py-3 px-4"># Rank</th>
                      <th className="py-3 px-4">{isBn ? "শিক্ষার্থী" : "Student"}</th>
                      <th className="py-3 px-4 text-center">{isBn ? "স্কোর" : "Score"}</th>
                      <th className="py-3 px-4 text-center">{isBn ? "সঠিক / ভুল" : "Correct / Wrong"}</th>
                      <th className="py-3 px-4 text-center">{isBn ? "নিখুঁততা" : "Accuracy"}</th>
                      <th className="py-3 px-4 text-right">{isBn ? "সময়" : "Time"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {sortedSubmissions.map((sub, idx) => {
                      const rank = idx + 1;
                      const hasViolations = (sub.tabSwitchCount && sub.tabSwitchCount > 0) || (sub.violations && sub.violations.length > 0);

                      return (
                        <tr key={sub.id || idx} className="hover:bg-white/5 transition">
                          <td className="py-3 px-4 font-bold">
                            {rank === 1 ? (
                              <span className="text-[#FFD700] flex items-center gap-1 font-black">🥇 1</span>
                            ) : rank === 2 ? (
                              <span className="text-gray-300 flex items-center gap-1 font-black">🥈 2</span>
                            ) : rank === 3 ? (
                              <span className="text-amber-600 flex items-center gap-1 font-black">🥉 3</span>
                            ) : (
                              <span className="text-gray-500">#{rank}</span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white font-sans">{sub.userDisplayName || "Student"}</span>
                              {hasViolations && (
                                <span
                                  title={`Tab switches: ${sub.tabSwitchCount || 1}`}
                                  className="p-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/40 rounded text-[10px] flex items-center gap-0.5 font-bold"
                                >
                                  <ShieldAlert className="w-3 h-3 text-rose-400" />
                                  <span>{sub.tabSwitchCount || 1} switch</span>
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-center font-black text-white text-sm">
                            <span className="text-emerald-400">{sub.score}</span>
                            <span className="text-gray-500 text-xs"> / {sub.totalQuestions || exam.questions?.length || 0}</span>
                          </td>

                          <td className="py-3 px-4 text-center text-xs">
                            <span className="text-emerald-400 font-bold">{sub.correctCount || 0}</span>
                            <span className="text-gray-500"> / </span>
                            <span className="text-rose-400 font-bold">{sub.wrongCount || 0}</span>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
                              {sub.accuracyPct || 0}%
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right text-gray-400 text-[11px]">
                            {sub.submittedAt ? new Date(sub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-black/60 flex items-center justify-between font-sans">
          <span className="text-xs text-gray-400 font-mono">
            {isLiveNow
              ? isBn
                ? "🔴 পরীক্ষা লাইভ চলমান রয়েছে"
                : "🔴 Exam is live in progress"
              : isBn
              ? "পরীক্ষা স্থগিত / সম্পন্ন"
              : "Exam inactive"}
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            {isBn ? "বন্ধ করুন" : "Close"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
