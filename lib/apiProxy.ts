import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_API_URL;
const API_SECRET = process.env.API_SECRET;

if (!BACKEND_URL || !API_SECRET) {
  throw new Error(
    "Missing BACKEND_API_URL or API_SECRET in environment variables"
  );
}

export function generateSignature(timestamp: number, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}`)
    .digest("hex");
}

export async function proxyRequest(
  request: NextRequest,
  endpoint: string,
  options?: RequestInit
): Promise<NextResponse> {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const timestamp = Date.now();
    const signature = generateSignature(timestamp, API_SECRET!);

    const url = new URL(request.url);
    const backendUrl = `${BACKEND_URL}${endpoint}${url.search}`;

    const cookieHeader = request.headers.get("cookie");

    const response = await fetch(backendUrl, {
      ...options,
      headers: {
        ...options?.headers,
        Authorization: authHeader,
        "X-API-Secret": API_SECRET!,
        "X-Timestamp": timestamp.toString(),
        "X-Signature": signature,
        "Content-Type": "application/json",
        ...(cookieHeader && { Cookie: cookieHeader }),
      },
      credentials: "include",
    });

    const contentType = response.headers.get("content-type");
    const nextResponse =
      contentType && contentType.includes("application/json")
        ? NextResponse.json(await response.json(), { status: response.status })
        : NextResponse.json(
            {
              error: "Backend error",
              details: (await response.text()).substring(0, 200),
            },
            { status: response.status || 500 }
          );

    const setCookieHeaders = response.headers.getSetCookie();
    setCookieHeaders.forEach((cookie) => {
      nextResponse.headers.append("Set-Cookie", cookie);
    });

    return nextResponse;
  } catch (error) {
    console.error("API Proxy Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function proxyPublicRequest(
  request: NextRequest,
  endpoint: string,
  options?: RequestInit,
  forwardCookies: boolean = false
): Promise<NextResponse> {
  try {
    const timestamp = Date.now();
    const signature = generateSignature(timestamp, API_SECRET!);

    const url = new URL(request.url);
    const backendUrl = `${BACKEND_URL}${endpoint}${url.search}`;

    const cookieHeader = request.headers.get("cookie");

    const response = await fetch(backendUrl, {
      ...options,
      headers: {
        ...options?.headers,
        "X-API-Secret": API_SECRET!,
        "X-Timestamp": timestamp.toString(),
        "X-Signature": signature,
        "Content-Type": "application/json",
        ...(forwardCookies && cookieHeader && { Cookie: cookieHeader }),
      },
      credentials: "include",
    });

    const contentType = response.headers.get("content-type");
    const responseData =
      contentType && contentType.includes("application/json")
        ? await response.json()
        : {
            error: "Backend error",
            details: (await response.text()).substring(0, 200),
          };
    const nextResponse = NextResponse.json(responseData, {
      status: response.status || 500,
    });

    const setCookieHeaders = response.headers.getSetCookie();
    setCookieHeaders.forEach((cookie) => {
      nextResponse.headers.append("Set-Cookie", cookie);
    });

    return nextResponse;
  } catch (error) {
    console.error("API Proxy Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
