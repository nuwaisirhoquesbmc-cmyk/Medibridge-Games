import React, { useState } from "react";
import { motion } from "motion/react";
import { X, Sparkles, CheckCircle2, AlertCircle, FileText, ArrowRight, Copy } from "lucide-react";
import { Question } from "../../types";
import { playSound } from "../../audio";

interface BulkQuestionParserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportQuestions: (questions: Question[]) => void;
  defaultSubject?: "Biology" | "Chemistry" | "Physics" | "English" | "GK";
  defaultChapter?: string;
  language?: "bn" | "en";
}

/**
 * Intelligent parser for MCQ text in English and Bengali
 */
export function parseMcqText(
  rawText: string,
  subject: "Biology" | "Chemistry" | "Physics" | "English" | "GK",
  chapter: string
): Question[] {
  if (!rawText.trim()) return [];

  const text = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();

  // Split question blocks by numbering pattern:
  // (newline or start of string) followed by (number or bengali number or Q/Question) followed by (dot, parenthesis, or colon)
  const blockRegex = /(?:^|\n+)(?:(?:Q(?:uestion)?\s*|প্রশ্ন\s*)?[0-9১-৯]+[\.\)\:\-]\s*)/i;
  
  // Find all matches and their indices
  const parts = text.split(blockRegex).filter((p) => p.trim().length > 0);

  // If split didn't produce multiple parts, try splitting by double newline
  const blocks = parts.length > 1 ? parts : text.split(/\n\s*\n/).filter((b) => b.trim().length > 0);

  const parsedQuestions: Question[] = [];

  blocks.forEach((block, idx) => {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    let questionStatement = "";
    const options: string[] = [];
    let correctIndex = 0;
    let explanation = "";

    // Track state
    const statementLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for Answer line
      const ansMatch = line.match(/^(?:ans(?:wer)?|উত্তর|সঠিক(?:উত্তর)?|correct|sol(?:ution)?)\s*[\:\-\=\s]\s*([a-d1-4ক-ঘ\(\)\[\]]+)/i);
      if (ansMatch) {
        const rawAns = ansMatch[1].replace(/[\(\)\[\]\.\s]/g, "").toUpperCase();
        if (rawAns === "A" || rawAns === "1" || rawAns === "ক") correctIndex = 0;
        else if (rawAns === "B" || rawAns === "2" || rawAns === "খ") correctIndex = 1;
        else if (rawAns === "C" || rawAns === "3" || rawAns === "গ") correctIndex = 2;
        else if (rawAns === "D" || rawAns === "4" || rawAns === "ঘ") correctIndex = 3;
        continue;
      }

      // Check for Explanation line
      const expMatch = line.match(/^(?:exp(?:lanation)?|ব্যাখ্যা|ব্যাখ্যাঃ|নোট)\s*[\:\-\=\s]\s*(.+)/i);
      if (expMatch) {
        explanation = expMatch[1].trim();
        continue;
      }

      // Check for Option pattern:
      // A) or A. or (A) or [A] or a) or ক) or ১)
      const optMatch = line.match(/^(?:[\(\[]?([a-d1-4ক-ঘ])[\)\]\.\:\-]\s*)(.+)/i);
      if (optMatch) {
        const optText = optMatch[2].trim();
        options.push(optText);
        continue;
      }

      // Inline options check e.g. "A) ... B) ... C) ... D) ..." in a single line
      if (line.includes("A)") && line.includes("B)") && line.includes("C)") && line.includes("D)")) {
        const splitInline = line.split(/(?=[A-D]\))/);
        splitInline.forEach((optPart) => {
          const cleaned = optPart.replace(/^[A-D]\)\s*/, "").trim();
          if (cleaned) options.push(cleaned);
        });
        continue;
      }

      // If no options have started yet, it's part of the question statement
      if (options.length === 0) {
        statementLines.push(line);
      } else {
        // If options already started, but line didn't match option or ans, append to last option or explanation
        if (explanation) {
          explanation += " " + line;
        } else if (options.length > 0) {
          options[options.length - 1] += " " + line;
        }
      }
    }

    questionStatement = statementLines.join(" ").replace(/^(?:Q(?:uestion)?\s*|প্রশ্ন\s*)?[0-9১-৯]+[\.\)\:\-]\s*/i, "").trim();

    // If no statement found, skip
    if (!questionStatement) return;

    // Ensure we have 4 options
    while (options.length < 4) {
      options.push(`Option ${String.fromCharCode(65 + options.length)}`);
    }

    parsedQuestions.push({
      id: `q_bulk_${Date.now()}_${idx + 1}`,
      questionText: questionStatement,
      options: options.slice(0, 4),
      correctAnswerIndex: Math.min(Math.max(correctIndex, 0), 3),
      explanation: explanation || "",
      subject,
      chapter: chapter || "General",
      difficulty: "Medium"
    });
  });

  return parsedQuestions;
}

