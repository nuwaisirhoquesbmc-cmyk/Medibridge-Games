import React, { useState } from "react";
import {
  ExternalLink,
  Globe,
  Settings,
  X,
  Maximize2,
  Minimize2,
  RotateCw,
  Copy,
  Check,
  Sparkles,
  Gamepad2,
  ShieldAlert,
  ArrowRight
} from "lucide-react";
import { playSound } from "../../audio";

export interface ExternalWebGameConfig {
  enabled: boolean;
  titleBn: string;
  titleEn: string;
  descriptionBn: string;
  descriptionEn: string;
  url: string;
  embedAllowed?: boolean;
}

export const DEFAULT_EXTERNAL_GAME: ExternalWebGameConfig = {
  enabled: true,
  titleBn: "বায়োডিজিটাল ৩D হিউম্যান অ্যানাটমি ও ভার্চুয়াল ল্যাব",
  titleEn: "BioDigital 3D Anatomy & Virtual Medical Lab",
  descriptionBn: "একটি আলাদা পূর্ণাঙ্গ ৩D ওয়েব সিমুলেশনে মানবদেহের অঙ্গসংস্থান ও শারীরতত্ত্ব লাইভ পরীক্ষা করুন।",
  descriptionEn: "Interactive 3D medical anatomy web portal and virtual clinical simulation.",
  url: "https://human.biodigital.com",
  embedAllowed: true,
};

export const EXTERNAL_GAME_PRESETS = [
  {
    name: "BioDigital 3D Anatomy Lab",
    url: "https://human.biodigital.com",
    titleBn: "বায়োডিজিটাল ৩D হিউম্যান অ্যানাটমি ও ভার্চুয়াল ল্যাব",
    titleEn: "BioDigital 3D Anatomy & Virtual Medical Lab",
    descBn: "৩D মানবদেহের অঙ্গ ও ফিজিওলজি সিমুলেশন ওয়েব পোর্টাল।",
    descEn: "Full 3D human anatomy and physiology virtual simulation.",
  },
  {
    name: "PhET Membrane Transport Sim",
    url: "https://phet.colorado.edu/sims/html/membrane-transport/latest/membrane-transport_all.html",
    titleBn: "কোষঝিল্লি ও অনু পরিবহন সিমুলেশন (PhET)",
    titleEn: "Cell Membrane Transport Interactive Simulation",
    descBn: "কোষীয় ঝিল্লির মধ্য দিয়ে অণু চলাচল এবং সক্রিয় পরিবহন সিমুলেশন।",
    descEn: "Interactive cell membrane biology simulation.",
  },
  {
    name: "Kahoot Live Tournament Web",
    url: "https://kahoot.it",
    titleBn: "কাহুট লাইভ ব্যাচ টুর্নামেন্ট পোর্টাল",
    titleEn: "Kahoot Live Tournament Portal",
    descBn: "লাইভ পিন কোড দিয়ে বহিরাগত মাল্টিপ্লেয়ার কুইজে অংশ নিন।",
    descEn: "Join live multiplayer quizzes with game PIN.",
  },
  {
    name: "Quizizz Medical Arena",
    url: "https://quizizz.com/join",
    titleBn: "কুইজিজ স্পিড মাল্টিপ্লেয়ার এরেনা",
    titleEn: "Quizizz Speed Multiplayer Arena",
    descBn: "লাইভ কোড দিয়ে রিয়েল-টাইম প্রতিযোগিতায় যোগ দিন।",
    descEn: "Compete with live game codes.",
  },
];

interface ExternalGamingWebModalProps {
  isOpen: boolean;
  config: ExternalWebGameConfig;
  language: "bn" | "en";
  isAdmin?: boolean;
  onClose: () => void;
  onSaveConfig: (updated: ExternalWebGameConfig) => void;
}

