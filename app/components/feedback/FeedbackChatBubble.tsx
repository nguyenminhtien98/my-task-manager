"use client";

import React from "react";
import BrandOrbHeaderIcon from "../common/LogoComponent";
import { useProject } from "../../context/ProjectContext";

interface FeedbackChatBubbleProps {
  onClick: () => void;
}

const FeedbackChatBubble: React.FC<FeedbackChatBubbleProps> = ({
  onClick,
}) => (
  <FeedbackChatBubbleInner onClick={onClick} />
);

const FeedbackChatBubbleInner: React.FC<FeedbackChatBubbleProps> = ({
  onClick,
}) => {
  const { currentProject } = useProject();
  const background = currentProject?.themeColor ?? null;

  return (

    <button
      type="button"
      onClick={onClick}
      className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white shadow-lg transition-all duration-[1200ms] ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-black/30 animate-feedback-pulse hover:scale-110"
      aria-label="Mở hộp thoại phản hồi"
    >
      <BrandOrbHeaderIcon size={28} background={background} />
    </button>
  );
};

export default FeedbackChatBubble;
