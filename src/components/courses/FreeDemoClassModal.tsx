import React, { useState } from "react";
import { Course, CourseDemoClass } from "../../types/courseTypes";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Play,
  ExternalLink,
  BookOpen,
  Award,
  Clock,
  Sparkles,
  Download,
  FileText,
  CheckCircle2,
  HelpCircle,
  Zap,
  Users,
  ChevronRight,
  Share2,
  Tv,
  Check
} from "lucide-react";
import { playSound } from "../../audio";
import { getYouTubeEmbedUrl, getYouTubeDirectWatchUrl, getYouTubeThumbnailUrl, extractYouTubeVideoId } from "../../lib/youtubeUtils";

export interface FreeDemoClassModalProps {
  course: Course;
  demoClass?: CourseDemoClass;
  allDemoClasses?: { course: Course; demo: CourseDemoClass }[];
  language?: "bn" | "en";
  theme?: "light" | "dark";
  onClose: () => void;
  onEnrollNow: (course: Course) => void;
}

export default function FreeDemoClassModal({
  course,
  demoClass,
  allDemoClasses = [],
  language = "bn",
  theme = "dark",
  onClose,
  onEnrollNow
}: FreeDemoClassModalProps) {
  const isBn = language === "bn";
  const [activeTab, setActiveTab] = useState<"video" | "topics" | "quiz">("video");
  const [copiedLink, setCopiedLink] = useState(false);

  // Active Demo Class state (can switch within playlist)
  const currentDemo: CourseDemoClass = demoClass || {
    id: `demo_${course.id}`,
    courseId: course.id,
    title: course.demoVideoTitle || `${course.title} - স্পেশাল ফ্রি ডেমো ক্লাস`,
    subject: course.demoVideoSubject || course.subjects?.[0] || "Biology",
    instructor: course.instructorName,
    instructorTitle: course.instructorTitle,
    instructorAvatar: course.instructorAvatar,
    youtubeUrl: course.demoVideoUrl || "https://www.youtube.com/watch?v=5qap5aO4i9A",
    duration: course.demoVideoDuration || "45 mins",
    description: "মেডিকেল ভর্তি পরীক্ষার জন্য ড. আবুল হাসান, গাজী আজমল ও হাজারী নাগ স্যারের বইয়ের লাইন-বাই-লাইন ডিকোড এবং বিগত বছরের প্রশ্ন সমাধান।",
    topics: [
      "মেডিকেল ভর্তি পরীক্ষার হাই-ইয়েল্ড টপিক বিশ্লেষণ",
      "মডেল প্রশ্ন ও নেগেটিভ মার্কিং কমানোর হ্যাকস",
      "শর্টকাট মেমোরি ট্রিকস ও এক্সক্লুসিভ রিভিশন নোটস"
    ],
    lecturePdfUrl: course.demoPdfUrl,
    isFree: true
  };

  const [selectedDemo, setSelectedDemo] = useState<CourseDemoClass>(currentDemo);
  const [selectedCourse, setSelectedCourse] = useState<Course>(course);

  // Free Demo Practice Mini Quiz State
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const demoQuestions = [
    {
      id: 1,
      q: isBn ? "প্লাজমামেমব্রেনের ফ্লুইড মোজাইক মডেল কে প্রস্তাব করেন?" : "Who proposed the Fluid Mosaic Model of plasma membrane?",
      options: [
        isBn ? "সিঙ্গার ও নিকলসন (১৯৭২)" : "Singer & Nicolson (1972)",
        isBn ? "রবার্ট হুক (১৬৬৫)" : "Robert Hooke (1665)",
        isBn ? "ক্যামিলো গলগি (১৮৯৮)" : "Camillo Golgi (1898)",
        isBn ? "ডি দুভে (১৯৫৫)" : "Christian de Duve (1955)"
      ],
      correct: 0,
      explanation: isBn
        ? "১৯৭২ সালে বিজ্ঞানী এস জে সিঙ্গার এবং জি এল নিকলসন প্লাজমামেমব্রেনের আধুনিকতম ফ্লুইড মোজাইক মডেল প্রস্তাব করেন।"
        : "In 1972, Singer and Nicolson proposed the Fluid Mosaic Model for cell membrane structure."
    },
    {
      id: 2,
      q: isBn ? "কোষের 'পাওয়ার হাউস' বা শক্তিঘর বলা হয় কোন অঙ্গাণুকে?" : "Which cell organelle is called the 'Powerhouse of the cell'?",
      options: [
        isBn ? "রাইবোসোম" : "Ribosome",
        isBn ? "মাইটোকন্ড্রিয়া" : "Mitochondria",
        isBn ? "লাইসোসোম" : "Lysosome",
        isBn ? "গলগি বডি" : "Golgi apparatus"
      ],
      correct: 1,
      explanation: isBn
        ? "মাইটোকন্ড্রিয়ায় ক্রেবস চক্র ও ইটিএস এর মাধ্যমে এটিপি (ATP) তৈরি হয় বলে একে পাওয়ার হাউস বলা হয়।"
        : "Mitochondria generates ATP through cellular respiration and Krebs cycle, hence called the powerhouse."
    },
    {
      id: 3,
      q: isBn ? "কোনটি কোয়ান্টাম সংখ্যা ইলেক্ট্রনের ঘূর্ণনের দিক নির্দেশ করে?" : "Which quantum number specifies the spin direction of an electron?",
      options: [
        isBn ? "প্রধান কোয়ান্টাম সংখ্যা (n)" : "Principal (n)",
        isBn ? "সহকারী কোয়ান্টাম সংখ্যা (l)" : "Azimuthal (l)",
        isBn ? "চৌম্বক কোয়ান্টাম সংখ্যা (m)" : "Magnetic (m)",
        isBn ? "ঘূর্ণন কোয়ান্টাম সংখ্যা (s)" : "Spin (s)"
      ],
      correct: 3,
      explanation: isBn
        ? "স্পিন কোয়ান্টাম সংখ্যা (s) এর মান +1/2 বা -1/2 যা ইলেক্ট্রনের নিজ অক্ষের উপর আবর্তনের দিক নির্দেশ করে।"
        : "Spin quantum number (s) indicates clockwise or anti-clockwise spin (+1/2 or -1/2)."
    }
  ];

  const handleSelectAnswer = (qIdx: number, optIdx: number) => {
    if (quizSubmitted) return;
    playSound("click");
    setQuizAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
  };

  const handleGradeQuiz = () => {
    playSound("levelup");
    setQuizSubmitted(true);
  };

  const resetQuiz = () => {
    playSound("click");
    setQuizAnswers({});
    setQuizSubmitted(false);
  };

  const score = Object.keys(quizAnswers).reduce((acc, qIdxStr) => {
    const qIdx = parseInt(qIdxStr);
    return acc + (quizAnswers[qIdx] === demoQuestions[qIdx].correct ? 1 : 0);
  }, 0);

  const handleShareDemo = () => {
    playSound("click");
    const text = `MediBridge Free Medical Demo Class: ${selectedDemo.title}\nWatch on YouTube: ${selectedDemo.youtubeUrl}`;
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const embedUrl = getYouTubeEmbedUrl(selectedDemo.youtubeUrl, { autoplay: true });
  const directWatchUrl = getYouTubeDirectWatchUrl(selectedDemo.youtubeUrl);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        className="w-full max-w-5xl bg-[#0F0F13] border-2 border-red-500/40 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(220,38,38,0.3)] my-auto max-h-[92vh] flex flex-col font-sans text-white"
      >
        {/* Header Bar */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-red-950/80 via-[#16161c] to-black border-b border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-900/50 shrink-0">
              <Tv className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-red-600/30 text-red-400 text-[10px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-md border border-red-500/40 flex items-center gap-1">
                  <Play className="w-2.5 h-2.5 fill-red-400" />
                  {isBn ? "ইউটিউব লাইভ ও ফ্রি ডেমো" : "Free YouTube Demo"}
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-md border border-emerald-500/30">
                  {isBn ? "১০০% সম্পূর্ণ ফ্রি" : "100% Free"}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white truncate font-display mt-0.5">
                {selectedDemo.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Direct YouTube link */}
            <a
              href={directWatchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-bold rounded-xl transition flex items-center gap-1.5 shadow-md shadow-red-950/60"
              title={isBn ? "ইউটিউব অ্যাপে খুলুন" : "Open in YouTube"}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isBn ? "ইউটিউবে খুলুন" : "Open in YouTube"}</span>
            </a>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Main Body Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 custom-scrollbar">
          {/* Left Column (2 Cols): Video Player & Details */}
          <div className="lg:col-span-2 space-y-4">
            {/* 16:9 YouTube Video Embed Player */}
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden border-2 border-red-500/30 bg-black shadow-2xl">
              <iframe
                src={embedUrl}
                title={selectedDemo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-white/10 pb-2 font-mono text-xs">
              <button
                onClick={() => {
                  playSound("click");
                  setActiveTab("video");
                }}
                className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "video"
                    ? "bg-red-600 text-white shadow-md shadow-red-950/40"
                    : "bg-white/5 text-gray-400 hover:text-white"
                }`}
              >
                <Tv className="w-3.5 h-3.5" />
                <span>{isBn ? "ক্লাস বিবরণ ও শিক্ষক" : "Overview & Mentor"}</span>
              </button>

              <button
                onClick={() => {
                  playSound("click");
                  setActiveTab("topics");
                }}
                className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "topics"
                    ? "bg-red-600 text-white shadow-md shadow-red-950/40"
                    : "bg-white/5 text-gray-400 hover:text-white"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>{isBn ? "হাই-ইয়েল্ড টপিকস" : "Key Topics"}</span>
              </button>

              <button
                onClick={() => {
                  playSound("click");
                  setActiveTab("quiz");
                }}
                className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "quiz"
                    ? "bg-red-600 text-white shadow-md shadow-red-950/40"
                    : "bg-white/5 text-gray-400 hover:text-white"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>{isBn ? "ফ্রি ডেমো কুইজ" : "Free Demo Quiz"}</span>
                <span className="bg-amber-400 text-black text-[9px] font-black px-1.5 py-0.2 rounded-full">3 MCQ</span>
              </button>
            </div>

            {/* Tab 1: Video Overview & Mentor Details */}
            {activeTab === "video" && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          selectedDemo.instructorAvatar ||
                          selectedCourse.instructorAvatar ||
                          "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=120&auto=format&fit=crop&q=60"
                        }
                        alt={selectedDemo.instructor}
                        className="w-12 h-12 rounded-full border-2 border-red-500 object-cover shrink-0"
                      />
                      <div>
                        <span className="text-xs text-gray-400 font-mono uppercase block">{isBn ? "মেডিকেল মেন্টর" : "Medical Mentor"}</span>
                        <h4 className="text-sm sm:text-base font-extrabold text-white">{selectedDemo.instructor}</h4>
                        <span className="text-[11px] text-amber-300 font-mono block">
                          {selectedDemo.instructorTitle || selectedCourse.instructorTitle || "Dhaka Medical College (DMC)"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-gray-300 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-sky-400" />
                        <span>{selectedDemo.duration || "45 mins"}</span>
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-amber-300 font-bold">
                        {selectedDemo.subject}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-gray-300 leading-relaxed font-sans pt-1">
                    {selectedDemo.description}
                  </p>

                  {/* Share & Download Handnote */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
                    {selectedDemo.lecturePdfUrl && (
                      <a
                        href={selectedDemo.lecturePdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold rounded-xl transition flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{isBn ? "ফ্রি লেকচার শিট PDF" : "Download Free Sheet PDF"}</span>
                      </a>
                    )}

                    <button
                      onClick={handleShareDemo}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-xs font-mono rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-sky-400" />}
                      <span>{copiedLink ? (isBn ? "লিংক কপি হয়েছে!" : "Link Copied!") : (isBn ? "শেয়ার করুন" : "Share")}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Topics List */}
            {activeTab === "topics" && (
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                <h4 className="text-xs font-mono font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>{isBn ? "এই ডেমো ক্লাসে আলোচিত গুরুত্বপূর্ণ বিষয়সমূহ:" : "Core Concepts Covered in This Class:"}</span>
                </h4>

                <div className="space-y-2 pt-1">
                  {(selectedDemo.topics || [
                    "কোষ ও অঙ্গাণুর সুনির্দিষ্ট গঠন ও কাজ",
                    "আবুল হাসান স্যারের বিগত ১০ বছরের প্রশ্ন ব্যাংক সমাধান",
                    "মেডিকেল ভর্তি পরীক্ষার নেগেটিভ মার্কিং প্রতিরোধে টাইম ম্যানেজমেন্ট"
                  ]).map((t, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 p-3 rounded-xl bg-black/40 border border-white/5 text-xs text-gray-200"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 3: Interactive Demo Quiz */}
            {activeTab === "quiz" && (
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <h4 className="text-xs font-mono font-bold text-white uppercase">
                      {isBn ? "ডেমো ক্লাস ভিত্তিক প্র্যাকটিস কুইজ" : "Demo Lecture Practice Quiz"}
                    </h4>
                  </div>
                  {quizSubmitted && (
                    <div className="font-mono text-xs font-black text-amber-300 bg-amber-950/80 px-2.5 py-0.5 rounded-lg border border-amber-500/30">
                      {isBn ? `স্কোর: ৩ এ ${score}` : `Score: ${score} / 3`}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {demoQuestions.map((qItem, qIdx) => {
                    const selected = quizAnswers[qIdx];
                    const isCorrect = selected === qItem.correct;

                    return (
                      <div key={qItem.id} className="p-3.5 bg-black/40 rounded-xl border border-white/5 space-y-2">
                        <span className="text-xs font-bold text-gray-200 block font-sans">
                          {qIdx + 1}. {qItem.q}
                        </span>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 font-sans">
                          {qItem.options.map((opt, oIdx) => {
                            const isChosen = selected === oIdx;
                            let btnStyle = "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10";

                            if (quizSubmitted) {
                              if (oIdx === qItem.correct) {
                                btnStyle = "bg-emerald-950/80 border-emerald-500 text-emerald-200 font-bold";
                              } else if (isChosen && !isCorrect) {
                                btnStyle = "bg-red-950/80 border-red-500 text-red-200";
                              }
                            } else if (isChosen) {
                              btnStyle = "bg-red-600/30 border-red-500 text-white font-bold";
                            }

                            return (
                              <button
                                key={oIdx}
                                onClick={() => handleSelectAnswer(qIdx, oIdx)}
                                disabled={quizSubmitted}
                                className={`p-2.5 rounded-lg border text-left text-xs transition flex items-center justify-between cursor-pointer ${btnStyle}`}
                              >
                                <span>{opt}</span>
                                {quizSubmitted && oIdx === qItem.correct && (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-1" />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {quizSubmitted && (
                          <div className="p-2 bg-sky-950/30 border border-sky-500/20 rounded-lg text-[11px] text-sky-200 font-sans mt-1.5">
                            <strong>{isBn ? "ব্যাখ্যা: " : "Explanation: "}</strong>
                            {qItem.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-2">
                  {!quizSubmitted ? (
                    <button
                      onClick={handleGradeQuiz}
                      disabled={Object.keys(quizAnswers).length === 0}
                      className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-black text-xs font-mono uppercase rounded-xl transition cursor-pointer shadow-lg"
                    >
                      {isBn ? "সাবমিট করুন ও ফলাফল দেখুন" : "Submit & Check Answers"}
                    </button>
                  ) : (
                    <button
                      onClick={resetQuiz}
                      className="w-full py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold text-xs font-mono uppercase rounded-xl transition cursor-pointer"
                    >
                      {isBn ? "পুনরায় চেষ্টা করুন" : "Retry Quiz"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column (1 Col): Playlist / Other Demo Classes & Enroll CTA */}
          <div className="space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-xs font-mono font-bold text-gray-300 uppercase flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 text-red-500" />
                  {isBn ? "অন্যান্য ফ্রি ডেমো ক্লাস" : "More Free Demo Classes"}
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">
                  {isBn ? "ফ্রি এক্সেস" : "FREE"}
                </span>
              </div>

              {/* Playlist Scroll */}
              <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                {(allDemoClasses.length > 0
                  ? allDemoClasses
                  : [
                      {
                        course: selectedCourse,
                        demo: selectedDemo
                      }
                    ]
                ).map((item, idx) => {
                  const isCurrent = selectedDemo.id === item.demo.id;
                  const thumb = getYouTubeThumbnailUrl(item.demo.youtubeUrl);

                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        playSound("click");
                        setSelectedDemo(item.demo);
                        setSelectedCourse(item.course);
                      }}
                      className={`p-2 rounded-xl border transition flex items-center gap-2.5 cursor-pointer ${
                        isCurrent
                          ? "bg-red-950/40 border-red-500/80 shadow-md"
                          : "bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.05]"
                      }`}
                    >
                      <div className="relative w-16 aspect-video rounded-lg overflow-hidden bg-black shrink-0 border border-white/10">
                        <img src={thumb} alt={item.demo.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <Play className={`w-3.5 h-3.5 ${isCurrent ? "text-red-400 fill-red-400" : "text-white"}`} />
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-white block truncate leading-tight">
                          {item.demo.title}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-gray-400 mt-0.5">
                          <span className="text-amber-300">{item.demo.subject}</span>
                          <span>•</span>
                          <span>{item.demo.duration || "40m"}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Course Admission Call to Action Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-b from-[#180d10] via-[#120b0e] to-black border-2 border-red-500/40 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase text-gray-400 block">{isBn ? "কোর্স এনরোলমেন্ট" : "Course Admission"}</span>
                  <h4 className="text-xs sm:text-sm font-extrabold text-white truncate max-w-[200px]">
                    {selectedCourse.title}
                  </h4>
                </div>
                <div className="text-right font-mono">
                  <span className="text-xs text-gray-400 line-through block">৳{selectedCourse.originalPrice}</span>
                  <span className="text-base sm:text-lg font-black text-amber-300">৳{selectedCourse.discountedPrice}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  playSound("levelup");
                  onClose();
                  onEnrollNow(selectedCourse);
                }}
                className="w-full py-3 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs font-mono uppercase tracking-wider rounded-xl transition shadow-[0_0_20px_rgba(220,38,38,0.4)] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                <span>{isBn ? "সম্পূর্ণ কোর্সে এনরোল করুন" : "Enroll Full Course"}</span>
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono text-gray-400 text-center">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isBn ? "১২০+ লাইভ এক্সাম, নোটস ও রেকর্ডিং এক্সেস" : "Full Exam Series & Note Access"}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
