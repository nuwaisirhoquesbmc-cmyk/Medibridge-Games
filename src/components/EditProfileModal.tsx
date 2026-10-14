import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Upload, Check, Loader2, Sparkles, User, GraduationCap, MapPin, Image as ImageIcon, Link as LinkIcon, Camera } from "lucide-react";
import { playSound } from "../audio";
import { UserProfile } from "../types";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onProfileUpdate: (updated: Partial<UserProfile>) => Promise<void>;
  language: "bn" | "en";
  theme: "light" | "dark";
}

const PRESET_SEEDS = [
  { id: "p1", name: "Anik", label: "👨‍⚕️ Dr. Anik", role: "Dr. Anik" },
  { id: "p2", name: "Maimuna", label: "👩‍⚕️ Dr. Maimuna", role: "Dr. Maimuna" },
  { id: "p3", name: "Rafsan", label: "🧑‍⚕️ Dr. Rafsan", role: "Dr. Rafsan" },
  { id: "p4", name: "Orthoped", label: "🦴 Orthopedist", role: "Orthoped" },
  { id: "p5", name: "Cardio", label: "❤️ Cardiologist", role: "Cardio" },
  { id: "p6", name: "Biophysic", label: "🔬 Biophysicist", role: "Biophysic" },
  { id: "p7", name: "Medic", label: "🩺 General Clinician", role: "Medic" },
  { id: "p8", name: "Surgon", label: "✂️ Chief Surgeon", role: "Surgon" },
];

const BANGLADESH_DIVISIONS = [
  "Dhaka", "Barishal", "Chattogram", "Khulna", "Rajshahi", "Sylhet", "Rangpur", "Mymensingh"
].sort();

