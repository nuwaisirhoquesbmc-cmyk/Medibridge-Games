import React, { useState, useEffect, useMemo } from "react";
import {
  BankQuestion,
  QuestionSubject,
  QuestionDifficulty,
  QuestionStatus,
  QuestionAvailability,
  QuestionFilterOptions,
  QuestionBankStats
} from "../../types/questionBankTypes";
import { Course } from "../../types/courseTypes";
import { db } from "../../lib/backend";
import {
  collection,
  getDocs,
  query,
  limit,
  deleteDoc,
  doc,
  writeBatch
} from "../../lib/supabaseDb";
import {
  normalizeToBankQuestion,
  computeQuestionBankStats,
  saveQuestionToFirestoreBank,
  updateQuestionInFirestoreBank,
  archiveQuestionInBank,
  unarchiveQuestionInBank,
  bulkImportToQuestionBank,
  buildUsageMapFromExams
} from "../../lib/questionBankService";
import { motion, AnimatePresence } from "motion/react";
import {
  BookOpen,
  Search,
  Filter,
  Plus,
  Trash2,
  Edit3,
  Copy,
  Eye,
  History,
  Archive,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Layers,
  CheckSquare,
  Square,
  TrendingUp,
  RefreshCw,
  ChevronRight,
  Sliders,
  Award,
  Globe,
  Lock,
  X,
  Loader2,
  FileText,
  AlertCircle
} from "lucide-react";
import { playSound } from "../../audio";
import QuestionUsageModal from "./QuestionUsageModal";
import QuestionPreviewModal from "./QuestionPreviewModal";
import * as XLSX from "xlsx";

interface QuestionBankManagerProps {
  courses?: Course[];
  liveExams?: any[];
  isBn?: boolean;
}

