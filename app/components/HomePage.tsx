"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import Header from "./Header";
import LoginRegisterModal from "./modal/LoginRegisterModal";
import TaskModal from "./modal/taskModal/TaskModal";
import { Task, TaskStatus, BasicProfile } from "../types/Types";
import { useAuth } from "../context/AuthContext";
import { DragEndEvent } from "@dnd-kit/core";
import { database, subscribeToRealtime } from "../../lib/appwrite";
import toast from "react-hot-toast";
import { useProject } from "../context/ProjectContext";
import ProjectModal from "./modal/ProjectModal";
import { useTheme } from "../context/ThemeContext";
import { useProjectOperations } from "../hooks/useProjectOperations";
import { useTask } from "../hooks/useTask";
import {
  enrichTaskAssignee,
  enrichTasksAssignee,
  preserveAssignee,
} from "../utils/TasksAssignee";
import { mapTaskDocument, RawTaskDocument } from "../utils/taskMapping";

const Board = dynamic(() => import("./Board"), { ssr: false });

type ColumnsType = Record<TaskStatus, Task[]>;

const currentDate = new Date().toISOString().split("T")[0];

const defaultGuideTask: Task = {
  id: "guideTask",
  seq: 0,
  title: "Hướng dẫn sử dụng...",
  description:
    '- Ứng dụng này được xây dựng nhằm hỗ trợ người dùng quản lý công việc và dự án một cách hiệu quả hơn.\n- Ứng dụng cho phép người dùng đăng nhập bằng tài khoản Google hoặc tạo tài khoản mới bằng Gmail.\n\n- Các chức năng chính bao gồm:\n  + Tạo, xóa, đóng, mở dự án.\n  + Thêm hoặc xóa thành viên trong dự án.\n  + Theo dõi hiệu suất làm việc của từng thành viên (dành riêng cho Leader).\n  + Tạo, cập nhật, xóa, phân loại Task, gán người thực hiện hoặc để trống để các thành viên tự nhận.\n  + Đính kèm tệp, đặt mức độ ưu tiên, thời gian bắt đầu và kết thúc.\n  + Kéo thả Task giữa các cột theo quyền (Leader hoặc Thành viên).\n  + Comment trong từng Task (Leader và người thực hiện Task).\n  + Thay đổi màu nền, thông tin dự án.\n  + Tất cả các thao tác đều được cập nhật Realtime (tạo, xóa, chỉnh sửa, kéo thả, thêm thành viên, comment...).\n\n- Hướng dẫn sử dụng:\n  + Trước tiên bạn hãy đăng ký tài khoản sau đó đăng nhập để sử dụng ứng dụng này nha.\n  + Sau khi đăng nhập bạn có thể tạo dự án và tạo task cho dự án đó.\n  + Logic kéo thả task giữa các cột của ứng dụng là:\n    Thành viên của dự án có quyền kéo Task từ cột "LIST" sang cột "DOING" và từ cột "DOING" sang cột "DONE" và kéo từ cột "BUG" về các cột mà thành viên được quyền kéo đến.\n    Khi Task đã rời cột "LIST" thì không thể kéo lại cột "LIST" nữa.\n    Chỉ có Leader của dự án mới có quyền kéo Task từ cột "DONE" sang cột "COMPLETED" hoặc từ cột "DONE" sang cột "BUG".\n    Thành viên của dự án chỉ có quyền kéo Task của chính mình, Leader có quyền kéo Task của tất cả các thành viên trong dự án.\n    Thành viên có thể tự tạo Task hoặc có thể nhận Task từ Leader (những Task mà Leader tạo nhưng chưa chọn thành viên thực hiện Task).\n    Thành viên chỉ có quyền chỉnh sửa các trường "Thời gian hoàn thành", "Ngày bắt đầu và ngày kết thúc của Task".\n  + Leader là: người tạo dự án.\n  + Thành viên là: người được Leader mời vào dự án.\n  + Logic tạo Task là: Leader có quyền để trống trường "Người thực hiện" và "Ngày bắt đầu và ngày kết thúc". Thành viên phải điền đầy đủ các trường.\n\n- Ứng dụng được thiết kế với giao diện hiện đại, sử dụng Next.js và Tailwind CSS cùng công nghệ Realtime để mang lại trải nghiệm mượt mà và trực quan nhất cho người dùng.',
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
  const {
    currentProject,
    currentProjectRole,
    setTasksHydrated,
    isProjectClosed,
  } = useProject();
  const { members } = useProjectOperations();
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
  const [hasLoaded, setHasLoaded] = useState<boolean>(false);
  const { moveTask } = useTask();

  useEffect(() => {
    const handleOpenLoginModal = () => setLoginModalOpen(true);
    const listener = () => handleOpenLoginModal();
    window.addEventListener("open-login-modal", listener as EventListener);
    return () => {
      window.removeEventListener("open-login-modal", listener as EventListener);
    };
  }, []);

  const memberMap = useMemo(() => {
    const map = new Map<string, BasicProfile>();
    members.forEach((member) => {
      map.set(member.$id, {
        $id: member.$id,
        name: member.name,
        email: member.email,
        avatarUrl: member.avatarUrl,
      });
    });
    if (currentProject?.leader) {
      map.set(currentProject.leader.$id, {
        $id: currentProject.leader.$id,
        name: currentProject.leader.name,
        email: currentProject.leader.email,
        avatarUrl: currentProject.leader.avatarUrl ?? undefined,
      });
    }
    return map;
  }, [members, currentProject?.leader]);

  const dedupeTasks = useCallback((list: Task[]) => {
    const seen = new Set<string>();
    const output: Task[] = [];
    for (let i = list.length - 1; i >= 0; i -= 1) {
      const task = list[i];
      if (!task?.id) continue;
      if (seen.has(task.id)) continue;
      seen.add(task.id);
      output.unshift(task);
    }
    return output;
  }, []);

  const applyTasks = useCallback(
    (updater: (prev: Task[]) => Task[]) => {
      setAllTasks((prev) => dedupeTasks(updater(prev)));
    },
    [dedupeTasks]
  );

  useEffect(() => {
    if (!user) {
      setTimeout(() => {
        setAllTasks([defaultGuideTask]);
        setHasLoaded(true);
        if (setTasksHydrated) setTasksHydrated(true);
      }, 300);
      return;
    }

    if (!currentProject) {
      setAllTasks([defaultGuideTask]);
      if (!hasLoaded) {
        setHasLoaded(true);
        if (setTasksHydrated) setTasksHydrated(true);
      }
      return;
    }

    database
      .listDocuments(
        String(process.env.NEXT_PUBLIC_DATABASE_ID),
        String(process.env.NEXT_PUBLIC_COLLECTION_ID_TASKS)
      )
      .then((res) => {
        const mapped = res.documents
          .map((doc) => mapTaskDocument(doc as RawTaskDocument))
          .filter((t) => t.projectId === currentProject.$id)
          .map((task) =>
            preserveAssignee(
              enrichTaskAssignee(task, memberMap),
              memberMap,
              task.assignee
            )
          );
        setAllTasks(dedupeTasks(mapped));
      })
      .catch((err) => {
        console.error("Lấy tasks thất bại:", err);
      })
      .finally(() => {
        if (!hasLoaded) {
          setHasLoaded(true);
          if (setTasksHydrated) setTasksHydrated(true);
        }
      });
  }, [
    user,
    currentProject,
    hasLoaded,
    setTasksHydrated,
    memberMap,
    dedupeTasks,
  ]);

  useEffect(() => {
    if (!user || !currentProject) return;

    const channel = `databases.${process.env.NEXT_PUBLIC_DATABASE_ID}.collections.${process.env.NEXT_PUBLIC_COLLECTION_ID_TASKS}.documents`;

    const unsubscribe = subscribeToRealtime([channel], async (res: unknown) => {
      const payload = res as {
        payload: RawTaskDocument;
        events: string[];
      };

      const { payload: raw, events } = payload;
      if (!events?.length || !raw) return;

      const documentId = raw.$id;

      if (events.some((e: string) => e.endsWith(".delete"))) {
        if (documentId) {
          applyTasks((prev) => prev.filter((t) => t.id !== documentId));
        }
        return;
      }

      if (events.some((e: string) => e.endsWith(".update"))) {
        if (!documentId) return;

        try {
          const fullDoc = await database.getDocument(
            String(process.env.NEXT_PUBLIC_DATABASE_ID),
            String(process.env.NEXT_PUBLIC_COLLECTION_ID_TASKS),
            documentId
          );

          const mapped = enrichTaskAssignee(
            mapTaskDocument(fullDoc as RawTaskDocument),
            memberMap
          );

          if (mapped.projectId !== currentProject.$id) return;

          let finalAssignee = mapped.assignee;
          if (
            typeof mapped.assignee === "string" &&
            mapped.assignee.trim() !== ""
          ) {
            const enriched = memberMap.get(mapped.assignee);
            if (enriched) {
              finalAssignee = enriched;
            }
          }

          const updatedTask = { ...mapped, assignee: finalAssignee };

          applyTasks((prev) =>
            prev.map((t) => (t.id === mapped.id ? updatedTask : t))
          );

          setSelectedTask((task) =>
            task && task.id === mapped.id ? updatedTask : task
          );
        } catch (error) {
          console.error("❌ Failed to fetch full document:", error);
        }
        return;
      }

      if (events.some((e: string) => e.endsWith(".create"))) {
        const mapped = enrichTaskAssignee(mapTaskDocument(raw), memberMap);
        if (mapped.projectId !== currentProject.$id) return;

        applyTasks((prev) => {
          if (prev.some((task) => task.id === mapped.id)) {
            return prev;
          }
          return [
            ...prev,
            preserveAssignee(mapped, memberMap, mapped.assignee),
          ];
        });
      }
    });

    return () => unsubscribe();
  }, [user, currentProject, applyTasks, memberMap]);

  useEffect(() => {
    setAllTasks((prev) => dedupeTasks(enrichTasksAssignee(prev, memberMap)));
    setSelectedTask((task) =>
      task ? enrichTaskAssignee(task, memberMap) : task
    );
  }, [memberMap, dedupeTasks]);

  const handleCreateClick = () => {
    if (user) {
      if (!currentProject) {
        setProjectModalOpen(true);
        setShouldOpenTaskAfterProjectCreation(true);
      } else if (isProjectClosed) {
        toast.error("Dự án đã bị đóng, không thể tạo task mới.");
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
      } else if (isProjectClosed) {
        toast.error("Dự án đã bị đóng, không thể tạo task mới.");
      } else {
        setTaskModalOpen(true);
      }
      setOpenCreateAfterLogin(false);
    }
  };

  const boardTasks = useMemo(
    () => dedupeTasks(allTasks),
    [allTasks, dedupeTasks]
  );

  const handleCreateTask = (task: Task) => {
    if (currentProject) {
      const enrichedTask = preserveAssignee(
        enrichTaskAssignee(
          {
            ...task,
            projectId: currentProject.$id,
            projectName: currentProject.name,
          },
          memberMap
        ),
        memberMap,
        task.assignee
      );
      applyTasks((prev) => [...prev, enrichedTask]);
    }
  };

  const handleUpdateTask = (updated: Task) => {
    const previous = allTasks.find((t) => t.id === updated.id);
    const enriched = enrichTaskAssignee(updated, memberMap);
    const ensured = preserveAssignee(
      enriched,
      memberMap,
      previous?.assignee ?? updated.assignee
    );
    applyTasks((prev) =>
      prev.map((t) => (t.id === ensured.id ? { ...t, ...ensured } : t))
    );
    setSelectedTask((task) =>
      task && task.id === ensured.id ? { ...task, ...ensured } : task
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

  const isTaskOwnedByCurrentUser = useCallback(
    (task?: Task | null) => {
      if (!task) return false;
      const userId = user?.id ?? null;
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
    },
    [user?.id, currentUserName]
  );

  const handleDragEnd = async (
    event: DragEndEvent,
    fallbackStatus: TaskStatus | null = null
  ) => {
    const { active, over } = event;
    if (isProjectClosed) return;
    const sourceStatus = active.data.current?.status as TaskStatus;
    if (!sourceStatus || sourceStatus === "completed") return;

    let targetStatus: TaskStatus | null = null;
    if (over?.data?.current && over.data.current.status) {
      targetStatus = over.data.current.status as TaskStatus;
    } else if (over) {
      const raw = over.id as string;
      if (["list", "doing", "done", "completed", "bug"].includes(raw)) {
        targetStatus = raw as TaskStatus;
      }
    }

    if (!targetStatus && fallbackStatus) {
      targetStatus = fallbackStatus;
    }

    if (!targetStatus) return;

    if (!isLeader) {
      const allowed: TaskStatus[] = ["doing", "done"];
      const moving = allTasks.find((t) => t.id === String(active.id));
      if (!isTaskOwnedByCurrentUser(moving)) return;
      if (
        !allowed.includes(targetStatus) &&
        !(sourceStatus === "bug" && allowed.includes(targetStatus))
      )
        return;
    }

    const currentTask = allTasks.find((t) => t.id === String(active.id));
    if (!currentTask) return;

    const tasksInTarget = allTasks.filter(
      (t) => t.status === targetStatus && t.id !== String(active.id)
    );
    const targetOrder = tasksInTarget.length;

    const newCompletedBy =
      isLeader && targetStatus === "completed" ? currentUserName : undefined;

    const optimisticTask: Task = preserveAssignee(
      enrichTaskAssignee(
        {
          ...currentTask,
          status: targetStatus,
          order: targetOrder,
          completedBy: newCompletedBy,
        },
        memberMap
      ),
      memberMap,
      currentTask.assignee
    );

    applyTasks((prev) =>
      prev.map((t) => (t.id === optimisticTask.id ? optimisticTask : t))
    );

    const result = await moveTask({
      task: currentTask,
      status: targetStatus,
      order: targetOrder,
      completedBy: newCompletedBy,
    });

    if (!result.success || !result.task) {
      applyTasks((prev) =>
        prev.map((t) => (t.id === currentTask.id ? currentTask : t))
      );
      if (result.message) toast.error(result.message);
      return;
    }

    const enrichedResult = preserveAssignee(
      enrichTaskAssignee(result.task, memberMap),
      memberMap,
      currentTask.assignee
    );
    applyTasks((prev) =>
      prev.map((t) => (t.id === enrichedResult.id ? enrichedResult : t))
    );
  };

  return (
    <div
      className="h-screen overflow-hidden flex flex-col transition-colors duration-500"
      style={{ background: theme }}
    >
      <Header
        onCreateTask={handleCreateClick}
        onLoginClick={handleLoginClick}
        onCreateProject={handleCreateProject}
        isProjectClosed={isProjectClosed}
        isTaskModalOpen={taskModalOpen}
        isProjectModalOpen={projectModalOpen}
      />

      <div className="flex-1 overflow-hidden p-2 min-h-0">
        <Board
          tasks={boardTasks}
          currentUser={currentUserName}
          currentUserId={user?.id ?? null}
          isLeader={isLeader}
          onMove={handleDragEnd}
          onTaskClick={(t) => {
            setSelectedTask(t);
            setTaskDetailOpen(true);
          }}
          isProjectClosed={isProjectClosed}
        />
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
