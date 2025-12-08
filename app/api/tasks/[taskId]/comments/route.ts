import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/apiProxy";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  return proxyRequest(request, `/comments/tasks/${taskId}`);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  const body = await request.json();
  return proxyRequest(request, `/comments/tasks/${taskId}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
