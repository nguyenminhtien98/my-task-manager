"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Query } from "appwrite";
import { database, subscribeToRealtime } from "../appwrite";
import { uploadFilesToCloudinary } from "../utils/upload";
import {
  CommentAttachment,
  PendingAttachment,
  TaskComment,
} from "../components/comments/types";
import { mapCommentDocument, RawCommentDocument } from "../utils/comment";
import { createNotifications } from "../services/notificationService";

interface CreateCommentParams {
  taskId: string;
  userId: string;
  userName: string;
  content: string;
  attachments: PendingAttachment[];
}

interface UpdateCommentParams {
  comment: TaskComment;
  content: string;
  retainedAttachments: CommentAttachment[];
  newAttachments: PendingAttachment[];
}

interface UseCommentOptions {
  locked?: boolean;
  taskTitle?: string;
  projectId?: string;
  projectName?: string;
  assigneeId?: string;
  assigneeName?: string;
  leaderId?: string;
  leaderName?: string;
}

const getCollectionInfo = () => {
  const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID;
  const collectionId = process.env.NEXT_PUBLIC_COLLECTION_ID_COMMENTS;
  if (!databaseId || !collectionId) {
    throw new Error("Thiếu cấu hình collection bình luận");
  }
  return { databaseId, collectionId };
};

const serializeAttachment = (attachment: CommentAttachment) =>
  JSON.stringify({
    url: attachment.url,
    type: attachment.type,
    name: attachment.name,
    size: attachment.size,
    mimeType: attachment.mimeType,
  });

