"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import { FiPlay } from "react-icons/fi";
import MediaPreviewModal from "../../common/MediaPreviewModal";
import CommentSection from "../../comments/CommentSection";
import { TaskMedia } from "../../../types/Types";
import { detectMediaTypeFromUrl } from "../../../utils/media";
import { useAuth } from "../../../context/AuthContext";
import { useProject } from "../../../context/ProjectContext";

interface TaskDetailRightPanelProps {
  media: TaskMedia[];
  className?: string;
  taskId?: string;
  assignee?: string | { $id: string; name: string };
}

const TaskDetailRightPanel: React.FC<TaskDetailRightPanelProps> = ({
  media,
  className,
  taskId,
  assignee,
}) => {
  const [previewMedia, setPreviewMedia] = useState<TaskMedia | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isAttachmentListOpen, setIsAttachmentListOpen] = useState(false);
  const { user } = useAuth();
  const { currentProject } = useProject();
  const leaderId = currentProject?.leader?.$id;
  const canComment =
    user &&
    (user.id === (typeof assignee === "object" ? assignee?.$id : assignee) ||
      user.id === leaderId);

  const primaryMedia = media[0];
  const extraMedia = useMemo(
    () => (media.length > 1 ? media.slice(1) : []),
    [media]
  );

  const openPreview = (item: TaskMedia) => {
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

  const renderTaskAttachment = (item: TaskMedia, height = "h-56") => {
    const resolvedType = item.type ?? detectMediaTypeFromUrl(item.url);
    return (
      <button
        type="button"
        onClick={() => openPreview(item)}
        className={`group relative flex ${height} w-full items-center justify-center overflow-hidden rounded-lg bg-gray-800`}
      >
        {resolvedType === "video" ? (
          <>
            <video src={item.url} className="h-full w-full object-contain" />
            <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-white">
              <FiPlay size={28} />
            </span>
          </>
        ) : (
          <Image
            src={item.url}
            alt={item.name}
            className="h-full w-full object-contain"
            width={800}
            height={600}
            unoptimized
          />
        )}
      </button>
    );
  };

  return (
    <div
      className={`flex h-full flex-col overflow-hidden rounded-lg border bg-black/60 text-white ${
        className ?? ""
      }`}
    >
      <div className="flex flex-1 flex-col overflow-y-auto no-scrollbar">
        {primaryMedia && (
          <div className="pb-2">{renderTaskAttachment(primaryMedia)}</div>
        )}

        {primaryMedia && extraMedia.length > 0 && (
          <div className="space-y-2 px-4 pb-4">
            <button
              type="button"
              className="text-sm font-semibold text-white underline cursor-pointer text-left w-full"
              onClick={() => setIsAttachmentListOpen(!isAttachmentListOpen)}
            >
              Các tệp đính kèm
            </button>
            {isAttachmentListOpen && (
              <div className="flex flex-col gap-1 pt-1">
                {extraMedia.map((item) => {
                  const resolvedType =
                    item.type ?? detectMediaTypeFromUrl(item.url);
                  return (
                    <button
                      key={item.url}
                      type="button"
                      onClick={() => openPreview(item)}
                      className="cursor-pointer grid grid-cols-[15%_1fr] items-center gap-3 rounded-lg bg-black/55 p-1 text-left text-sm text-gray-200 hover:bg-black/70"
                    >
                      <div className="relative flex h-13 items-center justify-center overflow-hidden rounded bg-gray-800">
                        {resolvedType === "video" ? (
                          <>
                            <video
                              src={item.url}
                              className="h-full w-full object-cover"
                            />
                            <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-white">
                              <FiPlay size={22} />
                            </span>
                          </>
                        ) : (
                          <Image
                            src={item.url}
                            alt={item.name}
                            width={300}
                            height={200}
                            unoptimized
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <div className="space-y-1 text-sm">
                        <p className="font-medium text-white">{item.name}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {!primaryMedia && (
          <div className="px-4 py-2 text-sm font-semibold text-white">
            Nhận xét
          </div>
        )}

        {canComment && <CommentSection taskId={taskId} />}
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
