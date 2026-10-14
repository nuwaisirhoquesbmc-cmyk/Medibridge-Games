import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Save,
  CheckCircle2,
  FileQuestion,
  Search
} from "lucide-react";
import { CourseExam } from "../../types/courseTypes";
import { Question } from "../../types";
import { playSound } from "../../audio";
import BulkQuestionParserModal from "./BulkQuestionParserModal";

interface ExamQuestionsManagerModalProps {
  isOpen: boolean;
  exam: CourseExam;
  onClose: () => void;
  onSaveExam?: (updated: CourseExam) => void;
  onSaveQuestions?: (questions: Question[]) => void;
  language?: "bn" | "en";
  theme?: "light" | "dark";
}

export default function ExamQuestionsManagerModal({
  isOpen,
  exam,
  onClose,
  onSaveExam,
  onSaveQuestions,
  language = "bn"
}: ExamQuestionsManagerModalProps) {
  const isBn = language === "bn";

  const [questions, setQuestions] = useState<Question[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (exam) {
      const initial = exam.questions && Array.isArray(exam.questions) && exam.questions.length > 0
        ? exam.questions
        : [
            {
              id: `q_${Date.now()}_1`,
              questionText: "",
              options: ["", "", "", ""],
              correctAnswerIndex: 0,
              subject: (exam.subject as any) || "Biology",
              chapter: exam.chapter || "General",
              explanation: ""
            }
          ];
      setQuestions(JSON.parse(JSON.stringify(initial)));
    }
  }, [exam]);

  if (!isOpen || !exam) return null;

  const handleAddBlankQuestion = () => {
    playSound("click");
    setQuestions((prev) => [
      ...prev,
      {
        id: `q_${Date.now()}_${prev.length + 1}`,
        questionText: "",
        options: ["", "", "", ""],
        correctAnswerIndex: 0,
        subject: (exam.subject as any) || "Biology",
        chapter: exam.chapter || "General",
        explanation: ""
      }
    ]);
  };

  const handleRemoveQuestion = (idx: number) => {
    playSound("click");
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleDuplicateQuestion = (idx: number) => {
    playSound("click");
    setQuestions((prev) => {
      const target = prev[idx];
      if (!target) return prev;
      const clone: Question = {
        ...target,
        id: `q_${Date.now()}_dup_${idx}`
      };
      const next = [...prev];
      next.splice(idx + 1, 0, clone);
      return next;
    });
  };

  const handleMoveQuestion = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= questions.length) return;
    playSound("click");
    setQuestions((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  };

  const handleBulkImport = (imported: Question[]) => {
    setQuestions((prev) => {
      // If only 1 empty question, replace it
      if (prev.length === 1 && !prev[0].questionText.trim()) {
        return imported;
      }
      return [...prev, ...imported];
    });
    setSaveSuccess(false);
  };

  const handleSave = () => {
    playSound("correct");
    setIsSaving(true);
    const validQuestions = questions.filter((q) => q.questionText.trim().length > 0);
    const updatedExam: CourseExam = {
      ...exam,
      questions: validQuestions.length > 0 ? validQuestions : questions,
      totalQuestions: validQuestions.length > 0 ? validQuestions.length : questions.length
    };

    if (onSaveQuestions) {
      onSaveQuestions(validQuestions.length > 0 ? validQuestions : questions);
    }
    if (onSaveExam) {
      onSaveExam(updatedExam);
    }
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
  };

  const filteredQuestions = questions.map((q, idx) => ({ q, originalIdx: idx })).filter(({ q }) => {
    if (!searchTerm) return true;
    return (
      q.questionText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.chapter && q.chapter.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#111111] border border-white/20 rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-mono"
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-black/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-lg bg-[#C1121F]/20 text-[#FFD700] border border-[#C1121F]/30 text-xs font-bold">
                {exam.subject}
              </span>
              <span className="text-xs text-gray-400">
                {isBn ? "মোট প্রশ্ন:" : "Questions:"} <strong className="text-white">{questions.length}</strong>
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-white uppercase font-display tracking-wide mt-1">
              {exam.title}
            </h3>
            <p className="text-xs text-gray-400 font-sans mt-0.5">
              {isBn
                ? "এখানে সহজেই সরাসরি নতুন প্রশ্ন যোগ, এডিট, বাল্ক ইমপোর্ট এবং ডিলিট করুন।"
                : "Manage questions for this exam: add manually, bulk import, or reorder."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsBulkModalOpen(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-500/20 to-red-500/20 hover:from-amber-500/30 hover:to-red-500/30 border border-amber-500/40 text-[#FFD700] text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isBn ? "⚡ বাল্ক প্রশ্ন পেস্ট" : "⚡ Bulk Paste"}</span>
            </button>

            <button
              type="button"
              onClick={handleAddBlankQuestion}
              className="px-3.5 py-2 bg-[#C1121F] hover:bg-red-600 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow"
            >
              <Plus className="w-3.5 h-3.5 text-[#FFD700]" />
              <span>{isBn ? "+ প্রশ্ন যোগ" : "+ Blank Q"}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Search & Notification */}
        <div className="px-5 sm:px-6 py-3 bg-black/50 border-b border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={isBn ? "প্রশ্ন বা অধ্যায় দিয়ে খুঁজুন..." : "Filter questions by text or chapter..."}
              className="w-full bg-[#181818] border border-white/10 focus:border-[#FFD700] rounded-xl pl-9 pr-4 py-2 text-white focus:outline-none font-sans"
            />
          </div>

          {saveSuccess && (
            <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-3 py-1.5 rounded-xl font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>{isBn ? "প্রশ্নসমূহ সফলভাবে সংরক্ষিত হয়েছে!" : "Questions saved successfully!"}</span>
            </div>
          )}
        </div>

        {/* Questions Editor List */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 max-h-[65vh]">
          {filteredQuestions.length === 0 ? (
            <div className="p-12 text-center border-2 border-dashed border-white/10 rounded-3xl space-y-3 font-sans">
              <FileQuestion className="w-10 h-10 text-gray-500 mx-auto" />
              <p className="text-gray-400 text-sm font-bold">
                {searchTerm
                  ? isBn
                    ? "কোনো প্রশ্ন খুঁজে পাওয়া যায়নি।"
                    : "No questions match your search."
                  : isBn
                  ? "এই পরীক্ষায় এখনও কোনো প্রশ্ন যোগ করা হয়নি।"
                  : "No questions in this exam yet."}
              </p>
              <button
                type="button"
                onClick={handleAddBlankQuestion}
                className="px-4 py-2 bg-[#C1121F] text-white font-bold text-xs rounded-xl transition cursor-pointer"
              >
                {isBn ? "+ প্রথম প্রশ্ন যোগ করুন" : "+ Add First Question"}
              </button>
            </div>
          ) : (
            filteredQuestions.map(({ q, originalIdx }) => (
              <div
                key={q.id || `q_${originalIdx}`}
                className="p-4 sm:p-5 bg-black/60 border border-white/10 hover:border-white/20 rounded-2xl space-y-3 text-xs transition relative font-sans"
              >
                {/* Question Toolbar */}
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5 font-mono">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-[#C1121F]/30 border border-[#C1121F]/50 text-[#FFD700] font-black rounded-lg text-xs">
                      Q.{originalIdx + 1}
                    </span>
                    <span className="text-gray-400 font-bold text-[11px]">
                      {q.subject || exam.subject} {q.chapter ? `• ${q.chapter}` : ""}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={originalIdx === 0}
                      onClick={() => handleMoveQuestion(originalIdx, originalIdx - 1)}
                      title="Move Up"
                      className={`p-1.5 rounded-lg border border-white/10 transition ${
                        originalIdx === 0 ? "opacity-30 cursor-not-allowed" : "hover:bg-white/10 cursor-pointer text-gray-300"
                      }`}
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      disabled={originalIdx === questions.length - 1}
                      onClick={() => handleMoveQuestion(originalIdx, originalIdx + 1)}
                      title="Move Down"
                      className={`p-1.5 rounded-lg border border-white/10 transition ${
                        originalIdx === questions.length - 1
                          ? "opacity-30 cursor-not-allowed"
                          : "hover:bg-white/10 cursor-pointer text-gray-300"
                      }`}
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDuplicateQuestion(originalIdx)}
                      title="Duplicate"
                      className="p-1.5 hover:bg-white/10 rounded-lg text-amber-400 border border-white/10 transition cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(originalIdx)}
                      title="Delete"
                      className="p-1.5 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/30 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Question Statement */}
                <div className="space-y-1">
                  <label className="text-gray-300 font-bold block font-mono text-[11px]">
                    {isBn ? `প্রশ্ন #${originalIdx + 1} এর বিবরণ:` : `Question #${originalIdx + 1} Text:`}
                  </label>
                  <textarea
                    rows={2}
                    value={q.questionText}
                    onChange={(e) => {
                      const updated = [...questions];
                      updated[originalIdx].questionText = e.target.value;
                      setQuestions(updated);
                    }}
                    placeholder="প্রশ্নটি এখানে টাইপ করুন..."
                    className="w-full bg-[#181818] border border-white/15 focus:border-[#FFD700] rounded-xl p-3 text-white focus:outline-none font-bold text-xs resize-none"
                  />
                </div>

                {/* 4 Options Grid */}
                <div className="space-y-1.5">
                  <label className="text-gray-400 font-bold block font-mono text-[10px]">
                    {isBn ? "৪টি বিকল্প অপশন (সঠিক উত্তরের রেডিও বাটনে ক্লিক করুন):" : "4 Options (Select correct answer):"}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(q.options || ["", "", "", ""]).map((opt, oIdx) => {
                      const isCorrect = q.correctAnswerIndex === oIdx;
                      return (
                        <div
                          key={oIdx}
                          onClick={() => {
                            const updated = [...questions];
                            updated[originalIdx].correctAnswerIndex = oIdx;
                            setQuestions(updated);
                          }}
                          className={`flex items-center gap-2 p-2 rounded-xl border transition cursor-pointer ${
                            isCorrect
                              ? "bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-500/40"
                              : "bg-[#181818] border-white/10 hover:border-white/20"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`exam_opt_${originalIdx}`}
                            checked={isCorrect}
                            onChange={() => {
                              const updated = [...questions];
                              updated[originalIdx].correctAnswerIndex = oIdx;
                              setQuestions(updated);
                            }}
                            className="w-3.5 h-3.5 text-emerald-500 accent-emerald-500 cursor-pointer"
                          />
                          <span className="font-mono font-black text-xs text-gray-400 w-3">
                            {String.fromCharCode(65 + oIdx)}.
                          </span>
                          <input
                            type="text"
                            value={opt}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              const updated = [...questions];
                              if (!updated[originalIdx].options) updated[originalIdx].options = ["", "", "", ""];
                              updated[originalIdx].options[oIdx] = e.target.value;
                              setQuestions(updated);
                            }}
                            placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                            className="flex-1 bg-transparent border-none text-white focus:outline-none text-xs font-semibold"
                          />
                          {isCorrect && (
                            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-500/30">
                              ✓ Correct
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Explanation */}
                <div className="space-y-1">
                  <input
                    type="text"
                    value={q.explanation || ""}
                    onChange={(e) => {
                      const updated = [...questions];
                      updated[originalIdx].explanation = e.target.value;
                      setQuestions(updated);
                    }}
                    placeholder={isBn ? "💡 ব্যাখ্যা / নোট (ঐচ্ছিক)" : "💡 Explanation / Notes (Optional)"}
                    className="w-full bg-[#181818] border border-white/10 focus:border-[#FFD700] rounded-xl px-3 py-1.5 text-white focus:outline-none text-[11px]"
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-black/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddBlankQuestion}
              className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-gray-200 rounded-xl text-xs font-bold transition cursor-pointer border border-white/10 flex items-center gap-1.5 font-sans"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isBn ? "+ প্রশ্ন যোগ" : "+ Add Question"}</span>
            </button>
            <span className="text-xs text-gray-400 font-mono hidden sm:inline">
              {questions.length} {isBn ? "টি প্রশ্ন প্রস্তুত" : "Questions ready"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition cursor-pointer font-sans"
            >
              {isBn ? "বন্ধ করুন" : "Close"}
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 bg-gradient-to-r from-[#FFD700] to-amber-500 hover:from-amber-400 hover:to-amber-500 text-black rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 uppercase tracking-wide shadow-lg shadow-amber-950/40"
            >
              <Save className="w-4 h-4" />
              <span>{isBn ? "প্রশ্নসমূহ সেভ করুন" : "Save All Questions"}</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Nested Bulk Parser Modal */}
      <BulkQuestionParserModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onImportQuestions={handleBulkImport}
        defaultSubject={(exam.subject as any) || "Biology"}
        defaultChapter={exam.chapter || "General"}
        language={language}
      />
    </div>
  );
}
