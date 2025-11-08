"use client";

import { Models, Query, Permission, Role } from "appwrite";
import { database, subscribeToRealtime } from "../../lib/appwrite";
import type { UploadedFileInfo } from "../utils/upload";

const getConversationCollectionIds = () => {
  const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID;
  const conversationCollectionId =
    process.env.NEXT_PUBLIC_COLLECTION_ID_CONVERSATIONS;
  const messageCollectionId =
    process.env.NEXT_PUBLIC_COLLECTION_ID_CONVERSATION_MESSAGES;
  const presenceCollectionId =
    process.env.NEXT_PUBLIC_COLLECTION_ID_USER_PRESENCE;
  if (
    !databaseId ||
    !conversationCollectionId ||
    !messageCollectionId ||
    !presenceCollectionId
  ) {
    throw new Error("Thiếu cấu hình collection feedback chat");
  }
  return {
    databaseId,
    conversationCollectionId,
    messageCollectionId,
    presenceCollectionId,
  };
};

export type ConversationType = "feedback" | "member";

export interface ConversationDocument extends Models.Document {
  participants: string[];
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  unreadBy?: string[];
  createdBy?: string | null;
  type?: ConversationType | null;
  projectId?: string | null;
}

export interface ConversationListEntry extends ConversationDocument {
  __placeholderTargetId?: string;
  __placeholderProjectId?: string | null;
}

export interface ConversationMessageDocument extends Models.Document {
  conversationId: string;
  senderId: string;
  content: string;
  attachments?: UploadedFileInfo[];
  seenBy?: string[];
}

export interface PresenceDocument extends Models.Document {
  isOnline?: boolean;
  lastSeenAt?: string | null;
  lastFeedbackActionAt?: string | null;
  feedbackStrikeCount?: number;
  feedbackCooldownUntil?: string | null;
  feedbackWindowStart?: string | null;
  feedbackWindowCount?: number;
  feedbackLastViolationAt?: string | null;
}

export const ONLINE_STATUS_STALE_MS = 60000;

type ConversationRawDocument = Models.Document & Record<string, unknown>;
type ConversationMessageRawDocument = Models.Document & Record<string, unknown>;

const extractIdFromValue = (value: unknown): string | null => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (
    typeof value === "object" &&
    "$id" in (value as Record<string, unknown>)
  ) {
    const idValue = (value as { $id?: unknown }).$id;
    return typeof idValue === "string" ? idValue : null;
  }
  return null;
};

const hashProjectIdToKey = (projectId: string): string => {
  let hash = 0;
  for (let index = 0; index < projectId.length; index += 1) {
    hash = Math.imul(31, hash) + projectId.charCodeAt(index);
  }
  const normalized = Math.abs(hash);
  return normalized === 0 ? "0" : normalized.toString();
};

const normalizeProjectKey = (value: unknown): string | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    const normalized = Math.abs(value);
    return normalized === 0 ? "0" : normalized.toString();
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) return null;
    if (/^\d+$/.test(trimmed)) {
      return trimmed;
    }
    return hashProjectIdToKey(trimmed);
  }
  return null;
};

export const deriveProjectKey = (projectId?: string | null): string | null => {
  if (!projectId) return null;
  return hashProjectIdToKey(projectId);
};

const normalizeConversationDocument = (
  doc: ConversationRawDocument
): ConversationDocument => {
  const participantSet = new Set<string>();

  const addParticipant = (value: unknown) => {
    const id = extractIdFromValue(value);
    if (id) participantSet.add(id);
  };

  const rawParticipants = doc.participants;
  if (Array.isArray(rawParticipants)) {
    rawParticipants.forEach(addParticipant);
  } else {
    addParticipant(rawParticipants);
  }

  const participantIds = doc.participantIds;
  if (Array.isArray(participantIds)) {
    participantIds.forEach(addParticipant);
  }

  addParticipant(doc.createdBy);

  const unreadBy = Array.isArray(doc.unreadBy)
    ? doc.unreadBy.filter((value): value is string => typeof value === "string")
    : [];

  return {
    ...(doc as ConversationDocument),
    participants: Array.from(participantSet),
    unreadBy,
    createdBy: extractIdFromValue(doc.createdBy),
    type:
      typeof doc.type === "string"
        ? (doc.type as string as ConversationType)
        : (doc.type as ConversationType | null | undefined) ?? "feedback",
    projectId: normalizeProjectKey(doc.projectId),
  };
};

