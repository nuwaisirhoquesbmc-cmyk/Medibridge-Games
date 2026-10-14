import React, { useState, useEffect } from "react";
import { Course, Enrollment, Order } from "../../types/courseTypes";
import { UserProfile } from "../../types";
import { getCourseAspectClass } from "../../lib/courseUtils";
import PaymentReceipt from "./PaymentReceipt";
import { db } from "../../firebase";
import { collection, query, where, limit, onSnapshot } from "firebase/firestore";
import { motion } from "motion/react";
import {
  BookOpen,
  Clock,
  ArrowRight,
  Sparkles,
  Award,
  CheckCircle2,
  PlayCircle,
  FileText,
  FileCheck,
  ShieldAlert
} from "lucide-react";
import { playSound } from "../../audio";

interface MyCoursesViewProps {
  enrollments: Enrollment[];
  courses: Course[];
  user: UserProfile;
  language: "bn" | "en";
  theme: "light" | "dark";
  onGoToCourseDashboard: (course: Course) => void;
  onExploreCourses: () => void;
}

export default function MyCoursesView({
  enrollments,
  courses,
  user,
  language,
  theme,
  onGoToCourseDashboard,
  onExploreCourses
}: MyCoursesViewProps) {
  const isDark = theme === "dark";
  const isBn = language === "bn";

  const [selectedReceipt, setSelectedReceipt] = useState<{
    enrollment: Enrollment;
    course: Course;
    order?: Order | any;
  } | null>(null);

  const [userPendingRequests, setUserPendingRequests] = useState<any[]>([]);

  // Listen for user's pending payment requests in real time
  useEffect(() => {
    if (!user.uid) return;
    const qReq = query(
      collection(db, "payment_requests"),
      where("userId", "==", user.uid),
      limit(20)
    );

    const unsubscribe = onSnapshot(
      qReq,
      (snapshot) => {
        const reqs: any[] = [];
        const seenReqIds = new Set<string>();
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          if (d.status === "Pending") {
            const reqId = docSnap.id;
            if (!seenReqIds.has(reqId)) {
              seenReqIds.add(reqId);
              reqs.push({ ...d, id: reqId });
            }
          }
        });
        setUserPendingRequests(reqs);
      },
      (err) => {
        console.warn("User payment requests stream warning:", err);
      }
    );

    return () => unsubscribe();
  }, [user.uid]);

  const activeEnrollments = React.useMemo(() => {
    const seen = new Set<string>();
    return enrollments.filter((e) => {
      if (e.status !== "active") return false;
      const key = e.id || `enr_${e.userId}_${e.courseId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [enrollments]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 flex flex-col gap-8 font-sans">
      {/* Header Banner */}
      <div className={`relative overflow-hidden rounded-3xl p-8 border ${
        isDark
          ? "bg-gradient-to-r from-[#18080A] via-[#0F0D15] to-[#0A0A0A] border-red-900/40 shadow-xl"
          : "bg-gradient-to-r from-red-50 to-white border-red-200 shadow-md text-slate-800"
      }`}>
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-bold uppercase tracking-widest mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isBn ? "আমার নিবন্ধিত কোর্সসমূহ" : "MY ENROLLED COURSES"}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight font-display text-white">
              {isBn ? `স্বাগতম, ${user.displayName || "Aspirant"}!` : `Welcome back, ${user.displayName || "Aspirant"}!`}
            </h1>

            <p className="text-xs sm:text-sm text-gray-300 font-sans mt-1">
              {isBn ? "আপনার সক্রিয় কোর্স পোর্টাল, পরীক্ষার রুটিন এবং অগ্রগতি ট্র্যাকার" : "Access active exam batches, live recordings, lecture sheets, and mistake banks"}
            </p>
          </div>

          <button
            onClick={() => {
              playSound("click");
              onExploreCourses();
            }}
            className="px-5 py-3 bg-[#C1121F] hover:bg-red-700 text-white text-xs font-mono font-bold uppercase tracking-wider rounded-xl transition shadow border-b-2 border-red-950 flex items-center gap-2 cursor-pointer shrink-0"
          >
            <span>{isBn ? "নতুন কোর্স খুঁজুন" : "Explore Courses"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Pending Payment Requests Section */}
      {userPendingRequests.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-amber-400 font-mono font-bold text-xs uppercase tracking-wider">
            <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>
              {isBn
                ? `পেমেন্ট ভেরিফিকেশন অপেক্ষমাণ ভর্তি (${userPendingRequests.length})`
                : `Pending Admin Verification (${userPendingRequests.length})`}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {userPendingRequests.map((req) => {
              const matchedCourse = courses.find((c) => c.id === req.courseId) || courses[0];
              return (
                <div
                  key={req.id}
                  className="bg-gradient-to-r from-amber-950/40 via-black to-black border border-amber-500/40 rounded-2xl p-5 space-y-3.5 shadow-xl relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-300 animate-pulse" />
                        <span>{isBn ? "ভেরিফিকেশন চলছে (Pending)" : "PENDING VERIFICATION"}</span>
                      </span>
                      <h3 className="text-sm font-extrabold text-white font-display mt-2">
                        {req.courseTitle || matchedCourse?.title || "Medical Exam Course"}
                      </h3>
                      <p className="text-xs text-[#FFD700] font-mono font-bold">
                        {req.batchName || "Medical Standard Batch"}
                      </p>
                    </div>

                    <div className="text-right font-mono text-xs">
                      <span className="text-gray-400 text-[10px] block">{isBn ? "প্রদেয় ফি:" : "Amount:"}</span>
                      <span className="text-white font-black text-sm">৳{req.amount}</span>
                    </div>
                  </div>

                  {/* Submission Details */}
                  <div className="bg-black/50 p-3 rounded-xl border border-white/10 font-mono text-[11px] grid grid-cols-2 gap-2 text-gray-300">
                    <div>
                      <span className="text-gray-500 text-[9px] block uppercase">{isBn ? "মেথড ও নম্বর:" : "Method & Phone:"}</span>
                      <span className="font-bold text-white uppercase">{req.paymentMethod} • {req.senderNumber || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[9px] block uppercase">TrxID:</span>
                      <span className="font-bold text-[#FFD700] font-mono">{req.transactionId || "N/A"}</span>
                    </div>
                  </div>

                  {/* Notice */}
                  <p className="text-[11px] text-amber-200/90 leading-relaxed font-sans">
                    {isBn
                      ? "⚡ আপনার বিকাশ/নগদ পেমেন্টটি এডমিন প্যানেল থেকে যাচাই করা হচ্ছে। ট্রানজেকশন তথ্য মিললে খুব শীঘ্রই এক্সেস সচল করা হবে।"
                      : "⚡ Admin is reviewing your submitted payment. Access will unlock automatically as soon as verified."}
                  </p>

                  {/* View Receipt Button */}
                  <button
                    onClick={() => {
                      playSound("click");
                      const pendingOrder = {
                        id: req.id,
                        orderNumber: `MB-${req.id.slice(0, 6).toUpperCase()}`,
                        userId: req.userId,
                        courseId: req.courseId,
                        batchId: req.batchId,
                        amount: req.amount,
                        paymentMethod: req.paymentMethod,
                        transactionId: req.transactionId,
                        senderNumber: req.senderNumber,
                        status: "Pending",
                        createdAt: req.submissionDate || new Date().toISOString()
                      };
                      const pendingEnrollment = {
                        id: req.id,
                        userId: req.userId,
                        courseId: req.courseId,
                        batchName: req.batchName,
                        status: "pending_verification",
                        enrolledAt: req.submissionDate || new Date().toISOString()
                      } as any;

                      setSelectedReceipt({
                        enrollment: pendingEnrollment,
                        course: matchedCourse,
                        order: pendingOrder
                      });
                    }}
                    className="w-full py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-mono font-bold text-xs uppercase rounded-xl border border-amber-500/40 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <FileCheck className="w-4 h-4 text-[#FFD700]" />
                    <span>{isBn ? "📄 জমাকৃত মানি মেমো / Receipt দেখুন" : "📄 View Submitted Money Receipt"}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Courses List Grid */}
      {activeEnrollments.length === 0 ? (
        <div className="bg-[#111111] border border-white/10 rounded-2xl p-12 text-center space-y-4">
          <BookOpen className="w-12 h-12 text-[#FFD700] mx-auto opacity-80 animate-bounce" />
          <h3 className="text-lg font-black uppercase text-white font-display">
            {isBn ? "আপনার কোন সক্রিয় কোর্স নেই!" : "NO ACTIVE COURSES ENROLLED YET!"}
          </h3>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            {isBn
              ? "মেডিকেল ভর্তি পরীক্ষার প্রস্তুতিকে আরও সুদৃঢ় করতে আমাদের স্পেশাল এক্সাম ব্যাচ বা বায়োলজি মাস্টারি কোর্সে এনরোল করুন।"
              : "Explore our medical entrance exam batches and start practicing with instant mistake banks and leaderboards."}
          </p>
          <button
            onClick={() => {
              playSound("click");
              onExploreCourses();
            }}
            className="px-6 py-3 bg-gradient-to-r from-[#C1121F] to-red-600 text-white font-black text-xs font-mono uppercase tracking-wider rounded-xl transition shadow-[0_0_15px_rgba(193,18,31,0.4)] cursor-pointer"
          >
            {isBn ? "কোর্স ব্রাউজ করুন" : "Browse Courses Now"}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeEnrollments.map((enr) => {
            const course = courses.find((c) => c.id === enr.courseId);
            if (!course) return null;

            return (
              <motion.div
                key={enr.id}
                whileHover={{ y: -4 }}
                className="bg-[#111111] border border-white/10 hover:border-[#C1121F]/60 rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between transition-all duration-300"
              >
                <div>
                  {/* Clean Thumbnail (No text on top of thumbnail) */}
                  <div className={`relative ${getCourseAspectClass(course.aspectRatio)} w-full overflow-hidden bg-black/40`}>
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Course Details */}
                  <div className="p-5 space-y-4">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[10px] text-[#FFD700] font-mono block uppercase font-bold">{enr.batchName}</span>
                        <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase">
                          ACTIVE BATCH
                        </span>
                      </div>
                      <h3 className="text-base font-extrabold text-white leading-snug font-display mt-0.5">{course.title}</h3>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5 font-mono text-[11px]">
                      <div className="flex justify-between text-gray-400">
                        <span>{isBn ? "কোর্স সম্পন্ন" : "Progress"}</span>
                        <span className="text-emerald-400 font-bold">{enr.progressPct || 0}%</span>
                      </div>
                      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                          style={{ width: `${enr.progressPct || 0}%` }}
                        />
                      </div>
                    </div>

                    {/* Quick Specs */}
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-gray-400 pt-1 border-t border-white/5">
                      <div>
                        <span>{isBn ? "পরীক্ষা সম্পন্ন:" : "Exams Done:"}</span>
                        <span className="text-white block font-bold">{enr.completedExams?.length || 0} Ex.</span>
                      </div>
                      <div>
                        <span>{isBn ? "সংরক্ষিত রিসোর্স:" : "Materials:"}</span>
                        <span className="text-white block font-bold">{course.totalMaterials} Files</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dashboard & Receipt Buttons */}
                <div className="p-5 pt-0 space-y-2">
                  <button
                    onClick={() => {
                      playSound("click");
                      onGoToCourseDashboard(course);
                    }}
                    className="w-full py-3 bg-gradient-to-r from-[#C1121F] to-red-600 hover:from-red-600 hover:to-red-500 text-white font-extrabold text-xs font-mono uppercase tracking-wider rounded-xl transition shadow-[0_0_15px_rgba(193,18,31,0.4)] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>{isBn ? "কোর্স ড্যাশবোর্ডে প্রবেশ করুন" : "OPEN COURSE DASHBOARD"}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#FFD700]" />
                  </button>

                  <button
                    onClick={() => {
                      playSound("click");
                      setSelectedReceipt({ enrollment: enr, course });
                    }}
                    className="w-full py-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-mono font-bold text-[11px] uppercase rounded-xl border border-white/10 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <FileCheck className="w-3.5 h-3.5 text-[#FFD700]" />
                    <span>{isBn ? "📄 মানি মেমো / Receipt দেখুন" : "📄 View Money Receipt"}</span>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Selected Receipt Modal */}
      {selectedReceipt && (
        <PaymentReceipt
          order={selectedReceipt.order}
          enrollment={selectedReceipt.enrollment}
          course={selectedReceipt.course}
          user={user}
          language={language}
          isModal={true}
          onClose={() => setSelectedReceipt(null)}
          onGoToDashboard={() => {
            const courseToNavigate = selectedReceipt.course;
            setSelectedReceipt(null);
            onGoToCourseDashboard(courseToNavigate);
          }}
        />
      )}
    </div>
  );
}
