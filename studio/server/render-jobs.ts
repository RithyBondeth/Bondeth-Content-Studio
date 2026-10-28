import "server-only";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import { DatabaseSync } from "node:sqlite";
import type { VideoFormat } from "../../src/lib/formats";
import { currentWorkspace, ROOT, runInWorkspace } from "../../pipeline/config";
import {
  coverPath,
  loadPlan,
  loadSpec,
  outputPath,
} from "../../pipeline/store";
import type { WorkerMessage } from "../../pipeline/render-worker";
import { createJobStore, type JobStore, type RenderJob } from "../job-store";

export type { RenderJob } from "../job-store";

/** Renders use every CPU core, so by default they run one at a time. */
const CONCURRENCY = Math.max(1, Number(process.env.RENDER_CONCURRENCY) || 1);
/** How many unfinished renders one person can have at once. */
const MAX_PER_PERSON = Math.max(1, Number(process.env.RENDER_MAX_QUEUED) || 3);
/** Finished jobs are forgotten after a day. */
const KEEP_FINISHED = 24 * 60 * 60 * 1000;

type Queue = { jobs: JobStore; running: Set<string> };

/**
 * The queue, in .studio/jobs.db so it survives restarts. Kept on globalThis
 * so a hot reload in development keeps the same one (and doesn't mistake its
 * own running renders for ones a restart interrupted).
 */
const queue = (): Queue => {
  const holder = globalThis as { __renderQueue?: Queue };
  if (!holder.__renderQueue) {
    const file = path.join(ROOT, ".studio", "jobs.db");
    fsSync.mkdirSync(path.dirname(file), { recursive: true });
    const jobs = createJobStore(new DatabaseSync(file));
    // Anything still marked running was cut off by a restart: queue it again.
    jobs.recover();
    holder.__renderQueue = { jobs, running: new Set() };
    setTimeout(pump, 0);
  }
  return holder.__renderQueue;
};

/** Starts queued renders while there's room. */
const pump = () => {
  const { jobs, running } = queue();
  while (running.size < CONCURRENCY) {
    const job = jobs.next();
    if (!job) return;
    running.add(job.id);
    jobs.update(job.id, { status: "bundling", progress: 0 });
    void (async () => {
      try {
        // The queue runs outside any request, so step into the job's workspace.
        await runInWorkspace(job.workspace, () => runJob(job));
        jobs.update(job.id, { status: "done", progress: 1 });
      } catch (error) {
        jobs.update(job.id, {
          status: "error",
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        running.delete(job.id);
        pump();
      }
    })();
  }
};

const runJob = async (job: RenderJob) => {
  const plan = await loadPlan(job.slug);
  const spec = await loadSpec(plan, job.index);
  if (!spec) throw new Error("This video has no script yet.");

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "content-studio-"));
  const specFile = path.join(tempDir, "spec.json");
  await fs.writeFile(specFile, JSON.stringify(spec));

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
          queue().jobs.update(job.id, {
            status: message.stage,
            progress: message.progress,
          });
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
): RenderJob => {
  const { jobs } = queue();
  const kind = cover ? "cover" : "video";
  const workspace = currentWorkspace();
  const active = jobs.active(workspace);
  const existing = active.find(
    (job) =>
      job.slug === slug &&
      job.index === index &&
      job.format === format &&
      job.kind === kind &&
      job.scene === cover?.scene,
  );
  if (existing) return existing;
  if (active.length >= MAX_PER_PERSON) {
    throw new Error(
      `You already have ${active.length} renders waiting or running. Start this one when one of them finishes.`,
    );
  }

  jobs.prune(KEEP_FINISHED);
  const job = jobs.add({
    id: randomUUID(),
    ...(workspace ? { workspace } : {}),
    slug,
    index,
    format,
    kind,
    ...(cover ? { scene: cover.scene } : {}),
  });
  pump();
  return job;
};

/** A job of the current workspace's, with its place in the queue. */
export const getRenderJob = (id: string) =>
  queue().jobs.get(id, currentWorkspace());

export const getActiveJobs = (slug: string, index: number) =>
  queue()
    .jobs.active(currentWorkspace())
    .filter((job) => job.slug === slug && job.index === index);

/** Picks up renders a restart interrupted, without waiting for someone to open the studio. */
export const resumeRenderQueue = () => {
  queue();
};
