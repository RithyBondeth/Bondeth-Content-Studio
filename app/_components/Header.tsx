import { Settings } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { AppearanceSwitch } from "./Appearance";
import { BrandLogo } from "./BrandLogo";
import { buttonClass, cx } from "./ui";

export const Logo = () => (
  <Link href="/" className="brand-logo flex items-center">
    <BrandLogo className="h-8 w-auto" />
  </Link>
);

/** The gear that opens Settings, where API keys are added. */
export const SettingsLink = ({ className }: { className?: string }) => (
  <Link
    href="/settings"
    aria-label="Settings"
    title="Settings"
    className={cx(
      buttonClass({ variant: "ghost", size: "sm", iconOnly: true }),
      className,
    )}
  >
    <Settings className="size-4" aria-hidden />
  </Link>
);

export const Header = ({ children }: { children?: ReactNode }) => (
  <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/70 backdrop-blur-xl">
    <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
      <Logo />
      <div className="flex items-center gap-3">
        {children}
        <SettingsLink />
        <AppearanceSwitch />
      </div>
    </div>
  </header>
);
