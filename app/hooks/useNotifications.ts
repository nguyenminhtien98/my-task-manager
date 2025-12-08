"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import * as notificationService from "../services/notificationService";
import type { NotificationRecord, BackendNotification } from "../types/Types";
import { useSocket } from "../context/SocketContext";

const NOTIFICATION_LIMIT = 20;

export type NotificationFilter = "all" | "unread";

interface UseNotificationsOptions {
  recipientId?: string | null;
}

export const useNotifications = ({ recipientId }: UseNotificationsOptions) => {
  const { socket, isConnected } = useSocket();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchNotifications = useCallback(async () => {
    if (!recipientId) return;

    try {
      setIsLoading(true);
      const data = await notificationService.getNotifications(
        currentPage,
        NOTIFICATION_LIMIT
      );

      if (currentPage === 1) {
        setNotifications(data.notifications);
      } else {
        setNotifications((prev) => [...prev, ...data.notifications]);
      }
      setTotalPages(data.pages);
    } catch (error) {
      console.error("Fetch notifications failed:", error);
      toast.error("Không thể tải thông báo");
    } finally {
      setIsLoading(false);
    }
  }, [recipientId, currentPage]);

  const fetchUnreadCount = useCallback(async () => {
    if (!recipientId) return;

    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error("Fetch unread count failed:", error);
    }
  }, [recipientId]);

  useEffect(() => {
    if (!recipientId) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    fetchUnreadCount();
  }, [recipientId, fetchUnreadCount]);

  useEffect(() => {
    if (!socket || !isConnected || !recipientId) return;

    const handleNewNotification = (data: BackendNotification) => {
      try {
        const mapped = notificationService.mapNotificationToRecord(data);

        setNotifications((prev) => {
          if (prev.some((n) => n.id === mapped.id)) return prev;
          return [mapped, ...prev];
        });

        if (!mapped.readAt) {
          setUnreadCount((prev) => prev + 1);
        }
      } catch (error) {
        console.error("Failed to process new notification:", error);
        void fetchNotifications();
        void fetchUnreadCount();
      }
    };

    const handleRelatedEvent = () => {
      setTimeout(() => {
        void fetchUnreadCount();
      }, 1000);
    };

    socket.on("notification:new", handleNewNotification);
    socket.on("notifications:new", handleNewNotification);
    socket.on("notification:created", handleNewNotification);

    const handleProjectUpdated = () => handleRelatedEvent();
    const handleProjectCreated = () => handleRelatedEvent();
    const handleProjectDeleted = () => handleRelatedEvent();
    const handleProjectReopened = () => handleRelatedEvent();
    const handleProjectClosed = () => handleRelatedEvent();
    const handleTaskCreated = () => handleRelatedEvent();
    const handleTaskUpdated = () => handleRelatedEvent();
    const handleTaskDeleted = () => handleRelatedEvent();

    socket.on("project:updated", handleProjectUpdated);
    socket.on("project:created", handleProjectCreated);
    socket.on("project:deleted", handleProjectDeleted);
    socket.on("project:reopened", handleProjectReopened);
    socket.on("project:closed", handleProjectClosed);
    socket.on("task:created", handleTaskCreated);
    socket.on("task:updated", handleTaskUpdated);
    socket.on("task:deleted", handleTaskDeleted);

    return () => {
      socket.off("notification:new", handleNewNotification);
      socket.off("notifications:new", handleNewNotification);
      socket.off("notification:created", handleNewNotification);
      socket.off("project:updated", handleProjectUpdated);
      socket.off("project:created", handleProjectCreated);
      socket.off("project:deleted", handleProjectDeleted);
      socket.off("project:reopened", handleProjectReopened);
      socket.off("project:closed", handleProjectClosed);
      socket.off("task:created", handleTaskCreated);
      socket.off("task:updated", handleTaskUpdated);
      socket.off("task:deleted", handleTaskDeleted);
    };
  }, [
    socket,
    isConnected,
    recipientId,
    fetchNotifications,
    fetchUnreadCount,
    unreadCount,
  ]);

  useEffect(() => {
    if (currentPage > 1) {
      void fetchNotifications();
    }
  }, [currentPage, fetchNotifications]);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          status: "read" as const,
          readAt: new Date().toISOString(),
        }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Mark all as read failed:", error);
      toast.error("Không thể đánh dấu đã đọc");
    }
  }, []);

  const deleteNotification = useCallback(async (id: string) => {
    try {
      await notificationService.deleteNotification(id);
      setNotifications((prev) => prev.filter((item) => item.id !== id));
      toast.success("Đã xóa thông báo");
    } catch (error) {
      console.error("Delete notification failed:", error);
      toast.error("Không thể xóa thông báo");
    }
  }, []);

  const hasMore = currentPage < totalPages;

  const fetchNextPage = useCallback(() => {
    if (hasMore && !isLoading) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [hasMore, isLoading]);

  const markNotificationStatus = useCallback(
    async (notificationId: string, status: "read" | "unread") => {
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notificationId
            ? {
                ...item,
                status,
                readAt:
                  status === "read" ? new Date().toISOString() : item.readAt,
              }
            : item
        )
      );
    },
    []
  );

  return {
    notifications,
    isLoading,
    isFetchingMore: isLoading && currentPage > 1,
    unreadCount,
    hasMore,
    fetchNextPage,
    markAllAsRead,
    markNotificationStatus,
    deleteNotification,
    reload: fetchNotifications,
  };
};
