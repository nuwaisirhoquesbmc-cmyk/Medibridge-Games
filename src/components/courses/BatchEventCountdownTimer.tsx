import React, { useState, useEffect, useMemo } from "react";
import { Clock, Flame, Zap, Calendar, Sparkles, AlertCircle } from "lucide-react";
import { INITIAL_EXAMS } from "../../data/coursesData";

interface BatchEventCountdownTimerProps {
  batch?: any;
  course?: any;
  targetDate?: string | Date;
  scheduleDetails?: string;
  startDate?: string;
  eventName?: string;
  variant?: "card-chip" | "card-hud" | "mini" | "hero";
  language?: "bn" | "en";
  showEventTitle?: boolean;
  className?: string;
}

// Convert numbers to Bengali digits
export const toBengaliDigits = (num: number | string): string => {
  const bnDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return String(num).replace(/[0-9]/g, (d) => bnDigits[Number(d)]);
};

const padZero = (n: number): string => (n < 10 ? `0${n}` : `${n}`);

interface EventScheduleInfo {
  targetTimestamp: number;
  eventName: string;
  eventNameBn: string;
  isLiveNow: boolean;
  eventDayInfo?: string;
  durationMinutes: number;
}

/**
 * Parses schedule strings, upcoming exams, or start dates to dynamically find the next upcoming event
 */
