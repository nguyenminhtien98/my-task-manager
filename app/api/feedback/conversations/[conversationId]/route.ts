import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/apiProxy";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await params;
  return proxyRequest(request, `/feedback/conversations/${conversationId}`);
}
