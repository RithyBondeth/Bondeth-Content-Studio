import { NextResponse, type NextRequest } from "next/server";
import { getGate, SESSION_COOKIE, verifySession } from "./studio/auth";

/** Keeps a studio on a server behind its password; see studio/auth.ts. */
export async function proxy(request: NextRequest) {
  const gate = getGate();
  if (gate.kind === "open") return NextResponse.next();
  if (gate.kind === "misconfigured") {
    return new NextResponse(
      "This studio has no password. Set STUDIO_PASSWORD and restart it, or set STUDIO_ALLOW_OPEN=1 to run it without one.",
      { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (await verifySession(session, gate.secret)) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  const login = new URL("/login", request.url);
  if (pathname !== "/") login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  // Everything except the login page and what it needs to render.
  matcher: [
    "/((?!login|_next/static|_next/image|icon.svg|apple-icon.png|favicon.ico|fonts/).*)",
  ],
};
