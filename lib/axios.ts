import axios, {
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";

const BASE_URL = "/api";

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

let accessToken: string | null = null;

export const tokenManager = {
  getAccessToken: (): string | null => {
    return accessToken;
  },

  setAccessToken: (token: string): void => {
    accessToken = token;
  },

  clearAccessToken: (): void => {
    accessToken = null;
  },
};

axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenManager.getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

export interface ModerationRateLimitEvent {
  type: "rateLimit";
  feature: "chat" | "comment";
  strikeCount: number;
  cooldownMinutes: number;
  message: string;
}

export interface ModerationSuspendedEvent {
  type: "suspended";
  message: string;
}

export type ModerationEvent =
  | ModerationRateLimitEvent
  | ModerationSuspendedEvent;

const dispatchModerationEvent = (event: ModerationEvent) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("moderation", { detail: event }));
  }
};

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (originalRequest.url?.includes("/auth/refresh")) {
      return Promise.reject(error);
    }

    if (!error.response) {
      if (typeof window !== "undefined") {
        const currentPath = window.location.pathname;
        if (!currentPath.startsWith("/server-error")) {
          window.dispatchEvent(
            new CustomEvent("server-error", {
              detail: { returnPath: currentPath },
            })
          );
        }
      }
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return axiosInstance(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await fetch(`${BASE_URL}/auth/refresh`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Refresh failed: ${response.status}`);
        }

        const data = await response.json();
        const { token } = data.data;

        tokenManager.setAccessToken(token);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${token}`;
        }

        processQueue(null, token);

        return axiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error, null);
        tokenManager.clearAccessToken();

        if (typeof window !== "undefined") {
          const currentPath = window.location.pathname;
          const isAuthPage =
            currentPath === "/" || currentPath.startsWith("/auth");

          if (!isAuthPage) {
            window.dispatchEvent(new Event("open-main-layout-login-modal"));
          }
        }

        return Promise.reject(new Error("Authentication required"));
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.status && error.response.status >= 500) {
      if (typeof window !== "undefined") {
        const currentPath = window.location.pathname;
        if (!currentPath.startsWith("/server-error")) {
          window.dispatchEvent(
            new CustomEvent("server-error", {
              detail: { returnPath: currentPath },
            })
          );
        }
      }
      return Promise.reject(error);
    }

    if (error.response?.status === 429) {
      const data = error.response.data as {
        message?: string;
        metadata?: {
          strikeCount?: number;
          cooldownMinutes?: number;
          feature?: "chat" | "comment";
        };
      };
      dispatchModerationEvent({
        type: "rateLimit",
        feature: data.metadata?.feature || "chat",
        strikeCount: data.metadata?.strikeCount || 1,
        cooldownMinutes: data.metadata?.cooldownMinutes || 5,
        message:
          data.message || "Bạn đang gửi quá nhanh. Vui lòng thử lại sau.",
      });
    }

    if (error.response?.status === 403) {
      const data = error.response.data as { message?: string };
      const message = data.message || "";
      if (
        message.includes("khóa") ||
        message.includes("spam") ||
        message.includes("suspended")
      ) {
        dispatchModerationEvent({
          type: "suspended",
          message: message || "Tài khoản của bạn đã bị khóa.",
        });
      }
    }

    return Promise.reject(error);
  }
);

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

export const handleApiError = (error: unknown): ApiError => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{
      error?: string;
      message?: string;
      success?: boolean;
    }>;

    let errorMessage = "An unexpected error occurred";

    if (axiosError.response?.data?.message) {
      errorMessage = axiosError.response.data.message;
    } else if (axiosError.response?.data?.error) {
      errorMessage = axiosError.response.data.error;
    } else if (typeof axiosError.response?.data === "string") {
      const htmlError = axiosError.response.data as string;
      const match = htmlError.match(/Error:\s*([^\<\n]+)/);
      if (match && match[1]) {
        errorMessage = match[1].trim();
      } else {
        errorMessage = axiosError.message;
      }
    } else {
      errorMessage = axiosError.message;
    }

    return {
      message: errorMessage,
      status: axiosError.response?.status,
      code: axiosError.code,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
    };
  }

  return {
    message: "An unexpected error occurred",
  };
};

export default axiosInstance;

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T;
}
