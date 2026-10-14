import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Target,
  BookOpen,
  Layers,
  Zap,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Filter,
  Play,
  Share2,
  Bookmark,
  Sliders,
  Flame,
  Brain,
  FileText,
  HelpCircle,
  Check,
  X,
  RefreshCw,
  Trophy,
  BarChart3,
  Calendar,
  Search,
  ArrowRight,
  TrendingUp,
  Shield,
  Eye,
  Trash2
} from "lucide-react";
import {
  Question,
  UserProfile,
  SubjectType,
  DifficultyType,
  PracticeExamConfig,
  PracticeMode,
  PracticeAttemptRecord,
  PracticeAttemptQuestion
} from "../../types";
import { MistakeBankItem, CourseExam } from "../../types/courseTypes";
import {
  getEligiblePracticePool,
  getSubjectStats,
  getChaptersForSubject,
  getTopicsForChapter,
  generatePracticeExam,
  savePracticeAttemptRecord,
  getLocalPracticeAttempts,
  MAT_SYLLABUS_HIERARCHY
} from "../../lib/practicePoolService";
import { playSound } from "../../audio";

interface UnlimitedPracticeHubProps {
  user: UserProfile;
  dbQuestions: Question[];
  liveExams?: (CourseExam | any)[];
  mistakes?: MistakeBankItem[];
  language: "bn" | "en";
  theme?: "light" | "dark";
  courseId?: string;
  batchId?: string;
  courseTitle?: string;
  batchName?: string;
  courseSubjects?: string[];
  isCourseEmbedded?: boolean;
  onProfileUpdate: (updated: UserProfile) => void;
  onNavigateToTab?: (tab: string) => void;
}

