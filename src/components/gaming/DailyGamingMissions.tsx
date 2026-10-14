import React from "react";
import { CheckCircle2, Circle, Sparkles, Flame, Target, Trophy, Award } from "lucide-react";
import { DailyGamingMission, GameAchievement } from "./gamingData";
import { playSound } from "../../audio";

interface DailyGamingMissionsProps {
  missions: DailyGamingMission[];
  achievements: GameAchievement[];
  language: "bn" | "en";
  onClaimMission: (missionId: string) => void;
  onClaimAchievement: (achievementId: string) => void;
}

export default function DailyGamingMissions({
  missions,
  achievements,
  language,
  onClaimMission,
  onClaimAchievement,
}: DailyGamingMissionsProps) {
  const isBn = language === "bn";

  return (
    <div className="space-y-6">
      {/* Daily Missions Panel */}
      <div className="bg-[#0A0E17] border border-white/10 rounded-3xl p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-black text-white uppercase tracking-wider font-display">
              {isBn ? "দৈনিক গেমিং মিশন" : "Daily Gaming Missions"}
            </h3>
          </div>
          <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2.5 py-1 rounded-xl border border-emerald-500/30">
            {missions.filter((m) => m.completed).length} / {missions.length} COMPLETED
          </span>
        </div>

        <div className="space-y-2.5">
          {missions.map((m) => {
            const isDone = m.currentCount >= m.targetCount;
            return (
              <div
                key={m.id}
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 font-mono transition ${
                  m.completed
                    ? "bg-emerald-950/20 border-emerald-500/30 opacity-75"
                    : isDone
                    ? "bg-amber-950/40 border-[#FFD700]/50 shadow-md"
                    : "bg-black/40 border-white/5"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-sm font-bold text-white shrink-0">
                    {isDone ? "✓" : "🎯"}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">
                      {isBn ? m.titleBn : m.title}
                    </h4>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                      <span>Progress: {m.currentCount} / {m.targetCount}</span>
                      <span>•</span>
                      <span className="text-emerald-400">+{m.rewardXp} XP</span>
                      <span className="text-[#FFD700]">🪙 +{m.rewardCoins}</span>
                    </div>
                  </div>
                </div>

                {isDone && !m.completed ? (
                  <button
                    onClick={() => {
                      playSound("levelup");
                      onClaimMission(m.id);
                    }}
                    className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-mono text-[11px] font-black uppercase tracking-wider rounded-xl shadow-md cursor-pointer hover:scale-105 transition shrink-0"
                  >
                    {isBn ? "ক্লেইম" : "Claim"}
                  </button>
                ) : m.completed ? (
                  <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>CLAIMED</span>
                  </span>
                ) : (
                  <span className="text-[11px] text-gray-500 font-bold shrink-0">
                    {Math.round((m.currentCount / m.targetCount) * 100)}%
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Arena Badges & Achievements */}
      <div className="bg-[#0A0E17] border border-white/10 rounded-3xl p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#FFD700]" />
            <h3 className="text-base font-black text-white uppercase tracking-wider font-display">
              {isBn ? "অ্যারেনা মেডেল ও অর্জন" : "Arena Medals & Badges"}
            </h3>
          </div>
          <span className="text-xs font-mono text-[#FFD700] font-bold">
            {achievements.filter((a) => a.unlocked).length} / {achievements.length} UNLOCKED
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {achievements.map((ach) => (
            <div
              key={ach.id}
              className={`p-3.5 rounded-2xl border flex items-start gap-3 font-mono transition ${
                ach.unlocked
                  ? "bg-amber-950/30 border-[#FFD700]/40 shadow-sm"
                  : "bg-black/40 border-white/5 opacity-70"
              }`}
            >
              <div className="text-3xl shrink-0 p-1.5 bg-black/50 rounded-2xl border border-white/10">
                {ach.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="text-xs font-bold text-white truncate">
                    {isBn ? ach.titleBn : ach.title}
                  </h4>
                  {ach.unlocked && (
                    <span className="text-[9px] font-bold bg-[#FFD700] text-black px-1.5 py-0.2 rounded">
                      UNLOCKED
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5 leading-snug line-clamp-2">
                  {isBn ? ach.descriptionBn : ach.description}
                </p>
                <div className="flex items-center justify-between mt-2 pt-1 border-t border-white/5 text-[10px]">
                  <span className="text-emerald-400">+{ach.rewardXp} XP</span>
                  <span className="text-[#FFD700]">🪙 +{ach.rewardCoins} Coins</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
