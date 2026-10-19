import assert from "node:assert/strict";
import { test } from "node:test";
import { whyIsTheSkyBlue } from "../examples/why-is-the-sky-blue";
import {
  videoSpecSchema,
  type Transition,
  type VideoSpecInput,
} from "../spec/schema";
import {
  getChartPointStarts,
  getCodeStepStarts,
  getComparisonStarts,
  getDiagramNodeStarts,
  getListItemStarts,
  getStatCountStart,
} from "./reveals";
import { getSoundSchedule } from "./sfx";
import { FPS, getVideoTiming } from "./timing";

const scheduleOf = (
  scenes: VideoSpecInput["scenes"],
  options: Partial<VideoSpecInput> = {},
) => {
  const spec = videoSpecSchema.parse({
    version: 1,
    title: "T",
    ...options,
    scenes,
  });
  const timing = getVideoTiming(spec);
  return { spec, timing, sounds: getSoundSchedule(spec, timing, FPS) };
};

const statement = (transition?: Transition) => ({
  type: "statement" as const,
  text: "x",
  narration: "x",
  durationInSeconds: 3,
  transition,
});

/** One word every half second. */
const timed = (text: string) =>
  text.split(" ").map((word, index) => ({
    text: word,
    start: index * 0.5,
    end: index * 0.5 + 0.4,
  }));

const list = {
  type: "list" as const,
  heading: "Steps",
  items: ["First", "Second", "Third"],
  cues: ["one", "two", "three"],
  narration: "Count with me one then two then three",
  audio: {
    src: "a.mp3",
    durationInSeconds: 5,
    words: timed("Count with me one then two then three"),
  },
};

test("plays nothing when sfx is off", () => {
  const { sounds } = scheduleOf(
    [statement(), statement("slide"), list, statement("zoom")],
    { sfx: false },
  );
  assert.deepEqual(sounds, []);
});

test("sfx is on by default", () => {
  const { spec, sounds } = scheduleOf([statement(), statement("slide")]);
  assert.equal(spec.sfx, true);
  assert.equal(sounds.length, 1);
});

test("fades, blurs and cuts are silent; moves whoosh; zooms and irises rise", () => {
  const { timing, sounds } = scheduleOf([
    statement(),
    statement("fade"),
    statement("cut"),
    statement("slide"),
    statement("wipe"),
    statement("zoom"),
    statement("blur"),
    statement("push"),
    statement("iris"),
    statement("clock"),
    statement("flip"),
    statement("split"),
  ]);
  assert.deepEqual(sounds, [
    { sound: "whoosh", frame: timing.starts[3] },
    { sound: "whoosh", frame: timing.starts[4] },
    { sound: "rise", frame: timing.starts[5] },
    { sound: "whoosh", frame: timing.starts[7] },
    { sound: "rise", frame: timing.starts[8] },
    { sound: "whoosh", frame: timing.starts[9] },
    { sound: "whoosh", frame: timing.starts[10] },
    { sound: "whoosh", frame: timing.starts[11] },
  ]);
});

test("scenes without a transition use the default rotation's sound", () => {
  const { timing, sounds } = scheduleOf([
    statement(),
    statement(),
    statement(),
    statement(),
  ]);
  // Fade (silent), then slide and zoom.
  assert.deepEqual(sounds, [
    { sound: "whoosh", frame: timing.starts[2] },
    { sound: "rise", frame: timing.starts[3] },
  ]);
});

test("the first scene's transition is ignored", () => {
  const { sounds } = scheduleOf([statement("slide"), statement()]);
  assert.deepEqual(sounds, []);
});

test("one pop per list item, on the frame it appears", () => {
  const { spec, timing, sounds } = scheduleOf([statement(), list]);
  const scene = spec.scenes[1]!;
  assert.equal(scene.type, "list");
  const starts = getListItemStarts(
    scene as typeof scene & { type: "list" },
    timing.scenes[1]!,
    FPS,
  );
  assert.deepEqual(
    sounds,
    starts.map((frame) => ({ sound: "pop", frame: timing.starts[1]! + frame })),
  );
  // The cue words are at 1.5s, 2.5s and 3.5s into the scene.
  assert.deepEqual(starts, [41, 71, 101]);
});

test("one pop per chart point, as its bar starts to grow", () => {
  const { spec, timing, sounds } = scheduleOf([
    statement(),
    {
      type: "chart",
      heading: "Counts",
      points: [
        { label: "First", value: 1, cue: "one" },
        { label: "Second", value: 2, cue: "two" },
        { label: "Third", value: 3, cue: "three" },
      ],
      narration: list.narration,
      audio: list.audio,
    },
  ]);
  const scene = spec.scenes[1]!;
  assert.equal(scene.type, "chart");
  const starts = getChartPointStarts(
    scene as typeof scene & { type: "chart" },
    timing.scenes[1]!,
    FPS,
  );
  // Same cue words as the list: 1.5s, 2.5s and 3.5s into the scene.
  assert.deepEqual(starts, [41, 71, 101]);
  assert.deepEqual(
    sounds,
    starts.map((frame) => ({ sound: "pop", frame: timing.starts[1]! + frame })),
  );
});

