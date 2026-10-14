import React, { useState, useEffect } from "react";
import { Course, Batch, Enrollment, CourseDemoClass } from "../../types/courseTypes";
import { UserProfile } from "../../types";
import { getCourseAspectClass } from "../../lib/courseUtils";
import { db } from "../../lib/backend";
import { doc, getDoc } from "../../lib/supabaseDb";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  BookOpen,
  Award,
  Clock,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Users,
  Star,
  FileText,
  ShieldCheck,
  Zap,
  Tag,
  ArrowRight,
  Gamepad2,
  Play,
  Tv,
  GraduationCap,
  Target
} from "lucide-react";
import { playSound } from "../../audio";
import FreeDemoClassModal from "./FreeDemoClassModal";
import FreeDemoExamModal from "./FreeDemoExamModal";
import { isDemoClassEnabled, isDemoExamEnabled } from "../../lib/courseDemoUtils";

interface CourseStoreProps {
  courses: Course[];
  batches: Batch[];
  enrollments: Enrollment[];
  user: UserProfile;
  language: "bn" | "en";
  theme: "light" | "dark";
  onSelectCourse: (course: Course) => void;
  onEnrollNow: (course: Course, batchId?: string) => void;
  onGoToCourseDashboard: (course: Course) => void;
  onOpenGamingArena?: () => void;
}

