"use client";

import React from "react";
import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { TaskCardProps } from "../types/taskTypes";
import { IoCalendarNumberOutline } from "react-icons/io5";
import { LuClock4 } from "react-icons/lu";
import { LuCircleUser } from "react-icons/lu";
import { FaRegCircleCheck } from "react-icons/fa6";
import { IoBugOutline } from 'react-icons/io5';
import { FaLightbulb, FaStar } from 'react-icons/fa';
import { FcHighPriority, FcLowPriority, FcMediumPriority } from "react-icons/fc";
import Tippy from "@tippyjs/react";
import 'tippy.js/dist/tippy.css';
import "../globals.css";

function formatDateDisplay(dateString: string): string {
    if (!dateString) return "";
    // Tạo đối tượng Date và format
    const date = new Date(dateString);
    // Lấy ngày, tháng và năm
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

const TaskCard: React.FC<TaskCardProps> = ({
    task,
    onClick,
    customClass = "",
    isDraggable = true,
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: task.id,
        data: { status: task.status },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const IssueIcon = task.issueType === 'Bug'
        ? () => <IoBugOutline className="text-red-500" />
        : task.issueType === 'Improvement'
            ? () => <FaLightbulb className="text-green-500" />
            : () => <FaStar className="text-blue-500" />;

    const PriorityIcon = task.priority === 'Medium'
        ? () => <FcMediumPriority />
        : task.priority === 'High'
            ? () => <FcHighPriority />
            : () => <FcLowPriority />

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...(isDraggable ? attributes : {})}
            {...(isDraggable ? listeners : {})}
            onClick={onClick}
            className={`bg-white p-2 rounded shadow ${customClass} ${isDraggable ? "cursor-grab" : "cursor-pointer select-none"
                } ${customClass}`}
        >
            <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-500">TASK-{task.seq}</span>
                <div className="flex gap-[5px]">
                    <Tippy content={`IssueType: ${task.issueType}`} theme="custom-red">
                        <span className="text-sm"><IssueIcon /></span>
                    </Tippy>
                    <Tippy content={`Priority: ${task.priority}`} theme="custom-red">
                        <span className="text-sm"><PriorityIcon /></span>
                    </Tippy>
                </div>
            </div>
            <div className="text-sm text-black-500 mb-1 overflow-hidden whitespace-nowrap text-ellipsis">
                {task.title}
            </div>
            {task.predictedHours !== 0 && (
                <div className="flex items-center gap-[5px] text-sm text-gray-600 mb-1">
                    <span><LuClock4 className="text-[#ef4444]" /></span>
                    <span className="overflow-hidden whitespace-nowrap text-ellipsis">{task.predictedHours !== 0 ? `${task.predictedHours}h` : "—"}</span>
                </div>
            )}
            {(task.startDate || task.endDate) && (
                <div className="flex items-center gap-[5px] text-sm text-gray-600 mb-1">
                    <IoCalendarNumberOutline className="text-[#ba5ad9]" /> {formatDateDisplay(task.startDate ?? "—")} - {formatDateDisplay(task.endDate ?? "—")}
                </div>
            )}

            <div className="flex items-center gap-[5px] text-sm text-gray-500">
                <span><LuCircleUser className="text-[#40a8f6]" /></span>
                <span className="overflow-hidden whitespace-nowrap text-ellipsis">{task.assignee || "Chưa set"}</span>

            </div>
            {task.status === "completed" && task.completedBy && (
                <div className="flex items-center gap-[5px] text-sm text-green-600">
                    <FaRegCircleCheck /> Leader: {task.completedBy}
                </div>
            )}
        </div>

    );
};

export default TaskCard;
