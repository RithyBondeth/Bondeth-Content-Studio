import {
  AA_LARGE_TEXT,
  AA_TEXT,
  contrastRatio,
  ensureContrast,
  isDarkColor,
  mix,
  readableOn,
  withAlpha,
} from "../lib/color";
import {
  DEFAULT_THEME_PRESET,
  THEME_PRESETS,
  type CodeTheme,
  type ThemeColors,
  type ThemeFont,
  type ThemePresetName,
} from "./presets";

/** What a spec stores: a preset, plus any colors or font the creator changed. */
export type ThemeSetting = {
  preset: ThemePresetName;
  accent?: string;
  background?: string;
  text?: string;
  font?: ThemeFont;
};

export type ResolvedColors = ThemeColors & {
  /** The word being spoken in captions, which sits on the accent. */
  captionActiveText: string;
  lineHighlight: string;
  lineHighlightBorder: string;
  windowDots: readonly string[];
};

/** Every color and choice a scene needs, with overrides applied. Plain data. */
export type ResolvedTheme = {
  preset: ThemePresetName;
  colors: ResolvedColors;
  font: ThemeFont;
  codeTheme: CodeTheme;
  isDark: boolean;
  radius: typeof RADIUS;
};

export const RADIUS = { sm: 8, md: 16, lg: 24, pill: 999 } as const;

const WINDOW_DOTS = ["#FF5F57", "#FEBC2E", "#28C840"] as const;

/** Keeps the preset's code colors when they still suit the background. */
const pickCodeTheme = (preset: CodeTheme, isDark: boolean): CodeTheme => {
  const presetIsDark = preset !== "github-light-default";
  if (presetIsDark === isDark) return preset;
  return isDark ? "github-dark-default" : "github-light-default";
};

/**
 * Applies a spec's theme setting to its preset. Colors the creator picks are
 * kept exactly; colors worked out from them (muted text, cards, the accent
 * as text) are adjusted so they stay readable.
 */
export const resolveTheme = (setting?: ThemeSetting): ResolvedTheme => {
  const presetName = setting?.preset ?? DEFAULT_THEME_PRESET;
  const preset = THEME_PRESETS[presetName] ?? THEME_PRESETS.midnight;
  const colors: ThemeColors = { ...preset.colors };

  if (setting?.background) {
    const background = setting.background;
    colors.background = background;
    // The preset's text may not read on the new background. Aim well above
    // the minimum, so it also reads on the cards worked out below.
    if (contrastRatio(colors.text, background) < AA_TEXT) {
      colors.text = ensureContrast(colors.text, background, 7);
    }
    colors.surface = mix(background, colors.text, 0.05);
    colors.surfaceBorder = mix(background, colors.text, 0.16);
  }
  if (setting?.text) {
    colors.text = setting.text;
  }
  if (setting?.background || setting?.text) {
    colors.textMuted = ensureContrast(
      mix(colors.text, colors.background, 0.3),
      colors.background,
    );
  }
  if (setting?.accent) {
    colors.accent = setting.accent;
    colors.accentText = readableOn(setting.accent);
  }
  if (setting?.accent || setting?.background) {
    colors.accentBright = ensureContrast(
      setting.accent
        ? mix(colors.accent, colors.text, 0.25)
        : colors.accentBright,
      colors.background,
    );
  }

  const isDark = isDarkColor(colors.background);
  return {
    preset: presetName,
    colors: {
      ...colors,
      // Captions are large and bold, so the large-text minimum applies.
      captionActiveText:
        contrastRatio(colors.text, colors.accent) >= AA_LARGE_TEXT
          ? colors.text
          : colors.accentText,
      lineHighlight: withAlpha(colors.accent, 0.16),
      lineHighlightBorder: colors.accent,
      windowDots: WINDOW_DOTS,
    },
    font: setting?.font ?? preset.font,
    codeTheme: pickCodeTheme(preset.codeTheme, isDark),
    isDark,
    radius: RADIUS,
  };
};

type ColorName = Exclude<keyof ResolvedColors, "windowDots">;

const PAIRS: {
  label: string;
  foreground: ColorName;
  background: ColorName;
  minimum: number;
}[] = [
  {
    label: "Text",
    foreground: "text",
    background: "background",
    minimum: AA_TEXT,
  },
  {
    label: "Text on cards",
    foreground: "text",
    background: "surface",
    minimum: AA_TEXT,
  },
  {
    label: "Secondary text",
    foreground: "textMuted",
    background: "background",
    minimum: AA_TEXT,
  },
  {
    label: "Highlighted words",
    foreground: "accentBright",
    background: "background",
    minimum: AA_TEXT,
  },
  {
    label: "Button labels",
    foreground: "accentText",
    background: "accent",
    minimum: AA_LARGE_TEXT,
  },
  {
    label: "Spoken caption word",
    foreground: "captionActiveText",
    background: "accent",
    minimum: AA_LARGE_TEXT,
  },
];

/**
 * Color pairs that fall short of WCAG AA: 4.5:1 for text, and 3:1 for the
 * large, bold text on the accent (buttons, list numbers, spoken captions). Presets have none; custom colors can, so the studio warns.
 */
export const getContrastIssues = (theme: ResolvedTheme) =>
  PAIRS.flatMap(({ label, foreground, background, minimum }) => {
    const ratio = contrastRatio(
      theme.colors[foreground],
      theme.colors[background],
    );
    return ratio < minimum
      ? [{ label, ratio: Math.round(ratio * 10) / 10, minimum }]
      : [];
  });
