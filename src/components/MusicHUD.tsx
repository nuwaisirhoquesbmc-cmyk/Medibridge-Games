import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { getMusicFromIndexedDB } from "../lib/musicDb";
import { Music, Volume2, VolumeX, Play, Pause, Disc, ListMusic, Sparkles, Gamepad2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserProfile } from "../types";
import { playSound } from "../audio";

interface MusicHUDProps {
  language: "bn" | "en";
  user?: UserProfile | null;
}

const DEFAULT_TRACKS = [
  {
    id: "focus_lofi",
    url: "https://assets.mixkit.co/music/preview/mixkit-study-and-play-lo-fi-960.mp3",
    title: "🌸 Study Focus: Deep Concentration Meditative Lofi",
    titleBn: "🌸 ডিপ স্টাডি ফোকাস: মেডিটেটিভ লোফি"
  },
  {
    id: "synthwave",
    url: "https://assets.mixkit.co/music/preview/mixkit-beautiful-dream-97.mp3",
    title: "🚀 High Concentration: Cybernetic Chill Dream Loop",
    titleBn: "🚀 সাইবারনেটিক চিল ড্রিম লুপ"
  },
  {
    id: "ambition",
    url: "https://assets.mixkit.co/music/preview/mixkit-hollidays-124.mp3",
    title: "🏆 Champion Grind: Medical Achievement Booster Beat",
    titleBn: "🏆 মেডিকেল অ্যাচিভমেন্ট বুস্টার বিট"
  }
];

