"use client";

import React, { useEffect, useRef, useState } from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import { Project } from "../../types/Types";
import Button from "../common/Button";
import { cn } from "../../utils/cn";

interface ProjectSelectorProps {
  projects: Project[];
  currentProject: Project | null;
  onSelect: (project: Project) => void;
  className?: string;
  buttonClassName?: string;
  dropdownClassName?: string;
  buttonStyle?: React.CSSProperties;
}

const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  projects,
  currentProject,
  onSelect,
  className,
  buttonClassName,
  dropdownClassName,
  buttonStyle,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selectableProjects = Array.isArray(projects)
    ? projects.filter((project) => Boolean(project?.$id))
    : [];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!selectableProjects.length) return null;

  const canToggle = selectableProjects.length > 1;

  const handleTriggerClick = () => {
    if (!canToggle) return;
    setIsOpen((prev) => !prev);
  };

  const handleSelectProject = (project: Project) => {
    onSelect(project);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Button
        onClick={handleTriggerClick}
        className={cn("px-3 py-1 text-white", buttonClassName)}
        style={buttonStyle}
      >
        <span className="truncate">
          Dự án: {currentProject ? currentProject.name : "Chọn dự án"}
        </span>
        {canToggle && (
          <span className="ml-2 flex items-center text-xs text-white/80">
            {isOpen ? (
              <FiChevronUp className="h-4 w-4" />
            ) : (
              <FiChevronDown className="h-4 w-4" />
            )}
          </span>
        )}
      </Button>
      {canToggle && isOpen && (
        <div
          className={cn(
            "absolute right-0 z-40 mt-1 w-48 rounded bg-white text-black shadow-lg",
            dropdownClassName
          )}
        >
          {selectableProjects.map((proj) => {
            const isActive = currentProject?.$id === proj.$id;
            return (
              <Button
                key={proj.$id}
                variant="ghost"
                onClick={() => handleSelectProject(proj)}
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
  );
};

export default ProjectSelector;
