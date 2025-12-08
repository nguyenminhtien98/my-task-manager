"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useProject } from "../context/ProjectContext";
import { useSocket } from "../context/SocketContext";
import {
  Task,
  CreateTaskFormValues,
  TaskDetailFormValues,
  TaskAttachment,
  TaskStatus,
  TaskFromBE,
} from "../types/Types";
import toast from "react-hot-toast";
import { uploadFilesToCloudinary } from "../utils/upload";
import * as taskAPI from "../services/taskService";

interface CreateTaskParams {
  data: CreateTaskFormValues;
  nextSeq: number;
  selectedFiles: File[];
  isLeader: boolean;
  members: Array<{
    _id: string;
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
}

export const useTask = () => {
  const { user } = useAuth();
  const { currentProject, isProjectClosed } = useProject();
  const { socket, isConnected } = useSocket();
  const closedMessage = "Dự án đã bị đóng, thao tác không khả dụng.";
  const locallyModifiedTaskIdsRef = useRef<Set<string>>(new Set());

  const projectMeta = useMemo(
    () => ({
      id: currentProject?._id ?? null,
      name: currentProject?.name ?? null,
      leaderId: currentProject?.leader?._id ?? null,
      leaderName: currentProject?.leader?.name ?? null,
    }),
    [
      currentProject?._id,
      currentProject?.name,
      currentProject?.leader?._id,
      currentProject?.leader?.name,
    ]
  );

  useEffect(() => {
    if (!socket || !isConnected || !user || !currentProject) return;

    const handleTaskEvent = (data: TaskFromBE) => {
      const projectId =
        typeof data.project === "string" ? data.project : data.project._id;
      if (projectId !== currentProject._id) return;

      if (locallyModifiedTaskIdsRef.current.has(data._id)) {
        locallyModifiedTaskIdsRef.current.delete(data._id);
        return;
      }

      window.dispatchEvent(
        new CustomEvent("task-realtime-update", { detail: data })
      );
    };

    socket.on("task:created", handleTaskEvent);
    socket.on("task:updated", handleTaskEvent);
    socket.on("task:deleted", (data: { taskId: string; projectId: string }) => {
      if (data.projectId !== currentProject._id) return;

      window.dispatchEvent(
        new CustomEvent("task-realtime-delete", { detail: data.taskId })
      );
    });

    return () => {
      socket.off("task:created", handleTaskEvent);
      socket.off("task:updated", handleTaskEvent);
      socket.off("task:deleted");
    };
  }, [socket, isConnected, user, currentProject]);

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

      if (!projectId) {
        return { success: false, message: "Không tìm thấy project" };
      }

      let attachments: TaskAttachment[] = [];
      try {
        attachments = await uploadSelectedFiles(selectedFiles);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Upload ảnh thất bại";
        toast.error(message);
        return { success: false, message };
      }

      let assigneeId: string | undefined = undefined;
      if (isLeader) {
        if (typeof data.assignee === "object" && data.assignee.name) {
          assigneeId = data.assignee._id;
        } else if (
          typeof data.assignee === "string" &&
          data.assignee.trim() !== ""
        ) {
          const found = members.find((m) => m.name === data.assignee);
          if (found) assigneeId = found._id;
        }
      } else {
        assigneeId = user.id;
      }

      const createData = {
        title: data.title,
        description: data.description,
        status: "list" as const,
        startDate: data.startDate.trim() === "" ? undefined : data.startDate,
        endDate: data.endDate.trim() === "" ? undefined : data.endDate,
        predictedHours: data.predictedHours,
        issueType: data.issueType!,
        priority: data.priority!,
        assignee: assigneeId,
        attachments: attachments.map((a) => ({
          url: a.url,
          name: a.name,
          type: a.type,
          createdAt: a.createdAt,
        })),
      };

      try {
        const beTask = await taskAPI.createTask(projectId, createData);
        const newTask: Task = {
          ...beTask,
          seq: nextSeq,
          completedBy: beTask.status === "completed" ? beTask.assignee : null,
        };

        locallyModifiedTaskIdsRef.current.add(newTask._id);

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
    [isProjectClosed, projectMeta, user]
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
      const isTaskTaken = Boolean(task.assignee);

      const updateData: Record<string, unknown> = {};
      const canEditTiming = isTaskTaken && task.status !== "completed";
      if (canEditTiming) {
        if (
          typeof data.startDate === "string" &&
          data.startDate.trim() !== "" &&
          data.startDate !== task.startDate
        ) {
          updateData.startDate = data.startDate;
        }
        if (
          typeof data.endDate === "string" &&
          data.endDate.trim() !== "" &&
          data.endDate !== task.endDate
        ) {
          updateData.endDate = data.endDate;
        }
        if (
          typeof data.predictedHours === "number" &&
          data.predictedHours !== task.predictedHours
        ) {
          updateData.predictedHours = data.predictedHours;
        }
      }

      if (Object.keys(updateData).length === 0) {
        return { success: true, task };
      }

      try {
        const beTask = await taskAPI.updateTask(task._id, updateData);
        const updatedTask: Task = {
          ...beTask,
          seq: task.seq,
          completedBy: beTask.status === "completed" ? beTask.assignee : null,
        };

        locallyModifiedTaskIdsRef.current.add(task._id);

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
    [isProjectClosed, user]
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

      try {
        const beTask = await taskAPI.claimTask(task._id);
        const updatedTask: Task = {
          ...beTask,
          seq: task.seq,
          completedBy: beTask.status === "completed" ? beTask.assignee : null,
        };

        locallyModifiedTaskIdsRef.current.add(task._id);

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
    [isProjectClosed, user]
  );

  const deleteTask = useCallback(
    async (task: Task): Promise<{ success: boolean; message?: string }> => {
      const taskId = task._id;
      if (!user) {
        return { success: false, message: "Chưa đăng nhập" };
      }
      if (isProjectClosed) {
        toast.error(closedMessage);
        return { success: false, message: closedMessage };
      }

      try {
        await taskAPI.deleteTask(taskId);

        locallyModifiedTaskIdsRef.current.add(taskId);

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
    [isProjectClosed, user]
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

      const { task, status, order } = params;

      const updatePayload: Record<string, unknown> = {
        status,
        order,
      };

      try {
        const beTask = await taskAPI.updateTask(task._id, updatePayload);
        const updatedTask: Task = {
          ...beTask,
          seq: task.seq,
          completedBy: beTask.status === "completed" ? beTask.assignee : null,
        };

        locallyModifiedTaskIdsRef.current.add(task._id);

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
    [isProjectClosed, user]
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
