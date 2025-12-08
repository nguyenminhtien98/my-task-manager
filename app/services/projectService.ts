import axios from "@/lib/axios";
import type {
  ProjectMember,
  ProjectResponse,
  ProjectDetailResponse,
  MemberStatistics,
} from "../types/Types";

export const createProject = async (data: {
  name: string;
  themeColor?: string;
}): Promise<ProjectResponse> => {
  const response = await axios.post<{
    success: boolean;
    data: ProjectResponse;
  }>("/projects", data);
  return response.data.data;
};

export const getProjects = async (params?: {
  page?: number;
  limit?: number;
  status?: "active" | "closed";
}): Promise<{
  projects: ProjectResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> => {
  const response = await axios.get<{
    success: boolean;
    data: ProjectResponse[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>("/projects", { params });
  return {
    projects: response.data.data,
    pagination: response.data.pagination,
  };
};

export const getProjectDetail = async (
  projectId: string
): Promise<ProjectDetailResponse> => {
  const response = await axios.get<{
    success: boolean;
    data: ProjectDetailResponse;
  }>(`/projects/${projectId}`);
  return response.data.data;
};

export const updateProject = async (
  projectId: string,
  data: {
    name?: string;
    themeColor?: string;
    status?: "active" | "closed";
  }
): Promise<ProjectResponse> => {
  const response = await axios.put<{
    success: boolean;
    data: ProjectResponse;
  }>(`/projects/${projectId}`, data);
  return response.data.data;
};

export const deleteProject = async (projectId: string): Promise<void> => {
  await axios.delete(`/projects/${projectId}`);
};

export const addProjectMember = async (
  projectId: string,
  email: string
): Promise<ProjectMember> => {
  const response = await axios.post<{
    success: boolean;
    message: string;
    data: ProjectMember;
  }>(`/projects/${projectId}/members`, { email });
  return response.data.data;
};

export const removeProjectMember = async (
  projectId: string,
  profileId: string
): Promise<void> => {
  await axios.delete(`/projects/${projectId}/members/${profileId}`);
};

export const getMemberStatistics = async (
  projectId: string,
  profileId: string
): Promise<MemberStatistics> => {
  const response = await axios.get<{
    success: boolean;
    data: MemberStatistics;
  }>(`/projects/${projectId}/members/${profileId}/statistics`);
  return response.data.data;
};
