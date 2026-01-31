import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  checkRateLimit,
  DEFAULT_RATE_LIMIT,
  STRICT_RATE_LIMIT,
  AUTH_RATE_LIMIT,
} from "./lib/rate-limit";

const protectedPages = [
  "/dashboard",
  "/circles",
  "/credit",
  "/connect-wallet",
  "/bind-wallet",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Auth guard for protected pages
  if (protectedPages.some((p) => pathname.startsWith(p))) {
    const sessionToken =
      request.cookies.get("next-auth.session-token")?.value ||
      request.cookies.get("__Secure-next-auth.session-token")?.value;

    if (!sessionToken) {
      const signInUrl = new URL("/signin", request.url);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  const response = NextResponse.next();

  const allowedOrigin =
    process.env.FRONTEND_URL || "http://localhost:3000";

  // CORS headers for API routes
  if (pathname.startsWith("/api/")) {
    response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS",
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization",
    );
    response.headers.set("Access-Control-Allow-Credentials", "true");

    // Handle preflight
    if (request.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: response.headers,
      });
    }

    // Rate limiting (exempt health endpoint)
    if (pathname !== "/api/health") {
      const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        "anonymous";

      const isAuthRoute = pathname.startsWith("/api/auth");
      const isMutation = ["POST", "PUT", "DELETE", "PATCH"].includes(
        request.method,
      );

      const config = isAuthRoute
        ? AUTH_RATE_LIMIT
        : isMutation
          ? STRICT_RATE_LIMIT
          : DEFAULT_RATE_LIMIT;

      const result = checkRateLimit(`${ip}:${pathname}`, config);

      if (!result.allowed) {
        return NextResponse.json(
          { error: "Too many requests. Please try again later." },
          {
            status: 429,
            headers: {
              "Retry-After": Math.ceil(
                (result.resetAt - Date.now()) / 1000,
              ).toString(),
              "X-RateLimit-Limit": config.maxRequests.toString(),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": result.resetAt.toString(),
            },
          },
        );
      }

      response.headers.set(
        "X-RateLimit-Limit",
        config.maxRequests.toString(),
      );
      response.headers.set(
        "X-RateLimit-Remaining",
        result.remaining.toString(),
      );
      response.headers.set("X-RateLimit-Reset", result.resetAt.toString());
    }
  }

  return response;
}

export const config = {
  matcher: ["/api/:path*", "/dashboard/:path*", "/circles/:path*", "/credit/:path*", "/connect-wallet", "/bind-wallet"],
};
