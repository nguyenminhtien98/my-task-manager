"use client";

import React, { useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import ModalComponent from "./ModalComponent";
import { TaskDetailFormValues, TaskDetailModalProps } from "../types/taskTypes";

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
    isOpen,
    setIsOpen,
    task,
    onUpdate,
    isLeader,
    currentUser,
}) => {
    const {
        register,
        handleSubmit,
        reset,
        formState: { dirtyFields },
    } = useForm<TaskDetailFormValues>({
        defaultValues: {
            title: "",
            description: "",
            assignee: "",
            startDate: "",
            endDate: "",
            predictedHours: 0,
        },
    });

    useEffect(() => {
        if (isOpen && task) {
            reset({
                title: task.title,
                description: task.description,
                assignee: task.assignee || "",
                startDate: task.startDate || "",
                endDate: task.endDate || "",
                predictedHours: task.predictedHours || 0,
            });
        }
    }, [isOpen, task, reset]);

    if (!task) return null;

    const editableFull = isLeader && task.status !== "completed";
    const editableDates = (isLeader || currentUser === task.assignee) && task.status !== "completed";
    const canEdit = editableFull || editableDates;

    const onSubmit: SubmitHandler<TaskDetailFormValues> = (data) => {
        const updatedTask = {
            ...task,
            title: editableFull ? data.title : task.title,
            description: editableFull ? data.description : task.description,
            assignee: editableFull ? data.assignee : task.assignee,
            startDate: editableDates ? data.startDate : task.startDate,
            endDate: editableDates ? data.endDate : task.endDate,
            predictedHours: editableDates ? data.predictedHours : task.predictedHours,
        };
        onUpdate(updatedTask);
        setIsOpen(false);
    };

    return (
        <ModalComponent isOpen={isOpen} setIsOpen={setIsOpen} title={`Chi tiết Task #${task.seq}`}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Tiêu đề</label>
                    <input
                        type="text"
                        {...register("title", { required: true })}
                        disabled={!editableFull}
                        className="mt-1 block w-full rounded border-gray-300 shadow-sm"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Nội dung chi tiết</label>
                    <textarea
                        {...register("description", { required: true })}
                        disabled={!editableFull}
                        className="mt-1 block w-full rounded border-gray-300 shadow-sm"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Người thực hiện</label>
                    <input
                        type="text"
                        {...register("assignee", { required: true })}
                        disabled={!editableFull}
                        className="mt-1 block w-full rounded border-gray-300 shadow-sm"
                    />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Ngày bắt đầu</label>
                        <input
                            type="date"
                            {...register("startDate", { required: true })}
                            disabled={!editableDates}
                            className="mt-1 block w-full rounded border-gray-300 shadow-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Ngày kết thúc</label>
                        <input
                            type="date"
                            {...register("endDate", { required: true })}
                            disabled={!editableDates}
                            className="mt-1 block w-full rounded border-gray-300 shadow-sm"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Số giờ dự kiến hoàn thành</label>
                    <input
                        type="number"
                        {...register("predictedHours", { valueAsNumber: true })}
                        disabled={!editableDates}
                        className="mt-1 block w-full rounded border-gray-300 shadow-sm"
                    />
                </div>
                <div className="flex justify-end space-x-4">
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="px-4 py-2 bg-gray-300 rounded"
                    >
                        Đóng
                    </button>
                    {canEdit && Object.keys(dirtyFields).length > 0 && (
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
                            Lưu
                        </button>
                    )}
                </div>
            </form>
        </ModalComponent>
    );
};

export default TaskDetailModal;
