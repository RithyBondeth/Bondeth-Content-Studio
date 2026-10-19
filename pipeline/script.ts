import {
  videoSpecSchema,
  type Scene,
  type VideoSpecInput,
} from "../src/spec/schema";
import { findUnmatchedCues } from "../src/lib/cues";
import { DEFAULT_MUSIC_VOLUME, MUSIC_TRACKS } from "../src/lib/music";
import { countWords } from "../src/lib/timing";
import { generateStructured } from "./claude";
import { SCRIPT_SYSTEM, scriptPrompt } from "./prompts";
import { videoDraftSchema, type SceneDraft, type VideoDraft } from "./schemas";
import type { PlanFile } from "./store";

const orUndefined = <T>(value: T | null): T | undefined => value ?? undefined;

type ComparisonSideDraft = Extract<SceneDraft, { type: "comparison" }>["left"];

const toComparisonSide = (side: ComparisonSideDraft) => ({
  label: side.label,
  points: side.points.slice(0, 4),
  cue: orUndefined(side.cue),
});

/** Converts one scene from Claude's draft format to the spec format. */
const toScene = (draft: SceneDraft): Scene => {
  const base = {
    narration: draft.narration.trim(),
    emoji: orUndefined(draft.emoji),
    transition: draft.transition,
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
        cues: orUndefined(draft.cues)?.slice(0, 6),
        style: draft.style,
      };
    case "stat":
      return {
        ...base,
        type: "stat",
        value: draft.value,
        label: draft.label,
        source: orUndefined(draft.source),
        cue: orUndefined(draft.cue),
      };
    case "chart":
      // The template shows at most 6 points. Values are never changed: a
      // chart with a negative value or too few points fails validation.
      return {
        ...base,
        type: "chart",
        heading: draft.heading,
        style: draft.style,
        points: draft.points.slice(0, 6).map((point) => ({
          label: point.label,
          value: point.value,
          cue: orUndefined(point.cue),
        })),
        unit: orUndefined(draft.unit),
        source: draft.source,
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
        left: toComparisonSide(draft.left),
        right: toComparisonSide(draft.right),
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
          cue: orUndefined(step.cue),
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
    music:
      draft.music === "none"
        ? undefined
        : { src: MUSIC_TRACKS[draft.music].src, volume: DEFAULT_MUSIC_VOLUME },
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

/** Reads a value at a dotted path such as "steps.1.cue". */
const valueAt = (value: unknown, path: string): unknown =>
  path
    .split(".")
    .reduce<unknown>(
      (current, key) =>
        current && typeof current === "object"
          ? (current as Record<string, unknown>)[key]
          : undefined,
      value,
    );

/**
 * One warning for each cue that isn't in its scene's narration. Those cues
 * still work, but their visuals fall back to fixed timing.
 */
export const describeUnmatchedCues = (spec: VideoSpecInput): string[] =>
  videoSpecSchema
    .parse(spec)
    .scenes.flatMap((scene, index) =>
      findUnmatchedCues(scene).map(
        (path) =>
          `Scene ${index + 1} (${scene.type}): cue "${String(valueAt(scene, path))}" at ${path} isn't in the narration, so it will use fixed timing.`,
      ),
    );

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
  for (const warning of describeUnmatchedCues(spec)) {
    console.warn(`  ⚠ ${video.title}: ${warning}`);
  }
  const words = spec.scenes.reduce(
    (sum, scene) => sum + countWords(scene.narration),
    0,
  );
  return { spec, words };
};
