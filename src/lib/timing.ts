import type { Scene, VideoSpec } from "../spec/schema";

export const FPS = 30;

/** Pause after each scene's voice-over before the next scene starts. */
const AUDIO_TAIL_SECONDS = 0.35;
/** Reading speed used to size scenes that have no audio yet. */
const WORDS_PER_SECOND = 2.6;
const MIN_SCENE_SECONDS = 2.5;
const MIN_CODE_STEP_SECONDS = 2.5;

export const countWords = (text: string) =>
  text.split(/\s+/).filter(Boolean).length;

/** Estimated narration length when there is no audio yet. */
export const estimateNarrationSeconds = (narration: string) =>
  countWords(narration) / WORDS_PER_SECOND;

export const getSceneSeconds = (scene: Scene): number => {
  const fromContent =
    scene.type === "code" ? scene.steps.length * MIN_CODE_STEP_SECONDS : 0;
  const fromNarration = scene.audio
    ? scene.audio.durationInSeconds + AUDIO_TAIL_SECONDS
    : estimateNarrationSeconds(scene.narration) + 0.5;

  // An explicit duration wins, but never cuts off the voice-over.
  if (scene.durationInSeconds !== undefined) {
    return scene.audio
      ? Math.max(scene.durationInSeconds, fromNarration)
      : scene.durationInSeconds;
  }

  return Math.max(MIN_SCENE_SECONDS, fromNarration, fromContent);
};

export type VideoTiming = {
  /** Length of each scene, in frames. */
  scenes: number[];
  /** First frame of each scene. */
  starts: number[];
  total: number;
};

export const getVideoTiming = (spec: VideoSpec): VideoTiming => {
  const scenes = spec.scenes.map((scene) =>
    Math.round(getSceneSeconds(scene) * FPS),
  );
  const starts: number[] = [];
  let total = 0;
  for (const frames of scenes) {
    starts.push(total);
    total += frames;
  }
  return { scenes, starts, total };
};
