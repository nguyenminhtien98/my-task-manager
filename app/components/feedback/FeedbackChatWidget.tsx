"use client";

import React, { useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import { FeedbackChatContext } from "../../context/FeedbackChatContext";
import FeedbackFloatingBubble from "./FeedbackFloatingBubble";
import { useBubblePosition } from "../../hooks/useBubblePosition";
import { useChat } from "../../hooks/useChat";
import FeedbackConversationList from "./FeedbackConversationList";
import FeedbackConversationDetail from "./FeedbackConversationDetail";
import Button from "../common/Button";
import type { ConversationType } from "../../types/Types";

const FeedbackChatWidget: React.FC = () => {
  const feedbackContext = useContext(FeedbackChatContext);


  const { isOpen, open, close } = feedbackContext || { isOpen: false, open: () => { }, close: () => { } };
  const panelRef = useRef<HTMLDivElement | null>(null);

  const {
    position: bubblePosition,
    onPointerDown: handleBubblePointerDown,
    consumePreventClick,
    style: bubbleStyleHook,
    isDragging: isDraggingBubble,
  } = useBubblePosition();

  const chat = useChat(isOpen);

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
    if (!isOpen) {
      suppressAutoSelectRef.current = false;
      clearPendingConversation();
    }
  }, [clearPendingConversation, isOpen]);

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
        (conversation) => conversation._id === selectedConversationId
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
        setSelectedConversationId(existing._id);
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

  if (!feedbackContext) return null;

  return (
    <>
      {!isOpen && (
        <FeedbackFloatingBubble
          style={bubbleStyle}
          side={bubblePosition.side}
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
            className={`absolute bottom-28 sm:bottom-6 ${bubblePosition.side === "left" ? "left-6" : "right-6"
              }`}
          >
            <div className="relative">
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
                      setSelectedConversationId(conversation._id);
                    }}
                    filter={conversationTab === "feedback" ? filter : "all"}
                    onFilterChange={
                      conversationTab === "feedback"
                        ? setFilter
                        : () => undefined
                    }
                    onClose={close}
                    hasMore={chat.hasMoreConversations}
                    isLoading={chat.isLoadingConversations || chat.isLoadingMoreConversations}
                    onLoadMore={chat.loadMoreConversations}
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
                            className={`rounded-full !px-3 !py-1 !text-xs ${conversationTab === "member"
                              ? "border bg-black text-white"
                              : "border border-gray-300 bg-white text-[#111827]"
                              } ${!hasProject || !hasOtherMembers
                                ? "cursor-not-allowed opacity-60"
                                : ""
                              }`}
                          >
                            Thành viên
                          </Button>
                          <Button
                            variant="solid"
                            onClick={() => handleTabChange("feedback")}
                            className={`rounded-full !px-3 !py-1 !text-xs ${conversationTab === "feedback"
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
                      isAdmin && (activeConversationType === "feedback" || activeConversationType === "direct")
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
                    hasMoreMessages={chat.hasMoreMessages}
                    isLoadingMoreMessages={chat.isLoadingMoreMessages}
                    onLoadMoreMessages={chat.loadMoreMessages}
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

const FeedbackChatWidgetWrapper: React.FC = () => {
  const pathname = usePathname();

  if (pathname?.startsWith("/server-error")) {
    return null;
  }

  return <FeedbackChatWidget />;
};

export default FeedbackChatWidgetWrapper;
