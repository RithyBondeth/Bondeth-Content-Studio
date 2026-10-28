import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { ROOT } from "./config";
import { bucketConfig, listKeys, request, type BucketConfig } from "./storage";
import { createZip, readZip, type ZipEntry } from "./zip";

/**
 * Nightly backups of what only the server has: every project's plans and
 * scripts (content/) and the accounts database (.studio/auth.db). Media and
 * renders are already in the main bucket, and saved API keys are left out on
 * purpose. Each backup is one zip in its own bucket, set with BACKUP_S3_*,
 * and the newest BACKUP_KEEP (default 30) are kept.
 */

type Env = Record<string, string | undefined>;

const CONTENT_DIR = path.join(ROOT, "content");
const AUTH_DB = path.join(ROOT, ".studio", "auth.db");
const PREFIX = "backups/";

export const backupBucket = (env: Env = process.env) =>
  bucketConfig(env, "BACKUP_");

const keepCount = (env: Env = process.env) =>
  Math.max(1, Number(env.BACKUP_KEEP) || 30);

/** e.g. backups/2026-10-28T20-00-00Z.zip: sorts by date. */
export const backupKey = (date: Date) =>
  `${PREFIX}${date
    .toISOString()
    .replace(/\.\d+Z$/, "Z")
    .replace(/:/g, "-")}.zip`;

/** When a backup was made, from its key. */
export const backupDate = (key: string): Date | null => {
  const match =
    /^backups\/(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})Z\.zip$/.exec(key);
  return match
    ? new Date(`${match[1]}T${match[2]}:${match[3]}:${match[4]}Z`)
    : null;
};

const filesUnder = async (dir: string): Promise<string[]> => {
  const entries = await fs
    .readdir(dir, { withFileTypes: true })
    .catch(() => []);
  const files: string[] = [];
  for (const entry of entries) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await filesUnder(file)));
    else if (entry.isFile()) files.push(file);
  }
  return files;
};

/** A consistent copy of a SQLite database, even while the studio is using it. */
const snapshot = async (file: string): Promise<Buffer | null> => {
  if (!(await fs.stat(file).catch(() => null))) return null;
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "studio-backup-"));
  try {
    const copy = path.join(dir, "auth.db");
    const db = new DatabaseSync(file);
    try {
      db.prepare("VACUUM INTO ?").run(copy);
    } finally {
      db.close();
    }
    return await fs.readFile(copy);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
};

/** The backup as a zip: content/..., auth.db, and a small manifest. */
export const createBackupArchive = async (
  options: { root?: string; now?: Date } = {},
): Promise<Buffer> => {
  const root = options.root ?? ROOT;
  const contentDir = path.join(root, "content");
  const entries: ZipEntry[] = [];
  for (const file of await filesUnder(contentDir)) {
    entries.push({
      name: path
        .join("content", path.relative(contentDir, file))
        .split(path.sep)
        .join("/"),
      data: await fs.readFile(file),
    });
  }
  const auth = await snapshot(path.join(root, ".studio", "auth.db"));
  if (auth) entries.push({ name: "auth.db", data: auth });
  entries.push({
    name: "manifest.json",
    data: Buffer.from(
      JSON.stringify(
        {
          version: 1,
          createdAt: (options.now ?? new Date()).toISOString(),
          contentFiles: entries.filter((e) => e.name.startsWith("content/"))
            .length,
          accounts: Boolean(auth),
        },
        null,
        2,
      ),
    ),
  });
  return createZip(entries);
};

const requireBucket = (): BucketConfig => {
  const config = backupBucket();
  if (!config) {
    throw new Error(
      "Backups aren't set up. Set BACKUP_S3_BUCKET, BACKUP_S3_ACCESS_KEY_ID, and BACKUP_S3_SECRET_ACCESS_KEY (and S3_ENDPOINT).",
    );
  }
  return config;
};

/** The backups in the bucket, newest first. */
export const listBackups = async (config = requireBucket()) =>
  (await listKeys(config, PREFIX))
    .filter((key) => backupDate(key))
    .sort()
    .reverse();

