import React, { useState } from "react";
import { BankQuestion } from "../../types/questionBankTypes";
import { Question } from "../../types";
import {
  ArrowUp,
  ArrowDown,
  Trash2,
  Eye,
  Copy,
  Edit3,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Plus
} from "lucide-react";
import { playSound } from "../../audio";
import QuestionPreviewModal from "./QuestionPreviewModal";

interface ExamQuestionListManagerProps {
  questions: (BankQuestion | Question | any)[];
  onReorder: (reorderedList: any[]) => void;
  onRemoveQuestion: (index: number) => void;
  onDuplicateQuestion: (index: number) => void;
  onEditQuestion: (index: number, updatedQ: any) => void;
  onOpenQuestionBank: () => void;
  isBn?: boolean;
}

export default function ExamQuestionListManager({
  questions,
  onReorder,
  onRemoveQuestion,
  onDuplicateQuestion,
  onEditQuestion,
  onOpenQuestionBank,
  isBn = false
}: ExamQuestionListManagerProps) {
  const [previewingQ, setPreviewingQ] = useState<any | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<any | null>(null);

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    playSound("click");
    const newList = [...questions];
    const temp = newList[index - 1];
    newList[index - 1] = newList[index];
    newList[index] = temp;
    onReorder(newList);
  };

  const handleMoveDown = (index: number) => {
    if (index === questions.length - 1) return;
    playSound("click");
    const newList = [...questions];
    const temp = newList[index + 1];
    newList[index + 1] = newList[index];
    newList[index] = temp;
    onReorder(newList);
  };

  const startEditing = (index: number, q: any) => {
    playSound("click");
    setEditingIndex(index);
    setEditFormData({
      questionText: q.questionText || q.text || "",
      options: Array.isArray(q.options) ? [...q.options] : ["", "", "", ""],
      correctAnswerIndex: typeof q.correctAnswerIndex === "number" ? q.correctAnswerIndex : 0,
      explanation: q.explanation || "",
      subject: q.subject || "Biology",
      chapter: q.chapter || "General",
      difficulty: q.difficulty || "Medium"
    });
  };

  const saveEditedQuestion = () => {
    if (editingIndex === null || !editFormData) return;
    playSound("correct");
    const updated = {
      ...questions[editingIndex],
      ...editFormData
    };
    onEditQuestion(editingIndex, updated);
    setEditingIndex(null);
    setEditFormData(null);
  };

  return (
    <div className="space-y-4">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#141416] border border-white/10 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {questions.length} Questions in Exam
            </span>
            <span className="text-[10px] font-mono text-gray-400">
              Total Marks: {questions.length * 1}
            </span>
          </div>
          <h4 className="text-sm font-black text-white uppercase font-display mt-0.5">
            {isBn ? "পরীক্ষার প্রশ্নসমূহ সাজানো ও পরিচালনা" : "Exam Question Sequence & Arrangement"}
          </h4>
        </div>

        <button
          type="button"
          onClick={() => {
            playSound("click");
            onOpenQuestionBank();
          }}
          className="px-4 py-2 bg-[#C1121F] hover:bg-red-700 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition shadow-lg cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{isBn ? "প্রশ্ন ব্যাংক থেকে আরও যোগ করুন" : "Select More from Bank"}</span>
        </button>
      </div>

      {/* Questions Sequence List */}
      {questions.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl bg-black/30 p-6 space-y-3">
          <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-500">
            <Layers className="w-6 h-6" />
          </div>
          <h5 className="text-sm font-bold text-white font-mono uppercase">
            {isBn ? "পরীক্ষায় এখনও কোনো প্রশ্ন যুক্ত করা হয়নি" : "No Questions Added to Exam Yet"}
          </h5>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            {isBn
              ? "সেন্ট্রাল কোয়েশ্চেন ব্যাংক থেকে প্রয়োজনীয় প্রশ্ন নির্বাচন করুন অথবা নতুন প্রশ্ন তৈরি করুন।"
              : "Click 'Select More from Bank' above to pick existing questions or create new ones."}
          </p>
          <button
            type="button"
            onClick={() => {
              playSound("click");
              onOpenQuestionBank();
            }}
            className="px-5 py-2.5 bg-[#C1121F] hover:bg-red-700 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isBn ? "প্রশ্ন ব্যাংক ওপেন করুন" : "Open Question Bank"}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {questions.map((q, idx) => {
            const isEditing = editingIndex === idx;
            return (
              <div
                key={q.id || idx}
                className="p-4 rounded-xl border border-white/10 bg-black/40 hover:border-white/20 transition space-y-3"
              >
                {!isEditing ? (
                  <div className="flex items-start justify-between gap-4">
                    {/* Number Badge and Text */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 text-xs font-mono font-bold text-[#FFD700] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>

                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono">
                          {q.code && (
                            <span className="px-2 py-0.5 rounded bg-white/10 text-white font-bold">
                              {q.code}
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded bg-red-950/80 border border-red-500/40 text-red-300 font-bold uppercase">
                            {q.subject}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-300 truncate max-w-[150px]">
                            {q.chapter}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-white/5 text-gray-400 uppercase">
                            {q.difficulty}
                          </span>
                        </div>

                        <p className="text-xs font-semibold text-white leading-relaxed line-clamp-2">
                          {q.questionText}
                        </p>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1 text-[11px] font-sans text-gray-400">
                          {(q.options || []).map((opt: string, oi: number) => (
                            <span
                              key={oi}
                              className={`truncate px-2 py-0.5 rounded ${
                                oi === q.correctAnswerIndex
                                  ? "text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-500/30"
                                  : "bg-black/30"
                              }`}
                            >
                              {["A", "B", "C", "D"][oi]}. {opt}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Action Controls Bar (Module 33) */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Move Up */}
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveUp(idx)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed text-gray-400 hover:text-white transition"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>

                      {/* Move Down */}
                      <button
                        type="button"
                        disabled={idx === questions.length - 1}
                        onClick={() => handleMoveDown(idx)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed text-gray-400 hover:text-white transition"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      {/* Preview in Student View */}
                      <button
                        type="button"
                        onClick={() => {
                          playSound("click");
                          setPreviewingQ(q);
                        }}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white transition"
                        title="Preview Student View"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {/* Duplicate */}
                      <button
                        type="button"
                        onClick={() => {
                          playSound("click");
                          onDuplicateQuestion(idx);
                        }}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white transition"
                        title="Duplicate Question"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {/* Edit */}
                      <button
                        type="button"
                        onClick={() => startEditing(idx, q)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-sky-400 hover:text-sky-300 transition"
                        title="Edit Question"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {/* Remove from Exam */}
                      <button
                        type="button"
                        onClick={() => {
                          playSound("click");
                          onRemoveQuestion(idx);
                        }}
                        className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-950 border border-red-500/30 text-red-400 hover:text-red-300 transition"
                        title={isBn ? "পরীক্ষা থেকে বাদ দিন (কোয়েশ্চেন ব্যাংক সংরক্ষিত থাকবে)" : "Remove from Exam (Remains safe in Question Bank)"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Inline Edit Box */
                  <div className="space-y-3 p-2 bg-black/60 rounded-xl border border-sky-500/40 text-xs">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <span className="font-mono font-bold text-sky-400 uppercase">
                        Editing Question #{idx + 1}
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono">
                        (Updates will apply to this exam session)
                      </span>
                    </div>

                    <div>
                      <label className="text-[10px] font-mono uppercase text-gray-400 block mb-1">Question Text</label>
                      <textarea
                        rows={2}
                        value={editFormData.questionText}
                        onChange={(e) => setEditFormData({ ...editFormData, questionText: e.target.value })}
                        className="w-full bg-black border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {editFormData.options.map((opt: string, oi: number) => (
                        <div key={oi}>
                          <label className="text-[9px] font-mono text-gray-400 block">Option {["A", "B", "C", "D"][oi]}</label>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...editFormData.options];
                              newOpts[oi] = e.target.value;
                              setEditFormData({ ...editFormData, options: newOpts });
                            }}
                            className="w-full bg-black border border-white/10 rounded-lg px-2 py-1 text-white text-xs"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-mono text-emerald-400">Correct Option:</label>
                        <select
                          value={editFormData.correctAnswerIndex}
                          onChange={(e) => setEditFormData({ ...editFormData, correctAnswerIndex: Number(e.target.value) })}
                          className="bg-black border border-emerald-500/40 rounded px-2 py-1 text-emerald-400 text-xs font-mono font-bold"
                        >
                          <option value={0}>Option A</option>
                          <option value={1}>Option B</option>
                          <option value={2}>Option C</option>
                          <option value={3}>Option D</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingIndex(null);
                            setEditFormData(null);
                          }}
                          className="px-3 py-1 bg-white/10 text-gray-300 rounded-lg text-xs"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={saveEditedQuestion}
                          className="px-4 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold font-mono uppercase"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Student View Modal */}
      {previewingQ && (
        <QuestionPreviewModal
          question={previewingQ}
          onClose={() => setPreviewingQ(null)}
          isBn={isBn}
        />
      )}
    </div>
  );
}
