import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import {
  backupBucket,
  backupDate,
  backupKey,
  createBackupArchive,
} from "./backup";
import { readZip } from "./zip";

test("backups are named by time, sort by date, and read back", () => {
  const date = new Date("2026-10-28T20:00:05.123Z");
  const key = backupKey(date);
  assert.equal(key, "backups/2026-10-28T20-00-05Z.zip");
  assert.equal(backupDate(key)?.toISOString(), "2026-10-28T20:00:05.000Z");
  assert.ok(backupKey(new Date("2026-11-01")) > key);
  assert.equal(backupDate("backups/notes.txt"), null);
  assert.equal(backupDate("media/x.zip"), null);
});

test("backups use their own bucket and keys, sharing the endpoint", () => {
  assert.equal(backupBucket({}), null);
  const config = backupBucket({
    S3_ENDPOINT: "https://acct.r2.cloudflarestorage.com",
    S3_BUCKET: "studio",
    S3_ACCESS_KEY_ID: "main",
    S3_SECRET_ACCESS_KEY: "main-secret",
    BACKUP_S3_BUCKET: "studio-backup",
    BACKUP_S3_ACCESS_KEY_ID: "backup",
    BACKUP_S3_SECRET_ACCESS_KEY: "backup-secret",
  });
  assert.deepEqual(config, {
    endpoint: "https://acct.r2.cloudflarestorage.com",
    bucket: "studio-backup",
    region: "auto",
    accessKeyId: "backup",
    secretAccessKey: "backup-secret",
  });
});

test("an archive holds every project file and a working copy of the accounts", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "backup-root-"));
  try {
    const plan = path.join(root, "content", "u1", "p", "plan.json");
    fs.mkdirSync(path.dirname(plan), { recursive: true });
    fs.writeFileSync(plan, '{"title":"Fractions"}');
    const spec = path.join(
      root,
      "content",
      "u1",
      "p",
      "videos",
      "a",
      "spec.json",
    );
    fs.mkdirSync(path.dirname(spec), { recursive: true });
    fs.writeFileSync(spec, '{"scenes":[]}');
    fs.mkdirSync(path.join(root, ".studio"));
    fs.writeFileSync(path.join(root, ".studio", "settings.json"), "keys");
    const db = new DatabaseSync(path.join(root, ".studio", "auth.db"));
    db.exec(
      "CREATE TABLE user (email TEXT); INSERT INTO user VALUES ('a@b.c');",
    );

    // Made while the database is still open, as it is in the running studio.
    const zip = await createBackupArchive({
      root,
      now: new Date("2026-10-28T20:00:00Z"),
    });
    db.close();

    const entries = readZip(zip);
    const names = entries.map((entry) => entry.name).sort();
    assert.deepEqual(names, [
      "auth.db",
      "content/u1/p/plan.json",
      "content/u1/p/videos/a/spec.json",
      "manifest.json",
    ]);
    const manifest = JSON.parse(
      Buffer.from(
        entries.find((e) => e.name === "manifest.json")!.data,
      ).toString(),
    );
    assert.deepEqual(manifest, {
      version: 1,
      createdAt: "2026-10-28T20:00:00.000Z",
      contentFiles: 2,
      accounts: true,
    });

    const copy = path.join(root, "restored.db");
    fs.writeFileSync(copy, entries.find((e) => e.name === "auth.db")!.data);
    const restored = new DatabaseSync(copy);
    assert.deepEqual(
      restored
        .prepare("SELECT email FROM user")
        .all()
        .map((r) => r.email),
      ["a@b.c"],
    );
    restored.close();
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
