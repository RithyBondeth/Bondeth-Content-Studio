import { Settings } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { AccountMenu } from "./AccountMenu";
import { AppearanceSwitch } from "./Appearance";
import { BlockDot } from "./Blocks";
import { BrandLogo } from "./BrandLogo";
import { buttonClass, cx } from "./ui";

export const Logo = () => (
  <Link href="/" className="brand-logo flex items-center">
    <BrandLogo className="h-8 w-auto" />
  </Link>
);

/**
 * The gear that opens Settings, where API keys are added. A small blue
 * block on it means no AI service is connected yet.
 */
export const SettingsLink = ({
  needsSetup = false,
  className,
}: {
  needsSetup?: boolean;
  className?: string;
}) => (
  <Link
    href="/settings"
    aria-label={needsSetup ? "Settings: connect an AI service" : "Settings"}
    title={needsSetup ? "Settings: connect an AI service" : "Settings"}
    className={cx(
      buttonClass({ variant: "ghost", size: "sm", iconOnly: true }),
      className,
    )}
  >
    <Settings className="size-4" aria-hidden />
    {needsSetup ? (
      <BlockDot className="absolute top-1 right-1 size-2 bg-accent-bright ring-2 ring-bg" />
    ) : null}
  </Link>
);

export const Header = ({
  needsSetup,
  canManageKeys = true,
  children,
}: {
  /** Mark the settings gear: no AI service is connected yet. */
  needsSetup?: boolean;
  /** Show the settings gear: false for people who can't change the keys. */
  canManageKeys?: boolean;
  children?: ReactNode;
}) => (
  <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/70 backdrop-blur-xl">
    <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
      <Logo />
      <div className="flex items-center gap-3">
        {children}
        {canManageKeys ? <SettingsLink needsSetup={needsSetup} /> : null}
        <AppearanceSwitch />
        <AccountMenu />
      </div>
    </div>
  </header>
);
