"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useProject } from "../context/ProjectContext";
import { HeaderProps } from "../types/Types";
import AvatarUser from "./common/AvatarUser";
import AnimatedGradientLogo from "./common/AnimatedGradientLogo";
import BrandOrbHeaderIcon from "./common/LogoComponent";
import { useTheme } from "../context/ThemeContext";
import ThemePickerModal from "./modal/ThemePickerModal";
import EditProfileModal from "./modal/editProfileModal";
import { DEFAULT_THEME_GRADIENT } from "../utils/themeColors";
import toast from "react-hot-toast";
import Button from "./common/Button";
import {
  useProjectOperations,
  EnrichedProjectMember,
} from "../hooks/useProjectOperations";
import ProjectMembersModal from "./modal/projectMemberModal";
import ProjectManagerModal from "./modal/projectModal/ProjectManagerModal";
import { useProjectTheme } from "../hooks/useProjectTheme";
import NotificationBell from "./notifications/NotificationBell";

const Header: React.FC<HeaderProps> = ({
  onCreateTask,
  onLoginClick,
  onCreateProject,
  isProjectClosed,
  projectTheme,
}) => {
  const { user, logout } = useAuth();
  const { projects, currentProject, setCurrentProject, setCurrentProjectRole } =
    useProject();
  const [showMenu, setShowMenu] = useState(false);
  const [showProjectFilter, setShowProjectFilter] = useState(false);
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [pendingTheme, setPendingTheme] = useState<string>(
    DEFAULT_THEME_GRADIENT
  );
  const menuRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const [isProjectManagerOpen, setIsProjectManagerOpen] = useState(false);
  const { setTheme, resetTheme } = useTheme();
  const { members: projectMembers, isLoading: isMembersLoading } =
    useProjectOperations();
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [modalInitialMember, setModalInitialMember] =
    useState<EnrichedProjectMember | null>(null);
  const { isSaving: isSavingTheme, saveTheme } = useProjectTheme();

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
    const handleClickOutsideFilter = (event: MouseEvent) => {
      if (
        filterRef.current &&
        !filterRef.current.contains(event.target as Node)
      ) {
        setShowProjectFilter(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutsideFilter);
    return () =>
      document.removeEventListener("mousedown", handleClickOutsideFilter);
  }, []);

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

  return (
    <>
      <header className="sticky top-0 z-50 flex w-full flex-col items-center justify-between gap-4 border-b border-white/20 bg-black/60 p-2 backdrop-blur-lg sm:flex-row">
        <div className="flex items-center gap-2">
          <BrandOrbHeaderIcon
            size={28}
            background={projectTheme || DEFAULT_THEME_GRADIENT}
          />
          <AnimatedGradientLogo className="text-xl font-bold sm:text-2xl" />
        </div>

        <div className="flex flex-col items-center space-y-2 sm:flex-row sm:space-y-0 sm:space-x-4">
          {user && currentProject && (
            <div className="flex items-center">
              {isMembersLoading ? (
                <div className="flex items-center justify-center w-[34px] h-[34px]">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="flex items-center">
                  {visibleMembers.map((member, index) => (
                    <button
                      key={member.$id || `${member.name}-${index}`}
                      type="button"
                      onClick={() => handleHeaderMemberClick(member)}
                      className={`inline-flex focus:outline-none ${index > 0 ? "-ml-1" : ""
                        }`}
                      style={{ zIndex: visibleMembers.length - index }}
                    >
                      <AvatarUser
                        name={member.name}
                        avatarUrl={member.avatarUrl}
                        size={34}
                        className={`${member.isLeader ? "border-2 border-white" : ""
                          } shadow`}
                        title={
                          member.isLeader
                            ? `Leader: ${member.name}`
                            : member.name
                        }
                      />
                    </button>
                  ))}
                  <div
                    className={`${visibleMembers.length > 0 ? "-ml-1" : ""
                      } flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-full border border-dashed border-black bg-white/80 text-xs font-semibold text-black shadow transition hover:bg-white`}
                    title="Thêm thành viên"
                    onClick={openMembersModal}
                  >
                    {remainingMembers > 0 ? `+${remainingMembers}` : "+"}
                  </div>
                </div>
              )}
            </div>
          )}

          {user && projects.length > 1 && (
            <div ref={filterRef} className="relative">
              <Button
                onClick={() => setShowProjectFilter((prev) => !prev)}
                className="px-3 py-1 text-white"
                style={{
                  background: currentProject?.themeColor || DEFAULT_THEME_GRADIENT,
                }}
              >
                Dự án: {currentProject ? currentProject.name : "Chọn dự án"}
              </Button>
              {showProjectFilter && (
                <div className="absolute right-0 mt-1 w-48 rounded bg-white text-black shadow-lg z-40">
                  {projects.map((proj) => {
                    const isActive = currentProject?.$id === proj.$id;
                    return (
                      <Button
                        key={proj.$id}
                        variant="ghost"
                        onClick={() => {
                          setCurrentProject(proj);
                          setCurrentProjectRole(
                            proj.leader.$id === user?.id ? "leader" : "user"
                          );
                          setTheme(proj.themeColor || DEFAULT_THEME_GRADIENT);
                          setShowProjectFilter(false);
                        }}
                        className="w-full justify-start px-4 py-2 text-left text-[#111827] hover:bg-gray-200"
                        backgroundColor={isActive ? "#e5e7eb" : undefined}
                      >
                        {proj.name}
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {user && projects.length > 0 && onCreateProject && (
            <Button
              onClick={onCreateProject}
              className="px-3 py-1 bg-green-600 text-white"
            >
              Add Project
            </Button>
          )}

          <Button
            onClick={() => {
              if (isProjectClosed) return;
              onCreateTask();
            }}
            className={`px-3 py-1 text-white ${isProjectClosed
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-[#d15f63] hover:bg-[#df8c8c]"
              }`}
            disabled={isProjectClosed}
            title={isProjectClosed ? "Dự án đã đóng, không thể tạo task" : ""}
          >
            Add Task
          </Button>

          {user ? (
            <div className="flex items-center gap-3">
              <NotificationBell />
              <div
                ref={menuRef}
                className="relative flex items-center justify-center"
              >
                <AvatarUser
                  name={user.name}
                  avatarUrl={user.avatarUrl}
                  size={36}
                  showTooltip={false}
                  onClick={() => setShowMenu((prev) => !prev)}
                  title={`${currentProject?.leader.$id === user.id ? "Leader" : "User"
                    }: ${user.name}`}
                />
                {showMenu && (
                  <div className="absolute right-0 top-full mt-2 w-48 rounded bg-white text-black shadow-lg z-[60]">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setIsEditProfileModalOpen(true);
                        setShowMenu(false);
                      }}
                      className="w-full justify-start px-4 py-2 text-left text-[#111827]"
                    >
                      Hồ sơ của tôi
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setIsProjectManagerOpen(true);
                        setShowMenu(false);
                      }}
                      className="w-full justify-start px-4 py-2 text-left text-[#111827]"
                    >
                      Quản lý dự án
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleOpenThemeModal}
                      className="w-full justify-start px-4 py-2 text-left text-[#111827]"
                    >
                      Thay đổi màu nền
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        logout();
                        setShowMenu(false);
                      }}
                      className="w-full justify-start px-4 py-2 text-left text-[#111827]"
                    >
                      Đăng xuất
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Button
              onClick={onLoginClick}
              variant="ghost"
              className="px-3 py-1 bg-gray-100 text-white hover:text-black hover:bg-gray-200"
            >
              Đăng nhập
            </Button>
          )}
        </div>
      </header>

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
