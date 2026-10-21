import { NextResponse, type NextRequest } from "next/server";

// Fast redirect for signed-out visitors. Real authorisation (session lookup, ADMIN role) happens
// server-side in layouts and every route handler; this cookie check is only a UX shortcut.
export function middleware(req: NextRequest) {
  if (!req.cookies.has("session")) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
}

export const config = { matcher: ["/admin/:path*", "/account/:path*", "/checkout", "/orders/:path*"] };
