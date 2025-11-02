"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { NotificationRecord } from "../../types/Types";
import NotificationCard from "./NotificationCard";
import { NotificationFilter } from "../../hooks/useNotifications";
import Button from "../common/Button";

interface NotificationListMainScreenProps {
  notifications: NotificationRecord[];
  filter: NotificationFilter;
  onFilterChange: (filter: NotificationFilter) => void;
  onNotificationClick: (notification: NotificationRecord) => void;
  onAction?: (actionKey: string, notification: NotificationRecord) => void;
  onLoadMore: () => void;
  isLoading: boolean;
  isFetchingMore: boolean;
  hasMore: boolean;
}

const NotificationListMainScreen: React.FC<NotificationListMainScreenProps> = ({
  notifications,
  filter,
  onFilterChange,
  onNotificationClick,
  onAction,
  onLoadMore,
  isLoading,
  isFetchingMore,
  hasMore,
}) => {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const bottomSentinelRef = useRef<HTMLDivElement | null>(null);

  const visibleNotifications = useMemo(() => notifications, [notifications]);
  const enableInfiniteScroll = useMemo(
    () => hasMore && filter === "all",
    [filter, hasMore]
  );

  useEffect(() => {
    const container = scrollContainerRef.current;
    const node = bottomSentinelRef.current;
    observerRef.current?.disconnect();
    if (
      !container ||
      !node ||
      !enableInfiniteScroll ||
      isFetchingMore ||
      isLoading
    )
      return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            onLoadMore();
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      {
        root: container,
        threshold: 0.75,
      }
    );

    observerRef.current.observe(node);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [
    enableInfiniteScroll,
    hasMore,
    isFetchingMore,
    isLoading,
    onLoadMore,
    visibleNotifications.length,
  ]);

  return (
    <div className="w-[360px] max-w-[92vw] rounded-lg bg-white p-3 shadow-lg">
      <div className="flex w-full justify-start">
        <span className="text-sm font-semibold uppercase tracking-wide text-[#111827]">
          Thông báo
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Button
          variant="solid"
          onClick={() => onFilterChange("all")}
          className={`rounded-full !px-3 !py-1 !text-xs ${filter === "all" ? "border bg-black text-white" : "border border-gray-300 bg-white text-[#111827]"
            }`}
        >
          Tất cả
        </Button>
        <Button
          variant="solid"
          onClick={() => onFilterChange("unread")}
          className={`rounded-full border !px-3 !py-1 !text-xs font-medium ${filter === "unread" ? "border bg-black text-white" : "border-gray-300 bg-white text-[#111827]"
            }`}
        >
          Chưa đọc
        </Button>
      </div>

      <div
        ref={scrollContainerRef}
        className="mt-4 max-h-[420px] space-y-1.5 overflow-y-auto pr-1 no-scrollbar"
      >
        {isLoading && (
          <div className="flex min-h-[120px] items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-black/80 border-t-transparent" />
          </div>
        )}

        {!isLoading && visibleNotifications.length === 0 && (
          <div className="flex min-h-[160px] items-center justify-center text-sm text-gray-500">
            Bạn không có thông báo.
          </div>
        )}

        {visibleNotifications.map((notification) => (
          <NotificationCard
            key={notification.id}
            notification={notification}
            onClick={onNotificationClick}
            onAction={onAction}
          />
        ))}

        <div ref={bottomSentinelRef} />

        {isFetchingMore && enableInfiniteScroll && (
          <div className="flex items-center justify-center py-2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-black/80 border-t-transparent" />
          </div>
        )}

        {!hasMore && visibleNotifications.length > 0 && (
          <div className="py-3 text-center text-xs text-gray-400">
            Bạn đã xem hết thông báo.
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationListMainScreen;
