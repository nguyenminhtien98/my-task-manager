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
import {
  Project,
  ProjectContextType,
  ProjectMemberProfile,
} from "../types/Types";
import { useAuth } from "./AuthContext";
import { useSocket } from "./SocketContext";
import { emitMembersChanged } from "../utils/membersBus";
import * as projectAPI from "../services/projectService";

const applyProjectStatus = (project: Project): Project => ({
  ...project,
  status: project.status ?? "active",
});

const normalizeProject = (project: Project | null): Project | null =>
  project ? applyProjectStatus(project) : null;

export const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

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
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [isLoadingAllProjects, setIsLoadingAllProjects] = useState(false);
  const { user, isAuthHydrated } = useAuth();
  const { socket, isConnected } = useSocket();
  const [isProjectsHydrated, setIsProjectsHydrated] = useState(false);
  const [isTasksHydrated, setIsTasksHydrated] = useState(false);
  const [members, setMembers] = useState<ProjectMemberProfile[]>([]);
  const [isMembersLoading, setIsMembersLoading] = useState(false);
  const [projectsPage, setProjectsPage] = useState(1);
  const [hasMoreProjects, setHasMoreProjects] = useState(false);
  const [isLoadingMoreProjects, setIsLoadingMoreProjects] = useState(false);
  const totalProjectsPagesRef = useRef(1);
  const lastRefreshTimeRef = useRef<number>(0);
  const lastFetchedUserIdRef = useRef<string | null>(null);
  const locallyCreatedProjectIdsRef = useRef<Set<string>>(new Set());
  const isRefreshingRef = useRef<boolean>(false);
  const hasInitializedRef = useRef<boolean>(false);
  const hasFetchedMembersRef = useRef<boolean>(false);
  const isFetchingMembersRef = useRef<boolean>(false);
  const currentProjectIdRef = useRef<string | null>(null);

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

    if (isFetchingMembersRef.current) {
      return;
    }

    const now = Date.now();
    if (now - lastRefreshTimeRef.current < 1000) {
      return;
    }
    lastRefreshTimeRef.current = now;

    setIsMembersLoading(true);
    isFetchingMembersRef.current = true;
    try {
      const detail = await projectAPI.getProjectDetail(currentProject._id);

      const projectMembers: ProjectMemberProfile[] = detail.members.map((m) => ({
        _id: m._id,
        name: m.name,
        email: m.email,
        avatarUrl: m.avatarUrl,
        role: m.role,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
        isLeader: m._id === detail.leader._id,
      }));

      setMembers(projectMembers);
    } catch (error) {
      console.error("Failed to fetch project members:", error);
      setMembers([]);
    } finally {
      setIsMembersLoading(false);
      isFetchingMembersRef.current = false;
    }
  }, [currentProject]);
  useEffect(() => {
    const projectId = currentProject?._id;

    if (!currentProject || !projectId) {
      setMembers([]);
      return;
    }

    if (currentProjectIdRef.current !== projectId) {
      hasFetchedMembersRef.current = false;
      currentProjectIdRef.current = projectId;
    }

    if (hasFetchedMembersRef.current) {
      return;
    }

    hasFetchedMembersRef.current = true;
    void refreshMembers();

  }, [currentProject, refreshMembers]);

  const setCurrentProject = useCallback((project: Project | null) => {
    const normalized = normalizeProject(project);
    setCurrentProjectState(normalized);
    if (typeof window === "undefined") return;
    const storage = window.sessionStorage;
    if (normalized) {
      storage.setItem("activeProjectId", normalized._id);
    } else {
      storage.removeItem("activeProjectId");
    }
  }, []);

  const refreshProjects = useCallback(async (force = false) => {

    if (isRefreshingRef.current && !force) {
      return;
    }

    if (!user) {
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem("activeProjectId");
      }
      setProjects([]);
      setCurrentProject(null);
      setCurrentProjectRole(null);
      setIsProjectsHydrated(true);
      lastFetchedUserIdRef.current = null;
      return;
    }

    if (!user.id) {
      setProjects([]);
      setCurrentProjectRole(null);
      setIsProjectsHydrated(true);
      return;
    }

    if (!force && lastFetchedUserIdRef.current === user.id) {
      return;
    }

    try {
      isRefreshingRef.current = true;
      lastFetchedUserIdRef.current = user.id;
      setProjectsPage(1);
      const { projects: fetchedProjects, pagination } = await projectAPI.getProjects({
        page: 1,
        limit: 10,
      });

      const myProjects: Project[] = fetchedProjects;
      totalProjectsPagesRef.current = pagination.totalPages;
      setHasMoreProjects(pagination.page < pagination.totalPages);

      setProjects(myProjects);

      const prevProject = currentProjectRef.current;
      const currentProjectStillExists = prevProject
        ? myProjects.some((p) => p._id === prevProject._id)
        : false;

      if (myProjects.length) {
        const sortedProjects = [...myProjects].sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        if (prevProject && currentProjectStillExists) {
          const updatedCurrentProject = myProjects.find(
            (p) => p._id === prevProject._id
          );
          if (updatedCurrentProject) {
            setCurrentProject(updatedCurrentProject);
            setCurrentProjectRole(
              updatedCurrentProject.leader._id === user.id ? "leader" : "user"
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
              (proj) => proj._id === storedActiveProjectId
            );
            if (found) {
              activeProject = found;
            }
          }
          setCurrentProject(activeProject);
          setCurrentProjectRole(
            activeProject.leader._id === user.id ? "leader" : "user"
          );
        }
      } else {
        setCurrentProject(null);
        setCurrentProjectRole(null);
      }
      setIsProjectsHydrated(true);
    } catch (error) {
      const response = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { status?: number } }).response
        : undefined;
      const isServerError = !response || (response?.status && response.status >= 500);

      if (isServerError) {
        isRefreshingRef.current = false;
        return;
      }

      setIsProjectsHydrated(true);
    } finally {
      isRefreshingRef.current = false;
    }
  }, [user, setCurrentProject, setCurrentProjectRole, setProjects]);

  const loadMoreProjects = useCallback(async () => {
    if (isLoadingMoreProjects || !hasMoreProjects || !user?.id) return;

    setIsLoadingMoreProjects(true);
    try {
      const nextPage = projectsPage + 1;
      const { projects: fetchedProjects, pagination } = await projectAPI.getProjects({
        page: nextPage,
        limit: 10,
      });

      setProjects((prev) => [...prev, ...fetchedProjects]);
      setProjectsPage(nextPage);
      setHasMoreProjects(pagination.page < pagination.totalPages);
    } catch (error) {
      console.error("Failed to load more projects:", error);
    } finally {
      setIsLoadingMoreProjects(false);
    }
  }, [isLoadingMoreProjects, hasMoreProjects, user?.id, projectsPage]);

  const loadAllProjects = useCallback(async () => {
    if (!user?.id || isLoadingAllProjects) return;

    setIsLoadingAllProjects(true);
    try {
      let allFetchedProjects: Project[] = [];
      let currentPage = 1;
      let totalPages = 1;

      do {
        const { projects: fetchedProjects, pagination } = await projectAPI.getProjects({
          page: currentPage,
          limit: 100,
        });
        allFetchedProjects = [...allFetchedProjects, ...fetchedProjects];
        totalPages = pagination.totalPages;
        currentPage++;
      } while (currentPage <= totalPages);

      setAllProjects(allFetchedProjects);
    } catch (error) {
      console.error("Failed to load all projects:", error);
    } finally {
      setIsLoadingAllProjects(false);
    }
  }, [user?.id, isLoadingAllProjects]);

  useEffect(() => {
    if (hasInitializedRef.current) return;

    if (!isAuthHydrated) return;

    if (!user?.id) {
      setProjects([]);
      setAllProjects([]);
      setCurrentProject(null);
      setCurrentProjectRole(null);
      setIsProjectsHydrated(true);
      return;
    }

    hasInitializedRef.current = true;
    void refreshProjects();

    return () => {
      hasInitializedRef.current = false;
    };
  }, [user?.id, isAuthHydrated, refreshProjects, setCurrentProject]);

  useEffect(() => {
    if (!currentProject) return;
    const latest = projects.find((proj) => proj._id === currentProject._id);
    if (!latest) return;
    if (
      latest.status !== currentProject.status ||
      latest.name !== currentProject.name ||
      latest.themeColor !== currentProject.themeColor
    ) {
      setCurrentProject(latest);
      setCurrentProjectRole(latest.leader._id === user?.id ? "leader" : "user");
    }
  }, [
    projects,
    currentProject,
    setCurrentProject,
    setCurrentProjectRole,
    user?.id,
  ]);

  useEffect(() => {
    if (!socket || !isConnected || !currentProject) return;

    const handleMemberChange = (data: { projectId: string }) => {
      if (data.projectId === currentProject._id) {
        void refreshMembers();
        emitMembersChanged(currentProject._id);
      }
    };

    socket.on("project:member:added", handleMemberChange);
    socket.on("project:member:removed", handleMemberChange);

    return () => {
      socket.off("project:member:added", handleMemberChange);
      socket.off("project:member:removed", handleMemberChange);
    };
  }, [socket, isConnected, currentProject, refreshMembers]);

  useEffect(() => {

    if (!socket || !isConnected || !user) return;

    const handleMembershipChange = async (data: {
      projectId: string;
      userId?: string;
      profile?: { _id: string; name: string; email: string; avatarUrl?: string | null };
    }) => {
      const affectedUserId = data.userId || data.profile?._id;

      if (affectedUserId === user.id) {
        const hadNoProjects = !currentProjectRef.current && projectsRef.current.length === 0;

        await refreshProjects(true);

        const updatedProjects = projectsRef.current;

        if (hadNoProjects && updatedProjects.length > 0) {
          const newProject = updatedProjects.find(p => p._id === data.projectId) || updatedProjects[0];
          setCurrentProject(newProject);
          return;
        }

        if (currentProjectRef.current && data.projectId === currentProjectRef.current._id) {

          const stillInProject = updatedProjects.some(p => p._id === data.projectId);

          if (!stillInProject) {

            const nextProject = updatedProjects.length > 0 ? updatedProjects[0] : null;
            setCurrentProject(nextProject);
          }
        }
      }
    };

    const handleNotification = (data: unknown) => {

      const notifications = Array.isArray(data) ? data : [data];

      if (notifications.length === 0) return;

      const notification = notifications[0] as { type: string; recipient: string; metadata?: { projectId?: string } };

      if (notification.type === 'project.member_added' && notification.recipient === user.id) {
        const projectId = notification.metadata?.projectId;
        if (projectId) {
          socket.emit('project:join', projectId);

          void handleMembershipChange({ userId: user.id, projectId });
        }
      }

      if (notification.type === 'project.member_removed' && notification.recipient === user.id) {
        const projectId = notification.metadata?.projectId;
        if (projectId) {
          void handleMembershipChange({ userId: user.id, projectId });
        }
      }
    };

    socket.on("project:member:added", handleMembershipChange);
    socket.on("project:member:removed", handleMembershipChange);
    socket.on("notification:new", handleNotification);


    return () => {
      socket.off("project:member:added", handleMembershipChange);
      socket.off("project:member:removed", handleMembershipChange);
      socket.off("notification:new", handleNotification);
    };
  }, [socket, isConnected, refreshProjects, user, setCurrentProject]);

  useEffect(() => {
    if (!socket || !isConnected || !user) return;

    const handleProjectCreated = (project: Project) => {

      if (locallyCreatedProjectIdsRef.current.has(project._id)) {
        locallyCreatedProjectIdsRef.current.delete(project._id);
        return;
      }

      setProjects((prev) => {
        const exists = prev.some((p) => p._id === project._id);
        if (exists) {
          return prev;
        }
        return [...prev, project];
      });
    };

    const handleProjectUpdated = (project: Project) => {
      setProjects((prev) =>
        prev.map((p) =>
          p._id === project._id
            ? {
              ...p,
              ...project,
              leader: project.leader ?? p.leader,
              status: project.status ?? p.status,
            }
            : p
        )
      );

      if (currentProject?._id === project._id) {
        const nextProject: Project = {
          ...currentProject,
          ...project,
          leader: project.leader ?? currentProject.leader,
          status: project.status ?? currentProject.status,
        };
        setCurrentProject(nextProject);
        setCurrentProjectRole(nextProject.leader._id === user.id ? "leader" : "user");
      }
    };

    const handleProjectDeleted = (data: { projectId: string }) => {
      setProjects((prev) => {
        const updated = prev.filter((p) => p._id !== data.projectId);
        if (currentProject?._id === data.projectId) {
          const nextProject = updated[0] ?? null;
          setCurrentProject(nextProject);
          setCurrentProjectRole(
            nextProject
              ? nextProject.leader._id === user.id
                ? "leader"
                : "user"
              : null
          );
        }
        return updated;
      });
    };

    socket.on("project:created", handleProjectCreated);
    socket.on("project:updated", handleProjectUpdated);
    socket.on("project:deleted", handleProjectDeleted);

    return () => {
      socket.off("project:created", handleProjectCreated);
      socket.off("project:updated", handleProjectUpdated);
      socket.off("project:deleted", handleProjectDeleted);
    };
  }, [socket, isConnected, user, currentProject, setProjects, setCurrentProject, setCurrentProjectRole]); const isProjectClosed =
    (currentProject?.status ?? "active") === "closed";

  const markProjectAsLocallyCreated = useCallback((projectId: string) => {
    locallyCreatedProjectIdsRef.current.add(projectId);
  }, []);

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
        markProjectAsLocallyCreated,
        hasMoreProjects,
        isLoadingMoreProjects,
        loadMoreProjects,
        allProjects,
        isLoadingAllProjects,
        loadAllProjects,
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