export default function UnlimitedPracticeHub({
  user,
  dbQuestions = [],
  liveExams = [],
  mistakes = [],
  language,
  theme = "dark",
  courseId,
  batchId,
  courseTitle,
  batchName,
  courseSubjects,
  isCourseEmbedded = false,
  onProfileUpdate,
  onNavigateToTab
}: UnlimitedPracticeHubProps) {
  const isDark = theme === "dark";
  const isBn = language === "bn";

  // Eligible Practice Pool Calculation (Excludes active locked live exam questions, scoped to course subjects if provided)
  const practicePool = useMemo(() => {
    return getEligiblePracticePool(dbQuestions, liveExams, courseSubjects);
  }, [dbQuestions, liveExams, courseSubjects]);

  const subjectStats = useMemo(() => {
    return getSubjectStats(practicePool);
  }, [practicePool]);

  // Completed live exams for archive practice
  const completedLiveExams = useMemo(() => {
    return (liveExams || []).filter((e) => !e.isActive || e.isCompleted);
  }, [liveExams]);

  // View States: 'hub' | 'custom_config' | 'exam_running' | 'results' | 'history'
  const [viewState, setViewState] = useState<"hub" | "custom_config" | "exam_running" | "results" | "history">("hub");

  // Selected Mode & Filter State
  const [activeMode, setActiveMode] = useState<PracticeMode>("random");
  const [selectedSubject, setSelectedSubject] = useState<SubjectType>("Biology");
  const [selectedChapter, setSelectedChapter] = useState<string>("All");
  const [selectedTopic, setSelectedTopic] = useState<string>("All");
  const [selectedDifficulty, setSelectedDifficulty] = useState<"All" | DifficultyType>("All");
  const [questionCount, setQuestionCount] = useState<number>(20);
  const [durationMinutes, setDurationMinutes] = useState<number>(15);
  const [negativeMarking, setNegativeMarking] = useState<number>(0.25);
  const [instantExplanation, setInstantExplanation] = useState<boolean>(false);
  const [selectedArchiveExamId, setSelectedArchiveExamId] = useState<string>("");

  // Running Exam Session State
  const [activeExamData, setActiveExamData] = useState<{
    title: string;
    questions: Question[];
    config: PracticeExamConfig;
  } | null>(null);
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number | null>>({});
  const [questionTimeLogs, setQuestionTimeLogs] = useState<Record<number, number>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<number, boolean>>({});
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [isExamCompleted, setIsExamCompleted] = useState<boolean>(false);
  const [showExplanationInstant, setShowExplanationInstant] = useState<boolean>(false);
  const [showQuestionPalette, setShowQuestionPalette] = useState<boolean>(false);
  const [showSubmitConfirmModal, setShowSubmitConfirmModal] = useState<boolean>(false);

  // Result State
  const [lastAttemptResult, setLastAttemptResult] = useState<PracticeAttemptRecord | null>(null);
  const [resultFilter, setResultFilter] = useState<"all" | "correct" | "wrong" | "skipped">("all");
  const [historyAttempts, setHistoryAttempts] = useState<PracticeAttemptRecord[]>([]);

  // Timer Ref
  const timerIntervalRef = useRef<any>(null);
  const currentQStartTimeRef = useRef<number>(Date.now());

  // Load history on mount
  useEffect(() => {
    const loaded = getLocalPracticeAttempts(user?.uid);
    setHistoryAttempts(loaded);
  }, [user?.uid]);

  // Available Chapters and Topics for selected subject
  const availableChapters = useMemo(() => {
    return ["All", ...getChaptersForSubject(practicePool, selectedSubject)];
  }, [practicePool, selectedSubject]);

  const availableTopics = useMemo(() => {
    if (selectedChapter === "All") return ["All"];
    return ["All", ...getTopicsForChapter(practicePool, selectedSubject, selectedChapter)];
  }, [practicePool, selectedSubject, selectedChapter]);

  // Overall User Practice Stats
  const userPracticeStats = useMemo(() => {
    const totalSolved = user.questionsSolved || 0;
    const totalCorrect = user.questionsCorrect || 0;
    const accuracy = totalSolved > 0 ? Math.round((totalCorrect / totalSolved) * 100) : 0;
    const totalPoolCount = practicePool.length;
    const streak = user.dailyStreak || 1;
    const totalMistakesCount = (mistakes || []).filter((m) => !m.reviewed).length;
    return { totalSolved, totalCorrect, accuracy, totalPoolCount, streak, totalMistakesCount };
  }, [user, practicePool, mistakes]);

  // Launch Practice Exam Generator
  const handleLaunchPractice = (configOverride?: Partial<PracticeExamConfig>) => {
    playSound("click");

    const fullConfig: PracticeExamConfig = {
      mode: configOverride?.mode || activeMode,
      subjects: configOverride?.subjects || [selectedSubject],
      chapter: configOverride?.chapter || (selectedChapter !== "All" ? selectedChapter : undefined),
      topic: configOverride?.topic || (selectedTopic !== "All" ? selectedTopic : undefined),
      difficulty: configOverride?.difficulty || selectedDifficulty,
      questionCount: configOverride?.questionCount || questionCount,
      durationMinutes: configOverride?.durationMinutes !== undefined ? configOverride.durationMinutes : durationMinutes,
      negativeMarking: configOverride?.negativeMarking !== undefined ? configOverride.negativeMarking : negativeMarking,
      instantExplanation: configOverride?.instantExplanation !== undefined ? configOverride.instantExplanation : instantExplanation,
      sourceExamId: configOverride?.sourceExamId || (selectedArchiveExamId || undefined)
    };

    const generated = generatePracticeExam(
      practicePool,
      fullConfig,
      mistakes,
      completedLiveExams
    );

    if (!generated.questions || generated.questions.length === 0) {
      alert(isBn ? "নির্বাচিত ফিল্টারে কোনো প্রশ্ন পাওয়া যায়নি। অনুগ্রহ করে ফিল্টার পরিবর্তন করুন।" : "No questions matched your criteria. Try adjusting subjects or chapters.");
      return;
    }

    setActiveExamData(generated);
    setCurrentQIndex(0);
    setUserAnswers({});
    setQuestionTimeLogs({});
    setFlaggedQuestions({});
    setIsExamCompleted(false);
    setShowExplanationInstant(false);
    setShowQuestionPalette(false);

    // Setup Timer
    const totalSecs = (fullConfig.durationMinutes || 15) * 60;
    setSecondsRemaining(totalSecs);
    currentQStartTimeRef.current = Date.now();

    setViewState("exam_running");
    playSound("click");
  };

  // Timer Tick Hook during exam
  useEffect(() => {
    if (viewState === "exam_running" && !isExamCompleted && secondsRemaining > 0) {
      timerIntervalRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            handleAutoSubmitExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [viewState, isExamCompleted, secondsRemaining]);

  // Record time on current question when index changes
  const recordCurrentQuestionTime = () => {
    const elapsed = Math.round((Date.now() - currentQStartTimeRef.current) / 1000);
    setQuestionTimeLogs((prev) => ({
      ...prev,
      [currentQIndex]: (prev[currentQIndex] || 0) + Math.max(1, elapsed)
    }));
    currentQStartTimeRef.current = Date.now();
  };

  // Handle Option Select
  const handleSelectOption = (optIndex: number) => {
    if (isExamCompleted) return;
    playSound("click");

    setUserAnswers((prev) => ({
      ...prev,
      [currentQIndex]: optIndex
    }));

    if (activeExamData?.config.instantExplanation) {
      setShowExplanationInstant(true);
      const q = activeExamData.questions[currentQIndex];
      if (optIndex === q.correctAnswerIndex) {
        playSound("correct");
      } else {
        playSound("wrong");
      }
    }
  };

  const handleNextQuestion = () => {
    if (!activeExamData) return;
    recordCurrentQuestionTime();
    playSound("click");
    setShowExplanationInstant(false);

    if (currentQIndex < activeExamData.questions.length - 1) {
      setCurrentQIndex((prev) => prev + 1);
    } else {
      // Prompt submit
      handleFinishExam();
    }
  };

  const handlePrevQuestion = () => {
    if (currentQIndex > 0) {
      recordCurrentQuestionTime();
      playSound("click");
      setShowExplanationInstant(false);
      setCurrentQIndex((prev) => prev - 1);
    }
  };

  const handleToggleFlag = () => {
    playSound("click");
    setFlaggedQuestions((prev) => ({
      ...prev,
      [currentQIndex]: !prev[currentQIndex]
    }));
  };

  // Submit Exam & Compile Result
  const handleAutoSubmitExam = () => {
    playSound("wrong");
    handleFinishExam();
  };

  const handleFinishExam = async () => {
    if (!activeExamData) return;
    recordCurrentQuestionTime();
    setIsExamCompleted(true);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    const questions = activeExamData.questions;
    const negMark = activeExamData.config.negativeMarking || 0;

    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;
    const evaluatedQuestions: PracticeAttemptQuestion[] = [];

    questions.forEach((q, idx) => {
      const selected = userAnswers[idx];
      const timeSpent = questionTimeLogs[idx] || 5;
      const isSkipped = selected === undefined || selected === null;
      const isCorrect = !isSkipped && selected === q.correctAnswerIndex;

      if (isSkipped) {
        skippedCount++;
      } else if (isCorrect) {
        correctCount++;
      } else {
        wrongCount++;
      }

      evaluatedQuestions.push({
        questionId: q.id,
        questionText: q.questionText,
        options: q.options,
        correctAnswerIndex: q.correctAnswerIndex,
        selectedAnswerIndex: isSkipped ? null : selected,
        isCorrect,
        timeSpentSeconds: timeSpent,
        explanation: q.explanation || "আবুল হাসান / হাজারী নাগ স্যারের বইয়ের রেফারেন্স অনুসারে সঠিক সমাধান।",
        subject: q.subject,
        chapter: q.chapter,
        topic: q.topic,
        difficulty: q.difficulty,
        source: q.source
      });
    });

    const totalAttempted = correctCount + wrongCount;
    const rawScore = correctCount * 1.0 - wrongCount * negMark;
    const finalScore = Math.max(0, Math.round(rawScore * 100) / 100);
    const maxScore = questions.length;
    const accuracy = totalAttempted > 0 ? Math.round((correctCount / totalAttempted) * 100) : 0;
    const totalTimeTaken = (Object.values(questionTimeLogs) as number[]).reduce((a, b) => Number(a) + Number(b), 0) || 1;

    // Gamification rewards
    const xpReward = correctCount * 15 + Math.round(finalScore * 5);
    const coinsReward = Math.round(correctCount * 2);

    const attemptRecord: PracticeAttemptRecord = {
      id: `attempt_${Date.now()}`,
      userId: user?.uid || "guest",
      userName: user?.displayName || "Aspirant",
      title: activeExamData.title,
      mode: activeExamData.config.mode,
      subject: activeExamData.config.subjects.join(", "),
      chapter: activeExamData.config.chapter || "Full Syllabus",
      topic: activeExamData.config.topic,
      totalQuestions: questions.length,
      attempted: totalAttempted,
      correct: correctCount,
      wrong: wrongCount,
      skipped: skippedCount,
      score: finalScore,
      maxScore,
      accuracy,
      negativeMarking: negMark,
      timeTakenSeconds: totalTimeTaken,
      xpEarned: xpReward,
      coinsEarned: coinsReward,
      createdAt: new Date().toISOString(),
      questions: evaluatedQuestions
    };

    setLastAttemptResult(attemptRecord);
    setHistoryAttempts((prev) => [attemptRecord, ...prev]);
    setViewState("results");

    // Save record to persistent storage
    await savePracticeAttemptRecord(attemptRecord, user?.uid);

    // Update user profile XP, Coins, and solved questions
    if (user && onProfileUpdate) {
      const updatedUser: UserProfile = {
        ...user,
        xp: (user.xp || 0) + xpReward,
        coins: (user.coins || 0) + coinsReward,
        questionsSolved: (user.questionsSolved || 0) + totalAttempted,
        questionsCorrect: (user.questionsCorrect || 0) + correctCount
      };
      onProfileUpdate(updatedUser);
    }

    if (accuracy >= 80) {
      playSound("levelup");
    } else {
      playSound("victory");
    }
  };

  // Helper format time
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainderSecs = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainderSecs.toString().padStart(2, "0")}`;
  };

  // ==========================================
  // VIEW 1: RUNNING EXAM PLAYER
  // ==========================================
  if (viewState === "exam_running" && activeExamData) {
    const q = activeExamData.questions[currentQIndex];
    const totalQ = activeExamData.questions.length;
    const selectedAns = userAnswers[currentQIndex];
    const isFlagged = !!flaggedQuestions[currentQIndex];
    const isInstantMode = activeExamData.config.instantExplanation;
    const isAnswered = selectedAns !== undefined && selectedAns !== null;

    return (
      <div className="w-full max-w-5xl mx-auto flex flex-col gap-5 font-sans">
        {/* Top Floating Control Bar */}
        <div className={`p-4 rounded-2xl border flex items-center justify-between shadow-lg sticky top-16 z-30 ${
          isDark ? "bg-[#111111]/95 border-white/10 backdrop-blur-md" : "bg-white/95 border-red-150 backdrop-blur-md shadow-md"
        }`}>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-[#C1121F] text-white uppercase tracking-wider">
              {q.subject}
            </span>
            <div className="hidden sm:flex flex-col">
              <span className={`text-xs font-bold truncate max-w-[200px] md:max-w-xs ${isDark ? "text-white" : "text-slate-900"}`}>
                {activeExamData.title}
              </span>
              <span className="text-[10px] font-mono text-gray-400">
                {q.chapter} {q.topic ? `• ${q.topic}` : ""}
              </span>
            </div>
          </div>

          {/* Progress & Time */}
          <div className="flex items-center gap-4">
            {/* Timer */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono font-black text-xs ${
              secondsRemaining < 120
                ? "bg-red-950/40 text-red-400 border-red-500/40 animate-pulse"
                : isDark ? "bg-black/50 border-white/10 text-[#FFD700]" : "bg-amber-50 border-amber-200 text-amber-700"
            }`}>
              <Clock className="w-4 h-4" />
              <span>{formatTime(secondsRemaining)}</span>
            </div>

            {/* Question Palette Drawer Trigger */}
            <button
              onClick={() => setShowQuestionPalette(!showQuestionPalette)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 transition ${
                isDark ? "bg-white/5 border-white/10 text-gray-300 hover:text-white" : "bg-red-50 border-red-100 text-slate-700 hover:bg-red-100"
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-[#C1121F]" />
              <span className="font-mono">{currentQIndex + 1}/{totalQ}</span>
            </button>

            {/* Submit Button */}
            <button
              onClick={() => {
                setShowSubmitConfirmModal(true);
              }}
              className="px-4 py-1.5 bg-[#C1121F] hover:bg-red-700 text-white text-xs font-mono font-bold uppercase rounded-xl transition shadow shadow-red-500/20 cursor-pointer"
            >
              {isBn ? "সাবমিট 🏁" : "SUBMIT 🏁"}
            </button>
          </div>
        </div>

        {/* In-App Submit Confirmation Modal */}
        <AnimatePresence>
          {showSubmitConfirmModal && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl flex flex-col gap-4 relative ${
                  isDark ? "bg-[#141414] border-white/10 text-white" : "bg-white border-red-150 text-slate-900"
                }`}
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-[#C1121F]">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm uppercase font-display">
                        {isBn ? "অনুশীলনী সাবমিট নিশ্চিতকরণ" : "CONFIRM SUBMISSION"}
                      </h4>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {activeExamData.title}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowSubmitConfirmModal(false)}
                    className="p-1.5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Progress Summary Cards */}
                {(() => {
                  const numAnswered = Object.keys(userAnswers).length;
                  return (
                    <div className="grid grid-cols-3 gap-2 text-center font-mono">
                      <div className={`p-3 rounded-2xl border ${isDark ? "bg-black/40 border-white/5" : "bg-red-50 border-red-100"}`}>
                        <span className="text-[9px] text-emerald-400 uppercase font-bold block">{isBn ? "উত্তরকৃত" : "Answered"}</span>
                        <span className="text-lg font-black text-emerald-400 font-mono">{numAnswered}</span>
                      </div>
                      <div className={`p-3 rounded-2xl border ${isDark ? "bg-black/40 border-white/5" : "bg-amber-50 border-amber-100"}`}>
                        <span className="text-[9px] text-amber-400 uppercase font-bold block">{isBn ? "বাকি প্রশ্ন" : "Remaining"}</span>
                        <span className="text-lg font-black text-amber-400 font-mono">{Math.max(0, totalQ - numAnswered)}</span>
                      </div>
                      <div className={`p-3 rounded-2xl border ${isDark ? "bg-black/40 border-white/5" : "bg-slate-50 border-slate-200"}`}>
                        <span className="text-[9px] text-gray-400 uppercase font-bold block">{isBn ? "বাকি সময়" : "Time Left"}</span>
                        <span className="text-lg font-black text-[#FFD700] font-mono">{formatTime(secondsRemaining)}</span>
                      </div>
                    </div>
                  );
                })()}

                <p className="text-xs text-gray-400 leading-relaxed font-sans">
                  {isBn
                    ? "আপনি কি এখনই আপনার অনুশীলনীর উত্তরপত্র জমা দিতে চান? সাবমিট করার পর প্রতিটি প্রশ্নের ব্যাখ্যাসহ বিস্তারিত প্রাপ্ত নম্বর % দেখতে পারবেন।"
                    : "Are you ready to finalize and submit your practice test? You will instantly see your detailed Marks %, explanations, and solution breakdown."}
                </p>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => setShowSubmitConfirmModal(false)}
                    className={`flex-1 py-2.5 rounded-xl border text-xs font-mono font-bold uppercase transition cursor-pointer ${
                      isDark ? "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10" : "bg-gray-100 border-gray-200 text-slate-700 hover:bg-gray-200"
                    }`}
                  >
                    {isBn ? "আরও উত্তর দিব" : "Keep Practicing"}
                  </button>
                  <button
                    onClick={() => {
                      setShowSubmitConfirmModal(false);
                      handleFinishExam();
                    }}
                    className="flex-1 py-2.5 bg-[#C1121F] hover:bg-red-700 text-white rounded-xl text-xs font-mono font-black uppercase transition shadow-lg shadow-red-600/30 cursor-pointer"
                  >
                    {isBn ? "ফলাফল দেখুন 🏁" : "SUBMIT NOW 🏁"}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Question Palette Drawer Overlay */}
        <AnimatePresence>
          {showQuestionPalette && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-5 rounded-2xl border shadow-2xl ${
                isDark ? "bg-[#161616] border-white/10" : "bg-white border-red-150 shadow-xl"
              }`}
            >
              <div className="flex justify-between items-center mb-3">
                <span className={`text-xs font-mono font-bold uppercase ${isDark ? "text-gray-300" : "text-slate-700"}`}>
                  {isBn ? "প্রশ্ন নেভিগেশন প্যালেট" : "QUESTION JUMP PALETTE"}
                </span>
                <div className="flex items-center gap-3 text-[10px] font-mono">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> {isBn ? "উত্তরকৃত" : "Answered"}</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> {isBn ? "ফ্ল্যাগড" : "Flagged"}</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-gray-500"></span> {isBn ? "বাকি" : "Remaining"}</span>
                </div>
              </div>

              <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-12 gap-2 max-h-48 overflow-y-auto pr-1">
                {activeExamData.questions.map((_, idx) => {
                  const answered = userAnswers[idx] !== undefined && userAnswers[idx] !== null;
                  const flagged = !!flaggedQuestions[idx];
                  const isCurrent = idx === currentQIndex;

                  let btnBg = isDark ? "bg-black/40 text-gray-400 border-white/5" : "bg-gray-100 text-slate-600 border-gray-200";
                  if (answered) btnBg = "bg-emerald-500 text-black font-bold border-emerald-400 shadow-sm";
                  if (flagged) btnBg = "bg-amber-500 text-black font-bold border-amber-400 shadow-sm";
                  if (isCurrent) btnBg += " ring-2 ring-[#C1121F] scale-105";

                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        recordCurrentQuestionTime();
                        setCurrentQIndex(idx);
                        setShowQuestionPalette(false);
                      }}
                      className={`h-9 rounded-lg border text-xs font-mono font-bold flex items-center justify-center transition ${btnBg}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Active Question Card */}
        <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl flex flex-col gap-6 relative ${
          isDark ? "bg-[#111111] border-white/10 text-white" : "bg-white border-red-150 text-slate-800"
        }`}>
          {/* Question Metadata Bar */}
          <div className="flex items-center justify-between flex-wrap gap-2 border-b pb-4 border-white/5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-black text-[#FFD700] px-2.5 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                Q {currentQIndex + 1} / {totalQ}
              </span>
              <span className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full border ${
                q.difficulty === "Easy"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : q.difficulty === "Hard"
                  ? "bg-red-500/10 text-red-400 border-red-500/20"
                  : "bg-blue-500/10 text-blue-400 border-blue-500/20"
              }`}>
                {q.difficulty}
              </span>
              {q.source && (
                <span className="text-[10px] font-mono text-gray-400 hidden sm:inline-block">
                  📍 {q.source}
                </span>
              )}
            </div>

            {/* Flag / Review Button */}
            <button
              onClick={handleToggleFlag}
              className={`px-3 py-1 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 transition ${
                isFlagged
                  ? "bg-amber-500 text-black border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                  : isDark ? "bg-white/5 border-white/10 text-gray-400 hover:text-white" : "bg-gray-100 border-gray-200 text-slate-600 hover:bg-gray-200"
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isFlagged ? "fill-black" : ""}`} />
              {isFlagged ? (isBn ? "চিহ্নিত (Flagged)" : "Flagged") : (isBn ? "রিভিউ করুন" : "Flag for Review")}
            </button>
          </div>

          {/* Question Text */}
          <div className="text-lg sm:text-xl font-bold leading-relaxed font-sans select-none">
            {q.questionText}
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
            {q.options.map((opt, optIdx) => {
              const isSelected = selectedAns === optIdx;
              const isCorrectOpt = optIdx === q.correctAnswerIndex;
              const letters = ["A", "B", "C", "D"];

              let optClass = isDark
                ? "bg-black/40 border-gray-800 text-gray-200 hover:border-gray-600 hover:bg-white/5"
                : "bg-gray-50 border-gray-200 text-slate-700 hover:border-red-300 hover:bg-red-50/30";

              if (isSelected) {
                optClass = isDark
                  ? "bg-[#C1121F]/20 border-[#C1121F] text-white shadow-[0_0_15px_rgba(193,18,31,0.2)]"
                  : "bg-red-50 border-[#C1121F] text-[#C1121F] font-bold shadow-sm";
              }

              // In instant mode, reveal correct/incorrect immediately if answered
              if (isInstantMode && showExplanationInstant) {
                if (isCorrectOpt) {
                  optClass = "bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold";
                } else if (isSelected && !isCorrectOpt) {
                  optClass = "bg-red-500/20 border-red-500 text-red-400 font-bold";
                }
              }

              return (
                <button
                  key={optIdx}
                  onClick={() => handleSelectOption(optIdx)}
                  className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition-all duration-200 cursor-pointer ${optClass}`}
                >
                  <span className={`w-7 h-7 rounded-xl border flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5 ${
                    isSelected
                      ? "bg-[#C1121F] text-white border-transparent"
                      : isDark ? "bg-white/5 border-white/10 text-gray-400" : "bg-white border-gray-300 text-slate-600"
                  }`}>
                    {letters[optIdx]}
                  </span>
                  <span className="text-sm font-medium leading-normal flex-1">{opt}</span>
                </button>
              );
            })}
          </div>

          {/* Instant Mode Explanation Card */}
          {isInstantMode && showExplanationInstant && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className={`p-4.5 rounded-2xl border ${
                selectedAns === q.correctAnswerIndex
                  ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-200"
                  : "bg-red-950/20 border-red-500/30 text-red-200"
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-xs mb-1.5 font-mono">
                {selectedAns === q.correctAnswerIndex ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400 uppercase">{isBn ? "সঠিক উত্তর!" : "CORRECT ANSWER!"}</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-red-400" />
                    <span className="text-red-400 uppercase">{isBn ? "ভুল উত্তর! সঠিক উত্তর:" : "INCORRECT! Correct Answer:"} {q.options[q.correctAnswerIndex]}</span>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-300 leading-relaxed font-sans mt-1">
                {q.explanation || "আবুল হাসান / হাজারী নাগ স্যারের বইয়ের রেফারেন্স অনুসারে সঠিক উত্তর নির্ধারিত।"}
              </p>
            </motion.div>
          )}

          {/* Bottom Actions Bar */}
          <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-2">
            <button
              onClick={handlePrevQuestion}
              disabled={currentQIndex === 0}
              className="px-4 py-2.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 disabled:opacity-30 transition hover:bg-white/5 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> {isBn ? "পূর্ববর্তী" : "Previous"}
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (currentQIndex === totalQ - 1) {
                    setShowSubmitConfirmModal(true);
                  } else {
                    handleNextQuestion();
                  }
                }}
                className="px-6 py-2.5 bg-[#C1121F] hover:bg-red-700 text-white rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg transition cursor-pointer"
              >
                {currentQIndex === totalQ - 1 ? (
                  <span>{isBn ? "সাবমিট ও ফলাফল 🏁" : "Submit & View Results 🏁"}</span>
                ) : (
                  <>
                    <span>{isBn ? "পরবর্তী প্রশ্ন" : "Next Question"}</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: RESULTS & DETAILED SOLUTION REVIEW
  // ==========================================
  if (viewState === "results" && lastAttemptResult) {
    const marksPercent = Math.max(0, Math.round((lastAttemptResult.score / (lastAttemptResult.maxScore || 1)) * 100));
    const filteredQuestions = lastAttemptResult.questions.filter((q) => {
      if (resultFilter === "correct") return q.isCorrect;
      if (resultFilter === "wrong") return !q.isCorrect && q.selectedAnswerIndex !== null;
      if (resultFilter === "skipped") return q.selectedAnswerIndex === null;
      return true;
    });

    return (
      <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 font-sans">
        {/* Score Banner Hero */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`p-6 sm:p-8 rounded-3xl border shadow-2xl relative overflow-hidden ${
            isDark
              ? "bg-gradient-to-br from-[#1F1112] via-[#111111] to-black border-white/10 text-white"
              : "bg-gradient-to-br from-red-50 via-white to-white border-red-150 shadow-xl text-slate-900"
          }`}
        >
          <div className="absolute top-0 right-0 w-80 h-80 bg-red-650/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono font-black uppercase px-2.5 py-0.5 rounded-full bg-[#C1121F] text-white">
                  PRACTICE COMPLETED
                </span>
                <span className="text-xs font-mono text-gray-400">
                  {lastAttemptResult.title}
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-display">
                {lastAttemptResult.score} / {lastAttemptResult.maxScore} <span className="text-sm font-mono text-gray-400">MARKS ({marksPercent}%)</span>
              </h2>
              <p className="text-xs text-gray-400 mt-1 max-w-md">
                {isBn
                  ? `মোট ${lastAttemptResult.totalQuestions} টি প্রশ্নের মধ্যে ${lastAttemptResult.correct} টি সঠিক, ${lastAttemptResult.wrong} টি ভুল এবং ${lastAttemptResult.skipped} টি বাদ দেওয়া হয়েছে। প্রাপ্ত নম্বর: ${marksPercent}%`
                  : `Completed ${lastAttemptResult.totalQuestions} questions with ${marksPercent}% Marks (${lastAttemptResult.score}/${lastAttemptResult.maxScore}) in ${formatTime(lastAttemptResult.timeTakenSeconds)}.`}
              </p>
            </div>

            {/* KPI Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto">
              <div className="p-3 rounded-2xl bg-black/40 border border-white/5 text-center">
                <span className="text-[10px] font-mono text-gray-400 uppercase block">{isBn ? "প্রাপ্ত নম্বর %" : "Marks %"}</span>
                <span className="text-xl font-black text-emerald-400 font-mono">{marksPercent}%</span>
              </div>
              <div className="p-3 rounded-2xl bg-black/40 border border-white/5 text-center">
                <span className="text-[10px] font-mono text-gray-400 uppercase block">{isBn ? "অর্জিত XP" : "XP Earned"}</span>
                <span className="text-xl font-black text-[#FFD700] font-mono">+{lastAttemptResult.xpEarned}</span>
              </div>
              <div className="p-3 rounded-2xl bg-black/40 border border-white/5 text-center">
                <span className="text-[10px] font-mono text-gray-400 uppercase block">{isBn ? "কয়েন" : "Coins"}</span>
                <span className="text-xl font-black text-yellow-500 font-mono">+{lastAttemptResult.coinsEarned}</span>
              </div>
              <div className="p-3 rounded-2xl bg-black/40 border border-white/5 text-center">
                <span className="text-[10px] font-mono text-gray-400 uppercase block">{isBn ? "সময়" : "Time"}</span>
                <span className="text-xl font-black text-cyan-400 font-mono">{formatTime(lastAttemptResult.timeTakenSeconds)}</span>
              </div>
            </div>
          </div>

          {/* Quick Retake Toolbar */}
          <div className="flex flex-wrap gap-2.5 mt-6 pt-5 border-t border-white/5">
            <button
              onClick={() => handleLaunchPractice({ mode: lastAttemptResult.mode, questionCount: lastAttemptResult.totalQuestions })}
              className="px-4 py-2 bg-[#C1121F] hover:bg-red-700 text-white rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition shadow"
            >
              <RotateCcw className="w-3.5 h-3.5" /> {isBn ? "একই সিলেবাসে পুনরায় অনুশীলন" : "Retake Same Syllabus"}
            </button>
            <button
              onClick={() => setViewState("hub")}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition border border-white/10"
            >
              <BookOpen className="w-3.5 h-3.5" /> {isBn ? "প্র্যাকটিস হাব-এ ফিরুন" : "Back to Practice Hub"}
            </button>
          </div>
        </motion.div>

        {/* Detailed Solutions Section */}
        <div className={`p-6 rounded-3xl border shadow-xl flex flex-col gap-5 ${
          isDark ? "bg-[#111111] border-white/10" : "bg-white border-red-150"
        }`}>
          {/* Solution Filter Tabs */}
          <div className="flex items-center justify-between flex-wrap gap-3 border-b pb-4 border-white/5">
            <h3 className={`text-base font-extrabold uppercase font-mono flex items-center gap-2 ${isDark ? "text-white" : "text-slate-900"}`}>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {isBn ? "বিস্তারিত প্রশ্ন সমাধান ও ব্যাখ্যা" : "DETAILED QUESTION EXPLANATIONS"} ({filteredQuestions.length})
            </h3>

            <div className="flex gap-1.5 bg-black/40 p-1 rounded-xl border border-white/5 text-xs font-mono">
              {[
                { id: "all", label: isBn ? "সবগুলো" : "All", count: lastAttemptResult.questions.length },
                { id: "correct", label: isBn ? "সঠিক" : "Correct", count: lastAttemptResult.correct },
                { id: "wrong", label: isBn ? "ভুল" : "Mistakes", count: lastAttemptResult.wrong },
                { id: "skipped", label: isBn ? "বাদ দেওয়া" : "Skipped", count: lastAttemptResult.skipped }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setResultFilter(tab.id as any)}
                  className={`px-3 py-1 rounded-lg transition font-bold ${
                    resultFilter === tab.id
                      ? "bg-[#C1121F] text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>
          </div>

          {/* Questions Solution List */}
          <div className="flex flex-col gap-4">
            {filteredQuestions.map((item, idx) => {
              const letters = ["A", "B", "C", "D"];
              return (
                <div
                  key={idx}
                  className={`p-5 rounded-2xl border flex flex-col gap-3 transition ${
                    item.isCorrect
                      ? "bg-emerald-950/10 border-emerald-500/20"
                      : item.selectedAnswerIndex === null
                      ? isDark ? "bg-black/30 border-white/5" : "bg-gray-50 border-gray-200"
                      : "bg-red-950/15 border-red-500/20"
                  }`}
                >
                  {/* Metadata Header */}
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] ${
                        item.isCorrect
                          ? "bg-emerald-500 text-black"
                          : item.selectedAnswerIndex === null
                          ? "bg-gray-600 text-white"
                          : "bg-red-500 text-white"
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="text-gray-400 font-bold">{item.subject} • {item.chapter}</span>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase ${
                      item.isCorrect
                        ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                        : item.selectedAnswerIndex === null
                        ? "text-gray-400 bg-gray-500/10 border border-gray-500/20"
                        : "text-red-400 bg-red-500/10 border border-red-500/20"
                    }`}>
                      {item.isCorrect ? "Correct (+1.0)" : item.selectedAnswerIndex === null ? "Skipped (0.0)" : `Wrong (-${lastAttemptResult.negativeMarking})`}
                    </span>
                  </div>

                  {/* Question Text */}
                  <div className={`text-sm font-bold leading-relaxed ${isDark ? "text-white" : "text-slate-900"}`}>
                    {item.questionText}
                  </div>

                  {/* Options Mini Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {item.options.map((opt, optIdx) => {
                      const isCorrect = optIdx === item.correctAnswerIndex;
                      const isUserChoice = optIdx === item.selectedAnswerIndex;

                      let optBox = isDark ? "bg-black/40 border-gray-800 text-gray-400" : "bg-white border-gray-200 text-slate-600";
                      if (isCorrect) optBox = "bg-emerald-500/15 border-emerald-500 text-emerald-300 font-bold";
                      if (isUserChoice && !isCorrect) optBox = "bg-red-500/15 border-red-500 text-red-300 line-through";

                      return (
                        <div key={optIdx} className={`p-2.5 rounded-xl border flex items-center gap-2 ${optBox}`}>
                          <span className="font-mono font-bold text-[10px] w-5 h-5 rounded-md bg-black/40 flex items-center justify-center shrink-0">
                            {letters[optIdx]}
                          </span>
                          <span className="truncate">{opt}</span>
                          {isCorrect && <Check className="w-3.5 h-3.5 text-emerald-400 ml-auto" />}
                          {isUserChoice && !isCorrect && <X className="w-3.5 h-3.5 text-red-400 ml-auto" />}
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation Reference */}
                  <div className={`p-3 rounded-xl border text-xs font-sans mt-1 leading-relaxed ${
                    isDark ? "bg-black/50 border-white/5 text-gray-300" : "bg-white border-red-100 text-slate-700"
                  }`}>
                    <span className="text-[#FFD700] font-mono font-bold block mb-1">
                      📖 {isBn ? "পাঠ্যবই রেফারেন্স ও ব্যাখ্যা:" : "Textbook Reference & Explanation:"}
                    </span>
                    {item.explanation}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 3: MAIN UNLIMITED PRACTICE HUB DASHBOARD
  // ==========================================
  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 sm:gap-8 font-sans">
      
      {/* 1. Header Hero Banner: Unlimited Practice Engine */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-6 sm:p-8 rounded-3xl border relative overflow-hidden shadow-2xl ${
          isDark
            ? "bg-gradient-to-r from-[#1A0B0C] via-[#0F0F0F] to-black border-white/10 text-white"
            : "bg-gradient-to-r from-red-50 via-white to-white border-red-150 text-slate-900 shadow-md"
        }`}
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-[radial-gradient(circle_at_right,_var(--tw-gradient-stops))] from-red-650/15 via-transparent to-transparent pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-mono font-black uppercase text-[#C1121F] tracking-widest">
                {isBn ? "আনলিমিটেড প্র্যাকটিস এক্সাম ইঞ্জিন" : "UNLIMITED PRACTICE ENGINE"}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                ● {userPracticeStats.totalPoolCount.toLocaleString()} {isBn ? "প্রশ্ন উন্মুক্ত" : "Questions in Pool"}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold uppercase font-display tracking-tight leading-tight">
              {isBn ? "মেডিকেল ভর্তি আনলিমিটেড প্র্যাকটিস" : "DOMINATE MAT WITH UNLIMITED PRACTICE"}
            </h1>

            <p className={`text-xs sm:text-sm mt-2 max-w-2xl leading-relaxed ${isDark ? "text-gray-400" : "text-slate-600"}`}>
              {isBn
                ? "ড. আবুল হাসান, হাজারী নাগ ও ড. ইসহাক স্যারের বইয়ের প্রতিটি অধ্যায় ও বিগত লাইভ মডেল টেস্টের প্রশ্নাবলী দিয়ে আনলিমিটেড কাস্টম ও র‍্যান্ডম প্র্যাকটিস পরীক্ষা তৈরি করুন।"
                : "Generate unlimited custom mock drills from our verified Question Pool, completed Live Exam Archives, and textbook chapter exercises."}
            </p>
          </div>

          {/* KPI Dashboard Rings */}
          <div className="flex items-center gap-3 sm:gap-4 border-t lg:border-t-0 lg:border-l pt-4 lg:pt-0 lg:pl-6 border-white/10 shrink-0 flex-wrap">
            <div className="text-center p-3 rounded-2xl bg-black/40 border border-white/5 min-w-[85px]">
              <span className="text-[10px] font-mono uppercase text-gray-400 block">{isBn ? "সমাধান" : "Solved"}</span>
              <span className="text-xl font-black text-cyan-400 font-display">
                {userPracticeStats.totalSolved}
              </span>
            </div>
            <div className="text-center p-3 rounded-2xl bg-black/40 border border-white/5 min-w-[85px]">
              <span className="text-[10px] font-mono uppercase text-gray-400 block">{isBn ? "সঠিকতা" : "Accuracy"}</span>
              <span className="text-xl font-black text-emerald-400 font-display">
                {userPracticeStats.accuracy}%
              </span>
            </div>
            <div className="text-center p-3 rounded-2xl bg-black/40 border border-white/5 min-w-[85px]">
              <span className="text-[10px] font-mono uppercase text-gray-400 block">{isBn ? "স্ট্রিক" : "Streak"}</span>
              <span className="text-xl font-black text-amber-500 font-display flex items-center justify-center gap-1">
                🔥 {userPracticeStats.streak}D
              </span>
            </div>
          </div>
        </div>

        {/* Quick Launch Buttons Row */}
        <div className="flex flex-wrap gap-2.5 mt-6 pt-5 border-t border-white/5">
          <button
            onClick={() => handleLaunchPractice({ mode: "random", questionCount: 20 })}
            className="px-4.5 py-2.5 bg-[#C1121F] hover:bg-red-700 text-white rounded-xl text-xs font-mono font-black uppercase tracking-wider flex items-center gap-2 transition shadow-lg shadow-red-500/20 cursor-pointer"
          >
            <Zap className="w-4 h-4 text-[#FFD700]" />
            {isBn ? "⚡ ইনস্ট্যান্ট মেগা ড্রিল (২০ MCQ)" : "⚡ Instant Smart Drill (20 MCQs)"}
          </button>

          <button
            onClick={() => {
              playSound("click");
              setActiveMode("custom");
              setViewState("custom_config");
            }}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-200 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition border border-white/10 cursor-pointer"
          >
            <Sliders className="w-4 h-4 text-[#C1121F]" />
            {isBn ? "🎯 কাস্টম এক্সাম জেনারেটর" : "🎯 Custom Generator"}
          </button>

          {mistakes.length > 0 && (
            <button
              onClick={() => handleLaunchPractice({ mode: "mistakes", questionCount: Math.min(25, mistakes.length) })}
              className="px-4 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition border border-amber-500/20 cursor-pointer"
            >
              <Brain className="w-4 h-4 text-amber-400" />
              {isBn ? `🧹 মিসটেক ব্যাংক রি-টেস্ট (${mistakes.length})` : `🧹 Mistake Bank Re-test (${mistakes.length})`}
            </button>
          )}

          {historyAttempts.length > 0 && (
            <button
              onClick={() => {
                setLastAttemptResult(historyAttempts[0]);
                setViewState("results");
              }}
              className="px-3.5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl text-xs font-mono font-semibold flex items-center gap-1.5 transition ml-auto"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              {isBn ? "বিগত ফলাফল দেখুন" : "Last Result"}
            </button>
          )}
        </div>
      </motion.div>

      {/* 2. Practice Modes Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        
        {/* Mode Card 1: Random Practice */}
        <div className={`p-6 rounded-3xl border flex flex-col justify-between gap-4 transition-all duration-300 hover:scale-[1.01] shadow-lg relative ${
          isDark ? "bg-[#111111] border-white/10 hover:border-red-500/30" : "bg-white border-red-150 shadow-md"
        }`}>
          <div>
            <div className="w-10 h-10 rounded-2xl bg-[#C1121F]/15 border border-[#C1121F]/30 flex items-center justify-center text-lg mb-3">
              🎲
            </div>
            <h3 className={`text-base font-extrabold uppercase font-mono ${isDark ? "text-white" : "text-slate-900"}`}>
              {isBn ? "র‍্যান্ডম মেগা প্র্যাকটিস" : "RANDOM MEGA DRILL"}
            </h3>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              {isBn
                ? "বায়োলজি, কেমিস্ট্রি, ফিজিক্স, জিকে ও ইংরেজির সম্পূর্ণ মেডিকেল সিলেবাস থেকে মিশ্রিত প্রশ্ন।"
                : "Simulate real admission conditions with a blended question pool across all subjects."}
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-white/5">
            {[10, 25, 50].map((count) => (
              <button
                key={count}
                onClick={() => handleLaunchPractice({ mode: "random", questionCount: count })}
                className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-[#C1121F] hover:text-white text-gray-300 text-xs font-mono font-bold transition border border-white/5 cursor-pointer"
              >
                {count} Qs
              </button>
            ))}
          </div>
        </div>

        {/* Mode Card 2: Subject-Wise Drill */}
        <div className={`p-6 rounded-3xl border flex flex-col justify-between gap-4 transition-all duration-300 hover:scale-[1.01] shadow-lg ${
          isDark ? "bg-[#111111] border-white/10 hover:border-emerald-500/30" : "bg-white border-red-150 shadow-md"
        }`}>
          <div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-lg mb-3">
              🧬
            </div>
            <h3 className={`text-base font-extrabold uppercase font-mono ${isDark ? "text-white" : "text-slate-900"}`}>
              {isBn ? "বিষয়ভিত্তিক পূর্ণাঙ্গ অনুশীলন" : "SUBJECT-WISE PRACTICE"}
            </h3>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              {isBn
                ? "নির্দিষ্ট বিষয়ে দক্ষতা বৃদ্ধির জন্য বায়োলজি, কেমিস্ট্রি বা ফিজিক্সের ডেডিকেটেড পরীক্ষা।"
                : "Target a specific subject to master core textbook concepts with speed and precision."}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-white/5">
            {(["Biology", "Chemistry", "Physics", "GK", "English"] as SubjectType[]).map((sub) => (
              <button
                key={sub}
                onClick={() => handleLaunchPractice({ mode: "subject", subjects: [sub], questionCount: 20 })}
                className="py-1.5 px-2 rounded-xl bg-white/5 hover:bg-emerald-600 hover:text-white text-gray-300 text-[11px] font-mono font-bold transition border border-white/5 truncate cursor-pointer text-center"
              >
                {sub}
              </button>
            ))}
          </div>
        </div>

        {/* Mode Card 3: Chapter & Topic Drill */}
        <div className={`p-6 rounded-3xl border flex flex-col justify-between gap-4 transition-all duration-300 hover:scale-[1.01] shadow-lg ${
          isDark ? "bg-[#111111] border-white/10 hover:border-yellow-500/30" : "bg-white border-red-150 shadow-md"
        }`}>
          <div>
            <div className="w-10 h-10 rounded-2xl bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center text-lg mb-3">
              📖
            </div>
            <h3 className={`text-base font-extrabold uppercase font-mono ${isDark ? "text-white" : "text-slate-900"}`}>
              {isBn ? "অধ্যায় ও টপিকভিত্তিক টেস্ট" : "CHAPTER & TOPIC DRILL"}
            </h3>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              {isBn
                ? "কোষ ও এর গঠন, গুণগত রসায়ন বা ভেক্টরের মতো অধ্যায় ধরে নিখুঁত প্র্যাকটিস করুন।"
                : "Dissect specific textbook chapters and high-yield topics with granular drills."}
            </p>
          </div>

          <button
            onClick={() => {
              setActiveMode("chapter");
              setViewState("custom_config");
            }}
            className="w-full py-2.5 rounded-xl bg-yellow-500/10 hover:bg-yellow-500 hover:text-black text-yellow-400 text-xs font-mono font-bold transition border border-yellow-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            {isBn ? "অধ্যায় নির্বাচন করুন ➔" : "Select Chapter ➔"}
          </button>
        </div>

        {/* Mode Card 4: AI Weakness Repair */}
        <div className={`p-6 rounded-3xl border flex flex-col justify-between gap-4 transition-all duration-300 hover:scale-[1.01] shadow-lg ${
          isDark ? "bg-[#111111] border-white/10 hover:border-cyan-500/30" : "bg-white border-red-150 shadow-md"
        }`}>
          <div>
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-lg mb-3">
              🤖
            </div>
            <h3 className={`text-base font-extrabold uppercase font-mono ${isDark ? "text-white" : "text-slate-900"}`}>
              {isBn ? "এআই দুর্বলতা মেরামত (Adaptive)" : "AI WEAKNESS REPAIR"}
            </h3>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              {isBn
                ? "আপনার বিগত ভুল উত্তরের হিস্টোরি বিশ্লেষণ করে দুর্বল চ্যাপ্টারগুলো থেকে প্রশ্ন তৈরি হবে।"
                : "AI automatically detects your low-accuracy chapters and generates a custom remedy drill."}
            </p>
          </div>

          <button
            onClick={() => handleLaunchPractice({ mode: "weakness", questionCount: 20 })}
            className="w-full py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500 hover:text-black text-cyan-400 text-xs font-mono font-bold transition border border-cyan-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isBn ? "দুর্বলতা দূরীকরণ শুরু করুন ⚡" : "Start Weakness Remedy ⚡"}
          </button>
        </div>

        {/* Mode Card 5: Mistake Bank Re-test */}
        <div className={`p-6 rounded-3xl border flex flex-col justify-between gap-4 transition-all duration-300 hover:scale-[1.01] shadow-lg ${
          isDark ? "bg-[#111111] border-white/10 hover:border-amber-500/30" : "bg-white border-red-150 shadow-md"
        }`}>
          <div>
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-lg mb-3">
              🧹
            </div>
            <h3 className={`text-base font-extrabold uppercase font-mono ${isDark ? "text-white" : "text-slate-900"}`}>
              {isBn ? "মিসটেক ব্যাংক রি-টেস্ট" : "MISTAKE BANK RE-TEST"}
            </h3>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              {isBn
                ? "আপনার পূর্বের ভুল করা প্রশ্নের উপর পরীক্ষা দিয়ে ভুল শুধরে নিন এবং মাস্টার করুন।"
                : "Re-attempt questions you answered incorrectly in live exams and practice sessions."}
            </p>
          </div>

          <button
            onClick={() => handleLaunchPractice({ mode: "mistakes", questionCount: Math.min(25, mistakes.length || 10) })}
            className="w-full py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500 hover:text-black text-amber-400 text-xs font-mono font-bold transition border border-amber-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Brain className="w-3.5 h-3.5" />
            {isBn ? `ভুল সংশোধন শুরু করুন (${mistakes.length}) ➔` : `Start Mistake Retest (${mistakes.length}) ➔`}
          </button>
        </div>

        {/* Mode Card 6: Past Live Exams Archive */}
        <div className={`p-6 rounded-3xl border flex flex-col justify-between gap-4 transition-all duration-300 hover:scale-[1.01] shadow-lg ${
          isDark ? "bg-[#111111] border-white/10 hover:border-purple-500/30" : "bg-white border-red-150 shadow-md"
        }`}>
          <div>
            <div className="w-10 h-10 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-lg mb-3">
              🏆
            </div>
            <h3 className={`text-base font-extrabold uppercase font-mono ${isDark ? "text-white" : "text-slate-900"}`}>
              {isBn ? "বিগত লাইভ এক্সাম আর্কাইভ" : "PAST LIVE EXAM ARCHIVE"}
            </h3>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              {isBn
                ? "শেষ হয়ে যাওয়া লাইভ মডেল টেস্টের প্রশ্নাবলী পুনরায় পরীক্ষা দিয়ে প্র্যাকটিস করুন।"
                : "Practice past completed Live Model Tests & batch exams with official timing and standards."}
            </p>
          </div>

          {completedLiveExams.length > 0 ? (
            <button
              onClick={() => {
                setSelectedArchiveExamId(completedLiveExams[0].id);
                handleLaunchPractice({ mode: "live_exam_archive", sourceExamId: completedLiveExams[0].id });
              }}
              className="w-full py-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500 hover:text-white text-purple-400 text-xs font-mono font-bold transition border border-purple-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Trophy className="w-3.5 h-3.5" />
              {isBn ? "লাইভ আর্কাইভ প্র্যাকটিস ➔" : "Practice Completed Live Exam ➔"}
            </button>
          ) : (
            <button
              onClick={() => handleLaunchPractice({ mode: "random", questionCount: 25 })}
              className="w-full py-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500 hover:text-white text-purple-400 text-xs font-mono font-bold transition border border-purple-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Trophy className="w-3.5 h-3.5" />
              {isBn ? "মেগা মডেল টেস্ট প্র্যাকটিস ➔" : "Mega Model Drill ➔"}
            </button>
          )}
        </div>

      </div>

      {/* 3. Subject Mastery Breakdown & Question Pool Matrix */}
      <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl flex flex-col gap-6 ${
        isDark ? "bg-[#111111] border-white/10" : "bg-white border-red-150 shadow-md"
      }`}>
        <div className="flex items-center justify-between flex-wrap gap-2 border-b pb-4 border-white/5">
          <div>
            <h3 className={`text-base font-extrabold uppercase font-mono flex items-center gap-2 ${isDark ? "text-white" : "text-slate-900"}`}>
              <Layers className="w-4 h-4 text-[#C1121F]" />
              {isBn ? "বিষয়ভিত্তিক প্রশ্ন পুল ও সিলেবাস ম্যাট্রিক্স" : "SUBJECT QUESTION POOL & SYLLABUS MATRIX"}
            </h3>
            <span className="text-xs text-gray-400 font-mono">
              {isBn ? "প্রতিটি বিষয়ের অধ্যায় সংখ্যা ও পুল স্ট্যাটাস" : "Live verified medical question counts across all subjects"}
            </span>
          </div>

          <button
            onClick={() => {
              setActiveMode("custom");
              setViewState("custom_config");
            }}
            className="text-xs font-mono text-[#C1121F] font-bold hover:underline flex items-center gap-1"
          >
            {isBn ? "কাস্টম ফিল্টার কনফিগ ➔" : "Configure Custom Exam ➔"}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {subjectStats.map((stat) => (
            <div
              key={stat.subject}
              className={`p-4.5 rounded-2xl border flex flex-col justify-between gap-3 transition hover:border-[#C1121F]/40 cursor-pointer ${
                isDark ? "bg-black/40 border-white/5" : "bg-red-50/20 border-red-100"
              }`}
              onClick={() => {
                setSelectedSubject(stat.subject as SubjectType);
                setActiveMode("chapter");
                setViewState("custom_config");
              }}
            >
              <div>
                <span className="text-xs font-mono font-bold text-[#FFD700] uppercase block mb-1">
                  {stat.subject}
                </span>
                <div className={`text-2xl font-extrabold font-display ${isDark ? "text-white" : "text-slate-900"}`}>
                  {stat.total} <span className="text-xs font-mono text-gray-400">MCQs</span>
                </div>
                <div className="text-[11px] text-gray-400 font-mono mt-1">
                  {stat.chapterCount} {isBn ? "টি চ্যাপ্টার" : "Chapters"}
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono border-t border-white/5 pt-2 text-gray-400">
                <span className="text-emerald-400">Easy: {stat.easy}</span>
                <span className="text-blue-400">Med: {stat.medium}</span>
                <span className="text-red-400">Hard: {stat.hard}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Custom Exam Generator Modal / Panel */}
      {viewState === "custom_config" && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`w-full max-w-2xl rounded-3xl border p-6 sm:p-8 flex flex-col gap-5 max-h-[90vh] overflow-y-auto shadow-2xl relative ${
              isDark ? "bg-[#111111] border-white/10 text-white" : "bg-white border-red-150 text-slate-800"
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-4 border-white/5">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#C1121F] uppercase tracking-wider">
                  ADVANCED EXAM BUILDER
                </span>
                <h3 className="text-xl font-extrabold uppercase font-display">
                  {isBn ? "কাস্টম প্র্যাকটিস এক্সাম কনফিগারেশন" : "CONFIGURE CUSTOM PRACTICE EXAM"}
                </h3>
              </div>
              <button
                onClick={() => setViewState("hub")}
                className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Subject Selector */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-mono font-bold text-gray-300 uppercase">
                1. {isBn ? "বিষয় নির্বাচন করুন" : "Select Subject"}
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {(["Biology", "Chemistry", "Physics", "GK", "English"] as SubjectType[]).map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => {
                      setSelectedSubject(sub);
                      setSelectedChapter("All");
                      setSelectedTopic("All");
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-mono font-bold transition truncate ${
                      selectedSubject === sub
                        ? "bg-[#C1121F] text-white border-[#C1121F]"
                        : isDark ? "bg-black/40 border-gray-800 text-gray-300 hover:text-white" : "bg-gray-100 border-gray-200 text-slate-700"
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>

            {/* Chapter Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono font-bold text-gray-300 uppercase">
                  2. {isBn ? "অধ্যায় (Chapter)" : "Chapter"}
                </label>
                <select
                  value={selectedChapter}
                  onChange={(e) => {
                    setSelectedChapter(e.target.value);
                    setSelectedTopic("All");
                  }}
                  className={`w-full p-2.5 rounded-xl border text-xs font-mono focus:outline-none focus:border-[#C1121F] ${
                    isDark ? "bg-black/60 border-gray-800 text-white" : "bg-white border-gray-300 text-slate-800"
                  }`}
                >
                  {availableChapters.map((chap) => (
                    <option key={chap} value={chap}>
                      {chap}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono font-bold text-gray-300 uppercase">
                  3. {isBn ? "টপিক (Topic)" : "Topic"}
                </label>
                <select
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-xs font-mono focus:outline-none focus:border-[#C1121F] ${
                    isDark ? "bg-black/60 border-gray-800 text-white" : "bg-white border-gray-300 text-slate-800"
                  }`}
                >
                  {availableTopics.map((top) => (
                    <option key={top} value={top}>
                      {top}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Question Count & Time */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-black/30 p-4 rounded-2xl border border-white/5">
              <div>
                <label className="text-[10px] font-mono font-bold text-gray-400 uppercase block mb-1">
                  {isBn ? "প্রশ্ন সংখ্যা" : "Question Count"}
                </label>
                <input
                  type="number"
                  min={5}
                  max={100}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Math.max(5, Math.min(100, Number(e.target.value))))}
                  className="w-full bg-black border border-gray-800 rounded-lg p-2 text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-[#C1121F]"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold text-gray-400 uppercase block mb-1">
                  {isBn ? "সময় (মিনিট)" : "Duration (Mins)"}
                </label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-black border border-gray-800 rounded-lg p-2 text-xs font-mono font-bold text-[#FFD700] focus:outline-none focus:border-[#C1121F]"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold text-gray-400 uppercase block mb-1">
                  {isBn ? "নেগেটিভ মার্ক" : "Negative Mark"}
                </label>
                <select
                  value={negativeMarking}
                  onChange={(e) => setNegativeMarking(Number(e.target.value))}
                  className="w-full bg-black border border-gray-800 rounded-lg p-2 text-xs font-mono text-red-400 focus:outline-none"
                >
                  <option value={0.25}>-0.25 (MAT Standard)</option>
                  <option value={0.50}>-0.50 (Varsity)</option>
                  <option value={0.00}>0.00 (No Neg)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold text-gray-400 uppercase block mb-1">
                  {isBn ? "কঠিনতা" : "Difficulty"}
                </label>
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value as any)}
                  className="w-full bg-black border border-gray-800 rounded-lg p-2 text-xs font-mono text-white focus:outline-none"
                >
                  <option value="All">All Difficulties</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
            </div>

            {/* Instant Mode Toggle */}
            <label className="flex items-center gap-3 p-3.5 rounded-2xl bg-black/40 border border-white/5 cursor-pointer hover:border-gray-700 transition">
              <input
                type="checkbox"
                checked={instantExplanation}
                onChange={(e) => setInstantExplanation(e.target.checked)}
                className="w-4 h-4 accent-[#C1121F] rounded"
              />
              <div className="text-xs">
                <span className="font-bold text-white block">
                  {isBn ? "ইনস্ট্যান্ট সমাধান মোড (Instant Explanation Mode)" : "Instant Explanation & Feedback Mode"}
                </span>
                <span className="text-[10px] text-gray-400">
                  {isBn ? "প্রতিটি অপশন ক্লিক করার সাথে সাথে সঠিক উত্তর ও ব্যাখ্যা দেখতে পাবেন।" : "Reveal correct answer and textbook explanation immediately after each choice."}
                </span>
              </div>
            </label>

            {/* Generate & Launch Button */}
            <button
              onClick={() => handleLaunchPractice()}
              className="w-full py-3.5 bg-[#C1121F] hover:bg-red-700 text-white font-mono font-black text-xs uppercase tracking-wider rounded-2xl transition shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              {isBn ? "কাস্টম প্র্যাকটিস শুরু করুন ➔" : "LAUNCH CUSTOM PRACTICE EXAM ➔"}
            </button>
          </motion.div>
        </div>
      )}

    </div>
  );
}
