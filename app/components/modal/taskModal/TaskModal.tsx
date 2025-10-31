"use client";
import React, { useEffect, useState, useMemo } from "react";
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
import { database } from "../../../appwrite";
import toast from "react-hot-toast";
import {
  detectMediaTypeFromUrl,
  extractMediaNameFromUrl,
} from "../../../utils/media";
import { useProjectOperations } from "../../../hooks/useProjectOperations";
import { useTask } from "../../../hooks/useTask";
import TaskModalLeftPanel from "./TaskModalLeftPanel";
import TaskDetailRightPanel from "./TaskDetailRightPanel";

function formatDateForInput(dateString?: string): string {
  if (!dateString) return "";
  return dateString.split("T")[0];
}

const normalizeAttachments = (
  attachmentList: (TaskAttachment | string | null | undefined)[] = []
): TaskAttachment[] =>
  attachmentList
    .filter((item): item is TaskAttachment | string => Boolean(item))
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
  const initialAttachments = useMemo(
    () => normalizeAttachments(task?.attachedFile ?? []),
    [task?.attachedFile]
  );

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
            attachments: [] as TaskAttachment[],
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
            attachments: initialAttachments,
          },
    mode: "onChange",
  });

  const { addMember: addProjectMember, members } = useProjectOperations();
  const { createTask, updateTask, receiveTask } = useTask();

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
    const source = watchedAttachments ?? task?.attachedFile ?? [];
    return normalizeAttachments(Array.isArray(source) ? source : []);
  }, [mode, watchedAttachments, task?.attachedFile]);
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
        attachments: [] as TaskAttachment[],
      });
      setSelectedFiles([]);
      setValue("attachments", []);
    } else if (task) {
      const normalized = normalizeAttachments(task.attachedFile ?? []);
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
    if (!task || !user) return;

    const result = await receiveTask({ task });
    if (result.success && result.task) {
      setValue(
        "assignee",
        { $id: user.id, name: user.name },
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
    setSelectedFiles((prev) => [...prev, ...fileList]);
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
      members,
    });

    if (result.success && result.task) {
      onCreate!(result.task);
      setSelectedFiles([]);
      setValue("attachments", result.task.attachedFile as TaskAttachment[]);
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
  const showReceiveButton = showReceive && !watchedAssigneeId;
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
            attachments={detailAttachments}
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
