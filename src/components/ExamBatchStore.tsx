import React, { useState, useEffect } from "react";
import { db, isFirestoreQuotaExceeded, setFirestoreQuotaExhausted, isQuotaExceededError } from "../firebase";
import {
  collection,
  collectionGroup,
  query,
  limit,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  where
} from "firebase/firestore";
import { UserProfile, PaymentRequest } from "../types";
import { motion, AnimatePresence } from "motion/react";
import {
  Rocket,
  Award,
  CheckCircle2,
  Clock,
  Sparkles,
  CreditCard,
  Copy,
  Smartphone,
  ShieldCheck,
  AlertCircle,
  X,
  ChevronRight,
  BookOpen,
  Target,
  Flame,
  Check,
  User,
  Zap,
  Lock,
  Unlock,
  Plus,
  FileText,
  Sliders,
  HelpCircle,
  ArrowRight,
  Gift,
  Calendar,
  Star,
  MessageSquare,
  ThumbsUp,
  Trash2,
  Edit3,
  Send,
  Trophy,
  Crown,
  Medal,
  Search,
  Users,
  BarChart2,
  Store
} from "lucide-react";
import { playSound } from "../audio";
import BatchEventCountdownTimer from "./courses/BatchEventCountdownTimer";

interface ExamBatchStoreProps {
  user: UserProfile;
  language: "bn" | "en";
  theme: "light" | "dark";
  setActiveTab: (tab: any) => void;
  onProfileUpdate?: (updated: Partial<UserProfile>) => void;
}