export function calculateNextBatchEvent(
  batch?: any,
  course?: any,
  explicitTargetDate?: string | Date,
  scheduleStr?: string,
  customEventName?: string
): EventScheduleInfo {
  const now = Date.now();
  const durationMinutes = batch?.duration || batch?.durationMinutes || 45;
  const examDurationMs = durationMinutes * 60 * 1000;

  // 1. If an explicit targetDate or nextEventDateTime is provided
  const directDate = explicitTargetDate || batch?.nextEventDateTime || batch?.nextExamDateTime || batch?.scheduledExamDateTime;
  if (directDate) {
    const ts = new Date(directDate).getTime();
    if (!isNaN(ts)) {
      const isLive = now >= ts && now <= ts + examDurationMs;
      return {
        targetTimestamp: ts,
        eventName: customEventName || batch?.nextExamTitle || "Scheduled Live Model Test",
        eventNameBn: customEventName || batch?.nextExamTitle || "লাইভ মডেল টেস্ট",
        isLiveNow: isLive,
        durationMinutes,
      };
    }
  }

  // 2. Check upcoming exams in INITIAL_EXAMS matching course or batch
  const courseId = course?.id || batch?.courseId;
  const batchId = batch?.id || course?.defaultBatchId;
  if (courseId || batchId) {
    const matchingExams = INITIAL_EXAMS.filter(
      (e) => (e.courseId === courseId || e.batchId === batchId) && e.isPublished
    );

    // Look for currently live exams
    const liveExam = matchingExams.find((e) => {
      const start = new Date(e.startTime).getTime();
      const end = new Date(e.endTime).getTime();
      return now >= start && now <= end;
    });

    if (liveExam) {
      return {
        targetTimestamp: new Date(liveExam.startTime).getTime(),
        eventName: liveExam.title,
        eventNameBn: liveExam.title,
        isLiveNow: true,
        durationMinutes: liveExam.durationMinutes || 45,
      };
    }

    // Look for next upcoming exam in the future
    const upcomingExams = matchingExams
      .filter((e) => new Date(e.startTime).getTime() > now)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    if (upcomingExams.length > 0) {
      const nextEx = upcomingExams[0];
      return {
        targetTimestamp: new Date(nextEx.startTime).getTime(),
        eventName: nextEx.title,
        eventNameBn: nextEx.title,
        isLiveNow: false,
        durationMinutes: nextEx.durationMinutes || 45,
      };
    }
  }

  // 3. If batch has a future startDate (e.g. "2026-09-01")
  if (batch?.startDate) {
    const startObj = new Date(batch.startDate + "T20:00:00");
    if (!isNaN(startObj.getTime()) && startObj.getTime() > now) {
      return {
        targetTimestamp: startObj.getTime(),
        eventName: "Batch Grand Launch & Model Test 01",
        eventNameBn: "ব্যাচ গ্র্যান্ড লঞ্চ ও মেগা মডেল টেস্ট ০১",
        isLiveNow: false,
        durationMinutes,
      };
    }
  }

  // 4. Parse recurring schedule string (e.g., "রবি, মঙ্গল, বৃহস্পতি রাত ৮:০০ টা" or "প্রতিদিন রাত ৯:০০ টা")
  const scheduleText = (scheduleStr || batch?.scheduleDetails || course?.examInfo || "").toLowerCase();
  
  // Extract Target Days (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const targetDays: number[] = [];
  if (scheduleText.includes("প্রতিদিন") || scheduleText.includes("daily") || scheduleText.includes("every day")) {
    targetDays.push(0, 1, 2, 3, 4, 5, 6);
  } else {
    if (scheduleText.includes("রবি") || scheduleText.includes("sun")) targetDays.push(0);
    if (scheduleText.includes("সোম") || scheduleText.includes("mon")) targetDays.push(1);
    if (scheduleText.includes("মঙ্গল") || scheduleText.includes("tue")) targetDays.push(2);
    if (scheduleText.includes("বুধ") || scheduleText.includes("wed")) targetDays.push(3);
    if (scheduleText.includes("বৃহস্পতি") || scheduleText.includes("thu")) targetDays.push(4);
    if (scheduleText.includes("শুক্র") || scheduleText.includes("fri")) targetDays.push(5);
    if (scheduleText.includes("শনি") || scheduleText.includes("sat")) targetDays.push(6);
  }

  // If no days detected, default to Sun, Tue, Thu
  if (targetDays.length === 0) {
    targetDays.push(0, 2, 4);
  }

  // Extract Target Time (default to 20:00 / 8:00 PM)
  let targetHour = 20;
  let targetMinute = 0;

  if (scheduleText.includes("৯:০০") || scheduleText.includes("9:00") || scheduleText.includes("9 pm")) {
    targetHour = 21;
    targetMinute = 0;
  } else if (scheduleText.includes("৮:৩০") || scheduleText.includes("8:30")) {
    targetHour = 20;
    targetMinute = 30;
  } else if (scheduleText.includes("৭:৩০") || scheduleText.includes("7:30")) {
    targetHour = 19;
    targetMinute = 30;
  } else if (scheduleText.includes("৭:০০") || scheduleText.includes("7:00")) {
    targetHour = 19;
    targetMinute = 0;
  } else if (scheduleText.includes("৫:০০") || scheduleText.includes("5:00")) {
    targetHour = 17;
    targetMinute = 0;
  } else if (scheduleText.includes("১০:০০") || scheduleText.includes("10:00")) {
    targetHour = 22;
    targetMinute = 0;
  }

  // Calculate the closest occurrence from now
  const currentNow = new Date();
  let candidateTimestamp = 0;
  let isLive = false;

  for (let dayOffset = 0; dayOffset <= 8; dayOffset++) {
    const candidate = new Date(currentNow);
    candidate.setDate(currentNow.getDate() + dayOffset);
    candidate.setHours(targetHour, targetMinute, 0, 0);

    const dayOfWeek = candidate.getDay();
    if (targetDays.includes(dayOfWeek)) {
      const cTime = candidate.getTime();
      // Check if candidate is currently live
      if (now >= cTime && now <= cTime + examDurationMs) {
        candidateTimestamp = cTime;
        isLive = true;
        break;
      }
      // Or if it is in the future
      if (cTime > now) {
        candidateTimestamp = cTime;
        isLive = false;
        break;
      }
    }
  }

  if (!candidateTimestamp) {
    // Fallback: 3 hours from now or tonight 8 PM
    const fallback = new Date();
    fallback.setHours(targetHour, targetMinute, 0, 0);
    if (fallback.getTime() <= now) {
      fallback.setDate(fallback.getDate() + 1);
    }
    candidateTimestamp = fallback.getTime();
  }

  const subjectTitle = batch?.subject ? `${batch.subject} Model Test` : "Scheduled Live Test";
  const subjectTitleBn = batch?.subject ? `${batch.subject} লাইভ মডেল টেস্ট` : "নির্ধারিত লাইভ পরীক্ষা";

  return {
    targetTimestamp: candidateTimestamp,
    eventName: customEventName || batch?.title || subjectTitle,
    eventNameBn: customEventName || batch?.title || subjectTitleBn,
    isLiveNow: isLive,
    durationMinutes,
  };
}

