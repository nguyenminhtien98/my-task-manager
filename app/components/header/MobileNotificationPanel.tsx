"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { useNotifications } from "../../hooks/useNotifications";
import type { NotificationRecord } from "../../types/Types";
import { useFeedbackChat } from "../../context/FeedbackChatContext";
import NotificationList from "../notifications/NotificationList";
import { cn } from "../../utils/cn";

type NotificationsHook = ReturnType<typeof useNotifications>;

interface MobileNotificationPanelProps {
  hook: NotificationsHook;
  isOpen: boolean;
  onClose: () => void;
}

const MOBILE_FOOTER_HEIGHT_VAR = "var(--mobile-footer-height, 72px)";

const MobileNotificationPanel: React.FC<MobileNotificationPanelProps> = ({
  hook,
  isOpen,
  onClose,
}) => {
  const feedbackChat = useFeedbackChat();
  const wasOpenRef = useRef(false);
  const { markAllAsRead, markAllAsSeen } = hook;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      void markAllAsSeen();
    } else if (wasOpenRef.current) {
      void markAllAsRead();
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, markAllAsRead, markAllAsSeen]);

  const handleAction = (actionKey: string, _notification: NotificationRecord) => {
    void _notification;
    if (actionKey === "open-feedback") {
      feedbackChat.open();
      onClose();
    }
  };

  if (!mounted) return null;

  return createPortal(
    <>
      <div
        className={cn(
          "fixed inset-x-0 top-0 z-[75] bg-black/60 transition-opacity duration-300 sm:hidden",
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        style={{ bottom: MOBILE_FOOTER_HEIGHT_VAR }}
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed top-0 right-0 z-[80] flex w-[85%] max-w-xs flex-col bg-white shadow-2xl transition-transform duration-300 sm:hidden",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
        style={{ bottom: MOBILE_FOOTER_HEIGHT_VAR }}
      >

        <div className="flex-1 overflow-y-auto">
          <NotificationList
            hook={hook}
            isOpen={isOpen}
            onAction={handleAction}
            panelClassName="w-full max-w-full !rounded-none p-4 !shadow-none"
          />
        </div>
      </aside>
    </>,
    document.body
  );
};

export default MobileNotificationPanel;
