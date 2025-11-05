"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BubblePosition,
  getBubbleBounds,
  getInitialBubblePosition,
} from "../utils/feedbackChat.utils";

export const useBubblePosition = () => {
  const [position, setPosition] = useState<BubblePosition>(
    getInitialBubblePosition
  );
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef<{
    active: boolean;
    startY: number;
    startOffset: number;
    moved: boolean;
    preventClick: boolean;
  }>({
    active: false,
    startY: 0,
    startOffset: 0,
    moved: false,
    preventClick: false,
  });

  const clampOffset = useCallback((value: number) => {
    const { min, max } = getBubbleBounds();
    return Math.min(Math.max(value, min), max);
  }, []);

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      const state = dragStateRef.current;
      if (!state.active) return;
      const delta = event.clientY - state.startY;
      if (Math.abs(delta) > 3) {
        state.moved = true;
      }
      const nextOffset = clampOffset(state.startOffset + delta);
      setPosition((prev) =>
        prev.offset === nextOffset ? prev : { ...prev, offset: nextOffset }
      );
    },
    [clampOffset]
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent) => {
      const state = dragStateRef.current;
      if (!state.active) return;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      const delta = event.clientY - state.startY;
      const nextOffset = clampOffset(state.startOffset + delta);
      const side =
        typeof window !== "undefined" && event.clientX < window.innerWidth / 2
          ? "left"
          : "right";
      setPosition({ side, offset: nextOffset });
      state.preventClick = state.moved || Math.abs(delta) > 3;
      state.active = false;
      state.moved = false;
      setIsDragging(false);
    },
    [clampOffset, handlePointerMove]
  );

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      dragStateRef.current.active = true;
      dragStateRef.current.startY = event.clientY;
      dragStateRef.current.startOffset = position.offset;
      dragStateRef.current.moved = false;
      dragStateRef.current.preventClick = false;
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      setIsDragging(true);
    },
    [handlePointerMove, handlePointerUp, position.offset]
  );

  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  const style = useMemo(() => {
    const offset = clampOffset(position.offset);
    const s: React.CSSProperties = {
      position: "fixed",
      top: offset,
      zIndex: 40,
    };
    if (position.side === "left") s.left = "24px";
    else s.right = "24px";
    return s;
  }, [clampOffset, position.offset, position.side]);

  const preventNextClick = useRef(false);
  useEffect(() => {
    preventNextClick.current = dragStateRef.current.preventClick;
  }, [position]);

  const consumePreventClick = useCallback(() => {
    if (dragStateRef.current.preventClick) {
      dragStateRef.current.preventClick = false;
      return true;
    }
    return false;
  }, []);

  return {
    position,
    setPosition,
    onPointerDown,
    consumePreventClick,
    style,
    isDragging,
  } as const;
};
