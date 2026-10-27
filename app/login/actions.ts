"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  checkPassword,
  createSession,
  getGate,
  safeNext,
  SESSION_COOKIE,
  SESSION_SECONDS,
} from "../../studio/auth";

/** Secure cookies need HTTPS; a reverse proxy says so in X-Forwarded-Proto. */
const isHttps = async () => {
  const h = await headers();
  const proto = h.get("x-forwarded-proto")?.split(",")[0]?.trim();
  return proto === "https" || process.env.STUDIO_SECURE_COOKIE === "1";
};

export const signIn = async (
  _previous: string | null,
  form: FormData,
): Promise<string | null> => {
  const gate = getGate();
  if (gate.kind !== "password") redirect("/");

  const typed = String(form.get("password") ?? "");
  if (!(await checkPassword(typed, gate.password))) {
    // Slows down guessing.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return "That password isn't right.";
  }

  (await cookies()).set(SESSION_COOKIE, await createSession(gate.secret), {
    httpOnly: true,
    sameSite: "lax",
    secure: await isHttps(),
    path: "/",
    maxAge: SESSION_SECONDS,
  });
  redirect(safeNext(String(form.get("next") ?? "")));
};

export const signOut = async () => {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
};
