"use client";

import React, { useMemo } from "react";
import ModalComponent from "../common/ModalComponent";
import type { DailyReportSettings } from "../../hooks/useDailyReportRoom";
import { cn } from "../../utils/cn";

interface DailyReportSettingsModalProps {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  settings: DailyReportSettings;
  onChange: (partial: Partial<DailyReportSettings>) => void;
}

const weekdayOptions = [
  { label: "Th 2", value: "1" },
  { label: "Th 3", value: "2" },
  { label: "Th 4", value: "3" },
  { label: "Th 5", value: "4" },
  { label: "Th 6", value: "5" },
  { label: "Th 7", value: "6" },
];

const weekdayOrder = weekdayOptions.reduce<Record<string, number>>(
  (acc, option, index) => {
    acc[option.value] = index;
    return acc;
  },
  {}
);

const DailyReportSettingsModal: React.FC<DailyReportSettingsModalProps> = ({
  isOpen,
  setIsOpen,
  settings,
  onChange,
}) => {
  const sortedWeekdays = useMemo(
    () =>
      [...settings.remindWeekdays].sort(
        (a, b) => (weekdayOrder[a] ?? 0) - (weekdayOrder[b] ?? 0)
      ),
    [settings.remindWeekdays]
  );

  const handleToggleWeekday = (value: string) => {
    const exists = settings.remindWeekdays.includes(value);
    const next = exists
      ? settings.remindWeekdays.filter((item) => item !== value)
      : [...settings.remindWeekdays, value];
    onChange({
      remindWeekdays: next.sort(
        (a, b) => (weekdayOrder[a] ?? 0) - (weekdayOrder[b] ?? 0)
      ),
    });
  };

  const handleTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ remindTime: event.target.value });
  };

  const handleToggleReminder = () => {
    onChange({ remindEnabled: !settings.remindEnabled });
  };

  return (
    <ModalComponent
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      title="Cài đặt"
      panelClassName="sm:max-w-lg"
    >
      <div className="space-y-6 text-left">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">
              Thông báo báo cáo
            </p>
            <p className="text-xs text-gray-500">
              Tự động nhắc thành viên gửi báo cáo.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.remindEnabled}
            onClick={handleToggleReminder}
            className={cn(
              "relative h-8 w-16 rounded-full border border-gray-300 transition cursor-pointer",
              settings.remindEnabled
                ? "bg-emerald-500 border-emerald-500"
                : "bg-gray-200"
            )}
          >
            <span
              className={cn(
                "absolute top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-white shadow transition",
                settings.remindEnabled ? "left-[36px]" : "left-2"
              )}
            />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-sm font-semibold text-gray-900">
            Giờ báo cáo
          </label>
          <input
            type="time"
            value={settings.remindTime}
            onChange={handleTimeChange}
            className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-gray-400 focus:bg-white"
          />
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-sm font-semibold text-gray-900">Số ngày</span>
          <div className="flex flex-wrap gap-2">
            {weekdayOptions.map((option) => {
              const isActive = sortedWeekdays.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleToggleWeekday(option.value)}
                  className={cn(
                    "rounded-md px-4 py-2 text-sm font-semibold transition cursor-pointer",
                    isActive
                      ? "bg-black text-white"
                      : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </ModalComponent>
  );
};

export default DailyReportSettingsModal;
