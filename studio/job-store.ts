import type { DatabaseSync } from "node:sqlite";
import type { VideoFormat } from "../src/lib/formats";

/**
 * Render jobs, kept in SQLite so a restart doesn't lose them. No imports
 * from the server, so tests can run it on an in-memory database.
 */

export type JobStatus = "queued" | "bundling" | "rendering" | "done" | "error";

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
  status: JobStatus;
  /** 0 to 1 within the current stage. */
  progress: number;
  error?: string;
  /** While queued: how many renders will start before this one. */
  ahead?: number;
};

export type NewJob = Omit<RenderJob, "status" | "progress" | "error" | "ahead">;

type Row = {
  id: string;
  workspace: string;
  slug: string;
  video_index: number;
  format: string;
  kind: string;
  scene: number | null;
  status: string;
  progress: number;
  error: string | null;
  created_at: number;
};

const ACTIVE = "('queued', 'bundling', 'rendering')";
const RUNNING = "('bundling', 'rendering')";

const toJob = (row: Row): RenderJob => ({
  id: row.id,
  ...(row.workspace ? { workspace: row.workspace } : {}),
  slug: row.slug,
  index: row.video_index,
  format: row.format as VideoFormat,
  kind: row.kind as RenderJob["kind"],
  ...(row.scene === null ? {} : { scene: row.scene }),
  status: row.status as JobStatus,
  progress: row.progress,
  ...(row.error ? { error: row.error } : {}),
});

export const createJobStore = (db: DatabaseSync) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS render_jobs (
      id TEXT PRIMARY KEY,
      workspace TEXT NOT NULL,
      slug TEXT NOT NULL,
      video_index INTEGER NOT NULL,
      format TEXT NOT NULL,
      kind TEXT NOT NULL,
      scene INTEGER,
      status TEXT NOT NULL,
      progress REAL NOT NULL DEFAULT 0,
      error TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS render_jobs_status ON render_jobs (status, created_at);
  `);

  const row = (id: string) =>
    db.prepare("SELECT * FROM render_jobs WHERE id = ?").get(id) as
      Row | undefined;

  /** How many renders will start before a queued one: the running ones and older queued ones. */
  const ahead = (job: Row) => {
    const { count } = db
      .prepare(
        `SELECT COUNT(*) AS count FROM render_jobs
         WHERE status IN ${RUNNING}
            OR (status = 'queued' AND (created_at < ? OR (created_at = ? AND id < ?)))`,
      )
      .get(job.created_at, job.created_at, job.id) as { count: number };
    return count;
  };

  const withPosition = (job: Row) => ({
    ...toJob(job),
    ...(job.status === "queued" ? { ahead: ahead(job) } : {}),
  });

  return {
    add(job: NewJob, now = Date.now()): RenderJob {
      db.prepare(
        `INSERT INTO render_jobs
           (id, workspace, slug, video_index, format, kind, scene, status, progress, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'queued', 0, ?, ?)`,
      ).run(
        job.id,
        job.workspace ?? "",
        job.slug,
        job.index,
        job.format,
        job.kind,
        job.scene ?? null,
        now,
        now,
      );
      return withPosition(row(job.id)!);
    },

    /** A job, only if it belongs to `workspace`. */
    get(id: string, workspace: string | undefined): RenderJob | null {
      const found = row(id);
      return found && found.workspace === (workspace ?? "")
        ? withPosition(found)
        : null;
    },

    /** The workspace's queued and running jobs, oldest first. */
    active(workspace: string | undefined): RenderJob[] {
      return (
        db
          .prepare(
            `SELECT * FROM render_jobs WHERE workspace = ? AND status IN ${ACTIVE} ORDER BY created_at, id`,
          )
          .all(workspace ?? "") as Row[]
      ).map(withPosition);
    },

    update(
      id: string,
      change: { status?: JobStatus; progress?: number; error?: string },
      now = Date.now(),
    ) {
      db.prepare(
        `UPDATE render_jobs SET
           status = COALESCE(?, status),
           progress = COALESCE(?, progress),
           error = COALESCE(?, error),
           updated_at = ?
         WHERE id = ?`,
      ).run(
        change.status ?? null,
        change.progress ?? null,
        change.error ?? null,
        now,
        id,
      );
    },

    runningCount(): number {
      const { count } = db
        .prepare(
          `SELECT COUNT(*) AS count FROM render_jobs WHERE status IN ${RUNNING}`,
        )
        .get() as { count: number };
      return count;
    },

    /**
     * The next job to start, fairly: from the workspace with the fewest
     * renders running, and the oldest within that.
     */
    next(): RenderJob | null {
      const found = db
        .prepare(
          `SELECT q.* FROM render_jobs q
           WHERE q.status = 'queued'
           ORDER BY (SELECT COUNT(*) FROM render_jobs r
                     WHERE r.workspace = q.workspace AND r.status IN ${RUNNING}),
                    q.created_at, q.id
           LIMIT 1`,
        )
        .get() as Row | undefined;
      return found ? toJob(found) : null;
    },

    /** After a restart, renders that were running start again from the queue. */
    recover() {
      db.prepare(
        `UPDATE render_jobs SET status = 'queued', progress = 0 WHERE status IN ${RUNNING}`,
      ).run();
    },

    /** Forgets finished jobs older than `maxAge` milliseconds. */
    prune(maxAge: number, now = Date.now()) {
      db.prepare(
        "DELETE FROM render_jobs WHERE status IN ('done', 'error') AND updated_at < ?",
      ).run(now - maxAge);
    },
  };
};

export type JobStore = ReturnType<typeof createJobStore>;
