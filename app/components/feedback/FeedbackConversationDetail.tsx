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
import { useModeration } from "@/app/hooks/useModeration";
import Button from "../common/Button";
import FeedbackMessageItem, {
  computeMessageGrouping,
} from "./FeedbackMessageItem";
import {
  ONLINE_STATUS_STALE_MS,
  reactToMessage,
} from "../../services/conversationService";
import type {
  ConversationMessageDocument,
  PresenceDocument,
  ConversationType,
} from "../../types/Types";
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
    attachments?: UploadedFileInfo[],
    replyToMessageId?: string
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
  hasMoreMessages?: boolean;
  isLoadingMoreMessages?: boolean;
  onLoadMoreMessages?: () => Promise<void>;
}

const getPresenceDisplay = (presence?: PresenceDocument | null) => {
  const base = { label: "Ngoại tuyến", isOnline: false };
  if (!presence) return base;

  if (presence.isOnline) {
    return { label: "Đang online", isOnline: true };
  }

  const lastSeenMs = presence.lastSeenAt
    ? new Date(presence.lastSeenAt).getTime()
    : 0;
  const now = Date.now();
  const isRecent = lastSeenMs > 0 && now - lastSeenMs <= ONLINE_STATUS_STALE_MS;

  if (isRecent) {
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
  const prevDate = new Date(prev.createdAt);
  const currDate = new Date(curr.createdAt);
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
  hasMoreMessages = false,
  isLoadingMoreMessages = false,
  onLoadMoreMessages,
}) => {
  const [draft, setDraft] = useState("");
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [prevScrollHeight, setPrevScrollHeight] = useState(0);
  const { isChatDisabled } = useModeration();
  const hasInitialScrolledRef = useRef(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<UploadedFileInfo | null>(
    null
  );
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [replyTo, setReplyTo] = useState<{
    messageId: string;
    content: string;
    displayName?: string;
    isOwn?: boolean;
    attachments?: UploadedFileInfo[];
  } | null>(null);
  const closePreview = useCallback(() => {
    setIsPreviewOpen(false);
    setPreviewMedia(null);
  }, []);

  const handleReply = useCallback((messageId: string, content: string, displayName?: string, isOwn?: boolean, attachments?: UploadedFileInfo[]) => {
    setReplyTo({ messageId, content, displayName, isOwn, attachments });
    inputRef.current?.focus();
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyTo(null);
  }, []);

  const handleScrollToMessage = useCallback((messageId: string) => {
    const messageElement = messageRefs.current.get(messageId);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageId(messageId);
      // Remove highlight after 2 seconds
      setTimeout(() => {
        setHighlightedMessageId(null);
      }, 2000);
    }
  }, []);

  const handleReactionClick = useCallback(async (messageId: string, reactionType: "like" | "heart" | "haha" | "laugh" | "love" | "wow" | "angry") => {
    try {
      const result = await reactToMessage(messageId, reactionType);
      if (result) {
        console.log('Reaction added successfully:', result);
        // Socket will handle the update via message:reacted event
      }
    } catch (error) {
      console.error('Failed to react to message:', error);
      toast.error('Không thể thêm cảm xúc');
    }
  }, []);

  useEffect(() => {
    if (isLoadingMoreMessages) return;

    const container = scrollContainerRef.current;
    if (container && messages.length > 0) {
      messageEndRef.current?.scrollIntoView({ behavior: "instant" });
      requestAnimationFrame(() => {
        hasInitialScrolledRef.current = true;
      });
    }
  }, [messages.length, pendingMessages.length, isLoadingMoreMessages]);

  useEffect(() => {
    hasInitialScrolledRef.current = false;
  }, [conversationId]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || prevScrollHeight === 0 || isLoadingMoreMessages) return;

    const newScrollHeight = container.scrollHeight;
    const diff = newScrollHeight - prevScrollHeight;
    if (diff > 0) {
      container.scrollTop = diff;
    }
    setPrevScrollHeight(0);
  }, [messages.length, isLoadingMoreMessages, prevScrollHeight]);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    if (!hasInitialScrolledRef.current) return;

    const isNearTop = container.scrollTop < 50;
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 10;

    if (
      isNearTop &&
      !isAtBottom &&
      hasMoreMessages &&
      !isLoadingMoreMessages &&
      onLoadMoreMessages
    ) {
      setPrevScrollHeight(container.scrollHeight);
      void onLoadMoreMessages();
    }
  }, [hasMoreMessages, isLoadingMoreMessages, onLoadMoreMessages]);

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
    (Boolean(conversationId) || allowCreateConversation) && !isUploadingMedia && !isChatDisabled;
  const canSubmit =
    (conversationId || allowCreateConversation) &&
    !isSending &&
    !isUploadingMedia &&
    !isChatDisabled &&
    trimmedDraft.length > 0;

  const handleSend = async () => {
    const content = trimmedDraft;
    if (
      (!conversationId && !allowCreateConversation) ||
      !content ||
      isUploadingMedia
    )
      return;
    await onSendMessage(content, undefined, replyTo?.messageId);
    setDraft("");
    setReplyTo(null); // Clear reply after sending
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
          await onSendMessage("", uploaded, replyTo?.messageId);
          setReplyTo(null); // Clear reply after sending
        }
      } catch (error) {
        console.error("Upload feedback attachment failed:", error);
        toast.error("Upload tệp thất bại. Vui lòng thử lại.");
      } finally {
        setIsUploadingMedia(false);
        event.target.value = "";
      }
    },
    [allowCreateConversation, conversationId, onSendMessage, replyTo?.messageId]
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
        return message._id;
      }
    }
    return null;
  }, [messages, currentUserId]);

  const handleLoginPrompt = useCallback(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("open-main-layout-login-modal"));
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
    <div className="flex h-full min-h-[420px] w-[320px] max-h-[90vh] max-w-full flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl">
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
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 space-y-3 overflow-y-auto px-3 py-3 no-scrollbar max-h-[calc(100vh-220px)]"
          >
            {!conversationId && !allowCreateConversation ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                Chọn cuộc hội thoại
              </div>
            ) : isLoading ? (
              <div className="space-y-3 py-4">
                <ChatMessageSkeleton position="left" />
                <ChatMessageSkeleton position="right" />
                <ChatMessageSkeleton position="left" />
                <ChatMessageSkeleton position="right" />
              </div>
            ) : messages.length === 0 && pendingMessages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-center">
                <div>
                  <p className="text-sm text-gray-500">Hãy gửi tin nhắn đầu tiên.</p>
                </div>
              </div>
            ) : (
              <>
                {isLoadingMoreMessages && (
                  <div className="flex justify-center py-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-black" />
                  </div>
                )}
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
                    isOwn && message._id === lastSeenMessageId;
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
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const messageReplyTo = (message as any).replyTo as {
                    messageId: string;
                    content: string;
                    displayName: string;
                    isOwn: boolean;
                    attachments?: UploadedFileInfo[];
                  } | undefined;

                  return (
                    <React.Fragment key={message._id}>
                      {showDivider && (
                        <div className="my-2 text-center text-xs text-gray-400">
                          {formatVietnameseDateTime(message.createdAt)}
                        </div>
                      )}
                      <div ref={(el) => {
                        if (el) {
                          messageRefs.current.set(message._id, el);
                        } else {
                          messageRefs.current.delete(message._id);
                        }
                      }}>
                        <FeedbackMessageItem
                          id={message._id}
                          isOwn={isOwn}
                          content={message.content}
                          createdAt={message.createdAt}
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
                          onReply={handleReply}
                          onScrollToMessage={handleScrollToMessage}
                          isHighlighted={highlightedMessageId === message._id}
                          replyTo={messageReplyTo}
                          reactions={message.reactions}
                          currentUserId={currentUserId}
                          onReactionClick={handleReactionClick}
                        />
                      </div>
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
            {/* Reply preview */}
            {replyTo && (
              <div className="flex w-full items-center gap-2 mb-2 px-2 py-2 bg-black/5 rounded-lg border border-black/10">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-700">
                    {replyTo.isOwn ? "Đang trả lời chính mình" : `Đang trả lời ${replyTo.displayName || "người dùng"}`}
                  </div>
                  <div className="text-xs text-gray-500 line-clamp-2">
                    {replyTo.attachments && replyTo.attachments.length > 0 ? (
                      replyTo.attachments[0].type === 'video' || replyTo.attachments[0].url?.includes('video')
                        ? 'Video'
                        : 'Hình ảnh'
                    ) : (
                      replyTo.content
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCancelReply}
                  className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full hover:bg-black/10 transition-all cursor-pointer"
                >
                  <FiX className="h-4 w-4 text-gray-600" />
                </button>
              </div>
            )}
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
                  isChatDisabled ||
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
