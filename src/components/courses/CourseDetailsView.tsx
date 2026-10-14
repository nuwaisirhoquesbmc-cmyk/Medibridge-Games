import React, { useState, useEffect } from "react";
import { Course, Batch, Enrollment, CourseTeacher } from "../../types/courseTypes";
import { UserProfile } from "../../types";
import { getCourseAspectClass } from "../../lib/courseUtils";
import { db } from "../../firebase";
import { collection, doc, getDoc, getDocs, query, limit } from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  BookOpen,
  Award,
  Zap,
  Users,
  Star,
  HelpCircle,
  Calendar,
  FileText,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Sparkles,
  MessageSquare,
  Play,
  Layers,
  Mail,
  Facebook,
  Share2
} from "lucide-react";
import { playSound } from "../../audio";
import InstructorProfile from "./InstructorProfile";
import DemoClassSection from "./DemoClassSection";
import FreeDemoExamModal from "./FreeDemoExamModal";
import CourseShareModal from "./CourseShareModal";
import { isDemoExamEnabled } from "../../lib/courseDemoUtils";

interface CourseDetailsViewProps {
  course: Course;
  batches: Batch[];
  enrollments: Enrollment[];
  user: UserProfile | null;
  language: "bn" | "en";
  theme: "light" | "dark";
  onBack: () => void;
  onEnrollNow: (course: Course, batchId: string) => void;
  onGoToCourseDashboard: (course: Course) => void;
}

