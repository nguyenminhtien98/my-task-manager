"use client";

import React, { useState } from "react";
import Image from "next/image";
import AvatarUser from "../common/AvatarUser";
import Tooltip from "../common/Tooltip";
import BrandOrbHeaderIcon from "../common/LogoComponent";
import { formatVietnameseDateTime } from "../../utils/date";
import { detectMediaTypeFromUrl } from "../../utils/media";
import type { UploadedFileInfo } from "../../utils/upload";
import { FiPlay, FiTrash2, FiCornerUpLeft, FiSmile } from "react-icons/fi";
import { REACTION_CONFIGS, type ReactionType, renderReactionEmoji } from "../../utils/reactionIcons";

type MessageGrouping = "single" | "start" | "middle" | "end";

interface FeedbackMessageItemProps {
  id: string;
  isOwn: boolean;
  content: string;
  createdAt: string;
  grouping: MessageGrouping;
  avatarUrl?: string | null;
  displayName?: string;
  showAvatar?: boolean;
  seenAvatars?: Array<{ id: string; name?: string; avatarUrl?: string | null }>;
  showBrandAvatar?: boolean;
  attachments?: UploadedFileInfo[];
  onPreviewMedia?: (media: UploadedFileInfo) => void;
  onReply?: (messageId: string, content: string, displayName?: string, isOwn?: boolean, attachments?: UploadedFileInfo[]) => void;
  onScrollToMessage?: (messageId: string) => void;
  isHighlighted?: boolean;
  replyTo?: {
    messageId: string;
    content: string;
    displayName?: string;
    isOwn?: boolean;
    attachments?: UploadedFileInfo[];
  } | null;
  reactions?: Array<{
    type: "like" | "heart" | "haha" | "laugh" | "love" | "wow" | "angry";
    userId: string;
    createdAt: string;
  }>;
  currentUserId?: string;
  onReactionClick?: (messageId: string, reactionType: "like" | "heart" | "haha" | "laugh" | "love" | "wow" | "angry") => void;
}

const baseClasses = {
  own: {
    single: "rounded-2xl",
    start: "rounded-t-2xl rounded-br-[5px] rounded-bl-2xl",
    middle: "rounded-r-[5px] rounded-l-2xl",
    end: "rounded-b-2xl rounded-tr-[5px] rounded-tl-2xl",
  },
  other: {
    single: "rounded-2xl",
    start: "rounded-t-2xl rounded-bl-[5px] rounded-br-2xl",
    middle: "rounded-l-[5px] rounded-r-2xl",
    end: "rounded-b-2xl rounded-tl-[5px] rounded-tr-2xl",
  },
};