export default function MusicHUD({ language, user }: MusicHUDProps) {
  const isBn = language === "bn";

  // Real-time settings synced from Firestore
  const [musicSettings, setMusicSettings] = useState({
    url: DEFAULT_TRACKS[0].url,
    title: DEFAULT_TRACKS[0].title,
    enabled: true,
    volume: 0.3
  });

  // Local student state override (saved in localStorage)
  const [localTrackId, setLocalTrackId] = useState<string>(() => {
    return localStorage.getItem("medi_student_music_track") || "admin";
  });
  
  const [localVolume, setLocalVolume] = useState<number>(() => {
    const savedVol = localStorage.getItem("medi_student_music_volume");
    return savedVol !== null ? parseFloat(savedVol) : 0.3;
  });

  const [localMuted, setLocalMuted] = useState<boolean>(() => {
    return localStorage.getItem("medi_student_music_muted") === "true";
  });

  const [sfxMuted, setSfxMuted] = useState<boolean>(() => {
    return localStorage.getItem("medi_sfx_muted") === "true";
  });

  const [localMusicUrl, setLocalMusicUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);
  const [showTracksMenu, setShowTracksMenu] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevSrcRef = useRef<string | null>(null);

  // Check if current user has authority to view/configure the HUD controls
  const isSuperAdmin = user?.role === "superadmin" || user?.role === "admin" || user?.email === "nuwaisirhoquesbmc@gmail.com" || user?.email === "hoquenuwaisir@gmail.com";

  // 1. Fetch platform music settings once on mount
  useEffect(() => {
    getDoc(doc(db, "settings", "platform"))
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.backgroundMusicUrl !== undefined || data.backgroundMusicTitle !== undefined || data.backgroundMusicEnabled !== undefined) {
            setMusicSettings({
              url: data.backgroundMusicUrl || DEFAULT_TRACKS[0].url,
              title: data.backgroundMusicTitle || DEFAULT_TRACKS[0].title,
              enabled: data.backgroundMusicEnabled !== false,
              volume: data.backgroundMusicVolume !== undefined ? data.backgroundMusicVolume : 0.3
            });
          }
        }
      })
      .catch((err) => {
        console.warn("Failed to load platform music settings:", err);
      });
  }, []);

  // 2. Load IndexedDB music if option A (uploaded custom file) is used
  useEffect(() => {
    async function checkAndLoadLocalMusic() {
      if (musicSettings.url === "local_indexeddb_promo") {
        const file = await getMusicFromIndexedDB();
        if (file) {
          const objectUrl = URL.createObjectURL(file);
          setLocalMusicUrl(objectUrl);
        } else {
          setLocalMusicUrl(null);
        }
      } else {
        setLocalMusicUrl(null);
      }
    }
    checkAndLoadLocalMusic();
  }, [musicSettings.url]);

  // Determine the active audio source
  let activeSrc = musicSettings.url === "local_indexeddb_promo" ? localMusicUrl : musicSettings.url;
  let activeTitle = musicSettings.title;

  // For students, if they selected a specific local track, override the admin-pushed track
  if (!isSuperAdmin && localTrackId !== "admin") {
    const selectedTrack = DEFAULT_TRACKS.find(t => t.id === localTrackId);
    if (selectedTrack) {
      activeSrc = selectedTrack.url;
      activeTitle = isBn ? selectedTrack.titleBn : selectedTrack.title;
    }
  }

  // Determine the active playing volume
  const activeVolume = localMuted ? 0 : (isSuperAdmin ? musicSettings.volume : localVolume);

  // 3. Autoplay logic / Interactivity trigger
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Only play if a user is logged in
    if (user && musicSettings.enabled && activeSrc) {
      if (prevSrcRef.current !== activeSrc) {
        audio.src = activeSrc;
        audio.load();
        prevSrcRef.current = activeSrc;
      }
      
      audio.volume = activeVolume;

      if (userInteracted) {
        audio.play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch((err) => {
            console.log("Autoplay blocked or audio interrupted:", err);
            setIsPlaying(false);
          });
      }
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, [activeSrc, musicSettings.enabled, userInteracted, user?.uid, activeVolume]);

  // 4. Update live volume when changed
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = activeVolume;
    }
  }, [activeVolume]);

  // 5. Capture any click anywhere on the page once to trigger playback
  useEffect(() => {
    const handleFirstInteraction = () => {
      if (!userInteracted) {
        setUserInteracted(true);
        window.removeEventListener("click", handleFirstInteraction);
        window.removeEventListener("touchstart", handleFirstInteraction);
      }
    };
    window.addEventListener("click", handleFirstInteraction);
    window.addEventListener("touchstart", handleFirstInteraction);
    return () => {
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("touchstart", handleFirstInteraction);
    };
  }, [userInteracted]);

  // Toggle play/pause locally
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      setUserInteracted(true);
      audio.play()
        .then(() => setIsPlaying(true))
        .catch(console.error);
    }
  };

  // Student specific handlers
  const handleSelectTrack = (trackId: string) => {
    setLocalTrackId(trackId);
    localStorage.setItem("medi_student_music_track", trackId);
    setUserInteracted(true);
    setShowTracksMenu(false);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setLocalVolume(vol);
    localStorage.setItem("medi_student_music_volume", vol.toString());
    if (vol > 0 && localMuted) {
      setLocalMuted(false);
      localStorage.setItem("medi_student_music_muted", "false");
    }
  };

  const toggleMute = () => {
    const newMuted = !localMuted;
    setLocalMuted(newMuted);
    localStorage.setItem("medi_student_music_muted", newMuted ? "true" : "false");
  };

  const toggleSfxMute = () => {
    const newMuted = !sfxMuted;
    setSfxMuted(newMuted);
    localStorage.setItem("medi_sfx_muted", newMuted ? "true" : "false");
    if (!newMuted) {
      playSound("click");
    }
  };

  // If globally disabled or no user logged in, keep audio element quiet
  if (!user || !musicSettings.enabled || !activeSrc) {
    return <audio ref={audioRef} className="hidden" />;
  }

  return (
    <div id="medi-background-player-hud" className="fixed bottom-6 left-6 z-50 flex flex-col gap-2">
      {/* Underlying raw audio driver */}
      <audio
        ref={audioRef}
        src={activeSrc}
        loop
        className="hidden"
      />

      {/* Floating minimal auditory HUD bar (Adapts beautifully for Students vs Admins) */}
      <div className="relative group/hud">
        {/* Soft atmospheric background glow */}
        <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r from-red-650 via-[#FFD700] to-red-650 filter blur-lg opacity-40 transition-all duration-700 ${isPlaying ? "scale-110 animate-pulse" : "scale-100 opacity-20"}`} />

        <div className="relative bg-[#0D0D0D]/95 border border-white/10 text-white rounded-2xl py-2 px-3 sm:px-4 flex items-center gap-3 shadow-2xl md:backdrop-blur-md">
          {/* Rotating vinyl disk / track play-pause indicator */}
          <div 
            onClick={togglePlay}
            className="relative cursor-pointer shrink-0 flex items-center justify-center p-1"
          >
            <div className={`w-9 h-9 rounded-full bg-gradient-to-tr from-[#C1121F] to-amber-500 flex items-center justify-center shadow-lg transition-transform duration-300 ${isPlaying ? "animate-spin-slow" : "hover:scale-105"}`}>
              {isPlaying ? (
                <Disc className="w-5 h-5 text-white animate-pulse" />
              ) : (
                <Play className="w-4 h-4 text-white ml-0.5" />
              )}
            </div>

            {/* Glowing audio equalizer bars */}
            {isPlaying && (
              <div className="absolute -top-1 -right-1 flex gap-[2px] h-3 items-end bg-black/85 px-1 py-0.5 rounded-full border border-white/10 scale-90">
                <span className="w-[1.5px] h-1.5 bg-red-500 rounded-full animate-eq-bar-1" />
                <span className="w-[1.5px] h-2 bg-yellow-400 rounded-full animate-eq-bar-2" />
                <span className="w-[1.5px] h-3 bg-emerald-400 rounded-full animate-eq-bar-3" />
              </div>
            )}
          </div>

          {/* Title and Badge section */}
          <div className="flex flex-col w-32 sm:w-36 overflow-hidden">
            <span className="text-[8px] sm:text-[9px] font-black tracking-widest text-[#FFD700] uppercase font-mono mb-0.5 flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 text-[#FFD700] animate-pulse" />
              {isSuperAdmin 
                ? (isBn ? "প্রশাসক মিউজিক" : "ADMIN CONTROLS") 
                : (isBn ? "ডিপ স্টাডি মিউজিক" : "STUDY FOCUS BEATS")
              }
            </span>
            <div className="relative h-4 overflow-hidden">
              <div className="absolute whitespace-nowrap text-[10px] font-semibold text-gray-200 animate-marquee">
                {activeTitle}
              </div>
            </div>
          </div>

          {/* Control items: Play/Pause/Mute and Volume slide */}
          <div className="flex items-center gap-2 border-l border-white/10 pl-2 sm:pl-3 select-none">
            {/* Quick Play/Pause Trigger */}
            <button
              onClick={togglePlay}
              className="p-1 rounded-lg hover:bg-white/5 transition text-gray-400 hover:text-white"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>

            {/* Mute toggle */}
            <button
              onClick={toggleMute}
              className="p-1 rounded-lg hover:bg-white/5 transition text-gray-400 hover:text-white"
              title={localMuted ? "Unmute" : "Mute"}
            >
              {localMuted ? (
                <VolumeX className="w-4 h-4 text-red-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              )}
            </button>

            {/* Gamified Sounds Mute/Unmute Toggle */}
            <button
              onClick={toggleSfxMute}
              className="p-1 rounded-lg hover:bg-white/5 transition text-gray-400 hover:text-white flex items-center justify-center relative group"
              title={sfxMuted ? (isBn ? "গেম সাউন্ড আনমিউট করুন" : "Unmute Gamified Sounds") : (isBn ? "গেম সাউন্ড মিউট করুন" : "Mute Gamified Sounds")}
            >
              {sfxMuted ? (
                <Gamepad2 className="w-4 h-4 text-red-500 opacity-60" />
              ) : (
                <Gamepad2 className="w-4 h-4 text-[#FFD700] animate-pulse" />
              )}
              {sfxMuted && (
                <span className="absolute w-5 h-[1.5px] bg-red-500 rotate-45 pointer-events-none" />
              )}
            </button>

            {/* Volume slide (Only for students, admin uses admin panel settings) */}
            {!isSuperAdmin && (
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={localVolume}
                onChange={handleVolumeChange}
                className="w-12 sm:w-16 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#C1121F]"
                title={isBn ? `ভলিউম: ${Math.round(localVolume * 100)}%` : `Volume: ${Math.round(localVolume * 100)}%`}
              />
            )}

            {/* Quick Track Switcher Menu (Only for students to select track, or Admins inside CCM) */}
            {!isSuperAdmin && (
              <div className="relative">
                <button
                  onClick={() => setShowTracksMenu(!showTracksMenu)}
                  className={`p-1.5 rounded-lg hover:bg-white/5 transition ${showTracksMenu ? "text-[#FFD700] bg-white/5" : "text-gray-400 hover:text-white"}`}
                  title={isBn ? "মিউজিক নির্বাচন করুন" : "Select Study Track"}
                >
                  <ListMusic className="w-4 h-4" />
                </button>

                {/* Tracks Dropdown */}
                <AnimatePresence>
                  {showTracksMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute bottom-10 right-0 w-56 bg-[#0E0E0E] border border-white/10 rounded-2xl p-2.5 shadow-2xl flex flex-col gap-1.5 z-50 text-left font-display"
                    >
                      <span className="text-[9px] font-bold font-mono text-gray-500 uppercase px-2 mb-1">
                        {isBn ? "মিউজিক ট্র্যাক নির্বাচন" : "SELECT FOCUS ENVIRONMENT"}
                      </span>

                      {/* Admin Track Option */}
                      <button
                        onClick={() => handleSelectTrack("admin")}
                        className={`w-full text-left p-2 rounded-xl text-xs transition flex flex-col gap-0.5 ${
                          localTrackId === "admin"
                            ? "bg-[#C1121F] text-white font-bold"
                            : "bg-white/5 text-gray-300 hover:bg-white/10"
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <span>📢</span>
                          <span className="truncate">{isBn ? "প্রধান শিক্ষকের গান" : "Live Master Channel"}</span>
                        </span>
                        <span className="text-[8px] opacity-75 font-mono truncate px-5">
                          {musicSettings.title}
                        </span>
                      </button>

                      <div className="border-t border-white/5 my-1"></div>

                      {DEFAULT_TRACKS.map((track) => (
                        <button
                          key={track.id}
                          onClick={() => handleSelectTrack(track.id)}
                          className={`w-full text-left p-2 rounded-xl text-xs transition flex flex-col gap-0.5 ${
                            localTrackId === track.id
                              ? "bg-[#C1121F] text-white font-bold"
                              : "bg-black/30 text-gray-400 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <span>{track.id === "focus_lofi" ? "🌸" : track.id === "synthwave" ? "🚀" : "🏆"}</span>
                            <span className="truncate">{isBn ? track.titleBn : track.title}</span>
                          </span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Admin visual tag showing active master status */}
            {isSuperAdmin && (
              <span className="text-[9px] font-mono text-gray-400 px-1.5 py-0.5 bg-white/5 rounded border border-white/10">
                VOL: {Math.round(musicSettings.volume * 100)}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Direct Play/Pause Guidance Tooltip for new sessions */}
      <AnimatePresence>
        {!userInteracted && showTooltip && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            onClick={() => setUserInteracted(true)}
            className="bg-[#C1121F]/90 border border-[#FFD700]/30 text-white text-[10px] font-mono px-3 py-1.5 rounded-xl shadow-xl md:backdrop-blur-md cursor-pointer animate-bounce max-w-xs leading-snug flex items-center gap-2"
          >
            <span>✨</span>
            <span>
              {isBn 
                ? "যেকোন জায়গায় ক্লিক করলেই পড়াশোনার গানটি বেজে উঠবে!" 
                : "Tap anywhere to start beautiful study focus ambient beats!"
              }
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
