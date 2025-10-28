"use client";

import React, { useEffect, useState } from "react";
import { Query } from "appwrite";
import { database } from "../../appwrite";
import CommentForm from "./CommentForm";
import CommentList from "./CommentList";
import { CommentSectionProps, TaskComment, TaskMedia } from "./types";
import MediaPreviewModal from "../common/MediaPreviewModal";
import { mapCommentDocument, RawCommentDocument } from "@/app/utils/comment";

const CommentSection: React.FC<CommentSectionProps> = ({ taskId }) => {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<TaskMedia | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    if (!taskId) return;
    setIsLoading(true);
    database
      .listDocuments(
        String(process.env.NEXT_PUBLIC_DATABASE_ID),
        String(process.env.NEXT_PUBLIC_COLLECTION_ID_COMMENTS),
        [
          Query.equal("taskId", taskId),
          Query.orderDesc("$createdAt"),
        ]
      )
      .then((res) => {
        setComments(res.documents.map((doc) => mapCommentDocument(doc as RawCommentDocument)));
      })
      .catch(() => {
        setComments([]);
      })
      .finally(() => setIsLoading(false));
  }, [taskId]);

  const handleCommentCreated = (comment: TaskComment) => {
    setComments((prev) => [comment, ...prev]);
  };

  const handleCommentUpdated = (updated: TaskComment) => {
    setComments((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item))
    );
  };

  const handlePreview = (media: TaskMedia) => {
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
      <CommentForm taskId={taskId} onCommentCreated={handleCommentCreated} />
      <div className="mt-4">
        <CommentList
          comments={comments}
          isLoading={isLoading}
          onPreview={handlePreview}
          onCommentUpdated={handleCommentUpdated}
        />
      </div>
      <MediaPreviewModal isOpen={isPreviewOpen} onClose={closePreview} media={previewMedia} />
    </div>
  );
};

export default CommentSection;
