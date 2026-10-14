import React, { useState, useEffect, useRef, useMemo } from "react";
import { db } from "../../lib/backend";
import { doc, setDoc, collection, query, where, onSnapshot, updateDoc } from "../../lib/supabaseDb";
import {
  Course,
  Batch,
  Enrollment,
  CourseClass,
  CourseMaterial,
  CourseAnnouncement,
  CourseExam,
  CourseExamAttempt,
  MistakeBankItem,
  LiveExamReExamPermission
} from "../../types/courseTypes";
import { UserProfile, Question } from "../../types";
import { STARTER_QUESTIONS } from "../../questionsData";
import { NotificationService } from "../../lib/notificationService";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  LayoutDashboard,
  Award,
  Video,
  FileText,
  AlertTriangle,
  Trophy,
  Bell,
  Play,
  Download,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  Clock,
  RotateCcw,
  Zap,
  ChevronRight,
  ChevronLeft,
  UserCheck,
  Check,
  MessageSquare,
  Calendar,
  CalendarPlus,
  CalendarCheck,
  Compass,
  BarChart3,
  History,
  Target,
  BrainCircuit,
  TrendingUp,
  SidebarClose,
  SidebarOpen,
  Hourglass,
  Bookmark,
  Flag,
  Send,
  Grid,
  Gamepad2,
  Filter,
  Keyboard,
  CheckSquare,
  Maximize2,
  Minimize2,
  CheckCircle,
  HelpCircle as QuestionIcon,
  ShieldCheck,
  ShieldAlert,
  EyeOff,
  BookOpen,
  Eye,
  Edit3,
  X,
  Sun,
  Moon
} from "lucide-react";
import { playSound } from "../../audio";
import BatchChat from "./BatchChat";
import AddToCalendarButton from "./AddToCalendarButton";
import UnlimitedPracticeHub from "../practice/UnlimitedPracticeHub";
import PdfReaderModal from "./PdfReaderModal";
import { downloadBatchScheduleIcs, downloadBatchExamsIcs } from "../../utils/calendarUtils";
import {
  subscribeToExamSecuritySettings,
  logExamViolation,
  DEFAULT_SECURITY_SETTINGS
} from "../../lib/examSecurityService";
import {
  TabSwitchWarningModal,
  AutoSubmittedDueToViolationModal,
  LiveExamSecurityBadge
} from "./LiveExamSecurityModal";
import { LiveExamSubmitConfirmModal } from "./LiveExamSubmitConfirmModal";
import { LiveExamSecuritySettings } from "../../types/courseTypes";
import LiveExamCountdownTimer, { isExamStarted } from "./LiveExamCountdownTimer";

interface CourseDashboardViewProps {
  course: Course;
  batch: Batch;
  enrollment: Enrollment;
  classes: CourseClass[];
  materials: CourseMaterial[];
  announcements: CourseAnnouncement[];
  exams: CourseExam[];
  mistakes?: MistakeBankItem[];
  allQuestions?: Question[];
  user: UserProfile;
  language: "bn" | "en";
  theme: "light" | "dark";
  onBackToMyCourses: () => void;
  onRecordAttempt?: (attempt: CourseExamAttempt) => void;
  onSaveMistake?: (mistake: MistakeBankItem) => void;
  onUpdateEnrollment?: (enrollment: Enrollment) => void;
  onProfileUpdate?: (updated: UserProfile) => void;
}

