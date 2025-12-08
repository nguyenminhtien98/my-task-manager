"use client";

import React, { useEffect, useRef, useState } from "react";
import { NotificationRecord } from "../../types/Types";
import { useNotifications } from "../../hooks/useNotifications";
import NotificationListMainScreen from "./NotificationListMainScreen";
import NotificationListDetailScreen from "./NotificationListDetailScreen";

interface NotificationListProps {
  hook: ReturnType<typeof useNotifications>;
  isOpen: boolean;
  panelClassName?: string;
}

const NotificationList: React.FC<NotificationListProps> = ({
  hook,
  isOpen,
  panelClassName,
}) => {
  const {
    notifications,
    fetchNextPage,
    isLoading,
    isFetchingMore,
    hasMore,
    markAllAsRead,
    reload,
    unreadCount,
  } = hook;
  const [activeView, setActiveView] = useState<"main" | "detail">("main");
  const [selectedNotification, setSelectedNotification] =
    useState<NotificationRecord | null>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setActiveView("main");
      void reload();
      if (unreadCount > 0) {
        void markAllAsRead();
      }
    }
    if (!isOpen && wasOpenRef.current) {
      setSelectedNotification(null);
      setActiveView("main");
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, reload, markAllAsRead, unreadCount]);

  const handleCardClick = (notification: NotificationRecord) => {
    setSelectedNotification(notification);
    setActiveView("detail");
  };

  const handleBack = () => {
    setActiveView("main");
    setSelectedNotification(null);
  };

  const handleLoadMore = React.useCallback(() => {
    void fetchNextPage();
  }, [fetchNextPage]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="relative w-full p-3">
      {activeView === "main" ? (
        <NotificationListMainScreen
          notifications={notifications}
          onNotificationClick={handleCardClick}
          onLoadMore={handleLoadMore}
          isLoading={isLoading}
          isFetchingMore={isFetchingMore}
          hasMore={hasMore}
          className={panelClassName}
        />
      ) : (
        <NotificationListDetailScreen
          notification={selectedNotification}
          onBack={handleBack}
          className={panelClassName}
        />
      )}
    </div>
  );
};

export default NotificationList;
