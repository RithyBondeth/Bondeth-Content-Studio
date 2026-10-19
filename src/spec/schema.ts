import { z } from "zod";
import { ICON_NAMES } from "../lib/icon-names";
import { SUPPORTED_LANGUAGES } from "../lib/languages";
import { HEX_COLOR } from "../lib/color";
import { DEFAULT_MUSIC_VOLUME } from "../lib/music";
import { THEME_FONT_NAMES, THEME_PRESET_NAMES } from "../theme/presets";

/**
 * The video spec: everything needed to render one video. The AI pipeline
 * writes it, people can edit it by hand, and Remotion renders it.
 */

export const wordTimingSchema = z.object({
  text: z.string(),
  /** Seconds from the start of the scene's audio. */
  start: z.number(),
  end: z.number(),
});

export const sceneAudioSchema = z.object({
  /** Path inside public/ (e.g. "content/plan/video/scene-01.mp3") or a full URL. */
  src: z.string(),
  durationInSeconds: z.number().positive(),
  /** Word timings, used for animated captions. */
  words: z.array(wordTimingSchema),
});

export const TRANSITIONS = ["fade", "slide", "wipe", "zoom", "cut"] as const;

const sceneBase = {
  /** What the voice-over says during this scene. Also used for captions. */
  narration: z.string(),
  /** Optional emoji shown as the scene's visual. */
  emoji: z.string().optional(),
  /** Overrides the length worked out from the audio or narration. */
  durationInSeconds: z.number().positive().optional(),
  /** How this scene replaces the previous one. Defaults to "fade"; ignored on the first scene. */
  transition: z.enum(TRANSITIONS).optional(),
  /** Filled in by the voice step. */
  audio: sceneAudioSchema.optional(),
};

export const titleSceneSchema = z.object({
  type: z.literal("title"),
  heading: z.string(),
  subheading: z.string().optional(),
  ...sceneBase,
});

export const statementSceneSchema = z.object({
  type: z.literal("statement"),
  text: z.string(),
  /** Words or phrases in `text` to draw in the accent color. */
  highlight: z.array(z.string()).optional(),
  ...sceneBase,
});

export const listSceneSchema = z.object({
  type: z.literal("list"),
  heading: z.string(),
  items: z.array(z.string()).min(1).max(6),
  /**
   * A short phrase from the narration for each item, in the same order. Each
   * item appears as the narrator says its phrase; items without one, or whose
   * phrase isn't in the narration, appear on a fixed schedule.
   */
  cues: z.array(z.string()).optional(),
  style: z.enum(["bullets", "numbered", "checks"]).optional(),
  ...sceneBase,
});

export const statSceneSchema = z.object({
  type: z.literal("stat"),
  /** The number to show, e.g. "73%", "$1.2M", "10x". Leading digits count up. */
  value: z.string(),
  label: z.string(),
  source: z.string().optional(),
  /** Phrase from the narration where the number is spoken; the count-up starts there. */
  cue: z.string().optional(),
  ...sceneBase,
});

export const CHART_STYLES = ["bar", "line"] as const;

export const chartPointSchema = z.object({
  label: z.string(),
  /** Bars and lines start from zero, so values can't be negative. */
  value: z.number().min(0),
  /** Phrase from the narration where this point comes up; its bar grows from there. */
  cue: z.string().optional(),
});

export const chartSceneSchema = z.object({
  type: z.literal("chart"),
  heading: z.string(),
  points: z.array(chartPointSchema).min(2).max(6),
  /**
   * Shown with every value, e.g. "%", "x", "km", or "$". Currency symbols go
   * before the number; anything else goes after it.
   */
  unit: z.string().optional(),
  /** Defaults to "bar". */
  style: z.enum(CHART_STYLES).optional(),
  source: z.string().optional(),
  ...sceneBase,
});

export const quoteSceneSchema = z.object({
  type: z.literal("quote"),
  quote: z.string(),
  author: z.string().optional(),
  ...sceneBase,
});

export const comparisonSideSchema = z.object({
  label: z.string(),
  points: z.array(z.string()).min(1).max(4),
  /** Phrase from the narration where this side comes up; it appears there. */
  cue: z.string().optional(),
});

export const comparisonSceneSchema = z.object({
  type: z.literal("comparison"),
  heading: z.string().optional(),
  left: comparisonSideSchema,
  right: comparisonSideSchema,
  ...sceneBase,
});

export const codeStepSchema = z.object({
  code: z.string(),
  /** Lines to focus, 1-based, e.g. "2,4-6". */
  highlight: z.string().optional(),
  /** Phrase from the narration where this step starts. Ignored on the first step. */
  cue: z.string().optional(),
});

export const codeSceneSchema = z.object({
  type: z.literal("code"),
  language: z.enum(SUPPORTED_LANGUAGES),
  fileName: z.string().optional(),
  /** Shown one after another; lines new in a step animate in. */
  steps: z.array(codeStepSchema).min(1),
  ...sceneBase,
});

export const IMAGE_LAYOUTS = ["full", "framed"] as const;
export const IMAGE_MOTIONS = [
  "zoom-in",
  "zoom-out",
  "pan-left",
  "pan-right",
  "none",
] as const;

