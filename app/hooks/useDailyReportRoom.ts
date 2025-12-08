"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useSocket } from "../context/SocketContext";
import type { User } from "../context/AuthContext";
import type { Project, ProjectMemberProfile } from "../types/Types";
import { sanitizeReportHtml } from "../utils/richText";
import * as dailyReportAPI from "../services/dailyReportService";
import type {
  DailyReport,
  DailyReportRoom,
  GetReportsParams,
} from "../types/Types";

export interface DailyReportFilters {
  myReports: boolean;
  date: string | null;
}

export interface DailyReportEntry {
  _id: string;
  reportId: string;
  author: {
    _id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailyReportGroup {
  dateKey: string;
  dateLabel: string;
  entries: DailyReportEntry[];
}

export interface DailyReportToolbarState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  ordered: boolean;
  bullet: boolean;
}

export interface DailyReportSettings {
  remindEnabled: boolean;
  remindTime: string;
  remindWeekdays: string[];
}

export interface MentionOption {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

interface UseDailyReportRoomOptions {
  currentUser?: User | null;
  currentProject?: Project | null;
  projectMembers?: ProjectMemberProfile[];
}

const DEFAULT_DAILY_REPORT_SETTINGS: DailyReportSettings = {
  remindEnabled: true,
  remindTime: "09:00",
  remindWeekdays: ["1", "2", "3", "4", "5"],
};

const FALLBACK_MEMBERS: MentionOption[] = [
  { id: "fallback-1", name: "Nguyễn Văn An", avatarUrl: null },
  { id: "fallback-2", name: "Trần Thị Bình", avatarUrl: null },
  { id: "fallback-3", name: "Phạm Hoài Nam", avatarUrl: null },
];

const formatDateKey = (iso: string) => {
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const minutesToTimeString = (minutes: number) => {
  const hrs = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const mins = (minutes % 60).toString().padStart(2, "0");
  return `${hrs}:${mins}`;
};

const timeStringToMinutes = (time: string) => {
  const [hrs, mins] = time.split(":").map((num) => Number(num));
  if (
    Number.isNaN(hrs) ||
    Number.isNaN(mins) ||
    hrs < 0 ||
    mins < 0 ||
    mins >= 60
  ) {
    return 540;
  }
  return hrs * 60 + mins;
};

const mapRoomToSettings = (
  room: DailyReportRoom | null
): DailyReportSettings => {
  if (!room) return DEFAULT_DAILY_REPORT_SETTINGS;
  return {
    remindEnabled: room.isEnabled,
    remindTime: minutesToTimeString(room.remindTimeMinutes),
    remindWeekdays: room.remindWeekdays.map(String),
  };
};

export const useDailyReportRoom = ({
  currentUser,
  currentProject,
  projectMembers = [],
}: UseDailyReportRoomOptions) => {
  const { socket, isConnected } = useSocket();
  const [reports, setReports] = useState<DailyReportEntry[]>([]);
  const [filters, setFilters] = useState<DailyReportFilters>({
    myReports: false,
    date: null,
  });
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isMentioning, setIsMentioning] = useState(false);
  const [toolbarState, setToolbarState] = useState<DailyReportToolbarState>({
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    ordered: false,
    bullet: false,
  });
  const [reportSettings, setReportSettings] = useState<DailyReportSettings>(
    DEFAULT_DAILY_REPORT_SETTINGS
  );
  const [roomData, setRoomData] = useState<DailyReportRoom | null>(null);
  const [isReportsLoading, setIsReportsLoading] = useState(false);
  const [isRoomLoading, setIsRoomLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    hasMore: true,
  });
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const projectIdRef = useRef<string | null>(null);

  const mentionableMembers = useMemo<MentionOption[]>(() => {
    if (projectMembers.length) {
      return projectMembers.map((member) => ({
        id: member._id,
        name: member.name,
        avatarUrl: member.avatarUrl,
      }));
    }
    return FALLBACK_MEMBERS;
  }, [projectMembers]);

  const filteredReports = useMemo(() => {
    if (!reports.length) return [];
    return reports.filter((report) => {
      if (filters.myReports && report.author._id !== currentUser?.id) {
        return false;
      }
      if (filters.date) {
        const reportDate = formatDateKey(report.createdAt);
        return reportDate === filters.date;
      }
      return true;
    });
  }, [currentUser?.id, filters.date, filters.myReports, reports]);

  const groupedReports = useMemo<DailyReportGroup[]>(() => {
    if (!filteredReports.length) return [];

    const sorted = filteredReports.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const map = new Map<string, DailyReportEntry[]>();
    sorted.forEach((entry) => {
      const key = formatDateKey(entry.createdAt);
      const existing = map.get(key) ?? [];
      map.set(key, [...existing, entry]);
    });

    return Array.from(map.entries()).map(([dateKey, entries]) => ({
      dateKey,
      dateLabel: new Date(dateKey).toLocaleDateString("vi-VN"),
      entries,
    }));
  }, [filteredReports]);

