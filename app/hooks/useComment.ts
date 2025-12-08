"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useSocket } from "../context/SocketContext";
import { uploadFilesToCloudinary } from "../utils/upload";
import type {
  Comment,
  CommentAttachment,
  PendingAttachment,
} from "../types/Types";
import * as commentAPI from "../services/commentService";

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

export const useComment = (taskId?: string, options?: UseCommentOptions) => {
  const isLocked = options?.locked ?? false;
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const isCreatingRef = useRef(false);
  const COMMENTS_PER_PAGE = 15;

  useEffect(() => {
    if (!taskId) {
      setComments([]);
      setCurrentPage(1);
      setHasMore(true);
      return;
    }
    let cancelled = false;
    const fetchComments = async () => {
      try {
        setIsLoading(true);
        const result = await commentAPI.getComments(
          taskId,
          1,
          COMMENTS_PER_PAGE
        );
        if (cancelled) return;
        setComments(result.comments);
        setCurrentPage(1);
        setHasMore(result.pagination.page < result.pagination.totalPages);
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
  }, [taskId, COMMENTS_PER_PAGE]);

  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (!socket || !isConnected || !taskId) return;

    const handleCommentAdded = (comment: Comment) => {
      if (comment.task !== taskId) return;
      setComments((prev) => {
        if (prev.some((item) => item._id === comment._id)) return prev;
        return [comment, ...prev];
      });
    };

    const handleCommentUpdated = (comment: Comment) => {
      if (comment.task !== taskId) return;
      setComments((prev) =>
        prev.map((item) => (item._id === comment._id ? comment : item))
      );
    };

    const handleCommentDeleted = (data: {
      commentId: string;
      taskId: string;
    }) => {
      if (data.taskId !== taskId) return;
      setComments((prev) => prev.filter((item) => item._id !== data.commentId));
    };

    socket.on("comment:added", handleCommentAdded);
    socket.on("comment:updated", handleCommentUpdated);
    socket.on("comment:deleted", handleCommentDeleted);

    return () => {
      socket.off("comment:added", handleCommentAdded);
      socket.off("comment:updated", handleCommentUpdated);
      socket.off("comment:deleted", handleCommentDeleted);
    };
  }, [socket, isConnected, taskId]);

  const loadMoreComments = useCallback(async () => {
    if (!taskId || !hasMore || isLoadingMore || isLoading) return;

    try {
      setIsLoadingMore(true);
      const nextPage = currentPage + 1;
      const result = await commentAPI.getComments(
        taskId,
        nextPage,
        COMMENTS_PER_PAGE
      );

      setComments((prev) => [...prev, ...result.comments]);
      setCurrentPage(nextPage);
      setHasMore(result.pagination.page < result.pagination.totalPages);
    } catch (error) {
      console.error("Load more comments failed:", error);
      toast.error("Không thể tải thêm bình luận");
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    taskId,
    hasMore,
    isLoadingMore,
    isLoading,
    currentPage,
    COMMENTS_PER_PAGE,
  ]);

  const createComment = useCallback(
    async (
      taskId: string,
      content: string,
      attachments: PendingAttachment[]
    ): Promise<Comment | null> => {
      if (!taskId) return null;
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
        isCreatingRef.current = true;
        setIsCreating(true);

        let uploadedAttachments: CommentAttachment[] = [];

        if (attachments.length > 0) {
          const uploaded = await uploadFilesToCloudinary(
            attachments.map((item) => item.file)
          );
          uploadedAttachments = uploaded.map((item) => ({
            url: item.url,
            name: item.name,
            type:
              item.type === "image" || item.type === "video"
                ? item.type
                : "file",
            size: item.size,
            mimeType: item.mimeType,
          }));
        }

        const newComment = await commentAPI.createComment(taskId, {
          content: cleanContent,
          attachments:
            uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
        });

        setComments((prev) => {
          if (prev.some((item) => item._id === newComment._id)) {
            return prev.map((item) =>
              item._id === newComment._id ? newComment : item
            );
          }
          return [newComment, ...prev];
        });

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
    [isLocked]
  );

  const updateComment = useCallback(
    async (
      commentId: string,
      content: string,
      retainedAttachments: CommentAttachment[],
      newAttachments: PendingAttachment[]
    ): Promise<Comment | null> => {
      if (isLocked) {
        toast.error("Dự án đã bị đóng, không thể chỉnh sửa bình luận.");
        return null;
      }
      try {
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
          uploadedAttachments = uploaded.map((item) => ({
            url: item.url,
            name: item.name,
            type:
              item.type === "image" || item.type === "video"
                ? item.type
                : "file",
            size: item.size,
            mimeType: item.mimeType,
          }));
        }

        const combinedAttachments: CommentAttachment[] = [
          ...retainedAttachments,
          ...uploadedAttachments,
        ];

        const updatedComment = await commentAPI.updateComment(commentId, {
          content: trimmedContent,
          attachments: combinedAttachments,
        });

        setComments((prev) =>
          prev.map((item) =>
            item._id === updatedComment._id ? updatedComment : item
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
    [isLocked]
  );

  const deleteComment = useCallback(
    async (commentId: string): Promise<boolean> => {
      if (isLocked) {
        toast.error("Dự án đã bị đóng, không thể xóa bình luận.");
        return false;
      }
      try {
        await commentAPI.deleteComment(commentId);
        setComments((prev) => prev.filter((item) => item._id !== commentId));
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
    isLoadingMore,
    hasMore,
    loadMoreComments,
    createComment,
    updateComment,
    deleteComment,
  };
};

export type UseCommentResult = ReturnType<typeof useComment>;
