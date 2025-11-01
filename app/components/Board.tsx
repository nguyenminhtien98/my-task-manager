"use client";

import React, { useState } from "react";
import {
    DndContext,
    useSensors,
    useSensor,
    PointerSensor,
    closestCorners,
    pointerWithin,
    rectIntersection,
    type CollisionDetection,
    DragOverlay,
} from "@dnd-kit/core";
import Column from "./Column";
import TaskCard from "./TaskCard";
import { BoardProps, Task, TaskStatus } from "../types/Types";

const LABELS: Record<TaskStatus, string> = {
    list: "LIST",
    doing: "DOING",
    done: "DONE",
    completed: "COMPLETED",
    bug: "BUG",
};

export default function Board({
    tasks,
    currentUser,
    isLeader,
    onMove,
    onTaskClick,
    isProjectClosed,
}: BoardProps) {
    const [activeId, setActiveId] = useState<string | null>(null);
    const [lastOverStatus, setLastOverStatus] = useState<TaskStatus | null>(
        null
    );

    const collisionDetection: CollisionDetection = (args) => {
        const pointerCollisions = pointerWithin(args);
        if (pointerCollisions.length) {
            return pointerCollisions;
        }

        const intersections = rectIntersection(args);
        if (intersections.length) {
            const thresholdCollisions = intersections.filter((collision) => {
                const ratio = collision.data?.intersectionRatio ?? 0;
                return ratio >= 0.4;
            });
            if (thresholdCollisions.length) {
                return thresholdCollisions;
            }
            return intersections;
        }

        return closestCorners(args);
    };

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
            collisionDetection={collisionDetection}
            onDragStart={({ active }) => {
                if (isProjectClosed) return;
                setActiveId(active.id as string);
                const current = findTask(active.id as string);
                setLastOverStatus(current?.status ?? null);
            }}
            onDragOver={({ over }) => {
                if (isProjectClosed) return;
                if (!over) return;
                let status: TaskStatus | null = null;
                const overData = over.data?.current as
                    | { status?: TaskStatus }
                    | undefined;
                if (overData?.status) {
                    status = overData.status;
                } else {
                    const rawId = over.id as string;
                    if (rawId && ["list", "doing", "done", "completed", "bug"].includes(rawId)) {
                        status = rawId as TaskStatus;
                    }
                }
                if (status) {
                    setLastOverStatus(status);
                }
            }}
            onDragEnd={(event) => {
                setActiveId(null);
                setLastOverStatus(null);
                if (isProjectClosed) return;
                onMove(event, lastOverStatus);
            }}
            onDragCancel={() => {
                setActiveId(null);
                setLastOverStatus(null);
            }}
        >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 min-h-screen">
                {(Object.keys(columns) as TaskStatus[]).map((status) => (
                    <Column
                        key={status}
                        status={status}
                        label={LABELS[status]}
                        tasks={columns[status]}
                        currentUserName={currentUser}
                        isLeader={isLeader}
                        isProjectClosed={isProjectClosed}
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
