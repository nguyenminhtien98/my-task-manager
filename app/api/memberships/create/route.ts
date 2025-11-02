import { NextResponse } from "next/server";
import { Client, Databases, Permission, Role } from "node-appwrite";

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
    const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID;
    const membershipsCollectionId =
      process.env.NEXT_PUBLIC_COLLECTION_ID_PROJECT_MEMBERSHIPS;

    if (!databaseId || !membershipsCollectionId) {
      return NextResponse.json(
        { error: "Thiếu cấu hình Appwrite" },
        { status: 400 }
      );
    }

    const body = (await request.json()) as {
      projectId: string;
      userId: string;
      joinedAt: string;
    };

    if (!body.projectId || !body.userId) {
      return NextResponse.json(
        { error: "Thiếu projectId hoặc userId" },
        { status: 400 }
      );
    }

    const doc = await databases.createDocument(
      databaseId,
      membershipsCollectionId,
      "unique()",
      {
        project: body.projectId,
        user: body.userId,
        joinedAt: body.joinedAt,
      },
      [
        Permission.read(Role.user(body.userId)),
        Permission.update(Role.user(body.userId)),
        Permission.delete(Role.user(body.userId)),
      ]
    );

    return NextResponse.json({ document: doc });
  } catch (error) {
    console.error("Create membership API error:", error);
    const message =
      error instanceof Error ? error.message : "Không thể tạo membership";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
