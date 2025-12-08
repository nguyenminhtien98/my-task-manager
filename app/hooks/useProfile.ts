"use client";

import { useCallback, useState } from "react";
import { useAuth, type User } from "../context/AuthContext";
import { uploadSingleFile } from "../utils/upload";
import * as profileService from "../services/profileService";
import type { UpdateProfileData } from "../types/Types";

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

      setIsUpdating(true);
      try {
        let newAvatarUrl: string | undefined;

        if (avatarHasChanged && avatarFile) {
          const uploaded = await uploadSingleFile(avatarFile, "avatars");
          newAvatarUrl = uploaded.url;
        }

        const updateData: UpdateProfileData = {};
        if (nameHasChanged && trimmedName) {
          updateData.name = trimmedName;
        }
        if (newAvatarUrl) {
          updateData.avatarUrl = newAvatarUrl;
        }

        if (Object.keys(updateData).length === 0) {
          return { success: true, message: "Không có gì thay đổi." };
        }

        const updatedProfile = await profileService.updateProfile(updateData);

        const updatedUser: User = {
          ...user,
          name: updatedProfile.name,
          avatarUrl: updatedProfile.avatarUrl,
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

  return {
    isUpdating,
    updateProfile,
  };
};

export type UseProfileResult = ReturnType<typeof useProfile>;
