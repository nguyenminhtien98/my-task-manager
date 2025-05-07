"use client";

import React from "react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import TaskCard from "./TaskCard";
import { ColumnProps, TaskStatus } from "../types/taskTypes";

export default function Column({
  status,
  label,
  tasks,
  currentUserName,
  isLeader,
  onTaskClick,
}: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  const borderColors: Record<TaskStatus, string> = {
    list: "#D1D5DB",
    doing: "#22C55E",
    done: "#EF4444",
    completed: "#3B82F6",
    bug: "#CA8A04",
  };

  return (
    <div
      ref={setNodeRef}
      id={status}
      data-column={status}
      className={`min-h-[100px] p-2 rounded ${isOver ? "bg-[#f9f9f9]" : "bg-[#f9f9f9]"}`}
      style={{ border: `2px dashed ${borderColors[status]}` }}
    >
      <h2 className="font-semibold text-center mb-4">{label}</h2>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        {tasks.map((task, index) => (
          <TaskCard
            key={task.id}
            task={task}
            onClick={() => onTaskClick(task)}
            customClass={index !== 0 ? "mt-[10px]" : ""}
            isDraggable={
              isLeader ||
              (task.assignee === currentUserName &&
                task.status !== "completed")
            }
          />
        ))}
      </SortableContext>
    </div>
  );
}
