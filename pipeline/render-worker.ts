/**
 * Renders one video in its own process and reports progress as JSON lines
 * on stdout. Used by the web studio so Remotion's bundler stays out of the
 * Next.js server.
 *
 * Usage: tsx pipeline/render-worker.ts <spec.json> <vertical|landscape> <output.mp4>
 */
import fs from "node:fs/promises";
import { FORMAT_NAMES, type VideoFormat } from "../src/lib/formats";
import type { VideoSpecInput } from "../src/spec/schema";
import { renderVideo } from "./render";

export type WorkerMessage =
  | { type: "progress"; stage: "bundling" | "rendering"; progress: number }
  | { type: "done" }
  | { type: "error"; message: string };

const send = (message: WorkerMessage) =>
  process.stdout.write(`${JSON.stringify(message)}\n`);

const main = async () => {
  const [specFile, format, output] = process.argv.slice(2);
  if (!specFile || !output || !FORMAT_NAMES.includes(format as VideoFormat)) {
    throw new Error("Usage: render-worker <spec.json> <format> <output.mp4>");
  }
  const spec = JSON.parse(
    await fs.readFile(specFile, "utf8"),
  ) as VideoSpecInput;

  let last = "";
  await renderVideo(
    spec,
    format as VideoFormat,
    output,
    ({ stage, progress }) => {
      // Only report whole-percent changes to keep the output small.
      const key = `${stage}:${Math.floor(progress * 100)}`;
      if (key !== last) {
        last = key;
        send({ type: "progress", stage, progress });
      }
    },
  );
  send({ type: "done" });
};

main().catch((error: unknown) => {
  send({
    type: "error",
    message: error instanceof Error ? error.message : String(error),
  });
  process.exitCode = 1;
});
