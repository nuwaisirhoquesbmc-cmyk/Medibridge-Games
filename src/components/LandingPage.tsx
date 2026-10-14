import React, { useState } from "react";
import { db } from "../firebase";
import { doc, collection, getDoc, getDocs, query, orderBy, limit } from "firebase/firestore";
import { getVideoFromIndexedDB } from "../lib/videoDb";
import { INITIAL_COURSES } from "../data/coursesData";
import { Course, CourseDemoClass } from "../types/courseTypes";
import {
  Shield,
  Target,
  Flame,
  Users,
  Zap,
  Award,
  BookOpen,
  Compass,
  Globe,
  Map,
  MessageSquare,
  Bot,
  CheckCircle,
  HelpCircle,
  Trophy,
  Sparkles,
  Swords,
  Layers,
  SpellCheck,
  Star,
  Activity,
  Heart,
  Clock,
  Calendar,
  GraduationCap,
  ChevronRight,
  CheckCircle2,
  ArrowRight,
  X,
  Play,
  Tv,
  Mail,
  Facebook,
  PhoneCall
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { TRANSLATIONS } from "../translations";
import MediBridgeLogo from "./MediBridgeLogo";
import { playSound } from "../audio";
import FreeDemoClassModal from "./courses/FreeDemoClassModal";
import FreeDemoExamModal from "./courses/FreeDemoExamModal";
import OurHeroesSection from "./courses/OurHeroesSection";
import { isDemoClassEnabled, isDemoExamEnabled } from "../lib/courseDemoUtils";

interface LandingPageProps {
  onStart: () => void;
  onLoginClick: () => void;
  onSelectCourse?: (course: Course) => void;
  onEnrollCourse?: (course: Course) => void;
  language: "bn" | "en";
  setLanguage: (lang: "bn" | "en") => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
}

export default function LandingPage({
  onStart,
  onLoginClick,
  onSelectCourse,
  onEnrollCourse,
  language,
  setLanguage,
  theme,
  toggleTheme
}: LandingPageProps) {
  const [videoError, setVideoError] = useState(false);
  const [coursesList, setCoursesList] = useState<Course[]>(INITIAL_COURSES);
  const [selectedCoursePreview, setSelectedCoursePreview] = useState<Course | null>(null);
  const [demoModalCourse, setDemoModalCourse] = useState<Course | null>(null);
  const [demoExamModalCourse, setDemoExamModalCourse] = useState<Course | null>(null);
  const [activeDemoClass, setActiveDemoClass] = useState<CourseDemoClass | undefined>(undefined);
  const t = TRANSLATIONS[language];

  const isDark = theme === "dark";

  const [videoSettings, setVideoSettings] = useState({
    url: "https://assets.mixkit.co/videos/preview/mixkit-medical-blue-scanning-interface-41551-large.mp4",
    title: "🧬 MediBridge Campaign Promo: Bio-Scanning Diagnostic Interface",
    enabled: true
  });

  const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(null);

  React.useEffect(() => {
    async function checkAndLoadLocalVideo() {
      if (videoSettings.url === "local_indexeddb_promo") {
        const file = await getVideoFromIndexedDB();
        if (file) {
          setLocalVideoUrl(URL.createObjectURL(file));
        }
      } else {
        setLocalVideoUrl(null);
      }
    }
    checkAndLoadLocalVideo();
  }, [videoSettings.url]);

  // Load courses from cache or Firestore once on mount
  React.useEffect(() => {
    try {
      // 1. Try reading from cached courses first
      const cached = localStorage.getItem("medibridge_courses_cache");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCoursesList(parsed);
          return;
        }
      }

      // 2. Fetch with limit(20) if cache is missing
      const q = query(collection(db, "courses"), limit(20));
      getDocs(q)
        .then((snap) => {
          if (!snap.empty) {
            const fetched = snap.docs.map((docSnap) => ({
              id: docSnap.id,
              ...docSnap.data()
            })) as Course[];
            setCoursesList(fetched);
            try {
              localStorage.setItem("medibridge_courses_cache", JSON.stringify(fetched));
            } catch (e) {}
          } else {
            setCoursesList(INITIAL_COURSES);
          }
        })
        .catch((error) => {
          console.warn("Could not fetch courses from Firestore, using initial dataset:", error);
          setCoursesList(INITIAL_COURSES);
        });
    } catch (err) {
      console.warn("Course load error:", err);
      setCoursesList(INITIAL_COURSES);
    }
  }, []);

  React.useEffect(() => {
    getDoc(doc(db, "settings", "platform"))
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.landingVideoUrl !== undefined || data.landingVideoTitle !== undefined || data.landingVideoEnabled !== undefined) {
            setVideoSettings({
              url: data.landingVideoUrl || "https://assets.mixkit.co/videos/preview/mixkit-medical-blue-scanning-interface-41551-large.mp4",
              title: data.landingVideoTitle || "🧬 MediBridge Campaign Promo: Bio-Scanning Diagnostic Interface",
              enabled: data.landingVideoEnabled !== false
            });
          }
        }
      })
      .catch((err) => console.warn("Failed to fetch platform video settings:", err));
  }, []);

  const getCourseAspectClass = (ratio?: string) => {
    switch (ratio) {
      case "4:3":
        return "aspect-[4/3]";
      case "3:4":
        return "aspect-[3/4]";
      case "1:1":
        return "aspect-square";
      case "16:9":
      default:
        return "aspect-video";
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } },
  };

  return (
    <div className={`${isDark ? "bg-[#0A0A0A] text-white" : "bg-white text-slate-900"} min-h-screen font-sans selection:bg-[#C1121F] selection:text-white overflow-hidden relative`} id="landing-page-root">
      
      {/* 
        PREMIUM HERO BACKGROUND VIDEO & OUTSTANDING FALLBACK
      */}
      <div className="absolute inset-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        
        {/* Style tag for ECG stroke animation and floating cellular artifacts */}
        <style>{`
          @keyframes ecg-draw {
            0% { stroke-dashoffset: 1000; }
            50% { stroke-dashoffset: 0; stroke-opacity: 0.8; }
            100% { stroke-dashoffset: -1000; }
          }
          .animate-ecg {
            stroke-dasharray: 1000;
            animation: ecg-draw 10s linear infinite;
          }
        `}</style>

        {/* Video stream with high fidelity premium references */}
        {!videoError && (
          <video
            autoPlay
            muted
            loop
            playsInline
            onError={() => setVideoError(true)}
            className={`w-full h-full object-cover relative z-0 transition-opacity duration-1000 ${
              isDark ? "opacity-20" : "opacity-[0.05]"
            }`}
          >
            {/* Mixkit / Vimeo stock video with medically and study focused loop */}
            <source src="https://player.vimeo.com/external/371433846.sd.mp4?s=236da2f3c02afdc2a7f56cf86c8f49779dfba7ff&profile_id=139&oauth2_token_id=57447761" type="video/mp4" />
            <source src="https://assets.mixkit.co/videos/preview/mixkit-medical-laboratory-research-and-analysis-40348-large.mp4" type="video/mp4" />
          </video>
        )}
        
        {/* FALLBACK EXPERIENCE: Retro sci-fi grids, ECG pulses, and floaters */}
        <div className={`absolute inset-0 overflow-hidden -z-10 bg-gradient-to-br ${
          isDark
            ? "from-[#0A0A0A] via-[#0E0E0E] to-[#040404]"
            : "from-[#FFFFFF] via-[#FFF8F8] to-[#FEEFF0]"
        }`}>
          
          {/* Cybernetic grid in Red themes */}
          <div className={`absolute inset-0 bg-[linear-gradient(to_right,#C1121F12_1px,transparent_1px),linear-gradient(to_bottom,#C1121F12_1px,transparent_1px)] bg-[size:5rem_5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_80%,transparent_100%)] ${
            isDark ? "opacity-40" : "opacity-85"
          }`} />

          {/* Glowing ECG heart pulse path vector running globally across the landscape */}
          <svg className="absolute top-[35%] left-0 w-full h-56 opacity-25 pointer-events-none" viewBox="0 0 1000 100" preserveAspectRatio="none">
            <path
              d="M 0 50 L 250 50 L 270 20 L 290 80 L 310 40 L 330 65 L 350 50 L 650 50 L 670 10 L 690 90 L 710 30 L 730 70 L 750 50 L 1000 50"
              fill="none"
              stroke="#C1121F"
              strokeWidth="2.5"
              className="animate-ecg"
            />
          </svg>

          {/* Floating cells, medical symbols and gold coins */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(14)].map((_, i) => (
              <motion.div
                key={i}
                className={`absolute text-2xl filter ${isDark ? "opacity-[0.08]" : "opacity-[0.14]"}`}
                initial={{
                  x: Math.random() * 1400 - 100,
                  y: Math.random() * 900 + 50,
                  scale: Math.random() * 0.7 + 0.3,
                }}
                animate={{
                  y: [-120, 1000],
                  rotate: [0, 360],
                }}
                transition={{
                  duration: Math.random() * 20 + 20,
                  repeat: Infinity,
                  ease: "linear",
                }}
              >
                {["🧬", "🔬", "🥼", "🎒", "🛡️", "🪙", "🦠", "🩺"][i % 8]}
              </motion.div>
            ))}
          </div>

        </div>

        {/* Ambient background overlay for extreme content readability */}
        <div className={`absolute inset-0 z-1 bg-gradient-to-t ${
          isDark
            ? "from-[#0A0A0A] via-[#0A0A0A]/85 to-[#0A0A0A]/30"
            : "from-white via-[#FFFFFF]/90 to-[#FFFFFF]/40"
        }`} />
      </div>

      {/* Hero Navbar */}
      <nav className={`border-b ${isDark ? "border-white/5 bg-[#0D0D0D]/90" : "border-red-100 bg-white/95 shadow-sm"} backdrop-blur-md sticky top-0 z-50 px-6 py-4`} id="landing-navbar">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          
          {/* Logo & Mark */}
          <div className="flex items-center gap-3">
            <MediBridgeLogo size="sm" className="items-start" theme={theme} />
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 md:gap-4">
            
            {/* INSTANT LANGUAGE TOGGLE WIDGET */}
            <div className={`hidden md:flex border rounded-xl p-1 items-center gap-0.5 ${isDark ? "bg-black/60 border-white/10" : "bg-red-50/80 border-red-100"}`} id="language-switcher-landing">
              <button
                onClick={() => { playSound("click"); setLanguage("bn"); }}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all duration-300 cursor-pointer ${
                  language === "bn"
                    ? "bg-[#C1121F] text-white shadow"
                    : isDark ? "text-gray-400 hover:text-white" : "text-slate-600 hover:text-[#C1121F]"
                }`}
                id="landing-lang-bn"
              >
                বাংলা
              </button>
              <button
                onClick={() => { playSound("click"); setLanguage("en"); }}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all duration-300 cursor-pointer ${
                  language === "en"
                    ? "bg-[#C1121F] text-white shadow"
                    : isDark ? "text-gray-400 hover:text-white" : "text-slate-600 hover:text-[#C1121F]"
                }`}
                id="landing-lang-en"
              >
                English
              </button>
            </div>

            {/* COMPACT LANGUAGE TOGGLE FOR MOBILE */}
            <button
              onClick={() => {
                playSound("click");
                setLanguage(language === "bn" ? "en" : "bn");
              }}
              className={`md:hidden px-2 py-1.5 text-[10px] font-bold rounded-lg border flex items-center justify-center gap-0.5 cursor-pointer transition-all ${
                isDark
                  ? "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white"
                  : "bg-red-50 border-red-100 text-[#C1121F] hover:bg-red-100"
              }`}
              title={language === "bn" ? "Switch to English" : "বাংলায় পরিবর্তন করুন"}
              id="landing-lang-toggle-mobile"
            >
              🌐 <span className="font-mono">{language === "bn" ? "EN" : "বা"}</span>
            </button>

            {/* INSTANT THEME SWITCH CONTROLLER */}
            <button
              onClick={toggleTheme}
              className={`flex items-center justify-center p-1.5 sm:p-2 rounded-xl border transition-all duration-300 cursor-pointer ${
                isDark
                  ? "bg-white/5 border-white/10 text-yellow-400 hover:bg-white/10 hover:border-yellow-400/50"
                  : "bg-red-50 border-red-100 text-[#C1121F] hover:bg-red-100 hover:border-[#C1121F]"
              }`}
              title={isDark ? "Activate Light Mode" : "Activate Dark Mode"}
              id="landing-theme-switcher"
            >
              <span className="text-xs sm:text-sm">{isDark ? "☀️" : "🌙"}</span>
            </button>

            <button
              onClick={() => { playSound("click"); onLoginClick(); }}
              className={`px-2.5 py-1.5 sm:px-4 sm:py-2 text-[10px] sm:text-xs font-bold tracking-wider uppercase transition font-mono border rounded-xl cursor-pointer ${
                isDark
                  ? "border-white/5 hover:border-white/10 bg-white/5 text-gray-300 hover:text-white"
                  : "border-red-105 bg-red-50 text-[#C1121F] hover:bg-[#C1121F] hover:text-white"
              }`}
              id="btn-nav-login"
            >
              {language === "bn" ? "লগইন" : "LOG IN"}
            </button>
            
            <button
              onClick={() => { playSound("click"); onStart(); }}
              className="px-3 py-1.5 sm:px-5 sm:py-2 bg-[#C1121F] hover:bg-red-700 text-white font-extrabold rounded-xl text-[10px] sm:text-xs uppercase tracking-wider transition-all duration-300 hover:shadow-[0_0_15px_rgba(193,18,31,0.4)] border-b-2 border-red-950 font-display cursor-pointer"
              id="btn-nav-play"
            >
              {language === "bn" ? "শুরু করুন ⚔️" : "PLAY NOW ⚔️"}
            </button>

          </div>
        </div>
      </nav>

      {/* Hero Body */}
      <div className="max-w-7xl mx-auto px-6 py-12 md:py-20 grid lg:grid-cols-2 gap-12 items-center relative z-10" id="landing-hero-container">
        
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-6"
        >
          {/* Subheading badge */}
          <motion.div variants={itemVariants} className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono tracking-widest uppercase font-black w-fit border ${
            isDark
              ? "bg-red-950/40 border-red-800/50 text-[#FFD700]"
              : "bg-red-50 border-red-105 text-[#C1121F]"
          }`}>
            <Flame className="w-4 h-4 text-[#C1121F] animate-pulse" /> {language === "bn" ? "বাংলাদেশের প্রথম গেমিফাইড মেডিকেল এডমিশন কুইজ" : "BANGLADESH'S FIRST GAMIFIED MAT PREP"}
          </motion.div>

          <motion.h1 variants={itemVariants} className={`text-4xl md:text-6xl font-black tracking-tight uppercase leading-tight font-display ${
            isDark ? "text-white" : "text-slate-900"
          }`}>
            {language === "bn" ? (
              <>
                গেমারের মতো <span className="text-[#C1121F] filter drop-shadow-[0_0_12px_rgba(193,18,31,0.4)]">প্রস্তুতি নিন</span>।<br />
                মেডিকেলিয়ানের মতো <span className="text-red-650">চিন্তা করুন</span>।
              </>
            ) : (
              <>
                TRAIN LIKE A <span className="text-[#C1121F] filter drop-shadow-[0_0_12px_rgba(193,18,31,0.4)]">GAMER</span>.<br />
                THINK LIKE A <span className="text-red-650">MEDICALIAN</span>.
              </>
            )}
          </motion.h1>

          <motion.p variants={itemVariants} className={`text-base md:text-lg max-w-xl leading-relaxed ${
            isDark ? "text-gray-300" : "text-slate-700"
          }`}>
            {t.landingTagline}
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-wrap gap-4 mt-2">
            <button
              onClick={() => { playSound("click"); onStart(); }}
              className="px-8 py-4 bg-[#C1121F] hover:bg-red-750 text-white font-extrabold rounded-2xl text-base uppercase tracking-wider transition-all duration-300 hover:shadow-[0_0_25px_rgba(193,18,31,0.4)] border-b-4 border-red-950 flex items-center gap-3 font-display cursor-pointer"
              id="btn-hero-grind"
            >
              <Zap className="fill-current w-5 h-5 text-white" /> {t.landingStartJourney}
            </button>
            <button
              onClick={() => { playSound("click"); onLoginClick(); }}
              className={`px-8 py-4 font-bold rounded-2xl text-base uppercase tracking-wider transition border font-display cursor-pointer ${
                isDark
                  ? "bg-white/5 hover:bg-white/10 text-white border-white/10 hover:border-[#FFD700]/50"
                  : "bg-red-50 hover:bg-red-100 text-[#C1121F] border-red-100"
              }`}
              id="btn-hero-sign"
            >
              {language === "bn" ? "ফ্রি সাইন আপ" : "SIGN UP FREE"}
            </button>
          </motion.div>

          {/* Quick stats elements */}
          <motion.div variants={itemVariants} className={`grid grid-cols-3 gap-6 pt-6 border-t font-display ${
            isDark ? "border-white/5" : "border-red-100"
          }`}>
            <div>
              <p className="text-[#C1121F] text-2xl md:text-3xl font-black tracking-wider font-mono">15K+</p>
              <p className="text-gray-500 text-[10px] md:text-xs uppercase tracking-widest font-black leading-tight mt-1">
                {language === "bn" ? "প্রশ্ন সমাধানকৃত" : "MCQs Drilled"}
              </p>
            </div>
            <div>
              <p className="text-[#C1121F] text-2xl md:text-3xl font-black tracking-wider font-mono">98%</p>
              <p className="text-gray-500 text-[10px] md:text-xs uppercase tracking-widest font-black leading-tight mt-1">
                {language === "bn" ? "শিক্ষার্থী রেটিং" : "Aspirant Rating"}
              </p>
            </div>
            <div>
              <p className={`${isDark ? "text-white" : "text-slate-900"} text-2xl md:text-3xl font-black tracking-wider font-mono`}>75+</p>
              <p className="text-gray-500 text-[10px] md:text-xs uppercase tracking-widest font-black leading-tight mt-1">
                {language === "bn" ? "ক্যালকুলেটেড স্কোর কুয়েশ্চেন" : "Predicted vs MAT Match"}
              </p>
            </div>
          </motion.div>
        </motion.div>

        {/* Animated Educational Video Presentation Section */}
        <div className="flex justify-center items-center relative min-h-[380px] lg:min-h-[420px] w-full" id="landing-visual-video">
          <div className="absolute inset-0 bg-red-900/10 rounded-3xl skeleton-glowing-glow border border-red-500/10 blur-xl pointer-events-none" />
          
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, type: "spring" }}
            className={`w-full max-w-lg border rounded-2xl p-5 shadow-2xl relative z-10 backdrop-blur flex flex-col gap-4 ${
              isDark ? "bg-[#111111]/95 border-white/10" : "bg-white border-red-200 text-slate-800"
            }`}
          >
            {/* Esports animated styled video badge */}
            <div className="absolute -top-3.5 left-6 bg-[#C1121F] border border-[#FFD700] text-white px-4 py-1 rounded-xl text-[9px] tracking-widest uppercase font-black font-mono shadow-md flex items-center gap-1.5 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FFD700] animate-ping"></span>
              {language === "bn" ? "অ্যানিমেটেড প্রোমো ভিডিও" : "ANIMATED PROMO VIDEO"}
            </div>

            <div className="flex flex-col gap-3 pt-3">
              <div className="flex justify-between items-center text-xs border-b border-gray-150 pb-2">
                <span className="text-gray-400 font-mono tracking-wider text-[10px] uppercase">
                  {language === "bn" ? "প্রোমো ও গেম গাইড" : "CAMPAIGN PROMO BRIEF"}
                </span>
                <span className="text-[#C1121F] font-black tracking-widest text-[9px] uppercase font-mono bg-red-950/20 px-2 py-0.5 rounded border border-red-500/10">
                  {language === "bn" ? "সরাসরি সম্প্রচার" : "PROMO STREAM"}
                </span>
              </div>

              {/* Video Title */}
              <h3 className={`text-sm md:text-base font-extrabold tracking-tight uppercase leading-snug font-display ${
                isDark ? "text-white" : "text-slate-950"
              }`}>
                {videoSettings.title}
              </h3>

              {/* Elegant aspect-ratio Video player Container */}
              {videoSettings.enabled && (videoSettings.url === "local_indexeddb_promo" ? localVideoUrl : videoSettings.url) ? (
                <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-red-500/15 shadow-inner bg-black group">
                  {/* Subtle decorative glowing corner markers for esports feeling */}
                  <div className="absolute top-1 left-1 w-2 h-2 border-t-2 border-l-2 border-[#C1121F] z-20 pointer-events-none opacity-60"></div>
                  <div className="absolute top-1 right-1 w-2 h-2 border-t-2 border-r-2 border-[#C1121F] z-20 pointer-events-none opacity-60"></div>
                  <div className="absolute bottom-1 left-1 w-2 h-2 border-b-2 border-l-2 border-[#C1121F] z-20 pointer-events-none opacity-60"></div>
                  <div className="absolute bottom-1 right-1 w-2 h-2 border-b-2 border-r-2 border-[#C1121F] z-20 pointer-events-none opacity-60"></div>

                  <video
                    src={videoSettings.url === "local_indexeddb_promo" ? (localVideoUrl || "") : videoSettings.url}
                    controls
                    loop
                    autoPlay
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover border-0"
                  ></video>
                </div>
              ) : (
                <div className={`aspect-video rounded-xl border border-dashed flex flex-col items-center justify-center p-6 text-center gap-2 ${
                  isDark ? "bg-black/40 border-white/10" : "bg-red-50/25 border-red-200"
                }`}>
                  <div className="text-3xl animate-bounce">🎬🧬🎙️</div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    {language === "bn" ? "অফলাইন মিশন ব্রিফিং" : "MISSION BRIEFING QUEUED"}
                  </p>
                  <p className="text-[10px] text-gray-500 max-w-xs leading-relaxed">
                    {language === "bn"
                      ? "কমান্ড সেন্টার থেকে সুপারএডমিন নতুন ভিজ্যুয়াল প্রোমো যুক্ত করবেন।"
                      : "The superadmin command center is configuring a fresh batch of visual promos."}
                  </p>
                </div>
              )}

              {/* Decorative Combat metadata stats bar */}
              <div className="flex justify-center items-center text-xs font-mono text-gray-400 border-t border-white/10 pt-2.5">
                <span className="flex items-center gap-2 text-[#FFD700] uppercase font-black tracking-wider transition-colors duration-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C1121F] animate-ping shrink-0" />
                  {language === "bn" ? "MediBridge Academy-তে জয়েন করুন" : "Join MediBridge Academy 🏆"}
                </span>
              </div>
            </div>
          </motion.div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 🚀 COURSE ADVERTISEMENT & LIVE ADMISSION BATCH SHOWCASE (PRE-LOGIN) */}
      {/* ========================================================================= */}
      <section className="bg-gradient-to-b from-[#0A0A0A] via-[#121214] to-[#0D0D0D] py-16 px-4 sm:px-6 lg:px-8 border-t border-white/10 relative overflow-hidden" id="landing-courses-showcase">
        {/* Background glow effects */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#C1121F]/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#FFD700]/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10 space-y-12">
          
          {/* Header Banner & Live Admission Ticker */}
          <div className="text-center flex flex-col items-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#C1121F]/20 border border-[#C1121F]/50 text-[#FFD700] text-xs font-mono font-bold tracking-wide uppercase shadow-lg animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-[#FFD700]" />
              <span>{language === "bn" ? "চলমান মেডিকেল এডমিশন কোর্স ও ব্যাচসমূহ" : "Featured Medical Admission Batches & Courses"}</span>
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-5xl font-black text-white uppercase tracking-tight font-display max-w-3xl leading-tight">
              {language === "bn" ? (
                <>মেডিকেল ভর্তি পরীক্ষার <span className="text-[#FFD700]">সেরা প্রস্তুতি</span> ও লাইভ এক্সাম প্রোগ্রাম</>
              ) : (
                <>Conquer Medical Admission with <span className="text-[#FFD700]">Top Medical Mentors</span></>
              )}
            </h2>

            <div className="w-20 h-1 bg-[#C1121F] rounded-full"></div>

            <p className="text-gray-300 max-w-2xl text-xs sm:text-sm leading-relaxed">
              {language === "bn"
                ? "ঢাকা মেডিকেল কলেজ (DMC) ও শীর্ষ সরকারি মেডিকেলের অভিজ্ঞ মেন্টরদের তত্ত্বাবধানে প্রতিটি অধ্যায়ের নিখুঁত MCQ প্র্যাকটিস, লেকচার শিট, স্বয়ংক্রিয় মিসটেক ব্যাংক এবং লাইভ ন্যাশনাল লিডারবোর্ড।"
                : "Comprehensive chapter-wise model tests, high-yield lecture sheets, automated mistake banks, and live nation-wide percentiles led by premier DMC & SSMC medical students."}
            </p>
          </div>

          {/* Quick Advantage Highlights Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-black/60 p-4 sm:p-5 rounded-2xl border border-white/10 font-mono text-xs shadow-xl">
            <div className="flex items-center gap-3 p-2">
              <div className="w-9 h-9 rounded-xl bg-red-950/40 border border-[#C1121F]/30 flex items-center justify-center text-[#FFD700] shrink-0">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-white block text-[11px] sm:text-xs">DMC & SSMC Faculty</span>
                <span className="text-[9px] sm:text-[10px] text-gray-400">শীর্ষ মেডিকেল মেন্টরশিপ</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2">
              <div className="w-9 h-9 rounded-xl bg-yellow-950/40 border border-[#FFD700]/30 flex items-center justify-center text-[#FFD700] shrink-0">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-white block text-[11px] sm:text-xs">১২০+ মডেল টেস্ট</span>
                <span className="text-[9px] sm:text-[10px] text-gray-400">রিয়েল MAT নেগেটিভ মার্কিং</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-white block text-[11px] sm:text-xs">স্বয়ংক্রিয় মিসটেক ব্যাংক</span>
                <span className="text-[9px] sm:text-[10px] text-gray-400">ভুল প্রশ্ন বারবার প্র্যাকটিস</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2">
              <div className="w-9 h-9 rounded-xl bg-blue-950/40 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-white block text-[11px] sm:text-xs">মেডিসেন্স এআই সাপোর্ট</span>
                <span className="text-[9px] sm:text-[10px] text-gray-400">ইনস্ট্যান্ট টেক্সটবুক রেফারেন্স</span>
              </div>
            </div>
          </div>

          {/* COURSES CARD GRID (Clean Thumbnails, No Text Overlays) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {coursesList.filter((c) => (c as any).showOnLandingPage !== false).map((course) => {
              const discountPercent = course.originalPrice > course.discountedPrice
                ? Math.round(((course.originalPrice - course.discountedPrice) / course.originalPrice) * 100)
                : 0;

              return (
                <div
                  key={course.id}
                  className="bg-[#111111] rounded-2xl border border-white/10 hover:border-[#FFD700]/50 transition-all duration-300 flex flex-col overflow-hidden group shadow-2xl hover:shadow-[0_0_30px_rgba(193,18,31,0.25)] relative"
                >
                  {/* Clean Thumbnail Container (NO TEXT ON THUMBNAIL) */}
                  <div className={`w-full overflow-hidden bg-black/60 relative ${getCourseAspectClass(course.aspectRatio)}`}>
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>

                  {/* Course Details Body */}
                  <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
                    
                    <div className="space-y-3">
                      {/* Badges & Meta info below image */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="px-2.5 py-1 rounded-md bg-[#C1121F]/20 text-[#FFD700] text-[10px] font-mono font-black uppercase tracking-wider border border-[#C1121F]/40">
                          {course.duration || "Admission Batch"}
                        </span>
                        
                        <div className="flex items-center gap-3 text-[11px] font-mono text-gray-400">
                          <span className="flex items-center gap-1">
                            <Target className="w-3.5 h-3.5 text-[#C1121F]" />
                            <strong className="text-white">{course.totalExams || 50}+</strong> Exams
                          </span>
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                            <strong className="text-white">{course.totalClasses || 40}+</strong> Classes
                          </span>
                        </div>
                      </div>

                      {/* Course Title */}
                      <h3 className="text-lg font-black text-white font-display group-hover:text-[#FFD700] transition line-clamp-2">
                        {course.title}
                      </h3>

                      {/* Short Description */}
                      <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                        {course.shortDescription}
                      </p>

                      {/* Subject Pills */}
                      {course.subjects && Array.isArray(course.subjects) && course.subjects.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {course.subjects.slice(0, 4).map((sub, sIdx) => (
                            <span key={sIdx} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-gray-300 text-[10px] font-mono">
                              {sub}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Instructor Preview */}
                      <div className="flex items-center gap-3 pt-3 border-t border-white/10">
                        <img
                          src={course.instructorAvatar || "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=120&auto=format&fit=crop&q=60"}
                          alt={course.instructorName}
                          className="w-10 h-10 rounded-full border-2 border-[#C1121F] object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-white block truncate">
                            {course.instructorName}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono block truncate">
                            {course.instructorTitle}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Price & Action Button Area */}
                    <div className="pt-3 border-t border-white/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-xl sm:text-2xl font-black text-[#FFD700] font-mono">
                              ৳{course.discountedPrice.toLocaleString()}
                            </span>
                            {course.originalPrice > course.discountedPrice && (
                              <span className="text-xs text-gray-500 line-through font-mono">
                                ৳{course.originalPrice.toLocaleString()}
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] text-emerald-400 font-mono block font-bold">
                            {language === "bn" ? "ফুল সিলেবাস এক্সেস ও মেটেরিয়ালস সহ" : "Full Syllabus & Materials Access"}
                          </span>
                        </div>

                        {discountPercent > 0 && (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-bold">
                            {discountPercent}% OFF
                          </span>
                        )}
                      </div>

                      <div className="pt-2 font-mono">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              playSound("click");
                              if (onSelectCourse) {
                                onSelectCourse(course);
                              } else {
                                setSelectedCoursePreview(course);
                              }
                            }}
                            className="px-3 py-2.5 bg-white/10 hover:bg-white/15 text-gray-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <BookOpen className="w-3.5 h-3.5 text-gray-400" />
                            <span>{language === "bn" ? "বিস্তারিত" : "Details"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              playSound("click");
                              if (onEnrollCourse) {
                                onEnrollCourse(course);
                              } else {
                                onLoginClick();
                              }
                            }}
                            className="px-3 py-2.5 bg-[#C1121F] hover:bg-red-700 active:scale-95 text-white text-xs font-black uppercase rounded-xl transition flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(193,18,31,0.4)] cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-[#FFD700]" />
                            <span>{language === "bn" ? "ভর্তি হন" : "Enroll"}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Banner to prompt registration */}
          <div className="bg-gradient-to-r from-[#C1121F]/20 via-[#151515] to-[#FFD700]/10 p-6 sm:p-8 rounded-3xl border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
            <div className="space-y-1.5 text-center sm:text-left">
              <h4 className="text-lg sm:text-xl font-black text-white font-display uppercase flex items-center justify-center sm:justify-start gap-2">
                <Shield className="w-5 h-5 text-[#FFD700]" />
                <span>{language === "bn" ? "প্রস্তুতি শুরু করতে এখনই একাউন্ট খুলুন" : "Create Account & Start Preparing"}</span>
              </h4>
              <p className="text-xs text-gray-300 max-w-xl">
                {language === "bn"
                  ? "বিনামূল্যে সাইন আপ করে ডেমো এক্সাম দিন, লিডারবোর্ড দেখুন এবং আপনার পছন্দের মেডিকেল কোর্সে এনরোল করুন।"
                  : "Sign up for free to attempt demo exams, inspect state-wide leaderboards, and enroll in your preferred medical batch."}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  playSound("click");
                  onLoginClick();
                }}
                className="px-6 py-3 bg-[#C1121F] hover:bg-red-700 active:scale-95 text-white font-display font-extrabold text-xs sm:text-sm uppercase rounded-xl transition shadow-[0_0_20px_rgba(193,18,31,0.5)] flex items-center gap-2 cursor-pointer"
              >
                <span>{language === "bn" ? "লগইন / সাইন আপ করুন" : "Sign Up / Log In"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* Feature Showcase Grid */}
      <section className="bg-[#111111] py-16 px-6 border-t border-white/5 relative" id="landing-features">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center mb-12 flex flex-col items-center gap-3">
            <h2 className="text-3xl md:text-4xl font-extrabold uppercase tracking-tight font-display">
              {language === "bn" ? "গেমপ্লে" : "GAMEPLAY"} <span className="text-[#C1121F]">{language === "bn" ? "সিস্টেমসমূহ" : "SYSTEMS"}</span>
            </h2>
            <div className="w-16 h-1 bg-[#FFD700]"></div>
            <p className="text-gray-400 max-w-xl text-center text-sm">
              {language === "bn" 
                ? "বাংলাদেশের মেডিকেল ভর্তি পরীক্ষার প্রতিটি স্তর জয় করার আধুনিক প্রযুক্তি ও গেমিং মেকানিক্স।" 
                : "Engineered to conquer Bangladesh's demanding medical entrance challenges using modern RPG systems."}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="bg-[#0D0D0D] p-5 rounded-2xl border border-white/5 hover:border-[#C1121F] transition-all duration-300 group shadow">
              <div className="w-10 h-10 rounded-lg bg-red-950/30 flex items-center justify-center text-[#C1121F] group-hover:bg-[#C1121F] group-hover:text-white transition duration-300 mb-4 border border-[#C1121F]/10">
                <Target className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold uppercase mb-1.5 font-display">{language === "bn" ? "এমসিকিউ কমব্যাট" : "MCQ Arena"}</h3>
              <p className="text-gray-400 text-xs leading-relaxed">
                {language === "bn"
                  ? "জীববিজ্ঞান, রসায়ন এবং পদার্থবিদ্যায় চ্যাপ্টার ভিত্তিক লড়াই করুন। সঠিক ধারাবাহিকতায় অর্জন করুন কাস্টম রিওয়ার্ড।"
                  : "Dissect biochemistry or biology anatomy chapter-by-chapter. Earn weaponized XP and Gold upon completing streaks."}
              </p>
            </div>

            <div className="bg-[#0D0D0D] p-5 rounded-2xl border border-white/5 hover:border-[#FFD700] transition-all duration-300 group shadow">
              <div className="w-10 h-10 rounded-lg bg-yellow-950/30 flex items-center justify-center text-[#FFD700] group-hover:bg-[#FFD700] group-hover:text-black transition duration-300 mb-4 border border-[#FFD700]/10">
                <Flame className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold uppercase mb-1.5 font-display">{language === "bn" ? "সারভাইভাল চরম মোড" : "Survival Mode"}</h3>
              <p className="text-gray-400 text-xs leading-relaxed">
                {language === "bn"
                  ? "কোনো হেল্পিং হ্যান্ড নেই, রয়েছে ১৫ সেকেন্ড কড়া সময় ও লিমিটেড প্লেয়ার লাইফলাইন। ভুল করলেই সরাসরি লাইফলাইন শেষ!"
                  : "No lifelines, strictly 15s timer per question, and player health bars. Every mistake deals critical HP damage."}
              </p>
            </div>

            <div className="bg-[#0D0D0D] p-5 rounded-2xl border border-white/5 hover:border-blue-500 transition-all duration-300 group shadow">
              <div className="w-10 h-10 rounded-lg bg-blue-950/30 flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition duration-300 mb-4 border border-blue-500/10">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold uppercase mb-1.5 font-display">{language === "bn" ? "মেডিসেন্স এআই" : "MediSense AI"}</h3>
              <p className="text-gray-400 text-xs leading-relaxed">
                {language === "bn"
                  ? "ব্যক্তিগত এআই শিক্ষক। আপনার ভুলগুলো ট্র্যাক করে কাস্টম রুটিন তৈরি করবে এবং ভর্তি পরীক্ষার সম্ভাবনা হিসাব করবে।"
                  : "Smart server-side AI mentor. Calibrates customizable schedules, parses complex concepts in Bengali, and tracks ranks."}
              </p>
            </div>

            <div className="bg-[#0D0D0D] p-5 rounded-2xl border border-white/5 hover:border-[#FFD700] transition-all duration-300 group shadow">
              <div className="w-10 h-10 rounded-lg bg-yellow-950/20 flex items-center justify-center text-[#FFD700] group-hover:bg-[#FFD700] group-hover:text-black transition duration-300 mb-4 border border-[#FFD700]/10">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold uppercase mb-1.5 font-display">{language === "bn" ? "বিভাগীয় যুদ্ধ" : "Division Wars"}</h3>
              <p className="text-gray-400 text-xs leading-relaxed">
                {language === "bn"
                  ? "ঢাকা, চট্টগ্রাম বা রাজশাহী যেকোনো জোনে লড়াইয়ে যোগ দিন। পয়েন্ট সংগ্রহ করে আপনার বিভাগীয় সেক্টর তালিকায় শীর্ষে তুলুন।"
                  : "Command under Dhaka, Sylhet, etc. Solve clinical trials to capture divisions and propel your community."}
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* AD-TYPE HIGH-IMPACT FEATURE SHOWCASE (SEQUENTIAL & FOCUS-DRIVEN) */}
      <section className="bg-[#0D0D0D] py-20 px-6 border-y border-white/5 relative overflow-hidden" id="landing-ad-features">
        
        {/* Subtle decorative glows in background */}
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-red-900/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-[#FFD700]/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto">
          
          {/* Section Title */}
          <div className="text-center mb-16 flex flex-col items-center gap-4">
            <span className="px-4 py-1.5 rounded-full text-[10px] font-mono tracking-[0.2em] font-extrabold uppercase bg-red-950/40 border border-[#C1121F]/30 text-[#C1121F] animate-pulse">
              {language === "bn" ? "এক্সক্লুসিভ স্টাডি মডিউল শো-কেস" : "EXCLUSIVE STUDY MODULE SHOWCASE"}
            </span>
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight font-display">
              {language === "bn" ? "চূড়ান্ত প্রস্তুতি গাইড" : "PREMIUM COMBAT ARMORY"}
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-transparent via-[#C1121F] to-transparent"></div>
            <p className="text-gray-400 max-w-2xl text-sm md:text-base leading-relaxed">
              {language === "bn"
                ? "ভর্তি পরীক্ষার শতভাগ সিলেবাসকে জয় করতে প্রতিটি মডিউল সাজানো হয়েছে আকর্ষণীয় ও গেমিফাইড উপায়ে।"
                : "Every critical MAT mark is addressed through high-octane gamified features. Master your prep sequentially."}
            </p>
          </div>

          <div className="flex flex-col gap-16">

            {/* AD MODULE 1: MAT ENGLISH PLAYGROUND */}
            <div className={`p-6 md:p-10 rounded-3xl border transition-all duration-500 hover:shadow-[0_0_30px_rgba(193,18,31,0.15)] relative overflow-hidden group ${
              isDark ? "bg-[#080808] border-white/5 hover:border-red-900/60" : "bg-white border-red-100 shadow-sm hover:border-red-300"
            }`} id="ad-feature-english">
              
              {/* Badge for High Converting Ad Look */}
              <div className="absolute top-0 right-0 bg-[#C1121F] text-white text-[10px] font-mono font-black tracking-widest px-4 py-2 rounded-bl-3xl shadow flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#FFD700] fill-[#FFD700]" />
                {language === "bn" ? "১০ মার্কস নিশ্চিতকরণ 🇬🇧" : "10 MARKS SYLLABUS 🇬🇧"}
              </div>

              <div className="grid lg:grid-cols-12 gap-8 items-center">
                
                {/* Description Space */}
                <div className="lg:col-span-7 flex flex-col gap-4">
                  <span className="text-[#C1121F] text-xs font-mono font-black tracking-widest uppercase flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#C1121F]" /> FEATURE 01 • MAT ENGLISH PLAYGROUND
                  </span>
                  
                  <h3 className={`text-2xl md:text-4xl font-extrabold uppercase font-display leading-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                    {language === "bn" ? "ইংলিশ ভোকাবুলারি ও গ্রামার এখন পানির মতো সহজ!" : "Conquer MAT English Prep with Spellbinding Mechanics"}
                  </h3>

                  <p className={`text-sm leading-relaxed ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                    {language === "bn"
                      ? "মেডিকেল ভর্তি পরীক্ষার ১০টি গুরুত্বপূর্ণ নম্বর অর্জন করুন চোখের পলকে! কোনো মুখস্থ করার একঘেয়েমি ছাড়া এখানে রয়েছে ৩টি ভিন্ন ট্রেইনিং এরিনা:"
                      : "Medical admissions allocate a solid 10 marks to English. Avoid boring route learning—practice vocabulary, appropriate prepositions, spelling, and sentence corrections through high-vibe interactive drills!"}
                  </p>

                  <div className="grid sm:grid-cols-3 gap-3.5">
                    <div className={`p-3 rounded-xl border ${isDark ? "bg-black/40 border-white/5" : "bg-red-50/40 border-red-100/50"}`}>
                      <span className="text-lg block">🎴</span>
                      <span className="text-xs font-bold text-white uppercase block mt-1.5 font-display text-[#C1121F]">{language === "bn" ? "ফ্ল্যাশ-কার্ড থেরাপি" : "FLIP OVER FLASHCARDS"}</span>
                      <span className="text-[10px] text-gray-500 block leading-tight mt-1">{language === "bn" ? "শব্দার্থ ও উপযুক্ত প্রিপজিশন পানির মতো সহজ করুন।" : "Interactive mnemonic flipcards with instant audio cues."}</span>
                    </div>
                    <div className={`p-3 rounded-xl border ${isDark ? "bg-black/40 border-white/5" : "bg-red-50/40 border-red-100/50"}`}>
                      <span className="text-lg block">⚡</span>
                      <span className="text-xs font-bold text-white uppercase block mt-1.5 font-display text-blue-500">{language === "bn" ? "স্পেলিং ব্লিৎজ" : "SPELLING SPEED BLITZ"}</span>
                      <span className="text-[10px] text-gray-500 block leading-tight mt-1">{language === "bn" ? "সময় ফুরনোর আগেই বানান সমাধান করে রিফ্লেক্স বাড়ান।" : "Identify correct spellings within a heart-racing 15s timer."}</span>
                    </div>
                    <div className={`p-3 rounded-xl border ${isDark ? "bg-black/40 border-white/5" : "bg-red-50/40 border-red-100/50"}`}>
                      <span className="text-lg block">🎯</span>
                      <span className="text-xs font-bold text-white uppercase block mt-1.5 font-display text-emerald-500">{language === "bn" ? "গ্রামার স্নাইপার" : "GRAMMAR CORRECT SNIPER"}</span>
                      <span className="text-[10px] text-gray-500 block leading-tight mt-1">{language === "bn" ? "ভুল বাক্য নির্ণয় করে নিখুঁত মার্ক অর্জন করুন।" : "Snipe down grammatical slide-ups and common errors."}</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => { playSound("click"); onStart(); }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#C1121F] hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition duration-300 font-display cursor-pointer shadow"
                    >
                      <Zap className="w-4 h-4 text-[#FFD700] fill-[#FFD700]" />
                      {language === "bn" ? "ইংলিশ প্লেগ্রাউন্ডে প্রবেশ করুন 🇬🇧" : "ENTER ENGLISH PLAYGROUND NOW"}
                    </button>
                  </div>
                </div>

                {/* Simulated visual block */}
                <div className="lg:col-span-5 relative flex justify-center">
                  <div className={`w-full max-w-sm rounded-2xl border p-5 shadow-xl relative overflow-hidden backdrop-blur ${
                    isDark ? "bg-[#111111]/90 border-white/10" : "bg-red-50/30 border-red-100"
                  }`}>
                    
                    {/* Simulated flipcard mockup */}
                    <div className="flex justify-between items-center text-xs mb-3 font-mono text-gray-500">
                      <span>{language === "bn" ? "আজকের মিশন: ভোকাবুলারি" : "VOCABULARY DRILL SESSION"}</span>
                      <span className="text-[#FFD700]">★ +50 XP</span>
                    </div>

                    <div className="h-32 bg-gradient-to-br from-red-950/20 to-black rounded-xl border border-[#C1121F]/30 flex flex-col justify-center items-center text-center p-4 relative group cursor-pointer mb-4">
                      <div className="absolute top-2 left-2 text-[9px] font-mono text-gray-500">WORD #42</div>
                      <span className="text-xl font-bold font-display text-white tracking-widest uppercase">"ABSTAIN FROM"</span>
                      <span className="text-[10px] text-[#C1121F] uppercase tracking-wide font-mono mt-1 animate-pulse">[{language === "bn" ? "ক্লিক করে অনুবাদ দেখুন" : "CLICK TO REVEAL BENGALI"}]</span>
                    </div>

                    {/* spelling game mockup */}
                    <div className={`p-3 rounded-xl border ${isDark ? "bg-black/50 border-white/5" : "bg-white"} flex flex-col gap-2`}>
                      <span className="text-[9px] text-[#C1121F] uppercase tracking-widest font-mono block">Grammar sniper combat snippet</span>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-medium text-white truncate">{language === "bn" ? "She has no taste ______ music." : "She has no taste ______ music."}</span>
                        <span className="shrink-0 text-red-500 font-mono text-[10px]">⏱️ 09s</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 mt-1 font-mono text-[9px] text-center">
                        <div className="p-1 px-1.5 border border-white/5 bg-[#1a1a1a] rounded text-gray-400">in</div>
                        <div className="p-1 px-1.5 border border-[#C1121F] bg-[#C1121F]/10 rounded text-white font-bold">for 👍</div>
                        <div className="p-1 px-1.5 border border-white/5 bg-[#1a1a1a] rounded text-gray-400">to</div>
                        <div className="p-1 px-1.5 border border-white/5 bg-[#1a1a1a] rounded text-gray-400">with</div>
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            </div>


            {/* AD MODULE 2: MCQ COMBAT ARENA */}
            <div className={`p-6 md:p-10 rounded-3xl border transition-all duration-500 hover:shadow-[0_0_30px_rgba(193,18,31,0.15)] relative overflow-hidden group ${
              isDark ? "bg-[#080808] border-white/5 hover:border-red-900/60" : "bg-white border-red-100 shadow-sm hover:border-red-300"
            }`} id="ad-feature-combat">
              
              <div className="absolute top-0 right-0 bg-red-950/70 text-[#FFD700] text-[10px] font-mono font-black tracking-widest px-4 py-2 rounded-bl-3xl shadow flex items-center gap-1.5 border-l border-b border-[#FFD700]/30">
                <Swords className="w-3.5 h-3.5" />
                {language === "bn" ? "কোর সায়েন্স এমসিকিউ 🧬" : "CORE SCIENCE DRILL 🧬"}
              </div>

              <div className="grid lg:grid-cols-12 gap-8 items-center">
                
                {/* Visual mockup of Combat Panel */}
                <div className="lg:col-span-5 order-2 lg:order-1 relative flex justify-center">
                  <div className={`w-full max-w-sm rounded-2xl border p-5 shadow-xl relative overflow-hidden backdrop-blur ${
                    isDark ? "bg-[#111111]/90 border-white/10" : "bg-red-50/30 border-red-100"
                  }`}>
                    <div className="flex justify-between items-center text-[10px] text-gray-400 mb-3 font-mono">
                      <span>GAZI AJMAL - CHAPTER CHIEF fighting</span>
                      <span className="text-emerald-400 font-bold">STREAK: x14 🔥</span>
                    </div>

                    <div className={`p-3.5 rounded-xl border mb-3 ${isDark ? "bg-black/40 border-white/5" : "bg-white"}`}>
                      <p className="text-xs font-bold mb-2">
                        {language === "bn"
                          ? "নিচের কোনটি হাইড্রার এপিডার্মিসের কোষ নয়?"
                          : "Which is of the following is NOT a cell of Hydra epidermis?"}
                      </p>
                      
                      <div className="flex flex-col gap-2 font-mono text-[10px]">
                        <div className="p-2 border border-red-950/40 bg-red-950/10 rounded flex justify-between">
                          <span>A. {language === "bn" ? "পেশী-আবরণী কোষ" : "Musculo-epithelial cell"}</span>
                          <span className="text-red-500 font-bold">❌ Incorrect (24%)</span>
                        </div>
                        <div className="p-2 border border-emerald-500 bg-emerald-950/10 rounded flex justify-between">
                          <span>B. {language === "bn" ? "ক্ষরণকারী কোষ" : "Gland cell"}</span>
                          <span className="text-emerald-400 font-black">✓ Correct Choice 👍</span>
                        </div>
                        <div className="p-2 border border-white/5 bg-[#171717] rounded">
                          <span>C. {language === "bn" ? "ইন্টারস্টিশিয়াল কোষ" : "Interstitial cell"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[9px] leading-relaxed text-emerald-400 font-mono">
                      💡 <strong>{language === "bn" ? "ভর্তি টিপস:" : "HY Tip:"}</strong> {language === "bn" ? "ক্ষরণকারী কোষ মূলত এতিথেলিয়াম গ্যাস্ট্রাডার্মাল জোনে অবস্থান করে।" : "Gland cells are situated predominantly in gastrodermis layer."}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="lg:col-span-7 order-1 lg:order-2 flex flex-col gap-4">
                  <span className="text-[#C1121F] text-xs font-mono font-black tracking-widest uppercase flex items-center gap-2">
                    <Target className="w-4 h-4 text-[#C1121F]" /> FEATURE 02 • MCQ COMBAT ARENA
                  </span>

                  <h3 className={`text-2xl md:text-4xl font-extrabold uppercase font-display leading-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                    {language === "bn" ? "অধ্যায় ভিত্তিক এমসিকিউ কমব্যাট এবং রিয়েল-টাইম চ্যালেঞ্জ" : "Scientific Chapter Fights & Rapid-Fire MCQ Drills"}
                  </h3>

                  <p className={`text-sm leading-relaxed ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                    {language === "bn"
                      ? "পদ্ধতিগত ভাবে প্রস্তুতি নিন। জীববিজ্ঞান, রসায়ন এবং পদার্থবিদ্যার প্রতিটি বিখ্যাত ভর্তি বইয়ের চ্যাপ্টার ধরে তৈরি স্পেশাল এমসিকিউ ডাস্টবোর্ডে লড়াই করুন। যেকোনো ভুলের পর তাৎক্ষণিক বৈজ্ঞানিক ব্যাখ্যা ও ট্রিক্সের মাধ্যমে কনসেপ্ট ক্লিয়ার করুন।"
                      : "Engage in systematic, chapter-wise battles derived exactly from high-yield medical admission test textbooks. Includes instant explanations, bookmark options, target strength/weakness analyzers, and dynamic audio feedback!"}
                  </p>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <span className="px-2.5 py-1 rounded bg-[#C1121F]/10 border border-[#C1121F]/20 text-[10px] font-mono text-[#C1121F] font-bold"># {language === "bn" ? "আজমল স্যার বিশেষায়িত" : "Azmal Biol-Special"}</span>
                    <span className="px-2.5 py-1 rounded bg-yellow-950/20 border border-[#FFD700]/20 text-[10px] font-mono text-[#FFD700] font-bold"># {language === "bn" ? "কবীর কেমিস্ট্রি প্যাক" : "Kabir Chemistry Packs"}</span>
                    <span className="px-2.5 py-1 rounded bg-blue-950/20 border border-blue-900/20 text-[10px] font-mono text-blue-400 font-bold"># {language === "bn" ? "হাজীরি ফিজিক্স এরিনা" : "Hazari & Isaq Arena"}</span>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => { playSound("click"); onStart(); }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#C1121F] hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition duration-300 font-display cursor-pointer"
                    >
                      <Swords className="w-4 h-4" />
                      {language === "bn" ? "কমব্যাট এরেনা শুরু করুন ⚔️" : "START HEATING UP IN COMBAT"}
                    </button>
                  </div>
                </div>

              </div>
            </div>


            {/* AD MODULE 3: MAT GK SECTORS MAP */}
            <div className={`p-6 md:p-10 rounded-3xl border transition-all duration-500 hover:shadow-[0_0_30px_rgba(193,18,31,0.15)] relative overflow-hidden group ${
              isDark ? "bg-[#080808] border-white/5 hover:border-red-900/60" : "bg-white border-red-100 shadow-sm hover:border-red-300"
            }`} id="ad-feature-gk">
              
              <div className="absolute top-0 right-0 bg-[#C1121F] text-white text-[10px] font-mono font-black tracking-widest px-4 py-2 rounded-bl-3xl shadow flex items-center gap-1.5">
                <Map className="w-3.5 h-3.5 text-yellow-300" />
                {language === "bn" ? "১০ মার্কস নিশ্চিতকরণ 🇧🇩" : "10 MARKS SYLLABUS 🇧🇩"}
              </div>

              <div className="grid lg:grid-cols-12 gap-8 items-center">
                
                {/* Description Space */}
                <div className="lg:col-span-7 flex flex-col gap-4">
                  <span className="text-[#C1121F] text-xs font-mono font-black tracking-widest uppercase flex items-center gap-2">
                    <Map className="w-4 h-4 text-[#C1121F]" /> FEATURE 03 • MAT GK BANGLADESH
                  </span>
                  
                  <h3 className={`text-2xl md:text-4xl font-extrabold uppercase font-display leading-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                    {language === "bn" ? "ইন্টারেক্টিভ সেক্টর ম্যাপ ও বীরগাথা গল্প" : "Interactive 11 Secors Maps & Liberation War Lore"}
                  </h3>

                  <p className={`text-sm leading-relaxed ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                    {language === "bn"
                      ? "সাধারণ জ্ঞান (১৭৭১-১৯৭১) মেডিকেল সিলেবাসের গুরুত্বপূর্ণ ১০ মার্কস অর্জন করুন দারুণ গেমিফাইড ম্যাপের সাহায্যে! ১৯৭১ সালের মুক্তিযুদ্ধের ১১টি সেক্টর এবং বীরশ্রেষ্ঠদের গৌরবময় ইতিহাস জানুন ইন্টারেক্টিভ কুইজের মাধ্যমে।"
                      : "General Knowledge covers 10 vital marks of the MAT syllabus focused predominantly on Liberation War (1971). Explore Bangladesh map partitions, click sectors to study high-yield summaries, and target specific historical dates!"}
                  </p>

                  <div className="grid sm:grid-cols-2 gap-3.5 font-mono text-xs">
                    <div className="flex items-start gap-2.5">
                      <CheckCircle className="w-4 h-4 text-[#C1121F] shrink-0 mt-0.5" />
                      <div>
                        <p className="font-extrabold text-white text-xs uppercase font-display">{language === "bn" ? "১১টি রণক্ষেত্র ম্যাপ" : "11 Sector Geographic Points"}</p>
                        <p className="text-gray-500 text-[10px] leading-tight mt-0.5">{language === "bn" ? "কোন সেক্টরে কে কমান্ডার ছিলেন তা ভিজুয়ালি শিখুন।" : "Memorize Sector Commanders and headquarters geographically."}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <CheckCircle className="w-4 h-4 text-[#C1121F] shrink-0 mt-0.5" />
                      <div>
                        <p className="font-extrabold text-white text-xs uppercase font-display">{language === "bn" ? "৭ জন বীরশ্রেষ্ঠ বীরগাথা" : "7 Great Bir Sreshtho Stories"}</p>
                        <p className="text-gray-500 text-[10px] leading-tight mt-0.5">{language === "bn" ? "বিখ্যাত বীরদের আত্মত্যাগের বীরত্বের কুইজ।" : "Interactive highlights of martyrdom sites and dates."}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => { playSound("click"); onStart(); }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#C1121F] hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition duration-300 font-display cursor-pointer"
                    >
                      <Map className="w-4 h-4" />
                      {language === "bn" ? "ইন্টারেক্টিভ জিকে ম্যাপ দেখুন 🇧🇩" : "LAUNCH GENERAL KNOWLEDGE MAP"}
                    </button>
                  </div>
                </div>

                {/* Graphics Mockup */}
                <div className="lg:col-span-5 relative flex justify-center">
                  <div className={`w-full max-w-sm rounded-2xl border p-5 shadow-xl relative overflow-hidden backdrop-blur ${
                    isDark ? "bg-[#111111]/90 border-white/10" : "bg-red-50/30 border-red-100"
                  }`}>
                    
                    {/* Simulated Map Hud */}
                    <div className="flex justify-between items-center text-[10px] text-gray-500 mb-3 font-mono">
                      <span>BANGLADESH WAR MAP - ACTIVE</span>
                      <span className="text-[#C1121F] font-bold">100% HIGHLAND</span>
                    </div>

                    <div className="h-44 bg-red-950/10 rounded-xl border border-red-900/30 overflow-hidden relative flex items-center justify-center">
                      <div className="absolute top-2 left-2 text-[9px] font-mono text-[#FFD700] bg-yellow-950/40 border border-[#FFD700]/20 rounded px-1.5 py-0.5">SECTOR 02 • ACTIVE</div>
                      
                      {/* Stylized Sector Nodes */}
                      <div className="absolute top-1/3 left-1/2 w-6 h-6 bg-red-650 rounded-full border border-white flex items-center justify-center text-[8px] font-black text-white cursor-pointer shadow hover:scale-125 transition duration-200 animate-bounce">S2</div>
                      <div className="absolute bottom-1/4 left-1/3 w-6 h-6 bg-gray-600 rounded-full border border-gray-400 flex items-center justify-center text-[8px] font-black text-white cursor-pointer shadow">S1</div>
                      <div className="absolute top-1/2 right-1/4 w-6 h-6 bg-gray-600 rounded-full border border-gray-400 flex items-center justify-center text-[8px] font-black text-white cursor-pointer shadow">S4</div>

                      {/* Map backdrop simulation */}
                      <div className="w-3/4 opacity-15 select-none pointer-events-none text-6xl text-center">🗺️🗺️🗺️</div>
                    </div>

                    {/* Sector details box snippet */}
                    <div className="mt-3 p-3 rounded-lg bg-black/60 border border-white/5 font-mono text-[9px] leading-relaxed text-gray-400">
                      📍 <strong>{language === "bn" ? "সেক্টর ২ কমান্ডার:" : "Sector 2 Commander:"}</strong> {language === "bn" ? "মেজর খালেদ মোশাররফ ও এটিএম হায়দার।" : "Major Khaled Mosharraf & ATM Haider."}
                      <br />
                      ⭐ <strong>{language === "bn" ? "অঞ্চল:" : "Areas:"}</strong> {language === "bn" ? "ঢাকা, ফরিদপুর, কুমিল্লা ও নোয়াখালী।" : "Dhaka, Faridpur, Comilla, and parts of Noakhali."}
                    </div>

                  </div>
                </div>

              </div>
            </div>


            {/* AD MODULE 4: MEDISENSE AI MENTOR */}
            <div className={`p-6 md:p-10 rounded-3xl border transition-all duration-500 hover:shadow-[0_0_30px_rgba(193,18,31,0.15)] relative overflow-hidden group ${
              isDark ? "bg-[#080808] border-white/5 hover:border-red-900/60" : "bg-white border-red-100 shadow-sm hover:border-red-300"
            }`} id="ad-feature-ai">
              
              <div className="absolute top-0 right-0 bg-blue-950 text-blue-400 text-[10px] font-mono font-black tracking-widest px-4 py-2 rounded-bl-3xl shadow flex items-center gap-1.5 border-l border-b border-blue-900/30">
                <Bot className="w-3.5 h-3.5 animate-bounce" />
                {language === "bn" ? "এআই মডিউল 🧠" : "AI MODULE 🧠"}
              </div>

              <div className="grid lg:grid-cols-12 gap-8 items-center">
                
                {/* Visual interface */}
                <div className="lg:col-span-5 order-2 lg:order-1 relative flex justify-center">
                  <div className={`w-full max-w-sm rounded-2xl border p-5 shadow-xl relative overflow-hidden backdrop-blur ${
                    isDark ? "bg-[#111111]/90 border-white/10" : "bg-red-50/30 border-red-100"
                  }`}>
                    
                    <div className="flex items-center gap-2 text-[10px] text-blue-400 font-mono mb-3 uppercase">
                      <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-ping" />
                      <span>MEDISENSE SMART CLIENT - ONLINE</span>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 text-[10px] font-mono text-gray-500 self-end max-w-[85%]">
                        {language === "bn" ? "ক্রেবস চক্র (Krebs Cycle) মনে রাখার সহজ উপায় কী?" : "What is the best way to memorize Krebs Cycle intermediates?"}
                      </div>
                      
                      <div className="p-2.5 rounded-lg bg-blue-950/30 border border-blue-500/20 text-[10px] font-mono text-blue-300 self-start max-w-[90%] relative">
                        <div className="absolute -top-1.5 -left-1 text-[8px] bg-blue-600 text-white rounded px-1">AI</div>
                        🧬 <strong>{language === "bn" ? "মেডিসেন্স উত্তর:" : "MediSense Answer:"}</strong>
                        <br />
                        {language === "bn" 
                          ? "'Citric Acid Is Of Course Silly Stupid...'" 
                          : "'Citric Acid Is Of Course Silly Stupid...'"}
                        <ul className="list-disc pl-3 mt-1 text-[9px] text-gray-400">
                          <li>Citric Acid (Citrate)</li>
                          <li>Is (Isocitrate)</li>
                          <li>Of (alpha-Ketoglutarate)</li>
                        </ul>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Description */}
                <div className="lg:col-span-7 order-1 lg:order-2 flex flex-col gap-4">
                  <span className="text-[#C1121F] text-xs font-mono font-black tracking-widest uppercase flex items-center gap-2">
                    <Bot className="w-4 h-4 text-[#C1121F]" /> FEATURE 04 • MEDISENSE AI
                  </span>

                  <h3 className={`text-2xl md:text-4xl font-extrabold uppercase font-display leading-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                    {language === "bn" ? "২৪/৭ ব্যক্তিগত এআই মেডিকেল মেন্টর" : "Your 24/7 Server-Side Medical AI Mentor"}
                  </h3>

                  <p className={`text-sm leading-relaxed ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                    {language === "bn"
                      ? "পড়া মনে রাখতে পারছেন না? কোনো চিন্তা নেই! মেডিসেন্স এআই আপনার ব্যক্তিগত শিক্ষক হিসেবে জটিল বায়োলজি, কেমিস্ট্রি জটিল রিয়াকশন ও ফিজিক্সের ম্যাথমেটিকাল ফর্মুলা পানির মতো বুঝিয়ে দেবে যেকোনো সময় বাংলা ও ইংরেজিতে।"
                      : "Stuck on complex biology pathways or reaction formulas? Simply ping MediSense. The integrated LLM is specifically fine-tuned for medical admission references, creating custom study mnemonics in Bengali instantly!"}
                  </p>

                  <div className="pt-2">
                    <button
                      onClick={() => { playSound("click"); onStart(); }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#C1121F] hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition duration-300 font-display cursor-pointer"
                    >
                      <Bot className="w-4 h-4 text-blue-400 fill-blue-400" />
                      {language === "bn" ? "মেডিসেন্স এআইকে জিজ্ঞাসা করুন 🧠" : "TALK TO MEDISENSE AI"}
                    </button>
                  </div>
                </div>

              </div>
            </div>


            {/* AD MODULE 5: DIVISIONAL WARS */}
            <div className={`p-6 md:p-10 rounded-3xl border transition-all duration-500 hover:shadow-[0_0_30px_rgba(193,18,31,0.15)] relative overflow-hidden group ${
              isDark ? "bg-[#080808] border-white/5 hover:border-red-900/60" : "bg-white border-red-100 shadow-sm hover:border-red-300"
            }`} id="ad-feature-wars">
              
              <div className="absolute top-0 right-0 bg-[#FFD700] text-black text-[10px] font-mono font-black tracking-widest px-4 py-2 rounded-bl-3xl shadow flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5" />
                {language === "bn" ? "বিভাগীয় যুদ্ধ 🔥" : "DIVISION LEAGUES 🔥"}
              </div>

              <div className="grid lg:grid-cols-12 gap-8 items-center">
                
                {/* Description Space */}
                <div className="lg:col-span-7 flex flex-col gap-4">
                  <span className="text-[#C1121F] text-xs font-mono font-black tracking-widest uppercase flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-[#C1121F]" /> FEATURE 05 • DIVISION WARS LEADERS
                  </span>
                  
                  <h3 className={`text-2xl md:text-4xl font-extrabold uppercase font-display leading-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                    {language === "bn" ? "আপনার বিভাগকে নেতৃত্ব দিন এবং র‍্যাংক বাড়ান" : "Climb Divisional Leagues & Defend Your Pride"}
                  </h3>

                  <p className={`text-sm leading-relaxed ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                    {language === "bn"
                      ? "প্রকৃত প্রতিযোগীদের সাথে প্রতিযোগিতা করুন! ঢাকা (Dhaka Titans), সিলেট (Sylhet Strikers) নাকি চট্টগ্রাম (Chittagong Kings)—আইকনিক বিভাগ নির্বাচন করে এমসিকিউ সমাধান করুন। আপনার প্রাপ্ত পয়েন্ট সরাসরি আপনার বিভাগের গ্লোবাল র‍্যাঙ্কিং বৃদ্ধিতে সাহায্য করবে।"
                      : "Choose your geographic military brigade (Dhaka Titans, Chittagong Kings, etc.). Every single correct answer scores territorial points for your division! Compete in real-time, conquer medical territories, and claim ultimate bragging rights!"}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
                    <div className="flex items-center gap-1.5 text-[#FFD700]">
                      <Star className="w-3.5 h-3.5 fill-current" /> {language === "bn" ? "সাপ্তাহিক কাপ" : "Weekly Cups"}
                    </div>
                    <div className="flex items-center gap-1.5 text-blue-400">
                      <Award className="w-3.5 h-3.5" /> {language === "bn" ? "গোল্ড মেডেল" : "Gold Badges"}
                    </div>
                    <div className="flex items-center gap-1.5 text-red-500">
                      <Swords className="w-3.5 h-3.5" /> {language === "bn" ? "টেরিটরি দখল" : "Territory Wins"}
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => { playSound("click"); onStart(); }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#C1121F] hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition duration-300 font-display cursor-pointer"
                    >
                      <Trophy className="w-4 h-4 text-yellow-300" />
                      {language === "bn" ? "বিভাগীয় লিডারবোর্ডে যোগ দিন 🏆" : "VIEW DIVISION LEADERBOARD"}
                    </button>
                  </div>
                </div>

                {/* Simulated visual mockup */}
                <div className="lg:col-span-5 relative flex justify-center">
                  <div className={`w-full max-w-sm rounded-2xl border p-5 shadow-xl relative overflow-hidden backdrop-blur ${
                    isDark ? "bg-[#111111]/90 border-white/10" : "bg-red-50/30 border-red-100"
                  }`}>
                    
                    <div className="flex justify-between items-center text-[10px] text-gray-500 mb-3 font-mono">
                      <span>GLOBAL DIVISION STANDINGS</span>
                      <span className="text-[#FFD700]">LIVE STATS</span>
                    </div>

                    <div className="flex flex-col gap-2 font-mono text-[10px]">
                      
                      <div className="flex justify-between items-center bg-red-950/20 border border-[#C1121F]/30 p-2.5 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">🥇</span>
                          <span className="font-extrabold text-white">DHAKA TITANS</span>
                        </div>
                        <span className="text-[#FFD700] font-bold">144.2K XP 🔥</span>
                      </div>

                      <div className="flex justify-between items-center bg-black/40 border border-white/5 p-2.5 rounded-lg">
                        <div className="flex items-center gap-2 text-gray-400">
                          <span className="text-sm">🥈</span>
                          <span>CHITTAGONG KINGS</span>
                        </div>
                        <span>129.5K XP</span>
                      </div>

                      <div className="flex justify-between items-center bg-black/40 border border-white/5 p-2.5 rounded-lg">
                        <div className="flex items-center gap-2 text-gray-400">
                          <span className="text-sm">🥉</span>
                          <span>SYLHET SHOCKWAVES</span>
                        </div>
                        <span>110.1K XP</span>
                      </div>

                    </div>

                  </div>
                </div>

              </div>
            </div>


            {/* AD MODULE 6: FEED SQUADS (SOCIAL SQUADS) */}
            <div className={`p-6 md:p-10 rounded-3xl border transition-all duration-500 hover:shadow-[0_0_30px_rgba(193,18,31,0.15)] relative overflow-hidden group ${
              isDark ? "bg-[#080808] border-white/5 hover:border-red-900/60" : "bg-white border-red-100 shadow-sm hover:border-red-300"
            }`} id="ad-feature-social">
              
              <div className="absolute top-0 right-0 bg-[#C1121F] text-white text-[10px] font-mono font-black tracking-widest px-4 py-2 rounded-bl-3xl shadow flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                {language === "bn" ? "কমিউনিটি স্টাডি 💬" : "COMMUNITY STUDS 💬"}
              </div>

              <div className="grid lg:grid-cols-12 gap-8 items-center">
                
                {/* Simulated Visual UI */}
                <div className="lg:col-span-5 order-2 lg:order-1 relative flex justify-center">
                  <div className={`w-full max-w-sm rounded-2xl border p-5 shadow-xl relative overflow-hidden backdrop-blur ${
                    isDark ? "bg-[#111111]/90 border-white/10" : "bg-red-50/30 border-red-100"
                  }`}>
                    
                    <div className="flex justify-between items-center text-[10px] text-gray-500 mb-3 font-mono">
                      <span>#SQUAD_CHATS - ANATOMY LAB</span>
                      <span className="text-emerald-400">● 412 ONLINE</span>
                    </div>

                    <div className="flex flex-col gap-2 font-mono text-[9px] mb-3">
                      <div className="p-2 border border-white/5 bg-black/40 rounded-lg">
                        <div className="flex justify-between text-gray-500 mb-1">
                          <span className="font-bold text-red-400">@Sajid_DMC</span>
                          <span>{language === "bn" ? "২ মিনিট আগে" : "2m ago"}</span>
                        </div>
                        <p className="text-white">{language === "bn" ? "আজকে কে রসায়ন দ্বিতীয় পত্রের ৮ নম্বর চ্যাপ্টার শেষ করেছো?" : "Who completed chemistry paper 2 chapter 8 drill today?"}</p>
                      </div>

                      <div className="p-2 border border-white/5 bg-black/40 rounded-lg">
                        <div className="flex justify-between text-gray-500 mb-1">
                          <span className="font-bold text-yellow-400">@Sadia_SSMC</span>
                          <span>{language === "bn" ? "১ মিনিট আগে" : "1m ago"}</span>
                        </div>
                        <p className="text-white">{language === "bn" ? "আমি করেছি! শেষ এমসিকিউ কমব্যাটে +৫০০ গোল্ড টফি বোনাস পেয়েছি!" : "Just finished! Got the 500 gold trophy bonus on my streaks!"}</p>
                      </div>
                    </div>

                    {/* Real-time typing bar mockup */}
                    <div className="p-2 bg-black/80 rounded border border-white/10 flex justify-between items-center text-[9px] font-mono text-gray-500">
                      <span>{language === "bn" ? "প্রশ্নাবলি বা র‍্যাংক শেয়ার করুন..." : "Share a query or post rank..."}</span>
                      <span className="text-[#C1121F] font-bold">SEND</span>
                    </div>

                  </div>
                </div>

                {/* Description Space */}
                <div className="lg:col-span-7 order-1 lg:order-2 flex flex-col gap-4">
                  <span className="text-[#C1121F] text-xs font-mono font-black tracking-widest uppercase flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#C1121F]" /> FEATURE 06 • COMMUNITY SQUAD FEED
                  </span>

                  <h3 className={`text-2xl md:text-4xl font-extrabold uppercase font-display leading-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                    {language === "bn" ? "গ্রুপ স্টাডি এবং পিয়ার টু পিয়ার হেল্প ফোরাম" : "Real-time Peer Study Groups & Concept Discussion"}
                  </h3>

                  <p className={`text-sm leading-relaxed ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                    {language === "bn"
                      ? "কখনোই একাকী বোধ করবেন না! ভর্তি লড়াইয়ের চরম সময়ে সফল প্রার্থীদের সাথে ডিসকাশনে যোগ দিন। স্ক্রিনশট বা প্রশ্ন শেয়ার করে তাৎক্ষণিক সমাধান পান অভিজ্ঞ ভাইয়া ও সহযোদ্ধাদের কাছ থেকে।"
                      : "Never feel isolated in your study journey. Seamlessly share difficult clinical questions, flex your streak records, join live campus forums, and stay updated with peer discussion tracks in real-time."}
                  </p>

                  <div className="pt-2">
                    <button
                      onClick={() => { playSound("click"); onStart(); }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#C1121F] hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition duration-300 font-display cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4" />
                      {language === "bn" ? "সোশ্যাল স্কোয়াডে যুক্ত হোন 💬" : "JOIN THE SOCIAL SQUAD"}
                    </button>
                  </div>
                </div>

              </div>
            </div>


            {/* AD MODULE 7: STREAKS & POMODORO */}
            <div className={`p-6 md:p-10 rounded-3xl border transition-all duration-500 hover:shadow-[0_0_30px_rgba(193,18,31,0.15)] relative overflow-hidden group ${
              isDark ? "bg-[#080808] border-white/5 hover:border-red-900/60" : "bg-white border-red-100 shadow-sm hover:border-red-300"
            }`} id="ad-feature-streaks">
              
              <div className="absolute top-0 right-0 bg-yellow-950 text-[#FFD700] text-[10px] font-mono font-black tracking-widest px-4 py-2 rounded-bl-3xl shadow flex items-center gap-1.5 border-l border-b border-[#FFD700]/30">
                <Flame className="w-3.5 h-3.5 animate-pulse" />
                {language === "bn" ? "ফোকাস থেরাপি 🔥" : "FOCUS THERAPY 🔥"}
              </div>

              <div className="grid lg:grid-cols-12 gap-8 items-center">
                
                {/* Description Space */}
                <div className="lg:col-span-7 flex flex-col gap-4">
                  <span className="text-[#C1121F] text-xs font-mono font-black tracking-widest uppercase flex items-center gap-2">
                    <Flame className="w-4 h-4 text-[#C1121F]" /> FEATURE 07 • SCIENTIFIC POMODORO TIMER
                  </span>
                  
                  <h3 className={`text-2xl md:text-4xl font-extrabold uppercase font-display leading-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                    {language === "bn" ? "পোমোডোরো টাইমার ও এনার্জি পয়েন্ট রিকভারি" : "Deep Focus Loops & Tactical Energy Recovery"}
                  </h3>

                  <p className={`text-sm leading-relaxed ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                    {language === "bn"
                      ? "পড়ায় দীর্ঘ মনোযোগ ধরে রাখার জন্য বৈজ্ঞানিক পোমোডোরো মেকানিজম যুক্ত করা হয়েছে। প্রতিদিন ২৫ মিনিট সর্বোচ্চ পড়াশোনা করুন এবং ৫ মিনিট গভীর নিঃশ্বাস নিয়ে নিজের এনার্জি পয়েন্ট রিচার্জ করে নিন ভর্তি যুদ্ধের পরবর্তী সেশনের জন্য!"
                      : "Maximize retention using custom deep-study workflows. Our tactical 25-minute Pomodoro focus tracks prevent burnout, recover player energy points, build daily streaks, and maximize long-term learning efficiency!"}
                  </p>

                  <div className="pt-2">
                    <button
                      onClick={() => { playSound("click"); onStart(); }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#C1121F] hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition duration-300 font-display cursor-pointer"
                    >
                      <Flame className="w-4 h-4 text-[#FFD700] fill-[#FFD700]" />
                      {language === "bn" ? "ফোকাস টাইমার চালু করুন ⏱️" : "ACTIVATE STUDY FOCUS LOOP"}
                    </button>
                  </div>
                </div>

                {/* Simulated Visual Mockup */}
                <div className="lg:col-span-5 relative flex justify-center">
                  <div className={`w-full max-w-sm rounded-2xl border p-5 shadow-xl relative overflow-hidden backdrop-blur ${
                    isDark ? "bg-[#111111]/90 border-white/10" : "bg-red-50/30 border-red-100"
                  }`}>
                    
                    <div className="flex justify-between items-center text-[10px] text-gray-500 mb-3 font-mono">
                      <span>POMODORO STUDY SYSTEM</span>
                      <span className="text-[#C1121F] animate-pulse">ACTIVE LOOP</span>
                    </div>

                    <div className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-red-950/20 to-black rounded-xl border border-red-900/30">
                      <div className="text-3xl font-mono text-white tracking-widest font-bold font-display">24:59</div>
                      <span className="text-[9px] text-[#FFD700] uppercase font-mono mt-1 tracking-wider">{language === "bn" ? "পড়াশোনা ও সমাধান সেশন" : "FOCUS MODE ACTIVE: MCQ DRAGON"}</span>
                      
                      {/* Energy bar */}
                      <div className="w-3/4 flex items-center gap-2 mt-4">
                        <span className="text-[10px]">⚡</span>
                        <div className="flex-1 bg-black/40 h-1.5 rounded-full overflow-hidden border border-white/5">
                          <div className="bg-[#FFD700] h-full w-[85%]" />
                        </div>
                        <span className="text-[8px] text-gray-550 font-mono">85%</span>
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            </div>

          </div>

        </div>
      </section>

      {/* MEGA HIGH-IMPACT FEATURES COMPREHENSIVE POSTER */}
      <section className="bg-gradient-to-b from-[#0D0D0D] to-[#050505] py-20 px-6 border-y border-white/5 relative overflow-hidden" id="landing-all-features-poster">
        
        {/* Visual design background nodes */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-950/10 rounded-full blur-[160px] pointer-events-none" />
        <div className="absolute -top-12 right-10 w-44 h-44 bg-amber-500/5 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto relative z-10">
          
          {/* Poster Frame Container */}
          <div className="border-2 border-dashed border-[#C1121F]/30 bg-black/80 rounded-3xl p-6 md:p-10 shadow-[0_0_50px_rgba(193,18,31,0.15)] relative overflow-hidden backdrop-blur">
            
            {/* Poster Corner Markers for high premium layout */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#FFD700] rounded-tl-lg pointer-events-none" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#FFD700] rounded-tr-lg pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#FFD700] rounded-bl-lg pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#FFD700] rounded-br-lg pointer-events-none" />
            
            {/* Header Specs Bar */}
            <div className="flex flex-wrap justify-between items-center text-[9px] font-mono text-gray-500 border-b border-white/10 pb-4 mb-8 gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span>SPECIFICATION ID: MB_COMBAT_MANUAL_v2.5</span>
              </div>
              <div className="flex items-center gap-3">
                <span>SYSTEM NODES: 10/10 POWERED</span>
                <span>•</span>
                <span className="text-[#FFD700] font-black uppercase">MEDIBRIDGE OFFICIAL RELEASE Certificate</span>
              </div>
            </div>

            {/* Main Visual Heading inside the Frame */}
            <div className="text-center mb-10 flex flex-col items-center gap-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-950/50 border border-[#FFD700]/30 text-[#FFD700] rounded-full text-[10px] font-mono tracking-widest uppercase font-bold">
                <Award className="w-3.5 h-3.5 text-[#FFD700] animate-bounce" />
                {language === "bn" ? "অফিসিয়াল ফিচার গাইড পোস্টার" : "OFFICIAL ALL-IN-ONE SYSTEM POSTER"}
              </div>
              <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight font-display text-white mt-1">
                {language === "bn" ? (
                  <>
                    মেডিব্রিজ <span className="text-[#C1121F] filter drop-shadow-[0_0_8px_rgba(193,18,31,0.5)]">কমব্যাট ম্যানুয়াল</span>
                  </>
                ) : (
                  <>
                    MEDIBRIDGE <span className="text-[#C1121F] filter drop-shadow-[0_0_8px_rgba(193,18,31,0.5)]">COMBAT MANUAL</span>
                  </>
                )}
              </h2>
              <p className="text-xs md:text-sm text-gray-400 max-w-2xl font-mono uppercase tracking-wide leading-relaxed">
                {language === "bn" 
                  ? "মেডিকেল ভর্তি পরীক্ষার শতভাগ সিলেবাসকে জয় করতে আমাদের সব কিলার ইন্টারেক্টিভ ফিচারস দেখুন এক নজরে" 
                  : "All premium game mechanics engineered to defeat the MAT syllabus unified into a single roadmap"}
              </p>
            </div>

            {/* Poster Bento Grid of All 10 Features */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              
              {/* Feature 1 */}
              <motion.div 
                whileHover={{ scale: 1.03, borderColor: "#C1121F" }}
                className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:shadow-[0_0_15px_rgba(193,18,31,0.1)] transition-all duration-300"
              >
                <div>
                  <div className="w-9 h-9 rounded-xl bg-red-950/30 border border-red-500/20 text-[#C1121F] flex items-center justify-center mb-3">
                    <Target className="w-4.5 h-4.5" />
                  </div>
                  <h4 className="text-xs font-bold text-white uppercase font-display tracking-tight">
                    {language === "bn" ? "১. এমসিকিউ কমব্যাট এরেনা" : "1. MCQ Combat Arena"}
                  </h4>
                  <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                    {language === "bn" 
                      ? "অধ্যায় ভিত্তিক কিলার এমসিকিউ লড়াই, চমৎকার ব্যাখ্যা ও বুকমার্ক সাপোর্ট।" 
                      : "Engage in scientific, chapter-wise battles derived from matriculation syllabus."}
                  </p>
                </div>
                <span className="text-[8px] font-mono text-[#C1121F]/80 uppercase font-bold tracking-widest mt-4 block">
                  +500 XP • STREAK REWARDS
                </span>
              </motion.div>

              {/* Feature 2 */}
              <motion.div 
                whileHover={{ scale: 1.03, borderColor: "#FFD700" }}
                className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:shadow-[0_0_15px_rgba(255,215,0,0.1)] transition-all duration-300"
              >
                <div>
                  <div className="w-9 h-9 rounded-xl bg-yellow-950/30 border border-yellow-500/20 text-[#FFD700] flex items-center justify-center mb-3">
                    <Flame className="w-4.5 h-4.5" />
                  </div>
                  <h4 className="text-xs font-bold text-white uppercase font-display tracking-tight">
                    {language === "bn" ? "২. সারভাইভাল চরম মোড" : "2. Survival Extreme"}
                  </h4>
                  <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                    {language === "bn" 
                      ? "১৫ সেকেন্ড নিশ্বাস বন্ধ রিফ্লেক্স লড়াই, প্লেয়ার হার্টবিট লাইফলাইন।" 
                      : "No lifelines, strictly 15s timer per question with live player HP loss risks."}
                  </p>
                </div>
                <span className="text-[8px] font-mono text-[#FFD700]/80 uppercase font-bold tracking-widest mt-4 block">
                  HP DAMAGE • RAPID DRILLS
                </span>
              </motion.div>

              {/* Feature 3 */}
              <motion.div 
                whileHover={{ scale: 1.03, borderColor: "#3b82f6" }}
                className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:shadow-[0_0_15px_rgba(59,130,246,0.1)] transition-all duration-300"
              >
                <div>
                  <div className="w-9 h-9 rounded-xl bg-blue-950/30 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-3">
                    <Bot className="w-4.5 h-4.5" />
                  </div>
                  <h4 className="text-xs font-bold text-white uppercase font-display tracking-tight">
                    {language === "bn" ? "৩. মেডিসেন্স এআই মেন্টর" : "3. MediSense AI"}
                  </h4>
                  <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                    {language === "bn" 
                      ? "ব্যক্তিগত স্মার্ট এআই শিক্ষক, যেকোনো সময় জটিল ব্যাখ্যা ও নেমোনিক লিড।" 
                      : "Server-side fine-tuned mentor for dynamic bio and chemistry breakdowns."}
                  </p>
                </div>
                <span className="text-[8px] font-mono text-blue-400/80 uppercase font-bold tracking-widest mt-4 block">
                  LLM BRAIN • 24/7 HELPFUL
                </span>
              </motion.div>

              {/* Feature 4 */}
              <motion.div 
                whileHover={{ scale: 1.03, borderColor: "#10b981" }}
                className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:shadow-[0_0_15px_rgba(16,185,129,0.1)] transition-all duration-300"
              >
                <div>
                  <div className="w-9 h-9 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                    <Trophy className="w-4.5 h-4.5" />
                  </div>
                  <h4 className="text-xs font-bold text-white uppercase font-display tracking-tight">
                    {language === "bn" ? "৪. বিভাগীয় যুদ্ধ" : "4. Division Leagues"}
                  </h4>
                  <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                    {language === "bn" 
                      ? "ঢাকা, চট্টগ্রাম সহ ৮ জোনের লড়াই, গ্লোবাল রিজিওনাল রানিং কাপ।" 
                      : "Earn territorial score points for your region. Top regional leaderboards."}
                  </p>
                </div>
                <span className="text-[8px] font-mono text-emerald-400/80 uppercase font-bold tracking-widest mt-4 block">
                  8 REGIONS • STATE CLASH
                </span>
              </motion.div>

              {/* Feature 5 */}
              <motion.div 
                whileHover={{ scale: 1.03, borderColor: "#a855f7" }}
                className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:shadow-[0_0_15px_rgba(168,85,247,0.1)] transition-all duration-300"
              >
                <div>
                  <div className="w-9 h-9 rounded-xl bg-purple-950/30 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-3">
                    <BookOpen className="w-4.5 h-4.5" />
                  </div>
                  <h4 className="text-xs font-bold text-white uppercase font-display tracking-tight">
                    {language === "bn" ? "৫. ১০ মার্কস ইংলিশ প্লে" : "5. MAT English Play"}
                  </h4>
                  <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                    {language === "bn" 
                      ? "ফ্ল্যাশ-কার্ড থেরাপি, স্পেলিং ব্লিৎজ ও কিলার গ্রামার স্নাইপার।" 
                      : "Master prepositions, vocab, and spelling errors via mnemonics and clocks."}
                  </p>
                </div>
                <span className="text-[8px] font-mono text-purple-400/80 uppercase font-bold tracking-widest mt-4 block">
                  10 VITAL MARKS SECURED
                </span>
              </motion.div>

              {/* Feature 6 */}
              <motion.div 
                whileHover={{ scale: 1.03, borderColor: "#f97316" }}
                className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:shadow-[0_0_15px_rgba(249,115,22,0.1)] transition-all duration-300"
              >
                <div>
                  <div className="w-9 h-9 rounded-xl bg-orange-950/30 border border-orange-500/20 text-orange-400 flex items-center justify-center mb-3">
                    <Map className="w-4.5 h-4.5" />
                  </div>
                  <h4 className="text-xs font-bold text-white uppercase font-display tracking-tight">
                    {language === "bn" ? "৬. ১০ মার্কস জিকে ম্যাপ" : "6. Bangladesh GK Map"}
                  </h4>
                  <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                    {language === "bn" 
                      ? "মুক্তিযুদ্ধের ১১টি রণক্ষেত্র মানচিত্র ও বীরশ্রেষ্ঠদের গৌরবময় ইতিহাস।" 
                      : "Explore clickable geographic sector points and liberation war timelines."}
                  </p>
                </div>
                <span className="text-[8px] font-mono text-orange-400/80 uppercase font-bold tracking-widest mt-4 block">
                  1971 LORE • 11 SECTORS
                </span>
              </motion.div>

              {/* Feature 7 */}
              <motion.div 
                whileHover={{ scale: 1.03, borderColor: "#38bdf8" }}
                className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:shadow-[0_0_15px_rgba(56,189,248,0.1)] transition-all duration-300"
              >
                <div>
                  <div className="w-9 h-9 rounded-xl bg-sky-950/30 border border-sky-500/20 text-sky-400 flex items-center justify-center mb-3">
                    <MessageSquare className="w-4.5 h-4.5" />
                  </div>
                  <h4 className="text-xs font-bold text-white uppercase font-display tracking-tight">
                    {language === "bn" ? "৭. সোশ্যাল স্কোয়াড" : "7. Social Squad Feed"}
                  </h4>
                  <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                    {language === "bn" 
                      ? "পিয়ার টু পিয়ার ফোরাম, রিয়েল-টাইম প্রশ্ন শেয়ারিং ও ফ্রেন্ডস ট্র্যাক।" 
                      : "Keep up with fellow aspirants, share complex queries and compare ranks."}
                  </p>
                </div>
                <span className="text-[8px] font-mono text-sky-400/80 uppercase font-bold tracking-widest mt-4 block">
                  FORUM DISCUSS • REAL-TIME
                </span>
              </motion.div>

              {/* Feature 8 */}
              <motion.div 
                whileHover={{ scale: 1.03, borderColor: "#f43f5e" }}
                className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:shadow-[0_0_15px_rgba(244,63,94,0.1)] transition-all duration-300"
              >
                <div>
                  <div className="w-9 h-9 rounded-xl bg-rose-950/30 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
                    <Activity className="w-4.5 h-4.5" />
                  </div>
                  <h4 className="text-xs font-bold text-white uppercase font-display tracking-tight">
                    {language === "bn" ? "৮. পোমোডোরো ফোকাস লুপ" : "8. Pomodoro Focus"}
                  </h4>
                  <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                    {language === "bn" 
                      ? "২৫মি. স্টাডি / ৫মি. ব্রিদিং লুপ যা প্লেয়ার রিয়েল এনার্জি রিচার্জ করায়।" 
                      : "Recover critical energy points on study sprints to keep grinding MCQs."}
                  </p>
                </div>
                <span className="text-[8px] font-mono text-rose-400/80 uppercase font-bold tracking-widest mt-4 block">
                  ENERGY RECOVERY BOOSTS
                </span>
              </motion.div>

              {/* Feature 9 */}
              <motion.div 
                whileHover={{ scale: 1.03, borderColor: "#10b981" }}
                className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:shadow-[0_0_15px_rgba(16,185,129,0.1)] transition-all duration-300"
              >
                <div>
                  <div className="w-9 h-9 rounded-xl bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                    <Sparkles className="w-4.5 h-4.5" />
                  </div>
                  <h4 className="text-xs font-bold text-white uppercase font-display tracking-tight">
                    {language === "bn" ? "৯. ডেইলি কোয়েস্ট ও ক্লাইম" : "9. Quests & Claim All"}
                  </h4>
                  <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                    {language === "bn" 
                      ? "ডেইলি কোয়েস্ট মিশন শেষ করে এক ক্লিকে সব রিওয়ার্ড সমন্বিত সংগ্রহ।" 
                      : "Complete daily active combat trials and leverage Claim All buttons to bulk-boost."}
                  </p>
                </div>
                <span className="text-[8px] font-mono text-emerald-400/80 uppercase font-bold tracking-widest mt-4 block">
                  COINS & XP BULK ACTIONS
                </span>
              </motion.div>

              {/* Feature 10 */}
              <motion.div 
                whileHover={{ scale: 1.03, borderColor: "#FFD700" }}
                className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:shadow-[0_0_15px_rgba(255,215,0,0.1)] transition-all duration-300"
              >
                <div>
                  <div className="w-9 h-9 rounded-xl bg-amber-950/40 border border-[#FFD700]/20 text-[#FFD700] flex items-center justify-center mb-3">
                    <Shield className="w-4.5 h-4.5" />
                  </div>
                  <h4 className="text-xs font-bold text-white uppercase font-display tracking-tight">
                    {language === "bn" ? "১০. অ্যাডমিন কমান্ড সেন্টার" : "10. Admin Command HQ"}
                  </h4>
                  <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                    {language === "bn" 
                      ? "সুপারঅ্যাডমিন লাইভ কন্ট্রোল, আবহ সঙ্গীত সিঙ্ক ও গ্লোবাল শিক্ষার্থী ভলিউম পুশ।" 
                      : "Synchronous background tracks curated by real-time master admins."}
                  </p>
                </div>
                <span className="text-[8px] font-mono text-[#FFD700]/80 uppercase font-bold tracking-widest mt-4 block">
                  REAL-TIME SYNC • MASTER SEC
                </span>
              </motion.div>

            </div>

            {/* Poster Blueprint Footer Decoration */}
            <div className="flex flex-col md:flex-row justify-between items-center text-[9px] font-mono text-gray-500 border-t border-white/10 pt-5 mt-8 gap-4">
              <div className="flex items-center gap-2">
                <span>© MEDIBRIDGE GAMING SYSTEMS INC. ALL SECURED.</span>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => { playSound("click"); onStart(); }}
                  className="px-4 py-2 bg-[#C1121F] hover:bg-red-700 text-white font-extrabold rounded-xl uppercase tracking-wider text-[9px] font-mono border border-red-950 cursor-pointer"
                >
                  {language === "bn" ? "অ্যাক্টিভেট অল মডিউলস ⚡" : "ACTIVATE ALL SYSTEMS NOW ⚡"}
                </button>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* OUR HEROES / HALL OF FAME SHOWCASE */}
      <OurHeroesSection language={language} theme={theme} />

      {/* Gamified Map Progression Track */}
      <section className="bg-[#0A0A0A] py-16 px-6 relative border-t border-white/5 overflow-hidden" id="landing-journey-roadmap">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          
          <div>
            <span className="text-[#C1121F] font-mono text-xs uppercase tracking-widest font-black block">
              {language === "bn" ? "শিক্ষার্থী প্রগ্রেসন রোডম্যাপ" : "Aspirant Lifecycle Map"}
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold uppercase mt-2 mb-4 font-display">
              {t.landingWhiteCoatHeading}
            </h2>
            <div className="w-12 h-1 bg-[#FFD700] mb-5"></div>
            <p className="text-gray-400 mb-6 text-sm md:text-base leading-relaxed">
              {t.landingWhiteCoatDesc}
            </p>
            
            <div className="flex flex-col gap-4">
              
              <div className="flex items-center gap-4 bg-[#111111]/90 p-3 rounded-xl border border-white/5">
                <span className="text-2xl">🎓</span>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-black font-mono block">{t.stage01Sub}</span>
                  <span className="font-extrabold text-white text-sm uppercase font-display">{t.stage01Name}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-[#111111]/90 p-3 rounded-xl border border-white/5">
                <span className="text-2xl">⚡</span>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-black font-mono block">{t.stage02Sub}</span>
                  <span className="font-extrabold text-white text-sm uppercase font-display">{t.stage02Name}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 border border-[#C1121F]/30 bg-[#C1121F]/10 p-3 rounded-xl shadow-[0_0_15px_rgba(193,18,31,0.15)]">
                <span className="text-2xl animate-bounce">🥼</span>
                <div>
                  <span className="text-[10px] text-[#FFD700] uppercase font-black font-mono block">{t.stage03Sub}</span>
                  <span className="font-extrabold text-[#FFD700] text-sm uppercase font-display">{t.stage03Name}</span>
                </div>
              </div>

            </div>
          </div>

          {/* Student Gamer League Ranks */}
          <div className="bg-[#111111]/90 p-6 border border-white/10 rounded-2xl relative">
            <div className="absolute top-4 right-4 bg-red-950/40 text-[#C1121F] text-[9px] px-2.5 py-1 rounded font-mono font-bold uppercase border border-[#C1121F]/20">
              {language === "bn" ? "প্রোফাইল র্যাংকসমূহ " : "Progression HUD"}
            </div>
            
            <h3 className="font-extrabold uppercase text-lg mb-5 font-display">{t.landingGamerRanksHeading}</h3>
            
            <div className="flex flex-col gap-3.5 font-mono">
              {[
                { rank: t.gamerRank1Name, level: "Lvl 1 - 5", desc: t.gamerRank1Desc },
                { rank: t.gamerRank2Name, level: "Lvl 10 - 20", desc: t.gamerRank2Desc },
                { rank: t.gamerRank3Name, level: "Lvl 35+", desc: t.gamerRank3Desc },
                { rank: t.gamerRank4Name, level: t.topPercent, desc: t.gamerRank4Desc }
              ].map((r, i) => (
                <div key={i} className="flex justify-between items-center bg-[#0D0D0D] p-3 rounded-xl border border-white/5 hover:border-[#C1121F]/30 transition duration-300">
                  <div>
                    <p className="text-xs font-bold text-white uppercase font-display">{r.rank}</p>
                    <p className="text-[10px] text-gray-550 mt-1 leading-normal">{r.desc}</p>
                  </div>
                  <span className="text-[#FFD700] text-[10px] font-black shrink-0 ml-3 bg-yellow-950/20 py-1 px-2 border border-[#FFD700]/10 rounded font-mono uppercase">{r.level}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#090909] py-12 px-6 border-t border-white/10" id="landing-footer">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-8 border-b border-white/5">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🧬🛡️</span>
              <div>
                <span className="font-extrabold text-base tracking-widest text-white">MEDI<span className="text-[#C1121F]">BRIDGE</span> ACADEMY</span>
                <span className="text-[9px] block text-gray-500 font-mono mt-0.5 uppercase">Train like a Gamer, Think like a Medicalian.</span>
              </div>
            </div>

            {/* Official Contact & Social Media Links */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Official Email */}
              <a
                href="mailto:medibridgeedu@gmail.com"
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-red-500/40 text-gray-300 hover:text-white transition duration-200 text-xs font-mono group"
              >
                <div className="w-6 h-6 rounded-lg bg-red-950/60 border border-red-500/30 flex items-center justify-center text-red-400 group-hover:text-red-300">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <span>medibridgeedu@gmail.com</span>
              </a>

              {/* Official Facebook Page */}
              <a
                href="https://facebook.com/medibridgeacademy"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1877F2]/10 hover:bg-[#1877F2]/20 border border-[#1877F2]/30 hover:border-[#1877F2]/60 text-sky-200 hover:text-white transition duration-200 text-xs font-mono group"
              >
                <div className="w-6 h-6 rounded-lg bg-[#1877F2]/30 border border-[#1877F2]/50 flex items-center justify-center text-sky-300 group-hover:text-white">
                  <Facebook className="w-3.5 h-3.5" />
                </div>
                <div className="text-left">
                  <span className="text-[10px] text-sky-400 block font-bold leading-tight">FB Page:</span>
                  <span className="font-bold text-white">Medibridge Academy</span>
                </div>
              </a>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-mono text-gray-500">
            <span>© 2026 MediBridge Academy • All rights reserved.</span>
            <span className="text-[11px] text-gray-400 text-center md:text-right max-w-xl leading-relaxed">
              {t.landingFooterNote}
            </span>
          </div>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* 📖 LANDING PAGE COURSE PREVIEW & DETAILS MODAL (BEFORE LOGIN) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedCoursePreview && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-hidden">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[#111111] border border-white/15 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 border-b border-white/10 shrink-0 bg-[#151515]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#C1121F]/20 border border-[#C1121F]/40 flex items-center justify-center text-[#FFD700] shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-[#FFD700] uppercase tracking-wider block">
                      {selectedCoursePreview.duration || "Medical Admission Batch"}
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-white font-display uppercase truncate max-w-md sm:max-w-xl">
                      {selectedCoursePreview.title}
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedCoursePreview(null)}
                  className="text-gray-400 hover:text-white p-2 rounded-xl bg-white/5 hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
                {/* Clean Banner / Thumbnail (No text overlay) */}
                <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/60 shadow-lg">
                  <img
                    src={selectedCoursePreview.banner || selectedCoursePreview.thumbnail}
                    alt={selectedCoursePreview.title}
                    className="w-full h-48 sm:h-64 object-cover"
                  />
                </div>

                {/* Pricing & Key Metrics Row */}
                <div className="bg-black/50 p-4 sm:p-5 rounded-2xl border border-white/10 flex flex-wrap items-center justify-between gap-4 font-mono">
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">কোর্স ফি (Enrollment Fee)</span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-2xl font-black text-[#FFD700]">
                        ৳{selectedCoursePreview.discountedPrice.toLocaleString()}
                      </span>
                      {selectedCoursePreview.originalPrice > selectedCoursePreview.discountedPrice && (
                        <span className="text-xs text-gray-500 line-through">
                          ৳{selectedCoursePreview.originalPrice.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <div className="text-center bg-white/5 px-3 py-2 rounded-xl border border-white/5">
                      <span className="text-gray-400 text-[10px] block uppercase">মডেল টেস্ট</span>
                      <span className="text-white font-bold text-sm">{selectedCoursePreview.totalExams || 50}+ টি</span>
                    </div>
                    <div className="text-center bg-white/5 px-3 py-2 rounded-xl border border-white/5">
                      <span className="text-gray-400 text-[10px] block uppercase">লাইভ ক্লাস</span>
                      <span className="text-white font-bold text-sm">{selectedCoursePreview.totalClasses || 40}+ টি</span>
                    </div>
                    <div className="text-center bg-white/5 px-3 py-2 rounded-xl border border-white/5">
                      <span className="text-gray-400 text-[10px] block uppercase">লেকচার শিট</span>
                      <span className="text-white font-bold text-sm">{selectedCoursePreview.totalMaterials || 80}+ টি</span>
                    </div>
                  </div>
                </div>

                {/* Course Overview Description */}
                <div className="space-y-2">
                  <h4 className="text-xs font-mono font-bold text-[#FFD700] uppercase">
                    {language === "bn" ? "কোর্স ওভারভিউ ও বিস্তারিত বিবরণ:" : "Course Overview:"}
                  </h4>
                  <p className="text-xs sm:text-sm text-gray-300 leading-relaxed bg-black/40 p-4 rounded-xl border border-white/5">
                    {selectedCoursePreview.fullDescription || selectedCoursePreview.shortDescription}
                  </p>
                </div>

                {/* Faculty & Mentor */}
                <div className="space-y-2">
                  <h4 className="text-xs font-mono font-bold text-[#FFD700] uppercase">
                    {language === "bn" ? "কোর্স ইনস্ট্রাক্টর ও মেন্টর:" : "Faculty & Mentors:"}
                  </h4>
                  <div className="bg-black/40 p-4 rounded-xl border border-white/5 flex items-center gap-4">
                    <img
                      src={selectedCoursePreview.instructorAvatar || "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=120&auto=format&fit=crop&q=60"}
                      alt={selectedCoursePreview.instructorName}
                      className="w-14 h-14 rounded-2xl border-2 border-[#C1121F] object-cover shrink-0"
                    />
                    <div>
                      <span className="text-sm font-bold text-white block">
                        {selectedCoursePreview.instructorName}
                      </span>
                      <span className="text-xs text-gray-400 font-mono block">
                        {selectedCoursePreview.instructorTitle}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono mt-0.5 inline-block">
                        ✓ Verified Medical Lead Instructor
                      </span>
                    </div>
                  </div>
                </div>

                {/* Features List */}
                {selectedCoursePreview.features && Array.isArray(selectedCoursePreview.features) && selectedCoursePreview.features.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-mono font-bold text-[#FFD700] uppercase">
                      {language === "bn" ? "ব্যাচের বিশেষ সুবিধাসমূহ:" : "Key Batch Features:"}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedCoursePreview.features.map((feat, fIdx) => (
                        <div key={fIdx} className="p-3 bg-black/40 rounded-xl border border-white/5 flex items-start gap-2.5 text-xs text-gray-200">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Exam & Class Schedule Info */}
                {(selectedCoursePreview.examInfo || selectedCoursePreview.classInfo) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                    {selectedCoursePreview.examInfo && (
                      <div className="p-3.5 bg-black/40 rounded-xl border border-white/5 space-y-1">
                        <span className="text-[10px] font-bold text-[#FFD700] uppercase block">📅 এক্সাম শিডিউল</span>
                        <p className="text-gray-300 text-[11px]">{selectedCoursePreview.examInfo}</p>
                      </div>
                    )}
                    {selectedCoursePreview.classInfo && (
                      <div className="p-3.5 bg-black/40 rounded-xl border border-white/5 space-y-1">
                        <span className="text-[10px] font-bold text-blue-400 uppercase block">🎥 ক্লাস শিডিউল</span>
                        <p className="text-gray-300 text-[11px]">{selectedCoursePreview.classInfo}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Free Demo Tasters in Preview Modal */}
                {(isDemoClassEnabled(selectedCoursePreview) || isDemoExamEnabled(selectedCoursePreview)) && (
                  <div className="p-4 bg-gradient-to-r from-red-950/30 to-amber-950/30 border border-white/10 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#FFD700]">
                      <Sparkles className="w-4 h-4 text-[#FFD700]" />
                      <span>{language === "bn" ? "ফ্রি ট্রায়াল ও ডেমো সুযোগ:" : "Free Trial & Demos Available:"}</span>
                    </div>

                    <div className="flex flex-wrap gap-2.5">
                      {isDemoExamEnabled(selectedCoursePreview) && (
                        <button
                          type="button"
                          onClick={() => {
                            playSound("click");
                            setDemoExamModalCourse(selectedCoursePreview);
                          }}
                          className="px-4 py-2 bg-amber-950/60 hover:bg-amber-900 border border-amber-500/50 text-amber-200 hover:text-white text-xs font-mono font-bold rounded-xl transition flex items-center gap-2 cursor-pointer"
                        >
                          <Zap className="w-4 h-4 text-amber-400" />
                          <span>{language === "bn" ? "📝 ফ্রি ডেমো এক্সাম" : "📝 Free Demo Exam"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Fixed Footer CTA */}
              <div className="p-4 sm:p-5 border-t border-white/10 bg-[#151515] flex items-center justify-between gap-3 shrink-0">
                <div className="font-mono">
                  <span className="text-[10px] text-gray-400 uppercase block">টোটাল পেমেন্ট</span>
                  <span className="text-xl font-black text-[#FFD700]">৳{selectedCoursePreview.discountedPrice.toLocaleString()}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const c = selectedCoursePreview;
                      setSelectedCoursePreview(null);
                      playSound("click");
                      if (onSelectCourse && c) {
                        onSelectCourse(c);
                      }
                    }}
                    className="px-3.5 py-2.5 bg-white/10 hover:bg-[#FFD700]/20 text-[#FFD700] text-xs font-mono font-bold rounded-xl transition flex items-center gap-1.5 border border-[#FFD700]/30 cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{language === "bn" ? "কোর্স পেজ" : "Full Page"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedCoursePreview(null)}
                    className="px-3.5 py-2.5 bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-mono rounded-xl transition cursor-pointer"
                  >
                    Close
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const c = selectedCoursePreview;
                      setSelectedCoursePreview(null);
                      playSound("click");
                      if (onEnrollCourse && c) {
                        onEnrollCourse(c);
                      } else {
                        onLoginClick();
                      }
                    }}
                    className="px-5 py-2.5 bg-[#C1121F] hover:bg-red-700 active:scale-95 text-white font-mono font-bold text-xs uppercase rounded-xl transition flex items-center gap-2 shadow-[0_0_15px_rgba(193,18,31,0.4)] cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-[#FFD700]" />
                    <span>{language === "bn" ? "ভর্তি হতে সাইন আপ / লগইন করুন" : "Sign Up to Enroll"}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Free Demo Exam CBT Modal for Landing Page */}
        {demoExamModalCourse && (
          <FreeDemoExamModal
            course={demoExamModalCourse}
            language={language}
            theme={theme}
            onClose={() => setDemoExamModalCourse(null)}
            onEnrollNow={() => {
              setDemoExamModalCourse(null);
              onLoginClick();
            }}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
