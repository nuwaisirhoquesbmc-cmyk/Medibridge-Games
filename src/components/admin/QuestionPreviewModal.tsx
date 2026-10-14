import React, { useState } from "react";
import { BankQuestion } from "../../types/questionBankTypes";
import { motion, AnimatePresence } from "motion/react";
import {
  Eye,
  X,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  BookOpen,
  Check,
  AlertCircle
} from "lucide-react";
import { playSound } from "../../audio";

interface QuestionPreviewModalProps {
  question: BankQuestion | null;
  onClose: () => void;
  isBn?: boolean;
}

export default function QuestionPreviewModal({
  question,
  onClose,
  isBn = false
}: QuestionPreviewModalProps) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  if (!question) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-xl bg-[#141416] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] font-sans"
        >
          {/* Header */}
          <div className="p-4 border-b border-white/10 bg-gradient-to-r from-black via-[#17171c] to-black flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Eye className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-white/10 text-[#FFD700]">
                    {question.code || question.id}
                  </span>
                  <span className="text-[10px] font-mono uppercase text-gray-400">
                    {question.subject} • {question.chapter}
                  </span>
                </div>
                <h3 className="text-sm font-black text-white uppercase font-display">
                  {isBn ? "শিক্ষার্থী ভিউ প্রিভিউ (Student Exam Preview)" : "Student Exam Interactive Preview"}
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

          {/* Question Body */}
          <div className="p-6 overflow-y-auto flex-1 space-y-5">
            {/* Meta Tags */}
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="px-2.5 py-1 rounded-md bg-[#C1121F]/15 border border-[#C1121F]/30 text-red-300 font-bold uppercase">
                {question.subject}
              </span>
              <div className="flex items-center gap-2 text-gray-400">
                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-emerald-400 font-bold">
                  +{question.marks || 1} Mark
                </span>
                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-red-400">
                  -{question.negativeMarks || 0.25} Neg
                </span>
                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[#FFD700] uppercase font-bold">
                  {question.difficulty}
                </span>
              </div>
            </div>

            {/* Question Text */}
            <div className="space-y-3">
              <h4 className="text-base font-bold text-white leading-relaxed">
                {question.questionText}
              </h4>

              {question.imageUrl && (
                <div className="rounded-xl overflow-hidden border border-white/10 bg-black/60 p-2 max-h-60 flex justify-center">
                  <img
                    src={question.imageUrl}
                    alt="Question Diagram"
                    className="max-h-56 object-contain rounded-lg"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
            </div>

            {/* Options Interactive */}
            <div className="space-y-2.5">
              {question.options.map((opt, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrect = idx === question.correctAnswerIndex;
                const optionLetter = ["A", "B", "C", "D"][idx] || `${idx + 1}`;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      playSound("click");
                      setSelectedOption(idx);
                    }}
                    className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between gap-3 transition cursor-pointer ${
                      isSelected
                        ? isCorrect
                          ? "bg-emerald-950/60 border-emerald-500 text-white shadow-lg shadow-emerald-950/40"
                          : "bg-red-950/60 border-red-500 text-white"
                        : "bg-black/40 border-white/10 text-gray-300 hover:border-white/25 hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-7 h-7 rounded-lg border font-mono font-bold text-xs flex items-center justify-center shrink-0 ${
                          isSelected
                            ? isCorrect
                              ? "bg-emerald-500 text-black border-emerald-400"
                              : "bg-red-500 text-white border-red-400"
                            : "bg-white/5 text-gray-400 border-white/10"
                        }`}
                      >
                        {optionLetter}
                      </span>
                      <span className="text-xs font-medium leading-normal">{opt}</span>
                    </div>

                    {isSelected && (
                      <div className="shrink-0">
                        {isCorrect ? (
                          <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1">
                            <Check className="w-4 h-4" /> Correct
                          </span>
                        ) : (
                          <span className="text-xs font-mono font-bold text-red-400 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" /> Incorrect
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Explanation Section */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  playSound("click");
                  setShowExplanation(!showExplanation);
                }}
                className="text-xs font-mono font-bold text-[#FFD700] hover:underline flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{showExplanation ? "ব্যাখ্যা লুকান (Hide Explanation)" : "ব্যাখ্যা ও রেফারেন্স দেখুন (View Explanation)"}</span>
              </button>

              {showExplanation && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-3 p-4 rounded-xl bg-gradient-to-br from-black/80 to-amber-950/20 border border-[#FFD700]/30 space-y-2 text-xs"
                >
                  <div className="flex items-center gap-2 font-mono font-bold text-[#FFD700] uppercase">
                    <BookOpen className="w-4 h-4" />
                    <span>Clinical Reference & Answer Solution</span>
                  </div>
                  <p className="text-gray-300 font-sans leading-relaxed whitespace-pre-wrap">
                    {question.explanation || "এই প্রশ্নের জন্য কোনো অতিরিক্ত ব্যাখ্যা দেওয়া হয়নি।"}
                  </p>
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-gray-500">
                    <span>Correct Option: Option {["A", "B", "C", "D"][question.correctAnswerIndex]}</span>
                    <span>Source: {question.source || "Question Bank"}</span>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/10 bg-black/80 flex items-center justify-end">
            <button
              onClick={() => {
                playSound("click");
                onClose();
              }}
              className="px-5 py-2 rounded-xl bg-[#C1121F] hover:bg-red-700 text-white text-xs font-mono font-bold uppercase transition cursor-pointer"
            >
              {isBn ? "প্রিভিউ বন্ধ করুন" : "Close Preview"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
