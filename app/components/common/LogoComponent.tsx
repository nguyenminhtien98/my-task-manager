"use client";

import React, { useId, useMemo } from "react";
import { getFillConfig } from "@/app/utils/logoSvg";
import { useProject } from "../../context/ProjectContext";
import { DEFAULT_THEME_GRADIENT } from "../../utils/themeColors";

type BrandOrbHeaderIconProps = {
  size?: number;
  className?: string;
};

export default function BrandOrbHeaderIcon({
  size = 48,
  className = "",
}: BrandOrbHeaderIconProps) {
  const { currentProject } = useProject();
  const uniqueId = useId();
  const gradientId = `${uniqueId}-gradient`;
  const shadowId = `${uniqueId}-shadow`;

  const themeColor = currentProject?.themeColor ?? DEFAULT_THEME_GRADIENT;

  const fillConfig = useMemo(() => getFillConfig(themeColor), [themeColor]);

  const gradientElement =
    fillConfig.type === "gradient" ? (
      <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
        {fillConfig.stops.map(({ color, offset }, index) => (
          <stop
            key={`${color}-${index}`}
            offset={`${Math.round(offset * 100)}%`}
            stopColor={color}
          />
        ))}
      </linearGradient>
    ) : null;

  const fillValue =
    fillConfig.type === "gradient" ? `url(#${gradientId})` : fillConfig.solid;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label="My Task Manager Web logo"
      className={className}
    >
      <defs>
        {gradientElement}
        <filter id={shadowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
          <feOffset dy="2" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.35" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter={`url(#${shadowId})`}>
        <rect x="8" y="32" width="22" height="48" rx="11" fill={fillValue} />
        <rect x="39" y="8" width="22" height="84" rx="11" fill={fillValue} />
        <rect x="70" y="18" width="22" height="60" rx="11" fill={fillValue} />
      </g>
    </svg>
  );
}
