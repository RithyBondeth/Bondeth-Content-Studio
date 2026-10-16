import assert from "node:assert/strict";
import { test } from "node:test";
import { alignmentToWords } from "./alignment";

test("groups character timings into words", () => {
  const text = "Hi there, you.";
  const characters = [...text];
  const starts = characters.map((_, index) => index * 0.1);
  const ends = characters.map((_, index) => index * 0.1 + 0.08);

  assert.deepEqual(
    alignmentToWords({
      characters,
      character_start_times_seconds: starts,
      character_end_times_seconds: ends,
    }).map((word) => ({
      ...word,
      start: +word.start.toFixed(2),
      end: +word.end.toFixed(2),
    })),
    [
      { text: "Hi", start: 0, end: 0.18 },
      { text: "there,", start: 0.3, end: 0.88 },
      { text: "you.", start: 1, end: 1.38 },
    ],
  );
});

test("ignores leading, trailing, and repeated whitespace", () => {
  const characters = [..." a  b "];
  const times = characters.map((_, index) => index);
  const words = alignmentToWords({
    characters,
    character_start_times_seconds: times,
    character_end_times_seconds: times,
  });
  assert.deepEqual(
    words.map((word) => word.text),
    ["a", "b"],
  );
});
