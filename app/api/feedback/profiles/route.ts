import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/apiProxy";

export async function GET(request: NextRequest) {
  return proxyRequest(request, "/feedback/profiles");
}
