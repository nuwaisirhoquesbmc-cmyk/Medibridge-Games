import React, { useState, useEffect } from "react";
import { Course, Batch, Coupon, Order, Enrollment, CoursePaymentSettings } from "../../types/courseTypes";
import { UserProfile } from "../../types";
import { db } from "../../lib/backend";
import { collection, addDoc, doc, setDoc, updateDoc, increment, arrayUnion, getDocs, query, where, onSnapshot } from "../../lib/supabaseDb";
import { DEFAULT_PAYMENT_SETTINGS } from "../../data/coursesData";
import { motion } from "motion/react";
import PaymentReceipt from "./PaymentReceipt";
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Zap,
  Tag,
  CreditCard,
  Lock,
  PhoneCall,
  Loader2,
  AlertCircle,
  Building,
  Smartphone,
  MessageCircle,
  Clock,
  Mail,
  Facebook
} from "lucide-react";
import { playSound } from "../../audio";

interface CourseCheckoutViewProps {
  course: Course;
  batch: Batch;
  coupons?: Coupon[];
  user: UserProfile;
  language: "bn" | "en";
  theme: "light" | "dark";
  onBack?: () => void;
  onPaymentSuccess: (order: Order, enrollment: Enrollment) => void;
}

export default function CourseCheckoutView({
  course,
  batch,
  coupons = [],
  user,
  language,
  theme,
  onBack,
  onPaymentSuccess
}: CourseCheckoutViewProps) {
  const isDark = theme === "dark";
  const isBn = language === "bn";

  const [paymentSettings, setPaymentSettings] = useState<CoursePaymentSettings>(DEFAULT_PAYMENT_SETTINGS);
  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState("");

  const [paymentMethod, setPaymentMethod] = useState<"bkash" | "nagad" | "rocket" | "card">("bkash");
  const [senderNumber, setSenderNumber] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [copiedNumber, setCopiedNumber] = useState(false);

  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [completedReceiptData, setCompletedReceiptData] = useState<{ order: Order; enrollment: Enrollment } | null>(null);

  // Subscribe to real-time payment settings configured in admin panel
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "settings", "payment"),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as any;
          setPaymentSettings({
            ...DEFAULT_PAYMENT_SETTINGS,
            ...data,
          });
        }
      },
      (err) => {
        console.warn("Using default payment settings:", err);
      }
    );
    return () => unsub();
  }, []);

  const basePrice = batch.price || course.discountedPrice;
  let discountAmount = 0;

  if (appliedCoupon) {
    if (appliedCoupon.discountType === "fixed") {
      discountAmount = appliedCoupon.discountValue;
    } else {
      discountAmount = Math.round((basePrice * appliedCoupon.discountValue) / 100);
    }
  }

  const finalAmount = Math.max(0, basePrice - discountAmount);

  const handleApplyCoupon = async () => {
    playSound("click");
    setCouponError("");
    const code = couponCodeInput.trim().toUpperCase();
    if (!code) return;

    // 1. Check prop coupons first
    let matched = coupons.find((c) => c.code.toUpperCase() === code && c.isActive);

    // 2. Check Firestore course_promocodes if not found in props
    if (!matched) {
      try {
        const qSnap = await getDocs(
          query(collection(db, "course_promocodes"), where("code", "==", code), where("isActive", "==", true))
        );
        if (!qSnap.empty) {
          const docData = qSnap.docs[0].data();
          matched = {
            id: qSnap.docs[0].id,
            code: docData.code,
            discountType: docData.discountType,
            discountValue: docData.discountValue,
            minOrderAmount: docData.minOrderAmount || 0,
            expiryDate: docData.expiryDate || "",
            usageCount: docData.usageCount || 0,
            maxUsage: docData.maxUsage || 1000,
            isActive: docData.isActive ?? true,
            applicableScope: docData.applicableScope || "all",
            applicableCourseIds: docData.applicableCourseIds || ["all"],
            applicableCourseTitles: docData.applicableCourseTitles || [],
            totalDiscountGiven: docData.totalDiscountGiven || 0,
          };
        }
      } catch (err) {
        console.warn("Firestore promocode check error:", err);
      }
    }

    if (!matched) {
      setCouponError(isBn ? "অবৈধ বা মেয়াদোত্তীর্ণ কুপন কোড!" : "Invalid or expired coupon code.");
      setAppliedCoupon(null);
      return;
    }

    // Expiry check
    if (matched.expiryDate) {
      const expTime = new Date(matched.expiryDate).getTime();
      const todayTime = new Date().setHours(0, 0, 0, 0);
      if (!isNaN(expTime) && expTime < todayTime) {
        setCouponError(isBn ? "এই প্রোমো কোডটির মেয়াদ উত্তীর্ণ হয়ে গেছে!" : "This promo code has expired!");
        setAppliedCoupon(null);
        return;
      }
    }

    // Max Usage check
    if (matched.maxUsage && (matched.usageCount || 0) >= matched.maxUsage) {
      setCouponError(isBn ? "এই প্রোমো কোডটির ব্যবহারের সর্বোচ্চ সীমা শেষ হয়ে গেছে!" : "This promo code has reached its maximum usage limit!");
      setAppliedCoupon(null);
      return;
    }

    // Course Wise Restriction Check
    const isSpecificScope = matched.applicableScope === "specific";
    const hasSpecificCourses = Array.isArray(matched.applicableCourseIds) &&
      matched.applicableCourseIds.length > 0 &&
      !matched.applicableCourseIds.includes("all");

    if (isSpecificScope || hasSpecificCourses) {
      const isCourseAllowed = matched.applicableCourseIds?.includes(course.id);
      if (!isCourseAllowed) {
        const allowedNames = matched.applicableCourseTitles && matched.applicableCourseTitles.length > 0
          ? matched.applicableCourseTitles.join(", ")
          : "নির্দিষ্ট কোর্স";
        setCouponError(
          isBn
            ? `এই প্রোমো কোডটি এই কোর্সের জন্য প্রযোজ্য নয়! এটি শুধুমাত্র (${allowedNames})-এর জন্য প্রযোজ্য।`
            : `This promo code is not valid for this course! It is restricted to (${allowedNames}).`
        );
        setAppliedCoupon(null);
        return;
      }
    }

    if (basePrice < matched.minOrderAmount) {
      setCouponError(
        isBn
          ? `নূন্যতম ৳${matched.minOrderAmount} টাকার অর্ডারে এই কুপন প্রযোজ্য।`
          : `Minimum order amount of ৳${matched.minOrderAmount} required.`
      );
      setAppliedCoupon(null);
      return;
    }

    setAppliedCoupon(matched);
    playSound("correct");
  };

  const handleCopyNumber = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedNumber(true);
    playSound("click");
    setTimeout(() => setCopiedNumber(false), 2000);
  };

  const handleVerifyAndPay = async (e: React.FormEvent) => {
    e.preventDefault();
    playSound("click");
    setErrorMsg("");

    if (!senderNumber || senderNumber.length < 11) {
      setErrorMsg(isBn ? "সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন!" : "Enter valid 11-digit mobile number.");
      return;
    }

    if (paymentMethod !== "card" && (!transactionId || transactionId.trim().length < 6)) {
      setErrorMsg(isBn ? "সঠিক ট্রানজেকশন আইডি (TrxID) ইনপুট দিন!" : "Enter valid Transaction ID (TrxID).");
      return;
    }

    setIsVerifying(true);

    try {
      const cleanTrx = transactionId.trim().toUpperCase() || `CARD_${Date.now()}`;
      const cleanPhone = senderNumber.trim();

      // Save to Firestore payment_requests collection for admin verification
      try {
        await addDoc(collection(db, "payment_requests"), {
          userId: user.uid,
          userEmail: user.email || "",
          userName: user.displayName || user.email || "Student",
          courseId: course.id,
          courseTitle: course.title,
          batchId: batch.id,
          batchName: batch.batchName,
          selectedPlan: course.title,
          amount: finalAmount,
          originalAmount: basePrice,
          discountAmount,
          couponCode: appliedCoupon?.code || "",
          paymentMethod,
          transactionId: cleanTrx,
          senderNumber: cleanPhone,
          status: "Pending",
          submissionDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          adminNotes: ""
        });

        // Increment course counter in app_settings/store_stats for public display
        await setDoc(doc(db, "app_settings", "store_stats"), {
          courseCounts: {
            [course.id]: increment(1)
          }
        }, { merge: true });

        // Increment Promo Code usage count and append usage log in Firestore
        if (appliedCoupon?.id) {
          try {
            await updateDoc(doc(db, "course_promocodes", appliedCoupon.id), {
              usageCount: increment(1),
              totalDiscountGiven: increment(discountAmount),
              usageLogs: arrayUnion({
                userId: user.uid,
                userEmail: user.email || "",
                userName: user.displayName || user.email || "Student",
                courseId: course.id,
                courseTitle: course.title,
                batchId: batch.id,
                batchName: batch.batchName,
                originalAmount: basePrice,
                discountAmount: discountAmount,
                finalAmount: finalAmount,
                transactionId: cleanTrx,
                usedAt: new Date().toISOString()
              })
            });
          } catch (couponIncErr) {
            console.warn("Could not increment coupon usage count in Firestore:", couponIncErr);
          }
        }
      } catch (dbErr) {
        console.warn("Firestore payment request save warning:", dbErr);
      }

      // Call backend payment verification server route with graceful fallback
      let serverResponseData: any = null;
      try {
        const response = await fetch("/api/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.uid,
            userEmail: user.email,
            userDisplayName: user.displayName,
            courseId: course.id,
            batchId: batch.id,
            courseTitle: course.title,
            batchName: batch.batchName,
            amount: finalAmount,
            originalAmount: basePrice,
            discountAmount,
            couponCode: appliedCoupon?.code,
            paymentMethod,
            transactionId: cleanTrx,
            senderNumber: cleanPhone
          })
        });

        if (response.ok) {
          serverResponseData = await response.json();
        }
      } catch (fetchErr) {
        console.warn("Payment verify endpoint call skipped/unreachable, constructing receipt data client-side:", fetchErr);
      }

      const now = new Date().toISOString();
      const orderNumber = serverResponseData?.order?.orderNumber || `MB-${Math.floor(100000 + Math.random() * 900000)}`;
      const order: Order = serverResponseData?.order || {
        id: `ORD_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        orderNumber,
        userId: user.uid,
        userEmail: user.email || "",
        userDisplayName: user.displayName || "Aspirant",
        courseId: course.id,
        batchId: batch.id,
        courseTitle: course.title,
        batchName: batch.batchName,
        amount: finalAmount,
        originalAmount: basePrice,
        discountAmount,
        couponCode: appliedCoupon?.code || "",
        paymentMethod,
        transactionId: cleanTrx,
        senderNumber: cleanPhone,
        status: "Pending",
        createdAt: now,
        verifiedAt: null
      };

      const enrollment: Enrollment = serverResponseData?.enrollment || {
        id: `enr_${user.uid}_${course.id}`,
        userId: user.uid,
        userEmail: user.email || "",
        userDisplayName: user.displayName || "Aspirant",
        courseId: course.id,
        batchId: batch.id,
        courseSlug: course.slug || "medical-course",
        batchSlug: batch.batchSlug || "batch-1",
        courseTitle: course.title,
        batchName: batch.batchName,
        status: "active",
        enrolledAt: now,
        expiresAt: new Date(Date.now() + 86400000 * 365).toISOString(),
        progressPct: 0,
        lastAccessedAt: now,
        completedExams: [],
        completedClasses: [],
        viewedMaterials: []
      };

      try {
        await setDoc(doc(db, "enrollments", enrollment.id), enrollment, { merge: true });
      } catch (fErr) {
        console.warn("Writing enrollment to Firestore error:", fErr);
      }

      playSound("correct");
      setCompletedReceiptData({ order, enrollment });
    } catch (err: any) {
      console.error("Payment Error:", err);
      setErrorMsg(err.message || (isBn ? "পেমেন্ট প্রসেস ব্যর্থ হয়েছে, আবার চেষ্টা করুন।" : "Payment failed. Please retry."));
    } finally {
      setIsVerifying(false);
    }
  };

  // Active numbers and details based on selected paymentMethod
  const activeNumber =
    paymentMethod === "bkash"
      ? paymentSettings.bkashNumber
      : paymentMethod === "nagad"
      ? paymentSettings.nagadNumber
      : paymentMethod === "rocket"
      ? paymentSettings.rocketNumber
      : "";

  const activeAccountType =
    paymentMethod === "bkash"
      ? paymentSettings.bkashType === "merchant"
        ? (isBn ? "মার্চেন্ট পেমেন্ট (Make Payment)" : "Merchant (Make Payment)")
        : paymentSettings.bkashType === "agent"
        ? (isBn ? "এজেন্ট ক্যাশ ইন (Cash In)" : "Agent (Cash In)")
        : (isBn ? "পার্সোনাল সেন্ড মানি (Personal Send Money)" : "Personal (Send Money)")
      : paymentMethod === "nagad"
      ? paymentSettings.nagadType === "merchant"
        ? (isBn ? "মার্চেন্ট পেমেন্ট (Make Payment)" : "Merchant (Make Payment)")
        : paymentSettings.nagadType === "agent"
        ? (isBn ? "এজেন্ট ক্যাশ ইন (Cash In)" : "Agent (Cash In)")
        : (isBn ? "পার্সোনাল সেন্ড মানি (Personal Send Money)" : "Personal (Send Money)")
      : paymentMethod === "rocket"
      ? paymentSettings.rocketType === "merchant"
        ? (isBn ? "মার্চেন্ট পেমেন্ট" : "Merchant Payment")
        : (isBn ? "পার্সোনাল সেন্ড মানি" : "Personal Send Money")
      : "";

  const activeCustomInstruction =
    paymentMethod === "bkash"
      ? (isBn ? paymentSettings.bkashInstructionBn : paymentSettings.bkashInstructionEn) || (isBn ? "bKash অ্যাপ বা *247# ডায়াল করে টাকা পাঠান।" : "Send money via bKash app or dial *247#.")
      : paymentMethod === "nagad"
      ? (isBn ? paymentSettings.nagadInstructionBn : paymentSettings.nagadInstructionEn) || (isBn ? "Nagad অ্যাপ বা *167# ডায়াল করে টাকা পাঠান।" : "Send money via Nagad app or dial *167#.")
      : paymentMethod === "rocket"
      ? (isBn ? paymentSettings.rocketInstructionBn : paymentSettings.rocketInstructionEn) || (isBn ? "Rocket অ্যাপ বা *322# ডায়াল করে টাকা পাঠান।" : "Send money via Rocket app or dial *322#.")
      : "";

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 flex flex-col gap-8 font-sans">
      {/* Top Back Navigation */}
      <button
        onClick={() => {
          playSound("click");
          if (onBack) onBack();
        }}
        className="self-start flex items-center gap-2 text-xs font-mono font-bold uppercase text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl border border-white/10 transition cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{isBn ? "পিছনে যান" : "Back"}</span>
      </button>

      {/* Main Checkout Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight font-display">
          {isBn ? "সিকিউরড চেকআউট পেমেন্ট পোর্টাল" : "Secured Checkout Portal"}
        </h1>
        <p className="text-xs sm:text-sm text-gray-400 font-mono">
          {isBn ? "মেডিকেল ভর্তি পরীক্ষার সবচেয়ে জনপ্রিয় লার্নিং সিস্টেমে এনরোল করতে পেমেন্ট করুন" : "Complete registration to unlock full exam batch access"}
        </p>
      </div>

      {/* Payment Notice Banner from Admin if active */}
      {(paymentSettings.paymentNoticeBn || paymentSettings.paymentNoticeEn) && (
        <div className="bg-gradient-to-r from-red-950/40 via-black to-red-950/40 border border-red-500/30 rounded-2xl p-3.5 text-center font-mono text-xs text-amber-300 flex items-center justify-center gap-2 shadow-lg">
          <Clock className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{isBn ? paymentSettings.paymentNoticeBn : paymentSettings.paymentNoticeEn || paymentSettings.paymentNoticeBn}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Order Summary & Coupon */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-black uppercase text-white font-mono border-b border-white/10 pb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#FFD700]" />
              <span>{isBn ? "অর্ডার সামারি" : "Order Summary"}</span>
            </h3>

            <div className="space-y-3">
              <div>
                <span className="text-xs font-mono text-gray-400 block">{isBn ? "কোর্সের নাম:" : "Course:"}</span>
                <span className="text-sm font-extrabold text-white block">{course.title}</span>
              </div>

              <div>
                <span className="text-xs font-mono text-gray-400 block">{isBn ? "নির্বাচিত ব্যাচ:" : "Selected Batch:"}</span>
                <span className="text-xs font-bold text-[#FFD700] block">{batch.batchName}</span>
                <span className="text-[10px] text-gray-500 font-mono block">{batch.scheduleDetails}</span>
              </div>
            </div>

            {/* Price Calculations */}
            <div className="space-y-2 pt-3 border-t border-white/10 font-mono text-xs">
              <div className="flex justify-between text-gray-300">
                <span>{isBn ? "মূল কোর্স ফি:" : "Base Fee:"}</span>
                <span>৳{basePrice}</span>
              </div>

              {appliedCoupon && (
                <div className="flex justify-between text-emerald-400 font-bold">
                  <span>{isBn ? "কুপন ডিসকাউন্ট:" : "Coupon Discount:"}</span>
                  <span>-৳{discountAmount}</span>
                </div>
              )}

              <div className="flex justify-between text-white font-black text-base pt-2 border-t border-white/10">
                <span>{isBn ? "সর্বমোট প্রদেয়:" : "Total Payable:"}</span>
                <span className="text-[#FFD700]">৳{finalAmount}</span>
              </div>
            </div>

            {/* Coupon Code Input */}
            <div className="space-y-2 pt-3 border-t border-white/10 font-mono">
              <label className="text-[11px] font-bold text-gray-300 uppercase block flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#FFD700]" />
                <span>{isBn ? "প্রোমো / কুপন কোড (যদি থাকে):" : "Have a Promo Code?"}</span>
              </label>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCodeInput}
                  onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                  placeholder="e.g. MED1000"
                  className="flex-1 bg-black/60 border border-white/10 focus:border-[#FFD700] rounded-xl px-3 py-2 text-xs text-white uppercase placeholder-gray-600 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase rounded-xl border border-white/15 transition cursor-pointer"
                >
                  {isBn ? "প্রয়োগ" : "Apply"}
                </button>
              </div>

              {appliedCoupon && (
                <p className="text-[11px] text-emerald-400 font-bold">
                  ✓ {isBn ? `কুপন '${appliedCoupon.code}' সফলভাবে যোগ করা হয়েছে!` : `Coupon '${appliedCoupon.code}' applied successfully!`}
                </p>
              )}

              {couponError && (
                <p className="text-[11px] text-red-400 font-bold">
                  ⚠️ {couponError}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Payment Gateways & Verification Form */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 space-y-6 shadow-xl">
            <h3 className="text-sm font-black uppercase text-white font-mono border-b border-white/10 pb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <span>{isBn ? "পেমেন্ট মেথড নির্বাচন করুন" : "Select Payment Method"}</span>
            </h3>

            {/* Gateway Tabs */}
            <div className="grid grid-cols-3 gap-2 font-mono text-xs font-bold uppercase">
              {paymentSettings.isBkashEnabled && (
                <button
                  type="button"
                  onClick={() => {
                    playSound("click");
                    setPaymentMethod("bkash");
                  }}
                  className={`py-3 px-2 rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer ${
                    paymentMethod === "bkash"
                      ? "bg-[#D12053]/20 border-[#D12053] text-white shadow-[0_0_12px_rgba(209,32,83,0.3)]"
                      : "bg-black/40 border-white/10 text-gray-400 hover:text-white"
                  }`}
                >
                  <span className="text-sm font-black text-[#D12053]">bKash</span>
                  <span className="text-[9px] text-gray-400">
                    {paymentSettings.bkashType === "merchant" ? (isBn ? "পেমেন্ট" : "Payment") : (isBn ? "সেন্ড মানি" : "Send Money")}
                  </span>
                </button>
              )}

              {paymentSettings.isNagadEnabled && (
                <button
                  type="button"
                  onClick={() => {
                    playSound("click");
                    setPaymentMethod("nagad");
                  }}
                  className={`py-3 px-2 rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer ${
                    paymentMethod === "nagad"
                      ? "bg-[#F7931E]/20 border-[#F7931E] text-white shadow-[0_0_12px_rgba(247,147,30,0.3)]"
                      : "bg-black/40 border-white/10 text-gray-400 hover:text-white"
                  }`}
                >
                  <span className="text-sm font-black text-[#F7931E]">Nagad</span>
                  <span className="text-[9px] text-gray-400">
                    {paymentSettings.nagadType === "merchant" ? (isBn ? "পেমেন্ট" : "Payment") : (isBn ? "সেন্ড মানি" : "Send Money")}
                  </span>
                </button>
              )}

              {paymentSettings.isRocketEnabled && (
                <button
                  type="button"
                  onClick={() => {
                    playSound("click");
                    setPaymentMethod("rocket");
                  }}
                  className={`py-3 px-2 rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer ${
                    paymentMethod === "rocket"
                      ? "bg-purple-600/20 border-purple-500 text-white shadow-[0_0_12px_rgba(168,85,247,0.3)]"
                      : "bg-black/40 border-white/10 text-gray-400 hover:text-white"
                  }`}
                >
                  <span className="text-sm font-black text-purple-400">Rocket</span>
                  <span className="text-[9px] text-gray-400">{isBn ? "রকেট" : "Rocket"}</span>
                </button>
              )}
            </div>

            {/* Instruction Panel for bKash / Nagad / Rocket */}
            {paymentMethod !== "card" && (
              <div className="bg-black/50 border border-white/10 rounded-xl p-4 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between bg-white/[0.03] p-3 rounded-lg border border-white/5">
                  <div>
                    <span className="text-gray-400 text-[10px] block uppercase">
                      {paymentMethod.toUpperCase()} ({activeAccountType}):
                    </span>
                    <span className="text-base font-black text-[#FFD700] tracking-wider select-all">
                      {activeNumber || (isBn ? "নম্বর কনফিগার করা হয়নি" : "Not configured")}
                    </span>
                  </div>
                  {activeNumber && (
                    <button
                      type="button"
                      onClick={() => handleCopyNumber(activeNumber)}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span className="text-[10px]">{copiedNumber ? (isBn ? "কপি হয়েছে!" : "Copied!") : (isBn ? "কপি" : "Copy")}</span>
                    </button>
                  )}
                </div>

                <div className="space-y-1.5 text-gray-300 text-[11px] leading-relaxed">
                  <p className="font-bold text-white uppercase">{isBn ? "ধাপসমূহ (Payment Steps):" : "Instructions:"}</p>
                  <p>১. আপনার <strong>{paymentMethod.toUpperCase()}</strong> অ্যাপে যান।</p>
                  <p>
                    ২. <strong>{activeAccountType}</strong> সিলেক্ট করে ওপরের নম্বরে ঠিক <strong>৳{finalAmount}</strong> টাকা পাঠান।
                  </p>
                  <p>৩. ট্রানজেকশন সফল হলে পাওয়া <strong>TrxID</strong> এবং আপনার প্রেরক নম্বর নিচে ইনপুট দিন।</p>
                  {activeCustomInstruction && (
                    <p className="text-amber-300 font-semibold pt-1 border-t border-white/5">
                      💡 {activeCustomInstruction}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Payment Verification Form */}
            <form onSubmit={handleVerifyAndPay} className="space-y-4 font-mono text-xs">
              <div className="space-y-2">
                <label className="text-gray-300 font-bold uppercase text-[11px] block">
                  {isBn ? "আপনার প্রেরক মোবাইল / একাউন্ট নম্বর:" : "Your Sender Mobile / Account Number:"} *
                </label>
                <input
                  type="text"
                  required
                  value={senderNumber}
                  onChange={(e) => setSenderNumber(e.target.value)}
                  placeholder="017xxxxxxxx"
                  className="w-full bg-black/60 border border-white/10 focus:border-[#C1121F] rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none"
                />
              </div>

              {paymentMethod !== "card" && (
                <div className="space-y-2">
                  <label className="text-gray-300 font-bold uppercase text-[11px] block">
                    {isBn ? "ট্রানজেকশন আইডি (TrxID) / ডিপোজিট রেফারেন্স:" : "Transaction ID (TrxID):"} *
                  </label>
                  <input
                    type="text"
                    required
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value.toUpperCase())}
                    placeholder="e.g. 9J83KX2A"
                    className="w-full bg-black/60 border border-white/10 focus:border-[#C1121F] rounded-xl px-4 py-3 text-xs text-white uppercase placeholder-gray-600 focus:outline-none font-bold tracking-wider"
                  />
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-red-950/30 border border-red-500/30 rounded-xl text-red-400 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isVerifying}
                className="w-full py-4 bg-gradient-to-r from-[#C1121F] to-red-600 hover:from-red-600 hover:to-red-500 text-white font-black text-sm uppercase tracking-wider rounded-xl transition shadow-[0_0_20px_rgba(193,18,31,0.5)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#FFD700]" />
                    <span>{isBn ? "পেমেন্ট ভেরিফাই করা হচ্ছে..." : "Verifying Payment..."}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-[#FFD700]" />
                    <span>{isBn ? `৳${finalAmount} পেমেন্ট ভেরিফাই ও এনরোল করুন` : `VERIFY ৳${finalAmount} & ENROLL`}</span>
                  </>
                )}
              </button>
            </form>

            {/* Helpline & Official Support Contact */}
            <div className="pt-3 border-t border-white/10 space-y-2.5 font-mono text-[11px]">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-gray-400">
                <span>{isBn ? "পেমেন্ট নিয়ে কোনো প্রশ্ন বা সমস্যা?" : "Need help with payment?"}</span>
                {paymentSettings.helplineWhatsapp ? (
                  <a
                    href={`https://wa.me/${(() => {
                      const raw = paymentSettings.helplineWhatsapp.replace(/[^0-9]/g, "");
                      if (raw.startsWith("01")) return `88${raw}`;
                      return raw;
                    })()}?text=${encodeURIComponent(
                      isBn
                        ? `আসসালামু আলাইকুম, আমি MediBridge কোর্সে (${course.title}) এনরোলমেন্ট ও পেমেন্ট নিয়ে সহায়তা চাই।`
                        : `Hello MediBridge Support, I need assistance regarding enrollment for ${course.title}.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/40 text-emerald-400 hover:text-emerald-300 font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-400" />
                    <span>{isBn ? "হোয়াটসঅ্যাপ" : "WhatsApp"}: <strong className="text-white ml-0.5">{paymentSettings.helplineWhatsapp}</strong></span>
                  </a>
                ) : paymentSettings.helplinePhone ? (
                  <span className="text-gray-300 flex items-center gap-1 font-bold">
                    <PhoneCall className="w-3.5 h-3.5 text-amber-400" />
                    <span>{paymentSettings.helplinePhone}</span>
                  </span>
                ) : null}
              </div>

              {/* Official Email & Facebook Page Badges */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5 text-[10px] text-gray-400">
                <a
                  href="mailto:medibridgeedu@gmail.com"
                  className="flex items-center gap-1.5 text-gray-300 hover:text-white transition"
                >
                  <Mail className="w-3.5 h-3.5 text-red-400" />
                  <span>Email: <strong className="text-white">medibridgeedu@gmail.com</strong></span>
                </a>

                <a
                  href="https://facebook.com/medibridgeacademy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sky-300 hover:text-white transition"
                >
                  <Facebook className="w-3.5 h-3.5 text-[#1877F2]" />
                  <span>FB: <strong className="text-white">Medibridge Academy</strong></span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Automated Receipt Modal Popup upon Payment Request Submission */}
      {completedReceiptData && (
        <PaymentReceipt
          order={completedReceiptData.order}
          enrollment={completedReceiptData.enrollment}
          course={course}
          batch={batch}
          user={user}
          language={language}
          isModal={true}
          onClose={() => {
            onPaymentSuccess(completedReceiptData.order, completedReceiptData.enrollment);
          }}
          onGoToDashboard={() => {
            onPaymentSuccess(completedReceiptData.order, completedReceiptData.enrollment);
          }}
        />
      )}
    </div>
  );
}
