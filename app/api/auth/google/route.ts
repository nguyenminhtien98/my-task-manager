import { NextRequest } from "next/server";
import { proxyPublicRequest } from "@/lib/apiProxy";

export async function POST(request: NextRequest) {
  const body = await request.json();
  return proxyPublicRequest(request, "/auth/google", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
