import React, { useState, useEffect, useRef } from "react";
import { 
  Search, 
  X, 
  BookOpen, 
  Map, 
  Sparkles, 
  ChevronRight, 
  FileText, 
  HelpCircle, 
  Check, 
  CornerDownLeft, 
  Globe, 
  Trophy, 
  Book
} from "lucide-react";
import { playSound } from "../audio";
import { db } from "../lib/backend";
import { collection, getDocs, query as firestoreQuery, limit } from "../lib/supabaseDb";
import { STARTER_QUESTIONS } from "../questionsData";
import { 
  TIMELINE_DATA, 
  BIR_SRESHTHO_DATA, 
  SECTOR_DATA, 
  ENGLISH_FLASHCARDS,
  GK_QUIZ_QUESTIONS
} from "./GkSection";
import { Question } from "../types";
import {
  CHAPTER_ENHANCED_DATA,
  TIMELINE_ENHANCED_DATA,
  HERO_ENHANCED_DATA,
  SECTOR_QUIZ_DATA,
  ENGLISH_ENHANCED_DATA,
  EnhancedQuizQuestion
} from "./GlobalSearchData";

interface GlobalSearchProps {
  language: "bn" | "en";
  activeTab: string;
  setActiveTab: (tab: any) => void;
  theme: "light" | "dark";
}

interface SearchResultItem {
  id: string;
  type: "chapter" | "gk_timeline" | "gk_hero" | "gk_sector" | "english" | "question";
  titleBn: string;
  titleEn: string;
  subtitleBn?: string;
  subtitleEn?: string;
  badgeBn: string;
  badgeEn: string;
  rawItem: any; // original object for custom handling
}

const CHAPTERS_LIST = [
  { bn: "কোষ ও এর গঠন", en: "Cell Structure & Organelles", subject: "biology" },
  { bn: "কোষ বিভাজন", en: "Cell Division", subject: "biology" },
  { bn: "রক্ত ও রক্ত সংবহন", en: "Blood & Circulation", subject: "biology" },
  { bn: "উদ্ভিদ শারীরতত্ত্ব", en: "Plant Physiology", subject: "biology" },
  { bn: "প্রাণীর পরিচিতি ও শ্রেণীবিন্যাস", en: "Animal Classification", subject: "biology" },
  { bn: "গুণগত রসায়ন", en: "Qualitative Chemistry", subject: "chemistry" },
  { bn: "জৈব রসায়ন", en: "Organic Chemistry", subject: "chemistry" },
  { bn: "রাসায়নিক পরিবর্তন", en: "Chemical Change", subject: "chemistry" },
  { bn: "পরিমাণগত রসায়ন", en: "Quantitative Chemistry", subject: "chemistry" },
  { bn: "পরিবেশ রসায়ন", en: "Environmental Chemistry", subject: "chemistry" },
  { bn: "ভেক্টর", en: "Vectors", subject: "physics" },
  { bn: "মহাকর্ষ ও গ্র্যাভিটেশন", en: "Gravitation & Gravity", subject: "physics" },
  { bn: "যান্ত্রিক ধর্ম ও গতিবিদ্যা", en: "Mechanical Properties & Dynamics", subject: "physics" },
  { bn: "তাপগতিবিদ্যা", en: "Thermodynamics", subject: "physics" },
  { bn: "ভৌত আলোকবিজ্ঞান", en: "Physical Optics", subject: "physics" }
];

