const extractErrorMessage = (error: unknown): string | null => {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const value = (error as { message?: unknown }).message;
    if (typeof value === "string") return value;
  }
  return null;
};

export const localizeAuthError = (error: unknown, fallback: string) => {
  const raw = extractErrorMessage(error);
  if (!raw) return fallback;
  const normalized = raw.toLowerCase();
  if (normalized.includes("invalid credentials")) {
    return "Email hoặc mật khẩu không đúng.";
  }
  if (normalized.includes("user already exists")) {
    return "Email đã tồn tại trong hệ thống.";
  }
  if (normalized.includes("password strength")) {
    return "Mật khẩu chưa đáp ứng yêu cầu bảo mật.";
  }
  return raw;
};
