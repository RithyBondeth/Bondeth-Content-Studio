/**
 * The models offered in Settings, with a plain-language line about each so
 * people who don't follow AI news can still pick one.
 *
 * Each provider has a short list of its current models, checked against its
 * documentation in October 2026. When a key is set, the studio also asks the
 * provider which models the account has, and lists any extra ones below,
 * labelled from their names (fast, most capable).
 */

export type ModelChoice = {
  id: string;
  label: string;
  hint?: string;
  recommended?: boolean;
};

const LOCAL =
  "Runs on your computer. Download it first with Ollama (ollama pull NAME).";

export const MODEL_CATALOG: Record<string, ModelChoice[]> = {
  anthropic: [
    {
      id: "claude-opus-5-5",
      label: "Claude Opus 5.5",
      hint: "Best all-round choice: careful plans and natural scripts at a fair price.",
      recommended: true,
    },
    {
      id: "claude-sonnet-5-5",
      label: "Claude Sonnet 5.5",
      hint: "Faster and about half the price of Opus, still very good at writing.",
    },
    {
      id: "claude-haiku-5-5",
      label: "Claude Haiku 5.5",
      hint: "Fastest and cheapest. Fine for quick drafts; less polished scripts.",
    },
    {
      id: "claude-fable-5-1",
      label: "Claude Fable 5.1",
      hint: "Anthropic's most capable model. Slower and over twice the price of Opus; rarely needed for scripts.",
    },
  ],
  openai: [
    {
      id: "gpt-6.1-sol",
      label: "GPT-6.1 Sol",
      hint: "Best balance: close to the flagship at a lower price.",
      recommended: true,
    },
    {
      id: "gpt-6-astra",
      label: "GPT-6 Astra",
      hint: "OpenAI's most capable model. Slower and pricier.",
    },
    {
      id: "gpt-6.1-terra",
      label: "GPT-6.1 Terra",
      hint: "Fast and efficient, with natural writing.",
    },
    {
      id: "gpt-6-luna",
      label: "GPT-6 Luna",
      hint: "Cheapest and fastest. Fine for quick drafts.",
    },
  ],
  gemini: [
    {
      id: "gemini-3.8-flash",
      label: "Gemini 3.8 Flash",
      hint: "Google's smartest fast model. A good everyday choice.",
      recommended: true,
    },
    {
      id: "gemini-4-argon",
      label: "Gemini 4 Argon",
      hint: "Google's most capable model. Slower and pricier.",
    },
    {
      id: "gemini-3.5-flash-lite",
      label: "Gemini 3.5 Flash-Lite",
      hint: "Cheapest and fastest. Fine for quick drafts.",
    },
  ],
  openrouter: [
    {
      id: "openrouter/auto",
      label: "Auto (OpenRouter picks)",
      hint: "OpenRouter chooses a suitable model for each request.",
      recommended: true,
    },
    {
      id: "openai/gpt-6.1-terra",
      label: "GPT-6.1 Terra (OpenAI)",
      hint: "Fast and efficient, with natural writing.",
    },
    {
      id: "moonshotai/kimi-k3.1-pro",
      label: "Kimi K3.1 Pro (Moonshot)",
      hint: "One of the most used models on OpenRouter. Strong and good value.",
    },
  ],
  groq: [
    {
      id: "llama-3.3-70b-versatile",
      label: "Llama 3.3 70B",
      hint: "Good general writing, and very fast on Groq.",
      recommended: true,
    },
    {
      id: "openai/gpt-oss-120b",
      label: "GPT-OSS 120B",
      hint: "OpenAI's largest open model. Stronger reasoning.",
    },
    {
      id: "openai/gpt-oss-20b",
      label: "GPT-OSS 20B",
      hint: "Cheaper and faster. Fine for quick drafts.",
    },
    {
      id: "llama-3.1-8b-instant",
      label: "Llama 3.1 8B Instant",
      hint: "Cheapest and fastest; simpler writing.",
    },
  ],
  deepseek: [
    {
      id: "deepseek-flash",
      label: "DeepSeek Flash",
      hint: "Fast and low-cost. A good everyday choice.",
      recommended: true,
    },
    {
      id: "deepseek-v4-pro",
      label: "DeepSeek V4 Pro",
      hint: "DeepSeek's stronger model. Pricier.",
    },
  ],
  mistral: [
    {
      id: "mistral-medium-3-5",
      label: "Mistral Medium 3.5",
      hint: "Mistral's frontier-class model. A good everyday choice.",
      recommended: true,
    },
    {
      id: "mistral-small-2603",
      label: "Mistral Small 4",
      hint: "Smaller, faster and cheaper.",
    },
  ],
  xai: [
    {
      id: "grok-4.7",
      label: "Grok 4.7",
      hint: "xAI's most capable model, recommended for chat and writing.",
      recommended: true,
    },
    {
      id: "grok-4.20-0309-non-reasoning",
      label: "Grok 4.20 (no reasoning)",
      hint: "Answers straight away without thinking first. Faster.",
    },
    {
      id: "grok-build-0.1",
      label: "Grok Build 0.1",
      hint: "The lowest price of xAI's models.",
    },
  ],
  together: [
    {
      id: "zai-org/GLM-5.3",
      label: "GLM-5.3",
      hint: "A strong general model. A good everyday choice.",
      recommended: true,
    },
    {
      id: "Qwen/Qwen3.8-2.4T-A95B",
      label: "Qwen 3.8 (largest)",
      hint: "The largest model on Together. Pricier.",
    },
    {
      id: "zai-org/GLM-5.3-Flash",
      label: "GLM-5.3 Flash",
      hint: "Lighter and cheaper. Fine for quick drafts.",
    },
    {
      id: "openai/gpt-oss-120b",
      label: "GPT-OSS 120B",
      hint: "OpenAI's open model. Low cost.",
    },
  ],
  ollama: [
    {
      id: "llama3.1:8b",
      label: "Llama 3.1 8B",
      hint: `The most popular local model. ${LOCAL.replace("NAME", "llama3.1:8b")}`,
      recommended: true,
    },
    {
      id: "qwen3:8b",
      label: "Qwen 3 8B",
      hint: `Newer, good in many languages. ${LOCAL.replace("NAME", "qwen3:8b")}`,
    },
    {
      id: "gemma3:4b",
      label: "Gemma 3 4B",
      hint: `Smaller, for laptops with less memory. ${LOCAL.replace("NAME", "gemma3:4b")}`,
    },
    {
      id: "llama3.2:3b",
      label: "Llama 3.2 3B",
      hint: `The smallest and fastest; simpler writing. ${LOCAL.replace("NAME", "llama3.2:3b")}`,
    },
  ],
};

