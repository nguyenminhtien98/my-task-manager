import {
  AppwriteException,
  Databases,
  Permission,
  Role,
} from "node-appwrite";

export const FEEDBACK_RATE_LIMIT_WINDOW_MS = Number(
  process.env.FEEDBACK_RATE_LIMIT_WINDOW_MS ?? 10000
);
export const FEEDBACK_RATE_LIMIT_MAX_ACTIONS = Number(
  process.env.FEEDBACK_RATE_LIMIT_MAX_ACTIONS ?? 5
);
export const FEEDBACK_RATE_LIMIT_COOLDOWN_STEP_MS = Number(
  process.env.FEEDBACK_RATE_LIMIT_COOLDOWN_STEP_MS ?? 10000
);
export const FEEDBACK_RATE_LIMIT_RESET_MS = Number(
  process.env.FEEDBACK_RATE_LIMIT_RESET_MS ?? 20 * 60 * 1000
);

interface ModerationContext {
  databases: Databases;
  databaseId: string;
  presenceCollectionId: string;
  profileCollectionId: string;
  notificationsCollectionId: string;
  userId: string;
}

const isNotFound = (error: unknown) =>
  error instanceof AppwriteException && error.code === 404;

export class FeedbackRateLimitError extends Error {
  public status = 429;
  constructor(message: string) {
    super(message);
    this.name = "FeedbackRateLimitError";
  }
}

export class FeedbackSuspendedError extends Error {
  public status = 423;
  constructor(message: string) {
    super(message);
    this.name = "FeedbackSuspendedError";
  }
}

const sendModerationNotification = async (
  databases: Databases,
  databaseId: string,
  notificationsCollectionId: string,
  recipientId: string,
  message: string,
  type: string
) => {
  try {
    await databases.createDocument(
      databaseId,
      notificationsCollectionId,
      "unique()",
      {
        type,
        scope: "system",
        status: "unread",
        recipient: recipientId,
        message,
        metadata: JSON.stringify({ message }).slice(0, 1000),
      },
      [
        Permission.read(Role.user(recipientId)),
        Permission.update(Role.user(recipientId)),
      ]
    );
  } catch (error) {
    console.warn("Không thể gửi thông báo rate limit:", error);
  }
};

