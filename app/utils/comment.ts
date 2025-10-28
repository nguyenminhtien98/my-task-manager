"use client";

import { CommentAttachment, TaskComment } from "../components/comments/types";
import { detectMediaTypeFromUrl } from "./media";

export interface RawCommentDocument {
  $id: string;
  $createdAt: string;
  content?: string;
  attachments?: unknown;
  isVisible?: boolean;
  userProfile?: string | { $id?: string; name?: string } | null;
  userName?: string;
}

export const parseAttachments = (raw: unknown): CommentAttachment[] => {
  if (!Array.isArray(raw)) return [];
  const attachments: CommentAttachment[] = [];
  raw.forEach((item) => {
    if (typeof item === "string") {
      try {
        const parsed = JSON.parse(item) as CommentAttachment;
        if (parsed && parsed.url) {
          const normalizedType =
            parsed.type === "image" || parsed.type === "video"
              ? parsed.type
              : "file";
          attachments.push({
            url: parsed.url,
            type: normalizedType,
            name: parsed.name ?? "Tệp đính kèm",
            size: parsed.size,
            mimeType: parsed.mimeType,
          });
        }
      } catch {
        const detected = detectMediaTypeFromUrl(item);
        attachments.push({
          url: item,
          type:
            detected === "image" || detected === "video" ? detected : "file",
          name: item.split("/").pop() ?? "Tệp đính kèm",
        });
      }
    }
  });
  return attachments;
};

export const mapCommentDocument = (doc: RawCommentDocument): TaskComment => {
  const attachments = parseAttachments(doc.attachments);
  const userId =
    typeof doc.userProfile === "string"
      ? doc.userProfile
      : doc.userProfile?.$id ?? "unknown";
  let userName = typeof doc.userName === "string" ? doc.userName : undefined;
  if (!userName || userName.trim().length === 0) {
    if (
      typeof doc.userProfile === "object" &&
      doc.userProfile &&
      typeof doc.userProfile.name === "string"
    ) {
      userName = doc.userProfile.name;
    }
  }
  if (!userName || userName.trim().length === 0) {
    userName = "Người dùng";
  }

  return {
    id: doc.$id,
    content: doc.content ?? "",
    createdAt: doc.$createdAt ?? new Date().toISOString(),
    isVisible: doc.isVisible ?? true,
    user: {
      id: userId,
      name: userName,
    },
    attachments,
  };
};
