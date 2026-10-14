import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  FileText,
  Download,
  ExternalLink,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Sun,
  Moon,
  BookOpen,
  Bookmark,
  BookmarkCheck,
  Edit3,
  Copy,
  Check,
  Printer,
  Sparkles,
  AlertCircle,
  Eye,
  Layers,
  Search,
  CheckCircle2,
  RefreshCw,
  Share2,
  Compass,
  Lightbulb,
  Tag,
  Clock,
  Trash2
} from "lucide-react";
import { CourseMaterial, Course, Batch } from "../../types/courseTypes";
import { playSound } from "../../audio";

interface PdfReaderModalProps {
  material: CourseMaterial | null;
  course?: Course;
  batch?: Batch;
  isOpen: boolean;
  onClose: () => void;
  language?: "bn" | "en";
  theme?: "light" | "dark";
  userId?: string;
}

type ViewerMode = "direct" | "google_docs" | "smart_summary";
type FilterTheme = "default" | "dark" | "sepia" | "eye_care";

// High-Yield summaries for common medical subjects to enhance offline/quick studying
const SUBJECT_HIGH_YIELDS: Record<string, { summary: string[]; mnemonics: string[]; pyqNotes: string[] }> = {
  Biology: {
    summary: [
      "কোষপ্রাচীরের প্রধান গাঠনিক উপাদান হলো সেলুলোজ, হেমিসেলুলোজ ও পেকটিন।",
      "মাইটোকন্ড্রিয়াকে কোষের শক্তিঘর বলা হয়; এতে নিজস্ব DNA ও 70S রাইবোজোম থাকে।",
      "গলগি বডিকে কোষের ট্রাফিক পুলিশ ও প্যাকেজিং সেন্টার বলা হয়।",
      "লাইসোজোম হাইড্রোলাইটিক এনজাইম ধারণ করে এবং ফ্যাগোসাইটোসিসে অংশ নেয়।",
      "প্লাস্টিডের মধ্যে ক্লোরোপ্লাস্ট সালোকসংশ্লেষণে মুখ্য ভূমিকা পালন করে।"
    ],
    mnemonics: [
      "কোষঝিল্লির ফ্লুইড মোজাইক মডেল: সিঙ্গার ও নিকলসন (১৯৭২) - 'লিপিড সমুদ্রে প্রোটিন হিমশৈল'",
      "দ্বিপদ নামকরণের প্রবক্তা: ক্যারোলাস লিনিয়াস (Systema Naturae - 1758)"
    ],
    pyqNotes: [
      "ম্যাট (MAT) বিগত ৫ বছরে কোষীয় অঙ্গাণুর কাজ এবং ক্রোমোজোম সংখ্যার উপর ৭টি প্রশ্ন এসেছে।",
      "অ্যামাইলেজ, ট্রিপসিন ও পেপসিন এনজাইমের ক্ষরণস্থল ও পিএইচ (pH) মান বারবার পরীক্ষায় আসে।"
    ]
  },
  Chemistry: {
    summary: [
      "জৈব যৌগের কার্যকরী মূলকের সক্রিয়তার ক্রম মুখস্থ রাখা ভর্তি পরীক্ষার জন্য অপরিহার্য।",
      "মারকভনিকভ ও অ্যান্টি-মারকভনিকভ (খারাশ) নীতি অনুযায়ী অপ্রতিসম অ্যালকিনে যুত বিক্রিয়া ঘটে।",
      "লুকাস বিকারক (অনুকূল ZnCl2 + গাঢ় HCl) দ্বারা ১°, ২° ও ৩° অ্যালকোহল শনাক্ত করা হয়।",
      "ফেহলিং দ্রবণ ও টলেন বিকারক দ্বারা অ্যালডিহাইড ও কিটোনের মধ্যে পার্থক্য নির্ণয় করা যায়।"
    ],
    mnemonics: [
      "বেনজিন বলয় সক্রিয়কারী মূলক: -OH, -NH2, -OCH3, -CH3 (অর্থো-প্যারা নির্দেশক)",
      "বেনজিন বলয় নিষ্ক্রিয়কারী মূলক: -NO2, -COOH, -CHO, -CN (মেটা নির্দেশক)"
    ],
    pyqNotes: [
      "জৈব রসায়ন থেকে প্রতি বছর মেডিকেলে ৮-১০টি প্রশ্ন থাকে, বিশেষ করে শনাক্তকারী পরীক্ষা ও নামীয় বিক্রিয়া।"
    ]
  },
  Physics: {
    summary: [
      "মহাকর্ষীয় ক্ষেত্র প্রাবল্য ও মহাকর্ষীয় বিভবের সমীকরণ ও একক বারবার আসে।",
      "সান্দ্রতা গুণাঙ্কের মাত্রা সমীকরণ: [M L^-1 T^-1] এবং একক Pa·s বা N·s/m²।",
      "ডপলার ক্রিয়ার কারণে উৎসের আপেক্ষিক গতির জন্য আপাত কম্পাঙ্কের পরিবর্তন ঘটে।",
      "আলোর ব্যতিচার ও অপবর্তনের মৌলিক শর্তসমূহ মুখস্থ রাখা আবশ্যক।"
    ],
    mnemonics: [
      "তড়িৎচৌম্বকীয় বর্ণালী তরঙ্গদৈর্ঘ্যের ক্রম: গামা < রঞ্জন < অতিবেগুনি < দৃশ্যমান < অবলোহিত < মাইক্রো < বেতার",
      "কাজ-শক্তি উপপাদ্য: প্রযুক্ত বল দ্বারা কৃতকাজ বস্তুর গতিশক্তির পরিবর্তনের সমান (W = ΔK)"
    ],
    pyqNotes: [
      "মেডিকেল ফিজিক্সে জটিল গাণিতিক হিসাবের চেয়ে একক, মাত্রা, সূত্র ও বাস্তব প্রয়োগ বেশি আসে।"
    ]
  },
  GK: {
    summary: [
      "মুক্তিযুদ্ধের ১১টি সেক্টর ও তাদের কমান্ডারদের তালিকা অত্যন্ত গুরুত্বপূর্ণ।",
      "মুজিবনগর সরকার শপথ গ্রহণ করে ১৯৭১ সালের ১৭ই এপ্রিল (মেহেরপুরের বৈদ্যনাথতলায়)।",
      "বাংলাদেশের জাতীয় প্রতীক, সংবিধানের মূলনীতি ও গুরুত্বপূর্ণ সংশোধনীসমূহ মুখস্থ রাখুন।",
      "ইউনেস্কো স্বীকৃত বাংলাদেশের বিশ্ব ঐতিহ্য: সুন্দরবন, ষাট গম্বুজ মসজিদ ও পাহাড়পুর বৌদ্ধ বিহার।"
    ],
    mnemonics: [
      "সেক্টর ১০: নৌ সেক্টর (কোনো স্থায়ী কমান্ডার ছিল না)",
      "সর্বকনিষ্ঠ খেতাবপ্রাপ্ত মুক্তিযোদ্ধা: শহীদুল ইসলাম লালু (বীর প্রতীক)"
    ],
    pyqNotes: [
      "মেডিকেল সাধারণ জ্ঞান ১০ নম্বরের মধ্যে মুক্তিযুদ্ধ ও বাংলাদেশের ইতিহাস থেকেই ৭-৮ নম্বর থাকে।"
    ]
  },
  English: {
    summary: [
      "Subject-Verb Agreement, Parallelism, Modifiers & Conditionals are core grammar pillars.",
      "Appropriate Prepositions & Idioms/Phrases account for ~40% of the English section.",
      "Synonyms & Antonyms must be practiced daily with contextual usage.",
      "Spelling correction (e.g. Committee, Millennium, Questionnaire, Bureaucracy)."
    ],
    mnemonics: [
      "Neither/Either singular rule: Neither the teacher nor the students ARE (proximity rule).",
      "No sooner had ... than | Scarcely had ... when | Hardely had ... when."
    ],
    pyqNotes: [
      "Previous 15 years' Medical and BCS English questions must be mastered thoroughly."
    ]
  }
};

