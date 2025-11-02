"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { v4 as uuidv4 } from "uuid";
import toast from "react-hot-toast";
import AvatarUser from "../common/AvatarUser";
import { formatVietnameseDateTime } from "../../utils/date";
import { CommentAttachment, PendingAttachment, TaskComment, TaskAttachment } from "./types";
import PendingAttachmentPreview from "./PendingAttachmentPreview";
import { FiImage, FiPaperclip, FiPlay, FiX } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import type { UpdateCommentParams } from "@/app/hooks/useComment";
import {
  MAX_UPLOAD_SIZE_BYTES,
  MAX_UPLOAD_SIZE_LABEL,
  getUploadFileLabel,
} from "../../utils/upload";

const EDIT_EVENT_NAME = "comment-edit-start";

interface CommentItemProps {
  comment: TaskComment;
  onPreview: (media: TaskAttachment) => void;
  onUpdateComment: (params: UpdateCommentParams) => Promise<TaskComment | null>;
  onDeleteComment: (commentId: string) => Promise<boolean>;
  isLocked?: boolean;
}

const renderAttachment = (attachment: CommentAttachment, onPreview: (media: TaskAttachment) => void) => {
  if (attachment.type === "image" || attachment.type === "video") {
    const mediaItem: TaskAttachment = {
      url: attachment.url,
      name: attachment.name,
      type: attachment.type,
      createdAt: new Date().toISOString(),
    };
    return (
      <button
        key={attachment.url}
        type="button"
        onClick={() => onPreview(mediaItem)}
        className="relative mx-auto block w-4/5 max-h-72 overflow-hidden rounded-lg"
      >
        {attachment.type === "image" ? (
          <Image
            src={attachment.url}
            alt={attachment.name}
            width={800}
            height={600}
            unoptimized
            className="max-h-72 w-full object-contain"
          />
        ) : (
          <>
            <video src={attachment.url} className="max-h-72 w-full object-contain" />
            <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
              <FiPlay size={28} />
            </span>
          </>
        )}
      </button>
    );
  }

  return (
    <a
      key={attachment.url}
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block text-blue-400 underline"
    >
      {attachment.name}
    </a>
  );
};

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  onPreview,
  onUpdateComment,
  onDeleteComment,
  isLocked = false,
}) => {
  const { user } = useAuth();
  const isOwner = user?.id === comment.user.id;
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content ?? "");
  const [editAttachments, setEditAttachments] = useState<CommentAttachment[]>(comment.attachments ?? []);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const canEdit = isOwner && !isLocked;
  const canDelete = isOwner && !isLocked;

  const clearPendingAttachments = useCallback(() => {
    setPendingAttachments((prev) => {
      prev.forEach((attachment) => {
        if (attachment.previewUrl) {
          URL.revokeObjectURL(attachment.previewUrl);
        }
      });
      return [];
    });
  }, []);

  const resetEditingState = useCallback(() => {
    setEditContent(comment.content ?? "");
    setEditAttachments(comment.attachments ?? []);
    setIsEditing(false);
    clearPendingAttachments();
  }, [clearPendingAttachments, comment.attachments, comment.content]);

  useEffect(() => {
    if (isEditing) return;
    const currentContent = comment.content ?? "";
    if (editContent !== currentContent) {
      setEditContent(currentContent);
    }
    const currentAttachments = comment.attachments ?? [];
    const attachmentsEqual =
      currentAttachments.length === editAttachments.length &&
      currentAttachments.every((item, index) => {
        const target = editAttachments[index];
        return target && target.url === item.url && target.type === item.type;
      });
    if (!attachmentsEqual) {
      setEditAttachments(currentAttachments);
    }
  }, [comment.attachments, comment.content, editAttachments, editContent, isEditing]);

  useEffect(() => {
    if (!isEditing) return;
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [editContent, isEditing]);

  useEffect(() => {
    if (isLocked && isEditing) {
      resetEditingState();
    }
  }, [isLocked, isEditing, resetEditingState]);

  useEffect(() => {
    return () => {
      clearPendingAttachments();
    };
  }, [clearPendingAttachments]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOtherEditStart = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      if (typeof customEvent.detail !== "string") return;
      const targetId = customEvent.detail;
      if (targetId !== comment.id && isEditing) {
        resetEditingState();
      }
    };

    window.addEventListener(EDIT_EVENT_NAME, handleOtherEditStart as EventListener);
    return () => {
      window.removeEventListener(EDIT_EVENT_NAME, handleOtherEditStart as EventListener);
    };
  }, [comment.id, isEditing, resetEditingState]);

  const handleStartEdit = () => {
    if (!canEdit) return;
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(EDIT_EVENT_NAME, { detail: comment.id }));
    }
    clearPendingAttachments();
    setEditContent(comment.content ?? "");
    setEditAttachments(comment.attachments ?? []);
    setIsEditing(true);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  const handleCancelEdit = () => {
    resetEditingState();
  };

  const originalAttachments = comment.attachments ?? [];
  const trimmedOriginalContent = (comment.content ?? "").trim();
  const trimmedEditContent = editContent.trim();
  const retainedAttachmentUrls = new Set(editAttachments.map((attachment) => attachment.url));
  const attachmentsRemoved =
    originalAttachments.length !== editAttachments.length ||
    originalAttachments.some((attachment) => !retainedAttachmentUrls.has(attachment.url));
  const attachmentsChanged = attachmentsRemoved || pendingAttachments.length > 0;
  const hasContentOrAttachments =
    trimmedEditContent.length > 0 || editAttachments.length > 0 || pendingAttachments.length > 0;
  const hasChanges = trimmedOriginalContent !== trimmedEditContent || attachmentsChanged;
  const canSubmitEdit =
    canEdit && hasChanges && hasContentOrAttachments && !isUpdating;

  const handleSubmitEdit = async () => {
    if (!canEdit || !canSubmitEdit || isUpdating) return;
    setIsUpdating(true);
    const result = await onUpdateComment({
      comment,
      content: editContent,
      retainedAttachments: editAttachments,
      newAttachments: pendingAttachments,
    });
    setIsUpdating(false);

    if (!result) {
      return;
    }

    clearPendingAttachments();
    setEditAttachments(result.attachments);
    setEditContent(result.content);
    setIsEditing(false);
  };

  const handleRemoveEditAttachment = (targetUrl: string) => {
    setEditAttachments((prev) => prev.filter((item) => item.url !== targetUrl));
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  const handleDeleteComment = async () => {
    if (!canDelete || isEditing || isDeleting) return;
    const confirmed = window.confirm("Bạn có chắc muốn xóa bình luận này?");
    if (!confirmed) return;
    setIsDeleting(true);
    const success = await onDeleteComment(comment.id);
    setIsDeleting(false);
    if (success) {
      clearPendingAttachments();
      setIsEditing(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (isLocked) return;
    const files = event.target.files;
    if (!files || files.length === 0) {
      event.target.value = "";
      return;
    }

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

  const handleRemovePendingAttachment = (id: string) => {
    setPendingAttachments((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  const renderEditableAttachment = (attachment: CommentAttachment) => {
    if (attachment.type === "image" || attachment.type === "video") {
      const mediaItem: TaskAttachment = {
        url: attachment.url,
        name: attachment.name,
        type: attachment.type,
        createdAt: new Date().toISOString(),
      };
      return (
        <div
          key={attachment.url}
          className="relative mx-auto w-4/5 max-h-72 overflow-hidden rounded-lg"
        >
          <button
            type="button"
            onClick={() => handleRemoveEditAttachment(attachment.url)}
            className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black"
            title="Gỡ đính kèm"
          >
            <FiX size={14} />
          </button>
          <button
            type="button"
            onClick={() => onPreview(mediaItem)}
            className="block h-full w-full"
          >
            {attachment.type === "image" ? (
              <Image
                src={attachment.url}
                alt={attachment.name}
                width={800}
                height={600}
                unoptimized
                className="max-h-72 w-full object-contain"
              />
            ) : (
              <div className="relative h-full w-full">
                <video src={attachment.url} className="max-h-72 w-full object-contain" />
                <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
                  <FiPlay size={28} />
                </span>
              </div>
            )}
          </button>
        </div>
      );
    }

    return (
      <div
        key={attachment.url}
        className="flex items-center justify-between rounded bg-black/30 px-3 py-2 text-sm text-white"
      >
        <a
          href={attachment.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 underline"
        >
          {attachment.name}
        </a>
        <button
          type="button"
          onClick={() => handleRemoveEditAttachment(attachment.url)}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black"
          title="Gỡ tệp"
        >
          <FiX size={12} />
        </button>
      </div>
    );
  };

  return (
    <div className="flex gap-1">
      <AvatarUser
        name={comment.user.name ?? "Người dùng"}
        avatarUrl={comment?.user?.avatarUrl}
        size={36}
      />
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm text-white">{comment.user.name}</span>
          <span className="text-xs text-blue-400 underline">
            {formatVietnameseDateTime(comment.createdAt)}
          </span>
        </div>
        {isEditing ? (
          <div className="rounded-lg bg-black/60">
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

            <div className="flex items-center justify-between gap-3 rounded-t-lg bg-black/70 px-3 py-2">
              <div className="flex items-center gap-3 text-white">
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                  title="Đính kèm hình ảnh/video"
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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="cursor-pointer rounded px-4 py-1 text-sm font-medium bg-gray-300 text-black hover:bg-gray-500"
                >
                  Hủy thay đổi
                </button>
                <button
                  type="button"
                  onClick={handleSubmitEdit}
                  disabled={!canSubmitEdit}
                  className={`rounded px-4 py-1 text-sm font-medium ${canSubmitEdit
                    ? "bg-black cursor-pointer text-white hover:bg-black/80"
                    : "cursor-not-allowed bg-black/30 text-white/60"
                    }`}
                >
                  {isUpdating ? "Đang lưu..." : "Đăng"}
                </button>
              </div>
            </div>

            <div className="rounded-b-lg bg-black/60 px-3 py-3">
              <textarea
                ref={textareaRef}
                rows={1}
                value={editContent}
                onChange={(event) => setEditContent(event.target.value)}
                placeholder="Viết bình luận"
                className="no-scrollbar w-full resize-none border-0 bg-transparent text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-0"
              />
              {(editAttachments.length > 0 || pendingAttachments.length > 0) && (
                <div className="mt-3 space-y-2">
                  {editAttachments.map(renderEditableAttachment)}
                  {pendingAttachments.map((attachment) => (
                    <PendingAttachmentPreview
                      key={attachment.id}
                      attachment={attachment}
                      onRemove={handleRemovePendingAttachment}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          (comment.content || comment.attachments.length > 0) && (
            <>
              <div className="rounded-lg bg-black/60 px-3 py-2">
                {comment.content && (
                  <p className="text-sm text-white mb-2">{comment.content}</p>
                )}
                {comment.attachments.map((attachment) => renderAttachment(attachment, onPreview))}

              </div>
              {(canEdit || canDelete) && (
                <div className="mt-2 flex items-center text-xs font-medium text-white">
                  {canEdit && (
                    <button
                      type="button"
                      onClick={handleStartEdit}
                      className={`cursor-pointer hover:underline ${isLocked ? "opacity-60" : ""}`}
                      disabled={isLocked}
                    >
                      Chỉnh sửa
                    </button>
                  )}
                  {canEdit && canDelete && (
                    <span
                      aria-hidden="true"
                      className="mx-2 inline-block h-1 w-1 rounded-full bg-white"
                    />
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={handleDeleteComment}
                      disabled={isDeleting || isLocked}
                      className={`cursor-pointer hover:underline ${isDeleting || isLocked ? "opacity-60" : ""}`}
                    >
                      {isDeleting ? "Đang xóa..." : "Xóa"}
                    </button>
                  )}
                </div>
              )}
            </>
          )
        )}
      </div>
    </div>
  );
};

export default CommentItem;