export default function ExamBatchStore({
  user,
  language,
  theme,
  setActiveTab,
  onProfileUpdate
}: ExamBatchStoreProps) {
  const isDark = theme === "dark";
  const isBn = language === "bn";

  // Tab State inside Exam Batch Store
  const [activeSubTab, setActiveSubTab] = useState<"all_batches" | "my_batches" | "batch_leaderboard" | "payment_tracker" | "routine_guide">("all_batches");

  // Firestore Data States
  const [liveExams, setLiveExams] = useState<any[]>([]);
  const [paymentNumbers, setPaymentNumbers] = useState<{ bkash: string; nagad: string }>({ bkash: "01700000000", nagad: "01800000000" });
  const [myPaymentRequests, setMyPaymentRequests] = useState<PaymentRequest[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);

  // Batch Leaderboard States
  const [selectedLeaderboardBatchId, setSelectedLeaderboardBatchId] = useState<string>("");
  const [allSubmissions, setAllSubmissions] = useState<any[]>([]);
  const [leaderboardSearchQ, setLeaderboardSearchQ] = useState<string>("");

  // Modal States
  const [selectedBatchDetails, setSelectedBatchDetails] = useState<any | null>(null);
  const [selectedBatchForCheckout, setSelectedBatchForCheckout] = useState<any | null>(null);

  // Reviews State
  const [batchReviews, setBatchReviews] = useState<any[]>([]);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewHoverRating, setReviewHoverRating] = useState<number>(0);
  const [reviewComment, setReviewComment] = useState<string>("");
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);

  // Checkout Form States
  const [paymentMethod, setPaymentMethod] = useState<"bKash" | "Nagad">("bKash");
  const [senderNumber, setSenderNumber] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [passcode, setPasscode] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  // Fetch Batch Reviews with limits and session caching
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem("mb_batch_reviews_cache");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setBatchReviews(parsed);
          if (isFirestoreQuotaExceeded()) return;
        }
      }
    } catch {}

    if (isFirestoreQuotaExceeded()) return;

    // Fetch from root batch_reviews collection
    const qRoot = query(collection(db, "batch_reviews"), orderBy("createdAt", "desc"), limit(25));
    getDocs(qRoot)
      .then((snapshot) => {
        const rootList: any[] = [];
        snapshot.forEach((docSnap) => {
          rootList.push({ id: docSnap.id, ...docSnap.data() });
        });
        setBatchReviews((prev) => {
          const map = new Map();
          [...prev, ...rootList].forEach((item) => {
            const key = `${item.batchId}_${item.userId}`;
            map.set(key, item);
          });
          const merged = Array.from(map.values());
          try { sessionStorage.setItem("mb_batch_reviews_cache", JSON.stringify(merged)); } catch {}
          return merged;
        });
      })
      .catch((err) => {
        if (isQuotaExceededError(err)) {
          setFirestoreQuotaExhausted();
        }
        console.warn("Could not fetch root batch reviews:", err);
      });
  }, []);

  // When selectedBatchDetails opens, prefill review form if user already reviewed
  useEffect(() => {
    if (selectedBatchDetails && user.uid) {
      const myReview = batchReviews.find(
        (r) => r.batchId === selectedBatchDetails.id && r.userId === user.uid
      );
      if (myReview) {
        setReviewRating(myReview.rating || 5);
        setReviewComment(myReview.comment || "");
      } else {
        setReviewRating(5);
        setReviewComment("");
      }
    }
  }, [selectedBatchDetails, user.uid, batchReviews]);

  // Review helper functions
  const getBatchRatingStats = (batchId: string) => {
    const reviews = batchReviews.filter((r) => r.batchId === batchId);
    const total = reviews.length;
    if (total === 0) {
      return { avg: 0, total: 0, counts: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as Record<number, number> };
    }
    const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
    const avg = (sum / total).toFixed(1);
    const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      const star = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 5)));
      counts[star] = (counts[star] || 0) + 1;
    });
    return { avg: Number(avg), total, counts };
  };

  const handleSubmitReview = async () => {
    if (!selectedBatchDetails) return;
    if (!reviewComment.trim()) {
      showToast(isBn ? "অনুগ্রহ করে আপনার রেটিং অভিজ্ঞতা বা মন্তব্য লিখুন!" : "Please write your review feedback!", "error");
      return;
    }
    setIsSubmittingReview(true);
    try {
      const reviewPayload = {
        batchId: selectedBatchDetails.id,
        userId: user.uid,
        userName: user.displayName || (isBn ? "মেডিকেল পরীক্ষার্থী" : "Medical Aspirant"),
        userAvatar: user.avatarUrl || "",
        rating: reviewRating,
        comment: reviewComment.trim(),
        createdAt: new Date().toISOString()
      };

      // 1. Store in sub-collection: live_exams/{batchId}/reviews/{userId}
      const subColRef = doc(db, "live_exams", selectedBatchDetails.id, "reviews", user.uid);
      await setDoc(subColRef, reviewPayload);

      // 2. Also store in root collection: batch_reviews/{batchId_userId}
      const rootColRef = doc(db, "batch_reviews", `${selectedBatchDetails.id}_${user.uid}`);
      await setDoc(rootColRef, reviewPayload);

      showToast(isBn ? "⭐ আপনার রিভিউ সফলভাবে প্রকাশিত হয়েছে!" : "⭐ Review submitted successfully!", "success");
    } catch (err: any) {
      showToast("Failed to submit review: " + err.message, "error");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleDeleteReview = async (review: any) => {
    try {
      const batchId = review.batchId || selectedBatchDetails?.id;
      const reviewId = review.userId || review.id;

      // Delete from subcollection
      if (batchId && review.userId) {
        await deleteDoc(doc(db, "live_exams", batchId, "reviews", review.userId)).catch(() => {});
      }
      // Delete from root collection
      if (review.id) {
        await deleteDoc(doc(db, "batch_reviews", review.id)).catch(() => {});
      }
      if (batchId && review.userId) {
        await deleteDoc(doc(db, "batch_reviews", `${batchId}_${review.userId}`)).catch(() => {});
      }

      showToast(isBn ? "রিভিউ মুছে ফেলা হয়েছে" : "Review removed", "info");
    } catch (err: any) {
      showToast("Failed to delete review: " + err.message, "error");
    }
  };

  // Load Live Exams with session caching
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem("mb_store_live_exams_cache");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLiveExams(parsed);
          setLoadingExams(false);
          if (isFirestoreQuotaExceeded()) return;
        }
      }
    } catch {}

    if (isFirestoreQuotaExceeded()) {
      setLoadingExams(false);
      return;
    }

    const q = query(collection(db, "live_exams"), orderBy("createdAt", "desc"), limit(20));
    getDocs(q)
      .then((snapshot) => {
        const list: any[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        setLiveExams(list);
        try { sessionStorage.setItem("mb_store_live_exams_cache", JSON.stringify(list)); } catch {}
      })
      .catch((err) => {
        if (isQuotaExceededError(err)) {
          setFirestoreQuotaExhausted();
        }
        console.warn("Could not fetch live exams in batch store:", err);
      })
      .finally(() => {
        setLoadingExams(false);
      });
  }, []);

  // Set default selected batch for leaderboard when liveExams load
  useEffect(() => {
    if (liveExams.length > 0 && !selectedLeaderboardBatchId) {
      setSelectedLeaderboardBatchId(liveExams[0].id);
    }
  }, [liveExams, selectedLeaderboardBatchId]);

  // Load Live Exam Submissions for Leaderboard (limit 50 with cache)
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem("mb_store_submissions_cache");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAllSubmissions(parsed);
          if (isFirestoreQuotaExceeded()) return;
        }
      }
    } catch {}

    if (isFirestoreQuotaExceeded()) return;

    const q = query(collection(db, "live_exam_submissions"), limit(50));
    getDocs(q)
      .then((snapshot) => {
        const list: any[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        setAllSubmissions(list);
        try { sessionStorage.setItem("mb_store_submissions_cache", JSON.stringify(list)); } catch {}
      })
      .catch((err) => {
        if (isQuotaExceededError(err)) {
          setFirestoreQuotaExhausted();
        }
        console.warn("Could not fetch live_exam_submissions:", err);
      });
  }, []);

  // Load Payment Numbers once
  useEffect(() => {
    getDoc(doc(db, "settings", "payment"))
      .then((docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setPaymentNumbers({
            bkash: data.bkashNumber || "01700000000",
            nagad: data.nagadNumber || "01800000000"
          });
        }
      })
      .catch((err) => {
        console.warn("Could not fetch payment settings:", err);
      });
  }, []);

  // Stream User Payment Requests
  useEffect(() => {
    if (!user.uid) return;
    const q = query(collection(db, "payment_requests"), where("userId", "==", user.uid), limit(20));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: PaymentRequest[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as PaymentRequest);
        });
        list.sort((a, b) => new Date(b.submissionDate || 0).getTime() - new Date(a.submissionDate || 0).getTime());
        setMyPaymentRequests(list);
      },
      (err) => {
        console.warn("Could not fetch payment requests:", err);
      }
    );
    return () => unsub();
  }, [user.uid]);

  const showToast = (text: string, type: "success" | "error" | "info" = "info") => {
    setToastMessage({ text, type });
    if (type === "success") playSound("levelup");
    else if (type === "error") playSound("wrong");
    else playSound("click");
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleCopy = (num: string, type: string) => {
    navigator.clipboard.writeText(num);
    setCopiedType(type);
    playSound("click");
    showToast(isBn ? "নম্বরটি কপি করা হয়েছে!" : "Number copied to clipboard!", "success");
    setTimeout(() => setCopiedType(null), 2500);
  };

  // Check if user is enrolled in batch
  const isUserEnrolled = (batchId: string) => {
    if (user.role === "admin" || user.role === "superadmin") return true;
    if (user.isPremium) return true;
    if (user.enrolledBatches && user.enrolledBatches.includes(batchId)) return true;
    // Check approved payment request
    const approvedReq = myPaymentRequests.find(
      (r) => r.batchId === batchId && r.status === "Approved"
    );
    return !!approvedReq;
  };

  // Instant Passcode Activation
  const handlePasscodeUnlock = async () => {
    if (!selectedBatchForCheckout) return;
    if (!passcode.trim()) {
      showToast(isBn ? "অনুগ্রহ করে অ্যাক্টিভেশন পাসকোড লিখুন!" : "Enter passcode first!", "error");
      return;
    }

    const batchPasscode = selectedBatchForCheckout.passcode || "";
    const isGlobalMatch = passcode.trim().toUpperCase() === "MEDICO2026" || passcode.trim().toUpperCase() === "PAID2026";
    const isBatchMatch = batchPasscode && passcode.trim().toLowerCase() === batchPasscode.toLowerCase();

    if (isGlobalMatch || isBatchMatch) {
      setIsSubmitting(true);
      try {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          enrolledBatches: arrayUnion(selectedBatchForCheckout.id)
        });

        if (onProfileUpdate) {
          const currentEnrolled = user.enrolledBatches || [];
          onProfileUpdate({ enrolledBatches: [...currentEnrolled, selectedBatchForCheckout.id] });
        }

        showToast(
          isBn ? "🎉 অভিনন্দন! পাসকোড সঠিক। এক্সাম ব্যাচ আনলক হয়েছে!" : "🎉 Success! Exam batch unlocked via passcode!",
          "success"
        );
        setSelectedBatchForCheckout(null);
        setPasscode("");
      } catch (err: any) {
        console.error("Passcode unlock failed:", err);
        showToast(isBn ? "পাসকোড প্রয়োগে সমস্যা হয়েছে!" : "Failed to apply passcode!", "error");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      showToast(isBn ? "ভুল পাসকোড! অনুগ্রহ করে আপনার ব্যাচ পাসের কোডটি পরীক্ষা করুন।" : "Invalid passcode! Check code and try again.", "error");
    }
  };

  // Payment Request Submission
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchForCheckout) return;

    if (!senderNumber.trim() || senderNumber.length < 11) {
      showToast(isBn ? "সঠিক ১১ ডিজিটের ফোন নম্বর দিন!" : "Provide a valid 11-digit sender number!", "error");
      return;
    }

    if (!transactionId.trim() || transactionId.length < 6) {
      showToast(isBn ? "সঠিক ট্রানজ্যাকশন আইডি (TrxID) দিন!" : "Provide a valid Transaction ID (TrxID)!", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const batchPrice = selectedBatchForCheckout.price || 499;
      const cleanTx = transactionId.trim().toUpperCase();

      const payload: PaymentRequest = {
        id: `${cleanTx}_${user.uid}`,
        userId: user.uid,
        userName: user.displayName || "Aspirant Student",
        userEmail: user.email || "",
        selectedPlan: `Exam Batch: ${selectedBatchForCheckout.title}`,
        paymentMethod: paymentMethod,
        senderNumber: senderNumber.trim(),
        transactionId: cleanTx,
        amount: batchPrice,
        screenshotUrl: screenshotUrl.trim() || undefined,
        submissionDate: new Date().toISOString(),
        status: "Pending",
        batchId: selectedBatchForCheckout.id,
        batchTitle: selectedBatchForCheckout.title
      };

      await setDoc(doc(db, "payment_requests", payload.id), payload);

      showToast(
        isBn
          ? "✅ আপনার পেমেন্ট তথ্য সফলভাবে পাঠানো হয়েছে! ৫-১৫ মিনিটের মধ্যে অ্যাডমিন যাচাই করে ব্যাচ চালু করে দেবে।"
          : "✅ Payment details submitted! Admin will verify and activate your batch shortly.",
        "success"
      );

      setSelectedBatchForCheckout(null);
      setSenderNumber("");
      setTransactionId("");
      setScreenshotUrl("");
      setActiveSubTab("payment_tracker");
    } catch (err: any) {
      console.error("Payment submission failed:", err);
      showToast(isBn ? "পেমেন্ট রিকোয়েস্ট জমা দেওয়া যায়নি: " + err.message : "Payment submission failed: " + err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen p-4 md:p-8 ${isDark ? "bg-[#0A0A0A] text-white" : "bg-slate-50 text-slate-900"} transition-colors duration-300`}>
      {/* Toast Notification Floating Banner */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-2xl border flex items-center gap-3 font-mono text-xs max-w-md ${
              toastMessage.type === "success"
                ? "bg-emerald-950 border-emerald-500/50 text-emerald-200"
                : toastMessage.type === "error"
                ? "bg-red-950 border-red-500/50 text-red-200"
                : "bg-blue-950 border-blue-500/50 text-blue-200"
            }`}
          >
            <Sparkles className="w-5 h-5 shrink-0 animate-spin" />
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto flex flex-col gap-8">
        {/* TOP HERO HEADLINE & STORE BANNER */}
        <div className="bg-gradient-to-r from-red-950 via-neutral-900 to-red-900 p-6 md:p-8 rounded-3xl border border-red-800/40 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="bg-[#C1121F] text-white font-mono text-[10px] uppercase font-extrabold px-3 py-1 rounded-full border border-white/20 tracking-wider flex items-center gap-1">
                  <Rocket className="w-3.5 h-3.5 animate-bounce" /> OFFICIAL EXAM BATCH STORE
                </span>
                <span className="bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-500/30">
                  ● INSTANT VERIFICATION
                </span>
              </div>
              <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tight font-display text-white mt-1">
                {isBn ? "মেডিকেল ও ভার্সিটি এক্সাম ব্যাচ সেল & পেমেন্ট পোর্টাল" : "Medical & Varsity Exam Batch Sell & Payment Portal"}
              </h1>
              <p className="text-xs md:text-sm text-gray-300 max-w-2xl leading-relaxed">
                {isBn
                  ? "আপনার কাঙ্ক্ষিত এক্সাম ব্যাচে এনরোল করে লাইভ মডেল টেস্টে অংশ নিন, রিয়েল-টাইম লিডারবোর্ডে র‍্যাঙ্ক দেখুন এবং অধ্যায়ভিত্তিক পারফরম্যান্স অ্যানালাইসিস আনলক করুন।"
                  : "Enroll in your targeted exam batch, join real-time competitive live model tests, climb subjectwise leaderboards, and excel with full solution sets."}
              </p>
            </div>

            {/* Banner Quick Stats Box */}
            <div className="flex items-center gap-4 bg-black/60 p-4 rounded-2xl border border-white/10 shrink-0">
              <div className="text-center px-3 border-r border-gray-800">
                <span className="text-[10px] text-gray-400 font-mono uppercase block">{isBn ? "মোট ব্যাচ" : "Total Batches"}</span>
                <span className="text-2xl font-black text-white font-mono">{liveExams.length}</span>
              </div>
              <div className="text-center px-3 border-r border-gray-800">
                <span className="text-[10px] text-gray-400 font-mono uppercase block">{isBn ? "আমার এনরোলড" : "Enrolled"}</span>
                <span className="text-2xl font-black text-emerald-400 font-mono">
                  {user.enrolledBatches ? user.enrolledBatches.length : (user.isPremium ? liveExams.length : 0)}
                </span>
              </div>
              <div className="text-center px-3">
                <span className="text-[10px] text-gray-400 font-mono uppercase block">{isBn ? "পেমেন্ট নম্বর" : "Payment Gateway"}</span>
                <span className="text-xs font-mono font-bold text-[#FFD700] block mt-1">bKash / Nagad</span>
              </div>
            </div>
          </div>
        </div>

        {/* SUB-TAB NAVIGATION TOOLBAR */}
        <div className="flex items-center gap-2 border-b border-gray-800 pb-3 overflow-x-auto scrollbar-none font-mono text-xs font-bold uppercase">
          {[
            { id: "all_batches", label: isBn ? "🛒 সকল এক্সাম ব্যাচসমূহ" : "🛒 All Exam Batches", icon: Store },
            { id: "my_batches", label: isBn ? "🎓 আমার এনরোল করা ব্যাচ" : "🎓 My Enrolled Batches", icon: Award },
            { id: "batch_leaderboard", label: isBn ? "🏆 ব্যাচ লিডারবোর্ড" : "🏆 Batch Leaderboard", icon: Trophy },
            { id: "payment_tracker", label: isBn ? "💳 পেমেন্ট ট্র্যাকার" : "💳 Payment Tracker", icon: CreditCard },
            { id: "routine_guide", label: isBn ? "📜 রুটিন ও এক্সাম গাইডলাইন" : "📜 Routine & Guide", icon: FileText }
          ].map((tab) => {
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  playSound("click");
                  setActiveSubTab(tab.id as any);
                }}
                className={`px-4 py-2.5 rounded-xl transition duration-200 flex items-center gap-2 whitespace-nowrap ${
                  isActive
                    ? "bg-[#C1121F] text-white font-black shadow-lg border border-white/20"
                    : isDark
                    ? "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: ALL EXAM BATCHES STORE & CARDS */}
        {activeSubTab === "all_batches" && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black uppercase text-white font-display flex items-center gap-2">
                  <Flame className="w-5 h-5 text-[#FFD700]" />
                  {isBn ? "সচল ও নতুন এক্সাম ব্যাচসমূহ" : "Active & Upcoming Exam Batches"}
                </h3>
                <p className="text-xs text-gray-400">
                  {isBn ? "মেডিকেল ভর্তি পরীক্ষা ২০২৬ ও ভার্সিটি ক কভার করে প্রস্তুতকৃত মডেল টেস্ট ব্যাচসমূহ।" : "Targeted model test batches designed for Medical Admission & Varsity Entrance."}
                </p>
              </div>
            </div>

            {loadingExams ? (
              <div className="text-center py-20 font-mono text-xs text-gray-500 animate-pulse">
                Loading available exam batches from MediBridge server...
              </div>
            ) : liveExams.length === 0 ? (
              <div className="bg-[#151515] p-12 rounded-2xl border border-white/10 text-center flex flex-col items-center gap-3">
                <Rocket className="w-12 h-12 text-gray-600" />
                <h4 className="font-bold text-base text-white">{isBn ? "কোনো এক্সাম ব্যাচ পাওয়া যায়নি" : "No Exam Batches Active Currently"}</h4>
                <p className="text-xs text-gray-400 max-w-md">
                  {isBn ? "এডমিন থেকে শীঘ্রই নতুন এক্সাম ব্যাচ লঞ্চ করা হবে। আপডেট দেখতে সঙ্গে থাকুন!" : "Superadmin will launch new exam batches shortly. Check back soon!"}
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {liveExams.map((batch) => {
                  const enrolled = isUserEnrolled(batch.id);
                  const price = batch.price || 499;
                  const originalPrice = batch.originalPrice || 999;

                  return (
                    <div
                      key={batch.id}
                      className={`bg-[#151515] rounded-3xl border transition-all duration-300 hover:border-red-600/50 flex flex-col justify-between overflow-hidden relative shadow-xl group ${
                        enrolled ? "border-emerald-500/40" : "border-white/10"
                      }`}
                    >
                      {/* Course Cover Photo Banner (Clean, no text overlay) */}
                      <div className="w-full h-40 relative overflow-hidden bg-black">
                        <img
                          src={batch.coverImage || "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80"}
                          alt={batch.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80";
                          }}
                        />
                      </div>

                      {/* Card Body */}
                      <div className="p-6 pt-4 flex flex-col gap-3 flex-1 justify-between">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="bg-red-950/90 text-red-400 border border-red-900/60 text-[10px] font-mono font-bold px-2.5 py-1 rounded-full uppercase">
                              {batch.targetGroup || "Medical Admission Batch"}
                            </span>
                            <span
                              className={`text-[9px] font-mono font-bold px-2.5 py-1 rounded-full uppercase ${
                                batch.isActive ? "bg-emerald-950/90 text-emerald-400 border border-emerald-500/40" : "bg-gray-900/90 text-gray-400 border border-gray-700"
                              }`}
                            >
                              {batch.isActive ? "● LIVE ACTIVE" : "PAUSED"}
                            </span>
                          </div>

                          <h4 className="text-lg font-black text-white line-clamp-2 leading-snug">{batch.title}</h4>

                          {/* Student Rating & Review Badge */}
                          {(() => {
                            const { avg, total } = getBatchRatingStats(batch.id);
                            return (
                              <div className="flex items-center gap-1.5 text-xs font-mono my-0.5">
                                <div className="flex items-center gap-1 bg-amber-950/50 border border-amber-500/30 px-2 py-0.5 rounded-md text-amber-400 font-bold">
                                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                  <span>{total > 0 ? avg : (isBn ? "নতুন" : "New")}</span>
                                </div>
                                <span className="text-gray-400 text-[11px]">
                                  {total > 0 ? `(${total} ${isBn ? "রিভিউ" : total === 1 ? "review" : "reviews"})` : (isBn ? "(এখনও রিভিউ নেই)" : "(No reviews yet)")}
                                </span>
                              </div>
                            );
                          })()}

                          {batch.description && (
                            <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{batch.description}</p>
                          )}

                          {batch.startDate && (
                            <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-500/20 px-2.5 py-1 rounded-lg w-fit mt-1">
                              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{isBn ? "পরীক্ষা শুরু:" : "Batch Starts:"} {batch.startDate}</span>
                            </div>
                          )}

                          {/* Dynamic Next Batch Event / Test Countdown Timer */}
                          <BatchEventCountdownTimer
                            batch={batch}
                            language={language}
                            variant="card-hud"
                            className="mt-2"
                          />
                        </div>

                        {/* Specs Badges Row */}
                        <div className="grid grid-cols-3 gap-2 bg-black/50 p-2.5 rounded-xl border border-gray-850 text-center font-mono text-[10px]">
                          <div>
                            <span className="text-gray-500 block uppercase">{isBn ? "বিষয়" : "Subject"}</span>
                            <span className="text-emerald-400 font-bold">{batch.subject}</span>
                          </div>
                          <div className="border-x border-gray-800">
                            <span className="text-gray-500 block uppercase">{isBn ? "প্রশ্ন সংখ্যা" : "Questions"}</span>
                            <span className="text-[#FFD700] font-bold">{batch.totalQuestions} MCQs</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block uppercase">{isBn ? "সময়" : "Duration"}</span>
                            <span className="text-white font-bold">{batch.duration} Mins</span>
                          </div>
                        </div>

                        {/* Included Features Checklist */}
                        <div className="flex flex-col gap-2 mt-1">
                          <div className="text-[11px] font-mono font-bold text-gray-400 uppercase">{isBn ? "ব্যাচের বৈশিষ্ট্যসমূহ:" : "Batch Features:"}</div>
                          <ul className="text-xs text-gray-300 flex flex-col gap-1.5">
                            <li className="flex items-center gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span>{isBn ? "রিয়েল-টাইম কমপিটিটিভ লিডারবোর্ড" : "Real-time competitive leaderboard"}</span>
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span>{isBn ? `নেগেটিভ মার্কিং (${batch.negMarking || 0.25}) সহ টাইমার` : `Negative marking (${batch.negMarking || 0.25}) with timer`}</span>
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span>{isBn ? "সঠিক উত্তর ও প্রশ্ন ব্যাখ্যা বিশ্লেষণ" : "Detailed explanation & solution keys"}</span>
                            </li>
                          </ul>
                        </div>
                      </div>

                      {/* Pricing & Footer Actions */}
                      <div className="p-6 pt-0 flex flex-col gap-3">
                        <div className="border-t border-gray-850 pt-4 flex items-center justify-between">
                          <div>
                            <div className="text-[10px] text-gray-500 font-mono uppercase">{isBn ? "এককালীন ফি" : "One-time Fee"}</div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-black text-[#FFD700] font-mono">৳{price}</span>
                              <span className="text-xs text-gray-500 line-through font-mono">৳{originalPrice}</span>
                              <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono font-bold">
                                50% OFF
                              </span>
                            </div>
                          </div>

                          {enrolled && (
                            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-mono font-bold px-3 py-1.5 rounded-xl flex items-center gap-1">
                              <Check className="w-4 h-4" /> {isBn ? "এনরোল করা আছে" : "ENROLLED"}
                            </span>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => {
                              playSound("click");
                              setSelectedBatchDetails(batch);
                            }}
                            className="py-2.5 px-3 bg-black/60 hover:bg-black border border-gray-800 text-gray-300 hover:text-white font-mono text-xs font-bold rounded-xl transition flex items-center justify-center gap-1"
                          >
                            <FileText className="w-3.5 h-3.5 text-[#FFD700]" /> {isBn ? "ডিটেইলস ও রুটিন" : "Details"}
                          </button>

                          {enrolled ? (
                            <button
                              onClick={() => {
                                playSound("click");
                                setActiveTab("practice");
                              }}
                              className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-black rounded-xl transition shadow-lg flex items-center justify-center gap-1"
                            >
                              <Zap className="w-3.5 h-3.5" /> {isBn ? "পরীক্ষা দিন" : "Enter Arena"}
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                playSound("click");
                                setSelectedBatchForCheckout(batch);
                              }}
                              className="py-2.5 px-3 bg-[#C1121F] hover:bg-red-700 text-white font-mono text-xs font-black uppercase tracking-wider rounded-xl transition shadow-lg flex items-center justify-center gap-1"
                            >
                              <CreditCard className="w-3.5 h-3.5" /> {isBn ? "এনরোল করুন ৳" : "Enroll Now"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MY ENROLLED BATCHES */}
        {activeSubTab === "my_batches" && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black uppercase text-white font-display flex items-center gap-2">
                  <Award className="w-5 h-5 text-emerald-400" />
                  {isBn ? "আমার সাবস্ক্রাইব করা এক্সাম ব্যাচসমূহ" : "My Active Enrolled Batches"}
                </h3>
                <p className="text-xs text-gray-400">
                  {isBn ? "যে সকল ব্যাচে আপনি পেমেন্ট বা পাসকোডের মাধ্যমে যুক্ত হয়েছেন।" : "Exam batches you have successfully enrolled in or unlocked."}
                </p>
              </div>
            </div>

            {liveExams.filter((b) => isUserEnrolled(b.id)).length === 0 ? (
              <div className="bg-[#151515] p-12 rounded-2xl border border-white/10 text-center flex flex-col items-center gap-4">
                <Lock className="w-12 h-12 text-yellow-500/70" />
                <h4 className="font-bold text-base text-white">{isBn ? "আপনি কোনো এক্সাম ব্যাচে যুক্ত নন" : "No Active Enrolled Batches Yet"}</h4>
                <p className="text-xs text-gray-400 max-w-md">
                  {isBn
                    ? "এক্সাম ব্যাচে এনরোল করতে স্টোর থেকে আপনার পছন্দের ব্যাচ নির্বাচন করে বিকাশ বা নগদের মাধ্যমে পেমেন্ট কমপ্লিট করুন।"
                    : "Browse our active batches store and complete payment to unlock full access."}
                </p>
                <button
                  onClick={() => setActiveSubTab("all_batches")}
                  className="px-6 py-2.5 bg-[#C1121F] text-white font-mono text-xs uppercase font-bold rounded-xl transition shadow-lg"
                >
                  {isBn ? "ব্রাউজ এক্সাম ব্যাচ স্টোর" : "Browse Exam Batches"}
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {liveExams
                  .filter((b) => isUserEnrolled(b.id))
                  .map((batch) => (
                    <div
                      key={batch.id}
                      className="bg-[#151515] p-6 rounded-3xl border border-emerald-500/40 flex flex-col justify-between shadow-xl relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 bg-emerald-500 text-black font-mono font-black text-[9px] px-3 py-1 rounded-bl-xl uppercase">
                        ENROLLED ACTIVE
                      </div>

                      <div className="flex flex-col gap-3">
                        <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold">{batch.targetGroup || "Medical Batch"}</span>
                        <h4 className="text-lg font-black text-white leading-snug">{batch.title}</h4>

                        <div className="bg-black/60 p-3 rounded-xl border border-gray-800 font-mono text-xs text-gray-300 flex flex-col gap-1">
                          <div>
                            <span className="text-gray-500">{isBn ? "বিষয়:" : "Subject:"}</span> {batch.subject}
                          </div>
                          <div>
                            <span className="text-gray-500">{isBn ? "প্রশ্ন পরিমাপ:" : "Scope:"}</span> {batch.totalQuestions} MCQs • {batch.duration} Mins
                          </div>
                        </div>

                        {/* Live Countdown Timer */}
                        <BatchEventCountdownTimer
                          batch={batch}
                          language={language}
                          variant="card-hud"
                          className="mt-1"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-4">
                        <button
                          onClick={() => {
                            playSound("click");
                            setActiveTab("practice");
                          }}
                          className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-black uppercase tracking-wider rounded-xl transition shadow-lg flex items-center justify-center gap-1.5"
                        >
                          <Zap className="w-3.5 h-3.5" /> {isBn ? "পরীক্ষা দিন" : "Exam Arena"}
                        </button>
                        <button
                          onClick={() => {
                            playSound("click");
                            setSelectedLeaderboardBatchId(batch.id);
                            setActiveSubTab("batch_leaderboard");
                          }}
                          className="py-2.5 px-3 bg-amber-950/80 hover:bg-amber-900 border border-amber-500/40 text-amber-300 font-mono text-xs font-black uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5"
                        >
                          <Trophy className="w-3.5 h-3.5 text-amber-400" /> {isBn ? "লিডারবোর্ড" : "Leaderboard"}
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: BATCH LEADERBOARD */}
        {activeSubTab === "batch_leaderboard" && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-4">
              <div>
                <h3 className="text-xl font-black uppercase text-white font-display flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-[#FFD700] animate-bounce" />
                  {isBn ? "ব্যাচভিত্তিক কমপিটিটিভ লিডারবোর্ড" : "Batch Competitive Leaderboard"}
                </h3>
                <p className="text-xs text-gray-400">
                  {isBn
                    ? "আপনার ব্যাচের শীর্ষ মেধাবী শিক্ষার্থীদের স্থান, প্রাপ্ত নম্বর এবং রিয়েল-টাইম র্যাঙ্ক ট্র্যাক করুন।"
                    : "Track top performers, scores, speed, and real-time standings across targeted exam batches."}
                </p>
              </div>

              {/* Batch Selector Dropdown */}
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
                <span className="text-xs font-mono text-gray-400 uppercase whitespace-nowrap">{isBn ? "ব্যাচ সিলেক্ট করুন:" : "Select Batch:"}</span>
                <select
                  value={selectedLeaderboardBatchId}
                  onChange={(e) => setSelectedLeaderboardBatchId(e.target.value)}
                  className="bg-black border border-gray-800 text-amber-400 font-mono text-xs font-bold rounded-xl px-3.5 py-2 focus:outline-none focus:border-[#C1121F]"
                >
                  {liveExams.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} ({b.subject || "Medical"})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* If no exam selected */}
            {!selectedLeaderboardBatchId ? (
              <div className="text-center py-12 bg-[#151515] rounded-2xl border border-gray-800 text-gray-400 font-mono text-xs">
                {isBn ? "লিডারবোর্ড দেখতে কোনো একটি এক্সাম ব্যাচ সিলেক্ট করুন।" : "Select an exam batch to view its real-time leaderboard."}
              </div>
            ) : (() => {
              const currentBatch = liveExams.find((b) => b.id === selectedLeaderboardBatchId);
              // Filter submissions for this batch
              const submissions = allSubmissions
                .filter((s) => s.examId === selectedLeaderboardBatchId)
                .sort((a, b) => {
                  if (b.score !== a.score) return b.score - a.score;
                  return (a.timeTaken || 99999) - (b.timeTaken || 99999);
                });

              // Search Filter
              const filteredSubmissions = submissions.filter((s) =>
                leaderboardSearchQ
                  ? (s.displayName || "").toLowerCase().includes(leaderboardSearchQ.toLowerCase())
                  : true
              );

              // Find User Rank
              const mySubIndex = submissions.findIndex((s) => s.userId === user.uid);
              const mySub = mySubIndex >= 0 ? submissions[mySubIndex] : null;
              const myRank = mySubIndex >= 0 ? mySubIndex + 1 : null;

              // Batch Stats
              const totalSubmissions = submissions.length;
              const topScore = submissions.length > 0 ? submissions[0].score : 0;
              const avgScore = totalSubmissions > 0
                ? (submissions.reduce((acc, curr) => acc + (curr.score || 0), 0) / totalSubmissions).toFixed(1)
                : 0;

              return (
                <div className="flex flex-col gap-6">
                  {/* Batch Title Banner & Quick Stats */}
                  <div className="bg-gradient-to-r from-amber-950/40 via-black to-red-950/30 p-5 rounded-2xl border border-amber-500/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xl">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-amber-400 uppercase bg-amber-950/80 px-2.5 py-1 rounded-full border border-amber-500/30">
                        {currentBatch?.targetGroup || "Medical Batch"}
                      </span>
                      <h4 className="text-xl font-black text-white mt-1.5">{currentBatch?.title || "Exam Batch"}</h4>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">
                        {currentBatch?.subject} • {currentBatch?.totalQuestions || 100} MCQs • {currentBatch?.duration || 60} Mins
                      </p>
                    </div>

                    {/* Stats Metric Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-black/70 p-3 rounded-xl border border-gray-800 text-center">
                        <span className="text-[10px] font-mono text-gray-500 uppercase block">{isBn ? "মোট পরীক্ষার্থী" : "Participants"}</span>
                        <span className="text-lg font-black text-white font-mono flex items-center justify-center gap-1">
                          <Users className="w-4 h-4 text-emerald-400" /> {totalSubmissions}
                        </span>
                      </div>
                      <div className="bg-black/70 p-3 rounded-xl border border-gray-800 text-center">
                        <span className="text-[10px] font-mono text-gray-500 uppercase block">{isBn ? "সর্বোচ্চ মার্কস" : "Highest Score"}</span>
                        <span className="text-lg font-black text-amber-400 font-mono flex items-center justify-center gap-1">
                          <Crown className="w-4 h-4 text-amber-400" /> {topScore}
                        </span>
                      </div>
                      <div className="bg-black/70 p-3 rounded-xl border border-gray-800 text-center">
                        <span className="text-[10px] font-mono text-gray-500 uppercase block">{isBn ? "গড় নম্বর" : "Average Score"}</span>
                        <span className="text-lg font-black text-blue-400 font-mono flex items-center justify-center gap-1">
                          <BarChart2 className="w-4 h-4 text-blue-400" /> {avgScore}
                        </span>
                      </div>
                      <div className="bg-black/70 p-3 rounded-xl border border-gray-800 text-center">
                        <span className="text-[10px] font-mono text-gray-500 uppercase block">{isBn ? "আপনার র‍্যাঙ্ক" : "Your Rank"}</span>
                        <span className="text-lg font-black text-emerald-400 font-mono flex items-center justify-center gap-1">
                          <Target className="w-4 h-4 text-emerald-400" /> {myRank ? `#${myRank}` : (isBn ? "অংশ নেওয়া হয়নি" : "N/A")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* USER PERSONAL RANK HIGHLIGHT CARD (IF PARTICIPATED) */}
                  {mySub && (
                    <div className="bg-gradient-to-r from-emerald-950/60 to-black p-4 rounded-xl border border-emerald-500/50 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500 text-black font-black font-mono text-sm flex items-center justify-center shrink-0">
                          #{myRank}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white">{isBn ? "আপনার বর্তমান লিডারবোর্ড স্থান" : "Your Current Leaderboard Standing"}</span>
                            <span className="text-[10px] bg-emerald-500 text-black font-black px-2 py-0.5 rounded font-mono">YOU</span>
                          </div>
                          <span className="text-xs text-gray-300 font-mono">
                            {isBn ? "প্রাপ্ত নম্বর:" : "Score:"} <strong className="text-emerald-400">{mySub.score}</strong> / {mySub.totalQuestions || 100} • {isBn ? "সময় লেগেছে:" : "Time:"} {Math.floor((mySub.timeTaken || 0) / 60)}m {(mySub.timeTaken || 0) % 60}s
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => setActiveTab("practice")}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold rounded-xl transition flex items-center gap-1.5 shrink-0"
                      >
                        <Zap className="w-3.5 h-3.5" /> {isBn ? "পুনরায় পরীক্ষা দিন" : "Retake Test"}
                      </button>
                    </div>
                  )}

                  {/* PODIUM TOP 3 SHOWCASE */}
                  {submissions.length >= 3 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-2">
                      {/* 2ND PLACE */}
                      <div className="bg-gradient-to-b from-gray-900 to-black p-5 rounded-2xl border border-gray-700 flex flex-col items-center text-center order-2 md:order-1 relative overflow-hidden">
                        <div className="absolute top-2 left-2 bg-gray-400 text-black font-black font-mono text-[10px] px-2 py-0.5 rounded">#2 SILVER</div>
                        <div className="w-14 h-14 rounded-full bg-gray-800 border-2 border-gray-400 flex items-center justify-center my-2 relative overflow-hidden">
                          {submissions[1].avatarUrl ? (
                            <img src={submissions[1].avatarUrl} alt={submissions[1].displayName} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-8 h-8 text-gray-400" />
                          )}
                        </div>
                        <h5 className="font-bold text-sm text-white line-clamp-1">{submissions[1].displayName}</h5>
                        <div className="flex items-center gap-1.5 mt-2">
                          <span className="text-lg font-black text-gray-300 font-mono">{submissions[1].score}</span>
                          <span className="text-xs text-gray-500 font-mono">/{submissions[1].totalQuestions || 100}</span>
                        </div>
                        <span className="text-[10px] font-mono text-gray-400 mt-1">
                          ⏱ {Math.floor((submissions[1].timeTaken || 0) / 60)}m {(submissions[1].timeTaken || 0) % 60}s
                        </span>
                      </div>

                      {/* 1ST PLACE GOLD CHAMPION */}
                      <div className="bg-gradient-to-b from-amber-950/80 via-black to-yellow-950/40 p-6 rounded-2xl border-2 border-amber-400/80 flex flex-col items-center text-center order-1 md:order-2 shadow-2xl relative overflow-hidden transform md:-translate-y-2">
                        <div className="absolute top-0 right-0 bg-amber-400 text-black font-black font-mono text-[10px] px-3 py-1 rounded-bl-xl uppercase tracking-wider flex items-center gap-1">
                          <Crown className="w-3.5 h-3.5 fill-black" /> CHAMPION
                        </div>
                        <div className="w-18 h-18 rounded-full bg-amber-500/20 border-4 border-amber-400 flex items-center justify-center my-2 shadow-xl relative overflow-hidden">
                          {submissions[0].avatarUrl ? (
                            <img src={submissions[0].avatarUrl} alt={submissions[0].displayName} className="w-full h-full object-cover" />
                          ) : (
                            <Crown className="w-10 h-10 text-amber-400" />
                          )}
                        </div>
                        <h5 className="font-black text-base text-white line-clamp-1">{submissions[0].displayName}</h5>
                        <div className="flex items-center gap-1.5 mt-2">
                          <span className="text-2xl font-black text-amber-400 font-mono">{submissions[0].score}</span>
                          <span className="text-xs text-gray-400 font-mono">/{submissions[0].totalQuestions || 100}</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-amber-300/80 mt-1 bg-amber-950/80 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                          ⏱ {Math.floor((submissions[0].timeTaken || 0) / 60)}m {(submissions[0].timeTaken || 0) % 60}s
                        </span>
                      </div>

                      {/* 3RD PLACE */}
                      <div className="bg-gradient-to-b from-amber-950/30 to-black p-5 rounded-2xl border border-amber-800/40 flex flex-col items-center text-center order-3 relative overflow-hidden">
                        <div className="absolute top-2 left-2 bg-amber-700 text-white font-black font-mono text-[10px] px-2 py-0.5 rounded">#3 BRONZE</div>
                        <div className="w-14 h-14 rounded-full bg-amber-950 border-2 border-amber-700 flex items-center justify-center my-2 relative overflow-hidden">
                          {submissions[2].avatarUrl ? (
                            <img src={submissions[2].avatarUrl} alt={submissions[2].displayName} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-8 h-8 text-amber-600" />
                          )}
                        </div>
                        <h5 className="font-bold text-sm text-white line-clamp-1">{submissions[2].displayName}</h5>
                        <div className="flex items-center gap-1.5 mt-2">
                          <span className="text-lg font-black text-amber-500 font-mono">{submissions[2].score}</span>
                          <span className="text-xs text-gray-500 font-mono">/{submissions[2].totalQuestions || 100}</span>
                        </div>
                        <span className="text-[10px] font-mono text-gray-400 mt-1">
                          ⏱ {Math.floor((submissions[2].timeTaken || 0) / 60)}m {(submissions[2].timeTaken || 0) % 60}s
                        </span>
                      </div>
                    </div>
                  )}

                  {/* SEARCH & LEADERBOARD TABLE */}
                  <div className="bg-[#151515] p-5 rounded-2xl border border-gray-800 flex flex-col gap-4 shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-3">
                      <h4 className="font-black text-sm uppercase text-white font-mono flex items-center gap-2">
                        <Flame className="w-4 h-4 text-amber-500" />
                        {isBn ? "পূর্ণাঙ্গ র‍্যাঙ্কিং তালিকা" : "Full Standings Roster"} ({filteredSubmissions.length})
                      </h4>

                      {/* Search Bar */}
                      <div className="relative w-full sm:w-64">
                        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={leaderboardSearchQ}
                          onChange={(e) => setLeaderboardSearchQ(e.target.value)}
                          placeholder={isBn ? "পরীক্ষার্থীর নাম দিয়ে খুঁজুন..." : "Search aspirant name..."}
                          className="w-full bg-black border border-gray-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#C1121F] font-mono"
                        />
                      </div>
                    </div>

                    {filteredSubmissions.length === 0 ? (
                      <div className="text-center py-10 text-gray-500 font-mono text-xs">
                        {isBn ? "এই ব্যাচে কোনো পরীক্ষার্থীর রেজাল্ট পাওয়া যায়নি।" : "No submissions recorded yet for this exam batch."}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-1">
                        {filteredSubmissions.map((sub, idx) => {
                          const rank = submissions.findIndex((s) => s.id === sub.id) + 1;
                          const isMe = sub.userId === user.uid;

                          return (
                            <div
                              key={sub.id || idx}
                              className={`p-3.5 rounded-xl border transition flex items-center justify-between gap-3 ${
                                isMe
                                  ? "bg-emerald-950/40 border-emerald-500/60 shadow-md"
                                  : rank === 1
                                  ? "bg-amber-950/30 border-amber-500/40"
                                  : rank === 2
                                  ? "bg-gray-900 border-gray-700"
                                  : rank === 3
                                  ? "bg-amber-950/20 border-amber-800/30"
                                  : "bg-black/60 border-gray-850 hover:border-gray-800"
                              }`}
                            >
                              {/* Left: Rank & User Profile */}
                              <div className="flex items-center gap-3">
                                <span
                                  className={`w-7 h-7 rounded-lg font-mono font-black text-xs flex items-center justify-center shrink-0 ${
                                    rank === 1
                                      ? "bg-amber-400 text-black"
                                      : rank === 2
                                      ? "bg-gray-300 text-black"
                                      : rank === 3
                                      ? "bg-amber-700 text-white"
                                      : "bg-gray-800 text-gray-300"
                                  }`}
                                >
                                  {rank}
                                </span>

                                <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center overflow-hidden shrink-0">
                                  {sub.avatarUrl ? (
                                    <img src={sub.avatarUrl} alt={sub.displayName} className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="font-mono font-bold text-xs text-gray-300">
                                      {(sub.displayName || "S").charAt(0)}
                                    </span>
                                  )}
                                </div>

                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-xs text-white line-clamp-1">{sub.displayName}</span>
                                    {isMe && (
                                      <span className="text-[9px] bg-emerald-500 text-black font-bold px-1.5 py-0.2 rounded font-mono">
                                        YOU
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-gray-500 font-mono">
                                    {sub.submittedAt ? new Date(sub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                                  </span>
                                </div>
                              </div>

                              {/* Right: Score & Time */}
                              <div className="flex items-center gap-4 text-right shrink-0">
                                <div>
                                  <span className="text-xs font-mono font-black text-amber-400 block">
                                    {sub.score} <span className="text-[10px] text-gray-500 font-normal">/{sub.totalQuestions || 100}</span>
                                  </span>
                                  <span className="text-[10px] font-mono text-gray-400 block">
                                    ⏱ {Math.floor((sub.timeTaken || 0) / 60)}m {(sub.timeTaken || 0) % 60}s
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* TAB 3: PAYMENT TRACKER */}
        {activeSubTab === "payment_tracker" && (
          <div className="bg-[#151515] p-6 rounded-2xl border border-white/10 flex flex-col gap-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <div>
                <h3 className="text-lg font-black uppercase text-white font-display flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#FFD700]" />
                  {isBn ? "আমার পেমেন্ট রিকোয়েস্ট ট্র্যাকার" : "Payment & TrxID Request Tracker"}
                </h3>
                <p className="text-xs text-gray-400">
                  {isBn ? "আপনার পাঠানো বিকাশ বা নগদ ট্রানজ্যাকশন আইডির লাইভ রিয়েল-টাইম স্টেটমেন্ট।" : "Live real-time status of your submitted bKash and Nagad payment transactions."}
                </p>
              </div>
            </div>

            {myPaymentRequests.length === 0 ? (
              <div className="text-center py-12 text-gray-500 font-mono text-xs">
                {isBn ? "আপনার জমা দেওয়া কোনো পেমেন্ট রিকোয়েস্ট পাওয়া যায়নি।" : "No payment requests submitted yet."}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {myPaymentRequests.map((req) => (
                  <div key={req.id} className="bg-black/60 p-4 rounded-xl border border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{req.selectedPlan}</span>
                        <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
                          ৳{req.amount}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 font-mono flex items-center gap-3">
                        <span>Method: {req.paymentMethod}</span>
                        <span>•</span>
                        <span>Sender: {req.senderNumber}</span>
                        <span>•</span>
                        <span className="text-[#FFD700]">TrxID: {req.transactionId}</span>
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                        Submitted: {new Date(req.submissionDate).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs font-mono font-bold px-3 py-1.5 rounded-xl border uppercase ${
                          req.status === "Approved"
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                            : req.status === "Rejected"
                            ? "bg-red-500/20 text-red-400 border-red-500/40"
                            : "bg-yellow-500/20 text-yellow-400 border-yellow-500/40 animate-pulse"
                        }`}
                      >
                        {req.status === "Approved" ? "✅ APPROVED" : req.status === "Rejected" ? "❌ REJECTED" : "⏳ PENDING VERIFICATION"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ROUTINE & GUIDE */}
        {activeSubTab === "routine_guide" && (
          <div className="bg-[#151515] p-6 md:p-8 rounded-3xl border border-white/10 flex flex-col gap-6 shadow-xl">
            <div className="border-b border-gray-800 pb-4">
              <h3 className="text-xl font-black text-white uppercase font-display flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                {isBn ? "মেডিকেল এক্সাম ব্যাচ রুটিন ও পরীক্ষার নিয়মাবলী" : "Medical Exam Batch Routine & Guidelines"}
              </h3>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Box 1: Rules */}
              <div className="bg-black/50 p-5 rounded-2xl border border-gray-800 flex flex-col gap-3">
                <h4 className="font-bold text-sm text-[#FFD700] uppercase font-mono flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#FFD700]" /> {isBn ? "লাইভ মডেল টেস্টের নিয়মাবলী" : "Live Test Regulations"}
                </h4>
                <ul className="text-xs text-gray-300 flex flex-col gap-2 leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-[#C1121F] font-mono font-bold">১.</span>
                    <span>{isBn ? "প্রত্যেকটি প্রশ্নের উত্তর দেওয়ার জন্য নির্ধারিত সময় প্রদান করা হয়।" : "Strict timer per batch test."}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#C1121F] font-mono font-bold">২.</span>
                    <span>{isBn ? "প্রতিটি ভুল উত্তরের জন্য ০.২৫ নম্বর কাটা যাবে (মেডিকেল স্ট্যান্ডার্ড)।" : "0.25 marks deducted per incorrect option."}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#C1121F] font-mono font-bold">৩.</span>
                    <span>{isBn ? "পরীক্ষা শেষে তাৎক্ষণিক রিয়েল-টাইম র‍্যাঙ্ক ও লিডারবোর্ড প্রকাশিত হবে।" : "Instant real-time merit rank position."}</span>
                  </li>
                </ul>
              </div>

              {/* Box 2: Payment guidelines */}
              <div className="bg-black/50 p-5 rounded-2xl border border-gray-800 flex flex-col gap-3">
                <h4 className="font-bold text-sm text-emerald-400 uppercase font-mono flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" /> {isBn ? "পেমেন্ট পরবর্তী এক্টিভেশন গাইড" : "Post Payment Activation"}
                </h4>
                <p className="text-xs text-gray-300 leading-relaxed">
                  {isBn
                    ? "বিকাশ বা নগদ অ্যাপের মাধ্যমে টাকা পাঠানোর পর সঠিকভাবে ১১ সংখ্যার নম্বর এবং ট্রানজ্যাকশন আইডি (TrxID) দিয়ে ফর্ম সাবমিট করুন। আমাদের টিমের ম্যানুয়াল পেমেন্ট ভেরিফিকেশন ৫-১৫ মিনিটের মধ্যে সম্পন্ন হয়ে আপনার ব্যাচ অটোমেটিক আনলক হয়ে যাবে।"
                    : "Send payment via bKash/Nagad and submit TrxID. Batch will be auto-unlocked upon verification within 5-15 mins."}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: EXAM BATCH DETAILS MODAL */}
      <AnimatePresence>
        {selectedBatchDetails && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#111111] border border-white/10 w-full max-w-2xl rounded-3xl p-6 md:p-8 flex flex-col gap-6 max-h-[90vh] overflow-y-auto shadow-2xl relative"
            >
              <button
                onClick={() => setSelectedBatchDetails(null)}
                className="absolute top-6 right-6 z-10 p-2 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-full text-gray-400 hover:text-white transition border border-white/10"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Cover Photo Banner Header (Clean, no text overlay) */}
              <div className="relative w-full h-48 md:h-56 rounded-2xl overflow-hidden border border-gray-800 shadow-xl bg-black -mt-2">
                <img
                  src={selectedBatchDetails.coverImage || "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80"}
                  alt={selectedBatchDetails.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80";
                  }}
                />
              </div>

              {/* Title & Target Group Header */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-red-400 uppercase bg-red-950/90 px-3 py-1 rounded-full border border-red-900/60 w-fit">
                    {selectedBatchDetails.targetGroup || "Medical Admission Batch"}
                  </span>
                </div>
                <h3 className="text-xl md:text-2xl font-black text-white">{selectedBatchDetails.title}</h3>
              </div>

              <div className="flex flex-col gap-2">
                {selectedBatchDetails.description && (
                  <p className="text-xs text-gray-300 leading-relaxed bg-black/40 p-3.5 rounded-xl border border-gray-800">
                    {selectedBatchDetails.description}
                  </p>
                )}
                {selectedBatchDetails.startDate && (
                  <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 font-bold bg-emerald-950/30 border border-emerald-500/20 px-3 py-1.5 rounded-xl w-fit">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    <span>{isBn ? "ব্যাচ শুরু:" : "Batch Starts:"} {selectedBatchDetails.startDate}</span>
                  </div>
                )}
              </div>

              {/* Dynamic Visual Countdown Timer in Batch Modal */}
              <BatchEventCountdownTimer
                batch={selectedBatchDetails}
                language={language}
                variant="hero"
              />

              {/* Specs grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-black/60 p-4 rounded-2xl border border-gray-800 text-center font-mono text-xs">
                <div>
                  <span className="text-gray-500 block uppercase text-[10px]">{isBn ? "বিষয়" : "Subject"}</span>
                  <span className="text-emerald-400 font-bold">{selectedBatchDetails.subject}</span>
                </div>
                <div>
                  <span className="text-gray-500 block uppercase text-[10px]">{isBn ? "এমসিকিউ" : "MCQs"}</span>
                  <span className="text-[#FFD700] font-bold">{selectedBatchDetails.totalQuestions} Questions</span>
                </div>
                <div>
                  <span className="text-gray-500 block uppercase text-[10px]">{isBn ? "সময়" : "Duration"}</span>
                  <span className="text-white font-bold">{selectedBatchDetails.duration} Mins</span>
                </div>
                <div>
                  <span className="text-gray-500 block uppercase text-[10px]">{isBn ? "নেগেটিভ মার্ক" : "Negative Mark"}</span>
                  <span className="text-red-400 font-bold">-{selectedBatchDetails.negMarking || 0.25}</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <h4 className="font-bold text-sm text-white uppercase font-mono">{isBn ? "ব্যাচের সুবিধাসমূহ:" : "Included Perks:"}</h4>
                <div className="grid md:grid-cols-2 gap-2 text-xs text-gray-300">
                  <div className="bg-black/40 p-3 rounded-xl border border-gray-850 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>রিয়েল-টাইম অল-বাংলাদেশ মেরিট লিডারবোর্ড</span>
                  </div>
                  <div className="bg-black/40 p-3 rounded-xl border border-gray-850 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>পিডিএফ উত্তরপত্র ও অধ্যায়ভিত্তিক সল্যুশন</span>
                  </div>
                  <div className="bg-black/40 p-3 rounded-xl border border-gray-850 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>মেডি সেন্স এআই মেন্টর সাপোর্ট</span>
                  </div>
                  <div className="bg-black/40 p-3 rounded-xl border border-gray-850 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>অফিসিয়াল মেধা সার্টিফিকেট</span>
                  </div>
                </div>
              </div>

              {/* STUDENT RATINGS & REVIEWS SECTION */}
              {(() => {
                const stats = getBatchRatingStats(selectedBatchDetails.id);
                const reviews = batchReviews.filter((r) => r.batchId === selectedBatchDetails.id);
                const isEnrolled = isUserEnrolled(selectedBatchDetails.id);
                const myReview = reviews.find((r) => r.userId === user.uid);

                return (
                  <div className="flex flex-col gap-4 bg-black/50 p-4 md:p-5 rounded-2xl border border-gray-800">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-[#FFD700]" />
                        <h4 className="font-black text-sm text-white uppercase font-mono tracking-wider">
                          {isBn ? "শিক্ষার্থীদের রেটিং ও মতামত" : "Student Ratings & Reviews"}
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono text-gray-400 bg-gray-850 px-2.5 py-1 rounded-full border border-gray-750">
                        {stats.total} {isBn ? "টি রিভিউ" : stats.total === 1 ? "Review" : "Reviews"}
                      </span>
                    </div>

                    {/* Ratings Overview Bar */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-black/60 p-4 rounded-xl border border-gray-850 items-center">
                      {/* Average Score Box */}
                      <div className="flex flex-col items-center justify-center text-center p-2 border-b md:border-b-0 md:border-r border-gray-800">
                        <span className="text-3xl font-black text-amber-400 font-mono tracking-tight">
                          {stats.total > 0 ? stats.avg : "0.0"}
                        </span>
                        <div className="flex items-center gap-1 my-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-4 h-4 ${
                                s <= Math.round(stats.avg) ? "fill-amber-400 text-amber-400" : "text-gray-700"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] font-mono text-gray-400">
                          {stats.total > 0
                            ? `${stats.total} ${isBn ? "জন পরীক্ষার্থীর রেটিং" : "Student Ratings"}`
                            : isBn ? "এখনও কোনো রেটিং দেওয়া হয়নি" : "No ratings submitted yet"}
                        </span>
                      </div>

                      {/* Breakdown Star Bars */}
                      <div className="md:col-span-2 flex flex-col gap-1 text-[11px] font-mono">
                        {[5, 4, 3, 2, 1].map((star) => {
                          const count = stats.counts[star] || 0;
                          const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                          return (
                            <div key={star} className="flex items-center gap-2">
                              <span className="w-8 text-gray-400 flex items-center justify-end gap-0.5">
                                {star} <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              </span>
                              <div className="flex-1 h-2 bg-gray-850 rounded-full overflow-hidden border border-gray-800">
                                <div
                                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="w-10 text-right text-[10px] text-gray-500">{pct}% ({count})</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* SUBMIT REVIEW FORM (For Enrolled Students or Admins) */}
                    {isEnrolled ? (
                      <div className="bg-gradient-to-r from-red-950/30 to-black p-4 rounded-xl border border-red-900/40 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-gray-200 uppercase flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-[#FFD700]" />
                            {myReview
                              ? isBn ? "আপনার পূর্ববর্তী রিভিউ সম্পাদনা করুন:" : "Edit Your Review:"
                              : isBn ? "কোর্স সম্পর্কে আপনার রেটিং ও ফিডব্যাক লিখুন:" : "Rate & Review this Exam Batch:"}
                          </span>
                          {myReview && (
                            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
                              ✓ {isBn ? "আপনার পোস্ট করা রিভিউ" : "Already Reviewed"}
                            </span>
                          )}
                        </div>

                        {/* Star Selection */}
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-400 font-mono">{isBn ? "রেটিং সিলেক্ট করুন:" : "Select Rating:"}</span>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setReviewRating(star)}
                                onMouseEnter={() => setReviewHoverRating(star)}
                                onMouseLeave={() => setReviewHoverRating(0)}
                                className="p-1 focus:outline-none transition transform hover:scale-125 cursor-pointer"
                              >
                                <Star
                                  className={`w-6 h-6 ${
                                    star <= (reviewHoverRating || reviewRating)
                                      ? "fill-amber-400 text-amber-400"
                                      : "text-gray-700"
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                          <span className="text-xs font-mono font-bold text-amber-400 ml-1">
                            {(reviewHoverRating || reviewRating) === 5
                              ? isBn ? "চমৎকার! (5/5)" : "Excellent! (5/5)"
                              : (reviewHoverRating || reviewRating) === 4
                              ? isBn ? "খুব ভালো (4/5)" : "Very Good (4/5)"
                              : (reviewHoverRating || reviewRating) === 3
                              ? isBn ? "ভালো (3/5)" : "Good (3/5)"
                              : (reviewHoverRating || reviewRating) === 2
                              ? isBn ? "মোটামুটি (2/5)" : "Average (2/5)"
                              : isBn ? "উন্নতি প্রয়োজন (1/5)" : "Needs Work (1/5)"}
                          </span>
                        </div>

                        {/* Comment Textarea */}
                        <textarea
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          rows={2}
                          placeholder={
                            isBn
                              ? "প্রশ্নপত্রের মান, উত্তরপত্রের সঠিকতা বা কোর্সটি মেডিকেল প্রস্তুতির জন্য কতটা সহায়ক হয়েছে সে সম্পর্কে লিখুন..."
                              : "Write your feedback on question quality, explanations, or routine guidance..."
                          }
                          className="w-full bg-black border border-gray-800 rounded-xl p-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#C1121F] resize-none"
                        />

                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-gray-500 font-mono">
                            {isBn ? "অন্যান্য পরীক্ষার্থীরা আপনার রিভিউ দেখতে পাবে" : "Your review will be visible to all aspirants"}
                          </span>
                          <button
                            type="button"
                            onClick={handleSubmitReview}
                            disabled={isSubmittingReview}
                            className="px-4 py-2 bg-[#C1121F] hover:bg-red-700 text-white font-mono text-xs font-bold uppercase rounded-xl transition flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                          >
                            <Send className="w-3.5 h-3.5" />
                            {isSubmittingReview
                              ? isBn ? "জমা হচ্ছে..." : "Submitting..."
                              : myReview
                              ? isBn ? "রিভিউ আপডেট করুন" : "Update Review"
                              : isBn ? "রিভিউ পোস্ট করুন" : "Post Review"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-black/60 p-4 rounded-xl border border-gray-800 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5 text-gray-400">
                          <Lock className="w-4 h-4 text-amber-500 shrink-0" />
                          <span>
                            {isBn
                              ? "🔒 শুধুমাত্র এই ব্যাচে এনরোল করা শিক্ষার্থীরা তাদের অভিজ্ঞতা ও রেটিং পোস্ট করতে পারবে।"
                              : "🔒 Only enrolled batch students can rate and leave feedback."}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const b = selectedBatchDetails;
                            setSelectedBatchDetails(null);
                            setSelectedBatchForCheckout(b);
                          }}
                          className="px-3 py-1.5 bg-red-950/80 hover:bg-red-900 border border-red-800/60 text-red-300 font-mono text-[11px] font-bold rounded-lg shrink-0 transition"
                        >
                          {isBn ? "এনরোল করুন" : "Enroll Now"}
                        </button>
                      </div>
                    )}

                    {/* STUDENT REVIEWS LIST */}
                    <div className="flex flex-col gap-3 mt-1">
                      <span className="text-xs font-mono text-gray-400 uppercase font-bold">
                        {isBn ? "সাম্প্রতিক শিক্ষার্থীর মতামত:" : "Recent Student Feedback:"}
                      </span>

                      {reviews.length === 0 ? (
                        <div className="text-center py-6 bg-black/40 rounded-xl border border-dashed border-gray-850 text-xs text-gray-500 font-mono">
                          {isBn
                            ? "এই ব্যাচে এখনও কোনো স্টুডেন্ট রিভিউ জমা দেওয়া হয়নি। এনরোল করে প্রথম রিভিউটি লিখুন!"
                            : "No student reviews posted yet for this batch. Enroll to post the first review!"}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2.5 max-h-60 overflow-y-auto pr-1">
                          {reviews.map((rev) => {
                            const canDelete = rev.userId === user.uid || user.role === "admin" || user.role === "superadmin";
                            return (
                              <div
                                key={rev.id}
                                className="bg-black/60 p-3.5 rounded-xl border border-gray-850 flex flex-col gap-2 relative hover:border-gray-800 transition"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-800 to-black border border-gray-700 flex items-center justify-center text-white font-mono font-bold text-xs uppercase overflow-hidden shrink-0">
                                      {rev.userAvatar ? (
                                        <img src={rev.userAvatar} alt={rev.userName} className="w-full h-full object-cover" />
                                      ) : (
                                        rev.userName ? rev.userName.charAt(0) : "S"
                                      )}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-xs text-white line-clamp-1">{rev.userName}</span>
                                        {rev.userId === user.uid && (
                                          <span className="text-[9px] bg-red-950 text-red-400 border border-red-900 px-1.5 py-0.5 rounded font-mono">
                                            You
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1 mt-0.5">
                                        {[1, 2, 3, 4, 5].map((s) => (
                                          <Star
                                            key={s}
                                            className={`w-3 h-3 ${
                                              s <= (rev.rating || 5)
                                                ? "fill-amber-400 text-amber-400"
                                                : "text-gray-800"
                                            }`}
                                          />
                                        ))}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-mono text-gray-500">
                                      {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString() : ""}
                                    </span>
                                    {canDelete && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteReview(rev)}
                                        title="Delete review"
                                        className="p-1 text-gray-500 hover:text-red-400 transition"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <p className="text-xs text-gray-300 leading-relaxed font-sans bg-black/40 p-2.5 rounded-lg border border-gray-900">
                                  "{rev.comment}"
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-850">
                <button
                  onClick={() => setSelectedBatchDetails(null)}
                  className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-mono text-xs uppercase font-bold rounded-xl transition"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    const b = selectedBatchDetails;
                    setSelectedBatchDetails(null);
                    setSelectedBatchForCheckout(b);
                  }}
                  className="px-6 py-2.5 bg-[#C1121F] hover:bg-red-700 text-white font-mono text-xs font-black uppercase tracking-wider rounded-xl transition shadow-lg flex items-center gap-2"
                >
                  <CreditCard className="w-4 h-4" /> {isBn ? "এখনই এনরোল করুন" : "Enroll Now"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: CHECKOUT & PAYMENT MODAL */}
      <AnimatePresence>
        {selectedBatchForCheckout && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#111111] border border-white/10 w-full max-w-xl rounded-3xl p-6 md:p-8 flex flex-col gap-6 max-h-[90vh] overflow-y-auto shadow-2xl relative"
            >
              <button
                onClick={() => setSelectedBatchForCheckout(null)}
                className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>

              <div>
                <span className="text-[10px] font-mono font-bold text-[#FFD700] uppercase tracking-wider block">
                  EXAM BATCH CHECKOUT GATEWAY
                </span>
                <h3 className="text-xl font-black text-white">{selectedBatchForCheckout.title}</h3>
                <div className="text-xs text-gray-400 mt-1">
                  Total Payable Amount: <span className="text-emerald-400 font-bold font-mono text-base">৳{selectedBatchForCheckout.price || 499}</span>
                </div>
              </div>

              {/* QUICK PASSCODE ACTIVATION BOX */}
              <div className="bg-black/60 p-4 rounded-2xl border border-amber-500/30 flex flex-col gap-2.5">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#FFD700] uppercase">
                  <Gift className="w-4 h-4 text-[#FFD700]" /> {isBn ? "পেইড ব্যাচ পাসকোড থাকলে ইনস্ট্যান্ট অ্যাক্টিভ করুন" : "Instant Activation via Batch Passcode"}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder={isBn ? "যেমন: BATCH2026 বা MEDICO2026" : "e.g. BATCH2026"}
                    className="flex-1 bg-black border border-gray-800 rounded-xl px-3.5 py-2 text-xs text-white uppercase font-mono focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={handlePasscodeUnlock}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-mono text-xs font-black uppercase rounded-xl transition"
                  >
                    Apply
                  </button>
                </div>
              </div>

              <div className="relative flex items-center my-1">
                <div className="flex-grow border-t border-gray-800"></div>
                <span className="flex-shrink mx-4 text-[10px] font-mono text-gray-500 uppercase">OR PAY VIA BKASH / NAGAD</span>
                <div className="flex-grow border-t border-gray-800"></div>
              </div>

              {/* PAYMENT METHOD SELECTOR */}
              <div className="flex flex-col gap-3">
                <div className="text-xs font-mono font-bold text-gray-300 uppercase">{isBn ? "পেমেন্ট মাধ্যম সিলেক্ট করুন:" : "Select Gateway:"}</div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("bKash")}
                    className={`p-3 rounded-2xl border flex items-center justify-center gap-2 font-mono font-bold text-xs transition ${
                      paymentMethod === "bKash"
                        ? "bg-pink-950/60 border-pink-500 text-pink-300"
                        : "bg-black/40 border-gray-800 text-gray-400 hover:text-white"
                    }`}
                  >
                    <Smartphone className="w-4 h-4" /> bKash Send Money
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("Nagad")}
                    className={`p-3 rounded-2xl border flex items-center justify-center gap-2 font-mono font-bold text-xs transition ${
                      paymentMethod === "Nagad"
                        ? "bg-orange-950/60 border-orange-500 text-orange-300"
                        : "bg-black/40 border-gray-800 text-gray-400 hover:text-white"
                    }`}
                  >
                    <Smartphone className="w-4 h-4" /> Nagad Send Money
                  </button>
                </div>

                {/* DYNAMIC NUMBER DISPLAY BOX */}
                <div className="bg-black/80 p-4 rounded-2xl border border-gray-800 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono text-gray-500 uppercase block">
                      OFFICIAL {paymentMethod.toUpperCase()} NUMBER (SEND MONEY)
                    </span>
                    <span className="text-lg font-mono font-black text-white tracking-wider">
                      {paymentMethod === "bKash" ? paymentNumbers.bkash : paymentNumbers.nagad}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(paymentMethod === "bKash" ? paymentNumbers.bkash : paymentNumbers.nagad, paymentMethod)}
                    className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-mono text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <Copy className="w-4 h-4 text-[#FFD700]" />
                    <span>{copiedType === paymentMethod ? "Copied!" : "Copy"}</span>
                  </button>
                </div>
              </div>

              {/* FORM FIELDS */}
              <form onSubmit={handleSubmitPayment} className="flex flex-col gap-4">
                <div>
                  <label className="text-[11px] font-mono font-bold text-gray-300 uppercase block mb-1">
                    {isBn ? "আপনার বিকাশ/নগদ সেন্ডার নম্বর *" : "Your Sender Phone Number *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={senderNumber}
                    onChange={(e) => setSenderNumber(e.target.value)}
                    placeholder="e.g. 01712345678"
                    className="w-full bg-black/60 border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#C1121F]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono font-bold text-gray-300 uppercase block mb-1">
                    {isBn ? "ট্রানজ্যাকশন আইডি (TrxID) *" : "Transaction ID (TrxID) *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="e.g. BKL8902XYZ"
                    className="w-full bg-black/60 border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white uppercase font-mono focus:outline-none focus:border-[#C1121F]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-[#C1121F] hover:bg-red-700 disabled:opacity-50 text-white font-mono text-xs font-black uppercase tracking-wider rounded-xl transition shadow-xl flex items-center justify-center gap-2 mt-2"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>{isSubmitting ? "SUBMITTING..." : isBn ? "পেমেন্ট নিশ্চিত করুন & এনরোল সাবমিট করুন" : "CONFIRM PAYMENT & ENROLL"}</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Icon Fallback Component
function StoreIcon(props: any) {
  return <Rocket {...props} />;
}
