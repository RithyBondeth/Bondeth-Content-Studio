"use server";

import { revalidatePath } from "next/cache";
import type { VideoFormat } from "../src/lib/formats";
import { FORMAT_NAMES } from "../src/lib/formats";
import {
  publishKitSchema,
  type Platform,
  type PublishKit,
} from "../src/lib/publish";
import {
  videoSpecSchema,
  type BrandKit,
  type ImageLayout,
  type VideoSpecInput,
  type VoiceSetting,
} from "../src/spec/schema";
import { createPlan } from "../pipeline/plan";
import type { ContentPlan } from "../pipeline/schemas";
import { createVideoSpec } from "../pipeline/script";
import { createPublishKit } from "../pipeline/publish";
import { bundleStatus } from "../pipeline/bundle";
import type { BundlePiece } from "../src/lib/bundle";
import {
  loadPlan,
  loadPublishKit,
  loadSpec,
  mediaDir,
  savePublishKit,
  saveSpec,
} from "../pipeline/store";
import {
  addImages,
  downloadImage,
  generateImage,
  searchStockImages,
  type StockImage,
} from "../pipeline/images";
import { addVoiceOver, scenesToRecord, voiceForVideo } from "../pipeline/voice";
import { listVoices } from "../pipeline/voices";
import { splitTake } from "../pipeline/recording";
import {
  addBlankVideo,
  createBlankProject,
  createExampleProject,
  deleteProject,
  listCovers,
  listRenders,
  projectVoiceChanges,
  startScriptByHand,
  updateBrandKit,
  updatePlanContent,
  videoMediaDir,
  type RenderFile,
} from "../studio/server/projects";
import {
  getSettingsView,
  saveSettings,
  listModels,
  testSettings,
  type SettingsInput,
} from "../studio/server/settings";
import {
  getRenderJob,
  startRenderJob,
  type RenderJob,
} from "../studio/server/render-jobs";

/** Server actions return errors as values so the UI can show the real message. */
export type Result<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string };

