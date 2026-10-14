import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { UserProfile } from "../types";
import { playSound } from "../audio";
import {
  BookOpen,
  CheckCircle2,
  Circle,
  TrendingUp,
  Award,
  Sparkles,
  ChevronRight,
  Bookmark,
  Calendar,
  AlertCircle
} from "lucide-react";

interface PreparationRoadmapProps {
  user: UserProfile;
  onProfileUpdate: (updated: Partial<UserProfile>) => void;
  language?: "bn" | "en";
  theme?: "light" | "dark";
}

interface Chapter {
  id: string;
  nameBn: string;
  nameEn: string;
  paper?: 1 | 2;
  highYieldPoints?: string[];
}

interface SubjectRoadmap {
  id: "Biology" | "Chemistry" | "Physics" | "English" | "GK";
  nameBn: string;
  nameEn: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  chapters: Chapter[];
}

const ROADMAP_DATA: SubjectRoadmap[] = [
  {
    id: "Biology",
    nameBn: "জীববিজ্ঞান",
    nameEn: "Biology",
    icon: "🧬",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
    chapters: [
      { id: "bio_1_1", nameBn: "কোষ ও এর গঠন", nameEn: "Cell & its Structure", paper: 1, highYieldPoints: ["DNA ডাবল হেলিক্স", "প্লাস্টিড ও মাইটোকন্ড্রিয়া", "কোষ প্রাচীর ও কোষ ঝিল্লি"] },
      { id: "bio_1_2", nameBn: "কোষ বিভাজন", nameEn: "Cell Division", paper: 1, highYieldPoints: ["মাইটোসিসের ধাপসমূহ", "মায়োসিস-১ ক্রসিং ওভার", "কায়াজমা ও বাইভ্যালেন্ট"] },
      { id: "bio_1_3", nameBn: "কোষ রসায়ন", nameEn: "Cell Chemistry", paper: 1, highYieldPoints: ["শর্করা ও প্রোটিন গঠন", "এনজাইম ও লক-অ্যান্ড-কি মডেল", "লিপিড শ্রেণীবিভাগ"] },
      { id: "bio_1_4", nameBn: "অণুজীব", nameEn: "Microorganisms", paper: 1, highYieldPoints: ["ভাইরাস ও ব্যাকটেরিয়া", "ম্যালেরিয়া পরজীবী জীবনচক্র", "টি-২ ফাজ গঠন"] },
      { id: "bio_1_7", nameBn: "শৈবাল ও ছত্রাক", nameEn: "Algae & Fungi", paper: 1, highYieldPoints: ["শৈবালের বৈশিষ্ট্য", "ছত্রাকের গঠন ও প্রজনন", "লাইকেন সহাবস্থান"] },
      { id: "bio_1_9", nameBn: "উদ্ভিদ শারীরতত্ত্ব", nameEn: "Plant Physiology", paper: 1, highYieldPoints: ["সালোকসংশ্লেষণ C3 C4 চক্র", "সবাত ও অবাত শ্বসন", "খনিজ লবণ শোষণ"] },
      { id: "bio_1_11", nameBn: "জীবপ্রযুক্তি", nameEn: "Biotechnology", paper: 1, highYieldPoints: ["রিকম্বিন্যান্ট DNA প্রযুক্তি", "টিস্যু কালচার", "প্লাজমিড ভেক্টর"] },
      { id: "bio_2_1", nameBn: "প্রাণীর বিভিন্নতা ও শ্রেণীবিন্যাস", nameEn: "Animal Diversity", paper: 2, highYieldPoints: ["শ্রেণীবিন্যাসের ভিত্তি", "নন-কর্ডাটা ও কর্ডাটা পর্বসমূহ", "প্রতিসাম্যতা"] },
      { id: "bio_2_2", nameBn: "প্রাণী পরিচিতি", nameEn: "Animal Types (Hydra, Grasshopper)", paper: 2, highYieldPoints: ["হাইড্রার নেমাটোসিস্ট ও এপিডার্মিস", "ঘাসফড়িংয়ের রক্ত সংবহন", "রুই মাছের শ্বসনতন্ত্র"] },
      { id: "bio_2_3", nameBn: "পরিপাক ও শোষণ", nameEn: "Digestion & Absorption", paper: 2, highYieldPoints: ["পাকস্থলী ও ক্ষুদ্রান্ত্রে পরিপাক", "যকৃতের কাজ ও অগ্ন্যাশয়", "হরমোন নিয়ন্ত্রণ"] },
      { id: "bio_2_4", nameBn: "রক্ত ও সঞ্চালন", nameEn: "Blood & Circulation", paper: 2, highYieldPoints: ["রক্ত তঞ্চন ফ্যাক্টর", "হৃদপিণ্ডের রক্ত সঞ্চালন চক্র", "জাংশনাল টিস্যু"] },
      { id: "bio_2_5", nameBn: "শ্বসন ও শ্বাসক্রিয়া", nameEn: "Breathing & Respiration", paper: 2, highYieldPoints: ["ফুসফুসের অ্যালভিওলাস", "অক্সিজেন ও CO2 পরিবহন", "শ্বসন রোগসমূহ"] },
      { id: "bio_2_8", nameBn: "সমন্বয় ও নিয়ন্ত্রণ (স্নায়ুতন্ত্র)", nameEn: "Coordination & Control", paper: 2, highYieldPoints: ["মস্তিষ্কের অংশ ও কাজ", "করোটিক স্নায়ু ১২ জোড়া", "চোখ ও কানের গঠন"] },
      { id: "bio_2_11", nameBn: "জিনتত্ত্ব ও বিবর্তন", nameEn: "Genetics & Evolution", paper: 2, highYieldPoints: ["মেন্ডেলের সূত্র ও ব্যতিক্রম", "লিঙ্গ নির্ধারণ নীতি", "ডারউইনের বিবর্তন তত্ত্ব"] },
    ]
  },
  {
    id: "Chemistry",
    nameBn: "রসায়ন",
    nameEn: "Chemistry",
    icon: "🧪",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    chapters: [
      { id: "chem_1_1", nameBn: "ল্যাবরেটরির নিরাপদ ব্যবহার", nameEn: "Safe Use of Laboratory", paper: 1, highYieldPoints: ["গ্লাস সামগ্রী পরিষ্কারকরণ", "বিকারক ও প্রাইমারী স্ট্যান্ডার্ড", "ব্যালেন্স ও মেজারিং সিলিন্ডার"] },
      { id: "chem_1_2", nameBn: "গুণগত রসায়ন", nameEn: "Qualitative Chemistry", paper: 1, highYieldPoints: ["বোর পরমাণু মডেল", "কোয়ান্টাম সংখ্যা চার প্রকার", "আউফবাউ, হুন্ড ও পাউলি নীতি", "দ্রাব্যতা ও দ্রাব্যতা গুণফল (Ksp)"] },
      { id: "chem_1_3", nameBn: "মৌলের পর্যায়বৃত্ত ধর্ম ও বন্ধন", nameEn: "Periodic Properties & Bonds", paper: 1, highYieldPoints: ["ইলেকট্রন আসক্তি ও আয়নীকরণ বিভব", "সংকরায়ন (Sp3, Sp2, Sp)", "ফাযানের নীতি"] },
      { id: "chem_1_4", nameBn: "রাসায়নিক পরিবর্তন", nameEn: "Chemical Changes", paper: 1, highYieldPoints: ["লা শাতেলীয় নীতি", "বাফার দ্রবণ ও পিএইচ (pH)", "কেপি ও কেসি (Kp & Kc)"] },
      { id: "chem_2_1", nameBn: "পরিবেশ রসায়ন", nameEn: "Environmental Chemistry", paper: 2, highYieldPoints: ["বয়েল ও চার্লসের সূত্র", "আদর্শ ও বাস্তব গ্যাস", "এসিড বৃষ্টি ও BOD/COD"] },
      { id: "chem_2_2", nameBn: "জৈব রসায়ন", nameEn: "Organic Chemistry", paper: 2, highYieldPoints: ["সমবায়তা ও শ্রেণীবিভাগ", "নিউক্লিওফিলিক ও ইলেকট্রোফিলিক বিকারক", "মার্কোনিকভ নিয়ম ও ওজোনালাইসিস", "লুকাশ বিকারক ও পরীক্ষা"] },
      { id: "chem_2_3", nameBn: "পরিমাণগত রসায়ন", nameEn: "Quantitative Chemistry", paper: 2, highYieldPoints: ["মোলারিটি ও পিপিএম (PPM)", "অক্সিজেন জারণ-বিজারণ ব্যালেন্স", "নির্দেশক ও টাইট্রেশন"] },
      { id: "chem_2_4", nameBn: "তড়িৎ রসায়ন", nameEn: "Electrochemistry", paper: 2, highYieldPoints: ["ফ্যারাডের সূত্র", "তড়িৎ রাসায়নিক কোষ ও EMF", "নেবস্ট সমীকরণ"] },
    ]
  },
  {
    id: "Physics",
    nameBn: "পদার্থবিজ্ঞান",
    nameEn: "Physics",
    icon: "⚡",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    chapters: [
      { id: "phys_1_2", nameBn: "ভেক্টর", nameEn: "Vector", paper: 1, highYieldPoints: ["ভেক্টর ডট ও ক্রস গুণফল", "লব্ধি বল ও নদী-নৌকা প্রব্লেম", "গ্র্যাডিয়েন্ট, ডাইভারজেন্স ও কার্ল"] },
      { id: "phys_1_4", nameBn: "নিউটনীয় বলবিদ্যা", nameEn: "Newtonian Mechanics", paper: 1, highYieldPoints: ["কৌণিক ভরবেগ ও জড়তার ভ্রামক", "রাস্তার ব্যাংকিং কোণ", "স্থিতিস্থাপক সংঘর্ষ ও রকেট নীতি"] },
      { id: "phys_1_5", nameBn: "কাজ, শক্তি ও ক্ষমতা", nameEn: "Work, Energy & Power", paper: 1, highYieldPoints: ["সংরক্ষণশীল বল ও কর্মদক্ষতা", "মহাকর্ষীয় বিভব ও গতিশক্তি"] },
      { id: "phys_1_6", nameBn: "মহাকর্ষ ও অভিকর্ষ", nameEn: "Gravitation & Gravity", paper: 1, highYieldPoints: ["অভিকর্ষজ ত্বরণ 'g' এর পরিবর্তন", "মুক্তিবেগ (Escape Velocity)", "কেপলারের সূত্র ও উপগ্রহ"] },
      { id: "phys_1_8", nameBn: "পর্যাবৃত্ত গতি", nameEn: "Periodic Motion", paper: 1, highYieldPoints: ["সরল দোলক ও সেকেন্ড দোলক", "স্প্রিংয়ের বল ধ্রুবক", "সরল ছন্দিত স্পন্দন শক্তি"] },
      { id: "phys_1_10", nameBn: "আদর্শ গ্যাস ও গতিতত্ত্ব", nameEn: "Ideal Gas & Kinetic Theory", paper: 1, highYieldPoints: ["আপেক্ষিক আর্দ্রতা ও শিশিরাঙ্ক", "গ্যাসের গড় বর্গবেগ (RMS)", "গড় মুক্ত পথ"] },
      { id: "phys_2_1", nameBn: "তাপগতিবিদ্যা", nameEn: "Thermodynamics", paper: 2, highYieldPoints: ["তাপগতিবিদ্যার ১ম ও ২য় সূত্র", "কার্নো ইঞ্জিন ও এন্ট্রপি", "সমোষ্ণ ও রুদ্ধতাপীয় প্রক্রিয়া"] },
      { id: "phys_2_2", nameBn: "স্থির তড়িৎ", nameEn: "Static Electricity", paper: 2, highYieldPoints: ["কুলম্বের সূত্র ও তড়িৎ প্রাবল্য", "ধারকত্ব ও সমান্তরাল পাত ধারক", "তড়িৎ দ্বিমেরু"] },
      { id: "phys_2_3", nameBn: "চল তড়িৎ", nameEn: "Current Electricity", paper: 2, highYieldPoints: ["ওহমের সূত্র ও রোধের উষ্ণতা সহগ", "শার্ট ও কির্শফের সূত্রসমূহ", "হুইটস্টোন ব্রিজ ও মিটার ব্রিজ"] },
      { id: "phys_2_8", nameBn: "আধুনিক পদার্থবিজ্ঞানের সূচনা", nameEn: "Introduction to Modern Physics", paper: 2, highYieldPoints: ["দৈর্ঘ্য সংকোচন ও কাল দীর্ঘায়ন", "আলোক তড়িৎ ক্রিয়া", "আইনস্টাইনের আপেক্ষিকতা সমীকরণ"] },
      { id: "phys_2_10", nameBn: "সেমিকন্ডাক্টর ও ইলেকট্রনিক্স", nameEn: "Semiconductor & Electronics", paper: 2, highYieldPoints: ["P-N জংশন ও ডায়োড রেকটিফায়ার", "ট্রানজিস্টর ও অ্যামপ্লিফায়ার", "লজিক গেটস (NAND, NOR)"] },
    ]
  },
  {
    id: "English",
    nameBn: "ইংরেজি",
    nameEn: "English",
    icon: "📖",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/20",
    chapters: [
      { id: "eng_1", nameBn: "ব্যাকরণ পরিচিতি ও পার্টস অফ স্পিচ", nameEn: "Parts of Speech & Grammar Essentials", highYieldPoints: ["Identify Noun, Pronoun, Adjective", "Gerund vs Participle rules", "Countable and Uncountable structures"] },
      { id: "eng_2", nameBn: "ভার্ব, ভয়েস ও রাইট ফর্ম অফ ভার্বস", nameEn: "Verbs, Voices & Right Form", highYieldPoints: ["Subject-Verb agreement formulas", "Passive voice transformations", "Conditional sentences type 1, 2, 3"] },
      { id: "eng_3", nameBn: "প্রিপজিশন ও অ্যাপ্রোপ্রিয়েট প্রিপজিশন", nameEn: "Prepositions & Appropriate Use", highYieldPoints: ["High Yield appropriate prepositions", "Phrases and idioms definitions", "Common placement mistakes"] },
      { id: "eng_4", nameBn: "সিনোনিম ও অ্যান্টনিম শব্দকোষ", nameEn: "Synonyms & Antonyms Vocabulary", highYieldPoints: ["MAT frequent exam synonyms", "Prefix and Suffix root words", "Confusing vocabulary pairs"] },
      { id: "eng_5", nameBn: "বাক্য সংশোধন ও অনুবাদ", nameEn: "Sentence Correction & Translation", highYieldPoints: ["Parallel construction", "Dangling modifiers correction", "Bangla to English high-yield medical translation"] }
    ]
  },
  {
    id: "GK",
    nameBn: "সাধারণ জ্ঞান",
    nameEn: "General Knowledge",
    icon: "🇧🇩",
    color: "text-rose-500",
    bgColor: "bg-rose-500/10",
    borderColor: "border-rose-500/20",
    chapters: [
      { id: "gk_1", nameBn: "ভাষা আন্দোলন ও ঐতিহাসিক পটভূমি", nameEn: "Language Movement & Historical Backdrop", highYieldPoints: ["১৯৫২ সালের ঘটনাবলী ও শহীদ দিবস", "১৯৫৪ সালের যুক্তফ্রন্ট নির্বাচন", "ছয় দফা কর্মসূচী ১৯৬৬"] },
      { id: "gk_2", nameBn: "বঙ্গবন্ধু শেখ মুজিবুর রহমান ও মুক্তিযুদ্ধ", nameEn: "Bangabandhu & The Liberation War 1971", highYieldPoints: ["৭ই মার্চের ভাষণ ও ২৫শে মার্চ অপারেশন সার্চলাইট", "মুজিবনগর সরকার গঠন ও শপথ", "১১টি সেক্টর এবং ৭ জন বীরশ্রেষ্ঠ"] },
      { id: "gk_3", nameBn: "বাংলাদেশের ভৌগোলিক অবস্থান ও সীমানা", nameEn: "Geography & Borders of Bangladesh", highYieldPoints: ["সীমান্তবর্তী এলাকা ও ছিটমহল", "নদ-নদীর উৎপত্তি ও মিলনস্থল", "খনিজ সম্পদ ও জাতীয় পার্ক"] },
      { id: "gk_4:achievements", nameBn: "জাতীয় প্রতীক, সংবিধান ও সংস্কৃতি", nameEn: "National Symbols, Constitution & Heritage", highYieldPoints: ["সংবিধানের মূলনীতি ও সংশোধনীসমূহ", "জাতীয় প্রতীক ও স্থাপত্য নিদর্শন", "ইউনেস্কো হেরিটেজ সাইট"] }
    ]
  }
];

