import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { db, isFirestoreQuotaExceeded, setFirestoreQuotaExhausted, isQuotaExceededError } from "../../firebase";
import {
  collection,
  query,
  where,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch
} from "firebase/firestore";
import { playSound } from "../../audio";
import { NotificationService } from "../../lib/notificationService";
import AllNotificationsModal, { UserNotificationItem } from "./AllNotificationsModal";
import {
  Bell,
  CheckCheck,
  ChevronRight,
  ExternalLink,
  Sparkles,
  BookOpen,
  Trophy,
  MessageSquare,
  DollarSign,
  AlertCircle,
  Video,
  FileText,
  Clock,
  Smartphone,
  Volume2,
  VolumeX,
  Send,
  ArrowLeft,
  X
} from "lucide-react";

interface NotificationBellProps {
  userId?: string;
  theme?: "light" | "dark";
  language?: "bn" | "en";
  setActiveTab: (tab: any) => void;
  onNotificationNavigate?: (notification: UserNotificationItem) => void;
  className?: string;
}

export default function NotificationBell({
  userId,
  theme = "dark",
  language = "bn",
  setActiveTab,
  onNotificationNavigate,
  className = ""
}: NotificationBellProps) {
  const isDark = theme === "dark";
  const [isOpen, setIsOpen] = useState(false);
  const [isAllModalOpen, setIsAllModalOpen] = useState(false);
  const [notifications, setNotifications] = useState<UserNotificationItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<"all" | "unread">("all");
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

  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const initialSnapshotRef = useRef<boolean>(false);
  const prevUnreadCountRef = useRef<number>(0);

  // Sync push permission events globally
  useEffect(() => {
    const handlePushSync = () => {
      setPushPermission("granted");
    };
    window.addEventListener("mb_push_permission_changed", handlePushSync);
    return () => window.removeEventListener("mb_push_permission_changed", handlePushSync);
  }, []);

  // Lock background body scroll on mobile overlay
  useEffect(() => {
    if (isOpen && typeof window !== "undefined" && window.innerWidth < 640) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Toggle notification sound
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

  // Request browser & phone push notification permission (Facebook/Telegram style)
  const handleEnablePush = async () => {
    playSound("click");
    const perm = await NotificationService.requestPushPermission();
    setPushPermission(perm);
    playSound("notification");
    NotificationService.sendBrowserPush(
      language === "bn" ? "🎉 পুশ নোটিফিকেশন চালু হয়েছে!" : "🎉 Push Notifications Activated!",
      language === "bn" ? "এখন থেকে আপনার ফোনে জরুরি এক্সাম রুটিন, ক্লাস ও নোটিশ পাবেন।" : "You will now receive exam alerts, class schedules, and notices directly on your phone.",
      "/dashboard",
      "HIGH"
    );
  };

  // Send test push notification
  const handleSendTestPush = () => {
    playSound("notification");
    setTestPushSent(true);
    NotificationService.sendBrowserPush(
      language === "bn" ? "🩺 MediBridge Games: টেস্ট নোটিফিকেশন" : "🩺 MediBridge Games: Test Notification",
      language === "bn" ? "আপনার ফোনে ও ব্রাউজারে সফলভাবে সাউন্ড ও নোটিফিকেশন এসেছে!" : "Sound and notification successfully received on your device like Facebook/Telegram!",
      "/dashboard",
      "HIGH"
    );
    setTimeout(() => setTestPushSent(false), 3000);
  };

  // Keep audio & push setting refs so toggling sound doesn't teardown and refetch query
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;
  const pushPermissionRef = useRef(pushPermission);
  pushPermissionRef.current = pushPermission;

  // Stream notifications for this user in real-time
  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      initialSnapshotRef.current = false;
      prevUnreadCountRef.current = 0;
      return;
    }

    if (isFirestoreQuotaExceeded()) {
      return;
    }

    // Limit to 15 recent notifications to prevent excessive document reads
    const q = query(
      collection(db, "user_notifications"),
      where("userId", "in", [userId, "all_students_broadcast", "all"]),
      limit(15)
    );

    let fallbackUnsub: (() => void) | null = null;
    let unsubscribe = () => {};

    try {
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const loaded: UserNotificationItem[] = [];
          snapshot.forEach((docSnap) => {
            loaded.push({
              id: docSnap.id,
              ...(docSnap.data() as any)
            });
          });

          // Client-side sort by createdAt descending
          loaded.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
          });

          const unreadCurrent = loaded.filter((n) => !n.read).length;

          // If not initial load and unread count increased, play notification sound & trigger push alert
          if (initialSnapshotRef.current) {
            if (unreadCurrent > prevUnreadCountRef.current) {
              if (soundEnabledRef.current) {
                playSound("notification");
              }
              if (typeof navigator !== "undefined" && "vibrate" in navigator) {
                try { navigator.vibrate([200, 100, 200]); } catch {}
              }
              // Trigger phone push if enabled and tab might be in background
              const latestNotif = loaded[0];
              if (latestNotif && !latestNotif.read) {
                NotificationService.sendBrowserPush(
                  latestNotif.title,
                  latestNotif.content || latestNotif.message || "New update received",
                  latestNotif.actionUrl || "/dashboard",
                  (latestNotif.priority as any) || "HIGH"
                );
              }
            }
          } else {
            initialSnapshotRef.current = true;
          }

          prevUnreadCountRef.current = unreadCurrent;
          setNotifications(loaded);
        },
        (err) => {
          if (isQuotaExceededError(err)) {
            setFirestoreQuotaExhausted();
            return;
          }
          console.warn("Notification stream fallback:", err.message);
          // Fallback simple query with bounded limit
          const fallbackQ = query(
            collection(db, "user_notifications"),
            where("userId", "==", userId),
            limit(15)
          );
          try {
            fallbackUnsub = onSnapshot(
              fallbackQ,
              (s) => {
                const l: UserNotificationItem[] = [];
                s.forEach((d) => l.push({ id: d.id, ...(d.data() as any) }));
                l.sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0));
                setNotifications(l);
              },
              (fErr) => {
                if (isQuotaExceededError(fErr)) setFirestoreQuotaExhausted();
                console.warn("Fallback notification stream warning:", fErr.message);
              }
            );
          } catch {}
        }
      );
    } catch (e) {
      if (isQuotaExceededError(e)) setFirestoreQuotaExhausted();
    }

    return () => {
      unsubscribe();
      if (fallbackUnsub) {
        fallbackUnsub();
      }
    };
  }, [userId]);

  // Click outside to close dropdown (on desktop)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const unreadList = notifications.filter((n) => !n.read);
  const unreadCount = unreadList.length;

  const displayList = activeFilter === "unread" ? unreadList : notifications;
  const recentNotifications = displayList.slice(0, 10);

  // Mark all notifications as read
  const handleMarkAllRead = async () => {
    playSound("click");
    if (!userId || unreadCount === 0) return;
    try {
      const batch = writeBatch(db);
      unreadList.forEach((notif) => {
        if (notif.id) {
          const ref = doc(db, "user_notifications", notif.id);
          batch.update(ref, { read: true });
        }
      });
      await batch.commit();
    } catch (e) {
      console.warn("Failed to mark all read:", e);
    }
  };

  // Smart action navigation based on notification payload
  const handleNotificationClick = async (notif: UserNotificationItem) => {
    playSound("click");

    // 1. Optimistic UI update so badge and styling update instantly
    if (!notif.read && notif.id) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
      );

      // 2. Mark as read in Firestore
      try {
        const notifRef = doc(db, "user_notifications", notif.id);
        await updateDoc(notifRef, {
          read: true,
          readAt: new Date().toISOString()
        });
      } catch (e) {
        console.warn("Failed to mark notification as read in Firestore:", e);
      }
    }

    // 3. Close open views
    setIsOpen(false);
    setIsAllModalOpen(false);

    // 4. Delegate to custom navigation coordinator if supplied
    if (typeof onNotificationNavigate === "function") {
      onNotificationNavigate(notif);
      return;
    }

    // 5. Default comprehensive target routing
    const target = notif.actionUrl || "";
    const lowerType = String(notif.type || "").toLowerCase();
    const metadata = notif.metadata || {};

    if (target.startsWith("tab:")) {
      const tabName = target.replace("tab:", "").split("?")[0];
      setActiveTab(tabName);
    } else if (
      lowerType.includes("question") ||
      lowerType.includes("doubt") ||
      lowerType.includes("reply") ||
      lowerType.includes("teacher") ||
      lowerType.includes("mentor") ||
      lowerType.includes("thread") ||
      lowerType.includes("discussion")
    ) {
      if (metadata.courseId || metadata.batchId) {
        setActiveTab("course_dashboard");
      } else if (lowerType.includes("social") || lowerType.includes("feed")) {
        setActiveTab("social");
      } else {
        setActiveTab("mentor");
      }
    } else if (
      lowerType.includes("result") ||
      lowerType.includes("score") ||
      lowerType.includes("rank_update") ||
      lowerType.includes("battle_result")
    ) {
      if (metadata.courseId) {
        setActiveTab("course_dashboard");
      } else if (metadata.mistakesCount || lowerType.includes("mistake")) {
        setActiveTab("mistakes");
      } else {
        setActiveTab("practice");
      }
    } else if (
      lowerType.includes("exam") ||
      lowerType.includes("test") ||
      lowerType.includes("model_test") ||
      lowerType.includes("schedule") ||
      lowerType.includes("reminder")
    ) {
      if (metadata.courseId) {
        setActiveTab("course_dashboard");
      } else {
        setActiveTab("practice");
      }
    } else if (
      lowerType.includes("class") ||
      lowerType.includes("recording") ||
      lowerType.includes("live") ||
      lowerType.includes("lecture")
    ) {
      if (metadata.courseId) {
        setActiveTab("course_dashboard");
      } else {
        setActiveTab("my_courses");
      }
    } else if (
      lowerType.includes("material") ||
      lowerType.includes("pdf") ||
      lowerType.includes("note") ||
      lowerType.includes("sheet")
    ) {
      if (metadata.courseId) {
        setActiveTab("course_dashboard");
      } else {
        setActiveTab("my_courses");
      }
    } else if (lowerType.includes("payment") || lowerType.includes("enroll")) {
      if (lowerType.includes("fail") || lowerType.includes("reject")) {
        setActiveTab("exambatch");
      } else {
        setActiveTab("my_courses");
      }
    } else if (lowerType.includes("notice") || lowerType.includes("announcement")) {
      if (metadata.courseId) {
        setActiveTab("course_dashboard");
      } else {
        setActiveTab("dashboard");
      }
    } else if (lowerType.includes("battle") || lowerType.includes("challenge") || lowerType.includes("arena")) {
      setActiveTab("practice");
    } else if (lowerType.includes("leaderboard") || lowerType.includes("rank")) {
      setActiveTab("leaderboard");
    } else if (lowerType.includes("mistake")) {
      setActiveTab("mistakes");
    } else {
      setActiveTab("dashboard");
    }
  };

  const getNotificationIcon = (type: string = "", priority: string = "") => {
    const t = type.toLowerCase();
    if (t.includes("payment_approved") || t.includes("payment_success")) {
      return <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 shrink-0 border border-emerald-500/25"><DollarSign className="w-4 h-4" /></div>;
    }
    if (t.includes("payment_rejected") || t.includes("payment_failed")) {
      return <div className="p-2 rounded-xl bg-red-500/15 text-red-400 shrink-0 border border-red-500/25"><AlertCircle className="w-4 h-4" /></div>;
    }
    if (t.includes("exam") || t.includes("test")) {
      return <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400 shrink-0 border border-purple-500/25"><BookOpen className="w-4 h-4" /></div>;
    }
    if (t.includes("result")) {
      return <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 shrink-0 border border-amber-500/25"><Trophy className="w-4 h-4" /></div>;
    }
    if (t.includes("class") || t.includes("live")) {
      return <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400 shrink-0 border border-blue-500/25"><Video className="w-4 h-4" /></div>;
    }
    if (t.includes("material") || t.includes("pdf") || t.includes("note")) {
      return <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 shrink-0 border border-cyan-500/25"><FileText className="w-4 h-4" /></div>;
    }
    if (t.includes("teacher") || t.includes("mentor") || t.includes("reply")) {
      return <div className="p-2 rounded-xl bg-pink-500/15 text-pink-400 shrink-0 border border-pink-500/25"><MessageSquare className="w-4 h-4" /></div>;
    }
    return <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 shrink-0 border border-indigo-500/25"><Bell className="w-4 h-4" /></div>;
  };

  const formatRelativeTime = (timeInput?: any) => {
    if (!timeInput) return language === "bn" ? "এইমাত্র" : "Just now";
    try {
      const date = typeof timeInput === "string" ? new Date(timeInput) : timeInput?.toDate ? timeInput.toDate() : new Date();
      const diffMs = Date.now() - date.getTime();
      const diffMin = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMin < 1) return language === "bn" ? "এইমাত্র" : "Just now";
      if (diffMin < 60) return language === "bn" ? `${diffMin} মি. আগে` : `${diffMin}m ago`;
      if (diffHours < 24) return language === "bn" ? `${diffHours} ঘ. আগে` : `${diffHours}h ago`;
      if (diffDays === 1) return language === "bn" ? "গতকাল" : "Yesterday";
      if (diffDays < 7) return language === "bn" ? `${diffDays} দিন আগে` : `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return language === "bn" ? "সম্প্রতি" : "Recently";
    }
  };

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Notification Bell Trigger Icon */}
      <button
        ref={buttonRef}
        id="btn-header-notification-bell"
        type="button"
        onClick={() => {
          playSound("click");
          setIsOpen(!isOpen);
        }}
        title={language === "bn" ? "নোটিফিকেশন ও বার্তা" : "Notifications & Updates"}
        className={`relative p-2 sm:p-2.5 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-center select-none active:scale-95 ${
          isOpen
            ? "bg-[#C1121F] text-white border-red-500 shadow-[0_0_15px_rgba(193,18,31,0.4)]"
            : isDark
              ? "bg-slate-950/40 hover:bg-slate-900/60 border-indigo-500/20 text-gray-300 hover:text-white"
              : "bg-white hover:bg-red-50/60 border-red-150 text-slate-700 hover:text-[#C1121F] shadow-sm"
        }`}
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <Bell className={`w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform duration-200 ${unreadCount > 0 ? "animate-pulse" : ""}`} />

        {/* Small Red Unread Badge with Count */}
        {unreadCount > 0 && (
          <span
            id="badge-notification-unread-count"
            className="absolute -top-1.5 -right-1.5 min-w-[19px] h-[19px] px-1 bg-[#C1121F] border-2 border-[#0B0F17] text-white text-[9.5px] font-black font-mono rounded-full flex items-center justify-center shadow-lg shadow-red-900/60 animate-pulse select-none leading-none z-20"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown: Full-page overlay on mobile, elegant floating card on desktop */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Mobile Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] sm:hidden"
            />

            {/* Container */}
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={`fixed inset-0 z-[100] w-full h-[100dvh] flex flex-col sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 sm:h-auto sm:max-h-[calc(100vh-80px)] sm:rounded-2xl border shadow-2xl overflow-hidden ${
                isDark
                  ? "bg-[#0A0E17] sm:bg-[#0B0F17]/95 border-white/10 sm:backdrop-blur-xl text-white shadow-black/90"
                  : "bg-[#F8FAFC] sm:bg-white/95 border-gray-200 sm:backdrop-blur-xl text-slate-850 shadow-2xl"
              }`}
            >
              {/* Dropdown / Mobile Overlay Header */}
              <div className={`p-3.5 sm:p-4 border-b flex items-center justify-between gap-2 shrink-0 ${
                isDark ? "border-white/10 bg-[#070A10]" : "border-gray-200 bg-white"
              }`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Mobile Back button */}
                  <button
                    type="button"
                    onClick={() => {
                      playSound("click");
                      setIsOpen(false);
                    }}
                    className="sm:hidden p-2 rounded-xl border border-white/10 bg-white/5 text-gray-300 hover:text-white cursor-pointer active:scale-95"
                    title={language === "bn" ? "বন্ধ করুন" : "Close"}
                  >
                    <ArrowLeft className="w-4 h-4 text-red-500" />
                  </button>

                  <div className="p-2 rounded-xl bg-red-500/15 text-red-400 border border-red-500/20 shrink-0">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider font-display truncate">
                        {language === "bn" ? "নোটিফিকেশন" : "NOTIFICATIONS"}
                      </h4>
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black bg-red-500 text-white font-mono leading-tight shadow-sm">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-500 font-mono hidden sm:block">
                      {language === "bn" ? "পরীক্ষা, ক্লাস ও নোটিশের আপডেট" : "Exams, classes & notice alerts"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Sound Toggle Button */}
                  <button
                    type="button"
                    onClick={toggleSound}
                    title={soundEnabled ? (language === "bn" ? "সাউন্ড মিউট করুন" : "Mute Sound") : (language === "bn" ? "সাউন্ড চালু করুন" : "Unmute Sound")}
                    className={`p-2 rounded-xl border transition cursor-pointer flex items-center justify-center ${
                      soundEnabled
                        ? isDark ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : "bg-amber-50 text-amber-600 border-amber-200"
                        : isDark ? "bg-white/5 text-gray-500 border-white/5" : "bg-gray-100 text-gray-400 border-gray-200"
                    }`}
                  >
                    {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </button>

                  {/* Mark All Read Button */}
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="text-[11px] font-bold font-mono text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer transition px-2.5 py-1.5 rounded-xl hover:bg-indigo-500/10 border border-indigo-500/20"
                      title={language === "bn" ? "সবগুলো পড়া হয়েছে চিহ্নিত করুন" : "Mark all as read"}
                    >
                      <CheckCheck className="w-4 h-4" />
                      <span className="hidden xs:inline">{language === "bn" ? "সব পড়ুন" : "Read all"}</span>
                    </button>
                  )}

                  {/* Desktop Close button */}
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="hidden sm:flex p-2 rounded-xl border border-white/10 bg-white/5 text-gray-400 hover:text-white cursor-pointer"
                    title={language === "bn" ? "বন্ধ করুন" : "Close"}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Mobile Push Notification Banner (Facebook / Telegram Style) */}
              {pushPermission !== "granted" ? (
                <div className={`p-3 sm:p-3.5 border-b flex items-center justify-between gap-3 shrink-0 ${
                  isDark ? "bg-gradient-to-r from-blue-950/50 via-indigo-950/40 to-purple-950/50 border-blue-500/25 text-blue-100" : "bg-blue-50 border-blue-200 text-blue-950"
                }`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 shrink-0 border border-blue-500/30">
                      <Smartphone className="w-4 h-4 animate-bounce" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black leading-tight truncate">
                        {language === "bn" ? "ফোনে নোটিফিকেশন পান" : "Get Phone Push Alerts"}
                      </p>
                      <p className="text-[10px] opacity-80 leading-tight truncate mt-0.5">
                        {language === "bn" ? "Telegram/FB এর মতো ইনস্ট্যান্ট অ্যালার্ট" : "Instant alerts like Telegram/FB"}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleEnablePush}
                    className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs font-mono shrink-0 shadow-md transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    <span>{language === "bn" ? "চালু করুন" : "Enable"}</span>
                  </button>
                </div>
              ) : (
                <div className={`px-3.5 py-2 border-b flex items-center justify-between text-xs shrink-0 ${
                  isDark ? "bg-emerald-950/30 border-emerald-500/20 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-800"
                }`}>
                  <span className="flex items-center gap-2 font-bold text-[11px]">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                    <span>{language === "bn" ? "ফোনে পুশ নোটিফিকেশন সক্রিয়" : "Mobile Push Active"}</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleSendTestPush}
                    disabled={testPushSent}
                    className={`text-[10px] font-mono font-bold px-2 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 cursor-pointer hover:bg-emerald-500/20 transition ${
                      testPushSent ? "text-amber-300 border-amber-500/40 bg-amber-500/10" : "text-emerald-400"
                    }`}
                  >
                    {testPushSent ? (language === "bn" ? "সাউন্ড বেজেছে! 🔔" : "Sound Played! 🔔") : (language === "bn" ? "টেস্ট পাঠান 🚀" : "Test Push 🚀")}
                  </button>
                </div>
              )}

              {/* Quick Filter Tabs */}
              <div className={`px-3.5 py-2.5 border-b flex items-center gap-2 text-xs font-mono font-bold shrink-0 ${
                isDark ? "border-white/5 bg-black/30" : "border-gray-100 bg-white"
              }`}>
                <button
                  type="button"
                  onClick={() => { playSound("click"); setActiveFilter("all"); }}
                  className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-2 ${
                    activeFilter === "all"
                      ? "bg-red-500 text-white shadow-md shadow-red-950/40"
                      : isDark ? "text-gray-400 hover:text-white bg-white/5" : "text-slate-600 hover:text-black bg-gray-100"
                  }`}
                >
                  <span>{language === "bn" ? "সকল" : "All"}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeFilter === "all" ? "bg-black/30 text-white" : isDark ? "bg-white/10" : "bg-gray-200"}`}>
                    {notifications.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => { playSound("click"); setActiveFilter("unread"); }}
                  className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-2 ${
                    activeFilter === "unread"
                      ? "bg-red-500 text-white shadow-md shadow-red-950/40"
                      : isDark ? "text-gray-400 hover:text-white bg-white/5" : "text-slate-600 hover:text-black bg-gray-100"
                  }`}
                >
                  <span>{language === "bn" ? "অপঠিত" : "Unread"}</span>
                  {unreadCount > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeFilter === "unread" ? "bg-black/30 text-white" : "bg-red-500/20 text-red-400 font-black"}`}>
                      {unreadCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Scrollable Notification List */}
              <div className="flex-1 overflow-y-auto divide-y divide-white/5 custom-scrollbar p-1">
                {recentNotifications.length === 0 ? (
                  <div className="py-16 sm:py-12 px-6 text-center flex flex-col items-center justify-center">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3 text-gray-400">
                      <Sparkles className="w-7 h-7 text-red-400" />
                    </div>
                    <p className="text-sm font-bold text-gray-300">
                      {language === "bn" ? "কোনো নতুন নোটিফিকেশন নেই" : "No notifications right now"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 max-w-xs">
                      {language === "bn" ? "আপনার সকল আপডেট পড়া সম্পন্ন হয়েছে। নতুন কোনো ক্লাস বা পরীক্ষার নোটিশ আসলে পেয়ে যাবেন।" : "You're all caught up! New exam and class announcements will arrive here."}
                    </p>
                  </div>
                ) : (
                  recentNotifications.map((notif) => {
                    const icon = getNotificationIcon(notif.type, notif.priority);
                    const timeAgo = formatRelativeTime(notif.createdAt);

                    return (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`p-3.5 sm:p-3 transition-colors cursor-pointer flex items-start gap-3 relative group rounded-xl my-1 ${
                          !notif.read
                            ? isDark
                              ? "bg-red-500/[0.1] hover:bg-red-500/[0.18] border border-red-500/20"
                              : "bg-red-50 hover:bg-red-100/80 border border-red-200"
                            : isDark
                              ? "hover:bg-white/[0.04] border border-transparent"
                              : "hover:bg-slate-100 border border-transparent"
                        }`}
                      >
                        {/* Unread Accent Dot */}
                        {!notif.read && (
                          <div className="absolute top-4 right-3.5 w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,1)]" />
                        )}

                        {/* Icon */}
                        {icon}

                        {/* Info */}
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="flex items-center gap-2 mb-1">
                            <h5 className={`text-xs sm:text-sm font-black truncate leading-snug ${
                              !notif.read
                                ? isDark ? "text-white" : "text-slate-950 font-black"
                                : isDark ? "text-gray-300" : "text-slate-800"
                            }`}>
                              {notif.title}
                            </h5>
                          </div>

                          <p className={`text-xs leading-relaxed ${
                            !notif.read
                              ? isDark ? "text-gray-200 font-medium" : "text-slate-800"
                              : isDark ? "text-gray-400" : "text-slate-600"
                          }`}>
                            {notif.content || notif.message}
                          </p>

                          <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-white/5 text-[10px] font-mono text-gray-500">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3 h-3 text-gray-500" />
                              <span>{timeAgo}</span>
                            </div>
                            <span className="text-red-400 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                              <span>{language === "bn" ? "ক্লিক করুন" : "Open"}</span>
                              <ChevronRight className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Dropdown Bottom: View Full-Page Notifications Center Option */}
              <div className={`p-3 sm:p-3 border-t text-center shrink-0 ${
                isDark ? "border-white/10 bg-[#070A10]" : "border-gray-200 bg-white"
              }`}>
                <button
                  type="button"
                  id="btn-view-all-notifications"
                  onClick={() => {
                    playSound("click");
                    setIsOpen(false);
                    setIsAllModalOpen(true);
                  }}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-black uppercase font-mono tracking-wider transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                    isDark
                      ? "bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/30"
                      : "bg-red-50 hover:bg-[#C1121F] text-[#C1121F] hover:text-white border border-red-200 shadow-sm"
                  }`}
                >
                  <span>{language === "bn" ? "সম্পূর্ণ নোটিফিকেশন সেন্টার খুলুন" : "Open Full Notification Center"}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Comprehensive All Notifications Modal */}
      <AllNotificationsModal
        isOpen={isAllModalOpen}
        onClose={() => setIsAllModalOpen(false)}
        notifications={notifications}
        theme={theme}
        language={language}
        onNotificationClick={handleNotificationClick}
        onMarkAllRead={handleMarkAllRead}
      />
    </div>
  );
}
