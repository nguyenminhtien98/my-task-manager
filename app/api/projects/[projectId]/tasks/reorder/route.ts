import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/apiProxy";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const body = await request.json();
  return proxyRequest(request, `/tasks/projects/${projectId}/reorder`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}
