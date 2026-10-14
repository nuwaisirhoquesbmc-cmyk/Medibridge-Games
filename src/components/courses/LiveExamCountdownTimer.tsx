import React, { useState, useEffect } from "react";
import { Timer, Clock, AlertCircle } from "lucide-react";

export const toBengaliDigits = (num: number | string): string => {
  const bnDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return String(num).replace(/[0-9]/g, (d) => bnDigits[Number(d)]);
};

export const padZero = (n: number): string => (n < 10 ? `0${n}` : `${n}`);

export const isExamStarted = (startTime?: string | Date): boolean => {
  if (!startTime) return true; // If no start time specified, assume it's open
  const startMs = new Date(startTime).getTime();
  if (isNaN(startMs)) return true;
  return Date.now() >= startMs;
};

interface LiveExamCountdownTimerProps {
  startTime?: string | Date;
  language?: "bn" | "en";
  className?: string;
  variant?: "badge" | "banner";
}

export default function LiveExamCountdownTimer({
  startTime,
  language = "bn",
  className = "",
  variant = "badge"
}: LiveExamCountdownTimerProps) {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!startTime) return null;

  const startMs = new Date(startTime).getTime();
  if (isNaN(startMs)) return null;

  // CRITICAL REQUIREMENT:
  // "live Exam er upor exam shuru houyar countdown timer diba ar shuru hoye gele countdown timer thakbe na"
  // Once the exam starts (now >= startMs), this countdown timer MUST NOT be rendered at all!
  if (now >= startMs) {
    return null;
  }

  const diffMs = startMs - now;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
  const seconds = Math.floor((diffMs / 1000) % 60);

  const isBn = language === "bn";

  const formattedTime =
    days > 0
      ? isBn
        ? `${toBengaliDigits(days)} দিন ${toBengaliDigits(padZero(hours))} ঘণ্টা ${toBengaliDigits(padZero(minutes))} মি. ${toBengaliDigits(padZero(seconds))} সে.`
        : `${days}d ${padZero(hours)}h ${padZero(minutes)}m ${padZero(seconds)}s`
      : isBn
      ? `${toBengaliDigits(padZero(hours))} ঘণ্টা ${toBengaliDigits(padZero(minutes))} মি. ${toBengaliDigits(padZero(seconds))} সে.`
      : `${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)}`;

  if (variant === "banner") {
    return (
      <div
        className={`w-full px-4 py-2.5 bg-gradient-to-r from-amber-950/90 via-red-950/80 to-amber-950/90 border border-amber-500/50 rounded-xl flex items-center justify-between gap-3 shadow-[0_0_15px_rgba(245,158,11,0.25)] ${className}`}
      >
        <div className="flex items-center gap-2 text-amber-300 font-mono text-xs font-bold">
          <Timer className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: "6s" }} />
          <span>{isBn ? "⏳ পরীক্ষা শুরু হতে বাকি:" : "⏳ Exam Starts In:"}</span>
        </div>
        <div className="font-mono text-xs sm:text-sm font-black text-amber-200 tracking-wider bg-black/70 px-3 py-1 rounded-lg border border-amber-500/40 shadow-inner">
          {formattedTime}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`px-3 py-1.5 bg-gradient-to-r from-amber-950/80 via-red-950/70 to-amber-950/80 border border-amber-500/40 rounded-xl flex items-center justify-between gap-2 shadow-[0_0_12px_rgba(245,158,11,0.2)] ${className}`}
    >
      <div className="flex items-center gap-1.5 text-amber-300 font-mono text-[11px] font-bold">
        <Timer className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: "8s" }} />
        <span>{isBn ? "শুরু হতে বাকি:" : "Starts In:"}</span>
      </div>
      <div className="font-mono text-xs font-black text-amber-200 tracking-wider bg-black/60 px-2 py-0.5 rounded-lg border border-amber-500/30">
        {formattedTime}
      </div>
    </div>
  );
}
