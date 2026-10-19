import { z } from "zod";
import type { VideoFormat } from "./formats";
import type { VideoTiming } from "./timing";

/**
 * The publish kit: the title, post text, call to action, and hashtags for
 * each platform a video goes to, plus which scene to use as the cover.
 * Nothing here talks to Claude, so the studio can use it in the browser.
 */

export const PLATFORMS = ["tiktok", "shorts", "reels", "youtube"] as const;
export type Platform = (typeof PLATFORMS)[number];

export type PlatformRules = {
  label: string;
  /** Which render to upload: vertical for short-form, landscape for YouTube. */
  format: VideoFormat;
  /** Longest title the platform takes, or null when posts have no title. */
  titleLimit: number | null;
  /** Longest post text (caption or description), hashtags included. */
  textLimit: number;
  /** What the post text is called on the platform. */
  textLabel: string;
  /** How many hashtags to aim for, and the most we ever keep. */
  hashtags: { min: number; max: number };
  /** Platform norms, for Claude's prompt and for hints in the studio. */
  notes: string;
};

/**
 * Limits as of October 2026, from each platform's own documentation:
 * - TikTok: its posting API takes captions up to 2,200 characters (the app
 *   allows 4,000), so we stay under 2,200 to work everywhere. Videos have no
 *   separate title.
 * - YouTube: titles up to 100 characters, descriptions up to 5,000, and no
 *   "<" or ">" in either. More than 60 hashtags and YouTube ignores them all;
 *   the first 3 show above the title.
 * - Instagram: captions up to 2,200 characters, and at most 5 hashtags per
 *   post or Reel since December 2025. Reels have no separate title.
 */
export const PLATFORM_RULES: Record<Platform, PlatformRules> = {
  tiktok: {
    label: "TikTok",
    format: "vertical",
    titleLimit: null,
    textLimit: 2200,
    textLabel: "Caption",
    hashtags: { min: 3, max: 5 },
    notes:
      "Only the first line or so shows before 'more', so lead with the hook. Keep it short and casual: 1-3 sentences.",
  },
  shorts: {
    label: "YouTube Shorts",
    format: "vertical",
    titleLimit: 100,
    textLimit: 5000,
    textLabel: "Description",
    hashtags: { min: 3, max: 5 },
    notes:
      "The title is what most viewers see: under 60 characters reads best on a phone. The description can be 1-3 short sentences.",
  },
  reels: {
    label: "Instagram Reels",
    format: "vertical",
    titleLimit: null,
    textLimit: 2200,
    textLabel: "Caption",
    hashtags: { min: 3, max: 5 },
    notes:
      "About the first 125 characters show before 'more'. Open with the hook, then 2-4 short lines; line breaks are fine.",
  },
  youtube: {
    label: "YouTube",
    format: "landscape",
    titleLimit: 100,
    textLimit: 5000,
    textLabel: "Description",
    hashtags: { min: 3, max: 8 },
    notes:
      "This is the landscape version. Searchable title under 70 characters. The first 2 lines of the description show before 'more'; follow them with a short paragraph on what the video covers.",
  },
};

export const platformPostSchema = z.object({
  /** null when the platform has no title. */
  title: z.string().nullable(),
  text: z.string(),
  callToAction: z.string(),
  /** Each with its leading "#". */
  hashtags: z.array(z.string()),
});

export type PlatformPost = z.infer<typeof platformPostSchema>;

/** Empty posts for every platform, to write by hand. */
export const blankPosts = (): Record<Platform, PlatformPost> => ({
  tiktok: { title: null, text: "", callToAction: "", hashtags: [] },
  shorts: { title: "", text: "", callToAction: "", hashtags: [] },
  reels: { title: null, text: "", callToAction: "", hashtags: [] },
  youtube: { title: "", text: "", callToAction: "", hashtags: [] },
});

/** What publish.json holds, next to the video's spec.json. */
export const publishKitSchema = z.object({
  version: z.literal(1),
  /** 0-based scene to export as the cover image. */
  coverScene: z.number().int().min(0),
  /** When Claude last wrote the posts. */
  generatedAt: z.string().optional(),
  /** Missing until the posts are generated. */
  posts: z
    .object({
      tiktok: platformPostSchema,
      shorts: platformPostSchema,
      reels: platformPostSchema,
      youtube: platformPostSchema,
    })
    .optional(),
});

export type PublishKit = z.infer<typeof publishKitSchema>;

/** Platforms count characters in UTF-16 units, so an emoji counts as 2. */
export const charCount = (text: string) => text.length;

/**
 * Turns a word or phrase into a hashtag: "#" plus letters and numbers only.
 * Phrases are joined in CamelCase, which is easier to read and screen
 * readers say properly. Works for any script, not just English.
 */
