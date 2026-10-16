import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

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
