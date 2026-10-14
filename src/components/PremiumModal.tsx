import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  Sparkles, 
  Check, 
  Flame, 
  Trophy, 
  Shield, 
  Bot, 
  CreditCard, 
  Layers, 
  Smartphone, 
  SmartphoneCharging,
  Zap,
  Star,
  Award,
  BookOpen
} from "lucide-react";
import { playSound } from "../audio";
import { UserProfile, PremiumConfig } from "../types";
import { db } from "../firebase";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Trophy,
  Bot,
  Flame,
  Shield,
  Sparkles,
  Zap,
  Star,
  Award,
  BookOpen,
  Layers,
  Smartphone,
  SmartphoneCharging,
  CreditCard,
  Check
};

const DEFAULT_PREMIUM_CONFIG: PremiumConfig = {
  prices: {
    monthly: 149,
    "6months": 599,
    "1year": 799
  },
  features: [
    {
      id: "elite-questions",
      titleEn: "Elite Questions",
      titleBn: "এলিট প্রশ্নব্যাংক",
      descEn: "10K+ High-yield expert MAT questions",
      descBn: "১০,০০০+ হাই-ইল্ড প্রিমিয়াম প্রশ্ন",
      icon: "Trophy",
      color: "red"
    },
    {
      id: "unlimited-ai",
      titleEn: "Unlimited AI",
      titleBn: "সীমাহীন এআই মেন্টরিং",
      descEn: "Unlimited AI Mentor analytical logs",
      descBn: "সীমাহীন মেডিসেন্স এআই মেন্টরিং",
      icon: "Bot",
      color: "yellow"
    },
    {
      id: "rewards",
      titleEn: "2X Rewards",
      titleBn: "২ গুণ পুরষ্কার",
      descEn: "Double gold coins and streak points",
      descBn: "২ গুণ অতিরিক্ত এক্সপি এবং কয়েন",
      icon: "Flame",
      color: "amber"
    },
    {
      id: "gold-frame",
      titleEn: "Gold Frame",
      titleBn: "স্বর্ণালী ফ্রেম",
      descEn: "Exclusive Golden Frame & rank tag",
      descBn: "লিজেন্ডারি মেম্বার ফ্রেম ও ব্যাজ",
      icon: "Shield",
      color: "indigo"
    }
  ]
};

const getColorClasses = (color: string, isDark: boolean) => {
  switch (color?.toLowerCase()) {
    case "red":
      return {
        bg: "bg-red-500/10 border-red-500/20",
        icon: "text-red-500",
        accent: "from-red-500/20 to-red-600/5"
      };
    case "yellow":
      return {
        bg: "bg-yellow-500/10 border-yellow-500/20",
        icon: "text-amber-500",
        accent: "from-yellow-500/20 to-amber-600/5"
      };
    case "amber":
      return {
        bg: "bg-amber-500/10 border-amber-500/20",
        icon: "text-amber-500",
        accent: "from-amber-500/20 to-yellow-600/5"
      };
    case "indigo":
      return {
        bg: "bg-indigo-500/10 border-indigo-500/20",
        icon: "text-indigo-500",
        accent: "from-indigo-500/20 to-blue-600/5"
      };
    case "emerald":
    case "green":
      return {
        bg: "bg-emerald-500/10 border-emerald-500/20",
        icon: "text-emerald-500",
        accent: "from-emerald-500/20 to-green-600/5"
      };
    case "purple":
      return {
        bg: "bg-purple-500/10 border-purple-500/20",
        icon: "text-purple-500",
        accent: "from-purple-500/20 to-fuchsia-600/5"
      };
    case "pink":
      return {
        bg: "bg-pink-500/10 border-pink-500/20",
        icon: "text-pink-500",
        accent: "from-pink-500/20 to-rose-600/5"
      };
    case "blue":
      return {
        bg: "bg-blue-500/10 border-blue-500/20",
        icon: "text-blue-500",
        accent: "from-blue-500/20 to-sky-600/5"
      };
    default:
      return {
        bg: "bg-zinc-500/10 border-zinc-500/20",
        icon: "text-zinc-500",
        accent: "from-zinc-500/20 to-zinc-600/5"
      };
  }
};


interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onProfileUpdate: (updated: Partial<UserProfile>) => Promise<void>;
  language: "bn" | "en";
  theme: "light" | "dark";
  onManualPaymentClick?: () => void;
}

type PaymentMethodType = "bkash" | "nagad" | "card";

