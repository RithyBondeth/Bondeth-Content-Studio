import { ArrowLeft, LogOut } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getGate } from "../../studio/auth";
import { getSettingsView } from "../../studio/server/settings";
import { BlockField } from "../_components/BlockField";
import { Header } from "../_components/Header";
import { buttonClass } from "../_components/ui";
import { signOut } from "../login/actions";
import { SettingsForm } from "./SettingsForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Settings · Bondeth Studio" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const view = getSettingsView();
  return (
    <div className="relative min-h-screen overflow-x-clip">
      <div
        className="bg-stage pointer-events-none absolute inset-x-0 top-0 h-[520px] opacity-70"
        aria-hidden
      />
      <BlockField className="h-[520px] opacity-70" />
      <Header />
      <main className="relative mx-auto flex max-w-3xl flex-col gap-8 px-4 pt-8 pb-24 sm:px-6">
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-text"
            >
              <ArrowLeft className="size-4" aria-hidden />
              All projects
            </Link>
            {getGate().kind === "password" ? (
              <form action={signOut}>
                <button
                  type="submit"
                  className={buttonClass({ variant: "ghost", size: "sm" })}
                >
                  <LogOut className="size-4" aria-hidden />
                  Sign out
                </button>
              </form>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Settings
            </h1>
            <p className="max-w-2xl leading-relaxed text-muted">
              Connect the AI services you want to use. Each one is optional:
              anything without a key, you can do yourself.{" "}
              {view.locked
                ? "Keys come from this server's environment."
                : "Keys stay on this computer and changes apply right away."}
            </p>
          </div>
        </div>
        <SettingsForm initial={view} fromSetup={from === "setup"} />
      </main>
    </div>
  );
}
