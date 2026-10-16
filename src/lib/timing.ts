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

/** Length of a transition between two scenes. */
export const TRANSITION_FRAMES = 15;

/** Frames of the transition into a scene, never more than half of either scene. */
const getTransitionFrames = (
  scene: Scene,
  frames: number,
  previousFrames: number,
) =>
  (scene.transition ?? "fade") === "cut"
    ? 0
    : Math.min(
        TRANSITION_FRAMES,
        Math.floor(frames / 2),
        Math.floor(previousFrames / 2),
      );

export type VideoTiming = {
  /** Frames each scene is on screen, from its start to the next scene's start. */
  scenes: number[];
  /** First frame of each scene, where its voice-over and transition begin. */
  starts: number[];
  /** Frames of the transition into each scene; 0 for the first scene and cuts. */
  transitions: number[];
  /**
   * Length of each scene's sequence. A scene stays mounted while the next one
   * transitions in over it, so the next scene's voice-over starts only after
   * this scene's has finished.
   */
  sequences: number[];
  total: number;
};

export const getVideoTiming = (spec: VideoSpec): VideoTiming => {
  const scenes = spec.scenes.map((scene) =>
    Math.max(1, Math.round(getSceneSeconds(scene) * FPS)),
  );
  const transitions = spec.scenes.map((scene, index) =>
    index === 0
      ? 0
      : getTransitionFrames(scene, scenes[index]!, scenes[index - 1]!),
  );
  const sequences = scenes.map(
    (frames, index) => frames + (transitions[index + 1] ?? 0),
  );
  const starts: number[] = [];
  let total = 0;
  for (const frames of scenes) {
    starts.push(total);
    total += frames;
  }
  return { scenes, starts, transitions, sequences, total };
};
