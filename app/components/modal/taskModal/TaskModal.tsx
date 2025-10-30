"use client";
import React, { useEffect, useState, useMemo } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import ModalComponent from "../../common/ModalComponent";
import {
  CreateTaskFormValues,
  TaskDetailFormValues,
  Task,
  TaskModalProps,
  TaskMedia,
} from "../../../types/Types";
import { useAuth } from "../../../context/AuthContext";
import { useProject } from "../../../context/ProjectContext";
import { database } from "../../../appwrite";
import toast from "react-hot-toast";
import { Permission, Role } from "appwrite";
import {
  detectMediaTypeFromUrl,
  extractMediaNameFromUrl,
} from "../../../utils/media";
import { uploadFilesToCloudinary } from "../../../utils/upload";
import { useProjectMembers } from "../../../hooks/useProjectMembers";
import TaskModalLeftPanel from "./TaskModalLeftPanel";
import TaskDetailRightPanel from "./TaskDetailRightPanel";

function formatDateForInput(dateString?: string): string {
  if (!dateString) return "";
  return dateString.split("T")[0];
}

const normalizeTaskMedia = (
  mediaList: (TaskMedia | string | null | undefined)[] = []
): TaskMedia[] => {
  return mediaList
    .filter((item): item is TaskMedia | string => Boolean(item))
    .map((item) => {
      if (typeof item === "string") {
        return {
          url: item,
          name: extractMediaNameFromUrl(item),
          type: detectMediaTypeFromUrl(item),
          createdAt: new Date().toISOString(),
        };
      }
      return {
        url: item.url,
        name: item.name ?? extractMediaNameFromUrl(item.url),
        type: item.type ?? detectMediaTypeFromUrl(item.url),
        createdAt: item.createdAt ?? new Date().toISOString(),
      };
    });
};

const getAssigneeId = (a: string | { $id: string; name: string }) =>
  typeof a === "string" ? a : a?.$id || "";

