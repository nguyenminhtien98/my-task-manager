"use client";

import React, { useEffect, useRef } from "react";
import { useFeedbackChat } from "../../context/FeedbackChatContext";
import FeedbackChatBubble from "./FeedbackChatBubble";
import FeedbackChatPanel from "./FeedbackChatPanel";

const FeedbackChatWidget: React.FC = () => {
  const { isOpen, open, close } = useFeedbackChat();
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        close();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [close, isOpen]);

  return (
    <>
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-40">
          <FeedbackChatBubble onClick={open} />
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            onClick={close}
            aria-label="Đóng hộp thoại phản hồi"
            className="absolute inset-0 cursor-default bg-transparent"
          />
          <div
            ref={panelRef}
            className="absolute bottom-6 right-6"
          >
            <FeedbackChatPanel onClose={close} />
          </div>
        </div>
      )}
    </>
  );
};

export default FeedbackChatWidget;
