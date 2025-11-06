"use client";

import React, { useEffect, useState } from "react";
import { FiChevronDown, FiChevronUp, FiLogOut, FiX } from "react-icons/fi";
import AvatarUser from "../common/AvatarUser";
import { Project } from "../../types/Types";
import { User } from "../../context/AuthContext";
import { cn } from "../../utils/cn";

interface MobileDrawerProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  currentProject: Project | null;
  onOpenProfile: () => void;
  onOpenProjectManager: () => void;
  onOpenTheme: () => void;
  onLogout: () => void;
}

const MOBILE_FOOTER_HEIGHT_VAR = "var(--mobile-footer-height, 72px)";

const MobileDrawer: React.FC<MobileDrawerProps> = ({
  user,
  isOpen,
  onClose,
  currentProject,
  onOpenProfile,
  onOpenProjectManager,
  onOpenTheme,
  onLogout,
}) => {
  const [isPersonalOpen, setIsPersonalOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsPersonalOpen(false);
    }
  }, [isOpen]);

  if (!user) return null;

  return (
    <>
      <div
        className={cn(
          "fixed inset-x-0 top-0 z-[70] bg-black/60 transition-opacity duration-300 sm:hidden",
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        style={{ bottom: MOBILE_FOOTER_HEIGHT_VAR }}
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed top-0 left-0 z-[80] w-[85%] max-w-xs bg-[#0f0f0f] p-4 text-white shadow-2xl transition-transform duration-300 sm:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ bottom: MOBILE_FOOTER_HEIGHT_VAR }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AvatarUser
              name={user.name}
              avatarUrl={user.avatarUrl}
              size={48}
              showTooltip={false}
            />
            <div>
              <p className="text-lg font-semibold">{user.name}</p>
              <p className="text-sm text-white/60">
                {currentProject?.leader.$id === user.id
                  ? "Leader dự án"
                  : "Thành viên"}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Đóng menu"
            className="rounded-full border border-white/30 p-2 text-white transition hover:border-white hover:bg-white/10"
            onClick={onClose}
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 space-y-3">
          <div className="rounded-2xl bg-white/5">
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/5"
              onClick={() => setIsPersonalOpen((prev) => !prev)}
            >
              <AvatarUser
                name={user.name}
                avatarUrl={user.avatarUrl}
                size={44}
                showTooltip={false}
              />
              <div className="flex-1 text-left">
                <p className="text-base font-semibold">Cá nhân</p>
                <p className="text-sm text-white/60">Tuỳ chỉnh tài khoản</p>
              </div>
              {isPersonalOpen ? (
                <FiChevronUp className="h-5 w-5 text-white/70" />
              ) : (
                <FiChevronDown className="h-5 w-5 text-white/70" />
              )}
            </button>
            <div
              className={cn(
                "grid transition-[grid-template-rows] duration-300",
                isPersonalOpen
                  ? "grid-rows-[1fr] border-t border-white/10"
                  : "grid-rows-[0fr]"
              )}
            >
              <div className="overflow-hidden">
                <div className="flex flex-col divide-y divide-white/10">
                  <button
                    type="button"
                    className="w-full px-4 py-3 text-left text-sm font-semibold text-white transition hover:bg-white/5"
                    onClick={() => {
                      onOpenProfile();
                      onClose();
                    }}
                  >
                    Hồ sơ
                  </button>
                  <button
                    type="button"
                    className="w-full px-4 py-3 text-left text-sm font-semibold text-white transition hover:bg-white/5"
                    onClick={() => {
                      onOpenProjectManager();
                      onClose();
                    }}
                  >
                    Quản lý dự án
                  </button>
                  <button
                    type="button"
                    className="w-full px-4 py-3 text-left text-sm font-semibold text-white transition hover:bg-white/5"
                    onClick={() => {
                      onOpenTheme();
                      onClose();
                    }}
                  >
                    Thay đổi màu nền
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-2xl bg-white/5 px-4 py-3 text-left text-base font-semibold transition hover:bg-white/10"
            onClick={() => {
              onLogout();
              onClose();
            }}
          >
            <FiLogOut className="h-5 w-5" />
            Đăng xuất
          </button>
        </div>
      </aside>
    </>
  );
};

export default MobileDrawer;
