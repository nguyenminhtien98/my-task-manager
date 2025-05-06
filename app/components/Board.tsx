"use client";

import React, { useState } from "react";
import {
  DndContext,
  useSensors,
  useSensor,
  PointerSensor,
  closestCorners,
  DragEndEvent,
  DragOverlay,
} from "@dnd-kit/core";
import Column from "./Column";
import TaskCard from "./TaskCard";
import { Task, TaskStatus } from "../types/taskTypes";

const LABELS: Record<TaskStatus, string> = {
  list: "List Task",
  doing: "Task Đang Làm",
  done: "Task Đã Làm Xong",
  completed: "Task Đã Xong (Tested)",
  bug: "Bug",
};

interface BoardProps {
  tasks: Task[];
  currentUser: string;
  isLeader: boolean;
  onMove: (e: DragEndEvent) => void;
  onTaskClick: (t: Task) => void;
}

export default function Board({
  tasks,
  currentUser,
  isLeader,
  onMove,
  onTaskClick,
}: BoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const columns: Record<TaskStatus, Task[]> = {
    list: [],
    doing: [],
    done: [],
    completed: [],
    bug: [],
  };
  tasks.forEach((t) => columns[t.status].push(t));

  const findTask = (id: string) => tasks.find((t) => t.id === id) || null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={({ active }) => setActiveId(active.id as string)}
      onDragEnd={(event) => {
        setActiveId(null);
        onMove(event);
      }}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {(Object.keys(columns) as TaskStatus[]).map((status) => (
          <Column
            key={status}
            status={status}
            label={LABELS[status]}
            tasks={columns[status]}
            currentUserName={currentUser}
            isLeader={isLeader}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>
      <DragOverlay>
        {activeId ? (
          <div style={{ width: 250 }}>
            <TaskCard
              task={findTask(activeId) as Task}
              isDraggable={false}
              onClick={() => { }}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
