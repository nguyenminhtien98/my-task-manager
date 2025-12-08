"use client";

import React, { useCallback, useEffect, useRef } from "react";
import CommentItem from "./CommentItem";
import type {
  Comment,
  CommentAttachment,
  TaskAttachment,
  PendingAttachment,
} from "@/app/types/Types";

interface CommentListProps {
  comments: Comment[];
  isLoading: boolean;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onPreview: (media: TaskAttachment) => void;
  onUpdateComment: (
    commentId: string,
    content: string,
    retainedAttachments: CommentAttachment[],
    newAttachments: PendingAttachment[]
  ) => Promise<Comment | null>;
  onDeleteComment: (commentId: string) => Promise<boolean>;
  isLocked?: boolean;
}

const CommentList: React.FC<CommentListProps> = ({
  comments,
  isLoading,
  isLoadingMore = false,
  hasMore = false,
  onLoadMore,
  onPreview,
  onUpdateComment,
  onDeleteComment,
  isLocked = false,
}) => {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const triggerRef = useRef<HTMLDivElement | null>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasMore && !isLoadingMore && onLoadMore) {
        onLoadMore();
      }
    },
    [hasMore, isLoadingMore, onLoadMore]
  );

  useEffect(() => {
    if (!onLoadMore || !hasMore) return;

    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(handleObserver, {
      threshold: 0.5,
    });

    if (triggerRef.current) {
      observerRef.current.observe(triggerRef.current);
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [handleObserver, hasMore, onLoadMore]);
  if (isLoading) {
    return <div className="text-sm text-white">Đang tải bình luận...</div>;
  }

  if (!comments.length) {
    return <div className="text-xs text-white">Chưa có bình luận nào.</div>;
  }

  return (
    <div className="space-y-4">
      {comments.map((comment, index) => (
        <React.Fragment key={comment._id}>
          <CommentItem
            comment={comment}
            onPreview={onPreview}
            onUpdateComment={onUpdateComment}
            onDeleteComment={onDeleteComment}
            isLocked={isLocked}
          />
          {index === comments.length - 2 && hasMore && (
            <div ref={triggerRef} className="h-1" />
          )}
        </React.Fragment>
      ))}
      {isLoadingMore && (
        <div className="text-center text-sm text-white/70 py-2">
          Đang tải thêm bình luận...
        </div>
      )}
    </div>
  );
};

export default CommentList;
