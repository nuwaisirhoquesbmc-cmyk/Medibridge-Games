import React, { useState, useEffect } from "react";
import { db, auth, handleFirestoreError, OperationType, isFirestoreQuotaExceeded, setFirestoreQuotaExhausted, isQuotaExceededError } from "./firebase";
import { supabase } from "./lib/supabase";
import { fetchSupabaseProfile, mapSupabaseToUserProfile } from "./lib/authProfile";
import { 
  getCoursesFromSupabase, 
  getBatchesFromSupabase, 
  getUserEnrollmentsFromSupabase, 
  getNoticesFromSupabase, 
  updateProfileInSupabase,
  syncClassToSupabase,
  deleteClassFromSupabase,
  syncMaterialToSupabase,
  deleteMaterialFromSupabase,
  syncAnnouncementToSupabase,
  deleteAnnouncementFromSupabase,
  syncExamToSupabase,
  deleteExamFromSupabase,
  syncCourseToSupabase,
  syncBatchToSupabase,
  syncNoticeToSupabase
} from "./lib/supabaseData";
import { 
  getMigratedQuestions, 
  getMigratedCourses, 
  getMigratedBatches, 
  getMigratedNotices, 
  getMigratedSetting 
} from "./lib/migratedDataStore";
import { doc, getDoc, getDocs, onSnapshot, collection, query, orderBy, limit, setDoc, serverTimestamp, where, updateDoc, deleteDoc } from "firebase/firestore";
import { UserProfile, Question, AdminNotice, CHARACTERS } from "./types";

// Recursively strips undefined values so Firestore never throws unsupported field value error
function cleanDataForFirestore<T>(data: T): T {
  if (data === undefined) {
    return undefined as unknown as T;
  }
  if (data === null) {
    return null as unknown as T;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => cleanDataForFirestore(item)) as unknown as T;
  }
  if (typeof data === "object" && !(data instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const key of Object.keys(data as Record<string, any>)) {
      const val = (data as Record<string, any>)[key];
      if (val !== undefined) {
        cleaned[key] = cleanDataForFirestore(val);
      }
    }
    return cleaned as T;
  }
  return data;
}
import { STARTER_QUESTIONS } from "./questionsData";
import { motion, AnimatePresence } from "motion/react";

// Components
import LandingPage from "./components/LandingPage";
import LoginPage from "./components/LoginPage";
import PracticePanel from "./components/PracticePanel";
import SocialFeed from "./components/SocialFeed";
import LeaderboardPanel from "./components/LeaderboardPanel";
import AIMentor from "./components/AIMentor";
import CommandCenter from "./components/CommandCenter";
import AdminPanel from "./components/AdminPanel";
import DailyMissions from "./components/DailyMissions";
import QuestionAnalytics from "./components/QuestionAnalytics";
import MediBridgeLogo from "./components/MediBridgeLogo";
import RankBadge from "./components/RankBadge";
import PremiumModal from "./components/PremiumModal";
import EditProfileModal from "./components/EditProfileModal";
import GkSection from "./components/GkSection";
import MatEnglish from "./components/MatEnglish";
import PomodoroTimer from "./components/PomodoroTimer";
import BattleReplayModal from "./components/BattleReplayModal";
import GlobalSearch from "./components/GlobalSearch";
import PreparationRoadmap from "./components/PreparationRoadmap";
import DashboardOverview from "./components/DashboardOverview";
import SubscriptionPayment from "./components/SubscriptionPayment";
import ExamBatchStore from "./components/ExamBatchStore";
import NoticePopup from "./components/NoticePopup";
import AdDisplayManager from "./components/AdDisplayManager";
import ReviewMistakesPanel from "./components/ReviewMistakesPanel";
import NotificationBell from "./components/notifications/NotificationBell";

// Course Selling & Learning System Components
import CourseStore from "./components/courses/CourseStore";
import CourseDetailsView from "./components/courses/CourseDetailsView";
import CourseCheckoutView from "./components/courses/CourseCheckoutView";
import MyCoursesView from "./components/courses/MyCoursesView";
import CourseDashboardView from "./components/courses/CourseDashboardView";
import TeacherDashboardView from "./components/courses/TeacherDashboardView";
import OurHeroesSection from "./components/courses/OurHeroesSection";
import GamingArenaHub from "./components/gaming/GamingArenaHub";
import {
  Course,
  Batch,
  CourseClass,
  CourseMaterial,
  CourseAnnouncement,
  CourseExam,
  CourseExamAttempt,
  CourseEnrollment,
  CourseMistake
} from "./types/courseTypes";
import {
  MOCK_COURSES,
  MOCK_BATCHES,
  MOCK_CLASSES,
  MOCK_MATERIALS,
  MOCK_ANNOUNCEMENTS,
  MOCK_EXAMS,
  MOCK_ENROLLMENTS,
  MOCK_MISTAKES
} from "./data/coursesData";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer } from "recharts";

import { TRANSLATIONS } from "./translations";
import { playSound } from "./audio";

import {
  User,
  Shield,
  Award,
  Zap,
  Flame,
  MessageSquare,
  Trophy,
  Bot,
  Settings,
  Bell,
  LogOut,
  ChevronRight,
  Menu,
  X,
  Target,
  Skull,
  Wifi,
  WifiOff,
  Loader2,
  Lock,
  Unlock,
  Camera,
  Swords,
  Pin,
  BookOpen,
  Map as MapIcon,
  TrendingUp,
  BarChart3,
  Book,
  MoreHorizontal,
  Brain,
  Rocket,
  CreditCard,
  Gamepad2,
  LogIn,
  Share2,
  ArrowLeft,
} from "lucide-react";

