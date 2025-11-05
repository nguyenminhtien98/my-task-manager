"use client";

import React from "react";
import AvatarUser from "../common/AvatarUser";
import Tooltip from "../common/Tooltip";
import type {
  ConversationDocument,
  PresenceDocument,
  ProfileDocument,
} from "../../services/feedbackService";

interface MemberConversationListProps {
  conversations: ConversationDocument[];
  profileMap: Record<string, ProfileDocument | undefined>;
  presenceMap: Record<string, PresenceDocument | null>;
  currentUserId: string;
  selectedConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
}

const MemberConversationList: React.FC<MemberConversationListProps> = ({
  conversations,
  profileMap,
  presenceMap,
  currentUserId,
  selectedConversationId,
  onSelectConversation,
}) => {
  if (!conversations.length) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-500">
        Không có đoạn chat thành viên
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {conversations.map((conversation) => {
        const others = (conversation.participants ?? []).filter(
          (id) => id !== currentUserId
        );
        const otherId = others[0];
        const profile = otherId ? profileMap[otherId] : undefined;
        const displayName = profile?.name ?? "Thành viên";
        const lastMessage =
          conversation.lastMessage ?? "Chưa có tin nhắn";
        const unread = (conversation.unreadBy ?? []).includes(currentUserId);
        const presence = otherId ? presenceMap[otherId] : undefined;

        return (
          <button
            type="button"
            key={conversation.$id}
            onClick={() => onSelectConversation(conversation.$id)}
            className={`flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-black/30 ${
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
            {unread && (
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
  );
};

export default MemberConversationList;
