import { z } from "zod";
import type { GenerateOptions } from "./llm";
import type { ProviderSettings } from "./providers";

type ChatResponse = {
  choices?: {
    finish_reason?: string | null;
    message?: { content?: string | null; refusal?: string | null };
  }[];
  error?: { message?: string };
};

/** Pulls the JSON out of a reply, tolerating ```json fences and stray prose. */
export const extractJson = (text: string): unknown => {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  const body = (fenced?.[1] ?? text).trim();
  try {
    return JSON.parse(body);
  } catch {
    const start = body.indexOf("{");
    const end = body.lastIndexOf("}");
    if (start === -1 || end <= start) throw new SyntaxError("No JSON found");
    return JSON.parse(body.slice(start, end + 1));
  }
};

/**
 * Asks any OpenAI-compatible chat completions API for JSON matching `schema`,
 * then validates it with zod, since not every provider enforces the schema.
 */
export const generateWithOpenAICompatible = async <T extends z.ZodType>(
  settings: ProviderSettings,
  { schema, system, prompt, label }: GenerateOptions<T>,
): Promise<z.infer<T>> => {
  const { name, model, apiKey, baseUrl, jsonMode } = settings;
  const jsonSchema = z.toJSONSchema(schema);

  const response_format =
    jsonMode === "schema"
      ? {
          type: "json_schema",
          json_schema: { name: "output", schema: jsonSchema, strict: false },
        }
      : { type: "json_object" };
  const instructions =
    jsonMode === "schema"
      ? system
      : `${system}\n\nReply with a single JSON object, and nothing else, that matches this JSON Schema:\n${JSON.stringify(jsonSchema)}`;

  let res: Response;
  try {
    res = await fetch(`${baseUrl!.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: instructions },
          { role: "user", content: prompt },
        ],
        response_format,
        // OpenAI's newer models only accept max_completion_tokens.
        [settings.id === "openai" ? "max_completion_tokens" : "max_tokens"]:
          16000,
      }),
    });
  } catch (error) {
    throw new Error(
      `Couldn't reach ${name} at ${baseUrl} while generating ${label}.`,
      { cause: error },
    );
  }

  const data = (await res.json().catch(() => ({}))) as ChatResponse;
  if (!res.ok) {
    const detail = data.error?.message ?? res.statusText;
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        `${name} rejected the API key (${detail}). Check it in Settings (or LLM_API_KEY in .env).`,
      );
    }
    if (res.status === 429) {
      throw new Error(
        `${name} rate limit hit while generating ${label}. Try again shortly.`,
      );
    }
    throw new Error(
      `${name} API error ${res.status} while generating ${label}: ${detail}`,
    );
  }

  const choice = data.choices?.[0];
  if (choice?.message?.refusal || choice?.finish_reason === "content_filter") {
    throw new Error(
      `${name} declined to generate ${label}${choice.message?.refusal ? `: ${choice.message.refusal}` : "."}`,
    );
  }
  if (choice?.finish_reason === "length") {
    throw new Error(
      `The ${label} was cut off because it was too long. Try asking for fewer or shorter videos.`,
    );
  }

  let json: unknown;
  try {
    json = extractJson(choice?.message?.content ?? "");
  } catch {
    throw new Error(`${name}'s ${label} wasn't valid JSON.`);
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new Error(
      `${name}'s ${label} didn't match the expected format (model ${model}): ${z.prettifyError(parsed.error)}`,
    );
  }
  return parsed.data;
};
