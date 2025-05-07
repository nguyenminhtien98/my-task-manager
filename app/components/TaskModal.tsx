"use client";

import React, { useEffect, useState } from "react";
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import ModalComponent from "./ModalComponent";
import {
    CreateTaskFormValues,
    TaskDetailFormValues,
    Task,
    TaskModalProps,
    IssueType,
    Priority,
} from "../types/taskTypes";
import PriorityDropdown from "./CutomDropdown/PriorityDropdown";
import IssueTypeDropdown from "./CutomDropdown/IssueTypeDropdown";
import AssigneeDropdown from "./CutomDropdown/AssigneeDropdown";
import { useAuth } from "../context/AuthContext";
import { database } from "../appwrite";
import toast from "react-hot-toast";
import { Permission, Role } from "appwrite";
import { v4 as uuidv4 } from "uuid";

function formatDateForInput(dateString?: string): string {
    if (!dateString) return "";
    return dateString.split("T")[0];
}

export default function TaskModal({
    mode, // 'create' | 'detail'
    isOpen,
    setIsOpen,
    onCreate,
    onUpdate,
    nextSeq,
    task,
}: TaskModalProps) {
    const { user } = useAuth();
    const currentUserName = user?.name || "";
    const isLeader = user?.role === "leader";

    const disableDropdown =
        mode === "detail" &&
        (!task?.assignee || task?.assignee === currentUserName);

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
                },
        mode: "onChange",
    });

    const watchedAssignee = watch("assignee");
    const isTaken = watchedAssignee.trim() !== "";
    const initialAssignee = mode === "detail" ? task?.assignee || "" : "";

    // Nút "Nhận Task" hiển thị nếu ở mode detail, không phải leader, và task chưa có assignee ban đầu
    const showReceive =
        mode === "detail" && !isLeader && initialAssignee === "" && !watchedAssignee;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const canEditTimeFields =
        mode === "detail" && watchedAssignee.trim() !== "" && task?.status !== "completed";

    const hasChanged =
        mode === "create"
            ? Object.keys(dirtyFields).length > 0
            : watchedAssignee !== initialAssignee || Object.keys(dirtyFields).length > 0;
    const canSubmit = isValid && hasChanged;
    const [profiles, setProfiles] = useState<{ user_id: string; name: string }[]>(
        []
    );

    useEffect(() => {
        if (isLeader) {
            database
                .listDocuments(
                    process.env.NEXT_PUBLIC_DATABASE_ID!,
                    process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE!
                )
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .then((r) => setProfiles(r.documents as any))
                .catch(() => toast.error("Không tải được danh sách người dùng"));
        }
    }, [isLeader]);

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
            });
        } else if (task) {
            reset({
                title: task.title,
                description: task.description,
                assignee: task.assignee || "",
                startDate: formatDateForInput(task.startDate ?? ""),
                endDate: formatDateForInput(task.endDate ?? ""),
                predictedHours: task.predictedHours,
                issueType: task.issueType,
                priority: task.priority,
            });
        }
    }, [isOpen, mode, task, reset]);

    // Xử lý khi nhấn "Nhận Task"
    const handleReceive = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const valid = await trigger(["startDate", "endDate", "predictedHours"]);
        if (!valid) return;
        // Sau khi nhận, set assignee = currentUserName
        setValue("assignee", currentUserName, { shouldDirty: true });
        console.log("Giá trị assignee sau handleReceive:", watch("assignee"));
    };

    // Submit cho mode "create"
    const onSubmitCreate: SubmitHandler<CreateTaskFormValues> = async (data) => {
        if (!isValid) return;
        if (!isLeader && (!data.startDate || !data.endDate || data.predictedHours == null)) {
            return;
        }
        const newTask: Task = {
            id: uuidv4(),
            seq: nextSeq!,
            title: data.title,
            description: data.description,
            assignee: isLeader ? data.assignee || "" : user!.name,
            status: "list",
            order: 0,
            startDate: data.startDate.trim() === "" ? null : data.startDate,
            endDate: data.endDate.trim() === "" ? null : data.endDate,
            predictedHours: data.predictedHours,
            issueType: data.issueType!,
            priority: data.priority!,
        };
        try {
            await database.createDocument(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_COLLECTION_ID_TASKS!,
                newTask.id,
                newTask,
                [
                    Permission.read(Role.any()),
                    Permission.update(Role.user(user!.id)),
                    Permission.delete(Role.user(user!.id)),
                ]
            );
            toast.success("Tạo Task thành công");
            onCreate!(newTask);
            setIsOpen(false);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
            toast.error(e.message || "Tạo Task thất bại");
        }
    };

    // Submit cho mode "detail" (Update Task)
    const onSubmitDetail: SubmitHandler<TaskDetailFormValues> = async (data) => {
        if (!task) return;
        // Kiểm tra xem đã nhận task hay chưa dựa trên form
        const isTaskTaken = data.assignee.trim() !== "";
        const updatedFields: Partial<Task> = {
            title: task.title,
            description: task.description,
            assignee: task.assignee === "" ? data.assignee : task.assignee,
            issueType: task.issueType,
            priority: task.priority,
            // Nếu đã nhận task và task chưa hoàn thành, cho phép update 3 field:
            startDate:
                !isTaskTaken || task.status === "completed" ? task.startDate : data.startDate,
            endDate:
                !isTaskTaken || task.status === "completed" ? task.endDate : data.endDate,
            predictedHours:
                !isTaskTaken || task.status === "completed" ? task.predictedHours : data.predictedHours,
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

    return (
        <ModalComponent
            isOpen={isOpen}
            setIsOpen={setIsOpen}
            title={mode === "create" ? `Tạo Task #${nextSeq}` : `Chi tiết Task #${task?.seq}`}
        >
            <form
                onSubmit={handleSubmit(mode === "create" ? onSubmitCreate : onSubmitDetail)}
                className="space-y-4"
            >
                <div>
                    <label className="block text-sm font-medium">Tiêu đề</label>
                    <input
                        placeholder="Nhập tiêu đề"
                        {...register("title", {
                            required: "Tiêu đề không được để trống",
                        })}
                        disabled={mode === "detail"} // luôn disable ở mode detail
                        className="mt-1 w-full p-2 border border-gray-300 rounded"
                    />
                    {errors.title && (
                        <p className="text-red-500 text-sm">{errors.title.message}</p>
                    )}
                </div>
                <div>
                    <label className="block text-sm font-medium">Nội dung chi tiết</label>
                    <textarea
                        placeholder="Mô tả chi tiết"
                        {...register("description", {
                            required: "Nội dung không được để trống",
                        })}
                        disabled={mode === "detail"}
                        className="mt-1 w-full p-2 border border-gray-300 rounded"
                    />
                    {errors.description && (
                        <p className="text-red-500 text-sm">{errors.description.message}</p>
                    )}
                </div>
                <div className="flex gap-4">
                    <div className="flex-1">
                        <label className="mb-1 block text-sm font-medium">Issue Type</label>
                        <Controller
                            control={control}
                            name="issueType"
                            render={({ field }) => (
                                <IssueTypeDropdown
                                    value={field.value!}
                                    onChange={(v) => field.onChange(v as IssueType)}
                                    disabled={disableDropdown}
                                />
                            )}
                        />
                    </div>
                    <div className="flex-1">
                        <label className="mb-1 block text-sm font-medium">Priority</label>
                        <Controller
                            control={control}
                            name="priority"
                            render={({ field }) => (
                                <PriorityDropdown
                                    value={field.value!}
                                    onChange={(v) => field.onChange(v as Priority)}
                                    disabled={disableDropdown}
                                />
                            )}
                        />
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="mb-1 block text-sm font-medium">Người thực hiện</label>
                        {mode === "create" ? (
                            isLeader ? (
                                <Controller
                                    control={control}
                                    name="assignee"
                                    render={({ field }) => (
                                        <AssigneeDropdown
                                            value={field.value!}
                                            options={profiles.map((p) => p.name)}
                                            onChange={(v) => field.onChange(v)}
                                        />
                                    )}
                                />
                            ) : (
                                <input
                                    value={user?.name}
                                    disabled
                                    className="w-full p-2 border border-gray-300 rounded bg-gray-100"
                                />
                            )
                        ) : (
                            <input
                                {...register("assignee")}
                                disabled
                                placeholder="Chưa set"
                                className="w-full p-2 border border-gray-300 rounded bg-gray-100"
                            />
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium">
                            Giờ dự kiến (h)
                        </label>
                        <input
                            type="number"
                            placeholder="Số giờ"
                            {...register("predictedHours", {
                                required:
                                    (mode === "create" && !isLeader) ||
                                        (mode === "detail" && isTaken)
                                        ? "Phải nhập giờ dự kiến"
                                        : false,
                                valueAsNumber: true,
                            })}
                            disabled={mode === "detail" ? (!isTaken || task?.status === "completed") : false}
                            className="mt-1 w-full p-2 border border-gray-300 rounded"
                        />
                        {errors.predictedHours && (
                            <p className="text-red-500 text-sm">
                                {errors.predictedHours.message}
                            </p>
                        )}
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium">Ngày bắt đầu</label>
                        <input
                            type="date"
                            {...register("startDate", {
                                required:
                                    (mode === "create" && !isLeader) ||
                                        (mode === "detail" && isTaken)
                                        ? "Phải chọn ngày bắt đầu"
                                        : false,
                            })}
                            disabled={mode === "detail" ? (!isTaken || task?.status === "completed") : false}
                            className="mt-1 w-full p-2 border border-gray-300 rounded"
                        />
                        {errors.startDate && (
                            <p className="text-red-500 text-sm">
                                {errors.startDate.message}
                            </p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Ngày kết thúc</label>
                        <input
                            type="date"
                            {...register("endDate", {
                                required:
                                    (mode === "create" && !isLeader) ||
                                        (mode === "detail" && isTaken)
                                        ? "Phải chọn ngày kết thúc"
                                        : false,
                            })}
                            disabled={mode === "detail" ? (!isTaken || task?.status === "completed") : false}
                            className="mt-1 w-full p-2 border border-gray-300 rounded"
                        />
                        {errors.endDate && (
                            <p className="text-red-500 text-sm">
                                {errors.endDate.message}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex justify-end space-x-4">
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="cursor-pointer px-4 py-2 bg-gray-300 rounded"
                    >
                        {mode === "create" ? "Hủy" : "Đóng"}
                    </button>

                    {showReceive && !watchedAssignee ? (
                        <button
                            type="button"
                            onClick={handleReceive}
                            className="cursor-pointer px-4 py-2 bg-green-500 text-white rounded"
                        >
                            Nhận Task
                        </button>
                    ) : (
                        ((mode === "create") || (mode === "detail" && hasChanged)) && (
                            <button
                                type="submit"
                                disabled={isSubmitting || !canSubmit}
                                className={`px-4 py-2 text-white rounded ${isSubmitting || !canSubmit
                                    ? "bg-gray-400 cursor-not-allowed"
                                    : "bg-blue-600 hover:bg-blue-700"
                                    }`}
                            >
                                {isSubmitting
                                    ? (mode === "create" ? "Đang tạo..." : "Đang lưu...")
                                    : (mode === "create" ? "Tạo" : "Lưu")}
                            </button>
                        )
                    )}
                </div>
            </form>
        </ModalComponent>
    );
}
