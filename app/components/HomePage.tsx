"use client";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import TaskModal from "./modal/taskModal/TaskModal";
import { Task, TaskStatus, BasicProfile, TaskProfile } from "../types/Types";
import { useAuth } from "../context/AuthContext";
import { DragEndEvent } from "@dnd-kit/core";
import toast from "react-hot-toast";
import { useProject } from "../context/ProjectContext";
import { useSocket } from "../context/SocketContext";
import { useTheme } from "../context/ThemeContext";
import { useProjectOperations } from "../hooks/useProjectOperations";
import { useTask } from "../hooks/useTask";
import {
  enrichTaskAssignee,
  enrichTasksAssignee,
  preserveAssignee,
} from "../utils/TasksAssignee";
import { useTaskFilter } from "../context/TaskFilterContext";
import { convertFiltersToAPIParams } from "../utils/taskFilters";
import { useRouter, useSearchParams } from "next/navigation";
import MainLayout from "./MainLayout";
import * as taskAPI from "../services/taskService";

const Board = dynamic(() => import("./Board"), { ssr: false });

type ColumnsType = Record<TaskStatus, Task[]>;

const currentDate = new Date().toISOString().split("T")[0];

const adminProfile: TaskProfile = {
  _id: "admin",
  name: "My Task Manager",
  email: "admin@system.com",
  avatarUrl: null,
  role: "admin",
  createdAt: currentDate,
  updatedAt: currentDate,
};

