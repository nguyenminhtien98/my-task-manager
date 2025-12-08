"use client";

import React from "react";
import AvatarUser from "../common/AvatarUser";
import BrandOrbHeaderIcon from "../common/LogoComponent";
import { NotificationRecord } from "../../types/Types";
import { formatRelativeTimeFromNow } from "../../utils/date";

interface NotificationCardProps {
  notification: NotificationRecord;
  onClick?: (notification: NotificationRecord) => void;
  isExpanded?: boolean;
}

const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onClick,
  isExpanded = false,
}) => {
  const actor = notification.actor;
  const displayName = actor?.name ?? "My Task Manager";
  const displayAvatar = actor?.avatarUrl ?? undefined;
  const createdAtLabel = formatRelativeTimeFromNow(notification.createdAt);
  const showUnreadDot = notification.status === "unread";

  const isSystemNotification = notification.type.startsWith("system.");

  const displayMessage = notification.message || "Bạn có một thông báo mới.";

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
      className={`flex w-full cursor-pointer items-start gap-3 rounded-lg px-3 py-2 transition hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/40 ${isExpanded ? "bg-black/5" : ""
        }`}
    >
      <div className="flex-shrink-0">
        {isSystemNotification ? (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm">
            <BrandOrbHeaderIcon size={28} />
          </div>
        ) : (
          <AvatarUser
            name={displayName}
            avatarUrl={displayAvatar}
            size={36}
            showTooltip={false}
            className="shadow-sm"
          />
        )}
      </div>

      <div className={`min-w-0 ${showUnreadDot ? "flex-1" : "flex-1"}`}>
        <div
          className={`text-sm text-[#111827] ${isExpanded ? "" : "line-clamp-2"
            }`}
        >
          {displayMessage}
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
