import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Calendar,
  CalendarPlus,
  Download,
  ExternalLink,
  Clock,
  Check,
  Bell,
  Copy,
  Sparkles,
  ChevronDown
} from "lucide-react";
import {
  CalendarEvent,
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
  generateOffice365CalendarUrl,
  downloadIcsFile,
  parseEventDates
} from "../../utils/calendarUtils";
import { playSound } from "../../audio";
import { NotificationService } from "../../lib/notificationService";

interface AddToCalendarButtonProps {
  event: CalendarEvent;
  type?: "exam" | "class";
  variant?: "primary" | "secondary" | "compact" | "badge";
  language?: "bn" | "en";
  theme?: "light" | "dark";
  userId?: string;
  userName?: string;
  courseId?: string;
  batchId?: string;
  className?: string;
}

export default function AddToCalendarButton({
  event,
  type = "exam",
  variant = "secondary",
  language = "en",
  theme = "dark",
  userId,
  userName,
  courseId,
  batchId,
  className = ""
}: AddToCalendarButtonProps) {
  const isBn = language === "bn";
  const isExam = type === "exam" || /exam|মডেল টেস্ট|পরীক্ষা/i.test(event.title);
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reminderSet, setReminderSet] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { start } = parseEventDates(event.startDate, event.durationMinutes);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleGoogleCalendar = () => {
    playSound("click");
    const url = generateGoogleCalendarUrl(event);
    window.open(url, "_blank", "noopener,noreferrer");
    setIsOpen(false);
  };

  const handleOutlook = () => {
    playSound("click");
    const url = generateOutlookCalendarUrl(event);
    window.open(url, "_blank", "noopener,noreferrer");
    setIsOpen(false);
  };

  const handleOffice365 = () => {
    playSound("click");
    const url = generateOffice365CalendarUrl(event);
    window.open(url, "_blank", "noopener,noreferrer");
    setIsOpen(false);
  };

  const handleDownloadIcs = () => {
    playSound("levelup");
    downloadIcsFile(event);
    setIsOpen(false);
  };

  const handleSetAppReminder = async () => {
    playSound("levelup");
    setReminderSet(true);

    // Request browser notification if available
    if ("Notification" in window && Notification.permission !== "granted") {
      try {
        await Notification.requestPermission();
      } catch (err) {
        console.error(err);
      }
    }

    // Trigger in-app notification event if userId provided
    if (userId) {
      try {
        NotificationService.triggerEvent("LIVE_CLASS_STARTING", {
          recipientId: userId,
          recipientName: userName || "Student",
          courseId: courseId,
          batchId: batchId,
          variables: {
            class_title: event.title,
            instructor_name: event.organizer || (isExam ? "Medical Exam Board" : "Course Faculty"),
            start_time: start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            join_url: event.url || ""
          }
        });
      } catch (e) {
        console.error(e);
      }
    }

    setTimeout(() => {
      setReminderSet(false);
      setIsOpen(false);
    }, 1800);
  };


  const handleCopyLink = () => {
    playSound("click");
    const textToCopy = `${event.title}\n📅 Date: ${start.toLocaleDateString()}\n⏰ Time: ${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}\n${event.url ? `🔗 Link: ${event.url}\n` : ""}${event.organizer ? `👨‍🏫 Instructor: ${event.organizer}` : ""}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Button styles based on variant
  const getButtonStyles = () => {
    if (variant === "primary") {
      return "bg-[#C1121F] hover:bg-red-700 text-white font-mono text-xs font-bold uppercase px-3.5 py-2 rounded-xl shadow-md border border-red-500/30 flex items-center gap-1.5 cursor-pointer transition-all";
    }
    if (variant === "compact") {
      return "p-2 bg-white/5 hover:bg-white/15 text-[#FFD700] hover:text-white rounded-xl border border-white/10 hover:border-[#FFD700]/40 transition-all cursor-pointer flex items-center gap-1 text-xs font-mono";
    }
    if (variant === "badge") {
      return "px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-[#FFD700] border border-[#FFD700]/30 hover:border-[#FFD700]/60 rounded-lg text-[11px] font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5";
    }
    // Default secondary
    return "px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-200 hover:text-white font-mono text-xs font-bold rounded-xl border border-white/10 hover:border-white/20 transition-all cursor-pointer flex items-center gap-1.5";
  };

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button
        id={`btn-calendar-${event.title.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase().slice(0, 20)}`}
        onClick={() => {
          playSound("click");
          setIsOpen(!isOpen);
        }}
        className={getButtonStyles()}
        title={isBn ? "ক্যালেন্ডার ও রিমাইন্ডার এ যুক্ত করুন" : "Add to Calendar & Set Reminder"}
        aria-label="Add to Calendar"
      >
        <CalendarPlus className="w-3.5 h-3.5 text-[#FFD700] shrink-0" />
        {variant !== "compact" && (
          <span className="truncate">
            {isBn ? "ক্যালেন্ডারে যোগ করুন" : "Add to Calendar"}
          </span>
        )}
        <ChevronDown className={`w-3 h-3 transition-transform opacity-70 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-64 sm:w-72 bg-[#141414] border border-white/15 rounded-2xl shadow-2xl z-50 overflow-hidden font-sans p-2 space-y-1"
          >
            {/* Header info */}
            <div className="px-3 py-2 border-b border-white/10 font-mono">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-[#FFD700] flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  {isExam
                    ? (isBn ? "লাইভ পরীক্ষা রিমাইন্ডার" : "LIVE EXAM REMINDER")
                    : (isBn ? "লাইভ সেশন রিমাইন্ডার" : "LIVE CLASS REMINDER")}
                </span>
                <span className="text-[10px] text-gray-400">
                  {event.durationMinutes}m
                </span>
              </div>
              <p className="text-xs text-white font-bold truncate mt-0.5">
                {event.title}
              </p>
              <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mt-1">
                <Clock className="w-3 h-3 text-emerald-400" />
                <span>
                  {start.toLocaleDateString(undefined, { month: "short", day: "numeric", weekday: "short" })} • {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>

            {/* Menu Options */}
            <div className="py-1 space-y-0.5 text-xs font-mono">
              {/* Google Calendar */}
              <button
                onClick={handleGoogleCalendar}
                className="w-full px-3 py-2 rounded-xl text-left text-gray-200 hover:text-white hover:bg-white/10 flex items-center justify-between transition cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-[11px] group-hover:scale-110 transition">
                    G
                  </div>
                  <div>
                    <span className="font-bold block">Google Calendar</span>
                    <span className="text-[9px] text-gray-400 block font-sans">
                      {isBn ? "গুগল ক্যালেন্ডারে যোগ করুন" : "Open in Google Calendar"}
                    </span>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-400" />
              </button>

              {/* Apple Calendar / iCal / .ICS */}
              <button
                onClick={handleDownloadIcs}
                className="w-full px-3 py-2 rounded-xl text-left text-gray-200 hover:text-white hover:bg-white/10 flex items-center justify-between transition cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-[11px] group-hover:scale-110 transition">
                    🍎
                  </div>
                  <div>
                    <span className="font-bold block">Apple / Outlook / iCal</span>
                    <span className="text-[9px] text-gray-400 block font-sans">
                      {isBn ? "ডাউনলোড করুন .ics ফাইল (১৫ মিনিট এলার্মসহ)" : "Download .ics file (with 15m alarm)"}
                    </span>
                  </div>
                </div>
                <Download className="w-3.5 h-3.5 text-gray-400 group-hover:text-purple-400" />
              </button>

              {/* Outlook / Office 365 Web */}
              <button
                onClick={handleOutlook}
                className="w-full px-3 py-2 rounded-xl text-left text-gray-200 hover:text-white hover:bg-white/10 flex items-center justify-between transition cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-[11px] group-hover:scale-110 transition">
                    O
                  </div>
                  <div>
                    <span className="font-bold block">Outlook Calendar</span>
                    <span className="text-[9px] text-gray-400 block font-sans">
                      {isBn ? "আউটলুক ওয়েব ক্যালেন্ডার" : "Outlook Web Calendar"}
                    </span>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-sky-400" />
              </button>

              {/* Set In-App Notification / Browser Alarm */}
              <button
                onClick={handleSetAppReminder}
                className={`w-full px-3 py-2 rounded-xl text-left flex items-center justify-between transition cursor-pointer group ${
                  reminderSet
                    ? "bg-emerald-500/20 text-emerald-300 font-bold"
                    : "text-gray-200 hover:text-white hover:bg-white/10"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[11px] group-hover:scale-110 transition">
                    <Bell className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold block">
                      {reminderSet
                        ? (isBn ? "রিমাইন্ডার সেট সম্পন্ন!" : "Reminder Confirmed!")
                        : (isBn ? "ইন-অ্যাপ এলার্ম সেট করুন" : "Set In-App Alarm")}
                    </span>
                    <span className="text-[9px] text-gray-400 block font-sans">
                      {isBn ? "শুরু হওয়ার ১৫ মিনিট আগে নোটিফিকেশন" : "15 mins before class starts"}
                    </span>
                  </div>
                </div>
                {reminderSet ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold uppercase">
                    Alert
                  </span>
                )}
              </button>

              {/* Copy Class Info & Link */}
              <button
                onClick={handleCopyLink}
                className="w-full px-3 py-2 rounded-xl text-left text-gray-300 hover:text-white hover:bg-white/10 flex items-center justify-between transition cursor-pointer group pt-1 border-t border-white/5"
              >
                <div className="flex items-center gap-2.5">
                  <Copy className="w-4 h-4 text-gray-400 group-hover:text-white" />
                  <span className="font-bold">
                    {copied
                      ? (isBn ? "কপিকৃত!" : "Copied Details!")
                      : (isBn ? "ক্লাস বিবরণ ও লিংক কপি করুন" : "Copy Schedule & Link")}
                  </span>
                </div>
                {copied && <Check className="w-3.5 h-3.5 text-emerald-400" />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