const defaultGuideTask: Task = {
  _id: "guideTask",
  taskId: "GUIDE-1",
  project: "guide-project",
  seq: 0,
  title: "Hướng dẫn sử dụng...",
  description:
    '- Ứng dụng này được xây dựng nhằm hỗ trợ người dùng quản lý công việc và dự án một cách hiệu quả hơn.\n- Ứng dụng cho phép người dùng đăng nhập bằng tài khoản Google hoặc tạo tài khoản mới bằng Gmail.\n\n- Các chức năng chính bao gồm:\n  + Tạo, xóa, đóng, mở dự án.\n  + Thêm hoặc xóa thành viên trong dự án.\n  + Theo dõi hiệu suất làm việc của từng thành viên (dành riêng cho Leader).\n  + Tạo, cập nhật, xóa, phân loại Task, gán người thực hiện hoặc để trống để các thành viên tự nhận.\n  + Đính kèm tệp, đặt mức độ ưu tiên, thời gian bắt đầu và kết thúc.\n  + Kéo thả Task giữa các cột theo quyền (Leader hoặc Thành viên).\n  + Comment trong từng Task (Leader và người thực hiện Task).\n  + Thay đổi màu nền, thông tin dự án.\n  + Tất cả các thao tác đều được cập nhật Realtime (tạo, xóa, chỉnh sửa, kéo thả, thêm thành viên, comment...).\n\n- Hướng dẫn sử dụng:\n  + Trước tiên bạn hãy đăng ký tài khoản sau đó đăng nhập để sử dụng ứng dụng này nha.\n  + Sau khi đăng nhập bạn có thể tạo dự án và tạo task cho dự án đó.\n  + Logic kéo thả task giữa các cột của ứng dụng là:\n    Thành viên của dự án có quyền kéo Task từ cột "LIST" sang cột "DOING" và từ cột "DOING" sang cột "DONE" và kéo từ cột "BUG" về các cột mà thành viên được quyền kéo đến.\n    Khi Task đã rời cột "LIST" thì không thể kéo lại cột "LIST" nữa.\n    Chỉ có Leader của dự án mới có quyền kéo Task từ cột "DONE" sang cột "COMPLETED" hoặc từ cột "DONE" sang cột "BUG".\n    Thành viên của dự án chỉ có quyền kéo Task của chính mình, Leader có quyền kéo Task của tất cả các thành viên trong dự án.\n    Thành viên có thể tự tạo Task hoặc có thể nhận Task từ Leader (những Task mà Leader tạo nhưng chưa chọn thành viên thực hiện Task).\n    Thành viên chỉ có quyền chỉnh sửa các trường "Thời gian hoàn thành", "Ngày bắt đầu và ngày kết thúc của Task".\n  + Leader là: người tạo dự án.\n  + Thành viên là: người được Leader mời vào dự án.\n  + Logic tạo Task là: Leader có quyền để trống trường "Người thực hiện" và "Ngày bắt đầu và ngày kết thúc". Thành viên phải điền đầy đủ các trường.\n\n- Ứng dụng được thiết kế với giao diện hiện đại, sử dụng Next.js và Tailwind CSS cùng công nghệ Realtime để mang lại trải nghiệm mượt mà và trực quan nhất cho người dùng.',
  assignee: adminProfile,
  reporter: adminProfile,
  status: "completed",
  order: 0,
  startDate: currentDate,
  endDate: currentDate,
  predictedHours: 1,
  completedBy: adminProfile,
  issueType: "feature",
  priority: "high",
  attachments: [],
  createdAt: currentDate,
  updatedAt: currentDate,
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const { members } = useProjectOperations();
  const currentUserName = user?.name || "";
  const isLeader = currentProjectRole === "leader";

  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [hasLoaded, setHasLoaded] = useState<boolean>(false);

  const [columnPagination, setColumnPagination] = useState<Record<TaskStatus, { page: number; hasMore: boolean; loading: boolean }>>({
    list: { page: 1, hasMore: true, loading: false },
    doing: { page: 1, hasMore: true, loading: false },
    done: { page: 1, hasMore: true, loading: false },
    completed: { page: 1, hasMore: true, loading: false },
    bug: { page: 1, hasMore: true, loading: false },
  });
  const { moveTask } = useTask();
  const { filters } = useTaskFilter();
  const markHydrated = useCallback(() => {
    if (!hasLoaded) {
      setHasLoaded(true);
      if (setTasksHydrated) setTasksHydrated(true);
    }
  }, [hasLoaded, setTasksHydrated]);

  useEffect(() => {
    const loginParam = searchParams.get("login");
    const redirectParam = searchParams.get("redirect");

    if (loginParam === "1") {
      window.dispatchEvent(new Event("open-main-layout-login-modal"));

      if (redirectParam && typeof window !== "undefined") {
        window.sessionStorage.setItem("pendingRedirectAfterLogin", redirectParam);
      }

      router.replace("/", { scroll: false });
    }
  }, [router, searchParams]);

  const memberMap = useMemo(() => {
    const map = new Map<string, BasicProfile>();
    members.forEach((member) => {
      map.set(member._id, {
        _id: member._id,
        name: member.name,
        email: member.email,
        avatarUrl: member.avatarUrl,
      });
    });
    if (currentProject?.leader) {
      map.set(currentProject.leader._id, {
        _id: currentProject.leader._id,
        name: currentProject.leader.name,
        email: currentProject.leader.email,
        avatarUrl: currentProject.leader.avatarUrl ?? undefined,
      });
    }
    return map;
  }, [members, currentProject?.leader]);

  const annotateTask = useCallback(
    (input: Task): Task => {
      const assigneeProfile = input.assignee as TaskProfile | undefined;
      const computedCompletedBy =
        input.status === "completed" && assigneeProfile
          ? assigneeProfile
          : (input.completedBy as TaskProfile | undefined);

      let assigneeRemoved = false;
      if (assigneeProfile?._id && input._id !== "guideTask") {
        assigneeRemoved = !memberMap.has(assigneeProfile._id);
      }

      return {
        ...input,
        completedBy: computedCompletedBy,
        assigneeDisplayName: assigneeProfile?.name ?? null,
        completedByDisplayName: computedCompletedBy?.name ?? null,
        assigneeRemoved,
      };
    },
    [memberMap]
  );

  const dedupeTasks = useCallback((list: Task[]) => {
    const seen = new Set<string>();
    const output: Task[] = [];
    for (let i = list.length - 1; i >= 0; i -= 1) {
      const task = list[i];
      if (!task?._id) continue;
      if (seen.has(task._id)) continue;
      seen.add(task._id);
      output.unshift(task);
    }
    return output;
  }, []);

  const applyTasks = useCallback(
    (updater: (prev: Task[]) => Task[]) => {
      setAllTasks((prev) => {
        const updated = dedupeTasks(updater(prev)).map(annotateTask);
        return updated;
      });
    },
    [annotateTask, dedupeTasks]
  );

  const fetchTasksForColumn = useCallback(
    async (status: TaskStatus, page: number, append = false, signal?: AbortSignal) => {
      if (!user || !currentProject) return;

      setColumnPagination((prev) => ({
        ...prev,
        [status]: { ...prev[status], loading: true },
      }));

      try {
        const apiParams = convertFiltersToAPIParams(filters, {
          currentUserId: user.id,
        });

        const response = await taskAPI.getTasks(currentProject._id, {
          ...apiParams,
          status,
          page,
          limit: 10,
        });

        const tasksWithSeq: Task[] = response.tasks.map((beTask, index) => {
          const assigneeProfile = beTask.assignee as TaskProfile | undefined;
          const computedCompletedBy =
            beTask.status === "completed" && assigneeProfile
              ? assigneeProfile
              : undefined;

          return {
            ...beTask,
            seq: (page - 1) * 10 + index + 1,
            completedBy: computedCompletedBy,
            assigneeDisplayName: assigneeProfile?.name ?? null,
            completedByDisplayName: computedCompletedBy?.name ?? null,
          };
        });

        setAllTasks((prev) => {
          if (append) {
            const filtered = prev.filter((t) => t.status !== status);
            const existing = prev.filter((t) => t.status === status);
            return dedupeTasks([...filtered, ...existing, ...tasksWithSeq]);
          } else {
            const filtered = prev.filter((t) => t.status !== status);
            return dedupeTasks([...filtered, ...tasksWithSeq]);
          }
        });

        setColumnPagination((prev) => ({
          ...prev,
          [status]: {
            page,
            hasMore: response.pagination.page < response.pagination.totalPages,
            loading: false,
          },
        }));
      } catch (error) {
        if (signal?.aborted) return;
        console.error(`Lấy tasks cột ${status} thất bại:`, error);
        setColumnPagination((prev) => ({
          ...prev,
          [status]: { ...prev[status], loading: false },
        }));
      }
    },
    [user, currentProject, filters, dedupeTasks]
  );

  const fetchTasks = useCallback(
    async (signal?: AbortSignal) => {
      if (!user) {
        setAllTasks([defaultGuideTask]);
        markHydrated();
        return;
      }

      if (!currentProject) {
        setAllTasks([defaultGuideTask]);
        markHydrated();
        return;
      }

      try {
        const apiParams = convertFiltersToAPIParams(filters, {
          currentUserId: user.id,
        });


        const boardData = await taskAPI.getBoardTasks(currentProject._id, {
          ...apiParams,
          limit: 10,
        });

        const allTasksFromBoard: Task[] = [];
        let seqCounter = 1;

        (
          ["list", "doing", "done", "completed", "bug"] as TaskStatus[]
        ).forEach((status) => {
          const columnData = boardData[status];

          columnData.tasks.forEach((beTask) => {
            const assigneeProfile = beTask.assignee as TaskProfile | undefined;
            const computedCompletedBy =
              beTask.status === "completed" && assigneeProfile
                ? assigneeProfile
                : undefined;

            allTasksFromBoard.push({
              ...beTask,
              seq: seqCounter++,
              completedBy: computedCompletedBy,
              assigneeDisplayName: assigneeProfile?.name ?? null,
              completedByDisplayName: computedCompletedBy?.name ?? null,
            });
          });
        });

        setAllTasks(dedupeTasks(allTasksFromBoard));

        setColumnPagination({
          list: { page: 1, hasMore: boardData.list.hasMore, loading: false },
          doing: { page: 1, hasMore: boardData.doing.hasMore, loading: false },
          done: { page: 1, hasMore: boardData.done.hasMore, loading: false },
          completed: { page: 1, hasMore: boardData.completed.hasMore, loading: false },
          bug: { page: 1, hasMore: boardData.bug.hasMore, loading: false },
        });
      } catch (error) {
        if (signal?.aborted) return;
        console.error("Lấy tasks thất bại:", error);
      } finally {
        markHydrated();
      }
    },
    [user, currentProject, filters, dedupeTasks, markHydrated]
  );
  const fetchTasksRef = useRef(fetchTasks);
  useEffect(() => {
    fetchTasksRef.current = fetchTasks;
  }, [fetchTasks]);

  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    if (!user?.id || !currentProject?._id) return;

    const controller = new AbortController();
    hasFetchedRef.current = true;

    void fetchTasks(controller.signal);

    return () => {
      controller.abort();
      hasFetchedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, currentProject?._id, filters]);

  useEffect(() => {
    if (!user || !currentProject) {
      setAllTasks([defaultGuideTask]);
      markHydrated();
      hasFetchedRef.current = false;
    }
  }, [user, currentProject, markHydrated]);

  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (!socket || !isConnected || !currentProject) return;

    socket.emit('project:join', currentProject._id);

    return () => {
      socket.emit('project:leave', currentProject._id);
    };
  }, [socket, isConnected, currentProject]);

  useEffect(() => {

    if (!socket || !isConnected || !user || !currentProject) {
      return;
    }


    const handleTaskChange = (data: Task | { projectId?: string; taskId?: string }) => {

      let belongsToProject = false;

      if ("projectId" in data && data.projectId) {
        belongsToProject = data.projectId === currentProject._id;
      } else if ("project" in data) {
        const projectId = typeof data.project === "string"
          ? data.project
          : data.project._id;
        belongsToProject = projectId === currentProject._id;
      }

      if (belongsToProject) {
        void fetchTasksRef.current();
      }
    };

    socket.on("task:created", handleTaskChange);
    socket.on("task:updated", handleTaskChange);
    socket.on("task:deleted", handleTaskChange);

    return () => {
      socket.off("task:created", handleTaskChange);
      socket.off("task:updated", handleTaskChange);
      socket.off("task:deleted", handleTaskChange);
    };
  }, [socket, isConnected, user, currentProject]);

  useEffect(() => {
    setAllTasks((prev) => {
      const enriched = dedupeTasks(enrichTasksAssignee(prev, memberMap)).map(
        annotateTask
      );
      return enriched;
    });
    setSelectedTask((task) =>
      task ? annotateTask(enrichTaskAssignee(task, memberMap)) : task
    );
  }, [annotateTask, memberMap, dedupeTasks]);

  const boardTasks = useMemo(
    () => dedupeTasks(allTasks),
    [allTasks, dedupeTasks]
  );

  const handleLoadMore = useCallback(
    (status: TaskStatus) => {
      const currentPagination = columnPagination[status];
      if (!currentPagination.hasMore || currentPagination.loading) return;

      const nextPage = currentPagination.page + 1;
      void fetchTasksForColumn(status, nextPage, true);
    },
    [columnPagination, fetchTasksForColumn]
  );

  const handleCreateTask = (task: Task) => {
    if (currentProject) {
      const enrichedTask = preserveAssignee(
        enrichTaskAssignee(
          {
            ...task,
            project: currentProject._id,
          },
          memberMap
        )
      );
      applyTasks((prev) => [...prev, enrichedTask]);
    }
  };

  const handleUpdateTask = (updated: Task) => {
    const enriched = enrichTaskAssignee(updated, memberMap);
    const ensured = preserveAssignee(enriched);
    const annotatedEnsured = annotateTask(ensured);
    applyTasks((prev) =>
      prev.map((t) =>
        t._id === annotatedEnsured._id ? { ...t, ...annotatedEnsured } : t
      )
    );
    setSelectedTask((task) =>
      task && task._id === annotatedEnsured._id
        ? { ...task, ...annotatedEnsured }
        : task
    );
  };

  const handleDeleteTask = (deletedTask: Task) => {
    applyTasks((prev) => prev.filter((t) => t._id !== deletedTask._id));
    setSelectedTask((task) => task && task._id === deletedTask._id ? null : task);
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
        if (userId && profile._id === userId) return true;
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
      const moving = allTasks.find((t) => t._id === String(active.id));
      if (!isTaskOwnedByCurrentUser(moving)) return;
      if (
        !allowed.includes(targetStatus) &&
        !(sourceStatus === "bug" && allowed.includes(targetStatus))
      )
        return;
    }

    const currentTask = allTasks.find((t) => t._id === String(active.id));
    if (!currentTask) return;

    const tasksInTarget = allTasks.filter(
      (t) => t.status === targetStatus && t._id !== String(active.id)
    );
    const targetOrder = tasksInTarget.length;

    const optimisticTask: Task = preserveAssignee(
      enrichTaskAssignee(
        {
          ...currentTask,
          status: targetStatus,
          order: targetOrder,
        },
        memberMap
      )
    );

    applyTasks((prev) =>
      prev.map((t) => (t._id === optimisticTask._id ? optimisticTask : t))
    );

    const result = await moveTask({
      task: currentTask,
      status: targetStatus,
      order: targetOrder,
    });

    if (!result.success || !result.task) {
      applyTasks((prev) =>
        prev.map((t) => (t._id === currentTask._id ? currentTask : t))
      );
      if (result.message) toast.error(result.message);
      return;
    }

    const enrichedResult = preserveAssignee(
      enrichTaskAssignee(result.task, memberMap)
    );
    applyTasks((prev) =>
      prev.map((t) => (t._id === enrichedResult._id ? enrichedResult : t))
    );
  };

  return (
    <MainLayout
      background={theme ?? undefined}
      className="transition-colors duration-500"
      contentWrapper="div"
      contentClassName="flex-1 overflow-hidden p-2 min-h-0"
      taskCreateConfig={{
        nextSeq: allTasks.length + 1,
        onCreate: handleCreateTask,
      }}
      extraModals={
        <TaskModal
          mode="detail"
          isOpen={taskDetailOpen}
          setIsOpen={setTaskDetailOpen}
          task={selectedTask}
          onUpdate={handleUpdateTask}
          onDelete={handleDeleteTask}
        />
      }
    >
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
        columnPagination={columnPagination}
        onLoadMore={handleLoadMore}
      />
    </MainLayout>
  );
};

export default HomePage;
