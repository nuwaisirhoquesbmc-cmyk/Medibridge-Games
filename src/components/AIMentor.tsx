import React, { useState, useEffect } from "react";
import { UserProfile } from "../types";
import { collection, query, where, orderBy, limit, onSnapshot, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import {
  Bot,
  Sparkles,
  Send,
  Calendar,
  TrendingUp,
  Clock,
  Loader2,
  MessageSquare,
} from "lucide-react";

interface AIMentorProps {
  user: UserProfile;
  language: "bn" | "en";
  theme?: "light" | "dark";
}

export default function AIMentor({ user, language, theme = "dark" }: AIMentorProps) {
  const [activeSubTab, setActiveSubTab] = useState<"chat" | "planner" | "analytics">("chat");
  const isBn = language === "bn";
  const isDark = theme === "dark";

  // Real-time Queries & Predictions from Firestore
  const [studentQueries, setStudentQueries] = useState<any[]>([]);
  const [studentPredictions, setStudentPredictions] = useState<any[]>([]);

  // Q&A States
  const [chatInput, setChatInput] = useState("");
  const [submittingQuery, setSubmittingQuery] = useState(false);

  // Predictor States
  const [sscGpa, setSscGpa] = useState("");
  const [hscGpa, setHscGpa] = useState("");
  const [customAccuracy, setCustomAccuracy] = useState("");
  const [submittingPrediction, setSubmittingPrediction] = useState(false);

  // Planner States
  const [weakSubjects, setWeakSubjects] = useState<string[]>(["Biology", "Chemistry"]);
  const [weakChapters, setWeakChapters] = useState("Organic Chemistry; Plant Physiology");
  const [availableDays, setAvailableDays] = useState(45);
  const [dailyHours, setDailyHours] = useState(6);
  const [generatedPlan, setGeneratedPlan] = useState<string | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);

  // Daily Mission Tracker
  useEffect(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const consultAiKey = `medibridge_consult_ai_${user.uid}_${todayStr}`;
    localStorage.setItem(consultAiKey, "true");
  }, [user.uid]);

  // Sync Student Q&A Queries (limit 20)
  useEffect(() => {
    const q = query(
      collection(db, "mentor_queries"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded: any[] = [];
        snapshot.forEach((doc) => {
          loaded.push({ id: doc.id, ...doc.data() });
        });
        setStudentQueries(loaded);
      },
      (err) => console.warn("Could not load queries:", err)
    );
    return () => unsubscribe();
  }, [user.uid]);

  // Sync Student Predictions (limit 20)
  useEffect(() => {
    const q = query(
      collection(db, "mark_predictions"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded: any[] = [];
        snapshot.forEach((doc) => {
          loaded.push({ id: doc.id, ...doc.data() });
        });
        setStudentPredictions(loaded);
      },
      (err) => console.warn("Could not load predictions:", err)
    );
    return () => unsubscribe();
  }, [user.uid]);

  // Submit Q&A Query
  const submitQuery = async () => {
    if (!chatInput.trim()) return;
    const text = chatInput.trim();
    setSubmittingQuery(true);
    try {
      await addDoc(collection(db, "mentor_queries"), {
        userId: user.uid,
        userName: user.displayName || "Anonymous Aspirant",
        userEmail: user.email || "no-email@medibridge.com",
        question: text,
        reply: "",
        status: "pending",
        createdAt: new Date().toISOString(),
      });
      setChatInput("");
      alert(
        isBn
          ? "আপনার প্রশ্নটি মেন্টরের কাছে পাঠানো হয়েছে! মেন্টর প্যানেল থেকে উত্তর দেওয়ার সাথে সাথে নোটিফিকেশন পাবেন।"
          : "Your question has been sent to your mentor! You will receive a notification as soon as the mentor replies."
      );
    } catch (err: any) {
      console.error("Failed to submit question:", err);
      alert("Error: " + err.message);
    } finally {
      setSubmittingQuery(false);
    }
  };

  // Submit Prediction Request
  const handlePredictorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sscGpa.trim() || !hscGpa.trim()) {
      alert(isBn ? "অনুগ্রহ করে SSC এবং HSC জিপিএ লিখুন।" : "Please enter your SSC and HSC GPA.");
      return;
    }
    setSubmittingPrediction(true);
    try {
      const defaultAccuracy =
        user.questionsSolved > 0 ? Math.round((user.questionsCorrect / user.questionsSolved) * 100) : 75;

      await addDoc(collection(db, "mark_predictions"), {
        userId: user.uid,
        userName: user.displayName || "Anonymous Aspirant",
        userEmail: user.email || "no-email@medibridge.com",
        sscGpa: sscGpa.trim(),
        hscGpa: hscGpa.trim(),
        testScores: Number(customAccuracy) || defaultAccuracy,
        predictedMark: "",
        recommendedCollege: "",
        comments: "",
        status: "pending",
        createdAt: new Date().toISOString(),
      });
      setSscGpa("");
      setHscGpa("");
      setCustomAccuracy("");
      alert(
        isBn
          ? "আপনার একাডেমিক ট্র্যাকিং রিকোয়েস্ট জমা নেওয়া হয়েছে! মেন্টর আপনার মার্ক এবং কলেজ প্রেডিকশন রেডি করবেন।"
          : "Your academic tracking request has been submitted! Your mentor will evaluate your profile and prepare your mark prediction soon."
      );
    } catch (err: any) {
      console.error("Failed to submit predictor request:", err);
      alert("Error: " + err.message);
    } finally {
      setSubmittingPrediction(false);
    }
  };

  // Generate tactical planner campaign client-side
  const generateCampaignPlan = (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingPlan(true);
    setTimeout(() => {
      const plan = `### 🎓 CUSTOM REVISION RAID CAMPAIGN PLAN
**Timeline:** ${availableDays} Days | **Daily Commitment:** ${dailyHours} Hours/Day
**Target Subjects:** ${weakSubjects.join(", ")}
**Chapters to Defeat:** ${weakChapters}

---

#### 📌 PHASE 1: FOUNDATION STRENGTHENING (Day 1 - ${Math.round(availableDays * 0.4)})
- Focus intensely on core concepts of **${weakSubjects[0] || "Biology"}** and **${weakSubjects[1] || "Chemistry"}**.
- Dedicate the first ${Math.round(dailyHours * 0.6)} hours of daily grind to reading textbook lines (Abul Hasan / Hazari Nag).
- Solve topic-wise past year questions (MAT & DU) at the end of each session.

#### ⚡ PHASE 2: RIGOROUS EXAM SIMULATION (Day ${Math.round(availableDays * 0.4) + 1} - ${Math.round(availableDays * 0.85)})
- Practice active recall techniques. Use mnemonics for scientific naming and chemical catalysts.
- Solve daily mock challenges on MediBridge Boss Battles to build speed. Maintain at least 80% accuracy.

#### 🩺 PHASE 3: FINAL DEEP CALIBRATION (Day ${Math.round(activeSubTab === "chat" ? 30 : availableDays * 0.85) + 1} - ${availableDays})
- Review weak chapters list: **${weakChapters}**.
- Avoid reading new reference topics. Solidify high-yield formulas and biological classification charts.
- Rest well and practice stress management to conquer exam day with total confidence.`;
      setGeneratedPlan(plan);
      setLoadingPlan(false);
    }, 800);
  };

  // Helper to render formatted text with custom styles
  const renderFormattedText = (text: string) => {
    return text.split("\n").map((line, index) => {
      let trimmed = line.trim();
      if (!trimmed) return <div key={index} className="h-2"></div>;

      if (trimmed.startsWith("####")) {
        return <h5 key={index} className="text-xs font-bold text-[#FFD700] uppercase mt-3 mb-1.5 font-mono tracking-wide">{trimmed.replace(/####/g, "").trim()}</h5>;
      }
      if (trimmed.startsWith("###")) {
        return <h4 key={index} className="text-sm font-extrabold text-[#FFD700] uppercase mt-4 mb-2 border-b border-white/5 pb-1 font-mono">{trimmed.replace(/###/g, "").trim()}</h4>;
      }
      if (trimmed.startsWith("##")) {
        return <h3 key={index} className="text-base font-black text-white uppercase mt-4 mb-2 font-mono">{trimmed.replace(/##/g, "").trim()}</h3>;
      }
      if (trimmed.startsWith("#")) {
        return <h2 key={index} className="text-lg font-black text-[#C1121F] uppercase mt-4 mb-3 font-mono">{trimmed.replace(/#/g, "").trim()}</h2>;
      }

      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        return (
          <li key={index} className="ml-4 list-disc text-xs py-0.5 leading-relaxed text-gray-300">
            {trimmed.substring(2).trim()}
          </li>
        );
      }

      return (
        <p key={index} className="text-xs leading-relaxed mb-1.5 text-gray-300">
          {trimmed}
        </p>
      );
    });
  };

  return (
    <div className="grid lg:grid-cols-4 gap-8">
      {/* LEFT PANEL: Navigator HUD */}
      <div className="lg:col-span-1 flex flex-col gap-4">
        <div className={`border p-5 rounded-2xl flex flex-col gap-4 ${
          isDark ? "bg-[#111111] border-white/10" : "bg-white border-red-100 shadow-sm"
        }`}>
          <div className={`flex items-center gap-3 border-b pb-3 ${isDark ? "border-white/5" : "border-red-100/50"}`}>
            <span className="text-3xl filter drop-shadow-[0_0_10px_rgba(255,215,0,0.4)]">👨‍🏫🎓</span>
            <div>
              <h3 className={`font-extrabold text-sm uppercase font-display ${isDark ? "text-white" : "text-slate-900"}`}>
                {isBn ? "ইউর মেন্টর" : "YOUR MENTOR"}
              </h3>
              <span className={`text-[10px] font-mono tracking-widest block ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                {isBn ? "কমিউনিকেশন এডভাইজর" : "TACTICAL ADVISOR"}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2 font-mono">
            <button
              onClick={() => setActiveSubTab("chat")}
              className={`w-full py-2.5 px-3 text-xs font-bold text-left rounded-xl transition duration-300 flex items-center gap-2.5 border uppercase cursor-pointer ${
                activeSubTab === "chat"
                  ? "bg-red-950/20 text-[#FFD700] border-[#C1121F]"
                  : isDark
                    ? "bg-black/35 text-gray-400 border-white/10 hover:border-[#C1121F]/40"
                    : "bg-slate-50 text-slate-650 border-red-100 hover:border-[#C1121F]/40"
              }`}
            >
              <MessageSquare className="w-4 h-4 shrink-0 text-[#C1121F]" /> {isBn ? "মেন্টর ডাউট সলভ" : "MENTOR Q&A"}
            </button>
            <button
              onClick={() => setActiveSubTab("planner")}
              className={`w-full py-2.5 px-3 text-xs font-bold text-left rounded-xl transition duration-300 flex items-center gap-2.5 border uppercase cursor-pointer ${
                activeSubTab === "planner"
                  ? "bg-red-950/20 text-[#FFD700] border-[#C1121F]"
                  : isDark
                    ? "bg-black/35 text-gray-400 border-white/10 hover:border-[#C1121F]/40"
                    : "bg-slate-50 text-slate-650 border-red-100 hover:border-[#C1121F]/40"
              }`}
            >
              <Calendar className="w-4 h-4 shrink-0 text-sky-500" /> {isBn ? "স্টাডি প্ল্যানার" : "CAMPAIGN PLANNER"}
            </button>
            <button
              onClick={() => setActiveSubTab("analytics")}
              className={`w-full py-2.5 px-3 text-xs font-bold text-left rounded-xl transition duration-300 flex items-center gap-2.5 border uppercase cursor-pointer ${
                activeSubTab === "analytics"
                  ? "bg-red-950/20 text-[#FFD700] border-[#C1121F]"
                  : isDark
                    ? "bg-black/35 text-gray-400 border-white/10 hover:border-[#C1121F]/40"
                    : "bg-slate-50 text-slate-655 border-red-100 hover:border-[#C1121F]/40"
              }`}
            >
              <TrendingUp className="w-4 h-4 shrink-0 text-amber-500" /> {isBn ? "মার্কস প্রেডিক্টর" : "MAT MARK PREDICTOR"}
            </button>
          </div>
        </div>

        {/* Live system state box */}
        <div className={`border p-5 rounded-2xl text-[11px] font-mono leading-relaxed flex flex-col gap-1 ${
          isDark ? "bg-[#111111] border-white/10" : "bg-white border-red-100 shadow-sm"
        }`}>
          <span className={`uppercase tracking-widest font-bold ${isDark ? "text-gray-400" : "text-slate-500"}`}>
            {isBn ? "মেন্টর সাপোর্ট স্ট্যাটাস:" : "MENTOR CHANNELS:"}
          </span>
          <div className="flex justify-between items-center mt-1">
            <span className={isDark ? "text-gray-400" : "text-slate-500"}>{isBn ? "কমান্ড লিংক সংযোগ:" : "Tactical Link:"}</span>
            <span className="text-emerald-500 dark:text-emerald-400 font-bold">● {isBn ? "অনলাইন" : "ACTIVE"}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className={isDark ? "text-gray-400" : "text-slate-500"}>{isBn ? "মেন্টর প্যানেল:" : "Head Mentor:"}</span>
            <span className="text-amber-600 dark:text-[#FFD700] font-bold">OPERATIONAL</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Dynamic View Area */}
      <div className="lg:col-span-3 flex flex-col gap-6">

        {/* TAB 1: Chat/Q&A Submission */}
        {activeSubTab === "chat" && (
          <div className="flex flex-col gap-6">
            <div className={`border rounded-2xl p-6 relative overflow-hidden ${
              isDark ? "bg-[#111111] border-white/10" : "bg-white border-red-100 shadow-sm"
            }`}>
              <div className="absolute top-0 inset-x-0 h-1 bg-[#C1121F]"></div>
              
              <div className="flex flex-col gap-1.5 border-b border-white/5 pb-4 mb-4">
                <h3 className={`font-extrabold text-sm uppercase flex items-center gap-2 font-display ${isDark ? "text-white" : "text-slate-900"}`}>
                  <Bot className="w-4 h-4 text-amber-600 dark:text-[#FFD700]" /> {isBn ? "আপনার মেন্টরকে জিজ্ঞেস করুন" : "SUBMIT QUESTION TO YOUR MENTOR"}
                </h3>
                <p className={`text-[11px] ${isDark ? "text-gray-400" : "text-slate-550"}`}>
                  {isBn 
                    ? "জীববিজ্ঞান, রসায়ন, বা সাধারণ জ্ঞানের যেকোনো কঠিন টপিক লিখে পাঠান। হেড মেন্টর নিজেই উত্তর দেবেন!"
                    : "Submit any complex biology concept, chemistry equation, or mnemonic challenge. Your mentor will reply to you personally."}
                </p>
              </div>

              {/* Submit Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitQuery()}
                  placeholder={isBn ? "যেমন: কোষ বিভাজনের সবচেয়ে জটিল ধাপটি সহজভাবে বুঝিয়ে দিন..." : "Ask e.g. explain the most crucial steps of cellular respiration simply..."}
                  className={`flex-1 border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-[#C1121F] transition duration-300 ${
                    isDark
                      ? "bg-[#0A0A0A] border-white/10 text-white placeholder-gray-500"
                      : "bg-white border-gray-200 text-slate-800 placeholder-slate-400"
                  }`}
                  disabled={submittingQuery}
                />
                <button
                  onClick={submitQuery}
                  disabled={submittingQuery || !chatInput.trim()}
                  className="px-5 py-2.5 bg-[#C1121F] hover:bg-red-750 disabled:opacity-40 text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 transition duration-300 font-display cursor-pointer shrink-0"
                >
                  {submittingQuery ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Send className="w-3.5 h-3.5" />}
                  {isBn ? "জিজ্ঞাসা" : "SEND"}
                </button>
              </div>
            </div>

            {/* Queries Logs History */}
            <div className={`border rounded-2xl p-6 ${
              isDark ? "bg-[#111111] border-white/10" : "bg-white border-red-100 shadow-sm"
            }`}>
              <h4 className={`font-bold text-xs uppercase tracking-wider font-mono mb-4 text-[#FFD700] ${isDark ? "text-[#FFD700]" : "text-[#C1121F]"}`}>
                {isBn ? "মেন্টর প্রশ্নোত্তর হিস্টোরি" : "MENTOR DOCK STATUS & DISPATCHED RESPONSES"}
              </h4>

              <div className="flex flex-col gap-4 max-h-[450px] overflow-y-auto">
                {studentQueries.map((q) => (
                  <div key={q.id} className="bg-black/35 border border-white/5 p-4 rounded-xl flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-mono text-gray-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Asked: {new Date(q.createdAt).toLocaleString()}
                      </span>
                      <span className={`text-[9px] font-mono uppercase font-black px-2 py-0.5 rounded border ${
                        q.status === "pending"
                          ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20 animate-pulse"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      }`}>
                        {q.status === "pending" ? (isBn ? "অপেক্ষমান" : "pending") : (isBn ? "উত্তর প্রদানকৃত" : "replied")}
                      </span>
                    </div>

                    <p className="text-xs text-gray-205 bg-black/40 p-2.5 rounded-lg border border-gray-900 leading-relaxed font-medium">
                      Q: {q.question}
                    </p>

                    {q.reply ? (
                      <div className="bg-emerald-950/10 border border-emerald-500/15 p-3.5 rounded-lg flex gap-3 items-start mt-1">
                        <span className="text-xl shrink-0">👨‍🏫</span>
                        <div className="text-xs leading-relaxed text-gray-300">
                          <p className="font-bold text-emerald-400 font-mono text-[10px] mb-1">MENTOR RESPONSE:</p>
                          <p className="text-gray-200">{q.reply}</p>
                          <span className="text-[9px] text-gray-500 font-mono block mt-1.5">
                            Replied: {new Date(q.repliedAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-yellow-950/10 border border-yellow-500/10 p-3 rounded-lg text-center text-[10px] text-gray-400 font-mono uppercase mt-1">
                        ⌛ {isBn ? "মেন্টর আপনার প্রশ্নটি দেখছেন। খুব শীঘ্রই উত্তর পেয়ে যাবেন।" : "Your mentor is calibrating a response. Stay tuned."}
                      </div>
                    )}
                  </div>
                ))}

                {studentQueries.length === 0 && (
                  <div className="text-center py-12 text-xs text-gray-500 font-mono uppercase">
                    {isBn ? "এখনো কোনো প্রশ্ন জিজ্ঞেস করা হয়নি।" : "No questions submitted yet. Ask anything above!"}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Routine Planner */}
        {activeSubTab === "planner" && (
          <div className={`border rounded-2xl p-6 relative ${
            isDark ? "bg-[#111111] border-white/10" : "bg-white border-red-100 shadow-sm"
          }`}>
            <div className="absolute top-0 left-6 h-1 w-24 bg-[#C1121F]"></div>
            
            <div className={`flex justify-between items-center border-b pb-4 mb-6 ${isDark ? "border-white/5" : "border-red-100/50"}`}>
              <div>
                <h3 className={`font-extrabold uppercase text-base font-display ${isDark ? "text-white" : "text-slate-900"}`}>
                  {isBn ? "মেন্টর কাস্টম রুটিন জেনারেটর" : "STUDY ROUTINE COGNITIVE PLANNER"}
                </h3>
                <p className={`text-xs mt-0.5 ${isDark ? "text-gray-400" : "text-slate-550"}`}>
                  {isBn ? "আপনার দুর্বল অধ্যায়গুলোর কাস্টমাইজড রুটিন প্ল্যান তৈরি করুন।" : "Let the cognitive planner map out a flawless daily routine to smash weak topics."}
                </p>
              </div>
              <span className="text-2xl">⚡</span>
            </div>

            <form onSubmit={generateCampaignPlan} className="grid md:grid-cols-2 gap-5 mb-6">
              <div className="flex flex-col gap-1.5 font-display">
                <label className={`text-xs font-mono font-bold uppercase ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                  {isBn ? "দুর্বল বিষয়সমূহ" : "Target Weak Subjects"}
                </label>
                <div className="flex flex-wrap gap-2">
                  {["Biology", "Chemistry", "Physics", "English", "GK"].map((sub) => {
                    const isSelected = weakSubjects.includes(sub);
                    return (
                      <button
                        type="button"
                        key={sub}
                        onClick={() => {
                          if (isSelected) {
                            setWeakSubjects(weakSubjects.filter((s) => s !== sub));
                          } else {
                            setWeakSubjects([...weakSubjects, sub]);
                          }
                        }}
                        className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg border transition uppercase duration-200 cursor-pointer ${
                          isSelected
                            ? "bg-[#C1121F] text-white border-[#C1121F]"
                            : isDark
                              ? "bg-black/45 border-white/10 hover:border-[#C1121F]/45 text-gray-400"
                              : "bg-slate-50 border-red-100 hover:border-[#C1121F]/45 text-slate-600"
                        }`}
                      >
                        {isBn ? (sub === "Biology" ? "জীববিজ্ঞান" : sub === "Chemistry" ? "রসায়ন" : sub === "Physics" ? "পদার্থবিজ্ঞান" : sub === "English" ? "ইংরেজি" : "সাধারণ জ্ঞান") : sub}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={`text-xs font-mono font-bold uppercase ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                  {isBn ? "অধ্যায়সমূহ (সেমিকোলন দিয়ে ভাগ করুন)" : "Chapters to Defeat (Semicolon split)"}
                </label>
                <input
                  type="text"
                  value={weakChapters}
                  onChange={(e) => setWeakChapters(e.target.value)}
                  placeholder="e.g. Organic Chemistry; Cell Division"
                  className={`border rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#C1121F] transition duration-200 ${
                    isDark
                      ? "bg-[#0A0A0A] border-white/10 text-white"
                      : "bg-white border-gray-200 text-slate-800"
                  }`}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={`text-xs font-mono font-bold uppercase ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                  {isBn ? "পরীক্ষার বাকি দিন" : "Campaign Timeline (Days left)"}
                </label>
                <input
                  type="number"
                  min={5}
                  max={120}
                  value={availableDays}
                  onChange={(e) => setAvailableDays(Number(e.target.value))}
                  className={`border rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#C1121F] transition duration-200 ${
                    isDark
                      ? "bg-[#0A0A0A] border-white/10 text-white"
                      : "bg-white border-gray-200 text-slate-800"
                  }`}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={`text-xs font-mono font-bold uppercase ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                  {isBn ? "প্রতিদিনের পড়ার সময় (ঘন্টা/দিন)" : "Daily Study Grind Commitment (Hours/day)"}
                </label>
                <input
                  type="number"
                  min={2}
                  max={16}
                  value={dailyHours}
                  onChange={(e) => setDailyHours(Number(e.target.value))}
                  className={`border rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#C1121F] transition duration-200 ${
                    isDark
                      ? "bg-[#0A0A0A] border-white/10 text-white"
                      : "bg-white border-gray-200 text-slate-800"
                  }`}
                />
              </div>

              <div className="md:col-span-2 pt-2 text-right">
                <button
                  type="submit"
                  disabled={loadingPlan}
                  className="px-6 py-3 bg-[#C1121F] hover:bg-red-750 disabled:opacity-40 text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 ml-auto transition duration-300 border-b-2 border-red-950 font-display cursor-pointer"
                >
                  {loadingPlan ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-[#FFD700] fill-[#FFD700]" />
                  )}
                  {isBn ? "কাস্টম রুটিন তৈরি করুন ⚡" : "CALIBRATE REVISION GRID"}
                </button>
              </div>
            </form>

            {/* Generated Plan Report Box */}
            {generatedPlan && (
              <div className={`border rounded-2xl p-6 leading-relaxed relative overflow-hidden mt-4 shadow-inner ${
                isDark ? "bg-[#0D0D0D] border-white/10 text-white" : "bg-red-50/10 border-red-100 text-slate-800"
              }`}>
                {renderFormattedText(generatedPlan)}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MAT Mark Predictor (Submission & Viewing) */}
        {activeSubTab === "analytics" && (
          <div className="flex flex-col gap-6">
            <div className={`border rounded-2xl p-6 relative ${
              isDark ? "bg-[#111111] border-white/10" : "bg-white border-red-100 shadow-sm"
            }`}>
              <div className="absolute top-0 left-6 h-1 w-24 bg-[#FFD700]"></div>
              
              <div className={`flex justify-between items-center border-b pb-4 mb-6 ${isDark ? "border-white/5" : "border-red-100/50"}`}>
                <div>
                  <h3 className={`font-extrabold uppercase text-base font-display ${isDark ? "text-white" : "text-slate-900"}`}>
                    {isBn ? "ভর্তি পরীক্ষা সম্ভাব্য মার্ক প্রেডিক্টর" : "CLINICAL PERFORMANCE MARK PREDICTOR"}
                  </h3>
                  <p className={`text-xs mt-0.5 ${isDark ? "text-gray-400" : "text-slate-550"}`}>
                    {isBn 
                      ? "আপনার SSC, HSC জিপিএ এবং কুইজ সঠিকতার রেকর্ড সাবমিট করুন। হেড মেন্টর নিজেই হিসাব করে মার্ক ও কলেজ ডিক্লেয়ার করবেন!" 
                      : "Submit your academic ledger (SSC/HSC GPA) and trials record. Your mentor will issue an official predicted score."}
                  </p>
                </div>
                <span className="text-2xl">🩺</span>
              </div>

              {/* Predictor Form */}
              <form onSubmit={handlePredictorSubmit} className="grid sm:grid-cols-3 gap-4 items-end">
                <div className="flex flex-col gap-1.5">
                  <label className={`text-xs font-mono font-bold uppercase ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                    SSC GPA (e.g. 5.00)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 5.00"
                    value={sscGpa}
                    onChange={(e) => setSscGpa(e.target.value)}
                    className={`border rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#C1121F] transition duration-200 ${
                      isDark ? "bg-[#0A0A0A] border-white/10 text-white" : "bg-white border-gray-200 text-slate-800"
                    }`}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={`text-xs font-mono font-bold uppercase ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                    HSC GPA (e.g. 5.00)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 5.00"
                    value={hscGpa}
                    onChange={(e) => setHscGpa(e.target.value)}
                    className={`border rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#C1121F] transition duration-200 ${
                      isDark ? "bg-[#0A0A0A] border-white/10 text-white" : "bg-white border-gray-200 text-slate-800"
                    }`}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={`text-xs font-mono font-bold uppercase ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                    Quiz Score (%) - Optional
                  </label>
                  <input
                    type="text"
                    placeholder={`Default: ${user.questionsSolved > 0 ? Math.round((user.questionsCorrect / user.questionsSolved) * 100) : 75}%`}
                    value={customAccuracy}
                    onChange={(e) => setCustomAccuracy(e.target.value)}
                    className={`border rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#C1121F] transition duration-200 ${
                      isDark ? "bg-[#0A0A0A] border-white/10 text-white" : "bg-white border-gray-200 text-slate-800"
                    }`}
                  />
                </div>

                <div className="sm:col-span-3 text-right">
                  <button
                    type="submit"
                    disabled={submittingPrediction}
                    className="px-6 py-3 bg-amber-600 dark:bg-[#FFD700] text-white dark:text-black font-black uppercase tracking-wider text-xs rounded-xl transition duration-300 uppercase flex items-center justify-center gap-2 hover:bg-yellow-500 font-mono shadow-[0_0_15px_rgba(255,215,0,0.15)] cursor-pointer"
                  >
                    {submittingPrediction ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white dark:text-black" />
                    ) : (
                      isBn ? "ভর্তি পরীক্ষার মার্ক প্রেডিকশন রিকোয়েস্ট পাঠান" : "SUBMIT FOR CLINICAL EVALUATION"
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Prediction requests history list */}
            <div className={`border rounded-2xl p-6 ${
              isDark ? "bg-[#111111] border-white/10" : "bg-white border-red-100 shadow-sm"
            }`}>
              <h4 className={`font-bold text-xs uppercase tracking-wider font-mono mb-4 text-[#FFD700] ${isDark ? "text-[#FFD700]" : "text-[#C1121F]"}`}>
                {isBn ? "আপনার মেন্টর মার্ক প্রেডিকশন হিস্টোরি" : "PREDICTOR HISTORIC EVALUATIONS"}
              </h4>

              <div className="flex flex-col gap-5">
                {studentPredictions.map((p) => (
                  <div key={p.id} className="bg-black/40 border border-white/5 p-5 rounded-xl flex flex-col gap-3">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-[10px] font-mono text-gray-500">
                        Submitted: {new Date(p.createdAt).toLocaleDateString()}
                      </span>
                      <span className={`text-[9px] font-mono uppercase font-black px-2 py-0.5 rounded border ${
                        p.status === "pending"
                          ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20 animate-pulse"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      }`}>
                        {p.status === "pending" ? (isBn ? "মূল্যায়ন চলছে" : "EVALUATING") : (isBn ? "সম্পন্ন" : "COMPLETED")}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs font-mono bg-black/40 p-2.5 rounded-lg border border-gray-900">
                      <div>
                        <span className="text-[8px] text-gray-500 block">SSC GPA:</span>
                        <span className="font-extrabold text-white">{p.sscGpa}</span>
                      </div>
                      <div>
                        <span className="text-[8px] text-gray-500 block">HSC GPA:</span>
                        <span className="font-extrabold text-white">{p.hscGpa}</span>
                      </div>
                      <div>
                        <span className="text-[8px] text-gray-500 block">QUIZ SCORE:</span>
                        <span className="font-extrabold text-amber-500">{p.testScores}%</span>
                      </div>
                    </div>

                    {p.status === "predicted" ? (
                      <div className="bg-gradient-to-r from-emerald-950/20 to-black/30 border border-emerald-500/15 p-4 rounded-xl flex flex-col gap-3">
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="flex flex-col">
                            <span className="text-[8px] text-gray-400 font-mono uppercase">PREDICTED MAT MARK RANGE:</span>
                            <span className="text-xl font-black font-mono text-[#FFD700] tracking-wider">{p.predictedMark} / 100</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[8px] text-gray-400 font-mono uppercase">RECOMMENDED TARGET MEDICAL COLLEGE:</span>
                            <span className="text-xs font-extrabold text-white mt-1 uppercase tracking-wide leading-tight">{p.recommendedCollege}</span>
                          </div>
                        </div>

                        {p.comments && (
                          <div className="border-t border-emerald-500/10 pt-2.5 mt-1">
                            <span className="text-[9px] text-emerald-400 font-mono block uppercase mb-1">🎓 MENTOR PRESCRIPTION & DIRECTIVE:</span>
                            <p className="text-xs text-gray-300 leading-relaxed italic">{p.comments}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-xs text-gray-400 font-mono uppercase bg-yellow-950/5 rounded-lg border border-yellow-500/5">
                        ⌛ {isBn 
                          ? "হেড মেন্টর বর্তমানে আপনার স্কোর এবং জিপিএ ডাটাবেজ ক্যালিব্রেট করছেন। রেডি হলে নোটিফিকেশন পাবেন!" 
                          : "Head mentor is running clinical simulations on your academic history. Hang tight!"}
                      </div>
                    )}
                  </div>
                ))}

                {studentPredictions.length === 0 && (
                  <div className="text-center py-12 text-xs text-gray-500 font-mono uppercase">
                    {isBn ? "কোনো মার্ক প্রেডিকশন রিকোয়েস্ট জমা দেওয়া হয়নি।" : "No prediction requests submitted yet. Use the tool above!"}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
