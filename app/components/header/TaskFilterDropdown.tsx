"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiChevronDown, FiFilter } from "react-icons/fi";
import { IoBugOutline } from "react-icons/io5";
import { FaLightbulb, FaStar } from "react-icons/fa";
import {
  FcHighPriority,
  FcLowPriority,
  FcMediumPriority,
} from "react-icons/fc";
import AvatarUser from "../common/AvatarUser";
import { EnrichedProjectMember } from "../../hooks/useProjectOperations";
import { cn } from "../../utils/cn";
import {
  PriorityKey,
  IssueTypeKey,
  countActiveTaskFilters,
} from "../../utils/taskFilters";
import { useTaskFilter } from "../../context/TaskFilterContext";

interface TaskFilterDropdownProps {
  members: EnrichedProjectMember[];
  disabled?: boolean;
}

const priorityOptions: Record<
  PriorityKey,
  { label: string; icon: React.ReactNode }
> = {
  low: { label: "Thấp", icon: <FcLowPriority className="shrink-0" /> },
  medium: { label: "Trung bình", icon: <FcMediumPriority className="shrink-0" /> },
  high: { label: "Cao", icon: <FcHighPriority className="shrink-0" /> },
};

const issueTypeOptions: Record<
  IssueTypeKey,
  { label: string; icon: React.ReactNode }
> = {
  feature: { label: "Feature", icon: <FaStar className="shrink-0 text-blue-500" /> },
  bug: { label: "Bug", icon: <IoBugOutline className="shrink-0 text-red-500" /> },
  improvement: {
    label: "Improvement",
    icon: <FaLightbulb className="shrink-0 text-green-500" />,
  },
};

