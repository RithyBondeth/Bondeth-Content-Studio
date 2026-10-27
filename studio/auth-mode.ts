/**
 * Whether the studio has accounts. On your own computer it doesn't: there's
 * no sign-in and everything lives in the top-level folders. On a server, set
 * BETTER_AUTH_SECRET and everyone signs in (Google or an emailed code) and
 * gets their own private projects.
 *
 * No imports, so the proxy, the server, and tests can all use it.
 */

type Env = Record<string, string | undefined>;

export type AuthMode =
  /** No accounts: running locally, or opened up on purpose. */
  | { kind: "open" }
  /** In production with no accounts set up: refuse everything rather than run open. */
  | { kind: "misconfigured" }
  | { kind: "accounts" };

export const getAuthMode = (env: Env = process.env): AuthMode => {
  if (env.BETTER_AUTH_SECRET) return { kind: "accounts" };
  if (env.NODE_ENV === "production" && env.STUDIO_ALLOW_OPEN !== "1") {
    return { kind: "misconfigured" };
  }
  return { kind: "open" };
};

/** Whether sign-in codes can reach people: through Resend, or the log in development. */
export const hasEmailCodes = (env: Env = process.env) =>
  Boolean(env.RESEND_API_KEY && env.EMAIL_FROM) ||
  env.NODE_ENV !== "production";

/** Whether Google sign-in is set up. */
export const hasGoogle = (env: Env = process.env) =>
  Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

/**
 * Who can see and change the API keys in Settings. Without accounts that's
 * whoever runs the studio; with them, only the emails in ADMIN_EMAILS.
 */
export const isAdmin = (email: string | undefined, env: Env = process.env) => {
  if (getAuthMode(env).kind !== "accounts") return true;
  if (!email) return false;
  const admins = (env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.trim().toLowerCase());
};

/** Where to go after signing in: only a path on this site. */
export const safeNext = (next: string | null | undefined) =>
  next?.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")
    ? next
    : "/";
