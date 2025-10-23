"use client";

import React, { type CSSProperties } from "react";
import Image from "next/image";

interface AvatarUserProps {
  name: string;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
  onClick?: () => void;
  title?: string;
}

const COLOR_PALETTE = [
  { background: "#1F2937", color: "#F9FAFB" }, // Gray 800 / Gray 50
  { background: "#10B981", color: "#FFFFFF" }, // Emerald 500
  { background: "#6366F1", color: "#FFFFFF" }, // Indigo 500
  { background: "#EF4444", color: "#FFFFFF" }, // Red 500
  { background: "#F97316", color: "#FFFFFF" }, // Orange 500
  { background: "#14B8A6", color: "#FFFFFF" }, // Teal 500
  { background: "#8B5CF6", color: "#FFFFFF" }, // Violet 500
  { background: "#F59E0B", color: "#111827" }, // Amber 500 / Gray 900
  { background: "#EC4899", color: "#FFFFFF" }, // Pink 500
  { background: "#0EA5E9", color: "#FFFFFF" }, // Sky 500
];

const getInitial = (name?: string) => {
  if (!name) return "?";
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed.charAt(0).toUpperCase();
};

const getPaletteForInitial = (initial: string) => {
  const charCode = initial.charCodeAt(0);
  const index =
    charCode >= 65 && charCode <= 90
      ? (charCode - 65) % COLOR_PALETTE.length
      : charCode % COLOR_PALETTE.length;
  return COLOR_PALETTE[index];
};

const AvatarUser: React.FC<AvatarUserProps> = ({
  name,
  avatarUrl,
  size = 40,
  className,
  onClick,
  title,
}) => {
  const initial = getInitial(name);
  const palette = getPaletteForInitial(initial);
  const fontSize = Math.max(Math.round(size * 0.4), 12);
  const commonStyle: CSSProperties = { width: size, height: size };
  const finalTitle = title ?? name;
  const interactiveClasses = onClick
    ? "cursor-pointer focus:outline-none"
    : "";

  if (avatarUrl) {
    return (
      <>
        {onClick ? (
          <button
            type="button"
            onClick={onClick}
            title={finalTitle}
            className={`relative overflow-hidden rounded-full ${interactiveClasses}${className ? ` ${className}` : ""
              }`}
            style={commonStyle}
          >
            <Image
              src={avatarUrl}
              alt={name}
              width={size}
              height={size}
              className="h-full w-full rounded-full object-cover"
            />
          </button>
        ) : (
          <div
            className={`relative overflow-hidden rounded-full${className ? ` ${className}` : ""
              }`}
            style={commonStyle}
            title={finalTitle}
          >
            <Image
              src={avatarUrl}
              alt={name}
              width={size}
              height={size}
              className="h-full w-full rounded-full object-cover"
            />
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          title={finalTitle}
          className={`flex items-center justify-center rounded-full font-semibold uppercase ${interactiveClasses}${className ? ` ${className}` : ""
            }`}
          style={{
            ...commonStyle,
            backgroundColor: palette.background,
            color: palette.color,
            fontSize,
          }}
        >
          {initial}
        </button>
      ) : (
        <div
          className={`flex items-center justify-center rounded-full font-semibold uppercase${className ? ` ${className}` : ""
            }`}
          style={{
            ...commonStyle,
            backgroundColor: palette.background,
            color: palette.color,
            fontSize,
          }}
          title={finalTitle}
        >
          {initial}
        </div>
      )}
    </>
  );
};

export default AvatarUser;
