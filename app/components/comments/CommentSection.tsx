"use client";

import React, { useState } from "react";
import CommentForm from "./CommentForm";
import CommentList from "./CommentList";
import { CommentSectionProps, TaskAttachment } from "./types";
import MediaPreviewModal from "../common/MediaPreviewModal";
import { useComment } from "@/app/hooks/useComment";

const CommentSection: React.FC<CommentSectionProps> = ({
  taskId,
  canComment = true,
}) => {
  const {
    comments,
    isLoading,
    isCreating,
    createComment,
    updateComment,
    deleteComment,
  } = useComment(taskId);
  const [previewMedia, setPreviewMedia] = useState<TaskAttachment | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handlePreview = (media: TaskAttachment) => {
    setPreviewMedia(media);
    setIsPreviewOpen(true);
  };

  const closePreview = () => {
    setIsPreviewOpen(false);
    setPreviewMedia(null);
  };

  if (!taskId) {
    return <div className="text-xs text-gray-500">Chưa chọn task để hiển thị bình luận.</div>;
  }

  return (
    <div className="px-4 pb-6">
      {canComment && (
        <CommentForm
          taskId={taskId}
          isSubmitting={isCreating}
          onSubmit={createComment}
        />
      )}
      <div className={canComment ? "mt-4" : undefined}>
        <CommentList
          comments={comments}
          isLoading={isLoading}
          onPreview={handlePreview}
          onUpdateComment={updateComment}
          onDeleteComment={deleteComment}
        />
      </div>
      <MediaPreviewModal isOpen={isPreviewOpen} onClose={closePreview} media={previewMedia} />
    </div>
  );
};

export default CommentSection;
