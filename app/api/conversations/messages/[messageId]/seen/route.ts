import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/apiProxy";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const { messageId } = await params;
  return proxyRequest(request, `/conversations/messages/${messageId}/seen`, {
    method: "PUT",
  });
}
