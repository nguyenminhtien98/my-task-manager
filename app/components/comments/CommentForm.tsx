"use client";

import React, { Fragment, useEffect, useRef, useState } from "react";
import { Transition } from "@headlessui/react";
import { FiImage, FiPaperclip } from "react-icons/fi";
import { v4 as uuidv4 } from "uuid";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import PendingAttachmentPreview from "./PendingAttachmentPreview";
import { PendingAttachment } from "./types";
import type { TaskComment } from "./types";
import type { CreateCommentParams } from "@/app/hooks/useComment";
import {
  MAX_UPLOAD_SIZE_BYTES,
  MAX_UPLOAD_SIZE_LABEL,
  getUploadFileLabel,
} from "../../utils/upload";

interface CommentFormProps {
  taskId: string;
  onSubmit: (params: CreateCommentParams) => Promise<TaskComment | null>;
  isSubmitting: boolean;
  disabled?: boolean;
}

const CommentForm: React.FC<CommentFormProps> = ({ taskId, onSubmit, isSubmitting, disabled = false }) => {
  const { user } = useAuth();
  const [commentText, setCommentText] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [isCommentActive, setIsCommentActive] = useState(false);

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const pendingAttachmentsRef = useRef<PendingAttachment[]>([]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [commentText, pendingAttachments]);

  useEffect(() => {
    if (pendingAttachments.length > 0) {
      if (!isCommentActive) {
        setIsCommentActive(true);
      }
      return;
    }

    if (commentText.trim().length === 0) {
      const isTextareaFocused = textareaRef.current !== null && document.activeElement === textareaRef.current;
      if (!isTextareaFocused && isCommentActive) {
        setIsCommentActive(false);
      }
    }
  }, [pendingAttachments, commentText, isCommentActive]);

  useEffect(() => {
    pendingAttachmentsRef.current = pendingAttachments;
  }, [pendingAttachments]);

  useEffect(() => {
    return () => {
      pendingAttachmentsRef.current.forEach((attachment) => {
        if (attachment.previewUrl) {
          URL.revokeObjectURL(attachment.previewUrl);
        }
      });
    };
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const invalidLabels = new Set<string>();

    fileArray.forEach((file) => {
      if (file.size > MAX_UPLOAD_SIZE_BYTES) {
        invalidLabels.add(getUploadFileLabel(file));
      } else {
        validFiles.push(file);
      }
    });

    invalidLabels.forEach((label) => {
      toast.error(
        `${label} bạn chọn có kích thước > ${MAX_UPLOAD_SIZE_LABEL}. Vui lòng chọn ${label.toLowerCase()} < ${MAX_UPLOAD_SIZE_LABEL}.`
      );
    });

    if (validFiles.length === 0) {
      event.target.value = "";
      return;
    }

    const list = validFiles.map((file) => {
      const mediaType: PendingAttachment["mediaType"] = file.type.startsWith("video")
        ? "video"
        : file.type.startsWith("image")
          ? "image"
          : "file";

      const previewUrl = mediaType === "image" || mediaType === "video"
        ? URL.createObjectURL(file)
        : undefined;

      return {
        id: uuidv4(),
        file,
        mediaType,
        previewUrl,
      } satisfies PendingAttachment;
    });

    setPendingAttachments((prev) => [...prev, ...list]);
    event.target.value = "";
  };

  const handleRemoveAttachment = (id: string) => {
    setPendingAttachments((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
    if (!isCommentActive) {
      setIsCommentActive(true);
    }
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  const canSubmit =
    !disabled &&
    (Boolean(commentText.trim()) || pendingAttachments.length > 0);
  const shouldShowControls = isCommentActive || pendingAttachments.length > 0 || Boolean(commentText.trim());

  const handleSubmit = async () => {
    if (!user || !canSubmit || isSubmitting || disabled) {
      return;
    }

    const result = await onSubmit({
      taskId,
      userId: user.id,
      userName: user.name,
      content: commentText,
      attachments: pendingAttachments,
    });

    if (!result) {
      return;
    }

    pendingAttachments.forEach((attachment) => {
      if (attachment.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
    });

    setCommentText("");
    setPendingAttachments([]);
    setIsCommentActive(false);
  };

  return (
    <div className="rounded-lg">
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      <Transition
        show={shouldShowControls}
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
            <button
              type="button"
              onClick={() => !disabled && imageInputRef.current?.click()}
              className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              title="Đính kèm hình ảnh/video"
              disabled={disabled}
            >
              <FiImage />
            </button>
            <button
              type="button"
              onClick={() => !disabled && fileInputRef.current?.click()}
              className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              title="Đính kèm tệp tin"
              disabled={disabled}
            >
              <FiPaperclip />
            </button>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              if (disabled) return;
              void handleSubmit();
            }}
            disabled={!canSubmit || isSubmitting || disabled}
            className={`rounded px-4 py-1 text-sm font-medium ${canSubmit && !isSubmitting && !disabled
              ? "bg-black text-white hover:bg-black/80"
              : "bg-black/30 text-white/60 cursor-not-allowed"
              }`}
          >
            {isSubmitting ? "Đang gửi..." : "Đăng"}
          </button>
        </div>
      </Transition>

      <div
        className={`${shouldShowControls ? "rounded-b-lg bg-black/60" : "rounded-lg bg-black/55"
          } px-3 py-3`}
      >
        <textarea
          ref={textareaRef}
          rows={1}
          value={commentText}
          onFocus={() => setIsCommentActive(true)}
          onBlur={(event) => {
            if (!event.currentTarget.value.trim() && pendingAttachments.length === 0) {
              setIsCommentActive(false);
            }
          }}
          onChange={(event) => setCommentText(event.target.value)}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !isSubmitting &&
              !disabled
            ) {
              event.preventDefault();
              void handleSubmit();
            }
          }}
          placeholder="Viết bình luận"
          className={`no-scrollbar w-full resize-none border-0 bg-transparent text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-0 ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
          disabled={disabled}
        />

        {pendingAttachments.length > 0 && (
          <div className="mt-3 space-y-2">
            {pendingAttachments.map((attachment) => (
              <PendingAttachmentPreview
                key={attachment.id}
                attachment={attachment}
                onRemove={handleRemoveAttachment}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentForm;
