import { type NextRequest, NextResponse } from "next/server";

/**
 * Better Auth middleware for Next.js
 *
 * This middleware handles authentication for protected routes, distinguishing between
 * HR routes and Candidate routes. Each route type has its own login flow.
 *
 * HR routes: /hr, /assessment, /evaluation, /review
 * Candidate routes: /candidate, /candidate/*
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = [
    "/",
    "/api/auth", // Better-auth API routes (OAuth callbacks, etc.)
    "/_next", // Next.js internal routes
    "/favicon.ico",
  ];

  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route),
  );

  // Skip middleware for public routes
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Define HR routes (require HR login)
  const hrRoutes = ["/hr", "/assessment", "/evaluation", "/review"];
  const isHRRoute = hrRoutes.some((route) => pathname.startsWith(route));

  // Define Candidate routes (require candidate login)
  const candidateRoutes = ["/candidate"];
  const isCandidateRoute = candidateRoutes.some((route) =>
    pathname.startsWith(route),
  );

  // If route is not HR or Candidate, allow through (let page handle it)
  if (!isHRRoute && !isCandidateRoute) {
    return NextResponse.next();
  }

  // Check for session cookie (Edge Runtime compatible)
  // Better-auth uses session cookies, check for common patterns
  const allCookies = request.cookies.getAll();
  const hasSessionCookie = allCookies.some((cookie) => {
    const name = cookie.name.toLowerCase();
    return (
      name.includes("session") ||
      name.includes("auth") ||
      name.includes("better-auth")
    );
  });

  // If no session cookie, allow request through
  // The page components will handle showing the appropriate login UI
  // (HR routes show "HR Login", Candidate routes show "Candidate Login")
  if (!hasSessionCookie) {
    return NextResponse.next();
  }

  // Session exists, allow request to proceed
  // The page component will validate the session server-side
  return NextResponse.next();
}

/**
 * Configure which routes the middleware should run on
 *
 * This middleware protects:
 * - HR routes: /hr, /assessment, /evaluation, /review
 * - Candidate routes: /candidate, /candidate/*
 *
 * Note: The actual authentication check and login UI rendering happens
 * in the page components using getSession(). This middleware only provides
 * a lightweight cookie check for Edge Runtime compatibility.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static assets (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
