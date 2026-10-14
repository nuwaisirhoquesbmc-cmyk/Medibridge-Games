import React, { useState, useEffect, useCallback } from "react";
import { db, handleFirestoreError, OperationType } from "../lib/backend";
import { collection, query, orderBy, limit, getDocs } from "../lib/supabaseDb";
import { UserProfile, COLLEGES, DISTRICTS } from "../types";
import { Trophy, ShieldAlert, Award, Grid, Star, Map as MapIcon, GraduationCap, Pin, Swords, RefreshCw } from "lucide-react";

interface LeaderboardPanelProps {
  currentUser: UserProfile;
  onProfileUpdate: (updates: Partial<UserProfile>) => Promise<void>;
  language?: "bn" | "en";
  theme?: "light" | "dark";
}

type TabType = "individual" | "college" | "district";

export default function LeaderboardPanel({ currentUser, onProfileUpdate, language = "bn", theme = "dark" }: LeaderboardPanelProps) {
  const isDark = theme === "dark";
  const [users, setUsers] = useState<UserProfile[]>(() => {
    try {
      const cached = sessionStorage.getItem("mb_leaderboard_cache");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(users.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("individual");
  const isBn = language === "bn";

  const fetchLeaderboard = useCallback(async () => {
    try {
      const qUsers = query(collection(db, "users"), orderBy("xp", "desc"), limit(30));
      const snapshot = await getDocs(qUsers);
      const loaded: UserProfile[] = [];
      const seenUids = new Set<string>();
      snapshot.forEach((doc) => {
        const data = doc.data() as any;
        const uid = doc.id || data.uid;
        if (uid && !seenUids.has(uid)) {
          seenUids.add(uid);
          loaded.push({
            id: doc.id,
            uid,
            ...data,
          } as any);
        }
      });
      setUsers(loaded);
      try {
        sessionStorage.setItem("mb_leaderboard_cache", JSON.stringify(loaded));
      } catch {}
    } catch (error) {
      console.warn("Could not fetch leaderboard from Firestore, attempting cached fallback:", error);
      try {
        const cached = sessionStorage.getItem("mb_leaderboard_cache");
        if (cached) {
          setUsers(JSON.parse(cached));
        }
      } catch {}
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // If we don't have cached data, fetch once
    if (users.length === 0) {
      fetchLeaderboard();
    } else {
      setLoading(false);
    }
  }, [fetchLeaderboard, users.length]);

  // College Aggregated League XP calculations
  const calculateCollegeLeague = () => {
    const scoresMap: { [college: string]: number } = {};

    // Dynamically expand and group scores based on actual registered user inputs
    users.forEach((u) => {
      if (u.college) {
        const trimmed = u.college.trim();
        if (trimmed && trimmed.toLowerCase() !== "government colleges" && trimmed.toLowerCase() !== "government college" && trimmed.toLowerCase() !== "govt colleges") {
          scoresMap[trimmed] = (scoresMap[trimmed] || 0) + u.xp;
        }
      }
    });

    // Make an array
    const sorted = Object.keys(scoresMap).map((name) => ({
      name,
      totalXp: scoresMap[name],
    }));

    return sorted.sort((a, b) => b.totalXp - a.totalXp);
  };

  // District War XP calculations
  const calculateDistrictWar = () => {
    const scoresMap: { [district: string]: number } = {};
    DISTRICTS.forEach((dist) => {
      scoresMap[dist] = 0;
    });

    users.forEach((u) => {
      if (u.district && scoresMap[u.district] !== undefined) {
        scoresMap[u.district] += u.xp;
      }
    });

    const sorted = Object.keys(scoresMap).map((name) => ({
      name,
      totalXp: scoresMap[name],
    }));

    return sorted.sort((a, b) => b.totalXp - a.totalXp);
  };

  const collegeRanks = calculateCollegeLeague();
  const districtRanks = calculateDistrictWar();

  return (
    <div className="flex flex-col gap-6">
      
      {/* Title & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold uppercase text-white flex items-center gap-3 font-display">
            <Trophy className="w-8 h-8 text-[#FFD700] filter drop-shadow-[0_0_8px_rgba(255,215,0,0.4)]" /> {isBn ? "লীডারবোর্ড এবং স্কোয়াড ওয়ার্স ⚔️" : "LEADERBOARDS & SQUAD WARS"}
          </h2>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-mono">
            {isBn ? "অ্যাপ্রন অর্জনের গৌরবময় লড়াইয়ে দেশজুড়ে প্রতিদ্বন্দ্বিতা করুন" : "Compete nationally to secure your white coat glory"}
          </p>
        </div>

        {/* User's private standing HUD */}
        <div className="bg-[#111111] border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-4">
          <div className="text-3xl">🥼</div>
          <div>
            <span className="text-[10px] text-gray-500 uppercase font-mono block">{isBn ? "আমার জাতীয় প্রোফাইল" : "My National Profile"}</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white font-display">{currentUser.displayName}</span>
              <span className="text-xs text-[#FFD700] font-bold">{isBn ? "লেভেল" : "Lvl"} {currentUser.level}</span>
            </div>
            <span className="text-[10px] text-gray-400 font-mono block">{isBn ? `এক্সপি অর্জন: ${currentUser.xp} মার্কস` : `XP Progress: ${currentUser.xp} Marks`}</span>
          </div>
        </div>
      </div>

      {/* Esports Navigation Tabs */}
      <div className="flex bg-[#0D0D0D] p-1 border border-white/10 rounded-2xl max-w-md">
        <button
          onClick={() => setActiveTab("individual")}
          className={`flex-1 py-2.5 px-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-200 flex items-center justify-center gap-2 font-display cursor-pointer ${
            activeTab === "individual"
              ? "bg-[#C1121F] text-white shadow-lg shadow-[#C1121F]/20"
              : "text-gray-400 hover:text-white"
          }`}
          id="btn-leader-tab-indiv"
        >
          <Award className="w-3.5 h-3.5" /> {isBn ? "জাতীয় র্যাঙ্কিং" : "NATIONAL INDIVIDUAL"}
        </button>
        <button
          onClick={() => setActiveTab("college")}
          className={`flex-1 py-2.5 px-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-200 flex items-center justify-center gap-2 font-display cursor-pointer ${
            activeTab === "college"
              ? "bg-[#C1121F] text-white shadow-lg shadow-[#C1121F]/20"
              : "text-gray-400 hover:text-white"
          }`}
          id="btn-leader-tab-college"
        >
          <GraduationCap className="w-3.5 h-3.5" /> {isBn ? "কলেজ লীগ" : "COLLEGE LEAGUE"}
        </button>
        <button
          onClick={() => setActiveTab("district")}
          className={`flex-1 py-2.5 px-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-200 flex items-center justify-center gap-2 font-display cursor-pointer ${
            activeTab === "district"
              ? "bg-[#C1121F] text-white shadow-lg shadow-[#C1121F]/20"
              : "text-gray-400 hover:text-white"
          }`}
          id="btn-leader-tab-district"
        >
          <MapIcon className="w-3.5 h-3.5" /> {isBn ? "বিভাগীয় যুদ্ধ" : "DIVISION WAR"}
        </button>
      </div>

      {/* Main Ranking Display */}
      {loading ? (
        <div className="text-center py-20 text-gray-500 font-mono">{isBn ? "লীডারবোর্ড তথ্য লোড করা হচ্ছে..." : "Retrieving active leaderboards..."}</div>
      ) : (
        <div className="bg-[#111111] border border-white/10 rounded-3xl overflow-hidden shadow-xl">
          
          {/* INDIVIDUAL RANKINGS */}
          {activeTab === "individual" && (
            <div className="flex flex-col">
              <div className="grid grid-cols-12 bg-[#0D0D0D] p-4 border-b border-white/5 text-[10px] font-mono tracking-widest text-gray-400 font-extrabold uppercase">
                <div className="col-span-1 text-center">{isBn ? "র‌্যাংক" : "RANK"}</div>
                <div className="col-span-7 sm:col-span-5">{isBn ? "মেডিকেল ভর্তি ক্যান্ডিডেট" : "ASPIRANT GLADIATOR"}</div>
                <div className="hidden sm:block sm:col-span-2 text-center">{isBn ? "কলেজ / জেলা" : "COLLEGE / DISTRICT"}</div>
                <div className="col-span-2 text-right">{isBn ? "মোট এক্সপি" : "TOTAL XP"}</div>
                <div className="col-span-2 text-center">{isBn ? "প্রতিদ্বন্দ্বী" : "RIVAL"}</div>
              </div>

              {users.map((item, index) => {
                const isSelf = item.uid === currentUser.uid;
                const isPinned = currentUser.pinnedRivalId === item.uid;
                let rankVisual: React.ReactNode = index + 1;
                if (index === 0) rankVisual = <span className="text-xl sm:text-2xl" title="Crown Leader">🥇</span>;
                if (index === 1) rankVisual = <span className="text-xl sm:text-2xl">🥈</span>;
                if (index === 2) rankVisual = <span className="text-xl sm:text-2xl">🥉</span>;

                let userRankLabel = item.rank || "Freshman";
                if (isBn) {
                  if (userRankLabel === "Freshman" || userRankLabel === "Freshman / Learner") {
                    userRankLabel = "নতুন শিক্ষার্থী ক্যান্ডিডেট";
                  } else if (userRankLabel === "Scholar / Aspirant" || userRankLabel === "Scholar") {
                    userRankLabel = "উচ্চাকাঙ্ক্ষী স্কলার";
                  } else if (userRankLabel === "Medicalian Warrior") {
                    userRankLabel = "মেডিকেলিয়ান যোদ্ধা";
                  } else if (userRankLabel === "Medical Legend") {
                    userRankLabel = "মেডিকেল লিজেন্ড চ্যাম্পিয়ন";
                  }
                }

                return (
                  <div
                    key={`${item.uid || item.id || "ranker"}_${index}`}
                    className={`grid grid-cols-12 items-center p-3 sm:p-4 border-b border-white/5 transition ${
                      isSelf ? "bg-red-950/20 border-l-4 border-[#C1121F] font-bold" : "hover:bg-white/5"
                    }`}
                  >
                    <div className="col-span-1 text-center font-mono font-extrabold text-xs sm:text-sm text-[#FFD700]">
                      {rankVisual}
                    </div>
                    <div className="col-span-7 sm:col-span-5 flex items-center gap-2 sm:gap-3">
                      <img
                        src={item.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.uid}`}
                        alt="Avatar"
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-white/10 bg-black shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-xs font-bold block text-white font-display truncate">
                          {item.displayName} {isSelf && <span className="text-[9px] text-[#C1121F] font-black uppercase font-mono">{isBn ? "(আপনি)" : "(YOU)"}</span>}
                        </span>
                        <span className="text-[9px] sm:text-[10px] text-[#FFD700] uppercase font-mono font-bold leading-none block truncate">
                          {userRankLabel} ({isBn ? "লেভেল" : "Level"} {item.level || 1})
                        </span>
                      </div>
                    </div>
                    <div className="hidden sm:block sm:col-span-2 text-center min-w-0">
                      <span className="text-xs text-gray-300 block truncate font-display">{item.college || (isBn ? "কোন কলেজ নির্দিষ্ট নেই" : "No College Specified")}</span>
                      <span className="text-[9px] text-gray-400 block uppercase font-mono truncate">{item.district || "Dhaka"}</span>
                    </div>
                    <div className="col-span-2 text-right">
                      <span className="text-xs sm:text-sm font-bold text-white block font-mono">{item.xp || 150}</span>
                      <span className="text-[8px] sm:text-[9px] text-[#C1121F] uppercase font-mono leading-none block">
                        {item.questionsSolved || 0} {isBn ? "সমাধান" : "Drills"}
                      </span>
                    </div>
                    <div className="col-span-2 text-center flex items-center justify-center">
                      {isSelf ? (
                        <span className="text-gray-600 font-mono text-xs">-</span>
                      ) : (
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              if (isPinned) {
                                await onProfileUpdate({ pinnedRivalId: null });
                                alert(isBn ? "প্রতিদ্বন্দ্বী তালিকা থেকে বাদ দেওয়া হয়েছে।" : "Rival successfully unpinned!");
                              } else {
                                await onProfileUpdate({ pinnedRivalId: item.uid });
                                alert(isBn ? `${item.displayName}-কে আপনার প্রতিদ্বন্দ্বী হিসেবে সেট করা হয়েছে! সরাসরি আপনার ড্যাশবোর্ডে ট্র্যাক করুন।` : `${item.displayName} is set as your personal rival! Track them directly on your Dashboard.`);
                              }
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                          className={`p-2 rounded-xl border flex items-center justify-center transition-all duration-200 cursor-pointer ${
                            isPinned
                              ? "bg-[#C1121F] text-white border-white/10 hover:bg-red-700 shadow-[0_0_10px_rgba(193,18,31,0.4)]"
                              : isDark
                                ? "bg-black text-[#C1121F] border-white/5 hover:border-[#C1121F]/30 hover:bg-red-950/20"
                                : "bg-slate-50 text-red-600 border-red-100 hover:bg-red-50 hover:text-[#C1121F]"
                          }`}
                          title={isPinned 
                            ? (isBn ? "প্রতিদ্বন্দ্বী পিন পরিবর্তন করুন" : "Unpin Rival") 
                            : (isBn ? "প্রতিদ্বন্দ্বী হিসেবে পিন করুন" : "Pin as Rival")
                          }
                          id={`btn-rival-user-${item.uid}`}
                        >
                          <Swords className={`w-3.5 h-3.5 ${isPinned ? "animate-pulse" : ""}`} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* COLLEGE LEAGUE */}
          {activeTab === "college" && (
            <div className="flex flex-col">
              <div className="grid grid-cols-12 bg-[#0D0D0D] p-4 border-b border-white/5 text-[10px] font-mono tracking-widest text-gray-400 font-extrabold uppercase">
                <div className="col-span-2 text-center">{isBn ? "অবস্থান" : "POSITION"}</div>
                <div className="col-span-7">{isBn ? "সহযোগী কলেজ দলসমূহ" : "SUPPORTED COLLEGE CHAMPION"}</div>
                <div className="col-span-3 text-right">{isBn ? "সঞ্চিত পয়েন্ট এক্সপি" : "ACCUMULATED POINT XP"}</div>
              </div>

              {collegeRanks.map((item, index) => {
                const isUserCollege = currentUser.college === item.name;
                const progressWidth = Math.min(100, Math.max(10, (item.totalXp / (collegeRanks[0].totalXp || 1)) * 100));

                let displayedCollegeName = item.name;
                if (isBn) {
                  if (displayedCollegeName === "Notre Dame College") displayedCollegeName = "নটর ডেম কলেজ ⛪";
                  else if (displayedCollegeName === "Adamjee Cantonment College") displayedCollegeName = "আদমজী ক্যান্টনমেন্ট কলেজ ⚔️";
                  else if (displayedCollegeName === "Rajuk Uttara Model College") displayedCollegeName = "রাজউক উত্তরা মডেল কলেজ 🏰";
                  else if (displayedCollegeName === "Holy Cross College") displayedCollegeName = "হলিক্রস কলেজ ✝️";
                  else if (displayedCollegeName === "Dhaka College") displayedCollegeName = "ঢাকা কলেজ 🎓";
                  else if (displayedCollegeName === "Chittagong College") displayedCollegeName = "চট্টগ্রাম কলেজ ⛰️";
                  else if (displayedCollegeName === "Rajshahi College") displayedCollegeName = "রাজশাহী কলেজ 🏛️";
                  else if (displayedCollegeName === "Sylhet MC College") displayedCollegeName = "সিলেট এমসি কলেজ 🌲";
                  else if (displayedCollegeName === "Barishal BM College") displayedCollegeName = "বরিশাল বিএম কলেজ ⚓";
                  else if (displayedCollegeName === "Comilla Victoria College") displayedCollegeName = "কুমিল্লা ভিক্টোরিয়া কলেজ 💎";
                }

                return (
                  <div
                    key={item.name}
                    className={`grid grid-cols-12 items-center p-5 border-b border-white/5 transition ${
                      isUserCollege ? "bg-red-950/15 border-l-4 border-[#C1121F]" : "hover:bg-white/5"
                    }`}
                  >
                    <div className="col-span-2 text-center font-mono font-extrabold text-[#FFD700] text-sm">
                      {index + 1}
                    </div>
                    <div className="col-span-7 flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white block uppercase tracking-wide font-display">
                          {displayedCollegeName}
                        </span>
                        {isUserCollege && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-red-950 text-[#C1121F] rounded-lg font-mono font-black uppercase">
                            {isBn ? "আমার দল" : "MY TEAM"}
                          </span>
                        )}
                      </div>
                      <div className="w-4/5 bg-black h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#C1121F] h-full"
                          style={{ width: `${progressWidth}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="col-span-3 text-right">
                      <span className="text-sm font-extrabold text-[#FFD700] font-mono block">
                        {item.totalXp} XP
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono block leading-none">
                        {isBn ? "সক্রিয় শিক্ষার্থী" : "Active Crusaders"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* DISTRICT WAR */}
          {activeTab === "district" && (
            <div className="flex flex-col">
              <div className="grid grid-cols-12 bg-[#0D0D0D] p-4 border-b border-white/5 text-[10px] font-mono tracking-widest text-gray-400 font-extrabold uppercase">
                <div className="col-span-2 text-center">{isBn ? "অবস্থান" : "POS"}</div>
                <div className="col-span-7">{isBn ? "বিভাগীয় টেরিটরি সেক্টর" : "REGIONAL DIVISION SECTOR"}</div>
                <div className="col-span-3 text-right">{isBn ? "মোট টেরিটরি পাওয়ার" : "TOTAL TERRITORY POWER"}</div>
              </div>

              {districtRanks.map((item, index) => {
                const isUserDist = currentUser.district === item.name;
                const progressWidth = Math.min(100, Math.max(10, (item.totalXp / (districtRanks[0].totalXp || 1)) * 100));

                let displayedDistrictName = item.name;
                if (isBn) {
                  if (displayedDistrictName === "Dhaka") displayedDistrictName = "ঢাকা";
                  else if (displayedDistrictName === "Barishal") displayedDistrictName = "বরিশাল";
                  else if (displayedDistrictName === "Chattogram") displayedDistrictName = "চট্টগ্রাম";
                  else if (displayedDistrictName === "Khulna") displayedDistrictName = "খুলনা";
                  else if (displayedDistrictName === "Rajshahi") displayedDistrictName = "রাজশাহী";
                  else if (displayedDistrictName === "Rangpur") displayedDistrictName = "রংপুর";
                  else if (displayedDistrictName === "Mymensingh") displayedDistrictName = "ময়মনসিংহ";
                  else if (displayedDistrictName === "Sylhet") displayedDistrictName = "সিলেট";
                }

                return (
                  <div
                     key={item.name}
                    className={`grid grid-cols-12 items-center p-5 border-b border-white/5 transition ${
                      isUserDist ? "bg-red-950/15 border-l-4 border-[#C1121F]" : "hover:bg-white/5"
                    }`}
                  >
                    <div className="col-span-2 text-center font-mono font-extrabold text-[#FFD700] text-sm">
                      #{index + 1}
                    </div>
                    <div className="col-span-7 flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white block uppercase tracking-wide font-display">
                          {displayedDistrictName} {isBn ? "সেক্টর" : "Sector"}
                        </span>
                        {isUserDist && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-red-950 text-[#C1121F] rounded-lg font-mono font-black uppercase">
                            {isBn ? "আমার সেক্টর" : "MY SECTOR"}
                          </span>
                        )}
                      </div>
                      <div className="w-4/5 bg-black h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#FFD700] h-full"
                          style={{ width: `${progressWidth}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="col-span-3 text-right">
                      <span className="text-sm font-extrabold text-white font-mono block">
                        {item.totalXp} XP
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono block leading-none">
                        {isBn ? "ডিভিশনাল কোর" : "Division Core"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* Helpful Info Alert */}
      <div className="bg-red-950/10 border border-[#C1121F]/20 p-5 rounded-2xl flex items-start gap-3 mt-2 leading-relaxed text-xs">
        <span className="text-xl">🛡️</span>
        <div>
          <span className="font-extrabold text-[#FFFFF] uppercase block mb-1 font-display">
            {isBn ? "বিভাগীয় জেলা যুদ্ধ ও কলেজ লীগ গাইড" : "Division War & College League Guide"}
          </span>
          <span className="text-gray-400 block">
            {isBn 
              ? "আপনার ব্যক্তিগত অনুশীলনী এক্সপি অটোমেটিকভাবে আপনার নির্বাচিত কলেজ এবং বিভাগের স্কোরে যুক্ত হয়। আপনার সহপাঠী বন্ধুদের সাথে নিয়ে আমাদের এমসিকিউ কুইজে অংশ নিন এবং আপনার কলেজ বা বিভাগকে সবার উপরে নিয়ে যান!"
              : "Your individual mock practice XP is automatically contributed to your active college and division. Coordinate study campaigns with fellow Notre Dameans or Holy Crossians to capture the National Gaming Lead!"}
          </span>
        </div>
      </div>

    </div>
  );
}
