import React, { useState, useEffect, useRef } from "react";
import { db, handleFirestoreError, OperationType } from "../../lib/backend";
import { doc, onSnapshot, setDoc, serverTimestamp } from "../../lib/supabaseDb";
import { MEDICAL_GAMES, GameMetadata } from "../gaming/gamingData";
import {
  Gamepad2,
  Sparkles,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Save,
  Search,
  Filter,
  Flame,
  Award,
  Zap,
  Coins,
  Shield,
  Clock,
  Eye,
  Sliders,
  Layers,
  Palette,
  Volume2,
  RefreshCw,
  TrendingUp,
  Tag,
  Check,
  X,
  ExternalLink,
  ChevronRight,
  Info,
} from "lucide-react";
import { playSound } from "../../audio";

interface GamingAssetManagerProps {
  language?: "bn" | "en";
  theme?: "light" | "dark";
  currentUserUid: string;
  onNotify?: (message: string, type: "success" | "error" | "info") => void;
}

export interface GamingArenaSettings {
  masterEnabled?: boolean;
  maintenanceMessageEn?: string;
  maintenanceMessageBn?: string;
  globalXpMultiplier?: number;
  globalCoinMultiplier?: number;
  doubleXpEventActive?: boolean;
  eventBannerTextEn?: string;
  eventBannerTextBn?: string;
  games?: Record<string, Partial<GameMetadata> & {
    enabled?: boolean;
    customIconUrl?: string;
    customBannerUrl?: string;
    soundTheme?: string;
    requiredLevel?: number;
  }>;
  updatedAt?: any;
  updatedBy?: string;
}

const ICON_PRESETS = [
  "🏃‍♂️", "⚔️", "🏎️", "🏏", "⚽", "🛡️", "⚡", "🧠", "🏥", "🔤",
  "💊", "🔬", "🧬", "🩸", "🫀", "🫁", "🦠", "🎯", "🥇", "👑",
  "🧪", "🩺", "💉", "🌡️", "🚑", "🩹", "👾", "🚀", "🔥", "💎"
];

const GRADIENT_PRESETS = [
  { name: "Crimson Blaze", value: "from-red-600 to-rose-700", preview: "linear-gradient(135deg, #dc2626, #be123c)" },
  { name: "Emerald Ninja", value: "from-emerald-600 to-teal-700", preview: "linear-gradient(135deg, #059669, #0f766e)" },
  { name: "Gold Nitro", value: "from-amber-500 to-orange-700", preview: "linear-gradient(135deg, #f59e0b, #c2410c)" },
  { name: "Royal Cricket", value: "from-blue-600 to-indigo-700", preview: "linear-gradient(135deg, #2563eb, #4338ca)" },
  { name: "Anatomy Green", value: "from-green-600 to-emerald-800", preview: "linear-gradient(135deg, #16a34a, #065f46)" },
  { name: "Immune Violet", value: "from-purple-600 to-violet-800", preview: "linear-gradient(135deg, #9333ea, #5b21b6)" },
  { name: "Thunder Yellow", value: "from-yellow-500 to-amber-600", preview: "linear-gradient(135deg, #eab308, #d97706)" },
  { name: "Memory Rose", value: "from-pink-600 to-rose-700", preview: "linear-gradient(135deg, #db2777, #be123c)" },
  { name: "Clinical Cyan", value: "from-cyan-600 to-blue-700", preview: "linear-gradient(135deg, #0891b2, #1d4ed8)" },
  { name: "Teal Matrix", value: "from-teal-600 to-emerald-700", preview: "linear-gradient(135deg, #0d9488, #047857)" },
  { name: "Neon Cyber", value: "from-fuchsia-600 to-cyan-600", preview: "linear-gradient(135deg, #c026d3, #0891b2)" },
  { name: "Dark Void", value: "from-gray-800 to-black", preview: "linear-gradient(135deg, #1f2937, #000000)" },
];

