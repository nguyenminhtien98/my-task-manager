"use client";

import React, { useRef, useEffect } from "react";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import TaskCard from "./TaskCard";
import TaskCardSkeleton from "./loading/TaskCardSkeleton";
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
  onLoadMore,
  hasMore = false,
  loading = false,
}: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: { status },
    disabled: isProjectClosed,
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isLoadingTriggeredRef = useRef(false);

  useEffect(() => {
    if (!loading) {
      isLoadingTriggeredRef.current = false;
    }
  }, [loading]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !onLoadMore || !hasMore) return;

    const handleScroll = () => {
      if (loading || isLoadingTriggeredRef.current) return;

      const { scrollTop, scrollHeight, clientHeight } = container;
      const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

      if (scrollPercentage > 0.8 && hasMore) {
        isLoadingTriggeredRef.current = true;
        onLoadMore();
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [status, onLoadMore, hasMore, loading]);

  return (
    <div
      ref={setNodeRef}
      id={status}
      data-column={status}
      className={`h-full min-h-0 flex flex-col p-2 rounded border border-transparent ${isOver ? "bg-black/60" : "bg-black/50"
        }`}
    >
      <h2 className="font-semibold text-center mb-4 text-white uppercase tracking-wide flex-shrink-0">
        {label}
      </h2>
      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden no-scrollbar"
      >
        <SortableContext
          items={tasks.map((t) => t._id)}
          strategy={verticalListSortingStrategy}
          disabled={isProjectClosed}
        >
          {tasks.map((task, index) => {
            const isOwnedByCurrentUser = () => {
              if (isLeader) return true;
              const userId = currentUserId ?? undefined;
              if (task.assignee && typeof task.assignee === "object") {
                const profile = task.assignee as BasicProfile;
                if (userId && profile._id === userId) return true;
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

            const highlightClass =
              task.priority === "high" && task.status !== "completed"
                ? "high-priority-card"
                : "bg-white";

            return (
              <TaskCard
                key={task._id}
                task={task}
                customClass={index !== 0 ? "mt-[10px]" : ""}
                highlightClass={highlightClass}
                onClick={() => onTaskClick(task)}
                isDraggable={canDrag}
              />
            );
          })}
        </SortableContext>
        {loading && (
          <div className="py-2">
            <TaskCardSkeleton />
          </div>
        )}
      </div>
    </div>
  );
}
