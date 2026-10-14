import React, { useState, useEffect } from "react";
import { db } from "../../lib/backend";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  addDoc,
  query,
  orderBy,
  limit
} from "../../lib/supabaseDb";
import { OurHero, INITIAL_HEROES } from "../../types/heroTypes";
import { playSound } from "../../audio";
import {
  Award,
  Plus,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  X,
  Sparkles,
  Search,
  ChevronUp,
  ChevronDown,
  Star,
  GraduationCap,
  Heart,
  Quote,
  Check,
  RefreshCw,
  Sliders,
  Image as ImageIcon,
  Building2,
  Calendar,
  Layers,
  ShieldCheck,
  HelpCircle,
  ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface OurHeroesManagerProps {
  language?: "bn" | "en";
  theme?: "light" | "dark";
  onNotify?: (msg: string, type: "success" | "error" | "info") => void;
}

const PRESET_HERO_PHOTOS = [
  {
    name: "Male Doctor / Mentor (Stethoscope)",
    url: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80"
  },
  {
    name: "Female Doctor / Achiever (White Coat)",
    url: "https://images.unsplash.com/photo-1594824813589-9a738122d25f?w=400&auto=format&fit=crop&q=80"
  },
  {
    name: "Medical Student / Confident Mentor",
    url: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&auto=format&fit=crop&q=80"
  },
  {
    name: "Female Medical Achiever (Friendly Smile)",
    url: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80"
  },
  {
    name: "DMC Candidate / Serious Focus",
    url: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&auto=format&fit=crop&q=80"
  },
  {
    name: "Young Top Medical Student",
    url: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&auto=format&fit=crop&q=80"
  }
];

export const INSTITUTION_CATEGORIES = [
  {
    category: "মেডিকেল কলেজ (Medical Colleges)",
    items: [
      "Dhaka Medical College (DMC)",
      "Sir Salimullah Medical College (SSMC)",
      "Shaheed Suhrawardy Medical College (ShSMC)",
      "Mymensingh Medical College (MMC)",
      "Chittagong Medical College (CMC)",
      "Rajshahi Medical College (RMC)",
      "Sylhet MAG Osmani Medical College (SOMC)",
      "Sher-e-Bangla Medical College (SBMC)",
      "Rangpur Medical College (RpMC)",
      "Comilla Medical College (CoMC)",
      "Khulna Medical College (KMC)",
      "Faridpur Medical College (FMC)",
      "Dinajpur Medical College (DjMC)",
      "Pabna Medical College (PMC)",
      "Noakhali Medical College (NMC)",
      "Cox's Bazar Medical College (CoxMC)",
      "Jessore Medical College (JMC)",
      "Kushtia Medical College (KuMC)",
      "Satkhira Medical College (SMC)",
      "Gopalganj Medical College (GMC)",
      "Tangail Medical College (TMC)",
      "Jamalpur Medical College (JpMC)",
      "Manikganj Medical College (MkMC)"
    ]
  },
  {
    category: "ডেন্টাল কলেজ (Dental Colleges)",
    items: [
      "Dhaka Dental College (DDC)",
      "Chittagong Medical College Dental Unit",
      "Rajshahi Medical College Dental Unit",
      "Sir Salimullah Medical College Dental Unit",
      "Mymensingh Medical College Dental Unit"
    ]
  },
  {
    category: "শীর্ষ সাধারণ বিশ্ববিদ্যালয় (Top Public Universities)",
    items: [
      "Dhaka University (DU - A Unit)",
      "Dhaka University (DU - Pharmacy / Bio)",
      "Jahangirnagar University (JU - D Unit)",
      "Rajshahi University (RU - C Unit)",
      "Chittagong University (CU - A Unit)",
      "Jagannath University (JnU)",
      "Bangladesh University of Professionals (BUP)",
      "Comilla University (CoU)",
      "Begum Rokeya University (BRUR)",
      "Islamic University (IU - Kushtia)"
    ]
  },
  {
    category: "ইঞ্জিনিয়ারিং ও প্রযুক্তি (Engineering & Tech Universities)",
    items: [
      "BUET (Bangladesh University of Engineering & Tech)",
      "RUET (Rajshahi University of Eng & Tech)",
      "KUET (Khulna University of Eng & Tech)",
      "CUET (Chittagong University of Eng & Tech)",
      "BUTEX (Bangladesh University of Textiles)",
      "IUT (Islamic University of Technology)",
      "MIST (Military Institute of Science & Technology)"
    ]
  },
  {
    category: "বিজ্ঞান, প্রযুক্তি ও কৃষি গুচ্ছ (Science, Tech & Agriculture)",
    items: [
      "SUST (Shahjalal University of Science & Tech)",
      "GST Cluster Universities (Science / Bio)",
      "Bangladesh Agricultural University (BAU)",
      "Bangabandhu Sheikh Mujibur Rahman Agri Uni (BSMRAU)",
      "Sher-e-Bangla Agricultural University (SAU)",
      "Sylhet Agricultural University (SAU - Sylhet)",
      "Chattogram Veterinary & Animal Sciences Uni (CVASU)",
      "Patuakhali Science & Technology University (PSTU)",
      "Mawlana Bhashani Science & Technology Uni (MBSTU)",
      "Noakhali Science & Technology University (NSTU)",
      "Hajee Mohammad Danesh Science & Tech (HSTU)"
    ]
  },
  {
    category: "আর্মড ফোর্সেস ও অন্যান্য (Armed Forces & Specialized)",
    items: [
      "Armed Forces Medical College (AFMC)",
      "Army Medical College Bogura (AMCB)",
      "Army Medical College Chattogram (AMCC)",
      "Army Medical College Cumilla (AMCCu)",
      "Army Medical College Jashore (AMCJ)"
    ]
  }
];

export const ALL_PRESET_INSTITUTIONS = INSTITUTION_CATEGORIES.flatMap((c) => c.items);
export const PRESET_COLLEGES = ALL_PRESET_INSTITUTIONS;

export default function OurHeroesManager({
  language = "bn",
  theme = "dark",
  onNotify
}: OurHeroesManagerProps) {
  const [heroes, setHeroes] = useState<OurHero[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCollege, setFilterCollege] = useState("all");
  const [filterFeatured, setFilterFeatured] = useState<"all" | "featured" | "standard">("all");

  // Modal states
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingHero, setEditingHero] = useState<OurHero | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [previewHero, setPreviewHero] = useState<OurHero | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<OurHero>>({
    name: "",
    college: "Dhaka Medical College (DMC)",
    rank: "National Merit 3rd",
    score: "94.50 / 100",
    batchYear: "2024-2025",
    courseName: "Medical Standard Exam Batch",
    photoUrl: PRESET_HERO_PHOTOS[0].url,
    story: "",
    hometown: "Dhaka",
    verified: true,
    isFeatured: true,
    badge: "DMC Merit Achiever",
    order: 1
  });

  const isDark = theme === "dark";

  const triggerToast = (msg: string, type: "success" | "error" | "info" = "success") => {
    if (onNotify) {
      onNotify(msg, type);
    } else {
      alert(msg);
    }
  };

  // Real-time listener
  useEffect(() => {
    setLoading(true);
    try {
      const q = query(collection(db, "our_heroes"), orderBy("order", "asc"), limit(50));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: OurHero[] = [];
            snapshot.forEach((docSnap) => {
              list.push({ id: docSnap.id, ...(docSnap.data() as any) });
            });
            setHeroes(list);
          } else {
            setHeroes(INITIAL_HEROES);
          }
          setLoading(false);
        },
        (error) => {
          console.warn("Firestore our_heroes subscription error, fallback to INITIAL_HEROES:", error);
          setHeroes(INITIAL_HEROES);
          setLoading(false);
        }
      );
      return () => unsubscribe();
    } catch (err) {
      console.warn("Error setting up our_heroes listener:", err);
      setHeroes(INITIAL_HEROES);
      setLoading(false);
    }
  }, []);

  const openCreateModal = () => {
    playSound("click");
    setEditingHero(null);
    setFormData({
      name: "",
      college: "Dhaka Medical College (DMC)",
      rank: "National Merit Top 10",
      score: "92.00 / 100",
      batchYear: "2024-2025",
      courseName: "Medical Standard Exam Batch",
      photoUrl: PRESET_HERO_PHOTOS[0].url,
      story: "মেডিব্রিজের নির্ভুল প্রশ্নব্যাংক ও ধারাবাহিক মডেল টেস্ট আমাকে ভর্তি পরীক্ষায় কাঙ্ক্ষিত সাফল্য এনে দিয়েছে।",
      hometown: "Dhaka",
      verified: true,
      isFeatured: true,
      badge: "Top Achiever",
      order: heroes.length + 1
    });
    setIsEditorOpen(true);
  };

  const openEditModal = (hero: OurHero) => {
    playSound("click");
    setEditingHero(hero);
    setFormData({ ...hero });
    setIsEditorOpen(true);
  };

  const handleSaveHero = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      triggerToast("অনুগ্রহ করে কৃতি শিক্ষার্থীর নাম লিখুন।", "error");
      return;
    }
    if (!formData.college?.trim()) {
      triggerToast("অনুগ্রহ করে মেডিকেল কলেজের নাম নির্বাচন করুন।", "error");
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = {
        name: formData.name.trim(),
        college: formData.college.trim(),
        rank: formData.rank?.trim() || "MAT Achiever",
        score: formData.score?.trim() || "",
        batchYear: formData.batchYear?.trim() || "2024-2025",
        courseName: formData.courseName?.trim() || "Medical Exam Batch",
        photoUrl: formData.photoUrl?.trim() || PRESET_HERO_PHOTOS[0].url,
        story: formData.story?.trim() || "",
        hometown: formData.hometown?.trim() || "Bangladesh",
        verified: formData.verified ?? true,
        isFeatured: formData.isFeatured ?? true,
        badge: formData.badge?.trim() || `${formData.college?.split(" ")[0]} Achiever`,
        order: Number(formData.order) || (heroes.length + 1),
        updatedAt: new Date().toISOString()
      };

      if (editingHero) {
        await updateDoc(doc(db, "our_heroes", editingHero.id), payload);
        triggerToast(`🎉 কৃতি শিক্ষার্থী "${payload.name}" এর তথ্য সফলভাবে আপডেট হয়েছে!`, "success");
      } else {
        payload.createdAt = new Date().toISOString();
        const heroId = `hero_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await setDoc(doc(db, "our_heroes", heroId), payload);
        triggerToast(`✨ নতুন কৃতি শিক্ষার্থী "${payload.name}" সফলভাবে যুক্ত হয়েছে!`, "success");
      }

      setIsEditorOpen(false);
      setEditingHero(null);
    } catch (err: any) {
      console.error("Failed to save hero:", err);
      triggerToast(`সংরক্ষণ করতে সমস্যা হয়েছে: ${err.message}`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteHero = async (heroId: string) => {
    try {
      await deleteDoc(doc(db, "our_heroes", heroId));
      triggerToast("কৃতি শিক্ষার্থীর রেকর্ড সফলভাবে মুছে ফেলা হয়েছে।", "info");
      setDeleteConfirmId(null);
    } catch (err: any) {
      console.error("Failed to delete hero:", err);
      triggerToast(`মুছতে সমস্যা হয়েছে: ${err.message}`, "error");
    }
  };

  const handleToggleFeatured = async (hero: OurHero) => {
    playSound("click");
    try {
      await updateDoc(doc(db, "our_heroes", hero.id), {
        isFeatured: !hero.isFeatured,
        updatedAt: new Date().toISOString()
      });
      triggerToast(`কৃতি শিক্ষার্থী "${hero.name}" এর হোমপেজ ফিচার স্ট্যাটাস পরিবর্তিত হয়েছে।`, "success");
    } catch (err: any) {
      console.error("Failed to toggle featured:", err);
    }
  };

  const handleSeedDefaults = async () => {
    if (!window.confirm("ডিফল্ট কৃতি শিক্ষার্থী (Our Heroes) ডেটাসেট ডাটাবেসে সিড করতে চান?")) return;
    try {
      for (const h of INITIAL_HEROES) {
        await setDoc(doc(db, "our_heroes", h.id), {
          ...h,
          updatedAt: new Date().toISOString()
        });
      }
      triggerToast("🎉 ডিফল্ট কৃতি শিক্ষার্থী ডেটাসেট সফলভাবে সিড হয়েছে!", "success");
    } catch (err: any) {
      console.error("Failed to seed heroes:", err);
      triggerToast(`সিড করতে সমস্যা হয়েছে: ${err.message}`, "error");
    }
  };

  const filteredHeroes = heroes.filter((h) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      !q ||
      h.name.toLowerCase().includes(q) ||
      h.college.toLowerCase().includes(q) ||
      h.rank.toLowerCase().includes(q) ||
      h.batchYear.toLowerCase().includes(q) ||
      (h.hometown && h.hometown.toLowerCase().includes(q));

    const matchesCollege = filterCollege === "all" || h.college === filterCollege;
    const matchesFeatured =
      filterFeatured === "all" ||
      (filterFeatured === "featured" && h.isFeatured) ||
      (filterFeatured === "standard" && !h.isFeatured);

    return matchesQuery && matchesCollege && matchesFeatured;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Management Stats */}
      <div className="bg-gradient-to-r from-red-950/40 via-[#151515] to-[#121214] p-6 rounded-2xl border border-white/10 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-amber-500 to-emerald-500"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C1121F]/20 border border-[#C1121F]/40 text-[#FFD700] text-xs font-mono font-bold tracking-wide uppercase shadow-md mb-2">
              <Award className="w-3.5 h-3.5 text-[#FFD700] animate-bounce" />
              <span>{language === "bn" ? "আমাদের কৃতি শিক্ষার্থী ও সাফল্যগাথা CMS" : "Our Heroes & Achievers CMS"}</span>
            </div>

            <h3 className="text-xl md:text-2xl font-black text-white uppercase font-display flex items-center gap-2">
              <span>OUR HEROES CONTROL CENTER</span>
            </h3>

            <p className="text-xs text-gray-300 mt-1 max-w-2xl leading-relaxed">
              {language === "bn"
                ? "মেডিকেল ভর্তি পরীক্ষায় উত্তীর্ণ শীর্ষ মেধাবী শিক্ষার্থীদের প্রোফাইল, কলেজ, র‍্যাংক, স্কোর এবং সাফল্যের গল্প এডমিন প্যানেল থেকে পরিচালনা করুন। এটি স্বয়ংক্রিয়ভাবে হোমপেজ ও কোর্স পেজে রিয়েল-টাইমে প্রদর্শিত হবে।"
                : "Manage verified medical achievers, admission ranks, colleges, scores, and testimonials. Changes sync live to the homepage and landing showcase."}
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-black/60 px-4 py-3 rounded-xl border border-white/10 text-center font-mono">
              <span className="text-[10px] text-gray-400 uppercase block">মোট কৃতি শিক্ষার্থী</span>
              <span className="text-xl font-black text-white">{heroes.length} জন</span>
            </div>

            <div className="bg-black/60 px-4 py-3 rounded-xl border border-white/10 text-center font-mono">
              <span className="text-[10px] text-gray-400 uppercase block">হোমপেজে ফিচারড</span>
              <span className="text-xl font-black text-[#FFD700]">{heroes.filter((h) => h.isFeatured).length} জন</span>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={openCreateModal}
                className="px-4 py-2.5 bg-[#C1121F] hover:bg-red-700 active:scale-95 text-white font-mono font-bold text-xs uppercase rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-red-950/40 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ নতুন কৃতি শিক্ষার্থী যোগ করুন</span>
              </button>

              <button
                type="button"
                onClick={handleSeedDefaults}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-[11px] font-mono rounded-lg transition flex items-center justify-center gap-1.5 border border-white/5 cursor-pointer"
                title="ডিফল্ট কৃতি শিক্ষার্থী ডেটাসেট ডাটাবেসে সিড করুন"
              >
                <RefreshCw className="w-3 h-3 text-[#FFD700]" />
                <span>Seed Default Heroes Data</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#151515] p-4 rounded-xl border border-white/10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="শিক্ষার্থীর নাম, কলেজ, র‍্যাংক বা জেলা দিয়ে খুঁজুন..."
            className="w-full pl-10 pr-4 py-2 bg-black/60 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#C1121F]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* College / University Filter */}
          <select
            value={filterCollege}
            onChange={(e) => setFilterCollege(e.target.value)}
            className="bg-black/60 border border-white/10 text-xs text-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:border-[#C1121F]"
          >
            <option value="all">সকল মেডিকেল ও বিশ্ববিদ্যালয় ({heroes.length})</option>
            {INSTITUTION_CATEGORIES.map((cat) => (
              <optgroup key={cat.category} label={cat.category}>
                {cat.items.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          {/* Featured Filter */}
          <select
            value={filterFeatured}
            onChange={(e) => setFilterFeatured(e.target.value as any)}
            className="bg-black/60 border border-white/10 text-xs text-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:border-[#C1121F]"
          >
            <option value="all">সব প্রোফাইল</option>
            <option value="featured">শুধুমাত্র ফিচারড (Featured on Home)</option>
            <option value="standard">স্ট্যান্ডার্ড</option>
          </select>
        </div>
      </div>

      {/* Heroes Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-gray-400 font-mono text-xs flex items-center justify-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-[#FFD700]" />
          <span>লোড হচ্ছে কৃতি শিক্ষার্থীদের তালিকা...</span>
        </div>
      ) : filteredHeroes.length === 0 ? (
        <div className="bg-[#151515] p-12 rounded-2xl border border-white/10 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-950/30 border border-red-500/20 text-[#FFD700] mx-auto flex items-center justify-center text-2xl">
            🏆
          </div>
          <h4 className="text-base font-bold text-white uppercase font-display">কোনো কৃতি শিক্ষার্থী পাওয়া যায়নি</h4>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            আপনার অনুসন্ধান ফিল্টারের সাথে মিল রয়েছে এমন কোনো রেকর্ড পাওয়া যায়নি অথবা এখনো কোনো শিক্ষার্থী যুক্ত করা হয়নি।
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2 bg-[#C1121F] text-white text-xs font-mono font-bold uppercase rounded-xl inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>নতুন কৃতি শিক্ষার্থী যোগ করুন</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredHeroes.map((hero) => (
            <motion.div
              key={hero.id}
              layout
              className={`rounded-2xl border transition-all duration-300 flex flex-col justify-between overflow-hidden relative group ${
                hero.isFeatured
                  ? "bg-gradient-to-b from-[#18181b] to-[#111113] border-[#FFD700]/30 shadow-lg shadow-amber-950/10"
                  : "bg-[#141416] border-white/10 hover:border-white/20"
              }`}
            >
              {/* Card Header Top Badges */}
              <div className="p-4 pb-0 flex items-center justify-between gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-red-950/60 border border-red-500/30 text-red-300 text-[10px] font-mono font-bold uppercase">
                  {hero.batchYear} সেশন
                </span>

                <div className="flex items-center gap-1.5">
                  {hero.isFeatured && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-950/80 border border-[#FFD700]/60 text-[#FFD700] text-[9px] font-mono font-black uppercase flex items-center gap-1">
                      <Star className="w-3 h-3 fill-[#FFD700]" />
                      <span>হোমপেজ ফিচারড</span>
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => handleToggleFeatured(hero)}
                    title={hero.isFeatured ? "হোমপেজ থেকে আন-ফিচার করুন" : "হোমপেজে ফিচার করুন"}
                    className={`p-1.5 rounded-lg border text-xs transition cursor-pointer ${
                      hero.isFeatured
                        ? "bg-[#FFD700]/20 border-[#FFD700]/50 text-[#FFD700]"
                        : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${hero.isFeatured ? "fill-[#FFD700]" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Student Profile Info */}
              <div className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    <img
                      src={hero.photoUrl || PRESET_HERO_PHOTOS[0].url}
                      alt={hero.name}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-[#C1121F] shadow-md"
                    />
                    {hero.verified && (
                      <div
                        className="absolute -bottom-1 -right-1 bg-emerald-500 text-black p-0.5 rounded-full shadow"
                        title="ভেরিফাইড মেডিকেল এচিভার"
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-black text-white truncate font-display group-hover:text-[#FFD700] transition-colors">
                      {hero.name}
                    </h4>

                    <div className="flex items-center gap-1 text-[#FFD700] text-xs font-mono font-bold mt-0.5 truncate">
                      <GraduationCap className="w-3.5 h-3.5 shrink-0 text-[#FFD700]" />
                      <span className="truncate">{hero.college}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] font-mono text-gray-300">
                      <span className="text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">
                        {hero.rank}
                      </span>
                      {hero.score && <span className="text-gray-400">স্কোর: {hero.score}</span>}
                    </div>
                  </div>
                </div>

                {/* Inspirational Quote / Story Snippet */}
                {hero.story && (
                  <div className="bg-black/40 p-3 rounded-xl border border-white/5 relative">
                    <Quote className="w-3.5 h-3.5 text-[#FFD700]/40 absolute top-2 right-2" />
                    <p className="text-[11px] text-gray-300 italic line-clamp-3 leading-relaxed">
                      "{hero.story}"
                    </p>
                  </div>
                )}

                {/* Badge and Course tag */}
                <div className="flex flex-wrap items-center justify-between text-[10px] font-mono text-gray-400 pt-1 border-t border-white/5">
                  <span>ব্যাচ: {hero.courseName || "Medical Standard"}</span>
                  {hero.hometown && <span>জেলা: {hero.hometown}</span>}
                </div>
              </div>

              {/* Action Buttons Bar */}
              <div className="p-3 bg-[#0d0d0f] border-t border-white/5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPreviewHero(hero)}
                    className="p-1.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg text-xs font-mono transition flex items-center gap-1 border border-white/5 cursor-pointer"
                    title="প্রিভিউ দেখুন"
                  >
                    <Eye className="w-3.5 h-3.5 text-sky-400" />
                    <span className="text-[10px]">Preview</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEditModal(hero)}
                    className="px-2.5 py-1.5 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/30 text-amber-300 hover:text-white rounded-lg text-xs font-mono font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>এডিট</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(hero.id)}
                    className="p-1.5 bg-red-950/40 hover:bg-red-900 border border-red-500/30 text-red-400 hover:text-white rounded-lg transition cursor-pointer"
                    title="মুছে ফেলুন"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🚀 CREATE / EDIT HERO MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isEditorOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[#121214] border border-white/15 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden my-6"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-white/10 bg-[#161619] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#C1121F]/20 border border-[#C1121F]/40 flex items-center justify-center text-[#FFD700]">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-[#FFD700] uppercase tracking-wider block">
                      OUR HEROES RECRUITMENT & PROFILE CMS
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-white uppercase font-display">
                      {editingHero ? "কৃতি শিক্ষার্থীর তথ্য সম্পাদন (Edit Hero)" : "নতুন কৃতি শিক্ষার্থী যুক্ত করুন (Add Hero)"}
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="p-2 text-gray-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Form Body */}
              <form onSubmit={handleSaveHero} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
                {/* Basic Info Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono font-bold text-gray-300 uppercase block">
                      শিক্ষার্থীর পুরো নাম (Student Full Name) *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name || ""}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Dr. Shahriar Kabir"
                      className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#C1121F]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-mono font-bold text-gray-300 uppercase block">
                      ভর্তিকৃত প্রতিষ্ঠান (Medical College / University) *
                    </label>
                    <div className="space-y-2">
                      <select
                        value={formData.college || ALL_PRESET_INSTITUTIONS[0]}
                        onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#C1121F]"
                      >
                        {INSTITUTION_CATEGORIES.map((cat) => (
                          <optgroup key={cat.category} label={cat.category}>
                            {cat.items.map((col) => (
                              <option key={col} value={col}>
                                {col}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={formData.college || ""}
                        onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                        placeholder="বা যেকোনো কাস্টম মেডিকেল কলেজ / বিশ্ববিদ্যালয়ের নাম লিখুন..."
                        className="w-full px-3 py-1.5 bg-black/40 border border-white/5 rounded-lg text-[11px] text-gray-300 placeholder-gray-600 focus:outline-none focus:border-[#C1121F]"
                      />
                    </div>
                  </div>
                </div>

                {/* Merit Rank & Score Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono font-bold text-gray-300 uppercase block">
                      মেধা স্থান / র‍্যাংক (Merit Rank) *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.rank || ""}
                      onChange={(e) => setFormData({ ...formData, rank: e.target.value })}
                      placeholder="e.g. National Merit 3rd"
                      className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 rounded-xl text-xs text-emerald-400 font-bold placeholder-gray-500 focus:outline-none focus:border-[#C1121F]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-mono font-bold text-gray-300 uppercase block">
                      মোট নম্বর / স্কোর (Score)
                    </label>
                    <input
                      type="text"
                      value={formData.score || ""}
                      onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                      placeholder="e.g. 94.50 / 100"
                      className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 rounded-xl text-xs text-[#FFD700] font-bold placeholder-gray-500 focus:outline-none focus:border-[#C1121F]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-mono font-bold text-gray-300 uppercase block">
                      ভর্তি সেশন (Admission Session)
                    </label>
                    <input
                      type="text"
                      value={formData.batchYear || ""}
                      onChange={(e) => setFormData({ ...formData, batchYear: e.target.value })}
                      placeholder="e.g. 2024-2025"
                      className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#C1121F]"
                    />
                  </div>
                </div>

                {/* Course Name & District Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono font-bold text-gray-300 uppercase block">
                      মেডিব্রিজ ব্যাচ / প্রোগ্রাম (Course Enrolled)
                    </label>
                    <input
                      type="text"
                      value={formData.courseName || ""}
                      onChange={(e) => setFormData({ ...formData, courseName: e.target.value })}
                      placeholder="e.g. Medical Standard Exam Batch 2027"
                      className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#C1121F]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-mono font-bold text-gray-300 uppercase block">
                      নিজ জেলা / এলাকা (Hometown District)
                    </label>
                    <input
                      type="text"
                      value={formData.hometown || ""}
                      onChange={(e) => setFormData({ ...formData, hometown: e.target.value })}
                      placeholder="e.g. Dhaka / Chattogram / Rajshahi"
                      className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#C1121F]"
                    />
                  </div>
                </div>

                {/* Photo URL & Presets */}
                <div className="space-y-3 bg-black/40 p-4 rounded-2xl border border-white/10">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono font-bold text-[#FFD700] uppercase block">
                      শিক্ষার্থীর ছবি (Photo URL & High-Quality Presets) *
                    </label>
                    <span className="text-[10px] text-gray-400 font-mono">1-Click Preset Selection</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <img
                      src={formData.photoUrl || PRESET_HERO_PHOTOS[0].url}
                      alt="Preview"
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-[#C1121F] shrink-0"
                    />
                    <input
                      type="url"
                      required
                      value={formData.photoUrl || ""}
                      onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                      placeholder="https://images.unsplash.com/..."
                      className="flex-1 px-3.5 py-2.5 bg-black/60 border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#C1121F]"
                    />
                  </div>

                  {/* Preset Photos Selection Grid */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-2">
                    {PRESET_HERO_PHOTOS.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setFormData({ ...formData, photoUrl: p.url })}
                        className={`group relative rounded-xl overflow-hidden border-2 aspect-square transition cursor-pointer ${
                          formData.photoUrl === p.url ? "border-[#FFD700] ring-2 ring-[#FFD700]/30" : "border-white/10 hover:border-white/30"
                        }`}
                        title={p.name}
                      >
                        <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
                        {formData.photoUrl === p.url && (
                          <div className="absolute inset-0 bg-[#FFD700]/30 flex items-center justify-center">
                            <Check className="w-4 h-4 text-black font-black bg-[#FFD700] rounded-full p-0.5" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Inspirational Story / Testimonial Quote */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-gray-300 uppercase block">
                    সাফল্যের অনুপ্রেরণামূলক মন্তব্য / রিভিউ (Success Story / Advice)
                  </label>
                  <textarea
                    rows={3}
                    value={formData.story || ""}
                    onChange={(e) => setFormData({ ...formData, story: e.target.value })}
                    placeholder="মেডিব্রিজের কোন ফিচারগুলো আপনার মেডিকেল প্রস্তুতিতে সবচেয়ে বড় ভূমিকা রেখেছিল এবং জুনিয়রদের জন্য পরামর্শ..."
                    className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#C1121F] resize-none leading-relaxed"
                  />
                </div>

                {/* Toggles & Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <label className="flex items-center gap-3 p-3 bg-black/40 rounded-xl border border-white/10 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isFeatured ?? true}
                      onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                      className="w-4 h-4 accent-[#C1121F] rounded"
                    />
                    <div>
                      <span className="text-xs font-bold text-white block">হোমপেজে ফিচার করুন (Show on Homepage)</span>
                      <span className="text-[10px] text-gray-400">ল্যান্ডিং পেজ ও হিরোজ গ্যালারিতে অগ্রাধিকার পাবে</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-black/40 rounded-xl border border-white/10 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.verified ?? true}
                      onChange={(e) => setFormData({ ...formData, verified: e.target.checked })}
                      className="w-4 h-4 accent-emerald-500 rounded"
                    />
                    <div>
                      <span className="text-xs font-bold text-white block">ভেরিফাইড ব্যাজ (Verified Achiever)</span>
                      <span className="text-[10px] text-gray-400">প্রোফাইলে গ্রিন ভেরিফিকেশন টিক চিহ্ন থাকবে</span>
                    </div>
                  </label>
                </div>

                {/* Modal Footer Actions */}
                <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsEditorOpen(false)}
                    className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-mono rounded-xl transition cursor-pointer"
                  >
                    বাতিল করুন
                  </button>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2.5 bg-[#C1121F] hover:bg-red-700 active:scale-95 disabled:opacity-50 text-white font-mono font-bold text-xs uppercase rounded-xl transition flex items-center gap-2 shadow-lg shadow-red-950/40 cursor-pointer"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>সংরক্ষণ হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-[#FFD700]" />
                        <span>{editingHero ? "আপডেট সংরক্ষণ করুন" : "কৃতি শিক্ষার্থী যুক্ত করুন"}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 🚀 LIVE STUDENT-FACING PREVIEW MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {previewHero && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#111113] border border-[#FFD700]/30 rounded-3xl p-6 max-w-md w-full shadow-2xl relative space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-[10px] font-mono font-bold text-[#FFD700] uppercase">
                  HOMEPAGE CARD LIVE PREVIEW
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewHero(null)}
                  className="p-1.5 bg-white/5 rounded-full text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-[#151518] p-5 rounded-2xl border border-white/10 space-y-4 shadow-inner">
                <div className="flex items-center gap-4">
                  <img
                    src={previewHero.photoUrl}
                    alt={previewHero.name}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-[#C1121F] shadow-lg"
                  />
                  <div>
                    <span className="px-2 py-0.5 rounded-full bg-[#C1121F]/20 text-[#FFD700] text-[9px] font-mono font-bold uppercase">
                      {previewHero.batchYear} Batch
                    </span>
                    <h4 className="text-base font-black text-white font-display mt-1">{previewHero.name}</h4>
                    <p className="text-xs text-[#FFD700] font-mono font-bold flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>{previewHero.college}</span>
                    </p>
                    <span className="text-emerald-400 text-xs font-mono font-bold block mt-0.5">
                      {previewHero.rank}
                    </span>
                  </div>
                </div>

                {previewHero.story && (
                  <div className="bg-black/50 p-3.5 rounded-xl border border-white/5 relative">
                    <Quote className="w-4 h-4 text-[#FFD700]/30 absolute top-2 right-2" />
                    <p className="text-xs text-gray-300 italic leading-relaxed">
                      "{previewHero.story}"
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 pt-2 border-t border-white/5">
                  <span>{previewHero.courseName}</span>
                  <span className="text-emerald-400 font-bold">✓ Verified DMC Panel</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPreviewHero(null)}
                className="w-full py-2.5 bg-white/10 hover:bg-white/15 text-white font-mono text-xs font-bold rounded-xl uppercase transition"
              >
                Close Preview
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 🚀 DELETE CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#151518] border border-red-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-red-950/40 border border-red-500/40 text-[#C1121F] mx-auto flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white font-display">কৃতি শিক্ষার্থী মুছে ফেলতে চান?</h4>
              <p className="text-xs text-gray-400">
                এই রেকর্ডটি ডাটাবেস থেকে স্থায়ীভাবে মুছে ফেলা হবে।
              </p>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 font-mono text-xs rounded-xl"
                >
                  বাতিল
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteHero(deleteConfirmId)}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-mono font-bold text-xs uppercase rounded-xl shadow-lg"
                >
                  মুছে ফেলুন
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
