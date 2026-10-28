import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { OUT_ROOT, PUBLIC_DIR } from "./config";
import {
  bucketConfig,
  ensureLocal,
  existsAnywhere,
  keyFor,
  mediaSources,
  presign,
  saved,
} from "./storage";

test("a bucket is used only when all four settings are there", () => {
  assert.equal(bucketConfig({}), null);
  assert.equal(
    bucketConfig({ S3_ENDPOINT: "https://x", S3_BUCKET: "b" }),
    null,
  );
  assert.deepEqual(
    bucketConfig({
      S3_ENDPOINT: "https://acct.r2.cloudflarestorage.com/",
      S3_BUCKET: "studio",
      S3_ACCESS_KEY_ID: "id",
      S3_SECRET_ACCESS_KEY: "secret",
    }),
    {
      endpoint: "https://acct.r2.cloudflarestorage.com",
      bucket: "studio",
      region: "auto",
      accessKeyId: "id",
      secretAccessKey: "secret",
    },
  );
});

test("media and renders map to bucket keys; nothing else does", () => {
  assert.equal(
    keyFor(path.join(PUBLIC_DIR, "content", "u1", "p", "v", "voice.mp3")),
    "media/u1/p/v/voice.mp3",
  );
  assert.equal(
    keyFor(path.join(OUT_ROOT, "u1", "p", "01-x-landscape.mp4")),
    "out/u1/p/01-x-landscape.mp4",
  );
  assert.equal(keyFor(path.join(PUBLIC_DIR, "fonts", "a.woff2")), null);
  assert.equal(keyFor(path.join(PUBLIC_DIR, "content")), null);
  assert.equal(keyFor(path.join(PUBLIC_DIR, "content", "..", "x")), null);
  assert.equal(keyFor("/etc/passwd"), null);
});

test("presigned links carry the expiry, signature, and download name", async () => {
  const url = new URL(
    await presign(
      {
        endpoint: "https://acct.r2.cloudflarestorage.com",
        bucket: "studio",
        region: "auto",
        accessKeyId: "id",
        secretAccessKey: "secret",
      },
      "out/u1/p/a b.mp4",
      { download: true, expiresIn: 60 },
    ),
  );
  assert.equal(url.pathname, "/studio/out/u1/p/a%20b.mp4");
  assert.equal(url.searchParams.get("X-Amz-Expires"), "60");
  assert.ok(url.searchParams.get("X-Amz-Signature"));
  assert.equal(
    url.searchParams.get("response-content-disposition"),
    'attachment; filename="a b.mp4"',
  );
});

test("without a bucket, everything works on the local disk only", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "storage-"));
  try {
    const file = path.join(dir, "a.mp3");
    await saved(file); // no bucket: nothing to do, not even reading the file
    assert.equal(await ensureLocal(file), false);
    assert.equal(await existsAnywhere(file), false);
    fs.writeFileSync(file, "x");
    assert.equal(await ensureLocal(file), true);
    assert.equal(await existsAnywhere(file), true);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("a spec's media files are found wherever their src is", () => {
  assert.deepEqual(
    mediaSources({
      scenes: [
        { audio: { src: "content/u/p/v/a.mp3" } },
        { type: "image", src: "content/u/p/v/i.png" },
        { audio: { src: "content/u/p/v/a.mp3" } },
        { type: "image", src: "https://example.com/x.png" },
      ],
      music: { src: "music/calm.mp3" },
    }),
    ["content/u/p/v/a.mp3", "content/u/p/v/i.png", "music/calm.mp3"],
  );
});
