"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Query } from "appwrite";
import toast from "react-hot-toast";
import { database, subscribeToRealtime } from "../../lib/appwrite";
import type { User } from "../context/AuthContext";
import type { Project } from "../types/Types";
import type { ProjectMemberProfile } from "./useProjectOperations";
import { sanitizeReportHtml } from "../utils/richText";
import {
  DEFAULT_DAILY_REPORT_REMIND_MINUTES,
  DEFAULT_DAILY_REPORT_SETTINGS,
  DEFAULT_DAILY_REPORT_TIMEZONE,
  DEFAULT_DAILY_REPORT_WEEKDAYS,
} from "../utils/dailyReportDefaults";

export interface DailyReportFilters {
  myReports: boolean;
  date: string | null;
}

export interface DailyReportEntry {
  id: string;
  userId: string;
  userName: string;
  avatarUrl?: string | null;
  content: string;
  createdAt: string;
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

interface RawDailyReportDocument {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  content?: string | null;
  is_pinned?: boolean;
  status?: string | null;
  user_id?:
    | string
    | {
        $id: string;
        name?: string | null;
        avatarUrl?: string | null;
      }
    | null;
  project_id?: string | { $id: string } | null;
  room_id?: string | { $id: string } | null;
}

interface RawDailyReportRoomDocument {
  $id: string;
  remind_enabled?: boolean;
  remind_time_minutes?: number | null;
  remind_weekdays?: string[] | null;
  timezone?: string | null;
  last_reminded_at?: string | null;
  project_id?: string | { $id: string } | null;
}

const FALLBACK_MEMBERS: MentionOption[] = [
  { id: "fallback-1", name: "Nguyễn Văn An", avatarUrl: null },
  { id: "fallback-2", name: "Trần Thị Bình", avatarUrl: null },
  { id: "fallback-3", name: "Phạm Hoài Nam", avatarUrl: null },
];
const REPORT_FETCH_LIMIT = 200;

const formatDateKey = (iso: string) => iso.slice(0, 10);

const normalizeWeekdays = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item): item is string => Boolean(item));
  }
  if (typeof value === "string" && value.trim().length) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length);
  }
  return [];
};

const resolveRelationId = (
  value: string | { $id?: string } | null | undefined
) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.$id ?? null;
};

const minutesToTimeString = (minutes?: number | null) => {
  const value =
    typeof minutes === "number" && !Number.isNaN(minutes)
      ? minutes
      : DEFAULT_DAILY_REPORT_REMIND_MINUTES;
  const hrs = Math.floor(value / 60)
    .toString()
    .padStart(2, "0");
  const mins = (value % 60).toString().padStart(2, "0");
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
    return DEFAULT_DAILY_REPORT_REMIND_MINUTES;
  }
  return hrs * 60 + mins;
};

const mapRoomSettings = (
  doc: RawDailyReportRoomDocument | null
): DailyReportSettings => {
  if (!doc) return DEFAULT_DAILY_REPORT_SETTINGS;
  const parsedWeekdays = normalizeWeekdays(doc.remind_weekdays);
  return {
    remindEnabled: doc.remind_enabled ?? true,
    remindTime: minutesToTimeString(doc.remind_time_minutes),
    remindWeekdays:
      parsedWeekdays.length > 0
        ? parsedWeekdays
        : DEFAULT_DAILY_REPORT_WEEKDAYS,
  };
};

const mapReportDocument = (doc: RawDailyReportDocument): DailyReportEntry => {
  const userRelation = doc.user_id ?? null;
  const relationObject =
    userRelation && typeof userRelation === "object" ? userRelation : null;
  const userId = resolveRelationId(userRelation) ?? "unknown-user";
  const userName = relationObject?.name ?? "Ẩn danh";
  const avatarUrl = relationObject?.avatarUrl ?? null;
  return {
    id: doc.$id,
    userId,
    userName,
    avatarUrl,
    content: doc.content ?? "",
    createdAt: doc.$createdAt,
  };
};

const getDailyReportCollections = () => {
  const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID;
  const roomsCollectionId =
    process.env.NEXT_PUBLIC_COLLECTION_ID_DAILY_REPORT_ROOMS;
  const reportsCollectionId =
    process.env.NEXT_PUBLIC_COLLECTION_ID_DAILY_REPORTS;
  if (!databaseId || !roomsCollectionId || !reportsCollectionId) {
    throw new Error("Thiếu cấu hình Appwrite cho Daily Report");
  }
  return { databaseId, roomsCollectionId, reportsCollectionId };
};

