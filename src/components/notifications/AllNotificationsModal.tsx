import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { db } from "../../firebase";
import {
  doc,
  updateDoc,
  deleteDoc,
  writeBatch
} from "firebase/firestore";
import { playSound } from "../../audio";
import { NotificationService } from "../../lib/notificationService";
import {
  Bell,
  CheckCheck,
  Trash2,
  X,
  Search,
  BookOpen,
  Trophy,
  MessageSquare,
  DollarSign,
  AlertCircle,
  Video,
  FileText,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  GraduationCap,
  Volume2,
  VolumeX,
  Smartphone,
  Send,
  ArrowLeft,
  Filter,
  CheckCircle2,
  Radio
} from "lucide-react";

export interface UserNotificationItem {
  id: string;
  userId?: string;
  title: string;
  content?: string;
  message?: string;
  type?: string;
  priority?: "LOW" | "NORMAL" | "HIGH" | "CRITICAL" | string;
  actionUrl?: string;
  read: boolean;
  createdAt?: string | any;
  metadata?: any;
}

interface AllNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: UserNotificationItem[];
  theme?: "light" | "dark";
  language?: "bn" | "en";
  onNotificationClick: (notification: UserNotificationItem) => void;
  onMarkAllRead: () => Promise<void>;
  onClearAllRead?: () => Promise<void>;
}

