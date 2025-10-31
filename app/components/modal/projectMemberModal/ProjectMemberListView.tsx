"use client";

import React from "react";
import AvatarUser from "../../common/AvatarUser";
import { EnrichedProjectMember } from "../../../hooks/useProjectOperations";
import UserSearchInput from "./UserSearchInput";

interface ProjectMemberListViewProps {
  leader: EnrichedProjectMember | null;
  members: EnrichedProjectMember[];
  isLeader: boolean;
  isMembersLoading: boolean;
  onAddMember: (userId: string) => Promise<void>;
  onMemberClick: (member: EnrichedProjectMember) => void;
}

const ProjectMemberListView: React.FC<ProjectMemberListViewProps> = ({
  leader,
  members,
  isLeader,
  isMembersLoading,
  onAddMember,
  onMemberClick,
}) => {
  const existingMemberIds = React.useMemo(
    () => members.map((m) => m.$id),
    [members]
  );

  return (
    <div className="space-y-5">
      {isLeader && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Thêm thành viên
          </label>
          <UserSearchInput
            onAddMember={onAddMember}
            existingMemberIds={existingMemberIds}
          />
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Thành viên leader của dự án
        </label>
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
        <label className="text-sm font-medium text-gray-700">
          Thành viên của dự án
        </label>
        {isMembersLoading ? (
          <div className="rounded border border-dashed border-gray-300 px-3 py-3 text-sm text-gray-500">
            Đang tải thành viên...
          </div>
        ) : members.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {members.map((member, index) => (
              <button
                key={member.$id || `${member.name}-${index}`}
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
