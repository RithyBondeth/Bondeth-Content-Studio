import { z } from "zod";
import { SUPPORTED_LANGUAGES } from "../src/lib/languages";
import { MUSIC_MOODS } from "../src/lib/music";
import { CHART_STYLES, TRANSITIONS } from "../src/spec/schema";

/**
 * Shapes Claude must return. Structured outputs need every field to be
 * present, so optional values are nullable here and stripped when the
 * draft is turned into a video spec.
 */

export const contentPlanSchema = z.object({
  title: z.string().describe("Short name for this content series"),
  audience: z.string().describe("Who the videos are for, specifically"),
  goal: z
    .string()
    .describe("What a viewer should get from following the series"),
  tone: z
    .string()
    .describe("Voice and style, e.g. 'friendly, curious, no jargon'"),
  pillars: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
      }),
    )
    .describe("2-4 recurring themes the series returns to"),
  videos: z.array(
    z.object({
      title: z.string(),
      pillar: z.string().describe("Name of the pillar this video belongs to"),
      hook: z
        .string()
        .describe(
          "The first sentence the viewer hears; must earn the next 3 seconds",
        ),
      angle: z.string().describe("What makes this take interesting or useful"),
      keyPoints: z
        .array(z.string())
        .describe("3-5 points the video must cover, in order"),
      callToAction: z.string(),
    }),
  ),
  schedule: z.object({
    postsPerWeek: z.number().int(),
    notes: z
      .string()
      .describe("When and how to post, and how the videos build on each other"),
  }),
});

export type ContentPlan = z.infer<typeof contentPlanSchema>;

const nullableString = z.string().nullable();

const sceneFields = {
  narration: z
    .string()
    .describe("Exactly what the voice-over says in this scene"),
  emoji: nullableString.describe("One emoji as the scene's visual, or null"),
  transition: z
    .enum(TRANSITIONS)
    .describe(
      "How this scene replaces the previous one; ignored on the first scene",
    ),
};

const titleDraft = z.object({
  type: z.literal("title"),
  heading: z.string(),
  subheading: nullableString,
  ...sceneFields,
});

const statementDraft = z.object({
  type: z.literal("statement"),
  text: z.string(),
  highlight: z
    .array(z.string())
    .describe("Words from `text` to emphasise; may be empty"),
  ...sceneFields,
});

const listDraft = z.object({
  type: z.literal("list"),
  heading: z.string(),
  items: z.array(z.string()).describe("2-5 short items"),
  cues: z
    .array(z.string())
    .nullable()
    .describe(
      "For each item, in order, the first 1-4 words of the narration where it comes up, copied exactly; or null",
    ),
  style: z.enum(["bullets", "numbered", "checks"]),
  ...sceneFields,
});

const statDraft = z.object({
  type: z.literal("stat"),
  value: z.string().describe("The number as shown, e.g. '73%', '$1.2M', '10x'"),
  label: z.string(),
  source: nullableString.describe("Where the number comes from, or null"),
  cue: nullableString.describe(
    "The 1-4 words of the narration where the number is spoken, copied exactly, or null",
  ),
  ...sceneFields,
});

const chartDraft = z.object({
  type: z.literal("chart"),
  heading: z.string(),
  style: z
    .enum(CHART_STYLES)
    .describe("bar to compare things; line for a change over time"),
  points: z
    .array(
      z.object({
        label: z.string().describe("Short label, e.g. '1990' or 'Blue'"),
        value: z.number().describe("The real value, zero or more"),
        cue: nullableString.describe(
          "The first 1-4 words of the narration where this point comes up, copied exactly, or null",
        ),
      }),
    )
    .describe("2-6 data points, in the order they're shown"),
  unit: nullableString.describe(
    "Shown with every value, e.g. '%', 'x', 'km' or '$'; or null",
  ),
  source: z.string().describe("Where the numbers come from"),
  ...sceneFields,
});

const quoteDraft = z.object({
  type: z.literal("quote"),
  quote: z.string(),
  author: nullableString,
  ...sceneFields,
});

const comparisonSideDraft = z.object({
  label: z.string(),
  points: z.array(z.string()),
  cue: nullableString.describe(
    "The first 1-4 words of the narration where this side comes up, copied exactly, or null",
  ),
});

const comparisonDraft = z.object({
  type: z.literal("comparison"),
  heading: nullableString,
  left: comparisonSideDraft,
  right: comparisonSideDraft,
  ...sceneFields,
});

const codeDraft = z.object({
  type: z.literal("code"),
  language: z.enum(SUPPORTED_LANGUAGES),
  fileName: nullableString,
  steps: z.array(
    z.object({
      code: z.string().describe("The full code at this step"),
      highlight: nullableString.describe(
        "1-based lines to focus, e.g. '2,4-6', or null",
      ),
      cue: nullableString.describe(
        "The first 1-4 words of the narration about this step, copied exactly; null for the first step",
      ),
    }),
  ),
  ...sceneFields,
});

const ctaDraft = z.object({
  type: z.literal("cta"),
  heading: z.string(),
  action: z.string().describe("Short button text, e.g. 'Follow for part 2'"),
  ...sceneFields,
});

export const sceneDraftSchema = z.discriminatedUnion("type", [
  titleDraft,
  statementDraft,
  listDraft,
  statDraft,
  chartDraft,
  quoteDraft,
  comparisonDraft,
  codeDraft,
  ctaDraft,
]);

export const videoDraftSchema = z.object({
  title: z.string(),
  music: z
    .enum([...MUSIC_MOODS, "none"])
    .describe("Background music bed that fits the video's mood, or none"),
  scenes: z.array(sceneDraftSchema),
});

export type SceneDraft = z.infer<typeof sceneDraftSchema>;
export type VideoDraft = z.infer<typeof videoDraftSchema>;
