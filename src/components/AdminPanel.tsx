import React, { useState, useEffect, useRef } from "react";
import { db, handleFirestoreError, OperationType } from "../firebase";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  limit,
  serverTimestamp,
  orderBy,
  setDoc,
  getDocs,
  where,
  arrayUnion,
} from "firebase/firestore";
import { UserProfile, Question, AdminNotice } from "../types";
import { STARTER_QUESTIONS } from "../questionsData";
import QuestionImporter from "./QuestionImporter";
import AdManager from "./AdManager";
import TeacherManager from "./courses/TeacherManager";
import AdminNotificationPanel from "./notifications/AdminNotificationPanel";
import PromoCodeManager from "./admin/PromoCodeManager";
import GameQuestionsManager from "./admin/GameQuestionsManager";
import GamingAssetManager from "./admin/GamingAssetManager";
import CourseManager from "./admin/CourseManager";
import OurHeroesManager from "./admin/OurHeroesManager";
import QuestionBankManager from "./admin/QuestionBankManager";
import QuestionBankSelectorModal from "./admin/QuestionBankSelectorModal";
import ExamQuestionListManager from "./admin/ExamQuestionListManager";
import { recordExamQuestionUsage } from "../lib/questionBankService";
import { NotificationService } from "../lib/notificationService";
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
  CreditCard,
  Megaphone,
  Bot,
  MessageSquare,
  Sparkles,
  X,
  Camera,
  Upload,
  Loader2,
  Rocket,
  Clock,
  Target,
  CheckCircle2,
  Volume2,
  Eye,
  RefreshCw,
  Sliders,
  Filter,
  Layers,
  ShieldCheck,
  EyeOff,
  Lock,
  Tag,
  Gamepad2,
  Phone,
} from "lucide-react";
import {
  subscribeToExamSecuritySettings,
  saveExamSecuritySettings,
  subscribeToExamViolations,
  DEFAULT_SECURITY_SETTINGS
} from "../lib/examSecurityService";
import { LiveExamSecuritySettings, ExamViolationRecord, Course, Batch } from "../types/courseTypes";
import BatchEventCountdownTimer from "./courses/BatchEventCountdownTimer";
import SupabaseMigrationHub from "./admin/SupabaseMigrationHub";

interface AdminPanelProps {
  user: UserProfile;
  theme?: "light" | "dark";
  courses?: Course[];
  batches?: Batch[];
  onUpdateCourse?: (course: Course) => void;
}

type AdminTab = "questions" | "courses" | "heroes" | "importer" | "users" | "chapters" | "bosses" | "challenges" | "exambatch" | "analytics" | "notices" | "payments" | "advertisements" | "mentor" | "premium" | "teachers" | "notifications" | "promocodes" | "gamequestions" | "gamingassets" | "migration";

