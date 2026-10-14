import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  addDoc,
  query,
  limit
} from "firebase/firestore";
import { Course, CourseTeacher, CourseRoutineItem } from "../../types/courseTypes";
import { INITIAL_COURSES } from "../../data/coursesData";
import { playSound } from "../../audio";
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  X,
  Sparkles,
  Upload,
  Image as ImageIcon,
  DollarSign,
  Calendar,
  Layers,
  Award,
  Users,
  Search,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  Clock,
  Flame,
  ShieldCheck,
  RefreshCw,
  Sliders,
  Check,
  FileText,
  FileSpreadsheet,
  Download,
  Link,
  Star,
  UserCheck,
  UserX,
  UserPlus,
  ArrowUpDown,
  ListOrdered,
  BookMarked,
  Tag,
  Radio
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

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

// Preset high-quality medical cover photos that admin can pick with 1-click
const PRESET_COVERS = [
  {
    title: "Medical Stethoscope & Clinical Desk",
    url: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80",
    banner: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1200&auto=format&fit=crop&q=80",
    category: "Clinical & General"
  },
  {
    title: "Microscope & Laboratory Anatomy",
    url: "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=800&auto=format&fit=crop&q=80",
    banner: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=1200&auto=format&fit=crop&q=80",
    category: "Biology / Chemistry"
  },
  {
    title: "Doctor with Digital Tablet & ECG",
    url: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&auto=format&fit=crop&q=80",
    banner: "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=1200&auto=format&fit=crop&q=80",
    category: "Exam Batch"
  },
  {
    title: "Medical Research & DNA Genetics",
    url: "https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=800&auto=format&fit=crop&q=80",
    banner: "https://images.unsplash.com/photo-1579154204601-01588f351e67?w=1200&auto=format&fit=crop&q=80",
    category: "Genetics & Biology"
  },
  {
    title: "Dhaka Medical College Campus / White Coat",
    url: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800&auto=format&fit=crop&q=80",
    banner: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&auto=format&fit=crop&q=80",
    category: "Admission Special"
  },
  {
    title: "Chemistry Laboratory & Test Tubes",
    url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80",
    banner: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=1200&auto=format&fit=crop&q=80",
    category: "Chemistry Paper"
  },
  {
    title: "Physics Mechanics & Modern Lab",
    url: "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=800&auto=format&fit=crop&q=80",
    banner: "https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=1200&auto=format&fit=crop&q=80",
    category: "Physics"
  },
  {
    title: "English & GK Knowledge Books",
    url: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&auto=format&fit=crop&q=80",
    banner: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=1200&auto=format&fit=crop&q=80",
    category: "English & GK"
  }
];

// Presets for 1-Click Fast Configuration
const DEFAULT_MEDICAL_FAQS = [
  {
    question: "ক্লাস মিস করলে পরবর্তীতে ভিডিও দেখার সুযোগ আছে কি?",
    answer: "হ্যাঁ, প্রতিটি লাইভ ক্লাসের ফুল এইচডি আর্কাইভ রেকর্ডিং ২৪/৭ এক্সেস করা যাবে এবং লেকচার শিট ডাউনলোড করা যাবে।"
  },
  {
    question: "লাইভ এক্সাম মিস হলে কি পুনরায় দেওয়ার সুযোগ থাকে?",
    answer: "হ্যাঁ, লাইভ এক্সামের সময় পার হয়ে গেলেও প্র্যাকটিস আর্কাইভ থেকে যেকোনো সময় আনলিমিটেড বার পরীক্ষা দিয়ে প্রস্তুতি ঝালাই করা যাবে।"
  },
  {
    question: "স্বয়ংক্রিয় মিসটেক ব্যাংক (Mistake Bank) কীভাবে কাজ করে?",
    answer: "পরীক্ষায় যেসকল প্রশ্ন ভুল হবে বা স্কিপ করবেন, সিস্টেম স্বয়ংক্রিয়ভাবে সেগুলো টেক্সটবুক রেফারেন্স ও সঠিক ব্যাখ্যা সহ আপনার পার্সোনাল মিসটেক ব্যাংকে সেভ করে রাখবে।"
  },
  {
    question: "কোর্সের মেয়াদ কতদিন পর্যন্ত থাকবে?",
    answer: "আপনার কাঙ্ক্ষিত মেডিকেল ভর্তি পরীক্ষা (MAT) সম্পূর্ণ অনুষ্ঠিত হওয়া পর্যন্ত কোর্স, রেকর্ডিং এবং এক্সাম ব্যাচের ফুল এক্সেস থাকবে।"
  },
  {
    question: "মোবাইল ও ল্যাপটপ দুটো থেকেই কি ক্লাস ও পরীক্ষা দেওয়া যাবে?",
    answer: "হ্যাঁ! যেকোনো স্মার্টফোন, ট্যাবলেট, আইপ্যাড বা ল্যাপটপ ব্রাউজার থেকে নিরবচ্ছিন্নভাবে অ্যাপটি ব্যবহার করা যাবে।"
  }
];

const DEFAULT_MEDICAL_ROUTINE: CourseRoutineItem[] = [];

const DEFAULT_MEDICAL_SYLLABUS = [
  {
    subject: "Biology 1st & 2nd Paper (উদ্ভিদবিজ্ঞান ও প্রাণিবিজ্ঞান)",
    chapters: [
      {
        chapterTitle: "কোষ ও এর গঠন (Cell Structure & Functions)",
        topics: ["কোষ প্রাচীর ও প্লাজমামেমব্রেন", "অঙ্গাণুসমূহ ও মাইটোকন্ড্রিয়া", "ডিএনএ, আরএনএ ও প্রোটিন সংশ্লেষ"]
      },
      {
        chapterTitle: "কোষ বিভাজন (Cell Division)",
        topics: ["মাইটোসিস ও ক্রোমোজোম নৃত্য", "মিয়োসিস ও ক্রসিং ওভার", "কোষ চক্র ও ক্যান্সার"]
      },
      {
        chapterTitle: "রক্ত ও সংবহন (Blood & Circulation)",
        topics: ["প্লাজমা ও রক্তকণিকা", "হৃদপিণ্ড, কপাটিকা ও রক্তচাপ", "কার্ডিয়াক চক্র ও ইসিজি"]
      },
      {
        chapterTitle: "শ্বসন ও শ্বাসক্রিয়া (Respiration)",
        topics: ["গ্লাইকোলাইসিস ও ক্রেবস চক্র", "গ্যাসীয় পরিবহন ও হিমোগ্লোবিন"]
      },
      {
        chapterTitle: "জিনতত্ত্ব ও বিবর্তন (Genetics & Evolution)",
        topics: ["মেন্ডেলের সূত্র ও ব্যতিক্রম", "সেক্স লিংকড ডিজঅর্ডার", "মানব জিনোম ও বংশগতি"]
      }
    ]
  },
  {
    subject: "Chemistry 1st & 2nd Paper (রসায়ন ১ম ও ২য় পত্র)",
    chapters: [
      {
        chapterTitle: "গুণগত রসায়ন (Qualitative Chemistry)",
        topics: ["কোয়ান্টাম সংখ্যা ও নীতি", "দ্রাব্যতা ও দ্রাব্যতা গুণফল", "শিখা পরীক্ষা ও ক্যাটায়ন শনাক্তকরণ"]
      },
      {
        chapterTitle: "পর্যায়বৃত্ত ধর্ম ও রাসায়নিক বন্ধন",
        topics: ["আয়নাইজেশন শক্তি ও তড়িৎ ঋণাত্মকতা", "সংকরায়ন ও জ্যামিতিক গঠন", "হাইড্রোজেন বন্ধন"]
      },
      {
        chapterTitle: "জৈব রসায়ন (Organic Chemistry)",
        topics: ["IUPAC নামকরণ", "ইলেকট্রোফিলিক প্রতিস্থাপন", "অ্যালকোহল, অ্যালডিহাইড ও কিটোন", "বেনজিন ও অ্যারোমেটিসিটি"]
      },
      {
        chapterTitle: "পরিমাণগত রসায়ন (Quantitative Chemistry)",
        topics: ["মোল ও মোলারিটি", "জারণ-বিজারণ সমতাকরণ", "টাইট্রেশন ও নির্দেশক"]
      }
    ]
  },
  {
    subject: "Physics 1st & 2nd Paper (পদার্থবিজ্ঞান ১ম ও ২য় পত্র)",
    chapters: [
      {
        chapterTitle: "ভৌত জগৎ ও ভেক্টর (Vectors)",
        topics: ["ভেক্টর যোগ ও বিয়োগ", "ডট ও ক্রস গুণন", "নদী-নৌকা ও বৃষ্টির বেগ"]
      },
      {
        chapterTitle: "গতিবিদ্যা ও নিউটোনীয় বলবিদ্যা",
        topics: ["প্রাস ও গতি সমীকরণ", "ভরবেগ সংরক্ষণ ও সংঘর্ষ", "ঘূর্ণন গতি ও জড়তার ভ্রামক"]
      },
      {
        chapterTitle: "কাজ, শক্তি ও ক্ষমতা (Work, Energy, Power)",
        topics: ["সংরক্ষণশীল বল ও ক্ষমতা", "স্প্রিং শক্তি ও কর্মদক্ষতা"]
      },
      {
        chapterTitle: "স্থির তড়িৎ ও চলতড়িৎ (Electricity)",
        topics: ["কুলম্বের সূত্র ও বিভব", "বর্তনী বিশ্লেষণ ও ওহমের সূত্র", "হুইটস্টোন ব্রিজ ও শান্ট"]
      },
      {
        chapterTitle: "আধুনিক পদার্থবিজ্ঞান ও পরমাণু মডেল",
        topics: ["ফটোইলেকট্রিক প্রভাব", "বোর পরমাণু মডেল", "তেজস্ক্রিয়তা ও অর্ধায়ু"]
      }
    ]
  },
  {
    subject: "General Knowledge & English (সাধারণ জ্ঞান ও ইংরেজি)",
    chapters: [
      {
        chapterTitle: "General Knowledge (বাংলাদেশ ও আন্তর্জাতিক বিষয়াবলি)",
        topics: ["মুক্তিযুদ্ধ ও স্বাধীনতা সংগ্রাম", "বঙ্গবন্ধু ও জাতীয় অর্জন", "মেডিকেল ও বিজ্ঞান সংশ্লিষ্ট আবিষ্কার"]
      },
      {
        chapterTitle: "Medical Admission English",
        topics: ["Parts of Speech & Identification", "Subject-Verb Agreement", "Prepositions & Idioms", "Synonyms, Antonyms & Spelling"]
      }
    ]
  }
];

