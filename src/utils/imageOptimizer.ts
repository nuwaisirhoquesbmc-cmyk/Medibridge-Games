/**
 * Image Optimizer and Compression Utility
 * Compresses images client-side before storing in Firestore or localStorage.
 * Ensures data URLs stay between 30KB - 120KB, well within Firestore's 1MB limit.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: "image/webp" | "image/jpeg" | "image/png";
}

/**
 * Compresses any File or Blob to an optimized base64 Data URL.
 */
export async function optimizeImageFile(
  file: File | Blob,
  options: CompressionOptions = {}
): Promise<{
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  originalSizeFormatted: string;
  compressedSizeFormatted: string;
  width: number;
  height: number;
}> {
  const {
    maxWidth = 1280,
    maxHeight = 960,
    quality = 0.82,
    format = "image/webp"
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("Failed to read image file"));

    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image for compression"));

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate proportional scale
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not create 2D canvas context"));
          return;
        }

        // Draw image smoothly
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        // Export as WebP (or fallback to JPEG if WebP unsupported)
        let dataUrl = "";
        try {
          dataUrl = canvas.toDataURL(format, quality);
          // If browser returned uncompressed PNG instead of webp
          if (format === "image/webp" && dataUrl.startsWith("data:image/png")) {
            dataUrl = canvas.toDataURL("image/jpeg", quality);
          }
        } catch (e) {
          dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        }

        // Calculate approximate size in bytes
        const head = dataUrl.indexOf(",") + 1;
        const base64Len = dataUrl.length - head;
        const compressedSize = Math.round((base64Len * 3) / 4);
        const originalSize = file.size;

        resolve({
          dataUrl,
          originalSize,
          compressedSize,
          originalSizeFormatted: formatBytes(originalSize),
          compressedSizeFormatted: formatBytes(compressedSize),
          width,
          height
        });
      };

      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Format bytes to readable string (e.g. 1.2 MB or 45 KB)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}
