import React from "react";
import { BankQuestion } from "../../types/questionBankTypes";
import { motion, AnimatePresence } from "motion/react";
import {
  History,
  X,
  BookOpen,
  Calendar,
  Layers,
  Award,
  AlertTriangle,
  Archive,
  Trash2,
  CheckCircle2,
  ExternalLink
} from "lucide-react";
import { playSound } from "../../audio";

interface QuestionUsageModalProps {
  question: BankQuestion | null;
  onClose: () => void;
  onArchive?: (questionId: string) => void;
  onForceDelete?: (questionId: string) => void;
  isBn?: boolean;
}

export default function QuestionUsageModal({
  question,
  onClose,
  onArchive,
  onForceDelete,
  isBn = false
}: QuestionUsageModalProps) {
  if (!question) return null;

  const usageList = question.usedInExams || [];
  const isUsed = usageList.length > 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-2xl bg-[#141416] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] font-sans"
        >
          {/* Header */}
          <div className="p-5 border-b border-white/10 bg-gradient-to-r from-black via-[#1a1417] to-black flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-[#C1121F]/40 flex items-center justify-center text-[#FFD700]">
                <History className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-red-950/80 border border-red-500/40 text-red-300">
                    {question.code || question.id}
                  </span>
                  <span className="text-[10px] font-mono uppercase text-gray-400">
                    {question.subject} • {question.chapter}
                  </span>
                </div>
                <h3 className="text-base font-black text-white uppercase font-display mt-0.5">
                  {isBn ? "প্রশ্নটির ব্যবহার ও পরীক্ষার তালিকা (Question Usage Tracking)" : "Question Exam Usage History"}
                </h3>
              </div>
            </div>

            <button
              onClick={() => {
                playSound("click");
                onClose();
              }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Question Summary Box */}
          <div className="p-5 border-b border-white/5 bg-black/40 space-y-2">
            <p className="text-xs text-gray-200 font-medium leading-relaxed line-clamp-3">
              {question.questionText}
            </p>
            <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono text-gray-400">
              <span className="text-[#FFD700] font-bold">
                {isBn ? `মোট ব্যবহৃত হয়েছে: ${usageList.length} টি পরীক্ষায়` : `Total Usage: ${usageList.length} Exams`}
              </span>
              <span>•</span>
              <span className="text-emerald-400">Difficulty: {question.difficulty}</span>
              <span>•</span>
              <span>Marks: {question.marks || 1} (Neg: -{question.negativeMarks || 0.25})</span>
            </div>
          </div>

          {/* Usage Table / List */}
          <div className="p-5 overflow-y-auto flex-1 space-y-3">
            {usageList.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white uppercase font-mono">
                  {isBn ? "প্রশ্নটি এখনও কোনো পরীক্ষায় ব্যবহৃত হয়নি" : "Unused / Fresh Question"}
                </h4>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  {isBn
                    ? "এই প্রশ্নটি সম্পূর্ণ ফ্রেশ রয়েছে। এটি আপনি যেকোনো কোর্স বা নতুন এক্সাম ব্যাচে ব্যবহার করতে পারেন।"
                    : "This question is ready to be added to any exam batch without affecting previous exam records."}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="text-xs font-mono font-bold uppercase text-gray-400 flex items-center justify-between">
                  <span>{isBn ? "সংযুক্ত পরীক্ষা ও কোর্সের তালিকা" : "Linked Exams & Courses"}</span>
                  <span className="text-[11px] text-[#FFD700]">{usageList.length} References</span>
                </div>

                <div className="divide-y divide-white/5 border border-white/10 rounded-xl overflow-hidden bg-black/50">
                  {usageList.map((usage, idx) => (
                    <div key={idx} className="p-3.5 flex items-center justify-between gap-4 hover:bg-white/5 transition">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white font-mono truncate">
                            {usage.examTitle}
                          </span>
                          {usage.isPublished !== false ? (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase">
                              LIVE / PUBLISHED
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 uppercase">
                              DRAFT
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-gray-400 font-mono">
                          <span className="flex items-center gap-1 text-gray-300">
                            <BookOpen className="w-3 h-3 text-[#FFD700]" />
                            {usage.courseName || "General Course"}
                          </span>
                          {usage.examDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-gray-500" />
                              {new Date(usage.examDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-mono text-gray-500">
                          ID: {usage.examId.slice(0, 10)}...
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Accidental Deletion Protection Warning Notice (Section 35) */}
            {isUsed && (
              <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs space-y-2 mt-4">
                <div className="flex items-center gap-2 font-bold font-mono uppercase text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{isBn ? "প্রশ্ন মুছে ফেলার সুরক্ষা সতর্কতা (Deletion Protection)" : "Accidental Deletion Protection"}</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-200/90 font-sans">
                  {isBn
                    ? `এই প্রশ্নটি বর্তমানে ${usageList.length} টি পরীক্ষায় সক্রিয়ভাবে ব্যবহৃত হচ্ছে। প্রশ্নটি সম্পূর্ণ মুছে ফেললে পুরনো পরীক্ষার ফলাফল ও পরিসংখ্যান ক্ষতিগ্রস্ত হতে পারে। হার্ড ডিলিটের পরিবর্তে "আর্কাইভ (Archive)" করার পরামর্শ দেওয়া হচ্ছে।`
                    : `This question is currently active in ${usageList.length} exam(s). Hard deleting it will compromise student history. Please Archive instead of deleting to keep past results intact.`}
                </p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-white/10 bg-black/80 flex items-center justify-between gap-3">
            <button
              onClick={() => {
                playSound("click");
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-mono font-bold uppercase cursor-pointer"
            >
              {isBn ? "বন্ধ করুন" : "Close"}
            </button>

            <div className="flex items-center gap-2">
              {onArchive && (
                <button
                  onClick={() => {
                    playSound("click");
                    onArchive(question.id);
                    onClose();
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/40 text-amber-200 text-xs font-mono font-bold uppercase flex items-center gap-1.5 cursor-pointer"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>{isBn ? "প্রশ্নটি আর্কাইভ করুন" : "Archive Question"}</span>
                </button>
              )}

              {onForceDelete && (
                <button
                  onClick={() => {
                    if (confirm(isBn ? "আপনি কি নিশ্চিতভাবে এই প্রশ্নটি ডিলিট করতে চান?" : "Are you sure you want to delete this question?")) {
                      playSound("click");
                      onForceDelete(question.id);
                      onClose();
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-red-950 hover:bg-red-900 border border-red-600/50 text-red-300 text-xs font-mono font-bold uppercase flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isBn ? "ডিলিট করুন" : "Delete"}</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
