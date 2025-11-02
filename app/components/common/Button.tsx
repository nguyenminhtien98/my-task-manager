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

  const hasBgClass = classTokens.some(
    (token) => token.startsWith("bg-") || token.startsWith("bg[")
  );
  const hasTextClass = classTokens.some(
    (token) => token.startsWith("text-") || token.startsWith("text[")
  );

  const inlineStyle: React.CSSProperties = { ...style };
  const hasInlineBackground =
    typeof inlineStyle.background !== "undefined" ||
    typeof inlineStyle.backgroundColor !== "undefined" ||
    typeof inlineStyle.backgroundImage !== "undefined";
  const hasInlineTextColor = typeof inlineStyle.color !== "undefined";

  if (backgroundColor) {
    inlineStyle.backgroundColor = backgroundColor;
    if (inlineStyle.background) {
      delete inlineStyle.background;
    }
  }

  if (textColor) {
    inlineStyle.color = textColor;
  }

  if (disabled) {
    if (!hasBgClass && !backgroundColor && !hasInlineBackground) {
      inlineStyle.backgroundColor = "rgba(0,0,0,0.4)";
    }
    if (!hasTextClass && !textColor && !hasInlineTextColor) {
      inlineStyle.color = "#ffffff";
    }
  }

  const defaultBgClass =
    variant === "solid" && !hasBgClass && !backgroundColor && !hasInlineBackground
      ? "bg-[#2563eb]"
      : variant === "ghost"
        ? "bg-transparent"
        : "";

  const defaultTextClass =
    variant === "solid" && !hasTextClass && !textColor && !hasInlineTextColor
      ? "text-white"
      : variant === "ghost" && !hasTextClass && !textColor && !hasInlineTextColor
        ? "text-[#111827]"
        : "";

  const classes = [
    baseClasses,
    defaultBgClass,
    defaultTextClass,
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
