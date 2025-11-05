"use client";

import React from "react";
import FeedbackChatBubble from "./FeedbackChatBubble";

const FeedbackFloatingBubble: React.FC<{
  style: React.CSSProperties;
  side: "left" | "right";
  bannerVisible: boolean;
  onClick: () => void;
  onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => void;
  isDragging?: boolean;
}> = ({ style, side, bannerVisible, onClick, onPointerDown, isDragging }) => {
  return (
    <div style={style} className="fixed z-40">
      <div
        className={`relative transition-transform duration-150 ${
          isDragging ? "scale-105 drop-shadow-lg" : ""
        }`}
      >
        <div
          className={`pointer-events-none absolute ${
            side === "left" ? "left-full ml-3" : "right-full mr-3"
          } top-1/2 -translate-y-1/2 transition-opacity duration-300 ${
            bannerVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="relative">
            <div className="rounded-lg bg-black px-4 py-2 text-xs font-medium text-white shadow-lg sm:text-sm whitespace-nowrap">
              Bạn có tin nhắn mới!
            </div>
            <span
              className={`absolute top-1/2 h-0 w-0 -translate-y-1/2 border-y-6 border-y-transparent ${
                side === "left"
                  ? "left-[-8px] border-r-8 border-r-black"
                  : "right-[-8px] border-l-8 border-l-black"
              }`}
            />
          </div>
        </div>

        <FeedbackChatBubble onClick={onClick} onPointerDown={onPointerDown} />
      </div>
    </div>
  );
};

export default FeedbackFloatingBubble;
