"use client";

import React from "react";
import { FiX } from "react-icons/fi";
import AvatarUser from "../common/AvatarUser";
import Button from "../common/Button";
import {
  ConversationDocument,
  PresenceDocument,
  ProfileDocument,
} from "../../services/feedbackService";
import Tooltip from "../common/Tooltip";

interface FeedbackConversationListProps {
  conversations: ConversationDocument[];
  profileMap: Record<string, ProfileDocument | undefined>;
  presenceMap: Record<string, PresenceDocument | null>;
  currentUserId: string;
  selectedConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  filter: "all" | "unread";
  onFilterChange: (filter: "all" | "unread") => void;
  onClose?: () => void;
  headerTitle?: string;
  headerDescription?: string;
  actions?: React.ReactNode;
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
}) => {
  const renderActions = () => {
    if (actions) return actions;
    return (
      <div className="mt-2 flex items-center gap-2">
        <Button
          variant="solid"
          onClick={() => onFilterChange("all")}
          className={`rounded-full !px-3 !py-1 !text-xs ${
            filter === "all"
              ? "border bg-black text-white"
              : "border border-gray-300 bg-white text-[#111827]"
          }`}
        >
          Tất cả
        </Button>
        <Button
          variant="solid"
          onClick={() => onFilterChange("unread")}
          className={`rounded-full border !px-3 !py-1 !text-xs font-medium ${
            filter === "unread"
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

      <div className="flex-1 overflow-y-auto p-2 pr-1 no-scrollbar">
        {conversations.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            Không có đoạn chat nào
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conversation) => {
              const others = (conversation.participants ?? []).filter(
                (id) => id !== currentUserId
              );
              const otherId = others[0];
              const profile = otherId ? profileMap[otherId] : undefined;
              const displayName = profile?.name ?? "Người dùng";
              const lastMessage =
                conversation.lastMessage ?? "(Không có tin nhắn)";
              const unreadBy = conversation.unreadBy ?? [];
              const hasUnread = unreadBy.includes(currentUserId);
              const presence = otherId ? presenceMap[otherId] : undefined;

              return (
                <button
                  type="button"
                  key={conversation.$id}
                  onClick={() => onSelectConversation(conversation.$id)}
                  className={`cursor-pointer flex w-full items-center gap-3 rounded-xl border border-transparent px-1 py-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-black/30 ${
                    selectedConversationId === conversation.$id
                      ? "bg-black text-white"
                      : "bg-black/60 text-white hover:bg-black/70"
                  }`}
                >
                  <AvatarUser
                    name={displayName}
                    avatarUrl={profile?.avatarUrl}
                    size={40}
                    showTooltip={false}
                    status={presence?.isOnline ? "online" : undefined}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-left text-sm font-semibold">
                      {displayName}
                    </div>
                    <div className="truncate text-left text-xs text-gray-300">
                      {lastMessage}
                    </div>
                  </div>
                  {hasUnread && (
                    <div className="flex h-full w-3 items-center justify-center">
                      <Tooltip content="Chưa đọc">
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      </Tooltip>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackConversationList;
