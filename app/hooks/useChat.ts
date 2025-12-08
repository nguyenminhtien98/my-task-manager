"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useProject } from "../context/ProjectContext";
import { useSocket } from "../context/SocketContext";
import toast from "react-hot-toast";
import type { UploadedFileInfo } from "../utils/upload";
import {
  deriveProjectKey,
  ensureConversationExists,
  fetchAdminProfileIds,
  fetchConversationMessages,
  fetchProfilesByIds,
  fetchUserConversations,
  fetchUserPresence,
  markConversationAsRead,
  markMessageSeen,
  sendConversationMessage,
} from "../services/conversationService";
import type {
  ConversationDocument,
  ConversationListEntry,
  ConversationMessageDocument,
  ConversationType,
  PresenceDocument,
  ProfileDocument,
} from "../types/Types";
import {
  ADMIN_ROLES,
  conversationSortValue,
} from "../utils/feedbackChat.utils";

interface PendingConversationInfo {
  targetId: string;
  type: ConversationType;
  projectId?: string | null;
}

export interface UseChatResult {
  isAdmin: boolean;
  currentUserId: string;
  conversations: ConversationDocument[];
  messages: ConversationMessageDocument[];
  isSending: boolean;
  selectedConversationId: string | null;
  setSelectedConversationId: (id: string | null) => void;
  filter: "all" | "unread";
  setFilter: (v: "all" | "unread") => void;
  conversationTab: ConversationType;
  setConversationTab: (v: ConversationType) => void;
  profileMap: Record<string, ProfileDocument | undefined>;
  presenceMap: Record<string, PresenceDocument | null>;
  presence: PresenceDocument | null;
  otherParticipant: {
    id: string;
    name?: string;
    avatarUrl?: string | null;
    role?: string | null;
  } | null;
  isLoadingMessages: boolean;
  isLoadingMoreMessages: boolean;
  hasMoreMessages: boolean;
  loadMoreMessages: () => Promise<void>;
  pendingMessages: Array<{
    id: string;
    conversationId: string;
    content: string;
    attachments?: UploadedFileInfo[];
  }>;
  handleSendMessage: (
    content: string,
    attachments?: UploadedFileInfo[]
  ) => Promise<void>;
  hasProject: boolean;
  hasOtherMembers: boolean;
  shouldForceFeedbackOnly: boolean;
  memberConversations: ConversationListEntry[];
  feedbackConversations: ConversationListEntry[];
  loadMoreConversations: () => Promise<void>;
  hasMoreConversations: boolean;
  isLoadingMoreConversations: boolean;
  isLoadingConversations: boolean;
  pendingConversation: PendingConversationInfo | null;
  startPendingConversation: (info: PendingConversationInfo) => void;
  clearPendingConversation: () => void;
  adminLookupDone: boolean;
}

