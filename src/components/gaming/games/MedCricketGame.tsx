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
  Zap,
  Target,
  Volume2,
  VolumeX,
  Award,
  TrendingUp
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface MedCricketGameProps {
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

export default function MedCricketGame({
  questions,
  language,
  courseName,
  onFinishGame,
  onExit,
}: MedCricketGameProps) {
  const isBn = language === "bn";
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<"intro" | "playing" | "victory">("intro");
  const [currentBall, setCurrentBall] = useState(1);
  const [totalBalls] = useState(12); // 2 Overs
  const [runs, setRuns] = useState(0);
  const [wickets, setWickets] = useState(0);
  const [targetRuns] = useState(48);
  const [ballDeliveryTimer, setBallDeliveryTimer] = useState(12);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [lastShotCommentary, setLastShotCommentary] = useState<string | null>(null);
  const [shotType, setShotType] = useState<"six" | "four" | "out" | "dot" | null>(null);
  const [shotDistance, setShotDistance] = useState<number>(0);
  const [bowlerSpeed, setBowlerSpeed] = useState<number>(145);
  const [streakCount, setStreakCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Stats
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [timelineBalls, setTimelineBalls] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState<{ question: Question; userChoice: number }[]>([]);

  const activeQuestion = questions[(currentBall - 1) % questions.length] || questions[0];

  // Canvas Animation State
  const animRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const ballPosRef = useRef({ x: 400, y: 120, z: 0, vx: 0, vy: 0, vz: 0, active: false, type: "normal" });
  const bowlerFrameRef = useRef({ runProgress: 0, isBowling: false });
  const batsmanFrameRef = useRef({ swing: 0, angle: 0 });
  const stumpsRef = useRef({ leftAngle: 0, midAngle: 0, rightAngle: 0, bailsY: 0, hit: false });

  // 1. Game Delivery Timer
  useEffect(() => {
    if (gameState !== "playing") return;

    const timer = setInterval(() => {
      setBallDeliveryTimer((prev) => {
        if (prev <= 1) {
          handleDeliveryTimeout();
          return 12;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, currentBall]);

  // 2. Continuous Canvas 60FPS Game Loop
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

    // Initial positioning
    const pitchCenter = width / 2;
    const bowlerY = 90;
    const batsmanY = 250;

    let frameCount = 0;

    const render = () => {
      frameCount++;
      ctx.clearRect(0, 0, width, height);

      // --- A. STADIUM BACKGROUND & NIGHT SKY ---
      const skyGradient = ctx.createLinearGradient(0, 0, 0, height);
      skyGradient.addColorStop(0, "#060B18");
      skyGradient.addColorStop(0.35, "#0A1730");
      skyGradient.addColorStop(0.36, "#142F19");
      skyGradient.addColorStop(1, "#0A1F10");
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, width, height);

      // --- B. STADIUM FLOODLIGHTS & FLARES ---
      const drawFloodlight = (x: number, y: number) => {
        ctx.save();
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();

        // Glow cone
        const glow = ctx.createRadialGradient(x, y, 2, x, y, 120);
        glow.addColorStop(0, "rgba(255, 255, 220, 0.35)");
        glow.addColorStop(0.5, "rgba(255, 255, 200, 0.08)");
        glow.addColorStop(1, "rgba(255, 255, 200, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.moveTo(x - 80, height);
        ctx.lineTo(x, y);
        ctx.lineTo(x + 80, height);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      };
      drawFloodlight(width * 0.15, 30);
      drawFloodlight(width * 0.85, 30);

      // --- C. STADIUM CROWD STANDS ---
      ctx.save();
      ctx.fillStyle = "#0C1E3A";
      ctx.fillRect(0, 50, width, 55);
      // Cheering crowd dots
      for (let i = 0; i < width; i += 12) {
        const bounce = Math.sin(frameCount * 0.15 + i) * 3;
        ctx.fillStyle = i % 24 === 0 ? "#C1121F" : i % 36 === 0 ? "#FFD700" : "#2563EB";
        ctx.beginPath();
        ctx.arc(i + 6, 85 + bounce, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // --- D. CRICKET PITCH (3D PERSPECTIVE) ---
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(pitchCenter - 70, bowlerY);
      ctx.lineTo(pitchCenter + 70, bowlerY);
      ctx.lineTo(pitchCenter + 120, batsmanY + 40);
      ctx.lineTo(pitchCenter - 120, batsmanY + 40);
      ctx.closePath();
      const pitchGrad = ctx.createLinearGradient(0, bowlerY, 0, batsmanY);
      pitchGrad.addColorStop(0, "#8B7355");
      pitchGrad.addColorStop(0.5, "#B89770");
      pitchGrad.addColorStop(1, "#9E7B50");
      ctx.fillStyle = pitchGrad;
      ctx.fill();

      // Pitch Crease Markings (White Lines)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      ctx.lineWidth = 2.5;

      // Bowling Crease (Top)
      ctx.beginPath();
      ctx.moveTo(pitchCenter - 55, bowlerY + 15);
      ctx.lineTo(pitchCenter + 55, bowlerY + 15);
      ctx.stroke();

      // Batsman Popping Crease (Bottom)
      ctx.beginPath();
      ctx.moveTo(pitchCenter - 100, batsmanY + 10);
      ctx.lineTo(pitchCenter + 100, batsmanY + 10);
      ctx.stroke();

      // Return Creases
      ctx.lineWidth = 1.5;
      ctx.strokeRect(pitchCenter - 45, batsmanY - 5, 90, 25);
      ctx.restore();

      // --- E. WOODEN STUMPS & BAILS ---
      ctx.save();
      const sY = batsmanY - 10;
      const sH = 32;
      ctx.fillStyle = "#E5A93C";
      ctx.strokeStyle = "#8B5A1A";
      ctx.lineWidth = 1;

      // Left Stump
      ctx.save();
      ctx.translate(pitchCenter - 10, sY + sH);
      ctx.rotate(stumpsRef.current.leftAngle);
      ctx.fillRect(-2, -sH, 4, sH);
      ctx.restore();

      // Middle Stump
      ctx.save();
      ctx.translate(pitchCenter, sY + sH);
      ctx.rotate(stumpsRef.current.midAngle);
      ctx.fillRect(-2, -sH, 4, sH);
      ctx.restore();

      // Right Stump
      ctx.save();
      ctx.translate(pitchCenter + 10, sY + sH);
      ctx.rotate(stumpsRef.current.rightAngle);
      ctx.fillRect(-2, -sH, 4, sH);
      ctx.restore();

      // Bails on top
      if (!stumpsRef.current.hit) {
        ctx.fillStyle = "#FFD700";
        ctx.fillRect(pitchCenter - 12, sY - 3, 24, 3);
      } else {
        // Flying bails
        ctx.fillStyle = "#FFD700";
        ctx.fillRect(pitchCenter - 15, sY - 3 - stumpsRef.current.bailsY, 12, 3);
        ctx.fillRect(pitchCenter + 5, sY - 3 - stumpsRef.current.bailsY * 1.2, 12, 3);
        if (stumpsRef.current.bailsY < 40) stumpsRef.current.bailsY += 2;
      }
      ctx.restore();

      // --- F. ANIMATED BOWLER (RUN-UP & DELIVERY) ---
      ctx.save();
      const runCycle = Math.sin(frameCount * 0.3) * 6;
      const bX = pitchCenter - 30 + Math.sin(frameCount * 0.1) * 5;
      const bY = bowlerY - 10;

      // Bowler Body (Medical Jersey)
      ctx.fillStyle = "#1E40AF"; // Blue Jersey
      ctx.beginPath();
      ctx.arc(bX, bY - 15, 7, 0, Math.PI * 2); // Head
      ctx.fill();
      ctx.fillStyle = "#3B82F6";
      ctx.fillRect(bX - 6, bY - 8, 12, 18); // Torso

      // Bowler Windmill Arm
      const armAngle = frameCount * 0.2;
      ctx.strokeStyle = "#FDE047";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(bX, bY - 4);
      ctx.lineTo(bX + Math.cos(armAngle) * 14, bY - 4 + Math.sin(armAngle) * 14);
      ctx.stroke();
      ctx.restore();

      // --- G. ANIMATED BATSMAN WITH DYNAMIC SWING ---
      ctx.save();
      const batX = pitchCenter + 30;
      const batY = batsmanY;

      // Shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.beginPath();
      ctx.ellipse(batX, batY + 28, 16, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Helmet & Face
      ctx.fillStyle = "#C1121F"; // Red Medical Helmet
      ctx.beginPath();
      ctx.arc(batX, batY - 10, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#FFD700"; // Visor
      ctx.fillRect(batX - 8, batY - 9, 7, 4);

      // Jersey (Dhaka Medical Style)
      ctx.fillStyle = "#C1121F";
      ctx.fillRect(batX - 8, batY, 16, 20);

      // White Pads & Legs
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(batX - 7, batY + 18, 6, 15);
      ctx.fillRect(batX + 1, batY + 18, 6, 15);

      // English Willow Cricket Bat with dynamic stroke swing
      const swingProg = batsmanFrameRef.current.swing;
      ctx.save();
      ctx.translate(batX - 5, batY + 8);
      ctx.rotate(batsmanFrameRef.current.angle + Math.sin(frameCount * 0.08) * 0.1);
      ctx.fillStyle = "#E0A96D";
      ctx.strokeStyle = "#8B4513";
      ctx.lineWidth = 1.5;
      ctx.fillRect(-3, -28, 6, 28);
      ctx.strokeRect(-3, -28, 6, 28);
      // Colored grip
      ctx.fillStyle = "#FFD700";
      ctx.fillRect(-2, 0, 4, 10);
      ctx.restore();
      ctx.restore();

      // --- H. BALL TRAJECTORY & FIRE TRAILS ---
      const ball = ballPosRef.current;
      if (ball.active) {
        ball.x += ball.vx;
        ball.y += ball.vy;
        ball.z += ball.vz;

        // Particle trail
        particlesRef.current.push({
          x: ball.x,
          y: ball.y,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          color: ball.type === "six" ? "#FFD700" : ball.type === "four" ? "#3B82F6" : "#EF4444",
          size: Math.random() * 4 + 2,
          alpha: 1,
          life: 20
        });

        // Draw Leather Ball
        ctx.save();
        ctx.fillStyle = "#C1121F";
        ctx.beginPath();
        const ballSize = Math.max(3, 7 - ball.z * 0.05);
        ctx.arc(ball.x, ball.y, ballSize, 0, Math.PI * 2);
        ctx.fill();
        // White Seam
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ballSize, 0, Math.PI);
        ctx.stroke();
        ctx.restore();
      }

      // --- I. PARTICLES & FIREWORKS BURST ---
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

      // --- J. SPEED RADAR & SHOT METRICS OVERLAY ---
      ctx.save();
      ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 1;
      ctx.roundRect(16, 16, 140, 50, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#94A3B8";
      ctx.font = "bold 9px monospace";
      ctx.fillText("BOWLER SPEED GUN", 24, 32);
      ctx.fillStyle = "#F59E0B";
      ctx.font = "black 14px monospace";
      ctx.fillText(`${bowlerSpeed} KM/H FAST`, 24, 52);

      if (shotDistance > 0) {
        ctx.roundRect(width - 156, 16, 140, 50, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#94A3B8";
        ctx.font = "bold 9px monospace";
        ctx.fillText("SHOT DISTANCE", width - 146, 32);
        ctx.fillStyle = "#10B981";
        ctx.font = "black 14px monospace";
        ctx.fillText(`${shotDistance} METERS 🚀`, width - 146, 52);
      }
      ctx.restore();

      animRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [bowlerSpeed, shotDistance]);

  const startGame = () => {
    if (soundEnabled) playSound("click");
    setGameState("playing");
    setCurrentBall(1);
    setRuns(0);
    setWickets(0);
    setCorrectCount(0);
    setWrongCount(0);
    setStreakCount(0);
    setTimelineBalls([]);
    setMistakes([]);
    setSelectedOption(null);
    setLastShotCommentary(null);
    setShotType(null);
    setShotDistance(0);
    setBallDeliveryTimer(12);

    // Reset physics
    stumpsRef.current = { leftAngle: 0, midAngle: 0, rightAngle: 0, bailsY: 0, hit: false };
    batsmanFrameRef.current = { swing: 0, angle: 0 };
  };

  const handleDeliveryTimeout = () => {
    if (soundEnabled) playSound("incorrect");
    triggerWicketAnimation("CLEAN BOWLED! 💥 TIMED OUT (0 Runs)");
  };

  const triggerShotAnimation = (type: "six" | "four", dist: number, text: string) => {
    setShotType(type);
    setShotDistance(dist);
    setLastShotCommentary(text);

    // Batsman swing animation
    batsmanFrameRef.current = { swing: 1, angle: -1.2 };

    // Launch Ball to stands or boundary
    const canvas = canvasRef.current;
    const pCenter = (canvas?.width || 800) / 2;

    if (type === "six") {
      ballPosRef.current = {
        x: pCenter + 25,
        y: 240,
        z: 0,
        vx: (Math.random() - 0.5) * 8,
        vy: -9,
        vz: 1.5,
        active: true,
        type: "six"
      };
      // Explosion particles in the crowd
      for (let i = 0; i < 45; i++) {
        particlesRef.current.push({
          x: pCenter + (Math.random() - 0.5) * 200,
          y: 60,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8,
          color: ["#FFD700", "#C1121F", "#3B82F6", "#10B981"][Math.floor(Math.random() * 4)],
          size: Math.random() * 6 + 2,
          alpha: 1,
          life: 40
        });
      }
    } else {
      ballPosRef.current = {
        x: pCenter + 25,
        y: 240,
        z: 0,
        vx: 8,
        vy: -3,
        vz: 0.2,
        active: true,
        type: "four"
      };
    }
  };

  const triggerWicketAnimation = (commentary: string) => {
    setShotType("out");
    setShotDistance(0);
    setLastShotCommentary(commentary);
    setWickets((w) => w + 1);
    setWrongCount((prev) => prev + 1);
    setStreakCount(0);
    setTimelineBalls((prev) => [...prev, "W"]);

    // Stumps scatter
    stumpsRef.current = {
      leftAngle: -0.4,
      midAngle: 0.1,
      rightAngle: 0.5,
      bailsY: 10,
      hit: true
    };

    // Stumps spark burst
    const canvas = canvasRef.current;
    const pCenter = (canvas?.width || 800) / 2;
    for (let i = 0; i < 30; i++) {
      particlesRef.current.push({
        x: pCenter,
        y: 240,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        color: "#F59E0B",
        size: Math.random() * 4 + 2,
        alpha: 1,
        life: 25
      });
    }

    setMistakes((prev) => [...prev, { question: activeQuestion, userChoice: -1 }]);

    setTimeout(() => {
      advanceBall();
    }, 1500);
  };

  const handleAnswer = (idx: number) => {
    if (selectedOption !== null || gameState !== "playing") return;

    setSelectedOption(idx);
    const isCorrect = idx === activeQuestion.correctAnswerIndex;

    // Random bowler speed between 138 - 152 km/h
    setBowlerSpeed(Math.floor(Math.random() * 15) + 138);

    if (isCorrect) {
      if (soundEnabled) playSound("correct");
      const nextStreak = streakCount + 1;
      setStreakCount(nextStreak);

      const isMonsterSix = Math.random() > 0.4 || nextStreak >= 2;
      if (isMonsterSix) {
        const dist = Math.floor(Math.random() * 25) + 102;
        const shotNotes = [
          `🚀 MONSTER SIX! (${dist}m) BALL SENT OUT OF THE GALLERY! (+6 Runs)`,
          `⚡ HELICOPTER SHOT! (${dist}m) MAXIMUM OVER DEEP MID-WICKET! (+6 Runs)`,
          `🔥 COLOSSAL HIT! (${dist}m) ROOF-TOP SIX INTO THE NIGHT SKY! (+6 Runs)`
        ];
        const note = shotNotes[Math.floor(Math.random() * shotNotes.length)];
        triggerShotAnimation("six", dist, note);
        setRuns((r) => r + 6);
        setTimelineBalls((prev) => [...prev, "6"]);
      } else {
        const dist = Math.floor(Math.random() * 15) + 75;
        const shotNotes = [
          `💥 BULLET COVER DRIVE! PIERCES THE FIELD FOR FOUR! (+4 Runs)`,
          `⚡ CRISP PULL SHOT! RACES TO THE BOUNDARY ROPE! (+4 Runs)`
        ];
        const note = shotNotes[Math.floor(Math.random() * shotNotes.length)];
        triggerShotAnimation("four", dist, note);
        setRuns((r) => r + 4);
        setTimelineBalls((prev) => [...prev, "4"]);
      }

      setCorrectCount((prev) => prev + 1);
    } else {
      if (soundEnabled) playSound("incorrect");
      const outNotes = [
        "CAUGHT IN THE DEEP! ❌ FIELDER TAKES A BRILLIANT DIVE! (0 Runs)",
        "CLEAN BOWLED! 💥 OFF-STUMP CARTWHEELING! (0 Runs)",
        "EDGED AND TAKEN! 🧤 WICKETKEEPER GRABS A BLINDER! (0 Runs)"
      ];
      const note = outNotes[Math.floor(Math.random() * outNotes.length)];
      triggerWicketAnimation(note);
    }

    setTimeout(() => {
      advanceBall();
    }, 1500);
  };

  const advanceBall = () => {
    setSelectedOption(null);
    ballPosRef.current.active = false;
    stumpsRef.current = { leftAngle: 0, midAngle: 0, rightAngle: 0, bailsY: 0, hit: false };
    batsmanFrameRef.current = { swing: 0, angle: 0 };

    if (currentBall >= totalBalls || wickets >= 3) {
      endGame();
    } else {
      setCurrentBall((b) => b + 1);
      setBallDeliveryTimer(12);
    }
  };

  const endGame = () => {
    if (soundEnabled) playSound("levelup");
    setGameState("victory");
  };

  const finalizeSession = () => {
    const totalQ = correctCount + wrongCount;
    const accuracy = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;
    const scoreVal = runs * 30;
    const xp = Math.round(scoreVal * 1.6);
    const coins = Math.round(scoreVal * 0.45);

    const result: GameScoreResult = {
      gameId: "med-cricket",
      gameTitle: "MedCricket: Super Six Biology Cup",
      score: scoreVal,
      correctAnswers: correctCount,
      wrongAnswers: wrongCount,
      totalQuestions: totalQ,
      accuracy,
      xpEarned: xp,
      coinsEarned: coins,
      timeSpentSeconds: currentBall * 9,
      comboMax: correctCount,
      mistakes,
    };

    onFinishGame(result);
  };

  return (
    <div className="w-full bg-[#050C17] border border-blue-500/30 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(37,99,235,0.2)] relative font-sans text-white">
      {/* 1. TV Broadcast Match Header */}
      <div className="bg-gradient-to-r from-[#071328] via-[#0C1E3D] to-[#071328] border-b border-white/10 p-3 sm:p-4 flex items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-gray-300 rounded-xl transition text-[11px] font-bold cursor-pointer"
          >
            ✕ {isBn ? "প্রস্থান" : "Exit"}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl animate-bounce">🏏</span>
            <div className="hidden sm:block">
              <span className="font-black text-white uppercase tracking-wider block text-xs">
                MEDCRICKET SUPER SIX CUP 2027
              </span>
              <span className="text-[10px] text-blue-300">Live Medical Quiz Chase</span>
            </div>
          </div>
        </div>

        {/* Live Scorecard Metrics */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="bg-black/60 px-3 py-1.5 rounded-xl border border-blue-500/40 flex items-baseline gap-1.5 shadow-inner">
            <span className="text-[10px] text-gray-400 font-bold uppercase">SCORE:</span>
            <span className="text-base font-black text-yellow-400">{runs}/{wickets}</span>
            <span className="text-[10px] text-gray-400">
              ({Math.floor((currentBall - 1) / 6)}.{(currentBall - 1) % 6} ov)
            </span>
          </div>

          <div className="bg-amber-950/40 px-2.5 py-1.5 rounded-xl border border-amber-500/40 flex items-center gap-1.5 text-amber-400">
            <Clock className="w-3.5 h-3.5 animate-spin" />
            <span className="font-bold">{ballDeliveryTimer}s</span>
          </div>

          <div className="hidden md:flex items-center gap-1 bg-black/40 px-2.5 py-1.5 rounded-xl border border-white/10">
            <span className="text-[10px] text-gray-400 uppercase">TARGET:</span>
            <span className="font-black text-xs text-emerald-400">{targetRuns} Runs</span>
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
        <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center min-h-[500px] bg-gradient-to-b from-[#0B1A35] via-black to-black relative">
          <div className="w-28 h-28 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-amber-500 flex items-center justify-center text-6xl shadow-[0_0_40px_rgba(37,99,235,0.6)] mb-6 animate-pulse">
            🏏
          </div>

          <span className="px-3.5 py-1 bg-red-950/60 border border-red-500/40 text-red-300 text-[11px] font-mono font-black uppercase rounded-full tracking-wider mb-3">
            🔥 HIGH-OCTANE CRICKET ARCADE
          </span>

          <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-wider mb-2 font-display">
            {isBn ? "মেড-ক্রিকেট: সুপার সিক্স চেজ" : "MedCricket: Super Six Chase"}
          </h2>

          <p className="text-sm text-gray-300 max-w-lg mb-8 leading-relaxed">
            {isBn
              ? "১২ বলে ৪৮ রানের টার্গেট তাড়া করো! প্রতি বলে বোলার বল ডেলিভারি করার আগেই দ্রুত সঠিক মেডিকেল উত্তর বেছে নিয়ে বিশাল ছক্কা ও চার হাঁকাও।"
              : "Chase 48 runs in 12 deliveries! Pick the right clinical diagnosis before the delivery clock expires to smash monster maximums!"}
          </p>

          <div className="grid grid-cols-3 gap-3 max-w-md w-full mb-8 font-mono text-xs">
            <div className="bg-black/60 p-3 rounded-xl border border-white/10">
              <span className="text-gray-400 block text-[10px] uppercase">Target</span>
              <span className="text-base font-bold text-yellow-400">48 Runs</span>
            </div>
            <div className="bg-black/60 p-3 rounded-xl border border-white/10">
              <span className="text-gray-400 block text-[10px] uppercase">Overs</span>
              <span className="text-base font-bold text-blue-400">2.0 (12 Balls)</span>
            </div>
            <div className="bg-black/60 p-3 rounded-xl border border-white/10">
              <span className="text-gray-400 block text-[10px] uppercase">Wickets</span>
              <span className="text-base font-bold text-red-400">3 Allowed</span>
            </div>
          </div>

          <button
            onClick={startGame}
            className="px-10 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-600 hover:from-blue-500 hover:to-amber-500 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-[0_0_30px_rgba(37,99,235,0.7)] transition transform hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-3"
          >
            <Sparkles className="w-5 h-5 text-yellow-300 animate-spin" />
            <span>{isBn ? "ব্যাটিং স্ট্রাইকে যান" : "TAKE STRIKE & PLAY"}</span>
          </button>
        </div>
      )}

      {/* 3. Main Gameplay Arena */}
      {gameState === "playing" && (
        <div className="p-4 sm:p-6 space-y-4">
          
          {/* A. 2D Interactive Stadium Canvas */}
          <div className="w-full h-80 rounded-2xl overflow-hidden border border-blue-500/30 relative bg-black shadow-2xl">
            <canvas ref={canvasRef} className="w-full h-full block" />

            {/* Over-by-Over Timeline Dots Overlay */}
            <div className="absolute bottom-3 left-3 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2 font-mono text-[11px]">
              <span className="text-gray-400 uppercase text-[9px] font-bold">This Over:</span>
              <div className="flex items-center gap-1">
                {Array.from({ length: 6 }).map((_, bIdx) => {
                  const val = timelineBalls[bIdx];
                  let bg = "bg-white/10 text-gray-500";
                  if (val === "6") bg = "bg-yellow-500 text-black font-bold";
                  if (val === "4") bg = "bg-blue-500 text-white font-bold";
                  if (val === "W") bg = "bg-red-600 text-white font-bold";

                  return (
                    <span
                      key={bIdx}
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${bg}`}
                    >
                      {val || "•"}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Live Stadium Commentary Banner */}
            <div className="absolute top-3 inset-x-3 text-center pointer-events-none">
              {lastShotCommentary ? (
                <motion.div
                  key={lastShotCommentary}
                  initial={{ scale: 0.8, y: -10, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  className="inline-block bg-black/85 backdrop-blur-md border border-yellow-500/50 px-4 py-1.5 rounded-full shadow-[0_0_20px_rgba(255,215,0,0.5)]"
                >
                  <span className="text-xs sm:text-sm font-black text-yellow-400 font-mono">
                    {lastShotCommentary}
                  </span>
                </motion.div>
              ) : (
                <div className="inline-block bg-black/60 px-3 py-1 rounded-full border border-white/10 text-[11px] text-gray-300 font-mono animate-pulse">
                  ⚡ 148 km/h Express Delivery Incoming! Pick your medical shot now!
                </div>
              )}
            </div>
          </div>

          {/* B. MCQ Shot Selector (4 Cricket Shots mapped to 4 Options) */}
          <div className="bg-black/60 border border-white/10 rounded-2xl p-4 sm:p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3 font-mono text-xs">
              <span className="text-blue-400 font-bold uppercase flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-red-500" />
                {activeQuestion.subject} • {activeQuestion.chapter || "Medical Syllabus"}
              </span>
              <span className="text-yellow-400 font-bold">
                Ball #{currentBall} of {totalBalls}
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-white leading-relaxed">
              {activeQuestion.questionText}
            </h3>

            {/* 4 Interactive Shot Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {activeQuestion.options.map((opt, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrect = idx === activeQuestion.correctAnswerIndex;
                const shotLabels = [
                  "Cover Drive (Off Side)",
                  "Lofted Straight Six",
                  "Mid-Wicket Pull Shot",
                  "Fine Leg Scoop"
                ];

                let btnStyle = "bg-black/70 border-white/10 text-gray-200 hover:border-blue-500/50 hover:bg-blue-950/30";

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
                    onClick={() => handleAnswer(idx)}
                    className={`p-3.5 sm:p-4 rounded-xl border text-left font-sans text-xs sm:text-sm font-semibold transition flex flex-col justify-between gap-2 cursor-pointer relative overflow-hidden group ${btnStyle}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-wider">
                        Shot #{idx + 1}: {shotLabels[idx]}
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

      {/* 4. Match Concluded / Victory Screen */}
      {gameState === "victory" && (
        <div className="p-8 sm:p-12 text-center flex flex-col items-center justify-center min-h-[500px] bg-gradient-to-b from-black via-[#0E1A33] to-black">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-red-500 flex items-center justify-center text-5xl shadow-[0_0_35px_rgba(245,158,11,0.6)] mb-4 animate-bounce">
            🏆
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-wider mb-1 font-display">
            {runs >= targetRuns ? (isBn ? "অসাধারণ ম্যাচ জয়!" : "MATCH WON IN STYLE!") : (isBn ? "ইনিংস সমাপ্ত" : "INNINGS CONCLUDED")}
          </h2>

          <p className="text-xs text-blue-300 font-mono mb-8">
            {courseName} • MedCricket Biology T20 Championship
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg w-full mb-8 font-mono text-center">
            <div className="bg-black/70 p-4 rounded-2xl border border-white/10">
              <span className="text-gray-400 block text-[10px] uppercase">Final Score</span>
              <span className="text-xl font-black text-yellow-400">{runs}/{wickets}</span>
            </div>
            <div className="bg-black/70 p-4 rounded-2xl border border-white/10">
              <span className="text-gray-400 block text-[10px] uppercase">Boundaries</span>
              <span className="text-xl font-bold text-emerald-400">{correctCount}</span>
            </div>
            <div className="bg-black/70 p-4 rounded-2xl border border-white/10">
              <span className="text-gray-400 block text-[10px] uppercase">Strike Rate</span>
              <span className="text-xl font-bold text-cyan-400">
                {currentBall > 1 ? Math.round((runs / (currentBall - 1)) * 100) : 0}
              </span>
            </div>
            <div className="bg-black/70 p-4 rounded-2xl border border-white/10">
              <span className="text-gray-400 block text-[10px] uppercase">Match Result</span>
              <span className={`text-xl font-bold ${runs >= targetRuns ? "text-emerald-400" : "text-amber-400"}`}>
                {runs >= targetRuns ? "CHASED" : "DEFENDED"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={startGame}
              className="px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{isBn ? "আবার খেলুন" : "Play Another Match"}</span>
            </button>
            <button
              onClick={finalizeSession}
              className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-mono text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg transition cursor-pointer flex items-center gap-2"
            >
              <span>{isBn ? "রিওয়ার্ড সংগ্রহ করুন" : "Claim Match Rewards"}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
