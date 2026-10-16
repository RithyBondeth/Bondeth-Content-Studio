import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { videoSpecSchema } from "../spec/schema";
import {
  DEFAULT_MUSIC_VOLUME,
  findBundledTrack,
  MUSIC_MOODS,
  MUSIC_TRACKS,
  musicUploadExtension,
  musicUploadFileName,
  uploadedTrackLabel,
} from "./music";

const HASH = "0123456789abcdef0123456789abcdef";

test("every mood has a bundled bed, and its file is in public/", () => {
  for (const mood of MUSIC_MOODS) {
    const track = MUSIC_TRACKS[mood];
    assert.equal(track.mood, mood);
    assert.ok(
      existsSync(path.join(import.meta.dirname, "../../public", track.src)),
      `${track.src} is missing; run npm run music`,
    );
  }
});

test("the default volume matches the schema's", () => {
  const spec = videoSpecSchema.parse({
    version: 1,
    title: "T",
    music: { src: "music/calm.wav" },
    scenes: [{ type: "statement", text: "Hi", narration: "Hi." }],
  });
  assert.equal(spec.music?.volume, DEFAULT_MUSIC_VOLUME);
});

test("finds bundled beds by src, and nothing else", () => {
  assert.equal(findBundledTrack("music/upbeat.wav")?.mood, "upbeat");
  assert.equal(
    findBundledTrack("content/plan/01-video/music-song-0123456789.mp3"),
    undefined,
  );
});

test("accepts common audio formats by extension, in any case", () => {
  assert.equal(musicUploadExtension("song.mp3"), "mp3");
  assert.equal(musicUploadExtension("Song.WAV"), "wav");
  assert.equal(musicUploadExtension("loop.final.m4a"), "m4a");
  assert.equal(musicUploadExtension("notes.txt"), null);
  assert.equal(musicUploadExtension("mp3"), null);
  assert.equal(musicUploadExtension("song.mp3.exe"), null);
});

test("names uploads after the original file plus a content hash", () => {
  assert.equal(
    musicUploadFileName("My Café Song (final).MP3", HASH),
    "music-my-cafe-song-final-0123456789.mp3",
  );
  assert.equal(
    musicUploadFileName("!!!.wav", HASH),
    "music-track-0123456789.wav",
  );
  assert.equal(musicUploadFileName("../../etc/passwd", HASH), null);
  const long = musicUploadFileName(`${"a".repeat(100)}.ogg`, HASH)!;
  assert.equal(long, `music-${"a".repeat(40)}-0123456789.ogg`);
});

test("upload names never contain path separators", () => {
  const name = musicUploadFileName("../../../evil/../song.mp3", HASH)!;
  assert.ok(!name.includes("/") && !name.includes(".."), name);
});

test("labels an uploaded track by the name it was stored under", () => {
  const src = `content/plan/01-video/${musicUploadFileName("My Café Song.mp3", HASH)}`;
  assert.equal(uploadedTrackLabel(src), "my cafe song");
  assert.equal(uploadedTrackLabel("https://example.com/a.mp3"), "a.mp3");
});
