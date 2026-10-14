import React, { useState, useEffect } from "react";
import { Course, CourseTeacher } from "../../types/courseTypes";
import { UserProfile } from "../../types";
import { db } from "../../firebase";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  setDoc
} from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Upload,
  Camera,
  Check,
  X,
  ShieldCheck,
  BookOpen,
  Award,
  Sparkles,
  Phone,
  Mail,
  Search,
  CheckCircle2,
  Image as ImageIcon,
  Type,
  FileText,
  Save,
  ChevronDown,
  ChevronUp,
  Settings2
} from "lucide-react";
import { playSound } from "../../audio";

interface TeacherManagerProps {
  courses: Course[];
  user: UserProfile;
  language: "bn" | "en";
  theme: "light" | "dark";
  onUpdateCourse?: (course: Course) => void;
}

const PRESET_TEACHER_AVATARS = [
  { name: "DMC Med Student (Male)", url: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80" },
  { name: "SSMC Med Student (Male)", url: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&auto=format&fit=crop&q=80" },
  { name: "DMC Med Student (Female)", url: "https://images.unsplash.com/photo-1594824813566-88855ce78963?w=400&auto=format&fit=crop&q=80" },
  { name: "CMC Med Student (Female)", url: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80" },
  { name: "Medical Student 5", url: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&auto=format&fit=crop&q=80" },
  { name: "Medical Student 6", url: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&auto=format&fit=crop&q=80" }
];

export default function TeacherManager({
  courses,
  user,
  language,
  theme,
  onUpdateCourse
}: TeacherManagerProps) {
  const isBn = language === "bn";

  const DEFAULT_COURSES: Course[] = [
    { id: "course_med_2027", title: "Medical Admission 2027 (Alpha Batch)" } as any,
    { id: "course_med_2026", title: "Medical Admission 2026 (Second Timer)" } as any,
    { id: "course_dental_2027", title: "Dental Special Prep 2027" } as any,
  ];
  const activeCourses = courses && courses.length > 0 ? courses : DEFAULT_COURSES;

  const [teachers, setTeachers] = useState<CourseTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<CourseTeacher | null>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [medicalCollege, setMedicalCollege] = useState("");
  const [avatar, setAvatar] = useState("");
  const [subject, setSubject] = useState("Biology");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [assignedCourseIds, setAssignedCourseIds] = useState<string[]>([]);
  const [isLead, setIsLead] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  // Section / Page Text Customization State
  const [sectionSettings, setSectionSettings] = useState({
    titleBn: "কোর্স শিক্ষক ও ইন্সট্রাক্টরবৃন্দ",
    titleEn: "Course Faculty & Mentors",
    subtitleBn: "ঢাকা মেডিকেল কলেজ (DMC) ও শীর্ষ সরকারি মেডিকেলের অভিজ্ঞ মেন্টরদের তত্ত্বাবধানে সেরা প্রস্তুতি",
    subtitleEn: "Premier preparation under experienced mentors from Dhaka Medical College & top public institutions",
    badgeBn: "মেডিকেল ভর্তি মেন্টরশিপ",
    badgeEn: "MEDICAL ADMISSION FACULTY",
    footerNoteBn: "প্রতিটি ক্লাসে সরাসরি প্রশ্ন করার সুযোগ এবং সার্বক্ষণিক টেলিগ্রাম ডিসকাশন সাপোর্ট।",
    footerNoteEn: "Live interactive doubt-solving during classes and round-the-clock mentor support."
  });
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Real-time Firestore sync
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "course_teachers"));
    const unsubscribeTeachers = onSnapshot(
      q,
      (snapshot) => {
        const loaded: CourseTeacher[] = [];
        snapshot.forEach((docSnap) => {
          loaded.push({
            id: docSnap.id,
            ...docSnap.data()
          } as CourseTeacher);
        });

        setTeachers(loaded);
        setLoading(false);
      },
      (err) => {
        console.warn("Course teachers fetch warning:", err.message);
        setLoading(false);
      }
    );

    const unsubscribeSettings = onSnapshot(
      doc(db, "settings", "teacher_section"),
      (docSnap) => {
        if (docSnap.exists()) {
          setSectionSettings((prev) => ({
            ...prev,
            ...docSnap.data()
          }));
        }
      },
      (err) => {
        console.warn("Teacher section settings fetch warning:", err.message);
      }
    );

    return () => {
      unsubscribeTeachers();
      unsubscribeSettings();
    };
  }, []);

  // Save Section Settings
  const handleSaveSectionSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    playSound("click");
    try {
      await setDoc(doc(db, "settings", "teacher_section"), sectionSettings, { merge: true });
      playSound("levelup");
      setSaveMessage(isBn ? "পৃষ্ঠার শিরোনাম ও টেক্সট সফলভাবে আপডেট করা হয়েছে!" : "Page titles and texts updated successfully!");
      setTimeout(() => setSaveMessage(""), 4000);
    } catch (err: any) {
      console.error("Error saving section settings:", err);
      setSaveMessage(isBn ? "ত্রুটি: টেক্সট সংরক্ষণ করা যায়নি" : "Error saving text settings");
      setTimeout(() => setSaveMessage(""), 4000);
    } finally {
      setSavingSettings(false);
    }
  };

  // Open Form Modal for Create or Edit
  const handleOpenForm = (teacher?: CourseTeacher) => {
    playSound("click");
    if (teacher) {
      setEditingTeacher(teacher);
      setName(teacher.name);
      setTitle(teacher.title);
      setMedicalCollege(teacher.medicalCollege || "");
      setAvatar(teacher.avatar);
      setSubject(teacher.subject || "Biology");
      setBio(teacher.bio || "");
      setPhone(teacher.phone || "");
      setEmail(teacher.email || "");
      setAssignedCourseIds(teacher.assignedCourseIds || []);
      setIsLead(teacher.isLead || false);
    } else {
      setEditingTeacher(null);
      setName("");
      setTitle("");
      setMedicalCollege("Dhaka Medical College (DMC)");
      setAvatar(PRESET_TEACHER_AVATARS[0].url);
      setSubject("Biology");
      setBio("");
      setPhone("");
      setEmail("");
      setAssignedCourseIds(activeCourses.map((c) => c.id));
      setIsLead(false);
    }
    setShowModal(true);
  };

  const [uploadNotice, setUploadNotice] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  // File Upload Helper with Validation & Feedback
  const handleFileUpload = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadNotice(isBn ? "শুধুমাত্র ইমেজ ফাইল (JPG, PNG, WEBP) সিলেক্ট করুন!" : "Please select a valid image file!");
      setTimeout(() => setUploadNotice(""), 3500);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadNotice(isBn ? "ছবির ফাইল সাইজ সর্বোচ্চ ৫MB হতে পারবে!" : "Image file size must be under 5MB!");
      setTimeout(() => setUploadNotice(""), 3500);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setAvatar(e.target.result as string);
        playSound("levelup");
        setUploadNotice(isBn ? "✓ শিক্ষকের ছবি সফলভাবে আপলোড করা হয়েছে!" : "✓ Teacher photo uploaded successfully!");
        setTimeout(() => setUploadNotice(""), 3500);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !title.trim()) return;

    setSubmitting(true);
    playSound("click");

    try {
      const teacherData = {
        name: name.trim(),
        title: title.trim(),
        medicalCollege: medicalCollege.trim(),
        avatar: avatar || PRESET_TEACHER_AVATARS[0].url,
        subject,
        bio: bio.trim(),
        phone: phone.trim(),
        email: email.trim(),
        assignedCourseIds,
        isLead,
        updatedAt: new Date().toISOString()
      };

      if (editingTeacher) {
        // Update existing teacher doc
        await updateDoc(doc(db, "course_teachers", editingTeacher.id), teacherData);
      } else {
        // Add new teacher doc
        await addDoc(collection(db, "course_teachers"), {
          ...teacherData,
          createdAt: new Date().toISOString()
        });
      }

      // If set as lead, sync with assigned courses
      if (isLead && onUpdateCourse) {
        assignedCourseIds.forEach((cId) => {
          const matchCourse = activeCourses.find((c) => c.id === cId);
          if (matchCourse) {
            onUpdateCourse({
              ...matchCourse,
              instructorName: name.trim(),
              instructorTitle: title.trim(),
              instructorAvatar: avatar || PRESET_TEACHER_AVATARS[0].url
            });
          }
        });
      }

      playSound("levelup");
      setSaveMessage(isBn ? "শিক্ষকের প্রোফাইল সফলভাবে সংরক্ষিত হয়েছে!" : "Teacher profile saved successfully!");
      setShowModal(false);
      setTimeout(() => setSaveMessage(""), 4000);
    } catch (err) {
      console.error("Error saving teacher details:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Teacher
  const handleDeleteTeacher = async (teacherId: string, teacherName: string) => {
    if (!window.confirm(isBn ? `আপনি কি সত্যিই "${teacherName}" কে তালিকা থেকে মুছে ফেলতে চান?` : `Delete teacher profile "${teacherName}"?`)) {
      return;
    }

    playSound("click");
    try {
      await deleteDoc(doc(db, "course_teachers", teacherId));
      playSound("correct");
    } catch (err) {
      console.error("Error deleting teacher:", err);
    }
  };

  // Toggle Course Assignment
  const toggleCourseAssignment = (courseId: string) => {
    setAssignedCourseIds((prev) =>
      prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId]
    );
  };

  const filteredTeachers = teachers.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (t.name || "").toLowerCase().includes(q) ||
      (t.title || "").toLowerCase().includes(q) ||
      (t.medicalCollege || "").toLowerCase().includes(q) ||
      (t.subject || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full space-y-6 font-sans">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#111111] via-[#1c1215] to-[#111111] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#C1121F]/20 border border-[#C1121F]/40 flex items-center justify-center text-[#FFD700] shadow-[0_0_15px_rgba(193,18,31,0.3)] shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-[#FFD700] uppercase tracking-wider">
                ADMIN FACULTY CONTROL
              </span>
              <span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-mono font-bold px-2 py-0.5 rounded border border-emerald-500/30">
                LIVE FIRESTORE
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white uppercase font-display leading-tight">
              {isBn ? "কোর্স শিক্ষক ও ইন্সট্রাক্টর ম্যানেজমেন্ট" : "Course Teacher & Faculty Management"}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {isBn
                ? "কোর্সের শিক্ষকদের ছবি, টাইটেল, মেডিকেল কলেজ, বায়ো ও পৃষ্ঠার টেক্সট পরিবর্তন করুন।"
                : "Manage instructor profiles, medical college credentials, photo URLs, and customize page headlines."}
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => {
              playSound("click");
              setShowTextEditor(!showTextEditor);
            }}
            className={`px-4 py-2.5 rounded-xl border text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition cursor-pointer ${
              showTextEditor
                ? "bg-[#FFD700] text-black border-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.3)]"
                : "bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border-white/10"
            }`}
          >
            <Type className="w-4 h-4" />
            <span>{isBn ? "পৃষ্ঠার টেক্সট এডিট" : "Edit Page Texts"}</span>
            {showTextEditor ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => handleOpenForm()}
            className="px-4 py-2.5 rounded-xl bg-[#C1121F] hover:bg-red-700 text-white font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(193,18,31,0.4)] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isBn ? "নতুন শিক্ষক" : "Add Teacher"}</span>
          </button>
        </div>
      </div>

      {/* PAGE / FACULTY SECTION TEXT CUSTOMIZATION DRAWER */}
      <AnimatePresence>
        {showTextEditor && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form
              onSubmit={handleSaveSectionSettings}
              className="bg-[#141416] border border-[#FFD700]/30 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4 font-sans"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-yellow-950/40 border border-[#FFD700]/30 flex items-center justify-center text-[#FFD700]">
                    <Type className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase font-display">
                      {isBn ? "শিক্ষক সেকশনের শিরোনাম ও টেক্সট কাস্টমাইজার" : "Teacher Section Headlines & Texts"}
                    </h3>
                    <p className="text-[11px] text-gray-400">
                      {isBn
                        ? "এই ফর্ম থেকে সেভ করলে ওয়েবসাইট ও কোর্স পেজে টেক্সট রিয়েল-টাইম আপডেট হবে।"
                        : "Changes saved here will sync live across public landing and course details pages."}
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-4 py-2 bg-[#FFD700] hover:bg-yellow-400 text-black font-mono font-bold text-xs uppercase rounded-xl flex items-center gap-1.5 cursor-pointer shadow transition"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingSettings ? "Saving..." : isBn ? "টেক্সট সেভ করুন" : "Save Texts"}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Title BN */}
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-gray-300 font-bold block">
                    {isBn ? "সেকশন শিরোনাম (বাংলা)" : "Section Title (Bangla)"}
                  </label>
                  <input
                    type="text"
                    value={sectionSettings.titleBn}
                    onChange={(e) => setSectionSettings({ ...sectionSettings, titleBn: e.target.value })}
                    className="w-full bg-black/60 border border-white/15 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#FFD700]"
                    placeholder="কোর্স শিক্ষক ও ইন্সট্রাক্টরবৃন্দ"
                  />
                </div>

                {/* Title EN */}
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-gray-300 font-bold block">
                    {isBn ? "সেকশন শিরোনাম (English)" : "Section Title (English)"}
                  </label>
                  <input
                    type="text"
                    value={sectionSettings.titleEn}
                    onChange={(e) => setSectionSettings({ ...sectionSettings, titleEn: e.target.value })}
                    className="w-full bg-black/60 border border-white/15 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#FFD700]"
                    placeholder="Course Faculty & Mentors"
                  />
                </div>

                {/* Subtitle BN */}
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-gray-300 font-bold block">
                    {isBn ? "সাব-টাইটেল / বিবরণ (বাংলা)" : "Subtitle / Description (Bangla)"}
                  </label>
                  <textarea
                    rows={2}
                    value={sectionSettings.subtitleBn}
                    onChange={(e) => setSectionSettings({ ...sectionSettings, subtitleBn: e.target.value })}
                    className="w-full bg-black/60 border border-white/15 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#FFD700]"
                    placeholder="ঢাকা মেডিকেল কলেজ (DMC) ও শীর্ষ সরকারি মেডিকেলের অভিজ্ঞ মেন্টরদের তত্ত্বাবধানে সেরা প্রস্তুতি"
                  />
                </div>

                {/* Subtitle EN */}
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-gray-300 font-bold block">
                    {isBn ? "সাব-টাইটেল / বিবরণ (English)" : "Subtitle / Description (English)"}
                  </label>
                  <textarea
                    rows={2}
                    value={sectionSettings.subtitleEn}
                    onChange={(e) => setSectionSettings({ ...sectionSettings, subtitleEn: e.target.value })}
                    className="w-full bg-black/60 border border-white/15 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#FFD700]"
                    placeholder="Premier preparation under experienced mentors from DMC and top institutions"
                  />
                </div>

                {/* Badge Tag */}
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-gray-300 font-bold block">
                    {isBn ? "ট্যাগ বা ব্যাজ টেক্সট (বাংলা)" : "Badge Tag (Bangla)"}
                  </label>
                  <input
                    type="text"
                    value={sectionSettings.badgeBn}
                    onChange={(e) => setSectionSettings({ ...sectionSettings, badgeBn: e.target.value })}
                    className="w-full bg-black/60 border border-white/15 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#FFD700]"
                    placeholder="মেডিকেল ভর্তি মেন্টরশিপ"
                  />
                </div>

                {/* Footer Note */}
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-gray-300 font-bold block">
                    {isBn ? "ফুটার নোট বা বার্তা (বাংলা)" : "Footer Note (Bangla)"}
                  </label>
                  <input
                    type="text"
                    value={sectionSettings.footerNoteBn}
                    onChange={(e) => setSectionSettings({ ...sectionSettings, footerNoteBn: e.target.value })}
                    className="w-full bg-black/60 border border-white/15 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#FFD700]"
                    placeholder="প্রতিটি ক্লাসে সরাসরি প্রশ্ন করার সুযোগ এবং সার্বক্ষণিক টেলিগ্রাম ডিসকাশন সাপোর্ট।"
                  />
                </div>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {saveMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold flex items-center gap-2 animate-pulse">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={isBn ? "শিক্ষকের নাম বা মেডিকেল কলেজ লিখে খুঁজুন..." : "Search teachers by name or college..."}
          className="w-full bg-[#111111] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#C1121F]"
        />
      </div>

      {/* Teacher Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-gray-400 font-mono text-xs bg-[#111111] border border-white/10 rounded-2xl animate-pulse">
          {isBn ? "টিচার প্যানেল লোড হচ্ছে..." : "Loading course faculty profiles..."}
        </div>
      ) : filteredTeachers.length === 0 ? (
        <div className="p-12 text-center bg-[#111111] border border-white/10 rounded-2xl space-y-3">
          <Users className="w-10 h-10 text-gray-500 mx-auto" />
          <h3 className="text-base font-bold text-white uppercase font-display">
            {isBn ? "কোনো শিক্ষকের ফাইল পাওয়া যায়নি" : "No Teacher Profiles Found"}
          </h3>
          <p className="text-xs text-gray-400">
            {isBn ? "নতুন শিক্ষক যুক্ত করতে উপরের বোতামটিতে ক্লিক করুন।" : "Click the button above to add a new course teacher."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTeachers.map((teacher) => {
            const assignedCourses = activeCourses.filter((c) =>
              teacher.assignedCourseIds?.includes(c.id)
            );

            return (
              <motion.div
                key={teacher.id}
                whileHover={{ y: -4 }}
                className="bg-[#111111] border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl relative flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Avatar & Header */}
                  <div className="flex items-start gap-3.5">
                    <div className="relative shrink-0">
                      <img
                        src={teacher.avatar}
                        alt={teacher.name}
                        className="w-16 h-16 rounded-2xl border-2 border-[#C1121F] object-cover shadow-md"
                      />
                      {teacher.isLead && (
                        <span className="absolute -top-2 -right-2 bg-[#FFD700] text-black text-[9px] font-mono font-black px-1.5 py-0.5 rounded shadow flex items-center gap-0.5">
                          <Award className="w-2.5 h-2.5" />
                          <span>LEAD</span>
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <h3 className="text-sm font-black text-white font-sans truncate">
                          {teacher.name}
                        </h3>
                        <span className="bg-white/10 text-gray-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-white/10 shrink-0">
                          {teacher.subject}
                        </span>
                      </div>

                      <p className="text-xs text-[#FFD700] font-mono font-bold leading-tight">
                        {teacher.title}
                      </p>

                      {teacher.medicalCollege && (
                        <p className="text-[11px] text-emerald-400 font-mono font-semibold flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{teacher.medicalCollege}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Bio */}
                  {teacher.bio && (
                    <p className="text-xs text-gray-300 font-sans leading-relaxed line-clamp-3 bg-black/40 p-3 rounded-xl border border-white/5">
                      "{teacher.bio}"
                    </p>
                  )}

                  {/* Assigned Courses List */}
                  <div className="space-y-1 font-mono text-[11px]">
                    <span className="text-gray-400 uppercase font-bold text-[10px] block">
                      {isBn ? "অ্যাসাইনকৃত কোর্সসমূহ:" : "Assigned Courses:"}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {assignedCourses.length > 0 ? (
                        assignedCourses.map((c) => (
                          <span
                            key={c.id}
                            className="bg-[#C1121F]/20 text-[#FFD700] border border-[#C1121F]/40 px-2 py-0.5 rounded text-[10px] font-bold"
                          >
                            {c.title}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-500 italic text-[10px]">
                          {isBn ? "কোনো কোর্স অ্যাসাইন করা হয়নি" : "No courses assigned"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Controls */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10 font-mono text-xs mt-3">
                  <button
                    onClick={() => handleOpenForm(teacher)}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-[#FFD700]" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => handleDeleteTeacher(teacher.id, teacher.name)}
                    className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold flex items-center gap-1.5 cursor-pointer border border-red-500/30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* EDIT / CREATE TEACHER MODAL */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 font-sans overflow-hidden">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[#111111] border border-white/15 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl relative overflow-hidden"
            >
              {/* Fixed Modal Header */}
              <div className="flex items-center justify-between p-5 border-b border-white/10 shrink-0 bg-[#151515]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#C1121F]/20 border border-[#C1121F]/40 flex items-center justify-center text-[#FFD700] shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white font-display uppercase leading-snug">
                      {editingTeacher
                        ? isBn
                          ? "শিক্ষকের তথ্য ও ছবি এডিট করুন"
                          : "Edit Teacher Profile & Picture"
                        : isBn
                        ? "নতুন শিক্ষক প্রোফাইল যুক্ত করুন"
                        : "Add New Teacher Profile"}
                    </h3>
                    <p className="text-xs text-gray-400">
                      {isBn
                        ? "ছবি আপলোড, টাইটেল, মেডিকেল কলেজ ও কোর্স অ্যাসাইনমেন্ট স্ক্রোল করে পূরণ করুন"
                        : "Upload picture, edit title, medical college credentials & course assignments"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-white p-2 rounded-xl bg-white/5 hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Modal Content */}
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                {/* Photo / Avatar Section with Upload, Presets & Compact Box */}
                <div className="space-y-2.5 bg-black/60 p-3 sm:p-4 rounded-xl border border-white/10 shadow-inner">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-mono text-gray-200 font-bold uppercase flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-[#FFD700]" />
                      <span>{isBn ? "শিক্ষকের প্রোফাইল ছবি (Photo Upload & Presets)" : "Teacher Profile Picture & Presets"}</span>
                    </label>
                    {avatar && (
                      <button
                        type="button"
                        onClick={() => {
                          setAvatar("");
                          setUploadNotice(isBn ? "ছবি রিমুভ করা হয়েছে" : "Picture cleared");
                          setTimeout(() => setUploadNotice(""), 2000);
                        }}
                        className="text-[10px] font-mono text-red-400 hover:text-red-300 underline cursor-pointer"
                      >
                        {isBn ? "ছবি রিমুভ" : "Clear"}
                      </button>
                    )}
                  </div>

                  {uploadNotice && (
                    <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-mono text-[11px] flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{uploadNotice}</span>
                    </div>
                  )}

                  {/* Drag & Drop Upload Zone - Compact Box */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleFileUpload(e.dataTransfer.files[0]);
                      }
                    }}
                    className={`relative p-3 rounded-xl border border-dashed transition flex flex-col sm:flex-row items-center gap-3 ${
                      isDragging
                        ? "border-[#FFD700] bg-[#FFD700]/10"
                        : "border-white/15 bg-black/40 hover:border-white/30"
                    }`}
                  >
                    <div className="relative shrink-0 group">
                      <img
                        src={avatar || PRESET_TEACHER_AVATARS[0].url}
                        alt="Preview"
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl border-2 border-[#C1121F] object-cover shadow-md"
                      />
                      <div className="absolute inset-0 bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 transition flex items-center justify-center pointer-events-none">
                        <Camera className="w-5 h-5 text-white" />
                      </div>
                    </div>

                    <div className="space-y-2 flex-1 w-full text-center sm:text-left">
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <label className="px-3 py-1.5 rounded-lg bg-[#C1121F] hover:bg-red-700 active:scale-95 text-white font-mono text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shadow transition">
                          <Upload className="w-3.5 h-3.5" />
                          <span>{isBn ? "ডিভাইস থেকে আপলোড" : "Upload Picture"}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleFileUpload(e.target.files[0]);
                              }
                            }}
                          />
                        </label>

                        <span className="text-[10px] text-gray-400 font-mono">JPG, PNG, WEBP (Max 5MB)</span>
                      </div>

                      <div className="pt-0.5">
                        <input
                          type="text"
                          value={avatar}
                          onChange={(e) => setAvatar(e.target.value)}
                          placeholder="Or paste direct image URL (https://...)"
                          className="w-full bg-black/70 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#C1121F] font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Preset Avatars Scrollable Horizontal Bar */}
                  <div className="pt-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-mono text-gray-400 font-bold uppercase">
                        {isBn ? "প্রিসেট স্টুডেন্ট ছবি:" : "Preset Photos:"}
                      </span>
                      <span className="text-[9px] font-mono text-gray-500">
                        {PRESET_TEACHER_AVATARS.length} Presets Available ➔
                      </span>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1.5 pt-0.5 scroll-smooth">
                      {PRESET_TEACHER_AVATARS.map((p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setAvatar(p.url);
                            playSound("click");
                          }}
                          className={`group relative w-11 h-11 rounded-lg overflow-hidden border shrink-0 cursor-pointer transition ${
                            avatar === p.url ? "border-[#FFD700] scale-105 shadow-md shadow-amber-500/20" : "border-white/10 hover:border-white/40"
                          }`}
                          title={p.name}
                        >
                          <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
                          {avatar === p.url && (
                            <div className="absolute inset-0 bg-[#FFD700]/30 flex items-center justify-center">
                              <Check className="w-4 h-4 text-black bg-[#FFD700] rounded-full p-0.5 shadow-md" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Name & Title Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-mono text-gray-300 block font-bold">
                      {isBn ? "শিক্ষকের পূর্ণ নাম" : "Teacher Full Name"} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Nuwaisir Hoque"
                      className="w-full bg-black/60 border border-white/15 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#C1121F]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-mono text-gray-300 block font-bold">
                      {isBn ? "টাইটেল / পদবী (Title)" : "Title / Designation"} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. DMC (K-78), Gold Medalist in Human Biology"
                      className="w-full bg-black/60 border border-white/15 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#C1121F]"
                    />
                  </div>
                </div>

                {/* Medical College & Subject */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-mono text-gray-300 block font-bold">
                      {isBn ? "মেডিকেল কলেজ (Medical College)" : "Medical College"}
                    </label>
                    <input
                      type="text"
                      value={medicalCollege}
                      onChange={(e) => setMedicalCollege(e.target.value)}
                      placeholder="e.g. Dhaka Medical College (DMC)"
                      className="w-full bg-black/60 border border-white/15 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#C1121F]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-mono text-gray-300 block font-bold">
                      {isBn ? "প্রধান বিষয় (Primary Subject)" : "Primary Teaching Subject"}
                    </label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full bg-black/60 border border-white/15 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#C1121F]"
                    >
                      <option value="Biology">Biology & Medical Physiology</option>
                      <option value="Chemistry">Medical Chemistry</option>
                      <option value="Physics">Medical Physics</option>
                      <option value="English & GK">English & Medical GK</option>
                      <option value="General">General Faculty</option>
                    </select>
                  </div>
                </div>

                {/* Course Assignments Checkboxes with Internal Scroll if many */}
                <div className="space-y-2.5 bg-black/40 p-4 rounded-xl border border-white/10 font-mono">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-gray-200 block font-bold uppercase">
                      {isBn ? "কোর্স অ্যাসাইনমেন্ট (কোন কোন কোর্সে উনি পড়াবেন):" : "Course Assignments:"}
                    </label>
                    <span className="text-[10px] text-gray-400">
                      {assignedCourseIds.length} {isBn ? "টি কোর্স নির্বাচিত" : "Selected"}
                    </span>
                  </div>
                  <div className="max-h-48 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {activeCourses.map((c) => {
                      const isSelected = assignedCourseIds.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleCourseAssignment(c.id)}
                          className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition cursor-pointer text-xs ${
                            isSelected
                              ? "bg-[#C1121F]/20 border-[#C1121F] text-white font-bold shadow-sm"
                              : "bg-black/60 border-white/10 text-gray-400 hover:border-white/30"
                          }`}
                        >
                          <span className="truncate pr-2">{c.title}</span>
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                              isSelected
                                ? "bg-[#C1121F] border-[#C1121F] text-white"
                                : "border-white/30"
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Lead Instructor Toggle */}
                <div className="flex items-center gap-2 pt-1 bg-black/30 p-3 rounded-xl border border-white/5">
                  <label className="flex items-center gap-2.5 text-xs font-mono text-gray-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isLead}
                      onChange={(e) => setIsLead(e.target.checked)}
                      className="w-4 h-4 accent-[#C1121F] rounded cursor-pointer"
                    />
                    <span className="text-[#FFD700] font-bold">
                      {isBn ? "কোর্সের লিড ইনস্ট্রাক্টর (Primary Lead Instructor)" : "Set as Lead Instructor for selected courses"}
                    </span>
                  </label>
                </div>

                {/* Short Bio */}
                <div className="space-y-1">
                  <label className="text-xs font-mono text-gray-300 block font-bold">
                    {isBn ? "শিক্ষকের সংক্ষিপ্ত বায়ো / বার্তা" : "Short Biography / Message to Students"}
                  </label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Describe teaching experience, achievement or tips for MAT candidates..."
                    className="w-full bg-black/60 border border-white/15 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#C1121F]"
                  />
                </div>

                {/* Fixed Footer Buttons Container */}
                <div className="sticky bottom-0 bg-[#111111]/95 backdrop-blur-md pt-3 pb-1 -mx-5 -mb-5 px-5 sm:-mx-6 sm:-mb-6 sm:px-6 border-t border-white/10 flex items-center justify-end gap-3 font-mono text-xs z-10">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-white/10 text-gray-300 hover:bg-white/20 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 rounded-xl bg-[#C1121F] hover:bg-red-700 text-white font-bold flex items-center gap-2 cursor-pointer shadow-lg active:scale-95 transition"
                  >
                    <Check className="w-4 h-4" />
                    <span>{submitting ? "Saving..." : isBn ? "সংরক্ষণ করুন" : "Save Teacher"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