const TaskModal: React.FC<TaskModalProps> = ({
  mode, // "create" | "detail"
  isOpen,
  setIsOpen,
  onCreate,
  onUpdate,
  nextSeq,
  task,
}) => {
  const { user } = useAuth();
  const { currentProject, currentProjectRole } = useProject();
  const currentUserName = user?.name || "";
  const isLeader = currentProjectRole === "leader";
  const [existingUsers, setExistingUsers] = useState<string[]>([]);

  useEffect(() => {
    if (isLeader) {
      database
        .listDocuments(
          String(process.env.NEXT_PUBLIC_DATABASE_ID),
          String(process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE)
        )
        .then((res) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const users = (res.documents as any[]).map((doc) => doc.name);
          setExistingUsers(users);
        })
        .catch(() => {
          toast.error("Không tải được danh sách người dùng");
        });
    }
  }, [isLeader]);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const {
    control,
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { isValid, isSubmitting, dirtyFields, errors },
  } = useForm<CreateTaskFormValues & Partial<TaskDetailFormValues>>({
    defaultValues:
      mode === "create"
        ? {
            issueType: "Feature",
            priority: "Medium",
            assignee: isLeader
              ? ""
              : user
              ? { $id: user.id, name: user.name }
              : "",
            title: "",
            description: "",
            startDate: "",
            endDate: "",
            predictedHours: 0,
            media: [],
          }
        : {
            title: task?.title || "",
            description: task?.description || "",
            assignee: task?.assignee || "",
            startDate: task?.startDate || "",
            endDate: task?.endDate || "",
            predictedHours: task?.predictedHours || 0,
            issueType: task?.issueType || "Feature",
            priority: task?.priority || "Medium",
            media: task?.media || [],
          },
    mode: "onChange",
  });

  const { addMember: addProjectMember, members } = useProjectMembers();

  const watchedAssigneeRaw = watch("assignee");
  const watchedAssigneeId = getAssigneeId(watchedAssigneeRaw);
  const isTaken = Boolean(watchedAssigneeId && watchedAssigneeId !== "");
  const selectedFileNames = useMemo(
    () => selectedFiles.map((file) => file.name),
    [selectedFiles]
  );
  useEffect(() => {
    register("media");
  }, [register]);
  const watchedMedia = watch("media") as (TaskMedia | string)[] | undefined;
  const detailMedia = useMemo(() => {
    if (mode !== "detail") return [];
    const source = watchedMedia ?? task?.media ?? [];
    return normalizeTaskMedia(Array.isArray(source) ? source : []);
  }, [mode, watchedMedia, task?.media]);
  const hasAssigneeDetail = React.useMemo(() => {
    const a = task?.assignee;
    if (!a) return false;
    if (typeof a === "string")
      return a.trim() !== "" && a.trim().toLowerCase() !== "null";
    if (typeof a === "object") {
      return Boolean(a.$id && a.$id.trim() !== "");
    }
    return false;
  }, [task?.assignee]);

  const showReceive =
    mode === "detail" && !isLeader && !hasAssigneeDetail && !watchedAssigneeId;

  const handleAddMember = async (newMemberName: string) => {
    const result = await addProjectMember(newMemberName);
    if (result.success) {
      toast.success(result.message);
      setValue("assignee", newMemberName.trim(), { shouldDirty: true });
    } else {
      toast.error(result.message);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    if (mode === "create") {
      reset({
        issueType: "Feature",
        priority: "Medium",
        assignee: "",
        title: "",
        description: "",
        startDate: "",
        endDate: "",
        predictedHours: 0,
        media: [],
      });
      setSelectedFiles([]);
      setValue("media", []);
    } else if (task) {
      const normalized = normalizeTaskMedia(task.media ?? []);
      reset({
        title: task.title,
        description: task.description,
        assignee: task.assignee || "",
        startDate: formatDateForInput(task.startDate ?? ""),
        endDate: formatDateForInput(task.endDate ?? ""),
        predictedHours: task.predictedHours,
        issueType: task.issueType,
        priority: task.priority,
        media: normalized,
      });
      setSelectedFiles([]);
      setValue("media", normalized);
    }
  }, [isOpen, mode, task, reset, setValue]);

  const handleReceive = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!task || !user) return;
    try {
      await database.updateDocument(
        String(process.env.NEXT_PUBLIC_DATABASE_ID),
        String(process.env.NEXT_PUBLIC_COLLECTION_ID_TASKS),
        task.id,
        { assignee: user.id }
      );
      setValue(
        "assignee",
        { $id: user.id, name: user.name },
        { shouldDirty: false }
      );
      if (onUpdate) {
        onUpdate({ ...task, assignee: { $id: user.id, name: user.name } });
      }
      toast.success("Nhận task thành công");
    } catch (err) {
      const message =
        typeof err === "object" &&
        err &&
        "message" in (err as Record<string, unknown>)
          ? String((err as { message?: unknown }).message)
          : "Nhận task thất bại";
      toast.error(message);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      event.target.value = "";
      return;
    }
    const fileList = Array.from(files);
    setSelectedFiles((prev) => [...prev, ...fileList]);
    event.target.value = "";
  };

  const handleRemoveFile = (name: string) => {
    setSelectedFiles((prev) => prev.filter((file) => file.name !== name));
  };

  const uploadSelectedFiles = async (): Promise<TaskMedia[]> => {
    if (selectedFiles.length === 0) return [];
    const uploaded = await uploadFilesToCloudinary(selectedFiles);
    return uploaded.map((item) => ({
      url: item.url,
      name: item.name,
      type: item.type === "file" ? "unknown" : item.type,
      createdAt: new Date().toISOString(),
    }));
  };

  const onSubmitCreate: SubmitHandler<CreateTaskFormValues> = async (data) => {
    if (!isValid) return;
    let mediaItems: TaskMedia[] = [];
    try {
      mediaItems = await uploadSelectedFiles();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Upload ảnh thất bại";
      toast.error(message);
      return;
    }

    const baseTaskFields = {
      seq: nextSeq!,
      title: data.title,
      description: data.description,
      status: "list" as const,
      order: 0,
      startDate: data.startDate.trim() === "" ? null : data.startDate,
      endDate: data.endDate.trim() === "" ? null : data.endDate,
      predictedHours: data.predictedHours,
      issueType: data.issueType!,
      priority: data.priority!,
      projectId: currentProject ? currentProject.$id : "",
      projectName: currentProject ? currentProject.name : "",
      completedBy: user!.id,
      media: mediaItems,
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
      attachedFile: mediaItems.map((m) => m.url),
      media: undefined,
      ...(assigneeProfile ? { assignee: assigneeProfile.$id } : {}),
      completedBy: user!.id,
    } as Record<string, unknown>;

    try {
      const created = await database.createDocument(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_TASKS!,
        "unique()",
        payloadForAppwrite,
        [
          Permission.read(Role.any()),
          Permission.update(Role.user(user!.id)),
          Permission.delete(Role.user(user!.id)),
        ]
      );
      toast.success("Tạo Task thành công");
      const createdId = (created as unknown as { $id: string }).$id;
      const newTask: Task = {
        id: createdId,
        ...baseTaskFields,
        assignee: assigneeProfile,
      };
      onCreate!(newTask);
      setSelectedFiles([]);
      setValue("media", mediaItems);
      setIsOpen(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      toast.error(e.message || "Tạo Task thất bại");
    }
  };

  const onSubmitDetail: SubmitHandler<TaskDetailFormValues> = async (data) => {
    if (!task) return;
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
      setIsOpen(false);
      return;
    }

    try {
      await database.updateDocument(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_TASKS!,
        task.id,
        updatedFields
      );
      toast.success("Cập nhật Task thành công");
      if (onUpdate) {
        onUpdate({ ...task, ...updatedFields });
      }
      setIsOpen(false);
    } catch (e) {
      const err = e as { message?: string };
      console.error("Lỗi cập nhật:", e);
      toast.error(err?.message || "Cập nhật Task thất bại");
    }
  };

  const showAttachmentSection = mode === "create";
  const showReceiveButton = showReceive && !watchedAssigneeId;

  const leftPanel = (
    <TaskModalLeftPanel
      mode={mode}
      handleSubmit={handleSubmit}
      onSubmitCreate={onSubmitCreate}
      onSubmitDetail={onSubmitDetail}
      register={register}
      errors={errors}
      control={control}
      isLeader={isLeader}
      currentProject={currentProject}
      existingUsers={existingUsers}
      userName={currentUserName}
      handleAddMember={handleAddMember}
      selectedFiles={selectedFiles}
      selectedFileNames={selectedFileNames}
      handleFileChange={handleFileChange}
      handleRemoveFile={handleRemoveFile}
      showAttachmentSection={showAttachmentSection}
      showReceiveButton={showReceiveButton}
      handleReceive={handleReceive}
      isSubmitting={isSubmitting}
      isValid={isValid}
      dirtyFields={dirtyFields}
      isTaken={isTaken}
      task={task ?? null}
      onUpdate={onUpdate}
      reset={reset}
    />
  );

  return (
    <ModalComponent
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      onClose={() => setIsOpen(false)}
      title={
        mode === "create"
          ? `Tạo Task #${nextSeq}`
          : `Chi tiết Task #${task?.seq}`
      }
      panelClassName={
        mode === "detail" && task?.id !== "guideTask"
          ? "w-full max-w-6xl xl:max-w-7xl"
          : undefined
      }
    >
      {mode === "detail" && task?.id !== "guideTask" ? (
        <div className="grid h-[75vh] gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,1fr)]">
          <div className="max-h-[75vh] overflow-y-auto pr-4 no-scrollbar">
            {leftPanel}
          </div>
          <TaskDetailRightPanel
            media={detailMedia}
            taskId={task?.id}
            assignee={task?.assignee}
            className="max-h-[75vh]"
          />
        </div>
      ) : (
        leftPanel
      )}
    </ModalComponent>
  );
};

export default TaskModal;
