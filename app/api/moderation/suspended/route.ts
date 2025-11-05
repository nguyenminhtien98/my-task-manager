"use server";

import { NextResponse } from "next/server";
import { getServerAppwriteClients } from "@/lib/serverAppwrite";
import { FeedbackSuspendedError } from "@/lib/feedbackModeration";

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

    const { databases, databaseId, profileCollectionId } =
      getServerAppwriteClients();

    // Only check suspendedUntil, do NOT check rate limit
    let profileDoc: Record<string, unknown> | null = null;
    try {
      profileDoc = (await databases.getDocument(
        databaseId,
        profileCollectionId,
        userId
      )) as unknown as Record<string, unknown>;
    } catch {
      // If profile not found, assume not suspended
      return NextResponse.json({ ok: true });
    }

    const suspendedUntil =
      (profileDoc?.suspendedUntil as string | null | undefined) ?? null;
    if (suspendedUntil && `${suspendedUntil}`.trim().length > 0) {
      const message =
        "Tài khoản của bạn đang bị khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.";
      return NextResponse.json({ error: message }, { status: 423 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof FeedbackSuspendedError) {
      return NextResponse.json({ error: error.message }, { status: 423 });
    }
    console.error("Suspension check failed:", error);
    return NextResponse.json(
      { error: "Không thể kiểm tra trạng thái tài khoản" },
      { status: 500 }
    );
  }
}
