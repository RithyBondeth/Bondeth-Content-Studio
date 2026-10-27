import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import {
  contentDir,
  currentWorkspace,
  mediaSubdir,
  OUT_ROOT,
  outDir,
  ROOT,
  runInWorkspace,
} from "./config";

test("without a workspace, the top-level folders are used", () => {
  assert.equal(currentWorkspace(), undefined);
  assert.equal(contentDir(), path.join(ROOT, "content"));
  assert.equal(mediaSubdir(), "content");
  assert.equal(outDir(), OUT_ROOT);
});

test("in a workspace, every folder is the person's own, across awaits", async () => {
  await runInWorkspace("user_A1", async () => {
    await new Promise((resolve) => setTimeout(resolve, 1));
    assert.equal(currentWorkspace(), "user_A1");
    assert.equal(contentDir(), path.join(ROOT, "content", "user_A1"));
    assert.equal(mediaSubdir(), "content/user_A1");
    assert.equal(outDir(), path.join(OUT_ROOT, "user_A1"));
  });
  assert.equal(currentWorkspace(), undefined);
});

test("two workspaces running at once don't see each other", async () => {
  const seen = await Promise.all(
    ["a", "b"].map((id) =>
      runInWorkspace(id, async () => {
        await new Promise((resolve) => setTimeout(resolve, 2));
        return contentDir();
      }),
    ),
  );
  assert.deepEqual(seen, [
    path.join(ROOT, "content", "a"),
    path.join(ROOT, "content", "b"),
  ]);
});

test("undefined steps out of a workspace, and odd ids are refused", () => {
  runInWorkspace("a", () => {
    runInWorkspace(undefined, () =>
      assert.equal(currentWorkspace(), undefined),
    );
  });
  for (const id of ["", "../etc", "a/b", "a b", "x".repeat(65)]) {
    assert.throws(
      () => runInWorkspace(id, () => undefined),
      /Invalid workspace/,
    );
  }
});
