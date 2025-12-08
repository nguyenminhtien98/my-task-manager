import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/apiProxy";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  const { commentId } = await params;
  const body = await request.json();
  return proxyRequest(request, `/comments/${commentId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  const { commentId } = await params;
  return proxyRequest(request, `/comments/${commentId}`, {
    method: "DELETE",
  });
}
