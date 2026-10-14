import React, { useState, useEffect } from "react";
import { Question } from "../../../types";
import { GameScoreResult } from "../gamingData";
import { playSound } from "../../../audio";
import {
  Sparkles,
  RotateCcw,
  ChevronRight,
  Clock,
  Heart,
  Stethoscope,
  Activity,
  UserCheck,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { motion } from "motion/react";

interface ClinicalERGameProps {
  questions: Question[];
  language: "bn" | "en";
  courseName: string;
  onFinishGame: (result: GameScoreResult) => void;
  onExit: () => void;
}

interface ERPatientCase {
  id: number;
  patientName: string;
  ageGender: string;
  complaint: string;
  vitals: string;
  question: Question;
}

export default function ClinicalERGame({
  questions,
  language,
  courseName,
  onFinishGame,
  onExit,
}: ClinicalERGameProps) {
  const isBn = language === "bn";
  const [gameState, setGameState] = useState<"intro" | "playing" | "victory">("intro");
  const [currentPatientIdx, setCurrentPatientIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [patientsTreated, setPatientsTreated] = useState(0);
  const [totalPatients, setTotalPatients] = useState(5);
  const [timeRemaining, setTimeRemaining] = useState(120);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [mistakes, setMistakes] = useState<{ question: Question; userChoice: number }[]>([]);

  // Generate ER patient cases using the course questions
  const patientNames = ["Md. Rafiqul Islam", "Nasrin Akter", "Suman Chakrabarty", "Farzana Yeasmin", "Anisur Rahman"];
  const patientVitals = [
    "BP: 140/90 mmHg | Pulse: 110 bpm | Temp: 101°F",
    "BP: 110/70 mmHg | Pulse: 88 bpm | SpO2: 98%",
    "BP: 160/100 mmHg | Pulse: 95 bpm | RR: 22/min",
    "BP: 90/60 mmHg | Pulse: 120 bpm | Temp: 103°F",
    "BP: 125/80 mmHg | Pulse: 76 bpm | SpO2: 99%",
  ];

  const activeQuestion = questions[currentPatientIdx % questions.length] || questions[0];
  const activePatientName = patientNames[currentPatientIdx % patientNames.length];
  const activeVitals = patientVitals[currentPatientIdx % patientVitals.length];

  useEffect(() => {
    if (gameState !== "playing") return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState]);

  const startGame = () => {
    playSound("click");
    setGameState("playing");
    setCurrentPatientIdx(0);
    setScore(0);
    setPatientsTreated(0);
    setCorrectCount(0);
    setWrongCount(0);
    setMistakes([]);
    setSelectedOption(null);
    setTimeRemaining(120);
  };

  const handleDiagnose = (idx: number) => {
    if (selectedOption !== null || gameState !== "playing") return;

    setSelectedOption(idx);
    const isCorrect = idx === activeQuestion.correctAnswerIndex;

    if (isCorrect) {
      playSound("correct");
      setScore((s) => s + 200);
      setCorrectCount((c) => c + 1);
    } else {
      playSound("incorrect");
      setWrongCount((w) => w + 1);
      setMistakes((prev) => [...prev, { question: activeQuestion, userChoice: idx }]);
    }

    setPatientsTreated((p) => p + 1);

    setTimeout(() => {
      setSelectedOption(null);
      if (currentPatientIdx + 1 >= totalPatients) {
        endGame();
      } else {
        setCurrentPatientIdx((prev) => prev + 1);
      }
    }, 1000);
  };

  const endGame = () => {
    playSound("levelup");
    setGameState("victory");
  };

  const finalizeSession = () => {
    const totalQ = correctCount + wrongCount;
    const accuracy = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;
    const xp = Math.round(score * 1.8);
    const coins = Math.round(score * 0.45);

    const result: GameScoreResult = {
      gameId: "clinical-er",
      gameTitle: "Clinical ER: Triage Doctor Sim",
      score,
      correctAnswers: correctCount,
      wrongAnswers: wrongCount,
      totalQuestions: totalQ,
      accuracy,
      xpEarned: xp,
      coinsEarned: coins,
      timeSpentSeconds: 120 - timeRemaining,
      comboMax: correctCount,
      mistakes,
    };

    onFinishGame(result);
  };

  return (
    <div className="w-full bg-[#08121A] border border-cyan-500/20 rounded-3xl overflow-hidden shadow-2xl relative font-sans">
      {/* Top HUD */}
      <div className="bg-black/80 border-b border-white/10 p-3 sm:p-4 flex items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-gray-300 rounded-lg transition text-[11px] font-bold"
          >
            ✕ {isBn ? "প্রস্থান" : "Exit"}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl">🏥</span>
            <span className="font-bold text-white uppercase hidden sm:inline">
              {isBn ? "ক্লিনিক্যাল ইআর ট্রায়াজ ডক্টর" : "Clinical ER Triage Doctor"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-6">
          <div className="text-cyan-300 font-bold bg-cyan-950/40 px-2.5 py-1 rounded-xl border border-cyan-500/30">
            🏥 CASE {currentPatientIdx + 1} / {totalPatients}
          </div>

          <div className="flex items-center gap-1.5 text-amber-400 bg-amber-950/40 px-2.5 py-1 rounded-xl border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-bold">{timeRemaining}s</span>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-gray-400 block uppercase leading-none">SCORE</span>
            <span className="font-black text-sm text-[#FFD700]">{score}</span>
          </div>
        </div>
      </div>

      {gameState === "intro" && (
        <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center min-h-[460px] bg-gradient-to-b from-cyan-950/30 via-black to-black">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-5xl shadow-[0_0_30px_rgba(6,182,212,0.5)] mb-6">
            🏥
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider mb-2 font-display">
            {isBn ? "ক্লিনিক্যাল ইআর: ট্রায়াজ ডক্টর সিম" : "Clinical ER: Triage Doctor Sim"}
          </h2>
          <p className="text-sm text-gray-300 max-w-lg mb-6 leading-relaxed">
            {isBn
              ? "জরুরি বিভাগে আসা রোগীদের লক্ষণ ও ভাইটালস দেখে দ্রুত সঠিক ক্লিনিক্যাল সিদ্ধান্ত ও ওষুধ নির্বাচন করে প্রাণ বাঁচাও!"
              : "Step into the ER Ward! Triage incoming medical cases, evaluate clinical symptoms, and administer correct treatments under emergency pressure."}
          </p>

          <button
            onClick={startGame}
            className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-[0_0_25px_rgba(6,182,212,0.6)] transition cursor-pointer flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isBn ? "ট্রায়াজ ডিউটি শুরু করুন" : "BEGIN TRIAGE DUTY"}</span>
          </button>
        </div>
      )}

      {gameState === "playing" && (
        <div className="p-4 sm:p-6 space-y-6">
          {/* Patient Hospital Bed Record Card */}
          <div className="bg-gradient-to-r from-cyan-950/70 via-blue-950/50 to-cyan-950/70 border border-cyan-500/40 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-xl">
                  🩺
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white font-mono">{activePatientName}</h4>
                  <span className="text-[10px] text-cyan-300 font-mono">EMERGENCY ADMISSION • CASE #{currentPatientIdx + 1}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-mono font-bold">
                <Activity className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
                <span>MONITORING</span>
              </div>
            </div>

            <div className="p-2.5 bg-black/50 rounded-xl border border-white/5 font-mono text-xs text-gray-300 flex items-center justify-between">
              <span className="text-gray-400">VITALS:</span>
              <span className="text-cyan-300 font-bold">{activeVitals}</span>
            </div>
          </div>

          {/* Clinical Diagnostic MCQ */}
          <div className="bg-black/60 border border-white/10 rounded-2xl p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3 font-mono text-xs">
              <span className="text-cyan-400 font-bold uppercase">
                {activeQuestion.subject} • {activeQuestion.chapter || "Clinical Medicine"}
              </span>
              <span className="text-gray-400">Diagnostic Decision</span>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-white leading-relaxed">
              {activeQuestion.questionText}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {activeQuestion.options.map((opt, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrect = idx === activeQuestion.correctAnswerIndex;
                let btnStyle = "bg-black/70 border-white/10 text-gray-200 hover:border-cyan-500/40";

                if (selectedOption !== null) {
                  if (isCorrect) {
                    btnStyle = "bg-emerald-950/80 border-emerald-500 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.4)]";
                  } else if (isSelected) {
                    btnStyle = "bg-red-950/80 border-red-500 text-red-200";
                  } else {
                    btnStyle = "bg-black/40 border-gray-850 text-gray-500 opacity-50";
                  }
                }

                return (
                  <button
                    key={idx}
                    disabled={selectedOption !== null}
                    onClick={() => handleDiagnose(idx)}
                    className={`p-3.5 sm:p-4 rounded-xl border text-left font-sans text-xs sm:text-sm font-semibold transition flex items-center justify-between gap-3 cursor-pointer ${btnStyle}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-white/10 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span>{opt}</span>
                    </div>
                    {selectedOption !== null && isCorrect && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                    {selectedOption !== null && isSelected && !isCorrect && (
                      <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {gameState === "victory" && (
        <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center min-h-[460px] bg-gradient-to-b from-black via-[#111111] to-black">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center text-4xl shadow-[0_0_25px_rgba(6,182,212,0.5)] mb-4">
            🏆
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider mb-1 font-display">
            {isBn ? "ট্রায়াজ শিফট সম্পন্ন!" : "ER SHIFT COMPLETE!"}
          </h2>
          <p className="text-xs text-gray-400 font-mono mb-6">
            {courseName} • Emergency Triage Duty
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg w-full mb-6 font-mono text-center">
            <div className="bg-black/60 p-3.5 rounded-xl border border-white/10">
              <span className="text-gray-500 block text-[10px] uppercase">Score</span>
              <span className="text-lg font-black text-[#FFD700]">{score}</span>
            </div>
            <div className="bg-black/60 p-3.5 rounded-xl border border-white/10">
              <span className="text-gray-500 block text-[10px] uppercase">Patients Treated</span>
              <span className="text-lg font-bold text-cyan-400">{patientsTreated}/{totalPatients}</span>
            </div>
            <div className="bg-black/60 p-3.5 rounded-xl border border-white/10">
              <span className="text-gray-500 block text-[10px] uppercase">Accuracy</span>
              <span className="text-lg font-bold text-emerald-400">
                {correctCount + wrongCount > 0
                  ? Math.round((correctCount / (correctCount + wrongCount)) * 100)
                  : 0}
                %
              </span>
            </div>
            <div className="bg-black/60 p-3.5 rounded-xl border border-white/10">
              <span className="text-gray-500 block text-[10px] uppercase">Status</span>
              <span className="text-lg font-bold text-[#FFD700]">
                {correctCount >= 3 ? "CERTIFIED" : "REVIEW NEEDED"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={startGame}
              className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isBn ? "আবার খেলুন" : "Play Again"}</span>
            </button>
            <button
              onClick={finalizeSession}
              className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg transition cursor-pointer flex items-center gap-2"
            >
              <span>{isBn ? "রিওয়ার্ড সংগ্রহ করুন" : "Claim Rewards"}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