export default function PremiumModal({ isOpen, onClose, user, onProfileUpdate, language, theme, onManualPaymentClick }: PremiumModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "6months" | "1year">("1year");
  const [paymentStep, setPaymentStep] = useState<"plan" | "method" | "checkout" | "processing" | "success">("plan");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>("bkash");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [trxId, setTrxId] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [otp, setOtp] = useState("");
  const [pin, setPin] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardName, setCardName] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [couponError, setCouponError] = useState("");
  const [isCouponApplied, setIsCouponApplied] = useState(false);

  const isDark = theme === "dark";

  const [config, setConfig] = useState<PremiumConfig>(DEFAULT_PREMIUM_CONFIG);

  useEffect(() => {
    if (!isOpen) return;
    getDoc(doc(db, "settings", "premium"))
      .then((docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as PremiumConfig;
          if (data && data.prices && Array.isArray(data.features)) {
            setConfig(data);
          }
        }
      })
      .catch((err) => {
        console.warn("Could not fetch premium settings:", err);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const currentPrice = selectedPlan === "monthly" 
    ? (config.prices?.monthly ?? 149) 
    : selectedPlan === "6months" 
      ? (config.prices?.["6months"] ?? 599) 
      : (config.prices?.["1year"] ?? 799);
  const durationText = selectedPlan === "monthly" 
    ? (language === "bn" ? "১ মাস" : "1 Month") 
    : selectedPlan === "6months"
      ? (language === "bn" ? "৬ মাস" : "6 Months")
      : (language === "bn" ? "১ বছর" : "1 Year");

  const startPaymentFlow = () => {
    playSound("click");
    setPaymentStep("method");
  };

  const selectPaymentMethod = (method: PaymentMethodType) => {
    playSound("click");
    setPaymentMethod(method);
    setPhoneNumber("");
    setTrxId("");
    setPaymentStep("checkout");
    setOtpSent(false);
    setErrorMsg("");
  };

  const handleVerifyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError("");
    const inputCode = couponCode.trim().toUpperCase();
    if (!inputCode) {
      setCouponError(language === "bn" ? "প্রোমো কোড লিখুন!" : "Enter promotional batch code first!");
      playSound("wrong");
      return;
    }

    const validCodes = ["RHYTHMMAHINGAMES"];

    if (validCodes.includes(inputCode)) {
      playSound("victory");
      setIsCouponApplied(true);
      setPaymentStep("processing");

      setTimeout(async () => {
        try {
          const expiryDate = new Date();
          expiryDate.setFullYear(expiryDate.getFullYear() + 2); // Unlocks for 2 full years!
          await onProfileUpdate({
            isPremium: true,
            premiumExpiry: expiryDate.toISOString(),
            premiumType: "6months"
          });
          
          try {
            await addDoc(collection(db, "enrollments"), {
              userId: user.uid,
              userEmail: user.email,
              userDisplayName: user.displayName,
              packageName: "Full Course Access",
              amount: 0,
              paymentMethod: "coupon",
              trxId: inputCode,
              status: "active",
              createdAt: new Date().toISOString(),
              expiryDate: expiryDate.toISOString(),
              notes: "Unlocked via Batch Promo Code"
            });
          } catch (enrollErr) {
            console.error("Failed to log enrollment receipt:", enrollErr);
          }

          setPaymentStep("success");
        } catch (err) {
          console.error(err);
          setCouponError(language === "bn" ? "সার্ভার আপডেট ত্রুটি!" : "Failed to update profile.");
          setPaymentStep("plan");
        }
      }, 1500);
    } else {
      setCouponError(language === "bn" ? "ভুল কোড! অনুগ্রহ করে আপনার পেইড ব্যাচ কোড চেক করুন।" : "Invalid code! Please check your batch code carefully.");
      playSound("wrong");
    }
  };

  const handleSimulatedCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (paymentMethod === "bkash" || paymentMethod === "nagad") {
      if (!phoneNumber || phoneNumber.length < 11) {
        setErrorMsg(language === "bn" ? "সঠিক ১১-ডিজিটের মোবাইল নম্বর দিন" : "Enter a valid 11-digit mobile number");
        playSound("wrong");
        return;
      }

      if (!trxId || trxId.trim().length < 6) {
        setErrorMsg(language === "bn" ? "সঠিক ট্রানজেকশন আইডি (TrxID) দিন (কমপক্ষে ৬ সংখ্যার)" : "Enter a valid Transaction ID (TrxID) received from mobile bank. Minimum 6 letters.");
        playSound("wrong");
        return;
      }
    } else {
      // Card rules
      if (!cardNumber || cardNumber.replace(/\s/g, "").length < 16) {
        setErrorMsg(language === "bn" ? "১৬ ডিজিটের কার্ড নম্বর দিন" : "Enter valid 16-digit Card Number");
        playSound("wrong");
        return;
      }
      if (!expiry || !cvv) {
        setErrorMsg(language === "bn" ? "কার্ডের মেয়াদ এবং CVV দিন" : "Enter expiry and CVV parameters");
        playSound("wrong");
        return;
      }
    }

    // Process loading
    playSound("click");
    setPaymentStep("processing");

    // Dynamic timeout mimicking payment gateways secure SSL
    setTimeout(async () => {
      try {
        const currentDate = new Date();
        const expiryDate = new Date();
        if (selectedPlan === "monthly") {
          expiryDate.setMonth(currentDate.getMonth() + 1);
        } else if (selectedPlan === "6months") {
          expiryDate.setMonth(currentDate.getMonth() + 6);
        } else {
          expiryDate.setFullYear(currentDate.getFullYear() + 1);
        }

        // UNLOCK PREMIUM PARAMS ON THE BACKEND SENSITIVELY
        await onProfileUpdate({
          isPremium: true,
          premiumExpiry: expiryDate.toISOString(),
          premiumType: selectedPlan
        });

        try {
          await addDoc(collection(db, "enrollments"), {
            userId: user.uid,
            userEmail: user.email,
            userDisplayName: user.displayName,
            packageName: selectedPlan === "monthly" 
              ? "Monthly Premium Access" 
              : selectedPlan === "6months" 
                ? "6-Months Premium Access" 
                : "1-Year Premium Access",
            amount: currentPrice,
            paymentMethod: paymentMethod,
            trxId: trxId || "SIM_GATEWAY_" + Math.random().toString(36).substring(2, 11).toUpperCase(),
            status: "active",
            createdAt: new Date().toISOString(),
            expiryDate: expiryDate.toISOString(),
            notes: "Simulated payment checkout successful"
          });
        } catch (enrollErr) {
          console.error("Failed to log enrollment receipt:", enrollErr);
        }

        playSound("victory");
        setPaymentStep("success");
      } catch (err: any) {
        console.error(err);
        setErrorMsg(language === "bn" ? "নেটওয়ার্ক ত্রুটি। আবার চেষ্টা করুন।" : "Network synchronizer failed. Try again.");
        setPaymentStep("checkout");
        playSound("wrong");
      }
    }, 2000);
  };

  const handleClose = () => {
    playSound("click");
    onClose();
    // reset status
    setPaymentStep("plan");
    setPhoneNumber("");
    setOtp("");
    setPin("");
    setCardNumber("");
    setOtpSent(false);
    setErrorMsg("");
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length > 0 ? parts.join(" ") : v;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm" id="premium-membership-root">
        
        {/* Backdrop clickable escape */}
        <div className="absolute inset-0" onClick={handleClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", duration: 0.4 }}
          className={`relative w-full max-w-lg max-h-[calc(100vh-2rem)] flex flex-col border rounded-3xl shadow-2xl z-10 overflow-hidden ${
            isDark 
              ? "bg-[#0A0A0B] border-white/10 text-white shadow-red-950/20" 
              : "bg-white border-red-100 text-slate-800 shadow-red-200/50"
          }`}
        >
          
          {/* Top Elegant Gradient Border Trim */}
          <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-[#C1121F] via-amber-400 to-[#C1121F] z-30" />

          {/* CLOSE EXCEL ESCAPE KEY */}
          <button
            onClick={handleClose}
            className={`absolute top-4 right-4 p-2 rounded-full border transition-all hover:scale-110 active:scale-95 cursor-pointer z-35 ${
              isDark 
                ? "border-white/5 hover:border-white/10 bg-white/5 text-gray-400 hover:text-white" 
                : "border-red-150 hover:border-red-200 bg-red-50 text-[#C1121F]"
            }`}
          >
            <X className="w-4 h-4" />
          </button>

          {/* INNER SCROLLABLE BOX COMPARTMENT with sleek customized styling */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-7 md:p-8 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-red-200 dark:[&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
            <AnimatePresence mode="wait">
              
              {/* STAGE 1: PLAN SELECT && BENEFITS OVERVIEW */}
              {paymentStep === "plan" && (
                <motion.div
                  key="plan"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="flex flex-col gap-6"
                >
                  <div className="text-center pt-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-400/10 border border-yellow-400/30 rounded-full text-yellow-500 text-[10px] font-black tracking-widest uppercase mb-3 select-none animate-pulse">
                      <Sparkles className="w-3.5 h-3.5" />
                      {language === "bn" ? "মেডিব্রিজ গেমস প্রিমিয়াম" : "MEDIBRIDGE PREMIUM"}
                    </span>
                    <h2 className={`text-2xl md:text-3xl font-black font-display uppercase tracking-tight leading-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                      {language === "bn" ? "হোয়াইট কোট স্পেশাল প্যাক" : "WHITE APRON SPECIAL ACCESS"}
                    </h2>
                    <p className={`text-xs mt-1.5 leading-relaxed max-w-sm mx-auto ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                      {language === "bn" 
                        ? "ভর্তি পরীক্ষায় ডিএমসি এবং শীর্ষ মেডিকেল কলেজগুলোর আসন নিশ্চিত করার চূড়ান্ত আরপিজি বুস্টার।" 
                        : "RPG booster toolkit built to secure your dream seats in premium public medical colleges."}
                    </p>
                  </div>

                  {/* PREMIUM BENEFITS DECK GRID */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                    {config.features.map((feature, idx) => {
                      const IconComponent = ICON_MAP[feature.icon] || Sparkles;
                      const colors = getColorClasses(feature.color, isDark);
                      return (
                        <motion.div
                          key={feature.id || idx}
                          whileHover={{ scale: 1.02, y: -2 }}
                          transition={{ type: "spring", stiffness: 300, damping: 15 }}
                          className={`relative p-4 rounded-2xl border flex gap-3.5 items-start overflow-hidden transition-all duration-300 ${
                            isDark 
                              ? "bg-white/[0.01] hover:bg-white/[0.03] border-white/5 hover:border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.5)]" 
                              : "bg-white hover:bg-gray-50 border-gray-100 hover:border-gray-200 hover:shadow-lg hover:shadow-red-500/5 shadow-sm"
                          }`}
                        >
                          <div className={`absolute -right-8 -bottom-8 w-24 h-24 rounded-full bg-gradient-to-br ${colors.accent} blur-xl opacity-60 pointer-events-none`} />

                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-sm ${colors.bg}`}>
                            <IconComponent className={`w-5 h-5 ${colors.icon}`} />
                          </div>

                          <div className="relative z-10">
                            <h4 className={`text-xs font-extrabold uppercase tracking-wide flex items-center gap-1.5 ${isDark ? "text-white" : "text-slate-800"}`}>
                              {language === "bn" ? feature.titleBn : feature.titleEn}
                            </h4>
                            <p className="text-[10px] text-gray-400 dark:text-gray-400 mt-1 leading-normal font-medium">
                              {language === "bn" ? feature.descBn : feature.descEn}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* ACTIVE PRE-EXISTING SUBSCRIPTION CHECK */}
                  {user.isPremium ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 text-center">
                      <p className="text-xs text-emerald-500 font-extrabold uppercase font-mono mb-1">
                        ♛ YOU ARE ALREADY A PREMIUM LEGEND!
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {language === "bn" ? "মেয়াদের শেষ সীমা: " : "Activation limit expires: "}
                        <span className="font-bold text-emerald-400">{user.premiumExpiry ? new Date(user.premiumExpiry).toLocaleDateString() : "Indefinite"}</span>
                      </p>
                    </div>
                  ) : null}

                  {/* MULTI TIER PRICING SELECTION CARDS */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                    
                    {/* Monthly Package Selection */}
                    <div
                      onClick={() => { playSound("click"); setSelectedPlan("monthly"); }}
                      className={`relative p-4 rounded-2xl border-2 transition-all duration-300 transform cursor-pointer flex flex-col justify-between ${
                        selectedPlan === "monthly"
                          ? "border-[#C1121F] bg-[#C1121F]/10 scale-[1.03] shadow-[0_0_15px_rgba(193,18,31,0.25)]"
                          : isDark 
                            ? "border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]" 
                            : "border-gray-200 bg-gray-50/50 hover:border-gray-300 hover:bg-gray-100/50"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] font-mono uppercase font-black tracking-wider ${
                            selectedPlan === "monthly" ? "text-[#C1121F] dark:text-red-400" : "text-gray-400"
                          }`}>
                            {language === "bn" ? "প্রতি মাস" : "Monthly"}
                          </span>
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center ${selectedPlan === "monthly" ? "text-[#C1121F]" : "text-transparent"}`}>
                            <Check className="w-4.5 h-4.5 font-bold" />
                          </div>
                        </div>
                        <h3 className={`text-xl font-black mt-2 tracking-tight ${
                          selectedPlan === "monthly" ? "text-[#C1121F]" : isDark ? "text-white" : "text-slate-900"
                        }`}>
                          {config.prices?.monthly ?? 149} TK <span className="text-[10px] text-gray-500 font-normal">/ mo</span>
                        </h3>
                      </div>
                      <p className="text-[9.5px] text-gray-400 uppercase font-black tracking-wider mt-3">
                        {language === "bn" ? "সাধারণ প্যাক" : "Standard Grind"}
                      </p>
                    </div>

                    {/* 6 Months Package Selection */}
                    <div
                      onClick={() => { playSound("click"); setSelectedPlan("6months"); }}
                      className={`relative p-4 rounded-2xl border-2 transition-all duration-300 transform cursor-pointer flex flex-col justify-between ${
                        selectedPlan === "6months"
                          ? "border-yellow-500 bg-yellow-500/15 scale-[1.03] shadow-[0_0_20px_rgba(234,179,8,0.25)]"
                          : isDark 
                            ? "border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]" 
                            : "border-gray-200 bg-gray-50/50 hover:border-gray-300 hover:bg-gray-100/50"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] font-mono uppercase font-black tracking-wider ${
                            selectedPlan === "6months" ? "text-yellow-500" : "text-gray-400"
                          }`}>
                            {language === "bn" ? "৬ মাসের কম্বো" : "6 Months Combo"}
                          </span>
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center ${selectedPlan === "6months" ? "text-yellow-500" : "text-transparent"}`}>
                            <Check className="w-4.5 h-4.5 font-bold" />
                          </div>
                        </div>
                        <h3 className={`text-xl font-black mt-2 tracking-tight ${
                          selectedPlan === "6months" ? "text-yellow-500" : isDark ? "text-white" : "text-slate-900"
                        }`}>
                          {config.prices?.["6months"] ?? 599} TK <span className="text-[10px] text-gray-500 font-normal">/ 6 mo</span>
                        </h3>
                      </div>
                      <p className="text-[9.5px] text-yellow-500 uppercase font-black tracking-wider mt-3">
                        {language === "bn" ? "৩৩% সরাসরি সাশ্রয়" : "SAVE ~33% OVERALL"}
                      </p>
                    </div>

                    {/* 1 Year Package Selection */}
                    <div
                      onClick={() => { playSound("click"); setSelectedPlan("1year"); }}
                      className={`relative p-4 rounded-2xl border-2 transition-all duration-300 transform cursor-pointer flex flex-col justify-between ${
                        selectedPlan === "1year"
                          ? "border-emerald-500 bg-emerald-500/15 scale-[1.03] shadow-[0_0_20px_rgba(16,185,129,0.25)]"
                          : isDark 
                            ? "border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]" 
                            : "border-gray-200 bg-gray-50/50 hover:border-gray-300 hover:bg-gray-100/50"
                      }`}
                    >
                      <div className="absolute -top-2.5 right-2 bg-gradient-to-r from-emerald-500 to-green-600 border border-emerald-300 text-white text-[8px] font-black tracking-widest px-2 py-0.5 rounded-full uppercase shadow-md select-none animate-pulse">
                        {language === "bn" ? "সেরা ভ্যালু ৫৫% সাশ্রয়" : "BEST VALUE"}
                      </div>
                      <div>
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] font-mono uppercase font-black tracking-wider ${
                            selectedPlan === "1year" ? "text-emerald-400" : "text-gray-400"
                          }`}>
                            {language === "bn" ? "১ বছরের পাস" : "1 Year Pass"}
                          </span>
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center ${selectedPlan === "1year" ? "text-emerald-500" : "text-transparent"}`}>
                            <Check className="w-4.5 h-4.5 font-bold" />
                          </div>
                        </div>
                        <div className="mt-2">
                          <span className="text-[10px] text-gray-500 line-through block leading-none mb-1">
                            ৳{Math.round((config.prices?.["1year"] ?? 799) * 2.2)} BDT
                          </span>
                          <h3 className={`text-xl font-black tracking-tight leading-none ${
                            selectedPlan === "1year" ? "text-emerald-400" : isDark ? "text-white" : "text-slate-900"
                          }`}>
                            {config.prices?.["1year"] ?? 799} TK <span className="text-[10px] text-gray-500 font-normal">/ yr</span>
                          </h3>
                        </div>
                      </div>
                      <p className="text-[9.5px] text-emerald-400 uppercase font-black tracking-wider mt-3">
                        {language === "bn" ? "৫৫% মেগা সাশ্রয়" : "SAVE ~55% MEGA"}
                      </p>
                    </div>

                  </div>

                  {/* PAID BATCH STUDENT PROMO CODES */}
                  <div className={`p-4 rounded-2xl border transition-colors ${
                    isDark ? "bg-white/[0.01] border-white/5" : "bg-amber-50/20 border-yellow-100"
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-base">🎓</span>
                      <h4 className="text-xs font-black uppercase tracking-wide text-yellow-600 dark:text-yellow-400">
                        {language === "bn" ? "মেডিকেল পেইড ব্যাচ স্টুডেন্ট?" : "Paid Batch Activation"}
                      </h4>
                    </div>
                    <p className="text-[10px] text-gray-500 leading-normal mb-3">
                      {language === "bn" 
                        ? "আপনি আমাদের প্রিমিয়াম মেডিকেল স্পেশাল ব্যাচের সদস্য হলে আপনার সম্পূর্ণ ফ্রি প্রোমোশনাল কোডটি এখানে দিন।" 
                        : "Official enrolled students can paste their secure enrollment promotional vouchers here."}
                    </p>
                    <form onSubmit={handleVerifyCoupon} className="flex gap-2">
                      <input
                        type="text"
                        placeholder={language === "bn" ? "অ্যাক্টিভেশন কোডটি লিখুন" : "ENTER BATCH PASSCODE"}
                        value={couponCode}
                        onChange={(e) => {
                          setCouponCode(e.target.value);
                          setCouponError("");
                        }}
                        className={`flex-1 px-3.5 py-2 rounded-xl border font-mono text-xs uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-yellow-500 ${
                          isDark 
                            ? "bg-black/60 border-white/10 text-white focus:border-yellow-500" 
                            : "bg-white border-gray-200 text-slate-800 focus:border-yellow-500"
                        }`}
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-amber-600 hover:opacity-90 font-black text-[10px] uppercase tracking-wider text-black rounded-xl transition-all shadow-sm shrink-0"
                      >
                        {language === "bn" ? "সাবমিট" : "SUBMIT"}
                      </button>
                    </form>
                    {couponError && (
                      <p className="text-[10px] text-red-500 font-mono mt-2.5 uppercase font-black animate-pulse flex items-center gap-1">
                        ⚠️ {couponError}
                      </p>
                    )}
                  </div>

                  {/* PROCEED PRIMARY CTA */}
                  <button
                    onClick={() => {
                      if (onManualPaymentClick) {
                        onManualPaymentClick();
                      }
                    }}
                    className="w-full py-4 bg-[#C1121F] hover:bg-red-750 text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider transition-all shadow-[0_4px_15px_rgba(193,18,31,0.30)] hover:shadow-[0_4px_22px_rgba(193,18,31,0.40)] flex items-center justify-center gap-2 cursor-pointer border-b-4 border-red-950 font-display transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <span>{language === "bn" ? "পেমেন্ট ভেরিফিকেশন ধাপে যান" : "PROCEED TO MANUAL PAYMENT"}</span>
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                  </button>

                </motion.div>
              )}

              {/* STAGE 2: CHOOSE PAYMENT SYSTEMS */}
              {paymentStep === "method" && (
                <motion.div
                  key="method"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="flex flex-col gap-6"
                >
                  <div className="text-center pt-2">
                    <span className="text-[10px] font-mono bg-red-500/10 text-[#C1121F] px-2.5 py-0.5 rounded-full font-black uppercase tracking-widest inline-block mb-2">
                      {durationText} {language === "bn" ? "মেম্বারশিপ পেমেন্ট" : "Plan Upgrade"}
                    </span>
                    <h2 className="text-xl font-black font-display uppercase tracking-wider">
                      {language === "bn" ? "লেনদেনের মাধ্যম নির্ধারণ করুন" : "SELECT PAYMENT GATEWAY"}
                    </h2>
                    <p className={`text-xs mt-1 leading-relaxed max-w-sm mx-auto ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                      {language === "bn" ? "নিরাপদ ডিজিটাল গেটওয়ে দিয়ে পেমেন্ট সম্পন্ন করুন।" : "Secure automated checkouts powered by Bangladesh mobile financial services & local SSL layers."}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    
                    {/* bKash Selection */}
                    <button
                      onClick={() => selectPaymentMethod("bkash")}
                      className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between text-left cursor-pointer transform duration-200 hover:scale-[1.01] ${
                        isDark 
                          ? "bg-[#e2136e]/5 hover:bg-[#e2136e]/10 border-white/5 hover:border-[#e2136e]/50 text-white" 
                          : "bg-pink-50/20 hover:bg-pink-50 border-gray-200 hover:border-[#e2136e] text-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-10 h-10 rounded-xl bg-[#e2136e] text-white font-black flex items-center justify-center text-xs shrink-0 shadow-md">
                          bkash
                        </span>
                        <div>
                          <h4 className="font-extrabold text-[#e2136e] uppercase tracking-wider text-xs">BKASH WALLET</h4>
                          <p className="text-[10px] text-gray-500 mt-0.5">{language === "bn" ? "অটোমেটেড ইনস্ট্যান্ট বিকাশ পেমেন্ট" : "Convenient mobile bank sandbox mechanism"}</p>
                        </div>
                      </div>
                      <Layers className="w-4 h-4 text-gray-400" />
                    </button>

                    {/* Nagad Selection */}
                    <button
                      onClick={() => selectPaymentMethod("nagad")}
                      className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between text-left cursor-pointer transform duration-200 hover:scale-[1.01] ${
                        isDark 
                          ? "bg-[#f45322]/5 hover:bg-[#f45322]/10 border-white/5 hover:border-[#f45322]/50 text-white" 
                          : "bg-orange-50/20 hover:bg-orange-50 border-gray-200 hover:border-[#f45322] text-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#f45322] to-amber-500 text-white font-black flex items-center justify-center text-[10px] shrink-0 shadow-md">
                          নগদ
                        </span>
                        <div>
                          <h4 className="font-extrabold text-[#f45322] uppercase tracking-wider text-xs">NAGAD WALLET</h4>
                          <p className="text-[10px] text-gray-500 mt-0.5">{language === "bn" ? "নিরাপদ নগদ স্যান্ডবক্স গেটওয়ে" : "Fastest dynamic wallet sandbox"}</p>
                        </div>
                      </div>
                      <Layers className="w-4 h-4 text-gray-400" />
                    </button>

                    {/* Credit Card / SSL Selection */}
                    <button
                      onClick={() => selectPaymentMethod("card")}
                      className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between text-left cursor-pointer transform duration-200 hover:scale-[1.01] ${
                        isDark 
                          ? "bg-white/[0.02] hover:bg-white/[0.05] border-white/5 hover:border-blue-500/40 text-white" 
                          : "bg-slate-50/40 hover:bg-slate-50 border-gray-200 hover:border-blue-500 text-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shrink-0 shadow-md">
                          <CreditCard className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-widest text-xs">CARDS / NET BANKING</h4>
                          <p className="text-[10px] text-gray-500 mt-0.5">Visa, Mastercard, DBBL Nexus networks</p>
                        </div>
                      </div>
                      <Layers className="w-4 h-4 text-gray-400" />
                    </button>

                  </div>

                  {/* BACK TO OVERVIEW BUTTON */}
                  <button
                    onClick={() => { playSound("click"); setPaymentStep("plan"); }}
                    className={`mt-2 py-3 bg-transparent hover:bg-white/5 border rounded-2xl text-[10px] uppercase font-black tracking-widest font-mono text-center transition-all cursor-pointer ${
                      isDark ? "border-white/5 text-gray-400" : "border-red-100 text-[#C1121F]"
                    }`}
                  >
                    ← {language === "bn" ? "পূর্ববর্তী ধাপে যান" : "BACK TO SELECTION"}
                  </button>

                </motion.div>
              )}

              {/* STAGE 3: INTERACTIVE CHECKOUT SCREEN */}
              {paymentStep === "checkout" && (
                <motion.div
                  key="checkout"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="flex flex-col gap-6"
                >
                  <div className="text-center pt-2">
                    <span className="text-[10px] font-mono tracking-widest uppercase font-black text-gray-400 block mb-1">
                      {paymentMethod === "bkash" ? "bKash checkout gateway" : paymentMethod === "nagad" ? "Nagad checkout gateway" : "SSL Secure Cards"}
                    </span>
                    <h2 className={`text-xl font-black font-display uppercase ${
                      paymentMethod === "bkash" ? "text-pink-650" : paymentMethod === "nagad" ? "text-orange-600" : "text-blue-600"
                    }`}>
                      {paymentMethod === "bkash" ? "বিকাশ পেমেন্ট" : paymentMethod === "nagad" ? "নগদ পেমেন্ট" : "Secure Billing Form"}
                    </h2>
                    <div className={`mt-2 inline-block px-3 py-1 border rounded-lg text-xs font-mono font-bold ${
                      isDark ? "bg-white/5 border-white/10" : "bg-red-50 border-red-100"
                    }`}>
                      {language === "bn" ? "মোট চার্জ:" : "Total Charge:"} <span className="text-[#C1121F] font-black">{currentPrice} BDT</span> ({durationText})
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-xs py-2 px-4 rounded-xl text-center font-mono uppercase font-black">
                      ⚠️ {errorMsg}
                    </div>
                  )}

                  {/* INTUITIVE VIRTUAL CARD PREVIEW FOR CARDS METRICS */}
                  {paymentMethod === "card" && (
                    <div className="relative w-full aspect-[1.586/1] rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 p-6 text-white border border-white/10 shadow-xl overflow-hidden flex flex-col justify-between font-mono select-none">
                      {/* Interactive glowing nodes */}
                      <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-blue-500/20 blur-2xl pointer-events-none animate-pulse" />
                      <div className="absolute -left-10 -bottom-10 w-32 h-32 rounded-full bg-violet-500/20 blur-2xl pointer-events-none animate-pulse" />
                      
                      <div className="flex justify-between items-start z-10">
                        <div className="flex flex-col">
                          <span className="text-[8px] font-sans text-slate-400 tracking-wider font-bold">PREMIUM PLATINUM CARD</span>
                          <span className="text-xs font-sans font-black text-yellow-500 tracking-wider mt-0.5">MEDIBRIDGE GOLD</span>
                        </div>
                        <div className="w-10 h-7 flex items-center justify-center bg-white/5 border border-white/15 rounded text-[10px] font-sans font-black italic tracking-tighter text-indigo-200">
                          VISA
                        </div>
                      </div>

                      <div className="flex items-center gap-3 my-2 z-10">
                        <div className="w-8 h-6 rounded bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-205 opacity-85 flex items-center justify-center border border-yellow-600/30">
                          <div className="grid grid-cols-3 w-5 h-4 opacity-40 border border-slate-950/10" />
                        </div>
                        <span className="text-slate-400 text-[10px] tracking-widest animate-pulse">🛜</span>
                      </div>

                      <div className="text-base sm:text-lg font-bold tracking-widest text-center text-slate-100 drop-shadow-md z-10 font-mono">
                        {cardNumber || "•••• •••• •••• ••••"}
                      </div>

                      <div className="flex justify-between items-end mt-2 z-10">
                        <div className="flex flex-col min-w-0">
                          <span className="text-[8px] text-slate-400">CARD HOLDER</span>
                          <span className="text-[11px] font-bold tracking-wide uppercase text-slate-100 truncate max-w-[170px]">
                            {cardName || "YOUR NAME"}
                          </span>
                        </div>
                        <div className="flex gap-4 shrink-0">
                          <div className="flex flex-col items-center">
                            <span className="text-[8px] text-slate-400">EXPIRES</span>
                            <span className="text-[11px] font-bold text-slate-100">
                              {expiry || "MM/YY"}
                            </span>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-[8px] text-slate-400">CVV</span>
                            <span className="text-[11px] font-bold text-slate-100">
                              {cvv ? "•••" : "•••"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSimulatedCheckout} className="flex flex-col gap-4">
                    
                    {/* PHONE CHECKOUT FOR DIGITAL BANKING */}
                    {(paymentMethod === "bkash" || paymentMethod === "nagad") ? (
                      <>
                        {/* Dynamic send money banner instructions */}
                        <div className={`p-3.5 rounded-xl border border-dashed text-[11px] leading-relaxed ${
                          paymentMethod === "bkash" 
                            ? "bg-[#e2136e]/5 border-[#e2136e]/30 text-slate-800 dark:text-gray-200" 
                            : "bg-[#f45322]/5 border-[#f45322]/30 text-slate-800 dark:text-gray-200"
                        }`}>
                          <p className="font-extrabold text-xs mb-1.5 flex items-center gap-1">
                            <span>📢</span>
                            {language === "bn" ? "পেমেন্ট ইন্সট্রাকশন:" : "⚠️ PAYMENT INSTRUCTIONS:"}
                          </p>
                          <ol className="list-decimal pl-4 space-y-1">
                            <li>
                              {language === "bn" 
                                ? `আপনার বিকাশ/নগদ অ্যাপ থেকে ${currentPrice} টাকা "Send Money" করুন।` 
                                : `Send Money BDT ${currentPrice} to our primary payment wallet.`}
                            </li>
                            <li>
                              {language === "bn" 
                                ? "আমাদের বিকাশ/নগদ পার্সোনাল নম্বর: " 
                                : "Our official agent number: "}
                              <span className="font-extrabold text-amber-500 font-mono tracking-wider bg-black/10 dark:bg-black/30 px-1 py-0.2 rounded">01XXXXXXXXX</span>
                            </li>
                            <li>
                              {language === "bn" 
                                ? "টাকা পাঠানোর পর যে ট্রানজেকশন আইডি (TrxID) পাবেন, তা নিচে টাইপ করুন।" 
                                : "After successful transaction, input your wallet number & TrxID below."}
                            </li>
                          </ol>
                        </div>

                        {/* Wallet phone number */}
                        <div>
                          <label className="text-[10px] font-mono uppercase text-gray-450 block mb-1.5 font-bold">
                            {paymentMethod === "bkash" ? "Your bKash Number (বিকাশ নম্বর)" : "Your Nagad Number (নগদ নম্বর)"}
                          </label>
                          <div className="relative">
                            <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="tel"
                              required
                              placeholder="01XXXXXXXXX"
                              value={phoneNumber}
                              onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 11))}
                              className={`w-full pl-10 pr-4 py-3 rounded-xl border font-mono text-sm leading-none focus:outline-none focus:ring-1 focus:ring-red-400 ${
                                isDark ? "bg-black/40 border-white/5 text-white" : "bg-gray-50 border-gray-200 text-slate-800"
                              }`}
                            />
                          </div>
                        </div>

                        {/* Transaction ID */}
                        <div>
                          <label className="text-[10px] font-mono uppercase text-gray-450 block mb-1.5 font-bold">
                            {language === "bn" ? "ট্রানজেকশন আইডি (TrxID)" : "Transaction ID (TrxID)"}
                          </label>
                          <input
                            type="text"
                            required
                            placeholder={language === "bn" ? "যেমন: 8N7D9K" : "e.g., 8N7D9K"}
                            value={trxId}
                            onChange={(e) => setTrxId(e.target.value.trim().toUpperCase().slice(0, 18))}
                            className={`w-full px-4 py-3 rounded-xl border font-mono text-sm uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-red-400 ${
                              isDark ? "bg-black/40 border-white/5 text-white" : "bg-gray-50 border-gray-200 text-slate-800"
                            }`}
                          />
                        </div>
                      </>
                    ) : (
                      
                      /* CREDIT DEBIT CARD CHECKOUT FORM */
                      <div className="flex flex-col gap-3.5 mt-2">
                        <div>
                          <label className="text-[10px] font-mono uppercase text-gray-450 block mb-1.5 font-bold">CARD HOLDER NAME</label>
                          <input
                            type="text"
                            required
                            placeholder="GAZI AJMAL"
                            value={cardName}
                            onChange={(e) => setCardName(e.target.value.slice(0, 40))}
                            className={`w-full px-4 py-3 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-red-450 ${
                              isDark ? "bg-black/40 border-white/5 text-white" : "bg-gray-55/60 border-gray-200 text-slate-800"
                            }`}
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-mono uppercase text-gray-450 block mb-1.5 font-bold">CARD NUMBER</label>
                          <input
                            type="text"
                            required
                            placeholder="4000 1234 5678 9010"
                            value={cardNumber}
                            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                            className={`w-full px-4 py-3 rounded-xl border font-mono text-xs focus:outline-none focus:ring-1 focus:ring-red-450 ${
                              isDark ? "bg-black/40 border-white/5 text-white" : "bg-gray-55/60 border-gray-200 text-slate-800"
                            }`}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-mono uppercase text-gray-450 block mb-1.5 font-bold">VALID THRU</label>
                            <input
                              type="text"
                              required
                              placeholder="12/28"
                              value={expiry}
                              onChange={(e) => setExpiry(e.target.value.slice(0, 5))}
                              className={`w-full px-4 py-3 rounded-xl border text-center font-mono text-xs focus:outline-none focus:ring-1 focus:ring-red-450 ${
                                isDark ? "bg-black/40 border-white/5 text-white" : "bg-gray-55/60 border-gray-200 text-slate-800"
                              }`}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-mono uppercase text-gray-450 block mb-1.5 font-bold">CVV/CVC</label>
                            <input
                              type="password"
                              required
                              placeholder="•••"
                              value={cvv}
                              maxLength={3}
                              onChange={(e) => setCvv(e.target.value.replace(/\D/g, ""))}
                              className={`w-full px-4 py-3 rounded-xl border text-center font-mono text-xs focus:outline-none focus:ring-1 focus:ring-red-450 ${
                                isDark ? "bg-black/40 border-white/5 text-white" : "bg-gray-55/60 border-gray-200 text-slate-800"
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SUBMIT SIMULATED GATEWAY CALL TRICK */}
                    <button
                      type="submit"
                      className={`w-full py-4 mt-4 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow border-b-2 transform duration-150 hover:scale-[1.01] active:scale-95 ${
                        paymentMethod === "bkash" 
                          ? "bg-pink-600 hover:bg-pink-700 border-pink-950" 
                          : paymentMethod === "nagad" 
                            ? "bg-orange-600 hover:bg-orange-700 border-orange-950" 
                            : "bg-indigo-600 hover:bg-indigo-700 border-indigo-950"
                      }`}
                    >
                      <span>
                        {language === "bn" 
                          ? `${currentPrice} BDT ট্রানজেকশন সাবমিট করুন` 
                          : `CONFIRM & SUBMIT TRANSACTION`}
                      </span>
                    </button>

                  </form>

                  {/* GO BACK TO MAIN SELECTION */}
                  <button
                    onClick={() => { playSound("click"); setPaymentStep("method"); }}
                    className={`text-center font-mono text-[9px] uppercase font-black tracking-widest bg-transparent py-2.5 rounded-xl border transition-all cursor-pointer ${
                      isDark ? "border-white/5 text-gray-405 hover:bg-white/5" : "border-red-100 text-[#C1121F] hover:bg-red-50"
                    }`}
                  >
                    ← {language === "bn" ? "পেমেন্ট মাধ্যম পরিবর্তন করুন" : "CHANGE PAYMENT TYPE"}
                  </button>

                </motion.div>
              )}

              {/* STAGE 4: PROCESSING PAYMENTS SECURELY */}
              {paymentStep === "processing" && (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-12 text-center"
                >
                  <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
                    
                    {/* Spinning elegant medical glow rings */}
                    <div className="absolute inset-0 rounded-full border-4 border-dashed border-red-500 animate-spin" />
                    <div className="absolute inset-2 rounded-full border-4 border-[#FFD700] opacity-50 animate-pulse" />
                    <SmartphoneCharging className="w-8 h-8 text-[#FFD700] animate-bounce" />

                  </div>

                  <h3 className="text-lg font-black font-display uppercase tracking-wider">
                    {language === "bn" ? "লেনদেন প্রক্রিয়াকরণ করা হচ্ছে" : "PROCESSING TRANSACTION"}
                  </h3>
                  <p className={`text-xs mt-2.5 max-w-xs leading-relaxed ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                    {language === "bn" 
                      ? "পেমেন্ট সম্পন্ন হচ্ছে। অনুগ্রহ করে উইন্ডো বন্ধ বা রিফ্রেশ করবেন না।" 
                      : "Verifying credentials with central banking gateways. Please do not close this container."}
                  </p>
                </motion.div>
              )}

              {/* STAGE 5: CELEBRATE PREMIUM UNLOCKED SUCCESS */}
              {paymentStep === "success" && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-6 text-center gap-6"
                >
                  
                  {/* Confetti Explosion Mimic Crown */}
                  <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-4xl animate-bounce shadow">
                    👑
                  </div>

                  <div>
                    <span className="text-[10px] font-mono font-black text-emerald-550 border border-emerald-500/30 px-3 py-1 bg-emerald-500/10 rounded-full uppercase tracking-widest">
                      {language === "bn" ? "লেনদেন সফল হয়েছে" : "TRANSACTION SUCCESSFUL"}
                    </span>
                    <h2 className="text-2xl font-black font-display text-emerald-500 uppercase mt-4 tracking-tight">
                      {language === "bn" ? "প্রিমিয়াম সক্রিয় হয়েছে!" : "PREMIUM UNLOCKED!"}
                    </h2>
                    <p className={`text-xs mt-2 max-w-sm leading-relaxed ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                      {language === "bn" 
                        ? "অভিনন্দন! আপনার হোয়াইট কোট স্পেশাল প্রিমিয়াম মেম্বারশিপ এখন সফলভাবে সক্রিয়। আপনি এখন সমস্ত চ্যাপ্টার ও এআই ফিচারের পূর্ণ সুবিধা উপভোগ করতে পারবেন।" 
                        : "Success! Your White Apron Premium access is fully logged and unlocked. Gain immediate benefits inside standard MCQs, Combat Arena, and AI advisers."}
                    </p>
                  </div>

                  {/* PREMIUM PARAMS SUMMARY BOARD */}
                  <div className={`p-4 rounded-2xl border w-full text-left font-mono text-[11px] leading-relaxed ${
                    isDark ? "bg-white/[0.01] border-white/5" : "bg-red-50/20 border-red-100"
                  }`}>
                    <div className="flex justify-between py-1.5 border-b border-gray-150/10">
                      <span className="text-gray-400 uppercase">ACCESS LEVEL</span>
                      <span className="text-yellow-500 font-extrabold uppercase">♛ ELITE PATRIOT</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-gray-150/10">
                      <span className="text-gray-400 uppercase">DURATION TYPE</span>
                      <span className="text-white font-extrabold uppercase shrink-0">{selectedPlan}</span>
                    </div>
                    <div className="flex justify-between py-1.5 pt-2">
                      <span className="text-gray-400 uppercase">EXPIRATION</span>
                      <span className="text-emerald-500 font-black">
                        {(() => {
                          const date = new Date();
                          if (selectedPlan === "monthly") {
                            date.setMonth(date.getMonth() + 1);
                          } else if (selectedPlan === "6months") {
                            date.setMonth(date.getMonth() + 6);
                          } else {
                            date.setFullYear(date.getFullYear() + 1);
                          }
                          return date.toLocaleDateString();
                        })()}
                      </span>
                    </div>
                  </div>

                  {/* ENTER HOORAY ARENA BUTTON */}
                  <button
                    onClick={handleClose}
                    className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold rounded-2xl text-xs uppercase tracking-widest shadow-md transition-all border-b-4 border-emerald-950 cursor-pointer font-display transform hover:scale-[1.01]"
                  >
                    {language === "bn" ? "অসাধারণ! কমব্যাটে ফিরে যান" : "AWESOME! ENTER ARENA"}
                  </button>

                </motion.div>
              )}

            </AnimatePresence>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
