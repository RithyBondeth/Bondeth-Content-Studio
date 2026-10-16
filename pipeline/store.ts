import fs from "node:fs/promises";
import path from "node:path";
import type { VideoSpecInput } from "../src/spec/schema";
import { CONTENT_DIR, MEDIA_SUBDIR, OUT_DIR, PUBLIC_DIR } from "./config";
import type { ContentPlan } from "./schemas";

/** What `plan` saves: the generated plan plus how it was made. */
export type PlanFile = {
  version: 1;
  slug: string;
  idea: string;
  createdAt: string;
  options: PlanOptions;
  plan: ContentPlan;
  /**
   * Folder name for each video, parallel to plan.videos. Stored so renaming
   * or reordering videos doesn't lose their scripts.
   */
  videoKeys?: string[];
};

export type PlanOptions = {
  videos: number;
  audience?: string;
  tone?: string;
  language: string;
};

export const slugify = (text: string, maxLength = 48) =>
  text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/, "") || "untitled";

export const planDir = (planSlug: string) => path.join(CONTENT_DIR, planSlug);
const planFile = (planSlug: string) =>
  path.join(planDir(planSlug), "plan.json");

/** Picks a folder name for a new video that no other video in the plan uses. */
export const newVideoKey = (title: string, taken: string[]) => {
  const base = slugify(title, 40);
  let key = base;
  for (let n = 2; taken.includes(key); n++) {
    key = `${base}-${n}`;
  }
  return key;
};

/** Gives every video a folder name, keeping the ones it already has. */
export const withVideoKeys = (plan: PlanFile): PlanFile => {
  const keys: string[] = [];
  plan.plan.videos.forEach((video, index) => {
    keys.push(
      plan.videoKeys?.[index] ??
        newVideoKey(
          `${String(index + 1).padStart(2, "0")}-${video.title}`,
          keys,
        ),
    );
  });
  return { ...plan, videoKeys: keys };
};

/** The folder name for one video in a plan, e.g. "03-why-is-the-sky-blue". */
export const videoKey = (plan: PlanFile, index: number) => {
  if (!plan.plan.videos[index]) {
    throw new Error(
      `Plan "${plan.slug}" has ${plan.plan.videos.length} videos; there is no video ${index + 1}.`,
    );
  }
  const key = withVideoKeys(plan).videoKeys![index]!;
  return key;
};

export const specPath = (plan: PlanFile, index: number) =>
  path.join(planDir(plan.slug), "videos", videoKey(plan, index), "spec.json");

/** Media folder for a video, relative to public/ (what staticFile() expects). */
export const mediaDir = (plan: PlanFile, index: number) =>
  path.posix.join(MEDIA_SUBDIR, plan.slug, videoKey(plan, index));

export const publicPath = (relative: string) => path.join(PUBLIC_DIR, relative);

export const outputPath = (plan: PlanFile, index: number, format: string) =>
  path.join(OUT_DIR, plan.slug, `${videoKey(plan, index)}-${format}.mp4`);

const exists = async (file: string) =>
  fs.access(file).then(
    () => true,
    () => false,
  );

export const readJson = async <T>(file: string): Promise<T> =>
  JSON.parse(await fs.readFile(file, "utf8")) as T;

export const writeJson = async (file: string, data: unknown) => {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(data, null, 2)}\n`);
};

export const savePlan = (plan: PlanFile) =>
  writeJson(planFile(plan.slug), plan);

export const loadPlan = async (planSlug: string): Promise<PlanFile> => {
  const file = planFile(planSlug);
  if (!(await exists(file))) {
    const plans = await listPlans();
    throw new Error(
      `No plan named "${planSlug}". ${plans.length ? `Plans: ${plans.join(", ")}` : 'Create one with: npm run pipeline -- plan "your idea"'}`,
    );
  }
  return withVideoKeys(await readJson<PlanFile>(file));
};

export const listPlans = async (): Promise<string[]> => {
  if (!(await exists(CONTENT_DIR))) {
    return [];
  }
  const entries = await fs.readdir(CONTENT_DIR, { withFileTypes: true });
  const plans: string[] = [];
  for (const entry of entries) {
    if (entry.isDirectory() && (await exists(planFile(entry.name)))) {
      plans.push(entry.name);
    }
  }
  return plans.sort();
};

/** Picks a plan slug that isn't taken yet. */
export const uniquePlanSlug = async (base: string) => {
  let slug = base;
  for (let n = 2; await exists(planDir(slug)); n++) {
    slug = `${base}-${n}`;
  }
  return slug;
};

export const loadSpec = async (
  plan: PlanFile,
  index: number,
): Promise<VideoSpecInput | null> => {
  const file = specPath(plan, index);
  return (await exists(file)) ? readJson<VideoSpecInput>(file) : null;
};

export const saveSpec = (plan: PlanFile, index: number, spec: VideoSpecInput) =>
  writeJson(specPath(plan, index), spec);

export { exists };
