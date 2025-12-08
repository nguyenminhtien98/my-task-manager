import axiosInstance, {
  ApiResponse,
  handleApiError,
  tokenManager,
} from "@/lib/axios";
import type {
  Profile,
  AuthResponse,
  RegisterData,
  LoginData,
} from "../types/Types";

export const googleLogin = async (
  credential: string
): Promise<AuthResponse> => {
  try {
    const response = await axiosInstance.post<ApiResponse<AuthResponse>>(
      "/auth/google",
      { credential }
    );

    const data = response.data.data as unknown as Record<string, unknown>;

    if (!data) {
      throw new Error("No data returned from server");
    }

    const userObj = data.user as Record<string, unknown>;
    const token = data.token as string;

    if (!userObj || !token) {
      console.error("Invalid response structure:", data);
      throw new Error("Invalid response from server");
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

    tokenManager.setAccessToken(token);

    return { token, refreshToken: "", profile };
  } catch (error) {
    const apiError = handleApiError(error);
    throw new Error(apiError.message);
  }
};

export const register = async (data: RegisterData): Promise<void> => {
  try {
    await axiosInstance.post("/auth/register", data);
  } catch (error) {
    const apiError = handleApiError(error);
    throw new Error(apiError.message);
  }
};

export const login = async (data: LoginData): Promise<AuthResponse> => {
  try {
    const response = await axiosInstance.post<ApiResponse<AuthResponse>>(
      "/auth/login",
      data
    );

    const responseData = response.data.data as unknown as Record<
      string,
      unknown
    >;

    const userObj = (responseData.user || responseData) as Record<
      string,
      unknown
    >;
    const token = responseData.token as string;

    if (!userObj || !token) {
      console.error("Invalid login response:", responseData);
      throw new Error("Invalid response from server");
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

    tokenManager.setAccessToken(token);

    return { token, refreshToken: "", profile };
  } catch (error) {
    const apiError = handleApiError(error);
    throw new Error(apiError.message);
  }
};

export const logout = async (): Promise<void> => {
  try {
    await axiosInstance.post("/auth/logout");
  } catch (error) {
    console.error("Logout error:", error);
  } finally {
    tokenManager.clearAccessToken();
  }
};

export const refreshToken = async (): Promise<{ token: string }> => {
  try {
    const response = await axiosInstance.post<ApiResponse<{ token: string }>>(
      "/auth/refresh"
    );

    const { token } = response.data.data;
    tokenManager.setAccessToken(token);

    return { token };
  } catch (error) {
    throw error;
  }
};

export const isAuthenticated = (): boolean => {
  return !!tokenManager.getAccessToken();
};

export const clearAuth = (): void => {
  tokenManager.clearAccessToken();
};
