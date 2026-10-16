import assert from "node:assert/strict";
import { test } from "node:test";
import { findAddedLines } from "./diff-lines";
import { parseLineRanges } from "./line-ranges";

test("parses line ranges", () => {
  assert.deepEqual(parseLineRanges("2,4-6, 9"), [2, 4, 5, 6, 9]);
  assert.deepEqual(parseLineRanges(undefined), []);
  assert.throws(() => parseLineRanges("a-b"));
});

test("marks only new lines as added", () => {
  assert.deepEqual(findAddedLines(["a", "c"], ["a", "b", "c", "d"]), [
    false,
    true,
    false,
    true,
  ]);
  assert.deepEqual(findAddedLines([], ["x"]), [true]);
});
