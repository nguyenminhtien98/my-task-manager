"use client";

import { detectMediaTypeFromMime, detectMediaTypeFromUrl } from "./media";

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
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/uploads", {
      method: "POST",
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
