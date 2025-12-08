import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/apiProxy";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  return proxyRequest(request, `/projects/${projectId}/tasks`);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const body = await request.json();
  return proxyRequest(request, `/projects/${projectId}/tasks`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
