import "server-only";
// Importing config loads .env, the same way the CLI does.
import "../../pipeline/config";

export type KeyStatus = {
  claude: boolean;
  elevenLabs: boolean;
  /** AI illustrations. */
  openai: boolean;
  /** Pexels stock photos; Openverse is used without it. */
  pexels: boolean;
};

export const getKeyStatus = (): KeyStatus => ({
  claude: Boolean(
    process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN,
  ),
  elevenLabs: Boolean(process.env.ELEVENLABS_API_KEY),
  openai: Boolean(process.env.OPENAI_API_KEY),
  pexels: Boolean(process.env.PEXELS_API_KEY),
});
