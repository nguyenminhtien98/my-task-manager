"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { LuBell } from "react-icons/lu";
import { useAuth } from "../../context/AuthContext";
import Tooltip from "../common/Tooltip";
import NotificationList from "./NotificationList";
import { useNotifications } from "../../hooks/useNotifications";
import { NotificationRecord } from "../../types/Types";
import { useFeedbackChat } from "../../context/FeedbackChatContext";
import { cn } from "../../utils/cn";

const formatUnreadCount = (count: number) => {
  if (count > 99) return "99+";
  return String(count);
};

interface NotificationBellProps {
  buttonClassName?: string;
}

const NotificationBell: React.FC<NotificationBellProps> = ({
  buttonClassName,
}) => {
  const { user } = useAuth();
  const hook = useNotifications({ recipientId: user?.id });
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const feedbackChat = useFeedbackChat();

  const hasUser = Boolean(user);
  const unreadCount = hook.unreadCount;
  const badgeLabel = useMemo(
    () => formatUnreadCount(unreadCount),
    [unreadCount]
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (
        isOpen &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!hasUser) {
      setIsOpen(false);
    }
  }, [hasUser]);

  const handleAction = (actionKey: string, _notification: NotificationRecord) => {
    void _notification;
    if (actionKey === "open-feedback") {
      feedbackChat.open();
      setIsOpen(false);
    }
  };

  if (!hasUser) return null;

  return (
    <div ref={containerRef} className="relative">
      <Tooltip content="Thông báo">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={cn(
            "relative flex h-9 w-9 items-center justify-center text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 hover:text-white/90 hover:cursor-pointer",
            buttonClassName
          )}
          aria-label="Mở thông báo"
        >
          <LuBell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span
              className="pointer-events-none absolute top-0 right-0 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-center text-[10px] font-semibold leading-none text-white shadow-sm"
              style={{
                transform:
                  "translate(calc(0.5 * 100%) * -0.7, calc(0.5 * 100%) * 1)",
              }}
            >
              {badgeLabel}
            </span>
          )}
        </button>
      </Tooltip>

      <div
        className="absolute right-0 z-50 mt-2"
        style={{ pointerEvents: isOpen ? "auto" : "none" }}
      >
        <div
          className={`transform transition-all duration-150 ${isOpen ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
            }`}
        >
          <NotificationList
            hook={hook}
            isOpen={isOpen}
            onAction={handleAction}
          />
        </div>
      </div>
    </div>
  );
};

export default NotificationBell;
