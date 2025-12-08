"use client";

import { useCallback, useMemo } from "react";
import { useProject } from "../context/ProjectContext";
import { useAuth } from "../context/AuthContext";
import { Project, ProjectStatus } from "../types/Types";
import { emitMembersChanged } from "../utils/membersBus";
import toast from "react-hot-toast";
import * as projectAPI from "../services/projectService";

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

  const addMember = useCallback(
    async (email: string): Promise<{ success: boolean; message: string }> => {
      if (!currentProject) {
        return { success: false, message: "Chưa chọn dự án" };
      }
      if (!user) {
        return { success: false, message: "Chưa đăng nhập" };
      }
      if (currentProject.status === "closed") {
        return {
          success: false,
          message: "Dự án đã bị đóng, không thể thêm thành viên",
        };
      }

      try {
        await projectAPI.addProjectMember(currentProject._id, email);
        await refreshMembers();
        emitMembersChanged(currentProject._id);
        return { success: true, message: "Đã thêm thành viên thành công" };
      } catch (error: unknown) {
        console.error("addMember error:", error);
        let message = "Thêm thành viên thất bại";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const err = error as any;

        if (err?.response?.data) {
          const data = err.response.data;

          if (data.errors?.[0]?.msg) {
            message = data.errors[0].msg;
          } else if (data.message) {
            message = data.message;
          } else if (typeof data === "string" && data.includes("<pre>Error:")) {
            const match = data.match(/<pre>Error:\s*([^<]+)/);
            if (match && match[1]) {
              message = match[1].trim();
            }
          }
        } else if (error instanceof Error && error.message) {
          message = error.message;
        }

        return { success: false, message };
      }
    },
    [currentProject, refreshMembers, user]
  );

  const removeMember = useCallback(
    async (
      profileId: string
    ): Promise<{ success: boolean; message: string }> => {
      if (!currentProject) {
        return { success: false, message: "Chưa chọn dự án" };
      }
      if (!user) {
        return { success: false, message: "Chưa đăng nhập" };
      }
      if (currentProject.status === "closed") {
        return {
          success: false,
          message: "Dự án đã bị đóng, không thể xóa thành viên",
        };
      }

      try {
        await projectAPI.removeProjectMember(currentProject._id, profileId);
        await refreshMembers();
        emitMembersChanged(currentProject._id);
        return { success: true, message: "Đã xóa thành viên" };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message || "Xóa thành viên thất bại"
            : "Xóa thành viên thất bại";
        return { success: false, message };
      }
    },
    [currentProject, refreshMembers, user]
  );

  const createProject = useCallback(
    async (
      name: string
    ): Promise<{ success: boolean; message?: string; project?: Project }> => {
      if (!user) {
        return { success: false, message: "Chưa đăng nhập" };
      }

      try {
        const created = await projectAPI.createProject({ name });

        setProjects((prev) => {
          if (prev.some((p) => p._id === created._id)) {
            return prev;
          }
          return [created, ...prev];
        });
        setCurrentProject(created);
        setCurrentProjectRole("leader");

        toast.success("Tạo dự án thành công!");
        return { success: true, project: created };
      } catch (e: unknown) {
        const errorMessage =
          e instanceof Error
            ? e.message || "Tạo dự án thất bại"
            : "Tạo dự án thất bại";
        toast.error(errorMessage);
        return { success: false, message: errorMessage };
      }
    },
    [setCurrentProject, setCurrentProjectRole, setProjects, user]
  );

  const deleteProject = useCallback(
    async (
      projectId: string
    ): Promise<{ success: boolean; message?: string }> => {
      if (!user) {
        return { success: false, message: "Chưa đăng nhập" };
      }

      try {
        await projectAPI.deleteProject(projectId);

        // Fetch lại danh sách dự án mới từ backend
        const allProjects = await projectAPI.getProjects();
        const updatedProjects = allProjects.projects;

        // Cập nhật state với danh sách mới
        setProjects(updatedProjects);

        // Nếu đang xóa dự án hiện tại, chọn dự án khác
        let nextProjectToSelect: Project | null = null;
        if (currentProject?._id === projectId) {
          if (updatedProjects.length > 0) {
            nextProjectToSelect = updatedProjects[0];
          }

          setCurrentProject(nextProjectToSelect);
          if (nextProjectToSelect && user) {
            setCurrentProjectRole(
              nextProjectToSelect.leader._id === user.id ? "leader" : "user"
            );
          } else {
            setCurrentProjectRole(null);
          }
        }

        toast.success("Xóa dự án thành công");
        return { success: true };
      } catch (error: unknown) {
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
    ): Promise<{ success: boolean; message?: string; data?: Project }> => {
      if (!user) {
        const message = "Chưa đăng nhập.";
        toast.error(message);
        return { success: false, message };
      }

      try {
        const updated = await projectAPI.updateProject(projectId, { status });

        setProjects((prev) =>
          prev.map((project) => (project._id === projectId ? updated : project))
        );

        if (currentProject?._id === projectId) {
          setCurrentProject(updated);
        }

        return { success: true, data: updated };
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message || "Cập nhật trạng thái dự án thất bại."
            : "Cập nhật trạng thái dự án thất bại.";
        toast.error(message);
        return { success: false, message };
      }
    },
    [user, currentProject, setProjects, setCurrentProject]
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
