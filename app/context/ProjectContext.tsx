"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { database } from "../appwrite";
import { Project, ProjectContextType } from "../types/Types";
import { useAuth } from "./AuthContext";

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentProject, setCurrentProjectState] = useState<Project | null>(null);
    const [currentProjectRole, setCurrentProjectRole] = useState<"leader" | "user" | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const { user } = useAuth();

    // Hàm helper để cập nhật active project trong state và lưu vào localStorage
    const setCurrentProject = (project: Project | null) => {
        setCurrentProjectState(project);
        if (project) {
            localStorage.setItem("activeProjectId", project.id);
        } else {
            localStorage.removeItem("activeProjectId");
        }
    };

    useEffect(() => {
        if (!user) {
            localStorage.removeItem("activeProjectId");
            setProjects([]);
            setCurrentProject(null);
            setCurrentProjectRole(null);
            return;
        }

        const fetchProjects = async () => {
            try {
                const res = await database.listDocuments(
                    String(process.env.NEXT_PUBLIC_DATABASE_ID),
                    String(process.env.NEXT_PUBLIC_COLLECTION_ID_PROJECTS)
                );
                const myProjects = (res.documents as unknown as Project[]).filter((proj) => {
                    return proj.leaderId === user.id || (proj.members && proj.members.includes(user.name));
                });
                setProjects(myProjects);
                if (myProjects.length) {
                    const sortedProjects = myProjects.sort((a, b) => {
                        if (a.createdAt && b.createdAt)
                            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                        return 0;
                    });
                    const storedActiveProjectId = localStorage.getItem("activeProjectId");
                    let activeProject = sortedProjects[0];
                    if (storedActiveProjectId) {
                        const found = myProjects.find((proj) => proj.id === storedActiveProjectId);
                        if (found) {
                            activeProject = found;
                        }
                    }
                    setCurrentProject(activeProject);
                    setCurrentProjectRole(activeProject.leaderId === user.id ? "leader" : "user");
                } else {
                    setCurrentProject(null);
                    setCurrentProjectRole(null);
                }
            } catch (error) {
                console.error("Lỗi fetch project:", error);
            }
        };
        fetchProjects();
    }, [user]);

    return (
        <ProjectContext.Provider
            value={{
                currentProject,
                setCurrentProject,
                currentProjectRole,
                setCurrentProjectRole,
                projects,
                setProjects,
            }}
        >
            {children}
        </ProjectContext.Provider>
    );
};

export const useProject = () => {
    const context = useContext(ProjectContext);
    if (!context) throw new Error("useProject must be used within a ProjectProvider");
    return context;
};
