"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Query } from "appwrite";
import { database, subscribeToRealtime } from "../appwrite";
import { useProject } from "../context/ProjectContext";
import { useAuth } from "../context/AuthContext";
import { BasicProfile, Project, ProjectStatus } from "../types/Types";
import { emitMembersChanged, onMembersChanged } from "../../lib/membersBus";
import toast from "react-hot-toast";

const ensureProjectStatus = (project: Project): Project => ({
  ...project,
  status: project.status ?? "active",
});

export interface EnrichedProjectMember extends BasicProfile {
  isLeader: boolean;
  membershipId?: string;
}

export interface ProjectMemberProfile extends EnrichedProjectMember {
  joinedAt?: string;
}

export const useProjectOperations = () => {
  const { user } = useAuth();
  const {
    currentProject,
    setCurrentProject,
    setCurrentProjectRole,
    // projects,
    setProjects,
  } = useProject();
  const [members, setMembers] = useState<ProjectMemberProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [version, setVersion] = useState(0);
  const locallyCreatedProjectIdsRef = useRef<Set<string>>(new Set());

  const refetch = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    if (!currentProject) {
      setMembers([]);
      return;
    }

    const fetchMembers = async () => {
      setIsLoading(true);
      try {
        const databaseId = String(process.env.NEXT_PUBLIC_DATABASE_ID);
        const membershipsCollectionId = String(
          process.env.NEXT_PUBLIC_COLLECTION_ID_PROJECT_MEMBERSHIPS
        );

        const response = await database.listDocuments(
          databaseId,
          membershipsCollectionId,
          [Query.equal("project", currentProject.$id), Query.limit(100)]
        );

        const nonLeaderMembers: ProjectMemberProfile[] = response.documents
          .map((membershipDoc) => {
            const userProfile = membershipDoc.user as BasicProfile;
            const profile: ProjectMemberProfile = {
              ...(userProfile as BasicProfile),
              isLeader: false,
              membershipId: membershipDoc.$id,
              joinedAt: membershipDoc.joinedAt as string | undefined,
            };
            return profile;
          })
          .filter((m) => m.$id !== currentProject.leader.$id);

        const leaderMatch = response.documents.find(
          (d) => (d.user as BasicProfile)?.$id === currentProject.leader.$id
        );
        const leaderProfile: ProjectMemberProfile = {
          ...currentProject.leader,
          isLeader: true,
          membershipId: leaderMatch?.$id,
          joinedAt: (leaderMatch?.joinedAt as string | undefined) ?? undefined,
        };

        const allMembers: ProjectMemberProfile[] = [
          leaderProfile,
          ...nonLeaderMembers,
        ];
        setMembers(allMembers);
      } catch (error) {
        console.error("Failed to fetch project members:", error);
        setMembers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMembers();
  }, [currentProject, version]);

  useEffect(() => {
    if (!currentProject) return;
    const unsubscribe = onMembersChanged((projectId) => {
      if (currentProject && projectId === currentProject.$id) {
        refetch();
      }
    });
    return unsubscribe;
  }, [currentProject, refetch]);

  useEffect(() => {
    if (!currentProject) return;

    const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID;
    const membershipsCollectionId =
      process.env.NEXT_PUBLIC_COLLECTION_ID_PROJECT_MEMBERSHIPS;

    if (!databaseId || !membershipsCollectionId) {
      return;
    }

    const currentProjectId = currentProject.$id;
    const channel = `databases.${databaseId}.collections.${membershipsCollectionId}.documents`;

    const unsubscribe = subscribeToRealtime([channel], (res: unknown) => {
      const event = res as {
        events?: string[];
        payload?: {
          $id?: string;
          project?: unknown;
          data?: { project?: unknown };
        };
      };

      const events = event.events ?? [];
      if (!events.length) return;

      const membershipData =
        ((event.payload?.data as { project?: unknown } | undefined) ??
          event.payload) ?? null;

      const membershipProjectId =
        typeof membershipData?.project === "string"
          ? membershipData.project
          : undefined;

      if (
        membershipProjectId &&
        membershipProjectId !== currentProjectId
      ) {
        return;
      }

      if (
        events.some((e) =>
          e.endsWith(".create") ||
          e.endsWith(".update") ||
          e.endsWith(".delete")
        )
      ) {
        refetch();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentProject, refetch]);

  useEffect(() => {
    if (!user) return;

    const databaseId = String(process.env.NEXT_PUBLIC_DATABASE_ID);
    const projectsCollectionId = String(
      process.env.NEXT_PUBLIC_COLLECTION_ID_PROJECTS
    );
    const channel = `databases.${databaseId}.collections.${projectsCollectionId}.documents`;

    const unsubscribe = subscribeToRealtime([channel], (res: unknown) => {
      const payload = res as {
        payload: { data?: unknown; $id?: string };
        events: string[];
      };

      if (!payload?.events?.length) return;

      const events = payload.events;
      const documentId = payload.payload?.$id;
      const rawData =
        (payload.payload?.data as unknown as Project | undefined) ??
        (payload.payload as unknown as Project | undefined);

      if (events.some((e) => e.endsWith(".delete"))) {
        if (documentId) {
          setProjects((prev) => {
            const updated = prev.filter((p) => p.$id !== documentId);
            if (currentProject?.$id === documentId) {
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
        }
        return;
      }

      if (events.some((e) => e.endsWith(".create"))) {
        if (!rawData) return;
        const newProject = ensureProjectStatus(rawData as Project);

        if (locallyCreatedProjectIdsRef.current.has(newProject.$id)) {
          locallyCreatedProjectIdsRef.current.delete(newProject.$id);
          return;
        }
        // const isLeader = newProject.leader?.$id === user.id;
        setProjects((prev) => {
          if (prev.some((p) => p.$id === newProject.$id)) {
            return prev;
          }
          return [...prev, newProject];
        });
      } else if (events.some((e) => e.endsWith(".update"))) {
        if (!rawData) return;
        const updatedProject = ensureProjectStatus(rawData as Project);

        const incomingLeader = (() => {
          const value = (updatedProject as unknown as {
            leader?: unknown;
          }).leader;
          if (
            value &&
            typeof value === "object" &&
            "$id" in (value as Record<string, unknown>)
          ) {
            return value as Project["leader"];
          }
          return undefined;
        })();

        setProjects((prev) =>
          prev.map((p) =>
            p.$id === updatedProject.$id
              ? {
                  ...p,
                  ...updatedProject,
                  leader: incomingLeader ?? p.leader,
                  status: updatedProject.status ?? p.status ?? "active",
                }
              : p
          )
        );

        if (currentProject?.$id === updatedProject.$id) {
          const leader = incomingLeader ?? currentProject.leader;
          const nextProject: Project = {
            ...currentProject,
            ...updatedProject,
            leader,
            status: updatedProject.status ?? currentProject.status ?? "active",
          };
          setCurrentProject(nextProject);
          setCurrentProjectRole(
            leader.$id === user.id ? "leader" : "user"
          );
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [
    user,
    currentProject,
    setProjects,
    setCurrentProject,
    setCurrentProjectRole,
  ]);

  const addMember = useCallback(
    async (email: string): Promise<{ success: boolean; message: string }> => {
      if (!currentProject) {
        return { success: false, message: "Chưa chọn dự án" };
      }
      if ((currentProject.status ?? "active") === "closed") {
        return {
          success: false,
          message: "Dự án đã bị đóng, không thể thêm thành viên",
        };
      }

      try {
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

        await database.createDocument(
          databaseId,
          membershipsCollectionId,
          "unique()",
          {
            project: currentProject.$id,
            user: profile.$id,
            joinedAt: new Date().toISOString(),
          }
        );

        emitMembersChanged(currentProject.$id);
        refetch();
        return { success: true, message: "Đã thêm thành viên thành công" };
      } catch (error) {
        console.error("Failed to add member:", error);
        return { success: false, message: "Thêm thành viên thất bại" };
      }
    },
    [currentProject, refetch]
  );

  const removeMember = useCallback(
    async (
      membershipId: string
    ): Promise<{ success: boolean; message: string }> => {
      if (!currentProject) {
        return { success: false, message: "Chưa chọn dự án" };
      }
      if ((currentProject.status ?? "active") === "closed") {
        return {
          success: false,
          message: "Dự án đã bị đóng, không thể xóa thành viên",
        };
      }

      try {
        const databaseId = String(process.env.NEXT_PUBLIC_DATABASE_ID);
        const membershipsCollectionId = String(
          process.env.NEXT_PUBLIC_COLLECTION_ID_PROJECT_MEMBERSHIPS
        );

        await database.deleteDocument(
          databaseId,
          membershipsCollectionId,
          membershipId
        );

        emitMembersChanged(currentProject.$id);
        refetch();
        return { success: true, message: "Đã xóa thành viên" };
      } catch (error) {
        console.error("Failed to remove member:", error);
        return { success: false, message: "Xóa thành viên thất bại" };
      }
    },
    [currentProject, refetch]
  );

  const createProject = useCallback(
    async (
      name: string
    ): Promise<{ success: boolean; message?: string; project?: Project }> => {
      if (!user) {
        return { success: false, message: "Chưa đăng nhập" };
      }

      try {
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
          }
        );

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
    [user, setCurrentProject, setCurrentProjectRole, setProjects]
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
        if (membershipsCollectionId) {
          const memberships = await database.listDocuments(
            String(databaseId),
            String(membershipsCollectionId),
            [Query.equal("project", projectId), Query.limit(200)]
          );
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
        console.error("Failed to delete project:", error);
        const errorMsg = "Xóa dự án thất bại.";
        toast.error(errorMsg);
        return { success: false, message: errorMsg };
      }
    },
    [
      user,
      currentProject,
      setProjects,
      setCurrentProject,
      setCurrentProjectRole,
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
        await database.updateDocument(
          String(databaseId),
          String(projectsCollectionId),
          projectId,
          {
            status,
          }
        );

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

        toast.success(
          status === "closed"
            ? "Đã đóng dự án."
            : "Đã mở lại dự án."
        );
        return { success: true };
      } catch (error) {
        console.error("Failed to update project status:", error);
        const message =
          error instanceof Error
            ? error.message || "Cập nhật trạng thái dự án thất bại."
            : "Cập nhật trạng thái dự án thất bại.";
        toast.error(message);
        return { success: false, message };
      }
    },
    [
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
    isLoading,
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
