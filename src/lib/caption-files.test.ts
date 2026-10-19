import assert from "node:assert/strict";
import { test } from "node:test";
import { videoSpecSchema } from "../spec/schema";
import {
  formatCueTime,
  getCaptionCues,
  toSrt,
  toWebVtt,
} from "./caption-files";
import { FPS, getVideoTiming } from "./timing";

const word = (text: string, start: number) => ({
  text,
  start,
  end: start + 0.3,
});

const spec = videoSpecSchema.parse({
  version: 1,
  title: "Test",
  scenes: [
    {
      type: "statement",
      text: "Hello",
      narration: "One two three four.",
      audio: {
        src: "a.mp3",
        durationInSeconds: 2,
        words: [
          word("One", 0),
          word("two", 0.4),
          word("three", 0.8),
          word("four.", 1.2),
        ],
      },
    },
    {
      type: "statement",
      text: "Bye",
      narration: "Five six.",
      audio: {
        src: "b.mp3",
        durationInSeconds: 1,
        words: [word("Five", 0.1), word("six.", 0.5)],
      },
    },
  ],
});

test("cue times are absolute across the whole video", () => {
  const timing = getVideoTiming(spec);
  const cues = getCaptionCues(spec, timing, "vertical");
  assert.deepEqual(
    cues.map((cue) => cue.text),
    ["One two three", "four.", "Five six."],
  );
  // The first page ends when the next one starts.
  assert.equal(cues[0]!.end, 1.2);
  const second = timing.starts[1]! / FPS;
  assert.ok(Math.abs(cues[2]!.start - (second + 0.1)) < 1e-9);
  // Cues never overlap.
  for (let i = 1; i < cues.length; i++) {
    assert.ok(cues[i]!.start >= cues[i - 1]!.end - 1e-9);
  }
});

test("landscape captions use longer pages", () => {
  const cues = getCaptionCues(spec, getVideoTiming(spec), "landscape");
  assert.equal(cues[0]!.text, "One two three four.");
});

test("scenes without a voice-over still get estimated captions", () => {
  const silent = videoSpecSchema.parse({
    version: 1,
    title: "Silent",
    scenes: [{ type: "statement", text: "Hi", narration: "Just some words." }],
  });
  const cues = getCaptionCues(silent, getVideoTiming(silent), "landscape");
  assert.equal(cues.length, 1);
  assert.equal(cues[0]!.text, "Just some words.");
});

test("cue times are formatted for each file type", () => {
  assert.equal(formatCueTime(3723.4567, ","), "01:02:03,457");
  assert.equal(formatCueTime(0.05, "."), "00:00:00.050");
});

test("SRT and WebVTT text", () => {
  const cues = [
    { start: 0, end: 1.5, text: "Hello there" },
    { start: 1.5, end: 2, text: "a <b> & c --> d" },
  ];
  assert.equal(
    toSrt(cues),
    "1\n00:00:00,000 --> 00:00:01,500\nHello there\n\n2\n00:00:01,500 --> 00:00:02,000\na <b> & c --> d\n",
  );
  assert.equal(
    toWebVtt(cues),
    "WEBVTT\n\n00:00:00.000 --> 00:00:01.500\nHello there\n\n00:00:01.500 --> 00:00:02.000\na &lt;b> &amp; c -> d\n",
  );
});
