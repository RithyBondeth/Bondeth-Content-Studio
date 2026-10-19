import { Clapperboard } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { AppearanceSwitch } from "./Appearance";

export const Logo = () => (
  <Link
    href="/"
    className="group flex items-center gap-2.5 font-medium tracking-tight"
  >
    <span className="bg-brand grid size-8 place-items-center rounded-xl shadow-[0_6px_20px_-6px_rgb(124_92_255/0.8)] transition-transform group-hover:-rotate-6">
      <Clapperboard className="size-4 text-white" aria-hidden />
    </span>
    <span className="text-[15px]">
      Content <span className="text-muted">Studio</span>
    </span>
  </Link>
);

export const Header = ({ children }: { children?: ReactNode }) => (
  <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/70 backdrop-blur-xl">
    <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
      <Logo />
      <div className="flex items-center gap-3">
        {children}
        <AppearanceSwitch />
      </div>
    </div>
  </header>
);
