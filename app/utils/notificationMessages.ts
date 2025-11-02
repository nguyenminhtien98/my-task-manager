"use client";

import {
  NotificationMetadata,
  NotificationMessage,
  NotificationMessageSegment,
  NotificationRecord,
  NotificationType,
} from "../types/Types";

export interface NotificationMessageContext {
  type: NotificationType;
  metadata?: NotificationMetadata;
  actorName?: string | null;
  recipientName?: string | null;
  projectName?: string | null;
  taskTitle?: string | null;
}

export interface NotificationMessageOptions {
  truncateTaskTitleLength?: number;
  truncateNameLength?: number;
}

const createMessage = (
  segments: NotificationMessageSegment[]
): NotificationMessage => ({
  segments,
  plainText: segments.map((segment) => segment.content).join(""),
});

const text = (content: string): NotificationMessageSegment => ({
  type: "text",
  content,
});

const action = (
  content: string,
  actionKey: string
): NotificationMessageSegment => ({
  type: "action",
  content,
  actionKey,
});

const getFieldLabel = (metadata?: NotificationMetadata) => {
  if (!metadata) return "thông tin";
  return (
    metadata.fieldLabel ||
    (typeof metadata.field === "string" ? metadata.field : "thông tin")
  );
};

const getAudience = (metadata?: NotificationMetadata) =>
  (metadata?.audience as NotificationMetadata["audience"]) ?? "actor";

const getProjectName = (
  context: NotificationMessageContext
): string | undefined =>
  context.projectName ??
  (typeof context.metadata?.projectName === "string"
    ? context.metadata?.projectName
    : undefined);

const getTaskTitle = (
  context: NotificationMessageContext
): string | undefined =>
  context.taskTitle ??
  (typeof context.metadata?.taskTitle === "string"
    ? context.metadata?.taskTitle
    : undefined);

const truncateText = (
  value: unknown,
  limit?: number
): string | undefined => {
  if (typeof value !== "string") return undefined;
  if (!limit || limit <= 0 || value.length <= limit) return value;
  const trimmed = value.slice(0, limit).trimEnd();
  return `${trimmed}...`;
};

const prepareContext = (
  context: NotificationMessageContext,
  options?: NotificationMessageOptions
): NotificationMessageContext => {
  if (!options) return context;
  const { truncateTaskTitleLength, truncateNameLength } = options;

  if (!truncateTaskTitleLength && !truncateNameLength) {
    return context;
  }

  const prepared: NotificationMessageContext = { ...context };

  if (truncateTaskTitleLength) {
    if (typeof prepared.taskTitle === "string") {
      prepared.taskTitle =
        truncateText(prepared.taskTitle, truncateTaskTitleLength) ??
        prepared.taskTitle;
    }
  }

  if (truncateNameLength) {
    if (typeof prepared.actorName === "string") {
      prepared.actorName =
        truncateText(prepared.actorName, truncateNameLength) ??
        prepared.actorName;
    }
    if (typeof prepared.recipientName === "string") {
      prepared.recipientName =
        truncateText(prepared.recipientName, truncateNameLength) ??
        prepared.recipientName;
    }
  }

  if (prepared.metadata) {
    const metadata: NotificationMetadata = { ...prepared.metadata };
    let hasChanges = false;

    if (truncateTaskTitleLength) {
      const truncatedTaskTitle =
        truncateText(metadata.taskTitle, truncateTaskTitleLength) ??
        metadata.taskTitle;
      if (truncatedTaskTitle !== metadata.taskTitle) {
        metadata.taskTitle = truncatedTaskTitle;
        hasChanges = true;
      }
    }

    if (truncateNameLength) {
      const keys: Array<keyof NotificationMetadata> = [
        "actorName",
        "memberName",
        "targetMemberName",
        "leaderName",
        "recipientName",
      ];
      keys.forEach((key) => {
        const value = metadata[key];
        if (typeof value === "string") {
          const truncated =
            truncateText(value, truncateNameLength) ?? value;
          if (truncated !== value) {
            metadata[key] = truncated;
            hasChanges = true;
          }
        }
      });
    }

    if (hasChanges) {
      prepared.metadata = metadata;
    }
  }

  return prepared;
};

const messageBuilders: Record<
  NotificationType,
  (context: NotificationMessageContext) => NotificationMessage