export default function BatchEventCountdownTimer({
  batch,
  course,
  targetDate,
  scheduleDetails,
  eventName,
  variant = "card-hud",
  language = "bn",
  showEventTitle = true,
  className = "",
}: BatchEventCountdownTimerProps) {
  const isBn = language === "bn";

  const [scheduleInfo, setScheduleInfo] = useState<EventScheduleInfo>(() =>
    calculateNextBatchEvent(batch, course, targetDate, scheduleDetails, eventName)
  );

  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    totalMs: number;
    isLive: boolean;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    totalMs: 0,
    isLive: false,
  });

  // Re-calculate schedule when props change
  useEffect(() => {
    const info = calculateNextBatchEvent(batch, course, targetDate, scheduleDetails, eventName);
    setScheduleInfo(info);
  }, [batch, course, targetDate, scheduleDetails, eventName]);

  // 1-second dynamic countdown ticker
  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const target = scheduleInfo.targetTimestamp;
      const durationMs = (scheduleInfo.durationMinutes || 45) * 60 * 1000;

      // Check if event is Live right now
      if (now >= target && now <= target + durationMs) {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          totalMs: 0,
          isLive: true,
        });
        return;
      }

      // If target is in past, recalculate next event slot
      if (now > target + durationMs) {
        const nextInfo = calculateNextBatchEvent(batch, course, targetDate, scheduleDetails, eventName);
        setScheduleInfo(nextInfo);
      }

      const diff = Math.max(0, target - now);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({
        days,
        hours,
        minutes,
        seconds,
        totalMs: diff,
        isLive: false,
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [scheduleInfo, batch, course, targetDate, scheduleDetails, eventName]);

  // Formatted date string of next test (e.g., "রবিবার রাত ৮:০০ টা")
  const formattedEventTime = useMemo(() => {
    if (!scheduleInfo.targetTimestamp) return "";
    const d = new Date(scheduleInfo.targetTimestamp);
    const dayNamesBn = ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"];
    const dayNamesEn = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayName = isBn ? dayNamesBn[d.getDay()] : dayNamesEn[d.getDay()];

    let hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? (isBn ? "রাত" : "PM") : isBn ? "সকাল" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const timeStr = `${hours}:${padZero(minutes)} ${ampm}`;

    return isBn ? `${dayName} ${toBengaliDigits(timeStr)}` : `${dayName}, ${timeStr}`;
  }, [scheduleInfo.targetTimestamp, isBn]);

  // ================= VARIANT 1: CARD-CHIP (Sleek Compact Bar inside Cards) =================
  if (variant === "card-chip") {
    if (timeLeft.isLive) {
      return (
        <div
          className={`flex items-center justify-between px-3 py-2 bg-gradient-to-r from-red-950/80 via-red-900/60 to-black/80 border border-red-500/50 rounded-xl shadow-[0_0_15px_rgba(220,38,38,0.25)] font-mono text-xs ${className}`}
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
            <span className="text-red-300 font-black text-[11px] uppercase tracking-wider animate-pulse">
              {isBn ? "🔴 পরীক্ষা লাইভ চলছে!" : "🔴 TEST IS LIVE NOW!"}
            </span>
          </div>
          <span className="px-2 py-0.5 bg-red-600 text-white font-black text-[10px] uppercase rounded-md shadow">
            {isBn ? "অংশগ্রহণ করুন" : "JOIN NOW"}
          </span>
        </div>
      );
    }

    return (
      <div
        className={`bg-gradient-to-r from-[#12080a] via-black/80 to-[#0d0914] border border-amber-500/30 hover:border-amber-500/50 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-md transition-all font-mono ${className}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Clock className="w-3.5 h-3.5 text-[#FFD700] animate-pulse" />
          </div>
          <div className="truncate">
            <span className="text-[9px] uppercase font-bold text-gray-400 block tracking-wider truncate">
              {isBn ? "পরবর্তী লাইভ ইভেন্ট / টেস্ট" : "NEXT BATCH TEST"}
            </span>
            <span className="text-[10px] font-bold text-emerald-400 truncate block">
              {formattedEventTime}
            </span>
          </div>
        </div>

        {/* Digital Countdown Timer Badges */}
        <div className="flex items-center gap-1 shrink-0 text-white font-mono text-xs font-black">
          {timeLeft.days > 0 && (
            <div className="flex items-center gap-0.5">
              <span className="px-1.5 py-0.5 bg-black/80 border border-white/15 rounded text-[#FFD700]">
                {isBn ? toBengaliDigits(padZero(timeLeft.days)) : padZero(timeLeft.days)}
              </span>
              <span className="text-[9px] text-gray-400 font-normal">{isBn ? "দিন" : "d"}</span>
            </div>
          )}

          <div className="flex items-center gap-0.5">
            <span className="px-1.5 py-0.5 bg-black/80 border border-white/15 rounded text-white">
              {isBn ? toBengaliDigits(padZero(timeLeft.hours)) : padZero(timeLeft.hours)}
            </span>
            <span className="text-[9px] text-gray-400 font-normal">{isBn ? "ঘ." : "h"}</span>
          </div>

          <span className="text-gray-500">:</span>

          <div className="flex items-center gap-0.5">
            <span className="px-1.5 py-0.5 bg-black/80 border border-white/15 rounded text-white">
              {isBn ? toBengaliDigits(padZero(timeLeft.minutes)) : padZero(timeLeft.minutes)}
            </span>
            <span className="text-[9px] text-gray-400 font-normal">{isBn ? "মি." : "m"}</span>
          </div>

          <span className="text-gray-500">:</span>

          <div className="flex items-center gap-0.5">
            <span className="px-1.5 py-0.5 bg-red-950/80 border border-red-500/40 rounded text-red-400">
              {isBn ? toBengaliDigits(padZero(timeLeft.seconds)) : padZero(timeLeft.seconds)}
            </span>
            <span className="text-[9px] text-gray-400 font-normal">{isBn ? "সে." : "s"}</span>
          </div>
        </div>
      </div>
    );
  }

  // ================= VARIANT 2: MINI / PILL (Compact Badge) =================
  if (variant === "mini") {
    if (timeLeft.isLive) {
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-950/90 border border-red-500/60 text-red-300 font-mono text-[10px] font-bold rounded-full shadow animate-pulse ${className}`}
        >
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <span>{isBn ? "লাইভ পরীক্ষা চলছে" : "LIVE TEST RUNNING"}</span>
        </span>
      );
    }

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 bg-black/70 border border-amber-500/30 text-amber-300 font-mono text-[10px] font-bold rounded-full shadow ${className}`}
      >
        <Clock className="w-3 h-3 text-[#FFD700]" />
        <span>
          {timeLeft.days > 0 && `${isBn ? toBengaliDigits(timeLeft.days) : timeLeft.days}d `}
          {isBn ? toBengaliDigits(padZero(timeLeft.hours)) : padZero(timeLeft.hours)}:
          {isBn ? toBengaliDigits(padZero(timeLeft.minutes)) : padZero(timeLeft.minutes)}:
          {isBn ? toBengaliDigits(padZero(timeLeft.seconds)) : padZero(timeLeft.seconds)}
        </span>
      </span>
    );
  }

  // ================= VARIANT 3: HERO / EXPANDED (Full Rich Box for Modals & Dashboards) =================
  if (variant === "hero") {
    if (timeLeft.isLive) {
      return (
        <div
          className={`p-5 rounded-2xl bg-gradient-to-r from-red-950 via-[#180507] to-black border-2 border-red-500/60 shadow-[0_0_30px_rgba(220,38,38,0.35)] flex flex-col sm:flex-row items-center justify-between gap-4 font-mono ${className}`}
        >
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-12 h-12 rounded-2xl bg-red-600/30 border border-red-500/60 flex items-center justify-center shrink-0">
              <Zap className="w-6 h-6 text-red-400 fill-red-400 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                <span className="text-red-400 text-xs font-black uppercase tracking-widest">
                  {isBn ? "লাইভ মডেল টেস্ট সক্রিয়" : "LIVE MODEL TEST IN PROGRESS"}
                </span>
              </div>
              <h4 className="text-base font-black text-white mt-0.5 font-display">
                {isBn ? scheduleInfo.eventNameBn : scheduleInfo.eventName}
              </h4>
            </div>
          </div>

          <div className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-[0_0_15px_rgba(220,38,38,0.6)] flex items-center gap-1.5 transition cursor-pointer">
            <Flame className="w-4 h-4 text-[#FFD700] fill-[#FFD700]" />
            <span>{isBn ? "এখনই পরীক্ষায় অংশ নিন 🚀" : "ENTER ARENA NOW 🚀"}</span>
          </div>
        </div>
      );
    }

    return (
      <div
        className={`p-5 rounded-2xl bg-gradient-to-br from-[#180d10] via-[#0e0a12] to-black border border-amber-500/40 shadow-xl flex flex-col gap-3 font-mono ${className}`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-500/20 border border-amber-500/40 rounded-lg text-[#FFD700]">
              <Clock className="w-4 h-4 animate-spin-slow" />
            </div>
            <div>
              <span className="text-[10px] text-amber-400 uppercase font-black tracking-widest block">
                {isBn ? "পরবর্তী ব্যাচ ইভেন্ট ও লাইভ পরীক্ষা কাউন্টডাউন" : "NEXT BATCH TEST COUNTDOWN"}
              </span>
              {showEventTitle && (
                <span className="text-sm font-extrabold text-white block">
                  {isBn ? scheduleInfo.eventNameBn : scheduleInfo.eventName}
                </span>
              )}
            </div>
          </div>

          <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 rounded-lg">
            {formattedEventTime}
          </span>
        </div>

        {/* 4 Segmented Digital Number Tiles */}
        <div className="grid grid-cols-4 gap-2 text-center pt-1">
          <div className="bg-black/80 border border-white/10 p-2.5 rounded-xl">
            <span className="text-xl sm:text-2xl font-black text-[#FFD700] block">
              {isBn ? toBengaliDigits(padZero(timeLeft.days)) : padZero(timeLeft.days)}
            </span>
            <span className="text-[10px] text-gray-400 uppercase font-bold">{isBn ? "দিন" : "DAYS"}</span>
          </div>

          <div className="bg-black/80 border border-white/10 p-2.5 rounded-xl">
            <span className="text-xl sm:text-2xl font-black text-white block">
              {isBn ? toBengaliDigits(padZero(timeLeft.hours)) : padZero(timeLeft.hours)}
            </span>
            <span className="text-[10px] text-gray-400 uppercase font-bold">{isBn ? "ঘণ্টা" : "HOURS"}</span>
          </div>

          <div className="bg-black/80 border border-white/10 p-2.5 rounded-xl">
            <span className="text-xl sm:text-2xl font-black text-white block">
              {isBn ? toBengaliDigits(padZero(timeLeft.minutes)) : padZero(timeLeft.minutes)}
            </span>
            <span className="text-[10px] text-gray-400 uppercase font-bold">{isBn ? "মিনিট" : "MINUTES"}</span>
          </div>

          <div className="bg-gradient-to-b from-red-950/80 to-black border border-red-500/40 p-2.5 rounded-xl shadow-[0_0_12px_rgba(220,38,38,0.2)]">
            <span className="text-xl sm:text-2xl font-black text-red-400 block animate-pulse">
              {isBn ? toBengaliDigits(padZero(timeLeft.seconds)) : padZero(timeLeft.seconds)}
            </span>
            <span className="text-[10px] text-red-300 uppercase font-bold">{isBn ? "সেকেন্ড" : "SECONDS"}</span>
          </div>
        </div>
      </div>
    );
  }

  // ================= VARIANT 4: DEFAULT (CARD-HUD) =================
  // Standard card component featuring digital boxes and event header
  if (timeLeft.isLive) {
    return (
      <div
        className={`bg-gradient-to-r from-red-950/90 via-black to-red-950/80 border-2 border-red-500/70 p-3 rounded-2xl shadow-[0_0_20px_rgba(220,38,38,0.3)] font-mono text-xs flex items-center justify-between gap-2 ${className}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
          <div className="truncate">
            <span className="text-[10px] uppercase font-black text-red-400 tracking-wider block">
              {isBn ? "লাইভ পরীক্ষা চলমান ⚡" : "EXAM LIVE NOW ⚡"}
            </span>
            <span className="text-xs font-bold text-white truncate block">
              {isBn ? scheduleInfo.eventNameBn : scheduleInfo.eventName}
            </span>
          </div>
        </div>

        <span className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white font-black text-[10px] uppercase rounded-lg shadow transition shrink-0 animate-pulse">
          {isBn ? "পরীক্ষা দিন" : "Enter Now"}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`bg-gradient-to-b from-[#160c0f]/90 via-black/80 to-[#0a0710]/90 border border-amber-500/35 hover:border-amber-400/60 p-3 rounded-2xl shadow-lg transition-all font-mono flex flex-col gap-2 ${className}`}
    >
      <div className="flex items-center justify-between gap-1.5 text-[10px]">
        <div className="flex items-center gap-1.5 text-amber-400 font-bold uppercase tracking-wider truncate">
          <Clock className="w-3 h-3 text-[#FFD700] shrink-0 animate-spin-slow" />
          <span className="truncate">{isBn ? "পরবর্তী টেস্ট শুরু হতে বাকি:" : "Next Event Countdown:"}</span>
        </div>
        <span className="text-emerald-400 font-bold bg-emerald-950/70 border border-emerald-500/30 px-1.5 py-0.5 rounded text-[9px] shrink-0">
          {formattedEventTime}
        </span>
      </div>

      {/* Segmented Digital Matrix */}
      <div className="grid grid-cols-4 gap-1.5 text-center">
        <div className="bg-black/90 border border-white/10 py-1.5 px-1 rounded-lg">
          <span className="text-xs sm:text-sm font-black text-[#FFD700] block leading-tight">
            {isBn ? toBengaliDigits(padZero(timeLeft.days)) : padZero(timeLeft.days)}
          </span>
          <span className="text-[8px] text-gray-400 uppercase">{isBn ? "দিন" : "Days"}</span>
        </div>

        <div className="bg-black/90 border border-white/10 py-1.5 px-1 rounded-lg">
          <span className="text-xs sm:text-sm font-black text-white block leading-tight">
            {isBn ? toBengaliDigits(padZero(timeLeft.hours)) : padZero(timeLeft.hours)}
          </span>
          <span className="text-[8px] text-gray-400 uppercase">{isBn ? "ঘণ্টা" : "Hrs"}</span>
        </div>

        <div className="bg-black/90 border border-white/10 py-1.5 px-1 rounded-lg">
          <span className="text-xs sm:text-sm font-black text-white block leading-tight">
            {isBn ? toBengaliDigits(padZero(timeLeft.minutes)) : padZero(timeLeft.minutes)}
          </span>
          <span className="text-[8px] text-gray-400 uppercase">{isBn ? "মিনিট" : "Min"}</span>
        </div>

        <div className="bg-red-950/70 border border-red-500/35 py-1.5 px-1 rounded-lg">
          <span className="text-xs sm:text-sm font-black text-red-400 block leading-tight animate-pulse">
            {isBn ? toBengaliDigits(padZero(timeLeft.seconds)) : padZero(timeLeft.seconds)}
          </span>
          <span className="text-[8px] text-red-300 uppercase">{isBn ? "সেকেন্ড" : "Sec"}</span>
        </div>
      </div>
    </div>
  );
}
