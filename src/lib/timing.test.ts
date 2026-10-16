import assert from "node:assert/strict";
import { test } from "node:test";
import { videoSpecSchema, type VideoSpecInput } from "../spec/schema";
import { FPS, getVideoTiming, TRANSITION_FRAMES } from "./timing";

const timingOf = (scenes: VideoSpecInput["scenes"]) =>
  getVideoTiming(videoSpecSchema.parse({ version: 1, title: "T", scenes }));

const scene = (
  durationInSeconds: number,
  transition?: "fade" | "slide" | "cut",
) => ({
  type: "statement" as const,
  text: "x",
  narration: "x",
  durationInSeconds,
  transition,
});

test("transitions overlap scenes without shortening the video", () => {
  const timing = timingOf([scene(3), scene(4, "slide"), scene(2)]);
  assert.deepEqual(timing.scenes, [3 * FPS, 4 * FPS, 2 * FPS]);
  assert.deepEqual(timing.starts, [0, 3 * FPS, 7 * FPS]);
  assert.equal(timing.total, 9 * FPS);
  // The first scene never transitions in; the rest fade by default.
  assert.deepEqual(timing.transitions, [
    0,
    TRANSITION_FRAMES,
    TRANSITION_FRAMES,
  ]);
  // A scene stays mounted through the next scene's transition.
  assert.deepEqual(timing.sequences, [
    3 * FPS + TRANSITION_FRAMES,
    4 * FPS + TRANSITION_FRAMES,
    2 * FPS,
  ]);
  // TransitionSeries places each sequence at its scene's start.
  const placed = timing.sequences.map(
    (_, i) =>
      timing.sequences.slice(0, i).reduce((a, b) => a + b, 0) -
      timing.transitions.slice(1, i + 1).reduce((a, b) => a + b, 0),
  );
  assert.deepEqual(placed, timing.starts);
});

test("cuts have no transition, and short scenes get shorter transitions", () => {
  const timing = timingOf([scene(0.5), scene(0.6), scene(3, "cut")]);
  assert.deepEqual(timing.transitions, [0, Math.floor(15 / 2), 0]);
  assert.equal(timing.sequences[2], timing.scenes[2]);
});
