"use client";

import React, { useMemo } from "react";
import AvatarUser from "../common/AvatarUser";
import {
  NotificationMessageSegment,
  NotificationRecord,
} from "../../types/Types";
import { formatRelativeTimeFromNow } from "../../utils/date";
import { buildNotificationMessageFromRecord } from "../../utils/notificationMessages";

interface NotificationCardProps {
  notification: NotificationRecord;
  onClick?: (notification: NotificationRecord) => void;
  onAction?: (actionKey: string, notification: NotificationRecord) => void;
  isExpanded?: boolean;
}

const renderSegment = (
  segment: NotificationMessageSegment,
  notification: NotificationRecord,
  index: number,
  onAction?: (actionKey: string, notification: NotificationRecord) => void
) => {
  if (segment.type === "action") {
    return (
      <button
        key={`${segment.content}-${segment.actionKey ?? index}`}
        type="button"
        className="text-emerald-600 underline underline-offset-2 hover:text-emerald-500"
        onClick={(event) => {
          event.stopPropagation();
          if (segment.actionKey && onAction) {
            onAction(segment.actionKey, notification);
          }
        }}
      >
        {segment.content}
      </button>
    );
  }
  return (
    <span key={`segment-${index}`} className="whitespace-pre-wrap">
      {segment.content}
    </span>
  );
};

const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onClick,
  onAction,
  isExpanded = false,
}) => {
  const actor = notification.actor;
  const displayName = actor?.name ?? "My Task Manager";
  const displayAvatar = actor?.avatarUrl ?? undefined;
  const createdAtLabel = formatRelativeTimeFromNow(notification.createdAt);
  const showUnreadDot = notification.status === "unread";

  const displayMessage = useMemo(() => {
    if (isExpanded) {
      return buildNotificationMessageFromRecord(notification);
    }
    return buildNotificationMessageFromRecord(notification, {
      truncateTaskTitleLength: 15,
      truncateNameLength: 10,
    });
  }, [notification, isExpanded]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick?.(notification)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick?.(notification);
        }
      }}
      className={`flex w-full cursor-pointer items-start gap-3 rounded-lg px-3 py-2 transition hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/40 ${
        isExpanded ? "bg-black/5" : ""
      }`}
    >
      <div className="flex-shrink-0">
        <AvatarUser
          name={displayName}
          avatarUrl={displayAvatar}
          size={36}
          showTooltip={false}
          className="shadow-sm"
        />
      </div>

      <div className={`min-w-0 ${showUnreadDot ? "flex-1" : "flex-1"}`}>
        <div
          className={`text-sm text-[#111827] ${
            isExpanded ? "" : "line-clamp-2"
          }`}
        >
          {displayMessage.segments.map((segment, index) =>
            renderSegment(segment, notification, index, onAction)
          )}
        </div>
        <div className="mt-1 text-xs text-gray-500">{createdAtLabel}</div>
      </div>

      {showUnreadDot && (
        <div className="flex h-full w-3 items-center justify-center">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </div>
      )}
    </div>
  );
};

export default NotificationCard;
