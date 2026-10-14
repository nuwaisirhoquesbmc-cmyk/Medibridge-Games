import React, { useState, useEffect, useMemo } from "react";
import { BankQuestion, QuestionSubject } from "../../types/questionBankTypes";
import { db, isFirestoreQuotaExceeded, setFirestoreQuotaExhausted, isQuotaExceededError } from "../../firebase";
import { collection, getDocs, query, limit, where } from "firebase/firestore";
import { normalizeToBankQuestion, saveQuestionToFirestoreBank } from "../../lib/questionBankService";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  CheckSquare,
  Square,
  Filter,
  Plus,
  Layers,
  BookOpen,
  Sparkles,
  Eye,
  CheckCircle2,
  X,
  Sliders,
  Award,
  Loader2,
  HelpCircle
} from "lucide-react";
import { playSound } from "../../audio";
import QuestionPreviewModal from "./QuestionPreviewModal";

interface QuestionBankSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectQuestions: (selectedQuestions: BankQuestion[]) => void;
  alreadySelectedIds?: string[];
  targetTotalQuestions?: number;
  targetSubject?: string;
  courseId?: string;
  courseName?: string;
  isBn?: boolean;
}

export default function QuestionBankSelectorModal({
  isOpen,
  onClose,
  onSelectQuestions,
  alreadySelectedIds = [],
  targetTotalQuestions = 50,
  targetSubject = "Full Model Test",
  courseId = "",
  courseName = "",
  isBn = false
}: QuestionBankSelectorModalProps) {
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"browse" | "create">("browse");
  const [previewingQuestion, setPreviewingQuestion] = useState<BankQuestion | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>(
    targetSubject === "Full Model Test" ? "All" : targetSubject
  );
  const [selectedChapter, setSelectedChapter] = useState<string>("All");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("All");
  const [filterUnusedOnly, setFilterUnusedOnly] = useState(false);

  // New Question on the Fly Form State
  const [newQText, setNewQText] = useState("");
  const [newQImage, setNewQImage] = useState("");
  const [newQOptA, setNewQOptA] = useState("");
  const [newQOptB, setNewQOptB] = useState("");
  const [newQOptC, setNewQOptC] = useState("");
  const [newQOptD, setNewQOptD] = useState("");
  const [newQCorrect, setNewQCorrect] = useState<number>(0);
  const [newQExplanation, setNewQExplanation] = useState("");
  const [newQSubject, setNewQSubject] = useState<QuestionSubject>(
    targetSubject === "Full Model Test" ? "Biology" : (targetSubject as any)
  );
  const [newQChapter, setNewQChapter] = useState("General");
  const [newQDifficulty, setNewQDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");
  const [isSavingNewQ, setIsSavingNewQ] = useState(false);

  // Initialize selected IDs from props when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedIds([...alreadySelectedIds]);
      if (targetSubject && targetSubject !== "Full Model Test") {
        setSelectedSubject(targetSubject);
      }
    }
  }, [isOpen, alreadySelectedIds, targetSubject]);

  // Load questions on demand when modal opens (with session caching)
  useEffect(() => {
    if (!isOpen) return;

    // 1. Check session cache first
    try {
      const cached = sessionStorage.getItem("mb_qb_modal_questions_cache");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setQuestions(parsed);
          setLoading(false);
          if (isFirestoreQuotaExceeded()) return;
        }
      }
    } catch {}

    if (isFirestoreQuotaExceeded()) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const qColl = query(collection(db, "questions"), limit(200));
    getDocs(qColl)
      .then((snapshot) => {
        const list: BankQuestion[] = [];
        let index = 1;
        snapshot.forEach((docSnap) => {
          list.push(normalizeToBankQuestion({ id: docSnap.id, ...docSnap.data() }, index++));
        });
        setQuestions(list);
        try {
          sessionStorage.setItem("mb_qb_modal_questions_cache", JSON.stringify(list));
        } catch {}
      })
      .catch((err) => {
        if (isQuotaExceededError(err)) {
          setFirestoreQuotaExhausted();
        }
        console.warn("Error loading questions bank:", err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen]);

  // Unique chapters based on selected subject
  const availableChapters = useMemo(() => {
    const relevantQuestions = questions.filter((q) => {
      if (selectedSubject === "All") return true;
      return (q.subject || "").toLowerCase() === selectedSubject.toLowerCase();
    });

    const set = new Set<string>();
    relevantQuestions.forEach((q) => {
      if (q.chapter && q.chapter.trim()) set.add(q.chapter.trim());
    });
    return Array.from(set);
  }, [questions, selectedSubject]);

  // Filtered Questions List
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (q.status === "archived") return false;

      // Subject match
      if (selectedSubject !== "All" && (q.subject || "").toLowerCase() !== selectedSubject.toLowerCase()) {
        return false;
      }

      // Chapter match
      if (selectedChapter !== "All" && (q.chapter || "").toLowerCase() !== selectedChapter.toLowerCase()) {
        return false;
      }

      // Difficulty match
      if (selectedDifficulty !== "All" && (q.difficulty || "").toLowerCase() !== selectedDifficulty.toLowerCase()) {
        return false;
      }

      // Unused Only filter
      if (filterUnusedOnly && q.usageCount > 0) {
        return false;
      }

      // Course Specific Check
      if (q.availability === "course_specific" && courseId && q.allowedCourseIds && q.allowedCourseIds.length > 0) {
        if (!q.allowedCourseIds.includes(courseId)) return false;
      }

      // Search match
      if (searchTerm.trim()) {
        const s = searchTerm.toLowerCase();
        const matchesText = (q.questionText || "").toLowerCase().includes(s);
        const matchesCode = (q.code || "").toLowerCase().includes(s);
        const matchesId = (q.id || "").toLowerCase().includes(s);
        const matchesTopic = (q.topic || "").toLowerCase().includes(s);
        const matchesExpl = (q.explanation || "").toLowerCase().includes(s);
        return matchesText || matchesCode || matchesId || matchesTopic || matchesExpl;
      }

      return true;
    });
  }, [questions, selectedSubject, selectedChapter, selectedDifficulty, filterUnusedOnly, searchTerm, courseId]);

  // Subject counts breakdown for currently selected items
  const selectedSubjectBreakdown = useMemo(() => {
    const counts = { Biology: 0, Chemistry: 0, Physics: 0, English: 0, GK: 0, Other: 0 };
    const selectedMap = new Map<string, BankQuestion>(questions.map((q) => [q.id, q]));

    selectedIds.forEach((id) => {
      const q = selectedMap.get(id);
      if (!q) return;
      const sub = (q.subject || "").toLowerCase();
      if (sub.includes("bio")) counts.Biology++;
      else if (sub.includes("chem")) counts.Chemistry++;
      else if (sub.includes("phys")) counts.Physics++;
      else if (sub.includes("eng")) counts.English++;
      else if (sub.includes("gk") || sub.includes("general")) counts.GK++;
      else counts.Other++;
    });

    return counts;
  }, [selectedIds, questions]);

  const toggleSelectQuestion = (qId: string) => {
    playSound("click");
    setSelectedIds((prev) => {
      if (prev.includes(qId)) {
        return prev.filter((id) => id !== qId);
      } else {
        return [...prev, qId];
      }
    });
  };

  const handleSelectAllFiltered = () => {
    playSound("click");
    const filteredIds = filteredQuestions.map((q) => q.id);
    setSelectedIds((prev) => {
      const set = new Set([...prev, ...filteredIds]);
      return Array.from(set);
    });
  };

  const handleDeselectAll = () => {
    playSound("click");
    setSelectedIds([]);
  };

  // Submit selected questions back to Exam builder
  const handleConfirmAddSelected = () => {
    playSound("correct");
    const qMap = new Map<string, BankQuestion>(questions.map((q) => [q.id, q]));
    const selectedObjects: BankQuestion[] = [];

    selectedIds.forEach((id) => {
      const q = qMap.get(id);
      if (q) selectedObjects.push(q);
    });

    onSelectQuestions(selectedObjects);
    onClose();
  };

  // Create new question on the fly and immediately select it
  const handleCreateNewQuestionOnTheFly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQText || !newQOptA || !newQOptB) return;

    try {
      setIsSavingNewQ(true);
      playSound("click");

      const createdQ = await saveQuestionToFirestoreBank({
        questionText: newQText,
        imageUrl: newQImage,
        options: [newQOptA, newQOptB, newQOptC || "", newQOptD || ""],
        correctAnswerIndex: newQCorrect,
        explanation: newQExplanation,
        subject: newQSubject,
        chapter: newQChapter,
        difficulty: newQDifficulty,
        source: courseName ? `Exam: ${courseName}` : "Question Bank",
        status: "active",
        availability: "global"
      });

      // Automatically add to questions list and check it
      setQuestions((prev) => [createdQ, ...prev]);
      setSelectedIds((prev) => [...prev, createdQ.id]);

      // Reset form
      setNewQText("");
      setNewQImage("");
      setNewQOptA("");
      setNewQOptB("");
      setNewQOptC("");
      setNewQOptD("");
      setNewQExplanation("");
      setActiveTab("browse");
      setIsSavingNewQ(false);
      playSound("correct");
    } catch (err: any) {
      console.error("Error creating question on the fly:", err);
      setIsSavingNewQ(false);
      alert("Failed to create question: " + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="relative w-full max-w-5xl bg-[#121214] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[90vh] font-sans text-white"
        >
          {/* Header Banner */}
          <div className="p-4 sm:p-5 border-b border-white/10 bg-gradient-to-r from-black via-[#1c1417] to-black flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#C1121F]/20 border border-[#C1121F]/40 flex items-center justify-center text-[#FFD700] shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-white/10 text-[#FFD700]">
                    CENTRAL QUESTION BANK REUSE ENGINE
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white uppercase font-display">
                  {isBn ? "প্রশ্ন ব্যাংক থেকে প্রশ্ন নির্বাচন করুন" : "Select Questions from Question Bank"}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Tab Switcher */}
              <div className="flex items-center bg-black/60 p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    playSound("click");
                    setActiveTab("browse");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition flex items-center gap-1.5 cursor-pointer ${
                    activeTab === "browse" ? "bg-[#C1121F] text-white" : "text-gray-400 hover:text-white"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{isBn ? "প্রশ্ন ব্যাংক লাইব্রেরি" : "Browse Library"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playSound("click");
                    setActiveTab("create");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition flex items-center gap-1.5 cursor-pointer ${
                    activeTab === "create" ? "bg-[#C1121F] text-white" : "text-gray-400 hover:text-white"
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isBn ? "+ নতুন প্রশ্ন তৈরি করুন" : "+ Create Question"}</span>
                </button>
              </div>

              <button
                onClick={() => {
                  playSound("click");
                  onClose();
                }}
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Live Progress Bar & Subject Breakdown Counter Bar (Section 25 & 27) */}
          <div className="px-5 py-3 border-b border-white/10 bg-black/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Target Progress Counter */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-gray-400 uppercase">
                  {isBn ? "নির্বাচিত প্রশ্ন সংখ্যা:" : "Selected:"}
                </span>
                <span className={`text-sm font-mono font-black ${
                  selectedIds.length >= targetTotalQuestions ? "text-emerald-400" : "text-[#FFD700]"
                }`}>
                  {selectedIds.length} / {targetTotalQuestions} Questions
                </span>
              </div>

              <div className="w-32 bg-gray-800 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    selectedIds.length >= targetTotalQuestions ? "bg-emerald-500" : "bg-[#FFD700]"
                  }`}
                  style={{ width: `${Math.min(100, (selectedIds.length / (targetTotalQuestions || 1)) * 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Subject Distribution Pills (Module 27) */}
            <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono">
              <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-bold">
                Bio: {selectedSubjectBreakdown.Biology}
              </span>
              <span className="px-2 py-0.5 rounded bg-sky-950/60 border border-sky-500/40 text-sky-300 font-bold">
                Chem: {selectedSubjectBreakdown.Chemistry}
              </span>
              <span className="px-2 py-0.5 rounded bg-purple-950/60 border border-purple-500/40 text-purple-300 font-bold">
                Phys: {selectedSubjectBreakdown.Physics}
              </span>
              {(selectedSubjectBreakdown.English > 0 || selectedSubjectBreakdown.GK > 0) && (
                <span className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/40 text-amber-300 font-bold">
                  GK/Eng: {selectedSubjectBreakdown.GK + selectedSubjectBreakdown.English}
                </span>
              )}
            </div>
          </div>

          {/* Body Content */}
          {activeTab === "browse" ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Filter & Search Toolbar */}
              <div className="p-4 border-b border-white/5 bg-[#17171a] flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  {/* Search Input */}
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder={isBn ? "প্রশ্ন বা অপশন সার্চ করুন..." : "Search question text, code, ID or topic..."}
                      className="w-full bg-black/60 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#C1121F]"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Batch Select / Deselect Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleSelectAllFiltered}
                      className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 text-xs font-mono font-bold uppercase transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Select All ({filteredQuestions.length})</span>
                    </button>
                    {selectedIds.length > 0 && (
                      <button
                        type="button"
                        onClick={handleDeselectAll}
                        className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-red-400 text-xs font-mono font-bold uppercase transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Square className="w-3.5 h-3.5" />
                        <span>Deselect All</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Filter Dropdowns Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  {/* Subject Filter */}
                  <select
                    value={selectedSubject}
                    onChange={(e) => {
                      setSelectedSubject(e.target.value);
                      setSelectedChapter("All");
                    }}
                    className="bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-gray-300 focus:outline-none focus:border-[#C1121F]"
                  >
                    <option value="All">All Subjects</option>
                    <option value="Biology">Biology</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Physics">Physics</option>
                    <option value="English">English</option>
                    <option value="GK">General Knowledge</option>
                  </select>

                  {/* Chapter Filter */}
                  <select
                    value={selectedChapter}
                    onChange={(e) => setSelectedChapter(e.target.value)}
                    className="bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-gray-300 focus:outline-none focus:border-[#C1121F]"
                  >
                    <option value="All">All Chapters</option>
                    {availableChapters.map((ch) => (
                      <option key={ch} value={ch}>
                        {ch}
                      </option>
                    ))}
                  </select>

                  {/* Difficulty Filter */}
                  <select
                    value={selectedDifficulty}
                    onChange={(e) => setSelectedDifficulty(e.target.value)}
                    className="bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-gray-300 focus:outline-none focus:border-[#C1121F]"
                  >
                    <option value="All">All Difficulties</option>
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>

                  {/* Unused Only Toggle */}
                  <label className="flex items-center gap-2 bg-black/60 border border-white/10 rounded-xl px-3 py-2 cursor-pointer hover:bg-white/5 transition">
                    <input
                      type="checkbox"
                      checked={filterUnusedOnly}
                      onChange={(e) => setFilterUnusedOnly(e.target.checked)}
                      className="accent-[#C1121F] w-3.5 h-3.5 rounded"
                    />
                    <span className="text-[11px] text-gray-300 truncate">
                      {isBn ? "অব্যবহৃত প্রশ্ন (Unused)" : "Unused Only"}
                    </span>
                  </label>
                </div>
              </div>

              {/* Questions List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                {loading ? (
                  <div className="py-20 text-center flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-[#FFD700] animate-spin" />
                    <span className="text-xs font-mono text-gray-400">Loading Central Question Bank...</span>
                  </div>
                ) : filteredQuestions.length === 0 ? (
                  <div className="py-20 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-500">
                      <HelpCircle className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-white font-mono uppercase">
                      {isBn ? "কোনো প্রশ্ন পাওয়া যায়নি" : "No Questions Found Matching Filters"}
                    </h4>
                    <p className="text-xs text-gray-400">
                      {isBn ? "ফিল্টার পরিবর্তন করুন অথবা নতুন প্রশ্ন তৈরি করুন।" : "Try clearing search filters or create a new question directly."}
                    </p>
                  </div>
                ) : (
                  filteredQuestions.map((q) => {
                    const isSelected = selectedIds.includes(q.id);
                    return (
                      <div
                        key={q.id}
                        onClick={() => toggleSelectQuestion(q.id)}
                        className={`p-3.5 rounded-xl border transition cursor-pointer flex items-start justify-between gap-4 ${
                          isSelected
                            ? "bg-[#C1121F]/15 border-[#C1121F] shadow-lg shadow-red-950/20"
                            : "bg-black/40 border-white/10 hover:border-white/20 hover:bg-white/5"
                        }`}
                      >
                        {/* Checkbox and Question Body */}
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // Handled by container click
                            className="mt-1 accent-[#C1121F] w-4 h-4 rounded shrink-0 cursor-pointer"
                          />

                          <div className="space-y-1.5 flex-1 min-w-0">
                            {/* Badges */}
                            <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono">
                              <span className="px-2 py-0.5 rounded bg-white/10 font-bold text-[#FFD700]">
                                {q.code || q.id.slice(0, 8)}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-red-950/80 border border-red-500/40 text-red-300 font-bold uppercase">
                                {q.subject}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-300 truncate max-w-[150px]">
                                {q.chapter}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-white/5 text-gray-400 uppercase">
                                {q.difficulty}
                              </span>
                              {q.usageCount > 0 ? (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold">
                                  Used in {q.usageCount} exams
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold">
                                  Fresh / Unused
                                </span>
                              )}
                            </div>

                            {/* Question text */}
                            <p className="text-xs font-semibold text-white leading-relaxed line-clamp-2">
                              {q.questionText}
                            </p>

                            {/* Options Preview Grid */}
                            <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] font-sans text-gray-400">
                              {q.options.map((opt, idx) => (
                                <span
                                  key={idx}
                                  className={`truncate px-2 py-0.5 rounded ${
                                    idx === q.correctAnswerIndex ? "text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-500/30" : "bg-black/30"
                                  }`}
                                >
                                  {["A", "B", "C", "D"][idx]}. {opt}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Preview Button */}
                        <div className="shrink-0 pt-0.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              playSound("click");
                              setPreviewingQuestion(q);
                            }}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white transition cursor-pointer"
                            title="Interactive Student Preview"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            /* + Create New Question Directly on the Fly (Module 32) */
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="bg-[#17171a] p-4 rounded-xl border border-white/10 space-y-1">
                <h4 className="text-xs font-mono font-bold uppercase text-[#FFD700] flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  {isBn ? "প্রশ্ন তৈরি ও স্বয়ংক্রিয় সংরক্ষণ (Save to Bank + Add to Current Exam)" : "Direct Question Creator"}
                </h4>
                <p className="text-[11px] text-gray-400 font-sans">
                  {isBn
                    ? "এখানে তৈরি করা প্রতিটি প্রশ্ন সেন্ট্রাল কোয়েশ্চেন ব্যাংকে স্থায়ীভাবে সংরক্ষিত হবে এবং সরাসরি বর্তমান পরীক্ষাতেও যুক্ত হবে।"
                    : "Questions created here are instantly saved to Central Question Bank and selected for this exam."}
                </p>
              </div>

              <form onSubmit={handleCreateNewQuestionOnTheFly} className="space-y-4 text-xs font-sans">
                <div>
                  <label className="text-[11px] font-mono font-bold uppercase text-gray-300 block mb-1">
                    Question Text *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={newQText}
                    onChange={(e) => setNewQText(e.target.value)}
                    placeholder="Enter question text with standard scientific formatting..."
                    className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#C1121F] resize-none"
                  />
                </div>

                {/* Optional Image URL */}
                <div>
                  <label className="text-[11px] font-mono font-bold uppercase text-gray-300 block mb-1">
                    Question Diagram / Image URL (Optional)
                  </label>
                  <input
                    type="text"
                    value={newQImage}
                    onChange={(e) => setNewQImage(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-[#C1121F]"
                  />
                </div>

                {/* 4 Options Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-mono font-bold uppercase text-gray-400 block mb-1">Option A *</label>
                    <input
                      type="text"
                      required
                      value={newQOptA}
                      onChange={(e) => setNewQOptA(e.target.value)}
                      placeholder="Option A"
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#C1121F]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono font-bold uppercase text-gray-400 block mb-1">Option B *</label>
                    <input
                      type="text"
                      required
                      value={newQOptB}
                      onChange={(e) => setNewQOptB(e.target.value)}
                      placeholder="Option B"
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#C1121F]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono font-bold uppercase text-gray-400 block mb-1">Option C</label>
                    <input
                      type="text"
                      value={newQOptC}
                      onChange={(e) => setNewQOptC(e.target.value)}
                      placeholder="Option C"
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#C1121F]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono font-bold uppercase text-gray-400 block mb-1">Option D</label>
                    <input
                      type="text"
                      value={newQOptD}
                      onChange={(e) => setNewQOptD(e.target.value)}
                      placeholder="Option D"
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#C1121F]"
                    />
                  </div>
                </div>

                {/* Correct Option & Subject */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-mono font-bold uppercase text-emerald-400 block mb-1">
                      Correct Answer Option *
                    </label>
                    <select
                      value={newQCorrect}
                      onChange={(e) => setNewQCorrect(Number(e.target.value))}
                      className="w-full bg-black/60 border border-emerald-500/40 rounded-xl px-3 py-2 text-emerald-300 font-mono font-bold focus:outline-none"
                    >
                      <option value={0}>Option A</option>
                      <option value={1}>Option B</option>
                      <option value={2}>Option C</option>
                      <option value={3}>Option D</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono font-bold uppercase text-gray-400 block mb-1">Subject</label>
                    <select
                      value={newQSubject}
                      onChange={(e) => setNewQSubject(e.target.value as any)}
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none"
                    >
                      <option value="Biology">Biology</option>
                      <option value="Chemistry">Chemistry</option>
                      <option value="Physics">Physics</option>
                      <option value="English">English</option>
                      <option value="GK">General Knowledge</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono font-bold uppercase text-gray-400 block mb-1">Chapter</label>
                    <input
                      type="text"
                      value={newQChapter}
                      onChange={(e) => setNewQChapter(e.target.value)}
                      placeholder="e.g. Genetics / Cell"
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Explanation */}
                <div>
                  <label className="text-[11px] font-mono font-bold uppercase text-gray-300 block mb-1">
                    Explanation & Textbook References
                  </label>
                  <textarea
                    rows={2}
                    value={newQExplanation}
                    onChange={(e) => setNewQExplanation(e.target.value)}
                    placeholder="Provide full solution explanation..."
                    className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#C1121F] resize-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSavingNewQ}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white font-mono font-bold uppercase text-xs tracking-wider transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingNewQ ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving to Bank...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Save to Bank & Select for Exam</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Footer Action Bar */}
          <div className="p-4 border-t border-white/10 bg-black/90 flex items-center justify-between gap-4">
            <div className="text-xs font-mono text-gray-400">
              {selectedIds.length > 0 ? (
                <span className="text-white font-bold">
                  {isBn ? `${selectedIds.length} টি প্রশ্ন নির্বাচিত হয়েছে` : `${selectedIds.length} questions ready to add`}
                </span>
              ) : (
                <span>{isBn ? "কোনো প্রশ্ন নির্বাচিত হয়নি" : "No questions selected yet"}</span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  playSound("click");
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-mono font-bold uppercase transition cursor-pointer"
              >
                {isBn ? "বাতিল" : "Cancel"}
              </button>

              <button
                type="button"
                onClick={handleConfirmAddSelected}
                disabled={selectedIds.length === 0}
                className="px-6 py-2.5 rounded-xl bg-[#C1121F] hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-mono font-black uppercase tracking-wider transition shadow-lg shadow-red-950/40 flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-[#FFD700]" />
                <span>
                  {isBn
                    ? `পরীক্ষায় যুক্ত করুন (${selectedIds.length})`
                    : `Add Selected (${selectedIds.length}) to Exam`}
                </span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Interactive Question Preview Modal */}
      {previewingQuestion && (
        <QuestionPreviewModal
          question={previewingQuestion}
          onClose={() => setPreviewingQuestion(null)}
          isBn={isBn}
        />
      )}
    </AnimatePresence>
  );
}
