"use client";

import { detectMediaTypeFromMime, detectMediaTypeFromUrl } from "./media";
import axiosInstance, { ApiResponse } from "@/lib/axios";

const DEFAULT_MAX_UPLOAD_SIZE = 10 * 1024 * 1024;

const parsedLimit = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_SIZE);
export const MAX_UPLOAD_SIZE_BYTES =
  Number.isFinite(parsedLimit) && parsedLimit > 0
    ? parsedLimit
    : DEFAULT_MAX_UPLOAD_SIZE;

const maxUploadSizeInMb = MAX_UPLOAD_SIZE_BYTES / (1024 * 1024);
export const MAX_UPLOAD_SIZE_LABEL = Number.isInteger(maxUploadSizeInMb)
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

interface UploadSingleResponse {
  url: string;
  publicId: string;
  filename: string;
  fileType: string;
}

interface UploadMultipleResponse {
  url: string;
  publicId: string;
  filename: string;
  fileType: string;
}

export interface UploadedFileInfo {
  url: string;
  type: "image" | "video" | "file";
  name: string;
  size?: number;
  mimeType?: string;
}

export const uploadSingleFile = async (
  file: File,
  folder: string = "task-manager"
): Promise<UploadedFileInfo> => {
  if (!isWithinUploadLimit(file)) {
    throw new Error("File vượt quá dung lượng cho phép.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const response = await axiosInstance.post<ApiResponse<UploadSingleResponse>>(
    "/upload/single",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  const fileInfo = response.data.data;
  const mimeType = file.type || "";
  const detectedTypeFromMime = detectMediaTypeFromMime(mimeType);
  const detectedFromUrl = detectMediaTypeFromUrl(fileInfo.url);

  let finalType: "image" | "video" | "file" = "file";
  if (detectedTypeFromMime === "image" || detectedTypeFromMime === "video") {
    finalType = detectedTypeFromMime;
  } else if (detectedFromUrl === "image" || detectedFromUrl === "video") {
    finalType = detectedFromUrl;
  }

  return {
    url: fileInfo.url,
    type: finalType,
    name: file.name,
    size: file.size,
    mimeType,
  };
};

export const uploadFilesToCloudinary = async (
  files: File[],
  folder: string = "task-manager"
): Promise<UploadedFileInfo[]> => {
  if (!files.length) return [];

  for (const file of files) {
    if (!isWithinUploadLimit(file)) {
      throw new Error(`File "${file.name}" vượt quá dung lượng cho phép.`);
    }
  }

  const formData = new FormData();
  files.forEach((file) => {
    formData.append("files", file);
  });
  formData.append("folder", folder);

  const response = await axiosInstance.post<
    ApiResponse<UploadMultipleResponse[]>
  >("/upload/multiple", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  const uploadedFiles = response.data.data;

  return uploadedFiles.map((fileInfo, index) => {
    const originalFile = files[index];
    const mimeType = originalFile.type || "";
    const detectedTypeFromMime = detectMediaTypeFromMime(mimeType);
    const detectedFromUrl = detectMediaTypeFromUrl(fileInfo.url);

    let finalType: "image" | "video" | "file" = "file";
    if (detectedTypeFromMime === "image" || detectedTypeFromMime === "video") {
      finalType = detectedTypeFromMime;
    } else if (detectedFromUrl === "image" || detectedFromUrl === "video") {
      finalType = detectedFromUrl;
    }

    return {
      url: fileInfo.url,
      type: finalType,
      name: originalFile.name,
      size: originalFile.size,
      mimeType,
    };
  });
};