export const imageSceneSchema = z.object({
  type: z.literal("image"),
  /**
   * Path inside public/ or a full URL. Empty until an image is uploaded,
   * picked from stock, or generated; a placeholder shows until then.
   */
  src: z.string().optional(),
  /** What the image shows. Used as alt text and to find or generate an image. */
  alt: z.string(),
  /** Keywords for a stock photo search. Defaults to `alt`. */
  search: z.string().optional(),
  /** A prompt for an AI illustration. When set, the image step generates one if it can. */
  prompt: z.string().optional(),
  /** Short text shown with the image. */
  caption: z.string().optional(),
  /** Who made the image and its license, shown small in a corner. */
  credit: z.string().optional(),
  /** "full" fills the frame; "framed" shows it on a card. Defaults to "full". */
  layout: z.enum(IMAGE_LAYOUTS).optional(),
  /** Slow camera move over the image. Defaults to "zoom-in". */
  motion: z.enum(IMAGE_MOTIONS).optional(),
  ...sceneBase,
});

export const DIAGRAM_LAYOUTS = ["flow", "cycle", "hub"] as const;

export const diagramNodeSchema = z.object({
  label: z.string(),
  icon: z.enum(ICON_NAMES).optional(),
  /** Phrase from the narration where this node comes up; it appears there. */
  cue: z.string().optional(),
});

export const diagramSceneSchema = z.object({
  type: z.literal("diagram"),
  heading: z.string().optional(),
  /**
   * "flow": steps joined by arrows. "cycle": steps around a loop that comes
   * back to the start. "hub": the first node in the middle, joined to the
   * rest around it. Defaults to "flow".
   */
  layout: z.enum(DIAGRAM_LAYOUTS).optional(),
  nodes: z.array(diagramNodeSchema).min(2).max(6),
  ...sceneBase,
});

export const ctaSceneSchema = z.object({
  type: z.literal("cta"),
  heading: z.string(),
  /** Button-style call to action, e.g. "Follow for part 2". */
  action: z.string(),
  ...sceneBase,
});

export const sceneSchema = z.discriminatedUnion("type", [
  titleSceneSchema,
  statementSceneSchema,
  listSceneSchema,
  statSceneSchema,
  chartSceneSchema,
  quoteSceneSchema,
  comparisonSceneSchema,
  codeSceneSchema,
  imageSceneSchema,
  diagramSceneSchema,
  ctaSceneSchema,
]);

const hexColor = z
  .string()
  .regex(HEX_COLOR, "Use a 6-digit hex color, like #7C5CFF.");

/** The video's look: a preset, plus any colors or font changed from it. */
export const themeSettingSchema = z.object({
  /** "midnight", "paper", "ember", "chalkboard", or "contrast". */
  preset: z.enum(THEME_PRESET_NAMES),
  /** Bars, buttons, and highlights. */
  accent: hexColor.optional(),
  background: hexColor.optional(),
  text: hexColor.optional(),
  /** Heading and body font. Defaults to the preset's. */
  font: z.enum(THEME_FONT_NAMES).optional(),
});

/** Who made the video. Shown on the closing call to action. */
export const brandSchema = z.object({
  name: z.string().optional(),
  /** e.g. "@bondeth" */
  handle: z.string().optional(),
  /** e.g. "bondeth.dev" */
  website: z.string().optional(),
});

/**
 * A project's identity: who the creator is and how their videos look. New
 * videos in the project start with it.
 */
export const brandKitSchema = brandSchema.extend({
  theme: themeSettingSchema.optional(),
});

export const videoSpecSchema = z.object({
  version: z.literal(1),
  title: z.string(),
  /** BCP 47 language of the narration, e.g. "en". */
  language: z.string().default("en"),
  /** Show word-by-word captions of the narration. */
  captions: z.boolean().default(true),
  /** Play sound effects on transitions and as scene items appear. */
  sfx: z.boolean().default(true),
  music: z
    .object({
      /** Path inside public/ or a full URL: a bed in music/, or a track uploaded next to the voice-overs. */
      src: z.string().min(1),
      volume: z.number().min(0).max(1).default(DEFAULT_MUSIC_VOLUME),
    })
    .optional(),
  /** Defaults to the "midnight" preset. */
  theme: themeSettingSchema.optional(),
  /** Defaults to the creator in src/brand.ts. */
  brand: brandSchema.optional(),
  scenes: z.array(sceneSchema).min(1),
});

export type WordTiming = z.infer<typeof wordTimingSchema>;
export type SceneAudio = z.infer<typeof sceneAudioSchema>;
export type Scene = z.infer<typeof sceneSchema>;
export type SceneType = Scene["type"];
export type SceneOf<T extends SceneType> = Extract<Scene, { type: T }>;
export type Transition = (typeof TRANSITIONS)[number];
export type CodeStep = z.infer<typeof codeStepSchema>;
export type ChartPoint = z.infer<typeof chartPointSchema>;
export type ChartStyle = (typeof CHART_STYLES)[number];
export type ImageLayout = (typeof IMAGE_LAYOUTS)[number];
export type ImageMotion = (typeof IMAGE_MOTIONS)[number];
export type DiagramLayout = (typeof DIAGRAM_LAYOUTS)[number];
export type DiagramNode = z.infer<typeof diagramNodeSchema>;
export type Brand = z.infer<typeof brandSchema>;
export type BrandKit = z.infer<typeof brandKitSchema>;
export type VideoSpec = z.infer<typeof videoSpecSchema>;
/** A spec as written by hand, before defaults are applied. */
export type VideoSpecInput = z.input<typeof videoSpecSchema>;

export const SCENE_TYPES = sceneSchema.options.map(
  (option) => option.shape.type.value,
);