/** Claude's models, for code that only deals with Claude. */
export const CLAUDE_MODELS = MODEL_CATALOG.anthropic!;

/** The model a provider starts with when none is chosen. */
export const recommendedModel = (provider: string) =>
  MODEL_CATALOG[provider]?.find((model) => model.recommended)?.id;

/** Words in a model's name that mark its kind. "gemini" isn't "mini". */
const NOT_TEXT =
  /^(embed|embedding|embeddings|whisper|tts|transcribe|moderation|dall|image|images|audio|realtime|speech|rerank|guard)$/;
// Open models: up to about 14B parameters is small, 70B and up is large.
const FAST =
  /^(nano|lite|mini|small|tiny|haiku|flash|instant|(\d|1[0-4])(\.\d+)?b)$/;
const STRONG =
  /^(pro|large|ultra|opus|max|reasoning|thinking|([7-9]\d|\d{3,})b)$/;

const words = (id: string) => id.toLowerCase().split(/[^a-z0-9.]+/);

/** True for models that can't write text, such as embedding or image models. */
export const isTextModel = (id: string) =>
  !words(id).some((word) => NOT_TEXT.test(word));

/** A short description of a model from its name, when the name gives it away. */
export const describeModel = (id: string): string | undefined => {
  const parts = words(id);
  if (parts.some((word) => FAST.test(word)))
    return "Faster and cheaper. Good for quick drafts.";
  if (parts.some((word) => STRONG.test(word)))
    return "One of the most capable. Slower and pricier.";
  return undefined;
};

/**
 * The choices for a provider: its listed models first, then any others the
 * account offers, labelled from their names. The current model always stays
 * in the list, even if it's in neither.
 */
export const modelChoices = (
  provider: string,
  available: string[],
  current?: string,
): ModelChoice[] => {
  const listed = MODEL_CATALOG[provider] ?? [];
  const known = new Set(listed.map((model) => model.id));
  const more = [...new Set(available)]
    .filter((id) => isTextModel(id) && !known.has(id))
    .sort((a, b) => a.localeCompare(b))
    .map((id) => ({ id, label: id, hint: describeModel(id) }));
  const choices = [...listed, ...more];
  if (current && !choices.some((choice) => choice.id === current))
    return [
      { id: current, label: current, hint: "Your current model." },
      ...choices,
    ];
  return choices;
};
