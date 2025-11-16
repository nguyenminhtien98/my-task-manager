"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { detectMediaTypeFromUrl } from "../../utils/media";

interface MediaAttachment {
  url: string;
  type?: "image" | "video" | "file";
  name?: string;
}

interface MediaPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  media?: MediaAttachment | null;
}

const TRANSITION_DURATION = 200;

const MediaPreviewModal: React.FC<MediaPreviewModalProps> = ({ isOpen, onClose, media }) => {
  const [mounted, setMounted] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || !media) {
      setIsVisible(false);
      const timeout = window.setTimeout(() => setShouldRender(false), TRANSITION_DURATION);
      return () => window.clearTimeout(timeout);
    }
    setShouldRender(true);
    requestAnimationFrame(() => setIsVisible(true));
    return undefined;
  }, [isOpen, media]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!mounted || !shouldRender || !media) return null;

  const type = media.type ?? detectMediaTypeFromUrl(media.url);
  const name = media.name ?? "Tệp đính kèm";

  return createPortal(
    <div className="fixed inset-0 z-[1400]" data-feedback-media-modal="true">
      <div
        className={`fixed inset-0 bg-black/80 transition-opacity duration-200 ${isVisible ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div
          className={`relative flex h-full w-full items-center justify-center transition-all duration-200 ${isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
          data-feedback-media-modal="true"
        >
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer absolute right-6 top-6 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white text-black"
            title="Đóng"
          >
            X
          </button>
          <div className="flex max-h-[85vh] w-full max-w-5xl items-center justify-center overflow-hidden">
            {type === "video" ? (
              <video src={media.url} controls className="max-h-[80vh] w-auto rounded-lg object-contain" />
            ) : (
              <Image
                src={media.url}
                alt={name}
                width={1200}
                height={800}
                className="max-h-[80vh] w-auto rounded-lg object-contain"
              />
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default MediaPreviewModal;