export default function CourseDetailsView({
  course,
  batches,
  enrollments,
  user,
  language,
  theme,
  onBack,
  onEnrollNow,
  onGoToCourseDashboard
}: CourseDetailsViewProps) {
  const isDark = theme === "dark";
  const isBn = language === "bn";

  const courseBatches = (batches || []).filter((b) => b.courseId === course.id);
  const [selectedBatchId, setSelectedBatchId] = useState<string>(
    courseBatches[0]?.id || course.defaultBatchId || ""
  );
  const [openSyllabusIndex, setOpenSyllabusIndex] = useState<number | null>(0);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [demoExamModalOpen, setDemoExamModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Firestore Live Student Enrollment Counter
  const [firestoreEnrolledCount, setFirestoreEnrolledCount] = useState<number>(0);
  const [courseTeachers, setCourseTeachers] = useState<CourseTeacher[]>([]);

  const isAdmin = user?.email === "nuwaisirhoquesbmc@gmail.com" || user?.email === "hoquenuwaisir@gmail.com" || user?.role === "admin" || user?.role === "superadmin";

  useEffect(() => {
    if (!course?.id) return;

    // Fetch teachers on demand (bounded 30)
    getDocs(query(collection(db, "course_teachers"), limit(30)))
      .then((snapshot) => {
        const loaded: CourseTeacher[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (
            data.assignedCourseIds &&
            Array.isArray(data.assignedCourseIds) &&
            course?.id &&
            data.assignedCourseIds.includes(course.id)
          ) {
            loaded.push({ id: docSnap.id, ...data } as CourseTeacher);
          }
        });
        setCourseTeachers(loaded);
      })
      .catch((err) => console.warn("Course teachers fetch warning:", err.message));

    // Fetch store stats count once
    getDoc(doc(db, "app_settings", "store_stats"))
      .then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.courseCounts && typeof data.courseCounts[course.id] === "number") {
            setFirestoreEnrolledCount(data.courseCounts[course.id]);
          }
        }
      })
      .catch((err) => console.warn("Store stats fetch warning:", err.message));
  }, [course?.id]);

  const baseSeed = course.id === "course_med_2027" ? 3120 : course.id === "course_med_2026" ? 1850 : 1240;
  const totalPublicEnrolled = baseSeed + firestoreEnrolledCount;

  const isEnrolled = enrollments.some(
    (e) => e.courseId === course.id && e.status === "active"
  );

  const activeBatch =
    courseBatches.find((b) => b.id === selectedBatchId) || courseBatches[0];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 flex flex-col gap-10 font-sans">
      {/* Top Navigation Back Bar */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => {
            playSound("click");
            onBack();
          }}
          className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl border border-white/10 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{isBn ? "কোর্স তালিকায় ফিরে যান" : "Back to Courses"}</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              playSound("click");
              setShareModalOpen(true);
            }}
            className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#FFD700] hover:text-black bg-[#FFD700]/10 hover:bg-[#FFD700] px-3.5 py-1.5 rounded-xl border border-[#FFD700]/30 transition cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{isBn ? "কোর্স শেয়ার করুন" : "Share"}</span>
          </button>

          <span className="hidden sm:inline-block text-xs font-mono font-bold text-gray-300 uppercase tracking-wider bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
            OFFICIAL ADMISSION COURSE
          </span>
        </div>
      </div>

      {/* Hero Banner Section */}
      <div className={`relative overflow-hidden rounded-3xl border shadow-2xl ${
        isDark ? "bg-[#111111] border-white/10" : "bg-white border-red-150"
      }`}>
        <div className="relative h-64 sm:h-80 w-full overflow-hidden">
          <img
            src={course.banner || course.thumbnail}
            alt={course.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-[#111111]/70 to-transparent" />
        </div>

        <div className="p-6 sm:p-10 relative z-10 space-y-6">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Dynamic Frame Aspect Ratio Cover Card */}
            <div className={`w-44 sm:w-60 ${getCourseAspectClass(course.aspectRatio)} shrink-0 rounded-2xl overflow-hidden border-2 border-[#C1121F] shadow-2xl relative bg-black/60 group`}>
              <img
                src={course.thumbnail}
                alt={course.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>

            <div className="space-y-4 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <span className="bg-[#C1121F] text-white text-xs font-mono font-black uppercase px-3 py-1 rounded-md tracking-wider">
                  MAT COURSE
                </span>
                <span className="bg-white/10 text-gray-300 text-xs font-mono font-bold px-3 py-1 rounded-md border border-white/10">
                  ⏱ {course.duration}
                </span>
                <span className="bg-[#FFD700]/10 text-[#FFD700] text-xs font-mono font-bold px-3 py-1 rounded-md border border-[#FFD700]/30 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#FFD700]" />
                  <span>{totalPublicEnrolled.toLocaleString(isBn ? "bn-BD" : "en-US")} {isBn ? "জন এনরোল্ড" : "Enrolled"}</span>
                </span>
                {isEnrolled && (
                  <span className="bg-emerald-500 text-black text-xs font-mono font-black px-3 py-1 rounded-md uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {isBn ? "এনরোলমেন্ট সক্রিয়" : "ACTIVE ENROLLMENT"}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-4xl font-black text-white uppercase leading-tight font-display">
                {course.title}
              </h1>

              <p className="text-sm sm:text-base text-gray-300 leading-relaxed max-w-4xl font-sans">
                {course.fullDescription}
              </p>
            </div>
          </div>

          {/* Instructor & Quick Metrics Box */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-white/10">
            <div className="md:col-span-1 flex items-center gap-3">
              <img
                src={course.instructorAvatar}
                alt={course.instructorName}
                className="w-12 h-12 rounded-full border-2 border-[#C1121F] object-cover"
              />
              <div>
                <span className="text-xs text-gray-400 block font-mono uppercase">{isBn ? "কোর্স ইনস্ট্রাক্টর" : "Instructor"}</span>
                <span className="text-sm font-extrabold text-white block">{course.instructorName}</span>
                <span className="text-[10px] text-[#FFD700] font-mono block">{course.instructorTitle}</span>
              </div>
            </div>

            <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-center">
              <div className="bg-white/[0.03] p-3 rounded-xl border border-white/5">
                <span className="text-gray-400 text-xs block uppercase">{isBn ? "মোট এনরোল্ড" : "Enrolled"}</span>
                <span className="text-lg font-black text-[#FFD700] flex items-center justify-center gap-1">
                  <Users className="w-4 h-4 text-[#FFD700]" />
                  <span>{totalPublicEnrolled.toLocaleString(isBn ? "bn-BD" : "en-US")}</span>
                </span>
              </div>
              <div className="bg-white/[0.03] p-3 rounded-xl border border-white/5">
                <span className="text-gray-400 text-xs block uppercase">{isBn ? "মডেল টেস্ট" : "Exams"}</span>
                <span className="text-lg font-black text-amber-400">{course.totalExams}+</span>
              </div>
              <div className="bg-white/[0.03] p-3 rounded-xl border border-white/5">
                <span className="text-gray-400 text-xs block uppercase">{isBn ? "লাইভ ক্লাস" : "Classes"}</span>
                <span className="text-lg font-black text-emerald-400">{course.totalClasses}+</span>
              </div>
              <div className="bg-white/[0.03] p-3 rounded-xl border border-white/5">
                <span className="text-gray-400 text-xs block uppercase">{isBn ? "লেকচার নোটস" : "Materials"}</span>
                <span className="text-lg font-black text-sky-400">{course.totalMaterials}+</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Body Grid: Details & Checkout Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Details, Syllabus, FAQ */}
        <div className="lg:col-span-2 space-y-8">
          {/* FREE YOUTUBE DEMO EXAM SECTION (if enabled) */}
          <DemoClassSection
            course={course}
            language={language}
            theme={theme}
            onOpenDemoExamModal={(c) => {
              setDemoExamModalOpen(true);
            }}
            onEnrollNow={() => onEnrollNow(course, selectedBatchId)}
          />

          {/* FACULTY & INSTRUCTORS PROFILE */}
          <InstructorProfile
            course={course}
            language={language}
            theme={theme}
          />

          {/* Course Features */}
          {course.features && Array.isArray(course.features) && course.features.length > 0 && (
            <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-black uppercase text-white font-display flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#FFD700]" />
                <span>{isBn ? "কোর্সের বিশেষ সুবিধাসমূহ" : "Key Course Features"}</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {course.features.map((feat, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-xs text-gray-200 font-semibold leading-relaxed">{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Routine & Schedule Section */}
          <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
              <h3 className="text-lg font-black uppercase text-white font-display flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                <span>{isBn ? "কোর্স রুটিন ও সাপ্তাহিক শিডিউল" : "Course Routine & Weekly Schedule"}</span>
              </h3>

              {course.routinePdfUrl && (
                <a
                  href={course.routinePdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold rounded-xl transition flex items-center gap-1.5 shrink-0"
                >
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>{isBn ? "অফিসিয়াল রুটিন PDF ডাউনলোড" : "Download Routine (PDF)"}</span>
                </a>
              )}
            </div>

            {/* Exam & Class Schedule Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-black/40 border border-white/5 rounded-xl p-4 space-y-2">
                <h4 className="text-xs font-mono font-bold text-[#FFD700] uppercase tracking-wider flex items-center gap-2">
                  <Award className="w-4 h-4" /> {isBn ? "পরীক্ষা তথ্য ও নিয়মাবলী" : "Exam Routine & Rules"}
                </h4>
                <p className="text-xs text-gray-300 leading-relaxed font-sans">{course.examInfo || (isBn ? "প্রতিদিন রাত ৮:০০ টায় লাইভ এক্সাম অনুষ্ঠিত হয়।" : "Daily live exams at 08:00 PM.")}</p>
              </div>

              <div className="bg-black/40 border border-white/5 rounded-xl p-4 space-y-2">
                <h4 className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4" /> {isBn ? "ক্লাস সময়সূচী ও প্ল্যাটফর্ম" : "Class Schedule & Platform"}
                </h4>
                <p className="text-xs text-gray-300 leading-relaxed font-sans">{course.classInfo || (isBn ? "সপ্তাহে ৪ দিন সন্ধ্যা ৭:৩০ মিনিটে লাইভ ও রেকর্ডেড ক্লাস।" : "4 days a week at 07:30 PM.")}</p>
              </div>
            </div>

            {/* Structured Weekly Routine Items Table */}
            {course.routineItems && Array.isArray(course.routineItems) && course.routineItems.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-xs font-mono text-gray-400 uppercase font-bold block">
                  {isBn ? "সাপ্তাহিক ক্লাস ও এক্সাম শিডিউল:" : "Weekly Timetable Slots:"}
                </span>
                <div className="grid grid-cols-1 gap-2">
                  {course.routineItems.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-3.5 bg-black/50 border border-white/5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs font-sans hover:border-emerald-500/30 transition"
                    >
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="px-2.5 py-1 rounded bg-emerald-950/80 text-emerald-400 font-mono text-[10px] font-bold shrink-0 border border-emerald-500/20">
                          {item.dayOrDate}
                        </span>
                        <span className="text-[#FFD700] font-mono text-[11px] font-bold shrink-0">{item.time}</span>
                        <span className="font-bold text-white">{item.title}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 text-[10px] font-mono text-gray-400">
                        {item.teacherName && (
                          <span className="text-sky-300 bg-sky-950/40 px-2 py-0.5 rounded border border-sky-500/20">
                            👨‍🏫 {item.teacherName}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 uppercase">
                          {item.subject}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Syllabus Section */}
          {course.syllabus && Array.isArray(course.syllabus) && course.syllabus.length > 0 && (
            <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                <h3 className="text-lg font-black uppercase text-white font-display flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#C1121F]" />
                  <span>{isBn ? "সিলেবাস ও আউটলাইন" : "Course Syllabus"}</span>
                </h3>

                {course.syllabusPdfUrl && (
                  <a
                    href={course.syllabusPdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 bg-purple-950/60 hover:bg-purple-900 border border-purple-500/40 text-purple-300 text-xs font-mono font-bold rounded-xl transition flex items-center gap-1.5 shrink-0"
                  >
                    <FileText className="w-4 h-4 text-purple-400" />
                    <span>{isBn ? "সিলেবাস বুকলেট PDF" : "Download Syllabus (PDF)"}</span>
                  </a>
                )}
              </div>

              <div className="space-y-3 pt-2">
                {course.syllabus.map((sub, sIdx) => {
                  const isOpen = openSyllabusIndex === sIdx;
                  return (
                    <div
                      key={sIdx}
                      className="border border-white/10 rounded-xl overflow-hidden bg-black/40"
                    >
                      <button
                        onClick={() => {
                          playSound("click");
                          setOpenSyllabusIndex(isOpen ? null : sIdx);
                        }}
                        className="w-full p-4 flex items-center justify-between text-left font-mono text-sm font-bold text-white hover:bg-white/5 transition cursor-pointer"
                      >
                        <span className="text-[#FFD700] uppercase">{sub.subject}</span>
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      {isOpen && (
                        <div className="p-4 border-t border-white/10 space-y-3 bg-[#0D0D0D]">
                          {(sub.chapters || []).map((chap, cIdx) => (
                            <div key={cIdx} className="space-y-1.5 pl-2 border-l-2 border-[#C1121F]">
                              <span className="text-xs font-bold text-gray-200 block">{chap.chapterTitle}</span>
                              <div className="flex flex-wrap gap-2 pt-1">
                                {(chap.topics || []).map((tp, tIdx) => (
                                  <span
                                    key={tIdx}
                                    className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-gray-400 font-mono"
                                  >
                                    • {tp}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Student Reviews */}
          {course.reviews && Array.isArray(course.reviews) && course.reviews.length > 0 && (
            <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-black uppercase text-white font-display flex items-center gap-2">
                <Star className="w-5 h-5 text-[#FFD700] fill-[#FFD700]" />
                <span>{isBn ? "শিক্ষার্থীদের মতামত" : "Student Reviews"}</span>
              </h3>

              <div className="space-y-3 pt-2">
                {course.reviews.map((rev) => (
                  <div key={rev.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{rev.studentName}</span>
                      <div className="flex items-center text-[#FFD700] text-xs">
                        {"★".repeat(rev.rating || 5)}
                      </div>
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed font-sans">"{rev.comment}"</p>
                    <span className="text-[10px] text-gray-500 font-mono block">{rev.date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FAQ Accordion */}
          {course.faq && Array.isArray(course.faq) && course.faq.length > 0 && (
            <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-black uppercase text-white font-display flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-sky-400" />
                <span>{isBn ? "সাধারণ জিজ্ঞাসা (FAQ)" : "Frequently Asked Questions"}</span>
              </h3>

              <div className="space-y-3 pt-2">
                {course.faq.map((item, fIdx) => {
                  const isOpen = openFaqIndex === fIdx;
                  return (
                    <div key={fIdx} className="border border-white/10 rounded-xl overflow-hidden bg-black/40">
                      <button
                        onClick={() => {
                          playSound("click");
                          setOpenFaqIndex(isOpen ? null : fIdx);
                        }}
                        className="w-full p-4 flex items-center justify-between text-left text-xs font-bold text-white hover:bg-white/5 transition cursor-pointer"
                      >
                        <span>{item.question}</span>
                        {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </button>

                      {isOpen && (
                        <div className="p-4 border-t border-white/10 text-xs text-gray-300 bg-[#0D0D0D] leading-relaxed">
                          {item.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Sticky Enrollment & Batch Pricing Box */}
        <div className="space-y-6">
          <div className="sticky top-24 bg-[#111111] border border-white/10 rounded-2xl p-6 space-y-6 shadow-2xl">
            <div className="space-y-2 border-b border-white/10 pb-4">
              <span className="text-xs font-mono text-gray-400 uppercase block">{isBn ? "কোর্স ফি & অফিসিয়াল ব্যাচ" : "Course Fee & Batch"}</span>
              <div className="flex items-baseline gap-3 font-mono">
                <span className="text-3xl font-black text-[#FFD700]">৳{activeBatch?.price || course.discountedPrice}</span>
                <span className="text-gray-500 line-through text-sm">৳{activeBatch?.originalPrice || course.originalPrice}</span>
              </div>
            </div>

            {/* Single Official Batch Details */}
            {activeBatch && (
              <div className="space-y-2 font-mono bg-black/40 border border-white/10 rounded-xl p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-300 uppercase flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#FFD700]" />
                    {isBn ? "অফিসিয়াল ব্যাচ:" : "Official Batch:"}
                  </span>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                    {isBn ? "লাইভ ব্যাচ" : "Live Batch"}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">{activeBatch.batchName}</span>
                  {activeBatch.scheduleDetails && (
                    <span className="text-[10px] text-gray-400 block mt-0.5">{activeBatch.scheduleDetails}</span>
                  )}
                </div>
              </div>
            )}

            {/* Free Demo Class Button in Sidebar (Only if Admin Enabled) */}
            {/* Free Demo Exam Button in Sidebar (Only if Admin Enabled) */}
            {isDemoExamEnabled(course) && (
              <button
                type="button"
                onClick={() => {
                  playSound("click");
                  setDemoExamModalOpen(true);
                }}
                className="w-full py-3 bg-amber-950/50 hover:bg-amber-900/60 border border-amber-500/40 hover:border-amber-500 text-amber-300 hover:text-white font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 cursor-pointer font-mono"
              >
                <Zap className="w-4 h-4 text-amber-400" />
                <span>{isBn ? "📝 ফ্রি ডেমো এক্সাম দিন" : "📝 Take Free Demo Exam"}</span>
              </button>
            )}

            {/* Main Action Button - Dedicated Enrollment Button */}
            <button
              onClick={() => {
                playSound("click");
                onEnrollNow(course, selectedBatchId);
              }}
              className="w-full py-4 bg-gradient-to-r from-[#C1121F] to-red-600 hover:from-red-600 hover:to-red-500 text-white font-black text-sm uppercase tracking-wider rounded-xl transition shadow-[0_0_20px_rgba(193,18,31,0.5)] flex items-center justify-center gap-2 cursor-pointer font-mono"
            >
              <Zap className="w-4 h-4 text-[#FFD700] fill-[#FFD700]" />
              <span>{isBn ? "এনরোল করুন এখনই" : "ENROLL NOW"}</span>
            </button>

            {/* Course Link Sharing Action Button */}
            <button
              type="button"
              onClick={() => {
                playSound("click");
                setShareModalOpen(true);
              }}
              className="w-full py-3 bg-white/5 hover:bg-[#FFD700]/10 border border-white/10 hover:border-[#FFD700]/40 text-gray-300 hover:text-[#FFD700] font-mono font-bold text-xs uppercase rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-[#FFD700]" />
              <span>{isBn ? "কোর্স লিংক শেয়ার করুন" : "Share Course Link"}</span>
            </button>

            {/* Security Guarantee Info */}
            <div className="space-y-2 pt-2 border-t border-white/10 text-[11px] text-gray-400 font-mono">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{isBn ? "ইনস্ট্যান্ট পেমেন্ট ভেরিফিকেশন & এক্সেস" : "Instant Verified Access"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sky-400 shrink-0" />
                <span>{isBn ? "মেডিকেল ভর্তি পরীক্ষা পর্যন্ত মেয়াদ" : "Valid until MAT exam"}</span>
              </div>

              {/* Direct Support & Facebook */}
              <div className="pt-2 border-t border-white/5 space-y-1 text-[10px]">
                <a
                  href="mailto:medibridgeedu@gmail.com"
                  className="flex items-center gap-1.5 text-gray-300 hover:text-white transition"
                >
                  <Mail className="w-3 h-3 text-red-400 shrink-0" />
                  <span>Support: <strong className="text-white">medibridgeedu@gmail.com</strong></span>
                </a>
                <a
                  href="https://facebook.com/medibridgeacademy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sky-300 hover:text-white transition"
                >
                  <Facebook className="w-3 h-3 text-[#1877F2] shrink-0" />
                  <span>FB: <strong className="text-white">Medibridge Academy</strong></span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {/* Free Demo Exam CBT Modal */}
        {demoExamModalOpen && (
          <FreeDemoExamModal
            course={course}
            language={language}
            theme={theme}
            onClose={() => setDemoExamModalOpen(false)}
            onEnrollNow={(c) => {
              setDemoExamModalOpen(false);
              onEnrollNow(c, selectedBatchId);
            }}
          />
        )}

        {/* Course Share Modal */}
        {shareModalOpen && (
          <CourseShareModal
            course={course}
            language={language}
            onClose={() => setShareModalOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
