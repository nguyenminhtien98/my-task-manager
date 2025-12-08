import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/apiProxy";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const { reportId } = await params;
  const body = await request.json();
  return proxyRequest(request, `/daily-reports/${reportId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const { reportId } = await params;
  return proxyRequest(request, `/daily-reports/${reportId}`, {
    method: "DELETE",
  });
}
