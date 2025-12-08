import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/apiProxy";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  return proxyRequest(request, `/presence/${userId}`);
}
