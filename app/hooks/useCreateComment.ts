"use client";

import { useCallback, useRef, useState } from "react";
import { ID, Permission, Role } from "appwrite";
import toast from "react-hot-toast";
import { database } from "../appwrite";
import { uploadFilesToCloudinary } from "../utils/upload";
import {
  CommentAttachment,
  PendingAttachment,
  TaskComment,
} from "../components/comments/types";

interface CreateCommentParams {
  taskId: string;
  userId: string;
  userName: string;
  content: string;
  attachments: PendingAttachment[];
}

interface CreateCommentResult {
  comment: TaskComment;
}

export const useCreateComment = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const createComment = useCallback(
    async ({
      taskId,
      userId,
      userName,
      content,
      attachments,
    }: CreateCommentParams): Promise<CreateCommentResult | null> => {
      if (isSubmittingRef.current) {
        toast.error("Đang gửi bình luận, vui lòng đợi...");
        return null;
      }

      if (
        !process.env.NEXT_PUBLIC_DATABASE_ID ||
        !process.env.NEXT_PUBLIC_COLLECTION_ID_COMMENTS
      ) {
        toast.error("Thiếu cấu hình collection bình luận");
        return null;
      }

      const cleanContent = content.trim();
      if (cleanContent.length === 0 && attachments.length === 0) {
        return null;
      }

      isSubmittingRef.current = true;
      setIsSubmitting(true);

      try {
        let parsedAttachments: CommentAttachment[] = [];
        let serializedAttachments: string[] = [];

        if (attachments.length > 0) {
          const uploaded = await uploadFilesToCloudinary(
            attachments.map((item) => item.file)
          );
          parsedAttachments = uploaded.map((item) => {
            const normalizedType: CommentAttachment["type"] =
              item.type === "image" || item.type === "video"
                ? item.type
                : "file";
            return {
              url: item.url,
              type: normalizedType,
              name: item.name,
              size: item.size,
              mimeType: item.mimeType,
            };
          });
          serializedAttachments = parsedAttachments.map((item) =>
            JSON.stringify({ url: item.url, type: item.type })
          );
        }

        const created = await database.createDocument(
          String(process.env.NEXT_PUBLIC_DATABASE_ID),
          String(process.env.NEXT_PUBLIC_COLLECTION_ID_COMMENTS),
          ID.unique(),
          {
            taskId,
            content: cleanContent,
            attachments: serializedAttachments,
            userProfile: userId,
            isVisible: true,
          },
          [
            Permission.read(Role.any()),
            Permission.update(Role.user(userId)),
            Permission.delete(Role.user(userId)),
          ]
        );

        const newComment: TaskComment = {
          id: created.$id,
          content: cleanContent,
          createdAt: created.$createdAt ?? new Date().toISOString(),
          isVisible: created.isVisible ?? true,
          user: {
            id: userId,
            name: userName,
          },
          attachments: parsedAttachments,
        };

        toast.success("Đã gửi bình luận");
        return { comment: newComment };
      } catch (error) {
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          (error as { code?: number }).code === 409
        ) {
          toast.error("Bình luận có thể đã được gửi. Vui lòng refresh trang.");
        } else {
          const message =
            error instanceof Error ? error.message : "Gửi bình luận thất bại";
          toast.error(message);
        }
        return null;
      } finally {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
    },
    []
  );

  return {
    isSubmitting,
    createComment,
  };
};

export type UseCreateCommentResult = ReturnType<typeof useCreateComment>;
