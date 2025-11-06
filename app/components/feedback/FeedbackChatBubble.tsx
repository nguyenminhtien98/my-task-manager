"use client";

import React, { type CSSProperties } from "react";
import BrandOrbHeaderIcon from "../common/LogoComponent";

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
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={onPointerDown}
      className="relative hidden h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white shadow-lg transition-all duration-[1200ms] ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-black/30 animate-feedback-pulse hover:scale-110 sm:flex"
      aria-label="Mở hộp thoại phản hồi"
      style={style}
    >
      <BrandOrbHeaderIcon size={28} />
    </button>
  );
};

export default FeedbackChatBubble;
