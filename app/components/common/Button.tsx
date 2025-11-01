"use client";

import React from "react";

type ButtonVariant = "solid" | "ghost";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  backgroundColor?: string;
  textColor?: string;
  className?: string;
  hoverClassName?: string;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = "solid",
  backgroundColor,
  textColor,
  disabled,
  className = "",
  style,
  hoverClassName,
  type,
  ...rest
}) => {
  const baseClasses =
    "inline-flex items-center justify-center rounded px-4 py-2 text-sm font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 cursor-pointer";

  const defaultHover =
    variant === "solid"
      ? "hover:bg-black/70 hover:text-white"
      : "hover:bg-black/20 hover:text-black";
  const effectiveHover = hoverClassName ?? defaultHover;

  const disabledClasses = "cursor-not-allowed bg-black/40 text-white opacity-80";

  const classTokens =
    className
      ?.split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean) ?? [];

  const hasBgClass = classTokens.some((token) => token.startsWith("bg-") || token.startsWith("bg["));
  const hasTextClass = classTokens.some((token) => token.startsWith("text-") || token.startsWith("text["));

  const inlineStyle: React.CSSProperties = { ...style };

  if (variant === "solid") {
    if (backgroundColor && !hasBgClass) {
      inlineStyle.backgroundColor = backgroundColor;
    } else if (!hasBgClass) {
      inlineStyle.backgroundColor = "#2563eb";
    }

    if (textColor && !hasTextClass) {
      inlineStyle.color = textColor;
    } else if (!hasTextClass) {
      inlineStyle.color = "#ffffff";
    }
  } else {
    if (backgroundColor && !hasBgClass) {
      inlineStyle.backgroundColor = backgroundColor;
    }

    if (textColor && !hasTextClass) {
      inlineStyle.color = textColor;
    } else if (!hasTextClass) {
      inlineStyle.color = "#111827";
    }
  }

  if (disabled) {
    if (!hasBgClass && !backgroundColor) {
      inlineStyle.backgroundColor = "rgba(0,0,0,0.4)";
    }
    if (!hasTextClass && !textColor) {
      inlineStyle.color = "#ffffff";
    }
  }

  const classes = [
    baseClasses,
    variant === "ghost" ? "bg-transparent" : "",
    !disabled
      ? effectiveHover
      : hasBgClass
      ? "cursor-not-allowed opacity-80"
      : disabledClasses,
    className,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    <button
      type={type ?? "button"}
      className={classes}
      style={inlineStyle}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
};

export default Button;
