"use client";

import { useCallback, useRef, useState } from "react";
import toast from "react-hot-toast";
import { database } from "../appwrite";
import { uploadFilesToCloudinary } from "../utils/upload";
import {
  CommentAttachment,
  PendingAttachment,
  TaskComment,
} from "../components/comments/types";

interface UpdateCommentParams {
  comment: TaskComment;
  content: string;
  retainedAttachments: CommentAttachment[];
  newAttachments: PendingAttachment[];
}

interface UpdateCommentResult {
  comment: TaskComment;
}

export const useUpdateComment = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const isUpdatingRef = useRef(false);

  const updateComment = useCallback(
    async ({
      comment,
      content,
      retainedAttachments,
      newAttachments,
    }: UpdateCommentParams): Promise<UpdateCommentResult | null> => {
      if (
        !process.env.NEXT_PUBLIC_DATABASE_ID ||
        !process.env.NEXT_PUBLIC_COLLECTION_ID_COMMENTS
      ) {
        toast.error("Thiếu cấu hình Appwrite");
        return null;
      }

      if (isUpdatingRef.current) {
        return null;
      }

      const trimmedContent = content.trim();
      const hasAttachments =
        retainedAttachments.length > 0 || newAttachments.length > 0;
      if (trimmedContent.length === 0 && !hasAttachments) {
        toast.error("Bình luận không được để trống");
        return null;
      }

      isUpdatingRef.current = true;
      setIsUpdating(true);

      try {
        let uploadedAttachments: CommentAttachment[] = [];
        if (newAttachments.length > 0) {
          const uploaded = await uploadFilesToCloudinary(
            newAttachments.map((item) => item.file)
          );
          uploadedAttachments = uploaded.map((item) => {
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
        }

        const combinedAttachments = [
          ...retainedAttachments.map((attachment) => ({ ...attachment })),
          ...uploadedAttachments,
        ];

        const serializedAttachments = combinedAttachments.map((attachment) =>
          JSON.stringify({ url: attachment.url, type: attachment.type })
        );

        const updated = await database.updateDocument(
          String(process.env.NEXT_PUBLIC_DATABASE_ID),
          String(process.env.NEXT_PUBLIC_COLLECTION_ID_COMMENTS),
          comment.id,
          {
            content: trimmedContent,
            attachments: serializedAttachments,
          }
        );

        const updatedComment: TaskComment = {
          ...comment,
          content: trimmedContent,
          attachments: combinedAttachments,
          isVisible:
            typeof updated.isVisible === "boolean"
              ? updated.isVisible
              : comment.isVisible,
        };

        toast.success("Đã cập nhật bình luận");
        return { comment: updatedComment };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Cập nhật bình luận thất bại";
        toast.error(message);
        return null;
      } finally {
        isUpdatingRef.current = false;
        setIsUpdating(false);
      }
    },
    []
  );

  return {
    isUpdating,
    updateComment,
  };
};

export type UseUpdateCommentResult = ReturnType<typeof useUpdateComment>;
