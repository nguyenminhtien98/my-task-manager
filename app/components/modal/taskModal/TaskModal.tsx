"use client";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import ModalComponent from "../../common/ModalComponent";
import {
  CreateTaskFormValues,
  TaskDetailFormValues,
  TaskModalProps,
  TaskAttachment,
} from "../../../types/Types";
import { useAuth } from "../../../context/AuthContext";
import { useProject } from "../../../context/ProjectContext";
import toast from "react-hot-toast";
import {
  detectMediaTypeFromUrl,
  extractMediaNameFromUrl,
} from "../../../utils/media";
import {
  MAX_UPLOAD_SIZE_BYTES,
  MAX_UPLOAD_SIZE_LABEL,
  getUploadFileLabel,
} from "../../../utils/upload";
import { useProjectOperations } from "../../../hooks/useProjectOperations";
import { useTask } from "../../../hooks/useTask";
import TaskModalLeftPanel from "./TaskModalLeftPanel";
import TaskDetailRightPanel from "./TaskDetailRightPanel";

function formatDateForInput(dateString?: string): string {
  if (!dateString) return "";
  return dateString.split("T")[0];
}

const normalizeAttachments = (
  attachmentList: (TaskAttachment | string | { url: string; name: string; type: string; createdAt: string } | null | undefined)[] = []
): TaskAttachment[] =>
  attachmentList
    .filter((item): item is TaskAttachment | string | { url: string; name: string; type: string; createdAt: string } => Boolean(item))
    .map((item) => {
      if (typeof item === "string") {
        return {
          url: item,
          name: extractMediaNameFromUrl(item),
          type: detectMediaTypeFromUrl(item),
          createdAt: new Date().toISOString(),
        };
      }
      const resolvedType =
        item.type === "image" || item.type === "video" || item.type === "file"
          ? item.type
          : detectMediaTypeFromUrl(item.url);
      return {
        url: item.url,
        name: item.name ?? extractMediaNameFromUrl(item.url),
        type: resolvedType,
        createdAt: item.createdAt ?? new Date().toISOString(),
      };
    });

const getAssigneeId = (a: string | { _id: string; name: string }) =>
  typeof a === "string" ? a : a?._id || "";

