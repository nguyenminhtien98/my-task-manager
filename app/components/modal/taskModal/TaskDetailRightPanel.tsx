"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import { FiPlay } from "react-icons/fi";
import MediaPreviewModal from "../../common/MediaPreviewModal";
import CommentSection from "../../comments/CommentSection";
import { TaskAttachment } from "../../../types/Types";
import { detectMediaTypeFromUrl } from "../../../utils/media";
import { useAuth } from "../../../context/AuthContext";
import { useProject } from "../../../context/ProjectContext";

interface TaskDetailRightPanelProps {
  attachments: TaskAttachment[];
  className?: string;
  taskId?: string;
  assignee?: string | { $id: string; name: string };
}

const TaskDetailRightPanel: React.FC<TaskDetailRightPanelProps> = ({
  attachments,
  className,
  taskId,
  assignee,
}) => {
  const [previewMedia, setPreviewMedia] = useState<TaskAttachment | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { user } = useAuth();
  const { currentProject, isProjectClosed } = useProject();
  const leaderId = currentProject?.leader?.$id;
  const canComment =
    !isProjectClosed &&
    !!user &&
    (user.id === (typeof assignee === "object" ? assignee?.$id : assignee) ||
      user.id === leaderId);

  const visualAttachments = useMemo(
    () =>
      attachments.filter(
        (item) => item.type === "image" || item.type === "video"
      ),
    [attachments]
  );

  const fileAttachments = useMemo(
    () => attachments.filter((item) => item.type === "file"),
    [attachments]
  );

  const primaryVisual = visualAttachments[0] ?? null;
  const secondaryVisual = useMemo(
    () => (visualAttachments.length > 1 ? visualAttachments.slice(1) : []),
    [visualAttachments]
  );

  const openPreview = (item: TaskAttachment) => {
    if (item.type === "file") {
      window.open(item.url, "_blank", "noopener,noreferrer");
      return;
    }
    setPreviewMedia({
      ...item,
      type: item.type ?? detectMediaTypeFromUrl(item.url),
    });
    setIsPreviewOpen(true);
  };

  const closePreview = () => {
    setPreviewMedia(null);
    setIsPreviewOpen(false);
  };

  const renderPreview = (item: TaskAttachment, height = "h-44") => {
    const resolvedType = item.type ?? detectMediaTypeFromUrl(item.url);
    if (resolvedType === "file") {
      return (
        <div
          className={`flex ${height} w-full items-center justify-center rounded-lg bg-black/50`}
        >
          <span className="text-sm font-semibold text-white">
            Tệp đính kèm
          </span>
        </div>
      );
    }

    if (resolvedType === "video") {
      return (
        <div className={`relative flex ${height} w-full items-center justify-center overflow-hidden rounded-lg bg-black/60`}>
          <video src={item.url} className="h-full w-full object-contain" />
          <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-white">
            <FiPlay size={28} />
          </span>
        </div>
      );
    }

    return (
      <div
        className={`relative flex ${height} w-full items-center justify-center overflow-hidden rounded-lg bg-black/60`}
      >
        <Image
          src={item.url}
          alt={item.name}
          className="h-full w-full object-contain"
          width={800}
          height={600}
          unoptimized
        />
      </div>
    );
  };

  return (
    <div
      className={`flex h-full flex-col overflow-hidden rounded-lg border bg-black/60 text-white ${className ?? ""
        }`}
    >
      <div className="flex flex-1 flex-col overflow-y-auto no-scrollbar">
        {primaryVisual && (
          <button
            type="button"
            onClick={() => openPreview(primaryVisual)}
            className="mb-3 block w-full text-left"
          >
            {renderPreview(primaryVisual, "h-64")}
          </button>
        )}

        {secondaryVisual.length > 0 && (
          <div className="space-y-3 px-4 pb-4">
            <div className="text-sm font-semibold text-white">
              Tệp đính kèm
            </div>
            <div className="grid gap-3">
              {secondaryVisual.map((item) => (
                <button
                  key={item.url}
                  type="button"
                  onClick={() => openPreview(item)}
                  className="flex flex-col items-start gap-2 rounded-lg bg-black/55 p-3 text-left hover:bg-black/70"
                >
                  <div className="flex w-full items-center justify-center overflow-hidden rounded-lg bg-black/40">
                    {renderPreview(item, "h-32")}
                  </div>
                  <span className="text-sm font-medium text-blue-300 underline">
                    {item.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {fileAttachments.length > 0 && (
          <div className="space-y-2 px-4 py-4">
            <div className="text-sm font-semibold text-white">Tệp đính kèm</div>
            <div className="space-y-2 rounded-lg bg-black/55 px-3 py-3">
              {fileAttachments.map((item) => (
                <button
                  key={item.url}
                  type="button"
                  onClick={() => openPreview(item)}
                  className="cursor-pointer block text-left text-sm font-medium text-blue-300 underline hover:text-blue-200"
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {attachments.length === 0 && (
          <div className="px-4 py-2 text-sm font-semibold text-white">
            Nhận xét
          </div>
        )}

        <CommentSection
          taskId={taskId}
          canComment={canComment}
          isLocked={isProjectClosed}
        />
      </div>

      <MediaPreviewModal
        isOpen={isPreviewOpen}
        onClose={closePreview}
        media={previewMedia}
      />
    </div>
  );
};

export default TaskDetailRightPanel;
