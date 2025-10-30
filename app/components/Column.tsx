"use client";

import React from "react";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import TaskCard from "./TaskCard";
import { ColumnProps } from "../types/Types";

export default function Column({
  status,
  label,
  tasks,
  currentUserName,
  isLeader,
  onTaskClick,
}: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      id={status}
      data-column={status}
      className={`min-h-[100px] p-2 rounded border border-transparent ${
        isOver ? "bg-black/60" : "bg-black/50"
      }`}
    >
      <h2 className="font-semibold text-center mb-4 text-white uppercase tracking-wide">
        {label}
      </h2>
      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        {tasks.map((task, index) => (
          <TaskCard
            key={task.id}
            task={task}
            onClick={() => onTaskClick(task)}
            customClass={index !== 0 ? "mt-[10px]" : ""}
            isDraggable={
              isLeader ||
              ((typeof task.assignee === "object"
                ? task?.assignee?.name === currentUserName
                : task.assignee === currentUserName) &&
                task.status !== "completed")
            }
          />
        ))}
      </SortableContext>
    </div>
  );
}
