import { NextResponse, type NextRequest } from "next/server";

/** ตรวจเบื้องต้นว่ามี cookie login หรือยัง (backend ตรวจ JWT จริงอีกชั้น) */
export function proxy(request: NextRequest) {
  const hasToken = request.cookies.has("pr_token");
  const { pathname, search } = request.nextUrl;

  if (!hasToken && pathname !== "/login") {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  if (hasToken && pathname === "/") {
    return NextResponse.redirect(new URL("/home", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
