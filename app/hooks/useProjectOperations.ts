"use client";

import { useCallback, useMemo, useRef } from "react";
import { Query } from "appwrite";
import { database } from "../../lib/appwrite";
import { useProject } from "../context/ProjectContext";
import { useAuth } from "../context/AuthContext";
import {
  BasicProfile,
  Project,
  ProjectStatus,
  NotificationMetadata,
} from "../types/Types";
import { emitMembersChanged } from "../utils/membersBus";
import toast from "react-hot-toast";
import {
  createNotification,
  createNotifications,
  getProjectMemberIds,
  CreateNotificationParams,
} from "../services/notificationService";
import { checkUserSuspended } from "../utils/moderation";
import {
  DEFAULT_DAILY_REPORT_REMIND_MINUTES,
  DEFAULT_DAILY_REPORT_TIMEZONE,
  DEFAULT_DAILY_REPORT_WEEKDAYS,
} from "../utils/dailyReportDefaults";

const ensureProjectStatus = (project: Project): Project => ({
  ...project,
  status: project.status ?? "active",
});

export const useProjectOperations = () => {
  const { user } = useAuth();
  const {
    currentProject,
    setCurrentProject,
    setCurrentProjectRole,
    setProjects,
    members,
    isMembersLoading,
    refreshMembers,
  } = useProject();
  const locallyCreatedProjectIdsRef = useRef<Set<string>>(new Set());

  const ensureUserNotSuspended = useCallback(async () => {
    if (!user?.id) {
      throw new Error("Chưa đăng nhập");
    }
    await checkUserSuspended(user.id);
  }, [user?.id]);

  const createDailyReportRoomForProject = useCallback(
    async (projectId: string) => {
      const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID;
      const roomsCollectionId =
        process.env.NEXT_PUBLIC_COLLECTION_ID_DAILY_REPORT_ROOMS;
      if (!databaseId || !roomsCollectionId || !user?.id) {
        return;
      }
      try {
        await database.createDocument(
          String(databaseId),
          String(roomsCollectionId),
          "unique()",
          {
            project_id: projectId,
            leader_id: user.id,
            remind_enabled: true,
            remind_time_minutes: DEFAULT_DAILY_REPORT_REMIND_MINUTES,
            remind_weekdays: DEFAULT_DAILY_REPORT_WEEKDAYS,
            timezone: DEFAULT_DAILY_REPORT_TIMEZONE,
          }
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (!message.includes("duplicate")) {
          console.error("Failed to initialize daily report room:", error);
        }
      }
    },
    [user?.id]
  );

  const addMember = useCallback(
    async (email: string): Promise<{ success: boolean; message: string }> => {
      if (!currentProject) {
        return { success: false, message: "Chưa chọn dự án" };
      }
      if (!user) {
        return { success: false, message: "Chưa đăng nhập" };
      }
      if ((currentProject.status ?? "active") === "closed") {
        return {
          success: false,
          message: "Dự án đã bị đóng, không thể thêm thành viên",
        };
      }

      try {
        await ensureUserNotSuspended();

        const databaseId = String(process.env.NEXT_PUBLIC_DATABASE_ID);
        const membershipsCollectionId = String(
          process.env.NEXT_PUBLIC_COLLECTION_ID_PROJECT_MEMBERSHIPS
        );
        const profileCollectionId = String(
          process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE
        );

        const profileRes = await database.listDocuments(
          databaseId,
          profileCollectionId,
          [Query.equal("email", email), Query.limit(1)]
        );
        const profileDocs = profileRes.documents as unknown as BasicProfile[];
        const profile = profileDocs[0];
        if (!profile) {
          return {
            success: false,
            message: "Email không tồn tại trong hệ thống",
          };
        }

        const membershipCheck = await database.listDocuments(
          databaseId,
          membershipsCollectionId,
          [
            Query.equal("project", currentProject.$id),
            Query.equal("user", profile.$id),
            Query.limit(1),
          ]
        );
        if (membershipCheck.total > 0) {
          return { success: false, message: "User đã là thành viên của dự án" };
        }
        const response = await fetch("/api/memberships/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: currentProject.$id,
            userId: profile.$id,
            joinedAt: new Date().toISOString(),
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Tạo membership thất bại");
        }

        const notifications: CreateNotificationParams[] = [
          {
            recipientId: user.id,
            actorId: user.id,
            type: "project.member.added",
            scope: "project",
            projectId: currentProject.$id,
            metadata: {
              projectName: currentProject.name,
              targetMemberName: profile.name,
            } satisfies NotificationMetadata,
          },
          {
            recipientId: profile.$id,
            actorId: user.id,
            type: "project.member.added",
            scope: "project",
            projectId: currentProject.$id,
            metadata: {
              projectName: currentProject.name,
              actorName: user.name,
              audience: "target" as const,
              targetMemberName: profile.name,
            } satisfies NotificationMetadata,
          },
        ];

        await createNotifications(notifications);

        emitMembersChanged(currentProject.$id);
        await refreshMembers();
        return { success: true, message: "Đã thêm thành viên thành công" };
      } catch (error) {
        if (!(error instanceof Error && error.message?.includes("khóa"))) {
          console.error("Failed to add member:", error);
        }
        const message =
          error instanceof Error
            ? error.message || "Thêm thành viên thất bại"
            : "Thêm thành viên thất bại";
        return { success: false, message };
      }
    },
    [currentProject, ensureUserNotSuspended, refreshMembers, user]
  );

  const removeMember = useCallback(
    async (
      membershipId: string
    ): Promise<{ success: boolean; message: string }> => {
      if (!currentProject) {
        return { success: false, message: "Chưa chọn dự án" };
      }
      if (!user) {
        return { success: false, message: "Chưa đăng nhập" };
      }
      if ((currentProject.status ?? "active") === "closed") {
        return {
          success: false,
          message: "Dự án đã bị đóng, không thể xóa thành viên",
        };
      }

      const member = members.find((m) => m.membershipId === membershipId);

      try {
        await ensureUserNotSuspended();

        const databaseId = String(process.env.NEXT_PUBLIC_DATABASE_ID);
        const membershipsCollectionId = String(
          process.env.NEXT_PUBLIC_COLLECTION_ID_PROJECT_MEMBERSHIPS
        );

        await database.deleteDocument(
          databaseId,
          membershipsCollectionId,
          membershipId
        );

        const notifications: CreateNotificationParams[] = [
          {
            recipientId: user.id,
            actorId: user.id,
            type: "project.member.removed",
            scope: "project",
            projectId: currentProject.$id,
            metadata: {
              projectName: currentProject.name,
              targetMemberName: member?.name ?? "thành viên",
            } satisfies NotificationMetadata,
          },
        ];

        if (member) {
          notifications.push({
            recipientId: member.$id,
            actorId: user.id,
            type: "project.member.removed",
            scope: "project",
            projectId: currentProject.$id,
            metadata: {
              projectName: currentProject.name,
              actorName: user.name,
              audience: "target" as const,
              targetMemberName: member.name,
            } satisfies NotificationMetadata,
          });
        }

        await createNotifications(notifications);

        emitMembersChanged(currentProject.$id);
        await refreshMembers();
        return { success: true, message: "Đã xóa thành viên" };
      } catch (error) {
        if (!(error instanceof Error && error.message?.includes("khóa"))) {
          console.error("Failed to remove member:", error);
        }
        const message =
          error instanceof Error
            ? error.message || "Xóa thành viên thất bại"
            : "Xóa thành viên thất bại";
        return { success: false, message };
      }
    },
    [currentProject, ensureUserNotSuspended, members, refreshMembers, user]
  );

  const createProject = useCallback(
    async (
      name: string
    ): Promise<{ success: boolean; message?: string; project?: Project }> => {
      if (!user) {
        return { success: false, message: "Chưa đăng nhập" };
      }

      try {
        await ensureUserNotSuspended();
        const databaseId = String(process.env.NEXT_PUBLIC_DATABASE_ID);
        const projectsCollectionId = String(
          process.env.NEXT_PUBLIC_COLLECTION_ID_PROJECTS
        );
        const membershipsCollectionId = String(
          process.env.NEXT_PUBLIC_COLLECTION_ID_PROJECT_MEMBERSHIPS
        );

        const projectDocument = await database.createDocument(
          databaseId,
          projectsCollectionId,
          "unique()",
          {
            name: name,
            leader: user.id,
            status: "active",
          }
        );

        await database.createDocument(
          databaseId,
          membershipsCollectionId,
          "unique()",
          {
            project: projectDocument.$id,
            user: user.id,
            joinedAt: new Date().toISOString(),
          },
          [
            `read("user:${user.id}")`,
            `update("user:${user.id}")`,
            `delete("user:${user.id}")`,
          ]
        );

        await createDailyReportRoomForProject(projectDocument.$id);

        await createNotification({
          recipientId: user.id,
          actorId: user.id,
          type: "project.created",
          scope: "project",
          projectId: projectDocument.$id,
          metadata: {
            projectName: name,
          },
        });

        const createdProject: Project = ensureProjectStatus({
          $id: projectDocument.$id,
          name: projectDocument.name,
          leader: projectDocument.leader,
          $createdAt: projectDocument.$createdAt,
          status: projectDocument.status ?? "active",
        });

        locallyCreatedProjectIdsRef.current.add(createdProject.$id);

        setCurrentProject(createdProject);
        setCurrentProjectRole("leader");
        setProjects((prevProjects) => {
          if (prevProjects.some((p) => p.$id === createdProject.$id)) {
            return prevProjects;
          }
          return [...prevProjects, createdProject];
        });

        toast.success("Tạo dự án thành công!");
        return { success: true, project: createdProject };
      } catch (e: unknown) {
        const errorMessage =
          e instanceof Error
            ? e.message || "Tạo dự án thất bại"
            : "Tạo dự án thất bại";
        toast.error(errorMessage);
        return { success: false, message: errorMessage };
      }
    },
    [
      createDailyReportRoomForProject,
      ensureUserNotSuspended,
      setCurrentProject,
      setCurrentProjectRole,
      setProjects,
      user,
    ]
  );

  const deleteProject = useCallback(
    async (
      projectId: string
    ): Promise<{ success: boolean; message?: string }> => {
      if (!user) {
        return { success: false, message: "Chưa đăng nhập" };
      }

      const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID;
      const projectsCollectionId =
        process.env.NEXT_PUBLIC_COLLECTION_ID_PROJECTS;
      const membershipsCollectionId =
        process.env.NEXT_PUBLIC_COLLECTION_ID_PROJECT_MEMBERSHIPS;
      const tasksCollectionId = process.env.NEXT_PUBLIC_COLLECTION_ID_TASKS;

      if (!databaseId || !projectsCollectionId) {
        const errorMsg = "Thiếu cấu hình Appwrite để xóa dự án.";
        toast.error(errorMsg);
        return { success: false, message: errorMsg };
      }

      try {
        await ensureUserNotSuspended();
        const projectDoc = await database.getDocument(
          String(databaseId),
          String(projectsCollectionId),
          projectId
        );
        const projectName =
          (projectDoc as Project | { name?: string }).name ?? "dự án";

        const memberIdSet = new Set<string>();
        if (membershipsCollectionId) {
          const memberships = await database.listDocuments(
            String(databaseId),
            String(membershipsCollectionId),
            [Query.equal("project", projectId), Query.limit(200)]
          );
          memberships.documents.forEach((membership) => {
            const userField = (
              membership as unknown as {
                user?: string | { $id?: string };
              }
            ).user;
            if (typeof userField === "string") {
              memberIdSet.add(userField);
            } else if (userField && typeof userField.$id === "string") {
              memberIdSet.add(userField.$id);
            }
          });
          await Promise.all(
            memberships.documents.map((membership) =>
              database
                .deleteDocument(
                  String(databaseId),
                  String(membershipsCollectionId),
                  membership.$id
                )
                .catch((err) => {
                  console.error("Failed to delete project membership:", err);
                })
            )
          );
        }

        if (tasksCollectionId) {
          const tasks = await database.listDocuments(
            String(databaseId),
            String(tasksCollectionId),
            [Query.equal("projectId", projectId), Query.limit(200)]
          );
          await Promise.all(
            tasks.documents.map((task) =>
              database
                .deleteDocument(
                  String(databaseId),
                  String(tasksCollectionId),
                  task.$id
                )
                .catch((err) => {
                  console.error("Failed to delete project task:", err);
                })
            )
          );
        }

        const notifications: CreateNotificationParams[] = [
          {
            recipientId: user.id,
            actorId: user.id,
            type: "project.deleted",
            scope: "project",
            projectId,
            metadata: {
              projectName,
              actorName: user.name,
              audience: "actor" as const,
            } satisfies NotificationMetadata,
          },
        ];

        Array.from(memberIdSet)
          .filter((memberId) => memberId && memberId !== user.id)
          .forEach((memberId) => {
            notifications.push({
              recipientId: memberId,
              actorId: user.id,
              type: "project.deleted",
              scope: "project",
              projectId,
              metadata: {
                projectName,
                actorName: user.name,
                audience: "member" as const,
              } satisfies NotificationMetadata,
            });
          });

        if (notifications.length > 0) {
          await createNotifications(notifications);
        }

        await database.deleteDocument(
          String(databaseId),
          String(projectsCollectionId),
          projectId
        );

        setProjects((prev) => {
          const updated = prev.filter((p) => p.$id !== projectId);
          if (currentProject?.$id === projectId) {
            const nextProject = updated[0] ?? null;
            setCurrentProject(nextProject ?? null);
            setCurrentProjectRole(
              nextProject
                ? nextProject.leader.$id === user.id
                  ? "leader"
                  : "user"
                : null
            );
          }
          return updated;
        });

        toast.success("Đã xóa dự án.");
        return { success: true };
      } catch (error) {
        if (!(error instanceof Error && error.message?.includes("hạn chế"))) {
          console.error("Failed to delete project:", error);
        }
        const message =
          error instanceof Error
            ? error.message || "Xóa dự án thất bại."
            : "Xóa dự án thất bại.";
        toast.error(message);
        return { success: false, message };
      }
    },
    [
      currentProject,
      ensureUserNotSuspended,
      setCurrentProject,
      setCurrentProjectRole,
      setProjects,
      user,
    ]
  );

  const leader = useMemo(
    () => members.find((member) => member.isLeader) ?? null,
    [members]
  );

  const updateProjectStatus = useCallback(
    async (
      projectId: string,
      status: ProjectStatus
    ): Promise<{ success: boolean; message?: string }> => {
      if (!user) {
        return { success: false, message: "Chưa đăng nhập" };
      }

      const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID;
      const projectsCollectionId =
        process.env.NEXT_PUBLIC_COLLECTION_ID_PROJECTS;

      if (!databaseId || !projectsCollectionId) {
        const message = "Thiếu cấu hình Appwrite.";
        toast.error(message);
        return { success: false, message };
      }

      try {
        await ensureUserNotSuspended();

        await database.updateDocument(
          String(databaseId),
          String(projectsCollectionId),
          projectId,
          {
            status,
          }
        );

        const projectName =
          currentProject?.$id === projectId
            ? currentProject.name
            : (
                (await database
                  .getDocument(
                    String(databaseId),
                    String(projectsCollectionId),
                    projectId
                  )
                  .catch(() => null)) as Project | null
              )?.name;
        const memberIds = await getProjectMemberIds(projectId);
        const notificationType =
          status === "closed"
            ? ("project.closed" as const)
            : ("project.reopened" as const);

        setProjects((prev) =>
          prev.map((project) =>
            project.$id === projectId
              ? ensureProjectStatus({
                  ...project,
                  status,
                })
              : project
          )
        );

        if (currentProject?.$id === projectId) {
          const nextProject = ensureProjectStatus({
            ...currentProject,
            status,
          });
          setCurrentProject(nextProject);
          setCurrentProjectRole(
            nextProject.leader.$id === user.id ? "leader" : "user"
          );
        }

        const notifications: CreateNotificationParams[] = [
          {
            recipientId: user.id,
            actorId: user.id,
            type: notificationType,
            scope: "project",
            projectId,
            metadata: {
              projectName: projectName ?? currentProject?.name,
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
              type: notificationType,
              scope: "project",
              projectId,
              metadata: {
                projectName: projectName ?? currentProject?.name,
                actorName: user.name,
                audience: "member" as const,
              } satisfies NotificationMetadata,
            });
          });

        if (notifications.length > 0) {
          await createNotifications(notifications);
        }

        toast.success(
          status === "closed" ? "Đã đóng dự án." : "Đã mở lại dự án."
        );
        return { success: true };
      } catch (error) {
        if (!(error instanceof Error && error.message?.includes("hạn chế"))) {
          console.error("Failed to update project status:", error);
        }
        const message =
          error instanceof Error
            ? error.message || "Cập nhật trạng thái dự án thất bại."
            : "Cập nhật trạng thái dự án thất bại.";
        toast.error(message);
        return { success: false, message };
      }
    },
    [
      ensureUserNotSuspended,
      user,
      currentProject,
      setProjects,
      setCurrentProject,
      setCurrentProjectRole,
    ]
  );

  const closeProject = useCallback(
    (projectId: string) => updateProjectStatus(projectId, "closed"),
    [updateProjectStatus]
  );

  const reopenProject = useCallback(
    (projectId: string) => updateProjectStatus(projectId, "active"),
    [updateProjectStatus]
  );

  return {
    members,
    isLoading: isMembersLoading,
    leader,
    addMember,
    removeMember,
    createProject,
    deleteProject,
    closeProject,
    reopenProject,
  };
};

export type UseProjectOperationsResult = ReturnType<
  typeof useProjectOperations
>;
