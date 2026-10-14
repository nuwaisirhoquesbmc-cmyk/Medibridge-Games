import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  AlertTriangle, 
  BookOpen, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  Play, 
  RotateCcw, 
  ChevronRight, 
  ChevronDown, 
  Award, 
  Clock, 
  Sparkles, 
  Trophy, 
  Bookmark,
  TrendingUp,
  Brain,
  Zap,
  Filter,
  Check
} from "lucide-react";
import { Question, UserProfile } from "../types";
import { getIncorrectQuestions, logQuestionMistake, removeQuestionMistake } from "../lib/backend";
import { playSound } from "../audio";

interface ReviewMistakesPanelProps {
  user: UserProfile;
  language: "bn" | "en";
  theme: "light" | "dark";
  onProfileUpdate: (updated: UserProfile) => void;
}

type ModeType = "dashboard" | "quiz" | "summary";

export default function ReviewMistakesPanel({
  user,
  language,
  theme,
  onProfileUpdate,
}: ReviewMistakesPanelProps) {
  const isDark = theme === "dark";
  
  // States
  const [mistakes, setMistakes] = useState<Question[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [mode, setMode] = useState<ModeType>("dashboard");
  
  // Filters
  const [selectedSubject, setSelectedSubject] = useState<string>("All");
  const [selectedChapter, setSelectedChapter] = useState<string>("All");
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  
  // Quiz states
  const [quizSize, setQuizSize] = useState<number>(10);
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState<number>(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizAnswered, setQuizAnswered] = useState<boolean>(false);
  const [quizCorrectCount, setQuizCorrectCount] = useState<number>(0);
  const [correctedQuestionIds, setCorrectedQuestionIds] = useState<string[]>([]);
  const [quizAnswersLog, setQuizAnswersLog] = useState<{ questionId: string; correct: boolean; chosenIdx: number }[]>([]);
  
  // Load mistakes on mount / user change
  useEffect(() => {
    loadUserMistakes();
  }, [user.uid]);

  const loadUserMistakes = async () => {
    setLoading(true);
    try {
      const fetched = await getIncorrectQuestions(user.uid);
      setMistakes(fetched);
    } catch (e) {
      console.error("Failed to load user mistakes:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleClearSingleMistake = async (qId: string) => {
    playSound("click");
    if (confirm(language === "bn" ? "আপনি কি নিশ্চিতভাবে এই প্রশ্নটি আপনার ভুলের তালিকা থেকে বাদ দিতে চান?" : "Are you sure you want to remove this question from your mistakes list?")) {
      try {
        await removeQuestionMistake(user.uid, qId);
        setMistakes((prev) => prev.filter((q) => q.id !== qId));
      } catch (e) {
        console.error("Failed to remove mistake:", e);
      }
    }
  };

  const handleClearAllMistakes = async () => {
    playSound("click");
    if (confirm(language === "bn" ? "আপনি কি নিশ্চিতভাবে আপনার সকল ভুল মুছে ফেলতে চান?" : "Are you sure you want to clear ALL your recorded mistakes?")) {
      try {
        for (const q of mistakes) {
          await removeQuestionMistake(user.uid, q.id);
        }
        setMistakes([]);
      } catch (e) {
        console.error("Failed to clear mistakes:", e);
      }
    }
  };

  // Get filtered questions
  const filteredMistakes = mistakes.filter((q) => {
    const subjectMatch = selectedSubject === "All" || q.subject.toLowerCase() === selectedSubject.toLowerCase();
    const chapterMatch = selectedChapter === "All" || q.chapter === selectedChapter;
    return subjectMatch && chapterMatch;
  });

  // Get list of chapters based on selected subject
  const chaptersList = Array.from(
    new Set(
      mistakes
        .filter((q) => selectedSubject === "All" || q.subject.toLowerCase() === selectedSubject.toLowerCase())
        .map((q) => q.chapter)
        .filter(Boolean)
    )
  );

  // Start focused quiz session
  const startQuizSession = () => {
    playSound("click");
    if (filteredMistakes.length === 0) {
      alert(language === "bn" ? "অনুশীলনের জন্য কোনো ভুল উত্তর পাওয়া যায়নি!" : "No incorrect questions available for practice!");
      return;
    }
    
    // Shuffle and pick quizSize questions
    const shuffled = [...filteredMistakes].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, Math.min(quizSize, shuffled.length));
    
    setQuizQuestions(selected);
    setCurrentQuizIndex(0);
    setSelectedAnswer(null);
    setQuizAnswered(false);
    setQuizCorrectCount(0);
    setCorrectedQuestionIds([]);
    setQuizAnswersLog([]);
    setMode("quiz");
  };

  // Answer Quiz Selection
  const handleQuizAnswer = async (optIdx: number) => {
    if (quizAnswered) return;
    setSelectedAnswer(optIdx);
    setQuizAnswered(true);
    
    const activeQ = quizQuestions[currentQuizIndex];
    const isCorrect = optIdx === activeQ.correctAnswerIndex;
    
    // Log response
    setQuizAnswersLog((prev) => [
      ...prev,
      { questionId: activeQ.id, correct: isCorrect, chosenIdx: optIdx }
    ]);

    if (isCorrect) {
      playSound("correct");
      setQuizCorrectCount((prev) => prev + 1);
      setCorrectedQuestionIds((prev) => [...prev, activeQ.id]);
      
      // Crucial: Remove this mistake dynamically since they mastered/corrected it!
      await removeQuestionMistake(user.uid, activeQ.id);
      
      // Update local state list immediately
      setMistakes((prev) => prev.filter((q) => q.id !== activeQ.id));
    } else {
      playSound("wrong");
      
      // Keep/reinforce in mistakes database
      await logQuestionMistake(user.uid, activeQ);
    }
  };

  const handleNextQuizQuestion = () => {
    playSound("click");
    setSelectedAnswer(null);
    setQuizAnswered(false);
    
    if (currentQuizIndex + 1 < quizQuestions.length) {
      setCurrentQuizIndex((prev) => prev + 1);
    } else {
      // Award XP for participation and mastery
      awardMasteryRewards();
      setMode("summary");
    }
  };

  const awardMasteryRewards = async () => {
    try {
      // 15 XP and 5 Coins for each CORRECTED mistake!
      const xpGained = quizCorrectCount * 15 + 10; // extra 10 xp completion bonus
      const coinsGained = quizCorrectCount * 5 + 5; // extra 5 coins completion bonus
      
      const finalXp = user.xp + xpGained;
      const finalCoins = user.coins + coinsGained;
      const nextLevel = Math.max(user.level, Math.floor(finalXp / 500) + 1);
      
      if (nextLevel > user.level) {
        playSound("levelup");
      } else {
        playSound("victory");
      }
      
      const updatedProfile: UserProfile = {
        ...user,
        xp: finalXp,
        coins: finalCoins,
        level: nextLevel,
        questionsSolved: user.questionsSolved + quizQuestions.length,
        questionsCorrect: user.questionsCorrect + quizCorrectCount,
        rank: nextLevel >= 8 ? "Elite" : nextLevel >= 4 ? "Scholar" : "Freshman",
      };
      
      onProfileUpdate(updatedProfile);
    } catch (err) {
      console.error("Failed to update profile rewards:", err);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 select-none">
      <AnimatePresence mode="wait">
        {mode === "dashboard" && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-8"
          >
            {/* HERO BAR */}
            <div className={`p-6 md:p-8 rounded-3xl border relative overflow-hidden transition-all duration-300 ${
              isDark 
                ? "bg-gradient-to-br from-[#1b1212] via-[#241313] to-[#120a0a] border-red-900/30 text-white shadow-[0_4px_30px_rgba(193,18,31,0.1)]" 
                : "bg-gradient-to-br from-red-50/60 to-orange-50/50 border-red-100 text-slate-900 shadow-sm"
            }`}>
              <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                <Brain className="w-48 h-48 text-[#C1121F]" />
              </div>
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 z-10 relative">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-[#C1121F]/15 text-[#C1121F] border border-[#C1121F]/20">
                      {language === "bn" ? "ভুল সংশোধন হাব" : "Mistake Mastery Hub"}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      {language === "bn" ? "স্মার্ট মেমোরি" : "Smart Memory"}
                    </span>
                  </div>
                  <h1 className="text-2xl md:text-3.5xl font-sans font-black tracking-tight mb-2">
                    {language === "bn" ? "আপনার ভুলের রিভিও হাব" : "Review & Correct Your Mistakes"}
                  </h1>
                  <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 max-w-2xl font-mono leading-relaxed">
                    {language === "bn" 
                      ? "এখানে আপনার সমস্ত ভুল উত্তর দেওয়া প্রশ্নগুলো জমা হয়। একটি কাস্টম কুইজ সেশন শুরু করে প্রশ্নগুলো সমাধান করুন। সঠিক উত্তর দিলে সেগুলো আপনার ভুলের খাতা থেকে স্বয়ংক্রিয়ভাবে মুছে যাবে!"
                      : "Every question you answer incorrectly is saved here. Create focused quiz sessions to master your weak points. Once you answer correctly, the questions are automatically cleared!"
                    }
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className={`p-4 rounded-2xl border text-center ${
                    isDark ? "bg-white/5 border-white/10" : "bg-white border-red-100 shadow-sm"
                  }`}>
                    <div className="text-3xl font-black text-[#C1121F] font-mono leading-none">
                      {mistakes.length}
                    </div>
                    <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400 mt-1">
                      {language === "bn" ? "মোট ভুল প্রশ্ন" : "Total Mistakes"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="py-24 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#C1121F] mx-auto mb-4"></div>
                <p className="text-xs font-mono text-gray-500">
                  {language === "bn" ? "আপনার ভুলের খাতা লোড হচ্ছে..." : "Syncing your mistakes register..."}
                </p>
              </div>
            ) : mistakes.length === 0 ? (
              <div className={`p-12 rounded-3xl border text-center transition-all duration-300 ${
                isDark ? "bg-[#111111] border-white/10" : "bg-white border-slate-100 shadow-sm"
              }`}>
                <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-sans font-black mb-2">
                  {language === "bn" ? "চমৎকার! কোনো ভুল অবশিষ্ট নেই।" : "Perfect Standing! No Mistakes Found"}
                </h3>
                <p className="text-xs text-gray-500 font-mono max-w-md mx-auto mb-6">
                  {language === "bn"
                    ? "আপনি চমৎকার খেলছেন! কমব্যাট এরিনা বা অনুশীলনীতে গিয়ে প্র্যাকটিস শুরু করুন এবং আপনার দক্ষতাকে ঝালাই করে নিন।"
                    : "You have a flawless record or have cleared all mistakes. Jump back into the Combat Arena or book trials to test your skills."
                  }
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LEFT: PRACTICE BUILDER */}
                <div className="lg:col-span-1 flex flex-col gap-6">
                  <div className={`p-6 rounded-3xl border transition-all duration-300 ${
                    isDark ? "bg-[#111111] border-white/10" : "bg-white border-slate-100 shadow-sm"
                  }`}>
                    <div className="flex items-center gap-2 mb-4 border-b pb-3 border-gray-100 dark:border-white/5">
                      <Zap className="w-5 h-5 text-amber-500" />
                      <h2 className="text-base font-sans font-black">
                        {language === "bn" ? "ভুল সংশোধন প্র্যাকটিস" : "Focused Quiz Builder"}
                      </h2>
                    </div>

                    <p className="text-[11px] text-gray-500 font-mono leading-relaxed mb-6">
                      {language === "bn"
                        ? "নিচের ফিল্টারগুলো ব্যবহার করে আপনার ভুলের উপর ভিত্তি করে একটি কাস্টম প্র্যাকটিস কুইজ তৈরি করুন।"
                        : "Configure and launch an adaptive practice run based on your actual recorded mistakes."
                      }
                    </p>

                    <div className="flex flex-col gap-4">
                      {/* Subject Selection */}
                      <div>
                        <label className="text-[10px] font-mono font-bold uppercase text-gray-400 block mb-1.5">
                          {language === "bn" ? "বিষয় সিলেক্ট করুন" : "Filter by Subject"}
                        </label>
                        <select
                          value={selectedSubject}
                          onChange={(e) => {
                            setSelectedSubject(e.target.value);
                            setSelectedChapter("All");
                          }}
                          className={`w-full p-2.5 rounded-xl border text-xs font-mono font-bold outline-none cursor-pointer ${
                            isDark 
                              ? "bg-white/5 border-white/10 text-white focus:border-[#C1121F]" 
                              : "bg-slate-50 border-slate-200 text-slate-800 focus:border-[#C1121F]"
                          }`}
                        >
                          <option value="All">{language === "bn" ? "সকল বিষয় (All Subjects)" : "All Subjects"}</option>
                          <option value="Biology">{language === "bn" ? "জীববিজ্ঞান (Biology)" : "Biology"}</option>
                          <option value="Chemistry">{language === "bn" ? "রসায়ন (Chemistry)" : "Chemistry"}</option>
                          <option value="Physics">{language === "bn" ? "পদার্থবিজ্ঞান (Physics)" : "Physics"}</option>
                          <option value="English">{language === "bn" ? "ইংরেজি (English)" : "English"}</option>
                          <option value="GK">{language === "bn" ? "সাধারণ জ্ঞান (GK)" : "GK"}</option>
                        </select>
                      </div>

                      {/* Chapter Selection */}
                      {chaptersList.length > 0 && (
                        <div>
                          <label className="text-[10px] font-mono font-bold uppercase text-gray-400 block mb-1.5">
                            {language === "bn" ? "অধ্যায় সিলেক্ট করুন" : "Filter by Chapter"}
                          </label>
                          <select
                            value={selectedChapter}
                            onChange={(e) => setSelectedChapter(e.target.value)}
                            className={`w-full p-2.5 rounded-xl border text-xs font-mono font-bold outline-none cursor-pointer truncate ${
                              isDark 
                                ? "bg-white/5 border-white/10 text-white focus:border-[#C1121F]" 
                                : "bg-slate-50 border-slate-200 text-slate-800 focus:border-[#C1121F]"
                            }`}
                          >
                            <option value="All">{language === "bn" ? "সকল অধ্যায় (All Chapters)" : "All Chapters"}</option>
                            {chaptersList.map((chap) => (
                              <option key={chap} value={chap}>{chap}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Quiz Size */}
                      <div>
                        <label className="text-[10px] font-mono font-bold uppercase text-gray-400 block mb-1.5">
                          {language === "bn" ? "প্রশ্নের সংখ্যা" : "Number of Questions"}
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                          {[5, 10, 15, 20].map((size) => (
                            <button
                              key={size}
                              onClick={() => { playSound("click"); setQuizSize(size); }}
                              className={`py-2 rounded-xl text-xs font-mono font-bold border transition ${
                                quizSize === size
                                  ? "bg-[#C1121F] text-white border-[#C1121F]"
                                  : isDark
                                    ? "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                              }`}
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* START BUTTON */}
                      <button
                        onClick={startQuizSession}
                        disabled={filteredMistakes.length === 0}
                        className={`w-full py-3.5 px-4 rounded-xl font-mono text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 mt-4 cursor-pointer transition active:scale-95 text-white ${
                          filteredMistakes.length > 0
                            ? "bg-gradient-to-r from-red-600 to-[#C1121F] shadow-lg shadow-red-500/20 hover:opacity-95"
                            : "bg-gray-400 dark:bg-neutral-800 cursor-not-allowed opacity-55"
                        }`}
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>
                          {language === "bn" 
                            ? `সেশন শুরু করুন (${Math.min(quizSize, filteredMistakes.length)}টি প্রশ্ন)` 
                            : `Start Practice (${Math.min(quizSize, filteredMistakes.length)} Questions)`
                          }
                        </span>
                      </button>

                      <button
                        onClick={handleClearAllMistakes}
                        className={`w-full py-2.5 px-4 rounded-xl font-mono text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 border transition cursor-pointer hover:bg-red-500/5 ${
                          isDark
                            ? "border-red-900/40 text-red-400 hover:border-red-500/30"
                            : "border-red-200 text-red-600 hover:border-red-300 shadow-sm"
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{language === "bn" ? "ভুলের খাতা খালি করুন" : "Clear All Mistakes"}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* RIGHT: DETAILED MISTAKES LIST */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                  <div className="flex justify-between items-center px-2">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-[#C1121F]" />
                      <h3 className="text-sm font-sans font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {language === "bn" 
                          ? `ভুল উত্তর দেওয়া প্রশ্নসমূহ (${filteredMistakes.length})` 
                          : `Mistakes Catalog (${filteredMistakes.length})`
                        }
                      </h3>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-1">
                    {filteredMistakes.map((q, idx) => {
                      const isExpanded = expandedQuestionId === q.id;
                      return (
                        <div
                          key={q.id || idx}
                          className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                            isExpanded 
                              ? isDark 
                                ? "bg-red-950/10 border-red-900/30 shadow-md" 
                                : "bg-red-50/20 border-red-100 shadow-sm"
                              : isDark 
                                ? "bg-[#111111] border-white/5 hover:border-white/10" 
                                : "bg-white border-slate-100 hover:border-slate-200 shadow-xs"
                          }`}
                        >
                          {/* Card Header (Click to expand) */}
                          <div
                            onClick={() => { playSound("click"); setExpandedQuestionId(isExpanded ? null : q.id); }}
                            className="p-4 flex justify-between items-start gap-4 cursor-pointer"
                          >
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-1.5 mb-2 font-mono text-[9px] font-bold">
                                <span className="px-2 py-0.5 rounded bg-[#C1121F]/10 text-[#C1121F]">
                                  {q.subject}
                                </span>
                                {q.chapter && (
                                  <span className="px-2 py-0.5 rounded bg-gray-500/10 text-gray-400 max-w-[150px] truncate">
                                    {q.chapter}
                                  </span>
                                )}
                                <span className={`px-2 py-0.5 rounded ${
                                  q.difficulty === "Hard" 
                                    ? "bg-red-500/10 text-red-500" 
                                    : q.difficulty === "Medium"
                                      ? "bg-amber-500/10 text-amber-500"
                                      : "bg-emerald-500/10 text-emerald-500"
                                }`}>
                                  {q.difficulty}
                                </span>
                              </div>
                              <h4 className="text-xs md:text-sm font-sans font-bold text-slate-800 dark:text-slate-100 leading-relaxed">
                                {q.questionText}
                              </h4>
                            </div>
                            
                            <div className="flex items-center gap-1.5 self-start pt-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleClearSingleMistake(q.id); }}
                                className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-500/5 transition cursor-pointer"
                                title={language === "bn" ? "ভুল সংশোধন থেকে বাদ দিন" : "Remove from mistakes list"}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                              )}
                            </div>
                          </div>

                          {/* Expanded Options & Explanation */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: "auto" }}
                                exit={{ height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="border-t border-dashed border-gray-100 dark:border-white/5"
                              >
                                <div className="p-4 bg-black/5 dark:bg-white/2 flex flex-col gap-4">
                                  {/* Options block */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {q.options.map((option, oIdx) => {
                                      const isCorrect = oIdx === q.correctAnswerIndex;
                                      return (
                                        <div
                                          key={oIdx}
                                          className={`p-3 rounded-xl border text-xs font-sans font-bold flex items-center justify-between gap-2 ${
                                            isCorrect
                                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                                              : isDark
                                                ? "bg-[#181818] border-white/5 text-gray-400"
                                                : "bg-slate-50 border-slate-150 text-slate-500"
                                          }`}
                                        >
                                          <span>{option}</span>
                                          {isCorrect && <Check className="w-4 h-4 shrink-0" />}
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {/* Explanation section */}
                                  {q.explanation && (
                                    <div className="p-3.5 rounded-xl border border-dashed border-amber-500/15 bg-amber-500/5 flex gap-2.5 items-start">
                                      <Sparkles className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
                                      <div className="flex-1">
                                        <h5 className="text-[10px] font-mono font-bold uppercase text-amber-500 tracking-wider mb-1">
                                          {language === "bn" ? "ব্যাখ্যা ও ট্রিকস" : "Detailed Explanation"}
                                        </h5>
                                        <p className="text-xs font-mono text-gray-600 dark:text-gray-300 leading-relaxed">
                                          {q.explanation}
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {mode === "quiz" && quizQuestions.length > 0 && (
          <motion.div
            key="quiz"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-6 max-w-3xl mx-auto"
          >
            {/* QUIZ HEADER */}
            <div className={`p-4 md:p-5 rounded-2xl border flex items-center justify-between gap-4 transition-all duration-300 ${
              isDark ? "bg-[#111111] border-white/10" : "bg-white border-slate-100 shadow-sm"
            }`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#C1121F]/10 text-[#C1121F] rounded-xl">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs md:text-sm font-sans font-black uppercase tracking-wider">
                    {language === "bn" ? "ভুল সংশোধন কুইজ" : "Mistake Correction Run"}
                  </h3>
                  <p className="text-[10px] font-mono font-bold text-gray-400">
                    {language === "bn" ? "সঠিক উত্তর দিলে ভুলের খাতা থেকে বাদ যাবে!" : "Correct answers clear this mistake forever!"}
                  </p>
                </div>
              </div>

              {/* Progress Count */}
              <div className="text-right">
                <span className="text-xs font-mono font-black text-gray-400">
                  {currentQuizIndex + 1} / {quizQuestions.length}
                </span>
                <div className="w-24 bg-gray-200 dark:bg-neutral-800 rounded-full h-1.5 mt-1 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-red-500 to-[#C1121F] h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${((currentQuizIndex + 1) / quizQuestions.length) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* THE QUESTION CARD */}
            <div className={`p-6 md:p-8 rounded-3xl border relative transition-all duration-300 ${
              isDark ? "bg-[#111111] border-white/10 text-white" : "bg-white border-slate-100 text-slate-900 shadow-sm"
            }`}>
              {/* Question metadata */}
              <div className="flex items-center gap-1.5 mb-4 font-mono text-[10px] font-bold">
                <span className="px-2.5 py-0.5 rounded-full bg-[#C1121F]/10 text-[#C1121F] border border-[#C1121F]/10">
                  {quizQuestions[currentQuizIndex].subject}
                </span>
                {quizQuestions[currentQuizIndex].chapter && (
                  <span className="px-2.5 py-0.5 rounded-full bg-gray-500/10 text-gray-400 max-w-[200px] truncate border border-transparent">
                    {quizQuestions[currentQuizIndex].chapter}
                  </span>
                )}
                <span className={`px-2.5 py-0.5 rounded-full ${
                  quizQuestions[currentQuizIndex].difficulty === "Hard" 
                    ? "bg-red-500/10 text-red-500 border border-red-500/10" 
                    : quizQuestions[currentQuizIndex].difficulty === "Medium"
                      ? "bg-amber-500/10 text-amber-500 border border-amber-500/10"
                      : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/10"
                }`}>
                  {quizQuestions[currentQuizIndex].difficulty}
                </span>
              </div>

              {/* Question Text */}
              <h2 className="text-sm md:text-base font-sans font-bold leading-relaxed mb-6">
                {quizQuestions[currentQuizIndex].questionText}
              </h2>

              {/* Options Grid */}
              <div className="grid grid-cols-1 gap-3">
                {quizQuestions[currentQuizIndex].options.map((option, oIdx) => {
                  const isSelected = selectedAnswer === oIdx;
                  const isCorrectAnswer = oIdx === quizQuestions[currentQuizIndex].correctAnswerIndex;
                  
                  let optionStyle = isDark 
                    ? "bg-[#181818] border-white/5 text-gray-300 hover:border-white/15" 
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100";
                  
                  if (quizAnswered) {
                    if (isCorrectAnswer) {
                      optionStyle = "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400";
                    } else if (isSelected) {
                      optionStyle = "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400";
                    } else {
                      optionStyle = "opacity-40 bg-neutral-100 dark:bg-neutral-900 border-transparent text-gray-400";
                    }
                  } else if (isSelected) {
                    optionStyle = "border-[#C1121F] bg-[#C1121F]/5 text-[#C1121F]";
                  }

                  return (
                    <button
                      key={oIdx}
                      disabled={quizAnswered}
                      onClick={() => handleQuizAnswer(oIdx)}
                      className={`w-full p-4 rounded-xl border text-left text-xs font-sans font-bold flex items-center justify-between gap-3 transition cursor-pointer ${optionStyle}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-lg font-mono text-[10px] font-black flex items-center justify-center ${
                          isSelected 
                            ? "bg-[#C1121F] text-white" 
                            : isCorrectAnswer && quizAnswered
                              ? "bg-emerald-500 text-white"
                              : isDark 
                                ? "bg-white/5 text-gray-400" 
                                : "bg-slate-200 text-slate-600"
                        }`}>
                          {String.fromCharCode(65 + oIdx)}
                        </span>
                        <span>{option}</span>
                      </div>

                      {quizAnswered && (
                        <div>
                          {isCorrectAnswer ? (
                            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                          ) : isSelected ? (
                            <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                          ) : null}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* FEEDBACK & EXPLANATION */}
              <AnimatePresence>
                {quizAnswered && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 pt-6 border-t border-dashed border-gray-100 dark:border-white/5 flex flex-col gap-4"
                  >
                    {selectedAnswer === quizQuestions[currentQuizIndex].correctAnswerIndex ? (
                      <div className="flex items-center gap-2 text-emerald-500 font-mono text-xs font-bold bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10">
                        <CheckCircle className="w-4 h-4" />
                        <span>{language === "bn" ? "ভুল সংশোধন হয়েছে! এই প্রশ্নটি ভুলের খাতা থেকে বাদ দেওয়া হয়েছে।" : "Mistake Mastered! Removed from mistakes register."}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-red-500 font-mono text-xs font-bold bg-red-500/5 p-3 rounded-xl border border-red-500/10">
                        <XCircle className="w-4 h-4" />
                        <span>{language === "bn" ? "ভুল উত্তর! প্রশ্নটি সংশোধন করা সম্ভব হয়নি।" : "Incorrect. The question remains in your mistakes register."}</span>
                      </div>
                    )}

                    {quizQuestions[currentQuizIndex].explanation && (
                      <div className="p-4 bg-amber-500/5 border border-dashed border-amber-500/15 rounded-2xl flex gap-3 items-start">
                        <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="text-[10px] font-mono font-bold text-amber-500 uppercase tracking-wider mb-1">
                            {language === "bn" ? "বিশদ সমাধান ব্যাখ্যা" : "Solution Explanation"}
                          </h4>
                          <p className="text-xs font-mono text-gray-600 dark:text-gray-300 leading-relaxed">
                            {quizQuestions[currentQuizIndex].explanation}
                          </p>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleNextQuizQuestion}
                      className="w-full py-3 px-4 bg-[#C1121F] text-white rounded-xl font-mono text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition hover:opacity-95 mt-2"
                    >
                      <span>
                        {currentQuizIndex + 1 < quizQuestions.length 
                          ? (language === "bn" ? "পরবর্তী প্রশ্ন" : "Next Question") 
                          : (language === "bn" ? "ফলাফল দেখুন" : "View Session Results")
                        }
                      </span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {mode === "summary" && (
          <motion.div
            key="summary"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto flex flex-col gap-6 text-center"
          >
            <div className={`p-8 rounded-3xl border transition-all duration-300 ${
              isDark ? "bg-[#111111] border-white/10 text-white" : "bg-white border-slate-100 text-slate-900 shadow-sm"
            }`}>
              <div className="p-4 bg-amber-500/10 text-amber-500 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 shadow-sm border border-amber-500/10">
                <Trophy className="w-10 h-10" />
              </div>

              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#C1121F]/10 text-[#C1121F] border border-[#C1121F]/15 uppercase tracking-wider">
                {language === "bn" ? "সেশন সমাপ্ত" : "Correction Run Completed"}
              </span>

              <h2 className="text-xl md:text-2.5xl font-sans font-black tracking-tight mt-3 mb-2">
                {language === "bn" ? "আপনার ভুলের খাতা রিভিও সম্পন্ন!" : "Mistake Practice Completed!"}
              </h2>

              <p className="text-xs text-gray-500 font-mono max-w-md mx-auto mb-8 leading-relaxed">
                {language === "bn"
                  ? "আপনি চমৎকার পরিশ্রম করেছেন। আপনার সমাধানকৃত প্রশ্নের ফলাফল এবং প্রাপ্ত পুরস্কারগুলো নিচে দেওয়া হলো।"
                  : "Excellent effort correcting your mistakes. See your success rate and earned bonuses below."
                }
              </p>

              {/* STATS ROW */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                <div className={`p-4 rounded-2xl border ${isDark ? "bg-white/2 border-white/5" : "bg-slate-50 border-slate-150"}`}>
                  <div className="text-2xl font-black text-emerald-500 font-mono leading-none">
                    {quizCorrectCount}
                  </div>
                  <div className="text-[9px] font-mono font-bold text-gray-400 uppercase tracking-wider mt-1.5">
                    {language === "bn" ? "সংশোধিত প্রশ্ন" : "Mistakes Mastered"}
                  </div>
                </div>

                <div className={`p-4 rounded-2xl border ${isDark ? "bg-white/2 border-white/5" : "bg-slate-50 border-slate-150"}`}>
                  <div className="text-2xl font-black text-[#C1121F] font-mono leading-none">
                    {quizQuestions.length - quizCorrectCount}
                  </div>
                  <div className="text-[9px] font-mono font-bold text-gray-400 uppercase tracking-wider mt-1.5">
                    {language === "bn" ? "সংশোধনে ব্যর্থ" : "Mistakes Remaining"}
                  </div>
                </div>

                <div className={`p-4 rounded-2xl border col-span-2 md:col-span-1 ${isDark ? "bg-gradient-to-r from-amber-500/5 to-yellow-500/5 border-amber-500/10" : "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-100 shadow-xs"}`}>
                  <div className="text-2xl font-black text-amber-500 font-mono leading-none flex items-center justify-center gap-1">
                    <Sparkles className="w-4 h-4 fill-current" />
                    <span>+{quizCorrectCount * 15 + 10} XP</span>
                  </div>
                  <div className="text-[9px] font-mono font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider mt-1.5">
                    {language === "bn" ? "অর্জিত এক্সপি" : "XP Reward"}
                  </div>
                </div>
              </div>

              {/* ACTIONS */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => { playSound("click"); setMode("dashboard"); }}
                  className="py-3 px-6 bg-[#C1121F] text-white rounded-xl font-mono text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition hover:opacity-95"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{language === "bn" ? "পুনরায় প্র্যাকটিস করুন" : "Practice More Mistakes"}</span>
                </button>

                <button
                  onClick={async () => {
                    playSound("click");
                    await loadUserMistakes();
                    setMode("dashboard");
                  }}
                  className={`py-3 px-6 rounded-xl font-mono text-xs font-black uppercase tracking-wider border transition cursor-pointer ${
                    isDark 
                      ? "border-white/10 text-white hover:bg-white/5" 
                      : "border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
                  }`}
                >
                  <span>{language === "bn" ? "ড্যাশবোর্ডে ফিরে যান" : "Return to Hub"}</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
