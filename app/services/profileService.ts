import axiosInstance, { ApiResponse, handleApiError } from "@/lib/axios";
import type { Profile, UpdateProfileData } from "../types/Types";

export const getMe = async (): Promise<Profile> => {
  try {
    const response = await axiosInstance.get<
      ApiResponse<Record<string, unknown>>
    >("/auth/me");

    const userObj = response.data.data as Record<string, unknown>;

    if (!userObj) {
      throw new Error("No user data returned from /auth/me");
    }

    const profile: Profile = {
      _id: (userObj.id || userObj.profileId || userObj._id) as string,
      userId: (userObj.id || userObj.userId || userObj._id) as string,
      name: userObj.name as string,
      email: userObj.email as string,
      avatarUrl: (userObj.avatarUrl || userObj.avatar || "") as string,
      role: (userObj.role || "user") as "user" | "admin" | "moderator",
      createdAt: userObj.createdAt as string | undefined,
    };

    return profile;
  } catch (error) {
    console.error("getMe error:", error);
    const apiError = handleApiError(error);
    throw new Error(apiError.message);
  }
};

export const updateProfile = async (
  data: UpdateProfileData
): Promise<Profile> => {
  try {
    const currentProfile = await getMe();

    if (!currentProfile._id) {
      throw new Error("Cannot get user ID for update");
    }
    const response = await axiosInstance.put<
      ApiResponse<Record<string, unknown>>
    >(`/profiles/${currentProfile._id}`, data);

    const userObj = response.data.data as Record<string, unknown>;

    const profile: Profile = {
      _id: (userObj.id || userObj.profileId || userObj._id) as string,
      userId: (userObj.id || userObj.userId || userObj._id) as string,
      name: userObj.name as string,
      email: userObj.email as string,
      avatarUrl: (userObj.avatarUrl || userObj.avatar || "") as string,
      role: (userObj.role || "user") as "user" | "admin" | "moderator",
      createdAt: userObj.createdAt as string | undefined,
    };

    return profile;
  } catch (error) {
    const apiError = handleApiError(error);
    throw new Error(apiError.message);
  }
};
