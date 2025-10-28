"use client";

import { TaskMedia } from "../../types/Types";

export interface CommentAttachment {
  url: string;
  type: "image" | "video" | "file";
  name: string;
  size?: number;
  mimeType?: string;
}

export interface PendingAttachment {
  id: string;
  file: File;
  mediaType: CommentAttachment["type"];
  previewUrl?: string;
}

export interface TaskComment {
  id: string;
  content: string;
  createdAt: string;
  isVisible: boolean;
  user: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  attachments: CommentAttachment[];
}

export interface CommentFetcherResult {
  comments: TaskComment[];
}

export interface CommentSectionProps {
  taskId?: string;
}

export type { TaskMedia };
