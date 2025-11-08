"use client";

import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { useFeedbackChat } from "../../context/FeedbackChatContext";
import FeedbackFloatingBubble from "./FeedbackFloatingBubble";
import { useIncomingBanner } from "../../hooks/useIncomingBanner";
import { useBubblePosition } from "../../hooks/useBubblePosition";
import { useChat } from "../../hooks/useChat";
import FeedbackConversationList from "./FeedbackConversationList";
import FeedbackConversationDetail from "./FeedbackConversationDetail";
import Button from "../common/Button";
import { ConversationType } from "../../services/feedbackService";

const FeedbackChatWidget: React.FC = () => {
  const { isOpen, open, close } = useFeedbackChat();
  const panelRef = useRef<HTMLDivElement | null>(null);

  const {
    position: bubblePosition,
    onPointerDown: handleBubblePointerDown,
    consumePreventClick,
    style: bubbleStyleHook,
    isDragging: isDraggingBubble,
  } = useBubblePosition();
  const {
    visible: incomingBannerVisible,
    show: showIncomingBanner,
    clear: clearIncomingBanner,
  } = useIncomingBanner(5000);

  const triggerIncomingBanner = useCallback(() => {
    if (isOpen) return;
    showIncomingBanner();
  }, [isOpen, showIncomingBanner]);

  const chat = useChat(isOpen, triggerIncomingBanner);

  const {
    isAdmin,
    currentUserId,
    conversations,
    messages,
    isSending,
    selectedConversationId,
    setSelectedConversationId,
    filter,
    setFilter,
    conversationTab,
    setConversationTab,
    profileMap,
    presenceMap,
    presence,
    otherParticipant,
    isLoadingMessages,
    pendingMessages,
    handleSendMessage,
    hasProject,
    hasOtherMembers,
    shouldForceFeedbackOnly,
    memberConversations,
    feedbackConversations,
    pendingConversation,
    startPendingConversation,
    clearPendingConversation,
  } = chat;
  const suppressAutoSelectRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      clearIncomingBanner();
    } else {
      suppressAutoSelectRef.current = false;
      clearPendingConversation();
    }
  }, [clearIncomingBanner, clearPendingConversation, isOpen]);

  useEffect(() => {
    if (selectedConversationId) {
      suppressAutoSelectRef.current = false;
    }
  }, [selectedConversationId]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && target.closest('[data-feedback-media-modal="true"]')) {
        return;
      }
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        close();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [close, isOpen]);

  const handleBubbleClick = useCallback(() => {
    if (consumePreventClick()) return;
    open();
  }, [consumePreventClick, open]);

  const selectedConversation = useMemo(() => {
    if (!selectedConversationId) return null;
    return (
      conversations.find(
        (conversation) => conversation.$id === selectedConversationId
      ) ?? null
    );
  }, [conversations, selectedConversationId]);

  const activeConversationType = useMemo<ConversationType>(
    () =>
      selectedConversation?.type ??
      pendingConversation?.type ??
      "feedback",
    [pendingConversation, selectedConversation]
  );

  const filteredConversations = useMemo(() => {
    let dataset = feedbackConversations;
    if (isAdmin) {
      dataset = dataset.filter((conversation) =>
        Boolean(conversation.lastMessage)
      );
      if (filter === "unread") {
        dataset = dataset.filter((conversation) =>
          (conversation.unreadBy ?? []).includes(currentUserId)
        );
      }
      return dataset;
    }
    return dataset;
  }, [feedbackConversations, currentUserId, filter, isAdmin]);

  const showListView =
    !shouldForceFeedbackOnly && !selectedConversationId && !pendingConversation;
  const pendingTargetId = pendingConversation?.targetId ?? null;

  useEffect(() => {
    if (!isOpen) {
      setSelectedConversationId(null);
      suppressAutoSelectRef.current = false;
      clearPendingConversation();
    }
  }, [clearPendingConversation, isOpen, setSelectedConversationId]);

  const bubbleStyle = bubbleStyleHook;
  const allowBackNavigation = isAdmin || !shouldForceFeedbackOnly;
  const handleBackToList = useCallback(() => {
    suppressAutoSelectRef.current = true;
    setSelectedConversationId(null);
    clearPendingConversation();
    if (!isAdmin && !shouldForceFeedbackOnly) {
      setConversationTab("member");
    }
  }, [
    clearPendingConversation,
    isAdmin,
    shouldForceFeedbackOnly,
    setSelectedConversationId,
    setConversationTab,
  ]);

  const handleTabChange = useCallback(
    (nextTab: ConversationType) => {
      if (conversationTab === nextTab) return;
      suppressAutoSelectRef.current = false;

      if (nextTab === "member") {
        setConversationTab("member");
        setSelectedConversationId(null);
        clearPendingConversation();
        return;
      }

      setConversationTab("feedback");
      setSelectedConversationId(null);
      clearPendingConversation();
      if (isAdmin || shouldForceFeedbackOnly) {
        return;
      }
      const existing = feedbackConversations.find(
        (conversation) => !conversation.__placeholderTargetId
      );
      if (existing) {
        setSelectedConversationId(existing.$id);
        return;
      }
      const placeholder = feedbackConversations.find(
        (conversation) => Boolean(conversation.__placeholderTargetId)
      );
      if (placeholder?.__placeholderTargetId) {
        startPendingConversation({
          targetId: placeholder.__placeholderTargetId,
          type: placeholder.type ?? "feedback",
          projectId: placeholder.__placeholderProjectId ?? null,
        });
      }
    },
    [
      clearPendingConversation,
      conversationTab,
      feedbackConversations,
      isAdmin,
      shouldForceFeedbackOnly,
      startPendingConversation,
      setConversationTab,
      setSelectedConversationId,
    ]
  );

  return (
    <>
      {!isOpen && (
        <FeedbackFloatingBubble
          style={bubbleStyle}
          side={bubblePosition.side}
          bannerVisible={incomingBannerVisible}
              onClick={handleBubbleClick}
              onPointerDown={handleBubblePointerDown}
          isDragging={isDraggingBubble}
            />
      )}

      {isOpen && (
        <div className="fixed inset-0 z-[90]">
          <button
            type="button"
            onClick={close}
            aria-label="Đóng hộp thoại phản hồi"
            className="absolute inset-0 cursor-default bg-transparent"
          />
          <div
            className={`absolute bottom-28 sm:bottom-6 ${
              bubblePosition.side === "left" ? "left-6" : "right-6"
            }`}
          >
            <div className="relative">
              <div
                className={`pointer-events-none absolute right-full top-1/2 mr-3 -translate-y-1/2 transition-opacity duration-300 ${
                  incomingBannerVisible ? "opacity-100" : "opacity-0"
                }`}
              >
                <div className="relative">
                  <div className="rounded-lg bg-black px-4 py-2 text-xs font-medium text-white shadow-lg sm:text-sm whitespace-nowrap">
                    Bạn có tin nhắn mới!
                  </div>
                  <span className="absolute right-[-8px] top-1/2 h-0 w-0 -translate-y-1/2 border-y-6 border-y-transparent border-l-8 border-l-black" />
                </div>
              </div>
              <div ref={panelRef}>
                {showListView ? (
                  <FeedbackConversationList
                    conversations={
                      conversationTab === "member"
                        ? memberConversations
                        : filteredConversations
                    }
                    profileMap={profileMap}
                    presenceMap={presenceMap}
                    currentUserId={currentUserId}
                    selectedConversationId={selectedConversationId}
                    pendingTargetId={pendingTargetId}
                    onSelectConversation={(conversation) => {
                      suppressAutoSelectRef.current = false;
                      const placeholderTargetId =
                        conversation.__placeholderTargetId;
                      if (placeholderTargetId) {
                        startPendingConversation({
                          targetId: placeholderTargetId,
                          type: conversation.type ?? "feedback",
                          projectId: conversation.__placeholderProjectId ?? null,
                        });
                        setSelectedConversationId(null);
                        setConversationTab(conversation.type ?? "feedback");
                        return;
                      }
                      setConversationTab(conversation.type ?? "feedback");
                      setSelectedConversationId(conversation.$id);
                    }}
                    filter={conversationTab === "feedback" ? filter : "all"}
                    onFilterChange={
                      conversationTab === "feedback"
                        ? setFilter
                        : () => undefined
                    }
                    onClose={close}
                    headerTitle="Danh sách đoạn chat"
                    headerDescription={
                      !isAdmin
                        ? conversationTab === "member"
                          ? "Chọn thành viên để bắt đầu trò chuyện"
                          : "Danh sách chat với quản trị viên"
                        : undefined
                    }
                    actions={
                      !isAdmin ? (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="solid"
                            onClick={() => handleTabChange("member")}
                            disabled={!hasProject || !hasOtherMembers}
                            className={`rounded-full !px-3 !py-1 !text-xs ${
                              conversationTab === "member"
                                ? "border bg-black text-white"
                                : "border border-gray-300 bg-white text-[#111827]"
                            } ${
                              !hasProject || !hasOtherMembers
                                ? "cursor-not-allowed opacity-60"
                                : ""
                            }`}
                          >
                            Thành viên
                          </Button>
                          <Button
                            variant="solid"
                            onClick={() => handleTabChange("feedback")}
                            className={`rounded-full !px-3 !py-1 !text-xs ${
                              conversationTab === "feedback"
                                ? "border bg-black text-white"
                                : "border border-gray-300 bg-white text-[#111827]"
                            }`}
                          >
                            Feedback
                          </Button>
                        </div>
                      ) : undefined
                    }
                  />
                ) : (
                  <FeedbackConversationDetail
                    conversationId={selectedConversationId}
                    currentUserId={currentUserId}
                    messages={messages}
                    onSendMessage={handleSendMessage}
                    allowCreateConversation={Boolean(pendingConversation)}
                    isSending={isSending}
                    otherProfile={otherParticipant}
                    onBack={allowBackNavigation ? handleBackToList : undefined}
                    presence={presence}
                    isAdminView={
                      isAdmin && activeConversationType === "feedback"
                    }
                    conversationType={activeConversationType}
                    onClose={close}
                    isOpen={isOpen}
                    isLoading={isLoadingMessages}
                    pendingMessages={
                      selectedConversationId
                        ? pendingMessages.filter(
                            (p) => p.conversationId === selectedConversationId
                          )
                        : []
                    }
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FeedbackChatWidget;
