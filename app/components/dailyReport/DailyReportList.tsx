"use client";

import React from "react";
import type {
  DailyReportEntry,
  DailyReportGroup,
} from "../../hooks/useDailyReportRoom";
import DailyReportCard from "./DailyReportCard";
import { formatVietnameseDateTime } from "../../utils/date";
import { cn } from "../../utils/cn";
import LoadingSpinner from "../loading/LoadingSpinner";
import DailyReportSkeleton from "../loading/DailyReportSkeleton";

interface DailyReportListProps {
  groups: DailyReportGroup[];
  currentUserId?: string;
  onEdit: (entry: DailyReportEntry) => void;
  onDelete: (entry: DailyReportEntry) => void;
  className?: string;
  isLoading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}

const DailyReportList: React.FC<DailyReportListProps> = ({
  groups,
  currentUserId,
  onEdit,
  onDelete,
  className,
  isLoading,
  onLoadMore,
  hasMore,
  isLoadingMore,
}) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (!scrollRef.current || isLoadingMore || !hasMore || !onLoadMore) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    if (scrollHeight - scrollTop - clientHeight < 300) {
      onLoadMore();
    }
  };

  if (isLoading) {
    return (
      <div
        className={cn(
          "flex flex-1 items-center justify-center px-6 py-4 text-sm text-white/70",
          className
        )}
      >
        <div className="flex items-center gap-2">
          <LoadingSpinner size={16} thickness={2} label="Đang tải báo cáo" />
          Đang tải báo cáo...
        </div>
      </div>
    );
  }

  if (!groups.length) {
    return (
      <div
        className={cn(
          "flex flex-1 items-center justify-center px-6 py-4 text-center text-sm text-white/60",
          className
        )}
      >
        Chưa có báo cáo nào cho bộ lọc hiện tại. Hãy là người đầu tiên cập nhật
        tiến độ hôm nay nhé!
      </div>
    );
  }

  return (
    <div className={cn("flex-1 overflow-hidden", className)}>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto p-2 no-scrollbar"
      >
        {groups.map((group, groupIndex) => {
          const sampleEntry = group.entries[0];
          const label = sampleEntry
            ? formatVietnameseDateTime(sampleEntry.createdAt, { hideTime: true })
            : group.dateKey;
          return (
            <div key={group.dateKey} className="space-y-4">
              <div
                className={cn(
                  "flex items-center gap-3 text-[11px] uppercase tracking-[0.3em] text-white/50 mb-6",
                  groupIndex === 0 ? "mt-0" : "mt-6"
                )}
              >
                <div className="h-px flex-1 bg-white/70" />
                <span className="rounded-full bg-white px-2 py-0.5 tracking-[0.3em] text-black">
                  {label}
                </span>
                <div className="h-px flex-1 bg-white/70" />
              </div>
              <div className="space-y-3">
                {group.entries.map((entry) => (
                  <DailyReportCard
                    key={entry._id}
                    entry={entry}
                    isOwn={entry.author._id === currentUserId}
                    onEdit={() => onEdit(entry)}
                    onDelete={() => onDelete(entry)}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {isLoadingMore && (
          <div className="py-4">
            <DailyReportSkeleton />
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyReportList;
