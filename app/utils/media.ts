"use client";

export type MediaType = "image" | "video" | "file";

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg", "heic", "heif"];
const VIDEO_EXTENSIONS = [
  "mp4",
  "mov",
  "avi",
  "mkv",
  "webm",
  "m4v",
  "3gp",
  "wmv",
  "flv",
];

export const detectMediaTypeFromUrl = (url: string): MediaType => {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname || "";
    const extMatch = pathname.split(".").pop();
    if (!extMatch) return "file";
    const ext = extMatch.toLowerCase();
    if (IMAGE_EXTENSIONS.includes(ext)) return "image";
    if (VIDEO_EXTENSIONS.includes(ext)) return "video";
    return "file";
  } catch {
    const extMatch = url.split(".").pop();
    if (!extMatch) return "file";
    const ext = extMatch.toLowerCase();
    if (IMAGE_EXTENSIONS.includes(ext)) return "image";
    if (VIDEO_EXTENSIONS.includes(ext)) return "video";
    return "file";
  }
};

export const detectMediaTypeFromMime = (mime?: string | null): MediaType => {
  if (!mime) return "file";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return "file";
};

export const extractMediaNameFromUrl = (url: string, fallback = "Tệp đính kèm"): string => {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    const segments = pathname.split("/").filter(Boolean);
    const lastSegment = segments.pop();
    if (!lastSegment) return fallback;
    return decodeURIComponent(lastSegment);
  } catch {
    const segments = url.split("/").filter(Boolean);
    const lastSegment = segments.pop();
    if (!lastSegment) return fallback;
    return decodeURIComponent(lastSegment);
  }
};
