import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getGate, safeNext } from "../../studio/auth";
import { BlockField } from "../_components/BlockField";
import { BrandLogo } from "../_components/BrandLogo";
import { Card } from "../_components/ui";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Sign in · Bondeth Studio" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  if (getGate().kind !== "password") redirect("/");
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
          <p className="text-sm leading-relaxed text-muted">
            This studio is private. Enter its password to continue.
          </p>
        </div>
        <LoginForm next={safeNext(next)} />
      </Card>
    </div>
  );
}
