import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CLAUDE_MODELS,
  MODEL_CATALOG,
  describeModel,
  isTextModel,
  modelChoices,
  recommendedModel,
} from "./models";
import { PROVIDERS } from "./providers";

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

test("modelChoices lists the provider's models, then the account's others", () => {
  const choices = modelChoices(
    "openai",
    ["b-model", "gpt-6.1-sol", "a-model", "text-embedding-4"],
    "my-model",
  );
  assert.deepEqual(
    choices.map((choice) => choice.id),
    [
      "my-model",
      ...MODEL_CATALOG.openai!.map((model) => model.id),
      "a-model",
      "b-model",
    ],
  );
});

test("every provider except Custom and LM Studio has a list with one recommended model", () => {
  for (const id of Object.keys(PROVIDERS)) {
    if (id === "custom" || id === "lmstudio") continue;
    const models = MODEL_CATALOG[id] ?? [];
    assert.ok(models.length >= 2, `${id} lists models`);
    assert.equal(
      models.filter((model) => model.recommended).length,
      1,
      `${id} recommends one`,
    );
    assert.equal(recommendedModel(id), models.find((m) => m.recommended)?.id);
    for (const model of models) assert.ok(model.hint, `${model.id} has a hint`);
  }
});
