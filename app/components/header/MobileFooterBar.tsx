"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { FiMenu, FiMessageCircle, FiPlus, FiUsers } from "react-icons/fi";
import { LuBell } from "react-icons/lu";
import { User } from "../../context/AuthContext";
import { FooterAction, Project } from "../../types/Types";
import { cn } from "../../utils/cn";
import { useNotifications } from "../../hooks/useNotifications";
import MobileNotificationPanel from "../notifications/MobileNotificationPanel";

interface MobileFooterBarProps {
  user: User | null;
  currentProject: Project | null;
  isProjectClosed: boolean;
  activeAction: FooterAction | null;
  onMembersClick: () => void;
  onAddClick: () => void;
  onChatClick: () => void;
  onMenuClick: () => void;
  isMenuOpen: boolean;
  onMenuClose: () => void;
}

type ExtendedFooterAction = FooterAction | "notifications" | "menu";

interface ActionConfig {
  key: ExtendedFooterAction;
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "notification";
}

const MobileFooterBar: React.FC<MobileFooterBarProps> = ({
  user,
  currentProject,
  isProjectClosed,
  activeAction,
  onMembersClick,
  onAddClick,
  onChatClick,
  onMenuClick,
  isMenuOpen,
  onMenuClose,
}) => {
  const notificationsHook = useNotifications({ recipientId: user?.id });
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const footerRef = useRef<HTMLElement | null>(null);
  const footerHeightVar = "--mobile-footer-height";
  const defaultFooterHeight = 72;

  const updateFooterHeight = useCallback(() => {
    if (typeof window === "undefined") return;
    const height = footerRef.current?.offsetHeight ?? defaultFooterHeight;
    document.documentElement.style.setProperty(
      footerHeightVar,
      `${height}px`
    );
  }, []);

  useLayoutEffect(() => {
    updateFooterHeight();
    if (typeof window === "undefined") return;
    window.addEventListener("resize", updateFooterHeight);
    return () => {
      window.removeEventListener("resize", updateFooterHeight);
    };
  }, [updateFooterHeight]);

  useEffect(() => {
    if (!user) {
      setIsNotificationsOpen(false);
    }
  }, [user]);

  useEffect(() => {
    if (isMenuOpen) {
      setIsNotificationsOpen(false);
    }
  }, [isMenuOpen]);

  const toggleNotifications = useCallback(() => {
    setIsNotificationsOpen((prev) => {
      const next = !prev;
      if (next) {
        onMenuClose();
      }
      return next;
    });
  }, [onMenuClose]);

  const actions = useMemo<ActionConfig[]>(() => {
    const base: ActionConfig[] = [
      {
        key: "add" as FooterAction,
        label: "Task",
        icon: <FiPlus />,
        onClick: onAddClick,
        disabled: isProjectClosed,
      },
    ];

    if (!user) return base;

    return [
      {
        key: "notifications",
        label: "Thông báo",
        icon: <LuBell />,
        onClick: toggleNotifications,
        disabled: false,
      },
      {
        key: "members" as FooterAction,
        label: "Thành viên",
        icon: <FiUsers />,
        onClick: onMembersClick,
        disabled: !currentProject,
      },
      base[0],
      {
        key: "chat" as FooterAction,
        label: "Chat",
        icon: <FiMessageCircle />,
        onClick: onChatClick,
        disabled: false,
      },
      {
        key: "menu",
        label: "Menu",
        icon: <FiMenu />,
        onClick: onMenuClick,
        disabled: false,
      },
    ];
  }, [
    currentProject,
    isProjectClosed,
    onAddClick,
    onChatClick,
    onMembersClick,
    onMenuClick,
    user,
    toggleNotifications,
  ]);

  const baseButtonClasses =
    "flex items-center gap-0 rounded-full py-2 text-base font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-not-allowed disabled:opacity-30";
  const collapsedButtonClasses =
    "bg-white/10 px-2.5 text-white/80 hover:bg-white/20 hover:text-white";
  const expandedButtonClasses =
    "bg-white pl-3 pr-4 text-gray-900 shadow-lg shadow-black/40";

  const unreadCount = notificationsHook.unreadCount;
  const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <nav
      ref={footerRef}
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 bg-black/70 px-2 py-3 text-white shadow-[0_-8px_30px_rgba(0,0,0,0.7)] backdrop-blur-md sm:hidden"
      )}
    >
      <div className="mx-auto flex max-w-md flex-wrap items-center justify-center gap-5">
        {actions.map((action) => {
          const isActive =
            action.key === "notifications"
              ? isNotificationsOpen
              : action.key === "menu"
                ? isMenuOpen
                : action.key === activeAction && !action.disabled;

          return (
            <button
              key={action.key}
              type="button"
              onClick={() => {
                if (action.disabled || !action.onClick) return;
                action.onClick();
              }}
              disabled={action.disabled}
              aria-pressed={isActive}
              className={cn(
                baseButtonClasses,
                isActive ? expandedButtonClasses : collapsedButtonClasses
              )}
            >
              <span
                className={cn(
                  "relative text-2xl transition-colors duration-300",
                  isActive ? "text-gray-900" : "text-white"
                )}
              >
                {action.icon}
                {action.key === "notifications" && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-semibold leading-none text-white">
                    {badgeLabel}
                  </span>
                )}
              </span>
              <span
                className={cn(
                  "overflow-hidden whitespace-nowrap text-base transition-all duration-300",
                  isActive
                    ? "ml-2 max-w-[120px] translate-x-0 opacity-100"
                    : "max-w-0 -translate-x-2 opacity-0"
                )}
              >
                {action.label}
              </span>
            </button>
          );
        })}
      </div>
      {user && (
        <MobileNotificationPanel
          hook={notificationsHook}
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
        />
      )}
    </nav>
  );
};

export default MobileFooterBar;
