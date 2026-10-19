import assert from "node:assert/strict";
import { test } from "node:test";
import { audibleParts, parseSilences } from "./silence";

const LOG = `
[silencedetect @ 0x1] silence_start: 0.0075
[silencedetect @ 0x1] silence_end: 1.007583 | silence_duration: 1.000083
size=N/A time=00:00:04.90
[silencedetect @ 0x1] silence_start: 3.707458
`;

test("silences are read from the ffmpeg log, the last one running to the end", () => {
  assert.deepEqual(parseSilences(LOG, 4.9), [
    { startInSeconds: 0.0075, endInSeconds: 1.007583 },
    { startInSeconds: 3.707458, endInSeconds: 4.9 },
  ]);
  assert.deepEqual(parseSilences("no silence here", 2), []);
});

test("audible parts are the gaps between silences, leaving out clicks", () => {
  // The 7 ms blip before the first silence is a click, not speech.
  assert.deepEqual(audibleParts(parseSilences(LOG, 4.9), 4.9), [
    { startInSeconds: 1.007583, endInSeconds: 3.707458 },
  ]);
  assert.deepEqual(audibleParts([], 2), [
    { startInSeconds: 0, endInSeconds: 2 },
  ]);
  // All silence: nothing audible.
  assert.deepEqual(
    audibleParts([{ startInSeconds: 0, endInSeconds: 2 }], 2),
    [],
  );
});
