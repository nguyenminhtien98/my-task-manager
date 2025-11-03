"use server";

import { NextResponse } from "next/server";
import { Client, Databases, Permission, Role } from "node-appwrite";

interface ConversationPayload {
  userIds: string[];
  createdBy: string;
}

const getClient = () => {
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_URL;
  const projectId = process.env.NEXT_PUBLIC_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY;
  const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID;
  const conversationCollectionId =
    process.env.NEXT_PUBLIC_COLLECTION_ID_CONVERSATIONS;

  if (
    !endpoint ||
    !projectId ||
    !apiKey ||
    !databaseId ||
    !conversationCollectionId
  ) {
    throw new Error("Thiếu cấu hình Appwrite cho feedback conversations");
  }

  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const databases = new Databases(client);

  return {
    databases,
    databaseId,
    conversationCollectionId,
  };
};

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

    const { databases, databaseId, conversationCollectionId } = getClient();

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
