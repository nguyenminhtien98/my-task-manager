"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Project, BasicProfile, Task } from "@/app/types/Types";
import { database } from "@/app/appwrite";
import { Query } from "appwrite";
import { formatVietnameseDateTime } from "@/app/utils/date";
import HoverPopover from "@/app/components/common/HoverPopover";
import Button from "@/app/components/common/Button";
import { useAuth } from "@/app/context/AuthContext";
import { useProject } from "@/app/context/ProjectContext";

interface ScreenProjectDetailProps {
  project: Project;
  onDeleted?: () => void;
}

const ScreenProjectDetail: React.FC<ScreenProjectDetailProps> = ({
  project,
  onDeleted,
}) => {
  const { user } = useAuth();
  const {
    currentProject,
    setCurrentProject,
    setCurrentProjectRole,
    setProjects,
  } = useProject();
  const [members, setMembers] = useState<BasicProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [myTaskCounts, setMyTaskCounts] = useState<Record<string, number>>({});
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [selectedUserForLeader, setSelectedUserForLeader] =
    useState<BasicProfile | null>(null);
  const [selectedUserCounts, setSelectedUserCounts] = useState<
    Record<string, number>
  >({});
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setLoading(true);
        const res = await database.listDocuments(
          String(process.env.NEXT_PUBLIC_DATABASE_ID),
          String(process.env.NEXT_PUBLIC_COLLECTION_ID_PROJECT_MEMBERSHIPS),
          [Query.equal("project", project.$id), Query.limit(200)]
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
  }, [project.$id]);

  // no-op: we no longer use tooltip, keep names if needed in future
  const isLeader = user && project.leader?.$id === user.id;

  useEffect(() => {
    const fetchMyTasks = async () => {
      if (!user) return;
      try {
        const res = await database.listDocuments(
          String(process.env.NEXT_PUBLIC_DATABASE_ID),
          String(process.env.NEXT_PUBLIC_COLLECTION_ID_TASKS),
          [
            Query.equal("projectId", project.$id),
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
  }, [project.$id, user]);

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
            Query.equal("projectId", project.$id),
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
  }, [project.$id, selectedUserForLeader]);

  const handleDeleteProject = async () => {
    if (!isLeader || isDeleting) return;

    const confirmed = window.confirm(
      "Bạn có chắc chắn muốn xóa dự án này? Hành động này không thể hoàn tác."
    );
    if (!confirmed) return;

    const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID;
    const projectsCollectionId =
      process.env.NEXT_PUBLIC_COLLECTION_ID_PROJECTS;
    const membershipsCollectionId =
      process.env.NEXT_PUBLIC_COLLECTION_ID_PROJECT_MEMBERSHIPS;
    const tasksCollectionId =
      process.env.NEXT_PUBLIC_COLLECTION_ID_TASKS;

    if (!databaseId || !projectsCollectionId) {
      toast.error("Thiếu cấu hình Appwrite để xóa dự án.");
      return;
    }

    setIsDeleting(true);
    try {
      if (membershipsCollectionId) {
        const memberships = await database.listDocuments(
          String(databaseId),
          String(membershipsCollectionId),
          [Query.equal("project", project.$id), Query.limit(200)]
        );
        await Promise.all(
          memberships.documents.map((membership) =>
            database
              .deleteDocument(
                String(databaseId),
                String(membershipsCollectionId),
                membership.$id
              )
              .catch((err) => {
                console.error(
                  "Failed to delete project membership:",
                  err
                );
              })
          )
        );
      }

      if (tasksCollectionId) {
        const tasks = await database.listDocuments(
          String(databaseId),
          String(tasksCollectionId),
          [Query.equal("projectId", project.$id), Query.limit(200)]
        );
        await Promise.all(
          tasks.documents.map((task) =>
            database
              .deleteDocument(
                String(databaseId),
                String(tasksCollectionId),
                task.$id
              )
              .catch((err) => {
                console.error("Failed to delete project task:", err);
              })
          )
        );
      }

      await database.deleteDocument(
        String(databaseId),
        String(projectsCollectionId),
        project.$id
      );

      setProjects((prev) => {
        const updated = prev.filter((p) => p.$id !== project.$id);
        if (currentProject?.$id === project.$id) {
          const nextProject = updated[0] ?? null;
          setCurrentProject(nextProject ?? null);
          setCurrentProjectRole(
            nextProject
              ? nextProject.leader.$id === user?.id
                ? "leader"
                : "user"
              : null
          );
        }
        return updated;
      });

      toast.success("Đã xóa dự án.");
      onDeleted?.();
    } catch (error) {
      console.error("Failed to delete project:", error);
      toast.error("Xóa dự án thất bại.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 rounded-lg bg-black/5 p-4">
        <div className="text-sm text-sub">Dự án</div>
        <div className="text-lg font-semibold text-gray-900">
          {project.name}
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <div className="text-sm text-sub">Ngày tạo</div>
            <div className="font-medium text-gray-900">
              {formatVietnameseDateTime(project.$createdAt, { hideTime: true })}
            </div>
          </div>
          <div>
            <div className="text-sm text-sub">Người tạo/Leader</div>
            <div className="font-medium text-gray-900">
              {project.leader?.name}
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
                              className={`${
                                isLeader && "cursor-pointer"
                              } w-full px-2 py-2 text-left text-sm whitespace-nowrap overflow-hidden text-ellipsis ${
                                selectedUserForLeader?.$id === m.$id
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
                <div className="sm:justify-self-end">
                  <Button
                    className="bg-red-600 text-white font-semibold"
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
      {!isLeader && (
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

      {/* Leader view: các task của user được chọn */}
      {isLeader && selectedUserForLeader && (
        <div className="rounded-lg border border-black/10 p-4">
          <div className="mb-3 text-sm font-semibold text-gray-800">
            Các task của {selectedUserForLeader.name} -{" "}
            {Object.values(selectedUserCounts).reduce((a, b) => a + b, 0)} task
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {statusOrder.map((s) => (
              <div
                key={s.key}
                className="flex items-center justify-between rounded-md bg-black/5 px-3 py-2 text-sm text-gray-800"
              >
                <span>{s.label}</span>
                <span className="font-semibold">
                  {selectedUserCounts[s.key] ?? 0}
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