type ActiveTab = 
  | "dashboard" 
  | "practice" 
  | "social" 
  | "leaderboard" 
  | "mentor" 
  | "admin" 
  | "gk" 
  | "english" 
  | "analytics" 
  | "anushiloni" 
  | "mistakes" 
  | "subscription_payment" 
  | "exambatch"
  | "courses"
  | "course_details"
  | "course_checkout"
  | "my_courses"
  | "course_dashboard"
  | "teacher_dashboard"
  | "gaming"
  | "heroes";

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [oauthErrorParam, setOauthErrorParam] = useState<string | null>(() => {
    try {
      if (typeof window !== "undefined") {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const searchParams = new URLSearchParams(window.location.search);
        const errDesc = hashParams.get("error_description") || searchParams.get("error_description");
        const errCode = hashParams.get("error") || searchParams.get("error");
        if (errDesc || errCode) {
          return decodeURIComponent(errDesc || errCode || "OAuth authentication failed.");
        }
      }
    } catch (e) {}
    return null;
  });
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [dashSubTab, setDashSubTab] = useState<"overview" | "roadmap">("overview");
  const [adminSubView, setAdminSubView] = useState<"command" | "faculty" | "panel">("command");

  // Course System Active States with Local Storage Backup & Cache-Busting Version Check
  const [coursesList, setCoursesList] = useState<Course[]>(() => {
    const MEDIBRIDGE_CACHE_VER = "medibridge_v8_nodemo";
    try {
      if (typeof window !== "undefined") {
        const storedVer = localStorage.getItem("medibridge_cache_version");
        if (storedVer !== MEDIBRIDGE_CACHE_VER) {
          localStorage.removeItem("medibridge_courses_cache");
          localStorage.removeItem("medibridge_batches_cache");
          localStorage.setItem("medibridge_cache_version", MEDIBRIDGE_CACHE_VER);
        } else {
          const cached = localStorage.getItem("medibridge_courses_cache");
          if (cached) {
            const parsed: Course[] = JSON.parse(cached);
            return parsed.map((c) => ({
              ...c,
              demoClasses: [],
              demoVideoUrl: "",
              demoVideoTitle: "",
              demoPdfUrl: "",
              demoClassEnabled: false
            }));
          }
        }
      }
    } catch (e) {}
    return MOCK_COURSES.map((c) => ({
      ...c,
      demoClasses: [],
      demoVideoUrl: "",
      demoVideoTitle: "",
      demoPdfUrl: "",
      demoClassEnabled: false
    }));
  });
  const [batchesList, setBatchesList] = useState<Batch[]>(() => {
    try {
      const cached = localStorage.getItem("medibridge_batches_cache");
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return MOCK_BATCHES;
  });
  const [classesList, setClassesList] = useState<CourseClass[]>(MOCK_CLASSES);
  const [materialsList, setMaterialsList] = useState<CourseMaterial[]>(MOCK_MATERIALS);
  const [announcementsList, setAnnouncementsList] = useState<CourseAnnouncement[]>(MOCK_ANNOUNCEMENTS);
  const [examsList, setExamsList] = useState<CourseExam[]>(MOCK_EXAMS);
  const [enrollmentsList, setEnrollmentsList] = useState<CourseEnrollment[]>(MOCK_ENROLLMENTS);
  const [mistakesList, setMistakesList] = useState<CourseMistake[]>(MOCK_MISTAKES);

  const [selectedCourse, setSelectedCourse] = useState<Course | null>(MOCK_COURSES[0]);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(MOCK_BATCHES[0]);
  const [learningEnrollment, setLearningEnrollment] = useState<CourseEnrollment | null>(MOCK_ENROLLMENTS[0]);
  const [pendingEnroll, setPendingEnroll] = useState<{ course: Course; batchId?: string } | null>(null);
  const [language, setLanguageState] = useState<"bn" | "en">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("medi_language");
      if (saved === "en" || saved === "bn") return saved;
    }
    return "bn";
  });

  const setLanguage = (value: "bn" | "en" | ((prev: "bn" | "en") => "bn" | "en")) => {
    if (typeof value === "function") {
      setLanguageState((prev) => {
        const next = value(prev);
        localStorage.setItem("medi_language", next);
        return next;
      });
    } else {
      setLanguageState(value);
      localStorage.setItem("medi_language", value);
    }
  };
  const [syncState, setSyncState] = useState<"synced" | "syncing" | "offline">("synced");
  const [showSyncedBriefly, setShowSyncedBriefly] = useState(false);
  const [rivalProfile, setRivalProfile] = useState<UserProfile | null>(null);
  const [activeChallengeRival, setActiveChallengeRival] = useState<UserProfile | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [battleLogs, setBattleLogs] = useState<any[]>([]);
  const [selectedReplayBattle, setSelectedReplayBattle] = useState<any | null>(null);
  const [activeNotifications, setActiveNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!user?.uid) {
      setBattleLogs([]);
      return;
    }
    const loadLogs = () => {
      const logsKey = `medibridge_battle_logs_${user.uid}`;
      const saved = localStorage.getItem(logsKey);
      if (saved) {
        try {
          setBattleLogs(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to parse battle logs", e);
        }
      } else {
        setBattleLogs([]);
      }
    };

    loadLogs();
    window.addEventListener("medibridge_battle_logs_changed", loadLogs);
    return () => {
      window.removeEventListener("medibridge_battle_logs_changed", loadLogs);
    };
  }, [user?.uid]);

  // Listen to unread user notifications in real-time (bounded toast alerts)
  useEffect(() => {
    if (!user?.uid || isFirestoreQuotaExceeded()) {
      setActiveNotifications([]);
      return;
    }
    const qNotifications = query(
      collection(db, "user_notifications"),
      where("userId", "==", user.uid),
      where("read", "==", false),
      limit(5)
    );
    let unsubscribe = () => {};
    try {
      unsubscribe = onSnapshot(
        qNotifications,
        (snapshot) => {
          const loaded: any[] = [];
          snapshot.forEach((doc) => {
            loaded.push({ id: doc.id, ...doc.data() });
          });
          // Sort client-side by createdAt desc to avoid composite index requirement
          loaded.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
          });
          setActiveNotifications(loaded);
        },
        (error) => {
          if (isQuotaExceededError(error)) {
            setFirestoreQuotaExhausted();
          }
          console.warn("Failed to stream user notifications:", error.message);
        }
      );
    } catch (err) {
      if (isQuotaExceededError(err)) {
        setFirestoreQuotaExhausted();
      }
    }
    return () => unsubscribe();
  }, [user?.uid]);

  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("mb_theme");
      if (saved === "dark" || saved === "light") return saved;
    }
    return "dark";
  });

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("mb_theme", nextTheme);
  };

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  // Stream user's enrolled courses from Supabase with instant local cache
  useEffect(() => {
    if (!user?.uid) return;
    let isCancelled = false;

    // 1. Load locally cached enrollments first for instant zero-latency UI
    try {
      const cached = localStorage.getItem(`medibridge_enrollments_cache_${user.uid}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setEnrollmentsList((prev) => {
            const otherUserEnrollments = prev.filter((e) => e.userId !== user.uid);
            return [...parsed, ...otherUserEnrollments];
          });
        }
      }
    } catch (e) {}

    // 2. Load from Supabase enrollments table
    getUserEnrollmentsFromSupabase(user.uid)
      .then((supabaseEnrollments) => {
        if (isCancelled) return;
        if (supabaseEnrollments && supabaseEnrollments.length > 0) {
          setEnrollmentsList((prev) => {
            const otherUserEnrollments = prev.filter((e) => e.userId !== user.uid);
            return [...supabaseEnrollments, ...otherUserEnrollments];
          });
        }
      })
      .catch((err) => {
        console.warn("Supabase enrollments load notice:", err);
      });

    // 3. Fallback Firestore real-time listener if quota is not exceeded
    let unsub = () => {};
    if (!isFirestoreQuotaExceeded()) {
      try {
        const qEnrollments = query(collection(db, "enrollments"), where("userId", "==", user.uid));
        unsub = onSnapshot(
          qEnrollments,
          (snapshot) => {
            if (isCancelled) return;
            const loaded: CourseEnrollment[] = [];
            snapshot.forEach((docSnap) => {
              const d = docSnap.data();
              const docId = docSnap.id;
              loaded.push({ ...d, id: docId } as CourseEnrollment);
            });
            if (loaded.length > 0) {
              setEnrollmentsList((prev) => {
                const otherUserEnrollments = prev.filter((e) => e.userId !== user.uid);
                return [...loaded, ...otherUserEnrollments];
              });
            }
          },
          (err) => {
            if (isQuotaExceededError(err)) {
              setFirestoreQuotaExhausted();
            }
          }
        );
      } catch (e) {
        if (isQuotaExceededError(e)) {
          setFirestoreQuotaExhausted();
        }
      }
    }

    return () => {
      isCancelled = true;
      unsub();
    };
  }, [user?.uid]);

  // Load courses & batches from Supabase using efficient cache-first strategy
  useEffect(() => {
    let isMounted = true;

    const loadCourseData = async () => {
      try {
        // 1. Primary: Load Courses from Supabase (with instant cache & rich starter dataset)
        const courses = await getCoursesFromSupabase();
        if (courses && courses.length > 0 && isMounted) {
          setCoursesList(courses);
        }

        // 2. Primary: Load Batches from Supabase
        const batches = await getBatchesFromSupabase();
        if (batches && batches.length > 0 && isMounted) {
          setBatchesList(batches);
        }
      } catch (err) {
        console.warn("Course data initial fetch notice:", err);
      }
    };

    loadCourseData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Real-time synchronization for course content (classes, materials, announcements, exams)
  // Scoped to course dashboard and teacher dashboard to prevent loading course data on unrelated routes
  useEffect(() => {
    const isCourseView = activeTab === "course_dashboard" || activeTab === "teacher_dashboard";
    if (!isCourseView || isFirestoreQuotaExceeded()) return;

    const unsubs: (() => void)[] = [];
    try {
      // 1. Classes listener
      const unsubClasses = onSnapshot(
        query(collection(db, "course_classes"), limit(100)),
        (snap) => {
          if (!snap.empty) {
            const loaded: CourseClass[] = [];
            snap.forEach((d) => loaded.push({ id: d.id, ...d.data() } as CourseClass));
            setClassesList(loaded);
          }
        },
        (err) => {
          if (isQuotaExceededError(err)) setFirestoreQuotaExhausted();
          console.warn("Classes snapshot listener warning:", err);
        }
      );
      unsubs.push(unsubClasses);

      // 2. Materials (notes & sheets) listener
      const unsubMaterials = onSnapshot(
        query(collection(db, "course_materials"), limit(100)),
        (snap) => {
          if (!snap.empty) {
            const loaded: CourseMaterial[] = [];
            snap.forEach((d) => loaded.push({ id: d.id, ...d.data() } as CourseMaterial));
            setMaterialsList(loaded);
          }
        },
        (err) => {
          if (isQuotaExceededError(err)) setFirestoreQuotaExhausted();
          console.warn("Materials snapshot listener warning:", err);
        }
      );
      unsubs.push(unsubMaterials);

      // 3. Announcements listener
      const unsubAnnouncements = onSnapshot(
        query(collection(db, "course_announcements"), limit(50)),
        (snap) => {
          if (!snap.empty) {
            const loaded: CourseAnnouncement[] = [];
            snap.forEach((d) => loaded.push({ id: d.id, ...d.data() } as CourseAnnouncement));
            setAnnouncementsList(loaded);
          }
        },
        (err) => {
          if (isQuotaExceededError(err)) setFirestoreQuotaExhausted();
          console.warn("Announcements snapshot listener warning:", err);
        }
      );
      unsubs.push(unsubAnnouncements);

      // 4. Exams listener (Crucial for Live Exam status changes & newly published exams)
      const unsubExams = onSnapshot(
        query(collection(db, "course_exams"), limit(100)),
        (snap) => {
          if (!snap.empty) {
            const loaded: CourseExam[] = [];
            snap.forEach((d) => loaded.push({ id: d.id, ...d.data() } as CourseExam));
            setExamsList(loaded);
          }
        },
        (err) => {
          if (isQuotaExceededError(err)) setFirestoreQuotaExhausted();
          console.warn("Exams snapshot listener warning:", err);
        }
      );
      unsubs.push(unsubExams);
    } catch (e) {
      if (isQuotaExceededError(e)) setFirestoreQuotaExhausted();
      console.warn("Failed to attach course content listeners:", e);
    }

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [activeTab]);

  const t = TRANSLATIONS[language];
  const isDark = theme === "dark";

  // Browser-level connection listeners
  useEffect(() => {
    const handleOnline = () => {
      setSyncState("syncing");
      // Let standard synchronization process resolve
      setTimeout(() => {
        if (navigator.onLine) {
          setSyncState("synced");
        }
      }, 2500);
    };

    const handleOffline = () => {
      setSyncState("offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial value setup
    if (!navigator.onLine) {
      setSyncState("offline");
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Display transition timer logic for "Synced" status highlight
  useEffect(() => {
    if (syncState === "synced") {
      setShowSyncedBriefly(true);
      const timer = setTimeout(() => {
        setShowSyncedBriefly(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [syncState]);

  // Synchronize dynamic stats for pinned rival
  useEffect(() => {
    if (!user || !user.pinnedRivalId) {
      setRivalProfile(null);
      return;
    }

    const unsub = onSnapshot(
      doc(db, "users", user.pinnedRivalId),
      (docSnap) => {
        if (docSnap.exists()) {
          setRivalProfile({ uid: docSnap.id, ...docSnap.data() } as any);
        } else {
          setRivalProfile(null);
        }
      },
      (err) => {
        console.warn("Could not stream rival profile: ", err);
      }
    );

    return () => unsub();
  }, [user?.pinnedRivalId]);

  // Global Keyboard Shortcuts for tab navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target ||
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable ||
        target.closest("[contenteditable]")
      ) {
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) {
        return;
      }

      const key = e.key.toLowerCase();
      let newTab: ActiveTab | null = null;

      switch (key) {
        case "d":
          newTab = "dashboard";
          break;
        case "p":
          newTab = "practice";
          break;
        case "l":
          newTab = "leaderboard";
          break;
        case "s":
          newTab = "social";
          break;
        case "m":
          newTab = "mentor";
          break;
        case "g":
          newTab = "gk";
          break;
        case "e":
          newTab = "english";
          break;
        case "a":
          newTab = "analytics";
          break;
        case "b":
          newTab = "anushiloni";
          break;
        case "r":
          newTab = "mistakes";
          break;
        default:
          break;
      }

      if (newTab) {
        e.preventDefault();
        playSound("click");
        setActiveTab(newTab);
        if (mobileMenuOpen) {
          setMobileMenuOpen(false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMenuOpen]);
  
  // Responsive sidebar toggles
  
  // Superadmin double verification gates
  const [showSuperadminLogin, setShowSuperadminLogin] = useState(false);
  const [superadminKeyInput, setSuperadminKeyInput] = useState("");
  const [isSuperadminVerified, setIsSuperadminVerified] = useState(() => {
    try {
      if (typeof window !== "undefined") {
        return sessionStorage.getItem("mb_superadmin_verified") === "true";
      }
    } catch (e) {}
    return false;
  });
  const [showPassword, setShowPassword] = useState(false);
  const [superadminError, setSuperadminError] = useState("");

  const handleAdminNavigation = () => {
    let hasSessionVerified = false;
    try {
      hasSessionVerified = sessionStorage.getItem("mb_superadmin_verified") === "true";
    } catch (e) {}

    if (
      isSuperadminVerified ||
      user?.role === "admin" ||
      user?.role === "superadmin" ||
      user?.role === "moderator" ||
      user?.email === "nuwaisirhoquesbmc@gmail.com" ||
      user?.email === "hoquenuwaisir@gmail.com" ||
      hasSessionVerified
    ) {
      setIsSuperadminVerified(true);
      try {
        sessionStorage.setItem("mb_superadmin_verified", "true");
      } catch (e) {}
      setActiveTab("admin");
    } else {
      setShowSuperadminLogin(true);
      setSuperadminKeyInput("");
      setSuperadminError("");
      setShowPassword(false);
    }
  };

  const handleVerifySuperadmin = (e: React.FormEvent) => {
    e.preventDefault();
    const key = (superadminKeyInput || "").trim().toLowerCase();
    const validKeys = [
      "superadmin2000",
      "superadmin2026",
      "admin2026",
      "medibridge2026",
      "admin",
      "admin123",
      "123456",
      "sbmc2026"
    ];
    if (validKeys.includes(key) || key === "superadmin2000") {
      setIsSuperadminVerified(true);
      try {
        sessionStorage.setItem("mb_superadmin_verified", "true");
        sessionStorage.setItem("mb_cc_unlocked_session", "true");
      } catch (e) {}
      setShowSuperadminLogin(false);
      playSound("victory");
      setActiveTab("admin");
    } else {
      playSound("wrong");
      setSuperadminError(language === "bn" ? "ভুল সুপারঅ্যাডমিন অ্যাক্সেস কোড! (সঠিক পাসওয়ার্ড: Superadmin2000)" : "Incorrect access key! (Valid passcode: Superadmin2000)");
    }
  };

  // Smart navigation coordinator triggered when user clicks a notification
  const handleNotificationNavigation = (notif: any) => {
    const metadata = notif.metadata || {};
    const type = (notif.type || "").toLowerCase();
    const actionUrl = notif.actionUrl || "";

    // 1. Explicit tab actions (e.g., "tab:practice", "tab:course_dashboard")
    if (actionUrl.startsWith("tab:")) {
      const tabParts = actionUrl.replace("tab:", "").split("?");
      const targetTab = tabParts[0];
      if (metadata.courseId) {
        const course = coursesList.find((c) => c.id === metadata.courseId);
        if (course) setSelectedCourse(course);
        const enr = enrollmentsList.find((e) => e.courseId === metadata.courseId);
        if (enr) setLearningEnrollment(enr);
      }
      if (metadata.batchId) {
        const batch = batchesList.find((b) => b.id === metadata.batchId);
        if (batch) setSelectedBatch(batch);
      }
      setActiveTab(targetTab as ActiveTab);
      return;
    }

    // 2. Question Thread / Doubt Solving / Teacher Reply
    if (
      type.includes("question") ||
      type.includes("doubt") ||
      type.includes("reply") ||
      type.includes("teacher") ||
      type.includes("mentor") ||
      type.includes("thread") ||
      type.includes("discussion")
    ) {
      if (metadata.courseId) {
        const course = coursesList.find((c) => c.id === metadata.courseId);
        if (course) setSelectedCourse(course);
        const enr = enrollmentsList.find((e) => e.courseId === metadata.courseId);
        if (enr) setLearningEnrollment(enr);
        const batch = batchesList.find((b) => b.id === metadata.batchId || b.courseId === metadata.courseId);
        if (batch) setSelectedBatch(batch);
        setActiveTab("course_dashboard");
      } else if (type.includes("social") || type.includes("feed")) {
        setActiveTab("social");
      } else {
        setActiveTab("mentor");
      }
      return;
    }

    // 3. Result Detail / Score Analysis / Battle Replay
    if (
      type.includes("result") ||
      type.includes("score") ||
      type.includes("rank_update") ||
      type.includes("battle_result")
    ) {
      if (metadata.battleLog) {
        setSelectedReplayBattle(metadata.battleLog);
        return;
      }
      if (metadata.courseId) {
        const course = coursesList.find((c) => c.id === metadata.courseId);
        if (course) setSelectedCourse(course);
        const enr = enrollmentsList.find((e) => e.courseId === metadata.courseId);
        if (enr) setLearningEnrollment(enr);
        setActiveTab("course_dashboard");
        return;
      }
      if (metadata.mistakesCount || type.includes("mistake")) {
        setActiveTab("mistakes");
        return;
      }
      setActiveTab("practice");
      return;
    }

    // 4. Exams & Model Tests
    if (
      type.includes("exam") ||
      type.includes("test") ||
      type.includes("model_test") ||
      type.includes("schedule") ||
      type.includes("reminder")
    ) {
      if (metadata.courseId) {
        const course = coursesList.find((c) => c.id === metadata.courseId);
        if (course) setSelectedCourse(course);
        const enr = enrollmentsList.find((e) => e.courseId === metadata.courseId);
        if (enr) setLearningEnrollment(enr);
        setActiveTab("course_dashboard");
      } else {
        setActiveTab("practice");
      }
      return;
    }

    // 5. Live Classes & Recorded Lectures
    if (
      type.includes("class") ||
      type.includes("recording") ||
      type.includes("live") ||
      type.includes("lecture")
    ) {
      if (metadata.courseId) {
        const course = coursesList.find((c) => c.id === metadata.courseId);
        if (course) setSelectedCourse(course);
        const enr = enrollmentsList.find((e) => e.courseId === metadata.courseId);
        if (enr) setLearningEnrollment(enr);
        setActiveTab("course_dashboard");
      } else {
        setActiveTab("my_courses");
      }
      return;
    }

    // 6. Study Materials & PDFs
    if (
      type.includes("material") ||
      type.includes("pdf") ||
      type.includes("note") ||
      type.includes("sheet")
    ) {
      if (metadata.courseId) {
        const course = coursesList.find((c) => c.id === metadata.courseId);
        if (course) setSelectedCourse(course);
        const enr = enrollmentsList.find((e) => e.courseId === metadata.courseId);
        if (enr) setLearningEnrollment(enr);
        setActiveTab("course_dashboard");
      } else {
        setActiveTab("my_courses");
      }
      return;
    }

    // 7. Payment Confirmation & Invoices
    if (type.includes("payment") || type.includes("enroll")) {
      if (type.includes("fail") || type.includes("reject")) {
        setActiveTab("exambatch");
      } else {
        if (metadata.courseId) {
          const course = coursesList.find((c) => c.id === metadata.courseId);
          if (course) setSelectedCourse(course);
          const enr = enrollmentsList.find((e) => e.courseId === metadata.courseId);
          if (enr) setLearningEnrollment(enr);
          setActiveTab("course_dashboard");
        } else {
          setActiveTab("my_courses");
        }
      }
      return;
    }

    // 8. Admin Notices & Announcements
    if (type.includes("notice") || type.includes("announcement")) {
      if (metadata.courseId) {
        const course = coursesList.find((c) => c.id === metadata.courseId);
        if (course) setSelectedCourse(course);
        const enr = enrollmentsList.find((e) => e.courseId === metadata.courseId);
        if (enr) setLearningEnrollment(enr);
        setActiveTab("course_dashboard");
      } else {
        setActiveTab("dashboard");
      }
      return;
    }

    // 9. Mistakes Review
    if (type.includes("mistake")) {
      setActiveTab("mistakes");
      return;
    }

    // 10. Leaderboard
    if (type.includes("leaderboard") || type.includes("rank")) {
      setActiveTab("leaderboard");
      return;
    }

    // 11. Combat Battle Arena
    if (type.includes("battle") || type.includes("arena") || type.includes("challenge")) {
      setActiveTab("practice");
      return;
    }

    // Fallback
    setActiveTab("dashboard");
  };

  // DB shared questions & notices - 100% Migrated from Firebase to Supabase store
  const [dbQuestions, setDbQuestions] = useState<Question[]>(() => getMigratedQuestions());
  const [notices, setNotices] = useState<AdminNotice[]>(() => getMigratedNotices());

  // Dynamic Loading Logo states loaded instantly from Migrated Settings
  const [loadingLogoUrl, setLoadingLogoUrl] = useState<string | null>(() => {
    try {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("medi_loading_logo");
        if (stored) return stored;
        const platform = getMigratedSetting<Record<string, any>>("platform", {});
        return platform?.loadingLogoUrl || null;
      }
    } catch (e) {}
    return null;
  });
  const [loadingLogoEnabled, setLoadingLogoEnabled] = useState<boolean>(() => {
    try {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("medi_loading_logo_enabled");
        if (stored !== null) return stored === "true";
        const platform = getMigratedSetting<Record<string, any>>("platform", {});
        return !!platform?.loadingLogoEnabled;
      }
    } catch (e) {}
    return false;
  });

  useEffect(() => {
    // Sync notices from Supabase if online
    getNoticesFromSupabase().then((supaNotices) => {
      if (supaNotices && supaNotices.length > 0) {
        setNotices(supaNotices);
      }
    }).catch(() => {});
  }, []);

  // Monitor location path for /command-center
  useEffect(() => {
    const handleRouteCheck = () => {
      const isCommandCenterPath = 
        window.location.pathname === "/command-center" || 
        window.location.hash === "#/command-center";
      
      if (isCommandCenterPath) {
        if (isSuperadminVerified) {
          setActiveTab("admin");
        } else {
          setActiveTab("dashboard");
          handleAdminNavigation();
        }
        return;
      }

      // Check for deep-linked course URL query (?course=ID) or hash (#course/ID, #courses/ID, #/course/ID)
      try {
        const urlParams = new URLSearchParams(window.location.search);
        let courseIdParam = urlParams.get("course");
        if (!courseIdParam && window.location.hash) {
          const hashClean = window.location.hash.replace(/^#\/?/, "");
          if (hashClean.startsWith("course/")) {
            courseIdParam = hashClean.replace("course/", "");
          } else if (hashClean.startsWith("courses/")) {
            courseIdParam = hashClean.replace("courses/", "");
          }
        }
        if (courseIdParam) {
          const matched = coursesList.find((c) => c.id === courseIdParam);
          if (matched) {
            setSelectedCourse(matched);
            setActiveTab("course_details");
          } else {
            // Also attempt direct Firestore document retrieval if not in memory yet
            getDoc(doc(db, "courses", courseIdParam))
              .then((snap) => {
                if (snap.exists()) {
                  const fetched = { id: snap.id, ...snap.data() } as Course;
                  setSelectedCourse(fetched);
                  setActiveTab("course_details");
                }
              })
              .catch((err) => console.warn("Direct course link fetch warning:", err));
          }
        }
      } catch (e) {
        console.warn("Course route parse warning:", e);
      }
    };

    // Check on startup
    handleRouteCheck();

    // Setup global popstate & hash change listeners
    window.addEventListener("popstate", handleRouteCheck);
    window.addEventListener("hashchange", handleRouteCheck);

    return () => {
      window.removeEventListener("popstate", handleRouteCheck);
      window.removeEventListener("hashchange", handleRouteCheck);
    };
  }, [coursesList]);

  // Prevent background scrolling when mobile menu drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  // Auth Listener using Supabase Auth Sessions & persistent state with guaranteed safety completion
  useEffect(() => {
    let isMounted = true;
    let authSyncCompleted = false;

    // Safety timeout: Ensure the loading screen is never stuck indefinitely
    // regardless of network latency, Web Locks API, or external service delays
    const safetyTimer = setTimeout(() => {
      if (isMounted && !authSyncCompleted) {
        console.warn("MediBridge auth initialization timeout reached; transitioning to view.");
        setLoading(false);
      }
    }, 2000);

    // Helper to load profile from Supabase public.profiles table
    const syncProfileFromSupabase = async (authUser: { id: string; email?: string; user_metadata?: Record<string, any> }) => {
      let cachedProfile: Partial<UserProfile> | null = null;
      try {
        // 1. Check local cached profile first for instant UI response
        try {
          const cachedStr = localStorage.getItem(`medibridge_cached_profile_${authUser.id}`);
          if (cachedStr) {
            cachedProfile = JSON.parse(cachedStr) as UserProfile;
            if (isMounted) {
              setUser(cachedProfile as UserProfile);
              setLoading(false);
            }
          }
        } catch (e) {}

        // 2. Fetch authenticated user's profile from public.profiles with timeout
        const dbProfile = await fetchSupabaseProfile(authUser.id, 2500);
        if (!isMounted) return;

        const mapped = mapSupabaseToUserProfile(
          authUser.id,
          authUser.email,
          dbProfile,
          cachedProfile,
          authUser.user_metadata
        );

        setUser(mapped);
        try {
          localStorage.setItem(`medibridge_cached_profile_${authUser.id}`, JSON.stringify(mapped));
        } catch (e) {}

        // 3. Auto-route based on database role
        if (mapped.role === "admin") {
          setIsSuperadminVerified(true);
          try {
            sessionStorage.setItem("mb_superadmin_verified", "true");
          } catch (e) {}
          setActiveTab("admin");
        } else {
          // Students are directed to student dashboard
          setActiveTab((prev) => (prev === "admin" ? "dashboard" : prev));
        }

        setSyncState("synced");
      } catch (err) {
        console.warn("Failed to sync profile from Supabase:", err);
      } finally {
        authSyncCompleted = true;
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Check existing active session immediately on mount
    try {
      supabase.auth
        .getSession()
        .then(({ data: { session }, error }) => {
          if (!isMounted) return;
          if (error) {
            console.warn("Supabase getSession notice:", error.message);
          }
          if (session?.user) {
            syncProfileFromSupabase(session.user);
          } else {
            // Check if there is an active local user session from direct login or Google Auth
            try {
              const localUserStr = localStorage.getItem("medibridge_active_user");
              if (localUserStr) {
                const localUser = JSON.parse(localUserStr);
                if (localUser && localUser.uid) {
                  setUser(localUser);
                  if (
                    localUser.role === "admin" ||
                    localUser.email === "nuwaisirhoquesbmc@gmail.com" ||
                    localUser.email === "hoquenuwaisir@gmail.com"
                  ) {
                    setIsSuperadminVerified(true);
                    sessionStorage.setItem("mb_superadmin_verified", "true");
                  }
                  authSyncCompleted = true;
                  setLoading(false);
                  return;
                }
              }
            } catch (e) {}

            authSyncCompleted = true;
            setUser(null);
            setLoading(false);
            if (oauthErrorParam) {
              setShowLoginModal(true);
            }
          }
        })
        .catch((err) => {
          console.warn("Supabase getSession exception:", err);
          try {
            const localUserStr = localStorage.getItem("medibridge_active_user");
            if (localUserStr) {
              const localUser = JSON.parse(localUserStr);
              if (localUser && localUser.uid && isMounted) {
                setUser(localUser);
                authSyncCompleted = true;
                setLoading(false);
                return;
              }
            }
          } catch (e) {}

          authSyncCompleted = true;
          if (isMounted) {
            setUser(null);
            setLoading(false);
            if (oauthErrorParam) {
              setShowLoginModal(true);
            }
          }
        });
    } catch (err) {
      console.warn("Supabase getSession call threw:", err);
      try {
        const localUserStr = localStorage.getItem("medibridge_active_user");
        if (localUserStr) {
          const localUser = JSON.parse(localUserStr);
          if (localUser && localUser.uid && isMounted) {
            setUser(localUser);
            authSyncCompleted = true;
            setLoading(false);
            return;
          }
        }
      } catch (e) {}

      authSyncCompleted = true;
      if (isMounted) {
        setUser(null);
        setLoading(false);
        if (oauthErrorParam) {
          setShowLoginModal(true);
        }
      }
    }

    // Listen for auth state changes (SIGN_IN, SIGNED_OUT, TOKEN_REFRESHED)
    let subscription: { unsubscribe: () => void } | null = null;
    try {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!isMounted) return;
        try {
          if (event === "SIGNED_OUT" || !session?.user) {
            authSyncCompleted = true;
            setUser(null);
            setIsSuperadminVerified(false);
            try {
              sessionStorage.removeItem("mb_superadmin_verified");
            } catch (e) {}
            setLoading(false);
          } else if (session?.user) {
            await syncProfileFromSupabase(session.user);
          }
        } catch (err) {
          console.warn("Supabase onAuthStateChange handling error:", err);
          authSyncCompleted = true;
          if (isMounted) {
            setLoading(false);
          }
        }
      });
      subscription = data?.subscription || null;
    } catch (err) {
      console.warn("Supabase onAuthStateChange subscription error:", err);
      authSyncCompleted = true;
      if (isMounted) {
        setLoading(false);
      }
    }

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      if (subscription && typeof subscription.unsubscribe === "function") {
        subscription.unsubscribe();
      }
    };
  }, []);

  // Fetch recent notices from Supabase (with instant local cache fallback)
  useEffect(() => {
    let isCancelled = false;

    // 1. Check local cache first
    try {
      const cached = localStorage.getItem("medibridge_notices_cache");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setNotices(parsed);
        }
      }
    } catch (e) {}

    // 2. Fetch from Supabase notices
    getNoticesFromSupabase()
      .then((loadedNotices) => {
        if (!isCancelled && loadedNotices && loadedNotices.length > 0) {
          setNotices(loadedNotices);
        }
      })
      .catch((err) => {
        console.warn("Supabase notices load notice:", err);
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  const handleCharSelect = async (charId: string) => {
    if (!user) return;
    try {
      const selected = CHARACTERS.find((c) => c.id === charId);
      if (!selected) return;

      playSound("buy");
      const url = `https://api.dicebear.com/7.x/avataaars/svg?seed=${selected.name}`;

      await updateDocInProfile({
        characterId: charId,
        avatarUrl: url,
      });

      alert(`Class Swapped! You are now a licensed ${selected.name}!`);
    } catch (err: any) {
      console.error(err);
    }
  };

  const updateDocInProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    if (navigator.onLine) {
      setSyncState("syncing");
    } else {
      setSyncState("offline");
    }
    try {
      const updatedProfile = { ...user, ...updates };
      
      // Update local before database resolves for visual reactivity
      setUser(updatedProfile);
      try {
        localStorage.setItem(`medibridge_cached_profile_${user.uid}`, JSON.stringify(updatedProfile));
      } catch (e) {}
      
      // Primary: sync to Supabase public.profiles
      await updateProfileInSupabase(user.uid, updates);

      // Optional: sync to Firestore if not quota exceeded
      if (!isFirestoreQuotaExceeded()) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          await setDoc(userDocRef, updates as any, { merge: true });
        } catch (fsErr) {
          if (isQuotaExceededError(fsErr)) {
            setFirestoreQuotaExhausted();
          }
        }
      }

      if (navigator.onLine) {
        setSyncState("synced");
      }
    } catch (err: any) {
      if (navigator.onLine) {
        setSyncState("synced");
      }
      console.warn("Could not sync user profile update:", err);
    }
  };

  const logoutAction = async () => {
    try {
      if (user?.uid) {
        try {
          localStorage.removeItem(`medibridge_cached_profile_${user.uid}`);
        } catch (e) {}
      }
      try {
        localStorage.removeItem("medibridge_active_user");
        sessionStorage.removeItem("mb_superadmin_verified");
      } catch (e) {}
      setIsSuperadminVerified(false);

      await Promise.allSettled([
        supabase.auth.signOut(),
        auth.signOut()
      ]);
      setUser(null);
      setActiveTab("dashboard");
      setMobileMenuOpen(false);
    } catch (err: any) {
      console.error("signOut error:", err);
      setUser(null);
      setActiveTab("dashboard");
      setMobileMenuOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#050505] text-white min-h-screen font-sans flex flex-col items-center justify-center p-6 select-none relative">
        {/* Deep centered radial atmospheric glow matching screenshots */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#C1121F]/15 rounded-full blur-[100px] animate-pulse"></div>
        <div className="flex flex-col items-center gap-5 text-center z-10 max-w-sm">
          {loadingLogoUrl && loadingLogoEnabled ? (
            <div className="flex flex-col items-center justify-center" id="medibridge-custom-loading-logo">
              <img
                src={loadingLogoUrl}
                alt="MediBridge Family"
                referrerPolicy="no-referrer"
                className="h-14 sm:h-16 object-contain max-w-full drop-shadow-[0_4px_14px_rgba(193,18,31,0.4)] animate-pulse"
              />
            </div>
          ) : (
            <MediBridgeLogo size="md" />
          )}
          
          <div className="mt-2 space-y-1">
            <span className="text-[11px] sm:text-xs block text-gray-300 font-bold tracking-wide font-sans">
              Bangladesh's First Gamified Medical Admission App
            </span>
            <span className="text-[10px] block text-[#FFD700] tracking-[0.1em] font-mono font-black uppercase opacity-95 pt-1">
              Welcome to MediBridge Family
            </span>
          </div>

          <div className="w-48 bg-gray-950 h-1.5 rounded-full overflow-hidden mt-2 border border-white/5">
            <div className="bg-gradient-to-r from-[#C1121F] to-amber-500 h-full w-[65%] animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  // Render Landing Page or Public Course Details if student is not authenticated
  if (!user) {
    if (showLoginModal) {
      return (
        <LoginPage
          initialAuthError={oauthErrorParam}
          onLoginSuccess={(profile) => {
            setUser(profile);
            setShowLoginModal(false);
            setOauthErrorParam(null);
            if (pendingEnroll) {
              setSelectedCourse(pendingEnroll.course);
              const foundBatch = batchesList.find(
                (b) => b.id === pendingEnroll.batchId || b.courseId === pendingEnroll.course.id
              );
              if (foundBatch) setSelectedBatch(foundBatch);
              setActiveTab("course_checkout");
              setPendingEnroll(null);
              try {
                sessionStorage.removeItem("medi_pending_enroll");
              } catch (e) {}
            } else if (profile.role === "admin") {
              setIsSuperadminVerified(true);
              sessionStorage.setItem("mb_superadmin_verified", "true");
              setActiveTab("admin");
            } else {
              setActiveTab("dashboard");
            }
          }}
          onClose={() => {
            setShowLoginModal(false);
            setOauthErrorParam(null);
          }}
          language={language}
        />
      );
    }

    if (activeTab === "course_details" && selectedCourse) {
      return (
        <div className={`${isDark ? "bg-[#0A0A0A] text-white" : "bg-[#F9FAFB] text-slate-800"} min-h-screen font-sans selection:bg-[#C1121F] selection:text-white flex flex-col relative overflow-hidden pb-16`}>
          {/* Public Top Navbar for Course Details */}
          <nav className={`border-b ${isDark ? "border-white/5 bg-[#0D0D0D]/90" : "border-red-100 bg-white/95"} sticky top-0 z-40 px-4 sm:px-6 py-3.5 backdrop-blur-md`}>
            <div className="max-w-7xl mx-auto flex justify-between items-center">
              <div
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => {
                  playSound("click");
                  setActiveTab("dashboard");
                  try {
                    window.history.replaceState(null, "", window.location.pathname);
                  } catch (e) {}
                }}
              >
                <MediBridgeLogo size="sm" className="items-start" theme={theme} />
              </div>

              <div className="flex items-center gap-2.5 sm:gap-3">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className={`p-2 rounded-xl border transition cursor-pointer ${
                    isDark ? "bg-white/5 border-white/10 text-gray-300 hover:text-white" : "bg-gray-100 border-gray-200 text-gray-700 hover:text-black"
                  }`}
                  title={isDark ? "Light Mode" : "Dark Mode"}
                >
                  {isDark ? "☀️" : "🌙"}
                </button>

                <button
                  type="button"
                  onClick={() => setLanguage(language === "bn" ? "en" : "bn")}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition cursor-pointer ${
                    isDark ? "bg-white/5 border-white/10 text-[#FFD700]" : "bg-red-50 border-red-200 text-[#C1121F]"
                  }`}
                >
                  {language === "bn" ? "EN" : "বাং"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playSound("click");
                    setShowLoginModal(true);
                  }}
                  className="px-4 py-2 bg-[#C1121F] hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-[0_0_15px_rgba(193,18,31,0.4)] flex items-center gap-1.5 cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{language === "bn" ? "লগইন / রেজিস্টার" : "Log In / Register"}</span>
                </button>
              </div>
            </div>
          </nav>

          <CourseDetailsView
            course={selectedCourse}
            batches={batchesList.filter((b) => b.courseId === selectedCourse.id)}
            enrollments={[]}
            user={null}
            language={language}
            theme={theme}
            onBack={() => {
              setActiveTab("dashboard");
              try {
                window.history.replaceState(null, "", window.location.pathname);
              } catch (e) {}
            }}
            onEnrollNow={(course, batchId) => {
              setSelectedCourse(course);
              const foundBatch = batchesList.find((b) => b.id === batchId || b.courseId === course.id);
              if (foundBatch) setSelectedBatch(foundBatch);
              setPendingEnroll({ course, batchId: foundBatch?.id || batchId });
              try {
                sessionStorage.setItem(
                  "medi_pending_enroll",
                  JSON.stringify({ courseId: course.id, batchId: foundBatch?.id || batchId })
                );
              } catch (e) {}
              setShowLoginModal(true);
            }}
            onGoToCourseDashboard={() => {
              setShowLoginModal(true);
            }}
          />
        </div>
      );
    }

    return (
      <LandingPage
        onStart={() => setShowLoginModal(true)}
        onLoginClick={() => setShowLoginModal(true)}
        onSelectCourse={(course) => {
          setSelectedCourse(course);
          setActiveTab("course_details");
          try {
            const newUrl = `${window.location.pathname}?course=${encodeURIComponent(course.id)}`;
            window.history.pushState(null, "", newUrl);
          } catch (e) {}
        }}
        onEnrollCourse={(course) => {
          setSelectedCourse(course);
          const foundBatch = batchesList.find((b) => b.courseId === course.id);
          if (foundBatch) setSelectedBatch(foundBatch);
          setPendingEnroll({ course, batchId: foundBatch?.id });
          try {
            sessionStorage.setItem(
              "medi_pending_enroll",
              JSON.stringify({ courseId: course.id, batchId: foundBatch?.id })
            );
          } catch (e) {}
          setShowLoginModal(true);
        }}
        language={language}
        setLanguage={setLanguage}
        theme={theme}
        toggleTheme={toggleTheme}
      />
    );
  }

  const activeChar = CHARACTERS.find((c) => c.id === (user.characterId || "neuro_slasher")) || CHARACTERS[0];
  const nextLevelXp = user.level * 500;
  const prevLevelXp = (user.level - 1) * 500;
  const levelProgressPct = Math.min(100, Math.max(5, ((user.xp - prevLevelXp) / 500) * 100));

  const renderSyncStatusBadge = (isMobile = false) => {
    if (syncState === "synced" && !showSyncedBriefly) {
      return null;
    }

    if (syncState === "offline") {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="px-3 py-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-550 font-bold flex items-center gap-1.5 shadow-[0_0_10px_rgba(245,158,11,0.1)] select-none text-[10px] tracking-wide font-mono"
          id={`sync-status-offline-${isMobile ? "mobile" : "desktop"}`}
        >
          <WifiOff className="w-3.5 h-3.5 animate-pulse text-amber-500" />
          <span>{language === "bn" ? "অফলাইন" : "OFFLINE"}</span>
        </motion.div>
      );
    }

    if (syncState === "syncing") {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="px-3 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 text-blue-400 font-bold flex items-center gap-1.5 shadow-[0_0_10px_rgba(59,130,246,0.1)] select-none text-[10px] tracking-wide font-mono"
          id={`sync-status-syncing-${isMobile ? "mobile" : "desktop"}`}
        >
          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
          <span>{language === "bn" ? "সিঙ্ক হচ্ছে..." : "SYNCING..."}</span>
        </motion.div>
      );
    }

    if (syncState === "synced" && showSyncedBriefly) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="px-3 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 font-bold flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.1)] select-none text-[10px] tracking-wide font-mono"
          id={`sync-status-synced-${isMobile ? "mobile" : "desktop"}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>{language === "bn" ? "সংরক্ষিত" : "SYNCED"}</span>
        </motion.div>
      );
    }

    return null;
  };

  return (
    <div className={`${isDark ? "bg-[#0A0A0A] text-white" : "bg-[#F9FAFB] text-slate-800"} min-h-screen font-sans selection:bg-[#C1121F] selection:text-white flex flex-col relative overflow-hidden pb-20 lg:pb-12`}>
      {/* Real-time In-App Notifications Toast Container */}
      <div className="fixed top-20 right-6 z-50 flex flex-col gap-3.5 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {activeNotifications.map((notif) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, x: 50 }}
              className={`pointer-events-auto p-4.5 rounded-2xl border shadow-2xl flex flex-col gap-2.5 md:backdrop-blur-md ${
                notif.type === "payment_approved"
                  ? "bg-emerald-950/95 border-emerald-500/30 text-emerald-100"
                  : notif.type === "payment_rejected"
                    ? "bg-red-950/95 border-red-500/30 text-red-100"
                    : notif.type === "new_test_published"
                      ? "bg-blue-950/95 border-blue-500/40 text-blue-100"
                      : notif.type === "exam_result_ready"
                        ? "bg-purple-950/95 border-purple-500/40 text-purple-100"
                        : "bg-[#151515]/95 border-white/10 text-white"
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <span className="text-base">
                    {notif.type === "payment_approved"
                      ? "👑"
                      : notif.type === "payment_rejected"
                        ? "❌"
                        : notif.type === "new_test_published"
                          ? "🚨"
                          : notif.type === "exam_result_ready"
                            ? "📊"
                            : "🔔"}
                  </span>
                  <h4 className="font-extrabold text-sm font-mono tracking-wide uppercase">
                    {notif.title}
                  </h4>
                </div>
                <button
                  onClick={async () => {
                    playSound("click");
                    try {
                      await updateDoc(doc(db, "user_notifications", notif.id), { read: true });
                    } catch (e) {
                      console.error("Failed to dismiss notification:", e);
                    }
                  }}
                  className="text-xs font-bold hover:opacity-80 text-gray-400 hover:text-white cursor-pointer px-1 py-0.5 rounded bg-black/20"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs leading-relaxed opacity-90">
                {notif.content}
              </p>

              <div className="flex justify-end pt-1.5 border-t border-white/5 gap-2">
                {notif.type === "new_test_published" && (
                  <button
                    onClick={async () => {
                      playSound("click");
                      try {
                        await updateDoc(doc(db, "user_notifications", notif.id), { read: true });
                      } catch (e) {
                        console.error("Failed to mark read:", e);
                      }
                      setActiveTab("practice");
                    }}
                    className="text-[10px] font-mono font-black uppercase tracking-wider px-3 py-1.5 rounded-lg cursor-pointer bg-blue-500 text-white hover:bg-blue-400"
                  >
                    {language === "bn" ? "🚀 পরীক্ষা দিন" : "🚀 TAKE TEST NOW"}
                  </button>
                )}
                {notif.type === "exam_result_ready" && (
                  <button
                    onClick={async () => {
                      playSound("click");
                      try {
                        await updateDoc(doc(db, "user_notifications", notif.id), { read: true });
                      } catch (e) {
                        console.error("Failed to mark read:", e);
                      }
                      setActiveTab("practice");
                    }}
                    className="text-[10px] font-mono font-black uppercase tracking-wider px-3 py-1.5 rounded-lg cursor-pointer bg-purple-500 text-white hover:bg-purple-400"
                  >
                    {language === "bn" ? "📊 ফলাফল দেখুন" : "📊 VIEW RESULTS"}
                  </button>
                )}
                <button
                  onClick={async () => {
                    playSound("click");
                    try {
                      await updateDoc(doc(db, "user_notifications", notif.id), { read: true });
                    } catch (e) {
                      console.error("Failed to mark read:", e);
                    }
                  }}
                  className={`text-[10px] font-mono font-black uppercase tracking-wider px-3 py-1.5 rounded-lg cursor-pointer ${
                    notif.type === "payment_approved"
                      ? "bg-[#10B981] text-black hover:bg-emerald-400"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  {language === "bn" ? "ঠিক আছে" : "ACKNOWLEDGE"}
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Background Orbits */}
      <div className={`absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[140px] pointer-events-none ${isDark ? "bg-[#C1121F]/5" : "bg-[#C1121F]/3"}`}></div>

      {/* DASHBOARD NAVBAR CONTAINER */}
      <nav className={`border-b ${isDark ? "border-white/5 bg-[#0D0D0D]/90 md:bg-[#0D0D0D]/80" : "border-red-100 bg-white/95 md:bg-white/90 shadow-sm"} md:backdrop-blur sticky top-0 z-40 px-3 sm:px-6 py-3 sm:py-4`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => { playSound("click"); setActiveTab("dashboard"); }}>
            <MediBridgeLogo size="sm" className="items-start" theme={theme} />
          </div>

          {/* Global Search Bar */}
          <div className="flex items-center mx-2 md:mx-4">
            <GlobalSearch language={language} activeTab={activeTab} setActiveTab={setActiveTab} theme={theme} />
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-1.5 font-mono text-xs font-bold uppercase">
            {[
              { id: "dashboard", name: t.dashboardOn, icon: User, shortcut: "D" },
              { id: "gaming", name: language === "bn" ? "গেমিং অ্যারেনা 🎮" : "Gaming Arena 🎮", icon: Gamepad2, shortcut: "G" },
              { id: "courses", name: language === "bn" ? "কোর্সসমূহ 🎓" : "Courses 🎓", icon: BookOpen, shortcut: "C" },
              { id: "my_courses", name: language === "bn" ? "আমার কোর্স 📖" : "My Learning 📖", icon: Book, shortcut: "M" },
              { id: "analytics", name: language === "bn" ? "অ্যানালিটিক্স 📊" : "Analytics 📊", icon: BarChart3, shortcut: "A" },
              { id: "practice", name: t.combatArena, icon: Target, shortcut: "P" },
              { id: "anushiloni", name: language === "bn" ? "অনুশীলনী 📚" : "Anushiloni 📚", icon: Book, shortcut: "B" },
              { id: "mistakes", name: language === "bn" ? "ভুল সংশোধন 🧹" : "Mistakes 🧹", icon: Brain, shortcut: "R" },
              { id: "social", name: t.feedSquads, icon: MessageSquare, shortcut: "S" },
              { id: "leaderboard", name: t.warsBoard, icon: Trophy, shortcut: "L" },
              { id: "heroes", name: language === "bn" ? "কৃতি শিক্ষার্থী 🏆" : "Our Heroes 🏆", icon: Award, shortcut: "H" },
              { id: "exambatch", name: language === "bn" ? "এক্সাম ব্যাচ 🚀" : "Exam Batches 🚀", icon: Rocket, shortcut: "X" },
              { id: "mentor", name: t.medisenseAi, icon: Bot, shortcut: "AI" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => { playSound("click"); setActiveTab(tab.id as any); }}
                className={`py-2 px-3 flex items-center gap-1.5 rounded transition font-display uppercase tracking-wider group relative ${
                  activeTab === tab.id
                    ? "bg-[#C1121F] text-white border border-white/10 shadow-[0_0_15px_rgba(193,18,31,0.5)]"
                    : isDark
                      ? "text-white/50 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5 rounded-xl font-display uppercase tracking-wider transition-all duration-300"
                      : "text-slate-600 hover:text-[#C1121F] hover:bg-red-50 border border-transparent hover:border-red-100 rounded-xl font-display uppercase tracking-wider transition-all duration-300"
                }`}
                id={`btn-nav-desktop-${tab.id}`}
              >
                <span>{tab.name}</span>
                <kbd className={`ml-1 text-[9px] px-1 py-0.5 rounded font-mono font-bold leading-none border transition-colors select-none ${
                  activeTab === tab.id
                    ? "bg-white/20 border-white/30 text-white"
                    : isDark
                      ? "bg-white/5 border-white/10 text-gray-400 group-hover:text-white"
                      : "bg-gray-100 border-gray-200 text-slate-500 group-hover:text-red-600"
                }`}>
                  {tab.shortcut}
                </kbd>
              </button>
            ))}

            {/* Restricted Admin entry visible to Admins */}
            {(user.role === "admin" || user.role === "superadmin" || user.role === "moderator" || user.email === "nuwaisirhoquesbmc@gmail.com" || user.email === "hoquenuwaisir@gmail.com" || isSuperadminVerified) && (
              <div className="flex flex-col items-center justify-center">
                <span className="text-[8px] font-bold text-amber-400 uppercase tracking-widest leading-none mb-1 select-none">
                  Not for students
                </span>
                <button
                  onClick={() => { playSound("click"); handleAdminNavigation(); }}
                  className={`py-2 px-3.5 rounded text-[#FFD700] border border-[#FFD700]/30 transition font-display uppercase tracking-wider ${
                    activeTab === "admin"
                      ? "bg-[#FFD700] text-black border-[#FFD700]"
                      : "hover:bg-white/5"
                  }`}
                  id="btn-nav-desktop-admin"
                >
                  {t.commandCenter}
                </button>
              </div>
            )}
          </div>

          {/* User Fast Metrics Box */}
          <div className="hidden md:flex items-center gap-4 text-xs font-mono">
            {/* Realtime database sync & connection state indicator */}
            {renderSyncStatusBadge(false)}

            {/* Courses Store Quick Button */}
            <button
              onClick={() => { playSound("click"); setActiveTab("courses"); }}
              className={`flex items-center gap-1.5 border px-3.5 py-1.5 rounded-full font-black text-[11.5px] cursor-pointer select-none transition-all duration-300 ${
                activeTab === "courses"
                  ? "bg-gradient-to-r from-red-650 to-[#C1121F] border-red-500 text-white shadow-[0_0_12px_rgba(193,18,31,0.4)]"
                  : "bg-white/5 hover:bg-white/10 border-white/10 text-gray-200 hover:border-[#C1121F]/60"
              }`}
              id="btn-desktop-go-courses"
              title={language === "bn" ? "কোর্স স্টোরে যান" : "Browse Courses"}
            >
              <span>🎓</span>
              <span>
                {language === "bn" ? "কোর্সসমূহ" : "COURSES"}
              </span>
            </button>

            {/* Dynamic Language selector */}
            <button
              onClick={() => setLanguage(language === "bn" ? "en" : "bn")}
              className={`flex items-center gap-1.5 border px-3 py-1.5 rounded-full font-bold transition text-[11px] cursor-pointer ${
                isDark
                  ? "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-yellow-500"
                  : "bg-red-50 border-red-100 text-slate-700 hover:bg-red-100 hover:border-[#C1121F]"
              }`}
              id="btn-lang-toggle"
            >
              <span>🌐</span>
              <span>{language === "bn" ? "ENGLISH" : "বাংলা"}</span>
            </button>

            <div className={`flex items-center gap-1.5 border px-4 py-2 rounded-full font-bold ${
              isDark
                ? "bg-white/5 border-white/10 text-[#FFD700]"
                : "bg-amber-50 border-amber-200 text-amber-600 shadow-sm"
            }`}>
              <span className="text-sm">🪙</span>
              <span className="font-extrabold">{user.coins || 100} {t.coins}</span>
            </div>
            
            <div className={`flex items-center gap-1.5 border px-3.5 py-1.5 rounded-full font-bold shadow-sm ${
              isDark
                ? "bg-[#C1121F]/10 border-[#C1121F]/30 text-white shadow-[0_0_10px_rgba(193,18,31,0.2)]"
                : "bg-red-50 border-red-150 text-[#C1121F]"
            }`}>
              <span className="text-sm animate-pulse">🔥</span>
              <span className="font-extrabold">{user.dailyStreak || 1}{t.streak}</span>
            </div>

            {/* Notification Bell Component */}
            <NotificationBell
              userId={user.uid}
              theme={theme}
              language={language}
              setActiveTab={setActiveTab}
              onNotificationNavigate={handleNotificationNavigation}
            />
            
            <button
              onClick={logoutAction}
              className={`p-2 border rounded-lg transition ${
                isDark
                  ? "border-gray-800 hover:border-[#C1121F] hover:bg-[#C1121F]/15 text-gray-400 hover:text-white"
                  : "border-red-100 hover:border-[#C1121F] hover:bg-[#C1121F]/10 text-slate-500 hover:text-[#C1121F]"
              }`}
              title="Logout session"
              id="btn-logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile responsive toggle */}
          <div className="lg:hidden flex items-center gap-2 sm:gap-3">
            {renderSyncStatusBadge(true)}

            {/* Notification Bell on Mobile - placed directly beside the menu toggle */}
            <NotificationBell
              userId={user.uid}
              theme={theme}
              language={language}
              setActiveTab={setActiveTab}
              onNotificationNavigate={handleNotificationNavigation}
            />

            <button
              onClick={() => {
                playSound("click");
                setMobileMenuOpen(!mobileMenuOpen);
              }}
              className="w-11 h-11 flex items-center justify-center border border-indigo-500/20 rounded-xl bg-slate-950/40 hover:bg-slate-900/60 text-gray-300 hover:text-white transition-all duration-300 active:scale-95 relative z-[120]"
              id="btn-nav-mobile-toggle"
              aria-label="Toggle Menu"
            >
              <div className="w-6 h-5 relative flex flex-col justify-between">
                <motion.span
                  animate={{
                    rotate: mobileMenuOpen ? 45 : 0,
                    y: mobileMenuOpen ? 9 : 0,
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="block h-[2.5px] w-6 bg-current rounded-full origin-center"
                />
                <motion.span
                  animate={{
                    opacity: mobileMenuOpen ? 0 : 1,
                    x: mobileMenuOpen ? -10 : 0
                  }}
                  transition={{ duration: 0.15 }}
                  className="block h-[2.5px] w-6 bg-current rounded-full"
                />
                <motion.span
                  animate={{
                    rotate: mobileMenuOpen ? -45 : 0,
                    y: mobileMenuOpen ? -9 : 0,
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="block h-[2.5px] w-6 bg-current rounded-full origin-center"
                />
              </div>
            </button>
          </div>
        </div>
      </nav>

      {/* MOBILE RESPONSIVE NAV DROPDOWN PANEL (MODERN HIGH-END SLIDE-OUT OVERLAY) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop Blur Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.75 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/85 z-[100]"
            />
            
            {/* Left Sliding Drawer */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", ease: "easeOut", duration: 0.25 }}
              className="lg:hidden fixed top-0 left-0 bottom-0 w-[88%] max-w-[400px] h-full bg-[#070c16] border-r border-indigo-500/15 shadow-[0_0_50px_rgba(0,0,0,0.85)] z-[110] flex flex-col justify-between overflow-hidden will-change-transform translate-z-0"
            >
              {/* Top Banner / Header */}
              <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#070c16]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                  <span className="text-xs font-mono font-black tracking-[0.2em] text-gray-300 uppercase">
                    {language === "bn" ? "কমান্ড ডেক" : "COMMAND HUB"}
                  </span>
                </div>
              </div>

              {/* Scrollable Content Container */}
              <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5 custom-scrollbar pb-10">
                
                {/* 👤 Futuristic Pilot HUD Profile Card */}
                {user && (
                  <div className="relative overflow-hidden bg-gradient-to-br from-white/[0.04] to-transparent border border-white/5 rounded-2xl p-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
                    {/* Decorative glowing backlights */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#FFD700]/5 rounded-full blur-2xl pointer-events-none" />

                    <div className="flex items-center gap-3.5 relative z-10">
                      <div className="relative">
                        {/* Animated neon circular aura */}
                        <div className={`absolute inset-0 rounded-full blur-sm scale-105 animate-pulse ${user.isPremium ? "bg-yellow-500/30" : "bg-red-500/20"}`} />
                        <img
                          src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`}
                          alt="Avatar"
                          className={`w-12 h-12 rounded-full bg-black relative z-10 border-2 ${user.isPremium ? "border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.4)]" : "border-[#C1121F] shadow-[0_0_12px_rgba(193,18,31,0.3)]"}`}
                        />
                        {user.isPremium && (
                          <span className="absolute -top-1 -right-1 bg-yellow-500 text-black text-[9px] font-black rounded-full w-4.5 h-4.5 flex items-center justify-center border border-black z-20 animate-bounce">
                            ♛
                          </span>
                        )}
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-black text-white truncate normal-case tracking-wide">{user.displayName}</span>
                          <span className="bg-red-500/15 text-red-400 border border-red-500/20 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase font-mono shrink-0">
                            Lvl {user.level || 1}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-400 block truncate font-mono mt-0.5 normal-case">
                          {user.college || (language === "bn" ? "মেডিকেল ভর্তি ক্যান্ডিডেট" : "Medical Aspirant")}
                        </span>
                      </div>
                    </div>

                    {/* Level Progress Section */}
                    <div className="space-y-1.5 mt-4 relative z-10">
                      <div className="flex justify-between text-[9px] font-mono font-bold text-gray-400">
                        <span className="tracking-wider">XP: {user.xp || 150} / {nextLevelXp || 1000}</span>
                        <span className="text-red-400 font-extrabold">{Math.round(levelProgressPct || 15)}%</span>
                      </div>
                      <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden border border-white/5">
                        <div
                          className="h-full bg-gradient-to-r from-[#C1121F] via-red-500 to-amber-500 rounded-full transition-all duration-500"
                          style={{ width: `${levelProgressPct || 15}%` }}
                        />
                      </div>
                    </div>

                    {/* Stat Chips Grid */}
                    <div className="grid grid-cols-2 gap-2 mt-4 relative z-10">
                      <div className="bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2 flex items-center justify-between">
                        <span className="text-[9px] text-gray-500 font-mono font-bold tracking-wider">COINS</span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs">🪙</span>
                          <span className="text-xs font-black text-yellow-500 font-mono">{user.coins || 100}</span>
                        </div>
                      </div>
                      <div className="bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2 flex items-center justify-between">
                        <span className="text-[9px] text-gray-500 font-mono font-bold tracking-wider">STREAK</span>
                        <div className="flex items-center gap-1 font-mono">
                          <span className="text-xs animate-pulse">🔥</span>
                          <span className="text-xs font-black text-amber-500">{user.dailyStreak || 1}D</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick Toggle Controls Grid */}
                {user && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        playSound("click");
                        setLanguage(language === "bn" ? "en" : "bn");
                        setMobileMenuOpen(false);
                      }}
                      className="py-2.5 px-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 flex items-center justify-center gap-2 cursor-pointer transition active:scale-95 text-gray-300 hover:text-white shadow-sm"
                    >
                      <span className="text-sm">🌐</span>
                      <span className="text-[9px] font-black tracking-wider font-mono">
                        {language === "bn" ? "ENGLISH VERSION" : "বাংলা ভার্সন"}
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        playSound("click");
                        setActiveTab("courses");
                        setMobileMenuOpen(false);
                      }}
                      className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition active:scale-95 text-[9px] font-black tracking-wider ${
                        activeTab === "courses"
                          ? "bg-gradient-to-r from-[#C1121F] to-red-650 border border-red-500 text-white shadow-lg shadow-red-950/20"
                          : "bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 text-gray-300 hover:text-white"
                      }`}
                    >
                      <span className="text-sm">🎓</span>
                      <span className="font-mono">
                        {language === "bn" ? "সকল কোর্স" : "ALL COURSES"}
                      </span>
                    </button>
                  </div>
                )}

                {/* Grouped Tab Channels (Bento Grid Redesign) */}
                {[
                  {
                    title: language === "bn" ? "গেমিং ও আর্কেড কোর্স" : "ARCADE & GAMING ARENA",
                    glow: "border-amber-500/30 text-amber-400 bg-amber-500/5",
                    bulletColor: "bg-amber-500",
                    items: [
                      { id: "gaming", name: language === "bn" ? "গেমিং অ্যারেনা 🎮" : "Gaming Arena 🎮", icon: Gamepad2, badge: "FREE", desc: language === "bn" ? "১০টি মেডিকেল গেম ও স্পিড আর্কেড" : "10 Interactive arcade games" },
                    ]
                  },
                  {
                    title: language === "bn" ? "কোর্স ও একাডেমি" : "ACADEMY & COURSES",
                    glow: "border-purple-500/30 text-purple-400 bg-purple-500/5",
                    bulletColor: "bg-purple-500",
                    items: [
                      { id: "courses", name: language === "bn" ? "কোর্সসমূহ" : "All Courses", icon: BookOpen, badge: "STORE", desc: language === "bn" ? "কোর্সের তথ্য ও ভর্তি" : "Explore & enroll" },
                      { id: "my_courses", name: language === "bn" ? "আমার কোর্স" : "My Learning", icon: Book, badge: "LEARN", desc: language === "bn" ? "এনরোল করা কোর্স" : "Enrolled courses" },
                    ]
                  },
                  {
                    title: language === "bn" ? "প্রধান হাব" : "MAIN CORE HUB",
                    glow: "border-cyan-500/30 text-cyan-400 bg-cyan-500/5",
                    bulletColor: "bg-cyan-500",
                    items: [
                      { id: "dashboard", name: t.dashboardOn, icon: User, badge: null, desc: language === "bn" ? "আপনার প্রোফাইল" : "Personal profile" },
                      { id: "analytics", name: language === "bn" ? "অ্যানালিটিক্স" : "Analytics", icon: BarChart3, badge: "STATS", desc: language === "bn" ? "অগ্রগতি চার্ট" : "Performance tracker" },
                      { id: "mentor", name: t.medisenseAi, icon: Bot, badge: "MENTOR", desc: language === "bn" ? "পার্সোনাল মেন্টর" : "Personal mentor desk" },
                    ]
                  },
                  {
                    title: language === "bn" ? "অনুশীলন ও যুদ্ধ ক্ষেত্র" : "COMBAT & DRILLS",
                    glow: "border-red-500/30 text-red-400 bg-red-500/5",
                    bulletColor: "bg-red-500",
                    items: [
                      { id: "practice", name: t.combatArena, icon: Target, badge: "SOLVE", desc: language === "bn" ? "লাইভ যুদ্ধ ক্ষেত্র" : "Live battlefield" },
                      { id: "exambatch", name: language === "bn" ? "এক্সাম ব্যাচ পোর্টাল" : "Exam Batches", icon: Rocket, badge: "BATCH", desc: language === "bn" ? "ব্যাচে এনরোল ও পেমেন্ট" : "Batch store & payment" },
                      { id: "anushiloni", name: language === "bn" ? "অনুশীলনী MCQ" : "Anushiloni", icon: Book, badge: "STUDY", desc: language === "bn" ? "বইয়ের অধ্যায় MCQ" : "Textbook MCQs" },
                    ]
                  },
                  {
                    title: language === "bn" ? "ম্যাট প্রস্তুতি" : "MAT CHANNELS",
                    glow: "border-emerald-500/30 text-emerald-400 bg-emerald-500/5",
                    bulletColor: "bg-emerald-500",
                    items: [
                      { id: "gk", name: language === "bn" ? "ম্যাট জিকে" : "MAT GK", icon: MapIcon, badge: "GK", desc: language === "bn" ? "সাধারণ জ্ঞান" : "General knowledge" },
                      { id: "english", name: language === "bn" ? "ম্যাট ইংলিশ" : "MAT English", icon: BookOpen, badge: "ENG", desc: language === "bn" ? "ইংরেজি ব্যাকরণ" : "English grammar" },
                    ]
                  },
                  {
                    title: language === "bn" ? "লিডারবোর্ড ও অনুপ্রেরণা" : "GLADIATORS & HEROES",
                    glow: "border-amber-500/30 text-amber-400 bg-amber-500/5",
                    bulletColor: "bg-amber-500",
                    items: [
                      { id: "heroes", name: language === "bn" ? "কৃতি শিক্ষার্থী" : "Our Heroes", icon: Award, badge: "HALL OF FAME", desc: language === "bn" ? "মেডিব্রিজ চান্সপ্রাপ্তদের অনুপ্রেরণা ও স্টোরি" : "DMC & Medical Achievers Hall of Fame" },
                      { id: "social", name: t.feedSquads, icon: MessageSquare, badge: "SQUAD", desc: language === "bn" ? "ফিড, স্কোয়াড ও ডাউট সমাধান" : "Doubt solve, squads & feed" },
                      { id: "leaderboard", name: t.warsBoard, icon: Trophy, badge: "WARS", desc: language === "bn" ? "গ্ল্যাডিয়েটর র‍্যাংক" : "Leaderboard list" },
                    ]
                  }
                ].map((section, sIdx) => (
                  <div key={sIdx} className="space-y-2">
                    {/* Category Label */}
                    <div className="flex items-center gap-2 px-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${section.bulletColor} shadow-[0_0_6px_currentColor]`} />
                      <span className="text-[9px] tracking-widest text-gray-400 font-extrabold font-mono uppercase">
                        {section.title}
                      </span>
                      <div className="flex-1 h-px bg-white/5" />
                    </div>
                    
                    {/* Section Items Stack */}
                    <div className="space-y-2">
                      {section.items.map((tab, idx) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                          <motion.button
                            key={tab.id}
                            initial={{ opacity: 0, x: 15 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 15 }}
                            transition={{ delay: 0.05 + (sIdx * 0.05) + (idx * 0.02) }}
                            onClick={() => {
                              playSound("click");
                              setActiveTab(tab.id as any);
                              setMobileMenuOpen(false);
                            }}
                            className={`w-full text-left p-3 rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-between border relative overflow-hidden active:scale-98 group ${
                              isActive
                                ? "bg-gradient-to-r from-[#C1121F] to-red-750 text-white border-transparent shadow-lg shadow-red-950/30 font-black"
                                : "bg-white/[0.01] border-white/5 text-gray-300 hover:text-white hover:bg-white/[0.04]"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {/* Left icon wrapper */}
                              <div className={`p-2 rounded-xl transition-colors duration-200 ${isActive ? "bg-white/20" : "bg-white/5 text-red-500 group-hover:bg-red-500/10"}`}>
                                <Icon className="w-4 h-4 shrink-0" />
                              </div>
                              
                              <div className="flex flex-col">
                                <span className="text-[11px] font-extrabold tracking-wide uppercase">
                                  {tab.name}
                                </span>
                                <span className={`text-[9px] font-medium tracking-normal lowercase normal-case mt-0.5 ${isActive ? "text-white/70" : "text-gray-500"}`}>
                                  {tab.desc}
                                </span>
                              </div>
                            </div>

                            {/* Badge or Right indicator */}
                            <div className="flex items-center gap-1.5">
                              {tab.badge && !isActive && (
                                <span className="text-[8px] tracking-wider bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded text-red-400 font-mono font-black">
                                  {tab.badge}
                                </span>
                              )}
                              <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${isActive ? "text-white" : "text-gray-600 group-hover:text-gray-400 group-hover:translate-x-0.5"}`} />
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Restricted Admin entry */}
                {user && (user.role === "admin" || user.role === "superadmin" || user.role === "moderator" || user.email === "nuwaisirhoquesbmc@gmail.com" || user.email === "hoquenuwaisir@gmail.com" || isSuperadminVerified) && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse shadow-[0_0_6px_#eab308]" />
                      <span className="text-[9px] tracking-widest text-yellow-500/80 font-extrabold font-mono uppercase">
                        {language === "bn" ? "অ্যাডমিন কমান্ড" : "ADMINISTRATION"}
                      </span>
                      <div className="flex-1 h-px bg-yellow-500/10" />
                    </div>
                    <div className="flex flex-col items-center w-full">
                      <span className="text-[8.5px] font-bold text-amber-400 uppercase tracking-widest leading-none mb-1 select-none">
                        Not for students
                      </span>
                      <motion.button
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        onClick={() => {
                          playSound("click");
                          handleAdminNavigation();
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full py-3 px-4 rounded-xl text-center border transition-all cursor-pointer font-extrabold uppercase text-[10px] tracking-wider flex items-center justify-center gap-2 ${
                          activeTab === "admin"
                            ? "bg-yellow-500 text-black border-transparent font-black shadow-lg shadow-yellow-950/20"
                            : "bg-yellow-500/5 text-[#FFD700] border-[#FFD700]/20 hover:bg-yellow-500/10"
                        }`}
                      >
                        <Shield className="w-4 h-4 shrink-0" />
                        <span>{t.commandCenter}</span>
                      </motion.button>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Footer Area */}
              <div className="p-4 border-t border-white/5 bg-[#050810] space-y-3.5">
                {/* Motivation Tip Box */}
                <div className="bg-white/[0.01] border border-white/5 rounded-xl p-3 flex items-start gap-2.5">
                  <span className="text-sm shrink-0">💡</span>
                  <p className="text-[9.5px] leading-relaxed text-gray-400 font-medium">
                    {language === "bn" 
                      ? "টিপ: মেডিকেলে চান্স পাওয়ার লড়াইয়ে প্রতিটি ভুল সংশোধন আপনাকে কাঙ্ক্ষিত লক্ষ্যের কাছাকাছি নিয়ে যায়!" 
                      : "Tip: Every single mistake you analyze and correct brings you closer to your dream medical college seat!"}
                  </p>
                </div>

                <div className="flex items-center justify-between text-gray-500">
                  <span className="text-[8.5px] font-mono tracking-wider">
                    MEDIBRIDGE v2.4 • MOBILE CENTER
                  </span>
                  <button
                    onClick={() => {
                      playSound("click");
                      logoutAction();
                      setMobileMenuOpen(false);
                    }}
                    className="text-[#C1121F] hover:text-red-400 font-mono text-[9.5px] font-black uppercase tracking-widest flex items-center gap-1 cursor-pointer transition active:scale-95"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{language === "bn" ? "লগআউট" : "LOGOUT"}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* MOBILE FIXED BOTTOM NAVIGATION BAR */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 h-16 bg-[#0d1222] border-t border-indigo-500/15 z-50 flex items-center justify-around px-2 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.4)]">
        {[
          { id: "dashboard", name: t.dashboardOn, icon: User },
          { id: "practice", name: t.combatArena, icon: Target },
          { id: "social", name: t.feedSquads, icon: MessageSquare },
          { id: "leaderboard", name: t.warsBoard, icon: Trophy },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                playSound("click");
                setActiveTab(tab.id as any);
                setMobileMenuOpen(false);
              }}
              className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-all duration-200 ${
                isActive 
                  ? "text-[#C1121F] scale-105" 
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "drop-shadow-[0_0_8px_rgba(193,18,31,0.5)] text-red-500" : ""}`} />
              <span className="text-[9px] font-mono font-bold tracking-tight uppercase truncate max-w-[64px]">
                {tab.id === "dashboard" 
                  ? (language === "bn" ? "প্রোফাইল" : "Profile") 
                  : tab.id === "social"
                    ? (language === "bn" ? "ফিড ও ডাউট" : "Feed & Doubt")
                    : tab.name.split(" ")[0]
                }
              </span>
            </button>
          );
        })}
        
        {/* The 3-dot "More" trigger */}
        <button
          onClick={() => {
            playSound("click");
            setMobileMenuOpen(!mobileMenuOpen);
          }}
          className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-all duration-200 ${
            mobileMenuOpen 
              ? "text-[#C1121F] scale-105" 
              : "text-gray-400 hover:text-white"
          }`}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[9px] font-mono font-bold tracking-tight uppercase">
            {language === "bn" ? "আরো" : "MORE"}
          </span>
        </button>
      </div>

      {/* MAIN LAYOUT WRAPPER */}
      <main className="max-w-7xl mx-auto px-3.5 sm:px-6 py-4 sm:py-8 pb-24 lg:pb-8 flex-1 w-full flex flex-col gap-6 sm:gap-8 relative z-10">
        
        {/* ACTIVE TAB: STUDENT DASHBOARD */}
        {activeTab === "dashboard" && (
          <DashboardOverview
            user={user}
            language={language}
            theme={theme}
            enrollments={enrollmentsList}
            updateDocInProfile={updateDocInProfile}
            setIsEditProfileOpen={setIsEditProfileOpen}
            setIsPremiumModalOpen={setIsPremiumModalOpen}
            rivalProfile={rivalProfile}
            notices={notices}
            battleLogs={battleLogs}
            setSelectedReplayBattle={setSelectedReplayBattle}
            setActiveChallengeRival={setActiveChallengeRival}
            setActiveTab={setActiveTab}
            levelProgressPct={levelProgressPct}
            nextLevelXp={nextLevelXp}
          />
        )}

        {((activeTab as any) === "disabled_old_dashboard") && (
          <div className="grid lg:grid-cols-3 gap-8">
            
            {/* COLUMN 1: Profile Card HUD & Character Deck */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              
              {/* Profile Card & XP gauges */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className={`border rounded-2xl p-6 relative overflow-hidden shadow-xl ${
                  isDark
                    ? "bg-gradient-to-r from-[#1A1A1A] to-[#111111] border-white/10 text-white"
                    : "bg-white border-red-150 shadow-[0_8px_30px_rgba(193,18,31,0.06)] text-slate-800"
                }`}
              >
                <div className="absolute top-0 inset-x-0 h-1 bg-[#C1121F]"></div>
                
                {/* Profile row */}
                <div className={`flex items-center gap-4 border-b pb-5 mb-5 relative z-10 ${isDark ? "border-white/5" : "border-red-100/50"}`}>
                  <div 
                    onClick={() => { playSound("click"); setIsEditProfileOpen(true); }}
                    className="relative shrink-0 cursor-pointer group"
                    title={language === "bn" ? "প্রোফাইল ছবি পরিবর্তন করুন" : "Change avatar image"}
                  >
                    <img
                      src={user.avatarUrl}
                      alt="avatar"
                      className={`w-16 h-16 rounded-full border-2 bg-[#111111] p-1 shrink-0 transition-all duration-300 group-hover:scale-104 ${
                        user.isPremium 
                          ? "border-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.6)] ring-2 ring-yellow-500/20" 
                          : "border-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.25)]"
                      }`}
                    />
                    <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-15">
                      <Camera className="w-4 h-4 text-white" />
                    </div>
                    {user.isPremium && (
                      <div className="absolute -top-1.5 -right-1.5 bg-yellow-500 text-black text-[9px] w-5 h-5 rounded-full flex items-center justify-center font-bold shadow-md border border-yellow-300 animate-bounce z-20">
                        👑
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className={`font-extrabold text-lg leading-tight uppercase flex items-center gap-1.5 font-display tracking-tight ${
                      isDark ? "text-white" : "text-slate-900"
                    }`}>
                      <span className="truncate">{user.displayName}</span>
                      {user.isPremium && (
                        <span className="text-[8.5px] bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 text-black px-1.5 py-0.5 rounded font-mono font-black tracking-widest leading-none shadow-[0_2px_5px_rgba(234,179,8,0.3)] shrink-0 select-none animate-pulse">
                          PRO
                        </span>
                      )}
                    </h3>
                    <span className={`text-[10px] font-mono block truncate ${isDark ? "text-gray-400" : "text-slate-600"} mb-1.5`}>{user.college}</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <RankBadge rank={user.rank || "Freshman"} theme={theme} language={language} />
                      <button
                        type="button"
                        onClick={() => { playSound("click"); setIsEditProfileOpen(true); }}
                        className={`text-[9.5px] font-mono font-semibold px-2 py-0.5 rounded border transition-all flex items-center gap-1 cursor-pointer hover:scale-[1.02] ${
                          isDark
                            ? "border-white/10 bg-white/5 hover:bg-white/11 text-gray-300 hover:text-white"
                            : "border-gray-200 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-black"
                        }`}
                      >
                        <Settings className="w-2.5 h-2.5 text-[#C1121F]" />
                        <span>{language === "bn" ? "সংশোধন করুন" : "EDIT BIO"}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Level metrics details */}
                <div className="flex flex-col gap-2 font-mono text-xs z-10 relative">
                  <div className="flex justify-between items-center text-[11px] uppercase">
                     <span className={isDark ? "text-gray-400 font-bold" : "text-slate-500 font-bold"}>LEVEL PROGRESSION:</span>
                     <span className="text-[#FFD700] font-black">Lvl {user.level}</span>
                  </div>
                  <div className={`w-full h-3.5 rounded-full overflow-hidden border flex-1 relative flex items-center justify-center ${
                    isDark ? "bg-[#0A0A0A] border-white/5" : "bg-red-50 border-red-150"
                  }`}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${levelProgressPct}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="bg-gradient-to-r from-[#C1121F] to-[#FFD700] h-full absolute left-0"
                    ></motion.div>
                    <span className="text-[9.5px] text-white font-black relative z-10 leading-none">{user.xp} / {nextLevelXp} Marks</span>
                  </div>
                  <span className={`text-[10px] text-center block leading-normal mt-1.5 ${isDark ? "text-gray-500" : "text-slate-500"}`}>
                    Gain **{nextLevelXp - user.xp} XP** to unlock level {user.level + 1} spoils.
                  </span>
                </div>

                {/* Division Sector tag */}
                <div className={`border rounded-xl p-3.5 mt-5 flex justify-between items-center text-xs font-mono ${
                  isDark ? "bg-black/60 border-white/5 text-white" : "bg-red-50/50 border-red-100 text-slate-800"
                }`}>
                  <span className={`uppercase font-bold text-[10px] ${isDark ? "text-gray-400" : "text-slate-500"}`}>{language === "bn" ? "বিভাগীয় সেক্টর:" : "Division Sector:"}</span>
                  <span className="font-extrabold">{user.district || "Dhaka"} Core</span>
                </div>
              </motion.div>

              {/* Premium Status Widget inside Column 1 */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className={`border rounded-2xl p-5 relative overflow-hidden shadow-lg ${
                  isDark
                    ? "bg-[#111111] border-white/10"
                    : "bg-white border-red-150"
                }`}
              >
                <div className="absolute top-0 right-0 p-3">
                  <span className="text-2xl">🎓</span>
                </div>
                <h4 className="text-xs font-black tracking-widest font-mono text-[#FFD700] uppercase mb-2">
                  {language === "bn" ? "নিবন্ধিত কোর্স ও ব্যাচ" : "ENROLLED COURSES & BATCHES"}
                </h4>
                {enrollmentsList.filter((e) => e.userId === user.uid).length > 0 ? (
                  <div className="flex flex-col gap-2">
                    <span className="text-emerald-500 font-extrabold text-xs uppercase flex items-center gap-1.5 font-mono">
                      ● {language === "bn" ? `${enrollmentsList.filter((e) => e.userId === user.uid).length}টি কোর্সে এনরোল্ড` : `${enrollmentsList.filter((e) => e.userId === user.uid).length} Active Enrolled Courses`}
                    </span>
                    <p className="text-[10px] text-gray-400 leading-normal">
                      {language === "bn" ? "আপনার নিবন্ধিত কোর্স ড্যাশবোর্ড, পরীক্ষার রুটিন এবং অগ্রগতি দেখুন।" : "Access active lecture sheets, exams, and mistake banks."}
                    </p>
                    <button
                      onClick={() => { playSound("click"); setActiveTab("my_courses"); }}
                      className="w-full py-2.5 mt-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-black font-extrabold text-[10px] uppercase tracking-wider rounded-xl hover:scale-[1.02] transition-transform font-mono shadow-[0_4px_10px_rgba(16,185,129,0.3)] cursor-pointer"
                    >
                      {language === "bn" ? "আমার কোর্সে যান 📖" : "GO TO MY COURSES 📖"}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    <p className="text-[10px] text-slate-500 dark:text-gray-400 leading-normal">
                      {language === "bn"
                        ? "মেডিকেল ভর্তি পরীক্ষার প্রস্তুতি শতভাগ মজবুত করতে আমাদের স্পেশাল এক্সাম ব্যাচ ও কোর্সে ভর্তি হন।"
                        : "Enroll in high-yield medical admission exam batches and model test programs."}
                    </p>
                    <button
                      onClick={() => { playSound("click"); setActiveTab("courses"); }}
                      className="w-full py-2.5 bg-gradient-to-r from-[#C1121F] to-red-600 border border-red-500 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl hover:scale-[1.02] transition-transform font-mono shadow-[0_4px_10px_rgba(193,18,31,0.3)] cursor-pointer"
                    >
                      {language === "bn" ? "কোর্সসমূহ দেখুন 🎓" : "BROWSE COURSES 🎓"}
                    </button>
                  </div>
                )}
              </motion.div>



            </div>

            {/* COLUMN 2 & 3: Progress rings, combat alerts feeds, and news notices */}
            <div className="lg:col-span-2 flex flex-col gap-8">

              {/* Dashboard Sub-Tabs switcher */}
              <div className={`flex border-b pb-2 justify-start gap-6 text-xs font-display uppercase tracking-wider font-extrabold overflow-x-auto whitespace-nowrap scrollbar-none ${
                isDark ? "border-white/5" : "border-red-150/30"
              }`}>
                <button
                  onClick={() => { playSound("click"); setDashSubTab("overview"); }}
                  className={`pb-2.5 relative transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    dashSubTab === "overview"
                      ? "text-[#C1121F] dark:text-white"
                      : "text-gray-400 hover:text-gray-300"
                  }`}
                  id="tab-dash-overview-trigger"
                >
                  <span>📊 {language === "bn" ? "ওভারভিউ হাব" : "Overview Hub"}</span>
                  {dashSubTab === "overview" && (
                    <motion.div layoutId="dashActiveLine" className="absolute bottom-0 inset-x-0 h-0.5 bg-[#C1121F]"></motion.div>
                  )}
                </button>
                <button
                  onClick={() => { playSound("click"); setDashSubTab("roadmap"); }}
                  className={`pb-2.5 relative transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    dashSubTab === "roadmap"
                      ? "text-[#C1121F] dark:text-white"
                      : "text-gray-400 hover:text-gray-300"
                  }`}
                  id="tab-dash-roadmap-trigger"
                >
                  <span>🗺️ {language === "bn" ? "প্রস্তুতি রোডম্যাপ" : "Preparation Roadmap"}</span>
                  <span className="text-[8px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.2 rounded normal-case font-mono tracking-normal leading-none shrink-0 animate-pulse font-black">
                    NEW
                  </span>
                  {dashSubTab === "roadmap" && (
                    <motion.div layoutId="dashActiveLine" className="absolute bottom-0 inset-x-0 h-0.5 bg-[#C1121F]"></motion.div>
                  )}
                </button>
              </div>

              {dashSubTab === "roadmap" && (
                <PreparationRoadmap
                  user={user}
                  onProfileUpdate={updateDocInProfile}
                  language={language}
                  theme={theme}
                />
              )}

              {dashSubTab === "overview" && (
                <>
                  {/* Study Progress HUD Rings & Badges */}
                  <div className="grid md:grid-cols-3 gap-6">
                
                {/* Metric 1 */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.1 }}
                  className={`p-5 rounded-2xl border transition-all duration-300 flex items-center gap-4 relative shadow ${
                    isDark
                      ? "bg-[#111111] border-white/10 hover:border-[#C1121F]"
                      : "bg-white border-red-150 shadow-sm hover:border-[#C1121F] text-slate-800"
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/30 border border-[#C1121F]/20 flex items-center justify-center text-2xl shrink-0">
                    ⚔️
                  </div>
                  <div>
                    <span className={`text-[10px] uppercase font-mono font-bold block leading-none ${isDark ? "text-gray-400" : "text-slate-505"}`}>Solved Trials:</span>
                    <span className={`text-xl font-extrabold block mt-1.5 font-display ${isDark ? "text-white" : "text-slate-900"}`}>{user.questionsSolved || 0} Qs</span>
                    <span className="text-[9px] text-gray-450 block font-mono">National aggregate</span>
                  </div>
                </motion.div>

                {/* Metric 2 */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.18 }}
                  className={`p-5 rounded-2xl border transition-all duration-300 flex items-center gap-4 relative shadow ${
                    isDark
                      ? "bg-[#111111] border-white/10 hover:border-[#FFD700]"
                      : "bg-white border-red-150 shadow-sm hover:border-yellow-400 text-slate-800"
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-yellow-50 dark:bg-yellow-950/20 border border-[#FFD700]/20 flex items-center justify-center text-2xl shrink-0">
                    🎯
                  </div>
                  <div>
                    <span className={`text-[10px] uppercase font-mono font-bold block leading-none ${isDark ? "text-gray-400" : "text-slate-505"}`}>Mocks Accuracy:</span>
                    <span className={`text-xl font-extrabold block mt-1.5 font-display ${isDark ? "text-white" : "text-slate-900"}`}>
                      {user.questionsSolved > 0 ? Math.round((user.questionsCorrect / user.questionsSolved) * 100) : 0}% Acc
                    </span>
                    <span className="text-[9px] text-gray-450 block font-mono">Cutoff: 65% Marks</span>
                  </div>
                </motion.div>

                {/* Metric 3 */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.25 }}
                  className={`p-5 rounded-2xl border transition-all duration-300 flex items-center gap-4 relative shadow ${
                    isDark
                      ? "bg-[#111111] border-white/10 hover:border-[#C1121F]"
                      : "bg-white border-red-150 shadow-sm hover:border-[#C1121F] text-slate-800"
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-[#FFD700]/10 border border-[#FFD700]/20 flex items-center justify-center text-2xl animate-pulse shrink-0">
                    🔥
                  </div>
                  <div>
                    <span className={`text-[10px] uppercase font-mono font-bold block leading-none ${isDark ? "text-gray-400" : "text-slate-505"}`}>Streaks Multiplier:</span>
                    <span className={`text-xl font-extrabold block mt-1.5 font-display ${isDark ? "text-white" : "text-slate-900"}`}>+{user.dailyStreak || 1}d Streak</span>
                    <span className="text-[9px] text-gray-450 block font-mono">Continuous Grind</span>
                  </div>
                </motion.div>
              </div>

              {/* Rivalry Comparison Arena */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className={`border rounded-2xl p-6 relative shadow-lg ${
                  isDark ? "bg-[#111111] border-white/10" : "bg-white border-red-150 shadow-[0_8px_30px_rgba(193,18,31,0.06)]"
                }`}
              >
                <div className="absolute top-0 left-6 h-1 w-20 bg-[#C1121F]"></div>
                
                <div className={`flex justify-between items-center border-b pb-3 mb-5 ${isDark ? "border-white/5" : "border-red-150/35"}`}>
                  <h3 className={`font-extrabold text-sm uppercase flex items-center gap-2 font-display ${isDark ? "text-white" : "text-slate-900"}`}>
                    <Swords className="w-4 h-4 text-[#C1121F]" /> 
                    {language === "bn" ? "প্রতিদ্বন্দ্বী যুদ্ধক্ষেত্র" : "RIVALRY ARENA"}
                  </h3>
                  <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest leading-none">
                    {language === "bn" ? "লাইভ তুলনা" : "LIVE COMPARISON"}
                  </span>
                </div>

                {user.pinnedRivalId && rivalProfile ? (
                  <div className="flex flex-col gap-6">
                    {/* Head head Duel Grid */}
                    <div className="grid grid-cols-7 items-center gap-2 md:gap-4">
                      
                      {/* Current User Stats */}
                      <div className="col-span-3 text-center flex flex-col items-center">
                        <div className="relative mb-2">
                          <img
                            src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`}
                            alt="Your Avatar"
                            className={`w-12 h-12 md:w-16 md:h-16 rounded-full border bg-black shadow-md p-0.5 ${
                              user.xp >= rivalProfile.xp 
                                ? "border-green-500 shadow-green-500/20" 
                                : "border-gray-500"
                            }`}
                          />
                          {user.xp >= rivalProfile.xp && (
                            <span className="absolute -top-1 -right-1 text-xs" title="Leading">👑</span>
                          )}
                        </div>
                        <span className={`text-xs font-black uppercase font-display truncate max-w-full ${isDark ? "text-white" : "text-slate-900"}`}>
                          {user.displayName}
                        </span>
                        <span className="text-[9px] font-mono text-gray-400">
                          {language === "bn" ? "আপনি" : "YOU"}
                        </span>
                      </div>

                      {/* VS Indicator */}
                      <div className="col-span-1 text-center flex flex-col items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-red-950/40 border border-[#C1121F]/20 flex items-center justify-center">
                          <span className="text-xs font-black text-[#C1121F] font-mono animate-pulse">VS</span>
                        </div>
                      </div>

                      {/* Pinned Rival Stats */}
                      <div className="col-span-3 text-center flex flex-col items-center">
                        <div className="relative mb-2">
                          <img
                            src={rivalProfile.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${rivalProfile.uid}`}
                            alt="Rival Avatar"
                            className={`w-12 h-12 md:w-16 md:h-16 rounded-full border bg-black shadow-md p-0.5 ${
                              rivalProfile.xp >= user.xp 
                                ? "border-green-500 shadow-green-500/20" 
                                : "border-gray-500"
                            }`}
                          />
                          {rivalProfile.xp >= user.xp && (
                            <span className="absolute -top-1 -right-1 text-xs" style={{ position: "absolute", top: "-4px", right: "-4px" }} title="Leading">👑</span>
                          )}
                        </div>
                        <span className={`text-xs font-black uppercase font-display truncate max-w-full ${isDark ? "text-white" : "text-slate-900"}`}>
                          {rivalProfile.displayName}
                        </span>
                        <span className="text-[9px] font-mono text-[#C1121F] uppercase font-bold truncate max-w-full">
                          {rivalProfile.college || (language === "bn" ? "কোন কলেজ নির্দিষ্ট নেই" : "No College")}
                        </span>
                      </div>

                    </div>

                    {/* Stat Comparisons Table */}
                    <div className={`rounded-xl p-3 border ${
                      isDark ? "bg-[#0D0D0D] border-white/5" : "bg-red-50/10 border-red-100/50"
                    }`}>
                      <div className="flex flex-col gap-3 font-mono text-[11px]">
                        
                        {/* XP Stats Row */}
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <span className={`font-bold ${user.xp >= rivalProfile.xp ? "text-green-505 font-black text-green-505" : "text-gray-400"}`}>
                            {user.xp} XP
                          </span>
                          <span className="text-gray-500 uppercase tracking-wide text-[9px]">TOTAL EXPERIENCE</span>
                          <span className={`font-bold ${rivalProfile.xp >= user.xp ? "text-green-505 font-black text-green-505" : "text-gray-400"}`}>
                            {rivalProfile.xp} XP
                          </span>
                        </div>

                        {/* Level Stats Row */}
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <span className={`font-bold ${user.level >= (rivalProfile.level || 1) ? "text-green-505 font-black text-green-505" : "text-gray-400"}`}>
                            {language === "bn" ? "লেভেল" : "LVL"} {user.level}
                          </span>
                          <span className="text-gray-500 uppercase tracking-wide text-[9px]">SOLDIER LEVEL</span>
                          <span className={`font-bold ${((rivalProfile.level || 1) >= user.level) ? "text-green-505 font-black text-green-505" : "text-gray-400"}`}>
                            {language === "bn" ? "লেভেল" : "LVL"} {rivalProfile.level || 1}
                          </span>
                        </div>

                        {/* Solved Question Row */}
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <span className={`font-bold ${user.questionsSolved >= (rivalProfile.questionsSolved || 0) ? "text-green-505 font-black text-green-505" : "text-gray-400"}`}>
                            {user.questionsSolved} Qs
                          </span>
                          <span className="text-gray-500 uppercase tracking-wide text-[9px]">SOLVED DRILLS</span>
                          <span className={`font-bold ${(rivalProfile.questionsSolved || 0) >= user.questionsSolved ? "text-green-505 font-black text-green-505" : "text-gray-400"}`}>
                            {rivalProfile.questionsSolved || 0} Qs
                          </span>
                        </div>

                        {/* Accuracy Stats Row */}
                        {(() => {
                          const userAcc = user.questionsSolved > 0 ? Math.round((user.questionsCorrect / user.questionsSolved) * 100) : 0;
                          const rivalAcc = (rivalProfile.questionsSolved || 0) > 0 ? Math.round(((rivalProfile.questionsCorrect || 0) / (rivalProfile.questionsSolved || 1)) * 100) : 0;
                          return (
                            <div className="flex items-center justify-between border-b border-white/5 pb-2">
                              <span className={`font-bold ${userAcc >= rivalAcc ? "text-green-505 font-black text-green-505" : "text-gray-400"}`}>
                                {userAcc}%
                              </span>
                              <span className="text-gray-500 uppercase tracking-wide text-[9px]">ACCURACY RATE</span>
                              <span className={`font-bold ${rivalAcc >= userAcc ? "text-green-505 font-black text-green-505" : "text-gray-400"}`}>
                                {rivalAcc}%
                              </span>
                            </div>
                          );
                        })()}

                        {/* Streak Stats Row */}
                        <div className="flex items-center justify-between pb-1">
                          <span className={`font-bold ${user.dailyStreak >= (rivalProfile.dailyStreak || 0) ? "text-green-505 font-black text-green-505" : "text-gray-400"}`}>
                            {user.dailyStreak} {language === "bn" ? "দিন" : "Days"}
                          </span>
                          <span className="text-gray-500 uppercase tracking-wide text-[9px]">DAILY STREAK</span>
                          <span className={`font-bold ${(rivalProfile.dailyStreak || 0) >= user.dailyStreak ? "text-green-505 font-black text-green-505" : "text-gray-400"}`}>
                            {rivalProfile.dailyStreak || 0} {language === "bn" ? "দিন" : "Days"}
                          </span>
                        </div>

                      </div>
                    </div>

                    {/* Head-to-Head Challenge Button */}
                    <button
                      type="button"
                      onClick={() => {
                        playSound("battle");
                        setActiveChallengeRival(rivalProfile);
                        setActiveTab("practice");
                      }}
                      className="w-full mt-1 py-3 bg-gradient-to-r from-red-650 to-amber-650 hover:from-red-600 hover:to-amber-600 text-white font-extrabold text-center uppercase tracking-wider rounded-xl transition-all duration-300 border-b-4 border-red-900 hover:shadow-[0_0_15px_rgba(193,18,31,0.3)] shadow flex items-center justify-center gap-2 font-display cursor-pointer"
                    >
                      <Swords className="w-4 h-4 text-white animate-pulse" />
                      <span>
                        {language === "bn" 
                          ? `${rivalProfile.displayName}-কে ডুয়েলে চ্যালেঞ্জ করুন!` 
                          : `CHALLENGE ${rivalProfile.displayName} HEAD-TO-HEAD`}
                      </span>
                    </button>

                    {/* Quick rival tools */}
                    <div className="flex items-center justify-between mt-1 gap-4">
                      <button
                        type="button"
                        onClick={() => { playSound("click"); setActiveTab("leaderboard"); }}
                        className={`text-[10px] font-mono uppercase tracking-wider font-extrabold hover:underline transition cursor-pointer ${
                          isDark ? "text-gray-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {language === "bn" ? "← প্রতিদ্বন্দী পরিবর্তন করুন" : "← CHANGE RIVAL"}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          playSound("click");
                          if (confirm(language === "bn" ? "আপনি কি প্রতিদ্বন্দী পিনমুক্ত করতে চান?" : "Are you sure you want to unpin this rival?")) {
                            await updateDocInProfile({ pinnedRivalId: null });
                          }
                        }}
                        className="text-[10px] font-mono uppercase text-[#C1121F] hover:underline font-extrabold transition cursor-pointer"
                        id="btn-remove-pinned-rival"
                      >
                        {language === "bn" ? "বাদ দিন ⚔️" : "UNPIN RIVAL ⚔️"}
                      </button>
                    </div>

                  </div>
                ) : user.pinnedRivalId && !rivalProfile ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <Loader2 className="w-8 h-8 text-[#C1121F] animate-spin mb-3" />
                    <p className={`text-xs font-mono uppercase ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                      {language === "bn" ? "প্রতিদ্বন্দীর তথ্য স্ক্যান করা হচ্ছে..." : "ACQUIRING RIVAL TELEMETRY CONTENT..."}
                    </p>
                  </div>
                ) : (
                  <div className={`flex flex-col items-center justify-center py-8 text-center border-2 border-dashed ${isDark ? "border-white/5 bg-black/[0.1] text-white" : "border-red-100 bg-red-50/5 text-slate-800"} rounded-2xl`}>
                    <div className="w-12 h-12 rounded-full bg-red-950/10 border border-[#C1121F]/20 flex items-center justify-center text-xl mb-3.5">
                      ⚔️
                    </div>
                    <h4 className="text-xs font-black uppercase tracking-wide mb-1.5 font-display">
                      {language === "bn" ? "কোন প্রতিদ্বন্দ্বী পিন করা নেই" : "NO ACTIVE RIVAL"}
                    </h4>
                    <p className="text-[10px] text-gray-500 max-w-xs mb-4 leading-relaxed px-4">
                      {language === "bn" 
                        ? "লিডারবোর্ড থেকে যেকোনো প্রতিযোগীকে পিন করে তাদের সাথে সরাসরি স্কোর তুলনা করুন!" 
                        : "Pin any study partner from the Leaderboard to match your Level, XP, solved questions, and daily streaks live."}
                    </p>
                    <button
                      type="button"
                      onClick={() => { playSound("click"); setActiveTab("leaderboard"); }}
                      className="px-4 py-2 bg-gradient-to-r from-[#C1121F] to-red-600 text-white font-extrabold rounded-lg text-[9px] uppercase tracking-widest hover:scale-[1.02] transition shadow border-b border-red-950 font-mono cursor-pointer"
                      id="btn-rivalry-go-select-lever"
                    >
                      {language === "bn" ? "লিডারবোর্ড থেকে পিন করুন" : "PIN FROM LEADERBOARD"}
                    </button>
                  </div>
                )}
              </motion.div>



              {/* Action Banner to Enter Combat Zone */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className={`border rounded-2xl p-6 relative overflow-hidden shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 ${
                  isDark
                    ? "bg-gradient-to-r from-[#C1121F]/15 via-[#111111] to-black border-white/10"
                    : "bg-gradient-to-r from-red-50 to-white border-red-150 shadow-md text-slate-800"
                }`}
              >
                <div className="absolute inset-y-0 right-0 w-64 bg-[radial-gradient(circle_at_right,_var(--tw-gradient-stops))] from-red-600/10 to-transparent pointer-events-none"></div>
                <div>
                  <span className="text-[10px] bg-[#C1121F] text-white px-2.5 py-1 rounded-md font-mono font-black uppercase tracking-widest border border-white/10 shadow-[0_0_10px_rgba(193,18,31,0.2)]">
                    SEASON 01 ACTIVE
                  </span>
                  <h3 className={`text-lg md:text-xl font-black uppercase mt-3.5 leading-none font-display ${isDark ? "text-white" : "text-slate-900"}`}>
                    READY TO COMMENCE GRINDING CAMPAIGN?
                  </h3>
                  <p className={`text-xs mt-2 max-w-md leading-relaxed ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                    Acquire points, gold, and weaponized mnemonics. Dissect organic biochemistry chemistry chapter matrices or launch Survival Mode tests.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("practice")}
                  className="px-6 py-3.5 bg-[#C1121F] hover:bg-red-750 text-white font-extrabold rounded-lg text-xs uppercase tracking-widest shadow-lg transition border-b-2 border-red-950 font-display cursor-pointer shrink-0"
                  id="btn-dash-enter-combating"
                >
                  ENTER ARENA ⚔️
                </button>
              </motion.div>

              {/* Notice Dashboard: Admission update boards scrollable */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.22 }}
                className={`border rounded-2xl p-6 relative shadow-lg ${
                  isDark ? "bg-[#111111] border-white/10" : "bg-white border-red-150 shadow-[0_8px_30px_rgba(193,18,31,0.06)]"
                }`}
              >
                <div className="absolute top-0 left-6 h-1 w-24 bg-[#FFD700]"></div>
                
                <div className={`flex justify-between items-center border-b pb-3 mb-5 ${isDark ? "border-white/5" : "border-red-150/35"}`}>
                  <h3 className={`font-extrabold text-sm uppercase flex items-center gap-2 font-display ${isDark ? "text-white" : "text-slate-900"}`}>
                    <Bell className="w-4 h-4 text-[#FFD700]" /> BANGLADESH ADMISSION RADAR
                  </h3>
                  <span className="text-[10px] font-mono text-gray-500">LIVE COMMUNICATIONS</span>
                </div>

                {notices.length === 0 ? (
                  <div className="flex flex-col gap-3 font-sans">
                    {/* fallback notices */}
                    <div className="bg-[#0D0D0D] border-l-4 border-l-[#C1121F] border border-white/5 p-4 rounded-r-lg">
                      <div className="flex justify-between items-center mb-1 text-xs">
                        <span className="font-bold text-white uppercase font-sans">DGHS Medical Admission Syllabus Finalized</span>
                        <span className="text-[9px] font-mono text-gray-500 font-bold uppercase">1 hr ago</span>
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed mt-1">
                        DGHS confirmed that cellular division, organic compound reactions, and vectors mechanics remain fully configured inside the current high-yield MAT questions syllabus matrix. Master target areas instantly.
                      </p>
                    </div>
                    
                    <div className="bg-[#0D0D0D] border border-white/5 p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-1 text-xs">
                        <span className="font-bold text-gray-300 font-sans">MediBridge Season 01 Leaderboard Prizes Announced</span>
                        <span className="text-[9px] font-mono text-gray-500 font-bold uppercase">1 day ago</span>
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed mt-1">
                        Top 5 Aspirant Gladiators globally in Dhaka Sector will acquire official printed Abul Hasan textbook companion study notebooks. Maintain your 10-day streak now!
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3.5 max-h-[350px] overflow-y-auto">
                    {notices.map((n) => (
                      <div
                        key={n.id}
                        className={`p-4 rounded-lg border leading-relaxed ${
                          n.important
                            ? "bg-red-950/20 border-red-900/60 border-l-4 border-l-[#C1121F]"
                            : "bg-[#0D0D0D] border-white/5"
                        }`}
                      >
                        <div className="flex justify-between items-center text-xs mb-1">
                          <span className="font-bold text-white uppercase font-display">{n.title}</span>
                          <span className="text-[9px] font-mono text-gray-500 font-semibold uppercase">sys</span>
                        </div>
                        <p className="text-xs text-gray-455 mt-1">{n.content}</p>
                        <span className="text-[9px] font-mono text-[#FFD700] uppercase block mt-1.5 font-bold">BROADCASTED BY {n.createdBy || "System Command"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>

              {/* Pomodoro Study Timer */}
              <PomodoroTimer
                user={user}
                onProfileUpdate={updateDocInProfile}
                language={language}
                theme={theme}
              />

              {/* Battle Log: Combat history logs mockup */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.28 }}
                className="bg-[#111111] border border-white/10 rounded-2xl p-6 relative shadow-lg"
              >
                <div className="absolute top-0 left-6 h-1 w-20 bg-[#C1121F]"></div>
                
                <h3 className="font-extrabold text-sm uppercase text-white tracking-wide border-b border-white/5 pb-3 mb-4 flex items-center justify-between font-display">
                  <span>RECENT BATTLE DECK LOGS</span>
                  <span className="text-[10px] text-gray-500 font-mono tracking-widest font-bold">TELEMETRY SECURE</span>
                </h3>

                <div className="flex flex-col gap-2 font-mono text-[11px] leading-relaxed">
                  {(() => {
                    const SAMPLE_REPLAY_LOGS = [
                      {
                        id: "sample_1",
                        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
                        subject: "Biology",
                        chapter: language === "bn" ? "কোষ বিভাজন" : "Cell Division",
                        realm: language === "bn" ? "জীববিজ্ঞান রাজ্য" : "Biology Realm",
                        battleType: language === "bn" ? "বস ব্যাটল (কোষীয় অসুর)" : "Boss Battle vs Cell Demon",
                        xpEarned: 150,
                        coinsEarned: 50,
                        score: "2/3",
                        success: true,
                        questions: [
                          {
                            questionText: language === "bn" ? "মাইটোসিস কোষ বিভাজনের কোন ধাপে ক্রোমোজোমগুলো বিষুবীয় অঞ্চলে অবস্থান করে?" : "In which stage of mitosis do chromosomes align at the equatorial plate?",
                            options: language === "bn" ? ["প্রোফেজ", "মেটাফেজ", "অ্যানাফেজ", "টেলোফেজ"] : ["Prophase", "Metaphase", "Anaphase", "Telophase"],
                            correctAnswerIndex: 1,
                            selectedAnswerIndex: 1,
                            explanation: language === "bn" ? "মেটাফেজ ধাপে ক্রোমোজোমগুলো মেটাকাইনেসিস প্রক্রিয়ায় বিষুবীয় অঞ্চলে (equatorial plate) বিন্যস্ত হয় এবং স্পিন্ডল তন্তুর সাথে যুক্ত হয়।" : "During metaphase, chromosomes align at the equator of the cell through a process called metakinesis.",
                            subject: "Biology",
                            chapter: "Cell Division"
                          },
                          {
                            questionText: language === "bn" ? "কোন অঙ্গাণুটিকে কোষে 'আত্মঘাতী থলি' (Suicidal Bag) বলা হয়?" : "Which organelle is referred to as the 'Suicidal Bag' of the cell?",
                            options: language === "bn" ? ["রাইবোসোম", "লাইসোসোম", "গলজি বডি", "মাইটোকন্ড্রিয়া"] : ["Ribosome", "Lysosome", "Golgi Body", "Mitochondria"],
                            correctAnswerIndex: 1,
                            selectedAnswerIndex: 1,
                            explanation: language === "bn" ? "লাইসোসোম তার ভেতরে থাকা আর্দ্রবিশ্লেষী এনজাইমের মাধ্যমে কোষে অটোল্যাইসিস বা স্ব-গ্রাস প্রক্রিয়া চালায়, তাই একে আত্মঘাতী থলি বলে।" : "Lysosomes contain hydrolytic enzymes and can destroy their own cell via autolysis, earning them the name 'suicidal bags'.",
                            subject: "Biology",
                            chapter: "Cell Division"
                          },
                          {
                            questionText: language === "bn" ? "ডিএনএ রেপ্লিকেশন কোষ চক্রের কোন দশায় ঘটে থাকে?" : "In which phase of the cell cycle does DNA replication occur?",
                            options: language === "bn" ? ["G1 দশা", "S দশা", "G2 দশা", "M দশা"] : ["G1 Phase", "S Phase", "G2 Phase", "M Phase"],
                            correctAnswerIndex: 1,
                            selectedAnswerIndex: 0,
                            explanation: language === "bn" ? "কোষ চক্রের ইন্টারফেজের S (Synthesis) উপদশায় ডিএনএ এর অনুলিপন বা রেপ্লিকেশন সম্পন্ন হয়।" : "DNA replication occurs during the S (Synthesis) phase of interphase in the cell cycle.",
                            subject: "Biology",
                            chapter: "Cell Division"
                          }
                        ]
                      },
                      {
                        id: "sample_2",
                        timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
                        subject: "Chemistry",
                        chapter: language === "bn" ? "জৈব রসায়ন" : "Organic Chemistry",
                        realm: language === "bn" ? "রসায়ন রাজ্য" : "Chemistry Realm",
                        battleType: language === "bn" ? "স্ট্যান্ডার্ড কমব্যাট" : "Standard Combat",
                        xpEarned: 0,
                        coinsEarned: 0,
                        score: "0/1",
                        success: false,
                        questions: [
                          {
                            questionText: language === "bn" ? "নিচের কোনটি মার্কোনিকভ নিয়মের সাথে সম্পর্কিত?" : "Which of the following is associated with Markovnikov's Rule?",
                            options: language === "bn" ? ["অপ্রতিসম অ্যালকিন ও অপ্রতিসম বিকারক", "প্রতিসম অ্যালকিন ও প্রতিসম বিকারক", "অ্যালকোহল ও জৈব এসিড", "নিউক্লিওফিলিক প্রতিস্থাপন"] : ["Asymmetric alkene and asymmetric reagent", "Symmetric alkene and symmetric reagent", "Alcohol and organic acid", "Nucleophilic substitution"],
                            correctAnswerIndex: 0,
                            selectedAnswerIndex: 2,
                            explanation: language === "bn" ? "মার্কোনিকভ নিয়ম অনুসারে অপ্রতিসম অ্যালকিনের সাথে অপ্রতিসম বিকারকের (যেমন HBr) যুত বিক্রিয়ায় বিকারকের ঋণাত্মক অংশ কম হাইড্রোজেনযুক্ত কার্বনে যুক্ত হয়।" : "Markovnikov's rule dictates that in the addition of an asymmetric reagent (like HBr) to an asymmetric alkene, the nucleophilic part adds to the carbon with fewer hydrogen atoms.",
                            subject: "Chemistry",
                            chapter: "Organic Chemistry"
                          }
                        ]
                      }
                    ];

                    const displayLogs = battleLogs.length > 0 ? battleLogs : SAMPLE_REPLAY_LOGS;

                    return displayLogs.map((log) => {
                      const isSample = log.id.startsWith("sample_");
                      return (
                        <div
                          key={log.id}
                          onClick={() => {
                            playSound("click");
                            setSelectedReplayBattle(log);
                          }}
                          className={`flex justify-between items-center p-3.5 rounded-xl border cursor-pointer hover:scale-[1.01] transition-all duration-200 ${
                            log.success
                              ? "bg-[#0D0D0D] hover:bg-[#161616] border-white/5 hover:border-emerald-500/20"
                              : "bg-red-950/10 hover:bg-red-950/20 border-red-950/15 hover:border-red-950/40"
                          }`}
                        >
                          <div className="flex flex-col gap-1 text-left">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`font-bold uppercase tracking-wider text-[9px] ${
                                log.success ? "text-emerald-400" : "text-[#C1121F]"
                              }`}>
                                {log.success 
                                  ? (language === "bn" ? "● সাকসেস" : "● SUCCESS") 
                                  : (language === "bn" ? "● ফেইলড" : "● FAILED")
                                }
                              </span>
                              {isSample && (
                                <span className="text-[8px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/20 px-1 py-0.2 rounded font-sans uppercase">
                                  {language === "bn" ? "ডেমো" : "Demo"}
                                </span>
                              )}
                            </div>
                            <span className="text-gray-400 text-[10px]">
                              {log.realm} • {log.chapter}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-white block font-black">{log.score}</span>
                            <span className="text-gray-500 text-[9px] block font-sans">
                              {log.success ? `+${log.xpEarned} XP` : (language === "bn" ? "ভুল পর্যালোচনা করুন" : "Review Mistakes")}
                            </span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </motion.div>
                </>
              )}

            </div>

            {/* Daily habit missions corner */}
            <div className="lg:col-span-3">
              <DailyMissions
                user={user}
                onProfileUpdate={updateDocInProfile}
                setActiveTab={setActiveTab}
                language={language}
                theme={theme}
              />
            </div>

          </div>
        )}

        {/* ACTIVE TAB: ANALYTICS */}
        {activeTab === "analytics" && (
          <QuestionAnalytics
            user={user}
            dbQuestions={dbQuestions}
            language={language}
            onEnterPractice={() => setActiveTab("practice")}
            theme={theme}
          />
        )}

        {/* ACTIVE TAB: COMBAT PRACTICE ZONE */}
        {activeTab === "practice" && (
          <PracticePanel
            user={user}
            dbQuestions={dbQuestions}
            language={language}
            theme={theme}
            onProfileUpdate={(updated) => setUser(updated)}
            challengeRivalProfile={activeChallengeRival}
            onClearChallenge={() => setActiveChallengeRival(null)}
            forceTab="arena"
          />
        )}

        {/* ACTIVE TAB: TEXTBOOK ANUSHILONI HUB */}
        {activeTab === "anushiloni" && (
          <PracticePanel
            user={user}
            dbQuestions={dbQuestions}
            language={language}
            theme={theme}
            onProfileUpdate={(updated) => setUser(updated)}
            challengeRivalProfile={null}
            onClearChallenge={() => {}}
            forceTab="anushiloni"
          />
        )}

        {/* ACTIVE TAB: REVIEW MISTAKES */}
        {activeTab === "mistakes" && user && (
          <ReviewMistakesPanel
            user={user}
            language={language}
            theme={theme}
            onProfileUpdate={(updated) => setUser(updated)}
          />
        )}

        {/* ACTIVE TAB: SOCIAL STUDY FEEDS */}
        {activeTab === "social" && (
          <SocialFeed
            user={user}
            dbQuestions={dbQuestions}
            onProfileUpdate={updateDocInProfile}
            language={language}
            theme={theme}
          />
        )}

        {/* ACTIVE TAB: MAT HIGH-YIELD GK DOMAIN */}
        {activeTab === "gk" && user && (
          <GkSection
            currentUser={user}
            onProfileUpdate={updateDocInProfile}
            language={language}
            theme={theme}
          />
        )}

        {/* ACTIVE TAB: MAT ENGLISH PLAYGROUND */}
        {activeTab === "english" && user && (
          <MatEnglish
            currentUser={user}
            onProfileUpdate={updateDocInProfile}
            language={language}
            theme={theme}
          />
        )}

        {/* ACTIVE TAB: WARS LEADERBOARDS */}
        {activeTab === "leaderboard" && <LeaderboardPanel currentUser={user} onProfileUpdate={updateDocInProfile} language={language} theme={theme} />}

        {/* ACTIVE TAB: OUR HEROES & ACHIEVERS (HALL OF FAME) */}
        {activeTab === "heroes" && <OurHeroesSection language={language} theme={theme} />}

        {/* ACTIVE TAB: AIMED ADVISOR */}
        {activeTab === "mentor" && <AIMentor user={user} language={language} theme={theme} />}

        {/* ACTIVE TAB: EXAM BATCH STORE & PAYMENTS */}
        {activeTab === "exambatch" && user && (
          <ExamBatchStore
            user={user}
            language={language}
            theme={theme}
            setActiveTab={setActiveTab}
            onProfileUpdate={updateDocInProfile}
          />
        )}

        {/* REDIRECT LEGACY SUBSCRIPTION TAB TO COURSES */}
        {activeTab === "subscription_payment" && (
          <CourseStore
            courses={coursesList}
            batches={batchesList}
            enrollments={enrollmentsList}
            user={user || {
              uid: "guest",
              displayName: "Aspirant",
              email: "",
              role: "student",
              level: 1,
              xp: 0,
              coins: 0,
              dailyStreak: 0,
              avatarUrl: "",
              createdAt: new Date().toISOString()
            }}
            language={language}
            theme={theme}
            onSelectCourse={(course) => {
              setSelectedCourse(course);
              setActiveTab("course_details");
            }}
            onEnrollNow={(course, batchId) => {
              setSelectedCourse(course);
              const foundBatch = batchesList.find((b) => b.id === batchId || b.courseId === course.id);
              if (foundBatch) setSelectedBatch(foundBatch);
              if (!user) {
                setShowLoginModal(true);
              } else {
                setActiveTab("course_checkout");
              }
            }}
            onGoToCourseDashboard={(course) => {
              const enr = enrollmentsList.find((e) => e.courseId === course.id);
              if (enr) {
                setLearningEnrollment(enr);
                setActiveTab("course_dashboard");
              }
            }}
            onOpenGamingArena={() => setActiveTab("gaming")}
          />
        )}

        {/* ACTIVE TAB: COURSE SELLING STORE */}
        {activeTab === "courses" && (
          <CourseStore
            courses={coursesList}
            batches={batchesList}
            enrollments={enrollmentsList}
            user={user || {
              uid: "guest",
              displayName: "Aspirant",
              email: "",
              role: "student",
              level: 1,
              xp: 0,
              coins: 0,
              dailyStreak: 0,
              avatarUrl: "",
              createdAt: new Date().toISOString()
            }}
            language={language}
            theme={theme}
            onSelectCourse={(course) => {
              setSelectedCourse(course);
              setActiveTab("course_details");
              try {
                const newUrl = `${window.location.pathname}?course=${encodeURIComponent(course.id)}`;
                window.history.pushState(null, "", newUrl);
              } catch (e) {}
            }}
            onEnrollNow={(course, batchId) => {
              setSelectedCourse(course);
              const foundBatch = batchesList.find((b) => b.id === batchId || b.courseId === course.id);
              if (foundBatch) setSelectedBatch(foundBatch);
              if (!user) {
                setShowLoginModal(true);
              } else {
                setActiveTab("course_checkout");
              }
            }}
            onGoToCourseDashboard={(course) => {
              const enr = enrollmentsList.find((e) => e.courseId === course.id);
              if (enr) {
                setLearningEnrollment(enr);
                setActiveTab("course_dashboard");
              }
            }}
            onOpenGamingArena={() => setActiveTab("gaming")}
          />
        )}

        {/* ACTIVE TAB: STANDALONE MEDICAL GAMING ARENA (FREE INTERACTIVE ARCADE) */}
        {activeTab === "gaming" && (
          <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-4">
            <GamingArenaHub
              courseId="gaming_arena_main"
              courseName={language === "bn" ? "মেডিকেল গেমিং অ্যারেনা ও কুইজ যুদ্ধ 🎮" : "Medical Gaming Arena & Speed Battles 🎮"}
              questions={STARTER_QUESTIONS.map((q, idx) => ({
                id: `q-starter-${idx}`,
                createdAt: Date.now(),
                createdBy: "system",
                ...q,
              }))}
              userProfile={user || {
                uid: "guest_player",
                displayName: "Medical Gladiator",
                email: "",
                role: "student",
                level: 1,
                xp: 0,
                coins: 0,
                dailyStreak: 0,
                avatarUrl: "",
                createdAt: new Date().toISOString()
              }}
              language={language}
              onAddToMistakeBank={(q) => {
                if (user) {
                  setMistakesList((prev) => [
                    {
                      id: `mistake_${Date.now()}_${q.id}`,
                      userId: user.uid,
                      courseId: "gaming_arena_main",
                      batchId: "gaming_batch_free",
                      questionId: q.id,
                      questionText: q.questionText,
                      options: q.options,
                      correctAnswerIndex: q.correctAnswerIndex,
                      userWrongIndex: -1,
                      explanation: q.explanation || "",
                      subject: q.subject || "Biology",
                      chapter: q.chapter || "General",
                      timestamp: new Date().toISOString(),
                      reviewed: false,
                    },
                    ...prev,
                  ]);
                }
              }}
              onUpdateUserStats={(xpGained, coinsGained) => {
                if (user) {
                  updateDocInProfile({
                    xp: (user.xp || 0) + xpGained,
                    coins: (user.coins || 0) + coinsGained,
                    goldCoins: (user.goldCoins || user.coins || 0) + coinsGained,
                  });
                }
              }}
            />
          </div>
        )}

        {/* ACTIVE TAB: COURSE DETAILS & BATCH SELECTION */}
        {activeTab === "course_details" && selectedCourse && (
          <CourseDetailsView
            course={selectedCourse}
            batches={batchesList.filter((b) => b.courseId === selectedCourse.id)}
            enrollments={enrollmentsList}
            user={user}
            language={language}
            theme={theme}
            onBack={() => {
              setActiveTab("courses");
              try {
                window.history.replaceState(null, "", window.location.pathname);
              } catch (e) {}
            }}
            onEnrollNow={(course, batchId) => {
              setSelectedCourse(course);
              const foundBatch = batchesList.find((b) => b.id === batchId || b.courseId === course.id);
              if (foundBatch) setSelectedBatch(foundBatch);
              if (!user) {
                setShowLoginModal(true);
              } else {
                setActiveTab("course_checkout");
              }
            }}
            onGoToCourseDashboard={(course) => {
              const enr = enrollmentsList.find((e) => e.courseId === course.id);
              if (enr) {
                setLearningEnrollment(enr);
                setActiveTab("course_dashboard");
              }
            }}
          />
        )}

        {/* ACTIVE TAB: COURSE CHECKOUT */}
        {activeTab === "course_checkout" && selectedCourse && selectedBatch && user && (
          <CourseCheckoutView
            course={selectedCourse}
            batch={selectedBatch}
            user={user}
            language={language}
            theme={theme}
            onBack={() => setActiveTab("course_details")}
            onPaymentSuccess={(_order, newEnrollment) => {
              setEnrollmentsList((prev) => {
                const filtered = prev.filter(
                  (e) => e.id !== newEnrollment.id && !(e.userId === newEnrollment.userId && e.courseId === newEnrollment.courseId)
                );
                return [newEnrollment, ...filtered];
              });
              setLearningEnrollment(newEnrollment);
              setActiveTab("course_dashboard");
            }}
          />
        )}

        {/* ACTIVE TAB: MY ENROLLED COURSES */}
        {activeTab === "my_courses" && user && (
          <MyCoursesView
            enrollments={enrollmentsList.filter((e) => e.userId === user.uid)}
            courses={coursesList}
            user={user}
            language={language}
            theme={theme}
            onGoToCourseDashboard={(course) => {
              const enr = enrollmentsList.find((e) => e.courseId === course.id);
              if (enr) {
                setLearningEnrollment(enr);
                setActiveTab("course_dashboard");
              }
            }}
            onExploreCourses={() => setActiveTab("courses")}
          />
        )}

        {/* ACTIVE TAB: COURSE LEARNING DASHBOARD */}
        {activeTab === "course_dashboard" && learningEnrollment && user && (
          <CourseDashboardView
            course={coursesList.find((c) => c.id === learningEnrollment.courseId) || selectedCourse || coursesList[0]}
            batch={batchesList.find((b) => b.id === learningEnrollment.batchId) || selectedBatch || batchesList[0]}
            enrollment={learningEnrollment}
            classes={classesList.filter((c) => c.courseId === learningEnrollment.courseId)}
            materials={materialsList.filter((m) => m.courseId === learningEnrollment.courseId)}
            announcements={announcementsList.filter((a) => a.courseId === learningEnrollment.courseId)}
            exams={examsList.filter((e) => e.courseId === learningEnrollment.courseId)}
            mistakes={mistakesList.filter((m) => m.userId === user.uid && m.courseId === learningEnrollment.courseId)}
            allQuestions={STARTER_QUESTIONS.map((q, idx) => ({
              id: `q-starter-${idx}`,
              createdAt: Date.now(),
              createdBy: "system",
              ...q,
            }))}
            user={user}
            language={language}
            theme={theme}
            onBackToMyCourses={() => setActiveTab("my_courses")}
            onRecordAttempt={(attempt) => {
              console.log("Exam Attempt recorded:", attempt);
            }}
            onSaveMistake={(mistake) => {
              setMistakesList((prev) => [mistake, ...prev]);
            }}
            onUpdateEnrollment={(updated) => {
              setEnrollmentsList((prev) =>
                prev.map((e) => (e.id === updated.id ? updated : e))
              );
              setLearningEnrollment(updated);
            }}
            onProfileUpdate={(updated) => {
              setUser(updated);
            }}
          />
        )}

        {/* ACTIVE TAB: TEACHER CONTROL DASHBOARD (Restricted to Command Center Admin Area) */}
        {activeTab === "teacher_dashboard" && (
          <div className="w-full max-w-7xl mx-auto px-4 py-8 text-center font-mono">
            <p className="text-red-400 text-sm">
              {language === "bn" ? "শিক্ষক প্যানেল কেবল কমান্ড সেন্টারের ভেতরে সংরক্ষিত।" : "Faculty Panel is restricted inside Command Center."}
            </p>
            <button
              onClick={() => {
                setActiveTab("admin");
                setAdminSubView("faculty");
              }}
              className="mt-4 px-4 py-2 bg-[#C1121F] text-white rounded-xl text-xs font-bold uppercase"
            >
              {language === "bn" ? "কমান্ড সেন্টার শিক্ষক প্যানেলে যান" : "Go to Command Center Faculty Hub"}
            </button>
          </div>
        )}

        {/* ACTIVE TAB: COMMAND SECURED CONTROL AREA */}
        {activeTab === "admin" && (
          <div className="w-full max-w-7xl mx-auto px-4 py-6 flex flex-col gap-6">
            {/* Visual View Switcher */}
            <div className={`flex flex-col sm:flex-row items-center justify-between p-3.5 gap-3 rounded-2xl border ${
              theme === "dark" ? "bg-white/[0.02] border-white/5" : "bg-red-50/20 border-red-150"
            }`}>
              <span className={`text-[11px] font-mono font-black tracking-widest uppercase ml-1 flex items-center gap-1.5 ${
                theme === "dark" ? "text-slate-400" : "text-slate-600"
              }`}>
                🛡️ {language === "bn" ? "অ্যাক্সেস কন্ট্রোল ডেক" : "SECURITY & ACCESS MANAGER"}
              </span>
              <div className="flex gap-2 w-full sm:w-auto items-end">
                <div className="flex flex-col items-center flex-1 sm:flex-none">
                  <span className="text-[7.5px] font-black text-amber-400 uppercase tracking-widest leading-none mb-1 select-none">
                    Not for students
                  </span>
                  <button
                    onClick={() => { playSound("click"); setAdminSubView("command"); }}
                    className={`w-full px-4 py-2 rounded-xl text-[10.5px] font-extrabold uppercase tracking-wider transition-all duration-300 transform ${
                      adminSubView === "command"
                        ? "bg-[#C1121F] text-white shadow shadow-red-500/10 scale-105"
                        : theme === "dark" 
                          ? "bg-transparent text-gray-400 hover:text-white" 
                          : "bg-transparent text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    🖥️ {language === "bn" ? "কমান্ড সেন্টার" : "Command Center"}
                  </button>
                </div>
                <button
                  onClick={() => { playSound("click"); setAdminSubView("faculty"); }}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-[10.5px] font-extrabold uppercase tracking-wider transition-all duration-300 transform ${
                    adminSubView === "faculty"
                      ? "bg-[#C1121F] text-white shadow shadow-red-500/10 scale-105"
                      : theme === "dark" 
                        ? "bg-transparent text-gray-400 hover:text-white" 
                        : "bg-transparent text-slate-500 hover:text-slate-900"
                  }`}
                >
                  🎓 {language === "bn" ? "শিক্ষক প্যানেল" : "Faculty Panel"}
                </button>
                <button
                  onClick={() => { playSound("click"); setAdminSubView("panel"); }}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-[10.5px] font-extrabold uppercase tracking-wider transition-all duration-300 transform ${
                    adminSubView === "panel"
                      ? "bg-[#C1121F] text-white shadow shadow-red-500/10 scale-105"
                      : theme === "dark" 
                        ? "bg-transparent text-gray-400 hover:text-white" 
                        : "bg-transparent text-slate-500 hover:text-slate-900"
                  }`}
                >
                  📂 {language === "bn" ? "অ্যাডমিন প্যানেল" : "Admin Panel"}
                </button>
              </div>
            </div>

            {adminSubView === "command" ? (
              <CommandCenter
                user={user}
                language={language}
                setLanguage={setLanguage}
                theme={theme}
                onNavigateToTab={setActiveTab}
              />
            ) : adminSubView === "faculty" ? (
              <TeacherDashboardView
                courses={coursesList}
                batches={batchesList}
                classes={classesList}
                materials={materialsList}
                announcements={announcementsList}
                exams={examsList}
                user={user}
                language={language}
                theme={theme}
                onCreateClass={async (cls) => {
                  setClassesList((prev) => [cls, ...prev]);
                  syncClassToSupabase(cls);
                }}
                onUpdateClass={async (updatedCls) => {
                  setClassesList((prev) => prev.map((c) => (c.id === updatedCls.id ? updatedCls : c)));
                  syncClassToSupabase(updatedCls);
                }}
                onDeleteClass={async (classId) => {
                  setClassesList((prev) => prev.filter((c) => c.id !== classId));
                  deleteClassFromSupabase(classId);
                }}
                onCreateMaterial={async (mat) => {
                  setMaterialsList((prev) => [mat, ...prev]);
                  syncMaterialToSupabase(mat);
                }}
                onUpdateMaterial={async (updatedMat) => {
                  setMaterialsList((prev) => prev.map((m) => (m.id === updatedMat.id ? updatedMat : m)));
                  syncMaterialToSupabase(updatedMat);
                }}
                onDeleteMaterial={async (materialId) => {
                  setMaterialsList((prev) => prev.filter((m) => m.id !== materialId));
                  deleteMaterialFromSupabase(materialId);
                }}
                onCreateAnnouncement={async (anc) => {
                  setAnnouncementsList((prev) => [anc, ...prev]);
                  syncAnnouncementToSupabase(anc);
                }}
                onUpdateAnnouncement={async (updatedAnc) => {
                  setAnnouncementsList((prev) => prev.map((a) => (a.id === updatedAnc.id ? updatedAnc : a)));
                  syncAnnouncementToSupabase(updatedAnc);
                }}
                onDeleteAnnouncement={async (ancId) => {
                  setAnnouncementsList((prev) => prev.filter((a) => a.id !== ancId));
                  deleteAnnouncementFromSupabase(ancId);
                }}
                onCreateExam={async (ex) => {
                  setExamsList((prev) => [ex, ...prev]);
                  syncExamToSupabase(ex);
                }}
                onUpdateCourse={async (updatedCourse) => {
                  setCoursesList((prev) => {
                    const next = prev.map((c) => (c.id === updatedCourse.id ? updatedCourse : c));
                    try {
                      localStorage.setItem("medibridge_courses_cache", JSON.stringify(next));
                    } catch (e) {}
                    return next;
                  });
                  syncCourseToSupabase(updatedCourse);
                }}
                onUpdateBatch={async (updatedBatch) => {
                  setBatchesList((prev) => {
                    const next = prev.map((b) => (b.id === updatedBatch.id ? updatedBatch : b));
                    try {
                      localStorage.setItem("medibridge_batches_cache", JSON.stringify(next));
                    } catch (e) {}
                    return next;
                  });
                  syncBatchToSupabase(updatedBatch);
                }}
                onDeleteExam={async (examId) => {
                  setExamsList((prev) => prev.filter((e) => e.id !== examId));
                  deleteExamFromSupabase(examId);
                }}
                onUpdateExam={async (updatedExam) => {
                  setExamsList((prev) => prev.map((e) => (e.id === updatedExam.id ? updatedExam : e)));
                  syncExamToSupabase(updatedExam);
                }}
              />
            ) : (
              <AdminPanel
                user={user}
                theme={theme}
                courses={coursesList}
                batches={batchesList}
                onUpdateCourse={async (updatedCourse) => {
                  setCoursesList((prev) => {
                    const next = prev.map((c) => (c.id === updatedCourse.id ? updatedCourse : c));
                    try {
                      localStorage.setItem("medibridge_courses_cache", JSON.stringify(next));
                    } catch (e) {}
                    return next;
                  });
                  syncCourseToSupabase(updatedCourse);
                }}
              />
            )}
          </div>
        )}

      </main>

      {/* SUPERADMIN ACCESS CHALLENGE MODAL */}
      {showSuperadminLogin && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 min-h-screen">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="w-full max-w-md bg-[#111111] border border-[#FFD700]/30 rounded-2xl p-6 md:p-8 relative shadow-[0_0_35px_rgba(255,215,0,0.15)] flex flex-col gap-6"
          >
            <div className="absolute top-0 left-12 right-12 h-[3px] bg-gradient-to-r from-red-650 via-[#FFD700] to-red-650"></div>
            
            <div className="flex flex-col items-center text-center gap-3">
              <div className="p-3 bg-[#FFD700]/10 border border-[#FFD700]/30 rounded-full text-[#FFD700]">
                <Lock className="w-8 h-8" />
              </div>
              <h2 className="text-lg md:text-xl font-extrabold uppercase tracking-tight text-white font-display mt-1">
                {language === "bn" ? "সুপারঅ্যাডমিন অথরাইজেশন কী" : "SUPERADMIN INTEL GATE"}
              </h2>
              <p className="text-[11.5px] leading-relaxed text-gray-450 font-sans">
                {language === "bn" 
                  ? "কমান্ড সেন্টারে প্রবেশের জন্য স্পেশাল সুপারঅ্যাডমিন কী প্রয়োজন। নিরাপত্তা চ্যালেঞ্জটি সম্পন্ন করুন।" 
                  : "Double-factor administrator token challenge is active to secure questions and logs database."}
              </p>
            </div>

            <form onSubmit={handleVerifySuperadmin} className="flex flex-col gap-4 font-mono text-xs">
              <div className="flex flex-col gap-2">
                <label className="text-gray-400 font-bold uppercase text-[9.5px] tracking-wider flex justify-between">
                  <span>{language === "bn" ? "অ্যাক্সেস কী পাসওয়ার্ড:" : "SUPERADMIN PASSKEY:"}</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={superadminKeyInput}
                    onChange={(e) => {
                      setSuperadminKeyInput(e.target.value);
                      if (superadminError) setSuperadminError("");
                    }}
                    placeholder={language === "bn" ? "সুপারঅ্যাডমিন কী লিখুন (Superadmin2000)..." : "Enter access key (Superadmin2000)..."}
                    className="w-full bg-black/60 border border-white/10 text-[#FFD700] focus:border-[#FFD700] rounded-xl py-3 pl-4 pr-10 focus:outline-none placeholder-gray-600 font-bold tracking-widest text-center"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-gray-500 hover:text-white cursor-pointer"
                  >
                    {showPassword ? "🔑" : "🔒"}
                  </button>
                </div>
              </div>

              {superadminError && (
                <div className="text-center p-2.5 bg-red-950/20 border border-red-500/20 rounded-xl text-red-400 font-sans font-semibold text-[11px] animate-pulse">
                  ⚠️ {superadminError}
                </div>
              )}

              <div className="flex gap-3 mt-2 font-sans">
                <button
                  type="button"
                  onClick={() => {
                    playSound("click");
                    setShowSuperadminLogin(false);
                    setActiveTab("dashboard");
                  }}
                  className="flex-1 py-3 border border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs uppercase font-bold tracking-wider transition-all"
                >
                  {language === "bn" ? "বাতিল করুন" : "Cancel Gate"}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-[#FFD700] to-amber-500 text-black rounded-xl text-xs uppercase font-extrabold tracking-wider transition-all shadow-[0_0_15px_rgba(245,158,11,0.25)] hover:brightness-110 flex items-center justify-center gap-1.5"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>{language === "bn" ? "আনলক গেট" : "Unlock Intake"}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      {/* Premium Subscription Purchase System is disabled for students in favor of Course enrollments */}
      {isPremiumModalOpen && (
        <PremiumModal
          isOpen={false}
          onClose={() => setIsPremiumModalOpen(false)}
          user={user}
          onProfileUpdate={updateDocInProfile}
          language={language}
          theme={theme}
          onManualPaymentClick={() => {
            setIsPremiumModalOpen(false);
            setActiveTab("courses");
            playSound("click");
          }}
        />
      )}

      {/* Edit Profile & Details Modal */}
      {user && (
        <EditProfileModal
          isOpen={isEditProfileOpen}
          onClose={() => setIsEditProfileOpen(false)}
          user={user}
          onProfileUpdate={updateDocInProfile}
          language={language}
          theme={theme}
        />
      )}

      {/* Bangladesh Admission Radar - Popup Notice Notifications */}
      {user && (user.role === "student" && user.email !== "nuwaisirhoquesbmc@gmail.com" && user.email !== "hoquenuwaisir@gmail.com") && (
        <NoticePopup notices={notices} language={language} theme={theme} />
      )}

      {/* Interactive Battle Replay Modal */}
      {selectedReplayBattle && (
        <BattleReplayModal
          battle={selectedReplayBattle}
          onClose={() => setSelectedReplayBattle(null)}
          language={language}
        />
      )}

      {/* Complete Advertisement popup manager */}
      <AdDisplayManager user={user} theme={theme} />
    </div>
  );
}
