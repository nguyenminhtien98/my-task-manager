"use client";

import React, { useEffect, useMemo, useState, useContext } from "react";
import { usePathname } from "next/navigation";
import { AuthContext } from "./context/AuthContext";
import { ProjectContext } from "./context/ProjectContext";
import { DEFAULT_THEME_GRADIENT } from "./utils/themeColors";
import FaviconUpdater from "./components/FaviconUpdater";

const AppBootstrap: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const pathname = usePathname();
  const isServerErrorPage = pathname?.startsWith("/server-error");

  const authContext = useContext(AuthContext);
  const projectContext = useContext(ProjectContext);

  const isAuthHydrated = authContext?.isAuthHydrated ?? true;
  const isProjectsHydrated = projectContext?.isProjectsHydrated ?? true;
  const currentProject = projectContext?.currentProject ?? null;

  const appReady = isAuthHydrated && isProjectsHydrated;

  const [showSplash, setShowSplash] = useState(true);
  const splashBg = useMemo(
    () =>
      appReady
        ? currentProject?.themeColor || DEFAULT_THEME_GRADIENT
        : "#ffffff",
    [appReady, currentProject?.themeColor]
  );

  useEffect(() => {
    if (isServerErrorPage || appReady) {
      const id = requestAnimationFrame(() => setShowSplash(false));
      return () => cancelAnimationFrame(id);
    }
    setShowSplash(true);
  }, [appReady, isServerErrorPage]);

  if (!isServerErrorPage && showSplash) {
    return (
      <div
        suppressHydrationWarning
        className="fixed inset-0 flex min-h-screen items-center justify-center"
        style={{ background: splashBg }}
      >
        <div
          suppressHydrationWarning
          className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin"
        ></div>
      </div>
    );
  }

  return (
    <>
      <FaviconUpdater />
      {children}
    </>
  );
};

export default AppBootstrap;
