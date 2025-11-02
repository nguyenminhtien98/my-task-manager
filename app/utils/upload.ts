"use client";

import { detectMediaTypeFromMime, detectMediaTypeFromUrl } from "./media";

const DEFAULT_MAX_UPLOAD_SIZE = 10 * 1024 * 1024;

const parsedLimit = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_SIZE);
export const MAX_UPLOAD_SIZE_BYTES =
  Number.isFinite(parsedLimit) && parsedLimit > 0
    ? parsedLimit
    : DEFAULT_MAX_UPLOAD_SIZE;

const maxUploadSizeInMb = MAX_UPLOAD_SIZE_BYTES / (1024 * 1024);
export const MAX_UPLOAD_SIZE_LABEL =
  Number.isInteger(maxUploadSizeInMb)
    ? `${maxUploadSizeInMb.toFixed(0)}MB`
    : `${maxUploadSizeInMb.toFixed(1)}MB`;

export const getUploadFileLabel = (file: File): "Ảnh" | "Video" | "File" => {
  const mime = file.type || "";
  if (mime.startsWith("image/")) return "Ảnh";
  if (mime.startsWith("video/")) return "Video";
  return "File";
};

export const isWithinUploadLimit = (file: File): boolean =>
  file.size <= MAX_UPLOAD_SIZE_BYTES;

type UploadResponse = {
  url: string;
};

export interface UploadedFileInfo {
  url: string;
  type: "image" | "video" | "file";
  name: string;
  size: number;
  mimeType: string;
}

export const uploadFilesToCloudinary = async (files: File[]): Promise<UploadedFileInfo[]> => {
  if (!files.length) return [];

  const uploaded: UploadedFileInfo[] = [];

  for (const file of files) {
    if (!isWithinUploadLimit(file)) {
      throw new Error("File vượt quá dung lượng cho phép.");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "my_task_manager");

    const response = await fetch("/api/uploads", {
      method: "POST",
      headers: {
        "X-File-Name": encodeURIComponent(file.name),
        "X-File-Type": file.type,
        "X-File-Size": String(file.size),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Upload tệp thất bại");
    }

    const data = (await response.json()) as UploadResponse;
    const mimeType = file.type || "";
    const detectedTypeFromMime = detectMediaTypeFromMime(mimeType);
    const detectedFromUrl = detectMediaTypeFromUrl(data.url);

    let finalType: "image" | "video" | "file" = "file";
    if (detectedTypeFromMime === "image" || detectedTypeFromMime === "video") {
      finalType = detectedTypeFromMime;
    } else if (detectedFromUrl === "image" || detectedFromUrl === "video") {
      finalType = detectedFromUrl;
    }

    uploaded.push({
      url: data.url,
      type: finalType,
      name: file.name,
      size: file.size,
      mimeType,
    });
  }

  return uploaded;
};
