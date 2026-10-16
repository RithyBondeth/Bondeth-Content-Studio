"use server";

import { revalidatePath } from "next/cache";
import type { VideoFormat } from "../src/lib/formats";
import { FORMAT_NAMES } from "../src/lib/formats";
import { videoSpecSchema, type VideoSpecInput } from "../src/spec/schema";
import { createPlan } from "../pipeline/plan";
import type { ContentPlan } from "../pipeline/schemas";
import { createVideoSpec } from "../pipeline/script";
import { loadPlan, loadSpec, mediaDir, saveSpec } from "../pipeline/store";
import { addVoiceOver } from "../pipeline/voice";
import {
  addBlankVideo,
  createExampleProject,
  deleteProject,
  listRenders,
  updatePlanContent,
  type RenderFile,
} from "../studio/server/projects";
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

export const addVideoAction = async (slug: string, title: string) =>
  run(async () => {
    const index = await addBlankVideo(slug, title);
    revalidatePath(`/projects/${slug}`);
    return index;
  });

export const writeScriptAction = async (
  slug: string,
  index: number,
  seconds: number,
) =>
  run(async () => {
    const plan = await loadPlan(slug);
    const { spec } = await createVideoSpec(plan, index, { seconds });
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
    const result = await addVoiceOver(spec, mediaDir(plan, index));
    await saveSpec(plan, index, result.spec);
    return result;
  });

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
