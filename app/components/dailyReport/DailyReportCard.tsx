"use client";

import React, { useMemo, useRef, useState } from "react";
import { FiMoreHorizontal, FiEdit3, FiTrash2 } from "react-icons/fi";
import AvatarUser from "../common/AvatarUser";
import type { DailyReportEntry } from "../../hooks/useDailyReportRoom";
import { formatRelativeTimeFromNow } from "../../utils/date";
import { renderReportContent } from "../../utils/richText";
import FloatingDropdown from "../common/FloatingDropdown";

interface DailyReportCardProps {
  entry: DailyReportEntry;
  isOwn: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

const DailyReportCard: React.FC<DailyReportCardProps> = ({
  entry,
  isOwn,
  onEdit,
  onDelete,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);

  const renderedContent = useMemo(
    () => renderReportContent(entry.content),
    [entry.content]
  );

  return (
    <article className="flex w-fit max-w-4xl flex-wrap items-start gap-3 rounded-2xl border border-white/10 bg-black/60 p-3 shadow-lg shadow-black/50">
      <div className="flex-shrink-0">
        <AvatarUser
          name={entry.author.name}
          avatarUrl={entry.author.avatarUrl}
          size={40}
          showTooltip={false}
        />
      </div>
      <div className="rich-text-editor min-w-[200px] flex-1 text-sm text-white/90">
        <div className="flex flex-wrap items-center gap-3 text-white">
          <span className="font-semibold">{entry.author.name}</span>
          <span className="text-xs text-white/50">
            {formatRelativeTimeFromNow(entry.createdAt)}
          </span>
        </div>
        <div
          className="mt-2 leading-relaxed text-white/90"
          dangerouslySetInnerHTML={{ __html: renderedContent }}
        />
      </div>
      {isOwn && (
        <div className="relative flex-shrink-0">
          <button
            ref={menuButtonRef}
            type="button"
            aria-label="Mở tùy chọn báo cáo"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="cursor-pointer rounded-full border border-white/15 bg-white/5 p-2 text-white/70 transition hover:border-white/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            <FiMoreHorizontal className="h-3 w-3" />
          </button>
          <FloatingDropdown
            anchorRef={menuButtonRef}
            isOpen={isMenuOpen}
            onClose={() => setIsMenuOpen(false)}
            placement="bottom-right"
            offset={{ y: 4 }}
            zIndex={2100}
            contentClassName="flex w-44 flex-col p-1 text-sm"
          >
            <button
              type="button"
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-left transition hover:bg-white/10"
              onClick={() => {
                setIsMenuOpen(false);
                onEdit();
              }}
            >
              <FiEdit3 />
              Chỉnh sửa
            </button>
            <button
              type="button"
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-left text-red-300 transition hover:bg-white/5"
              onClick={() => {
                setIsMenuOpen(false);
                onDelete();
              }}
            >
              <FiTrash2 />
              Xóa
            </button>
          </FloatingDropdown>
        </div>
      )}
    </article>
  );
};

export default DailyReportCard;
