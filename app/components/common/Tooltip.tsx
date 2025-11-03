"use client";

import React, { type CSSProperties, useState } from "react";

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  offsetX?: number;
  offsetY?: number;
  delayIn?: number;
  delayOut?: number;
  className?: string;
  style?: CSSProperties;
}

const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  offsetX = 0,
  offsetY = 8,
  delayIn = 150,
  delayOut = 100,
  className,
  style,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = React.useRef<number | null>(null);

  const clearTimer = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const show = () => {
    clearTimer();
    timeoutRef.current = window.setTimeout(() => {
      setIsVisible(true);
      timeoutRef.current = null;
    }, delayIn);
  };

  const hide = () => {
    clearTimer();
    timeoutRef.current = window.setTimeout(() => {
      setIsVisible(false);
      timeoutRef.current = null;
    }, delayOut);
  };

  React.useEffect(() => {
    return () => clearTimer();
  }, []);

  return (
    <div
      className={`relative inline-flex ${className ?? ""}`}
      style={style}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
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
