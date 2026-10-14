import React, { useState, useEffect, useRef } from "react";
import { Question } from "../../../types";
import { GameScoreResult } from "../gamingData";
import { playSound } from "../../../audio";
import {
  Sparkles,
  RotateCcw,
  ChevronRight,
  Clock,
  Trophy,
  Flame,
  CheckCircle2,
  XCircle,
  Target,
  Volume2,
  VolumeX,
  Zap
} from "lucide-react";
import { motion } from "motion/react";

interface MedSoccerGameProps {
  questions: Question[];
  language: "bn" | "en";
  courseName: string;
  onFinishGame: (result: GameScoreResult) => void;
  onExit: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
}

export default function MedSoccerGame({
  questions,
  language,
  courseName,
  onFinishGame,
  onExit,
}: MedSoccerGameProps) {
  const isBn = language === "bn";
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<"intro" | "playing" | "victory">("intro");
  const [penaltyRound, setPenaltyRound] = useState(1);
  const [totalPenalties] = useState(5);
  const [goals, setGoals] = useState(0);
  const [misses, setMisses] = useState(0);
  const [roundTimer, setRoundTimer] = useState(12);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [shotCommentary, setShotCommentary] = useState<string | null>(null);
  const [shotVelocity, setShotVelocity] = useState<number>(112);
  const [shootoutLog, setShootoutLog] = useState<("goal" | "miss")[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Stats
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [mistakes, setMistakes] = useState<{ question: Question; userChoice: number }[]>([]);

  const activeQuestion = questions[(penaltyRound - 1) % questions.length] || questions[0];

  // Canvas Animation State
  const animRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const ballRef = useRef({ x: 400, y: 260, z: 0, vx: 0, vy: 0, vz: 0, active: false, hitGoal: false, curve: 0 });
  const keeperRef = useRef({ x: 400, y: 130, targetX: 400, targetY: 130, diving: false, diveSide: "center" });
  const strikerRef = useRef({ kickProg: 0, angle: 0 });
  const netBulgeRef = useRef({ power: 0, x: 400, y: 110 });

  // 1. Timer
  useEffect(() => {
    if (gameState !== "playing") return;

    const timer = setInterval(() => {
      setRoundTimer((prev) => {
        if (prev <= 1) {
          handleTimeOutShot();
          return 12;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, penaltyRound]);

  // 2. 60FPS Perspective Stadium Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 800);
    let height = (canvas.height = 320);

    const resize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth || 800;
      height = canvas.height = 320;
    };
    window.addEventListener("resize", resize);

    const goalCenter = width / 2;
    const goalTop = 60;
    const goalBottom = 150;
    const goalWidth = 240;

    let frameCount = 0;

    const render = () => {
      frameCount++;
      ctx.clearRect(0, 0, width, height);

      // --- A. STADIUM NIGHT SKY & FLOODLIGHTS ---
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, "#05111E");
      skyGrad.addColorStop(0.35, "#0A2035");
      skyGrad.addColorStop(0.36, "#133C1B");
      skyGrad.addColorStop(1, "#0B2610");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // Stadium Stands with Roaring Fans
      ctx.fillStyle = "#0A182E";
      ctx.fillRect(0, 40, width, 40);
      for (let i = 0; i < width; i += 14) {
        const bounce = Math.sin(frameCount * 0.2 + i) * 3;
        ctx.fillStyle = i % 28 === 0 ? "#10B981" : i % 42 === 0 ? "#FFD700" : "#C1121F";
        ctx.beginPath();
        ctx.arc(i + 7, 65 + bounce, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Floodlights
      const drawFloodlight = (fx: number, fy: number) => {
        ctx.save();
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(fx, fy, 5, 0, Math.PI * 2);
        ctx.fill();

        const lightGlow = ctx.createRadialGradient(fx, fy, 2, fx, fy, 130);
        lightGlow.addColorStop(0, "rgba(255, 255, 240, 0.4)");
        lightGlow.addColorStop(0.6, "rgba(255, 255, 200, 0.08)");
        lightGlow.addColorStop(1, "rgba(255, 255, 200, 0)");
        ctx.fillStyle = lightGlow;
        ctx.beginPath();
        ctx.moveTo(fx - 90, height);
        ctx.lineTo(fx, fy);
        ctx.lineTo(fx + 90, height);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      };
      drawFloodlight(width * 0.12, 25);
      drawFloodlight(width * 0.88, 25);

      // --- B. GREEN STRIPED PITCH TURF & PENALTY BOX ARC ---
      ctx.save();
      const pitchGrad = ctx.createLinearGradient(0, goalBottom, 0, height);
      pitchGrad.addColorStop(0, "#195B24");
      pitchGrad.addColorStop(1, "#0E3F17");
      ctx.fillStyle = pitchGrad;
      ctx.fillRect(0, goalBottom, width, height - goalBottom);

      // Mowed Grass Stripes
      ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
      for (let y = goalBottom; y < height; y += 30) {
        ctx.fillRect(0, y, width, 15);
      }

      // Penalty Box Markings (White Lines)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
      ctx.lineWidth = 2.5;

      // Goal Line
      ctx.beginPath();
      ctx.moveTo(goalCenter - 180, goalBottom);
      ctx.lineTo(goalCenter + 180, goalBottom);
      ctx.stroke();

      // 6-Yard Box
      ctx.strokeRect(goalCenter - 140, goalBottom, 280, 45);

      // Penalty Spot
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(goalCenter, 260, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Penalty Arc
      ctx.beginPath();
      ctx.arc(goalCenter, 260, 40, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      ctx.restore();

      // --- C. 3D PERSPECTIVE GOALPOST & RESPONSIVE NET ---
      ctx.save();
      const gLeft = goalCenter - goalWidth / 2;
      const gRight = goalCenter + goalWidth / 2;

      // Net Mesh Grid
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = 1;
      const netBulge = netBulgeRef.current;
      const bPower = netBulge.power;

      for (let gx = gLeft; gx <= gRight; gx += 16) {
        ctx.beginPath();
        const distToBulge = Math.abs(gx - netBulge.x);
        const bOff = distToBulge < 50 ? (50 - distToBulge) * 0.2 * bPower : 0;
        ctx.moveTo(gx, goalTop);
        ctx.lineTo(gx, goalBottom + bOff);
        ctx.stroke();
      }
      for (let gy = goalTop; gy <= goalBottom; gy += 14) {
        ctx.beginPath();
        ctx.moveTo(gLeft, gy);
        ctx.lineTo(gRight, gy);
        ctx.stroke();
      }

      // White Goalposts & Crossbar
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
      ctx.shadowBlur = 6;

      // Left Post, Crossbar, Right Post
      ctx.beginPath();
      ctx.moveTo(gLeft, goalBottom);
      ctx.lineTo(gLeft, goalTop);
      ctx.lineTo(gRight, goalTop);
      ctx.lineTo(gRight, goalBottom);
      ctx.stroke();
      ctx.restore();

      // --- D. ANIMATED GOALKEEPER (DIVING & JUMPING) ---
      ctx.save();
      const kp = keeperRef.current;
      // Smooth movement towards target dive position
      kp.x += (kp.targetX - kp.x) * 0.15;
      kp.y += (kp.targetY - kp.y) * 0.15;

      const idleSway = !kp.diving ? Math.sin(frameCount * 0.1) * 6 : 0;
      const kX = kp.x + idleSway;
      const kY = kp.y;

      // Keeper Body (Neon Yellow Kit)
      ctx.fillStyle = "#EAB308";
      ctx.beginPath();
      ctx.arc(kX, kY - 20, 8, 0, Math.PI * 2); // Head
      ctx.fill();

      // Torso & Goalkeeper Gloves
      ctx.fillStyle = "#CA8A04";
      ctx.fillRect(kX - 8, kY - 12, 16, 22);

      // Gloves (Neon Orange)
      ctx.fillStyle = "#F97316";
      if (kp.diving) {
        // Extended dive arms
        ctx.fillRect(kX - 18, kY - 22, 8, 8);
        ctx.fillRect(kX + 10, kY - 22, 8, 8);
      } else {
        // Ready stance gloves
        ctx.fillRect(kX - 14, kY - 6, 6, 6);
        ctx.fillRect(kX + 8, kY - 6, 6, 6);
      }
      ctx.restore();

      // --- E. ANIMATED STRIKER RUN-UP & KICK ---
      ctx.save();
      const sX = goalCenter - 35;
      const sY = 270;

      // Striker Shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
      ctx.beginPath();
      ctx.ellipse(sX, sY + 16, 14, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Striker (Red Dhaka Medical Kit)
      ctx.fillStyle = "#C1121F";
      ctx.beginPath();
      ctx.arc(sX, sY - 18, 8, 0, Math.PI * 2); // Head
      ctx.fill();
      ctx.fillRect(sX - 7, sY - 10, 14, 18); // Torso

      // Legs
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(sX - 6, sY + 8, 5, 12);
      ctx.fillRect(sX + 1, sY + 8, 5, 12);
      ctx.restore();

      // --- F. SOCCER BALL PHYSICS & FLAME TRAILS ---
      const ball = ballRef.current;
      if (ball.active) {
        ball.x += ball.vx;
        ball.y += ball.vy;
        ball.z += ball.vz;
        ball.vx += ball.curve; // Magnus curve effect

        // Net bulge collision check
        if (ball.y <= goalBottom && ball.x >= gLeft && ball.x <= gRight && !ball.hitGoal) {
          ball.hitGoal = true;
          netBulgeRef.current = { power: 10, x: ball.x, y: ball.y };
        }

        // Particle spark trail
        particlesRef.current.push({
          x: ball.x,
          y: ball.y,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          color: ball.hitGoal ? "#10B981" : "#FFD700",
          size: Math.random() * 4 + 2,
          alpha: 1,
          life: 20
        });

        // Draw Soccer Ball with Pentagons
        ctx.save();
        const ballSize = Math.max(4, 9 - ball.z * 0.06);
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ballSize, 0, Math.PI * 2);
        ctx.fill();

        // Black Patches
        ctx.fillStyle = "#111827";
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ballSize * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (selectedOption === null) {
        // Stationary Ball on Spot
        ctx.save();
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(goalCenter, 260, 7.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#111827";
        ctx.beginPath();
        ctx.arc(goalCenter, 260, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // --- G. PARTICLES / CONFETTI STORM ---
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 1 / p.life;

        if (p.alpha <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // --- H. VELOCITY RADAR HUD ---
      ctx.save();
      ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 1;
      ctx.roundRect(16, 16, 140, 50, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#94A3B8";
      ctx.font = "bold 9px monospace";
      ctx.fillText("SHOT RADAR SPEED", 24, 32);
      ctx.fillStyle = "#10B981";
      ctx.font = "black 14px monospace";
      ctx.fillText(`${shotVelocity} KM/H 🚀`, 24, 52);
      ctx.restore();

      animRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [shotVelocity]);

  const startGame = () => {
    if (soundEnabled) playSound("click");
    setGameState("playing");
    setPenaltyRound(1);
    setGoals(0);
    setMisses(0);
    setCorrectCount(0);
    setWrongCount(0);
    setShootoutLog([]);
    setMistakes([]);
    setSelectedOption(null);
    setShotCommentary(null);
    setRoundTimer(12);

    ballRef.current = { x: 400, y: 260, z: 0, vx: 0, vy: 0, vz: 0, active: false, hitGoal: false, curve: 0 };
    keeperRef.current = { x: 400, y: 130, targetX: 400, targetY: 130, diving: false, diveSide: "center" };
  };

  const handleTimeOutShot = () => {
    if (soundEnabled) playSound("incorrect");
    setShotCommentary("SHOT TIMED OUT! 🧤 SAVED BY KEEPER! (0 Goals)");
    setMisses((m) => m + 1);
    setWrongCount((prev) => prev + 1);
    setShootoutLog((prev) => [...prev, "miss"]);
    setMistakes((prev) => [...prev, { question: activeQuestion, userChoice: -1 }]);
    advanceRound();
  };

  const handleShoot = (idx: number) => {
    if (selectedOption !== null || gameState !== "playing") return;

    setSelectedOption(idx);
    const isCorrect = idx === activeQuestion.correctAnswerIndex;

    const speed = Math.floor(Math.random() * 18) + 105;
    setShotVelocity(speed);

    const canvas = canvasRef.current;
    const gCenter = (canvas?.width || 800) / 2;

    // Shot placement targets based on choice
    const targets = [
      { x: gCenter - 95, y: 80, name: "TOP-LEFT TOP BINS", curve: -0.15 },
      { x: gCenter + 95, y: 80, name: "TOP-RIGHT TOP BINS", curve: 0.15 },
      { x: gCenter - 85, y: 135, name: "BOTTOM-LEFT BULLET", curve: -0.05 },
      { x: gCenter + 85, y: 135, name: "BOTTOM-RIGHT CURLER", curve: 0.05 },
    ];
    const chosenTarget = targets[idx % 4];

    if (isCorrect) {
      if (soundEnabled) playSound("correct");
      // Goalkeeper dives the wrong way!
      const wrongSides = [gCenter + 80, gCenter - 80, gCenter];
      const keeperTargetX = chosenTarget.x > gCenter ? gCenter - 80 : gCenter + 80;

      keeperRef.current = {
        x: gCenter,
        y: 130,
        targetX: keeperTargetX,
        targetY: 120,
        diving: true,
        diveSide: "dive"
      };

      // Launch Ball to Top Bins!
      ballRef.current = {
        x: gCenter,
        y: 260,
        z: 0,
        vx: (chosenTarget.x - gCenter) / 18,
        vy: -9,
        vz: 1.2,
        active: true,
        hitGoal: false,
        curve: chosenTarget.curve
      };

      // Confetti burst in stadium
      for (let i = 0; i < 40; i++) {
        particlesRef.current.push({
          x: chosenTarget.x,
          y: chosenTarget.y,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8,
          color: ["#10B981", "#FFD700", "#3B82F6", "#EC4899"][Math.floor(Math.random() * 4)],
          size: Math.random() * 6 + 2,
          alpha: 1,
          life: 40
        });
      }

      setShotCommentary(`GOOOOAAAL! ⚽ ${chosenTarget.name}! (${speed} KM/H ROCKET!)`);
      setGoals((g) => g + 1);
      setCorrectCount((prev) => prev + 1);
      setShootoutLog((prev) => [...prev, "goal"]);
    } else {
      if (soundEnabled) playSound("incorrect");
      // Keeper makes acrobatic save!
      keeperRef.current = {
        x: gCenter,
        y: 130,
        targetX: chosenTarget.x,
        targetY: chosenTarget.y + 10,
        diving: true,
        diveSide: "save"
      };

      ballRef.current = {
        x: gCenter,
        y: 260,
        z: 0,
        vx: (chosenTarget.x - gCenter) / 18,
        vy: -8,
        vz: 1.0,
        active: true,
        hitGoal: false,
        curve: 0
      };

      setShotCommentary("SAVED! 🧤 GOALKEEPER PULLS OFF A FINGERTIP SAVE! (0 Goals)");
      setMisses((m) => m + 1);
      setWrongCount((prev) => prev + 1);
      setShootoutLog((prev) => [...prev, "miss"]);
      setMistakes((prev) => [...prev, { question: activeQuestion, userChoice: idx }]);
    }

    setTimeout(() => {
      advanceRound();
    }, 1500);
  };

  const advanceRound = () => {
    setSelectedOption(null);
    ballRef.current.active = false;
    keeperRef.current.diving = false;

    if (penaltyRound >= totalPenalties) {
      endGame();
    } else {
      setPenaltyRound((r) => r + 1);
      setRoundTimer(12);
    }
  };

  const endGame = () => {
    if (soundEnabled) playSound("levelup");
    setGameState("victory");
  };

  const finalizeSession = () => {
    const totalQ = correctCount + wrongCount;
    const accuracy = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;
    const scoreVal = goals * 150;
    const xp = Math.round(scoreVal * 1.5);
    const coins = Math.round(scoreVal * 0.4);

    const result: GameScoreResult = {
      gameId: "med-soccer",
      gameTitle: "MedSoccer: Penalty Shootout Anatomy Cup",
      score: scoreVal,
      correctAnswers: correctCount,
      wrongAnswers: wrongCount,
      totalQuestions: totalQ,
      accuracy,
      xpEarned: xp,
      coinsEarned: coins,
      timeSpentSeconds: penaltyRound * 10,
      comboMax: correctCount,
      mistakes,
    };

    onFinishGame(result);
  };

  return (
    <div className="w-full bg-[#05110B] border border-emerald-500/30 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.2)] relative font-sans text-white">
      {/* 1. Top Penalty Match Header */}
      <div className="bg-gradient-to-r from-[#06180E] via-[#0D2818] to-[#06180E] border-b border-white/10 p-3 sm:p-4 flex items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-gray-300 rounded-xl transition text-[11px] font-bold cursor-pointer"
          >
            ✕ {isBn ? "প্রস্থান" : "Exit"}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl animate-bounce">⚽</span>
            <div className="hidden sm:block">
              <span className="font-black text-white uppercase tracking-wider block text-xs">
                MEDSOCCER PENALTY CUP 2027
              </span>
              <span className="text-[10px] text-emerald-400">Precision Clinical Shootout</span>
            </div>
          </div>
        </div>

        {/* Shootout Score & Round */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="bg-black/60 px-3 py-1.5 rounded-xl border border-emerald-500/40 flex items-center gap-2">
            <span className="text-[10px] text-gray-400 font-bold uppercase">SCORE:</span>
            <span className="text-base font-black text-emerald-400">{goals} / {totalPenalties}</span>
          </div>

          <div className="bg-amber-950/40 px-2.5 py-1.5 rounded-xl border border-amber-500/40 flex items-center gap-1.5 text-amber-400">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-bold">{roundTimer}s</span>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. Intro Screen */}
      {gameState === "intro" && (
        <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center min-h-[500px] bg-gradient-to-b from-[#0A2414] via-black to-black relative">
          <div className="w-28 h-28 rounded-3xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-yellow-500 flex items-center justify-center text-6xl shadow-[0_0_40px_rgba(16,185,129,0.6)] mb-6 animate-pulse">
            ⚽
          </div>

          <span className="px-3.5 py-1 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-[11px] font-mono font-black uppercase rounded-full tracking-wider mb-3">
            🎯 ULTIMATE PENALTY SHOOTOUT
          </span>

          <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-wider mb-2 font-display">
            {isBn ? "মেড-সকার: পেনাল্টি শুটআউট" : "MedSoccer: Penalty Shootout"}
          </h2>

          <p className="text-sm text-gray-300 max-w-lg mb-8 leading-relaxed">
            {isBn
              ? "৫টি পেনাল্টি শুটআউট রাউন্ড! গোলরক্ষককে ফাঁকি দিয়ে টপ কর্নার ও সাইড-নেটে বুলেট গোল করতে দ্রুত সঠিক মেডিকেল উত্তরের কর্নার বেছে নিন।"
              : "5 high-stakes penalty kicks! Pick the correct clinical answer before time expires to launch a top-bins rocket past the keeper!"}
          </p>

          <div className="grid grid-cols-3 gap-3 max-w-md w-full mb-8 font-mono text-xs">
            <div className="bg-black/60 p-3 rounded-xl border border-white/10">
              <span className="text-gray-400 block text-[10px] uppercase">Penalties</span>
              <span className="text-base font-bold text-emerald-400">5 Rounds</span>
            </div>
            <div className="bg-black/60 p-3 rounded-xl border border-white/10">
              <span className="text-gray-400 block text-[10px] uppercase">Goal Target</span>
              <span className="text-base font-bold text-yellow-400">3+ Goals</span>
            </div>
            <div className="bg-black/60 p-3 rounded-xl border border-white/10">
              <span className="text-gray-400 block text-[10px] uppercase">Speed</span>
              <span className="text-base font-bold text-cyan-400">110+ KM/H</span>
            </div>
          </div>

          <button
            onClick={startGame}
            className="px-10 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-yellow-600 hover:from-emerald-500 hover:to-yellow-500 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.7)] transition transform hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-3"
          >
            <Sparkles className="w-5 h-5 text-yellow-300" />
            <span>{isBn ? "পেনাল্টি কিক শুরু করুন" : "STEP UP TO PENALTY SPOT"}</span>
          </button>
        </div>
      )}

      {/* 3. Main Gameplay Screen */}
      {gameState === "playing" && (
        <div className="p-4 sm:p-6 space-y-4">
          
          {/* A. 2D Interactive Stadium Canvas */}
          <div className="w-full h-80 rounded-2xl overflow-hidden border border-emerald-500/30 relative bg-black shadow-2xl">
            <canvas ref={canvasRef} className="w-full h-full block" />

            {/* Shootout Dot Indicators */}
            <div className="absolute bottom-3 left-3 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2 font-mono text-[11px]">
              <span className="text-gray-400 uppercase text-[9px] font-bold">Penalties:</span>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: totalPenalties }).map((_, pIdx) => {
                  const log = shootoutLog[pIdx];
                  let dotStyle = "bg-white/20 text-gray-500";
                  if (log === "goal") dotStyle = "bg-emerald-500 text-black";
                  if (log === "miss") dotStyle = "bg-red-600 text-white";

                  return (
                    <span
                      key={pIdx}
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${dotStyle}`}
                    >
                      {log === "goal" ? "✓" : log === "miss" ? "✕" : pIdx + 1}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Commentary Banner */}
            <div className="absolute top-3 inset-x-3 text-center pointer-events-none">
              {shotCommentary ? (
                <motion.div
                  key={shotCommentary}
                  initial={{ scale: 0.8, y: -10, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  className="inline-block bg-black/85 backdrop-blur-md border border-emerald-500/50 px-4 py-1.5 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.5)]"
                >
                  <span className="text-xs sm:text-sm font-black text-emerald-400 font-mono">
                    {shotCommentary}
                  </span>
                </motion.div>
              ) : (
                <div className="inline-block bg-black/60 px-3 py-1 rounded-full border border-white/10 text-[11px] text-gray-300 font-mono animate-pulse">
                  ⚡ Goalkeeper locked on goal line! Choose your corner to strike!
                </div>
              )}
            </div>
          </div>

          {/* B. MCQ Shot Placement (4 Corner Targets) */}
          <div className="bg-black/60 border border-white/10 rounded-2xl p-4 sm:p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3 font-mono text-xs">
              <span className="text-emerald-400 font-bold uppercase flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-red-500" />
                {activeQuestion.subject} • {activeQuestion.chapter || "Clinical Anatomy"}
              </span>
              <span className="text-yellow-400 font-bold">
                Penalty #{penaltyRound} of {totalPenalties}
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-white leading-relaxed">
              {activeQuestion.questionText}
            </h3>

            {/* 4 Corner Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {activeQuestion.options.map((opt, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrect = idx === activeQuestion.correctAnswerIndex;
                const cornerNames = [
                  "🎯 Top-Left Corner (Top Bins)",
                  "🎯 Top-Right Corner (Top Bins)",
                  "⚡ Bottom-Left Precision Strike",
                  "⚡ Bottom-Right Curler"
                ];

                let btnStyle = "bg-black/70 border-white/10 text-gray-200 hover:border-emerald-500/50 hover:bg-emerald-950/30";

                if (selectedOption !== null) {
                  if (isCorrect) {
                    btnStyle = "bg-emerald-950/80 border-emerald-500 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.5)]";
                  } else if (isSelected) {
                    btnStyle = "bg-red-950/80 border-red-500 text-red-200";
                  } else {
                    btnStyle = "bg-black/40 border-gray-900 text-gray-600 opacity-40";
                  }
                }

                return (
                  <button
                    key={idx}
                    disabled={selectedOption !== null}
                    onClick={() => handleShoot(idx)}
                    className={`p-3.5 sm:p-4 rounded-xl border text-left font-sans text-xs sm:text-sm font-semibold transition flex flex-col justify-between gap-2 cursor-pointer relative overflow-hidden group ${btnStyle}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                        Zone {String.fromCharCode(65 + idx)}: {cornerNames[idx]}
                      </span>
                      {selectedOption !== null && isCorrect && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                      {selectedOption !== null && isSelected && !isCorrect && (
                        <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-white/10 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="flex-1">{opt}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* 4. Victory / Summary Screen */}
      {gameState === "victory" && (
        <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center min-h-[500px] bg-gradient-to-b from-black via-[#0B2416] to-black">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-yellow-500 flex items-center justify-center text-5xl shadow-[0_0_35px_rgba(16,185,129,0.6)] mb-4 animate-bounce">
            🏆
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-wider mb-1 font-display">
            {goals >= 3 ? (isBn ? "চ্যাম্পিয়ন শুটআউট জয়!" : "CHAMPION PENALTY VICTORY!") : (isBn ? "শুটআউট সমাপ্ত" : "SHOOTOUT FINISHED")}
          </h2>

          <p className="text-xs text-emerald-300 font-mono mb-8">
            {courseName} • MedSoccer Anatomy Cup
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg w-full mb-8 font-mono text-center">
            <div className="bg-black/70 p-4 rounded-2xl border border-white/10">
              <span className="text-gray-400 block text-[10px] uppercase">Goals Scored</span>
              <span className="text-xl font-black text-emerald-400">{goals} / {totalPenalties}</span>
            </div>
            <div className="bg-black/70 p-4 rounded-2xl border border-white/10">
              <span className="text-gray-400 block text-[10px] uppercase">Accuracy</span>
              <span className="text-xl font-bold text-yellow-400">
                {Math.round((goals / totalPenalties) * 100)}%
              </span>
            </div>
            <div className="bg-black/70 p-4 rounded-2xl border border-white/10">
              <span className="text-gray-400 block text-[10px] uppercase">Top Velocity</span>
              <span className="text-xl font-bold text-cyan-400">{shotVelocity} KM/H</span>
            </div>
            <div className="bg-black/70 p-4 rounded-2xl border border-white/10">
              <span className="text-gray-400 block text-[10px] uppercase">Result</span>
              <span className={`text-xl font-bold ${goals >= 3 ? "text-emerald-400" : "text-amber-400"}`}>
                {goals >= 3 ? "WON" : "PLAYED"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={startGame}
              className="px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{isBn ? "আবার খেলুন" : "Play Again"}</span>
            </button>
            <button
              onClick={finalizeSession}
              className="px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-mono text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg transition cursor-pointer flex items-center gap-2"
            >
              <span>{isBn ? "রিওয়ার্ড সংগ্রহ করুন" : "Claim Shootout Rewards"}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
