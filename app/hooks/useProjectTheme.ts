"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useProject } from "../context/ProjectContext";
import { useTheme } from "../context/ThemeContext";
import { useSocket } from "../context/SocketContext";
import { DEFAULT_THEME_GRADIENT } from "../utils/themeColors";
import { Project } from "../types/Types";
import * as projectAPI from "../services/projectService";

interface SaveThemeResult {
  success: boolean;
  message?: string;
}

export const useProjectTheme = () => {
  const { currentProject, setCurrentProject, setProjects } = useProject();
  const { setTheme } = useTheme();
  const [isSaving, setIsSaving] = useState(false);

  const currentProjectId = currentProject?._id ?? null;

  const saveTheme = useCallback(
    async (gradient: string): Promise<SaveThemeResult> => {
      if (!currentProject) {
        return { success: false, message: "Chưa chọn dự án" };
      }

      setIsSaving(true);
      try {
        const updated = await projectAPI.updateProject(currentProject._id, {
          themeColor: gradient,
        });

        setProjects((prev) =>
          prev.map((project) =>
            project._id === currentProject._id ? updated : project
          )
        );

        setCurrentProject(updated);
        setTheme(gradient);

        return { success: true };
      } catch (error) {
        console.error("Failed to update theme color:", error);
        return {
          success: false,
          message: "Cập nhật màu nền dự án thất bại.",
        };
      } finally {
        setIsSaving(false);
      }
    },
    [currentProject, setCurrentProject, setProjects, setTheme]
  );

  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (!socket || !isConnected || !currentProjectId) return;

    const handleProjectUpdated = (updatedProject: Project) => {
      if (updatedProject._id !== currentProjectId) return;

      let nextCurrentProject: Project | null = null;

      setProjects((prev) => {
        const updated = prev.map((project) => {
          if (project._id !== updatedProject._id) {
            return project;
          }
          const merged: Project = {
            ...project,
            ...updatedProject,
            leader: updatedProject.leader ?? project.leader,
            status: updatedProject.status ?? project.status ?? "active",
          };
          if (currentProject?._id === updatedProject._id) {
            nextCurrentProject = merged;
          }
          return merged;
        });
        return updated;
      });

      if (nextCurrentProject) {
        setCurrentProject(nextCurrentProject);
        const themeColor =
          (nextCurrentProject as Project).themeColor ?? DEFAULT_THEME_GRADIENT;
        setTheme(themeColor);
      }
    };

    socket.on("project:updated", handleProjectUpdated);

    return () => {
      socket.off("project:updated", handleProjectUpdated);
    };
  }, [
    socket,
    isConnected,
    currentProject,
    currentProjectId,
    setCurrentProject,
    setProjects,
    setTheme,
  ]);

  const isRealtimeActive = useMemo(
    () => Boolean(currentProjectId),
    [currentProjectId]
  );

  return {
    isSaving,
    saveTheme,
    isRealtimeActive,
  };
};

export type UseProjectThemeResult = ReturnType<typeof useProjectTheme>;
