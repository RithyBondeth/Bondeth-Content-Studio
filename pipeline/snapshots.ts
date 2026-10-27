/**
 * Visual regression check. Renders the frames listed in
 * src/snapshots/frames.ts and compares each with its reference image in
 * snapshots/<platform>/.
 *
 *   npm run snapshots                  compare every frame
 *   npm run snapshots -- --update      rewrite the references that changed
 *   npm run snapshots -- list code     only frames whose name contains "list" or "code"
 *
 * Failing frames get a side-by-side image (reference | this render | diff)
 * in out/snapshots/diff/. Font rendering differs between operating systems,
 * so each platform has its own references; only snapshots/linux/ is
 * committed, and CI checks against it.
 */
import fs from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import {
  ensureBrowser,
  openBrowser,
  renderStill,
  selectComposition,
  type ChromiumOptions,
} from "@remotion/renderer";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { getVideoTiming } from "../src/lib/timing";
import {
  getSnapshotFrameNumber,
  SNAPSHOT_FRAMES,
  SNAPSHOT_VIDEOS,
  type SnapshotFrame,
} from "../src/snapshots/frames";
import { videoSpecSchema } from "../src/spec/schema";
import { OUT_ROOT, ROOT } from "./config";

/** Half size: enough to see a broken layout, a quarter of the pixels to compare. */
const SCALE = 0.5;
/** How different two pixels' colors may be (0 to 1) before they count as changed. pixelmatch's default. */
const PIXEL_THRESHOLD = 0.1;
/** Share of a frame's pixels that may change before it fails: room for font anti-aliasing, not for a real change. */
const MAX_CHANGED_SHARE = 0.001;
/** Frames rendered at once in the one browser. */
const CONCURRENCY = 4;
// Software WebGL on every platform, so the GPU never changes a pixel.
const CHROMIUM_OPTIONS: ChromiumOptions = { gl: "swangle" };

const PLATFORM = process.platform;
const REFERENCE_DIR = path.join(ROOT, "snapshots", PLATFORM);
const ACTUAL_DIR = path.join(OUT_ROOT, "snapshots", "actual");
const DIFF_DIR = path.join(OUT_ROOT, "snapshots", "diff");

type Result =
  | { frame: SnapshotFrame; status: "pass"; changed: number }
  | { frame: SnapshotFrame; status: "fail"; changed: number; reason: string }
  | { frame: SnapshotFrame; status: "missing" }
  | { frame: SnapshotFrame; status: "updated"; reason: string };

const readPng = (file: string) => PNG.sync.read(fs.readFileSync(file));

/** Reference, this render, and the diff side by side, so a failure is easy to read. */
const writeSideBySide = (file: string, images: [PNG, PNG, PNG], gap = 16) => {
  const width = images.reduce((sum, image) => sum + image.width, 0);
  const height = Math.max(...images.map((image) => image.height));
  const out = new PNG({ width: width + gap * 2, height });
  out.data.fill(255);
  let x = 0;
  for (const image of images) {
    PNG.bitblt(image, out, 0, 0, image.width, image.height, x, 0);
    x += image.width + gap;
  }
  fs.writeFileSync(file, PNG.sync.write(out));
};

/** Compares a render with its reference: how many pixels changed, and why it fails if it does. */
const compare = (frame: SnapshotFrame, actualFile: string) => {
  const reference = readPng(path.join(REFERENCE_DIR, `${frame.name}.png`));
  const actual = readPng(actualFile);
  if (reference.width !== actual.width || reference.height !== actual.height) {
    return {
      changed: reference.width * reference.height,
      reason: `size changed from ${reference.width}x${reference.height} to ${actual.width}x${actual.height}`,
    };
  }
  const { width, height } = reference;
  const diff = new PNG({ width, height });
  const changed = pixelmatch(
    reference.data,
    actual.data,
    diff.data,
    width,
    height,
    { threshold: PIXEL_THRESHOLD, alpha: 0.3 },
  );
  if (changed / (width * height) <= MAX_CHANGED_SHARE) {
    return { changed, reason: null };
  }
  writeSideBySide(path.join(DIFF_DIR, `${frame.name}.png`), [
    reference,
    actual,
    diff,
  ]);
  const percent = ((changed / (width * height)) * 100).toFixed(2);
  return { changed, reason: `${changed} pixels changed (${percent}%)` };
};

/** Runs `task` over `items`, at most `limit` at a time. */
const mapLimit = async <T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index]!);
    }
  };
  await Promise.all(Array.from({ length: limit }, worker));
  return results;
};

