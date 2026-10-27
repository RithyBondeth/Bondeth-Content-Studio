"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { authClient } from "../../studio/auth-client";
import { cx } from "./ui";

/**
 * The signed-in person's initial or photo, opening their email and Sign out.
 * Shows nothing without accounts, where there's nobody to sign out.
 */
export const AccountMenu = ({ className }: { className?: string }) => {
  const router = useRouter();
  const { data } = authClient.useSession();
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) =>
      !ref.current?.contains(event.target as Node) && setOpen(false);
    const escape = (event: KeyboardEvent) =>
      event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const user = data?.user;
  if (!user) return null;
  const initial = (user.name || user.email).trim().charAt(0).toUpperCase();

  return (
    <div ref={ref} className={cx("relative", className)}>
      <button
        type="button"
        aria-label="Account"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="grid size-8 place-items-center overflow-hidden rounded-full bg-accent/20 text-[13px] font-medium text-accent-bright ring-1 ring-accent/30 transition hover:ring-accent/60"
      >
        {user.image ? (
          <img
            src={user.image}
            alt=""
            className="size-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          initial
        )}
      </button>
      {open ? (
        <div
          role="menu"
          className="animate-rise-in absolute top-full right-0 z-40 mt-1 w-60 rounded-xl border border-line-strong bg-raised p-1 shadow-2xl shadow-black/50"
        >
          <div className="px-2.5 py-2">
            {user.name ? (
              <p className="truncate text-sm text-text">{user.name}</p>
            ) : null}
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <div className="my-1 h-px bg-line" />
          <button
            type="button"
            role="menuitem"
            disabled={leaving}
            onClick={async () => {
              setLeaving(true);
              await authClient.signOut();
              router.push("/login");
              router.refresh();
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-text transition-colors hover:bg-hover disabled:opacity-40"
          >
            <LogOut className="size-4" aria-hidden />
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
};
