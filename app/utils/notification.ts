"use client";

import {
  BasicProfile,
  NotificationMetadata,
  NotificationRecord,
  NotificationScope,
  NotificationStatus,
  NotificationType,
} from "../types/Types";
import {
  buildNotificationMessage,
  NotificationMessageContext,
} from "./notificationMessages";

interface RawProfile {
  $id?: string;
  name?: string;
  email?: string;
  avatarUrl?: string | null;
}

interface RawProject {
  $id?: string;
  name?: string;
}

interface RawTask {
  $id?: string;
  title?: string;
}

export interface RawNotificationDocument {
  $id: string;
  $createdAt: string;
  $updatedAt?: string;
  type?: string;
  scope?: string;
  status?: string;
  title?: string | null;
  metadata?: unknown;
  seenAt?: string | null;
  readAt?: string | null;
  recipient?: string | RawProfile | null;
  actor?: string | RawProfile | null;
  project?: string | RawProject | null;
  task?: string | RawTask | null;
}

const isNotificationType = (value: unknown): value is NotificationType => {
  return (
    typeof value === "string" &&
    [
      "system.welcome",
      "profile.avatar.updated",
      "profile.name.updated",
      "profile.info.updated",
      "project.created",
      "project.member.added",
      "project.member.removed",
      "project.deleted",
      "project.closed",
      "project.reopened",
      "project.themeColor.updated",
      "task.created",
      "task.updated",
      "task.assigned",
      "task.completed",
      "task.movedToBug",
      "task.movedToCompleted",
      "task.comment.added",
      "task.deleted",
      "feedback.message.fromUser",
      "feedback.message.fromAdmin",
    ].includes(value)
  );
};

const isNotificationScope = (value: unknown): value is NotificationScope => {
  return (
    typeof value === "string" &&
    ["system", "profile", "project", "task"].includes(value)
  );
};

const isNotificationStatus = (value: unknown): value is NotificationStatus => {
  return (
    typeof value === "string" && ["unread", "read", "archived"].includes(value)
  );
};

const normalizeProfile = (
  raw?: string | RawProfile | null
): BasicProfile | null => {
  if (!raw) return null;
  if (typeof raw === "string") {
    return {
      $id: raw,
      name: "Người dùng",
    };
  }
  if (typeof raw === "object") {
    return {
      $id: raw.$id ?? "unknown",
      name: raw.name ?? "Người dùng",
      email: raw.email,
      avatarUrl: raw.avatarUrl,
    };
  }
  return null;
};

const normalizeMetadata = (
  metadata: unknown
): NotificationMetadata | undefined => {
  if (!metadata) return undefined;
  if (typeof metadata === "string") {
    try {
      const parsed = JSON.parse(metadata) as NotificationMetadata;
      return parsed ?? undefined;
    } catch (error) {
      console.warn("Không thể parse metadata thông báo:", error);
      return undefined;
    }
  }
  if (typeof metadata === "object") {
    return metadata as NotificationMetadata;
  }
  return undefined;
};

export const mapNotificationDocument = (
  doc: RawNotificationDocument
): NotificationRecord => {
  const type = isNotificationType(doc.type)
    ? doc.type
    : ("system.welcome" as NotificationType);
  const scope = isNotificationScope(doc.scope)
    ? doc.scope
    : ("system" as NotificationScope);
  const status = isNotificationStatus(doc.status)
    ? doc.status
    : ("unread" as NotificationStatus);
  const actor = normalizeProfile(doc.actor);
  const recipient = normalizeProfile(doc.recipient);
  const metadata = normalizeMetadata(doc.metadata);
  const project =
    typeof doc.project === "string"
      ? { $id: doc.project, name: undefined }
      : doc.project
      ? { $id: doc.project.$id ?? "unknown", name: doc.project.name }
      : null;
  const task =
    typeof doc.task === "string"
      ? { $id: doc.task, title: undefined }
      : doc.task
      ? { $id: doc.task.$id ?? "unknown", title: doc.task.title }
      : null;

  const messageContext: NotificationMessageContext = {
    type,
    metadata,
    actorName: actor?.name,
    recipientName: recipient?.name,
    projectName: project?.name,
    taskTitle: task?.title,
  };

  return {
    id: doc.$id,
    type,
    scope,
    status,
    title: doc.title,
    metadata,
    createdAt: doc.$createdAt,
    updatedAt: doc.$updatedAt,
    seenAt: doc.seenAt ?? null,
    readAt: doc.readAt ?? null,
    actor,
    recipient,
    project,
    task,
    message: buildNotificationMessage(messageContext),
  };
};