export const useDailyReportRoom = ({
  currentUser,
  currentProject,
  projectMembers = [],
}: UseDailyReportRoomOptions) => {
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
  const [roomDoc, setRoomDoc] = useState<RawDailyReportRoomDocument | null>(
    null
  );
  const [isReportsLoading, setIsReportsLoading] = useState(false);
  const [isRoomLoading, setIsRoomLoading] = useState(false);
  const projectIdRef = useRef<string | null>(null);

  const mentionableMembers = useMemo<MentionOption[]>(() => {
    if (projectMembers.length) {
      return projectMembers.map((member) => ({
        id: member.$id,
        name: member.name,
        avatarUrl: member.avatarUrl,
      }));
    }
    return FALLBACK_MEMBERS;
  }, [projectMembers]);

  const projectMemberIds = useMemo(() => {
    const set = new Set<string>();
    projectMembers.forEach((member) => {
      if (member.$id) set.add(member.$id);
    });
    return set;
  }, [projectMembers]);

  const myMembershipId = useMemo(() => {
    if (!currentUser) return null;
    const match = projectMembers.find((member) => member.$id === currentUser.id);
    return match?.membershipId ?? null;
  }, [currentUser, projectMembers]);

  const filteredReports = useMemo(() => {
    if (!reports.length) return [];
    return reports.filter((report) => {
      if (filters.myReports && report.userId !== currentUser?.id) {
        return false;
      }
      if (filters.date) {
        return formatDateKey(report.createdAt) === filters.date;
      }
      return true;
    });
  }, [currentUser?.id, filters.date, filters.myReports, reports]);

  const groupedReports = useMemo<DailyReportGroup[]>(() => {
    if (!filteredReports.length) return [];
    const map = new Map<string, DailyReportEntry[]>();
    filteredReports
      .slice()
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .forEach((entry) => {
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
    () => reports.find((item) => item.id === editingId) ?? null,
    [editingId, reports]
  );

  const handleToggleFormat = useCallback(
    (key: keyof DailyReportToolbarState, value?: boolean) => {
      setToolbarState((prev) => ({
        ...prev,
        [key]:
          typeof value === "boolean"
            ? value
            : !prev[key],
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

  const fetchRoom = useCallback(
    async (project: Project) => {
      setIsRoomLoading(true);
      try {
        const { databaseId, roomsCollectionId } = getDailyReportCollections();
        const queries = [
          Query.equal("project_id.$id", project.$id),
          Query.limit(1),
        ];
        const { documents } = await database.listDocuments(
          databaseId,
          roomsCollectionId,
          queries
        );
        let doc = documents[0] as RawDailyReportRoomDocument | undefined;
        if (!doc) {
        const basePayload = {
          project_id: project.$id,
          leader_id: project.leader.$id,
          remind_enabled: true,
          remind_time_minutes: DEFAULT_DAILY_REPORT_REMIND_MINUTES,
          remind_weekdays: DEFAULT_DAILY_REPORT_WEEKDAYS,
          timezone: DEFAULT_DAILY_REPORT_TIMEZONE,
        };
        try {
          doc = (await database.createDocument(
            databaseId,
            roomsCollectionId,
            "unique()",
            basePayload
          )) as RawDailyReportRoomDocument;
        } catch (error) {
          const message = error instanceof Error ? error.message : "";
          if (!message.includes("remind_weekdays")) {
            throw error;
          }
          doc = (await database.createDocument(
            databaseId,
            roomsCollectionId,
            "unique()",
            {
              ...basePayload,
              remind_weekdays: DEFAULT_DAILY_REPORT_WEEKDAYS.join(","),
            }
          )) as RawDailyReportRoomDocument;
        }
        }
        if (projectIdRef.current !== project.$id) return;
        setRoomDoc(doc);
      } catch (error) {
        console.error("Tải phòng báo cáo thất bại:", error);
        toast.error("Không thể tải cài đặt phòng báo cáo.");
        if (projectIdRef.current === project.$id) {
          setRoomDoc(null);
        }
      } finally {
        if (projectIdRef.current === project.$id) {
          setIsRoomLoading(false);
        }
      }
    },
    []
  );

  const fetchReports = useCallback(async (projectId: string) => {
    setIsReportsLoading(true);
    try {
      const { databaseId, reportsCollectionId } = getDailyReportCollections();
      const queries = [
        Query.equal("project_id.$id", projectId),
        Query.orderDesc("$createdAt"),
        Query.limit(REPORT_FETCH_LIMIT),
      ];
      const { documents } = await database.listDocuments(
        databaseId,
        reportsCollectionId,
        queries
      );
      if (projectIdRef.current !== projectId) return;
      const mapped = (documents as RawDailyReportDocument[])
        .filter((doc) => (doc.status ?? "active") !== "deleted")
        .map((doc) => mapReportDocument(doc));
      setReports(mapped);
    } catch (error) {
      console.error("Tải danh sách báo cáo thất bại:", error);
      toast.error("Không thể tải báo cáo.");
      if (projectIdRef.current === projectId) {
        setReports([]);
      }
    } finally {
      if (projectIdRef.current === projectId) {
        setIsReportsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!currentProject) {
      projectIdRef.current = null;
      setReports([]);
      setRoomDoc(null);
      return;
    }
    projectIdRef.current = currentProject.$id;
    setReports([]);
    setRoomDoc(null);
    void fetchRoom(currentProject);
    void fetchReports(currentProject.$id);
  }, [currentProject, fetchReports, fetchRoom]);

  useEffect(() => {
    setReportSettings(mapRoomSettings(roomDoc));
  }, [roomDoc]);

  useEffect(() => {
    if (projectMemberIds.size === 0) return;
    setReports((prev) => prev.filter((entry) => projectMemberIds.has(entry.userId)));
  }, [projectMemberIds]);

  useEffect(() => {
    if (!roomDoc?.$id) return;
    let unsubscribe: (() => void) | undefined;
    try {
      const { databaseId, roomsCollectionId } = getDailyReportCollections();
      const channel = `databases.${databaseId}.collections.${roomsCollectionId}.documents.${roomDoc.$id}`;
      unsubscribe = subscribeToRealtime([channel], (res: unknown) => {
        const payload = res as {
          events?: string[];
          payload?: { data?: RawDailyReportRoomDocument; $id?: string };
        };
        if (!payload?.events || payload.events.length === 0) return;
        const data =
          payload.payload?.data ??
          (payload.payload as unknown as RawDailyReportRoomDocument);
        if (!data?.$id || data.$id !== roomDoc.$id) return;
        setRoomDoc(data);
      });
    } catch (error) {
      console.error("Theo dõi phòng báo cáo thất bại:", error);
    }
    return () => {
      unsubscribe?.();
    };
  }, [roomDoc?.$id]);

  useEffect(() => {
    if (!currentProject?.$id) return;
    let unsubscribe: (() => void) | undefined;
    try {
      const { databaseId, reportsCollectionId } = getDailyReportCollections();
      const channel = `databases.${databaseId}.collections.${reportsCollectionId}.documents`;
      unsubscribe = subscribeToRealtime([channel], (res: unknown) => {
        const payload = res as {
          events?: string[];
          payload?: { data?: RawDailyReportDocument; $id?: string };
        };
        const events = payload?.events ?? [];
        if (!events.length) return;
        const raw =
          payload.payload?.data ??
          (payload.payload as unknown as RawDailyReportDocument);
        if (!raw?.$id) return;
        const docProjectId = resolveRelationId(raw.project_id);
        if (docProjectId !== currentProject.$id) return;

        if (
          events.some((event) => event.endsWith(".delete")) ||
          (raw.status && raw.status === "deleted")
        ) {
          setReports((prev) => prev.filter((item) => item.id !== raw.$id));
          return;
        }

        const entry = mapReportDocument(raw);
        if (events.some((event) => event.endsWith(".create"))) {
          setReports((prev) => {
            const exists = prev.some((item) => item.id === entry.id);
            if (exists) return prev;
            return [entry, ...prev];
          });
        } else if (events.some((event) => event.endsWith(".update"))) {
          setReports((prev) =>
            prev.map((item) => (item.id === entry.id ? entry : item))
          );
        }
      });
    } catch (error) {
      console.error("Theo dõi báo cáo thất bại:", error);
    }
    return () => {
      unsubscribe?.();
    };
  }, [currentProject?.$id]);

  const persistRoomSettings = useCallback(
    async (partial: Partial<DailyReportSettings>) => {
      if (!roomDoc) return;
      const payload: Record<string, unknown> = {};
      if (partial.remindEnabled !== undefined) {
        payload.remind_enabled = partial.remindEnabled;
      }
      if (partial.remindTime !== undefined) {
        payload.remind_time_minutes = timeStringToMinutes(partial.remindTime);
      }
      if (partial.remindWeekdays !== undefined) {
        const cleaned = partial.remindWeekdays
          .map((item) => item.trim())
          .filter((item) => item.length);
        if (Array.isArray(roomDoc.remind_weekdays)) {
          payload.remind_weekdays = cleaned;
        } else if (typeof roomDoc.remind_weekdays === "string") {
          payload.remind_weekdays = cleaned.join(",");
        } else {
          payload.remind_weekdays = cleaned;
        }
      }
      if (!Object.keys(payload).length) return;
      try {
        const { databaseId, roomsCollectionId } = getDailyReportCollections();
        await database.updateDocument(
          databaseId,
          roomsCollectionId,
          roomDoc.$id,
          payload
        );
        setRoomDoc((prev) => (prev ? { ...prev, ...payload } : prev));
      } catch (error) {
        console.error("Cập nhật cài đặt báo cáo thất bại:", error);
        toast.error("Không thể lưu cài đặt.");
      }
    },
    [roomDoc]
  );

  const updateReportSettings = useCallback(
    (partial: Partial<DailyReportSettings>) => {
      setReportSettings((prev) => ({
        ...prev,
        ...partial,
      }));
      void persistRoomSettings(partial);
    },
    [persistRoomSettings]
  );

  const handleSubmit = useCallback(async () => {
    if (!currentUser) {
      toast.error("Vui lòng đăng nhập để gửi báo cáo.");
      return;
    }
    if (!currentProject) {
      toast.error("Vui lòng chọn dự án.");
      return;
    }
    if (!roomDoc) {
      toast.error("Chưa khởi tạo phòng báo cáo.");
      return;
    }
    if (!content.trim()) return;
    const sanitized = sanitizeReportHtml(content);
    if (!sanitized.trim()) {
      toast.error("Nội dung báo cáo không hợp lệ.");
      return;
    }
    setIsSubmitting(true);
    try {
      const { databaseId, reportsCollectionId } = getDailyReportCollections();
      if (editingId) {
        const updated = (await database.updateDocument(
          databaseId,
          reportsCollectionId,
          editingId,
          { content: sanitized }
        )) as RawDailyReportDocument;
        setReports((prev) =>
          prev.map((item) =>
            item.id === updated.$id ? mapReportDocument(updated) : item
          )
        );
        toast.success("Đã cập nhật báo cáo.");
      } else {
        const payload: Record<string, unknown> = {
          project_id: currentProject.$id,
          room_id: roomDoc.$id,
          user_id: currentUser.id,
          content: sanitized,
          status: "active",
          is_pinned: false,
        };
        if (myMembershipId) {
          payload.membership_id = myMembershipId;
        }
        const created = (await database.createDocument(
          databaseId,
          reportsCollectionId,
          "unique()",
          payload
        )) as RawDailyReportDocument;
        const entry = mapReportDocument(created);
        setReports((prev) => [
          {
            ...entry,
            userName: currentUser.name,
            avatarUrl: currentUser.avatarUrl ?? entry.avatarUrl,
          },
          ...prev,
        ]);
        toast.success("Đã gửi báo cáo.");
      }
      resetForm();
    } catch (error) {
      console.error("Gửi báo cáo thất bại:", error);
      toast.error("Không thể gửi báo cáo.");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    content,
    currentProject,
    currentUser,
    editingId,
    myMembershipId,
    resetForm,
    roomDoc,
  ]);

  const handleEdit = useCallback((entry: DailyReportEntry) => {
    setEditingId(entry.id);
    setContent(entry.content);
  }, []);

  const handleDelete = useCallback(
    async (entry: DailyReportEntry) => {
      try {
        const { databaseId, reportsCollectionId } = getDailyReportCollections();
        await database.deleteDocument(
          databaseId,
          reportsCollectionId,
          entry.id
        );
        setReports((prev) => prev.filter((item) => item.id !== entry.id));
        if (editingId === entry.id) {
          resetForm();
        }
        toast.success("Đã xóa báo cáo.");
      } catch (error) {
        console.error("Xóa báo cáo thất bại:", error);
        toast.error("Không thể xóa báo cáo.");
      }
    },
    [editingId, resetForm]
  );

  const handleCancelEdit = useCallback(() => {
    resetForm();
  }, [resetForm]);

  const setMyReportFilter = useCallback((value: boolean) => {
    setFilters((prev) => ({ ...prev, myReports: value }));
  }, []);

  const setDateFilter = useCallback((date: string | null) => {
    setFilters((prev) => ({ ...prev, date }));
  }, []);

  const isRoomReady = Boolean(roomDoc?.$id) && !isRoomLoading;

  return {
    reports,
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
    isRoomReady,
  };
};
