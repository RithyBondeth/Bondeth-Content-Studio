import assert from "node:assert/strict";
import { test } from "node:test";
import { needsReRecord, speechWindow, spreadWords } from "./recording";

test("words cover the speech span in order, from start to end", () => {
  const words = spreadWords("Plants turn sunlight into food.", 0.4, 3.4);
  assert.deepEqual(
    words.map((word) => word.text),
    ["Plants", "turn", "sunlight", "into", "food."],
  );
  assert.equal(words[0]!.start, 0.4);
  assert.equal(words.at(-1)!.end, 3.4);
  for (const [index, word] of words.entries()) {
    assert.ok(word.end > word.start);
    if (index > 0) assert.ok(word.start >= words[index - 1]!.end);
  }
});

test("longer words get more time", () => {
  const [short, long] = spreadWords("a photosynthesis", 0, 2);
  assert.ok(long!.end - long!.start > short!.end - short!.start);
});

test("a full stop leaves a pause before the next word", () => {
  const [, first, second] = spreadWords("one two. three", 0, 3);
  const plain = spreadWords("one two three", 0, 3);
  assert.ok(second!.start - first!.end > 0);
  assert.equal(plain[2]!.start, plain[1]!.end);
});

test("empty narration has no words, and a zero span doesn't break", () => {
  assert.deepEqual(spreadWords("   ", 0, 2), []);
  const words = spreadWords("Hi there", 1, 1);
  assert.ok(words.every((word) => word.start === 1 && word.end === 1));
});

const audio = (narration: string) => ({
  src: "a.mp3",
  durationInSeconds: 2,
  words: [],
  selfRecorded: { narration },
});

test("a self-recorded scene needs a re-record only when its words change", () => {
  assert.equal(
    needsReRecord({ narration: "Hello there.", audio: audio("Hello there.") }),
    false,
  );
  assert.equal(
    needsReRecord({
      narration: " Hello  there. ",
      audio: audio("Hello there."),
    }),
    false,
  );
  assert.equal(
    needsReRecord({ narration: "Hello you.", audio: audio("Hello there.") }),
    true,
  );
  // ElevenLabs voice-overs and unrecorded scenes are never flagged.
  assert.equal(
    needsReRecord({
      narration: "New",
      audio: { src: "a.mp3", durationInSeconds: 1, words: [] },
    }),
    false,
  );
  assert.equal(needsReRecord({ narration: "New" }), false);
});

test("the speech window trims silence but keeps a little air around the words", () => {
  const window = speechWindow(
    [
      { startInSeconds: 1.2, endInSeconds: 2 },
      { startInSeconds: 2.4, endInSeconds: 4 },
    ],
    6,
  );
  assert.ok(window);
  assert.ok(Math.abs(window.start - 1.05) < 1e-9);
  assert.ok(Math.abs(window.end - 4.25) < 1e-9);
  assert.ok(Math.abs(window.speechStart - 0.15) < 1e-9);
  assert.ok(Math.abs(window.speechEnd - 2.95) < 1e-9);
});

test("the speech window stays inside the recording, and is null for silence", () => {
  const window = speechWindow([{ startInSeconds: 0.05, endInSeconds: 2.9 }], 3);
  assert.equal(window?.start, 0);
  assert.equal(window?.end, 3);
  assert.equal(speechWindow([], 3), null);
});
