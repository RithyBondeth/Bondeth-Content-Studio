import type { z } from "zod";
import { generateWithClaude } from "./anthropic";
import { generateWithOpenAICompatible } from "./openai-compatible";
import { resolveProvider } from "./providers";
import { currentEnv } from "./settings";

export type GenerateOptions<T extends z.ZodType> = {
  schema: T;
  system: string;
  prompt: string;
  /** What we're generating, for error messages. */
  label: string;
};

/**
 * Asks the configured AI provider (Claude by default; see Settings or
 * LLM_PROVIDER) for
 * JSON matching `schema` and returns the validated result.
 */
export const generateStructured = async <T extends z.ZodType>(
  options: GenerateOptions<T>,
): Promise<z.infer<T>> => {
  const settings = resolveProvider(currentEnv());
  if (!settings.ready) {
    throw new Error(
      `${settings.name} isn't set up to write the ${options.label}. ${settings.missing}`,
    );
  }
  return settings.id === "anthropic"
    ? generateWithClaude(settings, options)
    : generateWithOpenAICompatible(settings, options);
};
