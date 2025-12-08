import axiosInstance from "@/lib/axios";
import type {
  TaskFromBE,
  CreateTaskData,
  UpdateTaskData,
  TaskFilterParams,
  TaskListResponse,
} from "@/app/types/Types";

export const createTask = async (
  projectId: string,
  data: CreateTaskData
): Promise<TaskFromBE> => {
  const response = await axiosInstance.post<{
    success: boolean;
    data: TaskFromBE;
  }>(`/projects/${projectId}/tasks`, data);
  return response.data.data;
};

export const getBoardTasks = async (
  projectId: string,
  params?: Omit<TaskFilterParams, "status" | "page">
): Promise<{
  list: { tasks: TaskFromBE[]; total: number; hasMore: boolean };
  doing: { tasks: TaskFromBE[]; total: number; hasMore: boolean };
  done: { tasks: TaskFromBE[]; total: number; hasMore: boolean };
  completed: { tasks: TaskFromBE[]; total: number; hasMore: boolean };
  bug: { tasks: TaskFromBE[]; total: number; hasMore: boolean };
}> => {
  const queryParams = new URLSearchParams();

  if (params?.limit) queryParams.append("limit", String(params.limit));
  if (params?.noAssignee) queryParams.append("noAssignee", "true");
  if (params?.myTasks) queryParams.append("myTasks", "true");
  if (params?.selectedMembers && params.selectedMembers.length > 0) {
    queryParams.append("selectedMembers", params.selectedMembers.join(","));
  }
  if (params?.noDueDate) queryParams.append("noDueDate", "true");
  if (params?.overdue) queryParams.append("overdue", "true");
  if (params?.priorities && params.priorities.length > 0) {
    queryParams.append("priorities", params.priorities.join(","));
  }
  if (params?.issueTypes && params.issueTypes.length > 0) {
    queryParams.append("issueTypes", params.issueTypes.join(","));
  }
  if (params?.search) queryParams.append("search", params.search);

  const response = await axiosInstance.get<{
    success: boolean;
    data: {
      list: { tasks: TaskFromBE[]; total: number; hasMore: boolean };
      doing: { tasks: TaskFromBE[]; total: number; hasMore: boolean };
      done: { tasks: TaskFromBE[]; total: number; hasMore: boolean };
      completed: { tasks: TaskFromBE[]; total: number; hasMore: boolean };
      bug: { tasks: TaskFromBE[]; total: number; hasMore: boolean };
    };
  }>(`/projects/${projectId}/tasks/board?${queryParams.toString()}`);

  return response.data.data;
};

export const getTasks = async (
  projectId: string,
  params?: TaskFilterParams
): Promise<TaskListResponse> => {
  const queryParams = new URLSearchParams();

  if (params?.page) queryParams.append("page", String(params.page));
  if (params?.limit) queryParams.append("limit", String(params.limit));
  if (params?.status) queryParams.append("status", params.status);
  if (params?.noAssignee) queryParams.append("noAssignee", "true");
  if (params?.myTasks) queryParams.append("myTasks", "true");
  if (params?.selectedMembers && params.selectedMembers.length > 0) {
    queryParams.append("selectedMembers", params.selectedMembers.join(","));
  }
  if (params?.noDueDate) queryParams.append("noDueDate", "true");
  if (params?.overdue) queryParams.append("overdue", "true");
  if (params?.priorities && params.priorities.length > 0) {
    queryParams.append("priorities", params.priorities.join(","));
  }
  if (params?.issueTypes && params.issueTypes.length > 0) {
    queryParams.append("issueTypes", params.issueTypes.join(","));
  }
  if (params?.search) queryParams.append("search", params.search);

  const response = await axiosInstance.get<{
    success: boolean;
    data: TaskFromBE[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>(`/projects/${projectId}/tasks?${queryParams.toString()}`);

  return {
    tasks: response.data.data,
    pagination: response.data.pagination,
  };
};

export const getTaskDetail = async (taskId: string): Promise<TaskFromBE> => {
  const response = await axiosInstance.get<{
    success: boolean;
    data: TaskFromBE;
  }>(`/tasks/${taskId}`);
  return response.data.data;
};

export const updateTask = async (
  taskId: string,
  data: UpdateTaskData
): Promise<TaskFromBE> => {
  const response = await axiosInstance.put<{
    success: boolean;
    data: TaskFromBE;
  }>(`/tasks/${taskId}`, data);
  return response.data.data;
};

export const deleteTask = async (taskId: string): Promise<void> => {
  await axiosInstance.delete(`/tasks/${taskId}`);
};

export const claimTask = async (taskId: string): Promise<TaskFromBE> => {
  const response = await axiosInstance.put<{
    success: boolean;
    data: TaskFromBE;
  }>(`/tasks/${taskId}/claim`);
  return response.data.data;
};

export const reorderTasks = async (
  projectId: string,
  tasks: Array<{ taskId: string; order: number }>
): Promise<void> => {
  await axiosInstance.put(`/projects/${projectId}/tasks/reorder`, { tasks });
};
