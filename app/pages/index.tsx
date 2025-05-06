"use client";

import React, { useState } from "react";
import Header from "../components/Header";
import CreateTaskModal from "../components/CreateTaskModal";
import TaskDetailModal from "../components/TaskDetailModal";
import { Task, TaskStatus } from "../types/taskTypes";
import { tasks as fakeTasks } from "../data/fakeData";
import { users, User } from "../data/fakeUsers";
import { DragEndEvent } from "@dnd-kit/core";
import dynamic from "next/dynamic";
const Board = dynamic(() => import("../components/Board"), { ssr: false });

type ColumnsType = Record<TaskStatus, Task[]>;

const HomePage: React.FC = () => {
    const [allTasks, setAllTasks] = useState<Task[]>(fakeTasks);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [taskDetailModalOpen, setTaskDetailModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    const [currentUser, setCurrentUser] = useState<User>(users[1]);
    const isLeader = currentUser.role === "leader";

    // Gom cột
    const columns: ColumnsType = { list: [], doing: [], done: [], completed: [], bug: [] };
    allTasks.forEach((t) => columns[t.status].push(t));
    (Object.keys(columns) as TaskStatus[]).forEach((st) =>
        columns[st].sort((a, b) => a.order - b.order)
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;

        //Lấy sourceStatus (đã gán vào data khi khởi tạo TaskCard)
        const sourceStatus = active.data.current?.status as TaskStatus;
        if (!sourceStatus || sourceStatus === "completed") return;

        //Xác định targetStatus: 
        //Nếu over.id khớp với status, dùng luôn
        //Nếu over.id là một task.id (không phải status), fallback xuống over.data.current.status
        const raw = over.id as string;
        let targetStatus: TaskStatus;
        if (["list", "doing", "done", "completed", "bug"].includes(raw)) {
            targetStatus = raw as TaskStatus;
        } else {
            //over.data.current.status là status của TaskCard bị đè
            targetStatus = over.data.current?.status as TaskStatus;
        }

        //Quyền user/leader
        if (!isLeader) {
            const allowed: TaskStatus[] = ["list", "doing", "done"];
            const moving = allTasks.find((t) => t.id === active.id);
            if (!moving || moving.assignee !== currentUser.name) return;
            //User chỉ kéo trong allowed hoặc từ bug về allowed
            if (
                !allowed.includes(targetStatus) &&
                !(sourceStatus === "bug" && allowed.includes(targetStatus))
            ) return;
        }

        //Thực hiện cập nhật trạng thái + order
        setAllTasks((prev) =>
            prev.map((t) => {
                if (t.id !== active.id) return t;
                return {
                    ...t,
                    status: targetStatus,
                    order: columns[targetStatus]?.length ?? t.order,
                    ...(isLeader && targetStatus === "completed"
                        ? { completedBy: currentUser.name }
                        : {}),
                };
            })
        );
    }

    return (
        <>
            <Header onCreateTask={() => setCreateModalOpen(true)} />
            <div className="p-4">
                <div className="mb-4">
                    <label className="mr-2 font-bold">Chọn người dùng:</label>
                    <select
                        value={currentUser.id}
                        onChange={(e) => {
                            const u = users.find((x) => x.id === e.target.value);
                            if (u) setCurrentUser(u);
                        }}
                        className="p-2 border rounded"
                    >
                        {users.map((u) => (
                            <option key={u.id} value={u.id}>
                                {u.name} ({u.role})
                            </option>
                        ))}
                    </select>
                </div>
                <Board
                    tasks={allTasks}
                    currentUser={currentUser.name}
                    isLeader={isLeader}
                    onMove={handleDragEnd}
                    onTaskClick={(t) => { setSelectedTask(t); setTaskDetailModalOpen(true); }}
                />
            </div>
            <CreateTaskModal
                isOpen={createModalOpen}
                setIsOpen={setCreateModalOpen}
                onCreate={(t) => setAllTasks((p) => [...p, t])}
            />
            <TaskDetailModal
                isOpen={taskDetailModalOpen}
                setIsOpen={setTaskDetailModalOpen}
                task={selectedTask}
                onUpdate={(t) => setAllTasks((p) => p.map((x) => (x.id === t.id ? t : x)))}
                isLeader={isLeader}
                currentUser={currentUser.name}
            />
        </>
    );
};

export default HomePage;
