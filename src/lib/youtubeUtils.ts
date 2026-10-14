/**
 * YouTube Utility Functions for MediBridge Medical Classes & Demos
 */

/**
 * Extracts standard YouTube video ID from various URL formats:
 * - https://www.youtube.com/watch?v=dQw4w9WgXcQ
 * - https://youtu.be/dQw4w9WgXcQ
 * - https://www.youtube.com/embed/dQw4w9WgXcQ
 * - https://www.youtube.com/live/dQw4w9WgXcQ
 * - https://m.youtube.com/watch?v=dQw4w9WgXcQ
 * - https://youtube.com/shorts/dQw4w9WgXcQ
 * - Plain video ID (11 chars)
 */
export function extractYouTubeVideoId(urlOrId: string | undefined | null): string | null {
  if (!urlOrId || typeof urlOrId !== "string") return null;
  const trimmed = urlOrId.trim();

  // If it's already an 11-char alphanumeric ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Handle youtu.be/ID
  const shortMatch = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|live\/|shorts\/))([a-zA-Z0-9_-]{11})/i);
  if (shortMatch && shortMatch[1]) {
    return shortMatch[1];
  }

  // Handle youtube.com/watch?v=ID
  const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/i);
  if (watchMatch && watchMatch[1]) {
    return watchMatch[1];
  }

  return null;
}

/**
 * Generates an optimized responsive YouTube iframe embed URL
 */
export function getYouTubeEmbedUrl(
  urlOrId: string | undefined | null,
  options: {
    autoplay?: boolean;
    startTimeSeconds?: number;
    rel?: boolean;
    modestbranding?: boolean;
  } = {}
): string {
  const videoId = extractYouTubeVideoId(urlOrId) || "5qap5aO4i9A";
  const { autoplay = false, startTimeSeconds, rel = false, modestbranding = true } = options;

  const params = new URLSearchParams();
  if (autoplay) params.set("autoplay", "1");
  if (startTimeSeconds) params.set("start", String(startTimeSeconds));
  if (!rel) params.set("rel", "0");
  if (modestbranding) params.set("modestbranding", "1");
  params.set("enablejsapi", "1");
  params.set("origin", window.location.origin);

  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

/**
 * Generates high quality YouTube thumbnail URL
 */
export function getYouTubeThumbnailUrl(
  urlOrId: string | undefined | null,
  quality: "hq" | "maxres" | "mq" | "default" = "hq"
): string {
  const videoId = extractYouTubeVideoId(urlOrId);
  if (!videoId) {
    return "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=60";
  }

  if (quality === "maxres") {
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  }
  if (quality === "mq") {
    return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
  }
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

/**
 * Generates direct YouTube watch URL for external app redirect
 */
export function getYouTubeDirectWatchUrl(urlOrId: string | undefined | null): string {
  const videoId = extractYouTubeVideoId(urlOrId);
  if (!videoId) return "https://www.youtube.com";
  return `https://www.youtube.com/watch?v=${videoId}`;
}
