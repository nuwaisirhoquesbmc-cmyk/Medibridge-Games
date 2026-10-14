import React, { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { motion } from "motion/react";

interface MediBridgeLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  theme?: "light" | "dark";
}

// Module-level cache to prevent multiple getDoc calls across multiple logo instances
let cachedLogoData: { url: string | null; enabled: boolean; timestamp: number } | null = null;

export default function MediBridgeLogo({ className = "", size = "md", theme = "dark" }: MediBridgeLogoProps) {
  const isDark = theme === "dark";
  const [customLogoUrl, setCustomLogoUrl] = useState<string | null>(() => cachedLogoData ? cachedLogoData.url : null);
  const [customLogoEnabled, setCustomLogoEnabled] = useState<boolean>(() => cachedLogoData ? cachedLogoData.enabled : false);

  useEffect(() => {
    // If cached within 10 minutes, use cache
    if (cachedLogoData && Date.now() - cachedLogoData.timestamp < 10 * 60 * 1000) {
      setCustomLogoUrl(cachedLogoData.url);
      setCustomLogoEnabled(cachedLogoData.enabled);
      return;
    }

    getDoc(doc(db, "settings", "platform"))
      .then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const url = data.customLogoUrl || null;
          const enabled = !!data.customLogoEnabled;
          cachedLogoData = { url, enabled, timestamp: Date.now() };
          setCustomLogoUrl(url);
          setCustomLogoEnabled(enabled);
        }
      })
      .catch((error) => {
        console.warn("Failed to load custom logo settings:", error);
      });
  }, []);

  // Standard heights for custom uploaded logo image to look perfectly aligned in all spots
  const customHeightClass = size === "sm"
    ? "h-8 sm:h-9"
    : size === "md"
    ? "h-12 sm:h-14"
    : "h-20 sm:h-24";

  // Base font size classes for vector logo scaling (fallback)
  const fontSizeClass = size === "sm" 
    ? "text-2xl sm:text-3xl" 
    : size === "md" 
    ? "text-4xl sm:text-5xl" 
    : "text-6xl sm:text-7xl";

  const gamesPadding = size === "sm"
    ? "px-2.5 py-0.5 text-[8.5px]"
    : size === "md"
    ? "px-4 py-1 text-[11px]"
    : "px-6 py-1.5 text-sm";

  const gamesMargin = size === "sm" ? "mt-1" : size === "md" ? "mt-2" : "mt-3";

  // If a custom logo exists and is enabled, render it seamlessly
  if (customLogoUrl && customLogoEnabled) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={`flex flex-col items-center justify-center select-none ${className}`}
        id="medibridge-logo-custom"
      >
        <img
          src={customLogoUrl}
          alt="MediBridge Games"
          referrerPolicy="no-referrer"
          className={`${customHeightClass} object-contain max-w-full drop-shadow-[0_4px_12px_rgba(193,18,31,0.3)]`}
        />
      </motion.div>
    );
  }

  // Fallback to our perfect pixel-crafted SVG vector logo
  return (
    <div className={`flex flex-col items-center select-none ${className}`} id="medibridge-logo-root">
      {/* Brand Text Container with precise custom letters matching the logo screenshot */}
      <div className={`flex items-center font-sans font-black tracking-tight ${fontSizeClass} ${isDark ? "text-white" : "text-[#1C1F22]"} leading-none`}>
        <span>M</span>
        <span>e</span>
        <span>d</span>
        <span>i</span>
        
        {/* Custom Medical B with red plus intersecting the stem */}
        <svg 
          viewBox="0 0 32 38" 
          className="inline-block align-baseline select-none shrink-0" 
          style={{ height: "1.02em", width: "auto", marginLeft: "0.04em", marginRight: "0.01em", marginBottom: "-0.04em" }}
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Geometric B */}
          <path 
            d="M6 3h12a8.5 8.5 0 0 1 6 14.5A8.5 8.5 0 0 1 18 35H6V3zm6 6v7h6a3.5 3.5 0 1 0 0-7h-6zm0 13v7h6a3.5 3.5 0 1 0 0-7h-6z" 
            fill="currentColor" 
          />
          {/* Red Plus intersecting the stem precisely as in logo */}
          <path 
            d="M2 15.5h10v4H2v-4z M6 11.5h4v12H6v-12z" 
            fill="#C1121F" 
          />
        </svg>

        <span>r</span>

        {/* Custom Power I with red vertical dash dot */}
        <svg 
          viewBox="0 0 12 38" 
          className="inline-block align-baseline select-none shrink-0" 
          style={{ height: "1.02em", width: "auto", marginLeft: "-0.01em", marginRight: "0.01em", marginBottom: "-0.04em" }}
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Stem of the i */}
          <rect x="3" y="11" width="6" height="24" rx="1.5" fill="currentColor" />
          {/* Red vertical bar (power switch indicator) */}
          <rect x="4.5" y="1" width="3.2" height="7.5" rx="0.7" fill="#C1121F" />
        </svg>

        <span>d</span>
        <span>g</span>
        <span>e</span>
      </div>

      {/* GAMES sub-container: rounded red pill with horizontal side wings matching the logo screenshot */}
      <div className={`flex items-center w-full ${gamesMargin}`} style={{ maxWidth: "105%" }}>
        <div className="flex-1 h-[2px] bg-[#C1121F]" />
        <div className={`bg-[#C1121F] text-white font-sans font-black tracking-[0.2em] text-center uppercase rounded-md select-none mx-2.5 ${gamesPadding}`}>
          GAMES
        </div>
        <div className="flex-1 h-[2px] bg-[#C1121F]" />
      </div>
    </div>
  );
}
