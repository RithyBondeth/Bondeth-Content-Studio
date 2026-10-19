import assert from "node:assert/strict";
import { test } from "node:test";
import { estimateWordTimings } from "./captions";
import type { Scene } from "../spec/schema";
import {
  CUE_LEAD_FRAMES,
  findPhrase,
  findUnmatchedCues,
  getCueFrame,
  getCueFrames,
  moveCuesWithItems,
} from "./cues";

/** One word every half second. */
const timed = (text: string) =>
  text.split(" ").map((word, index) => ({
    text: word,
    start: index * 0.5,
    end: index * 0.5 + 0.4,
  }));

const words = timed(
  "When sunlight enters the atmosphere, it bumps into tiny gas molecules. Short blue waves scatter, so blue light is everywhere.",
);
const FPS = 30;
const frameOf = (index: number) => index * 0.5 * FPS - CUE_LEAD_FRAMES;

test("finds an exact phrase", () => {
  assert.deepEqual(findPhrase(words, "bumps"), { index: 6, length: 1 });
  assert.equal(getCueFrame(words, "bumps", 99, FPS), frameOf(6));
});

test("ignores case and punctuation", () => {
  assert.deepEqual(findPhrase(words, "ATMOSPHERE"), { index: 4, length: 1 });
  assert.deepEqual(findPhrase(words, "molecules!"), { index: 10, length: 1 });
  assert.deepEqual(findPhrase(words, "it's bumps"), undefined);
  assert.deepEqual(
    findPhrase(timed("It's a well-known fact"), "its a well known"),
    { index: 0, length: 3 },
  );
});

test("matches a phrase across several words", () => {
  assert.deepEqual(findPhrase(words, "Short blue waves"), {
    index: 11,
    length: 3,
  });
  assert.deepEqual(findPhrase(words, "atmosphere it bumps"), {
    index: 4,
    length: 3,
  });
  // Words must be whole: "blue wave" is not "blue waves".
  assert.equal(findPhrase(words, "blue wave"), undefined);
});

test("falls back when there is no cue or no match", () => {
  assert.equal(getCueFrame(words, undefined, 12, FPS), 12);
  assert.equal(getCueFrame(words, "", 12, FPS), 12);
  assert.equal(getCueFrame(words, "purple", 12, FPS), 12);
  assert.equal(getCueFrame([], "blue", 12, FPS), 12);
});

test("cues match in order, so a repeated word finds its next mention", () => {
  const frames = getCueFrames({
    words,
    cues: ["blue waves", "blue", undefined],
    fallbacks: [0, 0, 400],
    fps: FPS,
  });
  assert.deepEqual(frames, [frameOf(12), frameOf(16), 400]);
});

test("frames never go backwards", () => {
  const frames = getCueFrames({
    words,
    cues: [undefined, "When"],
    fallbacks: [40, 0],
    fps: FPS,
  });
  assert.deepEqual(frames, [40, 40]);
});

test("works with estimated timings when there is no audio", () => {
  const estimated = estimateWordTimings("One two three, four five.", 5);
  const frame = getCueFrame(estimated, "four five", 0, FPS);
  assert.equal(frame, Math.round(estimated[3]!.start * FPS) - CUE_LEAD_FRAMES);
});

const narration =
  "When sunlight enters the atmosphere, it bumps into tiny gas molecules. Short blue waves scatter, so blue light is everywhere.";
const audio = { src: "voice.mp3", durationInSeconds: 12, words };

test("no unmatched cues when every cue is spoken", () => {
  const scene: Scene = {
    type: "list",
    narration,
    audio,
    heading: "Why blue?",
    items: ["Sunlight", "Molecules", "Scattering"],
    cues: ["sunlight", "gas molecules", ""],
  };
  assert.deepEqual(findUnmatchedCues(scene), []);
});

