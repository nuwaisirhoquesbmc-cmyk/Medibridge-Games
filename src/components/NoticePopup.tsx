import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bell, ShieldAlert, Check, Volume2, X } from "lucide-react";
import { AdminNotice } from "../types";
import { playSound } from "../audio";

interface NoticePopupProps {
  notices: AdminNotice[];
  language: "bn" | "en";
  theme?: "light" | "dark";
}

export default function NoticePopup({ notices, language, theme = "dark" }: NoticePopupProps) {
  const isDark = theme === "dark";
  const isBn = language === "bn";

  // List of read notice IDs from localStorage
  const [readIds, setReadIds] = useState<string[]>([]);
  const [currentNotice, setCurrentNotice] = useState<AdminNotice | null>(null);

  // Initialize read IDs from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("read_notice_ids");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setReadIds(parsed);
        } else {
          setReadIds([]);
        }
      }
    } catch (e) {
      console.error("Failed to parse read notices:", e);
      setReadIds([]);
    }
  }, []);

  // Compute unread notices and set the current active popup notice
  useEffect(() => {
    if (!notices || notices.length === 0) {
      setCurrentNotice(null);
      return;
    }

    // Filter notices that are not read yet
    const safeReadIds = Array.isArray(readIds) ? readIds : [];
    const unread = notices.filter((n) => n?.id && !safeReadIds.includes(n.id));

    if (unread.length > 0) {
      // Find the most recent unread notice
      const nextNotice = unread[0];
      setCurrentNotice(nextNotice);
    } else {
      setCurrentNotice(null);
    }
  }, [notices, readIds]);

  // Mark notice as read
  const handleMarkAsRead = () => {
    if (!currentNotice) return;

    playSound("click");
    const updatedIds = [...readIds, currentNotice.id];
    setReadIds(updatedIds);
    localStorage.setItem("read_notice_ids", JSON.stringify(updatedIds));
  };

  if (!currentNotice) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleMarkAsRead}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          transition={{ type: "spring", duration: 0.5 }}
          className={`relative w-full max-w-lg border rounded-2xl overflow-hidden shadow-2xl flex flex-col ${
            currentNotice.important
              ? "border-red-600/60 shadow-red-950/20"
              : isDark
              ? "border-white/10 shadow-black/50"
              : "border-red-150 shadow-red-900/10"
          } ${isDark ? "bg-[#111111]" : "bg-white text-gray-900"}`}
        >
          {/* Top colored bar indicator */}
          <div
            className={`h-1.5 w-full ${
              currentNotice.important
                ? "bg-gradient-to-r from-red-600 via-[#C1121F] to-red-600"
                : "bg-gradient-to-r from-amber-400 to-[#FFD700]"
            }`}
          />

          {/* Close button top corner */}
          <button
            onClick={handleMarkAsRead}
            className={`absolute top-4 right-4 p-1.5 rounded-full transition-all cursor-pointer ${
              isDark ? "hover:bg-white/5 text-gray-500 hover:text-white" : "hover:bg-gray-100 text-gray-400 hover:text-gray-900"
            }`}
            title={isBn ? "বন্ধ করুন" : "Dismiss Notice"}
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="p-6 pb-4 flex gap-4 items-start">
            <div
              className={`p-3 rounded-xl flex-shrink-0 flex items-center justify-center ${
                currentNotice.important
                  ? "bg-red-500/10 text-[#C1121F] border border-red-500/20"
                  : "bg-amber-400/10 text-[#FFD700] border border-amber-400/20"
              }`}
            >
              {currentNotice.important ? (
                <ShieldAlert className="w-6 h-6 animate-pulse" />
              ) : (
                <Bell className="w-6 h-6 animate-bounce" />
              )}
            </div>

            <div className="flex-1 min-w-0 pr-6">
              <span
                className={`text-[9px] font-mono font-extrabold uppercase px-2 py-0.5 rounded tracking-wider ${
                  currentNotice.important
                    ? "bg-red-900/30 text-red-400 border border-red-800/40"
                    : isDark
                    ? "bg-white/5 text-gray-300 border border-white/10"
                    : "bg-gray-100 text-gray-600 border border-gray-200"
                }`}
              >
                {currentNotice.important
                  ? isBn
                    ? "⚠️ গুরুত্বপূর্ণ ঘোষণা"
                    : "⚠️ CRITICAL BULLETIN"
                  : isBn
                  ? "📢 নতুন নোটিশ"
                  : "📢 NEW NOTICE"}
              </span>

              <h3 className={`font-extrabold text-base md:text-lg tracking-tight mt-2.5 font-display ${isDark ? "text-white" : "text-gray-900"}`}>
                {currentNotice.title}
              </h3>
            </div>
          </div>

          {/* Body */}
          <div className={`px-6 py-2 border-y text-sm leading-relaxed overflow-y-auto max-h-[250px] font-sans ${
            isDark ? "border-white/5 bg-black/20 text-gray-300" : "border-gray-100 bg-gray-50/50 text-gray-700"
          }`}>
            <p className="whitespace-pre-line">{currentNotice.content}</p>
          </div>

          {/* Footer controls */}
          <div className={`p-4 md:p-6 flex flex-col sm:flex-row gap-3 items-center justify-between ${
            isDark ? "bg-[#0c0c0c]" : "bg-gray-50"
          }`}>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-mono text-gray-500 uppercase font-semibold">
                {isBn ? "প্রচারকারী" : "BROADCASTED BY"}
              </span>
              <span className={`text-[11px] font-bold ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                {currentNotice.createdBy || (isBn ? "অ্যাডমিন কমান্ড" : "System Command")}
              </span>
            </div>

            <button
              onClick={handleMarkAsRead}
              className={`w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition transform active:scale-95 ${
                currentNotice.important
                  ? "bg-[#C1121F] hover:bg-red-700 text-white shadow-lg shadow-red-950/40"
                  : isDark
                  ? "bg-gray-800 hover:bg-gray-700 text-white"
                  : "bg-gray-900 hover:bg-gray-800 text-white"
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{isBn ? "পড়েছি (পপ-আপ বন্ধ করুন)" : "MARK AS READ"}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
