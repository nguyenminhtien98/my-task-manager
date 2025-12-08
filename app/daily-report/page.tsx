"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import DailyReportRoom from "../components/dailyReport/DailyReportRoom";
import { useProject } from "../context/ProjectContext";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import LoadingSpinner from "../components/loading/LoadingSpinner";
import MainLayout from "../components/MainLayout";
import { tokenManager } from "@/lib/axios";

const DailyReportPage = () => {
  const { user, isAuthHydrated } = useAuth();
  const { theme } = useTheme();
  const { projects, isProjectsHydrated } = useProject();
  const router = useRouter();

  const hasTokenInMemory = tokenManager.getAccessToken() !== null;

  useEffect(() => {
    if (!isAuthHydrated) return;

    if (!user) {
      tokenManager.clearAccessToken();
      router.replace("/?login=1&redirect=/daily-report");
      return;
    }

    if (!isProjectsHydrated) return;

    if (projects.length === 0) {
      router.replace("/");
    }
  }, [isAuthHydrated, user, isProjectsHydrated, projects.length, router]);

  if (hasTokenInMemory && !isAuthHydrated) {
    return null;
  }

  if (!isAuthHydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <LoadingSpinner size={24} thickness={3} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <LoadingSpinner size={24} thickness={3} />
      </div>
    );
  }

  if (!isProjectsHydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <LoadingSpinner size={24} thickness={3} />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <LoadingSpinner size={24} thickness={3} />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white">
        <LoadingSpinner size={24} thickness={3} label="Đang chuyển hướng" />
      </div>
    );
  }

  return (
    <MainLayout
      background={theme ?? "#050505"}
      className="text-white"
      contentWrapper="main"
      contentClassName="flex-1 min-h-0 overflow-hidden p-2"
    >
      <DailyReportRoom />
    </MainLayout>
  );
};

export default DailyReportPage;
