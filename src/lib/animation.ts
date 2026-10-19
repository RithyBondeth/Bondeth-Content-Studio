import type { CSSProperties } from "react";
import {
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { Entrance } from "../spec/schema";

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

/** 0 → 1 with a soft, non-bouncy spring, starting at `delay` frames. */
export const useEnter = (delay = 0, damping = 200) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame, fps, delay, config: { damping } });
};

/** Linear 0 → 1 between two frames. */
export const progressBetween = (frame: number, from: number, to: number) =>
  interpolate(frame, [from, to], [0, 1], clamp);

/** Style for an element that fades and rises into place. */
export const riseIn = (progress: number, distance: number) => ({
  opacity: progress,
  transform: `translateY(${(1 - progress) * distance}px)`,
});

const overshoot = Easing.out(Easing.back(2.2));

/**
 * Style for an element coming in with one of the scene entrances, at
 * `progress` (0 → 1, linear) of the way in. `distance` is how far it travels
 * for the moving entrances. Fully in, every entrance leaves the element
 * untouched, so it reads the same once it has arrived.
 */
export const entranceStyle = (
  entrance: Entrance,
  progress: number,
  distance: number,
): CSSProperties => {
  if (progress >= 1) return { opacity: 1 };
  const p = Math.max(0, progress);
  switch (entrance) {
    case "rise":
      return riseIn(p, distance);
    case "slide":
      return {
        opacity: p,
        transform: `translateX(${-(1 - p) * distance * 1.6}px)`,
      };
    case "pop":
      return {
        opacity: Math.min(1, p * 2),
        transform: `scale(${0.6 + 0.4 * overshoot(p)})`,
      };
    case "blur":
      return {
        opacity: p,
        filter: `blur(${(1 - p) * distance * 0.5}px)`,
      };
    case "typewriter":
      return {
        opacity: p > 0 ? 1 : 0,
        clipPath: `inset(-10% ${(1 - p) * 100}% -10% 0)`,
      };
  }
};
