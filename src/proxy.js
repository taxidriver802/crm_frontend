import { NextResponse } from "next/server";

export function proxy(request) {
  const token = request.cookies.get("access_token")?.value;

  const pathname = request.nextUrl.pathname;
  const isLogin = pathname === "/login";

  // If not logged in, block protected routes
  const protectedRoutes = [
    "/dashboard",
    "/leads",
    "/tasks",
    "/files",
    "/notifications",
    "/jobs",
  ];

  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));

  if (!token && isProtected) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Optional: if logged in, don’t allow /login
  if (token && isLogin) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/leads/:path*",
    "/tasks/:path*",
    "/files/:path*",
    "/jobs/:path*",
    "/notifications",
    "/login",
  ],
};
