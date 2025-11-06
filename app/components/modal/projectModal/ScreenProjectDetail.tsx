"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Project, BasicProfile, Task, ProjectStatus } from "@/app/types/Types";
import { database } from "@/lib/appwrite";
import { Query } from "appwrite";
import { formatVietnameseDateTime } from "@/app/utils/date";
import HoverPopover from "@/app/components/common/HoverPopover";
import Button from "@/app/components/common/Button";
import { useAuth } from "@/app/context/AuthContext";
import { useProjectOperations } from "@/app/hooks/useProjectOperations";
import toast from "react-hot-toast";
import { exportProjectBoardToExcel } from "@/app/utils/exportExcel";
import { mapTaskDocument, RawTaskDocument } from "@/app/utils/taskMapping";

interface ScreenProjectDetailProps {
  project: Project;
  onDeleted?: () => void;
}

const ScreenProjectDetail: React.FC<ScreenProjectDetailProps> = ({
  project,
  onDeleted,
}) => {
  const { user } = useAuth();
  const { deleteProject, closeProject, reopenProject } = useProjectOperations();
  const [members, setMembers] = useState<BasicProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [myTaskCounts, setMyTaskCounts] = useState<Record<string, number>>({});
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [selectedUserForLeader, setSelectedUserForLeader] =
    useState<BasicProfile | null>(null);
  const [selectedUserCounts, setSelectedUserCounts] = useState<
    Record<string, number>
  >({});
  const [overallCounts, setOverallCounts] = useState<Record<string, number>>(
    {}
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [projectData, setProjectData] = useState<Project>(project);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    setProjectData(project);
  }, [project]);

  const projectId = projectData.$id;
  const projectStatus: ProjectStatus = projectData.status ?? "active";
  const isLeader = user && projectData.leader?.$id === user.id;
  const isClosed = projectStatus === "closed";
  const statusLabel = isClosed ? "Dự án đã đóng" : "Đang hoạt động";
  const statusBadgeClasses = isClosed
    ? "bg-yellow-500 text-white"
    : "bg-green-500 text-white";
  const toggleButtonClass = isClosed
    ? "bg-green-600 text-white hover:bg-green-700"
    : "bg-yellow-500 text-white hover:bg-yellow-600";
  const toggleButtonLabel = isClosed
    ? isUpdatingStatus
      ? "Đang mở..."
      : "Mở dự án"
    : isUpdatingStatus
      ? "Đang đóng..."
      : "Đóng dự án";

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setLoading(true);
        const res = await database.listDocuments(
          String(process.env.NEXT_PUBLIC_DATABASE_ID),
          String(process.env.NEXT_PUBLIC_COLLECTION_ID_PROJECT_MEMBERSHIPS),
          [Query.equal("project", projectId), Query.limit(200)]
        );
        const profiles: BasicProfile[] = res.documents.map(
          (d) => d.user as BasicProfile
        );
        setMembers(profiles);
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, [projectId]);

  useEffect(() => {
    const fetchMyTasks = async () => {
      if (!user) return;
      try {
        const res = await database.listDocuments(
          String(process.env.NEXT_PUBLIC_DATABASE_ID),
          String(process.env.NEXT_PUBLIC_COLLECTION_ID_TASKS),
          [
            Query.equal("projectId", projectId),
            Query.equal("assignee", user.id),
            Query.limit(200),
          ]
        );
        const docs = res.documents as unknown as Task[];
        const counts: Record<string, number> = {};
        for (const t of docs) {
          const s = (t.status as string) ?? "unknown";
          counts[s] = (counts[s] ?? 0) + 1;
        }
        setMyTaskCounts(counts);
      } catch {
        setMyTaskCounts({});
      }
    };
    fetchMyTasks();
  }, [projectId, user]);

  const statusOrder: Array<{ key: string; label: string }> = [
    { key: "list", label: "Task List" },
    { key: "doing", label: "Task Doing" },
    { key: "done", label: "Task Done" },
    { key: "completed", label: "Task Completed" },
    { key: "bug", label: "Task Bug" },
  ];

  useEffect(() => {
    const fetchSelectedUserTasks = async () => {
      if (!selectedUserForLeader) return;
      try {
        const res = await database.listDocuments(
          String(process.env.NEXT_PUBLIC_DATABASE_ID),
          String(process.env.NEXT_PUBLIC_COLLECTION_ID_TASKS),
          [
            Query.equal("projectId", projectId),
            Query.equal("assignee", selectedUserForLeader.$id),
            Query.limit(200),
          ]
        );
        const docs = res.documents as unknown as Task[];
        const counts: Record<string, number> = {};
        for (const t of docs) {
          const s = (t.status as string) ?? "unknown";
          counts[s] = (counts[s] ?? 0) + 1;
        }
        setSelectedUserCounts(counts);
      } catch {
        setSelectedUserCounts({});
      }
    };
    fetchSelectedUserTasks();
  }, [projectId, selectedUserForLeader]);

  useEffect(() => {
    const fetchOverallCounts = async () => {
      try {
        const res = await database.listDocuments(
          String(process.env.NEXT_PUBLIC_DATABASE_ID),
          String(process.env.NEXT_PUBLIC_COLLECTION_ID_TASKS),
          [Query.equal("projectId", projectId), Query.limit(200)]
        );
        const docs = res.documents as unknown as Task[];
        const counts: Record<string, number> = {};
        docs.forEach((task) => {
          const status = (task.status as string) ?? "unknown";
          counts[status] = (counts[status] ?? 0) + 1;
        });
        setOverallCounts(counts);
      } catch {
        setOverallCounts({});
      }
    };
    fetchOverallCounts();
  }, [projectId]);

  const handleDeleteProject = async () => {
    if (!isLeader || isDeleting) return;

    const confirmed = window.confirm(
      "Bạn có chắc chắn muốn xóa dự án này? Hành động này không thể hoàn tác."
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const result = await deleteProject(projectId);
      if (result.success) {
        onDeleted?.();
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!isLeader || isUpdatingStatus) return;

    if (!isClosed) {
      const confirmed = window.confirm(
        "Đóng dự án sẽ khóa mọi thao tác task, bình luận và quản lý thành viên. Bạn có chắc chắn?"
      );
      if (!confirmed) return;
    }

    setIsUpdatingStatus(true);
    try {
      const action = isClosed ? reopenProject : closeProject;
      const result = await action(projectId);
      if (result.success) {
        setProjectData((prev) =>
          prev ? { ...prev, status: isClosed ? "active" : "closed" } : prev
        );
      }
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const exportMembers = useMemo(() => {
    const map = new Map<string, BasicProfile>();
    const leader = projectData.leader;
    if (leader?.$id) {
      map.set(leader.$id, {
        $id: leader.$id,
        name: leader.name,
        email: leader.email,
        avatarUrl: leader.avatarUrl ?? undefined,
      });
    }
    members.forEach((member) => {
      if (member?.$id) {
        map.set(member.$id, member);
      }
    });
    return Array.from(map.values());
  }, [members, projectData.leader]);

  const handleExportExcel = useCallback(async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const databaseId = String(process.env.NEXT_PUBLIC_DATABASE_ID);
      const tasksCollectionId = String(
        process.env.NEXT_PUBLIC_COLLECTION_ID_TASKS
      );
      const response = await database.listDocuments(
        databaseId,
        tasksCollectionId,
        [Query.equal("projectId", projectId), Query.limit(200)]
      );
      const mappedTasks = (response.documents as RawTaskDocument[]).map((doc) =>
        mapTaskDocument(doc)
      );
      await exportProjectBoardToExcel({
        project: projectData,
        members: exportMembers,
        tasks: mappedTasks,
      });
      toast.success("Đã xuất bảng Excel.");
    } catch (error) {
      console.error("Xuất Excel thất bại:", error);
      toast.error("Xuất bảng Excel thất bại.");
    } finally {
      setIsExporting(false);
    }
  }, [exportMembers, isExporting, projectData, projectId]);

  return (
    <div className="space-y-6">
      <div className="space-y-2 rounded-lg bg-black/5 p-4">
        <div className="text-sm text-sub">Dự án</div>
        <div className="flex items-center gap-3 text-lg font-semibold text-gray-900">
          <span>{projectData.name}</span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClasses}`}
          >
            {statusLabel}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <div className="text-sm text-sub">Ngày tạo</div>
            <div className="font-medium text-gray-900">
              {formatVietnameseDateTime(projectData.$createdAt, {
                hideTime: true,
              })}
            </div>
          </div>
          <div>
            <div className="text-sm text-sub">Người tạo/Leader</div>
            <div className="font-medium text-gray-900">
              {projectData.leader?.name}
            </div>
          </div>
          <div className="sm:col-span-2">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:items-start sm:gap-4">
              <div>
                <div className="text-sm text-sub">Thành viên</div>
                <HoverPopover
                  isOpen={isPopoverOpen}
                  onOpenChange={setIsPopoverOpen}
                  align="left"
                  trigger={
                    <button
                      type="button"
                      className="cursor-pointer font-medium text-blue-700 hover:underline"
                    >
                      {members.length} người
                    </button>
                  }
                >
                  <div className="max-h-56 overflow-auto">
                    {loading ? (
                      <div className="px-2 py-1 text-xs text-sub">
                        Đang tải...
                      </div>
                    ) : members.length === 0 ? (
                      <div className="px-2 py-1 text-xs text-sub">
                        Không có thành viên
                      </div>
                    ) : (
                      <ul className="divide-y divide-black/5">
                        {members.map((m) => (
                          <li key={m.$id}>
                            <button
                              type="button"
                              className={`${isLeader && "cursor-pointer"
                                } w-full px-2 py-2 text-left text-sm whitespace-nowrap overflow-hidden text-ellipsis ${selectedUserForLeader?.$id === m.$id
                                  ? "bg-gray-200 text-[#111827]"
                                  : "hover:underline"
                                }`}
                              onClick={() => {
                                if (isLeader) {
                                  setSelectedUserForLeader(m);
                                  setIsPopoverOpen(false);
                                }
                              }}
                            >
                              {m.name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </HoverPopover>
              </div>
              {isLeader && (
                <div className="flex flex-col gap-1 sm:justify-self-end sm:flex-row">
                  <Button
                    className="bg-green-600 text-white !p-2 text-sm"
                    hoverClassName="hover:bg-green-700"
                    disabled={isExporting}
                    onClick={handleExportExcel}
                  >
                    {isExporting ? "Đang xuất..." : "Xuất Excel"}
                  </Button>
                  <Button
                    className={`${toggleButtonClass} !p-2 text-sm`}
                    disabled={isUpdatingStatus}
                    onClick={handleToggleStatus}
                  >
                    {toggleButtonLabel}
                  </Button>
                  <Button
                    className="bg-red-600 text-white !p-2 text-sm"
                    hoverClassName="hover:bg-red-700"
                    disabled={isDeleting}
                    onClick={handleDeleteProject}
                  >
                    {isDeleting ? "Đang xóa..." : "Xóa dự án"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Member view: các task của bạn */}
      {isLeader ? (
        <div className="rounded-lg border border-black/10 p-4">
          <div className="mb-3 text-sm font-semibold text-gray-800">
            {selectedUserForLeader
              ? `Các task của ${selectedUserForLeader.name} - ${Object.values(
                selectedUserCounts
              ).reduce((a, b) => a + b, 0)} task`
              : `Tổng số task của dự án - ${Object.values(overallCounts).reduce(
                (a, b) => a + b,
                0
              )} task`}
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(selectedUserForLeader ? selectedUserCounts : overallCounts)
              ? statusOrder.map((s) => (
                <div
                  key={s.key}
                  className="flex items-center justify-between rounded-md bg-black/5 px-3 py-2 text-sm text-gray-800"
                >
                  <span>{s.label}</span>
                  <span className="font-semibold">
                    {(selectedUserForLeader
                      ? selectedUserCounts
                      : overallCounts)[s.key] ?? 0}
                  </span>
                </div>
              ))
              : null}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-black/10 p-4">
          <div className="mb-3 text-sm font-semibold text-gray-800">
            Các task của bạn -{" "}
            {Object.values(myTaskCounts).reduce((a, b) => a + b, 0)} task
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {statusOrder.map((s) => (
              <div
                key={s.key}
                className="flex items-center justify-between rounded-md bg-black/5 px-3 py-2 text-sm text-gray-800"
              >
                <span>{s.label}</span>
                <span className="font-semibold">
                  {myTaskCounts[s.key] ?? 0}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScreenProjectDetail;
