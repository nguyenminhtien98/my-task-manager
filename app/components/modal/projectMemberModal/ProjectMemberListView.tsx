"use client";

import React from "react";
import AvatarUser from "../../common/AvatarUser";
import Button from "../../common/Button";
import { ProjectMemberProfile } from "../../../hooks/useProjectMembers";

interface ProjectMemberListViewProps {
  leader: ProjectMemberProfile | null;
  members: ProjectMemberProfile[];
  isLeader: boolean;
  isMembersLoading: boolean;
  pendingMemberName: string;
  onPendingMemberNameChange: (value: string) => void;
  onAddMember: () => void;
  isAddingMember: boolean;
  onMemberClick: (member: ProjectMemberProfile) => void;
}

const ProjectMemberListView: React.FC<ProjectMemberListViewProps> = ({
  leader,
  members,
  isLeader,
  isMembersLoading,
  pendingMemberName,
  onPendingMemberNameChange,
  onAddMember,
  isAddingMember,
  onMemberClick,
}) => {
  const handleSubmit = () => {
    onAddMember();
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Thêm thành viên</label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={pendingMemberName}
            onChange={(event) => onPendingMemberNameChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Nhập tên thành viên"
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          />
          <Button
            onClick={handleSubmit}
            disabled={isAddingMember || pendingMemberName.trim().length === 0}
            className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-black/80 disabled:cursor-not-allowed disabled:bg-black/50"
          >
            {isAddingMember ? "Đang thêm..." : "Thêm"}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Thành viên leader của dự án</label>
        <div className="flex items-center gap-2">
          {leader ? (
            <button
              type="button"
              onClick={() => onMemberClick(leader)}
              className="inline-flex focus:outline-none"
            >
              <AvatarUser
                name={leader.name}
                avatarUrl={leader.avatarUrl}
                size={42}
                className="border border-black shadow"
                title={leader.name}
              />
            </button>
          ) : (
            <span className="text-sm text-gray-500">Chưa xác định leader.</span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Thành viên của dự án</label>
        {isMembersLoading ? (
          <div className="rounded border border-dashed border-gray-300 px-3 py-3 text-sm text-gray-500">
            Đang tải thành viên...
          </div>
        ) : members.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {members.map((member, index) => (
              <button
                key={member.id || `${member.name}-${index}`}
                type="button"
                onClick={() => onMemberClick(member)}
                className="inline-flex focus:outline-none"
              >
                <AvatarUser
                  name={member.name}
                  avatarUrl={member.avatarUrl}
                  size={40}
                  className="shadow"
                  title={member.name}
                />
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded border border-dashed border-gray-300 px-3 py-3 text-sm text-gray-500">
            Chưa có thành viên nào khác trong dự án.
          </div>
        )}
        {!isLeader && (
          <p className="text-xs text-gray-500">
            Chỉ leader mới có quyền xóa thành viên khỏi dự án.
          </p>
        )}
      </div>
    </div>
  );
};

export default ProjectMemberListView;