export const useChat = (isOpen: boolean): UseChatResult => {
  const { user } = useAuth();
  const { currentProject, members: projectMembers } = useProject();

  const [conversations, setConversations] = useState<ConversationDocument[]>(
    []
  );
  const [conversationsPage, setConversationsPage] = useState(1);
  const [hasMoreConversations, setHasMoreConversations] = useState(false);
  const [isLoadingMoreConversations, setIsLoadingMoreConversations] =
    useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true); // Start with true to show loading initially

  const [messages, setMessages] = useState<ConversationMessageDocument[]>([]);
  const [messagesCursor, setMessagesCursor] = useState<string | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedConversationId, _setSelectedConversationId] = useState<
    string | null
  >(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const setSelectedConversationId = useCallback((id: string | null) => {
    _setSelectedConversationId(id);
    if (id) {
      setMessages([]);
      setIsLoadingMessages(true);
    }
  }, []);
  const { socket, isConnected } = useSocket();
  const [conversationTab, setConversationTab] =
    useState<ConversationType>("feedback");
  const [profileMap, setProfileMap] = useState<
    Record<string, ProfileDocument | undefined>
  >({});
  const [presence, setPresence] = useState<PresenceDocument | null>(null);
  const [presenceMap, setPresenceMap] = useState<
    Record<string, PresenceDocument | null>
  >({});
  const presenceFetchedRef = useRef<Set<string>>(new Set());
  const [memberProfiles, setMemberProfiles] = useState<ProfileDocument[]>([]);
  const [adminIds, setAdminIds] = useState<string[]>([]);
  const [adminLookupDone, setAdminLookupDone] = useState<boolean>(
    Boolean(user?.role && ADMIN_ROLES.has(user.role))
  );
  const adminWarningShownRef = useRef(false);
  const initialTabSetRef = useRef(false);
  const suppressAutoSelectRef = useRef(false);
  const [pendingMessages, setPendingMessages] = useState<
    Array<{
      id: string;
      conversationId: string;
      content: string;
      attachments?: UploadedFileInfo[];
    }>
  >([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [pendingConversation, setPendingConversation] =
    useState<PendingConversationInfo | null>(null);
  const newlyCreatedConversationIdRef = useRef<string | null>(null);
  const loadConversationsInProgressRef = useRef(false);

  const isAdmin = Boolean(user?.role && ADMIN_ROLES.has(user.role));
  const currentUserId = user?.id ?? "";
  const hasProject = Boolean(currentProject?._id);
  const hasOtherMembers = useMemo(
    () =>
      memberProfiles.some(
        (profile) => profile?._id && profile._id !== currentUserId
      ),
    [memberProfiles, currentUserId]
  );
  const shouldForceFeedbackOnly = !isAdmin && (!hasProject || !hasOtherMembers);

  useEffect(() => {
    if (!currentUserId) {
      setPendingConversation(null);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (!isOpen) return;
    if (isAdmin) return;
    if (shouldForceFeedbackOnly) {
      if (conversationTab !== "feedback") setConversationTab("feedback");
      return;
    }
    if (!initialTabSetRef.current && hasProject) {
      setConversationTab("member");
      initialTabSetRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasProject, isAdmin, isOpen, shouldForceFeedbackOnly]);

  useEffect(() => {
    if (!isOpen) {
      initialTabSetRef.current = false;
      suppressAutoSelectRef.current = false;
      setPendingConversation(null);
      profilesFetchedRef.current.clear();
      pendingProfileIdsRef.current.clear();
      if (enrichProfilesTimerRef.current) {
        clearTimeout(enrichProfilesTimerRef.current);
        enrichProfilesTimerRef.current = null;
      }
    }
  }, [isOpen]);

  useEffect(() => {
    initialTabSetRef.current = false;
  }, [hasProject, hasOtherMembers, isAdmin]);

  useEffect(() => {
    if (selectedConversationId) {
      suppressAutoSelectRef.current = false;
      setPendingConversation(null);
    }
  }, [selectedConversationId]);

  const upsertConversation = useCallback(
    (conversation: ConversationDocument) => {
      setConversations((prev) => {
        const index = prev.findIndex((item) => item._id === conversation._id);
        const next =
          index >= 0
            ? prev.map((item, idx) => (idx === index ? conversation : item))
            : [...prev, conversation];
        return next.sort(
          (a, b) => conversationSortValue(b) - conversationSortValue(a)
        );
      });
    },
    []
  );

  const pendingProfileIdsRef = useRef<Set<string>>(new Set());
  const enrichProfilesTimerRef = useRef<NodeJS.Timeout | null>(null);
  const profilesFetchedRef = useRef<Set<string>>(new Set());

  const enrichProfiles = useCallback(async (ids: string[]) => {
    if (!ids.length) return;

    const newIds = ids.filter(
      (id) => id && !profilesFetchedRef.current.has(id)
    );
    if (!newIds.length) return;

    newIds.forEach((id) => pendingProfileIdsRef.current.add(id));

    if (enrichProfilesTimerRef.current) {
      clearTimeout(enrichProfilesTimerRef.current);
    }

    enrichProfilesTimerRef.current = setTimeout(async () => {
      const batchIds = Array.from(pendingProfileIdsRef.current);
      pendingProfileIdsRef.current.clear();

      if (!batchIds.length) return;

      try {
        const profiles = await fetchProfilesByIds(batchIds);
        batchIds.forEach((id) => profilesFetchedRef.current.add(id));
        setProfileMap((prev) => ({ ...prev, ...profiles }));

        const fetchableIds = batchIds.filter((id) => {
          if (!id) return false;
          return !presenceFetchedRef.current.has(id);
        });

        if (fetchableIds.length) {
          fetchableIds.forEach((id) => presenceFetchedRef.current.add(id));
          const presenceEntries = await Promise.all(
            fetchableIds.map(async (id) => ({
              id,
              doc: await fetchUserPresence(id),
            }))
          );
          setPresenceMap((prev) => {
            const next = { ...prev };
            presenceEntries.forEach(({ id, doc }) => {
              // IMPORTANT: Don't overwrite if socket already provided real-time data
              if (!next[id]) {
                next[id] = doc;
              }
            });
            return next;
          });
        }
      } catch (error) {
        console.error("Không thể tải thông tin người dùng:", error);
      }
    }, 100);
  }, []);

  const startPendingConversation = useCallback(
    (info: PendingConversationInfo) => {
      if (!info?.targetId) return;
      if (!currentUserId) {
        toast.error("Vui lòng đăng nhập để trò chuyện");
        return;
      }
      setPendingConversation(info);
      setSelectedConversationId(null);
      void enrichProfiles([info.targetId]);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentUserId]
  );

  const clearPendingConversation = useCallback(() => {
    setPendingConversation(null);
  }, []);

  const buildPlaceholderConversation = useCallback(
    (
      targetId: string,
      type: ConversationType,
      projectId?: string | null
    ): ConversationListEntry => {
      const participants = [currentUserId, targetId].filter(
        (id): id is string => Boolean(id)
      );
      const placeholderProjectKey = projectId
        ? deriveProjectKey(projectId)
        : null;
      const baseId = projectId ? `${projectId}:${targetId}` : targetId;
      return {
        _id: `placeholder:${type}:${baseId}`,
        type,
        participants,
        projectId: placeholderProjectKey,
        lastMessage: null,
        lastMessageAt: null,
        unreadBy: [],
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString(),
        __placeholderTargetId: targetId,
        __placeholderProjectId: projectId ?? null,
      };
    },
    [currentUserId]
  );

  useEffect(() => {
    if (!projectMembers) {
      setMemberProfiles([]);
      return;
    }

    const profiles: ProfileDocument[] = projectMembers.map((m) => ({
      _id: m._id,
      name: m.name,
      email: m.email,
      avatarUrl: m.avatarUrl,
      role: m.role,
      createdAt: m.createdAt,
    }));

    setMemberProfiles(profiles);
    void enrichProfiles(profiles.map((p) => p._id));
  }, [projectMembers, enrichProfiles]);

  useEffect(() => {
    if (!isOpen) return;
    if (isAdmin) {
      setAdminLookupDone(true);
      return;
    }
    if (adminLookupDone) return;

    if (!shouldForceFeedbackOnly) return;

    let cancelled = false;
    const loadAdmins = async () => {
      let finalIds: string[] = [];

      if (process.env.NEXT_PUBLIC_FEEDBACK_ADMIN_ID?.trim()) {
        finalIds = [process.env.NEXT_PUBLIC_FEEDBACK_ADMIN_ID.trim()];
      } else {
        try {
          const ids = await fetchAdminProfileIds();
          finalIds = ids;
        } catch (error) {
          console.error("Không thể tải danh sách admin feedback:", error);
        }
      }

      if (!cancelled) {
        setAdminIds(finalIds);
        if (finalIds.length === 0 && !adminWarningShownRef.current) {
          toast.error("Chưa cấu hình tài khoản admin cho feedback");
          adminWarningShownRef.current = true;
        } else if (finalIds.length > 0) {
          adminWarningShownRef.current = false;
        }
        setAdminLookupDone(true);
      }
    };
    void loadAdmins();
    return () => {
      cancelled = true;
    };
  }, [isOpen, adminLookupDone, isAdmin, shouldForceFeedbackOnly]);

  useEffect(() => {
    if (isAdmin) return;
    if (!adminIds.length) return;
    void enrichProfiles(adminIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminIds, isAdmin]);

  const loadConversations = useCallback(async () => {
    if (!currentUserId) return;
    if (!isAdmin && !adminLookupDone) return;
    if (loadConversationsInProgressRef.current) {
      return;
    }
    try {
      loadConversationsInProgressRef.current = true;
      setIsLoadingConversations(true);
      const { conversations: data, totalPages } = await fetchUserConversations(
        currentUserId,
        1,
        20
      );
      const uniqueData = Array.from(
        new Map(data.map((item) => [item._id, item])).values()
      );
      const sortedData = [...uniqueData].sort(
        (a, b) => conversationSortValue(b) - conversationSortValue(a)
      );
      setConversations(sortedData);
      setConversationsPage(1);
      setHasMoreConversations(1 < totalPages);

      const participantIds = sortedData
        .flatMap((conversation) => conversation.participants ?? [])
        .filter((id) => id !== currentUserId);
      void enrichProfiles(participantIds);
      if (!isAdmin) return;
      if (
        selectedConversationId &&
        !data.some(
          (conversation) => conversation._id === selectedConversationId
        )
      ) {
        setSelectedConversationId(null);
      }
    } catch (error) {
      console.error("Không thể tải đoạn chat:", error);
      toast.error("Không thể tải danh sách đoạn chat");
    } finally {
      loadConversationsInProgressRef.current = false;
      setIsLoadingConversations(false);
    }
  }, [
    adminLookupDone,
    currentUserId,
    enrichProfiles,
    isAdmin,
    selectedConversationId,
    setSelectedConversationId,
  ]);

  const loadMoreConversations = useCallback(async () => {
    if (isLoadingMoreConversations || !hasMoreConversations || !currentUserId)
      return;

    try {
      setIsLoadingMoreConversations(true);
      const nextPage = conversationsPage + 1;
      const { conversations: data, totalPages } = await fetchUserConversations(
        currentUserId,
        nextPage,
        20
      );

      setConversations((prev) => {
        const existingIds = new Set(prev.map((c) => c._id));
        const uniqueNew = data.filter((c) => !existingIds.has(c._id));
        const merged = [...prev, ...uniqueNew];
        return merged.sort(
          (a, b) => conversationSortValue(b) - conversationSortValue(a)
        );
      });
      setConversationsPage(nextPage);
      setHasMoreConversations(nextPage < totalPages);

      const participantIds = data
        .flatMap((conversation) => conversation.participants ?? [])
        .filter((id) => id !== currentUserId);
      void enrichProfiles(participantIds);
    } catch (error) {
      console.error("Failed to load more conversations:", error);
    } finally {
      setIsLoadingMoreConversations(false);
    }
  }, [
    conversationsPage,
    currentUserId,
    enrichProfiles,
    hasMoreConversations,
    isLoadingMoreConversations,
  ]);

  useEffect(() => {
    if (!isOpen) return;
    if (!currentUserId) return;
    if (!isAdmin && !adminLookupDone) return;

    const isListView = !selectedConversationId && !pendingConversation;
    const needList = isAdmin || isListView;

    if (!needList) {
      return;
    }

    void loadConversations();
  }, [
    isOpen,
    adminLookupDone,
    isAdmin,
    loadConversations,
    currentUserId,
    selectedConversationId,
    pendingConversation,
    conversations.length,
    adminIds.length,
  ]);

  useEffect(() => {
    if (!socket || !isConnected || !currentUserId) return;

    const handleConversationCreated = async (data: {
      conversation: ConversationDocument;
    }) => {
      const conv = data.conversation;
      if (!conv.participants.includes(currentUserId)) {
        return;
      }
      await enrichProfiles(conv.participants);
      upsertConversation(conv);
    };

    const handleConversationUpdated = async (data: {
      conversation: ConversationDocument;
    }) => {
      const conv = data.conversation;
      if (!conv.participants.includes(currentUserId)) {
        return;
      }
      await enrichProfiles(conv.participants);
      upsertConversation(conv);
    };

    socket.on("conversation:created", handleConversationCreated);
    socket.on("conversation:updated", handleConversationUpdated);

    return () => {
      socket.off("conversation:created", handleConversationCreated);
      socket.off("conversation:updated", handleConversationUpdated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, isConnected, currentUserId, upsertConversation]);

  const selectedConversation = useMemo(() => {
    if (!selectedConversationId) return null;
    return (
      conversations.find(
        (conversation) => conversation._id === selectedConversationId
      ) ?? null
    );
  }, [conversations, selectedConversationId]);

  useEffect(() => {
    if (!selectedConversation) return;
    const convType = selectedConversation.type ?? "feedback";
    if (conversationTab !== convType) setConversationTab(convType);
  }, [selectedConversation, conversationTab, setConversationTab]);

  const otherParticipant = useMemo(() => {
    if (selectedConversation) {
      const otherId = (selectedConversation.participants ?? []).find(
        (id) => id !== currentUserId
      );
      if (otherId) {
        const profile = profileMap[otherId];
        return {
          id: otherId,
          name: profile?.name,
          avatarUrl: profile?.avatarUrl,
          role: profile?.role,
        };
      }
    }
    if (pendingConversation) {
      const profile = profileMap[pendingConversation.targetId];
      return {
        id: pendingConversation.targetId,
        name: profile?.name,
        avatarUrl: profile?.avatarUrl,
        role: profile?.role,
      };
    }
    return null;
  }, [currentUserId, pendingConversation, profileMap, selectedConversation]);

  // Keep refs to access latest state in socket handlers (avoid stale closures)
  const otherParticipantRef = useRef(otherParticipant);
  const presenceMapRef = useRef(presenceMap);

  useEffect(() => {
    presenceMapRef.current = presenceMap;
  }, [presenceMap]);

  useEffect(() => {
    otherParticipantRef.current = otherParticipant;
  }, [otherParticipant]);

  // Request presence on-demand when conversation opens (Backend Option 1)
  useEffect(() => {
    if (!socket || !isConnected || !otherParticipant || !isOpen) {
      setPresence(null);
      return;
    }

    const participantId = otherParticipant.id;

    // Check if we already have recent presence data
    const cachedPresence = presenceMap[participantId];
    if (cachedPresence) {
      console.log(
        "[Presence] Using cached presence for:",
        participantId,
        cachedPresence
      );
      setPresence(cachedPresence);
    }

    // Request fresh presence data from server (on-demand)
    console.log(
      "[Presence] Requesting presence from server for:",
      participantId
    );
    socket.emit("presence:get", { userIds: [participantId] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, isConnected, otherParticipant, isOpen]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handlePresenceBatch = (
      data: Record<string, { isOnline: boolean; lastSeen: string | null }>
    ) => {
      Object.entries(data).forEach(([userId, presenceData]) => {
        const presenceDoc: PresenceDocument = {
          _id: userId,
          isOnline: presenceData.isOnline,
          lastSeenAt: presenceData.lastSeen,
        };

        setPresenceMap((prev) => ({ ...prev, [userId]: presenceDoc }));
        presenceMapRef.current = {
          ...presenceMapRef.current,
          [userId]: presenceDoc,
        };

        const currentPartner = otherParticipantRef.current;
        if (currentPartner && currentPartner.id === userId) {
          console.log(
            "[Presence] Updating active conversation partner:",
            userId,
            presenceDoc
          );
          setPresence(presenceDoc);
        }
      });
    };

    socket.on("presence:batch", handlePresenceBatch);

    return () => {
      socket.off("presence:batch", handlePresenceBatch);
    };
  }, [socket, isConnected]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleUserStatus = (
      data:
        | { profileId: string; isOnline: boolean }
        | Array<{ profileId: string; isOnline: boolean }>
    ) => {
      if (!data) return;

      const statusData = Array.isArray(data) ? data[0] : data;
      const { profileId, isOnline } = statusData;

      const presenceDoc: PresenceDocument = {
        _id: profileId,
        isOnline,
        lastSeenAt: isOnline ? null : new Date().toISOString(),
      };

      presenceMapRef.current = {
        ...presenceMapRef.current,
        [profileId]: presenceDoc,
      };
      setPresenceMap((prev) => ({ ...prev, [profileId]: presenceDoc }));

      const currentPartner = otherParticipantRef.current;
      if (currentPartner && currentPartner.id === profileId) {
        setPresence(presenceDoc);
      }
    };

    socket.on("user:status", handleUserStatus);

    return () => {
      socket.off("user:status", handleUserStatus);
    };
  }, [socket, isConnected]);

  const summarizeMessage = useCallback(
    (content: string, attachments?: UploadedFileInfo[]) => {
      const trimmed = content.trim();
      if (trimmed.length > 0) return trimmed;
      if (!attachments || attachments.length === 0) return "";
      const first = attachments[0];
      if (first.type === "image") return "Đã gửi một ảnh";
      if (first.type === "video") return "Đã gửi một video";
      return "Đã gửi một tệp";
    },
    []
  );

  useEffect(() => {
    if (!isOpen || !selectedConversationId || !currentUserId) return;

    if (socket && isConnected) {
      socket.emit("conversation:join", selectedConversationId);
    }

    const skipInitialLoading =
      newlyCreatedConversationIdRef.current === selectedConversationId;
    setMessages([]);
    setMessagesCursor(null);
    setHasMoreMessages(false);
    if (!skipInitialLoading) {
      setIsLoadingMessages(true);
    } else {
      setIsLoadingMessages(false);
      newlyCreatedConversationIdRef.current = null;
    }
    let cancelled = false;
    const loadMessages = async () => {
      try {
        const { messages: data, cursor } = await fetchConversationMessages(
          selectedConversationId,
          20
        );
        if (!cancelled) {
          setMessages(data);
          setMessagesCursor(cursor);
          setHasMoreMessages(!!cursor);

          const hasUnreadFromOthers = data.some(
            (msg) =>
              msg.senderId !== currentUserId &&
              !(msg.seenBy ?? []).includes(currentUserId)
          );

          if (hasUnreadFromOthers) {
            setTimeout(() => {
              if (!cancelled) {
                void markConversationAsRead(
                  selectedConversationId,
                  currentUserId
                );
                setConversations((prev) =>
                  prev.map((conversation) => {
                    if (conversation._id !== selectedConversationId)
                      return conversation;
                    const unreadBy = (conversation.unreadBy ?? []).filter(
                      (id) => id !== currentUserId
                    );
                    return { ...conversation, unreadBy };
                  })
                );
              }
            }, 500);
          }

          await Promise.all(
            data
              .filter(
                (msg) =>
                  msg.senderId !== currentUserId &&
                  !(msg.seenBy ?? []).includes(currentUserId)
              )
              .map(async (msg) => {
                await markMessageSeen(msg._id, currentUserId);
                setMessages((prev) =>
                  prev.map((item) =>
                    item._id === msg._id
                      ? {
                          ...item,
                          seenBy: Array.from(
                            new Set([...(item.seenBy ?? []), currentUserId])
                          ),
                        }
                      : item
                  )
                );
              })
          );
        }
      } catch (error) {
        console.error("Không thể tải tin nhắn:", error);
        toast.error("Không thể tải tin nhắn");
      } finally {
        if (!cancelled) setIsLoadingMessages(false);
        if (newlyCreatedConversationIdRef.current === selectedConversationId) {
          newlyCreatedConversationIdRef.current = null;
        }
      }
    };
    void loadMessages();

    if (!socket || !isConnected || !selectedConversationId) {
      return () => {
        cancelled = true;
      };
    }

    const handleMessageNew = (message: ConversationMessageDocument) => {
      if (message.conversation !== selectedConversationId) {
        return;
      }
      if (cancelled) return;

      setMessages((prev) => {
        const exists = prev.some((m) => m._id === message._id);
        if (exists) {
          return prev;
        }

        const normalizedMessage = {
          ...message,
          senderId: message.senderId || message.sender?._id || "",
        };

        return [...prev, normalizedMessage];
      });

      const senderId = message.senderId || message.sender?._id;
      if (senderId && senderId !== currentUserId) {
        void markMessageSeen(message._id, currentUserId).catch(console.error);
      }
    };

    const handleMessageSeen = (data: {
      messageId: string;
      userId: string;
      seenBy: string[];
    }) => {
      if (cancelled) return;
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === data.messageId ? { ...msg, seenBy: data.seenBy } : msg
        )
      );
    };

    const handleConversationRead = (data: {
      conversationId: string;
      userId: string;
    }) => {
      if (cancelled) return;
      if (data.conversationId !== selectedConversationId) return;
      setMessages((prev) =>
        prev.map((msg) => ({
          ...msg,
          seenBy: Array.from(new Set([...(msg.seenBy ?? []), data.userId])),
        }))
      );
    };

    const handleMessageReacted = (data: {
      messageId: string;
      conversationId: string;
      reactions: Array<{
        type: "like" | "heart" | "haha" | "laugh" | "love" | "wow" | "angry";
        user?: { _id: string; name: string; avatarUrl?: string };
        userId?: string;
        createdAt: string;
      }>;
    }) => {
      if (cancelled) return;

      const mappedReactions = data.reactions.map((r) => ({
        type: r.type,
        userId: r.user?._id || r.userId || "",
        createdAt: r.createdAt,
      }));

      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === data.messageId
            ? { ...msg, reactions: mappedReactions }
            : msg
        )
      );
    };

    socket.on("message:new", handleMessageNew);
    socket.on("message:seen", handleMessageSeen);
    socket.on("conversation:read", handleConversationRead);
    socket.on("message:reacted", handleMessageReacted);

    return () => {
      cancelled = true;
      if (socket && isConnected) {
        socket.emit("conversation:leave", selectedConversationId);
      }
      socket.off("message:new", handleMessageNew);
      socket.off("message:seen", handleMessageSeen);
      socket.off("conversation:read", handleConversationRead);
      socket.off("message:reacted", handleMessageReacted);
    };
  }, [
    socket,
    isConnected,
    currentUserId,
    isOpen,
    selectedConversationId,
    summarizeMessage,
    profileMap,
  ]);

  useEffect(() => {
    if (!selectedConversationId) setMessages([]);
  }, [selectedConversationId]);

  useEffect(() => {
    if (!socket || !isConnected || !currentUserId) return;

    const handleMessageNewGlobal = (message: ConversationMessageDocument) => {
      const convId = message.conversation;
      const conv = conversations.find((c) => c._id === convId);
      if (!conv) {
        void loadConversations();
        return;
      }

      const updatedConv: ConversationDocument = {
        ...conv,
        lastMessage: message.content,
        lastMessageAt: message.createdAt,
        unreadBy:
          message.senderId === currentUserId
            ? []
            : [...(conv.unreadBy ?? []), currentUserId],
      };
      upsertConversation(updatedConv);
    };

    socket.on("message:new", handleMessageNewGlobal);

    return () => {
      socket.off("message:new", handleMessageNewGlobal);
    };
  }, [
    socket,
    isConnected,
    conversations,
    currentUserId,
    upsertConversation,
    loadConversations,
  ]);

  const createConversationFromPending = useCallback(async () => {
    if (!pendingConversation) return null;
    if (!currentUserId) return null;
    try {
      const conversation = await ensureConversationExists(
        currentUserId,
        pendingConversation.targetId,
        {
          type: pendingConversation.type,
          projectId: pendingConversation.projectId ?? null,
        }
      );
      setPendingConversation(null);
      newlyCreatedConversationIdRef.current = conversation._id ?? null;
      upsertConversation(conversation);
      setSelectedConversationId(conversation._id);
      const others = (conversation.participants ?? []).filter(
        (id) => id !== currentUserId
      );
      if (others.length) void enrichProfiles(others);
      return conversation._id ?? null;
    } catch (error) {
      console.error("Không thể khởi tạo cuộc hội thoại:", error);
      toast.error("Không thể khởi tạo cuộc hội thoại");
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, pendingConversation, upsertConversation]);

  const handleSendMessage = useCallback(
    async (
      content: string,
      attachments?: UploadedFileInfo[],
      replyToMessageId?: string
    ) => {
      if (!currentUserId) return;
      setIsSending(true);
      try {
        let conversationId = selectedConversationId;
        if (!conversationId) {
          conversationId = await createConversationFromPending();
          if (!conversationId) {
            setIsSending(false);
            return;
          }
        }
        const pendingId = `${conversationId}:${Date.now()}:${Math.random()
          .toString(36)
          .slice(2)}`;
        setPendingMessages((prev) => [
          ...prev,
          { id: pendingId, conversationId, content, attachments },
        ]);
        const message = await sendConversationMessage({
          conversationId,
          senderId: currentUserId,
          content,
          attachments,
          replyToMessageId,
        });
        setPendingMessages((prev) => prev.filter((p) => p.id !== pendingId));
        if (message) {
          setMessages((prev) => {
            if (prev.some((item) => item._id === message._id)) return prev;
            return [...prev, message].sort((a, b) =>
              a.createdAt.localeCompare(b.createdAt)
            );
          });
        }
        if (message) {
          setConversations((prev) => {
            const summary = summarizeMessage(content, attachments);
            const updated = prev.map((conversation) => {
              if (conversation._id !== conversationId) return conversation;
              const participants = conversation.participants ?? [];
              return {
                ...conversation,
                lastMessage: summary,
                lastMessageAt: message.createdAt,
                unreadBy: participants.filter((id) => id !== currentUserId),
              };
            });
            return updated.sort(
              (a, b) => conversationSortValue(b) - conversationSortValue(a)
            );
          });
        }
        setPendingMessages((prev) =>
          prev.filter((p) => p.conversationId !== conversationId)
        );
      } catch (error) {
        console.error("Không thể gửi tin nhắn:", error);
        setPendingMessages((prev) =>
          prev.filter(
            (p) => !p.id.startsWith(`${selectedConversationId ?? ""}:`)
          )
        );
        if (error instanceof Error && error.message) toast.error(error.message);
        else toast.error("Không thể gửi tin nhắn");
      } finally {
        setIsSending(false);
      }
    },
    [
      createConversationFromPending,
      currentUserId,
      selectedConversationId,
      summarizeMessage,
    ]
  );

  const existingFeedbackConversations = useMemo(
    () =>
      conversations.filter((conversation) => {
        const convType = conversation.type ?? "feedback";
        return convType === "feedback" || convType === "direct";
      }),
    [conversations]
  );

  const feedbackConversations = useMemo((): ConversationListEntry[] => {
    if (!currentUserId) return existingFeedbackConversations;
    if (isAdmin) return existingFeedbackConversations;
    const existingAdminIds = new Set(
      existingFeedbackConversations.flatMap(
        (conversation) => conversation.participants ?? []
      )
    );
    const placeholders = adminIds
      .filter(
        (adminId): adminId is string =>
          Boolean(adminId) &&
          adminId !== currentUserId &&
          !existingAdminIds.has(adminId)
      )
      .map((adminId) => buildPlaceholderConversation(adminId, "feedback"));
    return [...existingFeedbackConversations, ...placeholders].sort(
      (a, b) => conversationSortValue(b) - conversationSortValue(a)
    );
  }, [
    adminIds,
    buildPlaceholderConversation,
    currentUserId,
    existingFeedbackConversations,
    isAdmin,
  ]);

  const existingMemberConversations = useMemo(() => {
    if (!currentProject?._id) return [] as ConversationDocument[];
    const projectKey = deriveProjectKey(currentProject?._id);
    const currentMemberIds = new Set(
      memberProfiles
        .map((profile) => profile._id)
        .filter((id) => id && id !== currentUserId)
    );
    const filtered = conversations.filter((conversation) => {
      if ((conversation.type ?? "feedback") !== "member") return false;
      if (conversation.projectId !== projectKey) return false;
      const others = (conversation.participants ?? []).filter(
        (id) => id !== currentUserId
      );
      return others.length > 0 && others.some((id) => currentMemberIds.has(id));
    });
    const uniqueMap = new Map<string, ConversationDocument>();
    for (const conv of filtered) {
      const participantsKey = [...(conv.participants ?? [])].sort().join(":");
      if (!uniqueMap.has(participantsKey)) {
        uniqueMap.set(participantsKey, conv);
      } else {
        const existing = uniqueMap.get(participantsKey)!;
        const existingTime = existing.lastMessageAt ?? "";
        const currentTime = conv.lastMessageAt ?? "";
        if (currentTime > existingTime) {
          uniqueMap.set(participantsKey, conv);
        }
      }
    }
    return Array.from(uniqueMap.values()).sort(
      (a, b) => conversationSortValue(b) - conversationSortValue(a)
    );
  }, [conversations, currentProject?._id, currentUserId, memberProfiles]);

  const memberConversations = useMemo(() => {
    if (!currentUserId) return [] as ConversationListEntry[];
    const placeholders: ConversationListEntry[] = [];
    if (currentProject?._id) {
      const memberIdsWithConversation = new Set(
        existingMemberConversations.flatMap(
          (conversation) => conversation.participants ?? []
        )
      );
      memberProfiles.forEach((profile) => {
        if (!profile._id || profile._id === currentUserId) return;
        if (memberIdsWithConversation.has(profile._id)) return;
        placeholders.push(
          buildPlaceholderConversation(
            profile._id,
            "member",
            currentProject?._id
          )
        );
      });
    }
    return [...existingMemberConversations, ...placeholders].sort(
      (a, b) => conversationSortValue(b) - conversationSortValue(a)
    );
  }, [
    buildPlaceholderConversation,
    currentProject?._id,
    currentUserId,
    existingMemberConversations,
    memberProfiles,
  ]);

  useEffect(() => {
    if (!isOpen) return;
    if (!shouldForceFeedbackOnly) return;
    if (selectedConversationId) return;
    if (suppressAutoSelectRef.current) return;
    if (!adminLookupDone) return;
    if (!isAdmin && hasProject && memberProfiles.length === 0) return;

    const conversation = existingFeedbackConversations[0];
    if (conversation) {
      setSelectedConversationId(conversation._id);
      return;
    }

    if (!pendingConversation) {
      const placeholder = feedbackConversations.find((item) =>
        Boolean(item.__placeholderTargetId)
      );
      if (placeholder?.__placeholderTargetId) {
        startPendingConversation({
          targetId: placeholder.__placeholderTargetId,
          type: placeholder.type ?? "feedback",
          projectId: placeholder.__placeholderProjectId ?? null,
        });
      }
    }
  }, [
    adminLookupDone,
    conversations.length,
    existingFeedbackConversations,
    feedbackConversations,
    hasProject,
    isAdmin,
    isOpen,
    memberProfiles.length,
    pendingConversation,
    startPendingConversation,
    selectedConversationId,
    setSelectedConversationId,
    shouldForceFeedbackOnly,
  ]);

  const loadMoreMessages = useCallback(async () => {
    if (
      !selectedConversationId ||
      !hasMoreMessages ||
      isLoadingMoreMessages ||
      !messagesCursor
    )
      return;

    try {
      setIsLoadingMoreMessages(true);
      const { messages: newMessages, cursor } = await fetchConversationMessages(
        selectedConversationId,
        20,
        messagesCursor
      );

      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m._id));
        const uniqueNew = newMessages.filter((m) => !existingIds.has(m._id));
        return [...uniqueNew, ...prev];
      });
      setMessagesCursor(cursor);
      setHasMoreMessages(!!cursor);
    } catch (error) {
      console.error("Failed to load more messages:", error);
      toast.error("Không thể tải thêm tin nhắn cũ");
    } finally {
      setIsLoadingMoreMessages(false);
    }
  }, [
    selectedConversationId,
    hasMoreMessages,
    isLoadingMoreMessages,
    messagesCursor,
  ]);

  return {
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
    isLoadingMoreMessages,
    hasMoreMessages,
    loadMoreMessages,
    pendingMessages,
    handleSendMessage,
    hasProject,
    hasOtherMembers,
    shouldForceFeedbackOnly,
    memberConversations,
    feedbackConversations,
    loadMoreConversations,
    hasMoreConversations,
    isLoadingMoreConversations,
    isLoadingConversations,
    pendingConversation,
    startPendingConversation,
    clearPendingConversation,
    adminLookupDone,
  };
};
