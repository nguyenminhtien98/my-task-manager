"use client";

export const DEFAULT_DAILY_REPORT_REMIND_MINUTES = 17 * 60;
export const DEFAULT_DAILY_REPORT_WEEKDAYS = ["1", "2", "3", "4", "5"];
export const DEFAULT_DAILY_REPORT_TIMEZONE =
  Intl.DateTimeFormat().resolvedOptions().timeZone ?? "Asia/Ho_Chi_Minh";

export const DEFAULT_DAILY_REPORT_SETTINGS = {
  remindEnabled: true,
  remindTime: "17:00",
  remindWeekdays: DEFAULT_DAILY_REPORT_WEEKDAYS,
};
