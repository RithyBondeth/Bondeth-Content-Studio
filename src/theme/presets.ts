/**
 * Ready-made looks for a video. A spec picks one by name and can override
 * its accent, background, text color, and font. Plain data, so the studio,
 * the pipeline, and tests can use it without loading React or fonts.
 */

/** Syntax-highlighting themes; must match the ones loaded in lib/highlight.ts. */
export const CODE_THEMES = [
  "github-dark-default",
  "github-light-default",
  "github-dark-high-contrast",
] as const;
export type CodeTheme = (typeof CODE_THEMES)[number];

/** Fonts a theme can use for its headings and body text (bundled in public/fonts/). */
export const THEME_FONTS = {
  inter: { label: "Inter", description: "Clean and modern" },
  poppins: { label: "Poppins", description: "Geometric and friendly" },
  nunito: { label: "Nunito", description: "Soft and rounded" },
  montserrat: { label: "Montserrat", description: "Bold and confident" },
  "playfair-display": {
    label: "Playfair Display",
    description: "Elegant serif",
  },
  "atkinson-hyperlegible": {
    label: "Atkinson Hyperlegible",
    description: "Designed to be easy to read",
  },
} as const;
export type ThemeFont = keyof typeof THEME_FONTS;
export const THEME_FONT_NAMES = Object.keys(THEME_FONTS) as [
  ThemeFont,
  ...ThemeFont[],
];

export type ThemeColors = {
  background: string;
  /** Cards, code windows, and diagram nodes. */
  surface: string;
  surfaceBorder: string;
  text: string;
  textMuted: string;
  /** Bars, buttons, and highlights. */
  accent: string;
  /** The accent when used for text on the background. */
  accentBright: string;
  /** Text on top of the accent, e.g. a button label. */
  accentText: string;
};

export type ThemePreset = {
  label: string;
  description: string;
  colors: ThemeColors;
  font: ThemeFont;
  codeTheme: CodeTheme;
};

const presets = {
  // The original look. Existing specs without a theme use it.
  midnight: {
    label: "Midnight",
    description: "Dark navy with a violet glow",
    colors: {
      background: "#0B0F17",
      surface: "#111827",
      surfaceBorder: "#1F2937",
      text: "#E5E7EB",
      textMuted: "#9CA3AF",
      accent: "#7C5CFF",
      accentBright: "#A78BFA",
      accentText: "#FFFFFF",
    },
    font: "inter",
    codeTheme: "github-dark-default",
  },
  paper: {
    label: "Paper",
    description: "Bright and clean, like a printed page",
    colors: {
      background: "#FAF8F3",
      surface: "#FFFFFF",
      surfaceBorder: "#E4DED1",
      text: "#1C1917",
      textMuted: "#57534E",
      accent: "#2563EB",
      accentBright: "#1D4ED8",
      accentText: "#FFFFFF",
    },
    font: "poppins",
    codeTheme: "github-light-default",
  },
  ember: {
    label: "Ember",
    description: "Warm browns with a glowing orange",
    colors: {
      background: "#1A110D",
      surface: "#251813",
      surfaceBorder: "#3D2A21",
      text: "#FBEFE6",
      textMuted: "#CDB4A4",
      accent: "#F97316",
      accentBright: "#FDBA74",
      accentText: "#1A110D",
    },
    font: "playfair-display",
    codeTheme: "github-dark-default",
  },
  chalkboard: {
    label: "Chalkboard",
    description: "Classroom green with chalk yellow",
    colors: {
      background: "#15271F",
      surface: "#1C3329",
      surfaceBorder: "#2D4B3D",
      text: "#F1F5EE",
      textMuted: "#B7C8BC",
      accent: "#FACC15",
      accentBright: "#FDE68A",
      accentText: "#15271F",
    },
    font: "nunito",
    codeTheme: "github-dark-default",
  },
  contrast: {
    label: "High contrast",
    description: "Black, white, and yellow, for the easiest reading",
    colors: {
      background: "#000000",
      surface: "#0D0D0D",
      surfaceBorder: "#6B6B6B",
      text: "#FFFFFF",
      textMuted: "#D9D9D9",
      accent: "#FFD400",
      accentBright: "#FFE14D",
      accentText: "#000000",
    },
    font: "atkinson-hyperlegible",
    codeTheme: "github-dark-high-contrast",
  },
} as const satisfies Record<string, ThemePreset>;

export type ThemePresetName = keyof typeof presets;
export const THEME_PRESETS: Record<ThemePresetName, ThemePreset> = presets;
export const THEME_PRESET_NAMES = Object.keys(presets) as [
  ThemePresetName,
  ...ThemePresetName[],
];
export const DEFAULT_THEME_PRESET: ThemePresetName = "midnight";
