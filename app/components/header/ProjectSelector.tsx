"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import { Project } from "../../types/Types";
import Button from "../common/Button";
import { cn } from "../../utils/cn";
import Skeleton from "../common/Skeleton";

interface ProjectSelectorProps {
  projects: Project[];
  currentProject: Project | null;
  onSelect: (project: Project) => void;
  className?: string;
  buttonClassName?: string;
  dropdownClassName?: string;
  buttonStyle?: React.CSSProperties;
  hasMore?: boolean;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
}

const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  projects,
  currentProject,
  onSelect,
  className,
  buttonClassName,
  dropdownClassName,
  buttonStyle,
  hasMore = false,
  onLoadMore,
  isLoadingMore = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const selectableProjects = Array.isArray(projects)
    ? projects.filter((project) => Boolean(project?._id))
    : [];

  const handleScroll = useCallback(() => {
    if (!dropdownRef.current || !hasMore || isLoadingMore || !onLoadMore) {
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = dropdownRef.current;

    if (scrollTop + clientHeight >= scrollHeight - 50) {
      onLoadMore();
    }
  }, [hasMore, isLoadingMore, onLoadMore]);

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
          ref={dropdownRef}
          onScroll={handleScroll}
          className={cn(
            "absolute right-0 z-40 mt-1 w-48 max-w-xs max-h-[200px] overflow-y-auto rounded bg-white text-black shadow-lg scrollbar-hide",
            dropdownClassName
          )}
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {selectableProjects.map((proj) => {
            const isActive = currentProject?._id === proj._id;
            return (
              <Button
                key={proj._id}
                variant="ghost"
                onClick={() => handleSelectProject(proj)}
                className="w-full justify-start px-4 py-2 text-left text-[#111827] hover:bg-gray-200"
                backgroundColor={isActive ? "#e5e7eb" : undefined}
              >
                <span className="truncate block">{proj.name}</span>
              </Button>
            );
          })}
          {isLoadingMore && (
            <div className="px-4 py-2">
              <Skeleton className="h-5 w-3/4 bg-gray-200" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectSelector;
