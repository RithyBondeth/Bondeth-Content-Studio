import { z } from "zod";
import { BACKGROUND_STYLES } from "../src/lib/backgrounds";
import { ICON_NAMES } from "../src/lib/icon-names";
import { SUPPORTED_LANGUAGES } from "../src/lib/languages";
import { MUSIC_MOODS } from "../src/lib/music";
import {
  CHART_STYLES,
  DIAGRAM_LAYOUTS,
  ENTRANCES,
  IMAGE_LAYOUTS,
  IMAGE_MOTIONS,
  TRANSITIONS,
} from "../src/spec/schema";

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
    .nullable()
    .describe(
      "How this scene replaces the previous one, or null to let the video vary it automatically; ignored on the first scene",
    ),
  entrance: z
    .enum(ENTRANCES)
    .nullable()
    .describe(
      "How the scene's text and items come in, or null to let the video vary it automatically",
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

const imageDraft = z.object({
  type: z.literal("image"),
  kind: z
    .enum(["photo", "illustration"])
    .describe(
      "photo: a real-world subject a stock photo library has; illustration: a concept or scene a photo can't show",
    ),
  description: z
    .string()
    .describe(
      "What the image shows, concretely and visually, in one sentence of English. Used as alt text, and as the prompt for an illustration",
    ),
  searchTerms: z
    .string()
    .describe("2-4 plain English keywords to search stock photos with"),
  caption: nullableString.describe(
    "2-6 words shown with the image, in the video's language, or null",
  ),
  layout: z
    .enum(IMAGE_LAYOUTS)
    .describe("full: fills the screen; framed: on a card under the caption"),
  motion: z.enum(IMAGE_MOTIONS).describe("Slow camera move over the image"),
  ...sceneFields,
});

const diagramDraft = z.object({
  type: z.literal("diagram"),
  heading: nullableString,
  layout: z
    .enum(DIAGRAM_LAYOUTS)
    .describe(
      "flow: steps joined by arrows; cycle: steps that loop back to the start; hub: the first node in the middle, joined to the rest",
    ),
  nodes: z
    .array(
      z.object({
        label: z.string().describe("1-4 words"),
        icon: z
          .enum(ICON_NAMES)
          .nullable()
          .describe(
            "The icon that fits best, or null to show the step's number",
          ),
        cue: nullableString.describe(
          "The first 1-4 words of the narration where this node comes up, copied exactly, or null",
        ),
      }),
    )
    .describe("2-6 nodes, in the order they appear"),
  ...sceneFields,
});

const timelineDraft = z.object({
  type: z.literal("timeline"),
  heading: nullableString,
  events: z
    .array(
      z.object({
        date: z
          .string()
          .describe("When, as shown: a year, a date, or a stage like 'Day 3'"),
        label: z.string().describe("What happened, in 1-5 words"),
        detail: nullableString.describe(
          "A short line under the label, up to about 6 words, or null",
        ),
        cue: nullableString.describe(
          "The first 1-4 words of the narration where this event comes up, copied exactly, or null",
        ),
      }),
    )
    .describe("2-6 events, in time order"),
  ...sceneFields,
});

const stepsDraft = z.object({
  type: z.literal("steps"),
  heading: nullableString,
  steps: z
    .array(
      z.object({
        title: z.string().describe("The step, in 1-5 words"),
        detail: nullableString.describe(
          "A short line under the title, up to about 6 words, or null",
        ),
        icon: z
          .enum(ICON_NAMES)
          .nullable()
          .describe(
            "The icon that fits best, or null to show the step's number",
          ),
        cue: nullableString.describe(
          "The first 1-4 words of the narration where this step comes up, copied exactly, or null",
        ),
      }),
    )
    .describe("2-5 steps, in the order they're done"),
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
  imageDraft,
  diagramDraft,
  timelineDraft,
  stepsDraft,
  ctaDraft,
]);

export const videoDraftSchema = z.object({
  title: z.string(),
  music: z
    .enum([...MUSIC_MOODS, "none"])
    .describe("Background music bed that fits the video's mood, or none"),
  background: z
    .enum(BACKGROUND_STYLES)
    .describe("The moving pattern behind every scene"),
  scenes: z.array(sceneDraftSchema),
});

export type SceneDraft = z.infer<typeof sceneDraftSchema>;
export type VideoDraft = z.infer<typeof videoDraftSchema>;

const platformPostDraft = (title: string | null, text: string) =>
  z.object({
    title: title
      ? z.string().describe(title)
      : z.null().describe("Always null: this platform has no title"),
    text: z.string().describe(text),
    callToAction: z
      .string()
      .describe(
        "One short line asking viewers to do the plan's call to action, worded for this platform",
      ),
    hashtags: z
      .array(z.string())
      .describe("Hashtags without spaces, most relevant first"),
  });

export const publishDraftSchema = z.object({
  tiktok: platformPostDraft(null, "The caption, without hashtags"),
  shorts: platformPostDraft(
    "The Short's title",
    "The description, without hashtags",
  ),
  reels: platformPostDraft(null, "The caption, without hashtags"),
  youtube: platformPostDraft(
    "The landscape video's title",
    "The description, without hashtags",
  ),
});

export type PublishDraft = z.infer<typeof publishDraftSchema>;
