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
      const data = (await response.json().catch(() => null)) as
        | { error?: string; message?: string }
        | null;
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
