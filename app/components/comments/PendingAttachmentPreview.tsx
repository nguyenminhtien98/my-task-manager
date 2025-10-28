"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useRef, useState } from "react";
import { FiPause, FiPlay, FiX } from "react-icons/fi";
import { PendingAttachment } from "./types";

interface PendingAttachmentPreviewProps {
  attachment: PendingAttachment;
  onRemove: (id: string) => void;
}

const PendingAttachmentPreview: React.FC<PendingAttachmentPreviewProps> = ({ attachment, onRemove }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  if ((attachment.mediaType === "image" || attachment.mediaType === "video") && attachment.previewUrl) {
    return (
      <div className="relative mx-auto w-4/5 overflow-hidden rounded-lg bg-black/30">
        {attachment.mediaType === "image" ? (
          <img
            src={attachment.previewUrl}
            alt={attachment.file.name}
            className="w-full object-contain"
          />
        ) : (
          <>
            <video
              ref={videoRef}
              src={attachment.previewUrl}
              className="w-full object-contain"
              onEnded={() => setIsPlaying(false)}
            />
            <button
              type="button"
              onClick={() => {
                if (!videoRef.current) return;
                if (isPlaying) {
                  videoRef.current.pause();
                  setIsPlaying(false);
                } else {
                  void videoRef.current.play();
                  setIsPlaying(true);
                }
              }}
              className="absolute inset-0 flex items-center justify-center bg-black/40 text-white"
              title={isPlaying ? "Tạm dừng" : "Phát"}
            >
              {isPlaying ? <FiPause size={28} /> : <FiPlay size={28} />}
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => onRemove(attachment.id)}
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black"
          title="Gỡ đính kèm"
        >
          <FiX />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded bg-black/30 px-3 py-2 text-sm">
      <span className="text-blue-400 underline">{attachment.file.name}</span>
      <button
        type="button"
        onClick={() => onRemove(attachment.id)}
        className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black"
        title="Gỡ tệp"
      >
        <FiX size={14} />
      </button>
    </div>
  );
};

export default PendingAttachmentPreview;
