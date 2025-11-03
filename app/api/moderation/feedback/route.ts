"use server";

import { NextResponse } from "next/server";
import { getServerAppwriteClients } from "@/lib/serverAppwrite";
import {
  enforceFeedbackRateLimit,
  FeedbackRateLimitError,
  FeedbackSuspendedError,
} from "@/lib/feedbackModeration";

interface ModerationPayload {
  userId: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ModerationPayload;
    const userId = body?.userId?.trim();
    if (!userId) {
      return NextResponse.json(
        { error: "Thiếu thông tin người dùng" },
        { status: 400 }
      );
    }

    const {
      databases,
      databaseId,
      presenceCollectionId,
      profileCollectionId,
      notificationsCollectionId,
    } = getServerAppwriteClients();

    await enforceFeedbackRateLimit({
      databases,
      databaseId,
      presenceCollectionId,
      profileCollectionId,
      notificationsCollectionId,
      userId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof FeedbackSuspendedError) {
      return NextResponse.json({ error: error.message }, { status: 423 });
    }
    if (error instanceof FeedbackRateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    console.error("Moderation check failed:", error);
    return NextResponse.json(
      { error: "Không thể kiểm tra rate limit" },
      { status: 500 }
    );
  }
}
