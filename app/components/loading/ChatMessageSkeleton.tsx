"use client";

import React from "react";

const ChatMessageSkeleton: React.FC<{ position: "left" | "right" }> = ({
  position,
}) => (
  <div
    className={`flex w-full ${
      position === "right" ? "justify-end" : "justify-start"
    }`}
  >
    <div className="max-w-[80%]">
      <div
        className={`flex min-w-[140px] max-w-[70vw] animate-pulse flex-col gap-2 rounded-2xl px-4 py-3 ${
          position === "right" ? "bg-gray-200" : "bg-black/80 text-white/70"
        }`}
      >
        <span
          className={`block h-[10px] rounded-full ${
            position === "right" ? "bg-gray-300" : "bg-white/30"
          }`}
        />
      </div>
    </div>
  </div>
);

export default ChatMessageSkeleton;

