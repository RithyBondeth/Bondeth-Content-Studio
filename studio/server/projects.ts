import "server-only";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { examples } from "../../src/examples";
import type { VideoSpecInput } from "../../src/spec/schema";
import { FORMAT_NAMES, type VideoFormat } from "../../src/lib/formats";
import {
  MAX_MUSIC_UPLOAD_BYTES,
  MUSIC_UPLOAD_TYPES,
  musicUploadFileName,
} from "../../src/lib/music";
import { OUT_DIR, PUBLIC_DIR, MEDIA_SUBDIR } from "../../pipeline/config";
import type { ContentPlan } from "../../pipeline/schemas";
import {
  exists,
  listPlans,
  loadPlan,
  loadSpec,
  mediaDir,
  newVideoKey,
  outputPath,
  planDir,
  publicPath,
  savePlan,
  saveSpec,
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

export const listRenders = async (
  plan: PlanFile,
  index: number,
): Promise<RenderFile[]> => {
  const renders: RenderFile[] = [];
  for (const format of FORMAT_NAMES) {
    const file = outputPath(plan, index, format);
    const stat = await fs.stat(file).catch(() => null);
    if (stat) {
      const relative = path.relative(OUT_DIR, file).split(path.sep).join("/");
      renders.push({
        format,
        url: `/api/files/${relative}?v=${stat.mtimeMs.toFixed(0)}`,
        updatedAt: stat.mtime.toISOString(),
      });
    }
  }
  return renders;
};

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

/** A starter spec for videos written by hand. */
const starterSpec = (title: string): VideoSpecInput => ({
  version: 1,
  title,
  language: "en",
  captions: true,
  scenes: [
    {
      type: "title",
      heading: title,
      narration: `Here's what you need to know about ${title}.`,
    },
    {
      type: "cta",
      heading: "Want more like this?",
      action: "Follow for more",
      narration: "Follow for more videos like this.",
    },
  ],
});

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
  await saveSpec(updated, index, starterSpec(videoTitle));
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
  // Only known plans, so the slug can't point outside content/.
  if (!(await listPlans()).includes(slug)) {
    throw new Error("That project doesn't exist.");
  }
  const plan = await loadPlan(slug);
  if (!Number.isInteger(index) || !plan.plan.videos[index]) {
    throw new Error("That video doesn't exist.");
  }
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
  const src = path.posix.join(mediaDir(plan, index), name);
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
