import { z } from "zod";
import { SUPPORTED_LANGUAGES } from "../lib/languages";

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
  quoteSceneSchema,
  comparisonSceneSchema,
  codeSceneSchema,
  ctaSceneSchema,
]);

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
      /** Path inside public/ or a full URL. */
      src: z.string(),
      volume: z.number().min(0).max(1).default(0.15),
    })
    .optional(),
  scenes: z.array(sceneSchema).min(1),
});

export type WordTiming = z.infer<typeof wordTimingSchema>;
export type SceneAudio = z.infer<typeof sceneAudioSchema>;
export type Scene = z.infer<typeof sceneSchema>;
export type SceneType = Scene["type"];
export type SceneOf<T extends SceneType> = Extract<Scene, { type: T }>;
export type Transition = (typeof TRANSITIONS)[number];
export type CodeStep = z.infer<typeof codeStepSchema>;
export type VideoSpec = z.infer<typeof videoSpecSchema>;
/** A spec as written by hand, before defaults are applied. */
export type VideoSpecInput = z.input<typeof videoSpecSchema>;

export const SCENE_TYPES = sceneSchema.options.map(
  (option) => option.shape.type.value,
);
