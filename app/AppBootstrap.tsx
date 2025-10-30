"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "./context/AuthContext";
import { useProject } from "./context/ProjectContext";
import { DEFAULT_THEME_GRADIENT } from "./utils/themeColors";

const AppBootstrap: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthHydrated } = useAuth();
  const { isProjectsHydrated, currentProject } = useProject();

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
    if (appReady) {
      const id = requestAnimationFrame(() => setShowSplash(false));
      return () => cancelAnimationFrame(id);
    }
    setShowSplash(true);
  }, [appReady]);

  if (showSplash) {
    return (
      <div
        className="fixed inset-0 flex min-h-screen items-center justify-center"
        style={{ background: splashBg }}
      >
        <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AppBootstrap;