test("uncued chart points are spread across the scene, after the heading", () => {
  const { spec, timing } = scheduleOf([
    {
      type: "chart",
      heading: "Counts",
      points: [
        { label: "A", value: 1 },
        { label: "B", value: 2 },
        { label: "C", value: 3 },
        { label: "D", value: 4 },
      ],
      narration: "x",
      durationInSeconds: 4,
    },
  ]);
  const scene = spec.scenes[0] as (typeof spec.scenes)[0] & { type: "chart" };
  const starts = getChartPointStarts(scene, timing.scenes[0]!, FPS);
  assert.equal(starts.length, 4);
  assert.equal(starts[0], 12);
  for (let index = 1; index < starts.length; index++) {
    assert.ok(starts[index]! > starts[index - 1]!);
  }
  assert.ok(starts.at(-1)! < timing.scenes[0]! * 0.7);
});

test("one sound per cue in every cued scene type", () => {
  const { spec, timing, sounds } = scheduleOf(whyIsTheSkyBlue.scenes);
  const expected = spec.scenes.flatMap((scene, index) => {
    const start = timing.starts[index]!;
    const length = timing.scenes[index]!;
    switch (scene.type) {
      case "list":
        return getListItemStarts(scene, length, FPS).map((frame) => ({
          sound: "pop",
          frame: start + frame,
        }));
      case "chart":
        return getChartPointStarts(scene, length, FPS).map((frame) => ({
          sound: "pop",
          frame: start + frame,
        }));
      case "comparison":
        return getComparisonStarts(scene, length, FPS).map((frame) => ({
          sound: "pop",
          frame: start + frame,
        }));
      case "diagram":
        return getDiagramNodeStarts(scene, length, FPS).map((frame) => ({
          sound: "pop",
          frame: start + frame,
        }));
      case "stat":
        return [
          { sound: "tick", frame: start + getStatCountStart(scene, FPS) },
        ];
      default:
        return [];
    }
  });
  const reveals = sounds.filter(
    ({ sound }) => sound === "pop" || sound === "tick",
  );
  assert.deepEqual(reveals, expected);
  // 3 list items, 1 stat, 4 chart bars, 2 comparison sides, 4 diagram nodes.
  assert.equal(reveals.length, 14);
  // Plus the slide, zoom, wipe and slide into the list, stat, comparison and
  // diagram scenes, and the default push, iris and slide into the chart, the
  // second statement and the call to action. The first statement fades in,
  // so it's silent.
  assert.deepEqual(
    sounds.filter(({ sound }) => sound === "whoosh" || sound === "rise"),
    [
      { sound: "whoosh", frame: timing.starts[2] },
      { sound: "rise", frame: timing.starts[3] },
      { sound: "whoosh", frame: timing.starts[4] },
      { sound: "whoosh", frame: timing.starts[5] },
      { sound: "rise", frame: timing.starts[6] },
      { sound: "whoosh", frame: timing.starts[7] },
      { sound: "whoosh", frame: timing.starts[8] },
    ],
  );
});

test("code steps pop from the second step on", () => {
  const { timing, sounds, spec } = scheduleOf([
    {
      type: "code",
      language: "typescript",
      steps: [{ code: "a" }, { code: "b", cue: "then" }, { code: "c" }],
      narration: "First this then that",
      durationInSeconds: 6,
    },
  ]);
  const scene = spec.scenes[0]!;
  assert.equal(scene.type, "code");
  const starts = getCodeStepStarts(
    scene as typeof scene & { type: "code" },
    timing.scenes[0]!,
    FPS,
  );
  assert.equal(starts[0], 0);
  assert.deepEqual(
    sounds,
    starts.slice(1).map((frame) => ({ sound: "pop", frame })),
  );
});

test("never plays two sounds on the same frame", () => {
  // Cues that aren't found never come before an earlier cue, so items whose
  // cues are missing appear together with the last item that was found.
  const together = scheduleOf([
    statement(),
    { ...list, cues: ["three", "missing", "missing"] },
  ]);
  assert.deepEqual(together.sounds, [
    { sound: "pop", frame: together.timing.starts[1]! + 101 },
  ]);

  // An item on the scene's first frame lands on the transition's frame, and
  // the transition wins. The other items keep their own pops.
  const onTransition = scheduleOf([
    statement(),
    { ...list, transition: "slide", cues: ["count"] },
  ]);
  const start = onTransition.timing.starts[1]!;
  assert.deepEqual(
    onTransition.sounds.map(({ sound }) => sound),
    ["whoosh", "pop", "pop"],
  );
  assert.equal(onTransition.sounds[0]!.frame, start);
  assert.ok(onTransition.sounds[1]!.frame > start);
});

test("every sound starts inside the video", () => {
  const { timing, sounds } = scheduleOf(whyIsTheSkyBlue.scenes);
  for (const { frame } of sounds) {
    assert.ok(frame >= 0 && frame < timing.total);
  }
});
