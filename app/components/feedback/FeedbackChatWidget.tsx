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
import FeedbackChatBubble from "./FeedbackChatBubble";
import FeedbackConversationList from "./FeedbackConversationList";
import FeedbackConversationDetail from "./FeedbackConversationDetail";
import {
  ConversationDocument,
  ConversationMessageDocument,
  PresenceDocument,
  ProfileDocument,
  ensureConversationExists,
  fetchConversationMessages,
  fetchAdminProfileIds,
  fetchProfilesByIds,
  fetchUserConversations,
  fetchUserPresence,
  markConversationRead,
  markMessageSeen,
  sendConversationMessage,
  subscribeConversationMessages,
  subscribeConversations,
  subscribeUserPresence,
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
  const panelRef = useRef<HTMLDivElement | null>(null);

  const [conversations, setConversations] = useState<ConversationDocument[]>([]);
  const [messages, setMessages] = useState<ConversationMessageDocument[]>([]);
  const [, setMessagesCursor] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [profileMap, setProfileMap] =
    useState<Record<string, ProfileDocument | undefined>>({});
  const [presence, setPresence] = useState<PresenceDocument | null>(null);
  const [presenceMap, setPresenceMap] = useState<Record<string, PresenceDocument | null>>({});
  const [adminIds, setAdminIds] = useState<string[]>([]);
  const [adminLookupDone, setAdminLookupDone] = useState<boolean>(Boolean(user?.role && ADMIN_ROLES.has(user.role)));
  const adminWarningShownRef = useRef(false);
  const [bubblePosition, setBubblePosition] = useState<BubblePosition>(
    getInitialBubblePosition
  );
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

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        target.closest('[data-feedback-media-modal="true"]')
      ) {
        return;
      }
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
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
        if (!selectedConversationId && sortedData.length > 0) {
          setSelectedConversationId(sortedData[0].$id);
        }
        return;
      }
      if (
        selectedConversationId &&
        !data.some((conversation) => conversation.$id === selectedConversationId)
      ) {
        setSelectedConversationId(null);
      }
    } catch (error) {
      console.error("Không thể tải đoạn chat:", error);
      toast.error("Không thể tải danh sách đoạn chat");
    }
  }, [adminLookupDone, currentUserId, enrichProfiles, isAdmin, selectedConversationId]);

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

  // ✅ FIX 1: Remove isOpen from dependency - subscription luôn active
  useEffect(() => {
    if (!currentUserId) return;

    console.log('🔌 Starting conversation subscription for:', currentUserId);

    const unsubscribe = subscribeConversations(currentUserId, (conversation) => {
      console.log('📨 Realtime conversation update:', {
        id: conversation.$id,
        unreadBy: conversation.unreadBy,
        lastMessage: conversation.lastMessage?.slice(0, 30),
      });

      setConversations((prev) => {
        const index = prev.findIndex((item) => item.$id === conversation.$id);
        const next = index >= 0 ? [...prev] : [...prev, conversation];
        if (index >= 0) {
          next[index] = conversation;
        }
        const sorted = [...next].sort(
          (a, b) => conversationSortValue(b) - conversationSortValue(a)
        );

        console.log(
          "📊 Updated conversations:",
          sorted.map((c) => ({
            id: c.$id,
            unreadBy: c.unreadBy,
          }))
        );

        return sorted;
      });

      const otherIds = conversation.participants.filter((id) => id !== currentUserId);
      void enrichProfiles(otherIds);
    });

    return () => {
      console.log('🔌 Unsubscribing conversation subscription');
      unsubscribe();
    };
  }, [currentUserId, enrichProfiles]); // ❌ KHÔNG có isOpen

  const selectedConversation = useMemo(() => {
    if (!selectedConversationId) return null;
    return conversations.find((conversation) => conversation.$id === selectedConversationId) ?? null;
  }, [conversations, selectedConversationId]);

  const otherParticipant = useMemo(() => {
    if (!selectedConversation) return null;
    const otherId = (selectedConversation.participants ?? []).find((id) => id !== currentUserId);
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

  // ✅ FIX 2: Delay markConversationRead để subscription kết nối xong
  useEffect(() => {
    if (!isOpen || !selectedConversationId || !currentUserId) return;

    console.log('🔓 Opening conversation:', {
      conversationId: selectedConversationId,
      currentUserId,
    });

    setMessages([]);
    setMessagesCursor(null);

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

          // ✅ DELAY markConversationRead 500ms để user thấy badge
          setTimeout(() => {
            if (!cancelled) {
              console.log('📖 Marking conversation as read after delay');
              void markConversationRead(selectedConversationId, currentUserId);
              setConversations((prev) =>
                prev.map((conversation) => {
                  if (conversation.$id !== selectedConversationId) return conversation;
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
      }
    };

    void loadMessages();

    const unsubscribe = subscribeConversationMessages(
      selectedConversationId,
      async (message) => {
        setMessages((prev) => {
          if (prev.some((item) => item.$id === message.$id)) {
            return prev;
          }
          return [...prev, message].sort((a, b) =>
            a.$createdAt.localeCompare(b.$createdAt)
          );
        });
        if (message.senderId !== currentUserId) {
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
                  (a, b) =>
                    conversationSortValue(b) - conversationSortValue(a)
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
  }, [currentUserId, isOpen, selectedConversationId]);

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
  }, []);

  const resolveConversationId = useCallback(async (): Promise<string | null> => {
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

        const message = await sendConversationMessage({
          conversationId,
          senderId: currentUserId,
          content,
          attachments,
        });

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
      } catch (error) {
        console.error("Không thể gửi tin nhắn:", error);
        toast.error("Không thể gửi tin nhắn");
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

  const filteredConversations = useMemo(() => {
    if (!isAdmin) return conversations;

    let dataset = conversations.filter((conversation) =>
      Boolean(conversation.lastMessage)
    );

    if (filter === "unread") {
      dataset = dataset.filter((conversation) =>
        (conversation.unreadBy ?? []).includes(currentUserId)
      );
    }

    return dataset;
  }, [conversations, currentUserId, filter, isAdmin]);

  const showListView = isAdmin && !selectedConversationId;

  useEffect(() => {
    if (!isOpen && isAdmin) {
      setSelectedConversationId(null);
    }
  }, [isAdmin, isOpen]);

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

  return (
    <>
      {!isOpen && (
        <FeedbackChatBubble
          onClick={handleBubbleClick}
          onPointerDown={handleBubblePointerDown}
          style={bubbleStyle}
        />
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
            ref={panelRef}
            className={`absolute bottom-6 ${
              bubblePosition.side === "left" ? "left-6" : "right-6"
            }`}
          >
            {showListView ? (
              <FeedbackConversationList
                conversations={filteredConversations}
                profileMap={profileMap}
                presenceMap={presenceMap}
                currentUserId={currentUserId}
                selectedConversationId={selectedConversationId}
                onSelectConversation={(id) => setSelectedConversationId(id)}
                filter={filter}
                onFilterChange={setFilter}
                onClose={close}
              />
            ) : (
              <FeedbackConversationDetail
                conversationId={selectedConversationId}
                currentUserId={currentUserId}
                messages={messages}
                onSendMessage={handleSendMessage}
                isSending={isSending}
                otherProfile={otherParticipant}
                onBack={isAdmin ? () => setSelectedConversationId(null) : undefined}
                presence={presence}
                isAdminView={isAdmin}
                onClose={close}
                isOpen={isOpen}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default FeedbackChatWidget;
