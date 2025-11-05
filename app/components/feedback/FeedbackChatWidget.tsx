"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useFeedbackChat } from "../../context/FeedbackChatContext";
import { useAuth } from "../../context/AuthContext";
import { useProject } from "../../context/ProjectContext";
import FeedbackChatBubble from "./FeedbackChatBubble";
import FeedbackConversationList from "./FeedbackConversationList";
import FeedbackConversationDetail from "./FeedbackConversationDetail";
import Button from "../common/Button";
import {
  ConversationType,
  ConversationDocument,
  ConversationMessageDocument,
  PresenceDocument,
  ProfileDocument,
  ensureConversationExists,
  fetchConversationMessages,
  fetchAdminProfileIds,
  ensureMemberConversation,
  fetchProfilesByIds,
  fetchProjectMemberProfiles,
  fetchUserConversations,
  fetchUserPresence,
  deriveProjectKey,
  markConversationRead,
  markMessageSeen,
  sendConversationMessage,
  subscribeConversationMessages,
  subscribeAllConversationMessages,
  subscribeConversations,
  subscribeUserPresence,
  fetchConversationById,
} from "../../services/feedbackService";
import type { UploadedFileInfo } from "../../utils/upload";
import toast from "react-hot-toast";

const ADMIN_ROLES = new Set(["leader", "admin"]);
const FALLBACK_ADMIN_ID =
  process.env.NEXT_PUBLIC_FEEDBACK_ADMIN_ID?.trim() ?? "";

type BubblePosition = {
  side: "left" | "right";
  offset: number;
};

type PendingMessageEntry = {
  id: string;
  conversationId: string;
  content: string;
  attachments?: UploadedFileInfo[];
};

const HEADER_BOTTOM_OFFSET = 120; // giới hạn kéo tối đa lên đến mép dưới header

const conversationSortValue = (conversation: ConversationDocument): number => {
  const fallback =
    conversation.lastMessageAt ??
    conversation.$updatedAt ??
    conversation.$createdAt ??
    "";
  const value = new Date(fallback).getTime();
  return Number.isNaN(value) ? 0 : value;
};

const getBubbleBounds = () => {
  if (typeof window === "undefined") {
    return { min: HEADER_BOTTOM_OFFSET, max: 400 };
  }
  const min = HEADER_BOTTOM_OFFSET;
  const max = Math.max(min, window.innerHeight - 64);
  return { min, max };
};

const getInitialBubblePosition = (): BubblePosition => {
  const { max } = getBubbleBounds();
  return { side: "right", offset: max };
};

