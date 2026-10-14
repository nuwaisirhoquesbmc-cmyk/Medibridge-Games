import React, { useState, useEffect } from "react";
import { db, handleFirestoreError, OperationType } from "../../firebase";
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  doc,
  setDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
  increment,
  getDocs,
  where,
  limit,
} from "firebase/firestore";
import {
  CoursePaymentSettings,
  Course,
  Batch,
  Coupon,
  CouponUsageLog,
} from "../../types/courseTypes";
import { DEFAULT_PAYMENT_SETTINGS, INITIAL_COURSES, INITIAL_COUPONS } from "../../data/coursesData";
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Eye,
  Settings,
  Plus,
  Tag,
  PhoneCall,
  MessageSquare,
  AlertCircle,
  HelpCircle,
  Copy,
  Check,
  Building,
  Smartphone,
  BookOpen,
  Users,
  Download,
  FileText,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Percent,
  MessageCircle,
} from "lucide-react";
import { playSound } from "../../audio";

interface CoursePaymentLedgerManagerProps {
  language?: "bn" | "en";
  theme?: "light" | "dark";
}

export default function CoursePaymentLedgerManager({
  language = "bn",
  theme = "dark",
}: CoursePaymentLedgerManagerProps) {
  const isBn = language === "bn";

  // Data states
  const [paymentSettings, setPaymentSettings] = useState<CoursePaymentSettings>(DEFAULT_PAYMENT_SETTINGS);
  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
  const [courses, setCourses] = useState<Course[]>(INITIAL_COURSES);
  const [coupons, setCoupons] = useState<Coupon[]>(INITIAL_COUPONS);
  const [loading, setLoading] = useState(true);

  // Settings Edit Modal
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState<CoursePaymentSettings>(DEFAULT_PAYMENT_SETTINGS);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Manual Offline Payment Modal
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    userId: "",
    userEmail: "",
    userName: "",
    userPhone: "",
    courseId: INITIAL_COURSES[0]?.id || "",
    batchId: INITIAL_COURSES[0]?.defaultBatchId || "batch_live_1",
    amount: INITIAL_COURSES[0]?.discountedPrice || 3500,
    paymentMethod: "cash" as const,
    transactionId: `CASH-${Date.now().toString().slice(-6)}`,
    senderNumber: "Cash / Direct Desk",
    adminNotes: "Manual desk registration",
  });
  const [isSavingManual, setIsSavingManual] = useState(false);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Pending" | "Approved" | "Rejected">("All");
  const [courseFilter, setCourseFilter] = useState<string>("All");
  const [methodFilter, setMethodFilter] = useState<string>("All");
  const [activeSubTab, setActiveSubTab] = useState<"ledger" | "course_breakdown" | "promo_usage" | "settings">("ledger");

  // Inspection & Action states
  const [inspectRequest, setInspectRequest] = useState<any | null>(null);
  const [noteText, setNoteText] = useState("");
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [viewScreenshot, setViewScreenshot] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Promo code usage logs modal state
  const [viewPromoLogsCoupon, setViewPromoLogsCoupon] = useState<Coupon | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    playSound("click");
    setTimeout(() => setCopiedText(null), 2000);
  };

  // 1. Listen to Payment Settings in Firestore
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "settings", "payment"),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as any;
          const merged: CoursePaymentSettings = {
            ...DEFAULT_PAYMENT_SETTINGS,
            ...data,
          };
          setPaymentSettings(merged);
          setSettingsForm(merged);
        } else {
          setPaymentSettings(DEFAULT_PAYMENT_SETTINGS);
          setSettingsForm(DEFAULT_PAYMENT_SETTINGS);
        }
      },
      (err) => {
        console.warn("Could not stream payment settings, using defaults:", err);
      }
    );
    return () => unsub();
  }, []);

  // 2. Listen to Payment Requests in Firestore (bounded 100 recent)
  useEffect(() => {
    const q = query(collection(db, "payment_requests"), orderBy("submissionDate", "desc"), limit(100));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const loaded: any[] = [];
        snapshot.forEach((d) => {
          loaded.push({ id: d.id, ...d.data() });
        });
        setPaymentRequests(loaded);
        setLoading(false);
      },
      (err) => {
        console.warn("Could not stream payment requests:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // 3. Listen to Courses in Firestore (limit 50)
  useEffect(() => {
    const q = query(collection(db, "courses"), limit(50));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const loaded: Course[] = [];
          snapshot.forEach((d) => {
            loaded.push({ id: d.id, ...d.data() } as Course);
          });
          setCourses(loaded);
        } else {
          setCourses(INITIAL_COURSES);
        }
      },
      (err) => {
        console.warn("Could not stream courses, fallback:", err);
        setCourses(INITIAL_COURSES);
      }
    );
    return () => unsub();
  }, []);

  // 4. Listen to Promo Codes in Firestore (limit 50)
  useEffect(() => {
    const q = query(collection(db, "course_promocodes"), limit(50));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const loaded: Coupon[] = [];
          snapshot.forEach((d) => {
            loaded.push({ id: d.id, ...d.data() } as Coupon);
          });
          setCoupons(loaded);
        } else {
          setCoupons(INITIAL_COUPONS);
        }
      },
      (err) => {
        console.warn("Could not stream promocodes, fallback:", err);
        setCoupons(INITIAL_COUPONS);
      }
    );
    return () => unsub();
  }, []);

  // Save Payment Settings to Firestore
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingSettings(true);
      playSound("click");
      const cleanSettings = {
        ...settingsForm,
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(db, "settings", "payment"), cleanSettings, { merge: true });
      await setDoc(doc(db, "settings", "course_payment"), cleanSettings, { merge: true });
      playSound("correct");
      showToast(isBn ? "পেমেন্ট নম্বর ও প্রসেস সফলভাবে আপডেট হয়েছে!" : "Payment numbers & instructions updated!");
      setIsSettingsModalOpen(false);
    } catch (err: any) {
      console.error("Error saving payment settings:", err);
      alert(isBn ? "সেটিংস সংরক্ষণ ব্যর্থ হয়েছে: " + err.message : "Failed to save settings: " + err.message);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Approve Payment Request & Enroll Student
  const handleApprovePayment = async (req: any) => {
    try {
      setIsProcessingAction(true);
      playSound("click");

      // 1. Update payment request status
      await updateDoc(doc(db, "payment_requests", req.id), {
        status: "Approved",
        adminNotes: noteText || req.adminNotes || "Payment verified by administrator.",
        approvedAt: new Date().toISOString(),
        verifiedBy: "Admin",
      });

      // 2. Add or update user's enrollment document & course access
      if (req.userId) {
        const enrollmentId = `enr_${req.userId}_${req.courseId || "med_2027"}`;
        const targetCourse = courses.find((c) => c.id === req.courseId) || courses[0];
        const targetBatch = targetCourse?.batches?.find((b) => b.id === req.batchId) || targetCourse?.batches?.[0];

        try {
          await setDoc(
            doc(db, "enrollments", enrollmentId),
            {
              userId: req.userId,
              userEmail: req.userEmail || "",
              userDisplayName: req.userName || "Student",
              courseId: req.courseId || targetCourse.id,
              batchId: req.batchId || targetBatch?.id || "batch_live_1",
              courseSlug: targetCourse.slug || "medical-batch",
              batchSlug: targetBatch?.slug || "live-batch",
              courseTitle: req.courseTitle || targetCourse.title,
              batchName: req.batchName || targetBatch?.batchName || "Standard Live Batch",
              status: "active",
              enrolledAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
              progressPct: 0,
              lastAccessedAt: new Date().toISOString(),
              paymentRefId: req.id,
              transactionId: req.transactionId,
              amountPaid: req.amount,
            },
            { merge: true }
          );

          // Update user's profile enrolledCourses map
          await setDoc(
            doc(db, "users", req.userId),
            {
              enrolledCourses: {
                [req.courseId || targetCourse.id]: {
                  batchId: req.batchId || targetBatch?.id || "batch_live_1",
                  enrolledAt: new Date().toISOString(),
                  status: "active",
                },
              },
            },
            { merge: true }
          );

          // Add in-app notification to student
          await addDoc(collection(db, "notifications"), {
            userId: req.userId,
            title: isBn ? "🎉 কোর্স এনরোলমেন্ট সফল হয়েছে!" : "🎉 Course Enrollment Approved!",
            message: isBn
              ? `অভিনন্দন! "${req.courseTitle || targetCourse.title}" কোর্সে আপনার পেমেন্ট ভেরিফাই হয়েছে। এখন আপনি সব ক্লাস ও পরীক্ষায় অংশ নিতে পারবেন।`
              : `Congratulations! Your payment for "${req.courseTitle || targetCourse.title}" has been approved. You now have full access.`,
            type: "payment_approved",
            read: false,
            createdAt: new Date().toISOString(),
            link: `/courses/${targetCourse.slug}`,
          });
        } catch (enrollErr) {
          console.warn("Could not auto-write enrollment doc, but payment request approved:", enrollErr);
        }
      }

      playSound("correct");
      showToast(isBn ? `পেমেন্ট রিকোয়েস্ট ${req.transactionId} সফলভাবে এপ্রুভ হয়েছে!` : `Payment ${req.transactionId} approved & student enrolled!`);
      setInspectRequest({
        ...req,
        status: "Approved",
        adminNotes: noteText || req.adminNotes || "Payment verified by administrator.",
      });
    } catch (err: any) {
      console.error("Error approving payment:", err);
      alert(isBn ? "পেমেন্ট এপ্রুভ করতে সমস্যা হয়েছে: " + err.message : "Error approving payment: " + err.message);
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Reject Payment Request
  const handleRejectPayment = async (req: any) => {
    if (!confirm(isBn ? `আপনি কি নিশ্চিত যে TrxID "${req.transactionId}" রিজেক্ট করতে চান?` : `Are you sure you want to reject TrxID "${req.transactionId}"?`)) {
      return;
    }

    try {
      setIsProcessingAction(true);
      playSound("click");

      await updateDoc(doc(db, "payment_requests", req.id), {
        status: "Rejected",
        adminNotes: noteText || "Invalid transaction ID or payment not received.",
        rejectedAt: new Date().toISOString(),
        verifiedBy: "Admin",
      });

      // Send rejection notification
      if (req.userId) {
        try {
          await addDoc(collection(db, "notifications"), {
            userId: req.userId,
            title: isBn ? "⚠️ পেমেন্ট ভেরিফিকেশন ব্যর্থ হয়েছে" : "⚠️ Payment Verification Failed",
            message: isBn
              ? `আপনার সাবমিটকৃত ট্রানজেকশন (${req.transactionId}) যাচাই করা সম্ভব হয়নি। অনুগ্রহ করে সঠিক TrxID সহ হেল্পলাইনে যোগাযোগ করুন।`
              : `Your payment request (${req.transactionId}) could not be verified. Please contact support.`,
            type: "payment_rejected",
            read: false,
            createdAt: new Date().toISOString(),
          });
        } catch (notifErr) {
          console.warn("Notification error:", notifErr);
        }
      }

      showToast(isBn ? `পেমেন্ট রিকোয়েস্ট ${req.transactionId} রিজেক্ট করা হয়েছে!` : `Payment ${req.transactionId} rejected.`);
      setInspectRequest({
        ...req,
        status: "Rejected",
        adminNotes: noteText || "Invalid transaction ID or payment not received.",
      });
    } catch (err: any) {
      console.error("Error rejecting payment:", err);
      alert("Error: " + err.message);
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Record Manual Offline / Cash Payment
  const handleSaveManualPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.userEmail || !manualForm.userName || !manualForm.amount) {
      alert(isBn ? "অনুগ্রহ করে সকল প্রয়োজনীয় তথ্য পূরণ করুন!" : "Please fill in all required fields!");
      return;
    }

    try {
      setIsSavingManual(true);
      playSound("click");

      const selectedCourse = courses.find((c) => c.id === manualForm.courseId) || courses[0];
      const selectedBatch = selectedCourse?.batches?.find((b) => b.id === manualForm.batchId) || selectedCourse?.batches?.[0];

      // Add to payment_requests collection
      const newPaymentDoc = await addDoc(collection(db, "payment_requests"), {
        userId: manualForm.userId || `manual_user_${Date.now()}`,
        userEmail: manualForm.userEmail,
        userName: manualForm.userName,
        userPhone: manualForm.userPhone,
        courseId: selectedCourse.id,
        courseTitle: selectedCourse.title,
        batchId: selectedBatch?.id || "batch_1",
        batchName: selectedBatch?.batchName || "Direct Admission",
        amount: Number(manualForm.amount),
        originalAmount: Number(manualForm.amount),
        discountAmount: 0,
        paymentMethod: manualForm.paymentMethod,
        transactionId: manualForm.transactionId.trim().toUpperCase(),
        senderNumber: manualForm.senderNumber,
        status: "Approved",
        adminNotes: manualForm.adminNotes,
        isManualEntry: true,
        submissionDate: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
        createdAt: serverTimestamp(),
      });

      playSound("correct");
      showToast(isBn ? "ম্যানুয়াল পেমেন্ট ও এনরোলমেন্ট সফলভাবে সম্পন্ন হয়েছে!" : "Manual payment and admission recorded successfully!");
      setIsManualModalOpen(false);
      setManualForm({
        userId: "",
        userEmail: "",
        userName: "",
        userPhone: "",
        courseId: courses[0]?.id || "",
        batchId: courses[0]?.batches?.[0]?.id || "batch_live_1",
        amount: courses[0]?.discountedPrice || 3500,
        paymentMethod: "cash",
        transactionId: `CASH-${Date.now().toString().slice(-6)}`,
        senderNumber: "Cash / Direct Desk",
        adminNotes: "Manual desk registration",
      });
    } catch (err: any) {
      console.error("Error creating manual payment:", err);
      alert("Error: " + err.message);
    } finally {
      setIsSavingManual(false);
    }
  };

  // Export CSV Report
  const handleExportCSV = () => {
    playSound("click");
    const headers = [
      "Transaction ID",
      "Student Name",
      "Email",
      "Course Title",
      "Batch Name",
      "Amount (BDT)",
      "Discount (BDT)",
      "Payment Method",
      "Sender Phone",
      "Status",
      "Submission Date",
      "Approved Date",
      "Admin Notes",
    ];

    const rows = paymentRequests.map((r) => [
      `"${r.transactionId || ""}"`,
      `"${r.userName || ""}"`,
      `"${r.userEmail || ""}"`,
      `"${r.courseTitle || ""}"`,
      `"${r.batchName || ""}"`,
      r.amount || 0,
      r.discountAmount || 0,
      `"${r.paymentMethod || ""}"`,
      `"${r.senderNumber || ""}"`,
      `"${r.status || "Pending"}"`,
      `"${r.submissionDate || ""}"`,
      `"${r.approvedAt || ""}"`,
      `"${(r.adminNotes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `MediSense_Course_Financial_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(isBn ? "ফিন্যান্সিয়াল লেজার CSV ফাইল ডাউনলোড হয়েছে!" : "Financial ledger CSV exported!");
  };

  // Financial Calculations & Taka'r Hishab
  const approvedRequests = paymentRequests.filter((r) => r.status === "Approved");
  const pendingRequests = paymentRequests.filter((r) => r.status === "Pending");
  const rejectedRequests = paymentRequests.filter((r) => r.status === "Rejected");

  const totalGrossRevenue = approvedRequests.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const pendingRevenue = pendingRequests.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const totalDiscountsGiven = paymentRequests.reduce((sum, r) => sum + (Number(r.discountAmount) || 0), 0);

  // Method Breakdown
  const methodStats = {
    bkash: approvedRequests.filter((r) => r.paymentMethod === "bkash").reduce((s, r) => s + (Number(r.amount) || 0), 0),
    nagad: approvedRequests.filter((r) => r.paymentMethod === "nagad").reduce((s, r) => s + (Number(r.amount) || 0), 0),
    rocket: approvedRequests.filter((r) => r.paymentMethod === "rocket").reduce((s, r) => s + (Number(r.amount) || 0), 0),
    bank: approvedRequests.filter((r) => r.paymentMethod === "bank").reduce((s, r) => s + (Number(r.amount) || 0), 0),
    cash: approvedRequests.filter((r) => r.paymentMethod === "cash").reduce((s, r) => s + (Number(r.amount) || 0), 0),
    card: approvedRequests.filter((r) => r.paymentMethod === "card").reduce((s, r) => s + (Number(r.amount) || 0), 0),
  };

  // Course-Wise Financial Breakdown
  const courseFinancials = courses.map((course) => {
    const courseApproved = approvedRequests.filter((r) => r.courseId === course.id);
    const coursePending = pendingRequests.filter((r) => r.courseId === course.id);
    const totalEarnings = courseApproved.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const totalDiscount = courseApproved.reduce((s, r) => s + (Number(r.discountAmount) || 0), 0);

    return {
      course,
      approvedCount: courseApproved.length,
      pendingCount: coursePending.length,
      totalEarnings,
      totalDiscount,
    };
  });

  // Filtered list for transaction queue
  const filteredRequests = paymentRequests.filter((req) => {
    const matchesSearch =
      !searchQuery ||
      (req.transactionId && req.transactionId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (req.userEmail && req.userEmail.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (req.userName && req.userName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (req.senderNumber && req.senderNumber.includes(searchQuery)) ||
      (req.courseTitle && req.courseTitle.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === "All" || req.status === statusFilter;
    const matchesCourse = courseFilter === "All" || req.courseId === courseFilter;
    const matchesMethod = methodFilter === "All" || req.paymentMethod === methodFilter;

    return matchesSearch && matchesStatus && matchesCourse && matchesMethod;
  });

  return (
    <div id="course_payment_ledger_root" className="flex flex-col gap-6 font-sans">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white font-mono text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-emerald-400 animate-bounce">
          <CheckCircle2 className="w-4 h-4" /> {toastMsg}
        </div>
      )}

      {/* Main Header Banner */}
      <div className="bg-gradient-to-r from-red-950/60 via-[#121622] to-black rounded-2xl p-6 border border-red-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-red-500 via-[#FFD700] to-red-500"></div>
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#FFD700] uppercase tracking-wider">
            <DollarSign className="w-4 h-4 text-[#FFD700]" />
            {isBn ? "কোর্স পেমেন্ট, নম্বর ও টাকার পূর্ণাঙ্গ হিসাব" : "COURSE PAYMENT GATEWAY & FINANCIAL LEDGER"}
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-white uppercase mt-1 font-display tracking-tight flex items-center gap-2.5">
            {isBn ? "পেমেন্ট গেটওয়ে, প্রসেস ও ক্যাশফ্লো লেজার" : "PAYMENT NUMBERS & CASHFLOW LEDGER"}
          </h2>
          <p className="text-xs text-gray-400 font-mono mt-1 max-w-3xl">
            {isBn
              ? "অ্যাডমিন প্যানেল থেকে বিকাশ, নগদ, রকেট নম্বর ও পেমেন্ট প্রসেস নির্ধারণ করুন, শিক্ষার্থীদের পেমেন্ট যাচাই করুন এবং সকল কোর্সের আয়ের হিসাব রিয়েল-টাইমে পর্যবেক্ষণ করুন।"
              : "Manage bKash/Nagad payment numbers, customize checkout guidelines, verify student transactions, and inspect real-time course earnings."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start md:self-auto">
          <button
            id="btn_open_payment_settings"
            onClick={() => {
              setIsSettingsModalOpen(true);
              playSound("click");
            }}
            className="px-4 py-2.5 bg-red-950 hover:bg-red-900 border border-red-500/40 hover:border-red-400 text-white font-mono text-xs font-bold uppercase rounded-xl transition shadow-lg flex items-center gap-2"
          >
            <Settings className="w-4 h-4 text-[#FFD700]" />
            {isBn ? "নম্বর ও প্রসেস কনফিগারেশন" : "Payment Numbers & Process"}
          </button>

          <button
            id="btn_manual_payment_entry"
            onClick={() => {
              setIsManualModalOpen(true);
              playSound("click");
            }}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-bold uppercase rounded-xl transition shadow-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {isBn ? "ক্যাশ/অফলাইন এন্ট্রি" : "Record Cash Payment"}
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 bg-black/60 hover:bg-black border border-white/20 text-gray-300 hover:text-white font-mono text-xs font-bold rounded-xl transition flex items-center gap-1.5"
            title="Download CSV Ledger"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">CSV</span>
          </button>
        </div>
      </div>

      {/* Primary Financial Overview Cards (টাকার হিসাব - Taka'r Hishab) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Collected Revenue */}
        <div className="bg-[#111522] border border-emerald-500/30 rounded-2xl p-4 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-gray-400 uppercase font-bold">
              {isBn ? "সর্বমোট সংগৃহীত আয়" : "Total Realized Revenue"}
            </span>
            <div className="p-2 bg-emerald-950/60 text-emerald-400 rounded-xl border border-emerald-500/30">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-black text-emerald-400 font-mono mt-2">
            ৳{totalGrossRevenue.toLocaleString()}
          </div>
          <div className="text-[11px] text-gray-400 font-mono mt-1 flex items-center gap-1.5">
            <span className="text-emerald-400 font-bold">✓</span> {approvedRequests.length} {isBn ? "টি সফল ভর্তি সম্পন্ন" : "approved admissions"}
          </div>
        </div>

        {/* Pending Verification Amount */}
        <div className="bg-[#111522] border border-amber-500/30 rounded-2xl p-4 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-gray-400 uppercase font-bold">
              {isBn ? "অপেক্ষমান পেমেন্ট (Pending)" : "Pending In Queue"}
            </span>
            <div className="p-2 bg-amber-950/60 text-[#FFD700] rounded-xl border border-amber-500/30">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-black text-white font-mono mt-2">
            ৳{pendingRevenue.toLocaleString()}
          </div>
          <div className="text-[11px] text-amber-400 font-mono mt-1 flex items-center gap-1.5">
            <span className="animate-pulse">●</span> {pendingRequests.length} {isBn ? "টি রিকোয়েস্ট অপেক্ষমান" : "requests awaiting review"}
          </div>
        </div>

        {/* Total Promo Code Discounts Given */}
        <div className="bg-[#111522] border border-purple-500/30 rounded-2xl p-4 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-gray-400 uppercase font-bold">
              {isBn ? "মোট কুপন/প্রোমো ছাড়" : "Promo Discounts Given"}
            </span>
            <div className="p-2 bg-purple-950/60 text-purple-400 rounded-xl border border-purple-500/30">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-black text-purple-300 font-mono mt-2">
            ৳{totalDiscountsGiven.toLocaleString()}
          </div>
          <div className="text-[11px] text-gray-400 font-mono mt-1">
            {coupons.reduce((sum, c) => sum + (c.usageCount || 0), 0)} {isBn ? "বার কোড ব্যবহৃত হয়েছে" : "times promo applied"}
          </div>
        </div>

        {/* Active Official Payment Channels */}
        <div className="bg-[#111522] border border-blue-500/30 rounded-2xl p-4 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-gray-400 uppercase font-bold">
              {isBn ? "সক্রিয় পেমেন্ট চ্যানেল" : "Active Channels"}
            </span>
            <div className="p-2 bg-blue-950/60 text-blue-400 rounded-xl border border-blue-500/30">
              <Smartphone className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-black text-white font-mono mt-2">
            {[paymentSettings.isBkashEnabled, paymentSettings.isNagadEnabled, paymentSettings.isRocketEnabled, paymentSettings.isBankEnabled].filter(Boolean).length} <span className="text-xs text-gray-400 font-normal">/ 4</span>
          </div>
          <div className="text-[11px] text-gray-400 font-mono mt-1 truncate">
            {paymentSettings.bkashNumber ? `bKash: ${paymentSettings.bkashNumber}` : "bKash configured"}
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto">
        <button
          onClick={() => {
            setActiveSubTab("ledger");
            playSound("click");
          }}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase transition flex items-center gap-2 shrink-0 ${
            activeSubTab === "ledger"
              ? "bg-[#C1121F] text-white shadow-lg"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          {isBn ? "পেমেন্ট ভেরিফিকেশন ও লেনদেন লেজার" : "Verification Queue & Ledger"} ({paymentRequests.length})
        </button>

        <button
          onClick={() => {
            setActiveSubTab("course_breakdown");
            playSound("click");
          }}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase transition flex items-center gap-2 shrink-0 ${
            activeSubTab === "course_breakdown"
              ? "bg-[#C1121F] text-white shadow-lg"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          {isBn ? "কোর্স-ভিত্তিক আয়ের হিসাব" : "Course-Wise Revenue Breakdown"}
        </button>

        <button
          onClick={() => {
            setActiveSubTab("promo_usage");
            playSound("click");
          }}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase transition flex items-center gap-2 shrink-0 ${
            activeSubTab === "promo_usage"
              ? "bg-[#C1121F] text-white shadow-lg"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Tag className="w-4 h-4" />
          {isBn ? "প্রোমো কোড ব্যবহারের হিসাব" : "Promo Code Usage Accounting"}
        </button>

        <button
          onClick={() => {
            setIsSettingsModalOpen(true);
            playSound("click");
          }}
          className="px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase text-gray-400 hover:text-white hover:bg-white/5 transition flex items-center gap-2 shrink-0 ml-auto"
        >
          <Settings className="w-4 h-4 text-[#FFD700]" />
          {isBn ? "নম্বর পরিবর্তন করুন" : "Edit Numbers & Steps"}
        </button>
      </div>

      {/* ======================================================== */}
      {/* 1. TRANSACTION QUEUE & FULL LEDGER TAB                  */}
      {/* ======================================================== */}
      {activeSubTab === "ledger" && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="bg-[#111111] p-4 rounded-2xl border border-white/10 flex flex-col lg:flex-row items-center justify-between gap-4 shadow-lg">
            {/* Search */}
            <div className="relative w-full lg:w-96">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isBn ? "TrxID, ইমেইল, নাম, মোবাইল বা কোর্স খুঁজুন..." : "Search TrxID, email, name, phone, course..."}
                className="w-full bg-black/60 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-gray-500 focus:border-red-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
              {/* Course Filter */}
              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="bg-black/70 border border-white/15 text-xs font-mono text-gray-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-red-500"
              >
                <option value="All">{isBn ? "সকল কোর্স (All Courses)" : "All Courses"}</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>

              {/* Method Filter */}
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="bg-black/70 border border-white/15 text-xs font-mono text-gray-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-red-500"
              >
                <option value="All">{isBn ? "সকল মেথড (All Methods)" : "All Methods"}</option>
                <option value="bkash">bKash</option>
                <option value="nagad">Nagad</option>
                <option value="rocket">Rocket</option>
                <option value="bank">Bank Transfer</option>
                <option value="cash">Cash / Offline</option>
                <option value="card">Debit/Credit Card</option>
              </select>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/10">
                {(["All", "Pending", "Approved", "Rejected"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setStatusFilter(st);
                      playSound("click");
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition ${
                      statusFilter === st
                        ? st === "Pending"
                          ? "bg-amber-600 text-white shadow-md"
                          : st === "Approved"
                          ? "bg-emerald-600 text-white shadow-md"
                          : st === "Rejected"
                          ? "bg-red-700 text-white shadow-md"
                          : "bg-[#C1121F] text-white shadow-md"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    {st === "All" && (isBn ? "সকল" : "All")}
                    {st === "Pending" && (isBn ? "অপেক্ষমান" : "Pending")}
                    {st === "Approved" && (isBn ? "অনুমোদিত" : "Approved")}
                    {st === "Rejected" && (isBn ? "বাতিল" : "Rejected")}
                    {st === "All" && ` (${paymentRequests.length})`}
                    {st === "Pending" && ` (${pendingRequests.length})`}
                    {st === "Approved" && ` (${approvedRequests.length})`}
                    {st === "Rejected" && ` (${rejectedRequests.length})`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Ledger Grid: Left Queue list, Right Inspector */}
          <div className="grid lg:grid-cols-12 gap-6">
            {/* Left Queue List */}
            <div className="lg:col-span-7 bg-[#141824] p-5 rounded-2xl border border-white/10 flex flex-col gap-3 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#FFD700]" />
                  <h3 className="font-extrabold uppercase text-xs text-white font-mono tracking-wider">
                    {isBn ? "পেমেন্ট লেনদেন তালিকা" : "TRANSACTION LEDGER QUEUE"} ({filteredRequests.length})
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-gray-400">
                  {isBn ? "যাচাই করতে যেকোনো লেনদেনে ক্লিক করুন" : "Click on any transaction to inspect"}
                </span>
              </div>

              <div className="flex flex-col gap-3 max-h-[650px] overflow-y-auto pr-1">
                {loading ? (
                  <div className="text-center py-16 font-mono text-xs text-gray-400 animate-pulse">
                    ⏳ {isBn ? "পেমেন্ট হিস্ট্রি লোড হচ্ছে..." : "Loading transaction ledger..."}
                  </div>
                ) : filteredRequests.length === 0 ? (
                  <div className="text-center py-16 text-xs text-gray-500 font-mono">
                    {isBn ? "কোনো পেমেন্ট রেকর্ড পাওয়া যায়নি।" : "No payment records matched current filters."}
                  </div>
                ) : (
                  filteredRequests.map((req) => {
                    const isSelected = inspectRequest?.id === req.id;
                    return (
                      <div
                        key={req.id}
                        onClick={() => {
                          setInspectRequest(req);
                          setNoteText(req.adminNotes || "");
                          playSound("click");
                        }}
                        className={`p-4 rounded-xl border cursor-pointer transition flex flex-col gap-2.5 relative select-none ${
                          isSelected
                            ? "bg-[#C1121F]/15 border-red-500 ring-1 ring-red-500"
                            : req.status === "Pending"
                            ? "bg-amber-950/20 border-amber-500/40 hover:border-amber-400"
                            : req.status === "Approved"
                            ? "bg-emerald-950/15 border-emerald-500/20 hover:border-emerald-500/40"
                            : "bg-black/30 border-white/5 hover:border-white/20"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black uppercase text-white font-mono">
                                {req.userName || req.userEmail || "Student"}
                              </span>
                              {req.isManualEntry && (
                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                  Cash/Offline
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                              {req.courseTitle || "Course Admission"} {req.batchName ? `• ${req.batchName}` : ""}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            <span
                              className={`text-[10px] font-mono uppercase font-black px-2 py-0.5 rounded ${
                                req.status === "Approved"
                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                  : req.status === "Rejected"
                                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                  : "bg-amber-500/20 text-[#FFD700] border border-amber-500/30 animate-pulse"
                              }`}
                            >
                              {req.status || "Pending"}
                            </span>
                            <span className="text-xs font-black text-white font-mono">
                              ৳{(req.amount || 0).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* Details row */}
                        <div className="grid grid-cols-3 gap-2 text-[10px] font-mono pt-2 border-t border-white/5 text-gray-400">
                          <div>
                            <span className="text-[9px] text-gray-500 block uppercase">TrxID:</span>
                            <span className="font-extrabold text-[#FFD700] truncate block">
                              {req.transactionId || "N/A"}
                            </span>
                          </div>

                          <div>
                            <span className="text-[9px] text-gray-500 block uppercase">Method & Sender:</span>
                            <span className="font-bold text-gray-200 truncate block uppercase">
                              {req.paymentMethod} • {req.senderNumber || "N/A"}
                            </span>
                          </div>

                          <div>
                            <span className="text-[9px] text-gray-500 block uppercase">Date:</span>
                            <span className="truncate block">
                              {req.submissionDate
                                ? new Date(req.submissionDate).toLocaleDateString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "Recent"}
                            </span>
                          </div>
                        </div>

                        {/* Promo info tag if applied */}
                        {req.discountAmount > 0 && (
                          <div className="bg-purple-950/40 border border-purple-500/20 px-2 py-1 rounded text-[10px] font-mono text-purple-300 flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <Tag className="w-3 h-3 text-purple-400" />
                              {req.couponCode ? `Promo "${req.couponCode}" Applied` : "Discount Applied"}
                            </span>
                            <span className="font-bold text-white">-৳{req.discountAmount} Off</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Inspector & Action Panel */}
            <div className="lg:col-span-5 bg-[#141824] p-5 rounded-2xl border border-white/10 flex flex-col gap-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="font-extrabold uppercase text-xs text-white font-mono tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  {isBn ? "লেনদেন নিরীক্ষা ও অনুমোদন" : "AUDIT & APPROVE ACTION"}
                </h3>
              </div>

              {inspectRequest ? (
                <div className="flex flex-col gap-4 text-xs font-mono">
                  {/* Student Details Card */}
                  <div className="bg-black/50 border border-white/10 rounded-xl p-3.5 space-y-1.5">
                    <span className="text-[10px] font-bold text-red-400 uppercase block tracking-wider">
                      {isBn ? "শিক্ষার্থীর তথ্য" : "STUDENT PROFILE"}
                    </span>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">{isBn ? "নাম:" : "Name:"}</span>
                      <span className="text-white font-bold">{inspectRequest.userName || "N/A"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">{isBn ? "ইমেইল:" : "Email:"}</span>
                      <span className="text-white font-bold select-all">{inspectRequest.userEmail || "N/A"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">{isBn ? "UID:" : "User UID:"}</span>
                      <span className="text-gray-400 text-[10px] truncate max-w-[180px] select-all">
                        {inspectRequest.userId || "N/A"}
                      </span>
                    </div>
                  </div>

                  {/* Course & Payment Details Card */}
                  <div className="bg-black/50 border border-white/10 rounded-xl p-3.5 space-y-2">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase block tracking-wider">
                      {isBn ? "কোর্স ও পেমেন্ট বিবরণ" : "PAYMENT DETAILS"}
                    </span>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">{isBn ? "কোর্স:" : "Course:"}</span>
                      <span className="text-white font-bold text-right truncate max-w-[200px]">
                        {inspectRequest.courseTitle || "Medical Admission Batch"}
                      </span>
                    </div>
                    {inspectRequest.batchName && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">{isBn ? "ব্যাচ:" : "Batch:"}</span>
                        <span className="text-amber-400 font-bold">{inspectRequest.batchName}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">{isBn ? "পেমেন্ট মেথড:" : "Method:"}</span>
                      <span className="text-white font-bold uppercase">{inspectRequest.paymentMethod}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">{isBn ? "প্রেরক নম্বর:" : "Sender Phone:"}</span>
                      <span className="text-white font-bold select-all">{inspectRequest.senderNumber || "N/A"}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-white/5">
                      <span className="text-gray-400">{isBn ? "মূল কোর্স ফি:" : "Base Price:"}</span>
                      <span className="text-gray-300">
                        ৳{inspectRequest.originalAmount || inspectRequest.amount}
                      </span>
                    </div>
                    {inspectRequest.discountAmount > 0 && (
                      <div className="flex justify-between items-center text-purple-300">
                        <span>{isBn ? "প্রোমো কোড ছাড়:" : "Promo Discount:"}</span>
                        <span className="font-bold">-৳{inspectRequest.discountAmount}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-sm pt-1 border-t border-white/5">
                      <span className="text-white font-bold">{isBn ? "পরিশোধিত টাকা:" : "Amount Paid:"}</span>
                      <span className="text-emerald-400 font-black text-base">
                        ৳{(inspectRequest.amount || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* TrxID Highlight Box */}
                  <div className="bg-[#0b0e14] border-2 border-amber-500/40 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] text-gray-400 uppercase block font-bold">
                        {isBn ? "ট্রানজেকশন আইডি (TrxID):" : "TRANSACTION ID:"}
                      </span>
                      <span className="text-sm font-black text-[#FFD700] tracking-wider select-all">
                        {inspectRequest.transactionId}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCopy(inspectRequest.transactionId)}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span className="text-[10px]">{copiedText === inspectRequest.transactionId ? "Copied" : "Copy"}</span>
                    </button>
                  </div>

                  {/* Screenshot proof if attached */}
                  {inspectRequest.screenshotUrl && (
                    <div className="bg-black/50 border border-white/10 rounded-xl p-3 space-y-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase block">
                        {isBn ? "পেমেন্ট স্ক্রিনশট রসিদ:" : "Screenshot Proof:"}
                      </span>
                      <div
                        onClick={() => setViewScreenshot(inspectRequest.screenshotUrl)}
                        className="relative group w-full h-32 bg-black rounded-lg overflow-hidden border border-white/10 cursor-pointer"
                      >
                        <img
                          src={inspectRequest.screenshotUrl}
                          alt="Receipt"
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white font-mono text-xs font-bold gap-1">
                          <Eye className="w-4 h-4" /> {isBn ? "বড় করে দেখুন" : "View Full Size"}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Admin Notes */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase block">
                      {isBn ? "এডমিন নোট / শিক্ষার্থীর মেসেজ:" : "Admin Notes / Message:"}
                    </label>
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder={isBn ? "অনুমোদনের মন্তব্য বা রিজেকশনের কারণ লিখুন..." : "Enter verification note or rejection reason..."}
                      rows={2}
                      className="w-full p-2.5 text-xs font-mono rounded-xl border border-white/15 bg-black text-white focus:outline-none focus:border-red-500"
                    />
                  </div>

                  {/* Action Buttons */}
                  {inspectRequest.status === "Pending" ? (
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button
                        type="button"
                        disabled={isProcessingAction}
                        onClick={() => handleRejectPayment(inspectRequest)}
                        className="py-3 bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 shadow-lg"
                      >
                        <XCircle className="w-4 h-4" />
                        {isBn ? "বাতিল করুন" : "REJECT"}
                      </button>

                      <button
                        type="button"
                        disabled={isProcessingAction}
                        onClick={() => handleApprovePayment(inspectRequest)}
                        className="py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 shadow-lg hover:shadow-emerald-600/30"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {isBn ? "অনুমোদন ও ভর্তি নিশ্চিত" : "APPROVE & ENROLL"}
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 bg-black/60 border border-white/10 rounded-xl text-center text-xs font-mono text-gray-400">
                      {isBn ? "এই লেনদেনটির বর্তমান স্ট্যাটাস:" : "Current Status:"}{" "}
                      <span
                        className={`font-black ${
                          inspectRequest.status === "Approved" ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {inspectRequest.status.toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-24 text-xs text-gray-500 font-mono space-y-2">
                  <HelpCircle className="w-8 h-8 mx-auto text-gray-600" />
                  <p>{isBn ? "বাম পাশের তালিকা থেকে যেকোনো পেমেন্ট রিকোয়েস্ট সিলেক্ট করুন।" : "Select a payment request from the ledger to inspect details."}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. COURSE-WISE FINANCIAL BREAKDOWN TAB                   */}
      {/* ======================================================== */}
      {activeSubTab === "course_breakdown" && (
        <div className="space-y-4">
          <div className="bg-[#141824] p-5 rounded-2xl border border-white/10 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div>
                <h3 className="font-extrabold uppercase text-sm text-white font-mono tracking-wider flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-400" />
                  {isBn ? "কোর্স-ভিত্তিক আয়ের পূর্ণাঙ্গ তালিকা" : "COURSE-WISE REVENUE BREAKDOWN"}
                </h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">
                  {isBn ? "প্রতিটি কোর্স থেকে মোট ভর্তি সংখ্যা, আদায়কৃত টাকা ও ডিসকাউন্টের হিসাব" : "Detailed enrollment counts and net collected revenue per course"}
                </p>
              </div>

              <div className="text-xs font-mono text-emerald-400 font-bold bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-500/30">
                {isBn ? "মোট লাইভ কোর্স:" : "Total Courses:"} {courses.length}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courseFinancials.map(({ course, approvedCount, pendingCount, totalEarnings, totalDiscount }) => (
                <div
                  key={course.id}
                  className="bg-black/50 border border-white/10 rounded-2xl p-4 flex flex-col justify-between gap-4 hover:border-white/20 transition shadow-lg"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-12 h-12 rounded-xl object-cover border border-white/10"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-black text-white font-mono truncate">{course.title}</h4>
                        <span className="text-[11px] font-mono text-gray-400">
                          ৳{course.discountedPrice || course.originalPrice} / {isBn ? "কোর্স ফি" : "Fee"}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 font-mono text-xs">
                      <div className="bg-black/40 p-2 rounded-xl border border-white/5">
                        <span className="text-[10px] text-gray-400 block uppercase">
                          {isBn ? "ভর্তি সংখ্যা:" : "Admissions:"}
                        </span>
                        <span className="text-sm font-black text-white">{approvedCount}</span>
                        {pendingCount > 0 && (
                          <span className="text-[10px] text-amber-400 block mt-0.5">+{pendingCount} pending</span>
                        )}
                      </div>

                      <div className="bg-black/40 p-2 rounded-xl border border-white/5">
                        <span className="text-[10px] text-gray-400 block uppercase">
                          {isBn ? "মোট আদায়:" : "Gross Revenue:"}
                        </span>
                        <span className="text-sm font-black text-emerald-400">৳{totalEarnings.toLocaleString()}</span>
                      </div>
                    </div>

                    {totalDiscount > 0 && (
                      <div className="text-[11px] font-mono text-purple-300 flex justify-between bg-purple-950/30 px-2.5 py-1 rounded-lg border border-purple-500/20">
                        <span>{isBn ? "প্রোমো ছাড়ের পরিমাণ:" : "Total Promo Discounts:"}</span>
                        <span className="font-bold">-৳{totalDiscount.toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] font-mono text-gray-400">
                    <span>{course.subjects?.slice(0, 2).join(", ")}</span>
                    <button
                      onClick={() => {
                        setCourseFilter(course.id);
                        setActiveSubTab("ledger");
                        playSound("click");
                      }}
                      className="text-red-400 hover:text-red-300 font-bold flex items-center gap-1"
                    >
                      {isBn ? "লেনদেন দেখুন" : "View Ledger"} <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Payment Method Distribution Bars */}
            <div className="bg-black/60 border border-white/10 rounded-2xl p-5 space-y-3 mt-4">
              <h4 className="text-xs font-mono font-bold text-white uppercase flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#FFD700]" />
                {isBn ? "পেমেন্ট মেথড ভিত্তিক আয়ের অনুপাত" : "PAYMENT METHOD REVENUE SHARE"}
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { name: "bKash", amount: methodStats.bkash, color: "text-pink-400", bg: "border-pink-500/30" },
                  { name: "Nagad", amount: methodStats.nagad, color: "text-orange-400", bg: "border-orange-500/30" },
                  { name: "Rocket", amount: methodStats.rocket, color: "text-purple-400", bg: "border-purple-500/30" },
                  { name: "Bank", amount: methodStats.bank, color: "text-blue-400", bg: "border-blue-500/30" },
                  { name: "Cash", amount: methodStats.cash, color: "text-emerald-400", bg: "border-emerald-500/30" },
                  { name: "Card", amount: methodStats.card, color: "text-cyan-400", bg: "border-cyan-500/30" },
                ].map((m) => {
                  const pct = totalGrossRevenue > 0 ? Math.round((m.amount / totalGrossRevenue) * 100) : 0;
                  return (
                    <div key={m.name} className={`bg-black/50 border ${m.bg} rounded-xl p-3 font-mono`}>
                      <span className="text-[10px] text-gray-400 uppercase block font-bold">{m.name}</span>
                      <div className={`text-base font-black ${m.color} mt-1`}>
                        ৳{m.amount.toLocaleString()}
                      </div>
                      <span className="text-[10px] text-gray-500 block mt-0.5">{pct}% of total</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. PROMO CODE USAGE ACCOUNTING TAB                       */}
      {/* ======================================================== */}
      {activeSubTab === "promo_usage" && (
        <div className="space-y-4">
          <div className="bg-[#141824] p-5 rounded-2xl border border-white/10 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div>
                <h3 className="font-extrabold uppercase text-sm text-white font-mono tracking-wider flex items-center gap-2">
                  <Tag className="w-4 h-4 text-purple-400" />
                  {isBn ? "প্রোমো কোড ব্যবহারের হিসাব ও শিক্ষার্থীর তালিকা" : "PROMO CODE USAGE TRACKING & REDEMPTIONS"}
                </h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">
                  {isBn
                    ? "কোন প্রোমো কোড কতবার ব্যবহৃত হয়েছে এবং কোন শিক্ষার্থীরা ছাড় পেয়েছে তার পূর্ণাঙ্গ ডাটাবেস।"
                    : "Inspect how many times each promo code has been redeemed, student savings, and usage history."}
                </p>
              </div>

              <div className="text-xs font-mono text-purple-300 font-bold bg-purple-950/60 px-3 py-1.5 rounded-xl border border-purple-500/30">
                {isBn ? "মোট প্রোমো কোড:" : "Total Coupons:"} {coupons.length}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {coupons.map((coupon) => {
                const usage = coupon.usageCount || 0;
                const max = coupon.maxUsage || 1000;
                const pct = Math.min(100, Math.round((usage / max) * 100));
                const totalDiscount =
                  coupon.totalDiscountGiven ||
                  (coupon.usageLogs
                    ? coupon.usageLogs.reduce((sum, l) => sum + (l.discountAmount || 0), 0)
                    : usage * (coupon.discountType === "fixed" ? coupon.discountValue : 500));

                return (
                  <div
                    key={coupon.id}
                    className="bg-black/50 border border-white/10 rounded-2xl p-4 flex flex-col justify-between gap-4 shadow-lg hover:border-purple-500/30 transition"
                  >
                    <div className="space-y-3 font-mono">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-purple-400" />
                          <span className="text-sm font-black text-[#FFD700] tracking-wider uppercase">
                            {coupon.code}
                          </span>
                        </div>
                        <span
                          className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                            coupon.isActive
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-gray-700 text-gray-300"
                          }`}
                        >
                          {coupon.isActive ? (isBn ? "সক্রিয়" : "Active") : (isBn ? "স্থগিত" : "Paused")}
                        </span>
                      </div>

                      {/* Usage Count & Limit Progress */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">{isBn ? "ব্যবহৃত হয়েছে:" : "Times Used:"}</span>
                          <span className="font-bold text-white">
                            {usage} / {max} <span className="text-gray-400 text-[10px]">({pct}%)</span>
                          </span>
                        </div>
                        <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              pct >= 90 ? "bg-red-500" : pct >= 50 ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      {/* Discount metrics */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-xs">
                        <div className="bg-black/40 p-2 rounded-xl border border-white/5">
                          <span className="text-[9px] text-gray-400 block uppercase">
                            {isBn ? "ছাড়ের হার:" : "Discount:"}
                          </span>
                          <span className="font-bold text-emerald-400">
                            {coupon.discountType === "fixed"
                              ? `৳${coupon.discountValue} Off`
                              : `${coupon.discountValue}% Off`}
                          </span>
                        </div>

                        <div className="bg-black/40 p-2 rounded-xl border border-white/5">
                          <span className="text-[9px] text-gray-400 block uppercase">
                            {isBn ? "মোট সাশ্রয়:" : "Total Saved:"}
                          </span>
                          <span className="font-bold text-purple-300">
                            ৳{totalDiscount.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Course restriction tag */}
                      <div className="text-[10px] text-gray-400">
                        <span className="text-gray-500 uppercase">{isBn ? "প্রযোজ্যতা: " : "Scope: "}</span>
                        {coupon.applicableScope === "specific" ||
                        (Array.isArray(coupon.applicableCourseIds) &&
                          !coupon.applicableCourseIds.includes("all") &&
                          coupon.applicableCourseIds.length > 0) ? (
                          <span className="text-purple-300 font-bold">
                            🎯 {coupon.applicableCourseTitles?.join(", ") || "Specific Courses"}
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-bold">🌐 সকল কোর্সে প্রযোজ্য (All Courses)</span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setViewPromoLogsCoupon(coupon);
                        playSound("click");
                      }}
                      className="w-full py-2 bg-purple-950/60 hover:bg-purple-900 border border-purple-500/30 text-purple-200 font-mono text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                    >
                      <Users className="w-3.5 h-3.5" />
                      {isBn ? "ব্যবহারকারী শিক্ষার্থীর তালিকা দেখুন" : "View Redemption Logs"} ({coupon.usageLogs?.length || usage})
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: EDIT PAYMENT NUMBERS & PROCESSES               */}
      {/* ======================================================== */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#141824] border-2 border-red-500/50 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto animate-fadeIn font-mono">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-950 text-[#FFD700] rounded-xl border border-red-500/40">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-wider">
                    {isBn ? "কোর্স পেমেন্ট নম্বর ও প্রসেস কনফিগারেশন" : "CONFIGURE PAYMENT NUMBERS & INSTRUCTIONS"}
                  </h3>
                  <span className="text-xs text-gray-400">
                    {isBn
                      ? "এখানে দেওয়া নম্বর ও নির্দেশনা সরাসরি শিক্ষার্থীদের চেকআউট পেজে প্রদর্শিত হবে।"
                      : "These numbers and instructions are shown dynamically to students during checkout."}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-6 text-xs">
              {/* 1. bKash Settings */}
              <div className="bg-black/50 border border-pink-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-pink-950 text-pink-400 border border-pink-500/30 rounded font-bold uppercase">
                      bKash
                    </span>
                    <span className="text-white font-bold">{isBn ? "বিকাশ পেমেন্ট চ্যানেল" : "bKash Channel"}</span>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settingsForm.isBkashEnabled}
                      onChange={(e) => setSettingsForm({ ...settingsForm, isBkashEnabled: e.target.checked })}
                      className="rounded text-pink-600 focus:ring-pink-500"
                    />
                    <span className="text-gray-300 font-bold">{isBn ? "সক্রিয় রাখুন" : "Enable bKash"}</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-gray-400 block mb-1 font-bold">
                      {isBn ? "অফিসিয়াল বিকাশ নম্বর:" : "Official bKash Number:"} *
                    </label>
                    <input
                      type="text"
                      required
                      value={settingsForm.bkashNumber}
                      onChange={(e) => setSettingsForm({ ...settingsForm, bkashNumber: e.target.value })}
                      placeholder="01789-000111"
                      className="w-full bg-black/80 border border-white/20 rounded-xl px-3 py-2.5 text-white font-bold focus:border-red-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1 font-bold">
                      {isBn ? "অ্যাকাউন্ট টাইপ (Account Type):" : "Account Type:"}
                    </label>
                    <select
                      value={settingsForm.bkashType}
                      onChange={(e) => setSettingsForm({ ...settingsForm, bkashType: e.target.value as any })}
                      className="w-full bg-black/80 border border-white/20 rounded-xl px-3 py-2.5 text-white focus:border-red-500 focus:outline-none"
                    >
                      <option value="personal">Personal (Send Money / সেন্ড মানি)</option>
                      <option value="merchant">Merchant (Make Payment / পেমেন্ট)</option>
                      <option value="agent">Agent (Cash In / ক্যাশ ইন)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-gray-400 block mb-1 font-bold">
                    {isBn ? "বিকাশ নির্দেশনা (Bangla Instruction):" : "bKash Instruction Text:"}
                  </label>
                  <input
                    type="text"
                    value={settingsForm.bkashInstructionBn || ""}
                    onChange={(e) => setSettingsForm({ ...settingsForm, bkashInstructionBn: e.target.value })}
                    placeholder="bKash অ্যাপ বা *247# ডায়াল করে 'Send Money' করুন।"
                    className="w-full bg-black/80 border border-white/20 rounded-xl px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* 2. Nagad Settings */}
              <div className="bg-black/50 border border-orange-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-orange-950 text-orange-400 border border-orange-500/30 rounded font-bold uppercase">
                      Nagad
                    </span>
                    <span className="text-white font-bold">{isBn ? "নগদ পেমেন্ট চ্যানেল" : "Nagad Channel"}</span>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settingsForm.isNagadEnabled}
                      onChange={(e) => setSettingsForm({ ...settingsForm, isNagadEnabled: e.target.checked })}
                      className="rounded text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-gray-300 font-bold">{isBn ? "সক্রিয় রাখুন" : "Enable Nagad"}</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-gray-400 block mb-1 font-bold">
                      {isBn ? "অফিসিয়াল নগদ নম্বর:" : "Official Nagad Number:"} *
                    </label>
                    <input
                      type="text"
                      required
                      value={settingsForm.nagadNumber}
                      onChange={(e) => setSettingsForm({ ...settingsForm, nagadNumber: e.target.value })}
                      placeholder="01889-000222"
                      className="w-full bg-black/80 border border-white/20 rounded-xl px-3 py-2.5 text-white font-bold focus:border-red-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1 font-bold">
                      {isBn ? "অ্যাকাউন্ট টাইপ (Account Type):" : "Account Type:"}
                    </label>
                    <select
                      value={settingsForm.nagadType}
                      onChange={(e) => setSettingsForm({ ...settingsForm, nagadType: e.target.value as any })}
                      className="w-full bg-black/80 border border-white/20 rounded-xl px-3 py-2.5 text-white focus:border-red-500 focus:outline-none"
                    >
                      <option value="personal">Personal (Send Money / সেন্ড মানি)</option>
                      <option value="merchant">Merchant (Make Payment / পেমেন্ট)</option>
                      <option value="agent">Agent (Cash In / ক্যাশ ইন)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-gray-400 block mb-1 font-bold">
                    {isBn ? "নগদ নির্দেশনা (Bangla Instruction):" : "Nagad Instruction Text:"}
                  </label>
                  <input
                    type="text"
                    value={settingsForm.nagadInstructionBn || ""}
                    onChange={(e) => setSettingsForm({ ...settingsForm, nagadInstructionBn: e.target.value })}
                    placeholder="Nagad অ্যাপ বা *167# ডায়াল করে 'Send Money' করুন।"
                    className="w-full bg-black/80 border border-white/20 rounded-xl px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* 3. Rocket Settings */}
              <div className="bg-black/50 border border-purple-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-purple-950 text-purple-400 border border-purple-500/30 rounded font-bold uppercase">
                      Rocket
                    </span>
                    <span className="text-white font-bold">{isBn ? "রকেট অ্যাকাউন্ট সেটিংস" : "Rocket Account Details"}</span>
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settingsForm.isRocketEnabled}
                        onChange={(e) => setSettingsForm({ ...settingsForm, isRocketEnabled: e.target.checked })}
                      />
                      <span className="text-gray-300 font-bold">{isBn ? "রকেট সক্রিয় রাখুন" : "Enable Rocket"}</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="text-gray-400 block mb-1 font-bold">Rocket Number:</label>
                    <input
                      type="text"
                      value={settingsForm.rocketNumber || ""}
                      onChange={(e) => setSettingsForm({ ...settingsForm, rocketNumber: e.target.value })}
                      placeholder="01989-000333"
                      className="w-full bg-black/80 border border-white/20 rounded-xl px-3 py-2 text-white focus:border-purple-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Support Helpline & Payment Notice */}
              <div className="bg-black/50 border border-emerald-500/30 rounded-xl p-4 space-y-3">
                <span className="text-emerald-400 font-bold block flex items-center gap-1.5">
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                  <span>{isBn ? "হোয়াটসঅ্যাপ হেল্পলাইন ও নোটিশ কনফিগারেশন" : "WhatsApp Helpline & Notice"}</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-emerald-400 block mb-1 font-bold flex items-center justify-between">
                      <span>{isBn ? "হোয়াটসঅ্যাপ সাপোর্ট নম্বর:" : "WhatsApp Helpline:"}</span>
                      {settingsForm.helplineWhatsapp && (
                        <a
                          href={`https://wa.me/${(() => {
                            const raw = (settingsForm.helplineWhatsapp || "").replace(/[^0-9]/g, "");
                            return raw.startsWith("01") ? `88${raw}` : raw;
                          })()}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-emerald-300 underline font-normal"
                        >
                          {isBn ? "লিঙ্ক টেস্ট ↗" : "Test Link ↗"}
                        </a>
                      )}
                    </label>
                    <input
                      type="text"
                      value={settingsForm.helplineWhatsapp || ""}
                      onChange={(e) => setSettingsForm({ ...settingsForm, helplineWhatsapp: e.target.value })}
                      placeholder="01789000111 or +8801789000111"
                      className="w-full bg-black/80 border border-emerald-500/40 rounded-xl px-3 py-2 text-white focus:border-emerald-400 focus:outline-none font-mono font-bold"
                    />
                    <span className="text-[10px] text-gray-500 block mt-1">
                      {isBn ? "এই নম্বরে শিক্ষার্থীরা পেমেন্ট সংক্রান্ত সহায়তার জন্য সরাসরি হোয়াটসঅ্যাপে মেসেজ দিতে পারবে।" : "Students will directly chat with this number for enrollment help."}
                    </span>
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1 font-bold">
                      {isBn ? "হেল্পলাইন ফোন নম্বর (বিকল্প):" : "Helpline Phone (Alternative):"}
                    </label>
                    <input
                      type="text"
                      value={settingsForm.helplinePhone || ""}
                      onChange={(e) => setSettingsForm({ ...settingsForm, helplinePhone: e.target.value })}
                      placeholder="+880 1789-000111"
                      className="w-full bg-black/80 border border-white/20 rounded-xl px-3 py-2 text-white focus:border-red-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-400 block mb-1 font-bold">
                      {isBn ? "অফিসিয়াল সাপোর্ট ইমেইল:" : "Official Support Email:"}
                    </label>
                    <input
                      type="email"
                      value={settingsForm.helplineEmail || ""}
                      onChange={(e) => setSettingsForm({ ...settingsForm, helplineEmail: e.target.value })}
                      placeholder="medibridgeedu@gmail.com"
                      className="w-full bg-black/80 border border-white/20 rounded-xl px-3 py-2 text-white focus:border-red-500 focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1 font-bold">
                      {isBn ? "অফিসিয়াল ফেসবুক পেজের নাম:" : "Official Facebook Page Name:"}
                    </label>
                    <input
                      type="text"
                      value={settingsForm.facebookPageName || ""}
                      onChange={(e) => setSettingsForm({ ...settingsForm, facebookPageName: e.target.value })}
                      placeholder="Medibridge Academy"
                      className="w-full bg-black/80 border border-white/20 rounded-xl px-3 py-2 text-white focus:border-red-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-gray-400 block mb-1 font-bold">
                    {isBn ? "পেমেন্ট নোটিশ (চেকআউটে দেখানো হবে):" : "Payment Notice Banner:"}
                  </label>
                  <textarea
                    rows={2}
                    value={settingsForm.paymentNoticeBn || ""}
                    onChange={(e) => setSettingsForm({ ...settingsForm, paymentNoticeBn: e.target.value })}
                    placeholder="পেমেন্ট সম্পন্ন করার সর্বোচ্চ ৫-১৫ মিনিটের মধ্যে আপনার ব্যাচ অ্যাক্সেস এপ্রুভ হয়ে যাবে।"
                    className="w-full bg-black/80 border border-white/20 rounded-xl px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/20 text-gray-300 hover:text-white font-bold"
                >
                  {isBn ? "বাতিল" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold uppercase rounded-xl transition shadow-lg flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isSavingSettings
                    ? isBn
                      ? "সংরক্ষণ হচ্ছে..."
                      : "Saving..."
                    : isBn
                    ? "পেমেন্ট সেটিংস সংরক্ষণ করুন"
                    : "SAVE PAYMENT SETTINGS"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: MANUAL CASH / OFFLINE PAYMENT ENTRY            */}
      {/* ======================================================== */}
      {isManualModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#141824] border-2 border-emerald-500/50 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-fadeIn font-mono text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-950 text-emerald-400 rounded-xl border border-emerald-500/30">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-wider">
                    {isBn ? "অফলাইন / ক্যাশ পেমেন্ট এন্ট্রি" : "RECORD OFFLINE CASH PAYMENT"}
                  </h3>
                  <span className="text-[11px] text-gray-400">
                    {isBn
                      ? "অফিস বা সরাসরি ক্যাশ পেমেন্টের মাধ্যমে ছাত্র-ছাত্রী ভর্তি করুন"
                      : "Directly enroll student and log payment in the financial ledger"}
                  </span>
                </div>
              </div>

              <button onClick={() => setIsManualModalOpen(false)} className="text-gray-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveManualPayment} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-300 font-bold block mb-1">{isBn ? "শিক্ষার্থীর নাম:" : "Student Name:"} *</label>
                  <input
                    type="text"
                    required
                    value={manualForm.userName}
                    onChange={(e) => setManualForm({ ...manualForm, userName: e.target.value })}
                    placeholder="e.g. Arif Rahman"
                    className="w-full bg-black/80 border border-white/20 rounded-xl px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-gray-300 font-bold block mb-1">{isBn ? "শিক্ষার্থীর ইমেইল:" : "Student Email:"} *</label>
                  <input
                    type="email"
                    required
                    value={manualForm.userEmail}
                    onChange={(e) => setManualForm({ ...manualForm, userEmail: e.target.value })}
                    placeholder="student@example.com"
                    className="w-full bg-black/80 border border-white/20 rounded-xl px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-300 font-bold block mb-1">{isBn ? "মোবাইল নম্বর:" : "Mobile Number:"}</label>
                  <input
                    type="text"
                    value={manualForm.userPhone}
                    onChange={(e) => setManualForm({ ...manualForm, userPhone: e.target.value })}
                    placeholder="017xxxxxxxx"
                    className="w-full bg-black/80 border border-white/20 rounded-xl px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-gray-300 font-bold block mb-1">{isBn ? "পেমেন্ট মেথড:" : "Payment Method:"}</label>
                  <select
                    value={manualForm.paymentMethod}
                    onChange={(e) => setManualForm({ ...manualForm, paymentMethod: e.target.value as any })}
                    className="w-full bg-black/80 border border-white/20 rounded-xl px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                  >
                    <option value="cash">Cash / Direct Desk</option>
                    <option value="bkash">bKash (Manual Check)</option>
                    <option value="nagad">Nagad (Manual Check)</option>
                    <option value="bank">Bank Deposit</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-gray-300 font-bold block mb-1">{isBn ? "কোর্স নির্বাচন করুন:" : "Select Course:"} *</label>
                <select
                  value={manualForm.courseId}
                  onChange={(e) => {
                    const c = courses.find((crs) => crs.id === e.target.value);
                    setManualForm({
                      ...manualForm,
                      courseId: e.target.value,
                      batchId: c?.batches?.[0]?.id || "batch_1",
                      amount: c?.discountedPrice || 3500,
                    });
                  }}
                  className="w-full bg-black/80 border border-white/20 rounded-xl px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} (৳{c.discountedPrice || c.originalPrice})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-300 font-bold block mb-1">{isBn ? "টাকার পরিমাণ (৳ Amount):" : "Amount (৳):"} *</label>
                  <input
                    type="number"
                    required
                    value={manualForm.amount}
                    onChange={(e) => setManualForm({ ...manualForm, amount: Number(e.target.value) })}
                    className="w-full bg-black/80 border border-white/20 rounded-xl px-3 py-2 text-emerald-400 font-bold focus:border-red-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-gray-300 font-bold block mb-1">{isBn ? "রসিদ / TrxID:" : "Receipt / TrxID:"} *</label>
                  <input
                    type="text"
                    required
                    value={manualForm.transactionId}
                    onChange={(e) => setManualForm({ ...manualForm, transactionId: e.target.value })}
                    className="w-full bg-black/80 border border-white/20 rounded-xl px-3 py-2 text-[#FFD700] font-bold focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-300 font-bold block mb-1">{isBn ? "মন্তব্য / নোট:" : "Notes / Ledger Remarks:"}</label>
                <input
                  type="text"
                  value={manualForm.adminNotes}
                  onChange={(e) => setManualForm({ ...manualForm, adminNotes: e.target.value })}
                  placeholder="Direct cash collected at office counter"
                  className="w-full bg-black/80 border border-white/20 rounded-xl px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-white/20 text-gray-300 hover:text-white"
                >
                  {isBn ? "বাতিল" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={isSavingManual}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold uppercase rounded-xl transition flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isSavingManual ? "Saving..." : isBn ? "এনরোলমেন্ট ও পেমেন্ট যোগ করুন" : "CONFIRM ADMISSION"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: PROMO CODE USAGE LOGS DETAILS MODAL            */}
      {/* ======================================================== */}
      {viewPromoLogsCoupon && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#141824] border border-purple-500/40 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto animate-fadeIn font-mono text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-950 text-purple-400 rounded-xl border border-purple-500/30">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-wider">
                    PROMO: <span className="text-[#FFD700]">{viewPromoLogsCoupon.code}</span>
                  </h3>
                  <span className="text-[11px] text-gray-400">
                    {isBn
                      ? `মোট ${viewPromoLogsCoupon.usageCount || 0} বার ব্যবহৃত হয়েছে`
                      : `Used ${viewPromoLogsCoupon.usageCount || 0} times out of ${viewPromoLogsCoupon.maxUsage || 1000}`}
                  </span>
                </div>
              </div>

              <button onClick={() => setViewPromoLogsCoupon(null)} className="text-gray-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* List of usage logs */}
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {!viewPromoLogsCoupon.usageLogs || viewPromoLogsCoupon.usageLogs.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  {viewPromoLogsCoupon.usageCount && viewPromoLogsCoupon.usageCount > 0
                    ? isBn
                      ? `এই কোডটি ${viewPromoLogsCoupon.usageCount} বার ব্যবহার করা হয়েছে।`
                      : `This promo code has been redeemed ${viewPromoLogsCoupon.usageCount} times.`
                    : isBn
                    ? "এখনও কোনো শিক্ষার্থী এই প্রোমো কোডটি ব্যবহার করেনি।"
                    : "No student has redeemed this promo code yet."}
                </div>
              ) : (
                viewPromoLogsCoupon.usageLogs.map((log: CouponUsageLog, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 bg-black/50 border border-white/10 rounded-xl space-y-1.5 hover:border-purple-500/30 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-white font-bold">{log.userName || log.userEmail || "Student"}</span>
                      <span className="text-emerald-400 font-bold">-৳{log.discountAmount} Off</span>
                    </div>

                    <div className="flex justify-between text-[11px] text-gray-400">
                      <span>{log.courseTitle || "Course"}</span>
                      <span>৳{log.finalAmount} Paid</span>
                    </div>

                    <div className="flex justify-between text-[10px] text-gray-500 pt-1 border-t border-white/5">
                      <span>Trx: {log.transactionId || "Verified"}</span>
                      <span>{log.usedAt ? new Date(log.usedAt).toLocaleString() : "Recent"}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-white/10">
              <button
                onClick={() => setViewPromoLogsCoupon(null)}
                className="px-5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold"
              >
                {isBn ? "বন্ধ করুন" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SCREENSHOT FULL LIGHTBOX PREVIEW                        */}
      {/* ======================================================== */}
      {viewScreenshot && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4">
          <div className="max-w-4xl w-full max-h-[85vh] flex items-center justify-center relative">
            <img
              src={viewScreenshot}
              alt="Proof receipt"
              className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl border border-white/10"
              referrerPolicy="no-referrer"
            />
          </div>
          <button
            onClick={() => setViewScreenshot(null)}
            className="mt-6 px-6 py-2.5 bg-white text-black font-mono font-black uppercase text-xs rounded-xl tracking-wider hover:bg-gray-200 transition cursor-pointer"
          >
            {isBn ? "প্রিভিউ বন্ধ করুন" : "CLOSE PREVIEW"}
          </button>
        </div>
      )}
    </div>
  );
}