export default function ExternalGamingWebModal({
  isOpen,
  config,
  language,
  isAdmin = false,
  onClose,
  onSaveConfig,
}: ExternalGamingWebModalProps) {
  if (!isOpen) return null;

  const isBn = language === "bn";
  const [activeMode, setActiveMode] = useState<"embed" | "settings">("embed");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [copied, setCopied] = useState(false);

  // Edit states
  const [editUrl, setEditUrl] = useState(config.url || DEFAULT_EXTERNAL_GAME.url);
  const [editTitleBn, setEditTitleBn] = useState(config.titleBn || DEFAULT_EXTERNAL_GAME.titleBn);
  const [editTitleEn, setEditTitleEn] = useState(config.titleEn || DEFAULT_EXTERNAL_GAME.titleEn);
  const [editDescBn, setEditDescBn] = useState(config.descriptionBn || DEFAULT_EXTERNAL_GAME.descriptionBn);
  const [editDescEn, setEditDescEn] = useState(config.descriptionEn || DEFAULT_EXTERNAL_GAME.descriptionEn);
  const [editEmbed, setEditEmbed] = useState(config.embedAllowed !== false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleLaunchExternalTab = () => {
    playSound("click");
    try {
      window.open(config.url, "_blank", "noopener,noreferrer");
    } catch {
      window.location.href = config.url;
    }
  };

  const handleCopyLink = () => {
    playSound("click");
    try {
      navigator.clipboard.writeText(config.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: ExternalWebGameConfig = {
      enabled: true,
      url: editUrl.trim(),
      titleBn: editTitleBn.trim(),
      titleEn: editTitleEn.trim(),
      descriptionBn: editDescBn.trim(),
      descriptionEn: editDescEn.trim(),
      embedAllowed: editEmbed,
    };
    onSaveConfig(updated);
    setSaveSuccess(true);
    playSound("victory");
    setTimeout(() => {
      setSaveSuccess(false);
      setActiveMode("embed");
    }, 1200);
  };

  const handleApplyPreset = (preset: typeof EXTERNAL_GAME_PRESETS[0]) => {
    playSound("click");
    setEditUrl(preset.url);
    setEditTitleBn(preset.titleBn);
    setEditTitleEn(preset.titleEn);
    setEditDescBn(preset.descBn);
    setEditDescEn(preset.descEn);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-1.5 sm:p-4">
      <div
        className={`w-full rounded-2xl sm:rounded-3xl bg-[#0A0D14] border border-[#FFD700]/30 shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
          isFullscreen ? "h-[99vh] max-w-[99vw]" : "h-[94vh] sm:h-[88vh] max-w-5xl"
        }`}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-3 py-2.5 sm:px-5 sm:py-3.5 bg-black/60 border-b border-white/10 shrink-0 gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Globe className="w-4 h-4 sm:w-5 sm:h-5 animate-spin-slow" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-wider text-[#FFD700] bg-amber-950/70 px-1.5 sm:px-2 py-0.5 rounded border border-amber-500/30 shrink-0">
                  {isBn ? "ওয়েব লিংক" : "WEB"}
                </span>
                <span className="text-xs sm:text-sm font-bold text-white truncate max-w-[110px] xs:max-w-[160px] sm:max-w-md">
                  {isBn ? config.titleBn : config.titleEn}
                </span>
              </div>
              <span className="text-[9px] sm:text-[10px] font-mono text-gray-400 block truncate max-w-[140px] sm:max-w-md">
                {config.url}
              </span>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              onClick={handleLaunchExternalTab}
              className="px-2.5 py-1.5 sm:px-3 sm:py-1.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-mono font-bold text-[10px] sm:text-[11px] uppercase rounded-xl hover:scale-105 transition flex items-center gap-1 sm:gap-1.5 shadow"
              title={isBn ? "নতুন ট্যাবে খুলুন" : "Open in new window"}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{isBn ? "নতুন ট্যাবে খুলুন" : "Open In Tab"}</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="p-1.5 sm:p-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl transition"
              title={isBn ? "লিংক কপি করুন" : "Copy Link"}
            >
              {copied ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            </button>

            <button
              onClick={() => setIframeKey((k) => k + 1)}
              className="p-1.5 sm:p-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl transition"
              title={isBn ? "রিলোড করুন" : "Reload"}
            >
              <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            <button
              onClick={() => setActiveMode(activeMode === "settings" ? "embed" : "settings")}
              className={`p-1.5 sm:p-2 rounded-xl transition ${
                activeMode === "settings"
                  ? "bg-[#FFD700] text-black"
                  : "bg-white/5 hover:bg-white/10 text-gray-300"
              }`}
              title={isBn ? "সেটিংস ও লিংক কনফিগারেশন" : "Configure Link"}
            >
              <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="hidden sm:flex p-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl transition"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={() => {
                playSound("click");
                onClose();
              }}
              className="p-1.5 sm:p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 relative overflow-hidden bg-black">
          {activeMode === "embed" ? (
            <div className="w-full h-full flex flex-col relative">
              {/* Notice top banner */}
              <div className="bg-amber-950/40 border-b border-amber-500/20 px-4 py-1.5 flex items-center justify-between text-[11px] font-mono text-gray-300">
                <span>
                  💡 {isBn ? "ওয়েব অ্যাপটি সরাসরি নিচে লোড হয়েছে। কোনো সাইট ফ্রেম ব্লক করলে উপরের 'নতুন ট্যাবে খুলুন' বোতাম চাপুন।" : "Embedded portal loaded below. If iframe is blocked by site security, click 'Open In Tab'."}
                </span>
                <button
                  onClick={handleLaunchExternalTab}
                  className="text-[#FFD700] hover:underline flex items-center gap-1 font-bold ml-2"
                >
                  <span>Launch Web</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              {/* Iframe View */}
              <iframe
                key={iframeKey}
                src={config.url}
                title="External Gaming Portal"
                className="w-full flex-1 border-0 bg-white"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
              />
            </div>
          ) : (
            /* Settings Mode */
            <div className="w-full h-full overflow-y-auto p-6 sm:p-8 space-y-6 max-w-3xl mx-auto text-white">
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#FFD700] bg-amber-950/70 px-3 py-1 rounded-full border border-amber-500/30">
                  ⚙️ {isBn ? "গেমিং অ্যারেনা আলাদা ওয়েব লিংক কনফিগারেশন" : "EXTERNAL ARENA WEB CONFIGURATION"}
                </span>
                <h3 className="text-xl font-black font-display uppercase tracking-tight text-white mt-2">
                  {isBn ? "যেকোনো আলাদা ওয়েব অ্যাপ বা গেম যুক্ত করুন" : "Link Any External Web Portal or Game"}
                </h3>
                <p className="text-xs text-gray-400">
                  {isBn
                    ? "শিক্ষার্থীদের জন্য যেকোনো আলাদা অনলাইন গেম, ৩D মেডিকেল সিমুলেশন, কাহুট বা কুইজ পোর্টাল সরাসরি লিংক করে রাখুন।"
                    : "Configure external web games, 3D bio simulations, or Kahoot tournament portals for all students."}
                </p>
              </div>

              {/* Quick Presets */}
              <div className="space-y-2">
                <label className="text-[11px] font-mono font-bold uppercase text-gray-400">
                  {isBn ? "প্রস্তুতকৃত লিংক প্রিসেটসমূহ (এক ক্লিকে সেট করুন):" : "QUICK PRESETS (1-CLICK LOAD):"}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {EXTERNAL_GAME_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyPreset(p)}
                      className={`p-3 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
                        editUrl === p.url
                          ? "bg-amber-500/20 border-[#FFD700] text-white"
                          : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold block">{p.name}</span>
                        <span className="text-[10px] text-gray-400 block truncate max-w-[200px]">{p.url}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-amber-400 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Input */}
              <form onSubmit={handleSave} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono font-bold uppercase text-gray-300">
                    {isBn ? "ওয়েব লিংক URL (সরাসরি ওয়েবসাইট লিঙ্ক):" : "TARGET WEB URL:"}
                  </label>
                  <input
                    type="url"
                    required
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                    placeholder="https://your-game-web-app.com"
                    className="w-full px-4 py-2.5 rounded-xl text-xs font-mono bg-black/80 border border-white/10 text-white focus:border-[#FFD700] outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono font-bold uppercase text-gray-300">
                      {isBn ? "শিরোনাম (বাংলা):" : "TITLE (BANGLA):"}
                    </label>
                    <input
                      type="text"
                      required
                      value={editTitleBn}
                      onChange={(e) => setEditTitleBn(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl text-xs bg-black/80 border border-white/10 text-white focus:border-[#FFD700] outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono font-bold uppercase text-gray-300">
                      {isBn ? "শিরোনাম (ইংরেজি):" : "TITLE (ENGLISH):"}
                    </label>
                    <input
                      type="text"
                      required
                      value={editTitleEn}
                      onChange={(e) => setEditTitleEn(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl text-xs bg-black/80 border border-white/10 text-white focus:border-[#FFD700] outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono font-bold uppercase text-gray-300">
                    {isBn ? "বিবরণ (বাংলা):" : "DESCRIPTION (BANGLA):"}
                  </label>
                  <textarea
                    rows={2}
                    value={editDescBn}
                    onChange={(e) => setEditDescBn(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl text-xs bg-black/80 border border-white/10 text-white focus:border-[#FFD700] outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="embedCheck"
                    checked={editEmbed}
                    onChange={(e) => setEditEmbed(e.target.checked)}
                    className="rounded bg-black border-white/20 text-amber-500 w-4 h-4"
                  />
                  <label htmlFor="embedCheck" className="text-xs text-gray-300 font-mono cursor-pointer">
                    {isBn ? "অ্যারেনা ফ্রেমের ভেতরে এমবেড প্লেয়ার সমর্থন করুন" : "Allow in-arena iframe embedding"}
                  </label>
                </div>

                {saveSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>{isBn ? "লিংক সফলভাবে সংরক্ষিত হয়েছে!" : "Web game link successfully saved and synchronized!"}</span>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-3">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-mono font-bold text-xs uppercase rounded-xl hover:scale-105 transition shadow cursor-pointer"
                  >
                    {isBn ? "সেভ করুন ও আপডেট করুন 💾" : "SAVE & APPLY LINK 💾"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMode("embed")}
                    className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-gray-300 rounded-xl text-xs font-mono uppercase transition cursor-pointer"
                  >
                    {isBn ? "প্লেয়ারে ফিরে যান" : "Back to Player"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
