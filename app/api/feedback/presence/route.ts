import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/apiProxy";

export async function GET(request: NextRequest) {
  return proxyRequest(request, "/feedback/presence");
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return proxyRequest(request, "/feedback/presence", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
