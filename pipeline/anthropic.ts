import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import type { GenerateOptions } from "./llm";
import type { ProviderSettings } from "./providers";

let client: Anthropic | null = null;

const getClient = (settings: ProviderSettings) => {
  client ??= new Anthropic({
    apiKey: settings.apiKey,
    ...(settings.baseUrl ? { baseURL: settings.baseUrl } : {}),
  });
  return client;
};

/** Asks Claude for JSON matching `schema` and returns the validated result. */
export const generateWithClaude = async <T extends z.ZodType>(
  settings: ProviderSettings,
  { schema, system, prompt, label }: GenerateOptions<T>,
): Promise<z.infer<T>> => {
  let response;
  try {
    response = await getClient(settings).beta.messages.parse({
      model: settings.model,
      max_tokens: 16000,
      // If the model declines for policy reasons, the API retries on its
      // default fallback model instead of failing.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: {
        effort: "high",
        format: betaZodOutputFormat(schema),
      },
      system,
      messages: [{ role: "user", content: prompt }],
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      throw new Error(
        "Claude rejected the API key. Set ANTHROPIC_API_KEY in .env (see .env.example).",
      );
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new Error(
        `Claude rate limit hit while generating ${label}. Try again shortly.`,
      );
    }
    if (error instanceof Anthropic.APIConnectionError) {
      throw new Error(
        `Couldn't reach the Claude API while generating ${label}.`,
      );
    }
    if (error instanceof Anthropic.APIError) {
      throw new Error(
        `Claude API error ${error.status} while generating ${label}: ${error.message}`,
      );
    }
    if (error instanceof Anthropic.AnthropicError) {
      // Raised before any request is sent, e.g. when no credentials are configured.
      throw new Error(
        `${error.message}\nSet ANTHROPIC_API_KEY in .env (see .env.example).`,
      );
    }
    throw error;
  }

  if (response.stop_reason === "refusal") {
    throw new Error(
      `Claude declined to generate ${label}${response.stop_details?.explanation ? `: ${response.stop_details.explanation}` : "."}`,
    );
  }
  if (response.stop_reason === "max_tokens") {
    throw new Error(
      `The ${label} was cut off because it was too long. Try asking for fewer or shorter videos.`,
    );
  }
  if (!response.parsed_output) {
    throw new Error(`Claude's ${label} didn't match the expected format.`);
  }
  return response.parsed_output;
};
