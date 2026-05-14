import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

const handler = auth((req) => {
  const { pathname } = req.nextUrl;

  // Öffentliche Routen
  const publicPaths = ["/login", "/wallet/claim", "/api/auth"];
  const isPublic = publicPaths.some((p) => pathname.startsWith(p));

  if (isPublic) return NextResponse.next();

  // API-Routen die öffentlich sein müssen
  if (pathname.startsWith("/api/wallet")) return NextResponse.next();
  // Cron-Route hat eigene Authentifizierung via CRON_SECRET
  if (pathname.startsWith("/api/cron")) return NextResponse.next();

  // Alles andere erfordert Auth
  if (!req.auth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export { handler as proxy };

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg|.*\\.ico|.*\\.webp).*)",
  ],
};
