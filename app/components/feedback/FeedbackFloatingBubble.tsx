"use client";

import React from "react";
import FeedbackChatBubble from "./FeedbackChatBubble";

const FeedbackFloatingBubble: React.FC<{
  style: React.CSSProperties;
  side: "left" | "right";
  onClick: () => void;
  onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => void;
  isDragging?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
}> = ({ style, side, onClick, onPointerDown, isDragging }) => {
  return (
    <div style={style} className="fixed z-40">
      <div
        className={`relative transition-transform duration-150 ${isDragging ? "scale-105 drop-shadow-lg" : ""
          }`}
      >
        <FeedbackChatBubble onClick={onClick} onPointerDown={onPointerDown} />
      </div>
    </div>
  );
};

export default FeedbackFloatingBubble;
