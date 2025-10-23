"use client";
/* eslint-disable @next/next/no-img-element */

import React, { Fragment, useEffect, useRef, useState } from "react";
import { Transition } from "@headlessui/react";
import { FiImage, FiPaperclip } from "react-icons/fi";
import toast from "react-hot-toast";
import { TaskMedia } from "../types/Types";
import { detectMediaTypeFromUrl } from "../utils/media";
import MediaPreviewModal from "./MediaPreviewModal";

interface TaskDetailRightPanelProps {
  media: TaskMedia[];
  className?: string;
}

const formatMediaDate = (isoString?: string) => {
  if (!isoString) return "Đã thêm —";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "Đã thêm —";
  const time = date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear().toString().slice(-2);
  return `Đã thêm ${time} ${day} thg ${month}, ${year}`;
};

const TaskDetailRightPanel: React.FC<TaskDetailRightPanelProps> = ({
  media,
  className,
}) => {
  const hasMedia = media.length > 0;
  const primaryMedia = hasMedia ? media[0] : undefined;
  const extraMedia = hasMedia && media.length > 1 ? media.slice(1) : [];

  const [isAttachmentsOpen, setIsAttachmentsOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isCommentActive, setIsCommentActive] = useState(false);

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const commentTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const commentActive = isCommentActive || Boolean(commentText.trim());

  useEffect(() => {
    const element = commentTextareaRef.current;
    if (element) {
      element.style.height = "auto";
      element.style.height = `${element.scrollHeight}px`;
    }
  }, [commentText]);

  const openPreview = (index: number) => {
    setPreviewIndex(index);
    setIsPreviewOpen(true);
  };

  const closePreview = () => {
    setIsPreviewOpen(false);
    setPreviewIndex(null);
  };

  const activePreview = previewIndex != null ? media[previewIndex] : undefined;

  const renderMediaContent = (item: TaskMedia, variant: "primary" | "thumbnail" | "modal") => {
    const type = item.type ?? detectMediaTypeFromUrl(item.url);
    const baseClasses =
      variant === "modal"
        ? "max-h-[80vh] w-auto rounded-lg object-contain"
        : "max-h-full max-w-full object-contain";

    if (type === "video") {
      if (variant === "modal") {
        return <video src={item.url} controls className={baseClasses} />;
      }
      return <video src={item.url} className={`${baseClasses} pointer-events-none`} muted />;
    }

    return (
      <img
        src={item.url}
        alt={item.name}
        className={`${baseClasses} ${variant === "modal" ? "" : "pointer-events-none"}`}
      />
    );
  };

  const handleSelectMedia = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      toast.success(`Đã chọn ${event.target.files.length} tệp (demo)`);
      event.target.value = "";
    }
  };

  const handleSubmitComment = () => {
    if (!commentText.trim()) return;
    toast.success("Đã gửi bình luận (demo)");
    setCommentText("");
  };

  const handleCommentKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmitComment();
    }
  };

  return (
    <div
      className={`flex h-full flex-col overflow-hidden rounded-lg border border-white/10 bg-black/40 text-white ${className ?? ""}`}
    >
      <div className="flex flex-1 flex-col overflow-y-auto no-scrollbar">
        {primaryMedia && (
          <div className="pb-4">
            <button
              type="button"
              onClick={() => openPreview(0)}
              className="group relative flex h-56 w-full items-center justify-center overflow-hidden rounded-lg bg-gray-800"
            >
              {renderMediaContent(primaryMedia, "primary")}
              <span className="absolute inset-0 hidden items-center justify-center bg-black/30 text-sm font-medium group-hover:flex">
                Xem chi tiết
              </span>
            </button>
          </div>
        )}

        {primaryMedia && extraMedia.length > 0 && (
          <div className="space-y-2 px-4 pb-4">
            <button
              type="button"
              onClick={() => setIsAttachmentsOpen((prev) => !prev)}
              className="text-sm font-semibold text-black underline"
            >
              Các tệp đính kèm
            </button>
            <Transition
              show={isAttachmentsOpen}
              as={Fragment}
              enter="transition-all duration-200 ease-out"
              enterFrom="opacity-0 -translate-y-2"
              enterTo="opacity-100 translate-y-0"
              leave="transition-all duration-150 ease-in"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 -translate-y-2"
            >
              <div className="flex flex-col gap-3">
                {extraMedia.map((item, index) => (
                  <button
                    key={`${item.url}-${index}`}
                    type="button"
                    onClick={() => openPreview(index + 1)}
                    className="grid cursor-pointer grid-cols-[30%_1fr] items-center gap-3 rounded-lg bg-black/55 p-3 text-left text-sm text-gray-200 hover:bg-black/70"
                  >
                    <div className="flex h-20 items-center justify-center overflow-hidden rounded bg-gray-800">
                      {renderMediaContent(item, "thumbnail")}
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-white">{item.name}</p>
                      <p className="text-xs text-gray-400">{formatMediaDate(item.createdAt)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </Transition>
          </div>
        )}

        {!primaryMedia && (
          <div className={`px-4 py-2 text-sm font-semibold text-sub `}>
            Nhận xét
          </div>
        )}

        <div className={`px-4 ${hasMedia ? "pb-4" : "pb-4"}`}>
          <div className="rounded-lg">
            <Transition
              show={commentActive}
              as={Fragment}
              enter="transition-all duration-200 ease-out"
              enterFrom="opacity-0 -translate-y-2"
              enterTo="opacity-100 translate-y-0"
              leave="transition-all duration-150 ease-in"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 -translate-y-2"
            >
              <div className="flex items-center justify-between gap-3 rounded-t-lg bg-black/70 px-3 py-2">
                <div className="flex items-center gap-3 text-white">
                  <input
                    type="file"
                    ref={imageInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleSelectMedia}
                  />
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleSelectMedia}
                  />
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                    title="Đính kèm hình ảnh"
                  >
                    <FiImage />
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                    title="Đính kèm tệp tin"
                  >
                    <FiPaperclip />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleSubmitComment}
                  disabled={!commentText.trim()}
                  className={`rounded px-4 py-1 text-sm font-medium ${commentText.trim()
                    ? "bg-black text-white hover:bg-black/80"
                    : "bg-black/30 text-white/60 cursor-not-allowed"
                    }`}
                >
                  Đăng
                </button>
              </div>
            </Transition>
            <textarea
              ref={commentTextareaRef}
              rows={1}
              value={commentText}
              onFocus={() => setIsCommentActive(true)}
              onBlur={(event) => {
                if (!event.currentTarget.value.trim()) {
                  setIsCommentActive(false);
                }
              }}
              onChange={(event) => setCommentText(event.target.value)}
              onKeyDown={handleCommentKeyDown}
              placeholder="Viết bình luận"
              className={`no-scrollbar w-full resize-none border-0 px-3 py-3 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-0 ${commentActive ? "rounded-b-lg bg-black/35" : "rounded-lg bg-black/25"
                }`}
            />
          </div>
        </div>
      </div>

      <MediaPreviewModal
        isOpen={isPreviewOpen}
        onClose={closePreview}
        media={activePreview ?? null}
      />
    </div>
  );
};

export default TaskDetailRightPanel;
