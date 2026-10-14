import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { OurHero, INITIAL_HEROES } from "../../types/heroTypes";
import {
  Award,
  GraduationCap,
  Star,
  Quote,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  Trophy,
  Building2,
  Flame,
  ShieldCheck,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface OurHeroesSectionProps {
  language?: "bn" | "en";
  theme?: "light" | "dark";
  title?: string;
  subtitle?: string;
}

export default function OurHeroesSection({
  language = "bn",
  theme = "dark",
  title,
  subtitle
}: OurHeroesSectionProps) {
  const [heroes, setHeroes] = useState<OurHero[]>(INITIAL_HEROES);
  const [activeCollegeTab, setActiveCollegeTab] = useState<string>("all");
  const isDark = theme === "dark";

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem("mb_our_heroes_cache");
      if (cached) {
        setHeroes(JSON.parse(cached));
        return;
      }
      const q = query(collection(db, "our_heroes"), orderBy("order", "asc"), limit(30));
      getDocs(q)
        .then((snapshot) => {
          if (!snapshot.empty) {
            const list: OurHero[] = [];
            snapshot.forEach((docSnap) => {
              list.push({ id: docSnap.id, ...(docSnap.data() as any) });
            });
            setHeroes(list);
            try { sessionStorage.setItem("mb_our_heroes_cache", JSON.stringify(list)); } catch {}
          } else {
            setHeroes(INITIAL_HEROES);
          }
        })
        .catch((error) => {
          console.warn("Could not fetch our_heroes, fallback to INITIAL_HEROES:", error);
          setHeroes(INITIAL_HEROES);
        });
    } catch (err) {
      console.warn("Heroes fetch error:", err);
      setHeroes(INITIAL_HEROES);
    }
  }, []);

  const collegesList: string[] = ["all", ...Array.from<string>(new Set(heroes.map((h) => h.college)))];

  const filteredHeroes = heroes.filter((h) => {
    if (activeCollegeTab === "all") return true;
    return h.college === activeCollegeTab;
  });

  return (
    <section
      className={`py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden border-t ${
        isDark ? "bg-[#0B0B0D] border-white/10" : "bg-slate-50 border-slate-200"
      }`}
      id="our-heroes-showcase"
    >
      {/* Ambient background glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#C1121F]/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[#FFD700]/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10 space-y-10">
        
        {/* Section Header */}
        <div className="text-center flex flex-col items-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FFD700]/15 border border-[#FFD700]/40 text-[#FFD700] text-xs font-mono font-bold tracking-wide uppercase shadow-lg animate-pulse">
            <Trophy className="w-4 h-4 text-[#FFD700]" />
            <span>{language === "bn" ? "আমাদের কৃতি শিক্ষার্থী • Hall of Fame" : "Our Successful Heroes • Hall of Fame"}</span>
          </div>

          <h2 className={`text-2xl sm:text-3xl md:text-5xl font-black uppercase tracking-tight font-display max-w-3xl leading-tight ${
            isDark ? "text-white" : "text-slate-900"
          }`}>
            {title || (language === "bn" ? (
              <>মেডিব্রিজের <span className="text-[#FFD700]">কৃতি শিক্ষার্থীদের</span> সাফল্যগাথা ও অনুপ্রেরণা</>
            ) : (
              <>Success Stories of <span className="text-[#FFD700]">MediBridge Heroes</span></>
            ))}
          </h2>

          <div className="w-20 h-1 bg-[#C1121F] rounded-full" />

          <p className={`max-w-2xl text-xs sm:text-sm leading-relaxed ${
            isDark ? "text-gray-300" : "text-slate-600"
          }`}>
            {subtitle || (language === "bn"
              ? "ঢাকা মেডিকেল (DMC), সলিমুল্লাহ (SSMC), ঢাকা বিশ্ববিদ্যালয় (DU), বুয়েট (BUET), আর্মড ফোর্সেস (AFMC) সহ শীর্ষ মেডিকেল ও বিশ্ববিদ্যালয়ে চান্সপ্রাপ্ত আমাদের সফল শিক্ষার্থীদের গল্প, প্রস্তুতি কৌশল ও তাদের অনুপ্রেরণামূলক উপদেশ।"
              : "Discover how students conquered Medical & Top University admissions with MediBridge's automated mistake banks, line-by-line decoding, and live model tests.")}
          </p>
        </div>

        {/* Quick Highlights / Metric Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
          <div className={`p-4 rounded-2xl border text-center ${
            isDark ? "bg-black/60 border-white/10" : "bg-white border-slate-200 shadow-sm"
          }`}>
            <span className="text-2xl sm:text-3xl font-black text-[#FFD700] block">১০০+</span>
            <span className={`text-[10px] sm:text-[11px] uppercase ${isDark ? "text-gray-400" : "text-slate-500"}`}>
              {language === "bn" ? "মেডিকেল ও ভার্সিটিতে চান্স" : "Govt Medical & Uni Admissions"}
            </span>
          </div>

          <div className={`p-4 rounded-2xl border text-center ${
            isDark ? "bg-black/60 border-white/10" : "bg-white border-slate-200 shadow-sm"
          }`}>
            <span className="text-2xl sm:text-3xl font-black text-emerald-400 block">Top 10</span>
            <span className={`text-[10px] sm:text-[11px] uppercase ${isDark ? "text-gray-400" : "text-slate-500"}`}>
              {language === "bn" ? "জাতীয় মেধাতালিকায় অবস্থান" : "National Top 10 Ranks"}
            </span>
          </div>

          <div className={`p-4 rounded-2xl border text-center ${
            isDark ? "bg-black/60 border-white/10" : "bg-white border-slate-200 shadow-sm"
          }`}>
            <span className="text-2xl sm:text-3xl font-black text-[#C1121F] block">DMC, DU, BUET</span>
            <span className={`text-[10px] sm:text-[11px] uppercase ${isDark ? "text-gray-400" : "text-slate-500"}`}>
              {language === "bn" ? "শীর্ষ প্রতিষ্ঠানে অধ্যয়নরত" : "Premier Institutions"}
            </span>
          </div>

          <div className={`p-4 rounded-2xl border text-center ${
            isDark ? "bg-black/60 border-white/10" : "bg-white border-slate-200 shadow-sm"
          }`}>
            <span className="text-2xl sm:text-3xl font-black text-sky-400 block">১০০%</span>
            <span className={`text-[10px] sm:text-[11px] uppercase ${isDark ? "text-gray-400" : "text-slate-500"}`}>
              {language === "bn" ? "ভেরিফাইড শিক্ষার্থী প্রোফাইল" : "Verified Aspirant Profiles"}
            </span>
          </div>
        </div>

        {/* College Filter Buttons */}
        {collegesList.length > 2 && (
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {collegesList.map((col) => (
              <button
                key={col}
                onClick={() => setActiveCollegeTab(col)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-bold uppercase transition cursor-pointer ${
                  activeCollegeTab === col
                    ? "bg-[#C1121F] text-white shadow-md shadow-red-950/40 border border-red-500"
                    : isDark
                    ? "bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5"
                    : "bg-white hover:bg-slate-100 text-slate-600 border border-slate-200"
                }`}
              >
                {col === "all" ? (language === "bn" ? "সকল কৃতি শিক্ষার্থী" : "All Achievers") : col.split("(")[0]}
              </button>
            ))}
          </div>
        )}

        {/* Heroes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <AnimatePresence>
            {filteredHeroes.map((hero) => (
              <motion.div
                key={hero.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className={`rounded-3xl border p-5 flex flex-col justify-between transition-all duration-300 relative group overflow-hidden ${
                  hero.isFeatured
                    ? isDark
                      ? "bg-gradient-to-b from-[#18181b] to-[#101012] border-[#FFD700]/40 shadow-xl shadow-amber-950/15"
                      : "bg-white border-amber-300 shadow-lg shadow-amber-100/50"
                    : isDark
                    ? "bg-[#131316] border-white/10 hover:border-white/20 shadow-md"
                    : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
                }`}
              >
                {/* Top Corner Ribbon / Badge */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="px-2.5 py-0.5 rounded-full bg-red-950/50 border border-red-500/30 text-red-300 text-[10px] font-mono font-bold uppercase">
                    {hero.batchYear}
                  </span>

                  {hero.isFeatured && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-950/70 border border-[#FFD700]/50 text-[#FFD700] text-[9px] font-mono font-black uppercase flex items-center gap-1">
                      <Star className="w-3 h-3 fill-[#FFD700]" />
                      <span>{hero.badge || "Hero"}</span>
                    </span>
                  )}
                </div>

                {/* Profile Header & Photo */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3.5">
                    <div className="relative shrink-0">
                      <img
                        src={hero.photoUrl}
                        alt={hero.name}
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-[#C1121F] shadow-md group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                      {hero.verified && (
                        <div
                          className="absolute -bottom-1 -right-1 bg-emerald-500 text-black p-0.5 rounded-full shadow-md"
                          title="Verified MAT Achiever"
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <h4 className={`text-base font-black truncate font-display group-hover:text-[#FFD700] transition-colors ${
                        isDark ? "text-white" : "text-slate-900"
                      }`}>
                        {hero.name}
                      </h4>

                      <p className="text-xs font-mono font-bold text-[#FFD700] flex items-center gap-1 truncate mt-0.5">
                        <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{hero.college}</span>
                      </p>

                      <div className="flex items-center gap-1.5 mt-1 font-mono text-[11px]">
                        <span className="text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">
                          {hero.rank}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Testimonial Quote */}
                  {hero.story && (
                    <div className={`p-3.5 rounded-2xl border relative ${
                      isDark ? "bg-black/50 border-white/5" : "bg-slate-50 border-slate-100"
                    }`}>
                      <Quote className="w-3.5 h-3.5 text-[#FFD700]/30 absolute top-2.5 right-2.5" />
                      <p className={`text-xs italic leading-relaxed line-clamp-4 ${
                        isDark ? "text-gray-300" : "text-slate-600"
                      }`}>
                        "{hero.story}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Card Footer Tag */}
                <div className={`mt-4 pt-3 border-t flex items-center justify-between text-[10px] font-mono ${
                  isDark ? "border-white/5 text-gray-400" : "border-slate-100 text-slate-500"
                }`}>
                  <span className="truncate">{hero.courseName || "Medical Standard Batch"}</span>
                  {hero.score && <span className="text-[#FFD700] font-bold shrink-0">{hero.score}</span>}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

      </div>
    </section>
  );
}
