import React, { useState } from "react";
import { Course, CourseDemoClass } from "../../types/courseTypes";
import {
  Play,
  Tv,
  ExternalLink,
  BookOpen,
  CheckCircle2,
  Clock,
  Sparkles,
  Download,
  FileText,
  Zap,
  Users,
  Award,
  FileCheck,
  Check
} from "lucide-react";
import { playSound } from "../../audio";
import {
  getYouTubeEmbedUrl,
  getYouTubeDirectWatchUrl,
  getYouTubeThumbnailUrl
} from "../../lib/youtubeUtils";
import { isDemoClassEnabled, isDemoExamEnabled, getCourseDemoExam } from "../../lib/courseDemoUtils";

export interface DemoClassSectionProps {
  course: Course;
  language?: "bn" | "en";
  theme?: "light" | "dark";
  onOpenDemoModal?: (course: Course, demo?: CourseDemoClass) => void;
  onOpenDemoExamModal?: (course: Course) => void;
  onEnrollNow?: (course: Course) => void;
}

export default function DemoClassSection({
  course,
  language = "bn",
  theme = "dark",
  onOpenDemoModal,
  onOpenDemoExamModal,
  onEnrollNow
}: DemoClassSectionProps) {
  const isBn = language === "bn";
  const [inlinePlay, setInlinePlay] = useState(false);

  const hasDemoClass = isDemoClassEnabled(course);
  const hasDemoExam = isDemoExamEnabled(course);

  // If Admin has turned OFF both demo class and demo exam for this course, don't render
  if (!hasDemoClass && !hasDemoExam) {
    return null;
  }

  const demoUrl = course.demoVideoUrl || "https://www.youtube.com/watch?v=5qap5aO4i9A";
  const demoTitle = course.demoVideoTitle || (isBn ? `${course.title} - স্পেশাল ফ্রি ডেমো ক্লাস` : `${course.title} - Free Demo Class`);
  const demoDuration = course.demoVideoDuration || "45 mins";
  const demoSubject = course.demoVideoSubject || course.subjects?.[0] || "Biology";

  const thumbnail = getYouTubeThumbnailUrl(demoUrl, "maxres");
  const directWatchUrl = getYouTubeDirectWatchUrl(demoUrl);
  const embedUrl = getYouTubeEmbedUrl(demoUrl, { autoplay: true });

  const demoExam = getCourseDemoExam(course);

  const keyTopics = [
    isBn ? "মেডিকেল ভর্তি পরীক্ষার হাই-ইয়েল্ড চ্যাপ্টার ডিকোড ও ট্রিকস" : "High-Yield Chapter Decoding & Hacks",
    isBn ? "আবুল হাসান ও গাজী আজমল স্যারের বইয়ের লাইন-বাই-লাইন এনালাইসিস" : "Line-by-line Standard Textbook Analysis",
    isBn ? "নেগেティブ মার্কিং কমানোর বিশেষ টেকনিক ও টাইম ম্যানেজমেন্ট" : "Negative Marking Reduction & Speed Hacks"
  ];

  return (
    <div className="space-y-6">
      {/* 1. YOUTUBE DEMO CLASS SECTION (if enabled by admin) */}
      {hasDemoClass && (
        <div className="bg-gradient-to-br from-[#140b0f] via-[#111115] to-[#0a0a0e] border-2 border-red-500/30 rounded-3xl p-5 sm:p-7 space-y-6 shadow-2xl relative overflow-hidden text-white font-sans">
          {/* Background Radial Glow */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4 relative z-10">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-red-600/30 border border-red-500/50 text-red-400 text-[10px] font-mono font-black uppercase flex items-center gap-1">
                  <Tv className="w-3 h-3 fill-red-400" />
                  {isBn ? "ইউটিউব কানেক্টেড ডেমো" : "YouTube Demo Class"}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold border border-emerald-500/30">
                  {isBn ? "১০০% ফ্রি" : "FREE ACCESS"}
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-black text-white font-display tracking-tight flex items-center gap-2">
                <span>{isBn ? "ভর্তির পূর্বে ফ্রি ডেমো ক্লাস করে যাচাই করুন" : "Watch Free Demo Class on YouTube"}</span>
              </h3>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href={directWatchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-bold rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-red-950/60"
                title={isBn ? "সরাসরি ইউটিউবে দেখুন" : "Watch directly on YouTube"}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{isBn ? "ইউটিউবে দেখুন" : "YouTube"}</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  playSound("click");
                  onOpenDemoModal(course);
                }}
                className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-bold rounded-xl border border-white/15 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>{isBn ? "ফুলস্ক্রিন প্লেয়ার" : "Interactive Player"}</span>
              </button>
            </div>
          </div>

          {/* Main Video Banner / Inline Player Area */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center relative z-10">
            {/* Video Player Frame (7 cols) */}
            <div className="lg:col-span-7">
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden border-2 border-red-500/40 bg-black shadow-[0_10px_30px_rgba(220,38,38,0.25)] group">
                {inlinePlay ? (
                  <iframe
                    src={embedUrl}
                    title={demoTitle}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                ) : (
                  <div
                    onClick={() => {
                      playSound("click");
                      setInlinePlay(true);
                    }}
                    className="w-full h-full relative cursor-pointer"
                  >
                    <img
                      src={thumbnail}
                      alt={demoTitle}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-between p-4">
                      <div className="flex items-center justify-between">
                        <span className="bg-black/60 backdrop-blur-md text-amber-300 text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg border border-white/10">
                          {demoSubject} • {demoDuration}
                        </span>
                        <span className="bg-red-600 text-white text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded shadow">
                          YouTube HD
                        </span>
                      </div>

                      <div className="flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-red-600 group-hover:bg-red-500 text-white flex items-center justify-center shadow-2xl shadow-red-900 group-hover:scale-110 transition-all">
                          <Play className="w-7 h-7 fill-white translate-x-0.5" />
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs sm:text-sm font-extrabold text-white line-clamp-1 drop-shadow">
                          {demoTitle}
                        </h4>
                        <span className="text-[11px] text-gray-300 font-mono block">
                          👨‍🏫 {course.instructorName} ({course.instructorTitle})
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Video Details & Highlights (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div>
                <span className="text-[11px] font-mono text-red-400 font-bold uppercase tracking-wider block">
                  {demoSubject} • Special Masterclass
                </span>
                <h4 className="text-base font-extrabold text-white leading-snug mt-1">
                  {demoTitle}
                </h4>
                <p className="text-xs text-gray-300 mt-2 leading-relaxed">
                  মেডিকেল ভর্তি পরীক্ষার জন্য ড. আবুল হাসান ও গাজী আজমল স্যারের বইয়ের লাইন-বাই-লাইন ডিকোড এবং বিগত বছরের প্রশ্ন সমাধান।
                </p>
              </div>

              {/* Bullet Highlights */}
              <div className="space-y-2 pt-1 font-mono text-xs">
                {keyTopics.map((topic, i) => (
                  <div key={i} className="flex items-start gap-2 text-gray-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{topic}</span>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2.5 pt-2">
                {course.demoPdfUrl && (
                  <a
                    href={course.demoPdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2.5 bg-black/60 hover:bg-black/90 text-gray-200 text-xs font-mono font-bold rounded-xl border border-white/15 transition flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5 text-red-400" />
                    <span>{isBn ? "লেকচার শিট PDF" : "Lecture Sheet PDF"}</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => {
                    playSound("click");
                    onOpenDemoModal(course);
                  }}
                  className="px-4 py-2.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-xs font-mono font-black uppercase rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-red-950/60 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>{isBn ? "সম্পূর্ণ ডেমো ক্লাস দেখুন" : "Watch Full Masterclass"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. FREE DEMO EXAM SECTION (if enabled by admin) */}
      {hasDemoExam && (
        <div className="bg-gradient-to-br from-[#1c130d] via-[#14121a] to-[#0d0d14] border-2 border-amber-500/30 rounded-3xl p-5 sm:p-7 space-y-5 shadow-2xl relative overflow-hidden text-white font-sans">
          {/* Background Radial Glow */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[10px] font-mono font-black uppercase flex items-center gap-1">
                  <FileCheck className="w-3 h-3 text-amber-400" />
                  {isBn ? "ফ্রি ডেমো মডেল টেস্ট" : "Free Demo Mock Exam"}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold border border-emerald-500/30">
                  {demoExam.questions?.length || 10} MCQ • {demoExam.durationMinutes} MINS
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-black text-white font-display">
                {demoExam.title}
              </h3>
              <p className="text-xs text-gray-300 max-w-2xl leading-relaxed">
                {demoExam.description}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  playSound("click");
                  if (onOpenDemoExamModal) {
                    onOpenDemoExamModal(course);
                  }
                }}
                className="px-5 py-3 bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-white font-mono font-extrabold text-xs uppercase tracking-wider rounded-2xl transition shadow-xl shadow-amber-950/60 flex items-center gap-2 cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-white" />
                <span>{isBn ? "📝 ফ্রি ডেমো এক্সাম দিন" : "📝 Take Free Demo Exam"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
