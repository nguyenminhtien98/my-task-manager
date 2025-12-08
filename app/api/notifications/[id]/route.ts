import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/apiProxy";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyRequest(request, `/notifications/${id}`, {
    method: "DELETE",
  });
}
