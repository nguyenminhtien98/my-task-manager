"use client";

import React, { useState } from "react";
import CommentForm from "./CommentForm";
import CommentList from "./CommentList";
import type {
  CommentSectionProps,
  TaskAttachment,
} from "@/app/types/Types";
import MediaPreviewModal from "../common/MediaPreviewModal";
import { useComment } from "@/app/hooks/useComment";
import { useProject } from "@/app/context/ProjectContext";
import { useModeration } from "@/app/hooks/useModeration";

const CommentSection: React.FC<CommentSectionProps> = ({
  taskId,
  canComment = true,
  isLocked = false,
  taskTitle,
  assigneeId,
  assigneeName,
}) => {
  const { currentProject } = useProject();
  const projectId = currentProject?._id;
  const projectName = currentProject?.name;
  const leaderId = currentProject?.leader?._id;
  const leaderName = currentProject?.leader?.name;
  const {
    comments,
    isLoading,
    isCreating,
    isLoadingMore,
    hasMore,
    loadMoreComments,
    createComment,
    updateComment,
    deleteComment,
  } = useComment(taskId, {
    locked: isLocked,
    taskTitle,
    projectId,
    projectName,
    assigneeId,
    assigneeName,
    leaderId,
    leaderName,
  });
  const [previewMedia, setPreviewMedia] = useState<TaskAttachment | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { isCommentDisabled } = useModeration();
  const isFormDisabled = isLocked || isCommentDisabled;

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
      {canComment && !isFormDisabled && (
        <CommentForm
          taskId={taskId}
          isSubmitting={isCreating}
          onSubmit={createComment}
          disabled={isFormDisabled}
        />
      )}
      {isLocked && (
        <p className="mt-2 text-xs text-red-300">
          Dự án đã đóng, bình luận tạm thời bị khóa.
        </p>
      )}
      <div className={canComment ? "mt-4" : undefined}>
        <CommentList
          comments={comments}
          isLoading={isLoading}
          isLoadingMore={isLoadingMore}
          hasMore={hasMore}
          onLoadMore={loadMoreComments}
          onPreview={handlePreview}
          onUpdateComment={updateComment}
          onDeleteComment={deleteComment}
          isLocked={isLocked}
        />
      </div>
      <MediaPreviewModal isOpen={isPreviewOpen} onClose={closePreview} media={previewMedia} />
    </div>
  );
};

export default CommentSection;