export default function CourseDashboardView({
  course,
  batch,
  enrollment,
  classes,
  materials,
  announcements,
  exams,
  mistakes = [],
  allQuestions = [],
  user,
  language,
  theme,
  onBackToMyCourses,
  onSaveMistake,
  onUpdateEnrollment,
  onProfileUpdate
}: CourseDashboardViewProps) {
  const isDark = theme === "dark";
  const isBn = language === "bn";

  const [activeTab, setActiveTab] = useState<
    "overview" | "chat" | "gaming" | "exams" | "practice" | "results" | "mistakes" | "leaderboard" | "classes" | "materials"
  >("overview");

  // Exam Player State & Active Ticking Timer
  const [activeExam, setActiveExam] = useState<CourseExam | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [bookmarkedQuestionIds, setBookmarkedQuestionIds] = useState<string[]>([]);
  const [reviewedQuestionIds, setReviewedQuestionIds] = useState<string[]>([]);
  const [isConfirmSubmitModalOpen, setIsConfirmSubmitModalOpen] = useState(false);
  const [paletteFilter, setPaletteFilter] = useState<"all" | "answered" | "unanswered" | "bookmarked" | "review">("all");
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [examAttemptResult, setExamAttemptResult] = useState<CourseExamAttempt | null>(null);
  const [examTimeRemaining, setExamTimeRemaining] = useState<number>(0);
  const [examTotalDuration, setExamTotalDuration] = useState<number>(0);
  const [examTimeTakenSeconds, setExamTimeTakenSeconds] = useState<number>(0);
  const [showExamChatSidebar, setShowExamChatSidebar] = useState<boolean>(false);
  const [autoSubmitWarning, setAutoSubmitWarning] = useState<boolean>(false);
  const [solutionFilter, setSolutionFilter] = useState<"all" | "wrong" | "skipped" | "correct">("all");
  const [mobilePaletteOpen, setMobilePaletteOpen] = useState<boolean>(false);
  const [selectedPaperTab, setSelectedPaperTab] = useState<string>("all");
  const [selectedChapterTab, setSelectedChapterTab] = useState<string>("all");
  const [materialsSubjectFilter, setMaterialsSubjectFilter] = useState<string>("All");

  // Exam Theme Preference (Light/Dark) - Defaults to Clean White Medical CBT
  const [examTheme, setExamTheme] = useState<"light" | "dark">(() => {
    try {
      const saved = localStorage.getItem("medibridge_exam_theme");
      if (saved === "light" || saved === "dark") return saved;
    } catch (e) {}
    return "light";
  });
  const isExamDark = examTheme === "dark";

  const toggleExamTheme = () => {
    playSound("click");
    setExamTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      try {
        localStorage.setItem("medibridge_exam_theme", next);
      } catch (e) {}
      return next;
    });
  };

  // Live Exam Anti-Cheating & Security States
  const [securitySettings, setSecuritySettings] = useState<LiveExamSecuritySettings>(DEFAULT_SECURITY_SETTINGS);
  const [tabSwitchCount, setTabSwitchCount] = useState<number>(0);
  const [isWarningModalOpen, setIsWarningModalOpen] = useState<boolean>(false);
  const [isAutoSubmitModalOpen, setIsAutoSubmitModalOpen] = useState<boolean>(false);
  const [lastViolationType, setLastViolationType] = useState<string>("TAB_SWITCH");

  const isSubmittingRef = useRef<boolean>(false);
  const lastViolationTimestampRef = useRef<number>(0);
  const examEndTimeRef = useRef<number>(0);
  const attemptIdRef = useRef<string>("");

  // Local Mistake Bank State & Course Attempts History
  const [localMistakes, setLocalMistakes] = useState<MistakeBankItem[]>(mistakes);
  const [courseAttempts, setCourseAttempts] = useState<CourseExamAttempt[]>([]);
  const [reExamPermissions, setReExamPermissions] = useState<Record<string, LiveExamReExamPermission>>({});

  // In-App PDF Reader Modal State
  const [readingMaterial, setReadingMaterial] = useState<CourseMaterial | null>(null);
  const [isPdfReaderOpen, setIsPdfReaderOpen] = useState<boolean>(false);

  const handleOpenPdfReader = (mat: CourseMaterial) => {
    playSound("click");
    setReadingMaterial(mat);
    setIsPdfReaderOpen(true);
  };

  // Compute Unanswered Question Indices for Live Exam confirmation & navigation
  const unansweredExamIndices = useMemo(() => {
    if (!activeExam?.questions) return [];
    return activeExam.questions
      .map((q, idx) => ({ q, idx }))
      .filter(({ q }) => selectedAnswers[q.id] === undefined)
      .map(({ idx }) => idx);
  }, [activeExam, selectedAnswers]);

  const handleJumpToQuestionCard = (qIdx: number) => {
    setCurrentQuestionIndex(qIdx);
    const el = document.getElementById(`live-question-card-${qIdx}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  // Subscribe to Global Live Exam Security Settings
  useEffect(() => {
    const unsub = subscribeToExamSecuritySettings((settings) => {
      setSecuritySettings(settings);
    });
    return () => unsub();
  }, []);

  // Listen to Admin Re-Exam Permissions for this user
  useEffect(() => {
    if (!user?.uid) return;
    try {
      const q = query(
        collection(db, "live_exam_reexam_permissions"),
        where("userId", "==", user.uid),
        where("status", "==", "active")
      );
      const unsub = onSnapshot(q, (snapshot) => {
        const perms: Record<string, LiveExamReExamPermission> = {};
        snapshot.docs.forEach((d) => {
          const data = d.data() as LiveExamReExamPermission;
          if (data && data.examId) {
            perms[data.examId] = data;
          }
        });
        setReExamPermissions(perms);
      }, (err) => {
        console.warn("Could not listen to re-exam permissions:", err);
      });
      return () => unsub();
    } catch (e) {
      console.warn("Re-exam listener error:", e);
    }
  }, [user?.uid]);

  // Keyboard Navigation for Live Exam (A/B/C/D or 1-4, Arrows, M for Mark, X for Clear)
  useEffect(() => {
    if (!activeExam || examSubmitted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid intercepting if inside text input or textarea (e.g. Chat)
      const targetTag = (e.target as HTMLElement)?.tagName?.toUpperCase();
      if (targetTag === "INPUT" || targetTag === "TEXTAREA") return;

      const currentQ = activeExam.questions[currentQuestionIndex];
      if (!currentQ) return;

      const key = e.key.toLowerCase();

      if (key === "1" || key === "a") {
        if (currentQ.options[0] !== undefined) handleSelectOption(currentQ.id, 0);
      } else if (key === "2" || key === "b") {
        if (currentQ.options[1] !== undefined) handleSelectOption(currentQ.id, 1);
      } else if (key === "3" || key === "c") {
        if (currentQ.options[2] !== undefined) handleSelectOption(currentQ.id, 2);
      } else if (key === "4" || key === "d") {
        if (currentQ.options[3] !== undefined) handleSelectOption(currentQ.id, 3);
      } else if (e.key === "ArrowRight") {
        if (currentQuestionIndex < activeExam.questions.length - 1) {
          playSound("click");
          setCurrentQuestionIndex((prev) => prev + 1);
        }
      } else if (e.key === "ArrowLeft") {
        if (currentQuestionIndex > 0) {
          playSound("click");
          setCurrentQuestionIndex((prev) => prev - 1);
        }
      } else if (key === "m") {
        toggleBookmark(currentQ.id);
      } else if (key === "x" || e.key === "Delete") {
        handleClearAnswer(currentQ.id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeExam, examSubmitted, currentQuestionIndex, activeExam?.questions]);

  // LIVE EXAM ANTI-CHEATING / TAB SWITCH & FOCUS BLUR DETECTION
  useEffect(() => {
    const isDetectionEnabled = activeExam?.securitySettings?.tabSwitchDetection ?? securitySettings.tabSwitchDetection;
    if (!activeExam || examSubmitted || !isDetectionEnabled) return;

    const handleViolationTrigger = (type: string) => {
      if (examSubmitted || isSubmittingRef.current) return;

      const now = Date.now();
      // Debounce threshold: 1500ms to prevent double firing (blur + visibilitychange)
      if (now - lastViolationTimestampRef.current < 1500) {
        return;
      }
      lastViolationTimestampRef.current = now;

      setTabSwitchCount((prev) => {
        const nextCount = prev + 1;
        const maxViolations =
          activeExam.securitySettings?.maxAllowedViolations ??
          securitySettings.maxAllowedViolations ??
          3;
        const autoSubmit =
          activeExam.securitySettings?.autoSubmitOnMaxViolations ??
          securitySettings.autoSubmitOnMaxViolations ??
          true;

        // Log violation record to Firestore
        logExamViolation({
          examAttemptId: attemptIdRef.current || `att_${activeExam.id}_${user.uid}`,
          studentId: user.uid,
          studentName: user.displayName || "Aspirant",
          studentEmail: user.email || "",
          examId: activeExam.id,
          examTitle: activeExam.title,
          violationType: type,
          violationCount: nextCount,
          maxAllowed: maxViolations,
        });

        // Persist count to session storage
        try {
          sessionStorage.setItem(`medibridge_viol_${activeExam.id}`, String(nextCount));
        } catch (e) {}

        if (nextCount >= maxViolations && autoSubmit) {
          // Auto Submit reached limit
          playSound("wrong");
          setIsWarningModalOpen(false);
          setIsAutoSubmitModalOpen(true);
          triggerAutoSubmitDueToViolation(nextCount);
        } else {
          // Non-terminal warning
          playSound("notification");
          setLastViolationType(type);
          setIsWarningModalOpen(true);
        }

        return nextCount;
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        handleViolationTrigger("PAGE_HIDDEN");
      }
    };

    const handleWindowBlur = () => {
      handleViolationTrigger("WINDOW_BLUR");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [activeExam, examSubmitted, securitySettings]);

  // Wall-Clock Synchronized Exam Countdown Timer (Does not pause on tab switches!)
  useEffect(() => {
    if (!activeExam || examSubmitted) return;

    const timer = setInterval(() => {
      if (examEndTimeRef.current > 0) {
        const now = Date.now();
        const remaining = Math.max(0, Math.round((examEndTimeRef.current - now) / 1000));
        setExamTimeRemaining(remaining);

        if (remaining <= 0) {
          clearInterval(timer);
          handleSubmitExam(false, tabSwitchCount);
        } else if (remaining === 60) {
          setAutoSubmitWarning(true);
          playSound("notification");
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [activeExam, examSubmitted, tabSwitchCount]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const toggleBookmark = (questionId: string) => {
    playSound("click");
    setBookmarkedQuestionIds((prev) =>
      prev.includes(questionId)
        ? prev.filter((id) => id !== questionId)
        : [...prev, questionId]
    );
  };

  const toggleMarkForReview = (questionId: string) => {
    playSound("click");
    setReviewedQuestionIds((prev) =>
      prev.includes(questionId)
        ? prev.filter((id) => id !== questionId)
        : [...prev, questionId]
    );
  };

  const scrollToQuestion = (qIdx: number) => {
    playSound("click");
    const el = document.getElementById(`live-question-card-${qIdx}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleClearAnswer = (questionId: string) => {
    playSound("click");
    setSelectedAnswers((prev) => {
      const next = { ...prev };
      delete next[questionId];
      try {
        if (activeExam) {
          sessionStorage.setItem(`medibridge_exam_answers_${activeExam.id}`, JSON.stringify(next));
        }
      } catch (e) {}
      return next;
    });
  };

  // Demo Batch Leaderboard with 15+ realistic Bangladeshi Medical Aspirant Students
  const batchLeaderboardData = [
    { rank: 1, name: user.displayName || "You", college: "Dhaka College", district: "Dhaka", target: "DMC (K-82)", score: 98, accuracy: 99, xp: 4800, isCurrent: true, avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=60" },
    { rank: 2, name: "Nusrat Jahan Subah", college: "Holy Cross College", district: "Dhaka", target: "DMC (K-82)", score: 96, accuracy: 98, xp: 4500, avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=60" },
    { rank: 3, name: "Tanvir Ahmed Rifat", college: "Notre Dame College", district: "Dhaka", target: "DMC (K-82)", score: 94, accuracy: 96, xp: 4200, avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&auto=format&fit=crop&q=60" },
    { rank: 4, name: "Sadiya Sultana Mim", college: "Viqarunnisa Noon College", district: "Gazipur", target: "SSMC", score: 93, accuracy: 95, xp: 3950, avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100&auto=format&fit=crop&q=60" },
    { rank: 5, name: "Mahi Rahman Shuvo", college: "Dhaka City College", district: "Narayanganj", target: "DMC", score: 91, accuracy: 93, xp: 3700, avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=60" },
    { rank: 6, name: "Tasfia Anjum Hia", college: "Ideal School & College", district: "Dhaka", target: "SOMC", score: 90, accuracy: 92, xp: 3500, avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=60" },
    { rank: 7, name: "Abrar Fahad Chowdhury", college: "Chittagong Govt College", district: "Chattogram", target: "CMC", score: 89, accuracy: 91, xp: 3350, avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=60" },
    { rank: 8, name: "Farhan Ishrak", college: "Rajshahi Govt College", district: "Rajshahi", target: "RMC", score: 88, accuracy: 90, xp: 3200, avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=100&auto=format&fit=crop&q=60" },
    { rank: 9, name: "Fahmida Akter Riya", college: "Mymensingh Girls' Cadet", district: "Mymensingh", target: "MMC", score: 87, accuracy: 89, xp: 3050, avatar: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&auto=format&fit=crop&q=60" },
    { rank: 10, name: "Nazmus Sakib", college: "MC College Sylhet", district: "Sylhet", target: "MAGOSMC", score: 86, accuracy: 88, xp: 2900, avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&auto=format&fit=crop&q=60" },
    { rank: 11, name: "Mehedi Hasan Sovon", college: "Barishal BM College", district: "Barishal", target: "SbMC", score: 85, accuracy: 87, xp: 2800, avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&auto=format&fit=crop&q=60" },
    { rank: 12, name: "Anika Bushra", college: "Cumilla Victoria College", district: "Cumilla", target: "CoMC", score: 84, accuracy: 86, xp: 2700, avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=60" },
    { rank: 13, name: "Rifatur Rahman", college: "Bogura Govt College", district: "Bogura", target: "ShSMC", score: 83, accuracy: 85, xp: 2600, avatar: "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=100&auto=format&fit=crop&q=60" },
    { rank: 14, name: "Shahriar Nafiz", college: "Carmichael College", district: "Rangpur", target: "RpMC", score: 82, accuracy: 84, xp: 2500, avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=60" },
    { rank: 15, name: "Jannatul Ferdous Hia", college: "Kushtia Govt College", district: "Kushtia", target: "KMC", score: 81, accuracy: 83, xp: 2400, avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=60" },
    { rank: 16, name: "Shafiqul Islam Shakil", college: "Feni Govt College", district: "Feni", target: "CMC", score: 80, accuracy: 82, xp: 2300, avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&auto=format&fit=crop&q=60" }
  ];

  // Course Question Pool
  const courseQuestionPool = React.useMemo(() => {
    const examQuestions: Question[] = [];
    exams.forEach((ex) => {
      if (Array.isArray(ex.questions)) {
        ex.questions.forEach((q) => {
          if (q.id) examQuestions.push(q);
        });
      }
    });
    const pool = allQuestions && allQuestions.length > 0 ? allQuestions : STARTER_QUESTIONS;
    return [...examQuestions, ...pool];
  }, [exams, allQuestions]);

  const handleStartExam = (exam: CourseExam) => {
    playSound("click");
    setActiveExam(exam);
    setCurrentQuestionIndex(0);
    setBookmarkedQuestionIds([]);
    setReviewedQuestionIds([]);
    setIsConfirmSubmitModalOpen(false);
    setIsWarningModalOpen(false);
    setIsAutoSubmitModalOpen(false);
    setPaletteFilter("all");
    setExamSubmitted(false);
    setExamAttemptResult(null);
    setAutoSubmitWarning(false);
    isSubmittingRef.current = false;
    attemptIdRef.current = `att_${exam.id}_${user.uid}_${Date.now()}`;

    const durationSeconds = (exam.durationMinutes || 45) * 60;
    const now = Date.now();
    const endTime = now + durationSeconds * 1000;
    examEndTimeRef.current = endTime;
    setExamTimeRemaining(durationSeconds);
    setExamTotalDuration(durationSeconds);

    // If student has an active re-exam permission, wipe cached prior session
    if (reExamPermissions[exam.id]) {
      try {
        sessionStorage.removeItem(`medibridge_exam_answers_${exam.id}`);
        sessionStorage.removeItem(`medibridge_viol_${exam.id}`);
      } catch (e) {}
      setSelectedAnswers({});
      setTabSwitchCount(0);
    } else {
      // Restore any existing session answers or violations if student reconnected
      try {
        const savedAnswers = sessionStorage.getItem(`medibridge_exam_answers_${exam.id}`);
        if (savedAnswers) {
          setSelectedAnswers(JSON.parse(savedAnswers));
        } else {
          setSelectedAnswers({});
        }

        const savedViol = sessionStorage.getItem(`medibridge_viol_${exam.id}`);
        if (savedViol) {
          setTabSwitchCount(Number(savedViol));
        } else {
          setTabSwitchCount(0);
        }
      } catch (e) {
        setSelectedAnswers({});
        setTabSwitchCount(0);
      }
    }
  };

  const handleSelectOption = (questionId: string, optionIdx: number) => {
    if (examSubmitted || isSubmittingRef.current) return;
    playSound("click");
    setSelectedAnswers((prev) => {
      const updated = { ...prev, [questionId]: optionIdx };
      try {
        if (activeExam) {
          sessionStorage.setItem(`medibridge_exam_answers_${activeExam.id}`, JSON.stringify(updated));
        }
      } catch (e) {}
      return updated;
    });
  };

  const triggerAutoSubmitDueToViolation = async (violationCount: number) => {
    await handleSubmitExam(true, violationCount);
  };

  const handleSubmitExam = async (isCheatingAutoSubmit: boolean = false, currentViolations: number = tabSwitchCount) => {
    if (!activeExam || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    playSound("levelup");
    setIsConfirmSubmitModalOpen(false);

    let correct = 0;
    let wrong = 0;
    let skipped = 0;
    const mistakes: MistakeBankItem[] = [];

    activeExam.questions.forEach((q) => {
      const userChoice = selectedAnswers[q.id];
      if (userChoice === undefined) {
        skipped++;
      } else if (userChoice === q.correctAnswerIndex) {
        correct++;
      } else {
        wrong++;
        // Add to mistake bank
        const mistakeItem: MistakeBankItem = {
          id: `mistake_${Date.now()}_${q.id}`,
          userId: user.uid,
          courseId: course.id,
          batchId: batch.id,
          questionId: q.id,
          questionText: q.questionText,
          options: q.options,
          correctAnswerIndex: q.correctAnswerIndex,
          userWrongIndex: userChoice,
          explanation: q.explanation || "আবুল হাসান / হাজারী নাগ স্যারের বইয়ের রেফারেন্স অনুসারে সঠিক উত্তর নির্ধারিত।",
          subject: q.subject || "Biology",
          chapter: q.chapter || "General",
          timestamp: new Date().toISOString(),
          reviewed: false
        };
        mistakes.push(mistakeItem);
        if (onSaveMistake) onSaveMistake(mistakeItem);
      }
    });

    setLocalMistakes((prev) => [...prev, ...mistakes]);

    const total = activeExam.questions.length;
    // Score calculation with -0.25 negative marking
    const netScore = Math.max(0, Number((correct - wrong * 0.25).toFixed(2)));
    const accPct = Math.round((correct / (correct + wrong || 1)) * 100);
    const timeSpent = Math.max(1, examTotalDuration - examTimeRemaining);
    setExamTimeTakenSeconds(timeSpent);

    // Live exams display submission record
    const result: CourseExamAttempt = {
      id: attemptIdRef.current || `att_${Date.now()}`,
      userId: user.uid,
      userDisplayName: user.displayName || "Aspirant",
      courseId: course.id,
      batchId: batch.id,
      examId: activeExam.id,
      examTitle: activeExam.title,
      score: netScore,
      totalQuestions: total,
      correctCount: correct,
      wrongCount: wrong,
      skippedCount: skipped,
      accuracyPct: accPct,
      rank: undefined, // Official merit pending
      percentile: undefined, // Percentile calculated after exam batch ends
      answers: selectedAnswers,
      submittedAt: new Date().toISOString(),
      tabSwitchCount: currentViolations,
      autoSubmittedDueToCheating: isCheatingAutoSubmit
    };

    setExamAttemptResult(result);
    setCourseAttempts((prev) => [result, ...prev]);
    setExamSubmitted(true);

    // Clear session cache for completed exam
    try {
      sessionStorage.removeItem(`medibridge_exam_answers_${activeExam.id}`);
      sessionStorage.removeItem(`medibridge_viol_${activeExam.id}`);
    } catch (e) {}

    // Save directly to Firestore live_exam_submissions for Teacher and Admin panel real-time evaluation
    try {
      const subId = `sub_${activeExam.id}_${user.uid}`;
      await setDoc(doc(db, "live_exam_submissions", subId), {
        id: subId,
        examId: activeExam.id,
        examTitle: activeExam.title,
        batchId: batch.id,
        batchTitle: batch.batchName,
        courseId: course.id,
        courseTitle: course.title,
        userId: user.uid,
        userDisplayName: user.displayName || "Aspirant",
        userEmail: user.email || "",
        score: netScore,
        totalQuestions: total,
        correctCount: correct,
        wrongCount: wrong,
        skippedCount: skipped,
        accuracy: accPct,
        scorePercent: total > 0 ? Math.round((netScore / total) * 100) : 0,
        timeTaken: timeSpent,
        answers: selectedAnswers,
        bookmarkedQuestions: bookmarkedQuestionIds,
        tabSwitchCount: currentViolations,
        autoSubmittedDueToCheating: isCheatingAutoSubmit,
        submittedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }, { merge: true });

      // If this was a re-exam, mark the permission document as used
      if (reExamPermissions[activeExam.id]) {
        try {
          const permId = `reexam_${activeExam.id}_${user.uid}`;
          await updateDoc(doc(db, "live_exam_reexam_permissions", permId), {
            status: "used",
            usedAt: new Date().toISOString()
          });
        } catch (reErr) {
          console.warn("Could not mark re-exam permission used:", reErr);
        }
      }
    } catch (dbErr) {
      console.warn("Could not sync live exam submission to Firestore:", dbErr);
    }

    // Update enrollment progress
    const updatedCompletedExams = Array.from(
      new Set([...(enrollment.completedExams || []), activeExam.id])
    );
    const newProgress = Math.min(
      100,
      Math.round((updatedCompletedExams.length / (exams.length || 1)) * 100)
    );

    if (onUpdateEnrollment) {
      onUpdateEnrollment({
        ...enrollment,
        completedExams: updatedCompletedExams,
        progressPct: newProgress
      });
    }

    // Automatically trigger notification for exam submission
    NotificationService.triggerEvent("EXAM_RESULT", {
      recipientId: user.uid,
      recipientName: user.displayName || "Aspirant",
      courseId: course.id,
      batchId: batch.id,
      variables: {
        exam_name: activeExam.title,
        student_score: netScore,
        total_score: total,
        student_name: user.displayName || "Aspirant"
      }
    });
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 flex flex-col gap-6 font-sans">
      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              playSound("click");
              onBackToMyCourses();
            }}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <span className="text-[10px] font-mono text-[#FFD700] uppercase block font-bold">
              {batch.batchName}
            </span>
            <h1 className="text-xl font-black text-white uppercase font-display leading-tight">
              {course.title}
            </h1>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none font-mono text-xs font-bold uppercase">
          {[
            { id: "overview", label: isBn ? "ওভারভিউ" : "Overview", icon: LayoutDashboard },
            { id: "chat", label: isBn ? "ব্যাচ চ্যাট 💬" : "Batch Chat 💬", icon: MessageSquare, highlight: true },
            { id: "exams", label: isBn ? "লাইভ এক্সাম" : "Live Exams", icon: Award },
            { id: "classes", label: isBn ? "ক্লাসসমূহ" : "Classes", icon: Video },
            { id: "materials", label: isBn ? "নোটস & শিট" : "Materials", icon: FileText },
            { id: "practice", label: isBn ? "আনলিমিটেড প্র্যাকটিস" : "Practice", icon: Compass },
            { id: "results", label: isBn ? "রেজাল্ট & হিস্টোরি" : "Results", icon: History },
            { id: "mistakes", label: isBn ? "মিসটেক ব্যাংক" : "Mistake Bank", icon: AlertTriangle },
            { id: "leaderboard", label: isBn ? "লিডারবোর্ড" : "Leaderboard", icon: Trophy }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  playSound("click");
                  setActiveTab(tab.id as any);
                  setActiveExam(null);
                }}
                className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-[#C1121F] text-white shadow-[0_0_12px_rgba(193,18,31,0.4)]"
                    : tab.highlight
                    ? "bg-red-950/40 hover:bg-red-900/60 text-red-300 hover:text-white border border-red-500/30"
                    : "bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${tab.highlight && !isActive ? "text-red-400" : "text-[#FFD700]"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* IF ACTIVE EXAM PLAYER IS OPEN - CLEAN WHITE MEDICAL CBT / DARK OLED THEME */}
      {activeExam ? (
        <div
          className={`border rounded-3xl p-3 sm:p-6 space-y-5 shadow-2xl font-sans transition-colors duration-200 ${
            isExamDark
              ? "bg-[#0b0e14] text-white border-white/10"
              : "bg-[#FAFAFC] text-slate-900 border-slate-200/90"
          }`}
        >
          {!examSubmitted ? (
            /* Live Exam Continuous Question Solving Mode - High Performance CBT Engine */
            <div className="space-y-5">
              {/* STICKY TOP HUD / FLOATING PROGRESS BAR */}
              <div
                className={`sticky top-0 z-30 backdrop-blur-md border rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-md transition-colors ${
                  isExamDark
                    ? "bg-[#151923]/95 border-white/10 text-white"
                    : "bg-white/95 border-slate-200 text-slate-900"
                }`}
              >
                {/* Left: Exam Info & Live Real-time Answer Counter */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#C1121F] text-white flex items-center justify-center font-mono font-black text-sm shrink-0 shadow-sm">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                        isExamDark
                          ? "text-red-400 bg-red-950/40 border-red-500/30"
                          : "text-[#C1121F] bg-red-50 border-red-200"
                      }`}>
                        {activeExam.questions[0]?.subject || activeExam.subject}
                      </span>

                      {/* Live Counter Badges */}
                      <span className={`px-2.5 py-0.5 rounded-full font-mono text-[11px] font-bold border flex items-center gap-1 ${
                        isExamDark
                          ? "bg-emerald-950/50 text-emerald-400 border-emerald-500/30"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        {isBn ? "উত্তর:" : "Ans:"} {Object.keys(selectedAnswers).length}/{activeExam.questions.length}
                      </span>

                      <span className={`px-2.5 py-0.5 rounded-full font-mono text-[11px] font-bold border ${
                        isExamDark
                          ? "bg-white/5 text-gray-300 border-white/10"
                          : "bg-slate-100 text-slate-700 border-slate-200"
                      }`}>
                        {isBn ? "বাকি:" : "Rem:"} {Math.max(0, activeExam.questions.length - Object.keys(selectedAnswers).length)}
                      </span>

                      {reviewedQuestionIds.length > 0 && (
                        <span className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold border ${
                          isExamDark
                            ? "bg-purple-950/50 text-purple-300 border-purple-500/30"
                            : "bg-purple-50 text-purple-700 border-purple-200"
                        }`}>
                          <span>🟣</span> {reviewedQuestionIds.length} {isBn ? "রিভিউ" : "Rev"}
                        </span>
                      )}

                      {bookmarkedQuestionIds.length > 0 && (
                        <span className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold border ${
                          isExamDark
                            ? "bg-amber-950/50 text-amber-300 border-amber-500/30"
                            : "bg-amber-50 text-amber-800 border-amber-200"
                        }`}>
                          <span>★</span> {bookmarkedQuestionIds.length}
                        </span>
                      )}
                    </div>
                    <h2 className={`text-sm sm:text-base font-black font-display truncate max-w-xs sm:max-w-md pt-0.5 ${
                      isExamDark ? "text-white" : "text-slate-900"
                    }`}>
                      {activeExam.title}
                    </h2>
                  </div>
                </div>

                {/* Center: Security Badge & Negative Marking Rule */}
                <div className="flex items-center gap-2">
                  <LiveExamSecurityBadge
                    isEnabled={Boolean(activeExam.securitySettings?.tabSwitchDetection ?? securitySettings.tabSwitchDetection)}
                    violationCount={tabSwitchCount}
                    maxAllowed={activeExam.securitySettings?.maxAllowedViolations ?? securitySettings.maxAllowedViolations ?? 3}
                    language={language}
                  />

                  <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono text-[11px] ${
                    isExamDark
                      ? "bg-white/5 border-white/10 text-gray-300"
                      : "bg-slate-100 border-slate-200 text-slate-700"
                  }`}>
                    <span className="text-emerald-500 font-bold">+1.00</span>
                    <span className="text-slate-400">/</span>
                    <span className="text-red-500 font-bold">-0.25</span>
                    <span className={`text-[10px] ml-1 ${isExamDark ? "text-gray-400" : "text-slate-500"}`}>
                      {isBn ? "নেগেটিভ" : "Neg. Mark"}
                    </span>
                  </div>
                </div>

                {/* Right: Digital Timer, Theme Switcher, Navigator Button & Submit Action */}
                <div className="flex items-center gap-2">
                  {/* Real-time Countdown Timer Pill */}
                  <div
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-mono text-xs sm:text-sm font-black transition border shadow-xs ${
                      examTimeRemaining <= 60
                        ? "bg-red-500/10 text-red-500 border-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.25)] animate-pulse"
                        : examTimeRemaining <= 300
                        ? isExamDark
                          ? "bg-amber-950/50 text-amber-400 border-amber-500/30"
                          : "bg-amber-50 text-amber-700 border-amber-300"
                        : isExamDark
                        ? "bg-emerald-950/50 text-emerald-400 border-emerald-500/30"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}
                  >
                    <Clock className={`w-4 h-4 ${examTimeRemaining <= 300 ? "animate-spin" : "animate-pulse"}`} />
                    <span className="tracking-widest">{formatTimer(examTimeRemaining)}</span>
                  </div>

                  {/* LIVE EXAM LIGHT / DARK THEME TOGGLE */}
                  <button
                    onClick={toggleExamTheme}
                    className={`p-2 rounded-xl border font-mono text-xs flex items-center justify-center cursor-pointer transition ${
                      isExamDark
                        ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 shadow-xs"
                    }`}
                    title={isExamDark ? (isBn ? "লাইট মোডে পরিবর্তন করুন" : "Switch to Light Theme") : (isBn ? "ডার্ক মোডে পরিবর্তন করুন" : "Switch to Dark Theme")}
                  >
                    {isExamDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
                  </button>

                  {/* Question Navigator Toggle Button */}
                  <button
                    onClick={() => {
                      playSound("click");
                      setMobilePaletteOpen((prev) => !prev);
                    }}
                    className={`px-3 py-1.5 rounded-xl border font-mono text-xs flex items-center gap-1.5 cursor-pointer transition font-bold ${
                      isExamDark
                        ? "bg-white/10 hover:bg-white/15 text-white border-white/10"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200 shadow-xs"
                    }`}
                    title={isBn ? "প্রশ্ন নেভিগেটর ওপেন করুন" : "Open Questions Navigator"}
                  >
                    <Grid className="w-4 h-4 text-[#C1121F]" />
                    <span className="font-bold">{isBn ? "☰ প্রশ্নসমূহ" : "☰ Questions"}</span>
                    <span className="px-1.5 py-0.2 rounded-md bg-[#C1121F] text-white text-[10px] font-mono font-bold">
                      {Object.keys(selectedAnswers).length}/{activeExam.questions.length}
                    </span>
                  </button>

                  {/* Direct Submit Header Button */}
                  <button
                    onClick={() => {
                      playSound("click");
                      setIsConfirmSubmitModalOpen(true);
                    }}
                    className="hidden sm:inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#C1121F] hover:bg-red-600 text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-md cursor-pointer border border-red-500"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isBn ? "জমা দিন" : "Submit"}</span>
                  </button>
                </div>
              </div>

              {/* Linear Dynamic Progress Bar Indicator */}
              <div className={`w-full h-2 rounded-full overflow-hidden border ${
                isExamDark ? "bg-white/10 border-white/5" : "bg-slate-200 border-slate-200"
              }`}>
                <div
                  className="h-full bg-gradient-to-r from-[#C1121F] via-amber-500 to-emerald-500 transition-all duration-300"
                  style={{
                    width: `${(Object.keys(selectedAnswers).length / (activeExam.questions.length || 1)) * 100}%`
                  }}
                />
              </div>

              {/* Urgent Timer Alert Notification if <= 1 min */}
              {autoSubmitWarning && examTimeRemaining > 0 && examTimeRemaining <= 60 && (
                <div className="p-3 bg-red-500/10 border border-red-500/40 rounded-xl text-red-500 text-xs font-mono flex items-center gap-2 animate-pulse shadow-sm">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>
                    {isBn
                      ? `সতর্কতা: পরীক্ষার সময় শেষ হতে মাত্র ${examTimeRemaining} সেকেন্ড বাকি! ০ সেকেন্ডে স্বয়ংক্রিয়ভাবে খাতা জমা হবে।`
                      : `Warning: Only ${examTimeRemaining}s remaining! Answers will be auto-submitted at 00:00.`}
                  </span>
                </div>
              )}

              {/* MAIN TWO-COLUMN SPLIT WORKSPACE */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* LEFT CONSOLE: CONTINUOUS SCROLLABLE QUESTION LIST */}
                <div className="lg:col-span-8 space-y-4">
                  {activeExam.questions.map((q, qIdx) => {
                    const isAnswered = selectedAnswers[q.id] !== undefined;
                    const isBookmarked = bookmarkedQuestionIds.includes(q.id);
                    const isMarkedForReview = reviewedQuestionIds.includes(q.id);
                    const currentSelected = selectedAnswers[q.id];

                    return (
                      <div
                        id={`live-question-card-${qIdx}`}
                        key={q.id || qIdx}
                        className={`border-2 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4 transition-all scroll-mt-28 ${
                          isExamDark
                            ? isMarkedForReview
                              ? "bg-purple-950/30 border-purple-500/40 text-white"
                              : isBookmarked
                              ? "bg-amber-950/30 border-amber-500/40 text-white"
                              : isAnswered
                              ? "bg-[#151d20] border-emerald-500/40 text-white"
                              : "bg-[#151923] border-white/10 text-white hover:border-white/20"
                            : isMarkedForReview
                            ? "bg-purple-50/30 border-purple-300 text-slate-900"
                            : isBookmarked
                            ? "bg-amber-50/30 border-amber-300 text-slate-900"
                            : isAnswered
                            ? "bg-emerald-50/25 border-emerald-300 text-slate-900"
                            : "bg-white border-slate-200/90 text-slate-900 hover:border-slate-300 shadow-[0_2px_8px_rgba(0,0,0,0.03)]"
                        }`}
                      >
                        {/* Meta bar: Serial, Subject, Status Badge & Action Controls */}
                        <div className={`flex flex-wrap items-center justify-between gap-2 border-b pb-3 font-mono text-xs ${
                          isExamDark ? "border-white/10" : "border-slate-100"
                        }`}>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-3 py-1 rounded-lg bg-[#C1121F] text-white font-bold text-xs uppercase font-mono tracking-wider shadow-xs">
                              {isBn ? `প্রশ্ন ${(qIdx + 1).toString().padStart(2, "0")}` : `QUESTION ${(qIdx + 1).toString().padStart(2, "0")}`}
                            </span>

                            <span className={`px-2.5 py-0.5 rounded-md font-bold border text-[11px] ${
                              isExamDark
                                ? "bg-white/5 border-white/10 text-gray-300"
                                : "bg-slate-100 border-slate-200 text-slate-700"
                            }`}>
                              {q.chapter || q.subject || "Medical Admission"}
                            </span>

                            {/* Status Indicator Badge */}
                            {isAnswered ? (
                              <span className={`px-2.5 py-0.5 rounded-full font-bold border text-[10px] flex items-center gap-1 ${
                                isExamDark
                                  ? "bg-emerald-950/60 text-emerald-400 border-emerald-500/30"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              }`}>
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                {isBn ? "🟢 উত্তরকৃত" : "🟢 Answered"}
                              </span>
                            ) : (
                              <span className={`px-2.5 py-0.5 rounded-full font-bold border text-[10px] flex items-center gap-1 ${
                                isExamDark
                                  ? "bg-white/5 text-gray-400 border-white/10"
                                  : "bg-slate-100 text-slate-500 border-slate-200"
                              }`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                {isBn ? "⚪ উত্তরহীন" : "⚪ Not Answered"}
                              </span>
                            )}

                            {isMarkedForReview && (
                              <span className={`px-2.5 py-0.5 rounded-full font-bold border text-[10px] flex items-center gap-1 ${
                                isExamDark
                                  ? "bg-purple-950/60 text-purple-300 border-purple-500/30"
                                  : "bg-purple-50 text-purple-700 border-purple-200"
                              }`}>
                                <span>🟣</span>
                                {isBn ? "রিভিউ" : "Review"}
                              </span>
                            )}

                            {isBookmarked && (
                              <span className={`px-2.5 py-0.5 rounded-full font-bold border text-[10px] flex items-center gap-1 ${
                                isExamDark
                                  ? "bg-amber-950/60 text-amber-300 border-amber-500/30"
                                  : "bg-amber-50 text-amber-800 border-amber-200"
                              }`}>
                                <span>★</span>
                                {isBn ? "বুকমার্কড" : "Bookmarked"}
                              </span>
                            )}
                          </div>

                          {/* Quick Action Controls for this individual card */}
                          <div className="flex items-center gap-1.5">
                            {/* Clear Answer Button */}
                            {isAnswered && (
                              <button
                                onClick={() => handleClearAnswer(q.id)}
                                className={`px-2.5 py-1 rounded-lg border transition text-[11px] font-bold cursor-pointer flex items-center gap-1 ${
                                  isExamDark
                                    ? "bg-red-950/40 hover:bg-red-900/50 text-red-300 border-red-500/30"
                                    : "bg-red-50 hover:bg-red-100 text-red-600 border-red-200"
                                }`}
                                title={isBn ? "উত্তর মুছে ফেলুন" : "Clear selection"}
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>{isBn ? "মুছুন" : "Clear"}</span>
                              </button>
                            )}

                            {/* Mark for Review Button */}
                            <button
                              onClick={() => toggleMarkForReview(q.id)}
                              className={`px-2.5 py-1 rounded-lg border flex items-center gap-1 transition text-[11px] font-bold cursor-pointer ${
                                isMarkedForReview
                                  ? isExamDark
                                    ? "bg-purple-950/60 border-purple-500/50 text-purple-200 shadow-xs"
                                    : "bg-purple-100 border-purple-300 text-purple-800 shadow-xs"
                                  : isExamDark
                                  ? "bg-white/5 hover:bg-white/10 text-gray-300 border-white/10"
                                  : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                              title={isBn ? "রিভিউয়ের জন্য মার্ক করুন" : "Mark for Review"}
                            >
                              <span className="text-purple-500 text-xs">🟣</span>
                              <span>{isMarkedForReview ? (isBn ? "রিভিউ মার্কড" : "Reviewed") : (isBn ? "রিভিউ" : "Review")}</span>
                            </button>

                            {/* Bookmark Button */}
                            <button
                              onClick={() => toggleBookmark(q.id)}
                              className={`px-2.5 py-1 rounded-lg border flex items-center gap-1 transition text-[11px] font-bold cursor-pointer ${
                                isBookmarked
                                  ? isExamDark
                                    ? "bg-amber-950/60 border-amber-500/50 text-amber-200 shadow-xs"
                                    : "bg-amber-100 border-amber-300 text-amber-800 shadow-xs"
                                  : isExamDark
                                  ? "bg-white/5 hover:bg-white/10 text-gray-300 border-white/10"
                                  : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                              title={isBn ? "বুকমার্ক করুন" : "Bookmark"}
                            >
                              <Bookmark
                                className={`w-3.5 h-3.5 ${
                                  isBookmarked ? "fill-amber-500 text-amber-500" : isExamDark ? "text-gray-500" : "text-slate-400"
                                }`}
                              />
                              <span>{isBookmarked ? (isBn ? "বুকমার্কড" : "Bookmarked") : (isBn ? "বুকমার্ক" : "Bookmark")}</span>
                            </button>
                          </div>
                        </div>

                        {/* Question Text with Maximum Crisp Contrast */}
                        <div className="space-y-2 pt-1">
                          <h3 className={`text-base sm:text-lg font-bold leading-relaxed font-sans ${
                            isExamDark ? "text-gray-100" : "text-slate-900"
                          }`}>
                            <span className="text-[#C1121F] font-mono mr-2 font-black text-lg">
                              {qIdx + 1}.
                            </span>
                            {q.questionText}
                          </h3>
                        </div>

                        {/* Options Grid (Immediate Auto-Save on Selection) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 font-sans">
                          {q.options.map((opt, oIdx) => {
                            const isSelected = currentSelected === oIdx;
                            const optionLetter = String.fromCharCode(65 + oIdx);

                            return (
                              <button
                                key={oIdx}
                                onClick={() => handleSelectOption(q.id, oIdx)}
                                className={`p-4 rounded-xl text-left text-xs sm:text-sm font-medium transition duration-150 flex items-start gap-3 border-2 cursor-pointer group shadow-xs ${
                                  isSelected
                                    ? isExamDark
                                      ? "bg-red-950/50 border-[#C1121F] text-white font-bold ring-2 ring-red-500/30"
                                      : "bg-red-50/90 border-[#C1121F] text-slate-950 font-bold ring-2 ring-red-500/20 shadow-sm"
                                    : isExamDark
                                    ? "bg-[#1c212c] border-white/10 text-gray-200 hover:border-white/20 hover:bg-[#232936]"
                                    : "bg-white border-slate-200 text-slate-800 hover:border-slate-400 hover:bg-slate-50/90"
                                }`}
                              >
                                <span
                                  className={`w-6 h-6 rounded-lg font-mono text-xs font-black flex items-center justify-center shrink-0 transition ${
                                    isSelected
                                      ? "bg-[#C1121F] text-white shadow-xs"
                                      : isExamDark
                                      ? "bg-white/10 text-gray-300 group-hover:bg-white/20"
                                      : "bg-slate-100 text-slate-700 group-hover:bg-slate-200 group-hover:text-slate-900 border border-slate-200"
                                  }`}
                                >
                                  {optionLetter}
                                </span>
                                <span className="leading-snug flex-1 pt-0.5">{opt}</span>
                                {isSelected && (
                                  <Check className="w-4 h-4 text-[#C1121F] shrink-0 mt-0.5" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {/* BOTTOM COMPLETION CALLOUT */}
                  <div className={`border-2 rounded-2xl p-6 text-center space-y-4 shadow-md ${
                    isExamDark
                      ? "bg-[#151923] border-red-500/30"
                      : "bg-gradient-to-b from-white to-red-50/40 border-red-200"
                  }`}>
                    <div className="w-12 h-12 rounded-2xl bg-[#C1121F] text-white flex items-center justify-center mx-auto shadow-md">
                      <Send className="w-6 h-6 text-white" />
                    </div>
                    <div className="space-y-1">
                      <h4 className={`text-base sm:text-lg font-bold font-display uppercase tracking-wide ${
                        isExamDark ? "text-white" : "text-slate-900"
                      }`}>
                        {isBn ? "আপনি পরীক্ষার সকল প্রশ্ন দেখেছেন" : "You have reached the end of the exam"}
                      </h4>
                      <p className={`text-xs font-mono ${isExamDark ? "text-gray-400" : "text-slate-600"}`}>
                        {isBn
                          ? `উত্তর দেওয়া হয়েছে: ${Object.keys(selectedAnswers).length} / ${activeExam.questions.length} | উত্তর বাকি: ${Math.max(0, activeExam.questions.length - Object.keys(selectedAnswers).length)}`
                          : `Answered: ${Object.keys(selectedAnswers).length} / ${activeExam.questions.length} | Unanswered: ${Math.max(0, activeExam.questions.length - Object.keys(selectedAnswers).length)}`}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        playSound("click");
                        setIsConfirmSubmitModalOpen(true);
                      }}
                      className="px-8 py-3.5 bg-gradient-to-r from-[#C1121F] to-red-600 hover:from-red-600 hover:to-rose-600 text-white font-black font-display text-sm uppercase tracking-wider rounded-xl transition shadow-lg cursor-pointer inline-flex items-center gap-2 border border-red-500"
                    >
                      <Send className="w-4 h-4 text-white" />
                      <span>{isBn ? "চূড়ান্তভাবে পরীক্ষা জমা দিন (SUBMIT EXAM)" : "SUBMIT EXAM NOW"}</span>
                    </button>
                  </div>
                </div>

                {/* RIGHT CONSOLE: STICKY QUESTION NAVIGATOR PALETTE */}
                <div
                  className={`lg:col-span-4 space-y-3.5 ${
                    mobilePaletteOpen
                      ? `fixed inset-x-4 top-20 bottom-6 z-50 overflow-y-auto border-2 border-[#C1121F] rounded-3xl p-5 shadow-2xl lg:static lg:inset-auto lg:p-0 ${
                          isExamDark ? "bg-[#151923] border-red-500 lg:border-white/10" : "bg-white border-slate-200"
                        }`
                      : "hidden lg:block lg:sticky lg:top-24"
                  }`}
                >
                  <div className={`border rounded-2xl p-4 space-y-3.5 shadow-md font-mono ${
                    isExamDark ? "bg-[#151923] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
                  }`}>
                    {/* Header with Close for Mobile */}
                    <div className={`flex items-center justify-between border-b pb-2.5 ${
                      isExamDark ? "border-white/10" : "border-slate-100"
                    }`}>
                      <div className="flex items-center gap-2">
                        <Grid className="w-4 h-4 text-[#C1121F]" />
                        <span className={`text-xs font-bold uppercase tracking-wider ${
                          isExamDark ? "text-white" : "text-slate-900"
                        }`}>
                          {isBn ? "☰ প্রশ্ন নেভিগেটর" : "☰ Questions Navigator"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            playSound("click");
                            setShowExamChatSidebar((prev) => !prev);
                          }}
                          className={`px-2 py-1 rounded-lg border text-[10px] font-mono font-bold transition flex items-center gap-1 cursor-pointer ${
                            showExamChatSidebar
                              ? isExamDark
                                ? "bg-sky-950/50 text-sky-300 border-sky-500/40"
                                : "bg-sky-50 text-sky-700 border-sky-300"
                              : isExamDark
                              ? "bg-white/5 hover:bg-white/10 text-gray-400 border-white/10"
                              : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-[#C1121F]" />
                          <span>{showExamChatSidebar ? "Hide Chat" : "Chat"}</span>
                        </button>

                        {mobilePaletteOpen && (
                          <button
                            onClick={() => setMobilePaletteOpen(false)}
                            className={`p-1 rounded-lg lg:hidden cursor-pointer ${
                              isExamDark
                                ? "bg-white/10 hover:bg-white/20 text-white"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                            }`}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Live Overview Status Count Pills */}
                    <div className="grid grid-cols-4 gap-1 text-center text-xs">
                      <div className={`p-2 border rounded-xl ${
                        isExamDark
                          ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
                          : "bg-emerald-50 border-emerald-200 text-emerald-800"
                      }`}>
                        <span className="text-[8px] uppercase font-bold block opacity-75">{isBn ? "উত্তরকৃত" : "Ans"}</span>
                        <span className="text-sm font-black">{Object.keys(selectedAnswers).length}</span>
                      </div>
                      <div className={`p-2 border rounded-xl ${
                        isExamDark
                          ? "bg-white/5 border-white/10 text-gray-300"
                          : "bg-slate-100 border-slate-200 text-slate-700"
                      }`}>
                        <span className="text-[8px] uppercase font-bold block opacity-75">{isBn ? "বাকি" : "Rem"}</span>
                        <span className="text-sm font-black">
                          {Math.max(0, activeExam.questions.length - Object.keys(selectedAnswers).length)}
                        </span>
                      </div>
                      <div className={`p-2 border rounded-xl ${
                        isExamDark
                          ? "bg-purple-950/40 border-purple-500/30 text-purple-300"
                          : "bg-purple-50 border-purple-200 text-purple-800"
                      }`}>
                        <span className="text-[8px] uppercase font-bold block opacity-75">{isBn ? "রিভিউ" : "Rev"}</span>
                        <span className="text-sm font-black">{reviewedQuestionIds.length}</span>
                      </div>
                      <div className={`p-2 border rounded-xl ${
                        isExamDark
                          ? "bg-amber-950/40 border-amber-500/30 text-amber-300"
                          : "bg-amber-50 border-amber-200 text-amber-800"
                      }`}>
                        <span className="text-[8px] uppercase font-bold block opacity-75">{isBn ? "বুকমার্ক" : "Mark"}</span>
                        <span className="text-sm font-black">{bookmarkedQuestionIds.length}</span>
                      </div>
                    </div>

                    {/* Question Matrix Filter Tabs */}
                    <div className="flex items-center justify-between gap-1 flex-wrap text-[10px]">
                      {[
                        { id: "all", label: isBn ? "সকল" : "All" },
                        { id: "answered", label: `🟢 ${isBn ? "উত্তর" : "Ans"}` },
                        { id: "unanswered", label: `⚪ ${isBn ? "বাকি" : "Rem"}` },
                        { id: "review", label: `🟣 ${isBn ? "রিভিউ" : "Rev"}` },
                        { id: "bookmarked", label: "★" }
                      ].map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setPaletteFilter(f.id as any)}
                          className={`px-2 py-1 rounded-lg transition border cursor-pointer font-bold ${
                            paletteFilter === f.id
                              ? isExamDark
                                ? "bg-white text-slate-900 border-white shadow-xs"
                                : "bg-slate-900 text-white border-slate-900 shadow-xs"
                              : isExamDark
                              ? "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"
                              : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>

                    {/* Question Number Matrix Grid (Jump Directly to Question) */}
                    <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-5 gap-1.5 max-h-64 overflow-y-auto p-1 scrollbar-thin">
                      {activeExam.questions.map((q, qIdx) => {
                        const isAnswered = selectedAnswers[q.id] !== undefined;
                        const isBookmarked = bookmarkedQuestionIds.includes(q.id);
                        const isMarkedForReview = reviewedQuestionIds.includes(q.id);

                        if (paletteFilter === "answered" && !isAnswered) return null;
                        if (paletteFilter === "bookmarked" && !isBookmarked) return null;
                        if (paletteFilter === "review" && !isMarkedForReview) return null;
                        if (paletteFilter === "unanswered" && isAnswered) return null;

                        return (
                          <button
                            key={q.id || qIdx}
                            onClick={() => {
                              scrollToQuestion(qIdx);
                              setMobilePaletteOpen(false);
                            }}
                            className={`relative h-9 rounded-lg text-xs font-bold transition flex items-center justify-center cursor-pointer border ${
                              isExamDark
                                ? isMarkedForReview
                                  ? "bg-purple-950/60 border-purple-400 text-purple-200 hover:bg-purple-900/70"
                                  : isBookmarked
                                  ? "bg-amber-950/60 border-amber-400 text-amber-200 hover:bg-amber-900/70"
                                  : isAnswered
                                  ? "bg-emerald-950/60 border-emerald-400 text-emerald-200 hover:bg-emerald-900/70"
                                  : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"
                                : isMarkedForReview
                                ? "bg-purple-100 border-purple-400 text-purple-900 hover:bg-purple-200"
                                : isBookmarked
                                ? "bg-amber-100 border-amber-400 text-amber-900 hover:bg-amber-200"
                                : isAnswered
                                ? "bg-emerald-100 border-emerald-400 text-emerald-900 hover:bg-emerald-200"
                                : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 hover:text-slate-900"
                            }`}
                            title={`Q${qIdx + 1}${isMarkedForReview ? " [Review]" : ""}${isBookmarked ? " [Bookmarked]" : ""}${isAnswered ? " [Answered]" : ""}`}
                          >
                            <span>{qIdx + 1}</span>
                            {isBookmarked && (
                              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-1 ring-white flex items-center justify-center text-[7px] text-white font-black">
                                ★
                              </span>
                            )}
                            {isMarkedForReview && (
                              <span className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-purple-600 ring-1 ring-white flex items-center justify-center text-[6px] text-white font-black">
                                •
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* PROMINENT SUBMIT BUTTON IN SIDEBAR */}
                    <div className={`pt-2 border-t ${isExamDark ? "border-white/10" : "border-slate-100"}`}>
                      <button
                        onClick={() => {
                          playSound("click");
                          setIsConfirmSubmitModalOpen(true);
                        }}
                        className="w-full py-3 bg-[#C1121F] hover:bg-red-600 text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-md cursor-pointer flex items-center justify-center gap-2 border border-red-500"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{isBn ? "পরীক্ষা জমা দিন (SUBMIT)" : "SUBMIT EXAM NOW"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Batch Chat in Right Column if Toggled */}
                  {showExamChatSidebar && (
                    <div className={`border rounded-2xl p-3 flex flex-col h-[380px] shadow-lg font-sans ${
                      isExamDark ? "bg-[#151923] border-white/10" : "bg-white border-slate-200"
                    }`}>
                      <div className={`flex items-center justify-between border-b pb-2 mb-2 font-mono ${
                        isExamDark ? "border-white/10" : "border-slate-100"
                      }`}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                          <span className={`text-xs font-bold uppercase flex items-center gap-1.5 ${
                            isExamDark ? "text-white" : "text-slate-800"
                          }`}>
                            <MessageSquare className="w-3.5 h-3.5 text-[#C1121F]" />
                            <span>{isBn ? "লাইভ ব্যাচ চ্যাট" : "Batch Chat"}</span>
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          isExamDark
                            ? "text-emerald-400 bg-emerald-950/40 border-emerald-500/30"
                            : "text-emerald-700 bg-emerald-50 border-emerald-200"
                        }`}>
                          {batch.batchName}
                        </span>
                      </div>

                      <div className="flex-1 overflow-y-auto pr-1">
                        <BatchChat
                          course={course}
                          batch={batch}
                          user={user}
                          language={language}
                          theme={examTheme}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* IN-APP LIVE EXAM SUBMISSION CONFIRMATION MODAL WITH UNATTEMPTED WARNING & JUMP LIST */}
              <LiveExamSubmitConfirmModal
                isOpen={isConfirmSubmitModalOpen}
                examTitle={activeExam.title}
                totalQuestions={activeExam.questions.length}
                answeredCount={Object.keys(selectedAnswers).length}
                reviewedCount={reviewedQuestionIds.length}
                bookmarkedCount={bookmarkedQuestionIds.length}
                timeRemainingSeconds={examTimeRemaining}
                unansweredIndices={unansweredExamIndices}
                language={language}
                isDark={isExamDark}
                onClose={() => setIsConfirmSubmitModalOpen(false)}
                onConfirmSubmit={() => {
                  setIsConfirmSubmitModalOpen(false);
                  handleSubmitExam(false, tabSwitchCount);
                }}
                onJumpToQuestion={handleJumpToQuestionCard}
              />

              {/* TAB SWITCH WARNING MODAL (Violation 1 to N-1) */}
              <TabSwitchWarningModal
                isOpen={isWarningModalOpen}
                violationCount={tabSwitchCount}
                maxAllowed={activeExam.securitySettings?.maxAllowedViolations ?? securitySettings.maxAllowedViolations ?? 3}
                detectedType={lastViolationType}
                language={language}
                onReturnToExam={() => {
                  playSound("click");
                  setIsWarningModalOpen(false);
                }}
              />

              {/* AUTO-SUBMITTED DUE TO VIOLATION MODAL */}
              <AutoSubmittedDueToViolationModal
                isOpen={isAutoSubmitModalOpen}
                language={language}
                totalQuestions={activeExam.questions.length}
                answeredCount={Object.keys(selectedAnswers).length}
                notAnsweredCount={Math.max(0, activeExam.questions.length - Object.keys(selectedAnswers).length)}
                score={examAttemptResult?.score}
                correctCount={examAttemptResult?.correctCount}
                wrongCount={examAttemptResult?.wrongCount}
                violationCount={tabSwitchCount}
                onViewResults={() => {
                  playSound("click");
                  setIsAutoSubmitModalOpen(false);
                }}
              />
            </div>
          ) : (
            /* Post-Exam Scorecard & Filtered Solution Review */
            <div className="space-y-5 font-sans">
              {/* Scorecard Hero Banner */}
              <div className={`border rounded-2xl p-5 sm:p-6 text-center space-y-4 shadow-md ${
                isExamDark ? "bg-[#151923] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
              }`}>
                <div className="flex items-center justify-between">
                  <div className="w-8" />
                  <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center mx-auto shadow-xs ${
                    isExamDark ? "bg-red-950/40 text-red-400 border-red-500/30" : "bg-red-50 text-[#C1121F] border-red-200"
                  }`}>
                    <Trophy className="w-6 h-6 text-[#C1121F]" />
                  </div>
                  {/* Theme Switcher in Post Exam */}
                  <button
                    onClick={toggleExamTheme}
                    className={`p-2 rounded-xl border text-xs cursor-pointer transition ${
                      isExamDark ? "bg-white/5 border-white/10 text-amber-400" : "bg-slate-100 border-slate-200 text-slate-700"
                    }`}
                    title="Toggle Theme"
                  >
                    {isExamDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  </button>
                </div>

                <div>
                  <h2 className={`text-xl sm:text-2xl font-black font-display ${
                    isExamDark ? "text-white" : "text-slate-900"
                  }`}>
                    {isBn ? "পরীক্ষার ফলাফল ও মূল্যায়ন" : "EXAM SCORECARD"}
                  </h2>
                  <p className={`text-xs font-mono mt-0.5 ${isExamDark ? "text-gray-400" : "text-slate-500"}`}>{activeExam.title}</p>
                </div>

                {/* Exam Security Integrity Banner if Violation Detected */}
                {examAttemptResult && ((examAttemptResult.tabSwitchCount !== undefined && examAttemptResult.tabSwitchCount > 0) || examAttemptResult.autoSubmittedDueToCheating) && (
                  <div className={`p-3.5 rounded-xl border text-left flex items-start gap-3 ${
                    examAttemptResult.autoSubmittedDueToCheating
                      ? isExamDark
                        ? "bg-red-950/40 border-red-500/40 text-red-300"
                        : "bg-red-50 border-red-200 text-red-800"
                      : isExamDark
                      ? "bg-amber-950/40 border-amber-500/40 text-amber-300"
                      : "bg-amber-50 border-amber-200 text-amber-800"
                  }`}>
                    <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <span className="font-bold font-mono uppercase block mb-0.5">
                        {examAttemptResult.autoSubmittedDueToCheating
                          ? (isBn ? "⚠️ ট্যাব পরিবর্তন সীমার কারণে অটো সাবমিট রেকর্ড করা হয়েছে" : "⚠️ AUTO-SUBMITTED DUE TO TAB SWITCH VIOLATION LIMIT")
                          : (isBn ? "ট্যাব সুইচ মনিটরিং লগ" : "EXAM TAB FOCUS MONITORING LOG")}
                      </span>
                      <p className={`leading-relaxed font-sans ${isExamDark ? "text-gray-300" : "text-slate-700"}`}>
                        {isBn
                          ? `পরীক্ষা চলাকালীন মোট ${examAttemptResult.tabSwitchCount || 0} বার ট্যাব/উইন্ডো পরিবর্তন সনাক্ত হয়েছে। এই লগটি সার্ভার ডেটাবেজে সংরক্ষিত রয়েছে।`
                          : `Total ${examAttemptResult.tabSwitchCount || 0} tab switch/focus loss events recorded during the live exam. Logged in server records.`}
                      </p>
                    </div>
                  </div>
                )}

                {/* 4 Performance Metrics */}
                {examAttemptResult && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-center pt-2">
                    <div className={`p-3 border rounded-xl ${
                      isExamDark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"
                    }`}>
                      <span className="text-[9px] opacity-75 uppercase block font-bold">NET SCORE</span>
                      <span className="text-2xl font-black text-emerald-500">{examAttemptResult.score}</span>
                      <span className="text-[9px] opacity-60 block">/ {examAttemptResult.totalQuestions}</span>
                    </div>
                    <div className={`p-3 border rounded-xl ${
                      isExamDark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"
                    }`}>
                      <span className="text-[9px] opacity-75 uppercase block font-bold">{isBn ? "প্রাপ্ত নম্বর %" : "MARKS %"}</span>
                      <span className="text-2xl font-black text-sky-500">
                        {Math.max(0, Math.round((examAttemptResult.score / (examAttemptResult.totalQuestions || 1)) * 100))}%
                      </span>
                      <span className="text-[9px] opacity-60 block">{isBn ? "নম্বর শতকরা হার" : "Marks %"}</span>
                    </div>
                    <div className={`p-3 border rounded-xl ${
                      isExamDark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"
                    }`}>
                      <span className="text-[9px] opacity-75 uppercase block font-bold">CORRECT / WRONG</span>
                      <span className={`text-lg font-black ${isExamDark ? "text-white" : "text-slate-800"}`}>
                        <span className="text-emerald-500">+{examAttemptResult.correctCount}</span> /{" "}
                        <span className="text-red-500">-{examAttemptResult.wrongCount}</span>
                      </span>
                      <span className="text-[9px] opacity-60 block">{examAttemptResult.skippedCount} Skipped</span>
                    </div>
                    <div className={`p-3 border rounded-xl ${
                      isExamDark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"
                    }`}>
                      <span className="text-[9px] opacity-75 uppercase block font-bold">TIME SPENT</span>
                      <span className="text-lg font-black text-purple-500">
                        {Math.floor(examTimeTakenSeconds / 60)}m {examTimeTakenSeconds % 60}s
                      </span>
                      <span className="text-[9px] opacity-60 block">Completed</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Official Merit Pending Notice */}
              <div className={`p-4 border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-sans ${
                isExamDark
                  ? "bg-amber-950/30 border-amber-500/30 text-amber-200"
                  : "bg-amber-50/70 border-amber-200 text-slate-800"
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${
                    isExamDark ? "bg-amber-950/60 border-amber-500/40 text-amber-400" : "bg-amber-100 border-amber-300 text-amber-700"
                  }`}>
                    <Hourglass className="w-4 h-4 animate-pulse" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h4 className={`text-xs sm:text-sm font-black uppercase font-mono ${
                        isExamDark ? "text-amber-300" : "text-amber-900"
                      }`}>
                        {isBn ? "অফিসিয়াল মেরিট লিস্ট অপেক্ষমান" : "OFFICIAL MERIT LIST PENDING"}
                      </h4>
                      <span className={`px-1.5 py-0.5 rounded font-mono text-[8px] font-bold uppercase border ${
                        isExamDark
                          ? "bg-amber-950/60 border-amber-500/40 text-amber-300"
                          : "bg-amber-100 border-amber-300 text-amber-800"
                      }`}>
                        Live Exam Window
                      </span>
                    </div>
                    <p className={`text-xs leading-relaxed font-sans ${isExamDark ? "text-gray-300" : "text-slate-700"}`}>
                      {isBn
                        ? "লাইভ পরীক্ষার সময়সীমা শেষ হলে সকল পরীক্ষার্থীর খাতা মূল্যায়ন শেষে চূড়ান্ত মেরিট লিস্ট ও পার্সেন্টাইল লিডারবোর্ডে প্রকাশিত হবে।"
                        : "Official batch rank & percentile will be published once the live exam submission window closes."}
                    </p>
                  </div>
                </div>

                <div className={`font-mono text-xs text-right shrink-0 px-3 py-1.5 rounded-xl border ${
                  isExamDark ? "bg-white/5 border-white/10" : "bg-white border-slate-200 shadow-xs"
                }`}>
                  <span className="text-[9px] opacity-75 block uppercase">MERIT TIMELINE</span>
                  <span className="text-amber-500 font-bold">{isBn ? "পরীক্ষা শেষে" : "Post-Exam"}</span>
                </div>
              </div>

              {/* FILTERED DETAILED QUESTION REVIEW */}
              <div className={`border rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm ${
                isExamDark ? "bg-[#151923] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
              }`}>
                {/* Solution Header & Filter Controls */}
                <div className={`flex flex-wrap items-center justify-between gap-3 border-b pb-3 ${
                  isExamDark ? "border-white/10" : "border-slate-100"
                }`}>
                  <div>
                    <h3 className={`text-sm font-black uppercase font-mono flex items-center gap-2 ${
                      isExamDark ? "text-white" : "text-slate-900"
                    }`}>
                      <CheckSquare className="w-4 h-4 text-emerald-500" />
                      <span>{isBn ? "প্রশ্ন সমাধান ও ব্যাখ্যা" : "QUESTION SOLUTIONS & EXPLANATIONS"}</span>
                    </h3>
                    <p className={`text-[11px] font-sans mt-0.5 ${isExamDark ? "text-gray-400" : "text-slate-500"}`}>
                      {isBn ? "ভুল উত্তরের প্রশ্নগুলো সরাসরি মিস্টেক ব্যাংকে সংরক্ষণ করা হয়েছে।" : "Incorrect answers have been saved to your Mistake Bank."}
                    </p>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 font-mono text-xs">
                    {[
                      { id: "all", label: isBn ? "সকল" : "All", count: activeExam.questions.length },
                      {
                        id: "wrong",
                        label: isBn ? "ভুল" : "Incorrect",
                        count: examAttemptResult?.wrongCount || 0,
                        color: "text-red-500"
                      },
                      {
                        id: "skipped",
                        label: isBn ? "বাদ দেওয়া" : "Skipped",
                        count: examAttemptResult?.skippedCount || 0,
                        color: isExamDark ? "text-gray-400" : "text-slate-500"
                      },
                      {
                        id: "correct",
                        label: isBn ? "সঠিক" : "Correct",
                        count: examAttemptResult?.correctCount || 0,
                        color: "text-emerald-500"
                      }
                    ].map((flt) => (
                      <button
                        key={flt.id}
                        onClick={() => {
                          playSound("click");
                          setSolutionFilter(flt.id as any);
                        }}
                        className={`px-2.5 py-1 rounded-lg border transition cursor-pointer text-[11px] font-bold ${
                          solutionFilter === flt.id
                            ? isExamDark
                              ? "bg-white text-slate-900 border-white shadow-xs"
                              : "bg-slate-900 border-slate-900 text-white shadow-xs"
                            : isExamDark
                            ? "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"
                            : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                        }`}
                      >
                        <span>{flt.label}</span> <span className={flt.color || ""}>({flt.count})</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filtered Question Solution Cards */}
                <div className="space-y-3.5 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin">
                  {activeExam.questions
                    .filter((q) => {
                      const userChoice = selectedAnswers[q.id];
                      const isCorrect = userChoice === q.correctAnswerIndex;
                      const isSkipped = userChoice === undefined;
                      if (solutionFilter === "wrong") return !isCorrect && !isSkipped;
                      if (solutionFilter === "skipped") return isSkipped;
                      if (solutionFilter === "correct") return isCorrect;
                      return true;
                    })
                    .map((q, idx) => {
                      const originalIdx = activeExam.questions.findIndex((orig) => orig.id === q.id);
                      const userChoice = selectedAnswers[q.id];
                      const isCorrect = userChoice === q.correctAnswerIndex;
                      const isSkipped = userChoice === undefined;

                      return (
                        <div
                          key={q.id || idx}
                          className={`p-4 rounded-xl border ${
                            isExamDark
                              ? isCorrect
                                ? "bg-emerald-950/20 border-emerald-500/30 text-white"
                                : isSkipped
                                ? "bg-white/5 border-white/10 text-white"
                                : "bg-red-950/20 border-red-500/30 text-white"
                              : isCorrect
                              ? "bg-emerald-50/50 border-emerald-200 text-slate-900"
                              : isSkipped
                              ? "bg-slate-50/70 border-slate-200 text-slate-900"
                              : "bg-red-50/50 border-red-200 text-slate-900"
                          } space-y-3`}
                        >
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className={`font-bold ${isExamDark ? "text-gray-400" : "text-slate-600"}`}>Q{originalIdx + 1}.</span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase border ${
                                isCorrect
                                  ? isExamDark
                                    ? "bg-emerald-950/60 text-emerald-400 border-emerald-500/40"
                                    : "bg-emerald-100 text-emerald-800 border-emerald-300"
                                  : isSkipped
                                  ? isExamDark
                                    ? "bg-white/10 text-gray-300 border-white/20"
                                    : "bg-slate-100 text-slate-600 border border-slate-300"
                                  : isExamDark
                                  ? "bg-red-950/60 text-red-400 border-red-500/40"
                                  : "bg-red-100 text-red-800 border border-red-300"
                              }`}
                            >
                              {isCorrect ? "CORRECT (+1.0)" : isSkipped ? "SKIPPED (0.0)" : "INCORRECT (-0.25)"}
                            </span>
                          </div>

                          <h4 className={`text-sm font-bold leading-relaxed font-sans ${
                            isExamDark ? "text-gray-100" : "text-slate-900"
                          }`}>
                            {q.questionText}
                          </h4>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                            {q.options.map((opt, oIdx) => {
                              const isUserPick = userChoice === oIdx;
                              const isRight = q.correctAnswerIndex === oIdx;
                              return (
                                <div
                                  key={oIdx}
                                  className={`p-2.5 rounded-xl border flex items-center justify-between ${
                                    isRight
                                      ? isExamDark
                                        ? "bg-emerald-950/60 border-emerald-400 text-emerald-200 font-bold"
                                        : "bg-emerald-100/70 border-emerald-300 text-emerald-900 font-bold shadow-2xs"
                                      : isUserPick
                                      ? isExamDark
                                        ? "bg-red-950/60 border-red-400 text-red-200 font-bold"
                                        : "bg-red-100/70 border-red-300 text-red-900 font-bold"
                                      : isExamDark
                                      ? "bg-[#1c212c] border-white/10 text-gray-300"
                                      : "bg-white border-slate-200 text-slate-700"
                                  }`}
                                >
                                  <span>{String.fromCharCode(65 + oIdx)}. {opt}</span>
                                  {isRight && <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                                  {isUserPick && !isRight && <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                                </div>
                              );
                            })}
                          </div>

                          {q.explanation && (
                            <div className={`p-3 rounded-xl text-xs font-mono leading-relaxed border ${
                              isExamDark
                                ? "bg-amber-950/30 text-amber-200 border-amber-500/30"
                                : "bg-amber-50/80 text-slate-800 border-amber-200"
                            }`}>
                              <strong className={`block mb-0.5 text-[11px] ${isExamDark ? "text-amber-400" : "text-amber-900"}`}>💡 EXPLANATION:</strong>
                              {q.explanation}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>

                {/* Return Dashboard Action */}
                <div className={`flex flex-wrap items-center justify-between gap-3 pt-3 border-t ${
                  isExamDark ? "border-white/10" : "border-slate-100"
                }`}>
                  <button
                    onClick={() => {
                      playSound("click");
                      setActiveTab("mistakes");
                      setActiveExam(null);
                    }}
                    className={`px-4 py-2 border text-xs font-mono font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                      isExamDark
                        ? "bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border-amber-500/40"
                        : "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300"
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5 text-amber-500" />
                    <span>{isBn ? "মিস্টেক ব্যাংক রিভিশন করুন" : "Open Mistake Bank"}</span>
                  </button>

                  <button
                    onClick={() => {
                      playSound("click");
                      setActiveExam(null);
                      setActiveTab("overview");
                    }}
                    className={`px-6 py-2.5 font-bold text-xs font-mono uppercase rounded-xl transition cursor-pointer ${
                      isExamDark
                        ? "bg-white hover:bg-gray-100 text-slate-900"
                        : "bg-slate-900 hover:bg-black text-white"
                    }`}
                  >
                    {isBn ? "ড্যাশবোর্ডে ফিরে যান" : "RETURN TO DASHBOARD"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* MAIN DASHBOARD TABS */
        <>
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Batch & Live Exam Status Hero Banner */}
              <div className="p-6 bg-gradient-to-r from-red-950/40 via-black to-[#111111] border border-red-900/30 rounded-3xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono font-bold bg-[#C1121F] text-white px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      🚨 NEXT LIVE EXAM IN 45 MINS
                    </span>
                    <h2 className="text-lg sm:text-xl font-black text-white font-display">
                      {exams[0]?.title || "মেডিকেল উইকলি মেগা মডেল টেস্ট"}
                    </h2>
                    <p className="text-xs text-gray-400 font-mono">
                      বিষয়: {exams[0]?.subject || "Biology"} • প্রশ্ন: {exams[0]?.totalQuestions || 50} টি • সময়: {exams[0]?.durationMinutes || 45} মিনিট
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => {
                        playSound("click");
                        setActiveTab("chat");
                      }}
                      className="px-4 py-3 bg-red-950/60 hover:bg-red-900 text-red-200 hover:text-white font-black text-xs font-mono uppercase rounded-xl transition border border-red-500/40 flex items-center gap-2 cursor-pointer shadow-[0_0_12px_rgba(239,68,68,0.2)]"
                    >
                      <MessageSquare className="w-4 h-4 text-red-400" />
                      <span>{isBn ? "লাইভ ব্যাচ চ্যাটে যান" : "BATCH LIVE CHAT"}</span>
                    </button>

                    {exams[0] && (
                      <button
                        onClick={() => handleStartExam(exams[0])}
                        className="px-6 py-3 bg-[#C1121F] hover:bg-red-600 text-white font-black text-xs font-mono uppercase rounded-xl transition shadow-[0_0_15px_rgba(193,18,31,0.5)] flex items-center gap-2 cursor-pointer"
                      >
                        <Play className="w-4 h-4 fill-white" />
                        <span>{isBn ? "লাইভ এক্সাম দিন" : "TAKE LIVE EXAM"}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5 pt-2 border-t border-white/5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-gray-400">{isBn ? "কোর্স সম্পন্নতা" : "Course Progress"}</span>
                    <span className="text-emerald-400 font-bold">{enrollment.progressPct}%</span>
                  </div>
                  <div className="w-full h-2 bg-black/60 rounded-full overflow-hidden border border-white/5">
                    <div
                      className="h-full bg-gradient-to-r from-[#C1121F] to-emerald-400 transition-all duration-500"
                      style={{ width: `${enrollment.progressPct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Quick Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 font-mono text-xs">
                <div 
                  onClick={() => {
                    playSound("click");
                    setActiveTab("chat");
                  }}
                  className="p-4 bg-red-950/30 border border-red-500/30 hover:border-red-500/60 rounded-2xl space-y-1 cursor-pointer transition shadow-[0_0_12px_rgba(220,38,38,0.15)] group"
                >
                  <span className="text-red-300 text-[10px] uppercase block flex items-center justify-between font-bold">
                    <span>BATCH CHAT</span>
                    <MessageSquare className="w-3.5 h-3.5 text-red-400 group-hover:scale-110 transition" />
                  </span>
                  <span className="text-2xl font-black text-white flex items-center gap-1.5">
                    <span>LIVE</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                  </span>
                  <span className="text-[10px] text-red-300/80 block">Peer Q&A & Mentors</span>
                </div>

                <div 
                  onClick={() => {
                    playSound("click");
                    setActiveTab("exams");
                  }}
                  className="p-4 bg-[#111111] border border-white/10 rounded-2xl space-y-1 cursor-pointer hover:border-red-500/40 transition"
                >
                  <span className="text-gray-400 text-[10px] uppercase block flex items-center justify-between">
                    <span>LIVE EXAMS</span>
                    <Award className="w-3.5 h-3.5 text-[#FFD700]" />
                  </span>
                  <span className="text-2xl font-black text-white">{exams.length}</span>
                  <span className="text-[10px] text-gray-500 block">Weekly & Subject Tests</span>
                </div>

                <div 
                  onClick={() => {
                    playSound("click");
                    setActiveTab("practice");
                  }}
                  className="p-4 bg-[#111111] border border-white/10 rounded-2xl space-y-1 cursor-pointer hover:border-emerald-500/40 transition"
                >
                  <span className="text-gray-400 text-[10px] uppercase block flex items-center justify-between">
                    <span>PRACTICE POOL</span>
                    <Compass className="w-3.5 h-3.5 text-emerald-400" />
                  </span>
                  <span className="text-2xl font-black text-emerald-400">{courseQuestionPool.length}</span>
                  <span className="text-[10px] text-gray-500 block">Unlimited Drills</span>
                </div>

                <div 
                  onClick={() => {
                    playSound("click");
                    setActiveTab("mistakes");
                  }}
                  className="p-4 bg-[#111111] border border-white/10 rounded-2xl space-y-1 cursor-pointer hover:border-[#C1121F]/40 transition"
                >
                  <span className="text-gray-400 text-[10px] uppercase block flex items-center justify-between">
                    <span>MISTAKE BANK</span>
                    <AlertTriangle className="w-3.5 h-3.5 text-[#C1121F]" />
                  </span>
                  <span className="text-2xl font-black text-[#C1121F]">{localMistakes.length}</span>
                  <span className="text-[10px] text-gray-500 block">Auto Recorded</span>
                </div>

                <div 
                  onClick={() => {
                    playSound("click");
                    setActiveTab("leaderboard");
                  }}
                  className="p-4 bg-[#111111] border border-white/10 rounded-2xl space-y-1 cursor-pointer hover:border-purple-500/40 transition"
                >
                  <span className="text-gray-400 text-[10px] uppercase block flex items-center justify-between">
                    <span>BATCH RANK</span>
                    <Trophy className="w-3.5 h-3.5 text-purple-400" />
                  </span>
                  <span className="text-2xl font-black text-white">#1</span>
                  <span className="text-[10px] text-gray-500 block">in {batch.totalStudents || 1420} students</span>
                </div>
              </div>

              {/* Course Announcements & Syllabus Quick View */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Announcements */}
                <div className="p-5 bg-[#111111] border border-white/10 rounded-2xl space-y-3">
                  <h3 className="text-sm font-black text-white uppercase font-mono flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[#FFD700]" />
                    <span>{isBn ? "কোর্স নোটিশ ও নির্দেশনা" : "Course Announcements"}</span>
                  </h3>
                  {announcements.length === 0 ? (
                    <p className="text-xs text-gray-500 font-mono">কোনো নতুন ঘোষণা নেই।</p>
                  ) : (
                    <div className="space-y-3">
                      {announcements.slice(0, 3).map((anc) => (
                        <div key={anc.id} className="p-3 bg-black/40 border border-white/5 rounded-xl space-y-1">
                          <span className="text-[10px] font-mono text-[#C1121F] font-bold uppercase">{anc.priority} PRIORITY</span>
                          <h4 className="text-xs font-bold text-white font-sans">{anc.title}</h4>
                          <p className="text-[11px] text-gray-400 font-sans leading-relaxed">{anc.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Course Faculty & Live Schedule */}
                <div className="p-5 bg-[#111111] border border-white/10 rounded-2xl space-y-3">
                  <h3 className="text-sm font-black text-white uppercase font-mono flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    <span>{isBn ? "মেন্টর ও ক্লাস রুটিন" : "Faculty & Live Schedule"}</span>
                  </h3>

                  <div className="flex items-center gap-3 p-3 bg-black/40 border border-white/5 rounded-xl">
                    <img
                      src={course.instructorAvatar || "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=60"}
                      alt={course.instructorName}
                      className="w-11 h-11 rounded-full object-cover border border-white/20"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-white font-sans">{course.instructorName}</h4>
                      <p className="text-[10px] text-gray-400 font-mono">{course.instructorTitle}</p>
                    </div>
                  </div>

                  <div className="p-3 bg-black/40 border border-white/5 rounded-xl space-y-1 font-mono text-xs">
                    <span className="text-[10px] text-[#FFD700] uppercase font-bold block">WEEKLY ROUTINE:</span>
                    <p className="text-gray-300 text-[11px]">{batch.scheduleDetails || "রবি, মঙ্গল, বৃহস্পতি রাত ৮:০০ টা"}</p>
                  </div>
                </div>
              </div>

              {/* Course Study Materials & PDF Handnotes Quick Access */}
              {materials.length > 0 && (
                <div className="p-5 bg-[#111111] border border-white/10 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-sky-400" />
                      <h3 className="text-sm font-black text-white uppercase font-mono">
                        {isBn ? "কোর্স লেকচার শিট & হাই-ইয়েল্ড নোটস" : "Course Lecture Sheets & Handnotes"}
                      </h3>
                    </div>
                    <button
                      onClick={() => {
                        playSound("click");
                        setActiveTab("materials");
                      }}
                      className="text-xs font-mono text-sky-400 hover:text-sky-300 font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <span>{isBn ? "সকল শিট দেখুন" : "View All"}</span>
                      <span>→</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {materials.slice(0, 3).map((mat) => (
                      <div
                        key={mat.id}
                        onClick={() => handleOpenPdfReader(mat)}
                        className="p-3.5 bg-black/40 hover:bg-sky-950/20 border border-white/5 hover:border-sky-500/40 rounded-xl space-y-2 cursor-pointer transition group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-sky-400 uppercase bg-sky-950/80 px-2 py-0.5 rounded border border-sky-500/20">
                            {mat.subject}
                          </span>
                          <span className="text-[10px] font-mono text-gray-500">{mat.fileSize}</span>
                        </div>
                        <h4 className="text-xs font-bold text-white group-hover:text-sky-300 transition line-clamp-1">
                          {mat.title}
                        </h4>
                        <div className="flex items-center gap-1 text-[11px] text-sky-400 font-mono font-bold pt-1">
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>{isBn ? "অ্যাপে পড়ুন" : "Read in App"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BATCH CHAT */}
          {activeTab === "chat" && (
            <div className="space-y-4">
              <BatchChat
                course={course}
                batch={batch}
                user={user}
                language={language}
                theme={theme}
              />
            </div>
          )}

          {/* TAB 3: LIVE EXAMS & SIDE-BY-SIDE BATCH CHAT */}
          {activeTab === "exams" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Live Exams List */}
              <div className="lg:col-span-7 xl:col-span-7 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3 font-mono text-xs">
                  <div className="space-y-0.5">
                    <h2 className="text-base font-black text-white uppercase font-display flex items-center gap-2">
                      <Award className="w-5 h-5 text-[#C1121F]" />
                      <span>{isBn ? "লাইভ এক্সাম & মডেল টেস্ট" : "Live Exams & Model Tests"}</span>
                    </h2>
                    <p className="text-gray-400 text-[11px] font-sans">
                      {isBn ? "নেগেটিভ মার্কিং -০.২৫ | লাইভ পরীক্ষা শেষ হলে মেধা তালিকা প্রকাশিত হবে" : "Negative marking -0.25 | Official batch merit list published post-exam"}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      playSound("click");
                      downloadBatchExamsIcs(batch.batchName, course.title, exams);
                    }}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl border border-white/10 transition flex items-center gap-2 cursor-pointer shrink-0 text-xs"
                  >
                    <CalendarPlus className="w-4 h-4 text-[#FFD700]" />
                    <span>{isBn ? "ক্যালেন্ডার সিঙ্ক (.ics)" : "Sync Exams (.ics)"}</span>
                  </button>
                </div>

                {/* Paper & Subject Filter Tabs (1st Paper / 2nd Paper / Final) */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none font-mono text-xs">
                  {[
                    { id: "all", label: isBn ? "সকল পরীক্ষা" : "All Exams" },
                    { id: "1st_paper", label: isBn ? "১ম পত্র (1st Paper)" : "1st Paper" },
                    { id: "2nd_paper", label: isBn ? "২য় পত্র (2nd Paper)" : "2nd Paper" },
                    { id: "final", label: isBn ? "মেগা মডেল টেস্ট" : "Mega Model" },
                  ].map((pTab) => (
                    <button
                      key={pTab.id}
                      onClick={() => {
                        playSound("click");
                        setSelectedPaperTab(pTab.id);
                      }}
                      className={`px-3.5 py-1.5 rounded-xl border font-bold whitespace-nowrap transition cursor-pointer ${
                        selectedPaperTab === pTab.id
                          ? "bg-[#C1121F] text-white border-red-500 shadow-md"
                          : "bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border-white/10"
                      }`}
                    >
                      {pTab.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-4">
                  {exams
                    .filter((exam) => {
                      if (selectedPaperTab === "1st_paper") {
                        return exam.title.includes("১ম") || exam.title.toLowerCase().includes("1st") || exam.chapter?.includes("১ম");
                      }
                      if (selectedPaperTab === "2nd_paper") {
                        return exam.title.includes("২য়") || exam.title.includes("২য়") || exam.title.toLowerCase().includes("2nd") || exam.chapter?.includes("২য়");
                      }
                      if (selectedPaperTab === "final") {
                        return exam.title.includes("মেগা") || exam.title.includes("মডেল") || exam.title.toLowerCase().includes("final");
                      }
                      return true;
                    })
                    .map((exam) => {
                    const hasReExam = Boolean(reExamPermissions[exam.id]);
                    const eventObj = {
                      title: `${exam.title} - ${course.title}`,
                      description: `Live Model Test: ${exam.chapter || "Medical Questions"} (Subject: ${exam.subject})`,
                      location: "MediBridge Live Exam Hall",
                      startDate: exam.startTime || "2026-08-16T20:00:00+06:00",
                      durationMinutes: exam.durationMinutes || 45
                    };

                    return (
                      <div
                        key={exam.id}
                        className={`p-5 bg-[#111111] border rounded-2xl space-y-4 transition flex flex-col justify-between ${
                          hasReExam ? "border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)]" : "border-white/10 hover:border-red-500/30"
                        }`}
                      >
                        <div className="space-y-2">
                          {/* Live Exam Status / Countdown Timer */}
                          {exam.status === "live_now" || exam.isLive ? (
                            <div className="mb-2 px-3 py-1.5 rounded-xl bg-red-600/20 border border-red-500/50 flex items-center justify-between text-xs font-mono">
                              <span className="flex items-center gap-1.5 text-red-400 font-black animate-pulse">
                                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping inline-block" />
                                🔴 {isBn ? "লাইভ পরীক্ষা চলছে!" : "LIVE EXAM IN PROGRESS!"}
                              </span>
                              <span className="text-[10px] text-gray-300 font-bold">
                                {isBn ? "এখনই অংশ নিন" : "Join Now"}
                              </span>
                            </div>
                          ) : (
                            <LiveExamCountdownTimer startTime={exam.startTime} language={language} className="mb-2" />
                          )}

                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono text-[#FFD700] uppercase font-bold px-2 py-0.5 bg-white/5 rounded">
                              {exam.subject}
                            </span>
                            <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {exam.totalQuestions} Questions • {exam.durationMinutes || 45} mins
                            </span>
                          </div>

                          <h3 className="text-base font-bold text-white font-sans leading-snug">
                            {exam.title}
                          </h3>
                          <p className="text-xs text-gray-400 font-mono">
                            সিলেবাস: {exam.chapter || "ফুল সিলেবাস"}
                          </p>

                          {hasReExam && (
                            <div className="p-2.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl flex items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
                                <RotateCcw className="w-3.5 h-3.5 text-emerald-400 animate-spin" style={{ animationDuration: "6s" }} />
                                <span>{isBn ? "অ্যাডমিন রি-এক্সাম পারমিশন মঞ্জুর করেছেন" : "Re-Exam Permission Granted by Admin"}</span>
                              </div>
                              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-mono text-[9px] uppercase font-extrabold rounded">
                                ACTIVE
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-3 pt-2">
                          <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 pt-2 border-t border-white/5">
                            <span>Pass: {exam.passMarks || 35} Marks</span>
                            <span className="text-red-400">Neg: -0.25</span>
                          </div>

                          <div className="flex items-center gap-2">
                            {(() => {
                              const started = isExamStarted(exam.startTime) || exam.status === "live_now" || exam.isLive === true;
                              return (
                                <button
                                  onClick={() => {
                                    if (!started && !hasReExam) {
                                      playSound("wrong");
                                      alert(isBn ? "পরীক্ষাটি এখনো শুরু হয়নি! কাউন্টডাউন শেষ হওয়ার পর পরীক্ষা শুরু করতে পারবেন।" : "This exam has not started yet! You can start once the countdown finishes.");
                                      return;
                                    }
                                    handleStartExam(exam);
                                  }}
                                  className={`flex-1 py-2.5 font-black text-xs font-mono uppercase rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
                                    !started && !hasReExam
                                      ? "bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                                      : hasReExam 
                                      ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]" 
                                      : "bg-[#C1121F] hover:bg-red-600 text-white shadow-[0_0_10px_rgba(193,18,31,0.3)]"
                                  }`}
                                >
                                  {!started && !hasReExam ? (
                                    <>
                                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                                      <span>{isBn ? "শুরু হতে বাকি (STARTS SOON)" : "STARTS SOON"}</span>
                                    </>
                                  ) : hasReExam ? (
                                    <>
                                      <RotateCcw className="w-3.5 h-3.5 text-white" />
                                      <span>{isBn ? "পুনরায় পরীক্ষা দিন (Re-Exam)" : "START RE-EXAM"}</span>
                                    </>
                                  ) : (
                                    <>
                                      <Play className="w-3.5 h-3.5 fill-white" />
                                      <span>{isBn ? "পরীক্ষা শুরু করুন" : "START EXAM"}</span>
                                    </>
                                  )}
                                </button>
                              );
                            })()}

                            <AddToCalendarButton
                              event={eventObj}
                              variant="secondary"
                              language={language}
                              theme={theme}
                              userId={user.uid}
                              userName={user.displayName}
                              courseId={course.id}
                              batchId={batch.id}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Live Batch Chat alongside Live Exam list */}
              <div className="lg:col-span-5 xl:col-span-5 space-y-3 sticky top-6">
                <div className="bg-[#111111] border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col h-[650px] shadow-2xl">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                      <h3 className="text-sm font-black text-white uppercase font-mono flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-[#FFD700]" />
                        <span>{isBn ? "লাইভ ব্যাচ চ্যাট ও ডিসকাশন" : "Batch Live Discussion"}</span>
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                      {batch.batchName}
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-1">
                    <BatchChat
                      course={course}
                      batch={batch}
                      user={user}
                      language={language}
                      theme={theme}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: UNLIMITED PRACTICE (SCOPED TO COURSE) */}
          {activeTab === "practice" && (
            <div className="space-y-4">
              <UnlimitedPracticeHub
                user={user}
                dbQuestions={courseQuestionPool}
                liveExams={exams}
                mistakes={localMistakes}
                language={language}
                theme={theme}
                courseId={course.id}
                batchId={batch.id}
                courseTitle={course.title}
                batchName={batch.batchName}
                courseSubjects={course.subjects}
                isCourseEmbedded={true}
                onProfileUpdate={onProfileUpdate || (() => {})}
              />
            </div>
          )}

          {/* TAB 4: RESULTS & EXAM HISTORY */}
          {activeTab === "results" && (
            <div className="space-y-4">
              <h2 className="text-base font-black text-white uppercase font-display flex items-center gap-2">
                <History className="w-5 h-5 text-sky-400" />
                <span>{isBn ? "কোর্স পরীক্ষার ফলাফল & হিস্টোরি" : "Course Results & Performance History"}</span>
              </h2>

              {courseAttempts.length === 0 ? (
                <div className="bg-[#111111] border border-white/10 rounded-2xl p-8 text-center space-y-3 font-mono">
                  <Award className="w-10 h-10 text-gray-600 mx-auto" />
                  <h3 className="text-sm font-bold text-white">
                    {isBn ? "এখনো কোনো পরীক্ষার রেকর্ড নেই" : "NO EXAM ATTEMPTS RECORDED YET"}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {isBn ? "লাইভ এক্সাম কিংবা আনলিমিটেড প্র্যাকটিস সম্পন্ন করার পর আপনার ফলাফল এখানে সংরক্ষিত থাকবে।" : "Your scored attempts will appear here with detailed accuracy metrics."}
                  </p>
                  <button
                    onClick={() => setActiveTab("exams")}
                    className="mt-2 px-5 py-2.5 bg-[#C1121F] text-white font-bold text-xs rounded-xl cursor-pointer"
                  >
                    {isBn ? "একটি লাইভ পরীক্ষা দিন" : "Take a Live Exam"}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {courseAttempts.map((att) => (
                    <div
                      key={att.id}
                      className="p-4 sm:p-5 bg-[#111111] border border-white/10 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs"
                    >
                      <div className="space-y-1">
                        <span className="text-[10px] text-gray-400 uppercase">
                          {new Date(att.submittedAt).toLocaleDateString()} • {new Date(att.submittedAt).toLocaleTimeString()}
                        </span>
                        <h4 className="text-sm font-bold text-white font-sans">{att.examTitle}</h4>
                        <div className="flex items-center gap-3 text-[11px]">
                          <span className="text-emerald-400 font-bold">✓ {att.correctCount} Correct</span>
                          <span className="text-red-400 font-bold">✗ {att.wrongCount} Wrong</span>
                          <span className="text-gray-400">○ {att.skippedCount} Skipped</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-white/5">
                        <div className="text-right">
                          <span className="text-[10px] text-gray-400 block uppercase">SCORE</span>
                          <span className="text-lg font-black text-emerald-400">{att.score}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-gray-400 block uppercase">{isBn ? "প্রাপ্ত নম্বর %" : "MARKS %"}</span>
                          <span className="text-lg font-black text-sky-400">
                            {att.totalQuestions ? Math.max(0, Math.round((att.score / att.totalQuestions) * 100)) : att.accuracyPct}%
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-gray-400 block uppercase">RANK</span>
                          {att.rank ? (
                            <span className="text-lg font-black text-[#FFD700]">#{att.rank}</span>
                          ) : (
                            <span className="px-2.5 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded-lg text-[10px] font-bold uppercase inline-block">
                              ⏳ {isBn ? "মেরিট অপেক্ষমান" : "Merit Pending"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: MISTAKE BANK */}
          {activeTab === "mistakes" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div>
                  <h2 className="text-base font-black text-white uppercase font-display flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-[#C1121F]" />
                    <span>{isBn ? "কোর্স অটো-মিসটেক ব্যাংক" : "Course Mistake Bank"}</span>
                  </h2>
                  <p className="text-xs text-gray-400 font-mono">
                    {isBn ? "এই কোর্সের সকল পরীক্ষার ভুল উত্তর ও টেক্সটবুক রেফারেন্স" : "Auto-saved incorrect questions and textbook references for this course"}
                  </p>
                </div>

                {localMistakes.length > 0 && (
                  <button
                    onClick={() => {
                      playSound("click");
                      setActiveTab("practice");
                    }}
                    className="px-4 py-2 bg-[#C1121F] hover:bg-red-600 text-white font-bold text-xs font-mono uppercase rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{isBn ? "ভুলগুলো আবার প্র্যাকটিস করুন" : "Practice Mistakes Now"}</span>
                  </button>
                )}
              </div>

              {localMistakes.length === 0 ? (
                <div className="bg-[#111111] border border-white/10 rounded-2xl p-8 text-center space-y-2 font-mono">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                  <h3 className="text-sm font-bold text-white">
                    {isBn ? "কোনো ভুল উত্তর জমা নেই!" : "NO MISTAKES RECORDED YET!"}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {isBn ? "মডেল টেস্ট পরীক্ষা দেওয়ার সাথে সাথে আপনার সকল ভুল উত্তর স্বয়ংক্রিয়ভাবে এখানে জমা হবে।" : "Incorrectly answered questions during course exams will be saved here automatically."}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {localMistakes.map((m) => (
                    <div key={m.id} className="p-5 bg-[#111111] border border-white/10 rounded-2xl space-y-3 font-sans">
                      <div className="flex items-center justify-between font-mono text-xs">
                        <span className="text-[10px] text-[#C1121F] font-bold uppercase">{m.subject} • {m.chapter}</span>
                        <span className="text-[10px] text-gray-500">{new Date(m.timestamp).toLocaleDateString()}</span>
                      </div>
                      <h4 className="text-sm font-bold text-white">{m.questionText}</h4>

                      {m.options && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                          {m.options.map((opt, oIdx) => {
                            const isCorrect = m.correctAnswerIndex === oIdx;
                            const isUserWrong = m.userWrongIndex === oIdx;
                            return (
                              <div
                                key={oIdx}
                                className={`p-2.5 rounded-xl border flex items-center justify-between ${
                                  isCorrect
                                    ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold"
                                    : isUserWrong
                                    ? "bg-red-500/20 border-red-500/50 text-red-300 font-bold"
                                    : "bg-black/30 border-white/5 text-gray-400"
                                }`}
                              >
                                <span>{String.fromCharCode(65 + oIdx)}. {opt}</span>
                                {isCorrect && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                                {isUserWrong && <XCircle className="w-3.5 h-3.5 text-red-400" />}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="p-3 bg-black/50 rounded-xl text-xs text-gray-300 leading-relaxed font-mono border border-white/5">
                        <strong className="text-[#FFD700] block mb-1">📚 REFERENCE EXPLANATION:</strong>
                        {m.explanation}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 7: LEADERBOARD */}
          {activeTab === "leaderboard" && (
            <div className="space-y-4 font-mono text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div>
                  <h2 className="text-base font-black text-white uppercase font-display flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-[#FFD700]" />
                    <span>{isBn ? `${batch.batchName} - লাইভ এক্সাম লিডারবোর্ড` : `${batch.batchName} - Live Exam Leaderboard`}</span>
                  </h2>
                  <p className="text-gray-400 text-[11px] font-sans">
                    {isBn ? "এই ব্যাচের সকল শিক্ষার্থীদের লাইভ মেরিট তালিকা" : "Isolated merit standing for enrolled batch students"}
                  </p>
                </div>
                <span className="text-[11px] text-gray-400 font-sans">
                  {isBn ? "মোট পরীক্ষার্থী: ১,৪২০ জন" : "Total Batch Aspirants: 1,420"}
                </span>
              </div>

              <div className="bg-[#111111] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                <div className="grid grid-cols-12 p-3.5 bg-black/70 text-gray-400 font-bold uppercase text-[10px] border-b border-white/10 tracking-wider">
                  <span className="col-span-2 sm:col-span-1 text-center">RANK</span>
                  <span className="col-span-6 sm:col-span-6">ASPIRANT & COLLEGE</span>
                  <span className="hidden sm:block sm:col-span-2 text-center">TARGET</span>
                  <span className="col-span-2 sm:col-span-1 text-center">MARKS</span>
                  <span className="col-span-2 sm:col-span-2 text-right">{isBn ? "প্রাপ্ত নম্বর %" : "MARKS %"}</span>
                </div>

                <div className="divide-y divide-white/5">
                  {batchLeaderboardData.map((row) => (
                    <div
                      key={row.rank}
                      className={`grid grid-cols-12 p-3.5 sm:p-4 items-center transition ${
                        row.isCurrent
                          ? "bg-[#C1121F]/20 border-l-4 border-l-[#C1121F] font-bold"
                          : "hover:bg-white/[0.03]"
                      }`}
                    >
                      <div className="col-span-2 sm:col-span-1 flex items-center justify-center">
                        <span className={`w-7 h-7 rounded-full font-black flex items-center justify-center text-xs ${
                          row.rank === 1
                            ? "bg-amber-400 text-black shadow-[0_0_10px_rgba(251,191,36,0.6)]"
                            : row.rank === 2
                            ? "bg-slate-300 text-black"
                            : row.rank === 3
                            ? "bg-amber-700 text-white"
                            : "bg-white/10 text-gray-300"
                        }`}>
                          {row.rank <= 3 ? (row.rank === 1 ? "🥇" : row.rank === 2 ? "🥈" : "🥉") : `#${row.rank}`}
                        </span>
                      </div>

                      <div className="col-span-6 sm:col-span-6 flex items-center gap-3">
                        <img
                          src={row.avatar}
                          alt={row.name}
                          className="w-9 h-9 rounded-full object-cover border border-white/20 shrink-0"
                        />
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-bold text-white font-sans">{row.name}</span>
                            {row.isCurrent && (
                              <span className="bg-[#C1121F] text-white text-[9px] font-mono px-1.5 py-0.5 rounded font-black uppercase">
                                YOU
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-gray-400 font-sans block leading-tight">
                            {row.college} • <span className="text-gray-500">{row.district}</span>
                          </span>
                        </div>
                      </div>

                      <div className="hidden sm:flex sm:col-span-2 items-center justify-center">
                        <span className="bg-purple-950/60 border border-purple-500/30 text-purple-300 text-[10px] font-mono font-bold px-2.5 py-1 rounded-full uppercase">
                          🎯 {row.target}
                        </span>
                      </div>

                      <div className="col-span-2 sm:col-span-1 text-center font-black text-emerald-400 text-sm">
                        {row.score}
                      </div>

                      <div className="col-span-2 sm:col-span-2 text-right text-sky-400 font-bold">
                        {row.score}%
                        <span className="text-[9px] text-gray-500 block font-normal">{row.xp} XP</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: CLASSES */}
          {activeTab === "classes" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3 font-mono text-xs">
                <div className="space-y-0.5">
                  <h2 className="text-base font-black text-white uppercase font-display flex items-center gap-2">
                    <Video className="w-5 h-5 text-emerald-400" />
                    <span>{isBn ? "লাইভ & রেকর্ডেড ক্লাসসমূহ" : "Live & Recorded Classes"}</span>
                  </h2>
                  <p className="text-gray-400 text-[11px] font-sans">
                    {isBn ? "এইচডি ভিডিও লেকচার ও গুগল মিট লাইভ সেশন" : "HD Video Lectures & Google Meet Sessions"}
                  </p>
                </div>

                <button
                  onClick={() => {
                    playSound("click");
                    downloadBatchScheduleIcs(batch.batchName, course.title, classes);
                  }}
                  className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl border border-white/10 transition flex items-center gap-2 cursor-pointer shrink-0"
                >
                  <CalendarPlus className="w-4 h-4 text-[#FFD700]" />
                  <span>{isBn ? "সম্পূর্ণ রুটিন ক্যালেন্ডারে যোগ করুন (.ics)" : "Sync Full Routine (.ics)"}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {classes.map((cls) => {
                  const eventObj = {
                    title: `${cls.title} - ${course.title}`,
                    description: `${cls.description}\nInstructor: ${cls.instructor}\nSubject: ${cls.subject} (${cls.chapter})`,
                    location: cls.isLive ? (cls.liveUrl || "Google Meet") : "MediBridge Classroom",
                    startDate: cls.date || "2026-08-16T19:30:00+06:00",
                    durationMinutes: cls.durationMinutes || 75
                  };

                  return (
                    <div
                      key={cls.id}
                      className="p-5 bg-[#111111] border border-white/10 rounded-2xl space-y-4 hover:border-white/20 transition flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold px-2 py-0.5 bg-white/5 rounded">
                            {cls.subject}
                          </span>
                          {cls.isLive ? (
                            <span className="text-[10px] font-mono bg-red-600 text-white font-black px-2 py-0.5 rounded uppercase animate-pulse">
                              ● LIVE CLASS
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-gray-400 uppercase">
                              RECORDED
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm font-bold text-white leading-snug">{cls.title}</h3>
                        <p className="text-xs text-gray-400 font-sans">{cls.description}</p>
                      </div>

                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 pt-2 border-t border-white/5">
                          <span>By {cls.instructor}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-emerald-400" />
                            {cls.durationMinutes} mins
                          </span>
                        </div>

                        {/* Action buttons including Add to Calendar */}
                        <div className="flex items-center gap-2 pt-1">
                          <div className="flex-1">
                            {cls.isLive ? (
                              <a
                                href={cls.liveUrl || "#"}
                                target="_blank"
                                rel="noreferrer"
                                onClick={() => playSound("click")}
                                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-black font-extrabold text-xs font-mono uppercase rounded-xl transition flex items-center justify-center gap-2 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                              >
                                <span>{isBn ? "লাইভ ক্লাসে যোগ দিন" : "JOIN LIVE CLASS"}</span>
                              </a>
                            ) : (
                              <a
                                href={cls.recordingUrl || "#"}
                                target="_blank"
                                rel="noreferrer"
                                onClick={() => playSound("click")}
                                className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white font-extrabold text-xs font-mono uppercase rounded-xl transition flex items-center justify-center gap-2 border border-white/5"
                              >
                                <Play className="w-3.5 h-3.5 fill-white" />
                                <span>{isBn ? "রেকর্ডিং দেখুন" : "WATCH RECORDING"}</span>
                              </a>
                            )}
                          </div>

                          <AddToCalendarButton
                            event={eventObj}
                            variant="secondary"
                            language={language}
                            theme={theme}
                            userId={user.uid}
                            userName={user.displayName}
                            courseId={course.id}
                            batchId={batch.id}
                          />

                          {/* Quick Lecture Sheet Reader button if available */}
                          {cls.materialsUrl && (
                            <button
                              onClick={() => {
                                handleOpenPdfReader({
                                  id: `cls-mat-${cls.id}`,
                                  courseId: course.id,
                                  batchId: batch.id,
                                  title: `${cls.title} (Lecture Notes)`,
                                  type: "pdf",
                                  fileUrl: cls.materialsUrl!,
                                  fileSize: "2.4 MB",
                                  subject: cls.subject || "Biology",
                                  chapter: cls.title,
                                  createdAt: new Date().toISOString()
                                });
                              }}
                              className="p-2.5 bg-sky-950/60 hover:bg-sky-900 text-sky-300 hover:text-white rounded-xl border border-sky-500/30 transition flex items-center justify-center cursor-pointer shrink-0"
                              title={isBn ? "ক্লাস লেকচার শিট ইন-অ্যাপে পড়ুন" : "Read Lecture Notes in App"}
                            >
                              <BookOpen className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 9: MATERIALS */}
          {activeTab === "materials" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3 font-mono text-xs">
                <div className="space-y-0.5">
                  <h2 className="text-base font-black text-white uppercase font-display flex items-center gap-2">
                    <FileText className="w-5 h-5 text-sky-400" />
                    <span>{isBn ? "লেকচার শিট & পিডিএফ নোটস" : "Lecture Sheets & PDF Resources"}</span>
                  </h2>
                  <p className="text-gray-400 text-[11px] font-sans">
                    {isBn
                      ? "ডাউনলোড না করেই সরাসরি ইন-অ্যাপ PDF Reader দিয়ে প্রতিটি শিট পড়ুন, নোট নিন ও রিভিশন করুন।"
                      : "Read and study high-yield PDF notes directly inside the app without downloading."}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-xl text-gray-300">
                    {materials.length} {isBn ? "টি স্টাডি শিট" : "Documents"}
                  </span>
                </div>
              </div>

              {/* Subject Filter Bar with "All" tag */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {[
                  { key: "All", label: isBn ? "সকল বিষয় (All)" : "All Subjects" },
                  { key: "Biology", label: isBn ? "🧬 জীববিজ্ঞান" : "Biology" },
                  { key: "Chemistry", label: isBn ? "⚗️ রসায়ন" : "Chemistry" },
                  { key: "Physics", label: isBn ? "⚡ পদার্থবিজ্ঞান" : "Physics" },
                  { key: "GK", label: isBn ? "🌐 সাধারণ জ্ঞান" : "GK" },
                  { key: "English", label: isBn ? "🇬🇧 ইংরেজি" : "English" },
                  { key: "General", label: isBn ? "📑 সাধারণ শিট" : "General" }
                ].map((sub) => {
                  const isSelected = materialsSubjectFilter === sub.key;
                  return (
                    <button
                      key={sub.key}
                      onClick={() => {
                        playSound("click");
                        setMaterialsSubjectFilter(sub.key);
                      }}
                      className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-[#C1121F] text-white shadow-[0_0_10px_rgba(193,18,31,0.3)] border border-red-500/50"
                          : "bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5"
                      }`}
                    >
                      {sub.label}
                    </button>
                  );
                })}
              </div>

              {(() => {
                const displayedMaterials = materials.filter((mat) => {
                  if (materialsSubjectFilter === "All") return true;
                  return mat.subject?.toLowerCase() === materialsSubjectFilter.toLowerCase() || mat.subject === "All";
                });

                if (displayedMaterials.length === 0) {
                  return (
                    <div className="p-8 bg-[#111111] border border-white/10 rounded-2xl text-center space-y-3 font-mono">
                      <FileText className="w-10 h-10 text-gray-600 mx-auto" />
                      <h4 className="text-sm font-bold text-white">
                        {isBn ? "নির্বাচিত বিষয়ে কোনো লেকচার শিট নেই" : "No lecture sheets found for selected subject"}
                      </h4>
                      <p className="text-xs text-gray-400">
                        {isBn ? "অন্য বিষয় নির্বাচন করুন অথবা 'সকল বিষয় (All)' চাপুন।" : "Try choosing another subject filter or select 'All Subjects'."}
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {displayedMaterials.map((mat) => (
                      <div
                        key={mat.id}
                        className="p-5 bg-[#111111] hover:bg-[#141822] border border-white/10 hover:border-sky-500/40 rounded-2xl flex flex-col justify-between gap-4 font-mono text-xs transition duration-200 shadow-xl group"
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                              mat.subject === "All"
                                ? "bg-amber-500/20 text-[#FFD700] border-amber-500/40"
                                : "bg-sky-950/60 text-sky-300 border-sky-500/30"
                            }`}>
                              {mat.subject === "All" ? (isBn ? "সকল বিষয় (All)" : "All Subjects") : mat.subject}
                            </span>
                            {mat.chapter && (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-white/5 text-gray-400 border border-white/5 truncate max-w-[160px]">
                                {mat.chapter}
                              </span>
                            )}
                          </div>

                          <h4 className="text-sm sm:text-base font-bold text-white font-sans group-hover:text-sky-300 transition line-clamp-2 leading-snug">
                            {mat.title}
                          </h4>

                          <div className="flex items-center gap-3 text-[11px] text-gray-400">
                            <span className="flex items-center gap-1">
                              <FileText className="w-3.5 h-3.5 text-sky-400" />
                              <span>PDF Material</span>
                            </span>
                            {mat.fileSize && <span>• {mat.fileSize}</span>}
                          </div>
                        </div>

                        {/* Action buttons: In-App Reader & Download */}
                        <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                          <button
                            onClick={() => handleOpenPdfReader(mat)}
                            className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-black text-xs font-mono uppercase rounded-xl transition flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(2,132,199,0.3)] cursor-pointer"
                          >
                            <BookOpen className="w-4 h-4" />
                            <span>{isBn ? "ইন-অ্যাপে পড়ুন" : "READ IN APP"}</span>
                          </button>

                          <a
                            href={mat.fileUrl}
                            download
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => {
                              e.stopPropagation();
                              playSound("click");
                            }}
                            className="p-2.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl border border-white/10 transition flex items-center justify-center"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </>
      )}

      {/* PDF READER MODAL */}
      <PdfReaderModal
        material={readingMaterial}
        course={course}
        batch={batch}
        isOpen={isPdfReaderOpen}
        onClose={() => {
          setIsPdfReaderOpen(false);
          setReadingMaterial(null);
        }}
        language={language}
        theme={theme}
        userId={user?.uid || "student"}
      />
    </div>
  );
}