import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { after, test } from "node:test";
import type { VideoSpecInput } from "../src/spec/schema";
import { config, mediaSubdir } from "./config";
import { publicPath } from "./store";
import {
  addVoiceOver,
  audioFileName,
  scenesToRecord,
  toElevenLabsSettings,
  voiceForVideo,
} from "./voice";

const MODEL = "eleven_multilingual_v2";

test("without settings, file names match the ones recorded before voice settings existed", () => {
  // The original formula: sha256 of voice, model, and text.
  const legacy = createHash("sha256")
    .update(["voice-a", MODEL, "Hello there."].join("\n"))
    .digest("hex")
    .slice(0, 10);
  assert.equal(
    audioFileName(2, "Hello there.", { voiceId: "voice-a" }, MODEL),
    `scene-03-${legacy}.mp3`,
  );
  assert.equal(
    audioFileName(
      2,
      "Hello there.",
      { voiceId: "voice-a", settings: {} },
      MODEL,
    ),
    `scene-03-${legacy}.mp3`,
  );
});

test("a different voice or settings gives a different file name", () => {
  const base = audioFileName(0, "Hi.", { voiceId: "a" }, MODEL);
  assert.notEqual(audioFileName(0, "Hi.", { voiceId: "b" }, MODEL), base);
  const slow = audioFileName(
    0,
    "Hi.",
    { voiceId: "a", settings: { speed: 0.9 } },
    MODEL,
  );
  assert.notEqual(slow, base);
  assert.notEqual(
    audioFileName(0, "Hi.", { voiceId: "a", settings: { speed: 1.1 } }, MODEL),
    slow,
  );
});

test("the order settings are written in doesn't change the file name", () => {
  assert.equal(
    audioFileName(
      0,
      "Hi.",
      { voiceId: "a", settings: { speed: 0.9, style: 0.2 } },
      MODEL,
    ),
    audioFileName(
      0,
      "Hi.",
      { voiceId: "a", settings: { style: 0.2, speed: 0.9 } },
      MODEL,
    ),
  );
});

test("settings are renamed for ElevenLabs, leaving out unset ones", () => {
  assert.equal(toElevenLabsSettings(undefined), undefined);
  assert.equal(toElevenLabsSettings({}), undefined);
  assert.deepEqual(toElevenLabsSettings({ similarity: 0.8, speed: 1.1 }), {
    similarity_boost: 0.8,
    speed: 1.1,
  });
});

const spec = (voice?: VideoSpecInput["voice"]): VideoSpecInput => ({
  version: 1,
  title: "T",
  ...(voice ? { voice } : {}),
  scenes: [
    { type: "statement", text: "One", narration: "One." },
    { type: "statement", text: "Two", narration: "Two." },
  ],
});

test("voiceForVideo uses the video's voice, then the project's, then .env", () => {
  assert.equal(voiceForVideo(spec()).voiceId, config.elevenLabs.voiceId);
  assert.equal(
    voiceForVideo(spec(), { projectVoice: { voiceId: "p" } }).voiceId,
    "p",
  );
  assert.equal(
    voiceForVideo(spec({ voiceId: "v" }), { projectVoice: { voiceId: "p" } })
      .voiceId,
    "v",
  );
});

const dir = path.posix.join(mediaSubdir(), `.voice-test-${process.pid}`);
after(() => fs.rm(publicPath(dir), { recursive: true, force: true }));

test("scenesToRecord finds scenes recorded with another voice or settings", async () => {
  const video = spec();
  const voice = voiceForVideo(video);
  // Pretend scene 1 was recorded with the current voice.
  const src = path.posix.join(dir, audioFileName(0, "One.", voice));
  await fs.mkdir(path.dirname(publicPath(src)), { recursive: true });
  await fs.writeFile(publicPath(src), "");
  const scenes = video.scenes.map((scene, index) =>
    index === 0
      ? { ...scene, audio: { src, durationInSeconds: 1, words: [] } }
      : scene,
  );
  const recorded = { ...video, scenes } as VideoSpecInput;

  assert.deepEqual(await scenesToRecord(recorded, dir, voice), [1]);
  assert.deepEqual(
    await scenesToRecord(
      recorded,
      dir,
      voiceForVideo(recorded, { projectVoice: { voiceId: "other" } }),
    ),
    [0, 1],
  );
  assert.deepEqual(
    await scenesToRecord(recorded, dir, { ...voice, settings: { speed: 0.9 } }),
    [0, 1],
  );
});

const selfRecorded = (narration: string) => ({
  src: path.posix.join(dir, "scene-01-own-abc.mp3"),
  durationInSeconds: 2,
  words: [],
  selfRecorded: { narration },
});

test("scenesToRecord leaves out scenes the creator recorded, even out-of-date ones", async () => {
  const video = spec();
  const voice = voiceForVideo(video);
  const recorded = {
    ...video,
    scenes: [
      // Narration changed since recording, and the file is missing too.
      { ...video.scenes[0]!, audio: selfRecorded("Something else.") },
      video.scenes[1]!,
    ],
  } as VideoSpecInput;
  assert.deepEqual(await scenesToRecord(recorded, dir, voice), [1]);
});

test("Record voice keeps self-recorded scenes as they are", async () => {
  const video = spec();
  const audio = selfRecorded("One.");
  const recorded = {
    ...video,
    scenes: video.scenes.map((scene) => ({ ...scene, audio })),
  } as VideoSpecInput;
  // Nothing to generate, so ElevenLabs is never called (no key needed).
  const result = await addVoiceOver(recorded, dir);
  assert.equal(result.generated, 0);
  assert.equal(result.reused, 2);
  assert.deepEqual(
    result.spec.scenes.map((scene) => scene.audio),
    [audio, audio],
  );
});