const normalizeMessageDocument = (
  doc: ConversationMessageRawDocument
): ConversationMessageDocument => {
  const seenSet = new Set<string>();
  const addSeen = (value: unknown) => {
    const id = extractIdFromValue(value);
    if (id) seenSet.add(id);
  };

  const rawSeen = (doc as Record<string, unknown>).seenBy;
  if (Array.isArray(rawSeen)) {
    rawSeen.forEach(addSeen);
  } else {
    addSeen(rawSeen);
  }

  const normalizedConversationId =
    extractIdFromValue((doc as Record<string, unknown>).conversationId) ??
    (typeof (doc as Record<string, unknown>).conversationId === "string"
      ? ((doc as Record<string, unknown>).conversationId as string)
      : "");

  const normalizeAttachments = (value: unknown): UploadedFileInfo[] => {
    if (!value) return [];

    const parseSingle = (entry: unknown): UploadedFileInfo | null => {
      if (!entry) return null;
      if (typeof entry === "object" && !Array.isArray(entry)) {
        const obj = entry as Record<string, unknown>;
        const url = typeof obj.url === "string" ? obj.url : null;
        if (!url) return null;
        const type =
          obj.type === "image" || obj.type === "video" || obj.type === "file"
            ? obj.type
            : "file";
        const name =
          typeof obj.name === "string" && obj.name.trim().length > 0
            ? obj.name
            : "Tệp đính kèm";
        const size =
          typeof obj.size === "number" && Number.isFinite(obj.size)
            ? obj.size
            : 0;
        const mimeType =
          typeof obj.mimeType === "string"
            ? obj.mimeType
            : type === "image"
            ? "image/*"
            : type === "video"
            ? "video/*"
            : "application/octet-stream";
        return {
          url,
          type,
          name,
          size,
          mimeType,
        };
      }
      return null;
    };

    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return normalizeAttachments(parsed);
      } catch {
        return [];
      }
    }

    if (Array.isArray(value)) {
      const result: UploadedFileInfo[] = [];
      value.forEach((entry) => {
        result.push(...normalizeAttachments(entry));
      });
      return result;
    }

    const single = parseSingle(value);
    return single ? [single] : [];
  };

  const attachments = normalizeAttachments(
    (doc as Record<string, unknown>).attachments
  );

  return {
    ...(doc as ConversationMessageDocument),
    conversationId: normalizedConversationId,
    attachments,
    seenBy: Array.from(seenSet),
  };
};

const normalizePresenceDocument = (
  doc: PresenceDocument | null
): PresenceDocument | null => {
  if (!doc) return null;
  const normalized: PresenceDocument = { ...doc };
  const lastSeenMs = doc.lastSeenAt ? new Date(doc.lastSeenAt).getTime() : 0;
  const now = Date.now();
  const isRecent = lastSeenMs > 0 && now - lastSeenMs <= ONLINE_STATUS_STALE_MS;
  normalized.isOnline = Boolean(doc.isOnline && isRecent);
  return normalized;
};

export const fetchUserConversations = async (
  userId: string
): Promise<ConversationDocument[]> => {
  if (!userId) return [];
  const { databaseId, conversationCollectionId } =
    getConversationCollectionIds();

  try {
    const res = await database.listDocuments(
      databaseId,
      conversationCollectionId,
      [Query.limit(200)]
    );

    const normalized = (res.documents as ConversationRawDocument[]).map(
      normalizeConversationDocument
    );

    const docs = normalized.filter((conversation) =>
      conversation.participants.includes(userId)
    );

    const toTimestamp = (conversation: ConversationDocument) => {
      const fallback =
        conversation.lastMessageAt ??
        conversation.$updatedAt ??
        conversation.$createdAt ??
        "";
      const time = new Date(fallback).getTime();
      return Number.isNaN(time) ? 0 : time;
    };

    return docs.sort((a, b) => toTimestamp(b) - toTimestamp(a));
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      ("code" in error || "message" in error)
    ) {
      const code = (error as { code?: number }).code;
      const message = (error as { message?: string }).message ?? "";
      if (
        code === 401 ||
        code === 403 ||
        message.toLowerCase().includes("not authorized")
      ) {
        console.warn(
          "Không có quyền đọc danh sách đoạn chat, trả về danh sách rỗng."
        );
        return [];
      }
    }
    throw error;
  }
};

