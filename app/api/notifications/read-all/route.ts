import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/apiProxy";

export async function PUT(request: NextRequest) {
  return proxyRequest(request, "/notifications/read-all", {
    method: "PUT",
  });
}
