import { random } from "remotion";

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

export type ShapeKind = "circle" | "ring" | "square" | "triangle" | "plus";
const SHAPE_KINDS: ShapeKind[] = [
  "circle",
  "ring",
  "square",
  "triangle",
  "plus",
];

export type FloatingShape = {
  kind: ShapeKind;
  /** Resting position, as fractions of the frame's width and height. */
  x: number;
  y: number;
  /** Fraction of the frame's shorter side. */
  size: number;
  /** How far it wanders from its resting place, as a fraction of the shorter side. */
  drift: number;
  /** Frames for one full wander, so shapes move out of step with each other. */
  period: number;
  /** Starting point in its wander, in radians. */
  phase: number;
  /** Degrees turned per second; negative turns the other way. */
  spin: number;
  opacity: number;
};

/**
 * Shapes for the "shapes" background. The same seed always gives the same
 * shapes, so renders match the preview frame for frame.
 */
export const getFloatingShapes = (seed: string, count = 9): FloatingShape[] =>
  Array.from({ length: count }, (_, index) => {
    const r = (key: string) => random(`${seed}-shape-${index}-${key}`);
    // Spread shapes across a grid of cells first, so they don't clump.
    const columns = 3;
    const rows = Math.ceil(count / columns);
    const cellX = (index % columns) / columns;
    const cellY = Math.floor(index / columns) / rows;
    return {
      kind: SHAPE_KINDS[Math.floor(r("kind") * SHAPE_KINDS.length)]!,
      x: cellX + (0.15 + r("x") * 0.7) / columns,
      y: cellY + (0.15 + r("y") * 0.7) / rows,
      size: 0.05 + r("size") * 0.09,
      drift: 0.02 + r("drift") * 0.04,
      period: 240 + Math.round(r("period") * 360),
      phase: r("phase") * Math.PI * 2,
      spin: (r("spin") - 0.5) * 24,
      opacity: 0.12 + r("opacity") * 0.14,
    };
  });

export type Particle = {
  /** Fraction of the frame's width. */
  x: number;
  /** Starting height, as a fraction of the frame's height. */
  y: number;
  /** Fraction of the frame's height risen per second. */
  speed: number;
  /** Fraction of the frame's shorter side. */
  size: number;
  /** Frames for one twinkle. */
  twinkle: number;
  phase: number;
};

/** Specks for the "particles" background. Same seed, same specks. */
export const getParticles = (seed: string, count = 36): Particle[] =>
  Array.from({ length: count }, (_, index) => {
    const r = (key: string) => random(`${seed}-particle-${index}-${key}`);
    return {
      x: r("x"),
      y: r("y"),
      speed: 0.01 + r("speed") * 0.025,
      size: 0.003 + r("size") * 0.006,
      twinkle: 60 + Math.round(r("twinkle") * 90),
      phase: r("phase") * Math.PI * 2,
    };
  });

/**
 * Where a particle is on a frame, as fractions of the frame. It rises and
 * wraps from the top back to the bottom, a little past each edge so it never
 * pops in or out on screen.
 */
export const particleAt = (
  particle: Particle,
  frame: number,
  fps: number,
): { x: number; y: number; opacity: number } => {
  const margin = 0.05;
  const span = 1 + margin * 2;
  const risen = (particle.speed * frame) / fps;
  const y = ((((particle.y - risen + margin) % span) + span) % span) - margin;
  const x = particle.x + Math.sin(frame / 50 + particle.phase) * 0.008;
  const opacity =
    0.35 +
    0.35 * Math.sin((frame / particle.twinkle) * Math.PI * 2 + particle.phase);
  return { x, y, opacity };
};
