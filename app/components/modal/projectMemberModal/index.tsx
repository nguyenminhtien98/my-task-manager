"use client";

import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Query } from "appwrite";
import { database } from "../../../../lib/appwrite";
import ModalComponent from "../../common/ModalComponent";
import ProjectMemberListView from "./ProjectMemberListView";
import ProjectMemberProfileView from "./ProjectMemberProfileView";
import {
  useProjectOperations,
  type EnrichedProjectMember,
} from "../../../hooks/useProjectOperations";
import { useProject } from "../../../context/ProjectContext";

interface ProjectMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMember?: EnrichedProjectMember | null;
  isProjectClosed?: boolean;
}

interface TaskStats {
  total: number;
  done: number;
  loading: boolean;
  error?: string;
}

const defaultStats: TaskStats = { total: 0, done: 0, loading: false };

const ProjectMembersModal: React.FC<ProjectMembersModalProps> = ({
  isOpen,
  onClose,
  initialMember,
  isProjectClosed: projectClosedProp,
}) => {
  const { currentProject, currentProjectRole, isProjectClosed: contextProjectClosed } =
    useProject();
  const {
    members: allMembers,
    leader,
    addMember,
    removeMember,
    isLoading: isMembersLoading,
  } = useProjectOperations();

  const [view, setView] = useState<"list" | "profile">("list");
  const [activeMember, setActiveMember] =
    useState<EnrichedProjectMember | null>(null);
  const [stats, setStats] = useState<TaskStats>(defaultStats);
  const [isProcessing, setIsProcessing] = useState(false);

  const projectId = currentProject?.$id;
  const isLeader = currentProjectRole === "leader";
  const isProjectClosed = projectClosedProp ?? contextProjectClosed;

  const nonLeaderMembers = useMemo(
    () => allMembers.filter((member) => !member.isLeader),
    [allMembers]
  );

  useEffect(() => {
    if (!isOpen) {
      setActiveMember(null);
      setStats(defaultStats);
      setIsProcessing(false);
      return;
    }

    if (initialMember) {
      setActiveMember(initialMember);
      setView("profile");
    } else {
      setActiveMember(null);
      setView("list");
    }
  }, [isOpen, initialMember]);

  useEffect(() => {
    if (!activeMember) return;
    const match = allMembers.find((member) => member.$id === activeMember.$id);

    if (!match) {
      setActiveMember(null);
      setView("list");
      return;
    }

    if (match !== activeMember) {
      setActiveMember(match);
    }
  }, [allMembers, activeMember]);

  useEffect(() => {
    let cancelled = false;

    const loadStats = async () => {
      if (!isOpen || view !== "profile" || !activeMember || !projectId) {
        if (!cancelled) setStats(defaultStats);
        return;
      }

      const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID;
      const tasksCollectionId = process.env.NEXT_PUBLIC_COLLECTION_ID_TASKS;

      if (!databaseId || !tasksCollectionId) {
        if (!cancelled) {
          setStats({
            total: 0,
            done: 0,
            loading: false,
            error: "Thiếu cấu hình Appwrite",
          });
        }
        return;
      }

      setStats((prev) => ({ ...prev, loading: true, error: undefined }));

      try {
        const assigneeId = activeMember.$id?.trim();
        if (!assigneeId) {
          setStats({ total: 0, done: 0, loading: false });
          return;
        }
        const res = await database.listDocuments(
          String(databaseId),
          String(tasksCollectionId),
          [
            Query.equal("projectId", projectId),
            Query.equal("assignee", assigneeId),
            Query.limit(200),
          ]
        );

        if (cancelled) return;

        const documents = res.documents as Array<Record<string, unknown>>;
        const total = documents.length;
        const done = documents.filter((doc) => {
          const status =
            typeof doc.status === "string"
              ? doc.status.trim().toLowerCase()
              : "";
          return status === "completed";
        }).length;

        setStats({ total, done, loading: false });
      } catch {
        if (!cancelled) {
          setStats({
            total: 0,
            done: 0,
            loading: false,
            error: "Không thể tải dữ liệu task",
          });
        }
      }
    };

    void loadStats();

    return () => {
      cancelled = true;
    };
  }, [isOpen, view, activeMember, projectId]);

  const handleMemberSelect = (member: EnrichedProjectMember) => {
    setActiveMember(member);
    setView("profile");
  };

  const handleBack = () => {
    setView("list");
    setActiveMember(null);
    setStats(defaultStats);
    setIsProcessing(false);
  };

  const handleAddMember = async (userId: string) => {
    if (isProjectClosed) {
      toast.error("Dự án đã đóng, không thể thêm thành viên.");
      return;
    }
    setIsProcessing(true);
    const result = await addMember(userId);
    setIsProcessing(false);

    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  const handleRemove = async () => {
    if (!activeMember || !activeMember.membershipId) {
      toast.error("Không thể xóa thành viên này.");
      return;
    }
    if (isProjectClosed) {
      toast.error("Dự án đã đóng, không thể xóa thành viên.");
      return;
    }
    setIsProcessing(true);
    const result = await removeMember(activeMember.membershipId);
    setIsProcessing(false);
    if (result.success) {
      toast.success(result.message);
      handleBack();
    } else {
      toast.error(result.message);
    }
  };

  return (
    <ModalComponent
      isOpen={isOpen}
      setIsOpen={(value) => {
        if (!value) onClose();
      }}
      title={view === "list" ? "Thành viên của dự án" : "Thông tin thành viên"}
      onClose={onClose}
      panelClassName="sm:max-w-lg"
      showBackButton={view === "profile"}
      onBack={handleBack}
    >
      {isProjectClosed && (
        <div className="mb-4 rounded border border-yellow-400 bg-yellow-100 px-3 py-2 text-sm text-yellow-800">
          Dự án đã đóng. Chức năng quản lý thành viên đang bị khóa.
        </div>
      )}
      {view === "list" ? (
        <ProjectMemberListView
          leader={leader}
          members={nonLeaderMembers}
          isLeader={isLeader}
          isMembersLoading={isMembersLoading}
          onAddMember={handleAddMember}
          onMemberClick={handleMemberSelect}
          isProjectClosed={isProjectClosed}
        />
      ) : activeMember ? (
        <ProjectMemberProfileView
          member={activeMember}
          stats={stats}
          canRemove={Boolean(
            isLeader && !activeMember.isLeader && !isProjectClosed
          )}
          onRemove={handleRemove}
          isRemoving={isProcessing}
        />
      ) : (
        <div className="text-sm text-gray-600">
          Không tìm thấy thông tin thành viên.
        </div>
      )}
    </ModalComponent>
  );
};

export default ProjectMembersModal;
