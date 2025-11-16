"use client";

import React, { useEffect } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import DailyReportRoom from "../components/dailyReport/DailyReportRoom";
import { useProject } from "../context/ProjectContext";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import LoadingSpinner from "../components/loading/LoadingSpinner";
import MainLayout from "../components/MainLayout";

const DailyReportPage = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { projects, isProjectsHydrated } = useProject();
  const router = useRouter();

  useEffect(() => {
    if (!isProjectsHydrated) return;
    if (!user) {
      router.replace("/?login=1");
      return;
    }
    if (projects.length === 0) {
      toast.error("Bạn cần tạo dự án trước khi vào phòng báo cáo.");
      router.replace("/");
    }
  }, [isProjectsHydrated, projects.length, router, user]);

  if (!isProjectsHydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white">
        <LoadingSpinner size={24} thickness={3} label="Đang tải dữ liệu" />
      </div>
    );
  }

  if (!user || projects.length === 0) {
    return null;
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