export default function CourseStore({
  courses,
  batches,
  enrollments,
  user,
  language,
  theme,
  onSelectCourse,
  onEnrollNow,
  onGoToCourseDashboard,
  onOpenGamingArena
}: CourseStoreProps) {
  const isDark = theme === "dark";
  const isBn = language === "bn";

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [demoModalCourse, setDemoModalCourse] = useState<Course | null>(null);
  const [demoExamModalCourse, setDemoExamModalCourse] = useState<Course | null>(null);
  const [activeDemoClass, setActiveDemoClass] = useState<CourseDemoClass | undefined>(undefined);

  // Dynamic Store Banner & Stats loaded from Admin Firestore Settings
  const [storeBadgeBn, setStoreBadgeBn] = useState("মেডিকেল ভর্তি প্রস্তুতি প্ল্যাটফর্ম");
  const [storeBadgeEn, setStoreBadgeEn] = useState("MAT ADMISSION COURSES");
  const [storeTitleBn, setStoreTitleBn] = useState("সকল স্পেশাল এক্সাম ব্যাচ ও কোর্সসমূহ");
  const [storeTitleEn, setStoreTitleEn] = useState("Premium Exam Batches & Courses");
  const [storeDescBn, setStoreDescBn] = useState("ড. আবুল হাসান, হাজারী নাগ ও ইসহাক স্যারের বই ভিত্তিক হাই-ইয়েল্ড পরীক্ষা, লাইভ ক্লাস, বিস্তারিত এআই এনালাইসিস ও মিসটেক ব্যাংকের মাধ্যমে আপনার কাঙ্ক্ষিত মেডিকেল সিট নিশ্চিত করুন।");
  const [storeDescEn, setStoreDescEn] = useState("Standard textbook-oriented exams, live interactive classes, instant mistake bank, and nationwide batch leaderboards.");
  const [storeEnrolledText, setStoreEnrolledText] = useState("৫,১২০+ Aspirants");
  const [storeStatLabelBn, setStoreStatLabelBn] = useState("এনরোল্ড শিক্ষার্থী");
  const [storeStatLabelEn, setStoreStatLabelEn] = useState("Enrolled Aspirants");
  const [storeStatIcon, setStoreStatIcon] = useState("award");
  const [showStatBox, setShowStatBox] = useState(true);

  // Firestore Live Enrollment Counter per course
  const [firestoreEnrollmentCounts, setFirestoreEnrollmentCounts] = useState<Record<string, number>>({});

  const isAdmin = user?.email === "nuwaisirhoquesbmc@gmail.com" || user?.email === "hoquenuwaisir@gmail.com" || user?.role === "admin" || user?.role === "superadmin";

  useEffect(() => {
    getDoc(doc(db, "app_settings", "store_stats"))
      .then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.badgeTextBn !== undefined) setStoreBadgeBn(data.badgeTextBn);
          if (data.badgeTextEn !== undefined) setStoreBadgeEn(data.badgeTextEn);
          if (data.headerTitleBn !== undefined) setStoreTitleBn(data.headerTitleBn);
          if (data.headerTitleEn !== undefined) setStoreTitleEn(data.headerTitleEn);
          if (data.headerDescriptionBn !== undefined) setStoreDescBn(data.headerDescriptionBn);
          if (data.headerDescriptionEn !== undefined) setStoreDescEn(data.headerDescriptionEn);
          if (data.storeEnrolledText !== undefined) setStoreEnrolledText(data.storeEnrolledText);
          if (data.storeStatLabelBn !== undefined) setStoreStatLabelBn(data.storeStatLabelBn);
          else if (data.storeStatLabel !== undefined) setStoreStatLabelBn(data.storeStatLabel);
          if (data.storeStatLabelEn !== undefined) setStoreStatLabelEn(data.storeStatLabelEn);
          if (data.storeStatIcon !== undefined) setStoreStatIcon(data.storeStatIcon);
          if (data.showStatBox !== undefined) setShowStatBox(data.showStatBox);
          if (data.courseCounts) setFirestoreEnrollmentCounts(data.courseCounts);
        }
      })
      .catch((err) => {
        console.warn("Store stats fetch warning:", err.message);
      });
  }, []);

  const filteredCourses = courses.filter((c) => {
    const title = (c.title || "").toLowerCase();
    const shortDesc = (c.shortDescription || "").toLowerCase();
    const instructor = (c.instructorName || "").toLowerCase();
    const q = (searchQuery || "").toLowerCase();

    const matchesSearch =
      !q ||
      title.includes(q) ||
      shortDesc.includes(q) ||
      instructor.includes(q);
    
    const matchesSubject =
      selectedSubject === "all" ||
      (Array.isArray(c.subjects) && c.subjects.includes(selectedSubject));

    return matchesSearch && matchesSubject;
  });

  const isEnrolledInCourse = (courseId: string) => {
    return enrollments.some(
      (e) => e.courseId === courseId && e.status === "active"
    );
  };

  const renderStatIcon = () => {
    switch (storeStatIcon) {
      case "users":
        return <Users className="w-5 h-5 sm:w-6 sm:h-6" />;
      case "sparkles":
        return <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />;
      case "star":
        return <Star className="w-5 h-5 sm:w-6 sm:h-6" />;
      case "graduation":
        return <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6" />;
      case "target":
        return <Target className="w-5 h-5 sm:w-6 sm:h-6" />;
      case "award":
      default:
        return <Award className="w-5 h-5 sm:w-6 sm:h-6" />;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 sm:py-8 flex flex-col gap-6 sm:gap-8 font-sans">
      {/* Hero Header Banner */}
      <div className={`relative overflow-hidden rounded-2xl sm:rounded-3xl p-5 sm:p-7 md:p-8 border ${
        isDark
          ? "bg-gradient-to-r from-[#18080A] via-[#0F0D15] to-[#0A0A0A] border-red-900/40 shadow-[0_10px_40px_rgba(193,18,31,0.2)]"
          : "bg-gradient-to-r from-red-50 via-amber-50 to-white border-red-200 shadow-lg text-slate-800"
      }`}>
        {/* Glow lights */}
        <div className="absolute -top-10 -right-10 w-72 h-72 bg-[#C1121F]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-[#FFD700]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6">
          <div className="space-y-2 sm:space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-[#C1121F]/20 border border-[#C1121F]/40 text-[#FFD700] text-[10px] sm:text-xs font-mono font-bold uppercase tracking-widest">
              <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#FFD700] animate-pulse" />
              <span>{isBn ? (storeBadgeBn || "মেডিকেল ভর্তি প্রস্তুতি প্ল্যাটফর্ম") : (storeBadgeEn || "MAT ADMISSION COURSES")}</span>
            </div>

            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold uppercase tracking-tight font-display text-white">
              {isBn ? (storeTitleBn || "সকল স্পেশাল এক্সাম ব্যাচ ও কোর্সসমূহ") : (storeTitleEn || "Premium Exam Batches & Courses")}
            </h1>

            <p className="text-[11px] sm:text-xs md:text-sm text-gray-300 leading-relaxed font-sans max-w-xl">
              {isBn
                ? (storeDescBn || "ড. আবুল হাসান, হাজারী নাগ ও ইসহাক স্যারের বই ভিত্তিক হাই-ইয়েল্ড পরীক্ষা, লাইভ ক্লাস, বিস্তারিত এআই এনালাইসিস ও মিসটেক ব্যাংকের মাধ্যমে আপনার কাঙ্ক্ষিত মেডিকেল সিট নিশ্চিত করুন।")
                : (storeDescEn || "Standard textbook-oriented exams, live interactive classes, instant mistake bank, and nationwide batch leaderboards.")}
            </p>
          </div>

          {showStatBox && (
            <div className="flex items-center gap-2.5 sm:gap-3 bg-black/50 backdrop-blur-md border border-white/10 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl shrink-0 self-start md:self-center shadow-md">
              <div className="p-2 sm:p-2.5 bg-[#C1121F]/20 border border-[#C1121F]/30 rounded-lg sm:rounded-xl text-[#FFD700]">
                {renderStatIcon()}
              </div>
              <div>
                <span className="text-[10px] sm:text-[11px] font-mono text-gray-400 block font-medium">
                  {isBn ? (storeStatLabelBn || "এনরোল্ড শিক্ষার্থী") : (storeStatLabelEn || "Enrolled Aspirants")}
                </span>
                <span className="text-sm sm:text-base md:text-lg font-black text-white font-mono leading-tight tracking-wide">
                  {storeEnrolledText}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/10 pb-6">
        {/* Search input */}
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isBn ? "কোর্স বা শিক্ষকের নাম সার্চ করুন..." : "Search course title or instructor..."}
            className="w-full bg-[#121212] border border-white/10 focus:border-[#C1121F] rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none transition font-sans"
          />
        </div>

        {/* Subject Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto scrollbar-none pb-1 font-mono text-xs font-bold uppercase">
          {[
            { id: "all", label: isBn ? "সকল বিষয়" : "All Subjects" },
            { id: "Biology", label: isBn ? "জীববিজ্ঞান 🧬" : "Biology 🧬" },
            { id: "Chemistry", label: isBn ? "রসায়ন 🧪" : "Chemistry 🧪" },
            { id: "Physics", label: isBn ? "পদার্থবিজ্ঞান ⚡" : "Physics ⚡" },
            { id: "GK", label: isBn ? "জিকে 🇧🇩" : "GK 🇧🇩" },
            { id: "English", label: isBn ? "ইংরেজি 🇬🇧" : "English 🇬🇧" }
          ].map((sub) => (
            <button
              key={sub.id}
              onClick={() => {
                playSound("click");
                setSelectedSubject(sub.id);
              }}
              className={`px-3.5 py-2 rounded-xl transition cursor-pointer whitespace-nowrap text-[11px] ${
                selectedSubject === sub.id
                  ? "bg-[#C1121F] text-white shadow-[0_0_12px_rgba(193,18,31,0.4)]"
                  : "bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5"
              }`}
            >
              {sub.label}
            </button>
          ))}
        </div>
      </div>

      {/* Courses Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.map((course) => {
          const enrolled = isEnrolledInCourse(course.id);
          const defaultBatch = batches.find((b) => b.id === course.defaultBatchId) || batches[0];

          // Compute base student seed + live Firestore count
          const baseSeed = course.id === "course_med_2027" ? 3120 : course.id === "course_med_2026" ? 1850 : 1240;
          const liveEnrolledCount = baseSeed + (firestoreEnrollmentCounts[course.id] || 0);

          return (
            <motion.div
              key={course.id}
              whileHover={{ y: -8, scale: 1.03 }}
              transition={{ type: "spring", stiffness: 350, damping: 20 }}
              className={`flex flex-col justify-between border rounded-2xl overflow-hidden shadow-xl relative transition-all duration-300 group cursor-pointer ${
                isDark
                  ? "bg-[#111111] border-white/10 hover:border-[#C1121F]/80 hover:shadow-[0_16px_36px_rgba(193,18,31,0.3)]"
                  : "bg-white border-red-150 shadow-md text-slate-800 hover:border-[#C1121F]/60 hover:shadow-[0_16px_32px_rgba(193,18,31,0.2)]"
              }`}
            >
              {/* Clean Thumbnail Header (No text on top of thumbnail) */}
              <div className={`relative ${getCourseAspectClass(course.aspectRatio)} w-full overflow-hidden bg-black/40`}>
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>

              {/* Course Info Content */}
              <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                <div className="space-y-3">
                  {/* Category & Price Badges */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="bg-[#C1121F]/15 border border-[#C1121F]/30 text-[#C1121F] dark:text-red-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                        MAT BATCH
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="text-gray-400 line-through text-[11px]">৳{course.originalPrice}</span>
                      <span className="text-[#FFD700] text-sm font-black">৳{course.discountedPrice}</span>
                    </div>
                  </div>

                  <h3 className="text-base font-extrabold text-white leading-snug line-clamp-2 font-display">
                    {course.title}
                  </h3>

                  <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed font-sans">
                    {course.shortDescription}
                  </p>

                  {/* Instructor Badge */}
                  <div className="flex items-center gap-2.5 pt-1">
                    <img
                      src={course.instructorAvatar}
                      alt={course.instructorName}
                      className="w-7 h-7 rounded-full border border-[#C1121F] object-cover"
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-gray-200 block truncate">{course.instructorName}</span>
                      <span className="text-[10px] text-gray-500 block truncate font-mono">{course.instructorTitle}</span>
                    </div>
                  </div>
                </div>

                {/* Key Stats Bar */}
                <div className="grid grid-cols-3 gap-2 py-3 border-y border-white/5 text-center font-mono text-[11px]">
                  <div className="bg-white/[0.02] p-2 rounded-lg border border-white/5">
                    <span className="text-gray-500 block text-[9px] uppercase">{isBn ? "পরীক্ষা" : "Exams"}</span>
                    <span className="text-[#FFD700] font-bold">{course.totalExams}+</span>
                  </div>
                  <div className="bg-white/[0.02] p-2 rounded-lg border border-white/5">
                    <span className="text-gray-500 block text-[9px] uppercase">{isBn ? "ক্লাস" : "Classes"}</span>
                    <span className="text-emerald-400 font-bold">{course.totalClasses}+</span>
                  </div>
                  <div className="bg-white/[0.02] p-2 rounded-lg border border-white/5">
                    <span className="text-gray-500 block text-[9px] uppercase">{isBn ? "নোটস" : "Notes"}</span>
                    <span className="text-sky-400 font-bold">{course.totalMaterials}+</span>
                  </div>
                </div>

                {/* Public Firestore Enrollment Counter Bar */}
                <div className="flex items-center justify-between px-3 py-2 bg-black/40 border border-white/10 rounded-xl font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-gray-400 text-[11px]">{isBn ? "মোট এনরোল্ড শিক্ষার্থী:" : "Total Enrolled:"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-black text-[#FFD700]">
                    <Users className="w-3.5 h-3.5 text-[#FFD700]" />
                    <span>{liveEnrolledCount.toLocaleString(isBn ? "bn-BD" : "en-US")} {isBn ? "জন" : "Aspirants"}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex gap-2">
                  <button
                    onClick={() => {
                      playSound("click");
                      onSelectCourse(course);
                    }}
                    className="flex-1 py-2.5 border border-white/15 hover:border-white/30 bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-mono font-bold uppercase rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>{isBn ? "বিস্তারিত" : "Details"}</span>
                  </button>

                  <button
                    onClick={() => {
                      playSound("click");
                      onEnrollNow(course, defaultBatch?.id);
                    }}
                    className="flex-1 py-2.5 bg-gradient-to-r from-[#C1121F] to-red-600 hover:from-red-600 hover:to-red-500 text-white font-extrabold text-xs font-mono uppercase tracking-wider rounded-xl transition shadow-[0_0_15px_rgba(193,18,31,0.4)] flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 text-[#FFD700] fill-[#FFD700]" />
                    <span>{isBn ? "ভর্তি হন" : "Enroll Now"}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
        {/* Standalone Free Gaming Arena Featured Card */}
        {onOpenGamingArena && (
          <motion.div
            whileHover={{ y: -8, scale: 1.03 }}
            transition={{ type: "spring", stiffness: 350, damping: 20 }}
            className={`flex flex-col justify-between border-2 border-amber-500/40 rounded-2xl overflow-hidden shadow-2xl relative transition-all duration-300 group cursor-pointer ${
              isDark
                ? "bg-gradient-to-b from-amber-950/20 via-[#111111] to-[#0A0A0A] hover:border-amber-400 hover:shadow-[0_16px_36px_rgba(245,158,11,0.25)]"
                : "bg-gradient-to-b from-amber-50 to-white border-amber-300 shadow-md text-slate-800 hover:border-amber-500 hover:shadow-[0_16px_32px_rgba(245,158,11,0.2)]"
            }`}
            onClick={() => {
              playSound("battle");
              onOpenGamingArena();
            }}
          >
            {/* Header Banner */}
            <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-amber-600/30 via-red-600/20 to-black/80 flex items-center justify-center p-6 text-center">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-500/20 to-transparent pointer-events-none" />
              <div className="relative z-10 flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.4)] group-hover:scale-110 transition">
                  <Gamepad2 className="w-9 h-9 text-[#FFD700] animate-bounce" />
                </div>
                <span className="text-xs font-mono font-black text-[#FFD700] uppercase tracking-widest bg-black/60 px-3 py-1 rounded-full border border-amber-500/30">
                  100% FREE ARCADE
                </span>
              </div>
            </div>

            {/* Info */}
            <div className="p-5 flex-1 flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                    FREE ARCADE HUB
                  </span>
                  <span className="text-emerald-400 font-mono text-sm font-black uppercase">
                    {isBn ? "বিনামূল্যে উন্মুক্ত" : "FREE ACCESS"}
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-white leading-snug line-clamp-2 font-display">
                  {isBn ? "মেডিকেল গেমিং অ্যারেনা 🎮" : "Medical Gaming Arena 🎮"}
                </h3>

                <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed font-sans">
                  {isBn
                    ? "মেড রানার, বায়ো স্লাইস, সেল ক্ল্যাশ, স্পিড ড্রিল, ইমার্জেন্সি ইআর ও ক্রিকেট কুইজ সহ ১০টি আকর্ষণীয় মেডিকেল আর্কেড গেম খেলুন এবং লাইভ এক্সপি ও কয়েন অর্জন করুন।"
                    : "10 high-speed medical arcade games including MedRunner, BioSlice, CellClash, SpeedDrill, ClinicalER, and MedCricket."}
                </p>

                <div className="flex items-center gap-2.5 pt-1">
                  <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500 flex items-center justify-center text-xs">
                    🎮
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-gray-200 block truncate">{isBn ? "মেডিক্যাম্পাস গেমিং আর্কেড" : "MediBridge Gaming Engine"}</span>
                    <span className="text-[10px] text-gray-500 block truncate font-mono">{isBn ? "১০টি মেডিকেল গেম" : "10 Interactive Games"}</span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 py-3 border-y border-white/5 text-center font-mono text-[11px]">
                <div className="bg-white/[0.02] p-2 rounded-lg border border-white/5">
                  <span className="text-gray-500 block text-[9px] uppercase">{isBn ? "গেম সংখ্যা" : "Games"}</span>
                  <span className="text-[#FFD700] font-bold">10 Games</span>
                </div>
                <div className="bg-white/[0.02] p-2 rounded-lg border border-white/5">
                  <span className="text-gray-500 block text-[9px] uppercase">{isBn ? "ফিচার" : "Features"}</span>
                  <span className="text-emerald-400 font-bold">{isBn ? "মিশন & ব্যাজ" : "Missions"}</span>
                </div>
                <div className="bg-white/[0.02] p-2 rounded-lg border border-white/5">
                  <span className="text-gray-500 block text-[9px] uppercase">{isBn ? "অ্যাক্সেস" : "Access"}</span>
                  <span className="text-sky-400 font-bold">{isBn ? "আনলিমিটেড" : "Unlimited"}</span>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    playSound("battle");
                    onOpenGamingArena();
                  }}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-extrabold text-xs font-mono uppercase tracking-wider rounded-xl transition shadow-[0_0_15px_rgba(245,158,11,0.4)] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Gamepad2 className="w-4 h-4 fill-black" />
                  <span>{isBn ? "গেমিং অ্যারেনায় খেলুন 🚀" : "ENTER GAMING ARENA 🚀"}</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Course Modals */}
      <AnimatePresence>
        {/* Free Demo Exam CBT Modal */}
        {demoExamModalCourse && (
          <FreeDemoExamModal
            course={demoExamModalCourse}
            language={language}
            theme={theme}
            onClose={() => setDemoExamModalCourse(null)}
            onEnrollNow={(c) => {
              setDemoExamModalCourse(null);
              onEnrollNow(c);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
