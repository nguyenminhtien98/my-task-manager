"use client";

import React, { type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import Tooltip from "./Tooltip";

interface AvatarUserProps {
  name: string;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
  wrapperClassName?: string;
  wrapperStyle?: CSSProperties;
  onClick?: () => void;
  title?: string;
  style?: CSSProperties;
  showTooltip?: boolean;
  children?: ReactNode;
}

const COLOR_PALETTE = [
  { background: "#1F2937", color: "#F9FAFB" },
  { background: "#10B981", color: "#FFFFFF" },
  { background: "#6366F1", color: "#FFFFFF" },
  { background: "#EF4444", color: "#FFFFFF" },
  { background: "#F97316", color: "#FFFFFF" },
  { background: "#14B8A6", color: "#FFFFFF" },
  { background: "#8B5CF6", color: "#FFFFFF" },
  { background: "#F59E0B", color: "#111827" },
  { background: "#EC4899", color: "#FFFFFF" },
  { background: "#0EA5E9", color: "#FFFFFF" },
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
  wrapperClassName,
  wrapperStyle,
  onClick,
  title,
  style,
  showTooltip = true,
  children,
}) => {
  const initial = getInitial(name);
  const palette = getPaletteForInitial(initial);
  const fontSize = Math.max(Math.round(size * 0.4), 12);

  const dimensions: CSSProperties = { width: size, height: size };
  const elementStyle: CSSProperties = { ...dimensions, ...style };

  const finalTitle = title ?? name;

  const sharedClasses = [
    "relative",
    "inline-flex items-center justify-center",
    "overflow-hidden rounded-full",
    "font-semibold uppercase",
    "cursor-pointer",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const dynamicStyle: CSSProperties = {
    ...elementStyle,
    fontSize,
    backgroundColor: avatarUrl ? undefined : palette.background,
    color: avatarUrl ? undefined : palette.color,
  };

  const content = avatarUrl ? (
    <Image
      src={avatarUrl}
      alt={name}
      width={size}
      height={size}
      className="h-full w-full object-cover"
    />
  ) : (
    initial
  );

  const AvatarElement = onClick ? 'button' : 'span';

  const avatarNode = (
    <AvatarElement
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={sharedClasses}
      style={dynamicStyle}
    >
      {content}
      {children}
    </AvatarElement>
  );

  if (!showTooltip) {
    return (
      <span
        className={`inline-flex${wrapperClassName ? ` ${wrapperClassName}` : ""}`}
        style={wrapperStyle}
      >
        {avatarNode}
      </span>
    );
  }

  return (
    <Tooltip
      content={finalTitle}
      className={wrapperClassName}
      style={wrapperStyle}
    >
      {avatarNode}
    </Tooltip>
  );
};

export default AvatarUser;
