import {
  videoSpecSchema,
  type Scene,
  type VideoSpecInput,
} from "../src/spec/schema";
import { countWords } from "../src/lib/timing";
import { generateStructured } from "./claude";
import { SCRIPT_SYSTEM, scriptPrompt } from "./prompts";
import { videoDraftSchema, type SceneDraft, type VideoDraft } from "./schemas";
import type { PlanFile } from "./store";

const orUndefined = <T>(value: T | null): T | undefined => value ?? undefined;

/** Converts one scene from Claude's draft format to the spec format. */
const toScene = (draft: SceneDraft): Scene => {
  const base = {
    narration: draft.narration.trim(),
    emoji: orUndefined(draft.emoji),
  };

  switch (draft.type) {
    case "title":
      return {
        ...base,
        type: "title",
        heading: draft.heading,
        subheading: orUndefined(draft.subheading),
      };
    case "statement":
      return {
        ...base,
        type: "statement",
        text: draft.text,
        highlight: draft.highlight,
      };
    case "list":
      // The templates show at most 6 items and 4 points per side.
      return {
        ...base,
        type: "list",
        heading: draft.heading,
        items: draft.items.slice(0, 6),
        style: draft.style,
      };
    case "stat":
      return {
        ...base,
        type: "stat",
        value: draft.value,
        label: draft.label,
        source: orUndefined(draft.source),
      };
    case "quote":
      return {
        ...base,
        type: "quote",
        quote: draft.quote,
        author: orUndefined(draft.author),
      };
    case "comparison":
      return {
        ...base,
        type: "comparison",
        heading: orUndefined(draft.heading),
        left: { ...draft.left, points: draft.left.points.slice(0, 4) },
        right: { ...draft.right, points: draft.right.points.slice(0, 4) },
      };
    case "code":
      return {
        ...base,
        type: "code",
        language: draft.language,
        fileName: orUndefined(draft.fileName),
        steps: draft.steps.map((step) => ({
          code: step.code,
          highlight: orUndefined(step.highlight),
        })),
      };
    case "cta":
      return {
        ...base,
        type: "cta",
        heading: draft.heading,
        action: draft.action,
      };
  }
};

export const draftToSpec = (
  draft: VideoDraft,
  language: string,
): VideoSpecInput => {
  const spec: VideoSpecInput = {
    version: 1,
    title: draft.title,
    language,
    captions: true,
    scenes: draft.scenes.map(toScene),
  };

  const result = videoSpecSchema.safeParse(spec);
  if (!result.success) {
    throw new Error(
      `Claude's script isn't a valid video spec:\n${result.error.message}`,
    );
  }
  return spec;
};

export type ScriptOptions = {
  seconds: number;
};

/** Writes the script and scene breakdown for one video in a plan. */
export const createVideoSpec = async (
  plan: PlanFile,
  index: number,
  options: ScriptOptions,
): Promise<{ spec: VideoSpecInput; words: number }> => {
  const video = plan.plan.videos[index]!;
  const draft = await generateStructured({
    schema: videoDraftSchema,
    system: SCRIPT_SYSTEM,
    prompt: scriptPrompt(plan.plan, index, {
      seconds: options.seconds,
      language: plan.options.language,
    }),
    label: `script for "${video.title}"`,
  });

  const spec = draftToSpec(draft, plan.options.language);
  const words = spec.scenes.reduce(
    (sum, scene) => sum + countWords(scene.narration),
    0,
  );
  return { spec, words };
};
