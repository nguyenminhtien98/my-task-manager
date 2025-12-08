import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/apiProxy";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const body = await request.json();
  return proxyRequest(request, `/projects/${projectId}/members`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
