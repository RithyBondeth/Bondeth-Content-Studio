import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { createJobStore, type NewJob } from "./job-store";

const job = (id: string, workspace?: string): NewJob => ({
  id,
  ...(workspace ? { workspace } : {}),
  slug: "p",
  index: 0,
  format: "landscape",
  kind: "video",
});

test("jobs round-trip, and only their owner can see them", () => {
  const store = createJobStore(new DatabaseSync(":memory:"));
  store.add({ ...job("1", "a"), kind: "cover", scene: 2 });
  assert.deepEqual(store.get("1", "a"), {
    id: "1",
    workspace: "a",
    slug: "p",
    index: 0,
    format: "landscape",
    kind: "cover",
    scene: 2,
    status: "queued",
    progress: 0,
    ahead: 0,
  });
  assert.equal(store.get("1", "b"), null);
  assert.equal(store.get("1", undefined), null);

  store.add(job("2"));
  assert.equal(store.get("2", undefined)?.workspace, undefined);
});

test("the next job is the oldest from whoever has the fewest renders running", () => {
  const store = createJobStore(new DatabaseSync(":memory:"));
  store.add(job("a1", "a"), 1);
  store.add(job("a2", "a"), 2);
  store.add(job("b1", "b"), 3);

  assert.equal(store.next()?.id, "a1");
  store.update("a1", { status: "rendering" });
  // a has one running, b has none: b goes next even though a2 is older.
  assert.equal(store.next()?.id, "b1");
  store.update("b1", { status: "bundling" });
  assert.equal(store.next()?.id, "a2");
  assert.equal(store.runningCount(), 2);
});

test("a queued job knows how many renders will start before it", () => {
  const store = createJobStore(new DatabaseSync(":memory:"));
  store.add(job("1", "a"), 1);
  store.add(job("2", "b"), 2);
  store.add(job("3", "a"), 3);
  assert.equal(store.get("3", "a")?.ahead, 2);
  store.update("1", { status: "rendering" });
  assert.equal(store.get("3", "a")?.ahead, 2);
  store.update("1", { status: "done", progress: 1 });
  assert.equal(store.get("3", "a")?.ahead, 1);
  assert.equal(store.get("1", "a")?.ahead, undefined);
  assert.deepEqual(
    store.active("a").map((j) => j.id),
    ["3"],
  );
});

test("after a restart, running renders go back in the queue", () => {
  const store = createJobStore(new DatabaseSync(":memory:"));
  store.add(job("1", "a"));
  store.update("1", { status: "rendering", progress: 0.5 });
  store.recover();
  assert.equal(store.get("1", "a")?.status, "queued");
  assert.equal(store.get("1", "a")?.progress, 0);
});

test("errors are kept, and old finished jobs are forgotten", () => {
  const store = createJobStore(new DatabaseSync(":memory:"));
  store.add(job("old", "a"), 0);
  store.update("old", { status: "error", error: "boom" }, 0);
  assert.equal(store.get("old", "a")?.error, "boom");
  store.add(job("new", "a"), 0);
  store.update("new", { status: "done" }, 9000);
  store.prune(5000, 10000);
  assert.equal(store.get("old", "a"), null);
  assert.equal(store.get("new", "a")?.status, "done");
});
