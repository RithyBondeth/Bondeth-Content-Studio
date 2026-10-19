"use client";

import { Check, Sparkles } from "lucide-react";
import type { CSSProperties } from "react";
import {
  BACKGROUND_STYLES,
  BACKGROUNDS,
  DEFAULT_BACKGROUND,
  type BackgroundStyle,
} from "../../../src/lib/backgrounds";
import { withAlpha } from "../../../src/lib/color";
import {
  resolveTheme,
  type ThemeSetting as ThemeValue,
} from "../../../src/theme/resolve";
import { cx } from "../ui";

type Colors = ReturnType<typeof resolveTheme>["colors"];

/** A still sketch of each background in the video's colors. */
const sketch = (style: BackgroundStyle, colors: Colors): CSSProperties => {
  const glow = `radial-gradient(circle at 20% 15%, ${withAlpha(colors.accent, 0.35)}, transparent 55%)`;
  switch (style) {
    case "glow":
      return {
        backgroundImage: `${glow}, radial-gradient(${colors.surfaceBorder} 1px, transparent 1px)`,
        backgroundSize: "auto, 8px 8px",
      };
    case "gradient":
      return {
        backgroundImage: `radial-gradient(ellipse 80% 70% at 25% 30%, ${withAlpha(colors.accent, 0.5)}, transparent 70%), radial-gradient(ellipse 70% 60% at 80% 70%, ${withAlpha(colors.accentBright, 0.3)}, transparent 70%)`,
      };
    case "shapes":
      return {
        backgroundImage: `${glow}, radial-gradient(circle at 75% 35%, transparent 5px, ${withAlpha(colors.accent, 0.5)} 6px, transparent 7.5px), radial-gradient(circle at 35% 75%, ${withAlpha(colors.accentBright, 0.45)} 4px, transparent 5px)`,
      };
    case "particles":
      return {
        backgroundImage: `${glow}, radial-gradient(${withAlpha(colors.accentBright, 0.7)} 1px, transparent 1.5px)`,
        backgroundSize: "auto, 13px 11px",
      };
    case "grid":
      return {
        backgroundImage: `${glow}, linear-gradient(${colors.surfaceBorder} 1px, transparent 1px), linear-gradient(90deg, ${colors.surfaceBorder} 1px, transparent 1px)`,
        backgroundSize: "auto, 10px 10px, 10px 10px",
      };
    case "noise":
      return {
        backgroundImage: `${glow}, repeating-radial-gradient(circle at 30% 40%, ${withAlpha(colors.text, 0.06)} 0 1px, transparent 1px 3px)`,
      };
    case "plain":
      return {};
  }
};

/** Picks the moving pattern behind every scene. */
export const BackgroundSetting = ({
  background,
  theme,
  onChange,
}: {
  background: BackgroundStyle | undefined;
  /** The video's theme, so each choice is shown in its colors. */
  theme: ThemeValue | undefined;
  onChange: (background: BackgroundStyle) => void;
}) => {
  const { colors } = resolveTheme(theme);
  const current = background ?? DEFAULT_BACKGROUND;
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface/60 p-4">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-raised text-accent-bright">
          <Sparkles className="size-4" aria-hidden />
        </span>
        <span>
          <span className="block text-sm font-medium">Background</span>
          <span className="block text-xs text-faint">
            The moving pattern behind every scene, in your theme&apos;s colors
          </span>
        </span>
      </div>
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
        {BACKGROUND_STYLES.map((style) => {
          const selected = style === current;
          return (
            <button
              key={style}
              type="button"
              aria-pressed={selected}
              title={BACKGROUNDS[style].description}
              onClick={() => onChange(style)}
              className={cx(
                "flex flex-col gap-1.5 rounded-xl p-1.5 text-left transition-colors",
                selected
                  ? "bg-accent/10 ring-2 ring-accent"
                  : "hover:bg-raised",
              )}
            >
              <span
                className="relative block h-12 w-full overflow-hidden rounded-lg ring-1 ring-line ring-inset"
                style={{
                  backgroundColor: colors.background,
                  ...sketch(style, colors),
                }}
                aria-hidden
              >
                {selected ? (
                  <span className="absolute top-1.5 right-1.5 grid size-4 place-items-center rounded-full bg-accent text-white">
                    <Check className="size-3" />
                  </span>
                ) : null}
              </span>
              <span className="truncate px-0.5 text-xs font-medium">
                {BACKGROUNDS[style].label}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-faint">{BACKGROUNDS[current].description}.</p>
    </div>
  );
};
