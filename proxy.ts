import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import { getAuthMode } from "./studio/auth-mode";

/**
 * With accounts, sends anyone without a session cookie to the sign-in page
 * (APIs answer 401). It only checks that a cookie is there; every page,
 * action, and route checks the session itself before touching any files.
 */
export function proxy(request: NextRequest) {
  const mode = getAuthMode();
  if (mode.kind === "open") return NextResponse.next();
  if (mode.kind === "misconfigured") {
    return new NextResponse(
      "This studio has no accounts set up. Set BETTER_AUTH_SECRET and restart it, or set STUDIO_ALLOW_OPEN=1 to run it without sign-in.",
      { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  if (getSessionCookie(request)) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  const login = new URL("/login", request.url);
  if (pathname !== "/") login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  // Everything except sign-in itself and what the sign-in page needs.
  matcher: [
    "/((?!login|api/auth|api/health|_next/static|_next/image|icon.svg|apple-icon.png|favicon.ico|fonts/|brand/).*)",
  ],
};
