"use client";
import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Header from "./Header";
import LoginRegisterModal from "./modal/LoginRegisterModal";
import TaskModal from "./modal/taskModal/TaskModal";
import { Task, TaskStatus, BasicProfile } from "../types/Types";
import { useAuth } from "../context/AuthContext";
import { DragEndEvent } from "@dnd-kit/core";
import { database, subscribeToRealtime } from "../appwrite";
import toast from "react-hot-toast";
import { useProject } from "../context/ProjectContext";
import ProjectModal from "./modal/ProjectModal";
import { useTheme } from "../context/ThemeContext";

const Board = dynamic(() => import("./Board"), { ssr: false });

type ColumnsType = Record<TaskStatus, Task[]>;

const currentDate = new Date().toISOString().split("T")[0];

const defaultGuideTask: Task = {
  id: "guideTask",
  seq: 0,
  title: "Hướng dẫn sử dụng...",
  description:
    '- Trước tiên bạn hãy đăng ký tài khoản sau đó đăng nhập để sử dụng ứng dụng này nha.\n- Sau khi đăng nhập bạn có thể tạo dự án và tạo task cho dự án đó.\n- Logic kéo thả task giữ các cột của ứng dụng là: Thành viên của dự án có quyền kéo Task từ cột "LIST" sang cột "DOING" và từ cột "DOING" sang cột "DONE" và kéo từ cột "BUG" về các cột mà thành viên được quyền kéo đến. Khi Task đã rời cột "LIST" thì không thể kéo lại cột "LIST" nữa. Chỉ có Leader của dự án mới có quyền kéo Task từ cột "DONE" sang cột "COMPLETED" hoặc từ cột "DONE" sang cột "BUG". Thành viên của dự án chỉ có quyền kéo Task của chính mình, Leader có quyền kéo Task của tất cả các thành viên trong dự án. Thành viên có thể tự tạo Task hoặc có thể nhận Task từ Leader (những Task mà Leader tạo nhưng chưa chọn thành viên thực hiện Task). Thành viên chỉ có quyền chỉnh sửa các trường "Thời gian hoàn thành", "Ngày bắt đầu và ngày kết thúc của Task".\n- Leader là : là người tạo dự án.\n- Thành viên là : là người được Leader mời vào dự án\n- Logic tạo Task là: Leader có quyền để trống trường "Người thực hiện" và "Ngày bắt đầu và ngày kết thúc". Thành viền phải điền đầy đủ các trường.',
  assignee: "Admin",
  status: "completed",
  order: 0,
  startDate: currentDate,
  endDate: currentDate,
  predictedHours: 1,
  completedBy: "Admin",
  issueType: "Feature",
  priority: "High",
};

