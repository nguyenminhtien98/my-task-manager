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
import { v4 as uuidv4 } from "uuid";
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
    // Nếu là leader, fetch danh sách user từ collection Profile
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
        trigger,
        formState: { isValid, isSubmitting, dirtyFields, errors },
    } = useForm<CreateTaskFormValues & Partial<TaskDetailFormValues>>({
        defaultValues:
            mode === "create"
                ? {
                    issueType: "Feature",
                    priority: "Medium",
                    assignee: "",
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

    const { addMember: addProjectMember } = useProjectMembers();

    const watchedAssignee = watch("assignee");
    const selectedFileNames = useMemo(() => selectedFiles.map(file => file.name), [selectedFiles]);
    useEffect(() => {
        register("media");
    }, [register]);
    const watchedMedia = watch("media") as (TaskMedia | string)[] | undefined;
    const detailMedia = useMemo(() => {
        if (mode !== "detail") return [];
        const source = watchedMedia ?? (task?.media ?? []);
        return normalizeTaskMedia(Array.isArray(source) ? source : []);
    }, [mode, watchedMedia, task?.media]);
    const isTaken = watchedAssignee.trim() !== "";
    const initialAssignee = mode === "detail" ? task?.assignee || "" : "";

    // Nếu ở mode "detail" và task chưa được nhận, hiển thị nút "Nhận Task"
    const showReceive =
        mode === "detail" && !isLeader && initialAssignee === "" && !watchedAssignee;

    // Hàm handleAddMember: gọi hook để thêm member mới
    const handleAddMember = async (newMemberName: string) => {
        const result = await addProjectMember(newMemberName);
        if (result.success) {
            toast.success(result.message);
            const canonical = result.canonicalName ?? newMemberName.trim();
            setValue("assignee", canonical, { shouldDirty: true });
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

    // Xử lý "Nhận Task" cho mode "detail"
    const handleReceive = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const valid = await trigger(["startDate", "endDate", "predictedHours"]);
        if (!valid) return;
        setValue("assignee", currentUserName, { shouldDirty: true });
        console.log("Giá trị assignee sau handleReceive:", watch("assignee"));
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
        setSelectedFiles((prev) => prev.filter(file => file.name !== name));
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

    // Submit cho mode "create"
    const onSubmitCreate: SubmitHandler<CreateTaskFormValues> = async (data) => {
        if (!isValid) return;
        if (!isLeader && (!data.startDate || !data.endDate || data.predictedHours == null)) {
            return;
        }
        let mediaItems: TaskMedia[] = [];
        try {
            mediaItems = await uploadSelectedFiles();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Upload ảnh thất bại";
            toast.error(message);
            return;
        }

        // Tạo object task để dùng nội bộ (vẫn giữ đầy đủ object media cho UI)
        const newTask: Task = {
            id: uuidv4(),
            seq: nextSeq!,
            title: data.title,
            description: data.description,
            assignee: isLeader ? (data.assignee || currentUserName) : user!.name,
            status: "list",
            order: 0,
            startDate: data.startDate.trim() === "" ? null : data.startDate,
            endDate: data.endDate.trim() === "" ? null : data.endDate,
            predictedHours: data.predictedHours,
            issueType: data.issueType!,
            priority: data.priority!,
            projectId: currentProject ? currentProject.id : "",
            projectName: currentProject ? currentProject.name : "",
            media: mediaItems,
        };

        const payloadForAppwrite = {
            ...newTask,
            media: mediaItems.map((m) => m.url),
        };

        try {
            await database.createDocument(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_TASKS!,
                newTask.id,
                payloadForAppwrite,
                [
                    Permission.read(Role.any()),
                    Permission.update(Role.user(user!.id)),
                    Permission.delete(Role.user(user!.id)),
                ]
            );
            toast.success("Tạo Task thành công");
            onCreate!(newTask);
            setSelectedFiles([]);
            setValue("media", mediaItems);
            setIsOpen(false);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
            toast.error(e.message || "Tạo Task thất bại");
        }
    };

    // Submit cho mode "detail" (Cập nhật Task)
    const onSubmitDetail: SubmitHandler<TaskDetailFormValues> = async (data) => {
        if (!task) return;
        const isTaskTaken = data.assignee.trim() !== "";
        const updatedFields: Partial<Task> = {
            title: task.title,
            description: task.description,
            assignee: task.assignee === "" ? data.assignee : task.assignee,
            issueType: task.issueType,
            priority: task.priority,
            startDate: !isTaskTaken || task.status === "completed" ? task.startDate : data.startDate,
            endDate: !isTaskTaken || task.status === "completed" ? task.endDate : data.endDate,
            predictedHours: !isTaskTaken || task.status === "completed" ? task.predictedHours : data.predictedHours,
            status: task.status,
            seq: task.seq,
        };

        try {
            await database.updateDocument(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_TASKS!,
                task.id,
                updatedFields
            );
            toast.success("Cập nhật Task thành công");
            onUpdate!({ ...task, ...updatedFields });
            setIsOpen(false);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
            console.error("Lỗi cập nhật:", e);
            toast.error(e.message || "Cập nhật Task thất bại");
        }
    };



    const showAttachmentSection = mode === "create";
    const showReceiveButton = showReceive && !watchedAssignee;

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
        />
    );

    return (
        <ModalComponent
            isOpen={isOpen}
            setIsOpen={setIsOpen}
            onClose={() => setIsOpen(false)}
            title={mode === "create" ? `Tạo Task #${nextSeq}` : `Chi tiết Task #${task?.seq}`}
            panelClassName={mode === "detail" ? "w-full max-w-6xl xl:max-w-7xl" : undefined}
        >
            {mode === "detail" ? (
                <div className="grid h-[75vh] gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,1fr)]">
                    <div className="max-h-[75vh] overflow-y-auto pr-4 no-scrollbar">
                        {leftPanel}
                    </div>
                    <TaskDetailRightPanel
                        media={detailMedia}
                        taskId={task?.id}
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
