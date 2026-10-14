import React, { useState, useEffect } from "react";
import { db, handleFirestoreError, OperationType, isFirestoreQuotaExceeded, setFirestoreQuotaExhausted, isQuotaExceededError } from "../../lib/backend";
import {
  collection,
  query,
  onSnapshot,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  limit,
} from "../../lib/supabaseDb";
import { Coupon, CouponUsageLog, Course } from "../../types/courseTypes";
import { INITIAL_COURSES, INITIAL_COUPONS } from "../../data/coursesData";
import {
  Tag,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Calendar,
  DollarSign,
  Percent,
  Sparkles,
  Search,
  Filter,
  ShieldCheck,
  ShoppingBag,
  Clock,
  Edit3,
  Users,
  BookOpen,
  Layers,
  History,
  RotateCcw,
  BarChart3,
  ChevronRight,
  Eye,
  CheckSquare,
  Square,
  AlertCircle,
} from "lucide-react";
import { playSound } from "../../audio";

interface PromoCodeManagerProps {
  language?: "bn" | "en";
  theme?: "light" | "dark";
}

export default function PromoCodeManager({
  language = "bn",
  theme = "dark",
}: PromoCodeManagerProps) {
  const isBn = language === "bn";
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [courses, setCourses] = useState<Course[]>(INITIAL_COURSES);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "active" | "inactive">("all");
  const [filterCourseId, setFilterCourseId] = useState<string>("all");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"fixed" | "percentage">("fixed");
  const [discountValue, setDiscountValue] = useState<number>(500);
  const [minOrderAmount, setMinOrderAmount] = useState<number>(1000);
  const [expiryDate, setExpiryDate] = useState<string>("2027-12-31");
  const [maxUsage, setMaxUsage] = useState<number>(200);
  const [currentUsageCount, setCurrentUsageCount] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(true);
  
  // Course-Wise Scope State
  const [applicableScope, setApplicableScope] = useState<"all" | "specific">("all");
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Usage History Details Modal State
  const [viewingHistoryCoupon, setViewingHistoryCoupon] = useState<Coupon | null>(null);
  const [historySearchQuery, setHistorySearchQuery] = useState("");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // 1. Fetch available courses using cache-first approach
  useEffect(() => {
    // Check local courses cache first
    try {
      const cached = localStorage.getItem("medibridge_courses_cache");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCourses(parsed);
          return;
        }
      }
    } catch {}

    if (isFirestoreQuotaExceeded()) {
      setCourses(INITIAL_COURSES);
      return;
    }

    const qCourses = query(collection(db, "courses"), limit(50));
    getDocs(qCourses)
      .then((snapshot) => {
        if (!snapshot.empty) {
          const loadedCourses: Course[] = [];
          snapshot.forEach((d) => {
            loadedCourses.push({ id: d.id, ...d.data() } as Course);
          });
          setCourses(loadedCourses);
        } else {
          setCourses(INITIAL_COURSES);
        }
      })
      .catch((err) => {
        if (isQuotaExceededError(err)) {
          setFirestoreQuotaExhausted();
        }
        console.warn("Could not fetch courses for promocodes, fallback to static:", err);
        setCourses(INITIAL_COURSES);
      });
  }, []);

  // 2. Real-time listener on course_promocodes collection (limit 100)
  useEffect(() => {
    const qCoupons = query(collection(db, "course_promocodes"), limit(100));
    const unsubscribe = onSnapshot(
      qCoupons,
      (snapshot) => {
        if (!snapshot.empty) {
          const loaded: Coupon[] = [];
          snapshot.forEach((docSnap) => {
            loaded.push({
              id: docSnap.id,
              ...docSnap.data(),
            } as Coupon);
          });
          // Sort by active first, then newest
          loaded.sort((a, b) => (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0));
          setCoupons(loaded);
        } else {
          // If Firestore is empty, fallback to INITIAL_COUPONS
          setCoupons(INITIAL_COUPONS);
        }
        setLoading(false);
      },
      (err) => {
        console.warn("Error fetching promocodes from Firestore, using initial:", err.message);
        handleFirestoreError(err, OperationType.LIST, "course_promocodes");
        setCoupons(INITIAL_COUPONS);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleCopy = (couponCode: string) => {
    navigator.clipboard.writeText(couponCode);
    setCopiedCode(couponCode);
    playSound("click");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleToggleStatus = async (coupon: Coupon) => {
    try {
      playSound("click");
      const ref = doc(db, "course_promocodes", coupon.id);
      await updateDoc(ref, {
        isActive: !coupon.isActive,
      });
      showToast(
        !coupon.isActive
          ? `Promo code ${coupon.code} activated!`
          : `Promo code ${coupon.code} paused!`
      );
    } catch (err: any) {
      console.error("Error toggling promo status:", err);
      // Fallback local update if mock
      setCoupons((prev) =>
        prev.map((c) => (c.id === coupon.id ? { ...c, isActive: !c.isActive } : c))
      );
      showToast(`Promo code ${coupon.code} status updated!`);
    }
  };

  const handleDelete = async (coupon: Coupon) => {
    if (
      !confirm(
        isBn
          ? `আপনি কি নিশ্চিত যে "${coupon.code}" প্রোমো কোডটি মুছে ফেলতে চান?`
          : `Are you sure you want to permanently delete promo code "${coupon.code}"?`
      )
    )
      return;

    try {
      playSound("click");
      await deleteDoc(doc(db, "course_promocodes", coupon.id));
      showToast(`Promo code ${coupon.code} deleted successfully.`);
    } catch (err: any) {
      console.error("Error deleting promo code:", err);
      setCoupons((prev) => prev.filter((c) => c.id !== coupon.id));
      showToast(`Promo code ${coupon.code} deleted.`);
    }
  };

  const handleResetUsageCount = async (coupon: Coupon) => {
    if (
      !confirm(
        isBn
          ? `"${coupon.code}" প্রোমো কোডের ব্যবহারের সংখ্যা (${coupon.usageCount || 0}) রিসেট করে ০ (শূন্য) করতে চান?`
          : `Do you want to reset the usage count of promo code "${coupon.code}" (${coupon.usageCount || 0}) back to 0?`
      )
    )
      return;

    try {
      playSound("click");
      const ref = doc(db, "course_promocodes", coupon.id);
      await updateDoc(ref, {
        usageCount: 0,
        totalDiscountGiven: 0,
        usageLogs: [],
      });
      showToast(`Usage counter for ${coupon.code} reset to 0.`);
      if (viewingHistoryCoupon?.id === coupon.id) {
        setViewingHistoryCoupon({
          ...viewingHistoryCoupon,
          usageCount: 0,
          totalDiscountGiven: 0,
          usageLogs: [],
        });
      }
    } catch (err: any) {
      console.warn("Could not reset usage on Firestore, updating local state:", err);
      setCoupons((prev) =>
        prev.map((c) =>
          c.id === coupon.id
            ? { ...c, usageCount: 0, totalDiscountGiven: 0, usageLogs: [] }
            : c
        )
      );
      showToast(`Usage counter for ${coupon.code} reset to 0.`);
    }
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCouponId(coupon.id);
    setCode(coupon.code);
    setDiscountType(coupon.discountType);
    setDiscountValue(coupon.discountValue);
    setMinOrderAmount(coupon.minOrderAmount || 0);
    setExpiryDate(coupon.expiryDate || "2027-12-31");
    setMaxUsage(coupon.maxUsage || 200);
    setCurrentUsageCount(coupon.usageCount || 0);
    setIsActive(coupon.isActive);

    // Course Wise scope
    if (coupon.applicableScope === "specific" || (Array.isArray(coupon.applicableCourseIds) && !coupon.applicableCourseIds.includes("all") && coupon.applicableCourseIds.length > 0)) {
      setApplicableScope("specific");
      setSelectedCourseIds(coupon.applicableCourseIds || []);
    } else {
      setApplicableScope("all");
      setSelectedCourseIds([]);
    }

    setIsFormOpen(true);
    playSound("click");
  };

  const handleResetForm = () => {
    setEditingCouponId(null);
    setCode("");
    setDiscountType("fixed");
    setDiscountValue(500);
    setMinOrderAmount(1000);
    setExpiryDate("2027-12-31");
    setMaxUsage(200);
    setCurrentUsageCount(0);
    setIsActive(true);
    setApplicableScope("all");
    setSelectedCourseIds([]);
    setIsFormOpen(false);
  };

  const toggleCourseSelection = (courseId: string) => {
    setSelectedCourseIds((prev) =>
      prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId]
    );
    playSound("click");
  };

  const handleSavePromoCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase().replace(/\s+/g, "");
    if (!cleanCode) {
      alert(isBn ? "প্রোমো কোড নাম লিখুন!" : "Please enter a valid promo code!");
      return;
    }
    if (discountValue <= 0) {
      alert(isBn ? "সঠিক ডিসকাউন্ট পরিমাণ দিন!" : "Discount value must be greater than 0!");
      return;
    }

    if (applicableScope === "specific" && selectedCourseIds.length === 0) {
      alert(
        isBn
          ? "অনুগ্রহ করে কমপক্ষে একটি কোর্স সিলেক্ট করুন অথবা 'সকল কোর্স' অপশন নির্বাচন করুন!"
          : "Please select at least one course or choose 'All Courses'!"
      );
      return;
    }

    setIsSubmitting(true);

    // Get titles of selected courses for convenience
    const selectedCourseTitles =
      applicableScope === "all"
        ? ["সকল কোর্স (All Courses)"]
        : courses
            .filter((c) => selectedCourseIds.includes(c.id))
            .map((c) => c.title);

    try {
      const payload: Omit<Coupon, "id"> = {
        code: cleanCode,
        discountType,
        discountValue: Number(discountValue),
        minOrderAmount: Number(minOrderAmount) || 0,
        expiryDate: expiryDate || "2027-12-31",
        usageCount: Number(currentUsageCount) || 0,
        maxUsage: Number(maxUsage) || 500,
        isActive,
        applicableScope,
        applicableCourseIds: applicableScope === "all" ? ["all"] : selectedCourseIds,
        applicableCourseTitles: selectedCourseTitles,
      };

      if (editingCouponId) {
        await updateDoc(doc(db, "course_promocodes", editingCouponId), {
          ...payload,
          updatedAt: serverTimestamp(),
        });
        showToast(`Promo code ${cleanCode} updated successfully!`);
      } else {
        await addDoc(collection(db, "course_promocodes"), {
          ...payload,
          totalDiscountGiven: 0,
          usageLogs: [],
          createdAt: serverTimestamp(),
        });
        showToast(`New Promo code ${cleanCode} created successfully!`);
      }

      playSound("correct");
      handleResetForm();
    } catch (err: any) {
      console.error("Error saving promo code:", err);
      // Local fallback in case of Firestore permissions
      const newCouponItem: Coupon = {
        id: editingCouponId || `coup_${Date.now()}`,
        code: cleanCode,
        discountType,
        discountValue: Number(discountValue),
        minOrderAmount: Number(minOrderAmount) || 0,
        expiryDate: expiryDate || "2027-12-31",
        usageCount: Number(currentUsageCount) || 0,
        maxUsage: Number(maxUsage) || 500,
        isActive,
        applicableScope,
        applicableCourseIds: applicableScope === "all" ? ["all"] : selectedCourseIds,
        applicableCourseTitles: selectedCourseTitles,
      };
      setCoupons((prev) =>
        editingCouponId
          ? prev.map((c) => (c.id === editingCouponId ? newCouponItem : c))
          : [newCouponItem, ...prev]
      );
      showToast(`Promo code ${cleanCode} saved!`);
      handleResetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Preset Handlers
  const applyPreset = (
    presetCode: string,
    type: "fixed" | "percentage",
    val: number,
    min: number
  ) => {
    setCode(presetCode);
    setDiscountType(type);
    setDiscountValue(val);
    setMinOrderAmount(min);
    playSound("click");
  };

  // Filtered List
  const filteredCoupons = coupons.filter((c) => {
    const q = (searchQuery || "").toLowerCase().trim();
    const matchesSearch =
      !q ||
      (c.code || "").toLowerCase().includes(q) ||
      (Array.isArray(c.applicableCourseTitles) &&
        c.applicableCourseTitles.some((t) =>
          (t || "").toLowerCase().includes(q)
        ));
    const matchesFilter =
      filterType === "all" ||
      (filterType === "active" && c.isActive) ||
      (filterType === "inactive" && !c.isActive);

    const matchesCourse =
      filterCourseId === "all" ||
      c.applicableScope === "all" ||
      (Array.isArray(c.applicableCourseIds) && c.applicableCourseIds.includes("all")) ||
      (Array.isArray(c.applicableCourseIds) && c.applicableCourseIds.includes(filterCourseId));

    return matchesSearch && matchesFilter && matchesCourse;
  });

  // Calculate Aggregates
  const totalRedemptions = coupons.reduce((sum, c) => sum + (c.usageCount || 0), 0);
  const totalDiscountGiven = coupons.reduce(
    (sum, c) =>
      sum +
      (c.totalDiscountGiven ||
        (Array.isArray(c.usageLogs)
          ? c.usageLogs.reduce((lSum, l) => lSum + (l.discountAmount || 0), 0)
          : (c.usageCount || 0) * (c.discountType === "fixed" ? c.discountValue : 500))),
    0
  );
  const activeCouponsCount = coupons.filter((c) => c.isActive).length;
  const courseSpecificCount = coupons.filter(
    (c) =>
      c.applicableScope === "specific" ||
      (Array.isArray(c.applicableCourseIds) && !c.applicableCourseIds.includes("all") && c.applicableCourseIds.length > 0)
  ).length;

  return (
    <div id="promocode_manager_root" className="flex flex-col gap-6">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white font-mono text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce border border-emerald-400">
          <CheckCircle2 className="w-4 h-4" /> {toastMsg}
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-red-950/50 via-[#121622] to-black rounded-2xl p-6 border border-red-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-red-500 via-[#FFD700] to-red-500"></div>
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#FFD700] uppercase tracking-wider">
            <Tag className="w-4 h-4 text-[#FFD700]" />
            {isBn ? "কোর্স ডিসকাউন্ট ও কুপন কন্ট্রোল প্যানেল" : "COURSE PROMO CODES & DISCOUNT CONTROL"}
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-white uppercase mt-1 font-display tracking-tight flex items-center gap-2.5">
            {isBn ? "প্রোমো কোড ও ছাড় ব্যবস্থাপনা" : "PROMO CODES & DISCOUNT MANAGER"}
          </h2>
          <p className="text-xs text-gray-400 font-mono mt-1 max-w-2xl">
            {isBn
              ? "যেকোনো নির্দিষ্ট কোর্স বা সকল কোর্সের জন্য আলাদা প্রোমো কোড তৈরি করুন, কতবার ব্যবহার হয়েছে তা রিয়েল-টাইমে ট্র্যাক করুন এবং শিক্ষার্থীদের জন্য ছাড় নির্ধারণ করুন।"
              : "Create course-specific or platform-wide promo codes, monitor real-time usage counts, and manage flat/percentage student discounts."}
          </p>
        </div>

        <button
          id="btn_create_promocode"
          onClick={() => {
            if (isFormOpen) {
              handleResetForm();
            } else {
              setIsFormOpen(true);
              playSound("click");
            }
          }}
          className="px-5 py-3 bg-[#C1121F] hover:bg-red-700 text-white font-black uppercase text-xs tracking-wider rounded-xl transition duration-300 font-mono shadow-lg flex items-center gap-2 shrink-0 self-start md:self-auto hover:shadow-red-600/30 hover:scale-105 active:scale-95"
        >
          {isFormOpen ? (
            <>
              <XCircle className="w-4 h-4" /> {isBn ? "ফর্ম বন্ধ করুন" : "CLOSE FORM"}
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" /> {isBn ? "নতুন প্রোমো কোড তৈরি করুন" : "CREATE NEW PROMO CODE"}
            </>
          )}
        </button>
      </div>

      {/* Analytics & Metrics Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Redemptions / Times Used */}
        <div className="bg-[#111522] border border-amber-500/20 rounded-2xl p-4 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-gray-400 uppercase font-bold">
              {isBn ? "মোট ব্যবহার সংখ্যা" : "Total Times Used"}
            </span>
            <div className="p-2 bg-amber-950/60 text-[#FFD700] rounded-xl border border-amber-500/30">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono mt-2">
            {totalRedemptions} <span className="text-xs text-amber-400 font-normal">{isBn ? "বার" : "times"}</span>
          </div>
          <div className="text-[11px] text-gray-400 font-mono mt-1 flex items-center gap-1">
            <span className="text-emerald-400 font-bold">●</span> {isBn ? "শিক্ষার্থীদের সফল রিডেম্পশন" : "Successful student redemptions"}
          </div>
        </div>

        {/* Total Student Savings */}
        <div className="bg-[#111522] border border-emerald-500/20 rounded-2xl p-4 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-gray-400 uppercase font-bold">
              {isBn ? "মোট সাশ্রয়কৃত ছাড়" : "Total Discount Given"}
            </span>
            <div className="p-2 bg-emerald-950/60 text-emerald-400 rounded-xl border border-emerald-500/30">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono mt-2">
            ৳{totalDiscountGiven.toLocaleString()}
          </div>
          <div className="text-[11px] text-gray-400 font-mono mt-1 flex items-center gap-1">
            <span className="text-emerald-400 font-bold">●</span> {isBn ? "কোর্স ফি থেকে ছাড়" : "Saved by enrolled students"}
          </div>
        </div>

        {/* Active Codes */}
        <div className="bg-[#111522] border border-blue-500/20 rounded-2xl p-4 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-gray-400 uppercase font-bold">
              {isBn ? "সক্রিয় প্রোমো কোড" : "Active Promo Codes"}
            </span>
            <div className="p-2 bg-blue-950/60 text-blue-400 rounded-xl border border-blue-500/30">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono mt-2">
            {activeCouponsCount} <span className="text-xs text-gray-400 font-normal">/ {coupons.length}</span>
          </div>
          <div className="text-[11px] text-gray-400 font-mono mt-1">
            {coupons.length - activeCouponsCount} {isBn ? "টি কোড সাময়িক স্থগিত" : "paused codes"}
          </div>
        </div>

        {/* Course-Specific Codes */}
        <div className="bg-[#111522] border border-purple-500/20 rounded-2xl p-4 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-gray-400 uppercase font-bold">
              {isBn ? "কোর্স-ভিত্তিক কোড" : "Course-Wise Codes"}
            </span>
            <div className="p-2 bg-purple-950/60 text-purple-400 rounded-xl border border-purple-500/30">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-300 font-mono mt-2">
            {courseSpecificCount} <span className="text-xs text-gray-400 font-normal">{isBn ? "টি নির্দিষ্ট" : "specific"}</span>
          </div>
          <div className="text-[11px] text-gray-400 font-mono mt-1">
            {coupons.length - courseSpecificCount} {isBn ? "টি সকল কোর্সে প্রযোজ্য" : "all-course codes"}
          </div>
        </div>
      </div>

      {/* Promo Code Form Modal / Accordion */}
      {isFormOpen && (
        <div className="bg-[#141824] border-2 border-red-500/40 rounded-2xl p-6 shadow-2xl space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-red-950/80 rounded-xl border border-red-500/40 text-[#FFD700]">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-wider font-display">
                  {editingCouponId
                    ? isBn
                      ? "প্রোমো কোড সম্পাদনা করুন"
                      : "EDIT PROMO CODE"
                    : isBn
                    ? "নতুন কোর্স প্রোমো কোড যোগ করুন"
                    : "ADD NEW COURSE PROMO CODE"}
                </h3>
                <span className="text-xs font-mono text-gray-400">
                  {isBn
                    ? "কোর্স স্পেসিফিক ছাড়, ব্যবহারের সীমা এবং তারিখ সেট করুন"
                    : "Configure course restrictions, discount values, and usage limits"}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Presets */}
          {!editingCouponId && (
            <div>
              <label className="text-[11px] font-mono font-bold text-gray-400 uppercase block mb-2">
                ⚡ {isBn ? "দ্রুত প্রিসেট টেমপ্লেট বেছে নিন" : "QUICK PRESET TEMPLATES"}:
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset("MEDIC500", "fixed", 500, 1000)}
                  className="px-3 py-1.5 bg-black/60 hover:bg-red-950/60 border border-white/10 hover:border-red-500 rounded-lg text-xs font-mono text-gray-300 hover:text-white transition"
                >
                  ৳500 Flat Off (MEDIC500)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("DOCTOR1000", "fixed", 1000, 1500)}
                  className="px-3 py-1.5 bg-black/60 hover:bg-red-950/60 border border-white/10 hover:border-red-500 rounded-lg text-xs font-mono text-gray-300 hover:text-white transition"
                >
                  ৳1,000 Mega Off (DOCTOR1000)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("BIO2027", "fixed", 600, 2000)}
                  className="px-3 py-1.5 bg-black/60 hover:bg-purple-950/60 border border-purple-500/30 hover:border-purple-500 rounded-lg text-xs font-mono text-purple-300 hover:text-white transition"
                >
                  🎯 ৳600 Course Special (BIO2027)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("SPECIAL20", "percentage", 20, 500)}
                  className="px-3 py-1.5 bg-black/60 hover:bg-red-950/60 border border-white/10 hover:border-red-500 rounded-lg text-xs font-mono text-gray-300 hover:text-white transition"
                >
                  20% Off (SPECIAL20)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("HALFPRICE50", "percentage", 50, 1000)}
                  className="px-3 py-1.5 bg-black/60 hover:bg-red-950/60 border border-white/10 hover:border-red-500 rounded-lg text-xs font-mono text-gray-300 hover:text-white transition"
                >
                  50% Half Price (HALFPRICE50)
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSavePromoCode} className="space-y-5">
            {/* Primary Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Promo Code Name */}
              <div>
                <label className="text-xs font-mono font-bold text-gray-300 uppercase block mb-1.5">
                  {isBn ? "প্রোমো কোড নাম (English / Uppercase)" : "Promo Code Name"} *
                </label>
                <div className="relative">
                  <Tag className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. MEDIC500, MAT2027"
                    className="w-full bg-black/80 border border-white/20 rounded-xl pl-9 pr-3 py-2.5 text-sm font-mono font-black text-[#FFD700] tracking-wider uppercase focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Discount Type */}
              <div>
                <label className="text-xs font-mono font-bold text-gray-300 uppercase block mb-1.5">
                  {isBn ? "ছাড়ের ধরন (Discount Type)" : "Discount Type"} *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDiscountType("fixed")}
                    className={`py-2.5 px-3 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-1.5 border transition ${
                      discountType === "fixed"
                        ? "bg-[#C1121F] text-white border-red-500 shadow-md"
                        : "bg-black/60 text-gray-400 border-white/10 hover:text-white"
                    }`}
                  >
                    <DollarSign className="w-4 h-4" />
                    {isBn ? "টাকা ছাড় (৳ TK)" : "Fixed (৳ TK)"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType("percentage")}
                    className={`py-2.5 px-3 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-1.5 border transition ${
                      discountType === "percentage"
                        ? "bg-[#C1121F] text-white border-red-500 shadow-md"
                        : "bg-black/60 text-gray-400 border-white/10 hover:text-white"
                    }`}
                  >
                    <Percent className="w-4 h-4" />
                    {isBn ? "শতাংশ ছাড় (%)" : "Percentage (%)"}
                  </button>
                </div>
              </div>

              {/* Discount Value */}
              <div>
                <label className="text-xs font-mono font-bold text-gray-300 uppercase block mb-1.5">
                  {discountType === "fixed"
                    ? isBn
                      ? "কত টাকা ছাড় (৳ TK Off)"
                      : "Discount Amount (৳ TK Off)"
                    : isBn
                    ? "কত শতাংশ ছাড় (% Off)"
                    : "Discount Percentage (% Off)"}{" "}
                  *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-gray-400">
                    {discountType === "fixed" ? "৳" : "%"}
                  </span>
                  <input
                    type="number"
                    required
                    min={1}
                    max={discountType === "percentage" ? 100 : 50000}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    placeholder={discountType === "fixed" ? "500" : "20"}
                    className="w-full bg-black/80 border border-white/20 rounded-xl pl-9 pr-3 py-2.5 text-sm font-mono font-bold text-emerald-400 focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Minimum Order Amount */}
              <div>
                <label className="text-xs font-mono font-bold text-gray-300 uppercase block mb-1.5">
                  {isBn ? "নূন্যতম কোর্স মূল্য (Min Order ৳)" : "Minimum Order Amount (৳)"}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-gray-400">
                    ৳
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={minOrderAmount}
                    onChange={(e) => setMinOrderAmount(Number(e.target.value))}
                    placeholder="1000"
                    className="w-full bg-black/80 border border-white/20 rounded-xl pl-9 pr-3 py-2.5 text-sm font-mono text-white focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Expiry Date */}
              <div>
                <label className="text-xs font-mono font-bold text-gray-300 uppercase block mb-1.5">
                  {isBn ? "মেয়াদ উত্তীর্ণের তারিখ (Expiry Date)" : "Expiry Date"}
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full bg-black/80 border border-white/20 rounded-xl pl-9 pr-3 py-2.5 text-sm font-mono text-white focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Max Uses & Initial Usage Count */}
              <div>
                <label className="text-xs font-mono font-bold text-gray-300 uppercase block mb-1.5">
                  {isBn ? "সর্বোচ্চ কতবার ব্যবহারযোগ্য (Max Uses)" : "Maximum Uses Limit"} *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input
                      type="number"
                      min={1}
                      value={maxUsage}
                      onChange={(e) => setMaxUsage(Number(e.target.value))}
                      placeholder="200"
                      className="w-full bg-black/80 border border-white/20 rounded-xl px-3 py-2.5 text-sm font-mono text-white focus:border-red-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-gray-500 font-mono block mt-1">
                      {isBn ? "সর্বোচ্চ সীমা" : "Max Limit"}
                    </span>
                  </div>
                  <div>
                    <input
                      type="number"
                      min={0}
                      value={currentUsageCount}
                      onChange={(e) => setCurrentUsageCount(Number(e.target.value))}
                      placeholder="0"
                      className="w-full bg-black/80 border border-white/20 rounded-xl px-3 py-2.5 text-sm font-mono text-amber-400 focus:border-red-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-gray-500 font-mono block mt-1">
                      {isBn ? "বর্তমান ব্যবহার" : "Current Used"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Course-Wise Scope Selector (COURSE WISE ALADA PROMO CODE) */}
            <div className="bg-black/50 border border-white/10 rounded-xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-purple-400" />
                  <label className="text-xs font-mono font-bold text-white uppercase">
                    {isBn
                      ? "কোর্স প্রযোজ্যতা (Course Scope / Course Wise Assignment):"
                      : "Course-Wise Assignment Scope:"}
                  </label>
                </div>
                <span className="text-[11px] font-mono text-gray-400">
                  {applicableScope === "all"
                    ? isBn
                      ? "সকল কোর্সে এই প্রোমো কোড চলবে"
                      : "Applicable to all courses"
                    : isBn
                    ? `নির্দিষ্ট ${selectedCourseIds.length} টি কোর্সে প্রযোজ্য`
                    : `Restricted to ${selectedCourseIds.length} selected course(s)`}
                </span>
              </div>

              {/* Scope Radio / Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setApplicableScope("all");
                    setSelectedCourseIds([]);
                    playSound("click");
                  }}
                  className={`p-3 rounded-xl border text-left flex items-start gap-3 transition ${
                    applicableScope === "all"
                      ? "bg-emerald-950/40 border-emerald-500 text-white shadow-lg"
                      : "bg-black/40 border-white/10 text-gray-400 hover:text-white"
                  }`}
                >
                  <div className="mt-0.5">
                    {applicableScope === "all" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-gray-600" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                      🌐 {isBn ? "সকল কোর্সে প্রযোজ্য (All Courses)" : "All Courses (Global Promo)"}
                    </div>
                    <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                      {isBn
                        ? "যেকোনো কোর্সে ভর্তি হওয়ার সময় ছাত্র-ছাত্রীরা এই কোড ব্যবহার করতে পারবে।"
                        : "Students can use this promo code on any course across the platform."}
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setApplicableScope("specific");
                    playSound("click");
                  }}
                  className={`p-3 rounded-xl border text-left flex items-start gap-3 transition ${
                    applicableScope === "specific"
                      ? "bg-purple-950/40 border-purple-500 text-white shadow-lg"
                      : "bg-black/40 border-white/10 text-gray-400 hover:text-white"
                  }`}
                >
                  <div className="mt-0.5">
                    {applicableScope === "specific" ? (
                      <CheckCircle2 className="w-4 h-4 text-purple-400" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-gray-600" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-mono font-bold text-purple-300 flex items-center gap-1.5">
                      🎯 {isBn ? "নির্দিষ্ট কোর্স সিলেক্ট করুন (Course-Specific)" : "Specific Courses Only"}
                    </div>
                    <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                      {isBn
                        ? "শুধুমাত্র আপনার সিলেক্ট করা কোর্সের চেকআউটেই এই কোডটি ছাড় প্রদান করবে।"
                        : "Discount is strictly locked to the selected course(s)."}
                    </div>
                  </div>
                </button>
              </div>

              {/* Course Selection Checkboxes if Specific */}
              {applicableScope === "specific" && (
                <div className="pt-2 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-gray-300">
                    <span>{isBn ? "কোর্স নির্বাচন করুন:" : "Select Applicable Courses:"}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedCourseIds(courses.map((c) => c.id))}
                        className="text-[11px] text-blue-400 hover:underline"
                      >
                        {isBn ? "সব সিলেক্ট করুন" : "Select All"}
                      </button>
                      <span>|</span>
                      <button
                        type="button"
                        onClick={() => setSelectedCourseIds([])}
                        className="text-[11px] text-gray-400 hover:underline"
                      >
                        {isBn ? "সব বাতিল করুন" : "Clear All"}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                    {courses.map((c) => {
                      const isSelected = selectedCourseIds.includes(c.id);
                      return (
                        <div
                          key={c.id}
                          onClick={() => toggleCourseSelection(c.id)}
                          className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center gap-2.5 select-none ${
                            isSelected
                              ? "bg-purple-950/60 border-purple-500 text-white"
                              : "bg-black/60 border-white/10 text-gray-400 hover:border-white/30"
                          }`}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-purple-400 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-600 shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-mono font-bold truncate">
                              {c.title}
                            </div>
                            <div className="text-[10px] font-mono text-gray-500 flex items-center gap-2">
                              <span>৳{c.discountedPrice || c.originalPrice}</span>
                              <span>•</span>
                              <span>{c.subjects?.slice(0, 2).join(", ")}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Active Status Checkbox */}
            <div className="flex items-center gap-3 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-red-600 focus:ring-red-500 bg-black border-gray-700"
                />
                <span className="text-xs font-mono font-bold text-white">
                  {isBn ? "এই কোডটি সক্রিয় রাখুন (Active Status)" : "Set promo code as Active immediately"}
                </span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={handleResetForm}
                className="px-4 py-2.5 rounded-xl border border-white/20 text-gray-300 hover:text-white hover:bg-white/5 font-mono text-xs font-bold transition"
              >
                {isBn ? "বাতিল" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-bold uppercase rounded-xl transition shadow-lg flex items-center gap-2 disabled:opacity-50 hover:shadow-emerald-600/30"
              >
                <CheckCircle2 className="w-4 h-4" />
                {editingCouponId
                  ? isBn
                    ? "আপডেট সংরক্ষণ করুন"
                    : "UPDATE PROMO CODE"
                  : isBn
                  ? "প্রোমো কোড প্রকাশ করুন"
                  : "SAVE PROMO CODE"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-[#111111] p-4 rounded-2xl border border-white/10 flex flex-col lg:flex-row items-center justify-between gap-4 shadow-lg">
        {/* Search */}
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isBn ? "প্রোমো কোড বা কোর্স খুঁজুন..." : "Search promo code or course..."}
            className="w-full bg-black/60 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-gray-500 focus:border-red-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Course-Wise Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={filterCourseId}
              onChange={(e) => setFilterCourseId(e.target.value)}
              className="bg-black/70 border border-white/15 text-xs font-mono text-gray-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-red-500"
            >
              <option value="all">{isBn ? "সকল কোর্স (All Courses)" : "All Courses"}</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filters */}
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setFilterType("all")}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition ${
                filterType === "all"
                  ? "bg-[#C1121F] text-white shadow-md"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {isBn ? "সকল" : "All"} ({coupons.length})
            </button>
            <button
              onClick={() => setFilterType("active")}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition ${
                filterType === "active"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {isBn ? "সক্রিয়" : "Active"} ({coupons.filter((c) => c.isActive).length})
            </button>
            <button
              onClick={() => setFilterType("inactive")}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition ${
                filterType === "inactive"
                  ? "bg-gray-700 text-white shadow-md"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {isBn ? "স্থগিত" : "Paused"} ({coupons.filter((c) => !c.isActive).length})
            </button>
          </div>
        </div>
      </div>

      {/* Coupons List */}
      {loading ? (
        <div className="text-center py-12 font-mono text-xs text-gray-400 animate-pulse">
          ⏳ {isBn ? "প্রোমো কোড ডাটা লোড হচ্ছে..." : "Loading promo codes from database..."}
        </div>
      ) : filteredCoupons.length === 0 ? (
        <div className="bg-[#111111] border border-dashed border-white/10 rounded-2xl p-12 text-center space-y-3">
          <Tag className="w-10 h-10 text-gray-600 mx-auto" />
          <h4 className="text-sm font-bold text-gray-300 uppercase font-mono">
            {isBn ? "কোনো প্রোমো কোড পাওয়া যায়নি" : "No Promo Codes Found"}
          </h4>
          <p className="text-xs text-gray-500 font-mono max-w-sm mx-auto">
            {isBn
              ? "উপরে 'নতুন প্রোমো কোড তৈরি করুন' বাটনে ক্লিক করে কোর্সের জন্য নতুন ডিসকাউন্ট কোড যুক্ত করুন।"
              : "Click 'Create New Promo Code' above to add discounts for student enrollments."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCoupons.map((coupon) => {
            const isCopied = copiedCode === coupon.code;
            const usageCount = coupon.usageCount || 0;
            const max = coupon.maxUsage || 500;
            const usagePct = Math.min(100, Math.round((usageCount / max) * 100));

            // Course applicability badge info
            const isSpecific =
              coupon.applicableScope === "specific" ||
              (Array.isArray(coupon.applicableCourseIds) &&
                !coupon.applicableCourseIds.includes("all") &&
                coupon.applicableCourseIds.length > 0);

            return (
              <div
                key={coupon.id}
                className={`bg-[#111522] border rounded-2xl p-5 space-y-4 relative overflow-hidden transition duration-300 hover:border-red-500/50 flex flex-col justify-between shadow-lg ${
                  coupon.isActive ? "border-white/10" : "border-white/5 opacity-60"
                }`}
              >
                {/* Status Indicator Stripe */}
                <div
                  className={`absolute top-0 inset-x-0 h-1 ${
                    coupon.isActive ? "bg-emerald-500" : "bg-gray-600"
                  }`}
                />

                <div className="space-y-4">
                  {/* Top Badge & Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-black/60 border border-yellow-500/30 rounded-lg text-sm font-mono font-black text-[#FFD700] tracking-wider uppercase shadow-inner">
                        {coupon.code}
                      </span>
                      <button
                        onClick={() => handleCopy(coupon.code)}
                        title="Copy code"
                        className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white transition"
                      >
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                        coupon.isActive
                          ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40"
                          : "bg-gray-800 text-gray-400 border border-gray-700"
                      }`}
                    >
                      {coupon.isActive ? "Active" : "Paused"}
                    </span>
                  </div>

                  {/* Discount Display */}
                  <div className="bg-black/40 rounded-xl p-3 border border-white/5 flex items-center justify-between">
                    <span className="text-xs font-mono text-gray-400">
                      {isBn ? "ছাড়ের পরিমাণ:" : "Discount Amount:"}
                    </span>
                    <span className="text-lg font-black font-mono text-emerald-400">
                      {coupon.discountType === "fixed"
                        ? `৳${coupon.discountValue} OFF`
                        : `${coupon.discountValue}% OFF`}
                    </span>
                  </div>

                  {/* Course Wise Badge (COURSE WISE ALADA PROMO CODE) */}
                  <div className="bg-black/30 rounded-xl p-2.5 border border-white/5 space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-gray-400 flex items-center gap-1">
                        <BookOpen className="w-3 h-3 text-purple-400" /> {isBn ? "কোর্স:" : "Course:"}
                      </span>
                      {isSpecific ? (
                        <span className="px-1.5 py-0.5 bg-purple-950/70 border border-purple-500/40 text-purple-300 rounded text-[10px] font-bold">
                          🎯 {isBn ? "নির্দিষ্ট কোর্স" : "Specific Course"}
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-emerald-950/70 border border-emerald-500/40 text-emerald-400 rounded text-[10px] font-bold">
                          🌐 {isBn ? "সকল কোর্স" : "All Courses"}
                        </span>
                      )}
                    </div>
                    {isSpecific && coupon.applicableCourseTitles && coupon.applicableCourseTitles.length > 0 && (
                      <div className="text-[11px] font-mono text-gray-300 font-bold truncate">
                        {coupon.applicableCourseTitles.join(", ")}
                      </div>
                    )}
                  </div>

                  {/* PROMO CODE USAGE TRACKING (KOYBAR USE HOISE) */}
                  <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-amber-300 font-bold flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-amber-400" />
                        {isBn ? "ব্যবহারের সংখ্যা:" : "Times Used:"}
                      </span>
                      <span className="text-white font-black font-mono">
                        {usageCount} / {max} <span className="text-gray-400 font-normal">({usagePct}%)</span>
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-black/60 h-2 rounded-full overflow-hidden border border-white/5">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          usagePct >= 90
                            ? "bg-red-500"
                            : usagePct >= 60
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${usagePct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono pt-1">
                      <span className="text-gray-400">
                        {isBn ? `বাকি আছে: ${Math.max(0, max - usageCount)} বার` : `Left: ${Math.max(0, max - usageCount)} uses`}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setViewingHistoryCoupon(coupon);
                          playSound("click");
                        }}
                        className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 hover:underline"
                      >
                        <History className="w-3 h-3" /> {isBn ? "লগ দেখুন" : "View Logs"}
                      </button>
                    </div>
                  </div>

                  {/* Details Meta */}
                  <div className="space-y-1.5 text-[11px] font-mono text-gray-400">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <ShoppingBag className="w-3 h-3 text-gray-500" /> Min Order:
                      </span>
                      <span className="text-gray-200">
                        {coupon.minOrderAmount > 0 ? `৳${coupon.minOrderAmount}` : "None (৳0)"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-500" /> Expiry:
                      </span>
                      <span className="text-gray-200">{coupon.expiryDate || "No Expiry"}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-3 border-t border-white/5 mt-3">
                  <button
                    onClick={() => handleToggleStatus(coupon)}
                    className={`text-xs font-mono font-bold px-3 py-1.5 rounded-lg border transition ${
                      coupon.isActive
                        ? "border-amber-500/30 text-amber-400 hover:bg-amber-950/40"
                        : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/40"
                    }`}
                  >
                    {coupon.isActive
                      ? isBn
                        ? "স্থগিত করুন"
                        : "Pause"
                      : isBn
                      ? "সক্রিয় করুন"
                      : "Activate"}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleResetUsageCount(coupon)}
                      title={isBn ? "ব্যবহারের সংখ্যা ০ রিসেট করুন" : "Reset usage counter to 0"}
                      className="p-1.5 hover:bg-amber-950/40 text-gray-400 hover:text-amber-400 rounded-lg transition"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(coupon)}
                      title="Edit promo code"
                      className="p-1.5 hover:bg-blue-950/40 text-gray-400 hover:text-blue-400 rounded-lg transition"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(coupon)}
                      title="Delete promo code"
                      className="p-1.5 hover:bg-red-950/40 text-gray-400 hover:text-red-400 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* USAGE HISTORY DETAILS MODAL */}
      {viewingHistoryCoupon && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121622] border border-red-500/30 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
            {/* Modal Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-red-950/40 via-black to-black">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-950/80 rounded-xl border border-amber-500/30 text-[#FFD700]">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-white font-mono uppercase">
                      {viewingHistoryCoupon.code}
                    </span>
                    <span className="text-xs font-mono px-2 py-0.5 bg-amber-950 border border-amber-500/40 text-amber-300 rounded-lg font-bold">
                      {viewingHistoryCoupon.usageCount || 0} / {viewingHistoryCoupon.maxUsage || 500} {isBn ? "বার ব্যবহৃত" : "times used"}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 font-mono mt-0.5">
                    {isBn
                      ? "এই প্রোমো কোডটি ব্যবহারকারী শিক্ষার্থীদের তালিকা ও বিবরণী"
                      : "Student redemption history and usage log"}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setViewingHistoryCoupon(null)}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Table */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              {/* Quick Summary Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-black/50 border border-white/10 rounded-xl p-3">
                  <span className="text-[10px] font-mono text-gray-400 uppercase block">
                    {isBn ? "মোট ব্যবহার সংখ্যা" : "Total Redemptions"}
                  </span>
                  <span className="text-lg font-black text-white font-mono">
                    {viewingHistoryCoupon.usageCount || 0} {isBn ? "বার" : "times"}
                  </span>
                </div>
                <div className="bg-black/50 border border-white/10 rounded-xl p-3">
                  <span className="text-[10px] font-mono text-gray-400 uppercase block">
                    {isBn ? "মোট ডিসকাউন্ট প্রদান" : "Total Discount Saved"}
                  </span>
                  <span className="text-lg font-black text-emerald-400 font-mono">
                    ৳{((viewingHistoryCoupon.totalDiscountGiven) ||
                      ((viewingHistoryCoupon.usageCount || 0) *
                        (viewingHistoryCoupon.discountType === "fixed"
                          ? viewingHistoryCoupon.discountValue
                          : 500))).toLocaleString()}
                  </span>
                </div>
                <div className="bg-black/50 border border-white/10 rounded-xl p-3">
                  <span className="text-[10px] font-mono text-gray-400 uppercase block">
                    {isBn ? "প্রযোজ্য কোর্স" : "Applicable Course"}
                  </span>
                  <span className="text-xs font-bold text-purple-300 font-mono truncate block">
                    {viewingHistoryCoupon.applicableScope === "all"
                      ? isBn ? "🌐 সকল কোর্স" : "All Courses"
                      : `🎯 ${viewingHistoryCoupon.applicableCourseTitles?.join(", ") || "নির্দিষ্ট কোর্স"}`}
                  </span>
                </div>
              </div>

              {/* Logs Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-mono font-bold text-gray-300 uppercase">
                  📋 {isBn ? "রিডেম্পশন হিস্টোরি (Redemption History)" : "Redemption Logs"}:
                </h4>

                {viewingHistoryCoupon.usageLogs && viewingHistoryCoupon.usageLogs.length > 0 ? (
                  <div className="border border-white/10 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-black/80 text-gray-400 border-b border-white/10 text-[11px] uppercase">
                        <tr>
                          <th className="p-3">#</th>
                          <th className="p-3">{isBn ? "শিক্ষার্থী" : "Student"}</th>
                          <th className="p-3">{isBn ? "কোর্স" : "Course"}</th>
                          <th className="p-3">{isBn ? "ছাড় (৳)" : "Discount"}</th>
                          <th className="p-3">{isBn ? "তারিখ ও সময়" : "Date & Time"}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 bg-[#0e111a]">
                        {viewingHistoryCoupon.usageLogs.map((log, idx) => (
                          <tr key={idx} className="hover:bg-white/5 transition">
                            <td className="p-3 text-gray-500 font-mono">{idx + 1}</td>
                            <td className="p-3">
                              <div className="font-bold text-white">{log.userName || "Student"}</div>
                              <div className="text-[10px] text-gray-400">{log.userEmail || "No Email"}</div>
                            </td>
                            <td className="p-3">
                              <div className="text-gray-200 truncate max-w-[180px]">
                                {log.courseTitle || "Medical Batch"}
                              </div>
                              {log.transactionId && (
                                <div className="text-[10px] text-amber-400 font-mono">
                                  TrxID: {log.transactionId}
                                </div>
                              )}
                            </td>
                            <td className="p-3 font-bold text-emerald-400 font-mono">
                              -৳{log.discountAmount || viewingHistoryCoupon.discountValue}
                            </td>
                            <td className="p-3 text-gray-400 text-[11px]">
                              {log.usedAt
                                ? new Date(log.usedAt).toLocaleString("bn-BD", {
                                    dateStyle: "medium",
                                    timeStyle: "short",
                                  })
                                : "N/A"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="bg-black/40 border border-dashed border-white/10 rounded-xl p-8 text-center space-y-2">
                    <Users className="w-8 h-8 text-gray-600 mx-auto" />
                    <p className="text-xs font-mono text-gray-400">
                      {isBn
                        ? "এই কোডটি এখনও কোনো শিক্ষার্থী ব্যবহার করেনি।"
                        : "No student has redeemed this promo code yet."}
                    </p>
                    <p className="text-[11px] font-mono text-gray-500">
                      {isBn
                        ? `মোট রেকর্ডকৃত ব্যবহার: ${viewingHistoryCoupon.usageCount || 0} বার`
                        : `Current count recorded: ${viewingHistoryCoupon.usageCount || 0} times`}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 bg-black/60 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleResetUsageCount(viewingHistoryCoupon)}
                className="px-3.5 py-2 rounded-xl border border-amber-500/30 text-amber-400 hover:bg-amber-950/40 text-xs font-mono font-bold flex items-center gap-1.5 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {isBn ? "ব্যবহার সংখ্যা ০ রিসেট করুন" : "Reset Usage to 0"}
              </button>

              <button
                type="button"
                onClick={() => setViewingHistoryCoupon(null)}
                className="px-5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-bold rounded-xl transition"
              >
                {isBn ? "বন্ধ করুন" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
