import assert from "node:assert/strict";
import { test } from "node:test";
import { extractJson } from "./openai-compatible";
import { resolveProvider } from "./providers";

test("Claude is the default provider", () => {
  const claude = resolveProvider({ ANTHROPIC_API_KEY: "sk" });
  assert.equal(claude.id, "anthropic");
  assert.equal(claude.model, "claude-opus-5-5");
  assert.equal(claude.ready, true);
  assert.equal(
    resolveProvider({
      CLAUDE_MODEL: "claude-sonnet-5-5",
      ANTHROPIC_API_KEY: "sk",
    }).model,
    "claude-sonnet-5-5",
  );
  assert.equal(resolveProvider({}).ready, false);
});

test("OpenAI-compatible providers need a key, and start on their recommended model", () => {
  const env = { LLM_PROVIDER: "OpenAI", OPENAI_API_KEY: "sk" };
  const recommended = resolveProvider(env);
  assert.equal(recommended.ready, true);
  assert.equal(recommended.model, "gpt-6.1-sol");

  const openai = resolveProvider({ ...env, LLM_MODEL: "gpt-x" });
  assert.equal(openai.model, "gpt-x");
  assert.equal(openai.ready, true);
  assert.equal(openai.baseUrl, "https://api.openai.com/v1");
  assert.equal(openai.apiKey, "sk");

  assert.match(
    resolveProvider({ LLM_PROVIDER: "groq", LLM_MODEL: "m" }).missing ?? "",
    /GROQ_API_KEY/,
  );
  assert.equal(
    resolveProvider({ LLM_PROVIDER: "deepseek" }).jsonMode,
    "object",
  );
});

test("local and custom providers need a model chosen", () => {
  assert.match(
    resolveProvider({ LLM_PROVIDER: "ollama" }).missing ?? "",
    /LLM_MODEL/,
  );
  assert.equal(
    resolveProvider({ LLM_PROVIDER: "ollama", LLM_MODEL: "llama" }).ready,
    true,
  );
  const custom = resolveProvider({ LLM_PROVIDER: "custom", LLM_MODEL: "m" });
  assert.match(custom.missing ?? "", /LLM_BASE_URL/);
  assert.equal(
    resolveProvider({
      LLM_PROVIDER: "custom",
      LLM_MODEL: "m",
      LLM_BASE_URL: "http://x/v1",
    }).ready,
    true,
  );
  assert.equal(resolveProvider({ LLM_PROVIDER: "nope" }).ready, false);
});

test("JSON is found inside fences and prose", () => {
  assert.deepEqual(extractJson('{"a":1}'), { a: 1 });
  assert.deepEqual(extractJson('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(extractJson('Sure! {"a":{"b":2}} Hope that helps.'), {
    a: { b: 2 },
  });
  assert.throws(() => extractJson("no json"));
});
