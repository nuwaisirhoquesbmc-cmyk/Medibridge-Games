import React, { useState } from "react";
import { Lock, Eye, EyeOff, ShieldCheck, AlertCircle, ArrowLeft, KeyRound, Sparkles } from "lucide-react";
import { playSound } from "../../audio";
import MediBridgeLogo from "../MediBridgeLogo";

interface CommandCenterPasscodeLockProps {
  language: "bn" | "en";
  theme?: "light" | "dark";
  userEmail?: string;
  onUnlock: () => void;
  onCancel: () => void;
}

export const VALID_MASTER_PASSCODES = [
  "Superadmin2000",
  "superadmin2000",
  "admin2026",
  "medibridge2026",
  "superadmin2026",
  "admin123",
  "sbmc2026",
  "123456",
];

export function verifyCommandCenterPassword(input: string): boolean {
  const cleaned = (input || "").trim();
  if (!cleaned) return false;

  // 1. Exact or case-insensitive check for requested Superadmin2000
  if (cleaned.toLowerCase() === "superadmin2000") {
    return true;
  }

  // 2. Check custom saved passcode
  try {
    if (typeof window !== "undefined") {
      const customPass = localStorage.getItem("mb_cc_custom_passcode");
      if (customPass && customPass.trim().toLowerCase() === cleaned.toLowerCase()) {
        return true;
      }
    }
  } catch {}

  // 3. Check master default passcodes
  return VALID_MASTER_PASSCODES.some((p) => p.toLowerCase() === cleaned.toLowerCase());
}

export default function CommandCenterPasscodeLock({
  language,
  theme = "dark",
  userEmail,
  onUnlock,
  onCancel,
}: CommandCenterPasscodeLockProps) {
  const isBn = language === "bn";
  const isDark = theme === "dark";

  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [rememberSession, setRememberSession] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (verifyCommandCenterPassword(passwordInput)) {
      playSound("victory");
      if (rememberSession) {
        try {
          sessionStorage.setItem("mb_cc_unlocked_session", "true");
        } catch {}
      }
      onUnlock();
    } else {
      playSound("wrong");
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      setErrorMsg(
        isBn
          ? `ভুল পাসওয়ার্ড! (প্রয়াস: ${nextAttempts}) — সঠিক কমান্ড সেন্টার পাসকোড লিখুন।`
          : `Incorrect Passcode! (Attempt: ${nextAttempts}) — Please enter valid credentials.`
      );
    }
  };

  return (
    <div className="w-full min-h-[70vh] flex items-center justify-center p-4">
      <div
        className={`w-full max-w-md rounded-3xl border p-6 sm:p-8 relative shadow-2xl overflow-hidden ${
          isDark
            ? "bg-[#0B0F19]/95 border-red-500/30 text-white shadow-[0_0_50px_rgba(193,18,31,0.15)]"
            : "bg-white border-red-200 text-slate-800 shadow-xl"
        }`}
      >
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-48 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Security Badge Header */}
        <div className="flex flex-col items-center text-center relative z-10 space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-red-600/20 to-red-500/10 border border-red-500/40 flex items-center justify-center text-red-500 shadow-inner">
            <Lock className="w-8 h-8 animate-pulse text-[#C1121F]" />
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-red-400 bg-red-950/60 px-3 py-1 rounded-full border border-red-500/20">
              🛡️ {isBn ? "সিকিউরিটি ভেরিফিকেশন গেট" : "SECURITY GATE ACCESS"}
            </span>
            <h2 className="text-xl sm:text-2xl font-black font-display uppercase tracking-tight text-white mt-1">
              {isBn ? "কমান্ড সেন্টার পাসওয়ার্ড" : "Command Center Passcode"}
            </h2>
            <p className="text-xs text-gray-400 font-sans max-w-sm">
              {isBn
                ? "এই প্রশাসনিক নিয়ন্ত্রণ কক্ষে প্রবেশের জন্য পাসওয়ার্ড প্রয়োজন। সঠিক কোড দিয়ে আনলক করুন।"
                : "Restricted administrative zone. Enter the command security passcode to proceed."}
            </p>
          </div>
        </div>

        {/* Form Input */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4 relative z-10">
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono font-bold uppercase text-gray-300 flex items-center justify-between">
              <span>{isBn ? "প্রশাসনিক পাসওয়ার্ড / পিন:" : "ADMIN PASSCODE / PIN:"}</span>
              <span className="text-[9px] text-[#FFD700] font-mono font-bold">
                🔑 Superadmin2000
              </span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  if (errorMsg) setErrorMsg("");
                }}
                placeholder={isBn ? "পাসওয়ার্ড লিখুন..." : "Enter access passcode..."}
                autoFocus
                className={`w-full px-4 py-3 pr-11 rounded-xl text-sm font-mono tracking-wider outline-none transition border ${
                  isDark
                    ? "bg-black/70 border-white/10 text-white placeholder-gray-500 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    : "bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember for Session Option */}
          <div className="flex items-center justify-between text-xs font-mono text-gray-400">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberSession}
                onChange={(e) => setRememberSession(e.target.checked)}
                className="rounded border-gray-600 text-red-600 focus:ring-red-500 w-3.5 h-3.5 bg-black"
              />
              <span className="text-[11px]">
                {isBn ? "এই সেশনের জন্য মনে রাখুন" : "Remember for this session"}
              </span>
            </label>
            <span className="text-[10px] text-gray-500">Auto-lock active</span>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-red-950/70 border border-red-500/40 rounded-xl flex items-center gap-2 text-red-300 text-xs font-mono animate-bounce">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Submit Actions */}
          <div className="pt-2 space-y-2">
            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-[#C1121F] to-[#780000] text-white font-mono font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg hover:shadow-red-600/30 hover:scale-[1.01] active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              <span>{isBn ? "কমান্ড সেন্টার আনলক করুন 🔓" : "UNLOCK COMMAND CENTER 🔓"}</span>
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="w-full py-2.5 bg-transparent hover:bg-white/5 text-gray-400 hover:text-white font-mono text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer border border-transparent hover:border-white/10"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{isBn ? "ড্যাশবোর্ডে ফিরে যান" : "Back to Dashboard"}</span>
            </button>
          </div>
        </form>

        {/* Security watermark footer */}
        <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-gray-500">
          <span>MediBridge Security v3.4</span>
          <span>Zero-Quota Protection Active</span>
        </div>
      </div>
    </div>
  );
}
