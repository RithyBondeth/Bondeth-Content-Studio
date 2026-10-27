import "server-only";
import {
  testAi,
  testElevenLabs,
  testOpenAiImages,
  testPexels,
} from "../../pipeline/connections";
import {
  PROVIDERS,
  resolveProvider,
  type ProviderId,
} from "../../pipeline/providers";
import {
  applySettingsInput,
  keysFromEnv,
  maskKey,
  mergeSettings,
  savedSettings,
  writeSettings,
  type SettingsInput,
} from "../../pipeline/settings";

export type { SettingsInput, SettingsSection } from "../../pipeline/settings";

/** Where a key in use comes from. */
export type KeySource = "settings" | "env";

/** A saved key as the browser sees it: never the key itself. */
export type KeyView = {
  /** The last few characters, e.g. "••••a1b2". */
  masked?: string;
  source?: KeySource;
};

export type ProviderView = {
  key: KeyView;
  /** What Settings holds, for the form. Empty means the default applies. */
  model: string;
  baseUrl: string;
  /** What's used when the field is left empty: .env or the preset. */
  defaultModel: string;
  defaultBaseUrl: string;
  ready: boolean;
  missing?: string;
};

export type SettingsView = {
  /** Keys come only from the server's environment, so nothing can be saved. */
  locked: boolean;
  ai: { provider: ProviderId; providers: Record<ProviderId, ProviderView> };
  elevenLabs: { key: KeyView; voiceId: string; defaultVoiceId: string };
  openai: { key: KeyView };
  pexels: { key: KeyView };
};

const keyView = (
  saved: string | undefined,
  effective: string | undefined,
): KeyView =>
  saved?.trim()
    ? { masked: maskKey(saved), source: "settings" }
    : effective
      ? { masked: maskKey(effective), source: "env" }
      : {};

const isProvider = (id: string): id is ProviderId =>
  Object.hasOwn(PROVIDERS, id);

/** The settings page's view: what's saved and what's in use, with keys masked. */
export const getSettingsView = (env = process.env): SettingsView => {
  const saved = savedSettings();
  const merged = mergeSettings(env, saved);
  const current = resolveProvider(merged);

  const providers = Object.fromEntries(
    (Object.keys(PROVIDERS) as ProviderId[]).map((id) => {
      const entry = saved.ai?.providers?.[id] ?? {};
      const resolved = resolveProvider(
        mergeSettings(env, {
          ai: { provider: id, providers: saved.ai?.providers },
        }),
      );
      // Without the saved model and endpoint, to show what an empty field means.
      const fallback = resolveProvider(
        mergeSettings(env, {
          ai: { provider: id, providers: { [id]: { apiKey: entry.apiKey } } },
        }),
      );
      const view: ProviderView = {
        key: keyView(entry.apiKey, resolved.apiKey),
        model: entry.model ?? "",
        baseUrl: entry.baseUrl ?? "",
        defaultModel: fallback.model,
        defaultBaseUrl: fallback.baseUrl ?? "",
        ready: resolved.ready,
        missing: resolved.missing,
      };
      return [id, view];
    }),
  ) as Record<ProviderId, ProviderView>;

  return {
    locked: keysFromEnv(env),
    ai: {
      provider: isProvider(current.id) ? current.id : "anthropic",
      providers,
    },
    elevenLabs: {
      key: keyView(saved.elevenLabs?.apiKey, merged.ELEVENLABS_API_KEY),
      voiceId: saved.elevenLabs?.voiceId ?? "",
      defaultVoiceId: env.ELEVENLABS_VOICE_ID ?? "",
    },
    openai: { key: keyView(saved.openai?.apiKey, merged.OPENAI_API_KEY) },
    pexels: { key: keyView(saved.pexels?.apiKey, merged.PEXELS_API_KEY) },
  };
};

export const saveSettings = (input: SettingsInput) => {
  if (keysFromEnv()) {
    throw new Error(
      "Keys on this server come from its environment. Change them there and restart.",
    );
  }
  writeSettings(applySettingsInput(savedSettings(), input));
};

const needKey = (key: string | undefined, service: string) => {
  if (!key) throw new Error(`Paste your ${service} API key first.`);
  return key;
};

/** Tests one section as it is in the form, saved or not. */
export const testSettings = async (input: SettingsInput): Promise<string> => {
  const merged = mergeSettings(
    process.env,
    applySettingsInput(savedSettings(), input),
  );
  switch (input.section) {
    case "ai":
      return testAi(resolveProvider(merged));
    case "elevenLabs":
      return testElevenLabs(
        needKey(merged.ELEVENLABS_API_KEY, "ElevenLabs"),
        merged.ELEVENLABS_VOICE_ID,
      );
    case "openai":
      return testOpenAiImages(needKey(merged.OPENAI_API_KEY, "OpenAI"));
    case "pexels":
      return testPexels(needKey(merged.PEXELS_API_KEY, "Pexels"));
  }
};

/**
 * The models an OpenAI-compatible provider offers, from its `/models` list,
 * using the form's provider, address and key (typed or saved). Claude's
 * models are listed in the studio itself, so this returns none for Claude.
 */
export const listModels = async (
  input: Extract<SettingsInput, { section: "ai" }>,
): Promise<string[]> => {
  if (input.provider === "anthropic") return [];
  const provider = resolveProvider(
    mergeSettings(process.env, applySettingsInput(savedSettings(), input)),
  );
  if (!provider.baseUrl) return [];
  if (!provider.apiKey && !PROVIDERS[input.provider].keyless) return [];
  const response = await fetch(
    `${provider.baseUrl.replace(/\/+$/, "")}/models`,
    {
      headers: provider.apiKey
        ? { Authorization: `Bearer ${provider.apiKey}` }
        : {},
      signal: AbortSignal.timeout(8000),
    },
  ).catch(() => {
    throw new Error(`Couldn't reach ${provider.name} to list its models.`);
  });
  if (response.status === 401 || response.status === 403)
    throw new Error(`${provider.name} rejected the API key.`);
  if (!response.ok)
    throw new Error(
      `${provider.name} didn't return its models (${response.status}).`,
    );
  const body = (await response.json().catch(() => null)) as {
    data?: { id?: unknown }[];
  } | null;
  return (body?.data ?? [])
    .map((model) => (typeof model.id === "string" ? model.id : ""))
    .filter(Boolean);
};