  const editingEntry = useMemo(
    () => reports.find((item) => item._id === editingId) ?? null,
    [editingId, reports]
  );

  const handleToggleFormat = useCallback(
    (key: keyof DailyReportToolbarState, value?: boolean) => {
      setToolbarState((prev) => ({
        ...prev,
        [key]: typeof value === "boolean" ? value : !prev[key],
      }));
    },
    []
  );

  const handleMentionTrigger = useCallback(() => {
    setIsMentioning(true);
  }, []);

  const handleMentionSelect = useCallback(() => {
    setIsMentioning(false);
  }, []);

  const handleMentionClose = useCallback(() => {
    setIsMentioning(false);
  }, []);

  const handleChangeContent = useCallback((value: string) => {
    setContent(value);
  }, []);

  const resetForm = useCallback(() => {
    setContent("");
    setEditingId(null);
    setIsMentioning(false);
  }, []);

  const fetchRoom = useCallback(async (project: Project) => {
    setIsRoomLoading(true);
    try {
      const room = await dailyReportAPI.getDailyReportRoom(project._id);
      if (projectIdRef.current !== project._id) return;
      setRoomData(room);
      setReportSettings(mapRoomToSettings(room));
    } catch (error) {
      console.error("Tải phòng báo cáo thất bại:", error);
      toast.error("Không thể tải cài đặt phòng báo cáo.");
      if (projectIdRef.current === project._id) {
        setRoomData(null);
      }
    } finally {
      if (projectIdRef.current === project._id) {
        setIsRoomLoading(false);
      }
    }
  }, []);

