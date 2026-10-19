import "server-only";
import { resolveProvider } from "../../pipeline/providers";
// Importing settings loads .env, the same way the CLI does.
import { currentEnv } from "../../pipeline/settings";

export type KeyStatus = {
  /** The AI provider that writes plans, scripts, and posts is set up. */
  ai: boolean;
  /** Its display name, e.g. "Claude" or "OpenAI". */
  aiName: string;
  elevenLabs: boolean;
  /** AI illustrations. */
  openai: boolean;
  /** Pexels stock photos; Openverse is used without it. */
  pexels: boolean;
};

/** What's set up, from .env and Settings as they are right now. */
export const getKeyStatus = (): KeyStatus => {
  const env = currentEnv();
  const provider = resolveProvider(env);
  return {
    ai: provider.ready,
    aiName: provider.name,
    elevenLabs: Boolean(env.ELEVENLABS_API_KEY?.trim()),
    openai: Boolean(env.OPENAI_API_KEY?.trim()),
    pexels: Boolean(env.PEXELS_API_KEY?.trim()),
  };
};