const BANNER_PRESETS = [
  { name: "Microscopic Biology", url: "https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=800&auto=format&fit=crop&q=80" },
  { name: "Clinical Science & ER", url: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80" },
  { name: "Neural Synapses & Brain", url: "https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=800&auto=format&fit=crop&q=80" },
  { name: "Speed & Formula Race", url: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&auto=format&fit=crop&q=80" },
  { name: "DNA & Genetics Lab", url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&auto=format&fit=crop&q=80" },
];

export default function GamingAssetManager({
  language = "bn",
  theme = "dark",
  currentUserUid,
  onNotify,
}: GamingAssetManagerProps) {
  const isBn = language === "bn";
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);

  // Settings State from Firestore
  const [settings, setSettings] = useState<GamingArenaSettings>({
    masterEnabled: true,
    globalXpMultiplier: 1.0,
    globalCoinMultiplier: 1.0,
    doubleXpEventActive: false,
    eventBannerTextEn: "Double XP & Bonus Coins active across all games!",
    eventBannerTextBn: "ডাবল XP ও বোনাস কয়েন ইভেন্ট চলছে সকল গেমে!",
    games: {},
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedGameId, setSelectedGameId] = useState<string>(MEDICAL_GAMES[0]?.id || "med-runner");
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  // Editable Form for the currently selected game
  const [activeForm, setActiveForm] = useState<{
    id: string;
    title: string;
    titleBn: string;
    subtitle: string;
    subtitleBn: string;
    description: string;
    descriptionBn: string;
    category: "action" | "racing" | "sports" | "battle" | "puzzle" | "clinical";
    icon: string;
    customIconUrl: string;
    customBannerUrl: string;
    badgeColor: string;
    difficulty: "Easy" | "Medium" | "Hard" | "All Levels";
    xpMultiplier: number;
    coinReward: number;
    popular: boolean;
    featured: boolean;
    minDurationSeconds: number;
    enabled: boolean;
    requiredLevel: number;
    soundTheme: string;
  }>({
    id: MEDICAL_GAMES[0]?.id || "med-runner",
    title: MEDICAL_GAMES[0]?.title || "",
    titleBn: MEDICAL_GAMES[0]?.titleBn || "",
    subtitle: MEDICAL_GAMES[0]?.subtitle || "",
    subtitleBn: MEDICAL_GAMES[0]?.subtitleBn || "",
    description: MEDICAL_GAMES[0]?.description || "",
    descriptionBn: MEDICAL_GAMES[0]?.descriptionBn || "",
    category: MEDICAL_GAMES[0]?.category || "action",
    icon: MEDICAL_GAMES[0]?.icon || "🏃‍♂️",
    customIconUrl: "",
    customBannerUrl: "",
    badgeColor: MEDICAL_GAMES[0]?.badgeColor || "from-red-600 to-rose-700",
    difficulty: MEDICAL_GAMES[0]?.difficulty || "All Levels",
    xpMultiplier: MEDICAL_GAMES[0]?.xpMultiplier || 1.5,
    coinReward: MEDICAL_GAMES[0]?.coinReward || 80,
    popular: false,
    featured: true,
    minDurationSeconds: 90,
    enabled: true,
    requiredLevel: 1,
    soundTheme: "Action Rush",
  });

  const notify = (msg: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage({ text: msg, type });
    if (onNotify) onNotify(msg, type);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Subscribe to Firestore settings
  useEffect(() => {
    try {
      const unsub = onSnapshot(
        doc(db, "settings", "gaming_arena"),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data() as GamingArenaSettings;
            setSettings({
              masterEnabled: data.masterEnabled !== false,
              globalXpMultiplier: data.globalXpMultiplier ?? 1.0,
              globalCoinMultiplier: data.globalCoinMultiplier ?? 1.0,
              doubleXpEventActive: !!data.doubleXpEventActive,
              eventBannerTextEn: data.eventBannerTextEn || "Double XP & Bonus Coins active across all games!",
              eventBannerTextBn: data.eventBannerTextBn || "ডাবল XP ও বোনাস কয়েন ইভেন্ট চলছে সকল গেমে!",
              maintenanceMessageEn: data.maintenanceMessageEn || "Gaming Arena is undergoing scheduled server optimization. Check back shortly!",
              maintenanceMessageBn: data.maintenanceMessageBn || "গেমিং অ্যারেনায় বর্তমানে সার্ভার আপগ্রেড চলছে। খুব শীঘ্রই গেমগুলো পুনরায় চালু হবে!",
              games: data.games || {},
            });
          }
          setLoading(false);
        },
        (err) => {
          console.warn("Firestore gaming_arena subscription error:", err);
          setLoading(false);
        }
      );
      return () => unsub();
    } catch (e) {
      console.warn("Error setting up gaming_arena snapshot:", e);
      setLoading(false);
    }
  }, []);

  // 2. When selected game changes or settings update, populate active form
  useEffect(() => {
    const baseGame = MEDICAL_GAMES.find((g) => g.id === selectedGameId) || MEDICAL_GAMES[0];
    if (!baseGame) return;

    const gameOverride = settings.games?.[selectedGameId] || {};

    setActiveForm({
      id: baseGame.id,
      title: gameOverride.title ?? baseGame.title,
      titleBn: gameOverride.titleBn ?? baseGame.titleBn,
      subtitle: gameOverride.subtitle ?? baseGame.subtitle,
      subtitleBn: gameOverride.subtitleBn ?? baseGame.subtitleBn,
      description: gameOverride.description ?? baseGame.description,
      descriptionBn: gameOverride.descriptionBn ?? baseGame.descriptionBn,
      category: (gameOverride.category as any) ?? baseGame.category,
      icon: gameOverride.icon ?? baseGame.icon,
      customIconUrl: gameOverride.customIconUrl ?? "",
      customBannerUrl: gameOverride.customBannerUrl ?? "",
      badgeColor: gameOverride.badgeColor ?? baseGame.badgeColor,
      difficulty: (gameOverride.difficulty as any) ?? baseGame.difficulty,
      xpMultiplier: Number(gameOverride.xpMultiplier ?? baseGame.xpMultiplier),
      coinReward: Number(gameOverride.coinReward ?? baseGame.coinReward),
      popular: gameOverride.popular ?? !!baseGame.popular,
      featured: gameOverride.featured ?? !!baseGame.featured,
      minDurationSeconds: Number(gameOverride.minDurationSeconds ?? baseGame.minDurationSeconds),
      enabled: gameOverride.enabled !== false,
      requiredLevel: Number(gameOverride.requiredLevel ?? 1),
      soundTheme: gameOverride.soundTheme ?? "Action Rush",
    });
  }, [selectedGameId, settings]);

  // Handle icon file upload (convert to Base64 data URL)
  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      notify("Icon image must be under 2MB", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setActiveForm((prev) => ({
        ...prev,
        customIconUrl: dataUrl,
        icon: "🖼️",
      }));
      playSound("correct");
      notify("Custom icon loaded! Click 'Save Game Config' to persist.", "info");
    };
    reader.readAsDataURL(file);
  };

  // Handle banner file upload
  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      notify("Banner image must be under 3MB", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setActiveForm((prev) => ({
        ...prev,
        customBannerUrl: dataUrl,
      }));
      playSound("correct");
      notify("Custom banner loaded! Click 'Save Game Config' to persist.", "info");
    };
    reader.readAsDataURL(file);
  };

  // Save changes for currently selected game
  const handleSaveSelectedGame = async () => {
    setSaving(true);
    try {
      const updatedGames = {
        ...(settings.games || {}),
        [activeForm.id]: {
          title: activeForm.title,
          titleBn: activeForm.titleBn,
          subtitle: activeForm.subtitle,
          subtitleBn: activeForm.subtitleBn,
          description: activeForm.description,
          descriptionBn: activeForm.descriptionBn,
          category: activeForm.category,
          icon: activeForm.icon,
          customIconUrl: activeForm.customIconUrl,
          customBannerUrl: activeForm.customBannerUrl,
          badgeColor: activeForm.badgeColor,
          difficulty: activeForm.difficulty,
          xpMultiplier: Number(activeForm.xpMultiplier),
          coinReward: Number(activeForm.coinReward),
          popular: activeForm.popular,
          featured: activeForm.featured,
          minDurationSeconds: Number(activeForm.minDurationSeconds),
          enabled: activeForm.enabled,
          requiredLevel: Number(activeForm.requiredLevel),
          soundTheme: activeForm.soundTheme,
        },
      };

      await setDoc(
        doc(db, "settings", "gaming_arena"),
        {
          ...settings,
          games: updatedGames,
          updatedAt: serverTimestamp(),
          updatedBy: currentUserUid,
        },
        { merge: true }
      );

      playSound("victory");
      notify(`Saved assets & rewards for ${activeForm.title}!`, "success");
    } catch (err) {
      console.error("Error saving game configuration:", err);
      notify("Failed to save game configuration", "error");
    } finally {
      setSaving(false);
    }
  };

  // Reset selected game to factory default
  const handleResetSelectedGame = async () => {
    const baseGame = MEDICAL_GAMES.find((g) => g.id === selectedGameId);
    if (!baseGame) return;

    setSaving(true);
    try {
      const updatedGames = { ...(settings.games || {}) };
      delete updatedGames[selectedGameId];

      await setDoc(
        doc(db, "settings", "gaming_arena"),
        {
          ...settings,
          games: updatedGames,
          updatedAt: serverTimestamp(),
          updatedBy: currentUserUid,
        },
        { merge: true }
      );

      playSound("click");
      notify(`Reset ${baseGame.title} to default assets and rewards.`, "info");
    } catch (err) {
      console.error("Error resetting game:", err);
      notify("Failed to reset game", "error");
    } finally {
      setSaving(false);
    }
  };

  // Save Global Arena Economy / Maintenance Settings
  const handleSaveGlobalSettings = async (partial: Partial<GamingArenaSettings>) => {
    setSaving(true);
    try {
      const newSettings = {
        ...settings,
        ...partial,
        updatedAt: serverTimestamp(),
        updatedBy: currentUserUid,
      };

      await setDoc(doc(db, "settings", "gaming_arena"), newSettings, { merge: true });
      setSettings(newSettings);
      playSound("correct");
      notify("Global Arena settings updated successfully!", "success");
    } catch (err) {
      console.error("Error saving global arena settings:", err);
      notify("Failed to update global arena settings", "error");
    } finally {
      setSaving(false);
    }
  };

  // Apply Event Preset: Double XP Admission Weekend
  const applyPresetDoubleXp = async () => {
    await handleSaveGlobalSettings({
      doubleXpEventActive: true,
      globalXpMultiplier: 2.0,
      globalCoinMultiplier: 1.5,
      eventBannerTextEn: "🔥 2X XP & 1.5X Bonus Coins active across all Medical Games this weekend!",
      eventBannerTextBn: "🔥 সাপ্তাহিক ডাবল XP ও ১.৫x কয়েন বুস্টার ইভেন্ট সকল গেমে লাইভ!",
    });
  };

  // Apply Preset: Exam Rush Blitz
  const applyPresetExamRush = async () => {
    await handleSaveGlobalSettings({
      doubleXpEventActive: true,
      globalXpMultiplier: 2.5,
      globalCoinMultiplier: 2.0,
      eventBannerTextEn: "⚡ NIGHTMARE EXAM BLITZ: 2.5X XP on all Clinical ER, BioSlice & Speed Drills!",
      eventBannerTextBn: "⚡ নাইটমেয়ার এক্সাম ব্লিৎজ: ক্লিনিক্যাল সিম, স্পিড ড্রিল ও বায়ো-স্লাইসে ২.৫ গুণ XP বোনাস!",
    });
  };

  // Apply Preset: Reset All to Standard Defaults
  const applyPresetResetDefaults = async () => {
    if (!window.confirm("Are you sure you want to reset ALL gaming arena settings and game overrides to factory defaults?")) {
      return;
    }
    setSaving(true);
    try {
      await setDoc(doc(db, "settings", "gaming_arena"), {
        masterEnabled: true,
        globalXpMultiplier: 1.0,
        globalCoinMultiplier: 1.0,
        doubleXpEventActive: false,
        eventBannerTextEn: "Double XP & Bonus Coins active across all games!",
        eventBannerTextBn: "ডাবল XP ও বোনাস কয়েন ইভেন্ট চলছে সকল গেমে!",
        maintenanceMessageEn: "Gaming Arena is undergoing scheduled server optimization. Check back shortly!",
        maintenanceMessageBn: "গেমিং অ্যারেনায় বর্তমানে সার্ভার আপগ্রেড চলছে। খুব শীঘ্রই গেমগুলো পুনরায় চালু হবে!",
        games: {},
        updatedAt: serverTimestamp(),
        updatedBy: currentUserUid,
      });
      playSound("victory");
      notify("All Gaming Arena assets & settings have been reset to factory defaults.", "info");
    } catch (err) {
      console.error("Error resetting all settings:", err);
      notify("Failed to reset arena settings", "error");
    } finally {
      setSaving(false);
    }
  };

  // Filtered games list
  const filteredGames = MEDICAL_GAMES.filter((game) => {
    const gameOverride = settings.games?.[game.id];
    const title = gameOverride?.title || game.title;
    const titleBn = gameOverride?.titleBn || game.titleBn;
    const category = gameOverride?.category || game.category;

    const matchesCat = categoryFilter === "all" || category === categoryFilter;
    if (!searchQuery.trim()) return matchesCat;
    const q = (searchQuery || "").toLowerCase();
    const matchesSearch =
      (title || "").toLowerCase().includes(q) ||
      (titleBn || "").toLowerCase().includes(q) ||
      (game.id || "").toLowerCase().includes(q);

    return matchesCat && matchesSearch;
  });

  const totalGamesCount = MEDICAL_GAMES.length;
  const activeGamesCount = MEDICAL_GAMES.filter((g) => settings.games?.[g.id]?.enabled !== false).length;
  const overriddenCount = Object.keys(settings.games || {}).length;

  return (
    <div className="flex flex-col gap-6 font-sans text-gray-100">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-2xl border flex items-center gap-3 backdrop-blur-lg animate-slide-in text-xs font-mono font-bold ${
            toastMessage.type === "success"
              ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-300"
              : toastMessage.type === "error"
              ? "bg-red-950/90 border-red-500/50 text-red-300"
              : "bg-amber-950/90 border-amber-500/50 text-amber-300"
          }`}
        >
          {toastMessage.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {toastMessage.type === "error" && <XCircle className="w-4 h-4 text-red-400" />}
          {toastMessage.type === "info" && <Sparkles className="w-4 h-4 text-amber-400" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* TOP COMMAND HEADER */}
      <div className="bg-gradient-to-r from-red-950/40 via-[#151515] to-black rounded-2xl p-6 border border-white/10 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-red-600 via-amber-500 to-yellow-400"></div>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-3 py-0.5 rounded-full bg-red-600/20 border border-red-500/40 text-red-400 font-mono text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <Gamepad2 className="w-3.5 h-3.5" />
                <span>GAMING ARENA COMMAND & ASSET CENTER</span>
              </span>
              {settings.masterEnabled ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-400 font-mono text-[10px] font-bold uppercase">
                  ● LIVE
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-red-950 border border-red-500/40 text-red-400 font-mono text-[10px] font-bold uppercase animate-pulse">
                  ● MAINTENANCE MODE
                </span>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wide font-display">
              GAME ASSETS, DIFFICULTIES & REWARDS
            </h2>
            <p className="text-xs text-gray-400 max-w-2xl leading-relaxed">
              Upload custom icons, configure card banners, adjust difficulty tiers, and fine-tune XP multipliers and coin payout economies across all 10+ medical games in real-time.
            </p>
          </div>

          {/* Preset Actions */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={applyPresetDoubleXp}
              disabled={saving}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black text-xs font-mono font-black rounded-xl uppercase tracking-wider transition shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Double XP Weekend</span>
            </button>

            <button
              onClick={applyPresetExamRush}
              disabled={saving}
              className="px-3.5 py-2 bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-300 text-xs font-mono font-bold rounded-xl uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer"
            >
              <Flame className="w-3.5 h-3.5 text-purple-400" />
              <span>Exam Blitz Boost</span>
            </button>

            <button
              onClick={applyPresetResetDefaults}
              disabled={saving}
              className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-xs font-mono font-bold rounded-xl uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer"
              title="Reset all games to code defaults"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>
          </div>
        </div>

        {/* HUD Quick Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10 font-mono text-xs">
          <div className="bg-black/40 p-3 rounded-xl border border-white/5 flex items-center justify-between">
            <span className="text-gray-400 text-[11px]">Total Games:</span>
            <span className="font-black text-white">{totalGamesCount}</span>
          </div>
          <div className="bg-black/40 p-3 rounded-xl border border-white/5 flex items-center justify-between">
            <span className="text-gray-400 text-[11px]">Active Arcades:</span>
            <span className="font-black text-emerald-400">{activeGamesCount}</span>
          </div>
          <div className="bg-black/40 p-3 rounded-xl border border-white/5 flex items-center justify-between">
            <span className="text-gray-400 text-[11px]">Customized Overrides:</span>
            <span className="font-black text-amber-400">{overriddenCount} games</span>
          </div>
          <div className="bg-black/40 p-3 rounded-xl border border-white/5 flex items-center justify-between">
            <span className="text-gray-400 text-[11px]">Global Multipliers:</span>
            <span className="font-black text-yellow-300">
              {settings.globalXpMultiplier || 1.0}x XP • {settings.globalCoinMultiplier || 1.0}x 🪙
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 1: GLOBAL ARENA CONTROLS & EVENT BOOSTER */}
      <div className="bg-[#151515] p-5 sm:p-6 rounded-2xl border border-white/10 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            <h3 className="font-mono text-xs font-black uppercase tracking-wider text-white">
              GLOBAL ARENA ECONOMY & EVENT BROADCAST
            </h3>
          </div>
          <span className="text-[10px] text-gray-400 font-mono">
            Applies universally across all student game completions
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Master Arena Status Switch */}
          <div className="bg-black/40 p-4 rounded-xl border border-white/5 flex flex-col justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-gray-200 block font-mono">Arena Master Switch</span>
              <p className="text-[10px] text-gray-400 mt-1">Enable or close the entire Gaming Arena for maintenance</p>
            </div>
            <button
              onClick={() => handleSaveGlobalSettings({ masterEnabled: !settings.masterEnabled })}
              className={`w-full py-2 px-3 rounded-xl font-mono text-xs font-bold uppercase transition flex items-center justify-center gap-2 cursor-pointer ${
                settings.masterEnabled
                  ? "bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900"
                  : "bg-red-950/80 border border-red-500/40 text-red-300 hover:bg-red-900"
              }`}
            >
              {settings.masterEnabled ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Arena Enabled (Open)</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                  <span>Under Maintenance</span>
                </>
              )}
            </button>
          </div>

          {/* Double XP Booster Toggle */}
          <div className="bg-black/40 p-4 rounded-xl border border-white/5 flex flex-col justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-gray-200 block font-mono">Event Banner & Booster</span>
              <p className="text-[10px] text-gray-400 mt-1">Display special booster announcement banner to all users</p>
            </div>
            <button
              onClick={() => handleSaveGlobalSettings({ doubleXpEventActive: !settings.doubleXpEventActive })}
              className={`w-full py-2 px-3 rounded-xl font-mono text-xs font-bold uppercase transition flex items-center justify-center gap-2 cursor-pointer ${
                settings.doubleXpEventActive
                  ? "bg-amber-950/80 border border-amber-500/40 text-amber-300 hover:bg-amber-900"
                  : "bg-white/5 border border-white/10 text-gray-400 hover:text-white"
              }`}
            >
              <Zap className={`w-3.5 h-3.5 ${settings.doubleXpEventActive ? "text-amber-400 fill-current" : ""}`} />
              <span>{settings.doubleXpEventActive ? "Booster Event Active" : "Booster Inactive"}</span>
            </button>
          </div>

          {/* Global XP Multiplier */}
          <div className="bg-black/40 p-4 rounded-xl border border-white/5 space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-gray-300 font-bold">Global XP Multiplier</span>
              <span className="text-amber-400 font-black">{settings.globalXpMultiplier?.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="4.0"
              step="0.1"
              value={settings.globalXpMultiplier ?? 1.0}
              onChange={(e) => setSettings((prev) => ({ ...prev, globalXpMultiplier: parseFloat(e.target.value) }))}
              onMouseUp={() => handleSaveGlobalSettings({ globalXpMultiplier: settings.globalXpMultiplier })}
              onTouchEnd={() => handleSaveGlobalSettings({ globalXpMultiplier: settings.globalXpMultiplier })}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[9px] font-mono text-gray-500">
              <span>0.5x</span>
              <span>1.0x (Normal)</span>
              <span>2.0x (Double)</span>
              <span>4.0x</span>
            </div>
          </div>

          {/* Global Coin Multiplier */}
          <div className="bg-black/40 p-4 rounded-xl border border-white/5 space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-gray-300 font-bold">Global Coin Multiplier</span>
              <span className="text-yellow-400 font-black">{settings.globalCoinMultiplier?.toFixed(1)}x 🪙</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.1"
              value={settings.globalCoinMultiplier ?? 1.0}
              onChange={(e) => setSettings((prev) => ({ ...prev, globalCoinMultiplier: parseFloat(e.target.value) }))}
              onMouseUp={() => handleSaveGlobalSettings({ globalCoinMultiplier: settings.globalCoinMultiplier })}
              onTouchEnd={() => handleSaveGlobalSettings({ globalCoinMultiplier: settings.globalCoinMultiplier })}
              className="w-full accent-yellow-400 cursor-pointer"
            />
            <div className="flex justify-between text-[9px] font-mono text-gray-500">
              <span>0.5x</span>
              <span>1.0x</span>
              <span>2.0x</span>
              <span>3.0x</span>
            </div>
          </div>
        </div>

        {/* Bilingual Event Banner Text Editor */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          <div>
            <label className="text-[10px] font-mono uppercase text-gray-400 font-bold block mb-1">
              Event Banner Headline (English)
            </label>
            <input
              type="text"
              value={settings.eventBannerTextEn || ""}
              onChange={(e) => setSettings((prev) => ({ ...prev, eventBannerTextEn: e.target.value }))}
              onBlur={() => handleSaveGlobalSettings({ eventBannerTextEn: settings.eventBannerTextEn })}
              placeholder="e.g. 2X XP and bonus coins weekend active!"
              className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="text-[10px] font-mono uppercase text-gray-400 font-bold block mb-1">
              Event Banner Headline (Bengali / বাংলা)
            </label>
            <input
              type="text"
              value={settings.eventBannerTextBn || ""}
              onChange={(e) => setSettings((prev) => ({ ...prev, eventBannerTextBn: e.target.value }))}
              onBlur={() => handleSaveGlobalSettings({ eventBannerTextBn: settings.eventBannerTextBn })}
              placeholder="উদাঃ ডাবল XP ও বোনাস কয়েন ইভেন্ট চলছে!"
              className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs font-sans text-white placeholder-gray-600 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* SECTION 2: GAME SELECTOR & ASSET/REWARDS DUAL PANE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: GAME CARDS LIST (4 COLS) */}
        <div className="lg:col-span-4 bg-[#151515] p-5 rounded-2xl border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="font-mono text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-red-500" />
              <span>GAMES CATALOG ({filteredGames.length})</span>
            </h3>
            <span className="text-[10px] font-mono text-gray-400">Select to customize</span>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by game name or id..."
              className="w-full bg-black/60 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar">
            {["all", "action", "racing", "sports", "battle", "puzzle", "clinical"].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase shrink-0 transition cursor-pointer ${
                  categoryFilter === cat
                    ? "bg-red-600 text-white"
                    : "bg-black/40 text-gray-400 hover:text-white border border-white/5"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Game List Items */}
          <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1 custom-scrollbar">
            {filteredGames.map((game) => {
              const override = settings.games?.[game.id];
              const isSelected = selectedGameId === game.id;
              const isEnabled = override?.enabled !== false;
              const displayTitle = override?.title || game.title;
              const displayIcon = override?.icon || game.icon;
              const customIcon = override?.customIconUrl;
              const xpVal = (override?.xpMultiplier ?? game.xpMultiplier) * (settings.globalXpMultiplier || 1.0);
              const coinsVal = (override?.coinReward ?? game.coinReward) * (settings.globalCoinMultiplier || 1.0);
              const diffVal = override?.difficulty || game.difficulty;

              return (
                <div
                  key={game.id}
                  onClick={() => {
                    playSound("click");
                    setSelectedGameId(game.id);
                  }}
                  className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 relative overflow-hidden group ${
                    isSelected
                      ? "bg-gradient-to-r from-red-950/80 to-[#1e1414] border-red-500 shadow-lg shadow-red-950/30"
                      : isEnabled
                      ? "bg-black/40 border-white/5 hover:border-white/20 hover:bg-white/5"
                      : "bg-red-950/20 border-red-500/20 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden text-xl">
                      {customIcon ? (
                        <img src={customIcon} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <span>{displayIcon}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className={`text-xs font-bold truncate ${isSelected ? "text-white" : "text-gray-200 group-hover:text-white"}`}>
                          {displayTitle}
                        </p>
                        {override && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Has custom config override" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400 mt-0.5">
                        <span className="text-amber-400 font-bold">{diffVal}</span>
                        <span>•</span>
                        <span className="text-emerald-400">+{xpVal.toFixed(1)}x XP</span>
                        <span>•</span>
                        <span className="text-yellow-300">+{Math.round(coinsVal)} 🪙</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {!isEnabled && (
                      <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-red-950 border border-red-500/40 text-red-300">
                        OFF
                      </span>
                    )}
                    <ChevronRight className={`w-4 h-4 transition ${isSelected ? "text-red-400 translate-x-0.5" : "text-gray-600"}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: DETAILED ASSET & REWARD EDITOR (8 COLS) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* EDITOR CARD CONTAINER */}
          <div className="bg-[#151515] p-6 rounded-2xl border border-white/10 shadow-2xl space-y-6">
            
            {/* Header with Title & Quick Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-black/60 border border-white/10 flex items-center justify-center text-2xl shrink-0 overflow-hidden shadow-inner">
                  {activeForm.customIconUrl ? (
                    <img src={activeForm.customIconUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span>{activeForm.icon}</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-white uppercase font-mono">
                      {activeForm.title || "Game Asset Editor"}
                    </h3>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white/10 text-gray-300">
                      ID: {activeForm.id}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">
                    Customize icon, banners, difficulty, and coin/XP payouts for this game.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleResetSelectedGame}
                  disabled={saving}
                  className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-xs font-mono font-bold rounded-xl uppercase transition flex items-center gap-1.5 cursor-pointer"
                  title="Reset this game to code default"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Reset Game</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveSelectedGame}
                  disabled={saving}
                  className="px-5 py-2 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 disabled:from-gray-800 disabled:to-gray-800 text-white text-xs font-mono font-black rounded-xl uppercase tracking-wider transition shadow-lg shadow-red-950/40 flex items-center gap-2 cursor-pointer"
                >
                  {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Save Game Config</span>
                </button>
              </div>
            </div>

            {/* LIVE PREVIEW COMPONENT: HOW CARD LOOKS TO STUDENTS */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-gray-400">
                <span className="font-bold flex items-center gap-1 text-amber-400">
                  <Eye className="w-3.5 h-3.5" /> LIVE GAMING ARENA CARD PREVIEW
                </span>
                <span>(Updates instantly with your edits)</span>
              </div>

              <div className="rounded-3xl bg-[#0A0E17] border border-white/10 p-5 flex flex-col justify-between relative overflow-hidden shadow-xl max-w-md mx-auto sm:max-w-none">
                {/* Custom Banner Background if set */}
                {activeForm.customBannerUrl && (
                  <div
                    className="absolute inset-0 opacity-15 bg-cover bg-center pointer-events-none"
                    style={{ backgroundImage: `url(${activeForm.customBannerUrl})` }}
                  />
                )}
                {/* Background Subtle Gradient Glow */}
                <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl pointer-events-none opacity-40 bg-gradient-to-br ${activeForm.badgeColor}`} />

                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-12 h-12 rounded-2xl bg-black/70 border border-white/10 flex items-center justify-center text-2xl overflow-hidden shadow-md">
                        {activeForm.customIconUrl ? (
                          <img src={activeForm.customIconUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <span>{activeForm.icon}</span>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 block">
                          {activeForm.category}
                        </span>
                        <span className="text-[11px] font-mono text-gray-400">
                          {activeForm.difficulty} Tier
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {!activeForm.enabled && (
                        <span className="px-2 py-0.5 rounded-md bg-red-950/80 border border-red-500/40 text-red-300 text-[10px] font-mono font-bold uppercase">
                          MAINTENANCE
                        </span>
                      )}
                      {activeForm.featured && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-950/80 border border-rose-500/40 text-rose-300 text-[10px] font-mono font-bold uppercase">
                          FEATURED
                        </span>
                      )}
                      {activeForm.popular && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-950/80 border border-amber-500/40 text-amber-300 text-[10px] font-mono font-bold uppercase">
                          HOT
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Subtitle */}
                  <h3 className="text-base font-bold text-white">
                    {isBn ? activeForm.titleBn || activeForm.title : activeForm.title}
                  </h3>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">
                    {isBn ? activeForm.subtitleBn || activeForm.subtitle : activeForm.subtitle}
                  </p>

                  {/* Description */}
                  <p className="text-xs text-gray-300 mt-2 leading-relaxed line-clamp-2">
                    {isBn ? activeForm.descriptionBn || activeForm.description : activeForm.description}
                  </p>
                </div>

                {/* Bottom Card Footer */}
                <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-[11px] font-mono">
                    <span className="text-emerald-400 font-bold">
                      +{(activeForm.xpMultiplier * (settings.globalXpMultiplier || 1.0)).toFixed(1)}x XP
                    </span>
                    <span>•</span>
                    <span className="text-[#FFD700] font-bold">
                      🪙 +{Math.round(activeForm.coinReward * (settings.globalCoinMultiplier || 1.0))} Coins
                    </span>
                  </div>

                  <div className="px-4 py-1.5 font-mono text-xs font-black uppercase rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-md flex items-center gap-1.5">
                    <span>PLAY (PREVIEW)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* TABBED/GRID CONFIGURATION SECTIONS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/10">
              
              {/* SUBSECTION A: VISUAL ASSET MANAGEMENT (ICONS & BANNERS) */}
              <div className="space-y-4 bg-black/40 p-4 rounded-xl border border-white/5">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400 uppercase">
                  <Palette className="w-4 h-4" />
                  <span>1. Visual Assets & Icon Customization</span>
                </div>

                {/* Custom Icon Upload & File Selection */}
                <div className="space-y-2">
                  <label className="text-[11px] font-mono text-gray-300 font-bold block">
                    Upload Custom Icon Image (.png, .jpg, .svg, .webp)
                  </label>
                  
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleIconUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl text-xs font-mono font-bold text-white flex items-center gap-2 transition cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-amber-400" />
                      <span>Choose Icon File</span>
                    </button>

                    {activeForm.customIconUrl && (
                      <button
                        type="button"
                        onClick={() => setActiveForm((prev) => ({ ...prev, customIconUrl: "" }))}
                        className="text-xs font-mono text-red-400 hover:text-red-300 underline cursor-pointer"
                      >
                        Remove Custom Image
                      </button>
                    )}
                  </div>

                  {/* Direct Image URL Input */}
                  <div className="mt-2">
                    <span className="text-[10px] text-gray-500 font-mono block mb-1">
                      Or Paste Image URL (Firebase Storage / CDN / WebP):
                    </span>
                    <input
                      type="text"
                      value={activeForm.customIconUrl}
                      onChange={(e) => setActiveForm((prev) => ({ ...prev, customIconUrl: e.target.value }))}
                      placeholder="https://.../icon.png"
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Preset Medical Emojis Matrix */}
                <div className="space-y-1.5 pt-2">
                  <label className="text-[10px] font-mono text-gray-400 uppercase font-bold block">
                    Or Select Preset Icon Emoji
                  </label>
                  <div className="grid grid-cols-6 sm:grid-cols-10 gap-1.5">
                    {ICON_PRESETS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          setActiveForm((prev) => ({
                            ...prev,
                            icon: emoji,
                            customIconUrl: "", // Clear image when emoji clicked
                          }));
                          playSound("click");
                        }}
                        className={`w-8 h-8 rounded-lg text-base flex items-center justify-center transition border cursor-pointer ${
                          activeForm.icon === emoji && !activeForm.customIconUrl
                            ? "bg-amber-500/30 border-amber-400 scale-110 shadow"
                            : "bg-black/60 border-white/10 hover:border-white/30 hover:bg-white/5"
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Gradient Theme Selector */}
                <div className="space-y-1.5 pt-2">
                  <label className="text-[10px] font-mono text-gray-400 uppercase font-bold block">
                    Card Glow & Badge Gradient Theme
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                    {GRADIENT_PRESETS.map((grad) => (
                      <button
                        key={grad.value}
                        type="button"
                        onClick={() => setActiveForm((prev) => ({ ...prev, badgeColor: grad.value }))}
                        className={`p-2 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                          activeForm.badgeColor === grad.value
                            ? "border-amber-400 ring-1 ring-amber-400 bg-white/10 text-white"
                            : "border-white/5 bg-black/50 text-gray-400 hover:text-white"
                        }`}
                      >
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ background: grad.preview }} />
                        <span className="truncate">{grad.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Banner Background URL */}
                <div className="space-y-2 pt-2">
                  <label className="text-[10px] font-mono text-gray-400 uppercase font-bold block">
                    Card Background Banner / Backdrop Image
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={bannerInputRef}
                      onChange={handleBannerUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => bannerInputRef.current?.click()}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/15 border border-white/10 rounded-lg text-[11px] font-mono text-gray-200 flex items-center gap-1.5 transition cursor-pointer shrink-0"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Upload Banner</span>
                    </button>
                    <input
                      type="text"
                      value={activeForm.customBannerUrl}
                      onChange={(e) => setActiveForm((prev) => ({ ...prev, customBannerUrl: e.target.value }))}
                      placeholder="Or paste banner image URL..."
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Preset Banner Quick Chips */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar">
                    {BANNER_PRESETS.map((b) => (
                      <button
                        key={b.name}
                        type="button"
                        onClick={() => setActiveForm((prev) => ({ ...prev, customBannerUrl: b.url }))}
                        className="px-2 py-1 bg-black/50 border border-white/10 hover:border-amber-400 rounded text-[9px] font-mono text-gray-400 hover:text-white shrink-0 cursor-pointer"
                      >
                        {b.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* SUBSECTION B: DIFFICULTY, MULTIPLIERS & REWARDS CONFIGURATION */}
              <div className="space-y-4 bg-black/40 p-4 rounded-xl border border-white/5">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-yellow-400 uppercase">
                  <Coins className="w-4 h-4" />
                  <span>2. Difficulty & Reward Economics</span>
                </div>

                {/* Difficulty Selector */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-gray-300 font-bold block">
                    Game Difficulty Tier
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {(["Easy", "Medium", "Hard", "All Levels"] as const).map((diff) => (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => setActiveForm((prev) => ({ ...prev, difficulty: diff }))}
                        className={`py-2 rounded-xl text-xs font-mono font-bold uppercase transition border cursor-pointer ${
                          activeForm.difficulty === diff
                            ? "bg-amber-500 text-black border-amber-400 shadow-md"
                            : "bg-black/60 border-white/10 text-gray-400 hover:text-white"
                        }`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                </div>

                {/* XP Multiplier Slider & Input */}
                <div className="space-y-1.5 bg-black/50 p-3 rounded-xl border border-white/5">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-gray-300 font-bold">XP Multiplier</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-emerald-400 font-black">{activeForm.xpMultiplier.toFixed(1)}x</span>
                      <span className="text-[10px] text-gray-500">
                        (Effective: {(activeForm.xpMultiplier * (settings.globalXpMultiplier || 1.0)).toFixed(1)}x)
                      </span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="5.0"
                    step="0.1"
                    value={activeForm.xpMultiplier}
                    onChange={(e) => setActiveForm((prev) => ({ ...prev, xpMultiplier: parseFloat(e.target.value) }))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-gray-500">
                    <span>0.5x</span>
                    <span>1.5x (Standard)</span>
                    <span>3.0x</span>
                    <span>5.0x Max</span>
                  </div>
                </div>

                {/* Base Coin Reward Slider & Input */}
                <div className="space-y-1.5 bg-black/50 p-3 rounded-xl border border-white/5">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-gray-300 font-bold">Base Coin Reward (Payout)</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-yellow-400 font-black">+{activeForm.coinReward} Coins</span>
                      <span className="text-[10px] text-gray-500">
                        (Effective: +{Math.round(activeForm.coinReward * (settings.globalCoinMultiplier || 1.0))})
                      </span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="500"
                    step="5"
                    value={activeForm.coinReward}
                    onChange={(e) => setActiveForm((prev) => ({ ...prev, coinReward: parseInt(e.target.value) }))}
                    className="w-full accent-yellow-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-gray-500">
                    <span>10 🪙</span>
                    <span>75 🪙</span>
                    <span>200 🪙</span>
                    <span>500 🪙</span>
                  </div>
                </div>

                {/* Required Unlock Level & Min Duration */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[10px] font-mono uppercase text-gray-400 font-bold block mb-1">
                      Required Student Level
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={activeForm.requiredLevel}
                      onChange={(e) => setActiveForm((prev) => ({ ...prev, requiredLevel: parseInt(e.target.value) || 1 }))}
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase text-gray-400 font-bold block mb-1">
                      Duration / Min Seconds
                    </label>
                    <input
                      type="number"
                      min="30"
                      max="600"
                      step="10"
                      value={activeForm.minDurationSeconds}
                      onChange={(e) => setActiveForm((prev) => ({ ...prev, minDurationSeconds: parseInt(e.target.value) || 60 }))}
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Status Toggles (Enabled, Featured, Popular) */}
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveForm((prev) => ({ ...prev, enabled: !prev.enabled }))}
                    className={`p-2.5 rounded-xl border text-[10px] font-mono font-bold uppercase transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      activeForm.enabled
                        ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                        : "bg-red-950/60 border-red-500/40 text-red-300"
                    }`}
                  >
                    <span>Status</span>
                    <span className="font-black">{activeForm.enabled ? "ACTIVE" : "DISABLED"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveForm((prev) => ({ ...prev, featured: !prev.featured }))}
                    className={`p-2.5 rounded-xl border text-[10px] font-mono font-bold uppercase transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      activeForm.featured
                        ? "bg-rose-950/60 border-rose-500/40 text-rose-300"
                        : "bg-black/60 border-white/10 text-gray-400"
                    }`}
                  >
                    <span>Featured</span>
                    <span className="font-black">{activeForm.featured ? "YES" : "NO"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveForm((prev) => ({ ...prev, popular: !prev.popular }))}
                    className={`p-2.5 rounded-xl border text-[10px] font-mono font-bold uppercase transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      activeForm.popular
                        ? "bg-amber-950/60 border-amber-500/40 text-amber-300"
                        : "bg-black/60 border-white/10 text-gray-400"
                    }`}
                  >
                    <span>Popular / Hot</span>
                    <span className="font-black">{activeForm.popular ? "YES" : "NO"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* SUBSECTION C: BILINGUAL TEXT & LOCALIZATION CUSTOMIZATION */}
            <div className="space-y-4 pt-4 border-t border-white/10 bg-black/30 p-4 rounded-xl border border-white/5">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-gray-300 uppercase">
                <Tag className="w-4 h-4 text-red-400" />
                <span>3. Game Titles & Descriptions (Bilingual Support)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* English Info */}
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-mono uppercase text-gray-400 font-bold block mb-1">
                      Game Title (English)
                    </label>
                    <input
                      type="text"
                      value={activeForm.title}
                      onChange={(e) => setActiveForm((prev) => ({ ...prev, title: e.target.value }))}
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase text-gray-400 font-bold block mb-1">
                      Game Subtitle (English)
                    </label>
                    <input
                      type="text"
                      value={activeForm.subtitle}
                      onChange={(e) => setActiveForm((prev) => ({ ...prev, subtitle: e.target.value }))}
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase text-gray-400 font-bold block mb-1">
                      Description (English)
                    </label>
                    <textarea
                      rows={3}
                      value={activeForm.description}
                      onChange={(e) => setActiveForm((prev) => ({ ...prev, description: e.target.value }))}
                      className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                {/* Bengali Info */}
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-mono uppercase text-gray-400 font-bold block mb-1">
                      Game Title (Bengali / বাংলা)
                    </label>
                    <input
                      type="text"
                      value={activeForm.titleBn}
                      onChange={(e) => setActiveForm((prev) => ({ ...prev, titleBn: e.target.value }))}
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs font-sans text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase text-gray-400 font-bold block mb-1">
                      Game Subtitle (Bengali / বাংলা)
                    </label>
                    <input
                      type="text"
                      value={activeForm.subtitleBn}
                      onChange={(e) => setActiveForm((prev) => ({ ...prev, subtitleBn: e.target.value }))}
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs font-sans text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase text-gray-400 font-bold block mb-1">
                      Description (Bengali / বাংলা)
                    </label>
                    <textarea
                      rows={3}
                      value={activeForm.descriptionBn}
                      onChange={(e) => setActiveForm((prev) => ({ ...prev, descriptionBn: e.target.value }))}
                      className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs font-sans text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Save Action Button */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleResetSelectedGame}
                disabled={saving}
                className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-xs font-mono font-bold rounded-xl uppercase transition cursor-pointer"
              >
                Reset to Default
              </button>

              <button
                type="button"
                onClick={handleSaveSelectedGame}
                disabled={saving}
                className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 disabled:from-gray-800 disabled:to-gray-800 text-white text-xs font-mono font-black rounded-xl uppercase tracking-wider transition shadow-lg shadow-red-950/40 flex items-center gap-2 cursor-pointer"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Save All Changes for {activeForm.title}</span>
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
