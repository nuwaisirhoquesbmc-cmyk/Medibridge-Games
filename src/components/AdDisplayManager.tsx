import React, { useState, useEffect, useRef } from "react";
import { db } from "../lib/backend";
import {
  collection,
  query,
  where,
  getDocs,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  increment,
  addDoc,
} from "../lib/supabaseDb";
import { Advertisement, UserProfile } from "../types";
import { playSound } from "../audio";
import { X, ExternalLink, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AdDisplayManagerProps {
  user: UserProfile | null;
  theme?: "light" | "dark";
}

export default function AdDisplayManager({ user, theme = "dark" }: AdDisplayManagerProps) {
  const isDark = theme === "dark";
  const [activeAds, setActiveAds] = useState<Advertisement[]>([]);
  const [currentAd, setCurrentAd] = useState<Advertisement | null>(null);
  const [showPopup, setShowPopup] = useState(false);

  // References to handle timers cleanly
  const loginAdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recurringAdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Keep track of which ad was shown this session for login ad to prevent annoying repeating on every page load/mount
  const sessionShownLoginAds = useRef<Record<string, boolean>>({});

  // 1. Load active ads from Firestore once on mount
  useEffect(() => {
    const q = query(
      collection(db, "advertisements"),
      where("status", "==", "active"),
      limit(10)
    );

    getDocs(q)
      .then((snapshot) => {
        const ads: Advertisement[] = [];
        const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Advertisement;
          const adId = docSnap.id;

          // Verify active date range constraints if specified
          let dateValid = true;
          if (data.startDate && todayStr < data.startDate) dateValid = false;
          if (data.endDate && todayStr > data.endDate) dateValid = false;

          if (dateValid) {
            ads.push({ id: adId, ...data });
          }
        });

        setActiveAds(ads);
      })
      .catch((err) => {
        console.warn("Error fetching active advertisements:", err.message);
      });
  }, []);

  // 2. Helper to check display constraints (Daily limit)
  const isAllowedByDailyLimit = (ad: Advertisement): boolean => {
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const localData = localStorage.getItem("ad_display_daily_limit_tracker");
      let tracker: Record<string, { date: string; count: number }> = {};
      
      if (localData) {
        tracker = JSON.parse(localData);
      }

      const adRecord = tracker[ad.id];
      const maxLimit = ad.autoCloseTime || 3; // Use autoCloseTime or fallback of 3 per day if not defined

      if (adRecord && adRecord.date === todayStr) {
        if (adRecord.count >= maxLimit) {
          return false;
        }
      }
      return true;
    } catch (e) {
      return true;
    }
  };

  // 3. Helper to increment daily display count in LocalStorage
  const recordDisplayInLocalStorage = (adId: string) => {
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const localData = localStorage.getItem("ad_display_daily_limit_tracker");
      let tracker: Record<string, { date: string; count: number }> = {};

      if (localData) {
        tracker = JSON.parse(localData);
      }

      if (tracker[adId] && tracker[adId].date === todayStr) {
        tracker[adId].count += 1;
      } else {
        tracker[adId] = { date: todayStr, count: 1 };
      }

      localStorage.setItem("ad_display_daily_limit_tracker", JSON.stringify(tracker));
    } catch (e) {
      // Safe skip storage errors
    }
  };

  // 4. Log impression / click to Firestore asynchronously
  const logAdEvent = async (adId: string, eventType: "impression" | "click") => {
    try {
      // Create detailed log event doc
      const logPayload = {
        adId,
        type: eventType,
        userId: user?.uid || "guest",
        sessionOrDevice: navigator.userAgent.includes("Mobile") ? "mobile" : "desktop",
        timestamp: new Date().toISOString(),
      };
      await addDoc(collection(db, "ad_analytics_events"), logPayload);

      // Increment aggregate counters on the main ad document atomically
      const counterField = eventType === "impression" ? "impressionsCount" : "clicksCount";
      await updateDoc(doc(db, "advertisements", adId), {
        [counterField]: increment(1),
      });
    } catch (err: any) {
      console.warn(`Failed to log ad ${eventType} event asynchronously:`, err.message);
    }
  };

  // 5. Trigger an Advertisement popup
  const triggerAdPopup = (ad: Advertisement) => {
    if (showPopup || currentAd) return; // Never show multiple ads simultaneously

    // Double check daily limit constraint
    if (!isAllowedByDailyLimit(ad)) return;

    setCurrentAd(ad);
    setShowPopup(true);

    // Track locally & in Firestore
    recordDisplayInLocalStorage(ad.id);
    logAdEvent(ad.id, "impression");

    // Handle auto close timer if specified
    if (ad.autoCloseTime && ad.autoCloseTime > 0) {
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = setTimeout(() => {
        closePopup();
      }, ad.autoCloseTime * 1000);
    }
  };

  const closePopup = () => {
    setShowPopup(false);
    // Clear auto close timer if running
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
    // Briefly delay clearing currentAd to allow exit animations
    setTimeout(() => {
      setCurrentAd(null);
    }, 400);
  };

  const handleCtaClick = () => {
    if (!currentAd) return;
    playSound("click");
    
    // Log conversion click event
    logAdEvent(currentAd.id, "click");

    // Redirect to configured URL
    if (currentAd.openMode === "same") {
      window.location.href = currentAd.destinationUrl;
    } else {
      window.open(currentAd.destinationUrl, "_blank", "noopener,noreferrer");
    }

    closePopup();
  };

  // 6. LOGIN AD TRIGGER SYSTEM
  useEffect(() => {
    // Clear old login timers on auth state changes
    if (loginAdTimerRef.current) {
      clearTimeout(loginAdTimerRef.current);
      loginAdTimerRef.current = null;
    }

    if (!user || activeAds.length === 0 || showPopup) return;

    // Find first active login popup ad matching audience
    const loginAd = activeAds.find((ad) => {
      if (!ad.loginPopupEnabled) return false;
      
      // Target Audience logic
      if (ad.targetAudience === "guests") return false; // Show only to guests
      
      // Has not been shown this browser session to prevent user spamming
      if (sessionShownLoginAds.current[ad.id]) return false;

      return true;
    });

    if (loginAd) {
      // Mark as session-shown immediately to prevent double fires
      sessionShownLoginAds.current[loginAd.id] = true;

      // Trigger after delay
      const delayMs = (loginAd.delay || 0) * 1000;
      loginAdTimerRef.current = setTimeout(() => {
        triggerAdPopup(loginAd);
      }, delayMs);
    }

    return () => {
      if (loginAdTimerRef.current) clearTimeout(loginAdTimerRef.current);
    };
  }, [user, activeAds, showPopup]);

  // 7. RECURRING ADS LOOP SYSTEM
  useEffect(() => {
    if (recurringAdTimerRef.current) {
      clearInterval(recurringAdTimerRef.current);
      recurringAdTimerRef.current = null;
    }

    if (activeAds.length === 0) return;

    // Filter potential recurring ads matching audience
    const potentialRecurringAds = activeAds.filter((ad) => {
      if (!ad.recurringPopupEnabled) return false;

      // Audience constraints
      if (ad.targetAudience === "logged_in" && !user) return false;
      if (ad.targetAudience === "guests" && user) return false;

      return true;
    });

    if (potentialRecurringAds.length === 0) return;

    // Pick recurring ad with shortest frequency to set timer
    const sorted = [...potentialRecurringAds].sort((a, b) => (a.frequency || 10) - (b.frequency || 10));
    const targetRecurringAd = sorted[0];
    const frequencyMs = (targetRecurringAd.frequency || 10) * 60 * 1000; // Minutes to ms

    // Run interval timer
    recurringAdTimerRef.current = setInterval(() => {
      triggerAdPopup(targetRecurringAd);
    }, frequencyMs);

    return () => {
      if (recurringAdTimerRef.current) clearInterval(recurringAdTimerRef.current);
    };
  }, [activeAds, user, showPopup]);

  return (
    <AnimatePresence>
      {showPopup && currentAd && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          {/* Blurred overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={closePopup}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Ad Card container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 30 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: 0,
              transition: {
                type: "spring",
                stiffness: 300,
                damping: 22,
                mass: 0.8
              }
            }}
            exit={{ 
              opacity: 0, 
              scale: 0.96, 
              y: 40,
              transition: {
                duration: 0.25,
                ease: [0.32, 0, 0.67, 0] // Premium cubic-bezier ease-in curve
              }
            }}
            style={{
              width: (() => {
                const w = currentAd.width || "520px";
                const trimmed = w.trim();
                return /^\d+$/.test(trimmed) ? `${trimmed}px` : trimmed;
              })(),
              maxWidth: "100%",
            }}
            className={`relative rounded-2xl overflow-hidden border shadow-2xl flex flex-col ${
              isDark
                ? "bg-[#0d0d0d] text-white border-white/10"
                : "bg-white text-gray-900 border-gray-200"
            }`}
          >
            {/* Banner image or video wrapper */}
            <div className="relative aspect-video w-full bg-gray-900 group cursor-pointer" onClick={handleCtaClick}>
              {currentAd.mediaType === "video" ? (
                <video
                  src={currentAd.bannerUrl}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
                />
              ) : (
                <img
                  src={currentAd.bannerUrl}
                  alt={currentAd.title}
                  className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

              {/* Close (X) button inside the image top right */}
              <button
                onClick={(e) => { e.stopPropagation(); closePopup(); }}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/60 hover:bg-black text-gray-300 hover:text-white transition shadow border border-white/5 cursor-pointer"
                aria-label="Close Advertisement"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content settings details */}
            <div className="p-5 flex flex-col gap-3">
              <h3 className={`text-base md:text-lg font-black tracking-tight font-display uppercase ${
                isDark ? "text-white" : "text-gray-900"
              }`}>
                {currentAd.title}
              </h3>
              
              <p className={`text-xs leading-relaxed ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                {currentAd.description}
              </p>

              {/* CTA button footer */}
              <div className={`flex items-center justify-between mt-2 pt-4 border-t ${
                isDark ? "border-white/5" : "border-gray-100"
              }`}>
                <span className="text-[9px] text-gray-500 font-mono">
                  AD REVENUE HELPS KEEP THE PLATFORM FREE
                </span>

                <button
                  onClick={handleCtaClick}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-red-950/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{currentAd.ctaText || "VISIT NOW"}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