> = {
  "system.welcome": (context) => {
    const recipient =
      context.recipientName ??
      (typeof context.metadata?.recipientName === "string"
        ? context.metadata.recipientName
        : "bạn");
    return createMessage([
      text(`Chào mừng ${recipient} đến với My Task Manager. `),
      text(
        "Chúc bạn có một trải nghiệm thật tốt đẹp với chúng tôi và đừng quên "
      ),
      action("feedback", "open-feedback"),
      text(" cho chúng tôi nếu bạn không hài lòng. Thân ái!"),
    ]);
  },
  "profile.avatar.updated": () =>
    createMessage([text("Bạn vừa thay đổi avatar của bạn.")]),
  "profile.name.updated": (context) => {
    const newName =
      (typeof context.metadata?.newValue === "string"
        ? context.metadata?.newValue
        : undefined) ?? "tên mới";
    return createMessage([
      text("Bạn vừa thay đổi tên của bạn thành "),
      text(`${newName}.`),
    ]);
  },
  "profile.info.updated": (context) => {
    const label = getFieldLabel(context.metadata);
    const newValue =
      (typeof context.metadata?.newValue === "string"
        ? context.metadata.newValue
        : null) ?? "";
    const suffix = newValue ? ` thành ${newValue}.` : ".";
    return createMessage([
      text(`Bạn vừa thay đổi ${label} của bạn${suffix}`),
    ]);
  },
  "project.created": (context) => {
    const projectName = getProjectName(context) ?? "dự án mới";
    return createMessage([
      text(`Chúc mừng bạn đã tạo dự án ${projectName} thành công!`),
    ]);
  },
  "project.member.added": (context) => {
    const projectName = getProjectName(context) ?? "dự án";
    const target =
      (typeof context.metadata?.targetMemberName === "string"
        ? context.metadata.targetMemberName
        : undefined) ?? "thành viên mới";
    const actor =
      context.actorName ??
      (typeof context.metadata?.actorName === "string"
        ? context.metadata.actorName
        : undefined) ??
      "Leader";
    const audience = getAudience(context.metadata);
    if (audience === "target") {
      return createMessage([
        text(`${actor} vừa thêm bạn vào dự án ${projectName}.`),
      ]);
    }
    return createMessage([
      text(`Chúc mừng bạn đã thêm thành viên ${target} vào dự án ${projectName} thành công.`),
    ]);
  },
  "project.member.removed": (context) => {
    const projectName = getProjectName(context) ?? "dự án";
    const target =
      (typeof context.metadata?.targetMemberName === "string"
        ? context.metadata.targetMemberName
        : undefined) ?? "thành viên";
    const actor =
      context.actorName ??
      (typeof context.metadata?.actorName === "string"
        ? context.metadata.actorName
        : undefined) ??
      "Leader";
    const audience = getAudience(context.metadata);
    if (audience === "target") {
      return createMessage([
        text(`${actor} vừa loại bạn khỏi dự án ${projectName}.`),
      ]);
    }
    return createMessage([
      text(
        `Bạn vừa xoá thành viên ${target} khỏi dự án ${projectName}.`
      ),
    ]);
  },
  "project.deleted": (context) => {
    const projectName = getProjectName(context) ?? "dự án";
    const actor =
      context.actorName ??
      (typeof context.metadata?.actorName === "string"
        ? context.metadata.actorName
        : undefined) ??
      "Leader";
    const audience = getAudience(context.metadata);
    if (audience === "actor") {
      return createMessage([
        text(`Bạn vừa xoá dự án ${projectName}.`),
      ]);
    }
    return createMessage([
      text(`Dự án ${projectName} đã bị xoá bởi ${actor}.`),
    ]);
  },
  "project.closed": (context) => {
    const projectName = getProjectName(context) ?? "dự án";
    const actor =
      context.actorName ??
      (typeof context.metadata?.actorName === "string"
        ? context.metadata.actorName
        : undefined) ??
      "Leader";
    const audience = getAudience(context.metadata);
    if (audience === "actor") {
      return createMessage([
        text(`Bạn vừa đóng dự án ${projectName}.`),
      ]);
    }
    return createMessage([
      text(`Dự án ${projectName} đã được ${actor} đóng lại.`),
    ]);
  },
  "project.reopened": (context) => {
    const projectName = getProjectName(context) ?? "dự án";
    const actor =
      context.actorName ??
      (typeof context.metadata?.actorName === "string"
        ? context.metadata.actorName
        : undefined) ??
      "Leader";
    const audience = getAudience(context.metadata);
    if (audience === "actor") {
      return createMessage([
        text(`Bạn vừa mở lại dự án ${projectName}.`),
      ]);
    }
    return createMessage([
      text(`Dự án ${projectName} vừa được ${actor} mở lại.`),
    ]);
  },
  "project.themeColor.updated": (context) => {
    const projectName = getProjectName(context) ?? "dự án";
    const actor =
      context.actorName ??
      (typeof context.metadata?.actorName === "string"
        ? context.metadata.actorName
        : undefined) ??
      "Leader";
    const audience = getAudience(context.metadata);
    if (audience === "actor") {
      return createMessage([
        text(`Bạn vừa thay đổi màu nền của dự án ${projectName} thành công.`),
      ]);
    }
    return createMessage([
      text(`${actor} vừa thay đổi màu nền của dự án ${projectName}.`),
    ]);
  },
  "task.created": (context) => {
    const taskTitle = getTaskTitle(context) ?? "task mới";
    return createMessage([text(`Bạn đã tạo task ${taskTitle} thành công.`)]);
  },
  "task.updated": (context) => {
    const taskTitle = getTaskTitle(context) ?? "task";
    const fieldLabel = getFieldLabel(context.metadata);
    return createMessage([
      text(
        `Bạn đã cập nhật ${fieldLabel} của task ${taskTitle} thành công.`
      ),
    ]);
  },
  "task.assigned": (context) => {
    const taskTitle = getTaskTitle(context) ?? "task";
    const actor =
      context.actorName ??
      (typeof context.metadata?.actorName === "string"
        ? context.metadata.actorName
        : undefined) ??
      "Leader";
    const target =
      (typeof context.metadata?.targetMemberName === "string"
        ? context.metadata.targetMemberName
        : undefined) ?? "thành viên";
    const audience = getAudience(context.metadata);
    const event =
      typeof context.metadata?.event === "string"
        ? context.metadata.event
        : "assigned";

    if (event === "accepted") {
      const member =
        (typeof context.metadata?.memberName === "string"
          ? context.metadata.memberName
          : undefined) ??
        context.actorName ??
        target;
      if (audience === "assignee") {
        return createMessage([
          text(`Bạn vừa nhận task ${taskTitle} thành công.`),
        ]);
      }
      const leader =
        (typeof context.metadata?.leaderName === "string"
          ? context.metadata.leaderName
          : undefined) ?? "Leader";
      return createMessage([
        text(`${member} vừa nhận task ${taskTitle}.`),
        text(audience === "leader" ? "" : ` (${leader}).`),
      ]);
    }

    if (audience === "assignee" || audience === "target") {
      return createMessage([
        text(`${actor} đã giao task ${taskTitle} cho bạn.`),
      ]);
    }
    return createMessage([
      text(`Bạn đã giao task ${taskTitle} cho ${target}.`),
    ]);
  },
  "task.completed": (context) => {
    const taskTitle = getTaskTitle(context) ?? "task";
    const member =
      (typeof context.metadata?.memberName === "string"
        ? context.metadata.memberName
        : undefined) ??
      context.actorName ??
      "Thành viên";
    const audience = getAudience(context.metadata);
    if (audience === "assignee") {
      return createMessage([
        text(`Chúc mừng bạn! Task ${taskTitle} của bạn đã hoàn thành.`),
      ]);
    }
    return createMessage([
      text(`${member} đã hoàn thành task ${taskTitle}.`),
    ]);
  },
  "task.movedToBug": (context) => {
    const taskTitle = getTaskTitle(context) ?? "task";
    const actor =
      context.actorName ??
      (typeof context.metadata?.actorName === "string"
        ? context.metadata.actorName
        : undefined) ??
      "Leader";
    const audience = getAudience(context.metadata);
    if (audience === "assignee") {
      return createMessage([
        text(`Task ${taskTitle} của bạn vừa được ${actor} kéo đến cột Bug.`),
      ]);
    }
    return createMessage([
      text(`Bạn vừa chuyển task ${taskTitle} sang cột Bug.`),
    ]);
  },
  "task.movedToCompleted": (context) => {
    const taskTitle = getTaskTitle(context) ?? "task";
    const member =
      (typeof context.metadata?.memberName === "string"
        ? context.metadata.memberName
        : undefined) ??
      context.actorName ??
      "Thành viên";
    const audience = getAudience(context.metadata);
    if (audience === "assignee") {
      return createMessage([
        text(`Chúc mừng bạn! Task ${taskTitle} của bạn đã hoàn thành.`),
      ]);
    }
    return createMessage([
      text(`${member} đã đưa task ${taskTitle} vào cột Completed.`),
    ]);
  },
  "task.comment.added": (context) => {
    const taskTitle = getTaskTitle(context) ?? "task";
    const actor =
      context.actorName ??
      (typeof context.metadata?.actorName === "string"
        ? context.metadata.actorName
        : undefined) ??
      "Thành viên";
    return createMessage([
      text(`${actor} vừa bình luận task ${taskTitle}.`),
    ]);
  },
};

export const buildNotificationMessage = (
  context: NotificationMessageContext,
  options?: NotificationMessageOptions
): NotificationMessage => {
  const builder = messageBuilders[context.type];
  if (builder) {
    const preparedContext =
      options ? prepareContext(context, options) : context;
    return builder(preparedContext);
  }
  return createMessage([
    text("Bạn có một thông báo mới."),
  ]);
};

export const buildNotificationMessageFromRecord = (
  notification: NotificationRecord,
  options?: NotificationMessageOptions
): NotificationMessage => {
  const context: NotificationMessageContext = {
    type: notification.type,
    metadata: notification.metadata,
    actorName: notification.actor?.name,
    recipientName: notification.recipient?.name,
    projectName: notification.project?.name,
    taskTitle: notification.task?.title,
  };

  return buildNotificationMessage(context, options);
};
