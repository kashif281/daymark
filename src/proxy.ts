import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const authenticatedProxy = clerkMiddleware(async (auth, request) => {
  const isPublicRoute =
    request.nextUrl.pathname.startsWith("/sign-in") ||
    request.nextUrl.pathname.startsWith("/sign-up") ||
    request.nextUrl.pathname === "/api/cron/reminders";

  if (!isPublicRoute) {
    await auth.protect();
  }
});

export default process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  ? authenticatedProxy
  : () => NextResponse.next();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
