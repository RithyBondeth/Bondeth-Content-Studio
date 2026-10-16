import "server-only";
// Importing config loads .env, the same way the CLI does.
import "../../pipeline/config";

export type KeyStatus = { claude: boolean; elevenLabs: boolean };

export const getKeyStatus = (): KeyStatus => ({
  claude: Boolean(
    process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN,
  ),
  elevenLabs: Boolean(process.env.ELEVENLABS_API_KEY),
});
