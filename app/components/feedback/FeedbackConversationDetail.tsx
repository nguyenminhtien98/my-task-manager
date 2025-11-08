"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FiImage, FiX, FiChevronLeft } from "react-icons/fi";
import toast from "react-hot-toast";
import Button from "../common/Button";
import FeedbackMessageItem, {
  computeMessageGrouping,
} from "./FeedbackMessageItem";
import {
  ConversationMessageDocument,
  PresenceDocument,
  ONLINE_STATUS_STALE_MS,
  ConversationType,
} from "../../services/feedbackService";
import {
  formatVietnameseDateTime,
  formatRelativeTimeFromNow,
  diffInMinutes,
} from "../../utils/date";
import {
  MAX_UPLOAD_SIZE_BYTES,
  MAX_UPLOAD_SIZE_LABEL,
  getUploadFileLabel,
  uploadFilesToCloudinary,
} from "../../utils/upload";
import type { UploadedFileInfo } from "../../utils/upload";
import MediaPreviewModal from "../common/MediaPreviewModal";
import ChatMessageSkeleton from "../loading/ChatMessageSkeleton";

interface FeedbackConversationDetailProps {
  conversationId: string | null;
  currentUserId: string;
  messages: ConversationMessageDocument[];
  onSendMessage: (
    content: string,
    attachments?: UploadedFileInfo[]
  ) => Promise<void>;
  isSending: boolean;
  otherProfile?: {
    id: string;
    name?: string;
    avatarUrl?: string | null;
    role?: string | null;
  } | null;
  onBack?: () => void;
  presence?: PresenceDocument | null;
  isAdminView?: boolean;
  onClose?: () => void;
  isOpen?: boolean;
  conversationType?: ConversationType;
  isLoading?: boolean;
  pendingMessages?: Array<{
    id: string;
    content: string;
    attachments?: UploadedFileInfo[];
  }>;
  allowCreateConversation?: boolean;
}

const getPresenceDisplay = (presence?: PresenceDocument | null) => {
  const base = { label: "Ngoại tuyến", isOnline: false };
  if (!presence) return base;
  const lastSeenMs = presence.lastSeenAt
    ? new Date(presence.lastSeenAt).getTime()
    : 0;
  const now = Date.now();
  const isRecent = lastSeenMs > 0 && now - lastSeenMs <= ONLINE_STATUS_STALE_MS;
  if (presence.isOnline && isRecent) {
    return { label: "Đang online", isOnline: true };
  }
  if (!presence.lastSeenAt) return base;
  return {
    label: `Hoạt động ${formatRelativeTimeFromNow(presence.lastSeenAt)}`,
    isOnline: false,
  };
};

const needDivider = (
  prev?: ConversationMessageDocument,
  curr?: ConversationMessageDocument
) => {
  if (!prev || !curr) return true;
  const prevDate = new Date(prev.$createdAt);
  const currDate = new Date(curr.$createdAt);
  return diffInMinutes(currDate, prevDate) >= 60;
};

