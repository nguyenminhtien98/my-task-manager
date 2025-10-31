"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Query } from "appwrite";
import { database, subscribeToRealtime } from "../appwrite";
import { useProject } from "../context/ProjectContext";
import { useAuth } from "../context/AuthContext";
import { BasicProfile, Project } from "../types/Types";
import { emitMembersChanged, onMembersChanged } from "../../lib/membersBus";
import toast from "react-hot-toast";

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
  // Track projects that are being created locally to avoid duplicate in realtime
  const locallyCreatedProjectIdsRef = useRef<Set<string>>(new Set());

  const refetch = () => setVersion((v) => v + 1);

  // Fetch project members
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

  // Listen to members changed events
  useEffect(() => {
    if (!currentProject) return;
    const unsubscribe = onMembersChanged((projectId) => {
      if (currentProject && projectId === currentProject.$id) {
        refetch();
      }
    });
    return unsubscribe;
  }, [currentProject]);

  // Realtime subscription for projects
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

      // Handle delete event
      if (events.some((e) => e.endsWith(".delete"))) {
        if (documentId) {
          setProjects((prev) => {
            const updated = prev.filter((p) => p.$id !== documentId);
            // If deleted project is current project, switch to next project
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

      // Handle create event
      if (events.some((e) => e.endsWith(".create"))) {
        if (!rawData) return;
        const newProject = rawData as Project;

        // Skip if this project was created locally (will be handled by createProject function)
        if (locallyCreatedProjectIdsRef.current.has(newProject.$id)) {
          // Remove from ref after handling to allow future updates
          locallyCreatedProjectIdsRef.current.delete(newProject.$id);
          return;
        }

        // Only add if user is leader or member of this project
        // Check if user is leader
        // const isLeader = newProject.leader?.$id === user.id;
        // For member check, we need to verify membership, but for now we'll add it
        // The ProjectContext will filter properly on next fetch

        setProjects((prev) => {
          // Check if project already exists (double check to prevent race conditions)
          if (prev.some((p) => p.$id === newProject.$id)) {
            return prev;
          }
          return [...prev, newProject];
        });
      } else if (events.some((e) => e.endsWith(".update"))) {
        // Handle update event
        if (!rawData) return;
        const updatedProject = rawData as Project;

        setProjects((prev) =>
          prev.map((p) => (p.$id === updatedProject.$id ? updatedProject : p))
        );

        // Update current project if it's the one being updated
        if (currentProject?.$id === updatedProject.$id) {
          setCurrentProject(updatedProject);
          setCurrentProjectRole(
            updatedProject.leader.$id === user.id ? "leader" : "user"
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
    [currentProject]
  );

  const removeMember = useCallback(
    async (
      membershipId: string
    ): Promise<{ success: boolean; message: string }> => {
      if (!currentProject) {
        return { success: false, message: "Chưa chọn dự án" };
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
    [currentProject]
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

        // Create project document
        const projectDocument = await database.createDocument(
          databaseId,
          projectsCollectionId,
          "unique()",
          {
            name: name,
            leader: user.id,
          }
        );

        // Create membership for leader
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

        const createdProject: Project = {
          $id: projectDocument.$id,
          name: projectDocument.name,
          leader: projectDocument.leader,
          $createdAt: projectDocument.$createdAt,
        };

        // Mark this project as locally created to skip realtime update
        locallyCreatedProjectIdsRef.current.add(createdProject.$id);

        // Update context state
        setCurrentProject(createdProject);
        setCurrentProjectRole("leader");
        setProjects((prevProjects) => {
          // Double check to prevent duplicates
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
        // Delete all memberships
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

        // Delete all tasks
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

        // Delete project
        await database.deleteDocument(
          String(databaseId),
          String(projectsCollectionId),
          projectId
        );

        // Update context state (realtime will also handle this, but we do it here for immediate UI update)
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

  return {
    members,
    isLoading,
    leader,
    addMember,
    removeMember,
    createProject,
    deleteProject,
  };
};

export type UseProjectOperationsResult = ReturnType<
  typeof useProjectOperations
>;
