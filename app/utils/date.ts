"use client";

export const formatVietnameseDateTime = (
  isoString?: string,
  options?: { hideTime?: boolean }
) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();

  if (options?.hideTime) {
    return `${day} th ${month}, ${year}`;
  }

  const time = date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${time} ${day} th ${month}, ${year}`;
};

export const formatRelativeTimeFromNow = (isoString?: string) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSeconds = Math.round(diffMs / 1000);
  if (diffSeconds < 30) return "Vừa xong";
  if (diffSeconds < 60) return `${diffSeconds} giây trước`;
  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 30) return `${diffDays} ngày trước`;
  const diffMonths = Math.round(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} tháng trước`;
  const diffYears = Math.round(diffMonths / 12);
  return `${diffYears} năm trước`;
};

export const diffInMinutes = (
  a: Date | string | number,
  b: Date | string | number
) => {
  const toDate = (value: Date | string | number) => {
    if (value instanceof Date) return value;
    if (typeof value === "number") return new Date(value);
    return new Date(value);
  };

  const dateA = toDate(a);
  const dateB = toDate(b);

  if (
    Number.isNaN(dateA.getTime()) ||
    Number.isNaN(dateB.getTime())
  ) {
    return 0;
  }

  const diffMs = dateA.getTime() - dateB.getTime();
  return Math.floor(diffMs / (60 * 1000));
};
