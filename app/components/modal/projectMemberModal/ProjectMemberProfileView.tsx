"use client";

import React from "react";
import AvatarUser from "../../common/AvatarUser";
import { ProjectMemberProfile } from "../../../hooks/useProjectMembers";
import Button from "../../common/Button";
import { formatVietnameseDateTime } from "@/app/utils/date";

interface TaskStats {
  total: number;
  done: number;
  loading: boolean;
  error?: string;
}

interface ProjectMemberProfileViewProps {
  member: ProjectMemberProfile;
  stats: TaskStats;
  canRemove: boolean;
  onRemove: () => void;
  isRemoving: boolean;
}

const ProjectMemberProfileView: React.FC<ProjectMemberProfileViewProps> = ({
  member,
  stats,
  canRemove,
  onRemove,
  isRemoving,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <AvatarUser
          name={member.name}
          size={56}
          className="shadow"
          title={member.name}
          showTooltip={false}
          avatarUrl={member?.avatarUrl}
        />
        <div className="space-y-2">
          <p className="text-base font-semibold text-gray-900">{member.name}</p>
          <p className="text-sm text-gray-600">
            Tham gia dự án:{" "}
            {formatVietnameseDateTime(member.joinedAt, { hideTime: true })}
          </p>
        </div>
      </div>

      <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-800">
        {stats.loading ? (
          <span>Đang tải thống kê task...</span>
        ) : stats.error ? (
          <span>{stats.error}</span>
        ) : (
          <div className="flex flex-col gap-1">
            <span>Tổng task: {stats.total}</span>
            <span>Task completed: {stats.done}</span>
          </div>
        )}
      </div>

      {canRemove && (
        <Button
          onClick={onRemove}
          disabled={isRemoving}
          className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-400"
        >
          {isRemoving ? "Đang xóa..." : "Xóa thành viên"}
        </Button>
      )}
    </div>
  );
};

export default ProjectMemberProfileView;
