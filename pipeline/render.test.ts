import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { bundleHash } from "./render";

test("the bundle is rebuilt only when the code changes, never for media", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bundle-hash-"));
  try {
    fs.mkdirSync(path.join(root, "src", "scenes"), { recursive: true });
    fs.mkdirSync(path.join(root, "public", "content"), { recursive: true });
    fs.writeFileSync(path.join(root, "src", "index.ts"), "a");
    fs.writeFileSync(path.join(root, "src", "scenes", "A.tsx"), "b");
    fs.writeFileSync(path.join(root, "package-lock.json"), "{}");
    const first = await bundleHash(root);

    // Media and tests don't go into the bundle.
    fs.writeFileSync(path.join(root, "public", "content", "voice.mp3"), "x");
    fs.writeFileSync(path.join(root, "src", "scenes", "A.test.tsx"), "t");
    assert.equal(await bundleHash(root), first);

    fs.writeFileSync(path.join(root, "src", "scenes", "A.tsx"), "changed");
    const second = await bundleHash(root);
    assert.notEqual(second, first);

    fs.writeFileSync(path.join(root, "package-lock.json"), '{"v":2}');
    assert.notEqual(await bundleHash(root), second);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
