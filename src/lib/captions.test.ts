import assert from "node:assert/strict";
import { test } from "node:test";
import { estimateWordTimings, toCaptionPages } from "./captions";

test("estimated timings cover the narration in order", () => {
  const words = estimateWordTimings("One two three four.", 4);
  assert.equal(words.length, 4);
  for (let i = 1; i < words.length; i++) {
    assert.ok(words[i]!.start >= words[i - 1]!.end - 1e-9);
  }
  assert.ok(words.at(-1)!.end <= 4);
});

test("pages break at the word limit, sentence ends, and pauses", () => {
  const at = (text: string, start: number) => ({
    text,
    start,
    end: start + 0.2,
  });
  const pages = toCaptionPages(
    [
      at("one", 0),
      at("two", 0.3),
      at("three.", 0.6),
      at("four", 0.9),
      at("five", 2),
      at("six", 2.3),
      at("seven", 2.6),
      at("eight", 2.9),
    ],
    3,
  );
  assert.deepEqual(
    pages.map((page) => page.words.map((word) => word.text).join(" ")),
    ["one two three.", "four", "five six seven", "eight"],
  );
});
