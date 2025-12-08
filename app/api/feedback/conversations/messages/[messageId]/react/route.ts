import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/apiProxy";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const { messageId } = await params;
  const body = await request.json();
  return proxyRequest(request, `/conversations/messages/${messageId}/react`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}
