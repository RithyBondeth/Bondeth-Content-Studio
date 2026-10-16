import { fonts } from "./fonts";

// Design tokens shared by every scene. Change these to rebrand all videos.
export const theme = {
  colors: {
    background: "#0B0F17",
    surface: "#111827",
    surfaceBorder: "#1F2937",
    text: "#E5E7EB",
    textMuted: "#9CA3AF",
    accent: "#7C5CFF",
    accentText: "#FFFFFF",
    lineHighlight: "rgba(124, 92, 255, 0.16)",
    lineHighlightBorder: "#7C5CFF",
    windowDots: ["#FF5F57", "#FEBC2E", "#28C840"],
  },
  fonts,
  radius: {
    sm: 8,
    md: 16,
    lg: 24,
    pill: 999,
  },
  // Syntax-highlighting theme name; must match the theme loaded in lib/highlight.ts.
  codeTheme: "github-dark-default",
} as const;

export type Theme = typeof theme;
