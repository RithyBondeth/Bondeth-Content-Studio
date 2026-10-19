import type { Entrance, Scene, Transition } from "../spec/schema";

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

/**
 * Entrances used when a scene doesn't pick one. All three keep text easy to
 * read; typewriter and blur are left for scenes that ask for them.
 */
export const DEFAULT_ENTRANCES: readonly Entrance[] = ["rise", "slide", "pop"];

/**
 * How a scene's text and items come in: its own entrance, or the next one in
 * turn among scenes of its type. The first list rises, the second slides,
 * the third pops, so repeated templates don't look identical.
 */
export const getSceneEntrance = (
  scenes: readonly Pick<Scene, "type" | "entrance">[],
  index: number,
): Entrance => {
  const scene = scenes[index]!;
  if (scene.entrance) return scene.entrance;
  const before = scenes
    .slice(0, index)
    .filter((other) => other.type === scene.type).length;
  return DEFAULT_ENTRANCES[before % DEFAULT_ENTRANCES.length]!;
};
