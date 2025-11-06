"use client";

import React from "react";
import { FiPlus } from "react-icons/fi";
import BrandOrbHeaderIcon from "../common/LogoComponent";
import Button from "../common/Button";
import ProjectSelector from "./ProjectSelector";
import { Project } from "../../types/Types";
import { User } from "../../context/AuthContext";
import AnimatedGradientLogo from "../common/AnimatedGradientLogo";

interface MobileHeaderProps {
  user: User | null;
  projects: Project[];
  currentProject: Project | null;
  currentTheme: string;
  onProjectSelect: (project: Project) => void;
  onLoginClick: () => void;
  onAddProject?: () => void;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({
  user,
  projects,
  currentProject,
  currentTheme,
  onProjectSelect,
  onLoginClick,
  onAddProject,
}) => {
  const showProjectSelector = user && projects.length > 0;
  const showCreateProjectButton = showProjectSelector && !!onAddProject;
  const showAnimatedLogo = !(showProjectSelector || showCreateProjectButton);

  return (
    <header className="sticky top-0 z-40 flex w-full items-center justify-between gap-3 border-b border-white/20 bg-black/60 px-3 py-2 backdrop-blur-lg sm:hidden">
      <div className="flex items-center gap-2">
        <BrandOrbHeaderIcon size={28} />
        {showAnimatedLogo && (
          <AnimatedGradientLogo className="text-lg font-bold" />
        )}
      </div>
      <div className="ml-auto flex items-center gap-2">
        {showProjectSelector && (
          <>
            <div className="w-36 max-w-[52vw]">
              <ProjectSelector
                projects={projects}
                currentProject={currentProject}
                onSelect={onProjectSelect}
                className="w-full"
                buttonClassName="w-full justify-between gap-2 text-sm font-semibold"
                dropdownClassName="right-0 left-auto w-60"
                buttonStyle={{ background: currentTheme }}
              />
            </div>
            {onAddProject && (
              <button
                type="button"
                aria-label="Thêm dự án"
                className="rounded-full border border-white/30 p-2 text-white transition hover:border-white hover:bg-white/10"
                onClick={onAddProject}
              >
                <FiPlus className="h-5 w-5" />
              </button>
            )}
          </>
        )}
        {!user && (
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

export default MobileHeader;