export const ensureConversationExists = async (
  userId: string,
  partnerId: string,
  options?: {
    type?: ConversationType;
    projectId?: string | null;
  }
): Promise<ConversationDocument> => {
  const conversations = await fetchUserConversations(userId);
  const desiredType = options?.type ?? "feedback";
  const desiredProjectId = deriveProjectKey(options?.projectId ?? null);
  const existing = conversations.find((conv) => {
    if (!conv.participants.includes(partnerId)) return false;
    if (!conv.participants.includes(userId)) return false;
    const convType = conv.type ?? "feedback";
    if (convType !== desiredType) return false;
    const convProjectId = conv.projectId ?? null;
    if (desiredType === "member") {
      return convProjectId === desiredProjectId;
    }
    return true;
  });
  if (existing) return existing;
  return createConversation({
    userIds: [userId, partnerId],
    createdBy: userId,
    type: desiredType,
    projectId: options?.projectId ?? null,
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
  if (!conversationId) {
    return { messages: [], cursor: null };
  }
  const { databaseId, messageCollectionId } = getConversationCollectionIds();
  const queries = [
    Query.equal("conversationId", conversationId),
    Query.orderAsc("$createdAt"),
    Query.limit(limit),
  ];
  if (cursor) {
    queries.push(Query.cursorAfter(cursor));
  }
  const res = await database.listDocuments(
    databaseId,
    messageCollectionId,
    queries
  );
  const docs = (res.documents as ConversationMessageRawDocument[]).map(
    normalizeMessageDocument
  );
  const nextCursor = docs.length > 0 ? docs[docs.length - 1].$id ?? null : null;
  return { messages: docs, cursor: nextCursor };
};

export const createConversation = async ({
  userIds,
  createdBy,
  type = "feedback",
  projectId,
}: {
  userIds: string[];
  createdBy: string;
  type?: ConversationType;
  projectId?: string | null;
}): Promise<ConversationDocument> => {
  const participants = Array.from(new Set(userIds));
  if (participants.length < 2) {
    throw new Error("Conversation need at least two participants");
  }
  const projectKey = deriveProjectKey(projectId);
  const response = await fetch("/api/feedback/conversations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userIds: participants,
      createdBy,
      type,
      projectId: projectKey ? Number(projectKey) : null,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Không thể tạo cuộc hội thoại");
  }

  const doc = (await response.json()) as ConversationRawDocument;
  return normalizeConversationDocument(doc);
};

export const sendConversationMessage = async ({
  conversationId,
  senderId,
  content,
  attachments,
}: {
  conversationId: string;
  senderId: string;
  content: string;
  attachments?: UploadedFileInfo[];
}): Promise<ConversationMessageDocument> => {
  const trimmedContent = content.trim();
  const safeAttachments = attachments ?? [];
  if (!trimmedContent && safeAttachments.length === 0) {
    throw new Error("Tin nhắn trống");
  }

  const extractErrorMessage = (raw: string | null): string => {
    if (!raw) return "";
    try {
      const parsed = JSON.parse(raw) as { error?: string; message?: string };
      if (typeof parsed?.error === "string") return parsed.error;
      if (typeof parsed?.message === "string") return parsed.message;
    } catch {
      /* ignore */
    }
    return raw;
  };

  const response = await fetch("/api/feedback/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      conversationId,
      senderId,
      content: trimmedContent,
      attachments: safeAttachments,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const message = extractErrorMessage(errorText) || "Không thể gửi tin nhắn";
    throw new Error(message);
  }

  const message = (await response.json()) as ConversationMessageRawDocument;
  return normalizeMessageDocument(message);
};

export const markConversationRead = async (
  conversationId: string,
  userId: string
) => {
  const { databaseId, conversationCollectionId } =
    getConversationCollectionIds();
  const doc = (await database.getDocument(
    databaseId,
    conversationCollectionId,
    conversationId
  )) as ConversationRawDocument;

  const rawUnread = (doc as Record<string, unknown>).unreadBy;
  const unreadSet = new Set<string>();
  if (Array.isArray(rawUnread)) {
    rawUnread.forEach((entry) => {
      const id = extractIdFromValue(entry);
      if (id) unreadSet.add(id);
    });
  } else {
    const id = extractIdFromValue(rawUnread);
    if (id) unreadSet.add(id);
  }

  if (!unreadSet.has(userId)) return;
  unreadSet.delete(userId);

  await database.updateDocument(
    databaseId,
    conversationCollectionId,
    conversationId,
    {
      unreadBy: Array.from(unreadSet),
    }
  );
};

export const markMessageSeen = async (
  messageId: string,
  userId: string
): Promise<void> => {
  const { databaseId, messageCollectionId } = getConversationCollectionIds();
  const doc = (await database.getDocument(
    databaseId,
    messageCollectionId,
    messageId
  )) as ConversationMessageRawDocument;

  const rawSeen = (doc as Record<string, unknown>).seenBy;
  const existingId = extractIdFromValue(rawSeen);
  if (existingId === userId) return;

  await database.updateDocument(databaseId, messageCollectionId, messageId, {
    seenBy: userId,
  });
};

export const updateUserPresence = async (userId: string, isOnline: boolean) => {
  const { databaseId, presenceCollectionId } = getConversationCollectionIds();
  const payload = {
    isOnline,
    lastSeenAt: new Date().toISOString(),
  };
  const permissions = [
    Permission.read(Role.users()),
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
  ];

  const parseError = (error: unknown) => {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? Number((error as { code?: number }).code)
        : undefined;
    const message =
      typeof error === "object" && error !== null && "message" in error
        ? String((error as { message?: string }).message ?? "")
        : "";
    return { code, message };
  };

  try {
    await database.updateDocument(
      databaseId,
      presenceCollectionId,
      userId,
      payload,
      permissions
    );
  } catch (error) {
    const { code, message } = parseError(error);
    if (code && [401, 403].includes(code)) {
      console.warn(
        "Không có quyền cập nhật trạng thái online, bỏ qua.",
        message
      );
      return;
    }
    if (code && code !== 404) {
      throw error;
    }
    try {
      await database.createDocument(
        databaseId,
        presenceCollectionId,
        userId,
        payload,
        permissions
      );
    } catch (createError) {
      const { code: createCode, message: createMessage } =
        parseError(createError);
      if (createCode && [401, 403].includes(createCode)) {
        console.warn(
          "Không có quyền tạo trạng thái online, bỏ qua.",
          createMessage
        );
        return;
      }
      if (createCode === 409) {
        return;
      }
      throw createError;
    }
  }
};

export const fetchUserPresence = async (
  userId: string
): Promise<PresenceDocument | null> => {
  const { databaseId, presenceCollectionId } = getConversationCollectionIds();
  try {
    const doc = await database.getDocument(
      databaseId,
      presenceCollectionId,
      userId
    );
    return normalizePresenceDocument(doc as unknown as PresenceDocument);
  } catch {
    return null;
  }
};

type RealtimeCallback<T> = (payload: T) => void;

export const subscribeConversationMessages = (
  conversationId: string,
  callback: RealtimeCallback<ConversationMessageDocument>
) => {
  const { databaseId, messageCollectionId } = getConversationCollectionIds();
  const channel = `databases.${databaseId}.collections.${messageCollectionId}.documents`;
  return subscribeToRealtime([channel], (response: unknown) => {
    const payload = response as {
      events?: string[];
      payload?: ConversationMessageRawDocument;
    };
    if (!payload?.events?.length || !payload.payload) return;
    if (
      payload.payload.conversationId &&
      payload.payload.conversationId === conversationId
    ) {
      callback(normalizeMessageDocument(payload.payload));
    }
  });
};

export const subscribeAllConversationMessages = (
  callback: RealtimeCallback<ConversationMessageDocument>
) => {
  const { databaseId, messageCollectionId } = getConversationCollectionIds();
  const channel = `databases.${databaseId}.collections.${messageCollectionId}.documents`;
  return subscribeToRealtime([channel], (response: unknown) => {
    const payload = response as {
      events?: string[];
      payload?: ConversationMessageRawDocument;
    };
    if (!payload?.events?.length || !payload.payload) return;
    callback(normalizeMessageDocument(payload.payload));
  });
};

export const fetchConversationById = async (
  conversationId: string
): Promise<ConversationDocument | null> => {
  const { databaseId, conversationCollectionId } =
    getConversationCollectionIds();
  try {
    const doc = (await database.getDocument(
      databaseId,
      conversationCollectionId,
      conversationId
    )) as ConversationRawDocument;
    return normalizeConversationDocument(doc);
  } catch {
    return null;
  }
};

export const subscribeConversations = (
  userId: string,
  callback: RealtimeCallback<ConversationDocument>
) => {
  const { databaseId, conversationCollectionId } =
    getConversationCollectionIds();
  const channel = `databases.${databaseId}.collections.${conversationCollectionId}.documents`;
  return subscribeToRealtime([channel], (response: unknown) => {
    const payload = response as {
      events?: string[];
      payload?: ConversationRawDocument;
    };
    if (!payload?.events?.length || !payload.payload) return;
    const conversation = normalizeConversationDocument(payload.payload);
    if (conversation.participants.includes(userId)) {
      callback(conversation);
    }
  });
};

export const subscribeUserPresence = (
  userId: string,
  callback: RealtimeCallback<PresenceDocument>
) => {
  const { databaseId, presenceCollectionId } = getConversationCollectionIds();
  const channel = `databases.${databaseId}.collections.${presenceCollectionId}.documents`;
  return subscribeToRealtime([channel], (response: unknown) => {
    const payload = response as {
      events?: string[];
      payload?: PresenceDocument;
    };
    if (!payload?.events?.length || !payload.payload) return;
    if (payload.payload.$id === userId) {
      const normalized = normalizePresenceDocument(payload.payload);
      if (normalized) {
        callback(normalized);
      }
    }
  });
};

export interface ProfileDocument extends Models.Document {
  user_id?: string;
  name?: string;
  email?: string;
  avatarUrl?: string | null;
  role?: string;
  suspendedUntil?: string | null;
  suspensionReason?: string | null;
}

export const fetchProfilesByIds = async (
  ids: string[]
): Promise<Record<string, ProfileDocument>> => {
  if (!ids.length) return {};
  const uniqueIds = Array.from(new Set(ids));
  const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID;
  const profileCollectionId = process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE;
  if (!databaseId || !profileCollectionId) {
    throw new Error("Thiếu cấu hình profile collection");
  }
  const res = await database.listDocuments(databaseId, profileCollectionId, [
    Query.equal("$id", uniqueIds),
    Query.limit(uniqueIds.length),
  ]);
  const map: Record<string, ProfileDocument> = {};
  (res.documents as unknown as ProfileDocument[]).forEach((doc) => {
    map[doc.$id] = doc;
  });
  return map;
};

export const fetchAdminProfileIds = async (): Promise<string[]> => {
  const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID;
  const profileCollectionId = process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE;
  if (!databaseId || !profileCollectionId) {
    throw new Error("Thiếu cấu hình profile collection");
  }

  const res = await database.listDocuments(databaseId, profileCollectionId, [
    Query.equal("role", ["admin", "leader"]),
    Query.limit(200),
  ]);

  return (res.documents as unknown as ProfileDocument[]).map((doc) => doc.$id);
};

const getProjectMembershipCollectionId = () => {
  const membershipsCollectionId =
    process.env.NEXT_PUBLIC_COLLECTION_ID_PROJECT_MEMBERSHIPS;
  if (!membershipsCollectionId) {
    throw new Error("Thiếu cấu hình collection thành viên dự án");
  }
  return membershipsCollectionId;
};

export const fetchProjectMemberProfiles = async (
  projectId: string,
  options?: {
    includeCurrentUser?: boolean;
  }
): Promise<ProfileDocument[]> => {
  if (!projectId) return [];
  const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID;
  const profileCollectionId = process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE;
  if (!databaseId || !profileCollectionId) {
    throw new Error("Thiếu cấu hình profile collection");
  }
  const membershipsCollectionId = getProjectMembershipCollectionId();
  try {
    const membershipRes = await database.listDocuments(
      databaseId,
      membershipsCollectionId,
      [Query.equal("project", projectId), Query.limit(200)]
    );
    const memberIds = new Set<string>();
    membershipRes.documents.forEach((doc) => {
      const membership = doc as Models.Document & {
        user?: string | { $id?: string };
      };
      if (typeof membership.user === "string") {
        memberIds.add(membership.user);
      } else if (membership.user && typeof membership.user.$id === "string") {
        memberIds.add(membership.user.$id);
      }
    });

    const uniqueIds = Array.from(memberIds);
    if (!options?.includeCurrentUser) {
    }
    if (!uniqueIds.length) return [];
    const profileMap = await fetchProfilesByIds(uniqueIds);
    const profiles: ProfileDocument[] = uniqueIds
      .map((id) => profileMap[id])
      .filter((profile): profile is ProfileDocument => Boolean(profile));
    profiles.sort((a, b) =>
      (a.name ?? "").localeCompare(b.name ?? "", "vi", { sensitivity: "base" })
    );
    return profiles;
  } catch (error) {
    console.error("Không thể lấy danh sách hồ sơ thành viên dự án:", error);
    return [];
  }
};
