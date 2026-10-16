import { Clapperboard } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export const Header = ({ children }: { children?: ReactNode }) => (
  <header className="sticky top-0 z-20 border-b border-line bg-bg/80 backdrop-blur">
    <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
      <Link href="/" className="flex items-center gap-2 font-semibold">
        <span className="grid size-7 place-items-center rounded-lg bg-accent">
          <Clapperboard className="size-4 text-white" aria-hidden />
        </span>
        Content Studio
      </Link>
      {children}
    </div>
  </header>
);