export const enforceFeedbackRateLimit = async ({
  databases,
  databaseId,
  presenceCollectionId,
  profileCollectionId,
  notificationsCollectionId,
  userId,
}: ModerationContext): Promise<void> => {
  if (!userId) {
    throw new Error("Thiếu thông tin người dùng để kiểm tra rate limit");
  }

  let profileDoc: Record<string, unknown> | null = null;
  try {
    profileDoc = (await databases.getDocument(
      databaseId,
      profileCollectionId,
      userId
    )) as unknown as Record<string, unknown>;
  } catch (error) {
    if (!isNotFound(error)) {
      throw error;
    }
  }

  const suspendedUntil =
    (profileDoc?.suspendedUntil as string | null | undefined) ?? null;
  if (suspendedUntil && `${suspendedUntil}`.trim().length > 0) {
    throw new FeedbackSuspendedError(
      "Tài khoản của bạn đang bị khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ."
    );
  }

  let presenceDoc: Record<string, unknown> | null = null;
  try {
    presenceDoc = (await databases.getDocument(
      databaseId,
      presenceCollectionId,
      userId
    )) as unknown as Record<string, unknown>;
  } catch (error) {
    if (!isNotFound(error)) {
      throw error;
    }
  }

  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const windowStartIso =
    (presenceDoc?.feedbackWindowStart as string | null | undefined) ?? null;
  const windowStartTime = windowStartIso ? Date.parse(windowStartIso) : null;
  const storedWindowCount = Number(presenceDoc?.feedbackWindowCount ?? 0);
  let lastViolationIso =
    (presenceDoc?.feedbackLastViolationAt as string | null | undefined) ?? null;
  let lastViolationTime = lastViolationIso ? Date.parse(lastViolationIso) : null;

  let violationCount = Number(presenceDoc?.feedbackStrikeCount ?? 0);
  if (
    violationCount > 0 &&
    lastViolationTime &&
    now - lastViolationTime >= FEEDBACK_RATE_LIMIT_RESET_MS
  ) {
    violationCount = 0;
    lastViolationIso = null;
    lastViolationTime = null;
  }

  const cooldownIso =
    (presenceDoc?.feedbackCooldownUntil as string | null | undefined) ?? null;
  const cooldownTime = cooldownIso ? Date.parse(cooldownIso) : null;
  const inCooldown =
    typeof cooldownTime === "number" && cooldownTime > now;

  let windowStartMs = now;
  let windowCount = 1;
  if (
    windowStartTime &&
    now - windowStartTime <= FEEDBACK_RATE_LIMIT_WINDOW_MS
  ) {
    windowStartMs = windowStartTime;
    windowCount = storedWindowCount + 1;
  }

  const exceededWindow = windowCount > FEEDBACK_RATE_LIMIT_MAX_ACTIONS;

  const savePresencePayload = async (
    payload: Record<string, unknown>
  ): Promise<void> => {
    try {
      await databases.updateDocument(
        databaseId,
        presenceCollectionId,
        userId,
        payload
      );
    } catch (error) {
      if (isNotFound(error)) {
        await databases.createDocument(
          databaseId,
          presenceCollectionId,
          userId,
          payload
        );
        return;
      }
      throw error;
    }
  };

  const basePayload: Record<string, unknown> = {
    lastFeedbackActionAt: nowIso,
    feedbackStrikeCount: violationCount,
    feedbackCooldownUntil: null,
    feedbackWindowStart: new Date(windowStartMs).toISOString(),
    feedbackWindowCount: windowCount,
    feedbackLastViolationAt: lastViolationIso,
  };

  if (inCooldown) {
    const remaining = cooldownTime - now;
    const remainingSeconds = Math.max(Math.ceil(remaining / 1000), 1);
    basePayload.feedbackWindowStart = null;
    basePayload.feedbackWindowCount = 0;
    basePayload.feedbackCooldownUntil = new Date(cooldownTime).toISOString();
    await savePresencePayload(basePayload);
    const message = `Hệ thống nghi ngờ bạn đang spam. Vui lòng quay lại sau ${remainingSeconds} giây.`;
    await sendModerationNotification(
      databases,
      databaseId,
      notificationsCollectionId,
      userId,
      message,
      "system.moderation.rateLimit"
    );
    throw new FeedbackRateLimitError(message);
  }

  if (exceededWindow) {
    violationCount += 1;

    const cooldownDuration =
      Math.min(
        violationCount,
        FEEDBACK_RATE_LIMIT_MAX_ACTIONS
      ) * FEEDBACK_RATE_LIMIT_COOLDOWN_STEP_MS;
    basePayload.feedbackStrikeCount = violationCount;
    lastViolationIso = nowIso;
    lastViolationTime = now;
    basePayload.feedbackLastViolationAt = nowIso;
    basePayload.feedbackWindowStart = null;
    basePayload.feedbackWindowCount = 0;
    basePayload.feedbackCooldownUntil = new Date(
      now + cooldownDuration
    ).toISOString();

    await savePresencePayload(basePayload);

    if (violationCount > FEEDBACK_RATE_LIMIT_MAX_ACTIONS) {
      await databases.updateDocument(
        databaseId,
        profileCollectionId,
        userId,
        {
          suspendedUntil: nowIso,
          suspensionReason: "feedback.spam",
        }
      );
      const message =
        "Bạn đã bị khóa vì gửi quá nhiều nội dung trong thời gian ngắn. Liên hệ quản trị viên để mở khóa.";
      await sendModerationNotification(
        databases,
        databaseId,
        notificationsCollectionId,
        userId,
        message,
        "system.moderation.suspended"
      );
      throw new FeedbackSuspendedError(message);
    }

    const message = `Hệ thống nghi ngờ bạn đang spam. Vui lòng quay lại sau ${Math.ceil(
      cooldownDuration / 1000
    )} giây.`;
    await sendModerationNotification(
      databases,
      databaseId,
      notificationsCollectionId,
      userId,
      message,
      "system.moderation.rateLimit"
    );
    throw new FeedbackRateLimitError(message);
  }

  basePayload.feedbackLastViolationAt = lastViolationIso;
  await savePresencePayload(basePayload);
};
