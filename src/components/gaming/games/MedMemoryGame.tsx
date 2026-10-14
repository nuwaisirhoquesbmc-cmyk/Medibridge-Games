import React, { useState, useEffect } from "react";
import { Question } from "../../../types";
import { GameScoreResult } from "../gamingData";
import { playSound } from "../../../audio";
import {
  Sparkles,
  RotateCcw,
  ChevronRight,
  Clock,
  CheckCircle2,
  HelpCircle,
  Layers,
} from "lucide-react";
import { motion } from "motion/react";

interface MedMemoryGameProps {
  questions: Question[];
  language: "bn" | "en";
  courseName: string;
  onFinishGame: (result: GameScoreResult) => void;
  onExit: () => void;
}

interface MemoryCard {
  id: number;
  pairId: number;
  label: string;
  subtitle: string;
  icon: string;
  isFlipped: boolean;
  isMatched: boolean;
}

export default function MedMemoryGame({
  questions,
  language,
  courseName,
  onFinishGame,
  onExit,
}: MedMemoryGameProps) {
  const isBn = language === "bn";
  const [gameState, setGameState] = useState<"intro" | "playing" | "victory">("intro");
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [flippedCardIds, setFlippedCardIds] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [matchesFound, setMatchesFound] = useState(0);
  const [totalPairs, setTotalPairs] = useState(6);
  const [timeRemaining, setTimeRemaining] = useState(90);

  // Card pairs bank for medical matching
  const cardPairBank = [
    { pairId: 1, icon: "🫀", a: "Cardiovascular System", b: "SA Node (Pacemaker)", subA: "Organ", subB: "Electrical Origin" },
    { pairId: 2, icon: "🫁", a: "Respiratory System", b: "Alveoli (Gas Exchange)", subA: "Organ", subB: "Functional Unit" },
    { pairId: 3, icon: "🧠", a: "Nervous System", b: "Neuron & Synapse", subA: "Control", subB: "Structural Unit" },
    { pairId: 4, icon: "💊", a: "Paracetamol", b: "Acetaminophen (Antipyretic)", subA: "Brand Name", subB: "Generic & Class" },
    { pairId: 5, icon: "🩸", a: "Erythrocytes (RBC)", b: "Hemoglobin O2 Transport", subA: "Blood Cell", subB: "Core Function" },
    { pairId: 6, icon: "🧪", a: "Insulin", b: "Beta Cells of Pancreas", subA: "Hormone", subB: "Secretion Origin" },
  ];

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
    setScore(0);
    setMoves(0);
    setMatchesFound(0);
    setTimeRemaining(90);
    setFlippedCardIds([]);

    // Generate 6 pairs (12 cards) shuffled
    const selectedPairs = cardPairBank.slice(0, 6);
    const deck: MemoryCard[] = [];

    selectedPairs.forEach((pair, idx) => {
      deck.push({
        id: idx * 2,
        pairId: pair.pairId,
        label: pair.a,
        subtitle: pair.subA,
        icon: pair.icon,
        isFlipped: false,
        isMatched: false,
      });
      deck.push({
        id: idx * 2 + 1,
        pairId: pair.pairId,
        label: pair.b,
        subtitle: pair.subB,
        icon: pair.icon,
        isFlipped: false,
        isMatched: false,
      });
    });

    // Shuffle
    deck.sort(() => Math.random() - 0.5);
    setCards(deck);
  };

  const handleCardClick = (cardId: number) => {
    if (flippedCardIds.length >= 2) return;
    const clickedCard = cards.find((c) => c.id === cardId);
    if (!clickedCard || clickedCard.isFlipped || clickedCard.isMatched) return;

    playSound("click");
    const newFlipped = [...flippedCardIds, cardId];
    setFlippedCardIds(newFlipped);

    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, isFlipped: true } : c))
    );

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);
      const firstCard = cards.find((c) => c.id === newFlipped[0]);
      const secondCard = clickedCard;

      if (firstCard && firstCard.pairId === secondCard.pairId) {
        // Match!
        setTimeout(() => {
          playSound("correct");
          setCards((prev) =>
            prev.map((c) =>
              c.pairId === firstCard.pairId ? { ...c, isMatched: true } : c
            )
          );
          setMatchesFound((m) => {
            const next = m + 1;
            if (next >= totalPairs) {
              setTimeout(() => endGame(), 600);
            }
            return next;
          });
          setScore((s) => s + 200);
          setFlippedCardIds([]);
        }, 500);
      } else {
        // No match - Flip back
        setTimeout(() => {
          playSound("incorrect");
          setCards((prev) =>
            prev.map((c) =>
              newFlipped.includes(c.id) ? { ...c, isFlipped: false } : c
            )
          );
          setFlippedCardIds([]);
        }, 1000);
      }
    }
  };

  const endGame = () => {
    playSound("levelup");
    setGameState("victory");
  };

  const finalizeSession = () => {
    const accuracy = moves > 0 ? Math.round((matchesFound / moves) * 100) : 0;
    const xp = Math.round(score * 1.2);
    const coins = Math.round(score * 0.35);

    const result: GameScoreResult = {
      gameId: "med-memory",
      gameTitle: "MedMemory: Flip & Match",
      score,
      correctAnswers: matchesFound,
      wrongAnswers: Math.max(0, moves - matchesFound),
      totalQuestions: moves,
      accuracy,
      xpEarned: xp,
      coinsEarned: coins,
      timeSpentSeconds: 90 - timeRemaining,
      comboMax: matchesFound,
      mistakes: [],
    };

    onFinishGame(result);
  };

  return (
    <div className="w-full bg-[#140812] border border-pink-500/20 rounded-3xl overflow-hidden shadow-2xl relative font-sans">
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
            <span className="text-xl">🧠</span>
            <span className="font-bold text-white uppercase hidden sm:inline">
              {isBn ? "মেড-মেমোরি ফ্লিপ ম্যাচ" : "MedMemory Flip & Match"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-6">
          <div className="text-pink-300 font-bold bg-pink-950/40 px-2.5 py-1 rounded-xl border border-pink-500/30">
            🃏 MATCHES: {matchesFound} / {totalPairs}
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
        <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center min-h-[460px] bg-gradient-to-b from-pink-950/30 via-black to-black">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-pink-600 to-rose-600 flex items-center justify-center text-5xl shadow-[0_0_30px_rgba(244,63,94,0.5)] mb-6">
            🧠
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider mb-2 font-display">
            {isBn ? "মেড-মেমোরি: কার্ড ফ্লিপ ম্যাচ" : "MedMemory: Flip & Match"}
          </h2>
          <p className="text-sm text-gray-300 max-w-lg mb-6 leading-relaxed">
            {isBn
              ? "অ্যানাটমি ও ড্রাগের কার্ড ফ্লিপ করে সঠিক জোড়া খুঁজে বের করো। দ্রুততম সময়ে সব জোড়া মিলিয়ে স্মৃতিশক্তি পরীক্ষা করো!"
              : "Flip and match clinical pairs of organs, anatomical units, hormones, and drugs before the clock runs out!"}
          </p>

          <button
            onClick={startGame}
            className="px-8 py-4 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-[0_0_25px_rgba(244,63,94,0.6)] transition cursor-pointer flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isBn ? "মেমোরি গ্রিড শুরু করুন" : "START GRID"}</span>
          </button>
        </div>
      )}

      {gameState === "playing" && (
        <div className="p-4 sm:p-6 space-y-6">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 sm:gap-4 max-w-3xl mx-auto">
            {cards.map((card) => {
              const isVisible = card.isFlipped || card.isMatched;
              return (
                <div
                  key={card.id}
                  onClick={() => handleCardClick(card.id)}
                  className={`h-28 sm:h-32 rounded-2xl border transition-all duration-300 transform cursor-pointer select-none flex flex-col items-center justify-center p-2 text-center ${
                    card.isMatched
                      ? "bg-emerald-950/60 border-emerald-500/80 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                      : isVisible
                      ? "bg-black/90 border-pink-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]"
                      : "bg-black/60 border-white/10 hover:border-white/30 text-gray-500 hover:scale-105"
                  }`}
                >
                  {isVisible ? (
                    <div className="space-y-1">
                      <span className="text-2xl block">{card.icon}</span>
                      <span className="text-[11px] sm:text-xs font-bold font-sans line-clamp-2 leading-tight">
                        {card.label}
                      </span>
                      <span className="text-[9px] font-mono text-gray-400 block">
                        {card.subtitle}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 opacity-60">
                      <Layers className="w-6 h-6 text-pink-400" />
                      <span className="text-[10px] font-mono font-bold text-gray-400">FLIP</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {gameState === "victory" && (
        <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center min-h-[460px] bg-gradient-to-b from-black via-[#111111] to-black">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-pink-500 to-rose-400 flex items-center justify-center text-4xl shadow-[0_0_25px_rgba(244,63,94,0.5)] mb-4">
            🏆
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider mb-1 font-display">
            {isBn ? "মেমোরি গ্রিড সম্পন্ন!" : "MEMORY GRID CLEARED!"}
          </h2>
          <p className="text-xs text-gray-400 font-mono mb-6">
            {courseName} • MedMemory Clinical Pairings
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg w-full mb-6 font-mono text-center">
            <div className="bg-black/60 p-3.5 rounded-xl border border-white/10">
              <span className="text-gray-500 block text-[10px] uppercase">Score</span>
              <span className="text-lg font-black text-[#FFD700]">{score}</span>
            </div>
            <div className="bg-black/60 p-3.5 rounded-xl border border-white/10">
              <span className="text-gray-500 block text-[10px] uppercase">Total Moves</span>
              <span className="text-lg font-bold text-white">{moves}</span>
            </div>
            <div className="bg-black/60 p-3.5 rounded-xl border border-white/10">
              <span className="text-gray-500 block text-[10px] uppercase">Accuracy</span>
              <span className="text-lg font-bold text-emerald-400">
                {moves > 0 ? Math.round((matchesFound / moves) * 100) : 0}%
              </span>
            </div>
            <div className="bg-black/60 p-3.5 rounded-xl border border-white/10">
              <span className="text-gray-500 block text-[10px] uppercase">Pairs Matched</span>
              <span className="text-lg font-bold text-pink-400">{matchesFound}/{totalPairs}</span>
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
              className="px-6 py-3 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-mono text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg transition cursor-pointer flex items-center gap-2"
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
