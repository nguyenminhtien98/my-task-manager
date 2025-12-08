import axiosInstance, { ApiResponse } from "@/lib/axios";
import type {
  NotificationRecord,
  NotificationType,
  NotificationScope,
  NotificationStatus,
  BasicProfile,
  BackendNotification,
  GetNotificationsResponse,
} from "../types/Types";

export const mapNotificationToRecord = (
  notification: BackendNotification
): NotificationRecord => {
  const actor: BasicProfile | null = notification.actor
    ? {
        _id: notification.actor._id,
        name: notification.actor.name,
        email: notification.actor.email,
        avatarUrl: notification.actor.avatarUrl,
      }
    : null;

  let scope: NotificationScope = "system";
  if (notification.type.startsWith("profile.")) scope = "profile";
  else if (notification.type.startsWith("project.")) scope = "project";
  else if (notification.type.startsWith("task.")) scope = "task";

  return {
    id: notification._id,
    type: notification.type as NotificationType,
    scope,
    status: (notification.isRead ? "read" : "unread") as NotificationStatus,
    title: notification.title || null,
    message: notification.message,
    metadata: {},
    createdAt: notification.createdAt,
    readAt: notification.readAt || null,
    actor,
    recipient: null,
    project: notification.project
      ? { _id: notification.project, name: null }
      : null,
    task: notification.task ? { _id: notification.task, title: null } : null,
  };
};

export const getNotifications = async (
  page: number = 1,
  limit: number = 50
): Promise<GetNotificationsResponse> => {
  const response = await axiosInstance.get<
    ApiResponse<BackendNotification[]> & {
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }
  >("/notifications", {
    params: { page, limit },
  });

  const backendData = response.data.data;
  const pagination = response.data.pagination;

  if (!Array.isArray(backendData)) {
    console.error("Invalid backend response - expected array:", backendData);
    return {
      notifications: [],
      total: 0,
      page: 1,
      pages: 1,
    };
  }

  const notifications = backendData
    .map((item) => {
      try {
        return mapNotificationToRecord(item);
      } catch (error) {
        console.error("Failed to map notification:", item, error);
        return null;
      }
    })
    .filter((item): item is NotificationRecord => item !== null);

  return {
    notifications,
    total: pagination?.total || 0,
    page: pagination?.page || 1,
    pages: pagination?.totalPages || 1,
  };
};

export const getUnreadCount = async (): Promise<number> => {
  const response = await axiosInstance.get<ApiResponse<{ count: number }>>(
    "/notifications/unread/count"
  );

  return response.data.data.count;
};

export const markAllAsRead = async (): Promise<void> => {
  await axiosInstance.put("/notifications/read-all");
};

export const deleteNotification = async (id: string): Promise<void> => {
  await axiosInstance.delete(`/notifications/${id}`);
};
