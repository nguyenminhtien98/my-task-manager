"use client";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useRef,
} from "react";
import { database, subscribeToRealtime } from "../../lib/appwrite";
import { Query } from "appwrite";
import {
  Project,
  ProjectContextType,
  ProjectMemberProfile,
  BasicProfile,
} from "../types/Types";
import { useAuth } from "./AuthContext";
import { emitMembersChanged } from "../utils/membersBus";

const applyProjectStatus = (project: Project): Project => ({
  ...project,
  status: project.status ?? "active",
});

const normalizeProject = (project: Project | null): Project | null =>
  project ? applyProjectStatus(project) : null;

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [currentProject, setCurrentProjectState] = useState<Project | null>(
    null
  );
  const currentProjectRef = useRef<Project | null>(null);
  const projectsRef = useRef<Project[]>([]);
  const [currentProjectRole, setCurrentProjectRole] = useState<
    "leader" | "user" | null
  >(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const { user } = useAuth();
  const [isProjectsHydrated, setIsProjectsHydrated] = useState(false);
  const [isTasksHydrated, setIsTasksHydrated] = useState(false);
  const [members, setMembers] = useState<ProjectMemberProfile[]>([]);
  const [isMembersLoading, setIsMembersLoading] = useState(false);
  const lastRefreshTimeRef = useRef<number>(0);

  useEffect(() => {
    currentProjectRef.current = currentProject;
  }, [currentProject]);

  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  const refreshMembers = useCallback(async () => {
    if (!currentProject) {
      setMembers([]);
      return;
    }
    const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID;
    const membershipsCollectionId =
      process.env.NEXT_PUBLIC_COLLECTION_ID_PROJECT_MEMBERSHIPS;
    if (!databaseId || !membershipsCollectionId) {
      setMembers([]);
      return;
    }

    // Skip nếu vừa mới refresh trong vòng 1 giây
    const now = Date.now();
    if (now - lastRefreshTimeRef.current < 1000) {
      return;
    }
    lastRefreshTimeRef.current = now;

    setIsMembersLoading(true);
    try {
      const response = await database.listDocuments(
        String(databaseId),
        String(membershipsCollectionId),
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

      setMembers([leaderProfile, ...nonLeaderMembers]);
    } catch (error) {
      console.error("Failed to fetch project members:", error);
      setMembers([]);
    } finally {
      setIsMembersLoading(false);
    }
  }, [currentProject]);

  useEffect(() => {
    if (!currentProject) {
      setMembers([]);
      return;
    }
    void refreshMembers();
  }, [currentProject, refreshMembers]);

  const setCurrentProject = useCallback((project: Project | null) => {
    const normalized = normalizeProject(project);
    setCurrentProjectState(normalized);
    if (typeof window === "undefined") return;
    const storage = window.sessionStorage;
    if (normalized) {
      storage.setItem("activeProjectId", normalized.$id);
    } else {
      storage.removeItem("activeProjectId");
    }
  }, []);

  const refreshProjects = useCallback(async () => {
    if (!user) {
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem("activeProjectId");
      }
      setProjects([]);
      setCurrentProject(null);
      setCurrentProjectRole(null);
      setIsProjectsHydrated(true);
      return;
    }

    try {
      const membershipResponse = await database.listDocuments(
        String(process.env.NEXT_PUBLIC_DATABASE_ID),
        String(process.env.NEXT_PUBLIC_COLLECTION_ID_PROJECT_MEMBERSHIPS),
        [Query.equal("user", user.id)]
      );
      const memberProjectIds = membershipResponse.documents.map(
        (doc) => doc.project.$id
      );
      const leaderResponse = await database.listDocuments(
        String(process.env.NEXT_PUBLIC_DATABASE_ID),
        String(process.env.NEXT_PUBLIC_COLLECTION_ID_PROJECTS),
        [Query.equal("leader", user.id)]
      );
      const leaderProjectIds = leaderResponse.documents.map((doc) => doc.$id);

      const allProjectIds = [
        ...new Set([...memberProjectIds, ...leaderProjectIds]),
      ].filter((id) => id);

      if (allProjectIds.length === 0) {
        setProjects([]);
        setCurrentProject(null);
        setCurrentProjectRole(null);
        setIsProjectsHydrated(true);
        return;
      }

      const projectResponse = await database.listDocuments(
        String(process.env.NEXT_PUBLIC_DATABASE_ID),
        String(process.env.NEXT_PUBLIC_COLLECTION_ID_PROJECTS),
        [Query.equal("$id", allProjectIds)]
      );

      const myProjects = (
        projectResponse.documents as unknown as Project[]
      ).map((proj) => applyProjectStatus(proj));

      setProjects(myProjects);

      const prevProject = currentProjectRef.current;
      const currentProjectStillExists = prevProject
        ? myProjects.some((p) => p.$id === prevProject.$id)
        : false;

      if (myProjects.length) {
        const sortedProjects = [...myProjects].sort((a, b) => {
          if (a.$createdAt && b.$createdAt)
            return (
              new Date(b.$createdAt).getTime() -
              new Date(a.$createdAt).getTime()
            );
          return 0;
        });

        if (prevProject && currentProjectStillExists) {
          const updatedCurrentProject = myProjects.find(
            (p) => p.$id === prevProject.$id
          );
          if (updatedCurrentProject) {
            setCurrentProject(updatedCurrentProject);
            setCurrentProjectRole(
              updatedCurrentProject.leader.$id === user.id ? "leader" : "user"
            );
          }
        } else {
          const storedActiveProjectId =
            typeof window !== "undefined"
              ? window.sessionStorage.getItem("activeProjectId")
              : null;

          let activeProject = sortedProjects[0];

          if (storedActiveProjectId) {
            const found = myProjects.find(
              (proj) => proj.$id === storedActiveProjectId
            );
            if (found) {
              activeProject = found;
            } else {
            }
          }
          setCurrentProject(activeProject);
          setCurrentProjectRole(
            activeProject.leader.$id === user.id ? "leader" : "user"
          );
        }
      } else {
        setCurrentProject(null);
        setCurrentProjectRole(null);
      }
    } catch (error) {
      console.error("❌ Failed to fetch projects:", error);
    } finally {
      setIsProjectsHydrated(true);
    }
  }, [user, setCurrentProject, setCurrentProjectRole, setProjects]);

  useEffect(() => {
    void refreshProjects();
  }, [refreshProjects]);

  useEffect(() => {
    if (!currentProject) return;
    const latest = projects.find((proj) => proj.$id === currentProject.$id);
    if (!latest) return;
    if (
      latest.status !== currentProject.status ||
      latest.name !== currentProject.name ||
      latest.themeColor !== currentProject.themeColor
    ) {
      setCurrentProject(latest);
      setCurrentProjectRole(latest.leader.$id === user?.id ? "leader" : "user");
    }
  }, [
    projects,
    currentProject,
    setCurrentProject,
    setCurrentProjectRole,
    user?.id,
  ]);

  useEffect(() => {
    if (!currentProject) return;
    const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID;
    const membershipsCollectionId =
      process.env.NEXT_PUBLIC_COLLECTION_ID_PROJECT_MEMBERSHIPS;
    if (!databaseId || !membershipsCollectionId) return;
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
      const payload =
        (event.payload?.data as { project?: unknown } | undefined) ??
        event.payload ??
        null;
      const projectValue =
        typeof payload?.project === "string"
          ? payload.project
          : (payload?.project as { $id?: string } | undefined)?.$id;
      if (projectValue && projectValue === currentProject.$id) {
        void refreshMembers();
        emitMembersChanged(currentProject.$id);
      }
    });
    return () => unsubscribe();
  }, [currentProject, refreshMembers]);

  useEffect(() => {
    if (!user) return;
    const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID;
    const membershipsCollectionId =
      process.env.NEXT_PUBLIC_COLLECTION_ID_PROJECT_MEMBERSHIPS;
    const projectsCollectionId = process.env.NEXT_PUBLIC_COLLECTION_ID_PROJECTS;

    if (!databaseId || !membershipsCollectionId || !projectsCollectionId) {
      return;
    }

    const channel = `databases.${databaseId}.collections.${membershipsCollectionId}.documents`;
    const unsubscribe = subscribeToRealtime([channel], async (res: unknown) => {
      const payload = res as {
        events?: string[];
        payload?: {
          $id?: string;
          $permissions?: string[];
          data?: {
            user?: string | { $id?: string };
            project?: string | { $id?: string };
          };
        };
      };

      const events = payload?.events ?? [];
      if (!events.length) {
        return;
      }

      const rawData =
        payload.payload?.data ??
        (payload.payload as unknown as {
          user?: string | { $id?: string };
          project?: string | { $id?: string };
        });
      if (events.some((event) => event.endsWith(".delete"))) {
        const permissions = payload.payload?.$permissions ?? [];

        const userIdFromPermission = permissions
          .map((perm) => {
            const match = perm.match(/user:([a-zA-Z0-9]+)/);
            return match ? match[1] : null;
          })
          .filter(Boolean)[0];

        if (!userIdFromPermission || userIdFromPermission !== user.id) {
          return;
        }
        await refreshProjects();
        return;
      }

      if (!rawData) {
        return;
      }

      const membershipUserId =
        typeof rawData.user === "string" ? rawData.user : rawData.user?.$id;

      if (!membershipUserId || membershipUserId !== user.id) {
        return;
      }

      const membershipProjectId =
        typeof rawData.project === "string"
          ? rawData.project
          : rawData.project?.$id;

      if (!membershipProjectId) {
        return;
      }

      if (
        events.some((event) => event.endsWith(".create")) ||
        events.some((event) => event.endsWith(".update"))
      ) {
        await refreshProjects();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [refreshProjects, user]);

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
          const value = (
            updatedProject as unknown as {
              leader?: unknown;
            }
          ).leader;
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
          setCurrentProjectRole(leader.$id === user.id ? "leader" : "user");
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

  const isProjectClosed =
    (currentProject?.status ?? "active") === "closed";

  return (
    <ProjectContext.Provider
      value={{
        currentProject,
        setCurrentProject,
        currentProjectRole,
        setCurrentProjectRole,
        projects,
        setProjects,
        isProjectsHydrated,
        isTasksHydrated,
        setTasksHydrated: setIsTasksHydrated,
        isProjectClosed,
        members,
        isMembersLoading,
        refreshMembers,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context)
    throw new Error("useProject must be used within a ProjectProvider");
  return context;
};

const ensureProjectStatus = (project: Project): Project => ({
  ...project,
  status: project.status ?? "active",
});
