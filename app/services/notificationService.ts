"use client";

import { database } from "../appwrite";
import { Permission, Role, Query, Models } from "appwrite";
import {
  NotificationMetadata,
  NotificationScope,
  NotificationStatus,
  NotificationType,
} from "../types/Types";
import { buildNotificationMessage } from "../utils/notificationMessages";
import { NotificationMessageContext } from "../utils/notificationMessages";

const getIds = () => {
  const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID;
  const collectionId = process.env.NEXT_PUBLIC_COLLECTION_ID_NOTIFICATIONS;
  if (!databaseId || !collectionId) {
    throw new Error("Thiếu cấu hình Appwrite cho thông báo");
  }
  return { databaseId, collectionId };
};

const serializeMetadata = (metadata?: NotificationMetadata | null) => {
  if (!metadata) return undefined;
  try {
    const serialized = JSON.stringify(metadata);
    return serialized.length > 5000 ? serialized.slice(0, 5000) : serialized;
  } catch (error) {
    console.warn("Không thể serialize metadata thông báo:", error);
    return undefined;
  }
};

const buildNotificationPayload = (
  params: CreateNotificationParams,
  message: string,
  serializedMetadata?: string
) => {
  const {
    recipientId,
    actorId,
    type,
    scope,
    projectId,
    taskId,
    title,
    status,
  } = params;

  const payload: Record<string, unknown> = {
    type,
    scope,
    status,
    recipient: recipientId,
    message,
  };

  if (actorId) payload.actor = actorId;
  if (projectId) payload.project = projectId;
  if (taskId) payload.task = taskId;
  if (title) payload.title = title;
  if (serializedMetadata) {
    payload.metadata = serializedMetadata;
  }

  return payload;
};

export interface CreateNotificationParams {
  recipientId: string;
  actorId?: string | null;
  type: NotificationType;
  scope: NotificationScope;
  metadata?: NotificationMetadata | null;
  projectId?: string | null;
  taskId?: string | null;
  title?: string | null;
  status?: NotificationStatus;
  message?: string | null;
}

const resolveNotificationMessage = (
  params: CreateNotificationParams
): string => {
  if (params.message && params.message.trim().length > 0) {
    return params.message;
  }
  try {
    const context: NotificationMessageContext = {
      type: params.type,
      metadata: params.metadata ?? undefined,
    };

    const meta = params.metadata;
    if (meta) {
      if (typeof meta.actorName === "string") {
        context.actorName = meta.actorName;
      }
      if (typeof meta.recipientName === "string") {
        context.recipientName = meta.recipientName;
      }
      if (typeof meta.projectName === "string") {
        context.projectName = meta.projectName;
      }
      if (typeof meta.taskTitle === "string") {
        context.taskTitle = meta.taskTitle;
      }
    }

    return buildNotificationMessage(context).plainText;
  } catch (error) {
    console.warn("Không thể tạo message thông báo:", error);
    return "";
  }
};

export const createNotification = async ({
  recipientId,
  actorId,
  type,
  scope,
  metadata,
  projectId,
  taskId,
  title,
  status = "unread",
  message,
}: CreateNotificationParams) => {
  if (!recipientId) return null;
  getIds();
  try {
    const normalizedParams: CreateNotificationParams = {
      recipientId,
      actorId,
      type,
      scope,
      metadata,
      projectId,
      taskId,
      title,
      status,
      message,
    };

    const finalMessage = resolveNotificationMessage(normalizedParams);
    const serializedMetadata = serializeMetadata(metadata);

    const payload = buildNotificationPayload(
      { ...normalizedParams, message: finalMessage },
      finalMessage,
      serializedMetadata
    );

    const permissions = [
      Permission.read(Role.user(recipientId)),
      Permission.update(Role.user(recipientId)),
    ];

    const response = await fetch("/api/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ payload, permissions }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Create notification failed");
    }

    return await response.json();
  } catch (error) {
    console.error("Tạo thông báo thất bại:", error);
    return null;
  }
};

export const createNotifications = async (
  entries: CreateNotificationParams[]
) => {
  if (!entries.length) return;
  await Promise.all(entries.map((entry) => createNotification(entry)));
};

interface ProjectMembersOptions {
  includeLeader?: boolean;
}

const getProjectMembershipCollection = () => {
  const membershipsCollectionId =
    process.env.NEXT_PUBLIC_COLLECTION_ID_PROJECT_MEMBERSHIPS;
  if (!membershipsCollectionId) {
    throw new Error("Thiếu collection thành viên dự án");
  }
  return membershipsCollectionId;
};

export const getProjectMemberIds = async (
  projectId: string,
  options?: ProjectMembersOptions
) => {
  if (!projectId) return [];
  try {
    const { databaseId } = getIds();
    const membershipsCollectionId = getProjectMembershipCollection();
    const response = await database.listDocuments(
      databaseId,
      membershipsCollectionId,
      [Query.equal("project", projectId), Query.limit(200)]
    );

    const memberIds = new Set<string>();
    response.documents.forEach((doc) => {
      const membership = doc as Models.Document & {
        user?: string | { $id?: string };
      };
      if (typeof membership.user === "string") {
        memberIds.add(membership.user);
      } else if (membership.user && membership.user.$id) {
        memberIds.add(membership.user.$id);
      }
    });

    if (options?.includeLeader === false) {
      return Array.from(memberIds);
    }
    return Array.from(memberIds);
  } catch (error) {
    console.error("Không thể lấy danh sách thành viên dự án:", error);
    return [];
  }
};

export const ensureWelcomeNotification = async (
  recipientId: string,
  recipientName?: string
) => {
  if (!recipientId) return;
  try {
    const { databaseId, collectionId } = getIds();
    const existing = await database.listDocuments(databaseId, collectionId, [
      Query.equal("recipient.$id", recipientId),
      Query.equal("type", "system.welcome"),
      Query.limit(1),
    ]);
    if (existing.total > 0) return;
    await createNotification({
      recipientId,
      actorId: null,
      type: "system.welcome",
      scope: "system",
      metadata: {
        recipientName: recipientName ?? "",
      },
    });
  } catch (error) {
    console.error("Không thể tạo thông báo chào mừng:", error);
  }
};
