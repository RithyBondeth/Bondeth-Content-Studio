import "server-only";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { getMigrations } from "better-auth/db/migration";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins/email-otp";
import { ROOT } from "../../pipeline/config";
import { hasGoogle, INVITE_ONLY_MESSAGE, isInvited } from "../auth-mode";

/** Accounts and sessions, in SQLite next to the saved settings (the data volume on a server). */
const DB_FILE = path.join(ROOT, ".studio", "auth.db");

/**
 * Sends a sign-in code. Through Resend when it's set up; in development the
 * code is printed to the server log instead.
 */
const sendCode = async (email: string, code: string) => {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Email sign-in isn't set up on this server. Set RESEND_API_KEY and EMAIL_FROM.",
      );
    }
    console.log(`[auth] Sign-in code for ${email}: ${code}`);
    return;
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: `${code} is your Bondeth Studio code`,
      text: `Your sign-in code is ${code}.\n\nIt works for 10 minutes. If you didn't ask for it, you can ignore this email.`,
    }),
  });
  if (!response.ok) {
    console.error("[auth] Resend:", response.status, await response.text());
    throw new Error("Couldn't send the code. Try again in a minute.");
  }
};

const createAuth = async () => {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  const database = new DatabaseSync(DB_FILE);
  // Sessions live here: readable only by the studio.
  fs.chmodSync(DB_FILE, 0o600);
  const options = {
    database,
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    socialProviders: hasGoogle()
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          },
        }
      : {},
    // With an invite list, only invited emails get a code or an account.
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/email-otp/send-verification-otp") return;
        const email = (ctx.body as { email?: unknown } | undefined)?.email;
        if (typeof email === "string" && !isInvited(email)) {
          throw new APIError("FORBIDDEN", { message: INVITE_ONLY_MESSAGE });
        }
      }),
    },
    databaseHooks: {
      user: {
        create: {
          // Also covers Google, which creates the account on the way back.
          before: async (user) => {
            if (!isInvited(user.email)) {
              throw new APIError("FORBIDDEN", { message: INVITE_ONLY_MESSAGE });
            }
          },
        },
      },
    },
    session: {
      expiresIn: 30 * 24 * 60 * 60,
      // Read the session from a signed cookie for a few minutes between database checks.
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 10 * 60,
        allowedAttempts: 5,
        storeOTP: "hashed",
        sendVerificationOTP: ({ email, otp }) => sendCode(email, otp),
      }),
      // Lets server actions set cookies.
      nextCookies(),
    ],
  } satisfies BetterAuthOptions;

  // Creates or updates the tables on first use.
  const { runMigrations } = await getMigrations(options);
  await runMigrations();
  return betterAuth(options);
};

type Auth = Awaited<ReturnType<typeof createAuth>>;

// Kept on globalThis so hot reloads in development reuse one database connection.
const holder = globalThis as { __studioAuth?: Promise<Auth> };

export const getAuth = () => (holder.__studioAuth ??= createAuth());
