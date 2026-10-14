import React, { useState, useEffect } from "react";
import { db, handleFirestoreError, OperationType } from "../../lib/backend";
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  limit,
} from "../../lib/supabaseDb";
import { Question } from "../../types";
import { MEDICAL_GAMES } from "../gaming/gamingData";
import {
  Gamepad2,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  XCircle,
  Sparkles,
  Search,
  Filter,
  BookOpen,
  HelpCircle,
  Tag,
  Zap,
} from "lucide-react";
import { playSound } from "../../audio";

interface GameQuestionItem extends Question {
  targetGameId?: string; // "all" or specific game id like "bio-slice", "med-runner", etc.
  gameTitle?: string;
}

interface GameQuestionsManagerProps {
  language?: "bn" | "en";
  theme?: "light" | "dark";
  currentUserUid: string;
}

export default function GameQuestionsManager({
  language = "bn",
  theme = "dark",
  currentUserUid,
}: GameQuestionsManagerProps) {
  const isBn = language === "bn";
  const [questions, setQuestions] = useState<GameQuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGameFilter, setSelectedGameFilter] = useState<string>("all");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("all");

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [qText, setQText] = useState("");
  const [qOptA, setQOptA] = useState("");
  const [qOptB, setQOptB] = useState("");
  const [qOptC, setQOptC] = useState("");
  const [qOptD, setQOptD] = useState("");
  const [qCorrect, setQCorrect] = useState<number>(0);
  const [qExplanation, setQExplanation] = useState("");
  const [qSubject, setQSubject] = useState<string>("Biology");
  const [qChapter, setQChapter] = useState("কোষ ও এর গঠন");
  const [qDifficulty, setQDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");
  const [targetGameId, setTargetGameId] = useState<string>("all");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Subscribe to real-time game_questions collection (limit 150)
  useEffect(() => {
    const qCol = query(collection(db, "game_questions"), limit(150));
    const unsubscribe = onSnapshot(
      qCol,
      (snapshot) => {
        const loaded: GameQuestionItem[] = [];
        snapshot.forEach((docSnap) => {
          loaded.push({
            id: docSnap.id,
            ...docSnap.data(),
          } as GameQuestionItem);
        });
        setQuestions(loaded);
        setLoading(false);
      },
      (err) => {
        console.warn("Error fetching game questions:", err.message);
        handleFirestoreError(err, OperationType.LIST, "game_questions");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleResetForm = () => {
    setEditingQuestionId(null);
    setQText("");
    setQOptA("");
    setQOptB("");
    setQOptC("");
    setQOptD("");
    setQCorrect(0);
    setQExplanation("");
    setQSubject("Biology");
    setQChapter("কোষ ও এর গঠন");
    setQDifficulty("Medium");
    setTargetGameId("all");
    setIsFormOpen(false);
  };

  const handleEditQuestion = (q: GameQuestionItem) => {
    setEditingQuestionId(q.id);
    setQText(q.questionText);
    setQOptA(q.options[0] || "");
    setQOptB(q.options[1] || "");
    setQOptC(q.options[2] || "");
    setQOptD(q.options[3] || "");
    setQCorrect(q.correctAnswerIndex);
    setQExplanation(q.explanation || "");
    setQSubject(q.subject || "Biology");
    setQChapter(q.chapter || "General");
    setQDifficulty((q.difficulty as any) || "Medium");
    setTargetGameId(q.targetGameId || "all");
    setIsFormOpen(true);
    playSound("click");
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (
      !confirm(
        isBn
          ? "আপনি কি নিশ্চিত যে এই গেম প্রশ্নটি মুছে ফেলতে চান?"
          : "Are you sure you want to delete this game question?"
      )
    )
      return;

    try {
      playSound("click");
      await deleteDoc(doc(db, "game_questions", qId));
      showToast("Game question deleted successfully.");
    } catch (err: any) {
      console.error("Error deleting game question:", err);
      handleFirestoreError(err, OperationType.DELETE, `game_questions/${qId}`);
    }
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qText.trim() || !qOptA.trim() || !qOptB.trim()) {
      alert(isBn ? "প্রশ্ন এবং অন্তত ২টি অপশন পূরণ করুন!" : "Please fill in question and at least 2 options!");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Omit<GameQuestionItem, "id"> = {
        questionText: qText.trim(),
        options: [qOptA.trim(), qOptB.trim(), qOptC.trim() || "N/A", qOptD.trim() || "N/A"],
        correctAnswerIndex: Number(qCorrect),
        explanation: qExplanation.trim() || "Textbook standard medical reference.",
        subject: qSubject,
        chapter: qChapter.trim() || "General",
        difficulty: qDifficulty,
        source: "Admin Game Arena Panel",
        targetGameId,
        gameTitle:
          targetGameId === "all"
            ? "All Games"
            : MEDICAL_GAMES.find((g) => g.id === targetGameId)?.title || "Custom Game",
        createdAt: serverTimestamp() as any,
        createdBy: currentUserUid,
      };

      if (editingQuestionId) {
        await updateDoc(doc(db, "game_questions", editingQuestionId), {
          ...payload,
          updatedAt: serverTimestamp(),
        });
        showToast("Game question updated successfully!");
      } else {
        await addDoc(collection(db, "game_questions"), payload);
        showToast("New game question saved successfully!");
      }

      playSound("correct");
      handleResetForm();
    } catch (err: any) {
      console.error("Error saving game question:", err);
      handleFirestoreError(
        err,
        editingQuestionId ? OperationType.UPDATE : OperationType.CREATE,
        "game_questions"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Preset Question Injector for easy game seeding
  const handleQuickSeedGameQuestions = async () => {
    if (
      !confirm(
        isBn
          ? "মেডিকেল গেমিং অ্যারেনার জন্য ১০টি স্ট্যান্ডার্ড প্রশ্ন যুক্ত করতে চান?"
          : "Do you want to seed 10 high-yield medical admission game questions?"
      )
    )
      return;

    const sampleGameQuestions: Omit<GameQuestionItem, "id">[] = [
      {
        questionText: "কোষের প্রোটিন ফ্যাক্টরি বলা হয় কোন কোষীয় অঙ্গাণুকে?",
        options: ["রাইবোসোম", "লাইসোসোম", "গলগি বডি", "মাইটোকন্ড্রিয়া"],
        correctAnswerIndex: 0,
        explanation: "রাইবোসোম কোষে প্রোটিন সংশ্লেষণ করে বলে একে প্রোটিন ফ্যাক্টরি বলা হয়।",
        subject: "Biology",
        chapter: "কোষ ও এর গঠন",
        difficulty: "Easy",
        source: "Game Arena Standard",
        targetGameId: "bio-slice",
        gameTitle: "BioSlice: Cell Ninja",
        createdAt: serverTimestamp() as any,
        createdBy: currentUserUid,
      },
      {
        questionText: "পেসমেকার (SA Node) হৃৎপিণ্ডের কোন প্রকোষ্ঠে অবস্থিত?",
        options: ["ডান অলিন্দ (Right Atrium)", "বাম অলিন্দ (Left Atrium)", "ডান নিলয়", "বাম নিলয়"],
        correctAnswerIndex: 0,
        explanation: "SA নোড বা প্রাকৃতিক পেসমেকার ডান অলিন্দের প্রাচীরে সুপিরিয়র ভেনাকাভার সংযোগস্থলে অবস্থিত।",
        subject: "Biology",
        chapter: "রক্ত ও সংবহন",
        difficulty: "Medium",
        source: "Game Arena Standard",
        targetGameId: "med-runner",
        gameTitle: "MedRunner: Bio Sprint",
        createdAt: serverTimestamp() as any,
        createdBy: currentUserUid,
      },
      {
        questionText: "রক্তে গ্লুকোজের মাত্রা নিয়ন্ত্রণকারী প্রধান হরমোন ইনসুলিন কোথা থেকে ক্ষরিত হয়?",
        options: ["আইলেটস অব ল্যাঙ্গারহ্যান্সের বিটা কোষ", "আলফা কোষ", "ডেল্টা কোষ", "থাইরয়েড"],
        correctAnswerIndex: 0,
        explanation: "অগ্ন্যাশয়ের আইলেটস অব ল্যাঙ্গারহ্যান্সের বিটা (β) কোষ থেকে ইনসুলিন নিঃসৃত হয়।",
        subject: "Biology",
        chapter: "পরিপাক ও শোষণ",
        difficulty: "Easy",
        source: "Game Arena Standard",
        targetGameId: "cell-clash",
        gameTitle: "Cell Clash: Immune Boss Raid",
        createdAt: serverTimestamp() as any,
        createdBy: currentUserUid,
      },
      {
        questionText: "কোন এনজাইমটি ডিএনএ অণুর হাইড্রোজেন বন্ড ভেঙে ডাবল হেলিক্স উন্মুক্ত করে?",
        options: ["ডিএনএ হেলিকেজ", "ডিএনএ পলিমারেজ", "ডিএনএ লাইগেজ", "টপোআইসোমারেজ"],
        correctAnswerIndex: 0,
        explanation: "ডিএনএ হেলিকেজ এনজাইম হাইড্রোজেন বন্ধনী ভেঙে ডিএনএ স্ট্র্যান্ড দুটিকে পৃথক করে।",
        subject: "Biology",
        chapter: "জিনতত্ত্ব ও বিবর্তন",
        difficulty: "Hard",
        source: "Game Arena Standard",
        targetGameId: "speed-drill",
        gameTitle: "Speed Drill: 60s Blitz",
        createdAt: serverTimestamp() as any,
        createdBy: currentUserUid,
      },
      {
        questionText: "হৃদপেশির অ্যাকশন পটেনশিয়াল সৃষ্টিতে কোন আয়নের ইনফ্লাক্স প্রধান ভূমিকা পালন করে?",
        options: ["ক্যালসিয়াম (Ca2+)", "পটাসিয়াম (K+)", "ম্যাগনেসিয়াম (Mg2+)", "ক্লোরাইড (Cl-)"],
        correctAnswerIndex: 0,
        explanation: "কার্ডিয়াক অ্যাকশন পটেনশিয়ালে প্ল্যাটো দশার জন্য Ca2+ আয়নের ইনফ্লাক্স দায়ী।",
        subject: "Biology",
        chapter: "রক্ত ও সংবহন",
        difficulty: "Hard",
        source: "Game Arena Standard",
        targetGameId: "clinical-er",
        gameTitle: "Clinical ER: Triage Doctor Sim",
        createdAt: serverTimestamp() as any,
        createdBy: currentUserUid,
      },
    ];

    try {
      for (const q of sampleGameQuestions) {
        await addDoc(collection(db, "game_questions"), q);
      }
      showToast("Standard game questions added successfully!");
    } catch (err: any) {
      console.error("Error seeding game questions:", err);
    }
  };

  const filteredQuestions = questions.filter((q) => {
    const qSearch = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !qSearch ||
      (q.questionText || "").toLowerCase().includes(qSearch) ||
      (q.chapter || "").toLowerCase().includes(qSearch) ||
      (Array.isArray(q.options) && q.options.some((opt) => (opt || "").toLowerCase().includes(qSearch)));
    const matchesGame = selectedGameFilter === "all" || q.targetGameId === selectedGameFilter || q.targetGameId === "all";
    const matchesSubject = selectedSubjectFilter === "all" || q.subject === selectedSubjectFilter;
    return matchesSearch && matchesGame && matchesSubject;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white font-mono text-xs px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" /> {toastMsg}
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-950/40 via-[#111111] to-black rounded-2xl p-6 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-[2px] bg-purple-600"></div>
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#FFD700] uppercase">
            <Gamepad2 className="w-4 h-4 text-[#FFD700]" />
            {isBn ? "গেমিং অ্যারেনা প্রশ্ন কন্ট্রোল" : "MEDICAL GAMING ARENA QUESTION SETTINGS"}
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-white uppercase mt-1 font-display">
            {isBn ? "গেমসের প্রশ্নাবলি ম্যানেজমেন্ট" : "GAMES QUESTIONS MANAGER"}
          </h2>
          <p className="text-xs text-gray-400 font-mono mt-1">
            {isBn
              ? "অ্যাডমিন প্যানেল থেকে BioSlice, MedRunner, MedRace, CellClash সহ প্রতিটি গেমের জন্য কাস্টম মেডিকেল প্রশ্ন সেট করুন।"
              : "Set custom MCQ questions for BioSlice, MedRunner, MedCricket, CellClash, and all Arena games."}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleQuickSeedGameQuestions}
            className="px-4 py-2.5 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 text-yellow-300 font-mono text-xs font-bold rounded-xl transition"
          >
            ⚡ {isBn ? "প্রিসেট প্রশ্ন যুক্ত করুন" : "Seed Starter Game MCQs"}
          </button>
          <button
            onClick={() => {
              if (isFormOpen) {
                handleResetForm();
              } else {
                setIsFormOpen(true);
                playSound("click");
              }
            }}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-black uppercase text-xs tracking-wider rounded-xl transition duration-300 font-mono shadow-lg flex items-center gap-2"
          >
            {isFormOpen ? (
              <>
                <XCircle className="w-4 h-4" /> {isBn ? "বন্ধ করুন" : "Close"}
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" /> {isBn ? "নতুন গেম প্রশ্ন যোগ করুন" : "Add Game Question"}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Form Drawer */}
      {isFormOpen && (
        <div className="bg-[#141220] border-2 border-purple-500/40 rounded-2xl p-6 shadow-2xl space-y-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-black text-white uppercase tracking-wider font-display">
                {editingQuestionId
                  ? isBn
                    ? "গেম প্রশ্ন সম্পাদনা করুন"
                    : "EDIT GAME QUESTION"
                  : isBn
                  ? "নতুন মেডিকেল গেম প্রশ্ন যোগ করুন"
                  : "ADD NEW GAME QUESTION"}
              </h3>
            </div>
            <span className="text-xs font-mono text-gray-400">
              {isBn ? "গেম চলাকালীন ছাত্র-ছাত্রীরা এই প্রশ্নটির মুখোমুখি হবে" : "Students will play with this question"}
            </span>
          </div>

          <form onSubmit={handleSaveQuestion} className="space-y-4">
            {/* Target Game Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-mono font-bold text-gray-300 uppercase block mb-1.5">
                  🎮 {isBn ? "কোন গেমের জন্য প্রযোজ্য" : "Target Game"} *
                </label>
                <select
                  value={targetGameId}
                  onChange={(e) => setTargetGameId(e.target.value)}
                  className="w-full bg-black/80 border border-white/20 rounded-xl px-3 py-2.5 text-xs font-mono text-white focus:border-purple-500 focus:outline-none"
                >
                  <option value="all">🌐 {isBn ? "সব গেমেই প্রযোজ্য (All Games)" : "All Games"}</option>
                  {MEDICAL_GAMES.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.icon} {g.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-mono font-bold text-gray-300 uppercase block mb-1.5">
                  📚 {isBn ? "বিষয় (Subject)" : "Subject"} *
                </label>
                <select
                  value={qSubject}
                  onChange={(e) => setQSubject(e.target.value)}
                  className="w-full bg-black/80 border border-white/20 rounded-xl px-3 py-2.5 text-xs font-mono text-white focus:border-purple-500 focus:outline-none"
                >
                  <option value="Biology">Biology (জীববিজ্ঞান)</option>
                  <option value="Chemistry">Chemistry (রসায়ন)</option>
                  <option value="Physics">Physics (পদার্থবিজ্ঞান)</option>
                  <option value="GK">General Knowledge (সাধারণ জ্ঞান)</option>
                  <option value="English">English</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-mono font-bold text-gray-300 uppercase block mb-1.5">
                  ⚡ {isBn ? "কঠিনতার স্তর (Difficulty)" : "Difficulty"} *
                </label>
                <select
                  value={qDifficulty}
                  onChange={(e) => setQDifficulty(e.target.value as any)}
                  className="w-full bg-black/80 border border-white/20 rounded-xl px-3 py-2.5 text-xs font-mono text-white focus:border-purple-500 focus:outline-none"
                >
                  <option value="Easy">Easy (সহজ)</option>
                  <option value="Medium">Medium (মাঝারি)</option>
                  <option value="Hard">Hard (কঠিন/হাই-ইয়েল্ড)</option>
                </select>
              </div>
            </div>

            {/* Question Text */}
            <div>
              <label className="text-xs font-mono font-bold text-gray-300 uppercase block mb-1.5">
                📝 {isBn ? "প্রশ্নের বিবরণ (Question Text)" : "Question Statement"} *
              </label>
              <textarea
                required
                rows={2}
                value={qText}
                onChange={(e) => setQText(e.target.value)}
                placeholder="যেমন: হৃদপেশির অ্যাকশন পটেনশিয়াল সৃষ্টিতে কোন আয়নের ইনফ্লাক্স প্রধান ভূমিকা পালন করে?"
                className="w-full bg-black/80 border border-white/20 rounded-xl p-3 text-sm text-white focus:border-purple-500 focus:outline-none font-sans"
              />
            </div>

            {/* Options Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-mono font-bold text-gray-400 block mb-1">
                  Option A {qCorrect === 0 && "✅ (Correct)"}
                </label>
                <input
                  type="text"
                  required
                  value={qOptA}
                  onChange={(e) => setQOptA(e.target.value)}
                  placeholder="Option A"
                  className={`w-full bg-black/80 border rounded-xl px-3 py-2 text-xs font-sans text-white focus:outline-none ${
                    qCorrect === 0 ? "border-emerald-500 ring-1 ring-emerald-500" : "border-white/20"
                  }`}
                />
              </div>

              <div>
                <label className="text-xs font-mono font-bold text-gray-400 block mb-1">
                  Option B {qCorrect === 1 && "✅ (Correct)"}
                </label>
                <input
                  type="text"
                  required
                  value={qOptB}
                  onChange={(e) => setQOptB(e.target.value)}
                  placeholder="Option B"
                  className={`w-full bg-black/80 border rounded-xl px-3 py-2 text-xs font-sans text-white focus:outline-none ${
                    qCorrect === 1 ? "border-emerald-500 ring-1 ring-emerald-500" : "border-white/20"
                  }`}
                />
              </div>

              <div>
                <label className="text-xs font-mono font-bold text-gray-400 block mb-1">
                  Option C {qCorrect === 2 && "✅ (Correct)"}
                </label>
                <input
                  type="text"
                  value={qOptC}
                  onChange={(e) => setQOptC(e.target.value)}
                  placeholder="Option C"
                  className={`w-full bg-black/80 border rounded-xl px-3 py-2 text-xs font-sans text-white focus:outline-none ${
                    qCorrect === 2 ? "border-emerald-500 ring-1 ring-emerald-500" : "border-white/20"
                  }`}
                />
              </div>

              <div>
                <label className="text-xs font-mono font-bold text-gray-400 block mb-1">
                  Option D {qCorrect === 3 && "✅ (Correct)"}
                </label>
                <input
                  type="text"
                  value={qOptD}
                  onChange={(e) => setQOptD(e.target.value)}
                  placeholder="Option D"
                  className={`w-full bg-black/80 border rounded-xl px-3 py-2 text-xs font-sans text-white focus:outline-none ${
                    qCorrect === 3 ? "border-emerald-500 ring-1 ring-emerald-500" : "border-white/20"
                  }`}
                />
              </div>
            </div>

            {/* Correct Option Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-mono font-bold text-emerald-400 uppercase block mb-1.5">
                  🎯 {isBn ? "সঠিক উত্তর নির্বাচন করুন" : "Correct Answer Index"} *
                </label>
                <select
                  value={qCorrect}
                  onChange={(e) => setQCorrect(Number(e.target.value))}
                  className="w-full bg-black/80 border border-emerald-500/50 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-emerald-400 focus:outline-none"
                >
                  <option value={0}>Option A: {qOptA || "Option A"}</option>
                  <option value={1}>Option B: {qOptB || "Option B"}</option>
                  <option value={2}>Option C: {qOptC || "Option C"}</option>
                  <option value={3}>Option D: {qOptD || "Option D"}</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-mono font-bold text-gray-300 uppercase block mb-1.5">
                  📖 {isBn ? "অধ্যায়/টপিক (Chapter)" : "Chapter / Topic"}
                </label>
                <input
                  type="text"
                  value={qChapter}
                  onChange={(e) => setQChapter(e.target.value)}
                  placeholder="e.g. কোষ বিভাজন, রক্ত ও সংবহন"
                  className="w-full bg-black/80 border border-white/20 rounded-xl px-3 py-2.5 text-xs font-mono text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Explanation */}
            <div>
              <label className="text-xs font-mono font-bold text-gray-300 uppercase block mb-1.5">
                💡 {isBn ? "ক্লিনিক্যাল ব্যাখ্যা ও রেফারেন্স (Explanation)" : "Clinical Explanation & Reference"}
              </label>
              <textarea
                rows={2}
                value={qExplanation}
                onChange={(e) => setQExplanation(e.target.value)}
                placeholder="সঠিক উত্তরের মূল কারণ ও পাঠ্যবই রেফারেন্স লিখুন..."
                className="w-full bg-black/80 border border-white/20 rounded-xl p-3 text-xs text-white focus:border-purple-500 focus:outline-none font-sans"
              />
            </div>

            {/* Submit buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={handleResetForm}
                className="px-4 py-2 rounded-xl border border-white/20 text-gray-300 hover:text-white hover:bg-white/5 font-mono text-xs transition"
              >
                {isBn ? "বাতিল" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-mono text-xs font-bold uppercase rounded-xl transition shadow-lg flex items-center gap-2 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                {editingQuestionId
                  ? isBn
                    ? "আপডেট করুন"
                    : "Update Question"
                  : isBn
                  ? "গেম প্রশ্ন সেভ করুন"
                  : "Save Game Question"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-[#111111] p-4 rounded-2xl border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isBn ? "গেম প্রশ্ন খুঁজুন..." : "Search game questions..."}
            className="w-full bg-black/60 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={selectedGameFilter}
            onChange={(e) => setSelectedGameFilter(e.target.value)}
            className="bg-black/80 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-gray-300 focus:outline-none"
          >
            <option value="all">🎮 {isBn ? "সব গেম (" + questions.length + ")" : `All Games (${questions.length})`}</option>
            {MEDICAL_GAMES.map((g) => (
              <option key={g.id} value={g.id}>
                {g.icon} {g.title}
              </option>
            ))}
          </select>

          <select
            value={selectedSubjectFilter}
            onChange={(e) => setSelectedSubjectFilter(e.target.value)}
            className="bg-black/80 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-gray-300 focus:outline-none"
          >
            <option value="all">📚 All Subjects</option>
            <option value="Biology">Biology</option>
            <option value="Chemistry">Chemistry</option>
            <option value="Physics">Physics</option>
            <option value="GK">GK</option>
            <option value="English">English</option>
          </select>
        </div>
      </div>

      {/* Questions List */}
      {loading ? (
        <div className="text-center py-12 font-mono text-xs text-gray-400 animate-pulse">
          ⏳ {isBn ? "গেম প্রশ্ন ডাটাবেজ থেকে লোড হচ্ছে..." : "Loading game questions..."}
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="bg-[#111111] border border-dashed border-white/10 rounded-2xl p-12 text-center space-y-3">
          <Gamepad2 className="w-10 h-10 text-gray-600 mx-auto" />
          <h4 className="text-sm font-bold text-gray-300 uppercase font-mono">
            {isBn ? "কোনো গেম প্রশ্ন পাওয়া যায়নি" : "No Game Questions Found"}
          </h4>
          <p className="text-xs text-gray-500 font-mono max-w-sm mx-auto">
            {isBn
              ? "উপরে 'নতুন গেম প্রশ্ন যোগ করুন' অথবা 'প্রিসেট প্রশ্ন যুক্ত করুন' বাটনে ক্লিক করে গেমসের প্রশ্ন তৈরি করুন।"
              : "Click 'Add Game Question' or 'Seed Starter Game MCQs' above to populate game arena questions."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredQuestions.map((q, idx) => {
            const targetGame = MEDICAL_GAMES.find((g) => g.id === q.targetGameId);
            return (
              <div
                key={q.id}
                className="bg-[#121420] border border-white/10 hover:border-purple-500/40 rounded-2xl p-4 transition space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 flex-1">
                    <span className="w-6 h-6 rounded-lg bg-purple-950/60 border border-purple-800 text-purple-300 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-900/40 text-purple-300 border border-purple-700/40">
                          {targetGame ? `${targetGame.icon} ${targetGame.title}` : "🌐 All Games"}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/60 text-gray-400 border border-white/10">
                          {q.subject} • {q.chapter}
                        </span>
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                            q.difficulty === "Easy"
                              ? "bg-emerald-950/60 text-emerald-400"
                              : q.difficulty === "Hard"
                              ? "bg-red-950/60 text-red-400"
                              : "bg-yellow-950/60 text-yellow-400"
                          }`}
                        >
                          {q.difficulty}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white leading-relaxed">{q.questionText}</h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleEditQuestion(q)}
                      title="Edit question"
                      className="p-2 hover:bg-blue-950/40 text-gray-400 hover:text-blue-400 rounded-lg transition"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteQuestion(q.id)}
                      title="Delete question"
                      className="p-2 hover:bg-red-950/40 text-gray-400 hover:text-red-400 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Options preview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs font-sans pt-1">
                  {q.options.map((opt, oIdx) => (
                    <div
                      key={oIdx}
                      className={`p-2 rounded-xl border flex items-center gap-2 ${
                        oIdx === q.correctAnswerIndex
                          ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300 font-bold"
                          : "bg-black/40 border-white/5 text-gray-400"
                      }`}
                    >
                      <span className="w-5 h-5 rounded-md bg-white/10 text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                        {String.fromCharCode(65 + oIdx)}
                      </span>
                      <span className="truncate">{opt}</span>
                    </div>
                  ))}
                </div>

                {q.explanation && (
                  <div className="text-[11px] text-gray-400 bg-black/40 p-2.5 rounded-xl border border-white/5 font-sans">
                    💡 <span className="font-semibold text-gray-300">ব্যাখ্যা:</span> {q.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
