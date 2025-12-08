"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { NotificationRecord } from "../../types/Types";
import NotificationCard from "./NotificationCard";
import NotificationSkeleton from "../loading/NotificationSkeleton";
import { cn } from "../../utils/cn";

interface NotificationListMainScreenProps {
  notifications: NotificationRecord[];
  onNotificationClick: (notification: NotificationRecord) => void;
  onLoadMore: () => void;
  isLoading: boolean;
  isFetchingMore: boolean;
  hasMore: boolean;
  className?: string;
}

const NotificationListMainScreen: React.FC<NotificationListMainScreenProps> = ({
  notifications,
  onNotificationClick,
  onLoadMore,
  isLoading,
  isFetchingMore,
  hasMore,
  className,
}) => {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const bottomSentinelRef = useRef<HTMLDivElement | null>(null);

  const visibleNotifications = useMemo(() => notifications, [notifications]);
  const enableInfiniteScroll = useMemo(() => hasMore, [hasMore]);

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
          if (entry.isIntersecting && !isFetchingMore) {
            onLoadMore();
          }
        });
      },
      {
        root: container,
        threshold: 0.5,
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
    <div
      className={cn(
        "w-full rounded-lg bg-white p-3 shadow-lg",
        className
      )}
    >
      <div className="flex w-full justify-start mb-4">
        <span className="text-sm font-semibold uppercase tracking-wide text-[#111827]">
          Thông báo
        </span>
      </div>

      <div
        ref={scrollContainerRef}
        className="max-h-[420px] space-y-1.5 overflow-y-auto pr-1 no-scrollbar"
      >
        {isLoading && visibleNotifications.length === 0 ? (
          <div className="space-y-1.5">
            {Array.from({ length: 2 }).map((_, index) => (
              <NotificationSkeleton key={index} />
            ))}
          </div>
        ) : (
          <>
            {visibleNotifications.length === 0 && (
              <div className="flex min-h-[160px] items-center justify-center text-sm text-gray-500">
                Bạn không có thông báo.
              </div>
            )}

            {visibleNotifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onClick={onNotificationClick}
              />
            ))}

            <div ref={bottomSentinelRef} />

            {isFetchingMore && enableInfiniteScroll && (
              <NotificationSkeleton />
            )}

            {!hasMore && visibleNotifications.length > 0 && (
              <div className="py-3 text-center text-xs text-gray-400">
                Bạn đã xem hết thông báo.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default NotificationListMainScreen;
