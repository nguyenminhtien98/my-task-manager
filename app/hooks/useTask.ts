"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { database, subscribeToRealtime } from "../../lib/appwrite";
import { useAuth } from "../context/AuthContext";
import { useProject } from "../context/ProjectContext";
import {
  Task,
  CreateTaskFormValues,
  TaskDetailFormValues,
  TaskAttachment,
  BasicProfile,
  TaskStatus,
} from "../types/Types";
import { Permission, Role } from "appwrite";
import toast from "react-hot-toast";
import { uploadFilesToCloudinary } from "../utils/upload";
import { createNotification } from "../services/notificationService";
import { checkUserSuspended } from "../utils/moderation";

interface CreateTaskParams {
  data: CreateTaskFormValues;
  nextSeq: number;
  selectedFiles: File[];
  isLeader: boolean;
  members: Array<{
    $id: string;
    name: string;
    email?: string;
    avatarUrl?: string | null;
  }>;
}

interface UpdateTaskParams {
  task: Task;
  data: TaskDetailFormValues;
}

interface ReceiveTaskParams {
  task: Task;
}

interface MoveTaskParams {
  task: Task;
  status: TaskStatus;
  order: number;
  completedBy?: string;
}

export const useTask = () => {
  const { user } = useAuth();
  const { currentProject, isProjectClosed } = useProject();
  const closedMessage = "Dự án đã bị đóng, thao tác không khả dụng.";
  const locallyModifiedTaskIdsRef = useRef<Set<string>>(new Set());

  const projectMeta = useMemo(
    () => ({
      id: currentProject?.$id ?? null,
      name: currentProject?.name ?? null,
      leaderId: currentProject?.leader?.$id ?? null,
      leaderName: currentProject?.leader?.name ?? null,
    }),
    [
      currentProject?.$id,
      currentProject?.name,
      currentProject?.leader?.$id,
      currentProject?.leader?.name,
    ]
  );

  const ensureUserNotSuspended = useCallback(async () => {
    if (!user?.id) {
      throw new Error("Chưa đăng nhập");
    }
    await checkUserSuspended(user.id);
  }, [user?.id]);
  useEffect(() => {
    if (!user || !currentProject) return;

    const databaseId = String(process.env.NEXT_PUBLIC_DATABASE_ID);
    const tasksCollectionId = String(
      process.env.NEXT_PUBLIC_COLLECTION_ID_TASKS
    );
    const channel = `databases.${databaseId}.collections.${tasksCollectionId}.documents`;

    const unsubscribe = subscribeToRealtime([channel], (res: unknown) => {
      const payload = res as {
        payload: { data?: unknown; $id?: string };
        events: string[];
      };

      if (!payload?.events?.length) return;

      const documentId = payload.payload?.$id;
      const rawUnknown = payload.payload.data ?? (payload as unknown);
      const raw = rawUnknown as Record<string, unknown> & { $id?: string };

      if (documentId && locallyModifiedTaskIdsRef.current.has(documentId)) {
        locallyModifiedTaskIdsRef.current.delete(documentId);
        return;
      }

      const resolveProfileId = (value: unknown): string | undefined => {
        if (!value) return undefined;
        if (typeof value === "string") return value;
        if (typeof value === "object") {
          const maybe = value as { $id?: string };
          if (maybe.$id && typeof maybe.$id === "string") {
            return maybe.$id;
          }
        }
        return undefined;
      };

      const doc: Task = {
        ...(raw as unknown as Task),
        id: raw.$id || (raw as unknown as Task).id,
        assignee: raw.assignee as string | BasicProfile,
        completedBy: resolveProfileId(raw.completedBy),
      };

      if (doc.projectId !== currentProject.$id) return;
    });

    return () => {
      unsubscribe();
    };
  }, [user, currentProject]);

  const uploadSelectedFiles = async (
    selectedFiles: File[]
  ): Promise<TaskAttachment[]> => {
    if (selectedFiles.length === 0) return [];
    const uploaded = await uploadFilesToCloudinary(selectedFiles);
    return uploaded.map((item) => ({
      url: item.url,
      name: item.name,
      type: item.type,
      createdAt: new Date().toISOString(),
    }));
  };

  const createTask = useCallback(
    async (
      params: CreateTaskParams
    ): Promise<{ success: boolean; task?: Task; message?: string }> => {
      if (!user) {
        return { success: false, message: "Chưa đăng nhập" };
      }
      if (isProjectClosed) {
        toast.error(closedMessage);
        return { success: false, message: closedMessage };
      }

      const { data, nextSeq, selectedFiles, isLeader, members } = params;
      const projectId = projectMeta.id;
      const projectName = projectMeta.name;

      let attachments: TaskAttachment[] = [];
      try {
        attachments = await uploadSelectedFiles(selectedFiles);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Upload ảnh thất bại";
        toast.error(message);
        return { success: false, message };
      }

      const baseTaskFields = {
        seq: nextSeq,
        title: data.title,
        description: data.description,
        status: "list" as const,
        order: 0,
        startDate: data.startDate.trim() === "" ? null : data.startDate,
        endDate: data.endDate.trim() === "" ? null : data.endDate,
        predictedHours: data.predictedHours,
        issueType: data.issueType!,
        priority: data.priority!,
        projectId: projectId ?? "",
        projectName: projectName ?? "",
        completedBy: user.id,
        attachedFile: attachments,
      };

      const attributeId =
        (
          globalThis as unknown as { crypto?: { randomUUID?: () => string } }
        ).crypto?.randomUUID?.() ||
        `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      let assigneeProfile = undefined;
      if (isLeader) {
        if (typeof data.assignee === "object" && data.assignee.name) {
          assigneeProfile = data.assignee;
        } else if (
          typeof data.assignee === "string" &&
          data.assignee.trim() !== ""
        ) {
          const found = members.find((m) => m.name === data.assignee);
          if (found)
            assigneeProfile = {
              $id: found.$id,
              name: found.name,
              email: found.email,
              avatarUrl: found.avatarUrl,
            };
        }
      } else {
        assigneeProfile = user ? { $id: user.id, name: user.name } : undefined;
      }

      const payloadForAppwrite = {
        ...baseTaskFields,
        id: attributeId,
        attachedFile: attachments.map((m) => m.url),
        media: undefined,
        ...(assigneeProfile ? { assignee: assigneeProfile.$id } : {}),
        completedBy: user.id,
      } as Record<string, unknown>;

      try {
        await ensureUserNotSuspended();
        const created = await database.createDocument(
          process.env.NEXT_PUBLIC_DATABASE_ID!,
          process.env.NEXT_PUBLIC_COLLECTION_ID_TASKS!,
          "unique()",
          payloadForAppwrite,
          [
            Permission.read(Role.any()),
            Permission.update(Role.user(user.id)),
            Permission.delete(Role.user(user.id)),
          ]
        );

        const createdId = (created as unknown as { $id: string }).$id;
        const newTask: Task = {
          id: createdId,
          ...baseTaskFields,
          assignee: assigneeProfile,
        };

        locallyModifiedTaskIdsRef.current.add(createdId);

        if (
          isLeader &&
          assigneeProfile?.$id &&
          assigneeProfile.$id !== user.id
        ) {
          await Promise.allSettled([
            createNotification({
              recipientId: assigneeProfile.$id,
              actorId: user.id,
              type: "task.assigned",
              scope: "task",
              projectId: projectId ?? undefined,
              taskId: createdId,
              metadata: {
                taskTitle: data.title,
                actorName: user.name,
                audience: "assignee" as const,
                targetMemberName: assigneeProfile.name ?? "",
              },
            }),
          ]);
        }

        toast.success("Tạo Task thành công");
        return { success: true, task: newTask };
      } catch (e: unknown) {
        const errorMessage =
          e instanceof Error
            ? e.message || "Tạo Task thất bại"
            : "Tạo Task thất bại";
        toast.error(errorMessage);
        return { success: false, message: errorMessage };
      }
    },
    [ensureUserNotSuspended, isProjectClosed, projectMeta, user]
  );

  const updateTask = useCallback(
    async (
      params: UpdateTaskParams
    ): Promise<{ success: boolean; task?: Task; message?: string }> => {
      if (!user) {
        return { success: false, message: "Chưa đăng nhập" };
      }
      if (isProjectClosed) {
        toast.error(closedMessage);
        return { success: false, message: closedMessage };
      }

      const { task, data } = params;
      const isTaskTaken =
        typeof task.assignee === "string"
          ? task.assignee.trim() !== ""
          : Boolean(task.assignee);

      const updatedFields: Partial<Task> = {};
      const canEditTiming = isTaskTaken && task.status !== "completed";
      if (canEditTiming) {
        if (
          typeof data.startDate === "string" &&
          data.startDate.trim() !== "" &&
          data.startDate !== task.startDate
        ) {
          updatedFields.startDate = data.startDate;
        }
        if (
          typeof data.endDate === "string" &&
          data.endDate.trim() !== "" &&
          data.endDate !== task.endDate
        ) {
          updatedFields.endDate = data.endDate;
        }
        if (
          typeof data.predictedHours === "number" &&
          data.predictedHours !== task.predictedHours
        ) {
          updatedFields.predictedHours = data.predictedHours;
        }
      }

      if (Object.keys(updatedFields).length === 0) {
        return { success: true, task };
      }

      try {
        await ensureUserNotSuspended();

        await database.updateDocument(
          process.env.NEXT_PUBLIC_DATABASE_ID!,
          process.env.NEXT_PUBLIC_COLLECTION_ID_TASKS!,
          task.id,
          updatedFields
        );

        locallyModifiedTaskIdsRef.current.add(task.id);

        const updatedTask = { ...task, ...updatedFields };

        toast.success("Cập nhật Task thành công");
        return { success: true, task: updatedTask };
      } catch (e: unknown) {
        if (!(e instanceof Error && e.message?.includes("hạn chế"))) {
          console.error("Lỗi cập nhật:", e);
        }
        const err = e as { message?: string };
        const errorMessage = err?.message || "Cập nhật Task thất bại";
        toast.error(errorMessage);
        return { success: false, message: errorMessage };
      }
    },
    [ensureUserNotSuspended, isProjectClosed, user]
  );

  const receiveTask = useCallback(
    async (
      params: ReceiveTaskParams
    ): Promise<{ success: boolean; task?: Task; message?: string }> => {
      if (!user) {
        return { success: false, message: "Chưa đăng nhập" };
      }
      if (isProjectClosed) {
        toast.error(closedMessage);
        return { success: false, message: closedMessage };
      }

      const { task } = params;
      const { id: projectId, leaderId, leaderName } = projectMeta;

      try {
        await ensureUserNotSuspended();

        await database.updateDocument(
          String(process.env.NEXT_PUBLIC_DATABASE_ID),
          String(process.env.NEXT_PUBLIC_COLLECTION_ID_TASKS),
          task.id,
          { assignee: user.id }
        );

        locallyModifiedTaskIdsRef.current.add(task.id);

        const updatedTask: Task = {
          ...task,
          assignee: { $id: user.id, name: user.name },
        };

        const notifications = [
          createNotification({
            recipientId: user.id,
            actorId: user.id,
            type: "task.assigned",
            scope: "task",
            projectId: projectId ?? undefined,
            taskId: task.id,
            metadata: {
              taskTitle: task.title,
              memberName: user.name,
              audience: "assignee" as const,
              event: "accepted",
            },
          }),
        ];

        if (leaderId && leaderId !== user.id) {
          notifications.push(
            createNotification({
              recipientId: leaderId,
              actorId: user.id,
              type: "task.assigned",
              scope: "task",
              projectId: projectId ?? undefined,
              taskId: task.id,
              metadata: {
                taskTitle: task.title,
                memberName: user.name,
                leaderName: leaderName ?? undefined,
                audience: "leader" as const,
                event: "accepted",
              },
            })
          );
        }

        await Promise.allSettled(notifications);

        toast.success("Nhận task thành công");
        return { success: true, task: updatedTask };
      } catch (err: unknown) {
        if (!(err instanceof Error && err.message?.includes("hạn chế"))) {
          console.error("Failed to receive task:", err);
        }
        const message =
          typeof err === "object" &&
          err &&
          "message" in (err as Record<string, unknown>)
            ? String((err as { message?: unknown }).message)
            : "Nhận task thất bại";
        toast.error(message);
        return { success: false, message };
      }
    },
    [ensureUserNotSuspended, isProjectClosed, projectMeta, user]
  );

  const resolveProfileId = useCallback((value: unknown): string | undefined => {
    if (!value) return undefined;
    if (typeof value === "string") return value;
    if (typeof value === "object") {
      const maybe = value as { $id?: string; user_id?: string };
      if (maybe.$id && typeof maybe.$id === "string") {
        return maybe.$id;
      }
      if (maybe.user_id && typeof maybe.user_id === "string") {
        return maybe.user_id;
      }
    }
    return undefined;
  }, []);

  const deleteTask = useCallback(
    async (task: Task): Promise<{ success: boolean; message?: string }> => {
      const taskId = task.id;
      if (!user) {
        return { success: false, message: "Chưa đăng nhập" };
      }
      if (isProjectClosed) {
        toast.error(closedMessage);
        return { success: false, message: closedMessage };
      }

      try {
        await ensureUserNotSuspended();

        await database.deleteDocument(
          String(process.env.NEXT_PUBLIC_DATABASE_ID),
          String(process.env.NEXT_PUBLIC_COLLECTION_ID_TASKS),
          taskId
        );

        locallyModifiedTaskIdsRef.current.add(taskId);

        const creatorId = resolveProfileId(task.completedBy);
        if (creatorId && creatorId !== user.id) {
          try {
            await createNotification({
              recipientId: creatorId,
              actorId: user.id,
              type: "task.deleted",
              scope: "task",
              projectId: projectMeta.id ?? undefined,
              metadata: {
                taskTitle: task.title,
                actorName: user.name,
                audience: "creator" as const,
              },
            });
          } catch (err) {
            console.error("Failed to send delete task notification:", err);
          }
        }

        toast.success("Xóa Task thành công");
        return { success: true };
      } catch (err: unknown) {
        if (!(err instanceof Error && err.message?.includes("hạn chế"))) {
          console.error("Failed to delete task:", err);
        }
        const message =
          typeof err === "object" &&
          err &&
          "message" in (err as Record<string, unknown>)
            ? String((err as { message?: unknown }).message)
            : "Xóa Task thất bại";
        toast.error(message);
        return { success: false, message };
      }
    },
    [
      ensureUserNotSuspended,
      isProjectClosed,
      projectMeta.id,
      resolveProfileId,
      user,
    ]
  );

  const moveTask = useCallback(
    async (
      params: MoveTaskParams
    ): Promise<{ success: boolean; task?: Task; message?: string }> => {
      if (!user) {
        return { success: false, message: "Chưa đăng nhập" };
      }
      if (isProjectClosed) {
        toast.error(closedMessage);
        return { success: false, message: closedMessage };
      }

      const { task, status, order, completedBy } = params;
      const { id: projectId, leaderId } = projectMeta;

      const updatePayload: Record<string, unknown> = {
        status,
        order,
      };

      if (completedBy !== undefined) {
        updatePayload.completedBy = completedBy;
      } else if (task.completedBy) {
        updatePayload.completedBy = null;
      }

      try {
        await ensureUserNotSuspended();

        await database.updateDocument(
          String(process.env.NEXT_PUBLIC_DATABASE_ID),
          String(process.env.NEXT_PUBLIC_COLLECTION_ID_TASKS),
          task.id,
          updatePayload
        );

        locallyModifiedTaskIdsRef.current.add(task.id);

        const updatedTask: Task = {
          ...task,
          status,
          order,
          completedBy:
            completedBy !== undefined
              ? completedBy
              : updatePayload.completedBy === null
              ? undefined
              : task.completedBy,
        };

        const assigneeInfo =
          typeof task.assignee === "object" && task.assignee
            ? (task.assignee as BasicProfile)
            : typeof task.assignee === "string" && task.assignee
            ? ({ $id: task.assignee } as BasicProfile)
            : null;
        const assigneeId = assigneeInfo?.$id;
        const assigneeName =
          assigneeInfo?.name ||
          (typeof task.assignee === "object"
            ? (task.assignee as BasicProfile)?.name
            : undefined);
        const actorIsLeader = leaderId === user.id;
        const notifications: Promise<unknown>[] = [];

        if (
          !actorIsLeader &&
          assigneeId === user.id &&
          (status === "done" || status === "completed")
        ) {
          if (leaderId && leaderId !== user.id) {
            notifications.push(
              createNotification({
                recipientId: leaderId,
                actorId: user.id,
                type: "task.completed",
                scope: "task",
                projectId: projectId ?? undefined,
                taskId: task.id,
                metadata: {
                  taskTitle: task.title,
                  memberName: user.name,
                  audience: "leader" as const,
                },
              })
            );
          }
        }

        if (actorIsLeader && assigneeId && assigneeId !== user.id) {
          if (status === "bug") {
            notifications.push(
              createNotification({
                recipientId: assigneeId,
                actorId: user.id,
                type: "task.movedToBug",
                scope: "task",
                projectId: projectId ?? undefined,
                taskId: task.id,
                metadata: {
                  taskTitle: task.title,
                  actorName: user.name,
                  audience: "assignee" as const,
                },
              })
            );
          } else if (status === "completed") {
            notifications.push(
              createNotification({
                recipientId: assigneeId,
                actorId: user.id,
                type: "task.movedToCompleted",
                scope: "task",
                projectId: projectId ?? undefined,
                taskId: task.id,
                metadata: {
                  taskTitle: task.title,
                  memberName: assigneeName ?? "",
                  actorName: user.name,
                  audience: "assignee" as const,
                },
              })
            );
          }
        }

        if (notifications.length > 0) {
          await Promise.allSettled(notifications);
        }

        return { success: true, task: updatedTask };
      } catch (err: unknown) {
        if (!(err instanceof Error && err.message?.includes("hạn chế"))) {
          console.error("Failed to move task:", err);
        }
        const message =
          typeof err === "object" && err && "message" in err
            ? String((err as { message?: unknown }).message)
            : "Cập nhật trạng thái thất bại";
        return { success: false, message };
      }
    },
    [ensureUserNotSuspended, isProjectClosed, projectMeta, user]
  );

  return {
    createTask,
    updateTask,
    receiveTask,
    deleteTask,
    moveTask,
  };
};

export type UseTaskResult = ReturnType<typeof useTask>;
