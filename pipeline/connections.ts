import Anthropic from "@anthropic-ai/sdk";
import { getClaudeClient } from "./anthropic";
import { config } from "./config";
import type { ProviderSettings } from "./providers";

/**
 * Cheap real calls that check a key works, for the Settings page's "Test
 * connection" buttons. Each returns a short success line or throws an error
 * written for people who have never seen an API.
 */

const TIMEOUT_MS = 15_000;

const rejected = (service: string) =>
  `${service} didn't accept that key. Check you copied all of it, with no spaces.`;

const unreachable = (service: string, where?: string) =>
  /localhost|127\.0\.0\.1/.test(where ?? "")
    ? `Couldn't reach ${service} at ${where}. Make sure ${service} is running on this computer.`
    : `Couldn't reach ${service}${where ? ` at ${where}` : ""}. Check your internet connection.`;

/** Fetches with a timeout and turns network failures into plain words. */
const call = async (
  service: string,
  url: string,
  init: RequestInit = {},
): Promise<Response> => {
  try {
    return await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new Error(unreachable(service, new URL(url).origin));
  }
};

const failure = (service: string, response: Response) => {
  if (response.status === 401 || response.status === 403) {
    return new Error(rejected(service));
  }
  if (response.status === 429) {
    return new Error(
      `${service} is busy or your account has hit its limit. The key looks right; try again in a minute, or check your plan's credits.`,
    );
  }
  return new Error(
    `${service} answered with an error (${response.status} ${response.statusText}). Try again in a minute.`,
  );
};

/** Checks the AI provider's key and that its model exists. */
export const testAi = async (settings: ProviderSettings): Promise<string> => {
  if (!settings.ready) throw new Error(settings.missing);

  if (settings.id === "anthropic") {
    try {
      await getClaudeClient(settings).models.retrieve(
        settings.model,
        {},
        { timeout: TIMEOUT_MS, maxRetries: 0 },
      );
    } catch (error) {
      if (
        error instanceof Anthropic.AuthenticationError ||
        error instanceof Anthropic.PermissionDeniedError
      ) {
        throw new Error(rejected("Claude"));
      }
      if (error instanceof Anthropic.NotFoundError) {
        throw new Error(
          `The key works, but Claude has no model called "${settings.model}". Check the model name.`,
        );
      }
      if (error instanceof Anthropic.APIConnectionError) {
        throw new Error(unreachable("Claude", settings.baseUrl));
      }
      if (error instanceof Anthropic.RateLimitError) {
        throw new Error(
          "Claude is busy or your account has hit its limit. The key looks right; try again in a minute.",
        );
      }
      throw error;
    }
    return `Connected to Claude. Videos will be written with ${settings.model}.`;
  }

  const base = settings.baseUrl!.replace(/\/+$/, "");
  const response = await call(settings.name, `${base}/models`, {
    headers: settings.apiKey
      ? { Authorization: `Bearer ${settings.apiKey}` }
      : {},
  });
  if (!response.ok) throw failure(settings.name, response);

  const data = (await response.json().catch(() => ({}))) as {
    data?: { id?: string }[];
  };
  const ids = (data.data ?? []).map((m) => m.id ?? "");
  // Some providers prefix ids, e.g. Gemini's "models/gemini-...".
  const found = ids.some(
    (id) => id === settings.model || id.endsWith(`/${settings.model}`),
  );
  if (ids.length && !found) {
    throw new Error(
      `Connected to ${settings.name}, but it has no model called "${settings.model}". Check the model name.`,
    );
  }
  return `Connected to ${settings.name}. Videos will be written with ${settings.model}.`;
};

/** Checks an ElevenLabs key, and the default voice when one is set. */
export const testElevenLabs = async (
  apiKey: string,
  voiceId?: string,
): Promise<string> => {
  const headers = { "xi-api-key": apiKey };
  const response = await call(
    "ElevenLabs",
    "https://api.elevenlabs.io/v2/voices?page_size=1",
    { headers },
  );
  if (response.status === 401) {
    throw new Error(
      `${rejected("ElevenLabs")} If you limited what the key can do, allow it to read voices and use text to speech.`,
    );
  }
  if (!response.ok) throw failure("ElevenLabs", response);

  if (voiceId) {
    const voice = await call(
      "ElevenLabs",
      `https://api.elevenlabs.io/v1/voices/${encodeURIComponent(voiceId)}`,
      { headers },
    );
    if (voice.status === 404 || voice.status === 400) {
      throw new Error(
        `The key works, but ElevenLabs has no voice with the ID "${voiceId}". Pick another default voice.`,
      );
    }
    if (voice.ok) {
      const { name } = (await voice.json().catch(() => ({}))) as {
        name?: string;
      };
      return `Connected to ElevenLabs. New videos will use ${name ?? "your chosen voice"}.`;
    }
  }
  return "Connected to ElevenLabs.";
};

/** Checks an OpenAI key can see the image model. */
export const testOpenAiImages = async (apiKey: string): Promise<string> => {
  const response = await call(
    "OpenAI",
    `https://api.openai.com/v1/models/${encodeURIComponent(config.imageModel)}`,
    { headers: { Authorization: `Bearer ${apiKey}` } },
  );
  if (response.status === 404) {
    throw new Error(
      `The key works, but this OpenAI account can't use the image model ${config.imageModel} yet. OpenAI may ask you to verify your organization first.`,
    );
  }
  if (!response.ok) throw failure("OpenAI", response);
  return "Connected to OpenAI. AI illustrations are ready.";
};

/** Checks a Pexels key with a one-photo search. */
export const testPexels = async (apiKey: string): Promise<string> => {
  const response = await call(
    "Pexels",
    "https://api.pexels.com/v1/search?query=sky&per_page=1",
    { headers: { Authorization: apiKey } },
  );
  if (!response.ok) throw failure("Pexels", response);
  return "Connected to Pexels. Stock photo search will use it.";
};
