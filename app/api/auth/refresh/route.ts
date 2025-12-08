import { NextRequest } from "next/server";
import { proxyPublicRequest } from "@/lib/apiProxy";

export async function POST(request: NextRequest) {
  // Refresh token endpoint MUST receive cookies to work
  return proxyPublicRequest(
    request,
    "/auth/refresh",
    {
      method: "POST",
    },
    true
  );
}