export default function AllNotificationsModal({
  isOpen,
  onClose,
  notifications,
  theme = "dark",
  language = "bn",
  onNotificationClick,
  onMarkAllRead,
  onClearAllRead
}: AllNotificationsModalProps) {
  const isDark = theme === "dark";
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "unread" | "exams" | "classes" | "mentor" | "payments" | "announcements">("all");
  const [isProcessing, setIsProcessing] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>(() => {
    return NotificationService.getPushPermissionState();
  });
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("mb_notif_sound_enabled") !== "false";
    }
    return true;
  });
  const [testPushSent, setTestPushSent] = useState(false);

  // Sync push permission state globally across components
  useEffect(() => {
    const handlePushSync = () => {
      setPushPermission("granted");
    };
    window.addEventListener("mb_push_permission_changed", handlePushSync);
    return () => window.removeEventListener("mb_push_permission_changed", handlePushSync);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Toggle sound
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem("mb_notif_sound_enabled", next ? "true" : "false");
    if (next) {
      playSound("notification");
    } else {
      playSound("click");
    }
  };

  // Request browser push permission (Telegram/FB style)
  const handleEnablePush = async () => {
    playSound("click");
    const perm = await NotificationService.requestPushPermission();
    setPushPermission(perm);
    if (perm === "granted") {
      playSound("notification");
      NotificationService.sendBrowserPush(
        language === "bn" ? "🎉 পুশ নোটিফিকেশন সফলভাবে চালু হয়েছে!" : "🎉 Push Notifications Activated!",
        language === "bn" ? "এখন থেকে আপনার ফোনে ও ব্রাউজারে ইনস্ট্যান্ট নোটিফিকেশন পাবেন।" : "You will now receive instant push alerts like Facebook/Telegram.",
        "/dashboard",
        "HIGH"
      );
    }
  };

  // Send immediate test push to verify phone/browser sound and alert
  const handleSendTestPush = () => {
    playSound("notification");
    setTestPushSent(true);
    NotificationService.sendBrowserPush(
      language === "bn" ? "🩺 MediBridge Games: টেস্ট নোটিফিকেশন" : "🩺 MediBridge Games: Test Push Alert",
      language === "bn" ? "টেলিগ্রাম ও ফেসবুকের মতো সফলভাবে সাউন্ড ও নোটিফিকেশন ব্যানার এসেছে!" : "Instant notification banner and crystal chime sound received successfully!",
      "/courses/exams",
      "HIGH"
    );
    setTimeout(() => setTestPushSent(false), 3500);
  };

  // Category counts
  const counts = useMemo(() => {
    const unread = notifications.filter((n) => !n.read).length;
    const exams = notifications.filter((n) => {
      const t = (n.type || "").toLowerCase();
      return t.includes("exam") || t.includes("result") || t.includes("schedule") || t.includes("test");
    }).length;
    const classes = notifications.filter((n) => {
      const t = (n.type || "").toLowerCase();
      return t.includes("class") || t.includes("material") || t.includes("recording") || t.includes("live");
    }).length;
    const mentor = notifications.filter((n) => {
      const t = (n.type || "").toLowerCase();
      return t.includes("teacher") || t.includes("mentor") || t.includes("reply") || t.includes("doubt");
    }).length;
    const payments = notifications.filter((n) => {
      const t = (n.type || "").toLowerCase();
      return t.includes("payment") || t.includes("enroll");
    }).length;
    const announcements = notifications.filter((n) => {
      const t = (n.type || "").toLowerCase();
      return t.includes("notice") || t.includes("announcement") || t.includes("broadcast") || t.includes("urgent");
    }).length;

    return { total: notifications.length, unread, exams, classes, mentor, payments, announcements };
  }, [notifications]);

  // Filtered list
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      const title = (item.title || "").toLowerCase();
      const content = (item.content || item.message || "").toLowerCase();
      const type = (item.type || "").toLowerCase();
      const matchesSearch = !searchQuery || title.includes(searchQuery.toLowerCase()) || content.includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (categoryFilter === "unread") return !item.read;
      if (categoryFilter === "exams") return type.includes("exam") || type.includes("result") || type.includes("schedule") || type.includes("test");
      if (categoryFilter === "classes") return type.includes("class") || type.includes("material") || type.includes("recording") || type.includes("live");
      if (categoryFilter === "mentor") return type.includes("teacher") || type.includes("mentor") || type.includes("reply") || type.includes("doubt");
      if (categoryFilter === "payments") return type.includes("payment") || type.includes("enroll");
      if (categoryFilter === "announcements") return type.includes("notice") || type.includes("announcement") || type.includes("broadcast") || type.includes("urgent");

      return true;
    });
  }, [notifications, searchQuery, categoryFilter]);

  const handleDeleteSingle = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    playSound("click");
    try {
      await deleteDoc(doc(db, "user_notifications", id));
    } catch (err) {
      console.warn("Failed to delete notification:", err);
    }
  };

  const handleClearRead = async () => {
    playSound("click");
    setIsProcessing(true);
    try {
      if (onClearAllRead) {
        await onClearAllRead();
      } else {
        const readItems = notifications.filter((n) => n.read);
        const batch = writeBatch(db);
        readItems.forEach((n) => {
          if (n.id) {
            batch.delete(doc(db, "user_notifications", n.id));
          }
        });
        await batch.commit();
      }
    } catch (e) {
      console.warn("Failed to clear read notifications:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const getNotificationIcon = (type: string = "", priority: string = "") => {
    const t = type.toLowerCase();
    if (t.includes("payment_approved") || t.includes("payment_success")) {
      return <div className="p-2.5 sm:p-3 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0"><DollarSign className="w-5 h-5" /></div>;
    }
    if (t.includes("payment_rejected") || t.includes("payment_failed")) {
      return <div className="p-2.5 sm:p-3 rounded-2xl bg-red-500/15 text-red-400 border border-red-500/30 shrink-0"><AlertCircle className="w-5 h-5" /></div>;
    }
    if (t.includes("exam") || t.includes("test")) {
      return <div className="p-2.5 sm:p-3 rounded-2xl bg-purple-500/15 text-purple-400 border border-purple-500/30 shrink-0"><BookOpen className="w-5 h-5" /></div>;
    }
    if (t.includes("result")) {
      return <div className="p-2.5 sm:p-3 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0"><Trophy className="w-5 h-5" /></div>;
    }
    if (t.includes("class") || t.includes("live")) {
      return <div className="p-2.5 sm:p-3 rounded-2xl bg-blue-500/15 text-blue-400 border border-blue-500/30 shrink-0"><Video className="w-5 h-5" /></div>;
    }
    if (t.includes("material") || t.includes("pdf") || t.includes("note")) {
      return <div className="p-2.5 sm:p-3 rounded-2xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shrink-0"><FileText className="w-5 h-5" /></div>;
    }
    if (t.includes("teacher") || t.includes("mentor") || t.includes("reply")) {
      return <div className="p-2.5 sm:p-3 rounded-2xl bg-pink-500/15 text-pink-400 border border-pink-500/30 shrink-0"><MessageSquare className="w-5 h-5" /></div>;
    }
    if (priority === "CRITICAL" || priority === "HIGH") {
      return <div className="p-2.5 sm:p-3 rounded-2xl bg-red-500/15 text-red-400 border border-red-500/30 shrink-0"><AlertCircle className="w-5 h-5" /></div>;
    }
    return <div className="p-2.5 sm:p-3 rounded-2xl bg-red-500/15 text-red-400 border border-red-500/30 shrink-0"><Bell className="w-5 h-5" /></div>;
  };

  const formatTime = (timeInput?: any) => {
    if (!timeInput) return language === "bn" ? "কিছুক্ষণ আগে" : "Just now";
    try {
      const date = typeof timeInput === "string" ? new Date(timeInput) : timeInput?.toDate ? timeInput.toDate() : new Date();
      const diffMs = Date.now() - date.getTime();
      const diffMin = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMin < 1) return language === "bn" ? "এইমাত্র" : "Just now";
      if (diffMin < 60) return language === "bn" ? `${diffMin} মিনিট আগে` : `${diffMin}m ago`;
      if (diffHours < 24) return language === "bn" ? `${diffHours} ঘণ্টা আগে` : `${diffHours}h ago`;
      if (diffDays === 1) return language === "bn" ? "গতকাল" : "Yesterday";
      if (diffDays < 7) return language === "bn" ? `${diffDays} দিন আগে` : `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return language === "bn" ? "সম্প্রতি" : "Recently";
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        id="fullpage-notification-center"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 15 }}
        transition={{ duration: 0.2 }}
        className={`fixed inset-0 z-[200] w-full h-full flex flex-col overflow-hidden ${
          isDark
            ? "bg-[#080B10] text-white"
            : "bg-[#F8FAFC] text-slate-900"
        }`}
      >
        {/* Full-Page Top Navigation Bar */}
        <header className={`sticky top-0 z-30 px-4 sm:px-8 py-3.5 sm:py-4 border-b flex items-center justify-between gap-4 backdrop-blur-xl ${
          isDark ? "border-white/10 bg-[#0A0E17]/95" : "border-slate-200 bg-white/95 shadow-sm"
        }`}>
          {/* Left: Back / Title */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <button
              onClick={() => {
                playSound("click");
                onClose();
              }}
              title={language === "bn" ? "ফিরে যান" : "Back to Dashboard"}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2 select-none active:scale-95 ${
                isDark
                  ? "border-white/10 hover:border-red-500/40 bg-white/5 hover:bg-white/10 text-gray-200"
                  : "border-gray-200 hover:border-red-400 bg-gray-100 hover:bg-gray-200 text-slate-800"
              }`}
            >
              <ArrowLeft className="w-5 h-5 text-red-500" />
              <span className="hidden sm:inline font-mono text-xs font-bold uppercase">
                {language === "bn" ? "ড্যাশবোর্ডে ফিরুন" : "Back"}
              </span>
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-base sm:text-xl font-black font-display uppercase tracking-tight truncate flex items-center gap-2">
                  <Bell className="w-5 h-5 text-red-500 shrink-0" />
                  <span>{language === "bn" ? "নোটিফিকেশন ও নোটিশ সেন্টার" : "Notification & Notice Center"}</span>
                </h1>
                {counts.unread > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-500 text-white font-mono shadow-md shadow-red-950/40 animate-pulse">
                    {counts.unread} {language === "bn" ? "নতুন" : "NEW"}
                  </span>
                )}
              </div>
              <p className={`text-[11px] sm:text-xs truncate hidden sm:block ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                {language === "bn"
                  ? "লাইভ ক্লাস, পরীক্ষার রুটিন, রেজাল্ট, মেন্টরশিপ ও ফি সংক্রান্ত সকল লাইভ আপডেট"
                  : "Live classes, exam routines, results, mentorship and system announcements"}
              </p>
            </div>
          </div>

          {/* Right: Quick Controls (Sound Toggle, Mark All Read, Close) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Sound Toggle */}
            <button
              type="button"
              onClick={toggleSound}
              title={soundEnabled ? (language === "bn" ? "সাউন্ড মিউট করুন" : "Mute Sound") : (language === "bn" ? "সাউন্ড চালু করুন" : "Unmute Sound")}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                soundEnabled
                  ? isDark ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : "bg-amber-50 text-amber-700 border-amber-200"
                  : isDark ? "bg-white/5 text-gray-400 border-white/10" : "bg-gray-100 text-gray-500 border-gray-200"
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span className="hidden md:inline font-mono text-[11px] font-bold">
                {soundEnabled ? (language === "bn" ? "সাউন্ড চালু" : "Sound On") : (language === "bn" ? "সাউন্ড বন্ধ" : "Muted")}
              </span>
            </button>

            {/* Mark All Read */}
            {counts.unread > 0 && (
              <button
                onClick={async () => {
                  playSound("click");
                  await onMarkAllRead();
                }}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold font-mono bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all cursor-pointer active:scale-95"
              >
                <CheckCheck className="w-4 h-4" />
                <span className="hidden sm:inline">{language === "bn" ? "সবগুলো পড়ুন" : "Mark All Read"}</span>
              </button>
            )}

            {/* Close Cross */}
            <button
              onClick={() => {
                playSound("click");
                onClose();
              }}
              title={language === "bn" ? "বন্ধ করুন" : "Close"}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer active:scale-95 ${
                isDark
                  ? "border-white/10 hover:bg-white/10 text-gray-400 hover:text-white"
                  : "border-gray-200 hover:bg-gray-100 text-slate-600 hover:text-black"
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Facebook / Telegram Style Push Notification Bar */}
        <div className={`px-4 sm:px-8 py-3 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
          pushPermission === "granted"
            ? isDark ? "bg-emerald-950/25 border-emerald-500/20 text-emerald-200" : "bg-emerald-50 border-emerald-200 text-emerald-900"
            : isDark ? "bg-gradient-to-r from-blue-950/50 via-indigo-950/40 to-purple-950/50 border-blue-500/30 text-blue-100" : "bg-blue-50 border-blue-200 text-blue-950"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl shrink-0 ${
              pushPermission === "granted" ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-500/20 text-blue-400"
            }`}>
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xs sm:text-sm leading-tight">
                  {pushPermission === "granted"
                    ? (language === "bn" ? "ফোনে ও ব্রাউজারে পুশ নোটিফিকেশন সক্রিয়" : "Mobile Push Alerts Active")
                    : (language === "bn" ? "মোবাইল ফোনে তাৎক্ষণিক পুশ নোটিফিকেশন পান" : "Enable Phone Push Alerts (Facebook / Telegram Style)")}
                </span>
                {pushPermission === "granted" && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                )}
              </div>
              <p className="text-[11px] opacity-80 mt-0.5 leading-snug">
                {pushPermission === "granted"
                  ? (language === "bn" ? "ক্লাস বা পরীক্ষা শুরু হওয়ার সাথে সাথে ফোনে আওয়াজ ও নোটিফিকেশন ব্যানার আসবে।" : "Instant lockscreen banner & chime alert whenever new exams or classes start.")
                  : (language === "bn" ? "Telegram ও Facebook-এর মতো লকস্ক্রিনে পরীক্ষার রুটিন ও লাইভ ক্লাস লিংক অ্যালার্ট পেতে চালু করুন।" : "Get live alert banners even when app is minimized or phone is locked.")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {pushPermission !== "granted" ? (
              <button
                type="button"
                onClick={handleEnablePush}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-xs shadow-lg shadow-blue-900/40 transition active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <Smartphone className="w-4 h-4" />
                <span>{language === "bn" ? "নোটিফিকেশন চালু করুন" : "Enable Alerts"}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSendTestPush}
                disabled={testPushSent}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-mono font-bold text-xs transition active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{testPushSent ? (language === "bn" ? "সাউন্ড বেজেছে!" : "Alert Sent!") : (language === "bn" ? "টেস্ট নোটিফিকেশন পাঠান" : "Test Push")}</span>
              </button>
            )}
          </div>
        </div>

        {/* Search, Filter Tabs & Batch Management */}
        <div className={`px-4 sm:px-8 py-3.5 border-b space-y-3 ${
          isDark ? "border-white/10 bg-[#0C101A]" : "border-slate-200 bg-white"
        }`}>
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={language === "bn" ? "নোটিফিকেশন বা নোটিশের বিষয় খুঁজুন..." : "Search notifications by keywords..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-9 py-2 rounded-xl text-xs sm:text-sm border transition outline-none ${
                  isDark
                    ? "bg-black/40 border-white/15 text-white placeholder-gray-500 focus:border-red-500"
                    : "bg-slate-50 border-gray-300 text-slate-900 placeholder-slate-400 focus:border-red-500"
                }`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs p-1"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Actions for Read Management */}
            <div className="flex items-center gap-2 self-end md:self-center">
              {notifications.some((n) => n.read) && (
                <button
                  onClick={handleClearRead}
                  disabled={isProcessing}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                    isDark
                      ? "border-white/10 hover:border-red-500/40 bg-white/5 hover:bg-red-500/10 text-gray-300 hover:text-red-400"
                      : "border-gray-200 hover:border-red-300 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-600"
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{language === "bn" ? "পড়াগুলো সাফ করুন" : "Clear Read"}</span>
                </button>
              )}
            </div>
          </div>

          {/* Horizontal Category Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
            {[
              { id: "all", label: language === "bn" ? "🌟 সকল নোটিফিকেশন" : "🌟 All", count: counts.total },
              { id: "unread", label: language === "bn" ? "🔴 অপঠিত" : "🔴 Unread", count: counts.unread },
              { id: "exams", label: language === "bn" ? "📝 পরীক্ষার রুটিন ও রেজাল্ট" : "📝 Exams & Results", count: counts.exams },
              { id: "classes", label: language === "bn" ? "🎥 লাইভ ক্লাস ও রেকর্ডিং" : "🎥 Live Classes", count: counts.classes },
              { id: "mentor", label: language === "bn" ? "🩺 মেন্টর ডাউট ও রিপ্লাই" : "🩺 Mentor & Doubts", count: counts.mentor },
              { id: "announcements", label: language === "bn" ? "📢 জরুরি নোটিশ" : "📢 Notices", count: counts.announcements },
              { id: "payments", label: language === "bn" ? "💳 পেমেন্ট ও এনরোলমেন্ট" : "💳 Payments", count: counts.payments },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => { playSound("click"); setCategoryFilter(f.id as any); }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono whitespace-nowrap transition cursor-pointer flex items-center gap-2 border select-none ${
                  categoryFilter === f.id
                    ? "bg-red-600 text-white border-red-500 shadow-md shadow-red-950/40"
                    : isDark
                      ? "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white"
                      : "bg-slate-100 border-gray-200 text-slate-700 hover:bg-slate-200 hover:text-slate-900"
                }`}
              >
                <span>{f.label}</span>
                {f.count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    categoryFilter === f.id
                      ? "bg-black/30 text-white"
                      : isDark
                        ? "bg-white/10 text-gray-300"
                        : "bg-slate-200 text-slate-800"
                  }`}>
                    {f.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Main Notifications Feed */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-3 custom-scrollbar">
          <div className="max-w-5xl mx-auto space-y-3">
            {filteredNotifications.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-center p-6 bg-white/[0.01] rounded-3xl border border-dashed border-white/10">
                <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4 text-red-400 shadow-inner">
                  <Sparkles className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-base sm:text-lg font-black uppercase font-display tracking-wide mb-1">
                  {language === "bn" ? "কোনো নোটিফিকেশন পাওয়া যায়নি" : "No Notifications in this View"}
                </h3>
                <p className={`text-xs sm:text-sm max-w-md ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                  {searchQuery
                    ? (language === "bn" ? "অনুসন্ধানের সাথে কোনো নোটিফিকেশনের মিল পাওয়া যায়নি। অন্য শব্দ দিয়ে চেষ্টা করুন।" : "No matches found for your search query. Try searching with other terms.")
                    : (language === "bn" ? "আপনার সকল নোটিফিকেশন পড়া সম্পন্ন হয়েছে। নতুন কোনো ক্লাস বা পরীক্ষার নোটিশ আসলে এখানে দেখতে পাবেন।" : "You are completely up to date! New announcements will appear here.")}
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const icon = getNotificationIcon(notif.type, notif.priority);
                const timeText = formatTime(notif.createdAt);

                return (
                  <motion.div
                    key={notif.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    onClick={() => {
                      playSound("click");
                      onNotificationClick(notif);
                      onClose();
                    }}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer relative group flex items-start gap-4 ${
                      !notif.read
                        ? isDark
                          ? "bg-gradient-to-r from-red-950/20 via-[#161B26] to-[#121622] border-red-500/40 hover:border-red-500/60 shadow-xl shadow-red-950/20"
                          : "bg-red-50/90 border-red-200 hover:border-red-300 shadow-sm"
                        : isDark
                          ? "bg-[#0E121B] border-white/5 hover:border-white/15 hover:bg-[#121624] text-gray-300"
                          : "bg-white border-gray-200 hover:border-gray-300 hover:bg-slate-50 text-slate-800 shadow-sm"
                    }`}
                  >
                    {/* Glowing Unread Indicator */}
                    {!notif.read && (
                      <div className="absolute top-4 sm:top-5 right-4 sm:right-5 flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-black text-red-400 uppercase hidden sm:inline">
                          NEW
                        </span>
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,1)]" />
                      </div>
                    )}

                    {/* Left Category Icon */}
                    {icon}

                    {/* Main Content Details */}
                    <div className="flex-1 min-w-0 pr-6 sm:pr-8">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <h4 className={`text-sm sm:text-base font-black font-sans leading-snug ${
                          !notif.read
                            ? isDark ? "text-white font-extrabold" : "text-slate-950 font-black"
                            : isDark ? "text-gray-200 font-bold" : "text-slate-800 font-bold"
                        }`}>
                          {notif.title}
                        </h4>

                        {notif.priority && (notif.priority === "CRITICAL" || notif.priority === "HIGH") && (
                          <span className="text-[9.5px] font-mono font-black px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 border border-red-500/40 uppercase tracking-wider">
                            {notif.priority}
                          </span>
                        )}
                      </div>

                      <p className={`text-xs sm:text-sm leading-relaxed ${
                        !notif.read
                          ? isDark ? "text-gray-200" : "text-slate-800"
                          : isDark ? "text-gray-400" : "text-slate-600"
                      }`}>
                        {notif.content || notif.message}
                      </p>

                      {/* Card Bottom Meta Bar */}
                      <div className="flex items-center justify-between gap-3 mt-3 pt-2.5 border-t border-white/5 text-[11px] font-mono text-gray-400">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-gray-500" />
                          <span>{timeText}</span>
                          {notif.actionUrl && (
                            <span className="hidden sm:inline text-gray-500">• {notif.actionUrl}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-red-400 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                            <span>{language === "bn" ? "বিস্তারিত দেখুন" : "View Details"}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </span>

                          <button
                            title={language === "bn" ? "মুছে ফেলুন" : "Delete"}
                            onClick={(e) => handleDeleteSingle(e, notif.id)}
                            className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </main>
      </motion.div>
    </AnimatePresence>
  );
}

