"use client";

import axiosInstance, { ApiResponse } from "@/lib/axios";
import type { UploadedFileInfo } from "../utils/upload";
import type {
  ConversationType,
  ConversationDocument,
  ConversationMessageDocument,
  PresenceDocument,
  ProfileDocument,
} from "../types/Types";

export const ONLINE_STATUS_STALE_MS = 60000;

interface ConversationFromBE {
  _id: string;
  type?: ConversationType;
  participants: Array<
    string | { _id: string; name: string; email: string; avatarUrl?: string }
  >;
  projectId?: string | null;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  unreadBy?: string[];
  createdAt: string;
  updatedAt?: string;
}

interface MessageFromBE {
  _id: string;
  conversation: string;
  sender: {
    _id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    role?: string;
  };
  content: string;
  attachments?: UploadedFileInfo[];
  seenBy?: string[];
  createdAt: string;
  replyTo?: {
    messageId: string;
    content: string;
    senderName: string;
    displayName: string;
    isOwn: boolean;
    attachments?: UploadedFileInfo[];
  };
  reactions?: Array<{
    user: {
      _id: string;
      name: string;
      avatarUrl?: string;
    };
    type: "like" | "heart" | "haha" | "laugh" | "love" | "wow" | "angry";
    createdAt: string;
  }>;
}

interface ProfileFromBE {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  role?: string;
  suspendedUntil?: string | null;
  suspensionReason?: string | null;
  createdAt?: string;
}

export const deriveProjectKey = (
  projectId: string | null | undefined
): string | null => {
  if (!projectId) return null;
  return projectId;
};

const mapConversationToDocument = (
  conv: ConversationFromBE
): ConversationDocument => {
  const participants = Array.isArray(conv.participants)
    ? conv.participants.map((p) => (typeof p === "string" ? p : p._id))
    : [];

  return {
    _id: conv._id,
    type: conv.type || "feedback",
    participants,
    projectId: conv.projectId || null,
    lastMessage: conv.lastMessage || null,
    lastMessageAt: conv.lastMessageAt || null,
    unreadBy: conv.unreadBy || [],
    createdAt: conv.createdAt,
    updatedAt: conv.updatedAt || conv.createdAt,
  };
};

const mapMessageToDocument = (
  msg: MessageFromBE
): ConversationMessageDocument => {
  const mapped: ConversationMessageDocument = {
    _id: msg._id,
    conversation: msg.conversation,
    sender: msg.sender,
    senderId: msg.sender._id,
    content: msg.content,
    attachments: msg.attachments || [],
    seenBy: msg.seenBy || [],
    createdAt: msg.createdAt,
  };

  if (msg.replyTo) {
    mapped.replyTo = {
      messageId: msg.replyTo.messageId,
      content: msg.replyTo.content,
      displayName: msg.replyTo.displayName,
      isOwn: msg.replyTo.isOwn,
      attachments: msg.replyTo.attachments || [],
    };
  }

  if (msg.reactions && msg.reactions.length > 0) {
    mapped.reactions = msg.reactions.map(r => ({
      type: r.type,
      userId: r.user._id,
      createdAt: r.createdAt
    }));
  }

  return mapped;
};

export const fetchUserConversations = async (
  _userId: string,
  page = 1,
  limit = 20
): Promise<{ conversations: ConversationDocument[]; totalPages: number }> => {
  try {
    const response = await axiosInstance.get<ApiResponse<ConversationFromBE[]>>(
      `/conversations?limit=${limit}&page=${page}`
    );
    const data = response.data?.data;
    if (!data || !Array.isArray(data)) {
      return { conversations: [], totalPages: 0 };
    }
    return {
      conversations: data.map(mapConversationToDocument),
      totalPages:
        (
          response.data as ApiResponse<ConversationFromBE[]> & {
            pagination?: { totalPages: number };
          }
        ).pagination?.totalPages || 1,
    };
  } catch (error) {
    console.error("Failed to fetch conversations:", error);
    return { conversations: [], totalPages: 0 };
  }
};

export const createConversation = async ({
  userIds,
  type = "feedback",
  projectId,
}: {
  userIds: string[];
  createdBy: string;
  type?: ConversationType;
  projectId?: string | null;
}): Promise<ConversationDocument> => {
  const payload = {
    participantIds: userIds,
    type,
    projectId: projectId || undefined,
  };

  const response = await axiosInstance.post<ApiResponse<ConversationFromBE>>(
    "/conversations",
    payload
  );
  return mapConversationToDocument(response.data.data);
};

export const ensureConversationExists = async (
  userId: string,
  partnerId: string,
  options?: {
    type?: ConversationType;
    projectId?: string | null;
  }
): Promise<ConversationDocument> => {
  return createConversation({
    userIds: [userId, partnerId],
    createdBy: userId,
    type: options?.type,
    projectId: options?.projectId,
  });
};