export const useComment = (taskId?: string, options?: UseCommentOptions) => {
  const isLocked = options?.locked ?? false;
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const isCreatingRef = useRef(false);

  const mergeComment = useCallback(
    (existing: TaskComment | undefined, incoming: TaskComment): TaskComment => {
      const hasValidIncomingName =
        incoming.user.name &&
        incoming.user.name.trim().length > 0 &&
        incoming.user.name !== "Người dùng";
      const user = hasValidIncomingName
        ? incoming.user
        : existing?.user ?? incoming.user;

      return {
        ...(existing ?? incoming),
        ...incoming,
        user,
      };
    },
    []
  );

  useEffect(() => {
    if (!taskId) {
      setComments([]);
      return;
    }
    let cancelled = false;
    const fetchComments = async () => {
      try {
        setIsLoading(true);
        const { databaseId, collectionId } = getCollectionInfo();
        const res = await database.listDocuments(databaseId, collectionId, [
          Query.equal("taskId", taskId),
          Query.orderDesc("$createdAt"),
        ]);
        if (cancelled) return;
        const mapped = (res.documents as unknown as RawCommentDocument[]).map(
          (doc) => mapCommentDocument(doc)
        );
        setComments(mapped);
      } catch (error) {
        console.error("Fetch comments failed:", error);
        if (!cancelled) {
          toast.error("Không thể tải bình luận");
          setComments([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetchComments();
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  useEffect(() => {
    if (!taskId) return;
    const { databaseId, collectionId } = getCollectionInfo();
    const channel = `databases.${databaseId}.collections.${collectionId}.documents`;
    const unsubscribe = subscribeToRealtime([channel], (res: unknown) => {
      const payload = res as {
        events: string[];
        payload: { $id?: string; data?: unknown };
      };
      if (!payload?.events?.length) return;
      const events = payload.events;
      const rawData =
        (payload.payload?.data as RawCommentDocument | undefined) ??
        (payload.payload as unknown as RawCommentDocument | undefined);

      const documentId = payload.payload?.$id;

      if (events.some((e) => e.endsWith(".delete"))) {
        if (documentId) {
          setComments((prev) => prev.filter((item) => item.id !== documentId));
        }
        return;
      }

      if (!rawData) return;
      const docTaskId = (rawData as unknown as { taskId?: string }).taskId;
      if (!docTaskId || docTaskId !== taskId) return;

      const incoming = mapCommentDocument(rawData);

      if (events.some((e) => e.endsWith(".create"))) {
        setComments((prev) => {
          if (prev.some((item) => item.id === incoming.id)) return prev;
          return [incoming, ...prev];
        });
      } else if (events.some((e) => e.endsWith(".update"))) {
        setComments((prev) =>
          prev.map((item) =>
            item.id === incoming.id ? mergeComment(item, incoming) : item
          )
        );
      }
    });

    return () => {
      unsubscribe();
    };
  }, [taskId, mergeComment]);

  const createComment = useCallback(
    async ({
      taskId: targetTaskId,
      userId,
      userName,
      content,
      attachments,
    }: CreateCommentParams): Promise<TaskComment | null> => {
      if (!targetTaskId) return null;
      if (isLocked) {
        toast.error("Dự án đã bị đóng, không thể bình luận.");
        return null;
      }
      if (isCreatingRef.current) {
        toast.error("Đang gửi bình luận, vui lòng đợi...");
        return null;
      }

      const cleanContent = content.trim();
      if (cleanContent.length === 0 && attachments.length === 0) {
        return null;
      }

      try {
        const { databaseId, collectionId } = getCollectionInfo();

        isCreatingRef.current = true;
        setIsCreating(true);

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
          serializedAttachments = parsedAttachments.map(serializeAttachment);
        }

        const created = await database.createDocument(
          databaseId,
          collectionId,
          "unique()",
          {
            taskId: targetTaskId,
            content: cleanContent,
            attachments: serializedAttachments,
            userProfile: userId,
            isVisible: true,
          }
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

        setComments((prev) => {
          const existing = prev.find((item) => item.id === newComment.id);
          if (existing) {
            const merged = mergeComment(existing, newComment);
            return prev.map((item) => (item.id === merged.id ? merged : item));
          }
          return [newComment, ...prev];
        });

        const recipients = new Set<string>();
        const notificationsPayload: Parameters<typeof createNotifications>[0] = [];
        const taskTitle = options?.taskTitle ?? "";
        const projectId = options?.projectId;

        if (options?.leaderId && options.leaderId !== userId) {
          if (!recipients.has(options.leaderId)) {
            recipients.add(options.leaderId);
            notificationsPayload.push({
              recipientId: options.leaderId,
              actorId: userId,
              type: "task.comment.added",
              scope: "task",
              projectId,
              taskId: targetTaskId,
              metadata: {
                actorName: userName,
                taskTitle,
                projectName: options?.projectName,
              },
            });
          }
        }

        if (options?.assigneeId && options.assigneeId !== userId) {
          if (!recipients.has(options.assigneeId)) {
            recipients.add(options.assigneeId);
            notificationsPayload.push({
              recipientId: options.assigneeId,
              actorId: userId,
              type: "task.comment.added",
              scope: "task",
              projectId,
              taskId: targetTaskId,
              metadata: {
                actorName: userName,
                taskTitle,
                projectName: options?.projectName,
              },
            });
          }
        }

        if (notificationsPayload.length > 0) {
          await createNotifications(notificationsPayload);
        }

        toast.success("Đã gửi bình luận");
        return newComment;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Gửi bình luận thất bại";
        toast.error(message);
        return null;
      } finally {
        isCreatingRef.current = false;
        setIsCreating(false);
      }
    },
    [mergeComment, isLocked, options]
  );

  const updateComment = useCallback(
    async ({
      comment,
      content,
      retainedAttachments,
      newAttachments,
    }: UpdateCommentParams): Promise<TaskComment | null> => {
      if (isLocked) {
        toast.error("Dự án đã bị đóng, không thể chỉnh sửa bình luận.");
        return null;
      }
      try {
        const { databaseId, collectionId } = getCollectionInfo();
        const trimmedContent = content.trim();
        const hasAttachments =
          retainedAttachments.length > 0 || newAttachments.length > 0;
        if (trimmedContent.length === 0 && !hasAttachments) {
          toast.error("Bình luận không được để trống");
          return null;
        }

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

        const serializedAttachments =
          combinedAttachments.map(serializeAttachment);

        const updated = await database.updateDocument(
          databaseId,
          collectionId,
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

        setComments((prev) =>
          prev.map((item) =>
            item.id === updatedComment.id
              ? mergeComment(item, updatedComment)
              : item
          )
        );
        toast.success("Đã cập nhật bình luận");
        return updatedComment;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Cập nhật bình luận thất bại";
        toast.error(message);
        return null;
      }
    },
    [mergeComment, isLocked]
  );

  const deleteComment = useCallback(
    async (commentId: string): Promise<boolean> => {
      if (isLocked) {
        toast.error("Dự án đã bị đóng, không thể xóa bình luận.");
        return false;
      }
      try {
        const { databaseId, collectionId } = getCollectionInfo();
        await database.deleteDocument(databaseId, collectionId, commentId);
        setComments((prev) => prev.filter((item) => item.id !== commentId));
        toast.success("Đã xóa bình luận");
        return true;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Xóa bình luận thất bại";
        toast.error(message);
        return false;
      }
    },
    [isLocked]
  );

  return {
    comments,
    isLoading,
    isCreating,
    createComment,
    updateComment,
    deleteComment,
  };
};

export type UseCommentResult = ReturnType<typeof useComment>;
export type { CreateCommentParams, UpdateCommentParams };
