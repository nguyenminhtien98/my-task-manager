"use client";

import { useCallback, useEffect, useState } from "react";
import { Query } from "appwrite";
import { database, subscribeToRealtime } from "../../lib/appwrite";
import { useAuth, type User } from "../context/AuthContext";
import { uploadFilesToCloudinary } from "../utils/upload";
import { createNotification } from "../services/notificationService";

interface UpdateProfileOptions {
  name?: string;
  avatarFile?: File | null;
}

interface UpdateProfileResult {
  success: boolean;
  message: string;
}

export const useProfile = () => {
  const { user, setUser } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  const updateProfile = useCallback(
    async ({
      name,
      avatarFile,
    }: UpdateProfileOptions): Promise<UpdateProfileResult> => {
      if (!user) {
        return { success: false, message: "Chưa đăng nhập" };
      }

      const trimmedName = typeof name === "string" ? name.trim() : undefined;
      const nameHasChanged =
        trimmedName !== undefined && trimmedName.length > 0
          ? trimmedName !== user.name
          : false;
      const avatarHasChanged = avatarFile instanceof File;

      if (!nameHasChanged && !avatarHasChanged) {
        return { success: true, message: "Không có gì thay đổi." };
      }

      const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID;
      const profileCollectionId = process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE;

      if (!databaseId || !profileCollectionId) {
        return {
          success: false,
          message: "Thiếu cấu hình Appwrite.",
        };
      }

      setIsUpdating(true);
      try {
        let newAvatarUrl: string | undefined;

        if (nameHasChanged && trimmedName) {
          const existing = await database.listDocuments(
            String(databaseId),
            String(profileCollectionId),
            [Query.equal("name", trimmedName), Query.limit(1)]
          );

          const conflict = existing.documents.some((doc) => {
            const documentId =
              typeof doc.$id === "string"
                ? doc.$id
                : (doc as { $id?: string }).$id;
            return documentId && documentId !== user.id;
          });

          if (conflict) {
            return {
              success: false,
              message: "Tên này đã tồn tại trong hệ thống.",
            };
          }
        }

        if (avatarHasChanged && avatarFile) {
          const uploaded = await uploadFilesToCloudinary([avatarFile]);
          if (uploaded.length > 0 && uploaded[0].url) {
            newAvatarUrl = uploaded[0].url;
          } else {
            return {
              success: false,
              message: "Upload ảnh thất bại.",
            };
          }
        }

        const updateData: { name?: string; avatarUrl?: string } = {};
        if (nameHasChanged && trimmedName) {
          updateData.name = trimmedName;
        }
        if (newAvatarUrl) {
          updateData.avatarUrl = newAvatarUrl;
        }

        if (Object.keys(updateData).length === 0) {
          return { success: true, message: "Không có gì thay đổi." };
        }

        await database.updateDocument(
          String(databaseId),
          String(profileCollectionId),
          user.id,
          updateData
        );

        const notificationPromises: Promise<unknown>[] = [];
        if (nameHasChanged && trimmedName) {
          notificationPromises.push(
            createNotification({
              recipientId: user.id,
              actorId: user.id,
              type: "profile.name.updated",
              scope: "profile",
              metadata: {
                newValue: trimmedName,
              },
            })
          );
        }
        if (newAvatarUrl) {
          notificationPromises.push(
            createNotification({
              recipientId: user.id,
              actorId: user.id,
              type: "profile.avatar.updated",
              scope: "profile",
            })
          );
        }
        if (notificationPromises.length > 0) {
          await Promise.allSettled(notificationPromises);
        }

        const updatedUser: User = {
          ...user,
          ...updateData,
        };
        setUser(updatedUser);

        return { success: true, message: "Cập nhật hồ sơ thành công!" };
      } catch (error: unknown) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : "Cập nhật hồ sơ thất bại.";
        console.error("Failed to update profile:", error);
        return { success: false, message };
      } finally {
        setIsUpdating(false);
      }
    },
    [setUser, user]
  );

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;

    const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID;
    const profileCollectionId = process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE;

    if (!databaseId || !profileCollectionId) {
      return;
    }

    const channel = `databases.${databaseId}.collections.${profileCollectionId}.documents`;

    const unsubscribe = subscribeToRealtime([channel], (res: unknown) => {
      const payload = res as {
        events?: string[];
        payload?: { $id?: string; data?: unknown };
      };

      const events = payload?.events ?? [];
      if (!events.length) return;

      const documentId = payload?.payload?.$id;
      if (!documentId || documentId !== userId) {
        return;
      }

      if (events.some((event) => event.endsWith(".update"))) {
        const rawData =
          (payload?.payload?.data as Record<string, unknown> | undefined) ??
          (payload?.payload as Record<string, unknown> | undefined);

        if (!rawData) return;

        if (!user) return;

        const next: User = {
          ...user,
          name: typeof rawData.name === "string" ? rawData.name : user.name,
          avatarUrl:
            typeof rawData.avatarUrl === "string"
              ? rawData.avatarUrl
              : user.avatarUrl,
          email: typeof rawData.email === "string" ? rawData.email : user.email,
          role: typeof rawData.role === "string" ? rawData.role : user.role,
        };

        setUser(next);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [setUser, user]);

  return {
    isUpdating,
    updateProfile,
  };
};

export type UseProfileResult = ReturnType<typeof useProfile>;
