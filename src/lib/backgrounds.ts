/**
 * The moving backdrops a video can sit on. Each one is drawn in the theme's
 * own colors, so every style works with every theme. Plain data, so the
 * studio can list them without loading the video code.
 */
export const BACKGROUNDS = {
  glow: {
    label: "Glow",
    description: "Drifting accent glows over a faint dot grid",
  },
  gradient: {
    label: "Gradient",
    description: "A soft gradient that slowly shifts",
  },
  shapes: {
    label: "Shapes",
    description: "Outlined shapes floating in the background",
  },
  particles: {
    label: "Particles",
    description: "Tiny specks of light rising slowly",
  },
  grid: {
    label: "Grid",
    description: "Graph-paper lines drifting diagonally",
  },
  noise: {
    label: "Grain",
    description: "Subtle film grain with a soft glow",
  },
  plain: {
    label: "Plain",
    description: "Just the theme's background color",
  },
} as const;

export type BackgroundStyle = keyof typeof BACKGROUNDS;
export const BACKGROUND_STYLES = Object.keys(BACKGROUNDS) as [
  BackgroundStyle,
  ...BackgroundStyle[],
];
/** The original look. Specs without a background use it. */
export const DEFAULT_BACKGROUND: BackgroundStyle = "glow";
