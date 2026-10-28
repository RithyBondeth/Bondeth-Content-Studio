import fs from "node:fs/promises";
import { ensureLocal, existsAnywhere } from "./storage";
import path from "node:path";
import {
  bundleFileName,
  bundleReadme,
  postFileText,
  type BundleContents,
  type BundlePiece,
} from "../src/lib/bundle";
import { getCaptionCues, toSrt, toWebVtt } from "../src/lib/caption-files";
import type { VideoFormat } from "../src/lib/formats";
import { PLATFORM_RULES, PLATFORMS, type Platform } from "../src/lib/publish";
import { getVideoTiming } from "../src/lib/timing";
import { videoSpecSchema } from "../src/spec/schema";
import {
  captionPath,
  coverPath,
  loadPublishKit,
  loadSpec,
  outputPath,
  videoKey,
  type PlanFile,
} from "./store";
import { createZip, type ZipEntry } from "./zip";

const noScript = (plan: PlanFile, index: number) =>
  new Error(
    `Video ${index + 1} has no script yet. Run: npm run pipeline -- script ${plan.slug} --video ${index + 1}`,
  );

/**
 * Writes the SRT and WebVTT caption files for one format of a video next to
 * its render, and returns their text. Returns null when no scene has narration.
 */
export const writeCaptionFiles = async (
  plan: PlanFile,
  index: number,
  format: VideoFormat,
) => {
  const input = await loadSpec(plan, index);
  if (!input) throw noScript(plan, index);
  const spec = videoSpecSchema.parse(input);
  const cues = getCaptionCues(spec, getVideoTiming(spec), format);
  if (!cues.length) return null;
  const files = {
    srt: { file: captionPath(plan, index, format, "srt"), text: toSrt(cues) },
    vtt: {
      file: captionPath(plan, index, format, "vtt"),
      text: toWebVtt(cues),
    },
  };
  await fs.mkdir(path.dirname(files.srt.file), { recursive: true });
  await Promise.all(
    Object.values(files).map(({ file, text }) => fs.writeFile(file, text)),
  );
  return files;
};

/**
 * Builds the zip for posting one video on one platform: the render, cover,
 * post text, and captions. Missing pieces are left out and listed in the
 * README inside, so a bundle can always be downloaded.
 */
export const buildBundle = async (
  plan: PlanFile,
  index: number,
  platform: Platform,
): Promise<{
  fileName: string;
  zip: Buffer;
  contents: BundleContents;
}> => {
  const spec = await loadSpec(plan, index);
  if (!spec) throw noScript(plan, index);
  const { format } = PLATFORM_RULES[platform];
  const entries: ZipEntry[] = [];
  const contents: BundleContents = { files: [], missing: [] };
  const add = (piece: BundlePiece, name: string, data: Uint8Array) => {
    entries.push({ name, data });
    contents.files.push({ piece, name });
  };
  const addFile = async (piece: BundlePiece, file: string) => {
    if (await ensureLocal(file)) {
      add(piece, path.basename(file), await fs.readFile(file));
    } else {
      contents.missing.push(piece);
    }
  };

  await addFile("video", outputPath(plan, index, format));
  await addFile("cover", coverPath(plan, index, format));

  const kit = await loadPublishKit(plan, index);
  if (kit?.posts) {
    add(
      "post",
      "post.txt",
      Buffer.from(postFileText(platform, kit.posts[platform])),
    );
  } else {
    contents.missing.push("post");
  }

  const captions = await writeCaptionFiles(plan, index, format);
  if (captions) {
    for (const { file, text } of Object.values(captions)) {
      add("captions", path.basename(file), Buffer.from(text));
    }
  } else {
    contents.missing.push("captions");
  }

  entries.push({
    name: "README.txt",
    data: Buffer.from(
      bundleReadme({
        title: spec.title,
        platform,
        contents,
        command: { plan: plan.slug, video: index + 1 },
      }),
    ),
  });

  return {
    fileName: bundleFileName(videoKey(plan, index), platform),
    zip: createZip(entries),
    contents,
  };
};

/** What each platform's bundle would hold right now, without building it. */
export const bundleStatus = async (
  plan: PlanFile,
  index: number,
): Promise<Record<Platform, BundlePiece[]>> => {
  const spec = await loadSpec(plan, index);
  const kit = await loadPublishKit(plan, index);
  const hasNarration = !!spec?.scenes.some((scene) => scene.narration.trim());
  const status = {} as Record<Platform, BundlePiece[]>;
  for (const platform of PLATFORMS) {
    const { format } = PLATFORM_RULES[platform];
    const missing: BundlePiece[] = [];
    if (!(await existsAnywhere(outputPath(plan, index, format))))
      missing.push("video");
    if (!(await existsAnywhere(coverPath(plan, index, format))))
      missing.push("cover");
    if (!kit?.posts) missing.push("post");
    if (!hasNarration) missing.push("captions");
    status[platform] = missing;
  }
  return status;
};
