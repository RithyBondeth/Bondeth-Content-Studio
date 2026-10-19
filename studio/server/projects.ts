import "server-only";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { examples } from "../../src/examples";
import {
  brandKitSchema,
  type BrandKit,
  type VideoSpecInput,
  type VoiceSetting,
} from "../../src/spec/schema";
import { FORMAT_NAMES, type VideoFormat } from "../../src/lib/formats";
import {
  MAX_MUSIC_UPLOAD_BYTES,
  MUSIC_UPLOAD_TYPES,
  musicUploadFileName,
} from "../../src/lib/music";
import { OUT_DIR, PUBLIC_DIR, MEDIA_SUBDIR } from "../../pipeline/config";
import type { ContentPlan } from "../../pipeline/schemas";
import { applyBrandKit, kitCreator } from "../../pipeline/script";
import { scenesToRecord, voiceForVideo } from "../../pipeline/voice";
import {
  coverPath,
  exists,
  listPlans,
  loadPlan,
  loadPublishKit,
  loadSpec,
  mediaDir,
  newVideoKey,
  outputPath,
  planDir,
  publicPath,
  savePlan,
  saveSpec,
  slugify,
  uniquePlanSlug,
  type PlanFile,
} from "../../pipeline/store";

export type VideoStatus = "draft" | "scripted" | "voiced";

export type RenderFile = {
  format: VideoFormat;
  url: string;
  updatedAt: string;
};

export type VideoSummary = {
  index: number;
  title: string;
  hook: string;
  status: VideoStatus;
  scenes: number;
  renders: RenderFile[];
  /** Whether AI has written its posts in the publish kit. */
  hasPosts: boolean;
};

export type ProjectSummary = {
  slug: string;
  title: string;
  idea: string;
  createdAt: string;
  videos: number;
  scripted: number;
  voiced: number;
  rendered: number;
};

const statusOf = (spec: VideoSpecInput | null): VideoStatus =>
  !spec
    ? "draft"
    : spec.scenes.every((scene) => scene.audio)
      ? "voiced"
      : "scripted";

/** Each format's file in out/ that exists, with a URL the studio can load it from. */
const listOutFiles = async (
  fileFor: (format: VideoFormat) => string,
): Promise<RenderFile[]> => {
  const files: RenderFile[] = [];
  for (const format of FORMAT_NAMES) {
    const file = fileFor(format);
    const stat = await fs.stat(file).catch(() => null);
    if (stat) {
      const relative = path.relative(OUT_DIR, file).split(path.sep).join("/");
      files.push({
        format,
        url: `/api/files/${relative}?v=${stat.mtimeMs.toFixed(0)}`,
        updatedAt: stat.mtime.toISOString(),
      });
    }
  }
  return files;
};

export const listRenders = (plan: PlanFile, index: number) =>
  listOutFiles((format) => outputPath(plan, index, format));

/** The cover images exported for a video. */
export const listCovers = (plan: PlanFile, index: number) =>
  listOutFiles((format) => coverPath(plan, index, format));

export const getVideoSummaries = async (
  plan: PlanFile,
): Promise<VideoSummary[]> =>
  Promise.all(
    plan.plan.videos.map(async (video, index) => {
      const spec = await loadSpec(plan, index);
      return {
        index,
        title: video.title,
        hook: video.hook,
        status: statusOf(spec),
        scenes: spec?.scenes.length ?? 0,
        renders: await listRenders(plan, index),
        hasPosts: Boolean((await loadPublishKit(plan, index))?.posts),
      };
    }),
  );

