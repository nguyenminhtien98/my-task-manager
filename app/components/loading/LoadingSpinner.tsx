"use client";

import React from "react";
import { cn } from "../../utils/cn";

interface LoadingSpinnerProps {
  size?: number;
  thickness?: number;
  variant?: "light" | "dark";
  className?: string;
  label?: string;
}

const variantColor: Record<"light" | "dark", { border: string; track: string }> =
  {
    light: { border: "rgba(255,255,255,0.85)", track: "rgba(255,255,255,0.2)" },
    dark: { border: "rgba(15,23,42,0.65)", track: "rgba(15,23,42,0.2)" },
  };

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 16,
  thickness = 2,
  variant = "light",
  className,
  label = "Đang tải",
}) => {
  const colors = variantColor[variant];
  return (
    <span
      role="status"
      aria-label={label}
      className={cn("inline-block animate-spin rounded-full", className)}
      style={{
        width: size,
        height: size,
        borderWidth: thickness,
        borderStyle: "solid",
        borderColor: colors.border,
        borderTopColor: colors.track,
      }}
    />
  );
};

export default LoadingSpinner;
