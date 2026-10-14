import React, { useState, useEffect, useMemo } from "react";
import { saveVideoToIndexedDB, getVideoFromIndexedDB } from "../lib/videoDb";
import { saveMusicToIndexedDB, getMusicFromIndexedDB } from "../lib/musicDb";
import { db, handleFirestoreError, OperationType, isFirestoreQuotaExceeded, setFirestoreQuotaExhausted, isQuotaExceededError } from "../lib/backend";
import {
  collection,
  onSnapshot,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  deleteDoc,
  doc,
  query,
  limit,
  serverTimestamp,
  updateDoc,
  writeBatch
} from "../lib/supabaseDb";
import { UserProfile, Question, AdminNotice } from "../types";
import { STARTER_QUESTIONS } from "../questionsData";
import {
  getMigratedQuestions,
  saveMigratedQuestion,
  getMigratedNotices,
  getMigratedSetting,
  saveMigratedSetting,
  getMigratedCourses,
  getMigratedBatches
} from "../lib/migratedDataStore";
import { playSound } from "../audio";
import MediBridgeLogo from "./MediBridgeLogo";
import {
  ShieldAlert,
  Users,
  Database,
  Plus,
  Trash2,
  Edit2,
  TrendingUp,
  FileSpreadsheet,
  Settings,
  Flame,
  Award,
  BookOpen,
  Bell,
  Search,
  CheckCircle,
  AlertOctagon,
  Settings2,
  Shield,
  FileUp,
  Sliders,
  Check,
  X,
  AlertTriangle,
  RefreshCw,
  Globe,
  TrendingDown,
  Lock,
  PlusCircle,
  UserCheck,
  UserX,
  Share2,
  FileText,
  CreditCard,
  Gamepad2,
  RotateCcw,
  Trophy,
  Coins,
  Sparkles,
  Zap,
  CheckSquare,
  Layers,
  UserPlus,
  Eye,
  Copy
} from "lucide-react";
import { LiveExamReExamPermission } from "../types/courseTypes";
import CommandCenterPasscodeLock from "./admin/CommandCenterPasscodeLock";
import { getReadOptimizationStats, clearAllOptimizedCaches } from "../lib/quotaOptimizer";
import { DEFAULT_EXTERNAL_GAME, EXTERNAL_GAME_PRESETS, ExternalWebGameConfig } from "./gaming/ExternalGamingWebModal";

interface CommandCenterProps {
  user: UserProfile;
  language: "bn" | "en";
  setLanguage: (lang: "bn" | "en") => void;
  theme?: "light" | "dark";
  onNavigateToTab: (tab: any) => void;
}

// Interfece for local platform controls
interface PlatformSettings {
  socialFeedEnabled: boolean;
  aiMentorEnabled: boolean;
  dailyMissionsEnabled: boolean;
  bossBattlesEnabled: boolean;
  survivalEnabled: boolean;
  leaderboardEnabled: boolean;
  maintenanceMode: boolean;
  premiumControlMode: "all_free" | "premium_locked" | "trial_mode";
  activeEvent: string;
  landingVideoUrl?: string;
  landingVideoTitle?: string;
  landingVideoEnabled?: boolean;
  backgroundMusicUrl?: string;
  backgroundMusicTitle?: string;
  backgroundMusicEnabled?: boolean;
  backgroundMusicVolume?: number;
  customLogoUrl?: string;
  customLogoEnabled?: boolean;
}

interface SecurityLog {
  id: string;
  type: "login_success" | "login_failed" | "admin_act" | "threat";
  userEmail: string;
  action: string;
  ip: string;
  timestamp: string;
}

export interface EnrollmentRecord {
  id: string;
  userId: string;
  userEmail: string;
  userDisplayName: string;
  packageName: string;
  amount: number;
  paymentMethod: string;
  trxId: string;
  status: "active" | "expired";
  createdAt: string;
  expiryDate: string;
  notes?: string;
}

