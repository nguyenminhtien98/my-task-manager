"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { database, subscribeToRealtime } from "../../lib/appwrite";
import { useProject } from "../context/ProjectContext";
import { useTheme } from "../context/ThemeContext";
import { DEFAULT_THEME_GRADIENT } from "../utils/themeColors";
import { Project, NotificationMetadata } from "../types/Types";
import { useAuth } from "../context/AuthContext";
import {
  createNotifications,
  getProjectMemberIds,
  CreateNotificationParams,
} from "../services/notificationService";

interface SaveThemeResult {
  success: boolean;
  message?: string;
}

export const useProjectTheme = () => {
  const { currentProject, setCurrentProject, setProjects } = useProject();
  const { setTheme } = useTheme();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  const currentProjectId = currentProject?.$id ?? null;

  const saveTheme = useCallback(
    async (gradient: string): Promise<SaveThemeResult> => {
      if (!currentProject) {
        return { success: false, message: "Chưa chọn dự án" };
      }

      const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID;
      const projectsCollectionId =
        process.env.NEXT_PUBLIC_COLLECTION_ID_PROJECTS;

      if (!databaseId || !projectsCollectionId) {
        return { success: false, message: "Thiếu cấu hình Appwrite" };
      }

      setIsSaving(true);
      try {
        await database.updateDocument(
          String(databaseId),
          String(projectsCollectionId),
          currentProject.$id,
          { themeColor: gradient }
        );

        setProjects((prev) =>
          prev.map((project) =>
            project.$id === currentProject.$id
              ? { ...project, themeColor: gradient }
              : project
          )
        );

        setCurrentProject({
          ...currentProject,
          themeColor: gradient,
        });
        setTheme(gradient);

        if (user) {
          const memberIds = await getProjectMemberIds(currentProject.$id);
          const notifications: CreateNotificationParams[] = [
            {
              recipientId: user.id,
              actorId: user.id,
              type: "project.themeColor.updated",
              scope: "project",
              projectId: currentProject.$id,
              metadata: {
                projectName: currentProject.name,
                actorName: user.name,
                audience: "actor" as const,
              } satisfies NotificationMetadata,
            },
          ];

          memberIds
            .filter((memberId) => memberId && memberId !== user.id)
            .forEach((memberId) => {
              notifications.push({
                recipientId: memberId,
                actorId: user.id,
                type: "project.themeColor.updated",
                scope: "project",
                projectId: currentProject.$id,
                metadata: {
                  projectName: currentProject.name,
                  actorName: user.name,
                  audience: "member" as const,
                } satisfies NotificationMetadata,
              });
            });

          await createNotifications(notifications);
        }

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
    [currentProject, setCurrentProject, setProjects, setTheme, user]
  );

  useEffect(() => {
    const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID;
    const projectsCollectionId = process.env.NEXT_PUBLIC_COLLECTION_ID_PROJECTS;

    if (!databaseId || !projectsCollectionId || !currentProjectId) {
      return;
    }

    const channel = `databases.${databaseId}.collections.${projectsCollectionId}.documents`;

    const unsubscribe = subscribeToRealtime([channel], (res: unknown) => {
      const payload = res as {
        events?: string[];
        payload?: { $id?: string; data?: unknown };
      };

      const events = payload?.events ?? [];
      if (!events.length) return;

      const documentId = payload?.payload?.$id;
      if (!documentId || documentId !== currentProjectId) {
        return;
      }

      if (events.some((event) => event.endsWith(".update"))) {
        const rawData =
          (payload?.payload?.data as unknown as Project | undefined) ??
          (payload?.payload as unknown as Project | undefined);

        if (!rawData) return;

        let nextCurrentProject: Project | null = null;
        const incomingLeader =
          typeof (rawData.leader as unknown) === "object" && rawData.leader
            ? (rawData.leader as Project["leader"])
            : undefined;
        setProjects((prev) => {
          const updated = prev.map((project) => {
            if (project.$id !== documentId) {
              return project;
            }
            const leader = incomingLeader ?? project.leader;
            const merged: Project = {
              ...project,
              ...rawData,
              leader,
              status: (rawData as Project).status ?? project.status ?? "active",
            };
            if (currentProject?.$id === documentId) {
              nextCurrentProject = merged;
            }
            return merged;
          });

          return updated;
        });

        if (currentProject?.$id === documentId) {
          if (!nextCurrentProject) {
            const leader = incomingLeader ?? currentProject.leader;
            nextCurrentProject = {
              ...currentProject,
              ...rawData,
              leader,
              status:
                (rawData as Project).status ??
                currentProject.status ??
                "active",
            };
          }
          setCurrentProject(nextCurrentProject);
          setTheme(nextCurrentProject.themeColor ?? DEFAULT_THEME_GRADIENT);
        } else if (incomingLeader && !nextCurrentProject) {
          // Update cached list entry if it wasn't found during map (e.g. project list empty)
          setProjects((prev) => {
            if (prev.some((project) => project.$id === documentId)) {
              return prev;
            }
            return [
              ...prev,
              {
                ...(rawData as Project),
                leader: incomingLeader,
              },
            ];
          });
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [
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