const HomePage: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { currentProject, currentProjectRole } = useProject();
  const currentUserName = user?.name || "";
  const isLeader = currentProjectRole === "leader";

  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [openCreateAfterLogin, setOpenCreateAfterLogin] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [
    shouldOpenTaskAfterProjectCreation,
    setShouldOpenTaskAfterProjectCreation,
  ] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [isContentLoading, setIsContentLoading] = useState<boolean>(false);
  const [hasLoaded, setHasLoaded] = useState<boolean>(false);

  useEffect(() => {
    if (!user) {
      setIsContentLoading(true);
      setTimeout(() => {
        setAllTasks([defaultGuideTask]);
        setIsContentLoading(false);
        setIsInitialLoading(false);
        setHasLoaded(true);
      }, 300);
      return;
    }

    if (!currentProject) {
      setAllTasks([defaultGuideTask]);
      setIsContentLoading(false);
      if (!hasLoaded) {
        setIsInitialLoading(false);
        setHasLoaded(true);
      }
      return;
    }
    if (!hasLoaded) {
      setIsInitialLoading(true);
    } else {
      setIsContentLoading(true);
    }
    database
      .listDocuments(
        String(process.env.NEXT_PUBLIC_DATABASE_ID),
        String(process.env.NEXT_PUBLIC_COLLECTION_ID_TASKS)
      )
      .then((res) => {
        const mapped = (res.documents as unknown as Task[]).map(
          (dUnknown: unknown) => {
            const d = dUnknown as Record<string, unknown> & { $id?: string };
            return {
              ...(d as unknown as Task),
              id: d.$id || (d as unknown as Task).id,
            } as Task;
          }
        );
        const tasks = mapped.filter((t) => t.projectId === currentProject.$id);
        setAllTasks(tasks);
      })
      .catch((err) => {
        console.error("Lấy tasks thất bại:", err);
      })
      .finally(() => {
        if (!hasLoaded) {
          setIsInitialLoading(false);
          setHasLoaded(true);
        } else {
          setIsContentLoading(false);
        }
      });
  }, [user, currentProject, hasLoaded]);

  useEffect(() => {
    if (!user || !currentProject) return;
    const channel = `databases.${process.env.NEXT_PUBLIC_DATABASE_ID}.collections.${process.env.NEXT_PUBLIC_COLLECTION_ID_TASKS}.documents`;
    const unsubscribe = subscribeToRealtime([channel], (res: unknown) => {
      const payload = res as {
        payload: { data?: unknown; $id?: string };
        events: string[];
      };
      const rawUnknown = payload.payload.data ?? (payload as unknown);
      const raw = rawUnknown as Record<string, unknown> & { $id?: string };
      const doc: Task = {
        ...(raw as unknown as Task),
        id: raw.$id || (raw as unknown as Task).id,
        assignee: raw.assignee as string | BasicProfile,
        completedBy: raw.completedBy as string,
      };

      if (doc.projectId !== currentProject.$id) return;

      if (payload.events.some((e: string) => e.endsWith(".create"))) {
        setAllTasks((prev) => {
          if (prev.some((task) => task.id === doc.id)) {
            return prev;
          }
          return [...prev, doc];
        });
      } else if (payload.events.some((e: string) => e.endsWith(".update"))) {
        setAllTasks((prev) => prev.map((t) => (t.id === doc.id ? doc : t)));
      } else if (payload.events.some((e: string) => e.endsWith(".delete"))) {
        setAllTasks((prev) => prev.filter((t) => t.id !== doc.id));
      }
    });

    return () => unsubscribe();
  }, [user, currentProject]);

  const handleCreateClick = () => {
    if (user) {
      if (!currentProject) {
        setProjectModalOpen(true);
        setShouldOpenTaskAfterProjectCreation(true);
      } else {
        setTaskModalOpen(true);
      }
    } else {
      setOpenCreateAfterLogin(true);
      setLoginModalOpen(true);
    }
  };

  const handleCreateProject = () => {
    setProjectModalOpen(true);
    setShouldOpenTaskAfterProjectCreation(false);
  };

  const handleLoginClick = () => {
    setOpenCreateAfterLogin(false);
    setLoginModalOpen(true);
  };

  const onLoginSuccess = () => {
    setLoginModalOpen(false);
    if (openCreateAfterLogin) {
      if (!currentProject) {
        setProjectModalOpen(true);
        setShouldOpenTaskAfterProjectCreation(true);
      } else {
        setTaskModalOpen(true);
      }
      setOpenCreateAfterLogin(false);
    }
  };

  const handleCreateTask = (task: Task) => {
    if (currentProject) {
      const newTask = {
        ...task,
        projectId: currentProject.$id,
        projectName: currentProject.name,
      };
      setAllTasks((prev) => [...prev, newTask]);
    }
  };

  const handleUpdateTask = (updated: Task) => {
    setAllTasks((prev) =>
      prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t))
    );
    setSelectedTask((task) =>
      task && task.id === updated.id ? { ...task, ...updated } : task
    );
  };

  const columns: ColumnsType = {
    list: [],
    doing: [],
    done: [],
    completed: [],
    bug: [],
  };
  allTasks.forEach((t) => {
    columns[t.status].push(t);
  });
  (Object.keys(columns) as TaskStatus[]).forEach((st) =>
    columns[st].sort((a, b) => b.order - a.order)
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const sourceStatus = active.data.current?.status as TaskStatus;
    if (!sourceStatus || sourceStatus === "completed") return;

    let targetStatus: TaskStatus;
    if (over.data.current && over.data.current.status) {
      targetStatus = over.data.current.status as TaskStatus;
    } else {
      const raw = over.id as string;
      targetStatus = raw as TaskStatus;
    }

    if (!isLeader) {
      const allowed: TaskStatus[] = ["doing", "done"];
      const moving = allTasks.find((t) => t.id === active.id);
      if (!moving || moving.assignee !== currentUserName) return;
      if (
        !allowed.includes(targetStatus) &&
        !(sourceStatus === "bug" && allowed.includes(targetStatus))
      )
        return;
    }

    const tasksInTarget = allTasks.filter(
      (t) => t.status === targetStatus && t.id !== active.id
    );
    const targetOrder = tasksInTarget.length;

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

    setAllTasks((prev) => prev.map((t) => (t.id === newTask.id ? newTask : t)));

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
    } catch (error: unknown) {
      console.error("Lỗi cập nhật status task:", error);
      const message =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: unknown }).message)
          : "Cập nhật trạng thái thất bại";
      toast.error(message);
    }
  };

  if (isInitialLoading) {
    return (
      <div
        className="fixed inset-0 flex min-h-screen items-center justify-center"
        style={{ background: theme }}
      >
        <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen transition-colors duration-500"
      style={{ background: theme }}
    >
      <Header
        onCreateTask={handleCreateClick}
        onLoginClick={handleLoginClick}
        onCreateProject={handleCreateProject}
      />

      <div className="relative p-4">
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
        {isContentLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-10">
            <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      <ProjectModal
        isOpen={projectModalOpen}
        setIsOpen={setProjectModalOpen}
        onProjectCreate={() => {
          if (shouldOpenTaskAfterProjectCreation) {
            setTaskModalOpen(true);
            setShouldOpenTaskAfterProjectCreation(false);
          }
        }}
      />

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
    </div>
  );
};

export default HomePage;