export default function QuestionBankManager({
  courses = [],
  liveExams = [],
  isBn = false
}: QuestionBankManagerProps) {
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [activeViewMode, setActiveViewMode] = useState<"cards" | "table">("cards");

  // Modals state
  const [usageModalQuestion, setUsageModalQuestion] = useState<BankQuestion | null>(null);
  const [previewModalQuestion, setPreviewModalQuestion] = useState<BankQuestion | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<BankQuestion | null>(null);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [deleteWarningQ, setDeleteWarningQ] = useState<BankQuestion | null>(null);

  // Filters State (Module 26)
  const [filters, setFilters] = useState<QuestionFilterOptions>({
    search: "",
    subject: "All",
    chapter: "All",
    topic: "",
    difficulty: "All",
    questionType: "all",
    usageStatus: "all",
    status: "active",
    availability: "all",
    sortBy: "newest"
  });

  // Create / Edit Question Form State
  const [formQCode, setFormQCode] = useState("");
  const [formQText, setFormQText] = useState("");
  const [formQImage, setFormQImage] = useState("");
  const [formQOptA, setFormQOptA] = useState("");
  const [formQOptB, setFormQOptB] = useState("");
  const [formQOptC, setFormQOptC] = useState("");
  const [formQOptD, setFormQOptD] = useState("");
  const [formQCorrect, setFormQCorrect] = useState<number>(0);
  const [formQExplanation, setFormQExplanation] = useState("");
  const [formQSubject, setFormQSubject] = useState<QuestionSubject>("Biology");
  const [formQChapter, setFormQChapter] = useState("General");
  const [formQTopic, setFormQTopic] = useState("");
  const [formQDifficulty, setFormQDifficulty] = useState<QuestionDifficulty>("Medium");
  const [formQMarks, setFormQMarks] = useState<number>(1);
  const [formQNegativeMarks, setFormQNegativeMarks] = useState<number>(0.25);
  const [formQAvailability, setFormQAvailability] = useState<QuestionAvailability>("global");
  const [formQAllowedCourses, setFormQAllowedCourses] = useState<string[]>([]);
  const [formQSource, setFormQSource] = useState("Question Bank");
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  // Bulk Import state (Module 36)
  const [importText, setImportText] = useState("");
  const [parsedImportRows, setParsedImportRows] = useState<any[]>([]);
  const [isProcessingImport, setIsProcessingImport] = useState(false);

  const [rawQuestions, setRawQuestions] = useState<any[]>([]);

  // On-demand Firestore fetch for Central Question Bank (runs once on mount)
  useEffect(() => {
    setLoading(true);
    const qQuery = query(collection(db, "questions"), limit(300));
    getDocs(qQuery)
      .then((snapshot) => {
        const list: any[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        setRawQuestions(list);
        setLoading(false);
      })
      .catch((err) => {
        console.warn("Question Bank fetch error:", err.message);
        setLoading(false);
      });
  }, []);

  // Compute normalized questions with exam usage mapping when rawQuestions or liveExams change
  useEffect(() => {
    if (rawQuestions.length === 0) return;
    const usageMap = buildUsageMapFromExams(liveExams);
    let seq = 1;
    const list: BankQuestion[] = rawQuestions.map((raw) => {
      const computedUsage = usageMap.get(raw.id) || [];
      return normalizeToBankQuestion(raw, seq++, computedUsage);
    });
    setQuestions(list);
  }, [rawQuestions, liveExams]);

  // Dynamic Statistics (Module 37)
  const stats: QuestionBankStats = useMemo(() => {
    return computeQuestionBankStats(questions);
  }, [questions]);

  // Unique Chapters based on selected subject
  const availableChapters = useMemo(() => {
    const relevant = questions.filter((q) => {
      if (filters.subject === "All") return true;
      return (q.subject || "").toLowerCase() === filters.subject.toLowerCase();
    });

    const set = new Set<string>();
    relevant.forEach((q) => {
      if (q.chapter && q.chapter.trim()) set.add(q.chapter.trim());
    });
    return Array.from(set);
  }, [questions, filters.subject]);

  // Filtered & Sorted Questions List (Module 26)
  const filteredQuestions = useMemo(() => {
    const list = questions.filter((q) => {
      // Status filter
      if (filters.status !== "all" && q.status !== filters.status) {
        return false;
      }

      // Subject filter
      if (filters.subject !== "All" && (q.subject || "").toLowerCase() !== filters.subject.toLowerCase()) {
        return false;
      }

      // Chapter filter
      if (filters.chapter !== "All" && (q.chapter || "").toLowerCase() !== filters.chapter.toLowerCase()) {
        return false;
      }

      // Difficulty filter
      if (filters.difficulty !== "All" && (q.difficulty || "").toLowerCase() !== filters.difficulty.toLowerCase()) {
        return false;
      }

      // Usage status filter
      if (filters.usageStatus === "used" && q.usageCount === 0) return false;
      if (filters.usageStatus === "unused" && q.usageCount > 0) return false;

      // Availability filter
      if (filters.availability !== "all" && q.availability !== filters.availability) {
        return false;
      }

      // Search matching (Text, ID, Code, Chapter, Topic, Explanation)
      if (filters.search.trim()) {
        const s = filters.search.toLowerCase();
        const inText = (q.questionText || "").toLowerCase().includes(s);
        const inCode = (q.code || "").toLowerCase().includes(s);
        const inId = (q.id || "").toLowerCase().includes(s);
        const inChapter = (q.chapter || "").toLowerCase().includes(s);
        const inTopic = (q.topic || "").toLowerCase().includes(s);
        const inExpl = (q.explanation || "").toLowerCase().includes(s);
        const inSource = (q.source || "").toLowerCase().includes(s);
        return inText || inCode || inId || inChapter || inTopic || inExpl || inSource;
      }

      return true;
    });

    // Sorting (Module 26)
    return list.sort((a, b) => {
      if (filters.sortBy === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (filters.sortBy === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (filters.sortBy === "most_used") {
        return (b.usageCount || 0) - (a.usageCount || 0);
      }
      if (filters.sortBy === "least_used") {
        return (a.usageCount || 0) - (b.usageCount || 0);
      }
      if (filters.sortBy === "code") {
        return (a.code || a.id).localeCompare(b.code || b.id);
      }
      if (filters.sortBy === "difficulty") {
        const rank: Record<string, number> = { Easy: 1, Medium: 2, Hard: 3 };
        return (rank[b.difficulty] || 0) - (rank[a.difficulty] || 0);
      }
      return 0;
    });
  }, [questions, filters]);

  // Open Create Question Modal
  const openCreateModal = () => {
    playSound("click");
    setEditingQuestion(null);
    setFormQCode("");
    setFormQText("");
    setFormQImage("");
    setFormQOptA("");
    setFormQOptB("");
    setFormQOptC("");
    setFormQOptD("");
    setFormQCorrect(0);
    setFormQExplanation("");
    setFormQSubject("Biology");
    setFormQChapter("General");
    setFormQTopic("");
    setFormQDifficulty("Medium");
    setFormQMarks(1);
    setFormQNegativeMarks(0.25);
    setFormQAvailability("global");
    setFormQAllowedCourses([]);
    setFormQSource("Question Bank");
    setIsCreateModalOpen(true);
  };

  // Open Edit Question Modal
  const openEditModal = (q: BankQuestion) => {
    playSound("click");
    setEditingQuestion(q);
    setFormQCode(q.code || "");
    setFormQText(q.questionText || "");
    setFormQImage(q.imageUrl || "");
    setFormQOptA(q.options[0] || "");
    setFormQOptB(q.options[1] || "");
    setFormQOptC(q.options[2] || "");
    setFormQOptD(q.options[3] || "");
    setFormQCorrect(q.correctAnswerIndex ?? 0);
    setFormQExplanation(q.explanation || "");
    setFormQSubject(q.subject || "Biology");
    setFormQChapter(q.chapter || "General");
    setFormQTopic(q.topic || "");
    setFormQDifficulty(q.difficulty || "Medium");
    setFormQMarks(q.marks ?? 1);
    setFormQNegativeMarks(q.negativeMarks ?? 0.25);
    setFormQAvailability(q.availability || "global");
    setFormQAllowedCourses(q.allowedCourseIds || []);
    setFormQSource(q.source || "Question Bank");
    setIsCreateModalOpen(true);
  };

  // Handle Save (Create or Update)
  const handleSaveQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formQText || !formQOptA || !formQOptB) return;

    try {
      setIsSubmittingForm(true);
      playSound("click");

      const questionPayload = {
        code: formQCode,
        questionText: formQText,
        imageUrl: formQImage,
        options: [formQOptA, formQOptB, formQOptC || "", formQOptD || ""],
        correctAnswerIndex: formQCorrect,
        explanation: formQExplanation,
        subject: formQSubject,
        chapter: formQChapter,
        topic: formQTopic,
        difficulty: formQDifficulty,
        marks: formQMarks,
        negativeMarks: formQNegativeMarks,
        availability: formQAvailability,
        allowedCourseIds: formQAllowedCourses,
        source: formQSource
      };

      if (editingQuestion) {
        await updateQuestionInFirestoreBank(editingQuestion.id, questionPayload);
      } else {
        await saveQuestionToFirestoreBank(questionPayload);
      }

      setIsCreateModalOpen(false);
      setIsSubmittingForm(false);
      playSound("correct");
    } catch (err: any) {
      console.error("Save question error:", err);
      setIsSubmittingForm(false);
      alert("Error saving question: " + err.message);
    }
  };

  // Duplicate Question
  const handleDuplicateQuestion = async (q: BankQuestion) => {
    playSound("click");
    try {
      await saveQuestionToFirestoreBank({
        ...q,
        code: `${q.code || "Q"}-COPY`,
        questionText: `${q.questionText} (Copy)`,
        usageCount: 0,
        usedInExams: []
      });
      playSound("correct");
    } catch (err: any) {
      alert("Failed to duplicate: " + err.message);
    }
  };

  // Safe Deletion Handler (Module 35)
  const handleDeleteClick = (q: BankQuestion) => {
    playSound("click");
    if (q.usageCount > 0) {
      setDeleteWarningQ(q);
    } else {
      if (confirm(isBn ? "আপনি কি এই প্রশ্নটি মুছে ফেলতে চান?" : "Are you sure you want to delete this question?")) {
        deleteDoc(doc(db, "questions", q.id));
        playSound("wrong");
      }
    }
  };

  // Archive Question
  const handleArchiveQuestion = async (qId: string) => {
    playSound("click");
    await archiveQuestionInBank(qId);
    playSound("correct");
  };

  // Unarchive Question
  const handleUnarchiveQuestion = async (qId: string) => {
    playSound("click");
    await unarchiveQuestionInBank(qId);
    playSound("correct");
  };

  // Multi-Select handlers (Module 27)
  const toggleSelect = (id: string) => {
    playSound("click");
    setSelectedQuestionIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAllFiltered = () => {
    playSound("click");
    const ids = filteredQuestions.map((q) => q.id);
    setSelectedQuestionIds(ids);
  };

  const deselectAll = () => {
    playSound("click");
    setSelectedQuestionIds([]);
  };

  // Bulk Archive Selected
  const handleBulkArchive = async () => {
    if (selectedQuestionIds.length === 0) return;
    playSound("click");
    if (confirm(`Archive ${selectedQuestionIds.length} selected questions?`)) {
      const batch = writeBatch(db);
      selectedQuestionIds.forEach((id) => {
        batch.update(doc(db, "questions", id), {
          status: "archived",
          updatedAt: new Date().toISOString()
        });
      });
      await batch.commit();
      setSelectedQuestionIds([]);
      playSound("correct");
    }
  };

  // Bulk Export to CSV (Module 36)
  const handleExportCSV = () => {
    playSound("click");
    const itemsToExport =
      selectedQuestionIds.length > 0
        ? questions.filter((q) => selectedQuestionIds.includes(q.id))
        : filteredQuestions;

    const data = itemsToExport.map((q, idx) => ({
      "SL": idx + 1,
      "Question Code": q.code || q.id,
      "Question Text": q.questionText,
      "Option A": q.options[0] || "",
      "Option B": q.options[1] || "",
      "Option C": q.options[2] || "",
      "Option D": q.options[3] || "",
      "Correct Answer (A/B/C/D)": ["A", "B", "C", "D"][q.correctAnswerIndex] || "A",
      "Subject": q.subject,
      "Chapter": q.chapter,
      "Topic": q.topic || "",
      "Difficulty": q.difficulty,
      "Marks": q.marks || 1,
      "Negative Marks": q.negativeMarks || 0.25,
      "Usage Count": q.usageCount || 0,
      "Explanation": q.explanation || "",
      "Source": q.source || "Question Bank"
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Question Bank");
    XLSX.writeFile(workbook, `medibridge_question_bank_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Download Sample CSV Template (Module 36)
  const handleDownloadTemplate = () => {
    playSound("click");
    const templateData = [
      {
        "Question Text": "মানবদেহের বৃহত্তম পৌষ্টিক গ্রন্থি কোনটি?",
        "Option A": "অগ্ন্যাশয়",
        "Option B": "যকৃৎ",
        "Option C": "গ্যাস্ট্রিক গ্রন্থি",
        "Option D": "লালা গ্রন্থি",
        "Correct Answer (A/B/C/D)": "B",
        "Subject": "Biology",
        "Chapter": "Human Physiology",
        "Topic": "Digestion & Absorption",
        "Difficulty": "Easy",
        "Marks": 1,
        "Negative Marks": 0.25,
        "Explanation": "যকৃৎ মানবদেহের সবচেয়ে বড় অভ্যন্তরীণ অঙ্গ ও সবচেয়ে বড় গ্রন্থি।",
        "Source": "MAT 2023"
      },
      {
        "Question Text": "কোন মৌলের তড়িৎ ঋণাত্মকতা সবচেয়ে বেশি?",
        "Option A": "ক্লোরিন (Cl)",
        "Option B": "অক্সিজেন (O)",
        "Option C": "ফ্লোরিন (F)",
        "Option D": "নাইট্রোজেন (N)",
        "Correct Answer (A/B/C/D)": "C",
        "Subject": "Chemistry",
        "Chapter": "Periodic Properties",
        "Topic": "Electronegativity",
        "Difficulty": "Medium",
        "Marks": 1,
        "Negative Marks": 0.25,
        "Explanation": "পাউলিং স্কেলে ফ্লোরিনের তড়িৎ ঋণাত্মকতার মান ৪.০ যা সর্বোচ্চ।",
        "Source": "Textbook Standard"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Questions Template");
    XLSX.writeFile(wb, "medibridge_question_bank_template.xlsx");
  };

  // File upload parser for bulk import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        const normalizedRows = data.map((row: any) => {
          const optLetter = String(row["Correct Answer (A/B/C/D)"] || row["Correct Option"] || "A").trim().toUpperCase();
          const correctIdx = optLetter === "A" ? 0 : optLetter === "B" ? 1 : optLetter === "C" ? 2 : optLetter === "D" ? 3 : 0;

          return {
            questionText: row["Question Text"] || row["Question"] || "",
            options: [
              String(row["Option A"] || ""),
              String(row["Option B"] || ""),
              String(row["Option C"] || ""),
              String(row["Option D"] || "")
            ],
            correctAnswerIndex: correctIdx,
            subject: row["Subject"] || "Biology",
            chapter: row["Chapter"] || "General",
            topic: row["Topic"] || "",
            difficulty: row["Difficulty"] || "Medium",
            marks: Number(row["Marks"]) || 1,
            negativeMarks: Number(row["Negative Marks"]) || 0.25,
            explanation: row["Explanation"] || "",
            source: row["Source"] || "Bulk Excel Import"
          };
        });

        setParsedImportRows(normalizedRows);
        playSound("correct");
      } catch (err: any) {
        alert("Failed to parse file: " + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Process and commit bulk imported questions
  const handleExecuteBulkImport = async () => {
    if (parsedImportRows.length === 0) return;
    try {
      setIsProcessingImport(true);
      playSound("click");

      const result = await bulkImportToQuestionBank(parsedImportRows);
      alert(`Successfully imported ${result.totalImported} questions into Central Question Bank!`);
      setParsedImportRows([]);
      setIsBulkImportOpen(false);
      setIsProcessingImport(false);
      playSound("correct");
    } catch (err: any) {
      setIsProcessingImport(false);
      alert("Bulk import failed: " + err.message);
    }
  };

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Top Banner Header (Module 23) */}
      <div className="bg-[#141416] p-6 rounded-2xl border border-white/10 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-amber-500 to-emerald-500"></div>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#FFD700] uppercase">
              <BookOpen className="w-4 h-4 text-[#FFD700]" />
              <span>CENTRAL QUESTION BANK & REUSABLE QUESTION LIBRARY</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white uppercase mt-1 font-display flex items-center gap-2">
              📚 CENTRAL QUESTION BANK (সেন্ট্রাল প্রশ্ন ব্যাংক)
            </h2>
            <p className="text-xs text-gray-400 mt-1 max-w-3xl leading-relaxed">
              Platform-এর সকল বিষয়ের প্রশ্নসমূহ একটি কেন্দ্রীয় লাইব্রেরিতে স্থায়ীভাবে সংরক্ষিত। এখান থেকে যেকোনো কোর্সের নতুন এক্সাম তৈরিতে বিদ্যমান প্রশ্নসমূহ তাৎক্ষণিকভাবে নির্বাচন ও পুনরায় ব্যবহার (Reuse) করা যাবে।
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={openCreateModal}
              className="px-4 py-2.5 bg-[#C1121F] hover:bg-red-700 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-red-950/40 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isBn ? "+ নতুন প্রশ্ন যোগ করুন" : "+ Add Question"}</span>
            </button>

            <button
              onClick={() => {
                playSound("click");
                setIsBulkImportOpen(true);
              }}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-white/10 text-gray-200 rounded-xl text-xs font-mono font-bold uppercase flex items-center gap-2 transition cursor-pointer"
            >
              <Upload className="w-4 h-4 text-amber-400" />
              <span>{isBn ? "বাল্ক ইমপোর্ট (CSV/Excel)" : "Bulk Import"}</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-emerald-400 rounded-xl text-xs font-mono font-bold transition cursor-pointer"
              title="Export to Excel / CSV"
            >
              <FileSpreadsheet className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* STATISTICS DASHBOARD WIDGETS (Module 37) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Total Questions */}
        <div className="bg-[#141416] p-4 rounded-xl border border-white/10 flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase text-gray-400 font-bold block">
            TOTAL QUESTIONS
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-xl font-black text-white font-mono">{stats.totalQuestions}</span>
            <span className="text-[10px] font-mono text-[#FFD700]">100%</span>
          </div>
        </div>

        {/* Biology */}
        <div className="bg-[#141416] p-4 rounded-xl border border-emerald-500/20 flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold block">
            🌿 BIOLOGY
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-xl font-black text-emerald-300 font-mono">{stats.biologyCount}</span>
            <span className="text-[10px] font-mono text-gray-500">
              {stats.totalQuestions ? Math.round((stats.biologyCount / stats.totalQuestions) * 100) : 0}%
            </span>
          </div>
        </div>

        {/* Chemistry */}
        <div className="bg-[#141416] p-4 rounded-xl border border-sky-500/20 flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase text-sky-400 font-bold block">
            🧪 CHEMISTRY
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-xl font-black text-sky-300 font-mono">{stats.chemistryCount}</span>
            <span className="text-[10px] font-mono text-gray-500">
              {stats.totalQuestions ? Math.round((stats.chemistryCount / stats.totalQuestions) * 100) : 0}%
            </span>
          </div>
        </div>

        {/* Physics */}
        <div className="bg-[#141416] p-4 rounded-xl border border-purple-500/20 flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase text-purple-400 font-bold block">
            ⚡ PHYSICS
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-xl font-black text-purple-300 font-mono">{stats.physicsCount}</span>
            <span className="text-[10px] font-mono text-gray-500">
              {stats.totalQuestions ? Math.round((stats.physicsCount / stats.totalQuestions) * 100) : 0}%
            </span>
          </div>
        </div>

        {/* GK & English */}
        <div className="bg-[#141416] p-4 rounded-xl border border-amber-500/20 flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase text-amber-400 font-bold block">
            🌍 GK & ENGLISH
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-xl font-black text-amber-300 font-mono">{stats.gkCount + stats.englishCount}</span>
            <span className="text-[10px] font-mono text-gray-500">
              {stats.totalQuestions ? Math.round(((stats.gkCount + stats.englishCount) / stats.totalQuestions) * 100) : 0}%
            </span>
          </div>
        </div>

        {/* Used in Exams */}
        <div className="bg-[#141416] p-4 rounded-xl border border-blue-500/20 flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase text-blue-400 font-bold block">
            🎯 USED IN EXAMS
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-xl font-black text-blue-300 font-mono">{stats.usedCount}</span>
            <span className="text-[10px] font-mono text-gray-500">Active</span>
          </div>
        </div>

        {/* Fresh / Unused */}
        <div className="bg-[#141416] p-4 rounded-xl border border-white/10 flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase text-gray-400 font-bold block">
            ✨ FRESH UNUSED
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-xl font-black text-white font-mono">{stats.unusedCount}</span>
            <span className="text-[10px] font-mono text-emerald-400">Ready</span>
          </div>
        </div>
      </div>

      {/* SEARCH, FILTER & MULTI-SORT TOOLBAR (Module 26) */}
      <div className="bg-[#141416] p-5 rounded-2xl border border-white/10 flex flex-col gap-4">
        {/* Top search & quick controls */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder={isBn ? "প্রশ্ন টেক্সট, কোড (Q001), অধ্যায়, ব্যাখ্যা বা টপিক দিয়ে সার্চ করুন..." : "Search by question text, code (Q001), chapter, topic, explanation..."}
              className="w-full bg-black/60 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#C1121F]"
            />
            {filters.search && (
              <button
                onClick={() => setFilters({ ...filters, search: "" })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-mono text-gray-400 uppercase font-bold">Sort:</span>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as any })}
              className="bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-gray-300 focus:outline-none focus:border-[#C1121F]"
            >
              <option value="newest">🕒 Newest First</option>
              <option value="oldest">🕰 Oldest First</option>
              <option value="most_used">🔥 Most Used in Exams</option>
              <option value="least_used">🌱 Least Used</option>
              <option value="code">🏷️ Question ID / Code</option>
              <option value="difficulty">⚡ Difficulty (Hard to Easy)</option>
            </select>
          </div>
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs font-mono">
          {/* Subject Filter */}
          <div>
            <label className="text-[10px] text-gray-400 block mb-1 uppercase font-bold">Subject</label>
            <select
              value={filters.subject}
              onChange={(e) => setFilters({ ...filters, subject: e.target.value, chapter: "All" })}
              className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-gray-300 focus:outline-none focus:border-[#C1121F]"
            >
              <option value="All">All Subjects</option>
              <option value="Biology">Biology</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Physics">Physics</option>
              <option value="English">English</option>
              <option value="GK">General Knowledge</option>
            </select>
          </div>

          {/* Chapter Filter */}
          <div>
            <label className="text-[10px] text-gray-400 block mb-1 uppercase font-bold">Chapter</label>
            <select
              value={filters.chapter}
              onChange={(e) => setFilters({ ...filters, chapter: e.target.value })}
              className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-gray-300 focus:outline-none focus:border-[#C1121F]"
            >
              <option value="All">All Chapters</option>
              {availableChapters.map((ch) => (
                <option key={ch} value={ch}>
                  {ch}
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty Filter */}
          <div>
            <label className="text-[10px] text-gray-400 block mb-1 uppercase font-bold">Difficulty</label>
            <select
              value={filters.difficulty}
              onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
              className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-gray-300 focus:outline-none focus:border-[#C1121F]"
            >
              <option value="All">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>

          {/* Usage Status Filter */}
          <div>
            <label className="text-[10px] text-gray-400 block mb-1 uppercase font-bold">Usage Status</label>
            <select
              value={filters.usageStatus}
              onChange={(e) => setFilters({ ...filters, usageStatus: e.target.value as any })}
              className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-gray-300 focus:outline-none focus:border-[#C1121F]"
            >
              <option value="all">All Questions</option>
              <option value="used">🎯 Used in Exams</option>
              <option value="unused">✨ Fresh / Unused</option>
            </select>
          </div>

          {/* Status (Active / Archived) */}
          <div>
            <label className="text-[10px] text-gray-400 block mb-1 uppercase font-bold">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
              className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-gray-300 focus:outline-none focus:border-[#C1121F]"
            >
              <option value="active">Active Questions</option>
              <option value="archived">📦 Archived Questions</option>
              <option value="all">All (Active & Archived)</option>
            </select>
          </div>

          {/* Availability (Global / Course Specific) */}
          <div>
            <label className="text-[10px] text-gray-400 block mb-1 uppercase font-bold">Scope</label>
            <select
              value={filters.availability}
              onChange={(e) => setFilters({ ...filters, availability: e.target.value as any })}
              className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-gray-300 focus:outline-none focus:border-[#C1121F]"
            >
              <option value="all">All Scopes</option>
              <option value="global">🌐 Global (All Courses)</option>
              <option value="course_specific">🔒 Course Specific</option>
            </select>
          </div>
        </div>

        {/* Batch Selection Action Bar (Module 27) */}
        <div className="pt-3 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <button
              onClick={selectAllFiltered}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 flex items-center gap-1.5 cursor-pointer"
            >
              <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span>Select All Filtered ({filteredQuestions.length})</span>
            </button>
            {selectedQuestionIds.length > 0 && (
              <button
                onClick={deselectAll}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-red-400 flex items-center gap-1.5 cursor-pointer"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Deselect All</span>
              </button>
            )}
          </div>

          {selectedQuestionIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[#FFD700] font-bold">
                {selectedQuestionIds.length} questions selected
              </span>
              <button
                onClick={handleBulkArchive}
                className="px-3 py-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900/80 border border-amber-500/40 text-amber-300 flex items-center gap-1.5 cursor-pointer"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Bulk Archive</span>
              </button>
              <button
                onClick={handleExportCSV}
                className="px-3 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/40 text-emerald-300 flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export Selected</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* QUESTION CATALOGUE CARDS LIST (Module 23) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1 text-xs font-mono text-gray-400">
          <span>SHOWING {filteredQuestions.length} OF {questions.length} QUESTIONS IN ARSENAL</span>
          <span>LIVE CLOUD PERSISTENCE ACTIVE</span>
        </div>

        {loading ? (
          <div className="py-24 text-center bg-[#141416] rounded-2xl border border-white/10 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-[#FFD700] animate-spin" />
            <span className="text-xs font-mono text-gray-400">Synchronizing Central Question Bank...</span>
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="py-20 text-center bg-[#141416] rounded-2xl border border-white/10 p-6 space-y-3">
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-500">
              <BookOpen className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white font-mono uppercase">
              {isBn ? "কোনো প্রশ্ন পাওয়া যায়নি" : "No Questions Found in Question Bank"}
            </h4>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              {isBn
                ? "ফিল্টার পরিবর্তন করুন অথবা নতুন প্রশ্ন তৈরি করে যুক্ত করুন।"
                : "Try adjusting your search criteria or add new questions to the repository."}
            </p>
            <button
              onClick={openCreateModal}
              className="px-5 py-2.5 bg-[#C1121F] hover:bg-red-700 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isBn ? "+ নতুন প্রশ্ন যোগ করুন" : "+ Add Question Now"}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredQuestions.map((q) => {
              const isSelected = selectedQuestionIds.includes(q.id);
              const isArchived = q.status === "archived";

              return (
                <div
                  key={q.id}
                  className={`p-4 sm:p-5 rounded-2xl border transition relative overflow-hidden flex flex-col md:flex-row md:items-start justify-between gap-4 ${
                    isArchived
                      ? "bg-black/30 border-gray-800 opacity-70"
                      : isSelected
                      ? "bg-[#161314] border-[#C1121F] shadow-lg shadow-red-950/20"
                      : "bg-[#141416] border-white/10 hover:border-white/20"
                  }`}
                >
                  {/* Left Side: Checkbox & Question Details */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(q.id)}
                      className="mt-1 accent-[#C1121F] w-4 h-4 rounded shrink-0 cursor-pointer"
                    />

                    <div className="space-y-2 flex-1 min-w-0">
                      {/* Meta Tags Row */}
                      <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono">
                        <span className="px-2 py-0.5 rounded bg-white/10 font-bold text-[#FFD700]">
                          {q.code || q.id.slice(0, 8)}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-red-950/80 border border-red-500/40 text-red-300 font-bold uppercase">
                          {q.subject}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-300 truncate max-w-[160px]">
                          {q.chapter}
                        </span>
                        {q.topic && (
                          <span className="px-2 py-0.5 rounded bg-white/5 text-gray-400 truncate max-w-[120px]">
                            {q.topic}
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 rounded bg-white/5 text-gray-400 uppercase font-bold">
                          {q.difficulty}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-white/5 text-gray-400">
                          +{q.marks || 1} / -{q.negativeMarks || 0.25}
                        </span>

                        {q.availability === "global" ? (
                          <span className="px-1.5 py-0.5 rounded bg-blue-950/60 border border-blue-500/30 text-blue-300 flex items-center gap-1 font-bold">
                            <Globe className="w-3 h-3" /> ALL COURSES
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-500/30 text-purple-300 flex items-center gap-1 font-bold">
                            <Lock className="w-3 h-3" /> COURSE SPECIFIC
                          </span>
                        )}

                        {/* Usage Counter Badge (Module 34) */}
                        {q.usageCount > 0 ? (
                          <button
                            type="button"
                            onClick={() => {
                              playSound("click");
                              setUsageModalQuestion(q);
                            }}
                            className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold flex items-center gap-1 transition cursor-pointer"
                          >
                            <History className="w-3 h-3 text-amber-400" />
                            <span>Used in {q.usageCount} Exams</span>
                          </button>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold">
                            Fresh / Unused
                          </span>
                        )}

                        {isArchived && (
                          <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-400 font-bold uppercase">
                            Archived
                          </span>
                        )}
                      </div>

                      {/* Question Text */}
                      <p className="text-sm font-semibold text-white leading-relaxed">
                        {q.questionText}
                      </p>

                      {/* Diagram image if present */}
                      {q.imageUrl && (
                        <div className="max-w-xs rounded-xl overflow-hidden border border-white/10 bg-black/60 p-1.5">
                          <img
                            src={q.imageUrl}
                            alt="Question Diagram"
                            className="max-h-36 object-contain rounded-lg"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}

                      {/* 4 Options Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                        {q.options.map((opt, idx) => {
                          const isCorrect = idx === q.correctAnswerIndex;
                          return (
                            <div
                              key={idx}
                              className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 ${
                                isCorrect
                                  ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300 font-bold"
                                  : "bg-black/40 border-white/5 text-gray-400"
                              }`}
                            >
                              <span className="w-5 h-5 rounded bg-white/5 text-[10px] font-mono flex items-center justify-center shrink-0">
                                {["A", "B", "C", "D"][idx]}
                              </span>
                              <span className="truncate">{opt}</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation Snippet */}
                      {q.explanation && (
                        <p className="text-[11px] text-gray-400 italic pt-1 line-clamp-2">
                          <span className="text-[#FFD700] not-italic font-bold font-mono">Ref: </span>
                          {q.explanation}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Side: Action Buttons Bar */}
                  <div className="flex md:flex-col items-center justify-end gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-white/5">
                    {/* Preview Student View */}
                    <button
                      type="button"
                      onClick={() => {
                        playSound("click");
                        setPreviewModalQuestion(q);
                      }}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white transition cursor-pointer"
                      title="Interactive Student Preview"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {/* View Usage Modal Button (Module 34) */}
                    <button
                      type="button"
                      onClick={() => {
                        playSound("click");
                        setUsageModalQuestion(q);
                      }}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-amber-400 hover:text-amber-300 transition cursor-pointer"
                      title="View Exam Usage History"
                    >
                      <History className="w-4 h-4" />
                    </button>

                    {/* Edit Question */}
                    <button
                      type="button"
                      onClick={() => openEditModal(q)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-sky-400 hover:text-sky-300 transition cursor-pointer"
                      title="Edit Question Record"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    {/* Duplicate */}
                    <button
                      type="button"
                      onClick={() => handleDuplicateQuestion(q)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white transition cursor-pointer"
                      title="Duplicate Question"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    {/* Archive / Unarchive */}
                    {isArchived ? (
                      <button
                        type="button"
                        onClick={() => handleUnarchiveQuestion(q.id)}
                        className="p-2 rounded-xl bg-emerald-950/40 hover:bg-emerald-950 border border-emerald-500/30 text-emerald-400 transition cursor-pointer"
                        title="Unarchive / Restore"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleArchiveQuestion(q.id)}
                        className="p-2 rounded-xl bg-amber-950/40 hover:bg-amber-950 border border-amber-500/30 text-amber-400 transition cursor-pointer"
                        title="Archive Question"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    )}

                    {/* Safe Delete with Accidental Protection (Module 35) */}
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(q)}
                      className="p-2 rounded-xl bg-red-950/40 hover:bg-red-950 border border-red-500/30 text-red-400 hover:text-red-300 transition cursor-pointer"
                      title="Delete Question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE / EDIT QUESTION MODAL */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              className="relative w-full max-w-3xl bg-[#121214] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] font-sans text-white"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-white/10 bg-gradient-to-r from-black via-[#1c1417] to-black flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#C1121F]/20 border border-[#C1121F]/40 flex items-center justify-center text-[#FFD700]">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white uppercase font-display">
                      {editingQuestion
                        ? isBn ? "প্রশ্ন সম্পাদনা করুন (Edit Question Record)" : "Edit Question in Bank"
                        : isBn ? "প্রশ্ন ব্যাংকে নতুন প্রশ্ন যুক্ত করুন" : "Add New Question to Question Bank"}
                    </h3>
                    <span className="text-[10px] font-mono text-gray-400">
                      Auto-assigned to Central Reusable Repository
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    playSound("click");
                    setIsCreateModalOpen(false);
                  }}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body Form */}
              <form onSubmit={handleSaveQuestionSubmit} className="p-6 overflow-y-auto flex-1 space-y-4 text-xs font-sans">
                {/* Code & Availability Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-mono uppercase text-gray-400 font-bold block mb-1">
                      Question Code / ID
                    </label>
                    <input
                      type="text"
                      value={formQCode}
                      onChange={(e) => setFormQCode(e.target.value)}
                      placeholder="e.g. Q-BIO-001 (Auto-generated if empty)"
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-[#C1121F]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase text-gray-400 font-bold block mb-1">
                      Availability Scope (Module 31)
                    </label>
                    <select
                      value={formQAvailability}
                      onChange={(e) => setFormQAvailability(e.target.value as any)}
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#C1121F]"
                    >
                      <option value="global">🌐 Global (Available to All Courses)</option>
                      <option value="course_specific">🔒 Course Specific</option>
                    </select>
                  </div>
                </div>

                {/* Question Text */}
                <div>
                  <label className="text-[11px] font-mono uppercase text-gray-300 font-bold block mb-1">
                    Question Text *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={formQText}
                    onChange={(e) => setFormQText(e.target.value)}
                    placeholder="Enter medical entrance question text..."
                    className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#C1121F] resize-none text-xs leading-relaxed"
                  />
                </div>

                {/* Optional Image URL */}
                <div>
                  <label className="text-[10px] font-mono uppercase text-gray-400 font-bold block mb-1">
                    Diagram Image URL (Optional)
                  </label>
                  <input
                    type="text"
                    value={formQImage}
                    onChange={(e) => setFormQImage(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-[#C1121F]"
                  />
                </div>

                {/* 4 Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-mono uppercase text-gray-400 font-bold block mb-1">Option A *</label>
                    <input
                      type="text"
                      required
                      value={formQOptA}
                      onChange={(e) => setFormQOptA(e.target.value)}
                      placeholder="Option A"
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#C1121F]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase text-gray-400 font-bold block mb-1">Option B *</label>
                    <input
                      type="text"
                      required
                      value={formQOptB}
                      onChange={(e) => setFormQOptB(e.target.value)}
                      placeholder="Option B"
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#C1121F]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase text-gray-400 font-bold block mb-1">Option C</label>
                    <input
                      type="text"
                      value={formQOptC}
                      onChange={(e) => setFormQOptC(e.target.value)}
                      placeholder="Option C"
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#C1121F]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase text-gray-400 font-bold block mb-1">Option D</label>
                    <input
                      type="text"
                      value={formQOptD}
                      onChange={(e) => setFormQOptD(e.target.value)}
                      placeholder="Option D"
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#C1121F]"
                    />
                  </div>
                </div>

                {/* Correct Answer & Subject & Chapter */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-mono uppercase text-emerald-400 font-bold block mb-1">
                      Correct Answer *
                    </label>
                    <select
                      value={formQCorrect}
                      onChange={(e) => setFormQCorrect(Number(e.target.value))}
                      className="w-full bg-black/60 border border-emerald-500/40 rounded-xl px-3 py-2 text-emerald-300 font-mono font-bold focus:outline-none"
                    >
                      <option value={0}>Option A (Index 0)</option>
                      <option value={1}>Option B (Index 1)</option>
                      <option value={2}>Option C (Index 2)</option>
                      <option value={3}>Option D (Index 3)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase text-gray-400 font-bold block mb-1">Subject</label>
                    <select
                      value={formQSubject}
                      onChange={(e) => setFormQSubject(e.target.value as any)}
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
                    <label className="text-[10px] font-mono uppercase text-gray-400 font-bold block mb-1">Chapter</label>
                    <input
                      type="text"
                      value={formQChapter}
                      onChange={(e) => setFormQChapter(e.target.value)}
                      placeholder="e.g. Genetics"
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Difficulty & Marks & Negative Marks */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-mono uppercase text-gray-400 font-bold block mb-1">Difficulty</label>
                    <select
                      value={formQDifficulty}
                      onChange={(e) => setFormQDifficulty(e.target.value as any)}
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase text-gray-400 font-bold block mb-1">Marks</label>
                    <input
                      type="number"
                      step={0.5}
                      value={formQMarks}
                      onChange={(e) => setFormQMarks(Number(e.target.value))}
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase text-gray-400 font-bold block mb-1">Negative Marks</label>
                    <input
                      type="number"
                      step={0.05}
                      value={formQNegativeMarks}
                      onChange={(e) => setFormQNegativeMarks(Number(e.target.value))}
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-red-300 font-mono focus:outline-none"
                    />
                  </div>
                </div>

                {/* Explanation */}
                <div>
                  <label className="text-[10px] font-mono uppercase text-gray-400 font-bold block mb-1">
                    Explanation & References
                  </label>
                  <textarea
                    rows={2}
                    value={formQExplanation}
                    onChange={(e) => setFormQExplanation(e.target.value)}
                    placeholder="Clinical explanation, textbook reference, page number..."
                    className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#C1121F] resize-none"
                  />
                </div>

                {/* Submit button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingForm}
                    className="w-full py-3 rounded-xl bg-[#C1121F] hover:bg-red-700 disabled:opacity-50 text-white font-mono font-bold uppercase text-xs tracking-wider transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmittingForm ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving Question...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-[#FFD700]" />
                        <span>{editingQuestion ? "Update Question Record" : "Save to Question Bank"}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* BULK IMPORT MODAL (Module 36) */}
      <AnimatePresence>
        {isBulkImportOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              className="relative w-full max-w-4xl bg-[#121214] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] font-sans text-white"
            >
              <div className="p-5 border-b border-white/10 bg-gradient-to-r from-black via-[#1c1417] to-black flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-950/60 border border-amber-500/40 flex items-center justify-center text-amber-400">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white uppercase font-display">
                      {isBn ? "বাল্ক প্রশ্ন ইমপোর্ট (Bulk Question Importer)" : "Bulk Question Importer (CSV / Excel)"}
                    </h3>
                    <span className="text-[10px] font-mono text-gray-400">
                      Import hundreds of questions directly to Question Bank
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    playSound("click");
                    setIsBulkImportOpen(false);
                    setParsedImportRows([]);
                  }}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-5 text-xs font-sans">
                {/* Download Template Box */}
                <div className="p-4 rounded-xl bg-[#17171a] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-white font-mono uppercase flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      Download Excel / CSV Standard Template
                    </h4>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Use our formatted template columns: Question Text, Option A, B, C, D, Correct Answer, Subject, Chapter, Difficulty, Explanation.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="px-4 py-2 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 rounded-xl font-mono font-bold text-xs uppercase flex items-center gap-2 shrink-0 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Template</span>
                  </button>
                </div>

                {/* Upload Box */}
                <div className="border-2 border-dashed border-white/15 rounded-2xl p-6 text-center space-y-3 bg-black/40 hover:border-[#C1121F]/50 transition">
                  <Upload className="w-8 h-8 text-gray-500 mx-auto" />
                  <div>
                    <span className="text-xs font-bold text-white font-mono uppercase block">
                      Select CSV or Excel (.xlsx) File
                    </span>
                    <span className="text-[10px] text-gray-400">
                      Drag and drop your file or click to browse
                    </span>
                  </div>
                  <label className="inline-block px-5 py-2.5 rounded-xl bg-[#C1121F] hover:bg-red-700 text-white font-mono font-bold text-xs uppercase tracking-wider cursor-pointer shadow-lg">
                    Choose Excel / CSV File
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Preview Table of Parsed Rows */}
                {parsedImportRows.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-emerald-400 uppercase text-xs">
                        ✓ {parsedImportRows.length} Questions Ready to Import
                      </span>
                      <button
                        type="button"
                        onClick={() => setParsedImportRows([])}
                        className="text-red-400 hover:text-red-300 text-[10px] font-mono uppercase"
                      >
                        Clear List
                      </button>
                    </div>

                    <div className="max-h-60 overflow-y-auto border border-white/10 rounded-xl bg-black/60 divide-y divide-white/5">
                      {parsedImportRows.slice(0, 20).map((row, idx) => (
                        <div key={idx} className="p-3 text-[11px] space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[#FFD700]">#{idx + 1}</span>
                            <span className="font-mono px-1.5 py-0.2 rounded bg-red-950 text-red-300 text-[9px] uppercase font-bold">
                              {row.subject}
                            </span>
                            <span className="font-semibold text-white truncate">{row.questionText}</span>
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono">
                            Correct: Option {["A", "B", "C", "D"][row.correctAnswerIndex]} | Chap: {row.chapter} | Diff: {row.difficulty}
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      disabled={isProcessingImport}
                      onClick={handleExecuteBulkImport}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-mono font-black uppercase text-xs tracking-wider transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isProcessingImport ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Importing to Question Bank...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-[#FFD700]" />
                          <span>Commit {parsedImportRows.length} Questions to Central Bank</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ACCIDENTAL DELETION WARNING MODAL (Module 35) */}
      {deleteWarningQ && (
        <QuestionUsageModal
          question={deleteWarningQ}
          onClose={() => setDeleteWarningQ(null)}
          onArchive={(qId) => {
            archiveQuestionInBank(qId);
            setDeleteWarningQ(null);
          }}
          onForceDelete={(qId) => {
            deleteDoc(doc(db, "questions", qId));
            setDeleteWarningQ(null);
          }}
          isBn={isBn}
        />
      )}

      {/* USAGE MODAL */}
      {usageModalQuestion && (
        <QuestionUsageModal
          question={usageModalQuestion}
          onClose={() => setUsageModalQuestion(null)}
          onArchive={(qId) => archiveQuestionInBank(qId)}
          onForceDelete={(qId) => deleteDoc(doc(db, "questions", qId))}
          isBn={isBn}
        />
      )}

      {/* STUDENT PREVIEW MODAL */}
      {previewModalQuestion && (
        <QuestionPreviewModal
          question={previewModalQuestion}
          onClose={() => setPreviewModalQuestion(null)}
          isBn={isBn}
        />
      )}
    </div>
  );
}
