"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

interface HoverPopoverProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  align?: "left" | "right";
  className?: string;
}

const HoverPopover: React.FC<HoverPopoverProps> = ({
  trigger,
  children,
  isOpen,
  onOpenChange,
  align = "right",
  className,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [placement, setPlacement] = useState<"top" | "bottom">("bottom");
  const [panelMaxHeight, setPanelMaxHeight] = useState<number | null>(null);
  const hoverTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setOpen]);

  useLayoutEffect(() => {
    if (!open) return;
    const triggerEl = containerRef.current;
    const panelEl = panelRef.current;
    if (!triggerEl || !panelEl) return;
    const triggerRect = triggerEl.getBoundingClientRect();
    const prevVisibility = panelEl.style.visibility;
    const prevDisplay = panelEl.style.display;
    panelEl.style.visibility = "hidden";
    panelEl.style.display = "block";
    panelEl.getBoundingClientRect();
    panelEl.style.visibility = prevVisibility;
    panelEl.style.display = prevDisplay;

    const viewportHeight = window.innerHeight;
    const margin = 8;
    const availableBelow = Math.max(
      viewportHeight - triggerRect.bottom - margin,
      0
    );
    const availableAbove = Math.max(triggerRect.top - margin, 0);
    const shouldPlaceBottom = availableBelow >= availableAbove;
    setPlacement(shouldPlaceBottom ? "bottom" : "top");
    const available = shouldPlaceBottom ? availableBelow : availableAbove;
    setPanelMaxHeight(Math.max(available - margin, 120));
  }, [open]);

  const handleMouseEnterContainer = () => {
    if (hoverTimeoutRef.current) {
      window.clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setOpen(true);
  };

  const handleMouseLeaveContainer = () => {
    if (hoverTimeoutRef.current) {
      window.clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = window.setTimeout(() => {
      setOpen(false);
    }, 80);
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-block ${className ?? ""}`}
      onMouseEnter={handleMouseEnterContainer}
      onMouseLeave={handleMouseLeaveContainer}
    >
      <div onClick={() => setOpen(!open)} className="inline-block">
        {trigger}
      </div>
      {open && (
        <div
          ref={panelRef}
          className={`absolute z-50 rounded-md border border-black/10 bg-white p-2 text-sm text-[#111827] shadow-lg ${align === "right" ? "right-0" : "left-0"
            }`}
          style={{
            top: placement === "bottom" ? "calc(100% + 8px)" : undefined,
            bottom: placement === "top" ? "calc(100% + 8px)" : undefined,
            maxWidth: "min(80vw, 560px)",
            maxHeight: panelMaxHeight ? `${panelMaxHeight}px` : "60vh",
            overflow: "auto",
          }}
          onMouseEnter={handleMouseEnterContainer}
          onMouseLeave={handleMouseLeaveContainer}
        >
          {children}
        </div>
      )}
    </div>
  );
};

export default HoverPopover;