const FeedbackChatWidget: React.FC = () => {
  const { isOpen, open, close } = useFeedbackChat();
  const { user } = useAuth();
  const { currentProject } = useProject();
  const panelRef = useRef<HTMLDivElement | null>(null);

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
  const [memberProfiles, setMemberProfiles] = useState<ProfileDocument[]>([]);
  const [adminIds, setAdminIds] = useState<string[]>([]);
  const [adminLookupDone, setAdminLookupDone] = useState<boolean>(
    Boolean(user?.role && ADMIN_ROLES.has(user.role))
  );
  const adminWarningShownRef = useRef(false);
  const initialTabSetRef = useRef(false);
  const [bubblePosition, setBubblePosition] = useState<BubblePosition>(
    getInitialBubblePosition
  );
  const ensuredMemberIdsRef = useRef<Set<string>>(new Set());
  const suppressAutoSelectRef = useRef(false);
  const [incomingBannerVisible, setIncomingBannerVisible] = useState(false);
  const incomingBannerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [pendingMessages, setPendingMessages] = useState<PendingMessageEntry[]>(
    []
  );
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const dragStateRef = useRef<{
    active: boolean;
    startY: number;
    startOffset: number;
    moved: boolean;
    preventClick: boolean;
  }>({
    active: false,
    startY: 0,
    startOffset: 0,
    moved: false,
    preventClick: false,
  });

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
    if (!isOpen) return;
    if (isAdmin) return;

    if (shouldForceFeedbackOnly) {
      if (conversationTab !== "feedback") {
        setConversationTab("feedback");
      }
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
      setIncomingBannerVisible(false);
      if (incomingBannerTimeoutRef.current) {
        clearTimeout(incomingBannerTimeoutRef.current);
        incomingBannerTimeoutRef.current = null;
      }
    }
  }, [isOpen]);

  useEffect(() => {
    initialTabSetRef.current = false;
  }, [hasProject, hasOtherMembers, isAdmin]);

  useEffect(() => {
    ensuredMemberIdsRef.current.clear();
  }, [currentProject?.$id]);

  useEffect(() => {
    if (selectedConversationId) {
      suppressAutoSelectRef.current = false;
    }
  }, [selectedConversationId]);

  useEffect(() => {
    return () => {
      if (incomingBannerTimeoutRef.current) {
        clearTimeout(incomingBannerTimeoutRef.current);
        incomingBannerTimeoutRef.current = null;
      }
    };
  }, []);

  const showIncomingBanner = useCallback(() => {
    if (incomingBannerTimeoutRef.current) {
      clearTimeout(incomingBannerTimeoutRef.current);
    }
    setIncomingBannerVisible(true);
    incomingBannerTimeoutRef.current = setTimeout(() => {
      setIncomingBannerVisible(false);
      incomingBannerTimeoutRef.current = null;
    }, 3000);
  }, []);

  const triggerIncomingBanner = useCallback(() => {
    if (isOpen) return;
    showIncomingBanner();
  }, [isOpen, showIncomingBanner]);

  const upsertConversation = useCallback(
    (conversation: ConversationDocument) => {
      let shouldShowBanner = false;
      const hasUnread =
        currentUserId && (conversation.unreadBy ?? []).includes(currentUserId);
      if (hasUnread && conversation.$id !== selectedConversationId) {
        shouldShowBanner = true;
      }
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
      if (shouldShowBanner) {
        triggerIncomingBanner();
      }
    },
    [currentUserId, selectedConversationId, triggerIncomingBanner]
  );

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

  const clampOffset = useCallback((value: number) => {
    const { min, max } = getBubbleBounds();
    return Math.min(Math.max(value, min), max);
  }, []);

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      const state = dragStateRef.current;
      if (!state.active) return;
      const delta = event.clientY - state.startY;
      if (Math.abs(delta) > 3) {
        state.moved = true;
      }
      const nextOffset = clampOffset(state.startOffset + delta);
      setBubblePosition((prev) =>
        prev.offset === nextOffset ? prev : { ...prev, offset: nextOffset }
      );
    },
    [clampOffset]
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent) => {
      const state = dragStateRef.current;
      if (!state.active) return;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      const delta = event.clientY - state.startY;
      const nextOffset = clampOffset(state.startOffset + delta);
      const side =
        typeof window !== "undefined" && event.clientX < window.innerWidth / 2
          ? "left"
          : "right";
      setBubblePosition({ side, offset: nextOffset });
      state.preventClick = state.moved || Math.abs(delta) > 3;
      state.active = false;
      state.moved = false;
    },
    [clampOffset, handlePointerMove]
  );

  const handleBubblePointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      dragStateRef.current.active = true;
      dragStateRef.current.startY = event.clientY;
      dragStateRef.current.startOffset = bubblePosition.offset;
      dragStateRef.current.moved = false;
      dragStateRef.current.preventClick = false;
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [bubblePosition.offset, handlePointerMove, handlePointerUp]
  );

  const handleBubbleClick = useCallback(() => {
    if (dragStateRef.current.preventClick) {
      dragStateRef.current.preventClick = false;
      return;
    }
    open();
  }, [open]);

  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  const enrichProfiles = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    try {
      const profiles = await fetchProfilesByIds(ids);
      setProfileMap((prev) => ({ ...prev, ...profiles }));
      await Promise.all(
        ids.map(async (id) => {
          const doc = await fetchUserPresence(id);
          setPresenceMap((prev) => ({ ...prev, [id]: doc }));
        })
      );
    } catch (error) {
      console.error("Không thể tải thông tin người dùng:", error);
    }
  }, []);

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
        if (!cancelled) {
          setMemberProfiles([]);
        }
      } finally {
        /* noop */
      }
    };
    void loadMembers();
    return () => {
      cancelled = true;
    };
  }, [currentProject?.$id, enrichProfiles]);

  useEffect(() => {
    if (!currentProject?.$id) return;
    if (!currentUserId) return;
    if (conversationTab !== "member") return;
    const projectKey = deriveProjectKey(currentProject.$id) ?? "0";
    const memberIds = memberProfiles
      .map((profile) => profile.$id)
      .filter(
        (memberId): memberId is string =>
          Boolean(memberId) &&
          memberId !== currentUserId &&
          !ensuredMemberIdsRef.current.has(`${projectKey}:${memberId}`)
      );
    if (!memberIds.length) return;
    let cancelled = false;
    const ensureAll = async () => {
      for (const memberId of memberIds) {
        if (cancelled) break;
        try {
          const conversation = await ensureMemberConversation(
            currentUserId,
            memberId,
            currentProject.$id
          );
          if (cancelled) break;
          ensuredMemberIdsRef.current.add(`${projectKey}:${memberId}`);
          upsertConversation(conversation);
          void enrichProfiles([memberId]);
        } catch (error) {
          console.error("Không thể khởi tạo đoạn chat thành viên:", error);
        }
      }
    };
    void ensureAll();
    return () => {
      cancelled = true;
    };
  }, [
    conversationTab,
    currentProject?.$id,
    currentUserId,
    enrichProfiles,
    memberProfiles,
    upsertConversation,
  ]);

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

      if (finalIds.length === 0 && FALLBACK_ADMIN_ID) {
        finalIds = [FALLBACK_ADMIN_ID];
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

  const loadConversations = useCallback(async () => {
    if (!currentUserId) return;
    if (!isAdmin && !adminLookupDone) return;
    try {
      const data = await fetchUserConversations(currentUserId);
      const sortedData = [...data].sort(
        (a, b) => conversationSortValue(b) - conversationSortValue(a)
      );
      setConversations(sortedData);
      const participantIds = sortedData
        .flatMap((conversation) => conversation.participants ?? [])
        .filter((id) => id !== currentUserId);
      void enrichProfiles(participantIds);
      if (!isAdmin) {
        return;
      }
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
    if (conversationTab !== convType) {
      setConversationTab(convType);
    }
  }, [conversationTab, selectedConversation]);

  useEffect(() => {
    if (isAdmin) return;
    if (!currentUserId) return;
    if (!adminLookupDone) return;
    if (!adminIds.length) return;

    const missingAdminIds = adminIds.filter(
      (adminId) =>
        !conversations.some(
          (conv) =>
            (conv.type ?? "feedback") === "feedback" &&
            conv.participants.includes(adminId) &&
            conv.participants.includes(currentUserId)
        )
    );
    if (!missingAdminIds.length) {
      return;
    }

    missingAdminIds.forEach(async (adminId) => {
      try {
        const conversation = await ensureConversationExists(
          currentUserId,
          adminId,
          { type: "feedback" }
        );
        upsertConversation(conversation);
        void enrichProfiles([adminId]);
      } catch (error) {
        console.error("Không thể khởi tạo đoạn chat feedback:", error);
      }
    });
  }, [
    adminIds,
    adminLookupDone,
    conversations,
    currentUserId,
    enrichProfiles,
    isAdmin,
    upsertConversation,
  ]);

  const otherParticipant = useMemo(() => {
    if (!selectedConversation) return null;
    const otherId = (selectedConversation.participants ?? []).find(
      (id) => id !== currentUserId
    );
    if (!otherId) return null;
    const profile = profileMap[otherId];
    return {
      id: otherId,
      name: profile?.name,
      avatarUrl: profile?.avatarUrl,
      role: profile?.role,
    };
  }, [currentUserId, profileMap, selectedConversation]);

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

  useEffect(() => {
    if (!isOpen || !selectedConversationId || !currentUserId) return;

    setMessages([]);
    setMessagesCursor(null);
    setIsLoadingMessages(true);

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
        if (!cancelled) {
          setIsLoadingMessages(false);
        }
      }
    };

    void loadMessages();

    const unsubscribe = subscribeConversationMessages(
      selectedConversationId,
      async (message) => {
        let added = false;
        setMessages((prev) => {
          if (prev.some((item) => item.$id === message.$id)) {
            return prev;
          }
          added = true;
          return [...prev, message].sort((a, b) =>
            a.$createdAt.localeCompare(b.$createdAt)
          );
        });
        if (message.senderId !== currentUserId) {
          if (added) {
            triggerIncomingBanner();
          }
          // update list preview for the current conversation immediately
          setConversations((prev) =>
            prev
              .map((conversation) => {
                if (conversation.$id !== selectedConversationId)
                  return conversation;
                const summary = buildMessageSummary(
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
  }, [currentUserId, isOpen, selectedConversationId, triggerIncomingBanner]);

  // moved below after buildMessageSummary

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
    }
  }, [selectedConversationId]);

  const buildMessageSummary = useCallback(
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
    if (!currentUserId) return;
    const unsubscribe = subscribeAllConversationMessages(async (message) => {
      if (message.senderId === currentUserId) return;
      const isCurrent =
        selectedConversationId &&
        message.conversationId === selectedConversationId;
      if (!isOpen && !isCurrent) {
        triggerIncomingBanner();
      }
      setConversations((prev) => {
        const exists = prev.some((c) => c.$id === message.conversationId);
        if (!exists) return prev;
        const summary = buildMessageSummary(
          message.content,
          message.attachments
        );
        const next = prev.map((c) =>
          c.$id === message.conversationId
            ? {
                ...c,
                lastMessage: summary,
                lastMessageAt: message.$createdAt,
              }
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
    buildMessageSummary,
    conversations,
    currentUserId,
    isOpen,
    selectedConversationId,
    triggerIncomingBanner,
    upsertConversation,
  ]);

  const resolveConversationId = useCallback(async (): Promise<
    string | null
  > => {
    if (selectedConversationId) return selectedConversationId;
    if (!currentUserId) return null;
    if (isAdmin) {
      toast.error("Vui lòng chọn một cuộc hội thoại");
      return null;
    }

    const targetAdminIds =
      adminIds.length > 0
        ? adminIds
        : FALLBACK_ADMIN_ID
        ? [FALLBACK_ADMIN_ID]
        : [];

    if (targetAdminIds.length === 0) {
      toast.error("Không tìm thấy người nhận phản hồi");
      return null;
    }

    try {
      const conversation = await ensureConversationExists(
        currentUserId,
        targetAdminIds[0]
      );

      setConversations((prev) => {
        const exists = prev.some((item) => item.$id === conversation.$id);
        const merged = exists
          ? prev.map((item) =>
              item.$id === conversation.$id ? conversation : item
            )
          : [...prev, conversation];

        return merged.sort(
          (a, b) => conversationSortValue(b) - conversationSortValue(a)
        );
      });

      setSelectedConversationId(conversation.$id);
      void enrichProfiles(
        (conversation.participants ?? []).filter((id) => id !== currentUserId)
      );

      return conversation.$id;
    } catch (error) {
      console.error("Không thể khởi tạo cuộc hội thoại:", error);
      toast.error("Không thể khởi tạo cuộc hội thoại");
      return null;
    }
  }, [
    adminIds,
    currentUserId,
    enrichProfiles,
    isAdmin,
    selectedConversationId,
  ]);

  const handleSendMessage = useCallback(
    async (content: string, attachments?: UploadedFileInfo[]) => {
      if (!currentUserId) return;
      setIsSending(true);
      try {
        let conversationId = selectedConversationId;
        if (!conversationId) {
          conversationId = await resolveConversationId();
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

        // remove only this pending skeleton immediately BEFORE adding real message
        setPendingMessages((prev) => prev.filter((p) => p.id !== pendingId));

        setMessages((prev) => {
          if (prev.some((item) => item.$id === message.$id)) {
            return prev;
          }
          return [...prev, message].sort((a, b) =>
            a.$createdAt.localeCompare(b.$createdAt)
          );
        });

        setConversations((prev) => {
          const summary = buildMessageSummary(content, attachments);
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
        // ensure no stray pending of this conversation remain
        setPendingMessages((prev) =>
          prev.filter((p) => p.conversationId !== conversationId)
        );
      } catch (error) {
        console.error("Không thể gửi tin nhắn:", error);
        // remove pending skeleton on error as well
        setPendingMessages((prev) =>
          prev.filter(
            (p) => !p.id.startsWith(`${selectedConversationId ?? ""}:`)
          )
        );
        if (error instanceof Error && error.message) {
          toast.error(error.message);
        } else {
          toast.error("Không thể gửi tin nhắn");
        }
      } finally {
        setIsSending(false);
      }
    },
    [
      buildMessageSummary,
      currentUserId,
      resolveConversationId,
      selectedConversationId,
    ]
  );

  const feedbackConversations = useMemo(
    () =>
      conversations.filter(
        (conversation) => (conversation.type ?? "feedback") === "feedback"
      ),
    [conversations]
  );

  useEffect(() => {
    if (!isOpen) return;
    if (!shouldForceFeedbackOnly) return;
    if (selectedConversationId) return;

    const conversation = feedbackConversations[0];
    if (conversation) {
      setSelectedConversationId(conversation.$id);
      return;
    }

    if (adminLookupDone) {
      void resolveConversationId();
    }
  }, [
    adminLookupDone,
    feedbackConversations,
    isOpen,
    resolveConversationId,
    selectedConversationId,
    shouldForceFeedbackOnly,
  ]);

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

  const memberConversations = useMemo(() => {
    if (!currentProject?.$id) return [] as ConversationDocument[];
    const projectKey = deriveProjectKey(currentProject.$id);
    return conversations
      .filter(
        (conversation) =>
          (conversation.type ?? "feedback") === "member" &&
          conversation.projectId === projectKey
      )
      .sort((a, b) => conversationSortValue(b) - conversationSortValue(a));
  }, [conversations, currentProject?.$id]);

  const showListView = !shouldForceFeedbackOnly && !selectedConversationId;

  useEffect(() => {
    if (!isOpen) {
      setSelectedConversationId(null);
      suppressAutoSelectRef.current = false;
    }
  }, [isOpen]);

  const bubbleStyle = useMemo(() => {
    const offset = clampOffset(bubblePosition.offset);
    const style: CSSProperties = {
      position: "fixed",
      top: offset,
      zIndex: 40,
    };
    if (bubblePosition.side === "left") {
      style.left = "24px";
    } else {
      style.right = "24px";
    }
    return style;
  }, [bubblePosition, clampOffset]);
  const allowBackNavigation = isAdmin || !shouldForceFeedbackOnly;
  const handleBackToList = useCallback(() => {
    suppressAutoSelectRef.current = true;
    setSelectedConversationId(null);
    if (!isAdmin && !shouldForceFeedbackOnly) {
      setConversationTab("member");
    }
  }, [isAdmin, shouldForceFeedbackOnly]);
  const handleTabChange = useCallback(
    (nextTab: ConversationType) => {
      if (conversationTab === nextTab) return;
      suppressAutoSelectRef.current = false;

      if (nextTab === "member") {
        setConversationTab("member");
        setSelectedConversationId(null);
        return;
      }

      setConversationTab("feedback");
      if (isAdmin || shouldForceFeedbackOnly) {
        return;
      }
      const existing = feedbackConversations[0];
      if (existing) {
        setSelectedConversationId(existing.$id);
        return;
      }
      void resolveConversationId();
    },
    [
      conversationTab,
      feedbackConversations,
      isAdmin,
      resolveConversationId,
      shouldForceFeedbackOnly,
    ]
  );

  return (
    <>
      {!isOpen && (
        <div style={bubbleStyle} className="fixed z-40">
          <div className="relative">
            <div
              className={`pointer-events-none absolute ${
                bubblePosition.side === "left"
                  ? "left-full ml-3"
                  : "right-full mr-3"
              } top-1/2 -translate-y-1/2 transition-opacity duration-300 ${
                incomingBannerVisible ? "opacity-100" : "opacity-0"
              }`}
            >
              <div className="relative">
                <div className="rounded-lg bg-black px-4 py-2 text-xs font-medium text-white shadow-lg sm:text-sm">
                  Bạn vừa nhận được tin nhắn mới
                </div>
                <span
                  className={`absolute top-1/2 h-0 w-0 -translate-y-1/2 border-y-6 border-y-transparent ${
                    bubblePosition.side === "left"
                      ? "left-[-8px] border-r-8 border-r-black"
                      : "right-[-8px] border-l-8 border-l-black"
                  }`}
                />
              </div>
            </div>

            <FeedbackChatBubble
              onClick={handleBubbleClick}
              onPointerDown={handleBubblePointerDown}
            />
          </div>
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            onClick={close}
            aria-label="Đóng hộp thoại phản hồi"
            className="absolute inset-0 cursor-default bg-transparent"
          />
          <div
            className={`absolute bottom-6 ${
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
                  <div className="rounded-lg bg-black px-4 py-2 text-xs font-medium text-white shadow-lg sm:text-sm">
                    Bạn vừa nhận được tin nhắn mới
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
                    onSelectConversation={(id) => {
                      const conversation = conversations.find(
                        (conv) => conv.$id === id
                      );
                      if (!conversation) return;
                      suppressAutoSelectRef.current = false;
                      setConversationTab(conversation.type ?? "feedback");
                      setSelectedConversationId(id);
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
                    isSending={isSending}
                    otherProfile={otherParticipant}
                    onBack={allowBackNavigation ? handleBackToList : undefined}
                    presence={presence}
                    isAdminView={
                      isAdmin &&
                      (selectedConversation?.type ?? "feedback") === "feedback"
                    }
                    conversationType={selectedConversation?.type ?? "feedback"}
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
