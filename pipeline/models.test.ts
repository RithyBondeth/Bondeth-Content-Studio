import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CLAUDE_MODELS,
  describeModel,
  isTextModel,
  modelChoices,
} from "./models";

test("Claude's list has exactly one recommended model, the default", () => {
  const recommended = CLAUDE_MODELS.filter((model) => model.recommended);
  assert.deepEqual(
    recommended.map((model) => model.id),
    ["claude-opus-5-5"],
  );
});

test("describeModel reads the kind from whole words in the name", () => {
  assert.match(describeModel("gpt-6-luna-mini") ?? "", /Faster/);
  assert.match(describeModel("gemini-3.5-flash-lite") ?? "", /Faster/);
  assert.match(describeModel("llama-3.1-8b-instant") ?? "", /Faster/);
  assert.match(describeModel("gemini-3.1-pro") ?? "", /most capable/);
  assert.match(describeModel("llama-3.3-70b-versatile") ?? "", /most capable/);
  // "gemini" contains "mini" but isn't a small model.
  assert.equal(describeModel("gemini-4-argon"), undefined);
});

test("isTextModel leaves out embedding, speech, and image models", () => {
  assert.equal(isTextModel("text-embedding-3-large"), false);
  assert.equal(isTextModel("whisper-1"), false);
  assert.equal(isTextModel("gpt-image-2"), false);
  assert.equal(isTextModel("gpt-6-astra"), true);
});

test("modelChoices keeps the current model even when it isn't listed", () => {
  const choices = modelChoices("openai", ["b-model", "a-model"], "my-model");
  assert.deepEqual(
    choices.map((choice) => choice.id),
    ["my-model", "a-model", "b-model"],
  );
  assert.equal(
    modelChoices("anthropic", [], "claude-opus-5-5").length,
    CLAUDE_MODELS.length,
  );
});
