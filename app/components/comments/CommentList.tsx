"use client";

import React from "react";
import CommentItem from "./CommentItem";
import { TaskComment, TaskAttachment } from "./types";
import type { UpdateCommentParams } from "@/app/hooks/useComment";

interface CommentListProps {
  comments: TaskComment[];
  isLoading: boolean;
  onPreview: (media: TaskAttachment) => void;
  onUpdateComment: (params: UpdateCommentParams) => Promise<TaskComment | null>;
  onDeleteComment: (commentId: string) => Promise<boolean>;
}

const CommentList: React.FC<CommentListProps> = ({
  comments,
  isLoading,
  onPreview,
  onUpdateComment,
  onDeleteComment,
}) => {
  if (isLoading) {
    return <div className="text-sm text-white">Đang tải bình luận...</div>;
  }

  if (!comments.length) {
    return <div className="text-xs text-white">Chưa có bình luận nào.</div>;
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          onPreview={onPreview}
          onUpdateComment={onUpdateComment}
          onDeleteComment={onDeleteComment}
        />
      ))}
    </div>
  );
};

export default CommentList;
