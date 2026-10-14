import React, { useState, useEffect, useRef } from "react";
import { db } from "../../firebase";
import {
  collection,
  onSnapshot,
  updateDoc,
  addDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  limit,
  arrayUnion
} from "firebase/firestore";
import { getCourseAspectClass } from "../../lib/courseUtils";
import { Course, Batch, CourseClass, CourseMaterial, CourseAnnouncement, CourseExam } from "../../types/courseTypes";
import { UserProfile, Question } from "../../types";
import { NotificationService } from "../../lib/notificationService";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  Video,
  FileText,
  Award,
  Bell,
  Users,
  CheckCircle2,
  Trash2,
  Edit,
  Sparkles,
  BookOpen,
  Image as ImageIcon,
  Camera,
  Check,
  DollarSign,
  Layers,
  Save,
  AlertCircle,
  Eye,
  Edit3,
  Upload,
  UploadCloud,
  FileUp,
  File,
  CreditCard,
  Search,
  ShieldCheck,
  UserPlus,
  Target,
  FileSpreadsheet,
  HelpCircle,
  X,
  ChevronDown,
  Calendar,
  Percent,
  ClipboardList,
  GraduationCap,
  Share2,
  Copy,
  ExternalLink,
  MessageCircle,
  Facebook,
  Send,
  QrCode,
  Smartphone,
  RefreshCw,
  Sliders,
  AlertTriangle,
  Link,
  Maximize2,
  Star,
  Clock,
  CheckSquare,
  Square,
  Filter,
  FolderPlus,
  Shuffle,
  FileQuestion,
  ToggleLeft,
  ToggleRight,
  Archive,
  Database,
  SearchCode,
  Play,
  Radio,
  Pin,
  PinOff,
  ChevronUp
} from "lucide-react";
import { playSound } from "../../audio";
import { STARTER_QUESTIONS } from "../../questionsData";
import TeacherManager from "./TeacherManager";
import TeacherMistakeAnalytics from "./TeacherMistakeAnalytics";
import CourseShareModal from "./CourseShareModal";
import BulkQuestionParserModal from "./BulkQuestionParserModal";
import ExamQuestionsManagerModal from "./ExamQuestionsManagerModal";
import LiveExamControlModal from "./LiveExamControlModal";
import { optimizeImageFile } from "../../utils/imageOptimizer";

// Helper to sanitize undefined values for Firestore
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