interface CourseManagerProps {
  onNotify?: (msg: string, type?: "success" | "error") => void;
}

type ModalTab = "basic" | "routine" | "faq" | "syllabus" | "teachers";

export default function CourseManager({ onNotify }: CourseManagerProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<CourseTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isInitializing, setIsInitializing] = useState(false);

  // Edit / Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<ModalTab>("basic");
  const [editingCourse, setEditingCourse] = useState<Partial<Course> | null>(null);
  const [isNewCourse, setIsNewCourse] = useState(false);
  const [saving, setSaving] = useState(false);

  // Custom Tag / Feature Helpers
  const [newFeatureText, setNewFeatureText] = useState("");
  const [showPresetPicker, setShowPresetPicker] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Routine Form Helpers
  const [routineDay, setRoutineDay] = useState("");
  const [routineTime, setRoutineTime] = useState("");
  const [routineType, setRoutineType] = useState<CourseRoutineItem["type"]>("class");
  const [routineTitle, setRoutineTitle] = useState("");
  const [routineSubject, setRoutineSubject] = useState("Biology");
  const [routineTeacher, setRoutineTeacher] = useState("");
  const [routineRoom, setRoutineRoom] = useState("");

  // FAQ Form Helpers
  const [newFaqQ, setNewFaqQ] = useState("");
  const [newFaqA, setNewFaqA] = useState("");

  // Syllabus Form Helpers
  const [newSubjectName, setNewSubjectName] = useState("");
  const [activeSubjectIdx, setActiveSubjectIdx] = useState<number>(0);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [newTopicText, setNewTopicText] = useState("");
  const [activeChapterIdx, setActiveChapterIdx] = useState<number>(0);

  // Quick Teacher Creator in Modal
  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);
  const [tName, setTName] = useState("");
  const [tTitle, setTTitle] = useState("");
  const [tCollege, setTCollege] = useState("Dhaka Medical College (DMC)");
  const [tSubject, setTSubject] = useState("Biology");
  const [tAvatar, setTAvatar] = useState("https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80");
  const [tBio, setTBio] = useState("");
  const [isAddingTeacher, setIsAddingTeacher] = useState(false);

  // 1. Listen to Firestore "courses" collection in real time (limit 50)
  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(
      query(collection(db, "courses"), limit(50)),
      (snapshot) => {
        if (!snapshot.empty) {
          const loaded: Course[] = [];
          snapshot.forEach((d) => {
            loaded.push({ id: d.id, ...d.data() } as Course);
          });
          loaded.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
          setCourses(loaded);
        } else {
          setCourses([]);
        }
        setLoading(false);
      },
      (err) => {
        console.warn("Could not fetch courses from Firestore:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // 2. Listen to Firestore "course_teachers" collection in real time (limit 50)
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "course_teachers"), limit(50)),
      (snapshot) => {
        const loaded: CourseTeacher[] = [];
        snapshot.forEach((d) => {
          loaded.push({ id: d.id, ...d.data() } as CourseTeacher);
        });
        setTeachers(loaded);
      },
      (err) => {
        console.warn("Teachers stream warning:", err.message);
      }
    );
    return () => unsub();
  }, []);

  // Initialize default courses to Firestore if missing without overwriting existing courses
  const handleSeedDefaultCourses = async () => {
    setIsInitializing(true);
    try {
      playSound("click");
      let seededCount = 0;
      for (const course of INITIAL_COURSES) {
        const courseRef = doc(db, "courses", course.id);
        const snap = await getDoc(courseRef);
        if (!snap.exists()) {
          const cleaned = cleanDataForFirestore({
            ...course,
            routineItems: course.routineItems || DEFAULT_MEDICAL_ROUTINE,
            syllabus: course.syllabus || DEFAULT_MEDICAL_SYLLABUS,
            faq: course.faq || DEFAULT_MEDICAL_FAQS,
            showOnLandingPage: true,
            isFeatured: true,
            updatedAt: new Date().toISOString(),
            createdAt: course.createdAt || new Date().toISOString()
          });
          await setDoc(courseRef, cleaned, { merge: true });
          seededCount++;
        }
      }
      playSound("levelup");
      if (onNotify) {
        if (seededCount > 0) {
          onNotify(`${seededCount} default medical courses initialized in Firestore! Existing modified courses were safely preserved.`, "success");
        } else {
          onNotify("All courses are already safely preserved and synced in Firestore!", "success");
        }
      }
    } catch (err: any) {
      console.error("Error initializing courses:", err);
      if (onNotify) onNotify("Failed to initialize courses: " + err.message, "error");
    } finally {
      setIsInitializing(false);
    }
  };

  // Open Edit Modal for an existing course
  const handleEditCourse = (course: Course, initialTab: ModalTab = "basic") => {
    playSound("click");
    setEditingCourse({
      ...course,
      features: course.features || [],
      benefits: course.benefits || [],
      subjects: course.subjects || ["Biology", "Chemistry", "Physics", "GK", "English"],
      routineItems: course.routineItems || DEFAULT_MEDICAL_ROUTINE,
      faq: course.faq || DEFAULT_MEDICAL_FAQS,
      syllabus: course.syllabus || DEFAULT_MEDICAL_SYLLABUS,
      showOnLandingPage: (course as any).showOnLandingPage !== false,
      aspectRatio: course.aspectRatio || "16:9",
      instructorAvatar: course.instructorAvatar || "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=60",
      instructorName: course.instructorName || "Shahriar Kabir (DMC)",
      instructorTitle: course.instructorTitle || "Dhaka Medical College (K-78), Lead Mentor",
      routinePdfUrl: course.routinePdfUrl || "",
      syllabusPdfUrl: course.syllabusPdfUrl || "",
      examInfo: course.examInfo || "প্রতিদিন রাত ৮:০০ টায় লাইভ এক্সাম অনুষ্ঠিত হয়। ৫০-১০০ প্রশ্ন ও ০.২৫ নেগেটিভ মার্কিং।",
      classInfo: course.classInfo || "সপ্তাহে ৪ দিন সন্ধ্যা ৭:৩০ মিনিটে লাইভ ও রেকর্ডেড ক্লাস।"
    });
    setIsNewCourse(false);
    setActiveModalTab(initialTab);
    setIsModalOpen(true);
  };

  // Open Create Modal for a new course
  const handleCreateNewCourse = () => {
    playSound("click");
    const newId = "course_med_" + Date.now();
    setEditingCourse({
      id: newId,
      slug: "medical-course-" + Date.now(),
      title: "",
      shortDescription: "",
      fullDescription: "",
      thumbnail: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80",
      banner: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1200&auto=format&fit=crop&q=80",
      instructorName: "Shahriar Kabir & Team (DMC)",
      instructorTitle: "Dhaka Medical College (K-78), Medical Mentor",
      instructorAvatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=60",
      duration: "6 Months",
      totalExams: 60,
      totalClasses: 45,
      totalMaterials: 80,
      subjects: ["Biology", "Chemistry", "Physics", "GK", "English"],
      features: [
        "অধ্যায়ভিত্তিক ডেইলি মডেল টেস্ট ও লাইভ ক্লাস",
        "ইনস্ট্যান্ট মিসটেক ব্যাংক ও টেক্সটবুক রেফারেন্স",
        "মেডিকেল লিডারবোর্ড ও কম্পারেটিভ এনালাইসিস",
        "এইচডি ক্লাস রেকর্ডিং ও লেকচার শিট ডাউনলোড"
      ],
      benefits: [
        "আবেদন ও ভর্তি পরীক্ষা পর্যন্ত ফুল এক্সেস",
        "মেডিসেন্স এআই পারসোনালাইজড মেন্টরিং"
      ],
      routineItems: DEFAULT_MEDICAL_ROUTINE,
      faq: DEFAULT_MEDICAL_FAQS,
      syllabus: DEFAULT_MEDICAL_SYLLABUS,
      examInfo: "প্রতিদিন রাত ৮:০০ টায় লাইভ এক্সাম অনুষ্ঠিত হয়। ৫০-১০০ প্রশ্ন ও ০.২৫ নেগেটিভ মার্কিং।",
      classInfo: "সপ্তাহে ৪ দিন সন্ধ্যা ৭:৩০ মিনিটে লাইভ ও রেকর্ডেড ক্লাস।",
      originalPrice: 4500,
      discountedPrice: 2499,
      defaultBatchId: "batch_" + newId,
      aspectRatio: "16:9",
      createdAt: new Date().toISOString(),
      showOnLandingPage: true,
      isFeatured: true
    } as any);
    setIsNewCourse(true);
    setActiveModalTab("basic");
    setIsModalOpen(true);
  };

  // Toggle teacher IN/OUT for this course
  const handleToggleTeacherInOut = async (teacher: CourseTeacher) => {
    if (!editingCourse?.id) return;
    playSound("click");

    const courseId = editingCourse.id;
    const currentAssigned = teacher.assignedCourseIds || [];
    const isCurrentlyIn = currentAssigned.includes(courseId);

    const updatedAssigned = isCurrentlyIn
      ? currentAssigned.filter((id) => id !== courseId)
      : [...currentAssigned, courseId];

    // Optimistically update editingCourse teachers array
    let updatedCourseTeachers = editingCourse.teachers || [];
    if (isCurrentlyIn) {
      updatedCourseTeachers = updatedCourseTeachers.filter((t) => t.id !== teacher.id);
    } else {
      updatedCourseTeachers = [...updatedCourseTeachers, { ...teacher, assignedCourseIds: updatedAssigned }];
    }

    setEditingCourse({
      ...editingCourse,
      teachers: updatedCourseTeachers
    });

    // Update in Firestore
    try {
      await updateDoc(doc(db, "course_teachers", teacher.id), {
        assignedCourseIds: updatedAssigned,
        updatedAt: new Date().toISOString()
      });

      if (onNotify) {
        onNotify(
          !isCurrentlyIn
            ? `${teacher.name} assigned (IN) to this course!`
            : `${teacher.name} removed (OUT) from this course.`,
          "success"
        );
      }
    } catch (err: any) {
      console.warn("Could not sync teacher assignment immediately:", err);
    }
  };

  // Set teacher as lead mentor
  const handleSetLeadTeacher = (teacher: CourseTeacher) => {
    playSound("click");
    if (!editingCourse) return;

    setEditingCourse({
      ...editingCourse,
      instructorName: teacher.name,
      instructorTitle: teacher.title || teacher.medicalCollege || "Lead Mentor",
      instructorAvatar: teacher.avatar || editingCourse.instructorAvatar
    });

    if (onNotify) onNotify(`${teacher.name} selected as Course Lead Instructor!`, "success");
  };

  // Quick Add Teacher from inside modal
  const handleCreateTeacherQuick = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tName.trim() || !editingCourse?.id) return;
    setIsAddingTeacher(true);
    try {
      const teacherPayload: Partial<CourseTeacher> = {
        name: tName.trim(),
        title: tTitle.trim() || `${tCollege}, Medical Mentor`,
        medicalCollege: tCollege.trim(),
        subject: tSubject,
        avatar: tAvatar || "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80",
        bio: tBio.trim() || "মেডিকেল ভর্তি পরীক্ষার অভিজ্ঞ মেন্টর।",
        assignedCourseIds: [editingCourse.id],
        isLead: false,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, "course_teachers"), teacherPayload);
      const newTeacherObj = { id: docRef.id, ...teacherPayload } as CourseTeacher;

      // Update local editing course
      setEditingCourse({
        ...editingCourse,
        teachers: [...(editingCourse.teachers || []), newTeacherObj]
      });

      playSound("levelup");
      if (onNotify) onNotify(`Doctor / Mentor ${tName} created and added to course!`, "success");
      setShowAddTeacherModal(false);
      setTName("");
      setTTitle("");
      setTBio("");
    } catch (err: any) {
      console.error("Error creating teacher:", err);
      if (onNotify) onNotify("Failed to create teacher: " + err.message, "error");
    } finally {
      setIsAddingTeacher(false);
    }
  };

  // Save Course to Firestore (with all sub-components: Routine, FAQ, Syllabus, Teachers)
  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse || !editingCourse.title?.trim()) {
      alert("Please provide a course title.");
      return;
    }

    setSaving(true);
    try {
      const courseId = editingCourse.id || "course_med_" + Date.now();
      const slug =
        editingCourse.slug ||
        editingCourse.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");

      // Collect all currently assigned teachers
      const assignedTeachers = teachers.filter((t) =>
        t.assignedCourseIds && t.assignedCourseIds.includes(courseId)
      );

      const payload: any = {
        ...editingCourse,
        id: courseId,
        slug,
        title: editingCourse.title.trim(),
        shortDescription: editingCourse.shortDescription || "",
        fullDescription: editingCourse.fullDescription || editingCourse.shortDescription || "",
        thumbnail: editingCourse.thumbnail || PRESET_COVERS[0].url,
        banner: editingCourse.banner || editingCourse.thumbnail || PRESET_COVERS[0].banner,
        instructorName: editingCourse.instructorName || "Medical Lead Mentor",
        instructorTitle: editingCourse.instructorTitle || "Dhaka Medical College",
        instructorAvatar:
          editingCourse.instructorAvatar ||
          "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=60",
        duration: editingCourse.duration || "6 Months",
        totalExams: Number(editingCourse.totalExams) || 50,
        totalClasses: Number(editingCourse.totalClasses) || 40,
        totalMaterials: Number(editingCourse.totalMaterials) || 60,
        originalPrice: Number(editingCourse.originalPrice) || 0,
        discountedPrice: Number(editingCourse.discountedPrice) || 0,
        subjects:
          editingCourse.subjects && editingCourse.subjects.length > 0
            ? editingCourse.subjects
            : ["Biology", "Chemistry", "Physics", "GK", "English"],
        features: editingCourse.features || [],
        benefits: editingCourse.benefits || [],
        routineItems: editingCourse.routineItems || [],
        routinePdfUrl: editingCourse.routinePdfUrl || "",
        routineSummary: editingCourse.routineSummary || "",
        faq: editingCourse.faq || [],
        syllabus: editingCourse.syllabus || [],
        syllabusPdfUrl: editingCourse.syllabusPdfUrl || "",
        teachers: assignedTeachers,
        examInfo: editingCourse.examInfo || "",
        classInfo: editingCourse.classInfo || "",
        aspectRatio: editingCourse.aspectRatio || "16:9",
        showOnLandingPage: (editingCourse as any).showOnLandingPage !== false,
        isFeatured: (editingCourse as any).isFeatured !== false,
        updatedAt: new Date().toISOString(),
        createdAt: editingCourse.createdAt || new Date().toISOString()
      };

      const cleanedPayload = cleanDataForFirestore(payload);
      await setDoc(doc(db, "courses", courseId), cleanedPayload, { merge: true });

      // Ensure single corresponding batch exists and is synced in Firestore (1 batch per course)
      const batchId = editingCourse.defaultBatchId || "batch_" + courseId;
      const batchPayload: any = {
        id: batchId,
        courseId: courseId,
        batchName: editingCourse.title.trim(),
        batchSlug: slug,
        price: Number(editingCourse.discountedPrice) || 0,
        originalPrice: Number(editingCourse.originalPrice) || 0,
        discountedPrice: Number(editingCourse.discountedPrice) || 0,
        scheduleDetails: editingCourse.classInfo || "প্রতিদিন লাইভ ক্লাস ও এক্সাম",
        updatedAt: new Date().toISOString()
      };
      await setDoc(doc(db, "batches", batchId), cleanDataForFirestore(batchPayload), { merge: true });

      // Update local storage backup cache
      try {
        const stored = localStorage.getItem("medibridge_courses_cache");
        const list: Course[] = stored ? JSON.parse(stored) : [];
        const existingIdx = list.findIndex((c) => c.id === courseId);
        if (existingIdx >= 0) {
          list[existingIdx] = cleanedPayload as Course;
        } else {
          list.unshift(cleanedPayload as Course);
        }
        localStorage.setItem("medibridge_courses_cache", JSON.stringify(list));
      } catch (e) {
        console.warn("Could not write to course local cache:", e);
      }

      playSound("victory");
      if (onNotify) onNotify(`Course "${payload.title}" saved successfully with Routine, FAQ & Syllabus!`, "success");
      setIsModalOpen(false);
      setEditingCourse(null);
    } catch (err: any) {
      console.error("Error saving course:", err);
      if (onNotify) onNotify("Failed to save course: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  // Toggle show on landing page directly from list
  const handleToggleLandingVisibility = async (course: Course) => {
    try {
      playSound("click");
      const current = (course as any).showOnLandingPage !== false;
      const nextVal = !current;
      await updateDoc(doc(db, "courses", course.id), {
        showOnLandingPage: nextVal,
        updatedAt: new Date().toISOString()
      });

      if (onNotify) {
        onNotify(
          nextVal
            ? `Course "${course.title}" will now show on Pre-Login Landing Page!`
            : `Course "${course.title}" hidden from Pre-Login Landing Page.`,
          "success"
        );
      }
    } catch (err: any) {
      console.error("Error updating landing visibility:", err);
    }
  };

  // Delete Course
  const handleDeleteCourse = async (courseId: string) => {
    try {
      playSound("click");
      await deleteDoc(doc(db, "courses", courseId));
      playSound("levelup");
      if (onNotify) onNotify("Course deleted from store and landing page.", "success");
      setDeleteConfirmId(null);
    } catch (err: any) {
      console.error("Error deleting course:", err);
      if (onNotify) onNotify("Failed to delete course: " + err.message, "error");
    }
  };

  // Image Upload handler (Base64 file reader)
  const handleImageFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    targetField: "thumbnail" | "banner" | "instructorAvatar" | "routinePdfUrl" | "syllabusPdfUrl"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File size should be under 5MB for optimal performance.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string" && editingCourse) {
        setEditingCourse({
          ...editingCourse,
          [targetField]: reader.result
        });
        playSound("click");
      }
    };
    reader.readAsDataURL(file);
  };

  // Add Routine Item
  const handleAddRoutineItem = () => {
    if (!routineTitle.trim() || !editingCourse) return;
    const newItem: CourseRoutineItem = {
      id: "rt_" + Date.now(),
      dayOrDate: routineDay.trim() || "Sunday (রবিবার)",
      time: routineTime.trim() || "08:00 PM - 09:30 PM",
      type: routineType,
      title: routineTitle.trim(),
      subject: routineSubject,
      teacherName: routineTeacher.trim() || editingCourse.instructorName || "Mentor",
      roomOrBatch: routineRoom.trim() || "Live Room Alpha"
    };

    setEditingCourse({
      ...editingCourse,
      routineItems: [...(editingCourse.routineItems || []), newItem]
    });

    setRoutineTitle("");
    setRoutineRoom("");
    playSound("click");
  };

  // Add FAQ Item
  const handleAddFaqItem = () => {
    if (!newFaqQ.trim() || !newFaqA.trim() || !editingCourse) return;
    setEditingCourse({
      ...editingCourse,
      faq: [...(editingCourse.faq || []), { question: newFaqQ.trim(), answer: newFaqA.trim() }]
    });
    setNewFaqQ("");
    setNewFaqA("");
    playSound("click");
  };

  // Add Subject to Syllabus
  const handleAddSubjectToSyllabus = () => {
    if (!newSubjectName.trim() || !editingCourse) return;
    const newSubject = {
      subject: newSubjectName.trim(),
      chapters: []
    };
    const updatedSyllabus = [...(editingCourse.syllabus || []), newSubject];
    setEditingCourse({
      ...editingCourse,
      syllabus: updatedSyllabus
    });
    setActiveSubjectIdx(updatedSyllabus.length - 1);
    setNewSubjectName("");
    playSound("click");
  };

  // Add Chapter to active subject
  const handleAddChapterToSubject = () => {
    if (!newChapterTitle.trim() || !editingCourse || !editingCourse.syllabus) return;
    const updatedSyllabus = [...editingCourse.syllabus];
    if (!updatedSyllabus[activeSubjectIdx]) return;

    updatedSyllabus[activeSubjectIdx].chapters = [
      ...(updatedSyllabus[activeSubjectIdx].chapters || []),
      { chapterTitle: newChapterTitle.trim(), topics: [] }
    ];

    setEditingCourse({
      ...editingCourse,
      syllabus: updatedSyllabus
    });
    setActiveChapterIdx((updatedSyllabus[activeSubjectIdx].chapters?.length || 1) - 1);
    setNewChapterTitle("");
    playSound("click");
  };

  // Add Topic to active chapter
  const handleAddTopicToChapter = () => {
    if (!newTopicText.trim() || !editingCourse || !editingCourse.syllabus) return;
    const updatedSyllabus = [...editingCourse.syllabus];
    if (!updatedSyllabus[activeSubjectIdx]?.chapters?.[activeChapterIdx]) return;

    const currentTopics = updatedSyllabus[activeSubjectIdx].chapters[activeChapterIdx].topics || [];
    updatedSyllabus[activeSubjectIdx].chapters[activeChapterIdx].topics = [
      ...currentTopics,
      newTopicText.trim()
    ];

    setEditingCourse({
      ...editingCourse,
      syllabus: updatedSyllabus
    });
    setNewTopicText("");
    playSound("click");
  };

  // Filtered courses
  const filteredCourses = courses.filter((c) => {
    const q = (searchQuery || "").toLowerCase().trim();
    const matchSearch =
      !q ||
      (c.title || "").toLowerCase().includes(q) ||
      (c.shortDescription || "").toLowerCase().includes(q) ||
      (c.instructorName || "").toLowerCase().includes(q);

    if (selectedCategory === "all") return matchSearch;
    if (selectedCategory === "landing") return matchSearch && (c as any).showOnLandingPage !== false;
    if (selectedCategory === "hidden") return matchSearch && (c as any).showOnLandingPage === false;
    return matchSearch;
  });

  return (
    <div className="flex flex-col gap-6 text-white font-sans">
      {/* Top Banner & Control Bar */}
      <div className="bg-gradient-to-r from-[#181818] via-[#121212] to-[#181818] p-6 rounded-3xl border border-white/10 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 bg-red-950/60 border border-red-500/30 text-red-400 text-[10px] font-mono font-black uppercase rounded-full tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#FFD700]" />
              COURSE, ROUTINE, FAQ & SYLLABUS HUB
            </span>
            <span className="text-xs text-gray-400 font-mono">
              Total Courses: <strong>{courses.length}</strong> • Total Faculty: <strong>{teachers.length}</strong>
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-black font-display tracking-tight text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[#C1121F]" />
            Course Routine, FAQ, Syllabus & Faculty Management
          </h2>
          <p className="text-xs text-gray-400 max-w-3xl leading-relaxed font-sans">
            এখানে কোর্সের ভেতরের <strong>ক্লাস ও এক্সাম রুটিন (Routine)</strong>, <strong>সাধারণ জিজ্ঞাসা (FAQ)</strong>, <strong>অধ্যায়ভিত্তিক সিলেবাস (Syllabus)</strong> এবং <strong>শিক্ষকদের ইন/আউট (Teacher In or Out)</strong> সহজে পরিচালনা করুন।
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          {courses.length === 0 && (
            <button
              onClick={handleSeedDefaultCourses}
              disabled={isInitializing}
              className="px-4 py-2.5 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 text-yellow-300 font-mono text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isInitializing ? "animate-spin" : ""}`} />
              <span>{isInitializing ? "Initializing..." : "⚡ Seed Default Courses & Routine"}</span>
            </button>
          )}

          <button
            onClick={handleCreateNewCourse}
            className="px-5 py-2.5 bg-[#C1121F] hover:bg-red-700 active:scale-95 text-white font-mono text-xs font-black uppercase rounded-xl transition flex items-center gap-2 shadow-[0_0_20px_rgba(193,18,31,0.4)] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Course</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#111111] p-4 rounded-2xl border border-white/5">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search courses, mentors, subjects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/60 border border-gray-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#C1121F] placeholder-gray-500 font-mono"
          />
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-gray-500 text-[10px] uppercase">Filter:</span>
          {[
            { id: "all", label: "All Courses" },
            { id: "landing", label: "Landing Showcase" },
            { id: "hidden", label: "Hidden / Draft" }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg transition font-bold ${
                selectedCategory === cat.id
                  ? "bg-[#C1121F] text-white shadow"
                  : "bg-white/5 text-gray-400 hover:text-white"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Courses Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-gray-500 font-mono text-xs flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-[#C1121F] border-t-transparent rounded-full animate-spin"></div>
          <span>Loading courses and schedules from Firestore...</span>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="p-12 bg-[#121212] rounded-3xl border border-white/10 text-center flex flex-col items-center gap-4">
          <BookOpen className="w-12 h-12 text-gray-600" />
          <div className="space-y-1">
            <h4 className="text-base font-bold text-white">No Courses Found</h4>
            <p className="text-xs text-gray-400 max-w-md">
              There are currently no courses matching your filter. Seed default medical batches or create a new course!
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSeedDefaultCourses}
              className="px-5 py-2.5 bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 rounded-xl text-xs font-mono font-bold hover:bg-yellow-500/30 transition"
            >
              ⚡ Seed All Default Medical Batches & Routines
            </button>
            <button
              onClick={handleCreateNewCourse}
              className="px-5 py-2.5 bg-[#C1121F] text-white rounded-xl text-xs font-mono font-bold hover:bg-red-700 transition"
            >
              + Create Blank Course
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => {
            const isLandingVisible = (course as any).showOnLandingPage !== false;
            const assignedTeachersCount = teachers.filter(
              (t) => t.assignedCourseIds && t.assignedCourseIds.includes(course.id)
            ).length;
            const routineCount = course.routineItems?.length || 0;
            const faqCount = course.faq?.length || 0;
            const syllabusSubjectsCount = course.syllabus?.length || 0;

            return (
              <div
                key={course.id}
                className="bg-[#141414] rounded-2xl border border-white/10 hover:border-red-900/60 transition-all duration-300 flex flex-col overflow-hidden shadow-xl group relative"
              >
                {/* Course Cover Photo Thumbnail */}
                <div className="w-full h-44 bg-black relative overflow-hidden">
                  <img
                    src={course.thumbnail || PRESET_COVERS[0].url}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent"></div>

                  {/* Badges Over Cover */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-mono font-black uppercase tracking-wider border shadow ${
                        isLandingVisible
                          ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-300"
                          : "bg-gray-900/80 border-gray-700 text-gray-400"
                      }`}
                    >
                      {isLandingVisible ? "● LANDING SHOWCASE" : "○ HIDDEN"}
                    </span>
                  </div>

                  <div className="absolute top-3 right-3">
                    <span className="px-2 py-0.5 rounded bg-black/80 border border-[#FFD700]/30 text-[#FFD700] font-mono font-black text-xs">
                      ৳{course.discountedPrice.toLocaleString()}
                    </span>
                  </div>

                  {/* Lead Instructor at Bottom of Thumbnail */}
                  <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] text-gray-300 font-mono">
                    <div className="flex items-center gap-2 truncate">
                      <img
                        src={
                          course.instructorAvatar ||
                          "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=60"
                        }
                        alt={course.instructorName}
                        className="w-5 h-5 rounded-full border border-red-500 object-cover"
                      />
                      <span className="truncate text-white font-bold">{course.instructorName}</span>
                    </div>
                    <span className="text-[#FFD700] text-[10px] font-bold">{course.duration}</span>
                  </div>
                </div>

                {/* Card Content Body */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2.5">
                    <h3 className="font-bold text-base text-white line-clamp-1 group-hover:text-[#FFD700] transition">
                      {course.title}
                    </h3>

                    <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed font-sans">
                      {course.shortDescription || "Medical admission preparation program."}
                    </p>

                    {/* Course Features / Metrics Pill Group */}
                    <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono pt-1">
                      <div className="px-2 py-1 bg-white/[0.03] border border-white/5 rounded-lg flex items-center justify-between text-gray-300">
                        <span className="flex items-center gap-1 text-emerald-400">
                          <Calendar className="w-3 h-3" /> Routine:
                        </span>
                        <span className="font-bold text-white">{routineCount} slots</span>
                      </div>

                      <div className="px-2 py-1 bg-white/[0.03] border border-white/5 rounded-lg flex items-center justify-between text-gray-300">
                        <span className="flex items-center gap-1 text-sky-400">
                          <HelpCircle className="w-3 h-3" /> FAQ:
                        </span>
                        <span className="font-bold text-white">{faqCount} items</span>
                      </div>

                      <div className="px-2 py-1 bg-white/[0.03] border border-white/5 rounded-lg flex items-center justify-between text-gray-300">
                        <span className="flex items-center gap-1 text-purple-400">
                          <BookOpen className="w-3 h-3" /> Syllabus:
                        </span>
                        <span className="font-bold text-white">{syllabusSubjectsCount} papers</span>
                      </div>

                      <div className="px-2 py-1 bg-white/[0.03] border border-white/5 rounded-lg flex items-center justify-between text-gray-300">
                        <span className="flex items-center gap-1 text-amber-400">
                          <Users className="w-3 h-3" /> Faculty:
                        </span>
                        <span className="font-bold text-white">{assignedTeachersCount} in</span>
                      </div>
                    </div>
                  </div>

                  {/* 4 Dedicated Section Jump Buttons */}
                  <div className="grid grid-cols-4 gap-1 pt-2 border-t border-white/10 font-mono text-[10px]">
                    <button
                      onClick={() => handleEditCourse(course, "routine")}
                      className="p-1.5 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/20 rounded-lg flex flex-col items-center gap-0.5 cursor-pointer transition"
                      title="Manage Routine & Timetable"
                    >
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Routine</span>
                    </button>

                    <button
                      onClick={() => handleEditCourse(course, "faq")}
                      className="p-1.5 bg-sky-950/40 hover:bg-sky-900/60 text-sky-300 border border-sky-500/20 rounded-lg flex flex-col items-center gap-0.5 cursor-pointer transition"
                      title="Manage Frequently Asked Questions"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
                      <span>FAQ</span>
                    </button>

                    <button
                      onClick={() => handleEditCourse(course, "syllabus")}
                      className="p-1.5 bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 border border-purple-500/20 rounded-lg flex flex-col items-center gap-0.5 cursor-pointer transition"
                      title="Manage Syllabus Outline & Chapters"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                      <span>Syllabus</span>
                    </button>

                    <button
                      onClick={() => handleEditCourse(course, "teachers")}
                      className="p-1.5 bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-500/20 rounded-lg flex flex-col items-center gap-0.5 cursor-pointer transition"
                      title="Manage Teachers In / Out"
                    >
                      <Users className="w-3.5 h-3.5 text-amber-400" />
                      <span>Teachers</span>
                    </button>
                  </div>

                  {/* Primary Edit / Visibility Toolbar */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleToggleLandingVisibility(course)}
                      title={isLandingVisible ? "Hide from Pre-Login Landing Page" : "Show on Pre-Login Landing Page"}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-mono transition cursor-pointer flex items-center gap-1.5 ${
                        isLandingVisible
                          ? "bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-900/60"
                          : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span className="text-[10px]">{isLandingVisible ? "Landing ON" : "Landing OFF"}</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleEditCourse(course, "basic")}
                        className="px-3 py-1.5 bg-[#C1121F] hover:bg-red-700 text-white rounded-xl text-xs font-mono font-bold flex items-center gap-1 cursor-pointer transition shadow"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit Course</span>
                      </button>

                      <button
                        onClick={() => setDeleteConfirmId(course.id)}
                        title="Delete Course"
                        className="p-2 bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-400 rounded-xl text-xs font-mono transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-red-500/30 w-full max-w-md rounded-2xl p-6 flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-500">
              <Trash2 className="w-6 h-6" />
              <h3 className="text-lg font-bold text-white font-display">Confirm Course Deletion</h3>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed font-sans">
              Are you sure you want to delete this course? It will be removed from the Pre-Login Landing Page, Store, and Firestore permanently.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-800">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-mono rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteCourse(deleteConfirmId)}
                className="px-5 py-2 bg-[#C1121F] hover:bg-red-700 text-white text-xs font-mono font-bold uppercase rounded-xl cursor-pointer shadow-lg shadow-red-900/30"
              >
                Delete Course
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPREHENSIVE COURSE EDITOR MODAL WITH 5 TABS */}
      {isModalOpen && editingCourse && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-[#111111] border border-white/15 w-full max-w-5xl rounded-3xl p-5 sm:p-7 flex flex-col gap-5 max-h-[94vh] overflow-y-auto shadow-2xl relative my-auto">
            {/* Modal Header & Tabs Navigation */}
            <div className="flex flex-col gap-3 border-b border-gray-800 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#C1121F] font-mono font-black uppercase tracking-wider">
                    {isNewCourse ? "NEW COURSE LAUNCHER" : "COURSE & CURRICULUM ARCHITECT"}
                  </span>
                  <h3 className="text-lg sm:text-xl font-black text-white font-display">
                    {editingCourse.title || "Untitled Course"}
                  </h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 5 Modal Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none font-mono text-xs font-bold uppercase pt-1">
                {[
                  { id: "basic", label: "১. বেসিক ও কভার ছবি", icon: Sliders },
                  { id: "routine", label: `২. রুটিন (${editingCourse.routineItems?.length || 0})`, icon: Calendar },
                  { id: "faq", label: `৩. FAQ (${editingCourse.faq?.length || 0})`, icon: HelpCircle },
                  { id: "syllabus", label: `৪. সিলেবাস (${editingCourse.syllabus?.length || 0})`, icon: BookOpen },
                  {
                    id: "teachers",
                    label: `৫. শিক্ষক ইন/আউট (${teachers.filter((t) => t.assignedCourseIds?.includes(editingCourse.id || "")).length})`,
                    icon: Users
                  }
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeModalTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        playSound("click");
                        setActiveModalTab(tab.id as ModalTab);
                      }}
                      className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                        isActive
                          ? "bg-[#C1121F] text-white shadow-[0_0_12px_rgba(193,18,31,0.4)]"
                          : "bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 text-[#FFD700]" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handleSaveCourse} className="flex flex-col gap-6">
              {/* TAB 1: BASIC INFO, COVERS & METRICS */}
              {activeModalTab === "basic" && (
                <div className="space-y-6">
                  {/* Covers Section */}
                  <div className="bg-black/50 p-4 sm:p-5 rounded-2xl border border-white/10 space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                      <h4 className="text-xs font-mono font-bold text-[#FFD700] uppercase flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-[#FFD700]" />
                        কোর্স কভার ছবি ও ব্যানার (Cover Photos & Aspect Ratio)
                      </h4>
                      <button
                        type="button"
                        onClick={() => setShowPresetPicker(!showPresetPicker)}
                        className="text-[10px] font-mono text-cyan-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" />
                        {showPresetPicker ? "Hide Presets" : "Pick from 8+ Medical Photo Presets"}
                      </button>
                    </div>

                    {showPresetPicker && (
                      <div className="bg-[#161616] p-4 rounded-xl border border-cyan-500/30 space-y-3">
                        <span className="text-[10px] font-mono text-cyan-300 block uppercase font-bold">
                          Select Medical Cover Photo Preset (১-ক্লিকে সিলেক্ট করুন):
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          {PRESET_COVERS.map((preset, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setEditingCourse({
                                  ...editingCourse,
                                  thumbnail: preset.url,
                                  banner: preset.banner
                                });
                                playSound("click");
                              }}
                              className={`p-1.5 rounded-xl border text-left transition flex flex-col gap-1.5 overflow-hidden group cursor-pointer ${
                                editingCourse.thumbnail === preset.url
                                  ? "border-emerald-500 bg-emerald-950/40"
                                  : "border-white/5 bg-black/40 hover:border-white/20"
                              }`}
                            >
                              <div className="w-full h-16 rounded-lg overflow-hidden relative">
                                <img src={preset.url} alt={preset.title} className="w-full h-full object-cover" />
                                {editingCourse.thumbnail === preset.url && (
                                  <div className="absolute top-1 right-1 bg-emerald-500 text-black p-0.5 rounded-full">
                                    <Check className="w-3 h-3" />
                                  </div>
                                )}
                              </div>
                              <span className="text-[9px] text-gray-300 font-mono line-clamp-1 group-hover:text-white">
                                {preset.title}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Image Inputs */}
                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Thumbnail */}
                      <div className="space-y-2">
                        <label className="text-[11px] font-mono font-bold uppercase text-gray-300 block">
                          Main Thumbnail / Cover Photo URL
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="url"
                            placeholder="https://..."
                            value={editingCourse.thumbnail || ""}
                            onChange={(e) => setEditingCourse({ ...editingCourse, thumbnail: e.target.value })}
                            className="flex-1 bg-black border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C1121F] font-mono"
                            required
                          />
                          <label className="px-3 py-2 bg-white/10 hover:bg-white/15 text-gray-300 rounded-xl text-xs font-mono flex items-center gap-1.5 cursor-pointer shrink-0">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageFileUpload(e, "thumbnail")}
                              className="hidden"
                            />
                          </label>
                        </div>
                        {editingCourse.thumbnail && (
                          <div className="w-full h-28 rounded-xl overflow-hidden border border-white/10 bg-black relative shadow">
                            <img src={editingCourse.thumbnail} alt="Thumbnail Preview" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>

                      {/* Banner */}
                      <div className="space-y-2">
                        <label className="text-[11px] font-mono font-bold uppercase text-gray-300 block">
                          Course Detail Banner Photo URL
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="url"
                            placeholder="https://..."
                            value={editingCourse.banner || ""}
                            onChange={(e) => setEditingCourse({ ...editingCourse, banner: e.target.value })}
                            className="flex-1 bg-black border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C1121F] font-mono"
                          />
                          <label className="px-3 py-2 bg-white/10 hover:bg-white/15 text-gray-300 rounded-xl text-xs font-mono flex items-center gap-1.5 cursor-pointer shrink-0">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageFileUpload(e, "banner")}
                              className="hidden"
                            />
                          </label>
                        </div>
                        {editingCourse.banner && (
                          <div className="w-full h-28 rounded-xl overflow-hidden border border-white/10 bg-black relative shadow">
                            <img src={editingCourse.banner} alt="Banner Preview" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Basic Info */}
                  <div className="bg-black/50 p-4 sm:p-5 rounded-2xl border border-white/10 space-y-4">
                    <h4 className="text-xs font-mono font-bold text-[#FFD700] uppercase border-b border-gray-800 pb-2">
                      বেসিক কোর্স ইনফরমেশন
                    </h4>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold font-mono uppercase text-gray-300 block mb-1">
                          Course Title (কোর্স নাম) *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Medical Standard Exam Batch 2027"
                          value={editingCourse.title || ""}
                          onChange={(e) => setEditingCourse({ ...editingCourse, title: e.target.value })}
                          className="w-full bg-black border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C1121F]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold font-mono uppercase text-gray-300 block mb-1">
                          Duration Badge (মেয়াদ)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 10 Months, Admission Special"
                          value={editingCourse.duration || ""}
                          onChange={(e) => setEditingCourse({ ...editingCourse, duration: e.target.value })}
                          className="w-full bg-black border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C1121F]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold font-mono uppercase text-gray-300 block mb-1">
                        Short Description (সংক্ষিপ্ত বিবরণ)
                      </label>
                      <textarea
                        rows={2}
                        value={editingCourse.shortDescription || ""}
                        onChange={(e) => setEditingCourse({ ...editingCourse, shortDescription: e.target.value })}
                        placeholder="বাংলায় ২ লাইনের আকর্ষণীয় বিবরণ লিখুন..."
                        className="w-full bg-black border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C1121F] resize-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold font-mono uppercase text-gray-300 block mb-1">
                        Full Description (বিস্তারিত বিবরণ ও নির্দেশিকা)
                      </label>
                      <textarea
                        rows={4}
                        value={editingCourse.fullDescription || ""}
                        onChange={(e) => setEditingCourse({ ...editingCourse, fullDescription: e.target.value })}
                        placeholder="কোর্সের যাবতীয় সুবিধা, সিলেবাস কভারেজ ইত্যাদি..."
                        className="w-full bg-black border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C1121F]"
                      />
                    </div>

                    {/* Pricing Grid */}
                    <div className="grid sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2">
                      <div>
                        <label className="text-[10px] font-bold font-mono uppercase text-gray-400 block mb-1">
                          Regular Price (৳)
                        </label>
                        <input
                          type="number"
                          value={editingCourse.originalPrice ?? 0}
                          onChange={(e) => setEditingCourse({ ...editingCourse, originalPrice: Number(e.target.value) })}
                          className="w-full bg-black border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-300 font-mono focus:outline-none focus:border-[#C1121F]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold font-mono uppercase text-yellow-400 block mb-1">
                          Offer Price (৳) *
                        </label>
                        <input
                          type="number"
                          required
                          value={editingCourse.discountedPrice ?? 0}
                          onChange={(e) => setEditingCourse({ ...editingCourse, discountedPrice: Number(e.target.value) })}
                          className="w-full bg-black border border-yellow-500/50 rounded-xl px-3 py-2 text-sm text-yellow-400 font-mono font-bold focus:outline-none focus:border-yellow-400"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold font-mono uppercase text-emerald-400 block mb-1">
                          Total Exams
                        </label>
                        <input
                          type="number"
                          value={editingCourse.totalExams ?? 50}
                          onChange={(e) => setEditingCourse({ ...editingCourse, totalExams: Number(e.target.value) })}
                          className="w-full bg-black border border-gray-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#C1121F]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold font-mono uppercase text-blue-400 block mb-1">
                          Total Classes
                        </label>
                        <input
                          type="number"
                          value={editingCourse.totalClasses ?? 40}
                          onChange={(e) => setEditingCourse({ ...editingCourse, totalClasses: Number(e.target.value) })}
                          className="w-full bg-black border border-gray-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#C1121F]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold font-mono uppercase text-purple-400 block mb-1">
                          Total Sheets
                        </label>
                        <input
                          type="number"
                          value={editingCourse.totalMaterials ?? 60}
                          onChange={(e) => setEditingCourse({ ...editingCourse, totalMaterials: Number(e.target.value) })}
                          className="w-full bg-black border border-gray-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#C1121F]"
                        />
                      </div>
                    </div>

                    {/* Landing Page Visibility */}
                    <div className="bg-[#181818] p-3.5 rounded-xl border border-emerald-500/20 flex items-center justify-between gap-4">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Eye className="w-4 h-4 text-emerald-400" />
                          Show on Pre-Login Landing Page (লগইন করার আগের পেইজে শো করবে)
                        </span>
                        <p className="text-[10px] text-gray-400">
                          If turned ON, visitors can view and explore this course details and cover photo directly on the homepage.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={(editingCourse as any).showOnLandingPage !== false}
                        onChange={(e) => setEditingCourse({ ...editingCourse, showOnLandingPage: e.target.checked } as any)}
                        className="accent-[#C1121F] w-5 h-5 rounded cursor-pointer shrink-0"
                      />
                    </div>

                    {/* YouTube Free Demo Class Direct Integration */}
                    <div className="bg-[#181818] p-4 rounded-xl border border-red-500/30 space-y-4">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <div className="flex items-center gap-2">
                          <Radio className="w-4 h-4 text-red-500 animate-pulse" />
                          <span className="text-xs font-bold text-white uppercase font-mono">
                            🎥 YouTube Free Demo Class (ইউটিউব ডেমো ক্লাস ইন্টিগ্রেশন)
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-red-400 font-bold bg-red-950/60 px-2 py-0.5 rounded border border-red-500/30">
                          FREE ACCESS FOR ALL STUDENTS
                        </span>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-bold font-mono uppercase text-gray-300 block mb-1">
                            YouTube Video URL or ID (যেমন: https://www.youtube.com/watch?v=...)
                          </label>
                          <input
                            type="url"
                            placeholder="https://www.youtube.com/watch?v=5qap5aO4i9A"
                            value={editingCourse.demoVideoUrl || ""}
                            onChange={(e) => setEditingCourse({ ...editingCourse, demoVideoUrl: e.target.value })}
                            className="w-full bg-black border border-gray-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-red-500"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold font-mono uppercase text-gray-300 block mb-1">
                            Demo Video Title (ভিডিও শিরোনাম)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. কোষ ও এর গঠন - ফ্লুইড মোজাইক মডেল স্পেশাল ক্লাস"
                            value={editingCourse.demoVideoTitle || ""}
                            onChange={(e) => setEditingCourse({ ...editingCourse, demoVideoTitle: e.target.value })}
                            className="w-full bg-black border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold font-mono uppercase text-gray-300 block mb-1">
                            Subject (বিষয়)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Biology 1st Paper / Chemistry"
                            value={editingCourse.demoVideoSubject || ""}
                            onChange={(e) => setEditingCourse({ ...editingCourse, demoVideoSubject: e.target.value })}
                            className="w-full bg-black border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold font-mono uppercase text-gray-300 block mb-1">
                            Duration (সময়কাল)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 45 mins"
                            value={editingCourse.demoVideoDuration || ""}
                            onChange={(e) => setEditingCourse({ ...editingCourse, demoVideoDuration: e.target.value })}
                            className="w-full bg-black border border-gray-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-red-500"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="text-[10px] font-bold font-mono uppercase text-gray-300 block mb-1">
                            Demo Lecture Sheet PDF URL (লেকচার শিট লিংক)
                          </label>
                          <input
                            type="url"
                            placeholder="https://drive.google.com/file/d/..."
                            value={editingCourse.demoPdfUrl || ""}
                            onChange={(e) => setEditingCourse({ ...editingCourse, demoPdfUrl: e.target.value })}
                            className="w-full bg-black border border-gray-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-red-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ROUTINE & SCHEDULE MANAGER */}
              {activeModalTab === "routine" && (
                <div className="space-y-6">
                  {/* Routine PDF & Overview Info */}
                  <div className="bg-black/50 p-4 sm:p-5 rounded-2xl border border-white/10 space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                      <h4 className="text-xs font-mono font-bold text-[#FFD700] uppercase flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-emerald-400" />
                        রুটিন সামারি ও অফিসিয়াল PDF / ইমেজ লিংক
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCourse({
                            ...editingCourse,
                            routineItems: DEFAULT_MEDICAL_ROUTINE
                          });
                          playSound("levelup");
                          if (onNotify) onNotify("Standard Medical Weekly Routine Loaded!", "success");
                        }}
                        className="text-[10px] font-mono text-emerald-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" />
                        ⚡ Load Standard Medical Weekly Routine
                      </button>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold font-mono uppercase text-yellow-400 block mb-1">
                          Exam Routine Text (পরীক্ষার সময়সূচী বিবরণ)
                        </label>
                        <textarea
                          rows={2}
                          value={editingCourse.examInfo || ""}
                          onChange={(e) => setEditingCourse({ ...editingCourse, examInfo: e.target.value })}
                          placeholder="e.g. প্রতিদিন রাত ৮:০০ টায় লাইভ এক্সাম অনুষ্ঠিত হয়..."
                          className="w-full bg-black border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C1121F] resize-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold font-mono uppercase text-blue-400 block mb-1">
                          Class Routine Text (ক্লাসের সময়সূচী বিবরণ)
                        </label>
                        <textarea
                          rows={2}
                          value={editingCourse.classInfo || ""}
                          onChange={(e) => setEditingCourse({ ...editingCourse, classInfo: e.target.value })}
                          placeholder="e.g. সপ্তাহে ৪ দিন সন্ধ্যা ৭:৩০ মিনিটে লাইভ ও রেকর্ডেড ক্লাস..."
                          className="w-full bg-black border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C1121F] resize-none"
                        />
                      </div>
                    </div>

                    {/* PDF Routine Link */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-mono font-bold uppercase text-gray-300 block">
                        Official Routine PDF / Google Drive / Image Link (শিক্ষার্থীরা ডাউনলোড করতে পারবে)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          placeholder="https://drive.google.com/... or https://..."
                          value={editingCourse.routinePdfUrl || ""}
                          onChange={(e) => setEditingCourse({ ...editingCourse, routinePdfUrl: e.target.value })}
                          className="flex-1 bg-black border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C1121F] font-mono"
                        />
                        <label className="px-3 py-2 bg-white/10 hover:bg-white/15 text-gray-300 rounded-xl text-xs font-mono flex items-center gap-1.5 cursor-pointer shrink-0">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload PDF/Doc</span>
                          <input
                            type="file"
                            accept=".pdf,image/*"
                            onChange={(e) => handleImageFileUpload(e, "routinePdfUrl")}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Add Routine Timetable Slot */}
                  <div className="bg-black/50 p-4 sm:p-5 rounded-2xl border border-white/10 space-y-4">
                    <h4 className="text-xs font-mono font-bold text-emerald-400 uppercase border-b border-gray-800 pb-2 flex items-center justify-between">
                      <span>সাপ্তাহিক রুটিন টেবিল বিল্ডার ({editingCourse.routineItems?.length || 0} Slots)</span>
                    </h4>

                    <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3 bg-[#161616] p-3.5 rounded-xl border border-white/5">
                      <div>
                        <label className="text-[10px] font-mono text-gray-400 uppercase block mb-1">Day / Date</label>
                        <input
                          type="text"
                          placeholder="e.g. রবিবার (Sunday)"
                          value={routineDay}
                          onChange={(e) => setRoutineDay(e.target.value)}
                          className="w-full bg-black border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-mono text-gray-400 uppercase block mb-1">Time Slot</label>
                        <input
                          type="text"
                          placeholder="e.g. 07:30 PM - 09:00 PM"
                          value={routineTime}
                          onChange={(e) => setRoutineTime(e.target.value)}
                          className="w-full bg-black border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-mono text-gray-400 uppercase block mb-1">Type</label>
                        <select
                          value={routineType}
                          onChange={(e) => setRoutineType(e.target.value as any)}
                          className="w-full bg-black border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        >
                          <option value="class">🎥 Live Class (লাইভ ক্লাস)</option>
                          <option value="exam">📝 Daily Exam (মডেল টেস্ট)</option>
                          <option value="model_test">🏆 Paper Final (পেপার ফাইনাল)</option>
                          <option value="doubt_solve">💬 Doubt Solve (সলভ ক্লাস)</option>
                          <option value="revision">🔄 Revision (রিভিশন)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-mono text-gray-400 uppercase block mb-1">Subject</label>
                        <select
                          value={routineSubject}
                          onChange={(e) => setRoutineSubject(e.target.value)}
                          className="w-full bg-black border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        >
                          <option value="Biology">Biology (জীববিজ্ঞান)</option>
                          <option value="Chemistry">Chemistry (রসায়ন)</option>
                          <option value="Physics">Physics (পদার্থবিজ্ঞান)</option>
                          <option value="GK">General Knowledge (সাধারণ জ্ঞান)</option>
                          <option value="English">English (ইংরেজি)</option>
                          <option value="Special">Special Mega Test</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-mono text-gray-400 uppercase block mb-1">
                          Title / Chapter Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Biology 1st Paper: কোষ ও এর গঠন মাস্টারক্লাস"
                          value={routineTitle}
                          onChange={(e) => setRoutineTitle(e.target.value)}
                          className="w-full bg-black border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-mono text-gray-400 uppercase block mb-1">
                          Teacher / Mentor
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Shahriar Kabir (DMC)"
                          value={routineTeacher}
                          onChange={(e) => setRoutineTeacher(e.target.value)}
                          className="w-full bg-black border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={handleAddRoutineItem}
                          className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold rounded-lg transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Slot</span>
                        </button>
                      </div>
                    </div>

                    {/* Routine Items Table */}
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {(editingCourse.routineItems || []).map((item, idx) => (
                        <div
                          key={item.id || idx}
                          className="p-3 bg-black/60 rounded-xl border border-white/5 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-3 flex-1 truncate">
                            <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 font-mono text-[10px] font-bold shrink-0">
                              {item.dayOrDate}
                            </span>
                            <span className="text-[11px] text-[#FFD700] font-mono shrink-0">{item.time}</span>
                            <span className="font-bold text-white truncate">{item.title}</span>
                            <span className="text-gray-400 font-mono text-[10px] shrink-0">({item.subject})</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingCourse({
                                ...editingCourse,
                                routineItems: editingCourse.routineItems?.filter((_, i) => i !== idx)
                              });
                            }}
                            className="text-gray-500 hover:text-red-400 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: FAQ MANAGER */}
              {activeModalTab === "faq" && (
                <div className="space-y-6">
                  <div className="bg-black/50 p-4 sm:p-5 rounded-2xl border border-white/10 space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                      <h4 className="text-xs font-mono font-bold text-[#FFD700] uppercase flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 text-sky-400" />
                        সাধারণ জিজ্ঞাসা ও উত্তর (FAQ Manager)
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCourse({
                            ...editingCourse,
                            faq: DEFAULT_MEDICAL_FAQS
                          });
                          playSound("levelup");
                          if (onNotify) onNotify("Default Medical Admission FAQs Loaded!", "success");
                        }}
                        className="text-[10px] font-mono text-sky-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" />
                        ⚡ Load Standard Medical FAQs
                      </button>
                    </div>

                    {/* Add FAQ Form */}
                    <div className="bg-[#161616] p-4 rounded-xl border border-white/5 space-y-3">
                      <div>
                        <label className="text-[10px] font-mono text-gray-300 uppercase block mb-1 font-bold">
                          Question (প্রশ্ন)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. ক্লাস মিস করলে পরবর্তীতে রেকর্ডিং দেখা যাবে কি?"
                          value={newFaqQ}
                          onChange={(e) => setNewFaqQ(e.target.value)}
                          className="w-full bg-black border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-mono text-gray-300 uppercase block mb-1 font-bold">
                          Answer (উত্তর)
                        </label>
                        <textarea
                          rows={2}
                          placeholder="e.g. হ্যাঁ, প্রতিটি ক্লাসের ফুল এইচডি রেকর্ডিং ২৪/৭ এক্সেস করা যাবে..."
                          value={newFaqA}
                          onChange={(e) => setNewFaqA(e.target.value)}
                          className="w-full bg-black border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 resize-none"
                        />
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleAddFaqItem}
                          className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add FAQ Item</span>
                        </button>
                      </div>
                    </div>

                    {/* FAQ Items List */}
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                      {(editingCourse.faq || []).map((faqItem, idx) => (
                        <div
                          key={idx}
                          className="p-4 bg-black/60 rounded-xl border border-white/5 space-y-2 relative group"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-xs font-bold text-white flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 text-[10px] font-mono flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              {faqItem.question}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCourse({
                                  ...editingCourse,
                                  faq: editingCourse.faq?.filter((_, i) => i !== idx)
                                });
                              }}
                              className="text-gray-500 hover:text-red-400 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-xs text-gray-400 font-sans pl-7 leading-relaxed">{faqItem.answer}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: SYLLABUS & CHAPTERS MANAGER */}
              {activeModalTab === "syllabus" && (
                <div className="space-y-6">
                  <div className="bg-black/50 p-4 sm:p-5 rounded-2xl border border-white/10 space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                      <h4 className="text-xs font-mono font-bold text-[#FFD700] uppercase flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-purple-400" />
                        সিলেবাস ও অধ্যায়ভিত্তিক আউটলাইন (Syllabus Manager)
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCourse({
                            ...editingCourse,
                            syllabus: DEFAULT_MEDICAL_SYLLABUS
                          });
                          playSound("levelup");
                          if (onNotify) onNotify("Complete Medical Syllabus Loaded!", "success");
                        }}
                        className="text-[10px] font-mono text-purple-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" />
                        ⚡ Load Full Medical Syllabus Outline
                      </button>
                    </div>

                    {/* Syllabus PDF Link */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-mono font-bold uppercase text-gray-300 block">
                        Full Syllabus Booklet PDF Link (শিক্ষার্থীদের জন্য)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          placeholder="https://drive.google.com/..."
                          value={editingCourse.syllabusPdfUrl || ""}
                          onChange={(e) => setEditingCourse({ ...editingCourse, syllabusPdfUrl: e.target.value })}
                          className="flex-1 bg-black border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C1121F] font-mono"
                        />
                        <label className="px-3 py-2 bg-white/10 hover:bg-white/15 text-gray-300 rounded-xl text-xs font-mono flex items-center gap-1.5 cursor-pointer shrink-0">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload PDF</span>
                          <input
                            type="file"
                            accept=".pdf,image/*"
                            onChange={(e) => handleImageFileUpload(e, "syllabusPdfUrl")}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Structured Subject/Chapter/Topic Builder */}
                    <div className="space-y-4 pt-2">
                      {/* Add Subject Row */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Add Subject (e.g. Biology 1st Paper / রসায়ন ২য় পত্র)..."
                          value={newSubjectName}
                          onChange={(e) => setNewSubjectName(e.target.value)}
                          className="flex-1 bg-black border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                        />
                        <button
                          type="button"
                          onClick={handleAddSubjectToSyllabus}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold rounded-xl transition flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Subject</span>
                        </button>
                      </div>

                      {/* Subjects Tabs */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                        {(editingCourse.syllabus || []).map((sub, sIdx) => (
                          <button
                            key={sIdx}
                            type="button"
                            onClick={() => {
                              playSound("click");
                              setActiveSubjectIdx(sIdx);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                              activeSubjectIdx === sIdx
                                ? "bg-purple-600 text-white shadow"
                                : "bg-black/60 border border-white/5 text-gray-400 hover:text-white"
                            }`}
                          >
                            <span>{sub.subject}</span>
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCourse({
                                  ...editingCourse,
                                  syllabus: editingCourse.syllabus?.filter((_, i) => i !== sIdx)
                                });
                              }}
                              className="text-gray-400 hover:text-red-400 ml-1"
                            >
                              ×
                            </span>
                          </button>
                        ))}
                      </div>

                      {/* Active Subject Chapters Builder */}
                      {editingCourse.syllabus && editingCourse.syllabus[activeSubjectIdx] && (
                        <div className="bg-[#161616] p-4 rounded-xl border border-white/5 space-y-4">
                          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                            <span className="text-xs font-bold text-purple-300 uppercase font-mono">
                              Chapters under: {editingCourse.syllabus[activeSubjectIdx].subject}
                            </span>
                          </div>

                          {/* Add Chapter Row */}
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Add Chapter (e.g. কোষ ও এর গঠন / গুণগত রসায়ন)..."
                              value={newChapterTitle}
                              onChange={(e) => setNewChapterTitle(e.target.value)}
                              className="flex-1 bg-black border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                            />
                            <button
                              type="button"
                              onClick={handleAddChapterToSubject}
                              className="px-4 py-2 bg-purple-950/60 border border-purple-500/40 text-purple-300 rounded-xl text-xs font-mono font-bold"
                            >
                              + Add Chapter
                            </button>
                          </div>

                          {/* Chapters List */}
                          <div className="space-y-3">
                            {editingCourse.syllabus[activeSubjectIdx].chapters?.map((chap, cIdx) => (
                              <div
                                key={cIdx}
                                className="p-3 bg-black/60 rounded-xl border border-white/5 space-y-2"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-white">
                                    {cIdx + 1}. {chap.chapterTitle}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updatedSyllabus = [...(editingCourse.syllabus || [])];
                                      updatedSyllabus[activeSubjectIdx].chapters = updatedSyllabus[
                                        activeSubjectIdx
                                      ].chapters.filter((_, i) => i !== cIdx);
                                      setEditingCourse({
                                        ...editingCourse,
                                        syllabus: updatedSyllabus
                                      });
                                    }}
                                    className="text-gray-500 hover:text-red-400"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                {/* Topics Pills */}
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {chap.topics?.map((top, tIdx) => (
                                    <span
                                      key={tIdx}
                                      className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-gray-300 font-mono flex items-center gap-1"
                                    >
                                      • {top}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updatedSyllabus = [...(editingCourse.syllabus || [])];
                                          updatedSyllabus[activeSubjectIdx].chapters[cIdx].topics =
                                            chap.topics.filter((_, i) => i !== tIdx);
                                          setEditingCourse({
                                            ...editingCourse,
                                            syllabus: updatedSyllabus
                                          });
                                        }}
                                        className="hover:text-red-400 ml-0.5"
                                      >
                                        ×
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: TEACHER IN / OUT (FACULTY MANAGEMENT) */}
              {activeModalTab === "teachers" && (
                <div className="space-y-6">
                  <div className="bg-black/50 p-4 sm:p-5 rounded-2xl border border-white/10 space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                      <div>
                        <h4 className="text-xs font-mono font-bold text-[#FFD700] uppercase flex items-center gap-2">
                          <Users className="w-4 h-4 text-amber-400" />
                          কোর্স শিক্ষক ইন বা আউট (Teacher In or Out Management)
                        </h4>
                        <p className="text-[10px] text-gray-400 font-sans mt-0.5">
                          যেসব শিক্ষককে এই কোর্সের সাথে যুক্ত রাখতে চান তাদের "IN" অন রাখুন এবং লিড মেন্টর সিলেক্ট করুন।
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowAddTeacherModal(true)}
                        className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-mono text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>+ Add New Doctor/Teacher</span>
                      </button>
                    </div>

                    {/* Teacher Cards Matrix */}
                    <div className="grid sm:grid-cols-2 gap-3.5">
                      {teachers.map((teacher) => {
                        const isAssignedIn =
                          teacher.assignedCourseIds &&
                          editingCourse.id &&
                          teacher.assignedCourseIds.includes(editingCourse.id);
                        const isLead =
                          editingCourse.instructorName?.toLowerCase() === teacher.name?.toLowerCase();

                        return (
                          <div
                            key={teacher.id}
                            className={`p-4 rounded-2xl border transition flex flex-col justify-between gap-3 ${
                              isAssignedIn
                                ? "bg-emerald-950/20 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                                : "bg-black/40 border-white/5 opacity-70"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <img
                                src={
                                  teacher.avatar ||
                                  "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80"
                                }
                                alt={teacher.name}
                                className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500 shrink-0"
                              />

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <h4 className="text-xs font-bold text-white truncate font-sans">{teacher.name}</h4>
                                  {isLead && (
                                    <span className="px-1.5 py-0.5 rounded bg-[#FFD700]/20 border border-[#FFD700]/40 text-[#FFD700] text-[9px] font-mono font-bold flex items-center gap-1 shrink-0">
                                      <Star className="w-2.5 h-2.5 fill-[#FFD700]" /> LEAD
                                    </span>
                                  )}
                                </div>

                                <p className="text-[10px] text-gray-400 font-mono truncate">{teacher.title}</p>
                                <span className="text-[9px] text-amber-400 font-mono block">
                                  {teacher.medicalCollege} • {teacher.subject}
                                </span>
                              </div>
                            </div>

                            {/* IN / OUT Toggle Action Buttons */}
                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5 font-mono text-[10px]">
                              <button
                                type="button"
                                onClick={() => handleToggleTeacherInOut(teacher)}
                                className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer ${
                                  isAssignedIn
                                    ? "bg-emerald-500 text-black shadow hover:bg-emerald-400"
                                    : "bg-white/10 text-gray-300 hover:bg-white/20"
                                }`}
                              >
                                {isAssignedIn ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>TEACHER IN (Assigned)</span>
                                  </>
                                ) : (
                                  <>
                                    <UserPlus className="w-3.5 h-3.5" />
                                    <span>TEACHER OUT (Click to Add)</span>
                                  </>
                                )}
                              </button>

                              {isAssignedIn && !isLead && (
                                <button
                                  type="button"
                                  onClick={() => handleSetLeadTeacher(teacher)}
                                  className="px-2.5 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 rounded-xl transition cursor-pointer"
                                >
                                  Set Lead
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-mono text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-7 py-2.5 bg-[#C1121F] hover:bg-red-700 active:scale-95 disabled:opacity-50 text-white font-mono text-xs font-black uppercase tracking-wider rounded-xl transition shadow-lg shadow-red-900/30 flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-[#FFD700]" />
                  <span>{saving ? "Saving Course & Schedule..." : "Save Course & Publish"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ADD NEW DOCTOR/TEACHER MODAL */}
      {showAddTeacherModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-amber-500/30 w-full max-w-md rounded-2xl p-6 flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-400" />
                Add New Doctor / Faculty Mentor
              </h3>
              <button
                type="button"
                onClick={() => setShowAddTeacherModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTeacherQuick} className="space-y-3 font-sans">
              <div>
                <label className="text-[10px] font-mono uppercase text-gray-300 block mb-1">Doctor / Teacher Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Shahriar Kabir"
                  value={tName}
                  onChange={(e) => setTName(e.target.value)}
                  className="w-full bg-black border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-gray-300 block mb-1">Title / Designation</label>
                <input
                  type="text"
                  placeholder="e.g. DMC (K-78), Lead Biology Mentor"
                  value={tTitle}
                  onChange={(e) => setTTitle(e.target.value)}
                  className="w-full bg-black border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-gray-300 block mb-1">Medical College</label>
                <select
                  value={tCollege}
                  onChange={(e) => setTCollege(e.target.value)}
                  className="w-full bg-black border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="Dhaka Medical College (DMC)">Dhaka Medical College (DMC)</option>
                  <option value="Sir Salimullah Medical College (SSMC)">Sir Salimullah Medical College (SSMC)</option>
                  <option value="Chittagong Medical College (CMC)">Chittagong Medical College (CMC)</option>
                  <option value="Mymensingh Medical College (MMC)">Mymensingh Medical College (MMC)</option>
                  <option value="Rajshahi Medical College (RMC)">Rajshahi Medical College (RMC)</option>
                  <option value="Sylhet MAG Osmani Medical College (SOMC)">Sylhet MAG Osmani Medical College (SOMC)</option>
                  <option value="Sher-e-Bangla Medical College (SBMC)">Sher-e-Bangla Medical College (SBMC)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-gray-300 block mb-1">Specialized Subject</label>
                <select
                  value={tSubject}
                  onChange={(e) => setTSubject(e.target.value)}
                  className="w-full bg-black border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="Biology">Biology (জীববিজ্ঞান)</option>
                  <option value="Chemistry">Chemistry (রসায়ন)</option>
                  <option value="Physics">Physics (পদার্থবিজ্ঞান)</option>
                  <option value="General Knowledge">General Knowledge (সাধারণ জ্ঞান)</option>
                  <option value="English">English (ইংরেজি)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-gray-300 block mb-1">Short Bio</label>
                <textarea
                  rows={2}
                  placeholder="শিক্ষকদের অভিজ্ঞতা ও পড়ানোর ধরন..."
                  value={tBio}
                  onChange={(e) => setTBio(e.target.value)}
                  className="w-full bg-black border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowAddTeacherModal(false)}
                  className="px-4 py-2 bg-gray-800 text-white text-xs font-mono rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingTeacher}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-mono font-bold uppercase rounded-xl cursor-pointer shadow"
                >
                  {isAddingTeacher ? "Creating..." : "Save & Add to Course"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
