import type { Scene, SceneOf } from "../spec/schema";
import { getSceneWords } from "./captions";
import { getCueFrame, getCueFrames } from "./cues";

// When each part of a scene appears, relative to the scene's first frame. The
// scene templates animate from these frames and the sound effects play on
// them, so a sound always lands as its visual appears.

/** Frames before a list's or chart's first item can appear, while its heading comes in. */
const HEADING_FRAMES = 12;

/**
 * Items under a heading appear one by one, each as the narrator says its
 * cue. Without one, items are revealed evenly across the first 70% of the
 * scene.
 */
const getItemStarts = (
  scene: Scene,
  cues: (string | undefined)[],
  durationInFrames: number,
  fps: number,
): number[] => {
  const revealWindow = Math.max(
    cues.length * 8,
    durationInFrames * 0.7 - HEADING_FRAMES,
  );
  const gap = revealWindow / cues.length;
  return getCueFrames({
    words: getSceneWords(scene),
    cues,
    fallbacks: cues.map((_, index) => HEADING_FRAMES + index * gap),
    fps,
  });
};

/** Each list item appears as the narrator says its cue. */
export const getListItemStarts = (
  scene: SceneOf<"list">,
  durationInFrames: number,
  fps: number,
): number[] =>
  getItemStarts(
    scene,
    scene.items.map((_, index) => scene.cues?.[index]),
    durationInFrames,
    fps,
  );

/** Each chart point's bar grows, or its line segment draws, as the narrator says its cue. */
export const getChartPointStarts = (
  scene: SceneOf<"chart">,
  durationInFrames: number,
  fps: number,
): number[] =>
  getItemStarts(
    scene,
    scene.points.map((point) => point.cue),
    durationInFrames,
    fps,
  );

/**
 * Each comparison side appears when the narration turns to it. Without a
 * cue, the second side appears about a third of the way through.
 */
export const getComparisonStarts = (
  scene: SceneOf<"comparison">,
  durationInFrames: number,
  fps: number,
): [left: number, right: number] => {
  const [left, right] = getCueFrames({
    words: getSceneWords(scene),
    cues: [scene.left.cue, scene.right.cue],
    fallbacks: [6, Math.max(18, Math.round(durationInFrames * 0.33))],
    fps,
  });
  return [left!, right!];
};

/** A stat's count-up starts as the number is spoken. */
export const getStatCountStart = (scene: SceneOf<"stat">, fps: number) =>
  getCueFrame(getSceneWords(scene), scene.cue, 4, fps);

/**
 * Each code step starts at its cue in the narration; without one, the scene
 * is split evenly. The first step always starts with the scene, and every
 * step gets at least one frame.
 */
export const getCodeStepStarts = (
  scene: SceneOf<"code">,
  durationInFrames: number,
  fps: number,
): number[] => {
  const count = scene.steps.length;
  const stepFrames = Math.floor(durationInFrames / count);
  const starts = getCueFrames({
    words: getSceneWords(scene),
    cues: scene.steps.map((step, index) =>
      index === 0 ? undefined : step.cue,
    ),
    fallbacks: scene.steps.map((_, index) => index * stepFrames),
    fps,
  });
  starts[0] = 0;
  for (let index = 1; index < starts.length; index++) {
    starts[index] = Math.min(
      Math.max(starts[index]!, starts[index - 1]! + 1),
      durationInFrames - (count - index),
    );
  }
  return starts;
};
