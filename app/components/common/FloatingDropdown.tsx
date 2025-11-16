"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../utils/cn";

type Placement =
  | "bottom-left"
  | "bottom-right"
  | "top-left"
  | "top-right";

interface FloatingDropdownProps {
  anchorRef: React.RefObject<HTMLElement | null>;
  isOpen: boolean;
  onClose?: () => void;
  placement?: Placement;
  offset?: { x?: number; y?: number };
  className?: string;
  contentClassName?: string;
  unstyled?: boolean;
  zIndex?: number;
  children: React.ReactNode;
}

const DEFAULT_OFFSET = { x: 0, y: 8 };

const placementTransform: Record<Placement, { x: string; y: string }> = {
  "bottom-left": { x: "0", y: "0" },
  "bottom-right": { x: "-100%", y: "0" },
  "top-left": { x: "0", y: "-100%" },
  "top-right": { x: "-100%", y: "-100%" },
};

const DEFAULT_CONTENT_CLASS =
  "rounded-lg border border-white/10 bg-black/90 text-white shadow-2xl shadow-black/80";

const FloatingDropdown: React.FC<FloatingDropdownProps> = ({
  anchorRef,
  isOpen,
  onClose,
  placement = "bottom-right",
  offset = DEFAULT_OFFSET,
  className,
  contentClassName,
  unstyled = false,
  zIndex = 2000,
  children,
}) => {
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    x: string;
    y: string;
  } | null>(null);

  const effectiveOffset = useMemo(
    () => ({
      x: offset?.x ?? DEFAULT_OFFSET.x,
      y: offset?.y ?? DEFAULT_OFFSET.y,
    }),
    [offset?.x, offset?.y]
  );

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();

    const top =
      placement.startsWith("bottom")
        ? rect.bottom + effectiveOffset.y
        : rect.top - effectiveOffset.y;
    const left =
      placement.endsWith("right")
        ? rect.right + effectiveOffset.x
        : rect.left - effectiveOffset.x;

    setCoords({
      top,
      left,
      x: placementTransform[placement].x,
      y: placementTransform[placement].y,
    });
  }, [anchorRef, effectiveOffset.x, effectiveOffset.y, placement]);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    const handleResize = () => updatePosition();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (
        dropdownRef.current?.contains(target) ||
        anchorRef.current?.contains(target)
      ) {
        return;
      }
      onClose?.();
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [anchorRef, isOpen, onClose]);

  if (!isOpen || !coords) return null;

  const content = (
    <div
      ref={dropdownRef}
      className={cn("fixed", className)}
      style={{
        top: coords.top,
        left: coords.left,
        zIndex,
        transform: `translate(${coords.x}, ${coords.y})`,
      }}
      role="dialog"
      aria-modal="false"
    >
      <div className={cn(unstyled ? undefined : DEFAULT_CONTENT_CLASS, contentClassName)}>
        {children}
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

export default FloatingDropdown;
