import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { MUSIC_TRACKS } from "../src/lib/music";
import { makeHighPass } from "./synth";

/** RMS of a bed's 16-bit mono WAV, full range and above 300 Hz (what a phone speaker plays). */
const levels = (src: string) => {
  const file = readFileSync(path.join(import.meta.dirname, "../public", src));
  const sampleRate = file.readUInt32LE(24);
  const length = file.readUInt32LE(40) / 2;
  const highPass = makeHighPass(300, sampleRate);
  let full = 0;
  let speaker = 0;
  for (let i = 0; i < length; i++) {
    const value = file.readInt16LE(44 + i * 2) / 32768;
    full += value * value;
    speaker += highPass(value) ** 2;
  }
  return {
    full: Math.sqrt(full / length),
    speaker: Math.sqrt(speaker / length),
  };
};

const beds = Object.values(MUSIC_TRACKS).map((track) => ({
  src: track.src,
  ...levels(track.src),
}));

test("the beds keep most of their level on a phone speaker", () => {
  // Bass-heavy beds measured 0.39-0.45 here and all but vanished on phones.
  for (const bed of beds) {
    assert.ok(
      bed.speaker / bed.full > 0.65,
      `${bed.src}: only ${((bed.speaker / bed.full) * 100).toFixed(0)}% of its level is above 300 Hz`,
    );
  }
});

test("the beds are equally loud on a phone speaker", () => {
  const speaker = beds.map((bed) => bed.speaker);
  assert.ok(
    Math.max(...speaker) / Math.min(...speaker) < 1.1,
    `levels above 300 Hz differ: ${speaker.map((level) => level.toFixed(3)).join(", ")}`,
  );
});
