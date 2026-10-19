/**
 * Which AI provider writes plans, scripts, and publish kits. Claude is the
 * default; anything that speaks the OpenAI chat completions API works too
 * (OpenAI, Gemini, OpenRouter, Groq, local models through Ollama, ...).
 *
 * Kept free of SDK imports so the studio can check the setup cheaply.
 */

export type ProviderId =
  | "anthropic"
  | "openai"
  | "gemini"
  | "openrouter"
  | "groq"
  | "deepseek"
  | "mistral"
  | "xai"
  | "together"
  | "ollama"
  | "lmstudio"
  | "custom";

/**
 * How to ask for JSON: "schema" sends the JSON Schema as a structured output
 * format; "object" asks for any JSON object and puts the schema in the prompt,
 * for providers without schema support.
 */
export type JsonMode = "schema" | "object";

type Preset = {
  name: string;
  /** Environment variables that hold the key, in order of preference. */
  keyEnv: string[];
  /** Local servers that run without a key. */
  keyless?: boolean;
  /** OpenAI-compatible endpoint. Unset for Anthropic. */
  baseUrl?: string;
  defaultModel?: string;
  jsonMode?: JsonMode;
};

export const PROVIDERS: Record<ProviderId, Preset> = {
  anthropic: {
    name: "Claude",
    keyEnv: ["ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN"],
    defaultModel: "claude-opus-5-5",
  },
  openai: {
    name: "OpenAI",
    keyEnv: ["OPENAI_API_KEY"],
    baseUrl: "https://api.openai.com/v1",
  },
  gemini: {
    name: "Gemini",
    keyEnv: ["GEMINI_API_KEY", "GOOGLE_API_KEY"],
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
  },
  openrouter: {
    name: "OpenRouter",
    keyEnv: ["OPENROUTER_API_KEY"],
    baseUrl: "https://openrouter.ai/api/v1",
  },
  groq: {
    name: "Groq",
    keyEnv: ["GROQ_API_KEY"],
    baseUrl: "https://api.groq.com/openai/v1",
  },
  deepseek: {
    name: "DeepSeek",
    keyEnv: ["DEEPSEEK_API_KEY"],
    baseUrl: "https://api.deepseek.com/v1",
    jsonMode: "object",
  },
  mistral: {
    name: "Mistral",
    keyEnv: ["MISTRAL_API_KEY"],
    baseUrl: "https://api.mistral.ai/v1",
  },
  xai: {
    name: "xAI",
    keyEnv: ["XAI_API_KEY"],
    baseUrl: "https://api.x.ai/v1",
  },
  together: {
    name: "Together AI",
    keyEnv: ["TOGETHER_API_KEY"],
    baseUrl: "https://api.together.xyz/v1",
  },
  ollama: {
    name: "Ollama",
    keyEnv: [],
    keyless: true,
    baseUrl: "http://localhost:11434/v1",
  },
  lmstudio: {
    name: "LM Studio",
    keyEnv: [],
    keyless: true,
    baseUrl: "http://localhost:1234/v1",
  },
  custom: {
    name: "AI provider",
    keyEnv: [],
    keyless: true,
  },
};

export type ProviderSettings = {
  id: ProviderId;
  /** Shown in the studio and in error messages. */
  name: string;
  /** Empty when the provider isn't set up yet. */
  model: string;
  apiKey?: string;
  baseUrl?: string;
  jsonMode: JsonMode;
  /** Every required setting is present. */
  ready: boolean;
  /** What's missing, when not ready. */
  missing?: string;
};

type Env = Record<string, string | undefined>;

const isProviderId = (value: string): value is ProviderId =>
  Object.hasOwn(PROVIDERS, value);

/** Reads LLM_PROVIDER and friends. Defaults to Claude. */
export const resolveProvider = (env: Env = process.env): ProviderSettings => {
  const requested = (env.LLM_PROVIDER ?? "anthropic").trim().toLowerCase();
  if (!isProviderId(requested)) {
    return {
      id: "custom",
      name: PROVIDERS.custom.name,
      model: "",
      jsonMode: "schema",
      ready: false,
      missing: `LLM_PROVIDER "${requested}" isn't supported. Pick a provider in Settings, or use one of: ${Object.keys(PROVIDERS).join(", ")}.`,
    };
  }

  const preset = PROVIDERS[requested];
  const apiKey =
    env.LLM_API_KEY || preset.keyEnv.map((name) => env[name]).find(Boolean);
  const baseUrl = env.LLM_BASE_URL || preset.baseUrl;
  const model =
    env.LLM_MODEL ||
    (requested === "anthropic" ? env.CLAUDE_MODEL : undefined) ||
    preset.defaultModel ||
    "";
  const jsonMode: JsonMode =
    env.LLM_JSON_MODE === "object" || env.LLM_JSON_MODE === "schema"
      ? env.LLM_JSON_MODE
      : (preset.jsonMode ?? "schema");

  const keyNames = ["LLM_API_KEY", ...preset.keyEnv].join(" or ");
  const missing =
    !apiKey && !preset.keyless
      ? `Add your ${preset.name} API key in Settings (or set ${keyNames} in .env).`
      : requested === "custom" && !baseUrl
        ? "Add your provider's OpenAI-compatible address in Settings (or set LLM_BASE_URL in .env)."
        : !model
          ? `Choose the ${preset.name} model to use in Settings (or set LLM_MODEL in .env).`
          : undefined;

  return {
    id: requested,
    name: preset.name,
    model,
    apiKey,
    baseUrl,
    jsonMode,
    ready: !missing,
    missing,
  };
};
