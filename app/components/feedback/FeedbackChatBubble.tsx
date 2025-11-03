"use client";

import React, { type CSSProperties } from "react";
import BrandOrbHeaderIcon from "../common/LogoComponent";
import { useProject } from "../../context/ProjectContext";

interface FeedbackChatBubbleProps {
  onClick: () => void;
  onPointerDown?: (event: React.PointerEvent<HTMLButtonElement>) => void;
  style?: CSSProperties;
}

const FeedbackChatBubble: React.FC<FeedbackChatBubbleProps> = ({
  onClick,
  onPointerDown,
  style,
}) => (
  <FeedbackChatBubbleInner
    onClick={onClick}
    onPointerDown={onPointerDown}
    style={style}
  />
);

const FeedbackChatBubbleInner: React.FC<FeedbackChatBubbleProps> = ({
  onClick,
  onPointerDown,
  style,
}) => {
  const { currentProject } = useProject();
  const background = currentProject?.themeColor ?? null;

  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={onPointerDown}
      className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white shadow-lg transition-all duration-[1200ms] ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-black/30 animate-feedback-pulse hover:scale-110"
      aria-label="Mở hộp thoại phản hồi"
      style={style}
    >
      <BrandOrbHeaderIcon size={28} background={background} />
    </button>
  );
};

export default FeedbackChatBubble;
