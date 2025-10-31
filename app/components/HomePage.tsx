"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
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
import { useProjectOperations } from "../hooks/useProjectOperations";
import { useTask } from "../hooks/useTask";

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

type RawTaskDocument = Record<string, unknown> & {
  $id?: string;
  assignee?: unknown;
  completedBy?: unknown;
  attachedFile?: unknown;
  projectId?: string;
};

const mapTaskDocument = (raw: RawTaskDocument): Task => {
  const id = typeof raw.$id === "string" ? raw.$id : (raw.id as string);
  const assignee = raw.assignee as string | BasicProfile | undefined;
  const completedBy =
    typeof raw.completedBy === "string" ? raw.completedBy : undefined;
  const attachedFile = Array.isArray(raw.attachedFile)
    ? (raw.attachedFile as Task["attachedFile"])
    : undefined;

  return {
    ...(raw as unknown as Task),
    id,
    assignee,
    completedBy,
    attachedFile,
  };
};

const HomePage: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { currentProject, currentProjectRole, setTasksHydrated } = useProject();
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

  const memberMap = React.useMemo(() => {
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

  const enrichTaskAssignee = React.useCallback(
    (task: Task): Task => {
      if (task.assignee && typeof task.assignee === "string") {
        const profile = memberMap.get(task.assignee);
        if (profile) {
          return {
            ...task,
            assignee: profile,
          };
        }
      }
      return task;
    },
    [memberMap]
  );

  const preserveAssignee = useCallback(
    (incoming: Task, fallback?: string | BasicProfile) => {
      const fallbackProfile =
        typeof fallback === "object"
          ? fallback
          : typeof fallback === "string"
          ? memberMap.get(fallback)
          : undefined;

      if (incoming.assignee && typeof incoming.assignee === "object") {
        const currentProfile = incoming.assignee as BasicProfile;
        const hasName =
          typeof currentProfile.name === "string" &&
          currentProfile.name.trim().length > 0;
        if (hasName) {
          return incoming;
        }

        const mergedProfile =
          (currentProfile.$id && memberMap.get(currentProfile.$id)) ||
          fallbackProfile;
        if (mergedProfile) {
          return {
            ...incoming,
            assignee: mergedProfile,
          };
        }

        return incoming;
      }

      if (incoming.assignee == null) {
        if (fallbackProfile) {
          return { ...incoming, assignee: fallbackProfile };
        }
        if (typeof fallback === "string") {
          return { ...incoming, assignee: fallback };
        }
        return incoming;
      }

      if (
        typeof incoming.assignee === "string" &&
        memberMap.has(incoming.assignee)
      ) {
        return {
          ...incoming,
          assignee: memberMap.get(incoming.assignee),
        } as Task;
      }

      if (fallbackProfile) {
        return { ...incoming, assignee: fallbackProfile };
      }

      return incoming;
    },
    [memberMap]
  );

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
            preserveAssignee(enrichTaskAssignee(task), task.assignee)
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
    enrichTaskAssignee,
    preserveAssignee,
    dedupeTasks,
  ]);

  useEffect(() => {
    if (!user || !currentProject) return;
    const channel = `databases.${process.env.NEXT_PUBLIC_DATABASE_ID}.collections.${process.env.NEXT_PUBLIC_COLLECTION_ID_TASKS}.documents`;
    const unsubscribe = subscribeToRealtime([channel], (res: unknown) => {
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

      const mapped = enrichTaskAssignee(mapTaskDocument(raw));
      if (mapped.projectId !== currentProject.$id) return;

      if (events.some((e: string) => e.endsWith(".create"))) {
        applyTasks((prev) => {
          if (prev.some((task) => task.id === mapped.id)) {
            return prev;
          }
          return [...prev, preserveAssignee(mapped, mapped.assignee)];
        });
      } else if (events.some((e: string) => e.endsWith(".update"))) {
        applyTasks((prev) =>
          prev.map((t) =>
            t.id === mapped.id
              ? preserveAssignee(mapped, t.assignee)
              : t
          )
        );
        setSelectedTask((task) =>
          task && task.id === mapped.id
            ? preserveAssignee(mapped, task.assignee)
            : task
        );
      }
    });

    return () => unsubscribe();
  }, [user, currentProject, enrichTaskAssignee, preserveAssignee, applyTasks]);

  useEffect(() => {
    setAllTasks((prev) =>
      dedupeTasks(
        prev.map((task) =>
          preserveAssignee(enrichTaskAssignee(task), task.assignee)
        )
      )
    );
    setSelectedTask((task) =>
      task
        ? preserveAssignee(enrichTaskAssignee(task), task.assignee)
        : task
    );
  }, [enrichTaskAssignee, preserveAssignee, dedupeTasks]);

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

  const boardTasks = useMemo(() => dedupeTasks(allTasks), [
    allTasks,
    dedupeTasks,
  ]);


  const handleCreateTask = (task: Task) => {
    if (currentProject) {
      const enrichedTask = preserveAssignee(
        enrichTaskAssignee({
          ...task,
          projectId: currentProject.$id,
          projectName: currentProject.name,
        }),
        task.assignee
      );
      applyTasks((prev) => [...prev, enrichedTask]);
    }
  };

  const handleUpdateTask = (updated: Task) => {
    const previous = allTasks.find((t) => t.id === updated.id);
    const enriched = enrichTaskAssignee(updated);
    const ensured = preserveAssignee(enriched, previous?.assignee ?? updated.assignee);
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

  const handleDragEnd = async (
    event: DragEndEvent,
    fallbackStatus: TaskStatus | null = null
  ) => {
    const { active, over } = event;
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
      const moving = allTasks.find((t) => t.id === active.id);
      if (!moving || moving.assignee !== currentUserName) return;
      if (
        !allowed.includes(targetStatus) &&
        !(sourceStatus === "bug" && allowed.includes(targetStatus))
      )
        return;
    }

    const currentTask = allTasks.find((t) => t.id === active.id);
    if (!currentTask) return;

    const tasksInTarget = allTasks.filter(
      (t) => t.status === targetStatus && t.id !== active.id
    );
    const targetOrder = tasksInTarget.length;

    const newCompletedBy =
      isLeader && targetStatus === "completed" ? currentUserName : undefined;

    const optimisticTask: Task = preserveAssignee(
      enrichTaskAssignee({
        ...currentTask,
        status: targetStatus,
        order: targetOrder,
        completedBy: newCompletedBy,
      }),
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
      enrichTaskAssignee(result.task),
      currentTask.assignee
    );
    applyTasks((prev) =>
      prev.map((t) => (t.id === enrichedResult.id ? enrichedResult : t))
    );
  };

  // Initial loading splash moved to AppBootstrap; render page directly here

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
          tasks={boardTasks}
          currentUser={currentUserName}
          isLeader={isLeader}
          onMove={handleDragEnd}
          onTaskClick={(t) => {
            setSelectedTask(t);
            setTaskDetailOpen(true);
          }}
        />
        {/* Removed inner loading overlay per requirement */}
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