export default function AdminPanel({ user, theme = "dark", courses = [], batches = [], onUpdateCourse }: AdminPanelProps) {
  const isDark = theme === "dark";
  // Access check
  const hasAccess = user.role === "admin" || user.role === "superadmin" || user.role === "moderator" || user.email === "nuwaisirhoquesbmc@gmail.com" || user.email === "hoquenuwaisir@gmail.com" || sessionStorage.getItem("mb_superadmin_verified") === "true";

  const [activeTab, setActiveTab] = useState<AdminTab>("questions");

  // Real-time collections states
  const [questions, setQuestions] = useState<Question[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [notices, setNotices] = useState<AdminNotice[]>([]);
  const [mentorQueries, setMentorQueries] = useState<any[]>([]);
  const [markPredictions, setMarkPredictions] = useState<any[]>([]);
  const [liveExams, setLiveExams] = useState<any[]>([]);
  const [liveSubmissions, setLiveSubmissions] = useState<any[]>([]);

  // Exam Batch Launch Form states
  const PRESET_COVER_PHOTOS = [
    {
      name: "Medical Stethoscope",
      url: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80",
    },
    {
      name: "DNA & Biology Lab",
      url: "https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=800&auto=format&fit=crop&q=80",
    },
    {
      name: "Medical Science & Lab",
      url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&auto=format&fit=crop&q=80",
    },
    {
      name: "Doctor & Medical Campus",
      url: "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800&auto=format&fit=crop&q=80",
    },
  ];

  const [newBatchTitle, setNewBatchTitle] = useState("");
  const [newBatchDescription, setNewBatchDescription] = useState("Comprehensive Live Model Test & Solution Batch for Medical Aspirants");
  const [newBatchPrice, setNewBatchPrice] = useState<number>(499);
  const [newBatchOriginalPrice, setNewBatchOriginalPrice] = useState<number>(999);
  const [newBatchStartDate, setNewBatchStartDate] = useState<string>("2026-08-15");
  const [newBatchCoverImage, setNewBatchCoverImage] = useState<string>("https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80");
  const [newBatchSubject, setNewBatchSubject] = useState("Biology");
  const [newBatchChapter, setNewBatchChapter] = useState("All");
  const [newBatchTargetGroup, setNewBatchTargetGroup] = useState("Medical Admission Paid Batch 2026");
  const [newBatchDuration, setNewBatchDuration] = useState<number>(20);
  const [newBatchQuestionsCount, setNewBatchQuestionsCount] = useState<number>(20);
  const [newBatchNegMarking, setNewBatchNegMarking] = useState<number>(0.25);
  const [newBatchPassMarkPercent, setNewBatchPassMarkPercent] = useState<number>(40);
  const [newBatchPasscode, setNewBatchPasscode] = useState("");
  const [newBatchSelectionMode, setNewBatchSelectionMode] = useState<"auto" | "manual">("auto");
  const [newBatchManualQIds, setNewBatchManualQIds] = useState<string[]>([]);
  const [isBatchBankSelectorOpen, setIsBatchBankSelectorOpen] = useState(false);
  const [newBatchBroadcastNotice, setNewBatchBroadcastNotice] = useState<boolean>(true);
  const [batchSearchQ, setBatchSearchQ] = useState("");
  const [isCreatingBatch, setIsCreatingBatch] = useState(false);
  const [selectedBatchForSubmissions, setSelectedBatchForSubmissions] = useState<any | null>(null);
  const [editingBatch, setEditingBatch] = useState<any | null>(null);

  // Live Exam Anti-Cheating & Tab Switch Security
  const [examSecuritySettings, setExamSecuritySettings] = useState<LiveExamSecuritySettings>(DEFAULT_SECURITY_SETTINGS);
  const [isSavingSecuritySettings, setIsSavingSecuritySettings] = useState(false);
  const [examViolationsList, setExamViolationsList] = useState<ExamViolationRecord[]>([]);
  const [violationsFilterExamId, setViolationsFilterExamId] = useState<string>("all");

  useEffect(() => {
    const unsubSettings = subscribeToExamSecuritySettings(setExamSecuritySettings);
    const unsubViolations = subscribeToExamViolations((list) => {
      setExamViolationsList(list);
    });
    return () => {
      unsubSettings();
      unsubViolations();
    };
  }, []);

  const handleSaveSecuritySettings = async () => {
    setIsSavingSecuritySettings(true);
    try {
      await saveExamSecuritySettings(examSecuritySettings);
      showToast("Live Exam Security Settings updated successfully!", "success");
    } catch (err: any) {
      showToast("Failed to save security settings: " + err.message, "error");
    } finally {
      setIsSavingSecuritySettings(false);
    }
  };

  // Student Management & Manual Exam Mark Inputs
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [newStudentForm, setNewStudentForm] = useState({
    displayName: "",
    email: "",
    college: "Dhaka Medical College (DMC)",
    district: "Dhaka",
    phone: "",
    role: "student",
    level: 1,
    xp: 250,
    coins: 150,
    dailyStreak: 1,
    questionsSolved: 0,
    questionsCorrect: 0,
  });
  const [editingStudent, setEditingStudent] = useState<UserProfile | null>(null);
  const [editingSubmission, setEditingSubmission] = useState<any | null>(null);
  const [isAddExamMarkModalOpen, setIsAddExamMarkModalOpen] = useState(false);
  const [newExamMarkForm, setNewExamMarkForm] = useState({
    studentUid: "",
    studentName: "",
    studentEmail: "",
    examId: "",
    examTitle: "",
    score: 85,
    totalMarks: 100,
    correctCount: 88,
    wrongCount: 12,
    rank: 1,
    adminRemarks: "Marks evaluated & approved by Admin",
  });

  const handleCoverImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        showToast("Image size is too large! Please choose an image under 3MB.", "error");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const resultStr = reader.result as string;
        if (isEdit) {
          setEditingBatch((prev: any) => (prev ? { ...prev, coverImage: resultStr } : null));
        } else {
          setNewBatchCoverImage(resultStr);
        }
        showToast("Cover photo uploaded successfully!", "success");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveEditedBatch = async () => {
    if (!editingBatch || !editingBatch.id) return;
    try {
      await updateDoc(doc(db, "live_exams", editingBatch.id), {
        title: editingBatch.title?.trim() || "Untitled Batch",
        description: editingBatch.description?.trim() || "",
        price: Number(editingBatch.price) || 0,
        originalPrice: Number(editingBatch.originalPrice) || 0,
        startDate: editingBatch.startDate || "",
        coverImage: editingBatch.coverImage || "",
        targetGroup: editingBatch.targetGroup || "Medical Admission Batch",
        subject: editingBatch.subject || "Biology",
        duration: Number(editingBatch.duration) || 20,
        negMarking: Number(editingBatch.negMarking) || 0.25,
        updatedAt: new Date().toISOString(),
      });
      showToast("Course details & cover photo updated successfully!", "success");
      setEditingBatch(null);
    } catch (err: any) {
      showToast("Failed to update course details: " + err.message, "error");
    }
  };

  // Your Mentor & Mark Predictor admin states
  const [mentorSubTab, setMentorSubTab] = useState<"queries" | "predictions">("queries");
  const [mentorSearch, setMentorSearch] = useState("");
  const [predictionSearch, setPredictionSearch] = useState("");
  const [selectedQuery, setSelectedQuery] = useState<any | null>(null);
  const [replyText, setReplyText] = useState("");
  const [selectedPrediction, setSelectedPrediction] = useState<any | null>(null);
  const [predMark, setPredMark] = useState("");
  const [predCollege, setPredCollege] = useState("");
  const [predComments, setPredComments] = useState("");

  // Search filter states
  const [qSearch, setQSearch] = useState("");
  const [uSearch, setUSearch] = useState("");

  // Create Question form states
  const [qText, setQText] = useState("");
  const [qOptA, setQOptA] = useState("");
  const [qOptB, setQOptB] = useState("");
  const [qOptC, setQOptC] = useState("");
  const [qOptD, setQOptD] = useState("");
  const [qCorrect, setQCorrect] = useState(0);
  const [qExplanation, setQExplanation] = useState("");
  const [qSubject, setQSubject] = useState<any>("Biology");
  const [qChapter, setQChapter] = useState("Enzymes");
  const [qDifficulty, setQDifficulty] = useState<any>("Medium");
  const [qSource, setQSource] = useState("MAT Current Syllabus");

  // Photo scanner states & handlers (single file & multi-file sequential queue)
  interface QueueFile {
    id: string;
    name: string;
    preview: string;
    status: "pending" | "scanning" | "success" | "error";
    error?: string;
    result?: any;
  }

  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scannedFiles, setScannedFiles] = useState<QueueFile[]>([]);
  const [multiScanning, setMultiScanning] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      if (files.length === 1) {
        // Single file mode - support both direct auto-fill and sequential queue
        const file = files[0];
        const reader = new FileReader();
        reader.onloadend = () => {
          setScannedImage(reader.result as string);
          
          // Also add to the queue so they can optionally use batch style or clear it
          const fileId = `q-${Date.now()}-0`;
          setScannedFiles([{
            id: fileId,
            name: file.name,
            preview: reader.result as string,
            status: "pending"
          }]);
        };
        reader.readAsDataURL(file);
      } else {
        // Multi-file batch mode
        const loadedFiles: QueueFile[] = [];
        let loadedCount = 0;
        
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const reader = new FileReader();
          const fileId = `q-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`;
          
          reader.onloadend = () => {
            loadedFiles.push({
              id: fileId,
              name: file.name,
              preview: reader.result as string,
              status: "pending"
            });
            loadedCount++;
            if (loadedCount === files.length) {
              setScannedFiles((prev) => [...prev, ...loadedFiles]);
              setScannedImage(null); // Clear single preview since it is a batch
            }
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const handleRemoveQueueFile = (id: string) => {
    if (multiScanning) return;
    setScannedFiles((prev) => {
      const filtered = prev.filter((f) => f.id !== id);
      if (filtered.length === 0) {
        setScannedImage(null);
      } else if (filtered.length === 1) {
        setScannedImage(filtered[0].preview);
      }
      return filtered;
    });
  };

  const handleClearQueue = () => {
    if (multiScanning) return;
    setScannedFiles([]);
    setScannedImage(null);
  };

  const handleScanImage = async () => {
    if (!scannedImage) return;
    setScanning(true);
    try {
      const res = await fetch("/api/ai/scan-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: scannedImage }),
      });
      if (!res.ok) {
        throw new Error("Scanner server responded with an error");
      }
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }

      if (data.questionText) setQText(data.questionText);
      if (data.options && Array.isArray(data.options)) {
        if (data.options[0]) setQOptA(data.options[0]);
        if (data.options[1]) setQOptB(data.options[1]);
        if (data.options[2]) setQOptC(data.options[2]);
        if (data.options[3]) setQOptD(data.options[3]);
      }
      if (typeof data.correctAnswerIndex === "number") {
        setQCorrect(data.correctAnswerIndex);
      }
      if (data.explanation) setQExplanation(data.explanation);
      if (data.subject) {
        const validSubjects = ["Biology", "Chemistry", "Physics", "English", "GK"];
        if (validSubjects.includes(data.subject)) {
          setQSubject(data.subject);
        } else {
          setQSubject("Biology");
        }
      }
      if (data.chapter) setQChapter(data.chapter);

      showToast("Question scanned & auto-filled successfully! Review and hit Save.", "success");
      setScannedImage(null);
      setScannedFiles([]);
    } catch (err: any) {
      console.error(err);
      showToast("Error scanning image: " + err.message, "error");
    } finally {
      setScanning(false);
    }
  };

  const handleProcessMultiScan = async () => {
    if (scannedFiles.length === 0 || multiScanning) return;
    setMultiScanning(true);
    showToast("Starting sequential batch processing of questions...", "info");
    
    const filesToProcess = [...scannedFiles];
    let successCount = 0;
    
    for (let i = 0; i < filesToProcess.length; i++) {
      const fileObj = filesToProcess[i];
      if (fileObj.status !== "pending" && fileObj.status !== "error") continue;
      
      fileObj.status = "scanning";
      setScannedFiles([...filesToProcess]);
      
      try {
        const res = await fetch("/api/ai/scan-question", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: fileObj.preview }),
        });
        
        if (!res.ok) {
          throw new Error("Scanner server responded with an error");
        }
        
        const data = await res.json();
        if (data.error) {
          throw new Error(data.error);
        }
        
        if (!data.questionText) {
          throw new Error("Could not extract question text");
        }
        
        // Save sequentially to Firestore "questions" collection
        const payload: Omit<Question, "id"> = {
          questionText: data.questionText,
          options: data.options && Array.isArray(data.options) ? data.options : ["A", "B", "C", "D"],
          correctAnswerIndex: typeof data.correctAnswerIndex === "number" ? data.correctAnswerIndex : 0,
          explanation: data.explanation || "No explanation provided.",
          subject: data.subject || "Biology",
          chapter: data.chapter || "General",
          difficulty: "Medium",
          source: "AI Auto-Scan Multi-Upload",
          createdAt: serverTimestamp(),
          createdBy: user.uid,
        };
        
        await addDoc(collection(db, "questions"), payload);
        
        fileObj.status = "success";
        fileObj.result = payload;
        successCount++;
      } catch (err: any) {
        console.error(err);
        fileObj.status = "error";
        fileObj.error = err.message || "Failed to parse question";
      }
      
      // Live state update for UI progress
      setScannedFiles([...filesToProcess]);
    }
    
    setMultiScanning(false);
    showToast(`Sequential batch scan finished! Successfully saved ${successCount} questions to Firestore.`, "success");
  };

  const handleLoadFileToForm = (item: QueueFile) => {
    if (!item.result) return;
    const data = item.result;
    if (data.questionText) setQText(data.questionText);
    if (data.options && Array.isArray(data.options)) {
      if (data.options[0]) setQOptA(data.options[0]);
      if (data.options[1]) setQOptB(data.options[1]);
      if (data.options[2]) setQOptC(data.options[2]);
      if (data.options[3]) setQOptD(data.options[3]);
    }
    if (typeof data.correctAnswerIndex === "number") {
      setQCorrect(data.correctAnswerIndex);
    }
    if (data.explanation) setQExplanation(data.explanation);
    if (data.subject) {
      const validSubjects = ["Biology", "Chemistry", "Physics", "English", "GK"];
      if (validSubjects.includes(data.subject)) {
        setQSubject(data.subject);
      }
    }
    if (data.chapter) setQChapter(data.chapter);
    showToast("Loaded parsed question into form for manual editing/review!", "info");
  };

  // FAB Question Scanner states & handlers (upgraded for sequential multi-file batch scans)
  const fabFileInputRef = useRef<HTMLInputElement>(null);
  const [fabScanning, setFabScanning] = useState(false);
  const [fabScannedQuestions, setFabScannedQuestions] = useState<any[]>([]);
  const [fabQueue, setFabQueue] = useState<any[]>([]);
  const [fabCurrentIndex, setFabCurrentIndex] = useState(0);

  const handleFabClick = () => {
    if (fabFileInputRef.current) {
      fabFileInputRef.current.click();
    }
  };

  const handleFabImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const loadedFiles: { name: string; preview: string }[] = [];
      let loadedCount = 0;
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();
        reader.onloadend = () => {
          loadedFiles.push({
            name: file.name,
            preview: reader.result as string,
          });
          loadedCount++;
          if (loadedCount === files.length) {
            handleFabScanAndSaveMultiple(loadedFiles);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleFabScanAndSaveMultiple = async (files: { name: string; preview: string }[]) => {
    setFabScanning(true);
    setFabScannedQuestions([]);
    setFabQueue(files);
    setFabCurrentIndex(0);
    
    const scannedResults: any[] = [];
    
    for (let i = 0; i < files.length; i++) {
      setFabCurrentIndex(i);
      const fileObj = files[i];
      try {
        const res = await fetch("/api/ai/scan-question", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: fileObj.preview }),
        });
        if (!res.ok) {
          throw new Error("Scanner server responded with an error");
        }
        const data = await res.json();
        if (data.error) {
          throw new Error(data.error);
        }

        if (!data.questionText) {
          throw new Error("Could not extract clear question text from image");
        }

        const payload: Omit<Question, "id"> = {
          questionText: data.questionText,
          options: data.options && Array.isArray(data.options) ? data.options : ["A", "B", "C", "D"],
          correctAnswerIndex: typeof data.correctAnswerIndex === "number" ? data.correctAnswerIndex : 0,
          explanation: data.explanation || "No explanation provided.",
          subject: data.subject || "Biology",
          chapter: data.chapter || "General",
          difficulty: "Medium",
          source: "AI Auto-Scan FAB",
          createdAt: serverTimestamp(),
          createdBy: user.uid,
        };

        await addDoc(collection(db, "questions"), payload);
        scannedResults.push(payload);
        setFabScannedQuestions([...scannedResults]);
      } catch (err: any) {
        console.error(`FAB Scan Error on file ${fileObj.name}:`, err);
        showToast(`Error scanning ${fileObj.name}: ${err.message}`, "error");
      }
    }
    
    setFabScanning(false);
    showToast(`Batch scans completed! Saved ${scannedResults.length} questions.`, "success");
    if (fabFileInputRef.current) {
      fabFileInputRef.current.value = "";
    }
  };

  // Create Notice form states
  const [nTitle, setNTitle] = useState("");
  const [nContent, setNContent] = useState("");
  const [nCategory, setNCategory] = useState<any>("news");
  const [nImportant, setNImportant] = useState(false);
  const [editingNoticeId, setEditingNoticeId] = useState<string | null>(null);

  // Premium Pricing & Features States
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const [premiumPrices, setPremiumPrices] = useState({
    monthly: 149,
    "6months": 599,
    "1year": 799
  });
  const [premiumFeatures, setPremiumFeatures] = useState<any[]>([]);
  const [loadingPremium, setLoadingPremium] = useState(true);

  // New Feature Form State
  const [editingFeatureIdx, setEditingFeatureIdx] = useState<number | null>(null);
  const [featTitleEn, setFeatTitleEn] = useState("");
  const [featTitleBn, setFeatTitleBn] = useState("");
  const [featDescEn, setFeatDescEn] = useState("");
  const [featDescBn, setFeatDescBn] = useState("");
  const [featIcon, setFeatIcon] = useState("Trophy");
  const [featColor, setFeatColor] = useState("red");

  useEffect(() => {
    if (!hasAccess || activeTab !== "premium") return;
    const unsubscribe = onSnapshot(
      doc(db, "settings", "premium"),
      (docSnap) => {
        setLoadingPremium(false);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.prices) {
            setPremiumPrices(data.prices);
          }
          if (data.features) {
            setPremiumFeatures(data.features);
          }
        } else {
          const initial = {
            prices: {
              monthly: 149,
              "6months": 599,
              "1year": 799
            },
            features: [
              {
                id: "elite-questions",
                titleEn: "Elite Questions",
                titleBn: "এলিট প্রশ্নব্যাংক",
                descEn: "10K+ High-yield expert MAT questions",
                descBn: "১০,০০০+ হাই-ইল্ড প্রিমিয়াম প্রশ্ন",
                icon: "Trophy",
                color: "red"
              },
              {
                id: "unlimited-ai",
                titleEn: "Unlimited AI",
                titleBn: "সীমাহীন এআই মেন্টরিং",
                descEn: "Unlimited AI Mentor analytical logs",
                descBn: "সীমাহীন মেডিসেন্স এআই মেন্টরিং",
                icon: "Bot",
                color: "yellow"
              },
              {
                id: "rewards",
                titleEn: "2X Rewards",
                titleBn: "২ গুণ পুরষ্কার",
                descEn: "Double gold coins and streak points",
                descBn: "২ গুণ অতিরিক্ত এক্সপি এবং কয়েন",
                icon: "Flame",
                color: "amber"
              },
              {
                id: "gold-frame",
                titleEn: "Gold Frame",
                titleBn: "স্বর্ণালী ফ্রেম",
                descEn: "Exclusive Golden Frame & rank tag",
                descBn: "লিজেন্ডারি মেম্বার ফ্রেম ও ব্যাজ",
                icon: "Shield",
                color: "indigo"
              }
            ]
          };
          setDoc(doc(db, "settings", "premium"), initial)
            .then(() => {
              setPremiumPrices(initial.prices);
              setPremiumFeatures(initial.features);
            })
            .catch((err) => console.warn("Could not seed premium config:", err));
        }
      },
      (error) => {
        console.warn("Could not stream premium settings:", error);
        setLoadingPremium(false);
      }
    );
    return () => unsubscribe();
  }, [hasAccess, activeTab]);

  const handleSavePrices = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, "settings", "premium"), {
        prices: premiumPrices,
        features: premiumFeatures
      }, { merge: true });
      showToast("Subscription pricing config saved to live production environment!", "success");
    } catch (err: any) {
      console.error("Failed to save premium prices:", err);
      showToast("Error saving prices: " + err.message, "error");
    }
  };

  const handleLogoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast("Logo file size must be less than 2MB!", "error");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomLogoUrl(reader.result as string);
        showToast("Image loaded! Click 'Save Logo Configuration' to apply changes.", "info");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveLogoSettings = async () => {
    setIsSavingLogo(true);
    try {
      await setDoc(doc(db, "settings", "platform"), {
        customLogoUrl,
        customLogoEnabled
      }, { merge: true });
      showToast("Platform custom logo settings saved successfully!", "success");
    } catch (err: any) {
      console.error("Failed to save logo settings:", err);
      showToast("Error saving logo config: " + err.message, "error");
    } finally {
      setIsSavingLogo(false);
    }
  };

  const handleLoadingLogoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast("Loading screen logo/GIF size must be less than 2MB!", "error");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLoadingLogoUrl(reader.result as string);
        showToast("Loading screen image/GIF loaded! Click 'Save Loading Logo' to apply.", "info");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveLoadingLogoSettings = async () => {
    setIsSavingLoadingLogo(true);
    try {
      await setDoc(doc(db, "settings", "platform"), {
        loadingLogoUrl,
        loadingLogoEnabled
      }, { merge: true });
      showToast("Loading screen custom logo/GIF saved successfully!", "success");
    } catch (err: any) {
      console.error("Failed to save loading logo settings:", err);
      showToast("Error saving loading logo config: " + err.message, "error");
    } finally {
      setIsSavingLoadingLogo(false);
    }
  };

  const handleSaveFeature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!featTitleEn.trim() || !featTitleBn.trim()) {
      showToast("Feature title cannot be empty!", "error");
      return;
    }

    const newFeature = {
      id: editingFeatureIdx !== null ? premiumFeatures[editingFeatureIdx].id : "feat-" + Date.now(),
      titleEn: featTitleEn.trim(),
      titleBn: featTitleBn.trim(),
      descEn: featDescEn.trim(),
      descBn: featDescBn.trim(),
      icon: featIcon,
      color: featColor
    };

    let updatedFeatures = [...premiumFeatures];
    if (editingFeatureIdx !== null) {
      updatedFeatures[editingFeatureIdx] = newFeature;
    } else {
      updatedFeatures.push(newFeature);
    }

    try {
      await setDoc(doc(db, "settings", "premium"), {
        prices: premiumPrices,
        features: updatedFeatures
      }, { merge: true });

      // Reset form
      setEditingFeatureIdx(null);
      setFeatTitleEn("");
      setFeatTitleBn("");
      setFeatDescEn("");
      setFeatDescBn("");
      setFeatIcon("Trophy");
      setFeatColor("red");

      showToast("Premium feature catalog updated!", "success");
    } catch (err: any) {
      console.error("Failed to save feature:", err);
      showToast("Error saving feature: " + err.message, "error");
    }
  };

  const handleDeleteFeature = async (idxToDelete: number) => {
    setConfirmDialog({
      message: "Are you sure you want to remove this premium feature?",
      onConfirm: async () => {
        const updatedFeatures = premiumFeatures.filter((_, idx) => idx !== idxToDelete);
        try {
          await setDoc(doc(db, "settings", "premium"), {
            prices: premiumPrices,
            features: updatedFeatures
          }, { merge: true });
          showToast("Premium feature removed successfully.", "success");
        } catch (err: any) {
          console.error("Failed to delete feature:", err);
          showToast("Error removing feature: " + err.message, "error");
        }
        setConfirmDialog(null);
      }
    });
  };

  const startEditFeature = (idx: number) => {
    const f = premiumFeatures[idx];
    setEditingFeatureIdx(idx);
    setFeatTitleEn(f.titleEn);
    setFeatTitleBn(f.titleBn);
    setFeatDescEn(f.descEn || "");
    setFeatDescBn(f.descBn || "");
    setFeatIcon(f.icon || "Trophy");
    setFeatColor(f.color || "red");
  };

  // Read Questions on demand when questions tab is accessed
  useEffect(() => {
    if (!hasAccess || activeTab !== "questions") return;
    const qQuest = query(collection(db, "questions"), limit(100));
    getDocs(qQuest)
      .then((snapshot) => {
        const loaded: Question[] = [];
        snapshot.forEach((doc) => {
          loaded.push({ id: doc.id, ...doc.data() } as Question);
        });
        if (loaded.length === 0) {
          setQuestions([]);
        } else {
          setQuestions(loaded);
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch questions in AdminPanel:", err);
      });
  }, [hasAccess, activeTab]);

  // Read Users in real-time when users tab is active
  useEffect(() => {
    if (!hasAccess || activeTab !== "users") return;
    const qUsers = query(collection(db, "users"), limit(50));
    const unsubscribe = onSnapshot(
      qUsers,
      (snapshot) => {
        const loaded: UserProfile[] = [];
        const seenUids = new Set<string>();
        snapshot.forEach((doc) => {
          const data = doc.data() as UserProfile;
          const uid = doc.id || data.uid;
          if (uid && !seenUids.has(uid)) {
            seenUids.add(uid);
            loaded.push({ ...data, uid, id: doc.id } as UserProfile);
          }
        });
        setUsersList(loaded);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "users");
      }
    );
    return () => unsubscribe();
  }, [hasAccess, activeTab]);

  // Read Notices in real-time when notices tab is active
  useEffect(() => {
    if (!hasAccess || activeTab !== "notices") return;
    const qNotices = query(collection(db, "notices"), limit(20));
    const unsubscribe = onSnapshot(
      qNotices,
      (snapshot) => {
        const loaded: AdminNotice[] = [];
        snapshot.forEach((doc) => {
          loaded.push({ id: doc.id, ...doc.data() } as AdminNotice);
        });
        setNotices(loaded);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "notices");
      }
    );
    return () => unsubscribe();
  }, [hasAccess, activeTab]);

  // Payment Requests States & Listener
  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
  const [paySearch, setPaySearch] = useState("");
  const [payStatusFilter, setPayStatusFilter] = useState<"All" | "Pending" | "Approved" | "Rejected">("All");
  const [inspectRequest, setInspectRequest] = useState<any | null>(null);
  const [noteText, setNoteText] = useState("");
  const [viewScreenshot, setViewScreenshot] = useState<string | null>(null);

  // Dynamic payment numbers & WhatsApp helpline states
  const [adminBkashNumber, setAdminBkashNumber] = useState("");
  const [adminNagadNumber, setAdminNagadNumber] = useState("");
  const [adminRocketNumber, setAdminRocketNumber] = useState("");
  const [adminHelplineWhatsapp, setAdminHelplineWhatsapp] = useState("");
  const [adminHelplinePhone, setAdminHelplinePhone] = useState("");
  const [isUpdatingNumbers, setIsUpdatingNumbers] = useState(false);

  // Dynamic custom logo states
  const [customLogoUrl, setCustomLogoUrl] = useState<string | null>(null);
  const [customLogoEnabled, setCustomLogoEnabled] = useState<boolean>(false);
  const [isSavingLogo, setIsSavingLogo] = useState(false);

  // Loading Screen custom logo states
  const [loadingLogoUrl, setLoadingLogoUrl] = useState<string | null>(null);
  const [loadingLogoEnabled, setLoadingLogoEnabled] = useState<boolean>(false);
  const [isSavingLoadingLogo, setIsSavingLoadingLogo] = useState(false);

  useEffect(() => {
    if (!hasAccess) return;
    const unsubscribe = onSnapshot(
      doc(db, "settings", "platform"),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setCustomLogoUrl(data.customLogoUrl || null);
          setCustomLogoEnabled(!!data.customLogoEnabled);
          setLoadingLogoUrl(data.loadingLogoUrl || null);
          setLoadingLogoEnabled(!!data.loadingLogoEnabled);
        }
      },
      (err) => {
        console.warn("Could not stream platform settings:", err);
      }
    );
    return () => unsubscribe();
  }, [hasAccess]);

  useEffect(() => {
    if (!hasAccess || activeTab !== "payments") return;
    const unsubscribe = onSnapshot(
      doc(db, "settings", "payment"),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setAdminBkashNumber(data.bkashNumber || "");
          setAdminNagadNumber(data.nagadNumber || "");
          setAdminRocketNumber(data.rocketNumber || "");
          setAdminHelplineWhatsapp(data.helplineWhatsapp || "");
          setAdminHelplinePhone(data.helplinePhone || "");
        }
      },
      (err) => {
        console.warn("Could not stream payment settings:", err);
      }
    );
    return () => unsubscribe();
  }, [hasAccess, activeTab]);

  useEffect(() => {
    if (!hasAccess || activeTab !== "payments") return;
    const qPayments = query(collection(db, "payment_requests"), orderBy("submissionDate", "desc"), limit(100));
    const unsubscribe = onSnapshot(
      qPayments,
      (snapshot) => {
        const loaded: any[] = [];
        snapshot.forEach((doc) => {
          loaded.push({ id: doc.id, ...doc.data() });
        });
        setPaymentRequests(loaded);
      },
      (error) => {
        console.warn("Failed to stream payment requests:", error);
      }
    );
    return () => unsubscribe();
  }, [hasAccess, activeTab]);

  useEffect(() => {
    if (!hasAccess || activeTab !== "mentor" || mentorSubTab !== "queries") return;
    const qMentor = query(collection(db, "mentor_queries"), orderBy("createdAt", "desc"), limit(50));
    const unsubscribe = onSnapshot(
      qMentor,
      (snapshot) => {
        const loaded: any[] = [];
        snapshot.forEach((doc) => {
          loaded.push({ id: doc.id, ...doc.data() });
        });
        setMentorQueries(loaded);
      },
      (error) => {
        console.warn("Failed to stream mentor queries:", error);
      }
    );
    return () => unsubscribe();
  }, [hasAccess, activeTab, mentorSubTab]);

  useEffect(() => {
    if (!hasAccess || activeTab !== "mentor" || mentorSubTab !== "predictions") return;
    const qPredictions = query(collection(db, "mark_predictions"), orderBy("createdAt", "desc"), limit(50));
    const unsubscribe = onSnapshot(
      qPredictions,
      (snapshot) => {
        const loaded: any[] = [];
        snapshot.forEach((doc) => {
          loaded.push({ id: doc.id, ...doc.data() });
        });
        setMarkPredictions(loaded);
      },
      (error) => {
        console.warn("Failed to stream mark predictions:", error);
      }
    );
    return () => unsubscribe();
  }, [hasAccess, activeTab, mentorSubTab]);

  useEffect(() => {
    if (!hasAccess || activeTab !== "exambatch") return;
    const qExams = query(collection(db, "live_exams"), orderBy("createdAt", "desc"), limit(50));
    const unsubscribe = onSnapshot(
      qExams,
      (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        setLiveExams(list);
      },
      (error) => {
        console.warn("Failed to stream live exams:", error);
      }
    );
    return () => unsubscribe();
  }, [hasAccess, activeTab]);

  useEffect(() => {
    if (!hasAccess || activeTab !== "exambatch") return;
    const qSubmissions = query(collection(db, "live_exam_submissions"), orderBy("score", "desc"), limit(100));
    const unsubscribe = onSnapshot(
      qSubmissions,
      (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        setLiveSubmissions(list);
      },
      (error) => {
        console.warn("Failed to stream live exam submissions:", error);
      }
    );
    return () => unsubscribe();
  }, [hasAccess, activeTab]);

  const getPoolOfQuestions = (): Question[] => {
    const map = new Map<string, Question>();
    STARTER_QUESTIONS.forEach((q: any) => map.set(q.id || q.questionText, { ...q, id: q.id || q.questionText } as Question));
    questions.forEach((q) => map.set(q.id || q.questionText, q));
    return Array.from(map.values());
  };

  // Dispatch in-app alert notifications to students enrolled in a specific batch
  const sendBatchNotificationAlerts = async (
    batchId: string,
    batchTitle: string,
    targetGroup: string,
    subject: string,
    questionCount: number
  ) => {
    try {
      const recipientUids = new Set<string>();

      // 1. Query users enrolled in this batch ID
      if (batchId) {
        const qEnrolled = query(collection(db, "users"), where("enrolledBatches", "array-contains", batchId));
        const snapEnrolled = await getDocs(qEnrolled);
        snapEnrolled.forEach((docSnap) => recipientUids.add(docSnap.id));
      }

      // 2. Query users with approved payment requests for this batch
      if (batchId) {
        const qPayments = query(
          collection(db, "payment_requests"),
          where("batchId", "==", batchId),
          where("status", "==", "Approved")
        );
        const snapPayments = await getDocs(qPayments);
        snapPayments.forEach((docSnap) => {
          const uId = docSnap.data().userId;
          if (uId) recipientUids.add(uId);
        });
      }

      // 3. Fallback: If no batch-specific enrollment users found, notify active students
      if (recipientUids.size === 0) {
        const qUsers = query(collection(db, "users"), limit(100));
        const snapUsers = await getDocs(qUsers);
        snapUsers.forEach((docSnap) => recipientUids.add(docSnap.id));
      }

      const titleText = `🚨 New Test Published: ${batchTitle}`;
      const contentText = `A new test "${batchTitle}" (${subject} • ${questionCount} MCQs) has been published for your batch "${targetGroup}". Tap to start your exam now!`;

      const notifyPromises = Array.from(recipientUids).map((uId) =>
        addDoc(collection(db, "user_notifications"), {
          userId: uId,
          title: titleText,
          content: contentText,
          type: "new_test_published",
          read: false,
          createdAt: new Date().toISOString(),
          batchId: batchId,
          batchTitle: batchTitle,
        })
      );

      await Promise.all(notifyPromises);
      console.log(`Dispatched in-app notifications to ${recipientUids.size} students.`);
    } catch (err) {
      console.error("Failed to send batch notification alerts:", err);
    }
  };

  const handleLaunchExamBatch = async () => {
    if (!newBatchTitle.trim()) {
      showToast("Please enter an Exam Batch Title!", "error");
      return;
    }

    const pool = getPoolOfQuestions();
    let selectedQuestionIds: string[] = [];

    if (newBatchSelectionMode === "auto") {
      let matching = pool.filter((q) => {
        const subMatch = q.subject.toLowerCase() === newBatchSubject.toLowerCase();
        const chapMatch = newBatchChapter === "All" || q.chapter === newBatchChapter;
        return subMatch && chapMatch;
      });

      if (matching.length < newBatchQuestionsCount) {
        matching = pool.filter((q) => q.subject.toLowerCase() === newBatchSubject.toLowerCase());
      }

      if (matching.length === 0) {
        matching = pool;
      }

      const shuffled = [...matching].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, Math.min(newBatchQuestionsCount, shuffled.length));
      selectedQuestionIds = selected.map((q) => q.id || q.questionText);
    } else {
      if (newBatchManualQIds.length === 0) {
        showToast("Please select at least 1 question for manual pick mode!", "error");
        return;
      }
      selectedQuestionIds = [...newBatchManualQIds];
    }

    if (selectedQuestionIds.length === 0) {
      showToast("No suitable questions found to create this batch!", "error");
      return;
    }

    setIsCreatingBatch(true);
    try {
      const examDoc = {
        title: newBatchTitle.trim(),
        description: newBatchDescription.trim() || "Comprehensive Live Model Test & Solution Batch for Medical Aspirants",
        price: Number(newBatchPrice) || 499,
        originalPrice: Number(newBatchOriginalPrice) || 999,
        startDate: newBatchStartDate || new Date().toISOString().split("T")[0],
        coverImage: newBatchCoverImage || PRESET_COVER_PHOTOS[0].url,
        subject: newBatchSubject,
        chapter: newBatchChapter,
        targetGroup: newBatchTargetGroup,
        duration: Number(newBatchDuration),
        totalQuestions: selectedQuestionIds.length,
        questionIds: selectedQuestionIds,
        negMarking: Number(newBatchNegMarking),
        passMarkPercent: Number(newBatchPassMarkPercent),
        passcode: newBatchPasscode.trim(),
        createdBy: user.uid,
        creatorName: user.displayName || "Admin Commander",
        createdAt: new Date().toISOString(),
        isActive: true,
      };

      const createdBatchRef = await addDoc(collection(db, "live_exams"), examDoc);

      // Record question usage in Central Question Bank
      try {
        await recordExamQuestionUsage(
          createdBatchRef.id,
          newBatchTitle.trim(),
          "live_exam",
          newBatchTargetGroup,
          selectedQuestionIds
        );
      } catch (usageErr) {
        console.warn("Question bank usage recording:", usageErr);
      }

      if (newBatchBroadcastNotice) {
        await addDoc(collection(db, "notices"), {
          title: `🚀 LIVE EXAM BATCH LAUNCHED: ${newBatchTitle.trim()}`,
          content: `A brand-new Live Exam Batch "${newBatchTitle.trim()}" (${newBatchSubject} • ৳${newBatchPrice} • Starts: ${newBatchStartDate}) is now LIVE! Check Exam Batch Store to enroll!`,
          category: "announcement",
          important: true,
          createdBy: user.displayName || "Admin Command",
          createdAt: new Date().toISOString(),
        });
      }

      // Automatically send in-app alert notifications to enrolled students
      await sendBatchNotificationAlerts(
        createdBatchRef.id,
        newBatchTitle.trim(),
        newBatchTargetGroup,
        newBatchSubject,
        selectedQuestionIds.length
      );

      showToast("🚀 Exam Batch Published & Enrolled Students Alerted!", "success");

      // Reset form
      setNewBatchTitle("");
      setNewBatchDescription("Comprehensive Live Model Test & Solution Batch for Medical Aspirants");
      setNewBatchPrice(499);
      setNewBatchOriginalPrice(999);
      setNewBatchStartDate("2026-08-15");
      setNewBatchSubject("Biology");
      setNewBatchChapter("All");
      setNewBatchPasscode("");
      setNewBatchManualQIds([]);
    } catch (err: any) {
      console.error("Failed to launch batch:", err);
      handleFirestoreError(err, OperationType.CREATE, "live_exams");
      showToast("Error launching exam batch: " + err.message, "error");
    } finally {
      setIsCreatingBatch(false);
    }
  };

  const handleToggleExamBatchStatus = async (batchId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "live_exams", batchId), {
        isActive: !currentStatus,
      });
      showToast(currentStatus ? "Exam Batch Paused." : "Exam Batch Activated & LIVE!", "success");
    } catch (err: any) {
      showToast("Error updating batch status: " + err.message, "error");
    }
  };

  const handleDeleteExamBatch = async (batchId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete Exam Batch "${title}"?`)) return;
    try {
      await deleteDoc(doc(db, "live_exams", batchId));
      showToast("Exam Batch deleted successfully.", "success");
    } catch (err: any) {
      showToast("Error deleting batch: " + err.message, "error");
    }
  };

  const handleBroadcastBatchReminder = async (batch: any) => {
    try {
      await addDoc(collection(db, "notices"), {
        title: `📢 REMINDER: Live Exam Batch "${batch.title}" is active!`,
        content: `Don't miss out on the live exam model test "${batch.title}" (${batch.subject} • ${batch.totalQuestions} Questions). Participate now to climb the real-time leaderboard!`,
        category: "announcement",
        important: true,
        createdBy: user.displayName || "Admin Command",
        createdAt: new Date().toISOString(),
      });

      // Dispatch in-app alert notifications directly to enrolled students
      await sendBatchNotificationAlerts(
        batch.id,
        batch.title,
        batch.targetGroup || "Medical Batch",
        batch.subject,
        batch.totalQuestions
      );

      showToast("In-App Notification Alerts sent to enrolled students!", "success");
    } catch (err: any) {
      showToast("Error sending announcement: " + err.message, "error");
    }
  };

  const handleApprovePayment = async (req: any) => {
    try {
      const now = new Date();
      let durationDays = 365; // Default 1 year
      if (req.selectedPlan === "monthly") durationDays = 30;
      else if (req.selectedPlan === "6months") durationDays = 180;

      const expiryDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

      // Update payment request status
      await updateDoc(doc(db, "payment_requests", req.id), {
        status: "Approved",
        adminNotes: noteText.trim() || "Approved by administrator"
      });

      // Update User Profile with Premium + Enrolled Batches
      const userUpdatePayload: any = {
        isPremium: true,
        premiumStartDate: now.toISOString(),
        premiumExpiry: expiryDate.toISOString(),
        premiumType: req.selectedPlan || "course"
      };

      if (req.batchId) {
        userUpdatePayload.enrolledBatches = arrayUnion(req.batchId);
      }

      await updateDoc(doc(db, "users", req.userId), userUpdatePayload);

      // Create Course Enrollment record if course/batch specified
      if (req.courseId || req.batchId) {
        await addDoc(collection(db, "enrollments"), {
          userId: req.userId,
          userEmail: req.userEmail || "",
          userDisplayName: req.userName || "",
          courseId: req.courseId || "course_med_2027",
          batchId: req.batchId || "batch_2027_alpha",
          courseTitle: req.courseTitle || req.selectedPlan || "Medical Standard Course",
          batchName: req.batchName || "Standard Batch",
          status: "active",
          enrolledAt: now.toISOString(),
          expiresAt: expiryDate.toISOString(),
          progressPct: 0,
          lastAccessedAt: now.toISOString(),
          completedExams: [],
          completedClasses: [],
          viewedMaterials: []
        });
      }

      // Send User Notification via Centralized Notification Service
      await NotificationService.triggerEvent("PAYMENT_SUCCESS", {
        recipientId: req.userId,
        recipientName: req.userName || "Student",
        courseId: req.courseId,
        batchId: req.batchId,
        variables: {
          course_name: req.courseTitle || req.selectedPlan || "Medical Course",
          payment_amount: req.amount || 0,
          student_name: req.userName || "Student",
          trx_id: req.transactionId || "N/A"
        }
      });

      setInspectRequest(null);
      setNoteText("");
      showToast("Payment Request Verified & Student Course Enrolled Successfully!", "success");
    } catch (e: any) {
      console.error("Approval error:", e);
      showToast("Error approving request: " + e.message, "error");
    }
  };

  const handleRejectPayment = async (req: any) => {
    try {
      // Update payment request status
      await updateDoc(doc(db, "payment_requests", req.id), {
        status: "Rejected",
        adminNotes: noteText.trim() || "Payment details could not be verified."
      });

      // Send User Notification via Centralized Notification Service
      await NotificationService.triggerEvent("PAYMENT_FAILED", {
        recipientId: req.userId,
        recipientName: req.userName || "Student",
        courseId: req.courseId,
        batchId: req.batchId,
        variables: {
          course_name: req.courseTitle || req.selectedPlan || "Course Enrollment",
          student_name: req.userName || "Student",
          reason: noteText.trim() || "Payment details could not be verified."
        }
      });

      setInspectRequest(null);
      setNoteText("");
      alert("Payment Request Rejected & User Notified!");
    } catch (e: any) {
      console.error("Rejection error:", e);
      alert("Error rejecting request: " + e.message);
    }
  };

  // Handle Question ADD
  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qText.trim() || !qOptA.trim() || !qOptB.trim()) return;

    try {
      const payload: Omit<Question, "id"> = {
        questionText: qText,
        options: [qOptA, qOptB, qOptC || "N/A", qOptD || "N/A"],
        correctAnswerIndex: qCorrect,
        explanation: qExplanation,
        subject: qSubject,
        chapter: qChapter,
        difficulty: qDifficulty,
        source: qSource,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
      };

      await addDoc(collection(db, "questions"), payload);
      setQText("");
      setQOptA("");
      setQOptB("");
      setQOptC("");
      setQOptD("");
      setQExplanation("");
      alert("New clinical prep question successfully logged in active database!");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, "questions");
    }
  };

  // Seed standard questions database
  const seedStarterQuestions = async () => {
    try {
      setQuestions([]);
      for (const q of STARTER_QUESTIONS) {
        await addDoc(collection(db, "questions"), {
          ...q,
          createdAt: serverTimestamp(),
          createdBy: user.uid,
        });
      }
      alert("Database seed successful! Starter Questions deployed.");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, "questions/seeding");
    }
  };

  // Delete Question
  const handleDeleteQuestion = async (qid: string) => {
    try {
      if (!confirm("Are you sure you want to delete this question?")) return;
      await deleteDoc(doc(db, "questions", qid));
      alert("Question permanently expunged.");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `questions/${qid}`);
    }
  };

  // Grant resources to students
  const handleGrantResources = async (studentUid: string, type: "xp" | "coins") => {
    try {
      const studentRef = doc(db, "users", studentUid);
      const student = usersList.find((u) => u.uid === studentUid);
      if (!student) return;

      const incrementValue = type === "xp" ? 250 : 150;
      const currentVal = student[type] || 0;
      const newVal = currentVal + incrementValue;

      await updateDoc(studentRef, {
        [type]: newVal,
      });
      alert(`Granted ${incrementValue} ${type.toUpperCase()} to ${student.displayName}!`);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${studentUid}`);
    }
  };

  // Reset student progress
  const handleResetProgress = async (studentUid: string) => {
    try {
      if (!confirm("Warning: This will clear this student's solved logs, coins, levels to 1, and reset metrics. Proceed?")) return;
      const studentRef = doc(db, "users", studentUid);
      await updateDoc(studentRef, {
        level: 1,
        xp: 150,
        coins: 100,
        questionsSolved: 0,
        questionsCorrect: 0,
        dailyStreak: 1,
      });
      alert("Student progression index recycled back to Level 1.");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${studentUid}`);
    }
  };

  // Add a new Student to the system
  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentForm.displayName.trim() || !newStudentForm.email.trim()) {
      showToast("Please provide student name and email!", "error");
      return;
    }
    try {
      const studentUid = "std_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
      const studentDoc = {
        uid: studentUid,
        displayName: newStudentForm.displayName.trim(),
        email: newStudentForm.email.trim().toLowerCase(),
        college: newStudentForm.college || "Dhaka Medical College (DMC)",
        district: newStudentForm.district || "Dhaka",
        phone: newStudentForm.phone || "",
        role: newStudentForm.role || "student",
        level: Number(newStudentForm.level) || 1,
        xp: Number(newStudentForm.xp) || 250,
        coins: Number(newStudentForm.coins) || 150,
        dailyStreak: Number(newStudentForm.dailyStreak) || 1,
        questionsSolved: Number(newStudentForm.questionsSolved) || 0,
        questionsCorrect: Number(newStudentForm.questionsCorrect) || 0,
        createdAt: new Date().toISOString(),
        isPremium: false,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${studentUid}`,
      };

      await setDoc(doc(db, "users", studentUid), studentDoc);
      showToast(`Student "${newStudentForm.displayName}" created successfully!`, "success");
      setIsAddStudentModalOpen(false);
      setNewStudentForm({
        displayName: "",
        email: "",
        college: "Dhaka Medical College (DMC)",
        district: "Dhaka",
        phone: "",
        role: "student",
        level: 1,
        xp: 250,
        coins: 150,
        dailyStreak: 1,
        questionsSolved: 0,
        questionsCorrect: 0,
      });
    } catch (err: any) {
      console.error("Failed to create student:", err);
      handleFirestoreError(err, OperationType.CREATE, "users");
    }
  };

  // Update existing Student details
  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    try {
      const studentRef = doc(db, "users", editingStudent.uid);
      await updateDoc(studentRef, {
        displayName: editingStudent.displayName,
        email: editingStudent.email,
        college: editingStudent.college || "",
        district: editingStudent.district || "Dhaka",
        phone: (editingStudent as any).phone || "",
        role: editingStudent.role || "student",
        level: Number(editingStudent.level) || 1,
        xp: Number(editingStudent.xp) || 0,
        coins: Number(editingStudent.coins) || 0,
        questionsSolved: Number(editingStudent.questionsSolved) || 0,
        questionsCorrect: Number(editingStudent.questionsCorrect) || 0,
        dailyStreak: Number(editingStudent.dailyStreak) || 1,
        updatedAt: new Date().toISOString(),
      });

      showToast(`Student ${editingStudent.displayName} details updated successfully!`, "success");
      setEditingStudent(null);
    } catch (err: any) {
      console.error("Failed to update student:", err);
      handleFirestoreError(err, OperationType.UPDATE, `users/${editingStudent.uid}`);
    }
  };

  // Delete a Student
  const handleDeleteStudent = async (studentUid: string, studentName: string) => {
    if (!confirm(`Are you sure you want to completely remove ${studentName} from the database?`)) return;
    try {
      await deleteDoc(doc(db, "users", studentUid));
      showToast(`Student ${studentName} has been removed.`, "info");
      if (editingStudent?.uid === studentUid) setEditingStudent(null);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `users/${studentUid}`);
    }
  };

  // Update or Override Exam Submission Marks (Admin mark input for student exam)
  const handleUpdateSubmissionMarks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubmission) return;
    try {
      const subRef = doc(db, "live_exam_submissions", editingSubmission.id);
      const updatedScore = Number(editingSubmission.score);
      const totalQ = Number(editingSubmission.totalQuestions || selectedBatchForSubmissions?.questionsCount || 100);
      const scorePercent = totalQ > 0 ? Math.max(0, Math.round((updatedScore / totalQ) * 100)) : 0;

      await updateDoc(subRef, {
        score: updatedScore,
        correctCount: Number(editingSubmission.correctCount || 0),
        wrongCount: Number(editingSubmission.wrongCount || 0),
        skippedCount: Number(editingSubmission.skippedCount || 0),
        rank: editingSubmission.rank ? Number(editingSubmission.rank) : null,
        scorePercent,
        adminRemarks: editingSubmission.adminRemarks || "Marks verified & approved by Admin",
        evaluatedByAdmin: true,
        evaluatedAt: new Date().toISOString(),
      });

      // Also update the student's XP / marks in user profile if desired
      if (editingSubmission.userId) {
        try {
          const userRef = doc(db, "users", editingSubmission.userId);
          await updateDoc(userRef, {
            xp: Math.max(0, Number(editingSubmission.score) * 10),
            updatedAt: new Date().toISOString(),
          });
        } catch (uErr) {
          console.log("Optional user XP sync:", uErr);
        }
      }

      showToast("Exam submission marks updated successfully!", "success");
      setEditingSubmission(null);
    } catch (err: any) {
      console.error("Failed to update submission marks:", err);
      handleFirestoreError(err, OperationType.UPDATE, `live_exam_submissions/${editingSubmission.id}`);
    }
  };

  // Delete an exam submission
  const handleDeleteSubmission = async (subId: string) => {
    if (!confirm("Are you sure you want to delete this exam submission?")) return;
    try {
      await deleteDoc(doc(db, "live_exam_submissions", subId));
      showToast("Exam submission deleted.", "info");
      if (editingSubmission?.id === subId) setEditingSubmission(null);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `live_exam_submissions/${subId}`);
    }
  };

  // Manually Add Exam Mark for a student (even if student took exam offline or needs admin-entered mark)
  const handleCreateExamMark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamMarkForm.studentUid || !selectedBatchForSubmissions) {
      showToast("Please select a student and exam batch!", "error");
      return;
    }

    try {
      const student = usersList.find((u) => u.uid === newExamMarkForm.studentUid);
      const subId = `sub_${selectedBatchForSubmissions.id}_${newExamMarkForm.studentUid}_${Date.now()}`;
      const totalQ = Number(newExamMarkForm.totalMarks || selectedBatchForSubmissions.questionsCount || 100);
      const score = Number(newExamMarkForm.score);
      const scorePercent = totalQ > 0 ? Math.max(0, Math.round((score / totalQ) * 100)) : 0;

      const submissionDoc = {
        id: subId,
        examId: selectedBatchForSubmissions.id,
        examTitle: selectedBatchForSubmissions.title,
        batchId: selectedBatchForSubmissions.id,
        batchTitle: selectedBatchForSubmissions.title,
        userId: newExamMarkForm.studentUid,
        userDisplayName: student?.displayName || newExamMarkForm.studentName || "Enrolled Student",
        userEmail: student?.email || newExamMarkForm.studentEmail || "",
        score: score,
        totalQuestions: totalQ,
        correctCount: Number(newExamMarkForm.correctCount || 0),
        wrongCount: Number(newExamMarkForm.wrongCount || 0),
        skippedCount: Math.max(0, totalQ - (Number(newExamMarkForm.correctCount || 0) + Number(newExamMarkForm.wrongCount || 0))),
        accuracy: scorePercent,
        scorePercent: scorePercent,
        rank: Number(newExamMarkForm.rank || 1),
        adminRemarks: newExamMarkForm.adminRemarks || "Marks entered directly by Admin",
        evaluatedByAdmin: true,
        submittedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "live_exam_submissions", subId), submissionDoc);
      showToast(`Exam mark added successfully for ${submissionDoc.userDisplayName}!`, "success");
      setIsAddExamMarkModalOpen(false);
    } catch (err: any) {
      console.error("Failed to add exam mark:", err);
      handleFirestoreError(err, OperationType.CREATE, "live_exam_submissions");
    }
  };

  // Submit Reply to Student Mentor Query
  const handleReplyToQuery = async (queryId: string) => {
    if (!replyText.trim()) return;
    try {
      const qRef = doc(db, "mentor_queries", queryId);
      await updateDoc(qRef, {
        reply: replyText.trim(),
        status: "replied",
        repliedAt: new Date().toISOString(),
      });

      // Send a notification to the student via NotificationService
      if (selectedQuery && selectedQuery.userId) {
        await NotificationService.triggerEvent("TEACHER_REPLY", {
          recipientId: selectedQuery.userId,
          variables: {
            teacher_name: user.displayName || "Mentor Dr. Tanjim",
            topic_name: selectedQuery.question?.slice(0, 35) || "Doubt Query"
          }
        });
      }

      setReplyText("");
      setSelectedQuery(null);
      alert("Mentor reply sent and student notified!");
    } catch (err: any) {
      console.error("Failed to reply to mentor query:", err);
      alert("Error replying: " + err.message);
    }
  };

  // Submit Mark Prediction & College recommendation
  const handleSubmitPrediction = async (predictionId: string) => {
    if (!predMark.trim()) {
      alert("Please enter a predicted mark or score range.");
      return;
    }
    try {
      const pRef = doc(db, "mark_predictions", predictionId);
      await updateDoc(pRef, {
        predictedMark: predMark.trim(),
        recommendedCollege: predCollege.trim(),
        comments: predComments.trim(),
        status: "predicted",
        predictedAt: new Date().toISOString(),
      });

      // Send a notification to the student
      if (selectedPrediction && selectedPrediction.userId) {
        await addDoc(collection(db, "user_notifications"), {
          userId: selectedPrediction.userId,
          title: "MAT Mark Prediction Ready! 🩺📊",
          content: `Your mentor has evaluated your profile and predicted your mark (${predMark.trim()}). Check it out!`,
          type: "prediction_ready",
          read: false,
          createdAt: new Date().toISOString(),
        });
      }

      setPredMark("");
      setPredCollege("");
      setPredComments("");
      setSelectedPrediction(null);
      alert("Mark prediction submitted and student notified!");
    } catch (err: any) {
      console.error("Failed to submit mark prediction:", err);
      alert("Error submitting prediction: " + err.message);
    }
  };

  // Create or Update Notice
  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nTitle.trim() || !nContent.trim()) return;

    try {
      if (editingNoticeId) {
        const payload = {
          title: nTitle,
          content: nContent,
          category: nCategory,
          important: nImportant,
        };
        await updateDoc(doc(db, "notices", editingNoticeId), payload);
        setEditingNoticeId(null);
        alert("Notice updated successfully!");
      } else {
        const payload: Omit<AdminNotice, "id"> = {
          title: nTitle,
          content: nContent,
          category: nCategory,
          important: nImportant,
          createdAt: serverTimestamp(),
          createdBy: user.displayName || "Admin",
        };

        await addDoc(collection(db, "notices"), payload);

        // Dispatch automatic notice broadcast to all students
        await NotificationService.triggerEvent("NEW_NOTICE", {
          audience: "all_students",
          variables: {
            notice_title: nTitle.trim()
          }
        });

        alert("Notice broadcasted successfully!");
      }
      setNTitle("");
      setNContent("");
      setNImportant(false);
    } catch (err: any) {
      handleFirestoreError(err, editingNoticeId ? OperationType.UPDATE : OperationType.CREATE, "notices");
    }
  };

  // Delete Notice
  const handleDeleteNotice = async (nid: string) => {
    try {
      await deleteDoc(doc(db, "notices", nid));
      alert("Announcement deleted.");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `notices/${nid}`);
    }
  };

  // Filter lists
  const filteredQuestions = questions.filter((q) => {
    const search = (qSearch || "").toLowerCase();
    if (!search) return true;
    return (
      (q.questionText || "").toLowerCase().includes(search) ||
      (q.subject || "").toLowerCase().includes(search) ||
      (q.chapter || "").toLowerCase().includes(search)
    );
  });

  const finalQuestionsList = filteredQuestions.length > 0 ? filteredQuestions : STARTER_QUESTIONS.map((q, i) => ({ id: `starter-${i}`, ...q })) as any[];

  const filteredUsers = usersList.filter((u) => {
    const search = (uSearch || "").toLowerCase();
    if (!search) return true;
    return (
      (u.displayName || "").toLowerCase().includes(search) ||
      (u.email || "").toLowerCase().includes(search) ||
      (u.college || "").toLowerCase().includes(search)
    );
  });

  // If standard student tries to access, deny access immediately
  if (!hasAccess) {
    return (
      <div className="bg-[#111111] min-h-[450px] flex items-center justify-center p-8 select-none relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-950/20 via-transparent to-transparent pointer-events-none"></div>
        <div className="w-full max-w-lg bg-black border border-red-600/40 rounded-2xl p-8 relative text-center flex flex-col items-center gap-6 shadow-2xl">
          <div className="absolute top-0 inset-x-0 h-1.5 bg-[#C1121F]"></div>
          
          <div className="w-16 h-16 rounded-full bg-red-950/40 border border-red-500/60 flex items-center justify-center text-[#C1121F] animate-pulse">
            <AlertOctagon className="w-9 h-9" />
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-black uppercase text-white tracking-wide">RESTRICTED ACCREDITATION PORTAL</h2>
            <p className="text-xs text-[#C1121F] font-mono tracking-widest font-bold uppercase uppercase">access level error: code-4003</p>
          </div>

          <p className="text-gray-400 text-xs max-w-sm leading-relaxed">
            Students and unverified aspirants do not possess the required keycards. The admin area is strictly monitored. Role-Based Access Control logs reported your profile parameters.
          </p>

          <div className="text-[10px] text-gray-500 font-mono border-t border-gray-900 pt-4 w-full flex justify-between">
            <span>USER: {user.displayName}</span>
            <span>ROLE: {user.role.toUpperCase()}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 font-sans">
      
      {/* HUD Header */}
      <div className="bg-gradient-to-r from-red-950/20 via-[#111111] to-black rounded-2xl p-6 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-[2px] bg-[#C1121F]"></div>
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#FFD700] uppercase">
            <ShieldAlert className="w-4 h-4 text-[#FFD700] animate-pulse" /> CLASSIFIED OPERATION COMMAND
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-white uppercase mt-1 font-display">
            SECURE AD-MIN CENTER
          </h2>
          <span className="text-[10px] text-gray-400 font-mono tracking-widest uppercase block -mt-1">
            ROLES: {user.role.toUpperCase()} ADMIN CREDENTIALS OPERATIONAL
          </span>
        </div>

        {/* Diagnostic Actions */}
        <button
          onClick={seedStarterQuestions}
          className="px-5 py-2.5 bg-[#FFD700] hover:bg-yellow-500 text-black font-black uppercase text-xs tracking-wider rounded-xl transition duration-300 font-mono shadow-md border-b-2 border-yellow-800"
          id="btn-admin-seed"
        >
          ⚙️ SEED STARTER QUESTIONS FOR WEB
        </button>
      </div>

      {/* Admin Panel Tabs */}
      <div className="flex flex-wrap bg-[#111111] p-1 border border-white/10 rounded-2xl gap-1">
        {[
          { tab: "questions", name: "📚 Question Bank (প্রশ্ন ব্যাংক)", icon: BookOpen },
          { tab: "courses", name: "Courses & Landing Showcase", icon: BookOpen },
          { tab: "heroes", name: "Our Heroes (কৃতি শিক্ষার্থী)", icon: Award },
          { tab: "teachers", name: "Course Faculty & Teachers", icon: Users },
          { tab: "promocodes", name: "Promo Codes & Discounts", icon: Tag },
          { tab: "gamingassets", name: "Gaming Arena Assets & Rewards", icon: Sparkles },
          { tab: "gamequestions", name: "Game Questions Manager", icon: Gamepad2 },
          { tab: "importer", name: "Bulk MCQ Importer", icon: FileSpreadsheet },
          { tab: "users", name: "User Control", icon: Users },
          { tab: "chapters", name: "Chapters", icon: BookOpen },
          { tab: "bosses", name: "Boss Config", icon: Award },
          { tab: "challenges", name: "Challenges", icon: Flame },
          { tab: "exambatch", name: "Exam Batch Launcher", icon: Rocket },
          { tab: "analytics", name: "Analytics", icon: TrendingUp },
          { tab: "notices", name: "Notices Broadcaster", icon: Bell },
          { tab: "payments", name: "Payments Verification", icon: CreditCard },
          { tab: "advertisements", name: "Promo & Ad Manager", icon: Megaphone },
          { tab: "mentor", name: "Mentor & Predictions", icon: Bot },
          { tab: "notifications", name: "Notification Management", icon: Bell },
          { tab: "premium", name: "Branding & Premium", icon: Settings },
          { tab: "migration", name: "⚡ Supabase Migration Hub", icon: Database },
        ].map((t) => {
          const Icon = t.icon;
          const isSelected = activeTab === t.tab;
          return (
            <button
              key={t.tab}
              onClick={() => setActiveTab(t.tab as any)}
              className={`py-2 px-4.5 rounded-xl text-xs font-bold uppercase font-mono tracking-wide flex items-center gap-2 transition duration-300 ${
                isSelected ? "bg-[#C1121F] text-white shadow-lg shadow-[#C1121F]/15" : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="w-4 h-4" /> {t.name}
            </button>
          );
        })}
      </div>

      {/* Tab Contents: Supabase Migration Hub */}
      {activeTab === "migration" && <SupabaseMigrationHub />}

      {/* Tab Contents: Central Question Bank */}
      {activeTab === "questions" && (
        <QuestionBankManager
          courses={courses}
          liveExams={liveExams}
          isBn={false}
        />
      )}

      {/* Tab Contents: Users */}
      {activeTab === "users" && (
        <div className="bg-[#151515] p-5 rounded-xl border border-gray-800 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-800 pb-3">
            <div>
              <h3 className="font-extrabold uppercase text-sm text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-[#C1121F]" /> REGISTERED STUDENT MATRIX ({filteredUsers.length})
              </h3>
              <span className="text-[10px] text-gray-400 font-mono">
                Add students, edit profile details, adjust levels, grant coins & marks
              </span>
            </div>
            
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setIsAddStudentModalOpen(true)}
                className="px-3 py-1.5 bg-[#C1121F] hover:bg-red-700 text-white rounded-lg text-xs font-mono font-bold uppercase flex items-center gap-1.5 shadow-lg shadow-red-900/20 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> ADD STUDENT
              </button>

              <div className="relative flex-1 sm:w-64">
                <input
                  type="text"
                  value={uSearch}
                  onChange={(e) => setUSearch(e.target.value)}
                  placeholder="Search aspirants by name/college..."
                  className="w-full bg-black/90 text-white pl-8 pr-3 py-1.5 text-xs border border-gray-850 rounded-lg focus:outline-none focus:border-[#C1121F]"
                />
                <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map((u, uIdx) => (
              <div key={`${u.uid || u.id || "usr"}_${uIdx}`} className="bg-black/40 border border-gray-900 rounded-lg p-5 flex flex-col justify-between hover:border-gray-800 transition relative overflow-hidden">
                <div className="absolute top-2 right-2 flex items-center gap-1">
                  <span className="bg-red-950 px-2 py-0.5 rounded border border-red-900/40 text-[9px] font-mono text-[#C1121F] uppercase font-black">
                    {u.role || "student"}
                  </span>
                </div>

                <div className="flex gap-3 leading-normal border-b border-gray-900 pb-3 mb-3">
                  <img
                    src={u.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`}
                    alt={u.displayName}
                    className="w-10 h-10 rounded-full bg-[#111111] border border-gray-800 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-sm text-white block leading-tight truncate">{u.displayName}</span>
                    <span className="text-[10px] text-gray-500 block leading-tight truncate">{u.email}</span>
                    <span className="text-[9px] text-[#FFD700] uppercase font-mono font-bold block mt-0.5 truncate">
                      {u.college || "No College"} | Level {u.level || 1}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-4 text-center gap-1.5 mb-3 font-mono text-[10px] bg-black/20 py-2 border border-gray-900 rounded">
                  <div>
                    <span className="text-gray-500 block text-[8px] uppercase leading-none">Marks(XP):</span>
                    <span className="font-bold text-emerald-400 block mt-0.5">{u.xp || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[8px] uppercase leading-none">Coins:</span>
                    <span className="font-bold text-[#FFD700] block mt-0.5">{u.coins || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[8px] uppercase leading-none">Solved:</span>
                    <span className="font-bold text-white block mt-0.5">{u.questionsSolved || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[8px] uppercase leading-none">Streak:</span>
                    <span className="font-bold text-white block mt-0.5">{u.dailyStreak || 1}d</span>
                  </div>
                </div>

                {/* Cyber actions */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setEditingStudent(u)}
                      className="flex-1 py-1 px-2 bg-blue-950/30 hover:bg-blue-900/50 border border-blue-600/40 text-blue-300 text-[10px] font-mono font-bold tracking-wider rounded transition uppercase flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" /> Edit Details
                    </button>
                    <button
                      onClick={() => handleGrantResources(u.uid, "xp")}
                      className="py-1 px-2 hover:bg-gray-800 bg-black/60 border border-gray-800 text-[10px] font-mono font-bold tracking-wider rounded transition uppercase text-emerald-400 cursor-pointer"
                      title="Add 250 Marks / XP"
                    >
                      +250 Marks
                    </button>
                    <button
                      onClick={() => handleGrantResources(u.uid, "coins")}
                      className="py-1 px-2 hover:bg-gray-800 bg-black/60 border border-gray-800 text-[10px] font-mono font-bold tracking-wider rounded transition uppercase text-[#FFD700] cursor-pointer"
                      title="Add 150 Coins"
                    >
                      +150🪙
                    </button>
                  </div>

                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleResetProgress(u.uid)}
                      className="flex-1 py-1 px-2 border border-gray-800 hover:border-gray-700 bg-black text-gray-400 hover:text-white text-[10px] font-mono font-bold rounded transition uppercase cursor-pointer"
                      title="Reset Student Progress Indices"
                    >
                      Reset Stats
                    </button>
                    <button
                      onClick={() => handleDeleteStudent(u.uid, u.displayName)}
                      className="py-1 px-2 border border-red-900/60 hover:bg-[#C1121F] bg-black text-[#C1121F] hover:text-white text-[10px] font-mono font-bold rounded transition uppercase cursor-pointer"
                      title="Delete Student"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chapters tab */}
      {activeTab === "chapters" && (
        <div className="bg-[#151515] p-6 rounded-xl border border-gray-800 relative">
          <div className="absolute top-0 left-6 h-1 w-24 bg-[#C1121F]"></div>
          <h3 className="font-extrabold uppercase text-base border-b border-gray-800 pb-3 mb-4 text-white">CHAPTERS SYLLABUS DIRECTORY</h3>
          <p className="text-xs text-gray-500 mb-6 leading-relaxed">
            Organize high-yield chapters across Biology, Chemistry, Physics, English, and General Knowledge. Newly mapped chapters automatically pop up on candidates' practicing dashboard HUD.
          </p>

          <div className="grid md:grid-cols-5 gap-4">
            {["Biology", "Chemistry", "Physics", "English", "GK"].map((sub) => (
              <div key={sub} className="bg-black/40 border border-gray-900 p-4 rounded-lg flex flex-col gap-3">
                <span className="text-xs font-bold text-white uppercase border-b border-gray-900 pb-1.5 block font-mono">{sub}</span>
                <div className="flex flex-col gap-1.5 text-[11px] text-gray-400">
                  <span>- Introduction & cells structure</span>
                  <span>- Coordination kinetics</span>
                  <span>- Quantitative solutions</span>
                  <span>- Historical mock blocks</span>
                </div>
                <button
                  onClick={() => alert(`Chapter addition requested for ${sub}.`)}
                  className="mt-2 py-1 bg-red-950 hover:bg-[#C1121F]/20 text-[#C1121F] hover:text-white rounded font-mono text-[9px] uppercase tracking-wide transition uppercase text-center border border-red-900/40"
                >
                  + Add Chapter
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Boss config tab */}
      {activeTab === "bosses" && (
        <div className="bg-[#151515] p-6 rounded-xl border border-gray-800 relative">
          <div className="absolute top-0 left-6 h-1 w-24 bg-[#FFD700]"></div>
          <h3 className="font-extrabold uppercase text-base border-b border-gray-800 pb-3 mb-4 text-white">BOSS BATTLE ARCHETYPES CONFIGURATION</h3>
          
          <div className="grid md:grid-cols-3 gap-6 mt-4">
            {[
              { name: "Biology Elite Chieftain", avatar: "🧬🐍", hp: "10,000 HP", reward: "Streaks x2 | +500 XP", code: "Bio Realm Boss" },
              { name: "Chemical Reaction Golem", avatar: "🧪👹", hp: "15,000 HP", reward: "Chests x1 | +800 XP", code: "Chem Lab Boss" },
              { name: "Mega Medical Director", avatar: "🥼🏆", hp: "35,000 HP", reward: "Medic Badge | +1,500 XP", code: "Final Gate Keeper" }
            ].map((b, i) => (
              <div key={i} className="bg-black/35 border border-gray-900 p-5 rounded-lg flex flex-col gap-4 relative group">
                <span className="absolute top-2 right-2 text-[10px] font-mono text-[#FFD700] uppercase font-bold">{b.code}</span>
                <div className="text-4xl text-center py-4 bg-red-950/10 border border-red-800/10 rounded-lg">{b.avatar}</div>
                <div>
                  <h4 className="font-extrabold text-sm text-white uppercase block leading-tight">{b.name}</h4>
                  <span className="text-xs font-mono text-gray-400 block mt-1">HP System Metric: {b.hp}</span>
                  <span className="text-xs font-mono text-[#FFD700] block">Assign Rewards: {b.reward}</span>
                </div>
                <div className="flex gap-2 text-center text-[10px] font-mono">
                  <button onClick={() => alert("Loading boss question configuration maps.")} className="flex-1 py-1.5 bg-gray-900 border border-gray-850 hover:bg-gray-800 rounded transition text-gray-300">EDIT QUESTIONS</button>
                  <button onClick={() => alert("Modified boss parameters logged.")} className="flex-1 py-1.5 bg-red-950/20 border border-red-900/40 text-[#C1121F] rounded hover:bg-[#C1121F] hover:text-white transition">RECALIBRATE</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Challenges tab */}
      {activeTab === "challenges" && (
        <div className="bg-[#151515] p-6 rounded-xl border border-gray-850 relative">
          <div className="absolute top-0 left-6 h-1 w-24 bg-[#C1121F]"></div>
          <h3 className="font-extrabold uppercase text-base border-b border-gray-800 pb-3 mb-4 text-white">CHALLENGE & SPECIAL EVENT HUD CREATION</h3>
          <p className="text-xs text-gray-500 mb-6 leading-relaxed">
            Create Time-limited special events such as "Golden Hour Trials", "Weekend Chemistry Raids", or "Midnight Survival runs". Events multiply general XP output parameters by 2x.
          </p>

          <button onClick={() => alert("Creating standard weekly countdown event wrapper.")} className="px-6 py-2 bg-[#C1121F] hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider rounded font-mono transition">
            COMPILE TIME-LOCKED GOLDEN HOUR CHALLENGE
          </button>
        </div>
      )}

      {/* EXAM BATCH LAUNCH SYSTEM HUD */}
      {activeTab === "exambatch" && (
        <div className="flex flex-col gap-6">
          {/* Top Banner Header */}
          <div className="bg-[#151515] p-6 rounded-2xl border border-white/10 relative overflow-hidden shadow-xl">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-amber-500 to-emerald-500"></div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#FFD700] uppercase">
                  <Rocket className="w-4 h-4 text-[#FFD700] animate-bounce" /> REAL-TIME EXAM BATCH LAUNCH ENGINE
                </div>
                <h3 className="text-xl md:text-2xl font-black text-white uppercase mt-1 font-display flex items-center gap-2">
                  EXAM BATCH & MODEL TEST LAUNCHER
                </h3>
                <p className="text-xs text-gray-400 mt-1 max-w-2xl leading-relaxed">
                  Configure, schedule, and instantly launch custom live exam batches for students (e.g. Medical Admission 2026 Special, Paid Batch Exclusive, Chapterwise Model Tests). Real-time synchronized with Practice Panel Model Test Arena.
                </p>
              </div>
              <div className="flex items-center gap-3 bg-black/50 p-3 rounded-xl border border-white/10">
                <div className="text-center px-3 border-r border-gray-800">
                  <span className="text-[10px] text-gray-500 font-mono block">TOTAL BATCHES</span>
                  <span className="text-xl font-black text-white font-mono">{liveExams.length}</span>
                </div>
                <div className="text-center px-3 border-r border-gray-800">
                  <span className="text-[10px] text-gray-500 font-mono block">ACTIVE LIVE</span>
                  <span className="text-xl font-black text-emerald-400 font-mono">{liveExams.filter((e) => e.isActive).length}</span>
                </div>
                <div className="text-center px-3">
                  <span className="text-[10px] text-gray-500 font-mono block">VIOLATIONS</span>
                  <span className="text-xl font-black text-red-400 font-mono">{examViolationsList.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* LIVE EXAM SECURITY & TAB SWITCH DETECTION CONTROLS */}
          <div className="bg-[#151515] p-6 rounded-2xl border border-amber-500/30 relative overflow-hidden shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-800 pb-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold uppercase text-sm text-white font-mono flex items-center gap-2">
                      LIVE EXAM ANTI-CHEATING & TAB SWITCH DETECTION SYSTEM
                    </h4>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase border ${
                      examSecuritySettings.tabSwitchDetection
                        ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-400"
                        : "bg-red-950/60 border-red-500/50 text-red-400"
                    }`}>
                      {examSecuritySettings.tabSwitchDetection ? "● ACTIVE & ENFORCING" : "○ DISABLED"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Configure real-time browser Page Visibility API & Window Blur detection for student live exams.
                  </p>
                </div>
              </div>

              <button
                onClick={handleSaveSecuritySettings}
                disabled={isSavingSecuritySettings}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs font-mono uppercase tracking-wider rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
              >
                {isSavingSecuritySettings ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> SAVING...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" /> SAVE SECURITY POLICY
                  </>
                )}
              </button>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mb-5">
              {/* Feature Toggle */}
              <div className="bg-black/50 p-4 rounded-xl border border-gray-800 flex flex-col justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold font-mono uppercase text-gray-300 block mb-1">
                    Tab Switch Monitoring
                  </span>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Detects when student leaves exam tab, minimizes window, or loses focus.
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer pt-2 border-t border-gray-800">
                  <input
                    type="checkbox"
                    checked={examSecuritySettings.tabSwitchDetection}
                    onChange={(e) => setExamSecuritySettings((prev) => ({ ...prev, tabSwitchDetection: e.target.checked }))}
                    className="accent-amber-500 w-4 h-4 rounded"
                  />
                  <span className="text-xs font-mono font-bold text-white">
                    {examSecuritySettings.tabSwitchDetection ? "Enabled (সক্রিয়)" : "Disabled (নিষ্ক্রিয়)"}
                  </span>
                </label>
              </div>

              {/* Max Allowed Violations */}
              <div className="bg-black/50 p-4 rounded-xl border border-gray-800 flex flex-col justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold font-mono uppercase text-gray-300 block mb-1">
                    Max Allowed Violations
                  </span>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Student receives warnings before final violation triggers auto-submission.
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-2 border-t border-gray-800">
                  <select
                    value={examSecuritySettings.maxAllowedViolations}
                    onChange={(e) => setExamSecuritySettings((prev) => ({ ...prev, maxAllowedViolations: Number(e.target.value) }))}
                    className="bg-black border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-amber-400 font-mono font-bold focus:outline-none"
                  >
                    <option value={1}>1 Violation (Strict - Instant)</option>
                    <option value={2}>2 Violations (1 Warning)</option>
                    <option value={3}>3 Violations (2 Warnings - Recommended)</option>
                    <option value={4}>4 Violations (3 Warnings)</option>
                    <option value={5}>5 Violations (Relaxed)</option>
                  </select>
                </div>
              </div>

              {/* Auto Submit On Max Limit */}
              <div className="bg-black/50 p-4 rounded-xl border border-gray-800 flex flex-col justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold font-mono uppercase text-gray-300 block mb-1">
                    Auto-Submit on Limit
                  </span>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Automatically submit exam and lock answers when max violations are reached.
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer pt-2 border-t border-gray-800">
                  <input
                    type="checkbox"
                    checked={examSecuritySettings.autoSubmitOnMaxViolations}
                    onChange={(e) => setExamSecuritySettings((prev) => ({ ...prev, autoSubmitOnMaxViolations: e.target.checked }))}
                    className="accent-red-500 w-4 h-4 rounded"
                  />
                  <span className="text-xs font-mono font-bold text-white">
                    {examSecuritySettings.autoSubmitOnMaxViolations ? "Auto-Submit Active" : "Log Only"}
                  </span>
                </label>
              </div>
            </div>

            {/* Custom Warning Messages Inputs */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold font-mono uppercase text-gray-300 block mb-1">
                  Bangla Warning Modal Message
                </label>
                <textarea
                  rows={2}
                  value={examSecuritySettings.warningMessageBn}
                  onChange={(e) => setExamSecuritySettings((prev) => ({ ...prev, warningMessageBn: e.target.value }))}
                  className="w-full bg-black/60 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 resize-none font-sans"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold font-mono uppercase text-gray-300 block mb-1">
                  English Warning Modal Message
                </label>
                <textarea
                  rows={2}
                  value={examSecuritySettings.warningMessageEn}
                  onChange={(e) => setExamSecuritySettings((prev) => ({ ...prev, warningMessageEn: e.target.value }))}
                  className="w-full bg-black/60 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 resize-none font-sans"
                />
              </div>
            </div>

            {/* Real-time Violations Audit Trail Table */}
            <div className="mt-5 pt-4 border-t border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono uppercase text-white flex items-center gap-1.5">
                    <EyeOff className="w-3.5 h-3.5 text-red-400" />
                    LIVE TAB SWITCH VIOLATION AUDIT TRAIL ({examViolationsList.length} LOGS)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={violationsFilterExamId}
                    onChange={(e) => setViolationsFilterExamId(e.target.value)}
                    className="bg-black border border-gray-800 rounded-lg px-2.5 py-1 text-[11px] text-gray-300 font-mono focus:outline-none"
                  >
                    <option value="all">All Exams</option>
                    {Array.from(new Set(examViolationsList.map((v) => v.examId))).map((exId) => {
                      const sample = examViolationsList.find((v) => v.examId === exId);
                      return (
                        <option key={exId} value={exId}>
                          {sample?.examTitle || exId}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {examViolationsList.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-xs font-mono bg-black/30 rounded-xl border border-gray-850">
                  No exam tab switch violations recorded yet. Security system active.
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto rounded-xl border border-gray-850 bg-black/40 scrollbar-thin">
                  <table className="w-full text-left font-mono text-[11px]">
                    <thead className="bg-black/80 text-gray-400 border-b border-gray-800 sticky top-0">
                      <tr>
                        <th className="p-2.5">Time</th>
                        <th className="p-2.5">Student</th>
                        <th className="p-2.5">Exam</th>
                        <th className="p-2.5">Event</th>
                        <th className="p-2.5 text-center">Violation Count</th>
                        <th className="p-2.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-850">
                      {examViolationsList
                        .filter((v) => violationsFilterExamId === "all" || v.examId === violationsFilterExamId)
                        .slice(0, 50)
                        .map((viol) => (
                          <tr key={viol.id} className="hover:bg-white/5 transition">
                            <td className="p-2.5 text-gray-400 whitespace-nowrap">
                              {new Date(viol.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                            </td>
                            <td className="p-2.5 text-white font-bold whitespace-nowrap">
                              <div>{viol.studentName}</div>
                              <div className="text-[9px] text-gray-500">{viol.studentEmail}</div>
                            </td>
                            <td className="p-2.5 text-gray-300 truncate max-w-xs">{viol.examTitle}</td>
                            <td className="p-2.5">
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px]">
                                {viol.violationType}
                              </span>
                            </td>
                            <td className="p-2.5 text-center font-bold">
                              <span className={viol.violationCount >= viol.maxAllowed ? "text-red-400 font-black" : "text-amber-400"}>
                                {viol.violationCount} / {viol.maxAllowed}
                              </span>
                            </td>
                            <td className="p-2.5 text-right whitespace-nowrap">
                              {viol.violationCount >= viol.maxAllowed ? (
                                <span className="px-2 py-0.5 rounded bg-red-950/80 border border-red-500/60 text-red-300 text-[9px] font-bold uppercase">
                                  AUTO-SUBMITTED
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/40 text-amber-300 text-[9px] font-bold uppercase">
                                  WARNED
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="grid lg:grid-cols-12 gap-6">
            {/* Left Side: Create/Launch New Batch Form (7 cols) */}
            <div className="lg:col-span-7 bg-[#151515] p-6 rounded-2xl border border-white/10 flex flex-col gap-5 shadow-lg">
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <h4 className="font-extrabold uppercase text-sm text-white flex items-center gap-2 font-mono">
                  <Plus className="w-4 h-4 text-[#C1121F]" /> LAUNCH NEW EXAM BATCH
                </h4>
                <span className="text-[10px] bg-[#C1121F]/20 text-[#C1121F] border border-[#C1121F]/30 px-2 py-0.5 rounded font-mono font-bold uppercase">
                  LIVE SYNC ENGINE
                </span>
              </div>

              {/* Title & Target Audience */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold font-mono uppercase text-gray-300 block mb-1">
                    Exam Batch Title *
                  </label>
                  <input
                    type="text"
                    value={newBatchTitle}
                    onChange={(e) => setNewBatchTitle(e.target.value)}
                    placeholder="e.g. Medical Admission Model Test - Batch 01"
                    className="w-full bg-black/60 border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#C1121F] transition"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold font-mono uppercase text-gray-300 block mb-1">
                    Target Batch Audience
                  </label>
                  <select
                    value={newBatchTargetGroup}
                    onChange={(e) => setNewBatchTargetGroup(e.target.value)}
                    className="w-full bg-black/60 border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#C1121F] transition"
                  >
                    <option value="Medical Admission Paid Batch 2026">🏆 Medical Admission Paid Batch 2026</option>
                    <option value="Varsity Ka Special Batch">🎯 Varsity Ka Special Batch</option>
                    <option value="Exclusive Elite Squad">👑 Exclusive Elite Squad</option>
                    <option value="All Students (Public Free Exam)">🌐 All Students (Public Free Exam)</option>
                  </select>
                </div>
              </div>

              {/* Batch Description */}
              <div>
                <label className="text-[11px] font-bold font-mono uppercase text-gray-300 block mb-1">
                  Batch Description / Syllabus Overview
                </label>
                <textarea
                  value={newBatchDescription}
                  onChange={(e) => setNewBatchDescription(e.target.value)}
                  rows={2}
                  placeholder="Describe batch routine, textbook coverage, exam frequency..."
                  className="w-full bg-black/60 border border-gray-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#C1121F] transition resize-none"
                />
              </div>

              {/* Pricing & Start Date Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-black/40 p-3 rounded-xl border border-gray-850">
                <div>
                  <label className="text-[10px] font-bold font-mono uppercase text-gray-400 block mb-1">
                    Offer Price (৳)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={newBatchPrice}
                    onChange={(e) => setNewBatchPrice(Number(e.target.value))}
                    className="w-full bg-black border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-[#FFD700] font-mono font-bold focus:outline-none focus:border-[#C1121F]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold font-mono uppercase text-gray-400 block mb-1">
                    Regular Price (৳)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={newBatchOriginalPrice}
                    onChange={(e) => setNewBatchOriginalPrice(Number(e.target.value))}
                    className="w-full bg-black border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-gray-400 font-mono focus:outline-none focus:border-[#C1121F]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold font-mono uppercase text-gray-400 block mb-1">
                    Batch Start Date
                  </label>
                  <input
                    type="date"
                    value={newBatchStartDate}
                    onChange={(e) => setNewBatchStartDate(e.target.value)}
                    className="w-full bg-black border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:border-[#C1121F]"
                  />
                </div>
              </div>

              {/* Cover Photo Selection */}
              <div className="bg-black/40 p-3.5 rounded-xl border border-gray-850 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold font-mono uppercase text-gray-300 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-[#FFD700]" /> Batch Course Cover Photo *
                  </label>
                  <span className="text-[10px] text-gray-400 font-mono">Upload file or pick banner</span>
                </div>

                {/* Cover Image Preview */}
                {newBatchCoverImage ? (
                  <div className="relative w-full h-32 rounded-xl overflow-hidden border border-gray-800 bg-black group">
                    <img src={newBatchCoverImage} alt="Cover Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                      <label className="px-3 py-1.5 bg-[#C1121F] text-white text-xs font-mono font-bold rounded-lg cursor-pointer hover:bg-red-700 flex items-center gap-1">
                        <Upload className="w-3.5 h-3.5" /> Change Photo
                        <input type="file" accept="image/*" onChange={(e) => handleCoverImageUpload(e, false)} className="hidden" />
                      </label>
                      <button
                        type="button"
                        onClick={() => setNewBatchCoverImage("")}
                        className="px-3 py-1.5 bg-gray-800 text-gray-300 text-xs font-mono rounded-lg hover:bg-gray-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-24 border-2 border-dashed border-gray-800 rounded-xl flex flex-col items-center justify-center gap-1.5 text-gray-500 text-xs">
                    <Upload className="w-5 h-5 text-gray-600" />
                    <span>No cover photo selected</span>
                  </div>
                )}

                {/* Custom Image URL Input + File Upload Button */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      value={newBatchCoverImage}
                      onChange={(e) => setNewBatchCoverImage(e.target.value)}
                      placeholder="Paste Image URL (https://...)"
                      className="w-full bg-black border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#C1121F]"
                    />
                  </div>
                  <label className="py-1.5 px-3 bg-gray-850 hover:bg-gray-800 border border-gray-700 text-gray-200 text-xs font-mono font-bold rounded-lg cursor-pointer flex items-center justify-center gap-1 transition">
                    <Upload className="w-3.5 h-3.5 text-[#FFD700]" /> Upload Image
                    <input type="file" accept="image/*" onChange={(e) => handleCoverImageUpload(e, false)} className="hidden" />
                  </label>
                </div>

                {/* Preset Banners Quick Selector */}
                <div>
                  <span className="text-[10px] text-gray-400 font-mono block mb-1.5">Or Choose Quick Preset Medical Cover Photo:</span>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {PRESET_COVER_PHOTOS.map((preset, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => setNewBatchCoverImage(preset.url)}
                        className={`p-1 rounded-lg border text-left flex flex-col gap-1 transition overflow-hidden ${
                          newBatchCoverImage === preset.url ? "border-[#FFD700] ring-1 ring-[#FFD700] bg-black" : "border-gray-800 bg-black/40 hover:border-gray-700"
                        }`}
                      >
                        <img src={preset.url} alt={preset.name} className="w-full h-10 object-cover rounded" />
                        <span className="text-[9px] font-mono text-gray-300 truncate px-0.5">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Subject & Chapter */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold font-mono uppercase text-gray-300 block mb-1">
                    Subject
                  </label>
                  <select
                    value={newBatchSubject}
                    onChange={(e) => {
                      setNewBatchSubject(e.target.value);
                      setNewBatchChapter("All");
                    }}
                    className="w-full bg-black/60 border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#C1121F] transition"
                  >
                    <option value="Biology">Biology (জীববিজ্ঞান)</option>
                    <option value="Chemistry">Chemistry (রসায়ন)</option>
                    <option value="Physics">Physics (পদার্থবিজ্ঞান)</option>
                    <option value="GK">General Knowledge (সাধারণ জ্ঞান)</option>
                    <option value="English">English (ইংরেজি)</option>
                    <option value="Full Model Test">Full Model Test (সকল বিষয়)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold font-mono uppercase text-gray-300 block mb-1">
                    Chapter / Scope
                  </label>
                  <select
                    value={newBatchChapter}
                    onChange={(e) => setNewBatchChapter(e.target.value)}
                    className="w-full bg-black/60 border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#C1121F] transition"
                  >
                    <option value="All">All Chapters (Full Subject)</option>
                    {Array.from(
                      new Set(
                        getPoolOfQuestions()
                          .filter((q) => newBatchSubject === "Full Model Test" || q.subject.toLowerCase() === newBatchSubject.toLowerCase())
                          .map((q) => q.chapter)
                          .filter(Boolean)
                      )
                    ).map((chap) => (
                      <option key={chap} value={chap}>
                        {chap}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Exam Settings Row (Duration, Count, Neg Marking, Passcode) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-black/30 p-3.5 rounded-xl border border-gray-850">
                <div>
                  <label className="text-[10px] font-bold font-mono uppercase text-gray-400 block mb-1">
                    Time (Mins)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={newBatchDuration}
                    onChange={(e) => setNewBatchDuration(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-black border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-[#FFD700] font-mono font-bold focus:outline-none focus:border-[#C1121F]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold font-mono uppercase text-gray-400 block mb-1">
                    MCQ Count
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={newBatchQuestionsCount}
                    onChange={(e) => setNewBatchQuestionsCount(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-black border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:border-[#C1121F]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold font-mono uppercase text-gray-400 block mb-1">
                    Negative Mark
                  </label>
                  <select
                    value={newBatchNegMarking}
                    onChange={(e) => setNewBatchNegMarking(Number(e.target.value))}
                    className="w-full bg-black border border-gray-800 rounded-lg px-2 py-1.5 text-xs text-red-400 font-mono focus:outline-none"
                  >
                    <option value={0.25}>-0.25 (Med Standard)</option>
                    <option value={0.50}>-0.50 (Varsity)</option>
                    <option value={0.00}>0.00 (No Neg)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold font-mono uppercase text-gray-400 block mb-1">
                    Passcode (Opt)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. BATCH26"
                    value={newBatchPasscode}
                    onChange={(e) => setNewBatchPasscode(e.target.value)}
                    className="w-full bg-black border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#C1121F]"
                  />
                </div>
              </div>

              {/* Question Selection Mode */}
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold font-mono uppercase text-gray-300">
                  Question Selection Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewBatchSelectionMode("auto")}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition ${
                      newBatchSelectionMode === "auto"
                        ? "bg-[#C1121F]/20 border-[#C1121F] text-white"
                        : "bg-black/40 border-gray-800 text-gray-400 hover:text-white"
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-[#FFD700] shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold font-mono uppercase">🤖 Smart Auto-Pick</div>
                      <div className="text-[10px] text-gray-400">Auto-pulls {newBatchQuestionsCount} unique questions from pool</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewBatchSelectionMode("manual")}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition ${
                      newBatchSelectionMode === "manual"
                        ? "bg-[#C1121F]/20 border-[#C1121F] text-white"
                        : "bg-black/40 border-gray-800 text-gray-400 hover:text-white"
                    }`}
                  >
                    <Sliders className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold font-mono uppercase">🎯 Manual Question Picker</div>
                      <div className="text-[10px] text-gray-400">Selected: {newBatchManualQIds.length} MCQs</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Manual Question Selector Drawer (When manual mode active) */}
              {newBatchSelectionMode === "manual" && (
                <div className="bg-black/60 p-4 rounded-xl border border-emerald-900/50 flex flex-col gap-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold font-mono text-emerald-400 uppercase">
                      Select MCQs for Batch ({newBatchManualQIds.length} Picked)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsBatchBankSelectorOpen(true)}
                        className="px-3 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md cursor-pointer"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        📚 Question Bank Selector
                      </button>
                      <input
                        type="text"
                        placeholder="Quick search..."
                        value={batchSearchQ}
                        onChange={(e) => setBatchSearchQ(e.target.value)}
                        className="bg-black border border-gray-800 rounded-lg px-2.5 py-1 text-[11px] text-white focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto max-h-48 flex flex-col gap-1.5 pr-1 text-xs">
                    {getPoolOfQuestions()
                      .filter((q) => {
                        const sub = (q.subject || "").toLowerCase();
                        const subMatch = newBatchSubject === "Full Model Test" || sub === newBatchSubject.toLowerCase();
                        const bQ = (batchSearchQ || "").toLowerCase();
                        const searchMatch =
                          !bQ ||
                          (q.questionText || "").toLowerCase().includes(bQ) ||
                          (q.chapter || "").toLowerCase().includes(bQ);
                        return subMatch && searchMatch;
                      })
                      .slice(0, 100)
                      .map((q) => {
                        const qId = q.id || q.questionText;
                        const isChecked = newBatchManualQIds.includes(qId);
                        return (
                          <label
                            key={qId}
                            className={`p-2 rounded-lg border flex items-start gap-2.5 cursor-pointer transition ${
                              isChecked ? "bg-emerald-950/40 border-emerald-500/50 text-white" : "bg-black/30 border-gray-850 text-gray-400 hover:text-white"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewBatchManualQIds((prev) => [...prev, qId]);
                                } else {
                                  setNewBatchManualQIds((prev) => prev.filter((id) => id !== qId));
                                }
                              }}
                              className="mt-1 accent-emerald-500"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="line-clamp-1 font-medium">{q.questionText}</div>
                              <div className="text-[10px] font-mono text-gray-500">
                                {q.subject} • {q.chapter}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Broadcast Notice Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer bg-black/40 p-3 rounded-xl border border-gray-800 hover:border-gray-700 transition">
                <input
                  type="checkbox"
                  checked={newBatchBroadcastNotice}
                  onChange={(e) => setNewBatchBroadcastNotice(e.target.checked)}
                  className="accent-[#C1121F] w-4 h-4 rounded"
                />
                <span className="text-xs text-gray-300 font-medium flex items-center gap-1.5">
                  <Volume2 className="w-4 h-4 text-[#FFD700]" />
                  Broadcast Live Announcement Notice to Dashboard Notice Board
                </span>
              </label>

              {/* Launch Button */}
              <button
                onClick={handleLaunchExamBatch}
                disabled={isCreatingBatch}
                className="w-full py-3 bg-[#C1121F] hover:bg-red-700 disabled:opacity-50 text-white font-black uppercase text-xs tracking-wider rounded-xl transition duration-300 font-mono shadow-lg flex items-center justify-center gap-2"
              >
                {isCreatingBatch ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> LAUNCHING BATCH...
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4" /> LAUNCH & PUBLISH EXAM BATCH NOW
                  </>
                )}
              </button>
            </div>

            {/* Right Side: Active Live Exam Batches List (5 cols) */}
            <div className="lg:col-span-5 bg-[#151515] p-6 rounded-2xl border border-white/10 flex flex-col gap-4 shadow-lg">
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <h4 className="font-extrabold uppercase text-sm text-white flex items-center gap-2 font-mono">
                  <Award className="w-4 h-4 text-[#FFD700]" /> LIVE BATCHES ({liveExams.length})
                </h4>
                <span className="text-[10px] text-gray-400 font-mono">REALTIME FIRESTORE</span>
              </div>

              {liveExams.length === 0 ? (
                <div className="text-center py-12 text-gray-500 font-mono text-xs flex flex-col items-center gap-2">
                  <Clock className="w-8 h-8 text-gray-700" />
                  No Exam Batches launched yet. Fill form and click Launch!
                </div>
              ) : (
                <div className="flex flex-col gap-3 overflow-y-auto max-h-[600px] pr-1">
                  {liveExams.map((exam) => {
                    const examSubs = liveSubmissions.filter((s) => s.examId === exam.id);
                    return (
                      <div
                        key={exam.id}
                        className={`p-4 rounded-xl border transition flex flex-col gap-2.5 relative ${
                          exam.isActive ? "bg-black/60 border-emerald-500/30" : "bg-black/30 border-gray-850 opacity-70"
                        }`}
                      >
                        {/* Cover Photo Thumbnail */}
                        {exam.coverImage && (
                          <div className="w-full h-24 rounded-lg overflow-hidden border border-gray-800 bg-black">
                            <img src={exam.coverImage} alt={exam.title} className="w-full h-full object-cover" />
                          </div>
                        )}

                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                                  exam.isActive ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-gray-800 text-gray-400"
                                }`}
                              >
                                {exam.isActive ? "● LIVE ACTIVE" : "PAUSED"}
                              </span>
                              <span className="text-[9px] bg-red-950/40 text-red-400 border border-red-900/40 px-2 py-0.5 rounded font-mono">
                                {exam.targetGroup || "Paid Batch"}
                              </span>
                              <span className="text-[9px] bg-yellow-950/40 text-yellow-400 border border-yellow-900/40 px-2 py-0.5 rounded font-mono font-bold">
                                ৳{exam.price || 499}
                              </span>
                            </div>
                            <h5 className="font-bold text-sm text-white mt-1.5 line-clamp-1">{exam.title}</h5>
                          </div>
                        </div>

                        {/* Badges Info */}
                        <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400 flex-wrap">
                          <span className="text-emerald-400 font-bold">{exam.subject}</span>
                          <span>•</span>
                          <span>{exam.totalQuestions} Questions</span>
                          <span>•</span>
                          <span>{exam.duration} Mins</span>
                          {exam.negMarking !== undefined && (
                            <>
                              <span>•</span>
                              <span className="text-red-400">Neg: -{exam.negMarking}</span>
                            </>
                          )}
                        </div>

                        {/* Live Countdown Timer */}
                        <BatchEventCountdownTimer
                          batch={exam}
                          language="bn"
                          variant="card-chip"
                          className="my-1"
                        />

                        {/* Action Toolbar */}
                        <div className="flex items-center justify-between border-t border-gray-900 pt-2.5 mt-1">
                          <button
                            onClick={() => setSelectedBatchForSubmissions(exam)}
                            className="text-[11px] font-mono text-[#FFD700] hover:underline flex items-center gap-1 font-bold"
                          >
                            <Eye className="w-3.5 h-3.5" /> Submissions ({examSubs.length})
                          </button>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setEditingBatch(exam)}
                              title="Edit Course Details & Cover Photo"
                              className="p-1.5 bg-blue-950/40 text-blue-400 hover:bg-blue-900/60 rounded-lg transition"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleBroadcastBatchReminder(exam)}
                              title="Broadcast Reminder Notice"
                              className="p-1.5 bg-yellow-950/40 text-yellow-400 hover:bg-yellow-900/60 rounded-lg transition"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleExamBatchStatus(exam.id, exam.isActive)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition ${
                                exam.isActive ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              }`}
                            >
                              {exam.isActive ? "Pause" : "Activate"}
                            </button>
                            <button
                              onClick={() => handleDeleteExamBatch(exam.id, exam.title)}
                              className="p-1.5 bg-red-950/40 text-red-400 hover:bg-red-900/60 rounded-lg transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUBMISSIONS & LEADERBOARD MODAL FOR EXAM BATCH */}
      {selectedBatchForSubmissions && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-white/10 w-full max-w-3xl rounded-2xl p-6 flex flex-col gap-4 max-h-[90vh] overflow-hidden shadow-2xl relative">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-800 pb-3">
              <div>
                <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase">
                  EXAM BATCH REAL-TIME SUBMISSIONS & MARKS MATRIX
                </span>
                <h4 className="font-bold text-lg text-white">{selectedBatchForSubmissions.title}</h4>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setNewExamMarkForm({
                      studentUid: usersList[0]?.uid || "",
                      studentName: usersList[0]?.displayName || "",
                      studentEmail: usersList[0]?.email || "",
                      examId: selectedBatchForSubmissions.id,
                      examTitle: selectedBatchForSubmissions.title,
                      score: 80,
                      totalMarks: selectedBatchForSubmissions.questionsCount || 100,
                      correctCount: 82,
                      wrongCount: 8,
                      rank: 1,
                      adminRemarks: "Admin Evaluated & Verified",
                    });
                    setIsAddExamMarkModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-[#C1121F] hover:bg-red-700 text-white rounded-lg text-xs font-mono font-bold uppercase flex items-center gap-1.5 shadow-lg shadow-red-900/20 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> ADD / INPUT MARK
                </button>
                <button
                  onClick={() => setSelectedBatchForSubmissions(null)}
                  className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Submissions List */}
            <div className="overflow-y-auto flex flex-col gap-2.5 pr-1 my-2 max-h-[60vh]">
              {liveSubmissions.filter((s) => s.examId === selectedBatchForSubmissions.id).length === 0 ? (
                <div className="text-center py-12 text-gray-500 font-mono text-xs flex flex-col items-center gap-2">
                  <span>No student submissions recorded yet for this exam batch.</span>
                  <span className="text-[11px] text-gray-600">You can click "+ ADD / INPUT MARK" above to manually enter marks for any student.</span>
                </div>
              ) : (
                liveSubmissions
                  .filter((s) => s.examId === selectedBatchForSubmissions.id)
                  .map((sub, idx) => (
                    <div
                      key={sub.id || idx}
                      className="bg-black/50 border border-gray-850 p-3.5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs hover:border-gray-750 transition"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-black text-yellow-500 w-6 text-center text-sm">#{sub.rank || idx + 1}</span>
                        <div>
                          <div className="font-bold text-white flex items-center gap-2">
                            {sub.userDisplayName || sub.userEmail || "Aspirant Student"}
                            {sub.evaluatedByAdmin && (
                              <span className="px-1.5 py-0.2 text-[8px] font-mono font-bold bg-purple-950/60 border border-purple-500/30 text-purple-300 rounded uppercase">
                                Admin Evaluated
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-500 font-mono flex items-center gap-2">
                            <span>{sub.userEmail}</span>
                            <span>•</span>
                            <span>{new Date(sub.submittedAt || sub.createdAt || Date.now()).toLocaleString()}</span>
                          </div>
                          {sub.adminRemarks && (
                            <div className="text-[10px] text-amber-400/80 font-mono mt-0.5">
                              💬 Remarks: {sub.adminRemarks}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-white/5">
                        <div className="text-left sm:text-right">
                          <div className="font-black text-[#FFD700] text-sm font-mono">{sub.score} Marks</div>
                          <div className="text-[10px] text-emerald-400 font-mono">
                            {sub.correctCount || 0} Correct / {sub.wrongCount || 0} Wrong
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingSubmission(sub)}
                            className="px-2.5 py-1.5 bg-blue-950/40 hover:bg-blue-900/60 border border-blue-500/30 text-blue-300 rounded-lg text-[10px] font-mono font-bold uppercase flex items-center gap-1 cursor-pointer transition"
                            title="Edit / Override Student Marks"
                          >
                            <Edit2 className="w-3 h-3" /> Edit Mark
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSubmission(sub.id)}
                            className="p-1.5 hover:bg-red-950/40 border border-transparent hover:border-red-500/30 text-gray-500 hover:text-red-400 rounded-lg transition cursor-pointer"
                            title="Delete Submission"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-gray-850">
              <span className="text-[10px] text-gray-500 font-mono">
                Total Submissions: {liveSubmissions.filter((s) => s.examId === selectedBatchForSubmissions.id).length}
              </span>
              <button
                onClick={() => setSelectedBatchForSubmissions(null)}
                className="px-5 py-2 bg-gray-800 hover:bg-gray-700 text-white font-mono text-xs uppercase font-bold rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT / OVERRIDE STUDENT EXAM MARKS MODAL */}
      {editingSubmission && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-white/10 w-full max-w-lg rounded-2xl p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div>
                <span className="text-[10px] text-yellow-400 font-mono font-bold uppercase">
                  MANUAL EXAM MARKS OVERRIDE / EVALUATION
                </span>
                <h4 className="font-bold text-lg text-white">
                  {editingSubmission.userDisplayName || editingSubmission.userEmail || "Student Marks"}
                </h4>
              </div>
              <button
                onClick={() => setEditingSubmission(null)}
                className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmissionMarks} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold font-mono uppercase text-gray-300 block mb-1">
                    Net Score / Marks (নম্বর)
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    value={editingSubmission.score ?? 0}
                    onChange={(e) => setEditingSubmission({ ...editingSubmission, score: Number(e.target.value) })}
                    className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm text-[#FFD700] font-mono font-bold focus:outline-none focus:border-[#C1121F]"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold font-mono uppercase text-gray-300 block mb-1">
                    Merit Rank (মেধা স্থান)
                  </label>
                  <input
                    type="number"
                    value={editingSubmission.rank ?? 1}
                    onChange={(e) => setEditingSubmission({ ...editingSubmission, rank: Number(e.target.value) })}
                    className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#C1121F]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold font-mono uppercase text-emerald-400 block mb-1">
                    Correct Count (সঠিক উত্তর)
                  </label>
                  <input
                    type="number"
                    value={editingSubmission.correctCount ?? 0}
                    onChange={(e) => setEditingSubmission({ ...editingSubmission, correctCount: Number(e.target.value) })}
                    className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold font-mono uppercase text-red-400 block mb-1">
                    Wrong Count (ভুল উত্তর)
                  </label>
                  <input
                    type="number"
                    value={editingSubmission.wrongCount ?? 0}
                    onChange={(e) => setEditingSubmission({ ...editingSubmission, wrongCount: Number(e.target.value) })}
                    className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold font-mono uppercase text-gray-300 block mb-1">
                  Admin Remarks / Feedback (মন্তব্য)
                </label>
                <textarea
                  rows={2}
                  value={editingSubmission.adminRemarks || ""}
                  onChange={(e) => setEditingSubmission({ ...editingSubmission, adminRemarks: e.target.value })}
                  placeholder="e.g., Verified manually, great performance in Biology section"
                  className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C1121F] resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setEditingSubmission(null)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-mono font-bold rounded-lg cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#C1121F] hover:bg-red-700 text-white text-xs font-mono font-bold uppercase rounded-lg shadow-lg shadow-red-900/30 cursor-pointer transition"
                >
                  Save Marks
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANUALLY ADD EXAM MARK FOR A STUDENT MODAL */}
      {isAddExamMarkModalOpen && selectedBatchForSubmissions && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-white/10 w-full max-w-lg rounded-2xl p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div>
                <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase">
                  INPUT EXAM MARK FOR STUDENT
                </span>
                <h4 className="font-bold text-lg text-white">Direct Mark Entry</h4>
              </div>
              <button
                onClick={() => setIsAddExamMarkModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExamMark} className="flex flex-col gap-4">
              <div>
                <label className="text-[10px] font-bold font-mono uppercase text-gray-300 block mb-1">
                  Select Enrolled Student (শিক্ষার্থী নির্বাচন করুন)
                </label>
                <select
                  value={newExamMarkForm.studentUid}
                  onChange={(e) => {
                    const selected = usersList.find((u) => u.uid === e.target.value);
                    setNewExamMarkForm({
                      ...newExamMarkForm,
                      studentUid: e.target.value,
                      studentName: selected?.displayName || "",
                      studentEmail: selected?.email || "",
                    });
                  }}
                  className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C1121F]"
                  required
                >
                  <option value="">-- Choose Student --</option>
                  {usersList.map((u, uIdx) => (
                    <option key={`${u.uid || u.id || "usr"}_${uIdx}`} value={u.uid}>
                      {u.displayName} ({u.email}) - {u.college || "No College"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold font-mono uppercase text-gray-300 block mb-1">
                    Net Score / Marks (নম্বর)
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    value={newExamMarkForm.score}
                    onChange={(e) => setNewExamMarkForm({ ...newExamMarkForm, score: Number(e.target.value) })}
                    className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-sm text-[#FFD700] font-mono font-bold focus:outline-none focus:border-[#C1121F]"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold font-mono uppercase text-gray-300 block mb-1">
                    Merit Rank (র‍্যাংক)
                  </label>
                  <input
                    type="number"
                    value={newExamMarkForm.rank}
                    onChange={(e) => setNewExamMarkForm({ ...newExamMarkForm, rank: Number(e.target.value) })}
                    className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#C1121F]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold font-mono uppercase text-emerald-400 block mb-1">
                    Correct Answers (সঠিক)
                  </label>
                  <input
                    type="number"
                    value={newExamMarkForm.correctCount}
                    onChange={(e) => setNewExamMarkForm({ ...newExamMarkForm, correctCount: Number(e.target.value) })}
                    className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold font-mono uppercase text-red-400 block mb-1">
                    Wrong Answers (ভুল)
                  </label>
                  <input
                    type="number"
                    value={newExamMarkForm.wrongCount}
                    onChange={(e) => setNewExamMarkForm({ ...newExamMarkForm, wrongCount: Number(e.target.value) })}
                    className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold font-mono uppercase text-gray-300 block mb-1">
                  Evaluation Remarks / Feedback
                </label>
                <input
                  type="text"
                  value={newExamMarkForm.adminRemarks}
                  onChange={(e) => setNewExamMarkForm({ ...newExamMarkForm, adminRemarks: e.target.value })}
                  placeholder="e.g. Offline exam result uploaded by Admin"
                  className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C1121F]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsAddExamMarkModalOpen(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-mono font-bold rounded-lg cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#C1121F] hover:bg-red-700 text-white text-xs font-mono font-bold uppercase rounded-lg shadow-lg shadow-red-900/30 cursor-pointer transition"
                >
                  Submit Mark
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD NEW STUDENT MODAL */}
      {isAddStudentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-white/10 w-full max-w-xl rounded-2xl p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div>
                <span className="text-[10px] text-[#C1121F] font-mono font-bold uppercase">
                  STUDENT REGISTRATION MANAGEMENT
                </span>
                <h4 className="font-bold text-lg text-white">Add New Aspirant Student</h4>
              </div>
              <button
                onClick={() => setIsAddStudentModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="flex flex-col gap-4">
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold font-mono uppercase text-gray-300 block mb-1">
                    Student Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Sadia Rahman"
                    value={newStudentForm.displayName}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, displayName: e.target.value })}
                    className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C1121F]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold font-mono uppercase text-gray-300 block mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="student@example.com"
                    value={newStudentForm.email}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, email: e.target.value })}
                    className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C1121F]"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold font-mono uppercase text-gray-300 block mb-1">
                    Target / Current College
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dhaka Medical College (DMC)"
                    value={newStudentForm.college}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, college: e.target.value })}
                    className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C1121F]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold font-mono uppercase text-gray-300 block mb-1">
                    District
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dhaka, Chattogram, Rajshahi"
                    value={newStudentForm.district}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, district: e.target.value })}
                    className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C1121F]"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold font-mono uppercase text-gray-300 block mb-1">
                    Phone / Contact (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="017xxxxxxxx"
                    value={newStudentForm.phone}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, phone: e.target.value })}
                    className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C1121F]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold font-mono uppercase text-gray-300 block mb-1">
                    Starting Marks (XP)
                  </label>
                  <input
                    type="number"
                    value={newStudentForm.xp}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, xp: Number(e.target.value) })}
                    className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:border-[#C1121F]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold font-mono uppercase text-gray-300 block mb-1">
                    Gold Coins
                  </label>
                  <input
                    type="number"
                    value={newStudentForm.coins}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, coins: Number(e.target.value) })}
                    className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-xs text-[#FFD700] font-mono font-bold focus:outline-none focus:border-[#C1121F]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsAddStudentModalOpen(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-mono font-bold rounded-lg cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#C1121F] hover:bg-red-700 text-white text-xs font-mono font-bold uppercase rounded-lg shadow-lg shadow-red-900/30 cursor-pointer transition"
                >
                  Register Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT STUDENT DETAILS MODAL */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-white/10 w-full max-w-xl rounded-2xl p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div>
                <span className="text-[10px] text-blue-400 font-mono font-bold uppercase">
                  EDIT STUDENT PROFILE & METRICS
                </span>
                <h4 className="font-bold text-lg text-white">{editingStudent.displayName}</h4>
              </div>
              <button
                onClick={() => setEditingStudent(null)}
                className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStudent} className="flex flex-col gap-4">
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold font-mono uppercase text-gray-300 block mb-1">
                    Student Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editingStudent.displayName || ""}
                    onChange={(e) => setEditingStudent({ ...editingStudent, displayName: e.target.value })}
                    className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C1121F]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold font-mono uppercase text-gray-300 block mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={editingStudent.email || ""}
                    onChange={(e) => setEditingStudent({ ...editingStudent, email: e.target.value })}
                    className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C1121F]"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold font-mono uppercase text-gray-300 block mb-1">
                    College Name
                  </label>
                  <input
                    type="text"
                    value={editingStudent.college || ""}
                    onChange={(e) => setEditingStudent({ ...editingStudent, college: e.target.value })}
                    className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C1121F]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold font-mono uppercase text-gray-300 block mb-1">
                    District / Division
                  </label>
                  <input
                    type="text"
                    value={editingStudent.district || ""}
                    onChange={(e) => setEditingStudent({ ...editingStudent, district: e.target.value })}
                    className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C1121F]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 bg-black/40 p-3 rounded-xl border border-gray-800">
                <div>
                  <label className="text-[10px] font-bold font-mono uppercase text-emerald-400 block mb-1">
                    Total Marks (XP)
                  </label>
                  <input
                    type="number"
                    value={editingStudent.xp ?? 0}
                    onChange={(e) => setEditingStudent({ ...editingStudent, xp: Number(e.target.value) })}
                    className="w-full bg-black border border-gray-800 rounded px-2 py-1 text-xs text-emerald-400 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold font-mono uppercase text-[#FFD700] block mb-1">
                    Gold Coins
                  </label>
                  <input
                    type="number"
                    value={editingStudent.coins ?? 0}
                    onChange={(e) => setEditingStudent({ ...editingStudent, coins: Number(e.target.value) })}
                    className="w-full bg-black border border-gray-800 rounded px-2 py-1 text-xs text-[#FFD700] font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold font-mono uppercase text-gray-300 block mb-1">
                    Level
                  </label>
                  <input
                    type="number"
                    value={editingStudent.level ?? 1}
                    onChange={(e) => setEditingStudent({ ...editingStudent, level: Number(e.target.value) })}
                    className="w-full bg-black border border-gray-800 rounded px-2 py-1 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold font-mono uppercase text-gray-400 block mb-1">
                    Drills Solved
                  </label>
                  <input
                    type="number"
                    value={editingStudent.questionsSolved ?? 0}
                    onChange={(e) => setEditingStudent({ ...editingStudent, questionsSolved: Number(e.target.value) })}
                    className="w-full bg-black border border-gray-800 rounded px-2 py-1 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold font-mono uppercase text-gray-400 block mb-1">
                    Daily Streak
                  </label>
                  <input
                    type="number"
                    value={editingStudent.dailyStreak ?? 1}
                    onChange={(e) => setEditingStudent({ ...editingStudent, dailyStreak: Number(e.target.value) })}
                    className="w-full bg-black border border-gray-800 rounded px-2 py-1 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold font-mono uppercase text-gray-400 block mb-1">
                    User Role
                  </label>
                  <select
                    value={editingStudent.role || "student"}
                    onChange={(e) => setEditingStudent({ ...editingStudent, role: e.target.value as any })}
                    className="w-full bg-black border border-gray-800 rounded px-2 py-1 text-xs text-white font-mono"
                  >
                    <option value="student">Student</option>
                    <option value="moderator">Moderator</option>
                    <option value="admin">Admin</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => handleDeleteStudent(editingStudent.uid, editingStudent.displayName)}
                  className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-400 text-xs font-mono font-bold rounded-lg cursor-pointer transition flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Student
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingStudent(null)}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-mono font-bold rounded-lg cursor-pointer transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#C1121F] hover:bg-red-700 text-white text-xs font-mono font-bold uppercase rounded-lg shadow-lg shadow-red-900/30 cursor-pointer transition"
                  >
                    Update Details
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BATCH DETAILS & COVER PHOTO MODAL */}
      {editingBatch && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-white/10 w-full max-w-xl rounded-2xl p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div>
                <span className="text-[10px] text-[#FFD700] font-mono font-bold uppercase">
                  EDIT EXAM BATCH COURSE DETAILS & COVER
                </span>
                <h4 className="font-bold text-lg text-white">Edit Course Info</h4>
              </div>
              <button
                onClick={() => setEditingBatch(null)}
                className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Title & Audience */}
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold font-mono uppercase text-gray-300 block mb-1">Course Title</label>
                <input
                  type="text"
                  value={editingBatch.title || ""}
                  onChange={(e) => setEditingBatch({ ...editingBatch, title: e.target.value })}
                  className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C1121F]"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold font-mono uppercase text-gray-300 block mb-1">Target Group</label>
                <input
                  type="text"
                  value={editingBatch.targetGroup || ""}
                  onChange={(e) => setEditingBatch({ ...editingBatch, targetGroup: e.target.value })}
                  className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C1121F]"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-[10px] font-bold font-mono uppercase text-gray-300 block mb-1">Course Description / Routine</label>
              <textarea
                value={editingBatch.description || ""}
                onChange={(e) => setEditingBatch({ ...editingBatch, description: e.target.value })}
                rows={3}
                className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C1121F] resize-none"
              />
            </div>

            {/* Pricing & Start Date */}
            <div className="grid grid-cols-3 gap-2 bg-black/40 p-3 rounded-xl border border-gray-800">
              <div>
                <label className="text-[10px] font-bold font-mono uppercase text-gray-400 block mb-1">Offer Price (৳)</label>
                <input
                  type="number"
                  value={editingBatch.price ?? 499}
                  onChange={(e) => setEditingBatch({ ...editingBatch, price: Number(e.target.value) })}
                  className="w-full bg-black border border-gray-800 rounded px-2 py-1 text-xs text-[#FFD700] font-mono font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold font-mono uppercase text-gray-400 block mb-1">Regular Price (৳)</label>
                <input
                  type="number"
                  value={editingBatch.originalPrice ?? 999}
                  onChange={(e) => setEditingBatch({ ...editingBatch, originalPrice: Number(e.target.value) })}
                  className="w-full bg-black border border-gray-800 rounded px-2 py-1 text-xs text-gray-400 font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold font-mono uppercase text-gray-400 block mb-1">Start Date</label>
                <input
                  type="date"
                  value={editingBatch.startDate || ""}
                  onChange={(e) => setEditingBatch({ ...editingBatch, startDate: e.target.value })}
                  className="w-full bg-black border border-gray-800 rounded px-2 py-1 text-xs text-emerald-400 font-mono font-bold"
                />
              </div>
            </div>

            {/* Cover Photo */}
            <div className="bg-black/40 p-3 rounded-xl border border-gray-800 flex flex-col gap-2">
              <label className="text-[10px] font-bold font-mono uppercase text-gray-300 block">Cover Photo Image</label>
              {editingBatch.coverImage && (
                <div className="w-full h-28 rounded-lg overflow-hidden border border-gray-800 relative group">
                  <img src={editingBatch.coverImage} alt="Cover" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-1">
                <input
                  type="text"
                  value={editingBatch.coverImage || ""}
                  onChange={(e) => setEditingBatch({ ...editingBatch, coverImage: e.target.value })}
                  placeholder="Paste cover image URL..."
                  className="md:col-span-2 bg-black border border-gray-800 rounded px-2.5 py-1 text-xs text-white"
                />
                <label className="py-1 px-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-mono rounded cursor-pointer flex items-center justify-center gap-1">
                  <Upload className="w-3.5 h-3.5 text-[#FFD700]" /> Upload File
                  <input type="file" accept="image/*" onChange={(e) => handleCoverImageUpload(e, true)} className="hidden" />
                </label>
              </div>

              <div className="mt-2">
                <span className="text-[9px] text-gray-400 block mb-1">Quick Select Preset Banner:</span>
                <div className="grid grid-cols-4 gap-1.5">
                  {PRESET_COVER_PHOTOS.map((p, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => setEditingBatch({ ...editingBatch, coverImage: p.url })}
                      className="p-0.5 rounded border border-gray-800 hover:border-[#FFD700] overflow-hidden"
                    >
                      <img src={p.url} alt={p.name} className="w-full h-8 object-cover rounded" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-800">
              <button
                type="button"
                onClick={() => setEditingBatch(null)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-mono rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditedBatch}
                className="px-5 py-2 bg-[#C1121F] hover:bg-red-700 text-white text-xs font-mono font-bold uppercase rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" /> Save Course Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analytics center */}
      {activeTab === "analytics" && (
        <div className="bg-[#151515] p-6 rounded-xl border border-gray-800 relative">
          <div className="absolute top-0 left-6 h-1 w-24 bg-[#FFD700]"></div>
          <h3 className="font-extrabold uppercase text-base border-b border-gray-800 pb-3 mb-6 text-white">ADM CONSOLE ADVANCED ANALYTICS CENTER</h3>
          
          <div className="grid md:grid-cols-4 gap-4 mb-6 text-center">
            <div className="bg-black/30 border border-gray-900 p-4 rounded-lg">
              <span className="text-[10px] text-gray-500 uppercase font-mono block">Daily Active Users:</span>
              <span className="text-2xl font-black text-[#FFD700] block mt-0.5">840 Students</span>
            </div>
            <div className="bg-black/30 border border-gray-900 p-4 rounded-lg">
              <span className="text-[10px] text-gray-500 uppercase font-mono block">Monthly Growth Index:</span>
              <span className="text-2xl font-black text-white block mt-0.5">+48% Delta</span>
            </div>
            <div className="bg-black/30 border border-gray-900 p-4 rounded-lg">
              <span className="text-[10px] text-gray-500 uppercase font-mono block">Questions Solved:</span>
              <span className="text-2xl font-black text-[#C1121F] block mt-0.5">14,800 runs</span>
            </div>
            <div className="bg-black/30 border border-gray-900 p-4 rounded-lg">
              <span className="text-[10px] text-gray-500 uppercase font-mono block">Overall Accuracy:</span>
              <span className="text-2xl font-black text-white block mt-0.5">74.2%</span>
            </div>
          </div>

          <div className="bg-black/45 hover:bg-black/60 p-5 rounded-lg border border-gray-900 text-xs text-gray-400 leading-normal flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold text-white uppercase block mb-1">High Accuracy Chapters Track:</span>
              <span>- Cell structure & divisions: **81.4% accuracy** (Strongest)</span>
              <span className="block mt-1">- Organic chemistry compounds & reagents: **52% accuracy** (Weakest - Need study routines recommendations)</span>
            </div>
          </div>
        </div>
      )}

      {/* Notices Broadcaster */}
      {activeTab === "notices" && (
        <div className="grid md:grid-cols-3 gap-6">
          <form onSubmit={handleCreateNotice} className="bg-[#151515] p-5 border border-gray-850 rounded-xl flex flex-col gap-4 text-xs">
            <h3 className="font-extrabold uppercase text-sm border-b border-gray-805 pb-2 text-white">
              {editingNoticeId ? "EDIT ANNOUNCEMENT NOTICE" : "BROADCAST ANNOUNCEMENT"}
            </h3>
            
            <div className="flex flex-col gap-1">
              <label className="text-gray-450 uppercase font-mono">Title</label>
              <input
                type="text"
                required
                value={nTitle}
                onChange={(e) => setNTitle(e.target.value)}
                placeholder="Admission Deadline Shift..."
                className="bg-black text-white p-2 border border-gray-800 rounded"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-gray-455 uppercase font-mono">Content Body</label>
              <textarea
                required
                value={nContent}
                onChange={(e) => setNContent(e.target.value)}
                placeholder="Type platform updates, medical news details..."
                className="bg-black text-white p-2 border border-gray-800 rounded h-24"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-gray-450">Category</label>
                <select
                  value={nCategory}
                  onChange={(e) => setNCategory(e.target.value as any)}
                  className="bg-black text-white p-2 border border-gray-800 rounded"
                >
                  <option value="news">Medical News</option>
                  <option value="update">Platform update</option>
                  <option value="event">Major Event</option>
                </select>
              </div>

              <div className="flex items-center gap-2 mt-4 select-none">
                <input
                  type="checkbox"
                  id="not-important"
                  checked={nImportant}
                  onChange={(e) => setNImportant(e.target.checked)}
                  className="w-4 h-4 text-[#C1121F]"
                />
                <label htmlFor="not-important" className="text-gray-400 font-mono cursor-pointer">CRITICAL RED FLAG</label>
              </div>
            </div>

            <div className="flex gap-2">
              <button type="submit" className="flex-1 py-2.5 bg-[#C1121F] hover:bg-red-700 text-white font-bold rounded uppercase font-mono tracking-wider cursor-pointer">
                {editingNoticeId ? "SAVE CHANGES" : "DEPLOY BROADCAST"}
              </button>
              {editingNoticeId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingNoticeId(null);
                    setNTitle("");
                    setNContent("");
                    setNImportant(false);
                  }}
                  className="px-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded uppercase font-mono text-[10px] cursor-pointer"
                >
                  CANCEL
                </button>
              )}
            </div>
          </form>

          <div className="md:col-span-2 bg-[#151515] p-5 border border-gray-850 rounded-xl flex flex-col gap-4">
            <h3 className="font-extrabold uppercase text-sm border-b border-[#111111] pb-2 text-white">DEPLOYED COMMUNCATIONS</h3>
            {notices.length === 0 ? (
              <div className="text-center py-12 text-xs text-gray-500">No active notices generated yet.</div>
            ) : (
              <div className="flex flex-col gap-3 max-h-[350px] overflow-y-auto">
                {notices.map((n) => (
                  <div key={n.id} className="bg-black/40 border border-gray-900 p-4 rounded-lg flex justify-between items-start gap-4">
                    <div className="text-xs leading-normal">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="bg-[#FFD700]/15 text-[#FFD700] text-[9px] px-2 py-0.5 rounded font-mono font-black uppercase">{n.category}</span>
                        {n.important && <span className="bg-red-950 text-red-500 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold animate-pulse">IMPORTANT</span>}
                      </div>
                      <h4 className="font-extrabold text-sm text-white">{n.title}</h4>
                      <p className="text-gray-400 mt-1">{n.content}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingNoticeId(n.id);
                          setNTitle(n.title);
                          setNContent(n.content);
                          setNCategory(n.category);
                          setNImportant(n.important || false);
                        }}
                        className="text-gray-500 hover:text-[#FFD700] rounded p-1 transition cursor-pointer"
                        title="Edit Notice"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteNotice(n.id)}
                        className="text-gray-500 hover:text-[#C1121F] rounded p-1 transition cursor-pointer"
                        title="Decommission Notice"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "payments" && (
        <div className="flex flex-col gap-6" id="admin-payments-section">
          {/* Official Payment Numbers & WhatsApp Support Settings */}
          <div className="bg-[#151515] p-5 rounded-xl border border-gray-800 flex flex-col gap-4 text-xs">
            <h3 className="font-extrabold uppercase text-sm border-b border-gray-800 pb-2 text-white font-mono tracking-wider flex items-center gap-2">
              <span className="text-emerald-400">⚙️</span> CONFIGURE PAYMENT WALLET NUMBERS & WHATSAPP SUPPORT HELPLINE
            </h3>
            <p className="text-gray-400">
              Set the official bKash, Nagad, Rocket numbers and WhatsApp helpline phone number shown to students across course checkout and subscription portals.
            </p>
            <div className="grid sm:grid-cols-3 gap-4 mt-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-gray-400 uppercase font-mono font-bold flex items-center justify-between">
                  <span>bKash Number</span>
                  <span className="text-[#D12053] text-[10px]">Manual / Merchant</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., 01700-000000"
                  value={adminBkashNumber}
                  onChange={(e) => setAdminBkashNumber(e.target.value)}
                  className="px-3 py-2 text-xs font-mono rounded border border-gray-800 bg-black text-white focus:outline-none focus:border-[#D12053]"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-gray-400 uppercase font-mono font-bold flex items-center justify-between">
                  <span>Nagad Number</span>
                  <span className="text-[#F7931E] text-[10px]">Manual / Merchant</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., 01900-000000"
                  value={adminNagadNumber}
                  onChange={(e) => setAdminNagadNumber(e.target.value)}
                  className="px-3 py-2 text-xs font-mono rounded border border-gray-800 bg-black text-white focus:outline-none focus:border-[#F7931E]"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-gray-400 uppercase font-mono font-bold flex items-center justify-between">
                  <span>Rocket Number</span>
                  <span className="text-purple-400 text-[10px]">Manual / Personal</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., 01800-000000"
                  value={adminRocketNumber}
                  onChange={(e) => setAdminRocketNumber(e.target.value)}
                  className="px-3 py-2 text-xs font-mono rounded border border-gray-800 bg-black text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* WhatsApp & Phone Helpline Section */}
            <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-gray-850">
              <div className="flex flex-col gap-1.5">
                <label className="text-emerald-400 uppercase font-mono font-bold flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                  <span>WhatsApp Support Number (হোয়াটসঅ্যাপ হেল্পলাইন)</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="e.g., 01789000111 or +8801789000111"
                    value={adminHelplineWhatsapp}
                    onChange={(e) => setAdminHelplineWhatsapp(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs font-mono rounded border border-emerald-500/40 bg-black text-white focus:outline-none focus:border-emerald-400 font-bold"
                  />
                  {adminHelplineWhatsapp && (
                    <a
                      href={`https://wa.me/${(() => {
                        const raw = adminHelplineWhatsapp.replace(/[^0-9]/g, "");
                        return raw.startsWith("01") ? `88${raw}` : raw;
                      })()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-mono text-[11px] font-bold rounded transition whitespace-nowrap flex items-center gap-1"
                    >
                      <span>Test Link ↗</span>
                    </a>
                  )}
                </div>
                <span className="text-[10px] text-gray-500 font-mono">
                  This WhatsApp number is used on the course checkout page so students can directly click and message for help.
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-gray-400 uppercase font-mono font-bold flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-amber-400" />
                  <span>Helpline Phone Number</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., +880 1789-000111"
                  value={adminHelplinePhone}
                  onChange={(e) => setAdminHelplinePhone(e.target.value)}
                  className="px-3 py-2 text-xs font-mono rounded border border-gray-800 bg-black text-white focus:outline-none focus:border-[#C1121F]"
                />
                <span className="text-[10px] text-gray-500 font-mono">
                  Secondary contact phone number displayed if WhatsApp is unavailable.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-1">
              <button
                onClick={async () => {
                  try {
                    setIsUpdatingNumbers(true);
                    await setDoc(doc(db, "settings", "payment"), {
                      bkashNumber: adminBkashNumber,
                      nagadNumber: adminNagadNumber,
                      rocketNumber: adminRocketNumber,
                      helplineWhatsapp: adminHelplineWhatsapp,
                      helplinePhone: adminHelplinePhone,
                    }, { merge: true });
                    alert("Official payment wallet numbers and WhatsApp helpline updated successfully!");
                  } catch (err: any) {
                    alert("Failed to update numbers: " + err.message);
                  } finally {
                    setIsUpdatingNumbers(false);
                  }
                }}
                disabled={isUpdatingNumbers}
                className="py-2.5 px-6 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-lg uppercase font-mono tracking-wider transition shadow-md flex items-center gap-2 cursor-pointer"
              >
                {isUpdatingNumbers ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Save All Payment & Support Numbers</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-[#151515] p-4 rounded-xl border border-gray-800">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search by Transaction ID..."
                value={paySearch}
                onChange={(e) => setPaySearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs font-mono rounded-lg border border-gray-850 bg-black text-white focus:outline-none focus:border-[#C1121F]"
              />
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
              <span className="text-gray-400 font-mono text-[10px] uppercase font-bold shrink-0">Filter:</span>
              {(["All", "Pending", "Approved", "Rejected"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setPayStatusFilter(status)}
                  className={`py-1.5 px-3 rounded-lg text-[10px] font-mono font-bold uppercase transition ${
                    payStatusFilter === status
                      ? "bg-[#C1121F] text-white"
                      : "bg-black text-gray-400 hover:text-white"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-12 gap-6">
            {/* LEFT: Request list */}
            <div className="lg:col-span-7 bg-[#151515] p-5 rounded-xl border border-gray-800 flex flex-col gap-4">
              <h3 className="font-extrabold uppercase text-sm border-b border-gray-800 pb-2 text-white font-mono tracking-wider">
                PAYMENT VERIFICATION QUEUE ({paymentRequests.length})
              </h3>

              <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-1">
                {paymentRequests
                  .filter((req) => {
                    const matchesSearch = paySearch ? (req.transactionId || "").toLowerCase().includes(paySearch.toLowerCase()) : true;
                    const matchesStatus = payStatusFilter === "All" ? true : req.status === payStatusFilter;
                    return matchesSearch && matchesStatus;
                  })
                  .map((req) => {
                    const isSelected = inspectRequest?.id === req.id;
                    return (
                      <div
                        key={req.id}
                        onClick={() => {
                          setInspectRequest(req);
                          setNoteText(req.adminNotes || "");
                        }}
                        className={`p-4 rounded-xl border cursor-pointer transition flex flex-col gap-2.5 ${
                          isSelected
                            ? "bg-[#C1121F]/10 border-[#C1121F]"
                            : req.status === "Pending"
                              ? "bg-yellow-950/10 border-yellow-500/20 hover:border-yellow-500/30"
                              : req.status === "Approved"
                                ? "bg-emerald-950/5 border-emerald-500/10 hover:border-emerald-500/25"
                                : "bg-black/20 border-white/5 hover:border-white/10"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-xs font-black uppercase text-white font-mono flex items-center gap-2">
                              <span>{req.userName}</span>
                              <span className="text-[10px] text-gray-500 font-normal">({req.userEmail})</span>
                            </p>
                            <p className="text-[10px] text-gray-400 font-mono mt-1">
                              Plan: <span className="text-amber-500 font-bold">{req.selectedPlan.toUpperCase()}</span> | Amount: <span className="text-white font-bold">৳{req.amount}</span> | Method: <span className="text-pink-500 font-bold">{req.paymentMethod}</span>
                            </p>
                          </div>

                          <span className={`text-[9px] font-mono uppercase font-black px-2 py-0.5 rounded ${
                            req.status === "Approved"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : req.status === "Rejected"
                                ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 animate-pulse"
                          }`}>
                            {req.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-[10px] font-mono pt-2 border-t border-white/5 text-gray-400">
                          <div>
                            <span className="text-[8px] text-gray-500 block">TRANSACTION ID:</span>
                            <span className="font-extrabold text-white">{req.transactionId}</span>
                          </div>
                          <div>
                            <span className="text-[8px] text-gray-500 block">SENDER PHONE:</span>
                            <span className="font-bold text-gray-300">{req.senderNumber}</span>
                          </div>
                          <div>
                            <span className="text-[8px] text-gray-500 block">SUBMITTED ON:</span>
                            <span>{new Date(req.submissionDate).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                {paymentRequests.length === 0 && (
                  <div className="text-center py-12 text-xs text-gray-500">No payment requests matched the current criteria.</div>
                )}
              </div>
            </div>

            {/* RIGHT: Inspector Details */}
            <div className="lg:col-span-5 bg-[#151515] p-5 rounded-xl border border-gray-800 flex flex-col gap-4">
              <h3 className="font-extrabold uppercase text-sm border-b border-gray-800 pb-2 text-white font-mono tracking-wider">
                REQUEST INSPECTION & ACTION
              </h3>

              {inspectRequest ? (
                <div className="flex flex-col gap-5 text-xs">
                  
                  {/* User Profile Info */}
                  <div className="bg-black/40 border border-white/5 rounded-xl p-4 flex flex-col gap-2">
                    <h4 className="font-extrabold text-[#C1121F] font-mono uppercase text-[10px] tracking-wider mb-1">User Details</h4>
                    <p className="font-mono"><span className="text-gray-500">UID:</span> <span className="text-white font-bold select-all">{inspectRequest.userId}</span></p>
                    <p className="font-mono"><span className="text-gray-500">Name:</span> <span className="text-white font-bold">{inspectRequest.userName}</span></p>
                    <p className="font-mono"><span className="text-gray-500">Email:</span> <span className="text-white font-bold select-all">{inspectRequest.userEmail}</span></p>
                  </div>

                  {/* Transaction Info */}
                  <div className="bg-black/40 border border-white/5 rounded-xl p-4 flex flex-col gap-2.5">
                    <h4 className="font-extrabold text-[#C1121F] font-mono uppercase text-[10px] tracking-wider mb-1">Transaction Ledger</h4>
                    <div className="grid grid-cols-2 gap-2 font-mono">
                      <p><span className="text-gray-500">Plan:</span> <span className="text-amber-500 font-bold uppercase">{inspectRequest.selectedPlan}</span></p>
                      <p><span className="text-gray-500">Method:</span> <span className="text-white font-bold">{inspectRequest.paymentMethod}</span></p>
                      <p><span className="text-gray-500">Amount:</span> <span className="text-white font-extrabold">৳{inspectRequest.amount}</span></p>
                      <p><span className="text-gray-500">Sender:</span> <span className="text-white font-bold select-all">{inspectRequest.senderNumber}</span></p>
                    </div>
                    <div className="mt-1 pt-1.5 border-t border-white/5">
                      <p className="font-mono text-xs"><span className="text-gray-500">TrxID:</span> <span className="text-[#FFD700] font-black tracking-widest select-all">{inspectRequest.transactionId}</span></p>
                    </div>
                  </div>

                  {/* Screenshot proof */}
                  {inspectRequest.screenshotUrl ? (
                    <div className="bg-black/40 border border-white/5 rounded-xl p-4 flex flex-col gap-2">
                      <h4 className="font-extrabold text-[#C1121F] font-mono uppercase text-[10px] tracking-wider mb-1">Receipt Screenshot</h4>
                      <div className="relative group w-32 h-32 border border-gray-800 rounded-lg overflow-hidden cursor-zoom-in" onClick={() => setViewScreenshot(inspectRequest.screenshotUrl)}>
                        <img src={inspectRequest.screenshotUrl} alt="Receipt preview" className="w-full h-full object-cover group-hover:scale-105 transition-transform" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] font-mono font-bold text-white uppercase">
                          Open Screenshot
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-black/40 border border-white/5 rounded-xl p-4 text-center text-gray-500 font-mono text-[10px] uppercase">
                      No screenshot uploaded for this request.
                    </div>
                  )}

                  {/* Notes input */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-gray-400 font-mono uppercase font-bold text-[10px]">Admin Notes / Response Feedbacks</label>
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Specify rejection reason or approval details..."
                      rows={3}
                      className="w-full p-3 text-xs font-mono rounded-xl border border-gray-850 bg-black text-white focus:outline-none focus:border-[#C1121F]"
                    />
                  </div>

                  {/* Actions */}
                  {inspectRequest.status === "Pending" ? (
                    <div className="grid grid-cols-2 gap-3.5 mt-2">
                      <button
                        onClick={() => handleRejectPayment(inspectRequest)}
                        className="py-3 bg-red-650 hover:bg-red-750 text-white font-mono font-black text-xs tracking-wider rounded-xl transition cursor-pointer uppercase"
                      >
                        REJECT REQUEST
                      </button>
                      <button
                        onClick={() => handleApprovePayment(inspectRequest)}
                        className="py-3 bg-[#10B981] hover:bg-emerald-700 text-white font-mono font-black text-xs tracking-wider rounded-xl transition cursor-pointer uppercase"
                      >
                        APPROVE REQUEST
                      </button>
                    </div>
                  ) : (
                    <div className="bg-black/60 border border-white/5 rounded-xl p-3.5 text-center font-mono font-bold text-gray-400 uppercase text-[10px]">
                      This request has already been processed: <span className="text-white font-black">{inspectRequest.status.toUpperCase()}</span>
                    </div>
                  )}

                </div>
              ) : (
                <div className="text-center py-20 text-xs text-gray-500 font-mono uppercase tracking-wider">
                  Select a payment request from the queue to audit ledger details.
                </div>
              )}
            </div>
          </div>

          {/* Screenshot Modal Lightbox */}
          {viewScreenshot && (
            <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-4">
              <div className="max-w-4xl w-full max-h-[85vh] flex items-center justify-center relative">
                <img src={viewScreenshot} alt="Full screen proof receipt" className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl border border-white/10" referrerPolicy="no-referrer" />
              </div>
              <button
                onClick={() => setViewScreenshot(null)}
                className="mt-6 px-6 py-2.5 bg-white text-black font-mono font-black uppercase text-xs rounded-xl tracking-wider hover:bg-gray-200 transition cursor-pointer"
              >
                CLOSE PREVIEW
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === "mentor" && (
        <div className="flex flex-col gap-6" id="admin-mentor-section">
          {/* Subtabs Navigation */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-[#151515] p-4 rounded-xl border border-gray-800">
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
              <button
                onClick={() => {
                  setMentorSubTab("queries");
                  setSelectedQuery(null);
                }}
                className={`py-2 px-4 rounded-lg text-xs font-mono font-bold uppercase transition flex items-center gap-2 cursor-pointer ${
                  mentorSubTab === "queries"
                    ? "bg-[#C1121F] text-white"
                    : "bg-black text-gray-400 hover:text-white"
                }`}
              >
                <MessageSquare className="w-4 h-4 text-red-500" /> Student Queries Queue ({mentorQueries.length})
              </button>
              <button
                onClick={() => {
                  setMentorSubTab("predictions");
                  setSelectedPrediction(null);
                }}
                className={`py-2 px-4 rounded-lg text-xs font-mono font-bold uppercase transition flex items-center gap-2 cursor-pointer ${
                  mentorSubTab === "predictions"
                    ? "bg-[#C1121F] text-white"
                    : "bg-black text-gray-400 hover:text-white"
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-400" /> MAT Prediction Requests ({markPredictions.length})
              </button>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder={mentorSubTab === "queries" ? "Search by student name/email..." : "Search by student name..."}
                value={mentorSubTab === "queries" ? mentorSearch : predictionSearch}
                onChange={(e) => {
                  if (mentorSubTab === "queries") {
                    setMentorSearch(e.target.value);
                  } else {
                    setPredictionSearch(e.target.value);
                  }
                }}
                className="w-full pl-9 pr-4 py-2 text-xs font-mono rounded-lg border border-gray-850 bg-black text-white focus:outline-none focus:border-[#C1121F]"
              />
            </div>
          </div>

          <div className="grid lg:grid-cols-12 gap-6">
            {/* SUBTAB 1: Queries Queue */}
            {mentorSubTab === "queries" && (
              <>
                {/* Left: Queries List */}
                <div className="lg:col-span-7 bg-[#151515] p-5 rounded-xl border border-gray-800 flex flex-col gap-4">
                  <h3 className="font-extrabold uppercase text-sm border-b border-gray-800 pb-2 text-white font-mono tracking-wider">
                    QUESTIONS FROM ASPIRANTS
                  </h3>
                  <div className="flex flex-col gap-3 max-h-[550px] overflow-y-auto pr-1">
                    {mentorQueries
                      .filter((q) => {
                        return mentorSearch
                          ? q.userName?.toLowerCase().includes(mentorSearch.toLowerCase()) ||
                            q.userEmail?.toLowerCase().includes(mentorSearch.toLowerCase()) ||
                            q.question?.toLowerCase().includes(mentorSearch.toLowerCase())
                          : true;
                      })
                      .map((q) => {
                        const isSelected = selectedQuery?.id === q.id;
                        return (
                          <div
                            key={q.id}
                            onClick={() => {
                              setSelectedQuery(q);
                              setReplyText(q.reply || "");
                            }}
                            className={`p-4 rounded-xl border cursor-pointer transition flex flex-col gap-2 ${
                              isSelected
                                ? "bg-[#C1121F]/10 border-[#C1121F]"
                                : q.status === "pending"
                                ? "bg-yellow-950/10 border-yellow-500/20 hover:border-yellow-500/30"
                                : "bg-black/20 border-white/5 hover:border-white/10"
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-xs font-black uppercase text-white font-mono">
                                  {q.userName}
                                  <span className="text-[10px] text-gray-500 font-normal ml-2">({q.userEmail})</span>
                                </p>
                                <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                                  Asked: {new Date(q.createdAt).toLocaleString()}
                                </p>
                              </div>
                              <span
                                className={`text-[9px] font-mono uppercase font-black px-2 py-0.5 rounded ${
                                  q.status === "pending"
                                    ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 animate-pulse"
                                    : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                }`}
                              >
                                {q.status}
                              </span>
                            </div>
                            <p className="text-xs text-gray-305 mt-1 leading-relaxed bg-black/30 p-2 rounded border border-gray-900/40 line-clamp-2">
                              {q.question}
                            </p>
                            {q.reply && (
                              <p className="text-[11px] text-emerald-400 italic font-mono truncate mt-1">
                                Reply: {q.reply}
                              </p>
                            )}
                          </div>
                        );
                      })}

                    {mentorQueries.length === 0 && (
                      <div className="text-center py-12 text-xs text-gray-500 font-mono uppercase">
                        No mentor questions submitted yet.
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Inspector / Reply Form */}
                <div className="lg:col-span-5 bg-[#151515] p-5 rounded-xl border border-gray-800 flex flex-col gap-4">
                  <h3 className="font-extrabold uppercase text-sm border-b border-gray-800 pb-2 text-white font-mono tracking-wider">
                    REPLY INSPECTOR
                  </h3>
                  {selectedQuery ? (
                    <div className="flex flex-col gap-4 text-xs">
                      <div className="bg-black/45 border border-white/5 rounded-xl p-4 flex flex-col gap-1.5">
                        <span className="text-[10px] font-mono text-gray-500 uppercase">STUDENT INFO:</span>
                        <p className="font-bold text-white text-sm">{selectedQuery.userName}</p>
                        <p className="font-mono text-gray-400">{selectedQuery.userEmail}</p>
                      </div>

                      <div className="bg-black/45 border border-white/5 rounded-xl p-4 flex flex-col gap-1.5">
                        <span className="text-[10px] font-mono text-gray-500 uppercase">QUESTION TEXT:</span>
                        <p className="text-gray-200 text-xs leading-relaxed whitespace-pre-wrap">{selectedQuery.question}</p>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-gray-400 font-mono uppercase font-bold text-[10px]">
                          Your Response / Answer
                        </label>
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Type comprehensive biological pathways, mnemonic tricks, or textbook guidelines for the student..."
                          rows={6}
                          className="w-full p-3 text-xs font-mono rounded-xl border border-gray-850 bg-black text-white focus:outline-none focus:border-[#C1121F]"
                        />
                      </div>

                      <button
                        onClick={() => handleReplyToQuery(selectedQuery.id)}
                        className="w-full py-3 bg-[#C1121F] hover:bg-red-700 text-white font-mono font-black text-xs tracking-wider rounded-xl transition cursor-pointer uppercase border-b-2 border-red-950"
                      >
                        DISPATCH RESPONSE
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-20 text-xs text-gray-500 font-mono uppercase tracking-wider">
                      Select a query from the queue to write and dispatch mentor guidance.
                    </div>
                  )}
                </div>
              </>
            )}

            {/* SUBTAB 2: Predictions Queue */}
            {mentorSubTab === "predictions" && (
              <>
                {/* Left: Predictions List */}
                <div className="lg:col-span-7 bg-[#151515] p-5 rounded-xl border border-gray-800 flex flex-col gap-4">
                  <h3 className="font-extrabold uppercase text-sm border-b border-gray-800 pb-2 text-white font-mono tracking-wider">
                    PREDICTION ENLISTED STUDENTS
                  </h3>
                  <div className="flex flex-col gap-3 max-h-[550px] overflow-y-auto pr-1">
                    {markPredictions
                      .filter((p) => {
                        return predictionSearch
                          ? p.userName?.toLowerCase().includes(predictionSearch.toLowerCase()) ||
                            p.userEmail?.toLowerCase().includes(predictionSearch.toLowerCase())
                          : true;
                      })
                      .map((p) => {
                        const isSelected = selectedPrediction?.id === p.id;
                        return (
                          <div
                            key={p.id}
                            onClick={() => {
                              setSelectedPrediction(p);
                              setPredMark(p.predictedMark || "");
                              setPredCollege(p.recommendedCollege || "");
                              setPredComments(p.comments || "");
                            }}
                            className={`p-4 rounded-xl border cursor-pointer transition flex flex-col gap-2 ${
                              isSelected
                                ? "bg-[#C1121F]/10 border-[#C1121F]"
                                : p.status === "pending"
                                ? "bg-yellow-950/10 border-yellow-500/20 hover:border-yellow-500/30"
                                : "bg-black/20 border-white/5 hover:border-white/10"
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-xs font-black uppercase text-white font-mono">
                                  {p.userName}
                                  <span className="text-[10px] text-gray-500 font-normal ml-2">({p.userEmail})</span>
                                </p>
                                <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                                  Requested: {new Date(p.createdAt).toLocaleString()}
                                </p>
                              </div>
                              <span
                                className={`text-[9px] font-mono uppercase font-black px-2 py-0.5 rounded ${
                                  p.status === "pending"
                                    ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 animate-pulse"
                                    : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                }`}
                              >
                                {p.status}
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-[10px] font-mono bg-black/35 p-2 rounded border border-gray-900/50 mt-1">
                              <div>
                                <span className="text-gray-500 block text-[8px]">SSC GPA:</span>
                                <span className="font-bold text-white">{p.sscGpa}</span>
                              </div>
                              <div>
                                <span className="text-gray-500 block text-[8px]">HSC GPA:</span>
                                <span className="font-bold text-white">{p.hscGpa}</span>
                              </div>
                              <div>
                                <span className="text-gray-500 block text-[8px]">MCQ ACCURACY:</span>
                                <span className="font-bold text-amber-500">{p.testScores}%</span>
                              </div>
                            </div>

                            {p.status === "predicted" && (
                              <div className="flex gap-2 text-[10px] font-mono text-emerald-400 mt-1">
                                <span>Pred Mark: <strong>{p.predictedMark}</strong></span>
                                <span>• Rec: <strong>{p.recommendedCollege}</strong></span>
                              </div>
                            )}
                          </div>
                        );
                      })}

                    {markPredictions.length === 0 && (
                      <div className="text-center py-12 text-xs text-gray-500 font-mono uppercase">
                        No predictor requests submitted yet.
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Evaluator Inspector Form */}
                <div className="lg:col-span-5 bg-[#151515] p-5 rounded-xl border border-gray-800 flex flex-col gap-4">
                  <h3 className="font-extrabold uppercase text-sm border-b border-gray-800 pb-2 text-white font-mono tracking-wider">
                    PREDICTION EVALUATOR
                  </h3>
                  {selectedPrediction ? (
                    <div className="flex flex-col gap-4 text-xs">
                      {/* Demographics Summary */}
                      <div className="bg-black/45 border border-white/5 rounded-xl p-4 flex flex-col gap-2">
                        <span className="text-[10px] font-mono text-gray-500 uppercase">STUDENT PROFILE:</span>
                        <p className="font-bold text-white text-sm">{selectedPrediction.userName}</p>
                        <p className="font-mono text-gray-400">{selectedPrediction.userEmail}</p>

                        <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-2 mt-1 font-mono text-[10px]">
                          <div>
                            <span className="text-gray-500 text-[8px]">SSC:</span>
                            <span className="font-bold block text-white">{selectedPrediction.sscGpa} / 5.00</span>
                          </div>
                          <div>
                            <span className="text-gray-500 text-[8px]">HSC:</span>
                            <span className="font-bold block text-white">{selectedPrediction.hscGpa} / 5.00</span>
                          </div>
                          <div>
                            <span className="text-gray-500 text-[8px]">QUIZ ACCURACY:</span>
                            <span className="font-bold block text-amber-400">{selectedPrediction.testScores}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Predicted Mark Input */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-gray-400 font-mono uppercase font-bold text-[10px]">
                          Predicted Mark / Range (out of 100)
                        </label>
                        <input
                          type="text"
                          value={predMark}
                          onChange={(e) => setPredMark(e.target.value)}
                          placeholder="e.g. 74.5 or 72.0 - 75.5"
                          className="w-full p-2.5 text-xs font-mono rounded-lg border border-gray-850 bg-black text-white focus:outline-none focus:border-[#C1121F]"
                        />
                      </div>

                      {/* Recommended College */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-gray-400 font-mono uppercase font-bold text-[10px]">
                          Recommended Medical College
                        </label>
                        <input
                          type="text"
                          value={predCollege}
                          onChange={(e) => setPredCollege(e.target.value)}
                          placeholder="e.g. Dhaka Medical College / Sir Salimullah Medical College"
                          className="w-full p-2.5 text-xs font-mono rounded-lg border border-gray-850 bg-black text-white focus:outline-none focus:border-[#C1121F]"
                        />
                      </div>

                      {/* Personalized mentor comments */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-gray-400 font-mono uppercase font-bold text-[10px]">
                          Personalized Mentor Guidance
                        </label>
                        <textarea
                          value={predComments}
                          onChange={(e) => setPredComments(e.target.value)}
                          placeholder="Provide custom directives on how they can improve biology revision, physics equations practice or organic compounds pathways..."
                          rows={4}
                          className="w-full p-3 text-xs font-mono rounded-xl border border-gray-850 bg-black text-white focus:outline-none focus:border-[#C1121F]"
                        />
                      </div>

                      <button
                        onClick={() => handleSubmitPrediction(selectedPrediction.id)}
                        className="w-full py-3 bg-[#C1121F] hover:bg-red-700 text-white font-mono font-black text-xs tracking-wider rounded-xl transition cursor-pointer uppercase border-b-2 border-red-950"
                      >
                        SUBMIT PREDICTION & UPDATE MARK
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-20 text-xs text-gray-500 font-mono uppercase tracking-wider">
                      Select a prediction request from the queue to run performance calibration.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === "importer" && (
        <QuestionImporter user={user} />
      )}

      {activeTab === "advertisements" && (
        <AdManager theme={theme} />
      )}

      {activeTab === "premium" && (
        <div className="flex flex-col gap-6 text-white animate-fade-in" id="premium-management-tab">
          {/* PLATFORM BRANDING & LOGO SETTINGS */}
          <div className="bg-[#151515] p-5 rounded-2xl border border-gray-800 flex flex-col gap-4 text-xs">
            <h3 className="font-extrabold uppercase text-sm border-b border-gray-800 pb-2 text-[#FFD700] font-mono tracking-wider flex items-center gap-2">
              <span>🖼️</span> DYNAMIC BRANDING & LOGO MANAGER
            </h3>
            <p className="text-gray-400">
              Upload a custom branded logo to replace the standard pixel-crafted MediBridge vector logo. The logo is rendered dynamically across all application screens instantly.
            </p>
            <div className="grid sm:grid-cols-2 gap-6 mt-2 items-start">
              {/* Left column: upload & controls */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="enable-custom-logo"
                    checked={customLogoEnabled}
                    onChange={(e) => setCustomLogoEnabled(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-800 bg-black text-[#C1121F] focus:ring-[#C1121F]"
                  />
                  <label htmlFor="enable-custom-logo" className="font-bold text-gray-300 uppercase cursor-pointer select-none">
                    Enable Custom Logo Image
                  </label>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-gray-400 font-bold uppercase font-mono text-[10px]">Upload New Logo</span>
                  <label className="border border-dashed border-gray-800 hover:border-red-600 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-black/30 transition duration-300">
                    <Camera className="w-6 h-6 text-gray-500 hover:text-red-500 transition-colors" />
                    <span className="text-[10px] text-gray-300 font-sans font-semibold uppercase tracking-wider">
                      Choose Logo File
                    </span>
                    <span className="text-[9px] text-gray-500 font-sans">
                      PNG, JPG, SVG or WebP (Max 2MB)
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFileSelect}
                      className="hidden"
                    />
                  </label>
                </div>

                <button
                  onClick={handleSaveLogoSettings}
                  disabled={isSavingLogo}
                  className="py-2.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 disabled:from-gray-800 disabled:to-gray-800 text-white font-mono font-black text-xs tracking-wider rounded-xl transition uppercase flex items-center justify-center gap-2 cursor-pointer border-b-2 border-red-950 shadow-md"
                >
                  {isSavingLogo ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving Logo Configuration...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                      Save Logo Configuration
                    </>
                  )}
                </button>
              </div>

              {/* Right column: live preview */}
              <div className="flex flex-col gap-2 bg-black/40 p-4 rounded-xl border border-gray-850">
                <span className="text-gray-400 font-bold uppercase font-mono text-[10px]">Real-Time Header Preview</span>
                <div className="flex items-center justify-center bg-black/80 rounded-lg p-6 border border-gray-900 min-h-[120px] relative">
                  {customLogoUrl ? (
                    <div className="flex flex-col items-center gap-2">
                      <img
                        src={customLogoUrl}
                        alt="Custom Logo Preview"
                        referrerPolicy="no-referrer"
                        className="h-12 object-contain max-w-full drop-shadow-[0_4px_12px_rgba(193,18,31,0.3)]"
                      />
                      <span className="text-[9px] text-emerald-400 font-mono uppercase font-bold">✓ Custom Image Loaded</span>
                    </div>
                  ) : (
                    <div className="text-center text-gray-600 font-mono text-[10px]">
                      No custom logo uploaded. Default vector logo will be used.
                    </div>
                  )}
                </div>
                {customLogoUrl && (
                  <button
                    onClick={() => {
                      setCustomLogoUrl(null);
                      showToast("Cleared logo. Don't forget to click Save to apply!", "info");
                    }}
                    className="text-[10px] text-red-500 hover:text-red-400 font-mono font-bold uppercase self-end cursor-pointer"
                  >
                    Clear Image
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* LOADING SCREEN CUSTOM LOGO & GIF SETTINGS */}
          <div className="bg-[#151515] p-5 rounded-2xl border border-gray-800 flex flex-col gap-4 text-xs">
            <h3 className="font-extrabold uppercase text-sm border-b border-gray-800 pb-2 text-[#FFD700] font-mono tracking-wider flex items-center gap-2">
              <span>🚀</span> DYNAMIC LOADING SCREEN LOGO & GIF MANAGER
            </h3>
            <p className="text-gray-400">
              Upload a custom branded logo or an animated GIF to replace the standard pixel logo on the initial application loading screen.
            </p>
            <div className="grid sm:grid-cols-2 gap-6 mt-2 items-start">
              {/* Left column: upload & controls */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="enable-loading-logo"
                    checked={loadingLogoEnabled}
                    onChange={(e) => setLoadingLogoEnabled(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-800 bg-black text-[#C1121F] focus:ring-[#C1121F]"
                  />
                  <label htmlFor="enable-loading-logo" className="font-bold text-gray-300 uppercase cursor-pointer select-none">
                    Enable Loading Screen Logo/GIF
                  </label>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-gray-400 font-bold uppercase font-mono text-[10px]">Upload Loading Screen Logo/GIF</span>
                  <label className="border border-dashed border-gray-800 hover:border-red-600 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-black/30 transition duration-300">
                    <Camera className="w-6 h-6 text-gray-500 hover:text-red-500 transition-colors" />
                    <span className="text-[10px] text-gray-300 font-sans font-semibold uppercase tracking-wider">
                      Choose Loading Logo/GIF File
                    </span>
                    <span className="text-[9px] text-gray-500 font-sans">
                      PNG, JPG, SVG, WebP, or animated GIF (Max 2MB)
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLoadingLogoFileSelect}
                      className="hidden"
                    />
                  </label>
                </div>

                <button
                  onClick={handleSaveLoadingLogoSettings}
                  disabled={isSavingLoadingLogo}
                  className="py-2.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 disabled:from-gray-800 disabled:to-gray-800 text-white font-mono font-black text-xs tracking-wider rounded-xl transition uppercase flex items-center justify-center gap-2 cursor-pointer border-b-2 border-red-950 shadow-md"
                >
                  {isSavingLoadingLogo ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving Loading Logo...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                      Save Loading Logo Configuration
                    </>
                  )}
                </button>
              </div>

              {/* Right column: live preview */}
              <div className="flex flex-col gap-2 bg-black/40 p-4 rounded-xl border border-gray-850">
                <span className="text-gray-400 font-bold uppercase font-mono text-[10px]">Real-Time Loading Screen Preview</span>
                <div className="flex items-center justify-center bg-[#050505] rounded-lg p-6 border border-gray-900 min-h-[120px] relative overflow-hidden">
                  <div className="absolute inset-0 bg-[#C1121F]/5 rounded-full blur-[40px] animate-pulse"></div>
                  {loadingLogoUrl ? (
                    <div className="flex flex-col items-center gap-2 z-10">
                      <img
                        src={loadingLogoUrl}
                        alt="Loading Custom Logo Preview"
                        referrerPolicy="no-referrer"
                        className="h-12 object-contain max-w-full drop-shadow-[0_4px_12px_rgba(193,18,31,0.3)] animate-pulse"
                      />
                      <span className="text-[9px] text-emerald-400 font-mono uppercase font-bold">✓ Custom Loading Image Loaded</span>
                    </div>
                  ) : (
                    <div className="text-center text-gray-600 font-mono text-[10px] z-10">
                      No custom loading logo uploaded. Standard animated logo will be used.
                    </div>
                  )}
                </div>
                {loadingLogoUrl && (
                  <button
                    onClick={() => {
                      setLoadingLogoUrl(null);
                      showToast("Cleared loading logo. Click Save to apply changes!", "info");
                    }}
                    className="text-[10px] text-red-500 hover:text-red-400 font-mono font-bold uppercase self-end cursor-pointer"
                  >
                    Clear Image
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-[#151515] p-5 rounded-xl border border-gray-800">
            <h3 className="font-extrabold uppercase text-base text-[#FFD700] tracking-wider mb-2 font-mono flex items-center gap-2">
              ♛ PREMIUM SUBSCRIPTION REAL-TIME CONTROL PANEL
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed font-sans">
              Dynamically modify package subscription pricing tiers, feature highlights, and localized titles or descriptions for all users instantly without requiring a codebase rebuild.
            </p>
          </div>

          <div className="grid lg:grid-cols-12 gap-6">
            
            {/* PRICING ENGINE CONTROL - 4 COLS */}
            <div className="lg:col-span-4 bg-[#151515] p-5 rounded-xl border border-gray-800 flex flex-col gap-4 h-fit">
              <h4 className="font-black uppercase text-xs text-white border-b border-gray-850 pb-2 font-mono tracking-wider flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#C1121F]" /> SUBSCRIPTION PRICE CONFIG
              </h4>

              <form onSubmit={handleSavePrices} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5 text-xs">
                  <label className="text-gray-400 font-mono font-bold uppercase text-[10px]">Monthly Subscription (BDT)</label>
                  <input
                    type="number"
                    required
                    value={premiumPrices.monthly}
                    onChange={(e) => setPremiumPrices({ ...premiumPrices, monthly: Number(e.target.value) })}
                    placeholder="e.g. 149"
                    className="p-2.5 rounded bg-black border border-gray-800 text-white font-mono focus:border-[#C1121F] outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5 text-xs">
                  <label className="text-gray-400 font-mono font-bold uppercase text-[10px]">6 Months Subscription (BDT)</label>
                  <input
                    type="number"
                    required
                    value={premiumPrices["6months"]}
                    onChange={(e) => setPremiumPrices({ ...premiumPrices, "6months": Number(e.target.value) })}
                    placeholder="e.g. 599"
                    className="p-2.5 rounded bg-black border border-gray-800 text-white font-mono focus:border-[#C1121F] outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5 text-xs">
                  <label className="text-gray-400 font-mono font-bold uppercase text-[10px]">1 Year Subscription (BDT)</label>
                  <input
                    type="number"
                    required
                    value={premiumPrices["1year"]}
                    onChange={(e) => setPremiumPrices({ ...premiumPrices, "1year": Number(e.target.value) })}
                    placeholder="e.g. 799"
                    className="p-2.5 rounded bg-black border border-gray-800 text-white font-mono focus:border-[#C1121F] outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="mt-2 py-3 bg-[#C1121F] hover:bg-red-700 text-white text-xs font-mono font-black tracking-wider rounded-xl transition uppercase border-b-2 border-red-950 cursor-pointer"
                >
                  SAVE PRICING MODULE
                </button>
              </form>
            </div>

            {/* FEATURES BUILDER & MANAGER - 8 COLS */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              
              {/* FEATURE EDITOR CARD */}
              <div className="bg-[#151515] p-5 rounded-xl border border-gray-800 flex flex-col gap-4">
                <h4 className="font-black uppercase text-xs text-white border-b border-gray-850 pb-2 font-mono tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-500 animate-pulse" />
                  {editingFeatureIdx !== null ? "EDIT ACTIVE FEATURE HIGHLIGHT" : "LOG NEW PREMIUM FEATURE MODULE"}
                </h4>

                <form onSubmit={handleSaveFeature} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-gray-400 font-mono font-bold uppercase text-[10px]">Title (English)</label>
                    <input
                      type="text"
                      required
                      value={featTitleEn}
                      onChange={(e) => setFeatTitleEn(e.target.value)}
                      placeholder="e.g. Elite Questions"
                      className="p-2.5 rounded bg-black border border-gray-800 text-white outline-none focus:border-[#C1121F]"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-gray-400 font-mono font-bold uppercase text-[10px]">Title (Bangla)</label>
                    <input
                      type="text"
                      required
                      value={featTitleBn}
                      onChange={(e) => setFeatTitleBn(e.target.value)}
                      placeholder="e.g. এলিট Proshnobank"
                      className="p-2.5 rounded bg-black border border-gray-800 text-white outline-none focus:border-[#C1121F]"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-gray-400 font-mono font-bold uppercase text-[10px]">Description (English)</label>
                    <input
                      type="text"
                      required
                      value={featDescEn}
                      onChange={(e) => setFeatDescEn(e.target.value)}
                      placeholder="e.g. 10K+ High-yield expert MAT questions"
                      className="p-2.5 rounded bg-black border border-gray-800 text-white outline-none focus:border-[#C1121F]"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-gray-400 font-mono font-bold uppercase text-[10px]">Description (Bangla)</label>
                    <input
                      type="text"
                      required
                      value={featDescBn}
                      onChange={(e) => setFeatDescBn(e.target.value)}
                      placeholder="e.g. 10,000+ High-yield premium problems"
                      className="p-2.5 rounded bg-black border border-gray-800 text-white outline-none focus:border-[#C1121F]"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-gray-400 font-mono font-bold uppercase text-[10px]">Visual Icon</label>
                    <select
                      value={featIcon}
                      onChange={(e) => setFeatIcon(e.target.value)}
                      className="p-2.5 rounded bg-black border border-gray-800 text-white outline-none focus:border-[#C1121F]"
                    >
                      <option value="Trophy">🏆 Trophy</option>
                      <option value="Bot">🤖 Bot</option>
                      <option value="Flame">🔥 Flame</option>
                      <option value="Shield">🛡️ Shield</option>
                      <option value="Sparkles">✨ Sparkles</option>
                      <option value="Zap">⚡ Zap</option>
                      <option value="Star">⭐ Star</option>
                      <option value="Award">🏅 Award</option>
                      <option value="BookOpen">📖 BookOpen</option>
                      <option value="Layers">🥞 Layers</option>
                      <option value="Smartphone">📱 Smartphone</option>
                      <option value="SmartphoneCharging">🔋 Charging Phone</option>
                      <option value="CreditCard">💳 Credit Card</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-gray-400 font-mono font-bold uppercase text-[10px]">Theme Accent Color</label>
                    <select
                      value={featColor}
                      onChange={(e) => setFeatColor(e.target.value)}
                      className="p-2.5 rounded bg-black border border-gray-800 text-white outline-none focus:border-[#C1121F]"
                    >
                      <option value="red">🔴 Crimson Red</option>
                      <option value="yellow">🟡 Sunflower Yellow</option>
                      <option value="amber">🟠 Amber Gold</option>
                      <option value="indigo">🔵 Royal Indigo</option>
                      <option value="emerald">🟢 Emerald Green</option>
                      <option value="purple">🟣 Cosmic Purple</option>
                      <option value="pink">🌸 Blossom Pink</option>
                      <option value="blue">🌊 Sapphire Blue</option>
                    </select>
                  </div>

                  <div className="md:col-span-2 flex items-center gap-3 mt-2">
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-[#FFD700] hover:bg-yellow-500 text-black text-xs font-mono font-black tracking-wider rounded-xl transition uppercase border-b-2 border-yellow-800 cursor-pointer"
                    >
                      {editingFeatureIdx !== null ? "UPDATE FEATURE MODULE" : "ADD FEATURE MODULE"}
                    </button>

                    {editingFeatureIdx !== null && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingFeatureIdx(null);
                          setFeatTitleEn("");
                          setFeatTitleBn("");
                          setFeatDescEn("");
                          setFeatDescBn("");
                          setFeatIcon("Trophy");
                          setFeatColor("red");
                        }}
                        className="px-5 py-3 bg-white/5 hover:bg-white/10 text-white text-xs font-mono font-bold tracking-wider rounded-xl transition uppercase cursor-pointer"
                      >
                        CANCEL EDIT
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* FEATURES CATALOG VIEW */}
              <div className="bg-[#151515] p-5 rounded-xl border border-gray-800 flex flex-col gap-4">
                <h4 className="font-black uppercase text-xs text-white border-b border-gray-850 pb-2 font-mono tracking-wider">
                  📂 ACTIVE PREMIUM HIGHLIGHTS CATALOG ({premiumFeatures.length})
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {premiumFeatures.map((feat, idx) => {
                    return (
                      <div
                        key={feat.id || idx}
                        className="bg-black/45 border border-white/5 rounded-xl p-4 flex flex-col justify-between gap-3 relative overflow-hidden group hover:border-[#FFD700]/30 transition"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">
                              FEATURE #{idx + 1}
                            </span>
                            <span className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded border ${
                              feat.color === "red" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                              feat.color === "yellow" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                              feat.color === "amber" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                              feat.color === "indigo" ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" :
                              feat.color === "emerald" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                              feat.color === "purple" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                              feat.color === "pink" ? "bg-pink-500/10 text-pink-400 border-pink-500/20" :
                              "bg-blue-500/10 text-blue-400 border-blue-500/20"
                            }`}>
                              {feat.icon} ({feat.color})
                            </span>
                          </div>

                          <div className="mt-2.5 flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 text-xs font-black uppercase text-white font-mono">
                              <span>{feat.titleEn}</span>
                              <span className="text-gray-500">|</span>
                              <span className="text-[#FFD700]">{feat.titleBn}</span>
                            </div>
                            <p className="text-[10px] text-gray-400 font-sans leading-relaxed">
                              EN: {feat.descEn}
                            </p>
                            <p className="text-[10px] text-gray-500 font-sans leading-relaxed">
                              BN: {feat.descBn}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-1 border-t border-white/5 pt-3">
                          <button
                            onClick={() => startEditFeature(idx)}
                            className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-lg text-[10px] font-mono text-gray-300 font-bold uppercase transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-amber-400" /> EDIT
                          </button>
                          <button
                            onClick={() => handleDeleteFeature(idx)}
                            className="py-1.5 px-3 bg-red-950/40 hover:bg-red-950/80 border border-red-900/30 rounded-lg text-[10px] font-mono text-red-400 font-bold uppercase transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> REMOVE
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {premiumFeatures.length === 0 && (
                    <div className="col-span-2 text-center py-12 text-xs text-gray-500 font-mono uppercase tracking-widest">
                      No dynamic features defined yet.
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Tab Contents: Promo Codes & Discounts */}
      {activeTab === "promocodes" && (
        <PromoCodeManager
          language="bn"
          theme={theme === "dark" ? "dark" : "light"}
        />
      )}

      {/* Tab Contents: Game Questions Manager */}
      {activeTab === "gamequestions" && (
        <GameQuestionsManager
          language="bn"
          theme={theme === "dark" ? "dark" : "light"}
          currentUserUid={user.uid}
        />
      )}

      {/* Tab Contents: Gaming Arena Asset & Rewards Manager */}
      {activeTab === "gamingassets" && (
        <GamingAssetManager
          language="bn"
          theme={theme === "dark" ? "dark" : "light"}
          currentUserUid={user.uid}
          onNotify={(msg, type) => showToast(msg, type === "error" ? "error" : "success")}
        />
      )}

      {/* Tab Contents: Course Faculty & Teachers */}
      {activeTab === "teachers" && (
        <TeacherManager
          courses={courses}
          user={user}
          language="bn"
          theme={theme === "dark" ? "dark" : "light"}
          onUpdateCourse={onUpdateCourse}
        />
      )}

      {/* Tab Contents: Notification Management */}
      {activeTab === "notifications" && (
        <AdminNotificationPanel
          user={user}
          theme={theme}
          courses={courses}
        />
      )}

      {/* Tab Contents: Course Details & Landing Showcase Manager */}
      {activeTab === "courses" && (
        <CourseManager
          onNotify={(msg, type) => showToast(msg, type === "error" ? "error" : "success")}
        />
      )}

      {/* Tab Contents: Our Heroes Achiever Showcase Manager */}
      {activeTab === "heroes" && (
        <OurHeroesManager
          language="bn"
          theme={theme === "dark" ? "dark" : "light"}
          onNotify={(msg, type) => showToast(msg, type === "error" ? "error" : "success")}
        />
      )}

      {/* Dynamic Modern Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 p-4 rounded-xl border bg-black/90 backdrop-blur-md shadow-2xl text-white animate-slide-in max-w-sm border-gray-800" style={{ borderLeftWidth: '6px', borderLeftColor: toast.type === 'success' ? '#10B981' : toast.type === 'error' ? '#EF4444' : '#F59E0B' }}>
          <div className="flex-1 text-xs font-bold leading-normal">
            {toast.message}
          </div>
          <button onClick={() => setToast(null)} className="text-gray-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Custom Confirmation Dialog Overlay */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#111] border border-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center flex flex-col gap-4">
            <div className="text-yellow-500 flex justify-center">
              <AlertOctagon className="w-12 h-12 animate-bounce" />
            </div>
            <h3 className="font-mono text-xs font-black uppercase tracking-wider text-gray-300">
              CONFIRMATION REQUIRED
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed font-sans">
              {confirmDialog.message}
            </p>
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={confirmDialog.onConfirm}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-mono font-black tracking-wider rounded-xl transition uppercase cursor-pointer"
              >
                PROCEED
              </button>
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white text-xs font-mono font-bold tracking-wider rounded-xl transition uppercase cursor-pointer"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button (FAB) for Medical Question Scanner with multi-file support */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
        <input
          type="file"
          accept="image/*"
          ref={fabFileInputRef}
          onChange={handleFabImageChange}
          className="hidden"
          multiple
        />
        <button
          onClick={handleFabClick}
          disabled={fabScanning}
          title="Instant AI Question Scan"
          className="w-14 h-14 bg-gradient-to-tr from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 active:scale-95 text-white rounded-full shadow-2xl flex items-center justify-center transition duration-300 transform hover:rotate-6 cursor-pointer border border-white/20 animate-pulse"
        >
          {fabScanning ? (
            <Loader2 className="w-6 h-6 animate-spin text-white" />
          ) : (
            <Camera className="w-6 h-6 text-white" />
          )}
        </button>
      </div>

      {/* FAB Scanning Loader Overlay */}
      {fabScanning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="bg-[#111] border border-gray-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center flex flex-col items-center gap-4">
            <div className="relative flex items-center justify-center">
              <div className="absolute w-24 h-24 rounded-full border-4 border-t-red-600 border-r-amber-500 border-b-transparent border-l-transparent animate-spin"></div>
              <Camera className="w-10 h-10 text-yellow-500 animate-pulse" />
            </div>
            <h3 className="font-mono text-sm font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-yellow-500 animate-pulse">
              AI BATCH SCAN IN PROGRESS
            </h3>
            <div className="flex flex-col gap-1 w-full bg-black/40 p-3 rounded-xl border border-gray-900 font-mono text-[11px]">
              <span className="text-yellow-500 uppercase font-bold">Progress indicator</span>
              <div className="text-white">
                Processing file <span className="text-amber-500 font-bold">{fabCurrentIndex + 1}</span> of <span className="text-amber-500 font-bold">{fabQueue.length}</span>
              </div>
              <div className="text-gray-400 truncate mt-1 text-[10px]" title={fabQueue[fabCurrentIndex]?.name}>
                Filename: {fabQueue[fabCurrentIndex]?.name || "Extracting..."}
              </div>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed font-sans max-w-[280px]">
              Analyzing clinical notations, transcribing medical vocabulary, and auto-saving sequentially to Firestore...
            </p>
            <span className="text-[10px] font-mono font-bold text-gray-600 uppercase tracking-widest">
              Please keep this page open
            </span>
          </div>
        </div>
      )}

      {/* FAB Success Added Question Preview Modal (Supports Multi-File results scrollable list) */}
      {fabScannedQuestions.length > 0 && !fabScanning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-[#121212] border border-gray-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl flex flex-col gap-4 my-8 animate-slide-in">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-500 animate-pulse" />
                <h3 className="font-mono text-xs font-black uppercase tracking-wider text-gray-200">
                  🎉 BATCH SCAN SUCCESS & SAVED ({fabScannedQuestions.length})
                </h3>
              </div>
              <button
                onClick={() => setFabScannedQuestions([])}
                className="p-1 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[55vh] overflow-y-auto flex flex-col gap-6 pr-1 custom-scrollbar">
              {fabScannedQuestions.map((qItem, idx) => (
                <div key={idx} className="flex flex-col gap-3.5 text-xs text-gray-300 border-b border-gray-900 pb-5 last:border-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 bg-neutral-900 text-yellow-500 border border-gray-800 rounded-md font-mono text-[9px] uppercase font-bold">
                      Question #{idx + 1}
                    </span>
                    <span className="px-2 py-0.5 bg-red-950/40 text-red-400 border border-red-900/40 rounded-md font-mono text-[9px] uppercase font-bold">
                      {qItem.subject}
                    </span>
                    <span className="px-2 py-0.5 bg-amber-950/40 text-amber-400 border border-amber-900/40 rounded-md font-mono text-[9px] uppercase font-bold">
                      {qItem.chapter}
                    </span>
                    <span className="px-2 py-0.5 bg-zinc-900 text-zinc-400 border border-zinc-800 rounded-md font-mono text-[9px] uppercase font-bold">
                      {qItem.difficulty}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1 bg-black/40 p-3 rounded-xl border border-gray-850">
                    <span className="text-[10px] text-gray-500 font-mono uppercase font-bold">Question:</span>
                    <p className="font-medium text-white leading-relaxed font-sans">{qItem.questionText}</p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] text-gray-500 font-mono uppercase font-bold">Extracted Options:</span>
                    <div className="grid grid-cols-1 gap-2">
                      {qItem.options.map((opt: string, index: number) => {
                        const isCorrect = index === qItem.correctAnswerIndex;
                        return (
                          <div
                            key={index}
                            className={`p-2.5 rounded-lg text-xs flex items-center gap-2 border ${
                              isCorrect
                                ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-300 font-semibold"
                                : "bg-black/30 border-gray-900 text-gray-400"
                            }`}
                          >
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] font-bold ${
                              isCorrect ? "bg-emerald-500 text-black" : "bg-white/5 text-gray-500"
                            }`}>
                              {String.fromCharCode(65 + index)}
                            </span>
                            <span className="flex-1 font-sans">{opt}</span>
                            {isCorrect && (
                              <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-wider font-bold">
                                CORRECT
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {qItem.explanation && (
                    <div className="flex flex-col gap-1 bg-yellow-950/10 p-3 rounded-xl border border-yellow-900/20">
                      <span className="text-[10px] text-amber-500 font-mono uppercase font-bold">Clinical Explanation:</span>
                      <p className="text-gray-400 leading-relaxed font-sans text-[11px]">{qItem.explanation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => setFabScannedQuestions([])}
              className="mt-2 w-full py-2.5 bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-mono font-bold tracking-widest text-xs rounded-xl uppercase transition cursor-pointer"
            >
              GOT IT, READY FOR ANOTHER
            </button>
          </div>
        </div>
      )}

      {/* Central Question Bank Selector Modal for Exam Batch Builder */}
      <QuestionBankSelectorModal
        isOpen={isBatchBankSelectorOpen}
        onClose={() => setIsBatchBankSelectorOpen(false)}
        alreadySelectedIds={newBatchManualQIds}
        targetSubject={newBatchSubject}
        targetTotalQuestions={newBatchQuestionsCount}
        onSelectQuestions={(selectedBankQuestions) => {
          const selectedIds = selectedBankQuestions.map((q) => q.id);
          setNewBatchManualQIds(selectedIds);
          // Set selection mode to manual if not already
          setNewBatchSelectionMode("manual");
        }}
      />

    </div>
  );
}