const TaskFilterDropdown: React.FC<TaskFilterDropdownProps> = ({
  members,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showMemberPicker, setShowMemberPicker] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { filters, updateFilters, resetFilters } = useTaskFilter();

  const toggleDropdown = () => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
  };

  const handleOutsideClick = useCallback((event: MouseEvent) => {
    if (
      containerRef.current &&
      !containerRef.current.contains(event.target as Node)
    ) {
      setIsOpen(false);
      setShowMemberPicker(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [handleOutsideClick, isOpen]);

  type BooleanFilterKey = "noAssignee" | "myTasks" | "noDueDate" | "overdue";

  const toggleFilter = (key: BooleanFilterKey, value?: boolean) => {
    updateFilters((prev) => ({
      ...prev,
      [key]: typeof value === "boolean" ? value : !prev[key],
    }));
  };

  const togglePriority = (key: PriorityKey) => {
    updateFilters((prev) => ({
      ...prev,
      priorities: {
        ...prev.priorities,
        [key]: !prev.priorities[key],
      },
    }));
  };

  const toggleIssueType = (key: IssueTypeKey) => {
    updateFilters((prev) => ({
      ...prev,
      issueTypes: {
        ...prev.issueTypes,
        [key]: !prev.issueTypes[key],
      },
    }));
  };

  const handleMemberSelect = (memberId: string) => {
    updateFilters((prev) => {
      const exists = prev.selectedMembers.includes(memberId);
      return {
        ...prev,
        selectedMembers: exists
          ? prev.selectedMembers.filter((id) => id !== memberId)
          : [...prev.selectedMembers, memberId],
      };
    });
  };

  const activeFilterCount = useMemo(
    () => countActiveTaskFilters(filters),
    [filters]
  );

  const clearFilters = () => {
    resetFilters();
    setShowMemberPicker(false);
  };

  const renderCheckbox = (
    label: string,
    checked: boolean,
    onChange: () => void,
    icon?: React.ReactNode
  ) => (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-[#111827]" >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
      />
      {icon && <span className="flex items-center">{icon}</span>}
      <span>{label}</span>
    </label>
  );

  const selectedMemberNames = useMemo(() => {
    if (filters.selectedMembers.length === 0) return "Chọn thành viên";
    if (filters.selectedMembers.length === 1) {
      const member = members.find(
        (m) =>
          m.$id === filters.selectedMembers[0] ||
          m.userId === filters.selectedMembers[0]
      );
      return member?.name ?? "1 thành viên";
    }
    return `${filters.selectedMembers.length} thành viên`;
  }, [filters.selectedMembers, members]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex items-center gap-2 text-white",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <div className="cursor-pointer rounded-full bg-white/10 p-2 flex items-center gap-2 hover:bg-white/20 transition">
        <button
          type="button"
          className="cursor-pointer flex items-center gap-2 justify-center text-white transition "
          onClick={toggleDropdown}
          disabled={disabled}
          aria-label="Bộ lọc task"
        >
          <FiFilter className="h-4 w-4" />
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-white/90 px-2 py-0.5 text-xs font-bold text-black">
              {activeFilterCount}
            </span>
          )}
        </button>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs font-semibold text-white/80 transition hover:text-white cursor-pointer"
          >
            Xóa tất cả
          </button>
        )}
      </div>


      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-black/10 bg-white p-3 text-[#111827] shadow-2xl">
          <p className="text-sm font-semibold">Lọc task</p>
          <div className="mt-3 space-y-4 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500">
                Thành viên
              </p>
              <div className="mt-2 space-y-2">
                {renderCheckbox("Không có thành viên", filters.noAssignee, () =>
                  toggleFilter("noAssignee")
                )}
                {renderCheckbox("Task của tôi", filters.myTasks, () =>
                  toggleFilter("myTasks")
                )}
                <div className="space-y-2">
                  <button
                    type="button"
                    className="cursor-pointer flex w-full items-center gap-2 text-left text-sm font-medium transition"
                    onClick={() => setShowMemberPicker((prev) => !prev)}
                  >
                    <input
                      type="checkbox"
                      readOnly
                      checked={filters.selectedMembers.length > 0}
                      className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                    />
                    <span className="flex-1 truncate">{selectedMemberNames}</span>
                    <FiChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform",
                        showMemberPicker && "rotate-180"
                      )}
                    />
                  </button>
                  {showMemberPicker && (
                    <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-black/10 bg-white p-2 space-y-1">
                      {members.length === 0 && (
                        <p className="text-xs text-gray-500">
                          Chưa có thành viên nào.
                        </p>
                      )}
                      {members.map((member) => {
                        const memberId = member.$id ?? member.userId ?? "";
                        if (!memberId) return null;
                        const checked = filters.selectedMembers.includes(memberId);
                        return (
                          <label
                            key={memberId}
                            className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition hover:bg-black/5 cursor-pointer"
                          >
                            <AvatarUser
                              name={member.name}
                              avatarUrl={member.avatarUrl}
                              size={28}
                              showTooltip={false}
                            />
                            <span className="flex-1 truncate text-sm font-medium text-[#111827]">
                              {member.name}
                            </span>
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                              checked={checked}
                              onChange={() => handleMemberSelect(memberId)}
                            />
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase text-gray-500">
                Ngày kết thúc
              </p>
              <div className="mt-2 space-y-2">
                {renderCheckbox("Không có ngày kết thúc", filters.noDueDate, () =>
                  toggleFilter("noDueDate")
                )}
                {renderCheckbox("Quá ngày kết thúc", filters.overdue, () =>
                  toggleFilter("overdue")
                )}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase text-gray-500">
                Mức độ ưu tiên
              </p>
              <div className="mt-2 grid grid-cols-1 gap-2">
                {(Object.keys(priorityOptions) as PriorityKey[]).map((key) => (
                  <div key={key}>
                    {renderCheckbox(
                      priorityOptions[key].label,
                      filters.priorities[key],
                      () => togglePriority(key),
                      priorityOptions[key].icon
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase text-gray-500">
                Issue type
              </p>
              <div className="mt-2 grid grid-cols-1 gap-2">
                {(Object.keys(issueTypeOptions) as IssueTypeKey[]).map((key) => (
                  <div key={key}>
                    {renderCheckbox(
                      issueTypeOptions[key].label,
                      filters.issueTypes[key],
                      () => toggleIssueType(key),
                      issueTypeOptions[key].icon
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskFilterDropdown;
