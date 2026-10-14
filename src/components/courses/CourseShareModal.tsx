import React, { useState } from "react";
import {
  Share2,
  Copy,
  Check,
  MessageCircle,
  Facebook,
  Send,
  Mail,
  QrCode,
  Sparkles,
  ExternalLink,
  X,
  Smartphone
} from "lucide-react";
import { Course, Batch } from "../../types/courseTypes";
import { playSound } from "../../audio";

interface CourseShareModalProps {
  course: Course;
  batch?: Batch | null;
  isOpen?: boolean;
  onClose: () => void;
  language: "bn" | "en";
  theme?: "light" | "dark";
}

export default function CourseShareModal({
  course,
  batch,
  isOpen = true,
  onClose,
  language,
  theme = "dark"
}: CourseShareModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPromo, setCopiedPromo] = useState(false);
  const [showQr, setShowQr] = useState(false);

  if (!isOpen || !course) return null;

  const isBn = language === "bn";
  const origin =
    typeof window !== "undefined" && window.location
      ? window.location.origin || `${window.location.protocol}//${window.location.host}`
      : "https://medibridge.app";
  const shareUrl = `${origin}/?course=${encodeURIComponent(course.id)}`;

  const currentPrice = batch?.price || course.discountedPrice || course.originalPrice;
  const originalPrice = batch?.originalPrice || course.originalPrice;

  // Formatted Promotional Post Text for Social Media
  const promoText = `🩺 MediBridge Academy - ${course.title}
━━━━━━━━━━━━━━━━━━━━━━━━━━
${course.shortDescription || "মেডিকেল ভর্তি প্রস্তুতির নির্ভরযোগ্য প্ল্যাটফর্ম।"}

🌟 কোর্সের প্রধান বৈশিষ্ট্যসমূহ:
• লাইভ ইন্টারেক্টিভ ক্লাস: ${course.totalClasses}+
• স্ট্যান্ডার্ড মডেল টেস্ট ও এক্সাম: ${course.totalExams}+
• প্রিন্টেড/ডিজিটাল লেকচার ম্যাটেরিয়ালস: ${course.totalMaterials}+
• ইন্সট্রাক্টর: ${course.instructorName} (${course.instructorTitle})

💰 কোর্স ফি: ৳${currentPrice}${originalPrice > currentPrice ? ` (পূর্বমূল্য: ৳${originalPrice})` : ""}
🔗 এখনই বিস্তারিত দেখুন ও এনরোল করুন:
👉 ${shareUrl}

#MediBridge #MedicalAdmission #MAT2026 #MedicalPreparation`;

  const handleCopyLink = async () => {
    playSound("click");
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    } catch (e) {
      console.warn("Clipboard copy failed:", e);
    }
  };

  const handleCopyPromo = async () => {
    playSound("click");
    try {
      await navigator.clipboard.writeText(promoText);
      setCopiedPromo(true);
      setTimeout(() => setCopiedPromo(false), 3000);
    } catch (e) {
      console.warn("Clipboard copy failed:", e);
    }
  };

  const handleNativeShare = async () => {
    playSound("click");
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `MediBridge - ${course.title}`,
          text: `মেডিকেল ভর্তি প্রস্তুতির বিশেষ কোর্স: ${course.title} (ফি: ৳${currentPrice})`,
          url: shareUrl
        });
      } catch (err) {
        // User cancelled or share not supported
      }
    } else {
      handleCopyLink();
    }
  };

  // WhatsApp Share URL
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    `🩺 *MediBridge Academy* - ${course.title}\nকোর্স ফি: ৳${currentPrice}\n\nবিস্তারিত দেখুন ও এনরোল করুন:\n${shareUrl}`
  )}`;

  // Facebook Sharer URL
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;

  // Telegram Share URL
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(
    `🩺 MediBridge: ${course.title} - মেডিকেল ভর্তি প্রস্তুতি কোর্স (ফি: ৳${currentPrice})`
  )}`;

  // Mail Share URL
  const mailUrl = `mailto:?subject=${encodeURIComponent(`MediBridge Course: ${course.title}`)}&body=${encodeURIComponent(promoText)}`;

  // Simple clean SVG QR Code representation for the URL
  const qrSvgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(shareUrl)}&color=ffd700&bgcolor=141414&margin=2`;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#141414] border border-white/20 rounded-3xl p-6 sm:p-7 max-w-lg w-full space-y-5 shadow-2xl relative font-sans text-white animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#C1121F]/20 text-[#C1121F] border border-[#C1121F]/30">
              <Share2 className="w-5 h-5 text-[#FFD700]" />
            </div>
            <div>
              <h3 className="text-base font-black text-white uppercase font-display flex items-center gap-2">
                <span>{isBn ? "কোর্স লিংক ও সোশ্যাল শেয়ার" : "Share Course Link"}</span>
                <span className="text-[10px] bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/40 px-2 py-0.5 rounded font-mono">
                  1-Click
                </span>
              </h3>
              <p className="text-[11px] text-gray-400 font-mono line-clamp-1">{course.title}</p>
            </div>
          </div>
          <button
            onClick={() => {
              playSound("click");
              onClose();
            }}
            className="p-1.5 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Course Mini Preview Badge */}
        <div className="flex items-center gap-3 bg-black/50 p-3 rounded-2xl border border-white/10">
          <img
            src={course.thumbnail}
            alt={course.title}
            className="w-16 h-12 object-cover rounded-xl border border-white/10 shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-white line-clamp-1">{course.title}</h4>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-mono font-black text-[#FFD700]">৳{currentPrice}</span>
              {originalPrice > currentPrice && (
                <span className="text-[10px] font-mono text-gray-500 line-through">৳{originalPrice}</span>
              )}
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 font-mono">
                {isBn ? "ভর্তি চলছে" : "Enroll Open"}
              </span>
            </div>
          </div>
        </div>

        {/* Direct Link Copy Box */}
        <div className="space-y-1.5 font-mono">
          <label className="text-[11px] font-bold text-gray-300 uppercase flex items-center justify-between">
            <span>{isBn ? "কোর্সের ডিরেক্ট লিংক:" : "Direct Course URL:"}</span>
            {copiedLink && (
              <span className="text-emerald-400 text-[10px] flex items-center gap-1 font-bold">
                <Check className="w-3 h-3" /> {isBn ? "লিংক কপি হয়েছে!" : "Link Copied!"}
              </span>
            )}
          </label>
          <div className="flex items-center gap-2 bg-black/80 border border-white/20 rounded-xl p-1.5 pl-3">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="bg-transparent text-xs text-gray-300 font-mono flex-1 outline-none truncate"
            />
            <button
              onClick={handleCopyLink}
              className={`px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition cursor-pointer ${
                copiedLink
                  ? "bg-emerald-600 text-white shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                  : "bg-[#C1121F] hover:bg-red-700 text-white"
              }`}
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? (isBn ? "কপি হয়েছে" : "Copied") : (isBn ? "কপি করুন" : "Copy")}</span>
            </button>
          </div>
        </div>

        {/* 1-Click Social Share Buttons */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-gray-400 font-mono uppercase block">
            {isBn ? "সোশ্যাল মিডিয়ায় সরাসরি শেয়ার করুন:" : "Quick Share to Social Platforms:"}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
            {/* WhatsApp */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => playSound("click")}
              className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-bold transition shadow-sm"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span>WhatsApp</span>
            </a>

            {/* Facebook */}
            <a
              href={facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => playSound("click")}
              className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-blue-950/80 hover:bg-blue-900 border border-blue-500/40 text-blue-300 font-bold transition shadow-sm"
            >
              <Facebook className="w-4 h-4 text-[#1877F2]" />
              <span>Facebook</span>
            </a>

            {/* Telegram */}
            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => playSound("click")}
              className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-sky-950/80 hover:bg-sky-900 border border-sky-500/40 text-sky-300 font-bold transition shadow-sm"
            >
              <Send className="w-4 h-4 text-sky-400" />
              <span>Telegram</span>
            </a>

            {/* Native Mobile Share or Mail */}
            <button
              onClick={handleNativeShare}
              className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-300 font-bold transition shadow-sm cursor-pointer"
            >
              <Smartphone className="w-4 h-4 text-purple-400" />
              <span>{isBn ? "অন্যান্য অ্যাপ" : "More Apps"}</span>
            </button>
          </div>
        </div>

        {/* Promotional Copy Block & QR Toggle */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-3">
          <button
            onClick={handleCopyPromo}
            className="flex-1 py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-gray-300 hover:text-white font-mono text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
          >
            {copiedPromo ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Sparkles className="w-3.5 h-3.5 text-[#FFD700]" />}
            <span>{copiedPromo ? (isBn ? "প্রোমো টেক্সট কপি হয়েছে ✓" : "Promo Text Copied ✓") : (isBn ? "কোর্স প্রোমো পোস্ট কপি" : "Copy Promo Post Text")}</span>
          </button>

          <button
            onClick={() => {
              playSound("click");
              setShowQr(!showQr);
            }}
            className={`py-2.5 px-3 rounded-xl border font-mono text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              showQr
                ? "bg-[#FFD700]/20 border-[#FFD700] text-[#FFD700]"
                : "bg-white/5 hover:bg-white/10 border-white/15 text-gray-300"
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>{showQr ? "QR Hide" : "QR Code"}</span>
          </button>
        </div>

        {/* QR Code Scannable Card */}
        {showQr && (
          <div className="bg-black/90 p-4 rounded-2xl border border-[#FFD700]/40 flex flex-col items-center justify-center gap-2 font-mono text-center animate-in fade-in">
            <span className="text-xs text-[#FFD700] font-bold uppercase">
              {isBn ? "ক্যামেরা দিয়ে স্ক্যান করে সরাসরি কোর্সে যান:" : "Scan QR with Mobile Camera:"}
            </span>
            <div className="p-2 bg-white rounded-xl shadow-lg">
              <img
                src={qrSvgUrl}
                alt="Course QR Code"
                className="w-40 h-40 object-contain"
                onError={(e) => {
                  // fallback simple placeholder
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            </div>
            <span className="text-[10px] text-gray-400">MediBridge Official Course Direct Link</span>
          </div>
        )}
      </div>
    </div>
  );
}
