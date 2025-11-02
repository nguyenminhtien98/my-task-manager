"use client";

import React from "react";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import TaskCard from "./TaskCard";
import { ColumnProps, BasicProfile } from "../types/Types";

export default function Column({
  status,
  label,
  tasks,
  currentUserName,
  currentUserId,
  isLeader,
  isProjectClosed,
  onTaskClick,
}: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: { status },
    disabled: isProjectClosed,
  });

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
        disabled={isProjectClosed}
      >
        {tasks.map((task, index) => {
          const isOwnedByCurrentUser = () => {
            if (isLeader) return true;
            const userId = currentUserId ?? undefined;
            if (task.assignee && typeof task.assignee === "object") {
              const profile = task.assignee as BasicProfile;
              if (userId && profile.$id === userId) return true;
              return profile.name === currentUserName;
            }
            if (typeof task.assignee === "string") {
              if (userId && task.assignee === userId) return true;
              return task.assignee === currentUserName;
            }
            return false;
          };
          const canDrag =
            !isProjectClosed &&
            task.status !== "completed" &&
            (isLeader || isOwnedByCurrentUser());

          return (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
              customClass={index !== 0 ? "mt-[10px]" : ""}
              isDraggable={canDrag}
          />
          );
        })}
      </SortableContext>
    </div>
  );
}
