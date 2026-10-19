import type { Scene, Transition } from "../spec/schema";

/**
 * Transitions used when a scene doesn't pick one, in turn. Calm ones only,
 * and never the same twice in a row, so a video without hand-picked
 * transitions still varies without feeling busy.
 */
export const DEFAULT_TRANSITIONS: readonly Transition[] = [
  "fade",
  "slide",
  "zoom",
  "push",
  "blur",
  "iris",
];

/** How a scene comes in: its own transition, or the next one in the default rotation. */
export const getSceneTransition = (
  scene: Pick<Scene, "transition">,
  index: number,
): Transition =>
  scene.transition ??
  DEFAULT_TRANSITIONS[Math.max(0, index - 1) % DEFAULT_TRANSITIONS.length]!;
