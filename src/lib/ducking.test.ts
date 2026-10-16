import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DUCK_FADE_FRAMES,
  DUCKED_VOLUME,
  getDuckFactor,
  getNarrationSpans,
} from "./ducking";

const FPS = 30;

const audio = (words: [start: number, end: number][]) => ({
  audio: {
    src: "a.mp3",
    durationInSeconds: 10,
    words: words.map(([start, end]) => ({ text: "w", start, end })),
  },
});

test("narration spans are offset by each scene's start", () => {
  const spans = getNarrationSpans(
    [audio([[0, 1]]), audio([[0.5, 2]])],
    [0, 300],
    FPS,
  );
  assert.deepEqual(spans, [
    { start: 0, end: 30 },
    { start: 315, end: 360 },
  ]);
});

test("short pauses between words stay in one span", () => {
  const spans = getNarrationSpans(
    [
      audio([
        [0, 1],
        [1.2, 2],
        // A 2 second pause starts a new span.
        [4, 5],
      ]),
    ],
    [0],
    FPS,
  );
  assert.deepEqual(spans, [
    { start: 0, end: 60 },
    { start: 120, end: 150 },
  ]);
});

test("scenes without audio don't duck the music", () => {
  assert.deepEqual(getNarrationSpans([{}, {}], [0, 90], FPS), []);
  assert.equal(getDuckFactor(45, []), 1);
});

test("the music fades down before speech and back up after it", () => {
  const spans = [{ start: 100, end: 200 }];
  assert.equal(getDuckFactor(0, spans), 1);
  assert.equal(getDuckFactor(100 - DUCK_FADE_FRAMES, spans), 1);
  assert.equal(getDuckFactor(100 - DUCK_FADE_FRAMES / 2, spans), 0.7);
  assert.equal(getDuckFactor(100, spans), DUCKED_VOLUME);
  assert.equal(getDuckFactor(150, spans), DUCKED_VOLUME);
  assert.equal(getDuckFactor(200, spans), DUCKED_VOLUME);
  assert.equal(getDuckFactor(200 + DUCK_FADE_FRAMES / 2, spans), 0.7);
  assert.equal(getDuckFactor(200 + DUCK_FADE_FRAMES, spans), 1);
  assert.equal(getDuckFactor(400, spans), 1);
});

test("the volume never jumps by more than one fade step per frame", () => {
  const spans = [
    { start: 10, end: 40 },
    { start: 50, end: 80 },
  ];
  const step = (1 - DUCKED_VOLUME) / DUCK_FADE_FRAMES + 1e-9;
  for (let frame = 1; frame < 120; frame++) {
    const change = Math.abs(
      getDuckFactor(frame, spans) - getDuckFactor(frame - 1, spans),
    );
    assert.ok(change <= step, `frame ${frame} jumps by ${change}`);
  }
});
