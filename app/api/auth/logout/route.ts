import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/apiProxy";

export async function POST(request: NextRequest) {
  return proxyRequest(request, "/auth/logout", {
    method: "POST",
  });
}
