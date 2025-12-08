import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/apiProxy";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; profileId: string }> }
) {
  const { projectId, profileId } = await params;
  return proxyRequest(request, `/projects/${projectId}/members/${profileId}`, {
    method: "DELETE",
  });
}
