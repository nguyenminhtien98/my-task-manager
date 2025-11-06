"use client";

import React from "react";
import AnimatedGradientLogo from "../common/AnimatedGradientLogo";
import AvatarUser from "../common/AvatarUser";
import BrandOrbHeaderIcon from "../common/LogoComponent";
import Button from "../common/Button";
import NotificationBell from "../notifications/NotificationBell";
import ProjectSelector from "./ProjectSelector";
import { Project } from "../../types/Types";
import { User } from "../../context/AuthContext";
import { EnrichedProjectMember } from "../../hooks/useProjectOperations";

interface DesktopHeaderProps {
  user: User | null;
  currentProject: Project | null;
  projects: Project[];
  isMembersLoading: boolean;
  visibleMembers: EnrichedProjectMember[];
  remainingMembers: number;
  onMemberClick: (member: EnrichedProjectMember) => void;
  onOpenMembersModal: () => void;
  onProjectSelect: (project: Project) => void;
  onCreateProject?: () => void;
  onCreateTask: () => void;
  isProjectClosed: boolean;
  onLoginClick: () => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
  showMenu: boolean;
  onToggleMenu: () => void;
  onOpenProfile: () => void;
  onOpenProjectManager: () => void;
  onOpenTheme: () => void;
  onLogout: () => void;
  currentTheme: string;
}

const DesktopHeader: React.FC<DesktopHeaderProps> = ({
  user,
  currentProject,
  projects,
  isMembersLoading,
  visibleMembers,
  remainingMembers,
  onMemberClick,
  onOpenMembersModal,
  onProjectSelect,
  onCreateProject,
  onCreateTask,
  isProjectClosed,
  onLoginClick,
  menuRef,
  showMenu,
  onToggleMenu,
  onOpenProfile,
  onOpenProjectManager,
  onOpenTheme,
  onLogout,
  currentTheme,
}) => {
  return (
    <header className="sticky top-0 z-50 hidden w-full flex-col items-center justify-between gap-4 border-b border-white/20 bg-black/60 p-2 backdrop-blur-lg sm:flex sm:flex-row">
      <div className="flex items-center gap-2">
        <BrandOrbHeaderIcon size={28} />
        <AnimatedGradientLogo className="text-xl font-bold sm:text-2xl" />
      </div>

      <div className="flex flex-col items-center space-y-2 sm:flex-row sm:space-y-0 sm:space-x-4">
        {user && currentProject && (
          <div className="flex items-center">
            {isMembersLoading ? (
              <div className="flex h-[34px] w-[34px] items-center justify-center">
                <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              </div>
            ) : (
              <div className="flex items-center">
                {visibleMembers.map((member, index) => (
                  <button
                    key={member.$id || `${member.name}-${index}`}
                    type="button"
                    onClick={() => onMemberClick(member)}
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
                        member.isLeader ? `Leader: ${member.name}` : member.name
                      }
                    />
                  </button>
                ))}
                <div
                  className={`${visibleMembers.length > 0 ? "-ml-1" : ""
                    } flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-full border border-dashed border-black bg-white/80 text-xs font-semibold text-black shadow transition hover:bg-white`}
                  title="Thêm thành viên"
                  onClick={onOpenMembersModal}
                >
                  {remainingMembers > 0 ? `+${remainingMembers}` : "+"}
                </div>
              </div>
            )}
          </div>
        )}

        {user && projects.length > 0 && (
          <ProjectSelector
            projects={projects}
            currentProject={currentProject}
            onSelect={onProjectSelect}
            buttonClassName="px-3 py-1 text-white"
            buttonStyle={{ background: currentTheme }}
          />
        )}

        {user && projects.length > 0 && onCreateProject && (
          <Button
            onClick={onCreateProject}
            className="bg-green-600 px-3 py-1 text-white"
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
            ? "cursor-not-allowed bg-gray-400"
            : "bg-[#d15f63] hover:bg-[#df8c8c]"
            }`}
          disabled={isProjectClosed}
          title={isProjectClosed ? "Dự án đã đóng, không thể tạo task" : ""}
        >
          Add Task
        </Button>

        {user ? (
          <div ref={menuRef} className="flex items-center gap-3">
            <NotificationBell
              buttonClassName="rounded-full p-2 text-white transition hover:border-white hover:bg-white/10"
            />
            <div className="relative flex items-center justify-center">
              <AvatarUser
                name={user.name}
                avatarUrl={user.avatarUrl}
                size={36}
                showTooltip={false}
                onClick={onToggleMenu}
                title={`${currentProject?.leader.$id === user.id ? "Leader" : "User"
                  }: ${user.name}`}
              />
              {showMenu && (
                <div className="absolute right-0 top-full z-[60] mt-2 w-48 rounded bg-white text-black shadow-lg">
                  <Button
                    variant="ghost"
                    onClick={onOpenProfile}
                    className="w-full justify-start px-4 py-2 text-left text-[#111827]"
                  >
                    Hồ sơ của tôi
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={onOpenProjectManager}
                    className="w-full justify-start px-4 py-2 text-left text-[#111827]"
                  >
                    Quản lý dự án
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={onOpenTheme}
                    className="w-full justify-start px-4 py-2 text-left text-[#111827]"
                  >
                    Thay đổi màu nền
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={onLogout}
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
            className="bg-gray-100 px-3 py-1 text-white hover:bg-gray-200 hover:text-black"
          >
            Đăng nhập
          </Button>
        )}
      </div>
    </header>
  );
};

export default DesktopHeader;
