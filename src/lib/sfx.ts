import type { Scene, Transition, VideoSpec } from "../spec/schema";
import {
  getChartPointStarts,
  getCodeStepStarts,
  getComparisonStarts,
  getDiagramNodeStarts,
  getListItemStarts,
  getStatCountStart,
} from "./reveals";
import type { VideoTiming } from "./timing";

export type SoundName = "whoosh" | "rise" | "pop" | "tick";

/** Files in public/sfx/, and how loud each one plays. */
export const SOUNDS: Record<
  SoundName,
  { src: string; volume: number; durationInFrames: number }
> = {
  whoosh: { src: "sfx/whoosh.wav", volume: 0.25, durationInFrames: 15 },
  rise: { src: "sfx/rise.wav", volume: 0.25, durationInFrames: 18 },
  pop: { src: "sfx/pop.wav", volume: 0.3, durationInFrames: 5 },
  tick: { src: "sfx/tick.wav", volume: 0.3, durationInFrames: 2 },
};

/** The sound that plays as each transition starts. Fades and cuts are silent. */
const TRANSITION_SOUNDS: Record<Transition, SoundName | undefined> = {
  fade: undefined,
  cut: undefined,
  slide: "whoosh",
  wipe: "whoosh",
  zoom: "rise",
};

export type ScheduledSound = {
  sound: SoundName;
  /** Frame of the video the sound starts on. */
  frame: number;
};

/** Frames, relative to the scene's start, where its parts appear, with the sound for each. */
const getRevealSounds = (
  scene: Scene,
  durationInFrames: number,
  fps: number,
): ScheduledSound[] => {
  const pops = (frames: number[]) =>
    frames.map((frame) => ({ sound: "pop" as const, frame }));
  switch (scene.type) {
    case "list":
      return pops(getListItemStarts(scene, durationInFrames, fps));
    case "chart":
      return pops(getChartPointStarts(scene, durationInFrames, fps));
    case "diagram":
      return pops(getDiagramNodeStarts(scene, durationInFrames, fps));
    case "comparison":
      return pops(getComparisonStarts(scene, durationInFrames, fps));
    case "code":
      // The first step is on screen from the start, so it doesn't pop.
      return pops(getCodeStepStarts(scene, durationInFrames, fps).slice(1));
    case "stat":
      return [{ sound: "tick", frame: getStatCountStart(scene, fps) }];
    default:
      return [];
  }
};

/**
 * Which sound effect plays on which frame: a whoosh or rise as a transition
 * starts, a pop as a list item, chart bar, diagram node, comparison side or code step appears, and a
 * tick as a stat starts counting. Reveal frames come from the same helpers
 * the scene templates animate with, so each sound lands with its visual.
 * Sorted by frame, with at most one sound per frame: when two land on the
 * same frame, the transition wins. Empty when `spec.sfx` is false.
 */
export const getSoundSchedule = (
  spec: Pick<VideoSpec, "sfx" | "scenes">,
  timing: Pick<VideoTiming, "scenes" | "starts" | "transitions" | "total">,
  fps: number,
): ScheduledSound[] => {
  if (spec.sfx === false) {
    return [];
  }
  const sounds: ScheduledSound[] = [];
  spec.scenes.forEach((scene, index) => {
    const start = timing.starts[index]!;
    const transitionSound = TRANSITION_SOUNDS[scene.transition ?? "fade"];
    if (transitionSound && timing.transitions[index]! > 0) {
      sounds.push({ sound: transitionSound, frame: start });
    }
    for (const reveal of getRevealSounds(scene, timing.scenes[index]!, fps)) {
      // Reveals can start between frames; the sound plays on the first frame that shows them.
      sounds.push({
        sound: reveal.sound,
        frame: start + Math.ceil(reveal.frame),
      });
    }
  });

  // A stable sort keeps the transition ahead of a reveal on the same frame.
  const taken = new Set<number>();
  return sounds
    .filter(({ frame }) => frame >= 0 && frame < timing.total)
    .sort((a, b) => a.frame - b.frame)
    .filter(({ frame }) => {
      if (taken.has(frame)) {
        return false;
      }
      taken.add(frame);
      return true;
    });
};