export const formatHashtag = (raw: string): string | null => {
  const parts = raw
    .replace(/^[\s#]+/, "")
    .split(/[^\p{L}\p{M}\p{N}_]+/u)
    .filter(Boolean);
  if (!parts.length) return null;
  const tag =
    parts.length === 1
      ? parts[0]!
      : parts
          .map((part) => part.charAt(0).toLocaleUpperCase() + part.slice(1))
          .join("");
  return `#${tag}`;
};

/** Formats hashtags, drops empty ones and repeats (ignoring case), and keeps at most `max`. */
export const formatHashtags = (raw: string[], max = Infinity): string[] => {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const value of raw) {
    const tag = formatHashtag(value);
    if (!tag || seen.has(tag.toLowerCase())) continue;
    seen.add(tag.toLowerCase());
    tags.push(tag);
  }
  return tags.slice(0, max);
};

/** Hashtags typed into one box, separated by spaces, commas, or new lines. */
export const parseHashtagInput = (input: string, max?: number) =>
  formatHashtags(input.split(/[\s,]+/), max);

/** The text to paste into the platform: post text, call to action, then hashtags. */
export const composePost = (post: PlatformPost) =>
  [post.text.trim(), post.callToAction.trim(), post.hashtags.join(" ")]
    .filter(Boolean)
    .join("\n\n");

/** Cuts text to at most `limit` characters, at a word break where possible, with "…". */
export const truncate = (text: string, limit: number) => {
  const trimmed = text.trim();
  if (charCount(trimmed) <= limit) return trimmed;
  if (limit <= 1) return trimmed.slice(0, Math.max(0, limit));
  const cut = trimmed.slice(0, limit - 1);
  // The cut already ends at a word if the next character is a space.
  const endsAtWord = /\s/.test(trimmed.charAt(limit - 1));
  const lastSpace = cut.search(/\s\S*$/);
  // Only break at a word if that doesn't throw away most of the text.
  const atWord =
    !endsAtWord && lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${atWord.replace(/[\s,.;:!?-]+$/, "")}…`;
};

/** YouTube rejects titles and descriptions with angle brackets. */
const stripAngleBrackets = (text: string) => text.replace(/[<>]/g, "");

/**
 * Makes a post fit its platform: formatted hashtags, no more than allowed,
 * a title only where the platform has one, and everything within the
 * character limits. Hashtags and the call to action are kept; the post text
 * is shortened if the whole post is too long.
 */
export const fitPost = (
  platform: Platform,
  post: PlatformPost,
): PlatformPost => {
  const rules = PLATFORM_RULES[platform];
  const clean = (text: string) =>
    platform === "shorts" || platform === "youtube"
      ? stripAngleBrackets(text)
      : text;

  const title =
    rules.titleLimit === null || post.title === null
      ? null
      : truncate(clean(post.title), rules.titleLimit);
  const hashtags = formatHashtags(post.hashtags, rules.hashtags.max);
  const callToAction = clean(post.callToAction).trim();
  const fitted = {
    title,
    text: clean(post.text).trim(),
    callToAction,
    hashtags,
  };

  const overflow = charCount(composePost(fitted)) - rules.textLimit;
  if (overflow > 0) {
    fitted.text = truncate(
      fitted.text,
      Math.max(0, charCount(fitted.text) - overflow),
    );
  }
  return fitted;
};

/** Plain-language problems with a post, for warnings in the studio. Empty when it's ready. */
export const checkPost = (platform: Platform, post: PlatformPost): string[] => {
  const rules = PLATFORM_RULES[platform];
  const problems: string[] = [];
  if (rules.titleLimit !== null) {
    const title = post.title?.trim() ?? "";
    if (!title) problems.push("Add a title.");
    else if (charCount(title) > rules.titleLimit)
      problems.push(
        `The title is ${charCount(title) - rules.titleLimit} characters too long.`,
      );
  }
  const length = charCount(composePost(post));
  if (length > rules.textLimit)
    problems.push(
      `The post is ${length - rules.textLimit} characters too long for ${rules.label}.`,
    );
  if (post.hashtags.length > rules.hashtags.max)
    problems.push(
      `Use at most ${rules.hashtags.max} hashtags on ${rules.label}.`,
    );
  const bad = post.hashtags.filter((tag) => formatHashtag(tag) !== tag);
  if (bad.length) problems.push(`Fix these hashtags: ${bad.join(" ")}`);
  if (
    (platform === "shorts" || platform === "youtube") &&
    /[<>]/.test(`${post.title ?? ""}${post.text}${post.callToAction}`)
  )
    problems.push("YouTube doesn't allow < or > in titles or descriptions.");
  return problems;
};

/** The default cover: the first title scene, or the first scene. */
export const defaultCoverScene = (scenes: { type: string }[]) =>
  Math.max(
    0,
    scenes.findIndex((scene) => scene.type === "title"),
  );

/** Keeps a saved cover scene pointing at a scene that still exists. */
export const clampCoverScene = (scene: number, sceneCount: number) =>
  Math.min(Math.max(0, Math.round(scene)), Math.max(0, sceneCount - 1));

/**
 * The frame to export for a scene's cover: three quarters of the way in, so
 * its text and visuals have animated in, but before it starts to fade out.
 */
export const coverFrame = (timing: VideoTiming, scene: number) => {
  const index = clampCoverScene(scene, timing.scenes.length);
  const start = timing.starts[index] ?? 0;
  const length = timing.scenes[index] ?? 1;
  const settled = (timing.transitions[index] ?? 0) + 20;
  const frame = Math.max(settled, Math.floor(length * 0.75));
  return start + Math.min(frame, Math.max(0, length - 16));
};