/** Makes a backup now, uploads it, and removes the oldest beyond BACKUP_KEEP. */
export const runBackup = async (now = new Date()) => {
  const config = requireBucket();
  const zip = await createBackupArchive({ now });
  const key = backupKey(now);
  await request(config, key, {
    method: "PUT",
    body: new Uint8Array(zip),
    headers: { "Content-Type": "application/zip" },
  });
  const old = (await listBackups(config)).slice(keepCount());
  for (const stale of old) {
    await request(config, stale, { method: "DELETE" });
  }
  return { key, bytes: zip.length, removed: old.length };
};

/**
 * Puts a backup back: "latest" or a key from listBackups. What's there now is
 * moved to .studio/before-restore-<time>/ first, so a restore can be undone.
 * Stop the studio before restoring.
 */
export const restoreBackup = async (which = "latest") => {
  const config = requireBucket();
  const key =
    which === "latest" ? (await listBackups(config))[0] : which.trim();
  if (!key || !backupDate(key)) {
    throw new Error(
      which === "latest"
        ? "There are no backups yet."
        : `No backup "${which}".`,
    );
  }
  const response = await request(config, key, { method: "GET" });
  if (response.status === 404) throw new Error(`No backup "${key}".`);
  const entries = readZip(Buffer.from(await response.arrayBuffer()));
  if (!entries.some((entry) => entry.name === "manifest.json")) {
    throw new Error(`${key} isn't a studio backup.`);
  }

  const aside = path.join(
    ROOT,
    ".studio",
    `before-restore-${new Date().toISOString().replace(/[:.]/g, "-")}`,
  );
  await fs.mkdir(path.join(aside, "content"), { recursive: true });
  // Moves what's inside content/, not the folder itself: in Docker it's a
  // link into the data volume, and that link has to stay where it is.
  await fs.mkdir(CONTENT_DIR, { recursive: true });
  for (const entry of await fs.readdir(CONTENT_DIR)) {
    await fs.rename(
      path.join(CONTENT_DIR, entry),
      path.join(aside, "content", entry),
    );
  }
  if (await fs.stat(AUTH_DB).catch(() => null)) {
    await fs.rename(AUTH_DB, path.join(aside, "auth.db"));
  }

  let files = 0;
  for (const entry of entries) {
    const target =
      entry.name === "auth.db"
        ? AUTH_DB
        : entry.name.startsWith("content/")
          ? path.resolve(ROOT, entry.name)
          : null;
    // Only content/ and auth.db, and never a path outside content/.
    if (
      !target ||
      (target !== AUTH_DB && !target.startsWith(CONTENT_DIR + path.sep))
    ) {
      continue;
    }
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, entry.data);
    if (target === AUTH_DB) await fs.chmod(target, 0o600);
    files++;
  }
  return { key, files, previous: aside };
};

const DAY = 24 * 60 * 60 * 1000;

/**
 * Backs up once a day in the studio's own process: checks every hour, and
 * runs when the newest backup is older than a day. Quiet when backups
 * aren't set up.
 */
export const startBackupSchedule = () => {
  if (!backupBucket()) return;
  const holder = globalThis as { __backupTimer?: NodeJS.Timeout };
  if (holder.__backupTimer) return;
  const check = async () => {
    try {
      const newest = (await listBackups())[0];
      const last = newest ? backupDate(newest) : null;
      if (last && Date.now() - last.getTime() < DAY - 5 * 60 * 1000) return;
      const { key, bytes } = await runBackup();
      console.log(`[backup] Saved ${key} (${Math.round(bytes / 1024)} KB).`);
    } catch (error) {
      console.error("[backup] Failed:", error);
    }
  };
  holder.__backupTimer = setInterval(check, 60 * 60 * 1000);
  holder.__backupTimer.unref();
  // A first check shortly after start, so a new server is backed up today.
  setTimeout(check, 60 * 1000).unref();
};
