"use client";

import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { cx } from "./ui";

export type Appearance = "system" | "light" | "dark";

/** Where the choice is remembered, in this browser only. */
export const APPEARANCE_KEY = "studio-appearance";

/**
 * Runs in <head> before the page paints, so it never flashes the wrong
 * colors. Kept as a string because it can't wait for React.
 */
export const appearanceScript = `(() => {
  let choice = "system";
  try { choice = localStorage.getItem("${APPEARANCE_KEY}") || "system"; } catch {}
  const light = choice === "light" || (choice === "system" && matchMedia("(prefers-color-scheme: light)").matches);
  document.documentElement.dataset.theme = light ? "light" : "dark";
})();`;

const apply = (choice: Appearance) => {
  const light =
    choice === "light" ||
    (choice === "system" &&
      window.matchMedia("(prefers-color-scheme: light)").matches);
  document.documentElement.dataset.theme = light ? "light" : "dark";
};

const OPTIONS: { value: Appearance; label: string; icon: LucideIcon }[] = [
  { value: "system", label: "Match system", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

/** Picks light, dark, or the system's appearance for the studio. Videos keep their own theme. */
export const AppearanceSwitch = ({ className }: { className?: string }) => {
  const [choice, setChoice] = useState<Appearance>("system");

  // Read the saved choice after mounting; the server can't know it.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(APPEARANCE_KEY);
      if (saved === "light" || saved === "dark") setChoice(saved);
    } catch {
      // Storage can be blocked; the system setting still applies.
    }
  }, []);

  // Follow the system setting while it's the choice.
  useEffect(() => {
    if (choice !== "system") return;
    const query = window.matchMedia("(prefers-color-scheme: light)");
    const follow = () => apply("system");
    query.addEventListener("change", follow);
    return () => query.removeEventListener("change", follow);
  }, [choice]);

  const pick = (next: Appearance) => {
    setChoice(next);
    apply(next);
    try {
      if (next === "system") localStorage.removeItem(APPEARANCE_KEY);
      else localStorage.setItem(APPEARANCE_KEY, next);
    } catch {
      // Not remembered, but still applied for this visit.
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label="Appearance"
      className={cx(
        "flex rounded-xl border border-line bg-surface p-0.5",
        className,
      )}
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={choice === option.value}
          aria-label={option.label}
          title={option.label}
          onClick={() => pick(option.value)}
          className={cx(
            "grid size-7 place-items-center rounded-[9px] transition-colors",
            choice === option.value
              ? "bg-raised text-text ring-1 ring-line-strong"
              : "text-faint hover:text-text",
          )}
        >
          <option.icon className="size-3.5" aria-hidden />
        </button>
      ))}
    </div>
  );
};
