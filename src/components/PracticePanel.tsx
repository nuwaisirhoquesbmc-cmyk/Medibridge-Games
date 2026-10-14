import React, { useState, useEffect, useMemo } from "react";
import { db, handleFirestoreError, OperationType, logQuestionMistake, removeQuestionMistake, isFirestoreQuotaExceeded } from "../lib/backend";
import { doc, setDoc, collection, onSnapshot, addDoc, query, orderBy, where, limit } from "../lib/supabaseDb";
import { Question, UserProfile, SubjectType, DifficultyType } from "../types";
import { STARTER_QUESTIONS } from "../questionsData";
import { playSound } from "../audio";
import {
  Shield,
  Heart,
  Flame,
  Award,
  BookOpen,
  Zap,
  Timer,
  Play,
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  Trophy,
  Database,
  TrendingUp,
  AlertTriangle,
  Book,
  ChevronRight,
  Swords,
  Ban,
  Bookmark,
  Trash,
  Send,
  Sun,
  Moon
} from "lucide-react";
import { LiveExamSubmitConfirmModal } from "./courses/LiveExamSubmitConfirmModal";
import LiveExamCountdownTimer from "./courses/LiveExamCountdownTimer";

interface PracticePanelProps {
  user: UserProfile;
  dbQuestions: Question[];
  language: "bn" | "en";
  theme?: "light" | "dark";
  onProfileUpdate: (updated: UserProfile) => void;
  challengeRivalProfile?: UserProfile | null;
  onClearChallenge?: () => void;
  forceTab?: "arena" | "anushiloni";
}

type MenuTab = "arena" | "anushiloni";
type ModeType = "select" | "combating" | "results" | "failed" | "unlimited" | "live_exam";

