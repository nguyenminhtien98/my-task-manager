"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Header from "../components/Header";
import LoginRegisterModal from "../components/LoginRegisterModal";
import TaskModal from "../components/TaskModal";
import { Task, TaskStatus } from "../types/taskTypes";
import { useAuth } from "../context/AuthContext";
import { DragEndEvent } from "@dnd-kit/core";
import { database } from "../appwrite";
import toast from "react-hot-toast";

const Board = dynamic(() => import("../components/Board"), { ssr: false });

type ColumnsType = Record<TaskStatus, Task[]>;

const HomePage: React.FC = () => {
  const { user } = useAuth();
  const currentUserName = user?.name || "";
  const isLeader = user?.role === "leader";

  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [openCreateAfterLogin, setOpenCreateAfterLogin] = useState(false);

  // Fetch tasks khi mount (và khi user thay đổi)
  useEffect(() => {
    if (!user) return;
    database
      .listDocuments(
        String(process.env.NEXT_PUBLIC_DATABASE_ID),
        String(process.env.NEXT_PUBLIC_COLLECTION_ID_TASKS)
      )
      .then((res) => {
        // Giả sử res.documents có đúng kiểu Task[]
        setAllTasks(res.documents as unknown as Task[]);
      })
      .catch((err) => {
        console.error("Lấy tasks thất bại:", err);
      });
  }, [user]);

  // Khi click Tạo Task
  const handleCreateClick = () => {
    if (user) {
      setTaskModalOpen(true);
    } else {
      setOpenCreateAfterLogin(true);
      setLoginModalOpen(true);
    }
  };

  // Khi click Login trên header
  const handleLoginClick = () => {
    setOpenCreateAfterLogin(false);
    setLoginModalOpen(true);
  };

  // Callback khi login thành công
  const onLoginSuccess = () => {
    setLoginModalOpen(false);
    if (openCreateAfterLogin) {
      setTaskModalOpen(true);
      setOpenCreateAfterLogin(false);
    }
  };

  // Sau khi tạo task mới trong modal CreateTask
  const handleCreateTask = (task: Task) => {
    setAllTasks((prev) => [...prev, task]);
  };

  // Sau khi cập nhật qua Detail modal
  const handleUpdateTask = (updated: Task) => {
    setAllTasks((prev) =>
      prev.map((t) => (t.id === updated.id ? updated : t))
    );
  };

  // Gom cột - tính dựa trên allTasks hiện tại
  const columns: ColumnsType = { list: [], doing: [], done: [], completed: [], bug: [] };
  allTasks.forEach((t) => {
    columns[t.status].push(t);
  });
  (Object.keys(columns) as TaskStatus[]).forEach((st) =>
    columns[st].sort((a, b) => a.order - b.order)
  );

  // Xử lý Drag & Drop
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    // Lấy status gốc từ dữ liệu của task đang kéo
    const sourceStatus = active.data.current?.status as TaskStatus;
    if (!sourceStatus || sourceStatus === "completed") return;

    // lấy targetStatus từ over.data.current nếu có, nếu không dựa vào over.id
    let targetStatus: TaskStatus;
    if (over.data.current && over.data.current.status) {
      targetStatus = over.data.current.status as TaskStatus;
    } else {
      const raw = over.id as string;
      targetStatus = raw as TaskStatus;
    }

    // Điều kiện cho non-leader: chỉ cho phép chuyển sang "doing" và "done"
    if (!isLeader) {
      const allowed: TaskStatus[] = ["doing", "done"];
      const moving = allTasks.find((t) => t.id === active.id);
      if (!moving || moving.assignee !== currentUserName) return;
      // Nếu không thuộc allowed, và (nếu đang ở bug, nhưng chuyển sang allowed thì cho)
      if (
        !allowed.includes(targetStatus) &&
        !(sourceStatus === "bug" && allowed.includes(targetStatus))
      )
        return;
    }

    // Tính số task đang có ở cột target, loại trừ task đang kéo để tính thứ tự mới
    const tasksInTarget = allTasks.filter(
      (t) => t.status === targetStatus && t.id !== active.id
    );
    const targetOrder = tasksInTarget.length;

    // Tạo object newTask = task được kéo với status mới và order mới
    const updatedTask = allTasks.find((t) => t.id === active.id);
    if (!updatedTask) return;
    const newTask = {
      ...updatedTask,
      status: targetStatus,
      order: targetOrder,
      ...(isLeader && targetStatus === "completed"
        ? { completedBy: currentUserName }
        : {}),
    };

    // Cập nhật state cục bộ
    setAllTasks((prev) =>
      prev.map((t) => (t.id === newTask.id ? newTask : t))
    );

    // Cập nhật dữ liệu lên Database
    try {
      await database.updateDocument(
        String(process.env.NEXT_PUBLIC_DATABASE_ID),
        String(process.env.NEXT_PUBLIC_COLLECTION_ID_TASKS),
        newTask.id,
        {
          status: newTask.status,
          order: newTask.order,
          ...(newTask.completedBy ? { completedBy: newTask.completedBy } : {}),
        }
      );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Lỗi cập nhật status task:", error);
      toast.error(error.message || "Cập nhật trạng thái thất bại");
    }
  };

  return (
    <>
      <Header onCreateTask={handleCreateClick} onLoginClick={handleLoginClick} />

      <div className="p-4">
        <Board
          tasks={allTasks}
          currentUser={currentUserName}
          isLeader={isLeader}
          onMove={handleDragEnd}
          onTaskClick={(t) => {
            setSelectedTask(t);
            setTaskDetailOpen(true);
          }}
        />
      </div>

      <LoginRegisterModal
        isOpen={loginModalOpen}
        setIsOpen={setLoginModalOpen}
        onLoginSuccess={onLoginSuccess}
      />

      <TaskModal
        mode="create"
        isOpen={taskModalOpen}
        setIsOpen={setTaskModalOpen}
        onCreate={handleCreateTask}
        nextSeq={allTasks.length + 1}
      />

      <TaskModal
        mode="detail"
        isOpen={taskDetailOpen}
        setIsOpen={setTaskDetailOpen}
        task={selectedTask}
        onUpdate={handleUpdateTask}
      />
    </>
  );
};

export default HomePage;
