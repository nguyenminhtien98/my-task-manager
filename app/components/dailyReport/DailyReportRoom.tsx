"use client";

import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useProject } from "../../context/ProjectContext";
import { useProjectOperations } from "../../hooks/useProjectOperations";
import DailyReportHeader from "./DailyReportHeader";
import DailyReportList from "./DailyReportList";
import DailyReportForm from "./DailyReportForm";
import { useDailyReportRoom } from "../../hooks/useDailyReportRoom";
import DailyReportSettingsModal from "../modal/DailyReportSettingsModal";

const DailyReportRoom: React.FC = () => {
  const { user } = useAuth();
  const { currentProject } = useProject();
  const { members } = useProjectOperations();

  const {
    groupedReports,
    filters,
    setMyReportFilter,
    setDateFilter,
    content,
    setContent,
    isSubmitting,
    handleSubmit,
    toolbarState,
    handleToggleFormat,
    handleMentionTrigger,
    handleMentionSelect,
    handleMentionClose,
    isMentioning,
    mentionableMembers,
    handleEdit,
    handleDelete,
    editingEntry,
    handleCancelEdit,
    reportSettings,
    updateReportSettings,
    isReportsLoading,
    isRoomReady,
    loadMoreReports,
    hasMoreReports,
    isLoadingMoreReports,
  } = useDailyReportRoom({
    currentUser: user,
    currentProject,
    projectMembers: members,
  });
  const [isSettingsOpen, setSettingsOpen] = useState(false);

  const isFormDisabled = !user || !currentProject || !isRoomReady;
  const canSubmit = Boolean(!isFormDisabled && content.trim().length);
  const memberCount = members.length;

  return (
    <section className="flex h-full min-h-0 w-full flex-col text-white">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-white/10 bg-black/50 shadow-[0_18px_50px_rgba(0,0,0,0.8)] backdrop-blur">
        <DailyReportHeader
          className="border-b border-white/10 bg-black/70"
          projectName={currentProject?.name ?? "Chưa chọn dự án"}
          memberCount={memberCount}
          isMyReports={filters.myReports}
          selectedDate={filters.date}
          onToggleMyReports={setMyReportFilter}
          onDateChange={setDateFilter}
          onOpenSettings={() => setSettingsOpen(true)}
          showSettingsButton={
            typeof currentProject?.leader === "object"
              ? currentProject?.leader?._id === user?.id
              : currentProject?.leader === user?.id
          }
        />
        <DailyReportList
          className="flex-1 min-h-0 bg-black/60"
          groups={groupedReports}
          currentUserId={user?.id}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isLoading={isReportsLoading}
          onLoadMore={loadMoreReports}
          hasMore={hasMoreReports}
          isLoadingMore={isLoadingMoreReports}
        />
        <DailyReportForm
          className="border-t border-white/10 bg-black/70 px-2 pt-2"
          value={content}
          onChange={setContent}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          isDisabled={isFormDisabled}
          canSubmit={canSubmit}
          toolbarState={toolbarState}
          onToggleFormat={handleToggleFormat}
          onMentionTrigger={handleMentionTrigger}
          onMentionSelect={handleMentionSelect}
          onMentionClose={handleMentionClose}
          isMentioning={isMentioning}
          mentionOptions={mentionableMembers}
          isEditing={Boolean(editingEntry)}
          editingEntryName={editingEntry?.author.name}
          onCancelEdit={handleCancelEdit}
        />
      </div>
      <DailyReportSettingsModal
        isOpen={isSettingsOpen}
        setIsOpen={setSettingsOpen}
        settings={reportSettings}
        onChange={updateReportSettings}
      />
    </section>
  );
};

export default DailyReportRoom;
