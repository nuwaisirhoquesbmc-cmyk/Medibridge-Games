import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
} from "recharts";
import { UserProfile, Question } from "../types";
import {
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Award,
  BookOpen,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  Search,
  Filter,
  ArrowUpDown,
  BookMarked,
  BrainCircuit,
  Compass,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Play,
  RotateCcw,
  Zap
} from "lucide-react";

interface QuestionAnalyticsProps {
  user: UserProfile;
  dbQuestions: Question[];
  language: "bn" | "en";
  onEnterPractice?: () => void;
  theme?: "light" | "dark";
}

interface AnalyticsData {
  correctByChapter: Record<string, number>;
  incorrectByChapter: Record<string, number>;
  attemptsByChapter: Record<string, number>;
  totalExercisesSolved: number;
  unlockedBadges: string[];
}

const getBookTranslation = (bookName: string, isBn: boolean) => {
  if (!isBn) return bookName;
  if (bookName.includes("Abul Hasan Biology • Chapter 1")) return "আবুল হাসান জীববিজ্ঞান • ১ম অধ্যায়";
  if (bookName.includes("Abul Hasan Biology • Chapter 2")) return "আবুল হাসান জীববিজ্ঞান • ২য় অধ্যায়";
  if (bookName.includes("Abul Hasan Biology • Human Physiology")) return "আবুল হাসান জীববিজ্ঞান • মানব শারীরতত্ত্ব";
  if (bookName.includes("Hazar-Nagin Chemistry • Part 1 Chapter 2")) return "হাজারী-নাগ রসায়ন • ১ম পত্র ২য় অধ্যায়";
  if (bookName.includes("Ishaq Physics • Part 1 Chapter 2")) return "ইসহাক পদার্থবিজ্ঞান • ১ম পত্র ২য় অধ্যায়";
  if (bookName.includes("MediBridge High-Yield High-Yield MAT Capsule")) return "মেডিব্রিজ হাই-ইয়েল্ড মেডিকেল ক্যাপসুল";
  return bookName;
};

const getSubjectTranslation = (subject: string, isBn: boolean) => {
  const subjectLabels: Record<string, { en: string; bn: string }> = {
    Biology: { en: "🧬 Biology", bn: "🧬 জীববিজ্ঞান" },
    Chemistry: { en: "⚗️ Chemistry", bn: "⚗️ রসায়ন" },
    Physics: { en: "⚡ Physics", bn: "⚡ পদার্থবিজ্ঞান" },
    English: { en: "🇬🇧 English", bn: "🇬🇧 ইংরেজি" },
    GK: { en: "🌐 General Knowledge", bn: "🌐 সাধারণ জ্ঞান" },
    General: { en: "📋 General", bn: "📋 সাধারণ" }
  };
  const item = subjectLabels[subject] || subjectLabels["General"];
  return isBn ? item.bn : item.en;
};

