import { NextResponse } from "next/server";
import { Client, Databases } from "node-appwrite";

const getIds = () => {
  const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID;
  const collectionId = process.env.NEXT_PUBLIC_COLLECTION_ID_NOTIFICATIONS;
  if (!databaseId || !collectionId) {
    throw new Error("Thiếu cấu hình Appwrite cho thông báo");
  }
  return { databaseId, collectionId };
};

const getServerDatabases = () => {
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_URL;
  const projectId = process.env.NEXT_PUBLIC_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY;
  if (!endpoint || !projectId || !apiKey) {
    throw new Error("Thiếu cấu hình Appwrite API key");
  }
  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);
  return new Databases(client);
};

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const databases = getServerDatabases();
    const { databaseId, collectionId } = getIds();
    const body = (await request.json()) as {
      payload: Record<string, unknown>;
      permissions?: string[];
    };

    if (!body || typeof body !== "object" || !body.payload) {
      return NextResponse.json(
        { error: "Thiếu payload" },
        { status: 400 }
      );
    }

    const doc = await databases.createDocument(
      databaseId,
      collectionId,
      "unique()",
      body.payload,
      body.permissions ?? []
    );

    return NextResponse.json({ document: doc });
  } catch (error) {
    console.error("Create notification API error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Không thể tạo thông báo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
