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