// Deterministic function to check if a question is mastered by a rival
const isQuestionMasteredByRival = (q: Question, rivalUid: string): boolean => {
  const qIdentifier = q.id || q.questionText || "";
  let hash = 0;
  const combinedStr = rivalUid + qIdentifier;
  for (let i = 0; i < combinedStr.length; i++) {
    hash = (hash << 5) - hash + combinedStr.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  // Deterministic 35% mastered rate
  return Math.abs(hash) % 100 < 35;
};

// Anushiloni precise types
type AnushiloniSubject = "biology" | "chemistry" | "physics";
type AnushiloniMode = "chapter" | "topic" | "full" | "random" | "boss" | "mock" | "bookmark";

interface AnalyticsData {
  correctByChapter: Record<string, number>;
  incorrectByChapter: Record<string, number>;
  attemptsByChapter: Record<string, number>;
  totalExercisesSolved: number;
  unlockedBadges: string[];
}

export default function PracticePanel({
  user,
  dbQuestions,
  language,
  theme = "dark",
  onProfileUpdate,
  challengeRivalProfile,
  onClearChallenge,
  forceTab
}: PracticePanelProps) {
  const isDark = theme === "dark";
  const [activeTab, setActiveTab] = useState<MenuTab>(forceTab || "arena");

  useEffect(() => {
    if (forceTab) {
      setActiveTab(forceTab);
    }
  }, [forceTab]);

  const [gameState, setGameState] = useState<ModeType>("select");

  // Unlimited Practice States
  const [unlimitedSubject, setUnlimitedSubject] = useState<SubjectType | "All">("All");
  const [unlimitedChapter, setUnlimitedChapter] = useState<string>("All");
  const [unlimitedQuestions, setUnlimitedQuestions] = useState<Question[]>([]);
  const [unlimitedIndex, setUnlimitedIndex] = useState(0);
  const [unlimitedCorrect, setUnlimitedCorrect] = useState(0);
  const [unlimitedTotal, setUnlimitedTotal] = useState(0);
  const [unlimitedStreak, setUnlimitedStreak] = useState(0);
  const [unlimitedMaxStreak, setUnlimitedMaxStreak] = useState(0);
  const [unlimitedSelectedAnswer, setUnlimitedSelectedAnswer] = useState<number | null>(null);
  const [unlimitedAnswered, setUnlimitedAnswered] = useState(false);
  const [unlimitedXpEarned, setUnlimitedXpEarned] = useState(0);
  const [unlimitedCoinsEarned, setUnlimitedCoinsEarned] = useState(0);

  // Selection states (Arena)
  const [selectedSubject, setSelectedSubject] = useState<SubjectType | "All">("All");
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyType | "All">("All");
  const [isSurvivalMode, setIsSurvivalMode] = useState(false);
  const [analyticalFilter, setAnalyticalFilter] = useState<"All" | "Strength" | "Weakness">("All");

  // Selection states (Anushiloni)
  const [anushiloniSub, setAnushiloniSub] = useState<AnushiloniSubject>("biology");
  const [anushiloniMode, setAnushiloniMode] = useState<AnushiloniMode>("chapter");
  
  // Chapter & topic lists
  const [selectedChapter, setSelectedChapter] = useState<string>("কোষ ও এর গঠন");
  const [selectedTopic, setSelectedTopic] = useState<string>("ডিএনএ ও আরএনএ হেলিক্স গঠন");

  // Active game session state
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [userSelectedAnswers, setUserSelectedAnswers] = useState<(number | null)[]>([]);

  // Boss Battle Stats
  const [bossName, setBossName] = useState("কোষীয় অসুর (Hasan Book Guardian)");
  const [bossMaxHp, setBossMaxHp] = useState(100);
  const [bossHp, setBossHp] = useState(100);

  // Mock test seconds left
  const [mockTimeLeft, setMockTimeLeft] = useState(120);

  // Bookmarks
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [expandedBookmarkId, setExpandedBookmarkId] = useState<string | null>(null);
  const [justBookmarkedId, setJustBookmarkedId] = useState<string | null>(null);

  // Live Exam States (Exam Batch Live Model Test Arena)
  const [liveExams, setLiveExams] = useState<any[]>([]);
  const [activeLiveExam, setActiveLiveExam] = useState<any | null>(null);
  const [liveSubmissions, setLiveSubmissions] = useState<any[]>([]);
  const [liveExamState, setLiveExamState] = useState<"lobby" | "writing" | "done">("lobby");
  const [liveExamAnswers, setLiveExamAnswers] = useState<Record<string, number>>({});
  const [liveExamSecondsLeft, setLiveExamSecondsLeft] = useState<number>(0);
  const [showCreateExamModal, setShowCreateExamModal] = useState<boolean>(false);
  const [showLiveExamSubmitConfirmModal, setShowLiveExamSubmitConfirmModal] = useState<boolean>(false);

  // Arena Live Exam Theme state
  const [liveExamTheme, setLiveExamTheme] = useState<"light" | "dark">(() => {
    try {
      const saved = localStorage.getItem("medibridge_exam_theme");
      if (saved === "light" || saved === "dark") return saved;
    } catch (e) {}
    return "light";
  });
  const isLiveExamDark = liveExamTheme === "dark";

  const toggleLiveExamTheme = () => {
    playSound("click");
    setLiveExamTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      try {
        localStorage.setItem("medibridge_exam_theme", next);
      } catch (e) {}
      return next;
    });
  };

  // Compute unanswered question indices for Live Exam in Practice Arena
  const liveExamUnansweredIndices = useMemo(() => {
    if (!activeQuestions || activeQuestions.length === 0) return [];
    return activeQuestions
      .map((_, idx) => idx)
      .filter((idx) => liveExamAnswers[idx] === undefined);
  }, [activeQuestions, liveExamAnswers]);

  // New Live Exam creation fields
  const [newExamTitle, setNewExamTitle] = useState<string>("");
  const [newExamSubject, setNewExamSubject] = useState<string>("Biology");
  const [newExamChapter, setNewExamChapter] = useState<string>("All");
  const [newExamDuration, setNewExamDuration] = useState<number>(10);
  const [newExamQuestionsCount, setNewExamQuestionsCount] = useState<number>(10);

  useEffect(() => {
    if (user?.uid) {
      const stored = localStorage.getItem(`medibridge_bookmarks_${user.uid}`);
      if (stored) {
        try {
          setBookmarkedIds(JSON.parse(stored));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [user?.uid]);

  const toggleBookmark = (qId: string) => {
    if (!user?.uid) return;
    playSound("click");
    let updated: string[];
    const isCurrentlyBookmarked = bookmarkedIds.includes(qId);
    if (isCurrentlyBookmarked) {
      updated = bookmarkedIds.filter(id => id !== qId);
    } else {
      updated = [...bookmarkedIds, qId];
      // Trigger smooth scaling & color pulse animation for immediate visual feedback
      setJustBookmarkedId(qId);
      setTimeout(() => {
        setJustBookmarkedId(null);
      }, 800);
    }
    setBookmarkedIds(updated);
    localStorage.setItem(`medibridge_bookmarks_${user.uid}`, JSON.stringify(updated));
  };

  // Player metrics inside trial
  const [trialHp, setTrialHp] = useState(100);
  const [combatXpEarned, setCombatXpEarned] = useState(0);
  const [combatCoinsEarned, setCombatCoinsEarned] = useState(0);
  const [combatRankPoints, setCombatRankPoints] = useState(0);
  const [correctCountInTrial, setCorrectCountInTrial] = useState(0);

  // Survival seconds lock
  const [secondsLeft, setSecondsLeft] = useState(15);

  // Persistent Analytics State
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    correctByChapter: {},
    incorrectByChapter: {},
    attemptsByChapter: {},
    totalExercisesSolved: 0,
    unlockedBadges: [],
  });

  // Load persistent local analytics
  useEffect(() => {
    const key = `medibridge_anushiloni_analytics_${user.uid}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        setAnalytics(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse analytics", e);
      }
    }
  }, [user.uid]);

  // Listen to live exams in real-time (Exam Batch) - Limited to latest 15 exams with session caching
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem("mb_practice_live_exams_cache");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLiveExams(parsed);
          if (isFirestoreQuotaExceeded()) return;
        }
      }
    } catch {}

    if (isFirestoreQuotaExceeded()) return;

    const q = query(collection(db, "live_exams"), orderBy("createdAt", "desc"), limit(15));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const examsList: any[] = [];
      snapshot.forEach((doc) => {
        examsList.push({ id: doc.id, ...doc.data() });
      });
      setLiveExams(examsList);
      try { sessionStorage.setItem("mb_practice_live_exams_cache", JSON.stringify(examsList)); } catch {}
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "live_exams");
    });
    return () => unsubscribe();
  }, []);

  // Listen to submissions ONLY for the active live exam (filtered by examId with limit 50)
  useEffect(() => {
    if (!activeLiveExam?.id) {
      setLiveSubmissions([]);
      return;
    }
    const q = query(
      collection(db, "live_exam_submissions"),
      where("examId", "==", activeLiveExam.id),
      limit(50)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const subsList: any[] = [];
      snapshot.forEach((doc) => {
        subsList.push({ id: doc.id, ...doc.data() });
      });
      // Sort: highest score first, then lowest time taken first
      subsList.sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return a.timeTaken - b.timeTaken;
      });
      setLiveSubmissions(subsList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "live_exam_submissions");
    });
    return () => unsubscribe();
  }, [activeLiveExam?.id]);

  // Global Search Chapter Navigation Listener
  useEffect(() => {
    const handleSearchSelection = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        const { chapter, subject, tab } = customEvent.detail;
        if (tab) {
          setActiveTab(tab); // e.g. "anushiloni"
        }
        if (subject) {
          setAnushiloniSub(subject.toLowerCase() as AnushiloniSubject);
        }
        if (chapter) {
          setSelectedChapter(chapter);
        }
        // Reset trial active game state so user is on selecting dashboard with updated parameters
        setGameState("selection");
      }
    };
    window.addEventListener("medibridge_chapter_search_selected", handleSearchSelection);
    return () => window.removeEventListener("medibridge_chapter_search_selected", handleSearchSelection);
  }, []);

  // Timer loop for standard survival mode (15 seconds)
  useEffect(() => {
    if (gameState !== "combating" || activeTab !== "arena" || !isSurvivalMode || answered) return;

    if (secondsLeft <= 0) {
      handleConfirmAnswer(-1); // forced mistake on time out
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsLeft, gameState, isSurvivalMode, answered, activeTab]);

  // Timer loop for Mock Test (120 seconds for the whole test)
  useEffect(() => {
    if (gameState !== "combating" || activeTab !== "anushiloni" || anushiloniMode !== "mock" || answered) return;

    if (mockTimeLeft <= 0) {
      // Mock test finish forced
      handleFinishTrial();
      return;
    }

    const interval = setInterval(() => {
      setMockTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [mockTimeLeft, gameState, activeTab, anushiloniMode, answered]);

  // Live Exam countdown timer (Exam Batch)
  useEffect(() => {
    if (gameState !== "live_exam" || liveExamState !== "writing" || !activeLiveExam) return;

    const interval = setInterval(() => {
      setLiveExamSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmitLiveExam(true); // Auto-submit when time is up!
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState, liveExamState, activeLiveExam]);

  // Chapters & Topics matching books
  const CHAPTERS_MAP: Record<AnushiloniSubject, string[]> = {
    biology: ["কোষ ও এর গঠন", "কোষ বিভাজন", "রক্ত ও রক্ত সংবহন", "উদ্ভিদ শারীরতত্ত্ব", "প্রাণীর পরিচিতি ও শ্রেণীবিন্যাস"],
    chemistry: ["গুণগত রসায়ন", "জৈব রসায়ন", "রাসায়নিক পরিবর্তন", "পরিমাণগত রসায়ন", "পরিবেশ রসায়ন"],
    physics: ["ভেক্টর", "মহাকর্ষ ও গ্র্যাভিটেশন", "যান্ত্রিক ধর্ম ও গতিবিদ্যা", "তাপগতিবিদ্যা", "ভৌত আলোকবিজ্ঞান"],
  };

  const TOPICS_MAP: Record<AnushiloniSubject, string[]> = {
    biology: ["ডিএনএ ও আরএনএ হেলিক্স গঠন", "রক্তকণিকা সৃষ্টির প্রক্রিয়া ও হিমোপয়েসিস", "মাইটোসিস ও মিওসিস বিভাজন", "গ্লাইকোলাইসিস ও সাইটোপ্লাজমীয় শ্বসন"],
    chemistry: ["লুকাশ বিকারক ও অ্যালকোহল টেস্ট", "অরবিটাল সংকরণ ও হাইব্রিডাইজেশন", "বাফার দ্রবণ ও রক্তের পিএইচ বাফারিং"],
    physics: ["মহাকর্ষীয় ধ্রুবক ও মাত্রা সমীকরণ", "ভেক্টর ডট গুণফল ও স্কেলার কোণ", "दृश्यমান তরঙ্গের দৈর্ঘ্য ও আলোর বর্ণালী"],
  };

  const BOSSES_MAP: Record<AnushiloniSubject, string> = {
    biology: "কোষীয় অসুর (Hasan Book Guardian)",
    chemistry: "রাসায়নিক দানব (Hazar-Nagin Overlord)",
    physics: "পদার্থের টাইটান (Ishaq Science Titan)",
  };

  // Get counts of strong/weak chapters for badge decoration
  const getAnalyticalCounts = () => {
    const pool = getPoolOfQuestions();
    const uniqueChapters = Array.from(new Set(pool.map((q) => q.chapter)));
    let strongCount = 0;
    let weakCount = 0;

    uniqueChapters.forEach((ch) => {
      const attempts = analytics.attemptsByChapter[ch] || 0;
      const correct = analytics.correctByChapter[ch] || 0;
      const incorrect = analytics.incorrectByChapter[ch] || 0;
      const accuracy = attempts > 0 ? (correct / attempts) * 100 : 0;

      if (attempts > 0 && accuracy >= 70) {
        strongCount++;
      } else if ((attempts > 0 && accuracy < 60) || incorrect > 0) {
        weakCount++;
      }
    });

    return { strongCount, weakCount };
  };

  // Merge Firestore DB questions with pre-seeded ones
  const getPoolOfQuestions = (): Question[] => {
    const combined = [...dbQuestions];
    STARTER_QUESTIONS.forEach((sq) => {
      if (!combined.some((q) => q.questionText === sq.questionText)) {
        combined.push(sq as any);
      }
    });
    return combined;
  };

  // Live Exam Actions (Exam Batch Model Test Arena)

  const handleJoinLiveExam = (exam: any) => {
    playSound("click");
    // Find questions corresponding to the list of IDs
    const pool = getPoolOfQuestions();
    const matchedQuestions: Question[] = [];
    
    exam.questionIds.forEach((id: string) => {
      const found = pool.find(q => q.id === id || q.questionText === id);
      if (found) {
        matchedQuestions.push(found);
      }
    });

    if (matchedQuestions.length === 0) {
      // Fallback: load random matching subject questions if questions were deleted or modified
      const fallback = pool.filter(q => q.subject.toLowerCase() === exam.subject.toLowerCase()).slice(0, exam.totalQuestions);
      if (fallback.length > 0) {
        matchedQuestions.push(...fallback);
      } else {
        matchedQuestions.push(...pool.slice(0, exam.totalQuestions));
      }
    }

    setActiveLiveExam(exam);
    setActiveQuestions(matchedQuestions);
    setLiveExamAnswers({});
    setLiveExamSecondsLeft(exam.duration * 60);
    setLiveExamState("writing");
    setGameState("live_exam");
  };

  const handleSubmitLiveExam = async (forceTimeUp = false) => {
    if (!activeLiveExam) return;
    playSound("victory");

    // Calculate score
    let score = 0;
    activeQuestions.forEach((q, idx) => {
      const userAns = liveExamAnswers[idx];
      if (userAns !== undefined && userAns === q.correctAnswerIndex) {
        score++;
      }
    });

    const timeSpent = (activeLiveExam.duration * 60) - liveExamSecondsLeft;

    const submissionDoc = {
      examId: activeLiveExam.id,
      examTitle: activeLiveExam.title,
      userId: user.uid,
      displayName: user.displayName || "Aspirant",
      avatarUrl: user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
      score,
      totalQuestions: activeQuestions.length,
      timeTaken: timeSpent,
      submittedAt: new Date().toISOString(),
      answers: liveExamAnswers
    };

    try {
      // Use setDoc with a deterministic path (examId_userId) to prevent duplicate submissions by the same user
      const submissionId = `${activeLiveExam.id}_${user.uid}`;
      await setDoc(doc(db, "live_exam_submissions", submissionId), submissionDoc);

      // Award coin and XP proportional to the exam score!
      const xpReward = score * 15 + 50; // 15 XP per correct answer + 50 completion bonus
      const coinReward = score * 8 + 20; // 8 Coins per correct answer + 20 bonus
      
      const finalXp = user.xp + xpReward;
      const finalCoins = user.coins + coinReward;
      const nextLevel = Math.max(user.level, Math.floor(finalXp / 500) + 1);

      const updatedProfile: UserProfile = {
        ...user,
        xp: finalXp,
        coins: finalCoins,
        level: nextLevel,
        questionsSolved: user.questionsSolved + activeQuestions.length,
        questionsCorrect: user.questionsCorrect + score,
        rank: nextLevel >= 8 ? "Elite" : nextLevel >= 4 ? "Scholar" : "Freshman",
      };

      // Sync Firestore DB
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, {
        xp: finalXp,
        coins: finalCoins,
        level: nextLevel,
        questionsSolved: updatedProfile.questionsSolved,
        questionsCorrect: updatedProfile.questionsCorrect,
        rank: updatedProfile.rank,
      }, { merge: true });

      onProfileUpdate(updatedProfile);
      setLiveExamState("done");
      
      if (forceTimeUp) {
        alert(language === "bn" ? "সময় শেষ! আপনার পরীক্ষা স্বয়ংক্রিয়ভাবে জমা দেওয়া হয়েছে।" : "Time is up! Your exam has been automatically submitted.");
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "live_exam_submissions");
    }
  };

  const handleLeaveLiveExam = () => {
    playSound("click");
    setActiveLiveExam(null);
    setGameState("select");
  };

  // Launch Active game session (Arena side (or automatic from surprise popup))
  const handleStartPractice = () => {
    setActiveTab("arena");
    const pool = getPoolOfQuestions();

    let filtered = pool;

    if (challengeRivalProfile) {
      filtered = pool.filter((q) => isQuestionMasteredByRival(q, challengeRivalProfile.uid));
      // Fallback: if deterministic subset is empty, fallback to the entire pool
      if (filtered.length === 0) {
        filtered = pool;
      }
      setIsSurvivalMode(true); // Always force survival mechanics for high intensity duels!
    } else {
      filtered = pool.filter((q) => {
        const matchSub = selectedSubject === "All" || q.subject === selectedSubject;
        const matchDiff = selectedDifficulty === "All" || q.difficulty === selectedDifficulty;
        return matchSub && matchDiff;
      });

      // Apply Strength/Weakness Analytical Filter
      if (analyticalFilter !== "All") {
        const chaptersStats: Record<string, { attempts: number; correct: number; incorrect: number; accuracy: number }> = {};
        const uniqueChapters = Array.from(new Set(pool.map((q) => q.chapter)));

        uniqueChapters.forEach((ch) => {
          const attempts = analytics.attemptsByChapter[ch] || 0;
          const correct = analytics.correctByChapter[ch] || 0;
          const incorrect = analytics.incorrectByChapter[ch] || 0;
          const accuracy = attempts > 0 ? (correct / attempts) * 100 : 0;
          chaptersStats[ch] = { attempts, correct, incorrect, accuracy };
        });

        if (analyticalFilter === "Strength") {
          const strongChapters = Object.keys(chaptersStats).filter((ch) => {
            const s = chaptersStats[ch];
            return s.attempts > 0 && s.accuracy >= 70;
          });

          if (strongChapters.length > 0) {
            filtered = filtered.filter((q) => q.chapter && strongChapters.includes(q.chapter));
          } else {
            alert(language === "bn"
              ? "আপনার এখনও কোনো শক্তিশালী অধ্যায় (সঠিকতা >= ৭০%) চিহ্নিত হয়নি। আমরা সব অধ্যায় থেকে প্রশ্ন প্রিপেয়ার করছি!"
              : "No strong chapters (accuracy >= 70%) identified in your clinical trace yet. Reverting to all questions!");
          }
        } else if (analyticalFilter === "Weakness") {
          const weakChapters = Object.keys(chaptersStats).filter((ch) => {
            const s = chaptersStats[ch];
            return (s.attempts > 0 && s.accuracy < 60) || s.incorrect > 0;
          });

          if (weakChapters.length > 0) {
            filtered = filtered.filter((q) => q.chapter && weakChapters.includes(q.chapter));
          } else {
            alert(language === "bn"
              ? "চমৎকার! আপনার কোনো দুর্বল অধ্যায় বা ভুল উত্তর রেকর্ড করা নেই। আমরা সব অধ্যায় থেকে প্রশ্ন প্রিপেয়ার করছি!"
              : "Superb! No weak chapters (accuracy < 60% or mistakes) found in your trace yet. Preparing questions from all chapters!");
          }
        }
      }
    }

    if (filtered.length === 0) {
      alert(language === "bn" ? "কোনো প্রশ্ন পাওয়া যায়নি। অন্য সাবজেক্ট নির্বাচন করুন।" : "No questions found matching criteria. Try 'All Subjects' filter.");
      return;
    }

    const shuffled = [...filtered].sort(() => 0.5 - Math.random()).slice(0, 10);
    playSound("battle");
    setActiveQuestions(shuffled);
    setUserSelectedAnswers(new Array(shuffled.length).fill(null));
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setAnswered(false);
    setTrialHp(100);
    setCorrectCountInTrial(0);
    setCombatXpEarned(0);
    setCombatCoinsEarned(0);
    setCombatRankPoints(0);
    setGameState("combating");
    setSecondsLeft(15);
  };

  // Trigger Surprise
  const handleTriggerSurpriseTest = () => {
    setSelectedSubject("All");
    setSelectedDifficulty("All");
    setIsSurvivalMode(true);
    playSound("battle");
    setTimeout(() => {
      const pool = getPoolOfQuestions();
      const shuffled = [...pool].sort(() => 0.5 - Math.random()).slice(0, 10);
      setActiveQuestions(shuffled);
      setUserSelectedAnswers(new Array(shuffled.length).fill(null));
      setCurrentIndex(0);
      setSelectedAnswer(null);
      setAnswered(false);
      setTrialHp(100);
      setCorrectCountInTrial(0);
      setCombatXpEarned(0);
      setCombatCoinsEarned(0);
      setCombatRankPoints(0);
      setGameState("combating");
      setSecondsLeft(15);
    }, 100);
  };

  // Unlimited Practice handlers
  const getChaptersForSubject = (subject: SubjectType | "All"): string[] => {
    const pool = getPoolOfQuestions();
    const filtered = pool.filter((q) => subject === "All" || q.subject === subject);
    const chapters = Array.from(new Set(filtered.map((q) => q.chapter).filter(Boolean)));
    return ["All", ...chapters];
  };

  const handleStartUnlimitedPractice = () => {
    setActiveTab("arena");
    const pool = getPoolOfQuestions();
    
    let filtered = pool.filter((q) => {
      const matchSub = unlimitedSubject === "All" || q.subject === unlimitedSubject;
      const matchChap = unlimitedChapter === "All" || q.chapter === unlimitedChapter;
      return matchSub && matchChap;
    });

    if (filtered.length === 0) {
      alert(language === "bn" 
        ? "এই অধ্যায়ে কোনো প্রশ্ন খুঁজে পাওয়া যায়নি। দয়া করে অন্য অধ্যায় বা সাবজেক্ট সিলেক্ট করুন।" 
        : "No questions found matching criteria. Try different chapters or subjects.");
      return;
    }

    // Shuffle and set
    const shuffled = [...filtered].sort(() => 0.5 - Math.random());
    playSound("battle");
    setUnlimitedQuestions(shuffled);
    setUnlimitedIndex(0);
    setUnlimitedCorrect(0);
    setUnlimitedTotal(0);
    setUnlimitedStreak(0);
    setUnlimitedMaxStreak(0);
    setUnlimitedSelectedAnswer(null);
    setUnlimitedAnswered(false);
    setUnlimitedXpEarned(0);
    setUnlimitedCoinsEarned(0);
    setGameState("unlimited");
  };

  const handleUnlimitedAnswerClick = (optIdx: number) => {
    if (unlimitedAnswered) return;
    setUnlimitedSelectedAnswer(optIdx);
    setUnlimitedAnswered(true);
    setUnlimitedTotal((prev) => prev + 1);

    const activeQ = unlimitedQuestions[unlimitedIndex];
    if (!activeQ) return;
    const isCorrect = optIdx === activeQ.correctAnswerIndex;

    const key = `medibridge_anushiloni_analytics_${user.uid}`;
    const saved = localStorage.getItem(key);
    const updatedAnalytics = saved ? JSON.parse(saved) : {
      correctByChapter: {},
      incorrectByChapter: {},
      attemptsByChapter: {},
      totalExercisesSolved: 0,
      unlockedBadges: [],
    };
    const chName = activeQ.chapter || "General";
    if (!updatedAnalytics.attemptsByChapter[chName]) updatedAnalytics.attemptsByChapter[chName] = 0;
    if (!updatedAnalytics.correctByChapter[chName]) updatedAnalytics.correctByChapter[chName] = 0;
    if (!updatedAnalytics.incorrectByChapter[chName]) updatedAnalytics.incorrectByChapter[chName] = 0;

    if (isCorrect) {
      playSound("victory");
      setUnlimitedCorrect((prev) => prev + 1);
      setUnlimitedStreak((prev) => {
        const next = prev + 1;
        if (next > unlimitedMaxStreak) {
          setUnlimitedMaxStreak(next);
        }
        return next;
      });
      // award some XP and Coins per correct answer
      setUnlimitedXpEarned((prev) => prev + 15);
      setUnlimitedCoinsEarned((prev) => prev + 5);
      
      updatedAnalytics.attemptsByChapter[chName] += 1;
      updatedAnalytics.correctByChapter[chName] += 1;
      updatedAnalytics.totalExercisesSolved += 1;
      
      // Clear from mistakes list
      removeQuestionMistake(user.uid, activeQ.id);
    } else {
      playSound("wrong");
      setUnlimitedStreak(0);
      
      updatedAnalytics.attemptsByChapter[chName] += 1;
      updatedAnalytics.incorrectByChapter[chName] += 1;
      updatedAnalytics.totalExercisesSolved += 1;
      
      // Add to mistakes list
      logQuestionMistake(user.uid, activeQ);
    }

    localStorage.setItem(key, JSON.stringify(updatedAnalytics));
    setAnalytics(updatedAnalytics);
  };

  const handleUnlimitedNext = () => {
    setUnlimitedSelectedAnswer(null);
    setUnlimitedAnswered(false);
    
    // If we've reached the end of the shuffled list, wrap-around / reshuffle
    if (unlimitedIndex + 1 < unlimitedQuestions.length) {
      setUnlimitedIndex((prev) => prev + 1);
    } else {
      const pool = getPoolOfQuestions();
      const filtered = pool.filter((q) => {
        const matchSub = unlimitedSubject === "All" || q.subject === unlimitedSubject;
        const matchChap = unlimitedChapter === "All" || q.chapter === unlimitedChapter;
        return matchSub && matchChap;
      });
      const reshuffled = [...filtered].sort(() => 0.5 - Math.random());
      setUnlimitedQuestions(reshuffled);
      setUnlimitedIndex(0);
    }
  };

  const handleFinishUnlimitedPractice = async () => {
    setGameState("select");

    if (unlimitedXpEarned > 0 || unlimitedCoinsEarned > 0) {
      try {
        const finalXp = user.xp + unlimitedXpEarned;
        const finalCoins = user.coins + unlimitedCoinsEarned;
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
          questionsSolved: user.questionsSolved + unlimitedTotal,
          questionsCorrect: user.questionsCorrect + unlimitedCorrect,
          rank: nextLevel >= 8 ? "Elite" : nextLevel >= 4 ? "Scholar" : "Freshman",
        };

        // Sync Firestore DB
        const userDocRef = doc(db, "users", user.uid);
        await setDoc(userDocRef, {
          xp: finalXp,
          coins: finalCoins,
          level: nextLevel,
          questionsSolved: updatedProfile.questionsSolved,
          questionsCorrect: updatedProfile.questionsCorrect,
          rank: updatedProfile.rank,
        }, { merge: true });

        onProfileUpdate(updatedProfile);
        
        // Show success summary alert
        alert(language === "bn" 
          ? `অভিনন্দন! আপনি সফলভাবে ${unlimitedTotal}টি প্রশ্ন প্র্যাকটিস করেছেন এবং ${unlimitedCorrect}টি সঠিক দিয়েছেন। আপনি পেয়েছেন +${unlimitedXpEarned} XP এবং +${unlimitedCoinsEarned} গোল্ড কয়েন!` 
          : `Great job! You practiced ${unlimitedTotal} questions with ${unlimitedCorrect} correct answers. Earned +${unlimitedXpEarned} XP and +${unlimitedCoinsEarned} gold coins!`);
      } catch (err: any) {
        console.error("Failed to sync stats after unlimited practice", err);
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}/unlimited_practice`);
      }
    }
  };

  // Launch Anushiloni Practice Session
  const handleStartAnushiloni = () => {
    setActiveTab("anushiloni");
    const pool = getPoolOfQuestions();
    
    // Auto map selected anushiloniSubject to standard Subject
    const targetSubject = anushiloniSub === "biology" ? "Biology" : anushiloniSub === "chemistry" ? "Chemistry" : "Physics";
    
    let filtered = pool.filter(q => q.subject === targetSubject);

    // Apply specific chapter filtering
    if (anushiloniMode === "chapter") {
      filtered = filtered.filter(q => (q.chapter || "").trim().toLowerCase() === (selectedChapter || "").trim().toLowerCase());
    } 
    // Apply specific topic filtering
    else if (anushiloniMode === "topic") {
      const topicLower = (selectedTopic || "").toLowerCase();
      filtered = filtered.filter(q => 
        (q.explanation || "").toLowerCase().includes(topicLower) ||
        (q.questionText || "").toLowerCase().includes(topicLower) ||
        (q.chapter || "").toLowerCase().includes(topicLower)
      );
    }
    // Apply specific bookmark filtering
    else if (anushiloniMode === "bookmark") {
      const safeBookmarks = Array.isArray(bookmarkedIds) ? bookmarkedIds : [];
      filtered = pool.filter(q => q.subject === targetSubject && safeBookmarks.includes(q.id));
      if (filtered.length === 0) {
        filtered = pool.filter(q => safeBookmarks.includes(q.id));
      }
    }

    // Default filter to "অনুশীলনী Questions" category if available to prioritize Exercise books final questions
    if (anushiloniMode !== "bookmark") {
      const priorityExercise = filtered.filter(q => q.category === "অনুশীলনী Questions" || q.source?.toLowerCase().includes("book") || q.source?.toLowerCase().includes("অনুশীলনী"));
      if (priorityExercise.length > 5) {
        filtered = priorityExercise;
      }
    }

    if (filtered.length === 0) {
      if (anushiloniMode === "bookmark") {
        alert(language === "bn" ? "কোন বুকমার্ক করা প্রশ্ন পাওয়া যায়নি! অনুগ্রহ করে কুইজ দেওয়ার সময় প্রশ্ন সেভ করুন।" : "No bookmarked questions found. Please save questions during practice sessions.");
        return;
      }
      // Fallback to general subject questions to avoid empty state
      filtered = pool.filter(q => q.subject === targetSubject);
    }

    // Set questions limit depending on mode
    const limit = anushiloniMode === "mock" ? 20 : anushiloniMode === "full" ? 15 : 10;
    const shuffled = [...filtered].sort(() => 0.5 - Math.random()).slice(0, limit);

    if (shuffled.length === 0) {
      alert("No questions found.");
      return;
    }

    // Setup Boss parameters if boss battle mode
    if (anushiloniMode === "boss") {
      setBossName(BOSSES_MAP[anushiloniSub]);
      setBossMaxHp(100);
      setBossHp(100);
    }

    playSound("battle");
    setActiveQuestions(shuffled);
    setUserSelectedAnswers(new Array(shuffled.length).fill(null));
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setAnswered(false);
    setTrialHp(100);
    setMockTimeLeft(120);
    setCorrectCountInTrial(0);
    setCombatXpEarned(0);
    setCombatCoinsEarned(0);
    setCombatRankPoints(0);
    setGameState("combating");
  };

  // Option Click
  const handleSelectOption = (index: number) => {
    if (answered) return;
    setSelectedAnswer(index);
  };

  // Confirm Answer
  const handleConfirmAnswer = async (forcedIdx?: number) => {
    if (answered) return;

    const currentQ = activeQuestions[currentIndex];
    const answerIndex = forcedIdx !== undefined ? forcedIdx : selectedAnswer;

    if (answerIndex === null) {
      alert(language === "bn" ? "দয়া করে একটি অপশন নির্বাচন করুন!" : "Select an answer option to proceed.");
      return;
    }

    setAnswered(true);
    const isCorrect = answerIndex === currentQ.correctAnswerIndex;

    const nextAnswers = [...userSelectedAnswers];
    nextAnswers[currentIndex] = answerIndex;
    setUserSelectedAnswers(nextAnswers);

    // Record this attempt dynamically in persistent local analytics
    const chapterName = currentQ.chapter || "General Fundamentals";
    const key = `medibridge_anushiloni_analytics_${user.uid}`;
    
    const updatedAnalytics = { ...analytics };
    if (!updatedAnalytics.attemptsByChapter[chapterName]) updatedAnalytics.attemptsByChapter[chapterName] = 0;
    if (!updatedAnalytics.correctByChapter[chapterName]) updatedAnalytics.correctByChapter[chapterName] = 0;
    if (!updatedAnalytics.incorrectByChapter[chapterName]) updatedAnalytics.incorrectByChapter[chapterName] = 0;

    updatedAnalytics.attemptsByChapter[chapterName] += 1;
    updatedAnalytics.totalExercisesSolved += 1;

    if (isCorrect) {
      playSound("correct");
      updatedAnalytics.correctByChapter[chapterName] += 1;
      setCorrectCountInTrial((prev) => prev + 1);

      // Handle rewards formulas
      const mult = challengeRivalProfile ? 3.0 : (activeTab === "anushiloni" ? 1.5 : (isSurvivalMode ? 2.5 : 1));
      const xpReward = Math.round(15 * mult);
      const coinReward = Math.round(5 * mult);
      const rankPtsReward = activeTab === "anushiloni" ? 12 : 5;

      setCombatXpEarned((prev) => prev + xpReward);
      setCombatCoinsEarned((prev) => prev + coinReward);
      setCombatRankPoints((prev) => prev + rankPtsReward);

      // Boss damage
      if (activeTab === "anushiloni" && anushiloniMode === "boss") {
        setBossHp((prev) => Math.max(0, prev - 20));
      }
      
      // Clear from mistakes list
      removeQuestionMistake(user.uid, currentQ.id);
    } else {
      playSound("wrong");
      updatedAnalytics.incorrectByChapter[chapterName] += 1;
      
      // Add to mistakes list
      logQuestionMistake(user.uid, currentQ);

      // Handle damage
      if (activeTab === "anushiloni" && anushiloniMode === "boss") {
        setTrialHp((prev) => {
          const nextHp = prev - 25;
          if (nextHp <= 0) {
            saveBattleLog(false, nextAnswers);
            setTimeout(() => setGameState("failed"), 500);
          }
          return Math.max(0, nextHp);
        });
      } else if (isSurvivalMode) {
        setTrialHp((prev) => {
          const nextHp = prev - 25;
          if (nextHp <= 0) {
            saveBattleLog(false, nextAnswers);
            setTimeout(() => setGameState("failed"), 500);
          }
          return Math.max(0, nextHp);
        });
      }
    }

    // Check for potential badge unlocks
    const allBadges = [...(updatedAnalytics.unlockedBadges || [])];
    if (updatedAnalytics.totalExercisesSolved >= 10 && !allBadges.includes("Anushiloni Explorer")) {
      allBadges.push("Anushiloni Explorer");
    }
    if (updatedAnalytics.totalExercisesSolved >= 50 && !allBadges.includes("Hasan Book Destroyer")) {
      allBadges.push("Hasan Book Destroyer");
    }
    if (correctCountInTrial >= 9 && activeQuestions.length === 10 && !allBadges.includes("Combat Master")) {
      allBadges.push("Combat Master");
    }
    updatedAnalytics.unlockedBadges = allBadges;

    // Save back to local storage
    localStorage.setItem(key, JSON.stringify(updatedAnalytics));
    setAnalytics(updatedAnalytics);
  };

  // Next Question trigger
  const handleNextQuestion = () => {
    if (currentIndex + 1 < activeQuestions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setAnswered(false);
      setSecondsLeft(15);
    } else {
      handleFinishTrial();
    }
  };

  // Save battle logs helper
  const saveBattleLog = (success: boolean, currentAnswersList?: (number | null)[]) => {
    try {
      const answers = currentAnswersList || userSelectedAnswers;
      const firstQ = activeQuestions[0];
      const realm = firstQ 
        ? (firstQ.subject === "Biology" ? (language === "bn" ? "জীববিজ্ঞান রাজ্য" : "Biology Realm") 
           : firstQ.subject === "Chemistry" ? (language === "bn" ? "রসায়ন রাজ্য" : "Chemistry Realm") 
           : firstQ.subject === "Physics" ? (language === "bn" ? "পদার্থবিজ্ঞান রাজ্য" : "Physics Realm")
           : (language === "bn" ? "সাধারণ রাজ্য" : "General Realm"))
        : (language === "bn" ? "সাধারণ রাজ্য" : "General Realm");
        
      let displayChapter = language === "bn" ? "একাধিক অধ্যায়" : "Multiple Chapters";
      if (activeQuestions.length > 0) {
        const chapters = Array.from(new Set(activeQuestions.map(q => q.chapter).filter(Boolean)));
        if (chapters.length === 1) {
          displayChapter = chapters[0] as string;
        } else if (activeTab === "anushiloni" && anushiloniMode === "chapter") {
          displayChapter = selectedChapter;
        }
      }

      let battleType = language === "bn" ? "স্ট্যান্ডার্ড কমব্যাট" : "Standard Combat";
      if (activeTab === "anushiloni") {
        if (anushiloniMode === "boss") {
          battleType = language === "bn" ? `বস ব্যাটল (${bossName})` : `Boss Battle vs ${bossName}`;
        } else if (anushiloniMode === "mock") {
          battleType = language === "bn" ? "মক টেস্ট সিমুলেটর" : "Mock Test Simulator";
        } else if (anushiloniMode === "chapter") {
          battleType = language === "bn" ? "অধ্যায় ফোকাস ট্রায়াল" : "Chapter Focus Trial";
        } else if (anushiloniMode === "topic") {
          battleType = language === "bn" ? `টপিক ড্রিল (${selectedTopic})` : `Topic Drill (${selectedTopic})`;
        } else {
          battleType = language === "bn" ? "ফুল সাবজেক্ট ব্লিটজ" : "Full Subject Blitz";
        }
      } else {
        if (isSurvivalMode) {
          battleType = language === "bn" ? "সারভাইভাল ডেথরান" : "Survival Deathrun";
        }
      }

      const calculatedCorrect = activeQuestions.reduce((acc, q, idx) => {
        const ansIdx = answers[idx];
        return acc + (ansIdx === q.correctAnswerIndex ? 1 : 0);
      }, 0);

      const scoreStr = `${calculatedCorrect}/${activeQuestions.length}`;

      const questionsLog = activeQuestions.map((q, idx) => {
        return {
          questionText: q.questionText,
          options: q.options || [],
          correctAnswerIndex: q.correctAnswerIndex,
          selectedAnswerIndex: answers[idx] !== undefined ? answers[idx] : null,
          explanation: q.explanation || "",
          subject: q.subject || "",
          chapter: q.chapter || "",
        };
      });

      const newLog = {
        id: "battle_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
        timestamp: new Date().toISOString(),
        subject: firstQ?.subject || "General",
        chapter: displayChapter,
        realm,
        battleType,
        xpEarned: success ? combatXpEarned : 0,
        coinsEarned: success ? combatCoinsEarned : 0,
        score: scoreStr,
        success,
        questions: questionsLog,
      };

      const logsKey = `medibridge_battle_logs_${user.uid}`;
      const existingLogsStr = localStorage.getItem(logsKey);
      let existingLogs = [];
      if (existingLogsStr) {
        try {
          existingLogs = JSON.parse(existingLogsStr);
        } catch (e) {
          console.error("Failed to parse existing battle logs", e);
        }
      }

      const updatedLogs = [newLog, ...existingLogs].slice(0, 20);
      localStorage.setItem(logsKey, JSON.stringify(updatedLogs));

      // Trigger custom event for parent component sync
      window.dispatchEvent(new Event("medibridge_battle_logs_changed"));
    } catch (err) {
      console.error("Error saving battle log:", err);
    }
  };

  // Finish game session and update cloud Firestore DB
  const handleFinishTrial = async () => {
    setGameState("results");
    saveBattleLog(true);

    try {
      const finalXp = user.xp + combatXpEarned;
      const finalCoins = user.coins + combatCoinsEarned;
      const nextLevel = Math.max(user.level, Math.floor(finalXp / 500) + 1);

      if (nextLevel > user.level) {
        playSound("levelup");
      } else {
        playSound("victory");
      }

      // Rank mapping based on level
      const updatedProfile: UserProfile = {
        ...user,
        xp: finalXp,
        coins: finalCoins,
        level: nextLevel,
        questionsSolved: user.questionsSolved + activeQuestions.length,
        questionsCorrect: user.questionsCorrect + correctCountInTrial,
        rank: nextLevel >= 8 ? "Elite" : nextLevel >= 4 ? "Scholar" : "Freshman",
      };

      // Sync Firestore DB
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, {
        xp: finalXp,
        coins: finalCoins,
        level: nextLevel,
        questionsSolved: updatedProfile.questionsSolved,
        questionsCorrect: updatedProfile.questionsCorrect,
        rank: updatedProfile.rank,
      }, { merge: true });

      // Automated in-app alert notification when exam results are ready for viewing
      try {
        const examName = activeLiveExam?.title || "Model Test Practice";
        const scoreFormatted = `${correctCountInTrial}/${activeQuestions.length}`;
        const accuracyPct = activeQuestions.length > 0 ? Math.round((correctCountInTrial / activeQuestions.length) * 100) : 0;
        await addDoc(collection(db, "user_notifications"), {
          userId: user.uid,
          title: language === "bn" ? `📊 পরীক্ষার ফলাফল প্রস্তুত: ${examName}` : `📊 Exam Results Ready: ${examName}`,
          content: language === "bn"
            ? `আপনার "${examName}" পরীক্ষার মূল্যায়ন প্রস্তুত! অর্জিত নম্বর: ${scoreFormatted} (${accuracyPct}% সঠিকতা)। বিস্তারিত দেখতে ক্লিক করুন!`
            : `Your evaluation for "${examName}" is ready for viewing! Final Score: ${scoreFormatted} (${accuracyPct}% Accuracy). Click to inspect full breakdown & solutions!`,
          type: "exam_result_ready",
          read: false,
          createdAt: new Date().toISOString(),
          examTitle: examName,
          score: scoreFormatted
        });
      } catch (notifErr) {
        console.error("Failed to post exam result notification:", notifErr);
      }

      onProfileUpdate(updatedProfile);
    } catch (err: any) {
      console.error(err);
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}/session`);
    }
  };

  // Calculate dynamic analytics highlights
  const currentSubjectLabel = anushiloniSub === "biology" ? "Biology" : anushiloniSub === "chemistry" ? "Chemistry" : "Physics";
  const allQuestionsPool = getPoolOfQuestions();
  const bookmarkedQuestionsForSubject = allQuestionsPool.filter(q => q.subject === currentSubjectLabel && bookmarkedIds.includes(q.id));

  const totalAttempts = (Object.values(analytics.attemptsByChapter) as number[]).reduce((a, b) => a + b, 0);
  const totalCorrect = (Object.values(analytics.correctByChapter) as number[]).reduce((a, b) => a + b, 0);
  const totalIncorrect = (Object.values(analytics.incorrectByChapter) as number[]).reduce((a, b) => a + b, 0);
  const globalAccuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

  // Find weakest chapter (highest incorrect quotient or count)
  let weakestChapter = "";
  let highestIncorrect = -1;
  Object.entries(analytics.incorrectByChapter).forEach(([chap, count]) => {
    const incorrectCount = count as number;
    if (incorrectCount > highestIncorrect) {
      highestIncorrect = incorrectCount;
      weakestChapter = chap;
    }
  });

  // Calculate completion percentage: core chapters attempted / total core chapters (15 total chapters)
  const totalCoreChapters = 15;
  const attemptedChaptersCount = Object.keys(analytics.attemptsByChapter).length;
  const completionPercent = Math.min(100, Math.round((attemptedChaptersCount / totalCoreChapters) * 100));

  const { strongCount, weakCount } = getAnalyticalCounts();

  return (
    <div className={`border rounded-3xl relative shadow-xl overflow-hidden select-none ${
      isDark ? "bg-[#111111] border-white/10" : "bg-white border-red-100"
    }`}>
      <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#C1121F] via-[#FFD700] to-[#C1121F] z-10"></div>

      {gameState === "select" && (
        <div className="flex flex-col">
          <div className="p-6 flex flex-col gap-6">

            {/* SECTION 1: STANDARD COMABAT ARENA */}
            {activeTab === "arena" && (
              <div className="flex flex-col gap-6 animate-fadeIn">
                
                {challengeRivalProfile && (
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-red-950/40 via-black/60 to-[#C1121F]/15 border-2 border-red-500/30 shadow-[0_0_20px_rgba(193,18,31,0.25)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-[#C1121F] text-white font-mono font-black text-[9px] uppercase tracking-widest py-1 px-3.5 rounded-bl-xl animate-pulse">
                      {language === "bn" ? "প্রতিদ্বন্দী ডুয়েলে চ্যালেঞ্জ" : "ACTIVE HEAD-TO-HEAD CHALLENGE"}
                    </div>

                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                      <div className="flex flex-col gap-2">
                        <h3 className="text-lg font-extrabold uppercase text-white font-display flex items-center gap-2">
                          <span>⚡</span>
                          <span>
                            {language === "bn" 
                              ? `${challengeRivalProfile.displayName}-কে হারানোর চ্যালেঞ্জ` 
                              : `CHALLENGE ${challengeRivalProfile.displayName}`}
                          </span>
                        </h3>
                        <p className="text-xs text-gray-300 leading-relaxed max-w-lg">
                          {language === "bn"
                            ? `আপনি ${challengeRivalProfile.displayName}-এর সবচেয়ে পারদর্শী বা আয়ত্ত করা প্রশ্নগুলোর মুখোমুখি হতে চলেছেন। প্রতিটি সঠিক উত্তরের জন্য পাবেন ৩ গুণ এক্সপি ও কয়েন বোনাস!`
                            : `You are about to face a custom set of 10 questions specifically mastered by ${challengeRivalProfile.displayName}. Proving your supremacy grants 3x XP and Coin multipliers!`}
                        </p>
                      </div>

                      <div className="flex flex-col items-center gap-2.5 bg-black/40 border border-white/5 rounded-xl p-4 shrink-0 min-w-[200px]">
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <img
                              src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`}
                              alt="You"
                              className="w-10 h-10 rounded-full border border-gray-500 bg-black"
                            />
                            <span className="text-[9px] text-gray-400 block mt-1 font-mono uppercase">YOU</span>
                          </div>
                          <span className="text-sm font-black text-red-500 font-mono animate-pulse">VS</span>
                          <div className="text-center">
                            <img
                              src={challengeRivalProfile.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${challengeRivalProfile.uid}`}
                              alt="Rival"
                              className="w-10 h-10 rounded-full border border-[#C1121F] bg-black"
                            />
                            <span className="text-[9px] text-red-400 block mt-1 font-mono uppercase font-bold">RIVAL</span>
                          </div>
                        </div>
                        
                        <div className="flex flex-col w-full gap-2 mt-1">
                          <button
                            onClick={handleStartPractice}
                            className="w-full py-2 bg-gradient-to-r from-red-650 to-amber-600 hover:from-red-600 hover:to-amber-500 text-white font-black uppercase text-xs rounded-lg transition duration-200 border-b border-red-950 font-display cursor-pointer flex items-center justify-center gap-1.5 shadow"
                          >
                            <span>⚔️</span>
                            <span>{language === "bn" ? "ডুয়েল শুরু করুন" : "LAUNCH DUEL"}</span>
                          </button>
                          <button
                            onClick={onClearChallenge}
                            className="w-full py-1 text-[10px] font-mono uppercase text-gray-400 hover:text-white transition hover:underline cursor-pointer"
                          >
                            {language === "bn" ? "চ্যালেঞ্জ প্রত্যাহার করুন" : "Cancel & Return"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className={`flex flex-col md:flex-row md:items-center justify-between border-b pb-4 gap-4 ${
                  isDark ? "border-white/5" : "border-red-100/50"
                }`}>
                  <div>
                    <h2 className={`text-xl md:text-2xl font-black uppercase flex items-center gap-2.5 font-display ${isDark ? "text-white" : "text-slate-900"}`}>
                      <Shield className="w-6 h-6 text-[#C1121F]" /> 
                      {language === "bn" ? "⚔️ মেডিকেল কমব্যাট এরিনা" : "MCQ COMBAT ARENA"}
                    </h2>
                    <p className={`text-xs font-mono uppercase tracking-wide mt-1 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                      {language === "bn" 
                        ? "বিষয় এবং মক টেস্টের কঠিনতার মানদণ্ড পরিমাপ করুন" 
                        : "Calibrate tactical parameters of medical subjects and chapters"}
                    </p>
                  </div>
                  <button
                    onClick={handleTriggerSurpriseTest}
                    className="px-4 py-2.5 bg-[#FFD700] hover:bg-yellow-500 hover:scale-103 active:scale-97 text-black font-black uppercase text-xs tracking-wider rounded-xl transition-all duration-300 flex items-center gap-2 border-b-2 border-yellow-850 shadow-[0_4px_12px_rgba(255,215,0,0.2)] font-display cursor-pointer"
                    id="btn-practice-random"
                  >
                    <Sparkles className="w-4 h-4 fill-current text-black animate-spin" />
                    {language === "bn" ? "এলোমেলო প্রশ্ন পরীক্ষা!" : "SURPRISE POPUP PROBE!"}
                  </button>
                </div>

                {/* ♾️ UNLIMITED QUESTION PRACTICE SECTION (MOVED TO TOP OF ARENA) */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#C1121F]/10 border border-[#C1121F]/20 flex items-center justify-center text-xl shadow-[0_0_15px_rgba(193,18,31,0.15)] animate-pulse">
                      ♾️
                    </div>
                    <div>
                      <h3 className={`text-base font-black uppercase font-display tracking-tight leading-none ${isDark ? "text-white" : "text-slate-900"}`}>
                        {language === "bn" ? "আনলিমিটেড প্রশ্ন প্র্যাকটিস" : "UNLIMITED QUESTION PRACTICE"}
                      </h3>
                      <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mt-1">
                        {language === "bn" ? "ভুল কমানোর সেরা অস্ত্র • আনলিমিটেড প্রশ্ন ব্যাংক" : "Continuous endless drilling engine • bulk coverage"}
                      </p>
                    </div>
                  </div>

                  <div className={`p-5 rounded-2xl border flex flex-col md:flex-row gap-5 items-stretch ${
                    isDark ? "bg-[#0D0D0D] border-white/5" : "bg-red-50/20 border-red-100/50 shadow-inner"
                  }`}>
                    {/* Subject filter */}
                    <div className="flex-1 flex flex-col gap-1.5">
                      <label className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">
                        {language === "bn" ? "বিষয় সিলেক্ট করুন:" : "SELECT SUBJECT:"}
                      </label>
                      <select
                        value={unlimitedSubject}
                        onChange={(e) => {
                          setUnlimitedSubject(e.target.value as any);
                          setUnlimitedChapter("All"); // Reset chapter
                        }}
                        className={`w-full text-xs font-bold rounded-xl py-2.5 px-3 border outline-none focus:border-[#C1121F] ${
                          isDark ? "bg-black border-white/10 text-white" : "bg-white border-red-150 text-slate-800 shadow-sm"
                        }`}
                      >
                        <option value="All">{language === "bn" ? "সব বিষয়" : "All Subjects"}</option>
                        <option value="Biology">{language === "bn" ? "🧬 জীববিজ্ঞান" : "Biology"}</option>
                        <option value="Chemistry">{language === "bn" ? "⚗️ রসায়ন" : "Chemistry"}</option>
                        <option value="Physics">{language === "bn" ? "⚡ পদার্থবিজ্ঞান" : "Physics"}</option>
                        <option value="English">{language === "bn" ? "🇬🇧 ইংরেজি" : "English"}</option>
                        <option value="GK">{language === "bn" ? "🇧🇩 সাধারণ জ্ঞান" : "General Knowledge"}</option>
                      </select>
                    </div>

                    {/* Chapter Filter */}
                    <div className="flex-1 flex flex-col gap-1.5">
                      <label className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">
                        {language === "bn" ? "অধ্যায় সিলেক্ট করুন:" : "SELECT CHAPTER:"}
                      </label>
                      <select
                        value={unlimitedChapter}
                        onChange={(e) => setUnlimitedChapter(e.target.value)}
                        className={`w-full text-xs font-bold rounded-xl py-2.5 px-3 border outline-none focus:border-[#C1121F] ${
                          isDark ? "bg-black border-white/10 text-white" : "bg-white border-red-150 text-slate-800 shadow-sm"
                        }`}
                      >
                        {getChaptersForSubject(unlimitedSubject).map((ch) => (
                          <option key={ch} value={ch}>
                            {ch === "All" ? (language === "bn" ? "সকল অধ্যায়" : "All Chapters") : ch}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Launch Unlimited session */}
                    <div className="flex items-end justify-stretch md:w-56">
                      <button
                        onClick={handleStartUnlimitedPractice}
                        className="w-full py-3 bg-gradient-to-r from-[#C1121F] to-red-800 hover:from-red-600 hover:to-red-900 text-white font-extrabold uppercase text-xs tracking-wider rounded-xl hover:scale-103 active:scale-97 transition-all duration-300 border-b-2 border-red-950 shadow-lg cursor-pointer flex items-center justify-center gap-2 font-display"
                      >
                        <span>🚀</span>
                        <span>{language === "bn" ? "প্র্যাকটিস শুরু করুন" : "LAUNCH DRILLS"}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className={`border-t my-2 ${isDark ? "border-white/5" : "border-red-100"}`}></div>

                {/* 🏆 EXAM BATCH LIVE MODEL TEST ARENA */}
                <div className="flex flex-col gap-3 mt-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-xl shadow-[0_0_15px_rgba(245,158,11,0.15)] animate-pulse">
                        🏆
                      </div>
                      <div>
                        <h3 className={`text-base font-black uppercase font-display tracking-tight leading-none ${isDark ? "text-white" : "text-slate-900"}`}>
                          {language === "bn" ? "এক্সাম ব্যাচ: লাইভ মডেল টেস্ট" : "EXAM BATCH: LIVE MODEL TEST"}
                        </h3>
                        <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mt-1">
                          {language === "bn" ? "রিয়েল-টাইম ব্যাচভিত্তিক লাইভ প্রতিযোগিতা • লিডারবোর্ড" : "Real-time synchronized competitive exams & leaderboards"}
                        </p>
                      </div>
                    </div>
                    
                  </div>

                  {/* EXAMS LIST */}
                  <div className={`p-5 rounded-2xl border flex flex-col gap-3.5 ${
                    isDark ? "bg-[#0D0D0D] border-white/5" : "bg-amber-50/20 border-red-100/50 shadow-inner"
                  }`}>
                    {liveExams.length === 0 ? (
                      <div className="text-center py-6 flex flex-col items-center gap-2">
                        <span className="text-2xl animate-bounce">📭</span>
                        <p className="text-xs text-gray-500 font-mono uppercase">
                          {language === "bn" ? "কোন সচল লাইভ পরীক্ষা পাওয়া যায়নি" : "No active live exams found"}
                        </p>
                        <p className="text-[10px] text-gray-600 max-w-xs">
                          {language === "bn" ? "শিক্ষক যখন লাইভ পরীক্ষা সেট করবেন, তখন আপনি এখানে অংশগ্রহণ করতে পারবেন।" : "When an educator schedules a live exam, it will appear here for you to join."}
                        </p>
                      </div>
                    ) : (
                      <div className="grid sm:grid-cols-2 gap-4">
                        {liveExams.map((exam) => {
                          const hasSubmitted = liveSubmissions.some(s => s.examId === exam.id && s.userId === user.uid);
                          const subjectEmoji = exam.subject === "Biology" ? "🧬" : exam.subject === "Chemistry" ? "⚗️" : exam.subject === "Physics" ? "⚡" : exam.subject === "English" ? "🇬🇧" : "🇧🇩";
                          return (
                            <div
                              key={exam.id}
                              className={`p-4 rounded-xl border flex flex-col justify-between gap-3.5 transition-all duration-300 hover:translate-y-[-2px] ${
                                isDark ? "bg-black/40 border-white/5 hover:bg-black/60 hover:border-amber-500/20" : "bg-white border-slate-100 shadow-sm hover:border-amber-300 hover:shadow"
                              }`}
                            >
                              <div className="flex flex-col gap-1.5">
                                {/* Live Exam Countdown Timer: displays while exam is upcoming; disappears once exam starts! */}
                                <LiveExamCountdownTimer startTime={exam.startTime || (exam as any).scheduledAt} language={language} className="mb-1" />

                                <div className="flex items-center justify-between gap-2">
                                  <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 text-[9px] font-mono font-bold uppercase tracking-wider">
                                    {subjectEmoji} {exam.subject}
                                  </span>
                                  <span className="text-[9px] text-gray-500 font-mono">
                                    {exam.totalQuestions} MCQs • {exam.duration} Mins
                                  </span>
                                </div>
                                <h4 className={`text-sm font-black leading-tight font-display tracking-tight ${isDark ? "text-gray-200" : "text-slate-800"}`}>
                                  {exam.title}
                                </h4>
                                <p className="text-[9px] text-gray-500 font-mono">
                                  {language === "bn" ? `পরীক্ষক: ${exam.creatorName}` : `Educator: ${exam.creatorName}`}
                                </p>
                              </div>

                              <div className="flex items-center gap-2 mt-1">
                                <button
                                  onClick={() => handleJoinLiveExam(exam)}
                                  className={`flex-1 py-2 rounded-lg font-black uppercase text-[10px] tracking-wide transition duration-200 font-display cursor-pointer flex items-center justify-center gap-1 shadow-sm ${
                                    hasSubmitted
                                      ? "bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/25"
                                      : "bg-gradient-to-r from-[#C1121F] to-red-850 hover:from-red-600 hover:to-red-900 text-white"
                                  }`}
                                >
                                  <span>{hasSubmitted ? "📊" : "⚔️"}</span>
                                  <span>
                                    {hasSubmitted 
                                      ? (language === "bn" ? "রিভিউ ও লিডারবোর্ড" : "Leaderboard & Review") 
                                      : (language === "bn" ? "পরীক্ষায় অংশ নিন" : "Start Live Exam")}
                                  </span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className={`border-t my-2 ${isDark ? "border-white/5" : "border-red-100"}`}></div>

                {/* CAMPAIGN BATTLE SELECTION FIELDS */}
                <div className="grid md:grid-cols-2 gap-6 leading-relaxed">
                  {/* Subject Choices */}
                  <div className="flex flex-col gap-2">
                    <label className={`text-[10px] font-mono font-bold uppercase tracking-wider block mb-1 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                      {language === "bn" ? "বিষয় নির্বাচন রাডার" : "SUBJECT ENTRANCE PORTAL"}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { code: "All", label: language === "bn" ? "সকল বিষয় (All)" : "ALL LABS" },
                        { code: "Biology", label: language === "bn" ? "🧬 জীববিজ্ঞান" : "BIOLOGY" },
                        { code: "Chemistry", label: language === "bn" ? "⚗️ রসায়ন" : "CHEMISTRY" },
                        { code: "Physics", label: language === "bn" ? "⚡ পদার্থবিজ্ঞান" : "PHYSICS" },
                        { code: "English", label: language === "bn" ? "🇬🇧 ইংরেজি" : "ENGLISH" },
                        { code: "GK", label: language === "bn" ? "🌐 সাধারণ জ্ঞান" : "GENERAL KNOWLEDGE" },
                      ].map((sub) => {
                        const isSel = selectedSubject === sub.code;
                        return (
                          <button
                            key={sub.code}
                            type="button"
                            onClick={() => setSelectedSubject(sub.code as any)}
                            className={`py-3 px-2 rounded-xl font-mono font-bold text-xs uppercase tracking-wider text-center border transition-all duration-200 cursor-pointer ${
                              isSel
                                ? "bg-[#C1121F] text-white border-white/10 shadow-[0_0_12px_rgba(193,18,31,0.3)]"
                                : isDark
                                  ? "bg-[#0D0D0D] text-gray-400 border-white/5 hover:border-white/10 hover:text-white"
                                  : "bg-slate-50 text-slate-600 border-red-100 hover:bg-slate-100 hover:text-black"
                            }`}
                          >
                            {sub.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Settings and mechanics */}
                  <div className={`flex flex-col gap-4 border rounded-2xl p-5 justify-between ${
                    isDark ? "bg-[#0D0D0D] border-white/10" : "bg-slate-50 border-red-100/50 shadow-inner"
                  }`}>
                    <div className="flex flex-col gap-4">
                      <div>
                        <h4 className={`font-extrabold text-[#C1121F] text-xs uppercase tracking-wider font-mono mb-2.5 flex items-center gap-1.5`}>
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>{language === "bn" ? "অ্যানালিটিক্স কাস্টম প্রিপারেশন" : "ANALYTICAL COMBAT FOCUS"}</span>
                        </h4>
                        
                        {/* Segmented controls for analytics filter */}
                        <div className={`grid grid-cols-3 p-1 rounded-xl text-center text-[10px] font-mono leading-none mb-3 ${
                          isDark ? "bg-[#181818]" : "bg-slate-200/60"
                        }`}>
                          <button
                            type="button"
                            onClick={() => { playSound("click"); setAnalyticalFilter("All"); }}
                            className={`py-2 rounded-lg transition-all cursor-pointer font-bold ${
                              analyticalFilter === "All"
                                ? isDark ? "bg-black/60 text-yellow-400 border border-white/5 shadow-sm" : "bg-white text-rose-800 shadow-sm border border-slate-100"
                                : "text-gray-400 hover:text-black dark:hover:text-white"
                            }`}
                          >
                            {language === "bn" ? "সাধারণ সমাধান" : "All Fields"}
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => { playSound("click"); setAnalyticalFilter("Strength"); }}
                            className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center relative font-bold ${
                              analyticalFilter === "Strength"
                                ? isDark ? "bg-black/60 text-emerald-400 border border-emerald-500/20 shadow-sm" : "bg-white text-emerald-700 shadow-sm border border-slate-100"
                                : "text-gray-400 hover:text-[#C1121F] dark:hover:text-white"
                            }`}
                          >
                            <span className="flex items-center gap-1">
                              <span>{language === "bn" ? "শক্তি" : "Strength"}</span> 
                              {strongCount > 0 && (
                                <span className="bg-emerald-500/20 text-emerald-400 text-[8.5px] px-1 py-0.2 rounded font-black shrink-0">
                                  {strongCount}
                                </span>
                              )}
                            </span>
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => { playSound("click"); setAnalyticalFilter("Weakness"); }}
                            className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center relative font-bold ${
                              analyticalFilter === "Weakness"
                                ? isDark ? "bg-[#111111] text-[#C1121F] border border-red-500/25 shadow-sm" : "bg-white text-red-700 shadow-sm border border-slate-100"
                                : "text-gray-400 hover:text-[#C1121F] dark:hover:text-white"
                            }`}
                          >
                            <span className="flex items-center gap-1">
                              <span>{language === "bn" ? "🛡️ দুর্বলতা" : "Weakness"}</span>
                              {weakCount > 0 && (
                                <span className="bg-red-500/20 text-[#C1121F] text-[8.5px] px-1 py-0.2 rounded font-black shrink-0">
                                  {weakCount}
                                </span>
                              )}
                            </span>
                          </button>
                        </div>

                        {/* Description block explaining the selection */}
                        <div className={`p-2.5 rounded-xl text-[11px] flex gap-2 border leading-normal ${
                          analyticalFilter === "All"
                            ? isDark ? "bg-black/20 border-white/5 text-gray-400" : "bg-slate-100/50 border-slate-200 text-slate-600"
                            : analyticalFilter === "Strength"
                              ? isDark ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-400" : "bg-emerald-50/55 border-emerald-100 text-emerald-800"
                              : isDark ? "bg-red-500/5 border-red-500/10 text-[#C1121F]" : "bg-red-50/55 border-red-150 text-red-800"
                        }`}>
                          <span className="text-xs mt-0.5">
                            {analyticalFilter === "All" ? "⚔️" : analyticalFilter === "Strength" ? "🛡️" : "☣️"}
                          </span>
                          <div>
                            {analyticalFilter === "All" && (
                              <span>
                                {language === "bn"
                                  ? "আপনার সাধারণ কুইজ পুল। নির্বাচিত বিষয়ের সমস্ত চ্যাপ্টার থেকে প্রশ্ন আসবে।"
                                  : "Standard balanced question pool from all syllabus chapters."}
                              </span>
                            )}
                            {analyticalFilter === "Strength" && (
                              <span>
                                {language === "bn"
                                  ? "যেসব অধ্যায়ে আপনার সঠিকতা ৭০%+ রয়েছে, শুধু সেগুলোর প্রশ্ন আসবে। আপনার ধারণাকে নিখুঁত ও মজবুত করতে দারুণ!"
                                  : `Only includes questions from your high performance chapters (accuracy >= 70%). Perfect for mastering your areas of expertise!`
                                }
                              </span>
                            )}
                            {analyticalFilter === "Weakness" && (
                              <span>
                                {language === "bn"
                                  ? "যেসব অধ্যায়ে আপনার ভুল উত্তর বা কম সঠিকতা (< ৬০%) রেকর্ড হয়েছে, শুধু সেগুলো থেকে প্রশ্ন আসবে। রিভিশনের সেরা অস্ত্র!"
                                  : `Targets your weakest links (accuracy < 60% or logged errors). Best weapon for target practice and rapid improvement!`
                                }
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className={`border-t pt-2.5 ${isDark ? "border-white/5" : "border-red-100/50"}`}>
                        <h4 className={`font-extrabold text-xs uppercase tracking-wide font-display ${isDark ? "text-white" : "text-slate-900"}`}>
                          {language === "bn" ? "সারভাইভাল চরম মোড" : "Gameplay Mechanics Calibration"}
                        </h4>
                        <p className={`text-[11px] mt-0.5 leading-tight ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                          {language === "bn" 
                            ? "ভুল উত্তর দিলে এইচপি কমে যাবে কিন্তু সঠিক উত্তরে দ্বিগুণ কয়েন ও এক্সপি বোনাস মিলবে।" 
                            : "Activate Survival limits to obtain double XP and coin spoils."}
                        </p>
                      </div>
                    </div>

                    <div className={`flex items-center justify-between border-t pt-3 ${isDark ? "border-white/5" : "border-red-100/50"}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl animate-pulse">🔥</span>
                        <div>
                          <span className={`text-xs font-bold block ${isDark ? "text-white" : "text-slate-800"}`}>
                            {language === "bn" ? "সারভাইভাল মোড সক্রিয়" : "SURVIVAL MECHANICS"}
                          </span>
                          <span className="text-[10px] text-[#C1121F] font-mono uppercase block font-black">
                            {language === "bn" ? "১৫ সেকেন্ড সময় ও লিমিটেড এইচপি" : "15S TIMER & PLAYER HP ACTIVE"}
                          </span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isSurvivalMode}
                        onChange={(e) => setIsSurvivalMode(e.target.checked)}
                        className={`w-5 h-5 rounded text-[#C1121F] focus:ring-0 cursor-pointer ${
                          isDark ? "border-white/10 bg-black" : "border-gray-300 bg-white"
                        }`}
                        id="chk-game-survival"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleStartPractice}
                  className="w-full mt-2 py-4 bg-[#C1121F] hover:bg-red-750 text-white font-extrabold text-center uppercase tracking-widest rounded-xl flex items-center justify-center gap-2.5 transition-all duration-300 border-b-4 border-red-900 hover:shadow-[0_0_20px_rgba(193,18,31,0.35)] font-display cursor-pointer"
                  id="btn-practice-launch"
                >
                  <Play className="w-5 h-5 fill-current text-[#FFD700]" /> 
                  {language === "bn" ? "মেডিক্যাল কুইজ ক্যাম্পেইন শুরু করুন" : "COMPILE HERO TRIALS"}
                </button>
              </div>
            )}

            {/* SECTION 2: TEXTBOOK ANUSHILONI HUB */}
            {activeTab === "anushiloni" && (
              <div className="flex flex-col gap-6 animate-fadeIn">
                
                {/* 1. Subject Selector Row */}
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-mono font-black text-gray-400 uppercase tracking-widest">
                    {language === "bn" ? "🧬 মূল বই অনুশীলনী বিষয়সমূহ" : "🧬 MAIN BOOKS PRACTICE SUBJECTS"}
                  </span>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { code: "biology", icon: "🧬", label: "জীববিজ্ঞান অনুশীলনী" },
                      { code: "chemistry", icon: "⚗️", label: "রসায়ন অনুশীলনী" },
                      { code: "physics", icon: "⚡", label: "পদার্থবিজ্ঞান অনুশীলনী" },
                    ].map((subject) => (
                      <button
                        key={subject.code}
                        onClick={() => {
                          setAnushiloniSub(subject.code as any);
                          setSelectedChapter(CHAPTERS_MAP[subject.code as AnushiloniSubject][0]);
                        }}
                        className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 border text-center transition ${
                          anushiloniSub === subject.code
                            ? "bg-yellow-500/10 border-yellow-500 text-yellow-500 font-extrabold shadow-[0_0_15px_rgba(255,215,0,0.15)]"
                            : "bg-black/40 border-white/5 text-gray-400 hover:border-white/10 hover:text-white"
                        }`}
                      >
                        <span className="text-2xl">{subject.icon}</span>
                        <span className="text-xs block font-bold">{language === "bn" ? subject.label : subject.code.toUpperCase() + " BOOK"}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Mode Choices Selector & Custom Param Filters */}
                <div className="grid lg:grid-cols-3 gap-6">
                  
                  {/* Features Deck */}
                  <div className="lg:col-span-2 flex flex-col gap-3">
                    <span className="text-[11px] font-mono font-black text-gray-400 uppercase tracking-widest">
                      {language === "bn" ? "অনুশীলনী স্পেশাল ফিচার" : "ANUSHILONI MODE SELECTION"}
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {[
                        { code: "chapter", name: "অধ্যায়ভিত্তিক", desc: "বইয়ের অধ্যায় ভিত্তিক প্রশ্ন" },
                        { code: "topic", name: "Topic-wise", desc: "নির্দিষ্ট টপিক অনুশীলন" },
                        { code: "full", name: "Full Book", desc: "পুরো বই একসাথে সমাধান" },
                        { code: "random", name: "Random Test", desc: "এলোমেলো অনুশীলনী প্রশ্ন" },
                        { code: "boss", name: "Boss Battle", desc: "অধ্যায় অসুরের সাথে কুইজ যুদ্ধ" },
                        { code: "mock", name: "Mock Test", desc: "সময় নিয়ন্ত্রিত মক টেস্ট" },
                        { code: "bookmark", name: language === "bn" ? "সংরক্ষিত প্রশ্ন 📌" : "Saved Questions 📌", desc: language === "bn" ? "বুকমার্ক করা প্রশ্নের রিভিশন" : "Quick revision of bookmarked" },
                      ].map((item) => (
                        <button
                          key={item.code}
                          onClick={() => setAnushiloniMode(item.code as any)}
                          className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all duration-200 ${
                            anushiloniMode === item.code
                              ? "bg-[#C1121F]/15 border-[#C1121F] text-white"
                              : "bg-black/30 border-white/5 text-gray-400 hover:border-white/15 hover:text-white"
                          }`}
                        >
                          <span className="text-xs font-black block uppercase">{item.name}</span>
                          <span className="text-[9.5px] mt-1 text-gray-400 opacity-80 leading-tight block">{item.desc}</span>
                        </button>
                      ))}
                    </div>

                    {/* Chapter & Topic selections depending on active mode */}
                    {anushiloniMode === "chapter" && (
                      <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-4 mt-2 flex flex-col gap-2">
                        <label className="text-[10px] font-mono font-bold text-gray-400 uppercase">
                          {language === "bn" ? "অধ্যায় নির্বাচন করুন:" : "SELECT CHAPTER:"}
                        </label>
                        <select
                          value={selectedChapter}
                          onChange={(e) => setSelectedChapter(e.target.value)}
                          className="w-full bg-black border border-white/10 text-white rounded-xl py-2 px-3 text-xs outline-none focus:border-yellow-500"
                        >
                          {CHAPTERS_MAP[anushiloniSub].map((chap) => (
                            <option key={chap} value={chap}>{chap}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {anushiloniMode === "topic" && (
                      <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-4 mt-2 flex flex-col gap-2">
                        <label className="text-[10px] font-mono font-bold text-gray-400 uppercase">
                          {language === "bn" ? "টপিক নির্বাচন করুন:" : "SELECT SPECIAL TOPIC:"}
                        </label>
                        <select
                          value={selectedTopic}
                          onChange={(e) => setSelectedTopic(e.target.value)}
                          className="w-full bg-black border border-white/10 text-white rounded-xl py-2 px-3 text-xs outline-none focus:border-yellow-500"
                        >
                          {TOPICS_MAP[anushiloniSub].map((top) => (
                            <option key={top} value={top}>{top}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {anushiloniMode === "boss" && (
                      <div className="bg-[#C1121F]/10 border border-[#C1121F]/20 rounded-2xl p-4 mt-2 flex items-center gap-3.5">
                        <span className="text-3xl animate-pulse">👹</span>
                        <div>
                          <span className="text-xs font-black text-white block uppercase">
                            {language === "bn" ? "বস যুদ্ধ সক্রিয়!" : "ACTIVATED BOOK GUARDIAN BOSS FIGHT"}
                          </span>
                          <span className="text-[10px] text-gray-400 leading-normal mt-0.5 block">
                            {language === "bn" 
                              ? `আপনি সমাধান করতে পারলে "${BOSSES_MAP[anushiloniSub]}" ঘায়েল হবে। ভুল কুইজে আপনার নিজের HP কমবে!`
                              : `Correct answers deal damage to the Boss. Failures will reduce candidate's health.`}
                          </span>
                        </div>
                      </div>
                    )}

                    {anushiloniMode === "bookmark" && (
                      <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-5 mt-2 flex flex-col gap-4">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <span className="text-xs font-black text-white uppercase flex items-center gap-1.5">
                            <Bookmark className="w-4 h-4 text-yellow-500 fill-yellow-500 animate-pulse" />
                            {language === "bn" ? "সংরক্ষিত প্রশ্নাবলি" : "SAVED QUESTION REVISION"}
                          </span>
                          <span className="text-[10px] bg-yellow-500/10 text-[#FFD700] px-2.5 py-0.5 rounded-full border border-yellow-500/20 font-mono font-bold">
                            {bookmarkedQuestionsForSubject.length} {language === "bn" ? "টি সংরক্ষিত" : "SAVED"}
                          </span>
                        </div>

                        {bookmarkedQuestionsForSubject.length === 0 ? (
                          <div className="text-center py-6 px-4">
                            <span className="text-3xl block mb-2 opacity-50">📌</span>
                            <span className="text-xs text-gray-400 block leading-relaxed font-sans">
                              {language === "bn" 
                                ? "কোন বুকমার্ক করা প্রশ্ন পাওয়া যায়নি! কুইজ দেওয়ার সময় গুরুত্বপূর্ণ প্রশ্নগুলো বুকমার্ক করে রাখুন।" 
                                : "No bookmarked questions for this subject. Try bookmarking questions during practice sessions for quick revision later!"}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
                            {bookmarkedQuestionsForSubject.map((q) => {
                              const isExpanded = expandedBookmarkId === q.id;
                              return (
                                <div 
                                  key={q.id} 
                                  className={`rounded-xl border transition-all duration-200 ${
                                    isExpanded 
                                      ? "bg-black border-yellow-500/40 p-4" 
                                      : "bg-black/30 border-white/5 hover:border-white/10 p-3.5"
                                  }`}
                                >
                                  <div 
                                    className="flex items-start justify-between gap-3 cursor-pointer select-none"
                                    onClick={() => setExpandedBookmarkId(isExpanded ? null : q.id)}
                                  >
                                    <div className="flex-1 text-left">
                                      <span className="text-[9px] font-mono font-black text-[#FFD700] uppercase block mb-1">
                                        {q.chapter}
                                      </span>
                                      <span className="text-xs font-bold text-white leading-relaxed font-sans block">
                                        {q.questionText}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleBookmark(q.id);
                                        }}
                                        className="p-1.5 rounded-lg bg-red-950/20 hover:bg-red-950/45 border border-red-500/15 text-red-400 hover:text-red-500 transition cursor-pointer"
                                        title={language === "bn" ? "মুছে ফেলুন" : "Remove Bookmark"}
                                      >
                                        <Trash className="w-3.5 h-3.5" />
                                      </button>
                                      <span className="text-gray-400 text-xs">
                                        {isExpanded ? "▲" : "▼"}
                                      </span>
                                    </div>
                                  </div>

                                  {isExpanded && (
                                    <div className="mt-3 pt-3 border-t border-white/5 flex flex-col gap-2.5 animate-fadeIn font-sans">
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {q.options.map((opt, oIdx) => {
                                          const isCorrect = oIdx === q.correctAnswerIndex;
                                          return (
                                            <div 
                                              key={oIdx} 
                                              className={`p-2.5 rounded-lg text-xs border flex items-center gap-2 ${
                                                isCorrect 
                                                  ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300 font-bold" 
                                                  : "bg-black/40 border-white/5 text-gray-400"
                                              }`}
                                            >
                                              <span className="font-mono font-black text-[#FFD700]">{oIdx === 0 ? "A" : oIdx === 1 ? "B" : oIdx === 2 ? "C" : "D"}.</span>
                                              <span>{opt}</span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                      {q.explanation && (
                                        <div className="mt-1 bg-[#0A0A0A] p-3 rounded-lg border border-white/5">
                                          <span className="text-[10px] font-mono font-bold text-[#FFD700] block mb-1 uppercase">
                                            {language === "bn" ? "ব্যাখ্যা ও ব্যাখ্যা বিশ্লেষণ" : "EXPLANATION & ANALYSIS"}
                                          </span>
                                          <p className="text-gray-300 text-xs leading-relaxed">
                                            {q.explanation}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 3. Real-Time Persistent Analytics Panel */}
                  <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-5 flex flex-col gap-4 text-xs font-mono">
                    <span className="text-[11px] font-sans font-black text-[#FFD700] uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
                      <TrendingUp className="w-3.5 h-3.5" />
                      {language === "bn" ? "অনুশীলনী ডাটা এনালিটিক্স" : "ANUSHILONI ANALYTICS"}
                    </span>

                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center text-gray-450 border-b border-white/[0.02] pb-1.5">
                        <span>{language === "bn" ? "সঠিকতা হার" : "Overall Accuracy"}:</span>
                        <span className="text-white font-extrabold">{globalAccuracy}% Acc</span>
                      </div>
                      <div className="flex justify-between items-center text-gray-450 border-b border-white/[0.02] pb-1.5">
                        <span>{language === "bn" ? "মোট সমাধানকৃত" : "Completed drills"}:</span>
                        <span className="text-yellow-500 font-extrabold">{totalAttempts} {language === "bn" ? "প্রশ্ন" : "Drills"}</span>
                      </div>
                      <div className="flex justify-between items-center text-gray-450 border-b border-white/[0.02] pb-1.5">
                        <span>{language === "bn" ? "সম্পূর্ণতার হার" : "Completion %"}:</span>
                        <span className="text-emerald-400 font-bold">{completionPercent}%</span>
                      </div>
                    </div>

                    {weakestChapter ? (
                      <div className="p-3 bg-red-950/10 border border-[#C1121F]/20 text-red-300 rounded-xl flex items-start gap-2 text-[10.5px]">
                        <AlertTriangle className="w-4 h-4 text-[#C1121F] shrink-0 mt-0.5" />
                        <div>
                          <strong className="block text-white uppercase text-[9px] mb-0.5">
                            {language === "bn" ? "দুর্বল অধ্যায়" : "WEAKEST SEGMENT"}:
                          </strong>
                          <span>
                            {weakestChapter}
                          </span>
                          <span className="block text-gray-400 text-[9px] mt-1.5 italic font-sans">
                            💡 {language === "bn" ? "পরামর্শ: এই অধ্যায়টি বেশি বেশি রিভিশন দিন!" : "Revision Suggestion: Read Main Books exercises for this chapter thoroughly!"}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-emerald-950/10 border border-emerald-500/20 text-emerald-300 rounded-xl text-[10.5px]">
                        {language === "bn" ? "কোন দুর্বল অধ্যায় এখনও নেই। সমাধান করতে থাকুন!" : "Keep solving exercises to populate real-time chapter weakness reports!"}
                      </div>
                    )}

                    {/* Quick unlocked badge count */}
                    {analytics.unlockedBadges && analytics.unlockedBadges.length > 0 && (
                      <div className="flex items-center gap-1.5 bg-yellow-500/5 border border-yellow-500/10 py-1.5 px-2.5 rounded-lg text-[10px] text-yellow-400">
                        <span>🏆</span>
                        <span className="font-extrabold uppercase">
                          {analytics.unlockedBadges.length} {language === "bn" ? "ব্যাজ আনলক" : "Badges Unlocked!"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Start launch trigger */}
                <button
                  onClick={handleStartAnushiloni}
                  className="w-full py-4 bg-yellow-500 hover:bg-yellow-600 text-black font-extrabold text-center uppercase tracking-widest rounded-xl flex items-center justify-center gap-2.5 transition duration-300 border-b-4 border-yellow-750 shadow-[0_0_15px_rgba(255,215,0,0.1)] font-display cursor-pointer"
                >
                  <RocketLaunchIcon />
                  <span>
                    {language === "bn" 
                      ? `${anushiloniMode === "boss" ? "👹 অসুর যুদ্ধ (BOSS BATTLE) শুরু করুন" : anushiloniMode === "bookmark" ? "📌 সংরক্ষিত রিভিশন প্র্যাকটিস শুরু করুন" : `${anushiloniMode.toUpperCase()} মোডে প্রবেশ করুন`}`
                      : anushiloniMode === "bookmark" ? "📌 START BOOKMARKS REVISION" : `ENTER ${anushiloniMode.toUpperCase()} MODE`}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STATE 1.7: LIVE MODEL TEST EXAM BATCH SYSTEM */}
      {gameState === "live_exam" && activeLiveExam && (
        <div className={`flex flex-col gap-6 p-6 max-w-4xl mx-auto animate-fadeIn select-none rounded-2xl transition-colors duration-300 ${
          isLiveExamDark 
            ? "bg-[#0b0e14] text-white border border-white/10" 
            : "bg-[#FAFAFC] text-slate-900 shadow-xl border border-slate-200/80"
        }`}>
          {/* Header Bar */}
          <div className={`flex flex-wrap items-center justify-between gap-4 pb-4 border-b ${
            isLiveExamDark ? "border-white/10" : "border-slate-200"
          }`}>
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">🏆</span>
              <div>
                <h3 className={`text-base md:text-lg font-black uppercase font-display leading-tight ${
                  isLiveExamDark ? "text-white" : "text-slate-900"
                }`}>
                  {activeLiveExam.title}
                </h3>
                <p className={`text-[11px] font-mono uppercase tracking-wider mt-0.5 font-bold ${
                  isLiveExamDark ? "text-gray-400" : "text-slate-600"
                }`}>
                  {language === "bn" ? `${activeLiveExam.subject} • লাইভ এক্সাম ব্যাচ পরীক্ষা` : `${activeLiveExam.subject} • Live Exam Batch Run`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Theme Toggle Button */}
              <button
                type="button"
                onClick={toggleLiveExamTheme}
                title={isLiveExamDark ? (language === "bn" ? "লাইট মোড চালু করুন" : "Switch to Light Mode") : (language === "bn" ? "ডার্ক মোড চালু করুন" : "Switch to Dark Mode")}
                className={`p-2 rounded-xl border transition-all duration-200 flex items-center gap-1.5 text-xs font-bold cursor-pointer ${
                  isLiveExamDark
                    ? "bg-white/5 border-white/15 text-amber-300 hover:bg-white/10"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-xs"
                }`}
              >
                {isLiveExamDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
                <span className="hidden sm:inline font-mono text-[11px]">
                  {isLiveExamDark ? (language === "bn" ? "লাইট" : "Light") : (language === "bn" ? "ডার্ক" : "Dark")}
                </span>
              </button>

              {liveExamState === "writing" && (
                <>
                  <div className={`px-3.5 py-2 rounded-xl flex items-center gap-2 font-mono font-black text-sm border shadow-xs ${
                    liveExamSecondsLeft < 60
                      ? "bg-red-500/10 border-red-500 text-red-500 animate-pulse"
                      : isLiveExamDark ? "bg-black/40 border-white/10 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-800"
                  }`}>
                    <Clock className="w-4 h-4 animate-spin text-current" />
                    <span>
                      {Math.floor(liveExamSecondsLeft / 60)}:
                      {String(liveExamSecondsLeft % 60).padStart(2, "0")}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      playSound("click");
                      setShowLiveExamSubmitConfirmModal(true);
                    }}
                    className="px-4 py-2 bg-[#C1121F] hover:bg-red-600 text-white rounded-xl font-black text-xs uppercase font-mono tracking-wider transition shadow-sm flex items-center gap-1.5 cursor-pointer border border-red-500"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{language === "bn" ? "জমা দিন" : "Submit"}</span>
                  </button>
                </>
              )}

              {liveExamState === "done" && (
                <button
                  onClick={handleLeaveLiveExam}
                  className={`px-4 py-2 rounded-xl font-bold text-xs uppercase transition cursor-pointer border ${
                    isLiveExamDark 
                      ? "bg-slate-500/15 hover:bg-slate-500/25 text-gray-300 border-slate-500/25" 
                      : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-xs"
                  }`}
                >
                  {language === "bn" ? "অ্যারেনায় ফিরে যান" : "Return to Arena"}
                </button>
              )}
            </div>
          </div>

          {/* ACTIVE WRITING MODE */}
          {liveExamState === "writing" && activeQuestions.length > 0 && (
            <div className="flex flex-col gap-6">
              {/* Question Indicators */}
              <div className="flex flex-wrap gap-2">
                {activeQuestions.map((_, idx) => {
                  const isSelected = liveExamAnswers[idx] !== undefined;
                  const isCurrent = currentIndex === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => setCurrentIndex(idx)}
                      className={`w-8 h-8 rounded-lg font-mono text-xs font-bold transition-all duration-200 cursor-pointer ${
                        isCurrent
                          ? isLiveExamDark
                            ? "bg-[#C1121F] text-white ring-2 ring-red-500 ring-offset-2 ring-offset-black"
                            : "bg-[#C1121F] text-white ring-2 ring-red-500 ring-offset-2 ring-offset-white shadow-sm"
                          : isSelected
                            ? isLiveExamDark
                              ? "bg-emerald-500/25 border border-emerald-500/40 text-emerald-300"
                              : "bg-emerald-50 border-2 border-emerald-500 text-emerald-800 font-extrabold shadow-2xs"
                            : isLiveExamDark
                              ? "bg-black/40 border border-white/5 text-gray-400 hover:border-white/20 hover:text-white"
                              : "bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-black hover:border-slate-300 shadow-2xs"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Core Question Card */}
              <div className={`p-6 rounded-2xl border transition-all duration-200 ${
                isLiveExamDark 
                  ? "bg-[#111622] border-white/10 shadow-lg" 
                  : "bg-white border-2 border-slate-200/90 shadow-md"
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-black uppercase border ${
                    isLiveExamDark
                      ? "bg-[#C1121F]/15 border-[#C1121F]/30 text-red-400"
                      : "bg-red-50 border-red-200 text-[#C1121F]"
                  }`}>
                    MCQ #{currentIndex + 1}
                  </span>
                  <span className={`text-[11px] font-mono uppercase font-bold ${
                    isLiveExamDark ? "text-gray-400" : "text-slate-600"
                  }`}>
                    {activeQuestions[currentIndex].chapter}
                  </span>
                </div>

                <h4 className={`text-base md:text-lg font-bold leading-relaxed mb-6 font-sans ${
                  isLiveExamDark ? "text-gray-100" : "text-slate-900"
                }`}>
                  {activeQuestions[currentIndex].questionText}
                </h4>

                <div className="grid sm:grid-cols-2 gap-3.5">
                  {activeQuestions[currentIndex].options.map((opt, oIdx) => {
                    const isSel = liveExamAnswers[currentIndex] === oIdx;
                    return (
                      <button
                        key={oIdx}
                        onClick={() => {
                          playSound("click");
                          setLiveExamAnswers(prev => ({ ...prev, [currentIndex]: oIdx }));
                        }}
                        className={`p-4 rounded-xl border text-left font-sans font-bold text-xs transition duration-200 cursor-pointer ${
                          isSel
                            ? isLiveExamDark
                              ? "bg-[#C1121F] text-white border-red-500 shadow-[0_0_12px_rgba(193,18,31,0.25)]"
                              : "bg-[#C1121F] text-white border-2 border-red-700 shadow-md"
                            : isLiveExamDark
                              ? "bg-black/60 text-gray-200 border-white/10 hover:border-white/20 hover:text-white hover:bg-black/80"
                              : "bg-[#F8FAFC] text-slate-800 border-2 border-slate-200 hover:bg-white hover:text-black hover:border-[#C1121F]/40 shadow-xs"
                        }`}
                      >
                        <div className="flex gap-2.5 items-start">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-mono ${
                            isSel 
                              ? "bg-white text-red-700 font-extrabold shadow-xs" 
                              : isLiveExamDark ? "bg-white/10 text-gray-300" : "bg-slate-200 text-slate-700 font-bold"
                          }`}>
                            {String.fromCharCode(65 + oIdx)}
                          </span>
                          <span className="leading-normal">{opt}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Navigation Bar */}
              <div className="flex items-center justify-between gap-4">
                <button
                  onClick={() => setCurrentIndex(p => Math.max(0, p - 1))}
                  disabled={currentIndex === 0}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
                    currentIndex === 0
                      ? "opacity-40 cursor-not-allowed"
                      : isLiveExamDark 
                        ? "bg-black/40 border-white/10 text-white hover:bg-black" 
                        : "bg-white border-2 border-slate-200 text-slate-800 hover:bg-slate-100 shadow-xs"
                  }`}
                >
                  {language === "bn" ? "← পূর্ববর্তী" : "← Previous"}
                </button>

                {currentIndex === activeQuestions.length - 1 ? (
                  <button
                    onClick={() => {
                      playSound("click");
                      setShowLiveExamSubmitConfirmModal(true);
                    }}
                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all duration-300 shadow-[0_4px_15px_rgba(16,185,129,0.25)] flex items-center gap-1.5 font-display cursor-pointer"
                  >
                    <span>🎯</span>
                    <span>{language === "bn" ? "পরীক্ষা জমা দিন" : "Submit Exam"}</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        playSound("click");
                        setShowLiveExamSubmitConfirmModal(true);
                      }}
                      className={`px-4 py-2 font-bold rounded-xl text-xs uppercase transition cursor-pointer border ${
                        isLiveExamDark
                          ? "bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border-emerald-500/30"
                          : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300 shadow-xs"
                      }`}
                    >
                      {language === "bn" ? "জমা দিন" : "Submit"}
                    </button>
                    <button
                      onClick={() => setCurrentIndex(p => Math.min(activeQuestions.length - 1, p + 1))}
                      className="px-5 py-2.5 bg-gradient-to-r from-[#C1121F] to-red-800 hover:from-red-600 hover:to-red-900 text-white font-black rounded-xl text-xs uppercase tracking-wide transition font-display cursor-pointer shadow-sm"
                    >
                      {language === "bn" ? "পরবর্তী →" : "Next →"}
                    </button>
                  </div>
                )}
              </div>

              {/* LIVE EXAM SUBMIT CONFIRMATION MODAL */}
              <LiveExamSubmitConfirmModal
                isOpen={showLiveExamSubmitConfirmModal}
                examTitle={activeLiveExam.title}
                totalQuestions={activeQuestions.length}
                answeredCount={Object.keys(liveExamAnswers).length}
                timeRemainingSeconds={liveExamSecondsLeft}
                unansweredIndices={liveExamUnansweredIndices}
                language={language}
                isDark={isLiveExamDark}
                onClose={() => setShowLiveExamSubmitConfirmModal(false)}
                onConfirmSubmit={() => {
                  setShowLiveExamSubmitConfirmModal(false);
                  handleSubmitLiveExam(false);
                }}
                onJumpToQuestion={(qIdx) => {
                  setCurrentIndex(qIdx);
                }}
              />
            </div>
          )}

          {/* COMPLETED DONE MODE */}
          {liveExamState === "done" && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              {/* Score HUD Card */}
              {(() => {
                const mySubmission = liveSubmissions.find(s => s.userId === user.uid);
                const score = mySubmission ? mySubmission.score : 0;
                const total = activeQuestions.length;
                const percent = total > 0 ? Math.round((score / total) * 100) : 0;
                const xpGain = score * 15 + 50;
                const coinGain = score * 8 + 20;

                return (
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className={`md:col-span-1 p-6 rounded-2xl border flex flex-col items-center justify-center text-center ${
                      isLiveExamDark ? "bg-[#111622] border-white/10" : "bg-white border-2 border-slate-200 shadow-sm"
                    }`}>
                      <h4 className={`text-[11px] font-mono font-bold uppercase tracking-widest mb-4 ${
                        isLiveExamDark ? "text-gray-400" : "text-slate-600"
                      }`}>
                        {language === "bn" ? "পরীক্ষায় আপনার স্কোর" : "YOUR EXAM SCORE"}
                      </h4>
                      <div className="relative w-32 h-32 flex items-center justify-center rounded-full border-4 border-dashed border-amber-500/20 mb-3 animate-spin-slow">
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-3xl font-black font-mono tracking-tight text-amber-500">
                            {score}
                          </span>
                          <span className={`text-[10px] font-mono uppercase font-bold ${
                            isLiveExamDark ? "text-gray-400" : "text-slate-500"
                          }`}>
                            out of {total}
                          </span>
                        </div>
                      </div>
                      <div className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-xs font-bold border border-amber-500/20">
                        {percent}% Accuracy
                      </div>
                    </div>

                    <div className={`md:col-span-2 p-6 rounded-2xl border flex flex-col justify-between ${
                      isLiveExamDark ? "bg-[#111622] border-white/10" : "bg-white border-2 border-slate-200 shadow-sm"
                    }`}>
                      <div>
                        <h4 className="text-base font-black text-amber-600 dark:text-amber-400 uppercase tracking-wide font-display mb-2 flex items-center gap-1.5">
                          <span>🎉</span>
                          <span>{language === "bn" ? "পরীক্ষা সফলভাবে সম্পন্ন হয়েছে!" : "Exam Completed Successfully!"}</span>
                        </h4>
                        <p className={`text-xs leading-relaxed mb-4 ${
                          isLiveExamDark ? "text-gray-400" : "text-slate-600"
                        }`}>
                          {language === "bn"
                            ? "এক্সাম ব্যাচে অংশ নেওয়ার জন্য আপনাকে অভিনন্দন! আপনার ফলাফল এবং রিয়েল-টাইম লিডারবোর্ড নিচে দেওয়া হলো। আপনার পারফরম্যান্সের ভিত্তিতে কয়েন ও এক্সপি প্রদান করা হয়েছে।"
                            : "Congratulations on taking the live model test! Your performance has been recorded, and rewards have been credited directly to your profile. View the real-time rankings below."}
                        </p>
                      </div>

                      <div className={`grid grid-cols-2 gap-4 border-t pt-4 font-mono text-xs ${
                        isLiveExamDark ? "border-white/5" : "border-slate-200"
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 text-lg border border-emerald-500/20">
                            ⚡
                          </div>
                          <div>
                            <span className={`text-[10px] block uppercase font-bold ${
                              isLiveExamDark ? "text-gray-400" : "text-slate-500"
                            }`}>XP Gained</span>
                            <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">+{xpGain} XP</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-500 text-lg border border-yellow-500/20">
                            🪙
                          </div>
                          <div>
                            <span className={`text-[10px] block uppercase font-bold ${
                              isLiveExamDark ? "text-gray-400" : "text-slate-500"
                            }`}>Coins Received</span>
                            <span className="font-extrabold text-yellow-600 dark:text-yellow-500 text-sm">+{coinGain} Gold</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Real-time competitive leaderboard */}
              <div className={`p-6 rounded-2xl border ${
                isLiveExamDark ? "bg-[#111622] border-white/10" : "bg-white border-2 border-slate-200 shadow-sm"
              }`}>
                <h4 className="text-sm font-black text-amber-600 dark:text-amber-400 uppercase tracking-wide font-display mb-4 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <span>{language === "bn" ? "🏆 রিয়েল-টাইম ব্যাচ লিডারবোর্ড" : "🏆 REAL-TIME BATCH LEADERBOARD"}</span>
                  </span>
                  <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-bold uppercase animate-pulse">
                    ● Real-time Syncing
                  </span>
                </h4>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className={`border-b text-[10px] uppercase font-bold ${
                        isLiveExamDark ? "border-white/10 text-gray-400" : "border-slate-200 text-slate-500"
                      }`}>
                        <th className="pb-2">Rank</th>
                        <th className="pb-2">Aspirant</th>
                        <th className="pb-2 text-center">Score</th>
                        <th className="pb-2 text-right">Time Taken</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y font-mono ${
                      isLiveExamDark ? "divide-white/5" : "divide-slate-100"
                    }`}>
                      {liveSubmissions.map((sub, sIdx) => {
                        const isMe = sub.userId === user.uid;
                        const rankEmoji = sIdx === 0 ? "🥇" : sIdx === 1 ? "🥈" : sIdx === 2 ? "🥉" : `${sIdx + 1}`;
                        return (
                          <tr
                            key={sub.id}
                            className={`transition ${
                              isMe 
                                ? isLiveExamDark ? "bg-amber-500/10 text-amber-300 font-bold" : "bg-amber-50 text-amber-900 font-bold"
                                : isLiveExamDark ? "text-gray-300 hover:bg-white/5" : "text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            <td className="py-2.5 font-bold">{rankEmoji}</td>
                            <td className="py-2.5 flex items-center gap-2">
                              <img
                                src={sub.avatarUrl}
                                alt={sub.displayName}
                                className="w-6 h-6 rounded-full border border-gray-400 bg-black shrink-0"
                              />
                              <span className="truncate max-w-[120px] sm:max-w-xs">{sub.displayName}</span>
                              {isMe && (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-black tracking-wide shrink-0 ${
                                  isLiveExamDark ? "bg-amber-500/20 text-amber-400" : "bg-amber-200 text-amber-900"
                                }`}>
                                  You
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 text-center font-bold">{sub.score} / {sub.totalQuestions}</td>
                            <td className={`py-2.5 text-right font-bold ${
                              isLiveExamDark ? "text-gray-400" : "text-slate-500"
                            }`}>
                              {Math.floor(sub.timeTaken / 60)}m {sub.timeTaken % 60}s
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Answers Review Section */}
              <div className="flex flex-col gap-4">
                <h4 className={`text-sm font-black uppercase tracking-wide font-display ${
                  isLiveExamDark ? "text-gray-200" : "text-slate-800"
                }`}>
                  {language === "bn" ? "🔍 প্রশ্ন ও উত্তরপত্র পর্যালোচনা" : "🔍 QUESTION & ANSWERS REVIEW"}
                </h4>

                <div className="flex flex-col gap-4">
                  {activeQuestions.map((q, qIdx) => {
                    const myAns = liveExamAnswers[qIdx];
                    const isCorr = myAns !== undefined && myAns === q.correctAnswerIndex;
                    return (
                      <div
                        key={q.id || qIdx}
                        className={`p-5 rounded-2xl border flex flex-col gap-3 transition ${
                          isCorr 
                            ? isLiveExamDark ? "bg-emerald-950/15 border-emerald-500/30" : "bg-emerald-50/70 border-emerald-200"
                            : myAns === undefined
                              ? isLiveExamDark ? "bg-black/30 border-white/10" : "bg-white border-slate-200"
                              : isLiveExamDark ? "bg-red-950/15 border-red-500/30" : "bg-red-50/70 border-red-200"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded font-black border ${
                            isLiveExamDark ? "bg-black/40 border-white/10 text-gray-400" : "bg-slate-100 border-slate-200 text-slate-700"
                          }`}>
                            Question #{qIdx + 1}
                          </span>
                          <span className={`text-[10px] font-mono uppercase font-black px-2.5 py-0.5 rounded border ${
                            isCorr
                              ? isLiveExamDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-100 text-emerald-800 border-emerald-300"
                              : myAns === undefined
                                ? isLiveExamDark ? "bg-slate-500/10 text-gray-400 border-slate-500/20" : "bg-slate-100 text-slate-600 border-slate-200"
                                : isLiveExamDark ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-red-100 text-red-800 border-red-300"
                          }`}>
                            {isCorr ? "Correct" : myAns === undefined ? "Unanswered" : "Incorrect"}
                          </span>
                        </div>

                        <h5 className={`text-sm font-bold leading-relaxed ${
                          isLiveExamDark ? "text-gray-100" : "text-slate-900"
                        }`}>
                          {q.questionText}
                        </h5>

                        <div className="grid sm:grid-cols-2 gap-2.5 text-xs font-mono">
                          {q.options.map((opt, oIdx) => {
                            const isCorrectAns = oIdx === q.correctAnswerIndex;
                            const isUserAns = myAns === oIdx;
                            return (
                              <div
                                key={oIdx}
                                className={`p-3 rounded-xl border text-left leading-normal flex gap-2 items-center ${
                                  isCorrectAns
                                    ? isLiveExamDark
                                      ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-extrabold"
                                      : "bg-emerald-50 border-2 border-emerald-500 text-emerald-900 font-black shadow-xs"
                                    : isUserAns
                                      ? isLiveExamDark
                                        ? "bg-red-500/20 border-red-500/40 text-red-300 font-extrabold"
                                        : "bg-red-50 border-2 border-red-500 text-red-900 font-black shadow-xs"
                                      : isLiveExamDark 
                                        ? "bg-black/40 border-white/5 text-gray-400" 
                                        : "bg-white border border-slate-200 text-slate-700"
                                }`}
                              >
                                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] shrink-0 font-bold ${
                                  isCorrectAns 
                                    ? "bg-emerald-500 text-white"
                                    : isUserAns 
                                      ? "bg-red-500 text-white"
                                      : isLiveExamDark ? "bg-white/10 text-gray-400" : "bg-slate-200 text-slate-600"
                                }`}>
                                  {String.fromCharCode(65 + oIdx)}
                                </span>
                                <span>{opt}</span>
                              </div>
                            );
                          })}
                        </div>

                        {q.explanation && (
                          <div className={`mt-2 p-3.5 rounded-xl border leading-relaxed text-xs font-sans ${
                            isLiveExamDark 
                              ? "bg-black/60 border-white/5 text-gray-300" 
                              : "bg-amber-50/50 border-amber-200 text-slate-700"
                          }`}>
                            <strong className="text-amber-600 dark:text-amber-400 block mb-1 font-display uppercase tracking-wider text-[10px]">
                              💡 Explanation (বিশ্লেষণ)
                            </strong>
                            {q.explanation}
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
      )}

      {/* STATE 1.5: ACTIVE UNLIMITED CONTINUOUS PRACTICE GAMEPLAY */}
      {gameState === "unlimited" && unlimitedQuestions.length > 0 && (
        <div className="flex flex-col gap-6 p-6 font-mono max-w-4xl mx-auto animate-fadeIn">
          
          {/* HUD DISPLAY BAR */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-[#0D0D0D] border border-white/10 rounded-2xl text-xs font-bold uppercase">
            <div className="flex items-center gap-2">
              <span className="text-gray-450 text-[10px]">
                {language === "bn" ? "প্র্যাকটিস মোড" : "PRACTICE MODE"}:
              </span>
              <span className="bg-red-950/40 text-red-500 border border-red-500/25 px-2 py-0.5 rounded font-black text-[9px]">
                Endless Continuous
              </span>
              <span className="text-white text-xs">
                #{unlimitedIndex + 1}
              </span>
            </div>

            {/* Streak & Score Tracker */}
            <div className="flex items-center gap-4">
              {unlimitedStreak > 0 && (
                <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 px-2.5 py-1 rounded-xl animate-bounce">
                  <span>🔥</span>
                  <span>{unlimitedStreak} {language === "bn" ? "স্ট্রিক" : "Streak"}</span>
                </div>
              )}
              <div className="text-white text-xs shrink-0">
                {language === "bn" ? "সঠিক:" : "Correct:"} <span className="text-emerald-400 text-sm font-extrabold">{unlimitedCorrect}</span> / <span className="text-gray-400">{unlimitedTotal}</span>
              </div>
            </div>

            {/* Live Session Rewards */}
            <div className="flex items-center gap-3 bg-white/[0.02] border border-white/5 px-3 py-1.5 rounded-xl text-[11px]">
              <div className="flex items-center gap-1 text-yellow-500 font-extrabold">
                <span>🪙</span>
                <span>+{unlimitedCoinsEarned}</span>
              </div>
              <div className="flex items-center gap-1 text-emerald-400 font-extrabold">
                <span>⚡</span>
                <span>+{unlimitedXpEarned} XP</span>
              </div>
            </div>
          </div>

          {/* QUESTION CARD */}
          {unlimitedQuestions[unlimitedIndex] && (
            <div className={`p-6 md:p-8 rounded-2xl border transition-all duration-300 ${
              isDark ? "bg-[#111111] border-white/10" : "bg-white border-red-100 shadow-md"
            }`}>
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-[#C1121F]/10 border border-[#C1121F]/20 text-[#C1121F] rounded text-[9px] uppercase font-bold">
                    {unlimitedQuestions[unlimitedIndex].subject}
                  </span>
                  <span className="px-2 py-0.5 bg-gray-900 border border-white/5 rounded text-[9px] text-gray-400">
                    {unlimitedQuestions[unlimitedIndex].chapter}
                  </span>
                </div>

                {/* Bookmark Toggle */}
                {user?.uid && (
                  <button
                    onClick={() => toggleBookmark(unlimitedQuestions[unlimitedIndex].id)}
                    className={`p-2 rounded-xl border flex items-center justify-center cursor-pointer transition-all duration-300 relative overflow-visible ${
                      bookmarkedIds.includes(unlimitedQuestions[unlimitedIndex].id)
                        ? "bg-yellow-500/15 border-yellow-500/50 text-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.25)]"
                        : "bg-black/40 border-white/5 text-gray-400 hover:text-white hover:border-white/10"
                    } ${
                      justBookmarkedId === unlimitedQuestions[unlimitedIndex].id
                        ? "scale-125 border-yellow-400 bg-yellow-500/30 text-yellow-300 shadow-[0_0_25px_rgba(255,215,0,0.6)] ring-2 ring-yellow-400/30"
                        : ""
                    }`}
                    title={language === "bn" ? "বুকমার্ক করুন" : "Bookmark Question"}
                  >
                    <div className="relative flex items-center justify-center">
                      <Bookmark 
                        className={`w-3.5 h-3.5 transition-all duration-300 ${
                          bookmarkedIds.includes(unlimitedQuestions[unlimitedIndex].id) ? "fill-yellow-500" : ""
                        } ${
                          justBookmarkedId === unlimitedQuestions[unlimitedIndex].id ? "scale-125 text-yellow-300" : ""
                        }`} 
                      />
                      {justBookmarkedId === unlimitedQuestions[unlimitedIndex].id && (
                        <Bookmark 
                          className="w-3.5 h-3.5 absolute fill-yellow-400 text-yellow-400 animate-ping opacity-80" 
                        />
                      )}
                    </div>
                  </button>
                )}
              </div>

              {/* Question Text */}
              <h2 className={`text-sm md:text-base font-extrabold mb-8 leading-relaxed font-sans ${isDark ? "text-white" : "text-slate-800"}`}>
                {unlimitedQuestions[unlimitedIndex].questionText}
              </h2>

              {/* Options list */}
              <div className="grid md:grid-cols-2 gap-3 mb-6">
                {unlimitedQuestions[unlimitedIndex].options.map((option, idx) => {
                  const isCorrect = idx === unlimitedQuestions[unlimitedIndex].correctAnswerIndex;
                  const isSelected = idx === unlimitedSelectedAnswer;
                  
                  let btnStyle = isDark 
                    ? "bg-black/40 border-white/5 hover:border-white/15 text-gray-300"
                    : "bg-stone-50 border-stone-200 hover:bg-stone-100 text-slate-800 shadow-sm";

                  if (unlimitedAnswered) {
                    if (isCorrect) {
                      btnStyle = "bg-emerald-950/30 border-emerald-500 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]";
                    } else if (isSelected) {
                      btnStyle = "bg-red-950/30 border-[#C1121F] text-red-300";
                    } else {
                      btnStyle = isDark 
                        ? "bg-black/20 border-white/[0.02] text-gray-600 opacity-40 cursor-default"
                        : "bg-stone-50/50 border-stone-100 text-stone-400 opacity-50 cursor-default";
                    }
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleUnlimitedAnswerClick(idx)}
                      disabled={unlimitedAnswered}
                      className={`p-4 rounded-xl border text-left text-xs transition-all duration-200 flex items-center gap-3 group relative cursor-pointer ${btnStyle}`}
                    >
                      <div className={`w-6 h-6 rounded-lg text-[10px] font-bold flex items-center justify-center border transition shrink-0 ${
                        unlimitedAnswered && isCorrect
                          ? "bg-emerald-500 border-emerald-400 text-black font-black"
                          : unlimitedAnswered && isSelected
                          ? "bg-[#C1121F] border-red-500 text-white"
                          : isDark
                          ? "bg-black/60 border-white/10 text-gray-500 group-hover:border-white/20 group-hover:text-white"
                          : "bg-white border-stone-300 text-stone-600 group-hover:border-stone-400"
                      }`}>
                        {String.fromCharCode(65 + idx)}
                      </div>
                      <span className="flex-1 select-none font-bold">{option}</span>
                    </button>
                  );
                })}
              </div>

              {/* EXPLANATION AND REWARD COMPONENT (INSTANT SHOW POST-ANSWER) */}
              {unlimitedAnswered && (
                <div className="space-y-4 animate-scaleUp">
                  {/* Correct vs Incorrect notification banner */}
                  {unlimitedSelectedAnswer === unlimitedQuestions[unlimitedIndex].correctAnswerIndex ? (
                    <div className="p-3 bg-emerald-950/15 border border-emerald-500/20 text-emerald-300 rounded-xl flex items-center gap-2 text-xs">
                      <span className="text-base">🎉</span>
                      <div>
                        <strong className="uppercase mr-1.5 text-emerald-400">{language === "bn" ? "সঠিক উত্তর!" : "CORRECT!"}</strong>
                        <span>+{language === "bn" ? "১৫ XP এবং +৫ গোল্ড কয়েন যোগ করা হয়েছে।" : "15 XP & 5 Gold Coins credited."}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-red-950/15 border border-red-500/20 text-red-300 rounded-xl flex items-center gap-2 text-xs">
                      <span className="text-base">❌</span>
                      <div>
                        <strong className="uppercase mr-1.5 text-[#C1121F]">{language === "bn" ? "ভুল উত্তর!" : "INCORRECT!"}</strong>
                        <span>
                          {language === "bn" 
                            ? `সঠিক উত্তরটি হলো অপশন (${String.fromCharCode(65 + unlimitedQuestions[unlimitedIndex].correctAnswerIndex)}): `
                            : `The correct answer is Option (${String.fromCharCode(65 + unlimitedQuestions[unlimitedIndex].correctAnswerIndex)}): `}
                          <strong className="text-white">
                            {unlimitedQuestions[unlimitedIndex].options[unlimitedQuestions[unlimitedIndex].correctAnswerIndex]}
                          </strong>
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Explanation container */}
                  <div className="p-4 bg-black/40 border border-white/5 rounded-xl space-y-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block border-b border-white/5 pb-1">
                      💡 {language === "bn" ? "বিশ্লেষণ ও অতিরিক্ত তথ্য" : "EXPLANATION & ANALYSIS"}:
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      {unlimitedQuestions[unlimitedIndex].explanation || (language === "bn" ? "এই প্রশ্নের জন্য কোনো অতিরিক্ত ব্যাখ্যা দেওয়া নেই।" : "No detailed explanation currently seeded.")}
                    </p>
                    {unlimitedQuestions[unlimitedIndex].source && (
                      <div className="text-[10px] font-mono text-gray-500 mt-2">
                        {language === "bn" ? "তথ্যসূত্র: " : "Reference Source: "}{unlimitedQuestions[unlimitedIndex].source}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ACTION BUTTONS FOOTER */}
          <div className="flex gap-4">
            <button
              onClick={handleFinishUnlimitedPractice}
              className="px-5 py-3 border border-white/10 hover:border-white hover:bg-white/5 text-white font-bold uppercase text-xs tracking-wider rounded-xl transition duration-200 font-display cursor-pointer"
            >
              ← {language === "bn" ? "প্র্যাকটিস শেষ করুন" : "END SESSION"}
            </button>
            <div className="flex-1"></div>
            <button
              onClick={handleUnlimitedNext}
              className="px-8 py-3 bg-[#C1121F] hover:bg-red-750 text-white font-black uppercase text-xs tracking-wider rounded-xl transition duration-200 border-b-2 border-red-950 font-display cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>{unlimitedAnswered ? (language === "bn" ? "পরবর্তী প্রশ্ন →" : "NEXT QUESTION →") : (language === "bn" ? "এড়িয়ে যান" : "SKIP CONFLICT")}</span>
            </button>
          </div>
        </div>
      )}

      {/* STATE 2: ACTIVE MCQ COMBAT GAMEPLAY */}
      {gameState === "combating" && activeQuestions.length > 0 && (
        <div className="flex flex-col gap-6 font-mono p-6">
          
          {/* COMBAT HUD DISPLAY BAR */}
          <div className="flex bg-[#0D0D0D] border border-white/10 p-4 rounded-2xl justify-between items-center flex-wrap gap-4 text-xs font-bold uppercase relative">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 font-bold uppercase text-[10px]">
                {challengeRivalProfile ? (language === "bn" ? "ডুয়েল ধাপ" : "DUEL STAGE") : (language === "bn" ? "ক্যাম্পেইন ধাপ" : "TRIAL STAGE")}:
              </span>
              <span className="text-white text-sm font-display">{currentIndex + 1} / {activeQuestions.length} MCQs</span>
            </div>

            {/* Head-to-Head Challenge info */}
            {challengeRivalProfile && (
              <div className="flex items-center gap-2 bg-red-950/20 border border-red-500/20 rounded-xl px-3 py-1 shrink-0">
                <img
                  src={challengeRivalProfile.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${challengeRivalProfile.uid}`}
                  alt="Rival"
                  className="w-5 h-5 rounded-full border border-[#C1121F] bg-black shrink-0"
                />
                <span className="text-[10px] text-red-400 font-black tracking-normal">
                  VS {challengeRivalProfile.displayName}
                </span>
              </div>
            )}

            {/* Boss HP Bar if active */}
            {activeTab === "anushiloni" && anushiloniMode === "boss" ? (
              <div className="flex items-center gap-3">
                <span className="text-sm">👹</span>
                <div className="flex flex-col">
                  <span className="text-[9px] text-[#C1121F] font-black tracking-wider uppercase mb-0.5">{bossName}</span>
                  <div className="w-36 bg-black h-2.5 rounded-full overflow-hidden border border-white/10 flex">
                    <div
                      className="bg-red-650 h-full transition-all duration-300 shadow-[0_0_10px_rgba(193,18,31,0.5)]"
                      style={{ width: `${bossHp}%` }}
                    ></div>
                  </div>
                </div>
                <span className="text-[#C1121F] font-black">{bossHp} HP</span>
              </div>
            ) : isSurvivalMode ? (
              <div className="flex items-center gap-2.5">
                <Heart className="w-4 h-4 text-red-500 fill-red-500 animate-pulse" />
                <div className="w-24 bg-[#0A0A0A] h-2.5 rounded-full overflow-hidden border border-white/5 flex-1">
                  <div
                    className="bg-red-600 h-full transition-all duration-300"
                    style={{ width: `${trialHp}%` }}
                  ></div>
                </div>
                <span className="text-white text-xs">{trialHp} HP</span>
              </div>
            ) : (
              <span className="text-xs text-emerald-400 font-bold font-display uppercase">
                {language === "bn" ? "প্রস্তুতি ট্রেনিং জোন" : "Standard Training Zone"}
              </span>
            )}

            {/* Timers */}
            {anushiloniMode === "mock" && (
              <div className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 px-3 py-1 rounded-xl">
                <Clock className="w-4 h-4 text-yellow-500" />
                <span>{mockTimeLeft}s {language === "bn" ? "বাকী" : "LEFT"}</span>
              </div>
            )}

            {isSurvivalMode && !answered && (
              <div className="flex items-center gap-1 bg-[#C1121F]/10 border border-[#C1121F]/30 text-[#C1121F] px-2.5 py-1 rounded-xl">
                <Timer className="w-3.5 h-3.5 animate-spin" />
                <span>{secondsLeft}s LOCK</span>
              </div>
            )}
          </div>

          {/* Bengali Question Details Block */}
          <div className="bg-[#0D0D0D] border border-white/5 p-5 rounded-2xl shadow-inner relative">
            <div className="flex items-center justify-between gap-4 mb-2">
              <div className="flex items-center gap-2 text-[10px] font-bold text-[#FFD700] uppercase">
                <span>{activeQuestions[currentIndex].subject} • </span>
                <span>{activeQuestions[currentIndex].chapter}</span>
                {activeQuestions[currentIndex].source && (
                  <>
                    <span>•</span>
                    <span className="text-gray-400">{activeQuestions[currentIndex].source}</span>
                  </>
                )}
              </div>

              {/* Bookmark Toggle Button */}
              {user?.uid && (
                <button
                  onClick={() => toggleBookmark(activeQuestions[currentIndex].id)}
                  className={`p-2 rounded-xl border flex items-center justify-center cursor-pointer transition-all duration-300 relative overflow-visible ${
                    bookmarkedIds.includes(activeQuestions[currentIndex].id)
                      ? "bg-yellow-500/15 border-yellow-500/50 text-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.25)]"
                      : "bg-black/40 border-white/5 text-gray-400 hover:text-white hover:border-white/10"
                  } ${
                    justBookmarkedId === activeQuestions[currentIndex].id
                      ? "scale-125 border-yellow-400 bg-yellow-500/30 text-yellow-300 shadow-[0_0_25px_rgba(255,215,0,0.6)] ring-2 ring-yellow-400/30"
                      : ""
                  }`}
                  title={language === "bn" ? "বুকমার্ক করুন" : "Bookmark Question"}
                >
                  <div className="relative flex items-center justify-center">
                    <Bookmark 
                      className={`w-3.5 h-3.5 transition-all duration-300 ${
                        bookmarkedIds.includes(activeQuestions[currentIndex].id) ? "fill-yellow-500" : ""
                      } ${
                        justBookmarkedId === activeQuestions[currentIndex].id ? "scale-125 text-yellow-300" : ""
                      }`} 
                    />
                    {justBookmarkedId === activeQuestions[currentIndex].id && (
                      <Bookmark 
                        className="w-3.5 h-3.5 absolute fill-yellow-400 text-yellow-400 animate-ping opacity-80" 
                      />
                    )}
                  </div>
                </button>
              )}
            </div>

            <h3 className="text-md md:text-lg font-bold text-white leading-relaxed font-sans pr-8">
              {activeQuestions[currentIndex].questionText}
            </h3>
          </div>

          {/* Options grid (all options must remain raw Bengali/Bilingual) */}
          <div className="grid md:grid-cols-2 gap-3 leading-relaxed font-sans mt-2">
            {activeQuestions[currentIndex].options.map((opt, oIdx) => {
              const isSelected = selectedAnswer === oIdx;
              const isCorrectAnswer = oIdx === activeQuestions[currentIndex].correctAnswerIndex;

              let btnBorder = "border-white/5";
              let btnBg = "bg-[#0D0D0D] hover:bg-white/5";
              let optBadge = oIdx === 0 ? "A" : oIdx === 1 ? "B" : oIdx === 2 ? "C" : "D";

              if (answered) {
                if (isCorrectAnswer) {
                  btnBorder = "border-emerald-500/80";
                  btnBg = "bg-emerald-950/20 text-emerald-300 font-bold shadow-[0_0_12px_rgba(16,185,129,0.15)]";
                } else if (isSelected) {
                  btnBorder = "border-[#C1121F]/80";
                  btnBg = "bg-red-950/20 text-red-300 font-bold";
                } else {
                  btnBorder = "border-transparent";
                  btnBg = "bg-[#0D0D0D]/40 text-gray-400 opacity-60";
                }
              } else if (isSelected) {
                btnBorder = "border-[#FFD700]";
                btnBg = "bg-yellow-950/10 text-white font-bold";
              }

              return (
                <button
                  key={oIdx}
                  onClick={() => handleSelectOption(oIdx)}
                  disabled={answered}
                  className={`w-full text-left p-3.5 border-2 rounded-xl transition-all duration-200 flex items-center justify-between text-sm cursor-pointer ${btnBg} ${btnBorder}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-[#0A0A0A] border border-white/10 flex items-center justify-center font-bold text-[11px] text-[#FFD700] font-mono shrink-0">
                      {optBadge}
                    </span>
                    <span className="block text-gray-200 text-xs md:text-sm font-medium">{opt}</span>
                  </div>
                  {answered && isCorrectAnswer && <CheckCircle className="w-4.5 h-4.5 text-emerald-400 shrink-0" />}
                  {answered && isSelected && !isCorrectAnswer && <XCircle className="w-4.5 h-4.5 text-[#C1121F] shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Action Confirmation & explanations */}
          <div className="mt-4 border-t border-white/5 pt-4 flex flex-col gap-4 font-sans">
            {!answered ? (
              <button
                onClick={() => handleConfirmAnswer()}
                disabled={selectedAnswer === null}
                className="w-full py-4 bg-[#C1121F] hover:bg-red-750 disabled:opacity-40 text-white font-extrabold uppercase text-xs tracking-wider rounded-xl transition font-display cursor-pointer"
                id="btn-practice-confirm"
              >
                {language === "bn" ? "উত্তর সাবমিট করুন (CONFIRM DEPLOY)" : "CONFIRM DEPLOY"}
              </button>
            ) : (
              <div className="flex flex-col gap-4 animate-fadeIn">
                {/* Visual Medical Explanation Block */}
                <div className="bg-[#0D0D0D] border border-white/10 p-5 rounded-2xl leading-relaxed">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#FFD700] uppercase mb-2">
                    <BookOpen className="w-3.5 h-3.5" /> 
                    {language === "bn" ? "অ্যাডমিশন প্রশ্নের ব্যাখ্যা বিশ্লেষণ" : "CLINICAL CONCORDANCE REFERENCE"}
                  </div>
                  <p className="text-gray-300 text-xs md:text-sm">
                    {activeQuestions[currentIndex].explanation || "No textbook annotation documented. This is a standard high-yield medical admission test fact."}
                  </p>
                </div>

                <button
                  onClick={handleNextQuestion}
                  className="w-full py-4 bg-[#0D0D0D] border border-white/10 hover:border-white text-white font-extrabold uppercase text-xs tracking-wider rounded-xl transition duration-300 font-display cursor-pointer"
                  id="btn-practice-next"
                >
                  {currentIndex + 1 === activeQuestions.length 
                    ? (language === "bn" ? "ফলাফল ও ট্রফি চেক করুন" : "SUMMARIZE TRIALS OUTCOME") 
                    : (language === "bn" ? "পরবর্তী প্রশ্নের প্রস্থান →" : "ADVANCE STAGE →")}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STATE 3: GAME RESULTS COMPILATION */}
      {gameState === "results" && (
        <div className="flex flex-col items-center justify-center text-center p-8 gap-5 max-w-sm mx-auto animate-fadeIn">
          <div className="w-16 h-16 rounded-full bg-yellow-950/20 border-2 border-[#FFD700] flex items-center justify-center text-3xl animate-bounce shadow-[0_0_20px_rgba(255,215,0,0.3)]">
            🏆
          </div>

          <div className="flex flex-col gap-1.5">
            <h2 className="text-2xl font-black uppercase text-white tracking-wide font-display">
              {language === "bn" ? "ক্যাম্পেইন সফল" : "VICTORY RETRIEVED"}
            </h2>
            <p className="text-xs text-[#FFD700] font-mono tracking-widest font-bold uppercase">
              {language === "bn" ? "ভর্তি প্রস্তুতি স্পিলস সংকলিত" : "trial reports compiled"}
            </p>
          </div>

          <div className="w-full bg-[#0D0D0D] border border-white/5 rounded-2xl p-5 font-mono text-xs flex flex-col gap-2 shadow-inner">
            <div className="flex justify-between items-center text-gray-400 border-b border-white/5 pb-1.5">
              <span>{language === "bn" ? "মোট কুইজ সমাধান" : "MCQs Solved"}:</span>
              <span className="font-bold text-white">{activeQuestions.length} Questions</span>
            </div>
            <div className="flex justify-between items-center text-gray-400 border-b border-white/5 pb-1.5">
              <span>{language === "bn" ? "সঠিক উত্তর" : "Correct Drills"}:</span>
              <span className="font-bold text-white text-sm">{correctCountInTrial} / {activeQuestions.length}</span>
            </div>
            {combatRankPoints > 0 && (
              <div className="flex justify-between items-center text-purple-400 bg-purple-950/25 py-2 px-3 rounded-xl border border-purple-900/30">
                <span className="font-bold uppercase">{language === "bn" ? "র্যাংক পয়েন্ট" : "Rank Points"} :</span>
                <span className="font-bold">+{combatRankPoints} RP</span>
              </div>
            )}
            <div className="flex justify-between items-center text-[#FFD700] bg-[#FFD700]/10 py-2 px-3 rounded-xl border border-[#FFD700]/20">
              <span className="font-extrabold">{language === "bn" ? "অর্জিত গোল্ড কয়েন" : "GOLD COINS SECURED"}:</span>
              <span className="font-bold">+{combatCoinsEarned} Coins</span>
            </div>
            <div className="flex justify-between items-center text-emerald-400 bg-emerald-950/25 py-2 px-3 rounded-xl border border-emerald-900/30">
              <span className="font-bold uppercase">{language === "bn" ? "অর্জিত টেস্টিং এক্সপি" : "Tactical XP Gained"}:</span>
              <span className="font-bold">+{combatXpEarned} XP</span>
            </div>
          </div>

          <button
            onClick={() => setGameState("select")}
            className="w-full text-center py-4 bg-[#C1121F] hover:bg-red-750 text-white font-extrabold uppercase text-xs tracking-wider rounded-xl transition-all duration-300 font-display cursor-pointer"
            id="btn-practice-results-dismiss"
          >
            ← {language === "bn" ? "ড্যাশবোর্ড ডেস্কে ফিরে যান" : "COMPLETE MISSION"}
          </button>
        </div>
      )}

      {/* STATE 4: PLAYERS FAILS */}
      {gameState === "failed" && (
        <div className="flex flex-col items-center justify-center text-center p-8 gap-5 max-w-sm mx-auto animate-fadeIn">
          <div className="w-16 h-16 rounded-full bg-[#C1121F]/15 border-2 border-[#C1121F] flex items-center justify-center text-3xl animate-pulse shadow-[0_0_20px_rgba(193,18,31,0.3)]">
            💀
          </div>

          <div className="flex flex-col gap-1.5">
            <h2 className="text-2xl font-black uppercase text-white tracking-wide font-display">
              {language === "bn" ? "মিশন ব্যর্থ" : "PLAYER ELIMINATED"}
            </h2>
            <p className="text-xs text-[#C1121F] font-mono tracking-widest font-bold uppercase">
              {language === "bn" ? "ভুল উত্তরের মাত্রা অতিক্রম করেছে" : "critical mistake threshold crossed"}
            </p>
          </div>

          <p className="text-gray-400 text-xs text-center leading-relaxed">
            {language === "bn" 
              ? "মক টেস্ট বা বস ব্যাটলে আপনার স্বাস্থ্য ১০০% থেকে কমে শূন্যে নেমে গিয়েছে। সঠিক রিভিশন ও বইয়ের অনুশীলন নিয়ে আবার চেষ্টা করুন।" 
              : "Your limited 100 HP health pool reached 0. Survival drills require extreme clinical precision under speed tension."}
          </p>

          <div className="flex gap-3 w-full">
            <button
              onClick={() => setGameState("select")}
              className="flex-1 text-center py-3.5 border border-white/10 hover:border-white hover:bg-white/5 text-white font-bold uppercase text-xs tracking-wider rounded-xl transition-all duration-350 font-display cursor-pointer"
              id="btn-practice-fail-dismiss"
            >
              ← {language === "bn" ? "উপেক্ষা করুন" : "GIVE UP"}
            </button>
            <button
              onClick={() => {
                if (activeTab === "anushiloni") {
                  handleStartAnushiloni();
                } else {
                  handleStartPractice();
                }
              }}
              className="flex-1 text-center py-3.5 bg-[#C1121F] hover:bg-red-750 text-white font-black uppercase text-xs tracking-wider rounded-xl transition-all duration-350 flex items-center justify-center gap-1.5 font-display cursor-pointer"
              id="btn-practice-fail-retry"
            >
              <RotateCcw className="w-3.5 h-3.5" /> 
              {language === "bn" ? "পুনরায় যুদ্ধ" : "RE-ENGAGE"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Custom Helper Icons to replace standard components cleanly
function RocketLaunchIcon() {
  return (
    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2.25c-.34 0-.67.14-.91.38L4.31 9.4c-.6.6-.74 1.5-.35 2.26l1.98 3.86-1.57 2.35c-.41.62-.23 1.45.39 1.86.19.13.41.2.64.2h1.61c.42 0 .82-.18 1.1-.5l1.63-1.9 3.01.6c.26.05.52.05.78-.01l6.11-6.11c.71-.71.84-1.8.31-2.65-.92-1.48-2.63-4.14-5.32-6.5-.27-.24-.62-.38-.98-.38zm0 2.25c1.99 1.83 3.48 4.02 4.22 5.23L12 13.95l-4.22-4.22c.74-1.21 2.23-3.4 4.22-5.23zm.18 11.23l-1.57 1.83H8.39l1.45-2.18.34.07 10.63-10.63H20.8l-8.62 10.91z" />
    </svg>
  );
}
