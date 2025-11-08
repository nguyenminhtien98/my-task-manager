"use server";

import { NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { getServerAppwriteClients } from "@/lib/serverAppwrite";
import {
  matchesTaskFilters,
  TaskFiltersState,
} from "@/app/utils/taskFilters";
import { mapTaskDocument, RawTaskDocument } from "@/app/utils/taskMapping";
import { Task } from "@/app/types/Types";

export async function POST(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const { projectId } = params;
    const tasksCollectionId = process.env.NEXT_PUBLIC_COLLECTION_ID_TASKS;
    if (!tasksCollectionId) {
      throw new Error("Thiếu cấu hình collection Task");
    }

    const body = await request.json().catch(() => ({}));
    const filters = (body?.filters ?? null) as TaskFiltersState | null;
    const currentUserId =
      typeof body?.currentUserId === "string" ? body.currentUserId : null;

    const { databases, databaseId } = getServerAppwriteClients();

    const query = [Query.equal("projectId", projectId)];
    const response = await databases.listDocuments(
      databaseId,
      tasksCollectionId,
      query
    );

    let tasks = response.documents.map((doc) =>
      mapTaskDocument(doc as RawTaskDocument)
    );

    if (filters) {
      tasks = tasks.filter((task: Task) =>
        matchesTaskFilters(task, filters, { currentUserId })
      );
    }

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Filter tasks API error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể lấy danh sách task",
      },
      { status: 500 }
    );
  }
}
