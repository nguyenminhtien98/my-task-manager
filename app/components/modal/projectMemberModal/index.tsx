"use client";

import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Query } from "appwrite";
import { database } from "../../../appwrite";
import ModalComponent from "../../common/ModalComponent";
import ProjectMemberListView from "./ProjectMemberListView";
import ProjectMemberProfileView from "./ProjectMemberProfileView";
import {
  useProjectMembers,
  type ProjectMemberProfile,
} from "../../../hooks/useProjectMembers";
import { useProject } from "../../../context/ProjectContext";

interface ProjectMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMember?: ProjectMemberProfile | null;
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
}) => {
  const { currentProject, currentProjectRole } = useProject();
  const {
    members: allMembers,
    leader,
    addMember,
    removeMember,
    isLoading: isMembersLoading,
  } = useProjectMembers();

  const [view, setView] = useState<"list" | "profile">("list");
  const [activeMember, setActiveMember] = useState<ProjectMemberProfile | null>(null);
  const [stats, setStats] = useState<TaskStats>(defaultStats);
  const [isRemoving, setIsRemoving] = useState(false);
  const [pendingMemberName, setPendingMemberName] = useState("");
  const [isAddingMember, setIsAddingMember] = useState(false);

  const projectId = currentProject?.id;
  const isLeader = currentProjectRole === "leader";

  const combinedMembers = useMemo(() => {
    if (!leader) return allMembers;
    return [
      leader,
      ...allMembers.filter((member) => member.id !== leader.id && !member.isLeader),
    ];
  }, [allMembers, leader]);

  const nonLeaderMembers = useMemo(
    () => combinedMembers.filter((member) => !member.isLeader),
    [combinedMembers]
  );

  useEffect(() => {
    if (!isOpen) {
      setView("list");
      setActiveMember(null);
      setStats(defaultStats);
      setIsRemoving(false);
      setPendingMemberName("");
      setIsAddingMember(false);
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
    const match = combinedMembers.find((member) => {
      if (member.id && activeMember.id) {
        return member.id === activeMember.id;
      }
      return (
        member.name.trim().toLowerCase() ===
        activeMember.name.trim().toLowerCase()
      );
    });

    if (!match) {
      setActiveMember(null);
      setView("list");
      return;
    }

    if (match !== activeMember) {
      setActiveMember(match);
    }
  }, [combinedMembers, activeMember]);

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
        const assigneeName = activeMember.name.trim();
        const res = await database.listDocuments(
          String(databaseId),
          String(tasksCollectionId),
          [
            Query.equal("projectId", projectId),
            Query.equal("assignee", assigneeName),
            Query.limit(200),
          ]
        );

        if (cancelled) return;

        const documents = res.documents as Array<Record<string, unknown>>;
        const total = documents.length;
        const done = documents.filter((doc) => {
          const status =
            typeof doc.status === "string" ? doc.status.trim().toLowerCase() : "";
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

  const handleMemberSelect = (member: ProjectMemberProfile) => {
    setActiveMember(member);
    setView("profile");
  };

  const handleBack = () => {
    setView("list");
    setActiveMember(null);
    setStats(defaultStats);
    setIsRemoving(false);
  };

  const handleAddMember = async () => {
    const trimmed = pendingMemberName.trim();
    if (!trimmed) {
      toast.error("Vui lòng nhập tên thành viên");
      return;
    }

    setIsAddingMember(true);
    const result = await addMember(trimmed);
    setIsAddingMember(false);

    if (result.success) {
      toast.success(result.message);
      setPendingMemberName("");
    } else {
      toast.error(result.message);
    }
  };

  const handleRemove = async () => {
    if (!activeMember) return;
    setIsRemoving(true);
    const result = await removeMember(activeMember.name);
    setIsRemoving(false);
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
      {view === "list" ? (
        <ProjectMemberListView
          leader={leader}
          members={nonLeaderMembers}
          isLeader={isLeader}
          isMembersLoading={isMembersLoading}
          pendingMemberName={pendingMemberName}
          onPendingMemberNameChange={setPendingMemberName}
          onAddMember={handleAddMember}
          isAddingMember={isAddingMember}
          onMemberClick={handleMemberSelect}
        />
      ) : activeMember ? (
        <ProjectMemberProfileView
          member={activeMember}
          stats={stats}
          canRemove={Boolean(isLeader && !activeMember.isLeader)}
          onRemove={handleRemove}
          isRemoving={isRemoving}
        />
      ) : (
        <div className="text-sm text-gray-600">Không tìm thấy thông tin thành viên.</div>
      )}
    </ModalComponent>
  );
};

export default ProjectMembersModal;
