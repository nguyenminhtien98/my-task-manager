"use client";

import React, { type CSSProperties, useState } from "react";

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  offsetX?: number;
  offsetY?: number;
  className?: string;
  style?: CSSProperties;
}

const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  offsetX = 0,
  offsetY = 8,
  className,
  style,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div
      className={`relative inline-flex ${className ?? ""}`}
      style={style}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      <div
        className={`pointer-events-none absolute z-50 whitespace-nowrap rounded bg-black px-2 py-1 text-xs text-white transition-opacity ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        style={{
          top: `calc(100% + ${offsetY}px)`,
          left: 0,
          marginLeft: 0,
          paddingLeft: offsetX > 0 ? offsetX : undefined,
        }}
      >
        {content}
      </div>
    </div>
  );
};

export default Tooltip;
