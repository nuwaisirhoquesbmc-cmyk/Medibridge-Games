import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  getDocs,
  limit,
  doc,
  getDoc,
  setDoc
} from "firebase/firestore";
import { UserProfile, PaymentRequest } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { 
  Check, 
  Copy, 
  Upload, 
  Smartphone, 
  AlertCircle, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Plus, 
  FileText, 
  Layers, 
  ShieldAlert, 
  Image as ImageIcon,
  DollarSign,
  User,
  Mail,
  Flame,
  Bot
} from "lucide-react";
import { playSound } from "../audio";

interface SubscriptionPaymentProps {
  user: UserProfile;
  language: "bn" | "en";
  theme: "light" | "dark";
  onClose?: () => void;
  setActiveTab?: (tab: any) => void;
}

export default function SubscriptionPayment({ user, language, theme, onClose, setActiveTab }: SubscriptionPaymentProps) {
  const isDark = theme === "dark";

  // Dynamic official payment numbers states
  const [bkashNumber, setBkashNumber] = useState("");
  const [nagadNumber, setNagadNumber] = useState("");
  const [loadingNumbers, setLoadingNumbers] = useState(true);

  useEffect(() => {
    getDoc(doc(db, "settings", "payment"))
      .then((docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setBkashNumber(data.bkashNumber || "");
          setNagadNumber(data.nagadNumber || "");
        }
        setLoadingNumbers(false);
      })
      .catch((err) => {
        console.warn("Failed to load payment numbers:", err);
        setLoadingNumbers(false);
      });
  }, []);

  // Form states
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "6months" | "1year">("1year");
  const [paymentMethod, setPaymentMethod] = useState<"bKash" | "Nagad">("bKash");
  const [senderNumber, setSenderNumber] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [amount, setAmount] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState<string>("");
  
  // UX states
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [copiedText, setCopiedText] = useState("");

  // History state
  const [requests, setRequests] = useState<PaymentRequest[]>([]);

  // Get pricing based on plan
  const getPrice = (plan: "monthly" | "6months" | "1year") => {
    if (plan === "monthly") return 149;
    if (plan === "6months") return 599;
    return 799;
  };

  const getDurationText = (plan: string) => {
    if (plan === "monthly") return language === "bn" ? "১ মাস" : "1 Month";
    if (plan === "6months") return language === "bn" ? "৬ মাস" : "6 Months";
    return language === "bn" ? "১ বছর" : "1 Year";
  };

  // Set default amount when plan changes
  useEffect(() => {
    setAmount(getPrice(selectedPlan).toString());
  }, [selectedPlan]);

  // Stream current user's requests
  useEffect(() => {
    if (!user.uid) return;
    const q = query(
      collection(db, "payment_requests"),
      where("userId", "==", user.uid),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: PaymentRequest[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as PaymentRequest);
      });
      // Sort client-side by submissionDate desc to avoid composite index requirement
      list.sort((a, b) => {
        const dateA = a.submissionDate ? new Date(a.submissionDate).getTime() : 0;
        const dateB = b.submissionDate ? new Date(b.submissionDate).getTime() : 0;
        return dateB - dateA;
      });
      setRequests(list);
    }, (err) => {
      console.warn("Failed to fetch payment requests:", err);
    });

    return () => unsubscribe();
  }, [user.uid]);

  // Copy helper
  const handleCopy = (text: string, type: "bkash" | "nagad") => {
    navigator.clipboard.writeText(text);
    setCopiedText(type);
    playSound("click");
    setTimeout(() => setCopiedText(""), 2000);
  };

  // Image upload helpers (supports drag and drop, click and select, base64 converts)
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMessage(language === "bn" ? "অনুগ্রহ করে শুধু ইমেজ ফাইল আপলোড করুন।" : "Please upload image files only.");
      playSound("wrong");
      return;
    }
    
    // Check file size (limit to 1.5MB for Firestore base64 compatibility)
    if (file.size > 1.5 * 1024 * 1024) {
      setErrorMessage(language === "bn" ? "ইমেজ ফাইল সাইজ অবশ্যই ১.৫ এমবি এর কম হতে হবে।" : "Image size must be less than 1.5MB.");
      playSound("wrong");
      return;
    }

    setErrorMessage("");
    const reader = new FileReader();
    reader.onloadend = () => {
      setScreenshotUrl(reader.result as string);
      playSound("click");
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    playSound("click");

    // Standard validations
    if (!senderNumber || senderNumber.length < 11) {
      setErrorMessage(language === "bn" ? "অনুগ্রহ করে একটি সঠিক ১১-ডিজিটের মোবাইল নম্বর দিন।" : "Please enter a valid 11-digit sender number.");
      playSound("wrong");
      return;
    }

    const txIdClean = transactionId.trim().toUpperCase();
    if (!txIdClean || txIdClean.length < 5) {
      setErrorMessage(language === "bn" ? "অনুগ্রহ করে একটি সঠিক ট্রানজেকশন আইডি প্রদান করুন।" : "Please enter a valid Transaction ID.");
      playSound("wrong");
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMessage(language === "bn" ? "পেমেন্ট পরিমাণ অবশ্যই সঠিক হতে হবে।" : "Please provide a valid paid amount.");
      playSound("wrong");
      return;
    }

    setLoading(true);

    try {
      // 11. Security - Prevent duplicate transaction ID submissions securely without general list access
      try {
        const docRef = doc(db, "payment_requests", txIdClean);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setErrorMessage(
            language === "bn"
              ? "এই ট্রানজেকশন আইডিটি ইতিমধ্যে ব্যবহৃত হয়েছে! অনুগ্রহ করে সঠিক ট্রানজেকশন আইডি দিন।"
              : "This Transaction ID has already been submitted! Please provide a unique code."
          );
          playSound("wrong");
          setLoading(false);
          return;
        }
      } catch (e: any) {
        if (e.code === "permission-denied") {
          // If permission is denied on get, it means the document exists but belongs to someone else
          setErrorMessage(
            language === "bn"
              ? "এই ট্রানজেকশন আইডিটি ইতিমধ্যে ব্যবহৃত হয়েছে! অনুগ্রহ করে সঠিক ট্রানজেকশন আইডি দিন।"
              : "This Transaction ID has already been submitted! Please provide a unique code."
          );
          playSound("wrong");
          setLoading(false);
          return;
        }
        throw e;
      }

      // Add payment request using transaction ID as doc ID to prevent any bypass
      const payload = {
        userId: user.uid,
        userName: user.displayName,
        userEmail: user.email,
        selectedPlan: selectedPlan,
        paymentMethod: paymentMethod,
        senderNumber: senderNumber,
        transactionId: txIdClean,
        amount: numericAmount,
        screenshotUrl: screenshotUrl || "",
        submissionDate: new Date().toISOString(),
        status: "Pending" as const,
        adminNotes: ""
      };

      await setDoc(doc(db, "payment_requests", txIdClean), payload);
      
      // Add a visual log/notification to notify they submitted
      try {
        await addDoc(collection(db, "user_notifications"), {
          userId: user.uid,
          title: language === "bn" ? "পেমেন্ট রিকোয়েস্ট সাবমিট করা হয়েছে" : "Payment Request Submitted",
          content: language === "bn" 
            ? `আপনার ${paymentMethod} পেমেন্ট ভেরিফিকেশন রিকোয়েস্ট (TrxID: ${txIdClean}) রিভিউ এর জন্য পাঠানো হয়েছে।`
            : `Your ${paymentMethod} payment request with TrxID ${txIdClean} is now under admin verification.`,
          type: "payment_pending",
          read: false,
          createdAt: new Date().toISOString()
        });
      } catch (e) {
        console.warn("Failed to create user notification", e);
      }

      playSound("victory");
      setSuccessMessage(
        language === "bn"
          ? "পেমেন্ট তথ্য সফলভাবে পাঠানো হয়েছে! এডমিন শীঘ্রই যাচাই করে প্রিমিয়াম চালু করে দেবেন।"
          : "Payment request submitted successfully! Admins are verifying your receipt shortly."
      );
      
      // Reset form
      setSenderNumber("");
      setTransactionId("");
      setScreenshotUrl("");

    } catch (err: any) {
      console.error("Failed to submit request:", err);
      setErrorMessage(language === "bn" ? "সার্ভার ত্রুটি। আবার চেষ্টা করুন।" : "Network error. Please try again.");
      playSound("wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6" id="subscription-payment-page">
      <div className="flex flex-col gap-6">
        
        {/* Page Header */}
        <div className="text-center md:text-left flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight uppercase flex items-center justify-center md:justify-start gap-2">
              <span>💳</span>
              <span>{language === "bn" ? "প্রিমিয়াম পেমেন্ট ভেরিফিকেশন" : "Manual Subscription Payment"}</span>
            </h1>
            <p className={`text-xs mt-1 leading-relaxed ${isDark ? "text-gray-400" : "text-slate-600"}`}>
              {language === "bn" 
                ? "বিকাশ বা নগদে পেমেন্ট করার পর নিচের ফরমটি পূরণ করে আপনার মেম্বারশিপ অ্যাক্টিভেট করুন।" 
                : "Initiate custom bKash/Nagad transactions manually and enter ledger IDs for priority approvals."}
            </p>
          </div>
          
          {onClose && (
            <button
              onClick={onClose}
              className={`px-4 py-2 border rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                isDark ? "border-white/10 bg-white/5 hover:bg-white/10 text-gray-350" : "border-red-150 bg-red-50 text-[#C1121F] hover:bg-red-100/50"
              }`}
            >
              ← {language === "bn" ? "ড্যাশবোর্ডে ফিরুন" : "RETURN TO DASHBOARD"}
            </button>
          )}
        </div>

        {/* Dashboard-level alerts */}
        {user.isPremium ? (
          <div className="bg-emerald-950/20 border border-emerald-500/30 text-emerald-250 p-4 rounded-2xl flex items-start gap-3 text-sm animate-pulse">
            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold uppercase text-xs tracking-wider">👑 {language === "bn" ? "আপনি একজন প্রিমিয়াম মেম্বার" : "PREMIUM VISOR ACTIVE"}</p>
              <p className="text-xs text-emerald-400/80 mt-1">
                {language === "bn" 
                  ? `আপনার মেম্বারশিপ সক্রিয় আছে। মেয়াদ উত্তীর্ণের তারিখ: ${user.premiumExpiry ? new Date(user.premiumExpiry).toLocaleDateString() : "Indefinite"}` 
                  : `Your fully unlocked privileges are registered until ${user.premiumExpiry ? new Date(user.premiumExpiry).toLocaleDateString() : "Indefinite"}`}
              </p>
            </div>
          </div>
        ) : requests.some(r => r.status === "Pending") ? (
          <div className="bg-yellow-950/20 border border-yellow-500/30 text-yellow-200 p-4 rounded-2xl flex items-start gap-3 text-sm">
            <Clock className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5 animate-spin" />
            <div>
              <p className="font-extrabold uppercase text-xs tracking-wider">⏳ {language === "bn" ? "পেমেন্ট ভেরিফিকেশন অপেক্ষারত" : "PAYMENT AUDITING IN PROGRESS"}</p>
              <p className="text-xs text-yellow-400/80 mt-1">
                {language === "bn" 
                  ? "আপনার একটি পেমেন্ট রিকোয়েস্ট পেন্ডিং অবস্থায় আছে। এডমিন প্যানেল এটি যাচাই করছে।" 
                  : "We are currently checking your transaction in our mobile wallet ledger. Once approved, all sections unlock automatically."}
              </p>
            </div>
          </div>
        ) : null}

        <div className="grid lg:grid-cols-12 gap-8">
          
          {/* LEFT: PAYMENT INSTRUCTIONS & SUBMISSION FORM */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* 2. DISPLAY PAYMENT INSTRUCTIONS */}
            <div className={`border rounded-2xl p-5 sm:p-6 ${
              isDark ? "bg-[#111111] border-white/10" : "bg-white border-red-150"
            }`}>
              <h3 className="text-sm font-black font-mono tracking-wider uppercase text-[#C1121F] mb-4">
                📋 {language === "bn" ? "ধাপ ১: পেমেন্ট ইন্সট্রাকশন" : "STEP 1: PAYMENT INSTRUCTIONS"}
              </h3>
              
              <div className="flex flex-col gap-4">
                <p className={`text-xs leading-relaxed ${isDark ? "text-gray-300" : "text-slate-700"}`}>
                  {language === "bn" 
                    ? `আপনার নিচের যেকোনো ব্যক্তিগত (Personal) ওয়ালেট থেকে আমাদের নম্বরে "Send Money" সম্পন্ন করুন:`
                    : "Transfer the subscription amount from your wallet app to our official account listed below:"}
                </p>

                <div className="grid sm:grid-cols-2 gap-4">
                  {/* bKash instructions block */}
                  <div className={`p-4 rounded-xl border-2 flex flex-col gap-3 justify-between ${
                    isDark ? "bg-[#e2136e]/5 border-pink-500/20" : "bg-pink-50/20 border-pink-200"
                  }`}>
                    <div>
                      <span className="text-[10px] bg-[#e2136e] text-white px-2.5 py-0.5 rounded font-black uppercase font-mono tracking-wider">bKash Personal</span>
                      <p className="text-xs text-[#e2136e] font-black mt-2 font-mono tracking-wider">
                        {bkashNumber || (language === "bn" ? "অফিসিয়াল নম্বর নেই (এডমিনের সাথে যোগাযোগ করুন)" : "Not configured (Contact Admin)")}
                      </p>
                      <p className="text-[9px] text-gray-500 mt-1">{language === "bn" ? "সেন্ড মানি চার্জ ফ্রি" : "Send Money option only"}</p>
                    </div>
                    <button
                      onClick={() => {
                        if (bkashNumber) {
                          handleCopy(bkashNumber.replace(/-/g, ""), "bkash");
                        }
                      }}
                      disabled={!bkashNumber}
                      className="w-full py-1.5 bg-[#e2136e]/10 text-[#e2136e] hover:bg-[#e2136e]/20 text-[10px] font-mono font-black uppercase rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {copiedText === "bkash" ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>{language === "bn" ? "কপি হয়েছে!" : "COPIED!"}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>{language === "bn" ? "নম্বর কপি করুন" : "COPY NUMBER"}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Nagad instructions block */}
                  <div className={`p-4 rounded-xl border-2 flex flex-col gap-3 justify-between ${
                    isDark ? "bg-[#f45322]/5 border-orange-500/20" : "bg-orange-50/20 border-orange-200"
                  }`}>
                    <div>
                      <span className="text-[10px] bg-gradient-to-r from-[#f45322] to-amber-500 text-white px-2.5 py-0.5 rounded font-black uppercase font-mono tracking-wider">Nagad Personal</span>
                      <p className="text-xs text-[#f45322] font-black mt-2 font-mono tracking-wider">
                        {nagadNumber || (language === "bn" ? "অফিসিয়াল নম্বর নেই (এডমিনের সাথে যোগাযোগ করুন)" : "Not configured (Contact Admin)")}
                      </p>
                      <p className="text-[9px] text-gray-500 mt-1">{language === "bn" ? "নিরাপদ লেনদেন" : "Send Money option only"}</p>
                    </div>
                    <button
                      onClick={() => {
                        if (nagadNumber) {
                          handleCopy(nagadNumber.replace(/-/g, ""), "nagad");
                        }
                      }}
                      disabled={!nagadNumber}
                      className="w-full py-1.5 bg-[#f45322]/10 text-[#f45322] hover:bg-[#f45322]/20 text-[10px] font-mono font-black uppercase rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {copiedText === "nagad" ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>{language === "bn" ? "কপি হয়েছে!" : "COPIED!"}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>{language === "bn" ? "নম্বর কপি করুন" : "COPY NUMBER"}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. SUBMISSION FORM */}
            <div className={`border rounded-2xl p-5 sm:p-6 ${
              isDark ? "bg-[#111111] border-white/10" : "bg-white border-red-150"
            }`}>
              <h3 className="text-sm font-black font-mono tracking-wider uppercase text-[#C1121F] mb-5">
                📝 {language === "bn" ? "ধাপ ২: পেমেন্ট ট্রানজেকশন তথ্য সাবমিট করুন" : "STEP 2: SUBMIT TRANSACTION LEDGER DETAILS"}
              </h3>

              {errorMessage && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3.5 rounded-xl text-xs font-semibold flex items-start gap-2.5 mb-5">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3.5 rounded-xl text-xs font-semibold flex items-start gap-2.5 mb-5 animate-pulse">
                  <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                  <span>{successMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                
                {/* Selected Plan */}
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: "monthly", label: language === "bn" ? "১ মাস" : "1 Month", price: "৳১৪৯" },
                    { id: "6months", label: language === "bn" ? "৬ মাস" : "6 Months", price: "৳৫৯৯" },
                    { id: "1year", label: language === "bn" ? "১ বছর" : "1 Year", price: "৳৭৯৯" },
                  ].map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => { playSound("click"); setSelectedPlan(plan.id as any); }}
                      className={`p-3 rounded-xl border-2 text-center transition-all flex flex-col justify-between cursor-pointer ${
                        selectedPlan === plan.id
                          ? "bg-[#C1121F]/10 border-[#C1121F] text-white"
                          : isDark
                            ? "bg-black/30 border-white/5 hover:border-white/15 text-gray-400"
                            : "bg-gray-50 border-gray-200 hover:border-gray-300 text-slate-700"
                      }`}
                    >
                      <span className="text-[10px] font-mono uppercase font-black tracking-wide leading-none">{plan.label}</span>
                      <span className="text-xs font-bold font-mono mt-1.5">{plan.price}</span>
                    </button>
                  ))}
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Payment Method */}
                  <div className="flex flex-col gap-1 text-left">
                    <label className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">
                      {language === "bn" ? "পেমেন্ট মাধ্যম" : "PAYMENT METHOD"}
                    </label>
                    <div className="grid grid-cols-2 bg-black/40 p-1 rounded-xl border border-white/10">
                      <button
                        type="button"
                        onClick={() => { playSound("click"); setPaymentMethod("bKash"); }}
                        className={`py-2 px-3 rounded-lg font-mono text-[11px] font-black tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          paymentMethod === "bKash"
                            ? "bg-[#e2136e] text-white shadow"
                            : "text-gray-400 hover:text-white"
                        }`}
                      >
                        bKash
                      </button>
                      <button
                        type="button"
                        onClick={() => { playSound("click"); setPaymentMethod("Nagad"); }}
                        className={`py-2 px-3 rounded-lg font-mono text-[11px] font-black tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          paymentMethod === "Nagad"
                            ? "bg-[#f45322] text-white shadow"
                            : "text-gray-400 hover:text-white"
                        }`}
                      >
                        Nagad
                      </button>
                    </div>
                  </div>

                  {/* Sender Number */}
                  <div className="flex flex-col gap-1 text-left">
                    <label className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">
                      {language === "bn" ? "সেন্ডার নম্বর (যে নম্বর থেকে টাকা পাঠিয়েছেন)" : "SENDER NUMBER (FROM WHICH NUMBER)"}
                    </label>
                    <div className="relative">
                      <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="tel"
                        required
                        placeholder="017XXXXXXXX"
                        value={senderNumber}
                        onChange={(e) => setSenderNumber(e.target.value.replace(/\D/g, "").slice(0, 11))}
                        className={`w-full pl-9 pr-4 py-3 text-xs font-mono rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#C1121F] ${
                          isDark ? "bg-black/30 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-slate-800"
                        }`}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Transaction ID */}
                  <div className="flex flex-col gap-1 text-left">
                    <label className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">
                      {language === "bn" ? "ট্রানজেকশন আইডি (TrxID)" : "TRANSACTION ID (TRXID)"}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={language === "bn" ? "যেমন: 8N7D9K" : "e.g. 8N7D9K"}
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value.trim().toUpperCase().slice(0, 18))}
                      className={`w-full px-4 py-3 text-xs font-mono rounded-xl border uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-[#C1121F] ${
                        isDark ? "bg-black/30 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-slate-800"
                      }`}
                    />
                  </div>

                  {/* Paid Amount */}
                  <div className="flex flex-col gap-1 text-left">
                    <label className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">
                      {language === "bn" ? "টাকার পরিমাণ (Paid Amount)" : "PAID AMOUNT"}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">৳</span>
                      <input
                        type="number"
                        required
                        placeholder="799"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className={`w-full pl-7 pr-4 py-3 text-xs font-mono rounded-xl border focus:outline-none focus:ring-1 focus:ring-[#C1121F] ${
                          isDark ? "bg-black/30 border-white/10 text-white" : "bg-gray-55 border-gray-200 text-slate-800"
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Screenshot upload with drag & drop */}
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                    <span>{language === "bn" ? "পেমেন্ট স্ক্রিনশট (ঐচ্ছিক)" : "PAYMENT SCREENSHOT (OPTIONAL)"}</span>
                    <span className="text-[9px] text-gray-500 font-normal italic">Max size: 1.5MB</span>
                  </label>
                  
                  <div 
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-4 text-center transition-all flex flex-col items-center justify-center min-h-[120px] relative ${
                      dragActive 
                        ? "border-[#C1121F] bg-[#C1121F]/5" 
                        : isDark
                          ? "border-white/10 bg-black/20 hover:border-white/20"
                          : "border-gray-200 bg-gray-50 hover:border-gray-300"
                    }`}
                  >
                    <input 
                      type="file" 
                      id="screenshot-file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />

                    {screenshotUrl ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="relative w-16 h-16 rounded overflow-hidden border border-white/10">
                          <img src={screenshotUrl} alt="Screenshot preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <span className="text-[10px] text-emerald-400 font-bold">{language === "bn" ? "✓ স্ক্রিনশট লোড হয়েছে" : "✓ Screenshot Attached"}</span>
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); setScreenshotUrl(""); }}
                          className="text-[9px] text-red-500 hover:underline cursor-pointer"
                        >
                          {language === "bn" ? "বাদ দিন" : "Remove"}
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-gray-500 mb-2 animate-bounce" />
                        <p className="text-[10.5px] font-bold text-gray-450 leading-tight">
                          {language === "bn" ? "এখানে ফাইল ড্র্যাগ করুন অথবা ক্লিক করে আপলোড করুন" : "Drag screenshot image here or click to select"}
                        </p>
                        <p className="text-[9px] text-gray-550 mt-1 uppercase font-mono tracking-wider">Supports JPEG, PNG</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-[#C1121F] hover:bg-[#A30F19] text-white font-mono font-black text-xs tracking-widest rounded-xl transition duration-300 flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer shadow-lg shadow-[#C1121F]/15"
                >
                  {loading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                    />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>{language === "bn" ? "পেমেন্ট তথ্য ভেরিফাই করুন" : "VERIFY PAYMENT TRANSACTION"}</span>
                </button>

              </form>
            </div>

          </div>

          {/* RIGHT: CURRENT STATUS & PAYMENT HISTORY */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* 9. USER DASHBOARD / CURRENT SUBSCRIPTION STATUS */}
            <div className={`border rounded-2xl p-5 sm:p-6 ${
              isDark ? "bg-[#111111] border-white/10" : "bg-white border-red-150"
            }`}>
              <h3 className="text-sm font-black font-mono tracking-wider uppercase text-[#C1121F] mb-4">
                👑 {language === "bn" ? "আপনার সাবস্ক্রিপশন স্ট্যাটাস" : "MEMBERSHIP DECK METRICS"}
              </h3>

              <div className="flex flex-col gap-4 font-mono text-xs">
                
                <div className={`p-4 rounded-xl border flex flex-col gap-2.5 ${
                  user.isPremium
                    ? "bg-emerald-950/10 border-emerald-500/20 text-emerald-300"
                    : "bg-red-950/10 border-red-500/20 text-red-350"
                }`}>
                  <div className="flex justify-between items-center text-[10.5px] uppercase">
                    <span className="text-gray-400 font-bold">{language === "bn" ? "বর্তমান স্ট্যাটাস:" : "STATUS LEVEL:"}</span>
                    <span className={`font-black text-sm px-2 py-0.5 rounded ${
                      user.isPremium ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                    }`}>
                      {user.isPremium ? (language === "bn" ? "প্রিমিয়াম" : "ACTIVE ELITE") : (language === "bn" ? "ফ্রি ট্রায়াল" : "FREE USER")}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[10px] mt-1 pt-1.5 border-t border-white/5">
                    <span className="text-gray-400">{language === "bn" ? "প্যাকেজের নাম:" : "PLAN TYPE:"}</span>
                    <span className="font-extrabold text-white">
                      {user.isPremium 
                        ? getDurationText(user.premiumType || "1year")
                        : (language === "bn" ? "প্যাকেজ নেই" : "NO ACTIVE PLAN")}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-gray-400">{language === "bn" ? "মেয়াদ উত্তীর্ণের তারিখ:" : "EXPIRATION LIMIT:"}</span>
                    <span className="font-bold text-gray-300">
                      {user.premiumExpiry ? new Date(user.premiumExpiry).toLocaleDateString() : "Indefinite"}
                    </span>
                  </div>
                </div>

                <p className={`text-[10px] leading-relaxed text-center ${isDark ? "text-gray-550" : "text-slate-500"}`}>
                  {user.isPremium 
                    ? (language === "bn" ? "আপনার সাদা অ্যাপ্রোন প্রিমিয়াম কোর্স অ্যাক্সেস সম্পূর্ণ সক্রিয় আছে।" : "All clinical interactive MCQs, Combat arenas, and AI advisers are unlocked.")
                    : (language === "bn" ? "অ্যাক্সেস লক করা আছে। ১০,০০০+ কুইজ আনলক করতে পেমেন্ট করুন।" : "Locked sections can be audited instantly through our manual ledger verification flow.")}
                </p>

              </div>
            </div>

            {/* 9. PAYMENT HISTORY */}
            <div className={`border rounded-2xl p-5 sm:p-6 flex-1 ${
              isDark ? "bg-[#111111] border-white/10" : "bg-white border-red-150"
            }`}>
              <h3 className="text-sm font-black font-mono tracking-wider uppercase text-[#C1121F] mb-4">
                ⏳ {language === "bn" ? "পেমেন্ট ট্রানজেকশন ইতিহাস" : "TRANSACTION REGISTER LOG"}
              </h3>

              {requests.length === 0 ? (
                <div className="text-center py-8 flex flex-col items-center justify-center gap-2">
                  <span className="text-2xl opacity-40">📝</span>
                  <p className="text-[11px] text-gray-500 uppercase font-mono tracking-wider">
                    {language === "bn" ? "কোন লেনদেন ইতিহাস পাওয়া যায়নি।" : "No pending or historic submissions."}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3.5 max-h-[350px] overflow-y-auto pr-1">
                  {requests.map((req) => (
                    <div 
                      key={req.id}
                      className={`p-3.5 rounded-xl border flex flex-col gap-2 relative ${
                        isDark ? "bg-black/40 border-white/5 hover:border-white/10" : "bg-gray-55/40 border-gray-150"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col min-w-0">
                          <span className="text-[10.5px] font-black uppercase font-mono tracking-wide text-white flex items-center gap-1">
                            {req.paymentMethod} • {getDurationText(req.selectedPlan)}
                          </span>
                          <span className="text-[9px] text-gray-500 font-mono mt-0.5">
                            {new Date(req.submissionDate).toLocaleString()}
                          </span>
                        </div>

                        <span className={`text-[9px] font-mono uppercase font-black px-2 py-0.5 rounded shrink-0 ${
                          req.status === "Approved" 
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse" 
                            : req.status === "Rejected" 
                              ? "bg-red-500/10 text-red-400 border border-red-500/20" 
                              : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                        }`}>
                          {req.status === "Approved" 
                            ? (language === "bn" ? "অনুমোদিত" : "APPROVED") 
                            : req.status === "Rejected" 
                              ? (language === "bn" ? "প্রত্যাখ্যাত" : "REJECTED") 
                              : (language === "bn" ? "পেন্ডিং" : "PENDING")}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono mt-1 pt-1.5 border-t border-white/5 text-gray-400">
                        <div>
                          <span className="block text-[8px] text-gray-500 uppercase">TrxID:</span>
                          <span className="font-extrabold text-gray-300 truncate block max-w-full">{req.transactionId}</span>
                        </div>
                        <div>
                          <span className="block text-[8px] text-gray-500 uppercase">Paid Amount:</span>
                          <span className="font-bold text-gray-300 block">৳{req.amount}</span>
                        </div>
                      </div>

                      {req.adminNotes && (
                        <div className="bg-red-950/10 border border-red-500/15 rounded p-2 text-[9.5px] font-sans leading-normal text-red-300 mt-1">
                          <span className="font-bold block text-[8px] font-mono text-red-400 uppercase tracking-wider">Admin Feedback:</span>
                          {req.adminNotes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
