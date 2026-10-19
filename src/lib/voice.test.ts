import assert from "node:assert/strict";
import { test } from "node:test";
import { brandKitSchema, videoSpecSchema } from "../spec/schema";
import {
  cleanVoiceSettings,
  describeScenes,
  filterVoices,
  resolveVoice,
  VOICE_SETTING_NAMES,
  VOICE_SETTING_RANGES,
  voiceLabels,
  type VoiceSummary,
} from "./voice";

const FALLBACK = "env-voice";

test("with nothing set, the fallback (.env or built-in) voice is used, with no settings", () => {
  assert.deepEqual(resolveVoice({ fallbackId: FALLBACK }), {
    voiceId: FALLBACK,
    source: "default",
  });
});

test("the project's voice beats the fallback", () => {
  const voice = resolveVoice({
    project: { voiceId: "project", name: "Ana", settings: { speed: 0.9 } },
    fallbackId: FALLBACK,
  });
  assert.deepEqual(voice, {
    voiceId: "project",
    name: "Ana",
    settings: { speed: 0.9 },
    source: "project",
  });
});

test("the video's voice beats the project's, and doesn't borrow its settings", () => {
  const voice = resolveVoice({
    video: { voiceId: "video" },
    project: { voiceId: "project", settings: { speed: 0.9 } },
    fallbackId: FALLBACK,
  });
  assert.deepEqual(voice, { voiceId: "video", source: "video" });
});

test("--voice beats everything", () => {
  const voice = resolveVoice({
    command: { voiceId: "cli" },
    video: { voiceId: "video" },
    project: { voiceId: "project" },
    fallbackId: FALLBACK,
  });
  assert.equal(voice.voiceId, "cli");
  assert.equal(voice.source, "command");
});

test("a blank voice id is skipped", () => {
  const voice = resolveVoice({
    video: { voiceId: "  " },
    project: { voiceId: " project " },
    fallbackId: FALLBACK,
  });
  assert.equal(voice.voiceId, "project");
});

test("cleanVoiceSettings drops unset values and returns undefined when empty", () => {
  assert.equal(cleanVoiceSettings(undefined), undefined);
  assert.equal(cleanVoiceSettings({}), undefined);
  assert.deepEqual(
    cleanVoiceSettings({ stability: 0, speed: undefined, style: Number.NaN }),
    { stability: 0 },
  );
});

test("slider ranges fit the schema, and defaults are inside them", () => {
  for (const name of VOICE_SETTING_NAMES) {
    const range = VOICE_SETTING_RANGES[name];
    assert.ok(range.min <= range.defaultValue);
    assert.ok(range.defaultValue <= range.max);
    for (const value of [range.min, range.max, range.defaultValue]) {
      assert.ok(
        videoSpecSchema.shape.voice.safeParse({
          voiceId: "v",
          settings: { [name]: value },
        }).success,
        `${name} = ${value} should be valid`,
      );
    }
  }
});

test("specs and brand kits without a voice still parse, unchanged", () => {
  const spec = videoSpecSchema.parse({
    version: 1,
    title: "T",
    scenes: [{ type: "statement", text: "Hi", narration: "Hi." }],
  });
  assert.equal(spec.voice, undefined);
  assert.deepEqual(brandKitSchema.parse({ name: "A" }), { name: "A" });
  assert.equal(
    videoSpecSchema.shape.voice.safeParse({ voiceId: "" }).success,
    false,
  );
});

const voices: VoiceSummary[] = [
  {
    id: "1",
    name: "George",
    category: "premade",
    labels: { gender: "male", age: "middle_aged", accent: "british" },
    description: "Warm storyteller",
  },
  {
    id: "2",
    name: "Sarah",
    labels: { accent: "american", gender: "female", use_case: "news" },
  },
];

test("voiceLabels puts accent, gender, and age first, readably", () => {
  assert.deepEqual(voiceLabels(voices[0]!), ["british", "male", "middle aged"]);
  assert.deepEqual(voiceLabels(voices[1]!), ["american", "female", "news"]);
});

test("filterVoices matches every word across name, labels, and description", () => {
  assert.deepEqual(
    filterVoices(voices, "").map((voice) => voice.id),
    ["1", "2"],
  );
  assert.deepEqual(
    filterVoices(voices, "British warm").map((voice) => voice.id),
    ["1"],
  );
  assert.deepEqual(
    filterVoices(voices, "female").map((voice) => voice.id),
    ["2"],
  );
  assert.deepEqual(filterVoices(voices, "middle aged sarah"), []);
});

test("describeScenes lists scenes from 1", () => {
  assert.equal(describeScenes([1]), "Scene 2");
  assert.equal(describeScenes([0, 2]), "Scenes 1 and 3");
  assert.equal(describeScenes([0, 1, 4]), "Scenes 1, 2 and 5");
});