export default function PdfReaderModal({
  material,
  course,
  batch,
  isOpen,
  onClose,
  language = "bn",
  theme = "dark",
  userId = "student"
}: PdfReaderModalProps) {
  const isBn = language === "bn";
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewerMode, setViewerMode] = useState<ViewerMode>("direct");
  const [filterTheme, setFilterTheme] = useState<FilterTheme>("default");
  const [zoomLevel, setZoomLevel] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"notes" | "highyield" | "info">("notes");
  const [userNote, setUserNote] = useState("");
  const [isSavedNote, setIsSavedNote] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Storage key for user study notes
  const notesStorageKey = material
    ? `medibridge_pdf_note_${userId}_${material.id}`
    : `medibridge_pdf_note_${userId}`;

  const bookmarkStorageKey = material
    ? `medibridge_pdf_bookmark_${userId}_${material.id}`
    : `medibridge_pdf_bookmark_${userId}`;

  // Load saved notes & bookmark on open
  useEffect(() => {
    if (material && isOpen) {
      setIsLoading(true);
      setLoadError(false);
      setZoomLevel(100);
      setRotation(0);
      try {
        const saved = localStorage.getItem(notesStorageKey);
        if (saved) setUserNote(saved);
        else setUserNote("");

        const bookmarked = localStorage.getItem(bookmarkStorageKey);
        setIsBookmarked(bookmarked === "true");
      } catch (e) {
        console.warn("Could not read local notes:", e);
      }
    }
  }, [material?.id, isOpen, notesStorageKey, bookmarkStorageKey]);

  // Handle keyboard shortcuts (ESC, +, -, r, f)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "+" || e.key === "=") {
        setZoomLevel((prev) => Math.min(200, prev + 15));
      } else if (e.key === "-") {
        setZoomLevel((prev) => Math.max(50, prev - 15));
      } else if (e.key.toLowerCase() === "r" && (e.ctrlKey || e.metaKey)) {
        // Allow default reload
      } else if (e.key.toLowerCase() === "r" && !e.ctrlKey && !e.metaKey) {
        setRotation((prev) => (prev + 90) % 360);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !material) return null;

  // Format file URL for embedded viewing
  const getEmbeddableUrl = (rawUrl: string, mode: ViewerMode): string => {
    if (!rawUrl) return "";

    // Convert Google Drive links to preview embed
    if (rawUrl.includes("drive.google.com")) {
      const match = rawUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return `https://drive.google.com/file/d/${match[1]}/preview`;
      }
    }

    if (mode === "google_docs") {
      return `https://docs.google.com/viewer?url=${encodeURIComponent(rawUrl)}&embedded=true`;
    }

    return rawUrl;
  };

  const currentEmbedUrl = getEmbeddableUrl(material.fileUrl, viewerMode);

  // Save note to local storage
  const handleSaveNote = (text: string) => {
    setUserNote(text);
    setIsSavedNote(true);
    try {
      localStorage.setItem(notesStorageKey, text);
    } catch (e) {
      console.warn("Save note error:", e);
    }
    setTimeout(() => setIsSavedNote(false), 2000);
  };

  // Toggle Bookmark
  const handleToggleBookmark = () => {
    playSound("click");
    const next = !isBookmarked;
    setIsBookmarked(next);
    try {
      localStorage.setItem(bookmarkStorageKey, String(next));
    } catch (e) {}
  };

  // Insert Quick Medical Note Tag
  const handleInsertTag = (tagText: string) => {
    playSound("click");
    const newNote = userNote ? `${userNote}\n${tagText} ` : `${tagText} `;
    handleSaveNote(newNote);
  };

  // Copy Link
  const handleCopyLink = () => {
    playSound("click");
    navigator.clipboard.writeText(material.fileUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Get CSS filter for reading themes
  const getFilterStyle = (): string => {
    switch (filterTheme) {
      case "dark":
        return "invert(0.9) hue-rotate(180deg) contrast(1.1) brightness(0.95)";
      case "sepia":
        return "sepia(0.45) contrast(0.92) brightness(1.02)";
      case "eye_care":
        return "sepia(0.2) hue-rotate(50deg) contrast(0.95) brightness(0.98)";
      default:
        return "none";
    }
  };

  const subjectData = SUBJECT_HIGH_YIELDS[material.subject] || SUBJECT_HIGH_YIELDS["Biology"];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-hidden">
        {/* Backdrop click */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: "spring", duration: 0.35, bounce: 0 }}
          className={`relative z-10 flex flex-col bg-[#0f1117] border border-white/15 shadow-2xl rounded-2xl sm:rounded-3xl overflow-hidden transition-all duration-300 ${
            isFullscreen
              ? "w-full h-full rounded-none border-none"
              : "w-full max-w-6xl h-[92vh] max-h-[1000px]"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* HEADER TOOLBAR */}
          <div className="bg-[#161a23] border-b border-white/10 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
            {/* Left: Document Info & Subject Badge */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-red-950/60 border border-red-500/30 flex items-center justify-center text-[#C1121F] shrink-0 shadow-sm">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-red-900/40 text-red-300 border border-red-500/30">
                    {material.subject}
                  </span>
                  {material.chapter && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/5 text-gray-300 border border-white/10 hidden sm:inline-block">
                      {material.chapter}
                    </span>
                  )}
                  {material.fileSize && (
                    <span className="text-[10px] font-mono text-gray-400 hidden md:inline-block">
                      • {material.fileSize}
                    </span>
                  )}
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-white truncate max-w-xs sm:max-w-md md:max-w-lg font-sans">
                  {material.title}
                </h3>
              </div>
            </div>

            {/* Middle: Reading Mode Controls & Zoom */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Reading Theme Selector */}
              <div className="bg-black/50 border border-white/10 rounded-xl p-1 flex items-center gap-1 font-mono text-[11px]">
                <button
                  onClick={() => { playSound("click"); setFilterTheme("default"); }}
                  title="Default (Original Paper)"
                  className={`px-2 py-1 rounded-lg transition ${
                    filterTheme === "default"
                      ? "bg-white/20 text-white font-bold"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => { playSound("click"); setFilterTheme("dark"); }}
                  title="Night / OLED Dark Mode"
                  className={`px-2 py-1 rounded-lg transition ${
                    filterTheme === "dark"
                      ? "bg-purple-600/50 text-white font-bold"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => { playSound("click"); setFilterTheme("sepia"); }}
                  title="Sepia (Warm Reading Paper)"
                  className={`px-2 py-1 rounded-lg transition ${
                    filterTheme === "sepia"
                      ? "bg-amber-700/60 text-amber-200 font-bold"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <span>📜</span>
                </button>
                <button
                  onClick={() => { playSound("click"); setFilterTheme("eye_care"); }}
                  title="Eye Protection (Soft Green Tone)"
                  className={`px-2 py-1 rounded-lg transition ${
                    filterTheme === "eye_care"
                      ? "bg-emerald-700/60 text-emerald-200 font-bold"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <span>🌿</span>
                </button>
              </div>

              {/* Zoom Controls */}
              <div className="hidden sm:flex items-center bg-black/50 border border-white/10 rounded-xl p-1 font-mono text-xs">
                <button
                  onClick={() => { playSound("click"); setZoomLevel((prev) => Math.max(50, prev - 15)); }}
                  title="Zoom Out (-)"
                  className="p-1 text-gray-400 hover:text-white rounded hover:bg-white/5 transition"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => { playSound("click"); setZoomLevel(100); }}
                  title="Reset Zoom"
                  className="px-2 py-0.5 text-[11px] font-bold text-gray-300 hover:text-white"
                >
                  {zoomLevel}%
                </button>
                <button
                  onClick={() => { playSound("click"); setZoomLevel((prev) => Math.min(200, prev + 15)); }}
                  title="Zoom In (+)"
                  className="p-1 text-gray-400 hover:text-white rounded hover:bg-white/5 transition"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Rotate Clockwise */}
              <button
                onClick={() => { playSound("click"); setRotation((prev) => (prev + 90) % 360); }}
                title="Rotate 90° Clockwise (R)"
                className="p-2 bg-black/50 border border-white/10 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl transition font-mono text-xs hidden md:flex items-center gap-1"
              >
                <RotateCw className="w-3.5 h-3.5" />
                {rotation !== 0 && <span className="text-[10px]">{rotation}°</span>}
              </button>

              {/* Bookmark Toggle */}
              <button
                onClick={handleToggleBookmark}
                title={isBookmarked ? "Remove Bookmark" : "Bookmark this Note"}
                className={`p-2 rounded-xl border transition ${
                  isBookmarked
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : "bg-black/50 text-gray-400 hover:text-white border-white/10"
                }`}
              >
                {isBookmarked ? (
                  <BookmarkCheck className="w-4 h-4 text-amber-400 fill-amber-400" />
                ) : (
                  <Bookmark className="w-4 h-4" />
                )}
              </button>

              {/* Sidebar Notes & High-Yield Summary Toggle */}
              <button
                onClick={() => {
                  playSound("click");
                  setIsSidebarOpen(!isSidebarOpen);
                }}
                className={`px-3 py-1.5 rounded-xl border font-mono text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  isSidebarOpen
                    ? "bg-sky-500/20 text-sky-300 border-sky-500/40"
                    : "bg-black/50 text-gray-300 hover:text-white border-white/10"
                }`}
              >
                <Edit3 className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline">{isBn ? "নোটস & হাই-ইয়েল্ড" : "Notes & Summary"}</span>
              </button>

              {/* Fullscreen Toggle */}
              <button
                onClick={() => {
                  playSound("click");
                  setIsFullscreen(!isFullscreen);
                }}
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Viewer"}
                className="p-2 bg-black/50 border border-white/10 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl transition"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              {/* Close Button */}
              <button
                onClick={() => {
                  playSound("click");
                  onClose();
                }}
                className="p-2 bg-red-950/40 hover:bg-red-900 text-red-300 hover:text-white border border-red-500/30 rounded-xl transition cursor-pointer"
                title="Close PDF Reader (ESC)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* SECONDARY ENGINE SWITCHER BAR */}
          <div className="bg-[#12151c] px-4 py-1.5 border-b border-white/5 flex items-center justify-between text-[11px] font-mono text-gray-400">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase font-bold text-gray-500">{isBn ? "ভিউয়ার ইঞ্জিন:" : "Engine:"}</span>
              <button
                onClick={() => { setViewerMode("direct"); setIsLoading(true); }}
                className={`px-2.5 py-0.5 rounded transition ${
                  viewerMode === "direct" ? "bg-red-600/30 text-red-300 font-bold border border-red-500/40" : "hover:text-white"
                }`}
              >
                {isBn ? "ইন-অ্যাপ ডিরেক্ট ভিউয়ার" : "Direct In-App Viewer"}
              </button>
              <button
                onClick={() => { setViewerMode("google_docs"); setIsLoading(true); }}
                className={`px-2.5 py-0.5 rounded transition ${
                  viewerMode === "google_docs" ? "bg-sky-600/30 text-sky-300 font-bold border border-sky-500/40" : "hover:text-white"
                }`}
              >
                {isBn ? "গুগল ডক্স ক্লাউড ভিউয়ার" : "Google Cloud Viewer"}
              </button>
              <button
                onClick={() => { setViewerMode("smart_summary"); }}
                className={`px-2.5 py-0.5 rounded transition ${
                  viewerMode === "smart_summary" ? "bg-emerald-600/30 text-emerald-300 font-bold border border-emerald-500/40" : "hover:text-white"
                }`}
              >
                {isBn ? "হাই-ইয়েল্ড কুইক রিভিশন কার্ড" : "High-Yield Flash Revision"}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleCopyLink}
                className="hover:text-white flex items-center gap-1 transition"
                title="Copy PDF URL"
              >
                {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span className="hidden md:inline">{copiedLink ? (isBn ? "কপিকৃত!" : "Copied!") : (isBn ? "লিংক কপি" : "Copy Link")}</span>
              </button>

              <a
                href={material.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="hover:text-sky-300 flex items-center gap-1 transition"
                title="Open in new window"
              >
                <ExternalLink className="w-3 h-3 text-sky-400" />
                <span className="hidden md:inline">{isBn ? "নতুন ট্যাবে" : "New Tab"}</span>
              </a>

              <a
                href={material.fileUrl}
                download
                className="hover:text-emerald-300 flex items-center gap-1 text-emerald-400 font-bold transition"
                title="Download PDF"
              >
                <Download className="w-3 h-3" />
                <span className="hidden md:inline">{isBn ? "ডাউনলোড" : "Download"}</span>
              </a>
            </div>
          </div>

          {/* MAIN VIEWER + SIDEBAR CONTENT AREA */}
          <div className="flex-1 flex overflow-hidden relative bg-[#0b0d13]">
            {/* PDF Main Stage */}
            <div className="flex-1 h-full overflow-auto relative flex flex-col items-center justify-center p-2 sm:p-4">
              {viewerMode === "smart_summary" ? (
                /* SMART HIGH-YIELD REVISION MODE */
                <div className="w-full max-w-4xl h-full overflow-y-auto p-4 sm:p-6 space-y-6 font-sans">
                  <div className="p-6 bg-gradient-to-r from-red-950/40 via-[#161a23] to-[#12151c] border border-red-500/30 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-red-300 bg-red-900/50 px-2.5 py-0.5 rounded-full border border-red-500/30">
                        ⚡ {isBn ? "স্পেশাল হাই-ইয়েল্ড মেডিকেল সামারি" : "HIGH-YIELD MEDICAL REVISION NOTES"}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">
                        {material.subject} • {material.chapter || "General"}
                      </span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-black text-white font-display">
                      {material.title}
                    </h2>
                    <p className="text-xs text-gray-300 leading-relaxed font-mono">
                      {isBn
                        ? "মেডিকেল ভর্তি পরীক্ষার জন্য সবচেয়ে গুরুত্বপূর্ণ পয়েন্ট ও শর্টকাট টেকনিকসমূহ দ্রুত রিভিশনের জন্য নিচে সাজানো হলো।"
                        : "Crucial medical admission high-yield highlights and memory aids for fast pre-exam consolidation."}
                    </p>
                  </div>

                  {/* High Yield Key Points */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-white uppercase font-mono flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-[#FFD700]" />
                      <span>{isBn ? "টপ হাই-ইয়েল্ড পয়েন্টসমূহ (Must-Memorize)" : "Top High-Yield Core Concepts"}</span>
                    </h3>
                    <div className="grid grid-cols-1 gap-2.5">
                      {subjectData.summary.map((pt, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 bg-[#161a23] border border-white/10 rounded-xl flex items-start gap-3 text-xs text-gray-200 leading-relaxed font-sans"
                        >
                          <span className="w-5 h-5 rounded-full bg-red-950 text-red-400 flex items-center justify-center font-bold text-[11px] shrink-0 font-mono border border-red-500/30">
                            {idx + 1}
                          </span>
                          <span>{pt}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Mnemonics / Shortcuts */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-white uppercase font-mono flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span>{isBn ? "স্মার্ট মনে রাখার ছন্দ ও শর্টকাট" : "Medical Mnemonics & Memory Aids"}</span>
                    </h3>
                    <div className="grid grid-cols-1 gap-2.5">
                      {subjectData.mnemonics.map((mn, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 bg-purple-950/20 border border-purple-500/30 rounded-xl flex items-start gap-3 text-xs text-purple-200 leading-relaxed font-sans"
                        >
                          <span className="text-purple-400 font-bold shrink-0">💡</span>
                          <span>{mn}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Past Year Questions (PYQ) Insights */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-white uppercase font-mono flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-400" />
                      <span>{isBn ? "বিগত বছরের প্রশ্ন পর্যালোচনা ও ইনসাইট" : "Past Exam Trends & Frequency"}</span>
                    </h3>
                    <div className="grid grid-cols-1 gap-2.5">
                      {subjectData.pyqNotes.map((py, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 bg-emerald-950/20 border border-emerald-500/30 rounded-xl flex items-start gap-3 text-xs text-emerald-200 leading-relaxed font-sans"
                        >
                          <span className="text-emerald-400 font-bold shrink-0">✓</span>
                          <span>{py}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 flex items-center justify-center">
                    <button
                      onClick={() => setViewerMode("direct")}
                      className="px-6 py-2.5 bg-[#C1121F] hover:bg-red-600 text-white font-bold text-xs font-mono uppercase rounded-xl transition flex items-center gap-2 shadow-lg cursor-pointer"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>{isBn ? "মূল PDF ডকুমেন্ট ভিউয়ারে ফিরে যান" : "Return to Original PDF Document"}</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* LIVE EMBEDDED PDF IFRAME / OBJECT */
                <div
                  className="w-full h-full flex items-center justify-center relative transition-transform duration-200"
                  style={{
                    transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
                    transformOrigin: "center center"
                  }}
                >
                  {/* Loading Spinner */}
                  {isLoading && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0b0d13] space-y-3 font-mono">
                      <div className="w-10 h-10 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
                      <span className="text-xs text-gray-400">
                        {isBn ? "ডকুমেন্ট লোড হচ্ছে... অনুগ্রহ করে অপেক্ষা করুন" : "Rendering PDF document in reader..."}
                      </span>
                    </div>
                  )}

                  {/* Fallback Warning / Alternate Button */}
                  {loadError ? (
                    <div className="p-8 bg-[#161a23] border border-white/10 rounded-2xl text-center space-y-4 max-w-md font-mono">
                      <AlertCircle className="w-12 h-12 text-amber-400 mx-auto" />
                      <h4 className="text-sm font-bold text-white">
                        {isBn ? "ব্রাউজার রেস্ট্রিকশন বা ব্লক হয়েছে" : "Direct Embed Restricted by Source"}
                      </h4>
                      <p className="text-xs text-gray-400">
                        {isBn
                          ? "এই ফাইলটি গুগল ডক্স ক্লাউড ভিউয়ার কিংবা সরাসরি ব্রাউজার ট্যাবে দ্রুত দেখতে নিচের বাটনে ক্লিক করুন।"
                          : "This PDF provider blocks direct iframe embedding. Switch to Google Cloud viewer or open in new tab."}
                      </p>
                      <div className="flex items-center justify-center gap-2 pt-2">
                        <button
                          onClick={() => {
                            setViewerMode("google_docs");
                            setLoadError(false);
                            setIsLoading(true);
                          }}
                          className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl transition"
                        >
                          {isBn ? "গুগল ক্লাউড ভিউয়ার ট্রাই করুন" : "Try Google Cloud Viewer"}
                        </button>
                        <a
                          href={material.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition"
                        >
                          {isBn ? "নতুন ট্যাবে খুলুন" : "Open in New Tab"}
                        </a>
                      </div>
                    </div>
                  ) : (
                    <iframe
                      ref={iframeRef}
                      src={currentEmbedUrl}
                      title={material.title}
                      onLoad={() => setIsLoading(false)}
                      onError={() => {
                        setIsLoading(false);
                        setLoadError(true);
                      }}
                      className="w-full h-full rounded-xl border border-white/10 bg-white shadow-2xl transition-all duration-300"
                      style={{
                        filter: getFilterStyle()
                      }}
                      allow="autoplay; fullscreen"
                    />
                  )}
                </div>
              )}
            </div>

            {/* SIDEBAR: Student Study Notes & High-Yield Summary */}
            <AnimatePresence>
              {isSidebarOpen && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 340, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="h-full bg-[#141720] border-l border-white/10 flex flex-col shrink-0 overflow-hidden font-mono z-30 shadow-2xl"
                >
                  {/* Sidebar Header */}
                  <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-[#181c27]">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSidebarTab("notes")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                          sidebarTab === "notes"
                            ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                            : "text-gray-400 hover:text-white"
                        }`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>{isBn ? "আমার নোটস" : "My Notes"}</span>
                      </button>
                      <button
                        onClick={() => setSidebarTab("highyield")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                          sidebarTab === "highyield"
                            ? "bg-red-500/20 text-red-300 border border-red-500/30"
                            : "text-gray-400 hover:text-white"
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-red-400" />
                        <span>{isBn ? "হাই-ইয়েল্ড" : "Key Points"}</span>
                      </button>
                    </div>

                    <button
                      onClick={() => setIsSidebarOpen(false)}
                      className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Sidebar Body */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {sidebarTab === "notes" ? (
                      /* STUDENT STUDY SCRATCHPAD */
                      <div className="space-y-3 flex flex-col h-full">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-gray-400 font-bold uppercase flex items-center gap-1">
                            <span>📝</span> {isBn ? "স্টাডি স্ক্র্যাচপ্যাড" : "Study Scratchpad"}
                          </span>
                          {isSavedNote && (
                            <span className="text-emerald-400 text-[10px] flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              {isBn ? "সংরক্ষিত ✓" : "Saved ✓"}
                            </span>
                          )}
                        </div>

                        {/* Quick Medical Tags */}
                        <div className="space-y-1">
                          <span className="text-[10px] text-gray-500 uppercase block font-bold">
                            {isBn ? "কুইক ট্যাগ যুক্ত করুন:" : "Insert Quick Note Tag:"}
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              onClick={() => handleInsertTag("📌 [High Yield]:")}
                              className="px-2 py-0.5 bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-500/30 rounded text-[10px] font-bold"
                            >
                              📌 High Yield
                            </button>
                            <button
                              onClick={() => handleInsertTag("⚡ [Must Memorize]:")}
                              className="px-2 py-0.5 bg-amber-950/60 hover:bg-amber-900 text-amber-300 border border-amber-500/30 rounded text-[10px] font-bold"
                            >
                              ⚡ Memorize
                            </button>
                            <button
                              onClick={() => handleInsertTag("❓ [Doubt / Ask Mentor]:")}
                              className="px-2 py-0.5 bg-sky-950/60 hover:bg-sky-900 text-sky-300 border border-sky-500/30 rounded text-[10px] font-bold"
                            >
                              ❓ Doubt
                            </button>
                            <button
                              onClick={() => handleInsertTag("🎯 [PYQ Question]:")}
                              className="px-2 py-0.5 bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-bold"
                            >
                              🎯 PYQ
                            </button>
                          </div>
                        </div>

                        {/* Note Textarea */}
                        <textarea
                          value={userNote}
                          onChange={(e) => handleSaveNote(e.target.value)}
                          placeholder={
                            isBn
                              ? "পিডিএফ পড়ার সময় গুরুত্বপূর্ণ পয়েন্ট, টেক্সটবুক রেফারেন্স বা প্রশ্ন এখানে নোট করে রাখুন... (স্বয়ংক্রিয়ভাবে সেভ হবে)"
                              : "Jot down high-yield notes, memory tricks, or questions while reading... (Auto-saved)"
                          }
                          className="w-full flex-1 min-h-[220px] p-3 bg-black/60 border border-white/10 focus:border-sky-500 rounded-xl text-xs text-white placeholder-gray-500 outline-none resize-none font-sans leading-relaxed transition"
                        />

                        {/* Note Actions */}
                        <div className="flex items-center justify-between pt-1 text-xs">
                          <button
                            onClick={() => {
                              if (window.confirm(isBn ? "আপনি কি এই নোট মুছে ফেলতে চান?" : "Clear all saved notes for this document?")) {
                                handleSaveNote("");
                              }
                            }}
                            className="text-red-400 hover:text-red-300 text-[11px] flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>{isBn ? "নোট মুছুন" : "Clear"}</span>
                          </button>

                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(userNote);
                              playSound("click");
                              setIsSavedNote(true);
                              setTimeout(() => setIsSavedNote(false), 2000);
                            }}
                            className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{isBn ? "কপি নোটস" : "Copy Notes"}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* HIGH-YIELD HIGHLIGHTS TAB IN SIDEBAR */
                      <div className="space-y-4">
                        <div className="p-3 bg-red-950/30 border border-red-500/30 rounded-xl space-y-1">
                          <span className="text-[10px] font-bold text-red-300 uppercase block">
                            {material.subject} Fast Revision
                          </span>
                          <p className="text-xs text-white font-sans font-bold">
                            {material.chapter || material.title}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <span className="text-[11px] font-bold text-gray-300 uppercase block">
                            💡 Core Points:
                          </span>
                          {subjectData.summary.map((pt, idx) => (
                            <div
                              key={idx}
                              className="p-2.5 bg-black/40 border border-white/5 rounded-lg text-[11px] text-gray-300 font-sans leading-relaxed flex items-start gap-2"
                            >
                              <span className="text-red-400 font-bold text-[10px] shrink-0 font-mono mt-0.5">•</span>
                              <span>{pt}</span>
                            </div>
                          ))}
                        </div>

                        <div className="space-y-2 pt-2">
                          <span className="text-[11px] font-bold text-purple-300 uppercase block">
                            ✨ Mnemonics:
                          </span>
                          {subjectData.mnemonics.map((mn, idx) => (
                            <div
                              key={idx}
                              className="p-2.5 bg-purple-950/30 border border-purple-500/20 rounded-lg text-[11px] text-purple-200 font-sans leading-relaxed"
                            >
                              {mn}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* FOOTER BAR */}
          <div className="bg-[#12151c] border-t border-white/10 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-gray-400 shrink-0">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-[#FFD700]" />
                <span className="text-white font-bold">{material.subject}</span>
                <span className="text-gray-500">• {material.type.toUpperCase()}</span>
              </span>
              {batch && (
                <span className="hidden sm:inline text-gray-500">• Batch: {batch.batchName}</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-500 hidden md:inline">
                {isBn ? "শর্টকাট: [Esc] বন্ধ | [+] জুম | [R] রোটেট" : "Shortcuts: [Esc] Close | [+] Zoom | [R] Rotate"}
              </span>

              <button
                onClick={() => {
                  playSound("click");
                  onClose();
                }}
                className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition cursor-pointer"
              >
                {isBn ? "বন্ধ করুন" : "Close Reader"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
