import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./config";
import { PROVIDERS, type ProviderId } from "./providers";

/**
 * Settings saved from the studio's Settings page. They live in a git-ignored
 * file, are read fresh on every use so changes apply without a restart, and
 * override .env, which keeps working for anyone who prefers it.
 */

export type ProviderEntry = {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
};

export type StudioSettings = {
  ai?: {
    provider?: ProviderId;
    /** Each provider's own key, model, and endpoint, so switching back keeps them. */
    providers?: Partial<Record<ProviderId, ProviderEntry>>;
  };
  elevenLabs?: { apiKey?: string; voiceId?: string };
  openai?: { apiKey?: string };
  pexels?: { apiKey?: string };
};

export type Env = Record<string, string | undefined>;

export const SETTINGS_FILE = path.join(ROOT, ".studio", "settings.json");

/** The AI variables that belong to one provider. */
const LLM_OVERRIDES = [
  "LLM_MODEL",
  "LLM_API_KEY",
  "LLM_BASE_URL",
  "LLM_JSON_MODE",
  "CLAUDE_MODEL",
];

const clean = (value: string | undefined) => value?.trim() || undefined;

/**
 * The environment with saved settings laid over it. When Settings picks a
 * different AI provider than .env, .env's model, key, and endpoint for the
 * other provider are dropped so they don't leak across; the provider's own
 * key variable (ANTHROPIC_API_KEY, ...) still works as a fallback.
 */
export const mergeSettings = (env: Env, settings: StudioSettings): Env => {
  const merged: Env = { ...env };
  const set = (name: string, value: string | undefined) => {
    const v = clean(value);
    if (v) merged[name] = v;
  };

  const provider = settings.ai?.provider;
  if (provider) {
    const envProvider = (env.LLM_PROVIDER ?? "anthropic").trim().toLowerCase();
    if (envProvider !== provider) {
      for (const name of LLM_OVERRIDES) delete merged[name];
    }
    merged.LLM_PROVIDER = provider;
    const entry = settings.ai?.providers?.[provider] ?? {};
    set("LLM_API_KEY", entry.apiKey);
    set("LLM_MODEL", entry.model);
    set("LLM_BASE_URL", entry.baseUrl);
  }

  set("ELEVENLABS_API_KEY", settings.elevenLabs?.apiKey);
  set("ELEVENLABS_VOICE_ID", settings.elevenLabs?.voiceId);
  set("OPENAI_API_KEY", settings.openai?.apiKey);
  set("PEXELS_API_KEY", settings.pexels?.apiKey);
  return merged;
};

/** The saved settings, or none when the file is missing or unreadable. */
export const readSettings = (file = SETTINGS_FILE): StudioSettings => {
  try {
    // The path is only known at runtime, so keep Next.js from tracing the whole project for it.
    const data: unknown = JSON.parse(
      fs.readFileSync(/* turbopackIgnore: true */ file, "utf8"),
    );
    return data && typeof data === "object" ? (data as StudioSettings) : {};
  } catch {
    return {};
  }
};

/** Saves settings readable only by this user, since they hold API keys. */
export const writeSettings = (
  settings: StudioSettings,
  file = SETTINGS_FILE,
) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(settings, null, 2)}\n`, {
    mode: 0o600,
  });
  fs.renameSync(temp, file);
};

/**
 * On a server, STUDIO_KEYS_FROM_ENV=1 makes the environment the only source of
 * keys: the Settings page turns read-only and any saved file is ignored.
 */
export const keysFromEnv = (env: Env = process.env) =>
  env.STUDIO_KEYS_FROM_ENV?.trim() === "1";

/** The saved settings in use: none when keys come only from the environment. */
export const savedSettings = (): StudioSettings =>
  keysFromEnv() ? {} : readSettings();

/** .env plus saved settings, as of right now. */
export const currentEnv = (): Env =>
  mergeSettings(process.env, savedSettings());

/** One variable from .env or Settings. */
export const getEnv = (name: string): string | undefined =>
  clean(currentEnv()[name]);

export const requireEnv = (name: string, hint: string): string => {
  const value = getEnv(name);
  if (!value) {
    throw new Error(`${hint} (Or set ${name} in .env.)`);
  }
  return value;
};

/** Shows the end of a key so people can tell which one is saved. */
export const maskKey = (key: string | undefined) => {
  const k = clean(key);
  if (!k) return undefined;
  return k.length <= 8 ? "••••" : `••••${k.slice(-4)}`;
};

/** One section of the form. `apiKey` is a newly typed key; leave it out to keep the saved one. */
export type SettingsInput =
  | {
      section: "ai";
      provider: ProviderId;
      model: string;
      baseUrl: string;
      apiKey?: string;
      clearKey?: boolean;
    }
  | {
      section: "elevenLabs";
      voiceId: string;
      apiKey?: string;
      clearKey?: boolean;
    }
  | { section: "openai" | "pexels"; apiKey?: string; clearKey?: boolean };

export type SettingsSection = SettingsInput["section"];

/** The saved key, replaced by a newly typed one or removed. */
const nextKey = (
  current: string | undefined,
  input: { apiKey?: string; clearKey?: boolean },
) => {
  if (input.clearKey) return undefined;
  return input.apiKey?.trim() || current;
};

const tidy = (value: string) => value.trim() || undefined;

/** The saved settings with one section of the form applied. */
export const applySettingsInput = (
  saved: StudioSettings,
  input: SettingsInput,
): StudioSettings => {
  switch (input.section) {
    case "ai": {
      if (!Object.hasOwn(PROVIDERS, input.provider)) {
        throw new Error("Pick an AI provider from the list.");
      }
      const providers = { ...saved.ai?.providers };
      const entry = providers[input.provider] ?? {};
      providers[input.provider] = {
        apiKey: nextKey(entry.apiKey, input),
        model: tidy(input.model),
        baseUrl: tidy(input.baseUrl),
      };
      return { ...saved, ai: { provider: input.provider, providers } };
    }
    case "elevenLabs":
      return {
        ...saved,
        elevenLabs: {
          apiKey: nextKey(saved.elevenLabs?.apiKey, input),
          voiceId: tidy(input.voiceId),
        },
      };
    case "openai":
    case "pexels":
      return {
        ...saved,
        [input.section]: {
          apiKey: nextKey(saved[input.section]?.apiKey, input),
        },
      };
  }
};