export default function PreparationRoadmap({
  user,
  onProfileUpdate,
  language = "bn",
  theme = "light"
}: PreparationRoadmapProps) {
  const isBn = language === "bn";
  const isDark = theme === "dark";

  // State for filtering
  const [selectedSubject, setSelectedSubject] = useState<"All" | "Biology" | "Chemistry" | "Physics" | "English" | "GK">("All");
  const [hoveredChapterId, setHoveredChapterId] = useState<string | null>(null);

  // Safely grab completed list from user profile
  const completedList = user.completedChapters || [];

  // Calculate total statistics across all roadmap entries
  const totalChaptersCount = ROADMAP_DATA.reduce((acc, sub) => acc + sub.chapters.length, 0);
  const completedChaptersCount = ROADMAP_DATA.reduce((acc, sub) => {
    const subCompletes = sub.chapters.filter(ch => completedList.includes(ch.id)).length;
    return acc + subCompletes;
  }, 0);

  const overallProgressPct = totalChaptersCount > 0 
    ? Math.round((completedChaptersCount / totalChaptersCount) * 100) 
    : 0;

  // Ranks based on total HSC progress
  const getMotivationalRank = (pct: number) => {
    if (pct === 0) {
      return {
        title: isBn ? "যাত্রার শুরু" : "Beginning of Journey",
        desc: isBn ? "প্রথম চ্যাপ্টার কমপ্লিট করে মিশন শুরু করুন!" : "Mark your first chapter completed to begin the grind!",
        color: "text-gray-400"
      };
    } else if (pct <= 20) {
      return {
        title: isBn ? "নবীশ পরীক্ষার্থী" : "Novice Aspirant",
        desc: isBn ? "ধীরে ধীরে প্রস্তুতি ট্র্যাকে উঠছে। দারুণ শুরু!" : "Getting on track. Great initial progress!",
        color: "text-blue-400"
      };
    } else if (pct <= 50) {
      return {
        title: isBn ? "ডিএমসি প্রতিযোগী" : "DMC Contender",
        desc: isBn ? "হাফওয়েতে পৌছাচ্ছেন! মেডিকেল আসন প্রায় হাতের মুঠোয়।" : "Approaching halfway! Keep up the dedication.",
        color: "text-emerald-400"
      };
    } else if (pct <= 80) {
      return {
        title: isBn ? "সিনিয়র গ্ল্যাডিয়েটর" : "Senior Gladiator",
        desc: isBn ? "উচ্চ শতাংশ সম্পূর্ণ! আপনার প্রস্তুতি অসাধারণ।" : "High yield accuracy master! Your consistency is brilliant.",
        color: "text-purple-400"
      };
    } else {
      return {
        title: isBn ? "হাই-ইল্ড মাস্টার স্কলার" : "High-Yield Master Scholar",
        desc: isBn ? "অসাধারণ! সম্পূর্ণ সিলেবাসে আপনার পুর্ণ দখল রয়েছে।" : "Incredible! Complete command over the full high-yield syllabus.",
        color: "text-yellow-400 animate-pulse"
      };
    }
  };

  const rankInfo = getMotivationalRank(overallProgressPct);

  // Toggle single chapter status
  const handleToggleChapter = async (chapterId: string) => {
    let updatedList: string[];
    const isCompleted = completedList.includes(chapterId);

    if (isCompleted) {
      playSound("click");
      updatedList = completedList.filter(id => id !== chapterId);
    } else {
      playSound("levelup");
      updatedList = [...completedList, chapterId];
    }

    onProfileUpdate({
      completedChapters: updatedList
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`border rounded-2xl p-4 sm:p-6 relative shadow-lg ${
        isDark ? "bg-[#111111] border-white/10 text-white" : "bg-white border-red-150 text-slate-800"
      }`}
      id="prep-roadmap-panel"
    >
      <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#C1121F] via-[#FFD700] to-emerald-500 rounded-t-2xl"></div>

      {/* HEADER ROW */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-150/10 dark:border-white/5 pb-5 mb-6 text-left">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🗺️</span>
            <h3 className={`font-extrabold text-base md:text-lg uppercase tracking-tight font-display ${
              isDark ? "text-white" : "text-slate-900"
            }`}>
              {isBn ? "এইচএসসি ও মেডিকেল প্রস্তুতি রোডম্যাপ" : "HSC & Medical Prep Roadmap"}
            </h3>
            <span className="text-[10px] bg-red-100 dark:bg-red-950/40 text-[#C1121F] px-2 py-0.5 rounded font-mono font-black tracking-widest animate-pulse uppercase">
              LIVE TRACKER
            </span>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
            {isBn 
              ? "বিষয়ভিত্তিক সম্পূর্ণ সিলেবাস ট্র্যাক করুন। আপনার মেডিকেল স্বপ্নের পথে অগ্রগতির রিয়েল-টাইম নির্দেশক।" 
              : "Track progress across the complete high-yield syllabus. Your interactive medical admission blueprint."}
          </p>
        </div>

        {/* Dynamic Overall Progress Circle Badge */}
        <div className={`shrink-0 flex items-center gap-3.5 px-4 py-3 rounded-xl border w-full md:w-auto justify-between md:justify-start ${
          isDark ? "bg-black/40 border-white/5" : "bg-red-50/30 border-red-100"
        }`}>
          <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
            <svg className="w-12 h-12 transform -rotate-90">
              <circle
                cx="24"
                cy="24"
                r="20"
                stroke={isDark ? "#222" : "#eee"}
                strokeWidth="4.5"
                fill="transparent"
              />
              <motion.circle
                cx="24"
                cy="24"
                r="20"
                stroke="#C1121F"
                strokeWidth="4.5"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 20}
                initial={{ strokeDashoffset: 2 * Math.PI * 20 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 20 * (1 - overallProgressPct / 100) }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </svg>
            <span className="absolute text-xs font-black font-mono">{overallProgressPct}%</span>
          </div>
          <div>
            <div className="text-[10px] font-mono font-bold uppercase text-gray-400">{isBn ? "প্রস্তুতি অগ্রগতি" : "PREPARATION CORE"}</div>
            <div className="text-sm font-extrabold font-display leading-none mt-1">
              {completedChaptersCount} <span className="text-xs text-gray-400 font-normal">/ {totalChaptersCount} {isBn ? "অধ্যায়" : "Chapters"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* MOTIVATIONAL RANK STATUS WIDGET */}
      <div className={`p-4 rounded-xl mb-6 border flex flex-col md:flex-row md:items-center justify-between gap-4 text-left ${
        isDark ? "bg-black/20 border-white/5" : "bg-slate-50/50 border-gray-150"
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-xl shrink-0">
            👑
          </div>
          <div>
            <div className="text-[10px] font-mono text-gray-400 uppercase leading-none">{isBn ? "বর্তমান রোডম্যাপ লেভেল" : "CURRENT ROADMAP RANK"}</div>
            <div className={`text-sm font-black uppercase tracking-tight mt-1 font-display ${rankInfo.color}`}>
              {rankInfo.title}
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-450 mt-0.5 leading-normal">
              {rankInfo.desc}
            </p>
          </div>
        </div>

        {/* Motivational Tip or Next Reward Indicator */}
        <div className="flex items-center gap-1.5 md:self-end">
          <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-spin" />
          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest font-bold">
            {isBn ? "মেডিকেল ভর্তি কভার্ড" : "MEDICAL EXAM CONFIDENCE"}
          </span>
        </div>
      </div>

      {/* SUBJECT FILTERS BAR */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-6 scrollbar-none scroll-smooth justify-start -mx-4 px-4 sm:mx-0 sm:px-0">
        <button
          onClick={() => { playSound("click"); setSelectedSubject("All"); }}
          className={`px-3.5 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all font-mono border cursor-pointer shrink-0 ${
            selectedSubject === "All"
              ? "bg-[#C1121F] text-white border-[#C1121F] shadow-[0_4px_12px_rgba(193,18,31,0.25)] scale-[1.03]"
              : isDark
                ? "bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:text-white"
                : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
          }`}
        >
          🌐 {isBn ? "সকল বিষয়" : "ALL SUBJECTS"}
        </button>

        {ROADMAP_DATA.map((sub) => {
          const subCompletes = sub.chapters.filter(ch => completedList.includes(ch.id)).length;
          const subPct = sub.chapters.length > 0 ? Math.round((subCompletes / sub.chapters.length) * 100) : 0;
          const isActive = selectedSubject === sub.id;

          return (
            <button
              key={sub.id}
              onClick={() => { playSound("click"); setSelectedSubject(sub.id); }}
              className={`px-3.5 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all font-mono border flex items-center gap-2 cursor-pointer shrink-0 ${
                isActive
                  ? "bg-[#C1121F] text-white border-[#C1121F] shadow-[0_4px_12px_rgba(193,18,31,0.25)] scale-[1.03]"
                  : isDark
                    ? "bg-[#181818] text-gray-300 border-white/5 hover:bg-white/5 hover:text-white"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-black"
              }`}
            >
              <span>{sub.icon}</span>
              <span>{isBn ? sub.nameBn : sub.nameEn}</span>
              <span className={`text-[9.5px] px-1.5 py-0.2 rounded font-black font-mono shrink-0 ${
                isActive ? "bg-white/25 text-white" : "bg-[#C1121F]/10 text-[#C1121F]"
              }`}>
                {subPct}%
              </span>
            </button>
          );
        })}
      </div>

      {/* ROADMAP TIMELINE GRID */}
      <div className="space-y-10 text-left relative before:absolute before:inset-y-2 before:left-[18px] md:before:left-[24px] before:w-[2px] before:bg-gradient-to-b before:from-[#C1121F]/40 before:via-yellow-500/20 before:to-emerald-500/40">
        {ROADMAP_DATA.filter((sub) => selectedSubject === "All" || sub.id === selectedSubject).map((sub, sIdx) => {
          return (
            <div key={sub.id} className="relative z-10 space-y-4">
              {/* Subject Section Header on Timeline */}
              <div className="flex items-center gap-3 relative">
                {/* Timeline Node Badge */}
                <div className={`w-9 h-9 md:w-12 md:h-12 rounded-full border-2 bg-black flex items-center justify-center shadow-lg relative z-20 shrink-0 ${
                  completedList.some(ch => sub.chapters.map(c => c.id).includes(ch))
                    ? "border-emerald-500 shadow-emerald-500/10 text-emerald-400"
                    : "border-gray-600 text-gray-400"
                }`}>
                  <span className="text-base md:text-xl">{sub.icon}</span>
                </div>

                <div className="min-w-0">
                  <h4 className={`text-sm md:text-base font-extrabold uppercase font-display flex items-center gap-2 ${
                    isDark ? "text-white" : "text-slate-900"
                  }`}>
                    <span>{isBn ? sub.nameBn : sub.nameEn}</span>
                    <span className="text-[10px] font-mono text-gray-500 font-medium">HSC Matrix</span>
                  </h4>
                  {/* Progress info */}
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="w-20 md:w-32 bg-gray-200 dark:bg-white/5 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-[#C1121F] to-emerald-500 h-full transition-all duration-500"
                        style={{ width: `${sub.chapters.length > 0 ? (sub.chapters.filter(ch => completedList.includes(ch.id)).length / sub.chapters.length) * 100 : 0}%` }}
                      ></div>
                    </div>
                    <span className="text-[10px] font-mono text-gray-400">
                      {sub.chapters.filter(ch => completedList.includes(ch.id)).length} / {sub.chapters.length} {isBn ? "সম্পন্ন" : "Done"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Chapters list inside this subject */}
              <div className="pl-12 md:pl-16 space-y-3.5">
                {sub.chapters.map((ch, chIdx) => {
                  const isCompleted = completedList.includes(ch.id);
                  const isHovered = hoveredChapterId === ch.id;

                  return (
                    <motion.div
                      key={ch.id}
                      onMouseEnter={() => setHoveredChapterId(ch.id)}
                      onMouseLeave={() => setHoveredChapterId(null)}
                      onClick={() => handleToggleChapter(ch.id)}
                      className={`group border rounded-xl p-3.5 sm:p-4 transition-all duration-300 relative cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 ${
                        isCompleted
                          ? isDark
                            ? "bg-emerald-500/5 hover:bg-emerald-500/8 border-emerald-500/30 text-white"
                            : "bg-emerald-50/40 hover:bg-emerald-50/60 border-emerald-200 text-slate-800"
                          : isDark
                            ? "bg-black/30 hover:bg-white/[0.02] border-white/5 text-gray-300"
                            : "bg-white hover:bg-slate-50 border-gray-150 text-slate-800"
                      } ${isHovered ? "shadow-md scale-[1.01]" : "shadow-sm"}`}
                    >
                      {/* Timeline dot connection indicator line on left */}
                      <div className="absolute -left-[30px] md:-left-[40px] top-1/2 -translate-y-1/2 flex items-center justify-center z-10 pointer-events-none">
                        <div className={`w-3.5 h-3.5 rounded-full border-2 bg-black flex items-center justify-center transition-all ${
                          isCompleted
                            ? "border-emerald-500 ring-4 ring-emerald-500/10 scale-110"
                            : "border-gray-600 group-hover:border-[#C1121F] group-hover:scale-105"
                        }`}>
                          {isCompleted && (
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                          )}
                        </div>
                      </div>

                      {/* Info layout */}
                      <div className="flex items-start gap-3.5 min-w-0">
                        {/* Status Checkbox */}
                        <div className="mt-1 shrink-0">
                          {isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 animate-scaleUp" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-500 group-hover:text-[#C1121F] transition-colors" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded ${
                              ch.paper === 1
                                ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                : ch.paper === 2
                                  ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                                  : "bg-gray-500/10 text-gray-400 border border-gray-500/20"
                            }`}>
                              {ch.paper ? `${ch.paper}${ch.paper === 1 ? "st" : "nd"} Paper` : "Common Syllabus"}
                            </span>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono font-bold uppercase">
                              CH-{chIdx + 1}
                            </span>
                          </div>

                          <h5 className={`font-extrabold text-xs md:text-sm mt-1 leading-snug group-hover:text-red-500 transition-colors ${
                            isCompleted ? "text-slate-800 dark:text-emerald-300" : isDark ? "text-gray-200" : "text-slate-900"
                          }`}>
                            {isBn ? ch.nameBn : ch.nameEn}
                          </h5>
                          {isBn && (
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 italic">
                              {ch.nameEn}
                            </p>
                          )}

                          {/* High Yield Sub-Bullet targets on expand or hover */}
                          {ch.highYieldPoints && (
                            <div className="flex flex-wrap gap-1.5 mt-2 max-w-xl">
                              {ch.highYieldPoints.map((pt, pIdx) => (
                                <span key={pIdx} className="text-[9px] font-mono font-medium px-2 py-0.5 bg-black/20 dark:bg-white/5 text-gray-400 border border-gray-150/10 dark:border-white/5 rounded-md">
                                  🎯 {pt}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right actions: Toggle completed label */}
                      <div className="flex items-center gap-2.5 self-end md:self-auto shrink-0 font-mono text-[10px] uppercase">
                        <span className={`px-2 py-1 rounded font-black border transition-all ${
                          isCompleted
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : isDark
                              ? "bg-white/5 text-gray-500 border-white/5"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}>
                          {isCompleted ? (isBn ? "সম্পন্ন" : "COMPLETED") : (isBn ? "বাকি আছে" : "PENDING")}
                        </span>
                        <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-300 ${
                          isCompleted ? "text-emerald-500" : "text-gray-500 group-hover:translate-x-1"
                        }`} />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* FOOTER SUMMARY MATRIX */}
      <div className={`mt-8 pt-5 border-t border-gray-150/10 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono text-gray-500`}>
        <div className="flex items-center gap-2 text-[10px]">
          <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>
            {isBn 
              ? "মজার তথ্য: প্রতিটি চ্যাপ্টার শেষ করলে আপনার রোডম্যাপ প্রগ্রেস আপগ্রেড হবে!" 
              : "Tip: Completing chapters advances your overall HSC competitive readiness."}
          </span>
        </div>
        <div className="text-[10px]">
          {isBn ? "রোডম্যাপ সংস্করণ: ২০২৬.১ • সুরক্ষিত ডাটা" : "Roadmap Engine: v2026.1 • Secure Backup"}
        </div>
      </div>
    </motion.div>
  );
}
