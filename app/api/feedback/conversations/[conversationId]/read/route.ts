import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/apiProxy";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await params;
  return proxyRequest(
    request,
    `/feedback/conversations/${conversationId}/read`,
    {
      method: "POST",
    }
  );
}
