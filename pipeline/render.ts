import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import {
  renderMedia,
  renderStill,
  selectComposition,
} from "@remotion/renderer";
import type { VideoFormat } from "../src/lib/formats";
import { coverFrame } from "../src/lib/publish";
import { getVideoTiming } from "../src/lib/timing";
import { videoSpecSchema, type VideoSpecInput } from "../src/spec/schema";
import { ROOT } from "./config";

export type RenderProgress = {
  stage: "bundling" | "rendering";
  /** 0 to 1 within the stage. */
  progress: number;
};

let serveUrl: Promise<string> | null = null;

/**
 * Bundles the Remotion app once per process. The bundle includes a copy of
 * public/, so voice-overs must be generated before the first render.
 */
const getServeUrl = (onProgress?: (progress: RenderProgress) => void) => {
  serveUrl ??= bundle({
    entryPoint: path.join(ROOT, "src", "index.ts"),
    onProgress: (percent) =>
      onProgress?.({ stage: "bundling", progress: percent / 100 }),
  });
  return serveUrl;
};

/** Renders a spec to an MP4 file. */
export const renderVideo = async (
  spec: VideoSpecInput,
  format: VideoFormat,
  outputFile: string,
  onProgress?: (progress: RenderProgress) => void,
) => {
  await fs.mkdir(path.dirname(outputFile), { recursive: true });
  const url = await getServeUrl(onProgress);
  const inputProps = { spec };
  const composition = await selectComposition({
    serveUrl: url,
    id: `explainer-${format}`,
    inputProps,
  });
  await renderMedia({
    composition,
    serveUrl: url,
    codec: "h264",
    imageFormat: "jpeg",
    outputLocation: outputFile,
    inputProps,
    overwrite: true,
    onProgress: ({ progress }) =>
      onProgress?.({ stage: "rendering", progress }),
  });
};

/**
 * Exports one frame of a scene as a PNG cover image. Captions are turned off
 * so the cover shows only the scene.
 */
export const renderCover = async (
  spec: VideoSpecInput,
  format: VideoFormat,
  scene: number,
  outputFile: string,
  onProgress?: (progress: RenderProgress) => void,
) => {
  await fs.mkdir(path.dirname(outputFile), { recursive: true });
  const url = await getServeUrl(onProgress);
  const inputProps = { spec: { ...spec, captions: false } };
  const composition = await selectComposition({
    serveUrl: url,
    id: `explainer-${format}`,
    inputProps,
  });
  onProgress?.({ stage: "rendering", progress: 0 });
  await renderStill({
    composition,
    serveUrl: url,
    output: outputFile,
    imageFormat: "png",
    inputProps,
    overwrite: true,
    frame: coverFrame(getVideoTiming(videoSpecSchema.parse(spec)), scene),
  });
  onProgress?.({ stage: "rendering", progress: 1 });
};

/** Opens Remotion Studio with the spec loaded into the explainer compositions. */
export const openStudio = async (spec: VideoSpecInput) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "content-studio-"));
  const propsFile = path.join(tempDir, "props.json");
  await fs.writeFile(propsFile, JSON.stringify({ spec }));

  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        process.platform === "win32" ? "npx.cmd" : "npx",
        ["remotion", "studio", `--props=${propsFile}`],
        { stdio: "inherit" },
      );
      child.on("error", reject);
      child.on("exit", (code) =>
        code === 0
          ? resolve()
          : reject(new Error(`Remotion exited with code ${code}.`)),
      );
    });
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
};
