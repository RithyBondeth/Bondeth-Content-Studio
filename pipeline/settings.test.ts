import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { resolveProvider } from "./providers";
import {
  applySettingsInput,
  maskKey,
  mergeSettings,
  readSettings,
  writeSettings,
} from "./settings";

test("with no saved settings, .env is used as is", () => {
  const env = { ANTHROPIC_API_KEY: "sk-env", ELEVENLABS_API_KEY: "el" };
  assert.deepEqual(mergeSettings(env, {}), env);
});

test("saved keys override .env", () => {
  const merged = mergeSettings(
    { ELEVENLABS_API_KEY: "old", OPENAI_API_KEY: "old", PEXELS_API_KEY: "p" },
    {
      elevenLabs: { apiKey: "new", voiceId: "voice" },
      openai: { apiKey: " new-openai " },
      pexels: { apiKey: "  " },
    },
  );
  assert.equal(merged.ELEVENLABS_API_KEY, "new");
  assert.equal(merged.ELEVENLABS_VOICE_ID, "voice");
  assert.equal(merged.OPENAI_API_KEY, "new-openai");
  // A blank saved value doesn't hide the .env one.
  assert.equal(merged.PEXELS_API_KEY, "p");
});

test("a Claude key saved in Settings makes Claude ready", () => {
  const merged = mergeSettings(
    {},
    {
      ai: { provider: "anthropic", providers: { anthropic: { apiKey: "sk" } } },
    },
  );
  const provider = resolveProvider(merged);
  assert.equal(provider.ready, true);
  assert.equal(provider.apiKey, "sk");
  assert.equal(provider.model, "claude-opus-5-5");
});

test("switching provider in Settings drops .env's settings for the other one", () => {
  const env = {
    LLM_PROVIDER: "openai",
    LLM_MODEL: "gpt-x",
    LLM_API_KEY: "sk-openai",
    LLM_BASE_URL: "https://proxy.example/v1",
    ANTHROPIC_API_KEY: "sk-ant",
  };
  const provider = resolveProvider(
    mergeSettings(env, { ai: { provider: "anthropic" } }),
  );
  assert.equal(provider.id, "anthropic");
  // Falls back to the provider's own key variable, not the OpenAI one.
  assert.equal(provider.apiKey, "sk-ant");
  assert.equal(provider.model, "claude-opus-5-5");
  assert.equal(provider.baseUrl, undefined);
});

test("the same provider in both merges field by field", () => {
  const env = {
    LLM_PROVIDER: "groq",
    LLM_MODEL: "env-model",
    GROQ_API_KEY: "g",
  };
  const provider = resolveProvider(
    mergeSettings(env, {
      ai: { provider: "groq", providers: { groq: { model: "saved-model" } } },
    }),
  );
  assert.equal(provider.model, "saved-model");
  assert.equal(provider.apiKey, "g");
  assert.equal(provider.ready, true);
});

test("saving a section keeps the saved key unless a new one is typed", () => {
  const saved = applySettingsInput(
    {},
    {
      section: "ai",
      provider: "openai",
      model: " gpt-x ",
      baseUrl: "",
      apiKey: " sk-1 ",
    },
  );
  assert.deepEqual(saved.ai?.providers?.openai, {
    apiKey: "sk-1",
    model: "gpt-x",
    baseUrl: undefined,
  });

  const kept = applySettingsInput(saved, {
    section: "ai",
    provider: "openai",
    model: "gpt-y",
    baseUrl: "",
  });
  assert.equal(kept.ai?.providers?.openai?.apiKey, "sk-1");
  assert.equal(kept.ai?.providers?.openai?.model, "gpt-y");

  // Another provider's entry is left alone.
  const switched = applySettingsInput(kept, {
    section: "ai",
    provider: "anthropic",
    model: "",
    baseUrl: "",
    apiKey: "sk-ant",
  });
  assert.equal(switched.ai?.provider, "anthropic");
  assert.equal(switched.ai?.providers?.openai?.apiKey, "sk-1");

  const cleared = applySettingsInput(
    { pexels: { apiKey: "p" } },
    { section: "pexels", clearKey: true, apiKey: "ignored" },
  );
  assert.equal(cleared.pexels?.apiKey, undefined);

  assert.throws(() =>
    applySettingsInput(
      {},
      // @ts-expect-error not a provider
      { section: "ai", provider: "nope", model: "", baseUrl: "" },
    ),
  );
});

test("settings round-trip through the file, and a missing or broken file reads as empty", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "studio-settings-"));
  const file = path.join(dir, "nested", "settings.json");
  try {
    assert.deepEqual(readSettings(file), {});
    writeSettings({ pexels: { apiKey: "p" } }, file);
    assert.deepEqual(readSettings(file), { pexels: { apiKey: "p" } });
    if (process.platform !== "win32") {
      assert.equal(fs.statSync(file).mode & 0o777, 0o600);
    }
    fs.writeFileSync(file, "{not json");
    assert.deepEqual(readSettings(file), {});
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("keys are masked to their last four characters", () => {
  assert.equal(maskKey("sk-ant-1234567890abcd"), "••••abcd");
  assert.equal(maskKey("short"), "••••");
  assert.equal(maskKey(""), undefined);
  assert.equal(maskKey(undefined), undefined);
});
