import React, { useState, useEffect } from "react";
import { Trophy, Flame, Search, Loader2 } from "lucide-react";
import { collection, query, orderBy, limit, getDocs } from "../../lib/supabaseDb";
import { db, isFirestoreQuotaExceeded, setFirestoreQuotaExhausted, isQuotaExceededError } from "../../lib/backend";

interface GamingLeaderboardProps {
  courseId: string;
  courseName: string;
  currentUserId?: string;
  language: "bn" | "en";
}

interface GameRanker {
  id: string;
  name: string;
  avatar?: string;
  gameXp: number;
  coins: number;
  gamesWon: number;
  streak: number;
  badge: string;
  rank: number;
  isCurrentUser?: boolean;
}

export default function GamingLeaderboard({
  courseId,
  courseName,
  currentUserId,
  language,
}: GamingLeaderboardProps) {
  const isBn = language === "bn";
  const [filterPeriod, setFilterPeriod] = useState<"weekly" | "allTime">("weekly");
  const [searchQuery, setSearchQuery] = useState("");
  const [rankers, setRankers] = useState<GameRanker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check session cache first
    try {
      const cached = sessionStorage.getItem("mb_gaming_leaderboard_cache");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRankers(parsed);
          setLoading(false);
          if (isFirestoreQuotaExceeded()) return;
        }
      }
    } catch {}

    if (isFirestoreQuotaExceeded()) {
      setLoading(false);
      return;
    }

    setLoading(true);
    // Fetch users with limit(30) to reduce quota usage
    const q = query(collection(db, "users"), orderBy("xp", "desc"), limit(30));
    getDocs(q)
      .then((snapshot) => {
        const list: GameRanker[] = [];
        const seenIds = new Set<string>();
        let rIndex = 1;
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const docId = docSnap.id || data.uid;
          if (!docId || seenIds.has(docId)) return;
          seenIds.add(docId);
          const userXp = data.xp || 0;
          const userCoins = data.coins || 0;
          const userStreak = data.dailyStreak || 1;
          const userSolved = data.questionsSolved || 0;
          const userCorrect = data.questionsCorrect || 0;
          const name = data.displayName || data.email?.split("@")[0] || `Student #${rIndex}`;
          
          let badge = "🌱 Freshman Medic";
          if (userXp >= 10000) badge = "👑 Grandmaster Medic";
          else if (userXp >= 5000) badge = "⚡ Synapse Overdrive";
          else if (userXp >= 2500) badge = "🛡️ Elite Gladiator";
          else if (userXp >= 1000) badge = "🔥 Rising Medic";

          list.push({
            id: docSnap.id,
            name,
            avatar: data.photoURL || undefined,
            gameXp: userXp,
            coins: userCoins,
            gamesWon: Math.floor(userCorrect / 5),
            streak: userStreak,
            badge,
            rank: rIndex,
            isCurrentUser: docSnap.id === currentUserId || data.uid === currentUserId,
          });
          rIndex++;
        });
        setRankers(list);
        try {
          sessionStorage.setItem("mb_gaming_leaderboard_cache", JSON.stringify(list));
        } catch {}
      })
      .catch((err) => {
        if (isQuotaExceededError(err)) {
          setFirestoreQuotaExhausted();
        }
        console.warn("Gaming leaderboard error:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [currentUserId]);

  const filteredRankers = rankers.filter((r) => {
    if (!searchQuery.trim()) return true;
    return (r.name || "").toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="bg-[#0A0E17] border border-white/10 rounded-3xl p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#FFD700]" />
            <h3 className="text-lg font-black text-white uppercase tracking-wider font-display">
              {isBn ? "ব্যাচ গেমিং লিডারবোর্ড" : "Batch Gaming Leaderboard"}
            </h3>
          </div>
          <p className="text-xs text-gray-400 font-mono mt-0.5">
            {courseName} • Real-time Batch Game XP Rankings
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 bg-black/60 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setFilterPeriod("weekly")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
              filterPeriod === "weekly"
                ? "bg-[#FFD700] text-black shadow-md"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {isBn ? "এই সপ্তাহের" : "Weekly"}
          </button>
          <button
            onClick={() => setFilterPeriod("allTime")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
              filterPeriod === "allTime"
                ? "bg-[#FFD700] text-black shadow-md"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {isBn ? "সর্বকালীন" : "All-Time"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3 text-gray-400 font-mono text-xs">
          <Loader2 className="w-6 h-6 animate-spin text-[#FFD700]" />
          <span>{isBn ? "লিডারবোর্ড তথ্য লোড হচ্ছে..." : "Loading real-time rankings..."}</span>
        </div>
      ) : rankers.length === 0 ? (
        <div className="py-12 text-center text-gray-500 font-mono text-xs">
          {isBn ? "এখনও কোনো গেমিং রেকর্ড নেই। প্রথম অংশগ্রহণকারী হয়ে র‍্যাংক অর্জন করুন!" : "No active players yet. Play a game to claim #1 rank!"}
        </div>
      ) : (
        <>
          {/* Top 3 Podium Cards */}
          {rankers.length >= 3 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-2">
              {rankers.slice(0, 3).map((ranker, idx) => {
                const podiumStyles = [
                  { bg: "from-amber-950/80 to-black", border: "border-[#FFD700]/50", crown: "👑 1st", color: "text-[#FFD700]" },
                  { bg: "from-slate-900 to-black", border: "border-slate-400/40", crown: "🥈 2nd", color: "text-slate-300" },
                  { bg: "from-amber-950/40 to-black", border: "border-amber-700/40", crown: "🥉 3rd", color: "text-amber-500" },
                ][idx];

                return (
                  <div
                    key={`${ranker.id}_podium_${idx}`}
                    className={`p-4 rounded-2xl bg-gradient-to-b ${podiumStyles.bg} border ${podiumStyles.border} relative overflow-hidden flex flex-col justify-between`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-black font-mono px-2 py-0.5 rounded-md bg-black/60 ${podiumStyles.color}`}>
                        {podiumStyles.crown}
                      </span>
                      <span className="text-[10px] font-mono text-gray-400">{ranker.badge}</span>
                    </div>

                    <div className="my-3 text-center">
                      <div className="w-12 h-12 mx-auto rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-xl font-bold text-white mb-2 shadow-md overflow-hidden">
                        {ranker.avatar ? (
                          <img src={ranker.avatar} alt={ranker.name} className="w-full h-full object-cover" />
                        ) : (
                          ranker.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-white truncate">{ranker.name}</h4>
                      <div className="flex items-center justify-center gap-1.5 mt-1 text-xs font-mono">
                        <Flame className="w-3.5 h-3.5 text-orange-400" />
                        <span className="text-orange-300 font-bold">{ranker.streak}d streak</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs font-mono">
                      <span className="text-gray-400">XP</span>
                      <span className="font-black text-emerald-400">+{ranker.gameXp} XP</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Search Filter */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isBn ? "শিক্ষার্থীর নাম অনুসন্ধান করুন..." : "Search student candidate..."}
              className="w-full bg-black/60 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          {/* Rank List Table */}
          <div className="space-y-2">
            {filteredRankers.map((ranker, rIdx) => (
              <div
                key={`${ranker.id}_${ranker.rank || rIdx}`}
                className={`p-3 sm:p-3.5 rounded-2xl border flex items-center justify-between gap-3 font-mono transition ${
                  ranker.isCurrentUser
                    ? "bg-amber-950/40 border-[#FFD700]/50 shadow-[0_0_15px_rgba(255,215,0,0.15)]"
                    : "bg-black/40 border-white/5 hover:border-white/20"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-7 text-center font-black text-sm ${ranker.rank <= 3 ? "text-[#FFD700]" : "text-gray-500"}`}>
                    #{ranker.rank}
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-sm font-bold text-white shrink-0 overflow-hidden">
                    {ranker.avatar ? (
                      <img src={ranker.avatar} alt={ranker.name} className="w-full h-full object-cover" />
                    ) : (
                      ranker.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white truncate">{ranker.name}</span>
                      {ranker.isCurrentUser && (
                        <span className="px-1.5 py-0.2 text-[9px] font-bold bg-[#FFD700] text-black rounded">
                          YOU
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 block truncate">{ranker.badge}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-6 text-right shrink-0">
                  <div className="hidden sm:block">
                    <span className="text-[10px] text-gray-500 block">WINS</span>
                    <span className="text-xs font-bold text-white">{ranker.gamesWon}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block">GAME XP</span>
                    <span className="text-xs font-black text-[#FFD700]">+{ranker.gameXp}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