const main = async () => {
  const args = process.argv.slice(2);
  const update = args.includes("--update");
  const filters = args.filter((arg) => !arg.startsWith("--"));
  const frames = SNAPSHOT_FRAMES.filter(
    (frame) =>
      filters.length === 0 ||
      filters.some((filter) => frame.name.includes(filter)),
  );
  if (frames.length === 0) {
    throw new Error(`No snapshot frame matches ${filters.join(", ")}.`);
  }

  fs.rmSync(path.join(OUT_ROOT, "snapshots"), { recursive: true, force: true });
  for (const dir of [REFERENCE_DIR, ACTUAL_DIR, DIFF_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // The Chrome Headless Shell version is pinned by @remotion/renderer, so
  // every run on a platform uses the same browser.
  await ensureBrowser({ chromeMode: "headless-shell" });
  console.log("Bundling…");
  const serveUrl = await bundle({
    entryPoint: path.join(ROOT, "src", "index.ts"),
  });
  const browser = await openBrowser("chrome", {
    chromeMode: "headless-shell",
    chromiumOptions: CHROMIUM_OPTIONS,
  });

  console.log(
    `Rendering ${frames.length} frames at ${SCALE}x, comparing with ${path.relative(ROOT, REFERENCE_DIR)}/`,
  );
  let results: Result[];
  try {
    results = await mapLimit(frames, CONCURRENCY, async (frame) => {
      const spec = SNAPSHOT_VIDEOS[frame.video];
      const inputProps = { spec };
      const composition = await selectComposition({
        serveUrl,
        id: `explainer-${frame.format}`,
        inputProps,
        puppeteerInstance: browser,
        chromiumOptions: CHROMIUM_OPTIONS,
      });
      const actualFile = path.join(ACTUAL_DIR, `${frame.name}.png`);
      await renderStill({
        composition,
        serveUrl,
        inputProps,
        frame: getSnapshotFrameNumber(
          getVideoTiming(videoSpecSchema.parse(spec)),
          frame,
        ),
        output: actualFile,
        imageFormat: "png",
        scale: SCALE,
        overwrite: true,
        puppeteerInstance: browser,
        chromiumOptions: CHROMIUM_OPTIONS,
        logLevel: "error",
      });

      const referenceFile = path.join(REFERENCE_DIR, `${frame.name}.png`);
      if (!fs.existsSync(referenceFile)) {
        if (!update) return { frame, status: "missing" };
        fs.copyFileSync(actualFile, referenceFile);
        return { frame, status: "updated", reason: "new" };
      }
      const { changed, reason } = compare(frame, actualFile);
      if (!reason) return { frame, status: "pass", changed };
      if (!update) return { frame, status: "fail", changed, reason };
      // Only references that really changed are rewritten, so updating
      // doesn't churn files over anti-aliasing noise.
      fs.copyFileSync(actualFile, referenceFile);
      return { frame, status: "updated", reason };
    });
  } finally {
    await browser.close({ silent: true });
  }

  if (update && filters.length === 0) {
    const names = new Set(SNAPSHOT_FRAMES.map((frame) => `${frame.name}.png`));
    for (const file of fs.readdirSync(REFERENCE_DIR)) {
      if (file.endsWith(".png") && !names.has(file)) {
        fs.rmSync(path.join(REFERENCE_DIR, file));
        console.log(`  removed  ${file} (no longer in frames.ts)`);
      }
    }
  }

  for (const result of results) {
    const { name } = result.frame;
    switch (result.status) {
      case "pass":
        console.log(`  ok       ${name} (${result.changed} pixels changed)`);
        break;
      case "updated":
        console.log(`  updated  ${name} (${result.reason})`);
        break;
      case "missing":
        console.log(`  MISSING  ${name}: no reference image`);
        break;
      case "fail":
        console.log(`  FAIL     ${name}: ${result.reason}`);
        break;
    }
  }

  const failed = results.filter(
    (result) => result.status === "fail" || result.status === "missing",
  );
  if (failed.length === 0) {
    console.log(
      update
        ? `\nReferences in ${path.relative(ROOT, REFERENCE_DIR)}/ are up to date.`
        : `\nAll ${results.length} frames match.`,
    );
    return;
  }
  console.log(
    `\n${failed.length} of ${results.length} frames differ from ${path.relative(ROOT, REFERENCE_DIR)}/:`,
  );
  for (const { frame } of failed) console.log(`  - ${frame.name}`);
  if (failed.some((result) => result.status === "fail")) {
    console.log(
      `Diffs (reference | this render | changed pixels in red) are in ${path.relative(ROOT, DIFF_DIR)}/.`,
    );
  }
  console.log(
    "If the change is intended, run `npm run snapshots -- --update` (see README, Visual snapshots).",
  );
  process.exitCode = 1;
};

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
