"use client";

import React, { useEffect, useRef, useState } from "react";
import { NotificationRecord } from "../../types/Types";
import { useNotifications } from "../../hooks/useNotifications";
import NotificationListMainScreen from "./NotificationListMainScreen";
import NotificationListDetailScreen from "./NotificationListDetailScreen";

interface NotificationListProps {
  hook: ReturnType<typeof useNotifications>;
  isOpen: boolean;
  onAction?: (actionKey: string, notification: NotificationRecord) => void;
}

const NotificationList: React.FC<NotificationListProps> = ({
  hook,
  isOpen,
  onAction,
}) => {
  const {
    filteredNotifications,
    filter,
    setFilter,
    fetchNextPage,
    isLoading,
    isFetchingMore,
    hasMore,
    markAllAsRead,
    markAllAsSeen,
  } = hook;
  const [activeView, setActiveView] = useState<"main" | "detail">("main");
  const [selectedNotification, setSelectedNotification] =
    useState<NotificationRecord | null>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setActiveView("main");
      void markAllAsSeen();
    }
  }, [isOpen, markAllAsSeen]);

  useEffect(() => {
    if (!isOpen && wasOpenRef.current) {
      void markAllAsRead();
      setSelectedNotification(null);
      setActiveView("main");
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, markAllAsRead]);

  const handleCardClick = (notification: NotificationRecord) => {
    setSelectedNotification(notification);
    setActiveView("detail");
  };

  const handleBack = () => {
    setActiveView("main");
    setSelectedNotification(null);
  };

  const handleLoadMore = React.useCallback(() => {
    if (filter !== "all") return;
    void fetchNextPage();
  }, [fetchNextPage, filter]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="relative">
      {activeView === "main" ? (
        <NotificationListMainScreen
          notifications={filteredNotifications}
          filter={filter}
          onFilterChange={setFilter}
          onNotificationClick={handleCardClick}
          onAction={onAction}
          onLoadMore={handleLoadMore}
          isLoading={isLoading}
          isFetchingMore={isFetchingMore}
          hasMore={hasMore}
        />
      ) : (
        <NotificationListDetailScreen
          notification={selectedNotification}
          onBack={handleBack}
          onAction={onAction}
        />
      )}
    </div>
  );
};

export default NotificationList;