const TaskModal: React.FC<TaskModalProps> = ({
  mode, // "create" | "detail"
  isOpen,
  setIsOpen,
  onCreate,
  onUpdate,
  onDelete,
  nextSeq,
  task,
}) => {
  const { user } = useAuth();
  const { currentProject, currentProjectRole, isProjectClosed } = useProject();
  const currentUserName = user?.name || "";
  const isLeader = currentProjectRole === "leader";
  const { members: projectMembers } = useProjectOperations();
  const existingUsers = useMemo(
    () => projectMembers.map((m) => m.name),
    [projectMembers]
  );
  const initialAttachments = useMemo(
    () => normalizeAttachments(task?.attachments ?? []),
    [task?.attachments]
  );

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
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
          issueType: "feature",
          priority: "medium",
          assignee: isLeader
            ? ""
            : user
              ? { _id: user.id, name: user.name }
              : "",
          title: "",
          description: "",
          startDate: "",
          endDate: "",
          predictedHours: 0,
          attachments: [] as TaskAttachment[],
        }
        : {
          title: task?.title || "",
          description: task?.description || "",
          assignee: task?.assignee || "",
          startDate: task?.startDate || "",
          endDate: task?.endDate || "",
          predictedHours: task?.predictedHours || 0,
          issueType: task?.issueType || "feature",
          priority: task?.priority || "medium",
          attachments: initialAttachments,
        },
    mode: "onChange",
  });

  const { addMember: addProjectMember } = useProjectOperations();
  const { createTask, updateTask, receiveTask, deleteTask } = useTask();

  const watchedAssigneeRaw = watch("assignee");
  const watchedAssigneeId = getAssigneeId(watchedAssigneeRaw);
  const isTaken = Boolean(watchedAssigneeId && watchedAssigneeId !== "");
  const selectedFileNames = useMemo(
    () => selectedFiles.map((file) => file.name),
    [selectedFiles]
  );
  useEffect(() => {
    register("attachments");
  }, [register]);
  const watchedAttachments = watch("attachments") as
    | TaskAttachment[]
    | undefined;
  const detailAttachments = useMemo(() => {
    if (mode !== "detail") return [];
    const source = watchedAttachments ?? task?.attachments ?? [];
    return normalizeAttachments(Array.isArray(source) ? source : []);
  }, [mode, watchedAttachments, task?.attachments]);
  const hasAssigneeDetail = React.useMemo(() => {
    const a = task?.assignee;
    if (!a) return false;
    if (typeof a === "object") {
      return Boolean(a._id && a._id.trim() !== "");
    }
    return false;
  }, [task?.assignee]);

  const canDeleteTask = useMemo(() => {
    if (!task || !user || mode !== "detail") return false;
    if (task.status === "completed") return false;
    if (isLeader) return true;
    const completed = task.completedBy as unknown;
    if (!completed) return false;
    if (typeof completed === "string") {
      return completed === user.id;
    }
    if (typeof completed === "object" && completed !== null) {
      const maybeProfile = completed as { _id?: string };
      return maybeProfile._id === user.id;
    }
    return false;
  }, [isLeader, mode, task, user]);

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

  const handleDeleteTask = useCallback(async () => {
    if (!task || isDeleting) return;
    setIsDeleting(true);
    const result = await deleteTask(task);
    setIsDeleting(false);
    if (result.success) {
      if (onDelete) {
        onDelete(task);
      }
      setIsOpen(false);
    }
  }, [deleteTask, isDeleting, onDelete, setIsOpen, task]);

  useEffect(() => {
    if (!isOpen) return;
    if (mode === "create") {
      reset({
        issueType: "feature",
        priority: "medium",
        assignee: "",
        title: "",
        description: "",
        startDate: "",
        endDate: "",
        predictedHours: 0,
        attachments: [] as TaskAttachment[],
      });
      setSelectedFiles([]);
      setValue("attachments", []);
    } else if (task) {
      const normalized = normalizeAttachments(task.attachments ?? []);
      reset({
        title: task.title,
        description: task.description,
        assignee: task.assignee || "",
        startDate: formatDateForInput(task.startDate ?? ""),
        endDate: formatDateForInput(task.endDate ?? ""),
        predictedHours: task.predictedHours,
        issueType: task.issueType,
        priority: task.priority,
        attachments: normalized,
      });
      setSelectedFiles([]);
      setValue("attachments", normalized);
    }
  }, [isOpen, mode, task, reset, setValue]);

  const handleReceive = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!task || !user || isProjectClosed) return;

    const result = await receiveTask({ task });
    if (result.success && result.task) {
      setValue(
        "assignee",
        { _id: user.id, name: user.name },
        { shouldDirty: false }
      );
      if (onUpdate) {
        onUpdate(result.task);
      }
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      event.target.value = "";
      return;
    }
    const fileList = Array.from(files);
    const validFiles: File[] = [];
    const invalidLabels = new Set<string>();

    fileList.forEach((file) => {
      if (file.size > MAX_UPLOAD_SIZE_BYTES) {
        invalidLabels.add(getUploadFileLabel(file));
      } else {
        validFiles.push(file);
      }
    });

    invalidLabels.forEach((label) => {
      toast.error(
        `${label} bạn chọn có kích thước > ${MAX_UPLOAD_SIZE_LABEL}. Vui lòng chọn ${label.toLowerCase()} < ${MAX_UPLOAD_SIZE_LABEL}.`
      );
    });

    if (validFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validFiles]);
    }
    event.target.value = "";
  };

  const handleRemoveFile = (name: string) => {
    setSelectedFiles((prev) => prev.filter((file) => file.name !== name));
  };

  const onSubmitCreate: SubmitHandler<CreateTaskFormValues> = async (data) => {
    if (!isValid || !nextSeq) return;

    const result = await createTask({
      data,
      nextSeq,
      selectedFiles,
      isLeader,
      members: projectMembers,
    });

    if (result.success && result.task) {
      onCreate!(result.task);
      setSelectedFiles([]);
      setValue("attachments", result.task.attachments as TaskAttachment[]);
      setIsOpen(false);
    }
  };

  const onSubmitDetail: SubmitHandler<TaskDetailFormValues> = async (data) => {
    if (!task) return;

    const result = await updateTask({ task, data });

    if (result.success) {
      if (result.task && onUpdate) {
        onUpdate(result.task);
      }
      setIsOpen(false);
    }
  };

  const showAttachmentSection = mode === "create";
  const showReceiveButton = showReceive && !watchedAssigneeId && !isProjectClosed;
  const submitHandler = handleSubmit((values, event) => {
    if (mode === "create") {
      return onSubmitCreate(values as CreateTaskFormValues, event);
    }
    return onSubmitDetail(values as TaskDetailFormValues, event);
  });

  const leftPanel = (
    <TaskModalLeftPanel
      mode={mode}
      onSubmit={submitHandler}
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
      isProjectClosed={isProjectClosed}
      canDeleteTask={canDeleteTask}
      onDeleteTask={handleDeleteTask}
      isDeleting={isDeleting}
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
        mode === "detail" && task?._id !== "guideTask"
          ? "w-full max-w-6xl xl:max-w-7xl"
          : undefined
      }
    >
      {mode === "detail" && task?._id !== "guideTask" ? (
        <div className="grid h-[75vh] gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,1fr)]">
          <div className="max-h-[75vh] overflow-y-auto pr-4 no-scrollbar">
            {leftPanel}
          </div>
          <TaskDetailRightPanel
            attachments={detailAttachments}
            taskId={task?._id}
            taskTitle={task?.title}
            assignee={(task?.assignee ?? undefined) as string | { _id: string; name: string } | undefined}
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
