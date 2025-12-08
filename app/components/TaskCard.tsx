"use client";

import React from "react";
import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { TaskCardProps } from "../types/Types";
import { IoCalendarNumberOutline } from "react-icons/io5";
import { LuClock4 } from "react-icons/lu";
import { LuCircleUser } from "react-icons/lu";
import { FaRegCircleCheck } from "react-icons/fa6";
import { IoBugOutline } from "react-icons/io5";
import { FaLightbulb, FaStar } from "react-icons/fa";
import {
  FcHighPriority,
  FcLowPriority,
  FcMediumPriority,
} from "react-icons/fc";
import "../globals.css";

function formatDateDisplay(dateString: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
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
  highlightClass = "bg-white",
}) => {
  const isDisabled = !isDraggable;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task._id,
    data: { status: task.status },
    disabled: isDisabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const combinedStyle = isDraggable
    ? { ...style, touchAction: "none" as const }
    : style;

  const IssueIcon =
    task.issueType === "bug"
      ? () => <IoBugOutline className="text-red-500" />
      : task.issueType === "improvement"
        ? () => <FaLightbulb className="text-green-500" />
        : () => <FaStar className="text-blue-500" />;

  const PriorityIcon =
    task.priority === "medium"
      ? () => <FcMediumPriority />
      : task.priority === "high"
        ? () => <FcHighPriority />
        : () => <FcLowPriority />;

  const assigneeDisplay = React.useMemo(() => {
    if (
      typeof task.assigneeDisplayName === "string" &&
      task.assigneeDisplayName.trim().length > 0
    ) {
      return task.assigneeDisplayName.trim();
    }
    const a = task.assignee as unknown;
    if (!a) return "Chưa set";
    if (typeof a === "string") {
      return a.trim() || "Chưa set";
    }
    if (typeof a === "object") {
      const profile = a as { name?: string; _id?: string };
      if (profile.name && profile.name.trim().length > 0) {
        return profile.name;
      }
      if (profile._id) {
        return profile._id;
      }
    }
    return "Chưa set";
  }, [task.assignee, task.assigneeDisplayName]);

  const completedByDisplay = React.useMemo(() => {
    if (
      typeof task.completedByDisplayName === "string" &&
      task.completedByDisplayName.trim().length > 0
    ) {
      return task.completedByDisplayName.trim();
    }
    const c = task.completedBy as unknown;
    if (!c) return undefined;
    if (typeof c === "string") {
      return c.trim() || undefined;
    }
    if (typeof c === "object") {
      const profile = c as { name?: string; _id?: string };
      if (profile.name && profile.name.trim().length > 0) {
        return profile.name;
      }
      if (profile._id) {
        return profile._id;
      }
    }
    return undefined;
  }, [task.completedBy, task.completedByDisplayName]);

  const startDateDisplay = task.startDate
    ? formatDateDisplay(task.startDate)
    : "";
  const endDateDisplay = task.endDate ? formatDateDisplay(task.endDate) : "";
  const showDateBlock = Boolean(startDateDisplay || endDateDisplay);
  const assigneeText = task.assigneeRemoved
    ? `${assigneeDisplay} (Đã bị xóa khỏi dự án)`
    : assigneeDisplay;
  return (
    <div
      ref={setNodeRef}
      style={combinedStyle}
      {...(isDraggable ? attributes : {})}
      {...(isDraggable ? listeners : {})}
      onClick={onClick}
      className={`${highlightClass} p-2 rounded shadow ${isDraggable ? "cursor-grab" : "cursor-default select-none"
        } ${customClass}`}
    >
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-sub">TASK-{task.seq}</span>
        <div className="flex gap-[5px]">
          <span
            className="text-sm"
            data-tippy-content={`IssueType: ${task.issueType}`}
            data-tippy-theme="custom-red"
          >
            <IssueIcon />
          </span>
          <span
            className="text-sm"
            data-tippy-content={`Priority: ${task.priority}`}
            data-tippy-theme="custom-red"
          >
            <PriorityIcon />
          </span>
        </div>
      </div>
      <div className="text-sm text-black mb-1 overflow-hidden whitespace-nowrap text-ellipsis">
        {task.title}
      </div>
      {task.predictedHours !== 0 && (
        <div className="flex items-center gap-[5px] text-sm text-sub mb-1">
          <span>
            <LuClock4 className="text-[#ef4444]" />
          </span>
          <span className="overflow-hidden whitespace-nowrap text-ellipsis">
            {task.predictedHours !== 0 ? `${task.predictedHours}h` : "—"}
          </span>
        </div>
      )}
      {showDateBlock && (
        <div className="flex items-center gap-[5px] text-sm text-sub mb-1">
          <IoCalendarNumberOutline className="text-[#ba5ad9]" />{" "}
          {startDateDisplay || "Chưa set"} - {endDateDisplay || "Chưa set"}
        </div>
      )}

      <div className="flex items-center gap-[5px] text-sm text-sub">
        <span>
          <LuCircleUser className="text-[#40a8f6]" />
        </span>
        <span
          className={`overflow-hidden whitespace-nowrap text-ellipsis ${task.assigneeRemoved ? "text-red-500" : ""
            }`}
        >
          {assigneeText}
        </span>
      </div>
      {task.status === "completed" && completedByDisplay && (
        <div className="flex items-center gap-[5px] text-sm text-green-600">
          <FaRegCircleCheck /> Leader: {completedByDisplay}
        </div>
      )}
    </div>
  );
};

export default TaskCard;
