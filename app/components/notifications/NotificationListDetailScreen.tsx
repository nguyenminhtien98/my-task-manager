"use client";

import React from "react";
import { NotificationRecord } from "../../types/Types";
import NotificationCard from "./NotificationCard";
import { cn } from "../../utils/cn";

interface NotificationListDetailScreenProps {
  notification: NotificationRecord | null;
  onBack: () => void;
  onAction?: (actionKey: string, notification: NotificationRecord) => void;
  className?: string;
  hideHeader?: boolean;
}

const NotificationListDetailScreen: React.FC<
  NotificationListDetailScreenProps
> = ({ notification, onBack, onAction, className, hideHeader = false }) => {
  if (!notification) {
    return (
      <div
        className={cn(
          "w-[360px] max-w-[92vw] rounded-lg bg-white p-4 shadow-lg",
          className
        )}
      >
        <div className="text-sm text-gray-500">
          Không tìm thấy thông báo để hiển thị.
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "w-[360px] max-w-[92vw] rounded-lg bg-white p-3 shadow-lg",
        className
      )}
    >
      {!hideHeader && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-700 transition hover:border-black/50 hover:text-black hover:cursor-pointer"
            aria-label="Quay lại"
          >
            ←
          </button>
          <span className="text-sm font-semibold text-[#111827]">
            Chi tiết thông báo
          </span>
        </div>
      )}

      <div className="mt-4 rounded-lg border border-gray-200 bg-white">
        <NotificationCard
          notification={notification}
          isExpanded
          onAction={onAction}
        />
      </div>

    </div>
  );
};

export default NotificationListDetailScreen;