const FeedbackConversationDetail: React.FC<FeedbackConversationDetailProps> = ({
  conversationId,
  currentUserId,
  messages,
  onSendMessage,
  isSending,
  otherProfile,
  onBack,
  presence,
  isAdminView = false,
  onClose,
  isOpen = false,
  conversationType = "feedback",
  isLoading = false,
  pendingMessages = [],
  allowCreateConversation = false,
}) => {
  const [draft, setDraft] = useState("");
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<UploadedFileInfo | null>(
    null
  );
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const closePreview = useCallback(() => {
    setIsPreviewOpen(false);
    setPreviewMedia(null);
  }, []);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, pendingMessages.length]);

  useEffect(() => {
    if (!isOpen) return;
    const timeout = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 150);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [conversationId, isOpen]);

  const trimmedDraft = draft.trim();
  const canAttachMedia =
    (Boolean(conversationId) || allowCreateConversation) && !isUploadingMedia;
  const canSubmit =
    (conversationId || allowCreateConversation) &&
    !isSending &&
    !isUploadingMedia &&
    trimmedDraft.length > 0;

  const handleSend = async () => {
    const content = trimmedDraft;
    if (
      (!conversationId && !allowCreateConversation) ||
      !content ||
      isUploadingMedia
    )
      return;
    await onSendMessage(content);
    setDraft("");
  };

  const handleMediaClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) {
        event.target.value = "";
        return;
      }

      const validFiles: File[] = [];
      const oversizeTypes = new Set<string>();

      Array.from(files).forEach((file) => {
        if (file.size > MAX_UPLOAD_SIZE_BYTES) {
          oversizeTypes.add(getUploadFileLabel(file));
        } else {
          validFiles.push(file);
        }
      });

      oversizeTypes.forEach((label) => {
        toast.error(
          `${label} bạn chọn có kích thước > ${MAX_UPLOAD_SIZE_LABEL}. Vui lòng chọn ${label.toLowerCase()} < ${MAX_UPLOAD_SIZE_LABEL}.`
        );
      });

      if (
        (!conversationId && !allowCreateConversation) ||
        validFiles.length === 0
      ) {
        event.target.value = "";
        return;
      }

      setIsUploadingMedia(true);
      try {
        const uploaded = await uploadFilesToCloudinary(validFiles);
        if (uploaded.length > 0) {
          await onSendMessage("", uploaded);
        }
      } catch (error) {
        console.error("Upload feedback attachment failed:", error);
        toast.error("Upload tệp thất bại. Vui lòng thử lại.");
      } finally {
        setIsUploadingMedia(false);
        event.target.value = "";
      }
    },
    [allowCreateConversation, conversationId, onSendMessage]
  );

  const presenceDisplay = useMemo(
    () => getPresenceDisplay(presence),
    [presence]
  );
  const isCounterpartAdmin = useMemo(
    () =>
      otherProfile &&
      (otherProfile.role === "admin" || otherProfile.role === "leader"),
    [otherProfile]
  );
  const lastSeenMessageId = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (message.senderId !== currentUserId) continue;
      const seen = (message.seenBy ?? []).filter((id) => id !== currentUserId);
      if (seen.length > 0) {
        return message.$id;
      }
    }
    return null;
  }, [messages, currentUserId]);

  const handleLoginPrompt = useCallback(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("open-login-modal"));
    }
    onClose?.();
  }, [onClose]);

  const renderHeader = () => {
    if (isAdminView) {
      const title = otherProfile?.name ?? "Người dùng";
      return (
        <div className="flex items-center border-b border-black/10 px-3 py-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="cursor-pointer flex h-7 w-7 items-center justify-center rounded-full bg-black/5 text-gray-600 transition hover:bg-black/10 hover:text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
              aria-label="Quay lại danh sách hội thoại"
            >
              <FiChevronLeft className="h-4 w-4" />
            </button>
          ) : (
            <span className="h-7 w-7" />
          )}
          <div className="flex flex-1 flex-col items-center justify-center">
            <span className="block text-sm font-semibold text-[#111827]">
              {title}
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-500">
              {presenceDisplay.isOnline ? (
                <span className="inline-flex h-2.5 w-2.5 items-center justify-center">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                </span>
              ) : null}
              {presenceDisplay.label}
            </span>
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer flex h-7 w-7 items-center justify-center rounded-full bg-black/5 text-gray-600 transition hover:bg-black/10 hover:text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
              aria-label="Đóng phản hồi"
            >
              <FiX />
            </button>
          ) : (
            <span className="h-7 w-7" />
          )}
        </div>
      );
    }

    const nonAdminTitle =
      conversationType === "member"
        ? otherProfile?.name ?? "Thành viên"
        : "Feedback";

    return (
      <div className="flex items-center border-b border-black/10 p-2">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="cursor-pointer flex h-7 w-7 items-center justify-center rounded-full bg-black/5 text-gray-600 transition hover:bg-black/10 hover:text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
            aria-label="Quay lại danh sách hội thoại"
          >
            <FiChevronLeft className="h-4 w-4" />
          </button>
        ) : (
          <span className="h-7 w-7" />
        )}
        <div className="flex flex-1 flex-col items-center justify-center">
          <span className="text-sm font-semibold text-[#111827]">
            {nonAdminTitle}
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-500">
            {presenceDisplay.isOnline ? (
              <span className="inline-flex h-2.5 w-2.5 items-center justify-center">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
              </span>
            ) : null}
            {presenceDisplay.label}
          </span>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer flex h-7 w-7 items-center justify-center rounded-full bg-black/5 text-gray-600 transition hover:bg-black/10 hover:text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
            aria-label="Đóng phản hồi"
          >
            <FiX />
          </button>
        ) : (
          <span className="h-7 w-7" />
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-[420px] w-[320px] max-h-[calc(100vh-120px)] max-w-full flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl">
      {renderHeader()}

      {!currentUserId ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-8 text-center">
          <p className="text-sm text-gray-600">
            Vui lòng đăng nhập để gửi phản hồi cho chúng tôi.
          </p>
          <Button
            type="button"
            className="bg-black text-white !rounded-full !px-5 !py-2"
            onClick={handleLoginPrompt}
          >
            Đăng nhập
          </Button>
        </div>
      ) : (
        <>
          <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3 no-scrollbar max-h-[calc(100vh-220px)]">
            {!conversationId && !allowCreateConversation ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                Chọn cuộc hội thoại
              </div>
            ) : isLoading ? (
              <div className="space-y-3 py-4">
                <ChatMessageSkeleton position="left" />
                <ChatMessageSkeleton position="right" />
                <ChatMessageSkeleton position="left" />
              </div>
            ) : messages.length === 0 && pendingMessages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                Hãy gửi tin nhắn đầu tiên.
              </div>
            ) : (
              <>
                {messages.map((message, index) => {
                  const prev = messages[index - 1];
                  const next = messages[index + 1];
                  const grouping = computeMessageGrouping(
                    message.senderId,
                    prev?.senderId,
                    next?.senderId
                  );
                  const showDivider = needDivider(prev, message);
                  const isOwn = message.senderId === currentUserId;

                  const showSeenAvatars =
                    isOwn && message.$id === lastSeenMessageId;
                  const seenAvatars =
                    showSeenAvatars && message.seenBy
                      ? message.seenBy
                          .filter((id) => id !== currentUserId)
                          .map((id) => ({
                            id,
                            name: otherProfile?.name,
                            avatarUrl: otherProfile?.avatarUrl,
                          }))
                      : [];
                  const attachments = message.attachments ?? [];

                  return (
                    <React.Fragment key={message.$id}>
                      {showDivider && (
                        <div className="my-2 text-center text-xs text-gray-400">
                          {formatVietnameseDateTime(message.$createdAt)}
                        </div>
                      )}
                      <FeedbackMessageItem
                        id={message.$id}
                        isOwn={isOwn}
                        content={message.content}
                        createdAt={message.$createdAt}
                        grouping={grouping}
                        avatarUrl={otherProfile?.avatarUrl}
                        displayName={otherProfile?.name}
                        showAvatar={
                          !isOwn &&
                          (grouping === "single" || grouping === "end")
                        }
                        showBrandAvatar={!isOwn && Boolean(isCounterpartAdmin)}
                        seenAvatars={seenAvatars}
                        attachments={attachments}
                        onPreviewMedia={(media) => {
                          setPreviewMedia(media);
                          setIsPreviewOpen(true);
                        }}
                      />
                    </React.Fragment>
                  );
                })}
                {pendingMessages.map((pending) => (
                  <ChatMessageSkeleton key={pending.id} position="right" />
                ))}
              </>
            )}
            <div ref={messageEndRef} />
          </div>

          <div className="w-full border-t border-black/10 bg-gray-50 p-2">
            <div className="flex w-full items-center gap-1">
              <button
                type="button"
                onClick={handleMediaClick}
                disabled={!canAttachMedia}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-black focus:outline-none focus-visible:ring-2 focus-visible:ring-black/30 disabled:cursor-not-allowed disabled:bg-black/40 disabled:text-white/70"
                title="Đính kèm hình ảnh/video"
              >
                <FiImage />
              </button>
              <input
                ref={inputRef}
                value={draft}
                disabled={
                  isSending ||
                  isUploadingMedia ||
                  (!conversationId && !allowCreateConversation)
                }
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
                placeholder="Góp ý cho chúng tôi..."
                autoComplete="off"
                className="flex-1 min-w-0 rounded-full bg-black/70 px-4 py-2 text-sm text-white placeholder:text-white/60 focus:outline-none disabled:bg-black/40"
              />
              <Button
                type="button"
                className="bg-black text-white !rounded-lg !px-3 !py-2 flex-shrink-0 disabled:bg-black/40 disabled:text-white/70 disabled:cursor-not-allowed"
                disabled={!canSubmit}
                onClick={() => void handleSend()}
              >
                {isSending || isUploadingMedia ? "..." : "Gửi"}
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              disabled={!canAttachMedia}
            />
          </div>
          <MediaPreviewModal
            isOpen={isPreviewOpen}
            onClose={closePreview}
            media={previewMedia ?? undefined}
          />
        </>
      )}
    </div>
  );
};

export default FeedbackConversationDetail;
