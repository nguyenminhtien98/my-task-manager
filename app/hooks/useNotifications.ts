"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Query } from "appwrite";
import toast from "react-hot-toast";
import { database, subscribeToRealtime } from "../appwrite";
import {
  NotificationRecord,
  NotificationStatus,
} from "../types/Types";
import {
  mapNotificationDocument,
  RawNotificationDocument,
} from "../utils/notification";

const NOTIFICATION_LIMIT = 20;

const getCollectionInfo = () => {
  const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID;
  const collectionId = process.env.NEXT_PUBLIC_COLLECTION_ID_NOTIFICATIONS;
  if (!databaseId || !collectionId) {
    throw new Error("Thiếu cấu hình collection thông báo");
  }
  return { databaseId, collectionId };
};

export type NotificationFilter = "all" | "unread";

interface UseNotificationsOptions {
  recipientId?: string | null;
}

export const useNotifications = ({
  recipientId,
}: UseNotificationsOptions) => {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const cursorRef = useRef<string | null>(null);
  const isMountedRef = useRef(false);

  const resetState = useCallback(() => {
    setNotifications([]);
    setIsLoading(false);
    setIsFetchingMore(false);
    setHasMore(true);
    cursorRef.current = null;
  }, []);

  const fetchNotifications = useCallback(
    async (mode: "initial" | "next") => {
      if (!recipientId) return;
      try {
        if (mode === "initial") {
          setIsLoading(true);
          cursorRef.current = null;
        } else {
          if (isFetchingMore || !hasMore) return;
          setIsFetchingMore(true);
        }
        const { databaseId, collectionId } = getCollectionInfo();
        const queries = [
          Query.equal("recipient.$id", recipientId),
          Query.orderDesc("$createdAt"),
          Query.limit(NOTIFICATION_LIMIT),
        ];
        if (mode === "next" && cursorRef.current) {
          queries.push(Query.cursorAfter(cursorRef.current));
        }
        const result = await database.listDocuments(
          databaseId,
          collectionId,
          queries
        );
        const docs = result.documents as unknown as RawNotificationDocument[];
        const mapped = docs.map((doc) => mapNotificationDocument(doc));

        let appendedCount = 0;

        if (mode === "initial") {
          setNotifications(mapped);
          appendedCount = mapped.length;
        } else if (mapped.length > 0) {
          setNotifications((prev) => {
            const existingIds = new Set(prev.map((item) => item.id));
            const newItems = mapped.filter((item) => !existingIds.has(item.id));
            appendedCount = newItems.length;
            if (newItems.length === 0) {
              return prev;
            }
            return [...prev, ...newItems];
          });
        }

        if (mapped.length > 0) {
          const last = mapped[mapped.length - 1];
          cursorRef.current = last.id;
        }

        if (mode === "initial") {
          setHasMore(mapped.length === NOTIFICATION_LIMIT);
        } else {
          const receivedFullPage = mapped.length === NOTIFICATION_LIMIT;
          if (!receivedFullPage || appendedCount === 0) {
            setHasMore(false);
          } else {
            setHasMore(true);
          }
        }
      } catch (error) {
        console.error("Fetch notifications failed:", error);
        if (mode === "initial") {
          toast.error("Không thể tải thông báo");
          setNotifications([]);
        }
      } finally {
        if (mode === "initial") {
          setIsLoading(false);
        } else {
          setIsFetchingMore(false);
        }
      }
    },
    [hasMore, isFetchingMore, recipientId]
  );

  useEffect(() => {
    if (!recipientId) {
      resetState();
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        await fetchNotifications("initial");
      } catch (error) {
        if (!cancelled) {
          console.error(error);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [fetchNotifications, recipientId, resetState]);

  useEffect(() => {
    if (!recipientId) return;
    const { databaseId, collectionId } = getCollectionInfo();
    const channel = `databases.${databaseId}.collections.${collectionId}.documents`;
    const unsubscribe = subscribeToRealtime([channel], (res: unknown) => {
      const payload = res as {
        events?: string[];
        payload?: {
          $id?: string;
          data?: RawNotificationDocument;
        };
      };
      if (!payload?.events || payload.events.length === 0) return;
      const events = payload.events;
      let raw =
        payload.payload?.data ??
        ((payload.payload as unknown) as RawNotificationDocument);
      if (!raw || !raw.$id) {
        raw = payload.payload as unknown as RawNotificationDocument;
      }
      if (!raw || !raw.$id) return;

      const docRecipient =
        typeof raw.recipient === "string"
          ? raw.recipient
          : raw.recipient?.$id;
      if (docRecipient !== recipientId) return;

      if (events.some((event) => event.endsWith(".delete"))) {
        setNotifications((prev) =>
          prev.filter((notification) => notification.id !== raw.$id)
        );
        return;
      }

      const mapped = mapNotificationDocument(raw);
      if (events.some((event) => event.endsWith(".create"))) {
        setNotifications((prev) => {
          const exists = prev.some((item) => item.id === mapped.id);
          if (exists) return prev;
          return [mapped, ...prev];
        });
      } else if (events.some((event) => event.endsWith(".update"))) {
        setNotifications((prev) =>
          prev.map((item) => (item.id === mapped.id ? mapped : item))
        );
      }
    });

    return () => {
      unsubscribe();
    };
  }, [recipientId]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((item) => item.status === "unread").length,
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    if (filter === "unread") {
      return notifications.filter((item) => item.status === "unread");
    }
    return notifications;
  }, [filter, notifications]);

  const markNotificationStatus = useCallback(
    async (notificationId: string, status: NotificationStatus) => {
      try {
        const { databaseId, collectionId } = getCollectionInfo();
        const payload =
          status === "read"
            ? {
                status,
                readAt: new Date().toISOString(),
              }
            : {
                status,
              };
        await database.updateDocument(
          databaseId,
          collectionId,
          notificationId,
          payload
        );
        setNotifications((prev) =>
          prev.map((item) =>
            item.id === notificationId
              ? {
                  ...item,
                  status,
                  readAt:
                    status === "read"
                      ? new Date().toISOString()
                      : item.readAt,
                }
              : item
          )
        );
      } catch (error) {
        console.error("Không thể cập nhật trạng thái thông báo:", error);
        toast.error("Không thể cập nhật trạng thái thông báo");
      }
    },
    []
  );

  const markNotificationsAsSeen = useCallback(
    async (notificationIds: string[]) => {
      if (notificationIds.length === 0) return;
      try {
        const { databaseId, collectionId } = getCollectionInfo();
        const seenAt = new Date().toISOString();
        await Promise.all(
          notificationIds.map((id) =>
            database.updateDocument(databaseId, collectionId, id, {
              seenAt,
            })
          )
        );
        setNotifications((prev) =>
          prev.map((item) =>
            notificationIds.includes(item.id)
              ? {
                  ...item,
                  seenAt,
                }
              : item
          )
        );
      } catch (error) {
        console.error("Không thể cập nhật seenAt thông báo:", error);
      }
    },
    []
  );

  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications
      .filter((item) => item.status === "unread")
      .map((item) => item.id);
    if (unreadIds.length === 0) return;
    try {
      const { databaseId, collectionId } = getCollectionInfo();
      const readAt = new Date().toISOString();
      await Promise.all(
        unreadIds.map((id) =>
          database.updateDocument(databaseId, collectionId, id, {
            status: "read",
            readAt,
          })
        )
      );
      setNotifications((prev) =>
        prev.map((item) =>
          unreadIds.includes(item.id)
            ? {
                ...item,
                status: "read",
                readAt,
              }
            : item
        )
      );
    } catch (error) {
      console.error("Không thể đánh dấu đã đọc:", error);
      toast.error("Không thể đánh dấu đã đọc");
    }
  }, [notifications]);

  const markAllAsSeen = useCallback(async () => {
    const unseenIds = notifications
      .filter((item) => !item.seenAt)
      .map((item) => item.id);
    await markNotificationsAsSeen(unseenIds);
  }, [markNotificationsAsSeen, notifications]);

  const fetchNextPage = useCallback(async () => {
    await fetchNotifications("next");
  }, [fetchNotifications]);

  return {
    notifications,
    filteredNotifications,
    isLoading,
    isFetchingMore,
    hasMore,
    unreadCount,
    filter,
    setFilter,
    fetchNextPage,
    markNotificationStatus,
    markAllAsRead,
    markAllAsSeen,
    markNotificationsAsSeen,
    reload: () => fetchNotifications("initial"),
  };
};