export default function QuestionAnalytics({
  user,
  dbQuestions,
  language,
  onEnterPractice,
  theme = "dark"
}: QuestionAnalyticsProps) {
  const isBn = language === "bn";
  const isDark = theme === "dark";

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [analytics, setAnalytics] = useState<AnalyticsData>({
    correctByChapter: {},
    incorrectByChapter: {},
    attemptsByChapter: {},
    totalExercisesSolved: 0,
    unlockedBadges: [],
  });

  // UI filters & search
  const [selectedSubject, setSelectedSubject] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"accuracy-asc" | "accuracy-desc" | "attempts-desc" | "attempts-asc">("accuracy-asc");
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});

  // Seed baseline diagnostic data if real data doesn't exist
  useEffect(() => {
    const key = `medibridge_anushiloni_analytics_${user.uid}`;
    let saved = localStorage.getItem(key);

    if (!saved) {
      const seedBaseline: AnalyticsData = {
        correctByChapter: {
          "কোষ ও এর গঠন": 8,
          "কোষ বিভাজন": 2,
          "রক্ত ও রক্ত সংবহন": 3,
          "গুণগত রসায়ন": 6,
          "জৈব রসায়ন": 1,
          "ভেক্টর": 5,
          "বাক্য সংশোধন": 4,
          "১৯৭১ সালের মহান মুক্তিযুদ্ধ": 5,
        },
        incorrectByChapter: {
          "কোষ ও এর গঠন": 2,
          "কোষ বিভাজন": 6, // Weak
          "রক্ত ও রক্ত সংবহন": 7, // Weak
          "গুণগত রসায়ন": 2,
          "জৈব রসায়ন": 5, // Weak
          "ভেক্টর": 4,
          "বাক্য সংশোধন": 1,
          "১৯৭১ সালের মহান মুক্তিযুদ্ধ": 1,
        },
        attemptsByChapter: {
          "কোষ ও এর গঠন": 10,
          "কোষ বিভাজন": 8,
          "রক্ত ও রক্ত সংবহন": 10,
          "গুণগত রসায়ন": 8,
          "জৈব রসায়ন": 6,
          "ভেক্টর": 9,
          "বাক্য সংশোধন": 5,
          "১৯৭১ সালের মহান মুক্তিযুদ্ধ": 6,
        },
        totalExercisesSolved: 62,
        unlockedBadges: ["Anushiloni Explorer", "Syllabus Conqueror", "Daily Grind"],
      };
      localStorage.setItem(key, JSON.stringify(seedBaseline));
      setAnalytics(seedBaseline);
    } else {
      try {
        setAnalytics(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse analytics", e);
      }
    }
  }, [user.uid]);

  const handleResetAnalytics = () => {
    if (confirm(isBn ? "আপনি কি অনুশীলনী এনালিটিক্স রিসেট করতে চান? আপনার বর্তমান সমস্ত প্রোগ্রেস মুছে যাবে।" : "Are you sure you want to reset your practice progress analytics? All your saved logs will be wiped.")) {
      const key = `medibridge_anushiloni_analytics_${user.uid}`;
      localStorage.removeItem(key);
      window.location.reload();
    }
  };

  // Compile detailed chapter diagnostics
  const chaptersList = Object.keys({
    ...analytics.attemptsByChapter,
    ...analytics.correctByChapter,
    ...analytics.incorrectByChapter,
  });

  const detailedChapters = chaptersList.map((chap) => {
    const attempts = analytics.attemptsByChapter[chap] || 0;
    const correct = analytics.correctByChapter[chap] || 0;
    const incorrect = analytics.incorrectByChapter[chap] || 0;
    const netMarks = Math.max(0, Number((correct - incorrect * 0.25).toFixed(2)));
    const marksPercent = attempts > 0 ? Math.max(0, Math.round((netMarks / attempts) * 100)) : 0;
    const accuracy = attempts > 0 ? Math.round((correct / attempts) * 100) : 0;

    let subject = "General";
    if (["কোষ ও এর গঠন", "কোষ বিভাজন", "রক্ত ও রক্ত সংবহন", "Biology", "উদ্ভিদ শরীরস্থান", "উদ্ভিদ শারীরতত্ত্ব", "স্নায়ুতন্ত্র"].some(k => chap.includes(k))) {
      subject = "Biology";
    } else if (["গুণগত রসায়ন", "জৈব রসায়ন", "রসায়ন", "Chemistry", "পরমাণুর গঠন", "পর্যায় সারণি", "রাসায়নিক সাম্যাবস্থা", "পরিমাণগত রসায়ন"].some(k => chap.includes(k))) {
      subject = "Chemistry";
    } else if (["ভেক্টর", "মহাকর্ষ", "পদার্থবিজ্ঞান", "Physics", "মহাকর্ষ ও অভিকর্ষ", "তাপগতিবিদ্যা", "ভৌত আলোকবিজ্ঞান"].some(k => chap.includes(k))) {
      subject = "Physics";
    } else if (["English", "মেডিকেল পরিভাষা ও প্রতিশব্দ", "বাক্য সংশোধন", "বিপরীত শব্দ"].some(k => chap.includes(k))) {
      subject = "English";
    } else if (["GK", "স্বাধীনতার ঘোষণা ও সংবিধান", "১৯৭১ সালের মহান মুক্তিযুদ্ধ", "সংবিধান"].some(k => chap.includes(k))) {
      subject = "GK";
    }

    return {
      name: chap,
      attempts,
      correct,
      incorrect,
      netMarks,
      marksPercent,
      accuracy,
      subject,
    };
  });

  // Calculate subject average performance
  const subjects = ["Biology", "Chemistry", "Physics", "English", "GK"];
  const subjectSummary = subjects.map((sub) => {
    const subChaps = detailedChapters.filter((c) => c.subject === sub);
    const totalSubAttempts = subChaps.reduce((sum, c) => sum + c.attempts, 0);
    const totalSubCorrect = subChaps.reduce((sum, c) => sum + c.correct, 0);
    const totalSubIncorrect = subChaps.reduce((sum, c) => sum + c.incorrect, 0);
    const netSubMarks = Math.max(0, Number((totalSubCorrect - totalSubIncorrect * 0.25).toFixed(2)));
    const averageMarksPercent = totalSubAttempts > 0 ? Math.max(0, Math.round((netSubMarks / totalSubAttempts) * 100)) : 0;
    const averageAccuracy = totalSubAttempts > 0 ? Math.round((totalSubCorrect / totalSubAttempts) * 100) : 0;
    return {
      subject: sub,
      attempts: totalSubAttempts,
      correct: totalSubCorrect,
      incorrect: totalSubIncorrect,
      netMarks: netSubMarks,
      marksPercent: averageMarksPercent,
      accuracy: averageAccuracy,
    };
  });

  // Total summary calculations
  const totalAttempts = (Object.values(analytics.attemptsByChapter) as number[]).reduce((a: number, b: number) => a + b, 0);
  const totalCorrect = (Object.values(analytics.correctByChapter) as number[]).reduce((a: number, b: number) => a + b, 0);
  const totalIncorrect = (Object.values(analytics.incorrectByChapter) as number[]).reduce((a: number, b: number) => a + b, 0);
  const totalNetMarks = Math.max(0, Number((totalCorrect - totalIncorrect * 0.25).toFixed(2)));
  const globalMarksPercent = totalAttempts > 0 ? Math.max(0, Math.round((totalNetMarks / totalAttempts) * 100)) : 0;
  const globalAccuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

  // Identify weak chapters (< 60% marks or lowest marks with at least 3 attempts)
  const weakChapters = detailedChapters
    .filter((c) => c.attempts >= 3 && c.marksPercent < 60)
    .sort((a, b) => a.marksPercent - b.marksPercent);

  // Expanded weak chapters filter for the new Targeted Revision hub
  const weakChaptersForRevision = detailedChapters
    .filter((c) => c.marksPercent < 75 && c.attempts > 0)
    .sort((a, b) => a.marksPercent - b.marksPercent);

  const displayWeakChapters = weakChaptersForRevision.length > 0
    ? weakChaptersForRevision
    : [...detailedChapters].filter(c => c.attempts > 0).sort((a, b) => a.marksPercent - b.marksPercent).slice(0, 3);

  const getRadarLabel = (sub: string, isBengali: boolean, mobile: boolean) => {
    if (mobile) {
      const shortLabels: Record<string, { en: string; bn: string }> = {
        Biology: { en: "Bio", bn: "জীববিজ্ঞান" },
        Chemistry: { en: "Chem", bn: "রসায়ন" },
        Physics: { en: "Phys", bn: "পদার্থ" },
        English: { en: "Eng", bn: "ইংরেজি" },
        GK: { en: "GK", bn: "সা. জ্ঞান" },
      };
      const item = shortLabels[sub] || { en: sub, bn: sub };
      return isBengali ? item.bn : item.en;
    } else {
      return getSubjectTranslation(sub, isBengali);
    }
  };

  const radarData = subjectSummary.map((item) => ({
    subject: getRadarLabel(item.subject, isBn, isMobile),
    marksPercent: item.marksPercent,
    accuracy: item.accuracy,
    attempts: item.attempts,
    fullMark: 100
  }));

  // Focus Priority: the single weakest chapter needing immediate effort
  const focusPriorityChapter = detailedChapters.length > 0 
    ? [...detailedChapters]
        .filter(c => c.attempts >= 2)
        .sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts)[0]
    : null;

  // Revision Guidelines Directory
  const REVISION_PATHS: Record<string, { book: string; linkText: string; bulletHacks: string[]; bg: string; text: string; border: string; focusConcepts: string[] }> = {
    "কোষ ও এর গঠন": {
      book: "Abul Hasan Biology • Chapter 1",
      linkText: "কোষ ও এর গঠন (Fluid Mosaic Model, Chromosome DNA structure)",
      bulletHacks: [
        "Fluid Mosaic Model এর ৪টি উপাদান (লিপিড বাইলেয়ার, মেমব্রেন প্রোটিন, গ্লাইকোক্যালিক্স, কোলেস্টেরল) মুখস্থ করুন।",
        "মাইটোকন্ড্রিয়া ও ক্লোরোপ্লাস্টের নিজস্ব ডিএনএ (Circular DNA) এবং ৭০S রাইবোসোম থাকার গুরুত্ব মনে রাখুন।",
        "প্রোটিন সংশ্লেষণ বা ট্রান্সলেশন প্রক্রিয়া এবং স্টপ কোডনসমূহ (UAA, UAG, UGA) দাগিয়ে পড়তে হবে।"
      ],
      bg: "bg-emerald-950/15",
      text: "text-emerald-400",
      border: "border-emerald-500/20",
      focusConcepts: ["Fluid Mosaic Model", "Chromosomal DNA", "Translation Steps", "Stop Codons"]
    },
    "কোষ বিভাজন": {
      book: "Abul Hasan Biology • Chapter 2",
      linkText: "কোষ বিভাজন (Mitosis, Meiosis phase details)",
      bulletHacks: [
        "মিয়োসিস-১ এর প্রোফেজ-১ উপদশাগুলোর সিকোয়েন্স: লেপ্টোটিন → জাইগোটিন → প্যাকাইটিন → ডিপ্লোটিন → ডায়াকাইনেসিস।",
        "জাইগোটিনে হোমোলোগাস ক্রোমোজোমের জোড় সৃষ্টিকে 'সিন্যাপসিস' বলে এবং কায়াজমা তৈরিকৃত অংশকে 'ক্রসিং ওভার' বলা হয়।",
        "মাইটোসিসের মেটাফেজ ধাপে ক্রোমোজোমের মেটাকাইনেসিস ও সর্বাধিক খাটো ও মোটা হবার বৈশিষ্ট্যটি পুনরায় দেখুন।"
      ],
      bg: "bg-teal-950/15",
      text: "text-teal-400",
      border: "border-teal-500/20",
      focusConcepts: ["Meiosis Prophase I Sequence", "Synapsis & Chiasma", "Metakinesis Rules", "Crossing Over Rates"]
    },
    "রক্ত ও রক্ত সংবহন": {
      book: "Abul Hasan Biology • Human Physiology",
      linkText: "রক্ত ও রক্ত সংবহন (Cardiac cycle timings, Blood clotting factors)",
      bulletHacks: [
        "রক্ত তঞ্চনের প্রধান ১৩টি ক্লটিং ফ্যাক্টরের মধ্যে প্রথম ৪টি (ফুল পড়ে টপ করে: ফাইব্রিনোজেন, প্রোথ্রোম্বিন, থ্রোম্বোপ্লাস্টিন, ক্যালসিয়াম আয়ন) অত্যন্ত গুরুত্বপূর্ণ।",
        "কার্ডিয়াক চক্রের সময়কাল (০.৮ সেকেন্ড): অলিন্দের সিস্টোল (০.১s), অলিন্দের ডায়াস্টোল (০.৭s), নিলয়ের সিস্টোল (০.৩s), নিলয়ের ডায়াস্টোল (০.৫s)।",
        "পেসমেকার নোডসমূহ: SA Node (প্রধান বা সাইনোঅ্যাট্রিয়াল নোড, হৃদস্পন্দনের সৃষ্টিকারী) এবং AV Node (রিলে স্টেশন)।"
      ],
      bg: "bg-red-950/15",
      text: "text-red-400",
      border: "border-red-500/20",
      focusConcepts: ["Clothing Factors 1-4", "Cardiac Cycle Times", "Sinoatrial Node", "Coronary Arteries"]
    },
    "গুণগত রসায়ন": {
      book: "Hazar-Nagin Chemistry • Part 1 Chapter 2",
      linkText: "গুণগত রসায়ন (Atomic models, Quantum numbers rules, Rydberg constant)",
      bulletHacks: [
        "৪টি কোয়ান্টাম সংখ্যা (n, l, m, s) এবং তাদের উপশক্তিস্তর ধারণক্ষমতার সমীকরণ ২(২l+১) মুখস্থ করুন।",
        "আউফবাউ নীতি (n+l মান নির্ধারণ), হুন্ডের নীতি (অযুগ্ম স্পিন) এবং পলির বর্জন নীতি (১টি অরবিটালে বিপরীত স্পিন)।",
        "দ্রাব্যতা এবং দ্রাব্যতা গুণফল (Ksp vs Kip) গাণিতিক সম্পর্ক: অম্ল-ক্ষার ও লবণের অধঃক্ষেপণের শর্ত (Kip > Ksp) পুনরায় অনুশীলন করুন।"
      ],
      bg: "bg-blue-950/15",
      text: "text-blue-400",
      border: "border-blue-500/20",
      focusConcepts: ["Quantum Numbers Rules", "Aufbau n+l Formula", "Solubility Product (Ksp)", "Rydberg Equations"]
    },
    "জৈব রসায়ন": {
      book: "Hazar-Nagin Chemistry • Part 1 Chapter 2",
      linkText: "জৈব রসায়ন (Lucas Reagent testing, hybridizations, naming)",
      bulletHacks: [
        "লুকাশ বিকারক (গাঢ় HCl + অনাদ্র ZnCl2) দ্বারা ১°, ২° এবং ৩° অ্যালকোহলের পার্থক্যকরণ পরীক্ষার তাৎক্ষণিক সাদা অধঃক্ষেপণের মূল বিক্রিয়া।",
        "বেনজিনের ইলেকট্রনাকর্ষী প্রতিস্থাপন বিক্রিয়াসমূহের প্রভাবক এবং ফেনল শনাক্তকারী লোহা (FeCl3) বেগুনি রঙের টেস্ট।",
        "জ্যামিতিক সমাণুতার শর্তসমূহ (প্রতিস্থাপিত অ্যালকিন, সিস ও ট্রান্স ফর্ম) এবং আলোক সমাণুতার কিরাল কার্বন ধারণের নিয়ম।"
      ],
      bg: "bg-amber-950/15",
      text: "text-amber-400",
      border: "border-amber-500/20",
      focusConcepts: ["Lucas Reagent White Test", "Benzene Electrophiles", "Phenol FeCl3 Color", "Chiral Carbons"]
    },
    "ভেক্টর": {
      book: "Ishaq Physics • Part 1 Chapter 2",
      linkText: "ভেক্টর ও গতিবিদ্যা (Vector crossing angles, Divergence-Curl)",
      bulletHacks: [
        "দুটি ভেক্টরের ডট গুণফল শূন্য হলে ভেক্টরদ্বয় পরস্পর লম্ব এবং ক্রস গুণফল শূন্য হলে ভেক্টরদ্বয় পরস্পর সমান্তরাল হয়।",
        "গ্রেডিয়েন্ট (স্কেলার থেকে ভেক্টর), ডাইভারজেন্স (ভেক্টর থেকে স্কেলার; শূন্য হলে সোলেনয়ডাল) এবং কার্ল (ঘূর্ণনশীলতা, শূন্য হলে অঘূর্ণনশীল)।",
        "নৌকা পারাপার ও নদীর স্রোতের ন্যূনতম দূরত্ব ও ন্যূনতম সময়ের ত্রিকোণমিতিক সূত্রসমূহ চোখ বুলিয়ে নিন।"
      ],
      bg: "bg-indigo-950/15",
      text: "text-indigo-400",
      border: "border-indigo-500/20",
      focusConcepts: ["Dot & Cross Product Conditions", "Solenoidal Divergence = 0", "Curl & Rotational force", "Shortest Path Crossing"]
    }
  };

  const defaultPathway = {
    book: "MediBridge High-Yield High-Yield MAT Capsule",
    linkText: "General Core Subject Revision Pathways",
    bulletHacks: [
      "জীববিজ্ঞানে আবুল হাসান স্যার এবং গাজী আজমল স্যারের অনুশীলনী শেষের বহুনির্বাচনী প্রশ্ন ১০০% মুখস্থ করুন।",
      "রসায়নে কবি আলীর ও হাজারী স্যারের সংকরণ ও পিএইচ বাফার দ্রবণ গাণিতিক অংশ আয়ত্তে আনুন।",
      "পদার্থবিজ্ঞানে ইসহাক স্যারের প্রতিটি অধ্যায়ের মাত্রাসমীকরণ, ধ্রুবক রাশির মানসমূহ রিভিশন কার্ডে লিখে রাখুন।"
    ],
    bg: "bg-yellow-950/10",
    text: "text-yellow-400",
    border: "border-yellow-500/20",
    focusConcepts: ["Exercise Back-Questions", "Hybridizations", "Unit Dimensions"]
  };

  // Expand / collapse single chapter card helper
  const toggleChapterExpansion = (name: string) => {
    setExpandedChapters((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  // Handle click on practice action in analytics
  const handleQuickPractice = (chapterName: string) => {
    if (onEnterPractice) {
      // Store preferred chapter in localStorage to auto-select in practice page
      localStorage.setItem("mb_preferred_practice_chapter", chapterName);
      onEnterPractice();
    }
  };

  // Filter and sort chapters list
  const filteredChapters = detailedChapters
    .filter((c) => {
      const matchSubject = selectedSubject === "All" || c.subject === selectedSubject;
      const matchSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.subject.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSubject && matchSearch;
    })
    .sort((a, b) => {
      if (sortBy === "accuracy-asc") return a.accuracy - b.accuracy;
      if (sortBy === "accuracy-desc") return b.accuracy - a.accuracy;
      if (sortBy === "attempts-desc") return b.attempts - a.attempts;
      if (sortBy === "attempts-asc") return a.attempts - b.attempts;
      return 0;
    });

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`border rounded-2xl sm:rounded-3xl p-4 sm:p-6 relative shadow-2xl overflow-hidden ${
        isDark ? "bg-[#0A0A0A] border-white/10" : "bg-white border-red-150 text-slate-800"
      }`}
    >
      {/* Decorative top border layout glow */}
      <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-yellow-500 via-orange-500 to-[#C1121F]"></div>

      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 pb-5 sm:pb-6 mb-6 sm:mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] bg-red-950/40 border border-[#C1121F]/30 text-[#C1121F] px-2.5 py-0.5 rounded-full font-mono font-black uppercase tracking-widest">
              {isBn ? "লাইভ ডায়াগনস্টিক" : "LIVE DIAGNOSTICS"}
            </span>
          </div>
          <h2 className={`text-lg sm:text-2xl font-black uppercase flex items-center gap-2 sm:gap-3 font-display tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-[#C1121F]" />
            {isBn ? "কুইজ ও সিলেবাস বিশ্লেষণ কেন্দ্র" : "SYLLABUS PERFORMANCE CENTER"}
          </h2>
          <p className="text-[10px] sm:text-[11px] text-gray-400 font-mono uppercase tracking-wide mt-1">
            {isBn
              ? "অধ্যায়ভিত্তিক সঠিকতা, লেখকের সাজেশন এবং ভুল সংশোধন উইজেট"
              : "Advanced tracking matrices, Weak area isolation & targeted revision roadmaps"}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleResetAnalytics}
            className="text-[10px] uppercase font-mono font-bold text-gray-400 hover:text-[#C1121F] border border-white/10 hover:border-[#C1121F]/40 bg-black/40 px-3 py-2 rounded-xl transition flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {isBn ? "প্রগতি রিসেট" : "RESET DATA"}
          </button>

          {onEnterPractice && (
            <button
              onClick={onEnterPractice}
              className="px-4 py-2 bg-[#C1121F] hover:bg-red-750 text-white font-extrabold uppercase text-[11px] tracking-widest rounded-xl transition flex items-center gap-1.5 font-display shadow-lg shadow-red-950/20 cursor-pointer"
            >
              <span>{isBn ? "অনুশীলনী হাব" : "PRACTICE HUB"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* TOP DYNAMIC CORE ANALYTICS HEADER GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        {/* Global Accuracy Progress Dial */}
        <div className="bg-black/40 border border-white/5 p-4 sm:p-5 rounded-2xl flex flex-col items-center justify-center text-center relative col-span-1">
          <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider mb-4 block">
            {isBn ? "গড় প্রাপ্ত নম্বর %" : "AVERAGE MARKS %"}
          </span>

          <div className="relative w-28 h-28 flex items-center justify-center">
            {/* SVG Background Ring */}
            <svg className="absolute w-full h-full transform -rotate-90">
              <circle
                cx="56"
                cy="56"
                r="44"
                stroke="#121212"
                strokeWidth="8"
                fill="transparent"
              />
              <motion.circle
                cx="56"
                cy="56"
                r="44"
                stroke={globalMarksPercent >= 75 ? "#10B981" : globalMarksPercent >= 55 ? "#EAB308" : "#EF4444"}
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={276.4}
                initial={{ strokeDashoffset: 276.4 }}
                animate={{ strokeDashoffset: 276.4 - (276.4 * globalMarksPercent) / 100 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />
            </svg>
            <div className="flex flex-col items-center">
              <span className="text-xl font-black text-white font-display">{globalMarksPercent}%</span>
              <span className="text-[8.5px] font-mono text-gray-500 uppercase tracking-widest mt-0.5">
                {globalMarksPercent >= 75 ? "EXCELLENT" : globalMarksPercent >= 55 ? "SATISFACTORY" : "CRITICAL"}
              </span>
            </div>
          </div>

          <div className="mt-4 text-[10px] text-gray-500 leading-normal font-sans">
            {isBn
              ? "নেগেটিভ মার্কিং (-০.২৫) সহ গড় প্রাপ্ত নম্বর শতকরা হার।"
              : "Calculated Net Marks % incorporating standard -0.25 MAT negative penalty."}
          </div>
        </div>

        {/* Drill Metrics count log */}
        <div className="bg-black/40 border border-white/5 p-4 sm:p-5 rounded-2xl flex flex-col justify-between col-span-1">
          <div>
            <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider mb-4 block">
              {isBn ? "কুইজ পারফরম্যান্স পরিসংখ্যান" : "DRILLMETRICS LOG"}
            </span>

            <div className="space-y-3.5 font-mono text-xs">
              <div className="flex justify-between items-center border-b border-white/[0.03] pb-2">
                <span className="text-gray-400">{isBn ? "মোট সমাধানকৃত" : "Total Solved"}:</span>
                <span className="text-white font-black">{totalAttempts} Qs</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/[0.03] pb-2">
                <span className="text-emerald-400 flex items-center gap-1 font-bold">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {isBn ? "সঠিক উত্তর" : "Correct"}:
                </span>
                <span className="text-emerald-300 font-bold">{totalCorrect}</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/[0.03] pb-2">
                <span className="text-[#C1121F] flex items-center gap-1 font-bold">
                  <XCircle className="w-3.5 h-3.5" />
                  {isBn ? "ভুল উত্তর (-০.২৫)" : "Mistakes (-0.25)"}:
                </span>
                <span className="text-red-400 font-bold">{totalIncorrect}</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/[0.03] pb-2">
                <span className="text-yellow-400 font-bold">
                  {isBn ? "মোট প্রাপ্ত নম্বর" : "Net Marks"}:
                </span>
                <span className="text-yellow-400 font-bold font-mono">{totalNetMarks}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-2 bg-[#FFD700]/5 border border-[#FFD700]/10 rounded-xl flex items-center gap-2 text-[10px]">
            <Award className="w-4 h-4 text-[#FFD700] shrink-0" />
            <span className="text-[#FFD700] font-sans font-semibold">
              {isBn
                ? `${analytics.unlockedBadges.length}টি মেডেল/ব্যাজ সক্রিয় রয়েছে`
                : `${analytics.unlockedBadges.length} high-yield medals active`}
            </span>
          </div>
        </div>

        {/* Focus Priority Card */}
        <div className="bg-black/40 border border-white/5 p-4 sm:p-5 rounded-2xl flex flex-col justify-between col-span-1">
          <div>
            <span className="text-[10px] font-mono font-bold text-red-400 uppercase tracking-wider mb-3 block flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
              {isBn ? "উচ্চ অগ্রাধিকার দুর্বল অধ্যায়" : "FOCUS PRIORITY BLOCK"}
            </span>

            {displayWeakChapters[0] ? (
              <div className="flex flex-col gap-2">
                <h4 className="text-xs font-black text-white uppercase font-display leading-tight flex items-start gap-1.5">
                  <AlertTriangle className="w-4.5 h-4.5 text-red-500 shrink-0 mt-0.5" />
                  <span>{displayWeakChapters[0].name}</span>
                </h4>
                
                <div className="bg-red-950/20 border border-red-900/40 p-3 rounded-xl mt-1.5 font-mono text-[10.5px] leading-relaxed">
                  <div className="flex justify-between text-gray-400">
                    <span>{isBn ? "প্রাপ্ত নম্বর %" : "Marks %"}:</span>
                    <span className="font-extrabold text-red-400">{displayWeakChapters[0].marksPercent}%</span>
                  </div>
                  <div className="flex justify-between text-gray-400 mt-1">
                    <span>{isBn ? "ভুল উত্তরের সংখ্যা" : "Mistakes"}:</span>
                    <span className="font-bold text-white">{displayWeakChapters[0].incorrect}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-emerald-950/15 border border-emerald-500/20 text-emerald-400 rounded-xl leading-relaxed text-[10.5px] font-sans">
                🎉 {isBn
                  ? "চমৎকার! আপনার কোনো গুরুতর দুর্বল অধ্যায় সনাক্ত করা যায়নি।"
                  : "All chapters calibrated above threshold limit!"}
              </div>
            )}
          </div>

          <div className="mt-4 text-[9.5px] text-gray-500 leading-normal font-sans italic">
            💡 {isBn
              ? "পরামর্শ: এই অধ্যায়টির মক টেস্ট হাব শুরু করতে কুইক অ্যাকশন নিন।"
              : "Execute immediate mock runs on the highlighted weak segments."}
          </div>
        </div>

        {/* Syllabus Coverage Radar & subject comparison */}
        <div className="bg-black/40 border border-white/5 p-4 sm:p-5 rounded-2xl flex flex-col justify-between col-span-1">
          <div>
            <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider mb-3.5 block">
              {isBn ? "বিষয়ভিত্তিক প্রাপ্ত নম্বর %" : "SUBJECT MARKS %"}
            </span>

            <div className="space-y-2.5">
              {subjectSummary.map((sub) => {
                let col = "bg-[#C1121F]";
                if (sub.marksPercent >= 75) col = "bg-emerald-500";
                else if (sub.marksPercent >= 55) col = "bg-yellow-500";

                return (
                  <div key={sub.subject} className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono font-bold text-gray-400">
                      <span>{getSubjectTranslation(sub.subject, isBn)}</span>
                      <span>{sub.marksPercent}%</span>
                    </div>
                    <div className="w-full bg-[#111] h-1 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${col}`} style={{ width: `${sub.marksPercent}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-[8.5px] text-gray-500 mt-2 font-mono uppercase text-right tracking-widest">
            {isBn ? "৫টি প্রধান বিষয় ম্যাপ" : "5 CORE DOMAINS VISOR"}
          </div>
        </div>
      </div>

      {/* SUBJECT PROFICIENCY RADAR & TARGETED REVISION PANEL */}
      <div className="grid lg:grid-cols-12 gap-6 mb-8 text-left">
        {/* Radar Chart (col-span-7) */}
        <div className={`lg:col-span-7 p-5 rounded-2xl border flex flex-col justify-between ${
          isDark ? "bg-black/40 border-white/5" : "bg-slate-50/50 border-gray-150 text-slate-800"
        }`}>
          <div>
            <span className={`text-[10px] font-mono font-bold uppercase tracking-wider mb-2.5 block ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              📊 {isBn ? "বিষয়ভিত্তিক দক্ষতা রাডার" : "SUBJECT PROFICIENCY RADAR"}
            </span>
            <p className={`text-[11.5px] leading-relaxed mb-4 ${isDark ? "text-gray-400" : "text-slate-600"}`}>
              {isBn 
                ? "৫টি মূল বিষয়ে আপনার শক্তি ও দুর্বলতা প্রদর্শনকারী লাইভ রাডার ভিজ্যুয়ালাইজেশন।" 
                : "A real-time visual radar footprint assessing your relative mastery across all five primary test domains."}
            </p>
          </div>

          <div className="w-full flex justify-center items-center h-[280px]">
            {totalAttempts === 0 ? (
              <div className="text-center font-mono py-8">
                <span className="text-3xl">📡</span>
                <p className="text-xs text-gray-500 mt-2">
                  {isBn ? "বিশ্লেষণের জন্য কোনো কুইজ ডেটা পাওয়া যায়নি।" : "No quiz diagnostics logged yet."}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">
                  {isBn ? "অনুশীলনী হাবে কুইজ দিয়ে শুরু করুন!" : "Solve questions in Practice Hub to generate your radar footprint."}
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius={isMobile ? "60%" : "75%"} data={radarData}>
                  <PolarGrid stroke={isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)"} />
                  <PolarAngleAxis 
                    dataKey="subject" 
                    tick={{ 
                      fill: isDark ? "#A0A0A0" : "#4A5568", 
                      fontSize: isMobile ? 8.5 : 10,
                      fontWeight: 700,
                      fontFamily: "Inter"
                    }} 
                  />
                  <PolarRadiusAxis 
                    angle={30} 
                    domain={[0, 100]} 
                    tick={{ 
                      fill: isDark ? "#606060" : "#718096", 
                      fontSize: isMobile ? 8 : 9,
                      fontWeight: 600
                    }}
                    axisLine={false}
                  />
                  <Radar
                    name={isBn ? "প্রাপ্ত নম্বর %" : "Marks %"}
                    dataKey="marksPercent"
                    stroke="#C1121F"
                    fill="#C1121F"
                    fillOpacity={isDark ? 0.25 : 0.15}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className={`p-3 border rounded-xl shadow-xl text-left font-mono text-[11px] ${
                            isDark ? "bg-[#111111] border-white/10 text-white" : "bg-white border-gray-200 text-slate-800"
                          }`}>
                            <p className="font-extrabold uppercase mb-1.5 text-xs text-[#C1121F]">{data.subject}</p>
                            <div className="space-y-1">
                              <p className="flex justify-between gap-4">
                                <span className="text-gray-400">{isBn ? "গড় প্রাপ্ত নম্বর %" : "Marks %"}:</span>
                                <span className="font-black text-emerald-400">{data.marksPercent}%</span>
                              </p>
                              <p className="flex justify-between gap-4">
                                <span className="text-gray-400">{isBn ? "মোট প্রচেষ্টা" : "Attempts"}:</span>
                                <span className="font-black">{data.attempts} Qs</span>
                              </p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Targeted Revision: Weak Chapters List & Recommendations (col-span-5) */}
        <div className={`lg:col-span-5 p-5 rounded-2xl border flex flex-col justify-between ${
          isDark ? "bg-black/40 border-white/5" : "bg-slate-50/50 border-gray-150 text-slate-800"
        }`}>
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[10px] font-mono font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                🎯 {isBn ? "টার্গেটেড রিভিশন হাব" : "TARGETED REVISION ACTION"}
              </span>
              <span className={`text-[9px] font-mono font-bold border px-2 py-0.5 rounded ${
                isDark ? "text-gray-400 bg-black/30 border-white/5" : "text-slate-600 bg-slate-100 border-slate-200"
              }`}>
                {isBn ? "অগ্রাধিকার তালিকা" : "PRIORITY PATHS"}
              </span>
            </div>
            <p className={`text-[11.5px] leading-relaxed mb-4 ${isDark ? "text-gray-400" : "text-slate-600"}`}>
              {isBn 
                ? "দুর্বলতম অধ্যায়গুলোর স্বয়ংক্রিয় বিশ্লেষণ এবং তা সংশোধনের জন্য কুইক অনুশীলন লিঙ্ক।" 
                : "Automated isolation of your weakest chapters to direct focused drilling and convert gaps to strengths."}
            </p>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[220px] pr-1.5 scrollbar-thin">
            {displayWeakChapters.length === 0 ? (
              <div className="py-10 text-center font-mono">
                <span className="text-2xl">🌱</span>
                <p className="text-[11px] text-gray-500 mt-2">
                  {isBn ? "বিশ্লেষণ শুরু করার জন্য প্রথমে অনুশীলনী কুইজে অংশ নিন।" : "No weak sectors detected yet."}
                </p>
              </div>
            ) : (
              displayWeakChapters.map((chap, cIdx) => {
                let badgeCol = "bg-red-500/10 text-red-400 border-red-500/20";
                if (chap.accuracy >= 60 && chap.accuracy < 75) {
                  badgeCol = "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
                } else if (chap.accuracy >= 75) {
                  badgeCol = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                }

                return (
                  <div 
                    key={cIdx} 
                    className={`p-3 border rounded-xl flex items-center justify-between gap-3 hover:border-white/10 transition-all ${
                      isDark ? "bg-[#0c0c0c]/90 border-white/5 text-white" : "bg-white border-gray-200 text-slate-850"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[8.5px] font-mono font-bold uppercase text-gray-400">
                          {getSubjectTranslation(chap.subject, isBn)}
                        </span>
                        <span className={`text-[8px] font-mono font-black px-1.5 py-0.2 rounded border ${badgeCol}`}>
                          {chap.accuracy}% {isBn ? "সঠিকতা" : "Accuracy"}
                        </span>
                      </div>
                      <h4 className={`text-xs font-black mt-1 truncate max-w-[200px] ${isDark ? "text-white" : "text-slate-900"}`}>
                        {chap.name}
                      </h4>
                    </div>

                    <button
                      onClick={() => handleQuickPractice(chap.name)}
                      className="px-2.5 py-1.5 bg-red-950/40 hover:bg-[#C1121F] border border-[#C1121F]/30 hover:border-transparent text-white rounded-lg text-[9px] font-mono font-black tracking-widest transition flex items-center gap-1 uppercase shrink-0 cursor-pointer"
                    >
                      <Play className="w-2.5 h-2.5 text-[#C1121F] fill-[#C1121F] hover:text-white hover:fill-white shrink-0" />
                      <span>{isBn ? "অনুশীলন" : "DRILL"}</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-4 pt-3.5 border-t border-white/[0.04] flex items-center justify-between text-[10px] font-mono text-gray-500">
            <span>💡 {isBn ? "দুর্বল ক্ষেত্রগুলো ৬০% এর উপরে তুলুন" : "Elevate weak targets above 60%"}</span>
            <span className="font-extrabold text-[#C1121F] hover:underline cursor-pointer flex items-center gap-0.5" onClick={() => setSelectedSubject("All")}>
              {isBn ? "সব দেখুন" : "View All"} →
            </span>
          </div>
        </div>
      </div>

      {/* INTERACTIVE SUBJECT MAP & FILTER CONTROL TRAYS */}
      <div className="bg-black/20 border border-white/5 rounded-2xl p-4 mb-6 flex flex-col md:flex-row items-center justify-between gap-4 font-sans overflow-hidden">
        
        {/* Subject Filter Row */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 w-full md:w-auto scrollbar-none scroll-smooth justify-start -mx-4 px-4 sm:mx-0 sm:px-0 flex-nowrap whitespace-nowrap">
          <span className="text-xs text-gray-400 font-mono font-bold uppercase mr-2 flex items-center gap-1 shrink-0">
            <Filter className="w-3.5 h-3.5 text-[#C1121F]" />
            {isBn ? "ফিল্টার:" : "FILTER:"}
          </span>
          {["All", "Biology", "Chemistry", "Physics", "English", "GK"].map((sub) => (
            <button
              key={sub}
              onClick={() => setSelectedSubject(sub)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition duration-200 cursor-pointer shrink-0 ${
                selectedSubject === sub
                  ? "bg-[#C1121F] text-white border border-[#C1121F]/30 shadow-md shadow-[#C1121F]/20"
                  : isDark
                    ? "bg-[#111] hover:bg-[#1A1A1A] text-gray-400 hover:text-white border border-white/5"
                    : "bg-red-50/50 hover:bg-red-50 text-slate-600 hover:text-[#C1121F] border border-red-100"
              }`}
            >
              {sub === "All" ? (isBn ? "সব বিষয় 📋" : "All Subjects 📋") : getSubjectTranslation(sub, isBn)}
            </button>
          ))}
        </div>

        {/* Search & Sort HUD Row */}
        <div className="flex items-center gap-3 w-full md:w-auto shrink-0 justify-end">
          {/* Search Input */}
          <div className="relative flex-1 md:flex-initial">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isBn ? "অধ্যায় বা বিষয় খুঁজুন..." : "Search chapters..."}
              className="pl-8.5 pr-4 py-2 bg-black/40 text-white placeholder-gray-600 text-xs border border-white/10 rounded-xl focus:outline-none focus:border-[#C1121F] transition w-full md:w-48 font-medium font-display"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="relative shrink-0">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="pl-2.5 pr-8 py-2 bg-[#121212] text-gray-300 text-xs border border-white/10 rounded-xl focus:outline-none focus:border-[#C1121F] transition cursor-pointer font-bold font-mono uppercase appearance-none"
            >
              <option value="accuracy-asc">⚠️ {isBn ? "সর্বনিম্ন নম্বর %" : "Lowest Marks % First"}</option>
              <option value="accuracy-desc">🔥 {isBn ? "সর্বোচ্চ নম্বর %" : "Highest Marks % First"}</option>
              <option value="attempts-desc">📈 {isBn ? "সর্বোচ্চ অনুশীলন" : "Most Attempts"}</option>
              <option value="attempts-asc">📉 {isBn ? "সর্বনিম্ন অনুশীলন" : "Least Attempts"}</option>
            </select>
            <div className="absolute right-3 top-2.5 text-gray-500 pointer-events-none">
              <ArrowUpDown className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>

      {/* ADVANCED ADVANCED CHAPTER ANALYSIS GRID */}
      <h3 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-widest block mb-4.5 flex items-center gap-1">
        <BookMarked className="w-4 h-4 text-yellow-500" />
        <span>{isBn ? "📋 সিলেবাস অধ্যায় বিশ্লেষণ ও কুইক অনুশীলন প্যানেল" : "📋 COGNITIVE SUBJECT SYLLABUS DISSECTIONS"}</span>
      </h3>

      {filteredChapters.length === 0 ? (
        <div className="p-10 text-center border border-white/5 bg-black/20 rounded-2xl flex flex-col items-center justify-center">
          <span className="text-4xl mb-2">🔍</span>
          <p className="text-xs font-mono text-gray-400">
            {isBn ? "কোনো ম্যাচিং অধ্যায় পাওয়া যায়নি।" : "NO MATCHING CALIBRATIONS DETECTED."}
          </p>
          <p className="text-[10px] text-gray-500 font-display mt-1">
            {isBn ? "অন্য সাবজেক্ট বা সার্চ ফিল্টার দিয়ে ট্রাই করুন" : "Adjust your filters or initiate new mock trials in Combat Practice."}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {filteredChapters.map((item, index) => {
            const isChapterExpanded = !!expandedChapters[item.name];
            const marksPercent = item.marksPercent;

            // Custom diagnostic status styles
            let statusLabel = isBn ? "সুরক্ষিত" : "SECURED";
            let statusColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
            let textGlow = "shadow-[0_0_15px_rgba(16,185,129,0.15)]";
            let progressCol = "bg-emerald-500";

            if (marksPercent < 60) {
              statusLabel = isBn ? "আশঙ্কাজনক রিভিশন" : "CRITICAL WARNING";
              statusColor = "text-[#C1121F] bg-red-950/20 border-[#C1121F]/30 animate-pulse";
              textGlow = "shadow-[0_0_15px_rgba(193,18,31,0.25)]";
              progressCol = "bg-[#C1121F]";
            } else if (marksPercent < 75) {
              statusLabel = isBn ? "উন্নতি প্রয়োজন" : "STRENGTHENING REQ";
              statusColor = "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
              textGlow = "shadow-[0_0_15px_rgba(234,179,8,0.15)]";
              progressCol = "bg-yellow-500";
            }

            // Get revision guideline
            const revisionData = REVISION_PATHS[item.name] || defaultPathway;

            return (
              <motion.div
                key={item.name}
                layout
                className={`p-4 bg-[#090909] border hover:border-white/10 rounded-2xl flex flex-col justify-between transition-all duration-300 ${
                  isChapterExpanded ? "border-[#C1121F]/40 bg-[#0F0A0A]" : "border-white/5"
                }`}
              >
                <div className="flex justify-between items-start gap-3 mb-3 font-sans">
                  <div>
                    <span className="text-[9.5px] uppercase font-mono tracking-wider text-gray-500 font-bold block mb-1">
                      {getSubjectTranslation(item.subject, isBn)} • {item.attempts} {isBn ? "বার উত্তর" : "attempts"} (নম্বর: {item.netMarks})
                    </span>
                    <span className="font-extrabold text-white text-xs md:text-sm block tracking-wide">{item.name}</span>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-md border ${statusColor} ${textGlow}`}>
                      {statusLabel}
                    </span>
                    <span className="text-xs font-mono font-black text-white">
                      {marksPercent}% {isBn ? "নম্বর" : "Marks"}
                    </span>
                  </div>
                </div>

                {/* Progress bar visualizer */}
                <div className="w-full bg-[#111] h-1.5 rounded-full overflow-hidden mt-1 mb-4 flex">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${progressCol}`}
                    style={{ width: `${marksPercent}%` }}
                  ></div>
                </div>

                {/* Expansion button and quick practice trigger */}
                <div className="flex items-center justify-between border-t border-white/[0.04] pt-3 mt-1.5">
                  <button
                    onClick={() => toggleChapterExpansion(item.name)}
                    className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase text-gray-400 hover:text-white transition cursor-pointer"
                  >
                    {isChapterExpanded ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5 text-[#C1121F]" />
                        <span>{isBn ? "বিশ্লেষণ বন্ধ" : "HIDE ANALYSIS"}</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5 text-[#C1121F]" />
                        <span>{isBn ? "বিস্তারিত বিশ্লেষণ" : "EXPAND DIAGNOSTIC"}</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleQuickPractice(item.name)}
                    className="px-2.5 py-1.5 bg-red-950/40 hover:bg-[#C1121F] border border-[#C1121F]/30 hover:border-transparent text-white rounded-lg text-[9px] font-mono font-black tracking-widest transition flex items-center gap-1 uppercase cursor-pointer"
                  >
                    <Play className="w-2.5 h-2.5 text-[#C1121F] fill-[#C1121F] hover:text-white hover:fill-white shrink-0" />
                    <span>{isBn ? "অনুশীলন" : "DRILL NOW"}</span>
                  </button>
                </div>

                {/* Expandable Panel */}
                <AnimatePresence>
                  {isChapterExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 pt-4 border-t border-white/5 space-y-4 font-sans text-xs">
                        
                        {/* Custom sub-breakdown stats */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-[#121212]/80 border border-white/5 p-2 rounded-xl text-[10.5px]">
                            <span className="block text-[9px] font-mono text-gray-500 uppercase tracking-wide">
                              {isBn ? "সঠিক উত্তর" : "CORRECT LOGS"}
                            </span>
                            <span className="text-emerald-400 font-extrabold text-sm">{item.correct} / {item.attempts}</span>
                          </div>
                          <div className="bg-[#121212]/80 border border-white/5 p-2 rounded-xl text-[10.5px]">
                            <span className="block text-[9px] font-mono text-gray-500 uppercase tracking-wide">
                              {isBn ? "ভুল সংশোধন রেকর্ড" : "MISTAKE RECORD"}
                            </span>
                            <span className="text-red-400 font-extrabold text-sm">{item.incorrect} / {item.attempts}</span>
                          </div>
                        </div>

                        {/* Chapter focused key terms */}
                        <div className="space-y-1">
                          <span className="text-[9.5px] font-mono text-gray-400 uppercase font-black tracking-wider block">
                            🔑 {isBn ? "মূল ফোকাস টপিকসমূহ:" : "KEY FOCUS COGNITIVE CONCEPTS:"}
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {revisionData.focusConcepts.map((concept, cIdx) => (
                              <span
                                key={cIdx}
                                className="px-2 py-0.5 bg-black text-gray-400 border border-white/5 rounded-md text-[9px] font-mono font-semibold"
                              >
                                {concept}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Direct textbook author guidelines */}
                        <div className="p-3.5 bg-red-950/10 border border-[#C1121F]/20 rounded-xl space-y-2">
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="font-extrabold text-[#C1121F] uppercase tracking-wide flex items-center gap-1">
                              <BrainCircuit className="w-3.5 h-3.5" />
                              {isBn ? "ট্যাক্টিকাল হ্যাক" : "TACTICAL PREP HACK"}
                            </span>
                            <span className="text-gray-400 font-bold">
                              {getBookTranslation(revisionData.book, isBn)}
                            </span>
                          </div>

                          <p className="text-[11px] leading-relaxed text-gray-300 font-display">
                            {isBn ? "এই অধ্যায়টি ক্লিয়ার করতে লেখকের গুরুত্বপূর্ণ গাইডলাইন:" : "Author advice for optimizing chapter memory retention:"}
                          </p>

                          <ul className="space-y-1.5 pl-1">
                            {revisionData.bulletHacks.slice(0, 2).map((hack, hIdx) => (
                              <li key={hIdx} className="text-[10.5px] leading-relaxed text-gray-300 flex items-start gap-1.5">
                                <span className="text-[#C1121F] shrink-0 mt-0.5">•</span>
                                <span>{hack}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

    </motion.div>
  );
}
