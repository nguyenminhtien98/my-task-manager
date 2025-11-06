"use server";

import { NextResponse } from "next/server";
import { Permission, Role, AppwriteException } from "node-appwrite";
import { getServerAppwriteClients } from "@/lib/serverAppwrite";
import { createHash } from "crypto";

interface ConversationPayload {
  userIds: string[];
  createdBy: string;
  type?: "feedback" | "member";
  projectId?: string | null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ConversationPayload;
    const participants = Array.isArray(body?.userIds)
      ? Array.from(new Set(body.userIds.filter(Boolean)))
      : [];
    const createdBy = body?.createdBy;

    if (participants.length < 2 || !createdBy) {
      return NextResponse.json(
        { error: "Thiếu tham số userIds/createdBy" },
        { status: 400 }
      );
    }

    const participantSet = new Set<string>(participants);
    participantSet.add(createdBy);
    const participantList = Array.from(participantSet);
    const sortedParticipants = [...participantList].sort();
    const partnerId =
      participantList.find((id) => id !== createdBy) ?? participantList[0];
    const unreadBy = participantList.filter((id) => id !== createdBy);
    const conversationKey = `${sortedParticipants.join("|")}::${
      body.type ?? "feedback"
    }::${body.projectId ?? ""}`;
    const docId = createHash("sha256")
      .update(conversationKey)
      .digest("hex")
      .slice(0, 36);

    const { databases, databaseId, conversationCollectionId } =
      getServerAppwriteClients();

    const payload = {
      participants: partnerId,
      createdBy,
      lastMessage: null,
      lastMessageAt: null,
      unreadBy,
      type: body.type ?? "feedback",
      projectId: body.projectId ?? null,
    };

    const permissions = participantList.flatMap((id) => [
      Permission.read(Role.user(id)),
      Permission.update(Role.user(id)),
    ]);

    try {
      const doc = await databases.createDocument(
        databaseId,
        conversationCollectionId,
        docId,
        payload,
        permissions
      );
      return NextResponse.json(doc);
    } catch (error) {
      if (error instanceof AppwriteException && error.code === 409) {
        const existing = await databases.getDocument(
          databaseId,
          conversationCollectionId,
          docId
        );
        return NextResponse.json(existing);
      }
      throw error;
    }

  } catch (error) {
    console.error("Create feedback conversation API error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể tạo cuộc hội thoại",
      },
      { status: 500 }
    );
  }
}