const run = async <T>(task: () => Promise<T>): Promise<Result<T>> => {
  try {
    return { ok: true, data: await task() };
  } catch (error) {
    console.error(error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

export type NewProjectInput = {
  idea: string;
  videos: number;
  audience?: string;
  tone?: string;
  language: string;
};

export const createProjectAction = async (input: NewProjectInput) =>
  run(async () => {
    if (!input.idea.trim()) throw new Error("Describe your idea first.");
    const plan = await createPlan(input.idea.trim(), {
      videos: Math.min(Math.max(Math.round(input.videos), 1), 20),
      audience: input.audience?.trim() || undefined,
      tone: input.tone?.trim() || undefined,
      language: input.language || "en",
    });
    revalidatePath("/");
    return plan.slug;
  });

/** Starts a project without AI: the idea becomes its title, with empty video slots. */
export const createBlankProjectAction = async (input: NewProjectInput) =>
  run(async () => {
    const slug = await createBlankProject({ ...input, title: input.idea });
    revalidatePath("/");
    return slug;
  });

export const createExampleProjectAction = async () =>
  run(async () => {
    const slug = await createExampleProject();
    revalidatePath("/");
    return slug;
  });

export const deleteProjectAction = async (slug: string) =>
  run(async () => {
    await deleteProject(slug);
    revalidatePath("/");
  });

export const updatePlanAction = async (slug: string, content: ContentPlan) =>
  run(async () => {
    await updatePlanContent(slug, content);
    revalidatePath(`/projects/${slug}`);
  });

export const updateBrandKitAction = async (slug: string, kit: BrandKit) =>
  run(async () => {
    const saved = await updateBrandKit(slug, kit);
    revalidatePath(`/projects/${slug}`, "layout");
    return saved ?? null;
  });

export const addVideoAction = async (slug: string, title: string) =>
  run(async () => {
    const index = await addBlankVideo(slug, title);
    revalidatePath(`/projects/${slug}`);
    return index;
  });

/** Gives a planned video a starter script to write by hand. */
export const startScriptAction = async (slug: string, index: number) =>
  run(async () => {
    await startScriptByHand(slug, index);
    revalidatePath(`/projects/${slug}`);
  });

export const writeScriptAction = async (
  slug: string,
  index: number,
  seconds: number,
) =>
  run(async () => {
    const plan = await loadPlan(slug);
    const { spec: written } = await createVideoSpec(plan, index, { seconds });
    // Images are best-effort: scenes without one keep a placeholder to fill in the editor.
    const { spec, failures } = await addImages(written, mediaDir(plan, index));
    for (const failure of failures) console.warn(failure);
    await saveSpec(plan, index, spec);
    revalidatePath(`/projects/${slug}`);
    return spec;
  });

export const saveSpecAction = async (
  slug: string,
  index: number,
  spec: VideoSpecInput,
) =>
  run(async () => {
    const result = videoSpecSchema.safeParse(spec);
    if (!result.success) {
      throw new Error(result.error.issues[0]?.message ?? "Invalid video.");
    }
    const plan = await loadPlan(slug);
    await saveSpec(plan, index, spec);
  });

export const recordVoiceAction = async (slug: string, index: number) =>
  run(async () => {
    const plan = await loadPlan(slug);
    const spec = await loadSpec(plan, index);
    if (!spec) throw new Error("Write the script first.");
    const result = await addVoiceOver(spec, mediaDir(plan, index), {
      projectVoice: plan.brand?.voice,
    });
    await saveSpec(plan, index, result.spec);
    return result;
  });

/**
 * Cuts a whole-video take (uploaded to /api/recording/video) into each
 * scene's voice-over at `cuts` (seconds). Returns the scenes' audio, in
 * order; the editor puts it into the spec.
 */
export const splitTakeAction = async (
  slug: string,
  index: number,
  take: string,
  cuts: number[],
  narrations: string[],
) =>
  run(async () =>
    splitTake(await videoMediaDir(slug, index), take, cuts, narrations),
  );

/** Saves one section of the Settings page. Takes effect on the next request. */
export const saveSettingsAction = async (input: SettingsInput) =>
  run(async () => {
    saveSettings(input);
    revalidatePath("/", "layout");
    return getSettingsView();
  });

/** Makes a cheap real call with a section's settings, saved or not. */
export const testSettingsAction = async (input: SettingsInput) =>
  run(() => testSettings(input));

/** The models the AI provider in the form offers (none for Claude). */
export const listModelsAction = async (
  input: Extract<SettingsInput, { section: "ai" }>,
) => run(() => listModels(input));

/** The voices in the ElevenLabs account. `fresh` skips the short cache. */
export const listVoicesAction = async (fresh = false) =>
  run(() => listVoices({ fresh }));

/**
 * Which scenes Record voice would generate for this version of the video
 * (saved or not), and the voice it would use.
 */
export const scenesToRecordAction = async (
  slug: string,
  index: number,
  spec: VideoSpecInput,
) =>
  run(async () => {
    const result = videoSpecSchema.safeParse(spec);
    if (!result.success) {
      throw new Error(result.error.issues[0]?.message ?? "Invalid video.");
    }
    const plan = await loadPlan(slug);
    const voice = voiceForVideo(spec, { projectVoice: plan.brand?.voice });
    return {
      scenes: await scenesToRecord(
        spec,
        await videoMediaDir(slug, index),
        voice,
      ),
      voice,
    };
  });

/** Recorded scenes that switching the project's voice would record again. */
export const projectVoiceChangesAction = async (
  slug: string,
  voice: VoiceSetting | undefined,
) => run(() => projectVoiceChanges(slug, voice));

export const startRenderAction = async (
  slug: string,
  index: number,
  format: VideoFormat,
): Promise<Result<RenderJob>> =>
  run(async () => {
    if (!FORMAT_NAMES.includes(format)) throw new Error("Unknown format.");
    return { ...startRenderJob(slug, index, format) };
  });

export const getRenderJobAction = async (id: string) =>
  run(async () => {
    const job = getRenderJob(id);
    return job ? { ...job } : null;
  });

export const listRendersAction = async (
  slug: string,
  index: number,
): Promise<Result<RenderFile[]>> =>
  run(async () => listRenders(await loadPlan(slug), index));

export const searchImagesAction = async (query: string, layout?: ImageLayout) =>
  run(() => searchStockImages(query, layout));

/** Downloads a stock photo into the video's media folder. */
export const pickStockImageAction = async (
  slug: string,
  index: number,
  image: Pick<StockImage, "url" | "credit">,
) =>
  run(async () => ({
    src: await downloadImage(image.url, await videoMediaDir(slug, index)),
    credit: image.credit,
  }));

export const generateImageAction = async (
  slug: string,
  index: number,
  prompt: string,
  layout?: ImageLayout,
) =>
  run(async () =>
    generateImage(prompt, await videoMediaDir(slug, index), layout),
  );

/** Writes (or rewrites) the video's posts for every platform with the AI provider. */
export const generatePublishKitAction = async (
  slug: string,
  index: number,
  coverScene?: number,
) =>
  run(async () => {
    const plan = await loadPlan(slug);
    const spec = await loadSpec(plan, index);
    if (!spec) throw new Error("Write the script first.");
    const previous = await loadPublishKit(plan, index);
    const kit = await createPublishKit(
      plan,
      index,
      spec,
      coverScene === undefined
        ? previous
        : { version: 1, ...previous, coverScene },
    );
    await savePublishKit(plan, index, kit);
    return kit;
  });

export const savePublishKitAction = async (
  slug: string,
  index: number,
  kit: PublishKit,
) =>
  run(async () => {
    const result = publishKitSchema.safeParse(kit);
    if (!result.success) {
      throw new Error(
        result.error.issues[0]?.message ?? "Invalid publish kit.",
      );
    }
    await savePublishKit(await loadPlan(slug), index, result.data);
  });

/** Exports one scene as the cover image for a format. Poll it with getRenderJobAction. */
export const startCoverAction = async (
  slug: string,
  index: number,
  format: VideoFormat,
  scene: number,
): Promise<Result<RenderJob>> =>
  run(async () => {
    if (!FORMAT_NAMES.includes(format)) throw new Error("Unknown format.");
    if (!Number.isInteger(scene) || scene < 0) throw new Error("Pick a scene.");
    return { ...startRenderJob(slug, index, format, { scene }) };
  });

export const listCoversAction = async (
  slug: string,
  index: number,
): Promise<Result<RenderFile[]>> =>
  run(async () => listCovers(await loadPlan(slug), index));

/** For each platform, the pieces its posting bundle is still missing. */
export const bundleStatusAction = async (
  slug: string,
  index: number,
): Promise<Result<Record<Platform, BundlePiece[]>>> =>
  run(async () => bundleStatus(await loadPlan(slug), index));
