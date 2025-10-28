"use client";

import React from "react";
import CommentItem from "./CommentItem";
import { TaskComment, TaskMedia } from "./types";

interface CommentListProps {
  comments: TaskComment[];
  isLoading: boolean;
  onPreview: (media: TaskMedia) => void;
  onCommentUpdated: (comment: TaskComment) => void;
}

const CommentList: React.FC<CommentListProps> = ({ comments, isLoading, onPreview, onCommentUpdated }) => {
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
          onUpdated={onCommentUpdated}
        />
      ))}
    </div>
  );
};

export default CommentList;
