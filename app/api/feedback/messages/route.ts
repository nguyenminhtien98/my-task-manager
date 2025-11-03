"use server";

import { NextResponse } from "next/server";
import { Permission, Role, Query } from "node-appwrite";
import { getServerAppwriteClients } from "@/lib/serverAppwrite";
import {
  enforceFeedbackRateLimit,
  FeedbackRateLimitError,
  FeedbackSuspendedError,
} from "@/lib/feedbackModeration";

interface AttachmentPayload {
  url: string;
  type?: "image" | "video" | "file";
  name?: string;
  size?: number;
  mimeType?: string;
}

interface MessagePayload {
  conversationId: string;
  senderId: string;
  content?: string;
  attachments?: AttachmentPayload[];
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as MessagePayload;
    const conversationId = payload?.conversationId;
    const senderId = payload?.senderId;
    const rawContent = payload?.content ?? "";
    const trimmedContent = rawContent.trim();

    const rawAttachments =
      payload && Array.isArray(payload.attachments) ? payload.attachments : [];

    const attachments: AttachmentPayload[] = [];
    for (const raw of rawAttachments) {
      if (!raw || typeof raw !== "object") continue;
      const url =
        typeof raw.url === "string" && raw.url.length > 0 ? raw.url : null;
      if (!url) continue;

      const type: AttachmentPayload["type"] =
        raw.type === "image" || raw.type === "video" || raw.type === "file"
          ? raw.type
          : "file";
      const name =
        typeof raw.name === "string" && raw.name.trim().length > 0
          ? raw.name
          : "Tệp đính kèm";
      const size =
        typeof raw.size === "number" && Number.isFinite(raw.size)
          ? raw.size
          : undefined;
      const mimeType =
        typeof raw.mimeType === "string"
          ? raw.mimeType
          : type === "image"
          ? "image/*"
          : type === "video"
          ? "video/*"
          : "application/octet-stream";

      attachments.push({ url, type, name, size, mimeType });
    }

    if (
      !conversationId ||
      !senderId ||
      (trimmedContent.length === 0 && attachments.length === 0)
    ) {
      return NextResponse.json(
        { error: "Thiếu dữ liệu tin nhắn" },
        { status: 400 }
      );
    }

    const messageSummary =
      trimmedContent.length > 0
        ? trimmedContent
        : attachments.length > 0
        ? attachments[0].type === "image"
          ? "Đã gửi một ảnh"
          : attachments[0].type === "video"
          ? "Đã gửi một video"
          : "Đã gửi một tệp"
        : "";

    const attachmentsForStorage = attachments.map((item) => {
      const type: "image" | "video" | "file" =
        item.type === "image" || item.type === "video" ? item.type : "file";
      const name =
        typeof item.name === "string" && item.name.trim().length > 0
          ? item.name.trim().slice(0, 120)
          : undefined;
      return {
        url: item.url,
        type,
        ...(name ? { name } : {}),
      };
    });

    let attachmentsJson: string | undefined;
    if (attachmentsForStorage.length > 0) {
      const MAX_LENGTH = 950;

      const serialize = (
        entries: Array<{
          url: string;
          type?: "image" | "video" | "file";
          name?: string;
        }>
      ) => JSON.stringify(entries);

      const candidates: Array<
        Array<{
          url: string;
          type?: "image" | "video" | "file";
          name?: string;
        }>
      > = [
        attachmentsForStorage,
        attachmentsForStorage.map(({ url, type }) => ({ url, type })),
        attachmentsForStorage.map(({ url }) => ({ url })),
      ];

      for (const variant of candidates) {
        const payloadString = serialize(variant);
        if (payloadString.length <= MAX_LENGTH) {
          attachmentsJson = payloadString;
          break;
        }
      }

      if (!attachmentsJson) {
        const first = attachmentsForStorage[0];
        attachmentsJson = serialize([{ url: first.url }]);
      }
    }

    const {
      databases,
      databaseId,
      conversationCollectionId,
      messageCollectionId,
      profileCollectionId,
      notificationsCollectionId,
      presenceCollectionId,
    } = getServerAppwriteClients();

