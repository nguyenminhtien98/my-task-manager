"use client";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { database } from "../appwrite";
import { Query } from "appwrite";
import { Project, ProjectContextType } from "../types/Types";
import { useAuth } from "./AuthContext";

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
  const [currentProjectRole, setCurrentProjectRole] = useState<
    "leader" | "user" | null
  >(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const { user } = useAuth();
  const [isProjectsHydrated, setIsProjectsHydrated] = useState(false);
  const [isTasksHydrated, setIsTasksHydrated] = useState(false);

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

  useEffect(() => {
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

    const fetchProjects = async () => {
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

        if (myProjects.length) {
          const sortedProjects = [...myProjects].sort((a, b) => {
            if (a.$createdAt && b.$createdAt)
              return (
                new Date(b.$createdAt).getTime() -
                new Date(a.$createdAt).getTime()
              );
            return 0;
          });

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
            }
          }

          setCurrentProject(activeProject);
          setCurrentProjectRole(
            activeProject.leader.$id === user.id ? "leader" : "user"
          );
        } else {
          setCurrentProject(null);
          setCurrentProjectRole(null);
        }
      } catch (error) {
        console.error("Failed to fetch projects:", error);
      } finally {
        setIsProjectsHydrated(true);
      }
    };

    fetchProjects();
  }, [user, setCurrentProject, setCurrentProjectRole, setProjects]);

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
      setCurrentProjectRole(
        latest.leader.$id === user?.id ? "leader" : "user"
      );
    }
  }, [projects, currentProject, setCurrentProject, setCurrentProjectRole, user?.id]);

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
        isProjectClosed: (currentProject?.status ?? "active") === "closed",
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