export const listProjects = async (): Promise<ProjectSummary[]> => {
  const slugs = await listPlans();
  const projects = await Promise.all(
    slugs.map(async (slug) => {
      const plan = await loadPlan(slug);
      const videos = await getVideoSummaries(plan);
      return {
        slug,
        title: plan.plan.title,
        idea: plan.idea,
        createdAt: plan.createdAt,
        videos: videos.length,
        scripted: videos.filter((video) => video.status !== "draft").length,
        voiced: videos.filter((video) => video.status === "voiced").length,
        rendered: videos.filter((video) => video.renders.length > 0).length,
      };
    }),
  );
  return projects.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

/** A ready-made project built from the hand-written examples. No API keys needed. */
export const createExampleProject = async (): Promise<string> => {
  const slug = await uniquePlanSlug("example-project");
  const plan: PlanFile = {
    version: 1,
    slug,
    idea: "Example project, made without AI",
    createdAt: new Date().toISOString(),
    options: { videos: examples.length, language: "en" },
    plan: {
      title: "Example: explainer starter",
      audience: "Curious learners who like short, clear explanations",
      goal: "Show what Content Studio can make before you add API keys",
      tone: "Friendly, clear, and upbeat",
      pillars: [
        {
          name: "Everyday science",
          description: "Why the world works the way it does",
        },
        {
          name: "Coding basics",
          description: "Small, practical programming lessons",
        },
      ],
      videos: examples.map((example) => ({
        title: example.spec.title,
        pillar: example.id.includes("react")
          ? "Coding basics"
          : "Everyday science",
        hook: example.spec.scenes[0]?.narration.split(/(?<=[.?!])\s/)[0] ?? "",
        angle: "A hand-written example video",
        keyPoints: [],
        callToAction: "Follow for more",
      })),
      schedule: {
        postsPerWeek: 3,
        notes: "Post every other day at the same time.",
      },
    },
  };
  await savePlan(plan);
  const saved = await loadPlan(slug);
  await Promise.all(
    examples.map((example, index) => saveSpec(saved, index, example.spec)),
  );
  return slug;
};

type PlannedVideo = ContentPlan["videos"][number];

/**
 * A starter spec for videos written by hand, seeded from whatever the plan
 * already says about the video: its hook, key points, and call to action.
 */
const starterSpec = (
  video: Pick<PlannedVideo, "title"> & Partial<PlannedVideo>,
  language = "en",
): VideoSpecInput => {
  const points = (video.keyPoints ?? []).filter(Boolean).slice(0, 6);
  const action = video.callToAction?.trim() || "Follow for more";
  return {
    version: 1,
    title: video.title,
    language,
    captions: true,
    scenes: [
      {
        type: "title",
        heading: video.title,
        narration:
          video.hook?.trim() ||
          `Here's what you need to know about ${video.title}.`,
      },
      ...(points.length
        ? [
            {
              type: "list" as const,
              heading: "Key points",
              items: points,
              narration: points.join(". "),
            },
          ]
        : []),
      {
        type: "cta",
        heading: "Want more like this?",
        action,
        narration: `${action}.`.replace(/([.!?])\.$/, "$1"),
      },
    ],
  };
};

/** A project with a title and empty video slots, planned and written by hand. */
export const createBlankProject = async (input: {
  title: string;
  videos: number;
  language: string;
  audience?: string;
  tone?: string;
}): Promise<string> => {
  const title = input.title.trim().split("\n")[0]!.slice(0, 80).trim();
  if (!title) throw new Error("Give the project a title first.");
  const count = Math.min(Math.max(Math.round(input.videos), 1), 20);
  const slug = await uniquePlanSlug(slugify(title));
  await savePlan({
    version: 1,
    slug,
    idea: input.title.trim(),
    createdAt: new Date().toISOString(),
    options: {
      videos: count,
      language: input.language || "en",
      audience: input.audience?.trim() || undefined,
      tone: input.tone?.trim() || undefined,
    },
    plan: {
      title,
      audience: input.audience?.trim() ?? "",
      goal: "",
      tone: input.tone?.trim() ?? "",
      pillars: [],
      videos: Array.from({ length: count }, (_, i) => ({
        title: `Video ${i + 1}`,
        pillar: "",
        hook: "",
        angle: "",
        keyPoints: [],
        callToAction: "",
      })),
      schedule: { postsPerWeek: 3, notes: "" },
    },
  });
  return slug;
};

/** Gives a planned video a starter script to write by hand, instead of with AI. */
export const startScriptByHand = async (slug: string, index: number) => {
  const plan = await loadPlan(slug);
  const video = plan.plan.videos[index];
  if (!video) throw new Error("That video isn't in the plan.");
  if (await loadSpec(plan, index)) return;
  await saveSpec(
    plan,
    index,
    applyBrandKit(starterSpec(video, plan.options.language), plan.brand),
  );
};

/** Adds a video to a plan with a starter script, for writing by hand. */
export const addBlankVideo = async (slug: string, title: string) => {
  const plan = await loadPlan(slug);
  const videoTitle = title.trim() || "Untitled video";
  const key = newVideoKey(
    `${String(plan.plan.videos.length + 1).padStart(2, "0")}-${videoTitle}`,
    plan.videoKeys ?? [],
  );
  const updated: PlanFile = {
    ...plan,
    plan: {
      ...plan.plan,
      videos: [
        ...plan.plan.videos,
        {
          title: videoTitle,
          pillar: "",
          hook: "",
          angle: "",
          keyPoints: [],
          callToAction: "",
        },
      ],
    },
    videoKeys: [...(plan.videoKeys ?? []), key],
  };
  await savePlan(updated);
  const index = updated.plan.videos.length - 1;
  await saveSpec(
    updated,
    index,
    applyBrandKit(
      starterSpec({ title: videoTitle }, plan.options.language),
      plan.brand,
    ),
  );
  return index;
};

export const updatePlanContent = async (slug: string, content: ContentPlan) => {
  const plan = await loadPlan(slug);
  if (content.videos.length !== plan.plan.videos.length) {
    throw new Error("Adding or removing videos isn't supported here.");
  }
  await savePlan({ ...plan, plan: content });
};

/**
 * Saves a project's brand kit. The creator's name, handle, and website are
 * one identity, so every scripted video picks them up; the theme is a
 * starting point for new videos, so existing ones keep theirs. The voice is
 * read when recording, so it applies to every video without its own.
 */
export const updateBrandKit = async (slug: string, input: BrandKit) => {
  const result = brandKitSchema.safeParse(input);
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Invalid brand kit.");
  }
  const creator = kitCreator(result.data);
  const kit: BrandKit = {
    ...creator,
    theme: result.data.theme,
    voice: result.data.voice,
  };
  if (!kit.theme) delete kit.theme;
  if (!kit.voice) delete kit.voice;

  const plan = await loadPlan(slug);
  const updated: PlanFile = { ...plan, brand: kit };
  if (!creator && !kit.theme && !kit.voice) delete updated.brand;
  await savePlan(updated);

  await Promise.all(
    plan.plan.videos.map(async (_, index) => {
      const spec = await loadSpec(updated, index);
      if (!spec) return;
      const next: VideoSpecInput = { ...spec, brand: creator };
      if (!creator) delete next.brand;
      await saveSpec(updated, index, next);
    }),
  );
  return updated.brand;
};

