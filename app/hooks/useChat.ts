"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useProject } from "../context/ProjectContext";
import toast from "react-hot-toast";
import type { UploadedFileInfo } from "../utils/upload";
import {
  ConversationDocument,
  ConversationListEntry,
  ConversationMessageDocument,
  ConversationType,
  PresenceDocument,
  ProfileDocument,
  deriveProjectKey,
  ensureConversationExists,
  fetchAdminProfileIds,
  fetchConversationById,
  fetchConversationMessages,
  fetchProfilesByIds,
  fetchProjectMemberProfiles,
  fetchUserConversations,
  fetchUserPresence,
  markConversationRead,
  markMessageSeen,
  sendConversationMessage,
  subscribeAllConversationMessages,
  subscribeConversationMessages,
  subscribeConversations,
  subscribeUserPresence,
} from "../services/feedbackService";
import {
  ADMIN_ROLES,
  conversationSortValue,
} from "../utils/feedbackChat.utils";
import { onMembersChanged } from "../utils/membersBus";

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
  pendingConversation: PendingConversationInfo | null;
  startPendingConversation: (info: PendingConversationInfo) => void;
  clearPendingConversation: () => void;
  adminLookupDone: boolean;
}

export const useChat = (
  isOpen: boolean,
  onShowIncomingBanner: () => void
): UseChatResult => {
  const { user } = useAuth();
  const { currentProject } = useProject();

  const [conversations, setConversations] = useState<ConversationDocument[]>(
    []
  );
  const [messages, setMessages] = useState<ConversationMessageDocument[]>([]);
  const [, setMessagesCursor] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");
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

  const isAdmin = Boolean(user?.role && ADMIN_ROLES.has(user.role));
  const currentUserId = user?.id ?? "";
  const hasProject = Boolean(currentProject?.$id);
  const hasOtherMembers = useMemo(
    () =>
      memberProfiles.some(
        (profile) => profile?.$id && profile.$id !== currentUserId
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
  }, [conversationTab, hasProject, isAdmin, isOpen, shouldForceFeedbackOnly]);

  useEffect(() => {
    if (!isOpen) {
      initialTabSetRef.current = false;
      suppressAutoSelectRef.current = false;
      setPendingConversation(null);
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
      let shouldShowBanner = false;
      const hasUnread =
        currentUserId && (conversation.unreadBy ?? []).includes(currentUserId);
      if (hasUnread && conversation.$id !== selectedConversationId)
        shouldShowBanner = true;
      setConversations((prev) => {
        const index = prev.findIndex((item) => item.$id === conversation.$id);
        const next =
          index >= 0
            ? prev.map((item, idx) => (idx === index ? conversation : item))
            : [...prev, conversation];
        return next.sort(
          (a, b) => conversationSortValue(b) - conversationSortValue(a)
        );
      });
      if (shouldShowBanner) onShowIncomingBanner();
    },
    [currentUserId, onShowIncomingBanner, selectedConversationId]
  );

  const enrichProfiles = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    try {
      const profiles = await fetchProfilesByIds(ids);
      setProfileMap((prev) => ({ ...prev, ...profiles }));

      const fetchableIds = ids.filter((id) => {
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
            next[id] = doc;
          });
          return next;
        });
      }
    } catch (error) {
      console.error("Không thể tải thông tin người dùng:", error);
    }
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
    [currentUserId, enrichProfiles]
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
        $collectionId: "",
        $databaseId: "",
        $id: `placeholder:${type}:${baseId}`,
        $permissions: [],
        $createdAt: new Date(0).toISOString(),
        $updatedAt: new Date(0).toISOString(),
        participants,
        unreadBy: [],
        createdBy: currentUserId,
        type,
        projectId: placeholderProjectKey,
        lastMessage: null,
        lastMessageAt: null,
        __placeholderTargetId: targetId,
        __placeholderProjectId: projectId ?? null,
      };
    },
    [currentUserId]
  );

  useEffect(() => {
    if (!currentProject?.$id) {
      setMemberProfiles([]);
      return;
    }
    let cancelled = false;
    const loadMembers = async () => {
      try {
        const profiles = await fetchProjectMemberProfiles(currentProject.$id);
        if (cancelled) return;
        setMemberProfiles(profiles);
        void enrichProfiles(profiles.map((profile) => profile.$id));
      } catch (error) {
        console.error("Không thể tải danh sách thành viên dự án:", error);
        if (!cancelled) setMemberProfiles([]);
      }
    };
    void loadMembers();
    return () => {
      cancelled = true;
    };
  }, [currentProject?.$id, enrichProfiles]);

  useEffect(() => {
    if (!currentProject?.$id) return;
    const unsubscribe = onMembersChanged((projectId) => {
      if (projectId === currentProject.$id) {
        const loadMembers = async () => {
          try {
            const profiles = await fetchProjectMemberProfiles(
              currentProject.$id
            );
            setMemberProfiles(profiles);
            void enrichProfiles(profiles.map((profile) => profile.$id));
          } catch (error) {
            console.error("Không thể tải danh sách thành viên dự án:", error);
          }
        };
        void loadMembers();
      }
    });
    return unsubscribe;
  }, [currentProject?.$id, enrichProfiles]);

  useEffect(() => {
    if (isAdmin) {
      setAdminLookupDone(true);
      return;
    }
    if (adminLookupDone) return;
    let cancelled = false;
    const loadAdmins = async () => {
      let finalIds: string[] = [];
      try {
        const ids = await fetchAdminProfileIds();
        finalIds = ids;
      } catch (error) {
        console.error("Không thể tải danh sách admin feedback:", error);
      }
      if (
        finalIds.length === 0 &&
        process.env.NEXT_PUBLIC_FEEDBACK_ADMIN_ID?.trim()
      ) {
        finalIds = [process.env.NEXT_PUBLIC_FEEDBACK_ADMIN_ID.trim()];
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
  }, [adminLookupDone, isAdmin, isOpen]);

  useEffect(() => {
    if (isAdmin) return;
    if (!adminIds.length) return;
    void enrichProfiles(adminIds);
  }, [adminIds, enrichProfiles, isAdmin]);

  const loadConversations = useCallback(async () => {
    if (!currentUserId) return;
    if (!isAdmin && !adminLookupDone) return;
    try {
      const data = await fetchUserConversations(currentUserId);
      const uniqueData = Array.from(
        new Map(data.map((item) => [item.$id, item])).values()
      );
      const sortedData = [...uniqueData].sort(
        (a, b) => conversationSortValue(b) - conversationSortValue(a)
      );
      setConversations(sortedData);
      const participantIds = sortedData
        .flatMap((conversation) => conversation.participants ?? [])
        .filter((id) => id !== currentUserId);
      void enrichProfiles(participantIds);
      if (!isAdmin) return;
      if (
        selectedConversationId &&
        !data.some(
          (conversation) => conversation.$id === selectedConversationId
        )
      ) {
        setSelectedConversationId(null);
      }
    } catch (error) {
      console.error("Không thể tải đoạn chat:", error);
      toast.error("Không thể tải danh sách đoạn chat");
    }
  }, [
    adminLookupDone,
    currentUserId,
    enrichProfiles,
    isAdmin,
    selectedConversationId,
  ]);

  useEffect(() => {
    if (!currentUserId) return;
    if (!isAdmin && !adminLookupDone) return;
    void loadConversations();
  }, [adminLookupDone, isAdmin, loadConversations, currentUserId]);

  useEffect(() => {
    if (!isAdmin) return;
    const otherIds = conversations
      .flatMap((conversation) => conversation.participants ?? [])
      .filter((id) => id !== currentUserId);
    const uniqueIds = Array.from(new Set(otherIds));
    const unsubscribes = uniqueIds.map((id) =>
      subscribeUserPresence(id, (doc) => {
        setPresenceMap((prev) => ({ ...prev, [id]: doc }));
      })
    );
    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [conversations, currentUserId, isAdmin]);

  useEffect(() => {
    if (!currentUserId) return;
    const unsubscribe = subscribeConversations(
      currentUserId,
      (conversation) => {
        upsertConversation(conversation);
        const otherIds = conversation.participants.filter(
          (id) => id !== currentUserId
        );
        void enrichProfiles(otherIds);
      }
    );
    return () => {
      unsubscribe();
    };
  }, [currentUserId, enrichProfiles, upsertConversation]);

  const selectedConversation = useMemo(() => {
    if (!selectedConversationId) return null;
    return (
      conversations.find(
        (conversation) => conversation.$id === selectedConversationId
      ) ?? null
    );
  }, [conversations, selectedConversationId]);

  useEffect(() => {
    if (!selectedConversation) return;
    const convType = selectedConversation.type ?? "feedback";
    if (conversationTab !== convType) setConversationTab(convType);
  }, [conversationTab, selectedConversation]);

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
  }, [
    currentUserId,
    pendingConversation,
    profileMap,
    selectedConversation,
  ]);

  useEffect(() => {
    if (!isOpen || !otherParticipant) {
      setPresence(null);
      return;
    }
    let active = true;
    const loadPresence = async () => {
      const doc = await fetchUserPresence(otherParticipant.id);
      if (active) {
        setPresence(doc);
        setPresenceMap((prev) => ({ ...prev, [otherParticipant.id]: doc }));
      }
    };
    void loadPresence();
    const unsubscribe = subscribeUserPresence(otherParticipant.id, (doc) => {
      setPresence(doc);
      setPresenceMap((prev) => ({ ...prev, [otherParticipant.id]: doc }));
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [isOpen, otherParticipant]);

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
    const skipInitialLoading =
      newlyCreatedConversationIdRef.current === selectedConversationId;
    setMessages([]);
    setMessagesCursor(null);
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
          200
        );
        if (!cancelled) {
          setMessages(data);
          setMessagesCursor(cursor);
          setTimeout(() => {
            if (!cancelled) {
              void markConversationRead(selectedConversationId, currentUserId);
              setConversations((prev) =>
                prev.map((conversation) => {
                  if (conversation.$id !== selectedConversationId)
                    return conversation;
                  const unreadBy = (conversation.unreadBy ?? []).filter(
                    (id) => id !== currentUserId
                  );
                  return { ...conversation, unreadBy };
                })
              );
            }
          }, 500);
          await Promise.all(
            data
              .filter(
                (msg) =>
                  msg.senderId !== currentUserId &&
                  !(msg.seenBy ?? []).includes(currentUserId)
              )
              .map(async (msg) => {
                await markMessageSeen(msg.$id, currentUserId);
                setMessages((prev) =>
                  prev.map((item) =>
                    item.$id === msg.$id
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
    const unsubscribe = subscribeConversationMessages(
      selectedConversationId,
      async (message) => {
        let added = false;
        setMessages((prev) => {
          if (prev.some((item) => item.$id === message.$id)) return prev;
          added = true;
          return [...prev, message].sort((a, b) =>
            a.$createdAt.localeCompare(b.$createdAt)
          );
        });
        if (message.senderId === currentUserId) {
          setPendingMessages((prev) =>
            prev.filter((p) => p.conversationId !== message.conversationId)
          );
        }
        if (message.senderId !== currentUserId) {
          if (added && !isOpen) onShowIncomingBanner();
          setConversations((prev) =>
            prev
              .map((conversation) => {
                if (conversation.$id !== selectedConversationId)
                  return conversation;
                const summary = summarizeMessage(
                  message.content,
                  message.attachments
                );
                return {
                  ...conversation,
                  lastMessage: summary,
                  lastMessageAt: message.$createdAt,
                };
              })
              .sort(
                (a, b) => conversationSortValue(b) - conversationSortValue(a)
              )
          );
          try {
            await markMessageSeen(message.$id, currentUserId);
            await markConversationRead(selectedConversationId, currentUserId);
            setConversations((prev) =>
              prev
                .map((conversation) => {
                  if (conversation.$id !== selectedConversationId)
                    return conversation;
                  const unreadBy = (conversation.unreadBy ?? []).filter(
                    (id) => id !== currentUserId
                  );
                  return { ...conversation, unreadBy };
                })
                .sort(
                  (a, b) => conversationSortValue(b) - conversationSortValue(a)
                )
            );
            setMessages((prev) =>
              prev.map((item) =>
                item.$id === message.$id
                  ? {
                      ...item,
                      seenBy: Array.from(
                        new Set([...(item.seenBy ?? []), currentUserId])
                      ),
                    }
                  : item
              )
            );
          } catch (error) {
            console.error("Không thể cập nhật trạng thái đọc:", error);
          }
        }
      }
    );
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [
    currentUserId,
    isOpen,
    selectedConversationId,
    summarizeMessage,
    onShowIncomingBanner,
  ]);

  useEffect(() => {
    if (!selectedConversationId) setMessages([]);
  }, [selectedConversationId]);

  useEffect(() => {
    if (!currentUserId) return;
    const unsubscribe = subscribeAllConversationMessages(async (message) => {
      if (message.senderId === currentUserId) return;
      const isCurrent =
        selectedConversationId &&
        message.conversationId === selectedConversationId;
      if (!isOpen && !isCurrent) onShowIncomingBanner();
      setConversations((prev) => {
        const exists = prev.some((c) => c.$id === message.conversationId);
        if (!exists) return prev;
        const summary = summarizeMessage(message.content, message.attachments);
        const next = prev.map((c) =>
          c.$id === message.conversationId
            ? { ...c, lastMessage: summary, lastMessageAt: message.$createdAt }
            : c
        );
        return next.sort(
          (a, b) => conversationSortValue(b) - conversationSortValue(a)
        );
      });
      if (!conversations.some((c) => c.$id === message.conversationId)) {
        const doc = await fetchConversationById(message.conversationId);
        if (doc && doc.participants.includes(currentUserId)) {
          upsertConversation(doc);
        }
      }
    });
    return () => {
      unsubscribe();
    };
  }, [
    conversations,
    currentUserId,
    isOpen,
    onShowIncomingBanner,
    selectedConversationId,
    summarizeMessage,
    upsertConversation,
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
      newlyCreatedConversationIdRef.current = conversation.$id ?? null;
      upsertConversation(conversation);
      setSelectedConversationId(conversation.$id);
      const others = (conversation.participants ?? []).filter(
        (id) => id !== currentUserId
      );
      if (others.length) void enrichProfiles(others);
      return conversation.$id ?? null;
    } catch (error) {
      console.error("Không thể khởi tạo cuộc hội thoại:", error);
      toast.error("Không thể khởi tạo cuộc hội thoại");
      return null;
    }
  }, [
    currentUserId,
    enrichProfiles,
    pendingConversation,
    upsertConversation,
  ]);

  const handleSendMessage = useCallback(
    async (content: string, attachments?: UploadedFileInfo[]) => {
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
        });
        setPendingMessages((prev) => prev.filter((p) => p.id !== pendingId));
        setMessages((prev) => {
          if (prev.some((item) => item.$id === message.$id)) return prev;
          return [...prev, message].sort((a, b) =>
            a.$createdAt.localeCompare(b.$createdAt)
          );
        });
        setConversations((prev) => {
          const summary = summarizeMessage(content, attachments);
          const updated = prev.map((conversation) => {
            if (conversation.$id !== conversationId) return conversation;
            const participants = conversation.participants ?? [];
            return {
              ...conversation,
              lastMessage: summary,
              lastMessageAt: message.$createdAt,
              unreadBy: participants.filter((id) => id !== currentUserId),
            };
          });
          return updated.sort(
            (a, b) => conversationSortValue(b) - conversationSortValue(a)
          );
        });
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
      conversations.filter(
        (conversation) => (conversation.type ?? "feedback") === "feedback"
      ),
    [conversations]
  );

  const feedbackConversations = useMemo(() => {
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
    if (!currentProject?.$id) return [] as ConversationDocument[];
    const projectKey = deriveProjectKey(currentProject.$id);
    const currentMemberIds = new Set(
      memberProfiles
        .map((profile) => profile.$id)
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
  }, [conversations, currentProject?.$id, currentUserId, memberProfiles]);

  const memberConversations = useMemo(() => {
    if (!currentUserId) return [] as ConversationListEntry[];
    const placeholders: ConversationListEntry[] = [];
    if (currentProject?.$id) {
      const memberIdsWithConversation = new Set(
        existingMemberConversations.flatMap(
          (conversation) => conversation.participants ?? []
        )
      );
      memberProfiles.forEach((profile) => {
        if (!profile.$id || profile.$id === currentUserId) return;
        if (memberIdsWithConversation.has(profile.$id)) return;
        placeholders.push(
          buildPlaceholderConversation(profile.$id, "member", currentProject.$id)
        );
      });
    }
    return [...existingMemberConversations, ...placeholders].sort(
      (a, b) => conversationSortValue(b) - conversationSortValue(a)
    );
  }, [
    buildPlaceholderConversation,
    currentProject?.$id,
    currentUserId,
    existingMemberConversations,
    memberProfiles,
  ]);

  useEffect(() => {
    if (!isOpen) return;
    if (!shouldForceFeedbackOnly) return;
    if (selectedConversationId) return;
    if (suppressAutoSelectRef.current) return;
    if (conversations.length === 0 && !adminLookupDone) return;
    if (
      !isAdmin &&
      hasProject &&
      memberProfiles.length === 0 &&
      !adminLookupDone
    )
      return;

    const conversation = existingFeedbackConversations[0];
    if (conversation) {
      setSelectedConversationId(conversation.$id);
      return;
    }

    if (adminLookupDone && conversations.length === 0 && !pendingConversation) {
      const placeholder = feedbackConversations.find(
        (item) => Boolean(item.__placeholderTargetId)
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
    shouldForceFeedbackOnly,
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
    adminLookupDone,
  };
};
