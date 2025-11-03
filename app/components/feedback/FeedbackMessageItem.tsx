"use client";

import React from "react";
import Image from "next/image";
import AvatarUser from "../common/AvatarUser";
import Tooltip from "../common/Tooltip";
import BrandOrbHeaderIcon from "../common/LogoComponent";
import { formatVietnameseDateTime } from "../../utils/date";
import { detectMediaTypeFromUrl } from "../../utils/media";
import type { UploadedFileInfo } from "../../utils/upload";
import { FiPlay } from "react-icons/fi";

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
}) => {
  const formattedTime = formatVietnameseDateTime(createdAt);
  const baseBubbleStyle = isOwn
    ? baseClasses.own[grouping]
    : baseClasses.other[grouping];
  const hasText = content.trim().length > 0;

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
    <div className={`flex w-full ${isOwn ? "justify-end" : "justify-start"}`}>
      {!isOwn && (
        <div className="mr-2 flex flex-col items-end">
          {showAvatar ? (
            showBrandAvatar ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm">
                <BrandOrbHeaderIcon size={24} />
              </div>
            ) : (
              <AvatarUser
                name={displayName ?? "Người dùng"}
                avatarUrl={avatarUrl}
                size={32}
                showTooltip={false}
              />
            )
          ) : (
            <div className="h-4" />
          )}
        </div>
      )}

      <div className="max-w-[80%]">
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
                }`}
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