test("flags list cues that aren't spoken, or only before the previous cue", () => {
  const scene: Scene = {
    type: "list",
    narration,
    audio,
    heading: "Why blue?",
    items: ["Waves", "Sunlight", "Purple", "Light"],
    // "sunlight" is only said before "blue waves", so it can't come after it.
    cues: ["blue waves", "sunlight", "purple", "blue light", "extra"],
  };
  assert.deepEqual(findUnmatchedCues(scene), ["cues.1", "cues.2"]);
});

test("flags stat, comparison, and code cues", () => {
  const base = { narration, audio };
  assert.deepEqual(
    findUnmatchedCues({
      ...base,
      type: "stat",
      value: "1",
      label: "x",
      cue: "red",
    }),
    ["cue"],
  );
  assert.deepEqual(
    findUnmatchedCues({
      ...base,
      type: "comparison",
      left: { label: "A", points: ["a"], cue: "molecules" },
      right: { label: "B", points: ["b"], cue: "sunlight" },
    }),
    ["right.cue"],
  );
  assert.deepEqual(
    findUnmatchedCues({
      ...base,
      type: "code",
      language: "typescript",
      steps: [
        // The first step's cue is ignored.
        { code: "a", cue: "nowhere" },
        { code: "b", cue: "Short blue" },
        { code: "c", cue: "nowhere" },
      ],
    }),
    ["steps.2.cue"],
  );
});

test("flags chart point cues by their path", () => {
  assert.deepEqual(
    findUnmatchedCues({
      narration,
      audio,
      type: "chart",
      heading: "Scattering",
      points: [
        { label: "Gas", value: 1, cue: "gas molecules" },
        { label: "Red", value: 2, cue: "red" },
        { label: "Blue", value: 3 },
        { label: "Light", value: 4, cue: "blue light" },
      ],
    }),
    ["points.1.cue"],
  );
});

test("matches cues against estimated timings when there is no audio", () => {
  const scene: Scene = {
    type: "stat",
    narration: "Seventy three percent of people agree.",
    value: "73%",
    label: "agree",
    cue: "seventy three percent",
  };
  assert.deepEqual(findUnmatchedCues(scene), []);
  assert.deepEqual(findUnmatchedCues({ ...scene, cue: "eighty" }), ["cue"]);
});

test("cues stay with their items when lines are removed or moved", () => {
  const items = ["a", "b", "c"];
  const cues = ["one", "two", "three"];
  // Removed.
  assert.deepEqual(moveCuesWithItems(items, ["a", "c"], cues), [
    "one",
    "three",
  ]);
  assert.deepEqual(moveCuesWithItems(items, ["b", "c"], cues), [
    "two",
    "three",
  ]);
  // Added.
  assert.deepEqual(moveCuesWithItems(items, ["a", "", "b", "c"], cues), [
    "one",
    "",
    "two",
    "three",
  ]);
  // Edited in place.
  assert.deepEqual(moveCuesWithItems(items, ["a", "bee", "c"], cues), cues);
  // Moved.
  assert.deepEqual(moveCuesWithItems(items, ["c", "a", "b"], cues), [
    "three",
    "one",
    "two",
  ]);
  // Trimmed to the items when cues are longer.
  assert.deepEqual(moveCuesWithItems(["a"], ["a"], ["one", "two"]), ["one"]);
  // Cleared when the only cued item is removed.
  assert.equal(
    moveCuesWithItems(items, ["a", "c"], ["", "two", ""]),
    undefined,
  );
  assert.equal(moveCuesWithItems(items, ["a"], undefined), undefined);
});

test("flags timeline and steps cues by their path", () => {
  assert.deepEqual(
    findUnmatchedCues({
      type: "timeline",
      events: [
        { date: "1957", label: "Sputnik", cue: "first satellite" },
        { date: "1969", label: "Moon", cue: "never said" },
      ],
      narration: "The first satellite went up, then people walked on the Moon.",
    }),
    ["events.1.cue"],
  );
  assert.deepEqual(
    findUnmatchedCues({
      type: "steps",
      steps: [
        { title: "Boil", cue: "missing" },
        { title: "Steep", cue: "let it steep" },
      ],
      narration: "Boil the water, then let it steep.",
    }),
    ["steps.0.cue"],
  );
});