const FeedbackMessageItem: React.FC<FeedbackMessageItemProps> = ({
  id,
  isOwn,
  content,
  createdAt,
  grouping,
  avatarUrl,
  displayName,
  showAvatar = false,
  seenAvatars = [],
  showBrandAvatar = false,
  attachments = [],
  onPreviewMedia,
  onReply,
  onScrollToMessage,
  isHighlighted = false,
  replyTo,
  reactions = [],
  currentUserId,
  onReactionClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [reactionPlacement, setReactionPlacement] = useState<'top' | 'bottom'>('top');
  const [hideTooltip, setHideTooltip] = useState(false);
  const [isCalculatingPlacement, setIsCalculatingPlacement] = useState(true);
  const reactionPickerRef = React.useRef<HTMLDivElement | null>(null);
  const smileButtonRef = React.useRef<HTMLButtonElement | null>(null);

  const formattedTime = formatVietnameseDateTime(createdAt);
  const baseBubbleStyle = isOwn
    ? baseClasses.own[grouping]
    : baseClasses.other[grouping];
  const hasText = content.trim().length > 0;

  // Calculate displayed reaction:
  // - If message is mine (isOwn), show OTHER person's reaction
  // - If message is from other person (!isOwn), show MY reaction
  const displayedReaction = isOwn
    ? reactions.find(r => r.userId !== currentUserId)?.type
    : (currentUserId ? reactions.find(r => r.userId === currentUserId)?.type : undefined);

  React.useEffect(() => {
    if (showReactionPicker && smileButtonRef.current) {
      setIsCalculatingPlacement(true);

      requestAnimationFrame(() => {
        if (!smileButtonRef.current) return;

        const buttonRect = smileButtonRef.current.getBoundingClientRect();
        const requiredSpace = 80;

        let scrollContainer = smileButtonRef.current.closest('[class*="overflow-y-auto"]') as HTMLElement;
        if (!scrollContainer) {
          scrollContainer = smileButtonRef.current.closest('[class*="max-h-"]') as HTMLElement;
        }

        if (scrollContainer) {
          const containerRect = scrollContainer.getBoundingClientRect();
          const availableAbove = buttonRect.top - containerRect.top;
          const availableBelow = containerRect.bottom - buttonRect.bottom;

          if (availableAbove < requiredSpace && availableBelow >= requiredSpace) {
            setReactionPlacement('bottom');
          } else {
            setReactionPlacement('top');
          }
        } else {
          const availableAbove = buttonRect.top;
          const availableBelow = window.innerHeight - buttonRect.bottom;

          if (availableAbove < requiredSpace && availableBelow >= requiredSpace) {
            setReactionPlacement('bottom');
          } else {
            setReactionPlacement('top');
          }
        }

        setIsCalculatingPlacement(false);
      });
    } else {
      setIsCalculatingPlacement(true);
    }
  }, [showReactionPicker]);

  React.useEffect(() => {
    if (!showReactionPicker) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        reactionPickerRef.current &&
        !reactionPickerRef.current.contains(event.target as Node) &&
        smileButtonRef.current &&
        !smileButtonRef.current.contains(event.target as Node)
      ) {
        setShowReactionPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showReactionPicker]);

  const handleReactionClick = (reactionType: string) => {
    const reaction = reactionType as ReactionType;
    onReactionClick?.(id, reaction);
    setShowReactionPicker(false);
    setIsHovered(false);
  };

  const handleReplyClick = () => {
    onReply?.(id, content, displayName, isOwn, attachments);
    setIsHovered(false);
  };

  const handleDeleteClick = () => {
    // TODO: Implement delete logic
    console.log("Delete clicked for message:", id);
  };

  const renderAttachment = (attachment: UploadedFileInfo, index: number) => {
    const mediaType = attachment.type ?? detectMediaTypeFromUrl(attachment.url);
    const name = attachment.name ?? `Tệp đính kèm ${index + 1}`;
    const handlePreview = () => onPreviewMedia?.(attachment);
    const wrapperClasses =
      "relative overflow-hidden rounded-lg border border-black/10 bg-black/5 shadow-sm";
    const alignmentClass = isOwn ? "self-end" : "self-start";
    const wrapperStyle: React.CSSProperties = {
      alignSelf: isOwn ? "flex-end" : "flex-start",
      width: "min(320px, 60%)",
      minWidth: "190px",
      maxWidth: "100%",
    };

    if (mediaType === "image") {
      return (
        <button
          key={`${attachment.url}-${index}`}
          type="button"
          onClick={handlePreview}
          className={`${wrapperClasses} ${alignmentClass} block cursor-pointer transition hover:opacity-95`}
          style={wrapperStyle}
        >
          <Image
            src={attachment.url}
            alt={name}
            width={800}
            height={800}
            className="h-auto w-full object-contain"
            sizes="(max-width: 768px) 40vw, 320px"
          />
        </button>
      );
    }

    if (mediaType === "video") {
      return (
        <button
          key={`${attachment.url}-${index}`}
          type="button"
          onClick={handlePreview}
          className={`${wrapperClasses} ${alignmentClass} block cursor-pointer transition hover:opacity-95`}
          style={wrapperStyle}
        >
          <video
            src={attachment.url}
            className="h-auto w-full object-contain"
            controls={false}
            preload="metadata"
          />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white">
              <FiPlay className="ml-0.5" />
            </span>
          </span>
        </button>
      );
    }

    return (
      <button
        key={`${attachment.url}-${index}`}
        type="button"
        onClick={handlePreview}
        className={`${wrapperClasses} ${alignmentClass} block cursor-pointer px-3 py-2 text-sm text-black transition hover:opacity-95`}
        style={wrapperStyle}
      >
        {name}
      </button>
    );
  };

  return (
    <div
      className={`flex w-full ${isOwn ? "justify-end" : "justify-start"} relative`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={(e) => {
        if (reactionPickerRef.current && reactionPickerRef.current.contains(e.relatedTarget as Node)) {
          return;
        }
        setIsHovered(false);
      }}
    >
      {showReactionPicker && (
        <div
          ref={reactionPickerRef}
          className={`absolute left-1/2 -translate-x-1/2 z-50 rounded-lg border border-black/10 bg-white shadow-lg p-2 ${reactionPlacement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
            } ${isCalculatingPlacement ? 'invisible' : 'visible'}`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => {
            setIsHovered(false);
            setShowReactionPicker(false);
          }}
        >
          <div className="flex items-center gap-1">
            {REACTION_CONFIGS.map((reaction) => (
              <Tooltip key={reaction.type} content={reaction.label}>
                <button
                  type="button"
                  onClick={() => handleReactionClick(reaction.type)}
                  className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100 transition-all cursor-pointer"
                >
                  <span className="text-xl">{reaction.emoji}</span>
                </button>
              </Tooltip>
            ))}
          </div>
        </div>
      )}

      {isHovered && (
        <div className={`flex items-center gap-1 ${isOwn ? "mr-2" : "ml-2 order-last"}`}>
          {isOwn && (
            <Tooltip content="Xóa tin nhắn">
              <button
                type="button"
                onClick={handleDeleteClick}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white hover:bg-gray-100 shadow-md transition-all cursor-pointer"
              >
                <FiTrash2 className="h-3.5 w-3.5 text-gray-700" />
              </button>
            </Tooltip>
          )}

          <Tooltip content="Trả lời">
            <button
              type="button"
              onClick={handleReplyClick}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white hover:bg-gray-100 shadow-md transition-all cursor-pointer"
            >
              <FiCornerUpLeft className="h-3.5 w-3.5 text-gray-700" />
            </button>
          </Tooltip>

          {!isOwn && (
            <div className="relative">
              <Tooltip content={hideTooltip ? "" : "Cảm xúc"}>
                <button
                  ref={smileButtonRef}
                  type="button"
                  onClick={() => {
                    setShowReactionPicker(!showReactionPicker);
                    setHideTooltip(true);
                  }}
                  onMouseLeave={() => setHideTooltip(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-white hover:bg-gray-100 shadow-md transition-all cursor-pointer"
                >
                  <FiSmile className="h-3.5 w-3.5 text-gray-700" />
                </button>
              </Tooltip>
            </div>
          )}
        </div>
      )}

      {!isOwn && (
        <div className="mr-2 flex flex-col items-end">
          {showAvatar ? (
            showBrandAvatar ? (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm">
                <BrandOrbHeaderIcon size={20} />
              </div>
            ) : (
              <AvatarUser
                name={displayName ?? "Người dùng"}
                avatarUrl={avatarUrl}
                size={28}
                showTooltip={false}
              />
            )
          ) : (
            <div className="h-4" />
          )}
        </div>
      )}

      <div className="max-w-[80%]">
        {replyTo && (
          <div className="pb-4">
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <FiCornerUpLeft className="h-3 w-3" />
              <span>
                {isOwn && replyTo.isOwn
                  ? "Bạn trả lời chính mình"
                  : isOwn
                    ? `Bạn trả lời ${replyTo.displayName || "người dùng"}`
                    : `${displayName || "Người dùng"} trả lời bạn`
                }
              </span>
            </div>
            <button
              type="button"
              onClick={() => onScrollToMessage?.(replyTo.messageId)}
              className="w-full text-left mt-1 px-3 py-2 bg-black/5 hover:bg-black/10 rounded-xl text-xs text-gray-600 line-clamp-2 transition-colors cursor-pointer"
            >
              {replyTo.attachments && replyTo.attachments.length > 0 ? (
                replyTo.attachments[0].type === 'video' || replyTo.attachments[0].url?.includes('video')
                  ? 'Video'
                  : 'Hình ảnh'
              ) : (
                replyTo.content
              )}
            </button>
          </div>
        )}

        <div className={`relative ${replyTo ? '-mt-5.5' : ''} ${isOwn ? 'text-right' : ''}`}>
          {hasText && (
            <Tooltip
              content={formattedTime}
              className="block max-w-full"
              offsetY={6}
              delayIn={200}
              delayOut={120}
            >
              <div
                className={`inline-block max-w-[80vw] whitespace-pre-wrap break-words break-all px-3 py-2 text-sm shadow-sm transition ${baseBubbleStyle} ${isOwn
                  ? "bg-gray-200 text-gray-900"
                  : "bg-black/80 text-white"
                  } ${isHighlighted ? "ring-2 ring-black" : ""}`}
              >
                {content}
              </div>
            </Tooltip>
          )}

          {attachments.length > 0 && (
            <div className="mt-2 flex flex-col gap-2">
              {attachments.map((attachment, index) =>
                renderAttachment(attachment, index)
              )}
            </div>
          )}

          {displayedReaction && (
            <div
              className={`absolute -bottom-2 ${isOwn ? "left-2" : "right-2"} z-10 flex items-center justify-center h-4 w-4 rounded-full bg-white border border-gray-200 shadow-md`}
            >
              <span className="text-xs">{renderReactionEmoji(displayedReaction)}</span>
            </div>
          )}
        </div>

        {isOwn && seenAvatars.length > 0 && (
          <div className="mt-1 flex items-center justify-end gap-1">
            {seenAvatars.map((viewer) => (
              <AvatarUser
                key={`${id}-${viewer.id}`}
                name={viewer.name ?? "Đã xem"}
                avatarUrl={viewer.avatarUrl}
                size={14}
                showTooltip={true}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackMessageItem;

export const computeMessageGrouping = (
  currentSender: string,
  previousSender?: string,
  nextSender?: string
): MessageGrouping => {
  const isPrevSame = previousSender && previousSender === currentSender;
  const isNextSame = nextSender && nextSender === currentSender;

  if (isPrevSame && isNextSame) return "middle";
  if (isPrevSame && !isNextSame) return "end";
  if (!isPrevSame && isNextSame) return "start";
  return "single";
};
