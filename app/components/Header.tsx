"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useProject } from "../context/ProjectContext";
import { FooterAction, HeaderProps, Project } from "../types/Types";
import { useTheme } from "../context/ThemeContext";
import ThemePickerModal from "./modal/ThemePickerModal";
import EditProfileModal from "./modal/editProfileModal";
import { DEFAULT_THEME_GRADIENT } from "../utils/themeColors";
import toast from "react-hot-toast";
import {
  useProjectOperations,
  EnrichedProjectMember,
} from "../hooks/useProjectOperations";
import ProjectMembersModal from "./modal/projectMemberModal";
import ProjectManagerModal from "./modal/projectModal/ProjectManagerModal";
import { useProjectTheme } from "../hooks/useProjectTheme";
import { useFeedbackChat } from "../context/FeedbackChatContext";
import DesktopHeader from "./header/DesktopHeader";
import MobileHeader from "./header/MobileHeader";
import MobileDrawer from "./header/MobileDrawer";
import MobileFooterBar from "./header/MobileFooterBar";

const Header: React.FC<HeaderProps> = ({
  onCreateTask,
  onLoginClick,
  onCreateProject,
  isProjectClosed,
  isTaskModalOpen = false,
  isProjectModalOpen = false,
}) => {
  const { user, logout } = useAuth();
  const { projects, currentProject, setCurrentProject, setCurrentProjectRole } =
    useProject();
  const [showMenu, setShowMenu] = useState(false);
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [pendingTheme, setPendingTheme] = useState<string>(
    DEFAULT_THEME_GRADIENT
  );
  const menuRef = useRef<HTMLDivElement>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [activeFooterAction, setActiveFooterAction] =
    useState<FooterAction | null>(null);
  const [isAddActionPending, setIsAddActionPending] = useState(false);
  const [isProjectManagerOpen, setIsProjectManagerOpen] = useState(false);
  const { setTheme, resetTheme } = useTheme();
  const { members: projectMembers, isLoading: isMembersLoading } =
    useProjectOperations();
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [modalInitialMember, setModalInitialMember] =
    useState<EnrichedProjectMember | null>(null);
  const { isSaving: isSavingTheme, saveTheme } = useProjectTheme();
  const { isOpen: isChatOpen, open: openChat } = useFeedbackChat();
  const pendingAddActionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearPendingAddActionTimeout = useCallback(() => {
    if (pendingAddActionTimeoutRef.current) {
      clearTimeout(pendingAddActionTimeoutRef.current);
      pendingAddActionTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isMobileDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileDrawerOpen]);

  useEffect(() => {
    return () => {
      clearPendingAddActionTimeout();
    };
  }, [clearPendingAddActionTimeout]);

  useEffect(() => {
    if (!user) {
      setIsMobileDrawerOpen(false);
    }
  }, [user]);

  const addModalVisible = Boolean(isTaskModalOpen || isProjectModalOpen);

  useEffect(() => {
    if (isAddActionPending) return;
    const desiredAction: FooterAction | null = isChatOpen
      ? "chat"
      : isMemberModalOpen
        ? "members"
        : addModalVisible
          ? "add"
          : null;
    setActiveFooterAction((prev) =>
      prev === desiredAction ? prev : desiredAction
    );
  }, [addModalVisible, isAddActionPending, isChatOpen, isMemberModalOpen]);

  useEffect(() => {
    if (!isAddActionPending || !addModalVisible) return;
    setIsAddActionPending(false);
    clearPendingAddActionTimeout();
  }, [addModalVisible, clearPendingAddActionTimeout, isAddActionPending]);

  useEffect(() => {
    const projectTheme = currentProject?.themeColor;
    const fallback = DEFAULT_THEME_GRADIENT;
    setPendingTheme(projectTheme || fallback);
  }, [currentProject?.themeColor]);

  const handleOpenThemeModal = () => {
    const current = currentProject?.themeColor || DEFAULT_THEME_GRADIENT;
    setPendingTheme(current);
    setTheme(current);
    setThemeModalOpen(true);
    setShowMenu(false);
    setIsMobileDrawerOpen(false);
  };

  const handleCloseThemeModal = () => {
    setThemeModalOpen(false);
    resetTheme();
    setPendingTheme(currentProject?.themeColor || DEFAULT_THEME_GRADIENT);
  };

  const handleSelectTheme = (gradient: string) => {
    setPendingTheme(gradient);
    setTheme(gradient);
  };

  const handleSaveTheme = async () => {
    if (!user || !currentProject) return;
    const result = await saveTheme(pendingTheme);
    if (result.success) {
      toast.success("Đã cập nhật màu nền dự án.");
      setThemeModalOpen(false);
    } else {
      toast.error(result.message ?? "Cập nhật màu nền dự án thất bại.");
      resetTheme();
      setPendingTheme(currentProject.themeColor || DEFAULT_THEME_GRADIENT);
    }
  };

  const handleProjectSelect = useCallback(
    (project: Project) => {
      setCurrentProject(project);
      setCurrentProjectRole(
        project.leader.$id === user?.id ? "leader" : "user"
      );
      setTheme(project.themeColor || DEFAULT_THEME_GRADIENT);
    },
    [setCurrentProject, setCurrentProjectRole, setTheme, user?.id]
  );

  const visibleMembers = projectMembers.slice(0, 3);
  const remainingMembers = Math.max(
    projectMembers.length - visibleMembers.length,
    0
  );

  const openMembersModal = useCallback(() => {
    setModalInitialMember(null);
    setIsMemberModalOpen(true);
  }, []);

  const handleHeaderMemberClick = useCallback(
    (member: EnrichedProjectMember) => {
      setModalInitialMember(member);
      setIsMemberModalOpen(true);
    },
    []
  );

  const handleCloseMembersModal = useCallback(() => {
    setIsMemberModalOpen(false);
    setModalInitialMember(null);
  }, []);

  const handleOpenProfileSection = useCallback(() => {
    setIsEditProfileModalOpen(true);
    setShowMenu(false);
  }, []);

  const handleOpenProjectManager = useCallback(() => {
    setIsProjectManagerOpen(true);
    setShowMenu(false);
  }, []);

  const handleToggleMenu = useCallback(() => {
    setShowMenu((prev) => !prev);
  }, []);

  const handleLogoutClick = useCallback(() => {
    void logout();
    setShowMenu(false);
  }, [logout]);

  const handleOpenDrawer = useCallback(() => {
    setIsMobileDrawerOpen(true);
  }, []);

  const closeMobileDrawer = useCallback(() => {
    setIsMobileDrawerOpen(false);
  }, []);

  const handleMobileAddTask = useCallback(() => {
    if (isProjectClosed) {
      toast.error("Dự án đã bị đóng, không thể tạo task mới.");
      return;
    }
    onCreateTask();
    setActiveFooterAction("add");
    setIsAddActionPending(true);
    clearPendingAddActionTimeout();
    pendingAddActionTimeoutRef.current = setTimeout(() => {
      setIsAddActionPending(false);
      pendingAddActionTimeoutRef.current = null;
    }, 1500);
  }, [clearPendingAddActionTimeout, isProjectClosed, onCreateTask]);

  const handleFooterMembersClick = useCallback(() => {
    if (!user || !currentProject) {
      toast.error("Vui lòng chọn dự án trước.");
      return;
    }
    closeMobileDrawer();
    openMembersModal();
  }, [closeMobileDrawer, currentProject, openMembersModal, user]);

  const handleFooterChatOpen = useCallback(() => {
    openChat();
  }, [openChat]);

  const currentTheme = currentProject?.themeColor || DEFAULT_THEME_GRADIENT;

  return (
    <>
      <DesktopHeader
        user={user}
        currentProject={currentProject}
        projects={projects}
        isMembersLoading={isMembersLoading}
        visibleMembers={visibleMembers}
        remainingMembers={remainingMembers}
        onMemberClick={handleHeaderMemberClick}
        onOpenMembersModal={openMembersModal}
        onProjectSelect={handleProjectSelect}
        onCreateProject={onCreateProject}
        onCreateTask={onCreateTask}
        isProjectClosed={isProjectClosed}
        onLoginClick={onLoginClick}
        menuRef={menuRef}
        showMenu={showMenu}
        onToggleMenu={handleToggleMenu}
        onOpenProfile={handleOpenProfileSection}
        onOpenProjectManager={handleOpenProjectManager}
        onOpenTheme={handleOpenThemeModal}
        onLogout={handleLogoutClick}
        currentTheme={currentTheme}
      />

      <MobileHeader
        user={user}
        projects={projects}
        currentProject={currentProject}
        currentTheme={currentTheme}
        onProjectSelect={handleProjectSelect}
        onLoginClick={onLoginClick}
        onAddProject={onCreateProject}
      />

      <MobileDrawer
        user={user}
        isOpen={isMobileDrawerOpen}
        onClose={closeMobileDrawer}
        currentProject={currentProject}
        onOpenProfile={handleOpenProfileSection}
        onOpenProjectManager={handleOpenProjectManager}
        onOpenTheme={handleOpenThemeModal}
        onLogout={handleLogoutClick}
        hasProjects={projects.length > 0}
      />

      <MobileFooterBar
        user={user}
        currentProject={currentProject}
        isProjectClosed={isProjectClosed}
        activeAction={activeFooterAction}
        onMembersClick={handleFooterMembersClick}
        onAddClick={handleMobileAddTask}
        onChatClick={handleFooterChatOpen}
        onMenuClick={handleOpenDrawer}
        isMenuOpen={isMobileDrawerOpen}
        onMenuClose={closeMobileDrawer}
      />

      <ProjectMembersModal
        isOpen={isMemberModalOpen}
        onClose={handleCloseMembersModal}
        initialMember={modalInitialMember}
        isProjectClosed={isProjectClosed}
      />

      <ThemePickerModal
        isOpen={themeModalOpen}
        onClose={handleCloseThemeModal}
        selectedColor={pendingTheme}
        onSelect={handleSelectTheme}
        onSave={handleSaveTheme}
        isSaving={isSavingTheme}
      />

      <EditProfileModal
        isOpen={isEditProfileModalOpen}
        onClose={() => setIsEditProfileModalOpen(false)}
      />

      <ProjectManagerModal
        isOpen={isProjectManagerOpen}
        setIsOpen={setIsProjectManagerOpen}
      />
    </>
  );
};

export default Header;
