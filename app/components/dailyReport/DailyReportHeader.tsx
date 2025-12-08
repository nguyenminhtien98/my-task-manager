"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  LuCalendar,
  LuChevronLeft,
  LuChevronRight,
  LuSettings2,
  LuUserCheck,
  LuX,
} from "react-icons/lu";
import { cn } from "../../utils/cn";
import FloatingDropdown from "../common/FloatingDropdown";

interface DailyReportHeaderProps {
  projectName: string;
  memberCount: number;
  isMyReports: boolean;
  onToggleMyReports: (value: boolean) => void;
  selectedDate: string | null;
  onDateChange: (value: string | null) => void;
  onOpenSettings: () => void;
  showSettingsButton?: boolean;
  className?: string;
}

const formatDateLabel = (value: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("vi-VN");
};

const toISODate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const daysOfWeek = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const todayISO = toISODate(new Date());

const DailyReportHeader: React.FC<DailyReportHeaderProps> = ({
  projectName,
  memberCount,
  isMyReports,
  onToggleMyReports,
  selectedDate,
  onDateChange,
  onOpenSettings,
  showSettingsButton = true,
  className,
}) => {
  const dateLabel = useMemo(() => formatDateLabel(selectedDate), [selectedDate]);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [isCalendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() =>
    selectedDate ? new Date(selectedDate) : new Date()
  );

  useEffect(() => {
    if (selectedDate) {
      setCalendarMonth(new Date(selectedDate));
    }
  }, [selectedDate]);

  const openCalendar = () => {
    setCalendarOpen((prev) => !prev);
  };

  const weeks = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0);
    const startDay = startOfMonth.getDay();
    const totalDays = endOfMonth.getDate();

    const calendar: Array<Array<{ date: Date; inMonth: boolean }>> = [];
    let currentDay = 1 - startDay;

    while (currentDay <= totalDays) {
      const week: Array<{ date: Date; inMonth: boolean }> = [];
      for (let i = 0; i < 7; i += 1) {
        const date = new Date(year, month, currentDay);
        week.push({
          date,
          inMonth: date.getMonth() === month,
        });
        currentDay += 1;
      }
      calendar.push(week);
    }
    return calendar;
  }, [calendarMonth]);

  const handleSelectDate = (date: Date) => {
    onDateChange(toISODate(date));
    setCalendarOpen(false);
  };

  const handleClearDate = () => {
    onDateChange(null);
    setCalendarOpen(false);
  };

  const calendarTitle = calendarMonth.toLocaleDateString("vi-VN", {
    month: "long",
    year: "numeric",
  });

  const calendarContent = (
    <div>
      <div className="mb-3 flex items-center justify-between text-sm font-semibold">
        <button
          type="button"
          onClick={() =>
            setCalendarMonth(
              (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
            )
          }
          className="rounded-full border border-white/20 p-1 text-white transition hover:border-white/40 hover:text-white cursor-pointer"
          aria-label="Tháng trước"
        >
          <LuChevronLeft />
        </button>
        <span>{calendarTitle}</span>
        <button
          type="button"
          onClick={() =>
            setCalendarMonth(
              (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
            )
          }
          className="rounded-full border border-white/20 p-1 text-white transition hover:border-white/40 hover:text-white cursor-pointer"
          aria-label="Tháng sau"
        >
          <LuChevronRight />
        </button>
      </div>
      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] text-white/60">
        {daysOfWeek.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 text-sm">
        {weeks.map((week, weekIndex) =>
          week.map((entry, dayIndex) => {
            const iso = toISODate(entry.date);
            const isSelected = selectedDate === iso;
            const isToday = iso === todayISO;
            return (
              <button
                key={`${weekIndex}-${dayIndex}`}
                type="button"
                disabled={!entry.inMonth}
                onClick={() => handleSelectDate(entry.date)}
                aria-pressed={isSelected}
                className={cn(
                  "h-9 rounded-full transition cursor-pointer disabled:cursor-not-allowed",
                  !entry.inMonth
                    ? "text-white/25"
                    : isSelected
                      ? "bg-white text-black shadow"
                      : isToday
                        ? "border border-white/60 text-white"
                        : "text-white hover:bg-white/10"
                )}
              >
                {entry.date.getDate()}
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <header className={cn("p-2", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-white"># {projectName}</h1>
        <div className="flex flex-col gap-2 text-sm text-white/70">
          <div className="flex items-center gap-3">
            {showSettingsButton && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-black/70 p-2.5 text-white/80 transition hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 cursor-pointer"
                aria-label="Cài đặt báo cáo"
              >
                <LuSettings2 className="h-4 w-4" />
              </button>
            )}
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/70 px-2 py-1">
              <button
                type="button"
                onClick={() => onToggleMyReports(!isMyReports)}
                aria-pressed={isMyReports}
                className={`flex items-center gap-2 rounded-full px-4 py-1 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 cursor-pointer ${isMyReports
                  ? "bg-white text-black shadow"
                  : "text-white/70 hover:text-white"
                  }`}
              >
                <LuUserCheck />
                Của tôi
              </button>
              <div className="relative">
                <button
                  ref={buttonRef}
                  type="button"
                  onClick={openCalendar}
                  aria-expanded={isCalendarOpen}
                  className={cn(
                    "flex min-w-[180px] items-center gap-2 rounded-full px-4 py-1 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 cursor-pointer",
                    selectedDate
                      ? "justify-between bg-white text-black shadow"
                      : "justify-center text-white/70 hover:text-white"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <LuCalendar />
                    {dateLabel ?? "Chọn ngày"}
                  </span>
                  {selectedDate && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleClearDate();
                      }}
                      className="rounded-full bg-black/10 p-1 text-black transition hover:bg-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40"
                      aria-label="Xóa ngày lọc"
                    >
                      <LuX className="h-3 w-3" />
                    </button>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="text-sm text-white/60">
        Thành viên trong phòng: <span className="text-white">{memberCount}</span>
      </p>
      <FloatingDropdown
        anchorRef={buttonRef}
        isOpen={isCalendarOpen}
        onClose={() => setCalendarOpen(false)}
        placement="bottom-right"
        offset={{ y: 6 }}
        zIndex={3200}
        contentClassName="w-[280px] p-3"
      >
        {calendarContent}
      </FloatingDropdown>
    </header>
  );
};

export default DailyReportHeader;
