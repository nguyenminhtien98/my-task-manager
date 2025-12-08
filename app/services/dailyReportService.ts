import axiosInstance from "@/lib/axios";
import type {
  DailyReport,
  DailyReportRoom,
  GetReportsParams,
  GetReportsResponse,
} from "../types/Types";

export const getRoomConfig = async (
  projectId: string
): Promise<DailyReportRoom | null> => {
  try {
    const response = await axiosInstance.get(
      `/daily-reports/room/${projectId}`
    );
    return response.data.data;
  } catch (error) {
    console.error("Error fetching daily report room config:", error);
    return null;
  }
};

export const createDailyReport = async (
  projectId: string,
  content: string
): Promise<DailyReport> => {
  const response = await axiosInstance.post(
    `/projects/${projectId}/daily-reports`,
    { content }
  );
  return response.data.data;
};

export const updateDailyReport = async (
  reportId: string,
  content: string
): Promise<DailyReport> => {
  const response = await axiosInstance.put(`/daily-reports/${reportId}`, {
    content,
  });
  return response.data.data;
};

export const getDailyReports = async (
  params: GetReportsParams
): Promise<GetReportsResponse> => {
  const { projectId, ...queryParams } = params;
  const response = await axiosInstance.get(
    `/projects/${projectId}/daily-reports`,
    { params: queryParams }
  );
  return response.data;
};

export const deleteDailyReport = async (reportId: string): Promise<void> => {
  await axiosInstance.delete(`/daily-reports/${reportId}`);
};

export const getDailyReportRoom = async (
  projectId: string
): Promise<DailyReportRoom> => {
  const response = await axiosInstance.get(
    `/projects/${projectId}/daily-report-room`
  );
  return response.data.data;
};

export const updateDailyReportRoom = async (
  projectId: string,
  settings: {
    isEnabled: boolean;
    remindTimeMinutes: number;
    remindWeekdays: number[];
    timezone: string;
  }
): Promise<DailyReportRoom> => {
  const response = await axiosInstance.put(
    `/projects/${projectId}/daily-report-room`,
    settings
  );
  return response.data.data;
};
