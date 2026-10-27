/**
 * The password gate for a studio running on a server. Set STUDIO_PASSWORD and
 * every page, action, and file needs a session cookie, which the login page
 * hands out. Without it the studio is open, as it is on your own computer.
 *
 * Uses Web Crypto only, so the proxy, the login action, and tests share it.
 */

export const SESSION_COOKIE = "studio_session";
/** How long a sign-in lasts. */
export const SESSION_SECONDS = 30 * 24 * 60 * 60;

type Env = Record<string, string | undefined>;

export type Gate =
  /** No password and not in production: the studio is open. */
  | { kind: "open" }
  /** In production without a password: refuse everything rather than run open. */
  | { kind: "misconfigured" }
  | { kind: "password"; password: string; secret: string };

export const getGate = (env: Env = process.env): Gate => {
  const password = env.STUDIO_PASSWORD ?? "";
  if (password) {
    // Sessions are signed with their own secret when set, else the password,
    // so changing the password signs everyone out.
    return {
      kind: "password",
      password,
      secret: env.STUDIO_SESSION_SECRET || password,
    };
  }
  if (env.NODE_ENV === "production" && env.STUDIO_ALLOW_OPEN !== "1") {
    return { kind: "misconfigured" };
  }
  return { kind: "open" };
};

const encoder = new TextEncoder();

const toBase64Url = (bytes: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const hmac = async (secret: string, message: string) => {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toBase64Url(
    await crypto.subtle.sign("HMAC", key, encoder.encode(message)),
  );
};

/** Compares two strings in time that doesn't depend on where they differ. */
const sameText = (a: string, b: string) => {
  const x = encoder.encode(a);
  const y = encoder.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  }
  return diff === 0;
};

/** Whether a typed password is the right one. Hashes first so lengths don't leak. */
export const checkPassword = async (typed: string, password: string) => {
  const digest = async (text: string) =>
    toBase64Url(await crypto.subtle.digest("SHA-256", encoder.encode(text)));
  return sameText(await digest(typed), await digest(password));
};

/** A session cookie value: when it expires, signed. */
export const createSession = async (secret: string, now = Date.now()) => {
  const expires = Math.floor(now / 1000) + SESSION_SECONDS;
  return `${expires}.${await hmac(secret, `session:${expires}`)}`;
};

export const verifySession = async (
  value: string | undefined,
  secret: string,
  now = Date.now(),
) => {
  const [expires, signature, extra] = value?.split(".") ?? [];
  if (!expires || !signature || extra !== undefined) return false;
  if (!/^\d+$/.test(expires) || Number(expires) * 1000 <= now) return false;
  return sameText(signature, await hmac(secret, `session:${expires}`));
};

/** Where to go after signing in: only a path on this site. */
export const safeNext = (next: string | null | undefined) =>
  next?.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")
    ? next
    : "/";
