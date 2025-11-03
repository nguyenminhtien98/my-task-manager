import { Client, Databases } from "node-appwrite";

export interface ServerAppwriteClients {
  databases: Databases;
  databaseId: string;
  conversationCollectionId: string;
  messageCollectionId: string;
  profileCollectionId: string;
  notificationsCollectionId: string;
  presenceCollectionId: string;
}

export const getServerAppwriteClients = (): ServerAppwriteClients => {
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_URL;
  const projectId = process.env.NEXT_PUBLIC_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY;
  const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID;
  const conversationCollectionId =
    process.env.NEXT_PUBLIC_COLLECTION_ID_CONVERSATIONS;
  const messageCollectionId =
    process.env.NEXT_PUBLIC_COLLECTION_ID_CONVERSATION_MESSAGES;
  const profileCollectionId =
    process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE;
  const notificationsCollectionId =
    process.env.NEXT_PUBLIC_COLLECTION_ID_NOTIFICATIONS;
  const presenceCollectionId =
    process.env.NEXT_PUBLIC_COLLECTION_ID_USER_PRESENCE;

  if (
    !endpoint ||
    !projectId ||
    !apiKey ||
    !databaseId ||
    !conversationCollectionId ||
    !messageCollectionId ||
    !profileCollectionId ||
    !notificationsCollectionId ||
    !presenceCollectionId
  ) {
    throw new Error("Thiếu cấu hình Appwrite cho máy chủ");
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
    messageCollectionId,
    profileCollectionId,
    notificationsCollectionId,
    presenceCollectionId,
  };
};
