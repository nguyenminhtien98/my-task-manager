"use client";

import React, { useEffect } from "react";
import { FiX } from "react-icons/fi";
import AvatarUser from "../common/AvatarUser";
import Button from "../common/Button";
import ConversationSkeleton from "../loading/ConversationSkeleton";
import { useSocket } from "../../context/SocketContext";
import type {
  ConversationListEntry,
  ProfileDocument,
  PresenceDocument,
} from "../../types/Types";

interface FeedbackConversationListProps {
  conversations: ConversationListEntry[];
  profileMap: Record<string, ProfileDocument | undefined>;
  presenceMap: Record<string, PresenceDocument | null>;
  currentUserId: string;
  selectedConversationId: string | null;
  onSelectConversation: (conversation: ConversationListEntry) => void;
  filter: "all" | "unread";
  onFilterChange: (filter: "all" | "unread") => void;
  onClose?: () => void;
  headerTitle?: string;
  headerDescription?: string;
  actions?: React.ReactNode;
  pendingTargetId?: string | null;
  hasMore?: boolean;
  isLoading?: boolean;
  onLoadMore?: () => Promise<void>;
}

const FeedbackConversationList: React.FC<FeedbackConversationListProps> = ({
  conversations,
  profileMap,
  presenceMap,
  currentUserId,
  selectedConversationId,
  onSelectConversation,
  filter,
  onFilterChange,
  onClose,
  headerTitle = "Danh sách đoạn chat",
  headerDescription,
  actions,
  pendingTargetId = null,
  hasMore = false,
  isLoading = false,
  onLoadMore,
}) => {
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (!socket || !isConnected || conversations.length === 0) return;

    const participantIds = Array.from(
      new Set(
        conversations.flatMap(conv =>
          (conv.participants ?? []).filter(id => id !== currentUserId)
        )
      )
    );
    if (participantIds.length === 0) return;
    socket.emit('presence:get', { userIds: participantIds });
  }, [socket, isConnected, conversations, currentUserId]);

  const handleScroll = React.useCallback(() => {
    const container = listRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    if (
      scrollHeight - scrollTop - clientHeight < 50 &&
      hasMore &&
      !isLoading &&
      onLoadMore
    ) {
      void onLoadMore();
    }
  }, [hasMore, isLoading, onLoadMore]);

  const renderActions = () => {
    if (actions) return actions;
    return (
      <div className="mt-2 flex items-center gap-2">
        <Button
          variant="solid"
          onClick={() => onFilterChange("all")}
          className={`rounded-full !px-3 !py-1 !text-xs ${filter === "all"
            ? "border bg-black text-white"
            : "border border-gray-300 bg-white text-[#111827]"
            }`}
        >
          Tất cả
        </Button>
        <Button
          variant="solid"
          onClick={() => onFilterChange("unread")}
          className={`rounded-full border !px-3 !py-1 !text-xs font-medium ${filter === "unread"
            ? "border bg-black text-white"
            : "border-gray-300 bg-white text-[#111827]"
            }`}
        >
          Chưa đọc
        </Button>
      </div>
    );
  };

  return (
    <div className="flex h-full w-[320px] max-w-full flex-col rounded-2xl border border-black/10 bg-white shadow-xl">
      <div className="flex items-start justify-between border-b border-black/10 px-2 py-2">
        <div>
          <div className="text-sm font-semibold text-[#111827]">
            {headerTitle}
          </div>
          {headerDescription ? (
            <p className="text-xs text-gray-500">{headerDescription}</p>
          ) : null}
          <div className="mt-2 flex items-center gap-2">{renderActions()}</div>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="mt-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-black/5 text-gray-600 transition hover:bg-black/10 hover:text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
            aria-label="Đóng phản hồi"
          >
            <FiX />
          </button>
        ) : null}
      </div>

      <div
        ref={listRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-2 pr-1 no-scrollbar"
      >
        {(() => {
          const realConversations = conversations.filter(
            conv => !conv.__placeholderTargetId
          );
          const hasRealConversations = realConversations.length > 0;

          if (isLoading && !hasRealConversations) {
            return (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <ConversationSkeleton key={i} />
                ))}
              </div>
            );
          }

          if (!hasRealConversations) {
            return (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                Không có đoạn chat nào
              </div>
            );
          }

          return (
            <>
              <div className="space-y-1">
                {conversations.map((conversation) => {
                  const isPending =
                    pendingTargetId &&
                    conversation.__placeholderTargetId === pendingTargetId;
                  return (
                    <div
                      key={conversation._id}
                      onClick={() => onSelectConversation(conversation)}
                      className={`cursor-pointer rounded-lg p-2 transition-colors hover:bg-gray-50 ${selectedConversationId === conversation._id || isPending
                        ? "bg-gray-100"
                        : ""
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <AvatarUser
                            name={
                              profileMap[
                                (conversation.participants ?? []).find(
                                  (id) => id !== currentUserId
                                ) ?? ""
                              ]?.name || "User"
                            }
                            avatarUrl={
                              profileMap[
                                (conversation.participants ?? []).find(
                                  (id) => id !== currentUserId
                                ) ?? ""
                              ]?.avatarUrl
                            }
                            size={40}
                            className="rounded-full border border-gray-200"
                          />
                          {presenceMap[
                            (conversation.participants ?? []).find(
                              (id) => id !== currentUserId
                            ) ?? ""
                          ]?.isOnline && (
                              <span
                                className="absolute right-0 block h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white"
                                style={{ bottom: '10px' }}
                              />
                            )}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <div className="flex items-center justify-between">
                            <span className="truncate text-sm font-medium text-[#111827]">
                              {
                                profileMap[
                                  (conversation.participants ?? []).find(
                                    (id) => id !== currentUserId
                                  ) ?? ""
                                ]?.name
                              }
                            </span>
                            {conversation.lastMessageAt && (
                              <span className="text-xs text-gray-400">
                                {new Date(
                                  conversation.lastMessageAt
                                ).toLocaleDateString("vi-VN", {
                                  day: "2-digit",
                                  month: "2-digit",
                                })}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <p
                              className={`truncate text-xs ${conversation.unreadBy?.includes(currentUserId)
                                ? "font-semibold text-[#111827]"
                                : "text-gray-500"
                                }`}
                            >
                              {conversation.lastMessage || "Chưa có tin nhắn"}
                            </p>
                            {conversation.unreadBy?.includes(currentUserId) && (
                              <span className="h-2 w-2 rounded-full bg-blue-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {isLoading && hasMore && (
                <div className="space-y-2 py-2">
                  {[1].map((i) => (
                    <ConversationSkeleton key={`loading-${i}`} />
                  ))}
                </div>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
};

export default FeedbackConversationList;