export default function EditProfileModal({ isOpen, onClose, user, onProfileUpdate, language, theme }: EditProfileModalProps) {
  const isDark = theme === "dark";
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States
  const [displayName, setDisplayName] = useState(user.displayName || "");
  const [college, setCollege] = useState(user.college || "");
  const [district, setDistrict] = useState(user.district || "Dhaka");
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || "");
  
  // Tab within picture editing: preset vs upload vs url
  const [picSource, setPicSource] = useState<"preset" | "upload" | "url">("preset");
  const [customUrlInput, setCustomUrlInput] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  if (!isOpen) return null;

  // Image compressor helper
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 512;
          const MAX_HEIGHT = 512;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.95); // Compress
            resolve(dataUrl);
          } else {
            resolve(event.target?.result as string);
          }
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith("image/")) {
      setErrorMsg(language === "bn" ? "দয়া করে একটি সঠিক ইমেজ ফাইল আপলোড করুন" : "Please select a valid image file.");
      playSound("wrong");
      return;
    }

    setUploadLoading(true);
    setErrorMsg("");
    try {
      const base64Str = await compressImage(file);
      setAvatarUrl(base64Str);
      playSound("levelup");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(language === "bn" ? "ছবি লোড করতে সমস্যা হয়েছে" : "Failed to load the image.");
      playSound("wrong");
    } finally {
      setUploadLoading(false);
    }
  };

  const selectPreset = (seed: string) => {
    const url = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
    setAvatarUrl(url);
    playSound("click");
  };

  const applyCustomUrl = () => {
    if (!customUrlInput.trim().startsWith("http")) {
      setErrorMsg(language === "bn" ? "দয়া করে একটি সঠিক লিঙ্ক প্রদান করুন" : "Please enter a valid HTTP/HTTPS URL.");
      playSound("wrong");
      return;
    }
    setAvatarUrl(customUrlInput.trim());
    setErrorMsg("");
    setCustomUrlInput("");
    playSound("levelup");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!displayName.trim()) {
      setErrorMsg(language === "bn" ? "নামের ক্ষেত্রটি খালি রাখা যাবে না" : "Display Name is required.");
      playSound("wrong");
      return;
    }

    setSaving(true);
    playSound("click");

    try {
      await onProfileUpdate({
        displayName: displayName.trim(),
        college: college.trim(),
        district: district,
        avatarUrl: avatarUrl,
      });

      setSuccessMsg(language === "bn" ? "প্রোফাইল সফলভাবে আপডেট করা হয়েছে!" : "Profile details saved successfully!");
      playSound("victory");
      
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(language === "bn" ? "আপডেট করতে ব্যর্থ হয়েছে। ইন্টারনেট চেক করুন।" : "Failed to update profile. Please check connection.");
      playSound("wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto select-none">
        
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        ></motion.div>

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className={`w-full max-w-lg rounded-2xl relative overflow-hidden shadow-2xl border z-10 ${
            isDark ? "bg-[#111111] border-white/10 text-white" : "bg-white border-red-100 text-slate-800"
          }`}
        >
          {/* Header Banner */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#C1121F] via-[#FFD700] to-[#C1121F] z-10"></div>
          
          <div className={`p-6 flex justify-between items-center border-b ${isDark ? "border-white/5" : "border-red-100/50"}`}>
            <div>
              <h2 className="font-extrabold text-lg uppercase flex items-center gap-2 font-display">
                <Camera className="w-5 h-5 text-[#C1121F]" />
                <span>
                  {language === "bn" ? "প্রোফাইল সংশোধন করুন" : "EDIT VISOR PROFILE"}
                </span>
              </h2>
              <p className={`text-[10px] uppercase font-mono tracking-wider mt-0.5 ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                {language === "bn" ? "ক্যান্ডিডেট একাডেমীক ও ভিজ্যুয়াল ডিটেইলস" : "CANDIDATE ADMISSION IDENTITY PANEL"}
              </p>
            </div>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors border cursor-pointer ${
                isDark 
                  ? "border-white/5 hover:bg-white/5 text-gray-400 hover:text-white" 
                  : "border-gray-200 hover:bg-slate-100 text-slate-500 hover:text-black"
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSave} className="p-6 flex flex-col gap-5 max-h-[80vh] overflow-y-auto">
            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl p-3 text-xs font-semibold">
                ⚠️ {errorMsg}
              </div>
            )}
            
            {successMsg && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl p-3 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4" />
                {successMsg}
              </div>
            )}

            {/* Profile Pic Selector Layout */}
            <div className="flex flex-col gap-3">
              <label className={`text-[10px] font-mono font-bold uppercase tracking-wider block ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                {language === "bn" ? "প্রোফাইল ছবি নির্বাচন" : "CHOOSE AVATAR VISUAL"}
              </label>

              <div className="flex flex-col sm:flex-row items-center gap-5 bg-black/10 dark:bg-black/40 border border-white/5 p-4 rounded-2xl">
                
                {/* Active Avatar Preview Node */}
                <div className="relative group shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-yellow-500 rounded-full blur-sm opacity-60"></div>
                  <img
                    src={avatarUrl}
                    alt="avatar-preview"
                    className="w-20 h-20 rounded-full border-2 border-yellow-400 relative z-10 shrink-0 bg-gradient-to-b from-gray-900 to-black p-1 object-cover"
                  />
                  {uploadLoading && (
                    <div className="absolute inset-0 bg-black/60 rounded-full z-20 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-yellow-400" />
                    </div>
                  )}
                </div>

                {/* Switch Source Options Tabs */}
                <div className="w-full flex flex-col gap-3">
                  <div className={`grid grid-cols-3 p-1 rounded-xl text-center text-xs font-mono font-semibold ${
                    isDark ? "bg-[#181818]" : "bg-slate-100"
                  }`}>
                    <button
                      type="button"
                      onClick={() => setPicSource("preset")}
                      className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                        picSource === "preset"
                          ? isDark ? "bg-black/60 text-yellow-400" : "bg-white text-rose-800 shadow-sm"
                          : "text-gray-450 hover:text-black dark:hover:text-white"
                      }`}
                    >
                      {language === "bn" ? "প্রিসেট" : "Presets"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPicSource("upload")}
                      className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                        picSource === "upload"
                          ? isDark ? "bg-black/60 text-yellow-400" : "bg-white text-rose-800 shadow-sm"
                          : "text-gray-450 hover:text-black dark:hover:text-white"
                      }`}
                    >
                      {language === "bn" ? "আপলোড" : "Upload"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPicSource("url")}
                      className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                        picSource === "url"
                          ? isDark ? "bg-black/60 text-yellow-400" : "bg-white text-rose-800 shadow-sm"
                          : "text-gray-450 hover:text-black dark:hover:text-white"
                      }`}
                    >
                      {language === "bn" ? "লিঙ্ক" : "URL"}
                    </button>
                  </div>

                  {/* Pic Tab Contents */}
                  <div className="min-h-[50px] flex items-center justify-center">
                    {picSource === "preset" && (
                      <div className="grid grid-cols-4 gap-2 w-full max-h-[85px] overflow-y-auto pr-1">
                        {PRESET_SEEDS.map((p) => {
                          const seedUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`;
                          const isSelected = avatarUrl === seedUrl;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => selectPreset(p.name)}
                              className={`p-1 rounded-xl border relative overflow-hidden transition hover:scale-105 shrink-0 bg-black/10 cursor-pointer ${
                                isSelected 
                                  ? "border-yellow-400 shadow-[0_0_8px_rgba(234,179,8,0.4)]" 
                                  : "border-white/5 hover:border-white/20"
                              }`}
                              title={p.label}
                            >
                              <img src={seedUrl} alt="seed-icon" className="w-8 h-8 mx-auto" />
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {picSource === "upload" && (
                      <div className="w-full">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                          className="hidden"
                          accept="image/*"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadLoading}
                          className={`w-full py-2 px-3 border border-dashed rounded-xl flex items-center justify-center gap-2 text-xs font-semibold transition cursor-pointer ${
                            isDark 
                              ? "border-white/10 hover:border-white/35 text-gold hover:bg-white/5" 
                              : "border-gray-200 hover:border-rose-450 text-rose-800 hover:bg-rose-50/50"
                          }`}
                        >
                          <Upload className="w-4 h-4 text-[#C1121F]" />
                          <span>
                            {uploadLoading 
                              ? (language === "bn" ? "আপলোড হচ্ছে..." : "COMPRESSING...")
                              : (language === "bn" ? "কম্পিউটার/মোবাইল থেকে আপলোড" : "CHOOSE FILE FROM DEVICE")}
                          </span>
                        </button>
                      </div>
                    )}

                    {picSource === "url" && (
                      <div className="flex gap-2 w-full">
                        <input
                          type="text"
                          placeholder="https://example.com/photo.jpg"
                          value={customUrlInput}
                          onChange={(e) => setCustomUrlInput(e.target.value)}
                          className={`flex-1 text-xs px-3 py-2 rounded-xl outline-none border focus:ring-1 focus:ring-[#C1121F] font-mono ${
                            isDark ? "bg-[#181818] border-white/10" : "bg-slate-50 border-gray-200"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={applyCustomUrl}
                          className="px-3 py-2 bg-[#C1121F] text-white hover:bg-rose-850 rounded-xl text-xs font-black uppercase tracking-wider transition font-display cursor-pointer"
                        >
                          Apply
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Candidate Details Fields */}
            <div className="flex flex-col gap-4">
              {/* Display Name Input */}
              <div className="flex flex-col gap-1.5">
                <label className={`text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                  isDark ? "text-gray-400" : "text-slate-500"
                }`}>
                  <User className="w-3.5 h-3.5 text-[#C1121F]" />
                  <span>{language === "bn" ? "ক্যান্ডিডেট নাম (DisplayName)" : "Candidate Display Name"}</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={language === "bn" ? "আপনার পুরো নাম লিখুন" : "Enter your full display name"}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={`w-full text-sm px-4 py-3 rounded-xl outline-none border transition-colors focus:border-[#C1121F] font-semibold ${
                    isDark 
                      ? "bg-[#111111] border-white/10 text-white focus:bg-black" 
                      : "bg-slate-50 border-gray-200 text-slate-950 focus:bg-white"
                  }`}
                />
              </div>

              {/* College affiliation input */}
              <div className="flex flex-col gap-1.5">
                <label className={`text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                  isDark ? "text-gray-400" : "text-slate-500"
                }`}>
                  <GraduationCap className="w-3.5 h-3.5 text-[#FFD700]" />
                  <span>{language === "bn" ? "কলেজ / ইনস্টিটিউশন" : "College or Institution"}</span>
                </label>
                <input
                  type="text"
                  placeholder={language === "bn" ? "যেমন: নটর ডেম কলেজ" : "e.g. Notre Dame College"}
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  className={`w-full text-sm px-4 py-3 rounded-xl outline-none border transition-colors focus:border-[#C1121F] font-semibold ${
                    isDark 
                      ? "bg-[#111111] border-white/10 text-white focus:bg-black" 
                      : "bg-slate-50 border-gray-200 text-slate-950 focus:bg-white"
                  }`}
                />
              </div>

              {/* District sector select */}
              <div className="flex flex-col gap-1.5">
                <label className={`text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                  isDark ? "text-gray-400" : "text-slate-500"
                }`}>
                  <MapPin className="w-3.5 h-3.5 text-[#C1121F]" />
                  <span>{language === "bn" ? "বিভাগীয় কোর অঞ্চল (Division Core)" : "Division Core Territory"}</span>
                </label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className={`w-full text-sm px-4 py-3 rounded-xl outline-none border transition-colors focus:border-[#C1121F] font-semibold cursor-pointer ${
                    isDark 
                      ? "bg-[#111111] border-white/10 text-white focus:bg-black" 
                      : "bg-slate-50 border-gray-200 text-slate-950 focus:bg-white"
                  }`}
                >
                  {BANGLADESH_DIVISIONS.map((dst) => (
                    <option key={dst} value={dst}>
                      {dst} {language === "bn" ? "বিভাগীয় কোর" : "Division Core"}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Footer buttons */}
            <div className={`flex items-center justify-end gap-3 border-t pt-5 mt-3 ${isDark ? "border-white/5" : "border-red-100/50"}`}>
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase transition border cursor-pointer ${
                  isDark 
                    ? "border-white/10 hover:bg-white/5 text-gray-400 hover:text-white" 
                    : "border-gray-200 hover:bg-slate-100 text-slate-500 hover:text-slate-900"
                }`}
                disabled={saving}
              >
                {language === "bn" ? "বাতিল" : "Cancel"}
              </button>
              
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-[#C1121F] hover:bg-rose-800 disabled:opacity-55 active:scale-97 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_4px_12px_rgba(193,18,31,0.2)] flex items-center gap-2 font-display cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{language === "bn" ? "সংরক্ষণ করা হচ্ছে..." : "SAVING PROFILE..."}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{language === "bn" ? "সংরক্ষণ করুন" : "SAVE BIO DETAILS"}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
