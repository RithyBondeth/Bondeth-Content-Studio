import type { Scene } from "../spec/schema";

/** How loud the music plays while the narrator speaks, relative to its normal volume. */
export const DUCKED_VOLUME = 0.4;
/** Frames the music takes to fade down before speech, and back up after it. */
export const DUCK_FADE_FRAMES = 6;
/** Pauses shorter than this stay ducked, so the music doesn't pump between words. */
const MERGE_GAP_FRAMES = 15;

/** A stretch of narration, in frames of the video: from `start` up to `end`. */
export type Span = { start: number; end: number };

/**
 * When the voice-over is playing, from each scene's word timings offset by
 * the scene's start frame. Words close together are merged into one span.
 * Scenes without recorded audio have no voice-over, so they add nothing.
 */
export const getNarrationSpans = (
  scenes: Pick<Scene, "audio">[],
  starts: number[],
  fps: number,
): Span[] => {
  const words = scenes
    .flatMap((scene, index) =>
      (scene.audio?.words ?? []).map((word) => ({
        start: starts[index]! + word.start * fps,
        end: starts[index]! + word.end * fps,
      })),
    )
    .filter((span) => span.end > span.start)
    .sort((a, b) => a.start - b.start);

  const spans: Span[] = [];
  for (const word of words) {
    const last = spans[spans.length - 1];
    if (last && word.start - last.end < MERGE_GAP_FRAMES) {
      last.end = Math.max(last.end, word.end);
    } else {
      spans.push({ ...word });
    }
  }
  return spans;
};

/**
 * Multiplier for the music volume at `frame`: 1 away from narration and
 * DUCKED_VOLUME during it, fading over DUCK_FADE_FRAMES so the music is
 * already down when a word starts and comes back up after the last one.
 */
export const getDuckFactor = (frame: number, spans: Span[]): number => {
  let ducked = 0;
  for (const { start, end } of spans) {
    if (frame < start - DUCK_FADE_FRAMES) {
      break;
    }
    const amount =
      frame < start
        ? (frame - (start - DUCK_FADE_FRAMES)) / DUCK_FADE_FRAMES
        : frame <= end
          ? 1
          : 1 - (frame - end) / DUCK_FADE_FRAMES;
    ducked = Math.max(ducked, Math.min(1, Math.max(0, amount)));
  }
  return 1 - (1 - DUCKED_VOLUME) * ducked;
};
