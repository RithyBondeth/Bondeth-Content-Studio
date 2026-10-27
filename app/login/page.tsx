import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  getAuthMode,
  hasEmailCodes,
  hasGoogle,
  safeNext,
} from "../../studio/auth-mode";
import { getUser } from "../../studio/server/session";
import { BlockField } from "../_components/BlockField";
import { BrandLogo } from "../_components/BrandLogo";
import { Alert, Card } from "../_components/ui";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Sign in · Bondeth Studio" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeNext((await searchParams).next);
  // Nothing to sign in to without accounts, and no need when already in.
  if (getAuthMode().kind !== "accounts" || (await getUser())) redirect(next);
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-x-clip px-4">
      <div
        className="bg-stage pointer-events-none absolute inset-x-0 top-0 h-[520px] opacity-70"
        aria-hidden
      />
      <BlockField className="h-[520px] opacity-70" />
      <Card className="relative flex w-full max-w-sm flex-col gap-6 p-6">
        <div className="flex flex-col gap-3">
          <BrandLogo className="h-8 w-auto self-start" />
          <div className="flex flex-col gap-1">
            <h1 className="text-lg font-medium">Sign in</h1>
            <p className="text-sm leading-relaxed text-muted">
              New here? Signing in creates your account.
            </p>
          </div>
        </div>
        {hasGoogle() || hasEmailCodes() ? (
          <LoginForm next={next} google={hasGoogle()} email={hasEmailCodes()} />
        ) : (
          <Alert tone="warning">
            Sign-in isn&apos;t set up on this server yet. Its admin needs to add
            RESEND_API_KEY and EMAIL_FROM for email codes, or a Google client.
          </Alert>
        )}
      </Card>
    </div>
  );
}