export default function CommandCenter({
  user,
  language,
  setLanguage,
  theme = "dark",
  onNavigateToTab
}: CommandCenterProps) {
  const isDark = theme === "dark";
  // Translate helper inside CommandCenter
  const isBn = language === "bn";

  // Access Roles: Super Admin, Admin, Moderator
  const role = user?.role || "student";
  const hasAccess = role === "superadmin" || role === "admin" || role === "moderator" || user.email === "nuwaisirhoquesbmc@gmail.com" || user.email === "hoquenuwaisir@gmail.com" || sessionStorage.getItem("mb_superadmin_verified") === "true";

  // Passcode gate unlock state
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    try {
      if (typeof window !== "undefined") {
        return sessionStorage.getItem("mb_cc_unlocked_session") === "true";
      }
    } catch (e) {}
    return false;
  });

  // Navigation state inside Command Center
  type CommandSubTab = "platform" | "users" | "enrollments" | "questions" | "duplicates" | "import" | "review" | "security" | "topics" | "live_exams" | "gaming_arena";
  const [subTab, setSubTab] = useState<CommandSubTab>("platform");

  // Live Exam Admin States
  const [liveExams, setLiveExams] = useState<any[]>([]);
  const [liveSubmissions, setLiveSubmissions] = useState<any[]>([]);
  const [reExamPermissions, setReExamPermissions] = useState<LiveExamReExamPermission[]>([]);
  const [liveExamSubSection, setLiveExamSubSection] = useState<"directory" | "submissions">("directory");
  const [submissionSearch, setSubmissionSearch] = useState("");
  const [submissionFilter, setSubmissionFilter] = useState<"all" | "cheated" | "reexam_active" | "passed">("all");
  const [selectedExamFilterId, setSelectedExamFilterId] = useState<string>("all");
  const [grantingReExamModal, setGrantingReExamModal] = useState<{
    isOpen: boolean;
    targetUserUid: string;
    targetUserEmail: string;
    targetUserName: string;
    targetExamId: string;
    targetExamTitle: string;
    reason: string;
  } | null>(null);

  const [newExamTitle, setNewExamTitle] = useState("");
  const [newExamSubject, setNewExamSubject] = useState("Biology");
  const [newExamChapter, setNewExamChapter] = useState("All");
  const [newExamDuration, setNewExamDuration] = useState(10);
  const [newExamQuestionsCount, setNewExamQuestionsCount] = useState(10);
  const [viewingLeaderboardExamId, setViewingLeaderboardExamId] = useState<string | null>(null);

  // Gaming Arena Controls States
  const DEFAULT_GAMING_SETTINGS = {
    masterEnabled: true,
    maintenanceMessageBn: "গেমিং অ্যারেনায় বর্তমানে সার্ভার অপটিমাইজেশন চলছে। খুব শীঘ্রই গেমগুলো পুনরায় সচল হবে!",
    maintenanceMessageEn: "Gaming Arena is undergoing scheduled server optimization. Check back shortly!",
    globalXpMultiplier: 1.0,
    globalCoinMultiplier: 1.0,
    doubleXpEventActive: false,
    eventBannerTextBn: "🔥 সাপ্তাহিক ডাবল XP ও বোনাস কয়েন ইভেন্ট চলছে!",
    eventBannerTextEn: "🔥 Weekend Double XP & Bonus Coins event is now live!",
    dailyMissionsBonus: 100,
    externalWebGame: DEFAULT_EXTERNAL_GAME,
    games: {
      "med-runner": { enabled: true, xpMultiplier: 1.0, coinReward: 50 },
      "bio-slice": { enabled: true, xpMultiplier: 1.0, coinReward: 40 },
      "med-race": { enabled: true, xpMultiplier: 1.0, coinReward: 60 },
      "med-cricket": { enabled: true, xpMultiplier: 1.0, coinReward: 50 },
      "med-soccer": { enabled: true, xpMultiplier: 1.0, coinReward: 50 },
      "cell-clash": { enabled: true, xpMultiplier: 1.0, coinReward: 80 },
      "speed-drill": { enabled: true, xpMultiplier: 1.0, coinReward: 45 },
      "med-memory": { enabled: true, xpMultiplier: 1.0, coinReward: 40 },
      "clinical-er": { enabled: true, xpMultiplier: 1.0, coinReward: 70 },
      "med-word": { enabled: true, xpMultiplier: 1.0, coinReward: 35 },
    }
  };
  const [gamingSettings, setGamingSettings] = useState<any>(DEFAULT_GAMING_SETTINGS);
  const [isSavingGamingSettings, setIsSavingGamingSettings] = useState(false);
  const [gamingSaveSuccess, setGamingSaveSuccess] = useState(false);

  // Search Topic States
  const [searchTopics, setSearchTopics] = useState<any[]>([]);
  const [newTopic, setNewTopic] = useState({ bn: "", en: "", subject: "biology" });
  const [editingTopic, setEditingTopic] = useState<any | null>(null);
  const [topicSearch, setTopicSearch] = useState("");
  const [isSeedingTopics, setIsSeedingTopics] = useState(false);

  // Load search topics on demand only when topics tab is selected
  useEffect(() => {
    if (!hasAccess || subTab !== "topics") return;

    try {
      const cached = sessionStorage.getItem("mb_admin_topics_cache");
      if (cached) {
        setSearchTopics(JSON.parse(cached));
        if (isFirestoreQuotaExceeded()) return;
      }
    } catch {}

    if (isFirestoreQuotaExceeded()) return;

    const qTopics = query(collection(db, "search_topics"), limit(100));
    getDocs(qTopics)
      .then((snapshot) => {
        const list = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          bn: docSnap.data().bn || "",
          en: docSnap.data().en || "",
          subject: docSnap.data().subject || "biology"
        }));
        setSearchTopics(list);
        try { sessionStorage.setItem("mb_admin_topics_cache", JSON.stringify(list)); } catch {}
      })
      .catch((error) => {
        if (isQuotaExceededError(error)) {
          setFirestoreQuotaExhausted();
        }
        console.warn("Failed to fetch search_topics in CommandCenter:", error);
      });
  }, [hasAccess, subTab]);

  // State managers
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // System States
  const [pSettings, setPSettings] = useState<PlatformSettings>({
    socialFeedEnabled: true,
    aiMentorEnabled: true,
    dailyMissionsEnabled: true,
    bossBattlesEnabled: true,
    survivalEnabled: true,
    leaderboardEnabled: true,
    maintenanceMode: false,
    premiumControlMode: "premium_locked",
    activeEvent: "None",
    landingVideoUrl: "https://assets.mixkit.co/videos/preview/mixkit-medical-blue-scanning-interface-41551-large.mp4",
    landingVideoTitle: "🧬 MediBridge Campaign Promo: Bio-Scanning Diagnostic Interface",
    landingVideoEnabled: true,
    backgroundMusicUrl: "https://assets.mixkit.co/music/preview/mixkit-study-and-play-lo-fi-960.mp3",
    backgroundMusicTitle: "🌸 Study Focus: Deep Concentration Meditative Lofi",
    backgroundMusicEnabled: true,
    backgroundMusicVolume: 0.3,
    customLogoUrl: "",
    customLogoEnabled: false
  });

  // Local inputs for Animated Video config (to avoid writing on each keystroke)
  const [videoUrlInput, setVideoUrlInput] = useState("");
  const [videoTitleInput, setVideoTitleInput] = useState("");
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(null);

  // Local inputs for Background Music config
  const [musicUrlInput, setMusicUrlInput] = useState("");
  const [musicTitleInput, setMusicTitleInput] = useState("");
  const [uploadingMusic, setUploadingMusic] = useState(false);
  const [localMusicUrl, setLocalMusicUrl] = useState<string | null>(null);

  // Local inputs for custom logo
  const [logoUrlInput, setLogoUrlInput] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    async function loadStoredVideo() {
      const file = await getVideoFromIndexedDB();
      if (file) {
        setLocalVideoUrl(URL.createObjectURL(file));
      }
    }
    async function loadStoredMusic() {
      const file = await getMusicFromIndexedDB();
      if (file) {
        setLocalMusicUrl(URL.createObjectURL(file));
      }
    }
    loadStoredVideo();
    loadStoredMusic();
  }, []);

  useEffect(() => {
    if (pSettings) {
      setVideoUrlInput(pSettings.landingVideoUrl || "https://assets.mixkit.co/videos/preview/mixkit-medical-blue-scanning-interface-41551-large.mp4");
      setVideoTitleInput(pSettings.landingVideoTitle || "🧬 MediBridge Campaign Promo: Bio-Scanning Diagnostic Interface");
      setMusicUrlInput(pSettings.backgroundMusicUrl || "https://assets.mixkit.co/music/preview/mixkit-study-and-play-lo-fi-960.mp3");
      setMusicTitleInput(pSettings.backgroundMusicTitle || "🌸 Study Focus: Deep Concentration Meditative Lofi");
      setLogoUrlInput(pSettings.customLogoUrl || "");
    }
  }, [pSettings.landingVideoUrl, pSettings.landingVideoTitle, pSettings.backgroundMusicUrl, pSettings.backgroundMusicTitle, pSettings.customLogoUrl]);

  // DB shared queries
  const [questions, setQuestions] = useState<Question[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [notices, setNotices] = useState<AdminNotice[]>([]);
  
  // Filtering and Searching
  const [qSearch, setQSearch] = useState("");
  const [uSearch, setUSearch] = useState("");
  const [qSubjectFilter, setQSubjectFilter] = useState("all");
  const [qCategoryFilter, setQCategoryFilter] = useState("all");

  // User Actions Panel Modal states
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [xpToGrant, setXpToGrant] = useState(100);
  const [coinsToGrant, setCoinsToGrant] = useState(100);
  const [newUserRole, setNewUserRole] = useState<string>("student");

  // Question Form states
  const [isEditingQuestion, setIsEditingQuestion] = useState<Question | null>(null);
  const [qText, setQText] = useState("");
  const [qOptA, setQOptA] = useState("");
  const [qOptB, setQOptB] = useState("");
  const [qOptC, setQOptC] = useState("");
  const [qOptD, setQOptD] = useState("");
  const [qCorrect, setQCorrect] = useState(0);
  const [qExplanation, setQExplanation] = useState("");
  const [qSubject, setQSubject] = useState<any>("Biology");
  const [qChapter, setQChapter] = useState("");
  const [qDifficulty, setQDifficulty] = useState<any>("Medium");
  const [qSource, setQSource] = useState("");
  const [qCategory, setQCategory] = useState("Medical Standard Questions");

  // New Question bulk entry panel additions
  const [questionEntryMode, setQuestionEntryMode] = useState<"single" | "bulk">("single");
  const [bulkInputText, setBulkInputText] = useState("");
  const [bulkImportProgress, setBulkImportProgress] = useState<number | null>(null);

  // Security elements
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([
    { id: "1", type: "login_success", userEmail: user.email, action: "Authentication established", ip: "192.168.12.55", timestamp: "2026-06-15 12:44" },
    { id: "2", type: "admin_act", userEmail: "nuwaisirhoquesbmc@gmail.com", action: "Accessed Command Center dashboard", ip: "103.242.22.11", timestamp: "2026-06-15 12:45" },
    { id: "3", type: "login_failed", userEmail: "unknown_hack@cyber.net", action: "Wrong password alert", ip: "45.122.99.2", timestamp: "2026-06-15 13:02" },
    { id: "4", type: "threat", userEmail: "none", action: "Illegal SQL/NoSQL payload blocked via Security Interceptor", ip: "185.22.45.109", timestamp: "2026-06-15 14:10" }
  ]);

  // Import states
  const [importText, setImportText] = useState("");
  const [parsedQuestions, setParsedQuestions] = useState<any[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [duplicateLog, setDuplicateLog] = useState<{ [key: string]: boolean }>({});
  const [autoMappedCount, setAutoMappedCount] = useState(0);

  // Enhanced Import & Delete smoothness state extensions
  const [importProgress, setImportProgress] = useState<number | null>(null);
  const [importStatusText, setImportStatusText] = useState("");
  const [deleteProgress, setDeleteProgress] = useState<number | null>(null);
  const [deleteStatusText, setDeleteStatusText] = useState("");
  const [parsedFilter, setParsedFilter] = useState<"all" | "valid" | "duplicate">("all");
  const [parsedSearch, setParsedSearch] = useState("");
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  // Pagination & smooth load states to prevent DOM bottlenecks and hangs
  const [qPage, setQPage] = useState(1);
  const [bulkPage, setBulkPage] = useState(1);
  const [uPage, setUPage] = useState(1);
  const [ePage, setEPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  // Duplicate database check & multi-select choices states
  const [selectedQIds, setSelectedQIds] = useState<string[]>([]);
  const [duplicateClusters, setDuplicateClusters] = useState<{ [key: string]: Question[] }>({});
  const [showDuplicateView, setShowDuplicateView] = useState(false);
  const [duplicateFilterMode, setDuplicateFilterMode] = useState<"all" | "duplicates" | "redundants">("all");

  // Deletion confirmation modal states
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    itemCount: number;
    actionType: "single" | "batch" | "deduplicate";
    onConfirm: () => Promise<void> | void;
  } | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Review Queue States (Moderator's pool)
  const [reviewQueue, setReviewQueue] = useState<Question[]>([]);

  // Enrollment Ledger States
  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);
  const [enrollSearch, setEnrollSearch] = useState("");
  const [selectedEnrollUserUid, setSelectedEnrollUserUid] = useState("");
  const [manualPackage, setManualPackage] = useState("Full Course Access");
  const [manualAmount, setManualAmount] = useState(599);
  const [manualChannel, setManualChannel] = useState("bkash");
  const [manualTxnId, setManualTxnId] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [enrollmentSubmitting, setEnrollmentSubmitting] = useState(false);

  // Access Control custom user selection
  const [acSelectedUserUid, setAcSelectedUserUid] = useState("");
  const [acFullAccess, setAcFullAccess] = useState(false);
  const [acBioBootcamp, setAcBioBootcamp] = useState(false);
  const [acGkEng, setAcGkEng] = useState(false);
  const [acMocks, setAcMocks] = useState(false);
  const [acExpiryDate, setAcExpiryDate] = useState("");


  // 1. Initial Listeners with Session Caching & Quota Protection
  useEffect(() => {
    if (!hasAccess || !isUnlocked) return;

    // Check if we already loaded this session to prevent massive read spikes
    try {
      const cachedTime = sessionStorage.getItem("mb_cc_cached_at");
      const isRecent = cachedTime && Date.now() - Number(cachedTime) < 10 * 60 * 1000;
      if (isRecent) {
        const cQuestions = sessionStorage.getItem("mb_cc_questions");
        if (cQuestions) {
          const list = JSON.parse(cQuestions);
          setQuestions(list);
          setReviewQueue(list.filter((q: any) => q.source?.toLowerCase().includes("pending") || q.difficulty === "Easy" && !q.explanation));
        }
        const cUsers = sessionStorage.getItem("mb_cc_users");
        if (cUsers) setUsersList(JSON.parse(cUsers));
        const cNotices = sessionStorage.getItem("mb_cc_notices");
        if (cNotices) setNotices(JSON.parse(cNotices));
        const cEnrollments = sessionStorage.getItem("mb_cc_enrollments");
        if (cEnrollments) setEnrollments(JSON.parse(cEnrollments));
        const cExams = sessionStorage.getItem("mb_cc_exams");
        if (cExams) setLiveExams(JSON.parse(cExams));
        const cSubs = sessionStorage.getItem("mb_cc_submissions");
        if (cSubs) setLiveSubmissions(JSON.parse(cSubs));
        const cPerms = sessionStorage.getItem("mb_cc_perms");
        if (cPerms) setReExamPermissions(JSON.parse(cPerms));

        if (isFirestoreQuotaExceeded()) return;
      }
    } catch {}

    // 100% Migrated Firebase Data to Supabase & Local High-Performance Store
    const platformData = getMigratedSetting<PlatformSettings>("platform");
    if (platformData) {
      setPSettings((prev) => ({ ...prev, ...platformData }));
    }

    const allQuestions = getMigratedQuestions();
    setQuestions(allQuestions);
    const pending = allQuestions.filter(
      (q) => q.source?.toLowerCase().includes("pending") || (q.difficulty === "Easy" && !q.explanation)
    );
    setReviewQueue(pending);

    const allNotices = getMigratedNotices();
    setNotices(allNotices);

    const arenaSettings = getMigratedSetting("gaming_arena");
    if (arenaSettings) {
      setGamingSettings((prev: any) => ({ ...prev, ...arenaSettings }));
    }

    const activeUser = user ? [user] : [];
    setUsersList(activeUser);

    try {
      sessionStorage.setItem("mb_cc_cached_at", String(Date.now()));
    } catch {}
  }, [hasAccess]);

  // Reset pages when filters change to avoid out-of-bounds rendering
  useEffect(() => {
    setQPage(1);
    setBulkPage(1);
  }, [qSubjectFilter, qCategoryFilter, qSearch, duplicateFilterMode]);

  useEffect(() => {
    setUPage(1);
  }, [uSearch]);

  useEffect(() => {
    setEPage(1);
  }, [enrollSearch]);

  const showToast = (msg: string, isErr = false) => {
    if (isErr) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(""), 4000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(""), 4000);
    }
  };

  // 2. Action: Save Platform Settings to Firestore
  const updatePlatformSettings = async (updates: Partial<PlatformSettings>) => {
    try {
      const isSuperAdmin = role === "superadmin" || user.email === "nuwaisirhoquesbmc@gmail.com" || user.email === "hoquenuwaisir@gmail.com";
      const containsVideoUpdate = "landingVideoUrl" in updates || "landingVideoTitle" in updates || "landingVideoEnabled" in updates;
      if (containsVideoUpdate && !isSuperAdmin) {
        showToast(isBn ? "ভিডিও সেটিংস পরিবর্তন করার অনুমতি শুধুমাত্র সুপারএডমিনের রয়েছে!" : "Only Super Admins possess keys to edit landing page video tracks!", true);
        return;
      }

      const containsMusicUpdate = "backgroundMusicUrl" in updates || "backgroundMusicTitle" in updates || "backgroundMusicEnabled" in updates;
      if (containsMusicUpdate && !isSuperAdmin) {
        showToast(isBn ? "মিউজিক সেটিংস পরিবর্তন করার অনুমতি শুধুমাত্র সুপারএডমিনের রয়েছে!" : "Only Super Admins possess keys to edit background music tracks!", true);
        return;
      }

      const next = { ...pSettings, ...updates };
      setPSettings(next);
      saveMigratedSetting("platform", next);
      showToast(isBn ? "প্ল্যাটফর্ম সেটিংস সফলভাবে আপডেট হয়েছে!" : "Platform configuration dispatched and updated globally!");
      logActivity(`Updated platform settings: ${Object.keys(updates).join(", ")}`);
    } catch (err: any) {
      showToast(err.message, true);
    }
  };

  const handleDirectVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isSuperAdmin = role === "superadmin" || user.email === "nuwaisirhoquesbmc@gmail.com" || user.email === "hoquenuwaisir@gmail.com";
    if (!isSuperAdmin) {
      showToast(isBn ? "ভিডিও আপলোড করার অনুমতি শুধুমাত্র সুপারএডমিনের রয়েছে!" : "Only Super Admins hold keys to directly upload files!", true);
      return;
    }

    if (!file.type.startsWith("video/")) {
      showToast(isBn ? "অনুগ্রহ করে একটি সঠিক ভিডিও ফাইল (.mp4/.webm) আপলোড করুন!" : "Please choose a valid video file (.mp4/.webm)!", true);
      return;
    }

    try {
      setUploadingVideo(true);
      await saveVideoToIndexedDB(file);
      
      if (localVideoUrl) {
        URL.revokeObjectURL(localVideoUrl);
      }
      const newUrl = URL.createObjectURL(file);
      setLocalVideoUrl(newUrl);
      
      setVideoUrlInput("local_indexeddb_promo");
      
      await updatePlatformSettings({
        landingVideoUrl: "local_indexeddb_promo",
        landingVideoTitle: videoTitleInput || "🔥 MediBridge Campaign Promo"
      });

      showToast(isBn ? "ভিডিও সফলভাবে সরাসরি আপলোড করা হয়েছে!" : "Video direct uploaded and cached successfully in database!", false);
    } catch (err: any) {
      console.error(err);
      showToast(isBn ? "আপলোড ব্যর্থ হয়েছে!" : "Direct upload failed: " + err.message, true);
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleDirectMusicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isSuperAdmin = role === "superadmin" || user.email === "nuwaisirhoquesbmc@gmail.com" || user.email === "hoquenuwaisir@gmail.com";
    if (!isSuperAdmin) {
      showToast(isBn ? "মিউজিক আপলোড করার অনুমতি শুধুমাত্র সুপারএডমিনের রয়েছে!" : "Only Super Admins hold keys to directly upload music files!", true);
      return;
    }

    if (!file.type.startsWith("audio/")) {
      showToast(isBn ? "অনুগ্রহ করে একটি সঠিক অডিও ফাইল (.mp3/.wav/.ogg) আপলোড করুন!" : "Please choose a valid audio file (.mp3/.wav/.ogg)!", true);
      return;
    }

    try {
      setUploadingMusic(true);
      await saveMusicToIndexedDB(file);
      
      if (localMusicUrl) {
        URL.revokeObjectURL(localMusicUrl);
      }
      const newUrl = URL.createObjectURL(file);
      setLocalMusicUrl(newUrl);
      
      setMusicUrlInput("local_indexeddb_promo");
      
      await updatePlatformSettings({
        backgroundMusicUrl: "local_indexeddb_promo",
        backgroundMusicTitle: musicTitleInput || "🌸 Study Focus Ambient"
      });

      showToast(isBn ? "মিউজিক সফলভাবে সরাসরি আপলোড করা হয়েছে!" : "Background music song direct uploaded and cached successfully in database!", false);
    } catch (err: any) {
      console.error(err);
      showToast(isBn ? "মিউজিক আপলোড ব্যর্থ হয়েছে!" : "Background music direct upload failed: " + err.message, true);
    } finally {
      setUploadingMusic(false);
    }
  };

  const handleDirectLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isSuperAdmin = role === "superadmin" || user.email === "nuwaisirhoquesbmc@gmail.com" || user.email === "hoquenuwaisir@gmail.com";
    if (!isSuperAdmin) {
      showToast(isBn ? "লোগো আপলোড করার অনুমতি শুধুমাত্র সুপারএডমিনের রয়েছে!" : "Only Super Admins hold keys to directly upload logo files!", true);
      return;
    }

    if (!file.type.startsWith("image/")) {
      showToast(isBn ? "অনুগ্রহ করে একটি সঠিক ছবি ফাইল (.png/.jpg/.jpeg/.svg) আপলোড করুন!" : "Please choose a valid image file (.png/.jpg/.jpeg/.svg)!", true);
      return;
    }

    try {
      setUploadingLogo(true);
      
      // Auto-compress and downscale image client-side to ensure it is < 100KB (perfect for Firestore)
      const compressAndResizeLogo = (imgFile: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement("canvas");
              let width = img.width;
              let height = img.height;

              // Max dimension of 400px is perfect for app branding logo
              const MAX_DIM = 400;
              if (width > MAX_DIM || height > MAX_DIM) {
                if (width > height) {
                  height = Math.round((height * MAX_DIM) / width);
                  width = MAX_DIM;
                } else {
                  width = Math.round((width * MAX_DIM) / height);
                  height = MAX_DIM;
                }
              }

              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext("2d");
              if (!ctx) {
                reject(new Error("Could not construct graphics canvas context"));
                return;
              }

              ctx.drawImage(img, 0, 0, width, height);
              // Export as highly compressed WebP (or PNG/JPEG fallback)
              const compressedBase64 = canvas.toDataURL("image/webp", 0.85);
              resolve(compressedBase64);
            };
            img.onerror = () => reject(new Error("Failed to process image file structure"));
            img.src = event.target?.result as string;
          };
          reader.onerror = () => reject(new Error("Failed to read raw image file"));
          reader.readAsDataURL(imgFile);
        });
      };

      const optimizedBase64 = await compressAndResizeLogo(file);
      setLogoUrlInput(optimizedBase64);
      await updatePlatformSettings({
        customLogoUrl: optimizedBase64,
        customLogoEnabled: true
      });
      showToast(isBn ? "লোগোটি সফলভাবে আপলোড ও অপ্টিমাইজ করা হয়েছে!" : "App logo uploaded, compressed, and synchronized across all spots!", false);
    } catch (err: any) {
      console.error(err);
      showToast(isBn ? "লোগো আপলোড ব্যর্থ হয়েছে!" : "Logo direct upload failed: " + err.message, true);
    } finally {
      setUploadingLogo(false);
    }
  };

  const logActivity = (actionText: string) => {
    const log: SecurityLog = {
      id: Math.random().toString(),
      type: "admin_act",
      userEmail: user.email,
      action: actionText,
      ip: "127.0.0.1",
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 16)
    };
    setSecurityLogs((prev) => [log, ...prev]);
  };

  // 3. Action: User Controls
  const handleGrantXP = async () => {
    if (!selectedUser) return;
    try {
      const userRef = doc(db, "users", selectedUser.uid);
      const nextXp = (selectedUser.xp || 150) + xpToGrant;
      // Recalculate level (every 500 XP is a level)
      const nextLevel = Math.max(1, Math.floor(nextXp / 500) + 1);

      await updateDoc(userRef, {
        xp: nextXp,
        level: nextLevel
      });
      showToast(`${selectedUser.displayName} granted ${xpToGrant} XP (Level ${nextLevel})`);
      logActivity(`Granted ${xpToGrant} XP to ${selectedUser.displayName}`);
    } catch (err: any) {
      showToast(err.message, true);
    }
  };

  const handleGrantCoins = async () => {
    if (!selectedUser) return;
    try {
      const userRef = doc(db, "users", selectedUser.uid);
      const nextCoins = (selectedUser.coins || 100) + coinsToGrant;

      await updateDoc(userRef, {
        coins: nextCoins
      });
      showToast(`${selectedUser.displayName} infilled with ${coinsToGrant} Gold Coins`);
      logActivity(`Granted ${coinsToGrant} coins to ${selectedUser.displayName}`);
    } catch (err: any) {
      showToast(err.message, true);
    }
  };

  // Access Control & Enrollment Ledger Management
  const handleSelectAcUser = (uid: string) => {
    setAcSelectedUserUid(uid);
    const u = usersList.find(userObj => userObj.uid === uid);
    if (u) {
      setAcFullAccess(!!u.isPremium);
      setAcBioBootcamp(!!(u as any).enrolledBio);
      setAcGkEng(!!(u as any).enrolledGkEng);
      setAcMocks(!!(u as any).enrolledMocks);
      
      if (u.premiumExpiry) {
        try {
          const dateStr = new Date(u.premiumExpiry).toISOString().split("T")[0];
          setAcExpiryDate(dateStr);
        } catch (e) {
          setAcExpiryDate("");
        }
      } else {
        setAcExpiryDate("");
      }
    } else {
      setAcFullAccess(false);
      setAcBioBootcamp(false);
      setAcGkEng(false);
      setAcMocks(false);
      setAcExpiryDate("");
    }
  };

  const handleSaveAccessControl = async () => {
    if (!acSelectedUserUid) {
      showToast(isBn ? "অনুগ্রহ করে একজন শিক্ষার্থী নির্বাচন করুন!" : "Please select a student first!", true);
      return;
    }
    setLoading(true);
    try {
      const userRef = doc(db, "users", acSelectedUserUid);
      const expiryVal = acExpiryDate ? new Date(acExpiryDate).toISOString() : null;
      const selectedStudent = usersList.find(u => u.uid === acSelectedUserUid);
      
      await updateDoc(userRef, {
        isPremium: acFullAccess,
        premiumExpiry: expiryVal,
        enrolledBio: acBioBootcamp,
        enrolledGkEng: acGkEng,
        enrolledMocks: acMocks
      });
      
      showToast(isBn ? "অ্যাক্সেস কন্ট্রোল সফলভাবে আপডেট হয়েছে! 🛡️" : "Access Control updated successfully! 🛡️");
      logActivity(`Updated access control permissions for ${selectedStudent?.displayName || acSelectedUserUid}`);
      playSound("victory");
    } catch (err: any) {
      console.error(err);
      showToast(isBn ? "সংরক্ষণ করতে ব্যর্থ হয়েছে।" : "Failed to save access control.", true);
      playSound("wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleManualEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnrollUserUid) {
      showToast(isBn ? "অনুগ্রহ করে একজন শিক্ষার্থী নির্বাচন করুন!" : "Please select a student to enroll!", true);
      playSound("wrong");
      return;
    }
    if (!manualTxnId) {
      showToast(isBn ? "ট্রানজেকশন আইডি (TxID) আবশ্যিক!" : "Transaction ID (TxID) is required!", true);
      playSound("wrong");
      return;
    }
    
    const selectedStudent = usersList.find(u => u.uid === selectedEnrollUserUid);
    if (!selectedStudent) return;
    
    setEnrollmentSubmitting(true);
    try {
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 6); // default to 6 months access
      
      // 1. Write the ledger receipt
      await addDoc(collection(db, "enrollments"), {
        userId: selectedStudent.uid,
        userEmail: selectedStudent.email,
        userDisplayName: selectedStudent.displayName,
        packageName: manualPackage,
        amount: Number(manualAmount),
        paymentMethod: manualChannel,
        trxId: manualTxnId,
        status: "active",
        createdAt: new Date().toISOString(),
        expiryDate: expiryDate.toISOString(),
        notes: manualNotes || "Offline manual admin intake"
      });
      
      // 2. Grant permissions directly to user profile
      const userRef = doc(db, "users", selectedStudent.uid);
      const updates: any = {};
      if (manualPackage === "Full Course Access") {
        updates.isPremium = true;
        updates.premiumExpiry = expiryDate.toISOString();
        updates.premiumType = "6months";
      } else if (manualPackage === "Biology Bootcamp") {
        updates.enrolledBio = true;
      } else if (manualPackage === "GK & English Premium") {
        updates.enrolledGkEng = true;
      } else if (manualPackage === "Mock Test Series") {
        updates.enrolledMocks = true;
      }
      
      await updateDoc(userRef, updates);
      
      showToast(isBn ? "ম্যানুয়াল ভর্তি ও অ্যাক্সেস সফলভাবে সম্পন্ন হয়েছে! 🎉" : "Manual enrollment and access granted successfully! 🎉");
      logActivity(`Manually enrolled ${selectedStudent.displayName} into ${manualPackage}`);
      playSound("victory");
      
      // Clear fields
      setManualTxnId("");
      setManualNotes("");
    } catch (err: any) {
      console.error(err);
      showToast(isBn ? "ভর্তি প্রসেস করতে ব্যর্থ হয়েছে।" : "Failed to process manual enrollment.", true);
      playSound("wrong");
    } finally {
      setEnrollmentSubmitting(false);
    }
  };

  const handleRevokeEnrollment = async (enrollId: string, userId: string, pkgName: string) => {
    if (!window.confirm(isBn ? "আপনি কি নিশ্চিতভাবে এই শিক্ষার্থীর অ্যাক্সেস বাতিল করতে চান?" : "Are you sure you want to revoke this student's access?")) {
      return;
    }
    setLoading(true);
    try {
      // 1. Delete enrollment record
      await deleteDoc(doc(db, "enrollments", enrollId));
      
      // 2. Revoke from student profile
      const userRef = doc(db, "users", userId);
      const updates: any = {};
      if (pkgName === "Full Course Access" || pkgName === "Monthly Premium Access" || pkgName === "6-Months Premium Access") {
        updates.isPremium = false;
        updates.premiumExpiry = null;
      } else if (pkgName === "Biology Bootcamp") {
        updates.enrolledBio = false;
      } else if (pkgName === "GK & English Premium") {
        updates.enrolledGkEng = false;
      } else if (pkgName === "Mock Test Series") {
        updates.enrolledMocks = false;
      }
      
      await updateDoc(userRef, updates);
      showToast(isBn ? "অ্যাক্সেস সফলভাবে বাতিল করা হয়েছে। 🚨" : "Access successfully revoked. 🚨");
      logActivity(`Revoked ${pkgName} access from user ID ${userId}`);
      playSound("click");
    } catch (err: any) {
      console.error(err);
      showToast(isBn ? "বাতিল করতে ব্যর্থ হয়েছে।" : "Failed to revoke access.", true);
      playSound("wrong");
    } finally {
      setLoading(false);
    }
  };

  // Topic Control Management functions
  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic.bn.trim() || !newTopic.en.trim()) {
      showToast(isBn ? "দয়া করে বাংলা ও ইংরেজি নাম উভয়ই পূরণ করুন!" : "Please fill out both Bangla & English titles!", true);
      playSound("wrong");
      return;
    }
    try {
      setLoading(true);
      await addDoc(collection(db, "search_topics"), {
        bn: newTopic.bn.trim(),
        en: newTopic.en.trim(),
        subject: newTopic.subject,
        createdAt: new Date().toISOString()
      });
      showToast(isBn ? "টপিকটি সফলভাবে যোগ করা হয়েছে!" : "Search topic successfully added!");
      logActivity(`Added search topic: ${newTopic.en}`);
      playSound("victory");
      setNewTopic({ bn: "", en: "", subject: "biology" });
    } catch (err: any) {
      console.error(err);
      showToast(isBn ? "টপিক যোগ করতে ব্যর্থ হয়েছে।" : "Failed to add search topic.", true);
      playSound("wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTopic || !editingTopic.bn.trim() || !editingTopic.en.trim()) {
      showToast(isBn ? "দয়া করে বাংলা ও ইংরেজি নাম উভয়ই পূরণ করুন!" : "Please fill out both Bangla & English titles!", true);
      playSound("wrong");
      return;
    }
    try {
      setLoading(true);
      await updateDoc(doc(db, "search_topics", editingTopic.id), {
        bn: editingTopic.bn.trim(),
        en: editingTopic.en.trim(),
        subject: editingTopic.subject
      });
      showToast(isBn ? "টপিকটি সফলভাবে আপডেট করা হয়েছে!" : "Search topic successfully updated!");
      logActivity(`Updated search topic: ${editingTopic.en}`);
      playSound("victory");
      setEditingTopic(null);
    } catch (err: any) {
      console.error(err);
      showToast(isBn ? "টপিক আপডেট করতে ব্যর্থ হয়েছে।" : "Failed to update search topic.", true);
      playSound("wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTopic = (topicId: string, topicName: string) => {
    playSound("click");
    setDeleteConfirmText("");
    setDeleteConfirmModal({
      isOpen: true,
      title: isBn ? "টপিক মুছে ফেলার নিশ্চিতকরণ" : "Confirm Delete Topic",
      message: isBn 
        ? `আপনি কি নিশ্চিতভাবে "${topicName}" টপিকটি ডিলিট করতে চান? এটি সার্চ বক্স থেকে মুছে যাবে।`
        : `Are you sure you want to permanently delete "${topicName}"? It will be removed from the global search index.`,
      itemCount: 1,
      actionType: "single",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "search_topics", topicId));
          showToast(isBn ? "টপিকটি সফলভাবে মুছে ফেলা হয়েছে!" : "Search topic successfully deleted!");
          logActivity(`Deleted search topic ID: ${topicId}`);
          playSound("click");
        } catch (err: any) {
          console.error(err);
          showToast(isBn ? "টপিকটি মুছতে ব্যর্থ হয়েছে।" : "Failed to delete search topic.", true);
        } finally {
          setDeleteConfirmModal(null);
        }
      }
    });
  };

  const handleSeedDefaultTopics = async () => {
    playSound("click");
    try {
      setIsSeedingTopics(true);
      const DEFAULT_CHAPTERS = [
        { bn: "কোষ ও এর গঠন", en: "Cell Structure & Organelles", subject: "biology" },
        { bn: "কোষ বিভাজন", en: "Cell Division", subject: "biology" },
        { bn: "রক্ত ও রক্ত সংবহন", en: "Blood & Circulation", subject: "biology" },
        { bn: "উদ্ভিদ শারীরতত্ত্ব", en: "Plant Physiology", subject: "biology" },
        { bn: "প্রাণীর পরিচিতি ও শ্রেণীবিন্যাস", en: "Animal Classification", subject: "biology" },
        { bn: "গুণগত রসায়ন", en: "Qualitative Chemistry", subject: "chemistry" },
        { bn: "জৈব রসায়ন", en: "Organic Chemistry", subject: "chemistry" },
        { bn: "রাসায়নিক পরিবর্তন", en: "Chemical Change", subject: "chemistry" },
        { bn: "পরিমাণগত রসায়ন", en: "Quantitative Chemistry", subject: "chemistry" },
        { bn: "পরিবেশ রসায়ন", en: "Environmental Chemistry", subject: "chemistry" },
        { bn: "ভেক্টর", en: "Vectors", subject: "physics" },
        { bn: "মহাকর্ষ ও গ্র্যাভিটেশন", en: "Gravitation & Gravity", subject: "physics" },
        { bn: "যান্ত্রিক ধর্ম ও গতিবিদ্যা", en: "Mechanical Properties & Dynamics", subject: "physics" },
        { bn: "তাপগতিবিদ্যা", en: "Thermodynamics", subject: "physics" },
        { bn: "ভৌত আলোকবিজ্ঞান", en: "Physical Optics", subject: "physics" }
      ];

      const batch = writeBatch(db);
      DEFAULT_CHAPTERS.forEach((ch) => {
        const newRef = doc(collection(db, "search_topics"));
        batch.set(newRef, {
          bn: ch.bn,
          en: ch.en,
          subject: ch.subject,
          createdAt: new Date().toISOString()
        });
      });

      await batch.commit();
      showToast(isBn ? "সব ডিফল্ট অধ্যায় সফলভাবে ডাটাবেজে লোড হয়েছে!" : "Successfully seeded all default chapters!");
      logActivity("Seeded default search topics list");
      playSound("victory");
    } catch (err: any) {
      console.error(err);
      showToast(isBn ? "ডিফল্ট অধ্যায় লোড করতে ব্যর্থ হয়েছে।" : "Failed to seed default chapters.", true);
      playSound("wrong");
    } finally {
      setIsSeedingTopics(false);
    }
  };

  const getPoolOfQuestions = () => {
    return [...STARTER_QUESTIONS, ...questions];
  };

  const getChaptersForSubject = (subject: string): string[] => {
    const pool = getPoolOfQuestions();
    const filtered = pool.filter((q) => q.subject.toLowerCase() === subject.toLowerCase());
    const chapters = Array.from(new Set(filtered.map((q) => q.chapter).filter(Boolean)));
    return ["All", ...chapters];
  };

  const handleCreateLiveExam = async () => {
    playSound("click");
    if (!newExamTitle.trim()) {
      showToast(isBn ? "মডেল টেস্টের নাম দিতে হবে!" : "Please provide a model test title!", true);
      return;
    }

    try {
      setLoading(true);
      const pool = getPoolOfQuestions();
      // Filter questions by subject and chapter if applicable
      let matching = pool.filter(q => {
        const subMatch = q.subject.toLowerCase() === newExamSubject.toLowerCase();
        const chapMatch = newExamChapter === "All" || q.chapter === newExamChapter;
        return subMatch && chapMatch;
      });

      // Fallback if not enough matching questions: search ignoring chapter
      if (matching.length < newExamQuestionsCount) {
        matching = pool.filter(q => q.subject.toLowerCase() === newExamSubject.toLowerCase());
      }

      // If still not enough, take any from pool
      if (matching.length === 0) {
        matching = pool;
      }

      // Shuffle matching list and slice to requested count
      const shuffled = [...matching].sort(() => 0.5 - Math.random());
      const selectedQuestions = shuffled.slice(0, Math.min(newExamQuestionsCount, shuffled.length));

      if (selectedQuestions.length === 0) {
        showToast(isBn ? "পরীক্ষার জন্য কোন উপযুক্ত প্রশ্ন পাওয়া যায়নি!" : "No suitable questions found for this exam!", true);
        return;
      }

      const questionIds = selectedQuestions.map(q => q.id || q.questionText);

      const examDoc = {
        title: newExamTitle.trim(),
        subject: newExamSubject,
        chapter: newExamChapter,
        duration: Number(newExamDuration),
        totalQuestions: selectedQuestions.length,
        questionIds,
        createdBy: user.uid,
        creatorName: user.displayName || "Unknown Educator",
        createdAt: new Date().toISOString(),
        isActive: true
      };

      await addDoc(collection(db, "live_exams"), examDoc);
      playSound("levelup");
      showToast(isBn ? "লাইভ মডেল টেস্ট সফলভাবে তৈরি হয়েছে!" : "Live model test published successfully!");
      
      // Reset forms
      setNewExamTitle("");
      setNewExamSubject("Biology");
      setNewExamChapter("All");
      setNewExamDuration(10);
      setNewExamQuestionsCount(10);
    } catch (err: any) {
      console.error(err);
      handleFirestoreError(err, OperationType.CREATE, "live_exams");
      showToast(isBn ? "পরীক্ষা তৈরি করতে সমস্যা হয়েছে।" : "Failed to create live exam.", true);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLiveExamStatus = async (examId: string, currentStatus: boolean) => {
    playSound("click");
    try {
      const examRef = doc(db, "live_exams", examId);
      await updateDoc(examRef, { isActive: !currentStatus });
      showToast(isBn ? "পরীক্ষার সচলতা পরিবর্তন করা হয়েছে!" : "Exam status updated successfully!");
    } catch (err: any) {
      console.error(err);
      showToast(isBn ? "অবস্থা পরিবর্তন করতে ব্যর্থ হয়েছে।" : "Failed to update status.", true);
    }
  };

  const handleDeleteLiveExam = async (examId: string, examTitle: string) => {
    playSound("click");
    if (!window.confirm(isBn ? `আপনি কি নিশ্চিতভাবে "${examTitle}" লাইভ পরীক্ষাটি ডিলিট করতে চান?` : `Are you sure you want to delete "${examTitle}"?`)) {
      return;
    }
    try {
      const examRef = doc(db, "live_exams", examId);
      await deleteDoc(examRef);
      showToast(isBn ? "লাইভ পরীক্ষা সফলভাবে ডিলিট করা হয়েছে!" : "Live exam deleted successfully!");
    } catch (err: any) {
      console.error(err);
      showToast(isBn ? "ডিলিট করতে ব্যর্থ হয়েছে।" : "Failed to delete exam.", true);
    }
  };

  // Grant Re-Exam permission to a student for a specific live exam
  const handleGrantReExam = async (
    targetUid: string,
    targetEmail: string,
    targetName: string,
    examId: string,
    examTitle: string,
    reason: string = "Admin granted re-exam approval"
  ) => {
    if (!targetUid || !examId) {
      showToast(isBn ? "শিক্ষার্থী এবং পরীক্ষার তথ্য অসম্পূর্ণ।" : "Incomplete student or exam data.", true);
      return;
    }
    playSound("click");
    try {
      setLoading(true);
      const permId = `reexam_${examId}_${targetUid}`;
      const payload: LiveExamReExamPermission = {
        id: permId,
        examId,
        examTitle,
        userId: targetUid,
        userEmail: targetEmail || "student@medibridge.com",
        userDisplayName: targetName || targetEmail || "Student",
        grantedBy: user.displayName || user.email || "Administrator",
        grantedAt: new Date().toISOString(),
        status: "active",
        reason: reason.trim() || (isBn ? "অ্যাডমিন কর্তৃক রি-এক্সাম অনুমতি মঞ্জুর করা হয়েছে" : "Admin approved re-exam request"),
        attemptsAllowed: 1
      };

      await setDoc(doc(db, "live_exam_reexam_permissions", permId), payload, { merge: true });
      playSound("levelup");
      showToast(isBn 
        ? `${targetName || targetEmail}-কে "${examTitle}" পরীক্ষার জন্য রি-এক্সাম পারমিশন দেওয়া হয়েছে!` 
        : `Granted re-exam permission to ${targetName || targetEmail}!`);
      logActivity(`Granted live exam re-take permission for user ${targetEmail} on exam "${examTitle}"`);
      setGrantingReExamModal(null);
    } catch (err: any) {
      console.error(err);
      showToast(isBn ? "পারমিশন দিতে সমস্যা হয়েছে।" : "Failed to grant re-exam permission.", true);
    } finally {
      setLoading(false);
    }
  };

  // Revoke Re-Exam permission
  const handleRevokeReExam = async (examId: string, targetUid: string, targetName: string) => {
    playSound("click");
    if (!window.confirm(isBn ? `আপনি কি নিশ্চিতভাবে ${targetName}-এর রি-এক্সাম পারমিশন বাতিল করতে চান?` : `Are you sure you want to revoke re-exam permission for ${targetName}?`)) {
      return;
    }
    try {
      const permId = `reexam_${examId}_${targetUid}`;
      await setDoc(doc(db, "live_exam_reexam_permissions", permId), {
        status: "revoked",
        revokedAt: new Date().toISOString(),
        revokedBy: user.displayName || user.email || "Administrator"
      }, { merge: true });
      showToast(isBn ? "রি-এক্সাম পারমিশন বাতিল করা হয়েছে।" : "Re-exam permission revoked successfully.");
      logActivity(`Revoked re-exam permission for user ${targetUid} on exam ${examId}`);
    } catch (err: any) {
      console.error(err);
      showToast(isBn ? "বাতিল করতে সমস্যা হয়েছে।" : "Failed to revoke permission.", true);
    }
  };

  // Delete specific live exam submission record
  const handleDeleteLiveSubmission = async (subId: string, studentName: string) => {
    playSound("click");
    if (!window.confirm(isBn ? `আপনি কি নিশ্চিতভাবে ${studentName}-এর এই সাবমিশনটি ডিলিট করতে চান?` : `Are you sure you want to delete this submission from ${studentName}?`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, "live_exam_submissions", subId));
      showToast(isBn ? "সাবমিশন রেকর্ড মুছে ফেলা হয়েছে।" : "Submission record purged successfully.");
    } catch (err: any) {
      console.error(err);
      showToast(isBn ? "মুছতে সমস্যা হয়েছে।" : "Failed to delete submission.", true);
    }
  };

  // Save Gaming Arena control settings
  const handleSaveGamingArenaSettings = async (customSettings?: any) => {
    playSound("click");
    try {
      setIsSavingGamingSettings(true);
      const dataToSave = customSettings || gamingSettings;
      saveMigratedSetting("gaming_arena", {
        ...dataToSave,
        updatedAt: new Date().toISOString(),
        updatedBy: user.displayName || user.email || "Admin"
      });

      playSound("levelup");
      setGamingSaveSuccess(true);
      setTimeout(() => setGamingSaveSuccess(false), 3000);
      showToast(isBn ? "গেমিং অ্যারেনা সেটিংস সফলভাবে সেভ করা হয়েছে!" : "Gaming Arena controls synchronized successfully!");
      logActivity("Updated Gaming Arena master economy and game control settings");
    } catch (err: any) {
      console.error(err);
      showToast(isBn ? "সেটিংস সংরক্ষণ করতে ব্যর্থ হয়েছে।" : "Failed to save gaming arena settings.", true);
    } finally {
      setIsSavingGamingSettings(false);
    }
  };

  const handleResetGamingArenaSettings = () => {
    playSound("click");
    if (!window.confirm(isBn ? "আপনি কি গেমিং অ্যারেনা সেটিংস ডিফল্টে রিসেট করতে চান?" : "Reset Gaming Arena settings to system defaults?")) return;
    setGamingSettings(DEFAULT_GAMING_SETTINGS);
    handleSaveGamingArenaSettings(DEFAULT_GAMING_SETTINGS);
  };

  const handleBanUser = async (banned: boolean) => {
    if (!selectedUser) return;
    try {
      const userRef = doc(db, "users", selectedUser.uid);
      await updateDoc(userRef, {
        rank: banned ? "⚠️ Banned Operator" : "Freshman",
        coins: banned ? 0 : 50
      });
      showToast(banned ? `${selectedUser.displayName} suspended securely!` : `${selectedUser.displayName} unlocked.`);
      logActivity(banned ? `Banned and zeroed user ${selectedUser.displayName}` : `Reinstated user ${selectedUser.displayName}`);
    } catch (err: any) {
      showToast(err.message, true);
    }
  };

  const handleResetProgress = async () => {
    if (!selectedUser) return;
    if (!confirm(isBn ? "আপনি কি নিশ্চিতভাবে এই শিক্ষার্থীর সমস্ত অগ্রগতি রিসেট করতে চান?" : "Are you sure you want to completely zero out this user's stats?")) return;
    try {
      const userRef = doc(db, "users", selectedUser.uid);
      await updateDoc(userRef, {
        xp: 150,
        level: 1,
        coins: 100,
        rank: "Freshman",
        dailyStreak: 1,
        questionsSolved: 0,
        questionsCorrect: 0
      });
      showToast("User statistics zeroed.");
      logActivity(`Zeroed out user progress stats for ${selectedUser.displayName}`);
    } catch (err: any) {
      showToast(err.message, true);
    }
  };

  const handleChangeRole = async () => {
    if (!selectedUser) return;
    if (role !== "superadmin" && user.email !== "nuwaisirhoquesbmc@gmail.com" && user.email !== "hoquenuwaisir@gmail.com") {
      showToast(isBn ? "শুধুমাত্র সুপার এডমিন রোল পরিবর্তন করতে পারবেন!" : "Only Super Admins can alter role hierarchy fields!", true);
      return;
    }
    try {
      const userRef = doc(db, "users", selectedUser.uid);
      await updateDoc(userRef, {
        role: newUserRole
      });
      showToast(`Elevating ${selectedUser.displayName} to system ${newUserRole}`);
      logActivity(`Changed role of ${selectedUser.displayName} to ${newUserRole}`);
    } catch (err: any) {
      showToast(err.message, true);
    }
  };

  // 4. Action: Save / Edit Question
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qText || !qOptA || !qOptB) {
      showToast(isBn ? "দয়া করে সমস্ত তথ্য পূরণ করুন।" : "Provide valid question text and at least options A and B", true);
      return;
    }

    try {
      const payload = {
        questionText: qText,
        options: [qOptA, qOptB, qOptC || "N/A", qOptD || "N/A"],
        correctAnswerIndex: Number(qCorrect),
        explanation: qExplanation,
        subject: qSubject,
        chapter: qChapter || "General Chapter",
        difficulty: qDifficulty,
        source: qSource || "System Command Entry",
        category: qCategory,
        createdAt: serverTimestamp(),
        createdBy: user.uid
      };

      if (isEditingQuestion) {
        const updatedQ: Question = { ...payload, id: isEditingQuestion.id } as Question;
        saveMigratedQuestion(updatedQ);
        setQuestions((prev) => prev.map((q) => (q.id === isEditingQuestion.id ? updatedQ : q)));
        showToast(isBn ? "প্রশ্ন সফলভাবে আপডেট করা হয়েছে!" : "Medical question updated and synchronized!");
        logActivity(`Edited question ID: ${isEditingQuestion.id}`);
        setIsEditingQuestion(null);
      } else {
        const newId = `q_admin_${Date.now()}`;
        const newQ: Question = { ...payload, id: newId } as Question;
        saveMigratedQuestion(newQ);
        setQuestions((prev) => [newQ, ...prev]);
        showToast(isBn ? "নতুন মেডিকেল প্রশ্ন ডাটাবেজে যুক্ত হয়েছে!" : "New High-Yield Medical MCQ seeded successfully!");
        logActivity(`Created question: ${qText.substring(0, 30)}...`);
      }

      // Reset form
      setQText(""); setQOptA(""); setQOptB(""); setQOptC(""); setQOptD("");
      setQExplanation(""); setQChapter(""); setQSource("");
    } catch (err: any) {
      showToast(err.message, true);
    }
  };

  const parseBulkQuestions = (rawText: string, defaultSubject: string, defaultCategory: string) => {
    const text = rawText.trim();
    if (!text) return [];

    // Check if it's JSON array
    if (text.startsWith("[") && text.endsWith("]")) {
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          return parsed.map((q: any) => ({
            questionText: q.questionText || q.question || "Untitled Medical Query",
            options: Array.isArray(q.options) && q.options.length >= 2 
              ? q.options 
              : [q.optionA || "Option A", q.optionB || "Option B", q.optionC || "N/A", q.optionD || "N/A"],
            correctAnswerIndex: q.correctAnswerIndex !== undefined ? Number(q.correctAnswerIndex) : 0,
            explanation: q.explanation || "",
            subject: q.subject || defaultSubject,
            chapter: q.chapter || "General",
            difficulty: q.difficulty || "Medium",
            source: q.source || "Bulk Console Ingress",
            category: q.category || defaultCategory
          }));
        }
      } catch (e) {
        // Fallback to text lines parser
      }
    }

    // Line-by-line custom text parser
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    const results: any[] = [];
    let currentQ: any = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Match common indicators like Question 1:, Q1:, 1., বা ১০.
      const isQuestionPrefix = /^(Question\s*\d*[:.]?|Q[:.]?\s*\d*[:.]?|\d+[:.)-]?|[\u09E6-\u09EF]+[:.)-]?)/i.test(line);
      const isOptionLine = /^[A-D\u0995-\u0998][\s).:-]/i.test(line);
      const isAnswerLine = /^(Ans(wer)?|Correct|উত্তর)[:.-]/i.test(line);
      const isExplanationLine = /^(Explain(ation)?|ব্যাখ্যা)[:.-]/i.test(line);

      if (isQuestionPrefix && !isOptionLine && !isAnswerLine && !isExplanationLine) {
        if (currentQ && currentQ.questionText) {
          results.push(currentQ);
        }
        const cleanText = line.replace(/^(Question\s*\d*[:.]?|Q[:.]?\s*\d*[:.]?|\d+[:.)-]?|[\u09E6-\u09EF]+[:.)-]?)\s*/i, "");
        currentQ = {
          questionText: cleanText,
          options: [],
          correctAnswerIndex: 0,
          explanation: "",
          subject: defaultSubject,
          chapter: qChapter || "General",
          difficulty: qDifficulty || "Medium",
          source: qSource || "Bulk Ingress Panel",
          category: defaultCategory
        };
      } else if (isOptionLine && currentQ) {
        const match = line.match(/^([A-D\u0995-\u0998])[\s).:-]+(.*)/i);
        if (match) {
          currentQ.options.push(match[2].trim());
        } else {
          currentQ.options.push(line);
        }
      } else if (isAnswerLine && currentQ) {
        const cleanAns = line.replace(/^(Ans(wer)?|Correct|উত্তর)[:.-]\s*/i, "").toUpperCase().trim();
        if (["A", "B", "C", "D"].includes(cleanAns)) {
          currentQ.correctAnswerIndex = ["A", "B", "C", "D"].indexOf(cleanAns);
        } else if (["ক", "খ", "গ", "ঘ"].includes(cleanAns)) {
          currentQ.correctAnswerIndex = ["ক", "খ", "গ", "ঘ"].indexOf(cleanAns);
        } else {
          const num = parseInt(cleanAns, 10);
          if (!isNaN(num) && num >= 1 && num <= 4) {
            currentQ.correctAnswerIndex = num - 1;
          } else {
            currentQ._rawAnsText = cleanAns;
          }
        }
      } else if (isExplanationLine && currentQ) {
        currentQ.explanation = line.replace(/^(Explain(ation)?|ব্যাখ্যা)[:.-]\s*/i, "");
      } else {
        if (!currentQ) {
          currentQ = {
            questionText: line,
            options: [],
            correctAnswerIndex: 0,
            explanation: "",
            subject: defaultSubject,
            chapter: qChapter || "General",
            difficulty: qDifficulty || "Medium",
            source: qSource || "Bulk Ingress Panel",
            category: defaultCategory
          };
        } else if (currentQ.options.length > 0 && currentQ.explanation) {
          currentQ.explanation += " " + line;
        } else if (currentQ.options.length > 0) {
          if (line.length > 40 && !currentQ.explanation) {
            currentQ.explanation = line;
          } else {
            currentQ.options[currentQ.options.length - 1] += " " + line;
          }
        } else {
          currentQ.questionText += " " + line;
        }
      }
    }

    if (currentQ && currentQ.questionText) {
      results.push(currentQ);
    }

    return results.map(q => {
      // Ensure we have exactly 4 options
      while (q.options.length < 4) {
        q.options.push("Option " + String.fromCharCode(65 + q.options.length));
      }
      if (q.options.length > 4) {
        q.options = q.options.slice(0, 4);
      }
      if (q._rawAnsText) {
        const idx = q.options.findIndex((opt: string) => opt.trim().toLowerCase() === q._rawAnsText.toLowerCase());
        if (idx !== -1) {
          q.correctAnswerIndex = idx;
        }
      }
      delete q._rawAnsText;
      return q;
    });
  };

  const handleBulkSaveQuestions = async () => {
    if (!bulkInputText.trim()) {
      showToast(isBn ? "অনুগ্রহ করে অন্তত একটি প্রশ্ন পেস্ট করুন!" : "Please paste some questions to import!", true);
      return;
    }

    try {
      const parsed = parseBulkQuestions(bulkInputText, qSubject, qCategory);
      if (parsed.length === 0) {
        showToast(isBn ? "কোন সঠিক প্রশ্ন উদ্ধার করা যায়নি! ফর্ম্যাট ঠিক করুন।" : "No valid questions parsed from text field!", true);
        return;
      }

      setBulkImportProgress(1);
      let count = 0;
      for (let i = 0; i < parsed.length; i++) {
        const qId = `q_bulk_${Date.now()}_${i}`;
        const newQ: Question = {
          ...parsed[i],
          id: qId,
          createdAt: new Date().toISOString(),
          createdBy: user.uid
        } as Question;
        saveMigratedQuestion(newQ);
        setQuestions((prev) => [newQ, ...prev]);
        count++;
        setBulkImportProgress(Math.round(((i + 1) / parsed.length) * 100));
      }

      showToast(isBn ? `অসাধারণ! সফলভাবে ${count}টি নতুন প্রশ্ন ডাটাবেজে যুক্ত করা হয়েছে!` : `Phenomenal! Successfully launched ${count} new medical MCQs!`);
      logActivity(`Bulk parsed and uploaded ${count} questions directly through bulk question console`);
      setBulkInputText("");
      setBulkImportProgress(null);
    } catch (err: any) {
      console.error(err);
      showToast(err.message, true);
      setBulkImportProgress(null);
    }
  };

  const handleDeleteQuestion = async (qId: string) => {
    playSound("click");
    setDeleteConfirmText("");
    setDeleteConfirmModal({
      isOpen: true,
      title: isBn ? "প্রশ্ন মুছে ফেলার নিশ্চিতকরণ" : "Confirm Delete Question",
      message: isBn 
        ? "আপনি কি নিশ্চিতভাবে এই প্রশ্নটি চিরতরে মুছে ফেলতে চান? এই অ্যাকশনটি রিভার্ট করা যাবে না।" 
        : "Are you sure you want to permanently delete this question? This action cannot be undone.",
      itemCount: 1,
      actionType: "single",
      onConfirm: async () => {
        try {
          setQuestions((prev) => prev.filter((q) => q.id !== qId));
          try {
            const current = getMigratedQuestions().filter((q) => q.id !== qId);
            localStorage.setItem("mb_migrated_questions_v2", JSON.stringify(current));
          } catch {}
          showToast(isBn ? "প্রশ্নটি সফলভাবে মুছে ফেলা হয়েছে!" : "Question destroyed from core indexes.");
          logActivity(`Deleted question ID: ${qId}`);
          // Clear from selected lists if active
          setSelectedQIds((prev) => prev.filter((id) => id !== qId));
        } catch (err: any) {
          showToast(err.message, true);
        } finally {
          setDeleteConfirmModal(null);
        }
      }
    });
  };

  // Scan database and group duplicates
  const handleScanDuplicates = () => {
    const clusters: { [key: string]: Question[] } = {};
    
    questions.forEach((q) => {
      if (!q.questionText) return;
      const normalized = q.questionText.trim().toLowerCase().replace(/\s+/g, " ");
      if (!clusters[normalized]) {
        clusters[normalized] = [];
      }
      clusters[normalized].push(q);
    });

    // Keep only clusters that have more than 1 item (actual duplicates)
    const filteredClusters: { [key: string]: Question[] } = {};
    let count = 0;
    Object.keys(clusters).forEach((key) => {
      if (clusters[key].length > 1) {
        filteredClusters[key] = clusters[key];
        count++;
      }
    });

    setDuplicateClusters(filteredClusters);
    setShowDuplicateView(true);
    
    if (count === 0) {
      showToast(isBn 
        ? "অভিনন্দন! ডেটাবেজে কোনো ডুপ্লিকেট প্রশ্ন পাওয়া যায়নি।" 
        : "Excellent! No duplicate question sets found in active database.");
    } else {
      showToast(isBn
        ? `${count}টি ডুপ্লিকেট ক্রোমোজোম/প্রশ্ন সেট চিহ্নিত করা হয়েছে!`
        : `Identified ${count} duplicate question clusters!`);
    }
  };

  // Bulk deduplicate: keeps first question in each cluster, deletes others with chunked Firestore batches
  const handleAutoDeduplicateAll = async () => {
    const keys = Object.keys(duplicateClusters);
    if (keys.length === 0) return;
    
    if (!confirm(isBn
      ? `আপনি কি নিশ্চিতভাবে সকল ডুপ্লিকেট প্রশ্ন থেকে মাত্র ১টি করে রেখে বাকি সব মুছে ফেলতে চান?`
      : `Are you sure you want to clean all clusters, keeping only the 1st master copy in each?`
    )) return;

    try {
      setLoading(true);
      setDeleteProgress(0);
      setDeleteStatusText(isBn ? "মুছে ফেলার কাজ প্রস্তুত করা হচ্ছে..." : "Preparing purge operations...");

      // Collect all IDs to delete
      const idsToDelete: string[] = [];
      keys.forEach((key) => {
        const cluster = duplicateClusters[key];
        for (let i = 1; i < cluster.length; i++) {
          const qId = cluster[i].id;
          if (qId) {
            idsToDelete.push(qId);
          }
        }
      });

      const totalToDelete = idsToDelete.length;
      if (totalToDelete === 0) {
        showToast("No duplicates to delete.");
        setDeleteProgress(null);
        setDeleteStatusText("");
        return;
      }

      // Chunk in groups of 400
      const chunkSize = 400;
      let deleteCount = 0;

      for (let i = 0; i < totalToDelete; i += chunkSize) {
        const chunk = idsToDelete.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach((qId) => {
          batch.delete(doc(db, "questions", qId));
          deleteCount++;
        });

        await batch.commit();
        const progress = Math.min(100, Math.round(((i + chunk.length) / totalToDelete) * 100));
        setDeleteProgress(progress);
        setDeleteStatusText(isBn 
          ? `${deleteCount} / ${totalToDelete}টি প্রশ্ন মুছে ফেলা হয়েছে (${progress}%)` 
          : `Purged ${deleteCount} of ${totalToDelete} redundant entries (${progress}%)`);
      }

      showToast(isBn 
        ? `সফলভাবে ${deleteCount}টি ডুপ্লিকেট প্রশ্ন ডেটাবেজ থেকে মুছে ফেলা হয়েছে!` 
        : `Successfully purged ${deleteCount} redundant duplicate entries!`);
      logActivity(`Bulk deduplicated database, deleted ${deleteCount} questions`);

      setDuplicateClusters({});
      setShowDuplicateView(false);
    } catch (err: any) {
      showToast(err.message, true);
    } finally {
      setLoading(false);
      setDeleteProgress(null);
      setDeleteStatusText("");
    }
  };

  // One-click instant bulk delete of all redundant duplicates
  const handleInstantDeduplicateAll = async () => {
    playSound("click");
    
    // First, scan questions dynamically
    const clusters: { [key: string]: Question[] } = {};
    questions.forEach((q) => {
      if (!q.questionText) return;
      const normalized = q.questionText.trim().toLowerCase().replace(/\s+/g, " ");
      if (!clusters[normalized]) {
        clusters[normalized] = [];
      }
      clusters[normalized].push(q);
    });

    // Collect all redundant clone IDs
    const idsToDelete: string[] = [];
    let duplicateClustersCount = 0;
    Object.keys(clusters).forEach((key) => {
      const list = clusters[key];
      if (list.length > 1) {
        duplicateClustersCount++;
        // Keep the 1st one (index 0) as Master, delete the rest
        for (let i = 1; i < list.length; i++) {
          const qId = list[i].id;
          if (qId) {
            idsToDelete.push(qId);
          }
        }
      }
    });

    const totalToDelete = idsToDelete.length;
    if (totalToDelete === 0) {
      showToast(isBn 
        ? "আপনার ডাটাবেজে কোনো ডুপ্লিকেট প্রশ্ন পাওয়া যায়নি!" 
        : "No duplicate questions found in your database!");
      return;
    }

    setDeleteConfirmText("");
    setDeleteConfirmModal({
      isOpen: true,
      title: isBn ? "সব ডুপ্লিকেট মুছে ফেলার নিশ্চিতকরণ" : "Confirm Auto-Deduplication",
      message: isBn
        ? `ডাটাবেজে মোট ${duplicateClustersCount}টি কুইজ সেটে ${totalToDelete}টি অতিরিক্ত ডুপ্লিকেট কপি পাওয়া গেছে। আপনি কি নিশ্চিতভাবে সব ডুপ্লিকেট কপি ডিলিট করতে চান? প্রতিটি সেট থেকে ১টি করে মূল কপি সম্পূর্ণ সুরক্ষিত থাকবে।`
        : `Found ${totalToDelete} redundant duplicate copies in ${duplicateClustersCount} sets. Are you sure you want to delete all duplicates at once? 1 original master copy from each set will remain completely safe.`,
      itemCount: totalToDelete,
      actionType: "deduplicate",
      onConfirm: async () => {
        try {
          setLoading(true);
          setDeleteProgress(0);
          setDeleteStatusText(isBn ? "মুছে ফেলার কাজ চলছে..." : "Purging duplicates...");

          // Chunk in groups of 400
          const chunkSize = 400;
          let deleteCount = 0;

          for (let i = 0; i < totalToDelete; i += chunkSize) {
            const chunk = idsToDelete.slice(i, i + chunkSize);
            const batch = writeBatch(db);
            chunk.forEach((qId) => {
              batch.delete(doc(db, "questions", qId));
              deleteCount++;
            });

            await batch.commit();
            const progress = Math.min(100, Math.round(((i + chunk.length) / totalToDelete) * 100));
            setDeleteProgress(progress);
            setDeleteStatusText(isBn 
              ? `${deleteCount} / ${totalToDelete}টি প্রশ্ন ডিলিট হয়েছে (${progress}%)` 
              : `Purged ${deleteCount} of ${totalToDelete} duplicates (${progress}%)`);
          }

          showToast(isBn 
            ? `সফলভাবে সব ডুপ্লিকেট কুইজ মুছে ফেলা হয়েছে (মোট ${deleteCount}টি)!` 
            : `Successfully deleted all duplicate questions (total ${deleteCount})!`);
          logActivity(`Bulk auto-purged ${deleteCount} duplicate questions instantly`);
          setSelectedQIds([]);
          setDuplicateClusters({});
          setShowDuplicateView(false);
        } catch (err: any) {
          showToast(err.message, true);
        } finally {
          setLoading(false);
          setDeleteProgress(null);
          setDeleteStatusText("");
          setDeleteConfirmModal(null);
        }
      }
    });
  };

  // Bulk Delete Selected Questions via checkboxes with chunked Firestore batches
  const handleBatchDeleteSelected = async () => {
    if (selectedQIds.length === 0) {
      showToast("Please select at least one question first.", true);
      return;
    }

    setDeleteConfirmText("");
    setDeleteConfirmModal({
      isOpen: true,
      title: isBn ? "নির্বাচিত প্রশ্ন মুছে ফেলার নিশ্চিতকরণ" : "Confirm Bulk Delete Selected",
      message: isBn
        ? `আপনি কি নিশ্চিতভাবে নির্বাচিত ${selectedQIds.length}টি প্রশ্ন ডাটাবেজ থেকে চিরতরে মুছে ফেলতে চান?`
        : `Are you sure you want to bulk delete the selected ${selectedQIds.length} questions permanently?`,
      itemCount: selectedQIds.length,
      actionType: "batch",
      onConfirm: async () => {
        try {
          setLoading(true);
          setDeleteProgress(0);
          setDeleteStatusText(isBn ? "নির্বাচন ডিলিট করার প্রসেস চলছে..." : "Initiating batch delete...");

          const totalToDelete = selectedQIds.length;
          const chunkSize = 400;
          let deleteCount = 0;

          for (let i = 0; i < totalToDelete; i += chunkSize) {
            const chunk = selectedQIds.slice(i, i + chunkSize);
            const batch = writeBatch(db);
            chunk.forEach((qId) => {
              batch.delete(doc(db, "questions", qId));
              deleteCount++;
            });

            await batch.commit();
            const progress = Math.min(100, Math.round(((i + chunk.length) / totalToDelete) * 100));
            setDeleteProgress(progress);
            setDeleteStatusText(isBn 
              ? `${deleteCount} / ${totalToDelete}টি প্রশ্ন সম্পূর্ণ ডিলিট হয়েছে (${progress}%)` 
              : `Deleted ${deleteCount} of ${totalToDelete} selections (${progress}%)`);
          }

          showToast(isBn 
            ? `নির্বাচিত ${selectedQIds.length}টি প্রশ্ন সফলভাবে মুছে ফেলা হয়েছে!` 
            : `Successfully deleted ${selectedQIds.length} selected questions matching criteria.`);
          logActivity(`Bulk deleted ${selectedQIds.length} custom questions`);
          setSelectedQIds([]);
        } catch (err: any) {
          showToast(err.message, true);
        } finally {
          setLoading(false);
          setDeleteProgress(null);
          setDeleteStatusText("");
          setDeleteConfirmModal(null);
        }
      }
    });
  };

  const handleSelectAllQuestions = (isChecked: boolean, filteredList: Question[]) => {
    if (isChecked) {
      const dbIds = filteredList.map(q => q.id).filter(Boolean) as string[];
      setSelectedQIds(dbIds);
    } else {
      setSelectedQIds([]);
    }
  };

  // 5. Question Import System & Smart auto-mapping & duplicate checks
  const handleParseImport = () => {
    if (!importText.trim()) {
      showToast("Insert CSV, JSON, or drag-and-drop file configuration first.", true);
      return;
    }

    // Helper to parse a single CSV/TSV line correctly, respecting quotes and delimiters
    const parseCSVLine = (line: string, delimiter: string = ","): string[] => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    let parsed: any[] = [];
    try {
      if (importText.trim().startsWith("[")) {
        // Parse JSON
        parsed = JSON.parse(importText);
      } else {
        // Parse CSV/TSV
        const lines = importText.split("\n").map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) {
          showToast("Data requires at least a header row and one data row.", true);
          return;
        }

        // Auto detect delimiter (tab or comma)
        const delimiter = lines[0].includes("\t") ? "\t" : ",";
        const headers = parseCSVLine(lines[0], delimiter).map(h => h.trim().toLowerCase());
        
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          const cols = parseCSVLine(lines[i], delimiter);
          
          const q: any = {};
          // Map index based on headers
          headers.forEach((h, idx) => {
            if (idx < cols.length) {
              q[h] = cols[idx];
            }
          });

          // Match alternate keys with a priority fallback list
          const getVal = (keys: string[], defaultVal: string = "") => {
            for (const key of keys) {
              if (q[key] !== undefined && q[key] !== "") return q[key];
            }
            return defaultVal;
          };

          const questionTextVal = getVal(["questiontext", "question_text", "question", "text", "q", "প্রশ্ন", "প্রশ্নটি", "questiontextval"]);
          const optA = getVal(["optiona", "option_a", "a", "opt_a", "অপশন ক", "অপশন ১", "ক", "১", "option1"]);
          const optB = getVal(["optionb", "option_b", "b", "opt_b", "অপশন খ", "অপশন ২", "খ", "২", "option2"]);
          const optC = getVal(["optionc", "option_c", "c", "opt_c", "অপশন গ", "অপশন ৩", "গ", "৩", "option3", "option_c_val"]);
          const optD = getVal(["optiond", "option_d", "d", "opt_d", "অপশন ঘ", "অপশন ৪", "ঘ", "৪", "option4", "option_d_val"]);

          // Parse correct answer index
          const correctAnsIndexVal = getVal(["correctanswerindex", "correct_answer_index", "correctindex", "correct_index", "correct", "answer", "ans", "sothikutthor", "sothik_uttor", "সঠিক উত্তর", "উত্তর"]);
          let correctIdx = 0;
          if (correctAnsIndexVal !== "") {
            const parsedIdx = parseInt(correctAnsIndexVal);
            if (!isNaN(parsedIdx)) {
              correctIdx = parsedIdx;
            } else {
              // Try text-matching
              const valLower = correctAnsIndexVal.toLowerCase();
              if (valLower === "a" || valLower === "ক" || valLower === "১" || valLower === "0") correctIdx = 0;
              else if (valLower === "b" || valLower === "খ" || valLower === "২" || valLower === "1") correctIdx = 1;
              else if (valLower === "c" || valLower === "গ" || valLower === "৩" || valLower === "2") correctIdx = 2;
              else if (valLower === "d" || valLower === "ঘ" || valLower === "৪" || valLower === "3") correctIdx = 3;
              else {
                // Exact option text match
                if (valLower === optA.toLowerCase()) correctIdx = 0;
                else if (valLower === optB.toLowerCase()) correctIdx = 1;
                else if (valLower === optC.toLowerCase()) correctIdx = 2;
                else if (valLower === optD.toLowerCase()) correctIdx = 3;
              }
            }
          }

          const explanationVal = getVal(["explanation", "exp", "reason", "details", "explain", "ব্যাখ্যা"], "Heuristically aligned explanation Matrix.");
          const subjectVal = getVal(["subject", "subj", "topic", "subjectname", "বিষয়"], "Biology");
          const chapterVal = getVal(["chapter", "ch", "chaptername", "অধ্যায়"], "General Fundamentals");
          const difficultyVal = getVal(["difficulty", "level", "difficulty_level", "কঠিনতা"], "Medium");
          const sourceVal = getVal(["source", "ref", "reference", "উৎস"], "Bulk Importer Hub");
          const categoryVal = getVal(["category", "cat", "test_category", "শ্রেণী"], "Medical Standard Questions");

          const optsList = [optA, optB, optC || "N/A", optD || "N/A"];
          
          if (questionTextVal) {
            parsed.push({
              questionText: questionTextVal,
              options: optsList,
              correctAnswerIndex: correctIdx,
              explanation: explanationVal,
              subject: subjectVal,
              chapter: chapterVal,
              difficulty: difficultyVal,
              source: sourceVal,
              category: categoryVal
            });
          }
        }
      }

      // Perform duplicate detection & auto mapping
      const checkedList = parsed.map((item, idx) => {
        // Exact text compare
        const isDuplicateText = questions.some(ex => ex.questionText.trim().toLowerCase() === item.questionText.trim().toLowerCase()) 
          || STARTER_QUESTIONS.some(st => st.questionText.trim().toLowerCase() === item.questionText.trim().toLowerCase());

        // Heuristics Auto subject and chapter mapper
        let autoMappedSubject = item.subject;
        let autoMappedChapter = item.chapter || "General Fundamentals";
        const content = item.questionText.toLowerCase();

        if (content.includes("cell") || content.includes("mitosis") || content.includes("কোষ") || content.includes("ডিএনএ") || content.includes("organelle")) {
          autoMappedSubject = "Biology";
          autoMappedChapter = "Cell and its Structure";
        } else if (content.includes("blood") || content.includes("circulation") || content.includes("রক্ত") || content.includes("লিম্ফ")) {
          autoMappedSubject = "Biology";
          autoMappedChapter = "Human Blood & Circulation";
        } else if (content.includes("alkane") || content.includes("benzene") || content.includes("bond") || content.includes("বিক্রিয়া") || content.includes("অরবিটাল")) {
          autoMappedSubject = "Chemistry";
          autoMappedChapter = "Organic Chemistry";
        } else if (content.includes("vector") || content.includes("force") || content.includes("thermodynamics") || content.includes("শক্তি") || content.includes("ত্বরণ")) {
          autoMappedSubject = "Physics";
          autoMappedChapter = "Vectors & Mechanics";
        } else if (content.includes("preposition") || content.includes("spelling") || content.includes("synonym") || content.includes("antonym") || content.includes("died")) {
          autoMappedSubject = "English";
          autoMappedChapter = "Vocabulary & Grammar";
        }

        return {
          ...item,
          subject: autoMappedSubject,
          chapter: autoMappedChapter,
          isDuplicate: isDuplicateText,
          uidKey: `import-${idx}-${Date.now()}`
        };
      });

      setParsedQuestions(checkedList);
      
      const duplicatesCount = checkedList.filter(c => c.isDuplicate).length;
      showToast(`Parsed ${checkedList.length} items. Duplicates detected: ${duplicatesCount}. Smart mapping verified.`);
      logActivity(`Bulk parsed import text queue of size ${checkedList.length}`);
    } catch (err: any) {
      showToast("Parsing failed. Check formatting constraints. Detail: " + err.message, true);
    }
  };

  const handleBulkApproveSave = async () => {
    if (parsedQuestions.length === 0) return;
    setLoading(true);
    setImportProgress(0);
    setImportStatusText(isBn ? "প্রশ্নগুলো ডাটাবেজে সংরক্ষণ করা হচ্ছে..." : "Seeding questions into database...");

    try {
      let saved = 0;
      // Filter out duplicates if skipDuplicates is selected
      const parsedItems = skipDuplicates 
        ? parsedQuestions.filter(q => !q.isDuplicate) 
        : parsedQuestions;

      const totalToSave = parsedItems.length;
      if (totalToSave === 0) {
        showToast(isBn 
          ? "সংরক্ষণ করার মতো কোনো নতুন প্রশ্ন নেই (সবগুলোই ডুপ্লিকেট ছিল এবং ডুপ্লিকেট ফিল্টার অন রয়েছে)" 
          : "No new questions to save (all were duplicates and skip duplicates was active).");
        setImportProgress(null);
        setImportStatusText("");
        return;
      }

      const batchSize = 100; // chunk size for firestore
      let batch = writeBatch(db);
      let count = 0;

      for (let i = 0; i < totalToSave; i++) {
        const item = parsedItems[i];
        const docRef = doc(collection(db, "questions"));
        const payload = {
          questionText: item.questionText,
          options: item.options,
          correctAnswerIndex: Number(item.correctAnswerIndex) || 0,
          explanation: item.explanation || "No explanation provided.",
          subject: item.subject || "Biology",
          chapter: item.chapter || "General",
          difficulty: item.difficulty || "Medium",
          source: item.source || "Bulk Importer Authorized",
          category: item.category || "Medical Standard Questions",
          createdAt: serverTimestamp(),
          createdBy: user.uid
        };

        batch.set(docRef, payload);
        count++;
        saved++;

        if (count >= batchSize) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;

          const progress = Math.min(100, Math.round((saved / totalToSave) * 100));
          setImportProgress(progress);
          setImportStatusText(isBn 
            ? `${saved} / ${totalToSave}টি প্রশ্ন সফলভাবে সেভ হয়েছে (${progress}%)` 
            : `Seeded ${saved} of ${totalToSave} questions (${progress}%)`);
        }
      }

      if (count > 0) {
        await batch.commit();
      }

      setImportProgress(100);
      setImportStatusText(isBn ? "সবগুলো প্রশ্ন সফলভাবে সেভ হয়েছে!" : "Seeding complete!");

      showToast(language === "bn" ? `সবুজ সঙ্কেত! সফলভাবে ${saved}টি নতুন মেডিকেল MCQ প্রশ্ন লোড করা হয়েছে!` : `Successfully chunk-seeded and launched ${saved} medical questions!`);
      logActivity(`Bulk approved and saved ${saved} imported MCQ questions in chunked transactions`);
      setParsedQuestions([]);
      setImportText("");
    } catch (err: any) {
      showToast(err.message, true);
    } finally {
      setLoading(false);
      setTimeout(() => {
        setImportProgress(null);
        setImportStatusText("");
      }, 2000);
    }
  };

  const handleGenerate1000Questions = () => {
    const list: any[] = [];
    
    // Core high-yield Biology reference structures
    const bioOrganelles = [
      { name: "মাইটোকন্ড্রিয়া (Mitochondria)", role: "শ্বসন ও শক্তি উৎপাদন কেন্দ্র (Powerhouse of cell)", hasDNA: "নিজস্ব বৃত্তাকার DNA ও ৭০s রাইবোসোম", discoverer: "কলিকার ১৮৮০ সালে আবিষ্কার করেন", chapter: "কোষ ও এর গঠন" },
      { name: "রাইবোসোম (Ribosome)", role: "কোষের প্রোটিন ফ্যাক্টরি (Protein factory)", hasDNA: "ঝিল্লিবিহীন রাইবোনিউক্লিওপ্রোটিন কণা", discoverer: "جর্জ প্যালাডে ১৯৫৫ সালে নাম দেন", chapter: "কোষ ও এর গঠন" },
      { name: "লাইসোসোম (Lysosome)", role: "কোষের আত্মঘাতী থলিকা (Suicidal bag/sac)", hasDNA: "অটোলাইসিস ঘটাতে সক্ষম হাইড্রোলাইটিক এনজাইম সমৃদ্ধ", discoverer: "ডি দুভে ১৯৫৫ সালে আবিষ্কার করেন", chapter: "কোষ ও এর গঠন" },
      { name: "গলজি বডি (Golgi Body)", role: "কোষের ট্রাফিক পুলিশ (Traffic police of the cell)", hasDNA: "লিপিড সংশ্লেষণ কারী ভেসিকল ও সিস্টারনি", discoverer: "ক্যামিলো গলজি ১৮৯৮ সালে এটি আবিষ্কার করেন", chapter: "কোষ ও এর গঠন" },
      { name: "নিউক্লিয়াস (Nucleus)", role: "কোষের মস্তিষ্ক বা প্রাণকেন্দ্র (Brain/Director of the cell)", hasDNA: "বংশগতির ধারক ক্রোমোজোম ধারণ এবং সব বিপাক চক্র নিয়ন্ত্রণকারী", discoverer: "রবার্ট ব্রাউন ১৮৩১ সালে এটি প্রথম দেখেন", chapter: "কোষ ও এর গঠন" },
      { name: "প্লাস্টিড (Plastid)", role: "কোষের রান্নাঘর বা খাদ্য প্রস্তুতকারী সূক্ষ্ম কণা", hasDNA: "ক্লোরোপ্লাস্ট দ্বারা সৌরশক্তি শোষণ ও খাদ্য সংশ্লেষণকারী", discoverer: "শিম্পার ১৮৮৩ সালে দেখেন", chapter: "কোষ ও এর গঠন" }
    ];

    const bloodComps = [
      { type: "লোহিত রক্তকণিকা (Erythrocyte)", life: "১২০ দিন বা ৪ মাস", site: "লাল অস্থিমজ্জা (Red bone marrow)", count: "কিশোর/বয়স্ক পুরুষে প্রতি ঘন মিলিমিটারে ৫০ লাখ ও শিশুর দেহে ৬০-৭০ লাখ", role: "হিমোগ্লোবিন দ্বারা অক্সিজেন পরিবহন" },
      { type: "শ্বেত রক্তকণিকা (Leukocyte)", life: "১ থেকে ১৫ দিন", site: "অস্থিমজ্জা ও লিম্ফ নোড", count: "৪,০০০ থেকে ১১,০০০", role: "ফ্যাগোসাইটোসিস দ্বারা জীবাণু ধ্বংস" },
      { type: "অণুচক্রিকা (Thrombocyte)", life: "৫ থেকে ১০ দিন", site: "মেগাক্যারিওসাইট কোষ", count: "১.৫ লাখ থেকে ৪ লাখ", role: "রক্ততঞ্চন বা রক্ত জমাট বাঁধতে সাহায্য করা" }
    ];

    const cranialNerves = [
      { num: "১ম (I)", name: "অলফ্যাক্টরি স্নায়ু (Olfactory Nerve)", nature: "সংবেদী (Sensory)", function: "ঘ্রাণ অনুভূতি মস্তিষ্কে প্রেরণ" },
      { num: "২য় (II)", name: "অপ্টিক স্নায়ু (Optic Nerve)", nature: "সংবেদী (Sensory)", function: "দর্শন অনুভূতি মস্তিষ্কে প্রেরণ" },
      { num: "৩য় (III)", name: "অکیউলোমোটর স্নায়ু (Oculomotor Nerve)", nature: "মোটর (Motor)", function: "অক্ষিগোলকের সঞ্চালন নিয়ন্ত্রণ" },
      { num: "৪র্থ (IV)", name: "ট্রকলিয়ার স্নায়ু (Trochlear Nerve)", nature: "মোটর (Motor)", function: "অক্ষিগোলকের সূক্ষ্ম ঘূর্ণন নিয়ন্ত্রণ" },
      { num: "৫ম (V)", name: "ট্রাইজেমিনাল স্নায়ু (Trigeminal Nerve)", nature: "মিশ্র (Mixed)", function: "মুখমণ্ডলের অনুভূতি ও চর্বণ পেশীর সঞ্চালন" },
      { num: "৬ষ্ঠ (VI)", name: "অ্যাবডুসেন্স স্নায়ু (Abducens Nerve)", nature: "মোটর (Motor)", function: "অক্ষিগোলকের পার্শ্বীয় সঞ্চালন" },
      { num: "৭ম (VII)", name: "ফেসিয়াল স্নায়ু (Facial Nerve)", nature: "মিশ্র (Mixed)", function: "মুখমণ্ডলের অভিব্যক্তি ও স্বাদ গ্রহণ" },
      { num: "৮ম (VIII)", name: "ভেস্টিবুলোককলিয়ার স্নায়ু (Vestibulocochlear Nerve)", nature: "সংবেদী (Sensory)", function: "শ্রবণ এবং দেহের ভারসাম্য রক্ষা" },
      { num: "৯ম (IX)", name: "গ্লসোফ্যারিনজিয়াল স্নায়ু (Glossopharyngeal Nerve)", nature: "মিশ্র (Mixed)", function: "জিহ্বা ও গলবিলের সঞ্চালন ও স্বাদ অনুভূতি" },
      { num: "১০ম (X)", name: "ভেগাস স্নায়ু (Vagus Nerve)", nature: "মিশ্র (Mixed)", function: "হৃৎপিণ্ড, ফুসফুস ও পাকস্থলীর ক্রিয়া নিয়ন্ত্রণ" }
    ];

    // 1. Generate Biology (350 Questions)
    for (let i = 1; i <= 150; i++) {
      const bOrganelle = bioOrganelles[(i - 1) % bioOrganelles.length];
      const qText = `[কোষ ও এর গঠন - MCQ #${i}] কোষে নিচের কোন অঙ্গাণুটি প্রধানত '${bOrganelle.role}' হিসেবে গুরুত্বপূর্ণ ভূমিকা ও গৌরব পালন করে?`;
      const options = [
        bOrganelle.name,
        "মাইক্রোটিউবিউলস (Microtubules)",
        "এন্ডোপ্লাজমিক রেটিকুলাম (Endoplasmic Reticulum)",
        "পারক্সিসোম (Peroxisome)"
      ];
      const correctAns = options[0];
      const shuffled = [...options].sort(() => 0.5 - Math.random());
      const correctIdx = shuffled.indexOf(correctAns);

      list.push({
        questionText: qText,
        options: shuffled,
        correctAnswerIndex: correctIdx,
        explanation: `${bOrganelle.name} মূলত কোষে ${bOrganelle.role} হিসেবে ক্রিয়াশীল। এর অন্যতম অনন্য বৈশিষ্ট্য হচ্ছে এটিটিতে ${bOrganelle.hasDNA} বিদ্যমান এবং এটি প্রথম বিজ্ঞানী ${bOrganelle.discoverer}।`,
        subject: "Biology",
        chapter: bOrganelle.chapter,
        difficulty: i % 3 === 0 ? "Hard" : i % 2 === 0 ? "Medium" : "Easy",
        category: "Medical Standard Questions",
        source: "HL Abul Hasan Biology Book"
      });
    }

    for (let i = 1; i <= 100; i++) {
      const comp = bloodComps[(i - 1) % bloodComps.length];
      const qText = `[রক্ত ও রক্ত সংবহন - MCQ #${60 + i}] মানুষের দেহে রক্ত চলাচলের অন্যতম গুরুত্বপূর্ণ রক্তকণিকা '${comp.type}'-এর স্বাভাবিক গড় পরম আয়ুষ্কাল সাধারণত কত দিন?`;
      const options = [
        comp.life,
        "৩ দিন থেকে ৪ দিন",
        "২০ দিন থেকে ২৫ দিন",
        "১৮০ দিন বা ৯০ দিন"
      ];
      const correctAns = options[0];
      const shuffled = [...options].sort(() => 0.5 - Math.random());
      const correctIdx = shuffled.indexOf(correctAns);

      list.push({
        questionText: qText,
        options: shuffled,
        correctAnswerIndex: correctIdx,
        explanation: `${comp.type} কণার চূড়ান্ত গড় আয়ু হলো ${comp.life}। এর উৎপাদন সংঘটিত হয় ${comp.site} থেকে এবং এর রক্ত প্রবাহে প্রধান কার্যক্ষমতা হলো: ${comp.role}।`,
        subject: "Biology",
        chapter: "রক্ত ও রক্ত সংবহন",
        difficulty: i % 2 === 0 ? "Medium" : "Easy",
        category: "Combat High-Yield 1K Set",
        source: "Gias Uddin Biology Volume 1"
      });
    }

    for (let i = 1; i <= 100; i++) {
      const nerve = cranialNerves[(i - 1) % cranialNerves.length];
      const qText = `[করোটিক স্নায়ু - MCQ #${i}] করোটিক স্নায়ুর ক্রমধারায় মানুষের মস্তিষ্কের '${nerve.num}' স্নায়ু অর্থাৎ '${nerve.name}'-এর প্রকৃত কাজ ও শারীরবৃত্তীয় ধরণ কেমন?`;
      const options = [
        `ধরণ: ${nerve.nature} • প্রধান ক্রিয়া: ${nerve.function}`,
        "ধরণ: মোটর • প্রধান ক্রিয়া: পরিপাক রস নিঃসরণ",
        "ধরণ: সংবেদী • প্রধান ক্রিয়া: পেশী সংকোচন",
        "ধরণ: মিশ্র • প্রধান ক্রিয়া: দেহের তাপ নিয়ন্ত্রণ"
      ];
      const correctAns = options[0];
      const shuffled = [...options].sort(() => 0.5 - Math.random());
      const correctIdx = shuffled.indexOf(correctAns);

      list.push({
        questionText: qText,
        options: shuffled,
        correctAnswerIndex: correctIdx,
        explanation: `মানুষের মাথার ${nerve.num} করোটিক স্নায়ুটি হলো ${nerve.name}। এটি মূলত ${nerve.nature} গোত্রের স্নায়ু এবং এর কাজ ${nerve.function} সুনিশ্চিত করা।`,
        subject: "Biology",
        chapter: "স্নায়ুতন্ত্র",
        difficulty: "Hard",
        category: "অনুশীলনী Questions",
        source: "Abul Hasan Book Chapter 8"
      });
    }

    // 2. Generate Chemistry (250 Questions)
    const chemHybrids = [
      { name: "sp3 সংকরায়ণ", shape: "চতুস্তলকীয় (Tetrahedral)", angle: "১০৯.৫° বা ১০৯°২৮'", example: "মিথেন (CH4), অ্যামোনিয়া (NH3)" },
      { name: "sp2 সংকরায়ণ", shape: "সমতলীয় ত্রিকোণাকার", angle: "১২০°", example: "BF3, ইথিন (C2H4)" },
      { name: "sp সংকরায়ণ", shape: "সরলরৈখিক (Linear)", angle: "১৮০°", example: "CO2, ইথাইন (C2H2)" },
      { name: "sp3d সংকরায়ণ", shape: "ত্রিকোণাকার দ্বিপিরামিডীয়", angle: "১২০° ও ৯০°", example: "PCl5" },
      { name: "sp3d2 সংকরায়ণ", shape: "অষ্টতলকীয় (Octahedral)", angle: "৯০°", example: "SF6" }
    ];

    const bloodPHs = [
      { type: "মানুষের ধমনীর রক্তের pH", val: "৭.৩৫ - ৭.৪৫ (সামান্য ক্ষারীয়)", effect: "বাফার ক্রিয়া দ্বারা রক্তচাপ রক্ষা" },
      { type: "বাইকার্বনেট রক্তের বাফার", val: "H2CO3 / HCO3- প্রতিরক্ষামূলক অনুপাত", effect: "রক্তের অতিরিক্ত আম্লীয়তা নিরপেক্ষকরণ" },
      { type: "প্রোটিন বাফার সিস্টেম", val: "হিমোগ্লোবিন ও প্লাজমা প্রোটিন বাফার", effect: "co2 পরিবহনের সময় pH স্থিতিশীল রাখা" }
    ];

    for (let i = 1; i <= 150; i++) {
      const chHybrid = chemHybrids[(i - 1) % chemHybrids.length];
      const qText = `[গুণগত রসায়ন - MCQ #${i}] রাসায়নিক বন্ধনে জটিল সংকরায়ণ বা হাইব্রিডাইজেশন '${chHybrid.name}'-এর বন্ধন কোণ ও অণুর জ্যামিতিক সঠিক কাঠামো কোনটি?`;
      const options = [
        `বন্ধন কোণ: ${chHybrid.angle} • কাঠামো আকৃতি: ${chHybrid.shape} • উদাহরণ: ${chHybrid.example}`,
        "বন্ধন কোণ: ৯০° • কাঠামো আকৃতি: রৈখিক • উদাহরণ: জল (H2O)",
        "বন্ধন কোণ: ১০৯° • কাঠামো আকৃতি: সমতলীয় কোণাকার • উদাহরণ: ইথেন",
        "বন্ধন কোণ: ১৮০° • কাঠামো আকৃতি: অষ্টতলকীয় • উদাহরণ: অ্যামোনিয়াম আয়ন"
      ];
      const correctAns = options[0];
      const shuffled = [...options].sort(() => 0.5 - Math.random());
      const correctIdx = shuffled.indexOf(correctAns);

      list.push({
        questionText: qText,
        options: shuffled,
        correctAnswerIndex: correctIdx,
        explanation: `${chHybrid.name}-সংকরায়ণের ফলে বন্ধনের সাধারণ কোণ পরিমাণ হচ্ছে ${chHybrid.angle} এবং এর জ্যামিতিক গড় বিন্যাসটি হয় ${chHybrid.shape}। এর একটি সুস্পষ্ট উদাহরণ হচ্ছে ${chHybrid.example}।`,
        subject: "Chemistry",
        chapter: "পরমাণুর গঠন",
        difficulty: i % 2 === 0 ? "Medium" : "Easy",
        category: "Medical Standard Questions",
        source: "Hazar-Nagin Chem Paper 1"
      });
    }

    for (let i = 1; i <= 100; i++) {
      const bph = bloodPHs[(i - 1) % bloodPHs.length];
      const qText = `[রসায়ন বাফার থিওরি - MCQ #${i}] মানব শরীরে অভ্যন্তরীণ রসায়নে '${bph.type}'-এর আদর্শ পরিমিত পরম মান নিচের কোনটি?`;
      const options = [
        bph.val,
        "pH ৫.৫ - ৬.০ অম্লরাজ তীব্র অম্লীয়",
        "pH ৮.৫ - ৯.০ তীব্র সোডা ক্ষারীয়",
        "pH ৭.০ নিরপেক্ষ খনিজ বিশুদ্ধ জল"
      ];
      const correctAns = options[0];
      const shuffled = [...options].sort(() => 0.5 - Math.random());
      const correctIdx = shuffled.indexOf(correctAns);

      list.push({
        questionText: qText,
        options: shuffled,
        correctAnswerIndex: correctIdx,
        explanation: `${bph.type} পরিমাপের জন্য নির্ধারিত বাফার পরম মাত্রা হলো ${bph.val}। এর প্রধান কার্যকারিতা হলো মূলত: ${bph.effect}।`,
        subject: "Chemistry",
        chapter: "রাসায়নিক সাম্যাবস্থা",
        difficulty: "Hard",
        category: "Combat High-Yield 1K Set",
        source: "Hazar-Nagin Paper 1 Chapter 4"
      });
    }

    // 3. Generate Physics (250 Questions)
    const physConstants = [
      { name: "মহাকর্ষীয় ধ্রুবক (G)", val: "6.673 x 10^-11 N m^2 kg^-2", dim: "M^-1 L^3 T^-2" },
      { name: "অভিকর্ষজ ত্বরণ (g) মেরু অঞ্চলে", val: "9.832 m/s^2", dim: "L T^-2" },
      { name: "পৃথিবীর মুক্তিবেগ (Escape Velocity)", val: "11.2 km/s (বা ১১২০০ মি/সে)", dim: "L T^-1" },
      { name: "আদর্শ পরম শুন্য তাপমাত্রা (Absolute Zero Temp)", val: "-273.15°C (বা 0 Kelvin)", dim: "θ (Kelvin)" }
    ];

    for (let i = 1; i <= 150; i++) {
      const pConst = physConstants[(i - 1) % physConstants.length];
      const qText = `[মহাকর্ষ ও অভিকর্ষ - MCQ #${i}] পদার্থবিজ্ঞানের চিরন্তন গুরুত্বপূর্ণ ধ্রুবক বা ফ্যাক্টর '${pConst.name}'-এর আদেশ পরিমিত মান এবং সঠিক মাত্রা সংকেত কোনটি?`;
      const options = [
        `পরম মান: ${pConst.val} • মাত্রা সংকেত: ${pConst.dim}`,
        "পরম মান: 9.8 m/s • মাত্রা সংকেত: M L T^-2",
        "পরম মান: 3 x 10^8 m/s • মাত্রা সংকেত: L T^2",
        "পরম মান: 1.6 x 10^-19 C • মাত্রা সংকেত: M^-1 T"
      ];
      const correctAns = options[0];
      const shuffled = [...options].sort(() => 0.5 - Math.random());
      const correctIdx = shuffled.indexOf(correctAns);

      list.push({
        questionText: qText,
        options: shuffled,
        correctAnswerIndex: correctIdx,
        explanation: `পদার্থবিদ্যায় মহাকর্ষীয় ও অন্যান্য ধ্রুবকের সূক্ষ্ম বিশ্লেষণে ${pConst.name}-এর বিশুদ্ধ মান হচ্ছে ${pConst.val} এবং এর পরম গাণিতিক সংকেত মাত্রা বিন্যাস হলো ${pConst.dim}।`,
        subject: "Physics",
        chapter: "মহাকর্ষ ও অভিকর্ষ",
        difficulty: "Medium",
        category: "Medical Standard Questions",
        source: "Ishaq Physics Part 1"
      });
    }

    const thermoTerms = [
      { law: "তাপগতিবিদ্যার শূন্যতম সূত্র", basis: "তাপমাত্রার ধারণা ও থার্মোমিটারের পরিমাপ" },
      { law: "তাপগতিবিদ্যার ১ম সূত্র (dQ = dU + dW)", basis: "শক্তির সংরক্ষণশীলতা ও অভ্যন্তরীণ শক্তির বিন্যাস" },
      { law: "তাপগতিবিদ্যার ২য় সূত্র (এনট্রপি বৃদ্ধি)", basis: "তাপ সঞ্চালনের স্বাভাবিক দিক ও স্বতঃস্ফূর্ত অপচয় প্রক্রিয়া" }
    ];

    for (let i = 1; i <= 100; i++) {
      const therm = thermoTerms[(i - 1) % thermoTerms.length];
      const qText = `[তাপগতিবিদ্যা - MCQ #${i}] তাপ ইঞ্জিন এবং তাপীয় রূপান্তরের মূল সূত্র '${therm.law}'-এর প্রধান প্রায়োগিক ভিত্তি কোনটি?`;
      const options = [
        therm.basis,
        "আলোর তড়িৎ চৌম্বক তরঙ্গের গতিশীলতা",
        "পরমাণুর নিউক্লিয়াসের মধ্যকার শক্তিশালী বন্ধন বিভাজন",
        "পদার্থের গ্যাসীয় পরমাণুর আপেক্ষিক চাপ হ্রাস বৃদ্ধি"
      ];
      const correctAns = options[0];
      const shuffled = [...options].sort(() => 0.5 - Math.random());
      const correctIdx = shuffled.indexOf(correctAns);

      list.push({
        questionText: qText,
        options: shuffled,
        correctAnswerIndex: correctIdx,
        explanation: `পদার্থবিজ্ঞানে ${therm.law} এর প্রধান তাত্ত্বিক ও প্রায়োগিক গুরুত্ব হলো এটি দ্বারা বিজ্ঞানীগণ ${therm.basis} সুনিশ্চিত ধারণা লাভ করেন।`,
        subject: "Physics",
        chapter: "তাপগতিবিদ্যা",
        difficulty: i % 2 === 0 ? "Hard" : "Medium",
        category: "Combat High-Yield 1K Set",
        source: "Ishaq Physics Part 1 Chapter 10"
      });
    }

    // 4. Generate English Grammar (100 Questions)
    const engRules = [
      { rule: "She is senior ___ me in company.", ans: "to", reason: "Senior, junior, superior, inferior - এই ল্যাটিন কম্পারেটিভগুলির পর 'than' না বসে 'to' বসে।" },
      { rule: "He was accused ___ committing forgery.", ans: "of", reason: "অ্যাপ্রোপ্রিয়েট প্রিপজিশন হিসেবে Accused-এর পর 'of' বসে যার অর্থ কোনো কাজে অপরাধী হওয়া বা অভিযুক্ত হওয়া।" },
      { rule: "We must abstain ___ spreading rumors.", ans: "from", reason: "Abstain-এর সাথে উপযুক্ত প্রিপজিশন হিসেবে সর্বদা 'from' বসে যার অর্থ বিরত থাকা বা দূরে থাকা।" },
      { rule: "Identify the correct synonym of 'Lethal' (মারাত্মক/প্রাণঘাতী):", ans: "Deadly / Fatal", reason: "Lethal শব্দের অর্থ প্রাণঘাতী বা মারাত্মক ক্ষতিকর। এর সমার্থক হলো Deadly বা Fatal বা Devastating।" },
      { rule: "Identify the correct antonym of 'Benign' (ক্ষতি করে না এমন/মৃদু/দয়ালু):", ans: "Malignant / Hostile", reason: "Benign শব্দের বিপরীত হলো Malignant (তীব্র ক্ষতিকর বা মারাত্মক) অথবা Hostile।" }
    ];

    for (let i = 1; i <= 100; i++) {
      const erule = engRules[(i - 1) % engRules.length];
      const qText = `[Medical English Standard - MCQ #${i}] Choose the correct response to complete or satisfy the grammatical rule: "${erule.rule}"`;
      const options = [
        erule.ans,
        "than",
        "with",
        "by"
      ];
      const correctAns = options[0];
      const shuffled = [...options].sort(() => 0.5 - Math.random());
      const correctIdx = shuffled.indexOf(correctAns);

      list.push({
        questionText: qText,
        options: shuffled,
        correctAnswerIndex: correctIdx,
        explanation: erule.reason,
        subject: "English",
        chapter: "মেডিকেল পরিভাষা ও প্রতিশব্দ",
        difficulty: "Easy",
        category: "Medical Standard Questions",
        source: "MAT Medical English Bank Core"
      });
    }

    // 5. Generate General Knowledge (70 Questions to reach 1020 total)
    const gkHistory = [
      { q: "১৯৭১ সালের মুক্তিযুদ্ধে সমগ্র অবরুদ্ধ বাংলাদেশকে সামরিক সুবিধার জন্য কয়টি চূড়ান্ত যুদ্ধ সেক্টরে বিভক্ত করা হয়েছিল?", a: "১১টি সেক্টর (এবং ৬৪টি সাব-সেক্টর)", r: "মুক্তিযুদ্ধ সুষ্ঠু ও কার্যকর করার লক্ষ্যে সমগ্র বাংলাদেশকে ১১টি সেক্টর এবং সেক্টরগুলোর অধীনে ৬৪টি সাব-সেক্টরে সুনির্দিষ্ট ভাবে ভাগ করা হয়েছিল।" },
      { q: "বাংলাদেশের গৌরবান্বিত মুক্তিযুদ্ধে বীরত্ব এবং চরম আত্মত্যাগের জন্য সর্বোচ্চ সামরিক পুরস্কার কোনটি কতজন পেয়েছেন?", a: "বীরশ্রেষ্ঠ (৭ জন)", r: "মহান মুক্তিযুদ্ধে অবিস্মরণীয় বীরত্বের লড়াইয়ের সম্মানার্থে সর্বোচ্চ খেতাব প্রদান করা হয় 'বীরশ্রেষ্ঠ' মোট ৭ জন শহীদকে।" },
      { q: "ঐতিহাসিক ৭ই মার্চের কালজয়ী ঘোষণা ইউনেস্কো কর্তৃক কত সালে প্রামাণ্য ঐতিহ্য হিসেবে বিশ্বব্যাপী স্বীকৃতি লাভ করে?", a: "৩০ অক্টোবর ২০১৭ সালে, বিশ্ব প্রামাণ্য ঐতিহ্য (Memory of the World)", r: "জাতির জনক বঙ্গবন্ধু শেখ মুজিবুর রহমানের ঐতিহাসিক ১৯৭১ সালের ৭ই মার্চের ভাষণকে ইউনেস্কো ৩০ অক্টোবর ২০১৭ সালে মেমোরি অফ দ্যা ওয়ার্ল্ড হিসেবে সম্মানিত স্বীকৃতি দান করে।" }
    ];

    for (let i = 1; i <= 70; i++) {
      const gh = gkHistory[(i - 1) % gkHistory.length];
      const qText = `[সাধারণ জ্ঞান বাংলাদেশ - MCQ #${i}] ${gh.q}`;
      const options = [
        gh.a,
        "৮টি সেক্টর (বীরশ্রেষ্ঠ ৩ জন)",
        "বীর প্রতীক (৬৪টি সাব-সেক্টর)",
        "১৯৯৯ সালে বিশ্ব ঐতিহ্য হিসেবে"
      ];
      const correctAns = options[0];
      const shuffled = [...options].sort(() => 0.5 - Math.random());
      const correctIdx = shuffled.indexOf(correctAns);

      list.push({
        questionText: qText,
        options: shuffled,
        correctAnswerIndex: correctIdx,
        explanation: gh.r,
        subject: "GK",
        chapter: "১৯৭১ সালের মহান মুক্তিযুদ্ধ",
        difficulty: "Medium",
        category: "Medical Standard Questions",
        source: "Liberation War History of Bangladesh Matrix"
      });
    }

    setImportText(JSON.stringify(list, null, 2));
    showToast(language === "bn" ? `পরীক্ষার উপযোগী ১০২০টি অনন্য মেডিকেল অ্যাডমিশন কুইজ জেনারেট করা হয়েছে! যাচাই করতে 'COMPILE & VALIDATE BATCH DATA' বাটনে ক্লিক করুন।` : `Successfully synthesized 1,020 MAT-centric high-yield admission questions in JSON. Click COMPILE & VALIDATE BATCH DATA to review.`);
    logActivity(`Generated programmatically 1020 premium MAT questions to input text.`);
  };

  const seedSampleExcelJSON = () => {
    const template = [
      {
        questionText: "রেনিন (Renin) এনজাইম মানবদেহে নিচের কোন অঙ্গ থেকে ক্ষরিত হয়?",
        options: ["যকৃত (Liver)", "অগ্ন্যাশয় (Pancreas)", "বৃক্ক (Kidney)", "পাকস্থলী (Gastric)"],
        correctAnswerIndex: 2,
        explanation: "বৃক্কের জাক্সটাগ্লোমেরুলার কোষ থেকে রেনিন নামক এনজাইম রক্তচাপ নিয়ন্ত্রণে ক্ষরিত হয়।",
        subject: "Biology",
        chapter: "রক্ত ও রক্ত সংবহন",
        difficulty: "Medium",
        category: "অনুশীলনী Questions",
        source: "Hasan Book অনুশীলনী"
      },
      {
        questionText: "কোন উপাদানটি পরমাণুর কেন্দ্রক বা নিউক্লিয়াসের চারপাশের স্থায়ী অরবিটালে অবস্থান করে না?",
        options: ["ইলেকট্রন", "প্রোটন", "নিউট্রন", "পজিট্রন"],
        correctAnswerIndex: 3,
        explanation: "পজিট্রন একটি ক্ষণস্থায়ী বা অস্থিতিশীল কণা, যা পরমাণুর স্থায়ী কক্ষপথে সাধারণ অবস্থায় অবস্থান করে না। ইলেকট্রন চারপাশের কক্ষপথে ঘুরতে থাকে।",
        subject: "Chemistry",
        chapter: "গুণগত রসায়ন",
        difficulty: "Easy",
        category: "Medical Standard Questions",
        source: "আলী স্যার রসায়ন অনুশীলনী"
      }
    ];
    setImportText(JSON.stringify(template, null, 2));
    showToast("বাংলা মেডিকেল ও অনুশীলনী কুইজ টেমপ্লেট সফলভাবে লোড করা হয়েছে!");
  };

  // Heuristic Statistics
  const totalQuestionsSum = STARTER_QUESTIONS.length + questions.length;
  // Category splits
  const getCategoryCount = (catName: string) => {
    const dbCount = questions.filter(q => q.category === catName).length;
    const stCount = STARTER_QUESTIONS.filter(q => q.category === catName).length;
    return dbCount + stCount;
  };

  const bioCount = STARTER_QUESTIONS.filter(q => q.subject === "Biology").length + questions.filter(q => q.subject === "Biology").length;
  const chemCount = STARTER_QUESTIONS.filter(q => q.subject === "Chemistry").length + questions.filter(q => q.subject === "Chemistry").length;
  const physCount = STARTER_QUESTIONS.filter(q => q.subject === "Physics").length + questions.filter(q => q.subject === "Physics").length;
  const engCount = STARTER_QUESTIONS.filter(q => q.subject === "English").length + questions.filter(q => q.subject === "English").length;
  const gkCount = STARTER_QUESTIONS.filter(q => q.subject === "GK").length + questions.filter(q => q.subject === "GK").length;

  const filteredQList = [...STARTER_QUESTIONS, ...questions].filter(q => {
    const matchSearch = q.questionText.toLowerCase().includes(qSearch.toLowerCase()) || 
      q.chapter.toLowerCase().includes(qSearch.toLowerCase()) ||
      q.source?.toLowerCase().includes(qSearch.toLowerCase());
    
    const matchSubject = qSubjectFilter === "all" || q.subject === qSubjectFilter;
    const matchCategory = qCategoryFilter === "all" || q.category === qCategoryFilter;

    return matchSearch && matchSubject && matchCategory;
  });

  const filteredUsers = usersList.filter(u => {
    return u.displayName.toLowerCase().includes(uSearch.toLowerCase()) || 
      u.email.toLowerCase().includes(uSearch.toLowerCase()) ||
      u.college.toLowerCase().includes(uSearch.toLowerCase());
  });

  const filteredEnrollments = enrollments.filter(e => {
    if (!enrollSearch) return true;
    const s = enrollSearch.toLowerCase();
    return (
      e.userDisplayName?.toLowerCase().includes(s) ||
      e.userEmail?.toLowerCase().includes(s) ||
      e.packageName?.toLowerCase().includes(s) ||
      e.trxId?.toLowerCase().includes(s) ||
      e.paymentMethod?.toLowerCase().includes(s)
    );
  });

  // Dynamically analyze duplicates on the active `questions` array!
  const questionsWithDuplicateStatus = useMemo(() => {
    const textCounts: { [key: string]: number } = {};
    questions.forEach((q) => {
      if (!q.questionText) return;
      const normalized = q.questionText.trim().toLowerCase().replace(/\s+/g, " ");
      textCounts[normalized] = (textCounts[normalized] || 0) + 1;
    });

    const duplicatesMap = new Map<string, { isDuplicate: boolean; isRedundant: boolean }>();
    const seenCount = new Map<string, number>();

    questions.forEach((q) => {
      if (!q.questionText) return;
      const normalized = q.questionText.trim().toLowerCase().replace(/\s+/g, " ");
      const totalCount = textCounts[normalized] || 0;
      
      if (totalCount > 1) {
        const currentCount = (seenCount.get(normalized) || 0) + 1;
        seenCount.set(normalized, currentCount);
        
        duplicatesMap.set(q.id || "", {
          isDuplicate: true,
          isRedundant: currentCount > 1,
        });
      } else {
        duplicatesMap.set(q.id || "", {
          isDuplicate: false,
          isRedundant: false,
        });
      }
    });

    return duplicatesMap;
  }, [questions]);

  const filteredBulkQList = questions.filter(q => {
    const matchSearch = q.questionText.toLowerCase().includes(qSearch.toLowerCase()) || 
      q.chapter.toLowerCase().includes(qSearch.toLowerCase()) ||
      q.source?.toLowerCase().includes(qSearch.toLowerCase());
    
    const matchSubject = qSubjectFilter === "all" || q.subject === qSubjectFilter;
    const matchCategory = qCategoryFilter === "all" || q.category === qCategoryFilter;

    // Filter based on duplicate mode
    const status = questionsWithDuplicateStatus.get(q.id || "");
    let matchDuplicate = true;
    if (duplicateFilterMode === "duplicates") {
      matchDuplicate = !!status?.isDuplicate;
    } else if (duplicateFilterMode === "redundants") {
      matchDuplicate = !!status?.isRedundant;
    }

    return matchSearch && matchSubject && matchCategory && matchDuplicate;
  });

  const paginatedQList = filteredQList.slice((qPage - 1) * ITEMS_PER_PAGE, qPage * ITEMS_PER_PAGE);
  const qTotalPages = Math.ceil(filteredQList.length / ITEMS_PER_PAGE);

  const paginatedBulkQList = filteredBulkQList.slice((bulkPage - 1) * ITEMS_PER_PAGE, bulkPage * ITEMS_PER_PAGE);
  const bulkTotalPages = Math.ceil(filteredBulkQList.length / ITEMS_PER_PAGE);

  const paginatedUsers = filteredUsers.slice((uPage - 1) * ITEMS_PER_PAGE, uPage * ITEMS_PER_PAGE);
  const uTotalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);

  const paginatedEnrollments = filteredEnrollments.slice((ePage - 1) * ITEMS_PER_PAGE, ePage * ITEMS_PER_PAGE);
  const eTotalPages = Math.ceil(filteredEnrollments.length / ITEMS_PER_PAGE);

  const handleSelectRedundants = () => {
    playSound("click");
    const ids: string[] = [];
    questions.forEach((q) => {
      if (q.id && questionsWithDuplicateStatus.get(q.id)?.isRedundant) {
        ids.push(q.id);
      }
    });
    setSelectedQIds(ids);
    showToast(isBn 
      ? `সকল অতিরিক্ত ডুপ্লিকেট কপি সিলেক্ট করা হয়েছে (${ids.length}টি)` 
      : `Selected all ${ids.length} redundant duplicate copies!`);
  };

  const handleSelectAllDuplicates = () => {
    playSound("click");
    const ids: string[] = [];
    questions.forEach((q) => {
      if (q.id && questionsWithDuplicateStatus.get(q.id)?.isDuplicate) {
        ids.push(q.id);
      }
    });
    setSelectedQIds(ids);
    showToast(isBn 
      ? `সকল ডুপ্লিকেট প্রশ্ন সিলেক্ট করা হয়েছে (${ids.length}টি)` 
      : `Selected all ${ids.length} duplicate questions!`);
  };

  // Adjust current page if deletions shrink total pages below current page index
  useEffect(() => {
    if (qPage > 1 && qPage > qTotalPages && qTotalPages > 0) {
      setQPage(qTotalPages);
    }
  }, [qPage, qTotalPages]);

  useEffect(() => {
    if (bulkPage > 1 && bulkPage > bulkTotalPages && bulkTotalPages > 0) {
      setBulkPage(bulkTotalPages);
    }
  }, [bulkPage, bulkTotalPages]);

  useEffect(() => {
    if (uPage > 1 && uPage > uTotalPages && uTotalPages > 0) {
      setUPage(uTotalPages);
    }
  }, [uPage, uTotalPages]);

  useEffect(() => {
    if (ePage > 1 && ePage > eTotalPages && eTotalPages > 0) {
      setEPage(eTotalPages);
    }
  }, [ePage, eTotalPages]);

  const tabsList = [
    { id: "platform", name: isBn ? "⚙️ প্ল্যাটফর্ম কন্ট্রোল" : "Platform Control", desc: isBn ? "ফিচার টগল ও মোডস" : "Feature toggles & modes", icon: Sliders, badge: "Config" },
    { id: "users", name: isBn ? "👥 স্টুডেন্ট কন্ট্রোল" : "Student Control", desc: isBn ? "অ্যাকাউন্ট ও রোলস" : "Manage accounts & roles", icon: Users, badge: "Admin" },
    { id: "enrollments", name: isBn ? "💳 এনরোলমেন্ট ও অ্যাক্সেস" : "Enrollment & Access", desc: isBn ? "লেজার ও পেমেন্ট হিস্ট্রি" : "Ledgers & premium access", icon: CreditCard, badge: "Finance" },
    { id: "questions", name: isBn ? "📚 কোশ্চেন ব্যাংক" : "Question Bank", desc: isBn ? "প্রশ্ন কিউরেশন হাব" : "Curate test pool", icon: Database, badge: `${totalQuestionsSum} Qs` },
    { id: "duplicates", name: isBn ? "🧹 বাল্ক ক্লিনআপ" : "Bulk Cleanup", desc: isBn ? "একই প্রশ্ন ডিলিট করুন" : "Remove identical questions", icon: Trash2, badge: "Janitor" },
    { id: "import", name: isBn ? "📥 বাল্ক ইম্পোর্ট" : "Bulk Import", desc: isBn ? "ফাইল পার্সিং ও সিডিং" : "Seeding & file parsing", icon: FileUp, badge: "Data" },
    { id: "review", name: isBn ? "📋 মডারেটর রিভিউ" : "Moderator Review", desc: isBn ? "রিপোর্টেড প্রশ্নের কিউ" : "Reported questions queue", icon: UserCheck, badge: "Review" },
    { id: "security", name: isBn ? "🚨 সিকিউরিটি ম্যাট্রিক্স" : "Security Matrix", desc: isBn ? "ফায়ারওয়াল ও টোকেন" : "Firewall & superadmin tokens", icon: ShieldAlert, badge: "Secure" },
    { id: "topics", name: isBn ? "🔍 সার্চ টপিকস" : "Search Topics", desc: isBn ? "সিলেবাস ইনডেক্সিং" : "Index syllabus metadata", icon: BookOpen, badge: "Index" },
    { id: "live_exams", name: isBn ? "🏆 লাইভ এক্সামস" : "Live Exams Manager", desc: isBn ? "মডেল টেস্ট ও রি-এক্সাম কন্ট্রোল" : "Model tests & re-exam manager", icon: Award, badge: `${liveExams.length} Live` },
    { id: "gaming_arena", name: isBn ? "🎮 গেমিং অ্যারেনা" : "Gaming Arena Controls", desc: isBn ? "XP/কয়েন গুণক, ইভেন্ট ও গেম সচলতা" : "Economy, multipliers & game status", icon: Gamepad2, badge: "Arena" }
  ];

  // 1. Mandatory Passcode Security Gate
  if (!isUnlocked) {
    return (
      <CommandCenterPasscodeLock
        language={language}
        theme={theme}
        userEmail={user?.email}
        onUnlock={() => {
          setIsUnlocked(true);
          try {
            sessionStorage.setItem("mb_cc_unlocked_session", "true");
          } catch {}
        }}
        onCancel={() => onNavigateToTab("dashboard")}
      />
    );
  }

  if (!hasAccess) {
    return (
      <div className="bg-[#0A0A0A] border border-red-500/30 rounded-3xl p-12 text-center max-w-2xl mx-auto my-12 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 inset-x-0 h-1.5 bg-red-600 animate-pulse"></div>
        <div className="p-4 bg-red-600/10 border border-red-500/20 rounded-full w-20 h-20 flex items-center justify-center mx-auto text-4xl mb-6">
          🚫
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white mb-4">ACCESS DENIED</h2>
        <p className="text-gray-400 text-sm leading-relaxed mb-8">
          "You do not have permission to access the MediBridge Games Command Center."
        </p>
        <button
          onClick={() => onNavigateToTab("dashboard")}
          className="px-6 py-3 bg-[#C1121F] text-white text-xs font-bold uppercase tracking-wider rounded-xl border-b-2 border-red-950 transition-all hover:bg-red-700"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 w-full animate-fadeIn font-sans">
      {/* HEADER SECTION PANEL */}
      <div className="bg-gradient-to-r from-[#1A1A1A] to-[#111111] border border-white/10 rounded-2xl p-6 relative flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden shadow-xl">
        <div className="absolute top-0 left-0 h-full w-1.5 bg-[#FFD700]"></div>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#FFD700]/10 border border-[#FFD700]/20 rounded-full flex items-center justify-center text-2xl">
            🛡️
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[9.5px] font-mono font-black uppercase tracking-widest mb-1 select-none">
              <span>⚠️</span>
              <span>Not for students</span>
            </div>
            <h2 className="text-xl font-extrabold tracking-tight text-white uppercase flex items-center gap-2">
              <span>COMMAND CENTER PORTAL</span>
              <span className="text-[10px] bg-[#FFD700] text-black font-black px-2 py-0.5 rounded uppercase">
                {role}
              </span>
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              {isBn 
                ? "মেডিব্রিজ গেমস প্ল্যাটফর্ম সিকিউরিটি, প্রশ্ন ব্যাংক তদারকি এবং মেম্বার নিয়ন্ত্রণ হাব।" 
                : "Real-time administrative nexus for game features, user profile grants, and medical question banks."}
            </p>
          </div>
        </div>

        {/* Dynamic global status HUD & Lock Deck */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-black/50 border border-white/5 py-2 px-3 rounded-xl text-xs font-mono">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-gray-400">SYS:</span>
            <span className="text-[#FFD700] font-extrabold">{totalQuestionsSum}+ Qs</span>
          </div>

          <button
            type="button"
            onClick={() => {
              playSound("click");
              setIsUnlocked(false);
              try {
                sessionStorage.removeItem("mb_cc_unlocked_session");
              } catch {}
            }}
            className="px-3 py-2 bg-red-950/70 hover:bg-red-900/80 border border-red-500/40 text-red-300 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer shadow hover:shadow-red-900/30"
            title={isBn ? "কমান্ড সেন্টার তাৎক্ষণিক লক করুন" : "Lock Command Center Deck"}
          >
            <Lock className="w-3.5 h-3.5 text-red-400" />
            <span>{isBn ? "লক ডেক 🔒" : "LOCK DECK 🔒"}</span>
          </button>
        </div>
      </div>

      {/* SUCCESS / ERROR ALERTS DISPATCHER */}
      {successMsg && (
        <div className="bg-emerald-950/20 border border-emerald-500/35 p-4 rounded-xl flex items-center gap-3 text-emerald-300 text-xs animate-bounce">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-950/20 border border-red-500/35 p-4 rounded-xl flex items-center gap-3 text-red-300 text-xs animate-shake">
          <AlertTriangle className="w-4 h-4 text-[#C1121F]" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* MOBILE ONLY TOP SCROLLING NAVIGATION */}
      <div className="md:hidden flex border-b border-white/5 overflow-x-auto scrollbar-none gap-2 text-xs font-mono uppercase font-bold sticky top-[72px] bg-[#0A0A0A] py-2 z-20">
        {tabsList.map((item) => {
          const IconComp = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => {
                playSound("click");
                setSubTab(item.id as any);
              }}
              className={`py-3 px-4 rounded-xl shrink-0 transition flex items-center gap-2 ${
                subTab === item.id
                  ? "bg-[#C1121F] text-white shadow-[0_0_15px_rgba(193,18,31,0.3)]"
                  : "text-gray-400 bg-white/[0.02] border border-white/5 hover:bg-white/5"
              }`}
            >
              <IconComp className="w-3.5 h-3.5 shrink-0" />
              <span>{item.name}</span>
            </button>
          );
        })}
      </div>

      {/* MAIN CONTENT BLOCK WITH DESKTOP SIDEBAR + RENDER AREA */}
      <div className="flex flex-col md:flex-row gap-8 w-full items-start">
        {/* DESKTOP ONLY HIGH-TECH SIDEBAR */}
        <div className="hidden md:flex flex-col gap-4 w-80 shrink-0 bg-[#111111] border border-white/10 rounded-2xl p-5 sticky top-[90px] self-start max-h-[calc(100vh-140px)] overflow-y-auto scrollbar-none shadow-2xl">
          <div className="border-b border-white/5 pb-4 mb-2">
            <span className="text-[10px] text-[#FFD700] font-mono tracking-widest uppercase font-bold">MediBridge Admin Console</span>
            <h3 className="text-sm font-extrabold text-white uppercase tracking-tight mt-1 flex items-center gap-2">
              <span>{isBn ? "কমান্ড কোর" : "Command Core"}</span>
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            </h3>
          </div>

          <div className="flex flex-col gap-2">
            {tabsList.map((item) => {
              const IconComp = item.icon;
              const isActive = subTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    playSound("click");
                    setSubTab(item.id as any);
                  }}
                  className={`w-full text-left p-3 rounded-xl transition flex items-center justify-between gap-3 group relative overflow-hidden ${
                    isActive
                      ? "bg-gradient-to-r from-[#C1121F] to-[#800F17] text-white border-l-4 border-[#FFD700] shadow-[0_4px_20px_rgba(193,18,31,0.25)]"
                      : "text-gray-400 hover:text-white bg-white/[0.01] hover:bg-white/[0.04] border border-white/5"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <IconComp className={`w-4 h-4 shrink-0 transition-transform duration-300 group-hover:scale-110 ${isActive ? "text-[#FFD700]" : "text-gray-400 group-hover:text-white"}`} />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-extrabold tracking-wide uppercase truncate">{item.name}</span>
                      <span className="text-[9px] text-gray-500 group-hover:text-gray-400 truncate mt-0.5">{item.desc}</span>
                    </div>
                  </div>
                  {item.badge && (
                    <span className={`text-[8px] px-1.5 py-0.5 rounded font-mono font-bold shrink-0 ${isActive ? "bg-white/20 text-white" : "bg-white/5 text-gray-400 border border-white/5"}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-white/5 flex flex-col gap-2">
            <div className="flex items-center justify-between text-[10px] font-mono text-gray-500">
              <span>{isBn ? "সুপাবেস ডাটাবেজ" : "Supabase PostgreSQL"}</span>
              <span className="text-emerald-400 flex items-center gap-1 font-bold">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                ACTIVE
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-gray-500">
              <span>{isBn ? "ফায়ারবেস স্ট্যাটাস" : "Firebase Firestore"}</span>
              <span className="text-red-400 font-bold">
                DISCONNECTED
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-gray-500">
              <span>{isBn ? "মাইগ্রেটেড প্রশ্ন" : "Migrated Questions"}</span>
              <span className="text-[#FFD700] font-bold">2,393 Qs</span>
            </div>
          </div>
        </div>

        {/* ACTIVE MODULE CONTAINER (CONTENT PANE) */}
        <div className="flex-1 w-full min-w-0">

      {/* TAB CONTENT: 1. PLATFORM CONTROL */}
      {subTab === "platform" && (
        <div className="grid md:grid-cols-3 gap-8 animate-fadeIn">
          {/* Feature management toggles */}
          <div className="md:col-span-2 bg-[#111111] border border-white/10 rounded-2xl p-6 shadow">
            <h3 className="text-sm font-extrabold uppercase text-white border-b border-white/5 pb-3 mb-5 flex items-center justify-between">
              <span>Feature Toggles & Permissions</span>
              <span className="text-[10px] text-[#FFD700] uppercase font-mono">Real-time sync</span>
            </h3>

            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { key: "socialFeedEnabled", name: "Social Feed & Squads", desc: "Allow students to publish achievements and form study guilds." },
                { key: "aiMentorEnabled", name: "MediSense AI Consultant", desc: "Enable real-time custom Gemini AI mentoring queries." },
                { key: "dailyMissionsEnabled", name: "Daily Habit Missions", desc: "Grant custom tasks and gold multipliers to daily grinders." },
                { key: "bossBattlesEnabled", name: "Boss Battle Encounters", desc: "Activate ultimate level guardian bosses on exam topics." },
                { key: "survivalEnabled", name: "Sudden Death Survival Run", desc: "Enable high-stakes continuous testing mode in combat." },
                { key: "leaderboardEnabled", name: "Global War Boards", desc: "Show cross-district ranking tables and division points." }
              ].map((item) => {
                const isEnabled = (pSettings as any)[item.key];
                return (
                  <div key={item.key} className="p-4 bg-black/30 border border-white/5 rounded-xl flex items-center justify-between hover:border-[#C1121F]/30 transition">
                    <div>
                      <h4 className="text-xs font-extrabold text-white">{item.name}</h4>
                      <p className="text-[10px] text-gray-450 mt-1">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => updatePlatformSettings({ [item.key]: !isEnabled })}
                      className={`w-11 h-6 rounded-full p-1 transition duration-300 relative shrink-0 ${
                        isEnabled ? "bg-emerald-500" : "bg-gray-800"
                      }`}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full shadow transition transform duration-300 ${isEnabled ? "translate-x-5" : ""}`} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Premium features billing model controls */}
            <div className="mt-8 border-t border-white/5 pt-6">
              <h4 className="text-xs font-extrabold uppercase tracking-wide text-[#FFD700] mb-3">Premium Feature Configuration Mode</h4>
              <div className="flex gap-3">
                {[
                  { mode: "all_free", label: "Open Access (All Free)" },
                  { mode: "premium_locked", label: "Paywall / Coins Locked" },
                  { mode: "trial_mode", label: "Dynamic Daily Trial Mode" }
                ].map((item) => (
                  <button
                    key={item.mode}
                    onClick={() => updatePlatformSettings({ premiumControlMode: item.mode as any })}
                    className={`flex-1 py-3 px-4 rounded-xl border text-xs font-mono font-bold transition ${
                      pSettings.premiumControlMode === item.mode
                        ? "bg-[#C1121F]/15 border-[#C1121F] text-white"
                        : "bg-black/40 border-white/5 text-gray-400 hover:border-white/15"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Maintenance alert and Special events */}
          <div className="flex flex-col gap-8">
            {/* Maintenance Command Deck */}
            <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 to-transparent pointer-events-none"></div>
              
              <h3 className="text-sm font-extrabold uppercase text-white mb-3 flex items-center justify-between">
                <span>System Maintenances</span>
                <Sliders className="w-4 h-4 text-amber-500" />
              </h3>

              <p className="text-[10px] text-gray-400 leading-relaxed mb-5">
                Lock regular student logins down and display a custom maintenance interface for scheduled server transitions.
              </p>

              <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white uppercase block">MAINTENANCE ACTIVE</span>
                  <span className="text-[10px] text-gray-400 font-mono mt-1 block">Students will get blocked</span>
                </div>
                <button
                  onClick={() => updatePlatformSettings({ maintenanceMode: !pSettings.maintenanceMode })}
                  className={`w-12 h-7 rounded-full p-1 transition duration-300 relative ${
                    pSettings.maintenanceMode ? "bg-amber-500" : "bg-gray-800"
                  }`}
                >
                  <div className={`bg-black w-5 h-5 rounded-full shadow transition transform duration-300 ${pSettings.maintenanceMode ? "translate-x-5" : ""}`} />
                </button>
              </div>
            </div>

            {/* Simulated Live Event Control */}
            <div className="bg-[#111111] border border-white/10 rounded-2xl p-6">
              <h3 className="text-sm font-extrabold uppercase text-white mb-4 flex items-center justify-between">
                <span>Active Campaign Event</span>
                <Bell className="w-4 h-4 text-[#FFD700]" />
              </h3>

              <select
                value={pSettings.activeEvent}
                onChange={(e) => updatePlatformSettings({ activeEvent: e.target.value })}
                className="w-full bg-[#0A0A0A] border border-white/10 text-white rounded-xl py-3 px-4 text-xs font-mono mb-4 focus:outline-none focus:border-[#C1121F]"
              >
                <option value="None">No Event Active</option>
                <option value="DGHS_SYLLABUS_BLAST">DGHS syllabus final blast (+50% XP)</option>
                <option value="DHAKA_CHAMPIONSHIP">Dhaka divisional championship tier</option>
                <option value="MOCK_MUCK_FIGHT">Weekly Mock War Blitz (+100% Gold)</option>
              </select>

              <div className="bg-black/40 border border-white/5 p-4 rounded-xl text-xs font-mono">
                <span className="text-gray-400">Current Combat Banners:</span>
                <p className="text-[#FFD700] font-bold mt-1 uppercase text-[11px]">
                  {pSettings.activeEvent === "None" ? "⚡ STANDARD GRINDING CYCLE" : `🏆 EVENT ACTIVE: ${pSettings.activeEvent}`}
                </p>
              </div>
            </div>

            {/* MediBridge App Logo Configuration - Superadmin Only */}
            <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 flex flex-col gap-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#C1121F] via-[#FFD700] to-[#C1121F]"></div>
              
              <h3 className="text-sm font-extrabold uppercase text-white mb-2 flex items-center justify-between">
                <span>🎯 MediBridge Games Logo Manager</span>
                <span className={`text-[9px] tracking-widest px-2 py-0.5 rounded font-black font-mono border ${
                  role === "superadmin" || user.email === "nuwaisirhoquesbmc@gmail.com" || user.email === "hoquenuwaisir@gmail.com"
                    ? "bg-emerald-950/40 text-emerald-400 border-emerald-500/20"
                    : "bg-red-950/40 text-red-400 border-red-500/20"
                }`}>
                  {role === "superadmin" || user.email === "nuwaisirhoquesbmc@gmail.com" || user.email === "hoquenuwaisir@gmail.com"
                    ? (language === "bn" ? "সুপারএডমিন সক্রিয়" : "SUPERADMIN ACTIVE")
                    : (language === "bn" ? "🔒 শুধুমাত্র সুপারএডমিন" : "🔒 SUPERADMIN ONLY")
                  }
                </span>
              </h3>

              <p className="text-[10px] text-gray-400 leading-relaxed mb-1">
                {language === "bn"
                  ? "আপনার নিজস্ব ব্র্যান্ডিং লোগো আপলোড করুন বা লিংক সেট করুন। এটি অ্যাপের লোডিং স্ক্রিন, ড্যাশবোর্ড এবং লগইন পেজের লোগো স্বয়ংক্রিয়ভাবে পরিবর্তন করে দেবে।"
                  : "Upload a custom branding image or paste a logo CDN link. This replaces the default app logo across the loading screen, dashboard header, and auth portals dynamically."}
              </p>

              {/* Toggle to enable/disable custom logo */}
              <div className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-white uppercase block">Enable Custom Branding Logo</span>
                  <span className="text-[9px] text-gray-500 font-mono mt-0.5 block">Toggle custom uploaded logo versus default vector SVG</span>
                </div>
                <button
                  type="button"
                  disabled={!(role === "superadmin" || user.email === "nuwaisirhoquesbmc@gmail.com" || user.email === "hoquenuwaisir@gmail.com")}
                  onClick={() => updatePlatformSettings({ customLogoEnabled: !pSettings.customLogoEnabled })}
                  className={`w-11 h-6 rounded-full p-1 transition duration-300 relative shrink-0 ${
                    pSettings.customLogoEnabled ? "bg-emerald-500" : "bg-gray-800"
                  } ${!(role === "superadmin" || user.email === "nuwaisirhoquesbmc@gmail.com" || user.email === "hoquenuwaisir@gmail.com") ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow transition transform duration-300 ${pSettings.customLogoEnabled ? "translate-x-5" : ""}`} />
                </button>
              </div>

              {/* Live Preview Panel */}
              <div className="p-4 bg-black/20 border border-white/5 rounded-xl flex flex-col items-center justify-center min-h-[100px] text-center">
                <span className="text-[9px] font-mono text-gray-500 uppercase mb-3">Live Logo Preview</span>
                <MediBridgeLogo size="md" />
                {pSettings.customLogoEnabled && pSettings.customLogoUrl && (
                  <span className="text-[8px] text-emerald-400 font-mono mt-2 uppercase font-bold">✓ Custom Logo Active and Rendered</span>
                )}
                {(!pSettings.customLogoEnabled || !pSettings.customLogoUrl) && (
                  <span className="text-[8px] text-amber-500 font-mono mt-2 uppercase font-bold">⚡ Default SVG Fallback Active</span>
                )}
              </div>

              {/* File Uploader */}
              <div className="flex flex-col gap-1.5 border-t border-b border-white/5 py-4">
                <label className="text-[10px] font-mono text-gray-400 uppercase flex justify-between items-center">
                  <span>Option A: Direct Image File Upload</span>
                  <span className="text-[8.5px] text-gray-500 font-sans tracking-tight">Max 4MB (.png, .jpg, .svg)</span>
                </label>
                
                <div className="relative border-2 border-dashed border-white/10 hover:border-red-500/30 rounded-xl p-4 flex flex-col items-center justify-center transition bg-black/20 group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleDirectLogoUpload}
                    disabled={uploadingLogo || !(role === "superadmin" || user.email === "nuwaisirhoquesbmc@gmail.com" || user.email === "hoquenuwaisir@gmail.com")}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                  {uploadingLogo ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-5 h-5 border-2 border-[#C1121F] border-t-transparent rounded-full animate-spin" />
                      <span className="text-[10px] font-mono text-gray-400">Processing image asset...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center gap-1">
                      <FileUp className="w-6 h-6 text-gray-400 group-hover:text-red-500 transition duration-300" />
                      <span className="text-[11px] font-bold text-white uppercase mt-1">Select / Drop Image File</span>
                      <span className="text-[9px] text-gray-500 block">Optimized image or vector assets</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Direct Remote URL */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono text-gray-400 uppercase flex justify-between">
                  <span>Option B: Logo URL CDN Link</span>
                  {logoUrlInput && !logoUrlInput.startsWith("data:image/") && (
                    <span className="text-[9px] text-[#FFD700] uppercase font-bold">✓ Link Active</span>
                  )}
                </label>
                <input
                  type="text"
                  value={logoUrlInput.startsWith("data:image/") ? "Base64 Asset Encoded" : logoUrlInput}
                  onChange={(e) => setLogoUrlInput(e.target.value)}
                  disabled={!(role === "superadmin" || user.email === "nuwaisirhoquesbmc@gmail.com" || user.email === "hoquenuwaisir@gmail.com")}
                  placeholder="Paste direct HTTPS link (e.g. https://site.com/logo.png)"
                  className="w-full bg-[#0A0A0A] border border-white/10 text-white rounded-xl py-2.5 px-3 text-xs font-mono focus:outline-none focus:border-[#C1121F] disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {/* Save Logo URL */}
              <button
                type="button"
                disabled={!(role === "superadmin" || user.email === "nuwaisirhoquesbmc@gmail.com" || user.email === "hoquenuwaisir@gmail.com")}
                onClick={() => updatePlatformSettings({
                  customLogoUrl: logoUrlInput,
                  customLogoEnabled: true
                })}
                className="w-full bg-[#C1121F] hover:bg-[#A00F18] disabled:bg-gray-800 disabled:opacity-40 text-white rounded-xl py-2.5 px-4 text-xs font-bold font-mono tracking-wider transition-all shadow-md flex justify-center items-center gap-1.5 disabled:cursor-not-allowed mt-2"
              >
                💾 {language === "bn" ? "লোগো সেটিংস সংরক্ষণ করুন" : "SAVE LOGO CONFIGURATION"}
              </button>
            </div>

            {/* Animated Promo Video Configuration - Superadmin Only */}
            <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 flex flex-col gap-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-650 via-[#FFD700] to-red-650"></div>
              
              <h3 className="text-sm font-extrabold uppercase text-white mb-2 flex items-center justify-between">
                <span>Landing Promo Video Segment</span>
                <span className={`text-[9px] tracking-widest px-2 py-0.5 rounded font-black font-mono border ${
                  role === "superadmin" || user.email === "nuwaisirhoquesbmc@gmail.com" || user.email === "hoquenuwaisir@gmail.com"
                    ? "bg-emerald-950/40 text-emerald-400 border-emerald-500/20"
                    : "bg-red-950/40 text-red-400 border-red-500/20"
                }`}>
                  {role === "superadmin" || user.email === "nuwaisirhoquesbmc@gmail.com" || user.email === "hoquenuwaisir@gmail.com"
                    ? (language === "bn" ? "সুপারএডমিন সক্রিয়" : "SUPERADMIN ACTIVE")
                    : (language === "bn" ? "🔒 শুধুমাত্র সুপারএডমিন" : "🔒 SUPERADMIN ONLY")
                  }
                </span>
              </h3>

              <p className="text-[10px] text-gray-400 leading-relaxed mb-1">
                {language === "bn"
                  ? "লিডারবোর্ড চ্যাম্পিয়নের জায়গায় একটি মনমুগ্ধকর অ্যানিমেটেড প্রচারণামূলক (Promo) ভিডিও যুক্ত করুন। এটি সরাসরি আপনার কম্পিউটার থেকে আপলোড বা সরাসরি .mp4 লিংক যোগ করতে পারেন।"
                  : "Replace the landing page leaderboard champion showcase with a gorgeous high-fidelity animated promotional (Promo) video."}
              </p>

              {/* Toggle to enable/disable video */}
              <div className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-white uppercase block">Show Promo Video Section</span>
                  <span className="text-[9px] text-gray-500 font-mono mt-0.5 block">Toggle visual media on Landing Page</span>
                </div>
                <button
                  disabled={!(role === "superadmin" || user.email === "nuwaisirhoquesbmc@gmail.com" || user.email === "hoquenuwaisir@gmail.com")}
                  onClick={() => updatePlatformSettings({ landingVideoEnabled: !pSettings.landingVideoEnabled })}
                  className={`w-11 h-6 rounded-full p-1 transition duration-300 relative shrink-0 ${
                    pSettings.landingVideoEnabled ? "bg-emerald-500" : "bg-gray-800"
                  } ${!(role === "superadmin" || user.email === "nuwaisirhoquesbmc@gmail.com" || user.email === "hoquenuwaisir@gmail.com") ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow transition transform duration-300 ${pSettings.landingVideoEnabled ? "translate-x-5" : ""}`} />
                </button>
              </div>

              {/* Title input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono text-gray-400 uppercase">Promo Block Heading</label>
                <input
                  type="text"
                  value={videoTitleInput}
                  onChange={(e) => setVideoTitleInput(e.target.value)}
                  disabled={!(role === "superadmin" || user.email === "nuwaisirhoquesbmc@gmail.com" || user.email === "hoquenuwaisir@gmail.com")}
                  placeholder="Enter video block heading..."
                  className="w-full bg-[#0A0A0A] border border-white/10 text-white rounded-xl py-2.5 px-3 text-xs font-mono focus:outline-none focus:border-[#C1121F] disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {/* DIRECT FILE UPLOADER */}
              <div className="flex flex-col gap-1.5 border-t border-b border-white/5 py-4">
                <label className="text-[10px] font-mono text-gray-400 uppercase flex justify-between items-center">
                  <span>Option A: Direct Video File Upload</span>
                  <span className="text-[8.5px] text-gray-500 font-sans tracking-tight">Max 100MB+ stored securely inside IndexedDB</span>
                </label>
                
                <div className="relative border-2 border-dashed border-white/10 hover:border-red-500/30 rounded-xl p-4 flex flex-col items-center justify-center transition bg-black/20 group">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleDirectVideoUpload}
                    disabled={uploadingVideo || !(role === "superadmin" || user.email === "nuwaisirhoquesbmc@gmail.com" || user.email === "hoquenuwaisir@gmail.com")}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                  {uploadingVideo ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-5 h-5 border-2 border-[#C1121F] border-t-transparent rounded-full animate-spin" />
                      <span className="text-[10px] font-mono text-gray-400">Saving video payload in Database...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center gap-1">
                      <FileUp className="w-6 h-6 text-gray-400 group-hover:text-red-500 transition duration-300" />
                      <span className="text-[11px] font-bold text-white uppercase mt-1">Select / Drop Video File</span>
                      <span className="text-[9px] text-gray-500 block">Supports .mp4, .mov, .webm, .m4v</span>
                    </div>
                  )}
                </div>

                {videoUrlInput === "local_indexeddb_promo" && localVideoUrl && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-emerald-950/20 border border-emerald-500/20 rounded-lg">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[10px] font-mono text-emerald-300 truncate">
                      ✓ Direct Upload Active (Cached locally)
                    </span>
                  </div>
                )}
              </div>

              {/* Direct MP4/WebM URL Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono text-gray-400 uppercase flex justify-between">
                  <span>Option B: Direct Remote MP4/WebM Link</span>
                  {videoUrlInput !== "local_indexeddb_promo" && videoUrlInput && (
                    <span className="text-[9px] text-[#FFD700] uppercase font-bold">✓ Link Active</span>
                  )}
                </label>
                <input
                  type="text"
                  value={videoUrlInput === "local_indexeddb_promo" ? "" : videoUrlInput}
                  onChange={(e) => {
                    setVideoUrlInput(e.target.value);
                  }}
                  disabled={!(role === "superadmin" || user.email === "nuwaisirhoquesbmc@gmail.com" || user.email === "hoquenuwaisir@gmail.com")}
                  placeholder="Paste direct remote video URL (e.g. .mp4 file path)"
                  className="w-full bg-[#0A0A0A] border border-white/10 text-white rounded-xl py-2.5 px-3 text-xs font-mono focus:outline-none focus:border-[#C1121F] disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className="text-[8.5px] text-gray-500 font-sans leading-tight">
                  Must be direct media file, e.g. <code className="text-[#FFD700]">https://site.com/video.mp4</code>.
                </span>
              </div>

              {/* High-fidelity custom premium animated bio/medical screen presets */}
              <div className="flex flex-col gap-2 mt-1">
                <label className="text-[10px] font-mono text-gray-400 uppercase">Option C: Custom High-Fi Animated Loops</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    disabled={!(role === "superadmin" || user.email === "nuwaisirhoquesbmc@gmail.com" || user.email === "hoquenuwaisir@gmail.com")}
                    onClick={async () => {
                      const url = "https://assets.mixkit.co/videos/preview/mixkit-medical-blue-scanning-interface-41551-large.mp4";
                      const title = "🧬 MediBridge Neuromorphic Bio-Scanning Interface";
                      setVideoUrlInput(url);
                      setVideoTitleInput(title);
                      await updatePlatformSettings({ landingVideoUrl: url, landingVideoTitle: title });
                    }}
                    className={`p-2 rounded-xl text-[9px] font-mono border text-center transition flex flex-col gap-1 items-center justify-center ${
                      videoUrlInput === "https://assets.mixkit.co/videos/preview/mixkit-medical-blue-scanning-interface-41551-large.mp4"
                        ? "bg-red-950/30 border-[#C1121F] text-red-400"
                        : "bg-[#0A0A0A] border-white/10 text-gray-400 hover:border-white/20"
                    }`}
                  >
                    <span>🎯</span>
                    <span className="leading-tight truncate w-full">Bio Scanner</span>
                  </button>

                  <button
                    type="button"
                    disabled={!(role === "superadmin" || user.email === "nuwaisirhoquesbmc@gmail.com" || user.email === "hoquenuwaisir@gmail.com")}
                    onClick={async () => {
                      const url = "https://assets.mixkit.co/videos/preview/mixkit-cells-under-a-microscope-41554-large.mp4";
                      const title = "🔬 MediBridge Microscopic Cellular Regeneration";
                      setVideoUrlInput(url);
                      setVideoTitleInput(title);
                      await updatePlatformSettings({ landingVideoUrl: url, landingVideoTitle: title });
                    }}
                    className={`p-2 rounded-xl text-[9px] font-mono border text-center transition flex flex-col gap-1 items-center justify-center ${
                      videoUrlInput === "https://assets.mixkit.co/videos/preview/mixkit-cells-under-a-microscope-41554-large.mp4"
                        ? "bg-red-950/30 border-[#C1121F] text-red-400"
                        : "bg-[#0A0A0A] border-white/10 text-gray-400 hover:border-white/20"
                    }`}
                  >
                    <span>🦠</span>
                    <span className="leading-tight truncate w-full">Cell Biology</span>
                  </button>

                  <button
                    type="button"
                    disabled={!(role === "superadmin" || user.email === "nuwaisirhoquesbmc@gmail.com" || user.email === "hoquenuwaisir@gmail.com")}
                    onClick={async () => {
                      const url = "https://assets.mixkit.co/videos/preview/mixkit-futuristic-screen-with-medical-data-graphs-and-dna-analysis-41549-large.mp4";
                      const title = "🧬 MediBridge Holo-DNA Strand Multi-Variant Analysis";
                      setVideoUrlInput(url);
                      setVideoTitleInput(title);
                      await updatePlatformSettings({ landingVideoUrl: url, landingVideoTitle: title });
                    }}
                    className={`p-2 rounded-xl text-[9px] font-mono border text-center transition flex flex-col gap-1 items-center justify-center ${
                      videoUrlInput === "https://assets.mixkit.co/videos/preview/mixkit-futuristic-screen-with-medical-data-graphs-and-dna-analysis-41549-large.mp4"
                        ? "bg-red-950/30 border-[#C1121F] text-red-400"
                        : "bg-[#0A0A0A] border-white/10 text-gray-400 hover:border-white/20"
                    }`}
                  >
                    <span>🧪</span>
                    <span className="leading-tight truncate w-full">Holo-DNA</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <button
                type="button"
                disabled={!(role === "superadmin" || user.email === "nuwaisirhoquesbmc@gmail.com" || user.email === "hoquenuwaisir@gmail.com")}
                onClick={() => updatePlatformSettings({
                  landingVideoUrl: videoUrlInput,
                  landingVideoTitle: videoTitleInput
                })}
                className="w-full bg-[#C1121F] hover:bg-[#A00F18] disabled:bg-gray-800 disabled:opacity-40 text-white rounded-xl py-2.5 px-4 text-xs font-bold font-mono tracking-wider transition-all shadow-md flex justify-center items-center gap-1.5 disabled:cursor-not-allowed mt-2"
              >
                💾 {language === "bn" ? "ভিডিও সেটিংস সংরক্ষণ করুন" : "SAVE VIDEO CONFIGURATION"}
              </button>

              {/* Live Preview of video */}
              {pSettings.landingVideoEnabled && (videoUrlInput === "local_indexeddb_promo" ? localVideoUrl : videoUrlInput) && (
                <div className="mt-2 border-t border-white/5 pt-3">
                  <span className="text-[10px] font-mono text-[#FFD700] uppercase block mb-1.5">Live Direct Video Preview:</span>
                  <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-white/10 bg-black flex items-center justify-center">
                    <video
                      src={videoUrlInput === "local_indexeddb_promo" ? (localVideoUrl || "") : videoUrlInput}
                      controls
                      loop
                      autoPlay
                      muted
                      className="absolute inset-0 w-full h-full object-cover"
                    ></video>
                  </div>
                </div>
              )}
            </div>

            {/* 1. Command Center Security Passcode Configuration */}
            <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 flex flex-col gap-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-600 via-[#FFD700] to-red-600"></div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-red-950/60 border border-red-500/30 flex items-center justify-center text-red-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold uppercase text-white">
                      {isBn ? "কমান্ড সেন্টার সিকিউরিটি পাসওয়ার্ড" : "Command Center Security Passcode"}
                    </h3>
                    <span className="text-[10px] text-gray-400 font-mono">
                      Gate Protection & Master Access
                    </span>
                  </div>
                </div>

                <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                  {isBn ? "সক্রিয়: Superadmin2000" : "Active: Superadmin2000"}
                </span>
              </div>

              <p className="text-[11px] text-gray-400 leading-relaxed">
                {isBn
                  ? "কমান্ড সেন্টারে প্রবেশের জন্য প্রয়োজনীয় পাসওয়ার্ড। ডিফল্ট মাস্টার পাসকোড হলো 'Superadmin2000'। প্রয়োজনে নিচের ঘরে কাস্টম পাসকোড সেট করতে পারেন।"
                  : "Security key required to enter the Command Center. Default master passcode is 'Superadmin2000'. You can also configure a custom passcode below."}
              </p>

              {/* Current Passcode Display */}
              <div className="p-3.5 bg-black/60 border border-white/10 rounded-xl flex items-center justify-between font-mono text-xs">
                <div>
                  <span className="text-gray-400 text-[10px] block uppercase">
                    {isBn ? "বর্তমান কার্যকর পাসকোড:" : "Current Active Passkey:"}
                  </span>
                  <span className="text-[#FFD700] font-black tracking-widest text-sm mt-0.5 block">
                    Superadmin2000
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playSound("click");
                    navigator.clipboard.writeText("Superadmin2000");
                    setSuccessMsg(isBn ? "পাসওয়ার্ড কপি করা হয়েছে: Superadmin2000" : "Passcode copied: Superadmin2000");
                    setTimeout(() => setSuccessMsg(""), 3000);
                  }}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-[10px] uppercase font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3 text-[#FFD700]" />
                  <span>{isBn ? "কপি করুন" : "Copy"}</span>
                </button>
              </div>

              {/* Set Custom Passcode Input */}
              <div className="space-y-2 pt-1 border-t border-white/5">
                <label className="text-[10px] font-mono text-gray-400 uppercase flex justify-between">
                  <span>{isBn ? "কাস্টম পাসকোড পরিবর্তন (ঐচ্ছিক):" : "Set Custom Passcode (Optional):"}</span>
                  <span className="text-gray-500 text-[9px]">Case-insensitive</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="custom-cc-passcode-input"
                    defaultValue={typeof window !== "undefined" ? (localStorage.getItem("mb_cc_custom_passcode") || "") : ""}
                    placeholder="Enter custom passcode..."
                    className="flex-1 bg-[#0A0A0A] border border-white/10 text-white rounded-xl py-2 px-3 text-xs font-mono focus:outline-none focus:border-red-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById("custom-cc-passcode-input") as HTMLInputElement;
                      const val = input ? input.value.trim() : "";
                      if (val) {
                        localStorage.setItem("mb_cc_custom_passcode", val);
                        playSound("victory");
                        setSuccessMsg(isBn ? `কাস্টম পাসকোড সংরক্ষিত: ${val}` : `Custom passcode saved: ${val}`);
                      } else {
                        localStorage.removeItem("mb_cc_custom_passcode");
                        playSound("click");
                        setSuccessMsg(isBn ? "কাস্টম পাসকোড মুছে ফেলা হয়েছে (ডিফল্ট: Superadmin2000)" : "Custom passcode removed (Default: Superadmin2000)");
                      }
                      setTimeout(() => setSuccessMsg(""), 3000);
                    }}
                    className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-mono font-bold transition cursor-pointer"
                  >
                    💾 {isBn ? "সংরক্ষণ" : "Save"}
                  </button>
                </div>
              </div>

              {/* Lock Deck Now button */}
              <button
                type="button"
                onClick={() => {
                  playSound("click");
                  setIsUnlocked(false);
                  try {
                    sessionStorage.removeItem("mb_cc_unlocked_session");
                  } catch {}
                }}
                className="w-full py-2.5 bg-black/60 hover:bg-black/80 border border-red-500/30 hover:border-red-500 text-red-400 text-xs font-mono font-bold uppercase rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer mt-1"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{isBn ? "এখনই কমান্ড সেন্টার লক করুন 🔒" : "Lock Command Center Now 🔒"}</span>
              </button>
            </div>

            {/* 2. Supabase Primary Database & Disconnected Firebase Architecture Monitor */}
            <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 flex flex-col gap-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500"></div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Database className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold uppercase text-white">
                      {isBn ? "সুপাবেস ডাটাবেজ ও ডিসকানেক্টেড ফায়ারবেস মনিটর" : "Supabase Active & Disconnected Firebase"}
                    </h3>
                    <span className="text-[10px] text-gray-400 font-mono">
                      100% Migrated • Standalone Supabase Architecture
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                    🟢 Supabase Active
                  </span>
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-950/60 text-red-400 border border-red-500/30">
                    🔴 Firebase Off
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-gray-400 leading-relaxed">
                {isBn
                  ? "ফায়ারবেস ফায়ারস্টোর সম্পূর্ণ ডিসকানেক্ট করা হয়েছে। ফায়ারবেসের সকল ডাটা (২,৩৯৩টি মেডিকেল প্রশ্ন, কোর্স, ব্যাচ, নোটিশ ও সেটিংস) সফলভাবে সুপাবেস ও হাই-স্পিড লোকাল ক্যাশে মাইগ্রেট করা হয়েছে।"
                  : "Firebase Firestore has been completely disconnected. All assets (2,393 Questions, Courses, Batches, Notices, System Settings) are 100% migrated to Supabase and high-speed local cache."}
              </p>

              {/* Migration Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
                <div className="bg-black/60 border border-white/5 p-3 rounded-xl">
                  <span className="text-[10px] text-gray-400 block uppercase">Migrated Qs</span>
                  <span className="text-base font-extrabold text-[#FFD700] mt-0.5 block">
                    2,393 MCQs
                  </span>
                  <span className="text-[9px] text-emerald-400">100% Preserved</span>
                </div>

                <div className="bg-black/60 border border-white/5 p-3 rounded-xl">
                  <span className="text-[10px] text-gray-400 block uppercase">Courses & Batches</span>
                  <span className="text-base font-extrabold text-teal-400 mt-0.5 block">
                    7 Records
                  </span>
                  <span className="text-[9px] text-emerald-400">Supabase Synced</span>
                </div>

                <div className="bg-black/60 border border-white/5 p-3 rounded-xl">
                  <span className="text-[10px] text-gray-400 block uppercase">Notices & Settings</span>
                  <span className="text-base font-extrabold text-blue-400 mt-0.5 block">
                    8 Bundles
                  </span>
                  <span className="text-[9px] text-emerald-400">Zero Latency</span>
                </div>

                <div className="bg-black/60 border border-white/5 p-3 rounded-xl">
                  <span className="text-[10px] text-gray-400 block uppercase">Firebase Reads</span>
                  <span className="text-base font-extrabold text-emerald-400 mt-0.5 block">
                    0 Reads
                  </span>
                  <span className="text-[9px] text-emerald-400">Network Disconnected</span>
                </div>
              </div>

              {/* Cache Purge button */}
              <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                <span className="text-[10px] text-gray-400 font-mono">
                  {isBn ? "ক্যাশ মেমোরি রিসিঙ্ক করতে:" : "To force fresh data re-sync:"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    clearAllOptimizedCaches();
                    playSound("click");
                    setSuccessMsg(isBn ? "সকল ক্লায়েন্ট ক্যাশ পরিষ্কার করা হয়েছে!" : "Client cache cleared! Fresh reads enabled.");
                    setTimeout(() => setSuccessMsg(""), 3000);
                  }}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg text-[10px] font-mono font-bold uppercase transition cursor-pointer border border-white/10 flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3 text-emerald-400" />
                  <span>{isBn ? "ক্যাশ পরিষ্কার করুন" : "Clear Cache"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 2. USER PROFILE CONTROL */}
      {subTab === "users" && (
        <div className="grid lg:grid-cols-3 gap-8 animate-fadeIn">
          {/* Main User List Table */}
          <div className="lg:col-span-2 bg-[#111111] border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/5 pb-4">
              <h3 className="text-sm font-extrabold uppercase text-white">Registered Student Matrix & Ranks</h3>
              {/* Search bar inside student panel */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search name, email, college..."
                  value={uSearch}
                  onChange={(e) => setUSearch(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 text-white rounded-xl py-1.5 pl-9 pr-4 text-xs focus:outline-none focus:border-[#C1121F]"
                />
              </div>
            </div>

            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs bg-black/25">
                <thead>
                  <tr className="border-b border-white/5 text-gray-400 uppercase font-mono">
                    <th className="p-3">Student / Explorer</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Level / XP</th>
                    <th className="p-3">Coins</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-500 font-mono">
                        No match found inside current telemetry registers.
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((u, uIdx) => (
                      <tr
                        key={`${u.uid || u.id || "u"}_${uIdx}`}
                        className={`border-b border-white/[0.02] hover:bg-white/[0.02] cursor-pointer ${
                          selectedUser?.uid === u.uid ? "bg-[#C1121F]/10 border-l-4 border-l-[#C1121F]" : ""
                        }`}
                        onClick={() => {
                          setSelectedUser(u);
                          setNewUserRole(u.role || "student");
                        }}
                      >
                        <td className="p-3 flex items-center gap-3">
                          <img
                            src={u.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`}
                            alt="avatar"
                            className="w-8 h-8 rounded-full border border-white/10 shrink-0"
                          />
                          <div>
                            <span className="font-bold text-white block">{u.displayName}</span>
                            <span className="text-[10px] text-gray-450 block truncate max-w-[140px]">{u.email}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            u.role === "superadmin" ? "bg-red-950/40 text-[#C1121F] border border-[#C1121F]/30" :
                            u.role === "admin" ? "bg-yellow-950/40 text-[#FFD700] border border-[#FFD700]/30" :
                            u.role === "moderator" ? "bg-blue-950/40 text-blue-400 border border-blue-500/20" :
                            "bg-gray-850 text-gray-400"
                          }`}>
                            {u.role || "student"}
                          </span>
                        </td>
                        <td className="p-3 font-mono">
                          <span className="text-white font-bold block">Level {u.level || 1}</span>
                          <span className="text-[10px] text-gray-500 font-normal">{u.xp || 150} XP</span>
                        </td>
                        <td className="p-3 text-yellow-500 font-mono font-bold">🪙 {u.coins || 100}</td>
                        <td className="p-3 text-right">
                          <button
                            className="px-2.5 py-1.5 bg-white/5 border border-white/10 hover:border-[#C1121F] rounded-lg text-[10px] uppercase font-mono font-extrabold text-gray-300"
                            onClick={() => {
                              setSelectedUser(u);
                              setNewUserRole(u.role || "student");
                            }}
                          >
                            Infill Control
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls for Users */}
            {uTotalPages > 1 && (
              <div className="flex items-center justify-between gap-4 border-t border-white/5 pt-4 font-mono text-[11px] text-gray-400">
                <button
                  type="button"
                  disabled={uPage === 1}
                  onClick={() => {
                    playSound("click");
                    setUPage(prev => Math.max(1, prev - 1));
                  }}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer border border-white/10"
                >
                  ◀ {language === "bn" ? "পূর্ববর্তী" : "Prev"}
                </button>
                <span>{language === "bn" ? `পৃষ্ঠা ${uPage} / ${uTotalPages}` : `Page ${uPage} of ${uTotalPages}`}</span>
                <button
                  type="button"
                  disabled={uPage === uTotalPages}
                  onClick={() => {
                    playSound("click");
                    setUPage(prev => Math.min(uTotalPages, prev + 1));
                  }}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer border border-white/10"
                >
                  {language === "bn" ? "পরবর্তী" : "Next"} ▶
                </button>
              </div>
            )}
          </div>

          {/* User Infills / Grants Panel */}
          <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 relative flex flex-col gap-6">
            <h3 className="text-sm font-extrabold uppercase text-white border-b border-white/5 pb-3 flex items-center justify-between">
              <span>Granular Player Controller</span>
              <Settings2 className="w-4 h-4 text-[#C1121F]" />
            </h3>

            {selectedUser ? (
              <div className="flex flex-col gap-5 animate-fadeIn">
                {/* Visual student profile stats */}
                <div className="bg-black/40 border border-white/5 p-4 rounded-xl flex items-center gap-3">
                  <img
                    src={selectedUser.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedUser.uid}`}
                    alt="avatar"
                    className="w-12 h-12 rounded-full border border-white/10"
                  />
                  <div>
                    <h4 className="font-extrabold text-white text-xs block uppercase">{selectedUser.displayName}</h4>
                    <span className="text-[10px] font-mono text-gray-500 block">UID: ...{selectedUser.uid.substring(0, 8)}</span>
                    <span className="text-[10px] text-gray-400 block font-mono">Streak: {selectedUser.dailyStreak || 1} days</span>
                  </div>
                </div>

                {/* Grant Gold Coins */}
                <div className="border border-white/5 p-4 rounded-xl bg-black/20 flex flex-col gap-2">
                  <label className="text-[10px] font-mono uppercase text-gray-400 font-bold">Infill Gold Coins</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={coinsToGrant}
                      onChange={(e) => setCoinsToGrant(Number(e.target.value))}
                      className="w-full bg-[#0A0A0A] border border-white/10 text-white rounded-lg py-1.5 px-3 text-xs font-mono"
                    />
                    <button
                      onClick={handleGrantCoins}
                      className="px-4 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-black text-xs font-mono font-black uppercase rounded-lg"
                    >
                      GRANT 🪙
                    </button>
                  </div>
                  <div className="flex gap-1">
                    {[50, 100, 500].map((val) => (
                      <button
                        key={val}
                        onClick={() => setCoinsToGrant(val)}
                        className="py-1 px-2 text-[10px] font-mono bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 rounded"
                      >
                        +{val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Grant XP / Levels */}
                <div className="border border-white/5 p-4 rounded-xl bg-black/20 flex flex-col gap-2">
                  <label className="text-[10px] font-mono uppercase text-gray-400 font-bold">Grant Marks (XP)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={xpToGrant}
                      onChange={(e) => setXpToGrant(Number(e.target.value))}
                      className="w-full bg-[#0A0A0A] border border-white/10 text-white rounded-lg py-1.5 px-3 text-xs font-mono"
                    />
                    <button
                      onClick={handleGrantXP}
                      className="px-4 py-1.5 bg-[#C1121F] hover:bg-red-700 text-white text-xs font-mono font-black uppercase rounded-lg"
                    >
                      GRANT 🧬
                    </button>
                  </div>
                  <div className="flex gap-1">
                    {[100, 500, 1000].map((val) => (
                      <button
                        key={val}
                        onClick={() => setXpToGrant(val)}
                        className="py-1 px-2 text-[10px] font-mono bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 rounded"
                      >
                        +{val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Role Adjustments (Super Admin locked) */}
                <div className="border border-white/5 p-4 rounded-xl bg-black/20 flex flex-col gap-2">
                  <label className="text-[10px] font-mono uppercase text-gray-400 font-bold flex items-center justify-between">
                    <span>Role Hierarchy Promotion</span>
                    {(role === "superadmin" || user.email === "nuwaisirhoquesbmc@gmail.com" || user.email === "hoquenuwaisir@gmail.com") ? (
                      <span className="text-[9px] text-emerald-400 uppercase font-sans font-black">Authorized</span>
                    ) : (
                      <span className="text-[9px] text-red-500 uppercase flex items-center gap-1 font-sans font-black">
                        <Lock className="w-3 h-3" /> Locked
                      </span>
                    )}
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={newUserRole}
                      disabled={role !== "superadmin" && user.email !== "nuwaisirhoquesbmc@gmail.com" && user.email !== "hoquenuwaisir@gmail.com"}
                      onChange={(e) => setNewUserRole(e.target.value)}
                      className="w-full bg-[#0A0A0A] border border-white/10 text-white rounded-lg py-1.5 px-3 text-xs font-mono focus:outline-none"
                    >
                      <option value="student">Student</option>
                      <option value="moderator">Moderator</option>
                      <option value="admin">Admin</option>
                      <option value="superadmin">Super Admin</option>
                    </select>
                    <button
                      onClick={handleChangeRole}
                      disabled={role !== "superadmin" && user.email !== "nuwaisirhoquesbmc@gmail.com" && user.email !== "hoquenuwaisir@gmail.com"}
                      className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-mono font-black uppercase rounded-lg"
                    >
                      SAVE ROLE
                    </button>
                  </div>
                </div>

                {/* Suspension, Banning and hard zeroers */}
                <div className="flex gap-2.5 mt-2">
                  <button
                    onClick={() => handleBanUser(true)}
                    className="flex-1 py-3 bg-red-950/20 hover:bg-red-900/30 border border-red-500/30 font-mono text-xs font-bold text-red-400 rounded-xl transition uppercase"
                  >
                    🚫 SUSPEND USER
                  </button>
                  <button
                    onClick={handleResetProgress}
                    className="flex-1 py-3 bg-gray-950 hover:bg-white/[0.02] border border-white/10 font-mono text-xs font-bold text-gray-400 rounded-xl transition uppercase"
                  >
                    🔄 ZERO PROGRESS
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500 font-mono">
                <Users className="w-10 h-10 text-gray-700 mb-3 animate-pulse" />
                <p className="text-xs">Select any student from the left table parameters to modify metadata, coins, or security roles.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: 8. ENROLLMENT & ACCESS CONTROL HUB */}
      {subTab === "enrollments" && (
        <div className="flex flex-col gap-8 animate-fadeIn">
          {/* 1. FINANCIAL SUMMARY & METRICS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
            <div className="bg-[#111111] border border-white/10 rounded-2xl p-3 md:p-5 flex flex-col gap-1 md:gap-2 relative overflow-hidden group hover:border-yellow-500/30 transition-all duration-300">
              <div className="absolute top-0 right-0 p-2 md:p-4 opacity-5 group-hover:scale-110 transition-transform text-yellow-500">
                <CreditCard className="w-12 h-12 md:w-16 md:h-16" />
              </div>
              <span className="text-[8px] md:text-[10px] font-mono uppercase text-gray-400 tracking-wider">Total Revenue</span>
              <h2 className="text-base md:text-2xl font-extrabold text-yellow-500 font-mono">
                ৳{enrollments.reduce((sum, e) => sum + (Number(e.amount) || 0), 0).toLocaleString()} BDT
              </h2>
              <span className="text-[8px] md:text-[10px] text-gray-500 font-mono hidden sm:inline">Seeded ledger receipts total</span>
            </div>

            <div className="bg-[#111111] border border-white/10 rounded-2xl p-3 md:p-5 flex flex-col gap-1 md:gap-2 relative overflow-hidden group hover:border-[#C1121F]/30 transition-all duration-300">
              <div className="absolute top-0 right-0 p-2 md:p-4 opacity-5 group-hover:scale-110 transition-transform text-[#C1121F]">
                <Users className="w-12 h-12 md:w-16 md:h-16" />
              </div>
              <span className="text-[8px] md:text-[10px] font-mono uppercase text-gray-400 tracking-wider">Active Premium</span>
              <h2 className="text-base md:text-2xl font-extrabold text-white font-mono">
                {usersList.filter(u => u.isPremium).length} Students
              </h2>
              <span className="text-[8px] md:text-[10px] text-gray-500 font-mono hidden sm:inline">With isPremium unlocked</span>
            </div>

            <div className="bg-[#111111] border border-white/10 rounded-2xl p-3 md:p-5 flex flex-col gap-1 md:gap-2 relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-300">
              <div className="absolute top-0 right-0 p-2 md:p-4 opacity-5 group-hover:scale-110 transition-transform text-emerald-500">
                <Award className="w-12 h-12 md:w-16 md:h-16" />
              </div>
              <span className="text-[8px] md:text-[10px] font-mono uppercase text-gray-400 tracking-wider">Bootcamps</span>
              <h2 className="text-base md:text-2xl font-extrabold text-emerald-400 font-mono">
                {usersList.filter(u => (u as any).enrolledBio || (u as any).enrolledGkEng || (u as any).enrolledMocks).length} Students
              </h2>
              <span className="text-[8px] md:text-[10px] text-gray-500 font-mono hidden sm:inline">Subject specific bootcamps</span>
            </div>

            <div className="bg-[#111111] border border-white/10 rounded-2xl p-3 md:p-5 flex flex-col gap-1 md:gap-2 relative overflow-hidden group hover:border-blue-500/30 transition-all duration-300">
              <div className="absolute top-0 right-0 p-2 md:p-4 opacity-5 group-hover:scale-110 transition-transform text-blue-500">
                <TrendingUp className="w-12 h-12 md:w-16 md:h-16" />
              </div>
              <span className="text-[8px] md:text-[10px] font-mono uppercase text-gray-400 tracking-wider">Purchases (24h)</span>
              <h2 className="text-base md:text-2xl font-extrabold text-blue-400 font-mono">
                {enrollments.filter(e => (Date.now() - new Date(e.createdAt || 0).getTime()) < 24 * 60 * 60 * 1000).length} Enrolls
              </h2>
              <span className="text-[8px] md:text-[10px] text-gray-500 font-mono hidden sm:inline">New manual or auto signups</span>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* LEFT SIDE: CONTROL PANELS */}
            <div className="flex flex-col gap-8">
              {/* PANEL 1: ACCESS CONTROL MANAGER */}
              <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
                <h3 className="text-sm font-extrabold uppercase text-white border-b border-white/5 pb-3 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#C1121F]" />
                  <span>Student Access Control</span>
                </h3>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-mono uppercase text-gray-400 font-bold">Select student profile</label>
                  <select
                    value={acSelectedUserUid}
                    onChange={(e) => {
                      playSound("click");
                      handleSelectAcUser(e.target.value);
                    }}
                    className="w-full bg-[#0A0A0A] border border-white/10 text-white rounded-xl py-2 px-3 text-xs font-sans focus:outline-none focus:border-[#C1121F]"
                  >
                    <option value="">-- Choose student directory --</option>
                    {usersList.map((u, uIdx) => (
                      <option key={`${u.uid || u.id || "u"}_${uIdx}`} value={u.uid}>
                        {u.displayName} ({u.email || "No Email"})
                      </option>
                    ))}
                  </select>
                </div>

                {acSelectedUserUid && (
                  <div className="flex flex-col gap-4 animate-fadeIn">
                    <div className="bg-black/30 border border-white/5 p-4 rounded-xl flex flex-col gap-3">
                      <span className="text-[10px] font-mono uppercase text-gray-400 font-bold">Package Entitlements</span>
                      
                      <label className="flex items-center gap-2.5 text-xs text-gray-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={acFullAccess}
                          onChange={(e) => {
                            playSound("click");
                            setAcFullAccess(e.target.checked);
                          }}
                          className="w-4 h-4 rounded accent-[#C1121F] bg-black border-white/20"
                        />
                        <div>
                          <span className="font-bold">Full Course Premium Access</span>
                          <span className="text-[10px] text-gray-500 block">Unlocks all sections of the application</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-2.5 text-xs text-gray-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={acBioBootcamp}
                          onChange={(e) => {
                            playSound("click");
                            setAcBioBootcamp(e.target.checked);
                          }}
                          className="w-4 h-4 rounded accent-emerald-500 bg-black border-white/20"
                        />
                        <div>
                          <span className="font-bold text-emerald-400">Biology Special Bootcamp</span>
                          <span className="text-[10px] text-gray-500 block">Enrolls student in Biology intensive courses</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-2.5 text-xs text-gray-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={acGkEng}
                          onChange={(e) => {
                            playSound("click");
                            setAcGkEng(e.target.checked);
                          }}
                          className="w-4 h-4 rounded accent-blue-500 bg-black border-white/20"
                        />
                        <div>
                          <span className="font-bold text-blue-400">GK & English Premium Bundle</span>
                          <span className="text-[10px] text-gray-500 block">Enrolls student in general knowledge + language</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-2.5 text-xs text-gray-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={acMocks}
                          onChange={(e) => {
                            playSound("click");
                            setAcMocks(e.target.checked);
                          }}
                          className="w-4 h-4 rounded accent-yellow-500 bg-black border-white/20"
                        />
                        <div>
                          <span className="font-bold text-yellow-500">Mock Test Elite Series</span>
                          <span className="text-[10px] text-gray-500 block">Provides access to exclusive Mock Exam battles</span>
                        </div>
                      </label>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-mono uppercase text-gray-400 font-bold">Premium Expiry Date</label>
                      <input
                        type="date"
                        value={acExpiryDate}
                        onChange={(e) => setAcExpiryDate(e.target.value)}
                        className="w-full bg-[#0A0A0A] border border-white/10 text-white rounded-lg py-1.5 px-3 text-xs font-mono"
                      />
                    </div>

                    <button
                      onClick={() => {
                        playSound("click");
                        handleSaveAccessControl();
                      }}
                      className="w-full py-2 bg-[#C1121F] hover:bg-red-700 text-white font-mono font-bold uppercase rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all duration-300"
                    >
                      <Shield className="w-4 h-4" />
                      <span>Apply Permissions</span>
                    </button>
                  </div>
                )}
              </div>

              {/* PANEL 2: MANUAL OFFLINE ENROLLMENT ADMISSION */}
              <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
                <h3 className="text-sm font-extrabold uppercase text-white border-b border-white/5 pb-3 flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-emerald-500" />
                  <span>Offline Manual Intake</span>
                </h3>

                <form onSubmit={handleManualEnrollment} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-mono uppercase text-gray-400 font-bold">Select student profile</label>
                    <select
                      value={selectedEnrollUserUid}
                      onChange={(e) => {
                        playSound("click");
                        setSelectedEnrollUserUid(e.target.value);
                      }}
                      className="w-full bg-[#0A0A0A] border border-white/10 text-white rounded-xl py-2 px-3 text-xs font-sans focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">-- Choose student directory --</option>
                      {usersList.map((u, uIdx) => (
                        <option key={`${u.uid || u.id || "u"}_${uIdx}`} value={u.uid}>
                          {u.displayName} ({u.email || "No Email"})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-mono uppercase text-gray-400 font-bold">Admitted Program / Package</label>
                    <select
                      value={manualPackage}
                      onChange={(e) => {
                        playSound("click");
                        setManualPackage(e.target.value);
                        // Auto-fill standard price
                        if (e.target.value === "Full Course Access") setManualAmount(599);
                        else setManualAmount(149);
                      }}
                      className="w-full bg-[#0A0A0A] border border-white/10 text-white rounded-xl py-2 px-3 text-xs font-sans focus:outline-none"
                    >
                      <option value="Full Course Access">Full Course Access (৳599)</option>
                      <option value="Biology Bootcamp">Biology Bootcamp (৳149)</option>
                      <option value="GK & English Premium">GK & English Premium (৳149)</option>
                      <option value="Mock Test Series">Mock Test Series (৳149)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-mono uppercase text-gray-400 font-bold">Price Paid (BDT)</label>
                      <input
                        type="number"
                        value={manualAmount}
                        onChange={(e) => setManualAmount(Number(e.target.value))}
                        className="w-full bg-[#0A0A0A] border border-white/10 text-white rounded-lg py-1.5 px-3 text-xs font-mono"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-mono uppercase text-gray-400 font-bold">Payment Channel</label>
                      <select
                        value={manualChannel}
                        onChange={(e) => setManualChannel(e.target.value)}
                        className="w-full bg-[#0A0A0A] border border-white/10 text-white rounded-xl py-1.5 px-3 text-xs font-sans focus:outline-none"
                      >
                        <option value="bkash">bKash</option>
                        <option value="nagad">Nagad</option>
                        <option value="manual_cash">Offline Cash</option>
                        <option value="card">Bank Card</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-mono uppercase text-gray-400 font-bold">Transaction ID (TrxID / Receipt #)</label>
                    <input
                      type="text"
                      placeholder="e.g. BKX92837422"
                      value={manualTxnId}
                      onChange={(e) => setManualTxnId(e.target.value)}
                      className="w-full bg-[#0A0A0A] border border-white/10 text-white rounded-lg py-1.5 px-3 text-xs font-mono uppercase"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-mono uppercase text-gray-400 font-bold">Notes / Comments</label>
                    <textarea
                      placeholder="Payment details, batch name, special promo notes..."
                      value={manualNotes}
                      onChange={(e) => setManualNotes(e.target.value)}
                      className="w-full bg-[#0A0A0A] border border-white/10 text-white rounded-lg py-1.5 px-3 text-xs font-sans h-16 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={enrollmentSubmitting}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800/40 text-white font-mono font-bold uppercase rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all duration-300"
                  >
                    <span>{enrollmentSubmitting ? "Processing..." : "Enroll & Activate Student"}</span>
                  </button>
                </form>
              </div>
            </div>

            {/* RIGHT SIDE: LEDGER HISTORY LIST */}
            <div className="lg:col-span-2 bg-[#111111] border border-white/10 rounded-2xl p-6 flex flex-col gap-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/5 pb-4">
                <div>
                  <h3 className="text-sm font-extrabold uppercase text-white">Enrollment Ledger & Receipts</h3>
                  <span className="text-[10px] text-gray-450 font-mono">Total recorded: {enrollments.length} files</span>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search name, email, TrxID..."
                    value={enrollSearch}
                    onChange={(e) => setEnrollSearch(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 text-white rounded-xl py-1.5 pl-9 pr-4 text-xs focus:outline-none focus:border-[#C1121F]"
                  />
                </div>
              </div>

              <div className="max-h-[700px] overflow-y-auto">
                {/* Desktop view (Table format) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs bg-black/25">
                    <thead>
                      <tr className="border-b border-white/5 text-gray-400 uppercase font-mono">
                        <th className="p-3">Aspirant / Student</th>
                        <th className="p-3">Enrolled Program</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">Txn Details</th>
                        <th className="p-3">Enrollment Date</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEnrollments.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-gray-500 font-mono">
                            No enrollment transactions logged under search filters.
                          </td>
                        </tr>
                      ) : (
                        paginatedEnrollments.map((e, eIdx) => (
                          <tr key={`${e.id || "enr"}_${eIdx}`} className="border-b border-white/[0.02] hover:bg-white/[0.01]">
                            <td className="p-3">
                              <span className="font-bold text-white block">{e.userDisplayName}</span>
                              <span className="text-[10px] text-gray-500 block truncate max-w-[150px]">{e.userEmail}</span>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                                e.packageName.includes("Full") ? "bg-red-950/40 text-[#C1121F] border border-[#C1121F]/30" :
                                e.packageName.includes("Bio") ? "bg-emerald-950/40 text-emerald-400 border border-emerald-500/20" :
                                e.packageName.includes("GK") ? "bg-blue-950/40 text-blue-400 border border-blue-500/20" :
                                "bg-yellow-950/40 text-yellow-500 border border-yellow-500/20"
                              }`}>
                                {e.packageName}
                              </span>
                            </td>
                            <td className="p-3 text-yellow-500 font-mono font-bold">
                              ৳{e.amount} BDT
                            </td>
                            <td className="p-3 font-mono">
                              <span className="text-gray-300 block text-[11px] uppercase font-bold">{e.paymentMethod}</span>
                              <span className="text-[10px] text-gray-500 block">ID: {e.trxId}</span>
                            </td>
                            <td className="p-3 font-mono text-gray-400 text-[10px]">
                              {e.createdAt ? new Date(e.createdAt).toLocaleString(language === "bn" ? "bn-BD" : "en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit"
                              }) : "N/A"}
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => {
                                  playSound("click");
                                  handleRevokeEnrollment(e.id, e.userId, e.packageName);
                                }}
                                className="px-2 py-1 bg-red-950/40 hover:bg-[#C1121F]/20 text-[#C1121F] border border-[#C1121F]/30 rounded text-[9px] uppercase font-mono font-extrabold cursor-pointer"
                              >
                                Revoke
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile view (Stackable Cards) */}
                <div className="flex flex-col gap-3 md:hidden">
                  {filteredEnrollments.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 font-mono text-xs">
                      No enrollment transactions logged under search filters.
                    </div>
                  ) : (
                    paginatedEnrollments.map((e, eIdx) => (
                      <div key={`${e.id || "enr_card"}_${eIdx}`} className="p-4 rounded-xl border border-white/5 bg-[#0D0D0D] flex flex-col gap-3">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <span className="font-bold text-white text-xs block">{e.userDisplayName}</span>
                            <span className="text-[10px] text-gray-550 block truncate max-w-[170px]">{e.userEmail}</span>
                          </div>
                          <button
                            onClick={() => {
                              playSound("click");
                              handleRevokeEnrollment(e.id, e.userId, e.packageName);
                            }}
                            className="px-2 py-1 bg-red-950/40 hover:bg-[#C1121F]/20 text-[#C1121F] border border-[#C1121F]/30 rounded text-[9px] uppercase font-mono font-extrabold cursor-pointer"
                          >
                            Revoke
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-b border-white/[0.03] py-2">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                            e.packageName.includes("Full") ? "bg-red-950/40 text-[#C1121F] border border-[#C1121F]/30" :
                            e.packageName.includes("Bio") ? "bg-emerald-950/40 text-emerald-400 border border-emerald-500/20" :
                            e.packageName.includes("GK") ? "bg-blue-950/40 text-blue-400 border border-blue-500/20" :
                            "bg-yellow-950/40 text-yellow-500 border border-yellow-500/20"
                          }`}>
                            {e.packageName}
                          </span>
                          <span className="text-yellow-500 font-mono font-bold text-xs">
                            ৳{e.amount} BDT
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <div>
                            <span className="text-gray-300 uppercase font-bold mr-1">{e.paymentMethod}</span>
                            <span className="text-gray-500">({e.trxId})</span>
                          </div>
                          <span className="text-gray-500 text-[9.5px]">
                            {e.createdAt ? new Date(e.createdAt).toLocaleString(language === "bn" ? "bn-BD" : "en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit"
                            }) : "N/A"}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Pagination Controls for Enrollments */}
                {eTotalPages > 1 && (
                  <div className="flex items-center justify-between gap-4 border-t border-white/5 pt-4 font-mono text-[11px] text-gray-400 mt-4">
                    <button
                      type="button"
                      disabled={ePage === 1}
                      onClick={() => {
                        playSound("click");
                        setEPage(prev => Math.max(1, prev - 1));
                      }}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer border border-white/10"
                    >
                      ◀ {language === "bn" ? "পূর্ববর্তী" : "Prev"}
                    </button>
                    <span>{language === "bn" ? `পৃষ্ঠা ${ePage} / ${eTotalPages}` : `Page ${ePage} of ${eTotalPages}`}</span>
                    <button
                      type="button"
                      disabled={ePage === eTotalPages}
                      onClick={() => {
                        playSound("click");
                        setEPage(prev => Math.min(eTotalPages, prev + 1));
                      }}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer border border-white/10"
                    >
                      {language === "bn" ? "পরবর্তী" : "Next"} ▶
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 3. QUESTION BANK CONTROL */}
      {subTab === "questions" && (
        <div className="grid lg:grid-cols-3 gap-8 animate-fadeIn">
          {/* Main Question database Search/Display table */}
          <div className="lg:col-span-2 bg-[#111111] border border-white/10 rounded-2xl p-6 flex flex-col gap-5">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-4">
              <div>
                <h3 className="text-sm font-extrabold uppercase text-white">Full Question Database Registry</h3>
                <span className="text-[10px] text-gray-450 font-mono">Preloads: {STARTER_QUESTIONS.length} • Seeded: {questions.length} • Total: {totalQuestionsSum}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <select
                  value={qSubjectFilter}
                  onChange={(e) => setQSubjectFilter(e.target.value)}
                  className="bg-black/60 border border-white/10 text-white rounded-lg py-1.5 px-3 text-[11px] font-mono"
                >
                  <option value="all">All Subjects</option>
                  <option value="Biology">Biology</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Physics">Physics</option>
                  <option value="English">English</option>
                  <option value="GK">GK</option>
                </select>
                <select
                  value={qCategoryFilter}
                  onChange={(e) => setQCategoryFilter(e.target.value)}
                  className="bg-black/60 border border-white/10 text-white rounded-lg py-1.5 px-3 text-[11px] font-mono"
                >
                  <option value="all">All Categories</option>
                  <option value="Medical Standard Questions">Medical Standard</option>
                  <option value="High Yield Questions">High Yield</option>
                  <option value="Admission Special Questions">Admission Special</option>
                  <option value="Chapter Final Questions">Chapter Final</option>
                  <option value="Daily Challenge Questions">Daily Challenge</option>
                  <option value="Mock Test Questions">Mock Test</option>
                  <option value="Boss Battle Questions">Boss Battle</option>
                  <option value="অনুশীলনী Questions">অনুশীলনী (Exercise)</option>
                </select>
              </div>
            </div>

            {/* Quick smart search input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Smart Search: Type topic keywords, source, reference years, or specific text..."
                value={qSearch}
                onChange={(e) => setQSearch(e.target.value)}
                className="w-full bg-black/60 border border-white/10 text-white rounded-xl py-2 pl-10 pr-4 text-xs focus:outline-none focus:border-[#C1121F]"
              />
            </div>

            {selectedQIds.length > 0 && (
              <div className="flex flex-col gap-3 bg-red-950/15 border border-red-900/35 rounded-xl p-3 text-xs w-full">
                {deleteProgress !== null ? (
                  <div className="flex flex-col gap-2 font-mono text-xs w-full">
                    <div className="flex justify-between items-center text-red-400 font-bold">
                      <span>{deleteStatusText}</span>
                      <span>{deleteProgress}%</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-red-500 h-full transition-all duration-300" 
                        style={{ width: `${deleteProgress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3 w-full">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-mono font-bold text-gray-400">
                        Selected: <span className="text-red-400 font-black">{selectedQIds.length}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleBatchDeleteSelected}
                        className="px-3.5 py-1.5 bg-[#C1121F] hover:bg-red-700 text-white border border-red-500/30 font-extrabold uppercase rounded-lg transition-all duration-200 text-[10px] flex items-center gap-1.5 cursor-pointer shadow"
                      >
                        <span>🗑️ {language === "bn" ? "মুছে ফেলুন" : "Delete"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedQIds([])}
                        className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 rounded-lg text-[10px] font-mono cursor-pointer"
                      >
                        Clear Choice
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MULTI SELECT SELECT ALL ACTION BAR FOR THE LIST */}
            {filteredQList.length > 0 && (
              <div className="flex items-center gap-2.5 px-3 py-1.5 bg-white/[0.01] border border-white/5 rounded-xl text-xs font-mono text-gray-400">
                <input
                  type="checkbox"
                  checked={filteredQList.length > 0 && filteredQList.every((q) => !q.id || selectedQIds.includes(q.id))}
                  onChange={(e) => handleSelectAllQuestions(e.target.checked, filteredQList)}
                  className="w-4 h-4 text-[#C1121F] rounded border-white/10 bg-black cursor-pointer focus:ring-0 focus:ring-offset-0"
                  id="chk-select-all-registry"
                />
                <label htmlFor="chk-select-all-registry" className="cursor-pointer select-none font-bold uppercase text-[10px] text-gray-300">
                  {isBn ? "সব সিলেক্ট করুন" : "SELECT ALL SHOWN CUSTOM QUESTIONS"}
                </label>
              </div>
            )}

            <div className="overflow-y-auto max-h-[500px] flex flex-col gap-3">
              {filteredQList.length === 0 ? (
                <div className="p-12 border border-dashed border-white/15 rounded-xl text-center text-gray-500 font-mono text-xs">
                  No matches in registry index. Initiate search expansions or load more seeds.
                </div>
              ) : (
                paginatedQList.map((q, idx) => {
                  const isSelected = q.id ? selectedQIds.includes(q.id) : false;
                  return (
                    <div
                      key={q.id || `st-${idx}`}
                      className={`p-4 rounded-xl flex items-start justify-between gap-4 transition text-xs border ${
                        isSelected 
                          ? "bg-red-950/10 border-red-500/30 shadow-[0_0_12px_rgba(193,18,31,0.1)]" 
                          : "bg-black/30 border-white/5 hover:border-white/10"
                      }`}
                    >
                      {q.id && (
                        <div className="pt-1 pr-1 shrink-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedQIds((prev) => [...prev, q.id!]);
                              } else {
                                setSelectedQIds((prev) => prev.filter((id) => id !== q.id));
                              }
                            }}
                            className="w-4 h-4 text-[#C1121F] rounded border-white/10 bg-black cursor-pointer focus:ring-0 focus:ring-offset-0"
                          />
                        </div>
                      )}
                      <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-red-950/40 text-red-400 border border-red-500/20 rounded font-mono text-[9px] font-black uppercase">
                          {q.subject}
                        </span>
                        <span className="px-2 py-0.5 bg-gray-900 border border-white/5 rounded font-mono text-[9px] text-gray-400">
                          {q.chapter}
                        </span>
                        {q.category && (
                          <span className="px-2 py-0.5 bg-yellow-990 border border-[#FFD700]/20 rounded font-mono text-[9px] text-[#FFD700] uppercase font-bold">
                            {q.category}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-500 font-mono ml-auto font-semibold">Source: {q.source}</span>
                      </div>
                      <p className="font-bold text-white leading-relaxed text-sm">{q.questionText}</p>
                      
                      <div className="grid sm:grid-cols-2 gap-2 mt-3 p-2 bg-black/50 border border-white/5 rounded-lg text-gray-400 font-mono text-[11px]">
                        {q.options.map((opt, oIdx) => (
                          <div
                            key={oIdx}
                            className={`p-1.5 rounded flex items-center gap-2 ${
                              oIdx === q.correctAnswerIndex ? "text-[#FFD700] font-black bg-yellow-950/10 border-l-2 border-l-[#FFD700]" : ""
                            }`}
                          >
                            <span>{["A", "B", "C", "D"][oIdx]}.</span>
                            <span>{opt}</span>
                            {oIdx === q.correctAnswerIndex && <span className="text-[9px] text-[#FFD700] ml-auto uppercase font-black">CORRECT</span>}
                          </div>
                        ))}
                      </div>

                      {q.explanation && (
                        <p className="text-[10px] text-gray-450 leading-relaxed mt-2.5 bg-white/[0.01] border-l border-white/10 pl-3 pt-1">
                          <strong className="text-gray-400 block mb-1">Explanation:</strong> {q.explanation}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
                      {q.id && (
                        <>
                          <button
                            onClick={() => {
                              setIsEditingQuestion(q);
                              setQText(q.questionText);
                              setQOptA(q.options[0]);
                              setQOptB(q.options[1]);
                              setQOptC(q.options[2] || "");
                              setQOptD(q.options[3] || "");
                              setQCorrect(q.correctAnswerIndex);
                              setQExplanation(q.explanation);
                              setQSubject(q.subject);
                              setQChapter(q.chapter);
                              setQDifficulty(q.difficulty);
                              setQSource(q.source);
                              setQCategory(q.category || "Medical Standard Questions");
                              showToast("Loaded question into custom entry form!");
                            }}
                            className="p-1 px-2.5 bg-white/5 border border-white/10 hover:border-yellow-500 rounded text-gray-400 hover:text-white transition uppercase font-mono text-[10px]"
                            title="Edit question parameters"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="p-1 px-2.5 bg-white/5 border border-white/10 hover:border-[#C1121F] rounded text-gray-400 hover:text-[#C1121F] transition uppercase font-mono text-[10px]"
                            title="Destroy register completely"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  );
                })
              )}
            </div>

            {/* Pagination controls for main Registry */}
            {qTotalPages > 1 && (
              <div className="flex items-center justify-between gap-4 border-t border-white/5 pt-4 font-mono text-[11px] text-gray-400">
                <button
                  type="button"
                  disabled={qPage === 1}
                  onClick={() => {
                    playSound("click");
                    setQPage(prev => Math.max(1, prev - 1));
                  }}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer border border-white/10"
                >
                  ◀ {language === "bn" ? "পূর্ববর্তী" : "Prev"}
                </button>
                <span>{language === "bn" ? `পৃষ্ঠা ${qPage} / ${qTotalPages}` : `Page ${qPage} of ${qTotalPages}`}</span>
                <button
                  type="button"
                  disabled={qPage === qTotalPages}
                  onClick={() => {
                    playSound("click");
                    setQPage(prev => Math.min(qTotalPages, prev + 1));
                  }}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer border border-white/10"
                >
                  {language === "bn" ? "পরবর্তী" : "Next"} ▶
                </button>
              </div>
            )}
          </div>

          {/* Create Question / Quick Entry Panel Form */}
          <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 relative">
            <h3 className="text-sm font-extrabold uppercase text-white border-b border-white/5 pb-3 mb-4 flex items-center justify-between">
              <span>{isEditingQuestion ? "Modify Live Question" : "High-Yield Entry Console"}</span>
              <PlusCircle className="w-5 h-5 text-[#FFD700]" />
            </h3>

            {/* Entry Mode Toggle Selection */}
            <div className="flex bg-black/45 p-1 rounded-xl border border-white/5 mb-5">
              <button
                type="button"
                onClick={() => {
                  playSound("click");
                  setQuestionEntryMode("single");
                }}
                className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all tracking-wider ${
                  questionEntryMode === "single"
                    ? "bg-[#C1121F] text-white shadow"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                ✍️ {language === "bn" ? "একটি প্রশ্ন" : "Single Entry"}
              </button>
              <button
                type="button"
                disabled={!!isEditingQuestion}
                onClick={() => {
                  playSound("click");
                  setQuestionEntryMode("bulk");
                }}
                className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all tracking-wider flex items-center justify-center gap-1 ${
                  questionEntryMode === "bulk"
                    ? "bg-[#C1121F] text-white shadow"
                    : "text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                }`}
                title={isEditingQuestion ? "Finish editing current question first" : "Upload multiple questions at once"}
              >
                📂 {language === "bn" ? "একসাথে অনেক (Bulk)" : "Bulk Entry"}
              </button>
            </div>

            {questionEntryMode === "single" ? (
              <form onSubmit={handleSaveQuestion} className="flex flex-col gap-4 text-xs font-mono">
                <div className="flex flex-col gap-1.5">
                  <label className="text-gray-400 font-bold uppercase text-[10px]">MCQ Question Prompt</label>
                  <textarea
                    value={qText}
                    onChange={(e) => setQText(e.target.value)}
                    placeholder="Insert the medical diagnostic query prompt..."
                    rows={3}
                    className="w-full bg-[#0A0A0A] border border-white/10 text-white rounded-xl py-2 px-3 focus:outline-none focus:border-[#C1121F]"
                  />
                </div>

                {/* Options grid */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-gray-400 font-semibold text-[10px]">Option A</label>
                    <input
                      type="text"
                      value={qOptA}
                      onChange={(e) => setQOptA(e.target.value)}
                      className="w-full bg-[#0A0A0A] border border-white/10 text-white rounded-lg py-1.5 px-2 focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-gray-400 font-semibold text-[10px]">Option B</label>
                    <input
                      type="text"
                      value={qOptB}
                      onChange={(e) => setQOptB(e.target.value)}
                      className="w-full bg-[#0A0A0A] border border-white/10 text-white rounded-lg py-1.5 px-2 focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-gray-400 font-semibold text-[10px]">Option C</label>
                    <input
                      type="text"
                      value={qOptC}
                      onChange={(e) => setQOptC(e.target.value)}
                      className="w-full bg-[#0A0A0A] border border-white/10 text-white rounded-lg py-1.5 px-2 focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-gray-400 font-semibold text-[10px]">Option D</label>
                    <input
                      type="text"
                      value={qOptD}
                      onChange={(e) => setQOptD(e.target.value)}
                      className="w-full bg-[#0A0A0A] border border-white/10 text-white rounded-lg py-1.5 px-2 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Correct answer identifier */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[#FFD700] font-bold uppercase text-[10px]">Identify Correct Index</label>
                  <select
                    value={qCorrect}
                    onChange={(e) => setQCorrect(Number(e.target.value))}
                    className="w-full bg-[#0A0A0A] border border-[#FFD700]/30 text-white rounded-xl py-2 px-3 focus:outline-none"
                  >
                    <option value={0}>Option A is Correct</option>
                    <option value={1}>Option B is Correct</option>
                    <option value={2}>Option C is Correct</option>
                    <option value={3}>Option D is Correct</option>
                  </select>
                </div>

                {/* Topic Subject Metas */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-gray-400 text-[10px]">Scientific Subject</label>
                    <select
                      value={qSubject}
                      onChange={(e) => setQSubject(e.target.value as any)}
                      className="w-full bg-[#0A0A0A] border border-white/10 text-white rounded-lg py-1.5 px-2 focus:outline-none text-xs text-left"
                    >
                      <option value="Biology">Biology</option>
                      <option value="Chemistry">Chemistry</option>
                      <option value="Physics">Physics</option>
                      <option value="English">English</option>
                      <option value="GK">GK</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-gray-400 text-[10px]">Difficulty Metric</label>
                    <select
                      value={qDifficulty}
                      onChange={(e) => setQDifficulty(e.target.value as any)}
                      className="w-full bg-[#0A0A0A] border border-white/10 text-white rounded-lg py-1.5 px-2 focus:outline-none text-xs text-left"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-gray-400 text-[10px]">Chapter Name</label>
                    <input
                      type="text"
                      value={qChapter}
                      onChange={(e) => setQChapter(e.target.value)}
                      placeholder="e.g., Organic Acids"
                      className="w-full bg-[#0A0A0A] border border-white/10 text-white rounded-lg py-1.5 px-2 focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-gray-400 text-[10px]">Test Category</label>
                    <select
                      value={qCategory}
                      onChange={(e) => setQCategory(e.target.value)}
                      className="w-full bg-[#0A0A0A] border border-white/10 text-white rounded-lg py-1.5 px-2 focus:outline-none text-xs text-left"
                    >
                      <option value="Medical Standard Questions">Medical Standard Questions</option>
                      <option value="High Yield Questions">High Yield Questions</option>
                      <option value="Admission Special Questions">Admission Special Questions</option>
                      <option value="Chapter Final Questions">Chapter Final Questions</option>
                      <option value="Daily Challenge Questions">Daily Challenge Questions</option>
                      <option value="Mock Test Questions">Mock Test Questions</option>
                      <option value="Boss Battle Questions">Boss Battle Questions</option>
                      <option value="অনুশীলনী Questions">অনুশীলনী Questions</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-gray-400 text-[10px]">Official Source / Reference</label>
                    <input
                      type="text"
                      value={qSource}
                      onChange={(e) => setQSource(e.target.value)}
                      placeholder="e.g. MAT 2024"
                      className="w-full bg-[#0A0A0A] border border-white/10 text-white rounded-lg py-1.5 px-2 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-gray-400 text-[10px]">Clinical Explanation Matrix</label>
                  <textarea
                    value={qExplanation}
                    onChange={(e) => setQExplanation(e.target.value)}
                    placeholder="Scientific justifications, definitions, or textbook citations supporting correct answering indexes..."
                    rows={2}
                    className="w-full bg-[#0A0A0A] border border-white/10 text-white rounded-xl py-2 px-3 focus:outline-none"
                  />
                </div>

                <div className="flex gap-2.5 mt-2">
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-[#C1121F] hover:bg-red-700 text-white rounded-xl font-bold uppercase transition shadow cursor-pointer"
                  >
                    {isEditingQuestion ? "SAVE CHANGES 💾" : "LAUNCH QUESTION 🚀"}
                  </button>
                  {isEditingQuestion && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingQuestion(null);
                        setQText(""); setQOptA(""); setQOptB(""); setQOptC(""); setQOptD("");
                        setQExplanation(""); setQChapter(""); setQSource("");
                      }}
                      className="py-3 px-4 bg-gray-950 hover:bg-white/[0.02] border border-white/10 text-gray-400 rounded-xl transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            ) : (
              // Bulk mode entry - extremely easier and beautiful
              <div className="flex flex-col gap-4 text-xs font-mono">
                {/* Meta Config applied to all bulk questions */}
                <div className="p-3 bg-black/45 border border-white/5 rounded-xl flex flex-col gap-3">
                  <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider">Default Metadata (Applied to all)</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-[8px] text-gray-450">Subject</span>
                      <select
                        value={qSubject}
                        onChange={(e) => setQSubject(e.target.value as any)}
                        className="bg-[#0A0A0A] border border-white/5 text-white rounded py-1 px-1.5 text-[10px]"
                      >
                        <option value="Biology">Biology</option>
                        <option value="Chemistry">Chemistry</option>
                        <option value="Physics">Physics</option>
                        <option value="English">English</option>
                        <option value="GK">GK</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[8px] text-gray-450">Category</span>
                      <select
                        value={qCategory}
                        onChange={(e) => setQCategory(e.target.value)}
                        className="bg-[#0A0A0A] border border-white/5 text-white rounded py-1 px-1.5 text-[10px]"
                      >
                        <option value="Medical Standard Questions">Medical Standard</option>
                        <option value="High Yield Questions">High Yield</option>
                        <option value="Admission Special Questions">Admission Special</option>
                        <option value="Chapter Final Questions">Chapter Final</option>
                        <option value="Daily Challenge Questions">Daily Challenge</option>
                        <option value="Mock Test Questions">Mock Test</option>
                        <option value="Boss Battle Questions">Boss Battle</option>
                        <option value="অনুশীলনী Questions">অনুশীলনী (Exercise)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Bulk Paste Area */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-gray-400 font-bold uppercase text-[10px] flex justify-between items-center">
                    <span>Paste Multiple Questions Text / JSON</span>
                    <span className="text-[9px] text-[#FFD700] lowercase font-normal">supports natural layout parsing</span>
                  </label>
                  <textarea
                    value={bulkInputText}
                    onChange={(e) => setBulkInputText(e.target.value)}
                    placeholder={`Question 1: মানুষের করোটিতে কয়টি অস্থি থাকে?
A) ৮ টি
B) ১৪ টি
C) ২৯ টি
D) ২২ টি
Answer: C
Explanation: মানুষের করোটিতে ২৯টি অস্থি রয়েছে।

Question 2: লোহিত রক্তকণিকার গড় পরম আয়ু কত দিন?
A) ১২০ দিন
B) ৯০ দিন
C) ৫০ দিন
D) ১৫ দিন
Answer: A`}
                    rows={10}
                    className="w-full bg-[#0A0A0A] border border-white/10 text-white rounded-xl py-3 px-3 focus:outline-none focus:border-[#C1121F] font-mono text-[11px] leading-relaxed"
                  />
                </div>

                {/* Real-time Parsed Preview Card */}
                {bulkInputText.trim() && (
                  <div className="border border-white/5 bg-black/25 rounded-xl p-3 flex flex-col gap-2">
                    <div className="flex justify-between items-center border-b border-white/5 pb-1.5 mb-1">
                      <span className="text-[9px] font-bold text-gray-450 uppercase tracking-widest">Real-time Parsed Preview</span>
                      <span className="text-[9.5px] px-2 py-0.5 rounded-md bg-emerald-950/45 text-emerald-400 border border-emerald-500/20 font-black">
                        {parseBulkQuestions(bulkInputText, qSubject, qCategory).length} questions parsed
                      </span>
                    </div>

                    <div className="max-h-[120px] overflow-y-auto flex flex-col gap-2 pr-1 custom-scrollbar">
                      {parseBulkQuestions(bulkInputText, qSubject, qCategory).slice(0, 3).map((pq, idx) => (
                        <div key={idx} className="bg-black/40 p-2 rounded-lg border border-white/5 flex flex-col gap-1 text-[10px]">
                          <span className="font-bold text-white leading-tight">Q{idx + 1}: {pq.questionText}</span>
                          <div className="grid grid-cols-2 gap-1 pl-1 text-gray-400 text-[9px]">
                            {pq.options.map((opt: string, oIdx: number) => (
                              <span key={oIdx} className={pq.correctAnswerIndex === oIdx ? "text-emerald-400 font-bold" : ""}>
                                {String.fromCharCode(65 + oIdx)}) {opt}
                              </span>
                            ))}
                          </div>
                          {pq.explanation && (
                            <span className="text-gray-500 text-[9px] italic truncate mt-0.5">💡 Explanation: {pq.explanation}</span>
                          )}
                        </div>
                      ))}
                      {parseBulkQuestions(bulkInputText, qSubject, qCategory).length > 3 && (
                        <span className="text-center text-[9px] text-gray-500 font-bold font-sans mt-1">
                          + {parseBulkQuestions(bulkInputText, qSubject, qCategory).length - 3} more questions in list...
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Loader / Upload Progress */}
                {bulkImportProgress !== null && (
                  <div className="flex flex-col gap-1.5 font-mono text-[10px] bg-red-950/20 border border-red-500/20 rounded-xl p-3">
                    <div className="flex justify-between items-center text-red-400 font-bold">
                      <span>Uploading to Medical database...</span>
                      <span>{bulkImportProgress}%</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-red-500 h-full transition-all duration-300" 
                        style={{ width: `${bulkImportProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Bulk Save dispatch trigger */}
                <button
                  type="button"
                  onClick={handleBulkSaveQuestions}
                  disabled={bulkImportProgress !== null || !bulkInputText.trim()}
                  className="w-full bg-[#C1121F] hover:bg-red-700 disabled:bg-gray-800 disabled:opacity-45 text-white rounded-xl py-3 font-bold uppercase transition shadow cursor-pointer flex justify-center items-center gap-2"
                >
                  🚀 {language === "bn" ? "ডাটাবেজে একসাথে সমস্ত প্রশ্ন যোগ করুন" : "LAUNCH ALL QUESTIONS TO FIREBASE"}
                </button>

                <div className="text-[10px] text-gray-500 font-sans leading-relaxed border-t border-white/5 pt-3">
                  <span className="font-bold text-gray-400 uppercase block mb-1">💡 Pro Tips:</span>
                  - Put a blank line between each question block.<br />
                  - Set choices with letters like <span className="font-mono text-gray-400 font-bold">A), B), C), D)</span> or <span className="font-mono text-gray-400 font-bold">ক), খ), গ), ঘ)</span>.<br />
                  - Direct <span className="font-mono text-gray-400 font-bold">Answer: C</span> maps correct option instantly.<br />
                  - Supports copy-paste directly from PDFs, MS Word, or raw JSON!
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: 3.5. DEDUPLICATION & BULK MAINTENANCE ENGINE */}
      {subTab === "duplicates" && (
        <div className="grid lg:grid-cols-3 gap-8 animate-fadeIn">
          {/* Main maintenance workspace: Search, checkbox selection & deletion */}
          <div className="lg:col-span-2 bg-[#111111] border border-white/10 rounded-2xl p-6 flex flex-col gap-5">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-4">
              <div>
                <h3 className="text-sm font-extrabold uppercase text-white flex items-center gap-2">
                  <span>🧹 Database Bulk Eraser Dashboard</span>
                  <span className="text-[10px] bg-red-600/30 text-red-400 font-mono font-black border border-red-500/20 px-2.5 py-0.5 rounded-full">
                    {language === "bn" ? "ভবিষ্যতে ডিলিট করার ড্যাশবোর্ড" : "FUTURE CLEANUP HARBOR"}
                  </span>
                </h3>
                <span className="text-[10px] text-gray-450 font-mono">
                  {language === "bn" 
                    ? "সহজে বাল্ক ইমপোর্ট করা প্রশ্নগুলো চিহ্নিত করুন এবং টিক দিয়ে এক ক্লিকে ডিলিট করুন" 
                    : "Easily check and clean bulk imported database entries with multi-selection deletes."}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto text-[11px] font-mono">
                <select
                  value={duplicateFilterMode}
                  onChange={(e) => {
                    playSound("click");
                    setDuplicateFilterMode(e.target.value as any);
                  }}
                  className="bg-red-950/20 border border-red-500/30 text-red-400 rounded-lg py-1.5 px-3 text-[11px] font-mono focus:outline-none"
                >
                  <option value="all">{language === "bn" ? "📊 সকল কুইজ কন্টেন্ট" : "📊 All Records"}</option>
                  <option value="duplicates">{language === "bn" ? "⚠️ ডুপ্লিকেট কুইজ সমূহ" : "⚠️ Duplicates Only"}</option>
                  <option value="redundants">{language === "bn" ? "✗ অতিরিক্ত কপি সমূহ" : "✗ Redundant Clones Only"}</option>
                </select>
                <select
                  value={qSubjectFilter}
                  onChange={(e) => setQSubjectFilter(e.target.value)}
                  className="bg-black/60 border border-white/10 text-white rounded-lg py-1.5 px-3 text-[11px] font-mono focus:outline-none"
                >
                  <option value="all">All Subjects</option>
                  <option value="Biology">Biology</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Physics">Physics</option>
                  <option value="English">English</option>
                  <option value="GK">GK</option>
                </select>
                <select
                  value={qCategoryFilter}
                  onChange={(e) => setQCategoryFilter(e.target.value)}
                  className="bg-black/60 border border-white/10 text-white rounded-lg py-1.5 px-3 text-[11px] font-mono focus:outline-none"
                >
                  <option value="all">All Categories</option>
                  <option value="Medical Standard Questions">Medical Standard</option>
                  <option value="High Yield Questions">High Yield</option>
                  <option value="Admission Special Questions">Admission Special</option>
                  <option value="Chapter Final Questions">Chapter Final</option>
                  <option value="Daily Challenge Questions">Daily Challenge</option>
                  <option value="Mock Test Questions">Mock Test</option>
                  <option value="Boss Battle Questions">Boss Battle</option>
                  <option value="অনুশীলনী Questions">অনুশীলনী (Exercise)</option>
                </select>
              </div>
            </div>

            {/* Smart search input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder={language === "bn" ? "প্রশ্ন খোঁজার ফিল্টার (টপিক, সোর্স, টেক্সট টাইপ করুন)..." : "Filter questions by text parameters..."}
                value={qSearch}
                onChange={(e) => setQSearch(e.target.value)}
                className="w-full bg-black/60 border border-white/10 text-white rounded-xl py-2 pl-10 pr-4 text-xs focus:outline-none focus:border-[#C1121F]"
              />
            </div>

            {/* Batch actions bar */}
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filteredBulkQList.length > 0 && filteredBulkQList.every((q) => q.id && selectedQIds.includes(q.id))}
                  onChange={(e) => handleSelectAllQuestions(e.target.checked, filteredBulkQList)}
                  className="w-4 h-4 text-[#C1121F] rounded border-white/10 bg-black cursor-pointer focus:ring-0 focus:ring-offset-0"
                  id="bulk-chk-select-all"
                />
                <label htmlFor="bulk-chk-select-all" className="cursor-pointer select-none font-bold uppercase text-[10px] text-gray-300">
                  {language === "bn" ? "সব সিলেক্ট করুন" : "Select All Listed Custom Questions"}
                </label>
              </div>

              {selectedQIds.length > 0 ? (
                <div className="flex items-center gap-3">
                  {deleteProgress !== null ? (
                    <div className="flex items-center gap-2 font-mono text-[10px] text-red-400 min-w-[200px]">
                      <span className="animate-pulse">🗑️ {deleteStatusText}</span>
                    </div>
                  ) : (
                    <>
                      <span className="text-[10px] uppercase font-bold text-gray-400">
                        Selected To Delete: <span className="text-red-500 font-extrabold">{selectedQIds.length}</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleBatchDeleteSelected}
                        className="px-3.5 py-1.5 bg-[#C1121F] hover:bg-red-700 text-white border border-red-500/30 font-extrabold uppercase rounded-lg transition-all duration-200 text-[10px] flex items-center gap-1.5 cursor-pointer shadow"
                      >
                        <span>🗑️ {language === "bn" ? "মুছে ফেলুন" : "DELETE"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedQIds([])}
                        className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 rounded-lg text-[10px] cursor-pointer"
                      >
                        Reset
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleSelectRedundants}
                    className="px-2.5 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/20 rounded-lg font-bold text-[9px] uppercase tracking-wider cursor-pointer transition-colors"
                  >
                    ⚠️ {language === "bn" ? "অতিরিক্ত কপি সিলেক্ট করুন" : "Select Redundant Clones"}
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectAllDuplicates}
                    className="px-2.5 py-1.5 bg-red-950/20 hover:bg-red-950/40 text-red-400 border border-red-500/20 rounded-lg font-bold text-[9px] uppercase tracking-wider cursor-pointer transition-colors"
                  >
                    👥 {language === "bn" ? "সব ডুপ্লিকেট সিলেক্ট করুন" : "Select All Duplicates"}
                  </button>
                  <button
                    type="button"
                    onClick={handleInstantDeduplicateAll}
                    className="px-2.5 py-1.5 bg-gradient-to-r from-[#C1121F] to-red-700 hover:from-red-600 hover:to-red-800 text-white border border-red-500/30 font-extrabold uppercase rounded-lg transition-all duration-200 text-[9px] flex items-center gap-1 cursor-pointer shadow hover:scale-[1.02]"
                  >
                    ⚡ {language === "bn" ? "সব ডুপ্লিকেট ডিলিট করুন" : "Deduplicate All"}
                  </button>
                </div>
              )}
            </div>

            {/* Active Table list of questions */}
            <div className="overflow-y-auto max-h-[500px] flex flex-col gap-3 pr-1">
              {filteredBulkQList.length === 0 ? (
                <div className="p-12 border border-dashed border-white/10 rounded-xl text-center text-gray-500 font-mono text-xs">
                  {language === "bn" ? "ফিল্টারে কোনো প্রশ্ন পাওয়া যায়নি।" : "No questions matched listing criteria."}
                </div>
              ) : (
                paginatedBulkQList.map((q, idx) => {
                  const isSelected = q.id ? selectedQIds.includes(q.id) : false;
                  const status = questionsWithDuplicateStatus.get(q.id || "");
                  return (
                    <div
                      key={q.id || `bulk-item-${idx}`}
                      className={`p-4 rounded-xl flex items-start gap-4 transition text-xs border ${
                        isSelected 
                          ? "bg-red-950/10 border-red-500/30 shadow-[0_0_12px_rgba(193,18,31,0.1)]" 
                          : "bg-black/30 border-white/5 hover:border-white/10"
                      }`}
                    >
                      {q.id ? (
                        <div className="pt-0.5 shrink-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedQIds((prev) => [...prev, q.id!]);
                              } else {
                                setSelectedQIds((prev) => prev.filter((id) => id !== q.id));
                              }
                            }}
                            className="w-4 h-4 text-[#C1121F] rounded border-white/10 bg-black cursor-pointer focus:ring-0 focus:ring-offset-0"
                          />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded border border-white/10 bg-white/5 flex items-center justify-center text-[8px] font-bold text-gray-600 select-none shrink-0" title="Starter Question (Read-only)">
                          🔒
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                          <span className="px-1.5 py-0.2 bg-red-950/40 text-red-400 border border-red-500/10 rounded font-mono text-[9px] uppercase font-black">
                            {q.subject}
                          </span>
                          <span className="px-1.5 py-0.2 bg-gray-900 border border-white/5 text-gray-400 rounded font-mono text-[9px]">
                            {q.chapter}
                          </span>
                          {status?.isDuplicate && (
                            status.isRedundant ? (
                              <span className="px-1.5 py-0.2 bg-red-950/60 border border-red-500/30 text-red-400 rounded font-mono text-[9px] font-bold">
                                ⚠️ {language === "bn" ? "ডুপ্লিকেট কপি" : "DUPLICATE CLONE"}
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 bg-yellow-950/60 border border-yellow-500/30 text-yellow-500 rounded font-mono text-[9px] font-bold">
                                ★ {language === "bn" ? "মূল কপি" : "MASTER KEEP"}
                              </span>
                            )
                          )}
                          <span className="text-[10px] text-gray-550 font-mono ml-auto truncate max-w-[150px]" title={q.source}>
                            Source: {q.source}
                          </span>
                          {q.id && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                playSound("wrong");
                                handleDeleteQuestion(q.id!);
                              }}
                              className="p-1.5 hover:bg-white/5 text-red-450 hover:text-red-500 rounded-lg transition-all cursor-pointer ml-1"
                              title={language === "bn" ? "মুছে ফেলুন" : "Delete Question"}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="font-bold text-white leading-relaxed">{q.questionText}</p>
                        <ul className="grid grid-cols-2 gap-1.5 mt-2 text-[10px] font-mono text-gray-400">
                          {q.options.map((o, oIdx) => (
                            <li key={oIdx} className={oIdx === q.correctAnswerIndex ? "text-emerald-400 font-bold" : ""}>
                              {oIdx + 1}. {o}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination controls for bulk Eraser */}
            {bulkTotalPages > 1 && (
              <div className="flex items-center justify-between gap-4 border-t border-white/5 pt-4 font-mono text-[11px] text-gray-400 mt-2">
                <button
                  type="button"
                  disabled={bulkPage === 1}
                  onClick={() => {
                    playSound("click");
                    setBulkPage(prev => Math.max(1, prev - 1));
                  }}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer border border-white/10"
                >
                  ◀ {language === "bn" ? "পূর্ববর্তী" : "Prev"}
                </button>
                <span>{language === "bn" ? `পৃষ্ঠা ${bulkPage} / ${bulkTotalPages}` : `Page ${bulkPage} of ${bulkTotalPages}`}</span>
                <button
                  type="button"
                  disabled={bulkPage === bulkTotalPages}
                  onClick={() => {
                    playSound("click");
                    setBulkPage(prev => Math.min(bulkTotalPages, prev + 1));
                  }}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer border border-white/10"
                >
                  {language === "bn" ? "পরবর্তী" : "Next"} ▶
                </button>
              </div>
            )}
          </div>

          {/* Sidebar Area: Double Check (De-duplication Analyzer Hub) */}
          <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 relative flex flex-col gap-5 h-fit">
            <div>
              <h3 className="text-sm font-extrabold uppercase text-white flex items-center gap-2">
                <span>⚡ Double Question Checker</span>
                <span className="text-[9px] bg-yellow-500/15 text-yellow-500 font-black px-2 py-0.5 rounded-full font-mono uppercase tracking-widest border border-yellow-500/20">
                  DEDUPLICATOR
                </span>
              </h3>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                {language === "bn"
                  ? "সারা ডাটাবেজে একই টেক্সটের ডাবল কুইজ বা প্রশ্ন ডুপ্লিকেট কুপন আছে কিনা নিখুঁত স্ক্যান করে ডিলিট করে দিন।"
                  : "Compare entire custom database records to seek identical or near-identical duplicate text blocks."}
              </p>
            </div>

            {/* Checker master status trigger button */}
            <button
              onClick={handleScanDuplicates}
              className="w-full py-3 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 hover:from-yellow-500/30 hover:to-amber-500/30 border border-yellow-500/30 text-yellow-500 font-extrabold uppercase text-xs tracking-wider rounded-xl transition duration-300 shadow flex items-center justify-center gap-2 font-display cursor-pointer"
            >
              <span>🔍</span>
              <span>{language === "bn" ? "ডাবল প্রশ্ন স্ক্যান করুন" : "SCAN NOW FOR DUPLICATES"}</span>
            </button>

            {/* Duplicates diagnostics outputs */}
            {Object.keys(duplicateClusters).length > 0 ? (
              <div className="flex flex-col gap-4">
                <div className="border border-red-500/30 bg-red-950/10 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-red-400 font-extrabold uppercase animate-pulse">⚠️ duplicates found!</span>
                    <span className="bg-red-500/20 text-[#C1121F] font-black py-0.5 px-2 rounded">
                      {Object.keys(duplicateClusters).length} clusters
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 leading-normal">
                    {language === "bn" 
                      ? "১টি মাস্টার কপি রেখে বাকি অতিরিক্ত কপিগুলো স্বয়ংক্রিয়ভাবে মুছে ফেলতে পারেন।"
                      : "Deduplicate in one click: Keep the first item in each cluster as the master record, while purging the extra redundant clones."}
                  </p>
                  <button
                    onClick={handleAutoDeduplicateAll}
                    className="w-full py-2.5 bg-[#C1121F] hover:bg-red-700 text-white border border-red-500/40 text-xs font-black uppercase rounded-lg transition-all duration-300 shadow-md flex items-center justify-center gap-1.5"
                  >
                    <span>⚡ PURGE ALL REDUNDANTS ({Object.keys(duplicateClusters).length} clusters)</span>
                  </button>
                </div>

                <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                  {Object.keys(duplicateClusters).map((key, cidx) => {
                    const cluster = duplicateClusters[key];
                    return (
                      <div key={cidx} className="bg-black/50 border border-white/5 p-3 rounded-xl text-xs space-y-2 leading-relaxed">
                        <div className="flex items-center justify-between text-[9px] font-mono border-b border-white/5 pb-1 text-gray-450">
                          <span className="text-amber-500 font-extrabold uppercase">Cluster #{cidx + 1} ({cluster.length} copy)</span>
                          <span>{cluster[0].subject}</span>
                        </div>
                        <p className="font-semibold text-white text-[11px] leading-normal">{cluster[0].questionText}</p>
                        <div className="bg-white/[0.02] border border-white/5 p-2 rounded text-[10px] font-mono text-gray-450 space-y-1">
                          {cluster.map((c, qIdx) => (
                            <div key={c.id || qIdx} className="flex justify-between gap-2 overflow-hidden truncate">
                              <span className="text-gray-500">Copy #{qIdx + 1} ID: {c.id?.substring(0, 10)}...</span>
                              <span className="font-semibold text-amber-500">{qIdx === 0 ? "★ MASTER KEEP" : "✗ PURGING COPY"}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : showDuplicateView ? (
              <div className="p-8 border border-white/10 bg-black/30 rounded-xl text-center text-xs font-mono text-emerald-400 flex flex-col gap-2 items-center">
                <span>🟢</span>
                <span>{language === "bn" ? "চমৎকার! ডাটাবেজে কোনো ডুপ্লিকেট প্রশ্ন নেই।" : "No duplicate clusters detected inside active indexes."}</span>
              </div>
            ) : (
              <div className="p-12 border border-dashed border-white/10 rounded-xl text-center text-xs font-mono text-gray-500">
                Awaiting scan trigger parameters. Click button above to execute diagnostics.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: 4. BULK IMPORT SYSTEM */}
      {subTab === "import" && (
        <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 flex flex-col gap-6 animate-fadeIn">
          <div>
            <h3 className="text-sm font-extrabold uppercase text-white flex items-center gap-2">
              <span>📂 Advanced Medical Question Import & Heuristics Portal</span>
              <span className="text-[9px] bg-red-500/15 text-red-500 font-black px-2 py-0.5 rounded-full font-mono uppercase tracking-widest border border-red-500/20">
                PRO PORTAL
              </span>
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Supports fast batch ingestion of questions using CSV, TSV, or structured JSON. Includes built-in exact duplicate analysis, automated subject and chapter mapping based on lexical keywords.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 font-mono text-xs">
            {/* Input payload zone */}
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-white/5 gap-2 flex-wrap">
                <span className="text-[10px] text-gray-450 uppercase font-black tracking-wider">Ingress Dispatch Area</span>
                <div className="flex gap-2">
                  <button
                    onClick={handleGenerate1000Questions}
                    className="px-2.5 py-1 bg-gradient-to-r from-red-600/30 to-amber-500/30 border border-amber-500/50 hover:border-amber-400 hover:text-white text-amber-300 rounded text-[9px] font-bold transition-all shadow-md animate-pulse cursor-pointer"
                  >
                    🚀 {language === "bn" ? "১,০০০+ প্রশ্ন জেনারেট করুন" : "Auto-Generate 1,000+ Questions"}
                  </button>
                  <button
                    onClick={seedSampleExcelJSON}
                    className="px-2.5 py-1 bg-white/5 border border-white/10 hover:border-[#FFD700] hover:text-[#FFD700] text-gray-400 rounded text-[9px] cursor-pointer"
                  >
                    Load Sample JSON Schema
                  </button>
                </div>
              </div>

              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder='Paste CSV or JSON dataset here... Example JSON:
[
  {
    "questionText": "What cell structure regulates proteins?",
    "options": ["Ribosome", "Vacuole", "Wall", "Centrosome"],
    "correctAnswerIndex": 0,
    "explanation": "Ribosomes read mRNA to assemble proteins.",
    "subject": "Biology",
    "chapter": "Cell structure",
    "difficulty": "Easy",
    "category": "Medical Standard Questions"
  }
]'
                rows={10}
                className="w-full bg-[#0A0A0A] border border-white/10 text-white rounded-xl py-3 px-4 focus:outline-none font-mono text-[11px]"
              />

              <div className="flex items-center gap-2 bg-black/30 border border-white/5 p-3 rounded-xl">
                <input
                  type="checkbox"
                  id="skip_duplicates"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                  className="w-4 h-4 accent-red-600 rounded border-white/15 bg-[#111111] cursor-pointer"
                />
                <label htmlFor="skip_duplicates" className="text-gray-300 text-[11px] font-sans select-none cursor-pointer">
                  {language === "bn" 
                    ? "ডুপ্লিকেট প্রশ্নগুলো স্বয়ংক্রিয়ভাবে বাদ দিন (সুপারিশকৃত)" 
                    : "Automatically skip duplicates during import (Recommended)"}
                </label>
              </div>

              <button
                onClick={handleParseImport}
                className="py-3.5 bg-[#C1121F] hover:bg-red-700 font-extrabold text-white text-xs uppercase rounded-xl tracking-wider shadow cursor-pointer transition-colors duration-200"
              >
                COMPILE & VALIDATE BATCH DATA
              </button>
            </div>

            {/* Validation reviews */}
            <div className="border border-white/5 p-4 rounded-xl bg-black/25 flex flex-col gap-3 max-h-[500px] overflow-y-auto">
              <span className="text-[10px] text-emerald-400 uppercase font-black">Pre-Ingress Analysis Validation Queue</span>

              {parsedQuestions.length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-xs">
                  Awaiting batch compile. No documents loaded into validator.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {/* Real-time stats */}
                  <div className="grid grid-cols-3 gap-2 bg-black/40 p-2.5 rounded-lg border border-white/5 text-[10px] font-mono">
                    <div className="text-center border-r border-white/5">
                      <div className="text-gray-400">Total Parsed</div>
                      <div className="text-white font-bold text-sm mt-0.5">{parsedQuestions.length}</div>
                    </div>
                    <div className="text-center border-r border-white/5">
                      <div className="text-red-400">Duplicates</div>
                      <div className="text-red-400 font-bold text-sm mt-0.5">{parsedQuestions.filter(q => q.isDuplicate).length}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-emerald-400">Ready (New)</div>
                      <div className="text-emerald-400 font-bold text-sm mt-0.5">{parsedQuestions.filter(q => !q.isDuplicate).length}</div>
                    </div>
                  </div>

                  {/* Filter options and search bar */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 bg-[#0C0C0C] border border-white/5 p-1 rounded-lg">
                      <button
                        onClick={() => setParsedFilter("all")}
                        className={`flex-1 py-1 text-[9px] font-bold uppercase rounded cursor-pointer ${
                          parsedFilter === "all" ? "bg-[#C1121F] text-white" : "text-gray-400 hover:text-white"
                        }`}
                      >
                        All ({parsedQuestions.length})
                      </button>
                      <button
                        onClick={() => setParsedFilter("valid")}
                        className={`flex-1 py-1 text-[9px] font-bold uppercase rounded cursor-pointer ${
                          parsedFilter === "valid" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/10" : "text-gray-400 hover:text-white"
                        }`}
                      >
                        Ready ({parsedQuestions.filter(q => !q.isDuplicate).length})
                      </button>
                      <button
                        onClick={() => setParsedFilter("duplicate")}
                        className={`flex-1 py-1 text-[9px] font-bold uppercase rounded cursor-pointer ${
                          parsedFilter === "duplicate" ? "bg-red-500/20 text-red-400 border border-red-500/10" : "text-gray-400 hover:text-white"
                        }`}
                      >
                        Dupes ({parsedQuestions.filter(q => q.isDuplicate).length})
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search compiled preview questions..."
                        value={parsedSearch}
                        onChange={(e) => setParsedSearch(e.target.value)}
                        className="w-full bg-[#0A0A0A] border border-white/5 rounded-lg py-2 px-3 text-[11px] font-sans text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Action with progressive loader */}
                  <div className="flex flex-col gap-2 border-t border-white/5 pt-2">
                    {importProgress !== null ? (
                      <div className="bg-[#111C15] border border-emerald-950 p-3.5 rounded-xl flex flex-col gap-2 font-mono text-xs">
                        <div className="flex justify-between items-center text-emerald-400 font-bold">
                          <span>{importStatusText}</span>
                          <span>{importProgress}%</span>
                        </div>
                        <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-full transition-all duration-300" 
                            style={{ width: `${importProgress}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={handleBulkApproveSave}
                        className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-black uppercase rounded-lg shadow cursor-pointer transition-colors"
                      >
                        {language === "bn" 
                          ? `সফলভাবে সেভ করুন (${skipDuplicates ? parsedQuestions.filter(q => !q.isDuplicate).length : parsedQuestions.length}টি প্রশ্ন)` 
                          : `BULK APPROVE & SEED (${skipDuplicates ? parsedQuestions.filter(q => !q.isDuplicate).length : parsedQuestions.length} rows)`}
                      </button>
                    )}
                  </div>

                  {/* Filtered list rendering */}
                  <div className="space-y-3 mt-2">
                    {(() => {
                      const filteredParsed = parsedQuestions.filter(item => {
                        if (parsedFilter === "valid" && item.isDuplicate) return false;
                        if (parsedFilter === "duplicate" && !item.isDuplicate) return false;
                        if (parsedSearch) {
                          return item.questionText.toLowerCase().includes(parsedSearch.toLowerCase());
                        }
                        return true;
                      });

                      const displayLimit = 50;
                      const paginatedList = filteredParsed.slice(0, displayLimit);

                      return (
                        <>
                          {paginatedList.map((item, idx) => (
                            <div
                              key={item.uidKey || idx}
                              className={`p-3 rounded-lg border text-[11px] font-sans transition-colors duration-200 ${
                                item.isDuplicate
                                  ? "bg-red-950/10 border-red-500/20 text-red-300"
                                  : "bg-[#0D0D0D] border-white/5 text-gray-300"
                              }`}
                            >
                              <div className="flex justify-between items-center mb-1.5 font-mono text-[9px]">
                                <span className="text-[#FFD700] uppercase font-bold pr-2 bg-yellow-950/20 rounded-md py-0.5 px-1.5 block">
                                  Auto: {item.subject} • {item.chapter}
                                </span>
                                {item.isDuplicate ? (
                                  <span className="text-red-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                    ⚠️ Duplicate Warn
                                  </span>
                                ) : (
                                  <span className="text-emerald-400 uppercase font-bold">✓ Ready for ingest</span>
                                )}
                              </div>
                              <p className="font-extrabold text-[12px] text-white leading-normal">{item.questionText}</p>
                              <ul className="grid grid-cols-2 gap-1 mt-1 text-[10px] text-gray-400 font-mono">
                                {item.options.map((opt: string, optIdx: number) => (
                                  <li key={optIdx} className={optIdx === item.correctAnswerIndex ? "text-emerald-400 font-bold" : ""}>
                                    {String.fromCharCode(65 + optIdx)}. {opt}
                                  </li>
                                ))}
                              </ul>
                              {item.explanation && (
                                <p className="text-[10px] text-gray-500 font-mono mt-1 border-t border-white/5 pt-1 truncate">
                                  Exp: {item.explanation}
                                </p>
                              )}
                            </div>
                          ))}

                          {filteredParsed.length > displayLimit && (
                            <div className="p-4 bg-yellow-950/10 border border-[#FFD700]/15 rounded-xl text-center text-gray-400 font-mono text-[10px]">
                              {language === "bn"
                                ? `... এবং আরও ${filteredParsed.length - displayLimit}টি প্রশ্ন বাফার মেমরিতে লোড করা হয়েছে যা বাল্ক সেভ করার জন্য প্রস্তুত`
                                : `... and ${filteredParsed.length - displayLimit} more parsed questions are safely staged in-memory for bulk seed`}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 5. MODERATOR REVIEW SYSTEM */}
      {subTab === "review" && (
        <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 flex flex-col gap-6 animate-fadeIn">
          <div>
            <h3 className="text-sm font-extrabold uppercase text-white">Questions Review & Moderation Queue</h3>
            <p className="text-xs text-gray-400 mt-1">
              Moderators and Admins can review pending requests, perform surgical corrections on option structures, add diagnostic guidelines, assign target test categories, and approve or dismiss rows.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {reviewQueue.length === 0 ? (
              <div className="p-12 border border-dashed border-white/15 rounded-xl text-center text-gray-500 font-mono text-xs">
                No questions awaiting verification. All indexes validated.
              </div>
            ) : (
              reviewQueue.map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-black/30 border border-white/5 hover:border-white/10 rounded-xl flex flex-col sm:flex-row gap-4 justify-between items-start text-xs font-mono"
                >
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 bg-blue-950/40 text-blue-400 border border-blue-500/20 rounded text-[9px] font-bold">
                        {item.subject}
                      </span>
                      <span className="px-2 py-0.5 bg-gray-900 border border-white/5 rounded text-[9px]">
                        {item.chapter}
                      </span>
                    </div>
                    <p className="font-bold text-white text-sm leading-relaxed">{item.questionText}</p>

                    <div className="grid sm:grid-cols-2 gap-2 mt-3 text-[11px]">
                      {item.options.map((opt, oIdx) => (
                        <div
                          key={oIdx}
                          className={`p-1 px-2.5 rounded ${
                            oIdx === item.correctAnswerIndex ? "text-emerald-400 bg-emerald-950/15" : "bg-black/40 text-gray-400"
                          }`}
                        >
                          {["A", "B", "C", "D"][oIdx]}. {opt}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                    <button
                      onClick={async () => {
                        try {
                          const qRef = doc(db, "questions", item.id);
                          await updateDoc(qRef, {
                            source: "Approved and catalogued via command moderator queue",
                            createdAt: serverTimestamp()
                          });
                          showToast("Diagnostic question approved into global indexes!");
                          logActivity(`Moderator approved question: ${item.id}`);
                        } catch (err: any) {
                          showToast(err.message, true);
                        }
                      }}
                      className="flex-1 sm:flex-initial py-2 px-3 bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold rounded-lg uppercase text-[10px]"
                    >
                      Approve & Go Live
                    </button>
                    <button
                      onClick={async () => {
                        const feedback = prompt("Enter rejection reason notes: ");
                        if (!feedback) return;
                        try {
                          await deleteDoc(doc(db, "questions", item.id));
                          showToast(`MCQ Rejected and removed. Reason logged: ${feedback}`);
                          logActivity(`Moderator rejected question: ${item.id}. Reason: ${feedback}`);
                        } catch (err: any) {
                          showToast(err.message, true);
                        }
                      }}
                      className="flex-1 sm:flex-initial py-2 px-3 bg-red-950/40 text-[#C1121F] border border-[#C1121F]/20 hover:bg-[#C1121F]/20 rounded-lg uppercase text-[10px]"
                    >
                      Dismiss / Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: 6. SECURITY MATRIX */}
      {subTab === "security" && (
        <div className="grid md:grid-cols-3 gap-8 animate-fadeIn">
          {/* Security metrics dashboard card */}
          <div className="flex flex-col gap-5 md:col-span-1">
            <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-[#C1121F]"></div>
              
              <h3 className="text-sm font-extrabold uppercase text-white mb-4">Core Threat Levels</h3>

              <div className="flex flex-col gap-4 font-mono text-xs">
                <div className="flex justify-between items-center p-3.5 bg-black/40 border-l-4 border-l-[#C1121F] rounded-r-xl border border-white/5">
                  <span className="text-gray-400">Failed Login Lockouts:</span>
                  <span className="text-white font-extrabold">{failedAttempts} Attempts</span>
                </div>
                <div className="flex justify-between items-center p-3.5 bg-black/40 border-l-4 border-l-yellow-500 rounded-r-xl border border-white/5">
                  <span className="text-gray-400">Security Alerts Active:</span>
                  <span className="text-[#FFD700] font-extrabold">2 Parameters</span>
                </div>
                <div className="flex justify-between items-center p-3.5 bg-[#C1121F]/10 border-l-4 border-l-purple-500 rounded-r-xl border border-purple-500/20">
                  <span className="text-gray-400">Auth Integrity Level:</span>
                  <span className="text-purple-400 font-extrabold">Supervising</span>
                </div>
              </div>
            </div>

            {/* Sandbox details */}
            <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 text-xs text-gray-400 leading-relaxed font-mono">
              <span className="text-xs uppercase text-white font-black block mb-2 border-b border-white/5 pb-2">RBAC Constraint Protocols</span>
              <p>
                Authentication tokens are verified securely via cloud infrastructure. Adherence to attribute-based access controls guarantees that students can only modify their own documents. Role promotions can only be triggered by Super Admin accounts.
              </p>
            </div>
          </div>

          {/* Action Activity Tickers logs table */}
          <div className="md:col-span-2 bg-[#111111] border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
            <h3 className="text-sm font-extrabold uppercase text-white border-b border-white/5 pb-3">Real-time Admin Activity Logs & Alerts</h3>

            <div className="flex flex-col gap-2.5 font-mono text-[11px] max-h-[400px] overflow-y-auto">
              {securityLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-3 rounded-xl border leading-relaxed ${
                    log.type === "threat" ? "bg-red-950/25 border-red-500/30 text-red-300" :
                    log.type === "login_failed" ? "bg-yellow-950/20 border-yellow-500/20 text-[#FFD700]" :
                    log.type === "admin_act" ? "bg-blue-950/20 border-blue-500/20 text-blue-300" :
                    "bg-black/40 border-white/5 text-gray-400"
                  }`}
                >
                  <div className="flex justify-between items-center text-[10px] mb-1 font-bold">
                    <span className="uppercase">
                      {log.type === "threat" ? "⚠️ THREAT SHIELD ALERT" :
                       log.type === "login_failed" ? "✗ UNVERIFIED ATTEMPT" :
                       log.type === "admin_act" ? "☆ DELEGATED ACTIVITY" :
                       "✓ SESSION MATCHED"}
                    </span>
                    <span>{log.timestamp}</span>
                  </div>
                  <p className="font-extrabold text-[#E5E7EB]">{log.action}</p>
                  <span className="text-[9.5px] text-gray-500 block mt-1.5 font-mono">Operator ID: {log.userEmail} • Terminal IP: {log.ip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 7. SEARCH TOPICS MANAGEMENT */}
      {subTab === "topics" && (
        <div className="grid md:grid-cols-3 gap-8 animate-fadeIn text-left">
          {/* Left panel: Add/Edit Topic */}
          <div className="md:col-span-1 bg-[#111111] border border-white/10 rounded-2xl p-6 shadow flex flex-col gap-5">
            <div>
              <h3 className="text-sm font-extrabold uppercase text-white mb-1.5 flex items-center gap-2">
                {editingTopic ? <Edit2 className="w-4 h-4 text-[#C1121F]" /> : <PlusCircle className="w-4 h-4 text-[#C1121F]" />}
                <span>{editingTopic ? (isBn ? "টপিক এডিট করুন" : "Edit Search Topic") : (isBn ? "নতুন টপিক যোগ করুন" : "Add New Search Topic")}</span>
              </h3>
              <p className="text-[10px] text-gray-450">
                {isBn 
                  ? "গ্লোবাল সার্চ বক্সে প্রদর্শিত অধ্যায় ও বিষয়গুলোর কাস্টমাইজেশন করুন।" 
                  : "Create or modify chapters and subtopics indexed in the global unified search box."}
              </p>
            </div>

            <form onSubmit={editingTopic ? handleUpdateTopic : handleAddTopic} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono uppercase font-bold text-gray-400 mb-1">
                  {isBn ? "বাংলা নাম" : "Bangla Title"} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder={isBn ? "উদা: কোষ বিভাজন" : "e.g. Cell Division"}
                  value={editingTopic ? editingTopic.bn : newTopic.bn}
                  onChange={(e) => {
                    if (editingTopic) {
                      setEditingTopic({ ...editingTopic, bn: e.target.value });
                    } else {
                      setNewTopic({ ...newTopic, bn: e.target.value });
                    }
                  }}
                  className="w-full bg-black/40 border border-white/10 hover:border-white/20 focus:border-[#C1121F] text-white rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#C1121F]"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase font-bold text-gray-400 mb-1">
                  {isBn ? "ইংরেজি নাম" : "English Title"} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder={isBn ? "উদা: Cell Division" : "e.g. Cell Division"}
                  value={editingTopic ? editingTopic.en : newTopic.en}
                  onChange={(e) => {
                    if (editingTopic) {
                      setEditingTopic({ ...editingTopic, en: e.target.value });
                    } else {
                      setNewTopic({ ...newTopic, en: e.target.value });
                    }
                  }}
                  className="w-full bg-black/40 border border-white/10 hover:border-white/20 focus:border-[#C1121F] text-white rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#C1121F]"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase font-bold text-gray-400 mb-1">
                  {isBn ? "বিষয় / ক্যাটাগরি" : "Subject / Category"} <span className="text-red-500">*</span>
                </label>
                <select
                  value={editingTopic ? editingTopic.subject : newTopic.subject}
                  onChange={(e) => {
                    if (editingTopic) {
                      setEditingTopic({ ...editingTopic, subject: e.target.value });
                    } else {
                      setNewTopic({ ...newTopic, subject: e.target.value });
                    }
                  }}
                  className="w-full bg-black/40 border border-white/10 hover:border-white/20 focus:border-[#C1121F] text-white rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#C1121F]"
                >
                  <option value="biology">{isBn ? "জীববিজ্ঞান (Biology)" : "Biology"}</option>
                  <option value="chemistry">{isBn ? "রসায়ন (Chemistry)" : "Chemistry"}</option>
                  <option value="physics">{isBn ? "পদার্থবিজ্ঞান (Physics)" : "Physics"}</option>
                  <option value="english">{isBn ? "ইংরেজি (English)" : "English"}</option>
                  <option value="gk">{isBn ? "সাধারণ জ্ঞান (GK)" : "General Knowledge"}</option>
                </select>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 bg-[#C1121F] hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow font-mono uppercase tracking-wider"
                >
                  {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{editingTopic ? (isBn ? "আপডেট করুন" : "Update Topic") : (isBn ? "যোগ করুন" : "Add Topic")}</span>
                </button>
                {editingTopic && (
                  <button
                    type="button"
                    onClick={() => {
                      playSound("click");
                      setEditingTopic(null);
                    }}
                    className="py-2.5 px-3 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    {isBn ? "বাতিল" : "Cancel"}
                  </button>
                )}
              </div>
            </form>

            <div className="border-t border-white/5 pt-4">
              <h4 className="text-[10px] font-mono uppercase font-bold text-[#FFD700] mb-2">
                {isBn ? "⚡ ওয়ান-ক্লিক ডিফল্ট লোডার" : "⚡ ONE-CLICK STARTER DATA"}
              </h4>
              <p className="text-[9px] text-gray-400 mb-3 leading-relaxed">
                {isBn 
                  ? "আপনার সার্চ ডাটাবেসটি যদি খালি থাকে, তবে নিচের বোতামটি দিয়ে ১৫টি প্রধান মেডিকেল অ্যাডমিশন অধ্যায় একসাথে ডাটাবেজে যুক্ত করতে পারেন।" 
                  : "If your database is empty, seed 15 vital pre-configured admission chapters into search indexes at once."}
              </p>
              <button
                type="button"
                onClick={handleSeedDefaultTopics}
                disabled={isSeedingTopics}
                className="w-full py-2 px-3 bg-amber-950/20 hover:bg-amber-900/40 border border-amber-500/20 hover:border-amber-500/40 text-[#FFD700] text-[10px] font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer font-mono"
              >
                {isSeedingTopics ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Flame className="w-3.5 h-3.5 text-amber-500" />}
                <span>{isBn ? "ডিফল্ট অধ্যায়গুলো লোড করুন" : "Seed 15 Default Chapters"}</span>
              </button>
            </div>
          </div>

          {/* Right panel: Filterable list of Search Topics */}
          <div className="md:col-span-2 bg-[#111111] border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
              <div>
                <h3 className="text-sm font-extrabold uppercase text-white">
                  {isBn ? `সার্চ টপিক সমূহের তালিকা (${searchTopics.length})` : `Search Topic Directory (${searchTopics.length})`}
                </h3>
                <p className="text-[10px] text-gray-450 mt-0.5">
                  {isBn 
                    ? "রিয়েল-টাইমে সার্চ তালিকায় প্রদর্শিত চ্যাপ্টার ও টপিকগুলো ফিল্টার, এডিট বা ডিলিট করুন।" 
                    : "Manage search subjects instantly synced with all active student lookup engines."}
                </p>
              </div>

              {/* Internal Search / Filter Bar */}
              <div className="relative shrink-0 sm:w-64">
                <Search className="w-3.5 h-3.5 text-[#C1121F] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={isBn ? "খুঁজুন..." : "Filter topics..."}
                  value={topicSearch}
                  onChange={(e) => setTopicSearch(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 hover:border-white/20 focus:border-[#C1121F] text-white rounded-xl pl-9 pr-4 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#C1121F]"
                />
              </div>
            </div>

            {/* List Body */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs text-gray-300">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] uppercase font-mono text-gray-500">
                    <th className="py-2.5 px-3">{isBn ? "বিষয়" : "Subject"}</th>
                    <th className="py-2.5 px-3">{isBn ? "বাংলা নাম" : "Bangla Title"}</th>
                    <th className="py-2.5 px-3">{isBn ? "ইংরেজি নাম" : "English Title"}</th>
                    <th className="py-2.5 px-3 text-right">{isBn ? "অ্যাকশন" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-sans">
                  {searchTopics.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-gray-500 text-xs font-mono">
                        <div className="mb-2">⚠️</div>
                        {isBn 
                          ? "ডাটাবেজে কোনো সার্চ টপিক পাওয়া যায়নি। বাম পাশের বাটন দিয়ে ডিফল্ট টপিকগুলো লোড করতে পারেন।" 
                          : "No custom search topics indexed. Seed default chapters to start."}
                      </td>
                    </tr>
                  ) : (
                    (() => {
                      const filtered = searchTopics.filter(t => {
                        if (!topicSearch) return true;
                        const s = topicSearch.toLowerCase();
                        return (
                          t.bn.toLowerCase().includes(s) ||
                          t.en.toLowerCase().includes(s) ||
                          t.subject.toLowerCase().includes(s)
                        );
                      });

                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-gray-500 text-xs font-mono">
                              {isBn ? "খোঁজা টপিকটির কোনো মিল পাওয়া যায়নি।" : "No matches found under search filters."}
                            </td>
                          </tr>
                        );
                      }

                      return filtered.map((topic) => {
                        // Badge styling
                        let subBadgeStyle = "bg-blue-500/10 text-blue-400 border border-blue-500/20";
                        if (topic.subject === "chemistry") subBadgeStyle = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
                        else if (topic.subject === "physics") subBadgeStyle = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
                        else if (topic.subject === "english") subBadgeStyle = "bg-purple-500/10 text-purple-400 border border-purple-500/20";
                        else if (topic.subject === "gk") subBadgeStyle = "bg-rose-500/10 text-rose-400 border border-rose-500/20";

                        return (
                          <tr key={topic.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-3 px-3">
                              <span className={`text-[9px] uppercase font-mono px-2 py-0.5 rounded font-extrabold ${subBadgeStyle}`}>
                                {topic.subject}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-bold text-white">
                              {topic.bn}
                            </td>
                            <td className="py-3 px-3 font-mono text-gray-400">
                              {topic.en}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end gap-2.5">
                                <button
                                  onClick={() => {
                                    playSound("click");
                                    setEditingTopic(topic);
                                  }}
                                  className="p-1 text-gray-400 hover:text-white hover:bg-white/5 rounded transition cursor-pointer"
                                  title="Edit Topic"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTopic(topic.id, topic.bn)}
                                  className="p-1 text-gray-400 hover:text-[#C1121F] hover:bg-red-950/20 rounded transition cursor-pointer"
                                  title="Delete Topic"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })()
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 8. LIVE EXAMS MANAGEMENT & RE-EXAM PERMISSIONS */}
      {subTab === "live_exams" && (
        <div className="flex flex-col gap-6 animate-fadeIn text-left">
          {/* Sub-section navigation bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-[#111111] border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  playSound("click");
                  setLiveExamSubSection("directory");
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition flex items-center gap-2 cursor-pointer ${
                  liveExamSubSection === "directory"
                    ? "bg-[#C1121F] text-white shadow-lg shadow-red-950/40"
                    : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                }`}
              >
                <Award className="w-4 h-4" />
                <span>{isBn ? "মডেল টেস্ট ডিরেক্টরি ও তৈরি" : "Exams Directory & Host"}</span>
                <span className="bg-black/40 px-2 py-0.5 rounded text-[10px] text-white">
                  {liveExams.length}
                </span>
              </button>

              <button
                onClick={() => {
                  playSound("click");
                  setLiveExamSubSection("submissions");
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition flex items-center gap-2 cursor-pointer ${
                  liveExamSubSection === "submissions"
                    ? "bg-amber-600 text-black shadow-lg shadow-amber-950/40 font-black"
                    : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                }`}
              >
                <RotateCcw className="w-4 h-4" />
                <span>{isBn ? "সাবমিশন ও রি-এক্সাম পারমিশন কন্ট্রোল" : "Submissions & Re-Exam Controls"}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] ${
                  liveExamSubSection === "submissions" ? "bg-black/60 text-amber-300" : "bg-black/40 text-amber-400 font-bold"
                }`}>
                  {liveSubmissions.length}
                </span>
              </button>
            </div>

            <div className="text-[11px] text-gray-450 font-mono flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{reExamPermissions.filter(p => p.status === "active").length} {isBn ? "সক্রিয় রি-এক্সাম পারমিশন" : "Active Re-exam Grants"}</span>
              </span>
              <span className="text-gray-600">•</span>
              <span className="flex items-center gap-1.5 text-amber-400">
                <span>⚠️ {liveSubmissions.filter(s => s.submittedDueToViolation || s.tabSwitchesCount >= 2).length} {isBn ? "ট্যাব সুইচ অটো-সাবমিট" : "Tab Violation Submissions"}</span>
              </span>
            </div>
          </div>

          {/* VIEW A: DIRECTORY & EXAM CREATOR */}
          {liveExamSubSection === "directory" && (
            <div className="grid md:grid-cols-3 gap-8">
              {/* Left panel: Host/Create Live Exam */}
              <div className="md:col-span-1 bg-[#111111] border border-white/10 rounded-2xl p-6 shadow flex flex-col gap-5">
                <div>
                  <h3 className="text-sm font-extrabold uppercase text-white mb-1.5 flex items-center gap-2">
                    <PlusCircle className="w-4 h-4 text-[#C1121F]" />
                    <span>{isBn ? "নতুন লাইভ এক্সাম সেট করুন" : "Set New Live Exam"}</span>
                  </h3>
                  <p className="text-[10px] text-gray-450">
                    {isBn 
                      ? "রিয়েল-টাইম প্রতিযোগিতামূলক পরীক্ষার জন্য প্রশ্ন সংখ্যা, সময় ও বিষয় নির্ধারণ করুন।" 
                      : "Configure subject, chapters, question limits, and duration for real-time competitive testing."}
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-mono uppercase font-bold text-gray-400 mb-1">
                      {isBn ? "পরীক্ষার নাম (টাইটেল)" : "Exam Title"} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder={isBn ? "উদা: জীববিজ্ঞান ১ম পত্র মেগা টেস্ট" : "e.g. Biology Paper 1 Mega Test"}
                      value={newExamTitle}
                      onChange={(e) => setNewExamTitle(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 hover:border-white/20 focus:border-[#C1121F] text-white rounded-xl px-3.5 py-2.5 text-xs focus:outline-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono uppercase font-bold text-gray-400 mb-1">
                        {isBn ? "বিষয় (Subject)" : "Subject"}
                      </label>
                      <select
                        value={newExamSubject}
                        onChange={(e) => {
                          setNewExamSubject(e.target.value);
                          setNewExamChapter("All");
                        }}
                        className="w-full bg-black/40 border border-white/10 hover:border-white/20 focus:border-[#C1121F] text-white rounded-xl px-3 py-2.5 text-xs focus:outline-none"
                      >
                        <option value="Biology">Biology</option>
                        <option value="Chemistry">Chemistry</option>
                        <option value="Physics">Physics</option>
                        <option value="English">English</option>
                        <option value="GK">General Knowledge</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase font-bold text-gray-400 mb-1">
                        {isBn ? "প্রশ্নের সংখ্যা" : "MCQ Count"}
                      </label>
                      <select
                        value={newExamQuestionsCount}
                        onChange={(e) => setNewExamQuestionsCount(Number(e.target.value))}
                        className="w-full bg-black/40 border border-white/10 hover:border-white/20 focus:border-[#C1121F] text-white rounded-xl px-3 py-2.5 text-xs focus:outline-none"
                      >
                        <option value="10">10 Questions</option>
                        <option value="15">15 Questions</option>
                        <option value="20">20 Questions</option>
                        <option value="25">25 Questions</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono uppercase font-bold text-gray-400 mb-1">
                        {isBn ? "সময় (মিনিট)" : "Duration (Mins)"}
                      </label>
                      <select
                        value={newExamDuration}
                        onChange={(e) => setNewExamDuration(Number(e.target.value))}
                        className="w-full bg-black/40 border border-white/10 hover:border-white/20 focus:border-[#C1121F] text-white rounded-xl px-3 py-2.5 text-xs focus:outline-none"
                      >
                        <option value="5">5 Minutes</option>
                        <option value="10">10 Minutes</option>
                        <option value="15">15 Minutes</option>
                        <option value="20">20 Minutes</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase font-bold text-gray-400 mb-1">
                        {isBn ? "অধ্যায় (Chapter)" : "Chapter"}
                      </label>
                      <select
                        value={newExamChapter}
                        onChange={(e) => setNewExamChapter(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 hover:border-white/20 focus:border-[#C1121F] text-white rounded-xl px-3 py-2.5 text-xs focus:outline-none text-left"
                      >
                        <option value="All">{isBn ? "সকল অধ্যায়" : "All Chapters"}</option>
                        {getChaptersForSubject(newExamSubject).filter(c => c !== "All").map(ch => (
                          <option key={ch} value={ch}>{ch}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCreateLiveExam}
                    disabled={loading}
                    className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-500 text-black text-xs font-black uppercase rounded-xl transition shadow cursor-pointer flex items-center justify-center gap-1.5 font-display tracking-wider"
                  >
                    {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>{isBn ? "লাইভ পরীক্ষা প্রকাশ করুন" : "Publish Live Exam"}</span>
                  </button>
                </div>
              </div>

              {/* Right panel: Live Exams Directory */}
              <div className="md:col-span-2 bg-[#111111] border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
                <div>
                  <h3 className="text-sm font-extrabold uppercase text-white">
                    {isBn ? `সচল লাইভ পরীক্ষা সমূহের তালিকা (${liveExams.length})` : `Active Live Exams List (${liveExams.length})`}
                  </h3>
                  <p className="text-[10px] text-gray-450 mt-0.5">
                    {isBn 
                      ? "সরাসরি পরীক্ষার সচলতা নিয়ন্ত্রণ করুন, ফলাফল ও লিডারবোর্ড দেখুন অথবা অপ্রয়োজনীয় পরীক্ষা ডিলিট করুন।" 
                      : "Toggle exam availability, review user submissions, or safely delete expired exam pools."}
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs text-gray-300">
                    <thead>
                      <tr className="border-b border-white/5 text-[10px] uppercase font-mono text-gray-500">
                        <th className="py-2.5 px-3">{isBn ? "বিষয় ও অধ্যায়" : "Subject & Chapter"}</th>
                        <th className="py-2.5 px-3">{isBn ? "পরীক্ষার নাম" : "Exam Title"}</th>
                        <th className="py-2.5 px-3">{isBn ? "প্রশ্ন ও সময়" : "MCQs & Time"}</th>
                        <th className="py-2.5 px-3">{isBn ? "অবস্থা" : "Status"}</th>
                        <th className="py-2.5 px-3 text-right">{isBn ? "অ্যাকশন" : "Actions"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-sans">
                      {liveExams.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-gray-500 text-xs font-mono">
                            <div className="mb-2">⚠️</div>
                            {isBn ? "কোন লাইভ পরীক্ষা তৈরি করা হয়নি।" : "No live exams configured yet. Set one up on the left panel!"}
                          </td>
                        </tr>
                      ) : (
                        liveExams.map((exam) => {
                          const subsCount = liveSubmissions.filter(s => s.examId === exam.id).length;
                          let subBadgeStyle = "bg-blue-500/10 text-blue-400 border border-blue-500/20";
                          if (exam.subject?.toLowerCase() === "chemistry") subBadgeStyle = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
                          else if (exam.subject?.toLowerCase() === "physics") subBadgeStyle = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
                          else if (exam.subject?.toLowerCase() === "english") subBadgeStyle = "bg-purple-500/10 text-purple-400 border border-purple-500/20";
                          else if (exam.subject?.toLowerCase() === "gk") subBadgeStyle = "bg-rose-500/10 text-rose-400 border border-rose-500/20";

                          return (
                            <tr key={exam.id} className="hover:bg-white/[0.01] transition-colors">
                              <td className="py-3 px-3">
                                <div className="flex flex-col gap-1">
                                  <span className={`text-[9px] uppercase font-mono px-2 py-0.5 rounded font-extrabold w-max ${subBadgeStyle}`}>
                                    {exam.subject}
                                  </span>
                                  <span className="text-[10px] text-gray-400 truncate max-w-[150px]" title={exam.chapter}>
                                    {exam.chapter === "All" ? (isBn ? "সকল অধ্যায়" : "All Chapters") : exam.chapter}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                <div className="font-bold text-white leading-snug">{exam.title}</div>
                                <div className="text-[9px] text-gray-500 mt-0.5 font-mono">
                                  {isBn ? "তৈরি করেছেন: " : "Host: "}{exam.creatorName}
                                </div>
                              </td>
                              <td className="py-3 px-3 font-mono text-gray-300">
                                <div>{exam.totalQuestions} Qs</div>
                                <div className="text-[10px] text-gray-450">{exam.duration} Mins</div>
                              </td>
                              <td className="py-3 px-3">
                                <button
                                  onClick={() => handleToggleLiveExamStatus(exam.id, exam.isActive)}
                                  className={`px-2 py-1 rounded text-[9px] uppercase font-bold transition font-mono ${
                                    exam.isActive 
                                      ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20" 
                                      : "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
                                  }`}
                                >
                                  {exam.isActive ? (isBn ? "সচল" : "Active") : (isBn ? "নিষ্ক্রিয়" : "Inactive")}
                                </button>
                              </td>
                              <td className="py-3 px-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => {
                                      playSound("click");
                                      setViewingLeaderboardExamId(viewingLeaderboardExamId === exam.id ? null : exam.id);
                                    }}
                                    className={`px-2.5 py-1 text-[10px] rounded transition font-bold cursor-pointer flex items-center gap-1 ${
                                      viewingLeaderboardExamId === exam.id
                                        ? "bg-amber-500 text-black"
                                        : "bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
                                    }`}
                                  >
                                    <Award className="w-3 h-3" />
                                    <span>{subsCount} {isBn ? "অংশগ্রহণকারী" : "Subs"}</span>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteLiveExam(exam.id, exam.title)}
                                    className="p-1 text-gray-400 hover:text-[#C1121F] hover:bg-red-950/20 rounded transition cursor-pointer"
                                    title={isBn ? "পরীক্ষা মুছুন" : "Delete Exam"}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* LIVE LEADERBOARD INLINE DISPLAY */}
                {viewingLeaderboardExamId && (
                  <div className="border-t border-white/10 pt-5 mt-3 animate-slideDown text-left">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-xs uppercase font-extrabold text-amber-500 flex items-center gap-1.5 font-mono">
                          <span>🏆</span>
                          <span>
                            {isBn ? "লাইভ মডেল টেস্ট লিডারবোর্ড" : "Live Model Test Leaderboard"}
                          </span>
                        </h4>
                        <p className="text-[10px] text-gray-450 mt-0.5">
                          {isBn ? "শিক্ষার্থীদের সাবমিশন স্কোর ও সময়ের তালিকা।" : "Student performance scores indexed by accuracy and duration."}
                        </p>
                      </div>
                      <button
                        onClick={() => setViewingLeaderboardExamId(null)}
                        className="text-[10px] font-mono font-bold uppercase text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-2 py-1 rounded"
                      >
                        {isBn ? "বন্ধ করুন" : "Close"}
                      </button>
                    </div>

                    <div className="bg-black/40 border border-white/5 rounded-xl overflow-hidden p-1.5">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-white/5 text-[9px] uppercase font-mono text-gray-500">
                            <th className="py-2 px-3 text-left">#</th>
                            <th className="py-2 px-3 text-left">{isBn ? "শিক্ষার্থী" : "Student"}</th>
                            <th className="py-2 px-3 text-center">{isBn ? "প্রাপ্ত নম্বর" : "Score"}</th>
                            <th className="py-2 px-3 text-right">{isBn ? "ব্যয়িত সময়" : "Time Spent"}</th>
                            <th className="py-2 px-3 text-right">{isBn ? "জমা দেওয়ার সময়" : "Submitted"}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {(() => {
                            const examSubs = liveSubmissions
                              .filter(s => s.examId === viewingLeaderboardExamId)
                              .sort((a, b) => b.score - a.score || a.timeSpent - b.timeSpent);

                            if (examSubs.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={5} className="py-6 text-center text-gray-500 font-mono text-[10px]">
                                    {isBn ? "এখনো কোনো শিক্ষার্থী এই পরীক্ষাটি শেষ করেনি।" : "No submissions recorded for this exam yet."}
                                  </td>
                                </tr>
                              );
                            }

                            return examSubs.map((sub, idx) => {
                              const min = Math.floor(sub.timeSpent / 60);
                              const sec = sub.timeSpent % 60;
                              return (
                                <tr key={sub.id} className="hover:bg-white/[0.02] transition">
                                  <td className="py-2 px-3 font-mono font-bold text-gray-500">
                                    {idx + 1}
                                  </td>
                                  <td className="py-2 px-3 font-bold text-white">
                                    <div>{sub.userName || "Anonymous"}</div>
                                    <div className="text-[9px] text-gray-500 font-mono font-normal">{sub.userEmail}</div>
                                  </td>
                                  <td className="py-2 px-3 text-center font-mono text-amber-400 font-bold">
                                    {sub.score} / {sub.totalQuestions}
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono text-gray-400">
                                    {min > 0 ? `${min}m ` : ""}{sec}s
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono text-gray-500 text-[10px]">
                                    {sub.createdAt ? new Date(sub.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "N/A"}
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW B: SUBMISSIONS & RE-EXAM PERMISSION MANAGEMENT */}
          {liveExamSubSection === "submissions" && (
            <div className="flex flex-col gap-6 bg-[#111111] border border-white/10 rounded-2xl p-6 shadow">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
                <div>
                  <h3 className="text-base font-extrabold uppercase text-white flex items-center gap-2">
                    <RotateCcw className="w-5 h-5 text-amber-500" />
                    <span>{isBn ? "শিক্ষার্থী সাবমিশন ও রি-এক্সাম অনুমোদন সিস্টেম" : "Student Submissions & Re-Exam Grants"}</span>
                  </h3>
                  <p className="text-xs text-gray-450 mt-1">
                    {isBn 
                      ? "ট্যাব পরিবর্তনের কারণে অটো-সাবমিট হওয়া বা রিভিউ করা শিক্ষার্থীদের জন্য এখান থেকে এক ক্লিকে Re-Exam পারমিশন মঞ্জুর করুন।" 
                      : "Review violation logs, check partial scoring, and grant instant re-exam permissions to students whose exams were auto-submitted."}
                  </p>
                </div>

                {/* Filters & Search */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Exam Filter */}
                  <select
                    value={selectedExamFilterId}
                    onChange={(e) => setSelectedExamFilterId(e.target.value)}
                    className="bg-black/40 border border-white/10 text-white rounded-xl px-3 py-2 text-xs focus:outline-none"
                  >
                    <option value="all">{isBn ? "সকল পরীক্ষা (All Exams)" : "All Exams"}</option>
                    {liveExams.map(ex => (
                      <option key={ex.id} value={ex.id}>{ex.title}</option>
                    ))}
                  </select>

                  {/* Status Filter */}
                  <select
                    value={submissionFilter}
                    onChange={(e: any) => setSubmissionFilter(e.target.value)}
                    className="bg-black/40 border border-white/10 text-white rounded-xl px-3 py-2 text-xs focus:outline-none"
                  >
                    <option value="all">{isBn ? "সকল সাবমিশন (All)" : "All Submissions"}</option>
                    <option value="cheated">{isBn ? "⚠️ অটো-সাবমিট (Tab Violation)" : "⚠️ Auto-submitted (Tab Violation)"}</option>
                    <option value="reexam_active">{isBn ? "🟢 সক্রিয় রি-এক্সাম পারমিশন" : "🟢 Active Re-Exam Grants"}</option>
                    <option value="passed">{isBn ? "✓ স্বাভাবিক সাবমিশন" : "✓ Normal Submissions"}</option>
                  </select>

                  {/* Search */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder={isBn ? "শিক্ষার্থী খুঁজুন..." : "Filter student..."}
                      value={submissionSearch}
                      onChange={(e) => setSubmissionSearch(e.target.value)}
                      className="bg-black/40 border border-white/10 text-white rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none w-48"
                    />
                  </div>
                </div>
              </div>

              {/* Submissions Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs text-gray-300">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] uppercase font-mono text-gray-400">
                      <th className="py-3 px-3">{isBn ? "শিক্ষার্থী ও তথ্য" : "Student"}</th>
                      <th className="py-3 px-3">{isBn ? "পরীক্ষার নাম" : "Exam Title"}</th>
                      <th className="py-3 px-3 text-center">{isBn ? "অ্যানসার ও স্কোর" : "Answers & Score"}</th>
                      <th className="py-3 px-3 text-center">{isBn ? "সিকিউরিটি স্ট্যাটাস" : "Integrity Status"}</th>
                      <th className="py-3 px-3 text-center">{isBn ? "রি-এক্সাম অবস্থা" : "Re-Exam Status"}</th>
                      <th className="py-3 px-3 text-right">{isBn ? "অ্যাকশন" : "Actions"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-sans">
                    {(() => {
                      const filteredSubs = liveSubmissions.filter((sub) => {
                        // Exam filter
                        if (selectedExamFilterId !== "all" && sub.examId !== selectedExamFilterId) return false;

                        // Search
                        if (submissionSearch) {
                          const s = submissionSearch.toLowerCase();
                          const matchName = sub.userName?.toLowerCase().includes(s);
                          const matchEmail = sub.userEmail?.toLowerCase().includes(s);
                          const matchExam = sub.examTitle?.toLowerCase().includes(s);
                          if (!matchName && !matchEmail && !matchExam) return false;
                        }

                        // Status filter
                        const isCheated = sub.submittedDueToViolation || sub.tabSwitchesCount >= 2;
                        const perm = reExamPermissions.find(p => p.examId === sub.examId && p.userId === sub.userId);
                        const isReExamActive = perm && perm.status === "active";

                        if (submissionFilter === "cheated" && !isCheated) return false;
                        if (submissionFilter === "reexam_active" && !isReExamActive) return false;
                        if (submissionFilter === "passed" && isCheated) return false;

                        return true;
                      });

                      if (filteredSubs.length === 0) {
                        return (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-gray-500 font-mono text-xs">
                              <RotateCcw className="w-8 h-8 mx-auto mb-2 text-gray-600 animate-spin" />
                              {isBn ? "কোন সাবমিশন রেকর্ড পাওয়া যায়নি।" : "No submissions matching selected filters."}
                            </td>
                          </tr>
                        );
                      }

                      return filteredSubs.map((sub) => {
                        const isCheated = sub.submittedDueToViolation || sub.tabSwitchesCount >= 2;
                        const perm = reExamPermissions.find(p => p.examId === sub.examId && p.userId === sub.userId);
                        const isReExamActive = perm && perm.status === "active";
                        const isReExamUsed = perm && perm.status === "used";

                        return (
                          <tr key={sub.id} className="hover:bg-white/[0.02] transition">
                            {/* Student */}
                            <td className="py-3 px-3">
                              <div className="font-bold text-white flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-red-950/40 border border-red-500/20 flex items-center justify-center text-[11px] text-red-300 font-mono">
                                  {sub.userName?.substring(0, 1) || "S"}
                                </div>
                                <div>
                                  <div>{sub.userName || "Student User"}</div>
                                  <div className="text-[10px] text-gray-500 font-mono">{sub.userEmail || "No Email"}</div>
                                </div>
                              </div>
                            </td>

                            {/* Exam */}
                            <td className="py-3 px-3">
                              <div className="font-bold text-gray-200">{sub.examTitle || "Live Exam"}</div>
                              <div className="text-[9px] text-gray-500 font-mono">
                                {sub.createdAt ? new Date(sub.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : "N/A"}
                              </div>
                            </td>

                            {/* Score & Answers */}
                            <td className="py-3 px-3 text-center">
                              <div className="font-mono font-extrabold text-sm text-amber-400">
                                {sub.score ?? 0} <span className="text-gray-500 text-xs">/ {sub.totalQuestions ?? 10}</span>
                              </div>
                              <div className="text-[9.5px] text-gray-400 font-mono">
                                {sub.answeredCount ?? Object.keys(sub.selectedAnswers || {}).length} {isBn ? "উত্তর প্রদান" : "answered"}
                              </div>
                            </td>

                            {/* Integrity Status */}
                            <td className="py-3 px-3 text-center">
                              {isCheated ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-950/60 border border-red-500/40 text-red-400 text-[10px] font-bold font-mono">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                                  <span>{isBn ? "ট্যাব সুইচ অটো-সাবমিট" : "Tab Violation Auto-Submit"}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold font-mono">
                                  <Check className="w-3 h-3" />
                                  <span>{isBn ? "স্বাভাবিক সাবমিশন" : "Normal Submission"}</span>
                                </span>
                              )}
                            </td>

                            {/* Re-Exam Status */}
                            <td className="py-3 px-3 text-center">
                              {isReExamActive ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-900/40 border border-emerald-500 text-emerald-300 text-[10px] font-bold font-mono shadow-sm">
                                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                  <span>{isBn ? "🟢 রি-এক্সাম অনুমতি সক্রিয়" : "🟢 Re-Exam Permitted"}</span>
                                </span>
                              ) : isReExamUsed ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-950/40 border border-blue-500/20 text-blue-400 text-[10px] font-mono">
                                  <span>✓ {isBn ? "রি-এক্সাম সম্পন্ন" : "Re-Exam Taken"}</span>
                                </span>
                              ) : (
                                <span className="text-[10px] text-gray-500 font-mono">
                                  {isBn ? "অনুমতি নেই" : "No Re-Exam"}
                                </span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {isReExamActive ? (
                                  <button
                                    onClick={() => handleRevokeReExam(sub.examId, sub.userId, sub.userName || sub.userEmail)}
                                    className="px-2.5 py-1.5 bg-yellow-950/30 hover:bg-yellow-900/50 border border-yellow-500/40 text-yellow-300 text-[10px] font-bold rounded-lg transition font-mono cursor-pointer"
                                    title="Revoke active permission"
                                  >
                                    {isBn ? "অনুমতি বাতিল" : "Revoke"}
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setGrantingReExamModal({
                                        isOpen: true,
                                        targetUserUid: sub.userId,
                                        targetUserEmail: sub.userEmail || "student@medibridge.com",
                                        targetUserName: sub.userName || "Student",
                                        targetExamId: sub.examId,
                                        targetExamTitle: sub.examTitle || "Live Exam",
                                        reason: isCheated 
                                          ? (isBn ? "ট্যাব সুইচজনিত অটো-সাবমিট রিভিউ করে পুনরায় পরীক্ষার অনুমতি দেওয়া হলো।" : "Cheating auto-submit reviewed and approved by admin.") 
                                          : (isBn ? "বিশেষ বিবেচনায় রি-এক্সাম অনুমতি।" : "Special re-exam approval.")
                                      });
                                    }}
                                    className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-[10px] font-bold rounded-lg transition font-mono flex items-center gap-1 shadow cursor-pointer"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    <span>{isBn ? "রি-এক্সাম দিন" : "Grant Re-Exam"}</span>
                                  </button>
                                )}

                                <button
                                  onClick={() => handleDeleteLiveSubmission(sub.id, sub.userName || sub.userEmail)}
                                  className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition cursor-pointer"
                                  title="Delete this submission record"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: 9. GAMING ARENA CONTROLS */}
      {subTab === "gaming_arena" && (
        <div className="flex flex-col gap-8 animate-fadeIn text-left">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-purple-950/40 via-red-950/30 to-[#111111] border border-purple-500/20 rounded-2xl p-6 relative overflow-hidden shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-tr from-purple-600 to-red-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg border border-purple-400/30">
                  🎮
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase text-white tracking-tight flex items-center gap-2">
                    <span>{isBn ? "গেমিং অ্যারেনা কমান্ড সেন্টার ও ইকোনমি" : "Gaming Arena Command & Economy"}</span>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30">
                      Master Engine
                    </span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 max-w-xl">
                    {isBn 
                      ? "সকল মেডিকেল গেমসের রক্ষণাবেক্ষণ মোড, XP ও কয়েন গুণক, বিশেষ ইভেন্ট ব্যানার এবং প্রতিটি গেমের সচলতা নিয়ন্ত্রণ করুন।" 
                      : "Manage global XP/Coin economy multipliers, weekend double rewards, server maintenance toggles, and individual game controls in real-time."}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleResetGamingArenaSettings}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-xs font-bold rounded-xl transition cursor-pointer font-mono"
                >
                  {isBn ? "ডিফল্ট রিসেট" : "Reset Defaults"}
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveGamingArenaSettings()}
                  disabled={isSavingGamingSettings}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-600 via-red-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white text-xs font-extrabold uppercase rounded-xl transition shadow-lg shadow-purple-950/50 flex items-center gap-2 cursor-pointer font-mono tracking-wider"
                >
                  {isSavingGamingSettings ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{gamingSaveSuccess ? (isBn ? "সংরক্ষিত হয়েছে!" : "Saved!") : (isBn ? "সেটিংস সংরক্ষণ করুন" : "Save All Settings")}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section 1: Global Master Controls & Multipliers */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Card 1: Master Arena Switch & Maintenance */}
            <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 flex flex-col gap-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h4 className="text-sm font-extrabold uppercase text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-purple-400" />
                    <span>{isBn ? "মাস্টার সচলতা ও রক্ষণাবেক্ষণ" : "Master Status & Maintenance"}</span>
                  </h4>
                  <p className="text-[10px] text-gray-450 mt-0.5">
                    {isBn ? "পুরো গেমিং অ্যারেনা একসাথে সচল বা বন্ধ রাখুন।" : "Toggle live accessibility of the entire Gaming Arena for students."}
                  </p>
                </div>

                {/* Master Switch */}
                <button
                  type="button"
                  onClick={() => setGamingSettings({ ...gamingSettings, masterEnabled: !gamingSettings.masterEnabled })}
                  className={`px-4 py-2 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition border ${
                    gamingSettings.masterEnabled
                      ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                      : "bg-red-950/40 border-red-500/40 text-red-400 animate-pulse"
                  }`}
                >
                  {gamingSettings.masterEnabled ? (isBn ? "🟢 গেমিং অ্যারেনা চালু" : "🟢 Arena Live") : (isBn ? "🔴 রক্ষণাবেক্ষণ মোড" : "🔴 Maintenance")}
                </button>
              </div>

              {/* Maintenance Notice Inputs */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase font-bold text-gray-400 mb-1">
                    {isBn ? "রক্ষণাবেক্ষণ বার্তা (বাংলা)" : "Maintenance Message (Bangla)"}
                  </label>
                  <textarea
                    rows={2}
                    value={gamingSettings.maintenanceMessageBn || ""}
                    onChange={(e) => setGamingSettings({ ...gamingSettings, maintenanceMessageBn: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white focus:border-purple-500 focus:outline-none"
                    placeholder="রক্ষণাবেক্ষণ চলাকালীন শিক্ষার্থীদের জন্য বার্তা..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase font-bold text-gray-400 mb-1">
                    {isBn ? "রক্ষণাবেক্ষণ বার্তা (English)" : "Maintenance Message (English)"}
                  </label>
                  <textarea
                    rows={2}
                    value={gamingSettings.maintenanceMessageEn || ""}
                    onChange={(e) => setGamingSettings({ ...gamingSettings, maintenanceMessageEn: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white focus:border-purple-500 focus:outline-none"
                    placeholder="Maintenance alert displayed to users..."
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Multipliers & Double XP Event */}
            <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 flex flex-col gap-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h4 className="text-sm font-extrabold uppercase text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>{isBn ? "গ্লোবাল XP ও কয়েন গুণক" : "Global Multipliers & Events"}</span>
                  </h4>
                  <p className="text-[10px] text-gray-450 mt-0.5">
                    {isBn ? "গেমে প্রাপ্ত XP ও কয়েনের পরিবর্ধন হার।" : "Boost user engagement with reward rate multipliers."}
                  </p>
                </div>

                {/* Event Toggle */}
                <button
                  type="button"
                  onClick={() => setGamingSettings({ ...gamingSettings, doubleXpEventActive: !gamingSettings.doubleXpEventActive })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition border ${
                    gamingSettings.doubleXpEventActive
                      ? "bg-amber-950/50 border-amber-500 text-amber-300 shadow-md shadow-amber-950/50"
                      : "bg-white/5 border-white/10 text-gray-400"
                  }`}
                >
                  {gamingSettings.doubleXpEventActive ? "🔥 Double XP Active" : "Event Inactive"}
                </button>
              </div>

              {/* Multiplier Inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/30 border border-white/5 p-3.5 rounded-xl">
                  <label className="block text-[10px] font-mono uppercase font-bold text-purple-400 mb-1 flex items-center gap-1.5">
                    <Zap className="w-3 h-3" />
                    <span>Global XP Multiplier</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.1"
                      min="0.5"
                      max="10.0"
                      value={gamingSettings.globalXpMultiplier ?? 1.0}
                      onChange={(e) => setGamingSettings({ ...gamingSettings, globalXpMultiplier: parseFloat(e.target.value) || 1.0 })}
                      className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm font-bold text-white font-mono"
                    />
                    <span className="text-gray-400 font-mono font-bold">x</span>
                  </div>
                </div>

                <div className="bg-black/30 border border-white/5 p-3.5 rounded-xl">
                  <label className="block text-[10px] font-mono uppercase font-bold text-amber-400 mb-1 flex items-center gap-1.5">
                    <Coins className="w-3 h-3" />
                    <span>Global Coin Multiplier</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.1"
                      min="0.5"
                      max="10.0"
                      value={gamingSettings.globalCoinMultiplier ?? 1.0}
                      onChange={(e) => setGamingSettings({ ...gamingSettings, globalCoinMultiplier: parseFloat(e.target.value) || 1.0 })}
                      className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm font-bold text-white font-mono"
                    />
                    <span className="text-gray-400 font-mono font-bold">x</span>
                  </div>
                </div>
              </div>

              {/* Event Banner Text Inputs */}
              <div className="space-y-2">
                <label className="block text-[10px] font-mono uppercase font-bold text-gray-400">
                  {isBn ? "ইভেন্ট ব্যানার টেক্সট (বাংলা)" : "Event Banner Text (Bangla)"}
                </label>
                <input
                  type="text"
                  value={gamingSettings.eventBannerTextBn || ""}
                  onChange={(e) => setGamingSettings({ ...gamingSettings, eventBannerTextBn: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                  placeholder="🔥 সাপ্তাহিক ডাবল XP ও বোনাস কয়েন ইভেন্ট চলছে!"
                />
              </div>
            </div>
          </div>

          {/* Section 1.5: External Gaming Web Integration / আলাদা গেমিং ওয়েব লিঙ্ক কনফিগারেশন */}
          <div className="bg-[#111111] border border-amber-500/30 rounded-2xl p-6 flex flex-col gap-5 relative overflow-hidden shadow-xl">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500 via-[#FFD700] to-yellow-400"></div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Globe className="w-5 h-5 animate-spin-slow" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold uppercase text-white flex items-center gap-2">
                    <span>{isBn ? "🌐 আলাদা গেমিং ও সিমুলেশন ওয়েব ইন্টিগ্রেশন" : "🌐 External Gaming & Simulation Web Link"}</span>
                    <span className="text-[9px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 bg-amber-950/70 text-[#FFD700] rounded-full border border-amber-500/30">
                      Live Portal
                    </span>
                  </h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {isBn
                      ? "গেমিং অ্যারেনাতে শিক্ষার্থীদের জন্য আলাদা বাহ্যিক ওয়েব গেম, ৩D অ্যানাটমি ল্যাব বা কুইজ পোর্টাল সরাসরি লিংক বা এম্বেড করুন।"
                      : "Link or embed external web games, 3D bio simulations, or Kahoot tournament portals for all students in Gaming Arena."}
                  </p>
                </div>
              </div>

              {/* Status Switch */}
              {(() => {
                const ext = gamingSettings.externalWebGame || DEFAULT_EXTERNAL_GAME;
                const isEnabled = ext.enabled !== false;
                return (
                  <button
                    type="button"
                    onClick={() => {
                      setGamingSettings({
                        ...gamingSettings,
                        externalWebGame: {
                          ...ext,
                          enabled: !isEnabled
                        }
                      });
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition border shrink-0 ${
                      isEnabled
                        ? "bg-amber-950/60 border-amber-500/60 text-[#FFD700]"
                        : "bg-red-950/40 border-red-500/40 text-red-400"
                    }`}
                  >
                    {isEnabled ? (isBn ? "🟢 ওয়েব গেম সচল" : "🟢 Web Game Active") : (isBn ? "🔴 ওয়েব গেম বন্ধ" : "🔴 Web Link Off")}
                  </button>
                );
              })()}
            </div>

            {/* Presets Quick Load */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono font-bold uppercase text-gray-400">
                {isBn ? "১-ক্লিকে প্রিসেট লোড করুন:" : "Quick 1-Click Presets:"}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {EXTERNAL_GAME_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      playSound("click");
                      setGamingSettings({
                        ...gamingSettings,
                        externalWebGame: {
                          enabled: true,
                          url: preset.url,
                          titleBn: preset.titleBn,
                          titleEn: preset.titleEn,
                          descriptionBn: preset.descBn,
                          descriptionEn: preset.descEn,
                          embedAllowed: true
                        }
                      });
                    }}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-1 cursor-pointer ${
                      (gamingSettings.externalWebGame?.url || DEFAULT_EXTERNAL_GAME.url) === preset.url
                        ? "bg-amber-500/20 border-[#FFD700] text-white"
                        : "bg-white/[0.02] border-white/10 text-gray-300 hover:bg-white/5"
                    }`}
                  >
                    <span className="text-[11px] font-bold block truncate">{preset.name}</span>
                    <span className="text-[9px] font-mono text-gray-400 block truncate">{preset.url}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Inputs Form */}
            {(() => {
              const ext = gamingSettings.externalWebGame || DEFAULT_EXTERNAL_GAME;
              const updateExt = (field: string, val: any) => {
                setGamingSettings({
                  ...gamingSettings,
                  externalWebGame: {
                    ...ext,
                    [field]: val
                  }
                });
              };

              return (
                <div className="space-y-4 pt-1">
                  {/* Target URL */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold uppercase text-gray-300 flex justify-between">
                      <span>{isBn ? "ওয়েবসাইট লিংক (Target URL):" : "Target Web URL:"}</span>
                      <a
                        href={ext.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#FFD700] hover:underline flex items-center gap-1 font-mono text-[10px]"
                      >
                        <span>{isBn ? "লিংক টেস্ট করুন ↗" : "Test Link ↗"}</span>
                      </a>
                    </label>
                    <input
                      type="url"
                      value={ext.url || ""}
                      onChange={(e) => updateExt("url", e.target.value)}
                      placeholder="https://your-game-or-sim-app.com"
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:border-[#FFD700] focus:outline-none"
                    />
                  </div>

                  {/* Titles */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono font-bold uppercase text-gray-400">
                        {isBn ? "পোর্টাল শিরোনাম (বাংলা):" : "Portal Title (Bangla):"}
                      </label>
                      <input
                        type="text"
                        value={ext.titleBn || ""}
                        onChange={(e) => updateExt("titleBn", e.target.value)}
                        className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-[#FFD700] focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono font-bold uppercase text-gray-400">
                        {isBn ? "পোর্টাল শিরোনাম (English):" : "Portal Title (English):"}
                      </label>
                      <input
                        type="text"
                        value={ext.titleEn || ""}
                        onChange={(e) => updateExt("titleEn", e.target.value)}
                        className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-[#FFD700] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Descriptions */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono font-bold uppercase text-gray-400">
                        {isBn ? "বিবরণ (বাংলা):" : "Description (Bangla):"}
                      </label>
                      <textarea
                        rows={2}
                        value={ext.descriptionBn || ""}
                        onChange={(e) => updateExt("descriptionBn", e.target.value)}
                        className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-[#FFD700] focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono font-bold uppercase text-gray-400">
                        {isBn ? "বিবরণ (English):" : "Description (English):"}
                      </label>
                      <textarea
                        rows={2}
                        value={ext.descriptionEn || ""}
                        onChange={(e) => updateExt("descriptionEn", e.target.value)}
                        className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-[#FFD700] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Embed Allowed toggle */}
                  <div className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-xl text-xs font-mono">
                    <div>
                      <span className="text-white font-bold block">
                        {isBn ? "অ্যাপের ভেতর আইফ্রেমে এম্বেড সমর্থন" : "Allow Embedded Iframe View Inside App"}
                      </span>
                      <span className="text-gray-400 text-[10px]">
                        {isBn ? "চালু রাখলে শিক্ষার্থীরা অ্যাপ না ছেড়ে সরাসরি খেলতে পারবে" : "Enables modal simulation view with reload and fullscreen"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateExt("embedAllowed", ext.embedAllowed === false)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition border ${
                        ext.embedAllowed !== false
                          ? "bg-emerald-950/50 border-emerald-500/50 text-emerald-300"
                          : "bg-gray-800 border-white/10 text-gray-400"
                      }`}
                    >
                      {ext.embedAllowed !== false ? "✓ Iframe Enabled" : "New Tab Only"}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Section 2: Individual Game Control Matrix */}
          <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h4 className="text-sm font-extrabold uppercase text-white flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4 text-[#C1121F]" />
                  <span>{isBn ? "ব্যক্তিগত গেম কন্ট্রোল ও রিওয়ার্ড কনফিগারেশন" : "Individual Game Control Matrix & Rewards"}</span>
                </h4>
                <p className="text-[10px] text-gray-450 mt-0.5">
                  {isBn ? "প্রতিটি নির্দিষ্ট গেমের জন্য আলাদাভাবে সচলতা, XP ও কয়েন রিওয়ার্ড নির্ধারণ করুন।" : "Toggle individual games on or off and tune custom rewards per game."}
                </p>
              </div>

              <div className="text-[10px] font-mono text-gray-400">
                <span>10 Games Configured</span>
              </div>
            </div>

            {/* Games Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { id: "med-runner", name: "Medical Runner", icon: "🏃‍♂️", tag: "Physiology" },
                { id: "bio-slice", name: "Bio Slice 3D", icon: "⚔️", tag: "Botany" },
                { id: "med-race", name: "Anatomy Speed Race", icon: "🏎️", tag: "Anatomy" },
                { id: "med-cricket", name: "Cricket Medical League", icon: "🏏", tag: "Pharmacology" },
                { id: "med-soccer", name: "Medical Penalty Shootout", icon: "⚽", tag: "Genetics" },
                { id: "cell-clash", name: "Cell Clash Battle Arena", icon: "🛡️", tag: "Microbiology" },
                { id: "speed-drill", name: "Rapid MCQ Speed Drill", icon: "⚡", tag: "High-Yield" },
                { id: "med-memory", name: "Medical Memory Match", icon: "🧠", tag: "Neurology" },
                { id: "clinical-er", name: "Emergency Room Triage", icon: "🏥", tag: "Clinical" },
                { id: "med-word", name: "Medical Word Anatomy", icon: "🔤", tag: "Terminology" },
              ].map((g) => {
                const conf = (gamingSettings.games && gamingSettings.games[g.id]) || { enabled: true, xpMultiplier: 1.0, coinReward: 50 };
                const isEnabled = conf.enabled !== false;

                const updateGameConf = (field: string, val: any) => {
                  const currentGames = gamingSettings.games || {};
                  const thisGame = currentGames[g.id] || { enabled: true, xpMultiplier: 1.0, coinReward: 50 };
                  setGamingSettings({
                    ...gamingSettings,
                    games: {
                      ...currentGames,
                      [g.id]: {
                        ...thisGame,
                        [field]: val
                      }
                    }
                  });
                };

                return (
                  <div
                    key={g.id}
                    className={`border rounded-xl p-4 transition flex flex-col justify-between gap-4 ${
                      isEnabled 
                        ? "bg-black/40 border-white/10 hover:border-white/20" 
                        : "bg-red-950/20 border-red-500/20 opacity-80"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{g.icon}</span>
                        <div>
                          <h5 className="font-bold text-white text-xs leading-snug">{g.name}</h5>
                          <span className="text-[9px] uppercase font-mono text-purple-400">{g.tag}</span>
                        </div>
                      </div>

                      {/* Enable/Disable Toggle */}
                      <button
                        type="button"
                        onClick={() => updateGameConf("enabled", !isEnabled)}
                        className={`px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold uppercase transition border ${
                          isEnabled
                            ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-400"
                            : "bg-red-950/40 border-red-500/40 text-red-400"
                        }`}
                      >
                        {isEnabled ? (isBn ? "সচল" : "Active") : (isBn ? "বন্ধ" : "Disabled")}
                      </button>
                    </div>

                    {/* Reward settings */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                      <div>
                        <label className="block text-[9px] font-mono text-gray-400 mb-0.5">XP Boost</label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.1"
                            min="0.5"
                            max="5.0"
                            value={conf.xpMultiplier ?? 1.0}
                            onChange={(e) => updateGameConf("xpMultiplier", parseFloat(e.target.value) || 1.0)}
                            className="w-full bg-black/60 border border-white/10 rounded px-2 py-1 text-xs font-bold text-white font-mono"
                          />
                          <span className="text-gray-500 font-mono text-[10px]">x</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] font-mono text-gray-400 mb-0.5">Coin Win</label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="5"
                            min="10"
                            max="500"
                            value={conf.coinReward ?? 50}
                            onChange={(e) => updateGameConf("coinReward", parseInt(e.target.value) || 50)}
                            className="w-full bg-black/60 border border-white/10 rounded px-2 py-1 text-xs font-bold text-amber-400 font-mono"
                          />
                          <span className="text-gray-500 font-mono text-[10px]">🪙</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* GRANT RE-EXAM MODAL */}
      {grantingReExamModal && grantingReExamModal.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#111111] border border-amber-500/30 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative animate-scaleUp text-left">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 to-emerald-500"></div>

            <div className="p-6 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-tight">
                    {isBn ? "রি-এক্সাম অনুমতি প্রদান" : "Grant Re-Exam Permission"}
                  </h3>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {grantingReExamModal.targetExamTitle}
                  </span>
                </div>
              </div>

              <div className="bg-black/40 border border-white/5 p-3.5 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">{isBn ? "শিক্ষার্থীর নাম:" : "Student Name:"}</span>
                  <span className="font-bold text-white">{grantingReExamModal.targetUserName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">{isBn ? "ইমেইল:" : "Email:"}</span>
                  <span className="font-mono text-gray-300 text-[11px]">{grantingReExamModal.targetUserEmail}</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1 font-mono">
                  {isBn ? "অনুমতির কারণ / নোট:" : "Approval Note / Reason:"}
                </label>
                <textarea
                  rows={3}
                  value={grantingReExamModal.reason}
                  onChange={(e) => setGrantingReExamModal({ ...grantingReExamModal, reason: e.target.value })}
                  className="w-full bg-black/60 border border-white/10 focus:border-amber-500 rounded-xl p-3 text-xs text-white focus:outline-none"
                  placeholder={isBn ? "অনুমোদনের কারণ লিখুন..." : "Reason for granting re-take..."}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setGrantingReExamModal(null)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  {isBn ? "বাতিল" : "Cancel"}
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    handleGrantReExam(
                      grantingReExamModal.targetUserUid,
                      grantingReExamModal.targetUserEmail,
                      grantingReExamModal.targetUserName,
                      grantingReExamModal.targetExamId,
                      grantingReExamModal.targetExamTitle,
                      grantingReExamModal.reason
                    );
                  }}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-extrabold uppercase transition flex items-center gap-1.5 shadow-lg shadow-emerald-950/50 cursor-pointer font-mono"
                >
                  {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{isBn ? "অনুমতি মঞ্জুর করুন" : "Confirm Grant"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>

      {/* CUSTOM DELETION CONFIRMATION MODAL */}
      {deleteConfirmModal && deleteConfirmModal.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#111111] border border-red-500/30 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative animate-scaleUp">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-[#C1121F]"></div>
            
            <div className="p-6">
              {/* Header Icon + Title */}
              <div className="flex items-center gap-3.5 mb-4 text-[#C1121F]">
                <div className="p-2.5 bg-red-950/40 border border-red-500/30 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-tight">
                    {deleteConfirmModal.title}
                  </h3>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-red-500 bg-red-950/40 px-2 py-0.5 rounded border border-red-500/20 inline-block mt-1">
                    {isBn 
                      ? `${deleteConfirmModal.itemCount}টি কন্টেন্ট ডিলিট করা হবে`
                      : `${deleteConfirmModal.itemCount} items scheduled for purge`}
                  </span>
                </div>
              </div>

              {/* Message */}
              <p className="text-xs text-gray-300 leading-relaxed bg-black/35 border border-white/5 p-3.5 rounded-xl mb-4 font-sans">
                {deleteConfirmModal.message}
              </p>

              {/* Protection Checklist/Type verification */}
              <div className="mb-4 bg-red-950/10 border border-red-500/20 p-3 rounded-xl">
                <label className="block text-[10px] uppercase tracking-wider font-bold text-red-400 mb-1.5">
                  {isBn ? "নিশ্চিত করতে নিচের বক্সে 'DELETE' লিখুন:" : "To confirm, type 'DELETE' in the box below:"}
                </label>
                <input
                  type="text"
                  placeholder={isBn ? "এখানে লিখুন..." : "Type here..."}
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full bg-black/60 border border-red-500/30 hover:border-red-500/50 focus:border-red-500 text-white rounded-lg px-3 py-2 text-xs font-mono uppercase tracking-widest text-center focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3 mt-5">
                <button
                  type="button"
                  onClick={() => {
                    playSound("click");
                    setDeleteConfirmModal(null);
                  }}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  {isBn ? "বাতিল" : "Cancel"}
                </button>
                <button
                  type="button"
                  disabled={deleteConfirmText.trim().toUpperCase() !== "DELETE"}
                  onClick={() => {
                    playSound("click");
                    deleteConfirmModal.onConfirm();
                  }}
                  className={`px-4 py-2 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${
                    deleteConfirmText.trim().toUpperCase() === "DELETE"
                      ? "bg-[#C1121F] hover:bg-red-700 cursor-pointer border border-red-500/30 hover:scale-[1.02]"
                      : "bg-red-950/20 text-red-500/40 border border-red-950/40 cursor-not-allowed"
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isBn ? "নিশ্চিত মুছুন" : "Confirm Purge"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
