import "server-only";
// Importing config loads .env, the same way the CLI does.
import "../../pipeline/config";
import { resolveProvider } from "../../pipeline/providers";

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

export const getKeyStatus = (): KeyStatus => {
  const provider = resolveProvider();
  return {
    ai: provider.ready,
    aiName: provider.name,
    elevenLabs: Boolean(process.env.ELEVENLABS_API_KEY),
    openai: Boolean(process.env.OPENAI_API_KEY),
    pexels: Boolean(process.env.PEXELS_API_KEY),
  };
};
