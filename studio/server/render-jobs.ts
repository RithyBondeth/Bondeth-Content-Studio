import "server-only";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import type { VideoFormat } from "../../src/lib/formats";
import { currentWorkspace, ROOT, runInWorkspace } from "../../pipeline/config";
import {
  coverPath,
  loadPlan,
  loadSpec,
  outputPath,
} from "../../pipeline/store";
import type { WorkerMessage } from "../../pipeline/render-worker";

export type RenderJob = {
  id: string;
  /** Whose project it is; none when running without accounts. */
  workspace?: string;
  slug: string;
  index: number;
  format: VideoFormat;
  /** A video, or a cover image of one scene. */
  kind: "video" | "cover";
  /** For covers: the 0-based scene to export. */
  scene?: number;
  status: "queued" | "bundling" | "rendering" | "done" | "error";
  /** 0 to 1 within the current stage. */
  progress: number;
  error?: string;
};

type JobStore = {
  jobs: Map<string, RenderJob>;
  queue: string[];
  running: boolean;
};

// Kept on globalThis so jobs survive hot reloads in development.
const store: JobStore = ((
  globalThis as { __renderJobs?: JobStore }
).__renderJobs ??= {
  jobs: new Map(),
  queue: [],
  running: false,
});

/** Renders use every CPU core, so they run one at a time. */
const runNext = async () => {
  if (store.running) return;
  const id = store.queue.shift();
  if (!id) return;
  const job = store.jobs.get(id);
  if (!job) return;

  store.running = true;
  try {
    // The queue runs outside any request, so step into the job's workspace.
    await runInWorkspace(job.workspace, () => runJob(job));
    job.status = "done";
    job.progress = 1;
  } catch (error) {
    job.status = "error";
    job.error = error instanceof Error ? error.message : String(error);
  } finally {
    store.running = false;
    void runNext();
  }
};

const runJob = async (job: RenderJob) => {
  const plan = await loadPlan(job.slug);
  const spec = await loadSpec(plan, job.index);
  if (!spec) throw new Error("This video has no script yet.");

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "content-studio-"));
  const specFile = path.join(tempDir, "spec.json");
  await fs.writeFile(specFile, JSON.stringify(spec));
  job.status = "bundling";

  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [
          "--import",
          "tsx",
          path.join(ROOT, "pipeline", "render-worker.ts"),
          specFile,
          job.format,
          ...(job.kind === "cover"
            ? [coverPath(plan, job.index, job.format), String(job.scene ?? 0)]
            : [outputPath(plan, job.index, job.format)]),
        ],
        { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] },
      );

      let failure: string | undefined;
      let stderr = "";
      child.stderr.on("data", (chunk: Buffer) => {
        stderr = (stderr + chunk.toString()).slice(-2000);
      });
      readline.createInterface({ input: child.stdout }).on("line", (line) => {
        let message: WorkerMessage;
        try {
          message = JSON.parse(line) as WorkerMessage;
        } catch {
          return; // Not one of our messages, e.g. a log line from a dependency.
        }
        if (message.type === "progress") {
          job.status = message.stage;
          job.progress = message.progress;
        } else if (message.type === "error") {
          failure = message.message;
        }
      });

      child.on("error", reject);
      child.on("exit", (code) => {
        if (code === 0) resolve();
        else
          reject(
            new Error(
              failure ?? (stderr.trim() || `Render exited with code ${code}.`),
            ),
          );
      });
    });
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
};

export const startRenderJob = (
  slug: string,
  index: number,
  format: VideoFormat,
  cover?: { scene: number },
) => {
  const kind = cover ? "cover" : "video";
  const workspace = currentWorkspace();
  const existing = [...store.jobs.values()].find(
    (job) =>
      job.workspace === workspace &&
      job.slug === slug &&
      job.index === index &&
      job.format === format &&
      job.kind === kind &&
      job.scene === cover?.scene &&
      !["done", "error"].includes(job.status),
  );
  if (existing) return existing;

  const job: RenderJob = {
    id: randomUUID(),
    ...(workspace ? { workspace } : {}),
    slug,
    index,
    format,
    kind,
    ...(cover ? { scene: cover.scene } : {}),
    status: "queued",
    progress: 0,
  };
  store.jobs.set(job.id, job);
  store.queue.push(job.id);
  void runNext();
  return job;
};

/** Only the current workspace's jobs are visible. */
const isMine = (job: RenderJob) => job.workspace === currentWorkspace();

export const getRenderJob = (id: string) => {
  const job = store.jobs.get(id);
  return job && isMine(job) ? job : null;
};

export const getActiveJobs = (slug: string, index: number) =>
  [...store.jobs.values()].filter(
    (job) =>
      isMine(job) &&
      job.slug === slug &&
      job.index === index &&
      !["done", "error"].includes(job.status),
  );
