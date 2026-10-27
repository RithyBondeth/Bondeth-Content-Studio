/**
 * The models offered in Settings, with a plain-language line about each so
 * people who don't follow AI news can still pick one.
 *
 * Claude's models are listed here. Other providers change their line-up
 * often, so the studio asks their API which models exist and labels the
 * common kinds (fast, most capable) from the name.
 */

export type ModelChoice = {
  id: string;
  label: string;
  hint?: string;
  recommended?: boolean;
};

export const CLAUDE_MODELS: ModelChoice[] = [
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
];

/** Words in a model's name that mark its kind. "gemini" isn't "mini". */
const NOT_TEXT =
  /^(embed|embedding|embeddings|whisper|tts|transcribe|moderation|dall|image|images|audio|realtime|speech|rerank|guard)$/;
// Open models: up to about 14B parameters is small, 70B and up is large.
const FAST = /^(nano|lite|mini|small|tiny|haiku|flash|instant|(\d|1[0-4])(\.\d+)?b)$/;
const STRONG = /^(pro|large|ultra|opus|max|reasoning|thinking|([7-9]\d|\d{3,})b)$/;

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
 * The choices for a provider: Claude's curated list, or the provider's own
 * text models with a hint where the name allows. The current model always
 * stays in the list, even if the provider no longer reports it.
 */
export const modelChoices = (
  provider: string,
  available: string[],
  current?: string,
): ModelChoice[] => {
  const choices =
    provider === "anthropic"
      ? CLAUDE_MODELS
      : [...new Set(available)]
          .filter(isTextModel)
          .sort((a, b) => a.localeCompare(b))
          .map((id) => ({ id, label: id, hint: describeModel(id) }));
  if (current && !choices.some((choice) => choice.id === current))
    return [
      { id: current, label: current, hint: "Your current model." },
      ...choices,
    ];
  return choices;
};