const PRESET_THUMBNAILS = [
  { name: "Medical Stethoscope", category: "Clinical", url: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80" },
  { name: "DNA & Molecular Biology", category: "Biology", url: "https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=800&auto=format&fit=crop&q=80" },
  { name: "Laboratory & Microscope", category: "Lab", url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&auto=format&fit=crop&q=80" },
  { name: "Doctor & Medical Team", category: "Faculty", url: "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800&auto=format&fit=crop&q=80" },
  { name: "Chemistry Lab Glassware", category: "Chemistry", url: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800&auto=format&fit=crop&q=80" },
  { name: "Human Anatomy 3D Model", category: "Anatomy", url: "https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800&auto=format&fit=crop&q=80" },
  { name: "Surgery Theatre & Scrub", category: "Surgery", url: "https://images.unsplash.com/photo-1551076805-e1869033e561?w=800&auto=format&fit=crop&q=80" },
  { name: "Pharmaceutical & Pills", category: "Pharma", url: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&auto=format&fit=crop&q=80" },
  { name: "Neuroscience Brain Scan", category: "Neuro", url: "https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=800&auto=format&fit=crop&q=80" },
  { name: "Physics & Optics Laser", category: "Physics", url: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&auto=format&fit=crop&q=80" },
  { name: "Medical Library & Books", category: "Academic", url: "https://images.unsplash.com/photo-1532012164546-f432f2e3777f?w=800&auto=format&fit=crop&q=80" },
  { name: "Hospital Emergency ECG", category: "Emergency", url: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&auto=format&fit=crop&q=80" }
];

const PRESET_INSTRUCTOR_AVATARS = [
  { name: "Doctor Male 1", url: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&auto=format&fit=crop&q=80" },
  { name: "Doctor Female 1", url: "https://images.unsplash.com/photo-1594824813515-580436b763e0?w=200&auto=format&fit=crop&q=80" },
  { name: "Doctor Male 2", url: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=200&auto=format&fit=crop&q=80" },
  { name: "Doctor Female 2", url: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&auto=format&fit=crop&q=80" },
  { name: "Medical Specialist", url: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&auto=format&fit=crop&q=80" },
];

interface TeacherDashboardViewProps {
  courses: Course[];
  batches: Batch[];
  classes: CourseClass[];
  materials: CourseMaterial[];
  announcements: CourseAnnouncement[];
  exams: CourseExam[];
  user: UserProfile;
  language: "bn" | "en";
  theme: "light" | "dark";
  onCreateClass: (cls: CourseClass) => void;
  onUpdateClass?: (cls: CourseClass) => void;
  onDeleteClass?: (classId: string) => void;
  onCreateMaterial: (mat: CourseMaterial) => void;
  onUpdateMaterial?: (mat: CourseMaterial) => void;
  onDeleteMaterial?: (materialId: string) => void;
  onCreateAnnouncement: (anc: CourseAnnouncement) => void;
  onUpdateAnnouncement?: (anc: CourseAnnouncement) => void;
  onDeleteAnnouncement?: (ancId: string) => void;
  onCreateExam: (exam: CourseExam) => void;
  onUpdateCourse?: (course: Course) => void;
  onCreateCourse?: (course: Course) => void;
  onUpdateBatch?: (batch: Batch) => void;
  onUpdateExam?: (exam: CourseExam) => void;
  onDeleteExam?: (examId: string) => void;
}

export default function TeacherDashboardView({
  courses,
  batches,
  classes,
  materials,
  announcements,
  exams,
  user,
  language,
  theme,
  onCreateClass,
  onUpdateClass,
  onDeleteClass,
  onCreateMaterial,
  onUpdateMaterial,
  onDeleteMaterial,
  onCreateAnnouncement,
  onUpdateAnnouncement,
  onDeleteAnnouncement,
  onCreateExam,
  onUpdateCourse,
  onCreateCourse,
  onUpdateBatch,
  onUpdateExam,
  onDeleteExam
}: TeacherDashboardViewProps) {
  const isDark = theme === "dark";
  const isBn = language === "bn";

  const [activeTab, setActiveTab] = useState<
    "overview" | "mistake_analytics" | "students" | "exam_marks" | "edit_course" | "teachers" | "add_exam" | "edit_exams" | "add_class" | "add_material" | "add_announcement" | "payment_verification" | "store_stats"
  >("overview");

  // Real-time Database Listeners for Course Enrollments, Registered Users & Exam Submissions
  const [allEnrollments, setAllEnrollments] = useState<any[]>([]);
  const [allUsersList, setAllUsersList] = useState<any[]>([]);
  const [liveSubmissionsList, setLiveSubmissionsList] = useState<any[]>([]);

  // Student Management State
  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  const [studentBatchFilter, setStudentBatchFilter] = useState("All");
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [manualStudentUid, setManualStudentUid] = useState("");
  const [manualStudentName, setManualStudentName] = useState("");
  const [manualStudentEmail, setManualStudentEmail] = useState("");
  const [manualStudentPhone, setManualStudentPhone] = useState("");
  const [manualStudentBatchId, setManualStudentBatchId] = useState("");
  const [manualStudentExpiryMonths, setManualStudentExpiryMonths] = useState(12);

  // Live Exam Marks Management State
  const [selectedExamForMarksId, setSelectedExamForMarksId] = useState<string>("");
  const [marksSearchTerm, setMarksSearchTerm] = useState("");
  const [marksFilterStatus, setMarksFilterStatus] = useState<"All" | "Evaluated" | "Pending">("All");
  const [isExamMarksModalOpen, setIsExamMarksModalOpen] = useState(false);
  const [currentMarkEditing, setCurrentMarkEditing] = useState<{
    submissionId?: string;
    studentUid: string;
    studentName: string;
    studentEmail: string;
    examId: string;
    examTitle: string;
    batchId: string;
    totalMarks: number;
    correctCount: number;
    wrongCount: number;
    skippedCount: number;
    score: number;
    rank: number;
    adminRemarks: string;
    evaluatedByTeacher: boolean;
  } | null>(null);

  // One-time / on-demand fetch for Enrollments
  useEffect(() => {
    getDocs(query(collection(db, "enrollments"), limit(50)))
      .then((snapshot) => {
        const loaded: any[] = [];
        const seenIds = new Set<string>();
        snapshot.forEach((docSnap) => {
          const docId = docSnap.id;
          if (!seenIds.has(docId)) {
            seenIds.add(docId);
            loaded.push({ ...docSnap.data(), id: docId });
          }
        });
        setAllEnrollments(loaded);
      })
      .catch((err) => console.warn("Enrollments fetch warning:", err.message));
  }, []);

  // One-time fetch for Users (limit 50)
  useEffect(() => {
    getDocs(query(collection(db, "users"), limit(50)))
      .then((snapshot) => {
        const loaded: any[] = [];
        const seenUids = new Set<string>();
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const uid = docSnap.id || data.uid;
          if (uid && !seenUids.has(uid)) {
            seenUids.add(uid);
            loaded.push({ ...data, uid, id: docSnap.id });
          }
        });
        setAllUsersList(loaded);
      })
      .catch((err) => console.warn("Users fetch warning:", err.message));
  }, []);

  // One-time fetch for Live Exam Submissions (limit 50)
  useEffect(() => {
    getDocs(query(collection(db, "live_exam_submissions"), limit(50)))
      .then((snapshot) => {
        const loaded: any[] = [];
        snapshot.forEach((docSnap) => {
          loaded.push({ id: docSnap.id, ...docSnap.data() });
        });
        setLiveSubmissionsList(loaded);
      })
      .catch((err) => console.warn("Live exam submissions fetch warning:", err.message));
  }, []);

  // Admin Configurable Store Banner & Stats State
  const [storeBadgeBnInput, setStoreBadgeBnInput] = useState("মেডিকেল ভর্তি প্রস্তুতি প্ল্যাটফর্ম");
  const [storeBadgeEnInput, setStoreBadgeEnInput] = useState("MAT ADMISSION COURSES");
  const [storeTitleBnInput, setStoreTitleBnInput] = useState("সকল স্পেশাল এক্সাম ব্যাচ ও কোর্সসমূহ");
  const [storeTitleEnInput, setStoreTitleEnInput] = useState("Premium Exam Batches & Courses");
  const [storeDescBnInput, setStoreDescBnInput] = useState("ড. আবুল হাসান, হাজারী নাগ ও ইসহাক স্যারের বই ভিত্তিক হাই-ইয়েল্ড পরীক্ষা, লাইভ ক্লাস, বিস্তারিত এআই এনালাইসিস ও মিসটেক ব্যাংকের মাধ্যমে আপনার কাঙ্ক্ষিত মেডিকেল সিট নিশ্চিত করুন।");
  const [storeDescEnInput, setStoreDescEnInput] = useState("Standard textbook-oriented exams, live interactive classes, instant mistake bank, and nationwide batch leaderboards.");
  const [storeEnrolledCountInput, setStoreEnrolledCountInput] = useState("৫,১২০+ Aspirants");
  const [storeStatLabelBnInput, setStoreStatLabelBnInput] = useState("এনরোল্ড শিক্ষার্থী");
  const [storeStatLabelEnInput, setStoreStatLabelEnInput] = useState("Enrolled Aspirants");
  const [storeStatIconInput, setStoreStatIconInput] = useState<string>("award");
  const [storeShowStatBoxInput, setStoreShowStatBoxInput] = useState<boolean>(true);
  const [bannerPreviewLang, setBannerPreviewLang] = useState<"bn" | "en">("bn");

  useEffect(() => {
    getDoc(doc(db, "app_settings", "store_stats"))
      .then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.badgeTextBn !== undefined) setStoreBadgeBnInput(data.badgeTextBn);
          if (data.badgeTextEn !== undefined) setStoreBadgeEnInput(data.badgeTextEn);
          if (data.headerTitleBn !== undefined) setStoreTitleBnInput(data.headerTitleBn);
          if (data.headerTitleEn !== undefined) setStoreTitleEnInput(data.headerTitleEn);
          if (data.headerDescriptionBn !== undefined) setStoreDescBnInput(data.headerDescriptionBn);
          if (data.headerDescriptionEn !== undefined) setStoreDescEnInput(data.headerDescriptionEn);
          if (data.storeEnrolledText !== undefined) setStoreEnrolledCountInput(data.storeEnrolledText);
          if (data.storeStatLabelBn !== undefined) setStoreStatLabelBnInput(data.storeStatLabelBn);
          else if (data.storeStatLabel !== undefined) setStoreStatLabelBnInput(data.storeStatLabel);
          if (data.storeStatLabelEn !== undefined) setStoreStatLabelEnInput(data.storeStatLabelEn);
          if (data.storeStatIcon !== undefined) setStoreStatIconInput(data.storeStatIcon);
          if (data.showStatBox !== undefined) setStoreShowStatBoxInput(data.showStatBox);
        }
      })
      .catch((err) => console.warn("Store stats fetch warning:", err.message));
  }, []);

  const handleSaveStoreStats = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, "app_settings", "store_stats"), {
        badgeTextBn: storeBadgeBnInput,
        badgeTextEn: storeBadgeEnInput,
        headerTitleBn: storeTitleBnInput,
        headerTitleEn: storeTitleEnInput,
        headerDescriptionBn: storeDescBnInput,
        headerDescriptionEn: storeDescEnInput,
        storeEnrolledText: storeEnrolledCountInput,
        storeStatLabel: storeStatLabelBnInput,
        storeStatLabelBn: storeStatLabelBnInput,
        storeStatLabelEn: storeStatLabelEnInput,
        storeStatIcon: storeStatIconInput,
        showStatBox: storeShowStatBoxInput,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      playSound("correct");
      setSaveSuccessMessage(isBn ? "কোর্স পেজ ব্যানার ও টেক্সট সফলভাবে আপডেট করা হয়েছে!" : "Course page banner texts & stats saved successfully!");
    } catch (err: any) {
      console.error("Error saving store stats:", err);
    }
  };

  const handleResetStoreStatsDefault = () => {
    setStoreBadgeBnInput("মেডিকেল ভর্তি প্রস্তুতি প্ল্যাটফর্ম");
    setStoreBadgeEnInput("MAT ADMISSION COURSES");
    setStoreTitleBnInput("সকল স্পেশাল এক্সাম ব্যাচ ও কোর্সসমূহ");
    setStoreTitleEnInput("Premium Exam Batches & Courses");
    setStoreDescBnInput("ড. আবুল হাসান, হাজারী নাগ ও ইসহাক স্যারের বই ভিত্তিক হাই-ইয়েল্ড পরীক্ষা, লাইভ ক্লাস, বিস্তারিত এআই এনালাইসিস ও মিসটেক ব্যাংকের মাধ্যমে আপনার কাঙ্ক্ষিত মেডিকেল সিট নিশ্চিত করুন।");
    setStoreDescEnInput("Standard textbook-oriented exams, live interactive classes, instant mistake bank, and nationwide batch leaderboards.");
    setStoreEnrolledCountInput("৫,১২০+ Aspirants");
    setStoreStatLabelBnInput("এনরোল্ড শিক্ষার্থী");
    setStoreStatLabelEnInput("Enrolled Aspirants");
    setStoreStatIconInput("award");
    setStoreShowStatBoxInput(true);
    playSound("click");
  };

  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    courses[0]?.id || ""
  );
  const selectedCourse = courses.find((c) => c.id === selectedCourseId) || courses[0];
  const courseBatches = batches.filter((b) => b.courseId === selectedCourseId);
  const selectedBatch = courseBatches[0] || batches[0];
  const [selectedBatchId, setSelectedBatchId] = useState<string>(
    selectedBatch?.id || ""
  );

  // Form States for Editing Course & Pictures
  const [editTitle, setEditTitle] = useState("");
  const [editShortDesc, setEditShortDesc] = useState("");
  const [editFullDesc, setEditFullDesc] = useState("");
  const [editThumbnail, setEditThumbnail] = useState("");
  const [editBanner, setEditBanner] = useState("");
  const [editOriginalPrice, setEditOriginalPrice] = useState(6500);
  const [editDiscountedPrice, setEditDiscountedPrice] = useState(4500);
  const [editTotalEnrolled, setEditTotalEnrolled] = useState<number>(1420);
  const [editInstructorName, setEditInstructorName] = useState("");
  const [editInstructorTitle, setEditInstructorTitle] = useState("");
  const [editInstructorAvatar, setEditInstructorAvatar] = useState("");
  const [editBatchName, setEditBatchName] = useState("");
  const [editScheduleDetails, setEditScheduleDetails] = useState("");
  const [editFeaturesText, setEditFeaturesText] = useState("");
  const [editAspectRatio, setEditAspectRatio] = useState<"16:9" | "4:3" | "3:4" | "1:1">("16:9");

  const [saveSuccessMessage, setSaveSuccessMessage] = useState("");

  // Payment Verification State
  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
  const [paySearch, setPaySearch] = useState("");
  const [payFilter, setPayFilter] = useState<"All" | "Pending" | "Approved" | "Rejected">("All");
  const [selectedPayReq, setSelectedPayReq] = useState<any | null>(null);
  const [teacherNote, setTeacherNote] = useState("");

  // Real-time listener for Payment Requests
  useEffect(() => {
    const qPayments = query(collection(db, "payment_requests"), orderBy("submissionDate", "desc"), limit(100));
    const unsubscribe = onSnapshot(
      qPayments,
      (snapshot) => {
        const loaded: any[] = [];
        snapshot.forEach((docSnap) => {
          loaded.push({ id: docSnap.id, ...docSnap.data() });
        });
        setPaymentRequests(loaded);
      },
      (err) => {
        console.warn("Payment requests stream warning:", err.message);
      }
    );
    return () => unsubscribe();
  }, []);

  // Sync Course Form with Selected Course only when switching course or initial mount
  const loadedCourseIdRef = useRef<string>("");

  useEffect(() => {
    if (selectedCourse && selectedCourse.id !== loadedCourseIdRef.current) {
      loadedCourseIdRef.current = selectedCourse.id;
      setEditTitle(selectedCourse.title || "");
      setEditShortDesc(selectedCourse.shortDescription || "");
      setEditFullDesc(selectedCourse.fullDescription || "");
      setEditThumbnail(selectedCourse.thumbnail || "");
      setEditBanner(selectedCourse.banner || "");
      setEditOriginalPrice(selectedCourse.originalPrice || 6500);
      setEditDiscountedPrice(selectedCourse.discountedPrice || 4500);
      setEditTotalEnrolled(selectedCourse.totalEnrolled !== undefined ? selectedCourse.totalEnrolled : 1420);
      setEditInstructorName(selectedCourse.instructorName || "");
      setEditInstructorTitle(selectedCourse.instructorTitle || "");
      setEditInstructorAvatar(selectedCourse.instructorAvatar || "");
      setEditFeaturesText((selectedCourse.features || []).join("\n"));
      setEditAspectRatio(selectedCourse.aspectRatio || "16:9");
    }
    if (selectedBatch) {
      setEditBatchName(selectedBatch.batchName || "");
      setEditScheduleDetails(selectedBatch.scheduleDetails || "");
    }
  }, [selectedCourseId, selectedCourse]);

  // Form States for New / Edited Exam
  const [examTitle, setExamTitle] = useState("");
  const [examSubject, setExamSubject] = useState<"Biology" | "Chemistry" | "Physics" | "English" | "GK" | "All">("All");
  const [examChapter, setExamChapter] = useState("General");
  const [examDuration, setExamDuration] = useState(30);
  const [examPassMarks, setExamPassMarks] = useState(12);
  const [examTargetBatchId, setExamTargetBatchId] = useState("");
  const [examIsPublished, setExamIsPublished] = useState(true);
  const [examStartTime, setExamStartTime] = useState("");
  const [examEndTime, setExamEndTime] = useState("");
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [previewingExam, setPreviewingExam] = useState<CourseExam | null>(null);
  const [examDeleteConfirmId, setExamDeleteConfirmId] = useState<string | null>(null);
  const [examSearchTerm, setExamSearchTerm] = useState("");
  const [examFilterSubject, setExamFilterSubject] = useState<string>("all");
  const [examFilterBatch, setExamFilterBatch] = useState<string>("all");
  const [examFilterStatus, setExamFilterStatus] = useState<"all" | "published" | "draft">("all");
  const [isSavingExam, setIsSavingExam] = useState(false);

  // Question Bank Picker Modal State for Exam Builder
  const [isQBPickerOpen, setIsQBPickerOpen] = useState(false);
  const [qbSearchTerm, setQbSearchTerm] = useState("");
  const [qbSubjectFilter, setQbSubjectFilter] = useState<string>("all");
  const [qbChapterFilter, setQbChapterFilter] = useState<string>("all");
  const [qbSelectedQuestionIds, setQbSelectedQuestionIds] = useState<Set<string>>(new Set());
  const [qbLibraryQuestions, setQbLibraryQuestions] = useState<Question[]>([]);

  // Load Question Bank on demand only when picker modal is opened
  useEffect(() => {
    if (!isQBPickerOpen) return;
    getDocs(query(collection(db, "questions"), limit(100)))
      .then((snapshot) => {
        const loaded: Question[] = [];
        snapshot.forEach((docSnap) => {
          loaded.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        if (loaded.length > 0) {
          setQbLibraryQuestions(loaded);
        } else {
          const starters: Question[] = STARTER_QUESTIONS.map((sq, idx) => ({
            ...sq,
            id: `starter_q_${idx + 1}`
          }));
          setQbLibraryQuestions(starters);
        }
      })
      .catch((err) => {
        console.warn("Questions collection fetch fallback:", err.message);
        const starters: Question[] = STARTER_QUESTIONS.map((sq, idx) => ({
          ...sq,
          id: `starter_q_${idx + 1}`
        }));
        setQbLibraryQuestions(starters);
      });
  }, [isQBPickerOpen]);

  const [questions, setQuestions] = useState<Question[]>([
    {
      id: "q_1",
      questionText: "",
      options: ["", "", "", ""],
      correctAnswerIndex: 0,
      subject: "Biology",
      chapter: "General",
      explanation: ""
    }
  ]);

  // Form States for Class Add & Edit
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [classTitle, setClassTitle] = useState("");
  const [classDesc, setClassDesc] = useState("");
  const [classInstructor, setClassInstructor] = useState(user.displayName || "Teacher");
  const [isClassLive, setIsClassLive] = useState(true);
  const [classLiveUrl, setClassLiveUrl] = useState("");
  const [classGoogleMeetUrl, setClassGoogleMeetUrl] = useState("");
  const [classYoutubeLiveUrl, setClassYoutubeLiveUrl] = useState("");
  const [classRecordingUrl, setClassRecordingUrl] = useState("");
  const [classMeetingCode, setClassMeetingCode] = useState("");
  const [classPlatform, setClassPlatform] = useState<"google_meet" | "youtube" | "dual">("dual");
  const [classSubject, setClassSubject] = useState("Biology");
  const [classChapter, setClassChapter] = useState("");
  const [classDate, setClassDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [classTime, setClassTime] = useState("08:00 PM");
  const [classDurationMinutes, setClassDurationMinutes] = useState(75);
  const [classStatus, setClassStatus] = useState<"upcoming" | "live_now" | "ended">("upcoming");
  const [classSearchTerm, setClassSearchTerm] = useState("");
  const [classFilterSubject, setClassFilterSubject] = useState("all");
  const [classFilterStatus, setClassFilterStatus] = useState<"all" | "live_now" | "upcoming" | "ended">("all");
  const [classDeleteConfirmId, setClassDeleteConfirmId] = useState<string | null>(null);

  // Form States for Material (Notes) Add & Edit
  const [editingMatId, setEditingMatId] = useState<string | null>(null);
  const [matTitle, setMatTitle] = useState("");
  const [matType, setMatType] = useState<"pdf" | "note" | "lecture_sheet" | "practice_sheet" | "handout">("pdf");
  const [matUrl, setMatUrl] = useState("");
  const [matSubject, setMatSubject] = useState("Biology");
  const [matChapter, setMatChapter] = useState("");
  const [matFileName, setMatFileName] = useState("");
  const [matFileSize, setMatFileSize] = useState("4.5 MB");
  const [matSearchTerm, setMatSearchTerm] = useState("");
  const [matFilterSubject, setMatFilterSubject] = useState("all");
  const [matDeleteConfirmId, setMatDeleteConfirmId] = useState<string | null>(null);

  // Image Upload Optimization & Feedback States
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isOptimizingImage, setIsOptimizingImage] = useState(false);
  const [imageOptimizationStatus, setImageOptimizationStatus] = useState<string>("");
  const [saveError, setSaveError] = useState<string>("");
  const [isSavingCourse, setIsSavingCourse] = useState(false);

  // Helper for Direct File Upload with Ultra-Fast Image Compression (keeps document < 100KB for Firestore)
  const handleDirectFileUpload = async (
    file: File,
    callback: (dataUrl: string, fileName: string, fileSizeStr: string) => void,
    target: "thumbnail" | "banner" | "avatar" = "thumbnail"
  ) => {
    if (!file) return;
    setIsOptimizingImage(true);
    playSound("click");

    try {
      const maxWidth = target === "banner" ? 1440 : target === "thumbnail" ? 960 : 500;
      const maxHeight = target === "banner" ? 900 : target === "thumbnail" ? 720 : 500;
      const result = await optimizeImageFile(file, { maxWidth, maxHeight, quality: 0.84 });

      callback(result.dataUrl, file.name, result.compressedSizeFormatted);
      setImageOptimizationStatus(
        `${isBn ? "✓ ছবি সফলভাবে অপ্টিমাইজ হয়েছে" : "✓ Optimized"}: ${result.originalSizeFormatted} → ${result.compressedSizeFormatted} (${isBn ? "ক্লাউড সিঙ্ক রেডি" : "Cloud Ready"})`
      );
      setTimeout(() => setImageOptimizationStatus(""), 6000);
    } catch (err: any) {
      console.warn("Direct file upload optimization error:", err);
      // Fallback to direct file reader if canvas compression fails
      const reader = new FileReader();
      const sizeInMB = (file.size / (1024 * 1024)).toFixed(1) + " MB";
      reader.onload = (e) => {
        const result = e.target?.result as string;
        callback(result, file.name, sizeInMB);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsOptimizingImage(false);
    }
  };

  // Form States for Announcement (Notice) Add & Edit & Filter
  const [editingAncId, setEditingAncId] = useState<string | null>(null);
  const [ancTitle, setAncTitle] = useState("");
  const [ancContent, setAncContent] = useState("");
  const [ancPriority, setAncPriority] = useState<"high" | "normal">("high");
  const [ancIsPinned, setAncIsPinned] = useState(false);
  const [ancBatchId, setAncBatchId] = useState<string>("all");
  const [ancSearchTerm, setAncSearchTerm] = useState("");
  const [ancFilterBatch, setAncFilterBatch] = useState("all");
  const [ancFilterPriority, setAncFilterPriority] = useState("all");
  const [ancDeleteConfirmId, setAncDeleteConfirmId] = useState<string | null>(null);
  const [ancFeedbackMessage, setAncFeedbackMessage] = useState("");
  const noticeFormRef = useRef<HTMLDivElement | null>(null);

  // States for Exam Questions & Live Exam Management
  const [managingQuestionsExam, setManagingQuestionsExam] = useState<CourseExam | null>(null);
  const [managingLiveExam, setManagingLiveExam] = useState<CourseExam | null>(null);
  const [isBulkModalInAddExamOpen, setIsBulkModalInAddExamOpen] = useState(false);

  // Handle Save Course Changes with Safe Firestore Persistence
  const handleSaveCourseChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;

    setIsSavingCourse(true);
    setSaveError("");
    playSound("correct");

    const updatedFeatures = editFeaturesText
      ? editFeaturesText.split("\n").filter((f) => f.trim().length > 0)
      : selectedCourse.features;

    const updatedCourse: Course = {
      ...selectedCourse,
      title: editTitle.trim() || selectedCourse.title,
      shortDescription: editShortDesc,
      fullDescription: editFullDesc,
      thumbnail: editThumbnail || selectedCourse.thumbnail,
      banner: editBanner || editThumbnail || selectedCourse.banner,
      originalPrice: Number(editOriginalPrice),
      discountedPrice: Number(editDiscountedPrice),
      totalEnrolled: Number(editTotalEnrolled) || 0,
      instructorName: editInstructorName,
      instructorTitle: editInstructorTitle,
      instructorAvatar: editInstructorAvatar,
      aspectRatio: editAspectRatio,
      features: updatedFeatures,
      updatedAt: new Date().toISOString()
    };

    const updatedBatch: Batch | null = selectedBatch
      ? {
          ...selectedBatch,
          batchName: editBatchName || selectedBatch.batchName,
          price: Number(editDiscountedPrice),
          originalPrice: Number(editOriginalPrice),
          discountedPrice: Number(editDiscountedPrice),
          scheduleDetails: editScheduleDetails || selectedBatch.scheduleDetails
        }
      : null;

    // Direct Firestore Persistence with Sanitization
    try {
      const cleanedCourse = cleanDataForFirestore(updatedCourse);
      await setDoc(doc(db, "courses", updatedCourse.id), cleanedCourse, { merge: true });

      if (updatedBatch) {
        const cleanedBatch = cleanDataForFirestore(updatedBatch);
        await setDoc(doc(db, "batches", updatedBatch.id), cleanedBatch, { merge: true });
      }

      // Local storage backup
      try {
        const stored = localStorage.getItem("medibridge_courses_cache");
        const list: Course[] = stored ? JSON.parse(stored) : [];
        const idx = list.findIndex((c) => c.id === updatedCourse.id);
        if (idx >= 0) list[idx] = updatedCourse;
        else list.unshift(updatedCourse);
        localStorage.setItem("medibridge_courses_cache", JSON.stringify(list));
      } catch (e) {}

      try {
        if (updatedBatch) {
          const storedB = localStorage.getItem("medibridge_batches_cache");
          const bList: Batch[] = storedB ? JSON.parse(storedB) : [];
          const bIdx = bList.findIndex((b) => b.id === updatedBatch.id);
          if (bIdx >= 0) bList[bIdx] = updatedBatch;
          else bList.unshift(updatedBatch);
          localStorage.setItem("medibridge_batches_cache", JSON.stringify(bList));
        }
      } catch (e) {}

      // Keep loadedCourseIdRef synced to avoid reset
      loadedCourseIdRef.current = updatedCourse.id;

      if (onUpdateCourse) {
        onUpdateCourse(updatedCourse);
      }

      if (updatedBatch && onUpdateBatch) {
        onUpdateBatch(updatedBatch);
      }

      setSaveSuccessMessage(
        isBn
          ? "✓ কোর্সের ফটো ও সকল তথ্য সফলভাবে ক্লাউড ডাটাবেজে স্থায়ীভাবে সেভ হয়েছে!"
          : "✓ Course details and pictures permanently saved & synced to cloud database!"
      );

      setTimeout(() => {
        setSaveSuccessMessage("");
      }, 5000);
    } catch (err: any) {
      console.warn("Firestore live course sync error:", err);
      setSaveError(
        isBn
          ? `ডাটাবেজ সেভ করতে সমস্যা হয়েছে: ${err.message || "Unknown error"}`
          : `Failed to save to database: ${err.message || "Unknown error"}`
      );
    } finally {
      setIsSavingCourse(false);
    }
  };

  // Exam Management Handlers
  const handleOpenCreateExam = () => {
    playSound("click");
    setEditingExamId(null);
    setExamTitle("");
    setExamSubject("Biology");
    setExamChapter("General");
    setExamDuration(30);
    setExamPassMarks(12);
    setExamTargetBatchId(selectedBatchId || courseBatches[0]?.id || "");
    setExamIsPublished(true);
    setExamStartTime(new Date().toISOString().slice(0, 16));
    setExamEndTime(new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 16));
    setQuestions([
      {
        id: `q_${Date.now()}_1`,
        questionText: "",
        options: ["", "", "", ""],
        correctAnswerIndex: 0,
        subject: "Biology",
        chapter: "General",
        explanation: ""
      }
    ]);
    setActiveTab("add_exam");
  };

  const handleOpenEditExam = (ex: CourseExam) => {
    playSound("click");
    setEditingExamId(ex.id);
    setExamTitle(ex.title);
    setExamSubject((ex.subject as any) || "Biology");
    setExamChapter(ex.chapter || "General");
    setExamDuration(ex.durationMinutes || 30);
    setExamPassMarks(ex.passMarks || Math.round((ex.questions?.length || 10) * 0.4));
    setExamTargetBatchId(ex.batchId || selectedBatchId || courseBatches[0]?.id || "");
    setExamIsPublished(ex.isPublished !== false);
    setExamStartTime(ex.startTime ? ex.startTime.slice(0, 16) : new Date().toISOString().slice(0, 16));
    setExamEndTime(ex.endTime ? ex.endTime.slice(0, 16) : new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 16));
    setQuestions(
      ex.questions && ex.questions.length > 0
        ? JSON.parse(JSON.stringify(ex.questions))
        : [
            {
              id: `q_${Date.now()}_1`,
              questionText: "",
              options: ["", "", "", ""],
              correctAnswerIndex: 0,
              subject: (ex.subject as any) || "Biology",
              chapter: ex.chapter || "General",
              explanation: ""
            }
          ]
    );
    setActiveTab("add_exam");
  };

  const handleAddQuestionToExam = () => {
    playSound("click");
    setQuestions((prev) => [
      ...prev,
      {
        id: `q_${Date.now()}_${prev.length + 1}`,
        questionText: "",
        options: ["", "", "", ""],
        correctAnswerIndex: 0,
        subject: examSubject,
        chapter: examChapter || "General",
        explanation: ""
      }
    ]);
  };

  const handleRemoveQuestionFromExam = (qIdx: number) => {
    playSound("click");
    setQuestions((prev) => prev.filter((_, idx) => idx !== qIdx));
  };

  const handleDuplicateQuestionInExam = (qIdx: number) => {
    playSound("click");
    setQuestions((prev) => {
      const target = prev[qIdx];
      if (!target) return prev;
      const clone: Question = {
        ...target,
        id: `q_${Date.now()}_copy_${qIdx}`
      };
      const next = [...prev];
      next.splice(qIdx + 1, 0, clone);
      return next;
    });
  };

  const handleImportSelectedQBQuestions = () => {
    if (qbSelectedQuestionIds.size === 0) return;
    playSound("correct");
    const toImport = qbLibraryQuestions.filter((q) => qbSelectedQuestionIds.has(q.id));
    setQuestions((prev) => {
      // Avoid duplicate IDs
      const importedFormatted: Question[] = toImport.map((q, idx) => ({
        ...q,
        id: `q_${Date.now()}_qb_${idx + 1}`
      }));
      // If previous only had 1 empty question, replace it
      if (prev.length === 1 && !prev[0].questionText.trim()) {
        return importedFormatted;
      }
      return [...prev, ...importedFormatted];
    });
    setQbSelectedQuestionIds(new Set());
    setIsQBPickerOpen(false);
  };

  const handleDuplicateExam = async (ex: CourseExam) => {
    playSound("correct");
    const clonedExam: CourseExam = {
      ...ex,
      id: `exam_${Date.now()}`,
      title: `${ex.title} (Copy)`,
      createdAt: new Date().toISOString()
    };

    try {
      const cleaned = cleanDataForFirestore(clonedExam);
      await setDoc(doc(db, "course_exams", clonedExam.id), cleaned, { merge: true });
      onCreateExam(clonedExam);
      setSaveSuccessMessage(isBn ? `✓ "${clonedExam.title}" সফলভাবে ডুপ্লিকেট করা হয়েছে!` : `✓ "${clonedExam.title}" cloned successfully!`);
      setTimeout(() => setSaveSuccessMessage(""), 4000);
    } catch (err: any) {
      console.warn("Clone exam error:", err);
    }
  };

  const handleDeleteExamAction = async (examId: string) => {
    playSound("click");
    try {
      await deleteDoc(doc(db, "course_exams", examId));
      if (onDeleteExam) {
        onDeleteExam(examId);
      }
      setExamDeleteConfirmId(null);
      setSaveSuccessMessage(isBn ? "✓ পরীক্ষা সফলভাবে মুছে ফেলা হয়েছে!" : "✓ Exam deleted successfully!");
      setTimeout(() => setSaveSuccessMessage(""), 4000);
    } catch (err: any) {
      console.warn("Delete exam error:", err);
    }
  };

  const handleToggleExamPublish = async (ex: CourseExam) => {
    playSound("click");
    const updated: CourseExam = {
      ...ex,
      isPublished: !ex.isPublished
    };
    try {
      const cleaned = cleanDataForFirestore(updated);
      await setDoc(doc(db, "course_exams", updated.id), cleaned, { merge: true });
      if (onUpdateExam) {
        onUpdateExam(updated);
      }
    } catch (err: any) {
      console.warn("Toggle exam publish error:", err);
    }
  };

  const handleSaveExamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examTitle.trim() || questions.length === 0) return;

    setIsSavingExam(true);
    playSound("correct");

    const batchIdToUse = examTargetBatchId || selectedBatchId || courseBatches[0]?.id || "";
    const calcPassMarks = examPassMarks || Math.round(questions.length * 0.4);

    if (editingExamId) {
      // Update existing exam
      const updatedExam: CourseExam = {
        id: editingExamId,
        courseId: selectedCourseId,
        batchId: batchIdToUse,
        title: examTitle.trim(),
        subject: examSubject,
        chapter: examChapter.trim() || "General",
        durationMinutes: Number(examDuration),
        totalQuestions: questions.length,
        passMarks: calcPassMarks,
        questions,
        startTime: examStartTime ? new Date(examStartTime).toISOString() : new Date().toISOString(),
        endTime: examEndTime ? new Date(examEndTime).toISOString() : new Date(Date.now() + 86400000 * 30).toISOString(),
        isPublished: examIsPublished,
        createdAt: new Date().toISOString()
      };

      try {
        const cleaned = cleanDataForFirestore(updatedExam);
        await setDoc(doc(db, "course_exams", updatedExam.id), cleaned, { merge: true });
        if (onUpdateExam) {
          onUpdateExam(updatedExam);
        }
        setSaveSuccessMessage(isBn ? "✓ পরীক্ষা ও প্রশ্নসমূহ সফলভাবে আপডেট করা হয়েছে!" : "✓ Exam and questions updated successfully!");
        setTimeout(() => setSaveSuccessMessage(""), 5000);
      } catch (err: any) {
        console.warn("Update exam error:", err);
      }
    } else {
      // Create new exam
      const newExam: CourseExam = {
        id: `exam_${Date.now()}`,
        courseId: selectedCourseId,
        batchId: batchIdToUse,
        title: examTitle.trim(),
        subject: examSubject,
        chapter: examChapter.trim() || "General",
        durationMinutes: Number(examDuration),
        totalQuestions: questions.length,
        passMarks: calcPassMarks,
        questions,
        startTime: examStartTime ? new Date(examStartTime).toISOString() : new Date().toISOString(),
        endTime: examEndTime ? new Date(examEndTime).toISOString() : new Date(Date.now() + 86400000 * 30).toISOString(),
        isPublished: examIsPublished,
        createdAt: new Date().toISOString()
      };

      try {
        const cleaned = cleanDataForFirestore(newExam);
        await setDoc(doc(db, "course_exams", newExam.id), cleaned, { merge: true });
        onCreateExam(newExam);

        // Trigger Notification for New Exam
        NotificationService.triggerEvent("NEW_EXAM", {
          courseId: selectedCourseId,
          batchId: batchIdToUse,
          audience: "enrolled_students",
          variables: {
            exam_name: examTitle,
            exam_date: new Date().toLocaleDateString(),
            course_name: selectedCourse?.title || "Medical Course"
          }
        });
        setSaveSuccessMessage(isBn ? "✓ নতুন পরীক্ষা সফলভাবে পাবলিশ করা হয়েছে!" : "✓ New exam published successfully!");
        setTimeout(() => setSaveSuccessMessage(""), 5000);
      } catch (err: any) {
        console.warn("Create exam error:", err);
      }
    }

    setIsSavingExam(false);
    setEditingExamId(null);
    setExamTitle("");
    setActiveTab("edit_exams");
  };

  // Class Save (Create & Edit) Handler
  const handleSaveClassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!classTitle.trim()) return;

    playSound("correct");
    const classObj: CourseClass = {
      id: editingClassId || `cls_${Date.now()}`,
      courseId: selectedCourseId,
      batchId: selectedBatchId || courseBatches[0]?.id || "",
      title: classTitle.trim(),
      description: classDesc.trim(),
      instructor: classInstructor.trim() || user.displayName || "Teacher",
      isLive: classStatus === "live_now" || isClassLive,
      status: classStatus,
      platform: classPlatform,
      liveUrl: classLiveUrl || classGoogleMeetUrl || classYoutubeLiveUrl || "https://meet.google.com/demo",
      googleMeetUrl: classGoogleMeetUrl || (classPlatform === "google_meet" || classPlatform === "dual" ? classLiveUrl : ""),
      youtubeLiveUrl: classYoutubeLiveUrl || (classPlatform === "youtube" || classPlatform === "dual" ? classLiveUrl : ""),
      recordingUrl: classRecordingUrl || (classStatus === "ended" ? classLiveUrl : ""),
      meetingCode: classMeetingCode,
      date: classDate || new Date().toISOString().slice(0, 10),
      time: classTime,
      durationMinutes: Number(classDurationMinutes) || 60,
      subject: classSubject,
      chapter: classChapter.trim() || "General",
      createdAt: new Date().toISOString()
    };

    if (editingClassId && onUpdateClass) {
      onUpdateClass(classObj);
      setSaveSuccessMessage(isBn ? "ক্লাস সফলভাবে আপডেট করা হয়েছে!" : "Class updated successfully!");
    } else {
      onCreateClass(classObj);
      setSaveSuccessMessage(isBn ? "নতুন ক্লাস সফলভাবে পাবলিশ হয়েছে!" : "New class published successfully!");
      NotificationService.triggerEvent("NEW_CLASS", {
        courseId: selectedCourseId,
        batchId: selectedBatchId || courseBatches[0]?.id || "",
        audience: "enrolled_students",
        variables: {
          class_topic: classTitle,
          teacher_name: classInstructor || user.displayName || "Instructor",
          class_time: classStatus === "live_now" ? "Live Now / Today" : `${classDate} ${classTime}`,
          course_name: selectedCourse?.title || "Medical Course"
        }
      });
    }

    setTimeout(() => setSaveSuccessMessage(""), 4000);
    handleResetClassForm();
  };

  const handleResetClassForm = () => {
    setEditingClassId(null);
    setClassTitle("");
    setClassDesc("");
    setClassLiveUrl("");
    setClassGoogleMeetUrl("");
    setClassYoutubeLiveUrl("");
    setClassRecordingUrl("");
    setClassMeetingCode("");
    setClassChapter("");
    setClassStatus("upcoming");
    setIsClassLive(false);
  };

  const handleEditClass = (cls: CourseClass) => {
    playSound("click");
    setEditingClassId(cls.id);
    setClassTitle(cls.title || "");
    setClassDesc(cls.description || "");
    setClassInstructor(cls.instructor || user.displayName || "Teacher");
    setIsClassLive(Boolean(cls.isLive || cls.status === "live_now"));
    setClassStatus(cls.status || (cls.isLive ? "live_now" : "upcoming"));
    setClassPlatform((cls.platform as any) || "dual");
    setClassLiveUrl(cls.liveUrl || "");
    setClassGoogleMeetUrl(cls.googleMeetUrl || "");
    setClassYoutubeLiveUrl(cls.youtubeLiveUrl || "");
    setClassRecordingUrl(cls.recordingUrl || "");
    setClassMeetingCode(cls.meetingCode || "");
    setClassSubject(cls.subject || "Biology");
    setClassChapter(cls.chapter || "");
    setClassDate(cls.date || new Date().toISOString().slice(0, 10));
    setClassTime(cls.time || "08:00 PM");
    setClassDurationMinutes(cls.durationMinutes || 75);
  };

  const handleToggleClassLive = (cls: CourseClass) => {
    playSound("click");
    const nextStatus = cls.status === "live_now" ? "ended" : "live_now";
    const updated: CourseClass = {
      ...cls,
      status: nextStatus,
      isLive: nextStatus === "live_now"
    };
    if (onUpdateClass) {
      onUpdateClass(updated);
      setSaveSuccessMessage(
        nextStatus === "live_now"
          ? (isBn ? "🔴 ক্লাস এখন লাইভ! শিক্ষার্থীরা ক্লাসরুম থেকে যুক্ত হতে পারবে।" : "🔴 Class is now live!")
          : (isBn ? "⏹️ ক্লাস সম্পন্ন হয়েছে।" : "⏹️ Class ended.")
      );
      setTimeout(() => setSaveSuccessMessage(""), 3500);
    }
  };

  // Material (Notes) Save (Create & Edit) Handler
  const handleSaveMaterialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matTitle.trim()) return;

    playSound("correct");
    const matObj: CourseMaterial = {
      id: editingMatId || `mat_${Date.now()}`,
      courseId: selectedCourseId,
      batchId: selectedBatchId || courseBatches[0]?.id || "",
      title: matTitle.trim(),
      type: matType as any,
      fileUrl: matUrl || "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      fileSize: matFileSize || "4.5 MB",
      subject: matSubject,
      chapter: matChapter.trim() || "General",
      createdAt: new Date().toISOString()
    };

    if (editingMatId && onUpdateMaterial) {
      onUpdateMaterial(matObj);
      setSaveSuccessMessage(isBn ? "নোটস সফলভাবে আপডেট করা হয়েছে!" : "Notes updated successfully!");
    } else {
      onCreateMaterial(matObj);
      setSaveSuccessMessage(isBn ? "নতুন নোটস সফলভাবে আপলোড হয়েছে!" : "Notes uploaded successfully!");
      NotificationService.triggerEvent("NEW_MATERIAL", {
        courseId: selectedCourseId,
        batchId: selectedBatchId || courseBatches[0]?.id || "",
        audience: "enrolled_students",
        variables: {
          material_title: matTitle,
          material_type: matType.toUpperCase(),
          course_name: selectedCourse?.title || "Medical Course"
        }
      });
    }

    setTimeout(() => setSaveSuccessMessage(""), 4000);
    handleResetMaterialForm();
  };

  const handleResetMaterialForm = () => {
    setEditingMatId(null);
    setMatTitle("");
    setMatUrl("");
    setMatChapter("");
    setMatFileName("");
    setMatFileSize("4.5 MB");
  };

  const handleEditMaterial = (mat: CourseMaterial) => {
    playSound("click");
    setEditingMatId(mat.id);
    setMatTitle(mat.title || "");
    setMatType((mat.type as any) || "pdf");
    setMatUrl(mat.fileUrl || "");
    setMatSubject(mat.subject || "Biology");
    setMatChapter(mat.chapter || "");
    setMatFileSize(mat.fileSize || "4.5 MB");
  };

  const handleToggleExamLiveStatus = (ex: CourseExam) => {
    playSound("click");
    const isCurrentlyLive = ex.status === "live_now" || ex.isLive === true;
    const nextStatus = isCurrentlyLive ? "ended" : "live_now";
    const updated: CourseExam = {
      ...ex,
      status: nextStatus,
      isLive: nextStatus === "live_now",
      isPublished: true,
      startTime: nextStatus === "live_now" ? new Date().toISOString() : ex.startTime
    };
    if (onUpdateExam) {
      onUpdateExam(updated);
      setSaveSuccessMessage(
        nextStatus === "live_now"
          ? (isBn ? "🔴 লাইভ পরীক্ষা শুরু হয়েছে! সকল শিক্ষার্থী এখন পরীক্ষায় অংশ নিতে পারবে।" : "🔴 Live exam started! Students can take the test now.")
          : (isBn ? "⏹️ লাইভ পরীক্ষা সমাপ্ত হয়েছে ও ফলাফল সক্রিয় করা হয়েছে।" : "⏹️ Live exam ended and results activated.")
      );
      setTimeout(() => setSaveSuccessMessage(""), 5000);
    }
  };

  const handleCreateAnnouncementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ancTitle || !ancContent) return;

    playSound("correct");

    if (editingAncId) {
      // EDIT MODE
      const existing = announcements.find((a) => a.id === editingAncId);
      const updatedAnc: CourseAnnouncement = {
        ...(existing || {}),
        id: editingAncId,
        courseId: selectedCourseId,
        batchId: ancBatchId === "all" ? "" : ancBatchId || selectedBatchId || "",
        title: ancTitle.trim(),
        content: ancContent.trim(),
        authorName: existing?.authorName || user.displayName || "Instructor",
        authorRole: existing?.authorRole || "Head Mentor",
        priority: ancPriority,
        isPinned: ancIsPinned,
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (onUpdateAnnouncement) {
        onUpdateAnnouncement(updatedAnc);
      } else {
        onCreateAnnouncement(updatedAnc);
      }

      setAncFeedbackMessage(isBn ? "✅ নোটিশ সফলভাবে আপডেট করা হয়েছে!" : "✅ Notice updated successfully!");
      setEditingAncId(null);
      setAncTitle("");
      setAncContent("");
      setAncIsPinned(false);
      setTimeout(() => setAncFeedbackMessage(""), 4000);
      return;
    }

    // CREATE MODE
    const newAnc: CourseAnnouncement = {
      id: `anc_${Date.now()}`,
      courseId: selectedCourseId,
      batchId: ancBatchId === "all" ? "" : ancBatchId || selectedBatchId || courseBatches[0]?.id || "",
      title: ancTitle.trim(),
      content: ancContent.trim(),
      authorName: user.displayName || "Instructor",
      authorRole: "Head Mentor",
      priority: ancPriority,
      isPinned: ancIsPinned,
      createdAt: new Date().toISOString()
    };

    onCreateAnnouncement(newAnc);

    // Trigger Notification for Announcement
    NotificationService.triggerEvent("NEW_ANNOUNCEMENT", {
      courseId: selectedCourseId,
      batchId: newAnc.batchId || "",
      audience: "enrolled_students",
      variables: {
        announcement_title: ancTitle,
        teacher_name: user.displayName || "Head Mentor",
        course_name: selectedCourse?.title || "Medical Course"
      }
    });

    setAncFeedbackMessage(isBn ? "📢 নতুন নোটিশ সফলভাবে পোস্ট করা হয়েছে!" : "📢 Notice broadcasted successfully!");
    setAncTitle("");
    setAncContent("");
    setAncIsPinned(false);
    setTimeout(() => setAncFeedbackMessage(""), 4000);
  };

  const handleStartEditAnnouncement = (anc: CourseAnnouncement) => {
    playSound("click");
    setEditingAncId(anc.id);
    setAncTitle(anc.title);
    setAncContent(anc.content);
    setAncPriority(anc.priority === "normal" ? "normal" : "high");
    setAncIsPinned(Boolean(anc.isPinned));
    setAncBatchId(anc.batchId || "all");
    noticeFormRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleCancelEditAnnouncement = () => {
    playSound("click");
    setEditingAncId(null);
    setAncTitle("");
    setAncContent("");
    setAncIsPinned(false);
    setAncBatchId("all");
  };

  const handleDeleteAnnouncement = (ancId: string) => {
    playSound("click");
    if (onDeleteAnnouncement) {
      onDeleteAnnouncement(ancId);
    }
    setAncDeleteConfirmId(null);
    setAncFeedbackMessage(isBn ? "🗑️ নোটিশ মুছে ফেলা হয়েছে।" : "🗑️ Notice deleted.");
    setTimeout(() => setAncFeedbackMessage(""), 3500);
  };

  const handleTogglePinAnnouncement = (anc: CourseAnnouncement) => {
    playSound("click");
    const nextPinned = !anc.isPinned;
    const updated: CourseAnnouncement = {
      ...anc,
      isPinned: nextPinned
    };
    if (onUpdateAnnouncement) {
      onUpdateAnnouncement(updated);
    }
    setAncFeedbackMessage(
      nextPinned
        ? (isBn ? "📌 নোটিশটি শীর্ষে পিন করা হয়েছে!" : "📌 Notice pinned to top!")
        : (isBn ? "আনপিন করা হয়েছে।" : "Notice unpinned.")
    );
    setTimeout(() => setAncFeedbackMessage(""), 3000);
  };

  const handleBroadcastLiveExamNotice = (title: string, message: string) => {
    const liveAnc: CourseAnnouncement = {
      id: `anc_live_${Date.now()}`,
      courseId: selectedCourseId,
      batchId: selectedBatchId || courseBatches[0]?.id || "",
      title,
      content: message,
      authorName: user.displayName || "Course Mentor",
      authorRole: "Exam Incharge",
      priority: "high",
      isPinned: true,
      createdAt: new Date().toISOString()
    };
    onCreateAnnouncement(liveAnc);

    NotificationService.triggerEvent("NEW_ANNOUNCEMENT", {
      courseId: selectedCourseId,
      batchId: liveAnc.batchId || "",
      audience: "enrolled_students",
      variables: {
        announcement_title: title,
        teacher_name: user.displayName || "Exam Incharge",
        course_name: selectedCourse?.title || "Medical Course"
      }
    });
  };

  const handleTeacherApprovePayment = async (req: any) => {
    try {
      playSound("correct");
      const now = new Date();
      const expiryDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

      // Update payment request status
      await updateDoc(doc(db, "payment_requests", req.id), {
        status: "Approved",
        adminNotes: teacherNote.trim() || "Verified by course mentor"
      });

      // Update User Profile with Premium & Enrolled Batches
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

      // Create Course Enrollment record
      if (req.courseId || req.batchId) {
        await addDoc(collection(db, "enrollments"), {
          userId: req.userId,
          userEmail: req.userEmail || "",
          userDisplayName: req.userName || "",
          courseId: req.courseId || "course_med_2027",
          batchId: req.batchId || "batch_2027_alpha",
          courseTitle: req.courseTitle || req.selectedPlan || "Medical Course",
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

      setSelectedPayReq(null);
      setTeacherNote("");
      setSaveSuccessMessage("পেমেন্ট সফলভাবে ভেরিফাই ও অনুমোদন করা হয়েছে!");
    } catch (e: any) {
      console.error("Approve error:", e);
      alert("Error approving payment: " + e.message);
    }
  };

  const handleTeacherRejectPayment = async (req: any) => {
    try {
      playSound("click");
      await updateDoc(doc(db, "payment_requests", req.id), {
        status: "Rejected",
        adminNotes: teacherNote.trim() || "Payment info could not be matched."
      });

      await NotificationService.triggerEvent("PAYMENT_FAILED", {
        recipientId: req.userId,
        recipientName: req.userName || "Student",
        courseId: req.courseId,
        batchId: req.batchId,
        variables: {
          course_name: req.courseTitle || req.selectedPlan || "Course",
          student_name: req.userName || "Student",
          reason: teacherNote.trim() || "Transaction ID mismatch"
        }
      });

      setSelectedPayReq(null);
      setTeacherNote("");
      setSaveSuccessMessage("পেমেন্ট রিকোয়েস্ট বাতিল করা হয়েছে।");
    } catch (e: any) {
      console.error("Reject error:", e);
      alert("Error rejecting payment: " + e.message);
    }
  };

  // Handler: Manually Enroll Student to Course & Batch
  const handleManualAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualStudentEmail && !manualStudentUid) {
      alert("Please provide student email or user ID");
      return;
    }

    try {
      playSound("correct");
      const matchedUser = allUsersList.find(
        (u) =>
          (manualStudentUid && u.uid === manualStudentUid) ||
          (manualStudentEmail && (u.email || "").toLowerCase() === manualStudentEmail.trim().toLowerCase())
      );

      const targetUid = matchedUser?.uid || manualStudentUid || `user_${Date.now()}`;
      const targetName = manualStudentName.trim() || matchedUser?.displayName || "Enrolled Aspirant";
      const targetEmail = manualStudentEmail.trim() || matchedUser?.email || "";
      const targetBatchId = manualStudentBatchId || selectedBatchId || courseBatches[0]?.id || "batch_alpha";
      const targetBatch = batches.find((b) => b.id === targetBatchId) || selectedBatch;

      const now = new Date();
      const expiryDate = new Date(now.getTime() + (manualStudentExpiryMonths || 12) * 30 * 86400000);

      // Create enrollment in Firestore
      await addDoc(collection(db, "enrollments"), {
        userId: targetUid,
        userEmail: targetEmail,
        userDisplayName: targetName,
        courseId: selectedCourseId,
        batchId: targetBatchId,
        courseTitle: selectedCourse?.title || "Medical Course",
        batchName: targetBatch?.batchName || "Standard Batch",
        status: "active",
        enrolledAt: now.toISOString(),
        expiresAt: expiryDate.toISOString(),
        progressPct: 0,
        lastAccessedAt: now.toISOString(),
        completedExams: [],
        completedClasses: [],
        viewedMaterials: [],
        manuallyAddedByTeacher: true,
        teacherId: user.uid,
        teacherName: user.displayName || "Faculty"
      });

      // Update User Doc if UID exists
      if (targetUid && !targetUid.startsWith("user_")) {
        try {
          await updateDoc(doc(db, "users", targetUid), {
            isPremium: true,
            premiumExpiry: expiryDate.toISOString(),
            enrolledBatches: arrayUnion(targetBatchId),
            enrolledCourses: arrayUnion(selectedCourseId)
          });
        } catch (uErr) {
          console.warn("Could not update user doc:", uErr);
        }
      }

      // Trigger user notification
      NotificationService.triggerEvent("PAYMENT_SUCCESS", {
        recipientId: targetUid,
        recipientName: targetName,
        courseId: selectedCourseId,
        batchId: targetBatchId,
        variables: {
          course_name: selectedCourse?.title || "Medical Course",
          payment_amount: 0,
          student_name: targetName,
          trx_id: "MANUAL_TEACHER_GRANT"
        }
      });

      setIsAddStudentModalOpen(false);
      setManualStudentUid("");
      setManualStudentName("");
      setManualStudentEmail("");
      setManualStudentPhone("");
      setSaveSuccessMessage(
        isBn
          ? `শিক্ষার্থী ${targetName} কে সফলভাবে ${targetBatch?.batchName || "কোর্সে"} যুক্ত করা হয়েছে!`
          : `Student ${targetName} successfully enrolled in ${targetBatch?.batchName || "course"}!`
      );
    } catch (err: any) {
      console.error("Error adding student manually:", err);
      alert("Error adding student: " + err.message);
    }
  };

  // Handler: Remove Course Enrollment
  const handleRemoveEnrollment = async (enrollmentId: string, studentName: string) => {
    if (!window.confirm(isBn ? `আপনি কি নিশ্চিত যে ${studentName} এর এনরোলমেন্ট মুছে ফেলতে চান?` : `Are you sure you want to remove enrollment for ${studentName}?`)) {
      return;
    }
    try {
      playSound("click");
      await deleteDoc(doc(db, "enrollments", enrollmentId));
      setSaveSuccessMessage(isBn ? `${studentName} এর এনরোলমেন্ট রিমুভ করা হয়েছে।` : `Enrollment removed for ${studentName}.`);
    } catch (err: any) {
      console.error("Error removing enrollment:", err);
      alert("Error removing enrollment: " + err.message);
    }
  };

  // Handler: Save / Update Exam Marks (Live & Offline Students)
  const handleSaveExamMarks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMarkEditing) return;

    try {
      playSound("correct");
      const subId =
        currentMarkEditing.submissionId ||
        `sub_${currentMarkEditing.examId}_${currentMarkEditing.studentUid}`;

      const totalQ = currentMarkEditing.totalMarks || 100;
      const netScore = Number(currentMarkEditing.score);
      const acc = totalQ > 0 ? Math.max(0, Math.min(100, Math.round((netScore / totalQ) * 100))) : 0;

      const submissionDoc = {
        id: subId,
        examId: currentMarkEditing.examId,
        examTitle: currentMarkEditing.examTitle,
        batchId: currentMarkEditing.batchId || selectedBatchId,
        batchTitle: selectedBatch?.batchName || "Live Batch",
        courseId: selectedCourseId,
        courseTitle: selectedCourse?.title || "Medical Course",
        userId: currentMarkEditing.studentUid,
        userDisplayName: currentMarkEditing.studentName,
        userEmail: currentMarkEditing.studentEmail,
        score: netScore,
        totalQuestions: totalQ,
        correctCount: Number(currentMarkEditing.correctCount || 0),
        wrongCount: Number(currentMarkEditing.wrongCount || 0),
        skippedCount: Number(currentMarkEditing.skippedCount || 0),
        accuracy: acc,
        scorePercent: acc,
        rank: Number(currentMarkEditing.rank || 1),
        adminRemarks: currentMarkEditing.adminRemarks || "Evaluated / Updated by Course Faculty",
        evaluatedByTeacher: true,
        teacherId: user.uid,
        teacherName: user.displayName || "Faculty Mentor",
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, "live_exam_submissions", subId), submissionDoc, { merge: true });

      // Trigger Central Notification for Exam Result
      NotificationService.triggerEvent("EXAM_RESULT", {
        recipientId: currentMarkEditing.studentUid,
        recipientName: currentMarkEditing.studentName,
        courseId: selectedCourseId,
        batchId: currentMarkEditing.batchId,
        variables: {
          exam_name: currentMarkEditing.examTitle,
          student_score: netScore,
          total_score: totalQ,
          student_name: currentMarkEditing.studentName
        }
      });

      setIsExamMarksModalOpen(false);
      setCurrentMarkEditing(null);
      setSaveSuccessMessage(
        isBn
          ? `${currentMarkEditing.studentName} এর পরীক্ষার মার্কস (${netScore}/${totalQ}) সফলভাবে এন্ট্রি ও সেভ করা হয়েছে!`
          : `Exam marks (${netScore}/${totalQ}) saved successfully for ${currentMarkEditing.studentName}!`
      );
    } catch (err: any) {
      console.error("Error saving exam marks:", err);
      alert("Error saving exam marks: " + err.message);
    }
  };

  // Handler: Delete Live Exam Submission
  const handleDeleteExamMarks = async (subId: string, studentName: string) => {
    if (!window.confirm(isBn ? `আপনি কি ${studentName} এর পরীক্ষার মার্কস ডিলিট করতে চান?` : `Are you sure you want to delete exam marks for ${studentName}?`)) {
      return;
    }
    try {
      playSound("click");
      await deleteDoc(doc(db, "live_exam_submissions", subId));
      setSaveSuccessMessage(isBn ? `${studentName} এর পরীক্ষার মার্কস ডিলিট করা হয়েছে।` : `Exam marks deleted for ${studentName}.`);
    } catch (err: any) {
      console.error("Error deleting exam marks:", err);
      alert("Error deleting marks: " + err.message);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 flex flex-col gap-8 font-sans">
      {/* Teacher Dashboard Hero Banner */}
      <div className="bg-gradient-to-r from-[#18080A] via-[#111111] to-black border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFD700]/10 border border-[#FFD700]/30 text-[#FFD700] text-xs font-mono font-bold uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>TEACHER & INSTRUCTOR PANEL</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase font-display">
            {isBn ? `শিক্ষক প্যানেল - ${user.displayName || "Mentor"}` : `Faculty Control Hub - ${user.displayName || "Mentor"}`}
          </h1>
          <p className="text-xs text-gray-400 font-mono">
            {isBn ? "কোর্সের ছবি, কভার, প্রাইস, শিক্ষার্থী এনরোলমেন্ট, লাইভ এক্সাম মার্কস ও নোটিশ নিয়ন্ত্রণ করুন" : "Manage course pictures, students enrollment, live exam marks entry, live classes, and notices"}
          </p>
        </div>

        {/* Selected Course Dropdown & Action */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-black/60 border border-white/10 p-3.5 rounded-2xl shrink-0 space-y-1 font-mono">
            <label className="text-[10px] text-gray-400 uppercase font-bold block">
              {isBn ? "সক্রিয় কোর্স নির্বাচন করুন:" : "Manage Course:"}
            </label>
            <select
              value={selectedCourseId}
              onChange={(e) => {
                setSelectedCourseId(e.target.value);
                const bList = batches.filter((b) => b.courseId === e.target.value);
                setSelectedBatchId(bList[0]?.id || "");
              }}
              className="bg-[#181818] text-white border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          {selectedCourse && (
            <button
              type="button"
              onClick={() => {
                playSound("click");
                setIsShareModalOpen(true);
              }}
              className="px-4 py-3.5 bg-[#FFD700]/15 hover:bg-[#FFD700]/25 text-[#FFD700] border border-[#FFD700]/40 rounded-2xl font-mono text-xs font-bold uppercase transition flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <Share2 className="w-4 h-4 text-[#FFD700]" />
              <span>{isBn ? "কোর্স লিংক শেয়ার" : "Share Course"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Real-time Image Optimization Banner */}
      {imageOptimizationStatus && (
        <div className="bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 px-6 py-3 rounded-2xl text-xs font-mono font-bold flex items-center justify-between shadow-lg animate-fade-in">
          <div className="flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-[#FFD700] animate-spin" />
            <span>{imageOptimizationStatus}</span>
          </div>
          <button
            onClick={() => setImageOptimizationStatus("")}
            className="text-emerald-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Save Error Alert Banner */}
      {saveError && (
        <div className="bg-red-950/90 border border-red-500/50 text-red-300 px-6 py-4 rounded-2xl text-xs font-mono font-bold flex items-center justify-between shadow-lg animate-fade-in">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{saveError}</span>
          </div>
          <button
            onClick={() => setSaveError("")}
            className="text-red-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Save Success Alert Banner */}
      {saveSuccessMessage && (
        <div className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 px-6 py-4 rounded-2xl text-xs font-mono font-bold flex items-center justify-between shadow-lg animate-fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>{saveSuccessMessage}</span>
          </div>
          <button
            onClick={() => setSaveSuccessMessage("")}
            className="text-emerald-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabs Row */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none font-mono text-xs font-bold uppercase border-b border-white/10 pb-4">
        {[
          { id: "overview", label: isBn ? "প্যানেল সামারি" : "Overview" },
          { id: "mistake_analytics", label: isBn ? "🚨 ঘন ঘন ভুল প্রশ্ন (Mistake Bank)" : "🚨 High Mistake Questions (Bank)" },
          { id: "students", label: isBn ? "👥 শিক্ষার্থী (ম্যানুয়াল অ্যাড)" : "👥 Students (Manual Add)" },
          { id: "exam_marks", label: isBn ? "🎯 এক্সাম মার্কস এন্ট্রি ও এডিট" : "🎯 Live Exam Marks Entry" },
          { id: "teachers", label: isBn ? "👨‍⚕️ কোর্স শিক্ষক মডুল" : "👨‍⚕️ Course Teachers & Details" },
          { id: "edit_course", label: isBn ? "🖼️ কোর্স ছবি ও ফ্রেম সাইজ" : "🖼️ Course Pictures & Frame Ratio" },
          { id: "payment_verification", label: isBn ? "💳 পেমেন্ট ভেরিফিকেশন" : "💳 Payment Verification" },
          { id: "store_stats", label: isBn ? "🎨 কোর্স পেজ ব্যানার ও টেক্সট" : "🎨 Course Page Banner & Texts" },
          { id: "add_exam", label: isBn ? "+ নতুন এক্সাম পোস্ট" : "+ Add Exam" },
          { id: "edit_exams", label: isBn ? "🔴 লাইভ এক্সাম ম্যানেজমেন্ট" : "🔴 Live Exam Management" },
          { id: "add_class", label: isBn ? "🎥 ক্লাস ম্যানেজমেন্ট (অ্যাড ও এডিট)" : "🎥 Classes (Add & Edit)" },
          { id: "add_material", label: isBn ? "📚 নোটস ও শিট (অ্যাড ও এডিট)" : "📚 Notes & Sheets (Add & Edit)" },
          { id: "add_announcement", label: isBn ? "+ নোটিশ পোস্ট" : "+ Post Notice" }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => {
              playSound("click");
              setActiveTab(t.id as any);
            }}
            className={`px-4 py-2.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
              activeTab === t.id
                ? "bg-[#C1121F] text-white shadow-[0_0_12px_rgba(193,18,31,0.4)]"
                : "bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT: HIGH-MISTAKE QUESTIONS ANALYTICS (Subject & Paper & Chapter Wise) */}
      {activeTab === "mistake_analytics" && (
        <TeacherMistakeAnalytics
          courses={courses}
          selectedCourseId={selectedCourseId}
          batches={batches}
          selectedBatchId={selectedBatchId}
          exams={exams}
          liveSubmissions={liveSubmissionsList}
          user={user}
          language={language}
          theme={theme}
          onCreateAnnouncement={onCreateAnnouncement}
          onSelectExam={(examId) => {
            setSelectedExamForMarksId(examId);
            setActiveTab("exam_marks");
          }}
        />
      )}

      {/* TAB CONTENT: TEACHERS */}
      {activeTab === "teachers" && (
        <TeacherManager
          courses={courses}
          user={user}
          language={language}
          theme={theme}
          onUpdateCourse={onUpdateCourse}
        />
      )}

      {/* TAB CONTENT: STUDENTS (MANUAL ENROLLMENT & MANAGEMENT) */}
      {activeTab === "students" && (
        <div className="space-y-6 font-mono text-xs">
          {/* Header & Stats */}
          <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h2 className="text-lg font-black text-white uppercase font-display flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#FFD700]" />
                  <span>
                    {isBn
                      ? "কোর্স শিক্ষার্থী ব্যবস্থাপনা ও ম্যানুয়াল এনরোলমেন্ট"
                      : "Course Students & Manual Enrollment"}
                  </span>
                </h2>
                <p className="text-gray-400 text-xs mt-1">
                  {isBn
                    ? "কোর্সে নতুন শিক্ষার্থীদের সরাসরি যুক্ত করুন এবং ব্যাচ ও এনরোলমেন্ট স্ট্যাটাস নিয়ন্ত্রণ করুন।"
                    : "Manually add students to this course and manage their batch access and enrollment validity."}
                </p>
              </div>

              <button
                onClick={() => {
                  playSound("click");
                  setIsAddStudentModalOpen(true);
                }}
                className="px-5 py-3 bg-[#C1121F] hover:bg-red-600 text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-[0_0_15px_rgba(193,18,31,0.5)] cursor-pointer flex items-center justify-center gap-2 shrink-0"
              >
                <UserPlus className="w-4 h-4 text-[#FFD700]" />
                <span>{isBn ? "+ শিক্ষার্থী যুক্ত করুন" : "+ MANUALLY ADD STUDENT"}</span>
              </button>
            </div>

            {/* Filter and Search Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-8 relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={studentSearchTerm}
                  onChange={(e) => setStudentSearchTerm(e.target.value)}
                  placeholder={
                    isBn
                      ? "শিক্ষার্থীর নাম, ইমেইল অথবা UID দিয়ে খুঁজুন..."
                      : "Search student by Name, Email, or UID..."
                  }
                  className="w-full bg-black/60 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-[#C1121F]"
                />
              </div>

              <div className="sm:col-span-4">
                <select
                  value={studentBatchFilter}
                  onChange={(e) => setStudentBatchFilter(e.target.value)}
                  className="w-full bg-black/60 text-white border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-[#C1121F]"
                >
                  <option value="All">{isBn ? "সকল ব্যাচ (All Batches)" : "All Batches"}</option>
                  {courseBatches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.batchName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Enrolled Students Table */}
          {(() => {
            const courseEnrolls = allEnrollments.filter((en) => {
              if (en.courseId !== selectedCourseId) return false;
              if (studentBatchFilter !== "All" && en.batchId !== studentBatchFilter) return false;
              if (studentSearchTerm.trim()) {
                const term = studentSearchTerm.toLowerCase();
                const matchName = (en.userDisplayName || "").toLowerCase().includes(term);
                const matchEmail = (en.userEmail || "").toLowerCase().includes(term);
                const matchUid = (en.userId || "").toLowerCase().includes(term);
                return matchName || matchEmail || matchUid;
              }
              return true;
            });

            return (
              <div className="bg-[#111111] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-4 bg-black/60 border-b border-white/10 flex items-center justify-between">
                  <span className="font-bold text-white uppercase text-xs flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-[#FFD700]" />
                    <span>{isBn ? "মোট এনরোল্ড শিক্ষার্থী:" : "Total Enrolled Students:"} {courseEnrolls.length}</span>
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {selectedCourse?.title}
                  </span>
                </div>

                {courseEnrolls.length === 0 ? (
                  <div className="p-12 text-center text-gray-400 space-y-3">
                    <Users className="w-10 h-10 text-gray-600 mx-auto" />
                    <p className="text-sm font-bold text-gray-300">
                      {isBn ? "কোনো শিক্ষার্থী পাওয়া যায়নি" : "No enrolled students found"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {isBn
                        ? "উপরের '+ শিক্ষার্থী যুক্ত করুন' বাটনে ক্লিক করে শিক্ষার্থী যোগ করুন।"
                        : "Click '+ MANUALLY ADD STUDENT' above to enroll a student."}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-black/80 border-b border-white/10 text-[#FFD700] uppercase text-[10px]">
                          <th className="p-4 font-bold">Student Aspirant</th>
                          <th className="p-4 font-bold">Enrolled Batch</th>
                          <th className="p-4 font-bold">Enrolled At</th>
                          <th className="p-4 font-bold">Expires At</th>
                          <th className="p-4 font-bold">Grant Type</th>
                          <th className="p-4 font-bold">Status</th>
                          <th className="p-4 font-bold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {courseEnrolls.map((en, enIdx) => {
                          const isExpired = en.expiresAt && new Date(en.expiresAt) < new Date();
                          return (
                            <tr key={`${en.id || en.userId || "enroll"}_${en.batchId || ""}_${enIdx}`} className="hover:bg-white/5 transition">
                              <td className="p-4">
                                <div className="font-bold text-white text-xs">
                                  {en.userDisplayName || "Aspirant"}
                                </div>
                                <div className="text-[10px] text-gray-400">{en.userEmail}</div>
                                <div className="text-[9px] text-gray-500 font-mono">
                                  UID: {en.userId}
                                </div>
                              </td>
                              <td className="p-4">
                                <span className="inline-block px-2.5 py-1 rounded bg-sky-500/10 text-sky-300 border border-sky-500/30 text-[10px] font-bold">
                                  {en.batchName || en.batchId}
                                </span>
                              </td>
                              <td className="p-4 text-gray-300 text-[11px]">
                                {en.enrolledAt ? new Date(en.enrolledAt).toLocaleDateString() : "N/A"}
                              </td>
                              <td className="p-4 text-[11px]">
                                <span className={isExpired ? "text-red-400 font-bold" : "text-emerald-400 font-bold"}>
                                  {en.expiresAt ? new Date(en.expiresAt).toLocaleDateString() : "Lifetime"}
                                </span>
                              </td>
                              <td className="p-4">
                                {en.manuallyAddedByTeacher ? (
                                  <span className="px-2 py-0.5 rounded bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/30 text-[10px] font-bold">
                                    Teacher Manual
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                                    Online Payment
                                  </span>
                                )}
                              </td>
                              <td className="p-4">
                                <span
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                    isExpired
                                      ? "bg-red-950 text-red-400 border border-red-500/40"
                                      : "bg-emerald-950 text-emerald-400 border border-emerald-500/40"
                                  }`}
                                >
                                  {isExpired ? "Expired" : en.status || "Active"}
                                </span>
                              </td>
                              <td className="p-4 text-right">
                                <button
                                  onClick={() => handleRemoveEnrollment(en.id, en.userDisplayName || en.userEmail)}
                                  className="p-2 bg-red-950/60 hover:bg-red-900 text-red-400 border border-red-500/30 rounded-lg transition cursor-pointer"
                                  title={isBn ? "এনরোলমেন্ট মুছে ফেলুন" : "Remove enrollment"}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Modal: Manually Add Student to Course */}
          {isAddStudentModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#141414] border border-white/20 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl relative font-sans"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-[#C1121F]/20 text-[#C1121F] border border-[#C1121F]/30">
                      <UserPlus className="w-5 h-5 text-[#FFD700]" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white uppercase font-display">
                        {isBn ? "কোর্সে শিক্ষার্থী যুক্ত করুন" : "MANUALLY ENROLL STUDENT"}
                      </h3>
                      <p className="text-[11px] text-gray-400 font-mono">{selectedCourse?.title}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsAddStudentModalOpen(false)}
                    className="text-gray-400 hover:text-white text-lg font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleManualAddStudent} className="space-y-4 text-xs font-mono">
                  {/* Select from Existing App Users */}
                  <div className="space-y-1.5">
                    <label className="text-gray-300 font-bold uppercase block">
                      {isBn ? "নিবন্ধিত ব্যবহারকারী তালিকা থেকে নির্বাচন (ঐচ্ছিক):" : "Select from Registered Users (Optional):"}
                    </label>
                    <select
                      value={manualStudentUid}
                      onChange={(e) => {
                        const uid = e.target.value;
                        setManualStudentUid(uid);
                        const found = allUsersList.find((u) => u.uid === uid);
                        if (found) {
                          setManualStudentName(found.displayName || "");
                          setManualStudentEmail(found.email || "");
                        }
                      }}
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#FFD700]"
                    >
                      <option value="">{isBn ? "-- বিদ্যমান ছাত্র নির্বাচন করুন --" : "-- Pick existing user --"}</option>
                      {allUsersList.map((u, uIdx) => (
                        <option key={`${u.uid || u.id || "user"}_${uIdx}`} value={u.uid}>
                          {u.displayName || "Aspirant"} ({u.email || u.uid})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-gray-300 font-bold uppercase block">
                      {isBn ? "শিক্ষার্থীর নাম:" : "Student Full Name:"}
                    </label>
                    <input
                      type="text"
                      required
                      value={manualStudentName}
                      onChange={(e) => setManualStudentName(e.target.value)}
                      placeholder="e.g. Tanvir Ahmed Rifat"
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#C1121F]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-gray-300 font-bold uppercase block">
                      {isBn ? "শিক্ষার্থীর ইমেইল:" : "Student Email Address:"}
                    </label>
                    <input
                      type="email"
                      required
                      value={manualStudentEmail}
                      onChange={(e) => setManualStudentEmail(e.target.value)}
                      placeholder="student@gmail.com"
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#C1121F]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-gray-300 font-bold uppercase block">
                        {isBn ? "ব্যাচ:" : "Assign Batch:"}
                      </label>
                      <select
                        value={manualStudentBatchId || selectedBatchId}
                        onChange={(e) => setManualStudentBatchId(e.target.value)}
                        className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2.5 text-white focus:outline-none"
                      >
                        {courseBatches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.batchName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-gray-300 font-bold uppercase block">
                        {isBn ? "ভ্যালিডিটি:" : "Access Validity:"}
                      </label>
                      <select
                        value={manualStudentExpiryMonths}
                        onChange={(e) => setManualStudentExpiryMonths(Number(e.target.value))}
                        className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2.5 text-white focus:outline-none"
                      >
                        <option value={1}>1 Month</option>
                        <option value={3}>3 Months</option>
                        <option value={6}>6 Months</option>
                        <option value={12}>12 Months (1 Year)</option>
                        <option value={24}>24 Months (2 Years)</option>
                        <option value={60}>Lifetime Access</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddStudentModalOpen(false)}
                      className="flex-1 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-gray-300 font-bold transition cursor-pointer"
                    >
                      {isBn ? "বাতিল" : "Cancel"}
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-[#C1121F] hover:bg-red-600 text-white font-black uppercase rounded-xl transition shadow-[0_0_15px_rgba(193,18,31,0.5)] cursor-pointer"
                    >
                      {isBn ? "ভর্তি কনফার্ম করুন ✓" : "ENROLL STUDENT ✓"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: LIVE EXAM MARKS ENTRY & EDIT (EVEN IF STUDENT DID NOT TAKE LIVE EXAM ONLINE) */}
      {activeTab === "exam_marks" && (
        <div className="space-y-6 font-mono text-xs">
          {/* Exam Selector and Header */}
          <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h2 className="text-lg font-black text-white uppercase font-display flex items-center gap-2">
                  <Target className="w-5 h-5 text-[#FFD700]" />
                  <span>
                    {isBn
                      ? "লাইভ এক্সাম মার্কস প্রদান, সংশোধন ও অফলাইন মূল্যায়ন"
                      : "Live Exam Marks Entry, Edit & Offline Scoring"}
                  </span>
                </h2>
                <p className="text-gray-400 text-xs mt-1">
                  {isBn
                    ? "অনলাইনে পরীক্ষা না দেওয়া বা ওএমআর শিটের অফলাইন শিক্ষার্থীদের মার্কস এন্ট্রি ও এডিট করুন।"
                    : "Enter and edit exam marks for any enrolled student, including offline OMR candidates."}
                </p>
              </div>

              {/* Exam Picker Dropdown */}
              <div className="flex items-center gap-2 bg-black/60 p-2 rounded-2xl border border-white/10">
                <label className="text-[10px] text-gray-400 uppercase font-bold pl-2">
                  {isBn ? "এক্সাম:" : "Select Exam:"}
                </label>
                <select
                  value={selectedExamForMarksId || (exams.filter(e => e.courseId === selectedCourseId)[0]?.id || "")}
                  onChange={(e) => setSelectedExamForMarksId(e.target.value)}
                  className="bg-[#181818] text-white border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#FFD700]"
                >
                  {exams
                    .filter((e) => e.courseId === selectedCourseId)
                    .map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.title} ({ex.totalQuestions || 100} Qs)
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Filter and Search */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-8 relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={marksSearchTerm}
                  onChange={(e) => setMarksSearchTerm(e.target.value)}
                  placeholder={
                    isBn
                      ? "শিক্ষার্থীর নাম অথবা ইমেইল দিয়ে মার্কস সার্চ করুন..."
                      : "Search by student name or email..."
                  }
                  className="w-full bg-black/60 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-[#C1121F]"
                />
              </div>

              <div className="sm:col-span-4 flex items-center gap-1.5 bg-black/60 p-1.5 rounded-xl border border-white/10">
                {(["All", "Evaluated", "Pending"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      playSound("click");
                      setMarksFilterStatus(st);
                    }}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition text-center cursor-pointer ${
                      marksFilterStatus === st
                        ? "bg-[#C1121F] text-white"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    {st === "All" ? (isBn ? "সকল" : "All") : st === "Evaluated" ? (isBn ? "মার্কসপ্রাপ্ত" : "Graded") : (isBn ? "বাকি/অংশ নেয়নি" : "Unattempted")}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Candidates Evaluation Table */}
          {(() => {
            const courseExamsList = exams.filter((e) => e.courseId === selectedCourseId);
            const activeExamTarget =
              courseExamsList.find((e) => e.id === selectedExamForMarksId) ||
              courseExamsList[0];

            if (!activeExamTarget) {
              return (
                <div className="p-12 text-center text-gray-400 bg-[#111111] border border-white/10 rounded-2xl space-y-3">
                  <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
                  <p className="text-sm font-bold text-gray-300">
                    {isBn ? "এই কোর্সের কোনো এক্সাম তৈরি করা হয়নি।" : "No exam found for this course."}
                  </p>
                  <button
                    onClick={() => setActiveTab("add_exam")}
                    className="px-4 py-2 bg-[#C1121F] text-white rounded-xl font-bold uppercase"
                  >
                    {isBn ? "+ নতুন এক্সাম তৈরি করুন" : "+ Create Exam"}
                  </button>
                </div>
              );
            }

            // Get all enrolled students for this course (deduplicated by userId)
            const enrolledStudents = allEnrollments.filter((en) => en.courseId === selectedCourseId);
            const seenStudentUids = new Set<string>();
            const uniqueEnrolledStudents = enrolledStudents.filter((en) => {
              const uid = en.userId || en.id;
              if (!uid) return true;
              if (seenStudentUids.has(uid)) return false;
              seenStudentUids.add(uid);
              return true;
            });

            // Filter and match with live exam submissions
            const candidateRows = uniqueEnrolledStudents
              .map((en) => {
                const sub = liveSubmissionsList.find(
                  (s) => s.examId === activeExamTarget.id && s.userId === en.userId
                );
                return {
                  enrollment: en,
                  submission: sub,
                  hasSubmitted: !!sub,
                  userId: en.userId,
                  studentName: en.userDisplayName || "Aspirant",
                  studentEmail: en.userEmail || "",
                  score: sub?.score !== undefined ? sub.score : null,
                  rank: sub?.rank,
                  correct: sub?.correctCount,
                  wrong: sub?.wrongCount,
                  skipped: sub?.skippedCount,
                  accuracy: sub?.accuracy,
                  remarks: sub?.adminRemarks || (sub ? "Online Submission" : "Did not take online exam"),
                  evaluatedByTeacher: sub?.evaluatedByTeacher
                };
              })
              .filter((c) => {
                if (marksFilterStatus === "Evaluated" && !c.hasSubmitted) return false;
                if (marksFilterStatus === "Pending" && c.hasSubmitted) return false;
                if (marksSearchTerm.trim()) {
                  const t = marksSearchTerm.toLowerCase();
                  return (
                    (c.studentName || "").toLowerCase().includes(t) ||
                    (c.studentEmail || "").toLowerCase().includes(t)
                  );
                }
                return true;
              });

            return (
              <div className="bg-[#111111] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-4 bg-black/60 border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white uppercase text-xs">
                      {activeExamTarget.title} ({activeExamTarget.totalQuestions || 100} Marks)
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/30 text-[10px] font-bold">
                      {activeExamTarget.subject}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-gray-400">
                    <span>
                      {isBn ? "মূল্যায়নকৃত:" : "Evaluated:"} <strong className="text-emerald-400">{candidateRows.filter(r => r.hasSubmitted).length}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      {isBn ? "অনুপস্থিত/বাকি:" : "Pending/Offline:"} <strong className="text-amber-400">{candidateRows.filter(r => !r.hasSubmitted).length}</strong>
                    </span>
                  </div>
                </div>

                {candidateRows.length === 0 ? (
                  <div className="p-12 text-center text-gray-400 space-y-3">
                    <Users className="w-10 h-10 text-gray-600 mx-auto" />
                    <p className="text-sm font-bold text-gray-300">
                      {isBn ? "কোনো শিক্ষার্থী পাওয়া যায়নি" : "No candidates found"}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-black/80 border-b border-white/10 text-[#FFD700] uppercase text-[10px]">
                          <th className="p-4 font-bold">Student Aspirant</th>
                          <th className="p-4 font-bold">Exam Status</th>
                          <th className="p-4 font-bold">Net Score</th>
                          <th className="p-4 font-bold">Correct / Wrong</th>
                          <th className="p-4 font-bold">Merit Rank</th>
                          <th className="p-4 font-bold">Remarks & Mode</th>
                          <th className="p-4 font-bold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {candidateRows.map((cand, candIdx) => (
                          <tr key={`${cand.userId || "cand"}_${cand.enrollment?.id || candIdx}`} className="hover:bg-white/5 transition">
                            <td className="p-4">
                              <div className="font-bold text-white text-xs">{cand.studentName}</div>
                              <div className="text-[10px] text-gray-400">{cand.studentEmail}</div>
                              <div className="text-[9px] text-gray-500 font-mono">{cand.enrollment?.batchName}</div>
                            </td>

                            <td className="p-4">
                              {cand.hasSubmitted ? (
                                cand.evaluatedByTeacher ? (
                                  <span className="px-2.5 py-1 rounded bg-[#FFD700]/15 text-[#FFD700] border border-[#FFD700]/40 text-[10px] font-bold">
                                    ✍️ Teacher Entered
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                                    ✅ Online Live Exam
                                  </span>
                                )
                              ) : (
                                <span className="px-2.5 py-1 rounded bg-amber-950/60 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                                  ❌ Not Attempted Online / Offline
                                </span>
                              )}
                            </td>

                            <td className="p-4">
                              {cand.score !== null ? (
                                <span className="text-sm font-extrabold text-white">
                                  {cand.score} <span className="text-gray-500 text-xs font-normal">/ {activeExamTarget.totalQuestions || 100}</span>
                                </span>
                              ) : (
                                <span className="text-gray-500 italic text-xs">Not Entered</span>
                              )}
                            </td>

                            <td className="p-4 text-xs">
                              {cand.hasSubmitted ? (
                                <div className="space-x-1 font-mono">
                                  <span className="text-emerald-400 font-bold">+{cand.correct || 0}</span>
                                  <span className="text-gray-500">/</span>
                                  <span className="text-red-400 font-bold">-{cand.wrong || 0}</span>
                                </div>
                              ) : (
                                <span className="text-gray-500 text-[11px]">-</span>
                              )}
                            </td>

                            <td className="p-4">
                              {cand.rank ? (
                                <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/30 font-bold text-[10px]">
                                  Rank #{cand.rank}
                                </span>
                              ) : (
                                <span className="text-gray-500 text-[10px]">Pending</span>
                              )}
                            </td>

                            <td className="p-4 text-[11px] text-gray-300 max-w-xs truncate">
                              {cand.remarks}
                            </td>

                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    playSound("click");
                                    setCurrentMarkEditing({
                                      submissionId: cand.submission?.id,
                                      studentUid: cand.userId,
                                      studentName: cand.studentName,
                                      studentEmail: cand.studentEmail,
                                      examId: activeExamTarget.id,
                                      examTitle: activeExamTarget.title,
                                      batchId: cand.enrollment?.batchId || selectedBatchId,
                                      totalMarks: activeExamTarget.totalQuestions || 100,
                                      correctCount: cand.correct || 0,
                                      wrongCount: cand.wrong || 0,
                                      skippedCount: cand.skipped || 0,
                                      score: cand.score !== null ? cand.score : 0,
                                      rank: cand.rank || 1,
                                      adminRemarks: cand.remarks || "Evaluated by Teacher",
                                      evaluatedByTeacher: true
                                    });
                                    setIsExamMarksModalOpen(true);
                                  }}
                                  className="px-3 py-1.5 bg-[#C1121F] hover:bg-red-600 text-white rounded-lg font-bold text-[11px] transition cursor-pointer flex items-center gap-1"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                  <span>{cand.hasSubmitted ? (isBn ? "মার্কস এডিট" : "Edit Marks") : (isBn ? "মার্কস দিন" : "Input Marks")}</span>
                                </button>

                                {cand.submission?.id && (
                                  <button
                                    onClick={() => handleDeleteExamMarks(cand.submission.id, cand.studentName)}
                                    className="p-1.5 bg-red-950/60 hover:bg-red-900 text-red-400 border border-red-500/30 rounded-lg transition cursor-pointer"
                                    title="Delete marks"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Modal: Input / Edit Marks */}
          {isExamMarksModalOpen && currentMarkEditing && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#141414] border border-white/20 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl relative font-sans"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-[#C1121F]/20 text-[#C1121F] border border-[#C1121F]/30">
                      <Target className="w-5 h-5 text-[#FFD700]" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white uppercase font-display">
                        {isBn ? "পরীক্ষার মার্কস এন্ট্রি ও সংশোধন" : "INPUT / EDIT EXAM MARKS"}
                      </h3>
                      <p className="text-[11px] text-gray-400 font-mono">{currentMarkEditing.examTitle}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setIsExamMarksModalOpen(false);
                      setCurrentMarkEditing(null);
                    }}
                    className="text-gray-400 hover:text-white text-lg font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSaveExamMarks} className="space-y-4 text-xs font-mono">
                  {/* Candidate Info */}
                  <div className="bg-black/50 p-3.5 rounded-xl border border-white/10 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-400">{isBn ? "শিক্ষার্থী:" : "Student Name:"}</span>
                      <span className="font-bold text-white">{currentMarkEditing.studentName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">{isBn ? "ইমেইল:" : "Email:"}</span>
                      <span className="font-bold text-sky-400">{currentMarkEditing.studentEmail}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-emerald-400 font-bold uppercase block">
                        {isBn ? "সঠিক (Correct):" : "Correct:"}
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={currentMarkEditing.totalMarks}
                        value={currentMarkEditing.correctCount}
                        onChange={(e) => {
                          const corr = Number(e.target.value);
                          const calcScore = Math.max(
                            0,
                            Number((corr - (currentMarkEditing.wrongCount || 0) * 0.25).toFixed(2))
                          );
                          setCurrentMarkEditing((prev: any) => ({
                            ...prev,
                            correctCount: corr,
                            score: calcScore,
                            skippedCount: Math.max(0, prev.totalMarks - (corr + prev.wrongCount))
                          }));
                        }}
                        className="w-full bg-black/60 border border-emerald-500/40 rounded-xl px-3 py-2.5 text-white font-bold focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-red-400 font-bold uppercase block">
                        {isBn ? "ভুল (Wrong):" : "Wrong:"}
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={currentMarkEditing.totalMarks}
                        value={currentMarkEditing.wrongCount}
                        onChange={(e) => {
                          const wr = Number(e.target.value);
                          const calcScore = Math.max(
                            0,
                            Number(((currentMarkEditing.correctCount || 0) - wr * 0.25).toFixed(2))
                          );
                          setCurrentMarkEditing((prev: any) => ({
                            ...prev,
                            wrongCount: wr,
                            score: calcScore,
                            skippedCount: Math.max(0, prev.totalMarks - (prev.correctCount + wr))
                          }));
                        }}
                        className="w-full bg-black/60 border border-red-500/40 rounded-xl px-3 py-2.5 text-white font-bold focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-gray-400 font-bold uppercase block">
                        {isBn ? "বাকি (Skipped):" : "Skipped:"}
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={currentMarkEditing.skippedCount}
                        onChange={(e) =>
                          setCurrentMarkEditing((prev: any) => ({
                            ...prev,
                            skippedCount: Number(e.target.value)
                          }))
                        }
                        className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2.5 text-white font-bold focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[#FFD700] font-bold uppercase block">
                        {isBn ? "ফাইনাল নেট স্কোর (Score):" : "Final Net Score:"}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={currentMarkEditing.score}
                        onChange={(e) =>
                          setCurrentMarkEditing((prev: any) => ({
                            ...prev,
                            score: Number(e.target.value)
                          }))
                        }
                        className="w-full bg-black/60 border border-[#FFD700]/50 rounded-xl px-4 py-2.5 text-white font-black text-sm focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-purple-400 font-bold uppercase block">
                        {isBn ? "মেধা স্থান (Rank):" : "Merit Rank:"}
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={currentMarkEditing.rank}
                        onChange={(e) =>
                          setCurrentMarkEditing((prev: any) => ({
                            ...prev,
                            rank: Number(e.target.value)
                          }))
                        }
                        className="w-full bg-black/60 border border-purple-500/40 rounded-xl px-4 py-2.5 text-white font-bold focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-gray-300 font-bold uppercase block">
                      {isBn ? "শিক্ষকের মন্তব্য / নোট (Remarks):" : "Faculty Remarks / Evaluation Note:"}
                    </label>
                    <input
                      type="text"
                      value={currentMarkEditing.adminRemarks}
                      onChange={(e) =>
                        setCurrentMarkEditing((prev: any) => ({
                          ...prev,
                          adminRemarks: e.target.value
                        }))
                      }
                      placeholder={isBn ? "যেমন: অফলাইন ওএমআর শিট থেকে মূল্যায়নকৃত" : "e.g. Evaluated from offline medical OMR sheet"}
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#C1121F]"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsExamMarksModalOpen(false);
                        setCurrentMarkEditing(null);
                      }}
                      className="flex-1 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-gray-300 font-bold transition cursor-pointer"
                    >
                      {isBn ? "বাতিল" : "Cancel"}
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-[#C1121F] hover:bg-red-600 text-white font-black uppercase rounded-xl transition shadow-[0_0_15px_rgba(193,18,31,0.5)] cursor-pointer"
                    >
                      {isBn ? "মার্কস সেভ করুন ✓" : "SAVE EXAM MARKS ✓"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Quick Mistake Analytics Action Banner */}
          <div className="bg-gradient-to-r from-red-950/60 via-[#18080A] to-black border border-red-500/40 rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 shrink-0">
                <AlertCircle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h4 className="text-base font-black text-white uppercase font-display flex items-center gap-2">
                  <span>{isBn ? "🚨 ঘন ঘন ভুল হওয়া প্রশ্নসমূহ (Mistake Bank)" : "🚨 High-Mistake Exam Questions Bank"}</span>
                  <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 text-[10px] font-mono font-bold">
                    HOT
                  </span>
                </h4>
                <p className="text-xs text-gray-300 mt-1 max-w-2xl font-sans">
                  {isBn
                    ? "কোর্সের বিভিন্ন পরীক্ষায় শিক্ষার্থীরা যে যে প্রশ্নে বেশি ভুল করেছে তা বিষয় (Subject), পত্র (Paper) এবং অধ্যায় (Chapter) ভিত্তিক আলাদাভাবে সাজানো আছে।"
                    : "Diagnose student exam mistakes categorized by Subject, 1st & 2nd Paper, and Chapter to plan focused revision classes."}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                playSound("click");
                setActiveTab("mistake_analytics");
              }}
              className="px-5 py-3 bg-[#C1121F] hover:bg-red-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-[0_0_15px_rgba(193,18,31,0.5)] cursor-pointer flex items-center gap-2 shrink-0"
            >
              <span>{isBn ? "ভুল হওয়া প্রশ্ন দেখুন →" : "Explore Mistake Bank →"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 font-mono text-center">
            <div className="bg-[#111111] p-5 rounded-2xl border border-white/10">
              <span className="text-gray-400 text-xs block uppercase">Exams Published</span>
              <span className="text-2xl font-black text-[#FFD700]">{exams.length}</span>
            </div>
            <div className="bg-[#111111] p-5 rounded-2xl border border-white/10">
              <span className="text-gray-400 text-xs block uppercase">Classes Conducted</span>
              <span className="text-2xl font-black text-emerald-400">{classes.length}</span>
            </div>
            <div className="bg-[#111111] p-5 rounded-2xl border border-white/10">
              <span className="text-gray-400 text-xs block uppercase">Notes Uploaded</span>
              <span className="text-2xl font-black text-sky-400">{materials.length}</span>
            </div>
            <div className="bg-[#111111] p-5 rounded-2xl border border-white/10 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-xs block uppercase">Active Enrolled</span>
                <button
                  type="button"
                  onClick={() => {
                    playSound("click");
                    setActiveTab("edit_course");
                  }}
                  className="text-[10px] text-[#FFD700] hover:text-amber-300 flex items-center gap-1 font-bold underline cursor-pointer"
                  title="Edit Enrolled Count"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>{isBn ? "এডিট" : "Edit"}</span>
                </button>
              </div>
              <div className="mt-1">
                <span className="text-2xl font-black text-purple-400 font-mono">
                  {(selectedCourse?.totalEnrolled !== undefined ? selectedCourse.totalEnrolled : 1420).toLocaleString("en-US")}
                </span>
                <span className="text-[11px] text-gray-400 ml-1.5 font-sans">{isBn ? "জন পরীক্ষার্থী" : "Aspirants"}</span>
              </div>
            </div>
          </div>

          <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-extrabold text-white uppercase font-display">
                {selectedCourse?.title} - Published Resources & Overview
              </h3>
              <button
                onClick={() => setActiveTab("edit_course")}
                className="px-3.5 py-1.5 bg-[#C1121F] text-white text-xs font-mono font-bold rounded-xl flex items-center gap-1.5 hover:bg-red-700 transition"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isBn ? "কোর্সের তথ্য ও ছবি এডিট করুন" : "Edit Details & Pictures"}</span>
              </button>
            </div>

            {/* Quick Banner & Thumbnail Preview */}
            {selectedCourse && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="bg-black/40 p-4 rounded-xl border border-white/5 space-y-2">
                  <span className="text-[11px] font-mono font-bold text-gray-400 uppercase block">Course Thumbnail Photo</span>
                  <img
                    src={selectedCourse.thumbnail}
                    alt={selectedCourse.title}
                    className="w-full h-36 object-cover rounded-xl border border-white/10"
                  />
                </div>
                <div className="bg-black/40 p-4 rounded-xl border border-white/5 space-y-2">
                  <span className="text-[11px] font-mono font-bold text-gray-400 uppercase block">Course Banner Header Photo</span>
                  <img
                    src={selectedCourse.banner || selectedCourse.thumbnail}
                    alt={selectedCourse.title}
                    className="w-full h-36 object-cover rounded-xl border border-white/10"
                  />
                </div>
              </div>
            )}

            <div className="space-y-3 font-sans text-xs pt-4">
              {exams.map((ex) => (
                <div key={ex.id} className="p-3.5 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">{ex.title}</span>
                    <span className="text-[10px] text-gray-400 font-mono">{ex.subject} • {ex.totalQuestions} Questions • {ex.durationMinutes} mins</span>
                  </div>
                  <span className="text-emerald-400 font-mono font-bold">PUBLISHED</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: STORE BANNER & TEXTS CONTROL */}
      {activeTab === "store_stats" && (
        <form onSubmit={handleSaveStoreStats} className="bg-[#111111] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6 font-mono">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded bg-[#C1121F]/20 text-[#FFD700] text-[10px] font-bold uppercase border border-[#C1121F]/30">
                  {isBn ? "কোর্স স্টোর কাস্টমাইজেশন" : "Course Store Customization"}
                </span>
                <span className="px-2.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[10px] font-bold uppercase border border-emerald-500/30">
                  {isBn ? "লাইভ সিনক্রোনাইজেশন" : "Live Firestore Sync"}
                </span>
              </div>
              <h2 className="text-lg font-black text-white uppercase font-display flex items-center gap-2 mt-1">
                <Sparkles className="w-5 h-5 text-[#FFD700]" />
                <span>{isBn ? "কোর্স পেজ ব্যানার ও টেক্সট কন্ট্রোল প্যানেল" : "Course Page Header & Banner Content Hub"}</span>
              </h2>
              <p className="text-xs text-gray-400">
                {isBn ? "কোর্স পেজের শীর্ষ ব্যানার টাইটেল, ব্যাজ, বিবরণী ও ডানপাশের স্ট্যাট কার্ডের লেখা পরিবর্তন করুন" : "Customize top banner badge, titles, description, and right stat card displayed on the courses page"}
              </p>
            </div>
            
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleResetStoreStatsDefault}
                className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-bold text-xs uppercase rounded-xl transition flex items-center gap-1.5 border border-white/10 cursor-pointer"
                title={isBn ? "ডিফল্ট টেক্সট রিস্টোর করুন" : "Reset to defaults"}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{isBn ? "ডিফল্ট টেক্সট" : "Defaults"}</span>
              </button>

              <button
                type="submit"
                className="px-6 py-2.5 bg-[#C1121F] hover:bg-red-700 text-white font-bold text-xs uppercase rounded-xl transition flex items-center gap-2 shadow-[0_0_15px_rgba(193,18,31,0.4)] cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isBn ? "পরিবর্তন সেভ করুন" : "Save All Changes"}</span>
              </button>
            </div>
          </div>

          {/* Interactive Live Preview Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#FFD700] uppercase tracking-wider flex items-center gap-2">
                <Eye className="w-4 h-4" />
                <span>{isBn ? "লাইভ ব্যানার প্রিভিউ (Live Student View Preview):" : "Live Header Banner Preview:"}</span>
              </span>

              <div className="flex items-center gap-1 bg-black/60 p-1 rounded-lg border border-white/10 text-[10px]">
                <button
                  type="button"
                  onClick={() => setBannerPreviewLang("bn")}
                  className={`px-2.5 py-1 rounded transition ${bannerPreviewLang === "bn" ? "bg-[#C1121F] text-white font-bold" : "text-gray-400 hover:text-white"}`}
                >
                  বাংলা প্রিভিউ
                </button>
                <button
                  type="button"
                  onClick={() => setBannerPreviewLang("en")}
                  className={`px-2.5 py-1 rounded transition ${bannerPreviewLang === "en" ? "bg-[#C1121F] text-white font-bold" : "text-gray-400 hover:text-white"}`}
                >
                  English Preview
                </button>
              </div>
            </div>

            {/* Preview Banner Container */}
            <div className="relative overflow-hidden rounded-2xl p-5 sm:p-7 border bg-gradient-to-r from-[#18080A] via-[#0F0D15] to-[#0A0A0A] border-red-900/40 shadow-[0_10px_30px_rgba(193,18,31,0.2)]">
              <div className="absolute -top-10 -right-10 w-48 h-48 bg-[#C1121F]/20 rounded-full blur-3xl pointer-events-none" />
              
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-2 max-w-xl">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#C1121F]/20 border border-[#C1121F]/40 text-[#FFD700] text-[10px] sm:text-xs font-mono font-bold uppercase tracking-widest">
                    <Sparkles className="w-3 h-3 text-[#FFD700] animate-pulse" />
                    <span>
                      {bannerPreviewLang === "bn"
                        ? (storeBadgeBnInput || "মেডিকেল ভর্তি প্রস্তুতি প্ল্যাটফর্ম")
                        : (storeBadgeEnInput || "MAT ADMISSION COURSES")}
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-2xl font-extrabold uppercase tracking-tight font-display text-white">
                    {bannerPreviewLang === "bn"
                      ? (storeTitleBnInput || "সকল স্পেশাল এক্সাম ব্যাচ ও কোর্সসমূহ")
                      : (storeTitleEnInput || "Premium Exam Batches & Courses")}
                  </h3>

                  <p className="text-[11px] sm:text-xs text-gray-300 leading-relaxed font-sans">
                    {bannerPreviewLang === "bn"
                      ? (storeDescBnInput || "ড. আবুল হাসান, হাজারী নাগ ও ইসহাক স্যারের বই ভিত্তিক হাই-ইয়েল্ড পরীক্ষা...")
                      : (storeDescEnInput || "Standard textbook-oriented exams, live interactive classes...")}
                  </p>
                </div>

                {storeShowStatBoxInput && (
                  <div className="flex items-center gap-2.5 bg-black/60 backdrop-blur-md border border-white/15 px-3.5 py-2.5 rounded-xl shrink-0 self-start md:self-center shadow-lg">
                    <div className="p-2 bg-[#C1121F]/20 border border-[#C1121F]/30 rounded-lg text-[#FFD700]">
                      {storeStatIconInput === "users" && <Users className="w-5 h-5" />}
                      {storeStatIconInput === "sparkles" && <Sparkles className="w-5 h-5" />}
                      {storeStatIconInput === "star" && <Star className="w-5 h-5" />}
                      {storeStatIconInput === "graduation" && <GraduationCap className="w-5 h-5" />}
                      {storeStatIconInput === "target" && <Target className="w-5 h-5" />}
                      {(!storeStatIconInput || storeStatIconInput === "award") && <Award className="w-5 h-5" />}
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-gray-400 block font-medium">
                        {bannerPreviewLang === "bn"
                          ? (storeStatLabelBnInput || "এনরোল্ড শিক্ষার্থী")
                          : (storeStatLabelEnInput || "Enrolled Aspirants")}
                      </span>
                      <span className="text-sm font-black text-white font-mono leading-tight tracking-wide">
                        {storeEnrolledCountInput || "৫,১২০+ Aspirants"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Form Controls 1: Top Badge & Main Heading */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-black/40 p-5 rounded-2xl border border-white/10">
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-2">
                <span>🏷️ ব্যানার ব্যাজ টেক্সট (Top Badge Tag)</span>
              </h4>
              
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-300 block">
                  বাংলা ব্যাজ টেক্সট (Bengali):
                </label>
                <input
                  type="text"
                  value={storeBadgeBnInput}
                  onChange={(e) => setStoreBadgeBnInput(e.target.value)}
                  placeholder="মেডিকেল ভর্তি প্রস্তুতি প্ল্যাটফর্ম"
                  className="w-full bg-[#181818] border border-white/15 focus:border-[#FFD700] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none font-sans"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-300 block">
                  ইংরেজি ব্যাজ টেক্সট (English):
                </label>
                <input
                  type="text"
                  value={storeBadgeEnInput}
                  onChange={(e) => setStoreBadgeEnInput(e.target.value)}
                  placeholder="MAT ADMISSION COURSES"
                  className="w-full bg-[#181818] border border-white/15 focus:border-[#FFD700] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none font-sans"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-2">
                <span>📢 প্রধান শিরোনাম (Main Heading Title)</span>
              </h4>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-300 block">
                  বাংলা প্রধান শিরোনাম (Bengali Title):
                </label>
                <input
                  type="text"
                  value={storeTitleBnInput}
                  onChange={(e) => setStoreTitleBnInput(e.target.value)}
                  placeholder="সকল স্পেশাল এক্সাম ব্যাচ ও কোর্সসমূহ"
                  className="w-full bg-[#181818] border border-white/15 focus:border-[#FFD700] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none font-sans font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-300 block">
                  ইংরেজি প্রধান শিরোনাম (English Title):
                </label>
                <input
                  type="text"
                  value={storeTitleEnInput}
                  onChange={(e) => setStoreTitleEnInput(e.target.value)}
                  placeholder="Premium Exam Batches & Courses"
                  className="w-full bg-[#181818] border border-white/15 focus:border-[#FFD700] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none font-sans font-bold"
                />
              </div>
            </div>
          </div>

          {/* Form Controls 2: Detailed Subtitle / Description */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-black/40 p-5 rounded-2xl border border-white/10">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-300 block">
                {isBn ? "ব্যানার বাংলা বিবরণী (Bengali Subtitle / Description):" : "Bengali Banner Description:"}
              </label>
              <textarea
                rows={3}
                value={storeDescBnInput}
                onChange={(e) => setStoreDescBnInput(e.target.value)}
                placeholder="ড. আবুল হাসান, হাজারী নাগ ও ইসহাক স্যারের বই ভিত্তিক হাই-ইয়েল্ড পরীক্ষা, লাইভ ক্লাস, বিস্তারিত এআই এনালাইসিস ও মিসটেক ব্যাংকের মাধ্যমে আপনার কাঙ্ক্ষিত মেডিকেল সিট নিশ্চিত করুন।"
                className="w-full bg-[#181818] border border-white/15 focus:border-[#FFD700] rounded-xl p-3 text-xs text-white focus:outline-none font-sans leading-relaxed resize-none"
              />
              <span className="text-[10px] text-gray-500 block">
                {isBn ? "শিক্ষার্থীদের জন্য মূল আকর্ষণ ও সুবিধার সারাংশ।" : "Concise summary displayed right below the main heading."}
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-300 block">
                {isBn ? "ব্যানার ইংরেজি বিবরণী (English Subtitle / Description):" : "English Banner Description:"}
              </label>
              <textarea
                rows={3}
                value={storeDescEnInput}
                onChange={(e) => setStoreDescEnInput(e.target.value)}
                placeholder="Standard textbook-oriented exams, live interactive classes, instant mistake bank, and nationwide batch leaderboards."
                className="w-full bg-[#181818] border border-white/15 focus:border-[#FFD700] rounded-xl p-3 text-xs text-white focus:outline-none font-sans leading-relaxed resize-none"
              />
              <span className="text-[10px] text-gray-500 block">
                {isBn ? "ইংরেজি ভাষায় অ্যাপ ব্যবহারকারীদের জন্য প্রদর্শিত হবে।" : "Shown when English language is active."}
              </span>
            </div>
          </div>

          {/* Form Controls 3: Right Stat Box Settings */}
          <div className="bg-black/40 p-5 rounded-2xl border border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-3 gap-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>🏆 ডানপাশের স্ট্যাট কার্ড কনফিগারেশন (Right Stat Box Settings)</span>
              </h4>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={storeShowStatBoxInput}
                  onChange={(e) => setStoreShowStatBoxInput(e.target.checked)}
                  className="w-4 h-4 rounded text-[#C1121F] focus:ring-0 cursor-pointer accent-[#C1121F]"
                />
                <span className="text-xs text-gray-300 font-bold">
                  {isBn ? "স্ট্যাট কার্ড প্রদর্শন করুন" : "Show Stat Card"}
                </span>
              </label>
            </div>

            {storeShowStatBoxInput && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-300 block">
                    স্ট্যাট টেক্সট / সংখ্যা:
                  </label>
                  <input
                    type="text"
                    value={storeEnrolledCountInput}
                    onChange={(e) => setStoreEnrolledCountInput(e.target.value)}
                    placeholder="৫,১২০+ Aspirants"
                    className="w-full bg-[#181818] border border-white/15 focus:border-[#FFD700] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none font-sans font-bold"
                  />
                  <span className="text-[10px] text-gray-500 block">যেমন: ১২০+ Aspirants</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-300 block">
                    বাংলা লেবেল:
                  </label>
                  <input
                    type="text"
                    value={storeStatLabelBnInput}
                    onChange={(e) => setStoreStatLabelBnInput(e.target.value)}
                    placeholder="এনরোল্ড শিক্ষার্থী"
                    className="w-full bg-[#181818] border border-white/15 focus:border-[#FFD700] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none font-sans"
                  />
                  <span className="text-[10px] text-gray-500 block">টাইটেল হিসেবে দেখাবে</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-300 block">
                    English Label:
                  </label>
                  <input
                    type="text"
                    value={storeStatLabelEnInput}
                    onChange={(e) => setStoreStatLabelEnInput(e.target.value)}
                    placeholder="Enrolled Aspirants"
                    className="w-full bg-[#181818] border border-white/15 focus:border-[#FFD700] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none font-sans"
                  />
                  <span className="text-[10px] text-gray-500 block">Shown in English</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-300 block">
                    স্ট্যাট আইকন:
                  </label>
                  <div className="grid grid-cols-6 gap-1 bg-[#181818] p-1.5 rounded-xl border border-white/15">
                    {[
                      { id: "award", icon: <Award className="w-4 h-4" /> },
                      { id: "users", icon: <Users className="w-4 h-4" /> },
                      { id: "sparkles", icon: <Sparkles className="w-4 h-4" /> },
                      { id: "star", icon: <Star className="w-4 h-4" /> },
                      { id: "graduation", icon: <GraduationCap className="w-4 h-4" /> },
                      { id: "target", icon: <Target className="w-4 h-4" /> }
                    ].map((ic) => (
                      <button
                        key={ic.id}
                        type="button"
                        onClick={() => setStoreStatIconInput(ic.id)}
                        className={`p-1.5 rounded-lg flex items-center justify-center transition cursor-pointer ${
                          storeStatIconInput === ic.id
                            ? "bg-[#C1121F] text-white shadow"
                            : "text-gray-400 hover:text-white hover:bg-white/5"
                        }`}
                        title={ic.id}
                      >
                        {ic.icon}
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-gray-500 block">আইকন সিলেক্ট করুন</span>
                </div>
              </div>
            )}
          </div>
        </form>
      )}

      {/* TAB CONTENT: EDIT COURSE & PICTURE DETAILS */}
      {activeTab === "edit_course" && selectedCourse && (
        <form onSubmit={handleSaveCourseChanges} className="bg-[#111111] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6 font-mono">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded bg-[#FFD700]/15 text-[#FFD700] text-[10px] font-bold uppercase border border-[#FFD700]/30">
                  {isBn ? "কোর্স কভার & ছবি নিয়ন্ত্রণ" : "Picture & Media Control"}
                </span>
                <span className="px-2.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[10px] font-bold uppercase border border-emerald-500/30">
                  {isBn ? "অপটিমাইজড আপলোড সক্রিয়" : "Auto-Compression Active"}
                </span>
              </div>
              <h2 className="text-lg font-black text-white uppercase font-display flex items-center gap-2 mt-1">
                <ImageIcon className="w-5 h-5 text-[#FFD700]" />
                <span>{isBn ? "কোর্স কভার, ছবি ও শেয়ারিং এডিটর" : "Course Cover, Pictures & Sharing Hub"}</span>
              </h2>
              <p className="text-xs text-gray-400">
                {isBn ? "কোর্সের ফটো পরিবর্তন করুন, ফ্রেম সাইজ ঠিক করুন এবং শিক্ষার্থীদের সাথে লিংক শেয়ার করুন" : "Update cover photos, aspect ratios, instructor avatars, and share links"}
              </p>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  playSound("click");
                  setIsShareModalOpen(true);
                }}
                className="px-4 py-2.5 bg-[#FFD700]/10 hover:bg-[#FFD700] text-[#FFD700] hover:text-black font-bold text-xs uppercase rounded-xl transition flex items-center gap-2 border border-[#FFD700]/30 cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>{isBn ? "শেয়ার লিংক" : "Share"}</span>
              </button>

              <button
                type="submit"
                disabled={isSavingCourse}
                className="px-6 py-2.5 bg-[#C1121F] hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs uppercase rounded-xl transition flex items-center gap-2 shadow-[0_0_15px_rgba(193,18,31,0.4)] cursor-pointer"
              >
                {isSavingCourse ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{isSavingCourse ? (isBn ? "সেভ হচ্ছে..." : "Saving...") : (isBn ? "সেভ করুন" : "Save Changes")}</span>
              </button>
            </div>
          </div>

          {/* Quick Course Share Card */}
          <div className="bg-gradient-to-r from-black/80 via-[#161616] to-black/80 p-4 sm:p-5 rounded-2xl border border-[#FFD700]/30 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-[#FFD700]" />
                <span className="text-xs font-black text-white uppercase">{isBn ? "কোর্স সরাসরি শেয়ার লিংক (Quick Share):" : "Direct Course Share URL:"}</span>
              </div>
              <span className="text-[10px] text-gray-400 font-mono">1-Click Share & Copy</span>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex-1 bg-black/90 border border-white/15 px-3.5 py-2.5 rounded-xl text-xs text-[#FFD700] font-mono select-all overflow-hidden text-ellipsis whitespace-nowrap">
                {(typeof window !== "undefined" && window.location ? (window.location.origin || `${window.location.protocol}//${window.location.host}`) : "")}/?course={selectedCourse.id}
              </div>
              <button
                type="button"
                onClick={() => {
                  playSound("click");
                  setIsShareModalOpen(true);
                }}
                className="px-4 py-2.5 bg-white/10 hover:bg-[#FFD700] text-white hover:text-black font-bold text-xs uppercase rounded-xl transition flex items-center justify-center gap-1.5 border border-white/10 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{isBn ? "শেয়ার মেনু খুলুন" : "Open Share Hub"}</span>
              </button>
            </div>
          </div>

          {/* Frame Aspect Ratio Selector (16:9, 4:3, 3:4, 1:1) */}
          <div className="space-y-3 bg-black/50 p-5 rounded-2xl border border-white/10 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
              <label className="text-xs font-black text-[#FFD700] uppercase block font-mono flex items-center gap-2">
                <Maximize2 className="w-4 h-4 text-[#FFD700]" />
                <span>Select Frame Aspect Ratio (কভার ফ্রেম সাইজ অনুপাত নির্বাচন করুন):</span>
              </label>
              <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 rounded-full">
                Active Frame: {editAspectRatio}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              {[
                { ratio: "16:9", name: "16:9 Landscape", desc: "Wide Video Banner / Modern Desktop", icon: "🖥️" },
                { ratio: "4:3", name: "4:3 Standard", desc: "Classic Display Format", icon: "📺" },
                { ratio: "3:4", name: "3:4 Portrait", desc: "Medical Book / Poster Cover", icon: "🖼️" },
                { ratio: "1:1", name: "1:1 Square", desc: "Square Social & Mobile Card", icon: "🔳" }
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.ratio}
                  onClick={() => {
                    playSound("click");
                    setEditAspectRatio(opt.ratio as any);
                  }}
                  className={`p-3.5 rounded-2xl border text-left flex flex-col gap-1.5 transition cursor-pointer ${
                    editAspectRatio === opt.ratio
                      ? "bg-[#C1121F]/25 border-[#FFD700] ring-2 ring-[#FFD700]/50 text-white shadow-md"
                      : "bg-black/40 border-white/10 text-gray-400 hover:text-white hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold font-mono text-[#FFD700]">{opt.icon} {opt.ratio}</span>
                    {editAspectRatio === opt.ratio && <Check className="w-4 h-4 text-[#FFD700]" />}
                  </div>
                  <span className="text-xs font-black text-white">{opt.name}</span>
                  <span className="text-[10px] text-gray-400 leading-tight font-mono">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Preset Image Gallery Picker */}
          <div className="space-y-3 bg-black/40 p-5 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#FFD700] uppercase block font-mono flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#FFD700]" />
                <span>Medical Preset Cover Image Gallery (এক ক্লিকে ফটো সেট করুন):</span>
              </label>
              <span className="text-[10px] text-gray-400">12 Specialized Medical Themes</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {PRESET_THUMBNAILS.map((preset, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    playSound("click");
                    setEditThumbnail(preset.url);
                    setEditBanner(preset.url);
                  }}
                  className={`group relative rounded-xl overflow-hidden border-2 cursor-pointer transition-all transform hover:scale-105 ${
                    editThumbnail === preset.url ? "border-[#FFD700] ring-2 ring-[#FFD700]/50 shadow-[0_0_15px_rgba(255,215,0,0.3)]" : "border-white/10 opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={preset.url} alt={preset.name} className={`w-full ${getCourseAspectClass(editAspectRatio)} object-cover`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-1.5 flex items-end">
                    <span className="text-[9px] text-white font-bold leading-tight line-clamp-1">{preset.name}</span>
                  </div>
                  {editThumbnail === preset.url && (
                    <div className="absolute top-1.5 right-1.5 bg-[#FFD700] text-black p-0.5 rounded-full shadow">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Image URLs, Direct File Uploads & Live Previews */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Thumbnail Upload & URL */}
            <div className="space-y-3 bg-black/50 p-5 rounded-2xl border border-white/10">
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-300 font-bold uppercase block font-mono">
                  {isBn ? `কোর্স কভার ফটো (${editAspectRatio}):` : `Course Thumbnail Cover (${editAspectRatio}):`}
                </label>
                <span className="text-[10px] text-emerald-400 font-bold uppercase font-mono bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/20">
                  Auto-Compressed
                </span>
              </div>

              {/* Direct File Selector */}
              <div className="relative border-2 border-dashed border-white/20 hover:border-[#FFD700] rounded-xl p-4 text-center transition bg-black/40 group">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      playSound("click");
                      handleDirectFileUpload(file, (dataUrl) => setEditThumbnail(dataUrl));
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="flex flex-col items-center gap-1.5 py-1">
                  <UploadCloud className="w-7 h-7 text-gray-400 group-hover:text-[#FFD700] transition" />
                  <span className="text-xs text-gray-200 font-bold">
                    {isBn ? `ডিভাইস থেকে ${editAspectRatio} কভার ফটো নির্বাচন করুন` : `Click or Drag & Drop ${editAspectRatio} Image`}
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">PNG, JPG, WEBP (ক্যানভাস অপটিমাইজেশন সহ স্বয়ংক্রিয় সেভ)</span>
                </div>
              </div>

              {/* URL Input Fallback */}
              <div className="space-y-1">
                <span className="text-[10px] text-gray-400 block font-bold uppercase font-mono">Or enter Image URL:</span>
                <input
                  type="text"
                  required
                  value={editThumbnail}
                  onChange={(e) => setEditThumbnail(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-black/80 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#C1121F] font-mono"
                />
              </div>

              <div className="mt-2 space-y-1.5 flex flex-col items-start">
                <span className="text-[10px] text-gray-400 block uppercase font-bold font-mono">{editAspectRatio} Live Preview:</span>
                <div className={`w-full max-w-[240px] ${getCourseAspectClass(editAspectRatio)} rounded-xl overflow-hidden border-2 border-[#C1121F] shadow-lg relative bg-black`}>
                  <img
                    src={editThumbnail || "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80"}
                    alt="Thumbnail Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-0.5 rounded text-[9px] text-[#FFD700] font-bold">
                    {editAspectRatio}
                  </div>
                </div>
              </div>
            </div>

            {/* Banner Upload & URL */}
            <div className="space-y-3 bg-black/50 p-5 rounded-2xl border border-white/10">
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-300 font-bold uppercase block">
                  {isBn ? "কোর্স হেডার ব্যানার ফটো:" : "Course Banner Header Photo:"}
                </label>
                <span className="text-[10px] text-emerald-400 font-bold uppercase font-mono bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/20">
                  Auto-Compressed
                </span>
              </div>

              {/* Direct File Selector */}
              <div className="relative border-2 border-dashed border-white/20 hover:border-[#FFD700] rounded-xl p-4 text-center transition bg-black/40 group">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      playSound("click");
                      handleDirectFileUpload(file, (dataUrl) => setEditBanner(dataUrl));
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="flex flex-col items-center gap-1.5 py-1">
                  <UploadCloud className="w-7 h-7 text-gray-400 group-hover:text-[#FFD700] transition" />
                  <span className="text-xs text-gray-200 font-bold">
                    {isBn ? "ডিভাইস থেকে ওয়াইড ব্যানার আপলোড করুন" : "Click or Drag Banner File Here"}
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">PNG, JPG, WEBP (HD Quality, Auto-Scaled)</span>
                </div>
              </div>

              {/* URL Input Fallback */}
              <div className="space-y-1">
                <span className="text-[10px] text-gray-400 block font-bold uppercase">Or enter Banner URL:</span>
                <input
                  type="text"
                  value={editBanner}
                  onChange={(e) => setEditBanner(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-black/80 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#C1121F]"
                />
              </div>

              <div className="mt-2 space-y-1.5">
                <span className="text-[10px] text-gray-400 block uppercase font-bold">Banner Live Preview:</span>
                <div className="w-full h-36 rounded-xl overflow-hidden border border-white/10 shadow-md relative bg-black">
                  <img
                    src={editBanner || editThumbnail || "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80"}
                    alt="Banner Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* INSTRUCTOR AVATAR & PRESETS SECTION */}
          <div className="space-y-4 bg-black/50 p-5 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <label className="text-xs font-bold text-[#FFD700] uppercase block font-mono flex items-center gap-2">
                <Users className="w-4 h-4 text-[#FFD700]" />
                <span>Instructor Profile Picture & Avatar (শিক্ষকের ছবি আপলোড বা প্রিসেট নির্বাচন):</span>
              </label>
              <span className="text-[10px] text-gray-400 font-mono">Faculty Photo Control</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4 items-center">
              {/* Live Selected Avatar Preview */}
              <div className="flex flex-col items-center gap-2 p-3 bg-black/60 rounded-xl border border-white/10">
                <img
                  src={editInstructorAvatar || "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80"}
                  alt="Instructor Avatar"
                  className="w-16 h-16 rounded-full object-cover border-2 border-[#FFD700] shadow-md"
                />
                <span className="text-[10px] text-gray-300 font-bold uppercase">{isBn ? "বর্তমান ছবি" : "Active Photo"}</span>
              </div>

              {/* Preset Avatars */}
              <div className="md:col-span-3 space-y-2">
                <span className="text-[10px] text-gray-400 uppercase font-bold block">{isBn ? "মেডিকেল ফ্যাকাল্টি প্রিসেট অবতার (1-Click):" : "Medical Faculty Presets:"}</span>
                <div className="flex items-center gap-2.5 overflow-x-auto">
                  {PRESET_INSTRUCTOR_AVATARS.map((avatar, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => {
                        playSound("click");
                        setEditInstructorAvatar(avatar.url);
                      }}
                      className={`relative rounded-full overflow-hidden border-2 transition transform hover:scale-110 shrink-0 ${
                        editInstructorAvatar === avatar.url ? "border-[#FFD700] ring-2 ring-[#FFD700]/50" : "border-white/20 opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img src={avatar.url} alt={avatar.name} className="w-12 h-12 object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Direct Photo Uploader */}
              <div className="md:col-span-2 space-y-2">
                <span className="text-[10px] text-gray-400 uppercase font-bold block">{isBn ? "কাস্টম ছবি আপলোড:" : "Direct Upload Photo:"}</span>
                <div className="relative border border-dashed border-white/20 hover:border-[#FFD700] rounded-xl p-2 text-center transition bg-black/40">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        playSound("click");
                        handleDirectFileUpload(file, (dataUrl) => setEditInstructorAvatar(dataUrl));
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="flex items-center justify-center gap-2 py-1">
                    <UploadCloud className="w-4 h-4 text-gray-400" />
                    <span className="text-[11px] text-gray-200 font-bold">{isBn ? "ছবি আপলোড করুন" : "Upload Doctor Photo"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Titles & Single Official Batch Pricing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
            <div className="space-y-1.5">
              <label className="text-gray-300 font-bold uppercase block">Course Title (কোর্সের নাম):</label>
              <input
                type="text"
                required
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#C1121F]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-gray-300 font-bold uppercase block">Single Official Batch Name (একমাত্র অফিসিয়াল ব্যাচ):</label>
              <input
                type="text"
                value={editBatchName}
                onChange={(e) => setEditBatchName(e.target.value)}
                placeholder="e.g. Official MAT Live Batch 01"
                className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-gray-300 font-bold uppercase block">Original Price (আসল ফি ৳):</label>
              <input
                type="number"
                required
                value={editOriginalPrice}
                onChange={(e) => setEditOriginalPrice(Number(e.target.value))}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-gray-300 font-bold uppercase block">Discounted Price (ছাড়ে ভর্তি ফি ৳):</label>
              <input
                type="number"
                required
                value={editDiscountedPrice}
                onChange={(e) => setEditDiscountedPrice(Number(e.target.value))}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-gray-300 font-bold uppercase block flex items-center justify-between">
                <span>{isBn ? "মোট এনরোল্ড শিক্ষার্থী সংখ্যা:" : "Total Enrolled Aspirants:"}</span>
                <span className="text-[10px] text-[#FFD700] lowercase font-normal">({isBn ? "স্টোর ও লিডারবোর্ডে প্রদর্শন" : "shows in store & leaderboard"})</span>
              </label>
              <input
                type="number"
                min={0}
                value={editTotalEnrolled}
                onChange={(e) => setEditTotalEnrolled(Number(e.target.value))}
                placeholder="e.g. 1420"
                className="w-full bg-black/60 border border-white/10 focus:border-[#FFD700] rounded-xl px-4 py-3 text-white focus:outline-none font-bold text-sm"
              />
            </div>
          </div>

          {/* Instructor Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2">
            <div className="space-y-1.5">
              <label className="text-gray-300 font-bold uppercase block">Instructor Name (শিক্ষকের নাম):</label>
              <input
                type="text"
                value={editInstructorName}
                onChange={(e) => setEditInstructorName(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-gray-300 font-bold uppercase block">Instructor Designation:</label>
              <input
                type="text"
                value={editInstructorTitle}
                onChange={(e) => setEditInstructorTitle(e.target.value)}
                placeholder="e.g. Dhaka Medical College (DMC)"
                className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-gray-300 font-bold uppercase block">Batch Live Schedule:</label>
              <input
                type="text"
                value={editScheduleDetails}
                onChange={(e) => setEditScheduleDetails(e.target.value)}
                placeholder="e.g. Every Mon, Wed, Fri (8:00 PM Live)"
                className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Short & Full Descriptions */}
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5 text-xs">
              <label className="text-gray-300 font-bold uppercase block">Short Overview Description:</label>
              <textarea
                rows={2}
                value={editShortDesc}
                onChange={(e) => setEditShortDesc(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="text-gray-300 font-bold uppercase block">Full Course Details & Syllabus Overview:</label>
              <textarea
                rows={4}
                value={editFullDesc}
                onChange={(e) => setEditFullDesc(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="text-gray-300 font-bold uppercase block">Course Key Highlights (1 feature per line):</label>
              <textarea
                rows={3}
                value={editFeaturesText}
                onChange={(e) => setEditFeaturesText(e.target.value)}
                placeholder="100+ Live Interactive Classes&#10;50+ Daily Model Tests&#10;Printed Lecture Sheets"
                className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Submit Save Button */}
          <button
            type="submit"
            disabled={isSavingCourse}
            className="w-full py-4 bg-gradient-to-r from-[#C1121F] to-red-600 hover:from-red-600 hover:to-red-500 disabled:opacity-50 text-white font-black text-sm uppercase rounded-xl transition cursor-pointer shadow-[0_0_15px_rgba(193,18,31,0.4)] flex items-center justify-center gap-2"
          >
            {isSavingCourse ? (
              <RefreshCw className="w-5 h-5 animate-spin text-[#FFD700]" />
            ) : (
              <Save className="w-5 h-5 text-[#FFD700]" />
            )}
            <span>
              {isSavingCourse
                ? (isBn ? "কোর্সের ছবি ও তথ্য সেভ হচ্ছে..." : "SAVING COURSE PICTURES & DATA...")
                : (isBn ? "কোর্স ফটো ও সকল তথ্য সেভ করুন" : "SAVE COURSE PICTURES & DETAILS NOW")}
            </span>
          </button>
        </form>
      )}

      {/* TAB CONTENT: EDIT / MANAGE EXAMS */}
      {activeTab === "edit_exams" && (
        <div className="bg-[#111111] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 font-mono">
          {/* Header & Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-[#C1121F]/20 text-[#FFD700] border border-[#C1121F]/40">
                  <FileText className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-lg font-black text-white uppercase font-display tracking-wide">
                    {isBn ? "সকল প্রকাশিত পরীক্ষা ও মডেল টেস্ট" : "Published Exam Model Tests"} ({exams.length})
                  </h2>
                  <p className="text-xs text-gray-400 font-sans mt-0.5">
                    {isBn
                      ? `কোর্স: ${selectedCourse?.title || "Medical Exam Course"} এর জন্য পরীক্ষা তৈরি, এডিট, ক্লোন এবং ডিলিট করুন`
                      : `Manage, edit, duplicate, and delete exams for ${selectedCourse?.title}`}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleOpenCreateExam}
                className="px-5 py-2.5 bg-gradient-to-r from-[#C1121F] to-red-600 hover:from-red-600 hover:to-red-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-red-950/50 transition cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#FFD700]" />
                <span>{isBn ? "+ নতুন পরীক্ষা তৈরি করুন" : "+ Create New Exam"}</span>
              </button>
            </div>
          </div>

          {/* Active Live Exam Banner */}
          {exams.some((e) => e.status === "live_now" || e.isLive === true) && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-red-950/80 via-red-900/60 to-black border-2 border-red-600/60 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-[0_0_20px_rgba(220,38,38,0.3)]">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-xl bg-red-600 text-white animate-pulse">
                  <Radio className="w-5 h-5 animate-ping" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase text-red-400 tracking-wider">
                      {isBn ? "🔴 লাইভ পরীক্ষা চলমান (LIVE IN PROGRESS)" : "🔴 LIVE EXAM RUNNING NOW"}
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-white font-sans mt-0.5">
                    {exams.find((e) => e.status === "live_now" || e.isLive === true)?.title}
                  </h4>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const liveEx = exams.find((e) => e.status === "live_now" || e.isLive === true);
                  if (liveEx) {
                    playSound("click");
                    setManagingLiveExam(liveEx);
                  }
                }}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase rounded-xl transition cursor-pointer flex items-center gap-2 shadow-lg shadow-red-950/60"
              >
                <Radio className="w-4 h-4" />
                <span>{isBn ? "লাইভ কন্ট্রোল সেন্টার খুলুন" : "Open Live Control"}</span>
              </button>
            </div>
          )}

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-black/40 border border-white/10 rounded-2xl">
              <span className="text-[11px] text-gray-400 block font-sans">{isBn ? "মোট পরীক্ষা" : "Total Exams"}</span>
              <span className="text-xl font-black text-white font-mono">{exams.length}</span>
            </div>
            <div className="p-3.5 bg-black/40 border border-white/10 rounded-2xl">
              <span className="text-[11px] text-gray-400 block font-sans">{isBn ? "পাবলিশড পরীক্ষা" : "Published"}</span>
              <span className="text-xl font-black text-emerald-400 font-mono">
                {exams.filter((e) => e.isPublished !== false).length}
              </span>
            </div>
            <div className="p-3.5 bg-black/40 border border-white/10 rounded-2xl">
              <span className="text-[11px] text-gray-400 block font-sans">{isBn ? "ড্রাফট পরীক্ষা" : "Drafts"}</span>
              <span className="text-xl font-black text-amber-400 font-mono">
                {exams.filter((e) => e.isPublished === false).length}
              </span>
            </div>
            <div className="p-3.5 bg-black/40 border border-white/10 rounded-2xl">
              <span className="text-[11px] text-gray-400 block font-sans">{isBn ? "মোট প্রশ্ন সংখ্যা" : "Total Questions"}</span>
              <span className="text-xl font-black text-[#FFD700] font-mono">
                {exams.reduce((sum, e) => sum + (e.questions?.length || e.totalQuestions || 0), 0)}
              </span>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col md:flex-row gap-3 bg-black/50 p-4 rounded-2xl border border-white/10">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={examSearchTerm}
                onChange={(e) => setExamSearchTerm(e.target.value)}
                placeholder={isBn ? "পরীক্ষার নাম দিয়ে খুঁজুন..." : "Search exams by title..."}
                className="w-full bg-[#181818] border border-white/10 focus:border-[#FFD700] rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none font-sans"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-sans">
              <select
                value={examFilterSubject}
                onChange={(e) => setExamFilterSubject(e.target.value)}
                className="bg-[#181818] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none"
              >
                <option value="all">{isBn ? "সকল বিষয়" : "All Subjects"}</option>
                <option value="Biology">Biology (জীববিজ্ঞান)</option>
                <option value="Chemistry">Chemistry (রসায়ন)</option>
                <option value="Physics">Physics (পদার্থবিজ্ঞান)</option>
                <option value="English">English (ইংরেজি)</option>
                <option value="GK">GK (সাধারণ জ্ঞান)</option>
              </select>

              <select
                value={examFilterStatus}
                onChange={(e) => setExamFilterStatus(e.target.value as any)}
                className="bg-[#181818] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none"
              >
                <option value="all">{isBn ? "সকল স্ট্যাটাস" : "All Status"}</option>
                <option value="live_now">{isBn ? "🔴 লাইভ চলছে (LIVE NOW)" : "🔴 Live Now"}</option>
                <option value="published">{isBn ? "পাবলিশড" : "Published"}</option>
                <option value="draft">{isBn ? "ড্রাফট" : "Draft"}</option>
                <option value="ended">{isBn ? "সমাপ্ত পরীক্ষা" : "Ended"}</option>
              </select>
            </div>
          </div>

          {/* Exam Cards List */}
          <div className="space-y-3 font-sans">
            {exams.length === 0 ? (
              <div className="p-12 text-center border-2 border-dashed border-white/10 rounded-3xl space-y-3">
                <FileQuestion className="w-10 h-10 text-gray-500 mx-auto" />
                <p className="text-gray-400 text-sm font-bold">
                  {isBn ? "এই কোর্সের জন্য এখনও কোনো পরীক্ষা প্রকাশিত হয়নি।" : "No exams published for this course yet."}
                </p>
                <button
                  type="button"
                  onClick={handleOpenCreateExam}
                  className="px-5 py-2 bg-[#C1121F] hover:bg-red-600 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  {isBn ? "+ প্রথম পরীক্ষা তৈরি করুন" : "+ Create First Exam"}
                </button>
              </div>
            ) : (
              exams
                .filter((ex) => {
                  const matchesSearch = !examSearchTerm || ex.title.toLowerCase().includes(examSearchTerm.toLowerCase());
                  const matchesSubject = examFilterSubject === "all" || ex.subject === examFilterSubject;
                  const isLiveNow = ex.status === "live_now" || ex.isLive === true;
                  const isEnded = ex.status === "ended";
                  const matchesStatus =
                    examFilterStatus === "all" ||
                    (examFilterStatus === "live_now" && isLiveNow) ||
                    (examFilterStatus === "published" && ex.isPublished !== false) ||
                    (examFilterStatus === "draft" && ex.isPublished === false) ||
                    (examFilterStatus === "ended" && isEnded);
                  return matchesSearch && matchesSubject && matchesStatus;
                })
                .map((ex) => {
                  const subjectBadgeColor =
                    ex.subject === "Biology"
                      ? "bg-emerald-950/60 text-emerald-300 border-emerald-500/30"
                      : ex.subject === "Chemistry"
                      ? "bg-amber-950/60 text-amber-300 border-amber-500/30"
                      : ex.subject === "Physics"
                      ? "bg-blue-950/60 text-blue-300 border-blue-500/30"
                      : ex.subject === "English"
                      ? "bg-purple-950/60 text-purple-300 border-purple-500/30"
                      : "bg-rose-950/60 text-rose-300 border-rose-500/30";

                  const questionCount = ex.questions?.length || ex.totalQuestions || 0;
                  const isPublished = ex.isPublished !== false;
                  const isLiveNow = ex.status === "live_now" || ex.isLive === true;
                  const isEnded = ex.status === "ended";
                  const examSubs = liveSubmissionsList.filter((s) => s.examId === ex.id);
                  const avgScore = examSubs.length > 0 ? (examSubs.reduce((sum, s) => sum + (Number(s.score) || 0), 0) / examSubs.length).toFixed(1) : "0.0";

                  return (
                    <div
                      key={ex.id}
                      className={`p-5 bg-black/60 border rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition shadow-sm ${
                        isLiveNow ? "border-red-500/60 bg-red-950/10 shadow-[0_0_15px_rgba(239,68,68,0.15)]" : "border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${subjectBadgeColor}`}>
                            {ex.subject}
                          </span>
                          {isLiveNow ? (
                            <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase bg-red-600 text-white animate-pulse flex items-center gap-1 shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                              <Radio className="w-3 h-3 animate-ping" />
                              <span>{isBn ? "🔴 লাইভ চলছে (LIVE NOW)" : "🔴 LIVE NOW"}</span>
                            </span>
                          ) : isEnded ? (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700 flex items-center gap-1">
                              <span>{isBn ? "⏹️ সমাপ্ত (ENDED)" : "⏹️ ENDED"}</span>
                            </span>
                          ) : (
                            <span
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                                isPublished
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : "bg-zinc-800 text-zinc-400 border-zinc-700"
                              }`}
                            >
                              {isPublished ? (isBn ? "● লাইভ পাবলিশড" : "● Live Published") : (isBn ? "○ ড্রাফট" : "○ Draft")}
                            </span>
                          )}
                          {ex.chapter && (
                            <span className="text-gray-400 text-xs font-mono bg-white/5 px-2 py-0.5 rounded">
                              {ex.chapter}
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-white tracking-wide">{ex.title}</h3>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 font-mono">
                          <span className="flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5 text-[#FFD700]" />
                            <strong className="text-white">{questionCount}</strong> {isBn ? "প্রশ্ন" : "Questions"}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-sky-400" />
                            <strong className="text-white">{ex.durationMinutes}</strong> {isBn ? "মিনিট" : "Mins"}
                          </span>
                          <span>•</span>
                          <span>
                            {isBn ? "পাস মার্ক" : "Pass"}: <strong className="text-white">{ex.passMarks}</strong>
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                            <Users className="w-3 h-3" />
                            <span>{examSubs.length} {isBn ? "টি সাবমিশন" : "Submissions"}</span>
                            {examSubs.length > 0 && <span className="text-gray-300 text-[10px]">(গড়: {avgScore})</span>}
                          </span>
                          {ex.startTime && (
                            <>
                              <span>•</span>
                              <span className="text-[11px] text-gray-500">
                                {new Date(ex.startTime).toLocaleDateString()}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Action Toolbar */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-white/10">
                        {/* 1-Click Go Live / End Exam */}
                        <button
                          type="button"
                          onClick={() => handleToggleExamLiveStatus(ex)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                            isLiveNow
                              ? "bg-red-600/30 hover:bg-red-600 text-red-200 hover:text-white border border-red-500"
                              : "bg-red-600 hover:bg-red-500 text-white shadow-[0_0_10px_rgba(220,38,38,0.4)]"
                          }`}
                        >
                          {isLiveNow ? (
                            <>
                              <Square className="w-3.5 h-3.5 fill-current" />
                              <span>{isBn ? "লাইভ সমাপ্ত করুন" : "End Live"}</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 fill-white" />
                              <span>{isBn ? "🔴 লাইভ শুরু করুন" : "🔴 Start Live"}</span>
                            </>
                          )}
                        </button>

                        {/* Dedicated Live Exam Control Center */}
                        <button
                          type="button"
                          onClick={() => {
                            playSound("click");
                            setManagingLiveExam(ex);
                          }}
                          className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900/80 text-red-300 hover:text-white border border-red-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                          title={isBn ? "লাইভ পরীক্ষা নিয়ন্ত্রণ, সময় বৃদ্ধি ও মনিটরিং" : "Live exam control and monitoring"}
                        >
                          <Radio className="w-3.5 h-3.5 text-red-400" />
                          <span>{isBn ? "লাইভ কন্ট্রোল" : "Live Control"}</span>
                        </button>

                        {/* Direct Question Manager */}
                        <button
                          type="button"
                          onClick={() => {
                            playSound("click");
                            setManagingQuestionsExam(ex);
                          }}
                          className="px-3 py-1.5 bg-amber-950/60 hover:bg-amber-900/80 text-[#FFD700] border border-amber-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                          title={isBn ? "সরাসরি প্রশ্ন যোগ, এডিট ও বাল্ক পেস্ট করুন" : "Manage questions directly"}
                        >
                          <HelpCircle className="w-3.5 h-3.5 text-[#FFD700]" />
                          <span>{isBn ? `প্রশ্নসমূহ (${questionCount})` : `Questions (${questionCount})`}</span>
                        </button>

                        {/* Marks & Rank Direct Jump */}
                        <button
                          type="button"
                          onClick={() => {
                            playSound("click");
                            setSelectedExamForMarksId(ex.id);
                            setActiveTab("exam_marks");
                          }}
                          className="px-3 py-1.5 bg-sky-950/60 hover:bg-sky-900 text-sky-300 border border-sky-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                          title={isBn ? "এই পরীক্ষার খাতা ও মার্কস দেখুন" : "View student submissions & marks"}
                        >
                          <Award className="w-3.5 h-3.5 text-sky-400" />
                          <span>{isBn ? "খাতা ও মার্কস" : "Marks & Rank"}</span>
                        </button>

                        {/* 1-Click Publish Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleExamPublish(ex)}
                          title={isPublished ? "Click to set as Draft" : "Click to Publish"}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border ${
                            isPublished
                              ? "bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border-emerald-500/30"
                              : "bg-white/5 hover:bg-white/10 text-gray-300 border-white/10"
                          }`}
                        >
                          {isPublished ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4 text-gray-400" />}
                          <span>{isPublished ? (isBn ? "পাবলিশড" : "Published") : (isBn ? "ড্রাফট" : "Draft")}</span>
                        </button>

                        {/* Preview Exam Button */}
                        <button
                          type="button"
                          onClick={() => {
                            playSound("click");
                            setPreviewingExam(ex);
                          }}
                          className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-sky-400" />
                          <span>{isBn ? "প্রিভিউ" : "Preview"}</span>
                        </button>

                        {/* Edit Exam Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditExam(ex)}
                          className="px-3.5 py-1.5 bg-[#C1121F]/20 hover:bg-[#C1121F]/40 text-[#FFD700] border border-[#C1121F]/50 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-[#FFD700]" />
                          <span>{isBn ? "এডিট" : "Edit"}</span>
                        </button>

                        {/* Duplicate Exam Button */}
                        <button
                          type="button"
                          onClick={() => handleDuplicateExam(ex)}
                          title="Clone this exam"
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer border border-white/10"
                        >
                          <Copy className="w-3.5 h-3.5 text-amber-400" />
                          <span>{isBn ? "ক্লোন" : "Clone"}</span>
                        </button>

                        {/* Delete Exam Button */}
                        {onDeleteExam && (
                          <button
                            type="button"
                            onClick={() => {
                              playSound("click");
                              setExamDeleteConfirmId(ex.id);
                            }}
                            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{isBn ? "ডিলিট" : "Delete"}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: ADD / EDIT EXAM MODEL TEST */}
      {activeTab === "add_exam" && (
        <form onSubmit={handleSaveExamSubmit} className="bg-[#111111] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 font-mono">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-[#C1121F]/20 text-[#FFD700] border border-[#C1121F]/40">
                  <Edit className="w-5 h-5" />
                </span>
                <h2 className="text-lg font-black text-white uppercase font-display tracking-wide">
                  {editingExamId
                    ? (isBn ? `পরীক্ষা এডিট করুন (${examTitle || "Exam"})` : `Edit Exam Model Test`)
                    : (isBn ? "নতুন পরীক্ষা ও মডেল টেস্ট তৈরি করুন" : "Create & Publish New Course Exam")}
                </h2>
              </div>
              <p className="text-xs text-gray-400 font-sans mt-1">
                {isBn
                  ? "প্রশ্ন তৈরি করুন, অপশন নির্ধারণ করুন এবং সেন্ট্রাল প্রশ্ন ব্যাংক থেকে ইমপোর্ট করুন।"
                  : "Configure exam parameters, add questions manually or import directly from Question Bank."}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  playSound("click");
                  setIsQBPickerOpen(true);
                }}
                className="px-4 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-[#FFD700] text-xs font-bold rounded-xl flex items-center gap-2 transition cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-[#FFD700]" />
                <span>{isBn ? "📚 প্রশ্ন ব্যাংক থেকে ইমপোর্ট" : "📚 Import from Question Bank"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playSound("click");
                  setEditingExamId(null);
                  setActiveTab("edit_exams");
                }}
                className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold rounded-xl transition cursor-pointer border border-white/10"
              >
                {isBn ? "বাতিল" : "Cancel"}
              </button>
            </div>
          </div>

          {/* Form Grid 1: Basic Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-sans">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-gray-300 font-bold uppercase block font-mono">
                {isBn ? "পরীক্ষার নাম / টাইটেল:" : "Exam Title:"}
              </label>
              <input
                type="text"
                required
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                placeholder="e.g. কোষ ও এর গঠন মেগা মডেল টেস্ট - ০১"
                className="w-full bg-black/60 border border-white/15 focus:border-[#C1121F] rounded-xl px-4 py-3 text-white focus:outline-none font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-gray-300 font-bold uppercase block font-mono">
                {isBn ? "বিষয় (Subject):" : "Subject:"}
              </label>
              <select
                value={examSubject}
                onChange={(e) => setExamSubject(e.target.value as any)}
                className="w-full bg-black/60 border border-white/15 focus:border-[#FFD700] rounded-xl px-4 py-3 text-white focus:outline-none font-bold"
              >
                <option value="All">All Subjects (সকল বিষয় / সমন্বিত)</option>
                <option value="Biology">Biology (জীববিজ্ঞান)</option>
                <option value="Chemistry">Chemistry (রসায়ন)</option>
                <option value="Physics">Physics (পদার্থবিজ্ঞান)</option>
                <option value="GK">GK (সাধারণ জ্ঞান)</option>
                <option value="English">English (ইংরেজি)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-gray-300 font-bold uppercase block font-mono">
                {isBn ? "টার্গেট ব্যাচ:" : "Target Batch:"}
              </label>
              <select
                value={examTargetBatchId}
                onChange={(e) => setExamTargetBatchId(e.target.value)}
                className="w-full bg-black/60 border border-white/15 focus:border-[#FFD700] rounded-xl px-4 py-3 text-white focus:outline-none"
              >
                {courseBatches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.batchName}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-gray-300 font-bold uppercase block font-mono">
                {isBn ? "অধ্যায় / টপিক:" : "Chapter / Topic:"}
              </label>
              <input
                type="text"
                value={examChapter}
                onChange={(e) => setExamChapter(e.target.value)}
                placeholder="e.g. রক্ত ও রক্ত সংবহন"
                className="w-full bg-black/60 border border-white/15 focus:border-[#FFD700] rounded-xl px-4 py-3 text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-gray-300 font-bold uppercase block font-mono">
                {isBn ? "সময়কাল (মিনিট):" : "Duration (Minutes):"}
              </label>
              <input
                type="number"
                min={1}
                max={300}
                required
                value={examDuration}
                onChange={(e) => setExamDuration(Number(e.target.value))}
                className="w-full bg-black/60 border border-white/15 focus:border-[#FFD700] rounded-xl px-4 py-3 text-white focus:outline-none font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-gray-300 font-bold uppercase block font-mono">
                {isBn ? "পাস মার্ক:" : "Pass Marks:"}
              </label>
              <input
                type="number"
                min={1}
                value={examPassMarks}
                onChange={(e) => setExamPassMarks(Number(e.target.value))}
                className="w-full bg-black/60 border border-white/15 focus:border-[#FFD700] rounded-xl px-4 py-3 text-white focus:outline-none font-bold"
              />
            </div>

            <div className="space-y-1.5 flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer bg-black/60 border border-white/15 rounded-xl px-4 py-3 text-white">
                <input
                  type="checkbox"
                  checked={examIsPublished}
                  onChange={(e) => setExamIsPublished(e.target.checked)}
                  className="w-4 h-4 rounded text-[#C1121F] accent-[#C1121F] cursor-pointer"
                />
                <span className="font-bold text-xs">
                  {examIsPublished ? (isBn ? "পাবলিশড (সবার জন্য দৃশ্যমান)" : "Live Published") : (isBn ? "ড্রাফট হিসেবে রাখুন" : "Draft Only")}
                </span>
              </label>
            </div>
          </div>

          {/* Schedule Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-black/40 p-4 rounded-2xl border border-white/10 text-xs font-sans">
            <div className="space-y-1.5">
              <label className="text-gray-300 font-bold block font-mono">
                {isBn ? "পরীক্ষা শুরুর সময় (Start Date & Time):" : "Start Date & Time:"}
              </label>
              <input
                type="datetime-local"
                value={examStartTime}
                onChange={(e) => setExamStartTime(e.target.value)}
                className="w-full bg-[#181818] border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-gray-300 font-bold block font-mono">
                {isBn ? "পরীক্ষা সমাপ্তির সময় (End Date & Time):" : "End Date & Time:"}
              </label>
              <input
                type="datetime-local"
                value={examEndTime}
                onChange={(e) => setExamEndTime(e.target.value)}
                className="w-full bg-[#181818] border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Question Builder Section */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-black/50 p-4 rounded-2xl border border-white/10">
              <div>
                <h3 className="text-sm font-black text-[#FFD700] uppercase tracking-wider flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-[#FFD700]" />
                  <span>{isBn ? "প্রশ্নমালা তালিকা" : "Exam Questions List"} ({questions.length} Questions)</span>
                </h3>
                <p className="text-[11px] text-gray-400 font-sans mt-0.5">
                  {isBn ? "সঠিক উত্তরের অপশনটি রেডিও বাটনে সিলেক্ট করুন।" : "Select the radio button beside the correct answer option."}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    playSound("click");
                    setIsBulkModalInAddExamOpen(true);
                  }}
                  className="px-3 py-2 bg-gradient-to-r from-amber-500/20 to-red-500/20 hover:from-amber-500/30 hover:to-red-500/30 text-[#FFD700] border border-amber-500/40 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isBn ? "⚡ বাল্ক প্রশ্ন পেস্ট" : "⚡ Bulk Paste"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playSound("click");
                    setIsQBPickerOpen(true);
                  }}
                  className="px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-[#FFD700] border border-amber-500/40 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{isBn ? "+ প্রশ্ন ব্যাংক থেকে যোগ" : "+ Import QB"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddQuestionToExam}
                  className="px-3.5 py-2 bg-[#C1121F] hover:bg-red-600 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow"
                >
                  <Plus className="w-3.5 h-3.5 text-[#FFD700]" />
                  <span>{isBn ? "+ নতুন প্রশ্ন যোগ" : "+ Add Blank Question"}</span>
                </button>
              </div>
            </div>

            {/* Questions Form Cards */}
            <div className="space-y-4 font-sans">
              {questions.map((q, qIdx) => (
                <div
                  key={q.id || `q_${qIdx}`}
                  className="p-5 bg-black/60 border border-white/10 hover:border-white/20 rounded-2xl space-y-4 text-xs transition relative"
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2 font-mono">
                      <span className="px-2.5 py-1 bg-[#C1121F]/30 border border-[#C1121F]/50 text-[#FFD700] font-black rounded-lg text-xs">
                        Q.{qIdx + 1}
                      </span>
                      <span className="text-gray-400 font-bold">
                        {q.subject || examSubject} {q.chapter ? `• ${q.chapter}` : ""}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Move Up */}
                      <button
                        type="button"
                        disabled={qIdx === 0}
                        onClick={() => {
                          playSound("click");
                          setQuestions((prev) => {
                            const next = [...prev];
                            const [moved] = next.splice(qIdx, 1);
                            next.splice(qIdx - 1, 0, moved);
                            return next;
                          });
                        }}
                        title="Move Up"
                        className={`p-1.5 rounded-lg border border-white/10 transition ${
                          qIdx === 0 ? "opacity-30 cursor-not-allowed" : "hover:bg-white/10 cursor-pointer text-gray-300"
                        }`}
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>

                      {/* Move Down */}
                      <button
                        type="button"
                        disabled={qIdx === questions.length - 1}
                        onClick={() => {
                          playSound("click");
                          setQuestions((prev) => {
                            const next = [...prev];
                            const [moved] = next.splice(qIdx, 1);
                            next.splice(qIdx + 1, 0, moved);
                            return next;
                          });
                        }}
                        title="Move Down"
                        className={`p-1.5 rounded-lg border border-white/10 transition ${
                          qIdx === questions.length - 1 ? "opacity-30 cursor-not-allowed" : "hover:bg-white/10 cursor-pointer text-gray-300"
                        }`}
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDuplicateQuestionInExam(qIdx)}
                        title="Duplicate this question"
                        className="p-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg transition cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5 text-amber-400" />
                      </button>

                      {questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestionFromExam(qIdx)}
                          title="Remove question"
                          className="p-1.5 bg-red-500/10 hover:bg-red-500/30 text-red-400 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Question Statement */}
                  <div className="space-y-1.5">
                    <label className="text-gray-300 font-bold block font-mono">
                      {isBn ? `প্রশ্ন #${qIdx + 1} এর বিবরণ:` : `Question #${qIdx + 1} Statement:`}
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={q.questionText}
                      onChange={(e) => {
                        const updated = [...questions];
                        updated[qIdx].questionText = e.target.value;
                        setQuestions(updated);
                      }}
                      placeholder="প্রশ্নটি এখানে লিখুন... (e.g. মানুষের রক্তে লোহিত রক্তকণিকার গড় আয়ুষ্কাল কত দিন?)"
                      className="w-full bg-[#181818] border border-white/15 focus:border-[#FFD700] rounded-xl p-3 text-white focus:outline-none font-bold text-sm leading-relaxed resize-none"
                    />
                  </div>

                  {/* 4 Options Grid with Correct Answer Selection */}
                  <div className="space-y-2">
                    <label className="text-gray-300 font-bold block font-mono text-[11px]">
                      {isBn ? "৪টি বিকল্প অপশন (সঠিক উত্তরের গোল বাটনে ক্লিক করুন):" : "4 Options (Click radio on correct answer):"}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(q.options || ["", "", "", ""]).map((opt, oIdx) => {
                        const isCorrect = q.correctAnswerIndex === oIdx;
                        return (
                          <div
                            key={oIdx}
                            onClick={() => {
                              const updated = [...questions];
                              updated[qIdx].correctAnswerIndex = oIdx;
                              setQuestions(updated);
                            }}
                            className={`flex items-center gap-2 p-2.5 rounded-xl border transition cursor-pointer ${
                              isCorrect
                                ? "bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-500/40"
                                : "bg-[#181818] border-white/10 hover:border-white/20"
                            }`}
                          >
                            <input
                              type="radio"
                              name={`correct_ans_${qIdx}`}
                              checked={isCorrect}
                              onChange={() => {
                                const updated = [...questions];
                                updated[qIdx].correctAnswerIndex = oIdx;
                                setQuestions(updated);
                              }}
                              className="w-4 h-4 text-emerald-500 accent-emerald-500 cursor-pointer"
                            />
                            <span className="font-mono font-black text-xs text-gray-400 w-4">
                              {String.fromCharCode(65 + oIdx)}.
                            </span>
                            <input
                              type="text"
                              required
                              value={opt}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                const updated = [...questions];
                                if (!updated[qIdx].options) updated[qIdx].options = ["", "", "", ""];
                                updated[qIdx].options[oIdx] = e.target.value;
                                setQuestions(updated);
                              }}
                              placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                              className="flex-1 bg-transparent border-none text-white focus:outline-none text-xs font-semibold"
                            />
                            {isCorrect && (
                              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
                                {isBn ? "সঠিক উত্তর" : "Correct"}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Explanation Note */}
                  <div className="space-y-1 pt-1">
                    <label className="text-gray-400 font-bold block font-mono text-[11px]">
                      {isBn ? "ব্যাখ্যা / ক্লারিফিকেশন (Explanation - Optional):" : "Explanation (Optional):"}
                    </label>
                    <input
                      type="text"
                      value={q.explanation || ""}
                      onChange={(e) => {
                        const updated = [...questions];
                        updated[qIdx].explanation = e.target.value;
                        setQuestions(updated);
                      }}
                      placeholder="ব্যাখ্যা বা তথ্যসূত্র উল্লেখ করুন (পরীক্ষা শেষে শিক্ষার্থীরা দেখতে পাবে)..."
                      className="w-full bg-[#181818] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-gray-200 focus:outline-none focus:border-[#FFD700]"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Add & Import Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddQuestionToExam}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4 text-[#FFD700]" />
                  <span>{isBn ? "+ আরেকটি প্রশ্ন যোগ করুন" : "+ Add Another Question"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playSound("click");
                    setIsQBPickerOpen(true);
                  }}
                  className="px-4 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-[#FFD700] border border-amber-500/40 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>{isBn ? "📚 প্রশ্ন ব্যাংক থেকে নির্বাচন করুন" : "📚 Pick from Question Bank"}</span>
                </button>
              </div>

              <span className="text-xs text-gray-400 font-mono">
                {isBn ? `মোট প্রশ্ন: ${questions.length} টি` : `Total Questions: ${questions.length}`}
              </span>
            </div>
          </div>

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={isSavingExam}
            className="w-full py-4 bg-gradient-to-r from-[#C1121F] to-red-600 hover:from-red-600 hover:to-red-500 disabled:opacity-50 text-white font-black text-sm uppercase rounded-xl transition cursor-pointer shadow-[0_0_15px_rgba(193,18,31,0.4)] flex items-center justify-center gap-2"
          >
            {isSavingExam ? (
              <RefreshCw className="w-5 h-5 animate-spin text-[#FFD700]" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-[#FFD700]" />
            )}
            <span>
              {isSavingExam
                ? (isBn ? "পরীক্ষা ক্লাউডে সেভ হচ্ছে..." : "SAVING EXAM TO CLOUD...")
                : editingExamId
                ? (isBn ? "পরীক্ষা ও সকল প্রশ্ন আপডেট করুন (UPDATE EXAM)" : "UPDATE EXAM & QUESTIONS NOW")
                : (isBn ? "নতুন পরীক্ষা পাবলিশ করুন (PUBLISH EXAM)" : "PUBLISH EXAM MODEL TEST NOW")}
            </span>
          </button>
        </form>
      )}

      {/* TAB CONTENT: CLASSES MANAGEMENT (ADD, EDIT, LIVE TOGGLE & DIRECTORY) */}
      {activeTab === "add_class" && (
        <div className="space-y-8 font-mono text-xs">
          {/* Add / Edit Class Form */}
          <form
            onSubmit={handleSaveClassSubmit}
            className="bg-[#111111] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl relative"
          >
            {/* Header & Mode Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Video className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-lg font-black text-white uppercase font-display">
                    {editingClassId ? (isBn ? "✏️ ক্লাস এডিট করুন (Edit Class)" : "✏️ Edit Class") : (isBn ? "➕ নতুন লাইভ ক্লাস সিডিউল ও পোস্ট করুন" : "➕ Schedule & Publish Class")}
                  </h2>
                </div>
                <p className="text-xs text-gray-400 font-sans mt-0.5">
                  {isBn ? "Google Meet, YouTube Live বা রেকর্ডেড ক্লাস যুক্ত ও শিক্ষার্থীদের জন্য নিয়ন্ত্রণ করুন।" : "Configure live video sessions, Google Meet, YouTube Live, or recorded lectures."}
                </p>
              </div>

              {editingClassId && (
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold">
                    {isBn ? "এডিট মোড সক্রিয়" : "Editing Mode"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      playSound("click");
                      handleResetClassForm();
                    }}
                    className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    {isBn ? "বাতিল (Cancel)" : "Cancel"}
                  </button>
                </div>
              )}
            </div>

            {/* Title & Instructor */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-gray-300 font-bold uppercase block">
                  {isBn ? "ক্লাসের শিরোনাম (Class Title):" : "Class Title:"}
                </label>
                <input
                  type="text"
                  required
                  value={classTitle}
                  onChange={(e) => setClassTitle(e.target.value)}
                  placeholder="e.g. Organic Chemistry IUPAC Naming & Mechanism Masterclass"
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-300 font-bold uppercase block">
                  {isBn ? "শিক্ষক / মেন্টর (Instructor):" : "Instructor Name:"}
                </label>
                <input
                  type="text"
                  value={classInstructor}
                  onChange={(e) => setClassInstructor(e.target.value)}
                  placeholder="e.g. Dr. Nuwaisir Hoque"
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Subject, Chapter, Platform & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-gray-300 font-bold uppercase block">
                  {isBn ? "বিষয় (Subject):" : "Subject:"}
                </label>
                <select
                  value={classSubject}
                  onChange={(e) => setClassSubject(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-3 text-white focus:outline-none"
                >
                  <option value="All">All Subjects (সকল বিষয় / ওরিয়েন্টেশন)</option>
                  <option value="Biology">Biology (জীববিজ্ঞান)</option>
                  <option value="Chemistry">Chemistry (রসায়ন)</option>
                  <option value="Physics">Physics (পদার্থবিজ্ঞান)</option>
                  <option value="English">English (ইংরেজি)</option>
                  <option value="GK">GK (সাধারণ জ্ঞান)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-300 font-bold uppercase block">
                  {isBn ? "অধ্যায় (Chapter):" : "Chapter:"}
                </label>
                <input
                  type="text"
                  value={classChapter}
                  onChange={(e) => setClassChapter(e.target.value)}
                  placeholder="e.g. অধ্যায় ৩: কোষ রসায়ন"
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-3 text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-300 font-bold uppercase block">
                  {isBn ? "প্ল্যাটফর্ম (Platform):" : "Platform:"}
                </label>
                <select
                  value={classPlatform}
                  onChange={(e) => setClassPlatform(e.target.value as any)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-3 text-white focus:outline-none"
                >
                  <option value="dual">{isBn ? "Dual (Meet + YouTube)" : "Dual Stream (Both)"}</option>
                  <option value="google_meet">Google Meet</option>
                  <option value="youtube">YouTube Live Stream</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-300 font-bold uppercase block">
                  {isBn ? "ক্লাস স্ট্যাটাস (Status):" : "Status:"}
                </label>
                <select
                  value={classStatus}
                  onChange={(e) => {
                    const st = e.target.value as any;
                    setClassStatus(st);
                    setIsClassLive(st === "live_now");
                  }}
                  className={`w-full border rounded-xl px-3 py-3 font-bold focus:outline-none ${
                    classStatus === "live_now"
                      ? "bg-red-950/80 border-red-500 text-red-200"
                      : "bg-black/60 border-white/10 text-white"
                  }`}
                >
                  <option value="upcoming">{isBn ? "⏰ আসন্ন / সিডিউল্ড (Upcoming)" : "⏰ Upcoming / Scheduled"}</option>
                  <option value="live_now">{isBn ? "🔴 লাইভ চলছে (Live Now)" : "🔴 Live Now"}</option>
                  <option value="ended">{isBn ? "🏁 সমাপ্ত / রেকর্ডেড (Ended)" : "🏁 Ended / Recording"}</option>
                </select>
              </div>
            </div>

            {/* Date, Time & Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-gray-300 font-bold uppercase block">
                  {isBn ? "তারিখ (Date):" : "Class Date:"}
                </label>
                <input
                  type="date"
                  value={classDate}
                  onChange={(e) => setClassDate(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-300 font-bold uppercase block">
                  {isBn ? "সময় (Time):" : "Start Time:"}
                </label>
                <input
                  type="text"
                  value={classTime}
                  onChange={(e) => setClassTime(e.target.value)}
                  placeholder="e.g. 08:00 PM"
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-300 font-bold uppercase block">
                  {isBn ? "সময়কাল (Duration):" : "Duration (Mins):"}
                </label>
                <input
                  type="number"
                  min={15}
                  max={240}
                  value={classDurationMinutes}
                  onChange={(e) => setClassDurationMinutes(Number(e.target.value) || 60)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
                />
              </div>
            </div>

            {/* URLs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-gray-300 font-bold uppercase block">
                  {isBn ? "লাইভ স্ট্রিম বা গুগল মিট লিংক (Meet / Stream Link):" : "Google Meet / Stream Link:"}
                </label>
                <input
                  type="text"
                  value={classLiveUrl}
                  onChange={(e) => setClassLiveUrl(e.target.value)}
                  placeholder="e.g. https://meet.google.com/abc-defg-hij"
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-300 font-bold uppercase block">
                  {isBn ? "রেকর্ডিং লিংক (Replay URL - ক্লাসের পর):" : "Recording Replay URL (After Class):"}
                </label>
                <input
                  type="text"
                  value={classRecordingUrl}
                  onChange={(e) => setClassRecordingUrl(e.target.value)}
                  placeholder="e.g. https://youtube.com/watch?v=... or Drive link"
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-gray-300 font-bold uppercase block">
                {isBn ? "ক্লাসের বিবরণ ও টপিক (Description):" : "Class Description & Topics:"}
              </label>
              <textarea
                rows={2}
                value={classDesc}
                onChange={(e) => setClassDesc(e.target.value)}
                placeholder="Write summary of key topics to be covered..."
                className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="flex-1 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-black font-black text-sm uppercase rounded-xl transition cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2"
              >
                <Video className="w-4 h-4" />
                <span>
                  {editingClassId
                    ? (isBn ? "💾 ক্লাস আপডেট করুন (UPDATE CLASS)" : "UPDATE CLASS DETAILS")
                    : (isBn ? "🚀 নতুন ক্লাস পাবলিশ করুন (PUBLISH CLASS)" : "PUBLISH CLASS NOW")}
                </span>
              </button>

              {editingClassId && (
                <button
                  type="button"
                  onClick={handleResetClassForm}
                  className="px-6 py-4 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase rounded-xl transition cursor-pointer"
                >
                  {isBn ? "বাতিল" : "Cancel"}
                </button>
              )}
            </div>
          </form>

          {/* All Classes List & Management Directory */}
          <div className="bg-[#111111] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <h3 className="text-lg font-black text-white uppercase font-display flex items-center gap-2">
                  <Video className="w-5 h-5 text-emerald-400" />
                  <span>{isBn ? "কোর্সের সকল ক্লাসের তালিকা ও নিয়ন্ত্রণ" : "Course Classes Directory & Controls"}</span>
                </h3>
                <p className="text-gray-400 text-xs font-sans mt-0.5">
                  {isBn
                    ? "যেকোনো ক্লাসের তথ্য এডিট করুন, ১-ক্লিকে লাইভ শুরু/শেষ করুন অথবা মুছে ফেলুন।"
                    : "Edit class parameters, trigger 1-click live status, or remove sessions."}
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={classSearchTerm}
                    onChange={(e) => setClassSearchTerm(e.target.value)}
                    placeholder={isBn ? "ক্লাস খুঁজুন..." : "Search classes..."}
                    className="bg-black/60 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-white focus:outline-none text-xs"
                  />
                </div>

                <select
                  value={classFilterSubject}
                  onChange={(e) => setClassFilterSubject(e.target.value)}
                  className="bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none text-xs"
                >
                  <option value="all">{isBn ? "সকল বিষয়" : "All Subjects"}</option>
                  <option value="Biology">Biology</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Physics">Physics</option>
                  <option value="English">English</option>
                  <option value="GK">GK</option>
                </select>

                <select
                  value={classFilterStatus}
                  onChange={(e) => setClassFilterStatus(e.target.value as any)}
                  className="bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none text-xs"
                >
                  <option value="all">{isBn ? "সকল স্ট্যাটাস" : "All Status"}</option>
                  <option value="live_now">{isBn ? "🔴 লাইভ চলছে" : "🔴 Live Now"}</option>
                  <option value="upcoming">{isBn ? "⏰ নির্ধারিত" : "⏰ Upcoming"}</option>
                  <option value="ended">{isBn ? "🏁 সমাপ্ত / রেকর্ডেড" : "🏁 Ended"}</option>
                </select>
              </div>
            </div>

            {/* Classes Grid / Cards */}
            <div className="space-y-3 font-sans">
              {(() => {
                const currentBatchClasses = classes.filter((c) => {
                  const matchesCourse = !selectedCourseId || c.courseId === selectedCourseId;
                  const matchesSearch = !classSearchTerm || (c.title || "").toLowerCase().includes(classSearchTerm.toLowerCase());
                  const matchesSub = classFilterSubject === "all" || c.subject === classFilterSubject;
                  const isLive = c.status === "live_now" || c.isLive;
                  const matchesSt =
                    classFilterStatus === "all" ||
                    (classFilterStatus === "live_now" && isLive) ||
                    (classFilterStatus === "upcoming" && c.status === "upcoming" && !isLive) ||
                    (classFilterStatus === "ended" && c.status === "ended");
                  return matchesCourse && matchesSearch && matchesSub && matchesSt;
                });

                if (currentBatchClasses.length === 0) {
                  return (
                    <div className="p-10 text-center border-2 border-dashed border-white/10 rounded-2xl space-y-2 font-mono">
                      <Video className="w-8 h-8 text-gray-500 mx-auto" />
                      <p className="text-gray-400 text-xs">
                        {isBn ? "এই কোর্সের জন্য এখনও কোনো ক্লাস যুক্ত করা হয়নি।" : "No classes found for this course."}
                      </p>
                    </div>
                  );
                }

                return currentBatchClasses.map((cls) => {
                  const isLive = cls.status === "live_now" || cls.isLive;
                  const isEnded = cls.status === "ended";

                  return (
                    <div
                      key={cls.id}
                      className={`p-5 bg-black/60 border rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition shadow-sm ${
                        isLive
                          ? "border-red-500/60 bg-red-950/10 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                          : "border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {isLive ? (
                            <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase bg-red-600 text-white animate-pulse flex items-center gap-1 shadow-[0_0_10px_rgba(239,68,68,0.6)]">
                              <Radio className="w-3 h-3 animate-ping" />
                              <span>{isBn ? "🔴 লাইভ চলছে" : "🔴 LIVE NOW"}</span>
                            </span>
                          ) : isEnded ? (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">
                              {isBn ? "🏁 সমাপ্ত / রেকর্ডিং" : "🏁 ENDED"}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-sky-950/60 text-sky-300 border border-sky-500/30">
                              {isBn ? "⏰ আসন্ন ক্লাস" : "⏰ UPCOMING"}
                            </span>
                          )}

                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                            {cls.subject || "Medical"}
                          </span>

                          {cls.chapter && (
                            <span className="text-gray-400 text-xs font-mono bg-white/5 px-2 py-0.5 rounded">
                              {cls.chapter}
                            </span>
                          )}

                          <span className="text-gray-400 text-[11px] font-mono">
                            {cls.platform === "google_meet" ? "Google Meet" : cls.platform === "youtube" ? "YouTube Live" : "Dual Stream"}
                          </span>
                        </div>

                        <h4 className="text-base font-bold text-white tracking-wide">{cls.title}</h4>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 font-mono">
                          <span>
                            {isBn ? "শিক্ষক" : "Faculty"}: <strong className="text-white">{cls.instructor || "Teacher"}</strong>
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-amber-400" />
                            <span>{cls.date || "Scheduled"}</span>
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-sky-400" />
                            <span>{cls.time || "08:00 PM"} ({cls.durationMinutes || 60}m)</span>
                          </span>
                        </div>
                      </div>

                      {/* Action Toolbar */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-white/10 font-mono">
                        {/* 1-Click Live Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleClassLive(cls)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                            isLive
                              ? "bg-red-600/30 hover:bg-red-600 text-red-200 hover:text-white border border-red-500"
                              : "bg-red-600 hover:bg-red-500 text-white shadow-[0_0_10px_rgba(220,38,38,0.4)]"
                          }`}
                        >
                          {isLive ? (
                            <>
                              <Square className="w-3 h-3 fill-current" />
                              <span>{isBn ? "লাইভ শেষ করুন" : "End Live"}</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3 fill-white" />
                              <span>{isBn ? "🔴 লাইভ শুরু করুন" : "🔴 Go Live"}</span>
                            </>
                          )}
                        </button>

                        {/* Edit Class Button */}
                        <button
                          type="button"
                          onClick={() => {
                            handleEditClass(cls);
                            window.scrollTo({ top: 400, behavior: "smooth" });
                          }}
                          className="px-3 py-1.5 bg-[#C1121F]/20 hover:bg-[#C1121F]/40 text-[#FFD700] border border-[#C1121F]/50 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-[#FFD700]" />
                          <span>{isBn ? "এডিট" : "Edit"}</span>
                        </button>

                        {/* Test / Join Link */}
                        {(cls.liveUrl || cls.googleMeetUrl || cls.recordingUrl) && (
                          <a
                            href={cls.liveUrl || cls.googleMeetUrl || cls.recordingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                            <span>{isBn ? "লিংক" : "Link"}</span>
                          </a>
                        )}

                        {/* Delete Class Button */}
                        {onDeleteClass && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(isBn ? `আপনি কি "${cls.title}" ক্লাসটি ডিলিট করতে চান?` : `Delete class "${cls.title}"?`)) {
                                playSound("click");
                                onDeleteClass(cls.id);
                                setSaveSuccessMessage(isBn ? "ক্লাস ডিলিট করা হয়েছে।" : "Class deleted.");
                                setTimeout(() => setSaveSuccessMessage(""), 3000);
                              }
                            }}
                            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{isBn ? "ডিলিট" : "Delete"}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: STUDY NOTES & MATERIALS MANAGEMENT (ADD, EDIT & DIRECTORY) */}
      {activeTab === "add_material" && (
        <div className="space-y-8 font-mono text-xs">
          {/* Add / Edit Material Form */}
          <form
            onSubmit={handleSaveMaterialSubmit}
            className="bg-[#111111] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-sky-400" />
                  <h2 className="text-lg font-black text-white uppercase font-display">
                    {editingMatId ? (isBn ? "✏️ নোটস ও শিট এডিট করুন" : "✏️ Edit Study Material") : (isBn ? "➕ লেকচার শিট ও PDF নোটস আপলোড" : "➕ Upload Notes & Sheets")}
                  </h2>
                </div>
                <p className="text-xs text-gray-400 font-sans mt-0.5">
                  {isBn ? "শিক্ষার্থীদের জন্য হ্যান্ডনোট, লেকচার শিট, প্র্যাকটিস শিট সরাসরি আপলোড বা লিংক করুন।" : "Upload PDF notes, lecture handouts, or external Drive resources for students."}
                </p>
              </div>

              {editingMatId && (
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold">
                    {isBn ? "এডিট মোড সক্রিয়" : "Editing Mode"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      playSound("click");
                      handleResetMaterialForm();
                    }}
                    className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    {isBn ? "বাতিল (Cancel)" : "Cancel"}
                  </button>
                </div>
              )}
            </div>

            {/* Direct Device Upload Dropzone */}
            <div className="space-y-2">
              <label className="text-gray-300 font-bold uppercase block">
                {isBn ? "সরাসরি ডিভাইস থেকে ফাইল আপলোড (PDF / Sheet / Handout):" : "Direct Device Upload (PDF / Document):"}
              </label>
              <div className="relative border-2 border-dashed border-[#C1121F]/40 hover:border-[#C1121F] rounded-2xl p-6 text-center transition bg-black/60 group">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      playSound("click");
                      handleDirectFileUpload(file, (dataUrl, fileName, fileSizeStr) => {
                        setMatUrl(dataUrl);
                        setMatFileName(fileName);
                        setMatFileSize(fileSizeStr);
                        if (!matTitle) {
                          setMatTitle(fileName.replace(/\.[^/.]+$/, ""));
                        }
                      });
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="flex flex-col items-center gap-2">
                  <FileUp className="w-10 h-10 text-[#C1121F] group-hover:scale-110 transition" />
                  <span className="text-sm text-white font-bold">
                    {matFileName ? `Selected: ${matFileName}` : (isBn ? "ক্লিক করুন অথবা ফাইল ড্র্যাগ করে ছাড়ুন" : "Click or Drag PDF / Lecture Sheet File Here")}
                  </span>
                  <span className="text-xs text-gray-400">
                    {matFileName ? `File Size: ${matFileSize}` : (isBn ? "PDF, DOCX, PPTX, JPG, PNG ফাইল সাপোর্ট করে (Max 50MB)" : "Supports PDF, DOCX, PPTX, JPG, PNG (Max 50MB)")}
                  </span>
                  {matFileName && (
                    <span className="mt-2 px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> {isBn ? "ফাইল প্রস্তুত" : "File Ready"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Title, Subject, Chapter & Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-gray-300 font-bold uppercase block">
                  {isBn ? "নোটের শিরোনাম (Material Title):" : "Material Title:"}
                </label>
                <input
                  type="text"
                  required
                  value={matTitle}
                  onChange={(e) => setMatTitle(e.target.value)}
                  placeholder="e.g. Abul Hasan Sir Biology High-Yield Master Sheet"
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-300 font-bold uppercase block">
                  {isBn ? "ক্যাটাগরি বা টাইপ (Type):" : "Resource Type:"}
                </label>
                <select
                  value={matType}
                  onChange={(e) => setMatType(e.target.value as any)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
                >
                  <option value="pdf">PDF Document (পিডিএফ)</option>
                  <option value="lecture_sheet">Lecture Sheet (লেকচার শিট)</option>
                  <option value="practice_sheet">Practice Sheet (অনুশীলনী শিট)</option>
                  <option value="handout">Special Handout (হ্যান্ডনোট)</option>
                  <option value="note">Short Revision Note</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-gray-300 font-bold uppercase block">
                  {isBn ? "বিষয় (Subject):" : "Subject:"}
                </label>
                <select
                  value={matSubject}
                  onChange={(e) => setMatSubject(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
                >
                  <option value="All">All Subjects (সকল বিষয়)</option>
                  <option value="Biology">Biology (জীববিজ্ঞান)</option>
                  <option value="Chemistry">Chemistry (রসায়ন)</option>
                  <option value="Physics">Physics (পদার্থবিজ্ঞান)</option>
                  <option value="English">English (ইংরেজি)</option>
                  <option value="GK">GK (সাধারণ জ্ঞান)</option>
                  <option value="General">General Medical Sheet</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-300 font-bold uppercase block">
                  {isBn ? "অধ্যায় (Chapter):" : "Chapter:"}
                </label>
                <input
                  type="text"
                  value={matChapter}
                  onChange={(e) => setMatChapter(e.target.value)}
                  placeholder="e.g. অধ্যায় ২: প্রাণীর পরিচিতি"
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-300 font-bold uppercase block">
                  {isBn ? "ফাইল সাইজ (File Size):" : "File Size:"}
                </label>
                <input
                  type="text"
                  value={matFileSize}
                  onChange={(e) => setMatFileSize(e.target.value)}
                  placeholder="e.g. 5.2 MB"
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
                />
              </div>
            </div>

            {/* External URL */}
            <div className="space-y-1.5">
              <label className="text-gray-300 font-bold uppercase block">
                {isBn ? "অথবা গুগল ড্রাইভ / এক্সটার্নাল লিংক (Web PDF / Google Drive URL):" : "Or External Resource Link (Google Drive / Web PDF URL):"}
              </label>
              <input
                type="text"
                value={matUrl}
                onChange={(e) => setMatUrl(e.target.value)}
                placeholder="https://drive.google.com/file/d/... or web link"
                className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="flex-1 py-4 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-black text-sm uppercase rounded-xl transition cursor-pointer shadow-[0_0_15px_rgba(14,165,233,0.4)] flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                <span>
                  {editingMatId
                    ? (isBn ? "💾 নোটস আপডেট করুন (UPDATE NOTES)" : "UPDATE STUDY MATERIAL")
                    : (isBn ? "🚀 লেকচার শিট ও নোটস পাবলিশ করুন" : "UPLOAD & PUBLISH NOTES NOW")}
                </span>
              </button>

              {editingMatId && (
                <button
                  type="button"
                  onClick={handleResetMaterialForm}
                  className="px-6 py-4 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase rounded-xl transition cursor-pointer"
                >
                  {isBn ? "বাতিল" : "Cancel"}
                </button>
              )}
            </div>
          </form>

          {/* All Study Materials & Notes List */}
          <div className="bg-[#111111] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <h3 className="text-lg font-black text-white uppercase font-display flex items-center gap-2">
                  <FileText className="w-5 h-5 text-sky-400" />
                  <span>{isBn ? "কোর্সের সকল নোটস ও শিটের তালিকা" : "Course Materials & Study Sheets Directory"}</span>
                </h3>
                <p className="text-gray-400 text-xs font-sans mt-0.5">
                  {isBn
                    ? "আপলোড করা যেকোনো শিট এডিট করুন, প্রিভিউ দেখুন অথবা মুছে ফেলুন।"
                    : "Review, edit metadata, open preview, or delete study materials."}
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={matSearchTerm}
                    onChange={(e) => setMatSearchTerm(e.target.value)}
                    placeholder={isBn ? "নোটস খুঁজুন..." : "Search notes..."}
                    className="bg-black/60 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-white focus:outline-none text-xs"
                  />
                </div>

                <select
                  value={matFilterSubject}
                  onChange={(e) => setMatFilterSubject(e.target.value)}
                  className="bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none text-xs"
                >
                  <option value="all">{isBn ? "সকল বিষয়" : "All Subjects"}</option>
                  <option value="Biology">Biology</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Physics">Physics</option>
                  <option value="English">English</option>
                  <option value="GK">GK</option>
                  <option value="General">General</option>
                </select>
              </div>
            </div>

            {/* Materials Grid / Cards */}
            <div className="space-y-3 font-sans">
              {(() => {
                const currentBatchMaterials = materials.filter((m) => {
                  const matchesCourse = !selectedCourseId || m.courseId === selectedCourseId;
                  const matchesSearch = !matSearchTerm || (m.title || "").toLowerCase().includes(matSearchTerm.toLowerCase());
                  const matchesSub = matFilterSubject === "all" || m.subject === matFilterSubject;
                  return matchesCourse && matchesSearch && matchesSub;
                });

                if (currentBatchMaterials.length === 0) {
                  return (
                    <div className="p-10 text-center border-2 border-dashed border-white/10 rounded-2xl space-y-2 font-mono">
                      <FileText className="w-8 h-8 text-gray-500 mx-auto" />
                      <p className="text-gray-400 text-xs">
                        {isBn ? "এই কোর্সের জন্য এখনও কোনো নোটস আপলোড করা হয়নি।" : "No study materials uploaded for this course yet."}
                      </p>
                    </div>
                  );
                }

                return currentBatchMaterials.map((mat) => {
                  return (
                    <div
                      key={mat.id}
                      className="p-5 bg-black/60 border border-white/10 hover:border-white/20 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition shadow-sm"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase bg-sky-950/60 text-sky-300 border border-sky-500/30 flex items-center gap-1">
                            <FileText className="w-3 h-3 text-sky-400" />
                            <span>{mat.type ? mat.type.toUpperCase() : "PDF"}</span>
                          </span>

                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                            {mat.subject || "General"}
                          </span>

                          {mat.chapter && (
                            <span className="text-gray-400 text-xs font-mono bg-white/5 px-2 py-0.5 rounded">
                              {mat.chapter}
                            </span>
                          )}
                        </div>

                        <h4 className="text-base font-bold text-white tracking-wide">{mat.title}</h4>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 font-mono">
                          <span>
                            {isBn ? "সাইজ" : "Size"}: <strong className="text-white">{mat.fileSize || "PDF"}</strong>
                          </span>
                          {mat.createdAt && (
                            <>
                              <span>•</span>
                              <span>{new Date(mat.createdAt).toLocaleDateString()}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Action Toolbar */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-white/10 font-mono">
                        {/* View / Open PDF Button */}
                        {mat.fileUrl && (
                          <a
                            href={mat.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-1.5 bg-sky-500/15 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-sky-400" />
                            <span>{isBn ? "ওপেন / প্রিভিউ" : "Preview"}</span>
                          </a>
                        )}

                        {/* Edit Material Button */}
                        <button
                          type="button"
                          onClick={() => {
                            handleEditMaterial(mat);
                            window.scrollTo({ top: 400, behavior: "smooth" });
                          }}
                          className="px-3 py-1.5 bg-[#C1121F]/20 hover:bg-[#C1121F]/40 text-[#FFD700] border border-[#C1121F]/50 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-[#FFD700]" />
                          <span>{isBn ? "এডিট" : "Edit"}</span>
                        </button>

                        {/* Delete Material Button */}
                        {onDeleteMaterial && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(isBn ? `আপনি কি "${mat.title}" নোটসটি ডিলিট করতে চান?` : `Delete note "${mat.title}"?`)) {
                                playSound("click");
                                onDeleteMaterial(mat.id);
                                setSaveSuccessMessage(isBn ? "নোটস ডিলিট করা হয়েছে।" : "Note deleted.");
                                setTimeout(() => setSaveSuccessMessage(""), 3000);
                              }
                            }}
                            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{isBn ? "ডিলিট" : "Delete"}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: NOTICE MANAGEMENT (ADD, EDIT, DELETE, PIN) */}
      {activeTab === "add_announcement" && (
        <div className="space-y-6 font-mono text-xs">
          {/* Header & Metrics */}
          <div className="bg-[#111111] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-2xl bg-[#C1121F]/20 text-[#FFD700] border border-[#C1121F]/40">
                  <Bell className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-lg font-black text-white uppercase font-display tracking-wide">
                    {isBn ? "📢 নোটিশ ও বিজ্ঞপ্তি ম্যানেজমেন্ট" : "📢 Notice Board Management"}
                  </h2>
                  <p className="text-xs text-gray-400 font-sans mt-0.5">
                    {isBn
                      ? "কোর্সের শিক্ষার্থীদের জন্য জরুরি নোটিশ তৈরি, এডিট, পিন এবং ডিলিট করুন।"
                      : "Create, edit, pin, and delete course notices and announcements."}
                  </p>
                </div>
              </div>

              {editingAncId && (
                <button
                  type="button"
                  onClick={handleCancelEditAnnouncement}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition cursor-pointer font-sans"
                >
                  {isBn ? "❌ এডিট বাতিল করুন" : "Cancel Edit"}
                </button>
              )}
            </div>

            {/* Metrics Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-black/40 border border-white/10 rounded-2xl">
                <span className="text-[11px] text-gray-400 block font-sans">{isBn ? "মোট নোটিশ" : "Total Notices"}</span>
                <span className="text-xl font-black text-white font-mono">
                  {announcements.filter((a) => !selectedCourseId || a.courseId === selectedCourseId).length}
                </span>
              </div>
              <div className="p-3.5 bg-black/40 border border-white/10 rounded-2xl">
                <span className="text-[11px] text-gray-400 block font-sans">{isBn ? "পিন করা নোটিশ" : "Pinned Notices"}</span>
                <span className="text-xl font-black text-[#FFD700] font-mono">
                  {announcements.filter((a) => (!selectedCourseId || a.courseId === selectedCourseId) && a.isPinned).length}
                </span>
              </div>
              <div className="p-3.5 bg-black/40 border border-white/10 rounded-2xl">
                <span className="text-[11px] text-gray-400 block font-sans">{isBn ? "জরুরি নোটিশ" : "High Priority"}</span>
                <span className="text-xl font-black text-red-400 font-mono">
                  {announcements.filter((a) => (!selectedCourseId || a.courseId === selectedCourseId) && a.priority === "high").length}
                </span>
              </div>
              <div className="p-3.5 bg-black/40 border border-white/10 rounded-2xl">
                <span className="text-[11px] text-gray-400 block font-sans">{isBn ? "টার্গেট ব্যাচ সংখ্যা" : "Batches"}</span>
                <span className="text-xl font-black text-sky-400 font-mono">
                  {courseBatches.length}
                </span>
              </div>
            </div>
          </div>

          {/* Feedback message banner */}
          {ancFeedbackMessage && (
            <div className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 px-5 py-3 rounded-2xl flex items-center gap-2 font-bold font-sans animate-fade-in shadow-lg">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{ancFeedbackMessage}</span>
            </div>
          )}

          {/* Notice Form (Add or Edit) */}
          <div ref={noticeFormRef} className="bg-[#111111] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                {editingAncId ? (
                  <>
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold">
                      ✏️ EDIT MODE
                    </span>
                    <h3 className="text-base font-black text-white uppercase font-display">
                      {isBn ? "নোটিশ এডিট করুন" : "Edit Notice"}
                    </h3>
                  </>
                ) : (
                  <>
                    <span className="px-2.5 py-1 rounded-lg bg-[#C1121F]/20 text-[#FFD700] border border-[#C1121F]/40 text-[11px] font-bold">
                      + NEW NOTICE
                    </span>
                    <h3 className="text-base font-black text-white uppercase font-display">
                      {isBn ? "নতুন নোটিশ পোস্ট করুন" : "Broadcast New Notice"}
                    </h3>
                  </>
                )}
              </div>

              {editingAncId && (
                <button
                  type="button"
                  onClick={handleCancelEditAnnouncement}
                  className="text-xs text-gray-400 hover:text-white underline cursor-pointer"
                >
                  {isBn ? "বাতিল" : "Cancel"}
                </button>
              )}
            </div>

            <form onSubmit={handleCreateAnnouncementSubmit} className="space-y-4 font-mono">
              <div className="space-y-1.5">
                <label className="text-gray-300 font-bold uppercase block">
                  {isBn ? "নোটিশের শিরোনাম (Headline):" : "Notice Headline:"}
                </label>
                <input
                  type="text"
                  required
                  value={ancTitle}
                  onChange={(e) => setAncTitle(e.target.value)}
                  placeholder={isBn ? "e.g. 🚨 মেগা মডেল টেস্ট রুটিন ও লাইভ পরীক্ষার সময়সূচি" : "e.g. 🚨 Mega Model Test Routine Update"}
                  className="w-full bg-black/60 border border-white/15 focus:border-[#FFD700] rounded-xl px-4 py-3 text-white focus:outline-none font-sans font-bold text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-300 font-bold uppercase block">
                  {isBn ? "নোটিশের বিস্তারিত বিবরণ (Message):" : "Notice Message Details:"}
                </label>
                <textarea
                  rows={4}
                  required
                  value={ancContent}
                  onChange={(e) => setAncContent(e.target.value)}
                  placeholder={isBn ? "সকল শিক্ষার্থীর উদ্দেশ্যে বিস্তারিত নির্দেশনা লিখুন..." : "Enter full announcement text..."}
                  className="w-full bg-black/60 border border-white/15 focus:border-[#FFD700] rounded-xl px-4 py-3 text-white focus:outline-none font-sans text-xs leading-relaxed"
                />
              </div>

              {/* Priority & Pinned & Batch Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                {/* Priority Selector */}
                <div className="space-y-1.5">
                  <label className="text-gray-300 font-bold block">
                    {isBn ? "অগ্রাধিকার (Priority):" : "Priority:"}
                  </label>
                  <select
                    value={ancPriority}
                    onChange={(e) => setAncPriority(e.target.value as any)}
                    className="w-full bg-[#181818] border border-white/15 rounded-xl px-3 py-2.5 text-white font-bold focus:outline-none text-xs"
                  >
                    <option value="high">🔴 জরুরি (High / Urgent)</option>
                    <option value="normal">🟢 সাধারণ (Normal)</option>
                  </select>
                </div>

                {/* Target Batch */}
                <div className="space-y-1.5">
                  <label className="text-gray-300 font-bold block">
                    {isBn ? "টার্গেট ব্যাচ (Target Batch):" : "Target Batch:"}
                  </label>
                  <select
                    value={ancBatchId}
                    onChange={(e) => setAncBatchId(e.target.value)}
                    className="w-full bg-[#181818] border border-white/15 rounded-xl px-3 py-2.5 text-white font-bold focus:outline-none text-xs"
                  >
                    <option value="all">{isBn ? "সকল ব্যাচের জন্য (All Batches)" : "All Batches"}</option>
                    {courseBatches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Pinned Toggle */}
                <div className="space-y-1.5 flex flex-col justify-end">
                  <label
                    onClick={() => setAncIsPinned(!ancIsPinned)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border transition cursor-pointer select-none ${
                      ancIsPinned
                        ? "bg-amber-500/20 border-amber-500/50 text-[#FFD700]"
                        : "bg-[#181818] border-white/15 text-gray-400 hover:text-white"
                    }`}
                  >
                    <Pin className={`w-4 h-4 ${ancIsPinned ? "fill-current text-[#FFD700]" : ""}`} />
                    <span className="font-bold text-xs">
                      {ancIsPinned
                        ? isBn ? "📌 শীর্ষে পিন করা থাকবে" : "📌 Pinned to Top"
                        : isBn ? "শীর্ষে পিন করুন" : "Pin to Top"}
                    </span>
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  className={`flex-1 py-3.5 rounded-xl font-black text-sm uppercase transition cursor-pointer flex items-center justify-center gap-2 shadow-lg ${
                    editingAncId
                      ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-amber-950/50"
                      : "bg-gradient-to-r from-[#FFD700] to-amber-500 hover:from-amber-400 hover:to-amber-500 text-black shadow-amber-950/40"
                  }`}
                >
                  {editingAncId ? <Save className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                  <span>
                    {editingAncId
                      ? (isBn ? "নোটিশ আপডেট সংরক্ষণ করুন" : "SAVE UPDATED NOTICE")
                      : (isBn ? "শিক্ষার্থীদের কাছে নোটিশ পাঠান" : "BROADCAST NOTICE NOW")}
                  </span>
                </button>

                {editingAncId && (
                  <button
                    type="button"
                    onClick={handleCancelEditAnnouncement}
                    className="px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition cursor-pointer"
                  >
                    {isBn ? "বাতিল" : "Cancel"}
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Notices List Section */}
          <div className="bg-[#111111] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <h3 className="text-base font-black text-white uppercase font-display tracking-wide flex items-center gap-2">
                <span>{isBn ? "কোর্সের প্রকাশিত নোটিশ তালিকা" : "Published Notices List"}</span>
                <span className="text-xs font-mono text-gray-400">
                  ({announcements.filter((a) => !selectedCourseId || a.courseId === selectedCourseId).length})
                </span>
              </h3>

              {/* Search & Filter Controls */}
              <div className="flex flex-wrap items-center gap-2 font-sans text-xs">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={ancSearchTerm}
                    onChange={(e) => setAncSearchTerm(e.target.value)}
                    placeholder={isBn ? "নোটিশ খুঁজুন..." : "Search notices..."}
                    className="bg-[#181818] border border-white/10 focus:border-[#FFD700] rounded-xl pl-8 pr-3 py-1.5 text-white focus:outline-none text-xs"
                  />
                </div>

                <select
                  value={ancFilterBatch}
                  onChange={(e) => setAncFilterBatch(e.target.value)}
                  className="bg-[#181818] border border-white/10 rounded-xl px-3 py-1.5 text-white focus:outline-none text-xs"
                >
                  <option value="all">{isBn ? "সকল ব্যাচ" : "All Batches"}</option>
                  {courseBatches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notices Cards */}
            <div className="space-y-4 font-sans">
              {(() => {
                const currentNotices = announcements
                  .filter((a) => {
                    const matchesCourse = !selectedCourseId || a.courseId === selectedCourseId;
                    const matchesBatch = ancFilterBatch === "all" || !a.batchId || a.batchId === ancFilterBatch;
                    const matchesSearch =
                      !ancSearchTerm ||
                      a.title.toLowerCase().includes(ancSearchTerm.toLowerCase()) ||
                      a.content.toLowerCase().includes(ancSearchTerm.toLowerCase());
                    return matchesCourse && matchesBatch && matchesSearch;
                  })
                  .sort((a, b) => {
                    // Pinned notices first, then newest
                    if (a.isPinned && !b.isPinned) return -1;
                    if (!a.isPinned && b.isPinned) return 1;
                    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
                  });

                if (currentNotices.length === 0) {
                  return (
                    <div className="p-10 text-center border-2 border-dashed border-white/10 rounded-2xl space-y-2 font-mono">
                      <Bell className="w-8 h-8 text-gray-500 mx-auto" />
                      <p className="text-gray-400 text-xs">
                        {ancSearchTerm
                          ? isBn
                            ? "কোনো নোটিশ খুঁজে পাওয়া যায়নি।"
                            : "No notices match your search."
                          : isBn
                          ? "এই কোর্সের জন্য এখনও কোনো নোটিশ পোস্ট করা হয়নি।"
                          : "No notices posted for this course yet."}
                      </p>
                    </div>
                  );
                }

                return currentNotices.map((anc) => {
                  const targetBatch = courseBatches.find((b) => b.id === anc.batchId);
                  const isHighPriority = anc.priority === "high";

                  return (
                    <div
                      key={anc.id}
                      className={`p-5 rounded-2xl border transition relative space-y-3 font-mono text-xs ${
                        anc.isPinned
                          ? "bg-gradient-to-r from-amber-950/20 via-black/80 to-black border-amber-500/40 shadow-lg shadow-amber-950/20"
                          : "bg-black/60 border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {anc.isPinned && (
                              <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase bg-amber-500/20 text-[#FFD700] border border-amber-500/40 flex items-center gap-1">
                                <Pin className="w-3 h-3 fill-current" />
                                <span>{isBn ? "পিন করা" : "PINNED"}</span>
                              </span>
                            )}

                            {isHighPriority ? (
                              <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase bg-red-950/60 text-red-400 border border-red-500/30">
                                🔴 {isBn ? "জরুরি" : "HIGH PRIORITY"}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                                🟢 {isBn ? "সাধারণ" : "NORMAL"}
                              </span>
                            )}

                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono text-gray-400 bg-white/5 border border-white/10">
                              {targetBatch ? targetBatch.name : isBn ? "সকল ব্যাচ" : "All Batches"}
                            </span>

                            {anc.createdAt && (
                              <span className="text-[11px] text-gray-500 font-sans">
                                {new Date(anc.createdAt).toLocaleDateString()} {new Date(anc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>

                          <h4 className="text-base font-bold text-white font-sans tracking-wide pt-1">
                            {anc.title}
                          </h4>

                          <p className="text-xs text-gray-300 font-sans whitespace-pre-line leading-relaxed">
                            {anc.content}
                          </p>

                          <div className="text-[11px] text-gray-500 font-sans pt-1">
                            {isBn ? "পোস্টকারী:" : "Posted by:"} <strong className="text-gray-300">{anc.authorName}</strong> ({anc.authorRole || "Mentor"})
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5 self-end sm:self-start shrink-0 pt-2 sm:pt-0 font-sans">
                          {/* Pin/Unpin Button */}
                          <button
                            type="button"
                            onClick={() => handleTogglePinAnnouncement(anc)}
                            title={anc.isPinned ? "Unpin notice" : "Pin notice to top"}
                            className={`p-2 rounded-xl border transition cursor-pointer ${
                              anc.isPinned
                                ? "bg-amber-500/20 text-[#FFD700] border-amber-500/40 hover:bg-amber-500/30"
                                : "bg-white/5 text-gray-400 hover:text-white border-white/10"
                            }`}
                          >
                            {anc.isPinned ? <Pin className="w-4 h-4 fill-current" /> : <Pin className="w-4 h-4" />}
                          </button>

                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => handleStartEditAnnouncement(anc)}
                            title="Edit notice"
                            className="px-3 py-1.5 bg-[#C1121F]/20 hover:bg-[#C1121F]/40 text-[#FFD700] border border-[#C1121F]/50 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-[#FFD700]" />
                            <span>{isBn ? "এডিট" : "Edit"}</span>
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => setAncDeleteConfirmId(anc.id)}
                            title="Delete notice"
                            className="p-2 bg-red-500/10 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-xl transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Notice Delete Confirmation Modal */}
          {ancDeleteConfirmId && (
            <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 font-sans">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#111111] border border-white/20 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl"
              >
                <div className="flex items-center gap-3 text-red-500">
                  <div className="p-3 rounded-2xl bg-red-500/20 border border-red-500/30">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white uppercase font-display">
                      {isBn ? "নোটিশ মুছে ফেলতে চান?" : "Delete Announcement?"}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {isBn ? "এই নোটিশটি স্থায়ীভাবে মুছে ফেলা হবে।" : "This notice will be permanently deleted."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setAncDeleteConfirmId(null)}
                    className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    {isBn ? "বাতিল" : "Cancel"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteAnnouncement(ancDeleteConfirmId)}
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase rounded-xl transition cursor-pointer shadow-lg shadow-red-950/50"
                  >
                    {isBn ? "হ্যাঁ, ডিলিট করুন" : "Yes, Delete"}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: PAYMENT VERIFICATION */}
      {activeTab === "payment_verification" && (
        <div className="space-y-6 font-mono text-xs">
          {/* Header & Stats Cards */}
          <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h2 className="text-lg font-black text-white uppercase font-display flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#FFD700]" />
                  <span>পেমেন্ট ভেরিফিকেশন প্যানেল (Payment Verification)</span>
                </h2>
                <p className="text-gray-400 text-xs mt-1">
                  শিক্ষার্থীদের প্রেরিত bKash/Nagad/Rocket ট্রানজেকশন আইডি যাচাই করে কোর্সে ভর্তি অ্যাপ্রুভ করুন।
                </p>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1.5 bg-black/60 p-1.5 rounded-xl border border-white/10">
                {(["All", "Pending", "Approved", "Rejected"] as const).map((st) => {
                  const count =
                    st === "All"
                      ? paymentRequests.length
                      : paymentRequests.filter((p) => p.status === st).length;
                  return (
                    <button
                      key={st}
                      onClick={() => {
                        playSound("click");
                        setPayFilter(st);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        payFilter === st
                          ? "bg-[#C1121F] text-white"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      <span>{st}</span>
                      <span className="bg-black/40 px-1.5 py-0.2 rounded-md text-[10px] text-[#FFD700]">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={paySearch}
                onChange={(e) => setPaySearch(e.target.value)}
                placeholder="Search by TrxID, Phone Number, Student Email or Plan..."
                className="w-full bg-black/60 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-[#C1121F]"
              />
            </div>
          </div>

          {/* Payment Requests List */}
          <div className="bg-[#111111] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            {paymentRequests.filter((p) => {
              if (payFilter !== "All" && p.status !== payFilter) return false;
              if (paySearch.trim()) {
                const term = paySearch.toLowerCase();
                const matchTrx = (p.transactionId || "").toLowerCase().includes(term);
                const matchEmail = (p.userEmail || "").toLowerCase().includes(term);
                const matchPhone = (p.senderNumber || "").toLowerCase().includes(term);
                const matchName = (p.userName || "").toLowerCase().includes(term);
                return matchTrx || matchEmail || matchPhone || matchName;
              }
              return true;
            }).length === 0 ? (
              <div className="p-12 text-center text-gray-400 space-y-3">
                <ShieldCheck className="w-10 h-10 text-gray-600 mx-auto" />
                <p className="text-sm font-bold text-gray-300">কোনো পেমেন্ট রিকোয়েস্ট পাওয়া যায়নি</p>
                <p className="text-xs text-gray-500">
                  শিক্ষার্থীরা ভর্তি ফর্মে পেমেন্ট সাবমিট করলে এখানে দেখাবে।
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-black/60 border-b border-white/10 text-[#FFD700] uppercase text-[10px]">
                      <th className="p-4 font-bold">Student</th>
                      <th className="p-4 font-bold">Method & TrxID</th>
                      <th className="p-4 font-bold">Amount</th>
                      <th className="p-4 font-bold">Course / Plan</th>
                      <th className="p-4 font-bold">Submitted Date</th>
                      <th className="p-4 font-bold">Status</th>
                      <th className="p-4 font-bold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {paymentRequests
                      .filter((p) => {
                        if (payFilter !== "All" && p.status !== payFilter) return false;
                        if (paySearch.trim()) {
                          const term = paySearch.toLowerCase();
                          const matchTrx = (p.transactionId || "").toLowerCase().includes(term);
                          const matchEmail = (p.userEmail || "").toLowerCase().includes(term);
                          const matchPhone = (p.senderNumber || "").toLowerCase().includes(term);
                          const matchName = (p.userName || "").toLowerCase().includes(term);
                          return matchTrx || matchEmail || matchPhone || matchName;
                        }
                        return true;
                      })
                      .map((req) => (
                        <tr key={req.id} className="hover:bg-white/5 transition">
                          <td className="p-4">
                            <div className="font-bold text-white text-xs">{req.userName || req.userEmail}</div>
                            <div className="text-[10px] text-gray-400">{req.userEmail}</div>
                            {req.senderNumber && (
                              <div className="text-[10px] text-emerald-400 font-mono">
                                Sender: {req.senderNumber}
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            <span className="inline-block px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold uppercase mb-1">
                              {req.paymentMethod || "bKash"}
                            </span>
                            <div className="font-mono text-xs font-bold text-[#FFD700] tracking-wider">
                              {req.transactionId || "N/A"}
                            </div>
                          </td>
                          <td className="p-4 font-bold text-white text-xs">
                            ৳{req.amount}
                          </td>
                          <td className="p-4 text-xs text-gray-300">
                            {req.courseTitle || req.selectedPlan || "Medical Course"}
                          </td>
                          <td className="p-4 text-[10px] text-gray-400">
                            {req.submissionDate
                              ? new Date(req.submissionDate).toLocaleString()
                              : "N/A"}
                          </td>
                          <td className="p-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                req.status === "Approved"
                                  ? "bg-emerald-950 text-emerald-400 border border-emerald-500/40"
                                  : req.status === "Rejected"
                                  ? "bg-red-950 text-red-400 border border-red-500/40"
                                  : "bg-amber-950 text-amber-300 border border-amber-500/40 animate-pulse"
                              }`}
                            >
                              {req.status || "Pending"}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => {
                                playSound("click");
                                setSelectedPayReq(req);
                                setTeacherNote(req.adminNotes || "");
                              }}
                              className="px-3 py-1.5 bg-[#C1121F] hover:bg-red-700 text-white rounded-lg font-bold text-[11px] transition cursor-pointer"
                            >
                              Inspect & Verify
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Verification Modal Dialog */}
          {selectedPayReq && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#111111] border border-white/20 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl relative"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <h3 className="text-base font-black text-white uppercase font-display flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[#FFD700]" />
                    <span>পেমেন্ট ভেরিফাই করুন (Verify Payment)</span>
                  </h3>
                  <button
                    onClick={() => setSelectedPayReq(null)}
                    className="text-gray-400 hover:text-white text-lg font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3 bg-black/50 p-4 rounded-2xl border border-white/10 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Student Name:</span>
                    <span className="font-bold text-white">{selectedPayReq.userName || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Student Email:</span>
                    <span className="font-bold text-white">{selectedPayReq.userEmail}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Payment Method:</span>
                    <span className="font-bold text-[#FFD700] uppercase">{selectedPayReq.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Sender Number:</span>
                    <span className="font-bold text-emerald-400">{selectedPayReq.senderNumber || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Transaction ID (TrxID):</span>
                    <span className="font-mono font-bold text-[#FFD700] text-sm bg-black/60 px-2 py-0.5 rounded border border-[#FFD700]/30">
                      {selectedPayReq.transactionId}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Amount Received:</span>
                    <span className="font-extrabold text-white text-sm">৳{selectedPayReq.amount}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-gray-300 font-bold uppercase block text-xs">
                    Admin / Teacher Verification Note:
                  </label>
                  <input
                    type="text"
                    value={teacherNote}
                    onChange={(e) => setTeacherNote(e.target.value)}
                    placeholder="e.g. Received via bKash Merchant account"
                    className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white text-xs focus:outline-none focus:border-[#C1121F]"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handleTeacherApprovePayment(selectedPayReq)}
                    className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase rounded-xl transition cursor-pointer shadow-lg flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve & Grant Course</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTeacherRejectPayment(selectedPayReq)}
                    className="py-3.5 px-5 bg-red-950/80 hover:bg-red-900 border border-red-500/40 text-red-300 font-bold text-xs uppercase rounded-xl transition cursor-pointer"
                  >
                    Reject
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      )}

      {/* Course Share Modal */}
      {isShareModalOpen && selectedCourse && (
        <CourseShareModal
          course={selectedCourse}
          language={language}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}

      {/* QUESTION BANK PICKER MODAL */}
      {isQBPickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 font-sans">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-[#111111] border border-white/20 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/20 text-[#FFD700] border border-amber-500/30">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white uppercase font-display tracking-wide flex items-center gap-2">
                    <span>{isBn ? "সেন্ট্রাল প্রশ্ন ব্যাংক / লাইব্রেরি" : "Central Question Bank"}</span>
                    <span className="text-xs font-mono font-bold bg-white/10 px-2 py-0.5 rounded-full text-[#FFD700]">
                      {qbLibraryQuestions.length} {isBn ? "প্রশ্ন" : "Questions"}
                    </span>
                  </h3>
                  <p className="text-xs text-gray-400 font-sans mt-0.5">
                    {isBn
                      ? "পছন্দমতো প্রশ্ন সিলেক্ট করে এক ক্লিকে বর্তমান পরীক্ষায় ইমপোর্ট করুন।"
                      : "Select questions and import them directly into your exam model test."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsQBPickerOpen(false)}
                className="p-2 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Bar */}
            <div className="p-4 sm:p-5 bg-black/30 border-b border-white/10 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={qbSearchTerm}
                  onChange={(e) => setQbSearchTerm(e.target.value)}
                  placeholder={isBn ? "প্রশ্ন বা অধ্যায়ের নাম দিয়ে সার্চ করুন..." : "Search questions by keyword..."}
                  className="w-full bg-[#181818] border border-white/10 focus:border-[#FFD700] rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={qbSubjectFilter}
                  onChange={(e) => setQbSubjectFilter(e.target.value)}
                  className="bg-[#181818] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="all">{isBn ? "সকল বিষয়" : "All Subjects"}</option>
                  <option value="Biology">Biology (জীববিজ্ঞান)</option>
                  <option value="Chemistry">Chemistry (রসায়ন)</option>
                  <option value="Physics">Physics (পদার্থবিজ্ঞান)</option>
                  <option value="GK">GK (সাধারণ জ্ঞান)</option>
                  <option value="English">English (ইংরেজি)</option>
                </select>

                {/* Bulk Select / Deselect */}
                <button
                  type="button"
                  onClick={() => {
                    playSound("click");
                    const filtered = qbLibraryQuestions.filter((q) => {
                      const matchSubject = qbSubjectFilter === "all" || q.subject === qbSubjectFilter;
                      const matchSearch =
                        !qbSearchTerm ||
                        q.questionText.toLowerCase().includes(qbSearchTerm.toLowerCase()) ||
                        (q.chapter && q.chapter.toLowerCase().includes(qbSearchTerm.toLowerCase()));
                      return matchSubject && matchSearch;
                    });
                    if (qbSelectedQuestionIds.size >= filtered.length && filtered.length > 0) {
                      setQbSelectedQuestionIds(new Set());
                    } else {
                      setQbSelectedQuestionIds(new Set(filtered.map((q) => q.id)));
                    }
                  }}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold font-mono transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-[#FFD700]" />
                  <span>{isBn ? "সব নির্বাচন" : "Toggle All"}</span>
                </button>
              </div>
            </div>

            {/* Questions List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 divide-y divide-white/5 max-h-[55vh]">
              {qbLibraryQuestions
                .filter((q) => {
                  const matchSubject = qbSubjectFilter === "all" || q.subject === qbSubjectFilter;
                  const matchSearch =
                    !qbSearchTerm ||
                    q.questionText.toLowerCase().includes(qbSearchTerm.toLowerCase()) ||
                    (q.chapter && q.chapter.toLowerCase().includes(qbSearchTerm.toLowerCase()));
                  return matchSubject && matchSearch;
                })
                .map((q, idx) => {
                  const isChecked = qbSelectedQuestionIds.has(q.id);
                  return (
                    <div
                      key={q.id}
                      onClick={() => {
                        playSound("click");
                        const next = new Set(qbSelectedQuestionIds);
                        if (isChecked) next.delete(q.id);
                        else next.add(q.id);
                        setQbSelectedQuestionIds(next);
                      }}
                      className={`pt-3 first:pt-0 p-4 rounded-2xl border transition cursor-pointer ${
                        isChecked
                          ? "bg-amber-950/20 border-amber-500/50 ring-1 ring-amber-500/30"
                          : "bg-black/40 border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="pt-0.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="w-4 h-4 rounded text-amber-500 accent-amber-500 cursor-pointer"
                          />
                        </div>

                        <div className="space-y-2 flex-1 text-xs">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-bold text-gray-400">#{idx + 1}</span>
                            <span className="px-2 py-0.5 rounded bg-white/10 text-white font-mono font-bold text-[10px]">
                              {q.subject}
                            </span>
                            {q.chapter && (
                              <span className="text-gray-400 font-mono text-[11px] bg-black/40 px-2 py-0.5 rounded">
                                {q.chapter}
                              </span>
                            )}
                            {q.difficulty && (
                              <span className="text-[10px] text-amber-400 font-bold uppercase">
                                {q.difficulty}
                              </span>
                            )}
                          </div>

                          <p className="font-bold text-white text-sm leading-snug">{q.questionText}</p>

                          {/* Options Preview */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                            {(q.options || []).map((opt, oIdx) => {
                              const isCorrect = q.correctAnswerIndex === oIdx;
                              return (
                                <div
                                  key={oIdx}
                                  className={`px-2.5 py-1.5 rounded-lg text-[11px] flex items-center gap-1.5 ${
                                    isCorrect
                                      ? "bg-emerald-950/60 text-emerald-300 font-bold border border-emerald-500/30"
                                      : "bg-black/60 text-gray-300 border border-white/5"
                                  }`}
                                >
                                  <span className="font-mono font-bold text-[10px] text-gray-500">
                                    {String.fromCharCode(65 + oIdx)}.
                                  </span>
                                  <span className="truncate">{opt}</span>
                                  {isCorrect && <Check className="w-3 h-3 text-emerald-400 ml-auto flex-shrink-0" />}
                                </div>
                              );
                            })}
                          </div>

                          {q.explanation && (
                            <p className="text-[10px] text-gray-400 italic pt-1 border-t border-white/5">
                              💡 <strong>{isBn ? "ব্যাখ্যা" : "Explanation"}:</strong> {q.explanation}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Footer Actions */}
            <div className="p-4 sm:p-5 border-t border-white/10 bg-black/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs font-mono text-gray-300">
                <span>{isBn ? "নির্বাচিত প্রশ্ন সংখ্যা:" : "Selected:"} </span>
                <strong className="text-[#FFD700] text-sm">{qbSelectedQuestionIds.size}</strong>{" "}
                <span>{isBn ? "টি" : "Questions"}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsQBPickerOpen(false)}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-bold transition cursor-pointer border border-white/10"
                >
                  {isBn ? "বাতিল" : "Cancel"}
                </button>

                <button
                  type="button"
                  disabled={qbSelectedQuestionIds.size === 0}
                  onClick={handleImportSelectedQBQuestions}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 disabled:opacity-40 text-black font-black text-xs uppercase rounded-xl transition cursor-pointer flex items-center gap-2 shadow-lg shadow-amber-950/40"
                >
                  <BookOpen className="w-4 h-4 text-black" />
                  <span>
                    {isBn
                      ? `পরীক্ষায় ইমপোর্ট করুন (${qbSelectedQuestionIds.size} টি প্রশ্ন)`
                      : `Import (${qbSelectedQuestionIds.size}) Questions to Exam`}
                  </span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* EXAM PREVIEW MODAL */}
      {previewingExam && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 font-sans">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#111111] border border-white/20 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
          >
            <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between bg-black/40">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg bg-[#C1121F]/20 text-[#FFD700] border border-[#C1121F]/30 text-xs font-mono font-bold">
                    {previewingExam.subject}
                  </span>
                  <span className="text-xs text-gray-400 font-mono">
                    {previewingExam.durationMinutes} Mins • Pass {previewingExam.passMarks}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white uppercase font-display tracking-wide mt-1">
                  {previewingExam.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setPreviewingExam(null)}
                className="p-2 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 max-h-[60vh] divide-y divide-white/5">
              {(previewingExam.questions || []).map((q, idx) => (
                <div key={q.id || idx} className="pt-4 first:pt-0 space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-white/10 text-white font-mono font-bold text-[10px]">
                      Q.{idx + 1}
                    </span>
                    {q.chapter && <span className="text-gray-400 font-mono text-[10px]">{q.chapter}</span>}
                  </div>

                  <p className="font-bold text-white text-sm leading-snug">{q.questionText}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {(q.options || []).map((opt, oIdx) => {
                      const isCorrect = q.correctAnswerIndex === oIdx;
                      return (
                        <div
                          key={oIdx}
                          className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                            isCorrect
                              ? "bg-emerald-950/60 text-emerald-300 font-bold border-emerald-500/40"
                              : "bg-[#181818] text-gray-300 border-white/5"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-mono font-bold text-gray-500">
                              {String.fromCharCode(65 + oIdx)}.
                            </span>
                            <span className="truncate">{opt}</span>
                          </div>
                          {isCorrect && (
                            <span className="text-[10px] bg-emerald-900 text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                              ✓ Correct
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {q.explanation && (
                    <div className="p-2.5 bg-black/40 border border-white/5 rounded-xl text-[11px] text-gray-300">
                      💡 <strong>{isBn ? "ব্যাখ্যা" : "Explanation"}:</strong> {q.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="p-4 sm:p-5 border-t border-white/10 bg-black/60 flex items-center justify-between gap-3">
              <span className="text-xs text-gray-400 font-mono">
                {isBn
                  ? `মোট প্রশ্ন: ${previewingExam.questions?.length || 0} টি`
                  : `Total Questions: ${previewingExam.questions?.length || 0}`}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const ex = previewingExam;
                    setPreviewingExam(null);
                    handleOpenEditExam(ex);
                  }}
                  className="px-4 py-2 bg-[#C1121F] hover:bg-red-600 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#FFD700]" />
                  <span>{isBn ? "এই পরীক্ষা এডিট করুন" : "Edit This Exam"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewingExam(null)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  {isBn ? "বন্ধ করুন" : "Close"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* EXAM DELETE CONFIRMATION MODAL */}
      {examDeleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 font-sans">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#111111] border border-red-500/30 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl"
          >
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-3 rounded-2xl bg-red-950/60 border border-red-500/30">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-black text-white uppercase font-display">
                  {isBn ? "পরীক্ষাটি ডিলিট করতে চান?" : "Delete Exam Permanently?"}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {isBn ? "এই অ্যাকশনটি পুনরায় ফিরিয়ে আনা যাবে না।" : "This action cannot be undone."}
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-300 bg-black/40 p-3.5 rounded-xl border border-white/10 leading-relaxed">
              {isBn
                ? "এই পরীক্ষা ও এর সকল প্রশ্ন ডাটাবেজ থেকে স্থায়ীভাবে মুছে ফেলা হবে। আপনি কি নিশ্চিত?"
                : "This exam and all its configured questions will be permanently deleted from the database. Are you sure?"}
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setExamDeleteConfirmId(null)}
                className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition cursor-pointer"
              >
                {isBn ? "বাতিল" : "Cancel"}
              </button>

              <button
                type="button"
                onClick={() => handleDeleteExamAction(examDeleteConfirmId)}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase rounded-xl transition cursor-pointer shadow-lg shadow-red-950/50"
              >
                {isBn ? "হ্যাঁ, ডিলিট করুন" : "Yes, Delete"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL: Exam Questions Manager (Add, Edit, Reorder, Bulk Import) */}
      {managingQuestionsExam && (
        <ExamQuestionsManagerModal
          exam={managingQuestionsExam}
          isOpen={Boolean(managingQuestionsExam)}
          onClose={() => setManagingQuestionsExam(null)}
          onSaveQuestions={(newQuestions) => {
            const updated: CourseExam = {
              ...managingQuestionsExam,
              questions: newQuestions,
              totalQuestions: newQuestions.length,
              totalMarks: newQuestions.length
            };
            if (onUpdateExam) {
              onUpdateExam(updated);
            }
            setManagingQuestionsExam(null);
            setSaveSuccessMessage(
              isBn
                ? `✅ "${managingQuestionsExam.title}" পরীক্ষার প্রশ্ন সফলভাবে সেভ হয়েছে (${newQuestions.length} টি প্রশ্ন)!`
                : `✅ Questions saved successfully for "${managingQuestionsExam.title}" (${newQuestions.length} questions)!`
            );
            setTimeout(() => setSaveSuccessMessage(""), 5000);
          }}
          language={language}
          theme={theme}
        />
      )}

      {/* MODAL: Live Exam Control & Monitoring (Timer, Status, Real-time Notice) */}
      {managingLiveExam && (
        <LiveExamControlModal
          exam={managingLiveExam}
          isOpen={Boolean(managingLiveExam)}
          onClose={() => setManagingLiveExam(null)}
          onUpdateExam={(updatedExam) => {
            if (onUpdateExam) {
              onUpdateExam(updatedExam);
            }
            setManagingLiveExam(updatedExam);
          }}
          submissions={liveSubmissionsList.filter((s: any) => s.examId === managingLiveExam.id)}
          onBroadcastNotice={handleBroadcastLiveExamNotice}
          language={language}
          theme={theme}
        />
      )}

      {/* MODAL: Bulk Question Parser in Add Exam Flow */}
      {isBulkModalInAddExamOpen && (
        <BulkQuestionParserModal
          isOpen={isBulkModalInAddExamOpen}
          onClose={() => setIsBulkModalInAddExamOpen(false)}
          defaultSubject={examSubject}
          defaultChapter={examChapter}
          onImportQuestions={(parsedQuestions) => {
            setQuestions((prev) => {
              if (prev.length === 1 && !prev[0].question.trim()) {
                return parsedQuestions;
              }
              return [...prev, ...parsedQuestions];
            });
            setIsBulkModalInAddExamOpen(false);
          }}
          language={language}
        />
      )}
    </div>
  );
}
