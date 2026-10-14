import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, RefreshCw, Film, Upload, Info } from "lucide-react";
import { motion } from "motion/react";
import { playSound } from "../audio";

interface DashboardVideoProps {
  theme: "light" | "dark";
  language: "bn" | "en";
}

export default function DashboardVideo({ theme, language }: DashboardVideoProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [customVideoUrl, setCustomVideoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isDark = theme === "dark";

  // Default high-yield clinical cinematic loop matching the medical bridge aesthetic precisely
  const defaultVideo = "https://player.vimeo.com/external/371433846.sd.mp4?s=236da2f3c02afdc2a7f56cf86c8f49779dfba7ff&profile_id=139&oauth2_token_id=57447761";

  const handlePlayPause = () => {
    playSound("click");
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(() => {});
      }
    }
  };

  const handleMuteToggle = () => {
    playSound("click");
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleRestart = () => {
    playSound("click");
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {});
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      playSound("victory");
      const url = URL.createObjectURL(file);
      setCustomVideoUrl(url);
      setIsPlaying(true);
      if (videoRef.current) {
        videoRef.current.load();
        setTimeout(() => {
          videoRef.current?.play().catch(() => {});
        }, 100);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`rounded-2xl border p-6 relative overflow-hidden transition-all duration-300 ${
        isDark
          ? "bg-[#111111] border-white/10 shadow-2xl"
          : "bg-white border-red-150 shadow-[0_10px_30px_rgba(193,18,31,0.08)]"
      }`}
      id="dashboard-video-section"
    >
      {/* Decorative Brand Ribbons */}
      <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${isDark ? "from-[#C1121F] to-[#FFD700]" : "from-[#C1121F] to-red-600"}`}></div>

      {/* Headings */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 pb-4 border-b border-gray-150">
        <div>
          <div className="flex items-center gap-2">
            <span className={`p-1.5 rounded-lg ${isDark ? "bg-[#C1121F]/20 text-[#C1121F]" : "bg-[#C1121F]/10 text-[#C1121F]"}`}>
              <Film className="w-4 h-4" />
            </span>
            <h3 className={`font-extrabold text-sm uppercase tracking-wider font-display ${isDark ? "text-white" : "text-slate-900"}`}>
              {language === "bn" ? "মেডিকেটরি ব্রডকাস্ট এবং ভিডিও গাইড" : "MEDIBRIDGE INTRO & CINEMATIC SHOWCASE"}
            </h3>
          </div>
          <p className={`text-[10.5px] mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            {language === "bn"
              ? "নিচে আপনার অ্যাকাউন্টে আপলোডকৃত বা কাস্টম অফিসিয়াল ইন্ট্রো ভিডিও ক্লিপটি দেখুন।"
              : "Review official training simulations or load customizable system intros below."}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Custom Video Uploader for user to load the identical intro video easily */}
          <input
            type="file"
            accept="video/*"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            id="video-uploader-input"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all duration-300 flex items-center gap-1.5 cursor-pointer border ${
              isDark
                ? "bg-white/5 border-white/10 text-gray-300 hover:text-[#FFD700] hover:border-[#FFD700]/50"
                : "bg-red-50 border-red-100 text-[#C1121F] hover:bg-[#C1121F] hover:text-white hover:border-[#C1121F]"
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{language === "bn" ? "পছন্দের ভিডিও লোড করুন" : "Upload Custom Video"}</span>
          </button>
        </div>
      </div>

      {/* Video Framing */}
      <div className={`relative rounded-xl overflow-hidden aspect-video max-w-4xl mx-auto border ${
        isDark ? "bg-black border-white/5" : "bg-red-50/20 border-red-100/60"
      }`}>
        <video
          ref={videoRef}
          src={customVideoUrl || defaultVideo}
          autoPlay
          muted={isMuted}
          loop
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Ambient Overlay Controls (Only visible on hover) */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4 flex items-center justify-between gap-4 z-10">
          
          {/* Timeline and Details */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePlayPause}
              className="p-2 bg-[#C1121F] hover:bg-red-700 text-white rounded-full transition-all duration-300 hover:scale-105"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
            </button>
            <button
              onClick={handleRestart}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all duration-300"
              title="Restart Intro"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <div className="text-left">
              <span className="text-[10px] font-mono text-[#FFD700] uppercase block tracking-wider font-extrabold">
                {customVideoUrl ? (language === "bn" ? "ব্যবহারকারীর ভিডিও" : "ACTIVE SESSION") : "OFFICIAL INTRO"}
              </span>
              <span className="text-[9px] font-mono text-gray-300 block truncate max-w-[180px] sm:max-w-xs">
                {customVideoUrl ? "Uploaded_Medical_Clip.mp4" : "MediBridge_Games_Intro_Cinematic.mp4"}
              </span>
            </div>
          </div>

          {/* Sound Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleMuteToggle}
              className={`p-2 rounded-full transition-all duration-300 ${
                isMuted ? "bg-white/10 text-gray-400 hover:bg-white/20" : "bg-[#FFD700] text-black hover:scale-105"
              }`}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Corner Brand Mark */}
        <div className="absolute top-4 left-4 bg-[#C1121F] text-white px-3 py-1 rounded-lg text-[9px] tracking-widest uppercase font-black font-mono shadow-md flex items-center gap-1.5 border border-red-500">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
          <span>LIVE INTRO PREVIEW</span>
        </div>
      </div>

      <div className={`mt-4 rounded-xl p-3.5 border text-xs leading-relaxed flex items-start gap-2.5 ${
        isDark ? "bg-black/30 border-white/5 text-gray-400" : "bg-red-50/40 border-red-100/40 text-gray-600"
      }`}>
        <Info className="w-4 h-4 text-[#C1121F] shrink-0 mt-0.5" />
        <div>
          <span className={`font-black uppercase block ${isDark ? "text-white" : "text-slate-800"}`}>
            {language === "bn" ? "💡 কুইক ইন্টিগ্রেশন নির্দেশাবলী" : "💡 Quick Integration Instructions"}
          </span>
          <p className="mt-1 text-[11px]">
            {language === "bn"
              ? "ডানদিকের 'পছন্দের ভিডিও লোড করুন' বোতামটি ব্যবহার করে আপনার যেকোনো প্রমোশনাল বা ইন্ট্রো ভিডিও নির্বাচন করে ড্যাশবোর্ডে সরাসরি প্লে ব্যাক করতে পারেন। "
              : "Use the 'Upload Custom Video' trigger to display and test your live promotional animations right onto your custom dashboard flow."}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
