import React, { useState, useEffect } from "react";
import { Course, CourseTeacher } from "../../types/courseTypes";
import { db } from "../../lib/backend";
import { collection, onSnapshot, doc, query, limit } from "../../lib/supabaseDb";
import { motion, AnimatePresence } from "motion/react";
import {
  ShieldCheck,
  Award,
  Users,
  BookOpen,
  Mail,
  Phone,
  X,
  GraduationCap,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { playSound } from "../../audio";

interface InstructorProfileProps {
  course: Course;
  language: "bn" | "en";
  theme?: "light" | "dark";
  className?: string;
}

export default function InstructorProfile({
  course,
  language,
  theme = "dark",
  className = ""
}: InstructorProfileProps) {
  const isBn = language === "bn";
  const [teachers, setTeachers] = useState<CourseTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeacher, setSelectedTeacher] = useState<CourseTeacher | null>(null);

  // Section Text customization from Teacher Panel
  const [sectionTexts, setSectionTexts] = useState({
    titleBn: "কোর্স শিক্ষক ও ইন্সট্রাক্টরবৃন্দ",
    titleEn: "Course Faculty & Mentors",
    subtitleBn: "ঢাকা মেডিকেল কলেজ (DMC) ও শীর্ষ সরকারি মেডিকেলের অভিজ্ঞ মেন্টরদের তত্ত্বাবধানে সেরা প্রস্তুতি",
    subtitleEn: "Premier preparation under experienced mentors from Dhaka Medical College & top public institutions",
    badgeBn: "মেডিকেল ভর্তি মেন্টরশিপ",
    badgeEn: "MED STUDENT FACULTY",
    footerNoteBn: "প্রতিটি ক্লাসে সরাসরি প্রশ্ন করার সুযোগ এবং সার্বক্ষণিক টেলিগ্রাম ডিসকাশন সাপোর্ট।",
    footerNoteEn: "Live interactive doubt-solving during classes and round-the-clock mentor support."
  });

  useEffect(() => {
    // Listen to section text settings
    const unsubSettings = onSnapshot(
      doc(db, "settings", "teacher_section"),
      (docSnap) => {
        if (docSnap.exists()) {
          setSectionTexts((prev) => ({
            ...prev,
            ...docSnap.data()
          }));
        }
      },
      (err) => {
        console.warn("InstructorProfile settings listener warning:", err.message);
      }
    );

    if (!course?.id) {
      setLoading(false);
      return () => unsubSettings();
    }

    setLoading(true);
    const unsub = onSnapshot(
      query(collection(db, "course_teachers"), limit(30)),
      (snapshot) => {
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

        setTeachers(loaded);
        setLoading(false);
      },
      (err) => {
        console.warn("InstructorProfile snapshot warning:", err.message);
        setLoading(false);
      }
    );

    return () => {
      unsubSettings();
      unsub();
    };
  }, [course?.id]);

  // Fallback default teacher if none assigned in Firestore yet
  const displayTeachers: CourseTeacher[] =
    teachers.length > 0
      ? teachers
      : [
          {
            id: "fallback_lead",
            name: course.instructorName?.replace(/Dr\.\s*/gi, "") || "Nuwaisir Hoque",
            title: course.instructorTitle || "DMC (K-78), Medical Student & Biology Mentor",
            medicalCollege: "Dhaka Medical College (DMC)",
            avatar:
              course.instructorAvatar ||
              "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80",
            subject: "Biology & Physiology",
            bio: "সহজ ভাষায় বায়োলজির মূল কনসেপ্ট ক্লিয়ার করা ও শর্ট ট্রিকসে মুখস্থ করার বিশেষ টেকনিক শেখান।",
            isLead: true
          }
        ];

  return (
    <div className={`bg-[#111111] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xl font-sans ${className}`}>
      {/* Short Compact Header */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#C1121F]/20 border border-[#C1121F]/40 flex items-center justify-center text-[#FFD700]">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black uppercase text-white font-display">
              {isBn ? (sectionTexts.titleBn || "কোর্স শিক্ষক ও ইন্সট্রাক্টরবৃন্দ") : (sectionTexts.titleEn || "Course Faculty & Mentors")}
            </h3>
            {((isBn && sectionTexts.subtitleBn) || (!isBn && sectionTexts.subtitleEn)) && (
              <p className="text-[11px] text-gray-400 font-sans line-clamp-1">
                {isBn ? sectionTexts.subtitleBn : sectionTexts.subtitleEn}
              </p>
            )}
          </div>
        </div>

        <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1 shrink-0">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span>{isBn ? (sectionTexts.badgeBn || "মেডিকেল ভর্তি মেন্টরশিপ") : (sectionTexts.badgeEn || "MED STUDENT FACULTY")}</span>
        </span>
      </div>

      {/* Teachers Compact List */}
      {loading ? (
        <div className="p-4 text-center text-gray-400 font-mono text-xs animate-pulse bg-black/40 rounded-xl border border-white/5">
          {isBn ? "শিক্ষকদের তথ্য লোড হচ্ছে..." : "Loading instructors..."}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(displayTeachers || []).map((teacher) => {
            const cleanName = (teacher.name || "Mentor").replace(/Dr\.\s*/gi, "");

            return (
              <motion.div
                key={teacher.id}
                whileHover={{ scale: 1.01 }}
                onClick={() => {
                  playSound("click");
                  setSelectedTeacher({ ...teacher, name: cleanName });
                }}
                className="bg-black/50 border border-white/10 hover:border-[#C1121F]/70 rounded-xl p-3 flex items-center gap-3 cursor-pointer group transition-all shadow-sm relative"
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <img
                    src={teacher.avatar}
                    alt={cleanName}
                    className="w-12 h-12 rounded-xl border-2 border-[#C1121F] object-cover shadow-md group-hover:scale-105 transition-transform"
                  />
                  {teacher.isLead && (
                    <span className="absolute -top-1.5 -right-1.5 bg-[#FFD700] text-black text-[8px] font-mono font-black px-1 py-0.2 rounded shadow flex items-center gap-0.5">
                      <Award className="w-2 h-2" />
                      <span>LEAD</span>
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-xs sm:text-sm font-extrabold text-white truncate group-hover:text-[#FFD700] transition-colors">
                      {cleanName}
                    </h4>
                  </div>

                  {teacher.medicalCollege && (
                    <div className="text-[10px] font-mono text-emerald-400 font-semibold flex items-center gap-1 truncate">
                      <GraduationCap className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="truncate">{teacher.medicalCollege}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 pt-0.5">
                    {teacher.subject && (
                      <span className="text-[9px] font-mono font-bold bg-white/10 text-gray-300 px-1.5 py-0.2 rounded border border-white/5 truncate">
                        {teacher.subject}
                      </span>
                    )}
                    <span className="text-[9px] font-mono text-gray-400 truncate">
                      {teacher.title}
                    </span>
                  </div>
                </div>

                {/* Action arrow */}
                <div className="text-gray-500 group-hover:text-[#FFD700] transition-colors shrink-0">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Dynamic Footer Note from Teacher Panel */}
      {((isBn && sectionTexts.footerNoteBn) || (!isBn && sectionTexts.footerNoteEn)) && (
        <div className="pt-2 border-t border-white/5 flex items-center gap-2 text-[11px] font-mono text-gray-400">
          <Sparkles className="w-3.5 h-3.5 text-[#FFD700] shrink-0" />
          <span>{isBn ? sectionTexts.footerNoteBn : sectionTexts.footerNoteEn}</span>
        </div>
      )}

      {/* FULL TEACHER DETAIL MODAL */}
      <AnimatePresence>
        {selectedTeacher && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111111] border border-white/15 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl relative"
            >
              <button
                onClick={() => {
                  playSound("click");
                  setSelectedTeacher(null);
                }}
                className="absolute top-3.5 right-3.5 text-gray-400 hover:text-white p-1 rounded-lg bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3.5 border-b border-white/10 pb-3">
                <img
                  src={selectedTeacher.avatar}
                  alt={selectedTeacher.name}
                  className="w-16 h-16 rounded-xl border-2 border-[#C1121F] object-cover shadow-md shrink-0"
                />

                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-black text-white">
                      {selectedTeacher.name}
                    </h3>
                    {selectedTeacher.isLead && (
                      <span className="bg-[#FFD700] text-black text-[9px] font-mono font-black px-1.5 py-0.2 rounded shadow flex items-center gap-0.5">
                        <Award className="w-2.5 h-2.5" />
                        <span>LEAD</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs font-mono font-bold text-[#FFD700]">
                    {selectedTeacher.title}
                  </p>

                  {selectedTeacher.medicalCollege && (
                    <div className="text-xs font-mono text-emerald-400 flex items-center gap-1 font-semibold">
                      <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{selectedTeacher.medicalCollege}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Subject Tag & Verified Badge */}
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="bg-white/10 text-gray-200 px-2.5 py-0.5 rounded-full border border-white/10 font-bold flex items-center gap-1 text-[11px]">
                  <BookOpen className="w-3 h-3 text-[#FFD700]" />
                  <span>{selectedTeacher.subject || "Faculty"}</span>
                </span>

                <span className="text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 text-[10px]">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>Medical Student Instructor</span>
                </span>
              </div>

              {/* Biography Section */}
              {selectedTeacher.bio && (
                <div className="space-y-1 bg-black/60 p-3 rounded-xl border border-white/10 text-xs">
                  <span className="text-[10px] font-mono text-gray-400 uppercase font-bold tracking-wider block">
                    {isBn ? "ইন্সট্রাক্টর বায়ো ও বিবরণ:" : "Instructor Bio:"}
                  </span>
                  <p className="text-gray-200 leading-relaxed font-sans whitespace-pre-line text-[11px]">
                    {selectedTeacher.bio}
                  </p>
                </div>
              )}

              {/* Contact info if provided */}
              {(selectedTeacher.email || selectedTeacher.phone) && (
                <div className="space-y-1.5 pt-1 text-xs font-mono text-gray-300">
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    {selectedTeacher.email && (
                      <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg">
                        <Mail className="w-3 h-3 text-[#FFD700]" />
                        <span>{selectedTeacher.email}</span>
                      </div>
                    )}
                    {selectedTeacher.phone && (
                      <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg">
                        <Phone className="w-3 h-3 text-emerald-400" />
                        <span>{selectedTeacher.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedTeacher(null)}
                  className="px-4 py-1.5 rounded-xl bg-[#C1121F] hover:bg-red-700 text-white text-xs font-mono font-bold uppercase cursor-pointer"
                >
                  {isBn ? "বন্ধ করুন" : "Close"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
