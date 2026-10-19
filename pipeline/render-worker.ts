/**
 * Renders one video in its own process and reports progress as JSON lines
 * on stdout. Used by the web studio so Remotion's bundler stays out of the
 * Next.js server.
 *
 * Usage: tsx pipeline/render-worker.ts <spec.json> <vertical|landscape> <output.mp4>
 *        tsx pipeline/render-worker.ts <spec.json> <vertical|landscape> <cover.png> <scene>
 * With a scene number (0-based), it exports that scene as a cover image instead.
 */
import fs from "node:fs/promises";
import { FORMAT_NAMES, type VideoFormat } from "../src/lib/formats";
import type { VideoSpecInput } from "../src/spec/schema";
import { renderCover, renderVideo, type RenderProgress } from "./render";

export type WorkerMessage =
  | { type: "progress"; stage: "bundling" | "rendering"; progress: number }
  | { type: "done" }
  | { type: "error"; message: string };

const send = (message: WorkerMessage) =>
  process.stdout.write(`${JSON.stringify(message)}\n`);

const main = async () => {
  const [specFile, format, output, scene] = process.argv.slice(2);
  if (!specFile || !output || !FORMAT_NAMES.includes(format as VideoFormat)) {
    throw new Error(
      "Usage: render-worker <spec.json> <format> <output.mp4|cover.png> [scene]",
    );
  }
  const spec = JSON.parse(
    await fs.readFile(specFile, "utf8"),
  ) as VideoSpecInput;

  let last = "";
  const onProgress = ({ stage, progress }: RenderProgress) => {
    // Only report whole-percent changes to keep the output small.
    const key = `${stage}:${Math.floor(progress * 100)}`;
    if (key !== last) {
      last = key;
      send({ type: "progress", stage, progress });
    }
  };
  if (scene !== undefined) {
    await renderCover(
      spec,
      format as VideoFormat,
      Number(scene),
      output,
      onProgress,
    );
  } else {
    await renderVideo(spec, format as VideoFormat, output, onProgress);
  }
  send({ type: "done" });
};

main().catch((error: unknown) => {
  send({
    type: "error",
    message: error instanceof Error ? error.message : String(error),
  });
  process.exitCode = 1;
});
