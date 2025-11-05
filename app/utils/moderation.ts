/**
 * Check if user is temporarily rate-limited (spam detection)
 * Only used for chat messages and comments
 */
export const checkUserActionAllowed = async (userId: string): Promise<void> => {
  if (!userId) {
    throw new Error("Chưa đăng nhập");
  }

  try {
    const response = await fetch("/api/moderation/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as {
        error?: string;
        message?: string;
      } | null;
      const message =
        (data?.error ?? data?.message)?.trim() ||
        "Tài khoản đang bị hạn chế, vui lòng thử lại sau.";
      throw new Error(message);
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Không thể kiểm tra trạng thái tài khoản.");
  }
};

/**
 * Check if user is permanently suspended
 * Used for all actions (create project, task, add/remove member, etc.)
 * This checks the suspendedUntil field in the user's profile
 * Does NOT check rate limit - only permanent suspension
 */
export const checkUserSuspended = async (userId: string): Promise<void> => {
  if (!userId) {
    throw new Error("Chưa đăng nhập");
  }

  try {
    // Use dedicated API endpoint that ONLY checks suspendedUntil
    // Does NOT check rate limit, so it won't affect rate limit counters
    const response = await fetch("/api/moderation/suspended", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as {
        error?: string;
        message?: string;
      } | null;
      const message =
        (data?.error ?? data?.message)?.trim() ||
        "Tài khoản của bạn đang bị khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.";
      throw new Error(message);
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Không thể kiểm tra trạng thái tài khoản.");
  }
};
