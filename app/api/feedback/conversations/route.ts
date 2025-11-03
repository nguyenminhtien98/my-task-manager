"use server";

import { NextResponse } from "next/server";
import { Permission, Role } from "node-appwrite";
import { getServerAppwriteClients } from "@/lib/serverAppwrite";

interface ConversationPayload {
  userIds: string[];
  createdBy: string;
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
    const partnerId =
      participantList.find((id) => id !== createdBy) ?? participantList[0];
    const unreadBy = participantList.filter((id) => id !== createdBy);

    const { databases, databaseId, conversationCollectionId } =
      getServerAppwriteClients();

    const payload = {
      participants: partnerId,
      createdBy,
      lastMessage: null,
      lastMessageAt: null,
      unreadBy,
    };

    const permissions = participantList.flatMap((id) => [
      Permission.read(Role.user(id)),
      Permission.update(Role.user(id)),
    ]);

    const doc = await databases.createDocument(
      databaseId,
      conversationCollectionId,
      "unique()",
      payload,
      permissions
    );

    return NextResponse.json(doc);
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