export type VoiceChange = {
  index: number;
  title: string;
  /** Recorded scenes (0-based) that would be recorded again. */
  scenes: number[];
};

/**
 * What switching the project's voice to `voice` would re-record: for each
 * video that follows the project's voice, the scenes already recorded with
 * a different voice or settings.
 */
export const projectVoiceChanges = async (
  slug: string,
  voice: VoiceSetting | undefined,
): Promise<VoiceChange[]> => {
  const plan = await loadPlan(slug);
  const changes: VoiceChange[] = [];
  for (const [index, video] of plan.plan.videos.entries()) {
    const spec = await loadSpec(plan, index);
    if (!spec || spec.voice) continue;
    const pending = await scenesToRecord(
      spec,
      mediaDir(plan, index),
      voiceForVideo(spec, { projectVoice: voice }),
    );
    const scenes = pending.filter((scene) => spec.scenes[scene]?.audio);
    if (scenes.length) changes.push({ index, title: video.title, scenes });
  }
  return changes;
};

/**
 * The media folder (relative to public/) of a video the studio was asked
 * about. Only known plans and videos, so a slug can't point outside content/.
 */
export const videoMediaDir = async (
  slug: string,
  index: number,
): Promise<string> => {
  if (!(await listPlans()).includes(slug)) {
    throw new Error("That project doesn't exist.");
  }
  const plan = await loadPlan(slug);
  if (!Number.isInteger(index) || !plan.plan.videos[index]) {
    throw new Error("That video doesn't exist.");
  }
  return mediaDir(plan, index);
};

/**
 * Stores an uploaded music track in the video's media folder, next to its
 * voice-overs, and returns its src for the spec. The same file uploaded twice
 * is stored once.
 */
export const saveMusicUpload = async (
  slug: string,
  index: number,
  fileName: string,
  bytes: Buffer,
): Promise<string> => {
  const dir = await videoMediaDir(slug, index);
  if (bytes.length === 0) throw new Error("That file is empty.");
  if (bytes.length > MAX_MUSIC_UPLOAD_BYTES) {
    throw new Error(
      `Music files can be up to ${MAX_MUSIC_UPLOAD_BYTES / 1024 / 1024} MB.`,
    );
  }
  const hash = createHash("sha256").update(bytes).digest("hex");
  const name = musicUploadFileName(fileName, hash);
  if (!name) {
    const formats = Object.keys(MUSIC_UPLOAD_TYPES)
      .map((extension) => extension.toUpperCase())
      .join(", ");
    throw new Error(`Upload an audio file: ${formats}.`);
  }
  const src = path.posix.join(dir, name);
  const file = publicPath(src);
  if (!(await exists(file))) {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, bytes);
  }
  return src;
};

/** Deletes a project's plan, scripts, voice-overs, and renders. */
export const deleteProject = async (slug: string) => {
  const plan = await loadPlan(slug);
  await Promise.all(
    [
      planDir(plan.slug),
      path.join(PUBLIC_DIR, MEDIA_SUBDIR, plan.slug),
      path.join(OUT_DIR, plan.slug),
    ].map((dir) => fs.rm(dir, { recursive: true, force: true })),
  );
};

export { exists };
