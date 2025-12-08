"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LuBell } from "react-icons/lu";
import { useAuth } from "../../context/AuthContext";
import Tooltip from "../common/Tooltip";
import NotificationList from "./NotificationList";
import { useNotifications } from "../../hooks/useNotifications";
import { cn } from "../../utils/cn";
import FloatingDropdown from "../common/FloatingDropdown";

const formatUnreadCount = (count: number) => {
  if (count > 99) return "99+";
  return String(count);
};

interface NotificationBellProps {
  buttonClassName?: string;
  hook?: ReturnType<typeof useNotifications>;
}

const NotificationBell: React.FC<NotificationBellProps> = ({
  buttonClassName,
  hook: externalHook,
}) => {
  const { user } = useAuth();
  const internalHook = useNotifications({ recipientId: externalHook ? null : user?.id });
  const hook = externalHook || internalHook;
  const { unreadCount } = hook;
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const hasUser = Boolean(user);
  const badgeLabel = useMemo(
    () => formatUnreadCount(unreadCount),
    [unreadCount]
  );

  useEffect(() => {
    if (!hasUser) {
      setIsOpen(false);
    }
  }, [hasUser]);

  const openDropdown = useCallback(() => {
    if (isOpen) return;
    setIsOpen(true);
  }, [isOpen]);

  const closeDropdown = useCallback(() => {
    if (!isOpen) return;
    setIsOpen(false);
  }, [isOpen]);

  const toggleDropdown = () => {
    if (isOpen) {
      closeDropdown();
    } else {
      openDropdown();
    }
  };

  if (!hasUser) return null;

  return (
    <div className="relative">
      <Tooltip content="Thông báo">
        <button
          ref={buttonRef}
          type="button"
          onClick={toggleDropdown}
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

      <FloatingDropdown
        anchorRef={buttonRef}
        isOpen={isOpen}
        onClose={closeDropdown}
        placement="bottom-right"
        offset={{ y: 0 }}
        unstyled
        contentClassName={cn(
          "w-[360px] max-w-[92vw] p-0 transition-all duration-150",
          isOpen ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
        )}
      >
        <NotificationList
          hook={hook}
          isOpen={isOpen}
          panelClassName="w-full"
        />
      </FloatingDropdown>
    </div>
  );
};

export default NotificationBell;