export const fetchConversationMessages = async (
  conversationId: string,
  limit = 100,
  cursor?: string
): Promise<{
  messages: ConversationMessageDocument[];
  cursor: string | null;
}> => {
  const page = cursor ? parseInt(cursor) : 1;
  const response = await axiosInstance.get<ApiResponse<MessageFromBE[]>>(
    `/conversations/${conversationId}/messages?limit=${limit}&page=${page}`
  );

  const data = response.data?.data;
  if (!data || !Array.isArray(data)) {
    console.warn(
      "[conversationService] Invalid messages response:",
      response.data
    );
    return { messages: [], cursor: null };
  }

  const messages = data.map(mapMessageToDocument);

  const pagination = (
    response.data as ApiResponse<MessageFromBE[]> & {
      pagination?: { page: number; totalPages: number };
    }
  ).pagination;
  const nextCursor =
    pagination && pagination.page < pagination.totalPages
      ? String(pagination.page + 1)
      : null;

  return { messages, cursor: nextCursor };
};

export const sendConversationMessage = async ({
  conversationId,
  senderId: _senderId,
  content,
  attachments,
  replyToMessageId,
}: {
  conversationId: string;
  senderId: string;
  content: string;
  attachments?: UploadedFileInfo[];
  replyToMessageId?: string;
}): Promise<ConversationMessageDocument | null> => {
  const response = await axiosInstance.post<ApiResponse<MessageFromBE>>(
    `/conversations/${conversationId}/messages`,
    {
      content,
      attachments: attachments || [],
      replyTo: replyToMessageId || undefined,
    }
  );
  return mapMessageToDocument(response.data.data);
};

export const markConversationAsRead = async (
  conversationId: string,
  _userId: string
): Promise<void> => {
  await axiosInstance.put(`/conversations/${conversationId}/read`);
};

export const markMessageSeen = async (
  messageId: string,
  _userId: string
): Promise<void> => {
  await axiosInstance.put(`/conversations/messages/${messageId}/seen`);
};

export const fetchConversationById = async (
  conversationId: string
): Promise<ConversationDocument | null> => {
  try {
    const { conversations } = await fetchUserConversations("", 1, 100);
    return conversations.find((c) => c._id === conversationId) || null;
  } catch {
    return null;
  }
};

export const fetchProfilesByIds = async (
  ids: string[]
): Promise<Record<string, ProfileDocument>> => {
  if (!ids.length) return {};

  try {
    const idsParam = ids.join(",");
    const response = await axiosInstance.get<ApiResponse<ProfileFromBE[]>>(
      `/profiles?ids=${encodeURIComponent(idsParam)}`
    );
    const map: Record<string, ProfileDocument> = {};
    const data = response.data?.data;
    if (!data || !Array.isArray(data)) {
      return map;
    }

    data.forEach((profile) => {
      map[profile._id] = {
        _id: profile._id,
        name: profile.name,
        email: profile.email,
        avatarUrl: profile.avatarUrl,
        role: profile.role,
        suspendedUntil: profile.suspendedUntil,
        suspensionReason: profile.suspensionReason,
        createdAt: profile.createdAt,
      };
    });

    return map;
  } catch (error) {
    console.error("Failed to fetch profiles:", error);
    return {};
  }
};

export const fetchAdminProfileIds = async (): Promise<string[]> => {
  try {
    const response = await axiosInstance.get<ApiResponse<ProfileFromBE[]>>(
      "/profiles?role=admin&limit=100"
    );
    const data = response.data.data;
    if (!data || !Array.isArray(data)) {
      return [];
    }
    return data.map((profile) => profile._id);
  } catch (error) {
    console.error("Failed to fetch admin profiles:", error);
    return [];
  }
};

export const fetchProjectMemberProfiles = async (
  projectId: string
): Promise<ProfileDocument[]> => {
  try {
    const response = await axiosInstance.get<
      ApiResponse<{ members: ProfileFromBE[] }>
    >(`/projects/${projectId}`);
    return response.data.data.members || [];
  } catch (error) {
    console.error("Failed to fetch project members:", error);
    return [];
  }
};

export const fetchUserPresence = async (
  userId: string
): Promise<PresenceDocument | null> => {
  try {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (!token) {
        return {
          _id: userId,
          isOnline: false,
          lastSeenAt: null,
        };
      }
    }

    const response = await axiosInstance.get<ApiResponse<PresenceDocument>>(
      `/presence/${userId}`
    );

    console.log(`[Presence] Fetched for ${userId}:`, response.data.data);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    return {
      _id: userId,
      isOnline: false,
      lastSeenAt: null,
    };
  } catch (_error) {
    return {
      _id: userId,
      isOnline: false,
      lastSeenAt: null,
    };
  }
};

export const updateUserPresence = async (
  _userId: string,
  _isOnline: boolean
): Promise<void> => {};

export const reactToMessage = async (
  messageId: string,
  reactionType: "like" | "heart" | "haha" | "laugh" | "love" | "wow" | "angry"
): Promise<{ messageId: string; reactions: Array<{ type: string; userId: string; createdAt: string }> } | null> => {
  try {
    const response = await axiosInstance.put<ApiResponse<{ messageId: string; reactions: Array<{ user: { _id: string }; type: string; createdAt: string }> }>>(
      `/feedback/conversations/messages/${messageId}/react`,
      { type: reactionType }
    );

    if (response.data.success && response.data.data) {
      const { messageId, reactions } = response.data.data;
      return {
        messageId,
        reactions: reactions.map(r => ({
          type: r.type,
          userId: r.user._id,
          createdAt: r.createdAt
        }))
      };
    }

    return null;
  } catch (error) {
    console.error("Failed to react to message:", error);
    throw error;
  }
};