  const fetchReports = useCallback(
    async (projectId: string, page = 1, isLoadMore = false) => {
      if (isLoadMore) {
        setIsLoadingMore(true);
      } else {
        setIsReportsLoading(true);
      }

      try {
        const params: GetReportsParams = {
          projectId,
          limit: 10,
          page,
        };

        if (filters.myReports && currentUser?.id) {
          params.author = currentUser.id;
        }
        if (filters.date) {
          params.date = filters.date;
        }

        const response = await dailyReportAPI.getDailyReports(params);

        if (projectIdRef.current !== projectId) return;

        if (isLoadMore) {
          setReports((prev) => [...prev, ...response.data]);
        } else {
          setReports(response.data);
        }

        setPagination((prev) => ({
          ...prev,
          page,
          hasMore: response.pagination.page < response.pagination.totalPages,
        }));
      } catch (error) {
        console.error("Tải báo cáo thất bại:", error);
        toast.error("Không thể tải báo cáo.");
        if (!isLoadMore && projectIdRef.current === projectId) {
          setReports([]);
        }
      } finally {
        if (projectIdRef.current === projectId) {
          setIsReportsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [filters, currentUser?.id]
  );

  const loadMoreReports = useCallback(() => {
    if (
      !pagination.hasMore ||
      isLoadingMore ||
      isReportsLoading ||
      !currentProject
    )
      return;
    fetchReports(currentProject._id, pagination.page + 1, true);
  }, [
    pagination.hasMore,
    pagination.page,
    isLoadingMore,
    isReportsLoading,
    currentProject,
    fetchReports,
  ]);

  const handleSubmit = useCallback(async () => {
    if (!currentProject || !content.trim()) return;

    const cleanContent = sanitizeReportHtml(content.trim());
    if (!cleanContent) {
      toast.error("Nội dung báo cáo không hợp lệ.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        const updatedReport = await dailyReportAPI.updateDailyReport(
          editingId,
          cleanContent
        );
        setReports((prev) =>
          prev.map((item) =>
            item._id === updatedReport._id ? updatedReport : item
          )
        );
        toast.success("Đã cập nhật báo cáo.");
      } else {
        const newReport = await dailyReportAPI.createDailyReport(
          currentProject._id,
          cleanContent
        );
        setReports((prev) => {
          const exists = prev.some((item) => item._id === newReport._id);
          if (exists) return prev;
          return [newReport, ...prev];
        });
        toast.success("Đã gửi báo cáo.");
      }

      resetForm();
    } catch (error) {
      console.error("Gửi báo cáo thất bại:", error);
      toast.error(
        editingId ? "Cập nhật báo cáo thất bại." : "Gửi báo cáo thất bại."
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [content, currentProject, editingId, resetForm]);

  const handleDelete = useCallback(
    async (entry: DailyReportEntry) => {
      if (!currentProject) return;

      try {
        await dailyReportAPI.deleteDailyReport(entry._id);
        toast.success("Đã xóa báo cáo.");
      } catch (error) {
        console.error("Xóa báo cáo thất bại:", error);
        toast.error("Xóa báo cáo thất bại.");
      }
    },
    [currentProject]
  );

  const handleEdit = useCallback(
    (entry: DailyReportEntry) => {
      if (!entry || entry.author._id !== currentUser?.id) return;

      setEditingId(entry._id);
      setContent(entry.content);
    },
    [currentUser?.id]
  );
  const handleCancelEdit = useCallback(() => {
    resetForm();
  }, [resetForm]);

  const updateReportSettings = useCallback(
    async (partial: Partial<DailyReportSettings>) => {
      if (!currentProject) return;

      const newSettings = { ...reportSettings, ...partial };

      try {
        const payload = {
          isEnabled: newSettings.remindEnabled,
          remindTimeMinutes: timeStringToMinutes(newSettings.remindTime),
          remindWeekdays: newSettings.remindWeekdays.map(Number),
          timezone: "Asia/Ho_Chi_Minh",
        };

        await dailyReportAPI.updateDailyReportRoom(currentProject._id, payload);
        setReportSettings(newSettings);
        toast.success("Đã cập nhật cài đặt.");
      } catch (error) {
        console.error("Cập nhật cài đặt thất bại:", error);
        toast.error("Cập nhật cài đặt thất bại.");
      }
    },
    [currentProject, reportSettings]
  );

  const setMyReportFilter = useCallback((enabled: boolean) => {
    setFilters((prev) => ({ ...prev, myReports: enabled }));
  }, []);

  const setDateFilter = useCallback((date: string | null) => {
    setFilters((prev) => ({ ...prev, date }));
  }, []);

  useEffect(() => {
    if (!currentProject) {
      projectIdRef.current = null;
      setReports([]);
      setRoomData(null);
      setReportSettings(DEFAULT_DAILY_REPORT_SETTINGS);
      setIsReportsLoading(false);
      setIsRoomLoading(false);
      return;
    }

    const projectId = currentProject._id;
    projectIdRef.current = projectId;

    void fetchRoom(currentProject);
    void fetchReports(projectId);
  }, [currentProject, fetchReports, fetchRoom, filters]);

  useEffect(() => {
    if (!socket || !isConnected || !currentProject) return;

    const projectId = currentProject._id;

    socket.emit("project:join", projectId);

    const handleReportCreated = (report: DailyReport) => {
      if (report.project !== projectId) return;
      setReports((prev) => {
        const exists = prev.some((item) => item._id === report._id);
        if (exists) return prev;
        return [report, ...prev];
      });
    };

    const handleReportUpdated = (report: DailyReport) => {
      if (report.project !== projectId) return;
      setReports((prev) =>
        prev.map((item) => (item._id === report._id ? report : item))
      );
    };

    const handleReportDeleted = (data: {
      reportId: string;
      projectId: string;
    }) => {
      if (data.projectId !== projectId) return;
      setReports((prev) => prev.filter((item) => item._id !== data.reportId));
    };

    const handleRoomUpdated = (room: DailyReportRoom) => {
      if (room.project !== projectId) return;
      setRoomData(room);
      setReportSettings(mapRoomToSettings(room));
    };

    socket.on("dailyReport:created", handleReportCreated);
    socket.on("dailyReport:updated", handleReportUpdated);
    socket.on("dailyReport:deleted", handleReportDeleted);
    socket.on("dailyReportRoom:updated", handleRoomUpdated);

    return () => {
      socket.off("dailyReport:created", handleReportCreated);
      socket.off("dailyReport:updated", handleReportUpdated);
      socket.off("dailyReport:deleted", handleReportDeleted);
      socket.off("dailyReportRoom:updated", handleRoomUpdated);
      socket.emit("project:leave", projectId);
    };
  }, [socket, isConnected, currentProject]);

  return {
    groupedReports,
    filters,
    setMyReportFilter,
    setDateFilter,
    content,
    setContent: handleChangeContent,
    isSubmitting,
    handleSubmit,
    toolbarState,
    handleToggleFormat,
    handleMentionTrigger,
    handleMentionSelect,
    handleMentionClose,
    isMentioning,
    mentionableMembers,
    handleEdit,
    handleDelete,
    editingEntry,
    handleCancelEdit,
    reportSettings,
    updateReportSettings,
    isReportsLoading,
    isRoomReady: !isRoomLoading && Boolean(roomData),
    loadMoreReports,
    hasMoreReports: pagination.hasMore,
    isLoadingMoreReports: isLoadingMore,
  };
};