const SAMPLE_TEXT = `1. মানবদেহের রক্তের স্বাভাবিক pH কত?
A) 7.2
B) 7.35 - 7.45
C) 7.8
D) 6.5
Ans: B
Exp: মানুষের রক্তের pH সামান্য ক্ষারীয় এবং স্বাভাবিক পরিসীমা ৭.৩৫ - ৭.৪৫।

2. সালোকসংশ্লেষণের আলোক পর্যায়ে কী উৎপন্ন হয়?
A) ATP ও NADPH
B) গ্লুকোজ
C) সুক্রোজ
D) পাইরুভিক এসিড
উত্তর: A
ব্যাখ্যা: আলোক পর্যায়ে সৌরশক্তি রাসায়নিক শক্তিতে রূপান্তরিত হয়ে ATP ও NADPH তৈরি করে।

3. Which organelle is known as the powerhouse of the cell?
A) Ribosome
B) Golgi apparatus
C) Mitochondria
D) Lysosome
Ans: C
Exp: Mitochondria generates most of the chemical energy needed to power the cell's biochemical reactions.`;

export default function BulkQuestionParserModal({
  isOpen,
  onClose,
  onImportQuestions,
  defaultSubject = "Biology",
  defaultChapter = "General",
  language = "bn"
}: BulkQuestionParserModalProps) {
  const isBn = language === "bn";
  const [rawText, setRawText] = useState("");
  const [subject, setSubject] = useState<"Biology" | "Chemistry" | "Physics" | "English" | "GK">(defaultSubject);
  const [chapter, setChapter] = useState(defaultChapter);
  const [parsedList, setParsedList] = useState<Question[]>([]);
  const [hasParsed, setHasParsed] = useState(false);

  if (!isOpen) return null;

  const handleParse = () => {
    playSound("click");
    const result = parseMcqText(rawText, subject, chapter);
    setParsedList(result);
    setHasParsed(true);
    if (result.length > 0) {
      playSound("correct");
    }
  };

  const handleLoadSample = () => {
    playSound("click");
    setRawText(SAMPLE_TEXT);
    const result = parseMcqText(SAMPLE_TEXT, subject, chapter);
    setParsedList(result);
    setHasParsed(true);
  };

  const handleImport = () => {
    if (parsedList.length === 0) return;
    playSound("correct");
    onImportQuestions(parsedList);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#111111] border border-white/20 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-mono"
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-500/20 to-red-500/20 border border-amber-500/40 text-[#FFD700]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white uppercase font-display tracking-wide flex items-center gap-2">
                <span>{isBn ? "⚡ টেক্সট থেকে বাল্ক প্রশ্ন ইমপোর্ট" : "⚡ Bulk MCQ Text Parser"}</span>
                <span className="text-[10px] bg-amber-500/20 text-[#FFD700] px-2 py-0.5 rounded-full border border-amber-500/30">
                  AI-Style Smart Parser
                </span>
              </h3>
              <p className="text-xs text-gray-400 font-sans mt-0.5">
                {isBn
                  ? "যেকোনো ডক, ওয়ার্ড বা পিডিএফ থেকে প্রশ্নসমূহ কপি করে এখানে পেস্ট করুন, এক ক্লিকে পার্স হবে।"
                  : "Paste multiple MCQs with options and answer keys to automatically parse them into the exam."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Metadata Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-black/50 p-4 rounded-2xl border border-white/10 text-xs">
            <div className="space-y-1.5">
              <label className="text-gray-300 font-bold block">
                {isBn ? "বিষয় নির্বাচন করুন (Default Subject):" : "Default Subject:"}
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value as any)}
                className="w-full bg-[#181818] border border-white/15 focus:border-[#FFD700] rounded-xl px-3.5 py-2.5 text-white font-bold focus:outline-none"
              >
                <option value="Biology">Biology (জীববিজ্ঞান)</option>
                <option value="Chemistry">Chemistry (রসায়ন)</option>
                <option value="Physics">Physics (পদার্থবিজ্ঞান)</option>
                <option value="English">English (ইংরেজি)</option>
                <option value="GK">GK (সাধারণ জ্ঞান)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-gray-300 font-bold block">
                {isBn ? "অধ্যায় / টপিক (Chapter/Topic):" : "Chapter/Topic:"}
              </label>
              <input
                type="text"
                value={chapter}
                onChange={(e) => setChapter(e.target.value)}
                placeholder="e.g. কোষ ও এর গঠন / রক্ত সংবহন"
                className="w-full bg-[#181818] border border-white/15 focus:border-[#FFD700] rounded-xl px-3.5 py-2.5 text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Text Input Area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#FFD700]" />
                <span>{isBn ? "এখানে টেক্সট পেস্ট করুন:" : "Paste Question Text Here:"}</span>
              </label>
              <button
                type="button"
                onClick={handleLoadSample}
                className="text-[11px] text-amber-400 hover:text-amber-300 underline font-mono cursor-pointer flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                <span>{isBn ? "নমুনা প্রশ্ন ফরম্যাট লোড করুন" : "Load Sample Format"}</span>
              </button>
            </div>

            <textarea
              rows={8}
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                setHasParsed(false);
              }}
              placeholder={`1. প্রশ্নটি এখানে লিখুন...\nA) অপশন ১\nB) অপশন ২\nC) অপশন ৩\nD) অপশন ৪\nAns: B\nExp: সংক্ষিপ্ত ব্যাখ্যা...`}
              className="w-full bg-black/60 border border-white/15 focus:border-[#FFD700] rounded-2xl p-4 text-xs font-mono text-white focus:outline-none leading-relaxed resize-y"
            />
          </div>

          {/* Action to Parse */}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={!rawText.trim()}
              onClick={handleParse}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer ${
                rawText.trim()
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-lg shadow-amber-950/40 hover:from-amber-400 hover:to-amber-500"
                  : "bg-white/5 text-gray-500 border border-white/10 cursor-not-allowed"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>{isBn ? "প্রশ্নগুলো পার্স করুন (Analyze & Parse)" : "Analyze & Parse Questions"}</span>
            </button>

            {hasParsed && (
              <div className="flex items-center gap-2 text-xs">
                {parsedList.length > 0 ? (
                  <span className="flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/40 px-3 py-1.5 rounded-xl">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isBn ? `সফলভাবে ${parsedList.length}টি প্রশ্ন শনাক্ত হয়েছে!` : `Successfully parsed ${parsedList.length} questions!`}</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-rose-400 font-bold bg-rose-950/60 border border-rose-500/40 px-3 py-1.5 rounded-xl">
                    <AlertCircle className="w-4 h-4" />
                    <span>{isBn ? "কোনো প্রশ্ন শনাক্ত করা যায়নি। নমুনা ফরম্যাট দেখুন।" : "No questions parsed. Check formatting."}</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Parsed Questions Preview */}
          {parsedList.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-white/10 font-sans">
              <h4 className="text-xs font-bold text-[#FFD700] uppercase font-mono tracking-wider flex items-center gap-1.5">
                <span>{isBn ? "পার্সকৃত প্রশ্নের প্রিভিউ" : "Parsed Questions Preview"}</span>
                <span className="text-gray-400">({parsedList.length})</span>
              </h4>

              <div className="max-h-60 overflow-y-auto space-y-3 pr-1 divide-y divide-white/5">
                {parsedList.map((q, idx) => (
                  <div key={idx} className="pt-3 first:pt-0 space-y-2 text-xs bg-black/30 p-3 rounded-xl border border-white/5">
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="font-bold text-amber-400">Q.{idx + 1}</span>
                      <span className="text-gray-400">{q.subject} • {q.chapter}</span>
                    </div>

                    <p className="font-bold text-white text-xs">{q.questionText}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      {q.options.map((opt, oIdx) => (
                        <div
                          key={oIdx}
                          className={`p-2 rounded-lg border flex items-center gap-1.5 ${
                            q.correctAnswerIndex === oIdx
                              ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-300 font-bold"
                              : "bg-[#181818] border-white/5 text-gray-300"
                          }`}
                        >
                          <span className="font-mono text-gray-400 w-4">{String.fromCharCode(65 + oIdx)}.</span>
                          <span className="truncate">{opt}</span>
                          {q.correctAnswerIndex === oIdx && (
                            <span className="ml-auto text-[9px] bg-emerald-900 text-emerald-300 px-1 py-0.5 rounded font-mono">
                              ✓ Ans
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {q.explanation && (
                      <p className="text-[10px] text-gray-400 font-mono">
                        💡 <strong>{isBn ? "ব্যাখ্যা" : "Exp"}:</strong> {q.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-black/60 flex items-center justify-between gap-3">
          <span className="text-xs text-gray-400 font-mono">
            {parsedList.length > 0
              ? isBn
                ? `প্রস্তুত: ${parsedList.length} টি প্রশ্ন`
                : `Ready: ${parsedList.length} questions`
              : isBn
              ? "টেক্সট পেস্ট করে পার্স করুন"
              : "Paste text and click parse"}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition cursor-pointer font-sans"
            >
              {isBn ? "বাতিল" : "Cancel"}
            </button>

            <button
              type="button"
              disabled={parsedList.length === 0}
              onClick={handleImport}
              className={`px-5 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 uppercase font-mono ${
                parsedList.length > 0
                  ? "bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-950/50"
                  : "bg-white/5 text-gray-500 cursor-not-allowed"
              }`}
            >
              <span>{isBn ? `+ ${parsedList.length}টি প্রশ্ন যোগ করুন` : `+ Add ${parsedList.length} Questions`}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
