import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/apiProxy";

export async function POST(request: NextRequest) {
  return proxyRequest(request, "/notifications/mark-all-read", {
    method: "POST",
  });
}
