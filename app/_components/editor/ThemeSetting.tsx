"use client";

import { Palette } from "lucide-react";
import type { ThemeSetting as ThemeValue } from "../../../src/theme/resolve";
import { ThemePicker } from "../ThemePicker";

/** Picks the video's theme. The preview restyles as soon as it changes. */
export const ThemeSetting = ({
  theme,
  brandTheme,
  onChange,
}: {
  theme: ThemeValue | undefined;
  brandTheme?: ThemeValue;
  onChange: (theme: ThemeValue) => void;
}) => (
  <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface/60 p-4">
    <div className="flex items-center gap-3">
      <span className="grid size-9 place-items-center rounded-xl bg-raised text-accent-bright">
        <Palette className="size-4" aria-hidden />
      </span>
      <span>
        <span className="block text-sm font-medium">Theme</span>
        <span className="block text-xs text-faint">
          Colors and font for every scene in this video
        </span>
      </span>
    </div>
    <ThemePicker value={theme} brandTheme={brandTheme} onChange={onChange} />
  </div>
);
