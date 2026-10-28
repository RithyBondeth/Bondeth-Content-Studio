import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
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

/** Where bundles are kept between renders, one folder per version of the code. */
const BUNDLE_ROOT = path.join(ROOT, ".studio", "remotion-bundle");

/** The files that go into the bundle: the compositions, their config, and the dependencies. */
const listBundleInputs = async (root: string): Promise<string[]> => {
  const files: string[] = [];
  const walk = async (dir: string) => {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(file);
      else if (!/\.test\.tsx?$/.test(entry.name)) files.push(file);
    }
  };
  await walk(path.join(root, "src"));
  for (const name of ["remotion.config.ts", "package-lock.json"]) {
    const file = path.join(root, name);
    if (await fs.stat(file).catch(() => null)) files.push(file);
  }
  return files.sort();
};

/**
 * A short hash of everything in the bundle except public/, which is linked
 * rather than copied. It changes only when the code does, so a bundle is
 * built once and reused by every render until then.
 */
export const bundleHash = async (root = ROOT) => {
  const hash = createHash("sha256");
  for (const file of await listBundleInputs(root)) {
    hash.update(path.relative(root, file)).update("\0");
    hash.update(await fs.readFile(file)).update("\0");
  }
  return hash.digest("hex").slice(0, 16);
};

let serveUrl: Promise<string> | null = null;

/**
 * The bundled Remotion app, built once and kept in .studio/remotion-bundle/
 * for later renders. public/ is linked into it, not copied, so voice-overs and
 * images made after the bundle was built are still found, and every person's
 * media isn't copied into each bundle.
 */
const getServeUrl = (onProgress?: (progress: RenderProgress) => void) => {
  serveUrl ??= (async () => {
    const dir = path.join(BUNDLE_ROOT, await bundleHash());
    if (await fs.stat(path.join(dir, "index.html")).catch(() => null)) {
      return dir;
    }
    // Built beside the final folder and moved in when complete, so two
    // workers bundling at once never use a half-written bundle.
    const temporary = `${dir}.${process.pid}.tmp`;
    await fs.rm(temporary, { recursive: true, force: true });
    await bundle({
      entryPoint: path.join(ROOT, "src", "index.ts"),
      outDir: temporary,
      symlinkPublicDir: true,
      onProgress: (percent) =>
        onProgress?.({ stage: "bundling", progress: percent / 100 }),
    });
    try {
      await fs.rename(temporary, dir);
    } catch (error) {
      // Another worker finished first: use its bundle.
      if (!(await fs.stat(path.join(dir, "index.html")).catch(() => null))) {
        throw error;
      }
      await fs.rm(temporary, { recursive: true, force: true });
    }
    await pruneBundles(path.basename(dir));
    return dir;
  })();
  return serveUrl;
};

/** Deletes bundles of older versions of the code. */
const pruneBundles = async (keep: string) => {
  for (const entry of await fs.readdir(BUNDLE_ROOT).catch(() => [])) {
    if (entry !== keep && !entry.endsWith(".tmp")) {
      await fs.rm(path.join(BUNDLE_ROOT, entry), {
        recursive: true,
        force: true,
      });
    }
  }
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
