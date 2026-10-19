import assert from "node:assert/strict";
import { test } from "node:test";
import { toVoiceSummary } from "./voices";

test("ElevenLabs voices become summaries, without empty fields", () => {
  assert.deepEqual(
    toVoiceSummary({
      voice_id: "abc",
      name: "George",
      category: "premade",
      labels: { accent: "british" },
      description: "  ",
      preview_url: "https://example.com/george.mp3",
    }),
    {
      id: "abc",
      name: "George",
      category: "premade",
      labels: { accent: "british" },
      previewUrl: "https://example.com/george.mp3",
    },
  );
  assert.deepEqual(toVoiceSummary({ voice_id: "xyz", labels: null }), {
    id: "xyz",
    name: "xyz",
    labels: {},
  });
});