    try {
      await enforceFeedbackRateLimit({
        databases,
        databaseId,
        presenceCollectionId,
        profileCollectionId,
        notificationsCollectionId,
        userId: senderId,
      });
    } catch (error) {
      if (error instanceof FeedbackSuspendedError) {
        return NextResponse.json({ error: error.message }, { status: 423 });
      }
      if (error instanceof FeedbackRateLimitError) {
        return NextResponse.json({ error: error.message }, { status: 429 });
      }
      throw error;
    }

    const conversation = await databases.getDocument(
      databaseId,
      conversationCollectionId,
      conversationId
    );

    const extractId = (value: unknown): string | null => {
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

    const participantSet = new Set<string>();
    const rawParticipants = (conversation as Record<string, unknown>)
      .participants;
    if (Array.isArray(rawParticipants)) {
      rawParticipants.forEach((entry) => {
        const id = extractId(entry);
        if (id) participantSet.add(id);
      });
    } else {
      const id = extractId(rawParticipants);
      if (id) participantSet.add(id);
    }

    if (
      Array.isArray((conversation as Record<string, unknown>).participantIds)
    ) {
      (
        (conversation as Record<string, unknown>).participantIds as unknown[]
      ).forEach((entry) => {
        const id = extractId(entry);
        if (id) participantSet.add(id);
      });
    }

    const createdById = extractId(
      (conversation as Record<string, unknown>).createdBy
    );
    if (createdById) participantSet.add(createdById);

    const participants = Array.from(participantSet);

    if (!participants.includes(senderId)) {
      return NextResponse.json(
        { error: "Người gửi không thuộc cuộc hội thoại" },
        { status: 403 }
      );
    }

    const recipientIds = participants.filter((id) => id !== senderId);
    const unreadBy = recipientIds;

    const permissions = participants.flatMap((id) => [
      Permission.read(Role.user(id)),
      Permission.update(Role.user(id)),
    ]);

    const documentData: Record<string, unknown> = {
      conversationId,
      senderId,
      content: trimmedContent,
      seenBy: senderId,
    };

    if (attachmentsJson) {
      documentData.attachments = attachmentsJson;
    }

    const created = await databases.createDocument(
      databaseId,
      messageCollectionId,
      "unique()",
      documentData,
      permissions
    );

    await databases.updateDocument(
      databaseId,
      conversationCollectionId,
      conversationId,
      {
        lastMessage: messageSummary,
        lastMessageAt: new Date().toISOString(),
        unreadBy,
      }
    );

    try {
      const profileResponse = await databases.listDocuments(
        databaseId,
        profileCollectionId,
        [Query.equal("$id", participants)]
      );

      const profileMap = new Map<string, Record<string, unknown>>();
      profileResponse.documents.forEach((doc) => {
        profileMap.set(doc.$id as string, doc as Record<string, unknown>);
      });

      const senderProfile = profileMap.get(senderId);
      const senderName =
        (senderProfile?.name as string | undefined) ?? "My Task Manager";

      const previewText = messageSummary;

      await Promise.all(
        participants
          .filter((id) => id !== senderId)
          .map(async (recipientId) => {
            const recipientProfile = profileMap.get(recipientId);
            const recipientRole = recipientProfile?.role as string | undefined;
            const isRecipientAdmin =
              recipientRole === "admin" || recipientRole === "leader";

            const type = isRecipientAdmin
              ? "feedback.message.fromUser"
              : "feedback.message.fromAdmin";

            const messageText = isRecipientAdmin
              ? `${senderName} vừa gửi tin nhắn feedback cho bạn.`
              : `${senderName} vừa trả lời tin nhắn feedback của bạn.`;

            const metadata = {
              actorName: senderName,
              recipientName:
                (recipientProfile?.name as string | undefined) ?? undefined,
              messagePreview: previewText.slice(0, 200),
            };

            await databases.createDocument(
              databaseId,
              notificationsCollectionId,
              "unique()",
              {
                type,
                scope: "system",
                status: "unread",
                recipient: recipientId,
                actor: senderId,
                message: messageText,
                metadata: JSON.stringify(metadata).slice(0, 5000),
              },
              [
                Permission.read(Role.user(recipientId)),
                Permission.update(Role.user(recipientId)),
              ]
            );
          })
      );
    } catch (error) {
      console.error("Không thể tạo thông báo cho tin nhắn feedback:", error);
    }

    return NextResponse.json(created);
  } catch (error) {
    console.error("Create feedback message API error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Không thể gửi tin nhắn",
      },
      { status: 500 }
    );
  }
}