export default function GlobalSearch({ language, activeTab, setActiveTab, theme }: GlobalSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dbTopics, setDbTopics] = useState<any[]>([]);

  // Load Search Topics from Firestore on demand when modal opens
  const topicsLoadedRef = useRef(false);
  useEffect(() => {
    if (!isOpen || topicsLoadedRef.current) return;
    topicsLoadedRef.current = true;
    const q = firestoreQuery(collection(db, "search_topics"), limit(100));
    getDocs(q)
      .then((snapshot) => {
        const list = snapshot.docs.map(doc => ({
          id: doc.id,
          bn: doc.data().bn || "",
          en: doc.data().en || "",
          subject: doc.data().subject || "biology"
        }));
        setDbTopics(list);
      })
      .catch((error) => {
        console.warn("Failed to load search_topics in GlobalSearch:", error);
      });
  }, [isOpen]);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<"all" | "chapters" | "gk" | "questions">("all");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedDetailItem, setSelectedDetailItem] = useState<SearchResultItem | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<"content" | "info" | "quiz">("content");
  const [userSelectedQuizOption, setUserSelectedQuizOption] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [isQuizCorrect, setIsQuizCorrect] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const isBn = language === "bn";
  const isDark = theme === "dark";

  // Shortcut key combo handler (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        playSound("click");
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Handle open modal focus
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      setQuery("");
      setSelectedIndex(0);
      setSelectedDetailItem(null);
    }
  }, [isOpen]);

  // Standard static questions + custom loaded questions if possible
  const questionPool = STARTER_QUESTIONS as Question[];

  // Build searchable index
  const results: SearchResultItem[] = [];

  // 1. Chapters
  const activeChapters = dbTopics.length > 0 ? dbTopics : CHAPTERS_LIST;
  activeChapters.forEach((ch, idx) => {
    results.push({
      id: `chapter-${idx}`,
      type: "chapter",
      titleBn: ch.bn,
      titleEn: ch.en,
      subtitleBn: `${ch.subject.toUpperCase()} - অনুশীলনী ও ডায়েরি সেশন`,
      subtitleEn: `${ch.subject.toUpperCase()} - Practice and Diagnostics Arena`,
      badgeBn: "অধ্যায়",
      badgeEn: "Chapter",
      rawItem: ch
    });
  });

  // 2. GK Timeline
  TIMELINE_DATA.forEach((item, idx) => {
    results.push({
      id: `gk-timeline-${idx}`,
      type: "gk_timeline",
      titleBn: `${item.year}: ${item.titleBn}`,
      titleEn: `${item.year}: ${item.titleEn}`,
      subtitleBn: item.descBn,
      subtitleEn: item.descEn,
      badgeBn: "জিকে টাইমলাইন",
      badgeEn: "GK Timeline",
      rawItem: item
    });
  });

  // 3. Bir Sreshtho Heroes
  BIR_SRESHTHO_DATA.forEach((hero, idx) => {
    results.push({
      id: `gk-hero-${idx}`,
      type: "gk_hero",
      titleBn: `${hero.rankBn} ${hero.nameBn}`,
      titleEn: `${hero.rankEn} ${hero.nameEn}`,
      subtitleBn: `সেক্টর: ${hero.sector} • ${hero.keyFactBn}`,
      subtitleEn: `Sector: ${hero.sector} • ${hero.keyFactEn}`,
      badgeBn: "বীরশ্রেষ্ঠ",
      badgeEn: "Bir Sreshtho",
      rawItem: hero
    });
  });

  // 4. Liberation Sectors
  SECTOR_DATA.forEach((sec, idx) => {
    results.push({
      id: `gk-sector-${idx}`,
      type: "gk_sector",
      titleBn: `সেক্টর ${sec.id} - ${sec.hqBn}`,
      titleEn: `Sector ${sec.id} - ${sec.hqEn}`,
      subtitleBn: `অধিনায়ক: ${sec.commandersBn} • বিবরণ: ${sec.coverageBn}`,
      subtitleEn: `Commanders: ${sec.commandersEn} • Area: ${sec.coverageEn}`,
      badgeBn: "মুক্তিযুদ্ধ সেক্টর",
      badgeEn: "Liberation Sector",
      rawItem: sec
    });
  });

  // 5. English Flashcards
  ENGLISH_FLASHCARDS.forEach((card, idx) => {
    results.push({
      id: `english-${idx}`,
      type: "english",
      titleBn: `${card.word} (${card.categoryBn})`,
      titleEn: `${card.word} (${card.category})`,
      subtitleBn: `অর্থ: ${card.meaningBn} • উদাহরণ: ${card.sentenceBn}`,
      subtitleEn: `Meaning: ${card.meaningEn} • Example: ${card.sentenceEn}`,
      badgeBn: "ম্যাট ইংলিশ",
      badgeEn: "MAT English",
      rawItem: card
    });
  });

  // 6. Medical Questions (High-yield facts)
  questionPool.forEach((q, idx) => {
    results.push({
      id: `question-${idx}`,
      type: "question",
      titleBn: q.questionText,
      titleEn: q.questionText,
      subtitleBn: `বিকল্প: ${q.options.join(", ")} • ব্যাখ্যা: ${q.explanation}`,
      subtitleEn: `Options: ${q.options.join(", ")} • Explanation: ${q.explanation}`,
      badgeBn: `${q.subject} মেডিকেল প্রশ্ন`,
      badgeEn: `${q.subject} Medical Q`,
      rawItem: q
    });
  });

  // 7. GK High-Yield Quizzes (from GkSection GK_QUIZ_QUESTIONS)
  GK_QUIZ_QUESTIONS.forEach((q, idx) => {
    results.push({
      id: `gk-quiz-${idx}`,
      type: "question",
      titleBn: q.questionBn,
      titleEn: q.questionEn,
      subtitleBn: `বিকল্প: ${q.optionsBn.join(", ")} • ব্যাখ্যা: ${q.explanationBn}`,
      subtitleEn: `Options: ${q.optionsEn.join(", ")} • Explanation: ${q.explanationEn}`,
      badgeBn: "জিকে কুইজ",
      badgeEn: "GK Quiz",
      rawItem: {
        questionText: q.questionBn,
        questionTextEn: q.questionEn,
        options: q.optionsBn,
        optionsEn: q.optionsEn,
        correctAnswerIndex: q.correctIdx,
        explanation: q.explanationBn,
        explanationEn: q.explanationEn,
        subject: isBn ? "সাধারণ জ্ঞান" : "General Knowledge",
        chapter: isBn ? "মুক্তিযুদ্ধ ও বাংলাদেশ" : "Liberation & Bangladesh",
        difficulty: "Medium",
        source: "MAT Standard",
        category: "GK Quiz"
      }
    });
  });

  // Filter results by Query & Category
  const filteredResults = results.filter((item) => {
    // 1. Category Filter
    if (activeCategory === "chapters" && item.type !== "chapter") return false;
    if (activeCategory === "gk" && !["gk_timeline", "gk_hero", "gk_sector", "english"].includes(item.type)) return false;
    if (activeCategory === "questions" && item.type !== "question") return false;

    // 2. Search Query Filter
    if (!query) return true; // show all/recent suggestions if query empty

    const searchTerm = query.toLowerCase();
    const titleMatch = 
      item.titleBn.toLowerCase().includes(searchTerm) || 
      item.titleEn.toLowerCase().includes(searchTerm);
    const subtitleMatch = 
      (item.subtitleBn && item.subtitleBn.toLowerCase().includes(searchTerm)) || 
      (item.subtitleEn && item.subtitleEn.toLowerCase().includes(searchTerm));
    const badgeMatch = 
      item.badgeBn.toLowerCase().includes(searchTerm) || 
      item.badgeEn.toLowerCase().includes(searchTerm);

    return titleMatch || subtitleMatch || badgeMatch;
  });

  // Keyboard navigation inside search palette
  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredResults.length));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredResults.length) % Math.max(1, filteredResults.length));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredResults[selectedIndex]) {
          handleSelectResult(filteredResults[selectedIndex]);
        }
      }
    };
    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, [isOpen, filteredResults, selectedIndex]);

  const handleSelectResult = (item: SearchResultItem) => {
    playSound("click");
    setSelectedDetailItem(item);
    setActiveDetailTab("content");
    setUserSelectedQuizOption(null);
    setQuizSubmitted(false);
    setIsQuizCorrect(false);
  };

  const getEnhancedDetails = (item: SearchResultItem) => {
    if (item.type === "chapter") {
      const idx = parseInt(item.id.replace("chapter-", ""));
      return CHAPTER_ENHANCED_DATA[idx];
    }
    if (item.type === "gk_timeline") {
      return TIMELINE_ENHANCED_DATA[item.rawItem.year];
    }
    if (item.type === "gk_hero") {
      return HERO_ENHANCED_DATA[item.rawItem.nameEn];
    }
    if (item.type === "gk_sector") {
      return SECTOR_QUIZ_DATA[item.rawItem.id];
    }
    if (item.type === "english") {
      return ENGLISH_ENHANCED_DATA[item.rawItem.word];
    }
    return null;
  };

  const handleSelectQuizOption = (optionIdx: number, correctIdx: number) => {
    if (quizSubmitted) return;
    setUserSelectedQuizOption(optionIdx);
    setQuizSubmitted(true);
    const isCorrect = optionIdx === correctIdx;
    setIsQuizCorrect(isCorrect);
    playSound(isCorrect ? "correct" : "wrong");
  };

  const triggerDetailNavigation = (item: SearchResultItem) => {
    playSound("click");
    setIsOpen(false);
    setSelectedDetailItem(null);

    if (item.type === "chapter") {
      setActiveTab("practice");
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("medibridge_chapter_search_selected", {
            detail: {
              chapter: item.rawItem.bn,
              subject: item.rawItem.subject,
              tab: "anushiloni"
            }
          })
        );
      }, 100);
    } else if (item.type === "gk_timeline") {
      setActiveTab("gk");
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("medibridge_gk_search_selected", {
            detail: {
              subTab: "timeline",
              query: item.rawItem.year
            }
          })
        );
      }, 100);
    } else if (item.type === "gk_hero") {
      setActiveTab("gk");
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("medibridge_gk_search_selected", {
            detail: {
              subTab: "heroes",
              query: item.rawItem.nameEn
            }
          })
        );
      }, 100);
    } else if (item.type === "gk_sector") {
      setActiveTab("gk");
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("medibridge_gk_search_selected", {
            detail: {
              subTab: "sectors",
              id: item.rawItem.id
            }
          })
        );
      }, 100);
    } else if (item.type === "english") {
      setActiveTab("english");
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("medibridge_english_search_selected", {
            detail: {
              subTab: "flashcards",
              query: item.rawItem.word,
              cat: "All"
            }
          })
        );
      }, 100);
    } else if (item.type === "question") {
      setActiveTab("practice");
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("medibridge_chapter_search_selected", {
            detail: {
              chapter: item.rawItem.chapter,
              subject: item.rawItem.subject?.toLowerCase() || "biology",
              tab: "anushiloni"
            }
          })
        );
      }, 100);
    }
  };

  const commonSuggestions = [
    { labelBn: "কোষ বিভাজন", labelEn: "Cell Division", term: "কোষ বিভাজন" },
    { labelBn: "জৈব রসায়ন", labelEn: "Organic Chemistry", term: "জৈব রসায়ন" },
    { labelBn: "DNA হেলিক্স", labelEn: "DNA Helix", term: "DNA" },
    { labelBn: "ভেক্টর", labelEn: "Vectors", term: "ভেক্টর" },
    { labelBn: "১৭ মার্চ", labelEn: "17 March", term: "1920" },
    { labelBn: "সমার্থক শব্দ", labelEn: "Synonyms", term: "Synonyms" }
  ];

  return (
    <div className="relative">
      {/* Trigger Button in Navbar */}
      <button
        onClick={() => {
          playSound("click");
          setIsOpen(true);
        }}
        onDoubleClick={() => {
          playSound("click");
          setIsOpen(false);
        }}
        className={`flex items-center justify-between gap-3 px-3 py-1.5 md:py-2 rounded-xl text-xs font-mono border transition-all duration-300 w-36 md:w-56 lg:w-64 cursor-pointer text-left ${
          isDark 
            ? "bg-black/40 border-white/10 hover:border-[#C1121F] text-gray-400 hover:text-white" 
            : "bg-red-50/50 border-red-100 hover:border-[#C1121F] text-slate-500 hover:text-slate-800"
        }`}
        title="Search chapters, GK topics, terms (Ctrl + K)"
      >
        <div className="flex items-center gap-2 truncate">
          <Search className="w-3.5 h-3.5 text-[#C1121F] shrink-0" />
          <span className="truncate">
            {isBn ? "চ্যাপ্টার বা জিকে খুঁজুন..." : "Search chapters, GK..."}
          </span>
        </div>
        <kbd className={`hidden sm:inline-block px-1.5 py-0.2 rounded text-[9px] font-sans font-bold border shrink-0 shadow-sm ${
          isDark ? "bg-white/5 border-white/10 text-gray-500" : "bg-white border-slate-200 text-slate-400"
        }`}>
          ⌘K
        </kbd>
      </button>

      {/* Main Search Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh] px-4 md:px-0">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Search Content Card */}
          <div 
            ref={modalRef}
            className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden z-10 transition-all duration-300 transform scale-100 flex flex-col max-h-[80vh] ${
              isDark 
                ? "bg-[#0D0D0D] border-white/10 text-white" 
                : "bg-white border-slate-150 text-slate-800"
            }`}
          >
            {/* Header Input bar */}
            <div className={`flex items-center px-4 py-4 border-b ${isDark ? "border-white/5" : "border-slate-100"}`}>
              <Search className="w-5 h-5 text-[#C1121F] mr-3 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                className="w-full bg-transparent border-none outline-none focus:ring-0 text-sm placeholder-gray-500 font-sans"
                placeholder={isBn ? "পরীক্ষার অধ্যায়, জিকে ঘটনা, ইংরেজি শব্দ বা মেডিকেল টার্ম খুঁজুন..." : "Search admissions chapters, GK timeline, English vocab, medical terms..."}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    playSound("click");
                    setIsOpen(false);
                  }
                }}
                onDoubleClick={() => {
                  playSound("click");
                  setIsOpen(false);
                }}
              />
              {query && (
                <button 
                  onClick={() => { setQuery(""); inputRef.current?.focus(); }}
                  className="p-1 hover:bg-white/10 dark:hover:bg-black/35 rounded-full mr-2"
                >
                  <X className="w-4 h-4 text-gray-500 hover:text-white" />
                </button>
              )}
              <button
                onClick={() => {
                  playSound("click");
                  setIsOpen(false);
                }}
                className={`text-[10px] font-semibold border px-2.5 py-1 rounded cursor-pointer transition hover:bg-[#C1121F] hover:text-white hover:border-[#C1121F] active:scale-95 ${
                  isDark ? "border-white/10 text-gray-500 bg-white/5" : "border-slate-200 text-slate-400 bg-white"
                }`}
                title={isBn ? "বন্ধ করুন (Esc)" : "Close (Esc)"}
              >
                {isBn ? "বন্ধ করুন" : "Close"}
              </button>
            </div>

            {/* Category Filter Chips */}
            <div className={`flex items-center gap-1.5 p-3 px-4 border-b text-[10px] font-mono uppercase tracking-wider overflow-x-auto ${
              isDark ? "border-white/5 bg-black/10" : "border-slate-100 bg-slate-50/50"
            }`}>
              {[
                { id: "all", labelBn: "সব কন্টেন্ট", labelEn: "All Content" },
                { id: "chapters", labelBn: "অধ্যায় সমূহ", labelEn: "Chapters" },
                { id: "gk", labelBn: "জিকে ও ইংলিশ", labelEn: "GK & English" },
                { id: "questions", labelBn: "মেডিকেল প্রশ্ন", labelEn: "Medical Qs" }
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    playSound("click");
                    setActiveCategory(cat.id as any);
                    setSelectedIndex(0);
                  }}
                  className={`px-3 py-1.5 rounded-lg border font-bold transition-all shrink-0 cursor-pointer ${
                    activeCategory === cat.id
                      ? "bg-[#C1121F] border-red-650 text-white shadow-lg"
                      : isDark
                        ? "bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                        : "bg-white border-slate-200 text-slate-600 hover:text-slate-950 hover:bg-slate-50"
                  }`}
                >
                  {isBn ? cat.labelBn : cat.labelEn}
                </button>
              ))}
            </div>

            {/* Results or suggestions area */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {filteredResults.length === 0 ? (
                // Empty state or suggestions
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-12 h-12 rounded-full bg-red-950/10 border border-[#C1121F]/20 flex items-center justify-center text-lg mb-3">
                    🔍
                  </div>
                  <p className="text-xs font-bold font-display uppercase tracking-wider mb-1">
                    {isBn ? "কোনো কন্টেন্ট খুঁজে পাওয়া যায়নি" : "NO RESULTS MATCHED"}
                  </p>
                  <p className="text-[11px] text-gray-500 max-w-sm mb-6">
                    {isBn 
                      ? "বানান পরীক্ষা করুন অথবা নিচের জনপ্রিয় কি-ওয়ার্ডগুলোতে ক্লিক করুন।" 
                      : "Refine spelling, use broader terms, or search the recommended high-yield targets below."}
                  </p>

                  <div className="flex flex-wrap items-center justify-center gap-2 max-w-md">
                    {commonSuggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          playSound("click");
                          setQuery(s.term);
                        }}
                        className={`text-[11px] px-3 py-1.5 rounded-lg border font-mono transition hover:scale-105 active:scale-95 ${
                          isDark 
                            ? "bg-white/5 border-white/10 text-amber-400 hover:border-amber-400/55" 
                            : "bg-red-50 border-red-100 text-[#C1121F] hover:bg-red-100"
                        }`}
                      >
                        ⚡ {isBn ? s.labelBn : s.labelEn}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                // Suggestions headers when search is empty
                !query && (
                  <div className="mb-4">
                    <span className="text-[9.5px] font-mono uppercase tracking-widest text-gray-500 block mb-3 font-bold">
                      🔥 {isBn ? "জনপ্রিয় সাজেশনস ও কুইক লিংক" : "POPULAR ADMISSION TOPICS & SHORTCUTS"}
                    </span>
                  </div>
                )
              )}

              {/* Search Result List */}
              {filteredResults.length > 0 && (
                <div className="flex flex-col gap-1">
                  {filteredResults.slice(0, 30).map((item, idx) => {
                    const isSelected = idx === selectedIndex;
                    return (
                      <div
                        key={item.id}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        onClick={() => handleSelectResult(item)}
                        className={`flex items-start justify-between p-3 rounded-xl border transition-all duration-150 cursor-pointer ${
                          isSelected
                            ? isDark 
                              ? "bg-[#C1121F]/10 border-[#C1121F]/40 shadow-md shadow-[#C1121F]/5 text-white" 
                              : "bg-red-50/55 border-red-200 text-[#C1121F]"
                            : isDark
                              ? "bg-transparent border-transparent text-gray-300 hover:bg-white/5"
                              : "bg-transparent border-transparent text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start gap-3 truncate">
                          {/* Left Icon mapping */}
                          <div className={`p-2 rounded-lg border mt-0.5 shrink-0 ${
                            isSelected
                              ? isDark ? "bg-[#C1121F]/30 border-[#C1121F]/50 text-[#FFD700]" : "bg-red-100 border-red-300 text-[#C1121F]"
                              : isDark ? "bg-white/5 border-white/5 text-gray-400" : "bg-slate-100 border-slate-200 text-slate-500"
                          }`}>
                            {item.type === "chapter" && <BookOpen className="w-4 h-4" />}
                            {["gk_timeline", "gk_hero", "gk_sector"].includes(item.type) && <Map className="w-4 h-4" />}
                            {item.type === "english" && <Globe className="w-4 h-4" />}
                            {item.type === "question" && <FileText className="w-4 h-4" />}
                          </div>

                          <div className="text-left truncate">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-extrabold text-xs md:text-[13px] leading-tight block truncate font-display">
                                {isBn ? item.titleBn : item.titleEn}
                              </span>
                              <span className={`text-[8.5px] font-mono px-1.5 py-0.2 rounded font-extrabold uppercase shrink-0 border ${
                                item.type === "chapter"
                                  ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                  : item.type === "question"
                                    ? "bg-red-500/10 text-red-400 border-red-500/20"
                                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              }`}>
                                {isBn ? item.badgeBn : item.badgeEn}
                              </span>
                            </div>
                            <span className={`text-[10px] truncate block leading-normal ${
                              isSelected ? (isDark ? "text-gray-300" : "text-red-950/80") : "text-gray-500"
                            }`}>
                              {isBn ? item.subtitleBn : item.subtitleEn}
                            </span>
                          </div>
                        </div>

                        {/* Selection arrow helper */}
                        {isSelected && (
                          <div className="flex items-center gap-1 shrink-0 text-[9px] font-mono text-gray-500 ml-2 mt-2">
                            <span>Open</span>
                            <CornerDownLeft className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer keyboard guide */}
            <div className={`p-3 px-5 border-t text-[10px] font-mono text-gray-500 flex items-center justify-between ${
              isDark ? "border-white/5 bg-black/30" : "border-slate-100 bg-slate-50"
            }`}>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <span className="bg-black/30 dark:bg-white/10 px-1 py-0.2 rounded border border-white/10">↑↓</span>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <span className="bg-black/30 dark:bg-white/10 px-1 py-0.2 rounded border border-white/10">Enter</span>
                  Select
                </span>
                <span className="flex items-center gap-1">
                  <span className="bg-black/30 dark:bg-white/10 px-1 py-0.2 rounded border border-white/10">Esc</span>
                  Close
                </span>
              </div>
              <span className="hidden sm:inline font-bold text-gray-450 uppercase tracking-widest text-[8.5px]">
                MediBridge Unified Index v1.0
              </span>
            </div>
          </div>
        </div>
      )}

      {/* UNIFIED DETAILED VIEW MODAL WITH CONTENT, INFO, AND QUIZ TABS */}
      {selectedDetailItem && (() => {
        const enhanced = getEnhancedDetails(selectedDetailItem) as any;
        
        // Resolve quiz details
        let quizQuestion: EnhancedQuizQuestion | null = null;
        if (selectedDetailItem.type === "question") {
          quizQuestion = {
            questionTextBn: selectedDetailItem.rawItem.questionText,
            questionTextEn: selectedDetailItem.rawItem.questionTextEn || selectedDetailItem.rawItem.questionText,
            optionsBn: selectedDetailItem.rawItem.options,
            optionsEn: selectedDetailItem.rawItem.optionsEn || selectedDetailItem.rawItem.options,
            correctIndex: selectedDetailItem.rawItem.correctAnswerIndex,
            explanationBn: selectedDetailItem.rawItem.explanation,
            explanationEn: selectedDetailItem.rawItem.explanationEn || selectedDetailItem.rawItem.explanation
          };
        } else if (enhanced && enhanced.quizQuestion) {
          quizQuestion = enhanced.quizQuestion;
        }

        const correctIdx = quizQuestion ? quizQuestion.correctIndex : 0;

        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/85 backdrop-blur-sm" onClick={() => setSelectedDetailItem(null)} />
            <div className={`w-full max-w-xl rounded-2xl border p-5 md:p-6 z-10 shadow-2xl relative flex flex-col leading-relaxed max-h-[90vh] overflow-y-auto transition-all ${
              isDark ? "bg-[#0A0A0A] border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"
            }`}>
              {/* Close button */}
              <button
                onClick={() => setSelectedDetailItem(null)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 dark:hover:bg-black/45 text-gray-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Upper Section Metas */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[9px] font-mono font-bold bg-[#C1121F] text-white px-2 py-0.5 rounded uppercase tracking-wider">
                  {isBn ? selectedDetailItem.badgeBn : selectedDetailItem.badgeEn}
                </span>
                {selectedDetailItem.type === "chapter" && (
                  <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                    isDark ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "bg-blue-50 text-blue-600 border border-blue-100"
                  }`}>
                    {selectedDetailItem.rawItem.subject?.toUpperCase()}
                  </span>
                )}
              </div>

              {/* Header Title */}
              <h3 className="text-base md:text-lg font-black tracking-normal leading-snug font-display mb-4 text-left pr-8">
                {isBn ? selectedDetailItem.titleBn : selectedDetailItem.titleEn}
              </h3>

              {/* Tab Navigation Chips */}
              <div className={`grid grid-cols-3 p-1 rounded-xl mb-5 ${
                isDark ? "bg-white/5" : "bg-slate-100"
              }`}>
                <button
                  onClick={() => { playSound("click"); setActiveDetailTab("content"); }}
                  className={`py-2 text-[11px] md:text-xs font-extrabold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    activeDetailTab === "content"
                      ? isDark ? "bg-[#C1121F] text-white shadow-md shadow-[#C1121F]/20" : "bg-white text-[#C1121F] shadow-sm font-black"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{isBn ? "কন্টেন্ট ও টপিক" : "Content"}</span>
                </button>
                <button
                  onClick={() => { playSound("click"); setActiveDetailTab("info"); }}
                  className={`py-2 text-[11px] md:text-xs font-extrabold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    activeDetailTab === "info"
                      ? isDark ? "bg-[#C1121F] text-white shadow-md shadow-[#C1121F]/20" : "bg-white text-[#C1121F] shadow-sm font-black"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isBn ? "টিপস ও তথ্য" : "Exam Info"}</span>
                </button>
                <button
                  onClick={() => { playSound("click"); setActiveDetailTab("quiz"); }}
                  className={`py-2 text-[11px] md:text-xs font-extrabold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    activeDetailTab === "quiz"
                      ? isDark ? "bg-[#C1121F] text-white shadow-md shadow-[#C1121F]/20" : "bg-white text-[#C1121F] shadow-sm font-black"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>{isBn ? "টেস্ট কুইজ" : "Live Quiz"}</span>
                </button>
              </div>

              {/* TAB CONTAINER BODY */}
              <div className="flex-1 min-h-[180px] text-left">
                {/* 1. CONTENT TAB */}
                {activeDetailTab === "content" && (
                  <div className="space-y-4 animate-fade-in">
                    {selectedDetailItem.type === "chapter" && (
                      <div className="space-y-3">
                        <div className={`p-4 rounded-xl border ${
                          isDark ? "bg-white/5 border-white/5" : "bg-slate-50 border-slate-100"
                        }`}>
                          <h4 className="text-xs font-bold text-red-500 mb-1.5 uppercase tracking-wide">
                            {isBn ? "📌 অধ্যায়ের মূল সারসংক্ষেপ" : "📌 CHAPTER SYNOPSIS"}
                          </h4>
                          <p className="text-[12px] leading-relaxed text-gray-300 dark:text-gray-300 light:text-slate-700">
                            {enhanced ? (isBn ? enhanced.summaryBn : enhanced.summaryEn) : (isBn ? "এই অধ্যায়ের গুরুত্বপূর্ণ টপিক ও শর্টকাট টিপস দেখতে অন্য ট্যাবগুলো চেক করুন।" : "Check other tabs for vital topics and mnemonics of this chapter.")}
                          </p>
                        </div>
                        {enhanced && enhanced.factsBn && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold text-[#FFD700] uppercase tracking-wider pl-1">
                              {isBn ? "⚡ হাই-yield তথ্য কণিকা" : "⚡ HIGH-YIELD POINTS"}
                            </h4>
                            <ul className="space-y-1.5 text-[11px] leading-relaxed text-gray-400 pl-1">
                              {(isBn ? enhanced.factsBn : enhanced.factsEn).map((f: string, i: number) => (
                                <li key={i} className="flex items-start gap-1.5">
                                  <span className="text-red-500 mt-0.5">•</span>
                                  <span>{f}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {selectedDetailItem.type === "gk_timeline" && (
                      <div className={`p-4 rounded-xl border space-y-3 ${
                        isDark ? "bg-white/5 border-white/5" : "bg-slate-50 border-slate-100"
                      }`}>
                        <h4 className="text-xs font-bold text-red-500 uppercase tracking-wide">
                          {isBn ? `📅 ঐতিহাসিক প্রেক্ষাপট (${selectedDetailItem.rawItem.year})` : `📅 HISTORICAL BACKGROUND (${selectedDetailItem.rawItem.year})`}
                        </h4>
                        <p className="text-[12.5px] leading-relaxed text-gray-300">
                          {enhanced ? (isBn ? enhanced.detailedInfoBn : enhanced.detailedInfoEn) : (isBn ? selectedDetailItem.subtitleBn : selectedDetailItem.subtitleEn)}
                        </p>
                      </div>
                    )}

                    {selectedDetailItem.type === "gk_hero" && (
                      <div className="space-y-3">
                        <div className={`p-4 rounded-xl border ${
                          isDark ? "bg-white/5 border-white/5" : "bg-slate-50 border-slate-100"
                        }`}>
                          <h4 className="text-xs font-bold text-red-500 uppercase tracking-wide mb-1.5">
                            {isBn ? "⚰️ সমাধিস্থল ও বিবরণ" : "⚰️ GRAVE PLACE & DETAILS"}
                          </h4>
                          <p className="text-[12px] leading-relaxed text-gray-300">
                            <strong>{isBn ? "সমাধিস্থল: " : "Grave:"}</strong> {enhanced ? (isBn ? enhanced.burialPlaceBn : enhanced.burialPlaceEn) : (isBn ? "তথ্য এখনও আপডেট করা হচ্ছে।" : "Details updating shortly.")}
                          </p>
                        </div>
                        {enhanced && enhanced.factsBn && (
                          <div className="space-y-2">
                            <h5 className="text-xs font-bold text-[#FFD700] uppercase tracking-wide">
                              {isBn ? "🎖️ বীরত্বপূর্ণ তথ্য" : "🎖️ HEROIC FACTS"}
                            </h5>
                            <ul className="space-y-1.5 text-[11px] leading-relaxed text-gray-400">
                              {(isBn ? enhanced.factsBn : enhanced.factsEn).map((f: string, i: number) => (
                                <li key={i} className="flex items-start gap-1.5">
                                  <span className="text-red-500 mt-0.5">•</span>
                                  <span>{f}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {selectedDetailItem.type === "gk_sector" && (
                      <div className="space-y-3">
                        <div className={`p-4 rounded-xl border ${
                          isDark ? "bg-white/5 border-white/5" : "bg-slate-50 border-slate-100"
                        }`}>
                          <h4 className="text-xs font-bold text-red-500 uppercase tracking-wide mb-1">
                            {isBn ? "🗺️ ভৌগোলিক এলাকা ও কমাণ্ড" : "🗺️ COVERAGE & SECTOR DETAILS"}
                          </h4>
                          <p className="text-[12px] leading-relaxed text-gray-300">
                            <strong>{isBn ? "সেক্টর কমাণ্ডার: " : "Commanders:"}</strong> {isBn ? selectedDetailItem.rawItem.commandersBn : selectedDetailItem.rawItem.commandersEn}
                          </p>
                          <p className="text-[12px] leading-relaxed text-gray-300 mt-1">
                            <strong>{isBn ? "আঞ্চলিক এলাকা: " : "Areas:"}</strong> {isBn ? selectedDetailItem.rawItem.areaBn : selectedDetailItem.rawItem.areaEn}
                          </p>
                        </div>
                        {enhanced && enhanced.factsBn && (
                          <div className="space-y-2">
                            <h5 className="text-xs font-bold text-[#FFD700] uppercase tracking-wide">
                              {isBn ? "📌 গুরুত্বপূর্ণ কমাণ্ড তথ্য" : "📌 CRITICAL COMMAND DATA"}
                            </h5>
                            <ul className="space-y-1 text-[11px] leading-relaxed text-gray-400 pl-1">
                              {(isBn ? enhanced.factsBn : enhanced.factsEn).map((f: string, i: number) => (
                                <li key={i} className="flex items-start gap-1.5">
                                  <span className="text-red-500 mt-0.5">•</span>
                                  <span>{f}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {selectedDetailItem.type === "english" && (
                      <div className={`p-4 rounded-xl border space-y-3 ${
                        isDark ? "bg-white/5 border-white/5" : "bg-slate-50 border-slate-100"
                      }`}>
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-[#FFD700] font-mono">
                            {selectedDetailItem.rawItem.word}
                          </h4>
                          <span className="text-[9px] font-mono bg-[#C1121F]/20 text-red-400 px-2 py-0.5 rounded border border-red-500/20">
                            {isBn ? selectedDetailItem.rawItem.categoryBn : selectedDetailItem.rawItem.category}
                          </span>
                        </div>
                        <div className="space-y-2 text-[12px] text-gray-300">
                          <p>
                            <strong>{isBn ? "বাংলা অর্থ: " : "Bangla Meaning:"}</strong> {selectedDetailItem.rawItem.meaningBn}
                          </p>
                          <p>
                            <strong>{isBn ? "ইংরেজি সংজ্ঞা: " : "English Definition:"}</strong> {selectedDetailItem.rawItem.meaningEn}
                          </p>
                          <p className={`p-2.5 rounded-lg text-[11px] italic ${isDark ? "bg-white/5 text-gray-400" : "bg-slate-100 text-slate-600"}`}>
                            <strong>{isBn ? "মেডিকেল উদাহরণ: " : "Clinical Example: "}</strong> "{selectedDetailItem.rawItem.sentenceBn || selectedDetailItem.rawItem.sentenceEn}"
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedDetailItem.type === "question" && (
                      <div className={`p-4 rounded-xl border space-y-3 ${
                        isDark ? "bg-white/5 border-white/5" : "bg-slate-50 border-slate-100"
                      }`}>
                        <h4 className="text-xs font-bold text-red-500 uppercase tracking-wide">
                          {isBn ? "⚔️ প্র্যাকটিস প্রশ্নপত্র" : "⚔️ PRACTICE PROBLEM"}
                        </h4>
                        <p className="text-[13px] leading-relaxed font-semibold text-gray-200">
                          {isBn ? selectedDetailItem.rawItem.questionText : (selectedDetailItem.rawItem.questionTextEn || selectedDetailItem.rawItem.questionText)}
                        </p>
                        <div className="flex flex-wrap gap-2 text-[9px] font-mono text-gray-400 mt-2">
                          <span className="bg-white/5 px-2 py-0.5 rounded">
                            {isBn ? "বিষয়: " : "Subject: "}{selectedDetailItem.rawItem.subject}
                          </span>
                          <span className="bg-white/5 px-2 py-0.5 rounded">
                            {isBn ? "অধ্যায়: " : "Chapter: "}{selectedDetailItem.rawItem.chapter}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. EXAM INFO / TIPS TAB */}
                {activeDetailTab === "info" && (
                  <div className="space-y-4 animate-fade-in">
                    {selectedDetailItem.type === "chapter" && (
                      <div className="space-y-3">
                        <div className={`p-4 rounded-xl border ${
                          isDark ? "bg-[#FFD700]/5 border-[#FFD700]/15" : "bg-amber-50/20 border-amber-100"
                        }`}>
                          <div className="flex items-center gap-1.5 mb-2">
                            <Sparkles className="w-4 h-4 text-amber-500" />
                            <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wide">
                              {isBn ? "💡 অ্যাডমিশন হ্যাক ও ছন্দ (Mnemonic)" : "💡 ADMISSION HACK & MNEMONIC"}
                            </h4>
                          </div>
                          <p className="text-[12px] leading-relaxed text-gray-300">
                            {enhanced ? (isBn ? enhanced.mnemonicBn : enhanced.mnemonicEn) : (isBn ? "মেডিকেল ভর্তি পরীক্ষার জন্য এই অধ্যায়ের প্রতিটি গুরুত্বপূর্ণ পয়েন্ট এবং ডায়েরি শর্টকাট অত্যন্ত গুরুত্বপূর্ণ।" : "All clinical values, ratios, and processes are critical for this MAT segment.")}
                          </p>
                        </div>
                        <div className={`p-4 rounded-xl border ${
                          isDark ? "bg-[#C1121F]/5 border-[#C1121F]/15" : "bg-red-50/20 border-red-100"
                        }`}>
                          <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1.5">
                            {isBn ? "📌 ভর্তি পরীক্ষার গুরুত্ব বিশ্লেষণ" : "📌 EXAM WEIGHTAGE & INSIGHT"}
                          </h4>
                          <p className="text-[11px] leading-relaxed text-gray-400">
                            {isBn 
                              ? "এই টপিক থেকে বিগত ১০ বছরে একাধিক প্রশ্ন এসেছে। বিশেষ করে বৈজ্ঞানিক নাম, বৈশিষ্ট্য এবং ব্যতিক্রমী মানগুলো মুখস্থ রাখা আবশ্যক।" 
                              : "This topic has seen high recurrent questions in the last 10 years. Focus heavily on scientific definitions, exceptions, and key ratios."}
                          </p>
                        </div>
                      </div>
                    )}

                    {["gk_timeline", "gk_hero", "gk_sector", "english"].includes(selectedDetailItem.type) && (
                      <div className="space-y-3">
                        <div className={`p-4 rounded-xl border ${
                          isDark ? "bg-[#FFD700]/5 border-[#FFD700]/15" : "bg-amber-50/20 border-amber-100"
                        }`}>
                          <div className="flex items-center gap-1.5 mb-2">
                            <Sparkles className="w-4 h-4 text-amber-500" />
                            <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wide">
                              {isBn ? "💡 ভর্তি পরীক্ষার টিপস ও হ্যাকস" : "💡 EXAM TRICKS & STATS"}
                            </h4>
                          </div>
                          <p className="text-[12px] leading-relaxed text-gray-300">
                            {selectedDetailItem.type === "english"
                              ? (isBn 
                                  ? "বানান পরীক্ষা (Spelling) এবং উপযুক্ত প্রিপজিশন (Appropriate Preposition) ভর্তি পরীক্ষায় ১০ নম্বরের ইংরেজি অংশে প্রায় ৩০% কভার করে!" 
                                  : "Spellings and appropriate prepositions make up nearly 30% of the entire MAT English syllabus.")
                              : (isBn
                                  ? "সাধারণ জ্ঞান অংশে মুক্তিযুদ্ধ বিষয়ক সব তথ্য, বীরশ্রেষ্ঠদের জীবনী, সেক্টর ও ঐতিহাসিক সালগুলো থেকে ১-২টি প্রশ্ন অবশ্যই থাকে।"
                                  : "General Knowledge focuses heavily on 1971 war details, commanders, Bir Sreshthos, and timeline years which guarantee at least 2 marks.")}
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedDetailItem.type === "question" && (
                      <div className={`p-4 rounded-xl border leading-relaxed space-y-2.5 ${
                        isDark ? "bg-white/5 border-white/5" : "bg-slate-50 border-slate-100"
                      }`}>
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-500">
                            {isBn ? "টেক্সটবুক রেফারেন্স ও বিশদ ব্যাখ্যা" : "TEXTBOOK REFERENCE & EXPLANATION"}
                          </span>
                        </div>
                        <p className="text-[12px] leading-relaxed text-gray-350 font-sans">
                          {isBn ? selectedDetailItem.rawItem.explanation : (selectedDetailItem.rawItem.explanationEn || selectedDetailItem.rawItem.explanation)}
                        </p>
                        {selectedDetailItem.rawItem.difficulty && (
                          <div className="text-[10px] font-mono text-gray-500 pt-1 border-t border-white/5">
                            Difficulty: <span className="text-red-400 font-bold">{selectedDetailItem.rawItem.difficulty}</span> • Source: {selectedDetailItem.rawItem.source || "MAT Practice Portal"}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. INTERACTIVE PLAYABLE MCQ QUIZ TAB */}
                {activeDetailTab === "quiz" && (
                  <div className="space-y-4 animate-fade-in">
                    {quizQuestion ? (
                      <div>
                        <div className="flex items-center gap-1.5 mb-3">
                          <Trophy className="w-4 h-4 text-[#FFD700]" />
                          <h4 className="text-xs font-extrabold uppercase tracking-wide text-gray-300">
                            {isBn ? "⚔️ সঠিক উত্তর চিহ্নিত করুন" : "⚔️ CHOOSE THE CORRECT OPTION"}
                          </h4>
                        </div>

                        {/* Question Text */}
                        <p className="text-[12.5px] leading-normal font-bold mb-4 text-gray-200">
                          {isBn ? quizQuestion.questionTextBn : quizQuestion.questionTextEn}
                        </p>

                        {/* Options Buttons */}
                        <div className="flex flex-col gap-2">
                          {(isBn ? quizQuestion.optionsBn : quizQuestion.optionsEn).map((option, idx) => {
                            const isCorrect = idx === correctIdx;
                            const isUserSelected = idx === userSelectedQuizOption;
                            
                            // Color formatting
                            let btnStyle = isDark 
                              ? "bg-black/20 border-white/10 hover:border-white/30 text-gray-300" 
                              : "bg-slate-50 border-slate-100 hover:border-slate-300 text-slate-700";

                            if (quizSubmitted) {
                              if (isCorrect) {
                                btnStyle = "bg-green-500/10 border-green-500/40 text-green-400 shadow-[0_0_12px_rgba(34,197,94,0.08)]";
                              } else if (isUserSelected) {
                                btnStyle = "bg-red-500/10 border-red-500/40 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.08)]";
                              } else {
                                btnStyle = isDark ? "bg-black/10 border-white/5 text-gray-600" : "bg-slate-50 border-slate-100 text-slate-400";
                              }
                            }

                            return (
                              <button
                                key={idx}
                                disabled={quizSubmitted}
                                onClick={() => handleSelectQuizOption(idx, correctIdx)}
                                className={`w-full p-3 text-left text-[11.5px] md:text-xs font-semibold rounded-xl border flex items-center justify-between transition-all duration-150 ${btnStyle}`}
                              >
                                <span>{idx + 1}. {option}</span>
                                {quizSubmitted && isCorrect && (
                                  <span className="text-[8.5px] font-mono uppercase bg-green-500 text-black px-1.5 py-0.2 rounded font-black tracking-wider shrink-0 ml-2">
                                    {isBn ? "সঠিক" : "CORRECT"}
                                  </span>
                                )}
                                {quizSubmitted && isUserSelected && !isCorrect && (
                                  <span className="text-[8.5px] font-mono uppercase bg-red-500 text-white px-1.5 py-0.2 rounded font-black tracking-wider shrink-0 ml-2">
                                    {isBn ? "ভুল" : "WRONG"}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Explanations section */}
                        {quizSubmitted && (
                          <div className={`mt-4 p-3.5 rounded-xl border leading-relaxed animate-fade-in ${
                            isQuizCorrect 
                              ? "bg-green-500/5 border-green-500/15" 
                              : "bg-red-500/5 border-red-500/15"
                          }`}>
                            <div className="flex items-center gap-1.5 mb-1">
                              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-500">
                                {isBn ? "ব্যাখ্যা ও বিশ্লেষণ" : "EXPLANATION & ANALYSIS"}
                              </span>
                            </div>
                            <p className="text-[11px] leading-relaxed text-gray-400">
                              {isBn ? quizQuestion.explanationBn : quizQuestion.explanationEn}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-6 text-gray-500 text-xs">
                        <HelpCircle className="w-8 h-8 text-gray-600 mb-2 animate-pulse" />
                        <span>{isBn ? "এই বিষয়ের কোনো কুইজ পাওয়া যায়নি।" : "No quiz generated for this sub-topic yet."}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ACTION FOOTER INSIDE DETAIL POPOVER */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5 gap-2">
                <button
                  onClick={() => setSelectedDetailItem(null)}
                  className={`px-4 py-2 font-extrabold text-[10px] uppercase tracking-wider rounded-lg border transition ${
                    isDark 
                      ? "bg-transparent border-white/10 hover:bg-white/5 text-gray-400" 
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600"
                  }`}
                >
                  {isBn ? "বন্ধ করুন" : "Close"}
                </button>

                <button
                  onClick={() => triggerDetailNavigation(selectedDetailItem)}
                  className="px-4 py-2 bg-[#C1121F] hover:bg-red-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-lg transition shadow-md shadow-[#C1121F]/20 flex items-center gap-1"
                >
                  {selectedDetailItem.type === "chapter" && (
                    <span>{isBn ? "ডায়েরি প্র্যাকটিস শুরু ⚔️" : "START DIARY PRACTICE ⚔️"}</span>
                  )}
                  {["gk_timeline", "gk_hero", "gk_sector"].includes(selectedDetailItem.type) && (
                    <span>{isBn ? "জিকে স্টাডি ম্যাপে যান 🗺️" : "OPEN IN GK MAP 🗺️"}</span>
                  )}
                  {selectedDetailItem.type === "english" && (
                    <span>{isBn ? "ইংলিশ ভোকাবুলারি স্টাডি 📖" : "STUDY ENGLISH VOCAB 📖"}</span>
                  )}
                  {selectedDetailItem.type === "question" && (
                    <span>{isBn ? "এই অধ্যায়ে প্র্যাকটিস ⚡" : "PRACTICE THIS CHAPTER ⚡"}</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
