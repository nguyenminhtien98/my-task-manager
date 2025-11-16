"use client";

import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import Header from "./Header";
import ProjectModal from "./modal/ProjectModal";
import LoginRegisterModal from "./modal/LoginRegisterModal";
import TaskModal from "./modal/taskModal/TaskModal";
import { cn } from "../utils/cn";
import { useAuth } from "../context/AuthContext";
import { useProject } from "../context/ProjectContext";
import { Task } from "../types/Types";
import { usePathname, useRouter } from "next/navigation";
import {
  MAIN_LAYOUT_PENDING_ACTION_KEY,
  MainLayoutPendingAction,
  OPEN_TASK_FILTER_EVENT,
} from "../utils/layoutActions";

interface TaskCreateConfig {
  nextSeq: number;
  onCreate?: (task: Task) => void;
}

interface MainLayoutProps {
  background?: string;
  className?: string;
  children: React.ReactNode;
  contentWrapper?: "div" | "main";
  contentClassName?: string;
  taskCreateConfig?: TaskCreateConfig;
  extraModals?: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({
  background,
  className,
  children,
  contentWrapper = "div",
  contentClassName,
  taskCreateConfig,
  extraModals,
}) => {
  const Wrapper = contentWrapper === "main" ? "main" : "div";
  const { user } = useAuth();
  const { currentProject, isProjectClosed } = useProject();
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === "/";

  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [openCreateAfterLogin, setOpenCreateAfterLogin] = useState(false);
  const [
    shouldOpenTaskAfterProjectCreation,
    setShouldOpenTaskAfterProjectCreation,
  ] = useState(false);

  useEffect(() => {
    const listener = () => setLoginModalOpen(true);
    window.addEventListener("open-main-layout-login-modal", listener);
    return () => {
      window.removeEventListener("open-main-layout-login-modal", listener);
    };
  }, []);

  const ensureOnHome = useCallback(
    (action: MainLayoutPendingAction) => {
      if (pathname === "/") return true;
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(
          MAIN_LAYOUT_PENDING_ACTION_KEY,
          action
        );
      }
      router.push("/");
      return false;
    },
    [pathname, router]
  );

  const runCreateTaskFlow = useCallback(() => {
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
  }, [currentProject, isProjectClosed, user]);

  const runCreateProjectFlow = useCallback(() => {
    setProjectModalOpen(true);
    setShouldOpenTaskAfterProjectCreation(false);
  }, []);

  const handleCreateTaskClick = useCallback(() => {
    if (!ensureOnHome("createTask")) return;
    runCreateTaskFlow();
  }, [ensureOnHome, runCreateTaskFlow]);

  const handleCreateProjectClick = useCallback(() => {
    if (!ensureOnHome("createProject")) return;
    runCreateProjectFlow();
  }, [ensureOnHome, runCreateProjectFlow]);

  const handleLoginClick = useCallback(() => {
    setOpenCreateAfterLogin(false);
    setLoginModalOpen(true);
  }, []);

  const handleLoginSuccess = useCallback(() => {
    setLoginModalOpen(false);
    if (!openCreateAfterLogin) return;

    if (!currentProject) {
      setProjectModalOpen(true);
      setShouldOpenTaskAfterProjectCreation(true);
    } else if (isProjectClosed) {
      toast.error("Dự án đã bị đóng, không thể tạo task mới.");
    } else {
      setTaskModalOpen(true);
    }
    setOpenCreateAfterLogin(false);
  }, [currentProject, isProjectClosed, openCreateAfterLogin]);

  const handleProjectCreated = useCallback(() => {
    if (shouldOpenTaskAfterProjectCreation) {
      setTaskModalOpen(true);
      setShouldOpenTaskAfterProjectCreation(false);
    }
  }, [shouldOpenTaskAfterProjectCreation]);

  const handleTaskCreated = useCallback(
    (task: Task) => {
      taskCreateConfig?.onCreate?.(task);
      setTaskModalOpen(false);
    },
    [taskCreateConfig]
  );

  useEffect(() => {
    if (!isHome) return;
    if (typeof window === "undefined") return;
    const action = window.sessionStorage.getItem(
      MAIN_LAYOUT_PENDING_ACTION_KEY
    ) as MainLayoutPendingAction | null;
    if (!action) return;
    window.sessionStorage.removeItem(MAIN_LAYOUT_PENDING_ACTION_KEY);
    if (action === "createTask") {
      runCreateTaskFlow();
    } else if (action === "createProject") {
      runCreateProjectFlow();
    } else if (action === "openTaskFilters") {
      window.dispatchEvent(new Event(OPEN_TASK_FILTER_EVENT));
    }
  }, [isHome, runCreateProjectFlow, runCreateTaskFlow]);

  return (
    <div
      className={cn("flex h-screen flex-col overflow-hidden", className)}
      style={{ background }}
    >
      <Header
        onCreateTask={handleCreateTaskClick}
        onLoginClick={handleLoginClick}
        onCreateProject={handleCreateProjectClick}
        isProjectClosed={isProjectClosed}
        isTaskModalOpen={taskModalOpen}
        isProjectModalOpen={projectModalOpen}
      />
      <Wrapper className={cn("flex-1 min-h-0 overflow-hidden", contentClassName)}>
        {children}
      </Wrapper>
      <ProjectModal
        isOpen={projectModalOpen}
        setIsOpen={setProjectModalOpen}
        onProjectCreate={handleProjectCreated}
      />
      <LoginRegisterModal
        isOpen={loginModalOpen}
        setIsOpen={setLoginModalOpen}
        onLoginSuccess={handleLoginSuccess}
      />
      <TaskModal
        mode="create"
        isOpen={taskModalOpen}
        setIsOpen={setTaskModalOpen}
        onCreate={handleTaskCreated}
        nextSeq={taskCreateConfig?.nextSeq ?? 1}
      />
      {extraModals}
    </div>
  );
};

export default MainLayout;
