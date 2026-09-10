import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function middleware(request: NextRequest) {
  if (!MUTATING.has(request.method) || !request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const host = request.headers.get("host");
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  function hostOf(value: string | null) {
    if (!value) return null;
    try {
      return new URL(value).host;
    } catch {
      return null;
    }
  }

  const originHost = hostOf(origin);
  const refererHost = hostOf(referer);
  if (originHost && host && originHost !== host) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Invalid request origin." } },
      { status: 403 }
    );
  }
  if (!originHost && refererHost && host && refererHost !== host) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Invalid request origin." } },
      { status: 403 }
    );
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
